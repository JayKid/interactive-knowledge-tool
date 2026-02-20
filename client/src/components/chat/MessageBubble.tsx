import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MessageMetadata } from '@knowledge-tool/shared';

interface Props {
  role: string;
  content: string;
  isStreaming?: boolean;
  messageId?: string;
  isSelectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  metadata?: MessageMetadata;
  onExtractedClick?: (nodeId: string) => void;
}

export function MessageBubble({
  role, content, isStreaming,
  isSelectable, isSelected, onToggleSelect,
  metadata, onExtractedClick,
}: Props) {
  const isUser = role === 'user';

  // Render extraction placeholder for system messages with extractedTo metadata
  if (role === 'system' && metadata?.extractedTo) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
        <button
          className="extracted-placeholder"
          onClick={() => onExtractedClick?.(metadata.extractedTo!.nodeId)}
        >
          ↗ Messages extracted to <strong>{metadata.extractedTo.nodeTitle}</strong>
        </button>
      </div>
    );
  }

  // Don't render other system messages
  if (role === 'system') return null;

  return (
    <div
      className={`${isSelectable ? 'message-selectable' : ''} ${isSelected ? 'message-selected' : ''}`}
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: isSelectable ? '100%' : '85%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        ...(isSelectable ? { width: '100%', cursor: 'pointer' } : {}),
      }}
      onClick={isSelectable ? onToggleSelect : undefined}
    >
      {/* Selection checkbox */}
      {isSelectable && (
        <div style={{
          flexShrink: 0,
          width: 20,
          height: 20,
          marginTop: 8,
          borderRadius: 4,
          border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border-light)'}`,
          background: isSelected ? 'var(--accent)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
        }}>
          {isSelected && (
            <span style={{ color: 'white', fontSize: 12, lineHeight: 1 }}>✓</span>
          )}
        </div>
      )}

      {/* Message bubble */}
      <div style={{ flex: 1, display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
        <div
          className={isUser ? '' : 'markdown-body'}
          style={{
            padding: '8px 14px',
            borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            background: isUser ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: isUser ? 'white' : 'var(--text-primary)',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            wordBreak: 'break-word',
            maxWidth: isSelectable ? '90%' : '100%',
            ...(isUser ? { whiteSpace: 'pre-wrap' as const } : {}),
          }}
        >
          {isUser ? content : <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>}
          {isStreaming && (
            <span style={{
              display: 'inline-block',
              width: 6,
              height: 14,
              background: 'var(--text-muted)',
              marginLeft: 2,
              animation: 'blink 1s infinite',
              verticalAlign: 'text-bottom',
            }} />
          )}
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
