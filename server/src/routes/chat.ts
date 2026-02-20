import type { FastifyInstance } from 'fastify';
import { streamChat } from '../services/chat.service.js';
import { generateSummary } from '../services/summary.service.js';
import { messageRepo } from '../db/repositories/message.repo.js';
import { nodeRepo } from '../db/repositories/node.repo.js';
import type { ChatRequest } from '@knowledge-tool/shared';

export async function chatRoutes(app: FastifyInstance) {
  app.post<{ Params: { nodeId: string }; Body: ChatRequest }>('/api/nodes/:nodeId/chat', async (request, reply) => {
    const { nodeId } = request.params;
    const { message } = request.body;

    if (!message) {
      return reply.status(400).send({ error: 'message is required' });
    }

    const node = nodeRepo.getById(nodeId);
    if (!node) return reply.status(404).send({ error: 'Node not found' });

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const sendSSE = (event: string, data: any) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    await streamChat(nodeId, message, {
      onToken(token) {
        sendSSE('token', { content: token });
      },
      onTopics(topics) {
        sendSSE('topics', { topics });
      },
      onDone(messageId) {
        sendSSE('done', { messageId });
        reply.raw.end();

        // Auto-generate summary after 4+ messages (fire and forget)
        const msgCount = messageRepo.countByNode(nodeId);
        if (msgCount >= 4 && !node.summary) {
          generateSummary(nodeId).catch(() => {});
        }
      },
      onError(error) {
        sendSSE('error', { message: error.message });
        reply.raw.end();
      },
    });
  });

  app.post<{ Params: { nodeId: string } }>('/api/nodes/:nodeId/summarize', async (request, reply) => {
    const { nodeId } = request.params;
    const node = nodeRepo.getById(nodeId);
    if (!node) return reply.status(404).send({ error: 'Node not found' });

    const summary = await generateSummary(nodeId);
    return { summary };
  });
}
