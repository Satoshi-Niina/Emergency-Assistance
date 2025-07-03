import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
}, {
    username: string;
    password: string;
}>;
export declare const insertUserSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
    display_name: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["admin", "employee", "manager"]>>;
    department: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
    display_name: string;
    role: "employee" | "admin" | "manager";
    department?: string | undefined;
}, {
    username: string;
    password: string;
    display_name: string;
    role?: "employee" | "admin" | "manager" | undefined;
    department?: string | undefined;
}>;
export declare const updateUserSchema: z.ZodObject<Omit<{
    username: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    display_name: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodDefault<z.ZodEnum<["admin", "employee", "manager"]>>>;
    department: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "password">, "strip", z.ZodTypeAny, {
    username?: string | undefined;
    display_name?: string | undefined;
    role?: "employee" | "admin" | "manager" | undefined;
    department?: string | undefined;
}, {
    username?: string | undefined;
    display_name?: string | undefined;
    role?: "employee" | "admin" | "manager" | undefined;
    department?: string | undefined;
}>;
export declare const insertChatSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    userId: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    id?: string | undefined;
    title?: string | undefined;
}, {
    userId: string;
    id?: string | undefined;
    title?: string | undefined;
}>;
export declare const insertMessageSchema: z.ZodObject<{
    chatId: z.ZodString;
    content: z.ZodString;
    isAiResponse: z.ZodDefault<z.ZodBoolean>;
    senderId: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    chatId: string;
    senderId: string | null;
    content: string;
    isAiResponse: boolean;
}, {
    chatId: string;
    senderId: string | null;
    content: string;
    isAiResponse?: boolean | undefined;
}>;
export declare const updateMessageSchema: z.ZodObject<{
    chatId: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    isAiResponse: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    senderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    chatId?: string | undefined;
    senderId?: string | null | undefined;
    content?: string | undefined;
    isAiResponse?: boolean | undefined;
}, {
    chatId?: string | undefined;
    senderId?: string | null | undefined;
    content?: string | undefined;
    isAiResponse?: boolean | undefined;
}>;
export declare const insertMediaSchema: z.ZodObject<{
    messageId: z.ZodString;
    type: z.ZodEnum<["image", "video", "audio", "document"]>;
    url: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    messageId: string;
    type: "image" | "video" | "audio" | "document";
    url: string;
    description?: string | undefined;
}, {
    messageId: string;
    type: "image" | "video" | "audio" | "document";
    url: string;
    description?: string | undefined;
}>;
export declare const insertDocumentSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
    title: string;
    content: string;
}, {
    userId: string;
    title: string;
    content: string;
}>;
export declare const updateDocumentSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId?: string | undefined;
    title?: string | undefined;
    content?: string | undefined;
}, {
    userId?: string | undefined;
    title?: string | undefined;
    content?: string | undefined;
}>;
export declare const insertKeywordSchema: z.ZodObject<{
    documentId: z.ZodOptional<z.ZodString>;
    word: z.ZodString;
}, "strip", z.ZodTypeAny, {
    word: string;
    documentId?: string | undefined;
}, {
    word: string;
    documentId?: string | undefined;
}>;
export declare const emergencyFlowStepSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["action", "decision", "end"]>;
    nextStepId: z.ZodOptional<z.ZodString>;
    conditions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        condition: z.ZodString;
        nextStepId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        nextStepId: string;
        condition: string;
    }, {
        nextStepId: string;
        condition: string;
    }>, "many">>;
    actions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    imageUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    type: "action" | "decision" | "end";
    description?: string | undefined;
    nextStepId?: string | undefined;
    conditions?: {
        nextStepId: string;
        condition: string;
    }[] | undefined;
    actions?: string[] | undefined;
    imageUrl?: string | undefined;
}, {
    id: string;
    title: string;
    type: "action" | "decision" | "end";
    description?: string | undefined;
    nextStepId?: string | undefined;
    conditions?: {
        nextStepId: string;
        condition: string;
    }[] | undefined;
    actions?: string[] | undefined;
    imageUrl?: string | undefined;
}>;
export declare const insertEmergencyFlowSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    steps: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<["action", "decision", "end"]>;
        nextStepId: z.ZodOptional<z.ZodString>;
        conditions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            condition: z.ZodString;
            nextStepId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            nextStepId: string;
            condition: string;
        }, {
            nextStepId: string;
            condition: string;
        }>, "many">>;
        actions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        imageUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        type: "action" | "decision" | "end";
        description?: string | undefined;
        nextStepId?: string | undefined;
        conditions?: {
            nextStepId: string;
            condition: string;
        }[] | undefined;
        actions?: string[] | undefined;
        imageUrl?: string | undefined;
    }, {
        id: string;
        title: string;
        type: "action" | "decision" | "end";
        description?: string | undefined;
        nextStepId?: string | undefined;
        conditions?: {
            nextStepId: string;
            condition: string;
        }[] | undefined;
        actions?: string[] | undefined;
        imageUrl?: string | undefined;
    }>, "many">;
    keyword: z.ZodString;
    category: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    steps: {
        id: string;
        title: string;
        type: "action" | "decision" | "end";
        description?: string | undefined;
        nextStepId?: string | undefined;
        conditions?: {
            nextStepId: string;
            condition: string;
        }[] | undefined;
        actions?: string[] | undefined;
        imageUrl?: string | undefined;
    }[];
    keyword: string;
    category: string;
    description?: string | undefined;
}, {
    title: string;
    steps: {
        id: string;
        title: string;
        type: "action" | "decision" | "end";
        description?: string | undefined;
        nextStepId?: string | undefined;
        conditions?: {
            nextStepId: string;
            condition: string;
        }[] | undefined;
        actions?: string[] | undefined;
        imageUrl?: string | undefined;
    }[];
    keyword: string;
    description?: string | undefined;
    category?: string | undefined;
}>;
export declare const updateEmergencyFlowSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<["action", "decision", "end"]>;
        nextStepId: z.ZodOptional<z.ZodString>;
        conditions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            condition: z.ZodString;
            nextStepId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            nextStepId: string;
            condition: string;
        }, {
            nextStepId: string;
            condition: string;
        }>, "many">>;
        actions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        imageUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        type: "action" | "decision" | "end";
        description?: string | undefined;
        nextStepId?: string | undefined;
        conditions?: {
            nextStepId: string;
            condition: string;
        }[] | undefined;
        actions?: string[] | undefined;
        imageUrl?: string | undefined;
    }, {
        id: string;
        title: string;
        type: "action" | "decision" | "end";
        description?: string | undefined;
        nextStepId?: string | undefined;
        conditions?: {
            nextStepId: string;
            condition: string;
        }[] | undefined;
        actions?: string[] | undefined;
        imageUrl?: string | undefined;
    }>, "many">>;
    keyword: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodDefault<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    title?: string | undefined;
    steps?: {
        id: string;
        title: string;
        type: "action" | "decision" | "end";
        description?: string | undefined;
        nextStepId?: string | undefined;
        conditions?: {
            nextStepId: string;
            condition: string;
        }[] | undefined;
        actions?: string[] | undefined;
        imageUrl?: string | undefined;
    }[] | undefined;
    keyword?: string | undefined;
    category?: string | undefined;
}, {
    description?: string | undefined;
    title?: string | undefined;
    steps?: {
        id: string;
        title: string;
        type: "action" | "decision" | "end";
        description?: string | undefined;
        nextStepId?: string | undefined;
        conditions?: {
            nextStepId: string;
            condition: string;
        }[] | undefined;
        actions?: string[] | undefined;
        imageUrl?: string | undefined;
    }[] | undefined;
    keyword?: string | undefined;
    category?: string | undefined;
}>;
export declare const insertImageSchema: z.ZodObject<{
    url: z.ZodString;
    description: z.ZodString;
    embedding: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    description: string;
    url: string;
    embedding: number[];
}, {
    description: string;
    url: string;
    embedding: number[];
}>;
export declare const insertChatExportSchema: z.ZodObject<{
    chatId: z.ZodString;
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
    chatId: string;
}, {
    userId: string;
    chatId: string;
}>;
export declare const searchQuerySchema: z.ZodObject<{
    query: z.ZodString;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    category: z.ZodOptional<z.ZodString>;
    type: z.ZodDefault<z.ZodEnum<["all", "documents", "emergency-flows", "images"]>>;
}, "strip", z.ZodTypeAny, {
    type: "images" | "documents" | "all" | "emergency-flows";
    query: string;
    page: number;
    limit: number;
    category?: string | undefined;
}, {
    query: string;
    type?: "images" | "documents" | "all" | "emergency-flows" | undefined;
    category?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}>;
