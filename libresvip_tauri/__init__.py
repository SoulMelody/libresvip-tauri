import dataclasses
import enum
import json
import gettext
import os
import traceback
from functools import partial
from pathlib import Path
from typing import Any, Literal, get_args, get_type_hints

os.environ["_PYTAURI_DIST"] = "pytauri-wheel"

import more_itertools
from anyio import from_thread, to_thread
from importlib_metadata import version
from pydantic import BaseModel, Field, RootModel
from pydantic._internal._core_utils import CoreSchemaOrField
from pydantic.types import JsonValue
from pydantic.json_schema import GenerateJsonSchema, JsonSchemaValue
from pytauri import (
    BuilderArgs,
    Commands,
)
from pytauri import AppHandle, Emitter
from pytauri_wheel.lib import builder_factory, context_factory
from typing_extensions import override
from upath import UPath


SRC_TAURI_DIR = Path(__file__).parent.absolute()

TAURI_APP_WHEEL_DEV = os.environ.get("TAURI_APP_WHEEL_DEV") == "1"

temp_path = UPath("memory:/")
commands = Commands()

class ConversionTask(BaseModel):
    id: str
    input_path: str = Field(alias="inputPath")
    base_name: str = Field(alias="baseName")
    output_stem: str = Field(alias="outputStem")
    input_format: str = Field(alias="inputFormat")
    running: bool = False
    success: bool | None = None
    error: str | None = None
    warning: str | None = None
    output_path: str | None = Field(None, alias="outputPath")

    @property
    def tmp_path(self) -> UPath:
        return temp_path / self.id

    def reset(self) -> None:
        self.running = False
        self.success = None
        self.error = None
        self.warning = None
        self.output_path = None
        if self.tmp_path.exists():
            if self.tmp_path.is_dir():
                self.tmp_path.rmdir()
            else:
                self.tmp_path.unlink()

    def __del__(self) -> None:
        self.reset()


class BatchConvertOptions(BaseModel):
    input_format: str = Field(alias="inputFormat")
    output_format: str = Field(alias="outputFormat")
    language: str
    mode: Literal["direct", "split", "merge"] = "direct"
    max_track_count: int = Field(alias="maxTrackCount")
    conversion_tasks: list[ConversionTask] = Field(alias="conversionTasks")
    input_options: dict[str, Any] = Field(alias="inputOptions")
    output_options: dict[str, Any] = Field(alias="outputOptions")
    selected_middlewares: list[str] = Field(alias="selectedMiddlewares")
    middleware_options: dict[str, dict[str, Any]] = Field(alias="middlewareOptions")
    output_dir: str = Field(alias="outputDir")
    conflict_policy: Literal["rename", "overwrite", "skip", "prompt"] = Field(
        alias="conflictPolicy"
    )


class Empty(BaseModel):
    pass


@dataclasses.dataclass
class Converter:
    convert_options: BatchConvertOptions = dataclasses.field(init=False)


converter = Converter()

@commands.command()
async def start_conversion(body: BatchConvertOptions, app_handle: AppHandle) -> Empty:
    from libresvip.extension.manager import get_translation
    from libresvip.utils import translation

    converter.convert_options = body
    translation.singleton_translation = get_translation(lang=body.language)

    if len(converter.convert_options.conversion_tasks):
        if converter.convert_options.mode == "merge":
            await to_thread.run_sync(
                convert_task,
                app_handle,
                converter.convert_options.conversion_tasks[0],
                *converter.convert_options.conversion_tasks[1:]
            )
        else:
            for task in converter.convert_options.conversion_tasks:
                await to_thread.run_sync(convert_task, app_handle, task)
    return Empty()


