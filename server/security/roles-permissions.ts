// 役割とパーミッション定義
export const ROLES = {
  SYSTEM_ADMIN: 'system_admin',
  OPERATOR: 'operator',
  USER: 'user'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
  USER_MANAGE: 'user_manage',
  SYSTEM_CONFIG: 'system_config',
  KNOWLEDGE_EDIT: 'knowledge_edit',
  KNOWLEDGE_VIEW: 'knowledge_view',
  PROCEDURE_EDIT: 'procedure_edit',
  PROCEDURE_VIEW: 'procedure_view',
  FILE_UPLOAD: 'file_upload',
  FILE_DELETE: 'file_delete',
  MAINTENANCE_RUN: 'maintenance_run',
  LOGS_VIEW: 'logs_view',
  CHAT_USE: 'chat_use',
  CAMERA_USE: 'camera_use'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ロール→許可マップ
export const ROLE_PERMISSIONS: Record<Role, Permission[] | '*'> = {
  [ROLES.SYSTEM_ADMIN]: '*',
  [ROLES.OPERATOR]: [
    PERMISSIONS.KNOWLEDGE_EDIT,
    PERMISSIONS.KNOWLEDGE_VIEW,
    PERMISSIONS.PROCEDURE_EDIT,
    PERMISSIONS.PROCEDURE_VIEW,
    PERMISSIONS.FILE_UPLOAD,
    PERMISSIONS.CHAT_USE,
    PERMISSIONS.CAMERA_USE,
    PERMISSIONS.LOGS_VIEW
  ],
  [ROLES.USER]: [
    PERMISSIONS.KNOWLEDGE_VIEW,
    PERMISSIONS.PROCEDURE_VIEW,
    PERMISSIONS.CHAT_USE,
    PERMISSIONS.CAMERA_USE
  ]
};

export function roleHasPermission(role: Role, perm: Permission): boolean {
  const grants = ROLE_PERMISSIONS[role];
  if (grants === '*') return true;
  return grants.includes(perm);
}
