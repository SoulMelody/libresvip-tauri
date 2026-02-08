import asyncio
from hypercorn.config import Config
from hypercorn.asyncio import serve

from .service import app

if __name__ == "__main__":
    asyncio.run(serve(app, Config()))
