const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * 既存のJSONファイルからBase64画像を抽出してファイルに保存し、
 * contentを画像URLに置き換えるスクリプト
 */

async function fixBase64Images() {
  const exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
  const imagesDir = path.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports');
  
  // 画像ディレクトリが存在しない場合は作成
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log('画像保存ディレクトリを作成しました:', imagesDir);
  }

  // exportsディレクトリ内のJSONファイルを処理
  const files = fs.readdirSync(exportsDir).filter(file => file.endsWith('.json'));
  
  for (const file of files) {
    const filePath = path.join(exportsDir, file);
    console.log(`\n📄 処理中: ${file}`);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      let hasChanges = false;
      const savedImages = [];
      
      // chatData.messagesからBase64画像を検索
      if (data.chatData && data.chatData.messages) {
        for (let i = 0; i < data.chatData.messages.length; i++) {
          const message = data.chatData.messages[i];
          
          false`);
            
            try {
              // Base64データから画像を抽出
              base64,/, '');
              const buffer = ;
              
              // ファイル名を生成（元のファイル名ベース）
              const baseFileName = file.replace('.json', '');
              const imageFileName = `${baseFileName}_${i}_0.jpeg`;
              const imagePath = path.join(imagesDir, imageFileName);
              
              // Sharpを使用してリサイズ
              const resizedBuffer = await sharp(buffer)
                .resize(413, 583, {
                  fit: 'inside',
                  withoutEnlargement: true,
                  background: { r: 255, g: 255, b: 255, alpha: 1 }
                })
                .jpeg({ quality: 85 })
                .toBuffer();
              
              // 画像ファイルを保存
              fs.writeFileSync(imagePath, resizedBuffer);
              console.log(`✅ 画像ファイルを保存: ${imageFileName}`);
              
              const imageInfo = {
                messageId: message.id,
                fileName: imageFileName,
                path: `knowledge-base/images/chat-exports/${imageFileName}`,
                url: `/api/images/chat-exports/${imageFileName}`
              };
              
              savedImages.push(imageInfo);
              
              // Base64データを画像URLに置き換え
              data.chatData.messages[i].content = imageInfo.url;
              hasChanges = true;
              
              console.log(`🔄 Base64データを画像URLに置き換え: ${imageInfo.url}`);
              
            } catch (imageError) {
              console.error(`❌ 画像保存エラー:`, imageError);
              // エラーの場合はBase64データを削除
              data.chatData.messages[i].content = '[画像保存エラー]';
              hasChanges = true;
            }
          }
        }
      }
      
      // 変更があった場合はファイルを保存
      if (hasChanges) {
        // savedImagesを追加
        data.savedImages = savedImages;
        
        // JSONファイルを保存
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ ファイルを更新: ${file}`);
      } else {
        console.log(`ℹ️ 変更なし: ${file}`);
      }
      
    } catch (error) {
      console.error(`❌ ファイル処理エラー (${file}):`, error);
    }
  }
  
  console.log('\n🎉 Base64画像の修正が完了しました！');
}

// スクリプトを実行
if (require.main === module) {
  fixBase64Images().catch(console.error);
}

module.exports = { fixBase64Images };
