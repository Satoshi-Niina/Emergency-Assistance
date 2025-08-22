import { useAuth } from "../context/auth-context";
import { useState } from "react";
import UnifiedDataProcessor from "../components/knowledge/unified-data-processor";

export default function Processing() {
  const { user } = useAuth();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-neutral-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="font-semibold text-lg text-indigo-600">総括チE�Eタ処琁E/h2>
        <p className="text-sm text-neutral-500">斁E��のアチE�Eロードと処琁E��より、AIナレチE��ベ�Eス、画像検索、Q&AチE�Eタを一度に生�EしまぁE/p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="mx-auto max-w-5xl">
          
          {/* 統合データ処琁E��ンポ�EネンチE*/}
          <UnifiedDataProcessor />
        </div>
      </div>
    </div>
  );
}
