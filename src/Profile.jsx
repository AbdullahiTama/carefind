import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import { theme } from './lib/theme'
import BottomNav from './BottomNav.jsx'
import { renderRichText, stripMarkers } from './richText.jsx'
import ProductUpload from './ProductUpload.jsx'
import { getActiveBusiness, setActiveBusiness, clearActiveBusiness } from './lib/activeIdentity'

function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [ownedBusinesses, setOwnedBusinesses] = useState([])
  const [postCount, setPostCount] = useState(0)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [walletBalance, setWalletBalance] = useState(0)
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [activeBiz, setActiveBiz] = useState(getActiveBusiness())
  const [activeTab, setActiveTab] = useState('posts')
  const [myPosts, setMyPosts] = useState([])
  const [savedPosts, setSavedPosts] = useState([])
  const [myPlaylists, setMyPlaylists] = useState([])
  const [tabLoading, setTabLoading] = useState(false)
  const [openPost, setOpenPost] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [myStories, setMyStories] = useState([])
  const [myShows, setMyShows] = useState([])
  const [now, setNow] = useState(Date.now())
  const [storyComposer, setStoryComposer] = useState(false)
  const [sTitle, setSTitle] = useState('')
  const [sBody, setSBody] = useState('')
  const [sBg, setSBg] = useState('#0f766e')
  const [sImage, setSImage] = useState(null)
  const [postingStory, setPostingStory] = useState(false)
  const [viewStory, setViewStory] = useState(null)
  const [productUpload, setProductUpload] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadProfile()
    loadMyPosts()
    loadSavedPosts()
    loadMyPlaylists()
    loadMyStories()
    loadMyShows()
  }, [user])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  async function loadMyPosts() {
    if (!user) return
    const { data } = await supabase
      .from('posts')
      .select('id, content, created_at, post_type, image_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(60)
    setMyPosts(data || [])
  }

  async function loadSavedPosts() {
    if (!user) return
    const { data } = await supabase
      .from('saved_posts')
      .select('post_id, posts(id, content, created_at, post_type, image_url)')
      .eq('user_id', user.id)
      .limit(60)
    setSavedPosts((data || []).map(s => s.posts).filter(Boolean))
  }

  async function loadMyPlaylists() {
    if (!user) return
    const { data } = await supabase
      .from('playlists')
      .select('id, title, description, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    setMyPlaylists(data || [])
  }

  async function loadMyStories() {
    if (!user) return
    const { data } = await supabase
      .from('stories')
      .select('id, title, body, image_url, bg_color, created_at')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    setMyStories(data || [])
  }

  async function loadMyShows() {
    if (!user) return
    const { data } = await supabase
      .from('live_shows')
      .select('id, title, status, scheduled_at')
      .eq('host_id', user.id)
      .in('status', ['live', 'scheduled'])
      .order('scheduled_at', { ascending: true })
    setMyShows(data || [])
  }

  async function postStory() {
    if (!sTitle.trim() && !sBody.trim() && !sImage) return
    setPostingStory(true)
    let imageUrl = null
    if (sImage) {
      const ext = sImage.name.split('.').pop()
      const path = `user-${user.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('story-images').upload(path, sImage)
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('story-images').getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }
    }
    const expiresAt = new Date(Date.now() + 24 * 3600000).toISOString()
    const { error } = await supabase.from('stories').insert({
      title: sTitle.trim() || null, body: sBody.trim() || null,
      image_url: imageUrl, bg_color: sBg, is_platform: false,
      user_id: user.id, expires_at: expiresAt,
    })
    setPostingStory(false)
    if (!error) {
      setSTitle(''); setSBody(''); setSBg('#0f766e'); setSImage(null); setStoryComposer(false)
      loadMyStories()
    } else {
      alert('Could not post story: ' + error.message)
    }
  }

  async function loadProfile() {
    setLoading(true)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, display_name, is_verified, verification_label, location, website, cover_url')
      .eq('id', user.id)
      .maybeSingle()

    if (profileData) {
      setProfile(profileData)
      setFullName(profileData.full_name || '')
      setDisplayName(profileData.display_name || '')
      setLocation(profileData.location || '')
      setWebsite(profileData.website || '')
    }

    const [bizRes, postRes, followerRes, followingRes, walletRes] = await Promise.all([
      supabase.from('businesses').select('id, name, business_type, cover_url, visible_on_carefind').eq('owner_id', user.id),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
      supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
    ])

    setOwnedBusinesses(bizRes.data || [])
    setPostCount(postRes.count || 0)
    setFollowerCount(followerRes.count || 0)
    setFollowingCount(followingRes.count || 0)
    setWalletBalance(walletRes.data?.balance || 0)
    setLoading(false)
  }

  async function saveProfile() {
    setSaving(true)
    await supabase.from('profiles').update({
      full_name: fullName.trim(),
      display_name: displayName.trim(),
      location: location.trim() || null,
      website: website.trim() || null,
    }).eq('id', user.id)
    setEditing(false)
    setSaving(false)
    loadProfile()
  }

  async function handleCoverUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingCover(true)
    const ext = file.name.split('.').pop()
    const path = `cover-${user.id}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('covers').upload(path, file)
    if (!upErr) {
      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path)
      await supabase.from('profiles').update({ cover_url: urlData.publicUrl }).eq('id', user.id)
      loadProfile()
    }
    setUploadingCover(false)
  }

  function switchToBusiness(biz) {
    setActiveBusiness(biz)
    setActiveBiz({ id: biz.id, name: biz.name })
  }

  function switchToPersonal() {
    clearActiveBusiness()
    setActiveBiz(null)
  }

  async function handleSignOut() {
    clearActiveBusiness()
    await signOut()
    navigate('/login')
  }

  if (loading) return <div style={{ padding: 20, fontFamily: 'system-ui' }}>Loading...</div>

  const displayLabel = profile?.full_name || profile?.display_name || 'CareFind User'

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>
      {/* Posting-as banner */}
      {activeBiz && (
        <div style={{ background: theme.navy, color: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🏢</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800 }}>Posting as {activeBiz.name}</p>
            <p style={{ margin: 0, fontSize: 10.5, color: 'rgba(255,255,255,0.6)' }}>Your posts, comments & news use this business</p>
          </div>
          <button onClick={switchToPersonal} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 16, padding: '6px 12px', fontSize: 11, fontWeight: 800 }}>
            Switch back
          </button>
        </div>
      )}

      {/* Cover */}
      <div style={{ position: 'relative', marginBottom: 55 }}>
        <div style={{ height: 120, background: profile?.cover_url ? `url(${profile.cover_url})` : theme.heroGradient, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
          <label style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.4)', color: '#fff', borderRadius: 16, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            {uploadingCover ? 'Uploading…' : '📷 Cover'}
            <input type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} />
          </label>
        </div>
        <div style={{ position: 'absolute', bottom: -46, left: 16 }}>
          <div style={{ width: 88, height: 88, borderRadius: '50%', background: theme.tealGradient, border: '4px solid #fff', boxShadow: '0 2px 10px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 30, fontWeight: 800 }}>
            {displayLabel[0]?.toUpperCase() || '?'}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Name + edit */}
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" style={{ padding: 11, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 10 }} />
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Username" style={{ padding: 11, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 10 }} />
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" style={{ padding: 11, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 10 }} />
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website" style={{ padding: 11, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 10 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveProfile} disabled={saving} style={{ flex: 1, padding: 11, background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 13 }}>{saving ? 'Saving…' : 'Save'}</button>
              <button onClick={() => setEditing(false)} style={{ flex: 1, padding: 11, background: theme.bg, color: theme.textMid, border: `1px solid ${theme.border}`, borderRadius: 10, fontWeight: 700, fontSize: 13 }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 900, color: theme.navy, margin: '0 0 2px 0' }}>{displayLabel}</h1>
                {profile?.display_name && <p style={{ margin: '0 0 4px 0', fontSize: 13, color: theme.textLight }}>@{profile.display_name}</p>}
                {profile?.is_verified && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, background: '#ecfdf5', padding: '2px 10px', borderRadius: 20, border: `1px solid ${theme.tealBright}` }}>
                    ✓ Verified {profile.verification_label}
                  </span>
                )}
              </div>
              <button onClick={() => setEditing(true)} style={{ border: `1px solid ${theme.border}`, background: '#fff', color: theme.navy, borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 700 }}>Edit</button>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
              {profile?.location && <span style={{ fontSize: 12.5, color: theme.textLight }}>📍 {profile.location}</span>}
              {profile?.website && <a href={profile.website} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: theme.tealDeep, textDecoration: 'none' }}>🔗 {profile.website}</a>}
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 20, borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`, padding: '12px 0', marginBottom: 16 }}>
          <div><p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: theme.navy }}>{postCount}</p><p style={{ margin: 0, fontSize: 11, color: theme.textLight, fontWeight: 600 }}>Posts</p></div>
          <div><p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: theme.navy }}>{followerCount}</p><p style={{ margin: 0, fontSize: 11, color: theme.textLight, fontWeight: 600 }}>Followers</p></div>
          <div><p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: theme.navy }}>{followingCount}</p><p style={{ margin: 0, fontSize: 11, color: theme.textLight, fontWeight: 600 }}>Following</p></div>
        </div>

        {/* My Stories */}
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
          <button onClick={() => setStoryComposer(true)} style={{ flexShrink: 0, width: 62, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
            <div style={{ width: 58, height: 58, borderRadius: '50%', background: theme.bg, border: `2px dashed ${theme.tealDeep}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: theme.tealDeep }}>+</div>
            <span style={{ fontSize: 10, fontWeight: 700, color: theme.textMid }}>Add story</span>
          </button>

          {/* Live / upcoming shows */}
          {myShows.map((s) => {
            if (s.status === 'live') {
              return (
                <Link key={s.id} to={`/live-show/${s.id}`} style={{ flexShrink: 0, width: 62, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                  <div style={{ width: 58, height: 58, borderRadius: '50%', padding: 2, background: '#dc2626' }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: theme.navy, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>📡</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#dc2626' }}>● LIVE</span>
                </Link>
              )
            }
            // scheduled
            const diff = s.scheduled_at ? new Date(s.scheduled_at) - now : 0
            const d = Math.max(0, Math.floor(diff / 86400000))
            const h = Math.max(0, Math.floor((diff % 86400000) / 3600000))
            const m = Math.max(0, Math.floor((diff % 3600000) / 60000))
            const label = diff <= 0 ? 'soon' : d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
            return (
              <Link key={s.id} to={`/live-show/${s.id}`} style={{ flexShrink: 0, width: 62, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                <div style={{ width: 58, height: 58, borderRadius: '50%', padding: 2, background: theme.navy, position: 'relative' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: theme.tealGradient, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>⏳</div>
                  <span style={{ position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)', background: theme.navy, color: '#fff', fontSize: 8, fontWeight: 900, padding: '1px 5px', borderRadius: 8, whiteSpace: 'nowrap' }}>{label}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: theme.navy }}>Upcoming</span>
              </Link>
            )
          })}

          {myStories.map((s) => (
            <button key={s.id} onClick={() => setViewStory(s)} style={{ flexShrink: 0, width: 62, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
              <div style={{ width: 58, height: 58, borderRadius: '50%', padding: 2, background: 'linear-gradient(135deg, #0d9488, #f59e0b)' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: s.image_url ? `url(${s.image_url}) center/cover` : (s.bg_color || theme.tealDeep), border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 800 }}>{!s.image_url && (s.title?.[0] || '📖')}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: theme.textMid, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title || 'Story'}</span>
            </button>
          ))}
        </div>

        {/* Account menu toggle */}
        <button onClick={() => setMenuOpen(m => !m)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 12, marginBottom: 14, cursor: 'pointer' }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: theme.navy }}>☰ Account, Wallet & Businesses</span>
          <span style={{ fontSize: 13, color: theme.textLight }}>{menuOpen ? '▲' : '▼'}</span>
        </button>

        {menuOpen && (<>
        {/* Wallet */}
        <Link to="/wallet" style={{ textDecoration: 'none' }}>
          <div style={{ background: theme.heroGradient, borderRadius: 16, padding: 16, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0 0 2px 0', fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>CareCoins Balance</p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#fff' }}>{walletBalance} 🪙</p>
            </div>
            <span style={{ color: '#fff', fontSize: 20 }}>›</span>
          </div>
        </Link>

        {/* Sell on MedMarket (verified only) */}
        {profile?.is_verified && (
          <button onClick={() => setProductUpload(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 12, marginBottom: 16, cursor: 'pointer' }}>
            <span style={{ fontSize: 13.5, fontWeight: 800 }}>🛒 Add a product to MedMarket</span>
            <span>›</span>
          </button>
        )}

        {/* My Businesses + Post-as switcher */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>My Businesses</p>
            <Link to="/business-dashboard" style={{ fontSize: 12, color: theme.tealDeep, fontWeight: 700, textDecoration: 'none' }}>Manage →</Link>
          </div>

          {ownedBusinesses.length === 0 && (
            <div style={{ border: `1px dashed ${theme.border}`, borderRadius: 14, padding: 16, textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: 13, color: theme.textLight }}>You don't manage any businesses yet.</p>
              <Link to="/claim-business" style={{ fontSize: 12.5, color: theme.tealDeep, fontWeight: 700, textDecoration: 'none' }}>Claim a business →</Link>
            </div>
          )}

          {/* Personal identity option */}
          {ownedBusinesses.length > 0 && (
            <div
              onClick={switchToPersonal}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, border: `1px solid ${!activeBiz ? theme.tealDeep : theme.border}`, background: !activeBiz ? '#ecfdf5' : theme.cardBg, marginBottom: 8, cursor: 'pointer' }}
            >
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: theme.tealGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>
                {displayLabel[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: theme.navy }}>{displayLabel} <span style={{ fontSize: 11, color: theme.textLight, fontWeight: 600 }}>(you)</span></p>
                <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>Personal account</p>
              </div>
              {!activeBiz && <span style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep }}>✓ Active</span>}
            </div>
          )}

          {/* Business identity options */}
          {ownedBusinesses.map((b) => {
            const isActive = activeBiz?.id === b.id
            return (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, border: `1px solid ${isActive ? theme.tealDeep : theme.border}`, background: isActive ? '#ecfdf5' : theme.cardBg, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: b.cover_url ? `url(${b.cover_url})` : theme.navy, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                  {!b.cover_url && (b.name?.[0]?.toUpperCase() || '🏢')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: theme.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: theme.textLight, textTransform: 'capitalize' }}>{b.business_type}</p>
                </div>
                {isActive ? (
                  <span style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep }}>✓ Active</span>
                ) : (
                  <button onClick={() => switchToBusiness(b)} style={{ background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 16, padding: '6px 12px', fontSize: 11, fontWeight: 800 }}>
                    Post as
                  </button>
                )}
              </div>
            )
          })}
        </div>
        </>)}

        {/* Content tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}`, marginBottom: 12 }}>
          {[['posts', '📝 Posts'], ['reposts', '🔁 Reposts'], ['saved', '🔖 Saved'], ['playlists', '🎬 Playlists']].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ flex: 1, padding: '10px 4px', background: 'none', border: 'none', borderBottom: activeTab === key ? `2px solid ${theme.tealDeep}` : '2px solid transparent', color: activeTab === key ? theme.navy : theme.textLight, fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Playlists tab */}
        {activeTab === 'playlists' && (
          <div style={{ marginBottom: 16 }}>
            {profile?.is_verified && (
              <Link to="/playlist/create" style={{ display: 'block', textAlign: 'center', padding: 12, background: theme.tealGradient, color: '#fff', borderRadius: 12, fontWeight: 800, fontSize: 13, textDecoration: 'none', marginBottom: 12 }}>
                🎬 Create a Playlist
              </Link>
            )}
            {myPlaylists.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: 13, color: theme.textLight, padding: '20px 0' }}>{profile?.is_verified ? 'No playlists yet. Create your first series!' : 'No playlists yet.'}</p>
            ) : (
              myPlaylists.map(pl => (
                <Link key={pl.id} to={`/playlist/${pl.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 12, marginBottom: 8, textDecoration: 'none' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: theme.heroGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🎬</div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: theme.navy }}>{pl.title}</p>
                    {pl.description && <p style={{ margin: '2px 0 0 0', fontSize: 11.5, color: theme.textLight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.description}</p>}
                  </div>
                  <span style={{ color: theme.textLight }}>›</span>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Content grid */}
        {activeTab !== 'playlists' && (() => {
          const list = activeTab === 'saved' ? savedPosts : activeTab === 'reposts' ? myPosts.filter(p => (p.content || '').startsWith('🔁')) : myPosts.filter(p => !(p.content || '').startsWith('🔁'))
          if (list.length === 0) {
            return <p style={{ textAlign: 'center', fontSize: 13, color: theme.textLight, padding: '24px 0' }}>Nothing here yet.</p>
          }
          const typeIcon = { question: '❓', review: '⭐', article: '📄', premium: '💎' }
          return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {list.map(p => (
                <button key={p.id} onClick={() => setOpenPost(p)} style={{ textAlign: 'left', padding: 0, background: 'none', border: 'none', cursor: 'pointer' }}>
                  <div style={{ border: `1px solid ${theme.border}`, borderRadius: 12, overflow: 'hidden', background: theme.cardBg, height: 150, display: 'flex', flexDirection: 'column' }}>
                    {p.image_url ? (
                      <div style={{ height: 80, background: `url(${p.image_url}) center/cover` }} />
                    ) : (
                      <div style={{ height: 80, background: theme.heroGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{typeIcon[p.post_type] || '💬'}</div>
                    )}
                    <div style={{ padding: '8px 10px', flex: 1, overflow: 'hidden' }}>
                      {p.post_type && p.post_type !== 'text' && <span style={{ fontSize: 9, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase' }}>{typeIcon[p.post_type]} {p.post_type}</span>}
                      <p style={{ margin: '2px 0 0 0', fontSize: 11.5, color: theme.navy, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{stripMarkers((p.content || '').replace(/^🔁\s*/, ''))}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )
        })()}

        {menuOpen && (<>
        {/* Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
          <Link to="/saved" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 4px', textDecoration: 'none', color: theme.navy, borderBottom: `1px solid ${theme.border}` }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>🔖 Saved posts</span>
            <span style={{ color: theme.textLight }}>›</span>
          </Link>
          {!profile?.is_verified && (
            <Link to="/verify" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 4px', textDecoration: 'none', color: theme.navy, borderBottom: `1px solid ${theme.border}` }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>🩺 Get verified</span>
              <span style={{ color: theme.textLight }}>›</span>
            </Link>
          )}
          <Link to="/earn" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 4px', textDecoration: 'none', color: theme.navy, borderBottom: `1px solid ${theme.border}` }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>💰 Earn on CareFind</span>
            <span style={{ color: theme.textLight }}>›</span>
          </Link>
        </div>

        <button onClick={handleSignOut} style={{ width: '100%', padding: 13, background: '#fef2f2', color: theme.alert, border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, marginBottom: 8 }}>
          Sign Out
        </button>
        </>)}
      </div>

      {openPost && (
        <div onClick={() => setOpenPost(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 440, maxHeight: '80vh', overflowY: 'auto', padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setOpenPost(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: theme.textLight }}>✕</button>
            </div>
            {openPost.image_url && <img src={openPost.image_url} alt="" style={{ width: '100%', borderRadius: 12, marginBottom: 12, display: 'block' }} />}
            {openPost.post_type && openPost.post_type !== 'text' && <span style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase' }}>{openPost.post_type}</span>}
            <p style={{ margin: '6px 0 0 0', fontSize: 15, color: theme.navy, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{renderRichText((openPost.content || '').replace(/^🔁\s*/, ''))}</p>
            <p style={{ margin: '12px 0 0 0', fontSize: 11, color: theme.textLight }}>{openPost.created_at ? new Date(openPost.created_at).toLocaleDateString() : ''}</p>
          </div>
        </div>
      )}

      {/* Story composer */}
      {storyComposer && (
        <div onClick={() => setStoryComposer(false)} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: 20, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: theme.navy }}>Add to your story</h3>
              <button onClick={() => setStoryComposer(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: theme.textLight }}>✕</button>
            </div>
            <div style={{ background: sBg, borderRadius: 14, padding: 20, marginBottom: 12, minHeight: 90 }}>
              <input value={sTitle} onChange={(e) => setSTitle(e.target.value)} placeholder="Story title…" style={{ width: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 17, fontWeight: 800, outline: 'none', marginBottom: 6, boxSizing: 'border-box' }} />
              <textarea value={sBody} onChange={(e) => setSBody(e.target.value)} placeholder="Say something…" rows={2} style={{ width: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {['#0f766e', '#1e293b', '#be185d', '#0369a1', '#166534', '#b45309'].map(c => (
                <button key={c} onClick={() => setSBg(c)} style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: sBg === c ? '3px solid #333' : 'none' }} />
              ))}
            </div>
            <label style={{ display: 'block', fontSize: 12.5, color: theme.tealDeep, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
              📷 {sImage ? sImage.name.slice(0, 24) : 'Add a photo (optional)'}
              <input type="file" accept="image/*" onChange={(e) => setSImage(e.target.files[0] || null)} style={{ display: 'none' }} />
            </label>
            <button onClick={postStory} disabled={postingStory} style={{ width: '100%', padding: 13, background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14 }}>
              {postingStory ? 'Posting…' : 'Post story'}
            </button>
          </div>
        </div>
      )}

      {/* Story viewer */}
      {viewStory && (
        <div onClick={() => setViewStory(null)} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: viewStory.image_url ? '#000' : (viewStory.bg_color || theme.tealDeep), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          {viewStory.image_url && <img src={viewStory.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 12, marginBottom: 16 }} />}
          {viewStory.title && <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 900, textAlign: 'center', margin: '0 0 10px 0' }}>{viewStory.title}</h2>}
          {viewStory.body && <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>{viewStory.body}</p>}
          <button onClick={() => setViewStory(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: '50%', width: 34, height: 34, fontSize: 18 }}>✕</button>
        </div>
      )}

      {productUpload && (
        <ProductUpload businesses={ownedBusinesses} onClose={() => setProductUpload(false)} onAdded={() => {}} />
      )}

      <BottomNav />
    </div>
  )
}

export default Profile
