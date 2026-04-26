import { useState, useRef, useEffect } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile.js';

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) {
      inputRef.current?.focus();
    }
  }, [disabled, isMobile]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2 p-2" style={{ borderTop: '1px solid var(--border)', flexShrink: 0 }}>
      <textarea
        ref={inputRef}
        className="input flex-1"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'Waiting for response...' : 'Ask a question...'}
        disabled={disabled}
        rows={1}
        style={{
          resize: 'none',
          minHeight: 38,
          maxHeight: 120,
        }}
      />
      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={!value.trim() || disabled}
      >
        Send
      </button>
    </div>
  );
}
