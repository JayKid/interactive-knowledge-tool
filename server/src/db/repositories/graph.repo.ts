import { getDb } from '../connection.js';
import type { Graph, GraphListItem, GraphWithDetails, Node, Edge } from '@knowledge-tool/shared';

interface GraphRow {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface GraphListRow extends GraphRow {
  node_count: number;
}

function rowToGraph(row: GraphRow): Graph {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const graphRepo = {
  list(): GraphListItem[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT g.*, COUNT(n.id) as node_count
      FROM graphs g
      LEFT JOIN nodes n ON n.graph_id = g.id
      GROUP BY g.id
      ORDER BY g.updated_at DESC
    `).all() as GraphListRow[];
    return rows.map(r => ({ ...rowToGraph(r), nodeCount: r.node_count }));
  },

  getById(id: string): Graph | undefined {
    const db = getDb();
    const row = db.prepare('SELECT * FROM graphs WHERE id = ?').get(id) as GraphRow | undefined;
    return row ? rowToGraph(row) : undefined;
  },

  getWithDetails(id: string): GraphWithDetails | undefined {
    const db = getDb();
    const graphRow = db.prepare('SELECT * FROM graphs WHERE id = ?').get(id) as GraphRow | undefined;
    if (!graphRow) return undefined;

    const nodeRows = db.prepare('SELECT * FROM nodes WHERE graph_id = ? ORDER BY created_at').all(id) as any[];
    const edgeRows = db.prepare('SELECT * FROM edges WHERE graph_id = ?').all(id) as any[];

    const nodes: Node[] = nodeRows.map(r => ({
      id: r.id,
      graphId: r.graph_id,
      title: r.title,
      summary: r.summary,
      status: r.status,
      depth: r.depth,
      x: r.x,
      y: r.y,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    const edges: Edge[] = edgeRows.map(r => ({
      id: r.id,
      graphId: r.graph_id,
      sourceId: r.source_id,
      targetId: r.target_id,
      label: r.label,
      createdAt: r.created_at,
    }));

    return { ...rowToGraph(graphRow), nodes, edges };
  },

  create(id: string, title: string, description: string = ''): Graph {
    const db = getDb();
    db.prepare('INSERT INTO graphs (id, title, description) VALUES (?, ?, ?)').run(id, title, description);
    return this.getById(id)!;
  },

  update(id: string, fields: { title?: string; description?: string }): Graph | undefined {
    const db = getDb();
    const sets: string[] = ["updated_at = datetime('now')"];
    const params: any[] = [];
    if (fields.title !== undefined) { sets.push('title = ?'); params.push(fields.title); }
    if (fields.description !== undefined) { sets.push('description = ?'); params.push(fields.description); }
    params.push(id);
    db.prepare(`UPDATE graphs SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.getById(id);
  },

  delete(id: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM graphs WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
