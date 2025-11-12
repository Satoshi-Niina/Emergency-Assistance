"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const multer_1 = __importDefault(require("multer"));
// 一時ファイルクリーンアップユーティリティ
function cleanupTempDirectory(dirPath) {
    if (!fs.existsSync(dirPath))
        return;
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        // 1時間以上古いファイルを削除
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        if (stats.mtime.getTime() < oneHourAgo) {
            fs.unlinkSync(filePath);
        }
    });
}
const router = (0, express_1.Router)();
// 知識ベースディレクトリの設定
const knowledgeBaseDir = path.join(__dirname, '../knowledge-base');
const documentsDir = path.join(knowledgeBaseDir, 'documents');
const imagesDir = path.join(knowledgeBaseDir, 'images');
const tempDir = path.join(knowledgeBaseDir, 'temp');
// ディレクトリが存在しない場合は作成
[documentsDir, imagesDir, tempDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});
// Multer設定
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = file.mimetype.startsWith('image/') ? imagesDir : documentsDir;
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}_${timestamp}${ext}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'text/plain',
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/json',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Unsupported file type. Please upload text files, PDFs, Office documents, or images.'));
        }
    }
});
// ファイルアップロードエンドポイント
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const filePath = req.file.path;
        const fileName = req.file.originalname;
        const fileType = req.file.mimetype;
        // ファイル情報をレスポンス
        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: {
                filename: req.file.filename,
                originalName: fileName,
                path: filePath,
                size: req.file.size,
                type: fileType
            }
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});
// ファイル一覧取得
router.get('/files', (req, res) => {
    try {
        const files = [];
        // ドキュメントファイル
        if (fs.existsSync(documentsDir)) {
            const docFiles = fs.readdirSync(documentsDir);
            docFiles.forEach(file => {
                const filePath = path.join(documentsDir, file);
                const stats = fs.statSync(filePath);
                files.push({
                    name: file,
                    type: 'document',
                    size: stats.size,
                    modified: stats.mtime,
                    path: filePath
                });
            });
        }
        // 画像ファイル
        if (fs.existsSync(imagesDir)) {
            const imgFiles = fs.readdirSync(imagesDir);
            imgFiles.forEach(file => {
                const filePath = path.join(imagesDir, file);
                const stats = fs.statSync(filePath);
                files.push({
                    name: file,
                    type: 'image',
                    size: stats.size,
                    modified: stats.mtime,
                    path: filePath
                });
            });
        }
        res.json({ files });
    }
    catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});
// ファイル削除
router.delete('/files/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const docPath = path.join(documentsDir, filename);
        const imgPath = path.join(imagesDir, filename);
        let deleted = false;
        if (fs.existsSync(docPath)) {
            fs.unlinkSync(docPath);
            deleted = true;
        }
        if (fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
            deleted = true;
        }
        if (deleted) {
            res.json({ success: true, message: 'File deleted successfully' });
        }
        else {
            res.status(404).json({ error: 'File not found' });
        }
    }
    catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});
// ファイルダウンロード
router.get('/files/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const docPath = path.join(documentsDir, filename);
        const imgPath = path.join(imagesDir, filename);
        let filePath = null;
        if (fs.existsSync(docPath)) {
            filePath = docPath;
        }
        else if (fs.existsSync(imgPath)) {
            filePath = imgPath;
        }
        if (filePath) {
            res.download(filePath, filename);
        }
        else {
            res.status(404).json({ error: 'File not found' });
        }
    }
    catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});
// 知識ベース検索
router.get('/search', (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Search query required' });
        }
        const results = [];
        // ドキュメントファイルから検索
        if (fs.existsSync(documentsDir)) {
            const files = fs.readdirSync(documentsDir);
            files.forEach(file => {
                const filePath = path.join(documentsDir, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.toLowerCase().includes(query.toLowerCase())) {
                        results.push({
                            type: 'document',
                            name: file,
                            path: filePath,
                            match: true
                        });
                    }
                }
                catch (error) {
                    // バイナリファイルの場合はスキップ
                }
            });
        }
        res.json({ results, query });
    }
    catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});
// 一時ファイルクリーンアップ
router.post('/cleanup', (req, res) => {
    try {
        cleanupTempDirectory(tempDir);
        res.json({ success: true, message: 'Cleanup completed' });
    }
    catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: 'Cleanup failed' });
    }
});
// ヘルスチェック
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Emergency Guide'
    });
});
exports.default = router;
