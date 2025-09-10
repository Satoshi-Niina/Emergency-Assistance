#!/usr/bin/env node

/**
 * CAT系建設機械モックデータクリーンアップスクリプト
 * 鉄道機械データのみに統一します
 */

const { Client } = require('pg');

async function cleanupMockData() {
  console.log('🧹 CAT系モックデータクリーンアップ開始...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ データベース接続成功');

    // 現在のデータ確認
    console.log('\n📊 クリーンアップ前のデータ確認:');
    
    const beforeMachineTypes = await client.query('SELECT * FROM machine_types ORDER BY machine_type_name');
    console.log(`機種数: ${beforeMachineTypes.rows.length}`);
    beforeMachineTypes.rows.forEach(type => {
      console.log(`  🔧 ${type.machine_type_name} (ID: ${type.id})`);
    });

    const beforeMachines = await client.query(`
      SELECT m.machine_number, mt.machine_type_name 
      FROM machines m 
      LEFT JOIN machine_types mt ON m.machine_type_id = mt.id 
      ORDER BY mt.machine_type_name, m.machine_number
    `);
    console.log(`\n機械数: ${beforeMachines.rows.length}`);
    beforeMachines.rows.forEach(machine => {
      console.log(`  🏭 ${machine.machine_number} (${machine.machine_type_name || '未分類'})`);
    });

    // CAT系建設機械データを削除
    console.log('\n🗑️  CAT系建設機械データを削除中...');
    
    // 1. CAT系機械の削除
    const deleteMachinesResult = await client.query(`
      DELETE FROM machines 
      WHERE machine_number LIKE 'CAT%' 
         OR machine_number LIKE 'D8T%' 
         OR machine_number LIKE '980K%'
         OR machine_number IN ('001', '002', '003', '004', '005', '006', '007', '008')
    `);
    console.log(`✅ CAT系機械削除: ${deleteMachinesResult.rowCount}件`);

    // 2. CAT系機種の削除
    const deleteMachineTypesResult = await client.query(`
      DELETE FROM machine_types 
      WHERE machine_type_name IN (
        'CAT336D', 'D8T', '980K', 
        '掘削機械', 'ブルドーザー', 'ホイールローダー',
        '建設機械', '重機', 'トラック'
      )
    `);
    console.log(`✅ CAT系機種削除: ${deleteMachineTypesResult.rowCount}件`);

    // 3. 孤立した機械データの削除（機種が存在しない機械）
    const deleteOrphanMachines = await client.query(`
      DELETE FROM machines 
      WHERE machine_type_id NOT IN (
        SELECT id FROM machine_types
      )
    `);
    console.log(`✅ 孤立機械削除: ${deleteOrphanMachines.rowCount}件`);

    // 4. 使用されていない機種の削除
    const deleteUnusedTypes = await client.query(`
      DELETE FROM machine_types 
      WHERE id NOT IN (
        SELECT DISTINCT machine_type_id FROM machines 
        WHERE machine_type_id IS NOT NULL
      )
      AND machine_type_name NOT IN (
        '軌道モータカー', '鉄製トロ（10t）', '鉄製トロ（25t）', 
        '箱トロ', 'ミニホッパー車'
      )
    `);
    console.log(`✅ 未使用機種削除: ${deleteUnusedTypes.rowCount}件`);

    // 5. 重複データの確認・削除
    const duplicateCheck = await client.query(`
      SELECT machine_type_name, COUNT(*) as count
      FROM machine_types 
      GROUP BY machine_type_name 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCheck.rows.length > 0) {
      console.log('\n⚠️  重複機種データを発見:');
      duplicateCheck.rows.forEach(dup => {
        console.log(`  - ${dup.machine_type_name}: ${dup.count}件`);
      });
      
      // 重複を解決（最新のもの以外を削除）
      await client.query(`
        DELETE FROM machine_types 
        WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
              PARTITION BY machine_type_name 
              ORDER BY created_at DESC
            ) as rn
            FROM machine_types
          ) t WHERE rn > 1
        )
      `);
      console.log('✅ 重複機種データを解決');
    }

    // クリーンアップ後の確認
    console.log('\n📊 クリーンアップ後のデータ確認:');
    
    const afterMachineTypes = await client.query('SELECT * FROM machine_types ORDER BY machine_type_name');
    console.log(`機種数: ${afterMachineTypes.rows.length}`);
    afterMachineTypes.rows.forEach(type => {
      console.log(`  🔧 ${type.machine_type_name} (ID: ${type.id})`);
    });

    const afterMachines = await client.query(`
      SELECT m.machine_number, mt.machine_type_name 
      FROM machines m 
      LEFT JOIN machine_types mt ON m.machine_type_id = mt.id 
      ORDER BY mt.machine_type_name, m.machine_number
    `);
    console.log(`\n機械数: ${afterMachines.rows.length}`);
    afterMachines.rows.forEach(machine => {
      console.log(`  🏭 ${machine.machine_number} (${machine.machine_type_name || '未分類'})`);
    });

    // 正しい鉄道機械データが不足している場合は追加
    if (afterMachineTypes.rows.length < 3) {
      console.log('\n🚂 標準的な鉄道機械データを追加中...');
      
      const railwayMachineTypes = [
        '軌道モータカー',
        '鉄製トロ（10t）',
        '鉄製トロ（25t）',
        '箱トロ',
        'ミニホッパー車'
      ];

      for (const typeName of railwayMachineTypes) {
        const existing = await client.query(
          'SELECT id FROM machine_types WHERE machine_type_name = $1',
          [typeName]
        );
        
        if (existing.rows.length === 0) {
          const result = await client.query(
            'INSERT INTO machine_types (machine_type_name) VALUES ($1) RETURNING id',
            [typeName]
          );
          console.log(`  ✅ 機種追加: ${typeName}`);
          
          // 各機種に標準的な機械番号を追加
          const typeId = result.rows[0].id;
          const prefix = typeName.includes('軌道') ? 'TRACK' : 
                        typeName.includes('10t') ? 'TROLLEY10' :
                        typeName.includes('25t') ? 'TROLLEY25' :
                        typeName.includes('箱') ? 'BOX' : 'HOPPER';
          
          for (let i = 1; i <= 3; i++) {
            const machineNumber = `${prefix}-${i.toString().padStart(3, '0')}`;
            await client.query(
              'INSERT INTO machines (machine_number, machine_type_id) VALUES ($1, $2)',
              [machineNumber, typeId]
            );
            console.log(`    📦 機械番号追加: ${machineNumber}`);
          }
        }
      }
    }

    console.log('\n🎉 モックデータクリーンアップ完了！');
    console.log('✅ CAT系建設機械データを削除');
    console.log('✅ 鉄道機械データに統一');
    console.log('✅ データベースの整合性を確保');

  } catch (error) {
    console.error('❌ クリーンアップエラー:', error);
    console.error('詳細:', error.message);
  } finally {
    try {
      await client.end();
    } catch (e) {
      // 接続終了エラーを無視
    }
  }
}

// スクリプト実行（Azure環境用）
if (process.env.DATABASE_URL) {
  cleanupMockData().catch(console.error);
} else {
  console.error('❌ DATABASE_URL環境変数が設定されていません');
  process.exit(1);
}
