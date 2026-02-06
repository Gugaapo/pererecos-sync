from __future__ import annotations

import asyncio
import logging

from .config import HEARTBEAT_INTERVAL
from .room_manager import room_manager

logger = logging.getLogger(__name__)


async def heartbeat_loop() -> None:
    """Broadcasts sync state to all rooms every HEARTBEAT_INTERVAL seconds."""
    while True:
        try:
            for room in list(room_manager._rooms.values()):
                try:
                    await room.heartbeat()
                except Exception:
                    logger.exception("Heartbeat error in room %s", room.room_id)
            room_manager.cleanup_empty_rooms()
        except Exception:
            logger.exception("Heartbeat loop error")
        await asyncio.sleep(HEARTBEAT_INTERVAL)
