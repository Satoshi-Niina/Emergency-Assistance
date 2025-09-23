import express from 'express';

const router = express.Router();

// 直接ユーザー修正エンドポイント
router.post('/fix-niina-admin', async (req, res) => {
  try {
    console.log('🔧 niinaユーザーを運用管理者に修正中...');

    const { db } = await import('../db/index.js');
    const { users } = await import('../db/schema.js');

    // niinaユーザーをadminに変更
    const updateResult = await db
      .update(users)
      .set({
        role: 'admin',
        description: '運用管理者',
        password: 'G&896845',
      })
      .where(users.username.eq('niina'))
      .returning();

    console.log('✅ niinaユーザー修正完了:', updateResult);

    // 確認
    const checkResult = await db
      .select({
        username: users.username,
        password: users.password,
        displayName: users.display_name,
        role: users.role,
        department: users.department,
        description: users.description,
      })
      .from(users)
      .where(users.username.eq('niina'));

    res.json({
      success: true,
      message: 'niinaユーザーを運用管理者に修正しました',
      data: checkResult[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ niinaユーザー修正エラー:', error);
    res.status(500).json({
      success: false,
      error: 'niinaユーザー修正に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 全ユーザー修正エンドポイント
router.post('/fix-all-users-direct', async (req, res) => {
  try {
    console.log('🔧 全ユーザーを直接修正中...');

    const { db } = await import('../db/index.js');
    const { users } = await import('../db/schema.js');

    // 既存のユーザーを削除
    await db
      .delete(users)
      .where(users.username.in(['niina', 'takabeni1', 'takabeni2']));

    // 新しいユーザーを追加
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

    console.log('✅ 全ユーザー修正完了:', insertResult.length, '件');

    res.json({
      success: true,
      message: '全ユーザーを修正しました',
      data: insertResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ 全ユーザー修正エラー:', error);
    res.status(500).json({
      success: false,
      error: '全ユーザー修正に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
