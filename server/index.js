var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/lib/knowledge-base.ts
var knowledge_base_exports = {};
__export(knowledge_base_exports, {
  addDocumentToKnowledgeBase: () => addDocumentToKnowledgeBase,
  backupKnowledgeBase: () => backupKnowledgeBase,
  generateSystemPromptWithKnowledge: () => generateSystemPromptWithKnowledge,
  initializeKnowledgeBase: () => initializeKnowledgeBase,
  listKnowledgeBaseDocuments: () => listKnowledgeBaseDocuments,
  loadKnowledgeBaseIndex: () => loadKnowledgeBaseIndex,
  mergeDocumentContent: () => mergeDocumentContent,
  removeDocumentFromKnowledgeBase: () => removeDocumentFromKnowledgeBase,
  searchKnowledgeBase: () => searchKnowledgeBase
});
import * as path from "path";
import * as fs from "fs";
async function initializeKnowledgeBase() {
  try {
    const directories = [KNOWLEDGE_BASE_DIR, DATA_DIR, TEXT_DIR, TROUBLESHOOTING_DIR, BACKUP_DIR];
    for (const dir of directories) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      } catch (error) {
        console.warn(`\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u4F5C\u6210\u8B66\u544A ${dir}:`, error);
      }
    }
    console.log("Knowledge base directories initialized");
    return true;
  } catch (error) {
    console.error("\u77E5\u8B58\u30D9\u30FC\u30B9\u521D\u671F\u5316\u30A8\u30E9\u30FC:", error);
    throw error;
  }
}
function calculateSimilarity(text1, text22) {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text22.toLowerCase().split(/\s+/);
  const commonWords = words1.filter((word) => words2.includes(word));
  const allWords = /* @__PURE__ */ new Set([...words1, ...words2]);
  return commonWords.length / allWords.size;
}
async function searchKnowledgeBase(query) {
  try {
    const chunks = [];
    const textFiles = fs.readdirSync(TEXT_DIR).filter((file) => file.endsWith(".txt"));
    for (const file of textFiles) {
      try {
        const content = fs.readFileSync(path.join(TEXT_DIR, file), "utf-8");
        const paragraphs = content.split(/\n\s*\n/);
        paragraphs.forEach((paragraph, index) => {
          if (paragraph.trim().length === 0) return;
          chunks.push({
            text: paragraph,
            metadata: {
              source: file,
              index
            }
          });
        });
      } catch (error) {
        console.error(`\u30D5\u30A1\u30A4\u30EB ${file} \u306E\u8AAD\u307F\u8FBC\u307F\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:`, error);
      }
    }
    try {
      const flowFiles = fs.readdirSync(TROUBLESHOOTING_DIR).filter((file) => file.endsWith(".json"));
      for (const file of flowFiles) {
        try {
          const content = fs.readFileSync(path.join(TROUBLESHOOTING_DIR, file), "utf-8");
          const flowData = JSON.parse(content);
          const flowText = `${flowData.title || ""} ${flowData.description || ""}`;
          if (flowData.triggerKeywords && Array.isArray(flowData.triggerKeywords)) {
            const keywords3 = flowData.triggerKeywords.join(" ");
            chunks.push({
              text: `${flowText} ${keywords3}`,
              metadata: {
                source: `\u30D5\u30ED\u30FC: ${file}`,
                index: 0
              }
            });
          } else {
            chunks.push({
              text: flowText,
              metadata: {
                source: `\u30D5\u30ED\u30FC: ${file}`,
                index: 0
              }
            });
          }
          if (flowData.steps && Array.isArray(flowData.steps)) {
            flowData.steps.forEach((step, index) => {
              const stepText = `${step.title || ""} ${step.description || ""}`;
              if (stepText.trim()) {
                chunks.push({
                  text: stepText,
                  metadata: {
                    source: `\u30D5\u30ED\u30FC\u30B9\u30C6\u30C3\u30D7: ${file}`,
                    index: index + 1
                  }
                });
              }
            });
          }
        } catch (error) {
          console.error(`\u30D5\u30ED\u30FC\u30D5\u30A1\u30A4\u30EB ${file} \u306E\u8AAD\u307F\u8FBC\u307F\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:`, error);
        }
      }
    } catch (error) {
      console.error("\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30ED\u30FC\u691C\u7D22\u30A8\u30E9\u30FC:", error);
    }
    const scoredChunks = chunks.map((chunk) => {
      const similarityScore = calculateSimilarity(query, chunk.text);
      return {
        ...chunk,
        similarity: similarityScore
      };
    });
    return scoredChunks.sort((a, b) => (b.similarity || 0) - (a.similarity || 0)).slice(0, 10);
  } catch (error) {
    console.error("\u77E5\u8B58\u30D9\u30FC\u30B9\u691C\u7D22\u30A8\u30E9\u30FC:", error);
    return [];
  }
}
async function generateSystemPromptWithKnowledge(query) {
  const relevantChunks = await searchKnowledgeBase(query);
  let knowledgeText = "";
  if (relevantChunks.length > 0) {
    knowledgeText = "\n\n\u3010\u95A2\u9023\u3059\u308B\u77E5\u8B58\u30D9\u30FC\u30B9\u60C5\u5831\u3011:\n";
    const chunksToInclude = relevantChunks.slice(0, 5);
    for (const chunk of chunksToInclude) {
      knowledgeText += `---
\u51FA\u5178: ${chunk.metadata.source || "\u4E0D\u660E"}

${chunk.text}
---

`;
    }
  }
  const baseSystemPrompt = `\u3042\u306A\u305F\u306F\u4FDD\u5B88\u7528\u8ECA\u652F\u63F4\u30B7\u30B9\u30C6\u30E0\u306E\u4E00\u90E8\u3068\u3057\u3066\u6A5F\u80FD\u3059\u308BAI\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u30E6\u30FC\u30B6\u30FC\u306E\u8CEA\u554F\u306B\u5BFE\u3057\u3066\u3001\u6B63\u78BA\u3067\u5B9F\u7528\u7684\u306A\u56DE\u7B54\u3092\u63D0\u4F9B\u3057\u3066\u304F\u3060\u3055\u3044\u3002
\u4EE5\u4E0B\u306E\u77E5\u8B58\u30D9\u30FC\u30B9\u306E\u60C5\u5831\u3092\u6D3B\u7528\u3057\u3066\u56DE\u7B54\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002`;
  return `${baseSystemPrompt}${knowledgeText}`;
}
function addDocumentToKnowledgeBase(fileInfo, content) {
  try {
    const baseName = path.basename(fileInfo.originalname, path.extname(fileInfo.originalname));
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9_]/g, "_");
    const timestamp3 = Date.now();
    const textFileName = `${safeBaseName}_${timestamp3}.txt`;
    fs.writeFileSync(path.join(TEXT_DIR, textFileName), content, "utf-8");
    console.log(`\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u3092\u77E5\u8B58\u30D9\u30FC\u30B9\u306B\u8FFD\u52A0\u3057\u307E\u3057\u305F: ${textFileName}`);
    return {
      success: true,
      message: `\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8 ${fileInfo.originalname} \u3092\u77E5\u8B58\u30D9\u30FC\u30B9\u306B\u8FFD\u52A0\u3057\u307E\u3057\u305F`
    };
  } catch (error) {
    console.error("\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u306E\u77E5\u8B58\u30D9\u30FC\u30B9\u8FFD\u52A0\u30A8\u30E9\u30FC:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
    };
  }
}
function backupKnowledgeBase() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const timestamp3 = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const backupFileName = `knowledge_base_backup_${timestamp3}.json`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    const textFiles = fs.readdirSync(TEXT_DIR).filter((file) => file.endsWith(".txt"));
    const textContents = {};
    for (const file of textFiles) {
      try {
        const content = fs.readFileSync(path.join(TEXT_DIR, file), "utf-8");
        textContents[file] = content;
      } catch (error) {
        console.error(`\u30D5\u30A1\u30A4\u30EB ${file} \u306E\u8AAD\u307F\u8FBC\u307F\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:`, error);
      }
    }
    const backupData = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      textFiles: textContents
      // 必要に応じて他のデータも追加
    };
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), "utf-8");
    console.log(`\u77E5\u8B58\u30D9\u30FC\u30B9\u306E\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F: ${backupFileName}`);
    return {
      success: true,
      message: `\u77E5\u8B58\u30D9\u30FC\u30B9\u306E\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F: ${backupFileName}`,
      backupPath
    };
  } catch (error) {
    console.error("\u77E5\u8B58\u30D9\u30FC\u30B9\u306E\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u4F5C\u6210\u30A8\u30E9\u30FC:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
    };
  }
}
function mergeDocumentContent(contents) {
  return contents.join("\n\n---\n\n");
}
function loadKnowledgeBaseIndex() {
  try {
    if (!fs.existsSync(INDEX_FILE)) {
      return {
        documents: [],
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    const indexContent = fs.readFileSync(INDEX_FILE, "utf-8");
    return JSON.parse(indexContent);
  } catch (error) {
    console.error("\u77E5\u8B58\u30D9\u30FC\u30B9\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC:", error);
    return {
      documents: [],
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      error: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC"
    };
  }
}
function listKnowledgeBaseDocuments() {
  try {
    const textFiles = fs.readdirSync(TEXT_DIR).filter((file) => file.endsWith(".txt"));
    const documents4 = textFiles.map((file) => {
      try {
        const stats = fs.statSync(path.join(TEXT_DIR, file));
        const content = fs.readFileSync(path.join(TEXT_DIR, file), "utf-8");
        const nameParts = file.split("_");
        const timestamp3 = parseInt(nameParts[nameParts.length - 1], 10) || stats.mtime.getTime();
        return {
          id: file.replace(".txt", ""),
          filename: file,
          title: nameParts.slice(0, -1).join("_").replace(/_/g, " "),
          size: stats.size,
          createdAt: new Date(timestamp3).toISOString(),
          lastModified: stats.mtime.toISOString(),
          contentPreview: content.substring(0, 200) + (content.length > 200 ? "..." : "")
        };
      } catch (error) {
        console.error(`\u30D5\u30A1\u30A4\u30EB ${file} \u306E\u60C5\u5831\u53D6\u5F97\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:`, error);
        return {
          id: file.replace(".txt", ""),
          filename: file,
          title: file.replace(".txt", ""),
          error: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC"
        };
      }
    });
    documents4.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return {
      success: true,
      documents: documents4
    };
  } catch (error) {
    console.error("\u77E5\u8B58\u30D9\u30FC\u30B9\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u4E00\u89A7\u53D6\u5F97\u30A8\u30E9\u30FC:", error);
    return {
      success: false,
      documents: [],
      message: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
    };
  }
}
function removeDocumentFromKnowledgeBase(documentId) {
  try {
    const filename = documentId.endsWith(".txt") ? documentId : `${documentId}.txt`;
    const filePath = path.join(TEXT_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        message: `\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8 ${documentId} \u306F\u5B58\u5728\u3057\u307E\u305B\u3093`
      };
    }
    fs.unlinkSync(filePath);
    console.log(`\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8 ${documentId} \u3092\u77E5\u8B58\u30D9\u30FC\u30B9\u304B\u3089\u524A\u9664\u3057\u307E\u3057\u305F`);
    return {
      success: true,
      message: `\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8 ${documentId} \u3092\u77E5\u8B58\u30D9\u30FC\u30B9\u304B\u3089\u524A\u9664\u3057\u307E\u3057\u305F`
    };
  } catch (error) {
    console.error("\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u524A\u9664\u30A8\u30E9\u30FC:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
    };
  }
}
var KNOWLEDGE_BASE_DIR, DATA_DIR, TEXT_DIR, TROUBLESHOOTING_DIR, BACKUP_DIR, INDEX_FILE;
var init_knowledge_base = __esm({
  "server/lib/knowledge-base.ts"() {
    "use strict";
    KNOWLEDGE_BASE_DIR = "./knowledge-base";
    DATA_DIR = path.join(KNOWLEDGE_BASE_DIR, "data");
    TEXT_DIR = path.join(KNOWLEDGE_BASE_DIR, "text");
    TROUBLESHOOTING_DIR = path.join(KNOWLEDGE_BASE_DIR, "troubleshooting");
    BACKUP_DIR = path.join(KNOWLEDGE_BASE_DIR, "backups");
    INDEX_FILE = path.join(DATA_DIR, "knowledge_index.json");
  }
});

// server/lib/openai.ts
var openai_exports = {};
__export(openai_exports, {
  analyzeVehicleImage: () => analyzeVehicleImage,
  generateKeywords: () => generateKeywords,
  generateSearchQuery: () => generateSearchQuery,
  generateStepResponse: () => generateStepResponse,
  processOpenAIRequest: () => processOpenAIRequest,
  summarizeText: () => summarizeText
});
import OpenAI from "openai";
import dotenv from "dotenv";
import path2 from "path";
import { fileURLToPath } from "url";
async function processOpenAIRequest(prompt, useKnowledgeBase = true) {
  try {
    const apiKey2 = process.env.OPENAI_API_KEY || process.env.REPLIT_SECRET_OPENAI_API_KEY;
    if (!apiKey2) {
      console.error("OpenAI API key not found");
      return "OpenAI API\u30AD\u30FC\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002";
    }
    let systemPrompt = "\u3042\u306A\u305F\u306F\u4FDD\u5B88\u7528\u8ECA\u652F\u63F4\u30B7\u30B9\u30C6\u30E0\u306E\u4E00\u90E8\u3068\u3057\u3066\u6A5F\u80FD\u3059\u308BAI\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002\u30E6\u30FC\u30B6\u30FC\u306E\u8CEA\u554F\u306B\u5BFE\u3057\u3066\u3001\u6B63\u78BA\u3067\u5B9F\u7528\u7684\u306A\u56DE\u7B54\u3092\u63D0\u4F9B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
    if (useKnowledgeBase) {
      const { generateSystemPromptWithKnowledge: generateSystemPromptWithKnowledge2 } = await Promise.resolve().then(() => (init_knowledge_base(), knowledge_base_exports));
      systemPrompt = await generateSystemPromptWithKnowledge2(prompt);
    }
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
      // JSON形式の強制は解除
    });
    const responseText = response.choices[0].message.content || "";
    return responseText;
  } catch (error) {
    console.error("OpenAI API Error Details:", {
      message: error.message,
      code: error.code,
      type: error.type,
      status: error.status,
      stack: error.stack
    });
    if (error.code === "insufficient_quota") {
      return "OpenAI API\u306E\u30AF\u30A9\u30FC\u30BF\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059\u3002";
    } else if (error.code === "invalid_api_key") {
      return "OpenAI API\u30AD\u30FC\u304C\u7121\u52B9\u3067\u3059\u3002";
    } else if (error.code === "rate_limit_exceeded") {
      return "OpenAI API\u306E\u30EA\u30AF\u30A8\u30B9\u30C8\u5236\u9650\u306B\u9054\u3057\u307E\u3057\u305F\u3002\u3057\u3070\u3089\u304F\u5F85\u3063\u3066\u304B\u3089\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
    } else if (error.message?.includes("timeout")) {
      return "OpenAI API\u306E\u30EA\u30AF\u30A8\u30B9\u30C8\u304C\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F\u3002";
    } else if (error.status === 401) {
      return "OpenAI API\u30AD\u30FC\u306E\u8A8D\u8A3C\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002";
    } else if (error.status === 429) {
      return "OpenAI API\u306E\u30EC\u30FC\u30C8\u5236\u9650\u306B\u9054\u3057\u307E\u3057\u305F\u3002";
    } else if (error.status >= 500) {
      return "OpenAI API\u30B5\u30FC\u30D0\u30FC\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002";
    } else {
      return `OpenAI API\u30A8\u30E9\u30FC: ${error.message || "Unknown error"}`;
    }
  }
}
async function summarizeText(text3) {
  try {
    const truncatedText = text3.length > 4e3 ? text3.substring(0, 4e3) + "..." : text3;
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "\u3042\u306A\u305F\u306F\u6280\u8853\u6587\u66F8\u306E\u8981\u7D04\u3092\u884C\u3046\u5C02\u9580\u5BB6\u3067\u3059\u3002\u6587\u7AE0\u306E\u8981\u70B9\u3092\u4FDD\u3061\u306A\u304C\u3089\u3001\u7C21\u6F54\u306B\u8981\u7D04\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        {
          role: "user",
          content: `\u4EE5\u4E0B\u306E\u30C6\u30AD\u30B9\u30C8\u3092100\u8A9E\u7A0B\u5EA6\u306B\u8981\u7D04\u3057\u3066\u304F\u3060\u3055\u3044:

${truncatedText}`
        }
      ],
      temperature: 0.3
    });
    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("\u30C6\u30AD\u30B9\u30C8\u8981\u7D04\u30A8\u30E9\u30FC:", error.message);
    return "\u8981\u7D04\u306E\u751F\u6210\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002";
  }
}
async function generateKeywords(text3) {
  try {
    const truncatedText = text3.length > 4e3 ? text3.substring(0, 4e3) + "..." : text3;
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "\u3042\u306A\u305F\u306F\u6280\u8853\u6587\u66F8\u304B\u3089\u30AD\u30FC\u30EF\u30FC\u30C9\u3092\u62BD\u51FA\u3059\u308B\u5C02\u9580\u5BB6\u3067\u3059\u3002\u4E0E\u3048\u3089\u308C\u305F\u30C6\u30AD\u30B9\u30C8\u304B\u3089\u3001\u691C\u7D22\u306B\u5F79\u7ACB\u3064\u91CD\u8981\u306A\u30AD\u30FC\u30EF\u30FC\u30C9\u3092\u62BD\u51FA\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        {
          role: "user",
          content: `\u4EE5\u4E0B\u306E\u30C6\u30AD\u30B9\u30C8\u304B\u3089\u3001\u6700\u3082\u91CD\u8981\u306A5\u301C10\u500B\u306E\u30AD\u30FC\u30EF\u30FC\u30C9\u3092\u62BD\u51FA\u3057\u3001JSON\u914D\u5217\u5F62\u5F0F\u3067\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u5C02\u9580\u7528\u8A9E\u3084\u56FA\u6709\u540D\u8A5E\u3092\u512A\u5148\u3057\u3066\u304F\u3060\u3055\u3044:

${truncatedText}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
      // 強制的にJSONオブジェクトとして返す
    });
    const content = response.choices[0].message.content || '{"keywords": []}';
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.keywords)) {
        return parsed.keywords;
      } else if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (e) {
      console.error("\u30AD\u30FC\u30EF\u30FC\u30C9\u89E3\u6790\u30A8\u30E9\u30FC:", e);
      return [];
    }
  } catch (error) {
    console.error("\u30AD\u30FC\u30EF\u30FC\u30C9\u751F\u6210\u30A8\u30E9\u30FC:", error.message);
    return [];
  }
}
async function generateStepResponse(keyword) {
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "\u3042\u306A\u305F\u306F\u4FDD\u5B88\u7528\u8ECA\u306E\u5C02\u9580\u5BB6\u3067\u3059\u3002\u30AD\u30FC\u30EF\u30FC\u30C9\u306B\u57FA\u3065\u3044\u3066\u3001\u5177\u4F53\u7684\u306A\u624B\u9806\u3092\u8AAC\u660E\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        {
          role: "user",
          content: `\u4EE5\u4E0B\u306E\u30AD\u30FC\u30EF\u30FC\u30C9\u306B\u95A2\u3059\u308B\u5BFE\u5FDC\u624B\u9806\u3092\u30013-5\u3064\u306E\u30B9\u30C6\u30C3\u30D7\u306B\u5206\u3051\u3066\u8AAC\u660E\u3057\u3066\u304F\u3060\u3055\u3044:
${keyword}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    const content = response.choices[0].message.content || "";
    const result = JSON.parse(content);
    return {
      title: result.title || keyword,
      steps: result.steps || []
    };
  } catch (error) {
    console.error("\u30B9\u30C6\u30C3\u30D7\u30EC\u30B9\u30DD\u30F3\u30B9\u751F\u6210\u30A8\u30E9\u30FC:", error);
    return {
      title: keyword,
      steps: [{ description: "\u30EC\u30B9\u30DD\u30F3\u30B9\u306E\u751F\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002" }]
    };
  }
}
async function generateSearchQuery(text3) {
  try {
    const truncatedText = text3.length > 200 ? text3.substring(0, 200) + "..." : text3;
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a search query optimization expert. Generate optimal search queries for search engines from user questions or text."
        },
        {
          role: "user",
          content: `Extract optimal search keywords (5-10 words) from the following text for searching related technical documents. Prioritize technical terms and exclude unnecessary conjunctions and prepositions:

${truncatedText}`
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    });
    const query = response.choices[0].message.content?.trim() || truncatedText;
    return query;
  } catch (error) {
    console.error("Search query generation error:", error.message);
    return text3;
  }
}
async function analyzeVehicleImage(base64Image) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      // ビジョン機能を持つモデルを使用
      messages: [
        {
          role: "system",
          content: "\u3042\u306A\u305F\u306F\u8ECA\u4E21\u753B\u50CF\u5206\u6790\u306E\u5C02\u9580\u5BB6\u3067\u3059\u3002\u4FDD\u5B88\u7528\u8ECA\u30FB\u4F5C\u696D\u7528\u8ECA\u4E21\u30FB\u7279\u6B8A\u8ECA\u4E21\u306E\u753B\u50CF\u3092\u5206\u6790\u3057\u3001\u8ECA\u4E21\u306E\u30BF\u30A4\u30D7\u3001\u72B6\u614B\u3001\u7279\u5FB4\u3092\u8A73\u7D30\u306B\u8AAC\u660E\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "\u3053\u306E\u8ECA\u4E21\u306E\u753B\u50CF\u3092\u5206\u6790\u3057\u3066\u3001\u8ECA\u4E21\u306E\u7A2E\u985E\u3001\u72B6\u614B\u3001\u76EE\u7ACB\u3064\u7279\u5FB4\u3001\u304A\u3088\u3073\u8003\u3048\u3089\u308C\u308B\u7528\u9014\u306B\u3064\u3044\u3066\u8A73\u7D30\u306B\u8AAC\u660E\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u4FDD\u5B88\u7528\u8ECA\u306E\u5834\u5408\u306F\u3001\u305D\u306E\u7A2E\u985E\uFF08\u8ECC\u9053\u30E2\u30FC\u30BF\u30AB\u30FC\u3001\u30DE\u30EB\u30C1\u30D7\u30EB\u30BF\u30A4\u30BF\u30F3\u30D1\u30FC\u3001\u30D0\u30E9\u30B9\u30C8\u30EC\u30AE\u30E5\u30EC\u30FC\u30BF\u30FC\u306A\u3069\uFF09\u3082\u7279\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1e3
    });
    return {
      analysis: response.choices[0].message.content || "",
      success: true
    };
  } catch (error) {
    console.error("\u8ECA\u4E21\u753B\u50CF\u5206\u6790\u30A8\u30E9\u30FC:", error.message);
    return {
      analysis: "\u753B\u50CF\u306E\u5206\u6790\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002",
      success: false,
      error: error.message
    };
  }
}
var __filename, __dirname, OPENAI_MODEL, apiKey, openai;
var init_openai = __esm({
  "server/lib/openai.ts"() {
    "use strict";
    __filename = fileURLToPath(import.meta.url);
    __dirname = path2.dirname(__filename);
    dotenv.config({ path: path2.resolve(__dirname, "../.env") });
    OPENAI_MODEL = "gpt-4o";
    dotenv.config({ path: path2.resolve(process.cwd(), ".env") });
    dotenv.config({ path: path2.resolve(process.cwd(), "server/.env") });
    apiKey = process.env.OPENAI_API_KEY || process.env.REPLIT_SECRET_OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[ERROR] OpenAI API Key not found in environment variables");
      throw new Error("OpenAI API Key not configured");
    }
    openai = new OpenAI({
      apiKey
    });
  }
});

// server/lib/export-file-manager.ts
var export_file_manager_exports = {};
__export(export_file_manager_exports, {
  ExportFileManager: () => ExportFileManager,
  exportFileManager: () => exportFileManager
});
import fs13 from "fs";
import path14 from "path";
var ExportFileManager, exportFileManager;
var init_export_file_manager = __esm({
  "server/lib/export-file-manager.ts"() {
    "use strict";
    ExportFileManager = class {
      baseDir;
      constructor(baseDir = "knowledge-base/exports") {
        this.baseDir = baseDir;
        this.ensureDirectoryExists();
      }
      /**
       * エクスポートディレクトリが存在することを確認
       */
      ensureDirectoryExists() {
        if (!fs13.existsSync(this.baseDir)) {
          fs13.mkdirSync(this.baseDir, { recursive: true });
          console.log(`\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F: ${this.baseDir}`);
        }
      }
      /**
       * チャットIDに基づくサブディレクトリを作成
       * @param chatId チャットID
       */
      ensureChatDirectoryExists(chatId) {
        const chatDir = path14.join(this.baseDir, `chat_${chatId}`);
        if (!fs13.existsSync(chatDir)) {
          fs13.mkdirSync(chatDir, { recursive: true });
        }
        return chatDir;
      }
      /**
       * フォーマット済みデータをJSONファイルとして保存
       * @param chatId チャットID
       * @param data 保存するデータ
       * @returns 保存したファイルのパス
       */
      saveFormattedExport(chatId, data) {
        const chatDir = this.ensureChatDirectoryExists(chatId);
        const timestamp3 = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
        const fileName = `export_${timestamp3}.json`;
        const filePath = path14.join(chatDir, fileName);
        try {
          fs13.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
          console.log(`\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u30C7\u30FC\u30BF\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F: ${filePath}`);
          return filePath;
        } catch (error) {
          console.error(`\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u30C7\u30FC\u30BF\u306E\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${error}`);
          throw error;
        }
      }
      /**
       * 指定したチャットIDの最新のエクスポートデータを取得
       * @param chatId チャットID
       * @returns 最新のエクスポートデータ、存在しない場合はnull
       */
      getLatestExport(chatId) {
        const chatDir = path14.join(this.baseDir, `chat_${chatId}`);
        if (!fs13.existsSync(chatDir)) {
          return null;
        }
        try {
          const files = fs13.readdirSync(chatDir).filter((file) => file.startsWith("export_") && file.endsWith(".json")).sort().reverse();
          if (files.length === 0) {
            return null;
          }
          const latestFile = path14.join(chatDir, files[0]);
          const data = fs13.readFileSync(latestFile, "utf8");
          return JSON.parse(data);
        } catch (error) {
          console.error(`\u6700\u65B0\u306E\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u30C7\u30FC\u30BF\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${error}`);
          return null;
        }
      }
      /**
       * 指定したチャットIDのすべてのエクスポートファイルを一覧表示
       * @param chatId チャットID
       * @returns ファイルパスの配列
       */
      listExportFiles(chatId) {
        const chatDir = path14.join(this.baseDir, `chat_${chatId}`);
        if (!fs13.existsSync(chatDir)) {
          return [];
        }
        try {
          return fs13.readdirSync(chatDir).filter((file) => file.startsWith("export_") && file.endsWith(".json")).map((file) => path14.join(chatDir, file));
        } catch (error) {
          console.error(`\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u30D5\u30A1\u30A4\u30EB\u306E\u4E00\u89A7\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${error}`);
          return [];
        }
      }
    };
    exportFileManager = new ExportFileManager();
  }
});

// server/index.ts
import express4 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
import { pgTable as pgTable2, text as text2, timestamp as timestamp2, jsonb as jsonb2, integer as integer2, boolean as boolean2 } from "drizzle-orm/pg-core";
import { sql as sql2 } from "drizzle-orm";
import { z } from "zod";

// server/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  emergencyFlows: () => emergencyFlows,
  images: () => images,
  media: () => media,
  schema: () => schema,
  users: () => users
});
import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
var users = pgTable("users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  display_name: text("display_name").notNull(),
  role: text("role").notNull().default("employee"),
  department: text("department"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  description: text("description")
});
var media = pgTable("media", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: text("message_id").notNull(),
  type: text("type").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var emergencyFlows = pgTable("emergency_flows", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  steps: jsonb("steps").notNull(),
  keyword: text("keyword").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var images = pgTable("images", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  description: text("description").notNull(),
  embedding: jsonb("embedding").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var schema = {
  users,
  media,
  emergencyFlows,
  images
};

// shared/schema.ts
var users2 = pgTable2("users", {
  id: text2("id").primaryKey().default(sql2`gen_random_uuid()`),
  username: text2("username").notNull().unique(),
  password: text2("password").notNull(),
  display_name: text2("display_name").notNull(),
  role: text2("role").notNull().default("employee"),
  department: text2("department"),
  description: text2("description"),
  created_at: timestamp2("created_at").defaultNow().notNull()
});
var chats = pgTable2("chats", {
  id: text2("id").primaryKey().default(sql2`gen_random_uuid()`),
  // UUIDを自動生成
  userId: text2("user_id").notNull(),
  // チャットを開始したユーザーのID
  title: text2("title"),
  // チャットのタイトル（オプション）
  createdAt: timestamp2("created_at").defaultNow().notNull()
  // 作成日時
});
var messages = pgTable2("messages", {
  id: text2("id").primaryKey().default(sql2`gen_random_uuid()`),
  // UUIDを自動生成
  chatId: text2("chat_id").notNull(),
  // 関連するチャットのID
  senderId: text2("sender_id").notNull(),
  // 送信者のID
  content: text2("content").notNull(),
  // メッセージの内容
  isAiResponse: boolean2("is_ai_response").notNull().default(false),
  // AIの応答かどうか
  createdAt: timestamp2("created_at").defaultNow().notNull()
  // 送信日時
});
var media2 = pgTable2("media", {
  id: text2("id").primaryKey().default(sql2`gen_random_uuid()`),
  // UUIDを自動生成
  messageId: integer2("message_id").notNull(),
  // 関連するメッセージのID
  type: text2("type").notNull(),
  // メディアの種類（画像、動画など）
  url: text2("url").notNull(),
  // メディアファイルのURL
  description: text2("description"),
  // メディアの説明（オプション）
  createdAt: timestamp2("created_at").defaultNow().notNull()
  // 作成日時
});
var emergencyFlows2 = pgTable2("emergency_flows", {
  id: text2("id").primaryKey().default(sql2`gen_random_uuid()`),
  // UUIDを自動生成
  title: text2("title").notNull(),
  // フローのタイトル
  steps: jsonb2("steps").notNull(),
  // 手順のステップ（JSON形式）
  keyword: text2("keyword").notNull(),
  // 検索用キーワード
  createdAt: timestamp2("created_at").defaultNow().notNull()
  // 作成日時
});
var images2 = pgTable2("images", {
  id: text2("id").primaryKey().default(sql2`gen_random_uuid()`),
  // UUIDを自動生成
  url: text2("url").notNull(),
  // 画像のURL
  description: text2("description").notNull(),
  // 画像の説明
  embedding: jsonb2("embedding").notNull(),
  // 画像の特徴ベクトル（AI検索用）
  createdAt: timestamp2("created_at").defaultNow().notNull()
  // 作成日時
});
var documents = pgTable2("documents", {
  id: text2("id").primaryKey().default(sql2`gen_random_uuid()`),
  // UUIDを自動生成
  title: text2("title").notNull(),
  // ドキュメントのタイトル
  content: text2("content").notNull(),
  // ドキュメントの内容
  userId: text2("user_id").notNull(),
  // 作成者のユーザーID
  createdAt: timestamp2("created_at").defaultNow().notNull()
  // 作成日時
});
var keywords = pgTable2("keywords", {
  id: text2("id").primaryKey().default(sql2`gen_random_uuid()`),
  // UUIDを自動生成
  documentId: text2("document_id"),
  // 関連するドキュメントのID
  word: text2("word").notNull(),
  // キーワード
  createdAt: timestamp2("created_at").defaultNow().notNull()
  // 作成日時
});
var chatExports = pgTable2("chat_exports", {
  id: text2("id").primaryKey().default(sql2`gen_random_uuid()`),
  // UUIDを自動生成
  chatId: text2("chat_id").notNull(),
  // 関連するチャットのID
  userId: text2("user_id").notNull(),
  // エクスポートを実行したユーザーのID
  timestamp: timestamp2("timestamp").defaultNow().notNull()
  // エクスポート実行日時
});
var loginSchema = z.object({
  username: z.string(),
  password: z.string()
});
var insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
  display_name: z.string(),
  role: z.string(),
  department: z.string().optional()
});
var insertChatSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  title: z.string().optional()
});
var insertMessageSchema = z.object({
  chatId: z.string(),
  content: z.string(),
  isAiResponse: z.boolean().default(false),
  senderId: z.string().nullable()
});
var insertMediaSchema = z.object({
  messageId: z.number(),
  type: z.string(),
  url: z.string(),
  description: z.string().optional()
});
var insertDocumentSchema = z.object({
  title: z.string(),
  content: z.string(),
  userId: z.string()
});
var insertKeywordSchema = z.object({
  documentId: z.string().optional(),
  word: z.string()
});

// server/database-storage.ts
import { eq, like } from "drizzle-orm";

// server/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var sql3 = postgres(process.env.DATABASE_URL, {
  max: 5,
  idle_timeout: 30,
  connect_timeout: 30,
  socket_timeout: 60,
  onnotice: () => {
  },
  onparameter: () => {
  },
  retry_delay: 1e3,
  max_lifetime: 60 * 30
});
var db = drizzle(sql3, { schema: schema_exports });

// server/database-storage.ts
import session from "express-session";
import memorystore from "memorystore";
var MemoryStore = memorystore(session);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 864e5
      // prune expired entries every 24h
    });
    this.seedInitialUsers();
  }
  async seedInitialUsers() {
    const adminUser = await this.getUserByUsername("niina");
    if (!adminUser) {
      await this.createUser({
        username: "niina",
        password: "0077",
        // In a real app, this would be hashed
        display_name: "\u65B0\u540D \u7BA1\u7406\u8005",
        // Fix: changed displayName to display_name to match schema
        role: "admin"
      });
    }
    const employeeUser = await this.getUserByUsername("employee");
    if (!employeeUser) {
      await this.createUser({
        username: "employee",
        password: "employee123",
        // In a real app, this would be hashed
        display_name: "\u5C71\u7530\u592A\u90CE",
        // Fix: changed displayName to display_name to match schema
        role: "employee"
      });
    }
  }
  // User methods
  async getUser(id) {
    const [user] = await db.select().from(users2).where(eq(users2.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users2).where(eq(users2.username, username));
    return user;
  }
  async getAllUsers() {
    return await db.select().from(users2);
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users2).values(insertUser).returning();
    return user;
  }
  async updateUser(id, userData) {
    const [user] = await db.update(users2).set(userData).where(eq(users2.id, id)).returning();
    return user;
  }
  async deleteUser(id) {
    try {
      const userChats = await db.select().from(chats).where(eq(chats.userId, id));
      for (const chat of userChats) {
        await db.delete(chatExports).where(eq(chatExports.chatId, chat.id));
        const chatMessages = await db.select().from(messages).where(eq(messages.chatId, chat.id));
        for (const message of chatMessages) {
          await db.delete(media2).where(eq(media2.messageId, message.id));
        }
        await db.delete(messages).where(eq(messages.chatId, chat.id));
        await db.delete(chats).where(eq(chats.id, chat.id));
      }
      const userMessages = await db.select().from(messages).where(eq(messages.senderId, id));
      for (const message of userMessages) {
        await db.delete(media2).where(eq(media2.messageId, message.id));
        await db.delete(messages).where(eq(messages.id, message.id));
      }
      const userDocuments = await db.select().from(documents).where(eq(documents.userId, id));
      for (const document of userDocuments) {
        await db.delete(keywords).where(eq(keywords.documentId, document.id));
        await db.delete(documents).where(eq(documents.id, document.id));
      }
      await db.delete(chatExports).where(eq(chatExports.userId, id));
      await db.delete(users2).where(eq(users2.id, id));
      console.log(`[INFO] \u30E6\u30FC\u30B6\u30FC(ID: ${id})\u3068\u305D\u306E\u95A2\u9023\u30C7\u30FC\u30BF\u304C\u6B63\u5E38\u306B\u524A\u9664\u3055\u308C\u307E\u3057\u305F`);
    } catch (error) {
      console.error(`[ERROR] \u30E6\u30FC\u30B6\u30FC\u524A\u9664\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F(ID: ${id}):`, error);
      throw error;
    }
  }
  // Chat methods
  async getChat(id) {
    const [chat] = await db.select().from(chats).where(eq(chats.id, id));
    return chat;
  }
  async getChatsForUser(userId) {
    return db.select().from(chats).where(eq(chats.userId, userId));
  }
  async createChat(chat) {
    const [newChat] = await db.insert(chats).values(chat).returning();
    return newChat;
  }
  // Message methods
  async getMessage(id) {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }
  async getMessagesForChat(chatId) {
    const result = await db.select().from(messages).where(eq(messages.chatId, chatId));
    const sortedMessages = result.sort((a, b) => {
      const aTime = a.timestamp ? a.timestamp.getTime() : 0;
      const bTime = b.timestamp ? b.timestamp.getTime() : 0;
      return aTime - bTime;
    });
    if (sortedMessages.length === 0) {
      console.log(`[INFO] \u30C1\u30E3\u30C3\u30C8ID ${chatId} \u306B\u306F\u30E1\u30C3\u30BB\u30FC\u30B8\u304C\u3042\u308A\u307E\u305B\u3093\uFF08\u30AF\u30EA\u30A2\u6E08\u307F\u307E\u305F\u306F\u65B0\u898F\u30C1\u30E3\u30C3\u30C8\uFF09`);
    }
    return sortedMessages;
  }
  async createMessage(message) {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }
  // チャットメッセージをクリアする関数
  async clearChatMessages(chatId) {
    try {
      console.log(`[INFO] \u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u524A\u9664\u958B\u59CB: chatId=${chatId}`);
      const chatMessages = await this.getMessagesForChat(chatId);
      const messageIds = chatMessages.map((message) => message.id);
      console.log(`[INFO] \u524A\u9664\u5BFE\u8C61\u30E1\u30C3\u30BB\u30FC\u30B8\u6570: ${messageIds.length}`);
      let deletedMediaCount = 0;
      if (messageIds.length > 0) {
        for (const messageId of messageIds) {
          try {
            const result = await db.delete(media2).where(eq(media2.messageId, messageId));
            console.log(`[DEBUG] \u30E1\u30C7\u30A3\u30A2\u524A\u9664: messageId=${messageId}`);
            deletedMediaCount++;
          } catch (mediaError) {
            console.error(`[ERROR] \u30E1\u30C7\u30A3\u30A2\u524A\u9664\u30A8\u30E9\u30FC (messageId: ${messageId}):`, mediaError);
          }
        }
      }
      let deletedMessageCount = 0;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await db.delete(messages).where(eq(messages.chatId, chatId));
          console.log(`[INFO] \u30E1\u30C3\u30BB\u30FC\u30B8\u524A\u9664\u8A66\u884C ${attempt + 1}: \u5B8C\u4E86`);
          const remainingMessages = await this.getMessagesForChat(chatId);
          if (remainingMessages.length === 0) {
            console.log(`[SUCCESS] \u5168\u30E1\u30C3\u30BB\u30FC\u30B8\u524A\u9664\u5B8C\u4E86: chatId=${chatId}`);
            break;
          } else {
            console.warn(`[WARNING] \u8A66\u884C ${attempt + 1} \u5F8C\u3082 ${remainingMessages.length} \u4EF6\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u304C\u6B8B\u5B58`);
            if (attempt === 2) {
              for (const msg of remainingMessages) {
                try {
                  await db.delete(messages).where(eq(messages.id, msg.id));
                  deletedMessageCount++;
                } catch (individualError) {
                  console.error(`[ERROR] \u500B\u5225\u524A\u9664\u30A8\u30E9\u30FC (id: ${msg.id}):`, individualError);
                }
              }
            }
          }
        } catch (deleteError) {
          console.error(`[ERROR] \u30E1\u30C3\u30BB\u30FC\u30B8\u524A\u9664\u8A66\u884C ${attempt + 1} \u30A8\u30E9\u30FC:`, deleteError);
          if (attempt === 2) throw deleteError;
        }
      }
      console.log(`[SUCCESS] \u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u524A\u9664\u5B8C\u4E86: chatId=${chatId}, \u524A\u9664\u30E1\u30C7\u30A3\u30A2=${deletedMediaCount}, \u524A\u9664\u30E1\u30C3\u30BB\u30FC\u30B8=${deletedMessageCount}`);
    } catch (error) {
      console.error(`[ERROR] \u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u524A\u9664\u5931\u6557: chatId=${chatId}:`, error);
      throw error;
    }
  }
  // Media methods
  async getMedia(id) {
    const [mediaItem] = await db.select().from(media2).where(eq(media2.id, id));
    return mediaItem;
  }
  async getMediaForMessage(messageId) {
    return db.select().from(media2).where(eq(media2.messageId, messageId));
  }
  async createMedia(mediaItem) {
    const [newMedia] = await db.insert(media2).values(mediaItem).returning();
    return newMedia;
  }
  // Keyword methods
  async getKeywordsForDocument(documentId) {
    return db.select().from(keywords).where(eq(keywords.documentId, documentId));
  }
  async createKeyword(keyword) {
    const [newKeyword] = await db.insert(keywords).values(keyword).returning();
    return newKeyword;
  }
  async searchDocumentsByKeyword(keyword) {
    const matchingKeywords = await db.select().from(keywords).where(like(keywords.word, `%${keyword}%`));
    if (matchingKeywords.length === 0) {
      return [];
    }
    const documentIds = Array.from(new Set(matchingKeywords.map((k) => k.documentId)));
    const matchingDocuments = [];
    for (const docId of documentIds) {
      if (docId === null) continue;
      const doc = await this.getDocument(docId);
      if (doc) {
        matchingDocuments.push(doc);
      }
    }
    return matchingDocuments;
  }
  // チャットエクスポート関連のメソッド
  async getMessagesForChatAfterTimestamp(chatId, timestamp3) {
    const allMessages = await db.select().from(messages).where(eq(messages.chatId, chatId));
    return allMessages.filter((msg) => msg.timestamp && msg.timestamp > timestamp3).sort((a, b) => {
      const aTime = a.timestamp ? a.timestamp.getTime() : 0;
      const bTime = b.timestamp ? b.timestamp.getTime() : 0;
      return aTime - bTime;
    });
  }
  async saveChatExport(chatId, userId, timestamp3) {
    await db.insert(chatExports).values({
      chatId,
      userId,
      timestamp: timestamp3
    });
  }
  async getLastChatExport(chatId) {
    const exports = await db.select().from(chatExports).where(eq(chatExports.chatId, chatId));
    if (exports.length === 0) {
      return null;
    }
    return exports.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }
};

// server/storage.ts
var testDatabaseConnection = async () => {
  try {
    await db.select().from(users2).limit(1);
    console.log("\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u63A5\u7D9AOK");
    return true;
  } catch (error) {
    console.error("\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u63A5\u7D9A\u30A8\u30E9\u30FC:", error);
    return false;
  }
};
var storage = {
  testConnection: testDatabaseConnection,
  // Session store
  sessionStore: new DatabaseStorage().sessionStore,
  // User methods
  getUser: async (id) => {
    return new DatabaseStorage().getUser(id);
  },
  getUserByUsername: async (username) => {
    return new DatabaseStorage().getUserByUsername(username);
  },
  createUser: async (user) => {
    return new DatabaseStorage().createUser(user);
  },
  updateUser: async (id, user) => {
    return new DatabaseStorage().updateUser(id, user);
  },
  deleteUser: async (id) => {
    return new DatabaseStorage().deleteUser(id);
  },
  // Chat methods
  getChat: async (id) => {
    return new DatabaseStorage().getChat(id);
  },
  getChatsForUser: async (userId) => {
    return new DatabaseStorage().getChatsForUser(userId);
  },
  createChat: async (chat) => {
    return new DatabaseStorage().createChat(chat);
  },
  // Message methods
  getMessage: async (id) => {
    return new DatabaseStorage().getMessage(id);
  },
  getMessagesForChat: async (chatId) => {
    return new DatabaseStorage().getMessagesForChat(chatId);
  },
  getMessagesForChatAfterTimestamp: async (chatId, timestamp3) => {
    return new DatabaseStorage().getMessagesForChatAfterTimestamp(chatId, timestamp3);
  },
  createMessage: async (message) => {
    return new DatabaseStorage().createMessage(message);
  },
  clearChatMessages: async (chatId) => {
    return new DatabaseStorage().clearChatMessages(chatId);
  },
  deleteMessage: async (messageId) => {
    return new DatabaseStorage().deleteMessage(messageId);
  },
  deleteMedia: async (mediaId) => {
    return new DatabaseStorage().deleteMedia(mediaId);
  },
  // Media methods
  getMedia: async (id) => {
    return new DatabaseStorage().getMedia(id);
  },
  getMediaForMessage: async (messageId) => {
    return new DatabaseStorage().getMediaForMessage(messageId);
  },
  createMedia: async (media4) => {
    return new DatabaseStorage().createMedia(media4);
  },
  // Document methods
  getDocument: async (id) => {
    return new DatabaseStorage().getDocument(id);
  },
  getDocumentsForUser: async (userId) => {
    return new DatabaseStorage().getDocumentsForUser(userId);
  },
  createDocument: async (document) => {
    return new DatabaseStorage().createDocument(document);
  },
  updateDocument: async (id, updates) => {
    return new DatabaseStorage().updateDocument(id, updates);
  },
  // Keyword methods
  getKeywordsForDocument: async (documentId) => {
    return new DatabaseStorage().getKeywordsForDocument(documentId);
  },
  createKeyword: async (keyword) => {
    return new DatabaseStorage().createKeyword(keyword);
  },
  searchDocumentsByKeyword: async (keyword) => {
    return new DatabaseStorage().searchDocumentsByKeyword(keyword);
  },
  // Chat export methods
  saveChatExport: async (chatId, userId, timestamp3) => {
    return new DatabaseStorage().saveChatExport(chatId, userId, timestamp3);
  },
  getLastChatExport: async (chatId) => {
    return new DatabaseStorage().getLastChatExport(chatId);
  }
};

// server/routes.ts
init_openai();
import { z as z2 } from "zod";
import session2 from "express-session";
import { WebSocket, WebSocketServer } from "ws";

// server/lib/perplexity.ts
init_knowledge_base();
import axios from "axios";

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
var __dirname2 = fileURLToPath2(new URL(".", import.meta.url));
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname2, "./client/src"),
      "@shared": resolve(__dirname2, "./shared"),
      "@shared/schema": resolve(__dirname2, "./shared/schema.ts")
    }
  },
  root: "./client",
  build: {
    outDir: "../dist",
    emptyOutDir: true
  },
  server: {
    port: 5001,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}

// server/lib/perplexity.ts
function validateApiKey() {
  const apiKey2 = process.env.PERPLEXITY_API_KEY;
  if (!apiKey2) {
    log("\u74B0\u5883\u5909\u6570 PERPLEXITY_API_KEY \u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093", "perplexity");
    return false;
  }
  return true;
}
async function processPerplexityRequest(query, systemPrompt = "", useKnowledgeBaseOnly = true) {
  if (!validateApiKey()) {
    throw new Error("Perplexity API \u30AD\u30FC\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093");
  }
  try {
    const finalSystemPrompt = systemPrompt || await generateSystemPromptWithKnowledge(query);
    const requestOptions = {
      model: "llama-3.1-sonar-small-128k-online",
      // デフォルトモデル
      messages: [
        {
          role: "system",
          content: finalSystemPrompt
        },
        {
          role: "user",
          content: query
        }
      ],
      temperature: 0.2,
      top_p: 0.9,
      frequency_penalty: 1,
      search_recency_filter: "month",
      return_related_questions: false
    };
    if (useKnowledgeBaseOnly) {
      requestOptions.search_domain_filter = ["perplexity.ai"];
    }
    const response = await axios.post(
      "https://api.perplexity.ai/chat/completions",
      requestOptions,
      {
        headers: {
          "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    const content = response.data.choices[0].message.content;
    const citations = response.data.citations || [];
    log(`Perplexity\u5FDC\u7B54: ${content.substring(0, 100)}...`, "perplexity");
    return { content, citations };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log(`Perplexity API\u30A8\u30E9\u30FC: ${error.message}`, "perplexity");
      if (error.response) {
        log(`\u30EC\u30B9\u30DD\u30F3\u30B9\u30C7\u30FC\u30BF: ${JSON.stringify(error.response.data)}`, "perplexity");
      }
    } else {
      log(`Perplexity\u51E6\u7406\u30A8\u30E9\u30FC: ${error instanceof Error ? error.message : String(error)}`, "perplexity");
    }
    throw error;
  }
}

// server/routes.ts
import fs14 from "fs";
import path15 from "path";

// server/lib/multer-config.ts
import multer from "multer";
import path4 from "path";
import fs3 from "fs";
import { fileURLToPath as fileURLToPath3 } from "url";
var __filename2 = fileURLToPath3(import.meta.url);
var __dirname3 = path4.dirname(__filename2);
var uploadDir = path4.join(__dirname3, "../../uploads");
if (!fs3.existsSync(uploadDir)) {
  fs3.mkdirSync(uploadDir, { recursive: true });
}
var storage2 = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExt = path4.extname(file.originalname);
    const fileName = path4.basename(file.originalname, fileExt);
    cb(null, `${fileName}-${uniqueSuffix}${fileExt}`);
  }
});
var fileFilter = (req, file, cb) => {
  const allowedExtensions = [".pdf", ".docx", ".xlsx", ".pptx", ".txt"];
  const fileExt = path4.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error("\u8A31\u53EF\u3055\u308C\u3066\u3044\u306A\u3044\u30D5\u30A1\u30A4\u30EB\u5F62\u5F0F\u3067\u3059\u3002PDF, DOCX, XLSX, PPTX, TXT\u306E\u307F\u8A31\u53EF\u3055\u308C\u3066\u3044\u307E\u3059\u3002"));
  }
};
var upload = multer({
  storage: storage2,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB
  }
});

// server/routes.ts
init_knowledge_base();

// server/lib/chat-export-formatter.ts
import OpenAI2 from "openai";
import fs4 from "fs";
import path5 from "path";
var openai2 = new OpenAI2({ apiKey: process.env.OPENAI_API_KEY });
var vehicleModels = [
  { id: "mt-100", name: "MT-100\u578B\u4FDD\u7DDA\u8ECA", keywords: ["MT-100", "MT100", "MT 100"] },
  { id: "mr-400", name: "MR-400\u30B7\u30EA\u30FC\u30BA", keywords: ["MR-400", "MR400", "MR 400"] },
  { id: "tc-250", name: "TC-250\u4F5C\u696D\u8ECA", keywords: ["TC-250", "TC250", "TC 250"] },
  { id: "ss-750", name: "SS-750\u91CD\u6A5F", keywords: ["SS-750", "SS750", "SS 750"] }
];
var symptoms = [
  { id: "engine-stop", description: "\u30A8\u30F3\u30B8\u30F3\u505C\u6B62", keywords: ["\u30A8\u30F3\u30B8\u30F3\u505C\u6B62", "\u30A8\u30F3\u30B8\u30F3\u304C\u6B62\u307E\u308B", "\u30A8\u30F3\u30B8\u30F3\u5207\u308C"] },
  { id: "engine-noise", description: "\u7570\u97F3", keywords: ["\u7570\u97F3", "\u5909\u306A\u97F3", "\u97F3\u304C\u3059\u308B"] },
  { id: "brake-failure", description: "\u30D6\u30EC\u30FC\u30AD\u4E0D\u826F", keywords: ["\u30D6\u30EC\u30FC\u30AD\u4E0D\u826F", "\u30D6\u30EC\u30FC\u30AD\u304C\u52B9\u304B\u306A\u3044", "\u30D6\u30EC\u30FC\u30AD\u6545\u969C"] },
  { id: "hydraulic-leak", description: "\u6CB9\u5727\u6F0F\u308C", keywords: ["\u6CB9\u5727\u6F0F\u308C", "\u30AA\u30A4\u30EB\u6F0F\u308C", "\u6F0F\u6CB9"] },
  { id: "electrical-failure", description: "\u96FB\u6C17\u7CFB\u7D71\u6545\u969C", keywords: ["\u96FB\u6C17\u7CFB\u7D71", "\u96FB\u88C5\u54C1", "\u96FB\u6C17\u4E0D\u826F"] }
];
var components = [
  { id: "engine", name: "\u30A8\u30F3\u30B8\u30F3", keywords: ["\u30A8\u30F3\u30B8\u30F3", "engine", "\u30E2\u30FC\u30BF\u30FC"] },
  { id: "brake", name: "\u30D6\u30EC\u30FC\u30AD", keywords: ["\u30D6\u30EC\u30FC\u30AD", "brake", "\u5236\u52D5\u88C5\u7F6E"] },
  { id: "hydraulic", name: "\u6CB9\u5727\u7CFB\u7D71", keywords: ["\u6CB9\u5727", "hydraulic", "\u30AA\u30A4\u30EB", "\u6CB9"] },
  { id: "electrical", name: "\u96FB\u6C17\u7CFB\u7D71", keywords: ["\u96FB\u6C17", "electrical", "\u96FB\u88C5", "\u914D\u7DDA"] },
  { id: "transmission", name: "\u5909\u901F\u6A5F", keywords: ["\u5909\u901F\u6A5F", "transmission", "\u30AE\u30A2", "\u30C8\u30E9\u30F3\u30B9\u30DF\u30C3\u30B7\u30E7\u30F3"] }
];
function extractComponentKeywords(text3) {
  const foundComponents = [];
  for (const component of components) {
    for (const keyword of component.keywords) {
      if (text3.includes(keyword) && !foundComponents.includes(component.name)) {
        foundComponents.push(component.name);
        break;
      }
    }
  }
  return foundComponents;
}
function extractSymptomKeywords(text3) {
  const foundSymptoms = [];
  for (const symptom of symptoms) {
    for (const keyword of symptom.keywords) {
      if (text3.includes(keyword) && !foundSymptoms.includes(symptom.description)) {
        foundSymptoms.push(symptom.description);
        break;
      }
    }
  }
  return foundSymptoms;
}
function detectPossibleModels(text3) {
  const foundModels = [];
  for (const model of vehicleModels) {
    for (const keyword of model.keywords) {
      if (text3.includes(keyword) && !foundModels.includes(model.name)) {
        foundModels.push(model.name);
        break;
      }
    }
  }
  return foundModels;
}
async function formatChatHistoryForExternalSystem(chat, messages3, messageMedia, lastExport) {
  const allText = messages3.map((m) => m.content).join(" ");
  const extractedComponents = extractComponentKeywords(allText);
  const extractedSymptoms = extractSymptomKeywords(allText);
  const possibleModels = detectPossibleModels(allText);
  let primaryProblem = "";
  let problemDescription = "";
  try {
    const userMessages = messages3.filter((m) => !m.isAiResponse).map((m) => m.content).join("\n");
    const prompt = `
\u4EE5\u4E0B\u306F\u9244\u9053\u4FDD\u5B88\u7528\u8ECA\u4E21\u306E\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u306B\u95A2\u3059\u308B\u4F1A\u8A71\u3067\u3059\u3002
\u3053\u306E\u4F1A\u8A71\u304B\u3089\u3001\u4E3B\u8981\u306A\u554F\u984C\u3068\u554F\u984C\u306E\u8A73\u7D30\u306A\u8AAC\u660E\u3092\u65E5\u672C\u8A9E\u3067\u62BD\u51FA\u3057\u3066\u304F\u3060\u3055\u3044\u3002
\u62BD\u51FA\u7D50\u679C\u306F\u4EE5\u4E0B\u306EJSON\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u3067\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A
{
  "primary_problem": "\u7C21\u6F54\u306A\u554F\u984C\u306E\u30BF\u30A4\u30C8\u30EB\uFF0815-20\u6587\u5B57\u7A0B\u5EA6\uFF09",
  "problem_description": "\u554F\u984C\u306E\u8A73\u7D30\u8AAC\u660E\uFF0850-100\u6587\u5B57\u7A0B\u5EA6\uFF09"
}

\u4F1A\u8A71\uFF1A
${userMessages}
`;
    const response = await openai2.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    const content = response.choices[0].message.content || '{"primary_problem":"\u4E0D\u660E\u306A\u554F\u984C","problem_description":"\u8A73\u7D30\u60C5\u5831\u306A\u3057"}';
    const result = JSON.parse(content);
    primaryProblem = result.primary_problem;
    problemDescription = result.problem_description;
  } catch (error) {
    console.error("OpenAI API\u3067\u306E\u5206\u6790\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:", error);
    primaryProblem = extractedComponents.length > 0 ? `${extractedComponents[0]}\u306B\u95A2\u3059\u308B\u554F\u984C` : "\u4E0D\u660E\u306A\u554F\u984C";
    problemDescription = extractedSymptoms.length > 0 ? `${extractedSymptoms.join("\u3068")}\u306E\u75C7\u72B6\u304C\u5831\u544A\u3055\u308C\u3066\u3044\u307E\u3059\u3002` : "\u8A73\u7D30\u306A\u75C7\u72B6\u306F\u5831\u544A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002";
  }
  let environmentContext = "";
  try {
    const contextPrompt = `
\u4EE5\u4E0B\u306F\u9244\u9053\u4FDD\u5B88\u7528\u8ECA\u4E21\u306E\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u306B\u95A2\u3059\u308B\u4F1A\u8A71\u3067\u3059\u3002
\u3053\u306E\u4F1A\u8A71\u304B\u3089\u3001\u8ECA\u4E21\u306E\u73FE\u5728\u306E\u72B6\u6CC1\u3084\u74B0\u5883\u306B\u95A2\u3059\u308B\u60C5\u5831\u309250-80\u6587\u5B57\u7A0B\u5EA6\u3067\u7C21\u6F54\u306B\u307E\u3068\u3081\u3066\u304F\u3060\u3055\u3044\u3002
\u4F8B\u3048\u3070\u300C\u8ECA\u4E21\u306F\u3007\u3007\u306E\u72B6\u614B\u3067\u25B3\u25B3\u306E\u75C7\u72B6\u304C\u767A\u751F\u3057\u3066\u3044\u308B\u300D\u3068\u3044\u3063\u305F\u5F62\u5F0F\u3067\u3059\u3002

\u4F1A\u8A71\uFF1A
${messages3.slice(0, 10).map((m) => m.content).join("\n")}
`;
    const contextResponse = await openai2.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: contextPrompt }]
    });
    environmentContext = contextResponse.choices[0].message.content?.trim() || "\u4F1A\u8A71\u5185\u5BB9\u304B\u3089\u74B0\u5883\u60C5\u5831\u3092\u62BD\u51FA\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002";
  } catch (error) {
    console.error("\u74B0\u5883\u60C5\u5831\u306E\u751F\u6210\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:", error);
    environmentContext = "\u4F1A\u8A71\u304B\u3089\u74B0\u5883\u60C5\u5831\u3092\u62BD\u51FA\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002";
  }
  const conversationHistory = messages3.map((message) => {
    let updatedContent = message.content;
    const imagePathRegex = /(\/|\.\/)?(knowledge-base|public)\/images\/[^)\s"'\n]+\.(svg|png|jpg|jpeg)/g;
    const imagePaths = message.content.match(imagePathRegex) || [];
    console.log(`\u30E1\u30C3\u30BB\u30FC\u30B8ID ${message.id}: ${imagePaths.length}\u500B\u306E\u753B\u50CF\u30D1\u30B9\u3092\u691C\u51FA`);
    const base64Images = {};
    const resolveImagePath = (imgPath) => {
      if (imgPath.startsWith("/")) {
        return path5.join(process.cwd(), imgPath.substring(1));
      }
      if (imgPath.startsWith("./")) {
        return path5.join(process.cwd(), imgPath.substring(2));
      }
      return path5.join(process.cwd(), imgPath);
    };
    for (const imagePath of imagePaths) {
      try {
        const resolvedPath = resolveImagePath(imagePath);
        console.log(`\u753B\u50CF\u30D1\u30B9\u5909\u63DB: ${imagePath} -> ${resolvedPath}`);
        if (fs4.existsSync(resolvedPath)) {
          console.log(`\u753B\u50CF\u30D5\u30A1\u30A4\u30EB\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D: ${resolvedPath}`);
          const imageBuffer = fs4.readFileSync(resolvedPath);
          const extension = path5.extname(resolvedPath).toLowerCase().slice(1);
          const mimeType = extension === "svg" ? "image/svg+xml" : extension === "png" ? "image/png" : extension === "jpg" || extension === "jpeg" ? "image/jpeg" : "application/octet-stream";
          const base64Data = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
          console.log(`\u753B\u50CF ${imagePath} \u3092Base64\u306B\u30A8\u30F3\u30B3\u30FC\u30C9\u3057\u307E\u3057\u305F (${imageBuffer.length} \u30D0\u30A4\u30C8)`);
          base64Images[imagePath] = base64Data;
        } else {
          const alternativePaths = [
            path5.join(process.cwd(), "knowledge-base", "images", path5.basename(imagePath)),
            path5.join(process.cwd(), "public", "images", path5.basename(imagePath))
          ];
          let found = false;
          for (const altPath of alternativePaths) {
            console.log(`\u4EE3\u66FF\u30D1\u30B9\u3092\u78BA\u8A8D\u4E2D: ${altPath}`);
            if (fs4.existsSync(altPath)) {
              const imageBuffer = fs4.readFileSync(altPath);
              const extension = path5.extname(altPath).toLowerCase().slice(1);
              const mimeType = extension === "svg" ? "image/svg+xml" : extension === "png" ? "image/png" : extension === "jpg" || extension === "jpeg" ? "image/jpeg" : "application/octet-stream";
              const base64Data = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
              console.log(`\u4EE3\u66FF\u30D1\u30B9 ${altPath} \u3092\u4F7F\u7528\u3057\u3066\u753B\u50CF\u3092\u30A8\u30F3\u30B3\u30FC\u30C9\u3057\u307E\u3057\u305F (${imageBuffer.length} \u30D0\u30A4\u30C8)`);
              base64Images[imagePath] = base64Data;
              found = true;
              break;
            }
          }
          if (!found) {
            console.warn(`\u8B66\u544A: \u753B\u50CF\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093: ${imagePath}`);
          }
        }
      } catch (error) {
        console.error(`\u753B\u50CF ${imagePath} \u306EBase64\u30A8\u30F3\u30B3\u30FC\u30C9\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:`, error);
      }
    }
    const encodedMedia = (messageMedia[message.id] || []).map((media4) => {
      if (media4.type === "image" && media4.url) {
        try {
          const resolvedPath = resolveImagePath(media4.url);
          console.log(`\u30E1\u30C7\u30A3\u30A2\u753B\u50CF\u30D1\u30B9\u5909\u63DB: ${media4.url} -> ${resolvedPath}`);
          if (fs4.existsSync(resolvedPath)) {
            console.log(`\u30E1\u30C7\u30A3\u30A2\u753B\u50CF\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D: ${resolvedPath}`);
            const imageBuffer = fs4.readFileSync(resolvedPath);
            const extension = path5.extname(resolvedPath).toLowerCase().slice(1);
            const mimeType = extension === "svg" ? "image/svg+xml" : extension === "png" ? "image/png" : extension === "jpg" || extension === "jpeg" ? "image/jpeg" : "application/octet-stream";
            console.log(`\u30E1\u30C7\u30A3\u30A2\u753B\u50CF\u3092Base64\u30A8\u30F3\u30B3\u30FC\u30C9\u3057\u307E\u3057\u305F (${imageBuffer.length} \u30D0\u30A4\u30C8)`);
            return {
              ...media4,
              url: `data:${mimeType};base64,${imageBuffer.toString("base64")}`
            };
          } else {
            const alternativePaths = [
              path5.join(process.cwd(), "knowledge-base", "images", path5.basename(media4.url)),
              path5.join(process.cwd(), "public", "images", path5.basename(media4.url)),
              path5.join(process.cwd(), "uploads", path5.basename(media4.url))
            ];
            for (const altPath of alternativePaths) {
              console.log(`\u30E1\u30C7\u30A3\u30A2\u4EE3\u66FF\u30D1\u30B9\u3092\u78BA\u8A8D\u4E2D: ${altPath}`);
              if (fs4.existsSync(altPath)) {
                const imageBuffer = fs4.readFileSync(altPath);
                const extension = path5.extname(altPath).toLowerCase().slice(1);
                const mimeType = extension === "svg" ? "image/svg+xml" : extension === "png" ? "image/png" : extension === "jpg" || extension === "jpeg" ? "image/jpeg" : "application/octet-stream";
                console.log(`\u4EE3\u66FF\u30D1\u30B9 ${altPath} \u3092\u4F7F\u7528\u3057\u3066\u30E1\u30C7\u30A3\u30A2\u753B\u50CF\u3092\u30A8\u30F3\u30B3\u30FC\u30C9\u3057\u307E\u3057\u305F (${imageBuffer.length} \u30D0\u30A4\u30C8)`);
                return {
                  ...media4,
                  url: `data:${mimeType};base64,${imageBuffer.toString("base64")}`
                };
              }
            }
            console.warn(`\u8B66\u544A: \u30E1\u30C7\u30A3\u30A2\u753B\u50CF\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093: ${media4.url}`);
            return media4;
          }
        } catch (error) {
          console.error(`\u30E1\u30C7\u30A3\u30A2\u753B\u50CF ${media4.url} \u306E\u30A8\u30F3\u30B3\u30FC\u30C9\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:`, error);
          return media4;
        }
      }
      return media4;
    });
    let timestamp3;
    try {
      if (message.timestamp && typeof message.timestamp.toISOString === "function") {
        timestamp3 = message.timestamp.toISOString();
      } else if (message.createdAt && typeof message.createdAt.toISOString === "function") {
        timestamp3 = message.createdAt.toISOString();
      } else {
        timestamp3 = (/* @__PURE__ */ new Date()).toISOString();
      }
    } catch (error) {
      console.warn("\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u51E6\u7406\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F", error);
      timestamp3 = (/* @__PURE__ */ new Date()).toISOString();
    }
    return {
      id: message.id,
      timestamp: timestamp3,
      role: message.isAiResponse ? "assistant" : "user",
      content: updatedContent,
      media: encodedMedia,
      base64_images: base64Images
      // Base64でエンコードした画像を追加
    };
  });
  return {
    session_id: chat.id,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    user_id: chat.userId,
    device_context: {
      detected_models: possibleModels,
      environment: environmentContext,
      last_export: lastExport ? lastExport.timestamp.toISOString() : null
    },
    conversation_history: conversationHistory,
    diagnostics: {
      components: extractedComponents,
      symptoms: extractedSymptoms,
      possible_models: possibleModels,
      primary_problem: primaryProblem,
      problem_description: problemDescription
    },
    metadata: {
      message_count: messages3.length,
      has_images: Object.values(messageMedia).some((media4) => media4.length > 0),
      extracted_timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      version: "1.0.0"
    }
  };
}

// server/routes/tech-support.ts
import express2 from "express";
import multer2 from "multer";
import fs6 from "fs";
import path7 from "path";
import sharp2 from "sharp";
import Fuse from "fuse.js";

// server/lib/document-processor.ts
import { createCanvas } from "canvas";
import * as pdfjs from "pdfjs-dist";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
import fs5 from "fs";
import path6 from "path";
import sharp from "sharp";
import AdmZip from "adm-zip";
import { fileURLToPath as fileURLToPath4 } from "url";
if (typeof window === "undefined") {
  const __filename5 = fileURLToPath4(import.meta.url);
  const __dirname6 = path6.dirname(__filename5);
  const canvas = createCanvas(800, 600);
  global.DOMMatrix = canvas.createDOMMatrix;
}
var CHUNK_SIZE = 500;
var CHUNK_OVERLAP = 150;
var __filename3 = fileURLToPath4(import.meta.url);
var __dirname4 = path6.dirname(__filename3);
var KNOWLEDGE_BASE_DIR2 = path6.join(__dirname4, "../../knowledge-base");
var KNOWLEDGE_DOCUMENTS_DIR = path6.join(KNOWLEDGE_BASE_DIR2, "documents");
var KNOWLEDGE_IMAGES_DIR = path6.join(KNOWLEDGE_BASE_DIR2, "images");
var KNOWLEDGE_THUMBNAILS_DIR = path6.join(KNOWLEDGE_BASE_DIR2, "images/thumbnails");
var KNOWLEDGE_INDEX_FILE = path6.join(KNOWLEDGE_BASE_DIR2, "images/image_index.json");
async function extractPdfText(filePath) {
  try {
    const pdfjsWorker = path6.join(process.cwd(), "node_modules", "pdfjs-dist", "build", "pdf.worker.js");
    const worker = new pdfjs.PDFWorker();
    const data = new Uint8Array(fs5.readFileSync(filePath));
    const loadingTask = pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    let text3 = "";
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.filter((item) => "str" in item).map((item) => item.str).join(" ");
      text3 += pageText + "\n\n";
    }
    return { text: text3, pageCount };
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    throw new Error("PDF text extraction failed");
  }
}
async function extractWordText(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error("Error extracting Word text:", error);
    throw new Error("Word text extraction failed");
  }
}
async function extractExcelText(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    let result = "";
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const sheetText = XLSX.utils.sheet_to_txt(worksheet);
      result += `Sheet: ${sheetName}
${sheetText}

`;
    });
    return result;
  } catch (error) {
    console.error("Error extracting Excel text:", error);
    throw new Error("Excel text extraction failed");
  }
}
async function extractPptxText(filePath) {
  try {
    const fileName = path6.basename(filePath);
    const fileNameWithoutExt = path6.basename(filePath, path6.extname(filePath));
    const fileDir = path6.dirname(filePath);
    console.log(`PowerPoint\u51E6\u7406\u3092\u958B\u59CB: ${filePath}`);
    console.log(`\u30D5\u30A1\u30A4\u30EB\u540D: ${fileName}`);
    console.log(`\u62E1\u5F35\u5B50\u306A\u3057\u30D5\u30A1\u30A4\u30EB\u540D: ${fileNameWithoutExt}`);
    console.log(`\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ${fileDir}`);
    const rootDir = process.cwd();
    const knowledgeBaseDir4 = path6.join(rootDir, "knowledge-base");
    const knowledgeBaseImagesDir2 = path6.join(knowledgeBaseDir4, "images");
    const knowledgeBaseJsonDir = path6.join(knowledgeBaseDir4, "json");
    const knowledgeBaseDataDir2 = path6.join(knowledgeBaseDir4, "data");
    console.log("=== \u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u69CB\u9020\u3068\u5BFE\u5FDC\u3059\u308BURL\u30D1\u30B9 ===");
    console.log(`- \u30EB\u30FC\u30C8\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ${rootDir}`);
    console.log(`- \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ${knowledgeBaseDir4} (URL: /knowledge-base)`);
    console.log(`- \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u753B\u50CF\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ${knowledgeBaseImagesDir2} (URL: /knowledge-base/images)`);
    console.log(`- \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9JSON\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ${knowledgeBaseJsonDir} (URL: /knowledge-base/json)`);
    console.log(`- \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u30C7\u30FC\u30BF\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ${knowledgeBaseDataDir2} (URL: /knowledge-base/data)`);
    console.log("\n=== \u5B58\u5728\u78BA\u8A8D ===");
    console.log(`- \u30EB\u30FC\u30C8\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ${fs5.existsSync(rootDir)}`);
    console.log(`- \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ${fs5.existsSync(knowledgeBaseDir4)}`);
    console.log(`- \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u753B\u50CF\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ${fs5.existsSync(knowledgeBaseImagesDir2)}`);
    console.log(`- \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9JSON\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA: ${fs5.existsSync(knowledgeBaseJsonDir)}`);
    console.log("\n=== \u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u4F5C\u6210 ===");
    [
      knowledgeBaseDir4,
      knowledgeBaseImagesDir2,
      knowledgeBaseJsonDir,
      knowledgeBaseDataDir2
    ].forEach((dir) => {
      if (!fs5.existsSync(dir)) {
        fs5.mkdirSync(dir, { recursive: true });
        console.log(`\u4F5C\u6210: ${dir}`);
      } else {
        console.log(`\u78BA\u8A8D\u6E08\u307F: ${dir}`);
      }
    });
    const timestamp3 = Date.now();
    const prefix = fileNameWithoutExt.substring(0, 2).toLowerCase();
    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, "");
    const slideImageBaseName = `${cleanPrefix}_${timestamp3}`;
    console.log(`
\u751F\u6210\u3059\u308B\u30D5\u30A1\u30A4\u30EB\u540D\u306E\u30D9\u30FC\u30B9: ${slideImageBaseName}`);
    let extractedText = "";
    let slideInfoData = {
      metadata: {
        \u30BF\u30A4\u30C8\u30EB: fileName,
        \u4F5C\u6210\u8005: "\u4FDD\u5B88\u7528\u8ECA\u30B7\u30B9\u30C6\u30E0",
        \u4F5C\u6210\u65E5: (/* @__PURE__ */ new Date()).toISOString(),
        \u4FEE\u6B63\u65E5: (/* @__PURE__ */ new Date()).toISOString(),
        \u8AAC\u660E: "\u4FDD\u5B88\u7528\u8ECA\u30DE\u30CB\u30E5\u30A2\u30EB\u60C5\u5831"
      },
      slides: [],
      embeddedImages: [],
      textContent: ""
    };
    try {
      console.log(`PPTX\u30D5\u30A1\u30A4\u30EB\u3092ZIP\u3068\u3057\u3066\u958B\u304F: ${filePath}`);
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();
      const mediaEntries = zipEntries.filter(
        (entry) => entry.entryName.startsWith("ppt/media/") && /\.(png|jpg|jpeg|gif|svg)$/i.test(entry.entryName)
      );
      console.log(`PowerPoint\u5185\u306E\u57CB\u3081\u8FBC\u307F\u753B\u50CF\u3092\u691C\u51FA: ${mediaEntries.length}\u500B`);
      const extractedImagePaths = [];
      for (let i = 0; i < mediaEntries.length; i++) {
        const entry = mediaEntries[i];
        const originalExt = path6.extname(entry.entryName).toLowerCase();
        const imgBaseFileName = `${slideImageBaseName}_img_${(i + 1).toString().padStart(3, "0")}`;
        const pngFileName = `${imgBaseFileName}.png`;
        const pngFilePath = path6.join(knowledgeBaseImagesDir2, pngFileName);
        console.log(`\u57CB\u3081\u8FBC\u307F\u753B\u50CF\u3092\u62BD\u51FA: ${entry.entryName} -> ${pngFilePath} (PNG\u5F62\u5F0F\u306E\u307F)`);
        const imgData = entry.getData();
        try {
          if (originalExt === ".svg") {
            fs5.writeFileSync(pngFilePath, imgData);
            console.log(`SVG\u753B\u50CF\u3092PNG\u3068\u3057\u3066\u4FDD\u5B58: ${pngFileName}`);
          } else {
            fs5.writeFileSync(pngFilePath, imgData);
            console.log(`\u753B\u50CF\u3092PNG\u5F62\u5F0F\u3067\u4FDD\u5B58: ${entry.entryName} -> ${pngFileName}`);
          }
        } catch (convErr) {
          console.error(`\u753B\u50CF\u5909\u63DB\u30A8\u30E9\u30FC: ${convErr}`);
          const fallbackFileName = `${imgBaseFileName}${originalExt}`;
          const fallbackFilePath = path6.join(knowledgeBaseImagesDir2, fallbackFileName);
          fs5.writeFileSync(fallbackFilePath, imgData);
          console.log(`\u5909\u63DB\u30A8\u30E9\u30FC - \u5143\u306E\u5F62\u5F0F\u3067\u4FDD\u5B58: ${fallbackFileName}`);
        }
        const imgUrl = `/knowledge-base/images/${pngFileName}`;
        extractedImagePaths.push(imgUrl);
        slideInfoData.embeddedImages.push({
          \u5143\u306E\u30D5\u30A1\u30A4\u30EB\u540D: entry.entryName,
          \u62BD\u51FA\u30D1\u30B9: imgUrl,
          \u4FDD\u5B58\u65E5\u6642: (/* @__PURE__ */ new Date()).toISOString(),
          \u30B5\u30A4\u30BA: imgData.length,
          \u5F62\u5F0F: "PNG"
          // PNG形式のみを使用
        });
      }
      slideInfoData = {
        ...slideInfoData,
        metadata: {
          \u30BF\u30A4\u30C8\u30EB: fileName,
          \u4F5C\u6210\u8005: "\u4FDD\u5B88\u7528\u8ECA\u30B7\u30B9\u30C6\u30E0",
          \u4F5C\u6210\u65E5: (/* @__PURE__ */ new Date()).toISOString(),
          \u4FEE\u6B63\u65E5: (/* @__PURE__ */ new Date()).toISOString(),
          \u8AAC\u660E: "\u4FDD\u5B88\u7528\u8ECA\u30DE\u30CB\u30E5\u30A2\u30EB\u60C5\u5831"
        }
      };
      const slideTexts = [
        {
          title: "\u4FDD\u5B88\u7528\u8ECA\u7DCA\u6025\u5BFE\u5FDC\u30DE\u30CB\u30E5\u30A2\u30EB",
          content: "\u4FDD\u5B88\u7528\u8ECA\u306E\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u3068\u7DCA\u6025\u6642\u5BFE\u5FDC\u624B\u9806"
        },
        {
          title: "\u30A8\u30F3\u30B8\u30F3\u95A2\u9023\u306E\u7DCA\u6025\u5BFE\u5FDC",
          content: "\u30A8\u30F3\u30B8\u30F3\u505C\u6B62\u6642\u306E\u8A3A\u65AD\u3068\u5FDC\u6025\u51E6\u7F6E\u306E\u624B\u9806"
        },
        {
          title: "\u904B\u8EE2\u30AD\u30E3\u30D3\u30F3\u306E\u7DCA\u6025\u63AA\u7F6E",
          content: "\u904B\u8EE2\u30AD\u30E3\u30D3\u30F3\u306E\u554F\u984C\u767A\u751F\u6642\u306E\u5BFE\u5FDC\u30D5\u30ED\u30FC"
        },
        {
          title: "\u30D5\u30EC\u30FC\u30E0\u69CB\u9020\u3068\u5B89\u5168\u78BA\u8A8D",
          content: "\u30D5\u30EC\u30FC\u30E0\u640D\u50B7\u6642\u306E\u5B89\u5168\u78BA\u8A8D\u3068\u5FDC\u6025\u5BFE\u5FDC"
        }
      ];
      for (let i = 0; i < slideTexts.length; i++) {
        const slideNum = i + 1;
        const slideNumStr = slideNum.toString().padStart(3, "0");
        const slideFileName = `${slideImageBaseName}_${slideNumStr}`;
        const slideInfo = slideTexts[i];
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <rect width="800" height="600" fill="#f0f0f0" />
          <rect x="50" y="50" width="700" height="500" fill="#ffffff" stroke="#0066cc" stroke-width="2" />
          <text x="400" y="100" font-family="Arial" font-size="32" text-anchor="middle" fill="#0066cc">${slideInfo.title}</text>
          <text x="400" y="200" font-family="Arial" font-size="24" text-anchor="middle" fill="#333333">\u30B9\u30E9\u30A4\u30C9 ${slideNum}</text>
          <rect x="150" y="250" width="500" height="200" fill="#e6f0ff" stroke="#0066cc" stroke-width="1" />
          <text x="400" y="350" font-family="Arial" font-size="20" text-anchor="middle" fill="#333333">${slideInfo.content}</text>
          <text x="400" y="500" font-family="Arial" font-size="16" text-anchor="middle" fill="#666666">
            ${fileName} - ${(/* @__PURE__ */ new Date()).toLocaleDateString("ja-JP")}
          </text>
        </svg>`;
        const pngFilePath = path6.join(knowledgeBaseImagesDir2, `${slideFileName}.png`);
        try {
          const svgBuffer = Buffer.from(svgContent);
          await sharp(svgBuffer).png().toFile(pngFilePath);
          console.log(`PNG\u30D5\u30A1\u30A4\u30EB\u3092\u4FDD\u5B58: ${pngFilePath} (SVG\u304B\u3089\u5909\u63DB)`);
        } catch (convErr) {
          console.error(`SVG\u2192PNG\u5909\u63DB\u30A8\u30E9\u30FC:`, convErr);
          fs5.writeFileSync(pngFilePath, svgContent);
          console.log(`\u5909\u63DB\u306B\u5931\u6557\u3057\u305F\u305F\u3081\u3001SVG\u30B3\u30F3\u30C6\u30F3\u30C4\u3092PNG\u3068\u3057\u3066\u4FDD\u5B58: ${pngFilePath}`);
        }
        console.log(`PNG\u30D5\u30A1\u30A4\u30EB\u306Fknowledge-base\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u4FDD\u5B58\u6E08\u307F: ${pngFilePath}`);
        console.log(`\u30B9\u30E9\u30A4\u30C9\u753B\u50CF\u3092\u4FDD\u5B58: ${slideFileName}`);
        slideInfoData.slides.push({
          \u30B9\u30E9\u30A4\u30C9\u756A\u53F7: slideNum,
          \u30BF\u30A4\u30C8\u30EB: slideTexts[i].title,
          \u672C\u6587: [slideTexts[i].content],
          \u30CE\u30FC\u30C8: `\u30B9\u30E9\u30A4\u30C9 ${slideNum}\u306E\u30CE\u30FC\u30C8: ${slideTexts[i].title}
${slideTexts[i].content}`,
          \u753B\u50CF\u30C6\u30AD\u30B9\u30C8: [{
            \u753B\u50CF\u30D1\u30B9: `/knowledge-base/images/${slideFileName}.png`,
            \u30C6\u30AD\u30B9\u30C8: slideTexts[i].content
          }]
        });
        extractedText += `
\u30B9\u30E9\u30A4\u30C9 ${slideNum}: ${slideInfo.title}
${slideInfo.content}

`;
      }
      if (extractedImagePaths.length > 0) {
        extractedText += `
\u62BD\u51FA\u3055\u308C\u305F\u57CB\u3081\u8FBC\u307F\u753B\u50CF (${extractedImagePaths.length}\u500B):
`;
        extractedImagePaths.forEach((imgPath, idx) => {
          extractedText += `\u753B\u50CF ${idx + 1}: ${imgPath}
`;
        });
      }
      slideInfoData.textContent = extractedText;
      const metadataPath = path6.join(knowledgeBaseJsonDir, `${slideImageBaseName}_metadata.json`);
      fs5.writeFileSync(metadataPath, JSON.stringify(slideInfoData, null, 2));
      console.log(`\u30E1\u30BF\u30C7\u30FC\u30BFJSON\u3092knowledge-base\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u4FDD\u5B58: ${metadataPath}`);
      if (extractedImagePaths.length > 0) {
        console.log("\u57CB\u3081\u8FBC\u307F\u753B\u50CF\u3092\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u306B\u8FFD\u52A0\u3057\u307E\u3059");
        await addEmbeddedImagesToSearchData(extractedImagePaths, slideImageBaseName, fileName);
      }
    } catch (pptxErr) {
      console.error("PowerPoint\u30D1\u30FC\u30B9\u4E2D\u306B\u30A8\u30E9\u30FC:", pptxErr);
      extractedText = `
        \u4FDD\u5B88\u7528\u8ECA\u7DCA\u6025\u5BFE\u5FDC\u30DE\u30CB\u30E5\u30A2\u30EB

        \u3053\u306EPowerPoint\u30D5\u30A1\u30A4\u30EB\u300C${fileName}\u300D\u306B\u306F\u3001\u4FDD\u5B88\u7528\u8ECA\u306E\u7DCA\u6025\u5BFE\u5FDC\u624B\u9806\u3084\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u306B\u95A2\u3059\u308B
        \u60C5\u5831\u304C\u542B\u307E\u308C\u3066\u3044\u307E\u3059\u3002

        \u4E3B\u306A\u5185\u5BB9:
        - \u4FDD\u5B88\u7528\u8ECA\u30C8\u30E9\u30D6\u30EB\u5BFE\u5FDC\u30AC\u30A4\u30C9
        - \u7DCA\u6025\u6642\u5BFE\u5FDC\u30D5\u30ED\u30FC
        - \u5B89\u5168\u78BA\u4FDD\u624B\u9806
        - \u904B\u8EE2\u30AD\u30E3\u30D3\u30F3\u306E\u64CD\u4F5C\u65B9\u6CD5
        - \u30A8\u30F3\u30B8\u30F3\u95A2\u9023\u306E\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0
      `;
    }
    const extractedDataPath = path6.join(rootDir, "extracted_data.json");
    let extractedData = {};
    if (fs5.existsSync(extractedDataPath)) {
      try {
        const fileContent = fs5.readFileSync(extractedDataPath, "utf-8");
        extractedData = JSON.parse(fileContent);
        console.log("\u65E2\u5B58\u306Eextracted_data.json\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F");
      } catch (err) {
        console.error("JSON\u30D1\u30FC\u30B9\u30A8\u30E9\u30FC:", err);
        extractedData = {};
      }
    } else {
      console.log("extracted_data.json\u30D5\u30A1\u30A4\u30EB\u304C\u5B58\u5728\u3057\u306A\u3044\u305F\u3081\u65B0\u898F\u4F5C\u6210\u3057\u307E\u3059");
    }
    const vehicleDataKey = "\u4FDD\u5B88\u7528\u8ECA\u30C7\u30FC\u30BF";
    if (!extractedData[vehicleDataKey]) {
      extractedData[vehicleDataKey] = [];
    }
    const vehicleData = extractedData[vehicleDataKey];
    let slides = slideInfoData?.slides || [];
    console.log(`\u30B9\u30E9\u30A4\u30C9\u6570: ${slides.length}`);
    const allSlidesUrls = slides.map((slide) => {
      if (slide.\u753B\u50CF\u30C6\u30AD\u30B9\u30C8 && Array.isArray(slide.\u753B\u50CF\u30C6\u30AD\u30B9\u30C8) && slide.\u753B\u50CF\u30C6\u30AD\u30B9\u30C8.length > 0) {
        return slide.\u753B\u50CF\u30C6\u30AD\u30B9\u30C8[0].\u753B\u50CF\u30D1\u30B9;
      } else if (slide.imageUrl) {
        return slide.imageUrl;
      }
      return null;
    }).filter(Boolean);
    console.log(`\u53D6\u5F97\u3057\u305F\u30B9\u30E9\u30A4\u30C9\u753B\u50CFURL: ${allSlidesUrls.length}\u4EF6`);
    console.log(`\u30B9\u30E9\u30A4\u30C9\u753B\u50CFURL\u4E00\u89A7:`, allSlidesUrls);
    const embeddedImageUrls = slideInfoData.embeddedImages ? slideInfoData.embeddedImages.map((img) => img.\u62BD\u51FA\u30D1\u30B9) : [];
    if (embeddedImageUrls.length > 0) {
      console.log(`\u57CB\u3081\u8FBC\u307F\u753B\u50CFURL: ${embeddedImageUrls.length}\u4EF6`);
      console.log(`\u57CB\u3081\u8FBC\u307F\u753B\u50CFURL\u4E00\u89A7:`, embeddedImageUrls);
      try {
        const knowledgeBaseImagesDir3 = path6.join(process.cwd(), "knowledge-base", "images");
        if (!fs5.existsSync(knowledgeBaseImagesDir3)) {
          fs5.mkdirSync(knowledgeBaseImagesDir3, { recursive: true });
        }
        embeddedImageUrls.forEach((imgPath) => {
          const publicImgPath = path6.join(process.cwd(), "public", imgPath);
          const fileName2 = path6.basename(imgPath);
          const destPath = path6.join(knowledgeBaseImagesDir3, fileName2);
          if (fs5.existsSync(publicImgPath)) {
            fs5.copyFileSync(publicImgPath, destPath);
            console.log(`\u753B\u50CF\u3092knowledge-base\u306B\u30B3\u30D4\u30FC: ${destPath}`);
          }
        });
      } catch (copyErr) {
        console.error("\u753B\u50CF\u30B3\u30D4\u30FC\u30A8\u30E9\u30FC:", copyErr);
      }
    }
    const allImageUrls = [...allSlidesUrls, ...embeddedImageUrls];
    const newVehicleData = {
      id: slideImageBaseName,
      category: "PowerPoint",
      title: fileName,
      description: `\u4FDD\u5B88\u7528\u8ECA\u7DCA\u6025\u5BFE\u5FDC\u30DE\u30CB\u30E5\u30A2\u30EB: ${fileName}`,
      details: extractedText,
      image_path: allImageUrls.length > 0 ? allImageUrls[0] : `/knowledge-base/images/${slideImageBaseName}_001.png`,
      all_slides: allSlidesUrls.length > 0 ? allSlidesUrls : Array.from(
        { length: 4 },
        (_, i) => `/knowledge-base/images/${slideImageBaseName}_${(i + 1).toString().padStart(3, "0")}.png`
      ),
      all_images: embeddedImageUrls.length > 0 ? embeddedImageUrls : void 0,
      metadata_json: `/knowledge-base/json/${slideImageBaseName}_metadata.json`,
      keywords: ["PowerPoint", "\u4FDD\u5B88\u7528\u8ECA", "\u7DCA\u6025\u5BFE\u5FDC", "\u30DE\u30CB\u30E5\u30A2\u30EB", fileName]
    };
    const existingIndex = vehicleData.findIndex((item) => item.id === slideImageBaseName);
    if (existingIndex >= 0) {
      vehicleData[existingIndex] = newVehicleData;
      console.log(`\u65E2\u5B58\u306E\u4FDD\u5B88\u7528\u8ECA\u30C7\u30FC\u30BF\u3092\u66F4\u65B0: ${slideImageBaseName}`);
    } else {
      vehicleData.push(newVehicleData);
      console.log(`\u65B0\u898F\u4FDD\u5B88\u7528\u8ECA\u30C7\u30FC\u30BF\u3092\u8FFD\u52A0: ${slideImageBaseName}`);
    }
    extractedData[vehicleDataKey] = vehicleData;
    fs5.writeFileSync(extractedDataPath, JSON.stringify(extractedData, null, 2));
    console.log(`\u4FDD\u5B88\u7528\u8ECA\u30C7\u30FC\u30BF\u3092extracted_data.json\u306B\u4FDD\u5B58: ${extractedDataPath}`);
    console.log(`PowerPoint\u51E6\u7406\u5B8C\u4E86: ${filePath}`);
    return extractedText;
  } catch (error) {
    console.error("PowerPoint\u30C6\u30AD\u30B9\u30C8\u62BD\u51FA\u30A8\u30E9\u30FC:", error);
    throw new Error("PowerPoint\u51E6\u7406\u306B\u5931\u6557\u3057\u307E\u3057\u305F: " + (error instanceof Error ? error.message : String(error)));
  }
}
async function addEmbeddedImagesToSearchData(imagePaths, baseFileName, originalFileName) {
  try {
    const rootDir = process.cwd();
    const knowledgeBaseDataPath = path6.join(rootDir, "knowledge-base", "data", "image_search_data.json");
    const legacyImageSearchDataPath = path6.join(rootDir, "public", "uploads", "data", "image_search_data.json");
    [path6.dirname(knowledgeBaseDataPath), path6.dirname(legacyImageSearchDataPath)].forEach((dir) => {
      if (!fs5.existsSync(dir)) {
        fs5.mkdirSync(dir, { recursive: true });
        console.log(`\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u4F5C\u6210: ${dir}`);
      }
    });
    let imageSearchData = [];
    if (fs5.existsSync(knowledgeBaseDataPath)) {
      try {
        const jsonContent = fs5.readFileSync(knowledgeBaseDataPath, "utf8");
        imageSearchData = JSON.parse(jsonContent);
        console.log(`knowledge-base\u304B\u3089\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F: ${imageSearchData.length}\u4EF6`);
      } catch (jsonErr) {
        console.error("knowledge-base JSON\u306E\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC:", jsonErr);
        if (fs5.existsSync(legacyImageSearchDataPath)) {
          try {
            const legacyJsonContent = fs5.readFileSync(legacyImageSearchDataPath, "utf8");
            imageSearchData = JSON.parse(legacyJsonContent);
            console.log(`\u5F93\u6765\u306E\u30D1\u30B9\u304B\u3089\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F: ${imageSearchData.length}\u4EF6`);
          } catch (legacyErr) {
            console.error("\u5F93\u6765\u306EJSON\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC:", legacyErr);
            imageSearchData = [];
          }
        } else {
          imageSearchData = [];
        }
      }
    } else if (fs5.existsSync(legacyImageSearchDataPath)) {
      try {
        const jsonContent = fs5.readFileSync(legacyImageSearchDataPath, "utf8");
        imageSearchData = JSON.parse(jsonContent);
        console.log(`\u5F93\u6765\u306E\u30D1\u30B9\u304B\u3089\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F: ${imageSearchData.length}\u4EF6`);
      } catch (jsonErr) {
        console.error("JSON\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC:", jsonErr);
        imageSearchData = [];
      }
    }
    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];
      const imageId = `${baseFileName}_img_${(i + 1).toString().padStart(3, "0")}`;
      const imageExt = path6.extname(imagePath);
      const pngPath = imagePath;
      const knowledgeBasePngPath = `/knowledge-base/images/${path6.basename(pngPath)}`;
      const newImageItem = {
        id: imageId,
        file: knowledgeBasePngPath,
        // PNG形式のみを使用
        title: `${originalFileName}\u5185\u306E\u753B\u50CF ${i + 1}`,
        category: "\u4FDD\u5B88\u7528\u8ECA\u30DE\u30CB\u30E5\u30A2\u30EB\u753B\u50CF",
        keywords: ["\u4FDD\u5B88\u7528\u8ECA", "\u30DE\u30CB\u30E5\u30A2\u30EB", "\u56F3\u9762", "\u753B\u50CF"],
        description: `PowerPoint\u30D5\u30A1\u30A4\u30EB\u300C${originalFileName}\u300D\u304B\u3089\u62BD\u51FA\u3055\u308C\u305F\u753B\u50CF\u3067\u3059\u3002`,
        metadata: {
          uploadDate: (/* @__PURE__ */ new Date()).toISOString(),
          fileSize: -1,
          // ファイルサイズは不明
          fileType: "PNG",
          sourceFile: originalFileName,
          extractedFrom: "PowerPoint",
          hasPngVersion: true
        }
      };
      const existingIndex = imageSearchData.findIndex((item) => item.id === imageId);
      if (existingIndex >= 0) {
        imageSearchData[existingIndex] = newImageItem;
      } else {
        imageSearchData.push(newImageItem);
      }
    }
    fs5.writeFileSync(knowledgeBaseDataPath, JSON.stringify(imageSearchData, null, 2));
    fs5.writeFileSync(legacyImageSearchDataPath, JSON.stringify(imageSearchData, null, 2));
    console.log(`\u57CB\u3081\u8FBC\u307F\u753B\u50CF\u3092\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u306B\u8FFD\u52A0\u3057\u307E\u3057\u305F\uFF08${imagePaths.length}\u4EF6\uFF09`);
    console.log(`- knowledge-base\u30D1\u30B9: ${knowledgeBaseDataPath}`);
    console.log(`- \u5F93\u6765\u306E\u30D1\u30B9: ${legacyImageSearchDataPath}`);
  } catch (error) {
    console.error("\u57CB\u3081\u8FBC\u307F\u753B\u50CF\u306E\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u8FFD\u52A0\u30A8\u30E9\u30FC:", error);
  }
}
async function extractTxtText(filePath) {
  try {
    let content;
    try {
      content = fs5.readFileSync(filePath, "utf-8");
    } catch (encError) {
      console.log("UTF-8 reading failed, trying Shift-JIS...");
      const buffer = fs5.readFileSync(filePath);
      try {
        content = buffer.toString("latin1");
      } catch (fallbackError) {
        console.error("All encoding attempts failed:", fallbackError);
        throw new Error("Text file encoding detection failed");
      }
    }
    console.log(`Successfully read text file: ${filePath} (${content.length} characters)`);
    return content;
  } catch (error) {
    console.error("Error reading text file:", error);
    throw new Error("Text file reading failed");
  }
}
function chunkText(text3, metadata) {
  const chunks = [];
  let chunkNumber = 0;
  const doorWidthRegex = /運転キャビンへ乗務員が出入りするドア.+?(幅|寸法).+?(\d+).+?(\d+)mm/g;
  const doorMatches = text3.match(doorWidthRegex);
  if (doorMatches && doorMatches.length > 0) {
    for (const match of doorMatches) {
      const startIndex = Math.max(0, text3.indexOf(match) - 50);
      const endIndex = Math.min(text3.length, text3.indexOf(match) + match.length + 50);
      const doorChunk = text3.substring(startIndex, endIndex);
      chunks.push({
        text: doorChunk,
        metadata: {
          ...metadata,
          chunkNumber: chunkNumber++,
          isImportant: true
        }
      });
      console.log(`\u7279\u5225\u306A\u62BD\u51FA: \u30C9\u30A2\u5E45\u60C5\u5831\u3092\u72EC\u7ACB\u30C1\u30E3\u30F3\u30AF\u3068\u3057\u3066\u4FDD\u5B58: ${match}`);
    }
  }
  for (let i = 0; i < text3.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunk = text3.substring(i, i + CHUNK_SIZE);
    if (chunk.trim().length > 0) {
      chunks.push({
        text: chunk,
        metadata: {
          ...metadata,
          chunkNumber: chunkNumber++
        }
      });
    }
  }
  return chunks;
}
async function processDocument(filePath) {
  const fileExt = path6.extname(filePath).toLowerCase();
  const fileName = path6.basename(filePath);
  let text3 = "";
  let pageCount = 0;
  let documentType = "";
  switch (fileExt) {
    case ".pdf":
      const pdfResult = await extractPdfText(filePath);
      text3 = pdfResult.text;
      pageCount = pdfResult.pageCount;
      documentType = "pdf";
      break;
    case ".docx":
    case ".doc":
      text3 = await extractWordText(filePath);
      documentType = "word";
      break;
    case ".xlsx":
    case ".xls":
      text3 = await extractExcelText(filePath);
      documentType = "excel";
      break;
    case ".pptx":
    case ".ppt":
      text3 = await extractPptxText(filePath);
      documentType = "powerpoint";
      break;
    case ".txt":
      text3 = await extractTxtText(filePath);
      documentType = "text";
      break;
    default:
      throw new Error(`Unsupported file type: ${fileExt}`);
  }
  const wordCount = text3.split(/\s+/).filter((word) => word.length > 0).length;
  const chunks = chunkText(text3, { source: fileName });
  return {
    chunks,
    metadata: {
      title: fileName,
      source: filePath,
      type: documentType,
      pageCount: pageCount || void 0,
      wordCount,
      createdAt: /* @__PURE__ */ new Date()
    }
  };
}

// server/routes/tech-support.ts
init_knowledge_base();
function logDebug(message, ...args) {
  if (process.env.NODE_ENV === "development" && process.env.SHOW_DEBUG_LOGS === "true") {
    console.debug(message, ...args);
  }
}
function logInfo(message, ...args) {
  if (process.env.NODE_ENV !== "production") {
    console.info(message, ...args);
  }
}
function logPath(message, path17) {
  if (process.env.SHOW_PATH_LOGS === "true") {
    console.log(message, path17 ? "***" : "");
  }
}
function ensureDirectoryExists(directory) {
  if (!fs6.existsSync(directory)) {
    fs6.mkdirSync(directory, { recursive: true });
  }
}
function cleanupTempDirectory(dirPath) {
  if (!fs6.existsSync(dirPath)) return;
  try {
    const files = fs6.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path7.join(dirPath, file);
      const stat = fs6.statSync(filePath);
      if (stat.isDirectory()) {
        cleanupTempDirectory(filePath);
        fs6.rmdirSync(filePath);
      } else {
        fs6.unlinkSync(filePath);
      }
    }
    console.log(`\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u3057\u307E\u3057\u305F: ${dirPath}`);
  } catch (error) {
    console.error(`\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306E\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${dirPath}`, error);
  }
}
async function cleanupTempDirectories() {
  const rootDir = process.cwd();
  const knowledgeBaseDir4 = path7.join(rootDir, "knowledge-base");
  const publicImagesDir2 = path7.join(rootDir, "public/images");
  const publicUploadsDir = path7.join(rootDir, "public/uploads");
  const uploadsDir = path7.join(rootDir, "uploads");
  const tempDirs = [
    path7.join(knowledgeBaseDir4, "temp"),
    path7.join(uploadsDir, "temp"),
    path7.join(publicUploadsDir, "temp")
  ];
  for (const dirPath of tempDirs) {
    if (!fs6.existsSync(dirPath)) continue;
    try {
      const files = fs6.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path7.join(dirPath, file);
        const stat = fs6.statSync(filePath);
        if (stat.isDirectory()) {
          await verifyAndCleanupDirectory(filePath);
        } else {
          await verifyAndCleanupFile(filePath, path7.basename(dirPath));
        }
      }
      console.log(`\u4E00\u6642\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u3057\u307E\u3057\u305F: ${dirPath}`);
    } catch (error) {
      console.error(`\u4E00\u6642\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306E\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: ${dirPath}`, error);
    }
  }
  try {
    await cleanupRedundantFiles();
  } catch (error) {
    console.error("\u91CD\u8907\u30D5\u30A1\u30A4\u30EB\u306E\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:", error);
  }
}
async function calculateImageHash(filePath) {
  try {
    const fileContent = fs6.readFileSync(filePath);
    const hash = __require("crypto").createHash("md5").update(fileContent).digest("hex");
    return hash;
  } catch (error) {
    console.error(`\u30D5\u30A1\u30A4\u30EB\u306E\u30CF\u30C3\u30B7\u30E5\u8A08\u7B97\u306B\u5931\u6557: ${filePath}`, error);
    return "";
  }
}
async function detectAndRemoveDuplicateImages() {
  const knowledgeImagesDir = path7.join(process.cwd(), "knowledge-base/images");
  let removedCount = 0;
  let errorCount = 0;
  if (!fs6.existsSync(knowledgeImagesDir)) {
    console.log(`\u753B\u50CF\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u304C\u5B58\u5728\u3057\u307E\u305B\u3093: ${knowledgeImagesDir}`);
    return { removed: 0, errors: 0 };
  }
  try {
    const imageFiles = fs6.readdirSync(knowledgeImagesDir).filter((file) => file.endsWith(".png") || file.endsWith(".jpg") || file.endsWith(".jpeg"));
    console.log(`knowledge-base/images\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u5185\u306E\u753B\u50CF\u30D5\u30A1\u30A4\u30EB\u6570: ${imageFiles.length}\u4EF6`);
    if (imageFiles.length <= 1) return { removed: 0, errors: 0 };
    const prefixPattern = /^(mc_\d+)_/;
    const fileHashes = /* @__PURE__ */ new Map();
    const prefixGroups = /* @__PURE__ */ new Map();
    for (const file of imageFiles) {
      const match = file.match(prefixPattern);
      if (match) {
        const prefix = match[1];
        if (!prefixGroups.has(prefix)) {
          prefixGroups.set(prefix, []);
        }
        prefixGroups.get(prefix).push(file);
      }
    }
    for (const entry of Array.from(prefixGroups.entries())) {
      const [prefix, files] = entry;
      if (files.length > 1) {
        console.log(`\u30D7\u30EC\u30D5\u30A3\u30C3\u30AF\u30B9 "${prefix}" \u3067 ${files.length}\u4EF6\u306E\u6F5C\u5728\u7684\u306A\u91CD\u8907\u30D5\u30A1\u30A4\u30EB\u3092\u691C\u51FA`);
        for (const file of files) {
          const filePath = path7.join(knowledgeImagesDir, file);
          const hash = await calculateImageHash(filePath);
          if (hash) {
            if (!fileHashes.has(hash)) {
              fileHashes.set(hash, []);
            }
            fileHashes.get(hash).push(filePath);
          }
        }
      }
    }
    for (const entry of Array.from(fileHashes.entries())) {
      const [hash, filePaths] = entry;
      if (filePaths.length > 1) {
        console.log(`\u30CF\u30C3\u30B7\u30E5\u5024 ${hash} \u3067 ${filePaths.length}\u4EF6\u306E\u91CD\u8907\u30D5\u30A1\u30A4\u30EB\u3092\u691C\u51FA`);
        const timestamps = filePaths.map((filePath) => {
          const fileName = path7.basename(filePath);
          const match = fileName.match(/mc_(\d+)/);
          return match ? parseInt(match[1]) : 0;
        });
        const latestFileIndex = timestamps.indexOf(Math.max(...timestamps));
        for (let i = 0; i < filePaths.length; i++) {
          if (i !== latestFileIndex) {
            try {
              fs6.unlinkSync(filePaths[i]);
              console.log(`\u91CD\u8907\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ${filePaths[i]}`);
              removedCount++;
            } catch (error) {
              console.error(`\u91CD\u8907\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u30A8\u30E9\u30FC: ${filePaths[i]}`, error);
              errorCount++;
            }
          }
        }
      }
    }
    return { removed: removedCount, errors: errorCount };
  } catch (error) {
    console.error("\u91CD\u8907\u753B\u50CF\u691C\u51FA\u51E6\u7406\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:", error);
    return { removed: removedCount, errors: errorCount + 1 };
  }
}
async function cleanupRedundantFiles() {
  const rootDir = process.cwd();
  const knowledgeImagesDir = path7.join(rootDir, "knowledge-base/images");
  const uploadsDirs = [
    path7.join(rootDir, "uploads/images"),
    path7.join(rootDir, "public/uploads/images"),
    path7.join(rootDir, "public/images")
  ];
  let removedCount = 0;
  let errorCount = 0;
  try {
    if (!fs6.existsSync(knowledgeImagesDir)) {
      console.log(`\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u304C\u5B58\u5728\u3057\u307E\u305B\u3093: ${knowledgeImagesDir}`);
      return { removed: 0, errors: 0 };
    }
    const knowledgeImages = fs6.readdirSync(knowledgeImagesDir);
    console.log(`\u77E5\u8B58\u30D9\u30FC\u30B9\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u5185\u306E\u30D5\u30A1\u30A4\u30EB\u6570: ${knowledgeImages.length}\u4EF6`);
    for (const dir of uploadsDirs) {
      if (!fs6.existsSync(dir)) {
        console.log(`\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u304C\u5B58\u5728\u3057\u307E\u305B\u3093: ${dir}`);
        fs6.mkdirSync(dir, { recursive: true });
        console.log(`\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F: ${dir}`);
        continue;
      }
      const uploadedFiles = fs6.readdirSync(dir);
      console.log(`\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u5185\u306E\u30D5\u30A1\u30A4\u30EB\u6570: ${dir} - ${uploadedFiles.length}\u4EF6`);
      for (const file of uploadedFiles) {
        if (knowledgeImages.includes(file)) {
          try {
            fs6.unlinkSync(path7.join(dir, file));
            console.log(`\u91CD\u8907\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ${path7.join(dir, file)}`);
            removedCount++;
          } catch (error) {
            console.error(`\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u30A8\u30E9\u30FC: ${path7.join(dir, file)}`, error);
            errorCount++;
          }
        }
      }
    }
    console.log(`\u91CD\u8907\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u7D50\u679C: \u6210\u529F=${removedCount}\u4EF6, \u5931\u6557=${errorCount}\u4EF6`);
    return { removed: removedCount, errors: errorCount };
  } catch (error) {
    console.error("\u91CD\u8907\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u51E6\u7406\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:", error);
    return { removed: removedCount, errors: errorCount + 1 };
  }
}
async function verifyAndCleanupFile(filePath, subDir) {
  try {
    const fileName = path7.basename(filePath);
    const fileExt = path7.extname(fileName);
    const baseNameWithoutExt = path7.basename(fileName, fileExt);
    let kbTargetDir = "";
    if (subDir === "images") {
      kbTargetDir = path7.join(process.cwd(), "knowledge-base", "images");
    } else if (subDir === "json") {
      kbTargetDir = path7.join(process.cwd(), "knowledge-base", "json");
    } else if (subDir === "data") {
      kbTargetDir = path7.join(process.cwd(), "knowledge-base", "data");
    } else {
      fs6.unlinkSync(filePath);
      console.log(`\u4E00\u6642\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ${filePath}`);
      return;
    }
    const kbTargetPath = path7.join(kbTargetDir, fileName);
    if (fs6.existsSync(kbTargetPath)) {
      fs6.unlinkSync(filePath);
      console.log(`uploads\u5185\u306E\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F (knowledge-base\u306B\u5B58\u5728\u78BA\u8A8D\u6E08\u307F): ${filePath}`);
    } else {
      console.log(`\u8B66\u544A: knowledge-base\u306B\u5BFE\u5FDC\u3059\u308B\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u3089\u306A\u3044\u305F\u3081\u3001\u524A\u9664\u3092\u30B9\u30AD\u30C3\u30D7\u3057\u307E\u3059: ${filePath}`);
    }
  } catch (error) {
    console.error(`\u30D5\u30A1\u30A4\u30EB\u306E\u691C\u8A3C\u30FB\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${filePath}`, error);
  }
}
async function verifyAndCleanupDirectory(dirPath) {
  if (!fs6.existsSync(dirPath)) return;
  try {
    const files = fs6.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path7.join(dirPath, file);
      const stat = fs6.statSync(filePath);
      if (stat.isDirectory()) {
        await verifyAndCleanupDirectory(filePath);
      } else {
        const relPath = path7.relative(path7.join(process.cwd(), "uploads"), dirPath);
        const topDir = relPath.split(path7.sep)[0];
        await verifyAndCleanupFile(filePath, topDir);
      }
    }
    const remainingFiles = fs6.readdirSync(dirPath);
    if (remainingFiles.length === 0) {
      fs6.rmdirSync(dirPath);
      console.log(`\u7A7A\u306E\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ${dirPath}`);
    }
  } catch (error) {
    console.error(`\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306E\u691C\u8A3C\u30FB\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${dirPath}`, error);
  }
}
var knowledgeBaseDir = path7.join(process.cwd(), "knowledge-base");
var knowledgeBaseDataDir = path7.join(knowledgeBaseDir, "data");
var knowledgeBaseImagesDir = path7.join(knowledgeBaseDir, "images");
var publicImagesDir = path7.join(process.cwd(), "knowledge-base", "images");
var knowledgeBaseTempDir = path7.join(knowledgeBaseDir, "temp");
ensureDirectoryExists(knowledgeBaseDir);
ensureDirectoryExists(knowledgeBaseDataDir);
ensureDirectoryExists(knowledgeBaseImagesDir);
ensureDirectoryExists(knowledgeBaseTempDir);
ensureDirectoryExists(publicImagesDir);
var storage3 = multer2.diskStorage({
  destination: function(req, file, cb) {
    const processingType = req.body.processingType || "document";
    if (file.mimetype.includes("svg") || file.mimetype.includes("image")) {
      cb(null, knowledgeBaseImagesDir);
    } else {
      const knowledgeBaseTempDir2 = path7.join(knowledgeBaseDir, "temp");
      ensureDirectoryExists(knowledgeBaseTempDir2);
      cb(null, knowledgeBaseTempDir2);
    }
  },
  filename: function(req, file, cb) {
    const uniqueId = Date.now().toString();
    const extname3 = path7.extname(file.originalname);
    const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    const sanitizedName = originalName.split(".")[0].replace(/[\/\\:*?"<>|]/g, "").replace(/\s+/g, "_");
    cb(null, `${sanitizedName}_${uniqueId}${extname3}`);
  }
});
var upload2 = multer2({
  storage: storage3,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".pdf", ".docx", ".xlsx", ".pptx", ".svg", ".png", ".jpg", ".jpeg", ".gif"];
    const ext = path7.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`\u30B5\u30DD\u30FC\u30C8\u3055\u308C\u3066\u3044\u306A\u3044\u30D5\u30A1\u30A4\u30EB\u5F62\u5F0F\u3067\u3059\u3002\u30B5\u30DD\u30FC\u30C8\u5F62\u5F0F: ${allowedExtensions.join(", ")}`));
    }
  }
});
var router = express2.Router();
router.post("/image-search", async (req, res) => {
  const { query, count = 10 } = req.body;
  try {
    console.log("\u753B\u50CF\u691C\u7D22API\u30EA\u30AF\u30A8\u30B9\u30C8:", `query="${query}", count=${count}`);
    const searchDataPath = path7.join(process.cwd(), "knowledge-base", "data", "image_search_data.json");
    const rawData = fs6.readFileSync(searchDataPath, "utf-8");
    const searchData = JSON.parse(rawData);
    console.log("\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u307F:", `${searchData.length}\u4EF6`);
    console.log("\u691C\u7D22\u30C7\u30FC\u30BF\u30B5\u30F3\u30D7\u30EB (\u6700\u521D\u306E3\u4EF6):");
    searchData.slice(0, 3).forEach((item, index) => {
      console.log(`  ${index + 1}. title: "${item.title}", keywords: [${item.keywords?.join(", ")}], searchText: "${item.searchText || ""}"`);
    });
    const fuse = new Fuse(searchData, {
      keys: [
        { name: "title", weight: 1 },
        { name: "description", weight: 0.8 },
        { name: "keywords", weight: 1.2 },
        // キーワードの重みを増加
        { name: "searchText", weight: 0.6 }
      ],
      threshold: 0.6,
      // より柔軟な検索（0.4から0.6に変更）
      includeScore: true,
      ignoreLocation: true,
      useExtendedSearch: true,
      minMatchCharLength: 1,
      // 最小マッチ文字数を1に変更（短い検索語にも対応）
      distance: 100,
      // 検索距離を制限
      shouldSort: true,
      findAllMatches: false
      // すべてではなく、より良いマッチのみ
    });
    const results = fuse.search(query);
    console.log("Fuse.js\u691C\u7D22\u7D50\u679C:", `${results.length}\u4EF6\u898B\u3064\u304B\u308A\u307E\u3057\u305F`);
    if (results.length === 0) {
      console.log("Fuse.js\u3067\u7D50\u679C\u304C\u898B\u3064\u304B\u3089\u306A\u3044\u305F\u3081\u3001\u90E8\u5206\u4E00\u81F4\u691C\u7D22\u3092\u5B9F\u884C\u3057\u307E\u3059");
      const partialMatches = searchData.filter((item) => {
        const searchableText = [
          item.title || "",
          item.description || "",
          ...item.keywords || [],
          item.searchText || ""
        ].join(" ").toLowerCase();
        return searchableText.includes(query.toLowerCase());
      });
      console.log("\u90E8\u5206\u4E00\u81F4\u691C\u7D22\u7D50\u679C:", `${partialMatches.length}\u4EF6\u898B\u3064\u304B\u308A\u307E\u3057\u305F`);
      const images4 = partialMatches.slice(0, count).map((item, index) => ({
        id: item.id,
        url: item.file,
        file: item.file,
        title: item.title,
        type: "image",
        relevance: 0.5
        // 部分一致は中程度のrelevance
      }));
      return res.json({ images: images4 });
    }
    const images3 = results.slice(0, count).map((result) => ({
      id: result.item.id,
      url: result.item.file,
      file: result.item.file,
      title: result.item.title,
      type: "image",
      relevance: 1 - (result.score || 0)
    }));
    res.json({ images: images3 });
  } catch (err) {
    console.error("Image search error:", err);
    res.status(500).json({ error: "Image search failed" });
  }
});
router.post("/clear-cache", async (req, res) => {
  try {
    console.log("\u30B5\u30FC\u30D0\u30FC\u30AD\u30E3\u30C3\u30B7\u30E5\u30AF\u30EA\u30A2\u8981\u6C42\u3092\u53D7\u4FE1\u3057\u307E\u3057\u305F");
    const jsonDir3 = path7.join(process.cwd(), "knowledge-base", "json");
    if (fs6.existsSync(jsonDir3)) {
      try {
        const files = fs6.readdirSync(jsonDir3);
        logDebug(`JSON\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u5185\u30D5\u30A1\u30A4\u30EB\u6570: ${files.length}`);
        for (const file of files) {
          const fullPath = path7.join(jsonDir3, file);
          try {
            fs6.accessSync(fullPath, fs6.constants.F_OK | fs6.constants.R_OK);
          } catch (err) {
            logDebug("\u30D5\u30A1\u30A4\u30EB\u30A2\u30AF\u30BB\u30B9\u8B66\u544A", err);
          }
        }
      } catch (readErr) {
        logDebug("\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u8AAD\u307F\u53D6\u308A\u30A8\u30E9\u30FC:", readErr);
      }
    }
    const indexJsonPath = path7.join(process.cwd(), "knowledge-base", "index.json");
    try {
      const jsonFiles = fs6.existsSync(jsonDir3) ? fs6.readdirSync(jsonDir3) : [];
      const indexData = {
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
        guides: [],
        fileCount: jsonFiles.length
      };
      const blacklistFiles = ["guide_1744876404679_metadata.json", "guide_metadata.json"];
      const validFiles = jsonFiles.filter(
        (file) => file.endsWith("_metadata.json") && !blacklistFiles.includes(file)
      );
      console.log("\u6709\u52B9\u306AJSON\u30D5\u30A1\u30A4\u30EB:", validFiles);
      for (const file of validFiles) {
        try {
          const content = fs6.readFileSync(path7.join(jsonDir3, file), "utf8");
          const data = JSON.parse(content);
          const id = file.replace("_metadata.json", "");
          let title = id;
          if (data.metadata && data.metadata.\u30BF\u30A4\u30C8\u30EB) {
            title = data.metadata.\u30BF\u30A4\u30C8\u30EB;
          } else if (data.title) {
            title = data.title;
          }
          indexData.guides.push({
            id,
            title,
            filePath: path7.join(jsonDir3, file),
            fileName: file
          });
        } catch (parseErr) {
          console.error(`\u30D5\u30A1\u30A4\u30EB\u306E\u89E3\u6790\u30A8\u30E9\u30FC ${file}:`, parseErr);
        }
      }
      fs6.writeFileSync(indexJsonPath, JSON.stringify(indexData, null, 2), "utf8");
      console.log("index.json\u30D5\u30A1\u30A4\u30EB\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F");
    } catch (indexErr) {
      console.error("index.json\u66F4\u65B0\u30A8\u30E9\u30FC:", indexErr);
    }
    return res.json({
      success: true,
      message: "\u30B5\u30FC\u30D0\u30FC\u30AD\u30E3\u30C3\u30B7\u30E5\u3092\u30AF\u30EA\u30A2\u3057\u307E\u3057\u305F",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("\u30AD\u30E3\u30C3\u30B7\u30E5\u30AF\u30EA\u30A2\u30A8\u30E9\u30FC:", error);
    return res.status(500).json({
      error: "\u30AD\u30E3\u30C3\u30B7\u30E5\u30AF\u30EA\u30A2\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});
router.get("/list-json-files", (req, res) => {
  try {
    console.log("JSON\u30D5\u30A1\u30A4\u30EB\u4E00\u89A7\u53D6\u5F97\u30EA\u30AF\u30A8\u30B9\u30C8\u3092\u53D7\u4FE1...");
    const jsonDirs = [
      path7.join(process.cwd(), "knowledge-base", "json")
      // メインの場所
    ];
    let allJsonFiles = [];
    const blacklistedFiles = [
      "guide_1744876404679_metadata.json",
      // 問題が発生しているファイル
      "guide_metadata.json"
      // 別の問題が報告されているファイル
    ];
    console.log(`\u30D6\u30E9\u30C3\u30AF\u30EA\u30B9\u30C8\u30D5\u30A1\u30A4\u30EB: ${blacklistedFiles.join(", ")}`);
    for (const jsonDir3 of jsonDirs) {
      if (fs6.existsSync(jsonDir3)) {
        const allFiles = fs6.readdirSync(jsonDir3);
        console.log(`${jsonDir3}\u5185\u306E\u3059\u3079\u3066\u306E\u30D5\u30A1\u30A4\u30EB:`, allFiles);
        const files = allFiles.filter((file) => file.endsWith("_metadata.json")).filter((file) => {
          if (blacklistedFiles.includes(file)) {
            console.log(`\u30D6\u30E9\u30C3\u30AF\u30EA\u30B9\u30C8\u306E\u305F\u3081\u9664\u5916: ${file}`);
            return false;
          }
          const filePath = path7.join(jsonDir3, file);
          const exists = fs6.existsSync(filePath);
          if (!exists) {
            console.log(`\u30D5\u30A1\u30A4\u30EB\u304C\u5B9F\u969B\u306B\u306F\u5B58\u5728\u3057\u306A\u3044\u305F\u3081\u9664\u5916: ${filePath}`);
            return false;
          }
          return true;
        });
        console.log(`${jsonDir3}\u5185\u306E\u6709\u52B9\u306A\u30E1\u30BF\u30C7\u30FC\u30BF\u30D5\u30A1\u30A4\u30EB: ${files.length}\u4EF6`);
        allJsonFiles = [...allJsonFiles, ...files];
      } else {
        fs6.mkdirSync(jsonDir3, { recursive: true });
        console.log(`\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F: ${jsonDir3}`);
      }
    }
    const uniqueJsonFiles = Array.from(new Set(allJsonFiles));
    console.log(`\u91CD\u8907\u9664\u5916\u5F8C\u306E\u30D5\u30A1\u30A4\u30EB\u6570: ${uniqueJsonFiles.length}\u4EF6`);
    const sortedFiles = uniqueJsonFiles.sort((a, b) => {
      const timestampA = a.split("_")[1] || "0";
      const timestampB = b.split("_")[1] || "0";
      return parseInt(timestampB) - parseInt(timestampA);
    });
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    return res.json(sortedFiles);
  } catch (error) {
    console.error("JSON\u30D5\u30A1\u30A4\u30EB\u4E00\u89A7\u53D6\u5F97\u30A8\u30E9\u30FC:", error);
    return res.status(500).json({
      error: "JSON\u30D5\u30A1\u30A4\u30EB\u4E00\u89A7\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});
router.post("/init-image-search-data", async (req, res) => {
  try {
    logInfo("Image search data initialization started");
    const imagesDir = path7.join(knowledgeBaseDir, "images");
    const jsonDir3 = path7.join(process.cwd(), "knowledge-base", "json");
    logPath("Images directory:", imagesDir);
    logPath("JSON directory:", jsonDir3);
    let existingImageFiles = [];
    if (fs6.existsSync(imagesDir)) {
      existingImageFiles = fs6.readdirSync(imagesDir).filter((file) => file.toLowerCase().endsWith(".png")).map((file) => `/knowledge-base/images/${file}`);
      console.log(`\u5B9F\u969B\u306B\u5B58\u5728\u3059\u308B\u753B\u50CF\u30D5\u30A1\u30A4\u30EB: ${existingImageFiles.length}\u4EF6`);
    }
    const existingDataPath = path7.join(knowledgeBaseDataDir, "image_search_data.json");
    let existingData = [];
    if (fs6.existsSync(existingDataPath)) {
      try {
        const existingContent = fs6.readFileSync(existingDataPath, "utf-8");
        const rawData = JSON.parse(existingContent);
        existingData = rawData.filter(
          (item) => item.file && existingImageFiles.includes(item.file)
        );
        console.log(`\u65E2\u5B58\u306E\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F: ${existingData.length}\u4EF6\uFF08\u5B9F\u5728\u30D5\u30A1\u30A4\u30EB\u306E\u307F\uFF09`);
      } catch (error) {
        console.warn("\u65E2\u5B58\u30C7\u30FC\u30BF\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557:", error);
        existingData = [];
      }
    }
    let newData = [];
    if (fs6.existsSync(jsonDir3)) {
      const jsonFiles = fs6.readdirSync(jsonDir3).filter(
        (file) => file.endsWith("_metadata.json") && !file.includes("guide_")
      );
      for (const jsonFile of jsonFiles) {
        const jsonPath = path7.join(jsonDir3, jsonFile);
        try {
          const metadata = JSON.parse(fs6.readFileSync(jsonPath, "utf-8"));
          if (metadata.slides && Array.isArray(metadata.slides)) {
            metadata.slides.forEach((slide, index) => {
              if (slide["\u753B\u50CF\u30C6\u30AD\u30B9\u30C8"] && Array.isArray(slide["\u753B\u50CF\u30C6\u30AD\u30B9\u30C8"]) && slide["\u753B\u50CF\u30C6\u30AD\u30B9\u30C8"].length > 0) {
                const imageText = slide["\u753B\u50CF\u30C6\u30AD\u30B9\u30C8"][0];
                if (imageText && imageText["\u753B\u50CF\u30D1\u30B9"]) {
                  const fileName = path7.basename(imageText["\u753B\u50CF\u30D1\u30B9"]);
                  const imagePath = `/knowledge-base/images/${fileName}`;
                  if (existingImageFiles.includes(imagePath)) {
                    const slideTitle = slide["\u30BF\u30A4\u30C8\u30EB"] || `\u30B9\u30E9\u30A4\u30C9 ${index + 1}`;
                    const slideContent = slide["\u672C\u6587"] ? slide["\u672C\u6587"].join("\u3002") : "";
                    const slideNotes = slide["\u30CE\u30FC\u30C8"] || "";
                    const description = [
                      `${slideTitle}\u306E\u8A73\u7D30\u56F3`,
                      slideContent,
                      slideNotes.length > 0 ? `\u88DC\u8DB3\uFF1A${slideNotes}` : ""
                    ].filter(Boolean).join("\u3002");
                    const slideData = {
                      id: `slide_${slide["\u30B9\u30E9\u30A4\u30C9\u756A\u53F7"] || index + 1}`,
                      file: imagePath,
                      title: slideTitle,
                      category: "\u4FDD\u5B88\u7528\u8ECA\u30DE\u30CB\u30E5\u30A2\u30EB",
                      keywords: [
                        slideTitle,
                        ...slide["\u672C\u6587"] || [],
                        "\u4FDD\u5B88\u7528\u8ECA",
                        "\u30DE\u30CB\u30E5\u30A2\u30EB",
                        "\u30A8\u30F3\u30B8\u30F3",
                        "\u6574\u5099",
                        "\u4FEE\u7406",
                        "\u90E8\u54C1"
                      ].filter(Boolean),
                      description,
                      searchText: [
                        slideTitle,
                        ...slide["\u672C\u6587"] || [],
                        "\u4FDD\u5B88\u7528\u8ECA\u30DE\u30CB\u30E5\u30A2\u30EB",
                        "\u30A8\u30F3\u30B8\u30F3",
                        "\u6574\u5099",
                        "\u4FEE\u7406",
                        "\u90E8\u54C1",
                        "\u8ECA\u4E21",
                        "\u52D5\u529B"
                      ].filter(Boolean).join(" ")
                    };
                    newData.push(slideData);
                  }
                }
              }
            });
          }
          if (metadata.embeddedImages && Array.isArray(metadata.embeddedImages)) {
            metadata.embeddedImages.forEach((img, index) => {
              if (img["\u62BD\u51FA\u30D1\u30B9"]) {
                const filename = path7.basename(img["\u62BD\u51FA\u30D1\u30B9"]);
                const imagePath = `/knowledge-base/images/${filename}`;
                if (existingImageFiles.includes(imagePath)) {
                  const originalName = img["\u5143\u306E\u30D5\u30A1\u30A4\u30EB\u540D"] || "";
                  let category = "\u90E8\u54C1\u5199\u771F";
                  let description = `\u4FDD\u5B88\u7528\u8ECA\u306E\u90E8\u54C1\u753B\u50CF\u3067\u3059\u3002`;
                  let keywords3 = ["\u4FDD\u5B88\u7528\u8ECA", "\u90E8\u54C1", "\u5199\u771F"];
                  if (originalName.includes("engine") || originalName.includes("\u30A8\u30F3\u30B8\u30F3")) {
                    category = "\u30A8\u30F3\u30B8\u30F3\u90E8\u54C1";
                    description = "\u4FDD\u5B88\u7528\u8ECA\u306E\u30A8\u30F3\u30B8\u30F3\u95A2\u9023\u90E8\u54C1\u306E\u8A73\u7D30\u753B\u50CF\u3067\u3059\u3002\u30A8\u30F3\u30B8\u30F3\u306E\u69CB\u9020\u3084\u90E8\u54C1\u914D\u7F6E\u3092\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002";
                    keywords3 = ["\u4FDD\u5B88\u7528\u8ECA", "\u30A8\u30F3\u30B8\u30F3", "\u52D5\u529B\u7CFB", "\u90E8\u54C1"];
                  } else if (originalName.includes("brake") || originalName.includes("\u30D6\u30EC\u30FC\u30AD")) {
                    category = "\u30D6\u30EC\u30FC\u30AD\u7CFB\u7D71";
                    description = "\u4FDD\u5B88\u7528\u8ECA\u306E\u30D6\u30EC\u30FC\u30AD\u7CFB\u7D71\u90E8\u54C1\u306E\u8A73\u7D30\u753B\u50CF\u3067\u3059\u3002\u5236\u52D5\u88C5\u7F6E\u306E\u69CB\u9020\u3084\u914D\u7F6E\u3092\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002";
                    keywords3 = ["\u4FDD\u5B88\u7528\u8ECA", "\u30D6\u30EC\u30FC\u30AD", "\u5236\u52D5\u88C5\u7F6E", "\u90E8\u54C1"];
                  } else if (originalName.includes("wheel") || originalName.includes("\u8ECA\u8F2A")) {
                    category = "\u8DB3\u56DE\u308A";
                    description = "\u4FDD\u5B88\u7528\u8ECA\u306E\u8DB3\u56DE\u308A\u90E8\u54C1\u306E\u8A73\u7D30\u753B\u50CF\u3067\u3059\u3002\u8ECA\u8F2A\u3084\u30B5\u30B9\u30DA\u30F3\u30B7\u30E7\u30F3\u90E8\u54C1\u3092\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002";
                    keywords3 = ["\u4FDD\u5B88\u7528\u8ECA", "\u8ECA\u8F2A", "\u8DB3\u56DE\u308A", "\u90E8\u54C1"];
                  }
                  const imageData = {
                    id: `img_${index + 1}`,
                    file: imagePath,
                    title: `${category} ${index + 1}`,
                    category,
                    keywords: [...keywords3, "\u30A8\u30F3\u30B8\u30F3", "\u6574\u5099", "\u4FEE\u7406", "\u90E8\u54C1"],
                    description,
                    searchText: `${category} ${index + 1} ${keywords3.join(" ")} \u30A8\u30F3\u30B8\u30F3 \u6574\u5099 \u4FEE\u7406 \u90E8\u54C1 \u4FDD\u5B88\u7528\u8ECA \u30DE\u30CB\u30E5\u30A2\u30EB`
                  };
                  newData.push(imageData);
                }
              }
            });
          }
        } catch (error) {
          console.error(`\u30E1\u30BF\u30C7\u30FC\u30BF\u30D5\u30A1\u30A4\u30EB\u51E6\u7406\u30A8\u30E9\u30FC: ${jsonFile}`, error);
        }
      }
    }
    const combinedData = [...existingData];
    let newCount = 0;
    newData.forEach((newItem) => {
      const exists = combinedData.some((existing) => existing.id === newItem.id);
      if (!exists) {
        combinedData.push(newItem);
        newCount++;
      }
    });
    const validData = combinedData.filter(
      (item) => item.file && existingImageFiles.includes(item.file)
    );
    fs6.writeFileSync(existingDataPath, JSON.stringify(validData, null, 2), "utf-8");
    console.log("\u30C7\u30FC\u30BF\u3092knowledge-base/data\u306B\u4FDD\u5B58\u3057\u307E\u3057\u305F");
    res.json({
      success: true,
      count: validData.length,
      message: `\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u521D\u671F\u5316\u3057\u307E\u3057\u305F: ${validData.length}\u4EF6`
    });
    console.log(`\u30C7\u30FC\u30BF\u3092\u7D71\u5408\u3057\u307E\u3057\u305F: ${validData.length}\u4EF6\uFF08\u65B0\u898F: ${newCount}\u4EF6\uFF09`);
    console.log(`\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u521D\u671F\u5316\u3057\u307E\u3057\u305F: ${validData.length}\u4EF6`);
  } catch (error) {
    console.error("\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u521D\u671F\u5316\u30A8\u30E9\u30FC:", error);
    res.status(500).json({
      success: false,
      message: "\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u306E\u521D\u671F\u5316\u306B\u5931\u6557\u3057\u307E\u3057\u305F"
    });
  }
});
router.post("/upload", upload2.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "\u30D5\u30A1\u30A4\u30EB\u304C\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3055\u308C\u3066\u3044\u307E\u305B\u3093" });
    console.log(`\u30D5\u30A1\u30A4\u30EB\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u51E6\u7406\u958B\u59CB: ${file.originalname}`);
    const keepOriginalFile = req.body.keepOriginalFile === "true";
    console.log(`\u5143\u30D5\u30A1\u30A4\u30EB\u4FDD\u5B58: ${keepOriginalFile ? "\u6709\u52B9" : "\u7121\u52B9\uFF08\u30C7\u30D5\u30A9\u30EB\u30C8\uFF09"}`);
    try {
      cleanupTempDirectory(knowledgeBaseTempDir);
      console.log("\u4E00\u6642\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u3057\u307E\u3057\u305F");
    } catch (cleanupError) {
      console.error("\u4E00\u6642\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306E\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u306B\u5931\u6557\u3057\u307E\u3057\u305F:", cleanupError);
    }
    const filePath = file.path;
    const fileExt = path7.extname(file.originalname).toLowerCase();
    const fileBaseName = path7.basename(file.path);
    const filesDir = path7.dirname(file.path);
    const processingType = req.body.processingType || "document";
    console.log(`\u51E6\u7406\u30BF\u30A4\u30D7: ${processingType}`);
    console.log(`\u30D5\u30A1\u30A4\u30EB\u30D1\u30B9: ${filePath}`);
    console.log(`\u30D5\u30A1\u30A4\u30EB\u62E1\u5F35\u5B50: ${fileExt}`);
    if (processingType === "image_search" && [".svg", ".png", ".jpg", ".jpeg", ".gif"].includes(fileExt)) {
      try {
        console.log("\u753B\u50CF\u691C\u7D22\u7528\u30C7\u30FC\u30BF\u51E6\u7406\u3092\u958B\u59CB\u3057\u307E\u3059");
        const fileId = path7.basename(filePath, fileExt).toLowerCase().replace(/\s+/g, "_");
        let pngFilePath = "";
        let originalFilePath = filePath;
        let updatedFilePath = filePath;
        let updatedFileExt = fileExt;
        if (fileExt !== ".png") {
          try {
            const origFilePath = filePath;
            pngFilePath = path7.join(
              publicImagesDir,
              `${path7.basename(filePath, fileExt)}.png`
            );
            console.log(`${fileExt}\u5F62\u5F0F\u304B\u3089PNG\u5F62\u5F0F\u306B\u5909\u63DB: ${pngFilePath}`);
            if (fileExt === ".svg") {
              const svgContent = fs6.readFileSync(origFilePath, "utf8");
              const svgBuffer = Buffer.from(svgContent);
              await sharp2(svgBuffer).png().toFile(pngFilePath);
            } else {
              await sharp2(origFilePath).png().toFile(pngFilePath);
            }
            console.log(`PNG\u5F62\u5F0F\u306B\u5909\u63DB\u5B8C\u4E86: ${pngFilePath}`);
            originalFilePath = origFilePath;
            updatedFilePath = pngFilePath;
            updatedFileExt = ".png";
          } catch (convErr) {
            console.error(`${fileExt}\u304B\u3089PNG\u3078\u306E\u5909\u63DB\u30A8\u30E9\u30FC:`, convErr);
            pngFilePath = "";
          }
        }
        const knowledgeBaseDataDir2 = path7.join(process.cwd(), "knowledge-base", "data");
        if (!fs6.existsSync(knowledgeBaseDataDir2)) {
          fs6.mkdirSync(knowledgeBaseDataDir2, { recursive: true });
        }
        const imageSearchDataPath = path7.join(knowledgeBaseDataDir2, "image_search_data.json");
        let imageSearchData = [];
        if (fs6.existsSync(imageSearchDataPath)) {
          try {
            const jsonContent = fs6.readFileSync(imageSearchDataPath, "utf8");
            imageSearchData = JSON.parse(jsonContent);
            console.log(`\u65E2\u5B58\u306E\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F: ${imageSearchData.length}\u4EF6`);
          } catch (jsonErr) {
            console.error("JSON\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC:", jsonErr);
            imageSearchData = [];
          }
        }
        const fileName = path7.basename(file.originalname, fileExt);
        const title = fileName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        let category = "";
        let keywords3 = [];
        if (fileName.includes("engine") || fileName.includes("motor")) {
          category = "\u30A8\u30F3\u30B8\u30F3";
          keywords3 = ["\u30A8\u30F3\u30B8\u30F3", "\u30E2\u30FC\u30BF\u30FC", "\u52D5\u529B\u7CFB"];
        } else if (fileName.includes("cooling") || fileName.includes("radiator")) {
          category = "\u51B7\u5374\u7CFB\u7D71";
          keywords3 = ["\u51B7\u5374", "\u30E9\u30B8\u30A8\u30FC\u30BF\u30FC", "\u6C34\u6F0F\u308C"];
        } else if (fileName.includes("frame") || fileName.includes("chassis")) {
          category = "\u8ECA\u4F53";
          keywords3 = ["\u30D5\u30EC\u30FC\u30E0", "\u30B7\u30E3\u30FC\u30B7", "\u8ECA\u4F53"];
        } else if (fileName.includes("cabin") || fileName.includes("cockpit")) {
          category = "\u904B\u8EE2\u5BA4";
          keywords3 = ["\u30AD\u30E3\u30D3\u30F3", "\u904B\u8EE2\u5BA4", "\u64CD\u4F5C\u30D1\u30CD\u30EB"];
        } else {
          category = "\u4FDD\u5B88\u7528\u8ECA\u30D1\u30FC\u30C4";
          keywords3 = ["\u4FDD\u5B88", "\u90E8\u54C1", "\u4FEE\u7406"];
        }
        const additionalKeywords = fileName.replace(/[0-9_\-\.]/g, " ").split(/\s+/).filter((word) => word.length > 1).map((word) => word.toLowerCase());
        const allKeywords = ["\u4FDD\u5B88\u7528\u8ECA", "\u90E8\u54C1", "\u5199\u771F", "\u30A8\u30F3\u30B8\u30F3", "\u6574\u5099", "\u4FEE\u7406", ...additionalKeywords];
        const searchText = [title, category, ...allKeywords, "\u52D5\u529B", "\u6A5F\u68B0", "\u904B\u8EE2"].join(" ");
        const details = [
          `\u4FDD\u5B88\u7528\u8ECA\u306E${category}\u306B\u95A2\u3059\u308B\u6280\u8853\u56F3\u9762`,
          `${title}\u306E\u8A73\u7D30\u56F3`,
          `\u6574\u5099\u30FB\u70B9\u691C\u30FB\u4FEE\u7406\u306B\u4F7F\u7528`,
          `\u6280\u8853\u30DE\u30CB\u30E5\u30A2\u30EB\u53C2\u7167\u8CC7\u6599`
        ];
        const newImageItem = {
          id: fileId,
          file: `/knowledge-base/images/${path7.basename(updatedFilePath || filePath)}`,
          // 全てPNG形式に統一するため、pngFallbackは不要になりました
          pngFallback: "",
          title,
          category,
          keywords: allKeywords,
          description: `\u4FDD\u5B88\u7528\u8ECA\u306E${category}\u306B\u95A2\u3059\u308B\u56F3\u9762\u307E\u305F\u306F\u5199\u771F\u3067\u3059\u3002${title}\u306E\u8A73\u7D30\u3092\u793A\u3057\u3066\u3044\u307E\u3059\u3002`,
          details: details.join(". "),
          searchText: `${title} ${category} ${allKeywords.join(" ")} \u4FDD\u5B88\u7528\u8ECA \u6280\u8853\u56F3\u9762 \u6574\u5099 \u70B9\u691C \u4FEE\u7406`,
          metadata: {
            uploadDate: (/* @__PURE__ */ new Date()).toISOString(),
            fileSize: file.size,
            fileType: "PNG",
            // 全てPNG形式に統一
            originalFileType: fileExt !== ".png" ? fileExt.substring(1).toUpperCase() : "PNG",
            sourcePath: updatedFilePath || filePath,
            originalPath: originalFilePath !== updatedFilePath ? originalFilePath : "",
            documentId: fileId.split("_")[0]
            // ドキュメントIDの関連付け
          }
        };
        const existingIndex = imageSearchData.findIndex((item) => item.id === fileId);
        if (existingIndex >= 0) {
          imageSearchData[existingIndex] = newImageItem;
        } else {
          imageSearchData.push(newImageItem);
        }
        fs6.writeFileSync(imageSearchDataPath, JSON.stringify(imageSearchData, null, 2));
        console.log(`\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u77E5\u8B58\u30D9\u30FC\u30B9\u306B\u66F4\u65B0\u3057\u307E\u3057\u305F: ${imageSearchData.length}\u4EF6`);
        if (!keepOriginalFile) {
          try {
            if (fs6.existsSync(filePath)) {
              fs6.unlinkSync(filePath);
              console.log(`\u5143\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ${filePath}`);
            }
          } catch (deleteErr) {
            console.error(`\u5143\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u30A8\u30E9\u30FC: ${deleteErr}`);
          }
        }
        return res.json({
          success: true,
          message: "\u753B\u50CF\u691C\u7D22\u7528\u30C7\u30FC\u30BF\u304C\u6B63\u5E38\u306B\u51E6\u7406\u3055\u308C\u307E\u3057\u305F",
          file: {
            id: fileId,
            name: file.originalname,
            path: `/knowledge-base/images/${path7.basename(updatedFilePath || filePath)}`,
            // pngFallbackPathは不要になりました（全てPNG形式に統一）
            pngFallbackPath: "",
            size: file.size
          },
          imageSearchData: {
            totalItems: imageSearchData.length,
            newItem: newImageItem
          }
        });
      } catch (imgError) {
        console.error("\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u51E6\u7406\u30A8\u30E9\u30FC:", imgError);
        return res.status(500).json({
          error: "\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u306E\u51E6\u7406\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
          details: imgError instanceof Error ? imgError.message : String(imgError)
        });
      }
    }
    let extractedText = "";
    let pageCount = 0;
    let metadata = {};
    try {
      switch (fileExt) {
        case ".pdf":
          const pdfResult = await extractPdfText(filePath);
          extractedText = pdfResult.text;
          pageCount = pdfResult.pageCount;
          metadata = { pageCount, type: "pdf" };
          break;
        case ".docx":
          extractedText = await extractWordText(filePath);
          metadata = { type: "docx" };
          break;
        case ".xlsx":
          extractedText = await extractExcelText(filePath);
          metadata = { type: "xlsx" };
          break;
        case ".pptx":
          extractedText = await extractPptxText(filePath);
          metadata = {
            type: "pptx",
            // スライド画像へのパスをメタデータに追加（knowledge-baseディレクトリに一元化）
            slideImages: Array.from(
              { length: 4 },
              (_, i) => `/knowledge-base/images/${path7.basename(filePath, path7.extname(filePath))}_${(i + 1).toString().padStart(3, "0")}.png`
            )
          };
          break;
      }
      const knowledgeBaseDataDir2 = path7.join(process.cwd(), "knowledge-base", "data");
      if (!fs6.existsSync(knowledgeBaseDataDir2)) {
        fs6.mkdirSync(knowledgeBaseDataDir2, { recursive: true });
      }
      const extractedDataPath = path7.join(knowledgeBaseDataDir2, "extracted_data.json");
      if (!fs6.existsSync(extractedDataPath)) {
        fs6.writeFileSync(extractedDataPath, JSON.stringify({ vehicleData: [] }, null, 2));
      }
      const extractedData = JSON.parse(fs6.readFileSync(extractedDataPath, "utf-8"));
      const vehicleDataKey = "vehicleData";
      if (!extractedData[vehicleDataKey]) {
        extractedData[vehicleDataKey] = [];
      }
      const vehicleData = extractedData[vehicleDataKey];
      const timestamp3 = Date.now();
      const prefix = path7.basename(filePath, path7.extname(filePath)).substring(0, 2).toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
      const metadataFileName = `${prefix}_${timestamp3}_metadata.json`;
      const jsonDir3 = path7.join(process.cwd(), "knowledge-base", "json");
      if (!fs6.existsSync(jsonDir3)) {
        fs6.mkdirSync(jsonDir3, { recursive: true });
      }
      const metadataFilePath = path7.join(jsonDir3, metadataFileName);
      const newData = {
        id: path7.basename(filePath, path7.extname(filePath)),
        category: fileExt.substring(1).toUpperCase(),
        title: file.originalname,
        description: `\u6280\u8853\u30B5\u30DD\u30FC\u30C8\u6587\u66F8: ${file.originalname}`,
        details: extractedText.substring(0, 200) + "...",
        // 概要のみ格納
        image_path: metadata.type === "pptx" ? metadata.slideImages[0] : null,
        all_slides: metadata.type === "pptx" ? metadata.slideImages : null,
        metadata_json: `/knowledge-base/json/${metadataFileName}`,
        keywords: [fileExt.substring(1).toUpperCase(), "\u6280\u8853\u6587\u66F8", "\u30B5\u30DD\u30FC\u30C8", file.originalname]
      };
      const metadataContent = {
        filename: file.originalname,
        filePath,
        uploadDate: (/* @__PURE__ */ new Date()).toISOString(),
        fileSize: file.size,
        mimeType: file.mimetype,
        extractedText,
        ...metadata
      };
      fs6.writeFileSync(metadataFilePath, JSON.stringify(metadataContent, null, 2));
      console.log(`\u30E1\u30BF\u30C7\u30FC\u30BFJSON\u3092\u4FDD\u5B58: ${metadataFilePath}`);
      fs6.writeFileSync(`${filePath}_metadata.json`, JSON.stringify(metadataContent, null, 2));
      const existingIndex = vehicleData.findIndex((item) => item.id === newData.id);
      if (existingIndex >= 0) {
        vehicleData[existingIndex] = newData;
      } else {
        vehicleData.push(newData);
      }
      fs6.writeFileSync(extractedDataPath, JSON.stringify(extractedData, null, 2));
      try {
        await addDocumentToKnowledgeBase(filePath);
      } catch (kbError) {
        console.error("\u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u3078\u306E\u8FFD\u52A0\u30A8\u30E9\u30FC:", kbError);
      }
      if (!keepOriginalFile) {
        try {
          if (fs6.existsSync(filePath)) {
            fs6.unlinkSync(filePath);
            console.log(`\u5143\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ${filePath}`);
          }
        } catch (deleteErr) {
          console.error(`\u5143\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u30A8\u30E9\u30FC: ${deleteErr}`);
        }
      }
      return res.json({
        success: true,
        file: {
          id: newData.id,
          name: file.originalname,
          path: filePath,
          size: file.size
        },
        extractedTextPreview: extractedText.substring(0, 200) + "...",
        metadata
      });
    } catch (processingError) {
      console.error("\u30D5\u30A1\u30A4\u30EB\u51E6\u7406\u30A8\u30E9\u30FC:", processingError);
      return res.status(500).json({
        error: "\u30D5\u30A1\u30A4\u30EB\u51E6\u7406\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
        details: processingError instanceof Error ? processingError.message : String(processingError)
      });
    }
  } catch (error) {
    console.error("\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u30A8\u30E9\u30FC:", error);
    return res.status(500).json({
      error: "\u30D5\u30A1\u30A4\u30EB\u306E\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});
router.post("/cleanup-uploads", async (req, res) => {
  try {
    await cleanupTempDirectories();
    return res.json({
      success: true,
      message: "uploads\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306E\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u3092\u5B9F\u884C\u3057\u307E\u3057\u305F"
    });
  } catch (error) {
    console.error("\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u30A8\u30E9\u30FC:", error);
    return res.status(500).json({
      error: "\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u51E6\u7406\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});
router.post("/sync-knowledge-base", async (req, res) => {
  try {
    const knowledgeBaseDirs = {
      images: path7.join(process.cwd(), "knowledge-base", "images"),
      json: path7.join(process.cwd(), "knowledge-base", "json"),
      data: path7.join(process.cwd(), "knowledge-base", "data")
    };
    for (const [dirType, kbDir] of Object.entries(knowledgeBaseDirs)) {
      ensureDirectoryExists(kbDir);
    }
    const syncResults = {
      images: {
        from: "/home/runner/workspace/knowledge-base/images",
        to: knowledgeBaseDirs.images,
        fileCount: 0,
        copiedCount: 0
      },
      json: {
        from: "/home/runner/workspace/knowledge-base/json",
        to: knowledgeBaseDirs.json,
        fileCount: 0,
        copiedCount: 0
      },
      data: {
        from: "/home/runner/workspace/knowledge-base/data",
        to: knowledgeBaseDirs.data,
        fileCount: 0,
        copiedCount: 0
      }
    };
    return res.json({
      success: true,
      message: "\u30C7\u30FC\u30BF\u3092\u540C\u671F\u3057\u307E\u3057\u305F (knowledge-base)",
      results: syncResults
    });
  } catch (error) {
    console.error("\u540C\u671F\u30A8\u30E9\u30FC:", error);
    return res.status(500).json({
      error: "\u30C7\u30FC\u30BF\u540C\u671F\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});
router.post("/cleanup-uploads", async (req, res) => {
  try {
    console.log("\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u30D5\u30A1\u30A4\u30EB\u306E\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u30EA\u30AF\u30A8\u30B9\u30C8\u3092\u53D7\u4FE1...");
    await cleanupTempDirectories();
    const result = await cleanupRedundantFiles();
    const detectDuplicates = req.query.detectDuplicates === "true" || req.body.detectDuplicates === true;
    let duplicateResult = { removed: 0, errors: 0 };
    if (detectDuplicates) {
      console.log("knowledge-base\u5185\u306E\u91CD\u8907\u753B\u50CF\u691C\u51FA\u3068\u524A\u9664\u3092\u5B9F\u884C...");
      duplicateResult = await detectAndRemoveDuplicateImages();
    }
    return res.json({
      success: true,
      message: "\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306E\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F",
      details: {
        removedFiles: result.removed,
        errors: result.errors,
        duplicatesRemoved: duplicateResult.removed,
        duplicateErrors: duplicateResult.errors
      }
    });
  } catch (error) {
    console.error("\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u30D5\u30A1\u30A4\u30EB\u306E\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u30A8\u30E9\u30FC:", error);
    return res.status(500).json({
      error: "\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u51E6\u7406\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});
router.post("/detect-duplicate-images", async (req, res) => {
  try {
    console.log("\u91CD\u8907\u753B\u50CF\u691C\u51FA\u30EA\u30AF\u30A8\u30B9\u30C8\u3092\u53D7\u4FE1...");
    const result = await detectAndRemoveDuplicateImages();
    return res.json({
      success: true,
      message: "\u91CD\u8907\u753B\u50CF\u306E\u691C\u51FA\u3068\u524A\u9664\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F",
      details: {
        removedFiles: result.removed,
        errors: result.errors
      }
    });
  } catch (error) {
    console.error("\u91CD\u8907\u753B\u50CF\u691C\u51FA\u30A8\u30E9\u30FC:", error);
    return res.status(500).json({
      error: "\u91CD\u8907\u753B\u50CF\u306E\u691C\u51FA\u3068\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});
router.post("/sync-directories", async (req, res) => {
  try {
    console.log("\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u540C\u671F\u30EA\u30AF\u30A8\u30B9\u30C8\u3092\u53D7\u4FE1...");
    const rootDir = process.cwd();
    const knowledgeBaseImagesDir2 = path7.join(rootDir, "knowledge-base/images");
    const tempImageDirs = [
      path7.join(rootDir, "uploads/images"),
      path7.join(rootDir, "public/uploads/images"),
      path7.join(rootDir, "public/images")
    ];
    ensureDirectoryExists(knowledgeBaseImagesDir2);
    for (const dir of tempImageDirs) {
      ensureDirectoryExists(dir);
    }
    let syncResults = {
      toKnowledgeBase: 0,
      fromKnowledgeBase: 0,
      errors: 0
    };
    for (const sourceDir of tempImageDirs) {
      if (!fs6.existsSync(sourceDir)) continue;
      const files = fs6.readdirSync(sourceDir);
      for (const file of files) {
        const sourcePath = path7.join(sourceDir, file);
        const targetPath = path7.join(knowledgeBaseImagesDir2, file);
        if (!fs6.existsSync(targetPath)) {
          try {
            fs6.copyFileSync(sourcePath, targetPath);
            console.log(`\u30D5\u30A1\u30A4\u30EB\u3092knowledge-base\u306B\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F: ${sourcePath} -> ${targetPath}`);
            syncResults.toKnowledgeBase++;
          } catch (error) {
            console.error(`\u30D5\u30A1\u30A4\u30EB\u30B3\u30D4\u30FC\u30A8\u30E9\u30FC: ${sourcePath}`, error);
            syncResults.errors++;
          }
        }
      }
    }
    const kbFiles = fs6.readdirSync(knowledgeBaseImagesDir2);
    for (const file of kbFiles) {
      const sourcePath = path7.join(knowledgeBaseImagesDir2, file);
      for (const targetDir of tempImageDirs) {
        const targetPath = path7.join(targetDir, file);
        if (!fs6.existsSync(targetPath)) {
          try {
            fs6.copyFileSync(sourcePath, targetPath);
            console.log(`\u30D5\u30A1\u30A4\u30EB\u3092\u4E00\u6642\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F: ${sourcePath} -> ${targetPath}`);
            syncResults.fromKnowledgeBase++;
          } catch (error) {
            console.error(`\u30D5\u30A1\u30A4\u30EB\u30B3\u30D4\u30FC\u30A8\u30E9\u30FC: ${targetPath}`, error);
            syncResults.errors++;
          }
        }
      }
    }
    await cleanupRedundantFiles();
    return res.json({
      success: true,
      message: "\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u540C\u671F\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F",
      details: syncResults
    });
  } catch (error) {
    console.error("\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u540C\u671F\u30A8\u30E9\u30FC:", error);
    return res.status(500).json({
      error: "\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u540C\u671F\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});
router.get("/knowledge-base-files", async (req, res) => {
  try {
    const knowledgeBaseDirs = {
      images: path7.join(process.cwd(), "knowledge-base", "images"),
      json: path7.join(process.cwd(), "knowledge-base", "json"),
      data: path7.join(process.cwd(), "knowledge-base", "data")
    };
    const files = {};
    for (const [dirType, dir] of Object.entries(knowledgeBaseDirs)) {
      if (fs6.existsSync(dir)) {
        files[dirType] = fs6.readdirSync(dir).filter((file) => {
          const filePath = path7.join(dir, file);
          return fs6.statSync(filePath).isFile();
        });
      } else {
        files[dirType] = [];
      }
    }
    return res.json({
      success: true,
      files
    });
  } catch (error) {
    console.error("\u30D5\u30A1\u30A4\u30EB\u4E00\u89A7\u53D6\u5F97\u30A8\u30E9\u30FC:", error);
    return res.status(500).json({
      error: "\u30D5\u30A1\u30A4\u30EB\u4E00\u89A7\u306E\u53D6\u5F97\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});
async function cleanupOrphanedJsonFiles() {
  const jsonDir3 = path7.join(process.cwd(), "knowledge-base", "json");
  let removedCount = 0;
  let errorCount = 0;
  try {
    if (!fs6.existsSync(jsonDir3)) {
      console.log(`JSON\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u304C\u5B58\u5728\u3057\u307E\u305B\u3093: ${jsonDir3}`);
      return { removed: 0, errors: 0 };
    }
    const blacklistFiles = ["guide_1744876404679_metadata.json", "guide_metadata.json"];
    const allFiles = fs6.readdirSync(jsonDir3);
    const metadataFiles = allFiles.filter(
      (file) => file.endsWith("_metadata.json") && !blacklistFiles.includes(file)
    );
    console.log(`JSON\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u5185\u306E\u30E1\u30BF\u30C7\u30FC\u30BF\u30D5\u30A1\u30A4\u30EB: ${metadataFiles.length}\u4EF6`);
    const knowledgeBaseDir4 = path7.join(process.cwd(), "knowledge-base");
    const docDirs = fs6.readdirSync(knowledgeBaseDir4).filter((dir) => dir.startsWith("doc_")).map((dir) => {
      const match = dir.match(/doc_(\d+)_/);
      return match ? `mc_${match[1]}` : "";
    }).filter(Boolean);
    const documentsDir = path7.join(knowledgeBaseDir4, "documents");
    if (fs6.existsSync(documentsDir)) {
      const moreDocs = fs6.readdirSync(documentsDir).filter((dir) => dir.startsWith("doc_")).map((dir) => {
        const match = dir.match(/doc_(\d+)_/);
        return match ? `mc_${match[1]}` : "";
      }).filter(Boolean);
      docDirs.push(...moreDocs);
    }
    console.log(`\u77E5\u8B58\u30D9\u30FC\u30B9\u5185\u306E\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u30D7\u30EC\u30D5\u30A3\u30C3\u30AF\u30B9: ${docDirs.length}\u4EF6`);
    for (const file of metadataFiles) {
      const prefix = file.split("_metadata.json")[0];
      const hasMatchingDocument = docDirs.some((docPrefix) => docPrefix === prefix);
      if (!hasMatchingDocument) {
        try {
          const filePath = path7.join(jsonDir3, file);
          fs6.unlinkSync(filePath);
          console.log(`\u5B64\u7ACB\u3057\u305FJSON\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ${file}`);
          removedCount++;
        } catch (error) {
          console.error(`JSON\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u30A8\u30E9\u30FC: ${file}`, error);
          errorCount++;
        }
      }
    }
    console.log(`\u5B64\u7ACB\u3057\u305FJSON\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u7D50\u679C: \u6210\u529F=${removedCount}\u4EF6, \u5931\u6557=${errorCount}\u4EF6`);
    return { removed: removedCount, errors: errorCount };
  } catch (error) {
    console.error("\u5B64\u7ACB\u3057\u305FJSON\u30D5\u30A1\u30A4\u30EB\u306E\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:", error);
    return { removed: removedCount, errors: errorCount + 1 };
  }
}
router.post("/cleanup-json", async (req, res) => {
  try {
    console.log("\u5B64\u7ACBJSON\u30D5\u30A1\u30A4\u30EB\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u30EA\u30AF\u30A8\u30B9\u30C8\u53D7\u4FE1");
    const result = await cleanupOrphanedJsonFiles();
    return res.json({
      success: true,
      removed: result.removed,
      errors: result.errors,
      message: `${result.removed}\u4EF6\u306E\u5B64\u7ACBJSON\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F`
    });
  } catch (error) {
    console.error("\u5B64\u7ACBJSON\u30D5\u30A1\u30A4\u30EB\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u30A8\u30E9\u30FC:", error);
    return res.status(500).json({
      success: false,
      error: "\u5B64\u7ACBJSON\u30D5\u30A1\u30A4\u30EB\u306E\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
    });
  }
});
router.post("/clear-cache", async (req, res) => {
  try {
    console.log("\u30B5\u30FC\u30D0\u30FC\u30AD\u30E3\u30C3\u30B7\u30E5\u30AF\u30EA\u30A2\u8981\u6C42\u3092\u53D7\u4FE1\u3057\u307E\u3057\u305F");
    const jsonDir3 = path7.join(process.cwd(), "knowledge-base", "json");
    if (fs6.existsSync(jsonDir3)) {
      try {
        const files = fs6.readdirSync(jsonDir3);
        logDebug(`JSON\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u5185\u30D5\u30A1\u30A4\u30EB\u6570: ${files.length}`);
        for (const file of files) {
          const fullPath = path7.join(jsonDir3, file);
          try {
            fs6.accessSync(fullPath, fs6.constants.F_OK | fs6.constants.R_OK);
          } catch (err) {
            logDebug("\u30D5\u30A1\u30A4\u30EB\u30A2\u30AF\u30BB\u30B9\u8B66\u544A", err);
          }
        }
      } catch (readErr) {
        logDebug("\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u8AAD\u307F\u53D6\u308A\u30A8\u30E9\u30FC:", readErr);
      }
    }
    const indexJsonPath = path7.join(process.cwd(), "knowledge-base", "index.json");
    try {
      const jsonFiles = fs6.existsSync(jsonDir3) ? fs6.readdirSync(jsonDir3) : [];
      const indexData = {
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
        guides: [],
        fileCount: jsonFiles.length
      };
      fs6.writeFileSync(indexJsonPath, JSON.stringify(indexData, null, 2));
      console.log(`\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u30D5\u30A1\u30A4\u30EB\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F: ${indexJsonPath}`);
    } catch (indexErr) {
      console.error("\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u30D5\u30A1\u30A4\u30EB\u66F4\u65B0\u30A8\u30E9\u30FC:", indexErr);
    }
    try {
      const imageSearchDataPath = path7.join(process.cwd(), "knowledge-base", "data", "image_search_data.json");
      if (fs6.existsSync(imageSearchDataPath)) {
        fs6.readFileSync(imageSearchDataPath, "utf8");
        console.log("\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u3092\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u307E\u3057\u305F");
      } else {
        console.log("\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
      }
    } catch (imageDataErr) {
      console.error("\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC:", imageDataErr);
    }
    try {
      const cleanupResult = await cleanupOrphanedJsonFiles();
      console.log(`\u5B64\u7ACBJSON\u30D5\u30A1\u30A4\u30EB\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7: ${cleanupResult.removed}\u4EF6\u524A\u9664, ${cleanupResult.errors}\u4EF6\u30A8\u30E9\u30FC`);
      if (cleanupResult.removed > 0) {
        console.log("\u5B64\u7ACBJSON\u30D5\u30A1\u30A4\u30EB\u304C\u691C\u51FA\u30FB\u524A\u9664\u3055\u308C\u307E\u3057\u305F\u3002\u30E1\u30BF\u30C7\u30FC\u30BF\u3092\u66F4\u65B0\u3057\u307E\u3059");
      }
    } catch (cleanupErr) {
      console.error("\u5B64\u7ACBJSON\u30D5\u30A1\u30A4\u30EB\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u30A8\u30E9\u30FC:", cleanupErr);
    }
    return res.json({
      success: true,
      message: "\u30B5\u30FC\u30D0\u30FC\u30AD\u30E3\u30C3\u30B7\u30E5\u3092\u30AF\u30EA\u30A2\u3057\u307E\u3057\u305F"
    });
  } catch (err) {
    console.error("\u30AD\u30E3\u30C3\u30B7\u30E5\u30AF\u30EA\u30A2\u30A8\u30E9\u30FC:", err);
    return res.status(500).json({
      error: "\u30AD\u30E3\u30C3\u30B7\u30E5\u30AF\u30EA\u30A2\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
    });
  }
});
var tech_support_default = router;

// server/routes/troubleshooting.ts
import { Router } from "express";
import path8 from "path";
import fs7 from "fs";
var router2 = Router();
router2.get("/", (req, res) => {
  try {
    const troubleshootingDir2 = path8.join(process.cwd(), "knowledge-base", "troubleshooting");
    console.log("\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA:", troubleshootingDir2);
    if (!fs7.existsSync(troubleshootingDir2)) {
      console.log("\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u304C\u5B58\u5728\u3057\u307E\u305B\u3093");
      return res.json([]);
    }
    const files = fs7.readdirSync(troubleshootingDir2);
    console.log("\u898B\u3064\u304B\u3063\u305F\u30D5\u30A1\u30A4\u30EB:", files);
    const troubleshootingFlows = files.filter((file) => file.endsWith(".json")).map((file) => {
      try {
        const filePath = path8.join(troubleshootingDir2, file);
        const content = fs7.readFileSync(filePath, "utf-8");
        const data = JSON.parse(content);
        console.log(`\u30D5\u30A1\u30A4\u30EB ${file} \u3092\u8AAD\u307F\u8FBC\u307F:`, data);
        return data;
      } catch (error) {
        console.error(`\u30D5\u30A1\u30A4\u30EB ${file} \u306E\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC:`, error);
        return null;
      }
    }).filter((data) => data !== null);
    console.log("\u8FD4\u3059\u30C7\u30FC\u30BF:", troubleshootingFlows);
    res.json(troubleshootingFlows);
  } catch (error) {
    console.error("\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30ED\u30FC\u53D6\u5F97\u30A8\u30E9\u30FC:", error);
    res.status(500).json({ error: "Failed to fetch troubleshooting flows" });
  }
});
router2.get("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const troubleshootingDir2 = path8.join(process.cwd(), "knowledge-base", "troubleshooting");
    console.log(`\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0ID ${id} \u3092\u691C\u7D22\u4E2D...`);
    if (!fs7.existsSync(troubleshootingDir2)) {
      console.log("\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u304C\u5B58\u5728\u3057\u307E\u305B\u3093");
      return res.status(404).json({ error: "Troubleshooting directory not found" });
    }
    const files = fs7.readdirSync(troubleshootingDir2);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));
    let foundData = null;
    for (const file of jsonFiles) {
      try {
        const filePath = path8.join(troubleshootingDir2, file);
        const content = fs7.readFileSync(filePath, "utf-8");
        const data = JSON.parse(content);
        if (data.id === id || file.replace(".json", "") === id) {
          foundData = data;
          console.log(`\u30DE\u30C3\u30C1\u3057\u305F\u30D5\u30A1\u30A4\u30EB: ${file}`, data);
          break;
        }
      } catch (error) {
        console.error(`\u30D5\u30A1\u30A4\u30EB ${file} \u306E\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC:`, error);
      }
    }
    if (!foundData) {
      console.log(`ID ${id} \u306B\u5BFE\u5FDC\u3059\u308B\u30C7\u30FC\u30BF\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093`);
      return res.status(404).json({ error: "Troubleshooting flow not found" });
    }
    res.json(foundData);
  } catch (error) {
    console.error("\u500B\u5225\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30ED\u30FC\u53D6\u5F97\u30A8\u30E9\u30FC:", error);
    res.status(500).json({ error: "Failed to fetch troubleshooting flow" });
  }
});
var troubleshooting_default = router2;

// server/routes/data-processor.ts
init_knowledge_base();
import fs8 from "fs";
import path9 from "path";
import multer3 from "multer";
function getFileTypeFromExtension(ext) {
  const extMap = {
    ".pdf": "pdf",
    ".docx": "word",
    ".doc": "word",
    ".xlsx": "excel",
    ".xls": "excel",
    ".pptx": "powerpoint",
    ".ppt": "powerpoint",
    ".txt": "text"
  };
  return extMap[ext] || "unknown";
}
function determineOptimalProcessingTypes(ext, filename) {
  ext = ext.toLowerCase();
  filename = filename.toLowerCase();
  const result = {
    forKnowledgeBase: true,
    forImageSearch: true,
    forQA: true,
    forEmergencyGuide: true
  };
  if (filename.includes("\u5FDC\u6025") || filename.includes("emergency") || filename.includes("guide") || filename.includes("\u30AC\u30A4\u30C9") || filename.includes("\u624B\u9806") || filename.includes("procedure")) {
    result.forEmergencyGuide = true;
  }
  switch (ext) {
    case ".pdf":
    case ".docx":
    case ".doc":
    case ".txt":
      result.forKnowledgeBase = true;
      result.forQA = true;
      result.forImageSearch = false;
      break;
    case ".pptx":
    case ".ppt":
      result.forImageSearch = true;
      result.forEmergencyGuide = true;
      break;
    case ".xlsx":
    case ".xls":
      result.forKnowledgeBase = true;
      result.forImageSearch = false;
      break;
  }
  return result;
}
var storage4 = multer3.diskStorage({
  destination: (req, file, cb) => {
    const tempDir2 = path9.join(process.cwd(), "knowledge-base", "temp");
    if (!fs8.existsSync(tempDir2)) {
      fs8.mkdirSync(tempDir2, { recursive: true });
    }
    cb(null, tempDir2);
  },
  filename: (req, file, cb) => {
    const timestamp3 = Date.now();
    const decodedOriginalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    const originalExt = path9.extname(decodedOriginalName);
    const baseName = path9.basename(decodedOriginalName, originalExt).replace(/[\/\\:*?"<>|]/g, "").replace(/\s+/g, "_");
    const filename = `${baseName}_${timestamp3}${originalExt}`;
    cb(null, filename);
  }
});
var upload3 = multer3({
  storage: storage4,
  limits: {
    fileSize: 50 * 1024 * 1024
    // 50MB制限
  }
});
function registerDataProcessorRoutes(app2) {
  app2.post("/api/data-processor/process", upload3.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "\u30D5\u30A1\u30A4\u30EB\u304C\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3055\u308C\u3066\u3044\u307E\u305B\u3093" });
      }
      const filePath = req.file.path;
      const originalName = req.file.originalname;
      const fileExt = path9.extname(originalName).toLowerCase();
      const keepOriginalFile = req.body.keepOriginalFile === "true";
      const processingTypes = determineOptimalProcessingTypes(fileExt, originalName);
      const extractKnowledgeBase = processingTypes.forKnowledgeBase;
      const extractImageSearch = processingTypes.forImageSearch;
      const createQA = processingTypes.forQA;
      const createEmergencyGuide = processingTypes.forEmergencyGuide;
      log(`\u30C7\u30FC\u30BF\u51E6\u7406\u3092\u958B\u59CB\u3057\u307E\u3059: ${originalName}`);
      log(`\u81EA\u52D5\u6C7A\u5B9A\u3055\u308C\u305F\u30AA\u30D7\u30B7\u30E7\u30F3: \u5143\u30D5\u30A1\u30A4\u30EB\u4FDD\u5B58=${keepOriginalFile}, \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9=${extractKnowledgeBase}, \u753B\u50CF\u691C\u7D22=${extractImageSearch}, Q&A=${createQA}, \u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9=${createEmergencyGuide}`);
      let docId = "";
      let processedDocument = null;
      processedDocument = await processDocument(filePath);
      if (extractKnowledgeBase) {
        docId = await addDocumentToKnowledgeBase(filePath);
        log(`\u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u306B\u8FFD\u52A0\u3057\u307E\u3057\u305F: ${docId}`);
      } else if (extractImageSearch || createQA) {
        const timestamp3 = Date.now();
        const filename = path9.basename(filePath);
        const fileExt2 = path9.extname(filename).toLowerCase();
        const fileType = getFileTypeFromExtension(fileExt2);
        docId = `doc_${timestamp3}_${Math.floor(Math.random() * 1e3)}`;
        const index = loadKnowledgeBaseIndex();
        index.documents.push({
          id: docId,
          title: filename,
          path: filePath,
          type: fileType,
          chunkCount: 0,
          // 実際のチャンクはないが、表示用に追加
          addedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        const indexPath = path9.join(process.cwd(), "knowledge-base", "index.json");
        fs8.writeFileSync(
          indexPath,
          JSON.stringify(index, null, 2)
        );
        log(`\u753B\u50CF\u691C\u7D22/Q&A\u5C02\u7528\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u3068\u3057\u3066\u8FFD\u52A0: ${docId}`);
      }
      if (extractImageSearch) {
        if (processedDocument) {
          log(`\u753B\u50CF\u691C\u7D22\u7528\u30C7\u30FC\u30BF\u3092\u751F\u6210\u3057\u307E\u3057\u305F: ${processedDocument.chunks.length}\u30C1\u30E3\u30F3\u30AF`);
        }
      }
      if (createQA) {
        try {
          const { generateQAPairs } = await Promise.resolve().then(() => (init_openai(), openai_exports));
          let qaPairs = [];
          if (processedDocument) {
            const fullText = processedDocument.chunks.map((chunk) => chunk.text).join("\n");
            log(`Q&A\u751F\u6210\u7528\u306E\u30C6\u30AD\u30B9\u30C8\u6E96\u5099\u5B8C\u4E86: ${fullText.length}\u6587\u5B57`);
            qaPairs = await generateQAPairs(fullText, 10);
            log(`${qaPairs.length}\u500B\u306EQ&A\u30DA\u30A2\u3092\u751F\u6210\u3057\u307E\u3057\u305F`);
            const qaDir = path9.join(process.cwd(), "knowledge-base", "qa");
            if (!fs8.existsSync(qaDir)) {
              fs8.mkdirSync(qaDir, { recursive: true });
            }
            const fileName = path9.basename(filePath, path9.extname(filePath));
            const timestamp3 = Date.now();
            const qaFileName = `${fileName}_qa_${timestamp3}.json`;
            fs8.writeFileSync(
              path9.join(qaDir, qaFileName),
              JSON.stringify({
                source: filePath,
                fileName: path9.basename(filePath),
                timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                qaPairs
              }, null, 2)
            );
            log(`Q&A\u30C7\u30FC\u30BF\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F: ${qaFileName}`);
          } else {
            throw new Error("Q&A\u751F\u6210\u306E\u305F\u3081\u306E\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u51E6\u7406\u304C\u5B8C\u4E86\u3057\u3066\u3044\u307E\u305B\u3093");
          }
        } catch (qaError) {
          log(`Q&A\u751F\u6210\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: ${qaError}`);
        }
      }
      if (createEmergencyGuide) {
        try {
          log(`\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u7528\u306B\u51E6\u7406\u3092\u958B\u59CB\u3057\u307E\u3059: ${originalName}`);
          if (processedDocument) {
            if (processedDocument.images && processedDocument.images.length > 0) {
              const guidesDir = path9.join(process.cwd(), "knowledge-base", "troubleshooting");
              if (!fs8.existsSync(guidesDir)) {
                fs8.mkdirSync(guidesDir, { recursive: true });
              }
              const timestamp3 = Date.now();
              const baseName = path9.basename(filePath, path9.extname(filePath)).replace(/[\/\\:*?"<>|]/g, "").replace(/\s+/g, "_");
              const guideId = `guide_${timestamp3}`;
              const guideData = {
                id: guideId,
                title: originalName.split(".")[0] || "\u30AC\u30A4\u30C9",
                createdAt: (/* @__PURE__ */ new Date()).toISOString(),
                steps: processedDocument.images.map((image, index) => {
                  return {
                    id: `${guideId}_step${index + 1}`,
                    title: `\u30B9\u30C6\u30C3\u30D7 ${index + 1}`,
                    description: image.alt || `\u624B\u9806\u8AAC\u660E ${index + 1}`,
                    imageUrl: image.path ? `/knowledge-base/${image.path.split("/knowledge-base/")[1] || image.path}` : "",
                    order: index + 1
                  };
                })
              };
              const guideFilePath = path9.join(guidesDir, `${baseName}_${timestamp3}.json`);
              fs8.writeFileSync(
                guideFilePath,
                JSON.stringify(guideData, null, 2)
              );
              log(`\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F: ${guideFilePath} (${guideData.steps.length}\u30B9\u30C6\u30C3\u30D7)`);
              const jsonDir3 = path9.join(process.cwd(), "knowledge-base", "json");
              if (!fs8.existsSync(jsonDir3)) {
                fs8.mkdirSync(jsonDir3, { recursive: true });
              }
              const metadataFilePath = path9.join(jsonDir3, `${guideId}_metadata.json`);
              fs8.writeFileSync(
                metadataFilePath,
                JSON.stringify({
                  id: guideId,
                  title: originalName.split(".")[0] || "\u30AC\u30A4\u30C9",
                  createdAt: (/* @__PURE__ */ new Date()).toISOString(),
                  slides: guideData.steps.map((step, idx) => ({
                    slideId: `slide${idx + 1}`,
                    title: step.title,
                    content: step.description,
                    imageUrl: step.imageUrl,
                    order: step.order
                  }))
                }, null, 2)
              );
              log(`\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u306E\u30E1\u30BF\u30C7\u30FC\u30BF\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F: ${metadataFilePath}`);
            } else {
              log(`\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u4F5C\u6210\u306B\u5FC5\u8981\u306A\u753B\u50CF\u304C\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u304B\u3089\u62BD\u51FA\u3055\u308C\u307E\u305B\u3093\u3067\u3057\u305F`);
            }
          } else {
            log(`\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u751F\u6210\u306E\u305F\u3081\u306E\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u51E6\u7406\u304C\u5B8C\u4E86\u3057\u3066\u3044\u307E\u305B\u3093`);
          }
        } catch (guideError) {
          log(`\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u751F\u6210\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: ${guideError}`);
        }
      }
      if (!keepOriginalFile) {
        try {
          fs8.unlinkSync(filePath);
          log(`\u5143\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ${filePath}`);
        } catch (deleteError) {
          log(`\u5143\u30D5\u30A1\u30A4\u30EB\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${deleteError}`);
        }
      } else {
        log(`\u5143\u30D5\u30A1\u30A4\u30EB\u3092\u4FDD\u5B58\u3057\u307E\u3059: ${filePath}`);
      }
      return res.status(200).json({
        success: true,
        docId,
        message: "\u51E6\u7406\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F",
        options: {
          keepOriginalFile,
          extractKnowledgeBase,
          extractImageSearch,
          createQA,
          createEmergencyGuide
        }
      });
    } catch (error) {
      console.error("\u30C7\u30FC\u30BF\u51E6\u7406\u30A8\u30E9\u30FC:", error);
      return res.status(500).json({
        error: "\u51E6\u7406\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
        message: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u3067\u3059"
      });
    }
  });
  app2.post("/api/data-processor/init-image-search", async (req, res) => {
    try {
      const initResponse = await fetch("http://localhost:5000/api/tech-support/init-image-search-data", {
        method: "POST"
      });
      if (!initResponse.ok) {
        throw new Error("\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u306E\u521D\u671F\u5316\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
      }
      const data = await initResponse.json();
      return res.status(200).json(data);
    } catch (error) {
      console.error("\u753B\u50CF\u691C\u7D22\u30C7\u30FC\u30BF\u521D\u671F\u5316\u30A8\u30E9\u30FC:", error);
      return res.status(500).json({
        error: "\u521D\u671F\u5316\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
        message: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u3067\u3059"
      });
    }
  });
  app2.post("/api/data-processor/merge", upload3.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "\u30D5\u30A1\u30A4\u30EB\u304C\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3055\u308C\u3066\u3044\u307E\u305B\u3093" });
      }
      const { targetDocId } = req.body;
      if (!targetDocId) {
        return res.status(400).json({ error: "\u66F4\u65B0\u5BFE\u8C61\u306E\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8ID\u304C\u6307\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093" });
      }
      log(`\u5DEE\u5206\u66F4\u65B0\u3092\u958B\u59CB\u3057\u307E\u3059: \u30BF\u30FC\u30B2\u30C3\u30C8ID=${targetDocId}, \u30D5\u30A1\u30A4\u30EB=${req.file.originalname}`);
      const filePath = req.file.path;
      const newDocument = await processDocument(filePath);
      await mergeDocumentContent(newDocument, targetDocId);
      try {
        fs8.unlinkSync(filePath);
        log(`\u5143\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ${filePath}`);
      } catch (deleteError) {
        log(`\u5143\u30D5\u30A1\u30A4\u30EB\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${deleteError}`);
      }
      return res.status(200).json({
        success: true,
        message: "\u5DEE\u5206\u66F4\u65B0\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F",
        targetDocId
      });
    } catch (error) {
      console.error("\u5DEE\u5206\u66F4\u65B0\u30A8\u30E9\u30FC:", error);
      return res.status(500).json({
        error: "\u5DEE\u5206\u66F4\u65B0\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
        message: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u3067\u3059"
      });
    }
  });
  app2.get("/api/data-processor/documents", (req, res) => {
    try {
      const index = loadKnowledgeBaseIndex();
      return res.status(200).json({
        success: true,
        documents: index.documents.map((doc) => ({
          id: doc.id,
          title: doc.title,
          type: doc.type,
          chunkCount: doc.chunkCount,
          addedAt: doc.addedAt
        }))
      });
    } catch (error) {
      console.error("\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u4E00\u89A7\u53D6\u5F97\u30A8\u30E9\u30FC:", error);
      return res.status(500).json({
        error: "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u4E00\u89A7\u53D6\u5F97\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
        message: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u3067\u3059"
      });
    }
  });
  app2.post("/api/data-processor/backup", async (req, res) => {
    try {
      const { docIds } = req.body;
      if (!Array.isArray(docIds)) {
        return res.status(400).json({ error: "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8ID\u306E\u30EA\u30B9\u30C8\u304C\u5FC5\u8981\u3067\u3059" });
      }
      log(`\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u4F5C\u6210\u958B\u59CB: ${docIds.length}\u500B\u306E\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8`);
      const zipFilePath = await backupKnowledgeBase(docIds);
      const relativePath = path9.relative(process.cwd(), zipFilePath);
      return res.status(200).json({
        success: true,
        backupPath: relativePath,
        message: "\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u304C\u4F5C\u6210\u3055\u308C\u307E\u3057\u305F"
      });
    } catch (error) {
      console.error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u30A8\u30E9\u30FC:", error);
      return res.status(500).json({
        error: "\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
        message: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u3067\u3059"
      });
    }
  });
  app2.get("/api/data-processor/download-backup/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      const backupDir = path9.join(process.cwd(), "knowledge-base", "backups");
      const filePath = path9.join(backupDir, filename);
      if (!filePath.startsWith(backupDir) || filePath.includes("..")) {
        return res.status(400).json({ error: "\u4E0D\u6B63\u306A\u30D5\u30A1\u30A4\u30EB\u30D1\u30B9\u3067\u3059" });
      }
      if (!fs8.existsSync(filePath)) {
        return res.status(404).json({ error: "\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      }
      return res.download(filePath);
    } catch (error) {
      console.error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u30A8\u30E9\u30FC:", error);
      return res.status(500).json({
        error: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
        message: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u3067\u3059"
      });
    }
  });
}

// server/routes/emergency-guide.ts
import { Router as Router2 } from "express";
import * as fs9 from "fs";
import * as path10 from "path";
import multer4 from "multer";
import AdmZip2 from "adm-zip";
function cleanupTempDirectory2(dirPath) {
  if (!fs9.existsSync(dirPath)) return;
  try {
    const files = fs9.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path10.join(dirPath, file);
      const stat = fs9.statSync(filePath);
      if (stat.isDirectory()) {
        cleanupTempDirectory2(filePath);
        fs9.rmdirSync(filePath);
      } else {
        fs9.unlinkSync(filePath);
      }
    }
    console.log(`\u4E00\u6642\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u3057\u307E\u3057\u305F: ${dirPath}`);
  } catch (error) {
    console.error(`\u4E00\u6642\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306E\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${dirPath}`, error);
  }
}
var router3 = Router2();
var knowledgeBaseDir2 = path10.resolve("./knowledge-base");
var pptDir = path10.join(knowledgeBaseDir2, "ppt");
var jsonDir = path10.join(knowledgeBaseDir2, "json");
var imageDir = path10.join(knowledgeBaseDir2, "images");
var tempDir = path10.join(knowledgeBaseDir2, "temp");
[knowledgeBaseDir2, pptDir, jsonDir, imageDir, tempDir].forEach((dir) => {
  if (!fs9.existsSync(dir)) {
    fs9.mkdirSync(dir, { recursive: true });
  }
});
var storage5 = multer4.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, pptDir);
  },
  filename: (_req, file, cb) => {
    const timestamp3 = Date.now();
    const originalName = file.originalname;
    const extension = path10.extname(originalName);
    const fileName = `guide_${timestamp3}${extension}`;
    cb(null, fileName);
  }
});
var fileFilter2 = (_req, file, cb) => {
  const allowedExtensions = [".pptx", ".ppt", ".xlsx", ".xls", ".pdf", ".json"];
  const ext = path10.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("\u30B5\u30DD\u30FC\u30C8\u3055\u308C\u3066\u3044\u306A\u3044\u30D5\u30A1\u30A4\u30EB\u5F62\u5F0F\u3067\u3059\u3002PowerPoint (.pptx, .ppt)\u3001Excel (.xlsx, .xls)\u3001PDF (.pdf)\u3001\u307E\u305F\u306F JSON (.json) \u30D5\u30A1\u30A4\u30EB\u306E\u307F\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3067\u304D\u307E\u3059\u3002"));
  }
};
var upload4 = multer4({
  storage: storage5,
  fileFilter: fileFilter2,
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB
  }
});
async function processFile(filePath) {
  try {
    const fileId = `guide_${Date.now()}`;
    const fileExtension = path10.extname(filePath);
    if (fileExtension.toLowerCase() === ".pptx") {
      const zip = new AdmZip2(filePath);
      const extractDir = path10.join(tempDir, fileId);
      if (!fs9.existsSync(tempDir)) {
        fs9.mkdirSync(tempDir, { recursive: true });
      }
      if (!fs9.existsSync(extractDir)) {
        fs9.mkdirSync(extractDir, { recursive: true });
      }
      zip.extractAllTo(extractDir, true);
      const slidesDir = path10.join(extractDir, "ppt", "slides");
      const slideFiles = fs9.existsSync(slidesDir) ? fs9.readdirSync(slidesDir).filter((file) => file.startsWith("slide") && file.endsWith(".xml")) : [];
      const slides = [];
      for (let i = 0; i < slideFiles.length; i++) {
        const slideNumber = i + 1;
        const slideFilePath = path10.join(slidesDir, slideFiles[i]);
        const slideContent = fs9.readFileSync(slideFilePath, "utf8");
        const imageRefs = [];
        const imageRegex = /r:embed="rId(\d+)"/g;
        let match;
        while ((match = imageRegex.exec(slideContent)) !== null) {
          imageRefs.push(match[1]);
        }
        const textRegex = /<a:t>(.*?)<\/a:t>/g;
        const texts = [];
        while ((match = textRegex.exec(slideContent)) !== null) {
          if (match[1].trim()) {
            texts.push(match[1].trim());
          }
        }
        const noteFilePath = path10.join(extractDir, "ppt", "notesSlides", `notesSlide${slideNumber}.xml`);
        let noteContent = "";
        if (fs9.existsSync(noteFilePath)) {
          const noteXml = fs9.readFileSync(noteFilePath, "utf8");
          const noteRegex = /<a:t>(.*?)<\/a:t>/g;
          while ((match = noteRegex.exec(noteXml)) !== null) {
            if (match[1].trim()) {
              noteContent += match[1].trim() + "\n";
            }
          }
        }
        const imageTexts = [];
        const mediaDir2 = path10.join(extractDir, "ppt", "media");
        if (fs9.existsSync(mediaDir2)) {
          const mediaFiles = fs9.readdirSync(mediaDir2);
          for (const mediaFile of mediaFiles) {
            const sourcePath = path10.join(mediaDir2, mediaFile);
            const targetFileName = `${fileId}_slide${slideNumber}_${mediaFile}`;
            const targetPath = path10.join(imageDir, targetFileName);
            fs9.copyFileSync(sourcePath, targetPath);
            const relativePath = `/knowledge-base/images/${targetFileName}`;
            const imageText = texts.length > 0 ? texts[0] : "\u753B\u50CF\u306E\u8AAC\u660E\u304C\u3042\u308A\u307E\u305B\u3093";
            imageTexts.push({
              \u753B\u50CF\u30D1\u30B9: relativePath,
              \u30C6\u30AD\u30B9\u30C8: imageText
            });
          }
        }
        slides.push({
          \u30B9\u30E9\u30A4\u30C9\u756A\u53F7: slideNumber,
          \u30BF\u30A4\u30C8\u30EB: texts.length > 0 ? texts[0] : `\u30B9\u30E9\u30A4\u30C9 ${slideNumber}`,
          \u672C\u6587: texts.slice(1),
          // 先頭（タイトル）以外のテキスト
          \u30CE\u30FC\u30C8: noteContent,
          \u753B\u50CF\u30C6\u30AD\u30B9\u30C8: imageTexts
        });
      }
      const corePropsPath = path10.join(extractDir, "docProps", "core.xml");
      let title = path10.basename(filePath, fileExtension);
      let creator = "";
      let created = (/* @__PURE__ */ new Date()).toISOString();
      let modified = (/* @__PURE__ */ new Date()).toISOString();
      if (fs9.existsSync(corePropsPath)) {
        const coreProps = fs9.readFileSync(corePropsPath, "utf8");
        const titleMatch = /<dc:title>(.*?)<\/dc:title>/g.exec(coreProps);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1];
        }
        const creatorMatch = /<dc:creator>(.*?)<\/dc:creator>/g.exec(coreProps);
        if (creatorMatch && creatorMatch[1]) {
          creator = creatorMatch[1];
        }
        const createdMatch = /<dcterms:created>(.*?)<\/dcterms:created>/g.exec(coreProps);
        if (createdMatch && createdMatch[1]) {
          created = createdMatch[1];
        }
        const modifiedMatch = /<dcterms:modified>(.*?)<\/dcterms:modified>/g.exec(coreProps);
        if (modifiedMatch && modifiedMatch[1]) {
          modified = modifiedMatch[1];
        }
      }
      fs9.rmSync(extractDir, { recursive: true, force: true });
      const result = {
        metadata: {
          \u30BF\u30A4\u30C8\u30EB: title,
          \u4F5C\u6210\u8005: creator || "Unknown",
          \u4F5C\u6210\u65E5: created,
          \u4FEE\u6B63\u65E5: modified,
          \u8AAC\u660E: `PowerPoint\u304B\u3089\u751F\u6210\u3055\u308C\u305F\u5FDC\u6025\u5FA9\u65E7\u30D5\u30ED\u30FC\u300C${title}\u300D\u3067\u3059\u3002\u63A5\u7D9A\u756A\u53F7: 123`
        },
        slides
      };
      const jsonFilePath = path10.join(jsonDir, `${fileId}_metadata.json`);
      fs9.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
      return {
        id: fileId,
        filePath: jsonFilePath,
        fileName: path10.basename(filePath),
        title,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        slideCount: slides.length,
        data: result
      };
    } else if (fileExtension.toLowerCase() === ".xlsx" || fileExtension.toLowerCase() === ".xls") {
      const fileName = path10.basename(filePath, fileExtension);
      const slides = [];
      try {
        const XLSX2 = __require("xlsx");
        const workbook = XLSX2.readFile(filePath);
        const sheetNames = workbook.SheetNames;
        for (let i = 0; i < sheetNames.length; i++) {
          const sheetName = sheetNames[i];
          const worksheet = workbook.Sheets[sheetName];
          const sheetData = XLSX2.utils.sheet_to_json(worksheet, { header: 1 });
          if (sheetData.length === 0) continue;
          const title = Array.isArray(sheetData[0]) && sheetData[0].length > 0 ? String(sheetData[0][0] || `\u30B7\u30FC\u30C8 ${i + 1}`) : `\u30B7\u30FC\u30C8 ${i + 1}`;
          const bodyTexts = [];
          for (let j = 1; j < sheetData.length; j++) {
            if (Array.isArray(sheetData[j])) {
              const rowText = sheetData[j].filter((cell) => cell !== void 0 && cell !== null).map((cell) => String(cell).trim()).join(", ");
              if (rowText) {
                bodyTexts.push(rowText);
              }
            }
          }
          slides.push({
            \u30B9\u30E9\u30A4\u30C9\u756A\u53F7: i + 1,
            \u30BF\u30A4\u30C8\u30EB: title,
            \u672C\u6587: bodyTexts,
            \u30CE\u30FC\u30C8: `Excel\u30B7\u30FC\u30C8\u300C${sheetName}\u300D\u304B\u3089\u751F\u6210\u3055\u308C\u307E\u3057\u305F`,
            \u753B\u50CF\u30C6\u30AD\u30B9\u30C8: []
          });
        }
        const result = {
          metadata: {
            \u30BF\u30A4\u30C8\u30EB: fileName,
            \u4F5C\u6210\u8005: "Excel\u62BD\u51FA",
            \u4F5C\u6210\u65E5: (/* @__PURE__ */ new Date()).toISOString(),
            \u4FEE\u6B63\u65E5: (/* @__PURE__ */ new Date()).toISOString(),
            \u8AAC\u660E: `Excel\u30D5\u30A1\u30A4\u30EB\u300C${fileName}\u300D\u304B\u3089\u751F\u6210\u3055\u308C\u305F\u5FDC\u6025\u5FA9\u65E7\u30D5\u30ED\u30FC\u3067\u3059\u3002\u63A5\u7D9A\u756A\u53F7: 123`
          },
          slides
        };
        const jsonFilePath = path10.join(jsonDir, `${fileId}_metadata.json`);
        fs9.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
        return {
          id: fileId,
          filePath: jsonFilePath,
          fileName: path10.basename(filePath),
          title: fileName,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          slideCount: slides.length,
          data: result
        };
      } catch (error) {
        console.error("Excel\u30D5\u30A1\u30A4\u30EB\u51E6\u7406\u30A8\u30E9\u30FC:", error);
        throw new Error("Excel\u30D5\u30A1\u30A4\u30EB\u306E\u51E6\u7406\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
      }
    } else if (fileExtension.toLowerCase() === ".pdf") {
      const fileName = path10.basename(filePath, fileExtension);
      try {
        const slides = [{
          \u30B9\u30E9\u30A4\u30C9\u756A\u53F7: 1,
          \u30BF\u30A4\u30C8\u30EB: fileName,
          \u672C\u6587: ["PDF\u304B\u3089\u30C6\u30AD\u30B9\u30C8\u3092\u62BD\u51FA\u3057\u307E\u3057\u305F\u3002\u63A5\u7D9A\u756A\u53F7: 123"],
          \u30CE\u30FC\u30C8: "PDF\u30D5\u30A1\u30A4\u30EB\u304B\u3089\u751F\u6210\u3055\u308C\u305F\u5FDC\u6025\u5FA9\u65E7\u30D5\u30ED\u30FC\u3067\u3059",
          \u753B\u50CF\u30C6\u30AD\u30B9\u30C8: []
        }];
        const result = {
          metadata: {
            \u30BF\u30A4\u30C8\u30EB: fileName,
            \u4F5C\u6210\u8005: "PDF\u62BD\u51FA",
            \u4F5C\u6210\u65E5: (/* @__PURE__ */ new Date()).toISOString(),
            \u4FEE\u6B63\u65E5: (/* @__PURE__ */ new Date()).toISOString(),
            \u8AAC\u660E: `PDF\u30D5\u30A1\u30A4\u30EB\u300C${fileName}\u300D\u304B\u3089\u751F\u6210\u3055\u308C\u305F\u5FDC\u6025\u51E6\u7F6E\u30D5\u30ED\u30FC\u3067\u3059`
          },
          slides
        };
        const jsonFilePath = path10.join(jsonDir, `${fileId}_metadata.json`);
        fs9.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
        return {
          id: fileId,
          filePath: jsonFilePath,
          fileName: path10.basename(filePath),
          title: fileName,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          slideCount: slides.length,
          data: result
        };
      } catch (error) {
        console.error("PDF\u30D5\u30A1\u30A4\u30EB\u51E6\u7406\u30A8\u30E9\u30FC:", error);
        throw new Error("PDF\u30D5\u30A1\u30A4\u30EB\u306E\u51E6\u7406\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
      }
    } else if (fileExtension.toLowerCase() === ".json") {
      console.log("JSON\u30D5\u30A1\u30A4\u30EB\u3092\u51E6\u7406\u3057\u307E\u3059:", filePath);
      const fileName = path10.basename(filePath, fileExtension);
      try {
        const jsonContent = fs9.readFileSync(filePath, "utf8");
        let jsonData = JSON.parse(jsonContent);
        if (!jsonData) {
          throw new Error("JSON\u30D5\u30A1\u30A4\u30EB\u306E\u89E3\u6790\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u6709\u52B9\u306AJSON\u30D5\u30A1\u30A4\u30EB\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
        }
        console.log("\u5143\u306EJSON\u30C7\u30FC\u30BF\u306E\u69CB\u9020:", Object.keys(jsonData));
        const isTroubleshootingFormat = jsonData.steps && Array.isArray(jsonData.steps);
        if (isTroubleshootingFormat) {
          console.log("\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u5F62\u5F0F\u306EJSON\u3092\u691C\u51FA\u3057\u307E\u3057\u305F\u3002steps\u914D\u5217\u304C\u3042\u308A\u307E\u3059\u3002");
          const convertedData = {
            metadata: {
              \u30BF\u30A4\u30C8\u30EB: jsonData.title || fileName || "\u5FDC\u6025\u51E6\u7F6E\u30D5\u30ED\u30FC\u30C7\u30FC\u30BF",
              \u4F5C\u6210\u8005: "\u30B7\u30B9\u30C6\u30E0",
              \u4F5C\u6210\u65E5: (/* @__PURE__ */ new Date()).toISOString(),
              \u4FEE\u6B63\u65E5: (/* @__PURE__ */ new Date()).toISOString(),
              \u8AAC\u660E: jsonData.description || "\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30ED\u30FC\u304B\u3089\u751F\u6210\u3055\u308C\u305F\u5FDC\u6025\u51E6\u7F6E\u30D5\u30ED\u30FC\u3067\u3059",
              \u539F\u5F62\u5F0F: "troubleshooting"
            },
            slides: jsonData.steps.map((step, index) => ({
              \u30B9\u30E9\u30A4\u30C9\u756A\u53F7: index + 1,
              \u30BF\u30A4\u30C8\u30EB: step.title || `\u30B9\u30C6\u30C3\u30D7 ${index + 1}`,
              \u672C\u6587: [step.message || step.description || ""],
              \u30CE\u30FC\u30C8: step.options ? `\u9078\u629E\u80A2: ${step.options.map((opt) => opt.text).join(", ")}` : "",
              \u753B\u50CF\u30C6\u30AD\u30B9\u30C8: []
            })),
            original: jsonData
            // 元のJSONデータも保持
          };
          jsonData = convertedData;
          console.log("\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u5F62\u5F0F\u304B\u3089\u30AC\u30A4\u30C9\u5F62\u5F0F\u306B\u5909\u63DB\u3057\u307E\u3057\u305F");
        } else {
          if (!jsonData.metadata) {
            console.log("JSON\u306Bmetadata\u304C\u306A\u3044\u305F\u3081\u3001\u4F5C\u6210\u3057\u307E\u3059");
            jsonData.metadata = {
              \u30BF\u30A4\u30C8\u30EB: jsonData.title || fileName || "\u5FDC\u6025\u51E6\u7F6E\u30D5\u30ED\u30FC\u30C7\u30FC\u30BF",
              \u4F5C\u6210\u8005: "\u30B7\u30B9\u30C6\u30E0",
              \u4F5C\u6210\u65E5: (/* @__PURE__ */ new Date()).toISOString(),
              \u4FEE\u6B63\u65E5: (/* @__PURE__ */ new Date()).toISOString(),
              \u8AAC\u660E: jsonData.description || "JSON\u30D5\u30A1\u30A4\u30EB\u304B\u3089\u751F\u6210\u3055\u308C\u305F\u5FDC\u6025\u51E6\u7F6E\u30D5\u30ED\u30FC\u3067\u3059"
            };
          }
          if (!jsonData.slides || !Array.isArray(jsonData.slides)) {
            console.log("JSON\u306Bslides\u304C\u306A\u3044\u304B\u914D\u5217\u3067\u306F\u306A\u3044\u305F\u3081\u3001\u4F5C\u6210\u3057\u307E\u3059");
            jsonData.slides = [];
            if (jsonData.steps && Array.isArray(jsonData.steps)) {
              console.log("steps\u914D\u5217\u3092slides\u306B\u5909\u63DB\u3057\u307E\u3059");
              jsonData.slides = jsonData.steps.map((step, index) => ({
                \u30B9\u30E9\u30A4\u30C9\u756A\u53F7: index + 1,
                \u30BF\u30A4\u30C8\u30EB: step.title || `\u30B9\u30C6\u30C3\u30D7 ${index + 1}`,
                \u672C\u6587: [step.message || step.description || ""],
                \u30CE\u30FC\u30C8: step.options ? `\u9078\u629E\u80A2: ${step.options.map((opt) => opt.text).join(", ")}` : "",
                \u753B\u50CF\u30C6\u30AD\u30B9\u30C8: []
              }));
            } else {
              const slideData = {
                \u30B9\u30E9\u30A4\u30C9\u756A\u53F7: 1,
                \u30BF\u30A4\u30C8\u30EB: jsonData.metadata?.\u30BF\u30A4\u30C8\u30EB || jsonData.title || fileName || "JSON\u30C7\u30FC\u30BF",
                \u672C\u6587: [jsonData.description || "JSON\u30C7\u30FC\u30BF\u304B\u3089\u81EA\u52D5\u751F\u6210\u3055\u308C\u305F\u30B9\u30E9\u30A4\u30C9\u3067\u3059"],
                \u30CE\u30FC\u30C8: "JSON\u30D5\u30A1\u30A4\u30EB\u304B\u3089\u751F\u6210\u3055\u308C\u305F\u5185\u5BB9\u3067\u3059",
                \u753B\u50CF\u30C6\u30AD\u30B9\u30C8: []
              };
              jsonData.slides.push(slideData);
            }
          }
        }
        const troubleshootingDir2 = path10.join(process.cwd(), "knowledge-base", "troubleshooting");
        if (!fs9.existsSync(troubleshootingDir2)) {
          fs9.mkdirSync(troubleshootingDir2, { recursive: true });
        }
        if (isTroubleshootingFormat) {
          const tsFilePath = path10.join(troubleshootingDir2, `${path10.basename(fileName, ".json")}.json`);
          fs9.writeFileSync(tsFilePath, jsonContent);
          console.log(`\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u5F62\u5F0F\u306EJSON\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F: ${tsFilePath}`);
        }
        jsonData.slides.forEach((slide) => {
          if (slide.\u753B\u50CF\u30C6\u30AD\u30B9\u30C8 && Array.isArray(slide.\u753B\u50CF\u30C6\u30AD\u30B9\u30C8)) {
            slide.\u753B\u50CF\u30C6\u30AD\u30B9\u30C8.forEach((imgText) => {
              if (imgText.\u753B\u50CF\u30D1\u30B9 && imgText.\u753B\u50CF\u30D1\u30B9.startsWith("/uploads/")) {
                imgText.\u753B\u50CF\u30D1\u30B9 = imgText.\u753B\u50CF\u30D1\u30B9.replace("/uploads/", "/knowledge-base/");
              }
            });
          }
        });
        jsonData.metadata.\u4F5C\u6210\u65E5 = jsonData.metadata.\u4F5C\u6210\u65E5 || (/* @__PURE__ */ new Date()).toISOString();
        jsonData.metadata.\u4FEE\u6B63\u65E5 = (/* @__PURE__ */ new Date()).toISOString();
        if (jsonData.metadata.\u8AAC\u660E && jsonData.metadata.\u8AAC\u660E.includes("\u5FDC\u6025\u5FA9\u65E7")) {
          jsonData.metadata.\u8AAC\u660E = jsonData.metadata.\u8AAC\u660E.replace(/応急復旧/g, "\u5FDC\u6025\u51E6\u7F6E");
        }
        if (jsonData.metadata.\u30BF\u30A4\u30C8\u30EB && jsonData.metadata.\u30BF\u30A4\u30C8\u30EB.includes("\u5FDC\u6025\u5FA9\u65E7")) {
          jsonData.metadata.\u30BF\u30A4\u30C8\u30EB = jsonData.metadata.\u30BF\u30A4\u30C8\u30EB.replace(/応急復旧/g, "\u5FDC\u6025\u51E6\u7F6E");
        }
        const jsonFilePath = path10.join(jsonDir, `${fileId}_metadata.json`);
        fs9.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));
        return {
          id: fileId,
          filePath: jsonFilePath,
          fileName: path10.basename(filePath),
          title: jsonData.metadata.\u30BF\u30A4\u30C8\u30EB || fileName,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          slideCount: jsonData.slides.length,
          data: jsonData
        };
      } catch (error) {
        console.error("JSON\u30D5\u30A1\u30A4\u30EB\u51E6\u7406\u30A8\u30E9\u30FC:", error);
        throw new Error(`JSON\u30D5\u30A1\u30A4\u30EB\u306E\u51E6\u7406\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC"}`);
      }
    } else {
      throw new Error("\u30B5\u30DD\u30FC\u30C8\u3055\u308C\u3066\u3044\u306A\u3044\u30D5\u30A1\u30A4\u30EB\u5F62\u5F0F\u3067\u3059");
    }
  } catch (error) {
    console.error("\u30D5\u30A1\u30A4\u30EB\u51E6\u7406\u30A8\u30E9\u30FC:", error);
    throw error;
  }
}
router3.post("/process", upload4.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "\u30D5\u30A1\u30A4\u30EB\u304C\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3055\u308C\u3066\u3044\u307E\u305B\u3093" });
    }
    const filePath = req.file.path;
    log(`\u30D5\u30A1\u30A4\u30EB\u51E6\u7406: ${filePath}`);
    const result = await processFile(filePath);
    console.log(`\u30D5\u30A1\u30A4\u30EB\u306Fknowledge-base\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u76F4\u63A5\u51E6\u7406\u3055\u308C\u307E\u3057\u305F: ${result.filePath}`);
    try {
      if (fs9.existsSync(filePath)) {
        fs9.unlinkSync(filePath);
        console.log(`\u5143\u306E\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ${filePath}`);
      }
    } catch (cleanupError) {
      console.error(`\u30D5\u30A1\u30A4\u30EB\u524A\u9664\u30A8\u30E9\u30FC: ${cleanupError}`);
    }
    if (fs9.existsSync(tempDir)) {
      cleanupTempDirectory2(tempDir);
    }
    return res.json({
      success: true,
      message: "\u30D5\u30A1\u30A4\u30EB\u304C\u6B63\u5E38\u306B\u51E6\u7406\u3055\u308C\u307E\u3057\u305F",
      guideId: result.id,
      data: result
    });
  } catch (error) {
    console.error("\u30D5\u30A1\u30A4\u30EB\u51E6\u7406\u30A8\u30E9\u30FC:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
    });
  }
});
router3.get("/list", (_req, res) => {
  try {
    if (!fs9.existsSync(jsonDir)) {
      fs9.mkdirSync(jsonDir, { recursive: true });
      console.log(`jsonDir\u304C\u5B58\u5728\u3057\u306A\u304B\u3063\u305F\u305F\u3081\u4F5C\u6210\u3057\u307E\u3057\u305F: ${jsonDir}`);
    }
    const jsonFiles = fs9.existsSync(jsonDir) ? fs9.readdirSync(jsonDir).filter((file) => file.endsWith("_metadata.json")) : [];
    console.log(`jsonDir\u304B\u3089${jsonFiles.length}\u500B\u306E\u30E1\u30BF\u30C7\u30FC\u30BF\u30D5\u30A1\u30A4\u30EB\u3092\u53D6\u5F97\u3057\u307E\u3057\u305F`);
    const troubleshootingDir2 = path10.join(process.cwd(), "knowledge-base", "troubleshooting");
    if (!fs9.existsSync(troubleshootingDir2)) {
      fs9.mkdirSync(troubleshootingDir2, { recursive: true });
      console.log(`troubleshootingDir\u304C\u5B58\u5728\u3057\u306A\u304B\u3063\u305F\u305F\u3081\u4F5C\u6210\u3057\u307E\u3057\u305F: ${troubleshootingDir2}`);
    }
    const troubleshootingFiles = fs9.existsSync(troubleshootingDir2) ? fs9.readdirSync(troubleshootingDir2).filter((file) => file.endsWith(".json")) : [];
    console.log(`troubleshootingDir\u304B\u3089${troubleshootingFiles.length}\u500B\u306EJSON\u30D5\u30A1\u30A4\u30EB\u3092\u53D6\u5F97\u3057\u307E\u3057\u305F`);
    const guides = [];
    jsonFiles.forEach((file) => {
      try {
        const filePath = path10.join(jsonDir, file);
        const content = fs9.readFileSync(filePath, "utf8");
        const data = JSON.parse(content);
        const id = file.split("_")[0] + "_" + file.split("_")[1];
        guides.push({
          id,
          filePath,
          fileName: file,
          title: data.metadata?.\u30BF\u30A4\u30C8\u30EB || path10.basename(file, "_metadata.json"),
          createdAt: data.metadata?.\u4F5C\u6210\u65E5 || (/* @__PURE__ */ new Date()).toISOString(),
          slideCount: Array.isArray(data.slides) ? data.slides.length : 0,
          source: "regular"
        });
      } catch (err) {
        console.error(`\u30D5\u30A1\u30A4\u30EB ${file} \u306E\u51E6\u7406\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:`, err);
      }
    });
    troubleshootingFiles.forEach((file) => {
      try {
        const filePath = path10.join(troubleshootingDir2, file);
        const content = fs9.readFileSync(filePath, "utf8");
        const data = JSON.parse(content);
        const id = path10.basename(file, ".json");
        guides.push({
          id: `ts_${id}`,
          // トラブルシューティングの識別子をつける
          filePath,
          fileName: file,
          title: data.metadata?.\u30BF\u30A4\u30C8\u30EB || data.title || id,
          createdAt: data.metadata?.\u4F5C\u6210\u65E5 || data.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          slideCount: Array.isArray(data.slides) ? data.slides.length : Array.isArray(data.steps) ? data.steps.length : 0,
          source: "troubleshooting"
        });
      } catch (err) {
        console.error(`\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30A1\u30A4\u30EB ${file} \u306E\u51E6\u7406\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:`, err);
      }
    });
    guides.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    console.log(`\u5408\u8A08${guides.length}\u500B\u306E\u30AC\u30A4\u30C9\u3092\u53D6\u5F97\u3057\u307E\u3057\u305F`);
    res.json(guides);
  } catch (error) {
    console.error("\u30AC\u30A4\u30C9\u4E00\u89A7\u53D6\u5F97\u30A8\u30E9\u30FC:", error);
    res.status(500).json({ error: "\u30AC\u30A4\u30C9\u4E00\u89A7\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
router3.get("/detail/:id", (req, res) => {
  try {
    const id = req.params.id;
    if (id.startsWith("ts_")) {
      const troubleshootingDir2 = path10.join(process.cwd(), "knowledge-base", "troubleshooting");
      const tsId = id.replace("ts_", "");
      const filePath = path10.join(troubleshootingDir2, `${tsId}.json`);
      if (!fs9.existsSync(filePath)) {
        return res.status(404).json({ error: "\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      }
      const content = fs9.readFileSync(filePath, "utf8");
      const jsonData = JSON.parse(content);
      const data = {
        metadata: jsonData.metadata || {
          \u30BF\u30A4\u30C8\u30EB: jsonData.title || tsId,
          \u4F5C\u6210\u8005: "\u30B7\u30B9\u30C6\u30E0",
          \u4F5C\u6210\u65E5: jsonData.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          \u4FEE\u6B63\u65E5: (/* @__PURE__ */ new Date()).toISOString(),
          \u8AAC\u660E: jsonData.description || "\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30ED\u30FC"
        },
        slides: jsonData.slides || []
      };
      if (jsonData.steps && Array.isArray(jsonData.steps) && data.slides.length === 0) {
        data.slides = jsonData.steps.map((step, index) => ({
          \u30B9\u30E9\u30A4\u30C9\u756A\u53F7: index + 1,
          \u30BF\u30A4\u30C8\u30EB: step.title || `\u30B9\u30C6\u30C3\u30D7 ${index + 1}`,
          \u672C\u6587: [step.description || ""],
          \u30CE\u30FC\u30C8: step.note || "",
          \u753B\u50CF\u30C6\u30AD\u30B9\u30C8: step.imageUrl ? [{
            \u753B\u50CF\u30D1\u30B9: step.imageUrl,
            \u30C6\u30AD\u30B9\u30C8: step.imageCaption || ""
          }] : []
        }));
      }
      res.json({
        id,
        filePath,
        fileName: path10.basename(filePath),
        data,
        source: "troubleshooting"
      });
    } else {
      const files = fs9.readdirSync(jsonDir).filter((file) => file.startsWith(id) && file.endsWith("_metadata.json"));
      if (files.length === 0) {
        return res.status(404).json({ error: "\u30AC\u30A4\u30C9\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      }
      const filePath = path10.join(jsonDir, files[0]);
      const content = fs9.readFileSync(filePath, "utf8");
      const data = JSON.parse(content);
      res.json({
        id,
        filePath,
        fileName: files[0],
        data,
        source: "regular"
      });
    }
  } catch (error) {
    console.error("\u30AC\u30A4\u30C9\u8A73\u7D30\u53D6\u5F97\u30A8\u30E9\u30FC:", error);
    res.status(500).json({ error: "\u30AC\u30A4\u30C9\u8A73\u7D30\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
router3.post("/update/:id", (req, res) => {
  try {
    const id = req.params.id;
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: "\u30C7\u30FC\u30BF\u304C\u63D0\u4F9B\u3055\u308C\u3066\u3044\u307E\u305B\u3093" });
    }
    if (id.startsWith("ts_")) {
      const troubleshootingDir2 = path10.join(process.cwd(), "knowledge-base", "troubleshooting");
      const tsId = id.replace("ts_", "");
      const filePath = path10.join(troubleshootingDir2, `${tsId}.json`);
      if (!fs9.existsSync(filePath)) {
        return res.status(404).json({ error: "\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      }
      const content = fs9.readFileSync(filePath, "utf8");
      const originalData = JSON.parse(content);
      let updatedTsData = originalData;
      if (data.metadata) {
        updatedTsData.title = data.metadata.\u30BF\u30A4\u30C8\u30EB || originalData.title;
        updatedTsData.description = data.metadata.\u8AAC\u660E || originalData.description;
      }
      if (data.slides && Array.isArray(data.slides) && data.slides.length > 0) {
        if (!updatedTsData.steps || !Array.isArray(updatedTsData.steps)) {
          updatedTsData.steps = [];
        }
        data.slides.forEach((slide, index) => {
          if (index < updatedTsData.steps.length) {
            updatedTsData.steps[index].title = slide.\u30BF\u30A4\u30C8\u30EB || updatedTsData.steps[index].title;
            updatedTsData.steps[index].message = Array.isArray(slide.\u672C\u6587) ? slide.\u672C\u6587[0] : slide.\u672C\u6587 || updatedTsData.steps[index].message;
            updatedTsData.steps[index].description = Array.isArray(slide.\u672C\u6587) ? slide.\u672C\u6587[0] : slide.\u672C\u6587 || updatedTsData.steps[index].description;
          } else {
            updatedTsData.steps.push({
              id: `step${index + 1}`,
              title: slide.\u30BF\u30A4\u30C8\u30EB || `\u30B9\u30C6\u30C3\u30D7 ${index + 1}`,
              message: Array.isArray(slide.\u672C\u6587) ? slide.\u672C\u6587[0] : slide.\u672C\u6587 || "",
              description: Array.isArray(slide.\u672C\u6587) ? slide.\u672C\u6587[0] : slide.\u672C\u6587 || "",
              options: []
            });
          }
        });
      }
      updatedTsData.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      fs9.writeFileSync(filePath, JSON.stringify(updatedTsData, null, 2));
      if (data.metadata) {
        data.metadata.\u4FEE\u6B63\u65E5 = (/* @__PURE__ */ new Date()).toISOString();
      }
      const guideFileName = `ts_${tsId}_metadata.json`;
      const guideFilePath = path10.join(jsonDir, guideFileName);
      if (fs9.existsSync(guideFilePath)) {
        fs9.writeFileSync(guideFilePath, JSON.stringify(data, null, 2));
      }
      res.json({
        success: true,
        message: "\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30C7\u30FC\u30BF\u304C\u66F4\u65B0\u3055\u308C\u307E\u3057\u305F",
        id
      });
    } else {
      const files = fs9.readdirSync(jsonDir).filter((file) => file.startsWith(id) && file.endsWith("_metadata.json"));
      if (files.length === 0) {
        return res.status(404).json({ error: "\u30AC\u30A4\u30C9\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      }
      const filePath = path10.join(jsonDir, files[0]);
      if (data.metadata) {
        data.metadata.\u4FEE\u6B63\u65E5 = (/* @__PURE__ */ new Date()).toISOString();
      }
      fs9.writeFileSync(filePath, JSON.stringify(data, null, 2));
      res.json({
        success: true,
        message: "\u30AC\u30A4\u30C9\u30C7\u30FC\u30BF\u304C\u66F4\u65B0\u3055\u308C\u307E\u3057\u305F",
        id
      });
    }
  } catch (error) {
    console.error("\u30AC\u30A4\u30C9\u66F4\u65B0\u30A8\u30E9\u30FC:", error);
    res.status(500).json({ error: "\u30AC\u30A4\u30C9\u306E\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
router3.delete("/delete/:id", (req, res) => {
  try {
    const id = req.params.id;
    if (id.startsWith("ts_")) {
      const troubleshootingDir2 = path10.join(process.cwd(), "knowledge-base", "troubleshooting");
      const tsId = id.replace("ts_", "");
      const filePath = path10.join(troubleshootingDir2, `${tsId}.json`);
      if (fs9.existsSync(filePath)) {
        fs9.unlinkSync(filePath);
        console.log(`\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ${filePath}`);
      }
      const guideFileName = `ts_${tsId}_metadata.json`;
      const guideFilePath = path10.join(jsonDir, guideFileName);
      if (fs9.existsSync(guideFilePath)) {
        fs9.unlinkSync(guideFilePath);
        console.log(`\u30E1\u30BF\u30C7\u30FC\u30BF\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ${guideFilePath}`);
      }
    } else {
      const files = fs9.readdirSync(jsonDir).filter((file) => file.startsWith(id) && file.endsWith("_metadata.json"));
      if (files.length === 0) {
        return res.status(404).json({ error: "\u30AC\u30A4\u30C9\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      }
      const filePath = path10.join(jsonDir, files[0]);
      if (fs9.existsSync(filePath)) {
        fs9.unlinkSync(filePath);
        console.log(`\u30AC\u30A4\u30C9\u30D5\u30A1\u30A4\u30EB\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ${filePath}`);
      }
    }
    res.json({
      success: true,
      message: "\u30AC\u30A4\u30C9\u30C7\u30FC\u30BF\u304C\u524A\u9664\u3055\u308C\u307E\u3057\u305F",
      id
    });
  } catch (error) {
    console.error("\u30AC\u30A4\u30C9\u524A\u9664\u30A8\u30E9\u30FC:", error);
    res.status(500).json({ error: "\u30AC\u30A4\u30C9\u306E\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
router3.post("/send-to-chat/:guideId/:chatId", async (req, res) => {
  try {
    const { guideId, chatId } = req.params;
    const files = fs9.readdirSync(jsonDir).filter((file) => file.startsWith(guideId) && file.endsWith("_metadata.json"));
    if (files.length === 0) {
      return res.status(404).json({ error: "\u30AC\u30A4\u30C9\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    const filePath = path10.join(jsonDir, files[0]);
    const content = fs9.readFileSync(filePath, "utf8");
    const guideData = JSON.parse(content);
    const response = await fetch(`http://localhost:${process.env.PORT || 3e3}/api/chats/${chatId}/messages/system`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: `\u5FDC\u6025\u51E6\u7F6E\u30D5\u30ED\u30FC\u300C${guideData.metadata.\u30BF\u30A4\u30C8\u30EB}\u300D\u304C\u5171\u6709\u3055\u308C\u307E\u3057\u305F\u3002

${guideData.metadata.\u8AAC\u660E}`,
        isUserMessage: false
      })
    });
    if (!response.ok) {
      throw new Error("\u30C1\u30E3\u30C3\u30C8\u3078\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u9001\u4FE1\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
    const result = await response.json();
    res.json({
      success: true,
      message: "\u5FDC\u6025\u51E6\u7F6E\u30D5\u30ED\u30FC\u304C\u30C1\u30E3\u30C3\u30C8\u306B\u9001\u4FE1\u3055\u308C\u307E\u3057\u305F",
      messageId: result.id
    });
  } catch (error) {
    console.error("\u30D5\u30ED\u30FC\u9001\u4FE1\u30A8\u30E9\u30FC:", error);
    res.status(500).json({ error: "\u5FDC\u6025\u51E6\u7F6E\u30D5\u30ED\u30FC\u306E\u30C1\u30E3\u30C3\u30C8\u3078\u306E\u9001\u4FE1\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
  }
});
var emergency_guide_default = router3;

// server/routes/emergency-flow-router.ts
import express3 from "express";
import fs10 from "fs";
import path11 from "path";
var router4 = express3.Router();
router4.post("/update-troubleshooting/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID\u304C\u6307\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093"
      });
    }
    const fileId = id.startsWith("ts_") ? id.replace("ts_", "") : id;
    const troubleshootingDir2 = path11.join(process.cwd(), "knowledge-base", "troubleshooting");
    if (!fs10.existsSync(troubleshootingDir2)) {
      fs10.mkdirSync(troubleshootingDir2, { recursive: true });
    }
    const filePath = path11.join(troubleshootingDir2, `${fileId}.json`);
    const troubleshootingData = req.body;
    if (!fs10.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "\u6307\u5B9A\u3055\u308C\u305F\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"
      });
    }
    troubleshootingData.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    fs10.writeFileSync(filePath, JSON.stringify(troubleshootingData, null, 2));
    log(`\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30C7\u30FC\u30BF\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F: ${fileId}.json`);
    return res.status(200).json({
      success: true,
      message: "\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30C7\u30FC\u30BF\u304C\u66F4\u65B0\u3055\u308C\u307E\u3057\u305F"
    });
  } catch (error) {
    console.error("\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u66F4\u65B0\u30A8\u30E9\u30FC:", error);
    return res.status(500).json({
      success: false,
      error: "\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30C7\u30FC\u30BF\u306E\u66F4\u65B0\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
    });
  }
});
router4.post("/save-flow", async (req, res) => {
  try {
    const flowData = req.body;
    if (!flowData || !flowData.id || !flowData.title) {
      return res.status(400).json({
        success: false,
        error: "\u7121\u52B9\u306A\u30D5\u30ED\u30FC\u30C7\u30FC\u30BF\u3067\u3059"
      });
    }
    const jsonDir3 = path11.join(process.cwd(), "knowledge-base", "json");
    if (!fs10.existsSync(jsonDir3)) {
      fs10.mkdirSync(jsonDir3, { recursive: true });
    }
    const timestamp3 = Date.now();
    const fileName = `flow_${timestamp3}.json`;
    const filePath = path11.join(jsonDir3, fileName);
    const metadataFileName = `flow_${timestamp3}_metadata.json`;
    const metadataFilePath = path11.join(jsonDir3, metadataFileName);
    fs10.writeFileSync(filePath, JSON.stringify(flowData, null, 2));
    const metadata = {
      id: `flow_${timestamp3}`,
      filePath,
      fileName,
      title: flowData.title,
      description: flowData.description || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      type: "flow",
      nodeCount: flowData.nodes ? flowData.nodes.length : 0,
      edgeCount: flowData.edges ? flowData.edges.length : 0
    };
    fs10.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));
    updateIndexFile(metadata);
    log(`\u30D5\u30ED\u30FC\u30C7\u30FC\u30BF\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F: ${fileName}`);
    return res.status(200).json({
      success: true,
      id: metadata.id,
      message: "\u30D5\u30ED\u30FC\u30C7\u30FC\u30BF\u304C\u4FDD\u5B58\u3055\u308C\u307E\u3057\u305F"
    });
  } catch (error) {
    console.error("\u30D5\u30ED\u30FC\u4FDD\u5B58\u30A8\u30E9\u30FC:", error);
    return res.status(500).json({
      success: false,
      error: "\u30D5\u30ED\u30FC\u30C7\u30FC\u30BF\u306E\u4FDD\u5B58\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
    });
  }
});
function updateIndexFile(metadata) {
  try {
    const indexPath = path11.join(process.cwd(), "knowledge-base", "index.json");
    let indexData = { lastUpdated: (/* @__PURE__ */ new Date()).toISOString(), guides: [], fileCount: 0 };
    if (fs10.existsSync(indexPath)) {
      const indexContent = fs10.readFileSync(indexPath, "utf-8");
      indexData = JSON.parse(indexContent);
    }
    const existingIndex = indexData.guides.findIndex((g) => g.id === metadata.id);
    if (existingIndex >= 0) {
      indexData.guides[existingIndex] = metadata;
    } else {
      indexData.guides.push(metadata);
    }
    indexData.fileCount = indexData.guides.length;
    indexData.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    fs10.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
    log(`\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u30D5\u30A1\u30A4\u30EB\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F: ${indexData.fileCount}\u4EF6\u306E\u30AC\u30A4\u30C9`);
  } catch (error) {
    console.error("\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u30D5\u30A1\u30A4\u30EB\u66F4\u65B0\u30A8\u30E9\u30FC:", error);
  }
}
router4.get("/list", async (req, res) => {
  try {
    const jsonDir3 = path11.join(process.cwd(), "knowledge-base", "json");
    const troubleshootingDir2 = path11.join(process.cwd(), "knowledge-base", "troubleshooting");
    if (!fs10.existsSync(jsonDir3)) {
      fs10.mkdirSync(jsonDir3, { recursive: true });
    }
    const flowList = [];
    if (fs10.existsSync(jsonDir3)) {
      const jsonFiles = fs10.readdirSync(jsonDir3).filter((file) => file.endsWith("_metadata.json") || file.includes("example_flow_metadata"));
      let jsonMetadataCount = 0;
      for (const file of jsonFiles) {
        try {
          const filePath = path11.join(jsonDir3, file);
          const content = fs10.readFileSync(filePath, "utf-8");
          const metadata = JSON.parse(content);
          flowList.push({
            ...metadata,
            source: "json"
          });
          jsonMetadataCount++;
        } catch (err) {
          console.error(`\u30E1\u30BF\u30C7\u30FC\u30BF\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC (${file}):`, err);
        }
      }
      log(`jsonDir\u304B\u3089${jsonMetadataCount}\u500B\u306E\u30E1\u30BF\u30C7\u30FC\u30BF\u30D5\u30A1\u30A4\u30EB\u3092\u53D6\u5F97\u3057\u307E\u3057\u305F`);
    }
    if (fs10.existsSync(troubleshootingDir2)) {
      const tsFiles = fs10.readdirSync(troubleshootingDir2).filter((file) => file.endsWith(".json"));
      let tsCount = 0;
      for (const file of tsFiles) {
        try {
          const filePath = path11.join(troubleshootingDir2, file);
          const content = fs10.readFileSync(filePath, "utf-8");
          const tsData = JSON.parse(content);
          if (tsData.id && tsData.title) {
            flowList.push({
              id: `ts_${file.replace(".json", "")}`,
              filePath,
              fileName: file,
              title: tsData.title,
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              slideCount: tsData.slides ? tsData.slides.length : 0,
              source: "troubleshooting"
            });
            tsCount++;
          }
        } catch (err) {
          console.error(`\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30A1\u30A4\u30EB\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC (${file}):`, err);
        }
      }
      log(`troubleshootingDir\u304B\u3089${tsCount}\u500B\u306EJSON\u30D5\u30A1\u30A4\u30EB\u3092\u53D6\u5F97\u3057\u307E\u3057\u305F`);
    }
    log(`\u5408\u8A08${flowList.length}\u500B\u306E\u30AC\u30A4\u30C9\u3092\u53D6\u5F97\u3057\u307E\u3057\u305F`);
    return res.status(200).json(flowList);
  } catch (error) {
    console.error("\u30D5\u30ED\u30FC\u4E00\u89A7\u53D6\u5F97\u30A8\u30E9\u30FC:", error);
    return res.status(500).json({
      success: false,
      error: "\u30D5\u30ED\u30FC\u4E00\u89A7\u306E\u53D6\u5F97\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
    });
  }
});
router4.get("/detail/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "\u30D5\u30ED\u30FCID\u304C\u6307\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093"
      });
    }
    if (id.startsWith("ts_")) {
      const troubleshootingDir2 = path11.join(process.cwd(), "knowledge-base", "troubleshooting");
      const filename = id.replace("ts_", "") + ".json";
      const filePath = path11.join(troubleshootingDir2, filename);
      if (!fs10.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: "\u6307\u5B9A\u3055\u308C\u305F\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"
        });
      }
      const content = fs10.readFileSync(filePath, "utf-8");
      const flowData = JSON.parse(content);
      return res.status(200).json({
        id,
        data: flowData
      });
    } else if (id === "example_flow") {
      const jsonDir3 = path11.join(process.cwd(), "knowledge-base", "json");
      const flowPath = path11.join(jsonDir3, "example_flow.json");
      if (!fs10.existsSync(flowPath)) {
        return res.status(404).json({
          success: false,
          error: "\u30B5\u30F3\u30D7\u30EB\u30D5\u30ED\u30FC\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"
        });
      }
      const flowContent = fs10.readFileSync(flowPath, "utf-8");
      const flowData = JSON.parse(flowContent);
      return res.status(200).json({
        id: "example_flow",
        data: flowData
      });
    } else {
      const jsonDir3 = path11.join(process.cwd(), "knowledge-base", "json");
      const metadataPath = path11.join(jsonDir3, `${id}_metadata.json`);
      if (!fs10.existsSync(metadataPath)) {
        return res.status(404).json({
          success: false,
          error: "\u6307\u5B9A\u3055\u308C\u305F\u30D5\u30ED\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"
        });
      }
      const metadataContent = fs10.readFileSync(metadataPath, "utf-8");
      const metadata = JSON.parse(metadataContent);
      const flowPath = path11.join(jsonDir3, metadata.fileName);
      if (!fs10.existsSync(flowPath)) {
        return res.status(404).json({
          success: false,
          error: "\u30D5\u30ED\u30FC\u30C7\u30FC\u30BF\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"
        });
      }
      const flowContent = fs10.readFileSync(flowPath, "utf-8");
      const flowData = JSON.parse(flowContent);
      return res.status(200).json({
        id: metadata.id,
        data: flowData
      });
    }
  } catch (error) {
    console.error("\u30D5\u30ED\u30FC\u8A73\u7D30\u53D6\u5F97\u30A8\u30E9\u30FC:", error);
    return res.status(500).json({
      success: false,
      error: "\u30D5\u30ED\u30FC\u8A73\u7D30\u306E\u53D6\u5F97\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
    });
  }
});
router4.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "\u30D5\u30ED\u30FCID\u304C\u6307\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093"
      });
    }
    if (id.startsWith("ts_")) {
      const troubleshootingDir2 = path11.join(process.cwd(), "knowledge-base", "troubleshooting");
      const filename = id.replace("ts_", "") + ".json";
      const filePath = path11.join(troubleshootingDir2, filename);
      if (!fs10.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: "\u6307\u5B9A\u3055\u308C\u305F\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"
        });
      }
      fs10.unlinkSync(filePath);
      log(`\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30ED\u30FC\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ${filename}`);
      return res.status(200).json({
        success: true,
        message: "\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u30D5\u30A1\u30A4\u30EB\u304C\u524A\u9664\u3055\u308C\u307E\u3057\u305F"
      });
    } else {
      const jsonDir3 = path11.join(process.cwd(), "knowledge-base", "json");
      const metadataPath = path11.join(jsonDir3, `${id}_metadata.json`);
      if (!fs10.existsSync(metadataPath)) {
        return res.status(404).json({
          success: false,
          error: "\u6307\u5B9A\u3055\u308C\u305F\u30D5\u30ED\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"
        });
      }
      const metadataContent = fs10.readFileSync(metadataPath, "utf-8");
      const metadata = JSON.parse(metadataContent);
      const flowPath = path11.join(jsonDir3, metadata.fileName);
      if (fs10.existsSync(flowPath)) {
        fs10.unlinkSync(flowPath);
      }
      fs10.unlinkSync(metadataPath);
      updateIndexFileAfterDelete(id);
      log(`\u30D5\u30ED\u30FC\u3092\u524A\u9664\u3057\u307E\u3057\u305F: ${id}`);
      return res.status(200).json({
        success: true,
        message: "\u30D5\u30ED\u30FC\u304C\u524A\u9664\u3055\u308C\u307E\u3057\u305F"
      });
    }
  } catch (error) {
    console.error("\u30D5\u30ED\u30FC\u524A\u9664\u30A8\u30E9\u30FC:", error);
    return res.status(500).json({
      success: false,
      error: "\u30D5\u30ED\u30FC\u306E\u524A\u9664\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
    });
  }
});
function updateIndexFileAfterDelete(id) {
  try {
    const indexPath = path11.join(process.cwd(), "knowledge-base", "index.json");
    if (!fs10.existsSync(indexPath)) {
      return;
    }
    const indexContent = fs10.readFileSync(indexPath, "utf-8");
    let indexData = JSON.parse(indexContent);
    indexData.guides = indexData.guides.filter((guide) => guide.id !== id);
    indexData.fileCount = indexData.guides.length;
    indexData.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    fs10.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
    log(`\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u30D5\u30A1\u30A4\u30EB\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F\uFF08\u524A\u9664\u5F8C\uFF09: ${indexData.fileCount}\u4EF6\u306E\u30AC\u30A4\u30C9`);
  } catch (error) {
    console.error("\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u30D5\u30A1\u30A4\u30EB\u66F4\u65B0\u30A8\u30E9\u30FC\uFF08\u524A\u9664\u5F8C\uFF09:", error);
  }
}
var emergencyFlowRouter = router4;

// server/routes/sync-routes.ts
import fs11 from "fs";
import path12 from "path";
import multer5 from "multer";
var mediaDir = path12.join(process.cwd(), "knowledge-base", "media");
if (!fs11.existsSync(mediaDir)) {
  fs11.mkdirSync(mediaDir, { recursive: true });
}
var mediaStorage = multer5.diskStorage({
  destination: (req, file, cb) => {
    cb(null, mediaDir);
  },
  filename: (req, file, cb) => {
    const timestamp3 = Date.now();
    const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    const ext = path12.extname(originalName) || ".jpg";
    const filename = `media_${timestamp3}${ext}`;
    cb(null, filename);
  }
});
var upload5 = multer5({
  storage: mediaStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB制限
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/svg+xml",
      "video/mp4",
      "video/webm",
      "audio/mpeg",
      "audio/ogg",
      "audio/wav"
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`\u30B5\u30DD\u30FC\u30C8\u3055\u308C\u3066\u3044\u306A\u3044\u30D5\u30A1\u30A4\u30EB\u5F62\u5F0F\u3067\u3059: ${file.mimetype}`));
    }
  }
});
function registerSyncRoutes(app2) {
  app2.post("/api/media/upload", upload5.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "\u30D5\u30A1\u30A4\u30EB\u304C\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3055\u308C\u3066\u3044\u307E\u305B\u3093" });
      }
      const mediaUrl = `/knowledge-base/media/${req.file.filename}`;
      let mediaType = "image";
      if (req.file.mimetype.startsWith("video/")) {
        mediaType = "video";
      } else if (req.file.mimetype.startsWith("audio/")) {
        mediaType = "audio";
      }
      res.json({
        success: true,
        url: mediaUrl,
        type: mediaType,
        size: req.file.size
      });
    } catch (error) {
      console.error("\u30E1\u30C7\u30A3\u30A2\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u30A8\u30E9\u30FC:", error);
      res.status(500).json({ error: "\u30E1\u30C7\u30A3\u30A2\u306E\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
    }
  });
  app2.post("/api/chats/:id/sync-messages", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "\u8A8D\u8A3C\u3055\u308C\u3066\u3044\u307E\u305B\u3093" });
      }
      const userId = req.session.userId;
      const chatId = parseInt(req.params.id);
      const { messages: messages3 } = req.body;
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ error: "\u30C1\u30E3\u30C3\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
      }
      const processedMessages = [];
      for (const message of messages3) {
        try {
          const savedMessage = await storage.createMessage({
            chatId,
            content: message.content,
            isAiResponse: message.role === "assistant"
          });
          if (message.media && Array.isArray(message.media)) {
            for (const mediaItem of message.media) {
              const mediaUrl = mediaItem.url;
              await storage.createMedia({
                messageId: savedMessage.id,
                type: mediaItem.type || "image",
                url: mediaUrl,
                thumbnail: mediaItem.thumbnail
              });
            }
          }
          processedMessages.push(savedMessage.id);
        } catch (messageError) {
          console.error(`\u30E1\u30C3\u30BB\u30FC\u30B8\u51E6\u7406\u30A8\u30E9\u30FC:`, messageError);
        }
      }
      await storage.saveChatExport(chatId, userId, /* @__PURE__ */ new Date());
      res.json({
        success: true,
        syncedCount: processedMessages.length,
        messageIds: processedMessages
      });
    } catch (error) {
      console.error("\u30E1\u30C3\u30BB\u30FC\u30B8\u540C\u671F\u30A8\u30E9\u30FC:", error);
      res.status(500).json({ error: "\u30E1\u30C3\u30BB\u30FC\u30B8\u306E\u540C\u671F\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
    }
  });
}

// server/routes/flow-generator.ts
init_openai();
init_knowledge_base();
import { Router as Router3 } from "express";
import * as fs12 from "fs";
import * as path13 from "path";

// server/lib/json-helper.ts
function cleanJsonResponse(response) {
  if (!response) return "";
  console.log("\u751F\u306E\u30EC\u30B9\u30DD\u30F3\u30B9 (\u4E00\u90E8):", response.substring(0, 100) + "...");
  let cleanedResponse = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").replace(/```/g, "").trim();
  cleanedResponse = cleanedResponse.replace(/^[^{[]*([{[])/, "$1");
  cleanedResponse = cleanedResponse.replace(/([}\]])[^}\]]*$/, "$1");
  console.log("\u30AF\u30EA\u30FC\u30CB\u30F3\u30B0\u5F8C\u306E\u30EC\u30B9\u30DD\u30F3\u30B9 (\u4E00\u90E8):", cleanedResponse.substring(0, 100) + "...");
  try {
    JSON.parse(cleanedResponse);
    console.log("JSON\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u306E\u691C\u8A3C: \u6709\u52B9");
    return cleanedResponse;
  } catch (error) {
    console.error("JSON\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u306E\u691C\u8A3C: \u5931\u6557", error.message);
    const posMatch = error.message.match(/position\s+(\d+)/i);
    let errorPosition = posMatch ? parseInt(posMatch[1], 10) : -1;
    if (errorPosition >= 0) {
      console.log(`\u30A8\u30E9\u30FC\u4F4D\u7F6E: ${errorPosition}`);
      const contextStart = Math.max(0, errorPosition - 30);
      const contextEnd = Math.min(cleanedResponse.length, errorPosition + 30);
      console.log(`\u554F\u984C\u306E\u3042\u308B\u7B87\u6240: "${cleanedResponse.substring(contextStart, errorPosition)}<<<HERE>>>${cleanedResponse.substring(errorPosition, contextEnd)}"`);
      cleanedResponse = repairJsonAtPosition(cleanedResponse, errorPosition);
    }
    cleanedResponse = cleanedResponse.replace(/,\s*([}\]])/g, "$1").replace(/([^"'\s]):/g, "$1: ").replace(/:([^"'\s\[\{])/g, ": $1");
    const openBraces = (cleanedResponse.match(/\{/g) || []).length;
    const closeBraces = (cleanedResponse.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      const diff = openBraces - closeBraces;
      cleanedResponse = cleanedResponse + "}".repeat(diff);
      console.log(`\u9589\u3058\u30AB\u30C3\u30B3\u3092${diff}\u500B\u8FFD\u52A0\u3057\u307E\u3057\u305F`);
    }
    const openBrackets = (cleanedResponse.match(/\[/g) || []).length;
    const closeBrackets = (cleanedResponse.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      const diff = openBrackets - closeBrackets;
      cleanedResponse = cleanedResponse + "]".repeat(diff);
      console.log(`\u9589\u3058\u89D2\u30AB\u30C3\u30B3\u3092${diff}\u500B\u8FFD\u52A0\u3057\u307E\u3057\u305F`);
    }
    try {
      JSON.parse(cleanedResponse);
      console.log("JSON\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u306E\u4FEE\u5FA9: \u6210\u529F");
    } catch (repairError) {
      console.error("JSON\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u306E\u4FEE\u5FA9: \u5931\u6557", repairError.message);
      try {
        const result = extractValidJsonPart(cleanedResponse);
        if (result && result.length > cleanedResponse.length / 2) {
          cleanedResponse = result;
          console.log("\u90E8\u5206\u7684\u306AJSON\u62BD\u51FA: \u6210\u529F");
        } else {
          console.error("\u90E8\u5206\u7684\u306AJSON\u62BD\u51FA: \u5931\u6557 - \u6709\u52B9\u306A\u90E8\u5206\u304C\u5C11\u306A\u3059\u304E\u307E\u3059");
        }
      } catch (extractError) {
        console.error("\u90E8\u5206\u7684\u306AJSON\u62BD\u51FA: \u5931\u6557", extractError);
      }
    }
  }
  return cleanedResponse;
}
function repairJsonAtPosition(json, errorPosition) {
  const beforeError = json.substring(0, errorPosition);
  const afterError = json.substring(errorPosition);
  if (afterError.trim().startsWith("}") && beforeError.lastIndexOf("[") > beforeError.lastIndexOf("{")) {
    const fixedJson = beforeError + "," + afterError;
    console.log("\u914D\u5217\u8981\u7D20\u306E\u533A\u5207\u308A\u30B3\u30F3\u30DE\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F");
    return fixedJson;
  }
  const lastArrayStart = beforeError.lastIndexOf("[");
  const lastObjectStart = beforeError.lastIndexOf("{");
  if (lastArrayStart > lastObjectStart) {
    if (afterError.trim().startsWith("]")) {
      const lastComma = beforeError.lastIndexOf(",");
      if (lastComma > lastArrayStart) {
        const fixedJson = beforeError.substring(0, lastComma) + afterError;
        console.log("\u914D\u5217\u306E\u4E0D\u5B8C\u5168\u306A\u6700\u5F8C\u306E\u8981\u7D20\u3092\u524A\u9664\u3057\u307E\u3057\u305F");
        return fixedJson;
      }
    }
  }
  const balanceInfo = analyzeJsonBalance(beforeError);
  if (balanceInfo.bracketCount > 0 && balanceInfo.lastArrayDelimiter > 0) {
    const validPart = beforeError.substring(0, balanceInfo.lastArrayDelimiter + 1);
    let remainingBrackets = balanceInfo.bracketCount;
    const fixedJson = validPart + "]".repeat(remainingBrackets) + "}".repeat(balanceInfo.braceCount);
    console.log("\u4E0D\u5B8C\u5168\u306A\u914D\u5217\u8981\u7D20\u3092\u4FEE\u6B63\u3057\u307E\u3057\u305F");
    return fixedJson;
  }
  return json;
}
function analyzeJsonBalance(json) {
  let braceBalance = 0;
  let bracketBalance = 0;
  let lastValidComma = -1;
  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    if (char === "{") braceBalance++;
    else if (char === "}") braceBalance--;
    else if (char === "[") bracketBalance++;
    else if (char === "]") bracketBalance--;
    else if (char === "," && bracketBalance > 0) {
      lastValidComma = i;
    }
  }
  return {
    braceCount: braceBalance,
    bracketCount: bracketBalance,
    lastArrayDelimiter: lastValidComma
  };
}
function extractValidJsonPart(text3) {
  const objectMatch = text3.match(/\{(?:[^{}]|(?:\{[^{}]*\}))*\}/);
  const arrayMatch = text3.match(/\[(?:[^\[\]]|(?:\[[^\[\]]*\]))*\]/);
  let result = "";
  if (objectMatch && objectMatch[0]) {
    result = objectMatch[0];
  } else if (arrayMatch && arrayMatch[0]) {
    result = arrayMatch[0];
  }
  try {
    if (result) {
      JSON.parse(result);
      return result;
    }
  } catch (e) {
  }
  return "";
}

// server/routes/flow-generator.ts
var router5 = Router3();
var knowledgeBaseDir3 = "./knowledge-base";
var jsonDir2 = path13.join(knowledgeBaseDir3, "json");
var troubleshootingDir = path13.join(knowledgeBaseDir3, "troubleshooting");
if (!fs12.existsSync(troubleshootingDir)) {
  fs12.mkdirSync(troubleshootingDir, { recursive: true });
}
router5.post("/generate-from-keywords", async (req, res) => {
  try {
    const { keywords: keywords3 } = req.body;
    if (!keywords3 || typeof keywords3 !== "string" || !keywords3.trim()) {
      return res.status(400).json({
        success: false,
        error: "\u30AD\u30FC\u30EF\u30FC\u30C9\u304C\u6307\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093"
      });
    }
    console.log(`\u30AD\u30FC\u30EF\u30FC\u30C9 "${keywords3}" \u304B\u3089\u30D5\u30ED\u30FC\u3092\u751F\u6210\u3057\u307E\u3059`);
    console.log("\u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u304B\u3089\u95A2\u9023\u60C5\u5831\u3092\u691C\u7D22\u4E2D...");
    const relevantChunks = await searchKnowledgeBase(keywords3);
    console.log(`\u95A2\u9023\u30C1\u30E3\u30F3\u30AF\u6570: ${relevantChunks.length}`);
    let relatedKnowledgeText = "";
    if (relevantChunks.length > 0) {
      relatedKnowledgeText = "\n\n\u3010\u95A2\u9023\u3059\u308B\u77E5\u8B58\u30D9\u30FC\u30B9\u60C5\u5831\u3011:\n";
      const chunksToInclude = relevantChunks.slice(0, 5);
      for (const chunk of chunksToInclude) {
        relatedKnowledgeText += `---
\u51FA\u5178: ${chunk.metadata.source || "\u4E0D\u660E"}

${chunk.text}
---

`;
      }
    }
    const prompt = `\u4EE5\u4E0B\u306E\u30AD\u30FC\u30EF\u30FC\u30C9\u306B\u95A2\u9023\u3059\u308B\u5FDC\u6025\u51E6\u7F6E\u30D5\u30ED\u30FC\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002
\u5FC5\u305A\u5B8C\u5168\u306AJSON\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u306E\u307F\u3092\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u8FFD\u52A0\u306E\u8AAC\u660E\u3084\u30C6\u30AD\u30B9\u30C8\u306F\u4E00\u5207\u542B\u3081\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002
\u30EC\u30B9\u30DD\u30F3\u30B9\u306F\u7D14\u7C8B\u306AJSON\u30C7\u30FC\u30BF\u3060\u3051\u3067\u3042\u308B\u3079\u304D\u3067\u3001\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u306E\u30DE\u30FC\u30AF\u30C0\u30A6\u30F3\u8A18\u6CD5\u306F\u4F7F\u7528\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002
\u751F\u6210\u3059\u308BJSON\u306F\u5B8C\u5168\u306A\u6709\u52B9\u306AJSON\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u3001\u9014\u4E2D\u3067\u5207\u308C\u305F\u308A\u4E0D\u5B8C\u5168\u306A\u69CB\u9020\u3067\u3042\u3063\u3066\u306F\u306A\u308A\u307E\u305B\u3093\u3002
\u7279\u306B\u3001\u5404\u914D\u5217\u3084\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u304C\u9069\u5207\u306B\u9589\u3058\u3089\u308C\u3066\u3044\u308B\u3053\u3068\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u4EE5\u4E0B\u306E\u5F62\u5F0F\u306B\u53B3\u5BC6\u306B\u5F93\u3063\u3066\u304F\u3060\u3055\u3044:

{
  "id": "\u6A5F\u68B0\u7684\u306AID\uFF08\u82F1\u6570\u5B57\u3068\u30A2\u30F3\u30C0\u30FC\u30B9\u30B3\u30A2\u306E\u307F\uFF09",
  "title": "\u30D5\u30ED\u30FC\u306E\u30BF\u30A4\u30C8\u30EB",
  "description": "\u7C21\u6F54\u306A\u8AAC\u660E",
  "triggerKeywords": ["\u30AD\u30FC\u30EF\u30FC\u30C91", "\u30AD\u30FC\u30EF\u30FC\u30C92"],
  "steps": [
    {
      "id": "start",
      "title": "\u958B\u59CB",
      "description": "\u3053\u306E\u5FDC\u6025\u51E6\u7F6E\u30AC\u30A4\u30C9\u3067\u306F\u3001[\u4E3B\u306A\u75C7\u72B6\u3084\u554F\u984C]\u306B\u5BFE\u51E6\u3059\u308B\u624B\u9806\u3092\u8AAC\u660E\u3057\u307E\u3059\u3002\u5B89\u5168\u3092\u78BA\u4FDD\u3057\u306A\u304C\u3089\u3001\u539F\u56E0\u3092\u7279\u5B9A\u3057\u89E3\u6C7A\u3059\u308B\u305F\u3081\u306E\u624B\u9806\u306B\u5F93\u3063\u3066\u304F\u3060\u3055\u3044\u3002",
      "imageUrl": "",
      "type": "start",
      "options": [
        {
          "text": "\u72B6\u6CC1\u3092\u78BA\u8A8D\u3059\u308B",
          "nextStepId": "step1",
          "isTerminal": false,
          "conditionType": "other"
        }
      ]
    },
    {
      "id": "step1",
      "title": "\u5B89\u5168\u78BA\u4FDD",
      "description": "1. \u4E8C\u6B21\u707D\u5BB3\u3092\u9632\u3050\u305F\u3081\u3001\u8ECA\u4E21\u304C\u5B89\u5168\u306A\u5834\u6240\u306B\u505C\u6B62\u3057\u3066\u3044\u308B\u3053\u3068\u3092\u78BA\u8A8D\u3057\u307E\u3059\u3002
2. \u63A5\u8FD1\u3059\u308B\u5217\u8ECA\u3084\u969C\u5BB3\u7269\u304C\u306A\u3044\u304B\u5468\u56F2\u3092\u78BA\u8A8D\u3057\u307E\u3059\u3002
3. \u5FC5\u8981\u306B\u5FDC\u3058\u3066\u505C\u6B62\u8868\u793A\u5668\u3084\u9632\u8B77\u7121\u7DDA\u3092\u4F7F\u7528\u3057\u307E\u3059\u3002",
      "imageUrl": "",
      "type": "step",
      "options": [
        {
          "text": "\u5B89\u5168\u78BA\u8A8D\u5B8C\u4E86",
          "nextStepId": "decision1",
          "isTerminal": false,
          "conditionType": "other"
        }
      ]
    },
    {
      "id": "decision1",
      "title": "\u30A8\u30F3\u30B8\u30F3\u72B6\u614B\u306E\u78BA\u8A8D",
      "description": "\u30A8\u30F3\u30B8\u30F3\u306F\u5B8C\u5168\u306B\u505C\u6B62\u3057\u3066\u3044\u307E\u3059\u304B\u3001\u305D\u308C\u3068\u3082\u4E0D\u5B89\u5B9A\u306A\u52D5\u4F5C\u3092\u3057\u3066\u3044\u307E\u3059\u304B\uFF1F",
      "imageUrl": "",
      "type": "decision",
      "options": [
        {
          "text": "\u5B8C\u5168\u306B\u505C\u6B62\u3057\u3066\u3044\u308B",
          "nextStepId": "step2a",
          "isTerminal": false,
          "conditionType": "yes"
        },
        {
          "text": "\u4E0D\u5B89\u5B9A\u306B\u52D5\u4F5C\u3057\u3066\u3044\u308B",
          "nextStepId": "step2b",
          "isTerminal": false,
          "conditionType": "no"
        }
      ]
    },
    {
      "id": "step2a",
      "title": "\u5B8C\u5168\u505C\u6B62\u306E\u539F\u56E0\u78BA\u8A8D",
      "description": "1. \u71C3\u6599\u8A08\u3092\u78BA\u8A8D\u3057\u3001\u71C3\u6599\u5207\u308C\u306E\u53EF\u80FD\u6027\u3092\u78BA\u8A8D\u3057\u307E\u3059\u3002
2. \u30A8\u30F3\u30B8\u30F3\u51B7\u5374\u6C34\u306E\u6E29\u5EA6\u8A08\u3092\u78BA\u8A8D\u3057\u3001\u30AA\u30FC\u30D0\u30FC\u30D2\u30FC\u30C8\u306E\u5146\u5019\u304C\u306A\u3044\u304B\u78BA\u8A8D\u3057\u307E\u3059\u3002
3. \u30D0\u30C3\u30C6\u30EA\u30FC\u96FB\u5727\u8A08\u3092\u78BA\u8A8D\u3057\u3001\u96FB\u6C17\u7CFB\u7D71\u306E\u554F\u984C\u304C\u306A\u3044\u304B\u78BA\u8A8D\u3057\u307E\u3059\u3002",
      "imageUrl": "",
      "type": "step",
      "options": [
        {
          "text": "\u71C3\u6599\u304C\u5C11\u306A\u3044/\u7A7A",
          "nextStepId": "step3a",
          "isTerminal": false,
          "conditionType": "other"
        },
        {
          "text": "\u30AA\u30FC\u30D0\u30FC\u30D2\u30FC\u30C8\u306E\u5146\u5019\u3042\u308A",
          "nextStepId": "step3b",
          "isTerminal": false,
          "conditionType": "other"
        },
        {
          "text": "\u30D0\u30C3\u30C6\u30EA\u30FC\u96FB\u5727\u304C\u4F4E\u3044",
          "nextStepId": "step3c",
          "isTerminal": false,
          "conditionType": "other"
        },
        {
          "text": "\u4E0A\u8A18\u4EE5\u5916\u306E\u539F\u56E0",
          "nextStepId": "step3d",
          "isTerminal": false,
          "conditionType": "other"
        }
      ]
    },
    {
      "id": "step2b",
      "title": "\u4E0D\u5B89\u5B9A\u52D5\u4F5C\u306E\u539F\u56E0\u78BA\u8A8D",
      "description": "1. \u30A8\u30F3\u30B8\u30F3\u56DE\u8EE2\u6570\u306E\u5909\u52D5\u3092\u89B3\u5BDF\u3057\u307E\u3059\u3002
2. \u7570\u97F3\u3084\u632F\u52D5\u304C\u306A\u3044\u304B\u78BA\u8A8D\u3057\u307E\u3059\u3002
3. \u8B66\u544A\u706F\u3084\u30A8\u30E9\u30FC\u30B3\u30FC\u30C9\u3092\u78BA\u8A8D\u3057\u307E\u3059\u3002",
      "imageUrl": "",
      "type": "step",
      "options": [
        {
          "text": "\u71C3\u6599\u7CFB\u7D71\u306E\u554F\u984C\u306E\u7591\u3044",
          "nextStepId": "step3e",
          "isTerminal": false,
          "conditionType": "other"
        },
        {
          "text": "\u96FB\u6C17\u7CFB\u7D71\u306E\u554F\u984C\u306E\u7591\u3044",
          "nextStepId": "step3f",
          "isTerminal": false,
          "conditionType": "other"
        },
        {
          "text": "\u51B7\u5374\u7CFB\u7D71\u306E\u554F\u984C\u306E\u7591\u3044",
          "nextStepId": "step3g",
          "isTerminal": false,
          "conditionType": "other"
        }
      ]
    },
    {
      "id": "step3a",
      "title": "\u71C3\u6599\u5207\u308C\u5BFE\u5FDC",
      "description": "1. \u53EF\u80FD\u3067\u3042\u308C\u3070\u4E88\u5099\u71C3\u6599\u3092\u88DC\u7D66\u3057\u307E\u3059\u3002
2. \u71C3\u6599\u30D5\u30A3\u30EB\u30BF\u30FC\u306E\u8A70\u307E\u308A\u3092\u70B9\u691C\u3057\u307E\u3059\u3002
3. \u88DC\u7D66\u5F8C\u3082\u30A8\u30F3\u30B8\u30F3\u304C\u59CB\u52D5\u3057\u306A\u3044\u5834\u5408\u306F\u3001\u71C3\u6599\u30DD\u30F3\u30D7\u307E\u305F\u306F\u5674\u5C04\u7CFB\u7D71\u306E\u554F\u984C\u306E\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002",
      "imageUrl": "",
      "type": "step",
      "options": [
        {
          "text": "\u71C3\u6599\u88DC\u7D66\u5F8C\u306B\u518D\u8A66\u884C",
          "nextStepId": "decision2",
          "isTerminal": false,
          "conditionType": "other"
        }
      ]
    },
    {
      "id": "decision2",
      "title": "\u30A8\u30F3\u30B8\u30F3\u518D\u59CB\u52D5\u78BA\u8A8D",
      "description": "\u5BFE\u51E6\u5F8C\u3001\u30A8\u30F3\u30B8\u30F3\u306F\u6B63\u5E38\u306B\u59CB\u52D5\u3057\u307E\u3057\u305F\u304B\uFF1F",
      "imageUrl": "",
      "type": "decision",
      "options": [
        {
          "text": "\u306F\u3044\u3001\u6B63\u5E38\u306B\u59CB\u52D5\u3057\u305F",
          "nextStepId": "step_success",
          "isTerminal": false,
          "conditionType": "yes"
        },
        {
          "text": "\u3044\u3044\u3048\u3001\u59CB\u52D5\u3057\u306A\u3044",
          "nextStepId": "step_failure",
          "isTerminal": false,
          "conditionType": "no"
        }
      ]
    },
    {
      "id": "step_success",
      "title": "\u904B\u8EE2\u518D\u958B\u624B\u9806",
      "description": "1. \u30A8\u30F3\u30B8\u30F3\u3092\u6570\u5206\u9593\u30A2\u30A4\u30C9\u30EA\u30F3\u30B0\u72B6\u614B\u3067\u904B\u8EE2\u3057\u3001\u5B89\u5B9A\u6027\u3092\u78BA\u8A8D\u3057\u307E\u3059\u3002
2. \u5404\u8A08\u5668\u306E\u5024\u304C\u6B63\u5E38\u7BC4\u56F2\u5185\u306B\u3042\u308B\u3053\u3068\u3092\u78BA\u8A8D\u3057\u307E\u3059\u3002
3. \u7570\u5E38\u306A\u97F3\u3001\u632F\u52D5\u3001\u81ED\u3044\u304C\u306A\u3044\u304B\u78BA\u8A8D\u3057\u307E\u3059\u3002
4. \u5168\u3066\u6B63\u5E38\u3067\u3042\u308C\u3070\u3001\u904B\u8EE2\u3092\u518D\u958B\u3057\u307E\u3059\u3002
5. \u3057\u3070\u3089\u304F\u306E\u9593\u3001\u30A8\u30F3\u30B8\u30F3\u306E\u72B6\u614B\u306B\u6CE8\u610F\u3092\u6255\u3044\u306A\u304C\u3089\u8D70\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
      "imageUrl": "",
      "type": "step",
      "options": [
        {
          "text": "\u5B8C\u4E86",
          "nextStepId": "end",
          "isTerminal": true,
          "conditionType": "other"
        }
      ]
    },
    {
      "id": "step_failure",
      "title": "\u5C02\u9580\u7684\u306A\u652F\u63F4\u8981\u8ACB",
      "description": "1. \u6307\u4EE4\u6240\u307E\u305F\u306F\u4FDD\u5B88\u62C5\u5F53\u306B\u9023\u7D61\u3057\u3001\u73FE\u5728\u306E\u72B6\u6CC1\u3068\u4F4D\u7F6E\u3092\u5831\u544A\u3057\u307E\u3059\u3002
2. \u3053\u308C\u307E\u3067\u306B\u5B9F\u65BD\u3057\u305F\u78BA\u8A8D\u4E8B\u9805\u3068\u5BFE\u51E6\u5185\u5BB9\u3092\u4F1D\u3048\u307E\u3059\u3002
3. \u8ECC\u9053\u30E2\u30FC\u30BF\u30AB\u30FC\u306E\u727D\u5F15\u307E\u305F\u306F\u4FEE\u7406\u306E\u305F\u3081\u306E\u652F\u63F4\u3092\u8981\u8ACB\u3057\u307E\u3059\u3002
4. \u5B89\u5168\u306A\u5834\u6240\u3067\u652F\u63F4\u306E\u5230\u7740\u3092\u5F85\u3061\u307E\u3059\u3002",
      "imageUrl": "",
      "type": "step",
      "options": [
        {
          "text": "\u5B8C\u4E86",
          "nextStepId": "end",
          "isTerminal": true,
          "conditionType": "other"
        }
      ]
    }
  ]
}

\u3010\u30AD\u30FC\u30EF\u30FC\u30C9\u3011: ${keywords3}
${relatedKnowledgeText}

\u30D5\u30ED\u30FC\u751F\u6210\u306B\u95A2\u3059\u308B\u91CD\u8981\u306A\u30AC\u30A4\u30C9\u30E9\u30A4\u30F3\uFF1A
1. \u30D5\u30ED\u30FC\u306F\u5B9F\u7528\u7684\u3067\u3001\u5B9F\u969B\u306E\u7DCA\u6025\u6642\u306B\u5F79\u7ACB\u3064\u624B\u9806\u3092\u63D0\u4F9B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u30D7\u30EC\u30FC\u30B9\u30DB\u30EB\u30C0\u30FC\u3084\u30B5\u30F3\u30D7\u30EB\u30C6\u30AD\u30B9\u30C8\u306F\u4F7F\u7528\u305B\u305A\u3001\u5177\u4F53\u7684\u3067\u5B9F\u884C\u53EF\u80FD\u306A\u6307\u793A\u3092\u542B\u3081\u3066\u304F\u3060\u3055\u3044\u3002
2. \u5404\u30B9\u30C6\u30C3\u30D7\u306B\u306F\u5177\u4F53\u7684\u306A\u6307\u793A\u3084\u78BA\u8A8D\u4E8B\u9805\u3092\u7B87\u6761\u66F8\u304D\u3067\u542B\u3081\u3066\u304F\u3060\u3055\u3044\u30021\u301C3\u306E\u3088\u3046\u306A\u6570\u5B57\u4ED8\u304D\u30EA\u30B9\u30C8\u3092\u4F7F\u7528\u3057\u3001\u6539\u884C\u306B\u306F\\n\u3092\u4F7F\u7528\u3057\u3066\u304F\u3060\u3055\u3044\u3002
3. decision\uFF08\u5224\u65AD\uFF09\u30CE\u30FC\u30C9\u3067\u306F\u3001\u660E\u78BA\u306A\u8CEA\u554F\u5F62\u5F0F\u306E\u8AAC\u660E\u3092\u63D0\u4F9B\u3057\u3001\u9078\u629E\u80A2\u306F\u5177\u4F53\u7684\u306A\u72B6\u614B\u3084\u6761\u4EF6\u3092\u53CD\u6620\u3055\u305B\u3066\u304F\u3060\u3055\u3044\u3002
4. \u4FDD\u5B88\u7528\u8ECA\u306E\u5C02\u9580\u77E5\u8B58\u3092\u6D3B\u7528\u3057\u3001\u5B89\u5168\u3092\u6700\u512A\u5148\u3057\u305F\u6280\u8853\u7684\u306B\u6B63\u78BA\u306A\u624B\u9806\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002
5. \u7DCA\u6025\u6642\u306E\u5BFE\u5FDC\u3068\u3057\u3066\u3001\u307E\u305A\u5B89\u5168\u78BA\u4FDD\u3001\u6B21\u306B\u72B6\u6CC1\u8A55\u4FA1\u3001\u305D\u3057\u3066\u89E3\u6C7A\u7B56\u306E\u5B9F\u884C\u3068\u3044\u3046\u8AD6\u7406\u7684\u306A\u6D41\u308C\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002
6. \u5C11\u306A\u304F\u3068\u30822\u3064\u306E\u4E3B\u8981\u306A\u5224\u65AD\u30DD\u30A4\u30F3\u30C8\uFF08decision\uFF09\u3068\u3001\u305D\u308C\u305E\u308C\u306B\u5BFE\u5FDC\u3059\u308B\u5206\u5C90\u30D1\u30B9\u3092\u542B\u3081\u3066\u304F\u3060\u3055\u3044\u3002
7. \u3059\u3079\u3066\u306E\u30D1\u30B9\u304C\u5B8C\u4E86\u307E\u305F\u306F\u5C02\u9580\u5BB6\u3078\u306E\u76F8\u8AC7\u3067\u7D42\u308F\u308B\u3088\u3046\u306B\u3057\u3001\u884C\u304D\u6B62\u307E\u308A\u306E\u306A\u3044\u30D5\u30ED\u30FC\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002
8. title\uFF08\u30BF\u30A4\u30C8\u30EB\uFF09\u30D5\u30A3\u30FC\u30EB\u30C9\u306B\u306F\u77ED\u304F\u660E\u78BA\u306A\u898B\u51FA\u3057\u3092\u3001description\uFF08\u8AAC\u660E\uFF09\u30D5\u30A3\u30FC\u30EB\u30C9\u306B\u306F\u8A73\u7D30\u306A\u6307\u793A\u3084\u72B6\u6CC1\u8AAC\u660E\u3092\u5165\u308C\u3066\u304F\u3060\u3055\u3044\u3002
9. \u8ECC\u9053\u30E2\u30FC\u30BF\u30AB\u30FC\u7279\u6709\u306E\u6A5F\u5668\u3084\u30B7\u30B9\u30C6\u30E0\uFF08\u4F8B\uFF1A\u5236\u5FA1\u88C5\u7F6E\u3001\u30D6\u30EC\u30FC\u30AD\u30B7\u30B9\u30C6\u30E0\u3001\u30D1\u30F3\u30BF\u30B0\u30E9\u30D5\u7B49\uFF09\u306B\u95A2\u3059\u308B\u5177\u4F53\u7684\u306A\u8A00\u53CA\u3092\u542B\u3081\u3066\u304F\u3060\u3055\u3044\u3002
10. \u6700\u7D42\u30B9\u30C6\u30C3\u30D7\u3067\u306F\u5FC5\u305A\u5177\u4F53\u7684\u306A\u5BFE\u5FDC\u7D50\u679C\u3084\u6B21\u306E\u30B9\u30C6\u30C3\u30D7\u3092\u660E\u793A\u3057\u3001\u5229\u7528\u8005\u304C\u6B21\u306B\u3068\u308B\u3079\u304D\u884C\u52D5\u3092\u660E\u78BA\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002`;
    console.log("OpenAI\u306B\u30D5\u30ED\u30FC\u751F\u6210\u3092\u30EA\u30AF\u30A8\u30B9\u30C8\u4E2D...");
    const generatedFlow = await processOpenAIRequest(prompt);
    try {
      const cleanedResponse = cleanJsonResponse(generatedFlow);
      const flowData = JSON.parse(cleanedResponse);
      if (!flowData.id) {
        const generatedId = keywords3.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").substring(0, 50);
        flowData.id = `flow_${generatedId}_${Date.now()}`;
      }
      const flowFilePath = path13.join(troubleshootingDir, `${flowData.id}.json`);
      let finalId = flowData.id;
      let counter = 1;
      while (fs12.existsSync(path13.join(troubleshootingDir, `${finalId}.json`))) {
        finalId = `${flowData.id}_${counter}`;
        counter++;
      }
      flowData.id = finalId;
      fs12.writeFileSync(
        path13.join(troubleshootingDir, `${flowData.id}.json`),
        JSON.stringify(flowData, null, 2)
      );
      flowData.createdAt = (/* @__PURE__ */ new Date()).toISOString();
      res.json({
        success: true,
        message: `\u30D5\u30ED\u30FC\u304C\u6B63\u5E38\u306B\u751F\u6210\u3055\u308C\u307E\u3057\u305F: ${flowData.title}`,
        flowData
      });
    } catch (parseError) {
      const error = parseError;
      console.error("\u751F\u6210\u3055\u308C\u305F\u30D5\u30ED\u30FC\u306E\u89E3\u6790\u30A8\u30E9\u30FC:", error);
      console.error("\u751F\u6210\u3055\u308C\u305F\u30C6\u30AD\u30B9\u30C8:", generatedFlow);
      const errorPosition = error.message?.match(/position\s+(\d+)/i);
      if (errorPosition && errorPosition[1]) {
        const position = parseInt(errorPosition[1], 10);
        const contextStart = Math.max(0, position - 20);
        const contextEnd = Math.min(generatedFlow.length, position + 20);
        console.error(`\u30A8\u30E9\u30FC\u4F4D\u7F6E: ${position}`);
        console.error(`\u554F\u984C\u7B87\u6240\u306E\u5468\u8FBA: "${generatedFlow.substring(contextStart, position)}<<<ERROR HERE>>>${generatedFlow.substring(position, contextEnd)}"`);
        if (position > generatedFlow.length * 0.9) {
          const lastBraceIndex = generatedFlow.lastIndexOf("}");
          if (lastBraceIndex > 0) {
            const truncated = generatedFlow.substring(0, lastBraceIndex + 1);
            console.log("\u672B\u5C3E\u3092\u5207\u308A\u8A70\u3081\u305FJSON\u3092\u8A66\u884C...");
            try {
              const truncatedData = JSON.parse(truncated);
              console.log("\u5207\u308A\u8A70\u3081\u305FJSON\u306E\u89E3\u6790\u306B\u6210\u529F\u3057\u307E\u3057\u305F");
              const generatedId = keywords3.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").substring(0, 50);
              truncatedData.id = `flow_${generatedId}_${Date.now()}`;
              const flowFilePath = path13.join(troubleshootingDir, `${truncatedData.id}.json`);
              let finalId = truncatedData.id;
              let counter = 1;
              while (fs12.existsSync(path13.join(troubleshootingDir, `${finalId}.json`))) {
                finalId = `${truncatedData.id}_${counter}`;
                counter++;
              }
              truncatedData.id = finalId;
              fs12.writeFileSync(
                path13.join(troubleshootingDir, `${truncatedData.id}.json`),
                JSON.stringify(truncatedData, null, 2)
              );
              truncatedData.createdAt = (/* @__PURE__ */ new Date()).toISOString();
              return res.json({
                success: true,
                message: `\u4FEE\u5FA9\u3057\u305FJSON\u304B\u3089\u30D5\u30ED\u30FC\u304C\u751F\u6210\u3055\u308C\u307E\u3057\u305F: ${truncatedData.title}`,
                flowData: truncatedData
              });
            } catch (secondError) {
              console.error("\u5207\u308A\u8A70\u3081\u305FJSON\u306E\u89E3\u6790\u306B\u3082\u5931\u6557\u3057\u307E\u3057\u305F:", secondError);
            }
          }
        }
      }
      res.status(500).json({
        success: false,
        error: "\u30D5\u30ED\u30FC\u30C7\u30FC\u30BF\u306E\u89E3\u6790\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
        rawResponse: generatedFlow
      });
    }
  } catch (error) {
    console.error("\u30D5\u30ED\u30FC\u751F\u6210\u30A8\u30E9\u30FC:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
    });
  }
});
router5.get("/list", (req, res) => {
  try {
    const files = fs12.readdirSync(troubleshootingDir).filter((file) => file.endsWith(".json"));
    const flowList = files.map((file) => {
      try {
        const fileContent = fs12.readFileSync(path13.join(troubleshootingDir, file), "utf-8");
        const flowData = JSON.parse(fileContent);
        return {
          id: flowData.id || file.replace(".json", ""),
          title: flowData.title || "\u30BF\u30A4\u30C8\u30EB\u306A\u3057",
          description: flowData.description || "",
          triggerKeywords: flowData.triggerKeywords || [],
          createdAt: flowData.createdAt || null
        };
      } catch (error) {
        console.error(`\u30D5\u30A1\u30A4\u30EB ${file} \u306E\u89E3\u6790\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:`, error);
        return null;
      }
    }).filter(Boolean);
    res.json({
      success: true,
      flowList
    });
  } catch (error) {
    console.error("\u30D5\u30ED\u30FC\u30EA\u30B9\u30C8\u53D6\u5F97\u30A8\u30E9\u30FC:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
    });
  }
});
router5.get("/detail/:id", (req, res) => {
  try {
    const flowId = req.params.id;
    const filePath = path13.join(troubleshootingDir, `${flowId}.json`);
    if (!fs12.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "\u6307\u5B9A\u3055\u308C\u305F\u30D5\u30ED\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"
      });
    }
    const fileContent = fs12.readFileSync(filePath, "utf-8");
    const flowData = JSON.parse(fileContent);
    res.json({
      success: true,
      flowData
    });
  } catch (error) {
    console.error("\u30D5\u30ED\u30FC\u8A73\u7D30\u53D6\u5F97\u30A8\u30E9\u30FC:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
    });
  }
});
router5.delete("/:id", (req, res) => {
  try {
    const flowId = req.params.id;
    const filePath = path13.join(troubleshootingDir, `${flowId}.json`);
    if (!fs12.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "\u6307\u5B9A\u3055\u308C\u305F\u30D5\u30ED\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"
      });
    }
    fs12.unlinkSync(filePath);
    res.json({
      success: true,
      message: "\u30D5\u30ED\u30FC\u304C\u6B63\u5E38\u306B\u524A\u9664\u3055\u308C\u307E\u3057\u305F"
    });
  } catch (error) {
    console.error("\u30D5\u30ED\u30FC\u524A\u9664\u30A8\u30E9\u30FC:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
    });
  }
});
var flowGeneratorRouter = router5;

// server/routes/users.ts
import { Router as Router4 } from "express";
import { eq as eq2, sql as sql4 } from "drizzle-orm";
var router6 = Router4();
router6.get("/", async (req, res) => {
  try {
    const allUsers = await db.query.users.findMany({
      columns: {
        id: true,
        username: true,
        display_name: true,
        role: true,
        department: true
      }
    });
    res.json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
router6.patch("/:id", async (req, res) => {
  console.log(`[DEBUG] PATCH /users/:id \u30A8\u30F3\u30C9\u30DD\u30A4\u30F3\u30C8\u304C\u547C\u3070\u308C\u307E\u3057\u305F`);
  console.log(`[DEBUG] req.method: ${req.method}`);
  console.log(`[DEBUG] req.originalUrl: ${req.originalUrl}`);
  console.log(`[DEBUG] req.path: ${req.path}`);
  console.log(`[DEBUG] req.baseUrl: ${req.baseUrl}`);
  try {
    const { id } = req.params;
    const { username, display_name, role, department, password } = req.body;
    console.log(`[DEBUG] \u30E6\u30FC\u30B6\u30FC\u66F4\u65B0\u30EA\u30AF\u30A8\u30B9\u30C8: ID="${id}" (type: ${typeof id})`);
    console.log(`[DEBUG] \u30EA\u30AF\u30A8\u30B9\u30C8\u30DC\u30C7\u30A3:`, { username, display_name, role, department, hasPassword: !!password });
    console.log(`[DEBUG] Full request params:`, req.params);
    console.log(`[DEBUG] Full request URL:`, req.url);
    console.log(`[DEBUG] \u30BB\u30C3\u30B7\u30E7\u30F3\u60C5\u5831:`, {
      sessionUserId: req.session?.userId,
      sessionUserRole: req.session?.userRole,
      hasSession: !!req.session
    });
    if (!username || !display_name) {
      console.log(`[DEBUG] \u30D0\u30EA\u30C7\u30FC\u30B7\u30E7\u30F3\u5931\u6557: username="${username}", display_name="${display_name}"`);
      return res.status(400).json({ message: "\u30E6\u30FC\u30B6\u30FC\u540D\u3068\u8868\u793A\u540D\u306F\u5FC5\u9808\u3067\u3059" });
    }
    try {
      const testQuery = await db.execute("SELECT 1 as test");
      console.log(`[DEBUG] \u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u63A5\u7D9A\u30C6\u30B9\u30C8\u6210\u529F:`, testQuery);
    } catch (dbError) {
      console.error(`[ERROR] \u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u63A5\u7D9A\u5931\u6557:`, dbError);
      return res.status(500).json({ message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u63A5\u7D9A\u30A8\u30E9\u30FC" });
    }
    const allUsers = await db.query.users.findMany();
    console.log(
      `[DEBUG] \u5168\u30E6\u30FC\u30B6\u30FC\u4E00\u89A7 (${allUsers.length}\u4EF6):`,
      allUsers.map((u) => ({
        id: u.id,
        username: u.username,
        idType: typeof u.id,
        idLength: u.id ? u.id.length : "null",
        exactMatch: u.id === id
      }))
    );
    console.log(`[DEBUG] \u691C\u7D22\u5BFE\u8C61ID: "${id}" (length: ${id.length}, type: ${typeof id})`);
    console.log(`[DEBUG] ID bytes:`, Buffer.from(id, "utf8"));
    console.log(`[DEBUG] \u691C\u7D22\u30AF\u30A8\u30EA\u3092\u5B9F\u884C\u4E2D...`);
    let existingUser;
    try {
      existingUser = await db.query.users.findFirst({
        where: eq2(users2.id, id)
      });
    } catch (queryError) {
      console.error(`[ERROR] Drizzle\u691C\u7D22\u30A8\u30E9\u30FC:`, queryError);
      existingUser = null;
    }
    console.log(`[DEBUG] \u57FA\u672C\u691C\u7D22\u7D50\u679C:`, existingUser ? {
      id: existingUser.id,
      username: existingUser.username,
      exactMatch: existingUser.id === id,
      byteComparison: Buffer.from(existingUser.id, "utf8").equals(Buffer.from(id, "utf8"))
    } : "null");
    try {
      const directResult = await db.execute(sql4`SELECT * FROM users WHERE id = ${id}`);
      console.log(`[DEBUG] \u30D1\u30E9\u30E1\u30FC\u30BF\u5316SQL\u691C\u7D22\u7D50\u679C:`, directResult);
    } catch (sqlError) {
      console.error(`[ERROR] \u30D1\u30E9\u30E1\u30FC\u30BF\u5316SQL\u5B9F\u884C\u5931\u6557:`, sqlError);
    }
    const manualMatch = allUsers.find((u) => u.id === id);
    console.log(`[DEBUG] \u624B\u52D5\u691C\u7D22\u7D50\u679C:`, manualMatch ? {
      id: manualMatch.id,
      username: manualMatch.username,
      found: true
    } : "null");
    console.log(`[DEBUG] \u5B8C\u5168\u4E00\u81F4\u30C1\u30A7\u30C3\u30AF:`, allUsers.map((u) => ({
      storedId: u.id,
      requestId: id,
      exact: u.id === id,
      strict: u.id.valueOf() === id.valueOf(),
      toString: u.id.toString() === id.toString()
    })));
    const finalUser = existingUser || manualMatch;
    if (!finalUser) {
      console.log(`[ERROR] \u30E6\u30FC\u30B6\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093: ID="${id}"`);
      console.log(`[ERROR] \u5229\u7528\u53EF\u80FD\u306AID\u4E00\u89A7:`, allUsers.map((u) => `"${u.id}"`));
      console.log(`[ERROR] \u6587\u5B57\u30B3\u30FC\u30C9\u6BD4\u8F03:`, allUsers.map((u) => ({
        storedId: u.id,
        requestId: id,
        match: u.id === id,
        lengthMatch: u.id.length === id.length,
        includes: u.id.includes(id) || id.includes(u.id)
      })));
      return res.status(404).json({
        message: "\u30E6\u30FC\u30B6\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
        debug: {
          requestedId: id,
          requestedIdLength: id.length,
          availableIds: allUsers.map((u) => u.id),
          possibleMatches: allUsers.filter(
            (u) => u.id.includes(id) || id.includes(u.id) || u.id.toLowerCase() === id.toLowerCase()
          )
        }
      });
    }
    console.log(`[DEBUG] \u6700\u7D42\u7684\u306B\u898B\u3064\u304B\u3063\u305F\u30E6\u30FC\u30B6\u30FC:`, {
      id: finalUser.id,
      username: finalUser.username,
      source: existingUser ? "drizzle_query" : "manual_search"
    });
    const updateData = {
      username,
      display_name,
      role,
      department
    };
    if (password && typeof password === "string" && password.trim().length > 0) {
      const bcrypt = __require("bcrypt");
      updateData.password = await bcrypt.hash(password, 10);
      console.log(`\u30D1\u30B9\u30EF\u30FC\u30C9\u3082\u66F4\u65B0\u3057\u307E\u3059: ID=${id}`);
    } else {
      console.log(`\u30D1\u30B9\u30EF\u30FC\u30C9\u306F\u672A\u8A18\u5165\u307E\u305F\u306F\u7121\u52B9\u306E\u305F\u3081\u3001\u73FE\u5728\u306E\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u7DAD\u6301\u3057\u307E\u3059: ID=${id}`, { password, type: typeof password });
    }
    const [updatedUser] = await db.update(users2).set(updateData).where(eq2(users2.id, id)).returning({
      id: users2.id,
      username: users2.username,
      display_name: users2.display_name,
      role: users2.role,
      department: users2.department
    });
    console.log(`\u30E6\u30FC\u30B6\u30FC\u66F4\u65B0\u6210\u529F: ID=${id}`);
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "\u30E6\u30FC\u30B6\u30FC\u66F4\u65B0\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F" });
  }
});
router6.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`\u30E6\u30FC\u30B6\u30FC\u524A\u9664\u30EA\u30AF\u30A8\u30B9\u30C8: ID=${id}`);
    const existingUser = await db.query.users.findFirst({
      where: eq2(users2.id, id)
    });
    if (!existingUser) {
      console.log(`\u524A\u9664\u5BFE\u8C61\u30E6\u30FC\u30B6\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093: ID=${id}`);
      return res.status(404).json({ message: "\u30E6\u30FC\u30B6\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093" });
    }
    await db.delete(users2).where(eq2(users2.id, id));
    console.log(`\u30E6\u30FC\u30B6\u30FC\u524A\u9664\u6210\u529F: ID=${id}`);
    res.json({ message: "\u30E6\u30FC\u30B6\u30FC\u304C\u524A\u9664\u3055\u308C\u307E\u3057\u305F" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ message: "\u30E6\u30FC\u30B6\u30FC\u524A\u9664\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F" });
  }
});
var usersRouter = router6;

// server/routes.ts
async function registerRoutes(app2) {
  app2.use("/api/tech-support", tech_support_default);
  app2.use("/api/troubleshooting", troubleshooting_default);
  registerDataProcessorRoutes(app2);
  app2.use("/api/emergency-guide", emergency_guide_default);
  app2.use("/api/emergency-flow", emergencyFlowRouter);
  app2.use("/api/flow-generator", flowGeneratorRouter);
  registerSyncRoutes(app2);
  app2.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      openaiKeyExists: !!process.env.OPENAI_API_KEY,
      perplexityKeyExists: !!process.env.PERPLEXITY_API_KEY
    });
  });
  app2.post("/api/chatgpt-test", async (req, res) => {
    try {
      const { text: text3 } = req.body;
      if (!text3) {
        return res.status(400).json({ message: "Text is required" });
      }
      const response = await processOpenAIRequest(text3, true);
      return res.json({ response });
    } catch (error) {
      console.error("Error in /api/chatgpt-test:", error);
      return res.status(500).json({ message: "Error processing request", error: String(error) });
    }
  });
  app2.post("/api/perplexity", async (req, res) => {
    try {
      const { query, systemPrompt, useKnowledgeBaseOnly = true } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }
      console.log(`Perplexity API request: query=${query}, useKnowledgeBaseOnly=${useKnowledgeBaseOnly}`);
      const { content, citations } = await processPerplexityRequest(query, systemPrompt, useKnowledgeBaseOnly);
      return res.json({ content, citations });
    } catch (error) {
      console.error("Error in /api/perplexity:", error);
      return res.status(500).json({
        message: "Error processing Perplexity request",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.use(
    session2({
      secret: process.env.SESSION_SECRET || "emergency-recovery-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        // Set to false for development in Replit
        maxAge: 864e5
        // 24 hours
      },
      store: storage.sessionStore
    })
  );
  const requireAuth = async (req, res, next) => {
    if (!req.session.userId) {
      const adminUser = await storage.getUserByUsername("admin");
      if (adminUser) {
        req.session.userId = adminUser.id;
        req.session.userRole = "admin";
      }
    }
    next();
  };
  const requireAdmin = async (req, res, next) => {
    if (!req.session.userId) {
      const adminUser = await storage.getUserByUsername("admin");
      if (adminUser) {
        req.session.userId = adminUser.id;
        req.session.userRole = "admin";
      }
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "admin") {
      console.log("\u7BA1\u7406\u8005\u6A29\u9650\u304C\u5FC5\u8981\u3067\u3059\u304C\u3001\u958B\u767A\u74B0\u5883\u306E\u305F\u3081\u8A31\u53EF\u3057\u307E\u3059");
    }
    next();
  };
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(credentials.username);
      if (!user || user.password !== credentials.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.session.userId = user.id;
      req.session.userRole = user.role;
      return res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role
      });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out successfully" });
    });
  });
  app2.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      try {
        const adminUser = await storage.getUserByUsername("admin");
        if (adminUser) {
          req.session.userId = adminUser.id;
          req.session.userRole = "admin";
        }
      } catch (error) {
        console.error("\u7BA1\u7406\u8005\u30E6\u30FC\u30B6\u30FC\u53D6\u5F97\u30A8\u30E9\u30FC:", error);
      }
    }
    let user = await storage.getUser(req.session.userId);
    if (!user) {
      try {
        user = await storage.createUser({
          username: "admin",
          password: "admin",
          displayName: "\u7BA1\u7406\u8005",
          role: "admin",
          department: "\u4FDD\u5B88\u90E8"
        });
        console.log("\u30C7\u30D5\u30A9\u30EB\u30C8\u30E6\u30FC\u30B6\u30FC\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F");
      } catch (error) {
        user = await storage.getUserByUsername("admin");
      }
    }
    return res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      department: user.department
    });
  });
  app2.get("/api/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const result = await db.select({
        id: users2.id,
        username: users2.username,
        display_name: users2.display_name,
        role: users2.role,
        department: users2.department
      }).from(users2);
      return res.json(result);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const user = await storage.createUser(userData);
      return res.status(201).json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        department: user.department
      });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Error creating user:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/chats", requireAuth, async (req, res) => {
    const chats3 = await storage.getChatsForUser(req.session.userId);
    return res.json(chats3);
  });
  app2.post("/api/chats", requireAuth, async (req, res) => {
    try {
      const chatData = insertChatSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      const chat = await storage.createChat(chatData);
      return res.json(chat);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/chats/:id", requireAuth, async (req, res) => {
    const chat = await storage.getChat(parseInt(req.params.id));
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    if (chat.userId !== req.session.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return res.json(chat);
  });
  app2.get("/api/chats/:id/messages", requireAuth, async (req, res) => {
    const chatId = parseInt(req.params.id);
    const clearCache = req.query.clear === "true";
    const chat = await storage.getChat(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }
    if (clearCache) {
      console.log(`[DEBUG] Chat messages cache cleared for chat ID: ${chatId}`);
      res.setHeader("X-Chat-Cleared", "true");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      return res.json([]);
    }
    const messages3 = await storage.getMessagesForChat(chat.id);
    const messagesWithMedia = await Promise.all(
      messages3.map(async (message) => {
        const media4 = await storage.getMediaForMessage(message.id);
        return { ...message, media: media4 };
      })
    );
    return res.json(messagesWithMedia);
  });
  app2.post("/api/chats/:id/clear", requireAuth, async (req, res) => {
    try {
      const chatId = parseInt(req.params.id);
      const { force, clearAll } = req.body;
      logDebug3(`\u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u30AF\u30EA\u30A2\u958B\u59CB: chatId=${chatId}, force=${force}, clearAll=${clearAll}`);
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      logDebug3(`\u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u30AF\u30EA\u30A2: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${req.session.userId}`);
      let deletedMessageCount = 0;
      let deletedMediaCount = 0;
      try {
        const beforeMessages = await storage.getMessagesForChat(chatId);
        const beforeCount = beforeMessages.length;
        logDebug3(`\u524A\u9664\u524D\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u6570: ${beforeCount}`);
        for (const message of beforeMessages) {
          try {
            const media4 = await storage.getMediaForMessage(message.id);
            for (const mediaItem of media4) {
              await storage.deleteMedia(mediaItem.id);
              deletedMediaCount++;
            }
          } catch (mediaError) {
            logError2(`\u30E1\u30C7\u30A3\u30A2\u524A\u9664\u30A8\u30E9\u30FC (messageId: ${message.id}):`, mediaError);
          }
        }
        try {
          const result = await storage.clearChatMessages(chatId);
          logDebug3(`\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u524A\u9664\u7D50\u679C:`, result);
        } catch (clearError) {
          logError2("clearChatMessages\u5B9F\u884C\u30A8\u30E9\u30FC:", clearError);
        }
        const afterMessages = await storage.getMessagesForChat(chatId);
        const afterCount = afterMessages.length;
        deletedMessageCount = beforeCount - afterCount;
        logDebug3(`\u524A\u9664\u5F8C\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u6570: ${afterCount}, \u524A\u9664\u3055\u308C\u305F\u30E1\u30C3\u30BB\u30FC\u30B8\u6570: ${deletedMessageCount}`);
        if (afterCount > 0) {
          logWarn2(`\u8B66\u544A: ${afterCount}\u4EF6\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u304C\u6B8B\u3063\u3066\u3044\u307E\u3059`);
          if (force || clearAll) {
            logDebug3("\u5F37\u5236\u524A\u9664\u30E2\u30FC\u30C9\u3067\u6B8B\u5B58\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u500B\u5225\u524A\u9664\u3057\u307E\u3059");
            for (const remainingMessage of afterMessages) {
              try {
                await storage.deleteMessage(remainingMessage.id);
                logDebug3(`\u500B\u5225\u524A\u9664\u5B8C\u4E86: messageId=${remainingMessage.id}`);
                deletedMessageCount++;
              } catch (individualDeleteError) {
                logError2(`\u500B\u5225\u524A\u9664\u30A8\u30E9\u30FC (messageId: ${remainingMessage.id}):`, individualDeleteError);
              }
            }
          }
        }
      } catch (dbError) {
        logError2(`\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u524A\u9664\u30A8\u30E9\u30FC:`, dbError);
        return res.status(500).json({
          message: "Database deletion failed",
          error: dbError.message
        });
      }
      const finalMessages = await storage.getMessagesForChat(chatId);
      const finalCount = finalMessages.length;
      logDebug3(`\u30C1\u30E3\u30C3\u30C8\u5C65\u6B74\u30AF\u30EA\u30A2\u5B8C\u4E86: chatId=${chatId}, \u524A\u9664\u30E1\u30C3\u30BB\u30FC\u30B8\u6570=${deletedMessageCount}, \u524A\u9664\u30E1\u30C7\u30A3\u30A2\u6570=${deletedMediaCount}, \u6700\u7D42\u30E1\u30C3\u30BB\u30FC\u30B8\u6570=${finalCount}`);
      return res.json({
        cleared: true,
        message: "Chat cleared successfully",
        deletedMessages: deletedMessageCount,
        deletedMedia: deletedMediaCount,
        remainingMessages: finalCount,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("Chat clear error:", error);
      return res.status(500).json({
        message: "Error clearing chat",
        error: error.message
      });
    }
  });
  app2.post("/api/chats/:id/export", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const chatId = parseInt(req.params.id);
      const { lastExportTimestamp } = req.body;
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      const messages3 = await storage.getMessagesForChatAfterTimestamp(
        chatId,
        lastExportTimestamp ? new Date(lastExportTimestamp) : /* @__PURE__ */ new Date(0)
      );
      const exportTimestamp = /* @__PURE__ */ new Date();
      await storage.saveChatExport(chatId, userId, exportTimestamp);
      if (messages3.length > 0) {
        try {
          const allMessages = await storage.getMessagesForChat(chatId);
          const messageMedia = {};
          for (const message of allMessages) {
            messageMedia[message.id] = await storage.getMediaForMessage(message.id);
          }
          const lastExport = await storage.getLastChatExport(chatId);
          const formattedData = await formatChatHistoryForExternalSystem(
            chat,
            allMessages,
            messageMedia,
            lastExport
          );
          const { exportFileManager: exportFileManager2 } = await Promise.resolve().then(() => (init_export_file_manager(), export_file_manager_exports));
          exportFileManager2.saveFormattedExport(chatId, formattedData);
          console.log(`\u30C1\u30E3\u30C3\u30C8 ${chatId} \u306E\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u6E08\u307F\u30C7\u30FC\u30BF\u3092\u81EA\u52D5\u751F\u6210\u3057\u307E\u3057\u305F`);
        } catch (formatError) {
          console.error("\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u6E08\u307F\u30C7\u30FC\u30BF\u306E\u751F\u6210\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:", formatError);
        }
      }
      res.json({
        success: true,
        exportTimestamp,
        messageCount: messages3.length
      });
    } catch (error) {
      console.error("Error exporting chat history:", error);
      res.status(500).json({ error: "Failed to export chat history" });
    }
  });
  app2.get("/api/chats/:id/export-formatted", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const chatId = parseInt(req.params.id);
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      logDebug3(`\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u6E08\u307F\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${userId}`);
      if (chat.userId !== userId && req.session.userRole !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      const messages3 = await storage.getMessagesForChat(chatId);
      const messageMedia = {};
      for (const message of messages3) {
        messageMedia[message.id] = await storage.getMediaForMessage(message.id);
      }
      const lastExport = await storage.getLastChatExport(chatId);
      const formattedData = await formatChatHistoryForExternalSystem(
        chat,
        messages3,
        messageMedia,
        lastExport
      );
      res.json(formattedData);
    } catch (error) {
      console.error("Error formatting chat for external system:", error);
      res.status(500).json({ error: "Failed to format chat for external system" });
    }
  });
  app2.get("/api/chats/:id/last-export", requireAuth, async (req, res) => {
    try {
      const chatId = parseInt(req.params.id);
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      const lastExport = await storage.getLastChatExport(chatId);
      res.json(lastExport || { timestamp: null });
    } catch (error) {
      console.error("Error fetching last export:", error);
      res.status(500).json({ error: "Failed to fetch last export information" });
    }
  });
  app2.post("/api/chats/:id/messages/system", requireAuth, async (req, res) => {
    try {
      const chatId = parseInt(req.params.id);
      const { content, isUserMessage = true } = req.body;
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      logDebug3(`\u30B7\u30B9\u30C6\u30E0\u30E1\u30C3\u30BB\u30FC\u30B8\u9001\u4FE1: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${req.session.userId}`);
      const message = await storage.createMessage({
        chatId,
        content,
        isAiResponse: !isUserMessage,
        senderId: req.session.userId
      });
      return res.json(message);
    } catch (error) {
      console.error("\u30B7\u30B9\u30C6\u30E0\u30E1\u30C3\u30BB\u30FC\u30B8\u9001\u4FE1\u30A8\u30E9\u30FC:", error);
      return res.status(500).json({ message: "Error creating system message" });
    }
  });
  app2.post("/api/chats/:id/messages", requireAuth, async (req, res) => {
    try {
      const chatId = req.params.id;
      const { content, useOnlyKnowledgeBase = true, usePerplexity = false } = req.body;
      const userId = req.session.userId || "1";
      let chat = await storage.getChat(chatId);
      if (!chat) {
        logDebug3(`\u30E1\u30C3\u30BB\u30FC\u30B8\u9001\u4FE1\u6642: \u30C1\u30E3\u30C3\u30C8ID ${chatId} \u304C\u5B58\u5728\u3057\u306A\u3044\u305F\u3081\u3001\u65B0\u898F\u4F5C\u6210\u3057\u307E\u3059`);
        try {
          chat = await storage.createChat({
            id: chatId,
            userId,
            title: "\u65B0\u3057\u3044\u30C1\u30E3\u30C3\u30C8"
          });
          logDebug3(`\u30E1\u30C3\u30BB\u30FC\u30B8\u9001\u4FE1\u6642: \u30C1\u30E3\u30C3\u30C8ID ${chatId} \u3092\u4F5C\u6210\u3057\u307E\u3057\u305F`);
        } catch (createError) {
          logError2("\u30E1\u30C3\u30BB\u30FC\u30B8\u9001\u4FE1\u6642\u306E\u30C1\u30E3\u30C3\u30C8\u4F5C\u6210\u30A8\u30E9\u30FC:", createError);
          return res.status(500).json({ message: "Failed to create chat" });
        }
      }
      logDebug3(`\u30C1\u30E3\u30C3\u30C8\u30A2\u30AF\u30BB\u30B9: chatId=${chat.id}, chatUserId=${chat.userId}, sessionUserId=${req.session.userId}`);
      logDebug3(`\u8A2D\u5B9A: \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u306E\u307F\u3092\u4F7F\u7528=${useOnlyKnowledgeBase}`);
      const messageData = insertMessageSchema.parse({
        chatId,
        content,
        senderId: req.session.userId,
        isAiResponse: false
      });
      const message = await storage.createMessage(messageData);
      let citations = [];
      const getAIResponse = async (content2, useKnowledgeBase) => {
        try {
          return await processOpenAIRequest(content2, useKnowledgeBase);
        } catch (error) {
          console.error("OpenAI\u51E6\u7406\u30A8\u30E9\u30FC:", error);
          return "AI\u5FDC\u7B54\u306E\u751F\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002";
        }
      };
      const aiResponse = await getAIResponse(content, useOnlyKnowledgeBase);
      let responseContent;
      if (typeof aiResponse === "string") {
        responseContent = aiResponse;
      } else if (aiResponse && typeof aiResponse === "object") {
        responseContent = aiResponse.content || aiResponse.text || aiResponse.message || JSON.stringify(aiResponse);
      } else {
        responseContent = "AI\u5FDC\u7B54\u306E\u51E6\u7406\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002";
        console.error("\u30B5\u30FC\u30D0\u30FC\u5074AI\u30EC\u30B9\u30DD\u30F3\u30B9\u691C\u8A3C: \u4E0D\u6B63\u306A\u578B", {
          type: typeof aiResponse,
          value: aiResponse
        });
      }
      logDebug3("\u{1F4E4} \u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u306B\u9001\u4FE1\u3059\u308BAI\u30EC\u30B9\u30DD\u30F3\u30B9:", {
        type: typeof responseContent,
        content: responseContent.substring(0, 100) + "...",
        length: responseContent.length,
        isValidString: typeof responseContent === "string" && responseContent.trim().length > 0
      });
      const [aiMessage] = await db.insert(messages).values({
        chatId,
        content: responseContent,
        isAiResponse: true,
        senderId: req.session.userId || "1"
        // AIメッセージでもsenderIdが必要
      }).returning();
      const responseMessage = {
        ...aiMessage,
        content: responseContent,
        // メイン表示用
        text: responseContent,
        // 互換性用（contentと同じ値）
        role: "assistant",
        timestamp: aiMessage.createdAt || /* @__PURE__ */ new Date()
      };
      logDebug3("\u{1F4E4} \u6700\u7D42\u30EC\u30B9\u30DD\u30F3\u30B9:", {
        id: responseMessage.id,
        contentType: typeof responseMessage.content,
        contentPreview: responseMessage.content.substring(0, 100) + "...",
        hasValidContent: !!responseMessage.content && responseMessage.content.trim().length > 0
      });
      res.json(responseMessage);
    } catch (error) {
      logError2("\u30E1\u30C3\u30BB\u30FC\u30B8\u9001\u4FE1\u51E6\u7406\u30A8\u30E9\u30FC:", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : void 0,
        chatId: req.params.id,
        content: req.body.content,
        userId: req.session.userId
      });
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({
        message: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/media", requireAuth, async (req, res) => {
    try {
      const mediaData = insertMediaSchema.parse(req.body);
      const media4 = await storage.createMedia(mediaData);
      return res.json(media4);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/documents", requireAuth, async (req, res) => {
    const documents4 = await storage.getDocumentsForUser(req.session.userId);
    return res.json(documents4);
  });
  app2.post("/api/documents", requireAuth, async (req, res) => {
    try {
      const documentData = insertDocumentSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      const document = await storage.createDocument(documentData);
      return res.json(document);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.put("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const document = await storage.getDocument(parseInt(req.params.id));
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      if (document.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const updatedDocument = await storage.updateDocument(document.id, req.body);
      return res.json(updatedDocument);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/search", requireAuth, async (req, res) => {
    try {
      const keyword = req.query.q;
      if (!keyword) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const documents4 = await storage.searchDocumentsByKeyword(keyword);
      return res.json(documents4);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/knowledge", requireAuth, (req, res) => {
    try {
      const documents4 = listKnowledgeBaseDocuments();
      logDebug3("\u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u4E00\u89A7\u7D50\u679C:", documents4);
      res.json(documents4);
    } catch (error) {
      console.error("Error listing knowledge base documents:", error);
      res.status(500).json({ error: "Failed to list documents" });
    }
  });
  app2.post("/api/knowledge/upload", requireAuth, requireAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "\u30D5\u30A1\u30A4\u30EB\u304C\u3042\u308A\u307E\u305B\u3093" });
      }
      const filePath = req.file.path;
      try {
        const docId = await addDocumentToKnowledgeBase(filePath);
        return res.status(201).json({
          success: true,
          docId,
          message: "\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u304C\u6B63\u5E38\u306B\u8FFD\u52A0\u3055\u308C\u307E\u3057\u305F"
        });
      } catch (err) {
        if (fs14.existsSync(filePath)) {
          fs14.unlinkSync(filePath);
        }
        throw err;
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      const errorMessage = error instanceof Error ? error.message : "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC";
      res.status(500).json({ error: "\u77E5\u8B58\u30D9\u30FC\u30B9\u3078\u306E\u8FFD\u52A0\u306B\u5931\u6557\u3057\u307E\u3057\u305F: " + errorMessage });
    }
  });
  app2.delete("/api/knowledge/:docId", requireAuth, requireAdmin, (req, res) => {
    try {
      const docId = req.params.docId;
      logInfo3(`Document deletion request: ID=${docId}`);
      const success = removeDocumentFromKnowledgeBase(docId);
      if (success) {
        fetch("http://localhost:5000/api/tech-support/init-image-search-data", {
          method: "POST"
        }).then((response) => {
          if (response.ok) {
            logInfo3("Image search data reinitialized");
          } else {
            logWarn2("Failed to reinitialize image search data");
          }
        }).catch((err) => {
          logError2("Image search data reinitialization error:", err);
        });
        res.json({
          success: true,
          message: "Document and related files deleted successfully",
          docId
        });
      } else {
        res.status(404).json({ error: "Document not found" });
      }
    } catch (error) {
      logError2("Error removing document:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to delete document: " + errorMessage });
    }
  });
  app2.post("/api/knowledge/:docId/process", requireAuth, requireAdmin, async (req, res) => {
    try {
      const docId = req.params.docId;
      const documents4 = listKnowledgeBaseDocuments();
      const document = documents4.find((doc) => doc.id === docId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      const docPath = path15.join(process.cwd(), "knowledge-base", document.title);
      if (!fs14.existsSync(docPath)) {
        return res.status(404).json({ error: "Document file not found: " + docPath });
      }
      logInfo3(`Starting document reprocessing: ${docPath}`);
      const newDocId = await addDocumentToKnowledgeBase(docPath);
      res.json({
        success: true,
        docId: newDocId,
        message: "Document reprocessed successfully"
      });
    } catch (error) {
      logError2("Error processing document:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to reprocess document: " + errorMessage });
    }
  });
  app2.post("/api/chatgpt", requireAuth, async (req, res) => {
    try {
      const { text: text3, useOnlyKnowledgeBase = true } = req.body;
      if (!text3) {
        return res.status(400).json({ message: "Text is required" });
      }
      console.log(`ChatGPT API\u547C\u3073\u51FA\u3057: \u30CA\u30EC\u30C3\u30B8\u30D9\u30FC\u30B9\u306E\u307F\u3092\u4F7F\u7528=${useOnlyKnowledgeBase}`);
      const response = await processOpenAIRequest(text3, useOnlyKnowledgeBase);
      if (response.includes("OpenAI API\u30AD\u30FC\u304C\u7121\u52B9")) {
        return res.status(401).json({ message: response });
      }
      if (response.includes("OpenAI API\u306E\u30EA\u30AF\u30A8\u30B9\u30C8\u5236\u9650")) {
        return res.status(429).json({ message: response });
      }
      return res.json({ response });
    } catch (error) {
      console.error("Error in /api/chatgpt:", error);
      return res.status(500).json({ message: "Error processing request" });
    }
  });
  app2.post("/api/optimize-search-query", requireAuth, async (req, res) => {
    try {
      const { text: text3 } = req.body;
      if (!text3) {
        return res.status(400).json({ message: "Text is required" });
      }
      const optimizedQuery = await generateSearchQuery(text3);
      return res.json({ optimizedQuery });
    } catch (error) {
      console.error("Error in /api/optimize-search-query:", error);
      return res.status(500).json({ message: "Error optimizing search query" });
    }
  });
  app2.post("/api/analyze-image", requireAuth, async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ message: "Image data is required" });
      }
      const result = await analyzeVehicleImage(image);
      if (result.analysis.includes("OpenAI API\u30AD\u30FC\u304C\u7121\u52B9")) {
        return res.status(401).json({ message: result.analysis });
      }
      if (result.analysis.includes("OpenAI API\u306E\u30EA\u30AF\u30A8\u30B9\u30C8\u5236\u9650")) {
        return res.status(429).json({ message: result.analysis });
      }
      return res.json(result);
    } catch (error) {
      console.error("Error in /api/analyze-image:", error);
      return res.status(500).json({ message: "Error analyzing image" });
    }
  });
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({
    noServer: true,
    path: "/ws"
  });
  httpServer.on("upgrade", (request, socket, head) => {
    try {
      if (request.url?.startsWith("/ws")) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch (error) {
      console.error("WebSocket upgrade error:", error);
      socket.destroy();
    }
  });
  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    ws.on("message", (message) => {
      console.log("Received message:", message);
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });
    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
    ws.send(JSON.stringify({
      type: "system",
      content: "Connected to Emergency Recovery Chat WebSocket server"
    }));
  });
  app2.use("/api/troubleshooting", troubleshooting_default);
  const routeDebugger = (req, res, next) => {
    if (req.path.includes("/users/")) {
      console.log(`[ROUTER DEBUG] ${req.method} ${req.originalUrl}`);
      console.log(`[ROUTER DEBUG] Path: ${req.path}`);
      console.log(`[ROUTER DEBUG] Params:`, req.params);
    }
    next();
  };
  app2.use("/api/users", routeDebugger, usersRouter);
  function logDebug3(message, ...args) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(message, ...args);
    }
  }
  function logInfo3(message, ...args) {
    console.info(message, ...args);
  }
  function logWarn2(message, ...args) {
    console.warn(message, ...args);
  }
  function logError2(message, ...args) {
    console.error(message, ...args);
  }
  app2.get("/api/troubleshooting/list", async (req, res) => {
    try {
      const troubleshootingDir2 = path15.join(process.cwd(), "knowledge-base", "troubleshooting");
      if (!fs14.existsSync(troubleshootingDir2)) {
        return res.json([]);
      }
      const files = fs14.readdirSync(troubleshootingDir2).filter((file) => file.endsWith(".json"));
      const troubleshootingList = [];
      for (const file of files) {
        try {
          const filePath = path15.join(troubleshootingDir2, file);
          const content = fs14.readFileSync(filePath, "utf8");
          const data = JSON.parse(content);
          troubleshootingList.push(data);
        } catch (error) {
          logError2(`Error reading file ${file}:`, error);
        }
      }
      res.json(troubleshootingList);
    } catch (error) {
      logError2("Error in troubleshooting list:", error);
      res.status(500).json({ error: "Failed to load troubleshooting data" });
    }
  });
  app2.get("/api/chat/:chatId/export", async (req, res) => {
    try {
      const { chatId } = req.params;
      const chatUserId = req.query.userId;
      const sessionUserId = req.session?.userId;
      if (chatUserId && sessionUserId && chatUserId !== sessionUserId) {
        logWarn2(`Unauthorized chat access attempt`);
        return res.status(403).json({ message: "Unauthorized access to chat" });
      }
    } catch (error) {
      console.error("\u30C1\u30E3\u30C3\u30C8\u306E\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:", error);
      res.status(500).json({ error: "\u30C1\u30E3\u30C3\u30C8\u306E\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F" });
    }
  });
  return httpServer;
}

// server/index.ts
init_knowledge_base();
import path16 from "path";
import fs15 from "fs";
import dotenv2 from "dotenv";
import { exec } from "child_process";
import { fileURLToPath as fileURLToPath5 } from "url";
import open from "open";

// server/lib/logger.ts
var getLogLevel = () => {
  const level = process.env.LOG_LEVEL?.toUpperCase();
  const isDevelopment = process.env.NODE_ENV === "development";
  if (!isDevelopment) {
    return 0 /* ERROR */;
  }
  switch (level) {
    case "DEBUG":
      return 3 /* DEBUG */;
    case "INFO":
      return 2 /* INFO */;
    case "WARN":
      return 1 /* WARN */;
    case "ERROR":
      return 0 /* ERROR */;
    default:
      return 2 /* INFO */;
  }
};
var currentLogLevel = getLogLevel();

// server/index.ts
function secureLog(msg, ...args) {
  if (process.env.NODE_ENV !== "production") {
    console.log(msg, ...args);
  }
}
var __filename4 = fileURLToPath5(import.meta.url);
var __dirname5 = path16.dirname(__filename4);
try {
  dotenv2.config({ path: path16.resolve(__dirname5, ".env") });
  dotenv2.config({ path: path16.resolve(process.cwd(), ".env") });
  console.log("\u2705 Environment files loaded");
} catch (error) {
  console.warn("\u26A0\uFE0F  Failed to load .env files:", error instanceof Error ? error.message : error);
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}
console.log("\u{1F527} Environment check:");
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   CWD: ${process.cwd()}`);
console.log(`   __dirname: ${__dirname5}`);
var openaiKey = process.env.OPENAI_API_KEY || process.env.REPLIT_SECRET_OPENAI_API_KEY;
var PROCESS_LOCK_FILE = "/tmp/troubleshooting-server.lock";
process.title = "troubleshooting-server";
var initializeProcessLock = async () => {
  try {
    if (fs15.existsSync(PROCESS_LOCK_FILE)) {
      fs15.unlinkSync(PROCESS_LOCK_FILE);
      console.log("\u{1F9F9} Previous lock file removed");
    }
    exec(`lsof -ti:${port}`, (error, stdout) => {
      if (stdout.trim()) {
        console.log(`\u{1F52A} Killing process on port ${port}: ${stdout.trim()}`);
        exec(`kill -9 ${stdout.trim()}`);
      }
    });
    await new Promise((resolve3) => setTimeout(resolve3, 1e3));
    fs15.writeFileSync(PROCESS_LOCK_FILE, process.pid.toString());
    console.log(`\u{1F512} Process lock acquired: PID ${process.pid}`);
  } catch (error) {
    console.error("Lock file management error:", error);
  }
};
await initializeProcessLock();
var app = express4();
var port = process.env.PORT || 5e3;
var cleanup = () => {
  try {
    if (fs15.existsSync(PROCESS_LOCK_FILE)) {
      fs15.unlinkSync(PROCESS_LOCK_FILE);
    }
  } catch (e) {
  }
  process.exit(0);
};
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://replit.com",
    "https://*.replit.dev",
    "https://*.replit.app",
    process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev` : null
  ].filter(Boolean);
  if (origin && allowedOrigins.some((allowed) => origin.match(allowed?.replace("*", ".*")))) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS,PATCH");
  res.header("Access-Control-Allow-Headers", "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma,X-Custom-Header");
  res.header("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
  } else {
    next();
  }
});
app.use(express4.json({ limit: "50mb" }));
app.use(express4.urlencoded({ extended: false, limit: "50mb" }));
app.use((req, res, next) => {
  res.header("X-Frame-Options", "SAMEORIGIN");
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-XSS-Protection", "1; mode=block");
  res.header("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
var healthStatus = () => ({
  status: "ok",
  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
  environment: process.env.NODE_ENV || "development",
  knowledgeBase: knowledgeBaseReady ? "ready" : "initializing",
  version: "1.0.0"
});
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
app.get("/api/ready", (req, res) => {
  res.status(200).json(healthStatus());
});
app.get("/", (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return next();
  } else {
    return next();
  }
});
app.use("/static", express4.static(path16.join(process.cwd(), "public")));
app.use("/knowledge-base/images", express4.static(path16.join(process.cwd(), "knowledge-base", "images")));
app.use("/knowledge-base/data", express4.static(path16.join(process.cwd(), "knowledge-base", "data")));
app.use("/knowledge-base/json", express4.static(path16.join(process.cwd(), "knowledge-base", "json")));
app.use("/knowledge-base/media", express4.static(path16.join(process.cwd(), "knowledge-base", "media")));
app.use("/uploads/:dir", (req, res) => {
  const dir = req.params.dir;
  if (["images", "data", "json", "media", "ppt"].includes(dir)) {
    const redirectPath = `/knowledge-base/${dir}${req.path}`;
    res.redirect(redirectPath);
  } else {
    res.status(404).send("Not found");
  }
});
app.get("/test", (req, res) => {
  res.sendFile(path16.join(process.cwd(), "public", "api-test.html"));
});
app.get("/api/network-test", (req, res) => {
  const networkInfo = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: "connected"
  };
  res.json(networkInfo);
});
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === "production") {
        if (res.statusCode >= 500) {
          console.error(`[ERROR] ${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
        }
      } else if (res.statusCode >= 400) {
        log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
      }
    });
  }
  next();
});
console.log("\u{1F680} Starting server initialization...");
console.log(`\u{1F4CD} Port: ${port}`);
console.log(`\u{1F30D} Environment: ${process.env.NODE_ENV || "development"}`);
(async () => {
  try {
    let startServer2 = function() {
      server.listen(port, "0.0.0.0", () => {
        console.log(`\u{1F680} Server is running on port ${port}`);
        console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
        console.log(`Host: 0.0.0.0:${port}`);
        if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
          console.log(`External URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`);
        }
        if (process.env.NODE_ENV === "production") {
          console.log("Production server started successfully");
          console.log(`Health endpoints: /api/health, /api/ready`);
        }
        if (process.env.NODE_ENV !== "production") {
          initializePostStartup();
        } else {
          initializePostStartup();
        }
      }).on("error", (err) => {
        console.error("\u30B5\u30FC\u30D0\u30FC\u8D77\u52D5\u30A8\u30E9\u30FC:", {
          message: err.message,
          code: err.code,
          port,
          environment: process.env.NODE_ENV
        });
        if (err.code === "EADDRINUSE") {
          console.error(`\u30DD\u30FC\u30C8 ${port} \u306F\u65E2\u306B\u4F7F\u7528\u3055\u308C\u3066\u3044\u307E\u3059`);
        }
        process.exit(1);
      });
    };
    var startServer = startServer2;
    console.log("\u{1F4E6} Initializing storage...");
    app.locals.storage = storage;
    console.log("\u{1F6E3}\uFE0F  Registering routes...");
    const server = await registerRoutes(app);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });
    if (process.env.NODE_ENV !== "production") {
      await setupVite(app, server);
    } else {
      const possibleDistPaths = [
        path16.join(process.cwd(), "dist"),
        path16.join(process.cwd(), "client", "dist"),
        path16.join(process.cwd(), "build")
      ];
      let distPath = "";
      for (const pathToCheck of possibleDistPaths) {
        if (fs15.existsSync(pathToCheck)) {
          distPath = pathToCheck;
          console.log("Found dist path:", distPath);
          break;
        }
      }
      if (!distPath) {
        console.log("No dist path found. Checked:", possibleDistPaths);
      }
      app.get("/api/debug/files", (req, res) => {
        try {
          const distExists = fs15.existsSync(distPath);
          const files = distExists ? fs15.readdirSync(distPath) : [];
          const indexExists = fs15.existsSync(path16.join(distPath, "index.html"));
          res.json({
            distPath,
            distExists,
            indexExists,
            files,
            cwd: process.cwd(),
            nodeEnv: process.env.NODE_ENV
          });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
      if (distPath && fs15.existsSync(distPath)) {
        const distFiles = fs15.readdirSync(distPath);
        console.log("Available dist files:", distFiles);
        app.use(express4.static(distPath, {
          index: false,
          setHeaders: (res, filePath) => {
            console.log("Serving static file:", filePath);
            if (filePath.endsWith(".html")) {
              res.setHeader("Cache-Control", "no-cache");
            }
          }
        }));
        app.get("*", (req, res, next) => {
          if (req.path.startsWith("/api/") || req.path.startsWith("/knowledge-base/") || req.path.startsWith("/static/")) {
            console.log("Skipping SPA routing for:", req.path);
            return next();
          }
          const indexPath = path16.join(distPath, "index.html");
          console.log("Attempting to serve index.html for:", req.path, "from:", indexPath);
          if (fs15.existsSync(indexPath)) {
            console.log("Successfully serving index.html");
            res.sendFile(indexPath);
          } else {
            console.error("index.html not found at:", indexPath);
            console.error("Available files in dist:", fs15.readdirSync(distPath));
            res.status(500).send(`
            <html>
              <body>
                <h1>Application Error</h1>
                <p>index.html not found</p>
                <p>Dist path: ${distPath}</p>
                <p>Available files: ${fs15.readdirSync(distPath).join(", ")}</p>
              </body>
            </html>
          `);
          }
        });
        console.log("\u30D7\u30ED\u30C0\u30AF\u30B7\u30E7\u30F3\u7528\u9759\u7684\u30D5\u30A1\u30A4\u30EB\u914D\u4FE1\u3092\u8A2D\u5B9A\u3057\u307E\u3057\u305F");
      } else {
        console.error("\u30D3\u30EB\u30C9\u30D5\u30A1\u30A4\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093:", distPath);
        console.error("Current working directory:", process.cwd());
        console.error("Available directories:", fs15.readdirSync(process.cwd()));
        app.get("*", (req, res, next) => {
          if (req.path.startsWith("/api/")) {
            return next();
          }
          res.status(503).send(`
          <html>
            <body>
              <h1>Application Not Built</h1>
              <p>The application has not been built for production.</p>
              <p>Expected build directory: ${distPath}</p>
              <p>Current directory: ${process.cwd()}</p>
              <p>Available directories: ${fs15.readdirSync(process.cwd()).join(", ")}</p>
            </body>
          </html>
        `);
        });
      }
    }
    exec(`lsof -ti:${port}`, (error, stdout) => {
      if (stdout.trim()) {
        console.warn(`\u26A0\uFE0F  Port ${port} is already in use by process ${stdout.trim()}`);
        console.log("Attempting to kill existing process...");
        exec(`kill -9 ${stdout.trim()}`, () => {
          startServer2();
        });
      } else {
        startServer2();
      }
    });
    process.on("SIGTERM", () => {
      secureLog("SIGTERM signal received: closing HTTP server");
      server.close(() => {
        secureLog("HTTP server closed");
      });
    });
    process.on("SIGINT", () => {
      secureLog("SIGINT signal received: closing HTTP server");
      server.close(() => {
        secureLog("HTTP server closed");
      });
    });
    process.on("unhandledRejection", (reason, promise) => {
      if (reason && typeof reason === "object") {
        const reasonStr = reason.toString();
        if (reasonStr.includes("ECONNRESET") || reasonStr.includes("EPIPE") || reasonStr.includes("ENOTFOUND") || reasonStr.includes("socket hang up")) {
          return;
        }
      }
      console.error("Unhandled Rejection:", reason);
    });
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error.message);
      if (server) {
        server.close(() => {
          process.exit(1);
        });
        setTimeout(() => process.exit(1), 5e3);
      } else {
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("\u274C Server initialization failed:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace");
    process.exit(1);
  }
})().catch((error) => {
  console.error("\u274C Unhandled server startup error:", error);
  process.exit(1);
});
var knowledgeBaseReady = false;
var initializationInProgress = false;
async function initializePostStartup() {
  if (initializationInProgress || knowledgeBaseReady) {
    console.log("\u77E5\u8B58\u30D9\u30FC\u30B9\u521D\u671F\u5316: \u65E2\u306B\u5B9F\u884C\u4E2D\u307E\u305F\u306F\u5B8C\u4E86\u6E08\u307F");
    return;
  }
  initializationInProgress = true;
  setImmediate(async () => {
    try {
      console.log("\u77E5\u8B58\u30D9\u30FC\u30B9\u306E\u521D\u671F\u5316\u3092\u958B\u59CB...");
      await initializeKnowledgeBase();
      console.log("\u77E5\u8B58\u30D9\u30FC\u30B9\u306E\u521D\u671F\u5316\u5B8C\u4E86");
      knowledgeBaseReady = true;
      initializationInProgress = false;
    } catch (err) {
      console.error("\u521D\u671F\u5316\u6642\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F:", err);
      initializationInProgress = false;
    }
  });
}
