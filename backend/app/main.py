from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

import httpx

from .config import YOUTUBE_API_KEY
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


@app.get("/api/youtube/search")
async def youtube_search(q: str = Query(..., min_length=1)):
    if not YOUTUBE_API_KEY:
        return JSONResponse(status_code=500, content={"error": "YouTube API key not configured"})
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "type": "video",
                    "maxResults": 8,
                    "q": q,
                    "key": YOUTUBE_API_KEY,
                },
            )
            if resp.status_code != 200:
                return JSONResponse(status_code=resp.status_code, content={"error": "YouTube API error"})
            data = resp.json()
            results = []
            for item in data.get("items", []):
                video_id = item.get("id", {}).get("videoId")
                if not video_id:
                    continue
                snippet = item.get("snippet", {})
                results.append({
                    "youtube_id": video_id,
                    "title": snippet.get("title", ""),
                    "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url", ""),
                    "channel": snippet.get("channelTitle", ""),
                })
            return results
    except httpx.TimeoutException:
        return JSONResponse(status_code=504, content={"error": "YouTube API timeout"})


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
