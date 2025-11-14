import { Router } from 'express';
import { query } from '../db/db.js';
import { processOpenAIRequest, getOpenAIClientStatus } from '../lib/openai.js';

const router = Router();

// PostgreSQL接続確認API
router.get('/db-check', async (_req, res) => {
  try {
    const result = await query('SELECT NOW() as db_time, version() as version');
    res.json({
      success: true,
      status: 'OK',
      message: 'データベース接続が正常です',
      data: {
        current_time: result[0].db_time,
        version: result[0].version,
      },
      db_time: result[0].db_time,
      version: result[0].version,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('DB接続確認エラー:', error);
    res.status(500).json({
      success: false,
      status: 'ERROR',
      error: 'データベース接続エラー',
      message:
        error instanceof Error ? error.message : 'データベース接続エラー',
      timestamp: new Date().toISOString(),
    });
  }
});

// GPT接続確認API
router.post('/gpt-check', async (req, res) => {
  try {
    console.log('[system-check] GPT接続チェックリクエスト');

    // 実際のチャット機能と同じ方法でOpenAIクライアントの状態を確認
    const clientStatus = getOpenAIClientStatus();

    console.log('[system-check] OpenAI Client Status:', clientStatus);

    const isDevelopment = process.env.NODE_ENV === 'development';

    // クライアントが存在しない場合
    if (!clientStatus.clientExists) {
      console.log('[system-check] OpenAIクライアントが初期化されていません');
      res.json({
        success: false,
        status: 'ERROR',
        connected: false,
        error: 'OpenAIクライアントが初期化されていません',
        message: 'OpenAI APIキーが設定されていないか、無効な形式です。設定画面でAPIキーを設定してください。',
        details: clientStatus,
        environment: isDevelopment ? 'development' : 'production',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // APIキーが存在しない場合
    if (!clientStatus.apiKeyExists) {
      console.log('[system-check] OpenAI APIキーが設定されていません');
      res.json({
        success: false,
        status: 'ERROR',
        connected: false,
        error: 'OpenAI APIキーが設定されていません',
        message: 'OPENAI_API_KEY環境変数が設定されていません。設定画面でAPIキーを設定してください。',
        environment: isDevelopment ? 'development' : 'production',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // モックキーの場合
    if (clientStatus.isMockKey) {
      console.log('[system-check] OpenAI APIキーがモックキーです');
      res.json({
        success: false,
        status: 'ERROR',
        connected: false,
        error: 'OpenAI APIキーがモックキーです',
        message: '開発用のモックキーが設定されています。実際のAPIキーを設定してください。',
        environment: isDevelopment ? 'development' : 'production',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // APIキーの形式が無効な場合
    if (!clientStatus.startsWithSk) {
      console.log('[system-check] OpenAI APIキーの形式が無効です');
      res.json({
        success: false,
        status: 'ERROR',
        connected: false,
        error: 'OpenAI APIキーが無効です',
        message: `OpenAI APIキーの形式が正しくありません。現在の値: ${clientStatus.apiKeyPrefix} (sk-で始まる必要があります)`,
        environment: isDevelopment ? 'development' : 'production',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      console.log('[system-check] OpenAI API接続テスト開始');

      // 実際のチャット機能と同じ方法でAPI接続テスト
      const testResponse = await processOpenAIRequest('Hello', false);

      console.log('[system-check] OpenAI API接続テスト成功');

      res.json({
        success: true,
        status: 'OK',
        connected: true,
        message: 'GPT接続が正常です',
        testResponse: testResponse.substring(0, 100) + '...',
        environment: isDevelopment ? 'development' : 'production',
        timestamp: new Date().toISOString()
      });
    } catch (gptError) {
      console.error('[system-check] GPT接続テストエラー:', gptError);
      console.error('[system-check] エラー詳細:', {
        name: gptError.name,
        message: gptError.message,
        code: gptError.code,
        status: gptError.status
      });

      res.json({
        success: false,
        status: 'ERROR',
        connected: false,
        error: 'GPT接続に失敗しました',
        message: gptError.message || 'OpenAI APIへの接続に失敗しました',
        details: gptError.code ? `エラーコード: ${gptError.code}` : undefined,
        environment: isDevelopment ? 'development' : 'production',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[system-check] GPT接続チェックエラー:', error);
    res.status(500).json({
      success: false,
      status: 'ERROR',
      connected: false,
      error: 'GPT接続チェック中にエラーが発生しました',
      message: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV === 'development' ? 'development' : 'production',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
