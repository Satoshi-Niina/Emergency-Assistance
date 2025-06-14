
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Play, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TroubleshootingData {
  id: string;
  title: string;
  description: string;
  fileName: string;
  createdAt: string;
  trigger?: string[];
  slides?: any[];
}

interface TroubleshootingViewerProps {
  onEdit?: (data: TroubleshootingData) => void;
  onDelete?: (id: string) => void;
  onPlay?: (data: TroubleshootingData) => void;
}

const TroubleshootingViewer: React.FC<TroubleshootingViewerProps> = ({
  onEdit,
  onDelete,
  onPlay
}) => {
  const [data, setData] = useState<TroubleshootingData[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      console.log('🔄 トラブルシューティングデータを取得中...');

      const timestamp = Date.now();
      const response = await fetch(`/api/emergency-flow/list?_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`データ取得失敗: ${response.status}`);
      }

      const responseData = await response.json();
      
      // フィルタリングを完全に削除 - すべてのデータを表示
      console.log(`✅ 全データを表示: ${responseData.length}件`);
      
      setData(Array.isArray(responseData) ? responseData : []);

    } catch (error) {
      console.error('❌ データ取得エラー:', error);
      toast({
        title: 'エラー',
        description: 'データの取得に失敗しました',
        variant: 'destructive'
      });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleEdit = (item: TroubleshootingData) => {
    console.log('編集:', item.id);
    onEdit?.(item);
  };

  const handleDelete = (id: string) => {
    console.log('削除:', id);
    onDelete?.(id);
  };

  const handlePlay = (item: TroubleshootingData) => {
    console.log('再生:', item.id);
    onPlay?.(item);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">応急処置データ一覧</h3>
        <Button
          onClick={handleRefresh}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">データを読み込み中...</p>
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">データが見つかりません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {data.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {item.description}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {onPlay && (
                      <Button
                        onClick={() => handlePlay(item)}
                        size="sm"
                        variant="default"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        実行
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        onClick={() => handleEdit(item)}
                        size="sm"
                        variant="outline"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        編集
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        onClick={() => handleDelete(item.id)}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        削除
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>ファイル: {item.fileName}</span>
                  <span>作成日: {new Date(item.createdAt).toLocaleDateString('ja-JP')}</span>
                  {item.slides && (
                    <Badge variant="secondary">
                      {item.slides.length} ステップ
                    </Badge>
                  )}
                </div>
                {item.trigger && item.trigger.length > 0 && (
                  <div className="mt-2">
                    <span className="text-sm text-gray-600">トリガー: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.trigger.map((trigger, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {trigger}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TroubleshootingViewer;
