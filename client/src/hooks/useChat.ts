import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import type { SuggestedTopic } from '@knowledge-tool/shared';

interface UseChatReturn {
  streamingContent: string;
  isStreaming: boolean;
  suggestedTopics: SuggestedTopic[];
  error: string | null;
  sendMessage: (nodeId: string, message: string) => Promise<void>;
  clearTopics: () => void;
}

export function useChat(): UseChatReturn {
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestedTopics, setSuggestedTopics] = useState<SuggestedTopic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const sendMessage = useCallback(async (nodeId: string, message: string) => {
    // Abort any existing stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStreamingContent('');
    setIsStreaming(true);
    setSuggestedTopics([]);
    setError(null);

    try {
      const response = await fetch(api.chatUrl(nodeId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            switch (eventType) {
              case 'token':
                setStreamingContent(prev => prev + data.content);
                break;
              case 'topics':
                setSuggestedTopics(data.topics);
                break;
              case 'done':
                // Invalidate messages to include the new ones
                queryClient.invalidateQueries({ queryKey: ['messages', nodeId] });
                break;
              case 'error':
                setError(data.message);
                break;
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [queryClient]);

  const clearTopics = useCallback(() => {
    setSuggestedTopics([]);
  }, []);

  return { streamingContent, isStreaming, suggestedTopics, error, sendMessage, clearTopics };
}
