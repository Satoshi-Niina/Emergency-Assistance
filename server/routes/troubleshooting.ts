
import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// Troubleshooting flow routes
router.get('/', (req, res) => {
  try {
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    console.log('トラブルシューティングディレクトリ:', troubleshootingDir);
    
    if (!fs.existsSync(troubleshootingDir)) {
      console.log('トラブルシューティングディレクトリが存在しません');
      return res.json([]);
    }

    const files = fs.readdirSync(troubleshootingDir);
    console.log('見つかったファイル:', files);
    
    const troubleshootingFlows = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        try {
          const filePath = path.join(troubleshootingDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          console.log(`ファイル ${file} を読み込み:`, data);
          
          // データ構造を統一化
          return {
            id: data.id || file.replace('.json', ''),
            title: data.title || data.name || 'タイトルなし',
            description: data.description || data.summary || '',
            trigger: data.trigger || data.keywords || [],
            slides: data.slides || [],
            createdAt: data.createdAt || new Date().toISOString(),
            fileName: file
          };
        } catch (error) {
          console.error(`ファイル ${file} の読み込みエラー:`, error);
          return null;
        }
      })
      .filter(data => data !== null);

    console.log('返すデータ:', troubleshootingFlows);
    res.json(troubleshootingFlows);
  } catch (error) {
    console.error('トラブルシューティングフロー取得エラー:', error);
    res.status(500).json({ error: 'Failed to fetch troubleshooting flows' });
  }
});

// 個別のトラブルシューティングフローを取得
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    console.log(`トラブルシューティングID ${id} を検索中...`);
    
    if (!fs.existsSync(troubleshootingDir)) {
      console.log('トラブルシューティングディレクトリが存在しません');
      return res.status(404).json({ error: 'Troubleshooting directory not found' });
    }

    const files = fs.readdirSync(troubleshootingDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    // IDに基づいてファイルを検索
    let foundData = null;
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(troubleshootingDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        // IDが一致するかチェック
        if (data.id === id || file.replace('.json', '') === id) {
          foundData = data;
          console.log(`マッチしたファイル: ${file}`, data);
          break;
        }
      } catch (error) {
        console.error(`ファイル ${file} の読み込みエラー:`, error);
      }
    }

    if (!foundData) {
      console.log(`ID ${id} に対応するデータが見つかりません`);
      return res.status(404).json({ error: 'Troubleshooting flow not found' });
    }

    res.json(foundData);
  } catch (error) {
    console.error('個別トラブルシューティングフロー取得エラー:', error);
    res.status(500).json({ error: 'Failed to fetch troubleshooting flow' });
  }
});

// チャット画面からのフロー検索
router.post('/search', (req, res) => {
  try {
    const { query } = req.body;
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(troubleshootingDir);
    const searchTerm = query.toLowerCase();
    
    const matchingFlows = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        try {
          const filePath = path.join(troubleshootingDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          // 検索条件との一致をチェック
          const titleMatch = (data.title || '').toLowerCase().includes(searchTerm);
          const descriptionMatch = (data.description || '').toLowerCase().includes(searchTerm);
          const triggerMatch = (data.trigger || []).some((t: string) => t.toLowerCase().includes(searchTerm));
          
          if (titleMatch || descriptionMatch || triggerMatch) {
            return {
              id: data.id || file.replace('.json', ''),
              title: data.title || 'タイトルなし',
              description: data.description || '',
              trigger: data.trigger || [],
              fileName: file
            };
          }
          return null;
        } catch (error) {
          console.error(`ファイル ${file} の検索エラー:`, error);
          return null;
        }
      })
      .filter(data => data !== null);

    res.json(matchingFlows);
  } catch (error) {
    console.error('トラブルシューティング検索エラー:', error);
    res.status(500).json({ error: 'フロー検索に失敗しました' });
  }
});

export default router;
