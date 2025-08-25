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
    console.log('側 繝ｦ繝ｼ繧ｶ繝ｼ隱崎ｨｼ迥ｶ諷狗｢ｺ隱喉PI蜻ｼ縺ｳ蜃ｺ縺・);
    
    // 繧ｻ繝・す繝ｧ繝ｳ諠・ｱ縺後↑縺・◆繧√∵悴隱崎ｨｼ縺ｨ縺励※霑斐☆
    // 螳滄圀縺ｮ螳溯｣・〒縺ｯ縲゛WT繝医・繧ｯ繝ｳ繧・そ繝・す繝ｧ繝ｳ縺九ｉ隱崎ｨｼ迥ｶ諷九ｒ遒ｺ隱阪☆繧・
    return new Response(JSON.stringify({
      success: false,
      isAuthenticated: false,
      message: '繧ｻ繝・す繝ｧ繝ｳ隱崎ｨｼ縺悟ｮ溯｣・＆繧後※縺・∪縺帙ｓ'
    }), {
      status: 401,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('笶・隱崎ｨｼ迥ｶ諷狗｢ｺ隱阪お繝ｩ繝ｼ:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: '繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}


