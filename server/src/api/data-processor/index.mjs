import { getBlobServiceClient, containerName, norm } from '../../infra/blob.mjs';
import { isAzureEnvironment } from '../../config/env.mjs';
import { chunkText } from '../../../services/chunker.js';
import { embedTexts } from '../../../services/embedding.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const iconv = require('iconv-lite');
const chardet = require('chardet');
import path from 'path';
import { Buffer } from 'buffer';

export default async function (req, res) {
  try {
    console.log('[api/data-processor] Request received');

    // OPTIONS request
    if (req.method === 'OPTIONS') {
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        'Access-Control-Max-Age': '86400',
      });
      return res.status(200).send('');
    }

    const parts = req.path.split('/');
    const action = parts[parts.length - 1];
    const method = req.method;

    console.log('[api/data-processor] Action:', action);

    // POST /api/data-processor/process
    if (method === 'POST' && (action === 'process' || req.path.endsWith('/process'))) {
      const body = req.body;
      const { filePath, fileBuffer, fileType, fileName } = body; // fileBuffer: 元ファイル非保存時のバッファ

      console.log('[api/data-processor] Processing file:', { filePath, hasBuffer: !!fileBuffer, fileType });

      if (!filePath && !fileBuffer) {
        return res.status(400).json({ success: false, error: 'No filePath or fileBuffer provided' });
      }

      let textContent = '';
      let buffer = null;

      // 1. Fetch File Content
      try {
        // fileBufferが提供されている場合（元ファイル非保存）
        if (fileBuffer) {
          console.log('[api/data-processor] Using provided file buffer');
          
          // fileBufferの形式を確認して適切に変換
          if (Buffer.isBuffer(fileBuffer)) {
            buffer = fileBuffer;
          } else if (fileBuffer.type === 'Buffer' && Array.isArray(fileBuffer.data)) {
            // JSONシリアライズされたBuffer形式
            buffer = Buffer.from(fileBuffer.data);
          } else if (typeof fileBuffer === 'string') {
            // Base64文字列の場合
            buffer = Buffer.from(fileBuffer, 'base64');
          } else if (ArrayBuffer.isView(fileBuffer)) {
            // TypedArrayの場合
            buffer = Buffer.from(fileBuffer);
          } else {
            console.warn('[api/data-processor] Unknown fileBuffer format, attempting conversion');
            buffer = Buffer.from(fileBuffer);
          }
          
          console.log('[api/data-processor] Buffer prepared:', {
            length: buffer.length,
            isBuffer: Buffer.isBuffer(buffer),
            first20Bytes: Array.from(buffer.slice(0, 20)),
            first20Hex: buffer.slice(0, 20).toString('hex')
          });
        } else {
          // filePathから読み込む（元ファイル保存済み）
          const useAzure = isAzureEnvironment();
          
          if (useAzure) {
            // Azure Blob Storage
            const blobServiceClient = getBlobServiceClient();
            if (!blobServiceClient) {
              throw new Error('Blob Service unavailable');
            }
            const containerClient = blobServiceClient.getContainerClient(containerName);
            let blobName = filePath;
            if (blobName.startsWith('blob://')) {
              const url = new URL(blobName);
              blobName = url.pathname.substring(1);
            }

            console.log('[api/data-processor] Downloading blob:', blobName);
            const blobClient = containerClient.getBlobClient(blobName);

            const downloadResponse = await blobClient.download();
            const chunks = [];
            for await (const chunk of downloadResponse.readableStreamBody) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            buffer = Buffer.concat(chunks);
          } else {
            // Local Filesystem
            const fs = await import('fs/promises');
            buffer = await fs.readFile(filePath);
          }
        }

        // Extract text based on type
        if (fileType === 'application/pdf' || (fileName && fileName.toLowerCase().endsWith('.pdf'))) {
          const data = await pdf(buffer);
          textContent = data.text;
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || (fileName && fileName.toLowerCase().endsWith('.docx'))) {
          // DOCX処理
          console.log('[api/data-processor] Processing DOCX file:', fileName);
          console.log('[api/data-processor] Buffer info:', {
            size: buffer.length,
            isBuffer: Buffer.isBuffer(buffer),
            type: typeof buffer
          });
          
          try {
            // bufferがBuffer型であることを確認
            if (!Buffer.isBuffer(buffer)) {
              console.error('[api/data-processor] ❌ Buffer is not a Buffer instance, converting...');
              try {
                buffer = Buffer.from(buffer);
              } catch (conversionError) {
                throw new Error(`Buffer conversion failed: ${conversionError.message}`);
              }
            }
            
            // DOCXファイルのマジックナンバーを確認（PK\x03\x04）
            if (buffer.length < 4) {
              throw new Error('ファイルが小さすぎます（4バイト未満）。破損している可能性があります。');
            }
            
            const magicNumber = buffer.slice(0, 4).toString('hex');
            console.log('[api/data-processor] DOCX magic number:', magicNumber);
            
            // DOCXは実質的にはZIPファイル（PK\x03\x04 = 504b0304）
            if (magicNumber !== '504b0304') {
              console.warn('[api/data-processor] ⚠️ File does not appear to be a valid DOCX (ZIP) file. Magic number:', magicNumber);
            }
            
            // mammothにバッファを渡す
            console.log('[api/data-processor] Calling mammoth.extractRawText with buffer length:', buffer.length);
            const result = await mammoth.extractRawText({ buffer: buffer });
            textContent = result.value;
            
            console.log('[api/data-processor] ✅ DOCX extracted successfully:', {
              textLength: textContent.length,
              messagesCount: result.messages?.length || 0,
              preview: textContent.substring(0, 100)
            });
            
            if (result.messages && result.messages.length > 0) {
              console.log('[api/data-processor] Mammoth messages:', JSON.stringify(result.messages, null, 2));
            }
            
            // テキストが空の場合のエラーハンドリング
            if (!textContent || textContent.trim().length === 0) {
              console.warn('[api/data-processor] ⚠️ DOCX file appears to be empty or contains no extractable text');
            }
          } catch (docxError) {
            // バッファの最初の20バイトを16進数で表示（デバッグ用）
            let hexPreview = 'N/A';
            if (buffer && buffer.length > 0) {
              try {
                hexPreview = buffer.slice(0, Math.min(20, buffer.length)).toString('hex');
              } catch (e) {
                hexPreview = 'Error reading buffer';
              }
            }
            
            console.error('[api/data-processor] ❌ DOCX extraction error:', {
              errorName: docxError.name,
              errorMessage: docxError.message,
              errorCode: docxError.code,
              stack: docxError.stack?.substring(0, 500), // 最初の500文字のみ
              fileName: fileName,
              bufferLength: buffer ? buffer.length : 0,
              bufferType: buffer ? typeof buffer : 'undefined',
              isBuffer: buffer ? Buffer.isBuffer(buffer) : false,
              hexPreview: hexPreview,
              mammothVersion: mammoth ? 'loaded' : 'not loaded'
            });
            
            // より詳細なエラーメッセージを返す
            const errorDetail = docxError.code ? `[${docxError.code}] ${docxError.message}` : docxError.message;
            throw new Error(`DOCXファイルの読み込みに失敗しました: ${errorDetail}`);
          }
        } else {
          // テキストファイルの処理（文字化け対策）
          try {
            let encoding = 'utf8';
            let processedBuffer = buffer;
            let hasBOM = false;

            console.log('[api/data-processor] Buffer info:', {
              length: buffer.length,
              first4Bytes: buffer.slice(0, 4).toString('hex')
            });

            // BOM（Byte Order Mark）のチェック
            if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
              // UTF-8 BOM
              encoding = 'utf8';
              processedBuffer = buffer.slice(3);
              hasBOM = true;
              console.log('[api/data-processor] ✅ Detected UTF-8 BOM');
            } else if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
              // UTF-16 LE BOM
              encoding = 'utf16le';
              processedBuffer = buffer.slice(2);
              hasBOM = true;
              console.log('[api/data-processor] ✅ Detected UTF-16 LE BOM');
            } else if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
              // UTF-16 BE BOM
              encoding = 'utf16be';
              processedBuffer = buffer.slice(2);
              hasBOM = true;
              console.log('[api/data-processor] ✅ Detected UTF-16 BE BOM');
            }

            // BOMがない場合、chardetでエンコーディングを自動検出
            if (!hasBOM) {
              console.log('[api/data-processor] No BOM detected, using chardet for encoding detection...');
              
              // chardetでエンコーディングを検出（最大4096バイトをサンプリング）
              const sampleSize = Math.min(processedBuffer.length, 4096);
              const sampleBuffer = processedBuffer.slice(0, sampleSize);
              const detectedEncoding = chardet.detect(sampleBuffer);
              
              console.log('[api/data-processor] Chardet result:', {
                detected: detectedEncoding,
                bufferLength: processedBuffer.length,
                sampleSize: sampleSize
              });
              
              // chardetの結果を標準化
              let normalizedEncoding = detectedEncoding ? detectedEncoding.toLowerCase().trim() : null;
              
              // エンコーディング名のマッピング（優先度順）
              const encodingMap = {
                // Shift_JIS系
                'shift_jis': 'shift_jis',
                'shift-jis': 'shift_jis',
                'sjis': 'shift_jis',
                'cp932': 'shift_jis',
                'windows-31j': 'shift_jis',
                'x-sjis': 'shift_jis',
                // EUC-JP系
                'euc-jp': 'euc-jp',
                'eucjp': 'euc-jp',
                'x-euc-jp': 'euc-jp',
                // UTF-8系
                'utf-8': 'utf8',
                'utf8': 'utf8',
                // ASCII（UTF-8として扱う）
                'ascii': 'utf8',
                'us-ascii': 'utf8',
                // ISO-8859系
                'iso-8859-1': 'latin1',
                'latin1': 'latin1',
                'windows-1252': 'latin1'
              };
              
              encoding = encodingMap[normalizedEncoding] || 'utf8';
              
              console.log('[api/data-processor] Encoding decision:', {
                chardetResult: detectedEncoding,
                normalized: normalizedEncoding,
                finalEncoding: encoding
              });
              
              // もしchardetが検出できなかった場合、バイト列から推測
              if (!detectedEncoding) {
                console.log('[api/data-processor] Chardet failed, analyzing byte patterns...');
                
                // 日本語の可能性が高いバイトパターンをチェック
                let hasHighBytes = false;
                for (let i = 0; i < Math.min(1000, processedBuffer.length); i++) {
                  if (processedBuffer[i] >= 0x80) {
                    hasHighBytes = true;
                    break;
                  }
                }
                
                if (hasHighBytes) {
                  // 高位バイトがある場合、Shift_JISを優先的に試す
                  console.log('[api/data-processor] High bytes detected, trying Shift_JIS first');
                  encoding = 'shift_jis';
                }
              }
            }

            // エンコーディングに応じてデコード（複数試行）
            let decodingAttempts = [];
            
            // 主要エンコーディングを試行
            const encodingsToTry = [encoding];
            if (encoding !== 'shift_jis') encodingsToTry.push('shift_jis');
            if (encoding !== 'utf8') encodingsToTry.push('utf8');
            if (encoding !== 'euc-jp') encodingsToTry.push('euc-jp');
            
            for (const tryEncoding of encodingsToTry) {
              let decoded = '';
              try {
                if (tryEncoding === 'utf8') {
                  decoded = processedBuffer.toString('utf8');
                } else if (tryEncoding === 'utf16le' || tryEncoding === 'utf16be') {
                  decoded = processedBuffer.toString(tryEncoding);
                } else if (iconv.encodingExists(tryEncoding)) {
                  decoded = iconv.decode(processedBuffer, tryEncoding);
                } else {
                  continue;
                }
                
                // デコード品質を評価
                const replacementCount = (decoded.match(/\uFFFD/g) || []).length;
                const replacementRatio = decoded.length > 0 ? replacementCount / decoded.length : 1;
                
                decodingAttempts.push({
                  encoding: tryEncoding,
                  text: decoded,
                  replacementCount: replacementCount,
                  replacementRatio: replacementRatio,
                  score: 1 - replacementRatio // スコアが高いほど良い
                });
                
                console.log(`[api/data-processor] Tried ${tryEncoding}:`, {
                  replacementRatio: (replacementRatio * 100).toFixed(2) + '%',
                  preview: decoded.substring(0, 50)
                });
              } catch (err) {
                console.warn(`[api/data-processor] Failed to decode with ${tryEncoding}:`, err.message);
              }
            }
            
            // 最良の結果を選択
            if (decodingAttempts.length > 0) {
              decodingAttempts.sort((a, b) => b.score - a.score);
              const bestResult = decodingAttempts[0];
              textContent = bestResult.text;
              encoding = bestResult.encoding;
              
              console.log('[api/data-processor] ✅ Best decoding result:', {
                chosenEncoding: encoding,
                textLength: textContent.length,
                replacementChars: bestResult.replacementCount,
                replacementRatio: (bestResult.replacementRatio * 100).toFixed(2) + '%',
                preview: textContent.substring(0, 100)
              });
              
              // 置換文字が多すぎる場合は警告
              if (bestResult.replacementRatio > 0.1) {
                console.warn('[api/data-processor] ⚠️ High replacement character ratio detected. File may have encoding issues.');
              }
            } else {
              console.error('[api/data-processor] ❌ All decoding attempts failed, using UTF-8 fallback');
              textContent = processedBuffer.toString('utf8');
            }

          } catch (encodingError) {
            console.error('[api/data-processor] ❌ Text encoding error:', encodingError);
            console.error('[api/data-processor] Stack:', encodingError.stack);
            textContent = buffer.toString('utf8'); // フォールバック
          }
        }
      } catch (fetchError) {
        console.error('[api/data-processor] Failed to fetch/extract file:', fetchError);
        return res.status(500).json({ success: false, error: 'File fetch failed', details: fetchError.message });
      }

      if (!textContent || textContent.trim().length === 0) {
        return res.status(422).json({ success: false, error: 'Extracted text is empty' });
      }

      console.log('[api/data-processor] Text extracted. Length:', textContent.length);

      // 2. Chunking
      const chunks = chunkText(textContent, { size: 800, overlap: 80 });
      console.log('[api/data-processor] Chunked into', chunks.length, 'parts');

      // 3. Embedding
      // Prepare texts for embedding
      const textsToEmbed = chunks.map(c => c.content);
      let embeddings = [];
      try {
        embeddings = await embedTexts(textsToEmbed);
      } catch (embedError) {
        console.error('[api/data-processor] Embedding failed:', embedError);
        return res.status(500).json({ success: false, error: 'Embedding failed', details: embedError.message });
      }

      // 4. Save Metadata (Chunks + Embeddings)
      // We will save this as a JSON file in "knowledge-base/processed/metadata/"
      // The format should match what SearchService expects.

      const metadata = {
        id: `doc-${Date.now()}`,
        title: fileName,
        path: filePath,
        source: 'upload',
        timestamp: new Date().toISOString(),
        chunks: chunks.map((chunk, i) => ({
          ...chunk,
          embedding: embeddings[i]?.embedding || [],
        })),
        // Flatten key fields for Fuse.js
        content: textContent.substring(0, 10000), // Limit for search index size if needed
        keywords: [] // TODO: Generate keywords?
      };

      const metadataFileName = `doc-${Date.now()}.json`;
      const metadataBlobPath = `knowledge-base/documents/${metadataFileName}`;

      // useAzure変数を再取得（スコープ問題対策）
      const useAzure = isAzureEnvironment();
      console.log('[api/data-processor] Saving metadata. Environment:', { useAzure, metadataPath: metadataBlobPath });

      try {
        if (useAzure) {
          const blobServiceClient = getBlobServiceClient();
          if (!blobServiceClient) {
            throw new Error('Blob Service Client initialization failed');
          }
          const containerClient = blobServiceClient.getContainerClient(containerName);
          
          // コンテナの存在確認
          const containerExists = await containerClient.exists();
          if (!containerExists) {
            console.log('[api/data-processor] Creating container:', containerName);
            await containerClient.create();
          }

          const blobClient = containerClient.getBlockBlobClient(metadataBlobPath);
          const jsonString = JSON.stringify(metadata, null, 2);
          await blobClient.upload(jsonString, jsonString.length, {
            blobHTTPHeaders: {
              blobContentType: 'application/json'
            }
          });
          console.log('[api/data-processor] ✅ Metadata saved to Blob:', metadataBlobPath);
        } else {
          // Local save
          const fs = await import('fs/promises');
          const targetDir = path.join(process.cwd(), 'knowledge-base', 'documents');
          await fs.mkdir(targetDir, { recursive: true });
          await fs.writeFile(path.join(targetDir, metadataFileName), JSON.stringify(metadata, null, 2));
        }
      } catch (saveError) {
        console.error('[api/data-processor] Failed to save metadata:', saveError);
        return res.status(500).json({ success: false, error: 'Metadata save failed', details: saveError.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Processing completed',
        processedData: {
          id: metadata.id,
          chunks: chunks.length,
          metadataPath: metadataBlobPath
        }
      });
    }

    return res.status(404).json({ message: 'Not found' });

  } catch (error) {
    console.error('Error in data processor function:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

