export interface User {
  user_id: string;
  display_name: string;
  role: 'host' | 'viewer';
  connected: boolean;
}

export interface Video {
  video_id: string;
  youtube_id: string;
  title: string;
  thumbnail: string;
  duration: number;
  added_by: string;
  video_type: 'youtube' | 'direct';
  url: string;
}

export interface SyncState {
  current_video_id: string | null;
  youtube_id: string | null;
  timestamp: number;
  is_playing: boolean;
  last_updated: number;
  video_type: 'youtube' | 'direct';
  url: string;
}

export interface RoomSettings {
  max_videos_per_user: number;
  skip_vote_threshold: number;
}

export interface ChatMessage {
  user_id: string;
  display_name: string;
  message: string;
  timestamp: number;
  is_system: boolean;
}

export interface SkipVoteState {
  video_id: string;
  votes: number;
  required: number;
  voters: string[];
}

export interface SearchResult {
  youtube_id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

export interface RoomState {
  room_id: string;
  users: User[];
  queue: Video[];
  sync: SyncState;
  settings: RoomSettings;
  chat_history: ChatMessage[];
  your_user_id: string;
  your_role: 'host' | 'viewer';
  skip_vote: SkipVoteState | null;
  connected: boolean;
}
