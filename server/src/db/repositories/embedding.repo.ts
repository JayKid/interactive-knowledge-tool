import { getDb } from '../connection.js';

interface EmbeddingRow {
  id: string;
  node_id: string;
  content_type: string;
  text_hash: string;
  vector: Buffer;
  dimensions: number;
  created_at: string;
}

export interface EmbeddingRecord {
  id: string;
  nodeId: string;
  contentType: string;
  textHash: string;
  vector: Buffer;
  dimensions: number;
}

export interface EmbeddingWithContext extends EmbeddingRecord {
  graphId: string;
  graphTitle: string;
  nodeTitle: string;
  nodeSummary: string;
}

export const embeddingRepo = {
  findByNodeAndType(nodeId: string, contentType: string): EmbeddingRecord | undefined {
    const db = getDb();
    const row = db.prepare('SELECT * FROM embeddings WHERE node_id = ? AND content_type = ?').get(nodeId, contentType) as EmbeddingRow | undefined;
    if (!row) return undefined;
    return {
      id: row.id,
      nodeId: row.node_id,
      contentType: row.content_type,
      textHash: row.text_hash,
      vector: row.vector,
      dimensions: row.dimensions,
    };
  },

  upsert(id: string, nodeId: string, contentType: string, textHash: string, vector: Buffer, dimensions: number): void {
    const db = getDb();
    db.prepare(`
      INSERT INTO embeddings (id, node_id, content_type, text_hash, vector, dimensions)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(node_id, content_type) DO UPDATE SET
        text_hash = excluded.text_hash,
        vector = excluded.vector,
        dimensions = excluded.dimensions,
        created_at = datetime('now')
    `).run(id, nodeId, contentType, textHash, vector, dimensions);
  },

  findAll(): EmbeddingWithContext[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT e.*, n.graph_id, n.title as node_title, n.summary as node_summary, g.title as graph_title
      FROM embeddings e
      JOIN nodes n ON n.id = e.node_id
      JOIN graphs g ON g.id = n.graph_id
    `).all() as any[];
    return rows.map(r => ({
      id: r.id,
      nodeId: r.node_id,
      contentType: r.content_type,
      textHash: r.text_hash,
      vector: r.vector,
      dimensions: r.dimensions,
      graphId: r.graph_id,
      graphTitle: r.graph_title,
      nodeTitle: r.node_title,
      nodeSummary: r.node_summary,
    }));
  },

  findByGraph(graphId: string): EmbeddingWithContext[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT e.*, n.graph_id, n.title as node_title, n.summary as node_summary, g.title as graph_title
      FROM embeddings e
      JOIN nodes n ON n.id = e.node_id
      JOIN graphs g ON g.id = n.graph_id
      WHERE n.graph_id = ?
    `).all(graphId) as any[];
    return rows.map(r => ({
      id: r.id,
      nodeId: r.node_id,
      contentType: r.content_type,
      textHash: r.text_hash,
      vector: r.vector,
      dimensions: r.dimensions,
      graphId: r.graph_id,
      graphTitle: r.graph_title,
      nodeTitle: r.node_title,
      nodeSummary: r.node_summary,
    }));
  },
};
