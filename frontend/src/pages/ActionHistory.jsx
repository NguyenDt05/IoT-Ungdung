import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from 'lucide-react'
import { fetchActionHistory } from '../services/api'
import './actionhistory.css'

const PAGE_SIZE = 10
const REFRESH_INTERVAL = 2_000
const SEARCH_DEBOUNCE_MS = 500

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

const STATUS_MAP = {
  SUCCESS: { label: 'Success', mod: 'ah-badge--success' },
  PENDING: { label: 'Pending', mod: 'ah-badge--pending' },
  FAILED: { label: 'Failed', mod: 'ah-badge--failed' },
}

function StatusBadge({ status }) {
  const normalizedStatus = String(status || '').toUpperCase()
  const config = STATUS_MAP[normalizedStatus] || {
    label: normalizedStatus || 'Không xác định',
    mod: 'ah-badge--unknown',
  }

  return (
    <span className={`ah-badge ${config.mod}`}>
      <span className="ah-badge__dot" />
      {config.label}
    </span>
  )
}

function formatAction(action) {
  const normalizedAction = String(action || '').toUpperCase()
  if (normalizedAction === 'ON') return 'Bật'
  if (normalizedAction === 'OFF') return 'Tắt'
  return action || '—'
}

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

export default function ActionHistory() {
  const [search, setSearch] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState({ totalPages: 0, totalItems: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setPage(1)
      setKeyword(search.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(debounceTimer)
  }, [search])

  useEffect(() => {
    const controller = new AbortController()
    let firstRequest = true

    const loadHistory = async () => {
      if (firstRequest) setLoading(true)

      try {
        const payload = await fetchActionHistory(
          { page, limit: PAGE_SIZE, keyword: keyword || undefined },
          controller.signal,
        )

        setRows(Array.isArray(payload.data) ? payload.data : [])
        setPagination(payload.pagination || { totalPages: 0, totalItems: 0 })
        setError(null)
      } catch (requestError) {
        if (requestError.name !== 'CanceledError' && requestError.code !== 'ERR_CANCELED') {
          setError(requestError.response?.data?.message || 'Không thể tải lịch sử hoạt động.')
        }
      } finally {
        if (firstRequest) {
          setLoading(false)
          firstRequest = false
        }
      }
    }

    void loadHistory()
    const intervalId = setInterval(() => void loadHistory(), REFRESH_INTERVAL)

    return () => {
      controller.abort()
      clearInterval(intervalId)
    }
  }, [keyword, page])

  const totalPages = Math.max(1, Number(pagination.totalPages) || 0)
  const pages = useMemo(() => pageNumbers(page, totalPages), [page, totalPages])

  return (
    <div className="page action-history-page">
      <div className="page-header">
        <h1 className="page-title">
          Lịch sử hoạt động
        </h1>
        <p className="page-subtitle">
          Theo dõi hoạt động thực tế của các thiết bị
        </p>
      </div>

      <div className="ah-toolbar">
        <div className="ah-search">
          <Search size={15} className="ah-search__icon" />
          <input
            className="ah-search__input"
            type="search"
            placeholder="Tìm thiết bị, trạng thái, hoạt động hoặc ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {error && <div className="ah-error">⚠ {error}</div>}

      <div className="ah-card">
        <table className="ah-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>ID</th>
              <th>Tên thiết bị</th>
              <th className="center" style={{ width: 130 }}>Hoạt động</th>
              <th className="center" style={{ width: 160 }}>Trạng thái</th>
              <th style={{ width: 200 }}>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="ah-empty">Đang tải lịch sử...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="ah-empty">
                  {error ? 'Không thể hiển thị dữ liệu.' : 'Không tìm thấy lịch sử phù hợp.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td><span className="ah-id">{row.id}</span></td>
                  <td><span className="ah-device">{row.deviceName || `Thiết bị ${row.deviceId}`}</span></td>
                  <td className="center">
                    <span className="ah-action">{formatAction(row.action)}</span>
                  </td>
                  <td className="center">
                    <StatusBadge status={row.status} />
                  </td>
                  <td>{fmtTime(row.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && pagination.totalItems > 0 && (
          <div className="ah-pagination">
            <button
              className="ah-page-btn"
              onClick={() => setPage(1)}
              disabled={page === 1}
              title="Trang đầu"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              className="ah-page-btn"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              title="Trang trước"
            >
              <ChevronLeft size={14} />
            </button>

            {pages.map((pageNumber, index) => (
              pageNumber === '…' ? (
                <span key={`ellipsis-${index}`} className="ah-page-btn ah-page-ellipsis">…</span>
              ) : (
                <button
                  key={pageNumber}
                  className={`ah-page-btn${page === pageNumber ? ' ah-page-btn--active' : ''}`}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              )
            ))}

            <button
              className="ah-page-btn"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              title="Trang sau"
            >
              <ChevronRight size={14} />
            </button>
            <button
              className="ah-page-btn"
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
