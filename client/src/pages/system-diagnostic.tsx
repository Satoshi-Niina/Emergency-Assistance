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
  AlertCircle,
  HardDrive
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { buildApiUrl } from "../lib/api/config";

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
  const [storageCheckResult, setStorageCheckResult] = useState<CheckResult | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [isCheckingGpt, setIsCheckingGpt] = useState(false);
  const [isCheckingStorage, setIsCheckingStorage] = useState(false);

  const checkDatabaseConnection = async () => {
    setIsCheckingDb(true);
    setDbCheckResult(null);
    
    try {
  const response = await fetch(buildApiUrl('/api/db-check'), { credentials: 'include' });
      const result = await response.json();
      
      setDbCheckResult(result);
      
      if (result.status === "OK") {
        toast({
          title: "DB接続確認",
          description: "データベース接続が正常です",
          variant: "default",
        });
      } else {
        toast({
          title: "DB接続確認",
          description: result.message || "データベース接続エラー",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "ネットワークエラー";
      setDbCheckResult({
        status: "ERROR",
        message: errorMessage
      });
      
      toast({
        title: "DB接続確認",
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
      const response = await fetch(buildApiUrl('/api/gpt-check'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: "テスト"
        }),
      });
      
      const result = await response.json();
      setGptCheckResult(result);
      
      if (result.status === "OK") {
        toast({
          title: "GPT接続確認",
          description: "GPT接続が正常です",
          variant: "default",
        });
      } else {
        toast({
          title: "GPT接続確認",
          description: result.message || "GPT接続エラー",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "ネットワークエラー";
      setGptCheckResult({
        status: "ERROR",
        message: errorMessage
      });
      
      toast({
        title: "GPT接続確認",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCheckingGpt(false);
    }
  };

  const checkStorageConnection = async () => {
    setIsCheckingStorage(true);
    setStorageCheckResult(null);
    
    try {
      const response = await fetch(buildApiUrl('/api/storage-check'), {
        method: 'GET',
        credentials: 'include'
      });
      
      const result = await response.json();
      setStorageCheckResult(result);
      
      if (result.status === "OK") {
        toast({
          title: "ストレージ接続確認",
          description: "ストレージ接続が正常です",
          variant: "default",
        });
      } else {
        toast({
          title: "ストレージ接続確認",
          description: result.message || "ストレージ接続エラー",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "ネットワークエラー";
      setStorageCheckResult({
        status: "ERROR",
        message: errorMessage
      });
      
      toast({
        title: "ストレージ接続確認",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCheckingStorage(false);
    }
  };

  const runAllChecks = async () => {
    await checkDatabaseConnection();
    await checkGptConnection();
    await checkStorageConnection();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">システム診断</h1>
        <p className="text-muted-foreground">
          データベース接続、GPT接続、ストレージ接続の状態を確認できます
        </p>
      </div>

      {/* 全体実行ボタン */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">一括診断</h3>
              <p className="text-sm text-muted-foreground">
                すべての接続確認を一度に実行します
              </p>
            </div>
            <Button 
              onClick={runAllChecks}
              disabled={isCheckingDb || isCheckingGpt || isCheckingStorage}
              className="flex items-center gap-2"
            >
              {(isCheckingDb || isCheckingGpt || isCheckingStorage) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              全体診断実行
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {/* DB接続確認 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              PostgreSQL接続確認
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                データベースへの接続状態を確認します
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
                確認実行
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
                    {dbCheckResult.status === "OK" ? "接続成功" : "接続失敗"}
                  </Badge>
                </div>
                
                {dbCheckResult.status === "OK" && dbCheckResult.db_time && (
                  <div className="text-sm">
                    <span className="font-medium">DB時刻:</span> {new Date(dbCheckResult.db_time).toLocaleString('ja-JP')}
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

        {/* GPT接続確認 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              GPT接続確認
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                OpenAI APIへの接続状態を確認します
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
                確認実行
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
                    {gptCheckResult.status === "OK" ? "接続成功" : "接続失敗"}
                  </Badge>
                </div>
                
                {gptCheckResult.status === "OK" && gptCheckResult.reply && (
                  <div className="text-sm">
                    <span className="font-medium">GPT応答:</span>
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

        {/* ストレージ接続確認 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Azure Storage接続確認
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Azure Blob Storageへの接続状態を確認します
              </p>
              <Button 
                onClick={checkStorageConnection}
                disabled={isCheckingStorage}
                size="sm"
                variant="outline"
              >
                {isCheckingStorage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                確認実行
              </Button>
            </div>

            {storageCheckResult && (
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center gap-2">
                  {storageCheckResult.status === "OK" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <Badge variant={storageCheckResult.status === "OK" ? "default" : "destructive"}>
                    {storageCheckResult.status === "OK" ? "接続成功" : "接続失敗"}
                  </Badge>
                </div>
                
                {storageCheckResult.status === "OK" && storageCheckResult.message && (
                  <div className="text-sm">
                    <span className="font-medium">ストレージ状態:</span>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                      {storageCheckResult.message}
                    </div>
                  </div>
                )}
                
                {storageCheckResult.status === "ERROR" && storageCheckResult.message && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{storageCheckResult.message}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 診断結果サマリー */}
      {dbCheckResult && gptCheckResult && storageCheckResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>診断結果サマリー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>PostgreSQL:</span>
                <Badge variant={dbCheckResult.status === "OK" ? "default" : "destructive"}>
                  {dbCheckResult.status === "OK" ? "正常" : "異常"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>GPT:</span>
                <Badge variant={gptCheckResult.status === "OK" ? "default" : "destructive"}>
                  {gptCheckResult.status === "OK" ? "正常" : "異常"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                <span>Storage:</span>
                <Badge variant={storageCheckResult.status === "OK" ? "default" : "destructive"}>
                  {storageCheckResult.status === "OK" ? "正常" : "異常"}
                </Badge>
              </div>
            </div>
            
            {dbCheckResult.status === "OK" && gptCheckResult.status === "OK" && storageCheckResult.status === "OK" && (
              <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">すべての接続が正常です</span>
                </div>
              </div>
            )}
            
            {(dbCheckResult.status === "ERROR" || gptCheckResult.status === "ERROR" || storageCheckResult.status === "ERROR") && (
              <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">一部の接続に問題があります</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 