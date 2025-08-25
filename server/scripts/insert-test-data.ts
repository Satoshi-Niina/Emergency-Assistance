import 'dotenv/config';
import { db } from '../db/index.js';
import { machineTypes, machines, users } from '../db/schema.js';
import bcrypt from 'bcrypt';

async function insertTestData() {
  try {
    console.log('肌 繝・せ繝医ョ繝ｼ繧ｿ謖ｿ蜈･髢句ｧ・..');

    // 譌｢蟄倥・繝・・繧ｿ繧堤｢ｺ隱・
    const existingMachineTypes = await db.select().from(machineTypes);
    console.log('投 譌｢蟄倥・讖溽ｨｮ謨ｰ:', existingMachineTypes.length);

    if (existingMachineTypes.length > 0) {
      console.log('笞・・讖溽ｨｮ繝・・繧ｿ縺梧里縺ｫ蟄伜惠縺励∪縺吶ゅせ繧ｭ繝・・縺励∪縺吶・);
    } else {
      // 繝・せ繝域ｩ溽ｨｮ縺ｮ謖ｿ蜈･
      const testMachineTypes = await db.insert(machineTypes).values([
        {
          machineTypeName: '譁ｰ蟷ｹ邱哢700邉ｻ'
        },
        {
          machineTypeName: '譁ｰ蟷ｹ邱哘5邉ｻ'
        },
        {
          machineTypeName: '蝨ｨ譚･邱哘231邉ｻ'
        },
        {
          machineTypeName: '蝨ｨ譚･邱哘233邉ｻ'
        }
      ]).returning();
      console.log('笨・繝・せ繝域ｩ溽ｨｮ謖ｿ蜈･螳御ｺ・', testMachineTypes);

      // 繝・せ繝域ｩ滓｢ｰ縺ｮ謖ｿ蜈･
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
      console.log('笨・繝・せ繝域ｩ滓｢ｰ謖ｿ蜈･螳御ｺ・', testMachines);
    }

    console.log('脂 繝・せ繝医ョ繝ｼ繧ｿ謖ｿ蜈･蜃ｦ逅・ｮ御ｺ・ｼ・);
  } catch (error) {
    console.error('笶・繝・せ繝医ョ繝ｼ繧ｿ謖ｿ蜈･繧ｨ繝ｩ繝ｼ:', error);
  } finally {
    process.exit(0);
  }
}

insertTestData(); 