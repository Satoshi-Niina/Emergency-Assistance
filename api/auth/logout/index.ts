export default async function handler(req: any): Promise<Response> {
  // CORS 繝倥ャ繝繝ｼ繧定ｨｭ螳・
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  // POST繝｡繧ｽ繝・ラ縺ｮ縺ｿ蜿励￠莉倥￠
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    console.log('柏 繝ｭ繧ｰ繧｢繧ｦ繝・PI蜻ｼ縺ｳ蜃ｺ縺・);
    
    // 繝ｭ繧ｰ繧｢繧ｦ繝亥・逅・ｼ医そ繝・す繝ｧ繝ｳ繧ｯ繝ｪ繧｢遲会ｼ・
    return new Response(JSON.stringify({
      success: true,
      message: '繝ｭ繧ｰ繧｢繧ｦ繝医＠縺ｾ縺励◆',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('笶・繝ｭ繧ｰ繧｢繧ｦ繝医お繝ｩ繝ｼ:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: '繝ｭ繧ｰ繧｢繧ｦ繝亥・逅・〒繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}


