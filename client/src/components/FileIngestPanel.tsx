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
        // ファイルサイズチェチE���E�E0MB制限！E
        if (file.size > 20 * 1024 * 1024) {
          setStatus(`エラー: ${file.name} - ファイルサイズぁE0MBを趁E��してぁE��す。サーバに直接アチE�Eロードしてください。`);
          continue;
        }

        setStatus(`処琁E��: ${file.name}`);
        // 原則�E�そのままサーバに送る。pptxは暫定で抽出に挑戦→失敗なら生送信、E
        let text = "";
        if (file.name.toLowerCase().endsWith(".txt")) {
          text = await file.text();
        } else if (file.name.toLowerCase().endsWith(".pptx")) {
          try { text = await extractTextFromPptx(file); } catch { /* フォールバック */ }
        }
        if (!text) {
          // 生ファイルを送ってサーバで確定�E琁E��推奨経路�E�E
          const fd = new FormData();
          fd.append("file", file);
          const r = await fetch("/api/ingest", { method: "POST", body: fd, credentials: "include" });
          if (!r.ok) throw new Error("upload failed");
          const j = await r.json();
          setStatus(`完亁E ${file.name} ↁEdoc_id=${j.doc_id}, chunks=${j.chunks}`);
        } else {
          // チE��スト直接送信�E�Ext/pptx抽出済み�E�E
          const r = await fetch("/api/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ filename: file.name, text, tags: [] })
          });
          if (!r.ok) throw new Error("ingest failed");
          const j = await r.json();
          setStatus(`完亁E ${file.name} ↁEdoc_id=${j.doc_id}, chunks=${j.chunks}`);
        }
      } catch (e:any) {
        setStatus(`失敁E ${file?.name} (${e.message||e})`);
      }
    }
  }

  async function handleJsonFile(files: FileList | null) {
    if (!files || !files.length) return;
    const file = files[0];
    try {
      setStatus(`JSONファイル読み込み中: ${file.name}`);
      const content = await file.text();
      setJsonData(content);
      setStatus(`JSONファイル読み込み完亁E ${file.name}`);
    } catch (e: any) {
      setStatus(`JSONファイル読み込み失敁E ${file.name} (${e.message || e})`);
    }
  }

  async function handleJsonIngest() {
    if (!jsonData.trim()) {
      setStatus("エラー: JSONチE�Eタが�E力されてぁE��せん");
      return;
    }

    try {
      setStatus("JSONチE�Eタ処琁E��...");
      
      // JSONチE�Eタをパースして検証
      let parsedData;
      try {
        parsedData = JSON.parse(jsonData);
      } catch (e) {
        setStatus("エラー: 無効なJSON形式でぁE);
        return;
      }

      // チャチE��履歴のJSONチE�Eタを�E琁E
      // チャチE��メチE��ージからチE��ストを抽出
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
        // そ�E他�E形式�E場合�E斁E���E匁E
        extractedText = JSON.stringify(parsedData, null, 2);
      }

      if (!extractedText.trim()) {
        setStatus("エラー: 有効なチE��ストデータが見つかりません");
        return;
      }

      // サーバ�Eに送信
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
      setStatus(`JSONチE�Eタ取込完亁EↁEdoc_id=${j.doc_id}, chunks=${j.chunks}`);
      setJsonData(""); // 成功後�Eクリア
    } catch (e: any) {
      setStatus(`JSONチE�Eタ処琁E��敁E ${e.message || e}`);
    }
  }

  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
             <div className="text-xl font-semibold text-blue-800 mb-3">機械敁E��報告書から取込</div>
      
      {/* 補足説昁E*/}
      <div className="mb-6">
        <p className="text-base font-semibold text-gray-700">
          チャチE��からサーバ�Eへ送信したチE�Eタのほか、外部で作�Eした機械敁E��惁E��をアチE�Eロードできます、E
        </p>
      </div>
      
      <div className="space-y-6">
        {/* 区刁E��緁E*/}
        <div className="border-t border-gray-200 pt-6">
          
          {/* JSONファイル選抁E*/}
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
              チャチE��UIからエクスポ�EトしたJSONファイルを選抁E
            </div>
          </div>

          {/* JSONチE�Eタ手動入劁E*/}
          <div className="space-y-3 mb-6">
            <label className="block text-sm font-medium text-gray-700">
              JSONチE�Eタ�E�直接入力！E
            </label>
            <textarea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder="チャチE��履歴のJSONチE�Eタをここに貼り付けてください..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* 手動取込ボタン */}
          <div className="pt-2 mb-6">
            <button
              onClick={handleJsonIngest}
              disabled={!jsonData.trim()}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                             処琁E��姁E
            </button>
          </div>
        </div>

        {/* スチE�Eタス表示 */}
        <div className="text-sm mt-2 p-2 bg-gray-50 rounded border min-h-[2rem]">
          {status}
        </div>
      </div>
    </div>
  );
}
