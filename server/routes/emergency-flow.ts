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
    console.log('🔄 フロー保存リクエストを受信:', {
      id: flowData?.id,
      title: flowData?.title,
      hasNodes: !!flowData?.nodes,
      hasSteps: !!flowData?.steps
    });
    
    if (!flowData || !flowData.id || !flowData.title) {
      console.error('❌ 無効なフローデータ:', flowData);
      return res.status(400).json({ 
        success: false, 
        error: 'フローデータが不正です（id、titleが必要）' 
      });
    }

    // knowledge-base/troubleshootingディレクトリのパス
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    console.log('📁 保存先ディレクトリ:', troubleshootingDir);
    
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(troubleshootingDir)) {
      console.log('📁 ディレクトリを作成します:', troubleshootingDir);
      fs.mkdirSync(troubleshootingDir, { recursive: true });
    } else {
      console.log('✅ ディレクトリは既に存在します');
      // 既存ファイル一覧を表示
      const existingFiles = fs.readdirSync(troubleshootingDir);
      console.log('📂 既存ファイル一覧:', existingFiles);
    }

    // ファイル名を生成（IDベース）
    const fileName = `${flowData.id}.json`;
    const filePath = path.join(troubleshootingDir, fileName);
    console.log('💾 保存ファイルパス:', filePath);

    // フローデータにメタデータを追加
    const saveData = {
      ...flowData,
      updatedAt: new Date().toISOString(),
      savedAt: new Date().toISOString()
    };

    // JSONファイルとして保存
    try {
      fs.writeFileSync(filePath, JSON.stringify(saveData, null, 2), 'utf8');
      console.log('✅ ファイル保存成功:', filePath);
      
      // ファイルが実際に存在することを確認
      if (fs.existsSync(filePath)) {
        const fileStats = fs.statSync(filePath);
        console.log('📊 保存されたファイル情報:', {
          path: filePath,
          size: fileStats.size,
          modified: fileStats.mtime
        });
        
        // 保存後のディレクトリ一覧を表示
        const updatedFiles = fs.readdirSync(troubleshootingDir);
        console.log('📂 保存後のディレクトリ内容:', updatedFiles);
        
        // 保存されたファイルの内容を読み返して確認
        const savedContent = fs.readFileSync(filePath, 'utf8');
        const parsedContent = JSON.parse(savedContent);
        console.log('✅ 保存されたデータの確認:', {
          id: parsedContent.id,
          title: parsedContent.title,
          fileSize: savedContent.length
        });
      } else {
        throw new Error('ファイルが保存されませんでした');
      }
    } catch (fileError) {
      console.error('❌ ファイル保存エラー:', fileError);
      throw fileError;
    }

    // データベースにも保存
    try {
      await db.insert(emergencyFlows).values({
        title: flowData.title,
        steps: flowData.nodes || flowData.steps || [],
        keyword: flowData.description || '',
        createdAt: new Date(),
      });
      console.log('✅ データベース保存成功');
    } catch (dbError) {
      console.warn('⚠️ データベース保存でエラーが発生しましたが、ファイル保存は成功しました:', dbError);
    }

    console.log(`🎉 応急処置フローを保存しました: ${filePath}`);
    
    res.json({ 
      success: true, 
      message: '応急処置フローが保存されました',
      filePath: filePath,
      fileName: fileName
    });
  } catch (error) {
    console.error('❌ 応急処置フロー保存エラー:', error);
    res.status(500).json({ 
      success: false, 
      error: `フローの保存に失敗しました: ${error.message}` 
    });
  }
});

// 応急処置フロー一覧取得エンドポイント
router.get('/list', async (req, res) => {
  try {
    // キャッシュ無効化ヘッダーを設定
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    console.log('🔍 一覧取得: troubleshootingDir =', troubleshootingDir);
    
    if (!fs.existsSync(troubleshootingDir)) {
      console.log('📁 ディレクトリが存在しません:', troubleshootingDir);
      // ディレクトリが存在しない場合は作成
      fs.mkdirSync(troubleshootingDir, { recursive: true });
      return res.json([]);
    }

    const allFiles = fs.readdirSync(troubleshootingDir);
    console.log('📂 ディレクトリ内の全ファイル:', allFiles);

    const jsonFiles = allFiles.filter(file => file.endsWith('.json'));
    console.log('📋 JSONファイル一覧:', jsonFiles);

    const files = jsonFiles
      .map(file => {
        try {
          const filePath = path.join(troubleshootingDir, file);
          console.log(`📖 ファイル読み込み中: ${filePath}`);
          
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          console.log(`✅ ファイル読み込み成功: ${file}`, {
            id: data.id,
            title: data.title,
            hasSteps: !!data.steps,
            hasNodes: !!data.nodes
          });
          
          return {
            id: data.id || file.replace('.json', ''),
            title: data.title || 'タイトル不明',
            description: data.description || '',
            fileName: file,
            createdAt: data.createdAt || data.savedAt || data.updatedAt || new Date().toISOString(),
            source: 'troubleshooting'
          };
        } catch (error) {
          console.error(`❌ ファイル読み込みエラー: ${file}`, error);
          return null;
        }
      })
      .filter(item => item !== null);

    console.log(`📊 最終結果: ${files.length}個のフローを取得`);
    res.json(files);
  } catch (error) {
    console.error('❌ フロー一覧取得エラー:', error);
    res.status(500).json({ error: 'フロー一覧の取得に失敗しました' });
  }
});

// 特定のフロー詳細取得エンドポイント
router.get('/detail/:id', async (req, res) => {
  try {
    // キャッシュ無効化ヘッダーを設定
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
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