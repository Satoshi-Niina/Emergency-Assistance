const fetch = require('node-fetch');

async function testDeleteAPI() {
  try {
    console.log('🔍 フロー一覧を取得中...');
    
    // 1. フロー一覧を取得
    const listResponse = await fetch('http://localhost:3000/api/emergency-flow/list');
    if (!listResponse.ok) {
      throw new Error(`フロー一覧取得エラー: ${listResponse.status}`);
    }
    
    const flows = await listResponse.json();
    console.log(`📋 取得したフロー数: ${flows.length}`);
    
    if (flows.length === 0) {
      console.log('❌ 削除対象のフローがありません');
      return;
    }
    
    // 最初のフローを削除対象とする
    const targetFlow = flows[0];
    console.log(`🎯 削除対象: ${targetFlow.id} - ${targetFlow.title}`);
    
    // 2. 削除APIをテスト
    console.log('🗑️ 削除APIをテスト中...');
    const deleteUrl = `http://localhost:3000/api/emergency-flow/${targetFlow.id}?fileName=${encodeURIComponent(targetFlow.fileName)}`;
    console.log(`📡 削除URL: ${deleteUrl}`);
    
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log(`📊 削除レスポンス: ${deleteResponse.status}`);
    
    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error(`❌ 削除エラー: ${errorText}`);
      return;
    }
    
    const deleteResult = await deleteResponse.json();
    console.log('✅ 削除成功:', deleteResult);
    
    // 3. 削除後のフロー一覧を確認
    console.log('🔍 削除後のフロー一覧を確認中...');
    const afterListResponse = await fetch('http://localhost:3000/api/emergency-flow/list');
    const afterFlows = await afterListResponse.json();
    console.log(`📋 削除後のフロー数: ${afterFlows.length}`);
    
    const deletedFlowExists = afterFlows.find(f => f.id === targetFlow.id);
    if (deletedFlowExists) {
      console.log('❌ 削除されたフローがまだ一覧に存在します');
    } else {
      console.log('✅ 削除が正常に完了しました');
    }
    
  } catch (error) {
    console.error('❌ テストエラー:', error.message);
  }
}

testDeleteAPI(); 