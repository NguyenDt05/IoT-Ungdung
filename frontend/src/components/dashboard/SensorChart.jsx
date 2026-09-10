import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatSensorValue } from '../../utils/formatters'
import { formatChartTime, getMinuteTicks } from '../../utils/timeBlocks'
import './dashboard.css'

const OPTIONS = [
  { value: 'all', label: 'Tất cả cảm biến' },
  { value: 'temperature', label: 'Nhiệt độ (°C)' },
  { value: 'humidity', label: 'Độ ẩm (%)' },
  { value: 'light', label: 'Ánh sáng (%)' },
]

const SERIES = [
  { key: 'temperature', name: 'Nhiệt độ', unit: '°C', color: '#cf615b' },
  { key: 'humidity', name: 'Độ ẩm', unit: '%', color: '#1f7a5b' },
  { key: 'light', name: 'Ánh sáng', unit: '%', color: '#c88a2e' },
]

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{formatChartTime(label, true)}</p>
      {SERIES.map((series) => {
        const point = payload.find((item) => item.dataKey === series.key)
        if (point?.value === null || point?.value === undefined) return null

        return (
          <p key={series.key} className="chart-tooltip__value" style={{ color: series.color }}>
            {series.name}: <span style={{ fontWeight: 700 }}>{formatSensorValue(point.value)} {series.unit}</span>
          </p>
        )
      })}
    </div>
  )
}

function ChartLegend({ payload }) {
  return (
    <div className="chart-legend">
      {payload.map((entry) => (
        <span key={entry.dataKey} className="chart-legend__item">
          <span className="chart-legend__line" style={{ background: entry.color }} />
          <span className="chart-legend__dot" style={{ background: entry.color }} />
          {entry.value}
        </span>
      ))}
    </div>
  )
}

function SensorChart({ data = [], blockStart }) {
  const [selected, setSelected] = useState('all')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const blockStartTime = new Date(blockStart).getTime()
  const blockEndTime = blockStartTime + (5 * 60 * 1000)
  const minuteTicks = useMemo(() => getMinuteTicks(blockStart), [blockStart])
  const currentLabel = OPTIONS.find((option) => option.value === selected)?.label ?? OPTIONS[0].label
  const hasData = data.some((point) => SERIES.some((series) => point[series.key] !== null && point[series.key] !== undefined))

  useEffect(() => {
    const closeDropdown = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', closeDropdown)
    return () => document.removeEventListener('mousedown', closeDropdown)
  }, [])

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <h2 className="chart-card__title">Cảm biến theo thời gian</h2>

        <div className="chart-dropdown" ref={dropdownRef}>
          <button className="chart-dropdown__btn" onClick={() => setDropdownOpen((open) => !open)}>
            {currentLabel}
            <ChevronDown
              size={13}
              className={`chart-dropdown__chevron${dropdownOpen ? ' chart-dropdown__chevron--open' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="chart-dropdown__menu">
              {OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`chart-dropdown__option${selected === option.value ? ' chart-dropdown__option--active' : ''}`}
                  onClick={() => {
                    setSelected(option.value)
                    setDropdownOpen(false)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="chart-card__body">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 4" stroke="#e8ece9" vertical={false} />
            <XAxis
              type="number"
              dataKey="timestamp"
              domain={[blockStartTime, blockEndTime]}
              ticks={minuteTicks}
              tickFormatter={(value) => formatChartTime(value)}
              tick={{ fontSize: 10.5, fill: '#88928c', fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              dy={6}
            />
            <YAxis
              yAxisId="scale"
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              label={{ value: '% / °C', angle: -90, position: 'insideLeft', fill: '#88928c', fontSize: 10 }}
              tick={{ fontSize: 10.5, fill: '#88928c', fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <YAxis
              yAxisId="scale-right"
              orientation="right"
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              label={{ value: '% / °C', angle: 90, position: 'insideRight', fill: '#88928c', fontSize: 10 }}
              tick={{ fontSize: 10.5, fill: '#88928c', fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#a4ada7', strokeWidth: 1 }} />
            <Legend content={<ChartLegend />} />

            {SERIES.map((series) => (
              <Line
                key={series.key}
                yAxisId="scale"
                type="monotone"
                dataKey={series.key}
                name={series.name}
                stroke={series.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
                connectNulls={false}
                hide={selected !== 'all' && selected !== series.key}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {!hasData && <p className="chart-empty">Đang chờ dữ liệu từ thiết bị...</p>}
      </div>

      <p className="chart-unit-note">{formatChartTime(blockStartTime)} – {formatChartTime(blockEndTime)}</p>
    </div>
  )
}

export default memo(SensorChart)
