import pkg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import { DATABASE_URL } from '../config/env.mjs';

const { Pool } = pkg;

const poolCache = new Map();

const COMMON_DB_CONNECTION_STRING =
  process.env.COMMON_DB_CONNECTION_STRING ||
  process.env.COMMON_DATABASE_URL ||
  process.env.COMMON_DB_URL ||
  process.env.COMMON_DB_V2_URL ||
  DATABASE_URL;

const COMMON_TENANT_ROUTINGS_TABLE = process.env.COMMON_TENANT_ROUTINGS_TABLE || 'public.tenant_app_routings';
const TENANT_USERS_TABLE = process.env.TENANT_USERS_TABLE || 'public.users';

function normalizeRole(rawRole) {
  if (!rawRole) return 'user';
  const role = String(rawRole).trim().toLowerCase();
  if (role === 'admin' || role === 'administrator') return 'admin';
  if (role === 'employee' || role === 'staff') return 'employee';
  return 'user';
}

// 接続文字列から pg ライブラリが誤認する SSL 関連パラメータを除去する関数
function cleanConnectionString(connStr) {
  if (!connStr) return connStr;
  try {
    // postgresql://... のURLから sslmode / ssl 関連のパラメータを消去
    return connStr
      .replace(/([?&])sslmode=[^&]*&?/g, '$1')
      .replace(/([?&])ssl=[^&]*&?/g, '$1')
      .replace(/\?$/, '')
      .replace(/&$/, '');
  } catch (_e) {
    return connStr;
  }
}

function getSslConfig() {
  return false;
}

function getPoolCacheKey(connectionString, label) {
  return `${label}:${crypto.createHash('sha1').update(connectionString).digest('hex')}`;
}

function getPool(rawConnectionString, label) {
  if (!rawConnectionString) {
    throw new Error(`missing_${label}_connection_string`);
  }

  // 接続文字列から SSL 指定を取り除いた綺麗なURLにする
  const connectionString = cleanConnectionString(rawConnectionString);

  const cacheKey = getPoolCacheKey(connectionString, label);
  if (poolCache.has(cacheKey)) {
    return poolCache.get(cacheKey);
  }

  const pool = new Pool({
    connectionString,
    ssl: false, // 明示的に false を固定
    max: label === 'common' ? 4 : 6,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    query_timeout: 30000,
    keepAlive: true,
  });

  poolCache.set(cacheKey, pool);
  return pool;
}

function readFirstDefined(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
  }
  return undefined;
}

function readJsonMaybe(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;

  try {
    return JSON.parse(value);
  } catch (_error) {
    return { raw: value };
  }
}

function getCommonDbPool() {
  return getPool(COMMON_DB_CONNECTION_STRING, 'common');
}

function getTenantDbPool(connectionString) {
  return getPool(connectionString, 'tenant');
}

async function querySingle(pool, sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

async function loadTenantRoutingEntry(tenantKey, appId) {
  const pool = getCommonDbPool();
  const tableName = process.env.COMMON_TENANT_ROUTINGS_TABLE || COMMON_TENANT_ROUTINGS_TABLE;
  const tenantKeyColumn = process.env.COMMON_TENANT_KEY_COLUMN || 'tenant_key';
  const appIdColumn = process.env.COMMON_TENANT_APP_ID_COLUMN || 'app_id';

  const conditions = [`${tenantKeyColumn} = $1`];
  const params = [tenantKey];

  if (appId) {
    conditions.push(`(${appIdColumn} = $${params.length + 1} OR ${appIdColumn} IS NULL)`);
    params.push(appId);
  }

  const sql = `
    SELECT *
    FROM ${tableName}
    WHERE ${conditions.join(' AND ')}
    LIMIT 1
  `;

  try {
    return await querySingle(pool, sql, params);
  } catch (error) {
    console.warn('[tenant-auth] tenant routing lookup failed:', error.message);
    throw error;
  }
}

function extractTenantInfo(routingRow, tenantKey) {
  if (!routingRow) {
    return null;
  }

  const tenantDbConnectionString = readFirstDefined(routingRow, [
    'tenant_db_connection_string',
    'tenant_db_url',
    'database_url',
    'db_connection_string',
    'connection_string',
  ]);

  const storage = readJsonMaybe(
    readFirstDefined(routingRow, [
      'storage_info',
      'storage_config',
      'storage_json',
      'storage',
    ])
  );

  return {
    tenantId: String(readFirstDefined(routingRow, [
      'tenant_id',
      'tenantId',
      'tenant',
      'id',
      'tenant_key',
      'tenantKey',
    ]) || tenantKey || ''),
    tenantKey: String(readFirstDefined(routingRow, [
      'tenant_key',
      'tenantKey',
    ]) || tenantKey || ''),
    tenantName: readFirstDefined(routingRow, [
      'tenant_name',
      'tenantName',
      'name',
    ]) || null,
    appId: readFirstDefined(routingRow, ['app_id', 'appId']) || null,
    tenantDbConnectionString,
    storage,
    raw: routingRow,
  };
}

async function loadTenantUser(tenantDbConnectionString, username) {
  const tenantPool = getTenantDbPool(tenantDbConnectionString);
  const tableName = process.env.TENANT_USERS_TABLE || TENANT_USERS_TABLE;
  const usernameColumn = process.env.TENANT_USERNAME_COLUMN || 'username';

  const sql = `
    SELECT *
    FROM ${tableName}
    WHERE ${usernameColumn} = $1
    LIMIT 1
  `;

  return querySingle(tenantPool, sql, [username]);
}

function buildJwtPayload({ user, tenant, appId }) {
  return {
    uid: user.id,
    username: user.username,
    tid: tenant.tenantId,
    tenantId: tenant.tenantId,
    role: normalizeRole(user.role),
    appId,
  };
}

function signAuthToken(payload) {
  if (!process.env.JWT_SECRET) {
    return null;
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: process.env.JWT_ISSUER || 'emergency-assistance',
    audience: process.env.JWT_AUDIENCE || 'emergency-assistance-apps',
  });
}

