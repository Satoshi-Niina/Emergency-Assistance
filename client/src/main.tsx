import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { initializeDashboardSso } from './modules/tenant-auth/dashboard-sso';

// シンプルなQueryClientの作成
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// エラーバウンダリー
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50'>
          <div className='text-center'>
            <h1 className='text-2xl font-bold text-red-600 mb-4'>
              Application Error
            </h1>
            <p className='text-gray-600 mb-4'>
              アプリケーションでエラーが発生しました。
            </p>
            <button
              onClick={() => window.location.reload()}
              className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// メインの初期化関数
function initializeApp() {
  try {
    console.log('🚀 アプリケーションを初期化中...');

    const container = document.getElementById('root');
    if (!container) {
      throw new Error('Root container not found');
    }

    const root = createRoot(container);

    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );

    console.log('✅ アプリケーションの初期化が完了しました');
  } catch (error) {
    console.error('❌ アプリケーションの初期化に失敗しました:', error);

    // エラーが発生した場合のフォールバック表示
    const container = document.getElementById('root');
    if (container) {
      container.innerHTML = `
        <div style="
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f9fafb;
          font-family: system-ui, -apple-system, sans-serif;
        ">
          <div style="text-align: center; padding: 2rem;">
            <h1 style="color: #dc2626; font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">
              アプリケーションエラー
            </h1>
            <p style="color: #6b7280; margin-bottom: 1rem;">
              アプリケーションの初期化中にエラーが発生しました。
            </p>
            <button 
              onclick="window.location.reload()"
              style="
                background-color: #3b82f6;
                color: white;
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 0.25rem;
                cursor: pointer;
                font-size: 0.875rem;
                "
              onmouseover="this.style.backgroundColor='#2563eb'"
              onmouseout="this.style.backgroundColor='#3b82f6'"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      `;
    }
  }
}

const startApp = async () => {
  try {
    await initializeDashboardSso();
    initializeApp();
  } catch (error) {
    console.error('Dashboard SSO failed:', error);
    const container = document.getElementById('root');
    if (container) {
      container.textContent = error instanceof Error ? error.message : '認証連携に失敗しました。';
    }
  }
};

// DOMが準備できたら初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  void startApp();
}