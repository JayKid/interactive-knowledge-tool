import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/connection.js';
import { graphRepo } from '../db/repositories/graph.repo.js';
import { nodeRepo } from '../db/repositories/node.repo.js';
import { edgeRepo } from '../db/repositories/edge.repo.js';
import { messageRepo } from '../db/repositories/message.repo.js';
import { resourceRepo } from '../db/repositories/resource.repo.js';
import type { CreateGraphRequest, UpdateGraphRequest, MessageMetadata } from '@knowledge-tool/shared';

export async function graphRoutes(app: FastifyInstance) {
  app.get('/api/graphs', async () => {
    return graphRepo.list();
  });

  app.post<{ Body: CreateGraphRequest }>('/api/graphs', async (request, reply) => {
    const { title, initialTopic } = request.body;
    if (!title || !initialTopic) {
      return reply.status(400).send({ error: 'title and initialTopic are required' });
    }

    const graphId = crypto.randomUUID();
    const graph = graphRepo.create(graphId, title);
    const rootNode = nodeRepo.create(crypto.randomUUID(), graphId, initialTopic, 0);

    return { graph, rootNode };
  });

  app.get<{ Params: { graphId: string } }>('/api/graphs/:graphId', async (request, reply) => {
    const graph = graphRepo.getWithDetails(request.params.graphId);
    if (!graph) return reply.status(404).send({ error: 'Graph not found' });
    return graph;
  });

  app.patch<{ Params: { graphId: string }; Body: UpdateGraphRequest }>('/api/graphs/:graphId', async (request, reply) => {
    const graph = graphRepo.update(request.params.graphId, request.body);
    if (!graph) return reply.status(404).send({ error: 'Graph not found' });
    return graph;
  });

  app.delete<{ Params: { graphId: string } }>('/api/graphs/:graphId', async (request, reply) => {
    const deleted = graphRepo.delete(request.params.graphId);
    if (!deleted) return reply.status(404).send({ error: 'Graph not found' });
    return { success: true };
  });

  // === Export ===
  app.get<{ Params: { graphId: string } }>('/api/graphs/:graphId/export', async (request, reply) => {
    const graph = graphRepo.getWithDetails(request.params.graphId);
    if (!graph) return reply.status(404).send({ error: 'Graph not found' });

    // Collect messages and resources for all nodes
    const messages: { nodeId: string; role: string; content: string; metadata: MessageMetadata; createdAt: string }[] = [];
    const resources: { nodeId: string; url: string; title: string; notes: string; status: string }[] = [];

    for (const node of graph.nodes) {
      const nodeMessages = messageRepo.listByNode(node.id);
      for (const m of nodeMessages) {
        messages.push({
          nodeId: m.nodeId,
          role: m.role,
          content: m.content,
          metadata: m.metadata,
          createdAt: m.createdAt,
        });
      }

      const nodeResources = resourceRepo.listByNode(node.id);
      for (const r of nodeResources) {
        resources.push({
          nodeId: r.nodeId,
          url: r.url,
          title: r.title,
          notes: r.notes,
          status: r.status,
        });
      }
    }

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      graph: {
        title: graph.title,
        description: graph.description,
      },
      nodes: graph.nodes.map(n => ({
        id: n.id,
        title: n.title,
        summary: n.summary,
        status: n.status,
        depth: n.depth,
        x: n.x,
        y: n.y,
      })),
      edges: graph.edges.map(e => ({
        sourceId: e.sourceId,
        targetId: e.targetId,
        label: e.label,
      })),
      messages,
      resources,
    };
  });

  // === Import ===
  app.post('/api/graphs/import', async (request, reply) => {
    const data = request.body as any;

    if (!data || data.version !== 1) {
      return reply.status(400).send({ error: 'Invalid export format or unsupported version' });
    }
    if (!data.graph?.title) {
      return reply.status(400).send({ error: 'Missing graph title' });
    }
    if (!Array.isArray(data.nodes) || data.nodes.length === 0) {
      return reply.status(400).send({ error: 'Export must contain at least one node' });
    }

    const db = getDb();
    const importTransaction = db.transaction(() => {
      // Create graph
      const graphId = crypto.randomUUID();
      const graph = graphRepo.create(graphId, data.graph.title, data.graph.description || '');

      // Build node ID remap: oldId → newId
      const nodeIdMap = new Map<string, string>();
      for (const node of data.nodes) {
        const newId = crypto.randomUUID();
        nodeIdMap.set(node.id, newId);

        // Create node with full data
        nodeRepo.create(newId, graphId, node.title, node.depth ?? 0);

        // Update summary and position if present
        const updates: { summary?: string; x?: number | null; y?: number | null } = {};
        if (node.summary) updates.summary = node.summary;
        if (node.x != null) updates.x = node.x;
        if (node.y != null) updates.y = node.y;
        if (Object.keys(updates).length > 0) {
          nodeRepo.update(newId, updates);
        }
      }

      // Create edges with remapped IDs
      if (Array.isArray(data.edges)) {
        for (const edge of data.edges) {
          const newSourceId = nodeIdMap.get(edge.sourceId);
          const newTargetId = nodeIdMap.get(edge.targetId);
          if (newSourceId && newTargetId) {
            edgeRepo.create(crypto.randomUUID(), graphId, newSourceId, newTargetId, edge.label || '');
          }
        }
      }

      // Create messages with remapped node IDs, preserving order
      if (Array.isArray(data.messages)) {
        for (const msg of data.messages) {
          const newNodeId = nodeIdMap.get(msg.nodeId);
          if (newNodeId) {
            messageRepo.create(
              crypto.randomUUID(),
              newNodeId,
              msg.role,
              msg.content,
              msg.metadata || {},
              msg.createdAt,
            );
          }
        }
      }

      // Create resources with remapped node IDs
      if (Array.isArray(data.resources)) {
        for (const res of data.resources) {
          const newNodeId = nodeIdMap.get(res.nodeId);
          if (newNodeId) {
            const resource = resourceRepo.create(
              crypto.randomUUID(),
              newNodeId,
              res.url,
              res.title || '',
              res.notes || '',
            );
            // Restore status if summarized
            if (res.status && res.status !== 'pending') {
              resourceRepo.update(resource.id, { status: res.status });
            }
          }
        }
      }

      return graph;
    });

    try {
      const graph = importTransaction();
      return { graph };
    } catch (err: any) {
      return reply.status(500).send({ error: `Import failed: ${err.message}` });
    }
  });
}
