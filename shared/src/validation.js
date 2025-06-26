"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemConfigSchema = exports.fileUploadSchema = exports.searchQuerySchema = exports.insertChatExportSchema = exports.insertImageSchema = exports.updateEmergencyFlowSchema = exports.insertEmergencyFlowSchema = exports.emergencyFlowStepSchema = exports.insertKeywordSchema = exports.updateDocumentSchema = exports.insertDocumentSchema = exports.insertMediaSchema = exports.updateMessageSchema = exports.insertMessageSchema = exports.insertChatSchema = exports.updateUserSchema = exports.insertUserSchema = exports.loginSchema = void 0;
var zod_1 = require("zod");
// 認証関連のバリデーションスキーマ
exports.loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, 'ユーザー名は必須です'),
    password: zod_1.z.string().min(1, 'パスワードは必須です')
});
exports.insertUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, 'ユーザー名は必須です').max(50, 'ユーザー名は50文字以内で入力してください'),
    password: zod_1.z.string().min(6, 'パスワードは6文字以上で入力してください'),
    display_name: zod_1.z.string().min(1, '表示名は必須です').max(100, '表示名は100文字以内で入力してください'),
    role: zod_1.z.enum(['admin', 'employee', 'manager']).default('employee'),
    department: zod_1.z.string().optional()
});
exports.updateUserSchema = exports.insertUserSchema.partial().omit({ password: true });
// チャット関連のバリデーションスキーマ
exports.insertChatSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    userId: zod_1.z.string().min(1, 'ユーザーIDは必須です'),
    title: zod_1.z.string().max(200, 'タイトルは200文字以内で入力してください').optional()
});
exports.insertMessageSchema = zod_1.z.object({
    chatId: zod_1.z.string().min(1, 'チャットIDは必須です'),
    content: zod_1.z.string().min(1, 'メッセージ内容は必須です'),
    isAiResponse: zod_1.z.boolean().default(false),
    senderId: zod_1.z.string().nullable(),
});
exports.updateMessageSchema = exports.insertMessageSchema.partial();
// メディア関連のバリデーションスキーマ
exports.insertMediaSchema = zod_1.z.object({
    messageId: zod_1.z.string().min(1, 'メッセージIDは必須です'),
    type: zod_1.z.enum(['image', 'video', 'audio', 'document']),
    url: zod_1.z.string().url('有効なURLを入力してください'),
    description: zod_1.z.string().max(500, '説明は500文字以内で入力してください').optional()
});
// ドキュメント関連のバリデーションスキーマ
exports.insertDocumentSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'タイトルは必須です').max(200, 'タイトルは200文字以内で入力してください'),
    content: zod_1.z.string().min(1, '内容は必須です'),
    userId: zod_1.z.string().min(1, 'ユーザーIDは必須です')
});
exports.updateDocumentSchema = exports.insertDocumentSchema.partial();
// キーワード関連のバリデーションスキーマ
exports.insertKeywordSchema = zod_1.z.object({
    documentId: zod_1.z.string().optional(),
    word: zod_1.z.string().min(1, 'キーワードは必須です').max(100, 'キーワードは100文字以内で入力してください')
});
// 緊急フロー関連のバリデーションスキーマ
exports.emergencyFlowStepSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'ステップIDは必須です'),
    title: zod_1.z.string().min(1, 'タイトルは必須です').max(200, 'タイトルは200文字以内で入力してください'),
    description: zod_1.z.string().max(1000, '説明は1000文字以内で入力してください').optional(),
    type: zod_1.z.enum(['action', 'decision', 'end']),
    nextStepId: zod_1.z.string().optional(),
    conditions: zod_1.z.array(zod_1.z.object({
        condition: zod_1.z.string().min(1, '条件は必須です'),
        nextStepId: zod_1.z.string().min(1, '次のステップIDは必須です')
    })).optional(),
    actions: zod_1.z.array(zod_1.z.string()).optional(),
    imageUrl: zod_1.z.string().url('有効なURLを入力してください').optional()
});
exports.insertEmergencyFlowSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'タイトルは必須です').max(200, 'タイトルは200文字以内で入力してください'),
    description: zod_1.z.string().max(1000, '説明は1000文字以内で入力してください').optional(),
    steps: zod_1.z.array(exports.emergencyFlowStepSchema).min(1, '少なくとも1つのステップが必要です'),
    keyword: zod_1.z.string().min(1, 'キーワードは必須です').max(100, 'キーワードは100文字以内で入力してください'),
    category: zod_1.z.string().max(100, 'カテゴリは100文字以内で入力してください').default('')
});
exports.updateEmergencyFlowSchema = exports.insertEmergencyFlowSchema.partial();
// 画像関連のバリデーションスキーマ
exports.insertImageSchema = zod_1.z.object({
    url: zod_1.z.string().url('有効なURLを入力してください'),
    description: zod_1.z.string().min(1, '説明は必須です').max(500, '説明は500文字以内で入力してください'),
    embedding: zod_1.z.array(zod_1.z.number()).min(1, '埋め込みベクトルは必須です')
});
// チャットエクスポート関連のバリデーションスキーマ
exports.insertChatExportSchema = zod_1.z.object({
    chatId: zod_1.z.string().min(1, 'チャットIDは必須です'),
    userId: zod_1.z.string().min(1, 'ユーザーIDは必須です')
});
// 検索関連のバリデーションスキーマ
exports.searchQuerySchema = zod_1.z.object({
    query: zod_1.z.string().min(1, '検索クエリは必須です').max(500, '検索クエリは500文字以内で入力してください'),
    page: zod_1.z.number().int().min(1).default(1),
    limit: zod_1.z.number().int().min(1).max(100).default(20),
    category: zod_1.z.string().optional(),
    type: zod_1.z.enum(['all', 'documents', 'emergency-flows', 'images']).default('all')
});
// ファイルアップロード関連のバリデーションスキーマ
exports.fileUploadSchema = zod_1.z.object({
    file: zod_1.z.instanceof(File).refine(function (file) { return file.size <= 10 * 1024 * 1024; }, // 10MB制限
    'ファイルサイズは10MB以下にしてください'),
    type: zod_1.z.enum(['image', 'document', 'video', 'audio']),
    description: zod_1.z.string().max(500, '説明は500文字以内で入力してください').optional()
});
// システム設定関連のバリデーションスキーマ
exports.systemConfigSchema = zod_1.z.object({
    version: zod_1.z.string(),
    environment: zod_1.z.enum(['development', 'production', 'staging']),
    features: zod_1.z.object({
        chat: zod_1.z.boolean(),
        emergencyGuide: zod_1.z.boolean(),
        troubleshooting: zod_1.z.boolean(),
        knowledgeBase: zod_1.z.boolean(),
        voiceAssistant: zod_1.z.boolean()
    }),
    limits: zod_1.z.object({
        maxFileSize: zod_1.z.number().positive(),
        maxUploadFiles: zod_1.z.number().int().positive(),
        maxChatHistory: zod_1.z.number().int().positive()
    })
});
