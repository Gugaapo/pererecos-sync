from __future__ import annotations

import logging
from typing import Any

from .room import Room

logger = logging.getLogger(__name__)


async def handle_message(room: Room, user_id: str, data: dict[str, Any]) -> None:
    msg_type = data.get("type")
    if not msg_type:
        await room.connections.send_to(user_id, {
            "type": "error", "code": "missing_type", "message": "Message must include 'type'",
        })
        return

    if msg_type == "add_video":
        error = await room.add_video(user_id, data.get("url", ""))
        if error:
            await room.connections.send_to(user_id, error)

    elif msg_type == "remove_video":
        result = room.remove_video(user_id, data.get("video_id", ""))
        if result == "advance":
            await room.advance_queue()
            await room.connections.broadcast_all({
                "type": "queue_updated",
                "queue": [v.to_dict() for v in room.queue],
                "action": "remove",
            })
        elif result:
            await room.connections.send_to(user_id, {
                "type": "error", "code": "remove_failed", "message": result,
            })
        else:
            await room.connections.broadcast_all({
                "type": "queue_updated",
                "queue": [v.to_dict() for v in room.queue],
                "action": "remove",
            })

    elif msg_type == "reorder_queue":
        error = room.reorder_queue(user_id, data.get("video_ids", []))
        if error:
            await room.connections.send_to(user_id, {
                "type": "error", "code": "reorder_failed", "message": error,
            })
        else:
            await room.connections.broadcast_all({
                "type": "queue_updated",
                "queue": [v.to_dict() for v in room.queue],
                "action": "reorder",
            })

    elif msg_type == "skip_vote":
        await room.handle_skip_vote(user_id, data.get("video_id", ""))

    elif msg_type == "chat_message":
        error = await room.handle_chat(user_id, data.get("message", ""))
        if error:
            await room.connections.send_to(user_id, {
                "type": "error", "code": "chat_failed", "message": error,
            })

    elif msg_type == "play":
        error = room.play(user_id)
        if error:
            await room.connections.send_to(user_id, {
                "type": "error", "code": "play_failed", "message": error,
            })
        else:
            await room.connections.broadcast_all({
                "type": "sync", "sync": room.sync.to_dict(), "server_time": __import__("time").time(),
            })

    elif msg_type == "pause":
        error = room.pause(user_id, data.get("timestamp", 0.0))
        if error:
            await room.connections.send_to(user_id, {
                "type": "error", "code": "pause_failed", "message": error,
            })
        else:
            await room.connections.broadcast_all({
                "type": "sync", "sync": room.sync.to_dict(), "server_time": __import__("time").time(),
            })

    elif msg_type == "seek":
        error = room.seek(user_id, data.get("timestamp", 0.0))
        if error:
            await room.connections.send_to(user_id, {
                "type": "error", "code": "seek_failed", "message": error,
            })
        else:
            await room.connections.broadcast_all({
                "type": "sync", "sync": room.sync.to_dict(), "server_time": __import__("time").time(),
            })

    elif msg_type == "video_ended":
        await room.advance_queue()

    elif msg_type == "sync_report":
        pass  # Can log for debugging, no action needed for MVP

    elif msg_type == "update_settings":
        error = await room.update_settings(user_id, data.get("settings", {}))
        if error:
            await room.connections.send_to(user_id, {
                "type": "error", "code": "settings_failed", "message": error,
            })

    else:
        await room.connections.send_to(user_id, {
            "type": "error", "code": "unknown_type", "message": f"Unknown message type: {msg_type}",
        })
