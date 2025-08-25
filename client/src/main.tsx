import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

// 繧ｷ繝ｳ繝励Ν縺ｪQueryClient縺ｮ菴懈・
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

// 繧ｨ繝ｩ繝ｼ繝舌え繝ｳ繝繝ｪ繝ｼ
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
            <p className="text-gray-600 mb-4">繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ縺ｧ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・/p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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

// 繝｡繧､繝ｳ縺ｮ蛻晄悄蛹夜未謨ｰ
function initializeApp() {
  try {
    console.log('噫 繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ繧貞・譛溷喧荳ｭ...');
    
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

    console.log('笨・繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ縺ｮ蛻晄悄蛹悶′螳御ｺ・＠縺ｾ縺励◆');
  } catch (error) {
    console.error('笶・繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ縺ｮ蛻晄悄蛹悶↓螟ｱ謨励＠縺ｾ縺励◆:', error);
    
    // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺溷ｴ蜷医・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ陦ｨ遉ｺ
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
              繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ
            </h1>
            <p style="color: #6b7280; margin-bottom: 1rem;">
              繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ縺ｮ蛻晄悄蛹紋ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・
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
              繝壹・繧ｸ繧貞・隱ｭ縺ｿ霎ｼ縺ｿ
            </button>
          </div>
        </div>
      `;
    }
  }
}

// DOM縺梧ｺ門ｙ縺ｧ縺阪◆繧牙・譛溷喧
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
