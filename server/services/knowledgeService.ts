import { sql } from '../db/db.js';

// 一時的に無効化 - TypeScriptエラーが多すぎるため
export interface EmergencyFlow {
  id: string;
  title: string;
  description?: string;
  keyword?: string;
  category?: string;
  steps?: any[];
  imagePath?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface FlowSearchParams {
  title?: string;
  keyword?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface FlowSearchResult {
  items: EmergencyFlow[];
  total: number;
  page: number;
  totalPages: number;
}

export class KnowledgeService {
  // 一時的に無効化 - 後で修正予定
  static async createFlow(data: any): Promise<EmergencyFlow> {
    throw new Error('KnowledgeService is temporarily disabled');
  }

  static async getFlowList(params: FlowSearchParams): Promise<FlowSearchResult> {
    throw new Error('KnowledgeService is temporarily disabled');
  }

  static async getFlowById(id: string): Promise<EmergencyFlow | null> {
    throw new Error('KnowledgeService is temporarily disabled');
  }

  static async deleteFlow(id: string): Promise<boolean> {
    throw new Error('KnowledgeService is temporarily disabled');
  }

  static async updateFlow(id: string, data: Partial<EmergencyFlow>): Promise<EmergencyFlow | null> {
    throw new Error('KnowledgeService is temporarily disabled');
  }

  static async getCategories(): Promise<string[]> {
    throw new Error('KnowledgeService is temporarily disabled');
  }

  static async searchByKeyword(keyword: string): Promise<EmergencyFlow[]> {
    throw new Error('KnowledgeService is temporarily disabled');
  }

  static async getStatistics(): Promise<{
    total: number;
    categories: number;
    today: number;
    thisWeek: number;
  }> {
    throw new Error('KnowledgeService is temporarily disabled');
  }
} 