/**
 * 知識ベースパス解決ヘルパー
 * 本番環境ではAzure Blob Storageを使用し、ローカルファイルアクセスを禁止
 */
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
/**
 * 知識ベースのベースパスを取得
 * 本番環境ではエラーをスローし、Azure Blob Storageの使用を強制
 */
export function getKnowledgeBasePath(...segments) {
    if (isProduction) {
        throw new Error('本番環境ではローカルファイルパスの使用は禁止されています。knowledgeBaseServiceを使用してAzure Blob Storageにアクセスしてください。');
    }
    const basePath = process.env.KNOWLEDGE_BASE_PATH ||
        path.join(__dirname, '..', '..', 'knowledge-base');
    if (segments.length === 0) {
        return basePath;
    }
    return path.join(basePath, ...segments);
}
/**
 * 開発環境かどうかを確認
 */
export function isDevelopment() {
    return !isProduction;
}
/**
 * 本番環境かどうかを確認
 */
export function isProductionEnvironment() {
    return isProduction;
}
