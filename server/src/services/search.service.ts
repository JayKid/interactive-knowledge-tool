import { createHash } from 'crypto';
import { generateEmbedding, cosineSimilarity } from '../llm/embeddings.js';
import { embeddingRepo } from '../db/repositories/embedding.repo.js';
import { nodeRepo } from '../db/repositories/node.repo.js';
import type { SearchResult } from '@knowledge-tool/shared';

export const searchService = {
  async updateNodeEmbedding(nodeId: string, summary: string): Promise<void> {
    if (!summary.trim()) return;

    const hash = createHash('sha256').update(summary).digest('hex');
    const existing = embeddingRepo.findByNodeAndType(nodeId, 'summary');
    if (existing && existing.textHash === hash) return;

    const vector = await generateEmbedding(summary);
    const vectorBuffer = Buffer.from(vector.buffer);

    embeddingRepo.upsert(
      crypto.randomUUID(),
      nodeId,
      'summary',
      hash,
      vectorBuffer,
      vector.length,
    );
  },

  /**
   * Hybrid search: FTS always runs, semantic search is attempted as a bonus.
   * FTS results are returned even when the embedding model is unavailable.
   */
  async search(query: string, graphId?: string, limit: number = 10): Promise<SearchResult[]> {
    // 1. Always run FTS (fast, no LLM dependency)
    const ftsResults = nodeRepo.searchFTS(query, graphId, limit);

    // 2. Attempt semantic search (best-effort)
    let semanticResults: SearchResult[] = [];
    try {
      semanticResults = await this.semanticSearch(query, graphId, limit);
    } catch {
      // Embedding model unavailable — that's fine, FTS still works
    }

    // 3. Merge: semantic results first, then FTS-only results, deduplicated
    const seen = new Set<string>();
    const merged: SearchResult[] = [];

    for (const r of semanticResults) {
      if (!seen.has(r.nodeId)) {
        seen.add(r.nodeId);
        merged.push(r);
      }
    }
    for (const r of ftsResults) {
      if (!seen.has(r.nodeId)) {
        seen.add(r.nodeId);
        merged.push(r);
      }
    }

    return merged.slice(0, limit);
  },

  async semanticSearch(query: string, graphId?: string, limit: number = 10): Promise<SearchResult[]> {
    const queryVector = await generateEmbedding(query);

    const candidates = graphId
      ? embeddingRepo.findByGraph(graphId)
      : embeddingRepo.findAll();

    const scored = candidates.map(candidate => {
      const candidateVector = new Float32Array(
        candidate.vector.buffer,
        candidate.vector.byteOffset,
        candidate.vector.byteLength / Float32Array.BYTES_PER_ELEMENT,
      );
      const similarity = cosineSimilarity(queryVector, candidateVector);
      return {
        nodeId: candidate.nodeId,
        graphId: candidate.graphId,
        graphTitle: candidate.graphTitle,
        nodeTitle: candidate.nodeTitle,
        nodeSummary: candidate.nodeSummary,
        similarity,
      };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, limit).filter(s => s.similarity > 0.3);
  },
};
