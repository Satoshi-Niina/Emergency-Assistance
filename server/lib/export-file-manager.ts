import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM用__dirname定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ExportFileManager {
    private baseDir: string;

    constructor(baseDir: string = path.join(__dirname, '../../knowledge-base/exports')) {
        this.baseDir = baseDir;
        
        // ディレクトリが存在しない場合は作成
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
    }

    /**
     * チャットエクスポートデータをファイルに保存
     */
    saveChatExport(chatId: string, data: any, timestamp: number): string {
        const chatDir = path.join(this.baseDir, `chat_${chatId}`);
        
        if (!fs.existsSync(chatDir)) {
            fs.mkdirSync(chatDir, { recursive: true });
        }

        const fileName = `export_${new Date(timestamp).toISOString().replace(/[:.]/g, '-')}.json`;
        const filePath = path.join(chatDir, fileName);

        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`チャットエクスポート保存: ${filePath}`);
            return filePath;
        } catch (error) {
            console.error('エクスポートファイル保存エラー:', error);
            throw error;
        }
    }

    /**
     * 最新のチャットエクスポートファイルを読み込み
     */
    loadLatestChatExport(chatId: string): any {
        const chatDir = path.join(this.baseDir, `chat_${chatId}`);
        
        if (!fs.existsSync(chatDir)) {
            return null;
        }

        try {
            const files = fs.readdirSync(chatDir)
                .filter(file => file.endsWith('.json'))
                .sort()
                .reverse();

            if (files.length === 0) {
                return null;
            }

            const latestFile = path.join(chatDir, files[0]);
            const data = fs.readFileSync(latestFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('エクスポートファイル読み込みエラー:', error);
            return null;
        }
    }

    /**
     * チャットの全エクスポートファイル一覧を取得
     */
    getChatExportFiles(chatId: string): string[] {
        const chatDir = path.join(this.baseDir, `chat_${chatId}`);
        
        if (!fs.existsSync(chatDir)) {
            return [];
        }

        try {
            return fs.readdirSync(chatDir)
                .filter(file => file.endsWith('.json'))
                .map(file => path.join(chatDir, file));
        } catch (error) {
            console.error('エクスポートファイル一覧取得エラー:', error);
            return [];
        }
    }

    /**
     * 古いエクスポートファイルを削除
     */
    cleanupOldExports(chatId: string, keepCount: number = 5): void {
        const chatDir = path.join(this.baseDir, `chat_${chatId}`);
        
        if (!fs.existsSync(chatDir)) {
            return;
        }

        try {
            const files = fs.readdirSync(chatDir)
                .filter(file => file.endsWith('.json'))
                .sort()
                .reverse();

            // 指定数より多い場合は古いファイルを削除
            if (files.length > keepCount) {
                const filesToDelete = files.slice(keepCount);
                for (const file of filesToDelete) {
                    const filePath = path.join(chatDir, file);
                    fs.unlinkSync(filePath);
                    console.log(`古いエクスポートファイル削除: ${filePath}`);
                }
            }
        } catch (error) {
            console.error('古いエクスポートファイル削除エラー:', error);
        }
    }

    /**
     * フォーマット済みエクスポートデータを保存
     */
    saveFormattedExport(chatId: number, formattedData: any): string {
        const chatDir = path.join(this.baseDir, `chat_${chatId}`);
        
        if (!fs.existsSync(chatDir)) {
            fs.mkdirSync(chatDir, { recursive: true });
        }

        const fileName = `formatted_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const filePath = path.join(chatDir, fileName);

        try {
            fs.writeFileSync(filePath, JSON.stringify(formattedData, null, 2), 'utf8');
            console.log(`フォーマット済みエクスポート保存: ${filePath}`);
            return filePath;
        } catch (error) {
            console.error('フォーマット済みエクスポートファイル保存エラー:', error);
            throw error;
        }
    }
}

// デフォルトインスタンス
export const exportFileManager = new ExportFileManager(); 