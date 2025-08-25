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
  
  console.log('肌 Login 繧ｳ繝ｳ繝昴・繝阪Φ繝・繝ｬ繝ｳ繝繝ｪ繝ｳ繧ｰ:', {
    authLoading,
    hasUser: !!user,
    username: user?.username,
    isLoading,
    errorMessage
  });
  
  // Redirect if already logged in (but only after proper authentication)
  useEffect(() => {
    console.log('剥 繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ - 隱崎ｨｼ迥ｶ諷狗｢ｺ隱・', {
      authLoading,
      hasUser: !!user,
      username: user?.username
    });
    
    if (!authLoading && user && user.username) {
      console.log('笨・繝ｭ繧ｰ繧､繝ｳ貂医∩繝ｦ繝ｼ繧ｶ繝ｼ繧呈､懷・ - 繝√Ε繝・ヨ逕ｻ髱｢縺ｫ驕ｷ遘ｻ');
      navigate("/chat", { replace: true });
    } else if (!authLoading && !user) {
      console.log('笶・譛ｪ繝ｭ繧ｰ繧､繝ｳ繝ｦ繝ｼ繧ｶ繝ｼ - 繝ｭ繧ｰ繧､繝ｳ逕ｻ髱｢繧定｡ｨ遉ｺ');
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
      console.log("柏 繝ｭ繧ｰ繧､繝ｳ隧ｦ陦碁幕蟋・", values.username);
      console.log("統 繝輔か繝ｼ繝蛟､:", values);
      
      // 繝ｭ繧ｰ繧､繝ｳ蜃ｦ逅・ｒ螳溯｡・
      await login(values.username, values.password);
      
      console.log("笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥 - 隱崎ｨｼ迥ｶ諷九・譖ｴ譁ｰ繧貞ｾ・ｩ滉ｸｭ");
      
      // 隱崎ｨｼ繧ｳ繝ｳ繝・く繧ｹ繝医・迥ｶ諷区峩譁ｰ繧貞ｾ・▽・・seEffect縺ｧ閾ｪ蜍慕噪縺ｫ驕ｷ遘ｻ縺吶ｋ・・
      
    } catch (error) {
      console.error("笶・繝ｭ繧ｰ繧､繝ｳ繧ｨ繝ｩ繝ｼ:", error);
      let errorMsg = "繝ｭ繧ｰ繧､繝ｳ縺ｫ螟ｱ謨励＠縺ｾ縺励◆";
      
      if (error instanceof Error) {
        if (error.message.includes('繝ｦ繝ｼ繧ｶ繝ｼ蜷阪∪縺溘・繝代せ繝ｯ繝ｼ繝峨′驕輔＞縺ｾ縺・)) {
          errorMsg = "繝ｦ繝ｼ繧ｶ繝ｼ蜷阪∪縺溘・繝代せ繝ｯ繝ｼ繝峨′驕輔＞縺ｾ縺・;
        } else if (error.message.includes('繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆')) {
          errorMsg = "繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲ゅ＠縺ｰ繧峨￥譎る俣繧偵♀縺・※蜀榊ｺｦ縺願ｩｦ縺励￥縺縺輔＞縲・;
        } else if (error.message.includes('繧ｵ繝ｼ繝舌・縺ｫ謗･邯壹〒縺阪∪縺帙ｓ')) {
          errorMsg = "繧ｵ繝ｼ繝舌・縺ｫ謗･邯壹〒縺阪∪縺帙ｓ縲ゅし繝ｼ繝舌・縺瑚ｵｷ蜍輔＠縺ｦ縺・ｋ縺狗｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲・;
        } else {
          errorMsg = error.message;
        }
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 繝輔か繝ｼ繝縺ｮ迥ｶ諷九ｒ逶｣隕・
  useEffect(() => {
    const subscription = form.watch((value) => {
      console.log("統 繝輔か繝ｼ繝蛟､螟画峩:", value);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // 隱崎ｨｼ迥ｶ諷玖ｪｭ縺ｿ霎ｼ縺ｿ荳ｭ縺ｮ陦ｨ遉ｺ
  if (authLoading) {
    console.log('竢ｳ Login: 隱崎ｨｼ迥ｶ諷玖ｪｭ縺ｿ霎ｼ縺ｿ荳ｭ縲√Ο繝ｼ繝・ぅ繝ｳ繧ｰ逕ｻ髱｢繧定｡ｨ遉ｺ');
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-primary/10 to-primary/5 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">隱崎ｨｼ迥ｶ諷九ｒ遒ｺ隱堺ｸｭ...</p>
          <p className="text-gray-500 text-sm mt-2">
            Azure Static Web Apps 縺ｮ蛻晏屓襍ｷ蜍輔↓縺ｯ譎る俣縺後°縺九ｋ蝣ｴ蜷医′縺ゅｊ縺ｾ縺・
          </p>
          <p className="text-gray-400 text-xs mt-1">
            譛螟ｧ2蛻・ｨ句ｺｦ縺雁ｾ・■縺上□縺輔＞
          </p>
        </div>
      </div>
    );
  }

  console.log('笨・Login: 隱崎ｨｼ迥ｶ諷狗｢ｺ隱榊ｮ御ｺ・√Ο繧ｰ繧､繝ｳ繝輔か繝ｼ繝繧定｡ｨ遉ｺ');

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-primary/10 to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary">蠢懈･蜃ｦ鄂ｮ繧ｵ繝昴・繝医す繧ｹ繝・Β</h1>
          <p className="text-neutral-600 mt-2">Emergency Support System</p>
        </div>
        <Card className="w-full shadow-lg">
          <CardHeader className="text-center bg-primary text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold">繝ｭ繧ｰ繧､繝ｳ</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form 
                onSubmit={(e) => {
                  console.log("豆 繝輔か繝ｼ繝騾∽ｿ｡髢句ｧ・);
                  form.handleSubmit(onSubmit)(e);
                }} 
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>繝ｦ繝ｼ繧ｶ繝ｼ蜷・/FormLabel>
                      <FormControl>
                        <Input placeholder="繝ｦ繝ｼ繧ｶ繝ｼ蜷阪ｒ蜈･蜉・ autoComplete="off" {...field} />
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
                      <FormLabel>繝代せ繝ｯ繝ｼ繝・/FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="繝代せ繝ｯ繝ｼ繝峨ｒ蜈･蜉・ autoComplete="new-password" {...field} />
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
                  onClick={() => console.log("曝 繝ｭ繧ｰ繧､繝ｳ繝懊ち繝ｳ繧ｯ繝ｪ繝・け")}
                >
                  {isLoading ? "繝ｭ繧ｰ繧､繝ｳ荳ｭ..." : "繝ｭ繧ｰ繧､繝ｳ"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 text-center text-sm text-neutral-500 border-t pt-4 mt-2">
            <p>繧ｷ繧ｹ繝・Β縺ｫ繝ｭ繧ｰ繧､繝ｳ縺励※縺上□縺輔＞</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
