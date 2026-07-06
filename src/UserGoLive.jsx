import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import { theme } from './lib/theme'

// Lets a verified user create and host their own live show, then enter the
// full control room (LiveDashboard) where slides, voice, video, and
// engagement all work. Creates the show in the live_shows system.
function UserGoLive({ onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function goLive() {
    if (!title.trim()) { setError('Give your show a title.'); return }
    if (!user) { setError('You must be logged in.'); return }
    setCreating(true)
    setError('')
    // Create the show hosted by this user
    const { data: show, error: insErr } = await supabase.from('live_shows').insert({
      title: title.trim(),
      status: 'live',
      host_id: user.id,
      is_platform: false,
      started_at: new Date().toISOString(),
    }).select().maybeSingle()
    if (insErr || !show) {
      setError('Could not start the show: ' + (insErr?.message || 'unknown error'))
      setCreating(false)
      return
    }
    // Register the host as a participant so the dashboard admits them
    await supabase.from('live_participants').insert({ show_id: show.id, user_id: user.id, role: 'host', joined: true })
    setCreating(false)
    onClose && onClose()
    // Enter the full control room
    navigate(`/live-dashboard/${show.id}`)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 480, padding: 22, boxSizing: 'border-box' }}>
        <div style={{ width: 40, height: 4, background: theme.border, borderRadius: 2, margin: '0 auto 18px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#dc2626' }} />
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: theme.navy }}>Go Live</h2>
        </div>
        <p style={{ margin: '0 0 16px 0', fontSize: 13, color: theme.textMid }}>Start a live show. You'll get the full control room — post text, voice notes, slides, and video, with live audience engagement.</p>

        {error && <p style={{ margin: '0 0 10px 0', fontSize: 12.5, color: theme.alert, fontWeight: 600 }}>{error}</p>}

        <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: theme.textMid, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Show title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Managing Diabetes: Live Q&A"
          style={{ width: '100%', padding: '12px 14px', fontSize: 15, border: `1px solid ${theme.border}`, borderRadius: 12, boxSizing: 'border-box', marginBottom: 18, fontFamily: 'inherit' }}
        />

        <button onClick={goLive} disabled={creating} style={{ width: '100%', padding: 14, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15 }}>
          {creating ? 'Starting…' : '🔴 Go Live Now'}
        </button>
        <button onClick={onClose} style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: theme.textLight, fontSize: 13, fontWeight: 600 }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default UserGoLive
