-- Run once to add the second LED without changing existing device records.
INSERT INTO devices (device_name, status)
SELECT 'LED 2', 'OFF'
WHERE NOT EXISTS (
  SELECT 1
  FROM devices
  WHERE device_name = 'LED 2'
);

-- Display light readings with a percentage unit. Raw values are converted by
-- normalize_sensor_measurements.sql and by the MQTT ingestion service.
UPDATE sensors
SET unit = '%'
WHERE sensor_type = 'LIGHT';
