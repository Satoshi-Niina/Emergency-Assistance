
const fs = require('fs');
const path = require('path');

// knowledge-base/imagesディレクトリ内の画像ファイルをチェック
function checkImageFiles() {
  const imagesDir = path.join(process.cwd(), 'knowledge-base', 'images');
  const metadataFile = path.join(process.cwd(), 'knowledge-base', 'json', 'mc_1747961263575_metadata.json');

  console.log('=== 画像ファイル存在確認 ===');
  
  // 1. knowledge-base/imagesディレクトリに実際に存在するファイル一覧
  if (!fs.existsSync(imagesDir)) {
    console.error('❌ knowledge-base/imagesディレクトリが存在しません');
    return;
  }

  const actualFiles = fs.readdirSync(imagesDir)
    .filter(file => /\.(png|jpg|jpeg|svg|gif)$/i.test(file))
    .sort();

  console.log(`📁 実際に存在する画像ファイル: ${actualFiles.length}件`);
  actualFiles.forEach((file, index) => {
    const filePath = path.join(imagesDir, file);
    const stats = fs.statSync(filePath);
    console.log(`  ${index + 1}. ${file} (${Math.round(stats.size / 1024)}KB)`);
  });

  // 2. メタデータファイルで参照されている画像ファイル一覧
  if (!fs.existsSync(metadataFile)) {
    console.error('❌ メタデータファイルが存在しません');
    return;
  }

  const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
  const referencedFiles = new Set();

  // スライド画像を収集
  if (metadata.slides) {
    metadata.slides.forEach(slide => {
      if (slide['画像テキスト']) {
        slide['画像テキスト'].forEach(imageText => {
          if (imageText['画像パス']) {
            const fileName = imageText['画像パス'].split('/').pop();
            if (fileName) referencedFiles.add(fileName);
          }
        });
      }
    });
  }

  // 埋め込み画像を収集
  if (metadata.embeddedImages) {
    metadata.embeddedImages.forEach(img => {
      if (img['抽出パス']) {
        const fileName = img['抽出パス'].split('/').pop();
        if (fileName) referencedFiles.add(fileName);
      }
    });
  }

  const referencedArray = Array.from(referencedFiles).sort();
  console.log(`\n📋 メタデータで参照されている画像: ${referencedArray.length}件`);
  referencedArray.forEach((file, index) => {
    const exists = actualFiles.includes(file);
    const status = exists ? '✅' : '❌';
    console.log(`  ${index + 1}. ${status} ${file}`);
  });

  // 3. 存在しない画像ファイルを特定
  const missingFiles = referencedArray.filter(file => !actualFiles.includes(file));
  const extraFiles = actualFiles.filter(file => !referencedFiles.has(file));

  console.log(`\n🔍 分析結果:`);
  console.log(`  - 参照されているが存在しない画像: ${missingFiles.length}件`);
  missingFiles.forEach(file => console.log(`    ❌ ${file}`));

  console.log(`  - 存在するが参照されていない画像: ${extraFiles.length}件`);
  extraFiles.forEach(file => console.log(`    ⚠️ ${file}`));

  if (missingFiles.length === 0) {
    console.log(`\n✅ すべての参照画像が存在しています！`);
  } else {
    console.log(`\n⚠️ ${missingFiles.length}件の画像が不足しています。`);
  }
}

// 実行
checkImageFiles();
