import type { FastifyInstance } from 'fastify';
import { nodeRepo } from '../db/repositories/node.repo.js';
import { edgeRepo } from '../db/repositories/edge.repo.js';
import { messageRepo } from '../db/repositories/message.repo.js';
import { graphRepo } from '../db/repositories/graph.repo.js';
import type { CreateNodeRequest, CreateFreeNodeRequest, UpdateNodeRequest } from '@knowledge-tool/shared';

export async function nodeRoutes(app: FastifyInstance) {
  app.post<{ Params: { graphId: string }; Body: CreateNodeRequest }>('/api/graphs/:graphId/nodes', async (request, reply) => {
    const { graphId } = request.params;
    const { title, parentNodeId, edgeLabel } = request.body;

    if (!title || !parentNodeId) {
      return reply.status(400).send({ error: 'title and parentNodeId are required' });
    }

    const graph = graphRepo.getById(graphId);
    if (!graph) return reply.status(404).send({ error: 'Graph not found' });

    const parentNode = nodeRepo.getById(parentNodeId);
    if (!parentNode) return reply.status(404).send({ error: 'Parent node not found' });

    const nodeId = crypto.randomUUID();
    const node = nodeRepo.create(nodeId, graphId, title, parentNode.depth + 1);
    const edge = edgeRepo.create(crypto.randomUUID(), graphId, parentNodeId, nodeId, edgeLabel || '');

    // Touch graph updated_at
    graphRepo.update(graphId, {});

    return { node, edge };
  });

  // Create a free-floating node (no parent, no edge)
  app.post<{ Params: { graphId: string }; Body: CreateFreeNodeRequest }>('/api/graphs/:graphId/nodes/free', async (request, reply) => {
    const { graphId } = request.params;
    const { title } = request.body;

    if (!title) {
      return reply.status(400).send({ error: 'title is required' });
    }

    const graph = graphRepo.getById(graphId);
    if (!graph) return reply.status(404).send({ error: 'Graph not found' });

    const nodeId = crypto.randomUUID();
    const node = nodeRepo.create(nodeId, graphId, title, 0);

    // Touch graph updated_at
    graphRepo.update(graphId, {});

    return { node };
  });

  app.get<{ Params: { nodeId: string } }>('/api/nodes/:nodeId', async (request, reply) => {
    const node = nodeRepo.getById(request.params.nodeId);
    if (!node) return reply.status(404).send({ error: 'Node not found' });
    return node;
  });

  app.patch<{ Params: { nodeId: string }; Body: UpdateNodeRequest }>('/api/nodes/:nodeId', async (request, reply) => {
    const node = nodeRepo.update(request.params.nodeId, request.body);
    if (!node) return reply.status(404).send({ error: 'Node not found' });
    return node;
  });

  app.delete<{ Params: { nodeId: string } }>('/api/nodes/:nodeId', async (request, reply) => {
    const deleted = nodeRepo.delete(request.params.nodeId);
    if (!deleted) return reply.status(404).send({ error: 'Node not found' });
    return { success: true };
  });

  app.get<{ Params: { nodeId: string } }>('/api/nodes/:nodeId/messages', async (request, reply) => {
    const node = nodeRepo.getById(request.params.nodeId);
    if (!node) return reply.status(404).send({ error: 'Node not found' });
    return messageRepo.listByNode(request.params.nodeId);
  });
}
