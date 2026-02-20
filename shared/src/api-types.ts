import type { Graph, GraphListItem, GraphWithDetails, Node, Edge, Message, Resource, SearchResult, SuggestedTopic } from './types.js';

// === Graphs ===

export interface CreateGraphRequest {
  title: string;
  initialTopic: string;
}

export interface CreateGraphResponse {
  graph: Graph;
  rootNode: Node;
}

export interface UpdateGraphRequest {
  title?: string;
  description?: string;
}

export type ListGraphsResponse = GraphListItem[];

export type GetGraphResponse = GraphWithDetails;

// === Nodes ===

export interface CreateNodeRequest {
  title: string;
  parentNodeId: string;
  edgeLabel: string;
}

export interface CreateFreeNodeRequest {
  title: string;
}

export interface UpdateNodeRequest {
  title?: string;
  summary?: string;
  x?: number | null;
  y?: number | null;
}

export type GetNodeMessagesResponse = Message[];

// === Edges ===

export interface CreateEdgeRequest {
  sourceId: string;
  targetId: string;
  label: string;
}

// === Chat ===

export interface ChatRequest {
  message: string;
}

// SSE event types sent from server
export type ChatSSEEvent =
  | { type: 'token'; content: string }
  | { type: 'topics'; topics: SuggestedTopic[] }
  | { type: 'done'; messageId: string };

// === Extract ===

export interface ExtractToNodeRequest {
  title: string;
  edgeLabel: string;
  messageIds: string[];
}

export interface ExtractToNodeResponse {
  node: Node;
  edge: Edge;
  movedMessageCount: number;
}

// === Resources ===

export interface CreateResourceRequest {
  url: string;
  title?: string;
  notes?: string;
}

export interface CreateResourceResponse {
  resource: Resource;
}

export type ListResourcesResponse = Resource[];

export interface SummarizeResourceResponse {
  resource: Resource;
  summary: string;
}

// === Search ===

export interface SearchQuery {
  q: string;
  graphId?: string;
  limit?: number;
}

export type SearchResponse = SearchResult[];

// === Config ===

export interface ConfigResponse {
  llmBaseUrl: string;
  chatModel: string;
  embeddingModel: string;
}

// === Health ===

export interface HealthResponse {
  status: 'ok' | 'degraded';
  llmConnected: boolean;
}
