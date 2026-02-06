import { useState } from 'react';
import { useRoomContext } from '../context/RoomContext';
import RoomSettings from './RoomSettings';

export default function Navbar() {
  const { state, send } = useRoomContext();
  const [url, setUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const isHost = state.your_role === 'host';

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (trimmed) {
      send({ type: 'add_video', url: trimmed });
      setUrl('');
    }
  };

  return (
    <>
      <nav className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-lime shrink-0">Perereco's Sync</h1>

          <form onSubmit={handleAddVideo} className="flex-1 flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Cole a URL do YouTube..."
              className="flex-1 bg-deep border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              disabled={!url.trim()}
              className="bg-accent-dark hover:bg-accent text-text-primary hover:text-deep text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0 disabled:opacity-50"
            >
              Adicionar
            </button>
          </form>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-text-muted">
              Sala: <span className="text-accent font-mono">{state.room_id}</span>
            </span>
            {isHost && (
              <button
                onClick={() => setShowSettings(true)}
                className="text-text-muted hover:text-accent transition-colors"
                title="Configurações da Sala"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </nav>

      {showSettings && <RoomSettings onClose={() => setShowSettings(false)} />}
    </>
  );
}
