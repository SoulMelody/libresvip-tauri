import importlib.metadata

from pydantic import BaseModel
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
    @override
    def generate_inner(self, schema: CoreSchemaOrField) -> JsonSchemaValue:
        json_schema = super().generate_inner(schema)
        if "title" in json_schema:
            json_schema["title"] = _(json_schema["title"])
        if "description" in json_schema:
            json_schema["description"] = _(json_schema["description"])
        return json_schema


def model_json_schema(option_cls: BaseModel) -> JsonSchemaValue:
    json_schema = option_cls.model_json_schema(schema_generator=GettextGenerateJsonSchema)
    json_schema.pop("title", None)
    return json_schema

class ConversionService(Conversion):
    async def plugin_infos(self, request: PluginInfosRequest, ctx: RequestContext) -> PluginInfosResponse:
        lazy_translation.set(get_translation(request.language))
        plugin_infos: list[PluginInfo] = []
        match request.category:
            case PluginCategory.MIDDLEWARE:
                plugins = middleware_manager.plugins.get("middleware", {})
                plugin_infos.extend(
                    PluginInfo(
                        identifier=identifier,
                        name=plugin.info.name,
                        author=_(plugin.info.author),
                        description=_(plugin.info.description),
                        website=plugin.info.website,
                        version=plugin.version,
                        json_schema=json.dumps(model_json_schema(plugin.process_option_cls)),
                    )
                    for identifier, plugin in plugins.items()
                )
            case PluginCategory.OUTPUT:
                plugins = {
                    identifier: plugin
                    for identifier, plugin in plugin_manager.plugins.get("svs", {}).items()
                    if not issubclass(plugin, ReadOnlyConverterMixin)
                }
                plugin_infos.extend(
                    PluginInfo(
                        identifier=identifier,
                        name=plugin.info.name,
                        author=_(plugin.info.author),
                        description=_(plugin.info.description),
                        website=_(plugin.info.website),
                        version=plugin.version,
                        file_format=_(plugin.info.file_format),
                        suffixes=[plugin.info.suffix],
                        icon_base64=plugin.info.icon_base64 or "",
                        json_schema=json.dumps(model_json_schema(plugin.output_option_cls)),
                    )
                    for identifier, plugin in plugins.items()
                )
            case _:
                plugins = {
                    identifier: plugin
                    for identifier, plugin in plugin_manager.plugins.get("svs", {}).items()
                    if not issubclass(plugin, WriteOnlyConverterMixin)
                }
                plugin_infos.extend(
                    PluginInfo(
                        identifier=identifier,
                        name=plugin.info.name,
                        author=_(plugin.info.author),
                        description=_(plugin.info.description),
                        website=plugin.info.website,
                        version=plugin.version,
                        file_format=_(plugin.info.file_format),
                        suffixes=[plugin.info.suffix],
                        icon_base64=plugin.info.icon_base64 or "",
                        json_schema=json.dumps(model_json_schema(plugin.input_option_cls)),
                    )
                    for identifier, plugin in plugins.items()
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
