
import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/auth-context';
import { ChatProvider } from './context/chat-context';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import Header from './components/navigation/header';
import { Toaster } from './components/ui/toaster';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { RouteDebugger } from './components/shared/RouteDebugger';
import { DebugError } from './components/shared/DebugError';
      <RouteDebugger />
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
                {/* 設定ページ（一般ユーザーもアクセス可能） */}
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } />
                {/* システム診断ページ（一般ユーザーもアクセス可能） */}
                <Route path="/system-diagnostic" element={
                  <ProtectedRoute>
                    <SystemDiagnosticPage />
                  </ProtectedRoute>
                } />
                {/* 基礎データ管理ページ */}
                <Route path="/base-data" element={
                  <ProtectedRoute>
                    <BaseDataPage />
                  </ProtectedRoute>
                } />
                {/* 管理者権限が必要なルート */}
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
                    
                    {/* 設定ページ（一般ユーザーもアクセス可能） */}
                    <Route path="/settings" element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    } />
                    
                    {/* システム診断ページ（一般ユーザーもアクセス可能） */}
                    <Route path="/system-diagnostic" element={
                      <ProtectedRoute>
                        <SystemDiagnosticPage />
                      </ProtectedRoute>
                    } />
                    
                    {/* 基礎データ管理ページ */}
                    <Route path="/base-data" element={
                      <ProtectedRoute>
                        <BaseDataPage />
                      </ProtectedRoute>
                    } />
                    
                    {/* 管理者権限が必要なルート */}
                    
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
