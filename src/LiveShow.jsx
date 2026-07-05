import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import { theme } from './lib/theme'
import BottomNav from './BottomNav.jsx'
import GiftPanel from './GiftPanel.jsx'
import SupportPrompt from './SupportPrompt.jsx'

function LiveShow() {
  const { id } = useParams()
  const { user } = useAuth()
  const [show, setShow] = useState(null)
  const [items, setItems] = useState([])
  const [comments, setComments] = useState([])
  const [commentDraft, setCommentDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [likeCount, setLikeCount] = useState(0)
  const [shareCount, setShareCount] = useState(0)
  const [giftTotal, setGiftTotal] = useState(0)
  const [topGifters, setTopGifters] = useState([])
  const [hearts, setHearts] = useState([])
  const [gifting, setGifting] = useState(false)
  const [reposted, setReposted] = useState(false)
  const pollRef = useRef(null)
  const heartId = useRef(0)

  function formatCount(n) {
    n = n || 0
    if (n < 1000) return `${n}`
    if (n < 1000000) return `${(n / 1000).toFixed(n < 10000 ? 1 : 0)}k`.replace('.0k', 'k')
    return `${(n / 1000000).toFixed(1)}M`.replace('.0M', 'M')
  }

  const isHost = user && show && (user.id === show.host_id || user.id === show.guest_id)

  useEffect(() => {
    loadShow()
    // Poll every 4 seconds for new items + comments (the "live" feel)
    pollRef.current = setInterval(() => {
      loadItems()
      loadComments()
      loadStats()
    }, 4000)
    return () => clearInterval(pollRef.current)
  }, [id])

  async function loadStats() {
    const [likeRes, shareRes, giftRes] = await Promise.all([
      supabase.from('live_reactions').select('id', { count: 'exact', head: true }).eq('show_id', id),
      supabase.from('live_shares').select('id', { count: 'exact', head: true }).eq('show_id', id),
      supabase.from('live_gifts').select('amount, sender_id, profiles(full_name, display_name)').eq('show_id', id),
    ])
    setLikeCount(likeRes.count || 0)
    setShareCount(shareRes.count || 0)
    const gifts = giftRes.data || []
    setGiftTotal(gifts.reduce((sum, g) => sum + (g.amount || 0), 0))
    // Top gifters: sum by sender
    const byUser = {}
    gifts.forEach(g => {
      if (!g.sender_id) return
      const name = g.profiles?.full_name || g.profiles?.display_name || 'Someone'
      byUser[g.sender_id] = byUser[g.sender_id] || { name, total: 0 }
      byUser[g.sender_id].total += (g.amount || 0)
    })
    setTopGifters(Object.values(byUser).sort((a, b) => b.total - a.total).slice(0, 3))
  }

  async function loadLikes() { loadStats() }

  function spawnHeart(xPercent) {
    const baseLeft = xPercent != null ? xPercent : (20 + Math.random() * 55)
    const emojis = ['❤️', '💚', '💛', '🧡', '💜', '💖', '💗']
    // Burst: spawn 3-5 hearts per tap, varied size/position/drift
    const burst = 3 + Math.floor(Math.random() * 3)
    for (let k = 0; k < burst; k++) {
      const hid = heartId.current++
      const left = Math.max(5, Math.min(90, baseLeft + (Math.random() * 40 - 20)))
      const emoji = emojis[Math.floor(Math.random() * emojis.length)]
      const size = 28 + Math.floor(Math.random() * 34)   // 28–62px, much bigger
      const drift = Math.floor(Math.random() * 80 - 40)  // horizontal drift
      const dur = 2.2 + Math.random() * 1.3              // varied speed
      const delay = k * 60                                // slight stagger
      setTimeout(() => {
        setHearts(prev => [...prev, { id: hid, left, emoji, size, drift, dur }])
        setTimeout(() => setHearts(prev => prev.filter(h => h.id !== hid)), dur * 1000)
      }, delay)
    }
  }

  async function tapLike() {
    spawnHeart()
    setLikeCount(c => c + 1)
    await supabase.from('live_reactions').insert({ show_id: id, user_id: user?.id || null })
  }

  // Tap anywhere on the show area to send a heart + like
  async function tapAnywhere(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    spawnHeart(Math.max(10, Math.min(85, xPct)))
    setLikeCount(c => c + 1)
    supabase.from('live_reactions').insert({ show_id: id, user_id: user?.id || null })
  }

  async function shareLive() {
    setShareCount(c => c + 1)
    supabase.from('live_shares').insert({ show_id: id, user_id: user?.id || null })
    if (navigator.share) {
      try { await navigator.share({ title: show?.title || 'CareFind Live', text: 'Watch this live on CareFind', url: window.location.href }) } catch (e) {}
    }
  }

  async function repostLive() {
    if (!user) { window.location.href = '/login'; return }
    if (reposted) return
    setReposted(true)
    // Repost as a post on the user's profile linking to the live show
    await supabase.from('posts').insert({
      user_id: user.id,
      content: `🔁 Reposted a live show: ${show?.title || 'CareFind Live'}\n${window.location.href}`,
      post_type: 'text',
    })
  }

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
    await loadStats()
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
      <div onClick={isLive ? tapAnywhere : undefined} style={{ padding: '16px 16px 8px', cursor: isLive ? 'pointer' : 'default' }}>
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
              {it.kind === 'slide' ? (
                <div style={{ maxWidth: '100%' }}>
                  {(() => {
                    const [surl, num, total] = (it.content || '').split('|||')
                    return (
                      <div style={{ border: `2px solid ${theme.tealDeep}`, borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
                        <div style={{ background: theme.tealDeep, color: '#fff', padding: '5px 12px', fontSize: 11, fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
                          <span>📑 SLIDE {num || '?'}{total ? ` / ${total}` : ''}</span>
                        </div>
                        <img src={surl} alt={`Slide ${num}`} style={{ width: '100%', display: 'block' }} />
                      </div>
                    )
                  })()}
                </div>
              ) : (
              <div style={{ background: theme.bg, borderRadius: 14, padding: (it.kind === 'image' || it.kind === 'video') ? 4 : '10px 14px', display: 'inline-block', maxWidth: '100%' }}>
                {it.kind === 'text' && <p style={{ margin: 0, fontSize: 14.5, color: theme.textDark, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{it.content}</p>}
                {it.kind === 'image' && <img src={it.content} alt="live" style={{ maxWidth: '100%', borderRadius: 11, display: 'block' }} />}
                {it.kind === 'voice' && (
                  <audio controls preload="metadata" playsInline src={it.content} style={{ height: 40, maxWidth: 240 }} />
                )}
                {it.kind === 'video' && (
                  <video controls playsInline preload="metadata" src={it.content} style={{ maxWidth: '100%', borderRadius: 11, display: 'block' }} />
                )}
              </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Floating hearts overlay */}
      <style>{`
        @keyframes floatUpBig {
          0% { transform: translateY(0) translateX(0) scale(0.4) rotate(0deg); opacity: 0; }
          12% { opacity: 1; transform: translateY(-30px) scale(1.3) rotate(-8deg); }
          50% { opacity: 1; }
          100% { transform: translateY(-340px) translateX(var(--drift)) scale(1) rotate(12deg); opacity: 0; }
        }
      `}</style>
      <div style={{ position: 'fixed', bottom: 120, left: 0, right: 0, maxWidth: 480, margin: '0 auto', height: 0, pointerEvents: 'none', zIndex: 500 }}>
        {hearts.map(h => (
          <span key={h.id} style={{
            position: 'absolute', bottom: 0, left: `${h.left}%`, fontSize: h.size,
            '--drift': `${h.drift}px`,
            animation: `floatUpBig ${h.dur}s ease-out forwards`,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
          }}>{h.emoji}</span>
        ))}
      </div>

      {/* Live engagement bar */}
      {isLive && (
        <div style={{ borderTop: `1px solid ${theme.border}`, borderBottom: `8px solid ${theme.bg}` }}>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', padding: '10px 8px 4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: theme.textMid, fontWeight: 700 }}>❤️ {formatCount(likeCount)} likes</span>
            <span style={{ fontSize: 12, color: theme.textMid, fontWeight: 700 }}>🔗 {formatCount(shareCount)} shares</span>
            {giftTotal > 0 && <span style={{ fontSize: 12, color: theme.tealDeep, fontWeight: 800 }}>🎁 {formatCount(giftTotal)} gifted</span>}
          </div>

          {/* Top gifters */}
          {topGifters.length > 0 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '0 8px 8px', flexWrap: 'wrap' }}>
              {topGifters.map((g, i) => (
                <span key={i} style={{ fontSize: 10.5, fontWeight: 700, color: theme.navy, background: '#fef9c3', padding: '2px 8px', borderRadius: 12 }}>
                  {['🥇', '🥈', '🥉'][i]} {g.name} · {formatCount(g.total)}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '4px 8px 10px' }}>
            <button onClick={tapLike} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
              <span style={{ fontSize: 22 }}>❤️</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: theme.textMid }}>Like</span>
            </button>
            <button onClick={() => user ? setGifting(true) : (window.location.href = '/login')} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
              <span style={{ fontSize: 22 }}>🎁</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: theme.textMid }}>Gift</span>
            </button>
            <button onClick={shareLive} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
              <span style={{ fontSize: 22 }}>🔗</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: theme.textMid }}>Share</span>
            </button>
            <button onClick={repostLive} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
              <span style={{ fontSize: 22 }}>🔁</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: reposted ? theme.tealDeep : theme.textMid }}>{reposted ? 'Reposted' : 'Repost'}</span>
            </button>
          </div>
          <p style={{ margin: 0, textAlign: 'center', fontSize: 10, color: theme.textLight, paddingBottom: 8 }}>💡 Tap anywhere on the show above to send hearts</p>
        </div>
      )}

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

      {show.host_id && <SupportPrompt onGift={() => user ? setGifting(true) : (window.location.href = '/login')} creatorName={hostName()} />}

      {gifting && (
        <GiftPanel postId={show.id} recipientId={show.host_id} onClose={() => { setGifting(false); loadStats() }} />
      )}

      <BottomNav />
    </div>
  )
}

export default LiveShow
