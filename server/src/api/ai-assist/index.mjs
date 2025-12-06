/**
 * AI Assist API
 */

export default async function aiAssistHandler(req, res) {
  try {
    const method = req.method;
    const pathParts = req.path.split('/').filter(p => p);
    const action = pathParts.length > 2 ? pathParts[2] : null;

    console.log('[api/ai-assist] Request:', { method, action, path: req.path });

    if (method === 'GET' && action === 'settings') {
      return res.json({
        success: true,
        settings: {
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 2000,
          systemPrompt: 'You are a helpful assistant for factory maintenance.',
          ragEnabled: true
        },
        timestamp: new Date().toISOString()
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.path
    });
  } catch (error) {
    console.error('[api/ai-assist] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

export const methods = ['get'];
