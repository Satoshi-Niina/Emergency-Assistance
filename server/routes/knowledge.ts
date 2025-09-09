import express from 'express';
import fs from 'fs';
import path from 'path';
import { KNOWLEDGE_BASE_DIR } from '../lib/knowledge-base.js';
import { azureStorage } from '../azure-storage.js';

const router = express.Router();

/**
 * GET /api/knowledge
 * knowledge-base/dataフォルダのJSONファイル一覧を取得
 * Azure環境ではBlob Storage、ローカル環境ではファイルシステムを使用
 */
router.get('/', async (req, res) => {
  try {
    console.log('📚 ナレッジベースデータ取得リクエスト');
    
    // Azure環境の場合はBlob Storageを使用
    if (azureStorage) {
      console.log('☁️ Azure Blob Storage からファイル一覧を取得');
      
      try {
        // knowledge-base/data/ プレフィックスでファイル一覧を取得
        const blobNames = await azureStorage.listFiles('knowledge-base/data/');
        
        // JSONファイルのみをフィルタリング
        const jsonFiles = blobNames.filter(name => name.toLowerCase().endsWith('.json'));
        
        // ファイル情報を構築
        const fileList = jsonFiles.map(blobName => {
          const filename = path.basename(blobName);
          const name = path.parse(filename).name;
          
          return {
            filename,
            name,
            size: 0, // Blob Storageでは個別にサイズ取得が必要なので0とする
            modifiedAt: new Date().toISOString(), // 実際の更新日時は個別取得が必要
            path: blobName,
            isBlob: true
          };
        });
        
        console.log(`✅ Azure Blob Storage からナレッジベースデータ取得完了: ${fileList.length}件`);
        
        return res.json({
          success: true,
          data: fileList,
          total: fileList.length,
          timestamp: new Date().toISOString(),
          source: 'azure-blob-storage'
        });
        
      } catch (blobError) {
        console.error('❌ Blob Storage アクセスエラー:', blobError);
        // フォールバックとしてローカル処理を継続
      }
    }
    
    // ローカル環境またはBlob Storage失敗時の処理
    console.log('💾 ローカルファイルシステムからファイル一覧を取得');
    
    // knowledge-base/dataフォルダのパスを設定
    const dataPath = path.join(KNOWLEDGE_BASE_DIR, 'data');
    
    // フォルダが存在するか確認
    if (!fs.existsSync(dataPath)) {
      console.log('📁 knowledge-base/data/フォルダが存在しません');
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'knowledge-base/data/フォルダが存在しません',
        source: 'local-filesystem'
      });
    }
    
    // フォルダ内のファイル一覧を取得
    const files = fs.readdirSync(dataPath);
    
    // JSONファイルのみをフィルタリング
    const jsonFiles = files.filter(file => {
      const filePath = path.join(dataPath, file);
      const stats = fs.statSync(filePath);
      return stats.isFile() && file.toLowerCase().endsWith('.json');
    });
    
    // ファイル情報を取得
    const fileList = jsonFiles.map(file => {
      const filePath = path.join(dataPath, file);
      const stats = fs.statSync(filePath);
      
      return {
        filename: file,
        name: path.parse(file).name,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        path: `/knowledge-base/data/${file}`,
        isBlob: false
      };
    });
    
    console.log(`✅ ローカルナレッジベースデータ取得完了: ${fileList.length}件`);
    
    res.json({
      success: true,
      data: fileList,
      total: fileList.length,
      timestamp: new Date().toISOString(),
      source: 'local-filesystem'
    });
    
  } catch (error) {
    console.error('❌ ナレッジベースデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジベースデータの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/knowledge/:filename
 * 特定のJSONファイルの内容を取得
 * Azure環境ではBlob Storage、ローカル環境ではファイルシステムを使用
 */
router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    console.log(`📚 ナレッジベースファイル取得: ${filename}`);
    
    // Azure環境の場合はBlob Storageを使用
    if (azureStorage) {
      console.log('☁️ Azure Blob Storage からファイル取得');
      
      try {
        // Blob名を構築（knowledge-base/data/プレフィックス付き）
        const blobName = filename.startsWith('knowledge-base/') 
          ? filename 
          : `knowledge-base/data/${filename}`;
        
        // ファイルが存在するか確認
        const exists = await azureStorage.fileExists(blobName);
        if (!exists) {
          return res.status(404).json({
            success: false,
            error: 'ファイルが見つかりません'
          });
        }
        
        // JSONファイルかどうか確認
        if (!blobName.toLowerCase().endsWith('.json')) {
          return res.status(400).json({
            success: false,
            error: 'JSONファイルのみ取得可能です'
          });
        }
        
        // ファイル内容を読み込み
        const fileContent = await azureStorage.readFileAsString(blobName);
        const jsonData = JSON.parse(fileContent);
        
        console.log('✅ Azure Blob Storage からナレッジベースファイル取得完了');
        
        return res.json({
          success: true,
          data: jsonData,
          filename: path.basename(blobName),
          size: fileContent.length,
          source: 'azure-blob-storage'
        });
        
      } catch (blobError) {
        console.error('❌ Blob Storage ファイル取得エラー:', blobError);
        // フォールバックとしてローカル処理を継続
      }
    }
    
    // ローカル環境またはBlob Storage失敗時の処理
    console.log('💾 ローカルファイルシステムからファイル取得');
    
    // ファイルパスを構築
    const filePath = path.join(KNOWLEDGE_BASE_DIR, 'data', filename);
    
    // ファイルが存在するか確認
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'ファイルが見つかりません'
      });
    }
    
    // JSONファイルかどうか確認
    if (!filename.toLowerCase().endsWith('.json')) {
      return res.status(400).json({
        success: false,
        error: 'JSONファイルのみ取得可能です'
      });
    }
    
    // ファイル内容を読み込み
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    
    console.log('✅ ローカルナレッジベースファイル取得完了');
    
    res.json({
      success: true,
      data: jsonData,
      filename: filename,
      size: fileContent.length,
      source: 'local-filesystem'
    });
    
  } catch (error) {
    console.error('❌ ナレッジベースファイル取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ナレッジベースファイルの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/knowledge/:filename
 * 指定のJSONファイルを削除
 */
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    console.log(`🗑️ ナレッジベースファイル削除: ${filename}`);

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ success: false, error: 'filename が必要です' });
    }

    // ディレクトリパスとファイルパス
    const dataDir = path.join(KNOWLEDGE_BASE_DIR, 'data');
    const filePath = path.join(dataDir, filename.endsWith('.json') ? filename : `${filename}.json`);

    // 存在確認
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'ファイルが見つかりません' });
    }

    // 削除実行
    fs.unlinkSync(filePath);
    console.log('✅ 削除完了:', filePath);

    res.json({ success: true, message: '削除しました', filename });
  } catch (error) {
    console.error('❌ ナレッジベースファイル削除エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ファイルの削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;