import type { ChatMessage, RoomSettings, SyncState, User, Video } from './index';

// Server → Client messages
export type ServerMessage =
  | { type: 'room_state'; room_id: string; users: User[]; queue: Video[]; sync: SyncState; settings: RoomSettings; chat_history: ChatMessage[]; your_user_id: string; your_role: 'host' | 'viewer'; server_time: number }
  | { type: 'user_joined'; user: User }
  | { type: 'user_left'; user_id: string }
  | { type: 'queue_updated'; queue: Video[]; action: string; video?: Video }
  | { type: 'sync'; sync: SyncState; server_time: number }
  | { type: 'chat_message' } & ChatMessage
  | { type: 'skip_vote_update'; video_id: string; votes: number; required: number; voters: string[] }
  | { type: 'host_changed'; new_host_id: string; new_host_name: string }
  | { type: 'settings_updated'; settings: RoomSettings }
  | { type: 'error'; code: string; message: string };

// Client → Server messages
export type ClientMessage =
  | { type: 'join'; display_name: string }
  | { type: 'add_video'; url: string }
  | { type: 'remove_video'; video_id: string }
  | { type: 'reorder_queue'; video_ids: string[] }
  | { type: 'skip_vote'; video_id: string }
  | { type: 'chat_message'; message: string }
  | { type: 'sync_report'; timestamp: number; state: string }
  | { type: 'play' }
  | { type: 'pause'; timestamp: number }
  | { type: 'seek'; timestamp: number }
  | { type: 'video_ended' }
  | { type: 'update_settings'; settings: Partial<RoomSettings> };
