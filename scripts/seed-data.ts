#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { users, chats, messages, emergencyFlows } from '../shared/schema.js';
import bcrypt from 'bcrypt';

// 環境変数の読み込み
dotenv.config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🚀 Starting database seeding...');

  try {
    // PostgreSQL接続の作成
    const sql = postgres(databaseUrl, { max: 1 });
    const db = drizzle(sql);

    // 既存データの確認
    const existingUsers = await db.select().from(users);
    const existingFlows = await db.select().from(emergencyFlows);

    console.log(`📊 Found ${existingUsers.length} existing users`);
    console.log(`📊 Found ${existingFlows.length} existing emergency flows`);

    // デフォルトユーザーの作成
    if (existingUsers.length === 0) {
      console.log('👥 Creating default users...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const defaultUsers = [
        {
          username: 'admin',
          password: hashedPassword,
          display_name: 'システム管理者',
          role: 'admin',
          department: 'IT'
        },
        {
          username: 'operator',
          password: hashedPassword,
          display_name: 'オペレーター',
          role: 'employee',
          department: '運営'
        },
        {
          username: 'user',
          password: hashedPassword,
          display_name: '一般ユーザー',
          role: 'employee',
          department: '一般'
        }
      ];

      for (const user of defaultUsers) {
        await db.insert(users).values(user);
        console.log(`✅ Created user: ${user.username}`);
      }
    }

    // デフォルトの緊急フローの作成
    if (existingFlows.length === 0) {
      console.log('🚨 Creating default emergency flows...');
      
      const defaultFlows = [
        {
          title: '機械故障時の基本対応',
          description: '機械故障が発生した際の基本的な対応手順',
          steps: [
            {
              id: '1',
              title: '安全確認',
              description: '作業員の安全を最優先に確認する',
              type: 'decision',
              options: [
                { text: '安全', nextStep: '2' },
                { text: '危険', nextStep: 'emergency' }
              ]
            },
            {
              id: '2',
              title: '故障箇所の特定',
              description: '故障の原因と箇所を特定する',
              type: 'action',
              nextStep: '3'
            },
            {
              id: '3',
              title: '応急処置',
              description: '必要に応じて応急処置を実施する',
              type: 'action',
              nextStep: '4'
            },
            {
              id: '4',
              title: '専門家への連絡',
              description: '必要に応じて専門家に連絡する',
              type: 'end'
            }
          ],
          keyword: '機械故障 対応 手順',
          category: '機械'
        },
        {
          title: 'システムエラー時の対応',
          description: 'システムエラーが発生した際の対応手順',
          steps: [
            {
              id: '1',
              title: 'エラーメッセージの確認',
              description: 'エラーメッセージの内容を確認する',
              type: 'action',
              nextStep: '2'
            },
            {
              id: '2',
              title: 'ログの確認',
              description: 'システムログを確認して原因を特定する',
              type: 'action',
              nextStep: '3'
            },
            {
              id: '3',
              title: '再起動の検討',
              description: '必要に応じてシステムの再起動を検討する',
              type: 'decision',
              options: [
                { text: '再起動する', nextStep: '4' },
                { text: '再起動しない', nextStep: '5' }
              ]
            },
            {
              id: '4',
              title: 'システム再起動',
              description: 'システムを再起動する',
              type: 'action',
              nextStep: '5'
            },
            {
              id: '5',
              title: '動作確認',
              description: 'システムの動作を確認する',
              type: 'end'
            }
          ],
          keyword: 'システムエラー 対応 手順',
          category: 'システム'
        }
      ];

      for (const flow of defaultFlows) {
        await db.insert(emergencyFlows).values(flow);
        console.log(`✅ Created emergency flow: ${flow.title}`);
      }
    }

    console.log('✅ Database seeding completed successfully');
    
    // 接続を閉じる
    await sql.end();
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

main(); 