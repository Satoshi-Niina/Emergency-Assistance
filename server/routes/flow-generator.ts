import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { processOpenAIRequest } from '../lib/openai';
import { searchKnowledgeBase } from '../lib/knowledge-base';
import { cleanJsonResponse } from '../lib/json-helper';

const router = Router();

// 知識ベースディレクトリ
const knowledgeBaseDir = './knowledge-base';
const jsonDir = path.join(knowledgeBaseDir, 'json');
const troubleshootingDir = path.join(knowledgeBaseDir, 'troubleshooting');

// ディレクトリが存在しない場合は作成
if (!fs.existsSync(troubleshootingDir)) {
  fs.mkdirSync(troubleshootingDir, { recursive: true });
}

// キーワードからフローを生成するエンドポイント
router.post('/generate-from-keywords', async (req, res) => {
  try {
    const { keywords } = req.body;

    if (!keywords || typeof keywords !== 'string' || !keywords.trim()) {
      return res.status(400).json({
        success: false,
        error: 'キーワードが指定されていません'
      });
    }

    console.log(`キーワード "${keywords}" からフローを生成します`);

    // ナレッジベースから関連情報を検索
    console.log('ナレッジベースから関連情報を検索中...');
    const relevantChunks = await searchKnowledgeBase(keywords);
    console.log(`関連チャンク数: ${relevantChunks.length}`);

    // 関連情報をプロンプトに追加するための文字列を構築
    let relatedKnowledgeText = '';
    if (relevantChunks.length > 0) {
      relatedKnowledgeText = '\n\n【関連する知識ベース情報】:\n';
      // 最大5チャンクまで追加(多すぎるとトークン数制限に達する可能性がある)
      const chunksToInclude = relevantChunks.slice(0, 5);

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
    const generatedFlow = await processOpenAIRequest(prompt);

    try {
      // 共通のJSON処理ヘルパーを使用してレスポンスをクリーニング
      const cleanedResponse = cleanJsonResponse(generatedFlow);

      // JSONとして解析
      const flowData = JSON.parse(cleanedResponse);

      // IDが設定されていない場合はキーワードから生成
      if (!flowData.id) {
        // キーワードからIDを生成(小文字化してスペースをアンダースコアに置換)
        const generatedId = keywords.toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .substring(0, 50); // 長すぎる場合は切り詰め

        flowData.id = `flow_${generatedId}_${Date.now()}`;
      }

      // フローのファイルパス
      const flowFilePath = path.join(troubleshootingDir, `${flowData.id}.json`);

      // 既存のファイル名と競合しないように確認
      let finalId = flowData.id;
      let counter = 1;

      while (fs.existsSync(path.join(troubleshootingDir, `${finalId}.json`))) {
        finalId = `${flowData.id}_${counter}`;
        counter++;
      }

      flowData.id = finalId;

      // フローをファイルに保存
      fs.writeFileSync(
        path.join(troubleshootingDir, `${flowData.id}.json`),
        JSON.stringify(flowData, null, 2)
      );

      // 生成日時を記録
      flowData.createdAt = new Date().toISOString();

      // 成功レスポンス
      res.json({
        success: true,
        message: `フローが正常に生成されました: ${flowData.title}`,
        flowData
      });

    } catch (parseError: unknown) {
      const error = parseError as Error;
      console.error('生成されたフローの解析エラー:', error);
      console.error('生成されたテキスト:', generatedFlow);

      // JSON解析エラーの詳細を確認
      const errorPosition = error.message?.match(/position\s+(\d+)/i);
      if (errorPosition && errorPosition[1]) {
        const position = parseInt(errorPosition[1], 10);
        const contextStart = Math.max(0, position - 20);
        const contextEnd = Math.min(generatedFlow.length, position + 20);
        console.error(`エラー位置: ${position}`);
        console.error(`問題箇所の周辺: "${generatedFlow.substring(contextStart, position)}<<<ERROR HERE>>>${generatedFlow.substring(position, contextEnd)}"`);

        // 末尾のJSONを切り取る試み
        if (position > generatedFlow.length * 0.9) {
          const lastBraceIndex = generatedFlow.lastIndexOf('}');
          if (lastBraceIndex > 0) {
            const truncated = generatedFlow.substring(0, lastBraceIndex + 1);
            console.log('末尾を切り詰めたJSONを試行...');
            try {
              const truncatedData = JSON.parse(truncated);

              // 成功した場合は切り詰めたデータを使用
              console.log('切り詰めたJSONの解析に成功しました');

              // 以下、IDの生成などの処理を続行...
              // この部分は上記のコードと同様

              const generatedId = keywords.toLowerCase()
                .replace(/[^a-z0-9_]/g, '_')
                .replace(/_+/g, '_')
                .substring(0, 50);

              truncatedData.id = `flow_${generatedId}_${Date.now()}`;

              // フローのファイルパス
              const flowFilePath = path.join(troubleshootingDir, `${truncatedData.id}.json`);

              // 既存のファイル名と競合しないように確認
              let finalId = truncatedData.id;
              let counter = 1;

              while (fs.existsSync(path.join(troubleshootingDir, `${finalId}.json`))) {
                finalId = `${truncatedData.id}_${counter}`;
                counter++;
              }

              truncatedData.id = finalId;

              // フローをファイルに保存
              fs.writeFileSync(
                path.join(troubleshootingDir, `${truncatedData.id}.json`),
                JSON.stringify(truncatedData, null, 2)
              );

              // 生成日時を記録
              truncatedData.createdAt = new Date().toISOString();

              // 成功レスポンス
              return res.json({
                success: true,
                message: `修復したJSONからフローが生成されました: ${truncatedData.title}`,
                flowData: truncatedData
              });
            } catch (secondError) {
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
  } catch (error) {
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
    const files = fs.readdirSync(troubleshootingDir)
      .filter(file => file.endsWith('.json'));

    const flowList = files.map(file => {
      try {
        const fileContent = fs.readFileSync(path.join(troubleshootingDir, file), 'utf-8');
        const flowData = JSON.parse(fileContent);

        return {
          id: flowData.id || file.replace('.json', ''),
          title: flowData.title || 'タイトルなし',
          description: flowData.description || '',
          triggerKeywords: flowData.triggerKeywords || [],
          createdAt: flowData.createdAt || null
        };
      } catch (error) {
        console.error(`ファイル ${file} の解析中にエラーが発生しました:`, error);
        return null;
      }
    }).filter(Boolean);

    res.json({
      success: true,
      flowList
    });
  } catch (error) {
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
    const cleanFlowId = req.params.id.startsWith('ts_') ? req.params.id.substring(3) : req.params.id;
    const filePath = path.join(troubleshootingDir, `${cleanFlowId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '指定されたフローが見つかりません'
      });
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const flowData = JSON.parse(fileContent);

    const decisionSteps = flowData.steps?.filter((step: any) => step.type === 'decision') || [];
    const conditionSteps = flowData.steps?.filter((step: any) => step.type === 'condition') || [];

    const decisionStepsDetail = decisionSteps.map((step: any) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      message: step.message,
      conditions: step.conditions
    }));

    const conditionStepsDetail = conditionSteps.map((step: any) => ({
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
  } catch (error) {
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
    const flowId = req.params.id;
    const filePath = path.join(troubleshootingDir, `${flowId}.json`);

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
  } catch (error) {
    console.error('フロー削除エラー:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '不明なエラーが発生しました'
    });
  }
});

export const flowGeneratorRouter = router;