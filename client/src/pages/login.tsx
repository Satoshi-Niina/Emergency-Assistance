import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "../lib/schema.ts";
import { useAuth } from "../context/auth-context";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Input } from "../components/ui/input";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { login, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log('🔧 Login コンポ�EネンチEレンダリング:', {
    authLoading,
    hasUser: !!user,
    username: user?.username,
    isLoading,
    errorMessage
  });
  
  // Redirect if already logged in (but only after proper authentication)
  useEffect(() => {
    console.log('🔍 ログインペ�Eジ - 認証状態確誁E', {
      authLoading,
      hasUser: !!user,
      username: user?.username
    });
    
    if (!authLoading && user && user.username) {
      console.log('✁Eログイン済みユーザーを検�E - チャチE��画面に遷移');
      navigate("/chat", { replace: true });
    } else if (!authLoading && !user) {
      console.log('❁E未ログインユーザー - ログイン画面を表示');
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
      console.log("🔐 ログイン試行開姁E", values.username);
      console.log("📝 フォーム値:", values);
      
      // ログイン処琁E��実衁E
      await login(values.username, values.password);
      
      console.log("✁Eログイン成功 - 認証状態�E更新を征E��中");
      
      // 認証コンチE��スト�E状態更新を征E���E�EseEffectで自動的に遷移する�E�E
      
    } catch (error) {
      console.error("❁Eログインエラー:", error);
      let errorMsg = "ログインに失敗しました";
      
      if (error instanceof Error) {
        if (error.message.includes('ユーザー名また�Eパスワードが違いまぁE)) {
          errorMsg = "ユーザー名また�Eパスワードが違いまぁE;
        } else if (error.message.includes('サーバ�Eエラーが発生しました')) {
          errorMsg = "サーバ�Eエラーが発生しました。しばらく時間をおぁE��再度お試しください、E;
        } else if (error.message.includes('サーバ�Eに接続できません')) {
          errorMsg = "サーバ�Eに接続できません。サーバ�Eが起動してぁE��か確認してください、E;
        } else {
          errorMsg = error.message;
        }
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // フォームの状態を監要E
  useEffect(() => {
    const subscription = form.watch((value) => {
      console.log("📝 フォーム値変更:", value);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // 認証状態読み込み中の表示
  if (authLoading) {
    console.log('⏳ Login: 認証状態読み込み中、ローチE��ング画面を表示');
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-primary/10 to-primary/5 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  console.log('✁ELogin: 認証状態確認完亁E��ログインフォームを表示');

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-primary/10 to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary">応急処置サポ�EトシスチE��</h1>
          <p className="text-neutral-600 mt-2">Emergency Support System</p>
        </div>
        <Card className="w-full shadow-lg">
          <CardHeader className="text-center bg-primary text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold">ログイン</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form 
                onSubmit={(e) => {
                  console.log("📤 フォーム送信開姁E);
                  form.handleSubmit(onSubmit)(e);
                }} 
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ユーザー吁E/FormLabel>
                      <FormControl>
                        <Input placeholder="ユーザー名を入劁E autoComplete="off" {...field} />
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
                      <FormLabel>パスワーチE/FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="パスワードを入劁E autoComplete="new-password" {...field} />
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
                  onClick={() => console.log("🔘 ログインボタンクリチE��")}
                >
                  {isLoading ? "ログイン中..." : "ログイン"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 text-center text-sm text-neutral-500 border-t pt-4 mt-2">
            <p>シスチE��にログインしてください</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
