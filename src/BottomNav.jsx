import { Link, useLocation } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import { theme } from './lib/theme'

function BottomNav() {
  const location = useLocation()
  const { user } = useAuth()
  const isActive = (path) => location.pathname === path

  const itemStyle = (active) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    color: active ? theme.tealDeep : theme.textLight, textDecoration: 'none', fontSize: 10, fontWeight: 700,
  })

  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, background: theme.cardBg, borderTop: `1px solid ${theme.border}`,
        display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '10px 0 18px 0',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.04)', zIndex: 100,
      }}
    >
      <Link to="/" style={itemStyle(isActive('/'))}>
        <span style={{ fontSize: 19 }}>🏠</span>
        Home
      </Link>
      <Link to="/search" style={itemStyle(isActive('/search'))}>
        <span style={{ fontSize: 19 }}>🔍</span>
        Search
      </Link>
      <Link to={user ? '/' : '/login'} style={{ textDecoration: 'none' }}>
        <div
          style={{
            width: 38, height: 38, borderRadius: 12, background: theme.tealGradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            fontSize: 20, fontWeight: 800, boxShadow: '0 4px 10px rgba(15,118,110,0.35)',
          }}
        >
          +
        </div>
      </Link>
      <Link to="/" style={itemStyle(false)}>
        <span style={{ fontSize: 19 }}>🔔</span>
        Alerts
      </Link>
      <Link to="/profile" style={itemStyle(isActive('/profile'))}>
        <span style={{ fontSize: 19 }}>👤</span>
        Profile
      </Link>
    </div>
  )
}

export default BottomNav
