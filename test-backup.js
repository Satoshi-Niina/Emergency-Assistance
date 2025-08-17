const fetch = require('node-fetch');

async function testBackup() {
  const url = 'http://localhost:3003/api/history/update-item/c08a0c61-d13e-4229-8d03-3549ebd0d7a1';
  const requestBody = {
    updatedData: {
      title: "エンジンがかからない（テスト更新）",
      problemDescription: "テスト用の説明文です。"
    },
    updatedBy: "user"
  };

  try {
    console.log('リクエスト送信中...');
    console.log('URL:', url);
    console.log('Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('ステータス:', response.status);
    const responseText = await response.text();
    console.log('レスポンス:', responseText);

    if (response.ok) {
      const responseData = JSON.parse(responseText);
      console.log('成功！');
      console.log('バックアップファイル:', responseData.backupFile);
      console.log('バックアップパス:', responseData.backupPath);
    } else {
      console.log('エラー:', response.status, responseText);
    }
  } catch (error) {
    console.error('リクエストエラー:', error.message);
  }
}

testBackup();
