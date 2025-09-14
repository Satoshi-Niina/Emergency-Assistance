import express from 'express';

const router = express.Router();

// ユーザー修正エンドポイント
router.post('/fix-all-users', async (req, res) => {
  try {
    console.log('🔧 全ユーザー修正リクエスト');
    
    const { db } = await import('../db/index.js');
    const { users } = await import('../db/schema.js');
    
    // 既存のユーザーを削除
    console.log('既存のユーザーを削除中...');
    await db.delete(users).where(
      users.username.in(['niina', 'takabeni1', 'takabeni2'])
    );
    
    // 新しいユーザーを追加
    console.log('新しいユーザーを追加中...');
    await db.insert(users).values([
      {
        username: 'niina',
        password: 'G&896845',
        display_name: '新納 智志',
        role: 'admin',
        department: 'システム管理部',
        description: '運用管理者'
      },
      {
        username: 'takabeni1',
        password: 'Takabeni&1',
        display_name: 'タカベニ1',
        role: 'admin',
        department: 'システム管理部',
        description: '運用管理者'
      },
      {
        username: 'takabeni2',
        password: 'Takaben&2',
        display_name: 'タカベニ2',
        role: 'employee',
        department: '保守部',
        description: '一般ユーザー'
      }
    ]);
    
    // 確認
    const result = await db.select({
      username: users.username,
      password: users.password,
      displayName: users.display_name,
      role: users.role,
      department: users.department,
      description: users.description
    }).from(users).where(
      users.username.in(['niina', 'takabeni1', 'takabeni2'])
    );
    
    console.log('✅ ユーザー修正完了:', result.length, '件');
    
    res.json({
      success: true,
      message: 'ユーザー修正完了',
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ユーザー修正エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザー修正に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
