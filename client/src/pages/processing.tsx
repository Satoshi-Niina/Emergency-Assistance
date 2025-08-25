import { useAuth } from "../context/auth-context";
import { useState } from "react";
import UnifiedDataProcessor from "../components/knowledge/unified-data-processor";

export default function Processing() {
  const { user } = useAuth();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-neutral-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="font-semibold text-lg text-indigo-600">邱乗峡繝・・繧ｿ蜃ｦ逅・/h2>
        <p className="text-sm text-neutral-500">譁・嶌縺ｮ繧｢繝・・繝ｭ繝ｼ繝峨→蜃ｦ逅・↓繧医ｊ縲、I繝翫Ξ繝・ず繝吶・繧ｹ縲∫判蜒乗､懃ｴ｢縲＿&A繝・・繧ｿ繧剃ｸ蠎ｦ縺ｫ逕滓・縺励∪縺・/p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="mx-auto max-w-5xl">
          
          {/* 邨ｱ蜷医ョ繝ｼ繧ｿ蜃ｦ逅・さ繝ｳ繝昴・繝阪Φ繝・*/}
          <UnifiedDataProcessor />
        </div>
      </div>
    </div>
  );
}
