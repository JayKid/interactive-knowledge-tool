import { getDb } from './connection.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS graphs (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nodes (
    id          TEXT PRIMARY KEY,
    graph_id    TEXT NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    summary     TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    depth       INTEGER NOT NULL DEFAULT 0,
    x           REAL,
    y           REAL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nodes_graph ON nodes(graph_id);

CREATE TABLE IF NOT EXISTS edges (
    id          TEXT PRIMARY KEY,
    graph_id    TEXT NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
    source_id   TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_id   TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    label       TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(source_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_edges_graph ON edges(graph_id);
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);

CREATE TABLE IF NOT EXISTS messages (
    id          TEXT PRIMARY KEY,
    node_id     TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
    content     TEXT NOT NULL,
    metadata    TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_node ON messages(node_id);
CREATE INDEX IF NOT EXISTS idx_messages_node_created ON messages(node_id, created_at);

CREATE TABLE IF NOT EXISTS embeddings (
    id           TEXT PRIMARY KEY,
    node_id      TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('summary', 'title', 'conversation')),
    text_hash    TEXT NOT NULL,
    vector       BLOB NOT NULL,
    dimensions   INTEGER NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(node_id, content_type)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_node ON embeddings(node_id);

CREATE TABLE IF NOT EXISTS resources (
    id          TEXT PRIMARY KEY,
    node_id     TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    title       TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'summarized', 'error')),
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_resources_node ON resources(node_id);

-- Full-text search on nodes (standalone FTS table, synced via triggers)
CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
    node_id UNINDEXED,
    graph_id UNINDEXED,
    title,
    summary
);

-- Triggers to keep FTS in sync with nodes table
CREATE TRIGGER IF NOT EXISTS nodes_fts_insert AFTER INSERT ON nodes
BEGIN
    INSERT INTO nodes_fts(node_id, graph_id, title, summary)
    VALUES (NEW.id, NEW.graph_id, NEW.title, NEW.summary);
END;

CREATE TRIGGER IF NOT EXISTS nodes_fts_update AFTER UPDATE OF title, summary ON nodes
BEGIN
    DELETE FROM nodes_fts WHERE node_id = OLD.id;
    INSERT INTO nodes_fts(node_id, graph_id, title, summary)
    VALUES (NEW.id, NEW.graph_id, NEW.title, NEW.summary);
END;

CREATE TRIGGER IF NOT EXISTS nodes_fts_delete AFTER DELETE ON nodes
BEGIN
    DELETE FROM nodes_fts WHERE node_id = OLD.id;
END;

-- Full-text search on messages (conversation content)
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    message_id UNINDEXED,
    node_id UNINDEXED,
    content
);

CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages
WHEN NEW.role IN ('user', 'assistant')
BEGIN
    INSERT INTO messages_fts(message_id, node_id, content)
    VALUES (NEW.id, NEW.node_id, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON messages
BEGIN
    DELETE FROM messages_fts WHERE message_id = OLD.id;
END;
`;

export function initializeSchema(): void {
  const db = getDb();
  db.exec(SCHEMA);

  // Backfill FTS for any existing nodes not yet indexed
  db.exec(`
    INSERT OR IGNORE INTO nodes_fts(node_id, graph_id, title, summary)
    SELECT id, graph_id, title, summary FROM nodes
    WHERE id NOT IN (SELECT node_id FROM nodes_fts)
  `);

  // Backfill FTS for any existing messages not yet indexed
  db.exec(`
    INSERT OR IGNORE INTO messages_fts(message_id, node_id, content)
    SELECT id, node_id, content FROM messages
    WHERE role IN ('user', 'assistant')
    AND id NOT IN (SELECT message_id FROM messages_fts)
  `);
}
