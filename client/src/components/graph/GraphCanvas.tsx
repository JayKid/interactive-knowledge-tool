import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useAppStore } from '../../stores/app-store.js';
import { useCreateEdge } from '../../api/hooks.js';
import { depthToColor } from '../../utils/colors.js';
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
    linkingSourceNodeId, cancelLinking,
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

    selectNode(node.id);
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 600);
      graphRef.current.zoom(3, 600);
    }
  }, [selectNode, linkingSourceNodeId, cancelLinking, createEdge]);

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
    ctx.fillStyle = isLinkingSource ? '#f59e0b' : depthToColor(node.depth);
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
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.strokeStyle = '#2d3044';
    ctx.lineWidth = 1 / globalScale;
    ctx.stroke();
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
    </div>
  );
}
