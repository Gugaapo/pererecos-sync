import { useRoomContext } from '../context/RoomContext';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import SyncOverlay from './SyncOverlay';

export default function VideoPlayer() {
  const { state, send } = useRoomContext();
  const isHost = state.your_role === 'host';

  useVideoPlayer({
    containerId: 'yt-player',
    sync: state.sync,
    isHost,
    send,
  });

  if (!state.sync.youtube_id) {
    return (
      <div className="w-full aspect-video bg-card border border-border rounded-xl flex items-center justify-center">
        <p className="text-text-muted">Nenhum vídeo tocando. Adicione uma URL do YouTube para começar.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-border">
      <div id="yt-player" className="w-full h-full" />
      <SyncOverlay />
      {!isHost && (
        <div className="absolute inset-0 z-10" style={{ pointerEvents: 'auto', background: 'transparent' }} />
      )}
    </div>
  );
}
