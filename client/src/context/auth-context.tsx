

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { login as authLogin, logout as authLogout, getCurrentUser } from '../lib/auth';

interface User {
  id: string;
  username: string;
  // 認証確認API呼び出し（useCallbackで外出し）
  const fetchMe = React.useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const apiUrl = `${apiBaseUrl}/api/auth/me`;
      console.log('🔗 認証確認URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        signal
      });

      console.log('📡 認証確認レスポンス:', {
        status: response.status,
        ok: response.ok
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('サーバー応答がJSONではありません');
      }

      if (response.ok) {
        const userData = await response.json();
        console.log('📦 認証確認データ:', userData);
        if (userData && userData.success && userData.user) {
          setUser({
            // 認証確認API呼び出し（useCallbackで外出し）
            const fetchMe = React.useCallback(async (signal?: AbortSignal) => {
              try {
                setIsLoading(true);
                const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
                const apiUrl = `${apiBaseUrl}/api/auth/me`;
                console.log('🔗 認証確認URL:', apiUrl);

                const response = await fetch(apiUrl, {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                  },
                  credentials: "include",
                  signal
                });

                console.log('📡 認証確認レスポンス:', {
                  status: response.status,
                  ok: response.ok
                });

                const contentType = response.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) {
                  throw new Error('サーバー応答がJSONではありません');
                }

                if (response.ok) {
                  const userData = await response.json();
                  console.log('📦 認証確認データ:', userData);
                  if (userData && userData.success && userData.user) {
                    setUser({
                      id: userData.user.id,
                      username: userData.user.username,
                      displayName: userData.user.displayName,
                      role: userData.user.role,
                      department: userData.user.department
                    });
                  } else {
                    setUser(null);
                  }
                } else {
                  setUser(null);
                }
              } catch (error) {
                console.error('❌ 認証確認エラー:', error);
                setUser(null);
              } finally {
                setIsLoading(false);
                setAuthChecked(true);
                console.log('✅ 認証状態確認完了 - authChecked:', true);
              }
            }, []);

            useEffect(() => {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 8000);
              fetchMe(controller.signal);
              return () => {
                controller.abort();
                clearTimeout(timer);
              };
            }, [fetchMe]);
                        username: userData.user.username,
                        displayName: userData.user.displayName,
                        role: userData.user.role,
                        department: userData.user.department
                      });
                    } else {
                      setUser(null);
                    }
                  } else {
                    setUser(null);
                  }
                } catch (error) {
                  console.error('❌ 認証確認エラー:', error);
                  setUser(null);
                } finally {
                  setIsLoading(false);
                  setAuthChecked(true);
                }
              }, []);

              // useEffectでAbortController/タイマーを1つだけ生成しcleanupでabort
              useEffect(() => {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 8000);
                fetchMe(controller.signal);
                return () => {
                  controller.abort();
                  clearTimeout(timer);
                };
              }, [fetchMe]);
              role: userData.user.role,
              department: userData.user.department
            });
          } else {
            console.log('❌ 無効な認証データ:', userData);
            setUser(null);
          }
        } else if (response.status === 401) {
          console.log('❌ 未認証状態:', response.status);
          setUser(null);
        } else {
          console.log('❌ 認証確認失敗:', response.status);
          setUser(null);
        }
      } catch (error) {
        console.error('❌ 認証確認エラー:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
        setAuthChecked(true);
        console.log('✅ 認証状態確認完了 - authChecked:', true);
      }
    };
    checkAuthStatus();
  }, []);
        throw new Error('ログインレスポンスが無効です');
      }
    } catch (error) {
      console.error('❌ ログインエラー:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('🔐 ログアウト処理開始');

    try {
      await authLogout();
      console.log('✅ ログアウト成功');
    } catch (error) {
      console.error('❌ ログアウトエラー:', error);
    } finally {
      setUser(null);
    }
  };

  console.log('🔧 AuthProvider レンダリング:', {
    user: user ? user.username : null,
    isLoading,
    authChecked,
    timestamp: new Date().toISOString()
  });

  // 認証状態確認中は常にローディング画面を表示（nullレンダリング禁止）
  if (isLoading) {
    console.log('⏳ AuthProvider: 認証状態確認中、ローディング画面を表示');
    return (
      <AuthContext.Provider value={{ user, isLoading, login, logout }}>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">認証状態を確認中...</p>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  console.log('✅ AuthProvider: 認証状態確認完了、子コンポーネントを表示');
  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
