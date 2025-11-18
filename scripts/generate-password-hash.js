#!/usr/bin/env node

/**
 * bcrypt パスワードハッシュ生成ツール
 *
 * 使用方法:
 *   node scripts/generate-password-hash.js <password>
 *
 * 例:
 *   node scripts/generate-password-hash.js admin
 */

import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
    console.error('❌ エラー: パスワードを指定してください');
    console.log('\n使用方法:');
    console.log('  node scripts/generate-password-hash.js <password>');
    console.log('\n例:');
    console.log('  node scripts/generate-password-hash.js admin');
    process.exit(1);
}

console.log('🔐 パスワードハッシュ生成中...\n');

// saltRounds = 10（本番環境と同じ）
const saltRounds = 10;
const hash = bcrypt.hashSync(password, saltRounds);

console.log('✅ ハッシュ生成完了\n');
console.log('元のパスワード:', password);
console.log('ハッシュ値:', hash);
console.log('\nSQL挿入例:');
console.log(`INSERT INTO users (username, password, display_name, role, department)`);
console.log(`VALUES ('admin', '${hash}', '管理者', 'admin', 'システム管理');`);
console.log('\n検証:');

// 検証
const isValid = bcrypt.compareSync(password, hash);
console.log('検証結果:', isValid ? '✅ 一致' : '❌ 不一致');
