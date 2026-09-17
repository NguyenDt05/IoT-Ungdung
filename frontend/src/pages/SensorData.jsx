import { useEffect, useRef, useState } from 'react'
import {
  Search,
  ChevronDown,
  Thermometer,
  Droplets,
  Sun,
} from 'lucide-react'
import { fetchSensorHistory } from '../services/api'
import Pagination from '../components/common/Pagination'
import { formatDateTime, formatSensorValue } from '../utils/formatters'
import '../components/common/data-table.css'
import './sensordata.css'

const PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 500

const FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả cảm biến' },
  { value: 'temperature', label: 'Nhiệt độ (°C)' },
  { value: 'humidity', label: 'Độ ẩm (%)' },
  { value: 'light', label: 'Ánh sáng (%)' },
]

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
      {formatSensorValue(value)}{unit}
    </span>
  )
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

      {error && <div className="data-error">⚠ {error}</div>}

      <div className="data-card">
        <div className="data-table-header">
          <table className="data-table sd-table">
            <colgroup>
              <col style={{ width: 60 }} />
              <col />
              <col style={{ width: 160 }} />
              <col style={{ width: 200 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ width: 60 }}>ID</th>
                <th>Tên cảm biến</th>
                <th style={{ width: 160 }}>Giá trị</th>
                <th style={{ width: 200 }}>Thời gian</th>
              </tr>
            </thead>
          </table>
        </div>

        <div className="data-table-scroll">
          <table className="data-table sd-table">
            <colgroup>
              <col style={{ width: 60 }} />
              <col />
              <col style={{ width: 160 }} />
              <col style={{ width: 200 }} />
            </colgroup>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="data-empty">Đang tải dữ liệu...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="data-empty">
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
                    <td className="data-table__time">{formatDateTime(row.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <Pagination
            page={page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  )
}
