const { pool } = require('../config/database');
const { getMqttClient } = require('../config/mqtt');

const SENSOR_TOPIC = process.env.MQTT_SENSOR_TOPIC || 'sensor/data';
const CONTROL_TOPIC = process.env.MQTT_CONTROL_TOPIC || 'device/control';
const STATUS_TOPIC = process.env.MQTT_STATUS_TOPIC || 'device/status';
const MQTT_QOS = Number(process.env.MQTT_QOS || 1);
const ACTION_TIMEOUT_MS = Number(process.env.ACTION_TIMEOUT_MS || 10_000);

const actionTimers = new Map();
let expirySweep;
let serviceStarted = false;

function parseJsonMessage(buffer, topic) {
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch (error) {
    throw new Error(`Invalid JSON on topic ${topic}: ${error.message}`);
  }
}

function assertFiniteValue(value, label) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new Error(`${label} must be a finite number`);
  }
  return numericValue;
}

// Supported sensor payloads:
// {"sensorId":1,"value":28.5}
// {"readings":[{"sensorId":1,"value":28.5}, ...]}
// {"temperature":28.5,"humidity":70,"light":350}
async function normalizeSensorReadings(payload) {
  const collection = Array.isArray(payload)
    ? payload
    : payload.readings || (Array.isArray(payload.sensors) ? payload.sensors : null);

  if (collection) {
    return collection.map((reading, index) => {
      const sensorId = Number(reading.sensorId ?? reading.sensor_id);
      if (!Number.isInteger(sensorId) || sensorId < 1) {
        throw new Error(`readings[${index}].sensorId must be a positive integer`);
      }
      return {
        sensorId,
        value: assertFiniteValue(reading.value, `readings[${index}].value`),
      };
    });
  }

  if (payload.sensorId !== undefined || payload.sensor_id !== undefined) {
    const sensorId = Number(payload.sensorId ?? payload.sensor_id);
    if (!Number.isInteger(sensorId) || sensorId < 1) {
      throw new Error('sensorId must be a positive integer');
    }
    return [{ sensorId, value: assertFiniteValue(payload.value, 'value') }];
  }

  const supportedTypes = ['temperature', 'humidity', 'light'];
  const presentTypes = supportedTypes.filter((type) => payload[type] !== undefined);

  if (presentTypes.length === 0) {
    throw new Error('Sensor payload does not contain a supported reading');
  }

  const placeholders = presentTypes.map(() => '?').join(', ');
  const [sensors] = await pool.execute(
    `SELECT sensor_id AS sensorId, sensor_type AS sensorType
     FROM sensors
     WHERE sensor_type IN (${placeholders})`,
    presentTypes,
  );
  const sensorsByType = new Map(sensors.map((sensor) => [sensor.sensorType, sensor.sensorId]));

  return presentTypes.map((type) => {
    if (!sensorsByType.has(type)) {
      throw new Error(`No sensor is configured with sensor_type=${type}`);
    }
    const rawValue = typeof payload[type] === 'object'
      ? payload[type]?.value
      : payload[type];
    return {
      sensorId: sensorsByType.get(type),
      value: assertFiniteValue(rawValue, type),
    };
  });
}

