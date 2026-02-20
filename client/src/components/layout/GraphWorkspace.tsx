import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useGraph } from '../../api/hooks.js';
import { useAppStore } from '../../stores/app-store.js';
import { TopBar } from './TopBar.js';
import { Sidebar } from './Sidebar.js';
import { GraphCanvas } from '../graph/GraphCanvas.js';
import { GraphContextMenu } from '../graph/GraphContextMenu.js';
import { LinkingOverlay } from '../graph/LinkingOverlay.js';

const MIN_SIDEBAR_WIDTH = 320;
const MAX_SIDEBAR_WIDTH = 700;
const DEFAULT_SIDEBAR_WIDTH = 400;

export function GraphWorkspace() {
  const { graphId } = useParams<{ graphId: string }>();
  const { data: graph, isLoading } = useGraph(graphId || null);
  const { selectedNodeId, sidebarMode, selectGraph, openChat } = useAppStore();
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (graphId) selectGraph(graphId);
  }, [graphId, selectGraph]);

  // Auto-open chat for root node on first visit
  useEffect(() => {
    if (graph && graph.nodes.length === 1 && !selectedNodeId) {
      openChat(graph.nodes[0].id);
    }
  }, [graph, selectedNodeId, openChat]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, newWidth)));
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted">Loading graph...</p>
      </div>
    );
  }

  if (!graph) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted">Graph not found</p>
      </div>
    );
  }

  const sidebarOpen = sidebarMode !== 'closed';

  return (
    <div className="flex flex-col h-full">
      <TopBar graph={graph} />
      <div ref={containerRef} className="flex flex-1 overflow-hidden">
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <GraphCanvas graph={graph} />
          <GraphContextMenu graph={graph} />
          <LinkingOverlay graph={graph} />
        </div>
        {sidebarOpen && (
          <>
            <div
              className="resize-handle"
              onMouseDown={handleMouseDown}
            />
            <div style={{
              width: sidebarWidth,
              minWidth: MIN_SIDEBAR_WIDTH,
              maxWidth: MAX_SIDEBAR_WIDTH,
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}>
              <Sidebar graph={graph} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
