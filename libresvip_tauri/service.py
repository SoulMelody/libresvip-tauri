import enum
import gettext
import importlib.metadata
from functools import partial
from typing import get_args, get_type_hints

from pydantic._internal._core_utils import CoreSchemaOrField
from pydantic.json_schema import GenerateJsonSchema, JsonSchemaValue
from starlette.middleware.cors import CORSMiddleware
from starlette.applications import Starlette
from typing_extensions import override

from libresvip.core.compat import json
from libresvip.extension.base import (
    ReadOnlyConverterMixin,
    WriteOnlyConverterMixin,
)
from libresvip.extension.manager import get_translation, middleware_manager, plugin_manager
from libresvip.utils.translation import gettext_lazy as _
from libresvip.utils.translation import lazy_translation

from connectrpc.request import RequestContext
from .libresvip_tauri_pb2 import (
    PluginInfosRequest, PluginInfosResponse, PluginInfo, PluginCategory,
    VersionRequest, VersionResponse
)
from .libresvip_tauri_connect import Conversion, ConversionASGIApplication


class GettextGenerateJsonSchema(GenerateJsonSchema):
    def __init__(self, translator: gettext.NullTranslations, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.translator = translator

    @override
    def generate_inner(self, schema: CoreSchemaOrField) -> JsonSchemaValue:
        json_schema = super().generate_inner(schema)
        if "title" in json_schema:
            json_schema["title"] = _(json_schema["title"])
        if "description" in json_schema:
            json_schema["description"] = _(json_schema["description"])
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

class ConversionService(Conversion):
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
