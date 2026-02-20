import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { nodeRepo } from '../db/repositories/node.repo.js';
import { resourceRepo } from '../db/repositories/resource.repo.js';
import { messageRepo } from '../db/repositories/message.repo.js';
import { fetchUrlContent } from '../services/url-content.service.js';
import { llm } from '../llm/client.js';
import { config } from '../config.js';
import { RESOURCE_SUMMARY_PROMPT } from '../llm/prompts.js';
import type { CreateResourceRequest } from '@knowledge-tool/shared';

export async function resourceRoutes(app: FastifyInstance) {
  // List resources for a node
  app.get<{ Params: { nodeId: string } }>(
    '/api/nodes/:nodeId/resources',
    async (request, reply) => {
      const node = nodeRepo.getById(request.params.nodeId);
      if (!node) return reply.status(404).send({ error: 'Node not found' });
      return resourceRepo.listByNode(request.params.nodeId);
    }
  );

  // Create a resource
  app.post<{ Params: { nodeId: string }; Body: CreateResourceRequest }>(
    '/api/nodes/:nodeId/resources',
    async (request, reply) => {
      const { nodeId } = request.params;
      const { url, title, notes } = request.body;

      if (!url?.trim()) {
        return reply.status(400).send({ error: 'url is required' });
      }

      const node = nodeRepo.getById(nodeId);
      if (!node) return reply.status(404).send({ error: 'Node not found' });

      const resourceId = crypto.randomUUID();
      const resource = resourceRepo.create(
        resourceId, nodeId, url.trim(), title?.trim() || '', notes?.trim() || ''
      );
      return { resource };
    }
  );

  // Delete a resource
  app.delete<{ Params: { resourceId: string } }>(
    '/api/resources/:resourceId',
    async (request, reply) => {
      const deleted = resourceRepo.delete(request.params.resourceId);
      if (!deleted) return reply.status(404).send({ error: 'Resource not found' });
      return { success: true };
    }
  );

  // Summarize a resource: fetch URL content, LLM summarize, inject into conversation
  app.post<{ Params: { resourceId: string } }>(
    '/api/resources/:resourceId/summarize',
    async (request, reply) => {
      const resource = resourceRepo.getById(request.params.resourceId);
      if (!resource) return reply.status(404).send({ error: 'Resource not found' });

      const node = nodeRepo.getById(resource.nodeId);
      if (!node) return reply.status(404).send({ error: 'Node not found' });

      try {
        // 1. Fetch URL content
        const { title: fetchedTitle, text } = await fetchUrlContent(resource.url);

        if (!text.trim()) {
          return reply.status(422).send({ error: 'Could not extract text content from URL' });
        }

        // Auto-fill title if not set
        if (!resource.title && fetchedTitle) {
          resourceRepo.update(resource.id, { title: fetchedTitle });
        }

        // 2. Summarize with LLM
        const displayTitle = resource.title || fetchedTitle || resource.url;

        const response = await llm.chat.completions.create({
          model: config.chatModel,
          messages: [
            { role: 'system', content: RESOURCE_SUMMARY_PROMPT },
            {
              role: 'user',
              content: `URL: ${resource.url}\nTitle: ${displayTitle}\n\nContent:\n${text}`,
            },
          ],
        });

        const summary = response.choices[0]?.message?.content?.trim() || '';

        if (!summary) {
          resourceRepo.update(resource.id, { status: 'error' });
          return reply.status(500).send({ error: 'LLM returned empty summary' });
        }

        // 3. Update resource with summary
        resourceRepo.update(resource.id, { notes: summary, status: 'summarized' });

        // 4. Inject into conversation as an assistant message
        const assistantMsgId = crypto.randomUUID();
        messageRepo.create(
          assistantMsgId,
          resource.nodeId,
          'assistant',
          `Here's a summary of **${displayTitle}**:\n\n${summary}`
        );

        const updatedResource = resourceRepo.getById(resource.id)!;
        return { resource: updatedResource, summary };
      } catch (error) {
        resourceRepo.update(resource.id, { status: 'error' });
        const message = error instanceof Error ? error.message : 'Failed to summarize resource';
        return reply.status(500).send({ error: message });
      }
    }
  );
}
