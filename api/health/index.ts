export default async function handler(req: any): Promise<Response> {
  // CORS 繝倥ャ繝繝ｼ繧定ｨｭ螳・
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // OPTIONS繝ｪ繧ｯ繧ｨ繧ｹ繝茨ｼ医・繝ｪ繝輔Λ繧､繝茨ｼ峨∈縺ｮ蟇ｾ蠢・
  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: corsHeaders
    });
  }

  // GET繝｡繧ｽ繝・ラ縺ｮ縺ｿ蜿励￠莉倥￠
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: 'Azure Static Web Apps API Functions',
      apiVersion: '1.0.0',
      message: 'Emergency Assistance API is running',
      availableEndpoints: [
        '/api/health - 繝倥Ν繧ｹ繝√ぉ繝・け',
        '/api/auth/login - 繝ｭ繧ｰ繧､繝ｳ隱崎ｨｼ',
        '/api/auth/me - 隱崎ｨｼ迥ｶ諷狗｢ｺ隱・
      ]
    };

    return new Response(JSON.stringify(healthData), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Health check error:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}


