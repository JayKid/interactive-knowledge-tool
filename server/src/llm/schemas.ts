import { z } from 'zod';

export const SuggestedTopicSchema = z.object({
  title: z.string(),
  relationship: z.string(),
  reason: z.string(),
});

export const TopicSuggestionsSchema = z.object({
  suggested_topics: z.array(SuggestedTopicSchema),
});

export type SuggestedTopicParsed = z.infer<typeof SuggestedTopicSchema>;

export function parseTopicsFromResponse(content: string): SuggestedTopicParsed[] {
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
  let lastMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = jsonBlockRegex.exec(content)) !== null) {
    lastMatch = match;
  }
  if (!lastMatch) return [];

  try {
    const parsed = JSON.parse(lastMatch[1]);
    const result = TopicSuggestionsSchema.parse(parsed);
    return result.suggested_topics;
  } catch {
    return [];
  }
}

export function stripTopicJsonBlock(content: string): string {
  // Remove the last ```json ... ``` block from the response for display
  const jsonBlockRegex = /```json\s*\{[\s\S]*?"suggested_topics"[\s\S]*?\}\s*```\s*$/;
  return content.replace(jsonBlockRegex, '').trimEnd();
}
