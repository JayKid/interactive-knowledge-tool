import type {
  CreateGraphRequest,
  CreateGraphResponse,
  ListGraphsResponse,
  GetGraphResponse,
  UpdateGraphRequest,
  CreateNodeRequest,
  CreateFreeNodeRequest,
  UpdateNodeRequest,
  GetNodeMessagesResponse,
  CreateEdgeRequest,
  SearchResponse,
  ExtractToNodeRequest,
  ExtractToNodeResponse,
  CreateResourceRequest,
  CreateResourceResponse,
  ListResourcesResponse,
  SummarizeResourceResponse,
  ConfigResponse,
  HealthResponse,
} from '@knowledge-tool/shared';
import type { Graph, Node, Edge } from '@knowledge-tool/shared';

const BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Graphs
  listGraphs: () => fetchJSON<ListGraphsResponse>('/graphs'),
  createGraph: (data: CreateGraphRequest) =>
    fetchJSON<CreateGraphResponse>('/graphs', { method: 'POST', body: JSON.stringify(data) }),
  getGraph: (graphId: string) => fetchJSON<GetGraphResponse>(`/graphs/${graphId}`),
  updateGraph: (graphId: string, data: UpdateGraphRequest) =>
    fetchJSON<Graph>(`/graphs/${graphId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteGraph: (graphId: string) =>
    fetchJSON<{ success: boolean }>(`/graphs/${graphId}`, { method: 'DELETE' }),

  // Nodes
  createNode: (graphId: string, data: CreateNodeRequest) =>
    fetchJSON<{ node: Node; edge: Edge }>(`/graphs/${graphId}/nodes`, { method: 'POST', body: JSON.stringify(data) }),
  createFreeNode: (graphId: string, data: CreateFreeNodeRequest) =>
    fetchJSON<{ node: Node }>(`/graphs/${graphId}/nodes/free`, { method: 'POST', body: JSON.stringify(data) }),
  getNode: (nodeId: string) => fetchJSON<Node>(`/nodes/${nodeId}`),
  updateNode: (nodeId: string, data: UpdateNodeRequest) =>
    fetchJSON<Node>(`/nodes/${nodeId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteNode: (nodeId: string) =>
    fetchJSON<{ success: boolean }>(`/nodes/${nodeId}`, { method: 'DELETE' }),
  getNodeMessages: (nodeId: string) => fetchJSON<GetNodeMessagesResponse>(`/nodes/${nodeId}/messages`),

  // Edges
  createEdge: (graphId: string, data: CreateEdgeRequest) =>
    fetchJSON<Edge>(`/graphs/${graphId}/edges`, { method: 'POST', body: JSON.stringify(data) }),
  deleteEdge: (edgeId: string) =>
    fetchJSON<{ success: boolean }>(`/edges/${edgeId}`, { method: 'DELETE' }),

  // Extract messages to new node
  extractToNode: (nodeId: string, data: ExtractToNodeRequest) =>
    fetchJSON<ExtractToNodeResponse>(`/nodes/${nodeId}/extract`, { method: 'POST', body: JSON.stringify(data) }),

  // Chat (returns EventSource URL - actual SSE handled in useChat hook)
  chatUrl: (nodeId: string) => `${BASE}/nodes/${nodeId}/chat`,

  // Summarize
  summarizeNode: (nodeId: string) =>
    fetchJSON<{ summary: string }>(`/nodes/${nodeId}/summarize`, { method: 'POST' }),

  // Search
  search: (q: string, graphId?: string) =>
    fetchJSON<SearchResponse>(`/search?q=${encodeURIComponent(q)}${graphId ? `&graphId=${graphId}` : ''}`),

  // Resources
  listResources: (nodeId: string) =>
    fetchJSON<ListResourcesResponse>(`/nodes/${nodeId}/resources`),
  createResource: (nodeId: string, data: CreateResourceRequest) =>
    fetchJSON<CreateResourceResponse>(`/nodes/${nodeId}/resources`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  deleteResource: (resourceId: string) =>
    fetchJSON<{ success: boolean }>(`/resources/${resourceId}`, { method: 'DELETE' }),
  summarizeResource: (resourceId: string) =>
    fetchJSON<SummarizeResourceResponse>(`/resources/${resourceId}/summarize`, { method: 'POST' }),

  // Config & Health
  getConfig: () => fetchJSON<ConfigResponse>('/config'),
  getHealth: () => fetchJSON<HealthResponse>('/health'),
};
