import { useEffect, useState } from 'react';
import { useRoomContext } from '../context/RoomContext';

export default function SyncOverlay() {
  const { state } = useRoomContext();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (state.sync.is_playing && state.sync.youtube_id) {
      // Overlay shown reactively by video player on drift > 2s
    }
  }, [state.sync]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-overlay backdrop-blur-sm pointer-events-none">
      <div className="flex items-center gap-3 text-accent">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-lg font-medium">Sincronizando...</span>
      </div>
    </div>
  );
}
