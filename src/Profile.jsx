import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import BottomNav from './BottomNav.jsx'
import { theme } from './lib/theme'

function Profile() {
  const { user, signOut, loading } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('display_name, bio, avatar_url')
        .eq('id', user.id)
        .single()
      if (data) {
        setUsername(data.display_name || '')
        setBio(data.bio || '')
        setAvatarUrl(data.avatar_url || '')
      }
    }
    loadProfile()
  }, [user])

  if (loading) return <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>Loading...</div>

  if (!user) {
    return (
      <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif', maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ color: theme.textMid }}>You need to log in to view your profile.</p>
        <Link to="/login" style={{ color: theme.tealDeep, fontWeight: 700 }}>Log In / Sign Up</Link>
      </div>
    )
  }

  async function handleLogout() {
    await signOut()
    navigate('/')
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setError('Photo upload failed. Try a smaller image.')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    setAvatarUrl(urlData.publicUrl)

    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id)
    setUploading(false)
  }

  async function handleSave() {
    if (!username.trim()) return
    setSaving(true)
    setError('')

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ display_name: username.trim(), bio: bio.trim() })
      .eq('id', user.id)

    if (updateError) {
      setError('That username may already be taken, or something went wrong.')
    } else {
      setEditing(false)
    }
    setSaving(false)
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 420, margin: '0 auto', paddingBottom: 90 }}>
      <div style={{
        background: theme.heroGradient, padding: '24px 20px 60px 20px',
        borderRadius: '0 0 28px 28px', color: '#fff', textAlign: 'center', position: 'relative',
      }}>
        <Link to="/" style={{ position: 'absolute', left: 20, top: 22, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
          ← Back
        </Link>
        <p style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '30px 0 0 0' }}>
          My Profile
        </p>
      </div>

      <div style={{ textAlign: 'center', marginTop: -42, padding: '0 20px', marginBottom: 20 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div
            style={{
              width: 88, height: 88, borderRadius: '50%', background: avatarUrl ? `url(${avatarUrl})` : theme.tealGradient,
              backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 800, margin: '0 auto',
              border: '4px solid #fff', boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            }}
          >
            {!avatarUrl && (username ? username[0].toUpperCase() : '?')}
          </div>
          <label
            style={{
              position: 'absolute', bottom: 2, right: 2, background: theme.tealDeep, color: '#fff', borderRadius: '50%',
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer',
              border: '2px solid #fff',
            }}
          >
            ✎
            <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
          </label>
        </div>
        {uploading && <p style={{ fontSize: 12, color: theme.textLight, marginTop: 6 }}>Uploading...</p>}

        {!editing ? (
          <>
            <p style={{ margin: '14px 0 2px 0', fontWeight: 900, fontSize: 19, color: theme.navy }}>@{username || 'set a username'}</p>
            <p style={{ margin: '0 0 4px 0', color: theme.textLight, fontSize: 13 }}>{user.email}</p>
            {bio && <p style={{ margin: '8px 0 0 0', fontSize: 14, color: theme.textMid, lineHeight: 1.5 }}>{bio}</p>}
            <button
              onClick={() => setEditing(true)}
              style={{
                marginTop: 14, background: 'none', border: `1px solid ${theme.tealDeep}`, color: theme.tealDeep,
                borderRadius: 20, padding: '7px 18px', fontSize: 13, fontWeight: 700,
              }}
            >
              Edit Profile
            </button>
          </>
        ) : (
          <div style={{ marginTop: 14, textAlign: 'left' }}>
            <label style={{ fontSize: 11.5, color: theme.textLight, fontWeight: 700 }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              style={{ width: '100%', padding: 10, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 12, marginBottom: 12, marginTop: 4 }}
            />
            <label style={{ fontSize: 11.5, color: theme.textLight, fontWeight: 700 }}>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short bio about you..."
              rows={3}
              style={{ width: '100%', padding: 10, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 12, marginTop: 4, fontFamily: 'inherit' }}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                marginTop: 12, width: '100%', padding: 12, background: theme.tealGradient, color: '#fff',
                border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 14, boxShadow: '0 3px 8px rgba(15,118,110,0.25)',
              }}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}
        {error && <p style={{ color: theme.alert, fontSize: 13, marginTop: 8 }}>{error}</p>}
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link to="/saved" style={{ textDecoration: 'none' }}>
          <div style={{
            border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, display: 'flex',
            alignItems: 'center', gap: 12, background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}>
            <span style={{
              width: 34, height: 34, borderRadius: 10, background: theme.bg, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>
              🔖
            </span>
            <span style={{ fontSize: 13.5, color: theme.textMid, fontWeight: 600, flex: 1 }}>Saved Posts</span>
            <span style={{ color: theme.textLight, fontSize: 14 }}>›</span>
          </div>
        </Link>

        {[
          { icon: '🩺', label: 'Become a Verified Professional', to: '/verify' },
          { icon: '🏥', label: 'Register or Claim a Business', to: '/claim-business' },
        ].map((item) => (
          <Link key={item.label} to={item.to} style={{ textDecoration: 'none' }}>
            <div style={{
              border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, display: 'flex',
              alignItems: 'center', gap: 12, background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              <span style={{
                width: 34, height: 34, borderRadius: 10, background: theme.bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>
                {item.icon}
              </span>
              <span style={{ fontSize: 13.5, color: theme.textMid, fontWeight: 600, flex: 1 }}>{item.label}</span>
              <span style={{ color: theme.textLight, fontSize: 14 }}>›</span>
            </div>
          </Link>
        ))}

        <Link to="/business-dashboard" style={{ textDecoration: 'none' }}>
          <div style={{
            border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, display: 'flex',
            alignItems: 'center', gap: 12, background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}>
            <span style={{
              width: 34, height: 34, borderRadius: 10, background: theme.bg, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>
              🏪
            </span>
            <span style={{ fontSize: 13.5, color: theme.textMid, fontWeight: 600, flex: 1 }}>Business Dashboard</span>
            <span style={{ color: theme.textLight, fontSize: 14 }}>›</span>
          </div>
        </Link>

        <Link to="/dashboard" style={{ textDecoration: 'none' }}>
          <div style={{
            border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, display: 'flex',
            alignItems: 'center', gap: 12, background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}>
            <span style={{
              width: 34, height: 34, borderRadius: 10, background: theme.bg, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>
              📊
            </span>
            <span style={{ fontSize: 13.5, color: theme.textMid, fontWeight: 600, flex: 1 }}>My Activity (Posts & Reviews)</span>
            <span style={{ color: theme.textLight, fontSize: 14 }}>›</span>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          style={{
            marginTop: 14, padding: 13, width: '100%', background: '#fef2f2', color: theme.alert,
            border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 14,
          }}
        >
          Log Out
        </button>
      </div>

      <BottomNav />
    </div>
  )
}

export default Profile
