import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { initializeSchema } from './db/schema.js';
import { closeDb } from './db/connection.js';
import { graphRoutes } from './routes/graphs.js';
import { nodeRoutes } from './routes/nodes.js';
import { edgeRoutes } from './routes/edges.js';
import { chatRoutes } from './routes/chat.js';
import { searchRoutes } from './routes/search.js';
import { extractRoutes } from './routes/extract.js';
import { resourceRoutes } from './routes/resources.js';
import { llm } from './llm/client.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// Initialize database
initializeSchema();

// Register routes
await app.register(graphRoutes);
await app.register(nodeRoutes);
await app.register(edgeRoutes);
await app.register(chatRoutes);
await app.register(searchRoutes);
await app.register(extractRoutes);
await app.register(resourceRoutes);

// Health check
app.get('/api/health', async () => {
  let llmConnected = false;
  try {
    await llm.models.list();
    llmConnected = true;
  } catch {}
  return { status: llmConnected ? 'ok' : 'degraded', llmConnected };
});

// Config endpoint
app.get('/api/config', async () => ({
  llmBaseUrl: config.llmBaseUrl,
  chatModel: config.chatModel,
  embeddingModel: config.embeddingModel,
}));

// Graceful shutdown
const shutdown = async () => {
  await app.close();
  closeDb();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`Server running at http://localhost:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