export async function authenticateTenantLogin({ username, password, appId = 'troubleshoot', tenantId = null }) {
  if (!username || !password) {
    throw Object.assign(new Error('missing_credentials'), {
      statusCode: 400,
      publicMessage: 'ユーザー名とパスワードが必要です',
    });
  }

  if (!tenantId) {
    throw Object.assign(new Error('missing_tenant_id'), {
      statusCode: 400,
      publicMessage: 'テナントIDが必要です',
    });
  }

  if (!COMMON_DB_CONNECTION_STRING) {
    throw Object.assign(new Error('missing_common_db_connection_string'), {
      statusCode: 503,
      publicMessage: '共通DB接続情報が設定されていません',
    });
  }

  const routingRow = await loadTenantRoutingEntry(String(tenantId).trim(), appId);
  if (!routingRow) {
    throw Object.assign(new Error('tenant_directory_not_found'), {
      statusCode: 401,
      publicMessage: 'テナントが見つかりません',
    });
  }

  const tenant = extractTenantInfo(routingRow, String(tenantId).trim());
  if (!tenant.tenantDbConnectionString) {
    throw Object.assign(new Error('tenant_db_connection_missing'), {
      statusCode: 503,
      publicMessage: 'テナントDB接続情報が見つかりません',
    });
  }

  const tenantUserRow = await loadTenantUser(tenant.tenantDbConnectionString, username);
  if (!tenantUserRow) {
    throw Object.assign(new Error('tenant_user_not_found'), {
      statusCode: 401,
      publicMessage: 'ユーザー名またはパスワードが間違っています',
    });
  }

  const storedPassword = readFirstDefined(tenantUserRow, ['password', 'password_hash', 'passwordHash']);
  if (!storedPassword) {
    throw Object.assign(new Error('tenant_password_missing'), {
      statusCode: 500,
      publicMessage: 'テナントDBのパスワード情報が見つかりません',
    });
  }

  const isPasswordValid = await bcrypt.compare(password, String(storedPassword));
  if (!isPasswordValid) {
    throw Object.assign(new Error('invalid_credentials'), {
      statusCode: 401,
      publicMessage: 'ユーザー名またはパスワードが間違っています',
    });
  }

  const user = {
    id: String(readFirstDefined(tenantUserRow, ['id', 'user_id']) || username),
    username: String(readFirstDefined(tenantUserRow, ['username', 'login_id']) || username),
    displayName: String(readFirstDefined(tenantUserRow, ['display_name', 'displayName', 'name']) || username),
    role: normalizeRole(readFirstDefined(tenantUserRow, ['role', 'user_role'])),
    department: readFirstDefined(tenantUserRow, ['department', 'division']) || undefined,
  };

  const tokenPayload = buildJwtPayload({ user, tenant, appId });
  const token = signAuthToken(tokenPayload);

  return {
    token,
    user,
    tenant: {
      tenantId: tenant.tenantId,
      tenantKey: tenant.tenantKey,
      tenantName: tenant.tenantName,
      appId: tenant.appId || appId,
      storage: tenant.storage,
    },
    storage: tenant.storage,
    routing: tenant.raw,
    tenantUser: tenantUserRow,
    appId,
  };
}

export function normalizeAuthUser(rawUser = {}) {
  return {
    id: String(readFirstDefined(rawUser, ['id', 'user_id']) || ''),
    username: String(readFirstDefined(rawUser, ['username', 'login_id']) || ''),
    displayName: String(readFirstDefined(rawUser, ['display_name', 'displayName', 'name']) || ''),
    role: normalizeRole(readFirstDefined(rawUser, ['role', 'user_role'])),
    department: readFirstDefined(rawUser, ['department', 'division']) || undefined,
  };
}

export function normalizeAuthSession(sessionUser = {}) {
  return {
    id: sessionUser.id,
    username: sessionUser.username,
    displayName: sessionUser.displayName,
    role: normalizeRole(sessionUser.role),
    department: sessionUser.department,
  };
}

export function decodeAuthToken(token) {
  if (!token || !process.env.JWT_SECRET) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      clockTolerance: 120,
    });
  } catch (_error) {
    return null;
  }
}

export function getAuthResponseSession(data) {
  return {
    user: {
      id: data.user.id,
      username: data.user.username,
      displayName: data.user.displayName,
      role: data.user.role,
      department: data.user.department,
      tenantId: data.tenant?.tenantId || null,
      appId: data.appId || null,
    },
    tenant: data.tenant,
    appId: data.appId,
  };
}