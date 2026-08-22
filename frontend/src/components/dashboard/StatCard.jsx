import './dashboard.css'

/**
 * StatCard – một thẻ thông số cảm biến
 * Props: title, value, unit, color ("green"|"yellow"), status ("CONNECTED"|"DISCONNECTED")
 */
export default function StatCard({ title, value, unit, color = 'green', status }) {
  const mod = color === 'yellow' ? 'stat-card--yellow' : 'stat-card--green'

  const display =
    value !== null && value !== undefined ? value : '—'

  return (
    <div className={`stat-card ${mod} anim-fade`}>
      <p className="stat-card__label">{title}</p>

      <div className="stat-card__value">
        <span className="stat-card__number">{display}</span>
        <span className="stat-card__unit">{unit}</span>
      </div>

      {status === 'DISCONNECTED' && (
        <div className="stat-card__disconnect">
          <span className="stat-card__disconnect-dot" />
          <span className="stat-card__disconnect-text">Mất kết nối</span>
        </div>
      )}
    </div>
  )
}
