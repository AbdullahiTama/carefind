import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { theme } from './lib/theme'
import BottomNav from './BottomNav.jsx'

// Watch a playlist: a list of parts, tap to view; an "Up next" prompt to continue.
function PlaylistView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [playlist, setPlaylist] = useState(null)
  const [parts, setParts] = useState([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data: pl } = await supabase.from('playlists').select('*, profiles:owner_id(full_name, display_name, is_verified)').eq('id', id).maybeSingle()
    const { data: pts } = await supabase.from('playlist_parts').select('*').eq('playlist_id', id).order('position', { ascending: true })
    setPlaylist(pl)
    setParts(pts || [])
    setLoading(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: theme.textLight }}>Loading…</div>
  if (!playlist) return <div style={{ padding: 40, textAlign: 'center', color: theme.textLight }}>Playlist not found.</div>

  const part = parts[current]
  const hasNext = current < parts.length - 1

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 90, background: '#fff', minHeight: '100vh' }}>
      <div style={{ background: theme.heroGradient, padding: '18px 16px', color: '#fff' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>← Back</button>
        <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', marginBottom: 8 }}>🎬 PLAYLIST · {parts.length} PARTS</div>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 900 }}>{playlist.title}</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.75)' }}>
          By {playlist.profiles?.full_name || playlist.profiles?.display_name || 'CareFind'}{playlist.profiles?.is_verified && ' ✓'}
        </p>
        {playlist.description && <p style={{ margin: '8px 0 0 0', fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>{playlist.description}</p>}
      </div>

      {/* Now playing */}
      {part && (
        <div style={{ padding: 18 }}>
          <p style={{ margin: '0 0 4px 0', fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase' }}>Part {current + 1} of {parts.length}</p>
          <h2 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 800, color: theme.navy }}>{part.title}</h2>
          {part.kind === 'image' && part.media_url && <img src={part.media_url} alt="" style={{ width: '100%', borderRadius: 12, marginBottom: 12, display: 'block' }} />}
          {part.kind === 'video' && part.media_url && <video src={part.media_url} controls playsInline style={{ width: '100%', borderRadius: 12, marginBottom: 12, display: 'block' }} />}
          {part.content && <p style={{ margin: 0, fontSize: 15, color: theme.navy, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{part.content}</p>}

          {/* Up next */}
          {hasNext ? (
            <button onClick={() => setCurrent(current + 1)} style={{ width: '100%', marginTop: 20, padding: 14, background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 14, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>▶️ Up next: {parts[current + 1].title}</span>
              <span>→</span>
            </button>
          ) : (
            <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: theme.textLight, fontWeight: 600 }}>🎉 You've finished this series!</p>
          )}
        </div>
      )}

      {/* All parts list */}
      <div style={{ padding: '0 18px 18px' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: 12, fontWeight: 800, color: theme.navy, textTransform: 'uppercase', letterSpacing: '0.04em' }}>All parts</p>
        {parts.map((p, i) => (
          <button key={p.id} onClick={() => setCurrent(i)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', background: i === current ? theme.bg : '#fff', border: `1px solid ${theme.border}`, borderRadius: 10, marginBottom: 8, textAlign: 'left', cursor: 'pointer' }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: i === current ? theme.tealGradient : theme.bg, color: i === current ? '#fff' : theme.textMid, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: theme.navy, flex: 1 }}>{p.title}</span>
            {p.kind !== 'text' && <span style={{ fontSize: 14 }}>{p.kind === 'video' ? '🎥' : '🖼'}</span>}
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}

export default PlaylistView
