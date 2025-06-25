
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import React from "react";

// Robust singleton protection
const REACT_INITIALIZED = '__REACT_APP_INITIALIZED__';
const REACT_ROOT_EXISTS = '__REACT_ROOT_EXISTS__';

// Check multiple conditions to prevent duplicate initialization
const rootElement = document.getElementById('root');

// Initialize only if not already initialized
if (!(window as any)[REACT_INITIALIZED] && 
    !(window as any)[REACT_ROOT_EXISTS] &&
    !rootElement?.hasAttribute('data-react-initialized') &&
    !rootElement?.hasChildNodes()) {

  // Set multiple flags immediately
  (window as any)[REACT_INITIALIZED] = true;
  (window as any)[REACT_ROOT_EXISTS] = true;

  // Error boundary
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
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Application Error</h1>
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

  // Initialize React
  const container = document.getElementById('root');
  if (container) {
    // Mark container as initialized
    container.setAttribute('data-react-initialized', 'true');

    console.log('🚀 Initializing React application');
    const root = createRoot(container);

    root.render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </QueryClientProvider>
    );

    console.log('✅ React application initialized');
  } else {
    console.error('Root container not found');
  }
} else {
  console.log('⛔ React already initialized, aborting');
}
