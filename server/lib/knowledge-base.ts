/**
 * 知識ベース検索関連の機能
 */
import * as path from 'path';
import * as fs from 'fs';

// 知識ベースディレクトリのパス（絶対パスで指定）
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KNOWLEDGE_BASE_DIR = process.env.KNOWLEDGE_BASE_PATH || path.join(process.cwd(), 'knowledge-base');
const DATA_DIR = path.join(KNOWLEDGE_BASE_DIR, 'data');
const TEXT_DIR = path.join(KNOWLEDGE_BASE_DIR, 'text');
const TROUBLESHOOTING_DIR = path.join(KNOWLEDGE_BASE_DIR, 'troubleshooting');
const BACKUP_DIR = path.join(KNOWLEDGE_BASE_DIR, 'backups');
const DOCUMENTS_DIR = path.join(KNOWLEDGE_BASE_DIR, 'documents');
const QA_DIR = path.join(KNOWLEDGE_BASE_DIR, 'qa');
const JSON_DIR = path.join(KNOWLEDGE_BASE_DIR, 'json');
const PPT_DIR = path.join(KNOWLEDGE_BASE_DIR, 'ppt');

// 知識ベースインデックスファイル
export const INDEX_FILE = path.join(KNOWLEDGE_BASE_DIR, 'index.json');

// ナレッジデータの種類
export enum KnowledgeType {
  TROUBLESHOOTING = 'troubleshooting',
  DOCUMENT = 'document',
  QA = 'qa',
  JSON = 'json',
  PPT = 'ppt',
  TEXT = 'text'
}

// ナレッジデータのメタデータ
export interface KnowledgeMetadata {
  id: string;
  title: string;
  type: KnowledgeType;
  category?: string;
  tags?: string[];
  path: string;
  size?: number;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  chunkCount?: number;
  processedAt?: string;
}

// 知識ベースの初期化
export async function initializeKnowledgeBase() {
  try {
    // 必要なディレクトリを作成（非同期で実行）
    const directories = [
      KNOWLEDGE_BASE_DIR, 
      DATA_DIR, 
      TEXT_DIR, 
      TROUBLESHOOTING_DIR, 
      BACKUP_DIR,
      DOCUMENTS_DIR,
      QA_DIR,
      JSON_DIR,
      PPT_DIR
    ];
    
    for (const dir of directories) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      } catch (error) {
        console.warn(`ディレクトリ作成警告 ${dir}:`, error);
        // 致命的でないエラーは継続
      }
    }
    
    // Knowledge base directories initialized
    return true;
  } catch (error) {
    console.error('知識ベース初期化エラー:', error);
    throw error;
  }
}

/**
 * シンプルな類似度計算関数
 * @param text1 
 * @param text2 
 * @returns 
 */
function calculateSimilarity(text1: string, text2: string): number {
  // 文字列を小文字に変換して単語に分割
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  // 共通の単語数をカウント
  const commonWords = words1.filter(word => words2.includes(word));
  
  // 類似度スコアを計算（Jaccard類似度の簡易版）
  const allWords = new Set([...words1, ...words2]);
  return commonWords.length / allWords.size;
}

/**
 * 改善された類似度計算関数
 * @param query 検索クエリ
 * @param text 比較対象テキスト
 * @param metadata メタデータ
 * @returns 類似度スコア（0-1）
 */
