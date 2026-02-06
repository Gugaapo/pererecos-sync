const BASE = import.meta.env.DEV ? '/sync/api' : '/sync/api';

export async function createRoom(): Promise<{ room_id: string }> {
  const res = await fetch(`${BASE}/rooms`, { method: 'POST' });
  return res.json();
}

export async function checkRoom(roomId: string): Promise<{ exists: boolean; user_count?: number; queue_length?: number }> {
  const res = await fetch(`${BASE}/rooms/${roomId}`);
  return res.json();
}

export interface RoomListItem {
  room_id: string;
  host_name: string;
  user_count: number;
  queue_length: number;
  current_video: string | null;
}

export async function listRooms(): Promise<RoomListItem[]> {
  const res = await fetch(`${BASE}/rooms`);
  return res.json();
}

export function getWsUrl(roomId: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/sync/ws/${roomId}`;
}
