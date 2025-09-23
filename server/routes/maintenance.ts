import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { knowledgeBase } from '../knowledge-base-service.js';

const router = Router();

// 保守記録の保存エンドポイント
router.post('/save', async (_req, res) => {
  try {
    const maintenanceRecord = req.body;

    // バリデーション
    if (!maintenanceRecord.metadata?.recordId) {
      return res.status(400).json({ error: 'レコードIDが必要です' });
    }

    if (!maintenanceRecord.occurrence?.event) {
      return res.status(400).json({ error: '発生事象が必要です' });
    }

    // ファイル名の生成
    const now = new Date();
    const dateString = now.toISOString().slice(0, 10).replace(/-/g, '');
    const eventName = maintenanceRecord.occurrence.event
      .replace(/[\\/:*?"<>|]/g, '_')
      .substring(0, 50);
    const fileName = `maintenance_${dateString}_${eventName}_${maintenanceRecord.metadata.recordId}.json`;

    // vehicle-maintenanceフォルダに保存
    const filePath = `vehicle-maintenance/${fileName}`;

    // JSONデータを整形して保存
    const jsonString = JSON.stringify(maintenanceRecord, null, 2);
    await knowledgeBase.writeFile(filePath, jsonString);

    console.log(`保守記録を保存しました: ${filePath}`);

    res.json({
      success: true,
      message: '保守記録が正常に保存されました',
      fileName: fileName,
      filePath: filePath,
      recordId: maintenanceRecord.metadata.recordId,
    });
  } catch (error) {
    console.error('保守記録保存エラー:', error);
    res.status(500).json({
      error: '保存中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 保守記録の一覧取得エンドポイント
router.get('/list', async (_req, res) => {
  try {
    // maintenance-reportsフォルダ内のファイルを取得
    const files = await knowledgeBase.listFiles('maintenance-reports');
    const maintenanceFiles = files.filter(
      file => file.endsWith('.json') && file.includes('maintenance_')
    );

    const records = [];

    for (const file of maintenanceFiles) {
      try {
        const content = await knowledgeBase.readFile(
          `maintenance-reports/${file}`
        );
        const record = JSON.parse(content);

        records.push({
          fileName: file,
          recordId: record.metadata?.recordId,
          event: record.occurrence?.event,
          vehicleType: record.occurrence?.vehicle?.type,
          createdAt: record.metadata?.createdAt,
          recorder: record.notes?.recorder,
        });
      } catch (error) {
        console.error(`ファイル読み込みエラー: ${file}`, error);
      }
    }

    // 作成日時の降順でソート
    records.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json({
      success: true,
      records: records,
      total: records.length,
    });
  } catch (error) {
    console.error('保守記録一覧取得エラー:', error);
    res.status(500).json({
      error: '一覧取得中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 特定の保守記録の取得エンドポイント
router.get('/:recordId', async (_req, res) => {
  try {
    const { recordId } = req.params;

    // ファイル一覧を取得してレコードIDでマッチング
    const files = await knowledgeBase.listFiles('maintenance-reports');
    const targetFile = files.find(file => file.includes(recordId));

    if (!targetFile) {
      return res
        .status(404)
        .json({ error: '指定されたレコードが見つかりません' });
    }

    const content = await knowledgeBase.readFile(
      `maintenance-reports/${targetFile}`
    );
    const record = JSON.parse(content);

    res.json({
      success: true,
      record: record,
      fileName: targetFile,
    });
  } catch (error) {
    console.error('保守記録取得エラー:', error);
    res.status(500).json({
      error: '記録取得中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 保守記録の削除エンドポイント
router.delete('/:recordId', async (_req, res) => {
  try {
    const { recordId } = req.params;

    // ファイル一覧を取得してレコードIDでマッチング
    const files = await knowledgeBase.listFiles('maintenance-reports');
    const targetFile = files.find(file => file.includes(recordId));

    if (!targetFile) {
      return res
        .status(404)
        .json({ error: '指定されたレコードが見つかりません' });
    }

    await knowledgeBase.deleteFile(`maintenance-reports/${targetFile}`);

    console.log(`保守記録を削除しました: ${targetFile}`);

    res.json({
      success: true,
      message: '保守記録が正常に削除されました',
      fileName: targetFile,
    });
  } catch (error) {
    console.error('保守記録削除エラー:', error);
    res.status(500).json({
      error: '削除中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
