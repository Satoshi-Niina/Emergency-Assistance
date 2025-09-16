const { Client } = require('pg');

module.exports = async function (context, req) {
  // DB接続情報は local.settings.json か Azure の環境変数から取得
  const connectionString = process.env.PG_CONNECTION_STRING;
  const client = new Client({ connectionString });
  let result = { status: 'ng', error: null };
  try {
    await client.connect();
    await client.query('SELECT 1');
    result.status = 'ok';
  } catch (err) {
    result.error = err.message;
  } finally {
    await client.end();
  }
  context.res = {
    body: result,
    headers: { 'Content-Type': 'application/json' }
  };
};
