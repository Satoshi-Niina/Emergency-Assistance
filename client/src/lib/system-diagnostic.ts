// システム診断機能
import { API_BASE_URL } from './api/config';

export interface DiagnosticResult {
  status: 'success' | 'failure' | 'unknown';
  message: string;
  details?: any;
  timestamp: string;
}

export interface SystemDiagnosticResults {
  database: DiagnosticResult;
  gpt: DiagnosticResult;
  storage: DiagnosticResult;
}

// APIエンドポイントの構築
function buildApiUrl(endpoint: string): string {
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${baseUrl}${endpoint}`;
}

// PostgreSQL接続確認
export async function checkDatabaseConnection(): Promise<DiagnosticResult> {
  try {
    const response = await fetch(buildApiUrl('/api/system-check/db-check'), {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok && data.status === 'OK') {
      return {
        status: 'success',
        message: 'データベース接続成功',
        details: data,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        status: 'failure',
        message: data.message || 'データベース接続失敗',
        details: data,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      status: 'failure',
      message: error instanceof Error ? error.message : '接続エラー',
      timestamp: new Date().toISOString()
    };
  }
}

// GPT接続確認
export async function checkGPTConnection(): Promise<DiagnosticResult> {
  try {
    const response = await fetch(buildApiUrl('/api/system-check/gpt-check'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'システム診断テストメッセージです'
      })
    });

    const data = await response.json();

    if (response.ok && data.status === 'OK') {
      return {
        status: 'success',
        message: 'OpenAI API接続成功',
        details: data,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        status: 'failure',
        message: data.message || 'OpenAI API接続失敗',
        details: data,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      status: 'failure',
      message: error instanceof Error ? error.message : '接続エラー',
      timestamp: new Date().toISOString()
    };
  }
}

// Azure Storage接続確認
export async function checkStorageConnection(): Promise<DiagnosticResult> {
  try {
    const response = await fetch(buildApiUrl('/api/system-check/storage-check'), {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok && data.status === 'OK') {
      return {
        status: 'success',
        message: 'Azure Storage接続成功',
        details: data,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        status: 'failure',
        message: data.message || 'Azure Storage接続失敗',
        details: data,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      status: 'failure',
      message: error instanceof Error ? error.message : '接続エラー',
      timestamp: new Date().toISOString()
    };
  }
}

// 全体診断実行
export async function runFullDiagnostic(): Promise<SystemDiagnosticResults> {
  console.log('🔍 システム診断を開始...');
  
  const [database, gpt, storage] = await Promise.allSettled([
    checkDatabaseConnection(),
    checkGPTConnection(),
    checkStorageConnection()
  ]);

  const results: SystemDiagnosticResults = {
    database: database.status === 'fulfilled' ? database.value : {
      status: 'failure',
      message: '診断実行エラー',
      timestamp: new Date().toISOString()
    },
    gpt: gpt.status === 'fulfilled' ? gpt.value : {
      status: 'failure',
      message: '診断実行エラー',
      timestamp: new Date().toISOString()
    },
    storage: storage.status === 'fulfilled' ? storage.value : {
      status: 'failure',
      message: '診断実行エラー',
      timestamp: new Date().toISOString()
    }
  };

  console.log('✅ システム診断完了:', results);
  return results;
}
