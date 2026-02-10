import re
import uuid


def generate_room_id() -> str:
    return uuid.uuid4().hex[:8]


def generate_user_id() -> str:
    return uuid.uuid4().hex[:12]


def generate_video_id() -> str:
    return uuid.uuid4().hex[:10]


_YT_PATTERNS = [
    re.compile(r"(?:youtube\.com/watch\?.*v=|youtu\.be/|youtube\.com/embed/|youtube\.com/v/|youtube\.com/shorts/)([a-zA-Z0-9_-]{11})"),
]


def extract_youtube_id(url: str) -> str | None:
    for pattern in _YT_PATTERNS:
        match = pattern.search(url)
        if match:
            return match.group(1)
    # Bare ID (11 chars)
    if re.fullmatch(r"[a-zA-Z0-9_-]{11}", url.strip()):
        return url.strip()
    return None


_VIDEO_EXTENSIONS = re.compile(r"\.(mp4|webm|ogg|mov|mkv|avi)(\?.*)?$", re.IGNORECASE)


def detect_video_url(url: str) -> str | None:
    """Returns the URL if it looks like a direct video link, else None."""
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        return None
    if _VIDEO_EXTENSIONS.search(url):
        return url
    return None
