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

// 複数レベルでの初期化防止
const REACT_INIT_KEY = '__REACT_APP_INITIALIZED__';
const REACT_ROOT_KEY = '__REACT_ROOT_INSTANCE__';
const REACT_LOCK_KEY = '__REACT_INITIALIZATION_LOCK__';

const container = document.getElementById("root");

// ページレベルでの初期化状態チェック
const PAGE_LOAD_KEY = '__PAGE_LOAD_TIMESTAMP__';
const currentPageLoad = (window as any)[PAGE_LOAD_KEY] || Date.now();
(window as any)[PAGE_LOAD_KEY] = currentPageLoad;

// より厳密な重複チェック
const isAlreadyInitialized = 
  !!(window as any)[REACT_INIT_KEY] || 
  !!(window as any)[REACT_ROOT_KEY] ||
  !!(window as any)[REACT_LOCK_KEY] ||
  (container && container.hasAttribute('data-react-initialized')) ||
  (container && container.children.length > 0) ||
  (container && container.querySelector('[data-reactroot]'));

console.log(`🔍 React initialization check (Page Load: ${currentPageLoad}):`, {
  hasInitKey: !!(window as any)[REACT_INIT_KEY],
  hasRootKey: !!(window as any)[REACT_ROOT_KEY],
  hasLockKey: !!(window as any)[REACT_LOCK_KEY],
  hasDataAttr: container && container.hasAttribute('data-react-initialized'),
  hasChildren: container && container.children.length > 0,
  isAlreadyInitialized
});

if (!isAlreadyInitialized) {
  // 初期化ロックを設定
  (window as any)[REACT_LOCK_KEY] = true;
  console.log('🚀 Initializing React app (first time)');

  // グローバルフラグを設定
  (window as any)[REACT_INIT_KEY] = true;

  // Vite接続を完全ブロック
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  // WebSocketを完全に無効化（全ての接続をブロック）
  if (typeof WebSocket !== 'undefined') {
    console.log('🚫 WebSocket completely disabled');
    (window as any).WebSocket = function(...args: any[]) {
      console.log('🚫 WebSocket connection blocked:', args[0]);
      // 全てのWebSocket接続をブロック
      return {
        close: () => {},
        send: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        readyState: 3, // CLOSED
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3
      };
    };
    
    // WebSocketコンストラクタも無効化
    delete (window as any).WebSocket;
    (window as any).WebSocket = undefined;
  }

  console.error = (...args) => {
    const message = String(args[0] || '');
    if (message.includes('WebSocket') || 
        message.includes('vite') || 
        message.includes('MaxListeners') ||
        message.includes('[vite]')) {
      return;
    }
    originalError.apply(console, args);
  };

  console.warn = (...args) => {
    const message = String(args[0] || '');
    if (message.includes('MaxListeners') ||
        message.includes('[vite]')) {
      return;
    }
    originalWarn.apply(console, args);
  };

  console.log = (...args) => {
    const message = String(args[0] || '');
    if (message.includes('[vite]')) {
      return;
    }
    originalLog.apply(console, args);
  };

  if (!container) {
    console.error('Root element not found');
  } else {
    // 既存のrootインスタンスを確認
    if ((window as any)[REACT_ROOT_KEY]) {
      console.log('⚠️ React root already exists, aborting initialization');
      return;
    }

    // DOM状態の最終確認
    if (container.children.length > 0) {
      console.log('⚠️ Container already has content, aborting initialization');
      return;
    }

    // React rootの重複作成を防ぐ
    container.setAttribute('data-react-initialized', 'true');
    
    try {
      const root = createRoot(container);
      
      // rootインスタンスを保存
      (window as any)[REACT_ROOT_KEY] = root;
      (window as any)[REACT_INIT_KEY] = true;

    root.render(
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </QueryClientProvider>
      );

      console.log('✅ React app initialized successfully');
    } catch (error) {
      console.error('❌ React initialization failed:', error);
      // クリーンアップ
      delete (window as any)[REACT_ROOT_KEY];
      delete (window as any)[REACT_INIT_KEY];
      delete (window as any)[REACT_LOCK_KEY];
      container.removeAttribute('data-react-initialized');
    }
  }
} else {
  console.log('⚠️ React app already initialized, skipping');
}