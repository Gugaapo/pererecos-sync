import { useRoomContext } from '../context/RoomContext';

export default function SkipVoteBar() {
  const { state, send } = useRoomContext();
  const { skip_vote, sync } = state;

  if (!sync.current_video_id) return null;

  const hasVoted = skip_vote?.voters.includes(state.your_user_id) ?? false;

  const handleVote = () => {
    if (sync.current_video_id) {
      send({ type: 'skip_vote', video_id: sync.current_video_id });
    }
  };

  return (
    <div className="px-3 py-2 border-t border-border">
      <div className="flex items-center gap-2">
        <button
          onClick={handleVote}
          disabled={hasVoted}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            hasVoted
              ? 'bg-accent-dark/50 text-text-muted cursor-not-allowed'
              : 'bg-accent-dark text-accent hover:bg-accent hover:text-deep'
          }`}
        >
          {state.your_role === 'host' ? 'Pular' : hasVoted ? 'Votou' : 'Votar Pular'}
        </button>
        {skip_vote && (
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span>{skip_vote.votes}/{skip_vote.required} votos</span>
            </div>
            <div className="h-1.5 bg-deep rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all rounded-full"
                style={{ width: `${Math.min(100, (skip_vote.votes / skip_vote.required) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
