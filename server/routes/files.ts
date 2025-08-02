import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * GET /api/files/processed
 * 処理済みファイル一覧を取得
 */
router.get('/processed', async (req, res) => {
  try {
    console.log('📁 処理済みファイル一覧取得リクエスト');
    
    // 処理済みファイルが格納されるディレクトリのパスを設定
    const processedDir = path.join(process.cwd(), 'knowledge-base', 'documents');
    
    // ディレクトリが存在するか確認
    if (!fs.existsSync(processedDir)) {
      console.log('📁 knowledge-base/documents/フォルダが存在しません');
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: '処理済みファイルがありません'
      });
    }
    
    // ディレクトリ内のフォルダ一覧を取得（各ドキュメントは個別のフォルダに格納）
    const folders = fs.readdirSync(processedDir).filter(item => {
      const itemPath = path.join(processedDir, item);
      return fs.statSync(itemPath).isDirectory();
    });
    
    // 各フォルダ内のmetadata.jsonファイルを読み込んでファイル情報を取得
    const processedFiles = [];
    
    for (const folder of folders) {
      const folderPath = path.join(processedDir, folder);
      const metadataPath = path.join(folderPath, 'metadata.json');
      
      if (fs.existsSync(metadataPath)) {
        try {
          const metadataContent = fs.readFileSync(metadataPath, 'utf8');
          const metadata = JSON.parse(metadataContent);
          
          processedFiles.push({
            id: folder,
            title: metadata.title || 'タイトルなし',
            type: metadata.type || 'unknown',
            processedAt: metadata.processedAt || new Date().toISOString(),
            chunkCount: metadata.chunkCount || 0,
            originalFileName: metadata.originalFileName || 'unknown',
            folderPath: folder
          });
        } catch (error) {
          console.error(`❌ メタデータ読み込みエラー (${folder}):`, error);
          // メタデータが読み込めない場合は基本的な情報のみ
          processedFiles.push({
            id: folder,
            title: folder,
            type: 'unknown',
            processedAt: new Date().toISOString(),
            chunkCount: 0,
            originalFileName: 'unknown',
            folderPath: folder
          });
        }
      }
    }
    
    // 処理日時でソート（新しい順）
    processedFiles.sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());
    
    console.log(`✅ 処理済みファイル一覧取得完了: ${processedFiles.length}件`);
    
    res.json({
      success: true,
      data: processedFiles,
      total: processedFiles.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ 処理済みファイル一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '処理済みファイル一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 