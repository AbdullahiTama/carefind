import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { theme } from './lib/theme'

export default function AdminPanel() {
  const navigate = useNavigate()
  const [adminUser, setAdminUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ users: 0, posts: 0, pending: 0 })

  useEffect(() => {
    try {
      const token = localStorage.getItem('admin_token')
      const userData = localStorage.getItem('admin_user')
      if (!token || !userData) { navigate('/admin'); return }
      const decoded = atob(token)
      const parts = decoded.split('|')
      if (parts.length !== 3 || Date.now() - parseInt(parts[2]) > 86400000) {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        navigate('/admin')
        return
      }
      setAdminUser(JSON.parse(userData))
      loadStats()
    } catch {
      navigate('/admin')
    }
  }, [])

  async function loadStats() {
    const [users, posts, verifs] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('verification_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ])
    setStats({ users: users.count || 0, posts: posts.count || 0, pending: verifs.count || 0 })
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <p style={{ color: '#64748b' }}>Loading admin panel...</p>
    </div>
  )

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 480, margin: '0 auto', padding: 20 }}>
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #0f766e)', padding: '20px', borderRadius: 16, color: '#fff', marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 4px 0', fontSize: 20, fontWeight: 900 }}>CareFind Admin</h1>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Welcome, {adminUser?.full_name}</p>
        <button onClick={() => { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user'); navigate('/admin') }}
          style={{ marginTop: 12, padding: '6px 12px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
          Sign Out
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Users', value: stats.users, icon: '👥' },
          { label: 'Posts', value: stats.posts, icon: '📝' },
          { label: 'Pending', value: stats.pending, icon: '⏳' },
        ].map(s => (
          <div key={s.label} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, background: '#fff', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px 0', fontSize: 20 }}>{s.icon}</p>
            <p style={{ margin: '0 0 2px 0', fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{s.value}</p>
            <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center' }}>
        Full admin panel coming — this is the foundation. ✅
      </p>
    </div>
  )
}
