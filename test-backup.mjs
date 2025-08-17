import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const SERVER_URL = 'http://localhost:3003';

// テスト用のJSONファイルを作成
const testData = {
  "id": "test-backup-" + Date.now(),
  "reportId": "RPT-TEST-001",
  "machineType": "テスト機械",
  "machineNumber": "TEST-001",
  "title": "バックアップテスト",
  "description": "バックアップ機能のテスト",
  "createdAt": new Date().toISOString(),
  "lastModified": new Date().toISOString()
};

const testFilePath = path.join(process.cwd(), 'knowledge-base', 'exports', `test-backup-${Date.now()}.json`);

// テストファイルを作成
fs.writeFileSync(testFilePath, JSON.stringify(testData, null, 2), 'utf8');
console.log('✅ テストファイル作成:', testFilePath);

// 履歴更新APIをテスト
async function testBackupFunction() {
  try {
    const updateData = {
      machineType: "更新されたテスト機械",
      title: "バックアップテスト - 更新版",
      description: "バックアップ機能のテスト - 更新されました",
      jsonData: {
        ...testData,
        machineType: "更新されたテスト機械",
        title: "バックアップテスト - 更新版",
        description: "バックアップ機能のテスト - 更新されました"
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
      console.log('✅ 履歴更新成功:', result);
      console.log('📁 バックアップファイル:', result.backupPath);
      
      // バックアップフォルダの確認
      const backupsDir = path.join(process.cwd(), 'backups');
      if (fs.existsSync(backupsDir)) {
        console.log('📁 バックアップディレクトリが作成されました:', backupsDir);
        
        // バックアップファイルの確認
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
        console.log('🔍 発見されたバックアップファイル:');
        backupFiles.forEach(file => {
          console.log('  📄', file);
        });
      } else {
        console.log('❌ バックアップディレクトリが見つかりません');
      }
      
    } else {
      const error = await response.text();
      console.error('❌ 履歴更新失敗:', error);
    }
  } catch (error) {
    console.error('❌ テストエラー:', error);
  }
}

// テスト実行
setTimeout(() => {
  testBackupFunction().then(() => {
    console.log('🏁 テスト完了');
  });
}, 1000);
