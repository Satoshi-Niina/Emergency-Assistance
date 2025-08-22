import React, { useState } from "react";
import { extractTextFromPptx } from "@/utils/pptxExtract";
import { AlertTriangle } from "lucide-react";

const ACCEPT = ".txt,.pdf,.xlsx,.pptx";
const JSON_ACCEPT = ".json";

export default function FileIngestPanel() {
  const [status, setStatus] = useState<string>("");
  const [jsonData, setJsonData] = useState<string>("");

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    for (const file of Array.from(files)) {
      try {
        // 繝輔ぃ繧､繝ｫ繧ｵ繧､繧ｺ繝√ぉ繝・け・・0MB蛻ｶ髯撰ｼ・
        if (file.size > 20 * 1024 * 1024) {
          setStatus(`繧ｨ繝ｩ繝ｼ: ${file.name} - 繝輔ぃ繧､繝ｫ繧ｵ繧､繧ｺ縺・0MB繧定ｶ・℃縺励※縺・∪縺吶ゅし繝ｼ繝舌↓逶ｴ謗･繧｢繝・・繝ｭ繝ｼ繝峨＠縺ｦ縺上□縺輔＞縲Ａ);
          continue;
        }

        setStatus(`蜃ｦ逅・ｸｭ: ${file.name}`);
        // 蜴溷援・壹◎縺ｮ縺ｾ縺ｾ繧ｵ繝ｼ繝舌↓騾√ｋ縲Ｑptx縺ｯ證ｫ螳壹〒謚ｽ蜃ｺ縺ｫ謖第姶竊貞､ｱ謨励↑繧臥函騾∽ｿ｡縲・
        let text = "";
        if (file.name.toLowerCase().endsWith(".txt")) {
          text = await file.text();
        } else if (file.name.toLowerCase().endsWith(".pptx")) {
          try { text = await extractTextFromPptx(file); } catch { /* 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ */ }
        }
        if (!text) {
          // 逕溘ヵ繧｡繧､繝ｫ繧帝√▲縺ｦ繧ｵ繝ｼ繝舌〒遒ｺ螳壼・逅・ｼ域耳螂ｨ邨瑚ｷｯ・・
          const fd = new FormData();
          fd.append("file", file);
          const r = await fetch("/api/ingest", { method: "POST", body: fd, credentials: "include" });
          if (!r.ok) throw new Error("upload failed");
          const j = await r.json();
          setStatus(`螳御ｺ・ ${file.name} 竊・doc_id=${j.doc_id}, chunks=${j.chunks}`);
        } else {
          // 繝・く繧ｹ繝育峩謗･騾∽ｿ｡・・xt/pptx謚ｽ蜃ｺ貂医∩・・
          const r = await fetch("/api/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ filename: file.name, text, tags: [] })
          });
          if (!r.ok) throw new Error("ingest failed");
          const j = await r.json();
          setStatus(`螳御ｺ・ ${file.name} 竊・doc_id=${j.doc_id}, chunks=${j.chunks}`);
        }
      } catch (e:any) {
        setStatus(`螟ｱ謨・ ${file?.name} (${e.message||e})`);
      }
    }
  }

  async function handleJsonFile(files: FileList | null) {
    if (!files || !files.length) return;
    const file = files[0];
    try {
      setStatus(`JSON繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ: ${file.name}`);
      const content = await file.text();
      setJsonData(content);
      setStatus(`JSON繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ螳御ｺ・ ${file.name}`);
    } catch (e: any) {
      setStatus(`JSON繝輔ぃ繧､繝ｫ隱ｭ縺ｿ霎ｼ縺ｿ螟ｱ謨・ ${file.name} (${e.message || e})`);
    }
  }

  async function handleJsonIngest() {
    if (!jsonData.trim()) {
      setStatus("繧ｨ繝ｩ繝ｼ: JSON繝・・繧ｿ縺悟・蜉帙＆繧後※縺・∪縺帙ｓ");
      return;
    }

    try {
      setStatus("JSON繝・・繧ｿ蜃ｦ逅・ｸｭ...");
      
      // JSON繝・・繧ｿ繧偵ヱ繝ｼ繧ｹ縺励※讀懆ｨｼ
      let parsedData;
      try {
        parsedData = JSON.parse(jsonData);
      } catch (e) {
        setStatus("繧ｨ繝ｩ繝ｼ: 辟｡蜉ｹ縺ｪJSON蠖｢蠑上〒縺・);
        return;
      }

      // 繝√Ε繝・ヨ螻･豁ｴ縺ｮJSON繝・・繧ｿ繧貞・逅・
      // 繝√Ε繝・ヨ繝｡繝・そ繝ｼ繧ｸ縺九ｉ繝・く繧ｹ繝医ｒ謚ｽ蜃ｺ
      let extractedText = "";
      if (parsedData.messages && Array.isArray(parsedData.messages)) {
        extractedText = parsedData.messages
          .map((msg: any) => msg.content || msg.text || "")
          .filter((text: string) => text.trim())
          .join("\n\n---\n\n");
      } else if (parsedData.content) {
        extractedText = parsedData.content;
      } else if (typeof parsedData === "string") {
        extractedText = parsedData;
      } else {
        // 縺昴・莉悶・蠖｢蠑上・蝣ｴ蜷医・譁・ｭ怜・蛹・
        extractedText = JSON.stringify(parsedData, null, 2);
      }

      if (!extractedText.trim()) {
        setStatus("繧ｨ繝ｩ繝ｼ: 譛牙柑縺ｪ繝・く繧ｹ繝医ョ繝ｼ繧ｿ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ");
        return;
      }

      // 繧ｵ繝ｼ繝舌・縺ｫ騾∽ｿ｡
      const r = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          filename: `chat_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`, 
          text: extractedText, 
          tags: ["chat_export", "json"] 
        })
      });

      if (!r.ok) throw new Error("ingest failed");
      const j = await r.json();
      setStatus(`JSON繝・・繧ｿ蜿冶ｾｼ螳御ｺ・竊・doc_id=${j.doc_id}, chunks=${j.chunks}`);
      setJsonData(""); // 謌仙粥蠕後・繧ｯ繝ｪ繧｢
    } catch (e: any) {
      setStatus(`JSON繝・・繧ｿ蜃ｦ逅・､ｱ謨・ ${e.message || e}`);
    }
  }

  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
             <div className="text-xl font-semibold text-blue-800 mb-3">讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌縺九ｉ蜿冶ｾｼ</div>
      
      {/* 陬懆ｶｳ隱ｬ譏・*/}
      <div className="mb-6">
        <p className="text-base font-semibold text-gray-700">
          繝√Ε繝・ヨ縺九ｉ繧ｵ繝ｼ繝舌・縺ｸ騾∽ｿ｡縺励◆繝・・繧ｿ縺ｮ縺ｻ縺九∝､夜Κ縺ｧ菴懈・縺励◆讖滓｢ｰ謨・囿諠・ｱ繧偵い繝・・繝ｭ繝ｼ繝峨〒縺阪∪縺吶・
        </p>
      </div>
      
      <div className="space-y-6">
        {/* 蛹ｺ蛻・ｊ邱・*/}
        <div className="border-t border-gray-200 pt-6">
          
          {/* JSON繝輔ぃ繧､繝ｫ驕ｸ謚・*/}
          <div className="space-y-3 mb-6">
            <div className="flex items-center space-x-2">
              <input 
                type="file" 
                accept={JSON_ACCEPT} 
                onChange={e=>handleJsonFile(e.target.files)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
            </div>
            <div className="text-xs text-gray-500">
              繝√Ε繝・ヨUI縺九ｉ繧ｨ繧ｯ繧ｹ繝昴・繝医＠縺櫟SON繝輔ぃ繧､繝ｫ繧帝∈謚・
            </div>
          </div>

          {/* JSON繝・・繧ｿ謇句虚蜈･蜉・*/}
          <div className="space-y-3 mb-6">
            <label className="block text-sm font-medium text-gray-700">
              JSON繝・・繧ｿ・育峩謗･蜈･蜉幢ｼ・
            </label>
            <textarea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder="繝√Ε繝・ヨ螻･豁ｴ縺ｮJSON繝・・繧ｿ繧偵％縺薙↓雋ｼ繧贋ｻ倥￠縺ｦ縺上□縺輔＞..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* 謇句虚蜿冶ｾｼ繝懊ち繝ｳ */}
          <div className="pt-2 mb-6">
            <button
              onClick={handleJsonIngest}
              disabled={!jsonData.trim()}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                             蜃ｦ逅・幕蟋・
            </button>
          </div>
        </div>

        {/* 繧ｹ繝・・繧ｿ繧ｹ陦ｨ遉ｺ */}
        <div className="text-sm mt-2 p-2 bg-gray-50 rounded border min-h-[2rem]">
          {status}
        </div>
      </div>
    </div>
  );
}
