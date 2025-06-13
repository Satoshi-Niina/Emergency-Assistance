import { Router } from 'express';
import OpenAI from 'openai';
import { z } from 'zod';
import { db } from '../db';
import { emergencyFlows } from '../db/schema';
import { findRelevantImages } from '../utils/image-matcher';

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateFlowSchema = z.object({
  keyword: z.string().min(1),
});

import fs from 'fs';
import path from 'path';

// 応急処置フロー保存エンドポイントを追加
router.post('/save', async (req, res) => {
  try {
    const flowData = req.body;
    
    if (!flowData || !flowData.id || !flowData.title) {
      return res.status(400).json({ 
        success: false, 
        error: 'フローデータが不正です' 
      });
    }

    // knowledge-base/troubleshootingディレクトリのパス
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(troubleshootingDir)) {
      fs.mkdirSync(troubleshootingDir, { recursive: true });
    }

    // ファイル名を生成（IDベース）
    const fileName = `${flowData.id}.json`;
    const filePath = path.join(troubleshootingDir, fileName);

    // フローデータにメタデータを追加
    const saveData = {
      ...flowData,
      updatedAt: new Date().toISOString(),
      savedAt: new Date().toISOString()
    };

    // JSONファイルとして保存
    fs.writeFileSync(filePath, JSON.stringify(saveData, null, 2), 'utf8');

    // データベースにも保存
    try {
      await db.insert(emergencyFlows).values({
        title: flowData.title,
        steps: flowData.nodes || flowData.steps || [],
        keyword: flowData.description || '',
        createdAt: new Date(),
      });
    } catch (dbError) {
      console.warn('データベース保存でエラーが発生しましたが、ファイル保存は成功しました:', dbError);
    }

    console.log(`応急処置フローを保存しました: ${filePath}`);
    
    res.json({ 
      success: true, 
      message: '応急処置フローが保存されました',
      filePath: filePath,
      fileName: fileName
    });
  } catch (error) {
    console.error('応急処置フロー保存エラー:', error);
    res.status(500).json({ 
      success: false, 
      error: 'フローの保存に失敗しました' 
    });
  }
});

// 応急処置フロー一覧取得エンドポイント
router.get('/list', async (req, res) => {
  try {
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(troubleshootingDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        try {
          const filePath = path.join(troubleshootingDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          
          return {
            id: data.id || file.replace('.json', ''),
            title: data.title || 'タイトル不明',
            description: data.description || '',
            fileName: file,
            createdAt: data.createdAt || data.savedAt || new Date().toISOString(),
            source: 'troubleshooting'
          };
        } catch (error) {
          console.error(`ファイル読み込みエラー: ${file}`, error);
          return null;
        }
      })
      .filter(item => item !== null);

    res.json(files);
  } catch (error) {
    console.error('フロー一覧取得エラー:', error);
    res.status(500).json({ error: 'フロー一覧の取得に失敗しました' });
  }
});

// 特定のフロー詳細取得エンドポイント
router.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'フローが見つかりません' });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    res.json({ data });
  } catch (error) {
    console.error('フロー詳細取得エラー:', error);
    res.status(500).json({ error: 'フローの取得に失敗しました' });
  }
});

// フロー削除エンドポイント
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'ファイルが見つかりません' 
      });
    }

    fs.unlinkSync(filePath);
    
    res.json({ 
      success: true, 
      message: 'フローが削除されました' 
    });
  } catch (error) {
    console.error('フロー削除エラー:', error);
    res.status(500).json({ 
      success: false, 
      error: 'フローの削除に失敗しました' 
    });
  }
});

router.post('/generate-emergency-flow', async (req, res) => {
  try {
    const { keyword } = generateFlowSchema.parse(req.body);

    // Generate flow using GPT
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `あなたは建設機械の故障診断の専門家です。
以下の形式で応急処置フローを生成してください：
1. タイトル：問題の簡潔な説明
2. 手順：具体的な対処方法を順番に説明
各手順は明確で、技術者でも素人でも理解できるように説明してください。`
        },
        {
          role: "user",
          content: `以下の故障状況に対する応急処置フローを生成してください：${keyword}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const flowData = JSON.parse(completion.choices[0].message.content);

    // Find relevant images for each step
    const stepsWithImages = await Promise.all(
      flowData.steps.map(async (step: { description: string }) => {
        const relevantImages = await findRelevantImages(step.description);
        return {
          ...step,
          imageUrl: relevantImages[0]?.url || null,
        };
      })
    );

    const flow = {
      title: flowData.title,
      steps: stepsWithImages,
    };

    // Save to database
    await db.insert(emergencyFlows).values({
      title: flow.title,
      steps: flow.steps,
      keyword,
      createdAt: new Date(),
    });

    res.json(flow);
  } catch (error) {
    console.error('Error generating emergency flow:', error);
    res.status(500).json({ error: 'フローの生成に失敗しました' });
  }
});

export default router; 