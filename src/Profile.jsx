import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'

function Profile() {
  const { user, signOut, loading } = useAuth()
  const navigate = useNavigate()

  if (loading) return <div style={{ padding: 20, fontFamily: 'sans-serif' }}>Loading...</div>

  if (!user) {
    return (
      <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 400, margin: '0 auto' }}>
        <p>You need to log in to view your profile.</p>
        <Link to="/login" style={{ color: '#0f766e', fontWeight: 600 }}>Log In / Sign Up</Link>
      </div>
    )
  }

  async function handleLogout() {
    await signOut()
    navigate('/')
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 400, margin: '0 auto', padding: 20 }}>
      <Link to="/" style={{ color: '#0f766e', textDecoration: 'none', fontSize: 14 }}>← Back</Link>

      <h1 style={{ fontSize: 22, margin: '16px 0 4px 0' }}>My Profile</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>{user.email}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 14, color: '#999' }}>
          Become a Verified Professional — coming soon
        </div>
        <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 14, color: '#999' }}>
          Register or Claim a Business — coming soon
        </div>
        <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 14, color: '#999' }}>
          My Reviews — coming soon
        </div>
        <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 14, color: '#999' }}>
          My Posts — coming soon
        </div>
      </div>

      <button
        onClick={handleLogout}
        style={{ marginTop: 24, padding: 12, width: '100%', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}
      >
        Log Out
      </button>
    </div>
  )
}

export default Profile
