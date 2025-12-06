import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../../config/env.mjs';

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

function sendPreflight(res) {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  });
  return res.status(200).send('');
}

export default async function chatGptHandler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendPreflight(res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { text } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'text is required' });
  }

  if (!openai) {
    // 本番でキーが設定されていない場合でもUIが落ちないようモックを返す
    return res.status(503).json({
      success: false,
      error: 'OPENAI_API_KEY not configured',
      message: 'Set OPENAI_API_KEY in the server environment to enable GPT responses'
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a concise assistant for emergency support.'
        },
        { role: 'user', content: text }
      ],
      temperature: 0.7,
      max_tokens: 400
    });

    const answer = completion.choices?.[0]?.message?.content || '';
    // 互換性のため `response` キーも返す
    return res.json({ success: true, answer, response: answer });
  } catch (error) {
    console.error('[api/chatgpt] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'chatgpt_request_failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

export const methods = ['post', 'options'];
