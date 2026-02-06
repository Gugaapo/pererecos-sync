from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .room_manager import room_manager
from .sync_engine import heartbeat_loop
from .ws_endpoint import router as ws_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(heartbeat_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="SyncTube", lifespan=lifespan)

app.include_router(ws_router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "rooms": room_manager.room_count}


@app.post("/api/rooms")
async def create_room():
    room = room_manager.create_room()
    return {"room_id": room.room_id}


@app.get("/api/rooms")
async def list_rooms():
    rooms = []
    for room in room_manager._rooms.values():
        host = room.get_host()
        connected = [u for u in room.users.values() if u.connected]
        if not connected:
            continue
        rooms.append({
            "room_id": room.room_id,
            "host_name": host.display_name if host else "???",
            "user_count": len(connected),
            "queue_length": len(room.queue),
            "current_video": room.queue[0].title if room.queue else None,
        })
    return rooms


@app.get("/api/rooms/{room_id}")
async def get_room(room_id: str):
    room = room_manager.get_room(room_id)
    if not room:
        return {"exists": False}
    return {
        "exists": True,
        "room_id": room.room_id,
        "user_count": len([u for u in room.users.values() if u.connected]),
        "queue_length": len(room.queue),
    }
