import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/app-store.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { useSearch, useCreateFreeNode, useCreateNode, useCreateEdge, useUpdateGraph } from '../../api/hooks.js';
import type { GraphWithDetails, SearchResult } from '@knowledge-tool/shared';

interface Props {
  graph: GraphWithDetails;
}

export function TopBar({ graph }: Props) {
  const navigate = useNavigate();
  const { openChat, openCommandPalette } = useAppStore();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { data: searchResults, isFetching } = useSearch(debouncedQuery, graph.id);

  // Add Node dialog state
  const [showAddNode, setShowAddNode] = useState(false);
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [connectToNodeId, setConnectToNodeId] = useState<string>('');
  const [edgeDirection, setEdgeDirection] = useState<'child' | 'parent'>('child');
  const addNodeRef = useRef<HTMLDivElement>(null);
  const addNodeInputRef = useRef<HTMLInputElement>(null);

  const createFreeNode = useCreateFreeNode(graph.id);
  const createNode = useCreateNode(graph.id);
  const createEdge = useCreateEdge(graph.id);
  const updateGraph = useUpdateGraph();

  // Inline title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close results on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as HTMLElement)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close add-node on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (addNodeRef.current && !addNodeRef.current.contains(e.target as HTMLElement)) {
        setShowAddNode(false);
      }
    };
    if (showAddNode) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showAddNode]);

  // Focus input when add-node opens
  useEffect(() => {
    if (showAddNode && addNodeInputRef.current) {
      addNodeInputRef.current.focus();
    }
  }, [showAddNode]);

  // Focus title input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const saveTitle = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== graph.title) {
      updateGraph.mutate({ graphId: graph.id, data: { title: trimmed } });
    }
    setIsEditingTitle(false);
  }, [editTitle, graph.title, graph.id, updateGraph]);

  const cancelTitleEdit = useCallback(() => {
    setIsEditingTitle(false);
  }, []);

  const handleResultClick = useCallback((result: SearchResult) => {
    if (result.graphId !== graph.id) {
      navigate(`/graph/${result.graphId}`);
    }
    openChat(result.nodeId);
    setShowResults(false);
    setSearchQuery('');
    setDebouncedQuery('');
  }, [graph.id, navigate, openChat]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Immediately trigger search, bypassing debounce
      setDebouncedQuery(searchQuery);
      setShowResults(true);
    }
    if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const handleAddNode = useCallback(async () => {
    if (!newNodeTitle.trim()) return;

    try {
      if (connectToNodeId) {
        if (edgeDirection === 'child') {
          // Create as child of selected node
          await createNode.mutateAsync({
            title: newNodeTitle.trim(),
            parentNodeId: connectToNodeId,
            edgeLabel: '',
          });
        } else {
          // Create free node, then link selected node as child (reverse edge)
          const result = await createFreeNode.mutateAsync({ title: newNodeTitle.trim() });
          // Create edge from new node → selected node
          await createEdge.mutateAsync({
            sourceId: result.node.id,
            targetId: connectToNodeId,
            label: '',
          });
        }
      } else {
        // Free-floating node
        await createFreeNode.mutateAsync({ title: newNodeTitle.trim() });
      }
    } catch (err) {
      console.error('Failed to create node:', err);
    }

    setNewNodeTitle('');
    setConnectToNodeId('');
    setEdgeDirection('child');
    setShowAddNode(false);
  }, [newNodeTitle, connectToNodeId, edgeDirection, createNode, createFreeNode, createEdge, graph.id]);

  const handleAddNodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNode();
    }
    if (e.key === 'Escape') {
      setShowAddNode(false);
    }
  };

  const hasQuery = debouncedQuery.length >= 2;
  const hasResults = searchResults && searchResults.length > 0;
  const showDropdown = showResults && hasQuery;

  return (
    <div className="flex items-center gap-4 p-3" style={{
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      height: 52,
    }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
        &larr; Graphs
      </button>

      {isEditingTitle ? (
        <input
          ref={titleInputRef}
          className="font-semibold"
          type="text"
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') saveTitle();
            if (e.key === 'Escape') cancelTitleEdit();
          }}
          onBlur={saveTitle}
          style={{
            flex: 1,
            fontSize: 'inherit',
            background: 'var(--bg-primary)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius)',
            padding: '2px 8px',
            color: 'var(--text-primary)',
            outline: 'none',
            minWidth: 0,
          }}
        />
      ) : (
        <h2
          className="font-semibold truncate"
          style={{ flex: 1, cursor: 'pointer' }}
          onDoubleClick={() => {
            setEditTitle(graph.title);
            setIsEditingTitle(true);
          }}
          title="Double-click to rename"
        >
          {graph.title}
        </h2>
      )}

      {/* Add Node button */}
      <div ref={addNodeRef} className="topbar-add-node" style={{ position: 'relative' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowAddNode(!showAddNode)}
        >
          + Add Node
        </button>

        {showAddNode && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 16,
            width: 300,
            zIndex: 40,
          }}>
            <div className="text-sm font-medium" style={{ marginBottom: 8 }}>New Node</div>

            <input
              ref={addNodeInputRef}
              className="input"
              type="text"
              placeholder="Node title..."
              value={newNodeTitle}
              onChange={e => setNewNodeTitle(e.target.value)}
              onKeyDown={handleAddNodeKeyDown}
              style={{ marginBottom: 8 }}
            />

            <div className="text-xs text-muted" style={{ marginBottom: 4 }}>
              Connect to (optional):
            </div>
            <select
              className="input"
              value={connectToNodeId}
              onChange={e => setConnectToNodeId(e.target.value)}
              style={{ marginBottom: 8 }}
            >
              <option value="">None (free-floating)</option>
              {graph.nodes.map(n => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>

            {connectToNodeId && (
              <div style={{ marginBottom: 8 }}>
                <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Direction:</div>
                <div className="flex gap-2">
                  <button
                    className={`btn btn-sm ${edgeDirection === 'child' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setEdgeDirection('child')}
                    style={{ flex: 1 }}
                  >
                    ↓ As child
                  </button>
                  <button
                    className={`btn btn-sm ${edgeDirection === 'parent' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setEdgeDirection('parent')}
                    style={{ flex: 1 }}
                  >
                    ↑ As parent
                  </button>
                </div>
              </div>
            )}

            <button
              className="btn btn-primary btn-sm w-full"
              onClick={handleAddNode}
              disabled={!newNodeTitle.trim()}
            >
              Create Node
            </button>
          </div>
        )}
      </div>

      {isMobile && (
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={openCommandPalette}
          title="Search (⌘K)"
          style={{ fontSize: 16 }}
        >
          🔍
        </button>
      )}

      <div ref={searchRef} className="topbar-search" style={{ position: 'relative', width: 280 }}>
        <input
          className="input"
          type="text"
          placeholder="Search knowledge..."
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleKeyDown}
          style={{ paddingRight: 32 }}
        />
        {showDropdown && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            maxHeight: 300,
            overflow: 'auto',
            zIndex: 40,
          }}>
            {isFetching ? (
              <div className="text-sm text-muted" style={{ padding: '12px', textAlign: 'center' }}>
                Searching...
              </div>
            ) : hasResults ? (
              searchResults.map(result => (
                <button
                  key={result.nodeId}
                  className="w-full text-sm"
                  style={{
                    display: 'block',
                    padding: '8px 12px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                  }}
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <div className="font-medium">{result.nodeTitle}</div>
                  <div className="text-xs text-muted truncate" style={{ marginTop: 2 }}>
                    {result.nodeSummary || 'No summary yet'}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-sm text-muted" style={{ padding: '12px', textAlign: 'center' }}>
                No results found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
