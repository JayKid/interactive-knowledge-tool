import { llm } from '../llm/client.js';
import { config } from '../config.js';
import { buildConversationSystemPrompt } from '../llm/prompts.js';
import { parseTopicsFromResponse, stripTopicJsonBlock } from '../llm/schemas.js';
import { nodeRepo } from '../db/repositories/node.repo.js';
import { messageRepo } from '../db/repositories/message.repo.js';
import type { SuggestedTopic } from '@knowledge-tool/shared';

interface ChatStreamCallbacks {
  onToken: (token: string) => void;
  onTopics: (topics: SuggestedTopic[]) => void;
  onDone: (messageId: string) => void;
  onError: (error: Error) => void;
}

export async function streamChat(
  nodeId: string,
  userMessage: string,
  callbacks: ChatStreamCallbacks,
): Promise<void> {
  const node = nodeRepo.getById(nodeId);
  if (!node) throw new Error(`Node not found: ${nodeId}`);

  const existingTopics = nodeRepo.listTitlesByGraph(node.graphId);
  const systemPrompt = buildConversationSystemPrompt(node.title, existingTopics);

  // Save user message
  const userMsgId = crypto.randomUUID();
  messageRepo.create(userMsgId, nodeId, 'user', userMessage);

  // Build message history
  const history = messageRepo.listByNode(nodeId);
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of history) {
    if (msg.role === 'system') continue;
    messages.push({ role: msg.role, content: msg.content });
  }

  try {
    const stream = await llm.chat.completions.create({
      model: config.chatModel,
      messages,
      stream: true,
    });

    let fullContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        callbacks.onToken(delta);
      }
    }

    // Parse topics from the complete response
    const topics = parseTopicsFromResponse(fullContent);
    const displayContent = stripTopicJsonBlock(fullContent);

    // Save assistant message with topics in metadata
    const assistantMsgId = crypto.randomUUID();
    messageRepo.create(assistantMsgId, nodeId, 'assistant', displayContent, {
      suggestedTopics: topics,
    });

    if (topics.length > 0) {
      callbacks.onTopics(topics);
    }
    callbacks.onDone(assistantMsgId);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
