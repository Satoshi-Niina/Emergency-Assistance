import express from 'express';

const router = express.Router();

// 認証デバッグ用エンドポイント
router.get('/auth-status', async (req, res) => {
  try {
    console.log('🔍 認証ステータス確認リクエスト');
    
    const authStatus = {
      isAuthenticated: !!req.session?.userId,
      userId: req.session?.userId,
      userRole: req.session?.userRole,
      sessionId: req.sessionID,
      sessionData: req.session,
      cookies: req.headers.cookie,
      timestamp: new Date().toISOString()
    };
    
    console.log('📋 認証ステータス:', authStatus);
    
    res.json({
      success: true,
      data: authStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 認証ステータス確認エラー:', error);
    res.status(500).json({
      success: false,
      error: '認証ステータスの確認に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ユーザー一覧確認エンドポイント
router.get('/users', async (req, res) => {
  try {
    console.log('🔍 ユーザー一覧確認リクエスト');
    
    const { db } = await import('../db/index.js');
    const { users } = await import('../db/schema.js');
    
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      department: users.department,
      description: users.description,
      createdAt: users.created_at
    }).from(users);
    
    console.log('📋 ユーザー一覧:', allUsers.length, '件');
    
    res.json({
      success: true,
      data: allUsers,
      total: allUsers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ユーザー一覧確認エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザー一覧の確認に失敗しました',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
