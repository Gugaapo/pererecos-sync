import { createContext, useContext } from 'react';
import type { RoomState } from '../types/index';
import type { ClientMessage } from '../types/messages';

interface RoomContextValue {
  state: RoomState;
  send: (msg: ClientMessage) => void;
}

export const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoomContext(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoomContext must be used within RoomContext.Provider');
  return ctx;
}
