import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGraphs, useCreateGraph, useDeleteGraph } from '../../api/hooks.js';
import { NewGraphDialog } from './NewGraphDialog.js';

export function GraphList() {
  const navigate = useNavigate();
  const { data: graphs, isLoading } = useGraphs();
  const createGraph = useCreateGraph();
  const deleteGraph = useDeleteGraph();
  const [showNewDialog, setShowNewDialog] = useState(false);

  const handleCreate = async (title: string, initialTopic: string) => {
    const result = await createGraph.mutateAsync({ title, initialTopic });
    setShowNewDialog(false);
    navigate(`/graph/${result.graph.id}`);
  };

  const handleDelete = (e: React.MouseEvent, graphId: string) => {
    e.stopPropagation();
    if (confirm('Delete this knowledge graph? This cannot be undone.')) {
      deleteGraph.mutate(graphId);
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '40px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Knowledge Graphs</h1>
            <p className="text-secondary" style={{ marginTop: 4 }}>
              Explore topics through conversation and build your knowledge map
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNewDialog(true)}>
            + New Graph
          </button>
        </div>

        {isLoading ? (
          <p className="text-muted">Loading...</p>
        ) : !graphs || graphs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p className="text-secondary" style={{ fontSize: '1.1rem', marginBottom: 16 }}>
              No knowledge graphs yet
            </p>
            <p className="text-muted" style={{ marginBottom: 24 }}>
              Start by creating your first graph and exploring a topic
            </p>
            <button className="btn btn-primary" onClick={() => setShowNewDialog(true)}>
              Create Your First Graph
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {graphs.map(graph => (
              <div
                key={graph.id}
                className="card card-clickable"
                onClick={() => navigate(`/graph/${graph.id}`)}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <h3 className="font-semibold truncate" style={{ flex: 1 }}>{graph.title}</h3>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={(e) => handleDelete(e, graph.id)}
                    title="Delete graph"
                  >
                    x
                  </button>
                </div>
                {graph.description && (
                  <p className="text-secondary text-sm truncate" style={{ marginBottom: 8 }}>
                    {graph.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span>{graph.nodeCount} {graph.nodeCount === 1 ? 'node' : 'nodes'}</span>
                  <span>Updated {new Date(graph.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewDialog && (
        <NewGraphDialog
          onClose={() => setShowNewDialog(false)}
          onCreate={handleCreate}
          isCreating={createGraph.isPending}
        />
      )}
    </div>
  );
}
