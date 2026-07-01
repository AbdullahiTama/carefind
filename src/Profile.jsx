import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import { theme } from './lib/theme'
import BottomNav from './BottomNav.jsx'

function Profile() {
  const { user, signOut, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ full_name: '', display_name: '', bio: '', location: '', website: '' })
  const [postCount, setPostCount] = useState(0)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isNewUser, setIsNewUser] = useState(false)

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()

      if (data) {
        setProfile(data)
        setForm({
          full_name: data.full_name || '',
          display_name: data.display_name || '',
          bio: data.bio || '',
          location: data.location || '',
          website: data.website || '',
        })
        // If no real name set yet, prompt to edit
        if (!data.full_name && !data.display_name) setIsNewUser(true)
      }

      const [postsRes, followersRes, followingRes] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
      ])
      setPostCount(postsRes.count || 0)
      setFollowerCount(followersRes.count || 0)
      setFollowingCount(followingRes.count || 0)
    }
    if (!authLoading) load()
  }, [user, authLoading])

  async function compressImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxSize = 400
          let { width, height } = img
          if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize } }
          else { if (height > maxSize) { width *= maxSize / height; height = maxSize } }
          canvas.width = width
          canvas.height = height
          canvas.getContext('2d').drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.75)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')

    try {
      const compressed = await compressImage(file)
      const filePath = `${user.id}-${Date.now()}.jpg`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, compressed, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id)
      setProfile((prev) => ({ ...prev, avatar_url: urlData.publicUrl }))
    } catch (err) {
      setError('Upload failed. Please try a smaller image.')
    }
    setUploading(false)
  }

  async function handleSave() {
    if (!form.full_name.trim() && !form.display_name.trim()) {
      setError('Please enter at least your name or username.')
      return
    }
    setSaving(true)
    setError('')

    const { error: updateError } = await supabase.from('profiles').update({
      full_name: form.full_name.trim(),
      display_name: form.display_name.trim(),
      bio: form.bio.trim(),
      location: form.location.trim(),
      website: form.website.trim(),
    }).eq('id', user.id)

    if (updateError) {
      setError('Username may already be taken.')
    } else {
      setProfile((prev) => ({ ...prev, ...form }))
      setEditing(false)
      setIsNewUser(false)
    }
    setSaving(false)
  }

  async function handleLogout() {
    await signOut()
    navigate('/')
  }

  if (authLoading) return <div style={{ padding: 20, fontFamily: 'system-ui' }}>Loading...</div>

  if (!user) {
    return (
      <div style={{ padding: 20, fontFamily: 'system-ui', maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ color: theme.textMid }}>Log in to view your profile.</p>
        <Link to="/login" style={{ color: theme.tealDeep, fontWeight: 700 }}>Log In</Link>
        <BottomNav />
      </div>
    )
  }

  const displayName = profile?.full_name || profile?.display_name || user.email?.split('@')[0]
  const username = profile?.display_name

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>

      {/* New user prompt */}
      {isNewUser && !editing && (
        <div style={{ background: '#fef3c7', padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#92400e', fontWeight: 600 }}>👋 Complete your profile to get started</p>
          <button onClick={() => setEditing(true)} style={{ background: theme.tealDeep, color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700 }}>Set up</button>
        </div>
      )}

      {/* Cover + Avatar */}
      <div style={{ position: 'relative', marginBottom: 60 }}>
        <div style={{ height: 120, background: theme.heroGradient }} />
        <div style={{ position: 'absolute', bottom: -50, left: 16, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%',
              background: profile?.avatar_url ? `url(${profile.avatar_url})` : theme.tealGradient,
              backgroundSize: 'cover', backgroundPosition: 'center',
              border: '4px solid #fff', boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 30, fontWeight: 800,
            }}>
              {!profile?.avatar_url && (displayName?.[0]?.toUpperCase() || '?')}
            </div>
            <label style={{
              position: 'absolute', bottom: 2, right: 2, background: theme.tealDeep, color: '#fff',
              borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, cursor: 'pointer', border: '2px solid #fff',
            }}>
              {uploading ? '...' : '✎'}
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: -46, right: 16 }}>
          {!editing ? (
            <button onClick={() => setEditing(true)} style={{
              border: `1px solid ${theme.border}`, background: '#fff', color: theme.navy,
              borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 700,
            }}>
              Edit Profile
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving} style={{
              background: theme.tealGradient, color: '#fff', border: 'none',
              borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 700,
            }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '0 16px 16px 16px' }}>
        {!editing ? (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: theme.navy, margin: '0 0 2px 0' }}>{displayName}</h1>
            {username && <p style={{ margin: '0 0 6px 0', fontSize: 13, color: theme.textLight }}>@{username}</p>}
            {profile?.is_verified && (
              <span style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, background: '#ecfdf5', padding: '2px 10px', borderRadius: 20, border: `1px solid ${theme.tealBright}` }}>
                ✓ Verified {profile.verification_label}
              </span>
            )}
            {profile?.bio && <p style={{ margin: '10px 0 6px 0', fontSize: 14, color: theme.textMid, lineHeight: 1.5 }}>{profile.bio}</p>}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              {profile?.location && <span style={{ fontSize: 12.5, color: theme.textLight }}>📍 {profile.location}</span>}
              {profile?.website && <a href={profile.website} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: theme.tealDeep, textDecoration: 'none' }}>🔗 {profile.website}</a>}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 20, margin: '14px 0', borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`, padding: '12px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: theme.navy }}>{postCount}</p>
                <p style={{ margin: 0, fontSize: 11, color: theme.textLight, fontWeight: 600 }}>Posts</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: theme.navy }}>{followerCount}</p>
                <p style={{ margin: 0, fontSize: 11, color: theme.textLight, fontWeight: 600 }}>Followers</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: theme.navy }}>{followingCount}</p>
                <p style={{ margin: 0, fontSize: 11, color: theme.textLight, fontWeight: 600 }}>Following</p>
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Full Name', key: 'full_name', placeholder: 'Your real name' },
              { label: 'Username', key: 'display_name', placeholder: '@username' },
              { label: 'Bio', key: 'bio', placeholder: 'A short bio about you...' },
              { label: 'Location', key: 'location', placeholder: 'Lagos, Nigeria' },
              { label: 'Website', key: 'website', placeholder: 'https://yourwebsite.com' },
            ].map((field) => (
              <div key={field.key}>
                <label style={{ fontSize: 11, color: theme.textLight, fontWeight: 700 }}>{field.label}</label>
                <input
                  type="text"
                  value={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  style={{ width: '100%', padding: 10, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 12, marginTop: 3 }}
                />
              </div>
            ))}
            {error && <p style={{ color: theme.alert, fontSize: 13 }}>{error}</p>}
            <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', color: theme.textLight, fontSize: 13 }}>Cancel</button>
          </div>
        )}

        {/* Profile links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: '🪙', label: 'My Wallet & CareCoins', to: '/wallet' },
            { icon: '🔖', label: 'Saved Posts', to: '/saved' },
            { icon: '📊', label: 'My Activity (Posts & Reviews)', to: '/dashboard' },
            { icon: '🩺', label: 'Become a Verified Professional', to: '/verify' },
            { icon: '🏥', label: 'Register or Claim a Business', to: '/claim-business' },
            { icon: '🏪', label: 'Business Dashboard', to: '/business-dashboard' },
            { icon: '🩺', label: 'Professional Dashboard', to: '/professional-dashboard' },
          ].map((item) => (
            <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
              <div style={{
                border: `1px solid ${theme.border}`, borderRadius: 14, padding: '12px 14px', display: 'flex',
                alignItems: 'center', gap: 10, background: theme.cardBg, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{item.icon}</span>
                <span style={{ fontSize: 13.5, color: theme.textMid, fontWeight: 600, flex: 1 }}>{item.label}</span>
                <span style={{ color: theme.textLight, fontSize: 14 }}>›</span>
              </div>
            </Link>
          ))}
        </div>

        <p style={{ margin: '6px 0 0 0', fontSize: 11.5, color: theme.textLight, textAlign: 'center' }}>{user.email}</p>
        <button onClick={handleLogout} style={{ marginTop: 10, padding: '12px', width: '100%', background: '#fef2f2', color: theme.alert, border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 14 }}>
          Log Out
        </button>
      </div>

      <BottomNav />
    </div>
  )
}

export default Profile
