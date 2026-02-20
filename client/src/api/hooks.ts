import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client.js';
import type { CreateGraphRequest, UpdateGraphRequest, CreateNodeRequest, CreateFreeNodeRequest, CreateEdgeRequest, UpdateNodeRequest, ExtractToNodeRequest, CreateResourceRequest } from '@knowledge-tool/shared';

export function useGraphs() {
  return useQuery({
    queryKey: ['graphs'],
    queryFn: api.listGraphs,
  });
}

export function useGraph(graphId: string | null) {
  return useQuery({
    queryKey: ['graph', graphId],
    queryFn: () => api.getGraph(graphId!),
    enabled: !!graphId,
  });
}

export function useCreateGraph() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGraphRequest) => api.createGraph(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graphs'] });
    },
  });
}

export function useUpdateGraph() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ graphId, data }: { graphId: string; data: UpdateGraphRequest }) =>
      api.updateGraph(graphId, data),
    onSuccess: (_, { graphId }) => {
      queryClient.invalidateQueries({ queryKey: ['graph', graphId] });
      queryClient.invalidateQueries({ queryKey: ['graphs'] });
    },
  });
}

export function useDeleteGraph() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (graphId: string) => api.deleteGraph(graphId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graphs'] });
    },
  });
}

export function useImportGraph() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.importGraph(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graphs'] });
    },
  });
}

export function useCreateNode(graphId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNodeRequest) => api.createNode(graphId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graph', graphId] });
    },
  });
}

export function useCreateFreeNode(graphId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFreeNodeRequest) => api.createFreeNode(graphId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graph', graphId] });
    },
  });
}

export function useCreateEdge(graphId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEdgeRequest) => api.createEdge(graphId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graph', graphId] });
    },
  });
}

export function useUpdateNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, data }: { nodeId: string; data: UpdateNodeRequest }) =>
      api.updateNode(nodeId, data),
    onSuccess: (_, { nodeId }) => {
      queryClient.invalidateQueries({ queryKey: ['node', nodeId] });
    },
  });
}

export function useNodeMessages(nodeId: string | null) {
  return useQuery({
    queryKey: ['messages', nodeId],
    queryFn: () => api.getNodeMessages(nodeId!),
    enabled: !!nodeId,
  });
}

export function useSummarizeNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: string) => api.summarizeNode(nodeId),
    onSuccess: (_, nodeId) => {
      queryClient.invalidateQueries({ queryKey: ['node', nodeId] });
      queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
}

export function useExtractToNode(graphId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, data }: { nodeId: string; data: ExtractToNodeRequest }) =>
      api.extractToNode(nodeId, data),
    onSuccess: (_, { nodeId }) => {
      queryClient.invalidateQueries({ queryKey: ['graph', graphId] });
      queryClient.invalidateQueries({ queryKey: ['messages', nodeId] });
    },
  });
}

export function useSearch(query: string, graphId?: string) {
  return useQuery({
    queryKey: ['search', query, graphId],
    queryFn: () => api.search(query, graphId),
    enabled: query.length >= 2,
  });
}

export function useNodeResources(nodeId: string | null) {
  return useQuery({
    queryKey: ['resources', nodeId],
    queryFn: () => api.listResources(nodeId!),
    enabled: !!nodeId,
  });
}

export function useCreateResource(nodeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateResourceRequest) => api.createResource(nodeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources', nodeId] });
    },
  });
}

export function useDeleteResource(nodeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: string) => api.deleteResource(resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources', nodeId] });
    },
  });
}

export function useSummarizeResource(nodeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: string) => api.summarizeResource(resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources', nodeId] });
      queryClient.invalidateQueries({ queryKey: ['messages', nodeId] });
    },
  });
}
