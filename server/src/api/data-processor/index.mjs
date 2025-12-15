import { getBlobServiceClient, containerName, norm } from '../../infra/blob.mjs';
import { isAzureEnvironment } from '../../config/env.mjs';
import { chunkText } from '../../../services/chunker.js';
import { embedTexts } from '../../../services/embedding.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import path from 'path';

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
          buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
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
        } else {
          textContent = buffer.toString('utf8');
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

      try {
        if (useAzure) {
          const blobServiceClient = getBlobServiceClient();
          const containerClient = blobServiceClient.getContainerClient(containerName);
          const blobClient = containerClient.getBlockBlobClient(metadataBlobPath);

          const jsonString = JSON.stringify(metadata, null, 2);
          await blobClient.upload(jsonString, jsonString.length);
          console.log('[api/data-processor] Metadata saved to Blob:', metadataBlobPath);
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

