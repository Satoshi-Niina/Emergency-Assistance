const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');
const path = require('path');

// 環境変数から接続文字列を取得（ハードコード禁止）
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = 'knowledge';

if (!connectionString) {
  console.error('❌ AZURE_STORAGE_CONNECTION_STRING が設定されていません');
  console.log('使用方法: set AZURE_STORAGE_CONNECTION_STRING=<接続文字列>');
  console.log('         node scripts/upload-images-to-blob.js');
  process.exit(1);
}

async function uploadImages() {
  try {
    console.log('📦 BLOB Storageに接続中...');
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // コンテナが存在するか確認
    const exists = await containerClient.exists();
    if (!exists) {
      console.log('📦 コンテナを作成中:', containerName);
      await containerClient.create();
    }

    // 画像ディレクトリのパス
    const imagesBaseDir = path.join(__dirname, '..', '..', 'knowledge-base', 'images');
    
    if (!fs.existsSync(imagesBaseDir)) {
      console.error('❌ 画像ディレクトリが見つかりません:', imagesBaseDir);
      process.exit(1);
    }

    // アップロードするカテゴリ
    const categories = ['chat-exports', 'emergency-flows'];
    let uploadCount = 0;

    for (const category of categories) {
      const categoryDir = path.join(imagesBaseDir, category);
      
      if (!fs.existsSync(categoryDir)) {
        console.log(`⚠️ ${category} ディレクトリが見つかりません: ${categoryDir}`);
        continue;
      }

      const files = fs.readdirSync(categoryDir);
      console.log(`\n📂 ${category}: ${files.length}個のファイル`);

      for (const file of files) {
        const filePath = path.join(categoryDir, file);
        const stats = fs.statSync(filePath);

        if (!stats.isFile()) continue;

        // BLOBパス: knowledge-base/images/category/filename
        const blobName = `knowledge-base/images/${category}/${file}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        // ファイルの内容を読み込む
        const fileContent = fs.readFileSync(filePath);

        // MIMEタイプを設定
        const ext = path.extname(file).toLowerCase();
        const mimeTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        // アップロード
        console.log(`  ⬆️ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
        await blockBlobClient.uploadData(fileContent, {
          blobHTTPHeaders: {
            blobContentType: contentType
          },
          metadata: {
            originalName: file,
            uploadedAt: new Date().toISOString(),
            category: category
          }
        });

        uploadCount++;
      }
    }

    console.log(`\n✅ アップロード完了: ${uploadCount}個のファイル`);
  } catch (error) {
    console.error('❌ エラー:', error.message);
    if (error.details) {
      console.error('詳細:', error.details);
    }
    process.exit(1);
  }
}

uploadImages();
