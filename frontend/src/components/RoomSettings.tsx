import { useState } from 'react';
import { useRoomContext } from '../context/RoomContext';

interface RoomSettingsProps {
  onClose: () => void;
}

export default function RoomSettings({ onClose }: RoomSettingsProps) {
  const { state, send } = useRoomContext();
  const [maxVideos, setMaxVideos] = useState(state.settings.max_videos_per_user);
  const [skipThreshold, setSkipThreshold] = useState(state.settings.skip_vote_threshold);

  const handleSave = () => {
    send({
      type: 'update_settings',
      settings: {
        max_videos_per_user: maxVideos,
        skip_vote_threshold: skipThreshold,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-lime mb-4">Configurações da Sala</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Máximo de vídeos por usuário</label>
            <input
              type="number"
              min={1}
              max={50}
              value={maxVideos}
              onChange={(e) => setMaxVideos(Number(e.target.value))}
              className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Limite para pular ({Math.round(skipThreshold * 100)}%)</label>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.1}
              value={skipThreshold}
              onChange={(e) => setSkipThreshold(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-deep border border-border hover:border-border-hover text-text-primary py-2 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-accent-dark hover:bg-accent text-text-primary hover:text-deep py-2 rounded-lg transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
