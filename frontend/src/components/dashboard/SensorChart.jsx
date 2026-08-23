import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import './dashboard.css'

/* ── Dropdown options ── */
const OPTIONS = [
  { value: 'all',         label: 'Tất cả cảm biến' },
  { value: 'temperature', label: 'Nhiệt độ (°C)'   },
  { value: 'humidity',    label: 'Độ ẩm (%)'        },
  { value: 'light',       label: 'Ánh sáng (Lux)'   },
]

/* ── Custom Tooltip ── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="chart-tooltip__value" style={{ color: p.color }}>
          {p.name}: <span style={{ fontWeight: 700 }}>{p.value}</span>
        </p>
      ))}
    </div>
  )
}

/* ── Custom Legend ── */
function ChartLegend({ payload }) {
  return (
    <div className="chart-legend">
      {payload.map((entry) => (
        <span key={entry.value} className="chart-legend__item">
          <span className="chart-legend__line" style={{ background: entry.color }} />
          <span className="chart-legend__dot" style={{ background: entry.color }} />
          {entry.value}
        </span>
      ))}
    </div>
  )
}

/**
 * SensorChart – Recharts line chart với dropdown filter
 * Props: data – mảng { time, temperature, humidity, light }
 */
export default function SensorChart({ data = [] }) {
  const [selected, setSelected]       = useState('all')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const currentLabel = OPTIONS.find((o) => o.value === selected)?.label ?? 'Tất cả cảm biến'
  const showTemp     = selected === 'all' || selected === 'temperature'
  const showHumidity = selected === 'all' || selected === 'humidity'
  const showLight    = selected === 'all' || selected === 'light'

  return (
    <div className="chart-card anim-fade">
      {/* Header */}
      <div className="chart-card__header">
        <h2 className="chart-card__title">Cảm biến theo thời gian</h2>

        {/* Dropdown */}
        <div className="chart-dropdown" ref={dropdownRef}>
          <button
            className="chart-dropdown__btn"
            onClick={() => setDropdownOpen((v) => !v)}
          >
            {currentLabel}
            <ChevronDown
              size={13}
              className={`chart-dropdown__chevron${dropdownOpen ? ' chart-dropdown__chevron--open' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="chart-dropdown__menu">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`chart-dropdown__option${selected === opt.value ? ' chart-dropdown__option--active' : ''}`}
                  onClick={() => { setSelected(opt.value); setDropdownOpen(false) }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 4" stroke="#e8ece9" vertical />

          <XAxis
            dataKey="time"
            tick={{ fontSize: 10.5, fill: '#88928c', fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            dy={6}
            interval="preserveStartEnd"
          />

          {/* Left axis: nhiệt độ + độ ẩm (0-50) */}
          <YAxis
            yAxisId="left"
            domain={[0, 50]}
            ticks={[0, 15, 25, 50]}
            tick={{ fontSize: 10.5, fill: '#88928c', fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            dx={-2}
          />

          {/* Right axis: ánh sáng */}
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 10.5, fill: '#88928c', fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            dx={2}
          />

          <Tooltip content={<ChartTooltip />} />
          <Legend content={<ChartLegend />} />

          {showTemp && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="temperature"
              name="Nhiệt độ (°C)"
              stroke="#cf615b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#cf615b', strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          )}
          {showHumidity && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="humidity"
              name="Độ ẩm (%)"
              stroke="#1f7a5b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#1f7a5b', strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          )}
          {showLight && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="light"
              name="Ánh sáng (Lux)"
              stroke="#c88a2e"
              strokeWidth={2}
              dot={{ r: 3, fill: '#c88a2e', strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      <p className="chart-unit-note">°C / %</p>
    </div>
  )
}
