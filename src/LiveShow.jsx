import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import { theme } from './lib/theme'
import BottomNav from './BottomNav.jsx'

function LiveShow() {
  const { id } = useParams()
  const { user } = useAuth()
  const [show, setShow] = useState(null)
  const [items, setItems] = useState([])
  const [comments, setComments] = useState([])
  const [commentDraft, setCommentDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const pollRef = useRef(null)

  const isHost = user && show && (user.id === show.host_id || user.id === show.guest_id)

  useEffect(() => {
    loadShow()
    // Poll every 4 seconds for new items + comments (the "live" feel)
    pollRef.current = setInterval(() => {
      loadItems()
      loadComments()
    }, 4000)
    return () => clearInterval(pollRef.current)
  }, [id])

  async function loadShow() {
    setLoading(true)
    const { data } = await supabase
      .from('live_shows')
      .select('*, host:profiles!live_shows_host_id_fkey(full_name, display_name, is_verified), guest:profiles!live_shows_guest_id_fkey(full_name, display_name)')
      .eq('id', id)
      .maybeSingle()
    setShow(data || null)
    await loadItems()
    await loadComments()
    setLoading(false)
  }

  async function loadItems() {
    const { data } = await supabase
      .from('live_items')
      .select('id, kind, content, created_at, sender_id, profiles(full_name, display_name)')
      .eq('show_id', id)
      .order('created_at', { ascending: true })
    setItems(data || [])
  }

  async function loadComments() {
    const { data } = await supabase
      .from('live_comments')
      .select('id, content, hidden, created_at, user_id, profiles(full_name, display_name, is_verified)')
      .eq('show_id', id)
      .order('created_at', { ascending: false })
      .limit(100)
    setComments(data || [])
  }

  async function postComment() {
    const text = commentDraft.trim()
    if (!text) return
    if (!user) { window.location.href = '/login'; return }
    setCommentDraft('')
    await supabase.from('live_comments').insert({ show_id: id, user_id: user.id, content: text })
    loadComments()
  }

  async function hideComment(cid) {
    await supabase.from('live_comments').update({ hidden: true }).eq('id', cid)
    loadComments()
  }

  function hostName() {
    return show?.host?.full_name || show?.host?.display_name || 'CareFind'
  }

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  if (loading) return <div style={{ padding: 20, fontFamily: 'system-ui' }}>Loading live show…</div>

  if (!show) {
    return (
      <div style={{ fontFamily: 'system-ui', maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}>📡</div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: theme.navy, margin: '0 0 6px 0' }}>Live show not found</h3>
          <Link to="/" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: theme.tealGradient, color: '#fff', borderRadius: 14, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>Back to Feed</Link>
        </div>
        <BottomNav />
      </div>
    )
  }

  const isLive = show.status === 'live'
  const visibleComments = comments.filter(c => !c.hidden || isHost)

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 90, background: '#fff' }}>
      {/* Header */}
      <div style={{ background: theme.heroGradient, padding: '18px 16px 20px', color: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>← Feed</Link>
          {isLive ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#dc2626', padding: '4px 12px', borderRadius: 20 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.05em' }}>LIVE</span>
            </div>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 20 }}>ENDED</span>
          )}
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 4px 0', lineHeight: 1.2 }}>{show.title || 'CareFind Live'}</h1>
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
          Hosted by {hostName()}{show.host?.is_verified && ' ✓'}
          {show.guest && ` · with ${show.guest.full_name || show.guest.display_name}`}
        </p>
      </div>

      {/* Live items (the show content) */}
      <div style={{ padding: '16px 16px 8px' }}>
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: theme.textLight }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>📡</div>
            <p style={{ fontSize: 13, margin: 0 }}>{isLive ? 'The show is starting… stay tuned.' : 'This show has ended.'}</p>
          </div>
        )}
        {items.map((it) => (
          <div key={it.id} style={{ marginBottom: 14, display: 'flex', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: theme.tealGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
              {(it.profiles?.full_name?.[0] || it.profiles?.display_name?.[0] || 'C').toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 4px 0', fontSize: 12, fontWeight: 800, color: theme.navy }}>
                {it.profiles?.full_name || it.profiles?.display_name || 'CareFind'}
                <span style={{ color: theme.textLight, fontWeight: 500, marginLeft: 6 }}>{timeAgo(it.created_at)}</span>
              </p>
              <div style={{ background: theme.bg, borderRadius: 14, padding: it.kind === 'image' ? 4 : '10px 14px', display: 'inline-block', maxWidth: '100%' }}>
                {it.kind === 'text' && <p style={{ margin: 0, fontSize: 14.5, color: theme.textDark, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{it.content}</p>}
                {it.kind === 'image' && <img src={it.content} alt="live" style={{ maxWidth: '100%', borderRadius: 11, display: 'block' }} />}
                {it.kind === 'voice' && (
                  <audio controls preload="metadata" playsInline src={it.content} style={{ height: 40, maxWidth: 240 }} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comments section */}
      <div style={{ borderTop: `8px solid ${theme.bg}`, marginTop: 12, padding: '14px 16px' }}>
        <p style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 800, color: theme.navy }}>💬 Live comments ({visibleComments.length})</p>

        {isLive && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') postComment() }}
              placeholder={user ? 'Add a live comment…' : 'Log in to comment'}
              disabled={!user}
              style={{ flex: 1, padding: 11, fontSize: 13, border: `1px solid ${theme.border}`, borderRadius: 20, boxSizing: 'border-box' }}
            />
            <button onClick={postComment} style={{ padding: '0 18px', background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 20, fontWeight: 800, fontSize: 13 }}>Send</button>
          </div>
        )}

        {visibleComments.length === 0 && <p style={{ fontSize: 12.5, color: theme.textLight }}>No comments yet. Be the first!</p>}
        {visibleComments.map((c) => (
          <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 12, opacity: c.hidden ? 0.4 : 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: theme.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
              {(c.profiles?.full_name?.[0] || c.profiles?.display_name?.[0] || '?').toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 1px 0', fontSize: 12 }}>
                <strong style={{ color: theme.navy }}>{c.profiles?.full_name || c.profiles?.display_name || 'User'}</strong>
                {c.profiles?.is_verified && <span style={{ color: theme.tealDeep, marginLeft: 3 }}>✓</span>}
                <span style={{ color: theme.textLight, marginLeft: 6 }}>{timeAgo(c.created_at)}</span>
                {c.hidden && <span style={{ color: theme.alert, marginLeft: 6, fontWeight: 700 }}>(hidden)</span>}
              </p>
              <p style={{ margin: 0, fontSize: 13.5, color: theme.textMid, lineHeight: 1.4 }}>{c.content}</p>
            </div>
            {isHost && !c.hidden && (
              <button onClick={() => hideComment(c.id)} title="Hide comment" style={{ background: 'none', border: 'none', color: theme.textLight, fontSize: 13, fontWeight: 700 }}>Hide</button>
            )}
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}

export default LiveShow
