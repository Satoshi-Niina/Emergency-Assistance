import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/login';
import ChatPage from './pages/chat';
import HistoryPage from './pages/history';
import DocumentsPage from './pages/documents';
import TroubleshootingPage from './pages/troubleshooting';
import EmergencyGuidePage from './pages/emergency-guide';
import SettingsPage from './pages/settings';
import SystemDiagnosticPage from './pages/system-diagnostic';
import BaseDataPage from './pages/base-data';
import UsersPage from './pages/users';
import NotFound from './pages/not-found';
import { ChatProvider } from './context/chat-context';
import { useAuth } from './context/auth-context';
import Header from './components/navigation/header';
import { Toaster } from './components/ui/toaster';
import { RouteDebugger } from './components/shared/RouteDebugger';
import { DebugError } from './components/shared/DebugError';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
// ...他の必要なimport...

function App() {
  const { user, isLoading } = useAuth();
  return (
    <ChatProvider>
      <RouteDebugger />
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
              {/* ルート: userの有無でリダイレクト */}
              <Route path="/" element={
                user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
              } />
              <Route path="/login" element={<LoginPage />} />
              {/* ダッシュボード: 未認証なら/loginへ */}
              <Route path="/dashboard" element={
                user ? <ChatPage /> : <Navigate to="/login" replace />
              } />
              
              {/* 全ユーザー共通 - チャット機能 */}
              <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
              
              {/* 運用管理者以上 - システム内の各機能 */}
              <Route path="/history" element={<ProtectedRoute requireRole="operator"><HistoryPage /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute requireRole="operator"><DocumentsPage /></ProtectedRoute>} />
              <Route path="/troubleshooting" element={<ProtectedRoute requireRole="operator"><TroubleshootingPage /></ProtectedRoute>} />
              <Route path="/emergency-guide/:id" element={<ProtectedRoute requireRole="operator"><EmergencyGuidePage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute requireRole="operator"><SettingsPage /></ProtectedRoute>} />
              <Route path="/system-diagnostic" element={<ProtectedRoute requireRole="operator"><SystemDiagnosticPage /></ProtectedRoute>} />
              <Route path="/base-data" element={<ProtectedRoute requireRole="operator"><BaseDataPage /></ProtectedRoute>} />
              
              {/* システム管理者専用 - システム管理機能 */}
              <Route path="/users" element={<ProtectedRoute requireRole="system_admin"><UsersPage /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <Toaster />
      <DebugError enabled={false} />
    </ChatProvider>
  );
}

export default App;