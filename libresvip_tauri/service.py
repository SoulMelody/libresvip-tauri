import asyncio
import enum
import gettext
import importlib.metadata
import pathlib
import traceback
from collections.abc import AsyncIterator
from functools import partial
from typing import get_args, get_type_hints

from connectrpc.request import RequestContext
from libresvip.core.compat import json
from libresvip.core.warning_types import CatchWarnings
from libresvip.extension.base import (
    OptionsDict,
    ReadOnlyConverterMixin,
    SVSConverter,
    WriteOnlyConverterMixin,
)
from libresvip.extension.manager import (
    get_translation,
    middleware_manager,
    plugin_manager,
)
from libresvip.model.base import Project
from libresvip.utils.translation import lazy_translation
from pydantic import ValidationError
from pydantic._internal._core_utils import CoreSchemaOrField
from pydantic.json_schema import GenerateJsonSchema, JsonSchemaValue
from starlette.applications import Starlette
from starlette.middleware.cors import CORSMiddleware
from typing_extensions import override
from upath import UPath

from .libresvip_tauri_connect import Conversion, ConversionASGIApplication
from .libresvip_tauri_pb2 import (
    ConversionGroup,
    ConversionMode,
    ConversionRequest,
    PluginCategory,
    PluginInfo,
    PluginInfosRequest,
    PluginInfosResponse,
    SingleConversionResult,
    VersionRequest,
    VersionResponse,
)


