import { useState } from 'react';

interface Props {
  selectedCount: number;
  suggestedTitle: string;
  onClose: () => void;
  onExtract: (title: string, edgeLabel: string) => void;
  isExtracting: boolean;
}

export function ExtractDialog({ selectedCount, suggestedTitle, onClose, onExtract, isExtracting }: Props) {
  const [title, setTitle] = useState(suggestedTitle);
  const [edgeLabel, setEdgeLabel] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onExtract(trimmed, edgeLabel.trim());
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <h2 className="font-semibold" style={{ fontSize: '1.125rem', marginBottom: 8 }}>
          Extract to New Node
        </h2>
        <p className="text-secondary text-sm" style={{ marginBottom: 20 }}>
          {selectedCount} message{selectedCount !== 1 ? 's' : ''} will be moved to a new child node.
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 4 }}>
              Node title
            </label>
            <input
              className="input"
              type="text"
              placeholder="Title for the new node..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              disabled={isExtracting}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 4 }}>
              Relationship label (optional)
            </label>
            <input
              className="input"
              type="text"
              placeholder='e.g. "subtopic", "related concept"'
              value={edgeLabel}
              onChange={e => setEdgeLabel(e.target.value)}
              disabled={isExtracting}
            />
          </div>
          <div className="flex gap-2 justify-between" style={{ marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isExtracting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!title.trim() || isExtracting}>
              {isExtracting ? 'Extracting...' : 'Extract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
