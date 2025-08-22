import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import EmergencyGuideUploader from "../components/emergency-guide/emergency-guide-uploader";
import EmergencyGuideEdit from "../components/emergency-guide/emergency-guide-edit";
import EmergencyGuideDisplay from "../components/emergency-guide/emergency-guide-display";

import { Helmet } from "react-helmet";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast.ts";

const EmergencyGuidePage: React.FC = () => {
  // URL縺九ｉ繧ｯ繧ｨ繝ｪ繝代Λ繝｡繝ｼ繧ｿ繧貞叙蠕・
  const getQueryParam = (name: string): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  };

  // 蛻晄悄繧ｿ繝悶ｒURL縺九ｉ險ｭ螳・
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

  // 讀懃ｴ｢讖溯・縺ｮ迥ｶ諷・
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 繧ｿ繝門・繧頑崛縺医う繝吶Φ繝医・繝ｪ繧ｹ繝翫・
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

  // 繝輔Ο繝ｼ繝・・繧ｿ譖ｴ譁ｰ繧､繝吶Φ繝医・繝ｪ繧ｹ繝翫・
  useEffect(() => {
    const refreshFlowList = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/list?ts=${Date.now()}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error("隱ｭ縺ｿ霎ｼ縺ｿ螟ｱ謨・);
        const data = await response.json();
        // API繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ讒矩縺ｫ蜷医ｏ縺帙※繝・・繧ｿ繧偵・繝・ヴ繝ｳ繧ｰ
        const flows = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
        // 繝輔Ο繝ｼ荳隕ｧ繧堤峩謗･譖ｴ譁ｰ
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('forceRefreshFlowList', {
            detail: { flowList: flows }
          }));
        }
      } catch (err) {
        console.error("繝輔Ο繝ｼ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ", err);
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

  // 繝・・繧ｿ譖ｴ譁ｰ繧堤屮隕厄ｼ亥炎髯､縺輔ｌ縺溘ヵ繧｡繧､繝ｫ縺ｮ蜀崎｡ｨ遉ｺ蝠城｡後ｂ菫ｮ豁｣・・
  useEffect(() => {
    const handleFlowDataUpdated = (event) => {
      console.log('売 繝輔Ο繝ｼ繝・・繧ｿ譖ｴ譁ｰ繧､繝吶Φ繝医ｒ蜿嶺ｿ｡:', event.detail);
      // 蠑ｷ蛻ｶ逧・↓繧ｭ繝｣繝・す繝･繧偵け繝ｪ繧｢縺励※蜀榊叙蠕・
      fetchFlowList(true);
    };

    // 隍・焚縺ｮ繧､繝吶Φ繝医ち繧､繝励↓蟇ｾ蠢・
    const eventTypes = [
      'flowDataUpdated',
      'troubleshootingDataUpdated', 
      'emergencyFlowSaved',
      'fileSystemUpdated'
    ];

    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleFlowDataUpdated);
    });

    // 螳壽悄逧・↑譖ｴ譁ｰ繝√ぉ繝・け繧堤┌蜉ｹ蛹厄ｼ医う繝吶Φ繝医・繝ｼ繧ｹ縺ｧ蜊∝・・・
    // const intervalId = setInterval(() => {
    //   fetchFlowList(true);
    // }, 30000); // 30遘偵＃縺ｨ

    return () => {
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleFlowDataUpdated);
      });
      // clearInterval(intervalId);
    };
  }, []);

  // 繧｢繝・・繝ｭ繝ｼ繝画・蜉滓凾縺ｮ繝上Φ繝峨Λ繝ｼ
  const handleUploadSuccess = (guideId: string) => {
    setLastUploadedGuideId(guideId);
    // 繧｢繝・・繝ｭ繝ｼ繝画・蜉溷ｾ後↓邱ｨ髮・ち繝悶↓蛻・ｊ譖ｿ縺・
    setActiveTab("edit");
  };

  const [isLoadingFlowList, setIsLoadingFlowList] = useState(false);
  const [flowList, setFlowList] = useState([]);
  const { toast } = useToast()

  const fetchFlowList = async (forceRefresh = false) => {
    try {
      setIsLoadingFlowList(true);
      console.log(`売 蠢懈･蜃ｦ鄂ｮ繝・・繧ｿ荳隕ｧ縺ｮ蜿門ｾ励ｒ髢句ｧ九＠縺ｾ縺・(forceRefresh: ${forceRefresh})`);

      // 繧ｭ繝｣繝・す繝･繧ｯ繝ｪ繧｢蜃ｦ逅・ｒ邁｡邏蛹・
        if (forceRefresh && typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
          console.log('ｧｹ 繧ｭ繝｣繝・す繝･繧ｯ繝ｪ繧｢螳御ｺ・);
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
        throw new Error(`蠢懈･蜃ｦ鄂ｮ繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆: ${response.status}`);
      }

      const data = await response.json();

      // API繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ讒矩縺ｫ蜷医ｏ縺帙※繝・・繧ｿ繧偵・繝・ヴ繝ｳ繧ｰ
      const flows = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
      console.log(`笨・蜿門ｾ励＠縺溘ヵ繝ｭ繝ｼ繝・・繧ｿ: ${flows.length}莉ｶ`);
      setFlowList(flows);

      // 繝・・繧ｿ繧偵く繝｣繝・す繝･
      if (typeof window !== 'undefined') {
        localStorage.setItem('emergencyFlowList', JSON.stringify({
          data: flows,
          timestamp: timestamp,
          version: '3.0',
          source: 'knowledge-base/troubleshooting'
        }));
      }

    } catch (error) {
      console.error('笶・蠢懈･蜃ｦ鄂ｮ繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "蠢懈･蜃ｦ鄂ｮ繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
      setFlowList([]);
    } finally {
      setIsLoadingFlowList(false);
    }
  };

  // 繧ｬ繧､繝芽｡ｨ遉ｺ繧堤ｵゆｺ・☆繧矩未謨ｰ
  const handleExitDisplay = () => {
    setDisplayingGuideId(null);
    setActiveTab("edit");
  };

  // 繧ｬ繧､繝芽｡ｨ遉ｺ荳ｭ縺ｮ蝣ｴ蜷・
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
        <title>蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝・- Emergency Assistance</title>
        <meta name="description" content="蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・邂｡逅・→陦ｨ遉ｺ" />
      </Helmet>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">繧｢繝・・繝ｭ繝ｼ繝・/TabsTrigger>
            <TabsTrigger value="edit">邱ｨ髮・・邂｡逅・/TabsTrigger>
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
