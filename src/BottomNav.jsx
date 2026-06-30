import { Link, useLocation } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'

function BottomNav() {
  const location = useLocation()
  const { user } = useAuth()

  const isActive = (path) => location.pathname === path

  const iconStyle = (active) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    color: active ? '#0f766e' : '#999', textDecoration: 'none', fontSize: 10, fontWeight: 600,
  })

  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff',
        borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-around',
        alignItems: 'center', padding: '10px 0 14px 0', maxWidth: 480, margin: '0 auto', zIndex: 100,
      }}
    >
      <Link to="/" style={iconStyle(isActive('/'))}>
        <span style={{ fontSize: 20 }}>🏠</span>
        Home
      </Link>
      <Link to="/search" style={iconStyle(isActive('/search'))}>
        <span style={{ fontSize: 20 }}>🔍</span>
        Search
      </Link>
      <Link to={user ? '/feed' : '/login'} style={iconStyle(false)}>
        <span style={{
          fontSize: 22, background: '#0f766e', color: '#fff', borderRadius: '50%',
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          +
        </span>
      </Link>
      <Link to="/profile" style={iconStyle(isActive('/profile'))}>
        <span style={{ fontSize: 20 }}>👤</span>
        Profile
      </Link>
    </div>
  )
}

export default BottomNav
