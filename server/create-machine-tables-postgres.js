#!/usr/bin/env node

/**
 * PostgreSQL用機種・機械番号テーブル作成スクリプト
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function createMachineTablesPostgres() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:takabeni@localhost:5432/webappdb'
  });

  try {
    console.log('📊 PostgreSQLデータベース接続');
    
    // SQLファイルを読み込み
    const sqlFile = path.join(process.cwd(), 'create-machine-tables-postgres.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // SQLを実行
    await pool.query(sql);
    
    // サンプルデータを個別に挿入
    const sampleTypes = ['軌道モータカー', '鉄製トロ（10t）', '鉄製トロ（25t）', '箱トロ', 'ミニホッパー車'];
    
    for (const typeName of sampleTypes) {
      await pool.query(`
        INSERT INTO machine_types (machine_type_name) 
        SELECT $1 
        WHERE NOT EXISTS (SELECT 1 FROM machine_types WHERE machine_type_name = $1)
      `, [typeName]);
    }
    
    // 機械番号のサンプルデータを挿入
    const sampleMachines = [
      { number: 'TRACK-001', type: '軌道モータカー' },
      { number: 'TROLLEY10-001', type: '鉄製トロ（10t）' },
      { number: 'TROLLEY25-001', type: '鉄製トロ（25t）' },
      { number: 'BOX-001', type: '箱トロ' },
      { number: 'HOPPER-001', type: 'ミニホッパー車' }
    ];
    
    for (const machine of sampleMachines) {
      await pool.query(`
        INSERT INTO machines (machine_number, machine_type_id) 
        SELECT $1, mt.id 
        FROM machine_types mt 
        WHERE mt.machine_type_name = $2 
        AND NOT EXISTS (SELECT 1 FROM machines WHERE machine_number = $1)
      `, [machine.number, machine.type]);
    }
    
    console.log('✅ 機種・機械番号テーブル作成完了');
    
    // テーブル一覧を確認
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('machine_types', 'machines')
      ORDER BY table_name
    `);
    console.log('📋 作成されたテーブル:');
    tablesResult.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // 機種データを確認
    const machineTypesResult = await pool.query("SELECT * FROM machine_types ORDER BY machine_type_name");
    console.log('🔧 機種データ:');
    machineTypesResult.rows.forEach(type => {
      console.log(`  - ${type.machine_type_name} (ID: ${type.id})`);
    });
    
    // 機械番号データを確認
    const machinesResult = await pool.query(`
      SELECT m.machine_number, mt.machine_type_name 
      FROM machines m 
      LEFT JOIN machine_types mt ON m.machine_type_id = mt.id 
      ORDER BY mt.machine_type_name, m.machine_number
    `);
    console.log('🔩 機械番号データ:');
    machinesResult.rows.forEach(machine => {
      console.log(`  - ${machine.machine_number} (${machine.machine_type_name})`);
    });
    
  } catch (error) {
    console.error('❌ テーブル作成エラー:', error);
  } finally {
    await pool.end();
  }
}

createMachineTablesPostgres().then(() => {
  console.log('🎉 PostgreSQL機種・機械番号テーブル作成完了');
  process.exit(0);
}).catch(error => {
  console.error('❌ スクリプト実行エラー:', error);
  process.exit(1);
});
