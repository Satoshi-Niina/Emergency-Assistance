"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.knowledgeBaseApi = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
exports.knowledgeBaseApi = {
    // GPTデータの取得
    getGptData: async () => {
        const response = await axios_1.default.get(config_1.KNOWLEDGE_API.GPT_DATA);
        return response.data;
    },
    // Fuse画像メタデータの取得
    getFuseImages: async () => {
        const response = await axios_1.default.get(config_1.KNOWLEDGE_API.FUSE_IMAGES);
        return response.data;
    },
    // トラブルシューティングフローの取得
    getTroubleshootingFlows: async () => {
        const response = await axios_1.default.get(config_1.KNOWLEDGE_API.TROUBLESHOOTING_FLOWS);
        return response.data;
    },
    // 共有データの取得
    getSharedData: async (type) => {
        const response = await axios_1.default.get(config_1.KNOWLEDGE_API.SHARED_DATA(type));
        return response.data;
    },
    // 画像ファイルの取得
    getImage: (category, filename) => {
        return config_1.KNOWLEDGE_API.IMAGES(category, filename);
    },
    // 新しいフローの作成
    createFlow: async (flow) => {
        const response = await axios_1.default.post(config_1.KNOWLEDGE_API.TROUBLESHOOTING_FLOWS, flow);
        return response.data;
    },
    // 画像メタデータの更新
    updateImageMetadata: async (metadata) => {
        const response = await axios_1.default.post(`${config_1.KNOWLEDGE_API.BASE}/fuse/metadata`, metadata);
        return response.data;
    }
};
