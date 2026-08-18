const mysql = require('mysql2/promise');

// A shared pool is used by HTTP handlers and MQTT consumers. mysql2 queues
// requests when every connection is busy and releases connections automatically.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'iot_smart_system',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  charset: 'utf8mb4',
  dateStrings: false,
  decimalNumbers: true,
});

async function verifyDatabaseConnection() {
  const connection = await pool.getConnection();

  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

module.exports = { pool, verifyDatabaseConnection };
