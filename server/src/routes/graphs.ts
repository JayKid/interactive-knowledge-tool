import type { FastifyInstance } from 'fastify';
import { graphRepo } from '../db/repositories/graph.repo.js';
import { nodeRepo } from '../db/repositories/node.repo.js';
import type { CreateGraphRequest, UpdateGraphRequest } from '@knowledge-tool/shared';

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
}