export declare const fileUploadSchema: z.ZodObject<{
    file: z.ZodEffects<z.ZodType<File, z.ZodTypeDef, File>, File, File>;
    type: z.ZodEnum<["image", "document", "video", "audio"]>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "image" | "video" | "audio" | "document";
    file: File;
    description?: string | undefined;
}, {
    type: "image" | "video" | "audio" | "document";
    file: File;
    description?: string | undefined;
}>;
export declare const systemConfigSchema: z.ZodObject<{
    version: z.ZodString;
    environment: z.ZodEnum<["development", "production", "staging"]>;
    features: z.ZodObject<{
        chat: z.ZodBoolean;
        emergencyGuide: z.ZodBoolean;
        troubleshooting: z.ZodBoolean;
        knowledgeBase: z.ZodBoolean;
        voiceAssistant: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        chat: boolean;
        emergencyGuide: boolean;
        troubleshooting: boolean;
        knowledgeBase: boolean;
        voiceAssistant: boolean;
    }, {
        chat: boolean;
        emergencyGuide: boolean;
        troubleshooting: boolean;
        knowledgeBase: boolean;
        voiceAssistant: boolean;
    }>;
    limits: z.ZodObject<{
        maxFileSize: z.ZodNumber;
        maxUploadFiles: z.ZodNumber;
        maxChatHistory: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        maxFileSize: number;
        maxUploadFiles: number;
        maxChatHistory: number;
    }, {
        maxFileSize: number;
        maxUploadFiles: number;
        maxChatHistory: number;
    }>;
}, "strip", z.ZodTypeAny, {
    version: string;
    environment: "development" | "production" | "staging";
    features: {
        chat: boolean;
        emergencyGuide: boolean;
        troubleshooting: boolean;
        knowledgeBase: boolean;
        voiceAssistant: boolean;
    };
    limits: {
        maxFileSize: number;
        maxUploadFiles: number;
        maxChatHistory: number;
    };
}, {
    version: string;
    environment: "development" | "production" | "staging";
    features: {
        chat: boolean;
        emergencyGuide: boolean;
        troubleshooting: boolean;
        knowledgeBase: boolean;
        voiceAssistant: boolean;
    };
    limits: {
        maxFileSize: number;
        maxUploadFiles: number;
        maxChatHistory: number;
    };
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export type InsertUserInput = z.infer<typeof insertUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type InsertChatInput = z.infer<typeof insertChatSchema>;
export type InsertMessageInput = z.infer<typeof insertMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type InsertMediaInput = z.infer<typeof insertMediaSchema>;
export type InsertDocumentInput = z.infer<typeof insertDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type InsertKeywordInput = z.infer<typeof insertKeywordSchema>;
export type EmergencyFlowStepInput = z.infer<typeof emergencyFlowStepSchema>;
export type InsertEmergencyFlowInput = z.infer<typeof insertEmergencyFlowSchema>;
export type UpdateEmergencyFlowInput = z.infer<typeof updateEmergencyFlowSchema>;
export type InsertImageInput = z.infer<typeof insertImageSchema>;
export type InsertChatExportInput = z.infer<typeof insertChatExportSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type SystemConfigInput = z.infer<typeof systemConfigSchema>;
//# sourceMappingURL=validation.d.ts.map