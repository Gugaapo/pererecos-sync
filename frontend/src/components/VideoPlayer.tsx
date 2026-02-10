import { useRef } from 'react';
import { useRoomContext } from '../context/RoomContext';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { useDirectVideoPlayer } from '../hooks/useDirectVideoPlayer';
import SyncOverlay from './SyncOverlay';

function YouTubePlayer({ isHost }: { isHost: boolean }) {
  const { state, send } = useRoomContext();

  useVideoPlayer({
    containerId: 'yt-player',
    sync: state.sync,
    isHost,
    send,
  });

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

function DirectPlayer({ isHost }: { isHost: boolean }) {
  const { state, send } = useRoomContext();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useDirectVideoPlayer({
    videoRef,
    sync: state.sync,
    isHost,
    send,
  });

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-border">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls={isHost}
        playsInline
      />
      <SyncOverlay />
      {!isHost && (
        <div className="absolute inset-0 z-10" style={{ pointerEvents: 'auto', background: 'transparent' }} />
      )}
    </div>
  );
}

export default function VideoPlayer() {
  const { state } = useRoomContext();
  const isHost = state.your_role === 'host';

  if (!state.sync.current_video_id) {
    return (
      <div className="w-full aspect-video bg-card border border-border rounded-xl flex items-center justify-center">
        <p className="text-text-muted">Nenhum vídeo tocando. Adicione uma URL para começar.</p>
      </div>
    );
  }

  if (state.sync.video_type === 'direct') {
    return <DirectPlayer isHost={isHost} />;
  }

  return <YouTubePlayer isHost={isHost} />;
}
