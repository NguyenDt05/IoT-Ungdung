import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from 'lucide-react'
import './pagination.css'

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 4) return [1, 2, 3, 4, 5, '…', totalPages]
  if (currentPage >= totalPages - 3) {
    return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, '…', currentPage - 1, currentPage, currentPage + 1, '…', totalPages]
}

export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
  const safeTotalPages = Math.max(1, Number(totalPages) || 0)

  if (!totalItems) return null

  const changePage = (nextPage) => onPageChange(Math.min(Math.max(nextPage, 1), safeTotalPages))
  const displayedItems = Math.min(pageSize, totalItems - ((page - 1) * pageSize))

  return (
    <nav className="pagination" aria-label="Phân trang">
      <span className="pagination__summary">Hiển thị {displayedItems}/{totalItems} bản ghi</span>
      <div className="pagination__controls">
        <button className="pagination__button" onClick={() => changePage(1)} disabled={page === 1} aria-label="Trang đầu">
          <ChevronsLeft size={14} />
        </button>
        <button className="pagination__button" onClick={() => changePage(page - 1)} disabled={page === 1} aria-label="Trang trước">
          <ChevronLeft size={14} />
        </button>

        {getPageNumbers(page, safeTotalPages).map((pageNumber, index) => (
          pageNumber === '…' ? (
            <span key={`ellipsis-${index}`} className="pagination__ellipsis">…</span>
          ) : (
            <button
              key={pageNumber}
              className={`pagination__button${page === pageNumber ? ' pagination__button--active' : ''}`}
              onClick={() => changePage(pageNumber)}
              aria-current={page === pageNumber ? 'page' : undefined}
            >
              {pageNumber}
            </button>
          )
        ))}

        <button className="pagination__button" onClick={() => changePage(page + 1)} disabled={page === safeTotalPages} aria-label="Trang sau">
          <ChevronRight size={14} />
        </button>
        <button className="pagination__button" onClick={() => changePage(safeTotalPages)} disabled={page === safeTotalPages} aria-label="Trang cuối">
          <ChevronsRight size={14} />
        </button>
      </div>
    </nav>
  )
}
