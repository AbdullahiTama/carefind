  async function loadAll() {
    // Load posts and profiles separately to isolate any failures
    const postsRes = await supabase.from('posts').select('id, content, post_type, created_at, user_id').order('created_at', { ascending: false }).limit(50)
    const usersRes2 = await supabase.from('profiles').select('id, full_name, display_name, is_verified, specialty, created_at, location, bio, avatar_url').order('created_at', { ascending: false }).limit(100)
    if (usersRes2.data) setUsers(usersRes2.data)

    const [usersRes, verifRes, claimsRes, reportsRes, txRes, tasksRes, teamsRes, staffRes, withdrawRes, taskSubRes, consultRes, bizRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('verification_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('business_claims').select('*, businesses(name)').order('created_at', { ascending: false }),
      supabase.from('reports').select('*, posts(content)').order('created_at', { ascending: false }).limit(30),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('admin_teams').select('*').order('created_at'),
      supabase.from('businesses').select('id, name, business_type, city, state, whatsapp, visible_on_carefind, created_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('admin_users').select('*').order('created_at'),
      supabase.from('withdrawal_requests').select('*, profiles(full_name, display_name)').order('created_at', { ascending: false }),
      supabase.from('task_submissions').select('*, tasks(title), profiles(full_name, display_name)').order('created_at', { ascending: false }).limit(20),
      supabase.from('consultations').select('*, profiles!consultations_patient_id_fkey(full_name, display_name)').eq('status', 'paid').order('created_at', { ascending: false }).limit(20),
    ])
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
    setBusinesses(bizRes.data || [])
    const rev = (txRes.data || []).filter(t => t.type === 'topup').reduce((s, t) => s + (t.naira_amount || 0), 0)
    const pendingVerifs = (verifRes.data || []).filter(v => v.status === 'pending').length
    const pendingClaims = (claimsRes.data || []).filter(c => c.status === 'pending').length
    const openReports = (reportsRes.data || []).filter(r => r.status === 'pending').length

    setStats({
      users: usersRes.count ?? usersRes2.data?.length ?? 0,
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
