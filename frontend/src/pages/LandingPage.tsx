import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, checkRoom, listRooms } from '../lib/api';
import type { RoomListItem } from '../lib/api';

const RANDOM_SUFFIXES = [
  'Valente', 'Sabido', 'Ligeiro', 'Esperto', 'Tranquilo',
  'Brabo', 'Astuto', 'Fofo', 'Ninja', 'Veloz',
  'Safado', 'Sorridente', 'Corajoso', 'Radical', 'Zen',
  'Supremo', 'Mestre', 'Lendário', 'Tímido', 'Curioso',
];

function generateRandomName(): string {
  const suffix = RANDOM_SUFFIXES[Math.floor(Math.random() * RANDOM_SUFFIXES.length)];
  const num = Math.floor(Math.random() * 100);
  return `Perereco ${suffix}${num}`;
}

function getDisplayName(name: string): string {
  return name.trim() || generateRandomName();
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<RoomListItem[]>([]);

  useEffect(() => {
    const fetchRooms = () => {
      listRooms().then(setRooms).catch(() => {});
    };
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const { room_id } = await createRoom();
      navigate(`/sync/room/${room_id}`, { state: { displayName: getDisplayName(name) } });
    } catch {
      setError('Erro ao criar sala');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const id = joinId.trim();
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await checkRoom(id);
      if (data.exists) {
        navigate(`/sync/room/${id}`, { state: { displayName: getDisplayName(name) } });
      } else {
        setError('Sala não encontrada');
      }
    } catch {
      setError('Erro ao buscar sala');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    navigate(`/sync/room/${roomId}`, { state: { displayName: getDisplayName(name) } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="flex gap-6 w-full max-w-4xl items-start">
        {/* Left: Create / Join */}
        <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-md shadow-2xl shrink-0">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-lime mb-2">Perereco's Sync</h1>
            <p className="text-text-muted text-sm">Assista vídeos do YouTube juntos em sincronia</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-text-muted mb-2">Nome de Exibição</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder="Deixe vazio para nome aleatório"
              className="w-full bg-deep border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-accent-dark hover:bg-accent text-text-primary hover:text-deep font-semibold py-3 px-4 rounded-xl transition-colors mb-6 disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar Sala'}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-text-muted text-sm">ou entre em uma sala</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="ID da Sala"
              className="flex-1 bg-deep border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={handleJoin}
              disabled={loading || !joinId.trim()}
              className="bg-accent-dark hover:bg-accent text-text-primary hover:text-deep font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              Entrar
            </button>
          </div>

          {error && (
            <p className="text-error text-sm mt-4 text-center">{error}</p>
          )}
        </div>

        {/* Right: Room list */}
        <div className="bg-card border border-border rounded-2xl p-6 flex-1 shadow-2xl min-w-0 hidden md:block">
          <h2 className="text-lg font-bold text-lime mb-4">Salas Ativas</h2>
          {rooms.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">
              Nenhuma sala ativa no momento
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {rooms.map((room) => (
                <button
                  key={room.room_id}
                  onClick={() => handleJoinRoom(room.room_id)}
                  className="w-full text-left bg-deep hover:bg-card-hover border border-border hover:border-border-hover rounded-xl p-4 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-text-primary font-medium group-hover:text-lime transition-colors">
                      Quartinho {room.host_name}
                    </span>
                    <span className="text-xs text-accent bg-accent-dark/50 px-2 py-0.5 rounded-full">
                      {room.user_count} online
                    </span>
                  </div>
                  {room.current_video && (
                    <p className="text-xs text-text-muted truncate">
                      {room.current_video}
                    </p>
                  )}
                  {!room.current_video && room.queue_length === 0 && (
                    <p className="text-xs text-text-muted italic">
                      Sem vídeos na fila
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
