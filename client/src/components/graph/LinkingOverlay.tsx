import { useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/app-store.js';
import type { GraphWithDetails } from '@knowledge-tool/shared';

interface Props {
  graph: GraphWithDetails;
}

export function LinkingOverlay({ graph }: Props) {
  const { linkingSourceNodeId, cancelLinking } = useAppStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cancelLinking();
    }
  }, [cancelLinking]);

  useEffect(() => {
    if (linkingSourceNodeId) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [linkingSourceNodeId, handleKeyDown]);

  if (!linkingSourceNodeId) return null;

  const sourceNode = graph.nodes.find(n => n.id === linkingSourceNodeId);
  const sourceTitle = sourceNode?.title || 'selected node';

  return (
    <div className="linking-banner">
      <span>
        Click a node to connect to <strong>{sourceTitle}</strong>
      </span>
      <button className="btn btn-ghost btn-sm" onClick={cancelLinking}>
        Cancel (Esc)
      </button>
    </div>
  );
}