class GettextGenerateJsonSchema(GenerateJsonSchema):
    def __init__(self, translator: gettext.NullTranslations, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.translator = translator

    @override
    def generate_inner(self, schema: CoreSchemaOrField) -> JsonSchemaValue:
        json_schema = super().generate_inner(schema)
        if "title" in json_schema:
            json_schema["title"] = self.translator.gettext(json_schema["title"])
        if "description" in json_schema:
            json_schema["description"] = self.translator.gettext(json_schema["description"])
        return json_schema


translators_cache: dict[str, gettext.NullTranslations] = {}


def option_schema(option_cls, translator: gettext.NullTranslations) -> tuple[str, str, str]:
    json_schema = option_cls.model_json_schema(
        schema_generator=partial(GettextGenerateJsonSchema, translator=translator),
    )
    json_schema.pop("title", None)
    json_schema["required"] = list(
        json_schema["properties"].keys()
    )
    ui_schema = {
        "ui:submitButtonOptions": {
            "norender": True
        }
    }
    for field_name, field_info in option_cls.model_fields.items():
        if issubclass(field_info.annotation, enum.Enum):
            enum_names = []
            type_hints = get_type_hints(field_info.annotation, include_extras=True)
            annotations = None
            if "_value_" in type_hints:
                value_args = get_args(type_hints["_value_"])
                if len(value_args) >= 2:
                    model = value_args[1]
                    if hasattr(model, "model_fields"):
                        annotations = model.model_fields
            if annotations is None:
                continue
            for enum_item in field_info.annotation:
                if enum_item.name in annotations:
                    enum_field = annotations[enum_item.name]
                    enum_names.append(translator.gettext(enum_field.title))
            ui_schema[field_name] = {
                "ui:enumNames": enum_names
            }

    return (
        json.dumps(json_schema),
        json.dumps(ui_schema),
        option_cls().model_dump_json(),
    )


def convert_one_group(
    fs: UPath,
    mode: ConversionMode,
    max_track_count: int,
    group: ConversionGroup,
    input_plugin: SVSConverter,
    output_plugin: SVSConverter,
    input_options: OptionsDict,
    output_options: OptionsDict,
    middleware_options: dict[str, str],
    language: str,
) -> SingleConversionResult:
    lazy_translation.set(get_translation(language))
    result = SingleConversionResult(group_id=group.group_id, running=False)
    project = None
    if mode == ConversionMode.MERGE:
        child_projects = []
        for file_path in group.file_paths:
            try:
                with CatchWarnings() as w:
                    child_projects.append(input_plugin.load(pathlib.Path(file_path), input_options))
                if w.output:
                    result.warning_messages.append(w.output)
            except Exception:
                result.success = False
                result.error_message = traceback.format_exc()
                project = None
                break
        else:
            project = Project.merge_projects(child_projects)
    else:
        file_path = group.file_paths[0]
        try:
            with CatchWarnings() as w:
                project = input_plugin.load(pathlib.Path(file_path), input_options)
            if w.output:
                result.warning_messages.append(w.output)
        except Exception:
            result.success = False
            result.error_message = traceback.format_exc()
    if project is not None:
        middlewares = middleware_manager.plugins.get("middleware", {})
        for middleware_id, middleware_option_str in middleware_options.items():
            if middleware := middlewares.get(middleware_id):
                try:
                    process_options = middleware.process_option_cls.model_validate_json(
                        middleware_option_str
                    )
                except ValidationError:
                    process_options = middleware.process_option_cls()
                try:
                    with CatchWarnings() as w:
                        project = middleware.process(project, process_options.model_dump())
                    if w.output:
                        result.warning_messages.append(w.output)
                except Exception:
                    result.success = False
                    result.error_message = traceback.format_exc()
                    project = None
                    break
    if project is not None:
        group_path = fs / group.group_id
        group_path.mkdir()
        if mode == ConversionMode.SPLIT:
            for i, sub_proj in enumerate(project.split_tracks(max_track_count)):
                child_path = group_path / str(i)
                try:
                    with CatchWarnings() as w:
                        output_plugin.dump(child_path, sub_proj, output_options)
                    if w.output:
                        result.warning_messages.append(w.output)
                    result.file_contents.append(child_path.read_bytes())
                except Exception:
                    result.success = False
                    result.error_message = traceback.format_exc()
                    break
            else:
                result.success = True
        else:
            child_path = group_path / "0"
            try:
                output_plugin.dump(child_path, project, output_options)
                result.file_contents.append(child_path.read_bytes())
                result.success = True
            except Exception:
                result.success = False
                result.error_message = traceback.format_exc()
    return result


class ConversionService(Conversion):
    def __init__(self) -> None:
        self._fs = UPath("memory://")

    async def plugin_infos(self, request: PluginInfosRequest, ctx: RequestContext) -> PluginInfosResponse:
        if request.language not in translators_cache:
            translator = get_translation(request.language)
            translators_cache[request.language] = translator
        translator = translators_cache[request.language]
        plugin_infos: list[PluginInfo] = []
        match request.category:
            case PluginCategory.MIDDLEWARE:
                plugins = middleware_manager.plugins.get("middleware", {})
                for identifier, plugin in plugins.items():
                    json_schema, ui_schema, default_value = option_schema(plugin.process_option_cls, translator)
                    plugin_infos.append(
                        PluginInfo(
                            identifier=identifier,
                            name=plugin.info.name,
                            author=translator.gettext(plugin.info.author),
                            description=translator.gettext(plugin.info.description),
                            website=plugin.info.website,
                            version=plugin.version,
                            json_schema=json_schema,
                            ui_json_schema=ui_schema,
                            default_json_value=default_value,
                        )
                    )
            case PluginCategory.OUTPUT:
                plugins = {
                    identifier: plugin
                    for identifier, plugin in plugin_manager.plugins.get("svs", {}).items()
                    if not issubclass(plugin, ReadOnlyConverterMixin)
                }
                for identifier, plugin in plugins.items():
                    json_schema, ui_schema, default_value = option_schema(plugin.output_option_cls, translator)
                    plugin_infos.append(
                        PluginInfo(
                            identifier=identifier,
                            name=plugin.info.name,
                            author=translator.gettext(plugin.info.author),
                            description=translator.gettext(plugin.info.description),
                            website=plugin.info.website,
                            version=plugin.version,
                            file_format=translator.gettext(plugin.info.file_format),
                            suffixes=[plugin.info.suffix],
                            icon_base64=plugin.info.icon_base64 or "",
                            json_schema=json_schema,
                            ui_json_schema=ui_schema,
                            default_json_value=default_value,
                        )
                    )
            case _:
                plugins = {
                    identifier: plugin
                    for identifier, plugin in plugin_manager.plugins.get("svs", {}).items()
                    if not issubclass(plugin, WriteOnlyConverterMixin)
                }
                for identifier, plugin in plugins.items():
                    json_schema, ui_schema, default_value = option_schema(plugin.input_option_cls, translator)
                    plugin_infos.append(
                        PluginInfo(
                            identifier=identifier,
                            name=plugin.info.name,
                            author=translator.gettext(plugin.info.author),
                            description=translator.gettext(plugin.info.description),
                            website=plugin.info.website,
                            version=plugin.version,
                            file_format=translator.gettext(plugin.info.file_format),
                            suffixes=[plugin.info.suffix],
                            icon_base64=plugin.info.icon_base64 or "",
                            json_schema=json_schema,    
                            ui_json_schema=ui_schema,
                            default_json_value=default_value,
                        )
                    )
        return PluginInfosResponse(values=plugin_infos)

    async def version(self, request: VersionRequest, ctx: RequestContext) -> VersionResponse:
        return VersionResponse(version=importlib.metadata.version("libresvip"))

    async def convert(self, request: ConversionRequest, ctx: RequestContext) -> AsyncIterator[SingleConversionResult]:
        futures = []
        input_plugin = plugin_manager.plugins.get("svs", {})[request.input_format]
        output_plugin = plugin_manager.plugins.get("svs", {})[request.output_format]
        try:
            input_options = input_plugin.input_option_cls.model_validate_json(
                request.input_options
            )
        except ValidationError:
            input_options = input_plugin.input_option_cls()
        try:
            output_options = output_plugin.output_option_cls.model_validate_json(
                request.output_options
            )
        except ValidationError:
            output_options = output_plugin.output_option_cls()
        for group in request.groups:
            yield SingleConversionResult(group_id=group.group_id, running=True, error_message="", warning_messages=[])
            coro = asyncio.to_thread(
                convert_one_group,
                self._fs,
                request.mode,
                request.max_track_count,
                group,
                input_plugin,
                output_plugin,
                input_options.model_dump(),
                output_options.model_dump(),
                request.middleware_options,
                request.language,
            )
            futures.append(asyncio.create_task(coro))
        for future in asyncio.as_completed(futures):
            yield (await future)


app = Starlette()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
conversion_app = ConversionASGIApplication(ConversionService())
app.mount("/", conversion_app)
