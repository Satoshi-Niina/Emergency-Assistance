import 'dotenv/config';
import { db } from '../db/index';
import { machineTypes, machines, users } from '../db/schema';
import bcrypt from 'bcrypt';

async function insertTestData() {
  try {
    console.log('🔧 テストデータ挿入開始...');

    // 既存のデータを確認
    const existingMachineTypes = await db.select().from(machineTypes);
    console.log('📊 既存の機種数:', existingMachineTypes.length);

    if (existingMachineTypes.length > 0) {
      console.log('⚠️ 機種データが既に存在します。スキップします。');
    } else {
      // テスト機種の挿入
      const testMachineTypes = await db.insert(machineTypes).values([
        {
          machineTypeName: '新幹線N700系'
        },
        {
          machineTypeName: '新幹線E5系'
        },
        {
          machineTypeName: '在来線E231系'
        },
        {
          machineTypeName: '在来線E233系'
        }
      ]).returning();
      console.log('✅ テスト機種挿入完了:', testMachineTypes);

      // テスト機械の挿入
      const testMachines = await db.insert(machines).values([
        {
          machineNumber: 'N700-7001',
          machineTypeId: testMachineTypes[0].id
        },
        {
          machineNumber: 'N700-7002',
          machineTypeId: testMachineTypes[0].id
        },
        {
          machineNumber: 'E5-1',
          machineTypeId: testMachineTypes[1].id
        },
        {
          machineNumber: 'E5-2',
          machineTypeId: testMachineTypes[1].id
        },
        {
          machineNumber: 'E231-1001',
          machineTypeId: testMachineTypes[2].id
        },
        {
          machineNumber: 'E233-2001',
          machineTypeId: testMachineTypes[3].id
        }
      ]).returning();
      console.log('✅ テスト機械挿入完了:', testMachines);
    }

    console.log('🎉 テストデータ挿入処理完了！');
  } catch (error) {
    console.error('❌ テストデータ挿入エラー:', error);
  } finally {
    process.exit(0);
  }
}

insertTestData(); 