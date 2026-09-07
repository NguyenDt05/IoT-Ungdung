const BLOCK_DURATION_MS = 5 * 60 * 1000

export function getCurrentTimeBlock(date = new Date()) {
  const start = new Date(date)
  start.setSeconds(0, 0)
  start.setMinutes(Math.floor(start.getMinutes() / 5) * 5)

  return {
    start,
    end: new Date(start.getTime() + BLOCK_DURATION_MS),
  }
}

export function getMinuteTicks(blockStart) {
  const start = new Date(blockStart).getTime()
  return Array.from({ length: 6 }, (_, index) => start + (index * 60 * 1000))
}

export function formatChartTime(value, includeSeconds = false) {
  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
  })
}
