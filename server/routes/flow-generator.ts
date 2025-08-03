import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { processOpenAIRequest } from '../lib/openai.js';
import { searchKnowledgeBase } from '../lib/knowledge-base.js';
import { cleanJsonResponse } from '../lib/json-helper.js';
import { db } from '../db/index.js';
import { emergencyFlows } from '../db/schema.js';

const router = express.Router();
// 知識ベースディレクトリ
const knowledgeBaseDir = './knowledge-base';
const jsonDir: any = path.join(knowledgeBaseDir, 'json');
const troubleshootingDir: any = path.join(knowledgeBaseDir, 'troubleshooting');
// ディレクトリが存在しない場合は作成
if (!fs.existsSync(troubleshootingDir)) {
    fs.mkdirSync(troubleshootingDir, { recursive: true });
}
// デバッグ用エンドポイント
router.get('/debug', (req, res) => {
  res.json({
    success: true,
    data: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
      OPENAI_API_KEY_PREFIX: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'NOT FOUND',
      OPENAI_API_KEY_LENGTH: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
      NODE_ENV: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }
  });
});

// キーワードからフローを生成するエンドポイント（互換性のため）
router.post('/keywords', async (req, res) => {
  try {
    const { keywords } = req.body;
    if (!keywords || typeof keywords !== 'string' || !keywords.trim()) {
      return res.status(400).json({
        success: false,
        error: 'キーワードが指定されていません'
      });
    }
    console.log(`キーワード "${keywords}" からフローを生成します`);
    
    // 簡単なフローを生成（ダミー実装）
    const flowData = {
      id: `flow_${Date.now()}`,
      title: `キーワード生成フロー: ${keywords}`,
      description: `キーワード「${keywords}」から自動生成されたフロー`,
      triggerKeywords: keywords.split(',').map(k => k.trim()),
      steps: [
        {
          id: 'step1',
          title: '開始',
          description: `キーワード「${keywords}」に関する応急処置を開始します`,
          message: `キーワード「${keywords}」に関する応急処置を開始します`,
          type: 'step',
          options: []
        },
        {
          id: 'step2',
          title: '状況確認',
          description: '現在の状況を確認してください',
          message: '現在の状況を確認してください',
          type: 'condition',
          conditions: [
            {
              label: '問題解決',
              nextId: 'step3'
            },
            {
              label: '問題継続',
              nextId: 'step4'
            }
          ]
        },
        {
          id: 'step3',
          title: '完了',
          description: '応急処置が完了しました',
          message: '応急処置が完了しました',
          type: 'step',
          options: []
        },
        {
          id: 'step4',
          title: '専門家連絡',
          description: '専門家に連絡してください',
          message: '専門家に連絡してください',
          type: 'step',
          options: []
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // PostgreSQLデータベースに保存
    try {
      await db.insert(emergencyFlows).values({
        id: flowData.id,
        title: flowData.title,
        description: flowData.description,
        steps: flowData.steps,
        keyword: flowData.triggerKeywords.join(','),
        category: ''
      });
      
      console.log('✅ キーワードフロー保存成功:', {
        id: flowData.id,
        title: flowData.title
      });
    } catch (dbError) {
      console.error('❌ データベース保存エラー:', dbError);
      return res.status(500).json({
        success: false,
        error: 'データベースへの保存に失敗しました',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }
    
    res.json({
      success: true,
      message: `フローが正常に生成されました: ${flowData.title}`,
      flowData
    });
  } catch (error) {
    console.error('フロー生成エラー:', error);
    res.status(500).json({
      success: false,
      error: 'フローの生成に失敗しました'
    });
  }
});

// キーワードからフローを生成するエンドポイント（元の実装）
router.post('/generate-from-keywords', async (req, res) => {
    try {
        console.log('[DEBUG] generate-from-keywords endpoint called');
        
        const { keywords } = req.body;
        if (!keywords || typeof keywords !== 'string' || !keywords.trim()) {
            return res.status(400).json({
                success: false,
                error: 'キーワードが指定されていません'
            });
        }
        console.log(`キーワード "${keywords}" からフローを生成します`);
        
        // OpenAI APIキーの確認
        console.log('[DEBUG] Checking OpenAI API key...');
        console.log('[DEBUG] process.env.OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'EXISTS' : 'NOT EXISTS');
        
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
            console.log('[DEBUG] OpenAI API key validation failed - missing or default value');
            return res.status(400).json({
                success: false,
                error: 'OpenAI APIキーが設定されていません。環境変数OPENAI_API_KEYを設定してください。',
                details: '開発環境では.envファイルにOPENAI_API_KEYを設定してください。'
            });
        }
        
        // APIキーの形式確認
        if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
            console.log('[DEBUG] OpenAI API key validation failed - invalid format');
            return res.status(400).json({
                success: false,
                error: 'OpenAI APIキーの形式が無効です。',
                details: 'APIキーは「sk-」で始まる必要があります。'
            });
        }
        
        console.log('[DEBUG] OpenAI API Key validation passed');
        console.log('[DEBUG] OpenAI API Key validation:', {
            exists: !!process.env.OPENAI_API_KEY,
            startsWithSk: process.env.OPENAI_API_KEY.startsWith('sk-'),
            keyLength: process.env.OPENAI_API_KEY.length,
            prefix: process.env.OPENAI_API_KEY.substring(0, 10) + '...'
        });
        
        // OpenAIクライアントの状態を確認
        console.log('[DEBUG] Importing OpenAI modules...');
        const { processOpenAIRequest, getOpenAIClientStatus } = await import('../lib/openai.js');
        console.log('[DEBUG] processOpenAIRequest function imported successfully');
        
        // OpenAIクライアントの詳細な状態を確認
        const clientStatus = getOpenAIClientStatus();
        console.log('[DEBUG] OpenAI Client Status:', clientStatus);
        
        if (!clientStatus.clientExists) {
            return res.status(400).json({
                success: false,
                error: 'OpenAIクライアントが初期化されていません',
                details: clientStatus
            });
        }
        
        // ナレッジベースから関連情報を検索
        console.log('ナレッジベースから関連情報を検索中...');
        const relevantChunks: any = await searchKnowledgeBase(keywords);
        console.log(`関連チャンク数: ${relevantChunks.length}`);
        
        // 関連情報をプロンプトに追加するための文字列を構築
        let relatedKnowledgeText = '';
        if (relevantChunks.length > 0) {
            relatedKnowledgeText = '\n\n【関連する知識ベース情報】:\n';
            // 最大5チャンクまで追加(多すぎるとトークン数制限に達する可能性がある)
            const chunksToInclude: any = relevantChunks.slice(0, 5);
            for (const chunk of chunksToInclude) {
                relatedKnowledgeText += `---\n出典: ${chunk.metadata.source || '不明'}\n\n${chunk.text}\n---\n\n`;
            }
        }
        
        // GPTに渡す強化されたプロンプト
        const prompt = `以下のキーワードに関連する応急処置フローを生成してください。
必ず完全なJSONオブジェクトのみを返してください。追加の説明やテキストは一切含めないでください。
レスポンスは純粋なJSONデータだけであるべきで、コードブロックのマークダウン記法は使用しないでください。
生成するJSONは完全な有効なJSONである必要があり、途中で切れたり不完全な構造であってはなりません。
特に、各配列やオブジェクトが適切に閉じられていることを確認してください。

以下の形式に厳密に従ってください。条件分岐ノード（"type": "condition"）では必ず"conditions"配列と"message"フィールドを含めてください:

{
  "id": "機械的なID（英数字とアンダースコアのみ）",
  "title": "フローのタイトル",
  "description": "簡潔な説明",
  "triggerKeywords": ["キーワード1", "キーワード2"],
  "steps": [
    {
      "id": "step1",
      "title": "開始",
      "description": "この応急処置ガイドでは、[主な症状や問題]に対処する手順を説明します。安全を確保しながら、原因を特定し解決するための手順に従ってください。",
      "message": "この応急処置ガイドでは、[主な症状や問題]に対処する手順を説明します。安全を確保しながら、原因を特定し解決するための手順に従ってください。",
      "imageUrl": "",
      "type": "step",
      "options": []
    },
    {
      "id": "step2",
      "title": "安全確保",
      "description": "1. 二次災害を防ぐため、車両が安全な場所に停止していることを確認します。\n2. 接近する列車や障害物がないか周囲を確認します。\n3. 必要に応じて停止表示器や防護無線を使用します。",
      "message": "1. 二次災害を防ぐため、車両が安全な場所に停止していることを確認します。\n2. 接近する列車や障害物がないか周囲を確認します。\n3. 必要に応じて停止表示器や防護無線を使用します。",
      "imageUrl": "",
      "type": "step",
      "options": []
    },
    {
      "id": "step3",
      "type": "condition",
      "title": "状態確認分岐",
      "message": "現在の状況を確認してください。該当する状況を選択してください。",
      "conditions": [
        {
          "label": "状況A",
          "nextId": "step4"
        },
        {
          "label": "状況B",
          "nextId": "step5"
        }
      ]
    },
    {
      "id": "step4",
      "title": "状況Aの対処",
      "description": "状況Aに対する具体的な対処手順を説明します。",
      "message": "状況Aに対する具体的な対処手順を説明します。",
      "imageUrl": "",
      "type": "step",
      "options": []
    },
    {
      "id": "step5",
      "title": "状況Bの対処",
      "description": "状況Bに対する具体的な対処手順を説明します。",
      "message": "状況Bに対する具体的な対処手順を説明します。",
      "imageUrl": "",
      "type": "step",
      "options": []
    },
    {
      "id": "step6",
      "type": "condition",
      "title": "最終確認",
      "message": "対処後の状況を確認してください。",
      "conditions": [
        {
          "label": "問題解決",
          "nextId": "step7"
        },
        {
          "label": "問題継続",
          "nextId": "step8"
        }
      ]
    },
    {
      "id": "step7",
      "title": "運転再開手順",
      "description": "1. 各計器の値が正常範囲内にあることを確認します。\n2. 異常な音、振動、臭いがないか確認します。\n3. 全て正常であれば、運転を再開します。",
      "message": "1. 各計器の値が正常範囲内にあることを確認します。\n2. 異常な音、振動、臭いがないか確認します。\n3. 全て正常であれば、運転を再開します。",
      "imageUrl": "",
      "type": "step",
      "options": []
    },
    {
      "id": "step8",
      "title": "専門的な支援要請",
      "description": "1. 指令所または保守担当に連絡し、現在の状況と位置を報告します。\n2. これまでに実施した確認事項と対処内容を伝えます。\n3. 支援を要請し、安全な場所で待機します。",
      "message": "1. 指令所または保守担当に連絡し、現在の状況と位置を報告します。\n2. これまでに実施した確認事項と対処内容を伝えます。\n3. 支援を要請し、安全な場所で待機します。",
      "imageUrl": "",
      "type": "step",
      "options": []
    }
  ],
  "updatedAt": "2025-06-14T09:28:05.650Z"
}

【キーワード】: ${keywords}
${relatedKnowledgeText}

フロー生成に関する重要なガイドライン：
1. フローは実用的で、実際の緊急時に役立つ手順を提供してください。プレースホルダーやサンプルテキストは使用せず、具体的で実行可能な指示を含めてください。
2. 各ステップには具体的な指示や確認事項を箇条書きで含めてください。1〜3のような数字付きリストを使用し、改行には\\nを使用してください。
3. decision（判断）ノードでは、明確な質問形式の説明を提供し、選択肢は具体的な状態や条件を反映させてください。
4. 保守用車の専門知識を活用し、安全を最優先した技術的に正確な手順を作成してください。
5. 緊急時の対応として、まず安全確保、次に状況評価、そして解決策の実行という論理的な流れにしてください。
6. 少なくとも2つの主要な判断ポイント（decision）と、それぞれに対応する分岐パスを含めてください。
7. すべてのパスが完了または専門家への相談で終わるようにし、行き止まりのないフローにしてください。
8. title（タイトル）フィールドには短く明確な見出しを、description（説明）フィールドには詳細な指示や状況説明を入れてください。
9. 軌道モータカー特有の機器やシステム（例：制御装置、ブレーキシステム、パンタグラフ等）に関する具体的な言及を含めてください。
10. 最終ステップでは必ず具体的な対応結果や次のステップを明示し、利用者が次にとるべき行動を明確にしてください。`;
        
        // OpenAIでフローを生成
        console.log('OpenAIにフロー生成をリクエスト中...');
        const generatedFlow: any = await processOpenAIRequest(prompt);
        
        // OpenAI APIエラーの確認
        if (typeof generatedFlow === 'string' && generatedFlow.includes('OpenAI APIキーが無効です')) {
            return res.status(400).json({
                success: false,
                error: 'OpenAI APIキーが無効です。有効なAPIキーを設定してください。',
                details: '環境変数OPENAI_API_KEYに有効なAPIキーを設定してください。'
            });
        }
        
        try {
            // 共通のJSON処理ヘルパーを使用してレスポンスをクリーニング
            const cleanedResponse: any = cleanJsonResponse(generatedFlow);
            // JSONとして解析
            const flowData: any = JSON.parse(cleanedResponse);
            // IDが設定されていない場合はキーワードから生成
            if (!flowData.id) {
                // キーワードからIDを生成(小文字化してスペースをアンダースコアに置換)
                const generatedId: any = keywords.toLowerCase()
                    .replace(/[^a-z0-9_]/g, '_')
                    .replace(/_+/g, '_')
                    .substring(0, 50); // 長すぎる場合は切り詰め
                flowData.id = `flow_${generatedId}_${Date.now()}`;
            }
            // フローのファイルパス
            const flowFilePath: any = path.join(troubleshootingDir, `${flowData.id}.json`);
            // 既存のファイル名と競合しないように確認
            let finalId = flowData.id;
            let counter = 1;
            while (fs.existsSync(path.join(troubleshootingDir, `${finalId}.json`))) {
                finalId = `${flowData.id}_${counter}`;
                counter++;
            }
            flowData.id = finalId;
            // フローをファイルに保存
            fs.writeFileSync(path.join(troubleshootingDir, `${flowData.id}.json`), JSON.stringify(flowData, null, 2));
            // 生成日時を記録
            flowData.createdAt = new Date().toISOString();
            // 成功レスポンス
            res.json({
                success: true,
                message: `フローが正常に生成されました: ${flowData.title}`,
                flowData
            });
        }
        catch (parseError) {
            const error: any = parseError;
            console.error('生成されたフローの解析エラー:', error);
            console.error('生成されたテキスト:', generatedFlow);
            // JSON解析エラーの詳細を確認
            const errorPosition: any = error.message?.match(/position\s+(\d+)/i);
            if (errorPosition && errorPosition[1]) {
                const position: any = parseInt(errorPosition[1], 10);
                const contextStart: any = Math.max(0, position - 20);
                const contextEnd: any = Math.min(generatedFlow.length, position + 20);
                console.error(`エラー位置: ${position}`);
                console.error(`問題箇所の周辺: "${generatedFlow.substring(contextStart, position)}<<<ERROR HERE>>>${generatedFlow.substring(position, contextEnd)}"`);
                // 末尾のJSONを切り取る試み
                if (position > generatedFlow.length * 0.9) {
                    const lastBraceIndex: any = generatedFlow.lastIndexOf('}');
                    if (lastBraceIndex > 0) {
                        const truncated: any = generatedFlow.substring(0, lastBraceIndex + 1);
                        console.log('末尾を切り詰めたJSONを試行...');
                        try {
                            const truncatedData: any = JSON.parse(truncated);
                            // 成功した場合は切り詰めたデータを使用
                            console.log('切り詰めたJSONの解析に成功しました');
                            // 以下、IDの生成などの処理を続行...
                            // この部分は上記のコードと同様
                            const generatedId: any = keywords.toLowerCase()
                                .replace(/[^a-z0-9_]/g, '_')
                                .replace(/_+/g, '_')
                                .substring(0, 50);
                            truncatedData.id = `flow_${generatedId}_${Date.now()}`;
                            // フローのファイルパス
                            const flowFilePath: any = path.join(troubleshootingDir, `${truncatedData.id}.json`);
                            // 既存のファイル名と競合しないように確認
                            let finalId = truncatedData.id;
                            let counter = 1;
                            while (fs.existsSync(path.join(troubleshootingDir, `${finalId}.json`))) {
                                finalId = `${truncatedData.id}_${counter}`;
                                counter++;
                            }
                            truncatedData.id = finalId;
                            // フローをファイルに保存
                            fs.writeFileSync(path.join(troubleshootingDir, `${truncatedData.id}.json`), JSON.stringify(truncatedData, null, 2));
                            // 生成日時を記録
                            truncatedData.createdAt = new Date().toISOString();
                            // 成功レスポンス
                            return res.json({
                                success: true,
                                message: `修復したJSONからフローが生成されました: ${truncatedData.title}`,
                                flowData: truncatedData
                            });
                        }
                        catch (secondError) {
                            console.error('切り詰めたJSONの解析にも失敗しました:', secondError);
                        }
                    }
                }
            }
            res.status(500).json({
                success: false,
                error: 'フローデータの解析に失敗しました',
                rawResponse: generatedFlow
            });
        }
    }
    catch (error) {
        console.error('フロー生成エラー:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : '不明なエラーが発生しました'
        });
    }
});
// トラブルシューティングフローを取得するエンドポイント
router.get('/list', (req, res) => {
    try {
        // トラブルシューティングディレクトリからJSONファイルを取得
        const files: any = fs.readdirSync(troubleshootingDir)
            .filter(file => file.endsWith('.json'));
        const flowList: any = files.map(file => {
            try {
                const fileContent: any = fs.readFileSync(path.join(troubleshootingDir, file), 'utf-8');
                const flowData: any = JSON.parse(fileContent);
                return {
                    id: flowData.id || file.replace('.json', ''),
                    title: flowData.title || 'タイトルなし',
                    description: flowData.description || '',
                    triggerKeywords: flowData.triggerKeywords || [],
                    createdAt: flowData.createdAt || null
                };
            }
            catch (error) {
                console.error(`ファイル ${file} の解析中にエラーが発生しました:`, error);
                return null;
            }
        }).filter(Boolean);
        res.json({
            success: true,
            flowList
        });
    }
    catch (error) {
        console.error('フローリスト取得エラー:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : '不明なエラーが発生しました'
        });
    }
});
// トラブルシューティングフローの詳細を取得するエンドポイント
router.get('/detail/:id', (req, res) => {
    try {
        const cleanFlowId: any = req.params.id.startsWith('ts_') ? req.params.id.substring(3) : req.params.id;
        const filePath: any = path.join(troubleshootingDir, `${cleanFlowId}.json`);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: '指定されたフローが見つかりません'
            });
        }
        const fileContent: any = fs.readFileSync(filePath, 'utf-8');
        const flowData: any = JSON.parse(fileContent);
        const decisionSteps: any = flowData.steps?.filter((step) => step.type === 'decision') || [];
        const conditionSteps: any = flowData.steps?.filter((step) => step.type === 'condition') || [];
        const decisionStepsDetail: any = decisionSteps.map((step) => ({
            id: step.id,
            title: step.title,
            description: step.description,
            message: step.message,
            conditions: step.conditions
        }));
        const conditionStepsDetail: any = conditionSteps.map((step) => ({
            id: step.id,
            title: step.title,
            description: step.description,
            message: step.message,
            conditions: step.conditions
        }));
        res.json({
            success: true,
            flowData: {
                ...flowData,
                decisionSteps: decisionStepsDetail,
                conditionSteps: conditionStepsDetail
            }
        });
    }
    catch (error) {
        console.error('フロー詳細取得エラー:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : '不明なエラーが発生しました'
        });
    }
});
// トラブルシューティングフローを削除するエンドポイント
router.delete('/:id', (req, res) => {
    try {
        const flowId: any = req.params.id;
        const filePath: any = path.join(troubleshootingDir, `${flowId}.json`);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: '指定されたフローが見つかりません'
            });
        }
        fs.unlinkSync(filePath);
        res.json({
            success: true,
            message: 'フローが正常に削除されました'
        });
    }
    catch (error) {
        console.error('フロー削除エラー:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : '不明なエラーが発生しました'
        });
    }
});
export default router;