function calculateEnhancedSimilarity(query: string, text: string, metadata: any): number {
  // 基本の類似度計算
  const baseSimilarity = calculateSimilarity(query, text);
  
  // 重要度ボーナス（isImportantフラグがある場合）
  let importanceBonus = 0;
  if (metadata.isImportant) {
    importanceBonus = 0.2;
  }
  
  // キーワードマッチングの強化
  const queryWords = query.toLowerCase().split(/\s+/);
  const textWords = text.toLowerCase().split(/\s+/);
  
  // 専門用語の重み付け
  const technicalTerms = [
    'エンジン', '保守', '整備', '故障', '修理', '点検', '安全', '作業',
    '車両', '機械', '装置', 'システム', '運転', '操作', '確認', '対応',
    'トラブル', '問題', '異常', '警告', '停止', '始動', '運転', '走行'
  ];
  
  let technicalBonus = 0;
  const matchedTechnicalTerms = queryWords.filter(word => 
    technicalTerms.some(term => term.includes(word) || word.includes(term))
  );
  technicalBonus = matchedTechnicalTerms.length * 0.1;
  
  // 完全一致の重み付け
  let exactMatchBonus = 0;
  if (text.toLowerCase().includes(query.toLowerCase())) {
    exactMatchBonus = 0.3;
  }
  
  // 長さによる正規化（短いテキストは不利にならないように）
  const lengthNormalization = Math.min(1.0, text.length / 100);
  
  // 最終スコアの計算
  const finalScore = Math.min(1.0, 
    baseSimilarity + importanceBonus + technicalBonus + exactMatchBonus
  ) * lengthNormalization;
  
  return finalScore;
}

/**
 * テキストのチャンクを表すインターフェース
 */
export interface TextChunk {
  text: string;
  metadata: {
    source: string;
    index: number;
    isImportant?: boolean;
    documentId?: string;
  };
  similarity?: number;
}

/**
 * 知識ベースから検索する関数
 * @param query 検索クエリ
 * @returns 関連するテキストチャンクの配列
 */
