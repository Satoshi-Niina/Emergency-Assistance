#!/usr/bin/env node

/**
 * React Server Components (CVE-2025-55182) および Next.js (CVE-2025-66478) の脆弱性チェックスクリプト
 * 
 * 対象パッケージ:
 * - next
 * - react-server-dom-webpack
 * - react-server-dom-parcel
 * - react-server-dom-turbopack
 * 
 * 安全なバージョン:
 * - Next.js: 15.0.5, 15.1.9, 15.2.6, 15.3.6, 15.4.8, 15.5.7, 16.0.7
 * - RSC パッケージ: 19.0.1, 19.1.2, 19.2.1
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 安全なバージョンの定義
const SAFE_VERSIONS = {
  next: ['15.0.5', '15.1.9', '15.2.6', '15.3.6', '15.4.8', '15.5.7', '16.0.7'],
  rsc: ['19.0.1', '19.1.2', '19.2.1']
};

// 推奨アップデートバージョン
const RECOMMENDED_VERSIONS = {
  next: '16.0.7',
  rsc: '19.2.1'
};

// チェック対象パッケージ
const RSC_PACKAGES = [
  'react-server-dom-webpack',
  'react-server-dom-parcel',
  'react-server-dom-turbopack'
];

/**
 * バージョン文字列を解析して比較可能な形式に変換
 */
function parseVersion(versionString) {
  // ^, ~, >=, <= などのプレフィックスを削除
  const cleanVersion = versionString.replace(/^[\^~>=<]+/, '');
  const parts = cleanVersion.split('.').map(part => {
    const num = parseInt(part.split('-')[0], 10);
    return isNaN(num) ? 0 : num;
  });
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
    original: versionString,
    clean: cleanVersion
  };
}

/**
 * Next.js のバージョンが安全かチェック
 */
function isNextJsSafe(version) {
  const parsed = parseVersion(version);
  return SAFE_VERSIONS.next.some(safeVersion => {
    const safeParsed = parseVersion(safeVersion);
    return parsed.major === safeParsed.major &&
           parsed.minor === safeParsed.minor &&
           parsed.patch === safeParsed.patch;
  });
}

/**
 * RSC パッケージのバージョンが安全かチェック
 */
function isRscSafe(version) {
  const parsed = parseVersion(version);
  return SAFE_VERSIONS.rsc.some(safeVersion => {
    const safeParsed = parseVersion(safeVersion);
    return parsed.major === safeParsed.major &&
           parsed.minor === safeParsed.minor &&
           parsed.patch === safeParsed.patch;
  });
}

/**
 * package.json を読み込んで解析
 */
function analyzePackageJson(packageJsonPath) {
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    const results = [];

    // Next.js のチェック
    if (allDeps.next) {
      const version = allDeps.next;
      const isSafe = isNextJsSafe(version);
      results.push({
        package: 'next',
        version,
        status: isSafe ? 'SAFE' : 'VULNERABLE',
        cve: 'CVE-2025-66478',
        recommended: isSafe ? null : RECOMMENDED_VERSIONS.next
      });
    }

    // RSC パッケージのチェック
    RSC_PACKAGES.forEach(pkg => {
      if (allDeps[pkg]) {
        const version = allDeps[pkg];
        const isSafe = isRscSafe(version);
        results.push({
          package: pkg,
          version,
          status: isSafe ? 'SAFE' : 'VULNERABLE',
          cve: 'CVE-2025-55182',
          recommended: isSafe ? null : RECOMMENDED_VERSIONS.rsc
        });
      }
    });

    return results;
  } catch (error) {
    console.error(`❌ Error reading ${packageJsonPath}:`, error.message);
    return null;
  }
}

/**
 * 結果を整形して表示
 */
function displayResults(filePath, results) {
  const relativePath = path.relative(process.cwd(), filePath);
  
  console.log(`\n📦 ${relativePath}`);
  console.log('='.repeat(80));

  if (!results || results.length === 0) {
    console.log('✅ 対象パッケージが見つかりませんでした（脆弱性の影響なし）');
    return { safe: true, vulnerableCount: 0 };
  }

  let vulnerableCount = 0;
  let safeCount = 0;

  results.forEach(result => {
    const statusIcon = result.status === 'SAFE' ? '✅' : '⚠️';
    const statusColor = result.status === 'SAFE' ? '\x1b[32m' : '\x1b[31m';
    const resetColor = '\x1b[0m';

    console.log(`\n${statusIcon} ${result.package}`);
    console.log(`   バージョン: ${result.version}`);
    console.log(`   ステータス: ${statusColor}${result.status}${resetColor}`);
    console.log(`   CVE: ${result.cve}`);

    if (result.status === 'VULNERABLE') {
      vulnerableCount++;
      console.log(`   推奨バージョン: ${result.recommended}`);
      console.log(`   対応方法: npm install ${result.package}@${result.recommended}`);
    } else {
      safeCount++;
    }
  });

  return { safe: vulnerableCount === 0, vulnerableCount, safeCount };
}

/**
 * メイン処理
 */
function main() {
  console.log('🔍 React Server Components & Next.js 脆弱性チェック');
  console.log('   CVE-2025-55182 (RSC) / CVE-2025-66478 (Next.js)\n');

  const rootDir = path.resolve(__dirname, '..');
  const packageJsonPaths = [
    path.join(rootDir, 'package.json'),
    path.join(rootDir, 'client', 'package.json'),
    path.join(rootDir, 'server', 'package.json'),
    path.join(rootDir, 'shared', 'package.json')
  ];

  let totalVulnerable = 0;
  let totalSafe = 0;
  let filesChecked = 0;

  packageJsonPaths.forEach(packageJsonPath => {
    const results = analyzePackageJson(packageJsonPath);
    if (results !== null) {
      filesChecked++;
      const { safe, vulnerableCount, safeCount } = displayResults(packageJsonPath, results);
      totalVulnerable += vulnerableCount;
      totalSafe += (safeCount || 0);
    }
  });

  // サマリー表示
  console.log('\n' + '='.repeat(80));
  console.log('📊 チェック結果サマリー');
  console.log('='.repeat(80));
  console.log(`チェックファイル数: ${filesChecked}`);
  console.log(`✅ 安全なパッケージ: ${totalSafe}`);
  console.log(`⚠️  脆弱なパッケージ: ${totalVulnerable}`);

  if (totalVulnerable > 0) {
    console.log('\n⚠️  【警告】脆弱性が検出されました！');
    console.log('推奨される対応方法:');
    console.log('1. 上記の推奨バージョンにアップデートしてください');
    console.log('2. アップデート後、npm install を実行してください');
    console.log('3. アプリケーションのテストを実施してください');
    console.log('\n詳細: https://github.com/advisories/GHSA-cvr4-r52q-9hxj\n');
    
    // CI環境の場合はより明確なエラーメッセージを出力
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
      console.error('\n❌ CI FAILURE: Security vulnerabilities detected');
      console.error('This build will fail to prevent vulnerable code from being deployed.');
    }
    
    process.exit(1);
  } else {
    console.log('\n✅ 脆弱性は検出されませんでした\n');
    
    // CI環境の場合は成功メッセージを出力
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
      console.log('✅ CI SUCCESS: No security vulnerabilities detected');
    }
    
    process.exit(0);
  }
}

// スクリプト実行
main();
