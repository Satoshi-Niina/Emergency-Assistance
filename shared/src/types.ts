// Shared types for the Emergency Assistance System

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
}

export interface EmergencyFlow {
  id: string;
  title: string;
  description: string;
  steps: EmergencyStep[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyStep {
  id: string;
  title: string;
  description: string;
  order: number;
  images?: string[];
  conditions?: Record<string, any>;
}

export interface MachineType {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface Machine {
  id: string;
  machineTypeId: string;
  serialNumber: string;
  location: string;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
} 