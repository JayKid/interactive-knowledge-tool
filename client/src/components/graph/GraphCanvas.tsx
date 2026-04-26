import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useAppStore } from '../../stores/app-store.js';
import { useCreateEdge } from '../../api/hooks.js';
import { nodeColor } from '../../utils/colors.js';
import type { GraphWithDetails } from '@knowledge-tool/shared';

interface Props {
  graph: GraphWithDetails;
}

interface GraphNode {
  id: string;
  title: string;
  depth: number;
  summary: string;
  connections: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  label: string;
}

export function GraphCanvas({ graph }: Props) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    selectedNodeId, selectNode, showContextMenu, hideContextMenu,
    linkingSourceNodeId, cancelLinking, openChat,
  } = useAppStore();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const createEdge = useCreateEdge(graph.id);

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const data = useMemo(() => {
    const connectionCounts = new Map<string, number>();
    for (const edge of graph.edges) {
      connectionCounts.set(edge.sourceId, (connectionCounts.get(edge.sourceId) || 0) + 1);
      connectionCounts.set(edge.targetId, (connectionCounts.get(edge.targetId) || 0) + 1);
    }

    const nodes: GraphNode[] = graph.nodes.map(n => ({
      id: n.id,
      title: n.title,
      depth: n.depth,
      summary: n.summary,
      connections: connectionCounts.get(n.id) || 0,
    }));

    const links: GraphLink[] = graph.edges.map(e => ({
      source: e.sourceId,
      target: e.targetId,
      label: e.label,
    }));

    return { nodes, links };
  }, [graph.nodes, graph.edges]);

  // Configure forces after mount
  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force('charge')?.strength(-300);
      graphRef.current.d3Force('link')?.distance(100);
    }
  }, []);

  // Zoom to fit on data change
  useEffect(() => {
    if (graphRef.current && data.nodes.length > 0) {
      setTimeout(() => graphRef.current?.zoomToFit(400, 60), 200);
    }
  }, [data.nodes.length]);

  const handleZoomToFit = useCallback(() => {
    if (graphRef.current && data.nodes.length > 0) {
      graphRef.current.zoomToFit(400, 60);
    }
  }, [data.nodes.length]);

  const handleNodeClick = useCallback((node: any) => {
    // If we're in linking mode, complete the edge
    if (linkingSourceNodeId) {
      if (node.id !== linkingSourceNodeId) {
        createEdge.mutate({
          sourceId: linkingSourceNodeId,
          targetId: node.id,
          label: '',
        });
      }
      cancelLinking();
      return;
    }

    openChat(node.id);
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 600);
      graphRef.current.zoom(3, 600);
    }
  }, [selectNode, linkingSourceNodeId, cancelLinking, createEdge, openChat]);

  const handleNodeRightClick = useCallback((node: any, event: MouseEvent) => {
    event.preventDefault();
    showContextMenu(event.clientX, event.clientY, node.id, node.x, node.y);
  }, [showContextMenu]);

  const handleBackgroundRightClick = useCallback((event: MouseEvent) => {
    event.preventDefault();
    // Convert screen coords to graph-space coords for potential node placement
    const graphCoords = graphRef.current?.screen2GraphCoords(event.offsetX, event.offsetY);
    showContextMenu(
      event.clientX,
      event.clientY,
      null,
      graphCoords?.x,
      graphCoords?.y,
    );
  }, [showContextMenu]);

  const handleBackgroundClick = useCallback(() => {
    // Close context menu on background click
    hideContextMenu();
    // Cancel linking mode on background click
    if (linkingSourceNodeId) {
      cancelLinking();
    }
  }, [hideContextMenu, linkingSourceNodeId, cancelLinking]);

  const renderNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const radius = Math.max(5, 4 + (node.connections || 0) * 1.5);
    const fontSize = Math.max(10, 12) / globalScale;
    const isSelected = node.id === selectedNodeId;
    const isLinkingSource = node.id === linkingSourceNodeId;

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = isLinkingSource ? '#f59e0b' : nodeColor(node.id);
    ctx.fill();

    // Selected ring
    if (isSelected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }

    // Linking source pulsing ring
    if (isLinkingSource) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2 / globalScale;
      ctx.setLineDash([4 / globalScale, 4 / globalScale]);
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 4 / globalScale, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Label
    const label = node.title.length > 24 ? node.title.slice(0, 22) + '...' : node.title;
    ctx.font = `${isSelected || isLinkingSource ? 'bold ' : ''}${fontSize}px -apple-system, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isSelected || isLinkingSource ? '#ffffff' : '#94a3b8';
    ctx.fillText(label, node.x, node.y + radius + 3 / globalScale);
  }, [selectedNodeId, linkingSourceNodeId]);

  const renderLink = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const sx = link.source.x;
    const sy = link.source.y;
    const tx = link.target.x;
    const ty = link.target.y;

    // Draw the line
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = '#2d3044';
    ctx.lineWidth = 1 / globalScale;
    ctx.stroke();

    // Arrowhead near target node
    const dx = tx - sx;
    const dy = ty - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return; // skip degenerate edges

    const targetRadius = Math.max(5, 4 + (link.target.connections || 0) * 1.5);
    if (dist < targetRadius * 3) return; // skip very short edges

    const angle = Math.atan2(dy, dx);
    const arrowSize = 6 / globalScale;
    // Position arrowhead at the edge of the target node
    const arrowX = tx - Math.cos(angle) * (targetRadius + 2 / globalScale);
    const arrowY = ty - Math.sin(angle) * (targetRadius + 2 / globalScale);

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
      arrowY - arrowSize * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
      arrowY - arrowSize * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fillStyle = '#4a4d63';
    ctx.fill();

    // Label at midpoint (only when zoomed in and label exists)
    if (globalScale > 1.5 && link.label) {
      const midX = (sx + tx) / 2;
      const midY = (sy + ty) / 2;
      const labelFontSize = 10 / globalScale;
      ctx.font = `${labelFontSize}px -apple-system, system-ui, sans-serif`;
      const textWidth = ctx.measureText(link.label).width;
      const padding = 3 / globalScale;

      // Background pill
      ctx.fillStyle = 'rgba(15, 17, 23, 0.8)';
      ctx.beginPath();
      const pillRadius = (labelFontSize / 2 + padding);
      ctx.roundRect(
        midX - textWidth / 2 - padding,
        midY - labelFontSize / 2 - padding,
        textWidth + padding * 2,
        labelFontSize + padding * 2,
        pillRadius,
      );
      ctx.fill();

      // Label text
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(link.label, midX, midY);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full relative overflow-hidden"
      style={{
        background: 'var(--bg-primary)',
        cursor: linkingSourceNodeId ? 'crosshair' : undefined,
      }}
    >
      <ForceGraph2D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={data}
        nodeCanvasObject={renderNode}
        linkCanvasObject={renderLink}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        onBackgroundRightClick={handleBackgroundRightClick}
        onBackgroundClick={handleBackgroundClick}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          const radius = Math.max(5, 4 + (node.connections || 0) * 1.5);
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        backgroundColor="transparent"
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />

      {/* Hint text */}
      {graph.nodes.length <= 1 && !linkingSourceNodeId && (
        <div className="absolute text-muted text-sm" style={{ bottom: 20, left: 20 }}>
          Click a node to see details. Right-click for more options.
        </div>
      )}

      {/* Zoom to fit button */}
      {graph.nodes.length > 1 && (
        <button
          className="absolute btn btn-ghost"
          style={{ top: 12, right: 12, padding: '12px 20px', fontSize: '36px' }}
          onClick={handleZoomToFit}
          title="Zoom to fit all nodes"
        >
          ⤢
        </button>
      )}
    </div>
  );
}
