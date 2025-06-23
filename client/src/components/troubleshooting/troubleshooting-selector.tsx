import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import TroubleshootingFlow from "./troubleshooting-flow";
import { useToast } from "@/hooks/use-toast";

// トラブルシューティングフローの型定義
interface TroubleshootingFlow {
  id: string;
  description: string;
  trigger?: string[];
  title?: string;
}

interface TroubleshootingSelectorProps {
  initialSearchKeyword?: string;
  selectedFlow: string | null;
  setSelectedFlow: (id: string | null) => void;
}

export default function TroubleshootingSelector({
  initialSearchKeyword = "",
  selectedFlow,
  setSelectedFlow,
}: TroubleshootingSelectorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [flows, setFlows] = useState<TroubleshootingFlow[]>([]);
  const [searchTerm, setSearchTerm] = useState(initialSearchKeyword || "");
  const [filteredFlows, setFilteredFlows] = useState<TroubleshootingFlow[]>([]);

  // トラブルシューティングフローを取得
  const fetchFlows = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/emergency-flow/list");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const normalizedFlows = data.map((flow: any) => ({
        id: flow.id,
        title: flow.title || 'タイトルなし',
        description: flow.description || flow.title || '説明なし',
        trigger: flow.trigger || flow.triggerKeywords || [],
        source: flow.dataSource || 'unknown'
      }));
      setFlows(normalizedFlows);
      setFilteredFlows(normalizedFlows);
    } catch (error) {
      console.error("❌ フロー取得エラー:", error);
      toast({
        title: "エラー",
        description: "フローの取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  // フローを検索
  useEffect(() => {
    if (initialSearchKeyword && initialSearchKeyword.trim() && flows.length > 0) {
      const term = initialSearchKeyword.toLowerCase();
      const filtered = flows.filter(
        (flow) =>
          flow.id.toLowerCase().includes(term) ||
          flow.description.toLowerCase().includes(term) ||
          (flow.trigger &&
            flow.trigger.some((trigger) =>
              trigger.toLowerCase().includes(term),
            )),
      );
      setFilteredFlows(filtered);
      if (filtered.length === 1) {
        setSelectedFlow(filtered[0].id);
      }
    }
  }, [initialSearchKeyword, flows, setSelectedFlow]);

  // 検索条件でフローをフィルタリング
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    if (!term) {
      setFilteredFlows(flows);
      return;
    }
    const filtered = flows.filter(
      (flow) =>
        flow.id.toLowerCase().includes(term) ||
        flow.description.toLowerCase().includes(term) ||
        (flow.trigger &&
          flow.trigger.some((trigger) => trigger.toLowerCase().includes(term))),
    );
    setFilteredFlows(filtered);
  }, [searchTerm, flows]);

  // フローを選択
  const handleSelectFlow = (id: string) => {
    setSelectedFlow(id);
  };

  // フローの表示をキャンセル
  const handleCancelFlow = () => {
    setSelectedFlow(null);
  };

  // フローが完了した場合
  const handleFlowComplete = () => {
    toast({
      title: "完了",
      description: "トラブルシューティングが完了しました",
    });
    setSelectedFlow(null);
  };

  const handleSearch = () => {
     if (!searchTerm.trim()) {
       setFilteredFlows(flows);
       return;
     }
    const term = searchTerm.toLowerCase();
    const filtered = flows.filter(
      (flow) =>
        flow.id.toLowerCase().includes(term) ||
        (flow.title && flow.title.toLowerCase().includes(term)) ||
        flow.description.toLowerCase().includes(term) ||
        (flow.trigger &&
          flow.trigger.some((trigger) =>
            trigger.toLowerCase().includes(term),
          )),
    );
    setFilteredFlows(filtered);
  };
  
  // 特定のフローが選択されている場合はそのフローを表示
  if (selectedFlow) {
    return (
      <div className="w-full max-w-full mx-auto p-0 md:p-4">
        <TroubleshootingFlow
          id={selectedFlow}
          onComplete={handleFlowComplete}
          onExit={handleCancelFlow}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">応急処-置ガイド</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-8">
            <p className="mb-4 text-base md:text-lg text-gray-600">
              以下から症状を選択するか、キーワードで検索してください。
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="text-base md:text-lg text-gray-600 self-center mr-2">代表的なキーワード:</span>
              {["エンジン", "トルコン", "ブレーキ", "エアー", "バッテリー"].map(
                (keyword) => (
                  <Button
                    key={keyword}
                    variant="outline"
                    size="lg"
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 text-base"
                    onClick={() => setSearchTerm(keyword)}
                  >
                    {keyword}
                  </Button>
                ),
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">事象一覧</label>
              <div className="flex gap-3">
                <Input
                  placeholder="キーワードで検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
                  className="flex-1 text-base md:text-lg p-4 h-auto"
                />
                <Button variant="outline" onClick={() => setSearchTerm("")} className="p-4 text-base md:text-lg">クリア</Button>
                <Button onClick={handleSearch} className="p-4 text-base md:text-lg">検索</Button>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
            </div>
          ) : filteredFlows.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredFlows.map((flow) => (
                <Card 
                  key={flow.id} 
                  className="p-6 flex items-center justify-start cursor-pointer hover:bg-gray-100 min-h-[80px]"
                  onClick={() => handleSelectFlow(flow.id)}
                >
                  <p className="font-medium text-lg text-left">{flow.description || flow.title || 'タイトルなし'}</p>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-gray-500">
                検索結果がありません。別のキーワードで試してください。
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}