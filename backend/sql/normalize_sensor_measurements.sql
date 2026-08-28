-- Run once after backing up the database.
-- Existing light readings were stored as raw ADC values (0–1023).
UPDATE data_sensor ds
INNER JOIN sensors s ON s.sensor_id = ds.sensor_id
SET ds.value = ROUND(LEAST(100, GREATEST(0, ds.value / 1023 * 100)), 2)
WHERE s.sensor_type = 'LIGHT';

-- Keep all sensor values at two decimal places and avoid FLOAT precision noise.
ALTER TABLE data_sensor
MODIFY value DECIMAL(10, 2) NOT NULL;
