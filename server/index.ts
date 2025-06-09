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
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
