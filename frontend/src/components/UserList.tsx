import { useRoomContext } from '../context/RoomContext';

export default function UserList() {
  const { state } = useRoomContext();
  const connected = state.users.filter(u => u.connected);

  return (
    <div className="px-3 py-2 border-b border-border">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-muted">{connected.length} online:</span>
        {connected.map(user => (
          <span
            key={user.user_id}
            className={`text-xs px-2 py-0.5 rounded-full ${
              user.role === 'host'
                ? 'bg-accent-dark text-lime'
                : 'bg-deep text-text-primary'
            } ${user.user_id === state.your_user_id ? 'ring-1 ring-accent' : ''}`}
          >
            {user.display_name}
            {user.role === 'host' && ' \u2605'}
          </span>
        ))}
      </div>
    </div>
  );
}
