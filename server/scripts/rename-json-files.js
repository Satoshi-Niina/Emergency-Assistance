const fs = require('fs');
const path = require('path');

// 既存のJSONファイルのファイル名を事象内容に変更するスクリプト
async function renameJsonFiles() {
  const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
  
  if (!fs.existsSync(exportsDir)) {
    console.log('exports ディレクトリが見つかりません:', exportsDir);
    return;
  }

  const files = fs.readdirSync(exportsDir).filter(file => file.endsWith('.json'));
  console.log(`処理対象ファイル数: ${files.length}`);

  for (const file of files) {
    const filePath = path.join(exportsDir, file);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(content);
      
      // 事象内容を抽出
      let incidentTitle = '事象なし';
      
      // 新しいフォーマットから取得
      if (jsonData.title) {
        incidentTitle = jsonData.title;
      }
      // 従来フォーマットから取得
      else if (jsonData.chatData?.messages) {
        const userMessages = jsonData.chatData.messages.filter((msg) => !msg.isAiResponse);
        if (userMessages.length > 0) {
          incidentTitle = userMessages[0].content;
        }
      }
      
      if (incidentTitle !== '事象なし') {
        // ファイル名用に事象内容をサニタイズ
        const sanitizedTitle = incidentTitle
          .replace(/[<>:"/\\|?*]/g, '') // ファイル名に使用できない文字を除去
          .replace(/\s+/g, '_') // スペースをアンダースコアに変換
          .substring(0, 50); // 長さを制限
        
        // 既存のファイル名からchatIdとtimestampを抽出
        const fileNameParts = file.replace('.json', '').split('_');
        const chatId = fileNameParts[1] || 'unknown';
        const timestamp = fileNameParts[2] || 'unknown';
        
        const newFileName = `${sanitizedTitle}_${chatId}_${timestamp}.json`;
        const newFilePath = path.join(exportsDir, newFileName);
        
        // ファイル名が変更される場合のみリネーム
        if (file !== newFileName) {
          fs.renameSync(filePath, newFilePath);
          console.log(`リネーム: ${file} → ${newFileName}`);
        } else {
          console.log(`変更不要: ${file}`);
        }
      } else {
        console.log(`事象内容が見つからない: ${file}`);
      }
      
    } catch (error) {
      console.error(`エラー (${file}):`, error.message);
    }
  }
  
  console.log('ファイル名変更処理が完了しました');
}

// スクリプト実行
renameJsonFiles().catch(console.error);