export async function searchKnowledgeBase(query: string): Promise<TextChunk[]> {
  // インメモリで単純な検索を実装
  try {
    console.log('🔍 searchKnowledgeBase開始:', query);
    const chunks: TextChunk[] = [];
    
    // テキストファイルを読み込む
    try {
      console.log('📁 TEXT_DIR確認:', TEXT_DIR);
      if (fs.existsSync(TEXT_DIR)) {
        const textFiles = fs.readdirSync(TEXT_DIR).filter(file => file.endsWith('.txt'));
        console.log('📄 テキストファイル数:', textFiles.length);
        
        for (const file of textFiles) {
          try {
            const content = fs.readFileSync(path.join(TEXT_DIR, file), 'utf-8');
            
            // テキストをチャンクに分割（単純な段落分割）
            const paragraphs = content.split(/\n\s*\n/);
            
            paragraphs.forEach((paragraph, index) => {
              // 空の段落はスキップ
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
            console.error(`ファイル ${file} の読み込み中にエラーが発生しました:`, error);
          }
        }
      } else {
        console.log('TEXT_DIRが存在しません:', TEXT_DIR);
      }
    } catch (error) {
      console.error('テキストファイル検索エラー:', error);
    }
    
    // documentsディレクトリのチャンクデータを読み込む（新規追加）
    try {
      console.log('📁 DOCUMENTS_DIR確認:', DOCUMENTS_DIR);
      if (fs.existsSync(DOCUMENTS_DIR)) {
        const documentDirs = fs.readdirSync(DOCUMENTS_DIR).filter(dir => {
          const dirPath = path.join(DOCUMENTS_DIR, dir);
          return fs.statSync(dirPath).isDirectory();
        });
        console.log('📂 ドキュメントディレクトリ数:', documentDirs.length);
        
        for (const dir of documentDirs) {
          const chunksPath = path.join(DOCUMENTS_DIR, dir, 'chunks.json');
          const metadataPath = path.join(DOCUMENTS_DIR, dir, 'metadata.json');
          
          console.log('🔍 チャンクファイル確認:', chunksPath);
          if (fs.existsSync(chunksPath)) {
            try {
              const chunksContent = fs.readFileSync(chunksPath, 'utf-8');
              const chunksData = JSON.parse(chunksContent);
              
              // メタデータも読み込み
              let documentTitle = dir;
              if (fs.existsSync(metadataPath)) {
                try {
                  const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
                  const metadata = JSON.parse(metadataContent);
                  documentTitle = metadata.title || dir;
                } catch (error) {
                  console.error(`メタデータファイル ${metadataPath} の読み込み中にエラーが発生しました:`, error);
                }
              }
              
              // チャンクデータを検索対象に追加
              if (Array.isArray(chunksData)) {
                console.log(`📄 ${documentTitle} から ${chunksData.length} チャンクを読み込み`);
                chunksData.forEach((chunk: any, index: number) => {
                  if (chunk.text && chunk.text.trim()) {
                    chunks.push({
                      text: chunk.text,
                      metadata: {
                        source: `${documentTitle} (チャンク${index + 1})`,
                        index: index,
                        isImportant: chunk.metadata?.isImportant || false,
                        documentId: dir
                      }
                    });
                  }
                });
              }
              
              console.log(`ドキュメント ${documentTitle} から ${chunksData.length} チャンクを読み込みました`);
            } catch (error) {
              console.error(`チャンクファイル ${chunksPath} の読み込み中にエラーが発生しました:`, error);
            }
          } else {
            console.log('チャンクファイルが存在しません:', chunksPath);
          }
        }
      } else {
        console.log('DOCUMENTS_DIRが存在しません:', DOCUMENTS_DIR);
      }
    } catch (error) {
      console.error('documentsディレクトリ検索エラー:', error);
    }
    
    // トラブルシューティングフローも検索対象に含める
    try {
      console.log('📁 TROUBLESHOOTING_DIR確認:', TROUBLESHOOTING_DIR);
      if (fs.existsSync(TROUBLESHOOTING_DIR)) {
        const flowFiles = fs.readdirSync(TROUBLESHOOTING_DIR).filter(file => file.endsWith('.json'));
        console.log('📄 フローファイル数:', flowFiles.length);
        
        for (const file of flowFiles) {
          try {
            const content = fs.readFileSync(path.join(TROUBLESHOOTING_DIR, file), 'utf-8');
            const flowData = JSON.parse(content);
            
            // フローのタイトルと説明を検索対象に含める
            const flowText = `${flowData.title || ''} ${flowData.description || ''}`;
            
            // キーワードがあれば追加
            if (flowData.triggerKeywords && Array.isArray(flowData.triggerKeywords)) {
              const keywords = flowData.triggerKeywords.join(' ');
              chunks.push({
                text: `${flowText} ${keywords}`,
                metadata: {
                  source: `フロー: ${file}`,
                  index: 0
                }
              });
            } else {
              chunks.push({
                text: flowText,
                metadata: {
                  source: `フロー: ${file}`,
                  index: 0
                }
              });
            }
            
            // 各ステップの説明も検索対象に含める
            if (flowData.steps && Array.isArray(flowData.steps)) {
              flowData.steps.forEach((step: any, index: number) => {
                const stepText = `${step.title || ''} ${step.description || ''}`;
                if (stepText.trim()) {
                  chunks.push({
                    text: stepText,
                    metadata: {
                      source: `フローステップ: ${file}`,
                      index: index + 1
                    }
                  });
                }
              });
            }
          } catch (error) {
            console.error(`フローファイル ${file} の読み込み中にエラーが発生しました:`, error);
          }
        }
      } else {
        console.log('TROUBLESHOOTING_DIRが存在しません:', TROUBLESHOOTING_DIR);
      }
    } catch (error) {
      console.error('トラブルシューティングフロー検索エラー:', error);
    }
    
    console.log('📊 総チャンク数:', chunks.length);
    
    // クエリとの類似度を計算（改善版）
    const scoredChunks = chunks.map(chunk => {
      const similarityScore = calculateEnhancedSimilarity(query, chunk.text, chunk.metadata);
      return {
        ...chunk,
        similarity: similarityScore
      };
    });
    
    // 類似度でソートして上位10件を返す
    const results = scoredChunks
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, 10);
    
    console.log('🔍 検索結果数:', results.length);
    if (results.length > 0) {
      console.log('🔍 最高類似度:', results[0].similarity);
    }
    
    return results;
      
  } catch (error) {
    console.error('知識ベース検索エラー:', error);
    return [];
  }
}

/**
 * 知識ベースの内容を使用してシステムプロンプトを生成する
 * @param query ユーザークエリ
 * @returns 知識ベースを組み込んだシステムプロンプト
 */
export async function generateSystemPromptWithKnowledge(query: string): Promise<string> {
  // 知識ベースから関連情報を検索
  const relevantChunks = await searchKnowledgeBase(query);
  
  // 関連情報をプロンプトに追加するための文字列を構築
  let knowledgeText = '';
  if (relevantChunks.length > 0) {
    knowledgeText = '\n\n【📚 知識ベース検索結果】:\n';
    
    // 重要度と類似度でソート
    const sortedChunks = relevantChunks.sort((a, b) => {
      // 重要度を優先
      const aImportant = a.metadata.isImportant ? 1 : 0;
      const bImportant = b.metadata.isImportant ? 1 : 0;
      if (aImportant !== bImportant) {
        return bImportant - aImportant;
      }
      // 次に類似度でソート
      return (b.similarity || 0) - (a.similarity || 0);
    });
    
    // 緊急度・重要度別にチャンクを分類
    const urgentChunks = sortedChunks.filter(chunk => 
      chunk.metadata.isImportant && 
      (chunk.text.includes('緊急') || chunk.text.includes('危険') || chunk.text.includes('注意'))
    );
    const importantChunks = sortedChunks.filter(chunk => 
      chunk.metadata.isImportant && !urgentChunks.includes(chunk)
    );
    const normalChunks = sortedChunks.filter(chunk => !chunk.metadata.isImportant);
    
    // 最大7チャンクまで追加（緊急3、重要2、一般2）
    const chunksToInclude = [
      ...urgentChunks.slice(0, 3),
      ...importantChunks.slice(0, 2),
      ...normalChunks.slice(0, 2)
    ];
    
    // 緊急情報を優先表示
    if (urgentChunks.length > 0) {
      knowledgeText += '\n🚨 **緊急・安全関連情報**:\n';
      urgentChunks.slice(0, 3).forEach((chunk, index) => {
        const similarity = chunk.similarity ? `(${Math.round(chunk.similarity * 100)}%一致)` : '';
        knowledgeText += `${index + 1}. 【緊急】${chunk.metadata.source || '技術資料'} ${similarity}\n`;
        knowledgeText += `   ${chunk.text.substring(0, 200)}...\n\n`;
      });
    }
    
    // 重要情報を表示
    if (importantChunks.length > 0) {
      knowledgeText += '\n📋 **重要技術情報**:\n';
      importantChunks.slice(0, 2).forEach((chunk, index) => {
        const similarity = chunk.similarity ? `(${Math.round(chunk.similarity * 100)}%一致)` : '';
        knowledgeText += `${index + 1}. 【重要】${chunk.metadata.source || '技術資料'} ${similarity}\n`;
        knowledgeText += `   ${chunk.text.substring(0, 200)}...\n\n`;
      });
    }
    
    // 一般情報を表示
    if (normalChunks.length > 0) {
      knowledgeText += '\n📖 **関連技術情報**:\n';
      normalChunks.slice(0, 2).forEach((chunk, index) => {
        const similarity = chunk.similarity ? `(${Math.round(chunk.similarity * 100)}%一致)` : '';
        knowledgeText += `${index + 1}. ${chunk.metadata.source || '技術資料'} ${similarity}\n`;
        knowledgeText += `   ${chunk.text.substring(0, 150)}...\n\n`;
      });
    }
    
    // 検索結果の統計情報を追加
    const totalChunks = relevantChunks.length;
    const urgentCount = urgentChunks.length;
    const importantCount = importantChunks.length;
    knowledgeText += `\n📊 **検索統計**: 総${totalChunks}件中、緊急${urgentCount}件・重要${importantCount}件を表示\n`;
  }
  
  // 高度に専門化されたシステムプロンプト
  const baseSystemPrompt = `あなたは鉄道保守車両（軌道モータカー、マルチプルタイタンパー、バラストレギュレーター等）の専門技術者として20年以上の現場経験を持つエキスパートAIです。

【専門領域と責任】
- 鉄道保守車両の故障診断・修理・メンテナンス
- 軌道保守作業における安全管理と技術指導
- 緊急事態対応と現場での迅速な判断支援
- JR各社の保守基準と作業手順書に準拠した指導

【回答生成における重要原則】
1. **安全第一**: 人命・安全を最優先とし、危険を伴う作業では必ず複数名確認を指示
2. **現場重視**: 理論より実践的で即座に実行可能な解決策を提示
3. **経験則活用**: 現場でよくある事例や「よくある間違い」を含めた包括的アドバイス
4. **段階的対応**: 応急処置→詳細診断→根本的解決の順序で構造化された回答
5. **コンテキスト適応**: 車両種別、気象条件、作業時間、人員配置を考慮した柔軟な対応

【知識ベース活用戦略】
- 🔴 重要情報: 安全関連は必ず最初に言及し、強調表示
- 🟡 関連度順: 類似度の高い事例から優先的に参照
- 📋 補完知識: 知識ベースにない場合は一般的な保守技術で補完
- 📞 エスカレーション: 複雑な故障は適切な専門部署への連絡を推奨

【コミュニケーションスタイル】
- 専門用語使用時は「（）」内で平易な説明を併記
- 作業手順は番号付きリストで明確に記載
- 「なぜそうするのか」の理由も含めて説明
- 現場での実際の作業イメージが湧く具体的な表現を使用`;
  
  return `${baseSystemPrompt}${knowledgeText}`;
}

/**
 * ドキュメントを知識ベースに追加する
 * @param fileInfo ファイル情報
 * @param content コンテンツ
 * @returns 処理結果
 */
export function addDocumentToKnowledgeBase(
  fileInfo: { originalname: string; path: string; mimetype: string },
  content: string
): { success: boolean; message: string; docId?: string } {
  try {
    // ファイル名から拡張子を除いた部分を取得
    const baseName = path.basename(fileInfo.originalname, path.extname(fileInfo.originalname));
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9_]/g, '_');
    
    // タイムスタンプを含むファイル名を作成
    const timestamp = Date.now();
    const textFileName = `${safeBaseName}_${timestamp}.txt`;
    const docId = `doc_${timestamp}_${Math.floor(Math.random() * 1000)}`;
    
    // テキストファイルを知識ベースに保存
    fs.writeFileSync(path.join(TEXT_DIR, textFileName), content, 'utf-8');
    
    // ナレッジベースインデックスに追加
    const index = loadKnowledgeBaseIndex();
    if (!index.documents) {
      index.documents = [];
    }
    
    // ファイルタイプを判定
    const fileExt = path.extname(fileInfo.originalname).toLowerCase();
    const fileType = getFileTypeFromExtension(fileExt);
    
    index.documents.push({
      id: docId,
      title: fileInfo.originalname,
      path: path.join(TEXT_DIR, textFileName),
      type: fileType,
      chunkCount: Math.ceil(content.length / 1000), // 概算のチャンク数
      addedAt: new Date().toISOString()
    });
    
    // インデックスを保存
    const indexPath = path.join(KNOWLEDGE_BASE_DIR, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    
    console.log(`ドキュメントを知識ベースに追加しました: ${textFileName} (ID: ${docId})`);
    
    return {
      success: true,
      message: `ドキュメント ${fileInfo.originalname} を知識ベースに追加しました`,
      docId: docId
    };
  } catch (error) {
    console.error('ドキュメントの知識ベース追加エラー:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '不明なエラーが発生しました'
    };
  }
}

