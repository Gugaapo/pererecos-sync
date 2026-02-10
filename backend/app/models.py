from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum


class UserRole(str, Enum):
    HOST = "host"
    VIEWER = "viewer"


@dataclass
class User:
    user_id: str
    display_name: str
    role: UserRole
    connected: bool = True
    disconnected_at: float | None = None

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "display_name": self.display_name,
            "role": self.role.value,
            "connected": self.connected,
        }


@dataclass
class Video:
    video_id: str  # internal uuid
    youtube_id: str  # e.g. "dQw4w9WgXcQ" (empty for direct videos)
    title: str
    thumbnail: str
    duration: float
    added_by: str  # user_id
    video_type: str = "youtube"  # "youtube" | "direct"
    url: str = ""  # full URL for direct videos

    def to_dict(self) -> dict:
        return {
            "video_id": self.video_id,
            "youtube_id": self.youtube_id,
            "title": self.title,
            "thumbnail": self.thumbnail,
            "duration": self.duration,
            "added_by": self.added_by,
            "video_type": self.video_type,
            "url": self.url,
        }


@dataclass
class SyncState:
    current_video_id: str | None = None
    youtube_id: str | None = None
    timestamp: float = 0.0
    is_playing: bool = False
    last_updated: float = field(default_factory=time.time)
    video_type: str = "youtube"  # "youtube" | "direct"
    url: str = ""  # full URL for direct videos

    def current_server_time(self) -> float:
        if self.is_playing:
            return self.timestamp + (time.time() - self.last_updated)
        return self.timestamp

    def to_dict(self) -> dict:
        return {
            "current_video_id": self.current_video_id,
            "youtube_id": self.youtube_id,
            "timestamp": self.current_server_time(),
            "is_playing": self.is_playing,
            "last_updated": self.last_updated,
            "video_type": self.video_type,
            "url": self.url,
        }


@dataclass
class RoomSettings:
    max_videos_per_user: int = 10
    skip_vote_threshold: float = 0.5

    def to_dict(self) -> dict:
        return {
            "max_videos_per_user": self.max_videos_per_user,
            "skip_vote_threshold": self.skip_vote_threshold,
        }


@dataclass
class ChatMessage:
    user_id: str
    display_name: str
    message: str
    timestamp: float = field(default_factory=time.time)
    is_system: bool = False

    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "display_name": self.display_name,
            "message": self.message,
            "timestamp": self.timestamp,
            "is_system": self.is_system,
        }
