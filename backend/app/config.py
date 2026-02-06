ALLOWED_ORIGINS = [
    "https://tossemideia.cloud",
    "http://localhost:5173",
    "http://localhost:3000",
]

HEARTBEAT_INTERVAL = 1.0  # seconds
SYNC_REPORT_INTERVAL = 5.0  # seconds (client-side)
DRIFT_THRESHOLD = 2.0  # seconds before forced seek
HOST_GRACE_PERIOD = 60.0  # seconds before host transfer
CHAT_HISTORY_LIMIT = 100
RECONNECT_WINDOW = 30.0  # seconds before erasing disconnected user
MAX_MESSAGE_LENGTH = 500
