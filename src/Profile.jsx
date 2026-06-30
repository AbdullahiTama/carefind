import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import BottomNav from './BottomNav.jsx'

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

    await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', user.id)

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
    <div style={{ fontFamily: 'sans-serif', maxWidth: 420, margin: '0 auto', padding: 20, paddingBottom: 90 }}>
      <Link to="/" style={{ color: '#0f766e', textDecoration: 'none', fontSize: 14 }}>← Back</Link>

      <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 20 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div
            style={{
              width: 88, height: 88, borderRadius: '50%', background: avatarUrl ? `url(${avatarUrl})` : '#0f766e',
              backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 auto',
            }}
          >
            {!avatarUrl && (username ? username[0].toUpperCase() : '?')}
          </div>
          <label
            style={{
              position: 'absolute', bottom: 0, right: 0, background: '#0f766e', color: '#fff', borderRadius: '50%',
              width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer',
            }}
          >
            ✎
            <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
          </label>
        </div>
        {uploading && <p style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Uploading...</p>}

        {!editing ? (
          <>
            <p style={{ margin: '12px 0 2px 0', fontWeight: 700, fontSize: 18 }}>@{username || 'set a username'}</p>
            <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: 14 }}>{user.email}</p>
            {bio && <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#333' }}>{bio}</p>}
            <button
              onClick={() => setEditing(true)}
              style={{ marginTop: 10, background: 'none', border: '1px solid #0f766e', color: '#0f766e', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600 }}
            >
              Edit Profile
            </button>
          </>
        ) : (
          <div style={{ marginTop: 12, textAlign: 'left' }}>
            <label style={{ fontSize: 12, color: '#666' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              style={{ width: '100%', padding: 8, fontSize: 14, border: '1px solid #ccc', borderRadius: 8, marginBottom: 10, marginTop: 4 }}
            />
            <label style={{ fontSize: 12, color: '#666' }}>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short bio about you..."
              rows={3}
              style={{ width: '100%', padding: 8, fontSize: 14, border: '1px solid #ccc', borderRadius: 8, marginTop: 4, fontFamily: 'inherit' }}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ marginTop: 10, width: '100%', padding: 10, background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}
        {error && <p style={{ color: '#c0392b', fontSize: 13, marginTop: 8 }}>{error}</p>}
      </div>

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
      <BottomNav />
    </div>
  )
}

export default Profile
