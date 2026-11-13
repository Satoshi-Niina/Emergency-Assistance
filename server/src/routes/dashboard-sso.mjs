import jwt from 'jsonwebtoken';

export function exchangeDashboardToken(token) {
  if (!process.env.SHARED_SSO_SECRET || !process.env.JWT_SECRET) {
    throw Object.assign(new Error('SSO signing configuration is missing'), { statusCode: 503 });
  }
  const payload = jwt.verify(token, process.env.SHARED_SSO_SECRET, {
    algorithms: ['HS256'],
    issuer: process.env.DASHBOARD_JWT_ISSUER || 'dashboard-auth',
    audience: process.env.DASHBOARD_JWT_AUDIENCE || 'dashboard-apps',
  });
  if (typeof payload !== 'object' || payload.appKey !== 'emergency'
      || typeof payload.userId !== 'string' || !payload.userId
      || typeof payload.tenantId !== 'string' || !payload.tenantId
      || typeof payload.exp !== 'number') {
    throw Object.assign(new Error('Invalid emergency launch context'), { statusCode: 401 });
  }

  const adminRoles = ['system_admin', 'admin', 'administrator'];
  const employeeRoles = ['operator_admin', 'operator', 'manager', 'leader', 'employee', 'staff'];
  const role = adminRoles.includes(payload.role) ? 'admin'
    : employeeRoles.includes(payload.role) ? 'employee' : 'user';
  const user = {
    id: payload.userId,
    uid: payload.userId,
    username: payload.username,
    displayName: payload.displayName,
    role,
    tid: payload.tenantId,
    tenantId: payload.tenantId,
    appId: 'emergency',
  };
  const sessionToken = jwt.sign(user, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    issuer: process.env.JWT_ISSUER || 'emergency-assistance',
    audience: process.env.JWT_AUDIENCE || 'emergency-assistance-apps',
    expiresIn: '8h',
  });
  return { success: true, token: sessionToken, user };
}

export function registerDashboardSso(app) {
  app.post('/api/auth/dashboard-sso', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (typeof req.body?.token !== 'string' || !req.body.token) {
      console.warn('[DashboardSSO] Launch token missing');
      return res.status(400).json({ success: false, message: '起動トークンが必要です' });
    }
    try {
      return res.json(exchangeDashboardToken(req.body.token));
    } catch (error) {
      console.warn('[DashboardSSO] Token exchange failed:', error.message);
      return res.status(error.statusCode || 401).json({
        success: false,
        message: '認証情報を確認できません。ダッシュボードから起動し直してください。',
      });
    }
  });
}
