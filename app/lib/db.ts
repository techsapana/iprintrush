// MySQL Database Connection Utility - Typed
import mysql, { RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2/promise';

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

function isSelectQuery(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  return trimmed.startsWith('SELECT') || trimmed.startsWith('SHOW') || trimmed.startsWith('DESCRIBE') || trimmed.startsWith('EXPLAIN');
}

function isInsertQuery(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  return trimmed.startsWith('INSERT');
}

function isUpdateQuery(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  return trimmed.startsWith('UPDATE');
}

function isDeleteQuery(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  return trimmed.startsWith('DELETE');
}

async function internalQuery<T>(sql: string, params: any[] = []): Promise<T[]> {
  const [results] = await pool.query(sql, params);
  return (results as RowDataPacket[]) as T[];
}

async function internalCommand(sql: string, params: any[] = []): Promise<OkPacket | ResultSetHeader> {
  const [results] = await pool.query(sql, params);
  return results as OkPacket | ResultSetHeader;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return internalQuery<T>(sql, params);
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const results = await internalQuery<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

export async function execute<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [results] = await pool.execute(sql, params);
  return (results as RowDataPacket[]) as T[];
}

export async function executeOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const results = await execute<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

export async function runInsert(sql: string, params: any[] = []): Promise<OkPacket> {
  const result = await internalCommand(sql, params);
  return result as OkPacket;
}

export async function runUpdate(sql: string, params: any[] = []): Promise<ResultSetHeader> {
  const result = await internalCommand(sql, params);
  return result as ResultSetHeader;
}

export async function runDelete(sql: string, params: any[] = []): Promise<ResultSetHeader> {
  const result = await internalCommand(sql, params);
  return result as ResultSetHeader;
}

export async function runCommand(sql: string, params: any[] = []): Promise<OkPacket | ResultSetHeader> {
  return internalCommand(sql, params);
}

export async function beginTransaction() {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  return connection;
}

export async function commit(connection: mysql.Connection) {
  await connection.commit();
  connection.release();
}

export async function rollback(connection: mysql.Connection) {
  await connection.rollback();
  connection.release();
}

export default pool;