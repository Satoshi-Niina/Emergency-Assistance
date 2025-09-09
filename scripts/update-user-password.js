#!/usr/bin/env node
/**
 * 単一ユーザーのパスワード更新ユーティリティ
 * 使い方 (PowerShell 例):
 *   $env:DATABASE_URL="<your database url>"; node scripts/update-user-password.js niina "NewPass1!"
 *
 * パスワードポリシー: 大文字/小文字/数字/記号 各1 + 8文字以上
 * 成功時に対象ユーザーの username と role を表示します。
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Client } from 'pg';

const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

async function run() {
	const [,, username, rawPassword] = process.argv;
	if (!username || !rawPassword) {
		console.error('Usage: node scripts/update-user-password.js <username> <newPassword>');
		process.exit(1);
	}
	if (!passwordPolicy.test(rawPassword)) {
		console.error('❌ パスワードがポリシー不適合です');
		process.exit(1);
	}
	const dbUrl = process.env.DATABASE_URL;
	if (!dbUrl) {
		console.error('DATABASE_URL 未設定');
		process.exit(1);
	}
	const client = new Client({ connectionString: dbUrl });
	await client.connect();
	try {
		const hashed = await bcrypt.hash(rawPassword, 10);
		const res = await client.query('UPDATE users SET password=$1, updated_at=NOW() WHERE username=$2 RETURNING username, role', [hashed, username]);
		if (res.rowCount === 0) {
			console.error('⚠️ 指定ユーザーが存在しません:', username);
			process.exit(2);
		}
		console.log('✅ 更新完了:', res.rows[0]);
	} finally {
		await client.end();
	}
}

run().catch(e => {
	console.error('❌ エラー:', e);
	process.exit(99);
});
