const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [rows] = await conn.query('SHOW COLUMNS FROM products WHERE Field = "id"');
  console.log('products.id schema:', rows[0]);
  
  const [collation] = await conn.query('SHOW FULL COLUMNS FROM products WHERE Field = "id"');
  console.log('products.id collation:', collation[0]);
  
  await conn.end();
}

check().catch(console.error);
