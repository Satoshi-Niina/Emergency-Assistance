const fs = require('fs');
const path = require('path');

// 古い暗号化URLを新しいAPIエンドポイント形式に変換する関数
function updateImageUrl(oldUrl) {
  // 古い形式: /api/emergency-flow/image/mc5vz8q8-ts-ZW1lcmdlbmN5LWZsb3ctc3RlcDEtMTc1MDQ4OTA0MTM4OS5qcGc
  // 新しい形式: /api/emergency-flow/image/emergency-flow-step1-1750489041389.jpg
  
  if (oldUrl && oldUrl.includes('/api/emergency-flow/image/')) {
    try {
      // 暗号化された部分を取得
      const encryptedPart = oldUrl.split('/api/emergency-flow/image/')[1];
      
      // 復号化（簡易版）
      const parts = encryptedPart.match(/(.*?)(-ts-|-guide-|-step-)(.*)/);
      if (parts && parts.length === 4) {
        const base64Part = parts[3];
        const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
        
        if (decoded) {
          return `/api/emergency-flow/image/${decoded}`;
        }
      }
    } catch (e) {
      console.warn('復号化に失敗:', oldUrl, e.message);
    }
  }
  
  return oldUrl;
}

// JSONファイルを更新する関数
function updateJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    let updated = false;
    
    // steps配列内のimagesを更新
    if (data.steps && Array.isArray(data.steps)) {
      data.steps.forEach(step => {
        if (step.images && Array.isArray(step.images)) {
          step.images.forEach(image => {
            if (image.url) {
              const newUrl = updateImageUrl(image.url);
              if (newUrl !== image.url) {
                console.log(`更新: ${image.url} -> ${newUrl}`);
                image.url = newUrl;
                updated = true;
              }
            }
          });
        }
      });
    }
    
    if (updated) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`✅ 更新完了: ${filePath}`);
    } else {
      console.log(`ℹ️ 更新不要: ${filePath}`);
    }
    
  } catch (error) {
    console.error(`❌ エラー: ${filePath}`, error.message);
  }
}

// メイン処理
function main() {
  const troubleshootingDir = path.join(__dirname, '../knowledge-base/troubleshooting');
  
  if (!fs.existsSync(troubleshootingDir)) {
    console.error('troubleshootingディレクトリが見つかりません');
    return;
  }
  
  const files = fs.readdirSync(troubleshootingDir)
    .filter(file => file.endsWith('.json'));
  
  console.log(`📁 ${files.length}個のJSONファイルを処理します...`);
  
  files.forEach(file => {
    const filePath = path.join(troubleshootingDir, file);
    updateJsonFile(filePath);
  });
  
  console.log('🎉 全てのファイルの処理が完了しました');
}

main(); 