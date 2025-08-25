import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import TroubleshootingFlow from "./troubleshooting-flow";
import { useToast } from "../../hooks/use-toast.ts";

// 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔Ο繝ｼ縺ｮ蝙句ｮ夂ｾｩ
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

  // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝輔Ο繝ｼ繧貞叙蠕・
  const fetchFlows = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/list`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const normalizedFlows = data.map((flow: any) => ({
        id: flow.id,
        title: flow.title || '繧ｿ繧､繝医Ν縺ｪ縺・,
        description: flow.description || flow.title || '隱ｬ譏弱↑縺・,
        trigger: flow.trigger || flow.triggerKeywords || [],
        source: flow.dataSource || 'unknown'
      }));
      setFlows(normalizedFlows);
      setFilteredFlows(normalizedFlows);
    } catch (error) {
      console.error("笶・繝輔Ο繝ｼ蜿門ｾ励お繝ｩ繝ｼ:", error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "繝輔Ο繝ｼ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  // 繝輔Ο繝ｼ繧呈､懃ｴ｢
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

  // 讀懃ｴ｢譚｡莉ｶ縺ｧ繝輔Ο繝ｼ繧偵ヵ繧｣繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
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

  // 繝輔Ο繝ｼ繧帝∈謚・
  const handleSelectFlow = (id: string) => {
    setSelectedFlow(id);
  };

  // 繝輔Ο繝ｼ縺ｮ陦ｨ遉ｺ繧偵く繝｣繝ｳ繧ｻ繝ｫ
  const handleCancelFlow = () => {
    setSelectedFlow(null);
  };

  // 繝輔Ο繝ｼ縺悟ｮ御ｺ・＠縺溷ｴ蜷・
  const handleFlowComplete = () => {
    toast({
      title: "螳御ｺ・,
      description: "繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ縺悟ｮ御ｺ・＠縺ｾ縺励◆",
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
  
  // 迚ｹ螳壹・繝輔Ο繝ｼ縺碁∈謚槭＆繧後※縺・ｋ蝣ｴ蜷医・縺昴・繝輔Ο繝ｼ繧定｡ｨ遉ｺ
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
          <CardTitle className="text-2xl md:text-3xl">蠢懈･蜃ｦ-鄂ｮ繧ｬ繧､繝・/CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-8">
            <p className="mb-4 text-base md:text-lg text-gray-600">
              莉･荳九°繧臥裸迥ｶ繧帝∈謚槭☆繧九°縲√く繝ｼ繝ｯ繝ｼ繝峨〒讀懃ｴ｢縺励※縺上□縺輔＞縲・
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="text-base md:text-lg text-gray-600 self-center mr-2">莉｣陦ｨ逧・↑繧ｭ繝ｼ繝ｯ繝ｼ繝・</span>
              {["繧ｨ繝ｳ繧ｸ繝ｳ", "繝医Ν繧ｳ繝ｳ", "繝悶Ξ繝ｼ繧ｭ", "繧ｨ繧｢繝ｼ", "繝舌ャ繝・Μ繝ｼ"].map(
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
              <label className="block text-sm font-medium text-gray-700 mb-2">莠玖ｱ｡荳隕ｧ</label>
              <div className="flex gap-3">
                <Input
                  placeholder="繧ｭ繝ｼ繝ｯ繝ｼ繝峨〒讀懃ｴ｢..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
                  className="flex-1 text-base md:text-lg p-4 h-auto"
                />
                <Button variant="outline" onClick={() => setSearchTerm("")} className="p-4 text-base md:text-lg">繧ｯ繝ｪ繧｢</Button>
                <Button onClick={handleSearch} className="p-4 text-base md:text-lg">讀懃ｴ｢</Button>
              </div>
            </div>
          </div>
          
          {/* 繝輔Ο繝ｼ荳隕ｧ繧ｿ繧､繝医Ν */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">繝輔Ο繝ｼ荳隕ｧ</h3>
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
                  <p className="font-medium text-lg text-left">{flow.title || flow.description || '繧ｿ繧､繝医Ν縺ｪ縺・}</p>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-gray-500">
                讀懃ｴ｢邨先棡縺後≠繧翫∪縺帙ｓ縲ょ挨縺ｮ繧ｭ繝ｼ繝ｯ繝ｼ繝峨〒隧ｦ縺励※縺上□縺輔＞縲・
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}