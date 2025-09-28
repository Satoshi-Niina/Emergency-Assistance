import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

const router = express.Router();

// JWT発行ユーティリティ
const issueJwt = (userId, options = {}) => {
  const payload = { uid: userId };
  const jwtOptions = { expiresIn: '1d' };
  if (options.exp) {
    jwtOptions.expiresIn = Math.floor((options.exp - Date.now()) / 1000) + 's';
  }
  return jwt.sign(payload, process.env.JWT_SECRET, jwtOptions);
};

// ログインエンドポイント
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    // 入力検証
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'bad_request',
        message: 'ユーザー名とパスワードが必要です'
      });
    }

    // バイパスフラグ確認（最初に判定）
    const bypassDb = process.env.BYPASS_DB_FOR_LOGIN === 'true';
    
    console.log('[auth/login] Login attempt:', { 
      username, 
      bypassDb,
      timestamp: new Date().toISOString()
    });

    // バイパスモード時は即リターン（DBに触れない）
    if (bypassDb) {
      console.log('[auth/login] Bypass mode: Creating demo session');
      
      // セッションにユーザー情報を設定
      req.session.userId = 'demo';
      req.session.user = { 
        id: 'demo', 
        name: username,
        role: 'user'
      };
      
      // JWTトークンも生成
      const token = jwt.sign(
        { id: 'demo', username, role: 'user' }, 
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      return res.json({ 
        success: true, 
        mode: 'session',
        user: req.session.user,
        token,
        accessToken: token,
        expiresIn: '1d'
      });
    }

    // DB接続（遅延読み込み）
    let pool;
    try {
      // 開発環境ではSSLを無効にする
      const isDevelopment = process.env.NODE_ENV === 'development';
      const sslMode = process.env.PG_SSL || 'prefer';
      let sslConfig;
      
      if (isDevelopment) {
        sslConfig = false;
      } else if (sslMode === 'disable') {
        sslConfig = false;
      } else if (sslMode === 'require') {
        sslConfig = { rejectUnauthorized: false };
      } else { // prefer (default)
        sslConfig = { rejectUnauthorized: false };
      }

      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: sslConfig,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // 接続テスト
      const client = await pool.connect();
      
      // prefer モードで SSL エラーが出た場合は disable に再接続
      if (sslMode === 'prefer') {
        try {
          await client.query('SELECT 1');
        } catch (sslError) {
          if (sslError.message.includes('does not support SSL')) {
            console.log('[auth/login] SSL not supported, reconnecting with SSL disabled');
            await client.release();
            await pool.end();
            
            pool = new Pool({
              connectionString: process.env.DATABASE_URL,
              ssl: false,
              max: 5,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 5000,
            });
            
            const newClient = await pool.connect();
            await newClient.query('SELECT 1');
            await newClient.release();
          } else {
            throw sslError;
          }
        }
      } else {
        await client.release();
      }

      // データベースからユーザーを検索
      console.log('[auth/login] ユーザー検索開始:', { username });
      const result = await pool.query(
        'SELECT id, username, password, role, display_name, department FROM users WHERE username = $1 LIMIT 1',
        [username]
      );
      console.log('[auth/login] ユーザー検索結果:', { 
        found: result.rows.length > 0,
        userCount: result.rows.length 
      });

      if (result.rows.length === 0) {
        console.log('[auth/login] ユーザーが見つかりません');
        await pool.end();
        return res.status(401).json({ 
          success: false, 
          error: 'invalid_credentials',
          message: 'ユーザー名またはパスワードが正しくありません'
        });
      }

      const foundUser = result.rows[0];
      console.log('[auth/login] ユーザー情報取得:', { 
        id: foundUser.id, 
        username: foundUser.username, 
        role: foundUser.role 
      });

      // パスワード比較（bcryptjs）
      console.log('[auth/login] パスワード比較開始');
      const isPasswordValid = await bcrypt.compare(password, foundUser.password);
      console.log('[auth/login] パスワード比較結果:', { isValid: isPasswordValid });
      
      if (!isPasswordValid) {
        console.log('[auth/login] パスワードが一致しません');
        await pool.end();
        return res.status(401).json({ 
          success: false, 
          error: 'invalid_credentials',
          message: 'ユーザー名またはパスワードが正しくありません'
        });
      }

      // JWTトークン生成
      const token = issueJwt(foundUser.id);

      // セッション再生
      req.session.regenerate(err => {
        if (err) {
          console.error('[auth/login] Session regenerate error:', err);
          return res.status(503).json({ 
            success: false, 
            error: 'session_error',
            message: 'セッション作成に失敗しました'
          });
        }
        
        req.session.userId = foundUser.id;
        req.session.user = { 
          id: foundUser.id, 
          username: foundUser.username,
          displayName: foundUser.display_name,
          display_name: foundUser.display_name,
          role: foundUser.role || 'user',
          department: foundUser.department
        };
        
        req.session.save(() => {
          console.log('[auth/login] Login success for user:', foundUser.username);
          res.json({ 
            success: true, 
            token, 
            accessToken: token, 
            expiresIn: '1d',
            user: req.session.user
          });
        });
      });

      await pool.end();
      
    } catch (dbError) {
      console.error('[auth/login] Database error:', dbError);
      if (pool) {
        try {
          await pool.end();
        } catch (endError) {
          console.error('[auth/login] Pool end error:', endError);
        }
      }
      
      return res.status(503).json({
        success: false,
        error: 'auth_backend_unavailable',
        message: '認証サービスが一時的に利用できません'
      });
    }
    
  } catch (error) {
    console.error('[auth/login] Unexpected error:', error);
    return res.status(503).json({
      success: false,
      error: 'auth_internal_error',
      message: '認証処理中にエラーが発生しました'
    });
  }
});

