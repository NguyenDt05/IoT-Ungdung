import { useEffect, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { controlDevice } from '../../services/api'
import './dashboard.css'

/**
 * DeviceToggle – card điều khiển LED
 * Props:
 *   device           – { id, name, status: 'ON'|'OFF' }
 *   onToggleSuccess  – callback(deviceId, newStatus)
 */
export default function DeviceToggle({ device, onToggleSuccess }) {
  const [pending, setPending] = useState(null) // null | 'ON' | 'OFF'
  const [error, setError]   = useState(null)

  const isOn      = device.status === 'ON'
  const isLoading = pending !== null

  // Trạng thái hiển thị (ưu tiên pending nếu đang loading)
  const displayOn = isLoading ? pending === 'ON' : isOn

  // POST chỉ tạo bản ghi PENDING. Trạng thái xác nhận sẽ đến từ dashboard
  // polling sau khi phần cứng ACK và backend cập nhật MySQL.
  useEffect(() => {
    if (pending && device.status === pending) {
      onToggleSuccess?.(device.id, pending)
      setPending(null)
    }
  }, [device.id, device.status, onToggleSuccess, pending])

  useEffect(() => {
    if (!pending) return undefined

    const timer = setTimeout(() => {
      setPending(null)
      setError('Hết thời gian chờ phản hồi thiết bị (10s)')
    }, 10_500)

    return () => clearTimeout(timer)
  }, [pending])

  const handleToggle = async () => {
    if (isLoading) return

    const next = isOn ? 'OFF' : 'ON'
    setPending(next)
    setError(null)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8_000)

    try {
      const result = await controlDevice(device.id, next, controller.signal)
      if (result.action?.status !== 'PENDING') {
        throw new Error('Command was not accepted')
      }
    } catch (err) {
      setPending(null)
      const msg =
        err.name === 'CanceledError' || err.code === 'ERR_CANCELED'
          ? 'Hết thời gian kết nối máy chủ'
          : err.response?.data?.message || 'Lỗi điều khiển thiết bị'
      setError(msg)
      setTimeout(() => setError(null), 3000)
    } finally {
      clearTimeout(timer)
    }
  }

  /* ---- Status label ---- */
  let statusLabel = displayOn ? 'BẬT' : 'TẮT'
  let statusMod   = displayOn ? 'device-card__status--on' : 'device-card__status--off'
  if (isLoading) {
    statusLabel = pending === 'ON' ? 'BẬT...' : 'TẮT...'
    statusMod   = 'device-card__status--loading'
  }

  return (
    <div className="device-card anim-fade">
      {/* Header */}
      <div className="device-card__header">
        <Lightbulb
          size={14}
          color={isOn ? '#fbbf24' : '#d1d5db'}
          fill={isOn ? '#fbbf24' : 'none'}
        />
        <span className="device-card__name">{device.name}</span>
      </div>

      {/* Status row */}
      <div className="device-card__body">
        <span className={`device-card__status ${statusMod}`}>
          {statusLabel}
        </span>

        {/* Toggle */}
        <label className="toggle" title={isLoading ? 'Đang xử lý...' : `${displayOn ? 'Tắt' : 'Bật'} ${device.name}`}>
          <input
            type="checkbox"
            checked={displayOn}
            onChange={handleToggle}
            disabled={isLoading}
          />
          <span className={`toggle__track${isLoading ? ' toggle__track--loading' : ''}`} />
        </label>
      </div>

      {/* Error */}
      {error && (
        <p className="device-card__error">⚠ {error}</p>
      )}
    </div>
  )
}
