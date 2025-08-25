import { z } from 'zod';
export declare const users: any;
export declare const chats: any;
export declare const messages: any;
export declare const media: any;
export declare const emergencyFlows: any;
export declare const images: any;
export declare const documents: any;
export declare const keywords: any;
export declare const chatExports: any;
export declare const insertUserSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
    display_name: z.ZodString;
    role: z.ZodDefault<z.ZodString>;
    department: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    username?: string;
    password?: string;
    display_name?: string;
    role?: string;
    department?: string;
    description?: string;
}, {
    username?: string;
    password?: string;
    display_name?: string;
    role?: string;
    department?: string;
    description?: string;
}>;
export declare const insertChatSchema: z.ZodObject<{
    userId: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId?: string;
    title?: string;
}, {
    userId?: string;
    title?: string;
}>;
export declare const insertMessageSchema: z.ZodObject<{
    chatId: z.ZodString;
    senderId: z.ZodString;
    content: z.ZodString;
    isAiResponse: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    chatId?: string;
    senderId?: string;
    content?: string;
    isAiResponse?: boolean;
}, {
    chatId?: string;
    senderId?: string;
    content?: string;
    isAiResponse?: boolean;
}>;
export declare const insertMediaSchema: z.ZodObject<{
    messageId: z.ZodString;
    type: z.ZodString;
    url: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    messageId?: string;
    type?: string;
    url?: string;
}, {
    description?: string;
    messageId?: string;
    type?: string;
    url?: string;
}>;
export declare const insertDocumentSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId?: string;
    title?: string;
    content?: string;
}, {
    userId?: string;
    title?: string;
    content?: string;
}>;
export declare const schema: {
    users: any;
    chats: any;
    messages: any;
    media: any;
    documents: any;
    keywords: any;
    emergencyFlows: any;
    images: any;
    chatExports: any;
};