def convert_task(
    app_handle: AppHandle, task: ConversionTask, *sub_tasks: ConversionTask
) -> None:
    from libresvip.core.warning_types import CatchWarnings
    from libresvip.extension.manager import plugin_manager, middleware_manager
    from libresvip.model.base import Project

    task.reset()
    task.running = True
    Emitter.emit(
        app_handle,
        "task_progress",
        JsonValueModel(task.model_dump(mode="json", by_alias=True, exclude={"tmp_path"})),
    )
    try:
        with CatchWarnings() as w:
            input_plugin = plugin_manager.plugin_registry[converter.convert_options.input_format]
            output_plugin = plugin_manager.plugin_registry[converter.convert_options.output_format]
            if (
                input_plugin.plugin_object is None
                or (
                    input_option_class := get_type_hints(
                        input_plugin.plugin_object.load
                    ).get(
                        "options",
                    )
                )
                is None
                or output_plugin.plugin_object is None
                or (
                    output_option_class := get_type_hints(
                        output_plugin.plugin_object.dump,
                    ).get("options")
                )
                is None
            ):
                raise ValueError(
                    f"Plugin {input_plugin.identifier} or {output_plugin.identifier} is not supported"
                )
            input_option = input_option_class(**converter.convert_options.input_options)
            if converter.convert_options.mode == "merge" and sub_tasks:
                child_projects = [
                    input_plugin.plugin_object.load(
                        Path(input_path),
                        input_option,
                    )
                    for input_path in more_itertools.value_chain(task.input_path, [
                        sub_task.input_path
                        for sub_task in sub_tasks
                    ])
                ]
                project = Project.merge_projects(child_projects)
            else:
                project = input_plugin.plugin_object.load(
                    Path(task.input_path),
                    input_option,
                )
            for middleware_abbr in converter.convert_options.selected_middlewares:
                middleware = middleware_manager.plugin_registry[middleware_abbr]
                if middleware.plugin_object is not None and hasattr(
                    middleware.plugin_object, "process"
                ) and (
                    middleware_option_class := get_type_hints(
                        middleware.plugin_object.process
                    ).get(
                        "options",
                    )
                ):
                    middleware_option = converter.convert_options.middleware_options[
                        middleware_abbr
                    ]
                    project = middleware.plugin_object.process(
                        project,
                        middleware_option_class.model_validate(
                            middleware_option,
                            from_attributes=True,
                        ),
                    )
            output_option = output_option_class(**converter.convert_options.output_options)
            if converter.convert_options.mode == "split":
                task.tmp_path.mkdir(parents=True, exist_ok=True)
                for i, child_project in enumerate(
                    project.split_tracks(converter.convert_options.max_track_count)
                ):
                    output_plugin.plugin_object.dump(
                        task.tmp_path
                        / f"{i + 1:0=2d}.{converter.convert_options.output_format}",
                        child_project,
                        output_option,
                    )
            else:
                output_plugin.plugin_object.dump(
                    task.tmp_path,
                    project,
                    output_option,
                )
        if w.output:
            task.warning = w.output
    except Exception:
        task.success = False
        task.error = traceback.format_exc()
    task.running = False
    Emitter.emit(
        app_handle,
        "task_progress",
        JsonValueModel(task.model_dump(mode="json", by_alias=True, exclude={"tmp_path"})),
    )


class MoveFileParams(BaseModel):
    id: str
    force_overwrite: bool = Field(alias="forceOverwrite")


class MoveCallbackParams(BaseModel):
    id: str
    output_path: str = Field(alias="outputPath")
    conflict_policy: Literal["skip", "prompt"] = Field(
        alias="conflictPolicy"
    )

JsonValueModel = RootModel[JsonValue]
BooleanModel = RootModel[bool]

@commands.command()
async def move_file(body: MoveFileParams, app_handle: AppHandle) -> Empty:
    output_dir = Path(converter.convert_options.output_dir).absolute()
    output_dir.mkdir(parents=True, exist_ok=True)
    if task := next(
        (each for each in converter.convert_options.conversion_tasks if each.id == body.id),
        None,
    ):
        if task.tmp_path.exists():
            try:
                if task.tmp_path.is_dir():
                    for child in task.tmp_path.iterdir():
                        output_path = (
                            output_dir / f"{task.output_stem}_{child.name}"
                        )
                        if output_path.exists():
                            if body.force_overwrite or (
                                converter.convert_options.conflict_policy == "overwrite"
                            ):
                                output_path.write_bytes(task.tmp_path.read_bytes())
                            elif converter.convert_options.conflict_policy == "rename":
                                output_path = (
                                    output_dir
                                    / f"{task.output_stem}_{child.name}_{task.id}.{converter.convert_options.output_format}"
                                )
                                output_path.write_bytes(task.tmp_path.read_bytes())
                            elif converter.convert_options.conflict_policy == "prompt":
                                callback_params = {
                                    "id": task.id,
                                    "outputPath": str(output_path),
                                    "conflictPolicy": converter.convert_options.conflict_policy,
                                }
                                Emitter.emit(
                                    app_handle,
                                    "move_callback",
                                    JsonValueModel(callback_params),
                                )
                                return Empty()
                            else:
                                callback_params = {
                                    "id": task.id,
                                    "outputPath": str(output_path),
                                    "conflictPolicy": converter.convert_options.conflict_policy,
                                }
                                Emitter.emit(
                                    app_handle,
                                    "move_callback",
                                    JsonValueModel(callback_params),
                                )
                                return Empty()
                        else:
                            output_path.write_bytes(child.read_bytes())
                        if task.output_path is None:
                            task.output_path = str(output_path)
                        child.unlink()
                    task.tmp_path.rmdir()
                else:
                    output_path = (
                        output_dir / f"{task.output_stem}.{converter.convert_options.output_format}"
                    )
                    if output_path.exists():
                        if body.force_overwrite or (
                            converter.convert_options.conflict_policy == "overwrite"
                        ):
                            output_path.write_bytes(task.tmp_path.read_bytes())
                        elif converter.convert_options.conflict_policy == "rename":
                            output_path = (
                                output_dir
                                / f"{task.output_stem}_{task.id}.{converter.convert_options.output_format}"
                            )
                            output_path.write_bytes(task.tmp_path.read_bytes())
                        elif converter.convert_options.conflict_policy == "prompt":
                            callback_params = {
                                "id": task.id,
                                "outputPath": str(output_path),
                                "conflictPolicy": converter.convert_options.conflict_policy,
                            }
                            Emitter.emit(
                                app_handle,
                                "move_callback",
                                JsonValueModel(callback_params),
                            )
                            return Empty()
                        else:
                            callback_params = {
                                "id": task.id,
                                "outputPath": str(output_path),
                                "conflictPolicy": converter.convert_options.conflict_policy,
                            }
                            Emitter.emit(
                                app_handle,
                                "move_callback",
                                JsonValueModel(callback_params),
                            )
                            return Empty()
                    else:
                        output_path.write_bytes(task.tmp_path.read_bytes())
                    task.tmp_path.unlink()
                    task.output_path = str(output_path)
                task.success = True
            except Exception:
                task.success = False
                task.error = traceback.format_exc()
            Emitter.emit(
                app_handle,
                "move_result",
                JsonValueModel(task.model_dump(mode="json", by_alias=True, exclude={"tmp_path"})),
            )
    return Empty()


