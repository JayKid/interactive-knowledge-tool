import { llm } from '../llm/client.js';
import { config } from '../config.js';
import { SUMMARY_SYSTEM_PROMPT } from '../llm/prompts.js';
import { nodeRepo } from '../db/repositories/node.repo.js';
import { messageRepo } from '../db/repositories/message.repo.js';
import { searchService } from './search.service.js';

export async function generateSummary(nodeId: string): Promise<string> {
  const node = nodeRepo.getById(nodeId);
  if (!node) throw new Error(`Node not found: ${nodeId}`);

  const messages = messageRepo.listByNode(nodeId);
  const conversationText = messages
    .filter(m => m.role !== 'system')
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  if (!conversationText.trim()) {
    return '';
  }

  const response = await llm.chat.completions.create({
    model: config.chatModel,
    messages: [
      { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
      { role: 'user', content: `Topic: ${node.title}\n\nConversation:\n${conversationText}` },
    ],
  });

  const summary = response.choices[0]?.message?.content?.trim() || '';

  nodeRepo.update(nodeId, { summary });

  // Update embedding for the node (fire and forget)
  searchService.updateNodeEmbedding(nodeId, summary).catch(() => {});

  return summary;
}
