const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'iprintrush' });
  const [rows] = await conn.query("SHOW COLUMNS FROM orders LIKE 'workflow_status'");
  console.log(rows[0].Type);
  console.log(rows[0].Default);
  await conn.end();
}
run().catch(console.error);
