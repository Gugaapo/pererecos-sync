import type { ChatMessage as ChatMessageType } from '../types/index';

interface ChatMessageProps {
  message: ChatMessageType;
  isOwn: boolean;
}

export default function ChatMessage({ message, isOwn }: ChatMessageProps) {
  if (message.is_system) {
    return (
      <div className="text-xs text-text-muted italic py-1 px-2">
        {message.message}
      </div>
    );
  }

  return (
    <div className="py-1 px-2">
      <span className={`text-xs font-medium ${isOwn ? 'text-lime' : 'text-accent'}`}>
        {message.display_name}
      </span>
      <span className="text-sm text-text-primary ml-2">{message.message}</span>
    </div>
  );
}
