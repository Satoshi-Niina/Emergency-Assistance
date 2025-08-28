import { createServer } from 'vite';
import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM用__dirname定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupVite(app: any) {
    try {
        // 本番環境では静的ファイルを配信
        if (process.env.NODE_ENV === 'production') {
            const clientDistPath = path.resolve(__dirname, '../../dist/client');
            
            if (fs.existsSync(clientDistPath)) {
                app.use(express.static(clientDistPath));
                
                app.get('*', (req, res) => {
                    res.sendFile(path.join(clientDistPath, 'index.html'));
                });
            } else {
                console.warn('Client dist directory not found:', clientDistPath);
            }
        } else {
            // 開発環境では開発サーバーを使用
            console.log('Development mode: Vite dev server should be running separately');
        }
    } catch (error) {
        console.error('Vite setup error:', error);
    }
}

export { setupVite };

// Log function for data-processor.ts
export const log = (message: string, ...args: any[]) => {
    console.log(message, ...args);
};
