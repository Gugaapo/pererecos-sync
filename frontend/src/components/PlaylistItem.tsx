import { useRoomContext } from '../context/RoomContext';
import type { Video } from '../types/index';

interface PlaylistItemProps {
  video: Video;
  isCurrent: boolean;
}

export default function PlaylistItem({ video, isCurrent }: PlaylistItemProps) {
  const { state, send } = useRoomContext();
  const isHost = state.your_role === 'host';
  const isOwner = video.added_by === state.your_user_id;
  const addedBy = state.users.find(u => u.user_id === video.added_by);

  const handleRemove = () => {
    send({ type: 'remove_video', video_id: video.video_id });
  };

  return (
    <div className={`flex gap-3 p-3 rounded-lg transition-colors ${
      isCurrent ? 'bg-accent-dark/40 border border-accent/30' : 'hover:bg-card-hover'
    }`}>
      {video.thumbnail ? (
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-20 h-12 object-cover rounded shrink-0"
        />
      ) : (
        <div className="w-20 h-12 bg-deep rounded shrink-0 flex items-center justify-center">
          <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate" title={video.title}>{video.title}</p>
        <p className="text-xs text-text-muted mt-0.5">
          {addedBy?.display_name ?? 'Desconhecido'}
          {isCurrent && <span className="ml-2 text-accent">Tocando agora</span>}
        </p>
      </div>
      {(isHost || isOwner) && (
        <button
          onClick={handleRemove}
          className="text-text-muted hover:text-error transition-colors shrink-0 self-center"
          title="Remover"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
