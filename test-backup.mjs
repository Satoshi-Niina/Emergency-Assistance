import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const SERVER_URL = 'http://localhost:3003';

// 繝・せ繝育畑縺ｮJSON繝輔ぃ繧､繝ｫ繧剃ｽ懈・
const testData = {
  "id": "test-backup-" + Date.now(),
  "reportId": "RPT-TEST-001",
  "machineType": "繝・せ繝域ｩ滓｢ｰ",
  "machineNumber": "TEST-001",
  "title": "繝舌ャ繧ｯ繧｢繝・・繝・せ繝・,
  "description": "繝舌ャ繧ｯ繧｢繝・・讖溯・縺ｮ繝・せ繝・,
  "createdAt": new Date().toISOString(),
  "lastModified": new Date().toISOString()
};

const testFilePath = path.join(process.cwd(), 'knowledge-base', 'exports', `test-backup-${Date.now()}.json`);

// 繝・せ繝医ヵ繧｡繧､繝ｫ繧剃ｽ懈・
fs.writeFileSync(testFilePath, JSON.stringify(testData, null, 2), 'utf8');
console.log('笨・繝・せ繝医ヵ繧｡繧､繝ｫ菴懈・:', testFilePath);

// 螻･豁ｴ譖ｴ譁ｰAPI繧偵ユ繧ｹ繝・
async function testBackupFunction() {
  try {
    const updateData = {
      machineType: "譖ｴ譁ｰ縺輔ｌ縺溘ユ繧ｹ繝域ｩ滓｢ｰ",
      title: "繝舌ャ繧ｯ繧｢繝・・繝・せ繝・- 譖ｴ譁ｰ迚・,
      description: "繝舌ャ繧ｯ繧｢繝・・讖溯・縺ｮ繝・せ繝・- 譖ｴ譁ｰ縺輔ｌ縺ｾ縺励◆",
      jsonData: {
        ...testData,
        machineType: "譖ｴ譁ｰ縺輔ｌ縺溘ユ繧ｹ繝域ｩ滓｢ｰ",
        title: "繝舌ャ繧ｯ繧｢繝・・繝・せ繝・- 譖ｴ譁ｰ迚・,
        description: "繝舌ャ繧ｯ繧｢繝・・讖溯・縺ｮ繝・せ繝・- 譖ｴ譁ｰ縺輔ｌ縺ｾ縺励◆"
      }
    };

    const response = await fetch(`${SERVER_URL}/api/history/item/${testData.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('笨・螻･豁ｴ譖ｴ譁ｰ謌仙粥:', result);
      console.log('刀 繝舌ャ繧ｯ繧｢繝・・繝輔ぃ繧､繝ｫ:', result.backupPath);
      
      // 繝舌ャ繧ｯ繧｢繝・・繝輔か繝ｫ繝縺ｮ遒ｺ隱・
      const backupsDir = path.join(process.cwd(), 'backups');
      if (fs.existsSync(backupsDir)) {
        console.log('刀 繝舌ャ繧ｯ繧｢繝・・繝・ぅ繝ｬ繧ｯ繝医Μ縺御ｽ懈・縺輔ｌ縺ｾ縺励◆:', backupsDir);
        
        // 繝舌ャ繧ｯ繧｢繝・・繝輔ぃ繧､繝ｫ縺ｮ遒ｺ隱・
        const walkDir = (dir, fileList = []) => {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
              walkDir(filePath, fileList);
            } else {
              fileList.push(filePath);
            }
          });
          return fileList;
        };
        
        const backupFiles = walkDir(backupsDir);
        console.log('剥 逋ｺ隕九＆繧後◆繝舌ャ繧ｯ繧｢繝・・繝輔ぃ繧､繝ｫ:');
        backupFiles.forEach(file => {
          console.log('  塘', file);
        });
      } else {
        console.log('笶・繝舌ャ繧ｯ繧｢繝・・繝・ぅ繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
      }
      
    } else {
      const error = await response.text();
      console.error('笶・螻･豁ｴ譖ｴ譁ｰ螟ｱ謨・', error);
    }
  } catch (error) {
    console.error('笶・繝・せ繝医お繝ｩ繝ｼ:', error);
  }
}

// 繝・せ繝亥ｮ溯｡・
setTimeout(() => {
  testBackupFunction().then(() => {
    console.log('潤 繝・せ繝亥ｮ御ｺ・);
  });
}, 1000);
