import React, { useEffect, useState } from "react";

type RagConfig = {
  embedDim: number; chunkSize: number; chunkOverlap: number;
  retrieveK: number; rerankTop: number; rerankMin: number;
};
const INIT: RagConfig = { embedDim:1536, chunkSize:800, chunkOverlap:80, retrieveK:8, rerankTop:3, rerankMin:0.25 };

export default function RagSettingsPanel(){
  const [cfg, setCfg] = useState<RagConfig>(INIT);
  const [msg, setMsg] = useState("");

  useEffect(()=>{ (async()=>{
    const r = await fetch("/api/config/rag", { credentials: "include" });
    if (r.ok) setCfg(await r.json());
  })(); }, []);

  function v(cfg: RagConfig): string | null {
    if (cfg.chunkSize < 500 || cfg.chunkSize > 800) return "粒度は500 E00にしてください";
    if (cfg.chunkOverlap < 50 || cfg.chunkOverlap > 100) return "オーバ�EラチE�Eは50 E00にしてください";
    if (cfg.chunkOverlap >= cfg.chunkSize) return "オーバ�EラチE�Eは粒度より小さぁE;
    if (cfg.retrieveK < 1 || cfg.retrieveK > 16) return "kは1 E6";
    if (cfg.rerankTop < 1 || cfg.rerankTop > 5) return "再ランク上位�E1 E";
    if (cfg.rerankTop > cfg.retrieveK) return "再ランク上位�Ek以下に";
    if (cfg.rerankMin < 0 || cfg.rerankMin > 1) return "しきぁE��は0 E";
    return null;
  }

  async function save(){
    const err = v(cfg);
    if (err) return setMsg("保存不可: " + err);
    const r = await fetch("/api/config/rag", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(cfg)
    });
    setMsg(r.ok ? "保存しました" : "保存失敁E);
  }

  const on = (k:keyof RagConfig)=>(e:any)=> setCfg({...cfg, [k]: Number(e.target.value)});

  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="font-semibold text-lg mb-3 text-gray-800">RAG設宁E/div>
             <p className="text-sm text-gray-600 mb-4 font-semibold">
         RAG�E�Eetrieval-Augmented Generation�E��E、AIが質問に答える際に関連する斁E��を検索して、より正確で信頼性の高い回答を生�Eするための設定です。これらのパラメータを調整することで、検索精度と処琁E��度のバランスを最適化できます、E
       </p>
       
       
       
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            粒度 (500 E00)
            <input 
              type="number" 
              min="500" 
              max="800"
              value={cfg.chunkSize} 
              onChange={on("chunkSize")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
                     <p className="text-xs text-gray-500">
             斁E��を�E割する際�E1つの塊�E斁E��数。大きいほど斁E��を保ち、小さぁE��ど細かく刁E��されます、E
           </p>
         </div>
         
         <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            重なめE(50 E00)
            <input 
              type="number" 
              min="50" 
              max="100"
              value={cfg.chunkOverlap} 
              onChange={on("chunkOverlap")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
                     <p className="text-xs text-gray-500">
             隣接する斁E��の塊同士で重褁E��る文字数。文脈�E連続性を保つために重要です、E
           </p>
         </div>
         
         <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            k (1 E6)
            <input 
              type="number" 
              min="1" 
              max="16"
              value={cfg.retrieveK} 
              onChange={on("retrieveK")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
                     <p className="text-xs text-gray-500">
             検索時に取得する文書の塊�E数。多いほど関連惁E��を多く取得できますが、�E琁E��間が増加します、E
           </p>
         </div>
         
         <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            再ランク上佁E(1 E)
            <input 
              type="number" 
              min="1" 
              max="5"
              value={cfg.rerankTop} 
              onChange={on("rerankTop")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
                     <p className="text-xs text-gray-500">
             検索結果を精度頁E��並び替える際に上位何件を対象にするか。多いほど精度が向上しますが、�E琁E��間が増加します、E
           </p>
         </div>
         
         <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            しきぁE�� (0 E)
            <input 
              type="number" 
              step="0.01" 
              min="0" 
              max="1"
              value={cfg.rerankMin} 
              onChange={on("rerankMin")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
                     <p className="text-xs text-gray-500">
             検索結果の類似度の最低基準値。高いほど関連性の高い結果のみが表示され、低いほど多くの結果が表示されます、E
           </p>
         </div>
         
         <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            埋め込み次允E
            <input 
              type="number" 
              value={cfg.embedDim} 
              onChange={on("embedDim")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <p className="text-xs text-gray-500">
            チE��ストを数値ベクトルに変換する際�E次允E��。高いほど表現力が向上しますが、�E琁E��間とメモリ使用量が増加します、E
          </p>
        </div>
      </div>
      <button 
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" 
        onClick={save}
      >
        保孁E
      </button>
      <div className="text-sm mt-3 p-2 bg-gray-50 rounded border min-h-[2rem] text-center">
        {msg || "設定を変更して保存してください"}
      </div>
    </div>
  );
}
