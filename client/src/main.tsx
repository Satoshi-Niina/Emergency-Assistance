import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import React from "react";

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode }, 
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Application Error
            </h1>
            <p className="text-gray-600 mb-4">
              Something went wrong. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 最強の初期化防止策
const REACT_SINGLETON_KEY = '__REACT_SINGLETON_INITIALIZED__';
const REACT_ROOT_KEY = '__REACT_ROOT_INSTANCE__';
const REACT_INIT_KEY = '__REACT_INIT_COMPLETE__';

// 即座にチェック - 既に初期化済みなら処理を停止
if ((window as any)[REACT_SINGLETON_KEY]) {
  console.log('⛔ React already initialized, stopping duplicate initialization');
  throw new Error('React already initialized');
}

const container = document.getElementById('root');
if (!container) {
  console.error('❌ Root container not found');
  throw new Error('Root container missing');
}

// DOM状態の厳密チェック
if (container.children.length > 0 || container.hasAttribute('data-react-root')) {
  console.log('⛔ DOM already contains React content, aborting');
  throw new Error('React DOM already populated');
}

// Viteの完全無効化
if (typeof window !== 'undefined') {
  // WebSocketの完全削除
  delete (window as any).WebSocket;
  (window as any).WebSocket = undefined;

  // Vite関連機能の無効化
  delete (window as any).__vite_plugin_react_preamble_installed__;

  // コンソールフィルタリング
  const originalConsole = { ...console };
  ['log', 'warn', 'info'].forEach(method => {
    (console as any)[method] = (...args: any[]) => {
      const msg = String(args[0] || '');
      if (!msg.includes('[vite]') && !msg.includes('connecting') && !msg.includes('connected')) {
        (originalConsole as any)[method](...args);
      }
    };
  });
}

try {
  // 初期化開始の宣言
  console.log('🚀 React initialization starting...');

  // 即座にシングルトンフラグを設定
  (window as any)[REACT_SINGLETON_KEY] = true;

  // DOM属性を設定
  container.setAttribute('data-react-root', 'true');
  container.setAttribute('data-initialized', Date.now().toString());

  const root = createRoot(container);

  // グローバル参照を設定
  (window as any).__REACT_ROOT__ = root;

    root.render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  );

  console.log('✅ React singleton initialized successfully');

} catch (error) {
  console.error('❌ React initialization failed:', error);
  // 失敗時のクリーンアップ
  delete (window as any)[REACT_SINGLETON_KEY];
  delete (window as any).__REACT_ROOT__;
  container.removeAttribute('data-react-root');
  container.removeAttribute('data-initialized');
}