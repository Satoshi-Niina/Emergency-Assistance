/**
 * Azure本番環境診断スクリプト
 *
 * データベース接続、テーブル状態、BLOBストレージ接続を診断します
 *
 * 使用方法:
 * node server/azure-diagnosis.js
 */

const { Pool } = require('pg');
const { BlobServiceClient } = require('@azure/storage-blob');

// 環境変数から接続情報を取得
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.AZURE_POSTGRESQL_CONNECTIONSTRING;
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'emergency-exports';

console.log('🔍 Azure環境診断スクリプト開始\n');
console.log('=' .repeat(60));

// 診断結果を格納
const results = {
  database: { status: 'unknown', details: null, error: null },
  tables: { status: 'unknown', details: null, error: null },
  blobStorage: { status: 'unknown', details: null, error: null }
};

// 1. データベース接続診断
async function diagnoseDatabaseConnection() {
  console.log('\n📊 [1/3] データベース接続診断');
  console.log('-'.repeat(60));

  if (!DATABASE_URL) {
    results.database.status = 'error';
    results.database.error = '環境変数DATABASE_URLが設定されていません';
    console.log('❌ DATABASE_URL: 未設定');
    return false;
  }

  console.log('✅ DATABASE_URL: 設定済み');

  try {
    // SSL設定を含むプールを作成
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.PG_SSL !== 'false' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
      max: 1
    });

    console.log('🔄 データベース接続テスト中...');
    const client = await pool.connect();

    // 接続テストクエリ
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');

    results.database.status = 'success';
    results.database.details = {
      current_time: result.rows[0].current_time,
      pg_version: result.rows[0].pg_version.split(',')[0] // バージョン情報の最初の部分
    };

    console.log('✅ データベース接続成功');
    console.log(`   現在時刻: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQLバージョン: ${result.rows[0].pg_version.split(',')[0]}`);

    client.release();
    await pool.end();
    return true;

  } catch (error) {
    results.database.status = 'error';
    results.database.error = error.message;
    console.log('❌ データベース接続エラー:', error.message);
    return false;
  }
}

