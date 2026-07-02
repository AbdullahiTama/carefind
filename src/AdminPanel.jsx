import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { theme } from './lib/theme'

function hashPassword(p) { return `cf_hashed_${p}` }

function timeAgo(d) {
  if (!d) return 'Never'
  const diff = Math.floor((Date.now() - new Date(d)) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function AdminPanel() {
  const navigate = useNavigate()
  const [adminUser, setAdminUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [verifications, setVerifications] = useState([])
  const [claims, setClaims] = useState([])
  const [reports, setReports] = useState([])
  const [posts, setPosts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [tasks, setTasks] = useState([])
  const [teams, setTeams] = useState([])
  const [staff, setStaff] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [postSearch, setPostSearch] = useState('')
  const [drugSearch, setDrugSearch] = useState('')
  const [drugReviews, setDrugReviews] = useState([])
  const [drugName, setDrugName] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskComp, setTaskComp] = useState('')
  const [taskSpec, setTaskSpec] = useState('')
  const [savingTask, setSavingTask] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [staffEmail, setStaffEmail] = useState('')
  const [staffPass, setStaffPass] = useState('')
  const [staffName, setStaffName] = useState('')
  const [staffRole, setStaffRole] = useState('moderator')
  const [staffTeam, setStaffTeam] = useState('')
  const [savingStaff, setSavingStaff] = useState(false)
  const [staffMsg, setStaffMsg] = useState('')
  const [verifyingUser, setVerifyingUser] = useState(null)
  const [verifySpecialty, setVerifySpecialty] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [notifCount, setNotifCount] = useState(0)
  const [roleNotifCount, setRoleNotifCount] = useState(0)
  const [withdrawals, setWithdrawals] = useState([])
  const [notifications, setNotifications] = useState([])

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
      const parsedAdmin = JSON.parse(userData)
      setAdminUser(parsedAdmin)
      loadAll()
    } catch { navigate('/admin') }

    // Auto-refresh notifications every 30 seconds
    const interval = setInterval(() => {
      loadAll()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadAll() {
    // Load posts separately to avoid one failure killing everything
    const postsRes = await supabase.from('posts').select('id, content, post_type, created_at, user_id').order('created_at', { ascending: false }).limit(50)
    
    const [usersRes, verifRes, claimsRes, reportsRes, txRes, tasksRes, teamsRes, staffRes, withdrawRes, taskSubRes, consultRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, display_name, is_verified, specialty, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('verification_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('business_claims').select('*, businesses(name)').order('created_at', { ascending: false }),
      supabase.from('reports').select('*, posts(content)').order('created_at', { ascending: false }).limit(30),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('admin_teams').select('*').order('created_at'),
      supabase.from('admin_users').select('*').order('created_at'),
      supabase.from('withdrawal_requests').select('*, profiles(full_name, display_name)').order('created_at', { ascending: false }),
      supabase.from('task_submissions').select('*, tasks(title), profiles(full_name, display_name)').order('created_at', { ascending: false }).limit(20),
      supabase.from('consultations').select('*, profiles!consultations_patient_id_fkey(full_name, display_name)').eq('status', 'paid').order('created_at', { ascending: false }).limit(20),
    ])
    setUsers(usersRes.data || [])
    setVerifications(verifRes.data || [])
    setClaims(claimsRes.data || [])
    setReports(reportsRes.data || [])
    setPosts(postsRes.data || [])
    setTransactions(txRes.data || [])
    setTasks(tasksRes.data || [])
    setTeams(teamsRes.data || [])
    setStaff(staffRes.data || [])
    setWithdrawals(withdrawRes.data || [])

    // Build notification feed
    const allNotifs = [
      ...(verifRes.data || []).filter(v => v.status === 'pending').map(v => ({ id: v.id, type: 'verification', icon: '🩺', title: `Verification request from ${v.full_name}`, subtitle: v.profession, time: v.created_at, severity: 'warning', tab: 'verifications', role: 'verification_officer' })),
      ...(claimsRes.data || []).filter(c => c.status === 'pending').map(c => ({ id: c.id, type: 'claim', icon: '🏥', title: `Business claim: ${c.businesses?.name}`, subtitle: 'Pending approval', time: c.created_at, severity: 'warning', tab: 'claims', role: 'business_manager' })),
      ...(reportsRes.data || []).filter(r => r.status === 'pending').map(r => ({ id: r.id, type: 'report', icon: '🚩', title: `Post reported: ${r.reason}`, subtitle: r.posts?.content?.slice(0, 60), time: r.created_at, severity: 'urgent', tab: 'reports', role: 'moderator' })),
      ...(withdrawRes.data || []).filter(w => w.status === 'pending').map(w => ({ id: w.id, type: 'withdrawal', icon: '💰', title: `Withdrawal request: ₦${(w.amount * 200).toLocaleString()}`, subtitle: w.profiles?.full_name || 'User', time: w.created_at, severity: 'warning', tab: 'withdrawals', role: 'super_admin' })),
      ...(taskSubRes.data || []).filter(s => s.status === 'pending').map(s => ({ id: s.id, type: 'task', icon: '📋', title: `Task submission: ${s.tasks?.title}`, subtitle: s.profiles?.full_name || 'Professional', time: s.created_at, severity: 'info', tab: 'tasks', role: 'super_admin' })),
      ...(consultRes.data || []).map(c => ({ id: c.id, type: 'consultation', icon: '📅', title: 'New consultation booking', subtitle: c.profiles?.full_name || 'Patient', time: c.created_at, severity: 'info', tab: 'overview', role: 'verification_officer' })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time))

    setNotifications(allNotifs)
    const rev = (txRes.data || []).filter(t => t.type === 'topup').reduce((s, t) => s + (t.naira_amount || 0), 0)
    const pendingVerifs = (verifRes.data || []).filter(v => v.status === 'pending').length
    const pendingClaims = (claimsRes.data || []).filter(c => c.status === 'pending').length
    const openReports = (reportsRes.data || []).filter(r => r.status === 'pending').length

    setStats({
      users: usersRes.data?.length || 0,
      posts: postsRes.data?.length || 0,
      pendingVerifs,
      pendingClaims,
      reports: openReports,
      revenue: rev / 100,
      transactions: txRes.data?.length || 0,
    })

    const pendingWithdrawals = (withdrawRes.data || []).filter(w => w.status === 'pending').length
    const pendingTaskSubs = (taskSubRes.data || []).filter(s => s.status === 'pending').length
    const newConsults = (consultRes.data || []).length

    // Super admin sees all notifications
    const totalNotifs = pendingVerifs + pendingClaims + openReports + pendingWithdrawals + pendingTaskSubs
    setNotifCount(totalNotifs)

    // Role-specific notifications
    const role = JSON.parse(localStorage.getItem('admin_user') || '{}').role || ''
    if (role === 'super_admin') setRoleNotifCount(totalNotifs)
    else if (role === 'verification_officer') setRoleNotifCount(pendingVerifs + newConsults)
    else if (role === 'business_manager') setRoleNotifCount(pendingClaims)
    else if (role === 'moderator' || role === 'content_manager') setRoleNotifCount(openReports)
    else if (role === 'analytics_manager') setRoleNotifCount(pendingWithdrawals)
    else setRoleNotifCount(0)

    setLoading(false)
  }

  async function approveVerif(id, userId, profession) {
    await supabase.from('verification_requests').update({ status: 'approved' }).eq('id', id)
    await supabase.from('profiles').update({ is_verified: true, verification_label: profession, specialty: profession }).eq('id', userId)
    loadAll()
  }

  async function rejectVerif(id) {
    await supabase.from('verification_requests').update({ status: 'rejected' }).eq('id', id)
    loadAll()
  }

  async function approveClaim(id, businessId) {
    await supabase.from('business_claims').update({ status: 'approved' }).eq('id', id)
    await supabase.from('businesses').update({ visible_on_carefind: true }).eq('id', businessId)
    loadAll()
  }

  async function rejectClaim(id) {
    await supabase.from('business_claims').update({ status: 'rejected' }).eq('id', id)
    loadAll()
  }

  async function deletePost(id) {
    if (!window.confirm('Delete this post?')) return
    await supabase.from('posts').delete().eq('id', id)
    loadAll()
  }

  async function resolveReport(id) {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', id)
    loadAll()
  }

  async function manualVerify(userId, specialty) {
    if (!specialty) return
    await supabase.from('profiles').update({ is_verified: true, verification_label: specialty, specialty }).eq('id', userId)
    setVerifyingUser(null)
    setVerifySpecialty('')
    loadAll()
  }

  async function searchDrugs() {
    if (!drugSearch.trim()) return
    const { data: products } = await supabase.from('products').select('id, name').ilike('name', `%${drugSearch}%`).limit(5)
    if (!products?.length) { setDrugReviews([]); return }
    setDrugName(products[0].name)
    const { data: reviews } = await supabase.from('product_reviews').select('*').in('product_id', products.map(p => p.id)).order('created_at', { ascending: false })
    setDrugReviews(reviews || [])
  }

  async function createTask() {
    if (!taskTitle || !taskDesc || !taskComp) return
    setSavingTask(true)
    await supabase.from('tasks').insert({ title: taskTitle, description: taskDesc, compensation: parseInt(taskComp), specialty: taskSpec || null })
    setTaskTitle(''); setTaskDesc(''); setTaskComp(''); setTaskSpec('')
    setSavingTask(false); loadAll()
  }

  async function createStaff(e) {
    e.preventDefault(); setSavingStaff(true); setStaffMsg('')
    const { error } = await supabase.from('admin_users').insert({
      email: staffEmail.toLowerCase(), password_hash: hashPassword(staffPass),
      full_name: staffName, role: staffRole, team_id: staffTeam || null,
    })
    if (error) { setStaffMsg('Error: ' + error.message) } else {
      setStaffMsg('Staff account created!')
      setStaffName(''); setStaffEmail(''); setStaffPass(''); setStaffRole('moderator'); setStaffTeam('')
      loadAll()
    }
    setSavingStaff(false)
  }

  async function createTeam(e) {
    e.preventDefault()
    await supabase.from('admin_teams').insert({ name: teamName })
    setTeamName(''); loadAll()
  }

  function exportCSV(data, filename) {
    if (!data.length) return
    const keys = Object.keys(data[0])
    const csv = [keys.join(','), ...data.map(row => keys.map(k => `"${(row[k] || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <p style={{ color: '#64748b' }}>Loading...</p>
    </div>
  )

  const TABS = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'verifications', label: `🩺 Verify (${stats.pendingVerifs || 0})` },
    { key: 'claims', label: `🏥 Claims (${stats.pendingClaims || 0})` },
    { key: 'reports', label: `🚩 Reports (${stats.reports || 0})` },
    { key: 'users', label: '👥 Users' },
    { key: 'posts', label: '📝 Posts' },
    { key: 'revenue', label: '💰 Revenue' },
    { key: 'drugs', label: '💊 Drug Intel' },
    { key: 'tasks', label: '📋 Tasks' },
    { key: 'teams', label: '👨‍💼 Teams' },
    { key: 'withdrawals', label: `💰 Withdrawals (${withdrawals.filter(w => w.status === 'pending').length})` },
    { key: 'notifications', label: `🔔 All Alerts (${notifCount})` },
  ]

  const btnStyle = (active) => ({
    flexShrink: 0, padding: '7px 12px', borderRadius: 18, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    border: active ? 'none' : `1px solid ${theme.border}`,
    background: active ? theme.tealGradient : theme.bg,
    color: active ? '#fff' : theme.textMid,
  })

  const card = { border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, background: theme.cardBg, marginBottom: 10 }
  const input = { width: '100%', padding: 10, fontSize: 13, border: `1px solid ${theme.border}`, borderRadius: 10, boxSizing: 'border-box' }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ background: theme.heroGradient, padding: '20px 16px 16px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0 0 2px 0', fontSize: 19, fontWeight: 900 }}>CareFind Admin</h1>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{adminUser?.full_name} · {adminUser?.role?.replace('_', ' ')}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {roleNotifCount > 0 && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setTab('overview')} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  🔔
                </button>
                <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0f766e' }}>
                  {roleNotifCount > 99 ? '99+' : roleNotifCount}
                </div>
              </div>
            )}
            <button onClick={() => { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user'); navigate('/admin') }}
              style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', overflowX: 'auto', background: '#fff', borderBottom: `1px solid ${theme.border}`, WebkitOverflowScrolling: 'touch' }}>
        {TABS.map(t => <button key={t.key} onClick={() => setTab(t.key)} style={btnStyle(tab === t.key)}>{t.label}</button>)}
      </div>

      <div style={{ padding: '14px 14px 0' }}>

        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[
                { label: 'Total Users', value: stats.users, icon: '👥', tab: 'users' },
                { label: 'Total Posts', value: stats.posts, icon: '📝', tab: 'posts' },
                { label: 'Pending Verifs', value: stats.pendingVerifs, icon: '🩺', alert: stats.pendingVerifs > 0, tab: 'verifications' },
                { label: 'Open Reports', value: stats.reports, icon: '🚩', alert: stats.reports > 0, tab: 'reports' },
                { label: 'Transactions', value: stats.transactions, icon: '💳', tab: 'revenue' },
                { label: 'Revenue', value: `₦${(stats.revenue || 0).toLocaleString()}`, icon: '💰', tab: 'revenue' },
              ].map(s => (
                <div key={s.label} onClick={() => setTab(s.tab)} style={{ border: `1px solid ${s.alert ? '#fca5a5' : theme.border}`, borderRadius: 14, padding: 14, background: s.alert ? '#fef2f2' : theme.cardBg, textAlign: 'center', cursor: 'pointer' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: 20 }}>{s.icon}</p>
                  <p style={{ margin: '0 0 2px 0', fontSize: 20, fontWeight: 900, color: s.alert ? theme.alert : theme.navy }}>{s.value}</p>
                  <p style={{ margin: 0, fontSize: 10, color: theme.textLight, fontWeight: 700 }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: 14, background: theme.cardBg, marginTop: 4 }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 800, fontSize: 13, color: theme.navy }}>📅 Filter by Date</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: theme.textLight, fontWeight: 700, display: 'block', marginBottom: 3 }}>From</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: '100%', padding: 8, fontSize: 12, border: `1px solid ${theme.border}`, borderRadius: 8, boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: theme.textLight, fontWeight: 700, display: 'block', marginBottom: 3 }}>To</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: '100%', padding: 8, fontSize: 12, border: `1px solid ${theme.border}`, borderRadius: 8, boxSizing: 'border-box' }} />
                </div>
              </div>
              {(dateFrom || dateTo) && (
                <div>
                  <p style={{ margin: '0 0 6px 0', fontSize: 12, color: theme.textMid, fontWeight: 600 }}>Activity in range:</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { label: 'Posts', value: posts.filter(p => (!dateFrom || p.created_at >= dateFrom) && (!dateTo || p.created_at <= dateTo + 'T23:59:59')).length },
                      { label: 'Users', value: users.filter(u => (!dateFrom || u.created_at >= dateFrom) && (!dateTo || u.created_at <= dateTo + 'T23:59:59')).length },
                      { label: 'Transactions', value: transactions.filter(t => (!dateFrom || t.created_at >= dateFrom) && (!dateTo || t.created_at <= dateTo + 'T23:59:59')).length },
                    ].map(s => (
                      <div key={s.label} style={{ flex: 1, background: '#ecfdf5', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 2px 0', fontSize: 18, fontWeight: 900, color: theme.tealDeep }}>{s.value}</p>
                        <p style={{ margin: 0, fontSize: 10, color: theme.textLight, fontWeight: 700 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setDateFrom(''); setDateTo('') }} style={{ marginTop: 8, padding: '5px 10px', background: 'none', border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 11, color: theme.textLight }}>Clear filter</button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'verifications' && (
          <div>
            {verifications.length === 0 && <p style={{ color: theme.textLight, fontSize: 13 }}>No verification requests yet.</p>}
            {verifications.map(v => (
              <div key={v.id} style={{ ...card, border: `1px solid ${v.status === 'pending' ? '#fca5a5' : theme.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <p style={{ margin: '0 0 2px 0', fontWeight: 800, fontSize: 14, color: theme.navy }}>{v.full_name}</p>
                    <p style={{ margin: '0 0 2px 0', fontSize: 12, color: theme.tealDeep, fontWeight: 700 }}>{v.profession}</p>
                    {v.phone && <p style={{ margin: '0 0 2px 0', fontSize: 11.5, color: theme.textLight }}>{v.phone} · {v.workplace}</p>}
                    <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>{timeAgo(v.created_at)}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, height: 'fit-content', background: v.status === 'approved' ? '#ecfdf5' : v.status === 'rejected' ? '#fef2f2' : '#fef3c7', color: v.status === 'approved' ? theme.success : v.status === 'rejected' ? theme.alert : '#92400e' }}>{v.status}</span>
                </div>
                {v.credential_url && <a href={v.credential_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginBottom: 10, fontSize: 12, color: theme.tealDeep, fontWeight: 700 }}>📎 View Credential</a>}
                {v.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => approveVerif(v.id, v.user_id, v.profession)} style={{ flex: 1, padding: 9, background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>✓ Approve</button>
                    <button onClick={() => rejectVerif(v.id)} style={{ flex: 1, padding: 9, background: '#fef2f2', color: theme.alert, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>✕ Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'claims' && (
          <div>
            {claims.length === 0 && <p style={{ color: theme.textLight, fontSize: 13 }}>No business claims yet.</p>}
            {claims.map(c => (
              <div key={c.id} style={{ ...card, border: `1px solid ${c.status === 'pending' ? '#fca5a5' : theme.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <p style={{ margin: '0 0 2px 0', fontWeight: 800, fontSize: 14, color: theme.navy }}>{c.businesses?.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>{timeAgo(c.created_at)}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: c.status === 'approved' ? '#ecfdf5' : c.status === 'rejected' ? '#fef2f2' : '#fef3c7', color: c.status === 'approved' ? theme.success : c.status === 'rejected' ? theme.alert : '#92400e' }}>{c.status}</span>
                </div>
                {c.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => approveClaim(c.id, c.business_id)} style={{ flex: 1, padding: 9, background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>✓ Approve</button>
                    <button onClick={() => rejectClaim(c.id)} style={{ flex: 1, padding: 9, background: '#fef2f2', color: theme.alert, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>✕ Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'reports' && (
          <div>
            {reports.length === 0 && <p style={{ color: theme.textLight, fontSize: 13 }}>No reports yet.</p>}
            {reports.map(r => (
              <div key={r.id} style={{ ...card, border: `1px solid ${r.status === 'pending' ? '#fca5a5' : theme.border}` }}>
                <p style={{ margin: '0 0 4px 0', fontSize: 11, color: theme.alert, fontWeight: 800 }}>🚩 {r.reason}</p>
                <p style={{ margin: '0 0 8px 0', fontSize: 13, color: theme.textMid }}>{r.posts?.content?.slice(0, 120)}</p>
                <p style={{ margin: '0 0 10px 0', fontSize: 11, color: theme.textLight }}>{timeAgo(r.created_at)}</p>
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => deletePost(r.post_id)} style={{ flex: 1, padding: 8, background: '#fef2f2', color: theme.alert, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 12 }}>🗑️ Delete Post</button>
                    <button onClick={() => resolveReport(r.id)} style={{ flex: 1, padding: 8, background: theme.bg, color: theme.textMid, border: `1px solid ${theme.border}`, borderRadius: 10, fontWeight: 700, fontSize: 12 }}>✓ Dismiss</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'users' && (
          <div>
            <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users..." style={{ ...input, marginBottom: 12 }} />
            {users.filter(u => !userSearch || (u.full_name || u.display_name || '').toLowerCase().includes(userSearch.toLowerCase())).map(u => (
              <div key={u.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <p style={{ margin: '0 0 2px 0', fontWeight: 700, fontSize: 13.5, color: theme.navy }}>{u.full_name || u.display_name || 'No name'}</p>
                    {u.specialty && <p style={{ margin: '0 0 2px 0', fontSize: 12, color: theme.tealDeep, fontWeight: 700 }}>{u.specialty}</p>}
                    <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>{timeAgo(u.created_at)}</p>
                  </div>
                  {u.is_verified && <span style={{ fontSize: 9.5, fontWeight: 800, color: theme.tealDeep, background: '#ecfdf5', padding: '2px 7px', borderRadius: 20 }}>✓ Verified</span>}
                </div>
                {!u.is_verified && (
                  verifyingUser === u.id ? (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <input value={verifySpecialty} onChange={(e) => setVerifySpecialty(e.target.value)} placeholder="Specialty (e.g. Pharmacist)" style={{ flex: 1, padding: '6px 8px', fontSize: 12, border: `1px solid ${theme.tealDeep}`, borderRadius: 8 }} />
                      <button onClick={() => manualVerify(u.id, verifySpecialty)} style={{ padding: '6px 10px', background: theme.tealDeep, color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>✓</button>
                      <button onClick={() => { setVerifyingUser(null); setVerifySpecialty('') }} style={{ padding: '6px 8px', background: theme.bg, color: theme.textMid, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 11 }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setVerifyingUser(u.id)} style={{ padding: '6px 12px', background: theme.tealDeep, color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                      ✓ Verify
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'posts' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input type="text" value={postSearch} onChange={(e) => setPostSearch(e.target.value)} placeholder="Search posts..." style={{ ...input, flex: 1 }} />
              <button onClick={() => exportCSV(posts, 'posts.csv')} style={{ padding: '0 12px', background: theme.tealDeep, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>Export</button>
            </div>
            {posts.filter(p => !postSearch || p.content?.toLowerCase().includes(postSearch.toLowerCase())).map(p => (
              <div key={p.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase' }}>{p.post_type}</span>
                  <span style={{ fontSize: 11, color: theme.textLight }}>{timeAgo(p.created_at)}</span>
                </div>
                <p style={{ margin: '0 0 4px 0', fontSize: 12, color: theme.textLight }}>User ID: {p.user_id?.slice(0,8)}...</p>
                <p style={{ margin: '0 0 8px 0', fontSize: 13, color: theme.textMid }}>{p.content?.slice(0, 150)}</p>
                <button onClick={() => deletePost(p.id)} style={{ padding: '6px 12px', background: '#fef2f2', color: theme.alert, border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>🗑️ Delete</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'revenue' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button onClick={() => exportCSV(transactions, 'transactions.csv')} style={{ padding: '8px 14px', background: theme.tealDeep, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>Export CSV</button>
            </div>
            {transactions.map(t => (
              <div key={t.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: '0 0 2px 0', fontWeight: 700, fontSize: 13, color: theme.navy, textTransform: 'capitalize' }}>{t.type?.replace('_', ' ')}</p>
                  <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>{timeAgo(t.created_at)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 2px 0', fontWeight: 900, fontSize: 14, color: theme.success }}>{t.amount} 🪙</p>
                  {t.naira_amount && <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>₦{(t.naira_amount / 100).toLocaleString()}</p>}
                </div>
              </div>
            ))}
            {transactions.length === 0 && <p style={{ color: theme.textLight, fontSize: 13 }}>No transactions yet.</p>}
          </div>
        )}

        {tab === 'drugs' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input type="text" value={drugSearch} onChange={(e) => setDrugSearch(e.target.value)} placeholder="Search medication..." style={{ ...input, flex: 1 }} />
              <button onClick={searchDrugs} style={{ padding: '0 14px', background: theme.tealDeep, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>Search</button>
            </div>
            {drugReviews.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: theme.navy }}>{drugName} — {drugReviews.length} reviews</p>
                  <button onClick={() => exportCSV(drugReviews, `${drugName}_reviews.csv`)} style={{ padding: '6px 10px', background: theme.tealDeep, color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>Export</button>
                </div>
                {drugReviews.map(r => (
                  <div key={r.id} style={card}>
                    <p style={{ margin: '0 0 4px 0', color: '#f59e0b', fontSize: 13 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                    {r.comment && <p style={{ margin: 0, fontSize: 13, color: theme.textMid }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'tasks' && (
          <div>
            <div style={card}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 800, fontSize: 14, color: theme.navy }}>Create Sponsored Task</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task Title" style={input} />
                <input type="number" value={taskComp} onChange={(e) => setTaskComp(e.target.value)} placeholder="Compensation (₦)" style={input} />
                <input value={taskSpec} onChange={(e) => setTaskSpec(e.target.value)} placeholder="Target Specialty (optional)" style={input} />
                <textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} placeholder="Task description..." rows={3} style={{ ...input, resize: 'none', fontFamily: 'inherit' }} />
                <button onClick={createTask} disabled={savingTask} style={{ padding: 11, background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 13 }}>
                  {savingTask ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </div>
            {tasks.map(t => (
              <div key={t.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 13.5, color: theme.navy }}>{t.title}</p>
                  <p style={{ margin: 0, fontWeight: 900, fontSize: 13, color: theme.success }}>₦{t.compensation?.toLocaleString()}</p>
                </div>
                <p style={{ margin: '0 0 4px 0', fontSize: 12, color: theme.textMid }}>{t.description?.slice(0, 100)}</p>
                {t.specialty && <p style={{ margin: 0, fontSize: 11, color: theme.tealDeep, fontWeight: 700 }}>{t.specialty}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === 'teams' && (
          <div>
            <div style={card}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 800, fontSize: 14, color: theme.navy }}>Create Team</p>
              <form onSubmit={createTeam} style={{ display: 'flex', gap: 8 }}>
                <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team name..." required style={{ ...input, flex: 1 }} />
                <button type="submit" style={{ padding: '0 14px', background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>Add</button>
              </form>
            </div>

            <div style={{ ...card, marginTop: 12 }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 800, fontSize: 14, color: theme.navy }}>Add Staff Member</p>
              {staffMsg && <p style={{ color: staffMsg.startsWith('Error') ? theme.alert : theme.success, fontSize: 13, margin: '0 0 8px 0' }}>{staffMsg}</p>}
              <form onSubmit={createStaff} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Full Name" required style={input} />
                <input type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="Email" required style={input} />
                <input type="password" value={staffPass} onChange={(e) => setStaffPass(e.target.value)} placeholder="Password" required style={input} />
                <select value={staffRole} onChange={(e) => setStaffRole(e.target.value)} style={{ ...input, background: '#fff' }}>
                  <option value="moderator">🛡️ Content Moderator</option>
                  <option value="verification_officer">🩺 Verification Officer</option>
                  <option value="business_manager">🏥 Business Manager</option>
                  <option value="support_agent">💬 Support Agent</option>
                  <option value="analytics_manager">📊 Analytics Manager</option>
                </select>
                <select value={staffTeam} onChange={(e) => setStaffTeam(e.target.value)} style={{ ...input, background: '#fff' }}>
                  <option value="">No team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button type="submit" disabled={savingStaff} style={{ padding: 11, background: theme.navy, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 13 }}>
                  {savingStaff ? 'Creating...' : 'Create Staff Account'}
                </button>
              </form>
            </div>

            {teams.map(t => (
              <div key={t.id} style={{ ...card, marginTop: 12 }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 800, fontSize: 14, color: theme.navy }}>{t.name}</p>
                {staff.filter(s => s.team_id === t.id).map(m => (
                  <div key={m.id} style={{ padding: '8px 0', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ margin: '0 0 1px 0', fontSize: 13, fontWeight: 700, color: theme.navy }}>{m.full_name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: theme.tealDeep, fontWeight: 700 }}>{m.role}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: m.is_active ? '#ecfdf5' : '#fef2f2', color: m.is_active ? theme.success : theme.alert }}>
                      {m.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                ))}
                {staff.filter(s => s.team_id === t.id).length === 0 && <p style={{ color: theme.textLight, fontSize: 12, margin: 0 }}>No members yet</p>}
              </div>
            ))}

            {staff.filter(s => s.role === 'super_admin').map(m => (
              <div key={m.id} style={{ border: '1px solid #e9d5ff', borderRadius: 12, padding: 12, background: '#faf5ff', marginTop: 12 }}>
                <p style={{ margin: '0 0 2px 0', fontWeight: 800, fontSize: 13, color: '#7c3aed' }}>👑 {m.full_name}</p>
                <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>{m.email} · Super Admin · Last login: {timeAgo(m.last_login)}</p>
              </div>
            ))}
          </div>
        )}


        {tab === 'withdrawals' && (
          <div>
            {withdrawals.length === 0 && <p style={{ color: theme.textLight, fontSize: 13 }}>No withdrawal requests yet.</p>}
            {withdrawals.map(w => (
              <div key={w.id} style={{ ...card, border: `1px solid ${w.status === 'pending' ? '#fca5a5' : theme.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <p style={{ margin: '0 0 2px 0', fontWeight: 800, fontSize: 14, color: theme.navy }}>{w.profiles?.full_name || 'User'}</p>
                    <p style={{ margin: '0 0 2px 0', fontSize: 13, color: theme.tealDeep, fontWeight: 700 }}>₦{(w.amount * 200).toLocaleString()}</p>
                    {w.bank_name && <p style={{ margin: '0 0 2px 0', fontSize: 12, color: theme.textLight }}>{w.bank_name} · {w.account_number}</p>}
                    {w.account_name && <p style={{ margin: '0 0 2px 0', fontSize: 12, color: theme.textLight }}>{w.account_name}</p>}
                    <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>{timeAgo(w.created_at)}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, height: 'fit-content', background: w.status === 'approved' ? '#ecfdf5' : w.status === 'rejected' ? '#fef2f2' : '#fef3c7', color: w.status === 'approved' ? theme.success : w.status === 'rejected' ? theme.alert : '#92400e' }}>{w.status}</span>
                </div>
                {w.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={async () => { await supabase.from('withdrawal_requests').update({ status: 'approved' }).eq('id', w.id); loadAll() }} style={{ flex: 1, padding: 9, background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>✓ Approve</button>
                    <button onClick={async () => { await supabase.from('withdrawal_requests').update({ status: 'rejected' }).eq('id', w.id); loadAll() }} style={{ flex: 1, padding: 9, background: '#fef2f2', color: theme.alert, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>✕ Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'notifications' && (
          <div>
            {notifications.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <p style={{ fontSize: 30, margin: '0 0 10px 0' }}>🔔</p>
                <p style={{ color: theme.textLight, fontSize: 13 }}>All clear — no pending issues</p>
              </div>
            )}
            {notifications.map((n, i) => (
              <div key={i} onClick={() => setTab(n.tab)} style={{ ...card, cursor: 'pointer', borderLeft: `4px solid ${n.severity === 'urgent' ? theme.alert : n.severity === 'warning' ? '#f59e0b' : theme.tealDeep}` }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 20 }}>{n.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 2px 0', fontWeight: 700, fontSize: 13, color: theme.navy }}>{n.title}</p>
                    {n.subtitle && <p style={{ margin: '0 0 4px 0', fontSize: 12, color: theme.textMid }}>{n.subtitle}</p>}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: theme.textLight }}>{timeAgo(n.time)}</span>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 20, background: n.severity === 'urgent' ? '#fef2f2' : n.severity === 'warning' ? '#fef3c7' : '#ecfdf5', color: n.severity === 'urgent' ? theme.alert : n.severity === 'warning' ? '#92400e' : theme.tealDeep, textTransform: 'uppercase' }}>{n.severity}</span>
                    </div>
                  </div>
                  <span style={{ color: theme.textLight, fontSize: 14 }}>›</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
