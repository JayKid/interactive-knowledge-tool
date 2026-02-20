import 'dotenv/config';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  llmBaseUrl: process.env.LLM_BASE_URL || 'http://localhost:1234/v1',
  llmApiKey: process.env.LLM_API_KEY || 'lm-studio',
  chatModel: process.env.LLM_CHAT_MODEL || 'local-model',
  embeddingModel: process.env.LLM_EMBEDDING_MODEL || 'text-embedding-nomic-embed-text-v1.5',
  embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '768', 10),
  dbPath: resolve(__dirname, '..', '..', process.env.DB_PATH || './data/knowledge.db'),
};
