import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { loadKnowledgeBaseIndex } from '../lib/knowledge-base.js';
import { knowledgeBase } from '../knowledge-base-service.js';

const router = express.Router();

// ファイルアップロード用のmulter設定
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB制限
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.pdf', '.xlsx', '.pptx'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('サポートされていないファイル形式です'));
    }
  },
});

// ファイルからテキストを抽出する関数
async function extractTextFromFile(
  filePath: string,
  originalName: string
): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();

  try {
    switch (ext) {
      case '.txt':
        return await fsPromises.readFile(filePath, 'utf-8');

      case '.pdf':
        console.log('PDF処理は未実装のため、ファイル名のみ保存');
        return `PDF file: ${originalName}`;

      case '.xlsx':
        console.log('Excel処理は未実装のため、ファイル名のみ保存');
        return `Excel file: ${originalName}`;

      case '.pptx':
        console.log('PowerPoint処理は未実装のため、ファイル名のみ保存');
        return `PowerPoint file: ${originalName}`;

      default:
        throw new Error(`サポートされていないファイル形式: ${ext}`);
    }
  } catch (error) {
    console.error('ファイル処理エラー:', error);
    return `Error processing file: ${originalName}`;
  }
}

/**
 * GET /api/files/processed
 * 処理済みファイル一覧を取得
 */
router.get('/processed', async (_req, res) => {
  try {
    console.log('📁 処理済みファイル一覧取得リクエスト');

    // knowledge-base/index.jsonからドキュメント情報を取得
    const index = loadKnowledgeBaseIndex();

    // documents配列が存在しない場合は初期化
    if (!index.documents) {
      index.documents = [];
    }

    console.log(`✅ 処理済みファイル取得成功: ${index.documents.length}件`);

    res.json({
      success: true,
      data: index.documents,
      total: index.documents.length,
      message:
        index.documents.length > 0
          ? '処理済みファイルを取得しました'
          : '処理済みファイルがありません',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ 処理済みファイル一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '処理済みファイル一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ファイルインポートエンドポイント
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'ファイルが選択されていません' });
    }

    const { originalname, path: tempPath } = req.file;
    const category = req.body.category || 'general';

    console.log(`ファイルインポート開始: ${originalname}`);

    // ファイルからテキストを抽出
    const extractedText = await extractTextFromFile(tempPath, originalname);

    // インポートデータの構造化
    const importedData = {
      metadata: {
        importId: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalFileName: originalname,
        importedAt: new Date().toISOString(),
        category: category,
        fileType: path.extname(originalname).toLowerCase(),
        processedBy: 'file-import-system',
      },
      content: {
        extractedText: extractedText,
        summary: `Imported from ${originalname}`,
        source: 'file-import',
      },
      processing: {
        status: 'completed',
        processedAt: new Date().toISOString(),
        extractionMethod: 'automatic',
      },
    };

    // knowledge-base/vehicle-maintenanceフォルダに保存
    const fileName = `import_${Date.now()}_${originalname.replace(/[\\/:*?"<>|]/g, '_')}.json`;
    const filePath = `vehicle-maintenance/${fileName}`;

    await knowledgeBase.writeJSON(filePath, importedData);

    // 一時ファイルを削除
    try {
      await fsPromises.unlink(tempPath);
    } catch (error) {
      console.warn('一時ファイルの削除に失敗:', error);
    }

    console.log(`ファイルインポート完了: ${originalname} -> ${filePath}`);

    res.json({
      success: true,
      message: 'ファイルが正常にインポートされました',
      fileName: fileName,
      originalName: originalname,
      savedPath: filePath,
      processedEntries: 1,
      importId: importedData.metadata.importId,
    });
  } catch (error) {
    console.error('ファイルインポートエラー:', error);

    // 一時ファイルのクリーンアップ
    if (req.file?.path) {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('一時ファイルのクリーンアップに失敗:', cleanupError);
      }
    }

    res.status(500).json({
      error: 'ファイルのインポートに失敗しました',
      details: error instanceof Error ? error.message : '不明なエラー',
    });
  }
});

// インポート済みファイルの一覧取得
router.get('/imports', async (_req, res) => {
  try {
    const files = await knowledgeBase.listFiles('vehicle-maintenance');
    const importFiles = files.filter(
      file => file.startsWith('import_') && file.endsWith('.json')
    );

    const fileDetails = await Promise.all(
      importFiles.map(async file => {
        try {
          const data = await knowledgeBase.readJSON(
            `vehicle-maintenance/${file}`
          );
          return {
            fileName: file,
            originalName: data.metadata?.originalFileName || 'Unknown',
            importedAt: data.metadata?.importedAt || 'Unknown',
            category: data.metadata?.category || 'general',
            fileType: data.metadata?.fileType || 'unknown',
            importId: data.metadata?.importId || 'unknown',
          };
        } catch (error) {
          console.error(`ファイル読み込みエラー: ${file}`, error);
          return {
            fileName: file,
            originalName: 'Error',
            importedAt: 'Error',
            category: 'error',
            fileType: 'error',
            importId: 'error',
          };
        }
      })
    );

    res.json({
      success: true,
      imports: fileDetails,
      total: fileDetails.length,
    });
  } catch (error) {
    console.error('インポート一覧取得エラー:', error);
    res.status(500).json({
      error: 'インポート一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : '不明なエラー',
    });
  }
});

export default router;
