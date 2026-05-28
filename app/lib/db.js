// MySQL Database Connection Utility
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'iprintrush',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Helper function to execute queries (uses query() for compatibility with bulk inserts)
export async function query(sql, params = []) {
  try {
    // Use query() instead of execute() to support bulk inserts with VALUES ?
    const [results] = await pool.query(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper function to execute prepared statements (more secure for user input)
export async function execute(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database execute error:', error);
    throw error;
  }
}

// Helper function to get a single row
export async function queryOne(sql, params = []) {
  const results = await query(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Helper function to begin a transaction
export async function beginTransaction() {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  return connection;
}

// Helper function to commit a transaction
export async function commit(connection) {
  await connection.commit();
  connection.release();
}

// Helper function to rollback a transaction
export async function rollback(connection) {
  await connection.rollback();
  connection.release();
}

export default pool;
