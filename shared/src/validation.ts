import { z } from 'zod';
// 隱崎ｨｼ髢｢騾｣縺ｮ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝・
export const loginSchema: any = z.object({
    username: z.string().min(1, '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪・蠢・医〒縺・),
    password: z.string().min(1, '繝代せ繝ｯ繝ｼ繝峨・蠢・医〒縺・)
});
export const insertUserSchema: any = z.object({
    username: z.string().min(1, '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪・蠢・医〒縺・).max(50, '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪・50譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞'),
    password: z.string().min(6, '繝代せ繝ｯ繝ｼ繝峨・6譁・ｭ嶺ｻ･荳翫〒蜈･蜉帙＠縺ｦ縺上□縺輔＞'),
    display_name: z.string().min(1, '陦ｨ遉ｺ蜷阪・蠢・医〒縺・).max(100, '陦ｨ遉ｺ蜷阪・100譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞'),
    role: z.enum(['admin', 'employee', 'manager']).default('employee'),
    department: z.string().optional()
});
export const updateUserSchema: any = insertUserSchema.partial().omit({ password: true });
// 繝√Ε繝・ヨ髢｢騾｣縺ｮ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝・
export const insertChatSchema: any = z.object({
    id: z.string().optional(),
    userId: z.string().min(1, '繝ｦ繝ｼ繧ｶ繝ｼID縺ｯ蠢・医〒縺・),
    title: z.string().max(200, '繧ｿ繧､繝医Ν縺ｯ200譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞').optional()
});
export const insertMessageSchema: any = z.object({
    chatId: z.string().min(1, '繝√Ε繝・ヨID縺ｯ蠢・医〒縺・),
    content: z.string().min(1, '繝｡繝・そ繝ｼ繧ｸ蜀・ｮｹ縺ｯ蠢・医〒縺・),
    isAiResponse: z.boolean().default(false),
    senderId: z.string().nullable(),
});
export const updateMessageSchema: any = insertMessageSchema.partial();
// 繝｡繝・ぅ繧｢髢｢騾｣縺ｮ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝・
export const insertMediaSchema: any = z.object({
    messageId: z.string().min(1, '繝｡繝・そ繝ｼ繧ｸID縺ｯ蠢・医〒縺・),
    type: z.enum(['image', 'video', 'audio', 'document']),
    url: z.string().url('譛牙柑縺ｪURL繧貞・蜉帙＠縺ｦ縺上□縺輔＞'),
    description: z.string().max(500, '隱ｬ譏弱・500譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞').optional()
});
// 繝峨く繝･繝｡繝ｳ繝磯未騾｣縺ｮ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝・
export const insertDocumentSchema: any = z.object({
    title: z.string().min(1, '繧ｿ繧､繝医Ν縺ｯ蠢・医〒縺・).max(200, '繧ｿ繧､繝医Ν縺ｯ200譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞'),
    content: z.string().min(1, '蜀・ｮｹ縺ｯ蠢・医〒縺・),
    userId: z.string().min(1, '繝ｦ繝ｼ繧ｶ繝ｼID縺ｯ蠢・医〒縺・)
});
export const updateDocumentSchema: any = insertDocumentSchema.partial();
// 繧ｭ繝ｼ繝ｯ繝ｼ繝蛾未騾｣縺ｮ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝・
export const insertKeywordSchema: any = z.object({
    documentId: z.string().optional(),
    word: z.string().min(1, '繧ｭ繝ｼ繝ｯ繝ｼ繝峨・蠢・医〒縺・).max(100, '繧ｭ繝ｼ繝ｯ繝ｼ繝峨・100譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞')
});
// 邱頑･繝輔Ο繝ｼ髢｢騾｣縺ｮ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝・
export const emergencyFlowStepSchema: any = z.object({
    id: z.string().min(1, '繧ｹ繝・ャ繝悠D縺ｯ蠢・医〒縺・),
    title: z.string().min(1, '繧ｿ繧､繝医Ν縺ｯ蠢・医〒縺・).max(200, '繧ｿ繧､繝医Ν縺ｯ200譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞'),
    description: z.string().max(1000, '隱ｬ譏弱・1000譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞').optional(),
    type: z.enum(['action', 'decision', 'end']),
    nextStepId: z.string().optional(),
    conditions: z.array(z.object({
        condition: z.string().min(1, '譚｡莉ｶ縺ｯ蠢・医〒縺・),
        nextStepId: z.string().min(1, '谺｡縺ｮ繧ｹ繝・ャ繝悠D縺ｯ蠢・医〒縺・)
    })).optional(),
    actions: z.array(z.string()).optional(),
    imageUrl: z.string().url('譛牙柑縺ｪURL繧貞・蜉帙＠縺ｦ縺上□縺輔＞').optional()
});
export const insertEmergencyFlowSchema: any = z.object({
    title: z.string().min(1, '繧ｿ繧､繝医Ν縺ｯ蠢・医〒縺・).max(200, '繧ｿ繧､繝医Ν縺ｯ200譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞'),
    description: z.string().max(1000, '隱ｬ譏弱・1000譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞').optional(),
    steps: z.array(emergencyFlowStepSchema).min(1, '蟆代↑縺上→繧・縺､縺ｮ繧ｹ繝・ャ繝励′蠢・ｦ√〒縺・),
    keyword: z.string().min(1, '繧ｭ繝ｼ繝ｯ繝ｼ繝峨・蠢・医〒縺・).max(100, '繧ｭ繝ｼ繝ｯ繝ｼ繝峨・100譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞'),
    category: z.string().max(100, '繧ｫ繝・ざ繝ｪ縺ｯ100譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞').default('')
});
export const updateEmergencyFlowSchema: any = insertEmergencyFlowSchema.partial();
// 逕ｻ蜒城未騾｣縺ｮ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝・
export const insertImageSchema: any = z.object({
    url: z.string().url('譛牙柑縺ｪURL繧貞・蜉帙＠縺ｦ縺上□縺輔＞'),
    description: z.string().min(1, '隱ｬ譏弱・蠢・医〒縺・).max(500, '隱ｬ譏弱・500譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞'),
    embedding: z.array(z.number()).min(1, '蝓九ａ霎ｼ縺ｿ繝吶け繝医Ν縺ｯ蠢・医〒縺・)
});
// 繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝磯未騾｣縺ｮ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝・
export const insertChatExportSchema: any = z.object({
    chatId: z.string().min(1, '繝√Ε繝・ヨID縺ｯ蠢・医〒縺・),
    userId: z.string().min(1, '繝ｦ繝ｼ繧ｶ繝ｼID縺ｯ蠢・医〒縺・)
});
// 讀懃ｴ｢髢｢騾｣縺ｮ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝・
export const searchQuerySchema: any = z.object({
    query: z.string().min(1, '讀懃ｴ｢繧ｯ繧ｨ繝ｪ縺ｯ蠢・医〒縺・).max(500, '讀懃ｴ｢繧ｯ繧ｨ繝ｪ縺ｯ500譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞'),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    category: z.string().optional(),
    type: z.enum(['all', 'documents', 'emergency-flows', 'images']).default('all')
});
// 繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝蛾未騾｣縺ｮ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝橸ｼ医ヶ繝ｩ繧ｦ繧ｶ迺ｰ蠅・〒縺ｮ縺ｿ菴ｿ逕ｨ・・
export const fileUploadSchema: any = z.object({
    file: z.any().refine((file: any) => {
        // 繝悶Λ繧ｦ繧ｶ迺ｰ蠅・〒縺ｮ縺ｿFile蝙九ｒ繝√ぉ繝・け
        if (typeof window !== 'undefined' && file instanceof File) {
            return file.size <= 10 * 1024 * 1024; // 10MB蛻ｶ髯・
        }
        return true;
    }, '繝輔ぃ繧､繝ｫ繧ｵ繧､繧ｺ縺ｯ10MB莉･荳九↓縺励※縺上□縺輔＞'),
    type: z.enum(['image', 'document', 'video', 'audio']),
    description: z.string().max(500, '隱ｬ譏弱・500譁・ｭ嶺ｻ･蜀・〒蜈･蜉帙＠縺ｦ縺上□縺輔＞').optional()
});
// 繧ｷ繧ｹ繝・Β險ｭ螳夐未騾｣縺ｮ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝・
export const systemConfigSchema: any = z.object({
    version: z.string(),
    environment: z.enum(['development', 'production', 'staging']),
    features: z.object({
        chat: z.boolean(),
        emergencyGuide: z.boolean(),
        troubleshooting: z.boolean(),
        knowledgeBase: z.boolean(),
        voiceAssistant: z.boolean()
    }),
    limits: z.object({
        maxFileSize: z.number(),
        maxUploadFiles: z.number(),
        maxChatHistory: z.number()
    })
});


