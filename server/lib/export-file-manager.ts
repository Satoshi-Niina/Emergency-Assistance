import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM逕ｨ__dirname螳夂ｾｩ
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ExportFileManager {
    private baseDir: string;

    constructor(baseDir: string = path.join(__dirname, '../../knowledge-base/exports')) {
        this.baseDir = baseDir;
        
        // 繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
    }

    /**
     * 繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝医ョ繝ｼ繧ｿ繧偵ヵ繧｡繧､繝ｫ縺ｫ菫晏ｭ・
     */
    saveChatExport(chatId: string, data: any, timestamp: number): string {
        const chatDir = path.join(this.baseDir, `chat_${chatId}`);
        
        if (!fs.existsSync(chatDir)) {
            fs.mkdirSync(chatDir, { recursive: true });
        }

        const fileName = `export_${new Date(timestamp).toISOString().replace(/[:.]/g, '-')}.json`;
        const filePath = path.join(chatDir, fileName);

        try {
            // 繝繝悶Ν繧ｯ繧ｪ繝ｼ繝・・繧ｷ繝ｧ繝ｳ繧定恭謨ｰ蟆乗枚蟄励↓邨ｱ荳縺励※JSON繝輔ぃ繧､繝ｫ繧剃ｿ晏ｭ・
            const jsonString = JSON.stringify(data, null, 2);
            fs.writeFileSync(filePath, jsonString, 'utf8');
            console.log(`繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝井ｿ晏ｭ・ ${filePath}`);
            return filePath;
        } catch (error) {
            console.error('繧ｨ繧ｯ繧ｹ繝昴・繝医ヵ繧｡繧､繝ｫ菫晏ｭ倥お繝ｩ繝ｼ:', error);
            throw error;
        }
    }

    /**
     * 譛譁ｰ縺ｮ繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝医ヵ繧｡繧､繝ｫ繧定ｪｭ縺ｿ霎ｼ縺ｿ
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
            console.error('繧ｨ繧ｯ繧ｹ繝昴・繝医ヵ繧｡繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', error);
            return null;
        }
    }

    /**
     * 繝√Ε繝・ヨ縺ｮ蜈ｨ繧ｨ繧ｯ繧ｹ繝昴・繝医ヵ繧｡繧､繝ｫ荳隕ｧ繧貞叙蠕・
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
            console.error('繧ｨ繧ｯ繧ｹ繝昴・繝医ヵ繧｡繧､繝ｫ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
            return [];
        }
    }

    /**
     * 蜿､縺・お繧ｯ繧ｹ繝昴・繝医ヵ繧｡繧､繝ｫ繧貞炎髯､
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

            // 謖・ｮ壽焚繧医ｊ螟壹＞蝣ｴ蜷医・蜿､縺・ヵ繧｡繧､繝ｫ繧貞炎髯､
            if (files.length > keepCount) {
                const filesToDelete = files.slice(keepCount);
                for (const file of filesToDelete) {
                    const filePath = path.join(chatDir, file);
                    fs.unlinkSync(filePath);
                    console.log(`蜿､縺・お繧ｯ繧ｹ繝昴・繝医ヵ繧｡繧､繝ｫ蜑企勁: ${filePath}`);
                }
            }
        } catch (error) {
            console.error('蜿､縺・お繧ｯ繧ｹ繝昴・繝医ヵ繧｡繧､繝ｫ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
        }
    }

    /**
     * 繝輔か繝ｼ繝槭ャ繝域ｸ医∩繧ｨ繧ｯ繧ｹ繝昴・繝医ョ繝ｼ繧ｿ繧剃ｿ晏ｭ・
     */
    saveFormattedExport(chatId: number | string, formattedData: any): string {
        const chatDir = path.join(this.baseDir, `chat_${chatId}`);
        
        if (!fs.existsSync(chatDir)) {
            fs.mkdirSync(chatDir, { recursive: true });
        }

        const fileName = `formatted_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const filePath = path.join(chatDir, fileName);

        try {
            // 繝繝悶Ν繧ｯ繧ｪ繝ｼ繝・・繧ｷ繝ｧ繝ｳ繧定恭謨ｰ蟆乗枚蟄励↓邨ｱ荳縺励※繝輔か繝ｼ繝槭ャ繝域ｸ医∩繧ｨ繧ｯ繧ｹ繝昴・繝医ｒ菫晏ｭ・
            const jsonString = JSON.stringify(formattedData, null, 2);
            fs.writeFileSync(filePath, jsonString, 'utf8');
            console.log(`繝輔か繝ｼ繝槭ャ繝域ｸ医∩繧ｨ繧ｯ繧ｹ繝昴・繝井ｿ晏ｭ・ ${filePath}`);
            return filePath;
        } catch (error) {
            console.error('繝輔か繝ｼ繝槭ャ繝域ｸ医∩繧ｨ繧ｯ繧ｹ繝昴・繝医ヵ繧｡繧､繝ｫ菫晏ｭ倥お繝ｩ繝ｼ:', error);
            throw error;
        }
    }
}

// 繝・ヵ繧ｩ繝ｫ繝医う繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ
export const exportFileManager = new ExportFileManager(); 