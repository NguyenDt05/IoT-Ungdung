import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchDashboard } from '../services/api'

const POLL_INTERVAL = 2_000
const CHART_MAX_POINTS = 20

const INITIAL_STATE = {
  status: 'DISCONNECTED',
  connectionStatus: 'DISCONNECTED',
  sensors: { temperature: null, humidity: null, light: null },
  devices: [],
  chartData: [],
  lastUpdated: null,
}

function formatTime(value) {
  const date = value ? new Date(value) : new Date()
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export function useDashboard() {
  const [data, setData] = useState(INITIAL_STATE)
  const [error, setError] = useState(null)
  const lastReadingAtRef = useRef(null)
  const requestInFlightRef = useRef(false)

  const fetchData = useCallback(async (signal) => {
    if (requestInFlightRef.current) return
    requestInFlightRef.current = true

    try {
      const payload = await fetchDashboard(signal)
      const connectionStatus = payload.connectionStatus || payload.status

      setData((previous) => {
        let chartData = previous.chartData

        if (payload.lastUpdated && payload.lastUpdated !== lastReadingAtRef.current) {
          lastReadingAtRef.current = payload.lastUpdated
          chartData = [
            ...previous.chartData.slice(-(CHART_MAX_POINTS - 1)),
            {
              time: formatTime(payload.lastUpdated),
              temperature: payload.sensors?.temperature ?? null,
              humidity: payload.sensors?.humidity ?? null,
              light: payload.sensors?.light ?? null,
            },
          ]
        }

        return {
          ...previous,
          ...payload,
          status: connectionStatus,
          connectionStatus,
          chartData,
        }
      })
      setError(null)
    } catch (requestError) {
      if (requestError.name !== 'CanceledError' && requestError.code !== 'ERR_CANCELED') {
        setError('Không thể kết nối đến máy chủ.')
        setData((previous) => ({
          ...previous,
          status: 'DISCONNECTED',
          connectionStatus: 'DISCONNECTED',
        }))
      }
    } finally {
      requestInFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void fetchData(controller.signal)
    const intervalId = setInterval(() => void fetchData(controller.signal), POLL_INTERVAL)

    return () => {
      controller.abort()
      clearInterval(intervalId)
    }
  }, [fetchData])

  const updateDeviceStatus = useCallback((deviceId, newStatus) => {
    setData((previous) => ({
      ...previous,
      devices: previous.devices.map((device) => (
        device.id === deviceId ? { ...device, status: newStatus } : device
      )),
    }))
  }, [])

  return { data, error, updateDeviceStatus }
}