// ファイルタイプ判定関数
function getFileTypeFromExtension(ext: string): string {
  const typeMap: { [key: string]: string } = {
    '.txt': 'テキスト',
    '.pdf': 'PDF',
    '.doc': 'Word',
    '.docx': 'Word',
    '.xls': 'Excel',
    '.xlsx': 'Excel',
    '.ppt': 'PowerPoint',
    '.pptx': 'PowerPoint',
    '.jpg': '画像',
    '.jpeg': '画像',
    '.png': '画像',
    '.gif': '画像',
    '.bmp': '画像'
  };
  return typeMap[ext] || 'その他';
}

/**
 * ファイルタイプを判定して適切なディレクトリに振り分ける
 */
export function determineKnowledgeType(filename: string, content?: string): KnowledgeType {
  const ext = path.extname(filename).toLowerCase();
  
  // トラブルシューティング関連のファイル
  if (filename.toLowerCase().includes('troubleshooting') || 
      filename.toLowerCase().includes('flow') ||
      filename.toLowerCase().includes('guide') ||
      ext === '.json' && (content?.includes('steps') || content?.includes('flow'))) {
    return KnowledgeType.TROUBLESHOOTING;
  }
  
  // プレゼンテーション関連
  if (ext === '.ppt' || ext === '.pptx') {
    return KnowledgeType.PPT;
  }
  
  // JSONデータ
  if (ext === '.json') {
    return KnowledgeType.JSON;
  }
  
  // Q&A関連
  if (filename.toLowerCase().includes('qa') || 
      filename.toLowerCase().includes('question') ||
      filename.toLowerCase().includes('answer')) {
    return KnowledgeType.QA;
  }
  
  // テキストファイル
  if (ext === '.txt' || ext === '.md') {
    return KnowledgeType.TEXT;
  }
  
  // その他のドキュメント
  return KnowledgeType.DOCUMENT;
}

