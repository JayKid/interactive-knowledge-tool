import { getDb } from '../connection.js';
import type { Message, MessageMetadata } from '@knowledge-tool/shared';

interface MessageRow {
  id: string;
  node_id: string;
  role: string;
  content: string;
  metadata: string;
  created_at: string;
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    nodeId: row.node_id,
    role: row.role as Message['role'],
    content: row.content,
    metadata: JSON.parse(row.metadata) as MessageMetadata,
    createdAt: row.created_at,
  };
}

export const messageRepo = {
  listByNode(nodeId: string): Message[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM messages WHERE node_id = ? ORDER BY created_at ASC').all(nodeId) as MessageRow[];
    return rows.map(rowToMessage);
  },

  countByNode(nodeId: string): number {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM messages WHERE node_id = ?').get(nodeId) as { count: number };
    return row.count;
  },

  getByIds(ids: string[]): Message[] {
    if (ids.length === 0) return [];
    const db = getDb();
    const placeholders = ids.map(() => '?').join(',');
    const rows = db.prepare(`SELECT * FROM messages WHERE id IN (${placeholders}) ORDER BY created_at ASC`).all(...ids) as MessageRow[];
    return rows.map(rowToMessage);
  },

  create(id: string, nodeId: string, role: Message['role'], content: string, metadata: MessageMetadata = {}, createdAt?: string): Message {
    const db = getDb();
    if (createdAt) {
      db.prepare('INSERT INTO messages (id, node_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        id, nodeId, role, content, JSON.stringify(metadata), createdAt
      );
    } else {
      db.prepare('INSERT INTO messages (id, node_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)').run(
        id, nodeId, role, content, JSON.stringify(metadata)
      );
    }
    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as MessageRow;
    return rowToMessage(row);
  },
};
