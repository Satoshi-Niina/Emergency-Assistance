"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerKnowledgeBaseRoutes = registerKnowledgeBaseRoutes;
var path_1 = require("path");
var fs_1 = require("fs");
var zod_1 = require("zod");
var knowledgeBasePath = path_1.default.join(process.cwd(), 'knowledge-base');
// スキーマ定義
var imageMetadataSchema = zod_1.z.object({
    id: zod_1.z.string(),
    filename: zod_1.z.string(),
    description: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()),
    category: zod_1.z.string()
});
var flowSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    steps: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        imageId: zod_1.z.string().optional()
    }))
});
// ルート登録関数
function registerKnowledgeBaseRoutes(app) {
    // GPTデータの取得
    app.get('/api/knowledge/gpt/data', function (req, res) {
        try {
            var dataPath_1 = path_1.default.join(knowledgeBasePath, 'gpt', 'data');
            var files = fs_1.default.readdirSync(dataPath_1);
            var data = files.map(function (file) {
                var content = fs_1.default.readFileSync(path_1.default.join(dataPath_1, file), 'utf-8');
                return JSON.parse(content);
            });
            res.json(data);
        }
        catch (error) {
            console.error('Error reading GPT data:', error);
            res.status(500).json({ error: 'Failed to read GPT data' });
        }
    });
    // 画像メタデータの取得
    app.get('/api/knowledge/fuse/images', function (req, res) {
        try {
            var metadataPath = path_1.default.join(knowledgeBasePath, 'fuse', 'data', 'image_search_data.json');
            if (fs_1.default.existsSync(metadataPath)) {
                var data = JSON.parse(fs_1.default.readFileSync(metadataPath, 'utf-8'));
                res.json(data);
            }
            else {
                res.json([]);
            }
        }
        catch (error) {
            console.error('Error reading image metadata:', error);
            res.status(500).json({ error: 'Failed to read image metadata' });
        }
    });
    // トラブルシューティングフローの取得
    app.get('/api/knowledge/troubleshooting/flows', function (req, res) {
        try {
            var flowsPath_1 = path_1.default.join(knowledgeBasePath, 'troubleshooting', 'flows');
            var files = fs_1.default.readdirSync(flowsPath_1);
            var flows = files.map(function (file) {
                var content = fs_1.default.readFileSync(path_1.default.join(flowsPath_1, file), 'utf-8');
                return JSON.parse(content);
            });
            res.json(flows);
        }
        catch (error) {
            console.error('Error reading flows:', error);
            res.status(500).json({ error: 'Failed to read flows' });
        }
    });
    // 共有データの取得
    app.get('/api/knowledge/shared/:type', function (req, res) {
        try {
            var type = req.params.type;
            var dataPath_2 = path_1.default.join(knowledgeBasePath, 'shared', type);
            if (fs_1.default.existsSync(dataPath_2)) {
                var files = fs_1.default.readdirSync(dataPath_2);
                var data = files.map(function (file) {
                    var content = fs_1.default.readFileSync(path_1.default.join(dataPath_2, file), 'utf-8');
                    return JSON.parse(content);
                });
                res.json(data);
            }
            else {
                res.json([]);
            }
        }
        catch (error) {
            console.error("Error reading shared ".concat(req.params.type, " data:"), error);
            res.status(500).json({ error: "Failed to read shared ".concat(req.params.type, " data") });
        }
    });
    // 画像ファイルの提供
    app.get('/api/knowledge/images/:category/:filename', function (req, res) {
        try {
            var _a = req.params, category = _a.category, filename = _a.filename;
            var imagePath = path_1.default.join(knowledgeBasePath, category, 'images', filename);
            if (fs_1.default.existsSync(imagePath)) {
                res.sendFile(imagePath);
            }
            else {
                res.status(404).json({ error: 'Image not found' });
            }
        }
        catch (error) {
            console.error('Error serving image:', error);
            res.status(500).json({ error: 'Failed to serve image' });
        }
    });
    // 新しいトラブルシューティングフローの作成
    app.post('/api/knowledge/troubleshooting/flows', function (req, res) {
        try {
            var flow = flowSchema.parse(req.body);
            var flowsPath = path_1.default.join(knowledgeBasePath, 'troubleshooting', 'flows');
            var filePath = path_1.default.join(flowsPath, "".concat(flow.id, ".json"));
            fs_1.default.writeFileSync(filePath, JSON.stringify(flow, null, 2));
            res.status(201).json(flow);
        }
        catch (error) {
            console.error('Error creating flow:', error);
            res.status(500).json({ error: 'Failed to create flow' });
        }
    });
    // 画像メタデータの更新
    app.post('/api/knowledge/fuse/metadata', function (req, res) {
        try {
            var metadata = imageMetadataSchema.parse(req.body);
            var metadataPath = path_1.default.join(knowledgeBasePath, 'fuse', 'data', 'image_search_data.json');
            var existingData = [];
            if (fs_1.default.existsSync(metadataPath)) {
                existingData = JSON.parse(fs_1.default.readFileSync(metadataPath, 'utf-8'));
            }
            var updatedData = __spreadArray(__spreadArray([], existingData, true), [metadata], false);
            fs_1.default.writeFileSync(metadataPath, JSON.stringify(updatedData, null, 2));
            res.status(201).json(metadata);
        }
        catch (error) {
            console.error('Error updating image metadata:', error);
            res.status(500).json({ error: 'Failed to update image metadata' });
        }
    });
}
