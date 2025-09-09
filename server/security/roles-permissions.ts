// 役割とパーミッション定義 - 3段階の権限システム
export const ROLES = {
  SYSTEM_ADMIN: 'system_admin',    // システム管理者：すべての権限
  OPERATOR: 'operator',            // 運用管理者：システム使用のすべて
  USER: 'user'                     // 一般ユーザー：チャットUIの基本機能のみ
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
  // システム管理者専用権限
  USER_MANAGE: 'user_manage',           // ユーザー管理
  SYSTEM_CONFIG: 'system_config',       // システム設定
  SYSTEM_MODIFY: 'system_modify',       // システム修正・追加
  
  // 運用管理者以上の権限
  KNOWLEDGE_EDIT: 'knowledge_edit',     // ナレッジベース編集
  KNOWLEDGE_VIEW: 'knowledge_view',     // ナレッジベース閲覧
  PROCEDURE_EDIT: 'procedure_edit',     // 手順書編集
  PROCEDURE_VIEW: 'procedure_view',     // 手順書閲覧
  FILE_UPLOAD: 'file_upload',           // ファイルアップロード
  FILE_DELETE: 'file_delete',           // ファイル削除
  MAINTENANCE_RUN: 'maintenance_run',   // メンテナンス実行
  LOGS_VIEW: 'logs_view',               // ログ閲覧
  TROUBLESHOOTING_VIEW: 'troubleshooting_view', // トラブルシューティング閲覧
  DOCUMENTS_VIEW: 'documents_view',     // ドキュメント管理閲覧
  HISTORY_VIEW: 'history_view',         // 履歴閲覧
  SETTINGS_VIEW: 'settings_view',       // 設定画面閲覧
  BASE_DATA_VIEW: 'base_data_view',     // 基礎データ閲覧
  
  // 全ユーザー共通権限
  CHAT_USE: 'chat_use',                 // チャット機能使用
  CAMERA_USE: 'camera_use'              // カメラ機能使用
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ロール→許可マップ
export const ROLE_PERMISSIONS: Record<Role, Permission[] | '*'> = {
  // システム管理者：すべての権限（システム修正・追加含む）
  [ROLES.SYSTEM_ADMIN]: '*',
  
  // 運用管理者：システム内のすべてを使用可能（修正権限は除く）
  [ROLES.OPERATOR]: [
    PERMISSIONS.KNOWLEDGE_EDIT,
    PERMISSIONS.KNOWLEDGE_VIEW,
    PERMISSIONS.PROCEDURE_EDIT,
    PERMISSIONS.PROCEDURE_VIEW,
    PERMISSIONS.FILE_UPLOAD,
    PERMISSIONS.FILE_DELETE,
    PERMISSIONS.MAINTENANCE_RUN,
    PERMISSIONS.LOGS_VIEW,
    PERMISSIONS.TROUBLESHOOTING_VIEW,
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.HISTORY_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.BASE_DATA_VIEW,
    PERMISSIONS.CHAT_USE,
    PERMISSIONS.CAMERA_USE
  ],
  
  // 一般ユーザー：チャットUIの基本機能のみ
  [ROLES.USER]: [
    PERMISSIONS.CHAT_USE,
    PERMISSIONS.CAMERA_USE
  ]
};

export function roleHasPermission(role: Role, perm: Permission): boolean {
  const grants = ROLE_PERMISSIONS[role];
  if (grants === '*') return true;
  return grants.includes(perm);
}
