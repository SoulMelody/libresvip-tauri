import asyncio
import argparse
import os
import threading
import time

import psutil
from hypercorn.config import Config
from hypercorn.asyncio import serve

from libresvip_tauri.service import app


shutdown_event = asyncio.Event()

def check_parent_pid(parent_pid: int):
    while True:
        if not psutil.pid_exists(parent_pid):
            print(f"[LibreSVIP] Parent PID {parent_pid} not found, exiting...")
            shutdown_event.set()
            exit(1)
        time.sleep(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LibreSVIP Tauri Server")
    parser.add_argument("--parent-pid", type=int, default=0, help="Parent PID to check for")
    args = parser.parse_args()

    check_thread = None
    if args.parent_pid != 0 and args.parent_pid != os.getpid():
        check_thread = threading.Thread(target=check_parent_pid, args=(args.parent_pid,))
        check_thread.start()

    config = Config()
    config.bind = ["127.0.0.1:1229"]
    server_thread = threading.Thread(target=asyncio.run, args=(serve(app, config, shutdown_trigger=shutdown_event.wait),))
    server_thread.daemon = True
    server_thread.start()
    if check_thread is not None:
        check_thread.join()
