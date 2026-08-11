const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'admin123', database: 'iprintrush', port: 3306
  });
  const [rows] = await conn.query('SHOW COLUMNS FROM product_turnaround_options');
  console.log('product_turnaround_options:', rows.map(r => r.Field));
  
  const [rows2] = await conn.query('SHOW COLUMNS FROM turnaround_options');
  console.log('turnaround_options:', rows2.map(r => r.Field));
  conn.end();
}
run();
