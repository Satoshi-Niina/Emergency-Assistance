// ESM蠖｢蠑・- 蠢懈･蠕ｩ譌ｧ繝輔Ο繝ｼ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・// /api/emergency-flow/* 縺ｫ繝槭ャ繝斐Φ繧ｰ

import fs from 'fs';
import { getBlobServiceClient, containerName, norm, upload } from '../../infra/blob.mjs';
import { getOpenAIClient, isOpenAIAvailable } from '../../infra/openai.mjs';
import path from 'path';

// 隍・焚繝代せ繧定ｩｦ縺励※譌｢蟄倥ョ繝ｼ繧ｿ縺ｮ繝励Ξ繝輔ぅ繝・け繧ｹ驕輔＞縺ｫ蟇ｾ蠢・function buildCandidatePaths(fileName, skipNorm = false) {
  const baseName = fileName || '';
  const paths = [
    // 迴ｾ陦・ base莉倥″・・orm縺ｧ knowledge-base/ 縺御ｻ倅ｸ弱＆繧後ｋ・・    skipNorm ? null : norm(`troubleshooting/${baseName}`),
    // 譌ｧ: base縺ｪ縺・    `troubleshooting/${baseName}`,
    // 蠢ｵ縺ｮ縺溘ａ: base繧堤峩譖ｸ縺・    `knowledge-base/troubleshooting/${baseName}`,
  ].filter(Boolean);
  // 驥崎､・賜髯､
  return [...new Set(paths)];
}

async function resolveBlobClient(containerClient, fileName) {
  const candidates = buildCandidatePaths(fileName);
  for (const blobName of candidates) {
    const blobClient = containerClient.getBlobClient(blobName);
    if (await blobClient.exists()) {
      return { blobClient, blobName };
    }
  }
  return null;
}

