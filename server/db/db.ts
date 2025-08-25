import postgres from 'postgres';

// 繝・・繧ｿ繝吶・繧ｹ謗･邯夊ｨｭ螳・- DATABASE_URL縺ｮ縺ｿ繧剃ｽｿ逕ｨ
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/emergency_assistance', { // 菴ｿ逕ｨ荳ｭ: 繝・・繧ｿ繝吶・繧ｹ謗･邯壽枚蟄怜・
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // 菴ｿ逕ｨ荳ｭ: 迺ｰ蠅・愛蛻･
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export { sql };

// 繧ｯ繧ｨ繝ｪ螳溯｡碁未謨ｰ
export const query = async (text: string, params?: any[]): Promise<any> => {
  try {
    const result = await sql.unsafe(text, params);
    return result;
  } catch (error) {
    console.error('笶・繧ｯ繧ｨ繝ｪ螳溯｡後お繝ｩ繝ｼ:', error);
    throw error;
  }
};

// 繝医Λ繝ｳ繧ｶ繧ｯ繧ｷ繝ｧ繝ｳ螳溯｡碁未謨ｰ
export const transaction = async (callback: (client: any) => Promise<any>): Promise<any> => {
  try {
    return await sql.begin(async (tx) => {
      return await callback(tx);
    });
  } catch (error) {
    console.error('笶・繝医Λ繝ｳ繧ｶ繧ｯ繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ:', error);
    throw error;
  }
};

// 謗･邯壹・繝ｼ繝ｫ繧帝哩縺倥ｋ髢｢謨ｰ
export const closePool = async (): Promise<void> => {
  await sql.end();
};

// 繝・・繧ｿ繝吶・繧ｹ謗･邯壹ユ繧ｹ繝・
export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await query('SELECT NOW()');
    console.log('笨・繝・・繧ｿ繝吶・繧ｹ謗･邯壹ユ繧ｹ繝域・蜉・', result[0]);
    return true;
  } catch (error) {
    console.error('笶・繝・・繧ｿ繝吶・繧ｹ謗･邯壹ユ繧ｹ繝亥､ｱ謨・', error);
    return false;
  }
};

// 繝・ヵ繧ｩ繝ｫ繝医お繧ｯ繧ｹ繝昴・繝・
export default {
  query,
  transaction,
  closePool,
  testConnection,
  sql
}; 