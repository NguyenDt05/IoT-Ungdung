import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search,
  ChevronDown,
  Thermometer,
  Droplets,
  Sun,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from 'lucide-react'
import { fetchSensorHistory } from '../services/api'
import './sensordata.css'

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 500

const FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả cảm biến' },
  { value: 'temperature', label: 'Nhiệt độ (°C)' },
  { value: 'humidity', label: 'Độ ẩm (%)' },
  { value: 'light', label: 'Ánh sáng (Lux)' },
]

function fmtTime(timestamp) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '—'

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

function ValueBadge({ type, value, unit }) {
  const className =
    type === 'temperature' ? 'sd-value sd-value--temp' :
      type === 'humidity' ? 'sd-value sd-value--humid' :
        'sd-value sd-value--light'
  const Icon =
    type === 'temperature' ? Thermometer :
      type === 'humidity' ? Droplets : Sun

  return (
    <span className={className}>
      <Icon size={13} strokeWidth={2} />
      {value}{unit}
    </span>
  )
}

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

export default function SensorData() {
  const [search, setSearch] = useState('')
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState({ totalPages: 0, totalItems: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handler = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setPage(1)
      setKeyword(search.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(debounceTimer)
  }, [search])

  useEffect(() => {
    const controller = new AbortController()

    const loadSensorHistory = async () => {
      setLoading(true)

      try {
        const payload = await fetchSensorHistory(
          {
            page,
            limit: PAGE_SIZE,
            keyword: keyword || undefined,
            type: filter === 'all' ? undefined : filter,
          },
          controller.signal,
        )

        setRows(Array.isArray(payload.data) ? payload.data : [])
        setPagination(payload.pagination || { totalPages: 0, totalItems: 0 })
        setError(null)
      } catch (requestError) {
        if (requestError.name !== 'CanceledError' && requestError.code !== 'ERR_CANCELED') {
          setError(requestError.response?.data?.message || 'Không thể tải dữ liệu cảm biến.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadSensorHistory()
    return () => controller.abort()
  }, [filter, keyword, page])

  const totalPages = Math.max(1, Number(pagination.totalPages) || 0)
  const pages = useMemo(() => pageNumbers(page, totalPages), [page, totalPages])
  const currentLabel = FILTER_OPTIONS.find((option) => option.value === filter)?.label
    ?? FILTER_OPTIONS[0].label

  const selectFilter = (value) => {
    setFilter(value)
    setPage(1)
    setDropdownOpen(false)
  }

  return (
    <div className="page sensor-data-page">
      <div className="page-header">
        <h1 className="page-title">Dữ liệu cảm biến</h1>
        <p className="page-subtitle">Giám sát các cảm biến theo thời gian thực</p>
      </div>

      <div className="sd-toolbar">
        <div className="sd-search">
          <Search size={15} className="sd-search__icon" />
          <input
            className="sd-search__input"
            type="search"
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="sd-filter" ref={dropdownRef}>
          <button
            className="sd-filter__btn"
            onClick={() => setDropdownOpen((open) => !open)}
          >
            {currentLabel}
            <ChevronDown
              size={14}
              className={`sd-filter__chevron${dropdownOpen ? ' sd-filter__chevron--open' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="sd-filter__menu">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`sd-filter__option${filter === option.value ? ' sd-filter__option--active' : ''}`}
                  onClick={() => selectFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <div className="sd-error">⚠ {error}</div>}

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
            {loading ? (
              <tr>
                <td colSpan={4} className="sd-empty">Đang tải dữ liệu...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="sd-empty">
                  {error ? 'Không thể hiển thị dữ liệu.' : 'Không tìm thấy dữ liệu phù hợp.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td><span className="sd-id">{row.id}</span></td>
                  <td><span className="sd-name">{row.name}</span></td>
                  <td>
                    <ValueBadge type={row.type} value={row.value} unit={row.unit} />
                  </td>
                  <td>{fmtTime(row.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && pagination.totalItems > 0 && (
          <div className="sd-pagination">
            <button
              className="sd-page-btn"
              onClick={() => setPage(1)}
              disabled={page === 1}
              title="Trang đầu"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              className="sd-page-btn"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              title="Trang trước"
            >
              <ChevronLeft size={14} />
            </button>

            {pages.map((pageNumber, index) => (
              pageNumber === '…' ? (
                <span key={`ellipsis-${index}`} className="sd-page-btn sd-page-ellipsis">…</span>
              ) : (
                <button
                  key={pageNumber}
                  className={`sd-page-btn${page === pageNumber ? ' sd-page-btn--active' : ''}`}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              )
            ))}

            <button
              className="sd-page-btn"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              title="Trang sau"
            >
              <ChevronRight size={14} />
            </button>
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
