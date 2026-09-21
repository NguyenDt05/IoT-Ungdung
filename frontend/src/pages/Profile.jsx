import { FileText, IdCard, Mail } from 'lucide-react'
import './profile.css'
import avatarImage from '../z7737901163981_8f242a8734b65830ac438063d1af9076.jpg'

const USER = {
  name: 'Đặng Thảo Nguyên',
  studentId: 'B23DCCN609',
  email: 'NguyenDt.B23DCCN609@stu.ptit.edu.vn',
  github: { label: 'IoT-Ungdung', url: 'https://github.com/NguyenDt05/IoT-Ungdung' },
  figma: { label: 'IoT-Design', url: 'https://www.figma.com/design/a697q3sxoIkKP7aHhtxGHe/IoT?node-id=1-4195&t=3aREkYWGoDZ9DBz0-0' },
  report: { label: 'BaoCaoIoT', url: 'https://docs.google.com/document/d/1lgN4qU-nC3XX1EEsEnCts9SywMMvujR5bhiocwNPsfk/edit?tab=t.0' },
}

function GithubIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

function FigmaIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 57" fill="none" aria-hidden="true">
      <path d="M19 28.5A9.5 9.5 0 1 1 28.5 19 9.51 9.51 0 0 1 19 28.5Z" fill="#1ABCFE" />
      <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5A9.5 9.5 0 0 1 0 47.5Z" fill="#0ACF83" />
      <path d="M19 0v19H9.5A9.5 9.5 0 1 1 19 0Z" fill="#FF7262" />
      <path d="M28.5 0H19v19h9.5A9.5 9.5 0 0 0 28.5 0Z" fill="#F24E1E" />
      <path d="M38 19A9.5 9.5 0 0 1 19 19v-9.5A9.5 9.5 0 0 1 38 19Z" fill="#A259FF" />
    </svg>
  )
}

function InfoRow({ icon, label, children }) {
  return (
    <div className="profile-row">
      <div className="profile-row__icon">{icon}</div>
      <div className="profile-row__body">
        <span className="profile-row__label">{label}</span>
        {children}
      </div>
    </div>
  )
}

function ExternalProfileLink({ item }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="profile-row__link">
      {item.label}
    </a>
  )
}

export default function Profile() {
  return (
    <div className="page profile-page">
      <div className="page-header">
        <h1 className="page-title">Hồ sơ cá nhân</h1>
        <p className="page-subtitle">Thông tin người dùng</p>
      </div>

      <div className="profile-card">
        <div className="profile-avatar-wrap">
          <img src={avatarImage} alt={USER.name} className="profile-avatar" />
        </div>

        <div className="profile-info">
          <h2 className="profile-name">{USER.name}</h2>
          <div className="profile-rows">
            <InfoRow icon={<IdCard size={16} strokeWidth={1.8} />} label="Mã sinh viên">
              <span className="profile-row__value">{USER.studentId}</span>
            </InfoRow>
            <InfoRow icon={<Mail size={16} strokeWidth={1.8} />} label="Email">
              <a href={`mailto:${USER.email}`} className="profile-row__link">{USER.email}</a>
            </InfoRow>
            <InfoRow icon={<GithubIcon />} label="GitHub">
              <ExternalProfileLink item={USER.github} />
            </InfoRow>
            <InfoRow icon={<FigmaIcon />} label="Figma">
              <ExternalProfileLink item={USER.figma} />
            </InfoRow>
            <InfoRow icon={<FileText size={16} strokeWidth={1.8} />} label="Báo cáo">
              <ExternalProfileLink item={USER.report} />
            </InfoRow>
          </div>
        </div>
      </div>
    </div>
  )
}
