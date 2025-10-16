import db from '../db/db.js';

async function main(){
  try{
    const res = await db.sql`SELECT id, username, password, created_at FROM users WHERE username=${'niina'}`;
    // postgres tag returns an array-like result; log directly
    console.log('niina rows:', res);
  }catch(e){
    console.error('err', e);
    process.exit(1);
  }
}

main();
