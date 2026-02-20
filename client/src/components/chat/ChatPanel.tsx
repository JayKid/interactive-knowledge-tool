import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useNodeMessages, useCreateNode, useExtractToNode } from '../../api/hooks.js';
import { useChat } from '../../hooks/useChat.js';
import { useAppStore } from '../../stores/app-store.js';
import { MessageBubble } from './MessageBubble.js';
import { ChatInput } from './ChatInput.js';
import { TopicChips } from './TopicChips.js';
import { ExtractDialog } from './ExtractDialog.js';
import type { Node, Message, SuggestedTopic } from '@knowledge-tool/shared';

interface Props {
  node: Node;
  graphId: string;
}

export function ChatPanel({ node, graphId }: Props) {
  const { data: messages, isLoading } = useNodeMessages(node.id);
  const { streamingContent, isStreaming, suggestedTopics, error, sendMessage, clearTopics } = useChat();
  const createNode = useCreateNode(graphId);
  const extractToNode = useExtractToNode(graphId);
  const {
    openChat,
    isExtractionMode, selectedMessageIds, showExtractDialog,
    enterExtractionMode, exitExtractionMode,
    toggleMessagePair, openExtractDialog, closeExtractDialog,
  } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAutoSent = useRef<string | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Auto-send first message for new nodes with no conversation
  useEffect(() => {
    if (messages && messages.length === 0 && !isStreaming && hasAutoSent.current !== node.id) {
      hasAutoSent.current = node.id;
      sendMessage(node.id, `Tell me about ${node.title}`);
    }
  }, [messages, node.id, node.title, isStreaming, sendMessage]);

  // Exit extraction mode when switching nodes
  useEffect(() => {
    exitExtractionMode();
  }, [node.id, exitExtractionMode]);

  const handleSend = (message: string) => {
    sendMessage(node.id, message);
  };

  const handleTopicClick = async (topic: SuggestedTopic) => {
    const result = await createNode.mutateAsync({
      title: topic.title,
      parentNodeId: node.id,
      edgeLabel: topic.relationship,
    });
    clearTopics();
    openChat(result.node.id);
  };

  // Build message pairs for extraction selection
  // A pair is [userMessage, assistantMessage] grouped consecutively
  const { pairs, pairStartIndices, selectableMessages } = useMemo(() => {
    if (!messages) return { pairs: [] as Message[][], pairStartIndices: [] as number[], selectableMessages: [] as Message[] };

    // Filter to only user/assistant messages for pairing
    const filtered = messages.filter(m => m.role === 'user' || m.role === 'assistant');
    const prs: Message[][] = [];
    const startIndices: number[] = [];
    let i = 0;
    while (i < filtered.length) {
      if (filtered[i].role === 'user' && i + 1 < filtered.length && filtered[i + 1].role === 'assistant') {
        prs.push([filtered[i], filtered[i + 1]]);
        startIndices.push(i);
        i += 2;
      } else {
        // Skip unpaired messages
        i++;
      }
    }

    return { pairs: prs, pairStartIndices: startIndices, selectableMessages: filtered };
  }, [messages]);

  const handleTogglePair = useCallback((pair: Message[]) => {
    const pairIds = pair.map(m => m.id);
    toggleMessagePair(pairIds, pairStartIndices, selectableMessages);
  }, [toggleMessagePair, pairStartIndices, selectableMessages]);

  const handleExtractedClick = useCallback((nodeId: string) => {
    openChat(nodeId);
  }, [openChat]);

  // Determine suggested title from first selected user message
  const suggestedTitle = useMemo(() => {
    if (!messages || selectedMessageIds.length === 0) return '';
    const firstSelectedMsg = messages.find(
      m => selectedMessageIds.includes(m.id) && m.role === 'user'
    );
    if (!firstSelectedMsg) return '';
    const text = firstSelectedMsg.content.replace(/^Tell me about\s*/i, '');
    return text.length > 50 ? text.slice(0, 50).replace(/\s+\S*$/, '...') : text;
  }, [messages, selectedMessageIds]);

  const handleExtract = useCallback(async (title: string, edgeLabel: string) => {
    try {
      const result = await extractToNode.mutateAsync({
        nodeId: node.id,
        data: {
          title,
          edgeLabel,
          messageIds: selectedMessageIds,
        },
      });
      exitExtractionMode();
      openChat(result.node.id);
    } catch (err) {
      console.error('Failed to extract:', err);
    }
  }, [extractToNode, node.id, selectedMessageIds, exitExtractionMode, openChat]);

  // Get the last assistant message's topics (from DB) if we don't have streaming topics
  const savedTopics = messages?.length
    ? messages[messages.length - 1]?.metadata?.suggestedTopics
    : undefined;
  const displayTopics = suggestedTopics.length > 0 ? suggestedTopics : savedTopics || [];

  const nonSystemMessageCount = messages?.filter(m => m.role !== 'system').length || 0;
  const canExtract = nonSystemMessageCount >= 2 && !isStreaming;
  const selectedSet = new Set(selectedMessageIds);

  return (
    <div className="flex flex-col h-full">
      {/* Header with extract toggle */}
      {canExtract && (
        <div className="flex items-center justify-between" style={{
          padding: '6px 12px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <span className="text-xs text-muted">
            {messages?.filter(m => m.role !== 'system').length} messages
          </span>
          <button
            className={`btn btn-sm ${isExtractionMode ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => isExtractionMode ? exitExtractionMode() : enterExtractionMode()}
          >
            ✂️ {isExtractionMode ? 'Cancel' : 'Extract'}
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-auto p-3" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isLoading ? (
          <p className="text-muted text-sm">Loading conversation...</p>
        ) : (
          <>
            {messages?.map(msg => {
              // For system messages with extractedTo metadata, render placeholder
              if (msg.role === 'system' && msg.metadata?.extractedTo) {
                return (
                  <MessageBubble
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    metadata={msg.metadata}
                    onExtractedClick={handleExtractedClick}
                  />
                );
              }

              // Skip other system messages
              if (msg.role === 'system') return null;

              // Find which pair this message belongs to (for selection)
              const isInPair = pairs.some(pair => pair.some(m => m.id === msg.id));
              const isSelectable = isExtractionMode && isInPair;
              const isSelected = selectedSet.has(msg.id);

              // Find the pair this message belongs to
              const pair = pairs.find(p => p.some(m => m.id === msg.id));

              return (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  messageId={msg.id}
                  isSelectable={isSelectable}
                  isSelected={isSelected}
                  onToggleSelect={pair ? () => handleTogglePair(pair) : undefined}
                  metadata={msg.metadata}
                  onExtractedClick={handleExtractedClick}
                />
              );
            })}
            {isStreaming && streamingContent && (
              <MessageBubble role="assistant" content={streamingContent} isStreaming />
            )}
          </>
        )}
        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius)', color: 'var(--error)', fontSize: '0.875rem' }}>
            Error: {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Extraction action bar */}
      {isExtractionMode && selectedMessageIds.length > 0 && (
        <div className="extraction-bar">
          <span className="text-sm">
            {selectedMessageIds.length} message{selectedMessageIds.length !== 1 ? 's' : ''} selected
          </span>
          <button className="btn btn-primary btn-sm" onClick={openExtractDialog}>
            Extract to node...
          </button>
        </div>
      )}

      {/* Topic chips */}
      {displayTopics.length > 0 && !isStreaming && !isExtractionMode && (
        <TopicChips
          topics={displayTopics}
          onTopicClick={handleTopicClick}
          isCreating={createNode.isPending}
        />
      )}

      {/* Input */}
      {!isExtractionMode && (
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      )}

      {/* Extract dialog */}
      {showExtractDialog && (
        <ExtractDialog
          selectedCount={selectedMessageIds.length}
          suggestedTitle={suggestedTitle}
          onClose={closeExtractDialog}
          onExtract={handleExtract}
          isExtracting={extractToNode.isPending}
        />
      )}
    </div>
  );
}
