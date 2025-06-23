const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://postgres:takabeni@localhost:5432/maintenance'
});

async function checkCurrentFlows() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 現在のフロー状況を確認中...\n');
    
    // 1. データベースから取得
    console.log('📊 データベースのフロー:');
    const dbResult = await client.query('SELECT id, title, created_at FROM emergency_flows ORDER BY title');
    
    if (dbResult.rows.length === 0) {
      console.log('   ❌ データベースにフローがありません');
    } else {
      dbResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.title} (ID: ${row.id}) - ${row.created_at}`);
      });
    }
    
    // 2. ファイルから取得
    console.log('\n📁 ファイルのフロー:');
    const troubleshootingDir = path.join(process.cwd(), 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingDir)) {
      console.log('   ❌ troubleshootingディレクトリが存在しません');
    } else {
      const files = fs.readdirSync(troubleshootingDir)
        .filter(file => file.endsWith('.json') && !file.includes('.backup') && !file.includes('.tmp'))
        .sort();
      
      if (files.length === 0) {
        console.log('   ❌ フローファイルがありません');
      } else {
        files.forEach((fileName, index) => {
          try {
            const filePath = path.join(troubleshootingDir, fileName);
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            console.log(`   ${index + 1}. ${data.title || fileName} (ID: ${data.id || 'N/A'}) - ${fileName}`);
          } catch (error) {
            console.log(`   ${index + 1}. ❌ ファイル読み込みエラー: ${fileName}`);
          }
        });
      }
    }
    
    console.log('\n📈 統計:');
    console.log(`   データベース: ${dbResult.rows.length}件`);
    console.log(`   ファイル: ${fs.existsSync(troubleshootingDir) ? fs.readdirSync(troubleshootingDir).filter(f => f.endsWith('.json')).length : 0}件`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkCurrentFlows(); 