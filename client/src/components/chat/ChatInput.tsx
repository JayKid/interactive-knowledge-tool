import { useState, useRef, useEffect } from 'react';

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [disabled]);

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
    <div className="flex gap-2 p-3" style={{ borderTop: '1px solid var(--border)' }}>
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