/**
 * ナレッジデータを適切なディレクトリに保存
 */
export function saveKnowledgeData(
  filename: string, 
  content: string, 
  metadata?: Partial<KnowledgeMetadata>
): { success: boolean; metadata: KnowledgeMetadata; message: string } {
  try {
    const timestamp = Date.now();
    const baseName = path.basename(filename, path.extname(filename));
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9_]/g, '_');
    const ext = path.extname(filename).toLowerCase();
    
    // ファイルタイプを判定
    const knowledgeType = determineKnowledgeType(filename, content);
    
    // 適切なディレクトリを選択
    let targetDir: string;
    let fileExtension: string;
    
    switch (knowledgeType) {
      case KnowledgeType.TROUBLESHOOTING:
        targetDir = TROUBLESHOOTING_DIR;
        fileExtension = '.json';
        break;
      case KnowledgeType.QA:
        targetDir = QA_DIR;
        fileExtension = '.json';
        break;
      case KnowledgeType.JSON:
        targetDir = JSON_DIR;
        fileExtension = '.json';
        break;
      case KnowledgeType.PPT:
        targetDir = PPT_DIR;
        fileExtension = ext;
        break;
      case KnowledgeType.TEXT:
        targetDir = TEXT_DIR;
        fileExtension = '.txt';
        break;
      case KnowledgeType.DOCUMENT:
      default:
        targetDir = DOCUMENTS_DIR;
        fileExtension = ext;
        break;
    }
    
    // ファイル名を生成
    const uniqueId = `${timestamp}_${Math.floor(Math.random() * 1000)}`;
    const fileName = `${safeBaseName}_${uniqueId}${fileExtension}`;
    const filePath = path.join(targetDir, fileName);
    
    // ファイルを保存
    if (knowledgeType === KnowledgeType.TROUBLESHOOTING || 
        knowledgeType === KnowledgeType.QA || 
        knowledgeType === KnowledgeType.JSON) {
      // JSONファイルとして保存
      const jsonContent = typeof content === 'string' ? JSON.parse(content) : content;
      fs.writeFileSync(filePath, JSON.stringify(jsonContent, null, 2), 'utf-8');
    } else {
      // テキストファイルとして保存
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    
    // メタデータを作成
    const knowledgeMetadata: KnowledgeMetadata = {
      id: uniqueId,
      title: metadata?.title || baseName,
      type: knowledgeType,
      category: metadata?.category || 'general',
      tags: metadata?.tags || [],
      path: filePath,
      size: fs.statSync(filePath).size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: metadata?.description || `保存された${knowledgeType}データ`,
      chunkCount: metadata?.chunkCount || Math.ceil(content.length / 1000),
      processedAt: new Date().toISOString()
    };
    
    // インデックスに追加
    const index = loadKnowledgeBaseIndex();
    if (!index.knowledge) {
      index.knowledge = [];
    }
    index.knowledge.push(knowledgeMetadata);
    
    // インデックスを保存
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    
    console.log(`✅ ナレッジデータを保存しました: ${fileName} (${knowledgeType})`);
    
    return {
      success: true,
      metadata: knowledgeMetadata,
      message: `ナレッジデータ ${filename} を${knowledgeType}として保存しました`
    };
    
  } catch (error) {
    console.error('ナレッジデータ保存エラー:', error);
    return {
      success: false,
      metadata: {} as KnowledgeMetadata,
      message: error instanceof Error ? error.message : '不明なエラーが発生しました'
    };
  }
}