class PluginInfo(BaseModel):
    identifier: str
    version: str
    suffix: str
    icon_base64: str | None = None
    website: str | None = None

PluginInfoDict = RootModel[dict[str, PluginInfo]]


def dump_plugin_infos() -> None:
    from libresvip.extension.manager import plugin_manager

    result = PluginInfoDict({
        identifier: PluginInfo(
            identifier=identifier,
            version=str(plugin_info.version),
            suffix=f"(*.{plugin_info.suffix})",
            icon_base64=plugin_info.icon_base64,
            website=plugin_info.website,
        )
        for identifier, plugin_info in plugin_manager.plugin_registry.items()
    })
    Path("plugin_infos.json").write_text(result.model_dump_json(), encoding="utf-8")


VersionString = RootModel[str]


@commands.command()
async def app_version(body: Empty) -> VersionString:
    return VersionString(version("libresvip"))


class PluginOption(BaseModel):
    identifier: str
    category: str
    language: str


class SchemaConfig(BaseModel):
    json_schema: JsonSchemaValue
    default_value: dict[str, Any]
    ui_schema: dict[str, Any] = Field(default_factory=dict)


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


@commands.command()
async def option_schema(body: PluginOption) -> SchemaConfig:
    from libresvip.extension.manager import get_translation, middleware_manager, plugin_manager

    if body.category == "process":
        plugin_info = middleware_manager.plugin_registry.get(body.identifier)
    else:
        plugin_info = plugin_manager.plugin_registry.get(body.identifier)
    option_cls: type[BaseModel] = get_type_hints(getattr(plugin_info.plugin_object, body.category))["options"]
    if body.language not in translators_cache:
        translator = get_translation(body.language)
        translators_cache[body.language] = translator
    translator = translators_cache[body.language]
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
            annotations = get_type_hints(field_info.annotation, include_extras=True)
            for enum_item in field_info.annotation:
                if enum_item.name in annotations:
                    annotated_args = list(
                        get_args(annotations[enum_item.name]),
                    )
                    if len(annotated_args) >= 2:
                        enum_field = annotated_args[1]
                    else:
                        continue
                    enum_names.append(translator.gettext(enum_field.title))
            ui_schema[field_name] = {
                "ui:enumNames": enum_names
            }

    return SchemaConfig(
        json_schema=json_schema,
        ui_schema=ui_schema,
        default_value=option_cls().model_dump(mode="json"),
    )


def main() -> None:
    with from_thread.start_blocking_portal() as portal:
        if TAURI_APP_WHEEL_DEV:
            tauri_config = json.dumps(
                {
                    "build": {
                        "frontendDist": "http://localhost:3000",
                    },
                }
            )
        else:
            tauri_config = None

        app = builder_factory().build(
            context=context_factory(SRC_TAURI_DIR, tauri_config=tauri_config),
            invoke_handler=commands.generate_handler(portal),
        )
        app.run()