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
    if (cfg.chunkSize < 500 || cfg.chunkSize > 800) return "邊貞ｺｦ縺ｯ500窶・00縺ｫ縺励※縺上□縺輔＞";
    if (cfg.chunkOverlap < 50 || cfg.chunkOverlap > 100) return "繧ｪ繝ｼ繝舌・繝ｩ繝・・縺ｯ50窶・00縺ｫ縺励※縺上□縺輔＞";
    if (cfg.chunkOverlap >= cfg.chunkSize) return "繧ｪ繝ｼ繝舌・繝ｩ繝・・縺ｯ邊貞ｺｦ繧医ｊ蟆上＆縺・;
    if (cfg.retrieveK < 1 || cfg.retrieveK > 16) return "k縺ｯ1窶・6";
    if (cfg.rerankTop < 1 || cfg.rerankTop > 5) return "蜀阪Λ繝ｳ繧ｯ荳贋ｽ阪・1窶・";
    if (cfg.rerankTop > cfg.retrieveK) return "蜀阪Λ繝ｳ繧ｯ荳贋ｽ阪・k莉･荳九↓";
    if (cfg.rerankMin < 0 || cfg.rerankMin > 1) return "縺励″縺・､縺ｯ0窶・";
    return null;
  }

  async function save(){
    const err = v(cfg);
    if (err) return setMsg("菫晏ｭ倅ｸ榊庄: " + err);
    const r = await fetch("/api/config/rag", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(cfg)
    });
    setMsg(r.ok ? "菫晏ｭ倥＠縺ｾ縺励◆" : "菫晏ｭ伜､ｱ謨・);
  }

  const on = (k:keyof RagConfig)=>(e:any)=> setCfg({...cfg, [k]: Number(e.target.value)});

  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="font-semibold text-lg mb-3 text-gray-800">RAG險ｭ螳・/div>
             <p className="text-sm text-gray-600 mb-4 font-semibold">
         RAG・・etrieval-Augmented Generation・峨・縲、I縺瑚ｳｪ蝠上↓遲斐∴繧矩圀縺ｫ髢｢騾｣縺吶ｋ譁・嶌繧呈､懃ｴ｢縺励※縲√ｈ繧頑ｭ｣遒ｺ縺ｧ菫｡鬆ｼ諤ｧ縺ｮ鬮倥＞蝗樒ｭ斐ｒ逕滓・縺吶ｋ縺溘ａ縺ｮ險ｭ螳壹〒縺吶ゅ％繧後ｉ縺ｮ繝代Λ繝｡繝ｼ繧ｿ繧定ｪｿ謨ｴ縺吶ｋ縺薙→縺ｧ縲∵､懃ｴ｢邊ｾ蠎ｦ縺ｨ蜃ｦ逅・溷ｺｦ縺ｮ繝舌Λ繝ｳ繧ｹ繧呈怙驕ｩ蛹悶〒縺阪∪縺吶・
       </p>
       
       
       
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            邊貞ｺｦ (500窶・00)
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
             譁・嶌繧貞・蜑ｲ縺吶ｋ髫帙・1縺､縺ｮ蝪翫・譁・ｭ玲焚縲ょ､ｧ縺阪＞縺ｻ縺ｩ譁・ц繧剃ｿ昴■縲∝ｰ上＆縺・⊇縺ｩ邏ｰ縺九￥蛻・牡縺輔ｌ縺ｾ縺吶・
           </p>
         </div>
         
         <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            驥阪↑繧・(50窶・00)
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
             髫｣謗･縺吶ｋ譁・嶌縺ｮ蝪雁酔螢ｫ縺ｧ驥崎､・☆繧区枚蟄玲焚縲よ枚閼医・騾｣邯壽ｧ繧剃ｿ昴▽縺溘ａ縺ｫ驥崎ｦ√〒縺吶・
           </p>
         </div>
         
         <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            k (1窶・6)
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
             讀懃ｴ｢譎ゅ↓蜿門ｾ励☆繧区枚譖ｸ縺ｮ蝪翫・謨ｰ縲ょ､壹＞縺ｻ縺ｩ髢｢騾｣諠・ｱ繧貞､壹￥蜿門ｾ励〒縺阪∪縺吶′縲∝・逅・凾髢薙′蠅怜刈縺励∪縺吶・
           </p>
         </div>
         
         <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            蜀阪Λ繝ｳ繧ｯ荳贋ｽ・(1窶・)
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
             讀懃ｴ｢邨先棡繧堤ｲｾ蠎ｦ鬆・↓荳ｦ縺ｳ譖ｿ縺医ｋ髫帙↓荳贋ｽ堺ｽ穂ｻｶ繧貞ｯｾ雎｡縺ｫ縺吶ｋ縺九ょ､壹＞縺ｻ縺ｩ邊ｾ蠎ｦ縺悟髄荳翫＠縺ｾ縺吶′縲∝・逅・凾髢薙′蠅怜刈縺励∪縺吶・
           </p>
         </div>
         
         <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            縺励″縺・､ (0窶・)
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
             讀懃ｴ｢邨先棡縺ｮ鬘樔ｼｼ蠎ｦ縺ｮ譛菴主渕貅門､縲るｫ倥＞縺ｻ縺ｩ髢｢騾｣諤ｧ縺ｮ鬮倥＞邨先棡縺ｮ縺ｿ縺瑚｡ｨ遉ｺ縺輔ｌ縲∽ｽ弱＞縺ｻ縺ｩ螟壹￥縺ｮ邨先棡縺瑚｡ｨ遉ｺ縺輔ｌ縺ｾ縺吶・
           </p>
         </div>
         
         <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            蝓九ａ霎ｼ縺ｿ谺｡蜈・
            <input 
              type="number" 
              value={cfg.embedDim} 
              onChange={on("embedDim")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <p className="text-xs text-gray-500">
            繝・く繧ｹ繝医ｒ謨ｰ蛟､繝吶け繝医Ν縺ｫ螟画鋤縺吶ｋ髫帙・谺｡蜈・焚縲るｫ倥＞縺ｻ縺ｩ陦ｨ迴ｾ蜉帙′蜷台ｸ翫＠縺ｾ縺吶′縲∝・逅・凾髢薙→繝｡繝｢繝ｪ菴ｿ逕ｨ驥上′蠅怜刈縺励∪縺吶・
          </p>
        </div>
      </div>
      <button 
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" 
        onClick={save}
      >
        菫晏ｭ・
      </button>
      <div className="text-sm mt-3 p-2 bg-gray-50 rounded border min-h-[2rem] text-center">
        {msg || "險ｭ螳壹ｒ螟画峩縺励※菫晏ｭ倥＠縺ｦ縺上□縺輔＞"}
      </div>
    </div>
  );
}