/**
 * ナレッジデータの一覧を取得
 */
export function listKnowledgeData(type?: KnowledgeType): { success: boolean; data: KnowledgeMetadata[]; message?: string } {
  try {
    const index = loadKnowledgeBaseIndex();
    
    if (!index.knowledge) {
      return {
        success: true,
        data: [],
        message: 'ナレッジデータがありません'
      };
    }
    
    let knowledgeData = index.knowledge;
    
    // 特定のタイプでフィルタリング
    if (type) {
      knowledgeData = knowledgeData.filter(item => item.type === type);
    }
    
    // 作成日時でソート（新しい順）
    knowledgeData.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return {
      success: true,
      data: knowledgeData,
      message: `${knowledgeData.length}件のナレッジデータを取得しました`
    };
    
  } catch (error) {
    console.error('ナレッジデータ一覧取得エラー:', error);
    return {
      success: false,
      data: [],
      message: error instanceof Error ? error.message : '不明なエラーが発生しました'
    };
  }
}

/**
 * 特定のナレッジデータを取得
 */
export function getKnowledgeData(id: string): { success: boolean; data?: KnowledgeMetadata; message?: string } {
  try {
    const index = loadKnowledgeBaseIndex();
    
    if (!index.knowledge) {
      return {
        success: false,
        message: 'ナレッジデータが見つかりません'
      };
    }
    
    const knowledgeData = index.knowledge.find(item => item.id === id);
    
    if (!knowledgeData) {
      return {
        success: false,
        message: '指定されたIDのナレッジデータが見つかりません'
      };
    }
    
    return {
      success: true,
      data: knowledgeData
    };
    
  } catch (error) {
    console.error('ナレッジデータ取得エラー:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '不明なエラーが発生しました'
    };
  }
}

