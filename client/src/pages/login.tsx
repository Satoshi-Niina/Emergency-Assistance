import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/schema";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { login, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
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

  const onSubmit = async (values: { username: string; password: string }) => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      console.log("🔐 ログイン試行開始:", values.username);
      console.log("📝 フォーム値:", values);
      
      // ログイン処理を実行
      await login(values.username, values.password);
      
      console.log("✅ ログイン成功 - 認証状態の更新を待機中");
      
      // 認証コンテキストの状態更新を待つ（useEffectで自動的に遷移する）
      
    } catch (error) {
      console.error("❌ ログインエラー:", error);
      const errorMsg = error instanceof Error ? error.message : "ログインに失敗しました";
      setErrorMessage(errorMsg);
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-primary/10 to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary">応急処置チャットシステム</h1>
          <p className="text-neutral-600 mt-2">Emergency Recovery Chat System</p>
        </div>
        <Card className="w-full shadow-lg">
          <CardHeader className="text-center bg-primary text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold">ログイン</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form 
                onSubmit={(e) => {
                  console.log("📤 フォーム送信開始");
                  form.handleSubmit(onSubmit)(e);
                }} 
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ユーザー名</FormLabel>
                      <FormControl>
                        <Input placeholder="ユーザー名を入力" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>パスワード</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="パスワードを入力" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {errorMessage && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {errorMessage}
                  </div>
                )}
                <Button 
                  type="submit" 
                  className="w-full bg-primary" 
                  disabled={isLoading}
                  onClick={() => console.log("🔘 ログインボタンクリック")}
                >
                  {isLoading ? "ログイン中..." : "ログイン"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 text-center text-sm text-neutral-500 border-t pt-4 mt-2">
            <p>デモ用ログイン情報:</p>
            <p>管理者: niina / 0077</p>
            <p>一般ユーザー: employee / employee123</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
