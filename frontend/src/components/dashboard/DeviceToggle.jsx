import { useEffect, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { controlDevice } from '../../services/api'
import './dashboard.css'

const REQUEST_TIMEOUT_MS = 8_000
const DEVICE_RESPONSE_TIMEOUT_MS = 10_500

export default function DeviceToggle({ device }) {
  const [pendingCommand, setPendingCommand] = useState(null)
  const [error, setError] = useState(null)
  const isOn = device.status === 'ON'
  const isLoading = pendingCommand !== null
  const displayOn = isLoading ? pendingCommand === 'ON' : isOn

  useEffect(() => {
    if (pendingCommand && device.status === pendingCommand) {
      setPendingCommand(null)
    }
  }, [device.status, pendingCommand])

  useEffect(() => {
    if (!pendingCommand) return undefined

    const timeoutId = setTimeout(() => {
      setPendingCommand(null)
      setError('Hết thời gian chờ phản hồi thiết bị (10s)')
    }, DEVICE_RESPONSE_TIMEOUT_MS)

    return () => clearTimeout(timeoutId)
  }, [pendingCommand])

  const handleToggle = async () => {
    if (isLoading) return

    const command = isOn ? 'OFF' : 'ON'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    setPendingCommand(command)
    setError(null)

    try {
      const result = await controlDevice(device.id, command, controller.signal)

      if (result.action?.status !== 'PENDING') {
        throw new Error('Command was not accepted')
      }
    } catch (requestError) {
      setPendingCommand(null)
      const message = requestError.name === 'CanceledError' || requestError.code === 'ERR_CANCELED'
        ? 'Hết thời gian kết nối máy chủ'
        : requestError.response?.data?.message || 'Lỗi điều khiển thiết bị'

      setError(message)
      setTimeout(() => setError(null), 3_000)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const statusLabel = isLoading ? `${displayOn ? 'BẬT' : 'TẮT'}...` : displayOn ? 'BẬT' : 'TẮT'
  const statusClass = isLoading
    ? 'device-card__status--loading'
    : displayOn ? 'device-card__status--on' : 'device-card__status--off'

  return (
    <div className="device-card">
      <div className="device-card__header">
        <Lightbulb
          size={14}
          color={isOn ? '#fbbf24' : '#d1d5db'}
          fill={isOn ? '#fbbf24' : 'none'}
        />
        <span className="device-card__name">{device.name}</span>
      </div>

      <div className="device-card__body">
        <span className={`device-card__status ${statusClass}`}>{statusLabel}</span>
        <label className="toggle" title={isLoading ? 'Đang xử lý...' : `${displayOn ? 'Tắt' : 'Bật'} ${device.name}`}>
          <input type="checkbox" checked={displayOn} onChange={handleToggle} disabled={isLoading} />
          <span className={`toggle__track${isLoading ? ' toggle__track--loading' : ''}`} />
        </label>
      </div>

      {error && <p className="device-card__error">⚠ {error}</p>}
    </div>
  )
}
