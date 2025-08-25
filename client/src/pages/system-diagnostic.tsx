import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { 
  Database, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { useToast } from "../hooks/use-toast";

interface CheckResult {
  status: "OK" | "ERROR";
  message?: string;
  db_time?: string;
  reply?: string;
}

export default function SystemDiagnosticPage() {
  const { toast } = useToast();
  const [dbCheckResult, setDbCheckResult] = useState<CheckResult | null>(null);
  const [gptCheckResult, setGptCheckResult] = useState<CheckResult | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [isCheckingGpt, setIsCheckingGpt] = useState(false);

  // API縺ｮ繝吶・繧ｹURL繧貞叙蠕・
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  const checkDatabaseConnection = async () => {
    setIsCheckingDb(true);
    setDbCheckResult(null);
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/db-check`);
      const result = await response.json();
      
      setDbCheckResult(result);
      
      if (result.status === "OK") {
        toast({
          title: "DB謗･邯夂｢ｺ隱・,
          description: "繝・・繧ｿ繝吶・繧ｹ謗･邯壹′豁｣蟶ｸ縺ｧ縺・,
          variant: "default",
        });
      } else {
        toast({
          title: "DB謗･邯夂｢ｺ隱・,
          description: result.message || "繝・・繧ｿ繝吶・繧ｹ謗･邯壹お繝ｩ繝ｼ",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "繝阪ャ繝医Ρ繝ｼ繧ｯ繧ｨ繝ｩ繝ｼ";
      setDbCheckResult({
        status: "ERROR",
        message: errorMessage
      });
      
      toast({
        title: "DB謗･邯夂｢ｺ隱・,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCheckingDb(false);
    }
  };

  const checkGptConnection = async () => {
    setIsCheckingGpt(true);
    setGptCheckResult(null);
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/gpt-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "繝・せ繝・
        }),
      });
      
      const result = await response.json();
      setGptCheckResult(result);
      
      if (result.status === "OK") {
        toast({
          title: "GPT謗･邯夂｢ｺ隱・,
          description: "GPT謗･邯壹′豁｣蟶ｸ縺ｧ縺・,
          variant: "default",
        });
      } else {
        toast({
          title: "GPT謗･邯夂｢ｺ隱・,
          description: result.message || "GPT謗･邯壹お繝ｩ繝ｼ",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "繝阪ャ繝医Ρ繝ｼ繧ｯ繧ｨ繝ｩ繝ｼ";
      setGptCheckResult({
        status: "ERROR",
        message: errorMessage
      });
      
      toast({
        title: "GPT謗･邯夂｢ｺ隱・,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCheckingGpt(false);
    }
  };

  const runAllChecks = async () => {
    await checkDatabaseConnection();
    await checkGptConnection();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">繧ｷ繧ｹ繝・Β險ｺ譁ｭ</h1>
        <p className="text-muted-foreground">
          繝・・繧ｿ繝吶・繧ｹ謗･邯壹→GPT謗･邯壹・迥ｶ諷九ｒ遒ｺ隱阪〒縺阪∪縺・
        </p>
      </div>

      {/* 蜈ｨ菴灘ｮ溯｡後・繧ｿ繝ｳ */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">荳諡ｬ險ｺ譁ｭ</h3>
              <p className="text-sm text-muted-foreground">
                縺吶∋縺ｦ縺ｮ謗･邯夂｢ｺ隱阪ｒ荳蠎ｦ縺ｫ螳溯｡後＠縺ｾ縺・
              </p>
            </div>
            <Button 
              onClick={runAllChecks}
              disabled={isCheckingDb || isCheckingGpt}
              className="flex items-center gap-2"
            >
              {(isCheckingDb || isCheckingGpt) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              蜈ｨ菴楢ｨｺ譁ｭ螳溯｡・
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* DB謗･邯夂｢ｺ隱・*/}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              PostgreSQL謗･邯夂｢ｺ隱・
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                繝・・繧ｿ繝吶・繧ｹ縺ｸ縺ｮ謗･邯夂憾諷九ｒ遒ｺ隱阪＠縺ｾ縺・
              </p>
              <Button 
                onClick={checkDatabaseConnection}
                disabled={isCheckingDb}
                size="sm"
                variant="outline"
              >
                {isCheckingDb ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                遒ｺ隱榊ｮ溯｡・
              </Button>
            </div>

            {dbCheckResult && (
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center gap-2">
                  {dbCheckResult.status === "OK" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <Badge variant={dbCheckResult.status === "OK" ? "default" : "destructive"}>
                    {dbCheckResult.status === "OK" ? "謗･邯壽・蜉・ : "謗･邯壼､ｱ謨・}
                  </Badge>
                </div>
                
                {dbCheckResult.status === "OK" && dbCheckResult.db_time && (
                  <div className="text-sm">
                    <span className="font-medium">DB譎ょ綾:</span> {new Date(dbCheckResult.db_time).toLocaleString('ja-JP')}
                  </div>
                )}
                
                {dbCheckResult.status === "ERROR" && dbCheckResult.message && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{dbCheckResult.message}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* GPT謗･邯夂｢ｺ隱・*/}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              GPT謗･邯夂｢ｺ隱・
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                OpenAI API縺ｸ縺ｮ謗･邯夂憾諷九ｒ遒ｺ隱阪＠縺ｾ縺・
              </p>
              <Button 
                onClick={checkGptConnection}
                disabled={isCheckingGpt}
                size="sm"
                variant="outline"
              >
                {isCheckingGpt ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                遒ｺ隱榊ｮ溯｡・
              </Button>
            </div>

            {gptCheckResult && (
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center gap-2">
                  {gptCheckResult.status === "OK" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <Badge variant={gptCheckResult.status === "OK" ? "default" : "destructive"}>
                    {gptCheckResult.status === "OK" ? "謗･邯壽・蜉・ : "謗･邯壼､ｱ謨・}
                  </Badge>
                </div>
                
                {gptCheckResult.status === "OK" && gptCheckResult.reply && (
                  <div className="text-sm">
                    <span className="font-medium">GPT蠢懃ｭ・</span>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-xs max-h-20 overflow-y-auto">
                      {gptCheckResult.reply}
                    </div>
                  </div>
                )}
                
                {gptCheckResult.status === "ERROR" && gptCheckResult.message && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{gptCheckResult.message}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 險ｺ譁ｭ邨先棡繧ｵ繝槭Μ繝ｼ */}
      {dbCheckResult && gptCheckResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>險ｺ譁ｭ邨先棡繧ｵ繝槭Μ繝ｼ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>PostgreSQL:</span>
                <Badge variant={dbCheckResult.status === "OK" ? "default" : "destructive"}>
                  {dbCheckResult.status === "OK" ? "豁｣蟶ｸ" : "逡ｰ蟶ｸ"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>GPT:</span>
                <Badge variant={gptCheckResult.status === "OK" ? "default" : "destructive"}>
                  {gptCheckResult.status === "OK" ? "豁｣蟶ｸ" : "逡ｰ蟶ｸ"}
                </Badge>
              </div>
            </div>
            
            {dbCheckResult.status === "OK" && gptCheckResult.status === "OK" && (
              <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">縺吶∋縺ｦ縺ｮ謗･邯壹′豁｣蟶ｸ縺ｧ縺・/span>
                </div>
              </div>
            )}
            
            {(dbCheckResult.status === "ERROR" || gptCheckResult.status === "ERROR") && (
              <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">荳驛ｨ縺ｮ謗･邯壹↓蝠城｡後′縺ゅｊ縺ｾ縺・/span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 