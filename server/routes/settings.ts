import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// RAG設定の保存・読み込み用のファイルパス
const RAG_SETTINGS_FILE = path.join(__dirname, '../data/rag-settings.json');

// デフォルトのRAG設定
const DEFAULT_RAG_SETTINGS = {
  chunkSize: 1000,
  chunkOverlap: 200,
  similarityThreshold: 0.7,
  maxResults: 10,
  useSemanticSearch: true,
  useKeywordSearch: true,
  removeDuplicates: true,
  preprocessingOptions: {
    removeStopWords: true,
    lowercaseText: true,
    removeSpecialChars: false
  },
  customPrompt: '',
  temperature: 0.7,
  maxTokens: 2000
};

// RAG設定を保存するディレクトリを確保
async function ensureDataDirectory() {
  const dataDir = path.dirname(RAG_SETTINGS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// RAG設定を取得
router.get('/rag', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('🔍 RAG設定取得リクエスト');
    
    await ensureDataDirectory();
    
    try {
      const data = await fs.readFile(RAG_SETTINGS_FILE, 'utf-8');
      const settings = JSON.parse(data);
      console.log('✅ RAG設定読み込み成功:', settings);
      res.json(settings);
    } catch (error) {
      // ファイルが存在しない場合はデフォルト設定を返す
      console.log('📝 RAG設定ファイルが存在しないため、デフォルト設定を返します');
      res.json(DEFAULT_RAG_SETTINGS);
    }
  } catch (error) {
    console.error('❌ RAG設定取得エラー:', error);
    res.status(500).json({ 
      error: 'RAG設定の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// RAG設定を保存
router.post('/rag', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('💾 RAG設定保存リクエスト:', req.body);
    
    await ensureDataDirectory();
    
    // 設定をバリデーション
    const settings = {
      ...DEFAULT_RAG_SETTINGS,
      ...req.body
    };
    
    // 数値型のバリデーション
    if (typeof settings.chunkSize !== 'number' || settings.chunkSize < 100 || settings.chunkSize > 2000) {
      return res.status(400).json({ error: 'チャンクサイズは100-2000の範囲で設定してください' });
    }
    
    if (typeof settings.chunkOverlap !== 'number' || settings.chunkOverlap < 0 || settings.chunkOverlap >= settings.chunkSize) {
      return res.status(400).json({ error: 'チャンクオーバーラップはチャンクサイズ未満で設定してください' });
    }
    
    if (typeof settings.similarityThreshold !== 'number' || settings.similarityThreshold < 0.1 || settings.similarityThreshold > 1.0) {
      return res.status(400).json({ error: '類似度閾値は0.1-1.0の範囲で設定してください' });
    }
    
    if (typeof settings.maxResults !== 'number' || settings.maxResults < 1 || settings.maxResults > 20) {
      return res.status(400).json({ error: '最大結果数は1-20の範囲で設定してください' });
    }
    
    // ファイルに保存
    await fs.writeFile(RAG_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    
    console.log('✅ RAG設定保存成功:', settings);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('❌ RAG設定保存エラー:', error);
    res.status(500).json({ 
      error: 'RAG設定の保存に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
