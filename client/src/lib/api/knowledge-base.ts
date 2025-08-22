import axios from 'axios';
import { KNOWLEDGE_API } from './config';

export interface ImageMetadata {
  id: string;
  file: string;
  title: string;
  category: string;
  keywords: string[];
  description: string;
}

export interface FlowStep {
  id: string;
  description: string;
  imageId?: string;
  nextStepId?: string;
}

export interface Flow {
  id: string;
  title: string;
  steps: FlowStep[];
}

export const knowledgeBaseApi = {
  // GPTチE�Eタの取征E
  getGptData: async () => {
    const response = await axios.get(KNOWLEDGE_API.GPT_DATA);
    return response.data;
  },

  // Fuse画像メタチE�Eタの取征E
  getFuseImages: async () => {
    const response = await axios.get(KNOWLEDGE_API.FUSE_IMAGES);
    return response.data as ImageMetadata[];
  },

  // トラブルシューチE��ングフローの取征E
  getTroubleshootingFlows: async () => {
    const response = await axios.get(KNOWLEDGE_API.TROUBLESHOOTING_FLOWS);
    return response.data as Flow[];
  },

  // 共有データの取征E
  getSharedData: async (type: string) => {
    const response = await axios.get(KNOWLEDGE_API.SHARED_DATA(type));
    return response.data;
  },

  // 画像ファイルの取征E
  getImage: (category: string, filename: string) => {
    return KNOWLEDGE_API.IMAGES(category, filename);
  },

  // 新しいフローの作�E
  createFlow: async (flow: Flow) => {
    const response = await axios.post(KNOWLEDGE_API.TROUBLESHOOTING_FLOWS, flow);
    return response.data;
  },

  // 画像メタチE�Eタの更新
  updateImageMetadata: async (metadata: ImageMetadata) => {
    const response = await axios.post(`${KNOWLEDGE_API.BASE}/fuse/metadata`, metadata);
    return response.data;
  }
}; 
