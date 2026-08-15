const mysql = require('mysql2/promise');
const { readFileSync } = require('fs');

const envFile = readFileSync('d:/iprintrush/.env', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) envVars[match[1]] = match[2];
});

async function run() {
  try {
    const pool = mysql.createPool({ 
      host: envVars.DB_HOST || 'localhost', 
      user: envVars.DB_USER || 'root', 
      password: envVars.DB_PASSWORD || '', 
      database: envVars.DB_NAME || 'iprintrush' 
    });
    
    // Add columns manually
    const columns = [
      ['weekend_opening_time', 'VARCHAR(64) NULL'],
      ['weekend_closing_time', 'VARCHAR(64) NULL'],
    ];
    for (const [name, ddl] of columns) {
      const [col] = await pool.query(`SHOW COLUMNS FROM site_settings LIKE '${name}'`);
      if (col.length === 0) {
        console.log('Adding column', name);
        await pool.query(`ALTER TABLE site_settings ADD COLUMN ${name} ${ddl}`);
      } else {
        console.log('Column already exists', name);
      }
    }
    
    console.log('Done migrating site_settings!');
    pool.end();
  } catch(e) {
    console.error('Error:', e);
  }
}
run();
