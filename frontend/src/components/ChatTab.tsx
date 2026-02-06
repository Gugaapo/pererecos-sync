import { useEffect, useRef, useState } from 'react';
import { useRoomContext } from '../context/RoomContext';
import ChatMessageComp from './ChatMessage';
import UserList from './UserList';

export default function ChatTab() {
  const { state, send } = useRoomContext();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.chat_history.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) {
      send({ type: 'chat_message', message: trimmed });
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <UserList />
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2">
        {state.chat_history.length === 0 ? (
          <p className="text-text-muted text-xs text-center py-4">Nenhuma mensagem ainda</p>
        ) : (
          state.chat_history.map((msg, i) => (
            <ChatMessageComp
              key={i}
              message={msg}
              isOwn={msg.user_id === state.your_user_id}
            />
          ))
        )}
      </div>
      <form onSubmit={handleSend} className="p-2 border-t border-border flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="Digite uma mensagem..."
          className="flex-1 bg-deep border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="bg-accent-dark hover:bg-accent text-text-primary hover:text-deep text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
