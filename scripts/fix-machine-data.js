/**
 * 機種・機械データ修復スクリプト
 * 正しいテーブル構造に基づいてデータを確認・初期化
 */

const { Client } = require('pg');

async function fixMachineData() {
    console.log('🔧 機種・機械データ修復開始...');
    
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ データベース接続成功');

        // 現在のデータ確認
        console.log('\n📊 現在の機種データ:');
        const machineTypes = await client.query('SELECT * FROM machine_types ORDER BY created_at');
        console.log(`機種数: ${machineTypes.rows.length}`);
        machineTypes.rows.forEach(type => {
            console.log(`  🔧 ${type.machine_type_name} (ID: ${type.id})`);
        });

        console.log('\n📊 現在の機械データ:');
        const machines = await client.query(`
            SELECT m.*, mt.machine_type_name 
            FROM machines m 
            LEFT JOIN machine_types mt ON m.machine_type_id = mt.id 
            ORDER BY m.created_at
        `);
        console.log(`機械数: ${machines.rows.length}`);
        machines.rows.forEach(machine => {
            console.log(`  🏭 ${machine.machine_number} (種類: ${machine.machine_type_name || '未設定'})`);
        });

        // データが空の場合は初期データを挿入
        if (machineTypes.rows.length === 0) {
            console.log('\n🆕 初期機種データを挿入...');
            const initialMachineTypes = [
                { id: 'mt_001', name: '電車制御装置' },
                { id: 'mt_002', name: 'ブレーキ制御装置' },
                { id: 'mt_003', name: '空調制御装置' },
                { id: 'mt_004', name: 'ドア制御装置' },
                { id: 'mt_005', name: '放送制御装置' },
                { id: 'mt_006', name: '列車情報制御装置' },
                { id: 'mt_007', name: '車両監視装置' }
            ];

            for (const type of initialMachineTypes) {
                await client.query(
                    'INSERT INTO machine_types (id, machine_type_name, created_at) VALUES ($1, $2, NOW())',
                    [type.id, type.name]
                );
                console.log(`  ✅ 機種追加: ${type.name}`);
            }
        }

        if (machines.rows.length === 0) {
            console.log('\n🆕 初期機械データを挿入...');
            const initialMachines = [
                { id: 'm_001', number: 'TC-001', type_id: 'mt_001' },
                { id: 'm_002', number: 'TC-002', type_id: 'mt_001' },
                { id: 'm_003', number: 'BC-001', type_id: 'mt_002' },
                { id: 'm_004', number: 'AC-001', type_id: 'mt_003' },
                { id: 'm_005', number: 'DC-001', type_id: 'mt_004' }
            ];

            for (const machine of initialMachines) {
                await client.query(
                    'INSERT INTO machines (id, machine_number, machine_type_id, created_at) VALUES ($1, $2, $3, NOW())',
                    [machine.id, machine.number, machine.type_id]
                );
                console.log(`  ✅ 機械追加: ${machine.number}`);
            }
        }

        // システム設定テーブルを作成・初期化
        console.log('\n⚙️  システム設定テーブルを作成...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                description TEXT,
                category TEXT DEFAULT 'general',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ system_settingsテーブル作成完了');

        // 初期設定データ挿入
        const initialSettings = [
            { key: 'system_name', value: '応急処置サポート', description: 'システム名', category: 'system' },
            { key: 'default_machine_type', value: 'mt_001', description: 'デフォルト機種', category: 'machine' },
            { key: 'file_upload_max_size', value: '10485760', description: 'ファイルアップロード最大サイズ(bytes)', category: 'upload' },
            { key: 'blob_storage_enabled', value: 'true', description: 'Blob Storage有効化', category: 'storage' },
            { key: 'ai_response_enabled', value: 'true', description: 'AI応答有効化', category: 'ai' }
        ];

        for (const setting of initialSettings) {
            await client.query(`
                INSERT INTO system_settings (key, value, description, category) 
                VALUES ($1, $2, $3, $4) 
                ON CONFLICT (key) DO UPDATE SET 
                    value = EXCLUDED.value,
                    updated_at = NOW()
            `, [setting.key, setting.value, setting.description, setting.category]);
            console.log(`  ✅ 設定追加: ${setting.key} = ${setting.value}`);
        }

        // 最終確認
        console.log('\n✅ 修復完了後のデータ確認:');
        const finalMachineTypes = await client.query('SELECT COUNT(*) FROM machine_types');
        const finalMachines = await client.query('SELECT COUNT(*) FROM machines');
        const finalSettings = await client.query('SELECT COUNT(*) FROM system_settings');
        
        console.log(`📊 機種数: ${finalMachineTypes.rows[0].count}`);
        console.log(`📊 機械数: ${finalMachines.rows[0].count}`);
        console.log(`📊 設定数: ${finalSettings.rows[0].count}`);

        await client.end();
        console.log('\n🎉 機種・機械データ修復完了!');

    } catch (error) {
        console.error('❌ 修復エラー:', error.message);
        console.error(error.stack);
        await client.end().catch(() => {});
    }
}

fixMachineData().catch(console.error);
