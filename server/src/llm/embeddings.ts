import { llm } from './client.js';
import { config } from '../config.js';

export async function generateEmbedding(text: string): Promise<Float32Array> {
  const response = await llm.embeddings.create({
    model: config.embeddingModel,
    input: [text],
  });
  return new Float32Array(response.data[0].embedding);
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
