import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('笶・ErrorBoundary caught an error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('笶・ErrorBoundary error details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-red-50 to-red-100 p-4">
          <div className="text-center max-w-md">
            <div className="text-red-500 text-6xl mb-4">笞・・/div>
            <h1 className="text-2xl font-bold text-red-800 mb-4">繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆</h1>
            <p className="text-red-600 mb-6">
              繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ縺ｧ莠域悄縺励↑縺・お繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700 font-mono">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              繝壹・繧ｸ繧貞・隱ｭ縺ｿ霎ｼ縺ｿ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 