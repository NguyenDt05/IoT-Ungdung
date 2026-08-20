require('dotenv').config();

const app = require('./app');
const { pool, verifyDatabaseConnection } = require('./config/database');
const { closeMqttClient } = require('./config/mqtt');
const { startMqttService, stopMqttService } = require('./services/mqttService');

const port = Number(process.env.PORT || 3001);
let server;
let shuttingDown = false;

async function startServer() {
  try {
    await verifyDatabaseConnection();
    console.info('[DB] MySQL connection is ready');

    startMqttService();

    server = app.listen(port, () => {
      console.info(`[HTTP] API is listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('[BOOT] Server could not start:', error);
    process.exitCode = 1;
  }
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`[BOOT] ${signal} received; shutting down...`);

  stopMqttService();

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  try {
    await closeMqttClient();
    await pool.end();
  } catch (error) {
    console.error('[BOOT] Graceful shutdown failed:', error);
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (error) => {
  console.error('[PROCESS] Unhandled promise rejection:', error);
});
process.on('uncaughtException', (error) => {
  console.error('[PROCESS] Uncaught exception:', error);
  process.exitCode = 1;
});

void startServer();
