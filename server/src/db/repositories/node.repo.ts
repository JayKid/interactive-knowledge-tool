import { getDb } from '../connection.js';
import type { Node, SearchResult } from '@knowledge-tool/shared';

interface NodeRow {
  id: string;
  graph_id: string;
  title: string;
  summary: string;
  status: string;
  depth: number;
  x: number | null;
  y: number | null;
  created_at: string;
  updated_at: string;
}

function rowToNode(row: NodeRow): Node {
  return {
    id: row.id,
    graphId: row.graph_id,
    title: row.title,
    summary: row.summary,
    status: row.status as 'active' | 'archived',
    depth: row.depth,
    x: row.x,
    y: row.y,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const nodeRepo = {
  getById(id: string): Node | undefined {
    const db = getDb();
    const row = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id) as NodeRow | undefined;
    return row ? rowToNode(row) : undefined;
  },

  listByGraph(graphId: string): Node[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM nodes WHERE graph_id = ? ORDER BY created_at').all(graphId) as NodeRow[];
    return rows.map(rowToNode);
  },

  listTitlesByGraph(graphId: string): string[] {
    const db = getDb();
    const rows = db.prepare('SELECT title FROM nodes WHERE graph_id = ?').all(graphId) as { title: string }[];
    return rows.map(r => r.title);
  },

  create(id: string, graphId: string, title: string, depth: number = 0): Node {
    const db = getDb();
    db.prepare('INSERT INTO nodes (id, graph_id, title, depth) VALUES (?, ?, ?, ?)').run(id, graphId, title, depth);
    return this.getById(id)!;
  },

  update(id: string, fields: { title?: string; summary?: string; x?: number | null; y?: number | null }): Node | undefined {
    const db = getDb();
    const sets: string[] = ["updated_at = datetime('now')"];
    const params: any[] = [];
    if (fields.title !== undefined) { sets.push('title = ?'); params.push(fields.title); }
    if (fields.summary !== undefined) { sets.push('summary = ?'); params.push(fields.summary); }
    if (fields.x !== undefined) { sets.push('x = ?'); params.push(fields.x); }
    if (fields.y !== undefined) { sets.push('y = ?'); params.push(fields.y); }
    params.push(id);
    db.prepare(`UPDATE nodes SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.getById(id);
  },

  delete(id: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM nodes WHERE id = ?').run(id);
    return result.changes > 0;
  },

  searchFTS(query: string, graphId?: string, limit: number = 20): SearchResult[] {
    const db = getDb();
    // Append * for prefix matching so partial words work (e.g. "stoic" matches "stoicism")
    const ftsQuery = query.split(/\s+/).map(t => `"${t}"*`).join(' ');

    // Search node titles and summaries
    const nodesSql = graphId
      ? `SELECT f.node_id, f.graph_id, f.title as node_title, f.summary as node_summary,
                g.title as graph_title, bm25(nodes_fts) as rank
         FROM nodes_fts f
         JOIN graphs g ON g.id = f.graph_id
         WHERE nodes_fts MATCH ? AND f.graph_id = ?
         ORDER BY rank
         LIMIT ?`
      : `SELECT f.node_id, f.graph_id, f.title as node_title, f.summary as node_summary,
                g.title as graph_title, bm25(nodes_fts) as rank
         FROM nodes_fts f
         JOIN graphs g ON g.id = f.graph_id
         WHERE nodes_fts MATCH ?
         ORDER BY rank
         LIMIT ?`;

    // Search message content (returns the parent node)
    const messagesSql = graphId
      ? `SELECT DISTINCT n.id as node_id, n.graph_id, n.title as node_title, n.summary as node_summary,
                g.title as graph_title
         FROM messages_fts mf
         JOIN nodes n ON n.id = mf.node_id
         JOIN graphs g ON g.id = n.graph_id
         WHERE messages_fts MATCH ? AND n.graph_id = ?
         LIMIT ?`
      : `SELECT DISTINCT n.id as node_id, n.graph_id, n.title as node_title, n.summary as node_summary,
                g.title as graph_title
         FROM messages_fts mf
         JOIN nodes n ON n.id = mf.node_id
         JOIN graphs g ON g.id = n.graph_id
         WHERE messages_fts MATCH ?
         LIMIT ?`;

    try {
      const nodesParams = graphId ? [ftsQuery, graphId, limit] : [ftsQuery, limit];
      const msgsParams = graphId ? [ftsQuery, graphId, limit] : [ftsQuery, limit];

      const nodeRows = db.prepare(nodesSql).all(...nodesParams) as any[];
      let msgRows: any[] = [];
      try {
        msgRows = db.prepare(messagesSql).all(...msgsParams) as any[];
      } catch {
        // messages_fts might not exist yet on older DBs
      }

      // Merge and deduplicate, node title/summary matches first
      const seen = new Set<string>();
      const results: SearchResult[] = [];

      for (const r of nodeRows) {
        if (!seen.has(r.node_id)) {
          seen.add(r.node_id);
          results.push({
            nodeId: r.node_id, graphId: r.graph_id, graphTitle: r.graph_title,
            nodeTitle: r.node_title, nodeSummary: r.node_summary, similarity: 0,
          });
        }
      }
      for (const r of msgRows) {
        if (!seen.has(r.node_id)) {
          seen.add(r.node_id);
          results.push({
            nodeId: r.node_id, graphId: r.graph_id, graphTitle: r.graph_title,
            nodeTitle: r.node_title, nodeSummary: r.node_summary, similarity: 0,
          });
        }
      }

      return results.slice(0, limit);
    } catch {
      // FTS query syntax error (e.g. special characters) — fall back to empty
      return [];
    }
  },
};