// 2. テーブル状態診断
async function diagnoseTables() {
  console.log('\n📋 [2/3] テーブル状態診断');
  console.log('-'.repeat(60));

  if (!DATABASE_URL) {
    console.log('⏭️  スキップ (データベース未接続)');
    return;
  }

  try {
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.PG_SSL !== 'false' ? { rejectUnauthorized: false } : false,
      max: 1
    });

    const client = await pool.connect();

    // 必要なテーブルのリスト
    const requiredTables = ['users', 'machine_types', 'machines', 'chat_history'];
    const tableDetails = {};

    for (const tableName of requiredTables) {
      try {
        // テーブルの存在確認
        const existsResult = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          ) as exists
        `, [tableName]);

        const exists = existsResult.rows[0].exists;

        if (exists) {
          // データ件数取得
          const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          const count = parseInt(countResult.rows[0].count);

          tableDetails[tableName] = { exists: true, count };
          console.log(`✅ ${tableName.padEnd(15)} - 存在: ○  データ件数: ${count}件`);

          // usersテーブルの場合、ユーザー一覧を表示
          if (tableName === 'users') {
            const usersResult = await client.query('SELECT id, username, role, display_name FROM users ORDER BY id');
            if (usersResult.rows.length > 0) {
              console.log('   📝 登録ユーザー:');
              usersResult.rows.forEach(user => {
                console.log(`      - ${user.username} (${user.role}) - ${user.display_name || 'N/A'}`);
              });
            }
          }

          // machine_typesの場合、機種一覧を表示
          if (tableName === 'machine_types' && count > 0 && count <= 10) {
            const typesResult = await client.query('SELECT id, machine_type_name FROM machine_types ORDER BY id LIMIT 10');
            console.log('   📝 登録機種:');
            typesResult.rows.forEach(type => {
              console.log(`      - ${type.machine_type_name}`);
            });
          }

        } else {
          tableDetails[tableName] = { exists: false, count: 0 };
          console.log(`❌ ${tableName.padEnd(15)} - 存在: ✗`);
        }

      } catch (error) {
        tableDetails[tableName] = { exists: false, error: error.message };
        console.log(`❌ ${tableName.padEnd(15)} - エラー: ${error.message}`);
      }
    }

    results.tables.status = 'success';
    results.tables.details = tableDetails;

    client.release();
    await pool.end();

  } catch (error) {
    results.tables.status = 'error';
    results.tables.error = error.message;
    console.log('❌ テーブル診断エラー:', error.message);
  }
}

// 3. BLOBストレージ診断
async function diagnoseBlobStorage() {
  console.log('\n☁️  [3/3] Azure Blob Storage診断');
  console.log('-'.repeat(60));

  if (!AZURE_STORAGE_CONNECTION_STRING) {
    results.blobStorage.status = 'error';
    results.blobStorage.error = '環境変数AZURE_STORAGE_CONNECTION_STRINGが設定されていません';
    console.log('❌ AZURE_STORAGE_CONNECTION_STRING: 未設定');
    console.log('⚠️  履歴管理機能が動作しません');
    return;
  }

  console.log('✅ AZURE_STORAGE_CONNECTION_STRING: 設定済み');
  console.log(`📦 コンテナ名: ${AZURE_STORAGE_CONTAINER_NAME}`);

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);

    console.log('🔄 コンテナ存在確認中...');
    const exists = await containerClient.exists();

    if (exists) {
      console.log('✅ コンテナが存在します');

      // BLOBファイル数を確認
      let blobCount = 0;
      let exportsCount = 0;

      for await (const blob of containerClient.listBlobsFlat()) {
        blobCount++;
        if (blob.name.startsWith('exports/')) {
          exportsCount++;
        }
      }

      results.blobStorage.status = 'success';
      results.blobStorage.details = {
        containerExists: true,
        totalBlobs: blobCount,
        exportsBlobs: exportsCount
      };

      console.log(`📊 BLOBファイル数: ${blobCount}件 (exports/配下: ${exportsCount}件)`);

    } else {
      results.blobStorage.status = 'warning';
      results.blobStorage.details = { containerExists: false };
      console.log(`⚠️  コンテナ "${AZURE_STORAGE_CONTAINER_NAME}" が存在しません`);
      console.log('💡 コンテナを作成してください:');
      console.log(`   Azure Portal > ストレージアカウント > コンテナ > 新規作成 > 名前: ${AZURE_STORAGE_CONTAINER_NAME}`);
    }

  } catch (error) {
    results.blobStorage.status = 'error';
    results.blobStorage.error = error.message;
    console.log('❌ BLOBストレージ接続エラー:', error.message);
  }
}

// 診断サマリーを表示
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 診断結果サマリー');
  console.log('='.repeat(60));

  // データベース
  const dbIcon = results.database.status === 'success' ? '✅' : '❌';
  console.log(`${dbIcon} データベース接続: ${results.database.status.toUpperCase()}`);
  if (results.database.error) {
    console.log(`   エラー: ${results.database.error}`);
  }

  // テーブル
  const tablesIcon = results.tables.status === 'success' ? '✅' : '❌';
  console.log(`${tablesIcon} テーブル状態: ${results.tables.status.toUpperCase()}`);
  if (results.tables.details) {
    const missingTables = Object.entries(results.tables.details)
      .filter(([_, details]) => !details.exists)
      .map(([name]) => name);

    const emptyTables = Object.entries(results.tables.details)
      .filter(([_, details]) => details.exists && details.count === 0)
      .map(([name]) => name);

    if (missingTables.length > 0) {
      console.log(`   未作成テーブル: ${missingTables.join(', ')}`);
    }
    if (emptyTables.length > 0) {
      console.log(`   データ未登録: ${emptyTables.join(', ')}`);
    }
  }

  // BLOBストレージ
  const blobIcon = results.blobStorage.status === 'success' ? '✅' :
                   results.blobStorage.status === 'warning' ? '⚠️' : '❌';
  console.log(`${blobIcon} BLOBストレージ: ${results.blobStorage.status.toUpperCase()}`);
  if (results.blobStorage.error) {
    console.log(`   エラー: ${results.blobStorage.error}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('💡 推奨アクション');
  console.log('='.repeat(60));

  // 推奨アクションを表示
  const actions = [];

  if (results.database.status !== 'success') {
    actions.push('1. DATABASE_URL環境変数を正しく設定してください');
  }

  if (results.tables.details) {
    const emptyUsers = results.tables.details.users?.exists && results.tables.details.users.count === 0;
    const emptyMachineTypes = results.tables.details.machine_types?.exists && results.tables.details.machine_types.count === 0;

    if (emptyUsers || emptyMachineTypes) {
      actions.push('2. seed-production-data.sql を実行して初期データを投入してください');
    }
  }

  if (results.blobStorage.status === 'error') {
    actions.push('3. AZURE_STORAGE_CONNECTION_STRING環境変数を設定してください');
  } else if (results.blobStorage.status === 'warning') {
    actions.push(`3. Azureポータルで "${AZURE_STORAGE_CONTAINER_NAME}" コンテナを作成してください`);
  }

  if (actions.length === 0) {
    console.log('✅ すべて正常です!');
  } else {
    actions.forEach(action => console.log(action));
  }

  console.log('='.repeat(60) + '\n');
}

// メイン実行
async function main() {
  try {
    await diagnoseDatabaseConnection();
    await diagnoseTables();
    await diagnoseBlobStorage();
    printSummary();

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 診断中に予期しないエラーが発生しました:', error);
    process.exit(1);
  }
}

main();
