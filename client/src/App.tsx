
import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/auth-context';
import { ChatProvider } from './context/chat-context';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import Header from './components/navigation/header';
import { Toaster } from './components/ui/toaster';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { RouteDebugger } from './components/shared/RouteDebugger';
import { DebugError } from './components/shared/DebugError';

// Lazy load pages
import { lazy } from 'react';
const LoginPage = lazy(() => import('./pages/login'));
const ChatPage = lazy(() => import('./pages/chat'));
const SettingsPage = lazy(() => import('./pages/settings'));
const SystemDiagnosticPage = lazy(() => import('./pages/system-diagnostic'));
const HistoryPage = lazy(() => import('./pages/history'));
const DocumentsPage = lazy(() => import('./pages/documents'));
const TroubleshootingPage = lazy(() => import('./pages/troubleshooting'));
const EmergencyGuidePage = lazy(() => import('./pages/emergency-guide'));
const UsersPage = lazy(() => import('./pages/users'));
const BaseDataPage = lazy(() => import('./pages/base-data'));

const NotFoundPage = lazy(() => import('./pages/not-found'));

// 認証状態に基づくルートパスを制御するコンポーネント
function RootRedirect() {
  console.log('🔍 RootRedirect - コンポーネント実行開始');
  const { user, isLoading } = useAuth();
  
  console.log('🔍 RootRedirect - 認証状態確認', {
    isLoading,
    hasUser: !!user,
    username: user?.username
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  // 認証済みの場合はチャット画面に、未認証の場合はログイン画面にリダイレクト
  return <Navigate to={user ? "/chat" : "/login"} replace />;
}

function App() {
  console.log('🔧 App.tsx: アプリケーション初期化開始');
  console.log('🔧 App.tsx: 環境変数確認', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    NODE_ENV: import.meta.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
  
  console.log('🔧 App.tsx: コンポーネントレンダリング開始');
  
  return (
    <ErrorBoundary>
      <Router>
        <RouteDebugger />
        <AuthProvider>
          <ChatProvider>
            <div className="flex flex-col h-screen">
              <Header />
              <main className="flex-1 overflow-auto">
                <Suspense fallback={
                  <div className="flex justify-center items-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-gray-600">読み込み中...</p>
                    </div>
                  </div>
                }>
                  <Routes>
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/login" element={<LoginPage />} />
                    
                    {/* 認証が忁E��なルーチE*/}
                    <Route path="/chat" element={
                      <ProtectedRoute>
                        <ChatPage />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/history" element={
                      <ProtectedRoute>
                        <HistoryPage />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/documents" element={
                      <ProtectedRoute>
                        <DocumentsPage />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/troubleshooting" element={
                      <ProtectedRoute>
                        <TroubleshootingPage />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/emergency-guide/:id" element={
                      <ProtectedRoute>
                        <EmergencyGuidePage />
                      </ProtectedRoute>
                    } />
                    
                    {/* 設定�Eージ�E�一般ユーザーもアクセス可能�E�E*/}
                    <Route path="/settings" element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    } />
                    
                    {/* シスチE��診断ペ�Eジ�E�一般ユーザーもアクセス可能�E�E*/}
                    <Route path="/system-diagnostic" element={
                      <ProtectedRoute>
                        <SystemDiagnosticPage />
                      </ProtectedRoute>
                    } />
                    
                    {/* 基礎データ管琁E�Eージ */}
                    <Route path="/base-data" element={
                      <ProtectedRoute>
                        <BaseDataPage />
                      </ProtectedRoute>
                    } />
                    
                    {/* 管琁E��E��限が忁E��なルーチE*/}
                    
                    <Route path="/users" element={
                      <ProtectedRoute requireAdmin={true}>
                        <UsersPage />
                      </ProtectedRoute>
                    } />
                    

                    
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </main>
            </div>
            <Toaster />
            <DebugError enabled={false} />
          </ChatProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
