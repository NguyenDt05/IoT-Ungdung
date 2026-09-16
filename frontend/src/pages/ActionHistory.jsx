import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { fetchActionHistory } from '../services/api'
import Pagination from '../components/common/Pagination'
import { formatDateTime } from '../utils/formatters'
import '../components/common/data-table.css'
import './actionhistory.css'

const PAGE_SIZE = 50
const REFRESH_INTERVAL = 2_000
const SEARCH_DEBOUNCE_MS = 500

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

      {error && <div className="data-error">⚠ {error}</div>}

      <div className="data-card">
        <div className="data-table-header">
          <table className="data-table ah-table">
            <colgroup>
              <col style={{ width: 60 }} />
              <col />
              <col style={{ width: 130 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 200 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ width: 60 }}>ID</th>
                <th>Tên thiết bị</th>
                <th className="data-table__center" style={{ width: 130 }}>Hoạt động</th>
                <th className="data-table__center" style={{ width: 160 }}>Trạng thái</th>
                <th style={{ width: 200 }}>Thời gian</th>
              </tr>
            </thead>
          </table>
        </div>

        <div className="data-table-scroll">
          <table className="data-table ah-table">
            <colgroup>
              <col style={{ width: 60 }} />
              <col />
              <col style={{ width: 130 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 200 }} />
            </colgroup>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="data-empty">Đang tải lịch sử...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="data-empty">
                    {error ? 'Không thể hiển thị dữ liệu.' : 'Không tìm thấy lịch sử phù hợp.'}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td><span className="ah-id">{row.id}</span></td>
                    <td><span className="ah-device">{row.deviceName || `Thiết bị ${row.deviceId}`}</span></td>
                    <td className="data-table__center">
                      <span className="ah-action">{formatAction(row.action)}</span>
                    </td>
                    <td className="data-table__center">
                      <StatusBadge status={row.status} />
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
