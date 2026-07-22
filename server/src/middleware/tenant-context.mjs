import { decodeAuthToken, normalizeAuthSession } from '../services/tenant-auth.mjs';

function readBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim();
}

export function attachTenantContext(req, _res, next) {
  const token = readBearerToken(req);
  const tokenPayload = decodeAuthToken(token);

  if (tokenPayload) {
    req.auth = tokenPayload;
    req.user = {
      id: tokenPayload.uid,
      username: tokenPayload.username,
      role: tokenPayload.role,
      tenantId: tokenPayload.tid || tokenPayload.tenantId,
      appId: tokenPayload.appId,
    };
    req.tenant = {
      tenantId: tokenPayload.tid || tokenPayload.tenantId || null,
      appId: tokenPayload.appId || null,
    };
    return next();
  }

  if (req.session?.user) {
    const sessionUser = normalizeAuthSession(req.session.user);
    req.auth = {
      uid: sessionUser.id,
      username: sessionUser.username,
      role: sessionUser.role,
      tenantId: req.session.tenant?.tenantId || null,
      appId: req.session.appId || null,
    };
    req.user = {
      id: sessionUser.id,
      username: sessionUser.username,
      role: sessionUser.role,
      tenantId: req.session.tenant?.tenantId || null,
      appId: req.session.appId || null,
    };
    req.tenant = req.session.tenant || {
      tenantId: req.session.tenantId || null,
      appId: req.session.appId || null,
    };
    return next();
  }

  req.auth = null;
  req.tenant = null;
  next();
}

export function requireTenantContext(req, res, next) {
  if (req.auth || req.session?.user) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'authentication_required',
    message: '認証が必要です',
  });
}
