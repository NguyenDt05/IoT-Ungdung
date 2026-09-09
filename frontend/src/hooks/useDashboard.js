import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchDashboard } from '../services/api'
import { getCurrentTimeBlock } from '../utils/timeBlocks'

const POLL_INTERVAL = 2_000
const CHART_RENDER_INTERVAL = 5_000
function createInitialState() {
  return {
    status: 'DISCONNECTED',
    connectionStatus: 'DISCONNECTED',
    sensors: { temperature: null, humidity: null, light: null },
    devices: [
      { id: 1, name: 'LED 1', status: 'OFF' },
      { id: 2, name: 'LED 2', status: 'OFF' },
    ],
    chartData: [],
    chartBlockStart: getCurrentTimeBlock().start.toISOString(),
    lastUpdated: null,
  }
}

export function useDashboard() {
  const [data, setData] = useState(createInitialState)
  const [error, setError] = useState(null)
  const requestInFlightRef = useRef(false)
  const activeBlockRef = useRef(getCurrentTimeBlock())
  const chartBufferRef = useRef([])
  const latestChartPointIdRef = useRef(0)

  const resetChartBuffer = useCallback((block) => {
    activeBlockRef.current = block
    chartBufferRef.current = []
    latestChartPointIdRef.current = 0
  }, [])

  const fetchData = useCallback(async (signal) => {
    if (requestInFlightRef.current) return
    requestInFlightRef.current = true

    try {
      const currentBlock = getCurrentTimeBlock()
      if (currentBlock.start.getTime() !== activeBlockRef.current.start.getTime()) {
        resetChartBuffer(currentBlock)
      }

      const payload = await fetchDashboard({
        chartStart: activeBlockRef.current.start.toISOString(),
        chartEnd: activeBlockRef.current.end.toISOString(),
        chartAfterId: latestChartPointIdRef.current,
      }, signal)
      const connectionStatus = payload.connectionStatus || payload.status
      const incomingPoints = Array.isArray(payload.chartData) ? payload.chartData : []

      if (incomingPoints.length > 0) {
        latestChartPointIdRef.current = Math.max(
          latestChartPointIdRef.current,
          ...incomingPoints.map((point) => Number(point.pointId) || 0),
        )
        chartBufferRef.current.push(...incomingPoints.map((point) => ({
          ...point,
          timestamp: new Date(point.createdAt).getTime(),
        })))
      }

      setData((previous) => {
        return {
          ...previous,
          ...payload,
          status: connectionStatus,
          connectionStatus,
          chartData: previous.chartData,
          chartBlockStart: previous.chartBlockStart,
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
  }, [resetChartBuffer])

  useEffect(() => {
    const controller = new AbortController()
    void fetchData(controller.signal)
    const intervalId = setInterval(() => void fetchData(controller.signal), POLL_INTERVAL)

    return () => {
      controller.abort()
      clearInterval(intervalId)
    }
  }, [fetchData])

  useEffect(() => {
    const flushChartBuffer = () => {
      const currentBlock = getCurrentTimeBlock()
      if (currentBlock.start.getTime() !== activeBlockRef.current.start.getTime()) {
        resetChartBuffer(currentBlock)
      }

      const bufferedPoints = chartBufferRef.current.splice(0)
      const blockStart = activeBlockRef.current.start.toISOString()

      setData((previous) => {
        if (previous.chartBlockStart !== blockStart) {
          return {
            ...previous,
            chartBlockStart: blockStart,
            chartData: bufferedPoints,
          }
        }

        if (bufferedPoints.length === 0) return previous

        return {
          ...previous,
          chartData: [...previous.chartData, ...bufferedPoints],
        }
      })
    }

    const delay = CHART_RENDER_INTERVAL - (Date.now() % CHART_RENDER_INTERVAL)
    let intervalId
    const timeoutId = setTimeout(() => {
      flushChartBuffer()
      intervalId = setInterval(flushChartBuffer, CHART_RENDER_INTERVAL)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [resetChartBuffer])

  return { data, error }
}
