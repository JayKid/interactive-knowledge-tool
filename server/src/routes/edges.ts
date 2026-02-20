import type { FastifyInstance } from 'fastify';
import { edgeRepo } from '../db/repositories/edge.repo.js';
import { graphRepo } from '../db/repositories/graph.repo.js';
import type { CreateEdgeRequest } from '@knowledge-tool/shared';

export async function edgeRoutes(app: FastifyInstance) {
  app.post<{ Params: { graphId: string }; Body: CreateEdgeRequest }>('/api/graphs/:graphId/edges', async (request, reply) => {
    const { graphId } = request.params;
    const { sourceId, targetId, label } = request.body;

    if (!sourceId || !targetId) {
      return reply.status(400).send({ error: 'sourceId and targetId are required' });
    }

    const graph = graphRepo.getById(graphId);
    if (!graph) return reply.status(404).send({ error: 'Graph not found' });

    const edge = edgeRepo.create(crypto.randomUUID(), graphId, sourceId, targetId, label || '');
    return edge;
  });

  app.delete<{ Params: { edgeId: string } }>('/api/edges/:edgeId', async (request, reply) => {
    const deleted = edgeRepo.delete(request.params.edgeId);
    if (!deleted) return reply.status(404).send({ error: 'Edge not found' });
    return { success: true };
  });
}
