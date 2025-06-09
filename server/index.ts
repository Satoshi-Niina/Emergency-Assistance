import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 静的ファイル配信
const distPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(distPath));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// SPAルーティング（APIルート以外は全てindex.htmlを返す）
app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (require('fs').existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(503).send('<h1>Application not built</h1><p>Run: npm run build:client</p>');
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
