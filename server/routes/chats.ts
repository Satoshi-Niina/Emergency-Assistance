import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// ベースディレクトリ（knowledge-base/exports）
const knowledgeBaseDir = path.join(process.cwd(), 'knowledge-base');
const exportsDir = path.join(knowledgeBaseDir, 'exports');

function ensureExportsDir() {
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }
}

// 動作確認用: GET /api/chats/ping
router.get('/ping', (_req, res) => {
  res.json({ ok: true, route: 'chats', timestamp: new Date().toISOString() });
});

// 旧フロント開発用のテスト送信エンドポイント
// POST /api/chats/:chatId/send-test
router.post('/:chatId/send-test', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { chatData, exportType = 'send-test' } = req.body || {};

    if (!chatId) {
      return res.status(400).json({ success: false, message: 'chatId が必要です' });
    }
    if (!chatData) {
      return res.status(400).json({ success: false, message: 'chatData が必要です' });
    }

    ensureExportsDir();
    const ts = Date.now();
    const fileName = `chat_${chatId}_${ts}_${exportType}.json`; 
    const filePath = path.join(exportsDir, fileName);

    const payload = {
      savedAt: new Date().toISOString(),
      chatId,
      exportType,
      messageCount: Array.isArray(chatData?.messages) ? chatData.messages.length : 0,
      chatData
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');

    return res.json({
      success: true,
      message: 'send-test チャットデータを保存しました',
      fileName,
      relativePath: path.relative(process.cwd(), filePath)
    });
  } catch (e) {
    console.error('send-test 保存エラー:', e);
    return res.status(500).json({ success: false, message: '送信テスト保存に失敗しました' });
  }
});

// 本番想定: POST /api/chats/:chatId/send
router.post('/:chatId/send', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { chatData, exportType = 'manual_send' } = req.body || {};

    if (!chatId || !chatData) {
      return res.status(400).json({ success: false, message: 'chatId と chatData が必要です' });
    }

    ensureExportsDir();
    const ts = Date.now();
    const fileName = `chat_${chatId}_${ts}_${exportType}.json`; 
    const filePath = path.join(exportsDir, fileName);

    const payload = {
      savedAt: new Date().toISOString(),
      chatId,
      exportType,
      messageCount: Array.isArray(chatData?.messages) ? chatData.messages.length : 0,
      chatData
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');

    return res.json({
      success: true,
      message: 'チャットデータを保存しました',
      fileName,
      relativePath: path.relative(process.cwd(), filePath)
    });
  } catch (e) {
    console.error('send 保存エラー:', e);
    return res.status(500).json({ success: false, message: 'チャット保存に失敗しました' });
  }
});

export default router;
