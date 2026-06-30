import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'

function Profile() {
  const { user, signOut, loading } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()
      if (data) setUsername(data.display_name || '')
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

  async function handleSaveUsername() {
    if (!username.trim()) return
    setSaving(true)
    setError('')

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ display_name: username.trim() })
      .eq('id', user.id)

    if (updateError) {
      setError('That username may already be taken, or something went wrong.')
    } else {
      setEditing(false)
    }
    setSaving(false)
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 400, margin: '0 auto', padding: 20 }}>
      <Link to="/" style={{ color: '#0f766e', textDecoration: 'none', fontSize: 14 }}>← Back</Link>

      <h1 style={{ fontSize: 22, margin: '16px 0 4px 0' }}>My Profile</h1>
      <p style={{ color: '#666', marginBottom: 4 }}>{user.email}</p>

      <div style={{ marginBottom: 20 }}>
        {editing ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              style={{ flex: 1, padding: 8, fontSize: 14, border: '1px solid #ccc', borderRadius: 8 }}
            />
            <button
              onClick={handleSaveUsername}
              disabled={saving}
              style={{ padding: '8px 12px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13 }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>@{username || 'set a username'}</p>
            <button
              onClick={() => setEditing(true)}
              style={{ background: 'none', border: 'none', color: '#0f766e', fontSize: 13, fontWeight: 600 }}
            >
              Edit
            </button>
          </div>
        )}
        {error && <p style={{ color: '#c0392b', fontSize: 13, marginTop: 6 }}>{error}</p>}
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
    </div>
  )
}

export default Profile
