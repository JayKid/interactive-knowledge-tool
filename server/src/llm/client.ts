import OpenAI from 'openai';
import { config } from '../config.js';

export const llm = new OpenAI({
  baseURL: config.llmBaseUrl,
  apiKey: config.llmApiKey,
});
