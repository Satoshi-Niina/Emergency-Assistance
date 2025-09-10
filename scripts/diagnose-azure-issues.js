/**
 * Azure環境問題診断スクリプト
 * 1. データベース接続確認
 * 2. 機種・機械データ確認
 * 3. Blob Storage接続確認
 * 4. 設定データ確認
 */

const { Client } = require('pg');

async function diagnoseAzureIssues() {
    console.log('🔍 Azure環境診断開始...');
    
    // Database connection
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('\n1️⃣ データベース接続テスト...');
        await client.connect();
        console.log('✅ データベース接続成功');

        // テーブル存在確認
        console.log('\n2️⃣ テーブル構造確認...');
        const tables = await client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            ORDER BY table_name, ordinal_position
        `);
        
        console.log('📋 データベーステーブル:');
        const tableStructure = {};
        tables.rows.forEach(row => {
            if (!tableStructure[row.table_name]) {
                tableStructure[row.table_name] = [];
            }
            tableStructure[row.table_name].push(`${row.column_name} (${row.data_type})`);
        });
        
        Object.keys(tableStructure).forEach(tableName => {
            console.log(`  📄 ${tableName}:`);
            tableStructure[tableName].forEach(col => {
                console.log(`    - ${col}`);
            });
        });

        // 機種データ確認
        console.log('\n3️⃣ 機種・機械データ確認...');
        try {
            const equipmentQuery = await client.query('SELECT * FROM equipment LIMIT 5');
            console.log(`📊 機種データ数: ${equipmentQuery.rows.length}`);
            if (equipmentQuery.rows.length > 0) {
                console.log('サンプルデータ:', equipmentQuery.rows[0]);
            } else {
                console.log('⚠️  機種データが存在しません');
            }
        } catch (error) {
            console.log('❌ equipmentテーブルが存在しません:', error.message);
        }

        // ドキュメントデータ確認
        console.log('\n4️⃣ ドキュメントデータ確認...');
        try {
            const documentsQuery = await client.query('SELECT * FROM documents LIMIT 5');
            console.log(`📊 ドキュメントデータ数: ${documentsQuery.rows.length}`);
            if (documentsQuery.rows.length > 0) {
                console.log('サンプルデータ:', documentsQuery.rows[0]);
            }
        } catch (error) {
            console.log('❌ documentsテーブルエラー:', error.message);
        }

        // 設定データ確認
        console.log('\n5️⃣ 設定データ確認...');
        try {
            const settingsQuery = await client.query('SELECT * FROM system_settings LIMIT 10');
            console.log(`📊 設定データ数: ${settingsQuery.rows.length}`);
            settingsQuery.rows.forEach(setting => {
                console.log(`  🔧 ${setting.key}: ${setting.value}`);
            });
        } catch (error) {
            console.log('❌ system_settingsテーブルエラー:', error.message);
        }

        // ユーザーデータ確認
        console.log('\n6️⃣ ユーザーデータ確認...');
        const usersQuery = await client.query('SELECT id, username, role, display_name FROM users');
        console.log(`👥 ユーザー数: ${usersQuery.rows.length}`);
        usersQuery.rows.forEach(user => {
            console.log(`  👤 ${user.username} (${user.role}) - ${user.display_name}`);
        });

        await client.end();
        console.log('\n✅ 診断完了');

    } catch (error) {
        console.error('❌ 診断エラー:', error.message);
        await client.end().catch(() => {});
    }
}

diagnoseAzureIssues().catch(console.error);