/**
 * ナレッジデータを削除
 */
export function deleteKnowledgeData(id: string): { success: boolean; message: string } {
  try {
    const index = loadKnowledgeBaseIndex();
    
    if (!index.knowledge) {
      return {
        success: false,
        message: 'ナレッジデータが見つかりません'
      };
    }
    
    const knowledgeIndex = index.knowledge.findIndex(item => item.id === id);
    
    if (knowledgeIndex === -1) {
      return {
        success: false,
        message: '指定されたIDのナレッジデータが見つかりません'
      };
    }
    
    const knowledgeData = index.knowledge[knowledgeIndex];
    
    // ファイルを削除
    if (fs.existsSync(knowledgeData.path)) {
      fs.unlinkSync(knowledgeData.path);
    }
    
    // インデックスから削除
    index.knowledge.splice(knowledgeIndex, 1);
    
    // インデックスを保存
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    
    console.log(`✅ ナレッジデータを削除しました: ${knowledgeData.title}`);
    
    return {
      success: true,
      message: `ナレッジデータ ${knowledgeData.title} を削除しました`
    };
    
  } catch (error) {
    console.error('ナレッジデータ削除エラー:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '不明なエラーが発生しました'
    };
  }
}

/**
 * 知識ベースのバックアップを作成する
 * @returns バックアップ結果
 */
export function backupKnowledgeBase(): { success: boolean; message: string; backupPath?: string } {
  try {
    // バックアップディレクトリが存在しない場合は作成
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // バックアップファイル名（現在のタイムスタンプを含む）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `knowledge_base_backup_${timestamp}.json`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    
    // テキストコンテンツのインデックスを作成
    const textFiles = fs.readdirSync(TEXT_DIR).filter(file => file.endsWith('.txt'));
    const textContents: Record<string, string> = {};
    
    for (const file of textFiles) {
      try {
        const content = fs.readFileSync(path.join(TEXT_DIR, file), 'utf-8');
        textContents[file] = content;
      } catch (error) {
        console.error(`ファイル ${file} の読み込み中にエラーが発生しました:`, error);
      }
    }
    
    // バックアップデータ構造
    const backupData = {
      timestamp: new Date().toISOString(),
      textFiles: textContents,
      // 必要に応じて他のデータも追加
    };
    
    // バックアップファイルに書き込み
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
    
    console.log(`知識ベースのバックアップを作成しました: ${backupFileName}`);
    
    return {
      success: true,
      message: `知識ベースのバックアップを作成しました: ${backupFileName}`,
      backupPath
    };
  } catch (error) {
    console.error('知識ベースのバックアップ作成エラー:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '不明なエラーが発生しました'
    };
  }
}

