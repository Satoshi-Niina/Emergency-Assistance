/**
 * AI Assist API
 */

export default async function aiAssistHandler(req, res) {
  try {
    const method = req.method;
    const pathParts = req.path.split('/').filter(p => p);
    const action = pathParts[pathParts.length - 1]; // 最後のパス要素を取得

    console.log('[api/ai-assist] Request:', { method, action, path: req.path, pathParts });

    if (method === 'GET' && action === 'settings') {
      return res.json({
        success: true,
        data: {
          initialPrompt: "何か問題がありましたか？お困りの事象を教えてください。",
          conversationStyle: "frank",
          questionFlow: {
            step1: "具体的な問題を教えてください",
            step2: "いつ頃から発生していますか？",
            step3: "作業環境の状況を教えてください",
            step4: "他に気になることはありますか？",
            step5: "緊急度を教えてください"
          },
          branchingConditions: {
            timeCheck: true,
            detailsCheck: true,
            toolsCheck: true,
            safetyCheck: true
          },
          responsePattern: "step_by_step",
          escalationTime: 20,
          customInstructions: "",
          enableEmergencyContact: true
        },
        timestamp: new Date().toISOString()
      });
    }

    if (method === 'POST' && action === 'settings') {
      try {
        const settings = req.body;
        console.log('[api/ai-assist] Updating settings:', settings);
        
        // 設定を保存（実装は簡略化）
        return res.json({
          success: true,
          message: 'AI支援設定を更新しました',
          data: settings
        });
      } catch (error) {
        console.error('[api/ai-assist] Settings update error:', error);
        return res.status(500).json({
          success: false,
          error: 'AI支援設定の更新に失敗しました',
          details: error.message
        });
      }
    }

    return res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.path
    });
  } catch (error) {
    console.error('[api/ai-assist] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

export const methods = ['get', 'post'];
