import { getDb } from '../connection.js';
import type { Edge } from '@knowledge-tool/shared';

interface EdgeRow {
  id: string;
  graph_id: string;
  source_id: string;
  target_id: string;
  label: string;
  created_at: string;
}

function rowToEdge(row: EdgeRow): Edge {
  return {
    id: row.id,
    graphId: row.graph_id,
    sourceId: row.source_id,
    targetId: row.target_id,
    label: row.label,
    createdAt: row.created_at,
  };
}

export const edgeRepo = {
  getById(id: string): Edge | undefined {
    const db = getDb();
    const row = db.prepare('SELECT * FROM edges WHERE id = ?').get(id) as EdgeRow | undefined;
    return row ? rowToEdge(row) : undefined;
  },

  listByGraph(graphId: string): Edge[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM edges WHERE graph_id = ?').all(graphId) as EdgeRow[];
    return rows.map(rowToEdge);
  },

  create(id: string, graphId: string, sourceId: string, targetId: string, label: string = ''): Edge {
    const db = getDb();
    db.prepare('INSERT INTO edges (id, graph_id, source_id, target_id, label) VALUES (?, ?, ?, ?, ?)').run(id, graphId, sourceId, targetId, label);
    return this.getById(id)!;
  },

  delete(id: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM edges WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