export default async function emergencyFlowHandler(req, res) {
  const method = req.method;
  const pathParts = req.path.split('/').filter(Boolean);

  // /api/emergency-flow/list
  if (pathParts[2] === 'list' && method === 'GET') {
    try {
      console.log('[api/emergency-flow/list] Fetching flows');
      
      const flows = [];
      const blobServiceClient = getBlobServiceClient();

      if (!blobServiceClient) {
        console.warn('[api/emergency-flow/list] BLOB client not available');
        return res.json({
          success: true,
          data: flows,
          total: flows.length,
          message: 'BLOB storage not available',
          timestamp: new Date().toISOString()
        });
      }

      try {
        const containerClient = blobServiceClient.getContainerClient(containerName);

        const containerExists = await containerClient.exists();
        if (!containerExists) {
          console.error(`[api/emergency-flow/list] Container not found: ${containerName}`);
          return res.json({
            success: true,
            data: flows,
            total: flows.length,
            message: `Container "${containerName}" not found`,
            timestamp: new Date().toISOString()
          });
        }

        // 縺ｾ縺夂樟陦後ヱ繧ｹ・・orm・峨〒蛻玲嫌縺励・莉ｶ縺ｪ繧画立繝代せ繧りｩｦ縺・        const prefixes = [norm('troubleshooting/'), 'troubleshooting/', 'knowledge-base/troubleshooting/'];
        const seen = new Set();

        for (const prefix of prefixes) {
          console.log(`[api/emergency-flow/list] Listing with prefix: ${prefix}`);
          for await (const blob of containerClient.listBlobsFlat({ prefix })) {
            if (!blob.name.endsWith('.json')) continue;
            const fileName = blob.name.split('/').pop();
            if (!fileName) continue;
            if (seen.has(fileName)) continue;
            seen.add(fileName);
            flows.push({
              id: fileName.replace('.json', ''),
              name: fileName,
              fileName,
              blobName: blob.name,
              lastModified: blob.properties.lastModified,
              size: blob.properties.contentLength,
            });
          }
          if (flows.length > 0) break; // 菴輔°蜿悶ｌ縺溘ｉ邨ゆｺ・        }
        
        console.log(`[api/emergency-flow/list] Found ${flows.length} flows`);
      } catch (blobError) {
        console.error('[api/emergency-flow/list] BLOB error:', blobError);
        return res.json({
          success: true,
          data: flows,
          total: flows.length,
          message: 'BLOB error occurred',
          error: blobError.message,
          timestamp: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        data: flows,
        total: flows.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[api/emergency-flow/list] Error:', error);
      return res.status(500).json({
        success: false,
        error: '繝輔Ο繝ｼ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // /api/emergency-flow/:fileName - GET蛟句挨蜿門ｾ・  if (pathParts[2] && !pathParts[2].includes('list') && !pathParts[2].includes('image') && !pathParts[2].includes('save') && method === 'GET') {
    try {
      const fileName = pathParts[2];
      console.log(`[api/emergency-flow] Fetching: ${fileName}`);

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          error: 'BLOB storage not available'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const resolved = await resolveBlobClient(containerClient, fileName);
      if (!resolved) {
        console.warn('[api/emergency-flow] Blob not found for', fileName);
        return res.status(404).json({ success: false, error: '繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
      }

      console.log(`[api/emergency-flow] BLOB path: ${resolved.blobName}`);
      const downloadResponse = await resolved.blobClient.download();
      const contentType = downloadResponse.contentType || 'application/json';

      res.setHeader('Content-Type', contentType);
      downloadResponse.readableStreamBody.pipe(res);
    } catch (error) {
      console.error('[api/emergency-flow] Error:', error);
      return res.status(404).json({
        success: false,
        error: '繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ',
        details: error.message
      });
    }
    return;
  }

  // /api/emergency-flow/save - POST菫晏ｭ・  if (pathParts[2] === 'save' && method === 'POST') {
    try {
      console.log('[api/emergency-flow/save] Saving flow data');

      const { flowData, flowId } = req.body;
      if (!flowData) {
        return res.status(400).json({ 
          success: false, 
          error: 'flowData is required' 
        });
      }

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        console.error('[api/emergency-flow/save] 笶・BLOB service client not available');
        return res.status(503).json({ 
          success: false, 
          error: 'BLOB storage not available' 
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      
      // 繧ｳ繝ｳ繝・リ縺悟ｭ伜惠縺吶ｋ縺狗｢ｺ隱・      const containerExists = await containerClient.exists();
      if (!containerExists) {
        console.log('[api/emergency-flow/save] Creating container:', containerName);
        await containerClient.create();
      }
      
      // 譌｢蟄倥ョ繝ｼ繧ｿ縺ｨ縺ｮ莠呈鋤諤ｧ縺ｮ縺溘ａ base莉倥″縺ｨ縺ｪ縺嶺ｸ｡譁ｹ縺ｧ菫晏ｭ倥ｒ隧ｦ縺ｿ繧・      const blobNamePrimary = norm(`troubleshooting/${flowId || 'flow-' + Date.now()}.json`);
      const blobClientPrimary = containerClient.getBlockBlobClient(blobNamePrimary);

      const content = typeof flowData === 'string' ? flowData : JSON.stringify(flowData, null, 2);

      console.log('[api/emergency-flow/save] 笨・Saving flow data to BLOB');
      console.log('[api/emergency-flow/save]   Container:', containerName);
      console.log('[api/emergency-flow/save]   BLOB path:', blobNamePrimary);
      console.log('[api/emergency-flow/save]   Flow ID:', flowId);

      await blobClientPrimary.upload(content, content.length, {
        blobHTTPHeaders: { blobContentType: 'application/json' }
      });

      console.log(`[api/emergency-flow/save] 笨・Saved successfully to: ${blobNamePrimary}`);

      // base縺ｪ縺励・繝ｬ繝輔ぅ繝・け繧ｹ縺ｫ繧ゅ・繧ｹ繝医お繝輔か繝ｼ繝医〒菫晏ｭ假ｼ域里蟄倥ヵ繧｡繧､繝ｫ讒矩縺ｨ縺ｮ莠呈鋤諤ｧ・・      try {
        const altName = `troubleshooting/${flowId || 'flow-' + Date.now()}.json`;
        const altClient = containerClient.getBlockBlobClient(altName);
        await altClient.upload(content, content.length, {
          blobHTTPHeaders: { blobContentType: 'application/json' }
        });
        console.log(`[api/emergency-flow/save] Also saved to: ${altName}`);
      } catch (altErr) {
        console.warn('[api/emergency-flow/save] Alt prefix save skipped:', altErr.message);
      }

      return res.json({
        success: true,
        message: 'Flow data saved successfully',
        blobName: blobNamePrimary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[api/emergency-flow/save] Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // /api/emergency-flow/upload-image - POST逕ｻ蜒上い繝・・繝ｭ繝ｼ繝・  if (pathParts[2] === 'upload-image' && method === 'POST') {
    // multer繝溘ラ繝ｫ繧ｦ繧ｧ繧｢繧呈焔蜍輔〒驕ｩ逕ｨ
    return upload.single('image')(req, res, async (err) => {
      if (err) {
        console.error('[api/emergency-flow/upload-image] Upload error:', err);
        return res.status(500).json({
          success: false,
          error: '繝輔ぃ繧､繝ｫ縺ｮ繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆',
          details: err.message
        });
      }

      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: '繝輔ぃ繧､繝ｫ縺後い繝・・繝ｭ繝ｼ繝峨＆繧後※縺・∪縺帙ｓ'
          });
        }

        console.log('[api/emergency-flow/upload-image] Uploading:', {
          fileName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        });

        const timestamp = Date.now();
        const ext = path.extname(req.file.originalname);
        const fileName = `emergency_flow_${timestamp}${ext}`;
        const blobServiceClient = getBlobServiceClient();

        // 髢狗匱迺ｰ蠅・ BLOB縺悟茜逕ｨ縺ｧ縺阪↑縺・ｴ蜷医・繝ｭ繝ｼ繧ｫ繝ｫ菫晏ｭ・        if (!blobServiceClient) {
          console.warn('[api/emergency-flow/upload-image] BLOB unavailable, saving locally');
          const fs = await import('fs');
          const localDir = path.join(process.cwd(), 'knowledge-base', 'images', 'emergency-flows');
          
          if (!fs.existsSync(localDir)) {
            fs.mkdirSync(localDir, { recursive: true });
          }
          
          const localPath = path.join(localDir, fileName);
          fs.writeFileSync(localPath, req.file.buffer);
          
          console.log('[api/emergency-flow/upload-image] Saved locally:', localPath);
          const imageUrl = `/api/images/emergency-flows/${fileName}`;
          
          return res.json({
            success: true,
            imageUrl: imageUrl,
            fileName: fileName,
            size: req.file.size,
            storage: 'local'
          });
        }

        // 譛ｬ逡ｪ迺ｰ蠅・ BLOB縺ｫ菫晏ｭ・        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobName = `knowledge-base/images/emergency-flows/${fileName}`;
        console.log('[api/emergency-flow/upload-image] Uploading to Blob:', blobName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        const containerExists = await containerClient.exists();
        if (!containerExists) {
          await containerClient.createIfNotExists();
        }

        await blockBlobClient.uploadData(req.file.buffer, {
          blobHTTPHeaders: {
            blobContentType: req.file.mimetype
          },
          metadata: {
            originalName: req.file.originalname,
            uploadedAt: new Date().toISOString()
          }
        });

        console.log(`[api/emergency-flow/upload-image] Uploaded: ${blobName}`);

        const imageUrl = `/api/images/emergency-flows/${fileName}`;

        return res.json({
          success: true,
          imageUrl: imageUrl,
          fileName: fileName,
          blobName: blobName,
          size: req.file.size,
          storage: 'blob'
        });
      } catch (error) {
        console.error('[api/emergency-flow/upload-image] Error:', error);
        return res.status(500).json({
          success: false,
          error: '逕ｻ蜒上・繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆',
          details: error.message
        });
      }
    });
  }

  // /api/emergency-flow/image/:fileName - DELETE逕ｻ蜒丞炎髯､
  if (pathParts[2] === 'image' && pathParts[3] && method === 'DELETE') {
    try {
      const fileName = pathParts[3];
      console.log('[api/emergency-flow/delete-image] Deleting:', fileName);

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          error: 'BLOB storage not available'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobName = `knowledge-base/images/emergency-flows/${fileName}`;
      const blobClient = containerClient.getBlobClient(blobName);

      const exists = await blobClient.exists();
      if (!exists) {
        console.log('[api/emergency-flow/delete-image] Image not found:', blobName);
        return res.status(404).json({
          success: false,
          error: '逕ｻ蜒上′隕九▽縺九ｊ縺ｾ縺帙ｓ'
        });
      }

      await blobClient.delete();
      console.log(`[api/emergency-flow/delete-image] Deleted: ${blobName}`);

      return res.json({
        success: true,
        message: '逕ｻ蜒上ｒ蜑企勁縺励∪縺励◆',
        deletedFile: fileName
      });
    } catch (error) {
      console.error('[api/emergency-flow/delete-image] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // /api/emergency-flow/generate - POST繝輔Ο繝ｼ逕滓・・・PT邨ｱ蜷茨ｼ・  if (pathParts[2] === 'generate' && method === 'POST') {
    try {
      const { keyword } = req.body;
      console.log('[api/emergency-flow/generate] Generate request:', keyword);

      if (!keyword) {
        return res.status(400).json({
          success: false,
          error: '繧ｭ繝ｼ繝ｯ繝ｼ繝峨′蠢・ｦ√〒縺・
        });
      }

      const timestamp = Date.now();
      const flowId = `flow_${timestamp}`;
      let flowTemplate;

      // OpenAI API繧剃ｽｿ逕ｨ縺励※繝輔Ο繝ｼ逕滓・
      if (isOpenAIAvailable) {
        console.log('[api/emergency-flow/generate] ､・Using OpenAI to generate flow for keyword:', keyword);
        const openai = getOpenAIClient();

        const prompt = `蟒ｺ險ｭ讖滓｢ｰ縺ｮ蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧谷SON蠖｢蠑上〒逕滓・縺励※縺上□縺輔＞縲・繧ｭ繝ｼ繝ｯ繝ｼ繝・ ${keyword}

莉･荳九・讒矩縺ｧJSON繧堤函謌舌＠縺ｦ縺上□縺輔＞:
{
  "title": "繝輔Ο繝ｼ縺ｮ繧ｿ繧､繝医Ν・・{keyword}縺ｫ髢｢騾｣・・,
  "description": "繝輔Ο繝ｼ縺ｮ隱ｬ譏・,
  "triggerKeywords": ["${keyword}", "髢｢騾｣繧ｭ繝ｼ繝ｯ繝ｼ繝・", "髢｢騾｣繧ｭ繝ｼ繝ｯ繝ｼ繝・"],
  "steps": [
    {
      "id": "step1",
      "type": "step",
      "title": "繧ｹ繝・ャ繝励・繧ｿ繧､繝医Ν",
      "description": "隧ｳ邏ｰ縺ｪ隱ｬ譏・,
      "message": "菴懈･ｭ閠・∈縺ｮ繝｡繝・そ繝ｼ繧ｸ",
      "nextStep": "step2"
    },
    {
      "id": "step2",
      "type": "decision",
      "title": "蛻､譁ｭ繝昴う繝ｳ繝・,
      "description": "迥ｶ豕∝愛譁ｭ縺ｮ隱ｬ譏・,
      "message": "蛻､譁ｭ繝｡繝・そ繝ｼ繧ｸ",
      "options": [
        { "label": "驕ｸ謚櫁い1", "nextStep": "step3" },
        { "label": "驕ｸ謚櫁い2", "nextStep": "step4" }
      ]
    }
  ]
}

豕ｨ諢丈ｺ矩・
- step繧ｿ繧､繝・ 騾壼ｸｸ縺ｮ菴懈･ｭ繧ｹ繝・ャ繝暦ｼ・extStep縺ｧ谺｡縺ｮ繧ｹ繝・ャ繝悠D繧呈欠螳夲ｼ・- decision繧ｿ繧､繝・ 蛻､譁ｭ蛻・ｲ舌・繧､繝ｳ繝茨ｼ・ptions縺ｧ驕ｸ謚櫁い繧呈署萓幢ｼ・- 譛邨ゅせ繝・ャ繝励・nextStep縺ｯ "complete" 縺ｫ縺吶ｋ
- 螳牙・遒ｺ隱阪∫裸迥ｶ遒ｺ隱阪∝ｿ懈･蜃ｦ鄂ｮ縲∝ｱ蜻翫・豬√ｌ繧貞性繧√ｋ
- 蟒ｺ險ｭ讖滓｢ｰ縺ｮ蟆る摩逕ｨ隱槭ｒ菴ｿ逕ｨ縺励∝ｮ溯ｷｵ逧・↑蜀・ｮｹ縺ｫ縺吶ｋ`;

        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: '縺ゅ↑縺溘・蟒ｺ險ｭ讖滓｢ｰ縺ｮ菫晏ｮ医・繝｡繝ｳ繝・リ繝ｳ繧ｹ縺ｮ蟆る摩螳ｶ縺ｧ縺吶ょｮ牙・縺ｧ螳溯ｷｵ逧・↑蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧堤函謌舌＠縺ｦ縺上□縺輔＞縲・
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          });

          const gptResponse = completion.choices[0].message.content;
          console.log('[api/emergency-flow/generate] 笨・GPT response received');
          
          const parsedFlow = JSON.parse(gptResponse);
          
          flowTemplate = {
            id: flowId,
            title: parsedFlow.title || keyword,
            description: parsedFlow.description || `繧ｭ繝ｼ繝ｯ繝ｼ繝峨・{keyword}縲阪°繧芽・蜍慕函謌舌＆繧後◆蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ`,
            triggerKeywords: parsedFlow.triggerKeywords || [keyword],
            steps: parsedFlow.steps || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            generatedBy: 'GPT-4'
          };

          console.log('[api/emergency-flow/generate] 笨・Flow generated with', flowTemplate.steps.length, 'steps');
        } catch (gptError) {
          console.error('[api/emergency-flow/generate] 笶・GPT generation failed:', gptError.message);
          // GPT螟ｱ謨玲凾縺ｯ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
          flowTemplate = createFallbackTemplate(flowId, keyword);
        }
      } else {
        console.warn('[api/emergency-flow/generate] 笞・・OpenAI not available, using fallback template');
        flowTemplate = createFallbackTemplate(flowId, keyword);
      }

      // 肌 逕滓・縺励◆繝輔Ο繝ｼ繧定・蜍慕噪縺ｫBLOB縺ｫ菫晏ｭ・      const blobServiceClient = getBlobServiceClient();
      
      if (blobServiceClient) {
        try {
          const containerClient = blobServiceClient.getContainerClient(containerName);
          
          // 繧ｳ繝ｳ繝・リ縺悟ｭ伜惠縺吶ｋ縺狗｢ｺ隱阪＠縲√↑縺代ｌ縺ｰ菴懈・
          const containerExists = await containerClient.exists();
          if (!containerExists) {
            console.log('[api/emergency-flow/generate] Creating container:', containerName);
            await containerClient.create();
          }
          
          const fileName = `${flowId}.json`;
          const blobName = norm(`troubleshooting/${fileName}`);
          
          console.log('[api/emergency-flow/generate] 笨・Saving generated flow to BLOB');
          console.log('[api/emergency-flow/generate]   Container:', containerName);
          console.log('[api/emergency-flow/generate]   BLOB path:', blobName);
          console.log('[api/emergency-flow/generate]   File name:', fileName);
          
          const blockBlobClient = containerClient.getBlockBlobClient(blobName);
          const content = JSON.stringify(flowTemplate, null, 2);
          
          await blockBlobClient.upload(content, content.length, {
            blobHTTPHeaders: { blobContentType: 'application/json' },
            metadata: {
              generatedFrom: 'keyword',
              keyword: keyword,
              createdAt: new Date().toISOString()
            }
          });
          
          console.log('[api/emergency-flow/generate] 笨・Flow saved successfully to BLOB:', blobName);
          
          return res.json({
            success: true,
            data: flowTemplate,
            saved: true,
            blobName: blobName,
            fileName: fileName,
            message: `繝輔Ο繝ｼ繧堤函謌舌＠縺ｦBLOB縺ｫ菫晏ｭ倥＠縺ｾ縺励◆ (${blobName})`
          });
        } catch (blobError) {
          console.error('[api/emergency-flow/generate] 笶・BLOB save failed:', blobError);
          console.error('[api/emergency-flow/generate] Error details:', blobError.stack);
          // BLOB菫晏ｭ倥↓螟ｱ謨励＠縺ｦ繧ゅヵ繝ｭ繝ｼ繝・・繧ｿ縺ｯ霑斐☆
          return res.json({
            success: true,
            data: flowTemplate,
            saved: false,
            warning: '繝輔Ο繝ｼ繧堤函謌舌＠縺ｾ縺励◆縺後∽ｿ晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆',
            error: blobError.message,
            errorStack: blobError.stack
          });
        }
      } else {
        console.warn('[api/emergency-flow/generate] 笞・・BLOB client not available');
        return res.json({
          success: true,
          data: flowTemplate,
          saved: false,
          warning: 'BLOB storage not available - please check AZURE_STORAGE_CONNECTION_STRING'
        });
      }
    } catch (error) {
      console.error('[api/emergency-flow/generate] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // /api/emergency-flow/:id - PUT譖ｴ譁ｰ・育ｷｨ髮・ｾ後・蟾ｮ蛻・ｸ頑嶌縺搾ｼ・  if (pathParts[2] && method === 'PUT') {
    try {
      const flowId = pathParts[2].replace('.json', '');
      const fileName = flowId.endsWith('.json') ? flowId : `${flowId}.json`;
      const flowData = req.body;

      console.log('[api/emergency-flow/PUT] Updating flow:', flowId);

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          error: 'BLOB storage not available'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      
      // 譌｢蟄倥・BLOB繧呈爾縺・      const resolved = await resolveBlobClient(containerClient, fileName);
      
      if (!resolved) {
        return res.status(404).json({
          success: false,
          error: '繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
        });
      }

      // updatedAt繧呈峩譁ｰ
      const updatedFlowData = {
        ...flowData,
        updatedAt: new Date().toISOString()
      };

      // 逕ｻ蜒乗焚繧偵Ο繧ｰ蜃ｺ蜉・      const imageCount = updatedFlowData.steps?.reduce((count, step) => {
        return count + (step.images?.length || 0);
      }, 0) || 0;

      console.log(`[api/emergency-flow/PUT] Flow has ${imageCount} images`);

      const content = JSON.stringify(updatedFlowData, null, 2);

      // 蟾ｮ蛻・〒荳頑嶌縺堺ｿ晏ｭ假ｼ域里蟄倥ョ繝ｼ繧ｿ繧貞ｮ悟・縺ｫ鄂ｮ縺肴鋤縺茨ｼ・      const blockBlobClient = containerClient.getBlockBlobClient(resolved.blobName);
      await blockBlobClient.upload(content, content.length, {
        blobHTTPHeaders: { blobContentType: 'application/json' },
        metadata: {
          lastModified: new Date().toISOString(),
          flowId: flowId
        }
      });

      console.log(`[api/emergency-flow/PUT] 笨・Updated successfully: ${resolved.blobName}`);

      return res.json({
        success: true,
        message: '繝輔Ο繝ｼ繧呈峩譁ｰ縺励∪縺励◆',
        data: updatedFlowData,
        blobName: resolved.blobName,
        imageCount: imageCount
      });
    } catch (error) {
      console.error('[api/emergency-flow/PUT] 笶・Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // /api/emergency-flow/:id - DELETE蜑企勁
  if (pathParts[2] && method === 'DELETE') {
    try {
      const fileName = pathParts[2];
      console.log('[api/emergency-flow/delete] Deleting:', fileName);

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          error: 'BLOB storage not available'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const resolved = await resolveBlobClient(containerClient, fileName);

      if (!resolved) {
        return res.status(404).json({
          success: false,
          error: '繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
        });
      }

      // JSON繧偵ム繧ｦ繝ｳ繝ｭ繝ｼ繝峨＠縺ｦ逕ｻ蜒上ヵ繧｡繧､繝ｫ蜷阪ｒ蜿門ｾ・      let imagesToDelete = [];
      try {
        const downloadResponse = await resolved.blobClient.download();
        if (downloadResponse.readableStreamBody) {
          const chunks = [];
          for await (const chunk of downloadResponse.readableStreamBody) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const buffer = Buffer.concat(chunks);
          const jsonData = JSON.parse(buffer.toString('utf-8'));
          
          // steps驟榊・縺九ｉ逕ｻ蜒上ｒ謚ｽ蜃ｺ
          if (Array.isArray(jsonData.steps)) {
            jsonData.steps.forEach(step => {
              if (step.images && Array.isArray(step.images)) {
                step.images.forEach(image => {
                  if (image.fileName) {
                    imagesToDelete.push(image.fileName);
                  }
                });
              }
            });
          }
        }
      } catch (parseError) {
        console.warn('[api/emergency-flow/delete] Could not parse JSON for image cleanup:', parseError.message);
      }

      // 髢｢騾｣逕ｻ蜒上ｒ蜑企勁
      if (imagesToDelete.length > 0) {
        console.log(`[api/emergency-flow/delete] Deleting ${imagesToDelete.length} related images`);
        for (const imageFileName of imagesToDelete) {
          try {
            const imageBlobName = `knowledge-base/images/emergency-flows/${imageFileName}`;
            const imageBlob = containerClient.getBlockBlobClient(imageBlobName);
            const exists = await imageBlob.exists();
            if (exists) {
              await imageBlob.delete();
              console.log(`[api/emergency-flow/delete] Deleted image: ${imageFileName}`);
            }
          } catch (imgError) {
            console.warn(`[api/emergency-flow/delete] Failed to delete image ${imageFileName}:`, imgError.message);
          }
        }
      }

      // JSON繝輔ぃ繧､繝ｫ繧貞炎髯､
      await resolved.blobClient.delete();
      console.log(`[api/emergency-flow/delete] Deleted JSON: ${resolved.blobName}`);

      return res.json({
        success: true,
        message: '蜑企勁縺励∪縺励◆',
        deletedFile: fileName,
        deletedImages: imagesToDelete.length
      });
    } catch (error) {
      console.error('[api/emergency-flow/delete] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  return res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
}

// 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ繝・Φ繝励Ξ繝ｼ繝育函謌宣未謨ｰ
function createFallbackTemplate(flowId, keyword) {
  return {
    id: flowId,
    title: keyword,
    description: `繧ｭ繝ｼ繝ｯ繝ｼ繝峨・{keyword}縲阪°繧芽・蜍慕函謌舌＆繧後◆蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ`,
    triggerKeywords: [keyword],
    steps: [
      {
        id: 'step1',
        type: 'step',
        title: '螳牙・遒ｺ隱・,
        description: '菴懈･ｭ繧ｨ繝ｪ繧｢縺ｮ螳牙・繧堤｢ｺ隱阪＠縲∝ｿ・ｦ√↑菫晁ｭｷ蜈ｷ繧堤捩逕ｨ縺励※縺上□縺輔＞縲・,
        message: '菴懈･ｭ繧ｨ繝ｪ繧｢縺ｮ螳牙・繧堤｢ｺ隱阪＠縲∝ｿ・ｦ√↑菫晁ｭｷ蜈ｷ繧堤捩逕ｨ縺励※縺上□縺輔＞縲・,
        nextStep: 'step2'
      },
      {
        id: 'step2',
        type: 'step',
        title: '逞・憾縺ｮ遒ｺ隱・,
        description: `${keyword}縺ｮ逞・憾繧定ｩｳ縺励￥遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲Ａ,
        message: `${keyword}縺ｮ逞・憾繧定ｩｳ縺励￥遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲Ａ,
        nextStep: 'step3'
      },
      {
        id: 'step3',
        type: 'decision',
        title: '迥ｶ豕∝愛譁ｭ',
        description: '迴ｾ蝨ｨ縺ｮ迥ｶ豕√ｒ驕ｸ謚槭＠縺ｦ縺上□縺輔＞縲・,
        message: '迴ｾ蝨ｨ縺ｮ迥ｶ豕√ｒ驕ｸ謚槭＠縺ｦ縺上□縺輔＞縲・,
        options: [
          { label: '霆ｽ蠕ｮ縺ｪ蝠城｡・, nextStep: 'step4' },
          { label: '豺ｱ蛻ｻ縺ｪ蝠城｡・, nextStep: 'step5' },
          { label: '邱頑･蟇ｾ蠢懷ｿ・ｦ・, nextStep: 'step6' },
          { label: '荳肴・', nextStep: 'step7' }
        ]
      },
      {
        id: 'step4',
        type: 'step',
        title: '蠢懈･蜃ｦ鄂ｮ',
        description: '蝓ｺ譛ｬ逧・↑轤ｹ讀懊→隱ｿ謨ｴ繧定｡後▲縺ｦ縺上□縺輔＞縲・,
        message: '蝓ｺ譛ｬ逧・↑轤ｹ讀懊→隱ｿ謨ｴ繧定｡後▲縺ｦ縺上□縺輔＞縲・,
        nextStep: 'complete'
      },
      {
        id: 'step5',
        type: 'step',
        title: '隧ｳ邏ｰ轤ｹ讀・,
        description: '隧ｳ邏ｰ縺ｪ轤ｹ讀懊ｒ螳滓命縺励∝撫鬘檎ｮ・園繧堤音螳壹＠縺ｦ縺上□縺輔＞縲・,
        message: '隧ｳ邏ｰ縺ｪ轤ｹ讀懊ｒ螳滓命縺励∝撫鬘檎ｮ・園繧堤音螳壹＠縺ｦ縺上□縺輔＞縲・,
        nextStep: 'step8'
      },
      {
        id: 'step6',
        type: 'step',
        title: '邱頑･蟇ｾ蠢・,
        description: '逶ｴ縺｡縺ｫ蟆る摩謚陦楢・↓騾｣邨｡縺励∵欠遉ｺ繧剃ｻｰ縺・〒縺上□縺輔＞縲・,
        message: '逶ｴ縺｡縺ｫ蟆る摩謚陦楢・↓騾｣邨｡縺励∵欠遉ｺ繧剃ｻｰ縺・〒縺上□縺輔＞縲・,
        nextStep: 'complete'
      },
      {
        id: 'step7',
        type: 'step',
        title: '蟆る摩螳ｶ縺ｸ縺ｮ逶ｸ隲・,
        description: '蛻､譁ｭ縺悟峅髮｣縺ｪ蝣ｴ蜷医・縲∝ｰる摩謚陦楢・↓騾｣邨｡縺励※縺上□縺輔＞縲・,
        message: '蛻､譁ｭ縺悟峅髮｣縺ｪ蝣ｴ蜷医・縲∝ｰる摩謚陦楢・↓騾｣邨｡縺励※縺上□縺輔＞縲・,
        nextStep: 'complete'
      },
      {
        id: 'step8',
        type: 'step',
        title: '蝣ｱ蜻・,
        description: '遒ｺ隱阪＠縺溷・螳ｹ繧定ｨ倬鹸縺励・未菫り・↓蝣ｱ蜻翫＠縺ｦ縺上□縺輔＞縲・,
        message: '遒ｺ隱阪＠縺溷・螳ｹ繧定ｨ倬鹸縺励・未菫り・↓蝣ｱ蜻翫＠縺ｦ縺上□縺輔＞縲・,
        nextStep: 'complete'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    generatedBy: 'Fallback Template'
  };
}

export const methods = ['get', 'post', 'put', 'delete'];
    try {
      const flowId = pathParts[2].replace('.json', '');
      const fileName = flowId.endsWith('.json') ? flowId : `${flowId}.json`;
      const flowData = req.body;

      console.log('[api/emergency-flow/PUT] Updating flow:', flowId);

      const blobServiceClient = getBlobServiceClient();
      if (!blobServiceClient) {
        return res.status(503).json({
          success: false,
          error: 'BLOB storage not available'
        });
      }

      const containerClient = blobServiceClient.getContainerClient(containerName);
      
      // 譌｢蟄倥・BLOB繧呈爾縺・      const resolved = await resolveBlobClient(containerClient, fileName);
      
      if (!resolved) {
        return res.status(404).json({
          success: false,
          error: '繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'
        });
      }