import { useState, useRef, useEffect, useCallback } from 'react';
import { useRoomContext } from '../context/RoomContext';
import { searchYouTube } from '../lib/api';
import type { YouTubeSearchResult } from '../lib/api';
import { extractVideoId } from '../lib/youtube';
import RoomSettings from './RoomSettings';

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export default function Navbar() {
  const { state, send } = useRoomContext();
  const [input, setInput] = useState('');
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const isHost = state.your_role === 'host';

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isYouTubeUrl = extractVideoId(input.trim()) !== null;
  const isDirectUrl = /^https?:\/\/.+\.(mp4|webm|ogg|mov|mkv|avi)(\?.*)?$/i.test(input.trim());
  const isUrl = isYouTubeUrl || isDirectUrl;

  const handleAddByUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed && isUrl) {
      send({ type: 'add_video', url: trimmed });
      setInput('');
      setResults([]);
      setShowDropdown(false);
    }
  };

  const handleSelectResult = (result: YouTubeSearchResult) => {
    send({ type: 'add_video', url: `https://www.youtube.com/watch?v=${result.youtube_id}` });
    setInput('');
    setResults([]);
    setShowDropdown(false);
  };

  const doSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    const data = await searchYouTube(query);
    setResults(data);
    setShowDropdown(data.length > 0);
    setLoading(false);
  }, []);

  const handleInputChange = (value: string) => {
    setInput(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    // If it looks like a URL, don't search
    const trimmed = value.trim();
    if (extractVideoId(trimmed) !== null || /^https?:\/\/.+\.(mp4|webm|ogg|mov|mkv|avi)(\?.*)?$/i.test(trimmed)) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      doSearch(value.trim());
    }, 300);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <>
      <nav className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-lime shrink-0">Perereco's Sync</h1>

          <div ref={containerRef} className="flex-1 relative">
            <form onSubmit={handleAddByUrl} className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => results.length > 0 && setShowDropdown(true)}
                  placeholder="Pesquise ou cole a URL de um vídeo..."
                  className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
                />
                {loading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {isUrl && (
                <button
                  type="submit"
                  className="bg-accent-dark hover:bg-accent text-text-primary hover:text-deep text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
                >
                  Adicionar
                </button>
              )}
            </form>

            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                {results.map((result) => (
                  <button
                    key={result.youtube_id}
                    type="button"
                    onClick={() => handleSelectResult(result)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-card-hover transition-colors text-left first:rounded-t-lg last:rounded-b-lg"
                  >
                    <img
                      src={result.thumbnail}
                      alt=""
                      className="w-24 h-14 object-cover rounded shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary line-clamp-2">
                        {decodeHtmlEntities(result.title)}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5 truncate">{result.channel}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

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
