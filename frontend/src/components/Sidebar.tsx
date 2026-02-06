import { useState } from 'react';
import PlaylistTab from './PlaylistTab';
import ChatTab from './ChatTab';

export default function Sidebar() {
  const [tab, setTab] = useState<'playlist' | 'chat'>('playlist');

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab('playlist')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            tab === 'playlist'
              ? 'text-lime border-b-2 border-accent'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Playlist
        </button>
        <button
          onClick={() => setTab('chat')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            tab === 'chat'
              ? 'text-lime border-b-2 border-accent'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Chat
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'playlist' ? <PlaylistTab /> : <ChatTab />}
      </div>
    </div>
  );
}
