#!/usr/bin/env tsx

/**
 * RAG繧ｷ繧ｹ繝・Β縺ｮ蜍穂ｽ懃｢ｺ隱咲畑繝・せ繝医せ繧ｯ繝ｪ繝励ヨ
 * 譌｢蟄篭I繧貞､画峩縺帙★縺ｫRAG API縺ｮ蜍穂ｽ懊ｒ遒ｺ隱阪〒縺阪ｋ
 */

import { config } from 'dotenv';
import { loadRagConfig } from '../services/config-manager.js';
import { health } from '../services/db.js';

// 迺ｰ蠅・､画焚繧定ｪｭ縺ｿ霎ｼ縺ｿ
config();

async function testRagSystem() {
  console.log('ｧｪ RAG繧ｷ繧ｹ繝・Β縺ｮ蜍穂ｽ懃｢ｺ隱阪ｒ髢句ｧ九＠縺ｾ縺・..\n');

  try {
    // 1. 繝・・繧ｿ繝吶・繧ｹ謗･邯夂｢ｺ隱・
    console.log('1・鞘Ε 繝・・繧ｿ繝吶・繧ｹ謗･邯夂｢ｺ隱・..');
    const dbHealthy = await health();
    if (dbHealthy) {
      console.log('笨・繝・・繧ｿ繝吶・繧ｹ謗･邯・ OK');
    } else {
      console.log('笶・繝・・繧ｿ繝吶・繧ｹ謗･邯・ FAILED');
      return;
    }

    // 2. RAG險ｭ螳夊ｪｭ縺ｿ霎ｼ縺ｿ遒ｺ隱・
    console.log('\n2・鞘Ε RAG險ｭ螳夊ｪｭ縺ｿ霎ｼ縺ｿ遒ｺ隱・..');
    try {
      const ragConfig = await loadRagConfig();
      console.log('笨・RAG險ｭ螳夊ｪｭ縺ｿ霎ｼ縺ｿ: OK');
      console.log('   - 蝓九ａ霎ｼ縺ｿ谺｡蜈・焚:', ragConfig.embedDim);
      console.log('   - 繝√Ε繝ｳ繧ｯ繧ｵ繧､繧ｺ:', ragConfig.chunkSize);
      console.log('   - 繝√Ε繝ｳ繧ｯ繧ｪ繝ｼ繝舌・繝ｩ繝・・:', ragConfig.chunkOverlap);
      console.log('   - 讀懃ｴ｢邨先棡謨ｰ:', ragConfig.retrieveK);
    } catch (error) {
      console.log('笶・RAG險ｭ螳夊ｪｭ縺ｿ霎ｼ縺ｿ: FAILED');
      console.error('   繧ｨ繝ｩ繝ｼ:', error);
      return;
    }

    // 3. 迺ｰ蠅・､画焚遒ｺ隱・
    console.log('\n3・鞘Ε 迺ｰ蠅・､画焚遒ｺ隱・..');
    const requiredEnvVars = ['DATABASE_URL', 'OPENAI_API_KEY'];
    const missingVars: string[] = [];
    
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`笨・${envVar}: SET`);
      } else {
        console.log(`笶・${envVar}: NOT SET`);
        missingVars.push(envVar);
      }
    }

    if (missingVars.length > 0) {
      console.log(`\n笞・・ 莉･荳九・迺ｰ蠅・､画焚縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ: ${missingVars.join(', ')}`);
      console.log('   荳驛ｨ縺ｮ讖溯・縺悟虚菴懊＠縺ｪ縺・庄閭ｽ諤ｧ縺後≠繧翫∪縺吶・);
    }

    // 4. API繧ｨ繝ｳ繝峨・繧､繝ｳ繝育｢ｺ隱・
    console.log('\n4・鞘Ε API繧ｨ繝ｳ繝峨・繧､繝ｳ繝育｢ｺ隱・..');
    const baseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3001';
    const endpoints = [
      '/api/config/rag',
      '/api/ingest/status',
      '/api/search/stats'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`);
        if (response.ok) {
          console.log(`笨・${endpoint}: OK (${response.status})`);
        } else {
          console.log(`笶・${endpoint}: FAILED (${response.status})`);
        }
      } catch (error) {
        console.log(`笶・${endpoint}: ERROR (${error instanceof Error ? error.message : 'Unknown'})`);
      }
    }

    // 5. 繧ｵ繝ｳ繝励Ν繝・・繧ｿ蜿冶ｾｼ繝・せ繝茨ｼ医が繝励す繝ｧ繝ｳ・・
    console.log('\n5・鞘Ε 繧ｵ繝ｳ繝励Ν繝・・繧ｿ蜿冶ｾｼ繝・せ繝・..');
    if (process.env.OPENAI_API_KEY) {
      try {
        const sampleData = {
          filename: 'test-sample.txt',
          text: '縺薙ｌ縺ｯ繝・せ繝育畑縺ｮ繧ｵ繝ｳ繝励Ν繝・く繧ｹ繝医〒縺吶ゅお繝ｳ繧ｸ繝ｳ縺ｮ蟋句虚謇矩・↓縺､縺・※隱ｬ譏弱＠縺ｾ縺吶ゅ∪縺壹∫㏍譁吶ち繝ｳ繧ｯ縺ｮ谿矩㍼繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲よｬ｡縺ｫ縲√せ繧ｿ繝ｼ繧ｿ繝ｼ繧ｹ繧､繝・メ繧呈款縺励※繧ｨ繝ｳ繧ｸ繝ｳ繧貞ｧ句虚縺励∪縺吶ゅお繝ｳ繧ｸ繝ｳ縺梧ｭ｣蟶ｸ縺ｫ蟋句虚縺励◆繧峨√が繧､繝ｫ蝨ｧ蜉帙→豌ｴ貂ｩ繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲・,
          tags: ['test', 'engine', 'procedure']
        };

        const response = await fetch(`${baseUrl}/api/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sampleData)
        });

        if (response.ok) {
          const result = await response.json();
          console.log('笨・繧ｵ繝ｳ繝励Ν繝・・繧ｿ蜿冶ｾｼ: OK');
          console.log(`   - 繝峨く繝･繝｡繝ｳ繝・D: ${result.doc_id}`);
          console.log(`   - 繝√Ε繝ｳ繧ｯ謨ｰ: ${result.chunks}`);
          console.log(`   - 蜃ｦ逅・凾髢・ ${result.stats.processingTime}ms`);
        } else {
          console.log('笶・繧ｵ繝ｳ繝励Ν繝・・繧ｿ蜿冶ｾｼ: FAILED');
          const errorData = await response.json().catch(() => ({}));
          console.log(`   繧ｨ繝ｩ繝ｼ: ${errorData.message || response.statusText}`);
        }
      } catch (error) {
        console.log('笶・繧ｵ繝ｳ繝励Ν繝・・繧ｿ蜿冶ｾｼ: ERROR');
        console.log(`   繧ｨ繝ｩ繝ｼ: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    } else {
      console.log('笞・・ OPENAI_API_KEY縺瑚ｨｭ螳壹＆繧後※縺・↑縺・◆繧√√し繝ｳ繝励Ν繝・・繧ｿ蜿冶ｾｼ繝・せ繝医ｒ繧ｹ繧ｭ繝・・縺励∪縺・);
    }

    // 6. 讀懃ｴ｢繝・せ繝茨ｼ医が繝励す繝ｧ繝ｳ・・
    console.log('\n6・鞘Ε 讀懃ｴ｢繝・せ繝・..');
    if (process.env.OPENAI_API_KEY) {
      try {
        const searchQuery = '繧ｨ繝ｳ繧ｸ繝ｳ';
        const response = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(searchQuery)}`);
        
        if (response.ok) {
          const result = await response.json();
          console.log('笨・讀懃ｴ｢繝・せ繝・ OK');
          console.log(`   - 繧ｯ繧ｨ繝ｪ: "${searchQuery}"`);
          console.log(`   - 邨先棡謨ｰ: ${result.stats.totalResults}`);
          console.log(`   - 荳贋ｽ咲ｵ先棡謨ｰ: ${result.stats.topResults}`);
        } else {
          console.log('笶・讀懃ｴ｢繝・せ繝・ FAILED');
          const errorData = await response.json().catch(() => ({}));
          console.log(`   繧ｨ繝ｩ繝ｼ: ${errorData.message || response.statusText}`);
        }
      } catch (error) {
        console.log('笶・讀懃ｴ｢繝・せ繝・ ERROR');
        console.log(`   繧ｨ繝ｩ繝ｼ: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    } else {
      console.log('笞・・ OPENAI_API_KEY縺瑚ｨｭ螳壹＆繧後※縺・↑縺・◆繧√∵､懃ｴ｢繝・せ繝医ｒ繧ｹ繧ｭ繝・・縺励∪縺・);
    }

    console.log('\n脂 RAG繧ｷ繧ｹ繝・Β縺ｮ蜍穂ｽ懃｢ｺ隱阪′螳御ｺ・＠縺ｾ縺励◆・・);
    console.log('\n搭 谺｡縺ｮ繧ｹ繝・ャ繝・');
    console.log('   1. npm run db:migrate 縺ｧ繝・・繧ｿ繝吶・繧ｹ繧貞・譛溷喧');
    console.log('   2. 繧ｵ繝ｼ繝舌・繧定ｵｷ蜍・(npm run dev)');
    console.log('   3. 繝悶Λ繧ｦ繧ｶ縺ｧAPI繧ｨ繝ｳ繝峨・繧､繝ｳ繝医ｒ繝・せ繝・);
    console.log('   4. 繧ｯ繝ｩ繧､繧｢繝ｳ繝・DK繧剃ｽｿ逕ｨ縺励※繝輔Ο繝ｳ繝医お繝ｳ繝峨°繧牙他縺ｳ蜃ｺ縺・);

  } catch (error) {
    console.error('\n笶・繝・せ繝亥ｮ溯｡御ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:', error);
    process.exit(1);
  }
}

// 繧ｹ繧ｯ繝ｪ繝励ヨ縺檎峩謗･螳溯｡後＆繧後◆蝣ｴ蜷医・縺ｿ繝・せ繝医ｒ螳溯｡・
if (import.meta.url === `file://${process.argv[1]}`) {
  testRagSystem();
}

export { testRagSystem };
