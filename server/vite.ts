import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM逕ｨ__dirname螳夂ｾｩ
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupVite(app: any) {
    try {
        // 譛ｬ逡ｪ迺ｰ蠅・〒縺ｯ髱咏噪繝輔ぃ繧､繝ｫ繧帝・菫｡
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
            // 髢狗匱迺ｰ蠅・〒縺ｯ髢狗匱繧ｵ繝ｼ繝舌・繧剃ｽｿ逕ｨ
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
