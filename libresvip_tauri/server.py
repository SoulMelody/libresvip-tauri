import asyncio
from hypercorn.config import Config
from hypercorn.asyncio import serve

from libresvip_tauri.service import app

if __name__ == "__main__":
    config = Config()
    config.bind = ["127.0.0.1:1229"]
    asyncio.run(serve(app, config))
