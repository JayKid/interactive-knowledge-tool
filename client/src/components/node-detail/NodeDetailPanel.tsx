import { useState } from 'react';
import { useAppStore } from '../../stores/app-store.js';
import {
  useSummarizeNode,
  useNodeMessages,
  useNodeResources,
  useCreateResource,
  useDeleteResource,
  useSummarizeResource,
} from '../../api/hooks.js';
import type { Node, GraphWithDetails } from '@knowledge-tool/shared';

interface Props {
  node: Node;
  graph: GraphWithDetails;
}

export function NodeDetailPanel({ node, graph }: Props) {
  const { openChat } = useAppStore();
  const summarize = useSummarizeNode();
  const { data: messages } = useNodeMessages(node.id);
  const { data: resources } = useNodeResources(node.id);
  const createResource = useCreateResource(node.id);
  const deleteResource = useDeleteResource(node.id);
  const summarizeResource = useSummarizeResource(node.id);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const connectedEdges = graph.edges.filter(e => e.sourceId === node.id || e.targetId === node.id);
  const connectedNodes = connectedEdges.map(e => {
    const otherId = e.sourceId === node.id ? e.targetId : e.sourceId;
    const otherNode = graph.nodes.find(n => n.id === otherId);
    return { edge: e, node: otherNode };
  }).filter(c => c.node);

  const messageCount = messages?.filter(m => m.role !== 'system').length || 0;

  const handleAddResource = async () => {
    if (!newUrl.trim()) return;
    await createResource.mutateAsync({ url: newUrl.trim(), title: newTitle.trim() || undefined });
    setNewUrl('');
    setNewTitle('');
    setShowAddForm(false);
  };

  return (
    <div className="flex flex-col h-full overflow-auto p-4 gap-4">
      {/* Summary section */}
      <div>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <h4 className="text-sm font-semibold text-secondary">Summary</h4>
          <button
            className="btn btn-ghost btn-sm text-xs"
            onClick={() => summarize.mutate(node.id)}
            disabled={summarize.isPending || messageCount < 2}
            title={messageCount < 2 ? 'Need at least 2 messages to generate a summary' : 'Regenerate summary'}
          >
            {summarize.isPending ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
        {node.summary ? (
          <p className="text-sm" style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {node.summary}
          </p>
        ) : (
          <p className="text-muted text-sm">
            No summary yet. Start a conversation to generate one.
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-muted">
        <span>Depth: {node.depth}</span>
        <span>{messageCount} messages</span>
        <span>{connectedNodes.length} connections</span>
      </div>

      {/* Connected nodes */}
      {connectedNodes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-secondary" style={{ marginBottom: 8 }}>
            Connected Topics
          </h4>
          <div className="flex flex-col gap-1">
            {connectedNodes.map(({ edge, node: connNode }) => (
              <button
                key={edge.id}
                className="btn btn-ghost btn-sm"
                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                onClick={() => openChat(connNode!.id)}
              >
                <span className="font-medium">{connNode!.title}</span>
                {edge.label && (
                  <span className="text-xs text-muted" style={{ marginLeft: 8 }}>
                    {edge.label}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resources */}
      <div>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <h4 className="text-sm font-semibold text-secondary">Resources</h4>
          <button
            className="btn btn-ghost btn-sm text-xs"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {/* Add resource form */}
        {showAddForm && (
          <div className="flex flex-col gap-2" style={{ marginBottom: 12 }}>
            <input
              className="input"
              placeholder="URL (required)"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddResource()}
              autoFocus
            />
            <input
              className="input"
              placeholder="Title (optional, auto-detected)"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddResource()}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddResource}
              disabled={!newUrl.trim() || createResource.isPending}
            >
              {createResource.isPending ? 'Adding...' : 'Add Resource'}
            </button>
          </div>
        )}

        {/* Resource list */}
        {resources && resources.length > 0 ? (
          <div className="flex flex-col gap-2">
            {resources.map(resource => (
              <div key={resource.id} className="resource-item">
                <div className="flex items-center justify-between" style={{ gap: 8 }}>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm truncate"
                    style={{ flex: 1, minWidth: 0 }}
                    title={resource.url}
                  >
                    {resource.title || resource.url}
                  </a>
                  <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                    {resource.status === 'pending' && (
                      <button
                        className="btn btn-ghost btn-sm text-xs"
                        onClick={() => summarizeResource.mutate(resource.id)}
                        disabled={summarizeResource.isPending}
                        title="Fetch and summarize this resource"
                      >
                        {summarizeResource.isPending ? '...' : 'Summarize'}
                      </button>
                    )}
                    {resource.status === 'summarized' && (
                      <span className="text-xs" style={{ color: 'var(--success)' }}>
                        ✓
                      </span>
                    )}
                    {resource.status === 'error' && (
                      <button
                        className="btn btn-ghost btn-sm text-xs"
                        onClick={() => summarizeResource.mutate(resource.id)}
                        disabled={summarizeResource.isPending}
                        title="Retry summarization"
                        style={{ color: 'var(--error)' }}
                      >
                        {summarizeResource.isPending ? '...' : 'Retry'}
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-sm text-xs"
                      onClick={() => deleteResource.mutate(resource.id)}
                      style={{ color: 'var(--text-muted)' }}
                      title="Remove resource"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {resource.notes && (
                  <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                    {resource.notes.length > 150
                      ? resource.notes.slice(0, 150) + '...'
                      : resource.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          !showAddForm && (
            <p className="text-muted text-sm">
              No resources yet. Add links to related content.
            </p>
          )
        )}
      </div>

      {/* Actions */}
      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <button
          className="btn btn-primary w-full"
          onClick={() => openChat(node.id)}
        >
          Continue Exploring
        </button>
      </div>
    </div>
  );
}
