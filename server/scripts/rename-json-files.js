const fs = require('fs');
const path = require('path');

// 譌｢蟄倥・JSON繝輔ぃ繧､繝ｫ縺ｮ繝輔ぃ繧､繝ｫ蜷阪ｒ莠玖ｱ｡蜀・ｮｹ縺ｫ螟画峩縺吶ｋ繧ｹ繧ｯ繝ｪ繝励ヨ
async function renameJsonFiles() {
  const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
  
  if (!fs.existsSync(exportsDir)) {
    console.log('exports 繝・ぅ繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ:', exportsDir);
    return;
  }

  const files = fs.readdirSync(exportsDir).filter(file => file.endsWith('.json'));
  console.log(`蜃ｦ逅・ｯｾ雎｡繝輔ぃ繧､繝ｫ謨ｰ: ${files.length}`);

  for (const file of files) {
    const filePath = path.join(exportsDir, file);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(content);
      
      // 莠玖ｱ｡蜀・ｮｹ繧呈歓蜃ｺ
      let incidentTitle = '莠玖ｱ｡縺ｪ縺・;
      
      // 譁ｰ縺励＞繝輔か繝ｼ繝槭ャ繝医°繧牙叙蠕・
      if (jsonData.title) {
        incidentTitle = jsonData.title;
      }
      // 蠕捺擂繝輔か繝ｼ繝槭ャ繝医°繧牙叙蠕・
      else if (jsonData.chatData?.messages) {
        const userMessages = jsonData.chatData.messages.filter((msg) => !msg.isAiResponse);
        if (userMessages.length > 0) {
          incidentTitle = userMessages[0].content;
        }
      }
      
      if (incidentTitle !== '莠玖ｱ｡縺ｪ縺・) {
        // 繝輔ぃ繧､繝ｫ蜷咲畑縺ｫ莠玖ｱ｡蜀・ｮｹ繧偵し繝九ち繧､繧ｺ
        const sanitizedTitle = incidentTitle
          .replace(/[<>:"/\\|?*]/g, '') // 繝輔ぃ繧､繝ｫ蜷阪↓菴ｿ逕ｨ縺ｧ縺阪↑縺・枚蟄励ｒ髯､蜴ｻ
          .replace(/\s+/g, '_') // 繧ｹ繝壹・繧ｹ繧偵い繝ｳ繝繝ｼ繧ｹ繧ｳ繧｢縺ｫ螟画鋤
          .substring(0, 50); // 髟ｷ縺輔ｒ蛻ｶ髯・
        
        // 譌｢蟄倥・繝輔ぃ繧､繝ｫ蜷阪°繧営hatId縺ｨtimestamp繧呈歓蜃ｺ
        const fileNameParts = file.replace('.json', '').split('_');
        const chatId = fileNameParts[1] || 'unknown';
        const timestamp = fileNameParts[2] || 'unknown';
        
        const newFileName = `${sanitizedTitle}_${chatId}_${timestamp}.json`;
        const newFilePath = path.join(exportsDir, newFileName);
        
        // 繝輔ぃ繧､繝ｫ蜷阪′螟画峩縺輔ｌ繧句ｴ蜷医・縺ｿ繝ｪ繝阪・繝
        if (file !== newFileName) {
          fs.renameSync(filePath, newFilePath);
          console.log(`繝ｪ繝阪・繝: ${file} 竊・${newFileName}`);
        } else {
          console.log(`螟画峩荳崎ｦ・ ${file}`);
        }
      } else {
        console.log(`莠玖ｱ｡蜀・ｮｹ縺瑚ｦ九▽縺九ｉ縺ｪ縺・ ${file}`);
      }
      
    } catch (error) {
      console.error(`繧ｨ繝ｩ繝ｼ (${file}):`, error.message);
    }
  }
  
  console.log('繝輔ぃ繧､繝ｫ蜷榊､画峩蜃ｦ逅・′螳御ｺ・＠縺ｾ縺励◆');
}

// 繧ｹ繧ｯ繝ｪ繝励ヨ螳溯｡・
renameJsonFiles().catch(console.error);