async function saveSensorData(payload) {
  const readings = await normalizeSensorReadings(payload);
  if (readings.length === 0) return;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const reading of readings) {
      await connection.execute(
        `INSERT INTO data_sensor (sensor_id, value, created_at)
         VALUES (?, ?, NOW())`,
        [reading.sensorId, reading.value],
      );
    }

    await connection.commit();
    console.info(`[MQTT] Stored ${readings.length} sensor reading(s)`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function clearActionTimeout(actionId) {
  const timer = actionTimers.get(Number(actionId));
  if (timer) clearTimeout(timer);
  actionTimers.delete(Number(actionId));
}

async function markActionFailed(actionId) {
  const [result] = await pool.execute(
    `UPDATE action_history
     SET status = 'FAILED'
     WHERE action_id = ? AND status = 'PENDING'`,
    [actionId],
  );

  if (result.affectedRows > 0) {
    console.warn(`[MQTT] Action ${actionId} timed out or could not be published`);
  }

  return result.affectedRows > 0;
}

function scheduleActionTimeout(actionId) {
  clearActionTimeout(actionId);

  const timer = setTimeout(async () => {
    actionTimers.delete(Number(actionId));
    try {
      await markActionFailed(actionId);
    } catch (error) {
      console.error(`[MQTT] Could not fail action ${actionId}:`, error);
    }
  }, ACTION_TIMEOUT_MS);

  // The process can still stop gracefully if only timeout handles remain.
  timer.unref?.();
  actionTimers.set(Number(actionId), timer);
}

async function handleDeviceAcknowledgement(payload) {
  const actionId = Number(payload.actionId ?? payload.action_id);
  const deviceId = Number(payload.deviceId ?? payload.device_id);
  const acknowledgedState = String(payload.status ?? payload.command ?? '').toUpperCase();

  if (!Number.isInteger(actionId) || actionId < 1) {
    throw new Error('Device acknowledgement requires a valid actionId');
  }
  if (!Number.isInteger(deviceId) || deviceId < 1) {
    throw new Error('Device acknowledgement requires a valid deviceId');
  }
  if (!['ON', 'OFF'].includes(acknowledgedState)) {
    throw new Error('Device acknowledgement status must be ON or OFF');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [actions] = await connection.execute(
      `SELECT action_id, device_id, action, status
       FROM action_history
       WHERE action_id = ?
       FOR UPDATE`,
      [actionId],
    );

    if (actions.length === 0) {
      console.warn(`[MQTT] Ignored acknowledgement for unknown action ${actionId}`);
      await connection.rollback();
      return;
    }

    const action = actions[0];

    // A late/duplicate ACK must never revive a FAILED or already completed row.
    if (action.status !== 'PENDING') {
      console.warn(`[MQTT] Ignored ${action.status} action ${actionId} acknowledgement`);
      await connection.rollback();
      clearActionTimeout(actionId);
      return;
    }

    if (Number(action.device_id) !== deviceId || action.action !== acknowledgedState) {
      console.warn(`[MQTT] Ignored mismatched acknowledgement for action ${actionId}`);
      await connection.rollback();
      return;
    }

    await connection.execute(
      `UPDATE action_history
       SET status = 'SUCCESS'
       WHERE action_id = ? AND status = 'PENDING'`,
      [actionId],
    );
    await connection.execute(
      `UPDATE devices
       SET status = ?, updated_at = NOW()
       WHERE device_id = ?`,
      [action.action, action.device_id],
    );

    await connection.commit();
    clearActionTimeout(actionId);
    console.info(`[MQTT] Action ${actionId} completed successfully`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function handleMessage(topic, buffer) {
  try {
    const payload = parseJsonMessage(buffer, topic);

    if (topic === SENSOR_TOPIC) {
      await saveSensorData(payload);
      return;
    }

    if (topic === STATUS_TOPIC) {
      await handleDeviceAcknowledgement(payload);
    }
  } catch (error) {
    // Bad hardware messages are isolated so one invalid packet cannot crash BE.
    console.error(`[MQTT] Message handling failed on ${topic}:`, error.message);
  }
}

async function failExpiredActions() {
  try {
    const timeoutSeconds = Math.ceil(ACTION_TIMEOUT_MS / 1_000);
    const [result] = await pool.execute(
      `UPDATE action_history
       SET status = 'FAILED'
       WHERE status = 'PENDING'
         AND TIMESTAMPDIFF(SECOND, created_at, NOW()) >= ?`,
      [timeoutSeconds],
    );

    if (result.affectedRows > 0) {
      console.warn(`[MQTT] Recovery sweep failed ${result.affectedRows} expired action(s)`);
    }
  } catch (error) {
    console.error('[MQTT] Expired action sweep failed:', error);
  }
}

function startMqttService() {
  if (serviceStarted) return getMqttClient();
  serviceStarted = true;

  const client = getMqttClient();

  client.on('connect', () => {
    console.info('[MQTT] Connected to broker');
    client.subscribe(
      {
        [SENSOR_TOPIC]: { qos: MQTT_QOS },
        [STATUS_TOPIC]: { qos: MQTT_QOS },
      },
      (error) => {
        if (error) console.error('[MQTT] Subscription failed:', error);
        else console.info(`[MQTT] Subscribed to ${SENSOR_TOPIC}, ${STATUS_TOPIC}`);
      },
    );
  });

  client.on('reconnect', () => console.warn('[MQTT] Reconnecting to broker...'));
  client.on('offline', () => console.warn('[MQTT] Broker connection is offline'));
  client.on('error', (error) => console.error('[MQTT] Client error:', error.message));
  client.on('message', (topic, buffer) => {
    void handleMessage(topic, buffer);
  });

  // Recovery for PENDING rows left by a previous process and a fallback for
  // in-memory timers. Running every second keeps the effective timeout near 10s.
  void failExpiredActions();
  expirySweep = setInterval(failExpiredActions, 1_000);
  expirySweep.unref?.();

  return client;
}

function publishDeviceCommand(command) {
  const client = getMqttClient();

  if (!client.connected) {
    return Promise.reject(new Error('MQTT broker is not connected'));
  }

  const message = JSON.stringify(command);
  return new Promise((resolve, reject) => {
    client.publish(CONTROL_TOPIC, message, { qos: MQTT_QOS, retain: false }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function stopMqttService() {
  if (expirySweep) clearInterval(expirySweep);
  expirySweep = undefined;
  for (const timer of actionTimers.values()) clearTimeout(timer);
  actionTimers.clear();
  serviceStarted = false;
}

module.exports = {
  startMqttService,
  stopMqttService,
  publishDeviceCommand,
  scheduleActionTimeout,
  clearActionTimeout,
  markActionFailed,
  // Exported to make integration/unit tests possible without a real broker.
  handleMessage,
  handleDeviceAcknowledgement,
  saveSensorData,
};
