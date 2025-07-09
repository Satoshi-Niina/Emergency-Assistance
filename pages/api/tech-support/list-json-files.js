"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function handler(req, res) {
    try {
        // 正しいknowledge-base/jsonディレクトリのパスを設定
        const metadataDir = path_1.default.join(process.cwd(), 'knowledge-base', 'json');
        // ディレクトリが存在しない場合は作成
        if (!fs_1.default.existsSync(metadataDir)) {
            fs_1.default.mkdirSync(metadataDir, { recursive: true });
        }
        // JSONファイルの一覧を取得（実際に存在するファイルのみ）
        const files = fs_1.default.readdirSync(metadataDir)
            .filter(file => file.endsWith('_metadata.json'))
            .filter(file => {
            const filePath = path_1.default.join(metadataDir, file);
            return fs_1.default.existsSync(filePath);
        })
            .sort((a, b) => {
            // 最新のファイルを先頭に
            const statA = fs_1.default.statSync(path_1.default.join(metadataDir, a));
            const statB = fs_1.default.statSync(path_1.default.join(metadataDir, b));
            return statB.mtime.getTime() - statA.mtime.getTime();
        });
        res.status(200).json(files);
    }
    catch (error) {
        console.error('Error listing JSON files:', error);
        res.status(500).json({ error: 'Failed to list JSON files' });
    }
}
