export interface Graph {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface GraphWithDetails extends Graph {
  nodes: Node[];
  edges: Edge[];
}

export interface GraphListItem extends Graph {
  nodeCount: number;
}

export interface Node {
  id: string;
  graphId: string;
  title: string;
  summary: string;
  status: 'active' | 'archived';
  depth: number;
  x: number | null;
  y: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Edge {
  id: string;
  graphId: string;
  sourceId: string;
  targetId: string;
  label: string;
  createdAt: string;
}

export interface Message {
  id: string;
  nodeId: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata: MessageMetadata;
  createdAt: string;
}

export interface MessageMetadata {
  suggestedTopics?: SuggestedTopic[];
  extractedTo?: {
    nodeId: string;
    nodeTitle: string;
  };
}

export interface SuggestedTopic {
  title: string;
  relationship: string;
  reason: string;
}

export interface Embedding {
  id: string;
  nodeId: string;
  contentType: 'summary' | 'title' | 'conversation';
  textHash: string;
  vector: ArrayBuffer;
  dimensions: number;
  createdAt: string;
}

export interface SearchResult {
  nodeId: string;
  graphId: string;
  graphTitle: string;
  nodeTitle: string;
  nodeSummary: string;
  similarity: number;
}

export interface Resource {
  id: string;
  nodeId: string;
  url: string;
  title: string;
  notes: string;
  status: 'pending' | 'summarized' | 'error';
  createdAt: string;
}
