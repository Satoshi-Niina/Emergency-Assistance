import { z } from 'zod';
import type { ApiResponse, SearchResult, SystemConfig } from './types';
/**
 * バリデーションエラーをユーザーフレンドリーなメッセージに変換
 */
export declare function formatValidationError(error: z.ZodError): string;
/**
 * APIレスポンスの成功レスポンスを作成
 */
export declare function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T>;
/**
 * APIレスポンスのエラーレスポンスを作成
 */
export declare function createErrorResponse(error: string, data?: any): ApiResponse;
/**
 * 検索結果を作成
 */
export declare function createSearchResult<T>(items: T[], total: number, page: number, limit: number): SearchResult<T>;
/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
export declare function formatFileSize(bytes: number): string;
/**
 * 日付をフォーマット
 */
export declare function formatDate(date: Date | string, format?: 'short' | 'long' | 'iso'): string;
/**
 * 文字列を安全に切り詰める
 */
export declare function truncateString(str: string, maxLength: number, suffix?: string): string;
/**
 * UUIDを生成
 */
export declare function generateUUID(): string;
/**
 * ファイル拡張子を取得
 */
export declare function getFileExtension(filename: string): string;
/**
 * MIMEタイプからファイルタイプを判定
 */
export declare function getFileTypeFromMime(mimeType: string): 'image' | 'video' | 'audio' | 'document';
/**
 * ファイルが画像かどうかを判定
 */
export declare function isImageFile(filename: string): boolean;
/**
 * パスワードの強度をチェック
 */
export declare function validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
};
/**
 * 環境変数からシステム設定を取得
 */
export declare function getSystemConfig(): SystemConfig;
/**
 * デバウンス関数
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
/**
 * スロットル関数
 */
export declare function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void;
/**
 * 深いオブジェクトの比較
 */
export declare function deepEqual(obj1: any, obj2: any): boolean;
/**
 * オブジェクトの深いコピー
 */
export declare function deepClone<T>(obj: T): T;
/**
 * 配列を指定されたサイズのチャンクに分割
 */
export declare function chunkArray<T>(array: T[], size: number): T[][];
/**
 * 配列から重複を除去
 */
export declare function removeDuplicates<T>(array: T[], key?: keyof T): T[];
/**
 * 非同期処理のリトライ機能
 */
export declare function retry<T>(fn: () => Promise<T>, maxAttempts?: number, delay?: number): Promise<T>;
//# sourceMappingURL=utils.d.ts.map