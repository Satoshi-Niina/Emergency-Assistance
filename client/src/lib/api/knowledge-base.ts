﻿import axios from 'axios';
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
  // GPT繝・・繧ｿ縺ｮ蜿門ｾ・
  getGptData: async () => {
    const response = await axios.get(KNOWLEDGE_API.GPT_DATA);
    return response.data;
  },

  // Fuse逕ｻ蜒上Γ繧ｿ繝・・繧ｿ縺ｮ蜿門ｾ・
  getFuseImages: async () => {
    const response = await axios.get(KNOWLEDGE_API.FUSE_IMAGES);
    return response.data as ImageMetadata[];
  },

  // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔Ο繝ｼ縺ｮ蜿門ｾ・
  getTroubleshootingFlows: async () => {
    const response = await axios.get(KNOWLEDGE_API.TROUBLESHOOTING_FLOWS);
    return response.data as Flow[];
  },

  // 蜈ｱ譛峨ョ繝ｼ繧ｿ縺ｮ蜿門ｾ・
  getSharedData: async (type: string) => {
    const response = await axios.get(KNOWLEDGE_API.SHARED_DATA(type));
    return response.data;
  },

  // 逕ｻ蜒上ヵ繧｡繧､繝ｫ縺ｮ蜿門ｾ・
  getImage: (category: string, filename: string) => {
    return KNOWLEDGE_API.IMAGES(category, filename);
  },

  // 譁ｰ縺励＞繝輔Ο繝ｼ縺ｮ菴懈・
  createFlow: async (flow: Flow) => {
    const response = await axios.post(KNOWLEDGE_API.TROUBLESHOOTING_FLOWS, flow);
    return response.data;
  },

  // 逕ｻ蜒上Γ繧ｿ繝・・繧ｿ縺ｮ譖ｴ譁ｰ
  updateImageMetadata: async (metadata: ImageMetadata) => {
    const response = await axios.post(`${KNOWLEDGE_API.BASE}/fuse/metadata`, metadata);
    return response.data;
  }
}; 


