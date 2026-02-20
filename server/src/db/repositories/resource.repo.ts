import { getDb } from '../connection.js';
import type { Resource } from '@knowledge-tool/shared';

interface ResourceRow {
  id: string;
  node_id: string;
  url: string;
  title: string;
  notes: string;
  status: string;
  created_at: string;
}

function rowToResource(row: ResourceRow): Resource {
  return {
    id: row.id,
    nodeId: row.node_id,
    url: row.url,
    title: row.title,
    notes: row.notes,
    status: row.status as Resource['status'],
    createdAt: row.created_at,
  };
}

export const resourceRepo = {
  listByNode(nodeId: string): Resource[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM resources WHERE node_id = ? ORDER BY created_at DESC'
    ).all(nodeId) as ResourceRow[];
    return rows.map(rowToResource);
  },

  getById(id: string): Resource | undefined {
    const db = getDb();
    const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(id) as ResourceRow | undefined;
    return row ? rowToResource(row) : undefined;
  },

  create(id: string, nodeId: string, url: string, title: string = '', notes: string = ''): Resource {
    const db = getDb();
    db.prepare(
      'INSERT INTO resources (id, node_id, url, title, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(id, nodeId, url, title, notes);
    return this.getById(id)!;
  },

  update(id: string, fields: { title?: string; notes?: string; status?: Resource['status'] }): Resource | undefined {
    const db = getDb();
    const sets: string[] = [];
    const params: unknown[] = [];

    if (fields.title !== undefined) { sets.push('title = ?'); params.push(fields.title); }
    if (fields.notes !== undefined) { sets.push('notes = ?'); params.push(fields.notes); }
    if (fields.status !== undefined) { sets.push('status = ?'); params.push(fields.status); }

    if (sets.length === 0) return this.getById(id);

    params.push(id);
    db.prepare(`UPDATE resources SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.getById(id);
  },

  delete(id: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM resources WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
