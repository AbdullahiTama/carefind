import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { theme } from './lib/theme'

function hashPassword(password) {
  return `cf_hashed_${password}`
}

function generateToken(adminId, role) {
  const payload = `${adminId}|${role}|${Date.now()}`
  return btoa(payload)
}

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Only redirect if token is valid and not expired
    try {
      const token = localStorage.getItem('admin_token')
      if (token) {
        const decoded = atob(token)
        const parts = decoded.split('|')
        if (parts.length === 3 && Date.now() - parseInt(parts[2]) < 86400000) {
          navigate('/admin-panel')
        } else {
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_user')
        }
      }
    } catch {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
    }
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const hash = hashPassword(password)
      const { data: admin, error: dbError } = await supabase
        .from('admin_users')
        .select('id, email, full_name, role, is_active')
        .eq('email', email.toLowerCase())
        .eq('password_hash', hash)
        .eq('is_active', true)
        .maybeSingle()

      if (dbError || !admin) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      // Update last login
      await supabase.from('admin_users').update({ last_login: new Date().toISOString() }).eq('id', admin.id)

      // Store session
      const token = generateToken(admin.id, admin.role)
      localStorage.setItem('admin_token', token)
      localStorage.setItem('admin_user', JSON.stringify(admin))

      navigate('/admin-panel')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: theme.tealGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, fontWeight: 900, color: '#fff' }}>C</div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 900, margin: '0 0 4px 0' }}>CareFind Admin</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>Secure Admin Portal</p>
        </div>

        <div style={{ background: '#1e293b', borderRadius: 20, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Admin Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@carefind.ng" required
                style={{ width: '100%', padding: 13, fontSize: 14, background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                style={{ width: '100%', padding: 13, fontSize: 14, background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', outline: 'none' }} />
            </div>

            {error && (
              <div style={{ background: '#fef2f2', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ margin: 0, fontSize: 13, color: theme.alert, fontWeight: 600 }}>⚠️ {error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} style={{ padding: 14, background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 13, fontWeight: 800, fontSize: 15, marginTop: 4, boxShadow: '0 4px 14px rgba(15,118,110,0.4)' }}>
              {loading ? 'Signing in...' : 'Sign In to Admin'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          This portal is restricted to authorized CareFind staff only.
        </p>
      </div>
    </div>
  )
}

export default AdminLogin