/**
 * 複数のドキュメントコンテンツをマージする
 * @param contents マージするコンテンツの配列
 * @returns マージされたコンテンツ
 */
export function mergeDocumentContent(contents: string[]): string {
  // 単純に改行で区切ってマージする
  return contents.join('\n\n---\n\n');
}

/**
 * 知識ベースのインデックスをロードする
 * @returns インデックスデータ
 */
export function loadKnowledgeBaseIndex(): any {
  try {
    if (!fs.existsSync(INDEX_FILE)) {
      // インデックスファイルが存在しない場合は空のインデックスを返す
      return {
        documents: [],
        lastUpdated: new Date().toISOString()
      };
    }
    
    const indexContent = fs.readFileSync(INDEX_FILE, 'utf-8');
    return JSON.parse(indexContent);
  } catch (error) {
    console.error('知識ベースインデックス読み込みエラー:', error);
    
    // エラーが発生した場合も空のインデックスを返す
    return {
      documents: [],
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

/**
 * 知識ベースに保存されているドキュメントの一覧を取得する
 * @returns ドキュメントのメタデータ配列
 */
export function listKnowledgeBaseDocuments(): { success: boolean; documents: any[]; message?: string } {
  try {
    // テキストファイルを取得
    const textFiles = fs.readdirSync(TEXT_DIR).filter(file => file.endsWith('.txt'));
    
    // ファイル情報の配列を作成
    const documents = textFiles.map(file => {
      try {
        const stats = fs.statSync(path.join(TEXT_DIR, file));
        const content = fs.readFileSync(path.join(TEXT_DIR, file), 'utf-8');
        
        // ファイル名からメタデータを抽出
        const nameParts = file.split('_');
        const timestamp = parseInt(nameParts[nameParts.length - 1], 10) || stats.mtime.getTime();
        
        return {
          id: file.replace('.txt', ''),
          filename: file,
          title: nameParts.slice(0, -1).join('_').replace(/_/g, ' '),
          size: stats.size,
          createdAt: new Date(timestamp).toISOString(),
          lastModified: stats.mtime.toISOString(),
          contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
        };
      } catch (error) {
        console.error(`ファイル ${file} の情報取得中にエラーが発生しました:`, error);
        return {
          id: file.replace('.txt', ''),
          filename: file,
          title: file.replace('.txt', ''),
          error: error instanceof Error ? error.message : '不明なエラー'
        };
      }
    });
    
    // 新しい順に並べ替え
    documents.sort((a, b) => {
      return new Date(b.createdAt || new Date()).getTime() - new Date(a.createdAt || new Date()).getTime();
    });
    
    return {
      success: true,
      documents
    };
  } catch (error) {
    console.error('知識ベースドキュメント一覧取得エラー:', error);
    return {
      success: false,
      documents: [],
      message: error instanceof Error ? error.message : '不明なエラーが発生しました'
    };
  }
}

/**
 * 知識ベースからドキュメントを削除する
 * @param documentId ドキュメントID
 * @returns 削除結果
 */
export function removeDocumentFromKnowledgeBase(documentId: string): { success: boolean; message: string } {
  try {
    // ファイル名を作成（.txtが含まれていない場合は追加）
    const filename = documentId.endsWith('.txt') ? documentId : `${documentId}.txt`;
    const filePath = path.join(TEXT_DIR, filename);
    
    // ファイルが存在するか確認
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        message: `ドキュメント ${documentId} は存在しません`
      };
    }
    
    // ファイルを削除
    fs.unlinkSync(filePath);
    
    console.log(`ドキュメント ${documentId} を知識ベースから削除しました`);
    
    return {
      success: true,
      message: `ドキュメント ${documentId} を知識ベースから削除しました`
    };
  } catch (error) {
    console.error('ドキュメント削除エラー:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '不明なエラーが発生しました'
    };
  }
}