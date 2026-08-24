import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Search, ChevronDown, Thermometer, Droplets, Sun,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight
} from 'lucide-react'
import './sensordata.css'

/* ─────────────────────────────────────────────────────────────
   Mock data – 50 bản ghi, mô phỏng dữ liệu thực tế từ BE
   Cấu trúc: { id, type, name, value, unit, timestamp }
──────────────────────────────────────────────────────────────── */
function buildMockData() {
  const TYPES = [
    { type: 'temp', name: 'Cảm biến nhiệt độ', unit: '°C', min: 28, max: 37 },
    { type: 'humid', name: 'Cảm biến độ ẩm', unit: '%', min: 24, max: 36 },
    { type: 'light', name: 'Cảm biến ánh sáng', unit: 'Lux', min: 8, max: 32 },
  ]
  const rows = []
  const now = Date.now()

  for (let i = 0; i < 50; i++) {
    const sensor = TYPES[i % TYPES.length]
    const value = +(sensor.min + Math.random() * (sensor.max - sensor.min)).toFixed(1)
    const ts = new Date(now - i * 90_000) // mỗi bản ghi cách nhau 1.5 phút
    rows.push({
      id: i + 1,
      type: sensor.type,
      name: sensor.name,
      value,
      unit: sensor.unit,
      timestamp: ts,
    })
  }
  return rows
}

const ALL_DATA = buildMockData()

const FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả cảm biến' },
  { value: 'temp', label: 'Nhiệt độ (°C)' },
  { value: 'humid', label: 'Độ ẩm (%)' },
  { value: 'light', label: 'Ánh sáng (Lux)' },
]

const PAGE_SIZE = 10

/* ── Format timestamp ── */
function fmtTime(ts) {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const YY = d.getFullYear()
  return `${hh}:${mm}:${ss} ${DD}/${MM}/${YY}`
}

/* ── Value badge ── */
function ValueBadge({ type, value, unit }) {
  const cls =
    type === 'temp' ? 'sd-value sd-value--temp' :
      type === 'humid' ? 'sd-value sd-value--humid' :
        'sd-value sd-value--light'
  const Icon =
    type === 'temp' ? Thermometer :
      type === 'humid' ? Droplets : Sun

  return (
    <span className={cls}>
      <Icon size={13} strokeWidth={2} />
      {value}{unit}
    </span>
  )
}

/* ── Pagination helper ── */
function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

/* ═══════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════ */
export default function SensorData() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* Reset to page 1 whenever search/filter changes */
  useEffect(() => { setPage(1) }, [search, filter])

  /* Filtered + searched rows */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ALL_DATA.filter((row) => {
      const matchType = filter === 'all' || row.type === filter
      const matchSearch = !q || row.name.toLowerCase().includes(q) ||
        String(row.id).includes(q) ||
        String(row.value).includes(q)
      return matchType && matchSearch
    })
  }, [search, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pages = pageNumbers(page, totalPages)

  const currentLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? 'Tất cả cảm biến'

  return (
    <div className="page sensor-data-page">
      {/* ── Heading ── */}
      <div className="page-header">
        <h1 className="page-title">
          Dữ liệu cảm biến
        </h1>
        <p className="page-subtitle">
          Giám sát các cảm biến theo thời gian thực
        </p>
      </div>

      {/* ── Toolbar: Search + Filter ── */}
      <div className="sd-toolbar">
        {/* Search */}
        <div className="sd-search">
          <Search size={15} className="sd-search__icon" />
          <input
            className="sd-search__input"
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter dropdown */}
        <div className="sd-filter" ref={dropdownRef}>
          <button
            className="sd-filter__btn"
            onClick={() => setDropdownOpen((v) => !v)}
          >
            {currentLabel}
            <ChevronDown
              size={14}
              className={`sd-filter__chevron${dropdownOpen ? ' sd-filter__chevron--open' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="sd-filter__menu">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`sd-filter__option${filter === opt.value ? ' sd-filter__option--active' : ''}`}
                  onClick={() => { setFilter(opt.value); setDropdownOpen(false) }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="sd-card">
        <table className="sd-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>ID</th>
              <th>Tên cảm biến</th>
              <th style={{ width: 160 }}>Giá trị</th>
              <th style={{ width: 200 }}>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={4} className="sd-empty">
                  Không tìm thấy dữ liệu phù hợp
                </td>
              </tr>
            ) : (
              pageData.map((row) => (
                <tr key={row.id}>
                  <td><span className="sd-id">{row.id}</span></td>
                  <td><span className="sd-name">{row.name}</span></td>
                  <td>
                    <ValueBadge type={row.type} value={row.value} unit={row.unit} />
                  </td>
                  <td>{fmtTime(row.timestamp)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="sd-pagination">
            {/* First */}
            <button
              className="sd-page-btn"
              onClick={() => setPage(1)}
              disabled={page === 1}
              title="Trang đầu"
            >
              <ChevronsLeft size={14} />
            </button>
            {/* Prev */}
            <button
              className="sd-page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              title="Trang trước"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Page numbers */}
            {pages.map((p, idx) =>
              p === '…' ? (
                <span key={`ellipsis-${idx}`} className="sd-page-btn" style={{ cursor: 'default' }}>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  className={`sd-page-btn${page === p ? ' sd-page-btn--active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              )
            )}

            {/* Next */}
            <button
              className="sd-page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              title="Trang sau"
            >
              <ChevronRight size={14} />
            </button>
            {/* Last */}
            <button
              className="sd-page-btn"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              title="Trang cuối"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
