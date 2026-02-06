import { useRoomContext } from '../context/RoomContext';
import PlaylistItem from './PlaylistItem';
import SkipVoteBar from './SkipVoteBar';

export default function PlaylistTab() {
  const { state } = useRoomContext();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {state.queue.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">
            A fila está vazia. Cole uma URL do YouTube acima para adicionar.
          </p>
        ) : (
          state.queue.map((video) => (
            <PlaylistItem
              key={video.video_id}
              video={video}
              isCurrent={video.video_id === state.sync.current_video_id}
            />
          ))
        )}
      </div>
      <SkipVoteBar />
    </div>
  );
}
