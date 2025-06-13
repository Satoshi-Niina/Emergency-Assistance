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

    // 既存ファイルが存在する場合、その構造を読み込んで保持
    let existingData = {};
    if (fs.existsSync(filePath)) {
      try {
        const existingContent = fs.readFileSync(filePath, 'utf8');
        existingData = JSON.parse(existingContent);
        console.log('🔄 既存データを読み込み:', {
          id: existingData.id,
          hasSteps: !!existingData.steps,
          stepsCount: existingData.steps?.length || 0,
          hasNodes: !!existingData.nodes,
          nodeCount: existingData.nodes?.length || 0
        });
      } catch (error) {
        console.warn('⚠️ 既存ファイルの読み込みでエラー:', error);
      }
    }

    // フローデータを正しい形式で保存（条件分岐情報を確実に保持）
    const saveData = {
      id: flowData.id || existingData.id,
      title: flowData.title,
      description: flowData.description || existingData.description || '',
      triggerKeywords: flowData.triggerKeywords || existingData.triggerKeywords || [],
      steps: flowData.steps || [], // 条件分岐の詳細情報を含むsteps
      nodes: flowData.nodes || [], // ReactFlowエディタ用のノード情報を保持
      edges: flowData.edges || [], // ReactFlowエディタ用のエッジ情報を保持
      updatedAt: new Date().toISOString(),
      savedAt: new Date().toISOString(),
      savedTimestamp: flowData.savedTimestamp || Date.now(),
      // 条件分岐の情報を明示的に保存
      conditionBranches: flowData.conditionBranches || [],
      // 既存の他のメタデータも保持
      ...(existingData.createdAt && { createdAt: existingData.createdAt })
    };

    // 条件分岐情報の保存確認ログ
    const conditionStepsCount = saveData.steps.filter(step => 
      step.yesCondition || step.noCondition || step.otherCondition
    ).length;
    
    console.log(`🔀 保存される条件分岐情報:`, {
      totalSteps: saveData.steps.length,
      conditionSteps: conditionStepsCount,
      conditionBranches: saveData.conditionBranches.length,
      savedTimestamp: saveData.savedTimestamp
    });

    // JSONファイルとして保存
    try {
      // 保存前にバックアップを作成
      if (fs.existsSync(filePath)) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        fs.copyFileSync(filePath, backupPath);
        console.log('💾 バックアップ作成:', backupPath);
      }

      // 原子的書き込み（一時ファイル経由）
      const tempFilePath = `${filePath}.tmp.${Date.now()}`;
      const saveDataString = JSON.stringify(saveData, null, 2);
      
      fs.writeFileSync(tempFilePath, saveDataString, 'utf8');
      
      // 一時ファイルが正常に書き込まれた場合のみ、元ファイルを置き換え
      if (fs.existsSync(tempFilePath)) {
        fs.renameSync(tempFilePath, filePath);
        console.log('✅ 原子的ファイル保存成功:', filePath);
      } else {
        throw new Error('一時ファイルの作成に失敗しました');
      }
      
      // ファイルが実際に存在することを確認
      if (fs.existsSync(filePath)) {
        const fileStats = fs.statSync(filePath);
        console.log('📊 保存されたファイル情報:', {
          path: filePath,
          size: fileStats.size,
          modified: fileStats.mtime,
          saveTimestamp: saveData.savedTimestamp || 'N/A'
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
          fileSize: savedContent.length,
          stepCount: parsedContent.steps?.length || 0,
          nodeCount: parsedContent.nodes?.length || 0,
          edgeCount: parsedContent.edges?.length || 0,
          savedTimestamp: parsedContent.savedTimestamp
        });
      } else {
        throw new Error('ファイルが保存されませんでした');
      }

      // 古いバックアップファイルのクリーンアップ（最新5つまで保持）
      try {
        const backupFiles = fs.readdirSync(troubleshootingDir)
          .filter(file => file.startsWith(`${flowData.id}.json.backup.`))
          .sort((a, b) => {
            const timeA = parseInt(a.split('.backup.')[1] || '0');
            const timeB = parseInt(b.split('.backup.')[1] || '0');
            return timeB - timeA; // 新しい順
          });

        if (backupFiles.length > 5) {
          const filesToDelete = backupFiles.slice(5);
          filesToDelete.forEach(file => {
            try {
              fs.unlinkSync(path.join(troubleshootingDir, file));
              console.log('🗑️ 古いバックアップを削除:', file);
            } catch (err) {
              console.warn('⚠️ バックアップ削除エラー:', err);
            }
          });
        }
      } catch (cleanupError) {
        console.warn('⚠️ バックアップクリーンアップエラー:', cleanupError);
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
    
    // キャッシュ無効化のためのヘッダーを設定
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toUTCString()
    });
    
    res.json({ 
      success: true, 
      message: '応急処置フローが保存されました',
      filePath: filePath,
      fileName: fileName,
      savedAt: new Date().toISOString()
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

// 特定のフロー詳細取得エンドポイント（条件分岐情報を含む完全なデータ取得）
router.get('/:id', async (req, res) => {
  try {
    // 最強のキャッシュ無効化ヘッダーを設定
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
      'Pragma': 'no-cache',
      'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${timestamp}-${randomId}"`,
      'X-Accel-Expires': '0',
      'Vary': '*',
      'X-Fresh-Data': 'true'
    });
    
    const { id } = req.params;
    console.log(`🔄 [${timestamp}] フロー詳細取得開始: ID=${id}`);
    
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    const filePath = path.join(troubleshootingDir, `${id}.json`);
    
    console.log(`📁 ファイルパス: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ ファイルが存在しません: ${filePath}`);
      return res.status(404).json({ error: 'フローが見つかりません' });
    }

    // ファイルの最新統計情報を取得
    const stats = fs.statSync(filePath);
    console.log(`📊 ファイル情報:`, {
      size: stats.size,
      mtime: stats.mtime.toISOString(),
      path: filePath,
      requestTimestamp: timestamp
    });

    // ファイル内容を強制的に再読み込み（条件分岐情報を含む）
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`📄 ファイル内容のサイズ: ${content.length}文字`);
    
    const rawData = JSON.parse(content);
    
    // 条件分岐情報の確認とログ出力
    const conditionSteps = rawData.steps?.filter(step => 
      step.yesCondition || step.noCondition || step.otherCondition
    ) || [];
    
    console.log(`🔀 条件分岐ステップの確認:`, {
      totalSteps: rawData.steps?.length || 0,
      conditionSteps: conditionSteps.length,
      conditions: conditionSteps.map(step => ({
        id: step.id,
        yesCondition: !!step.yesCondition,
        noCondition: !!step.noCondition,
        otherCondition: !!step.otherCondition
      }))
    });
    
    // データの完全性をチェック（条件分岐情報を確実に含む）
    const responseData = {
      ...rawData,
      loadedAt: new Date().toISOString(),
      fileModified: stats.mtime.toISOString(),
      requestId: `${timestamp}-${randomId}`,
      // 条件分岐情報を明示的に保持
      conditionBranchesCount: conditionSteps.length,
      hasConditionBranches: conditionSteps.length > 0
    };
    
    console.log(`✅ 完全データ解析成功:`, {
      id: responseData.id,
      title: responseData.title,
      stepsCount: responseData.steps?.length || 0,
      nodesCount: responseData.nodes?.length || 0,
      edgesCount: responseData.edges?.length || 0,
      conditionBranches: responseData.conditionBranchesCount,
      updatedAt: responseData.updatedAt,
      loadedAt: responseData.loadedAt
    });

    res.json({ 
      data: responseData,
      meta: {
        freshLoad: true,
        timestamp: timestamp,
        conditionsPreserved: true
      }
    });
  } catch (error) {
    console.error('❌ フロー詳細取得エラー:', error);
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