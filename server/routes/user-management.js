import express from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// 全ユーザー一覧取得（デバッグ用）
router.get('/all', async (req, res) => {
  try {
    console.log('🔍 全ユーザー一覧取得リクエスト');
    
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      department: users.department,
      description: users.description,
      createdAt: users.created_at
    }).from(users);
    
    console.log('✅ 全ユーザー一覧取得完了:', allUsers.length, '件');
    
    res.json({
      success: true,
      data: allUsers,
      total: allUsers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 全ユーザー一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザー一覧の取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 特定ユーザー取得
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    console.log(`🔍 ユーザー取得リクエスト: ${username}`);
    
    const user = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      department: users.department,
      description: users.description,
      createdAt: users.created_at
    }).from(users).where(eq(users.username, username));
    
    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ユーザーが見つかりません',
        username,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ ユーザー取得完了:', user[0]);
    
    res.json({
      success: true,
      data: user[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ユーザー取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザーの取得に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ユーザー更新
router.put('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { role, department, description } = req.body;
    
    console.log(`🔍 ユーザー更新リクエスト: ${username}`, req.body);
    
    const updatedUser = await db.update(users)
      .set({
        role: role || users.role,
        department: department || users.department,
        description: description || users.description
      })
      .where(eq(users.username, username))
      .returning();
    
    if (updatedUser.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ユーザーが見つかりません',
        username,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ ユーザー更新完了:', updatedUser[0]);
    
    res.json({
      success: true,
      data: updatedUser[0],
      message: 'ユーザーが正常に更新されました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ユーザー更新エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザーの更新に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// niinaユーザーを管理者に設定
router.post('/fix-niina', async (req, res) => {
  try {
    console.log('🔍 niinaユーザー修正リクエスト');
    
    // niinaユーザーが存在するかチェック
    const existingUser = await db.select({
      id: users.id,
      username: users.username,
      role: users.role
    }).from(users).where(eq(users.username, 'niina'));
    
    let result;
    
    if (existingUser.length === 0) {
      // ユーザーが存在しない場合は新規作成
      console.log('niinaユーザーが存在しません。新規作成します...');
      result = await db.insert(users).values({
        username: 'niina',
        password: 'G&896845',
        displayName: '新納 智志',
        role: 'admin',
        department: 'システム管理部',
        description: '運用管理者'
      }).returning();
    } else {
      // ユーザーが存在する場合は更新
      console.log('niinaユーザーが存在します。権限を更新します...');
      result = await db.update(users)
        .set({
          role: 'admin',
          department: 'システム管理部',
          description: '運用管理者'
        })
        .where(eq(users.username, 'niina'))
        .returning();
    }
    
    console.log('✅ niinaユーザー修正完了:', result[0]);
    
    res.json({
      success: true,
      data: result[0],
      message: 'niinaユーザーが管理者権限に設定されました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ niinaユーザー修正エラー:', error);
    res.status(500).json({
      success: false,
      error: 'niinaユーザーの修正に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
