import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/app-store.js';
import { useCreateFreeNode, useCreateNode, useCreateEdge } from '../../api/hooks.js';
import type { GraphWithDetails } from '@knowledge-tool/shared';

interface Props {
  graph: GraphWithDetails;
}

type MenuAction = 'add-here' | 'add-child' | 'add-parent' | 'link' | null;

export function GraphContextMenu({ graph }: Props) {
  const { contextMenu, hideContextMenu, startLinking, openChat } = useAppStore();
  const [activeAction, setActiveAction] = useState<MenuAction>(null);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const createFreeNode = useCreateFreeNode(graph.id);
  const createNode = useCreateNode(graph.id);
  const createEdge = useCreateEdge(graph.id);

  // Reset state when menu closes
  useEffect(() => {
    if (!contextMenu) {
      setActiveAction(null);
      setTitle('');
    }
  }, [contextMenu]);

  // Focus input when action is selected
  useEffect(() => {
    if (activeAction && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeAction]);

  // Close menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        hideContextMenu();
      }
    };
    if (contextMenu) {
      // Delay to avoid the right-click event itself closing the menu
      setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [contextMenu, hideContextMenu]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideContextMenu();
      }
    };
    if (contextMenu) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [contextMenu, hideContextMenu]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !contextMenu) return;

    try {
      if (activeAction === 'add-here') {
        // Free-floating node
        await createFreeNode.mutateAsync({ title: title.trim() });
      } else if (activeAction === 'add-child' && contextMenu.nodeId) {
        // New child node connected FROM the clicked node
        await createNode.mutateAsync({
          title: title.trim(),
          parentNodeId: contextMenu.nodeId,
          edgeLabel: '',
        });
      } else if (activeAction === 'add-parent' && contextMenu.nodeId) {
        // New parent node: create free node, then edge FROM new node TO clicked node
        const result = await createFreeNode.mutateAsync({ title: title.trim() });
        await createEdge.mutateAsync({
          sourceId: result.node.id,
          targetId: contextMenu.nodeId,
          label: '',
        });
      }
    } catch (err) {
      console.error('Failed to create node:', err);
    }

    hideContextMenu();
  }, [title, contextMenu, activeAction, createFreeNode, createNode, createEdge, hideContextMenu]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      if (activeAction) {
        setActiveAction(null);
        setTitle('');
      } else {
        hideContextMenu();
      }
    }
  };

  if (!contextMenu) return null;

  const isOnNode = !!contextMenu.nodeId;
  const nodeTitle = isOnNode
    ? graph.nodes.find(n => n.id === contextMenu.nodeId)?.title || 'this node'
    : null;

  // Show inline input for node creation
  if (activeAction === 'add-here' || activeAction === 'add-child' || activeAction === 'add-parent') {
    const label = activeAction === 'add-here'
      ? 'New node title:'
      : activeAction === 'add-child'
        ? `New child of "${nodeTitle}":`
        : `New parent of "${nodeTitle}":`;

    return (
      <div
        ref={menuRef}
        className="context-menu"
        style={{
          left: contextMenu.x,
          top: contextMenu.y,
        }}
      >
        <div style={{ padding: '8px 12px' }}>
          <div className="text-xs text-muted" style={{ marginBottom: 6 }}>{label}</div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="input"
              type="text"
              placeholder="Enter title..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ fontSize: '0.8125rem' }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSubmit}
              disabled={!title.trim()}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show menu items
  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        left: contextMenu.x,
        top: contextMenu.y,
      }}
    >
      {!isOnNode ? (
        // Right-click on empty space
        <button
          className="context-menu-item"
          onClick={() => setActiveAction('add-here')}
        >
          <span className="context-menu-icon">+</span>
          Add node here
        </button>
      ) : (
        // Right-click on a node
        <>
          <button
            className="context-menu-item"
            onClick={() => setActiveAction('add-child')}
          >
            <span className="context-menu-icon">↓</span>
            Add connected node...
          </button>
          <button
            className="context-menu-item"
            onClick={() => setActiveAction('add-parent')}
          >
            <span className="context-menu-icon">↑</span>
            Add parent node...
          </button>
          <div className="context-menu-separator" />
          <button
            className="context-menu-item"
            onClick={() => {
              startLinking(contextMenu.nodeId!);
            }}
          >
            <span className="context-menu-icon">⟶</span>
            Link to another node...
          </button>
          <div className="context-menu-separator" />
          <button
            className="context-menu-item"
            onClick={() => {
              openChat(contextMenu.nodeId!);
              hideContextMenu();
            }}
          >
            <span className="context-menu-icon">💬</span>
            Open chat
          </button>
        </>
      )}
    </div>
  );
}
