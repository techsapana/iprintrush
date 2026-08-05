const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'iprintrush',
  });
  
  try {
    await pool.query("UPDATE order_messages SET sender_type = 'customer' WHERE sender_type = 'admin' AND message IN ('Hello', 'what\\'s up')");
    console.log('Updated messages');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
