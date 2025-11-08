#!/usr/bin/env node

// パスワードハッシュ化ユーティリティ
// 本番環境用ユーザーのパスワードをハッシュ化するためのスクリプト

import bcrypt from 'bcryptjs';

const users = [
  { username: 'admin', password: 'admin123' },
  { username: 'niina', password: '0077' },
  { username: 'takabeni1', password: 'Takabeni&1' },
  { username: 'takabeni2', password: 'Takaben&2' },
  { username: 'employee', password: 'employee123' }
];

console.log('🔐 パスワードハッシュ化結果:');
console.log('=====================================');

users.forEach(user => {
  const hashedPassword = bcrypt.hashSync(user.password, 10);
  console.log(`ユーザー名: ${user.username}`);
  console.log(`平文パスワード: ${user.password}`);
  console.log(`ハッシュ化パスワード: ${hashedPassword}`);
  console.log('---');
});

console.log('\n📝 SQL挿入用クエリ:');
console.log('=====================================');

users.forEach(user => {
  const hashedPassword = bcrypt.hashSync(user.password, 10);
  console.log(`('${user.username}', '${hashedPassword}', '${user.username}', '${user.username === 'admin' || user.username === 'takabeni1' ? 'admin' : 'employee'}', 'システム管理部', '${user.username}ユーザー'),`);
});

console.log('\n✅ 完了');
