import React, { useEffect, useState, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import { theme } from './lib/theme'
const AdminStaff = React.lazy(() => import('./AdminStaff.jsx'))

function AdminPanel() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminToken, setAdminToken] = useState(null)
  const [adminUser, setAdminUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  // Overview stats
  const [stats, setStats] = useState({})

  // Users
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')

  // Verifications
  const [verifications, setVerifications] = useState([])

  // Business claims
  const [claims, setClaims] = useState([])

  // Reports
  const [reports, setReports] = useState([])

  // Posts
  const [posts, setPosts] = useState([])
  const [postSearch, setPostSearch] = useState('')

  // Transactions
  const [transactions, setTransactions] = useState([])

  // Drug intelligence
  const [drugSearch, setDrugSearch] = useState('')
  const [drugReviews, setDrugReviews] = useState([])
  const [drugName, setDrugName] = useState('')

  // Tasks
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskComp, setTaskComp] = useState('')
  const [taskSpecialty, setTaskSpecialty] = useState('')
  const [tasks, setTasks] = useState([])
  const [savingTask, setSavingTask] = useState(false)

  useEffect(() => {
    async function init() {
      // Check for admin token (separate admin login)
      const token = localStorage.getItem('admin_token')
      const adminUserData = localStorage.getItem('admin_user')
      if (token && adminUserData) {
        try {
          const adminData = JSON.parse(adminUserData)
          // Verify token not expired (24 hours)
          const decoded = atob(token)
          const parts = decoded.split('|')
          if (parts.length === 3) {
            const timestamp = parseInt(parts[2])
            if (Date.now() - timestamp < 86400000) {
              setAdminToken(token)
              setAdminUser(adminData)
              setIsAdmin(true)
              await loadAll()
              setLoading(false)
              return
            }
          }
        } catch {}
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
      }

      // Fall back to checking supabase is_admin flag
      if (!user) { setLoading(false); return }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!profile?.is_admin) { setLoading(false); return }
      setIsAdmin(true)
      await loadAll()
      setLoading(false)
    }
    if (!authLoading) init()
  }, [user, authLoading])

  async function loadAll() {
    const [usersRes, verifRes, claimsRes, reportsRes, postsRes, txRes, tasksRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, display_name, is_verified, is_admin, created_at, specialty').order('created_at', { ascending: false }).limit(50),
      supabase.from('verification_requests').select('*, profiles(full_name, display_name)').order('created_at', { ascending: false }),
      supabase.from('business_claims').select('*, businesses(name), profiles(full_name, display_name)').order('created_at', { ascending: false }),
      supabase.from('reports').select('*, posts(content, user_id), profiles!reports_reporter_id_fkey(display_name)').order('created_at', { ascending: false }).limit(30),
      supabase.from('posts').select('id, content, post_type, created_at, user_id, profiles(display_name, full_name)').order('created_at', { ascending: false }).limit(50),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('tasks').select('*, task_submissions(id, status)').order('created_at', { ascending: false }),
    ])

    setUsers(usersRes.data || [])
    setVerifications(verifRes.data || [])
    setClaims(claimsRes.data || [])
    setReports(reportsRes.data || [])
    setPosts(postsRes.data || [])
    setTransactions(txRes.data || [])
    setTasks(tasksRes.data || [])

    // Stats
    const totalRevenue = (txRes.data || []).filter(t => t.type === 'topup').reduce((sum, t) => sum + (t.naira_amount || 0), 0)
    setStats({
      users: usersRes.data?.length || 0,
      posts: postsRes.data?.length || 0,
      pendingVerifs: (verifRes.data || []).filter(v => v.status === 'pending').length,
      pendingClaims: (claimsRes.data || []).filter(c => c.status === 'pending').length,
      reports: (reportsRes.data || []).filter(r => r.status === 'pending').length,
      revenue: totalRevenue / 100,
      transactions: txRes.data?.length || 0,
    })
  }

  async function approveVerification(id, userId, profession) {
    await supabase.from('verification_requests').update({ status: 'approved' }).eq('id', id)
    await supabase.from('profiles').update({ is_verified: true, verification_label: profession, specialty: profession }).eq('id', userId)
    loadAll()
  }

  async function rejectVerification(id) {
    await supabase.from('verification_requests').update({ status: 'rejected' }).eq('id', id)
    loadAll()
  }

  async function approveClaim(id, businessId, userId) {
    await supabase.from('business_claims').update({ status: 'approved' }).eq('id', id)
    await supabase.from('businesses').update({ visible_on_carefind: true }).eq('id', businessId)
    loadAll()
  }

  async function rejectClaim(id) {
    await supabase.from('business_claims').update({ status: 'rejected' }).eq('id', id)
    loadAll()
  }

  async function deletePost(id) {
    if (!window.confirm('Delete this post permanently?')) return
    await supabase.from('posts').delete().eq('id', id)
    await supabase.from('reports').update({ status: 'resolved' }).eq('post_id', id)
    loadAll()
  }

  async function resolveReport(id) {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', id)
    loadAll()
  }

  async function suspendUser(id) {
    if (!window.confirm('Suspend this user?')) return
    await supabase.from('profiles').update({ is_admin: false, is_verified: false }).eq('id', id)
    loadAll()
  }

  async function manualVerify(userId, specialty) {
    await supabase.from('profiles').update({ is_verified: true, verification_label: specialty, specialty }).eq('id', userId)
    loadAll()
  }

  async function searchDrugReviews() {
    if (!drugSearch.trim()) return
    const { data: products } = await supabase.from('products').select('id, name').ilike('name', `%${drugSearch}%`).limit(5)
    if (!products?.length) { setDrugReviews([]); return }
    const productIds = products.map(p => p.id)
    setDrugName(products[0].name)
    const { data: reviews } = await supabase.from('product_reviews').select('*').in('product_id', productIds).order('created_at', { ascending: false })
    setDrugReviews(reviews || [])
  }

  async function createTask() {
    if (!taskTitle.trim() || !taskDesc.trim() || !taskComp) return
    setSavingTask(true)
    await supabase.from('tasks').insert({ title: taskTitle, description: taskDesc, compensation: parseInt(taskComp), specialty: taskSpecialty || null, created_by: user.id })
    setTaskTitle(''); setTaskDesc(''); setTaskComp(''); setTaskSpecialty('')
    setSavingTask(false)
    loadAll()
  }

  function exportCSV(data, filename) {
    if (!data.length) return
    const keys = Object.keys(data[0])
    const csv = [keys.join(','), ...data.map(row => keys.map(k => `"${(row[k] || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  }

  function timeAgo(d) {
    const diff = Math.floor((Date.now() - new Date(d)) / 1000)
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
    return `${Math.floor(diff/86400)}d ago`
  }

  if (authLoading || loading) return <div style={{ padding: 20, fontFamily: 'system-ui' }}>Loading...</div>

  if (!user || !isAdmin) {
    return (
      <div style={{ padding: 40, fontFamily: 'system-ui', textAlign: 'center' }}>
        <h2 style={{ color: '#dc2626' }}>Access Denied</h2>
        <p style={{ color: '#666' }}>This page is only accessible to platform administrators.</p>
        <Link to="/" style={{ color: '#0f766e', fontWeight: 700 }}>← Back to CareFind</Link>
      </div>
    )
  }

  const TABS = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'verifications', label: `🩺 Verify (${stats.pendingVerifs || 0})` },
    { key: 'claims', label: `🏥 Claims (${stats.pendingClaims || 0})` },
    { key: 'reports', label: `🚩 Reports (${stats.reports || 0})` },
    { key: 'users', label: '👥 Users' },
    { key: 'posts', label: '📝 Posts' },
    { key: 'transactions', label: '💰 Revenue' },
    { key: 'drugs', label: '💊 Drug Intel' },
    { key: 'tasks', label: '📋 Tasks' },
    { key: 'staff', label: '👨‍💼 Staff' },
  ]

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: theme.heroGradient, padding: '22px 20px 20px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>CareFind Admin</h1>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              {adminUser?.full_name} · {adminUser?.role?.replace('_', ' ')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user'); navigate('/admin-login') }}
              style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
              Sign Out
            </button>
            <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>← App</Link>
          </div>
        </div>
      </div>

      {/* Tab scroll - fixed below header */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', overflowX: 'auto', background: '#fff', borderBottom: `1px solid ${theme.border}`, WebkitOverflowScrolling: 'touch' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flexShrink: 0, padding: '7px 12px', borderRadius: 18, fontSize: 11, fontWeight: 700,
            border: tab === t.key ? 'none' : `1px solid ${theme.border}`,
            background: tab === t.key ? theme.tealGradient : theme.bg,
            color: tab === t.key ? '#fff' : theme.textMid,
            whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Total Users', value: stats.users, icon: '👥' },
                { label: 'Total Posts', value: stats.posts, icon: '📝' },
                { label: 'Pending Verifs', value: stats.pendingVerifs, icon: '🩺', alert: true },
                { label: 'Pending Claims', value: stats.pendingClaims, icon: '🏥', alert: true },
                { label: 'Open Reports', value: stats.reports, icon: '🚩', alert: true },
                { label: 'Transactions', value: stats.transactions, icon: '💳' },
              ].map(s => (
                <div key={s.label} style={{ border: `1px solid ${s.alert && s.value > 0 ? '#fca5a5' : theme.border}`, borderRadius: 14, padding: 14, background: s.alert && s.value > 0 ? '#fef2f2' : theme.cardBg, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: 22 }}>{s.icon}</p>
                  <p style={{ margin: '0 0 2px 0', fontSize: 22, fontWeight: 900, color: s.alert && s.value > 0 ? theme.alert : theme.navy }}>{s.value || 0}</p>
                  <p style={{ margin: 0, fontSize: 10.5, color: theme.textLight, fontWeight: 700 }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: 14, background: theme.cardBg }}>
              <p style={{ margin: '0 0 4px 0', fontSize: 11, color: theme.textLight, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform Revenue</p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: theme.success }}>₦{(stats.revenue || 0).toLocaleString()}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: theme.textLight }}>From {stats.transactions || 0} transactions</p>
            </div>
          </div>
        )}

        {/* VERIFICATIONS */}
        {tab === 'verifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {verifications.length === 0 && <p style={{ color: theme.textLight, fontSize: 13 }}>No verification requests yet.</p>}
            {verifications.map(v => (
              <div key={v.id} style={{ border: `1px solid ${v.status === 'pending' ? '#fca5a5' : theme.border}`, borderRadius: 16, padding: 14, background: theme.cardBg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <p style={{ margin: '0 0 2px 0', fontWeight: 800, fontSize: 14, color: theme.navy }}>{v.full_name}</p>
                    <p style={{ margin: '0 0 2px 0', fontSize: 12.5, color: theme.tealDeep, fontWeight: 700 }}>{v.profession}</p>
                    <p style={{ margin: '0 0 4px 0', fontSize: 11.5, color: theme.textLight }}>{v.workplace} · {v.phone}</p>
                    <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>{timeAgo(v.created_at)}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, height: 'fit-content',
                    background: v.status === 'approved' ? '#ecfdf5' : v.status === 'rejected' ? '#fef2f2' : '#fef3c7',
                    color: v.status === 'approved' ? theme.success : v.status === 'rejected' ? theme.alert : theme.warning,
                  }}>{v.status}</span>
                </div>
                {v.credential_url && (
                  <a href={v.credential_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginBottom: 10, fontSize: 12, color: theme.tealDeep, fontWeight: 700 }}>
                    📎 View Credential
                  </a>
                )}
                {v.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => approveVerification(v.id, v.user_id, v.profession)} style={{ flex: 1, padding: '9px', background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>✓ Approve</button>
                    <button onClick={() => rejectVerification(v.id)} style={{ flex: 1, padding: '9px', background: '#fef2f2', color: theme.alert, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>✕ Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* BUSINESS CLAIMS */}
        {tab === 'claims' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {claims.length === 0 && <p style={{ color: theme.textLight, fontSize: 13 }}>No business claims yet.</p>}
            {claims.map(c => (
              <div key={c.id} style={{ border: `1px solid ${c.status === 'pending' ? '#fca5a5' : theme.border}`, borderRadius: 16, padding: 14, background: theme.cardBg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <p style={{ margin: '0 0 2px 0', fontWeight: 800, fontSize: 14, color: theme.navy }}>{c.businesses?.name}</p>
                    <p style={{ margin: '0 0 2px 0', fontSize: 12.5, color: theme.textMid }}>Claimed by: {c.profiles?.full_name || c.profiles?.display_name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>{timeAgo(c.created_at)}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, height: 'fit-content',
                    background: c.status === 'approved' ? '#ecfdf5' : c.status === 'rejected' ? '#fef2f2' : '#fef3c7',
                    color: c.status === 'approved' ? theme.success : c.status === 'rejected' ? theme.alert : theme.warning,
                  }}>{c.status}</span>
                </div>
                {c.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => approveClaim(c.id, c.business_id, c.user_id)} style={{ flex: 1, padding: '9px', background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>✓ Approve</button>
                    <button onClick={() => rejectClaim(c.id)} style={{ flex: 1, padding: '9px', background: '#fef2f2', color: theme.alert, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>✕ Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* REPORTS */}
        {tab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reports.length === 0 && <p style={{ color: theme.textLight, fontSize: 13 }}>No reports yet.</p>}
            {reports.map(r => (
              <div key={r.id} style={{ border: `1px solid ${r.status === 'pending' ? '#fca5a5' : theme.border}`, borderRadius: 16, padding: 14, background: theme.cardBg }}>
                <p style={{ margin: '0 0 4px 0', fontSize: 11, color: theme.alert, fontWeight: 800, textTransform: 'uppercase' }}>🚩 {r.reason}</p>
                <p style={{ margin: '0 0 6px 0', fontSize: 13, color: theme.textMid, lineHeight: 1.4 }}>
                  {r.posts?.content?.slice(0, 120)}{r.posts?.content?.length > 120 ? '...' : ''}
                </p>
                <p style={{ margin: '0 0 10px 0', fontSize: 11, color: theme.textLight }}>Reported {timeAgo(r.created_at)}</p>
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => deletePost(r.post_id)} style={{ flex: 1, padding: '8px', background: '#fef2f2', color: theme.alert, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 12 }}>🗑️ Delete Post</button>
                    <button onClick={() => resolveReport(r.id)} style={{ flex: 1, padding: '8px', background: theme.bg, color: theme.textMid, border: `1px solid ${theme.border}`, borderRadius: 10, fontWeight: 700, fontSize: 12 }}>✓ Dismiss</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users..."
              style={{ padding: 11, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 12, width: '100%' }} />
            {users.filter(u => !userSearch || (u.full_name || u.display_name || '').toLowerCase().includes(userSearch.toLowerCase())).map(u => (
              <div key={u.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: 12, background: theme.cardBg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <p style={{ margin: '0 0 2px 0', fontWeight: 700, fontSize: 13.5, color: theme.navy }}>{u.full_name || u.display_name || 'No name'}</p>
                    {u.specialty && <p style={{ margin: '0 0 2px 0', fontSize: 12, color: theme.tealDeep, fontWeight: 700 }}>{u.specialty}</p>}
                    <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>{timeAgo(u.created_at)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {u.is_verified && <span style={{ fontSize: 9.5, fontWeight: 800, color: theme.tealDeep, background: '#ecfdf5', padding: '2px 7px', borderRadius: 20 }}>✓ Verified</span>}
                    {u.is_admin && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', padding: '2px 7px', borderRadius: 20 }}>Admin</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!u.is_verified && (
                    <button onClick={() => { const s = prompt('Enter specialty to verify:'); if (s) manualVerify(u.id, s) }}
                      style={{ padding: '6px 10px', background: theme.tealDeep, color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                      ✓ Verify
                    </button>
                  )}
                  <button onClick={() => suspendUser(u.id)}
                    style={{ padding: '6px 10px', background: '#fef2f2', color: theme.alert, border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                    Suspend
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* POSTS */}
        {tab === 'posts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={postSearch} onChange={(e) => setPostSearch(e.target.value)} placeholder="Search posts..."
                style={{ flex: 1, padding: 11, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 12 }} />
              <button onClick={() => exportCSV(posts, 'carefind_posts.csv')} style={{ padding: '0 12px', background: theme.tealDeep, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>Export</button>
            </div>
            {posts.filter(p => !postSearch || p.content?.toLowerCase().includes(postSearch.toLowerCase())).map(p => (
              <div key={p.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: 12, background: theme.cardBg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase' }}>{p.post_type}</span>
                  <span style={{ fontSize: 11, color: theme.textLight }}>{timeAgo(p.created_at)}</span>
                </div>
                <p style={{ margin: '0 0 4px 0', fontSize: 12, color: theme.textLight }}>{p.profiles?.full_name || p.profiles?.display_name || 'User'}</p>
                <p style={{ margin: '0 0 8px 0', fontSize: 13, color: theme.textMid }}>{p.content?.slice(0, 150)}{p.content?.length > 150 ? '...' : ''}</p>
                <button onClick={() => deletePost(p.id)} style={{ padding: '6px 12px', background: '#fef2f2', color: theme.alert, border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>🗑️ Delete</button>
              </div>
            ))}
          </div>
        )}

        {/* TRANSACTIONS */}
        {tab === 'transactions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => exportCSV(transactions, 'carefind_transactions.csv')} style={{ padding: '8px 14px', background: theme.tealDeep, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>Export CSV</button>
            </div>
            {transactions.map(t => (
              <div key={t.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: 12, background: theme.cardBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: '0 0 2px 0', fontWeight: 700, fontSize: 13, color: theme.navy, textTransform: 'capitalize' }}>{t.type?.replace('_', ' ')}</p>
                  <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>{timeAgo(t.created_at)} · {t.reference?.slice(0, 20)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 2px 0', fontWeight: 900, fontSize: 14, color: t.type === 'topup' ? theme.success : theme.navy }}>{t.amount} 🪙</p>
                  {t.naira_amount && <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>₦{(t.naira_amount/100).toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DRUG INTELLIGENCE */}
        {tab === 'drugs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={drugSearch} onChange={(e) => setDrugSearch(e.target.value)} placeholder="Search medication name..."
                style={{ flex: 1, padding: 11, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 12 }} />
              <button onClick={searchDrugReviews} style={{ padding: '0 14px', background: theme.tealDeep, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13 }}>Search</button>
            </div>

            {drugReviews.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: theme.navy }}>{drugName} — {drugReviews.length} reviews</p>
                  <button onClick={() => exportCSV(drugReviews, `${drugName}_reviews.csv`)} style={{ padding: '6px 12px', background: theme.tealDeep, color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>Export CSV</button>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['positive', 'neutral', 'negative'].map(sentiment => {
                    const count = drugReviews.filter(r => r.rating >= 4 ? sentiment === 'positive' : r.rating <= 2 ? sentiment === 'negative' : sentiment === 'neutral').length
                    return (
                      <div key={sentiment} style={{ flex: 1, borderRadius: 12, padding: '10px 8px', textAlign: 'center', background: sentiment === 'positive' ? '#ecfdf5' : sentiment === 'negative' ? '#fef2f2' : '#fef9c3' }}>
                        <p style={{ margin: '0 0 2px 0', fontSize: 18, fontWeight: 900, color: sentiment === 'positive' ? theme.success : sentiment === 'negative' ? theme.alert : theme.warning }}>{count}</p>
                        <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: sentiment === 'positive' ? theme.success : sentiment === 'negative' ? theme.alert : theme.warning, textTransform: 'capitalize' }}>{sentiment}</p>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {drugReviews.map(r => (
                    <div key={r.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 12, padding: 12, background: theme.cardBg }}>
                      <p style={{ margin: '0 0 4px 0', color: theme.warning, fontSize: 13 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</p>
                      {r.comment && <p style={{ margin: 0, fontSize: 13, color: theme.textMid }}>{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* TASKS */}
        {tab === 'tasks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ border: `1px solid ${theme.border}`, borderRadius: 16, padding: 16, background: theme.cardBg }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 800, color: theme.navy }}>Create Sponsored Task</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Task Title', value: taskTitle, set: setTaskTitle, placeholder: 'e.g. Review new antihypertensive drug' },
                  { label: 'Compensation (₦)', value: taskComp, set: setTaskComp, placeholder: 'e.g. 5000', type: 'number' },
                  { label: 'Target Specialty (optional)', value: taskSpecialty, set: setTaskSpecialty, placeholder: 'e.g. Cardiologist' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: 11, color: theme.textLight, fontWeight: 700, display: 'block', marginBottom: 3 }}>{f.label}</label>
                    <input type={f.type || 'text'} value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder}
                      style={{ width: '100%', padding: 10, fontSize: 13, border: `1px solid ${theme.border}`, borderRadius: 10 }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, color: theme.textLight, fontWeight: 700, display: 'block', marginBottom: 3 }}>Task Description</label>
                  <textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} placeholder="Describe what professionals need to do..." rows={3}
                    style={{ width: '100%', padding: 10, fontSize: 13, border: `1px solid ${theme.border}`, borderRadius: 10, fontFamily: 'inherit' }} />
                </div>
                <button onClick={createTask} disabled={savingTask} style={{ padding: 12, background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14 }}>
                  {savingTask ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </div>

            {tasks.map(t => (
              <div key={t.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: 12, background: theme.cardBg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 13.5, color: theme.navy }}>{t.title}</p>
                  <p style={{ margin: 0, fontWeight: 900, fontSize: 13, color: theme.success }}>₦{t.compensation?.toLocaleString()}</p>
                </div>
                <p style={{ margin: '0 0 6px 0', fontSize: 12, color: theme.textMid }}>{t.description?.slice(0, 100)}</p>
                <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>{t.task_submissions?.length || 0} submission{t.task_submissions?.length !== 1 ? 's' : ''} · {t.specialty || 'All specialties'}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

export default AdminPanel
