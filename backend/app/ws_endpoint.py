from __future__ import annotations

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from .message_handler import handle_message
from .room_manager import room_manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/{room_id}")
async def websocket_endpoint(ws: WebSocket, room_id: str) -> None:
    room = room_manager.get_room(room_id)
    if not room:
        await ws.accept()
        await ws.close(code=4004, reason="Room not found")
        return

    await ws.accept()

    # First message must be a join
    try:
        raw = await ws.receive_text()
        data = json.loads(raw)
    except (WebSocketDisconnect, json.JSONDecodeError):
        return

    if data.get("type") != "join" or not data.get("display_name", "").strip():
        await ws.send_text(json.dumps({
            "type": "error",
            "code": "invalid_join",
            "message": "First message must be {type: 'join', display_name: '...'}",
        }))
        await ws.close()
        return

    display_name = data["display_name"].strip()[:30]
    user = room.add_user(display_name)
    user_id = user.user_id

    room.connections.add(user_id, ws)

    # Cancel host grace if reconnecting host
    if user.role.value == "host":
        room.cancel_host_grace()

    # Send full state to the joining client
    await room.connections.send_to(user_id, room.get_full_state(user_id))

    # Broadcast join to others
    await room.connections.broadcast({
        "type": "user_joined",
        "user": user.to_dict(),
    }, exclude=user_id)

    # System chat
    from .models import ChatMessage
    join_msg = ChatMessage(
        user_id="system",
        display_name="Sistema",
        message=f"{display_name} entrou na sala.",
        is_system=True,
    )
    room.chat_history.append(join_msg)
    await room.connections.broadcast({
        "type": "chat_message",
        **join_msg.to_dict(),
    }, exclude=user_id)

    # Message loop
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            await handle_message(room, user_id, msg)
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("WebSocket error for user %s in room %s", user_id, room_id)
    finally:
        room.disconnect_user(user_id)

        # Broadcast leave
        await room.connections.broadcast_all({
            "type": "user_left",
            "user_id": user_id,
        })

        # System chat
        leave_msg = ChatMessage(
            user_id="system",
            display_name="Sistema",
            message=f"{display_name} saiu da sala.",
            is_system=True,
        )
        room.chat_history.append(leave_msg)
        await room.connections.broadcast_all({
            "type": "chat_message",
            **leave_msg.to_dict(),
        })

        # Cleanup
        room.check_user_cleanup(user_id)
        if room.is_empty():
            room_manager.remove_room(room_id)
