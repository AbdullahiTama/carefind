import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import { theme } from './lib/theme'
import { notify } from './notify.js'

const GIFTS = [
  { emoji: '💊', name: 'Pill', coins: 1 },
  { emoji: '⭐', name: 'Star', coins: 5 },
  { emoji: '❤️', name: 'Heart', coins: 10 },
  { emoji: '🏆', name: 'Trophy', coins: 20 },
  { emoji: '🦁', name: 'Lion', coins: 100 },
  { emoji: '💎', name: 'Diamond', coins: 200 },
  { emoji: '🚀', name: 'Rocket', coins: 500 },
  { emoji: '👑', name: 'Crown', coins: 1000 },
]

function GiftAnimation({ gift, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2200)
    return () => clearTimeout(timer)
    // eslint-disable-next-line
  }, [])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none', zIndex: 9999, overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', left: '50%', top: '40%',
        transform: 'translateX(-50%)',
        animation: 'giftBurst 2.2s ease-out forwards',
        fontSize: 80, filter: 'drop-shadow(0 0 20px rgba(255,200,0,0.8))',
      }}>
        {gift.emoji}
      </div>
      <div style={{
        position: 'absolute', bottom: '35%', left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.75)', color: '#fff',
        borderRadius: 20, padding: '8px 18px', fontSize: 14, fontWeight: 800,
        whiteSpace: 'nowrap', animation: 'labelPop 2.2s ease-out forwards',
      }}>
        {gift.emoji} {gift.name} sent! 🎉
      </div>
      <style>{`
        @keyframes giftBurst {
          0% { transform: translateX(-50%) scale(0.2) translateY(60px); opacity: 0; }
          20% { transform: translateX(-50%) scale(1.4) translateY(-10px); opacity: 1; }
          50% { transform: translateX(-50%) scale(1.1) translateY(-40px); opacity: 1; }
          100% { transform: translateX(-50%) scale(0.8) translateY(-180px); opacity: 0; }
        }
        @keyframes labelPop {
          0% { opacity: 0; }
          30% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function GiftPanel({ postId, recipientId, onClose }) {
  const { user } = useAuth()
  const [wallet, setWallet] = useState(null)
  const [selected, setSelected] = useState(GIFTS[0])
  const [sending, setSending] = useState(false)
  const [animation, setAnimation] = useState(null)

  async function loadWallet() {
    if (!user) return
    // Only ever read your OWN wallet — RLS blocks reading anyone else's.
    const { data } = await supabase
      .from('wallets').select('balance').eq('user_id', user.id).maybeSingle()
    setWallet(data || { balance: 0 })
  }

  useEffect(() => {
    loadWallet()
    // eslint-disable-next-line
  }, [user])

  async function sendGift() {
    if (!user || sending) return
    if ((wallet?.balance || 0) < selected.coins) {
      alert('Not enough CareCoins! Top up your wallet first.')
      return
    }
    setSending(true)

    // One atomic call: debit sender, credit recipient, log the gift and both
    // transactions. Runs as security definer so it can write the recipient's
    // wallet — the client never can, because of RLS.
    const { data, error } = await supabase.rpc('send_gift', {
      p_sender: user.id,
      p_recipient: recipientId,
      p_coins: selected.coins,
      p_post_id: postId || null,
      p_gift_type: selected.name,
      p_gift_emoji: selected.emoji,
    })

    setSending(false)

    if (error) {
      alert('Gift failed: ' + error.message)
      return
    }
    if (data === 'insufficient') {
      alert('Not enough CareCoins! Top up your wallet first.')
      await loadWallet()
      return
    }
    if (data !== 'ok') {
      alert('Gift failed: ' + data)
      return
    }

    // Read the real balance back rather than guessing locally
    await loadWallet()

    notify({
      recipientId,
      actorId: user.id,
      type: 'gift',
      message: `sent you a ${selected.emoji} ${selected.name}`,
      link: postId ? `/post/${postId}` : `/u/${user.id}`,
    })

    setAnimation(selected)
  }

  if (!user) {
    return (
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#1e293b', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px 20px', zIndex: 500 }}>
        <p style={{ color: '#fff', textAlign: 'center', fontSize: 14 }}>
          <Link to="/login" style={{ color: theme.tealBright, fontWeight: 700 }}>Log in</Link> to send gifts
        </p>
        <button onClick={onClose} style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: '#64748b', fontSize: 13 }}>Close</button>
      </div>
    )
  }

  return (
    <>
      {animation && <GiftAnimation gift={animation} onDone={() => { setAnimation(null); onClose() }} />}

      <div
        style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#1e293b', borderRadius: '24px 24px 0 0', padding: '20px 16px 40px 16px', zIndex: 500 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, background: '#475569', borderRadius: 2, margin: '0 auto 16px auto' }} />
        <p style={{ color: '#fff', fontWeight: 800, fontSize: 15, textAlign: 'center', margin: '0 0 4px 0' }}>Send a Gift 🎁</p>
        <p style={{ color: '#64748b', fontSize: 12, textAlign: 'center', margin: '0 0 16px 0' }}>Gifts convert to real naira earnings</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>YOUR CARECOINS</p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: theme.tealBright }}>🪙 {wallet?.balance || 0}</p>
          </div>
          <Link to="/wallet" onClick={onClose} style={{ background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
            + Top Up
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {GIFTS.map((g) => (
            <button
              key={g.name}
              onClick={() => setSelected(g)}
              style={{
                background: selected.name === g.name ? '#0f2a2a' : '#0f172a',
                border: `2px solid ${selected.name === g.name ? theme.tealBright : 'transparent'}`,
                borderRadius: 14, padding: '10px 6px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4, cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 26 }}>{g.emoji}</span>
              <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700 }}>{g.name}</span>
              <span style={{ color: theme.tealBright, fontSize: 11, fontWeight: 900 }}>{g.coins} 🪙</span>
            </button>
          ))}
        </div>

        <button
          onClick={sendGift}
          disabled={sending || (wallet?.balance || 0) < selected.coins}
          style={{
            width: '100%', padding: 14,
            background: (wallet?.balance || 0) < selected.coins ? '#334155' : 'linear-gradient(135deg, #f97316, #db2777)',
            color: '#fff', border: 'none', borderRadius: 16, fontWeight: 800, fontSize: 15,
            boxShadow: (wallet?.balance || 0) >= selected.coins ? '0 4px 16px rgba(219,39,119,0.4)' : 'none',
          }}
        >
          {sending ? 'Sending...' : (wallet?.balance || 0) < selected.coins ? 'Not enough CareCoins' : `Send ${selected.emoji} ${selected.name} — ${selected.coins} 🪙`}
        </button>

        <button onClick={onClose} style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: '#64748b', fontSize: 13, fontWeight: 600 }}>
          Cancel
        </button>
      </div>

      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 499 }} />
    </>
  )
}

export default GiftPanel