// ログアウトエンドポイント
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid', { path: '/' });
    res.json({ success: true });
  });
});

// 現在のユーザー情報取得
router.get('/me', (req, res) => {
  try {
    console.log('[auth/me] リクエスト詳細:', {
      hasSession: !!req.session,
      sessionId: req.session?.id,
      sessionUser: req.session?.user,
      sessionUserId: req.session?.userId,
      cookies: req.headers.cookie
    });
    
    // セッションベースの認証をチェック
    if (req.session?.user) {
      console.log('[auth/me] Session-based auth:', req.session.user);
      return res.json({ 
        success: true, 
        user: req.session.user,
        authenticated: true
      });
    }

    // Bearer token認証をチェック
    const auth = req.get('authorization');
    if (auth?.startsWith('Bearer ')) {
      try {
        const token = auth.slice(7);
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        console.log('[auth/me] Token-based auth:', payload);
        return res.json({ 
          success: true, 
          user: { id: payload.sub || payload.id, ...payload },
          authenticated: true
        });
      } catch (tokenError) {
        console.log('[auth/me] Invalid token:', tokenError.message);
        return res.status(401).json({ 
          success: false, 
          error: 'invalid_token',
          message: '無効なトークンです'
        });
      }
    }

    // 未認証
    console.log('[auth/me] No authentication found');
    return res.status(401).json({ 
      success: false, 
      error: 'authentication_required',
      message: '認証が必要です'
    });
    
  } catch (error) {
    console.error('[auth/me] Unexpected error:', error);
    return res.status(401).json({ 
      success: false, 
      error: 'authentication_required',
      message: '認証が必要です'
    });
  }
});

// Database check endpoint
router.get('/db-check', async (req, res) => {
  try {
    console.log('[db-check] データベース接続チェック開始');
    
    // データベース接続テスト
    const { Pool } = require('pg');
    const isDevelopment = process.env.NODE_ENV === 'development';
    const sslMode = process.env.PG_SSL || 'prefer';
    let sslConfig;
    
    if (isDevelopment) {
      sslConfig = false;
    } else if (sslMode === 'disable') {
      sslConfig = false;
    } else if (sslMode === 'require') {
      sslConfig = { rejectUnauthorized: false };
    } else { // prefer (default)
      sslConfig = { rejectUnauthorized: false };
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, COUNT(*) as user_count FROM users');
    await client.release();
    await pool.end();

    console.log('[db-check] データベース接続成功:', result.rows[0]);

    res.json({
      status: 'OK',
      message: 'データベース接続が正常です',
      db_time: result.rows[0].current_time,
      user_count: result.rows[0].user_count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[db-check] データベース接続エラー:', error);
    res.status(500).json({
      status: 'ERROR',
      message: `データベース接続エラー: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Handshake endpoint
router.get('/handshake', (req, res) => {
  try {
    res.json({
      ok: true,
      mode: 'session',
      env: process.env.NODE_ENV || 'production',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  } catch (error) {
    console.error(`[${req.requestId}] Handshake error:`, error);
    res.status(200).json({
      ok: true,
      mode: 'session',
      env: 'production',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  }
});

// 認証関連のエンドポイントのみを保持

export default router;