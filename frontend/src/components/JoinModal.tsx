import { useState } from 'react';

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

interface JoinModalProps {
  onJoin: (displayName: string) => void;
}

export default function JoinModal({ onJoin }: JoinModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onJoin(name.trim() || generateRandomName());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h2 className="text-xl font-bold text-lime mb-2">Entrar na Sala</h2>
        <p className="text-text-muted text-sm mb-6">Escolha um nome de exibição</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          autoFocus
          placeholder="Deixe vazio para nome aleatório"
          className="w-full bg-deep border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors mb-4"
        />
        <button
          type="submit"
          className="w-full bg-accent-dark hover:bg-accent text-text-primary hover:text-deep font-semibold py-3 px-4 rounded-xl transition-colors"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
