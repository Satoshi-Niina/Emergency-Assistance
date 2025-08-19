import express from 'express';
import { db } from '../db/index';
import { machineTypes, machines } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// 機種一覧取得API（/api/machine-types）
router.get('/machine-types', async (req, res) => {
  try {
    console.log('🔍 機種一覧取得リクエスト');
    
    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');
    
    // Drizzle ORMを使用して機種一覧を取得
    const result = await db.select({
      id: machineTypes.id,
      machine_type_name: machineTypes.machineTypeName
    }).from(machineTypes)
    .orderBy(machineTypes.machineTypeName);
    
    console.log(`✅ 機種一覧取得完了: ${result.length}件`);
    
    res.json({
      success: true,
      data: result,
      total: result.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 機種一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 全機械データ取得API（/api/all-machines）
router.get('/all-machines', async (req, res) => {
  try {
    console.log('🔍 全機械データ取得リクエスト');
    
    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');
    
    // Drizzle ORMを使用して全機械データを取得
    const result = await db.select({
      type_id: machineTypes.id,
      machine_type_name: machineTypes.machineTypeName,
      machine_id: machines.id,
      machine_number: machines.machineNumber
    }).from(machineTypes)
    .leftJoin(machines, eq(machineTypes.id, machines.machineTypeId))
    .orderBy(machineTypes.machineTypeName, machines.machineNumber);
    
    // 機種ごとにグループ化
    const groupedData = result.reduce((acc: any, row: any) => {
      const typeName = row.machine_type_name;
      if (!acc[typeName]) {
        acc[typeName] = {
          type_id: row.type_id,
          machine_type_name: typeName,
          machines: []
        };
      }
      if (row.machine_id) {
        acc[typeName].machines.push({
          id: row.machine_id,
          machine_number: row.machine_number
        });
      }
      return acc;
    }, {});
    
    console.log(`✅ 全機械データ取得完了: ${Object.keys(groupedData).length}機種`);
    
    res.json({
      success: true,
      data: Object.values(groupedData),
      total: Object.keys(groupedData).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 全機械データ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械データの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 機種追加API
router.post('/machine-types', async (req, res) => {
  try {
    console.log('🔍 機種追加リクエスト:', req.body);
    
    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');
    
    const { machine_type_name } = req.body;
    
    // バリデーション
    if (!machine_type_name) {
      return res.status(400).json({
        success: false,
        error: '機種名は必須です',
        required: ['machine_type_name'],
        received: { machine_type_name: !!machine_type_name }
      });
    }
    
    // Drizzle ORMを使用して機種を追加
    const newMachineType = await db.insert(machineTypes).values({
      machineTypeName: machine_type_name
    }).returning();
    
    console.log('✅ 機種追加完了:', newMachineType[0]);
    
    res.status(201).json({
      success: true,
      data: newMachineType[0],
      message: '機種が正常に追加されました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 機種追加エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種の追加に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 指定機種に紐づく機械番号一覧取得API
router.get('/machines', async (req, res) => {
  try {
    console.log('🔍 機械番号一覧取得リクエスト:', req.query);
    
    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');
    
    const { type_id } = req.query;
    
    if (!type_id) {
      return res.status(400).json({
        success: false,
        error: '機種IDが指定されていません',
        timestamp: new Date().toISOString()
      });
    }

    // Drizzle ORMを使用して機械番号一覧を取得
    const result = await db.select({
      id: machines.id,
      machine_number: machines.machineNumber
    }).from(machines)
    .where(eq(machines.machineTypeId, type_id as string))
    .orderBy(machines.machineNumber);
    
    console.log(`✅ 機械番号一覧取得完了: ${result.length}件`);
    
    res.json({
      success: true,
      data: result,
      total: result.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 機械番号一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械番号一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 機械番号追加API
router.post('/machines', async (req, res) => {
  try {
    console.log('🔍 機械番号追加リクエスト:', req.body);
    
    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');
    
    const { machine_number, machine_type_id } = req.body;
    
    if (!machine_number || machine_number.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '機械番号は必須です',
        timestamp: new Date().toISOString()
      });
    }

    if (!machine_type_id) {
      return res.status(400).json({
        success: false,
        error: '機種IDは必須です',
        timestamp: new Date().toISOString()
      });
    }

    // Drizzle ORMを使用して機械番号を追加
    const result = await db.insert(machines).values({
      machineNumber: machine_number.trim(),
      machineTypeId: machine_type_id
    }).returning();
    
    console.log('✅ 機械番号追加完了:', result[0]);
    
    res.status(201).json({
      success: true,
      data: result[0],
      message: '機械番号を追加しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 機械番号追加エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械番号の追加に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 機種削除API
router.delete('/machine-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 機種削除リクエスト: ID=${id}`);
    
    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');
    
    // Drizzle ORMを使用して機種を削除
    const result = await db.delete(machineTypes)
      .where(eq(machineTypes.id, id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: '指定された機種が見つかりません',
        id,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ 機種削除完了:', result[0]);
    
    res.json({
      success: true,
      data: result[0],
      message: '機種を削除しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 機種削除エラー:', error);
    res.status(500).json({
      success: false,
      error: '機種の削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 機械番号削除API
router.delete('/machines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 機械番号削除リクエスト: ID=${id}`);
    
    // Content-Typeを明示的に設定
    res.setHeader('Content-Type', 'application/json');
    
    // Drizzle ORMを使用して機械番号を削除
    const result = await db.delete(machines)
      .where(eq(machines.id, id))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: '指定された機械番号が見つかりません',
        id,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ 機械番号削除完了:', result[0]);
    
    res.json({
      success: true,
      data: result[0],
      message: '機械番号を削除しました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 機械番号削除エラー:', error);
    res.status(500).json({
      success: false,
      error: '機械番号の削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// エラーハンドリングミドルウェア
router.use((err: any, req: any, res: any, next: any) => {
  console.error('機械管理エラー:', err);
  
  // Content-Typeを明示的に設定
  res.setHeader('Content-Type', 'application/json');
  
  res.status(500).json({
    success: false,
    error: '機械管理の処理中にエラーが発生しました',
    details: err.message || 'Unknown error',
    timestamp: new Date().toISOString()
  });
});

// 404ハンドリング
router.use('*', (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: '機械管理のエンドポイントが見つかりません',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

export default router; 