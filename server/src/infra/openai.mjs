import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../config/env.mjs';

export const isOpenAIAvailable = !!OPENAI_API_KEY;

let openaiClient = null;

export const getOpenAIClient = () => {
  if (!isOpenAIAvailable) return null;
  
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
  }
  return openaiClient;
};
