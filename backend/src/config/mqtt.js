const mqtt = require('mqtt');

let client;

function getMqttClient() {
  if (client) return client;

  const options = {
    clientId: `${process.env.MQTT_CLIENT_ID || 'iot-backend'}-${process.pid}`,
    clean: true,
    reconnectPeriod: 2_000,
    connectTimeout: 10_000,
  };

  if (process.env.MQTT_USERNAME) options.username = process.env.MQTT_USERNAME;
  if (process.env.MQTT_PASSWORD) options.password = process.env.MQTT_PASSWORD;

  client = mqtt.connect(process.env.MQTT_URL || 'mqtt://localhost:1883', options);
  return client;
}

async function closeMqttClient() {
  if (!client) return;

  const activeClient = client;
  client = undefined;

  await new Promise((resolve) => {
    activeClient.end(false, {}, resolve);
  });
}

module.exports = { getMqttClient, closeMqttClient };
