const mysql = require('mysql2/promise');
async function run() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'admin123',
      database: 'iprintrush',
      port: 3306
    });
    console.log('Adding allowed_colors_json to product_turnaround_options...');
    try {
      await conn.query('ALTER TABLE product_turnaround_options ADD COLUMN allowed_colors_json JSON DEFAULT NULL');
      console.log('Successfully added allowed_colors_json column.');
    } catch (e) {
      if (e.message.includes('Duplicate column name')) {
        console.log('Column allowed_colors_json already exists.');
      } else {
        console.error('Error:', e);
      }
    }
    conn.end();
  } catch (error) {
    console.error('Failed to connect to db:', error);
  }
}
run();
