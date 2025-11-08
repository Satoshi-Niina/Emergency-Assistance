import fs from 'fs';
import path from 'path';
import { faultHistoryService } from '../services/fault-history-service.js';

/**
 * 既存のJSONファイルからDBへのデータ移行スクリプト
 */
async function migrateExistingData() {
  console.log('📊 既存データの移行開始...');
  
  const exportsDir = path.join(process.cwd(), '..', 'knowledge-base', 'exports');
  
  if (!fs.existsSync(exportsDir)) {
    console.log('❌ エクスポートディレクトリが見つかりません:', exportsDir);
    return;
  }
  
  const files = fs.readdirSync(exportsDir);
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  
  console.log(`📋 移行対象ファイル: ${jsonFiles.length}件`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const file of jsonFiles) {
    try {
      const filePath = path.join(exportsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      console.log(`📄 移行中: ${file}`);
      
      // 故障履歴サービスで保存
      await faultHistoryService.saveFaultHistory(data, {
        title: data.title || file.replace('.json', ''),
        description: data.problemDescription || data.description || '',
        extractImages: true,
      });
      
      successCount++;
      console.log(`✅ 成功: ${file}`);
      
    } catch (error) {
      errorCount++;
      console.error(`❌ エラー: ${file}`, error.message);
    }
  }
  
  console.log('📊 移行完了:', {
    総件数: jsonFiles.length,
    成功: successCount,
    エラー: errorCount,
  });
}

// 直接実行の場合
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateExistingData().catch(console.error);
}

export { migrateExistingData };