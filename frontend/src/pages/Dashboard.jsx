import { useDashboard } from '../hooks/useDashboard'
import StatCard         from '../components/dashboard/StatCard'
import DeviceToggle     from '../components/dashboard/DeviceToggle'
import SensorChart      from '../components/dashboard/SensorChart'
import DisconnectAlert  from '../components/dashboard/ConnectionBanner'

export default function Dashboard() {
  const { data, error, updateDeviceStatus } = useDashboard()
  const { status, sensors, devices, chartData, lastUpdated } = data

  return (
    <div className="page dashboard-page">
      {/* ── Page heading ── */}
      <div className="page-header">
        <h1 className="page-title">
          Trang chủ
        </h1>
        <p className="page-subtitle">
          Bảng điều khiển tổng quan
        </p>
      </div>

      {/* ── Chỉ hiện cảnh báo khi DISCONNECTED ── */}
      {status === 'DISCONNECTED' && (
        <DisconnectAlert status={status} lastUpdated={lastUpdated} />
      )}

      {/* ── Server error ── */}
      {error && (
        <div className="dashboard-error">
          ⚠ {error}
        </div>
      )}

      {/* ── Row 1: Stat Cards ── */}
      <div className="dashboard-grid dashboard-grid--stats">
        <StatCard
          title="Cảm biến nhiệt độ"
          value={sensors.temperature}
          unit="°C"
          color="green"
          status={status}
        />
        <StatCard
          title="Cảm biến ánh sáng"
          value={sensors.light}
          unit="Lux"
          color="yellow"
          status={status}
        />
        <StatCard
          title="Cảm biến độ ẩm"
          value={sensors.humidity}
          unit="%"
          color="green"
          status={status}
        />
      </div>

      {/* ── Row 2: Device Toggles ── */}
      <div className="dashboard-grid dashboard-grid--devices">
        {devices.map((device) => (
          <DeviceToggle
            key={device.id}
            device={device}
            onToggleSuccess={updateDeviceStatus}
          />
        ))}
      </div>

      {/* ── Row 3: Chart ── */}
      <SensorChart data={chartData} />
    </div>
  )
}
