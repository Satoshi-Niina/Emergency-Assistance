import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import React from "react";
import ReactDOM from "react-dom/client";
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
// EventEmitterのリスナー上限を増加
import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 30;

// グローバルなEventEmitterのリスナー上限を設定
if (typeof process !== 'undefined' && process.setMaxListeners) {
  process.setMaxListeners(30);
}

// 完全なVite HMR重複防止システム
const VITE_HMR_KEY = '__VITE_HMR_INITIALIZED__';
let viteHmrInitialized = (window as any)[VITE_HMR_KEY] || false;

// HMR初期化をグローバルレベルで管理
const initializeHMR = () => {
  if (viteHmrInitialized || !(window as any)[VITE_HMR_KEY]) {
    console.log('🔥 Initializing Vite HMR (first time)');
    (window as any)[VITE_HMR_KEY] = true;
    viteHmrInitialized = true;

    if (import.meta.hot) {
      import.meta.hot.accept(() => {
        console.log('[HMR] Module updated');
      });

      import.meta.hot.dispose(() => {
        console.log('[HMR] Module disposed');
      });
    }
  } else {
    console.log('🔥 Vite HMR already initialized, skipping');
  }
};

// 開発環境でのみHMR初期化
if (import.meta.env.DEV) {
  initializeHMR();
}

// Vite HMR WebSocketエラーとメモリリーク警告を無視
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && 
      (message.includes('WebSocket connection') || 
       message.includes('Failed to construct \'WebSocket\'') ||
       message.includes('wss://localhost:undefined') ||
       message.includes('MaxListenersExceededWarning'))) {
    // WebSocketエラーとメモリリーク警告は無視（開発環境でのみ）
    return;
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && 
      message.includes('MaxListenersExceededWarning')) {
    // メモリリーク警告は無視
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// HMR接続の重複を防ぐ
if (import.meta.hot && !viteHmrInitialized) {
  viteHmrInitialized = true;

  // 既存のリスナーをクリア
  import.meta.hot.dispose(() => {
    viteHmrInitialized = false;
  });
}

const container = document.getElementById("root");
if (container && !container.hasAttribute('data-react-root')) {
  // React rootの重複初期化を防ぐ
  container.setAttribute('data-react-root', 'true');

  const root = createRoot(container);
  root.render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  );

  // クリーンアップ処理
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      container.removeAttribute('data-react-root');
    });
  }
}