import type { FastifyInstance } from 'fastify';
import { searchService } from '../services/search.service.js';

export async function searchRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q: string; graphId?: string; limit?: string } }>('/api/search', async (request, reply) => {
    const { q, graphId, limit } = request.query;
    if (!q) {
      return reply.status(400).send({ error: 'q (query) is required' });
    }

    const results = await searchService.search(q, graphId, limit ? parseInt(limit, 10) : 10);
    return results;
  });
}
