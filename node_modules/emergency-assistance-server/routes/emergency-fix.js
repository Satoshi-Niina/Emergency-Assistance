import express from 'express';

const router = express.Router();

// 緊急ユーザー修正エンドポイント
router.post('/emergency-fix', async (req, res) => {
  try {
    console.log('🚨 緊急ユーザー修正開始...');

    const { db } = await import('../db/index.js');
    const { users } = await import('../db/schema.js');

    // 現在のユーザーを確認
    console.log('📋 現在のユーザーを確認中...');
    const currentUsers = await db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
        displayName: users.display_name,
        role: users.role,
        department: users.department,
        description: users.description,
      })
      .from(users)
      .where(users.username.in(['niina', 'takabeni1', 'takabeni2']));

    console.log('現在のユーザー:', currentUsers);

    // 既存のユーザーを削除
    console.log('🗑️ 既存のユーザーを削除中...');
    const deleteResult = await db
      .delete(users)
      .where(users.username.in(['niina', 'takabeni1', 'takabeni2']));
    console.log('削除結果:', deleteResult);

    // 新しいユーザーを追加（確実に平文パスワード）
    console.log('➕ 新しいユーザーを追加中...');
    const insertResult = await db
      .insert(users)
      .values([
        {
          username: 'niina',
          password: 'G&896845',
          display_name: '新納 智志',
          role: 'admin',
          department: 'システム管理部',
          description: '運用管理者',
        },
        {
          username: 'takabeni1',
          password: 'Takabeni&1',
          display_name: 'タカベニ1',
          role: 'admin',
          department: 'システム管理部',
          description: '運用管理者',
        },
        {
          username: 'takabeni2',
          password: 'Takaben&2',
          display_name: 'タカベニ2',
          role: 'employee',
          department: '保守部',
          description: '一般ユーザー',
        },
      ])
      .returning();

    console.log('✅ ユーザー追加完了:', insertResult);

    // 最終確認
    const finalCheck = await db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
        displayName: users.display_name,
        role: users.role,
        department: users.department,
        description: users.description,
      })
      .from(users)
      .where(users.username.in(['niina', 'takabeni1', 'takabeni2']));

    console.log('🔍 最終確認:', finalCheck);

    res.json({
      success: true,
      message: '緊急ユーザー修正完了',
      data: finalCheck,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ 緊急ユーザー修正エラー:', error);
    res.status(500).json({
      success: false,
      error: '緊急ユーザー修正に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
