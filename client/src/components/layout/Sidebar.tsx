import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/app-store.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { ChatPanel } from '../chat/ChatPanel.js';
import { NodeDetailPanel } from '../node-detail/NodeDetailPanel.js';
import type { GraphWithDetails } from '@knowledge-tool/shared';

interface Props {
  graph: GraphWithDetails;
}

export function Sidebar({ graph }: Props) {
  const navigate = useNavigate();
  const { selectedNodeId, sidebarMode, setSidebarMode } = useAppStore();
  const isMobile = useIsMobile();

  const selectedNode = graph.nodes.find(n => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        {isMobile ? 'No nodes yet — start a conversation!' : 'Select a node to explore'}
      </div>
    );
  }

  const handleClose = () => {
    if (isMobile) {
      // On mobile there's no graph canvas to return to, go back to graph list
      navigate('/');
    } else {
      setSidebarMode('closed');
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* Sidebar header */}
      <div className="flex items-center justify-between p-3" style={{
        borderBottom: '1px solid var(--border)',
        minHeight: 48,
      }}>
        <h3 className="font-semibold text-sm truncate" style={{ flex: 1 }}>{selectedNode.title}</h3>
        <div className="flex gap-1">
          <button
            className={`btn btn-sm ${sidebarMode === 'chat' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSidebarMode('chat')}
          >
            Chat
          </button>
          <button
            className={`btn btn-sm ${sidebarMode === 'node-detail' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSidebarMode('node-detail')}
          >
            Details
          </button>
          {!isMobile && (
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={handleClose}
              title="Close sidebar"
            >
              x
            </button>
          )}
        </div>
      </div>

      {/* Sidebar content */}
      <div className="flex-1 overflow-hidden">
        {sidebarMode === 'chat' && (
          <ChatPanel node={selectedNode} graphId={graph.id} />
        )}
        {sidebarMode === 'node-detail' && (
          <NodeDetailPanel node={selectedNode} graph={graph} />
        )}
      </div>
    </div>
  );
}
