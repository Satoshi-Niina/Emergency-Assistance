
import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/auth-context';
import { ChatProvider } from './context/chat-context';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import Header from './components/navigation/header';
import { Toaster } from './components/ui/toaster';

// Lazy load pages
import { lazy } from 'react';
const LoginPage = lazy(() => import('./pages/login'));
const ChatPage = lazy(() => import('./pages/chat'));
const SettingsPage = lazy(() => import('./pages/settings'));
const HistoryPage = lazy(() => import('./pages/history'));
const DocumentsPage = lazy(() => import('./pages/documents'));
const TroubleshootingPage = lazy(() => import('./pages/troubleshooting'));
const EmergencyGuidePage = lazy(() => import('./pages/emergency-guide'));
const UsersPage = lazy(() => import('./pages/users'));
const NotFoundPage = lazy(() => import('./pages/not-found'));

function App() {
  return (
    <Router>
      <AuthProvider>
        <ChatProvider>
          <div className="flex flex-col h-screen">
            <Header />
            <main className="flex-1 overflow-auto">
              <Suspense fallback={<div className="flex justify-center items-center h-full">読み込み中...</div>}>
                <Routes>
                  <Route path="/" element={<Navigate to="/chat" replace />} />
                  <Route path="/login" element={<LoginPage />} />
                  
                  {/* 認証が必要なルート */}
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
                  
                  {/* 管理者権限が必要なルート */}
                  <Route path="/settings" element={
                    <ProtectedRoute requireAdmin={true}>
                      <SettingsPage />
                    </ProtectedRoute>
                  } />
                  
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
        </ChatProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
