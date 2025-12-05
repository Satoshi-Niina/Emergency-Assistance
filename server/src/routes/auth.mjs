import express from 'express';
import bcrypt from 'bcryptjs';
import { dbQuery } from '../infra/db.mjs';
import { NODE_ENV } from '../config/env.mjs';

const router = express.Router();

const normalizeUserRole = (rawRole) => {
  if (!rawRole) return 'user';
  const role = String(rawRole).toLowerCase().trim();
  if (role === 'admin' || role === 'administrator') return 'admin';
  if (role === 'employee' || role === 'staff') return 'employee';
  return 'user';
};

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('[auth/login] Login attempt:', { username: req.body?.username });

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'ユーザー名とパスワードが必要です'
      });
    }

    const result = await dbQuery(
      'SELECT id, username, display_name, password, role, department FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      console.log('[auth/login] User not found:', username);
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが間違っています'
      });
    }

    const user = result.rows[0];
    // パスワードハッシュの形式チェック（デバッグ用）
    if (!user.password || !user.password.startsWith('$2')) {
      console.warn('[auth/login] Warning: Stored password might not be a valid bcrypt hash for user:', username);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('[auth/login] Password validation failed for user:', username);
      return res.status(401).json({
        success: false,
        error: 'ユーザー名またはパスワードが間違っています'
      });
    }

    console.log('[auth/login] Login successful for:', username, 'Role:', user.role);

    req.session.user = {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: normalizeUserRole(user.role),
      department: user.department
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: normalizeUserRole(user.role),
        department: user.department
      },
      message: 'ログインに成功しました',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[auth/login] Error:', error);
    res.status(500).json({
      success: false,
      error: 'ログイン処理に失敗しました',
      details: NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Handshake
router.get('/handshake', (req, res) => {
  res.json({
    ok: true,
    mode: 'session',
    env: 'azure-production',
    timestamp: new Date().toISOString(),
    sessionId: req.sessionID
  });
});

// Me
router.get('/me', (req, res) => {
  if (req.session.user) {
    const normalizedRole = normalizeUserRole(req.session.user.role);
    const normalizedUser = {
      ...req.session.user,
      role: normalizedRole
    };
    req.session.user = normalizedUser;

    res.json({
      success: true,
      user: normalizedUser,
      message: '認証済み',
      debug: {
        sessionId: req.sessionID,
        userRole: normalizedRole,
        timestamp: new Date().toISOString()
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: '未認証',
      debug: {
        sessionId: req.sessionID,
        hasSession: !!req.session,
        hasCookie: !!req.headers.cookie,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Check Admin
router.get('/check-admin', (req, res) => {
  if (req.session.user && normalizeUserRole(req.session.user.role) === 'admin') {
    res.json({
      success: true,
      message: '管理者権限あり',
      user: req.session.user
    });
  } else {
    res.status(403).json({
      success: false,
      message: '管理者権限がありません'
    });
  }
});

// Check Employee
router.get('/check-employee', (req, res) => {
  if (req.session.user && normalizeUserRole(req.session.user.role) === 'employee') {
    res.json({
      success: true,
      message: '従業員権限あり',
      user: req.session.user
    });
  } else {
    res.status(403).json({
      success: false,
      message: '従業員権限がありません'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({
        success: false,
        message: 'ログアウトに失敗しました'
      });
    }
    res.json({
      success: true,
      message: 'ログアウトしました'
    });
  });
});

export default function registerAuthRoutes(app) {
  app.use('/api/auth', router);
}
