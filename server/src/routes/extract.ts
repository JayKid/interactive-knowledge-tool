import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/connection.js';
import { nodeRepo } from '../db/repositories/node.repo.js';
import { edgeRepo } from '../db/repositories/edge.repo.js';
import { messageRepo } from '../db/repositories/message.repo.js';
import { graphRepo } from '../db/repositories/graph.repo.js';
import { generateSummary } from '../services/summary.service.js';
import type { ExtractToNodeRequest, ExtractToNodeResponse } from '@knowledge-tool/shared';

export async function extractRoutes(app: FastifyInstance) {
  app.post<{ Params: { nodeId: string }; Body: ExtractToNodeRequest }>(
    '/api/nodes/:nodeId/extract',
    async (request, reply) => {
      const { nodeId } = request.params;
      const { title, edgeLabel, messageIds } = request.body;

      // Validation
      if (!title?.trim()) {
        return reply.status(400).send({ error: 'title is required' });
      }
      if (!messageIds?.length) {
        return reply.status(400).send({ error: 'messageIds must be non-empty' });
      }

      const sourceNode = nodeRepo.getById(nodeId);
      if (!sourceNode) {
        return reply.status(404).send({ error: 'Source node not found' });
      }

      // Verify all messages belong to this node
      const messages = messageRepo.getByIds(messageIds);
      if (messages.length !== messageIds.length) {
        return reply.status(400).send({ error: 'Some message IDs are invalid' });
      }
      if (messages.some(m => m.nodeId !== nodeId)) {
        return reply.status(400).send({ error: 'All messages must belong to the source node' });
      }

      const db = getDb();

      const transaction = db.transaction(() => {
        // 1. Create the new child node
        const newNodeId = crypto.randomUUID();
        const node = nodeRepo.create(
          newNodeId,
          sourceNode.graphId,
          title.trim(),
          sourceNode.depth + 1
        );

        // 2. Create edge from source to new node
        const edgeId = crypto.randomUUID();
        const edge = edgeRepo.create(
          edgeId,
          sourceNode.graphId,
          nodeId,
          newNodeId,
          edgeLabel || ''
        );

        // 3. Update FTS: delete old entries for moved messages
        const placeholders = messageIds.map(() => '?').join(',');
        db.prepare(
          `DELETE FROM messages_fts WHERE message_id IN (${placeholders})`
        ).run(...messageIds);

        // 4. Move messages to new node
        db.prepare(
          `UPDATE messages SET node_id = ? WHERE id IN (${placeholders})`
        ).run(newNodeId, ...messageIds);

        // 5. Re-insert FTS entries with new node_id
        const insertFts = db.prepare(
          'INSERT INTO messages_fts(message_id, node_id, content) VALUES (?, ?, ?)'
        );
        for (const msg of messages) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            insertFts.run(msg.id, newNodeId, msg.content);
          }
        }

        // 6. Insert placeholder message in source node
        const placeholderId = crypto.randomUUID();
        messageRepo.create(
          placeholderId,
          nodeId,
          'system',
          `Extracted ${messages.length} messages to "${title.trim()}"`,
          {
            extractedTo: {
              nodeId: newNodeId,
              nodeTitle: title.trim(),
            },
          }
        );

        // 7. Touch graph updated_at
        graphRepo.update(sourceNode.graphId, {});

        return { node, edge, movedMessageCount: messages.length } as ExtractToNodeResponse;
      });

      const result = transaction();

      // Fire-and-forget: generate summary for the new node if it has enough messages
      if (messages.length >= 4) {
        generateSummary(result.node.id).catch(() => {});
      }

      return result;
    }
  );
}
