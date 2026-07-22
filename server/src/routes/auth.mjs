import express from 'express';
import { NODE_ENV } from '../config/env.mjs';
import {
  authenticateTenantLogin,
  getAuthResponseSession,
  normalizeAuthSession,
} from '../services/tenant-auth.mjs';
import { requireTenantContext } from '../middleware/tenant-context.mjs';

const router = express.Router();

const normalizeUserRole = (rawRole) => {
  return normalizeAuthSession({ role: rawRole }).role;
};

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password, appId } = req.body;
    console.log('[auth/login] Login attempt:', { username, appId });

    const authResult = await authenticateTenantLogin({
      username,
      password,
      appId: appId || 'troubleshoot',
    });

    req.session.user = authResult.user;
    req.session.tenant = authResult.tenant;
    req.session.appId = authResult.appId;

    // セッション保存を確実にする
    req.session.save((err) => {
      if (err) {
        console.error('[auth/login] Session save error:', err);
        return res.status(500).json({
          success: false,
          error: 'セッション保存エラー'
        });
      }

      console.log('[auth/login] Session saved successfully');
      res.json({
        success: true,
        ...getAuthResponseSession(authResult),
        token: authResult.token || undefined,
        accessToken: authResult.token || undefined,
        message: 'ログインに成功しました',
        timestamp: new Date().toISOString(),
        debug: {
          sessionID: req.sessionID,
          cookieSet: true
        }
      });
    });

  } catch (error) {
    console.error('[auth/login] Error:', error);
    res.status(error?.statusCode || 500).json({
      success: false,
      error: error?.publicMessage || 'ログイン処理に失敗しました',
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
router.get('/me', requireTenantContext, (req, res) => {
  if (req.user) {
    const normalizedUser = {
      id: req.user.id,
      username: req.user.username,
      displayName: req.user.displayName || req.user.username,
      role: normalizeUserRole(req.user.role),
      department: req.user.department,
      tenantId: req.user.tenantId,
      appId: req.user.appId,
    };

    if (req.session) {
      req.session.user = normalizedUser;
      if (req.tenant) {
        req.session.tenant = req.tenant;
      }
    }

    res.json({
      success: true,
      user: normalizedUser,
      tenant: req.tenant || req.session?.tenant || null,
      message: '認証済み',
      debug: {
        sessionId: req.sessionID,
        userRole: normalizedUser.role,
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
  console.log('[Auth Routes] Registering /api/auth routes...');
  app.use('/api/auth', router);
  app.use('/api/app-auth', router);
  console.log('[Auth Routes] ✅ /api/auth routes registered');
}
