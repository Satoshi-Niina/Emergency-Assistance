import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from './context/auth-context';
import { ChatProvider } from './context/chat-context';
import Header from './components/navigation/header';

// Lazy loading components
const ChatPage = lazy(() => import('./pages/chat'));
const LoginPage = lazy(() => import('./pages/login'));
const DocumentsPage = lazy(() => import('./pages/documents'));
const UsersPage = lazy(() => import('./pages/users'));
const SettingsPage = lazy(() => import('./pages/settings'));
const TroubleshootingPage = lazy(() => import('./pages/troubleshooting'));
const NotFoundPage = lazy(() => import('./pages/not-found'));
const EmergencyGuidePage = lazy(() => import('./pages/emergency-guide'));
const HistoryPage = lazy(() => import('./pages/history'));

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
                  {/* 全ルートを認証なしで直接アクセス可能 */}
                  <Route path="/" element={<Navigate to="/chat" replace />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/documents" element={<DocumentsPage />} />
                  <Route path="/troubleshooting" element={<TroubleshootingPage />} />
                  <Route path="/emergency-guide/:id" element={<EmergencyGuidePage />} />
                  <Route path="/users" element={<UsersPage />} />
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