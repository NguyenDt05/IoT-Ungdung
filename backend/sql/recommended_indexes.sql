-- Run these once only if equivalent indexes do not already exist.
-- They support latest-reading, history, and timeout queries.
CREATE INDEX idx_data_sensor_sensor_created
  ON data_sensor (sensor_id, created_at, data_id);

CREATE INDEX idx_data_sensor_created
  ON data_sensor (created_at, data_id);

CREATE INDEX idx_action_history_status_created
  ON action_history (status, created_at);

CREATE INDEX idx_action_history_device_created
  ON action_history (device_id, created_at, action_id);
