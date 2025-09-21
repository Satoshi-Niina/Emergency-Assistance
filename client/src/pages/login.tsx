import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "../lib/schema.ts";
import { useAuth } from "../context/auth-context";
import { loginApi, meApi } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Input } from "../components/ui/input";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { login, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log('🔧 Login コンポーネント レンダリング:', {
    authLoading,
    hasUser: !!user,
    username: user?.username,
    isLoading,
    errorMessage
  });
  
  // Redirect if already logged in (but only after proper authentication)
  useEffect(() => {
    console.log('🔍 ログインページ - 認証状態確認:', {
      authLoading,
      hasUser: !!user,
      username: user?.username
    });
    
    if (!authLoading && user && user.username) {
      console.log('✅ ログイン済みユーザーを検出 - チャット画面に遷移');
      navigate("/chat", { replace: true });
    } else if (!authLoading && !user) {
      console.log('❌ 未ログインユーザー - ログイン画面を表示');
    }
  }, [user, authLoading, navigate]);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    if (isLoading) return;
    if (!username.trim() || !password) {
      setErrorMessage("ユーザー名/パスワードを入力してください");
      return;
    }
    setIsLoading(true);
    try {
      console.debug('[login] submit', { username, len: username.length });
      // APIは login を期待するため、username を渡す
      await loginApi(username.trim(), password);
      console.debug('[login] loginApi done');
      const me = await meApi();
      console.debug('[login] me ok', me);
      // 認証コンテキストの状態更新を待つ（useEffectで自動的に遷移）
    } catch (e: any) {
      setErrorMessage(e?.message ?? "ログインに失敗しました");
      console.debug('[login] failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  // フォームの状態を監視
  useEffect(() => {
    const subscription = form.watch((value) => {
      console.log("📝 フォーム値変更:", value);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // 認証状態読み込み中の表示
  if (authLoading) {
    console.log('⏳ Login: 認証状態読み込み中、ローディング画面を表示');
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-primary/10 to-primary/5 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  console.log('✅ Login: 認証状態確認完了、ログインフォームを表示');

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-primary/10 to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary">応急処置サポートシステム</h1>
          <p className="text-neutral-600 mt-2">Emergency Support System</p>
        </div>
        <Card className="w-full shadow-lg">
          <CardHeader className="text-center bg-primary text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold">ログイン</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form 
                onSubmit={onSubmit}
                className="space-y-4"
              >
                <FormItem>
                  <FormLabel>ユーザー名</FormLabel>
                  <FormControl>
                    <Input
                      name="username"
                      placeholder="ユーザー名を入力"
                      autoComplete="off"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                <FormItem>
                  <FormLabel>パスワード</FormLabel>
                  <FormControl>
                    <Input
                      name="password"
                      type="password"
                      placeholder="パスワードを入力"
                      autoComplete="new-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                {errorMessage && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {errorMessage}
                  </div>
                )}
                  <Button 
                    type="submit" 
                    className="w-full bg-primary" 
                    disabled={isLoading}
                  >
                    {isLoading ? "ログイン中..." : "ログイン"}
                  </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 text-center text-sm text-neutral-500 border-t pt-4 mt-2">
            <p>システムにログインしてください</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default Login;

