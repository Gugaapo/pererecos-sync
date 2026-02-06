from __future__ import annotations

import asyncio
import html
import logging
import time
from collections import deque
from typing import Any

import httpx

from .config import CHAT_HISTORY_LIMIT, HOST_GRACE_PERIOD, MAX_MESSAGE_LENGTH
from .connection_manager import ConnectionManager
from .models import ChatMessage, RoomSettings, SyncState, User, UserRole, Video
from .utils import extract_youtube_id, generate_user_id, generate_video_id

logger = logging.getLogger(__name__)


class Room:
    def __init__(self, room_id: str) -> None:
        self.room_id = room_id
        self.users: dict[str, User] = {}
        self.queue: list[Video] = []
        self.sync = SyncState()
        self.settings = RoomSettings()
        self.chat_history: deque[ChatMessage] = deque(maxlen=CHAT_HISTORY_LIMIT)
        self.skip_votes: set[str] = set()
        self.connections = ConnectionManager()
        self.created_at = time.time()
        self._host_grace_task: asyncio.Task | None = None

    # ── User Management ──────────────────────────────────────────

    def add_user(self, display_name: str) -> User:
        user_id = generate_user_id()
        role = UserRole.HOST if not self.users else UserRole.VIEWER
        user = User(user_id=user_id, display_name=display_name, role=role)
        self.users[user_id] = user
        return user

    def reconnect_user(self, user_id: str) -> User | None:
        user = self.users.get(user_id)
        if user and not user.connected:
            user.connected = True
            user.disconnected_at = None
            return user
        return None

    def disconnect_user(self, user_id: str) -> None:
        user = self.users.get(user_id)
        if not user:
            return
        user.connected = False
        user.disconnected_at = time.time()
        self.connections.remove(user_id)

        if user.role == UserRole.HOST:
            self._start_host_grace_period()

    def _user_has_queue_items(self, user_id: str) -> bool:
        return any(v.added_by == user_id for v in self.queue)

    def check_user_cleanup(self, user_id: str) -> bool:
        """Returns True if user was erased."""
        user = self.users.get(user_id)
        if not user or user.connected:
            return False
        if not self._user_has_queue_items(user_id):
            del self.users[user_id]
            self.skip_votes.discard(user_id)
            return True
        return False

    def get_host(self) -> User | None:
        for u in self.users.values():
            if u.role == UserRole.HOST:
                return u
        return None

    def _connected_viewers(self) -> list[User]:
        return [
            u for u in self.users.values()
            if u.connected and u.role == UserRole.VIEWER
        ]

    def _connected_users(self) -> list[User]:
        return [u for u in self.users.values() if u.connected]

    # ── Host Grace Period ────────────────────────────────────────

    def _start_host_grace_period(self) -> None:
        if self._host_grace_task and not self._host_grace_task.done():
            return
        self._host_grace_task = asyncio.create_task(self._host_grace_timer())

    async def _host_grace_timer(self) -> None:
        await asyncio.sleep(HOST_GRACE_PERIOD)
        host = self.get_host()
        if host and not host.connected:
            await self._transfer_host()

    async def _transfer_host(self) -> None:
        old_host = self.get_host()
        if old_host:
            old_host.role = UserRole.VIEWER

        connected = sorted(
            self._connected_users(),
            key=lambda u: u.user_id,
        )
        if not connected:
            return

        new_host = connected[0]
        new_host.role = UserRole.HOST
        await self.connections.broadcast_all({
            "type": "host_changed",
            "new_host_id": new_host.user_id,
            "new_host_name": new_host.display_name,
        })
        # System chat message
        msg = ChatMessage(
            user_id="system",
            display_name="Sistema",
            message=f"{new_host.display_name} agora é o host.",
            is_system=True,
        )
        self.chat_history.append(msg)
        await self.connections.broadcast_all({
            "type": "chat_message",
            **msg.to_dict(),
        })

    def cancel_host_grace(self) -> None:
        if self._host_grace_task and not self._host_grace_task.done():
            self._host_grace_task.cancel()
            self._host_grace_task = None

    # ── Queue Management ─────────────────────────────────────────

    async def add_video(self, user_id: str, url: str) -> dict[str, Any] | None:
        youtube_id = extract_youtube_id(url)
        if not youtube_id:
            return {"type": "error", "code": "invalid_url", "message": "Invalid YouTube URL"}

        user_video_count = sum(1 for v in self.queue if v.added_by == user_id)
        if user_video_count >= self.settings.max_videos_per_user:
            return {"type": "error", "code": "queue_limit", "message": "You've reached the max videos per user"}

        # Fetch metadata via oEmbed
        title, thumbnail = await self._fetch_video_meta(youtube_id)

        video = Video(
            video_id=generate_video_id(),
            youtube_id=youtube_id,
            title=title,
            thumbnail=thumbnail,
            duration=0.0,
            added_by=user_id,
        )
        self.queue.append(video)

        was_empty = self.sync.current_video_id is None
        if was_empty:
            self._set_current_video(video)

        await self.connections.broadcast_all({
            "type": "queue_updated",
            "queue": [v.to_dict() for v in self.queue],
            "action": "add",
            "video": video.to_dict(),
        })

        if was_empty:
            await self._broadcast_sync()

        return None

    def remove_video(self, user_id: str, video_id: str) -> str | None:
        user = self.users.get(user_id)
        video = next((v for v in self.queue if v.video_id == video_id), None)
        if not video:
            return "Video not found in queue"
        if user and user.role != UserRole.HOST and video.added_by != user_id:
            return "Only the host or the requester can remove a video"

        is_current = self.sync.current_video_id == video_id
        self.queue = [v for v in self.queue if v.video_id != video_id]

        # Check cleanup for the user who added it
        self.check_user_cleanup(video.added_by)

        return "advance" if is_current else None

    def reorder_queue(self, user_id: str, video_ids: list[str]) -> str | None:
        user = self.users.get(user_id)
        if not user or user.role != UserRole.HOST:
            return "Only the host can reorder the queue"

        id_map = {v.video_id: v for v in self.queue}
        if set(video_ids) != set(id_map.keys()):
            return "Video ID mismatch"

        self.queue = [id_map[vid] for vid in video_ids]
        return None

    def _set_current_video(self, video: Video) -> None:
        self.sync.current_video_id = video.video_id
        self.sync.youtube_id = video.youtube_id
        self.sync.timestamp = 0.0
        self.sync.is_playing = True
        self.sync.last_updated = time.time()
        self.skip_votes.clear()

    async def advance_queue(self) -> None:
        if not self.queue:
            self.sync = SyncState()
            await self._broadcast_sync()
            return

        current_idx = None
        for i, v in enumerate(self.queue):
            if v.video_id == self.sync.current_video_id:
                current_idx = i
                break

        # Remove current video from queue
        if current_idx is not None:
            removed = self.queue.pop(current_idx)
            self.check_user_cleanup(removed.added_by)

        if self.queue:
            self._set_current_video(self.queue[0])
        else:
            self.sync = SyncState()

        await self.connections.broadcast_all({
            "type": "queue_updated",
            "queue": [v.to_dict() for v in self.queue],
            "action": "advance",
        })
        await self._broadcast_sync()

    # ── Playback Controls (Host Only) ────────────────────────────

    def play(self, user_id: str) -> str | None:
        if not self._is_host(user_id):
            return "Only the host can control playback"
        if not self.sync.current_video_id:
            return "No video playing"
        self.sync.is_playing = True
        self.sync.last_updated = time.time()
        return None

    def pause(self, user_id: str, timestamp: float) -> str | None:
        if not self._is_host(user_id):
            return "Only the host can control playback"
        if not self.sync.current_video_id:
            return "No video playing"
        self.sync.is_playing = False
        self.sync.timestamp = timestamp
        self.sync.last_updated = time.time()
        return None

    def seek(self, user_id: str, timestamp: float) -> str | None:
        if not self._is_host(user_id):
            return "Only the host can control playback"
        if not self.sync.current_video_id:
            return "No video playing"
        self.sync.timestamp = timestamp
        self.sync.last_updated = time.time()
        return None

    def _is_host(self, user_id: str) -> bool:
        user = self.users.get(user_id)
        return user is not None and user.role == UserRole.HOST

    # ── Skip Voting ──────────────────────────────────────────────

    async def handle_skip_vote(self, user_id: str, video_id: str) -> None:
        if self.sync.current_video_id != video_id:
            return

        user = self.users.get(user_id)
        if not user:
            return

        # Host or video requester = instant skip
        current_video = next((v for v in self.queue if v.video_id == video_id), None)
        if user.role == UserRole.HOST or (current_video and current_video.added_by == user_id):
            await self.advance_queue()
            return

        self.skip_votes.add(user_id)
        connected_count = len(self._connected_users())
        required = max(1, int(connected_count * self.settings.skip_vote_threshold))

        await self.connections.broadcast_all({
            "type": "skip_vote_update",
            "video_id": video_id,
            "votes": len(self.skip_votes),
            "required": required,
            "voters": list(self.skip_votes),
        })

        if len(self.skip_votes) >= required:
            await self.advance_queue()

    # ── Chat ─────────────────────────────────────────────────────

    async def handle_chat(self, user_id: str, message: str) -> str | None:
        user = self.users.get(user_id)
        if not user:
            return "Unknown user"

        clean = html.escape(message.strip()[:MAX_MESSAGE_LENGTH])
        if not clean:
            return "Empty message"

        msg = ChatMessage(
            user_id=user_id,
            display_name=user.display_name,
            message=clean,
        )
        self.chat_history.append(msg)
        await self.connections.broadcast_all({
            "type": "chat_message",
            **msg.to_dict(),
        })
        return None

    # ── Settings ─────────────────────────────────────────────────

    async def update_settings(self, user_id: str, settings: dict) -> str | None:
        if not self._is_host(user_id):
            return "Only the host can change settings"
        if "max_videos_per_user" in settings:
            val = settings["max_videos_per_user"]
            if isinstance(val, int) and 1 <= val <= 50:
                self.settings.max_videos_per_user = val
        if "skip_vote_threshold" in settings:
            val = settings["skip_vote_threshold"]
            if isinstance(val, (int, float)) and 0.1 <= val <= 1.0:
                self.settings.skip_vote_threshold = float(val)
        await self.connections.broadcast_all({
            "type": "settings_updated",
            "settings": self.settings.to_dict(),
        })
        return None

    # ── Sync Broadcast ───────────────────────────────────────────

    async def _broadcast_sync(self) -> None:
        await self.connections.broadcast_all({
            "type": "sync",
            "sync": self.sync.to_dict(),
            "server_time": time.time(),
        })

    async def heartbeat(self) -> None:
        if self.connections.count > 0:
            await self._broadcast_sync()

    # ── Room State Snapshot ──────────────────────────────────────

    def get_full_state(self, user_id: str) -> dict[str, Any]:
        user = self.users.get(user_id)
        return {
            "type": "room_state",
            "room_id": self.room_id,
            "users": [u.to_dict() for u in self.users.values()],
            "queue": [v.to_dict() for v in self.queue],
            "sync": self.sync.to_dict(),
            "settings": self.settings.to_dict(),
            "chat_history": [m.to_dict() for m in self.chat_history],
            "your_user_id": user_id,
            "your_role": user.role.value if user else "viewer",
            "server_time": time.time(),
        }

    # ── Helpers ──────────────────────────────────────────────────

    def is_empty(self) -> bool:
        if self.connections.count > 0 or len(self.queue) > 0:
            return False
        # Don't destroy rooms less than 30s old (allow time for first join)
        return (time.time() - self.created_at) > 30

    @staticmethod
    async def _fetch_video_meta(youtube_id: str) -> tuple[str, str]:
        url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={youtube_id}&format=json"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("title", "Unknown"), data.get("thumbnail_url", "")
        except Exception:
            logger.debug("Failed to fetch oEmbed for %s", youtube_id)
        return "Unknown Video", f"https://img.youtube.com/vi/{youtube_id}/mqdefault.jpg"
