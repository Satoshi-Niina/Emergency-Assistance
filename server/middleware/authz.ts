import type { Request, Response, NextFunction } from 'express';
import { ROLES, roleHasPermission, PERMISSIONS, type Permission, type Role } from '../security/roles-permissions.js';

interface SessionUserShape { userId?: string; userRole?: string }
interface SessionRequest { session?: SessionUserShape }

export function requireAuth(req: Request & SessionRequest, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, error: '認証が必要です' });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request & SessionRequest, res: Response, next: NextFunction) => {
    const r = req.session?.userRole;
    if (!r) return res.status(401).json({ success: false, error: '認証が必要です' });
    if (!roles.includes(r)) {
      return res.status(403).json({ success: false, error: '権限が不足しています', need: roles, current: r });
    }
    next();
  };
}

export function requirePermission(perm: Permission) {
  return (req: Request & SessionRequest, res: Response, next: NextFunction) => {
    const role = req.session?.userRole as Role | undefined;
    if (!role) return res.status(401).json({ success: false, error: '認証が必要です' });
    if (!roleHasPermission(role, perm)) {
      return res.status(403).json({ success: false, error: '権限が不足しています', permission: perm, role });
    }
    next();
  };
}

// 代表的ショートカット
export const requireSystemAdmin = requireRole(ROLES.SYSTEM_ADMIN);
export const requireOperatorOrAdmin = requireRole(ROLES.SYSTEM_ADMIN, ROLES.OPERATOR);
export const PERM = PERMISSIONS;
