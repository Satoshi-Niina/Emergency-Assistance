import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export async function extractTextFromPptx(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const slideFiles = Object.keys(zip.files)
    .filter(p => p.startsWith("ppt/slides/slide") && p.endsWith(".xml"))
    .sort();
  let out: string[] = [];
  for (const p of slideFiles) {
    const xml = await zip.file(p)!.async("text");
    const json = parser.parse(xml);
    // a:t・医ユ繧ｭ繧ｹ繝茨ｼ峨ｒ謚ｽ蜃ｺ
    const texts: string[] = [];
    const walk = (n: any) => {
      if (!n || typeof n !== "object") return;
      if (n["a:t"]) texts.push(String(n["a:t"]));
      Object.values(n).forEach(walk);
    };
    walk(json);
    out.push(texts.join("\n"));
  }
  return out.join("\n\n---\n\n");
}



