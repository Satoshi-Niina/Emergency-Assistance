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
    console.log('柏 繝ｭ繧ｰ繧､繝ｳ隱崎ｨｼAPI蜻ｼ縺ｳ蜃ｺ縺・);
    console.log('藤 繝ｪ繧ｯ繧ｨ繧ｹ繝郁ｩｳ邏ｰ:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers?.entries() || []),
      timestamp: new Date().toISOString()
    });
    
    const body = await req.json();
    const { username, password } = body || {};
    
    console.log('統 蜿嶺ｿ｡繝・・繧ｿ:', { username, passwordLength: password?.length });
    
    // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    if (!username || !password) {
      console.log('笶・繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ: 繝ｦ繝ｼ繧ｶ繝ｼ蜷阪∪縺溘・繝代せ繝ｯ繝ｼ繝峨′遨ｺ');
      return new Response(JSON.stringify({ 
        success: false,
        error: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪→繝代せ繝ｯ繝ｼ繝峨′蠢・ｦ√〒縺・ 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // 隱崎ｨｼ遒ｺ隱・
    const user = await validateCredentials(username, password);
    
    if (!user) {
      console.log('笶・隱崎ｨｼ螟ｱ謨・', username);
      return new Response(JSON.stringify({ 
        success: false,
        error: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪∪縺溘・繝代せ繝ｯ繝ｼ繝峨′驕輔＞縺ｾ縺・ 
      }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // 隱崎ｨｼ謌仙粥・医ヱ繧ｹ繝ｯ繝ｼ繝峨ヵ繧｣繝ｼ繝ｫ繝峨ｒ髯､螟厄ｼ・
    const { password: _, ...userWithoutPassword } = user;
    console.log('笨・隱崎ｨｼ謌仙粥:', { username, role: user.role });
    
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: userWithoutPassword.id,
        username: userWithoutPassword.username,
        displayName: userWithoutPassword.displayName,
        role: userWithoutPassword.role,
        department: userWithoutPassword.department
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('笶・繝ｭ繧ｰ繧､繝ｳ隱崎ｨｼ繧ｨ繝ｩ繝ｼ:', error);
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

// 蝙句ｮ夂ｾｩ
interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'employee';
  department?: string;
  password: string;
}

// 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ隱崎ｨｼ・医ョ繝ｼ繧ｿ繝吶・繧ｹ謗･邯壼､ｱ謨玲凾・・
async function fallbackAuthentication(username: string, password: string): Promise<User | null> {
  console.log('売 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ隱崎ｨｼ繧貞ｮ溯｡・', username);
  
  const fallbackUsers: User[] = [
    {
      id: '1',
      username: 'admin',
      displayName: '邂｡逅・・,
      role: 'admin',
      department: '邂｡逅・Κ',
      password: 'password'
    },
    {
      id: '2',
      username: 'employee1',
      displayName: '菴懈･ｭ蜩｡1',
      role: 'employee',
      department: '菫晏ｮ磯Κ',
      password: 'password'
    },
    {
      id: '3',
      username: 'employee2',
      displayName: '菴懈･ｭ蜩｡2',
      role: 'employee',
      department: '驕玖｡碁Κ',
      password: 'password'
    },
    {
      id: '4',
      username: 'test',
      displayName: '繝・せ繝医Θ繝ｼ繧ｶ繝ｼ',
      role: 'employee',
      department: '繝・せ繝磯Κ',
      password: 'test'
    },
    {
      id: '5',
      username: 'demo',
      displayName: '繝・Δ繝ｦ繝ｼ繧ｶ繝ｼ',
      role: 'employee',
      department: '繝・Δ驛ｨ',
      password: 'demo'
    },
    {
      id: '6',
      username: 'user',
      displayName: '荳闊ｬ繝ｦ繝ｼ繧ｶ繝ｼ',
      role: 'employee',
      department: '荳闊ｬ驛ｨ',
      password: '123456'
    },
    {
      id: '7',
      username: 'niina',
      displayName: '譁ｰ蜷崎■',
      role: 'admin',
      department: '邂｡逅・Κ',
      password: '0077'
    }
  ];

  const user = fallbackUsers.find(u => u.username === username);
  if (user && user.password === password) {
    console.log('笨・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ隱崎ｨｼ謌仙粥:', username);
    return user;
  }

  console.log('笶・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ隱崎ｨｼ螟ｱ謨・', username);
  return null;
}

// 隱崎ｨｼ髢｢謨ｰ
async function validateCredentials(username: string, password: string): Promise<User | null> {
  try {
    console.log('剥 隱崎ｨｼ髢句ｧ・', { username });

    // 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ隱崎ｨｼ繧剃ｽｿ逕ｨ
    console.log('売 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ隱崎ｨｼ縺ｫ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ');
    return await fallbackAuthentication(username, password);

  } catch (error) {
    console.error('笶・隱崎ｨｼ蜃ｦ逅・お繝ｩ繝ｼ:', error);
    // 繧ｨ繝ｩ繝ｼ譎ゅｂ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ隱崎ｨｼ繧剃ｽｿ逕ｨ
    return await fallbackAuthentication(username, password);
  }
}


