import { useState } from 'react';

interface Props {
  onClose: () => void;
  onCreate: (title: string, initialTopic: string) => void;
  isCreating: boolean;
}

export function NewGraphDialog({ onClose, onCreate, isCreating }: Props) {
  const [topic, setTopic] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = topic.trim();
    if (!trimmed) return;
    onCreate(trimmed, trimmed);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <h2 className="font-semibold" style={{ fontSize: '1.125rem', marginBottom: 8 }}>
          New Knowledge Graph
        </h2>
        <p className="text-secondary text-sm" style={{ marginBottom: 20 }}>
          What topic would you like to explore?
        </p>
        <form onSubmit={handleSubmit}>
          <input
            className="input"
            type="text"
            placeholder='e.g. "Stoic Philosophy", "Quantum Computing", "Renaissance Art"'
            value={topic}
            onChange={e => setTopic(e.target.value)}
            autoFocus
            disabled={isCreating}
          />
          <div className="flex gap-2 justify-between" style={{ marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isCreating}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!topic.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Start Exploring'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
