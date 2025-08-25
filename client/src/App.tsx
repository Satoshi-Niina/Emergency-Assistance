
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

// 隱崎ｨｼ迥ｶ諷九↓蝓ｺ縺･縺・※繝ｫ繝ｼ繝医ヱ繧ｹ繧貞宛蠕｡縺吶ｋ繧ｳ繝ｳ繝昴・繝阪Φ繝・
function RootRedirect() {
  console.log('剥 RootRedirect - 繧ｳ繝ｳ繝昴・繝阪Φ繝亥ｮ溯｡碁幕蟋・);
  const { user, isLoading } = useAuth();
  
  console.log('剥 RootRedirect - 隱崎ｨｼ迥ｶ諷狗｢ｺ隱・', {
    isLoading,
    hasUser: !!user,
    username: user?.username
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">隱崎ｨｼ迥ｶ諷九ｒ遒ｺ隱堺ｸｭ...</p>
        </div>
      </div>
    );
  }

  // 隱崎ｨｼ貂医∩縺ｮ蝣ｴ蜷医・繝√Ε繝・ヨ逕ｻ髱｢縺ｫ縲∵悴隱崎ｨｼ縺ｮ蝣ｴ蜷医・繝ｭ繧ｰ繧､繝ｳ逕ｻ髱｢縺ｫ繝ｪ繝繧､繝ｬ繧ｯ繝・
  return <Navigate to={user ? "/chat" : "/login"} replace />;
}

function App() {
  console.log('肌 App.tsx: 繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ蛻晄悄蛹夜幕蟋・);
  console.log('肌 App.tsx: 迺ｰ蠅・､画焚遒ｺ隱・', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    NODE_ENV: import.meta.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
  
  console.log('肌 App.tsx: 繧ｳ繝ｳ繝昴・繝阪Φ繝医Ξ繝ｳ繝繝ｪ繝ｳ繧ｰ髢句ｧ・);
  
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
                      <p className="text-gray-600">隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</p>
                    </div>
                  </div>
                }>
                  <Routes>
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/login" element={<LoginPage />} />
                    
                    {/* 隱崎ｨｼ縺悟ｿ・ｦ√↑繝ｫ繝ｼ繝・*/}
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
                    
                    {/* 險ｭ螳壹・繝ｼ繧ｸ・井ｸ闊ｬ繝ｦ繝ｼ繧ｶ繝ｼ繧ゅい繧ｯ繧ｻ繧ｹ蜿ｯ閭ｽ・・*/}
                    <Route path="/settings" element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    } />
                    
                    {/* 繧ｷ繧ｹ繝・Β險ｺ譁ｭ繝壹・繧ｸ・井ｸ闊ｬ繝ｦ繝ｼ繧ｶ繝ｼ繧ゅい繧ｯ繧ｻ繧ｹ蜿ｯ閭ｽ・・*/}
                    <Route path="/system-diagnostic" element={
                      <ProtectedRoute>
                        <SystemDiagnosticPage />
                      </ProtectedRoute>
                    } />
                    
                    {/* 蝓ｺ遉弱ョ繝ｼ繧ｿ邂｡逅・・繝ｼ繧ｸ */}
                    <Route path="/base-data" element={
                      <ProtectedRoute>
                        <BaseDataPage />
                      </ProtectedRoute>
                    } />
                    
                    {/* 邂｡逅・・ｨｩ髯舌′蠢・ｦ√↑繝ｫ繝ｼ繝・*/}
                    
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
