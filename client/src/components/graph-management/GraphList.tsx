import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGraphs, useCreateGraph, useDeleteGraph, useImportGraph } from '../../api/hooks.js';
import { api } from '../../api/client.js';
import { NewGraphDialog } from './NewGraphDialog.js';

export function GraphList() {
  const navigate = useNavigate();
  const { data: graphs, isLoading } = useGraphs();
  const createGraph = useCreateGraph();
  const deleteGraph = useDeleteGraph();
  const importGraph = useImportGraph();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExport = async (e: React.MouseEvent, graphId: string, graphTitle: string) => {
    e.stopPropagation();
    try {
      const data = await api.exportGraph(graphId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${graphTitle.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'graph'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await importGraph.mutateAsync(data);
      navigate(`/graph/${result.graph.id}`);
    } catch (err: any) {
      console.error('Import failed:', err);
      alert(`Import failed: ${err.message}`);
    }

    // Reset file input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 'clamp(16px, 5vw, 40px)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Knowledge Graphs</h1>
            <p className="text-secondary" style={{ marginTop: 4 }}>
              Explore topics through conversation and build your knowledge map
            </p>
          </div>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleImportClick} disabled={importGraph.isPending}>
              {importGraph.isPending ? 'Importing...' : '↑ Import'}
            </button>
            <button className="btn btn-primary" onClick={() => setShowNewDialog(true)}>
              + New Graph
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {isLoading ? (
          <p className="text-muted">Loading...</p>
        ) : !graphs || graphs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p className="text-secondary" style={{ fontSize: '1.1rem', marginBottom: 16 }}>
              No knowledge graphs yet
            </p>
            <p className="text-muted" style={{ marginBottom: 24 }}>
              Start by creating your first graph or importing an existing one
            </p>
            <div className="flex gap-2 justify-center">
              <button className="btn btn-secondary" onClick={handleImportClick}>
                ↑ Import Graph
              </button>
              <button className="btn btn-primary" onClick={() => setShowNewDialog(true)}>
                Create Your First Graph
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 16 }}>
            {graphs.map(graph => (
              <div
                key={graph.id}
                className="card card-clickable"
                onClick={() => navigate(`/graph/${graph.id}`)}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <h3 className="font-semibold truncate" style={{ flex: 1 }}>{graph.title}</h3>
                  <div className="flex gap-1">
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={(e) => handleExport(e, graph.id, graph.title)}
                      title="Export graph"
                    >
                      ↓
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={(e) => handleDelete(e, graph.id)}
                      title="Delete graph"
                    >
                      x
                    </button>
                  </div>
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
