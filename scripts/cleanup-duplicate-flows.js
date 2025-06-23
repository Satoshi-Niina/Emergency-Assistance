const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:takabeni@localhost:5432/maintenance'
});

async function cleanupDuplicateFlows() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 重複フローの確認を開始...');
    
    // 同じタイトルのフローを検索
    const result = await client.query(`
      SELECT title, COUNT(*) as count, array_agg(id) as ids, array_agg(created_at) as created_ats
      FROM emergency_flows 
      GROUP BY title 
      HAVING COUNT(*) > 1
      ORDER BY title
    `);
    
    if (result.rows.length === 0) {
      console.log('✅ 重複フローは見つかりませんでした');
      return;
    }
    
    console.log(`📊 重複フローが見つかりました: ${result.rows.length}件`);
    
    for (const row of result.rows) {
      console.log(`\n🔍 タイトル: "${row.title}"`);
      console.log(`   重複数: ${row.count}件`);
      console.log(`   ID一覧: ${row.ids.join(', ')}`);
      console.log(`   作成日時: ${row.created_ats.join(', ')}`);
      
      // 最新のフローを残して、古いものを削除
      const sortedIds = row.ids.map((id, index) => ({
        id,
        createdAt: row.created_ats[index]
      })).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      const keepId = sortedIds[sortedIds.length - 1].id; // 最新のものを保持
      const deleteIds = sortedIds.slice(0, -1).map(item => item.id); // 古いものを削除
      
      console.log(`   💾 保持するID: ${keepId}`);
      console.log(`   🗑️ 削除するID: ${deleteIds.join(', ')}`);
      
      // 古いフローを削除
      for (const deleteId of deleteIds) {
        await client.query('DELETE FROM emergency_flows WHERE id = $1', [deleteId]);
        console.log(`   ✅ 削除完了: ${deleteId}`);
      }
    }
    
    console.log('\n✅ 重複フローの整理が完了しました');
    
    // 最終確認
    const finalResult = await client.query('SELECT COUNT(*) as total FROM emergency_flows');
    console.log(`📊 最終フロー数: ${finalResult.rows[0].total}件`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupDuplicateFlows(); 