import importlib.metadata

from connectrpc.request import RequestContext
from .libresvip_tauri_pb2 import VersionRequest, VersionResponse
from .libresvip_tauri_connect import Conversion, ConversionASGIApplication

class ConversionService(Conversion):
    async def version(self, request: VersionRequest, ctx: RequestContext) -> VersionResponse:
        return VersionResponse(version=importlib.metadata.version("libresvip"))

# Create ASGI app
app = ConversionASGIApplication(ConversionService())