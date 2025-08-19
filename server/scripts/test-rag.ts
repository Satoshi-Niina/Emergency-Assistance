#!/usr/bin/env tsx

/**
 * RAGシステムの動作確認用テストスクリプト
 * 既存UIを変更せずにRAG APIの動作を確認できる
 */

import { config } from 'dotenv';
import { loadRagConfig } from '../services/config-manager';
import { health } from '../services/db';

// 環境変数を読み込み
config();

async function testRagSystem() {
  console.log('🧪 RAGシステムの動作確認を開始します...\n');

  try {
    // 1. データベース接続確認
    console.log('1️⃣ データベース接続確認...');
    const dbHealthy = await health();
    if (dbHealthy) {
      console.log('✅ データベース接続: OK');
    } else {
      console.log('❌ データベース接続: FAILED');
      return;
    }

    // 2. RAG設定読み込み確認
    console.log('\n2️⃣ RAG設定読み込み確認...');
    try {
      const ragConfig = await loadRagConfig();
      console.log('✅ RAG設定読み込み: OK');
      console.log('   - 埋め込み次元数:', ragConfig.embedDim);
      console.log('   - チャンクサイズ:', ragConfig.chunkSize);
      console.log('   - チャンクオーバーラップ:', ragConfig.chunkOverlap);
      console.log('   - 検索結果数:', ragConfig.retrieveK);
    } catch (error) {
      console.log('❌ RAG設定読み込み: FAILED');
      console.error('   エラー:', error);
      return;
    }

    // 3. 環境変数確認
    console.log('\n3️⃣ 環境変数確認...');
    const requiredEnvVars = ['DATABASE_URL', 'OPENAI_API_KEY'];
    const missingVars: string[] = [];
    
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar}: SET`);
      } else {
        console.log(`❌ ${envVar}: NOT SET`);
        missingVars.push(envVar);
      }
    }

    if (missingVars.length > 0) {
      console.log(`\n⚠️  以下の環境変数が設定されていません: ${missingVars.join(', ')}`);
      console.log('   一部の機能が動作しない可能性があります。');
    }

    // 4. APIエンドポイント確認
    console.log('\n4️⃣ APIエンドポイント確認...');
    const baseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3001';
    const endpoints = [
      '/api/config/rag',
      '/api/ingest/status',
      '/api/search/stats'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`);
        if (response.ok) {
          console.log(`✅ ${endpoint}: OK (${response.status})`);
        } else {
          console.log(`❌ ${endpoint}: FAILED (${response.status})`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: ERROR (${error instanceof Error ? error.message : 'Unknown'})`);
      }
    }

    // 5. サンプルデータ取込テスト（オプション）
    console.log('\n5️⃣ サンプルデータ取込テスト...');
    if (process.env.OPENAI_API_KEY) {
      try {
        const sampleData = {
          filename: 'test-sample.txt',
          text: 'これはテスト用のサンプルテキストです。エンジンの始動手順について説明します。まず、燃料タンクの残量を確認してください。次に、スタータースイッチを押してエンジンを始動します。エンジンが正常に始動したら、オイル圧力と水温を確認してください。',
          tags: ['test', 'engine', 'procedure']
        };

        const response = await fetch(`${baseUrl}/api/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sampleData)
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ サンプルデータ取込: OK');
          console.log(`   - ドキュメントID: ${result.doc_id}`);
          console.log(`   - チャンク数: ${result.chunks}`);
          console.log(`   - 処理時間: ${result.stats.processingTime}ms`);
        } else {
          console.log('❌ サンプルデータ取込: FAILED');
          const errorData = await response.json().catch(() => ({}));
          console.log(`   エラー: ${errorData.message || response.statusText}`);
        }
      } catch (error) {
        console.log('❌ サンプルデータ取込: ERROR');
        console.log(`   エラー: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    } else {
      console.log('⚠️  OPENAI_API_KEYが設定されていないため、サンプルデータ取込テストをスキップします');
    }

    // 6. 検索テスト（オプション）
    console.log('\n6️⃣ 検索テスト...');
    if (process.env.OPENAI_API_KEY) {
      try {
        const searchQuery = 'エンジン';
        const response = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(searchQuery)}`);
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ 検索テスト: OK');
          console.log(`   - クエリ: "${searchQuery}"`);
          console.log(`   - 結果数: ${result.stats.totalResults}`);
          console.log(`   - 上位結果数: ${result.stats.topResults}`);
        } else {
          console.log('❌ 検索テスト: FAILED');
          const errorData = await response.json().catch(() => ({}));
          console.log(`   エラー: ${errorData.message || response.statusText}`);
        }
      } catch (error) {
        console.log('❌ 検索テスト: ERROR');
        console.log(`   エラー: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    } else {
      console.log('⚠️  OPENAI_API_KEYが設定されていないため、検索テストをスキップします');
    }

    console.log('\n🎉 RAGシステムの動作確認が完了しました！');
    console.log('\n📋 次のステップ:');
    console.log('   1. npm run db:migrate でデータベースを初期化');
    console.log('   2. サーバーを起動 (npm run dev)');
    console.log('   3. ブラウザでAPIエンドポイントをテスト');
    console.log('   4. クライアントSDKを使用してフロントエンドから呼び出し');

  } catch (error) {
    console.error('\n❌ テスト実行中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみテストを実行
if (import.meta.url === `file://${process.argv[1]}`) {
  testRagSystem();
}

export { testRagSystem };
