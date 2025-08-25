const fetch = require('node-fetch');

async function testBackup() {
  const url = 'http://localhost:3003/api/history/update-item/c08a0c61-d13e-4229-8d03-3549ebd0d7a1';
  const requestBody = {
    updatedData: {
      title: "繧ｨ繝ｳ繧ｸ繝ｳ縺後°縺九ｉ縺ｪ縺・ｼ医ユ繧ｹ繝域峩譁ｰ・・,
      problemDescription: "繝・せ繝育畑縺ｮ隱ｬ譏取枚縺ｧ縺吶・
    },
    updatedBy: "user"
  };

  try {
    console.log('繝ｪ繧ｯ繧ｨ繧ｹ繝磯∽ｿ｡荳ｭ...');
    console.log('URL:', url);
    console.log('Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('繧ｹ繝・・繧ｿ繧ｹ:', response.status);
    const responseText = await response.text();
    console.log('繝ｬ繧ｹ繝昴Φ繧ｹ:', responseText);

    if (response.ok) {
      const responseData = JSON.parse(responseText);
      console.log('謌仙粥・・);
      console.log('繝舌ャ繧ｯ繧｢繝・・繝輔ぃ繧､繝ｫ:', responseData.backupFile);
      console.log('繝舌ャ繧ｯ繧｢繝・・繝代せ:', responseData.backupPath);
    } else {
      console.log('繧ｨ繝ｩ繝ｼ:', response.status, responseText);
    }
  } catch (error) {
    console.error('繝ｪ繧ｯ繧ｨ繧ｹ繝医お繝ｩ繝ｼ:', error.message);
  }
}

testBackup();
