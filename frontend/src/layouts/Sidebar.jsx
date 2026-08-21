import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LineChart, History } from 'lucide-react'
import './sidebar.css'
import '../pages/profile.css'
import avatarImage from '../z7737901163981_8f242a8734b65830ac438063d1af9076.jpg'

const NAV_ITEMS = [
  { label: 'Trang chủ',         to: '/dashboard', Icon: LayoutDashboard },
  { label: 'Dữ liệu cảm biến',  to: '/sensors',   Icon: LineChart        },
  { label: 'Lịch sử hoạt động', to: '/history',   Icon: History          },
]

export default function Sidebar() {
  const navigate = useNavigate()

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar__header">
        <p className="sidebar__title">Taskbar</p>
        <div className="sidebar__divider" />
      </div>

      {/* Nav */}
      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ label, to, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-item${isActive ? ' active' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className="nav-item__icon"
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span>{label}</span>
                {isActive && <span className="nav-item__dot" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__spacer" />

      {/* User – click để mở hồ sơ cá nhân */}
      <div className="sidebar__user">
        <div className="sidebar__user-divider" />
        <div
          className="user-card-link"
          onClick={() => navigate('/profile')}
          title="Xem hồ sơ cá nhân"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/profile')}
        >
          <img className="user-avatar" src={avatarImage} alt="" />
          <div>
            <p className="user-name">Thảo Nguyên Đặng</p>
            <p className="user-role">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
