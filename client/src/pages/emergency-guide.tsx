import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmergencyGuideUploader from "@/components/emergency-guide/emergency-guide-uploader";
import EmergencyGuideEdit from "@/components/emergency-guide/emergency-guide-edit";

import KeywordSuggestions from "@/components/emergency-guide/keyword-suggestions";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const EmergencyGuidePage: React.FC = () => {
  // URLからクエリパラメータを取得
  const getQueryParam = (name: string): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  };

  // 初期タブをURLから設定
  const initialTab = getQueryParam('tab') || "edit";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [targetGuideId, setTargetGuideId] = useState<string | null>(
    getQueryParam('guideId')
  );
  const [lastUploadedGuideId, setLastUploadedGuideId] = useState<string | null>(
    null,
  );

  // 検索機能の状態
  const [searchQuery, setSearchQuery] = useState<string>("");

  // タブ切り替えイベントのリスナー
  useEffect(() => {
    const handleSwitchToFlowTab = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.guideId) {
        setTargetGuideId(customEvent.detail.guideId);
        setActiveTab("flow");
      }
    };

    window.addEventListener('switch-to-flow-tab', handleSwitchToFlowTab as EventListener);
    return () => {
      window.removeEventListener('switch-to-flow-tab', handleSwitchToFlowTab as EventListener);
    };
  }, []);

  // フローデータ更新イベントのリスナー
  useEffect(() => {
    const refreshFlowList = async () => {
      try {
        const response = await fetch(`/api/emergency-flow/list?ts=${Date.now()}`);
        if (!response.ok) throw new Error("読み込み失敗");
        const data = await response.json();
        // フロー一覧を直接更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('forceRefreshFlowList', {
            detail: { flowList: Array.isArray(data) ? data : [] }
          }));
        }
      } catch (err) {
        console.error("フロー一覧取得エラー", err);
      }
    };

    window.addEventListener("flowDataUpdated", refreshFlowList);
    window.addEventListener("troubleshootingDataUpdated", refreshFlowList);
    window.addEventListener("emergencyFlowSaved", refreshFlowList);

    return () => {
      window.removeEventListener("flowDataUpdated", refreshFlowList);
      window.removeEventListener("troubleshootingDataUpdated", refreshFlowList);
      window.removeEventListener("emergencyFlowSaved", refreshFlowList);
    };
  }, []);

  // データ更新を監視（削除されたファイルの再表示問題も修正）
  useEffect(() => {
    const handleFlowDataUpdated = (event) => {
      console.log('🔄 フローデータ更新イベントを受信:', event.detail);
      // 強制的にキャッシュをクリアして再取得
      fetchFlowList(true);
    };

    // 複数のイベントタイプに対応
    const eventTypes = [
      'flowDataUpdated',
      'troubleshootingDataUpdated', 
      'emergencyFlowSaved',
      'fileSystemUpdated'
    ];

    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleFlowDataUpdated);
    });

    // 定期的な更新チェックを無効化（イベントベースで十分）
    // const intervalId = setInterval(() => {
    //   fetchFlowList(true);
    // }, 30000); // 30秒ごと

    return () => {
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleFlowDataUpdated);
      });
      // clearInterval(intervalId);
    };
  }, []);

  // アップロード成功時のハンドラー
  const handleUploadSuccess = (guideId: string) => {
    setLastUploadedGuideId(guideId);
    // アップロード成功後に編集タブに切り替え
    setActiveTab("edit");
  };

  // 検索キーワードがクリックされたときのハンドラー
  const handleKeywordClick = (keyword: string) => {
    setSearchQuery(keyword);
    // ここで実際に検索を実行する処理を呼び出す
    console.log(`検索キーワード「${keyword}」がクリックされました`);

    // 検索を実行
    executeSearch(keyword);
  };

  // 検索を実行する関数
  const executeSearch = (keyword: string) => {
    if (!keyword.trim()) return;

    console.log(`検索実行: 「${keyword}」`);

    // 編集タブに切り替え（検索結果表示のため）
    setActiveTab("edit");

    // キーワードをカスタムイベントで通知
    window.dispatchEvent(new CustomEvent('search-emergency-guide', { 
      detail: { keyword }
    }));
  };

  const [isLoadingFlowList, setIsLoadingFlowList] = useState(false);
  const [flowList, setFlowList] = useState([]);
  const { toast } = useToast()

  const fetchFlowList = async (forceRefresh = false) => {
    try {
      setIsLoadingFlowList(true);
      console.log(`🔄 応急処置データ一覧の取得を開始します (forceRefresh: ${forceRefresh})`);

      // キャッシュクリア処理を簡素化
        if (forceRefresh && typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
          console.log('🧹 キャッシュクリア完了');
        }

      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const cacheParams = `?_t=${timestamp}&_r=${randomId}&no_cache=true&source=troubleshooting`;

      const response = await fetch(`/api/emergency-flow/list${cacheParams}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Fresh': 'true',
          'X-Clear-Cache': 'true'
        }
      });

      if (!response.ok) {
        throw new Error(`応急処置データの取得に失敗しました: ${response.status}`);
      }

      const data = await response.json();

      // 全データを処理（フィルタリングなし）
      console.log(`✅ 取得したフローデータ: ${data.length}件`);
      setFlowList(Array.isArray(data) ? data : []);

      // データをキャッシュ
      if (typeof window !== 'undefined') {
        localStorage.setItem('emergencyFlowList', JSON.stringify({
          data: Array.isArray(data) ? data : [],
          timestamp: timestamp,
          version: '3.0',
          source: 'knowledge-base/troubleshooting'
        }));
      }

    } catch (error) {
      console.error('❌ 応急処置データ取得エラー:', error);
      toast({
        title: "エラー",
        description: "応急処置データの取得に失敗しました",
        variant: "destructive",
      });
      setFlowList([]);
    } finally {
      setIsLoadingFlowList(false);
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden p-4">
      <Helmet>
        <title>応急処置フロー生成 | 保守用車支援システム</title>
      </Helmet>

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-blue-800 mb-2">
          応急処置フロー生成
        </h1>

        {/* キーワード検索のみ表示 */}
        <div className="mt-4 space-y-2">
          <KeywordSuggestions onKeywordClick={handleKeywordClick} />
        </div>
      </div>

      <Tabs
        defaultValue={activeTab}
        onValueChange={setActiveTab}
        className="w-full h-[calc(100vh-120px)]"
      >
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="upload">新規作成（アップロード）</TabsTrigger>
          <TabsTrigger value="edit">テキスト編集</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4 h-full overflow-auto">
          <EmergencyGuideUploader onUploadSuccess={handleUploadSuccess} />
        </TabsContent>

        <TabsContent value="edit" className="space-y-4 h-full overflow-auto">
          <EmergencyGuideEdit />
        </TabsContent>

        
      </Tabs>
    </div>
  );
};

export default EmergencyGuidePage;