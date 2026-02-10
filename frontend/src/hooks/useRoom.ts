import { useCallback, useReducer } from 'react';
import type { RoomState } from '../types/index';
import type { ServerMessage } from '../types/messages';

const initialState: RoomState = {
  room_id: '',
  users: [],
  queue: [],
  sync: { current_video_id: null, youtube_id: null, timestamp: 0, is_playing: false, last_updated: 0, video_type: 'youtube', url: '' },
  settings: { max_videos_per_user: 10, skip_vote_threshold: 0.5 },
  chat_history: [],
  your_user_id: '',
  your_role: 'viewer',
  skip_vote: null,
  connected: false,
};

type Action =
  | { type: 'SET_CONNECTED'; connected: boolean }
  | { type: 'SERVER_MESSAGE'; msg: ServerMessage };

function reducer(state: RoomState, action: Action): RoomState {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, connected: action.connected };

    case 'SERVER_MESSAGE': {
      const msg = action.msg;
      switch (msg.type) {
        case 'room_state':
          return {
            ...state,
            room_id: msg.room_id,
            users: msg.users,
            queue: msg.queue,
            sync: msg.sync,
            settings: msg.settings,
            chat_history: msg.chat_history,
            your_user_id: msg.your_user_id,
            your_role: msg.your_role,
            connected: true,
          };

        case 'user_joined':
          return {
            ...state,
            users: [...state.users.filter(u => u.user_id !== msg.user.user_id), msg.user],
          };

        case 'user_left':
          return {
            ...state,
            users: state.users.map(u =>
              u.user_id === msg.user_id ? { ...u, connected: false } : u
            ),
          };

        case 'queue_updated':
          return {
            ...state,
            queue: msg.queue,
            skip_vote: msg.action === 'advance' ? null : state.skip_vote,
          };

        case 'sync':
          return { ...state, sync: msg.sync };

        case 'chat_message': {
          const chatMsg = {
            user_id: msg.user_id,
            display_name: msg.display_name,
            message: msg.message,
            timestamp: msg.timestamp,
            is_system: msg.is_system,
          };
          return {
            ...state,
            chat_history: [...state.chat_history.slice(-99), chatMsg],
          };
        }

        case 'skip_vote_update':
          return {
            ...state,
            skip_vote: {
              video_id: msg.video_id,
              votes: msg.votes,
              required: msg.required,
              voters: msg.voters,
            },
          };

        case 'host_changed':
          return {
            ...state,
            users: state.users.map(u => ({
              ...u,
              role: u.user_id === msg.new_host_id ? 'host' as const : 'viewer' as const,
            })),
            your_role: state.your_user_id === msg.new_host_id ? 'host' : state.your_role,
          };

        case 'settings_updated':
          return { ...state, settings: msg.settings };

        case 'error':
          // Could toast this — for now just log
          console.warn('[SyncTube Error]', msg.code, msg.message);
          return state;

        default:
          return state;
      }
    }

    default:
      return state;
  }
}

export function useRoom() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleMessage = useCallback((msg: ServerMessage) => {
    dispatch({ type: 'SERVER_MESSAGE', msg });
  }, []);

  const setConnected = useCallback((connected: boolean) => {
    dispatch({ type: 'SET_CONNECTED', connected });
  }, []);

  return { state, handleMessage, setConnected };
}
