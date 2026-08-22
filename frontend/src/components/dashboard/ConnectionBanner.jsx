import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import './dashboard.css'

/**
 * ConnectionBanner – dải trạng thái kết nối
 * Props: status ("CONNECTED"|"DISCONNECTED"), lastUpdated (string)
 */
export default function ConnectionBanner({ status, lastUpdated }) {
  if (status === 'CONNECTED') {
    return (
      <div className="banner banner--connected">
        <Wifi size={14} className="banner__icon" />
        <span>Đang kết nối</span>
        <span className="banner__spacer" />
        {lastUpdated && (
          <span className="banner__time">Cập nhật: {lastUpdated}</span>
        )}
      </div>
    )
  }

  return (
    <div className="banner banner--disconnected">
      <WifiOff size={14} className="banner__icon anim-blink" />
      <div>
        <p>Mất kết nối phần cứng</p>
        <p className="banner__desc">
          Hiển thị dữ liệu cuối cùng – đang thử kết nối lại...
        </p>
      </div>
      <span className="banner__spacer" />
      <RefreshCw size={13} className="anim-spin" style={{ color: '#fca5a5' }} />
    </div>
  )
}
