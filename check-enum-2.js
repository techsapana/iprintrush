const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'iprintrush' });
  const [enumRows] = await conn.query("SHOW COLUMNS FROM orders LIKE 'workflow_status'");
  console.log("Original ENUM definition:");
  console.log(enumRows[0].Type);
  
  const [dataRows] = await conn.query("SELECT DISTINCT workflow_status FROM orders");
  console.log("\nExisting data in table:");
  console.log(dataRows);
  
  await conn.end();
}
run().catch(console.error);
