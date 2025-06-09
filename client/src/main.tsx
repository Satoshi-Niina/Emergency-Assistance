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

// グローバル初期化フラグ
const REACT_INIT_KEY = '__REACT_APP_INITIALIZED__';

// すでに初期化済みかチェック
if (!(window as any)[REACT_INIT_KEY]) {
  console.log('🚀 Initializing React app (first time)');

  // グローバルフラグを設定
  (window as any)[REACT_INIT_KEY] = true;

  // コンソールのノイズを削減
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args) => {
    const message = String(args[0] || '');
    if (message.includes('WebSocket') || 
        message.includes('vite') || 
        message.includes('MaxListeners')) {
      return;
    }
    originalError.apply(console, args);
  };

  console.warn = (...args) => {
    const message = String(args[0] || '');
    if (message.includes('MaxListeners')) {
      return;
    }
    originalWarn.apply(console, args);
  };

  // DOM要素の存在確認
  const container = document.getElementById("root");
  if (!container) {
    console.error('Root element not found');
  } else {
    // React rootの重複作成を防ぐ
    if (!container.hasAttribute('data-react-initialized')) {
      container.setAttribute('data-react-initialized', 'true');

      const root = createRoot(container);
      root.render(
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </QueryClientProvider>
      );

      console.log('✅ React app initialized successfully');
    }
  }
} else {
  console.log('⚠️ React app already initialized, skipping');
}