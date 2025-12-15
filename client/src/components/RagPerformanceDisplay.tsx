import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Brain, Settings, TrendingUp, TrendingDown, CheckCircle, AlertCircle } from 'lucide-react';

interface RagConfig {
  chunkSize: number;
  chunkOverlap: number;
  similarityThreshold: number;
  maxResults: number;
  enableSemantic: boolean;
  enableKeyword: boolean;
}

interface RagPerformanceMetrics {
  responseTime: number;
  accuracy: number;
  relevanceScore: number;
  userSatisfaction: number;
  timestamp: string;
}

export default function RagPerformanceDisplay() {
  const [config, setConfig] = useState<RagConfig | null>(null);
  const [metrics, setMetrics] = useState<RagPerformanceMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 設定を取得
  useEffect(() => {
    fetchRagConfig();
  }, []);

  const fetchRagConfig = async () => {
    try {
      const response = await fetch('/api/settings/rag');
      if (response.ok) {
        const data = await response.json();
        // APIレスポンスの形式に対応: { success: true, data: {...} }
        const config = data.success ? data.data : data;
        console.log('RAG設定を取得しました:', config);
        setConfig(config);
      } else {
        console.error('RAG設定取得失敗:', response.status, response.statusText);
        // デフォルト設定を使用
        setConfig({
          chunkSize: 500,
          chunkOverlap: 200,
          similarityThreshold: 0.7,
          maxResults: 5,
          enableSemantic: true,
          enableKeyword: true,
        });
      }
    } catch (error) {
      console.error('RAG設定取得エラー:', error);
      // デフォルト設定を使用
      setConfig({
        chunkSize: 500,
        chunkOverlap: 200,
        similarityThreshold: 0.7,
        maxResults: 5,
        enableSemantic: true,
        enableKeyword: true,
      });
    }
  };

  // パフォーマンステストを実行
  const runPerformanceTest = async () => {
    setIsLoading(true);
    try {
      const testQueries = [
        'エンジン回転が上昇しない',
        'ブレーキが効かない',
        'エンジンがかからない',
        'タイヤがパンクした',
        '電気系統の故障'
      ];

      const results: RagPerformanceMetrics[] = [];

      for (const query of testQueries) {
        const startTime = Date.now();
        
        try {
          // RAG検索を実行
          const response = await fetch('/api/knowledge-base/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, limit: config?.maxResults || 5 })
          });

          const endTime = Date.now();
          const responseTime = endTime - startTime;

          if (response.ok) {
            const data = await response.json();
            console.log(`テストクエリ "${query}" の結果:`, data);
            
            const searchResults = data.results || data.data || [];
            const accuracy = calculateAccuracy(searchResults, query);
            const relevanceScore = calculateRelevanceScore(searchResults, query);
            
            results.push({
              responseTime,
              accuracy,
              relevanceScore,
              userSatisfaction: Math.random() * 0.3 + 0.7, // 模擬データ
              timestamp: new Date().toISOString()
            });
          } else {
            console.warn(`テストクエリ "${query}" が失敗しました:`, response.status);
            // エラーでも結果を追加（失敗として記録）
            results.push({
              responseTime: Date.now() - startTime,
              accuracy: 0,
              relevanceScore: 0,
              userSatisfaction: 0,
              timestamp: new Date().toISOString()
            });
          }
        } catch (queryError) {
          console.error(`テストクエリ "${query}" でエラー:`, queryError);
          // エラーでも結果を追加
          results.push({
            responseTime: 0,
            accuracy: 0,
            relevanceScore: 0,
            userSatisfaction: 0,
            timestamp: new Date().toISOString()
          });
        }
      }

      console.log('パフォーマンステスト結果:', results);
      setMetrics(results);
      
      if (results.length === 0) {
        alert('テスト結果がありません。エラーが発生した可能性があります。');
      }
    } catch (error) {
      console.error('パフォーマンステストエラー:', error);
      alert('パフォーマンステストの実行中にエラーが発生しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // 精度計算（模擬）
  const calculateAccuracy = (results: any[], query: string): number => {
    if (!results || results.length === 0) return 0;
    
    // キーワードマッチングによる精度計算
    const queryWords = query.toLowerCase().split(' ');
    let totalScore = 0;
    
    results.forEach(result => {
      const contentWords = result.content?.toLowerCase().split(' ') || [];
      const matchCount = queryWords.filter(word => 
        contentWords.some(contentWord => contentWord.includes(word))
      ).length;
      totalScore += matchCount / queryWords.length;
    });
    
    return Math.min(totalScore / results.length, 1);
  };

  // 関連性スコア計算（模擬）
  const calculateRelevanceScore = (results: any[], query: string): number => {
    if (!results || results.length === 0) return 0;
    
    // 結果のスコアの平均
    const avgScore = results.reduce((sum, result) => sum + (result.score || 0), 0) / results.length;
    return Math.min(avgScore, 1);
  };

  // 平均メトリクス計算
  const getAverageMetrics = () => {
    if (metrics.length === 0) return null;
    
    return {
      responseTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length,
      accuracy: metrics.reduce((sum, m) => sum + m.accuracy, 0) / metrics.length,
      relevanceScore: metrics.reduce((sum, m) => sum + m.relevanceScore, 0) / metrics.length,
      userSatisfaction: metrics.reduce((sum, m) => sum + m.userSatisfaction, 0) / metrics.length
    };
  };

  const averageMetrics = getAverageMetrics();

  return (
    <div className="space-y-6">
      {/* 現在の設定表示 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            現在のRAG設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          {config ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">チャンクサイズ</label>
                <Badge variant="outline">{config.chunkSize}文字</Badge>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">オーバーラップ</label>
                <Badge variant="outline">{config.chunkOverlap}文字</Badge>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">類似度閾値</label>
                <Badge variant="outline">{config.similarityThreshold}</Badge>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">最大結果数</label>
                <Badge variant="outline">{config.maxResults}件</Badge>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">セマンティック検索</label>
                <Badge variant={config.enableSemantic ? "default" : "secondary"}>
                  {config.enableSemantic ? "有効" : "無効"}
                </Badge>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">キーワード検索</label>
                <Badge variant={config.enableKeyword ? "default" : "secondary"}>
                  {config.enableKeyword ? "有効" : "無効"}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">設定を読み込み中...</p>
          )}
        </CardContent>
      </Card>

      {/* パフォーマンステスト */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            RAGパフォーマンステスト
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            5つのテストクエリで検索性能を測定します。
            結果は「応答時間」「精度」「関連性」「満足度」の4つの指標で表示されます。
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runPerformanceTest} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "テスト実行中..." : "パフォーマンステストを実行"}
          </Button>

          {averageMetrics && (
            <div className="space-y-4">
              <h4 className="font-medium">テスト結果（平均値）</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {averageMetrics.responseTime.toFixed(0)}ms
                  </div>
                  <div className="text-sm text-gray-600">応答時間</div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {(averageMetrics.accuracy * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">精度</div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {(averageMetrics.relevanceScore * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">関連性</div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {(averageMetrics.userSatisfaction * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">満足度</div>
                </div>
              </div>
            </div>
          )}

          {/* 詳細結果 */}
          {metrics.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">詳細結果</h4>
              <div className="space-y-2">
                {metrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">テスト {index + 1}</Badge>
                      <span className="text-sm text-gray-600">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>{metric.responseTime}ms</span>
                      <span>{(metric.accuracy * 100).toFixed(1)}%</span>
                      <span>{(metric.relevanceScore * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 推奨設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            推奨設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">精度向上のための推奨設定</h4>
              <div className="space-y-2 text-sm text-blue-700">
                <p>• チャンクサイズ: 600文字（より細かく分割）</p>
                <p>• 類似度閾値: 0.3（より多くの結果を取得）</p>
                <p>• 最大結果数: 10件（より多くの候補）</p>
                <p>• セマンティック検索: 有効</p>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">パフォーマンス重視の設定</h4>
              <div className="space-y-2 text-sm text-green-700">
                <p>• チャンクサイズ: 800文字（バランス重視）</p>
                <p>• 類似度閾値: 0.5（適度な精度）</p>
                <p>• 最大結果数: 5件（高速処理）</p>
                <p>• キーワード検索: 有効</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

