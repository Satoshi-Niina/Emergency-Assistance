const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:takabeni@localhost:5432/maintenance'
});

client.connect();

client.query(
  `SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'emergency_flows'
   ORDER BY ordinal_position;`
).then(res => {
  console.log('emergency_flows テーブルのカラム一覧:');
  res.rows.forEach(row => {
    console.log(`${row.column_name} : ${row.data_type}`);
  });
  client.end();
}).catch(err => {
  console.error('エラー:', err);
  client.end();
}); 