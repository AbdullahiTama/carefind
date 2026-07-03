import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import { theme } from './lib/theme'
import BottomNav from './BottomNav.jsx'
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

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadProfile()
  }, [user])

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
      </div>

      <BottomNav />
    </div>
  )
}

export default Profile
