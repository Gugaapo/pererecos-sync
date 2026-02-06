import { useCallback, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { getWsUrl } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useRoom } from '../hooks/useRoom';
import { RoomContext } from '../context/RoomContext';
import JoinModal from '../components/JoinModal';
import Navbar from '../components/Navbar';
import VideoPlayer from '../components/VideoPlayer';
import Sidebar from '../components/Sidebar';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const passedName = (location.state as { displayName?: string } | null)?.displayName ?? null;

  const [displayName, setDisplayName] = useState<string | null>(passedName);
  const displayNameRef = useRef<string | null>(passedName);
  const { state, handleMessage, setConnected } = useRoom();
  const pendingJoin = useRef(false);

  const wsUrl = roomId ? getWsUrl(roomId) : '';

  const { send, connected } = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
    onOpen: () => {
      setConnected(true);
      pendingJoin.current = true;
    },
    onClose: () => setConnected(false),
    enabled: !!displayName,
  });

  // Send join when WS connects (pendingJoin flag + send available)
  if (pendingJoin.current && connected && displayNameRef.current) {
    pendingJoin.current = false;
    send({ type: 'join', display_name: displayNameRef.current });
  }

  const handleJoin = useCallback((name: string) => {
    displayNameRef.current = name;
    setDisplayName(name);
  }, []);

  if (!displayName) {
    return <JoinModal onJoin={handleJoin} />;
  }

  return (
    <RoomContext.Provider value={{ state, send }}>
      <div className="h-screen flex flex-col">
        <Navbar />
        {!connected && state.your_user_id && (
          <div className="bg-error/10 text-error text-sm text-center py-2 border-b border-error/30">
            Desconectado. Reconectando...
          </div>
        )}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col">
            <div className="flex-1 p-4 flex items-center justify-center">
              <div className="w-full max-w-5xl">
                <VideoPlayer />
              </div>
            </div>
          </div>
          <div className="w-80 shrink-0 hidden md:flex flex-col">
            <Sidebar />
          </div>
        </div>
        <div className="md:hidden">
          <MobileSidebar />
        </div>
      </div>
    </RoomContext.Provider>
  );
}

function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-40 bg-accent-dark text-accent w-12 h-12 rounded-full shadow-lg flex items-center justify-center md:hidden border border-accent/30"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-overlay" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-card">
            <Sidebar />
          </div>
        </div>
      )}
    </>
  );
}
