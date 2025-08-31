// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import EmergencyGuideUploader from "../components/emergency-guide/emergency-guide-uploader";
import EmergencyGuideEdit from "../components/emergency-guide/emergency-guide-edit";
import EmergencyGuideDisplay from "../components/emergency-guide/emergency-guide-display";

import { Helmet } from "react-helmet";
import { useToast } from "../hooks/use-toast";

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
  const [displayingGuideId, setDisplayingGuideId] = useState<string | null>(
    getQueryParam('display')
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

    const handleDisplayGuide = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.guideId) {
        setDisplayingGuideId(customEvent.detail.guideId);
        setActiveTab("display");
      }
    };

    window.addEventListener('switch-to-flow-tab', handleSwitchToFlowTab as EventListener);
    window.addEventListener('display-emergency-guide', handleDisplayGuide as EventListener);
    
    return () => {
      window.removeEventListener('switch-to-flow-tab', handleSwitchToFlowTab as EventListener);
      window.removeEventListener('display-emergency-guide', handleDisplayGuide as EventListener);
    };
  }, []);

  // フローデータ更新イベントのリスナー
  useEffect(() => {
    const refreshFlowList = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/list?ts=${Date.now()}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error("読み込み失敗");
        const data = await response.json();
        // APIレスポンスの構造に合わせてデータをマッピング
        const flows = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
        // フロー一覧を直接更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('forceRefreshFlowList', {
            detail: { flowList: flows }
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

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/list${cacheParams}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`応急処置データの取得に失敗しました: ${response.status}`);
      }

      const data = await response.json();

      // APIレスポンスの構造に合わせてデータをマッピング
      const flows = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
      console.log(`✅ 取得したフローデータ: ${flows.length}件`);
      setFlowList(flows);

      // データをキャッシュ
      if (typeof window !== 'undefined') {
        localStorage.setItem('emergencyFlowList', JSON.stringify({
          data: flows,
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

  // ガイド表示を終了する関数
  const handleExitDisplay = () => {
    setDisplayingGuideId(null);
    setActiveTab("edit");
  };

  // ガイド表示中の場合
  if (displayingGuideId && activeTab === "display") {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmergencyGuideDisplay
          guideId={displayingGuideId}
          onExit={handleExitDisplay}
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Helmet>
        <title>応急処置ガイド - Emergency Assistance</title>
        <meta name="description" content="応急処置ガイドの管理と表示" />
      </Helmet>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">アップロード</TabsTrigger>
            <TabsTrigger value="edit">編集・管理</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="upload" className="flex-1 flex flex-col min-h-0 px-4 pb-8">
          <EmergencyGuideUploader onUploadSuccess={handleUploadSuccess} />
        </TabsContent>

        <TabsContent value="edit" className="flex-1 flex flex-col min-h-0 px-4 pb-8">
          <EmergencyGuideEdit />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmergencyGuidePage;
