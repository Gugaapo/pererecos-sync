from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Per-room WebSocket connection registry."""

    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}  # user_id -> WebSocket

    @property
    def connections(self) -> dict[str, WebSocket]:
        return self._connections

    def add(self, user_id: str, ws: WebSocket) -> None:
        self._connections[user_id] = ws

    def remove(self, user_id: str) -> None:
        self._connections.pop(user_id, None)

    def get(self, user_id: str) -> WebSocket | None:
        return self._connections.get(user_id)

    @property
    def count(self) -> int:
        return len(self._connections)

    async def send_to(self, user_id: str, data: dict[str, Any]) -> None:
        ws = self._connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                logger.debug("Failed to send to %s", user_id)

    async def broadcast(self, data: dict[str, Any], exclude: str | None = None) -> None:
        payload = json.dumps(data)
        for uid, ws in list(self._connections.items()):
            if uid == exclude:
                continue
            try:
                await ws.send_text(payload)
            except Exception:
                logger.debug("Failed to broadcast to %s", uid)

    async def broadcast_all(self, data: dict[str, Any]) -> None:
        await self.broadcast(data)
