from __future__ import annotations

import logging

from .room import Room
from .utils import generate_room_id

logger = logging.getLogger(__name__)


class RoomManager:
    """Singleton that tracks all active rooms."""

    def __init__(self) -> None:
        self._rooms: dict[str, Room] = {}

    def create_room(self) -> Room:
        room_id = generate_room_id()
        while room_id in self._rooms:
            room_id = generate_room_id()
        room = Room(room_id)
        self._rooms[room_id] = room
        logger.info("Room created: %s", room_id)
        return room

    def get_room(self, room_id: str) -> Room | None:
        return self._rooms.get(room_id)

    def remove_room(self, room_id: str) -> None:
        if room_id in self._rooms:
            del self._rooms[room_id]
            logger.info("Room destroyed: %s", room_id)

    def cleanup_empty_rooms(self) -> None:
        empty = [rid for rid, room in self._rooms.items() if room.is_empty()]
        for rid in empty:
            self.remove_room(rid)

    @property
    def room_count(self) -> int:
        return len(self._rooms)


room_manager = RoomManager()
