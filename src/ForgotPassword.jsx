import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { theme } from './lib/theme'

// Step 1 of a password reset: the person types the email they signed up with
// and Supabase emails them a one-time link back to /reset-password.
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function sendLink(e) {
    if (e) e.preventDefault()
    const addr = email.trim()
    if (!addr) { alert('Enter the email you signed up with.'); return }

    setSending(true)
    const { error } = await supabase.auth.resetPasswordForEmail(addr, {
      redirectTo: window.location.origin + '/reset-password',
    })
    setSending(false)

    if (error) {
      alert('Could not send the reset link: ' + error.message)
      return
    }
    // Always show success, even if the email isn't registered — telling a
    // stranger which emails exist on the platform is a privacy leak.
    setSent(true)
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 420, margin: '0 auto', padding: 20, minHeight: '100vh' }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.navy, margin: '30px 0 6px 0' }}>Forgot your password?</h1>
      <p style={{ fontSize: 13.5, color: theme.textMid, lineHeight: 1.6, margin: '0 0 22px 0' }}>
        Type the email you signed up with and we will send you a link to set a new one.
      </p>

      {sent ? (
        <div style={{ padding: 18, borderRadius: 14, background: '#ecfdf5', border: `1px solid ${theme.tealDeep}` }}>
          <p style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 800, color: theme.tealDeep }}>Check your email</p>
          <p style={{ margin: 0, fontSize: 13, color: theme.textMid, lineHeight: 1.6 }}>
            If <strong>{email.trim()}</strong> is registered, a reset link is on its way. It expires in one hour.
            <br /><br />
            Nothing there? Look in spam, and make sure you typed the same address you signed up with.
          </p>
          <button onClick={() => { setSent(false) }}
            style={{ marginTop: 14, background: 'none', border: 'none', color: theme.tealDeep, fontWeight: 700, fontSize: 13, padding: 0 }}>
            Try a different email
          </button>
        </div>
      ) : (
        <form onSubmit={sendLink}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.textMid, marginBottom: 6 }}>Email</label>
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='you@example.com'
            autoComplete='email'
            style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: `1px solid ${theme.border}`, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
          />

          <button type='submit' disabled={sending}
            style={{ width: '100%', marginTop: 16, padding: 14, borderRadius: 14, border: 'none', background: sending ? '#94a3b8' : theme.tealGradient, color: '#fff', fontSize: 15, fontWeight: 800 }}>
            {sending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: theme.textMid }}>
        Remembered it? <Link to='/login' style={{ color: theme.tealDeep, fontWeight: 700 }}>Log in</Link>
      </p>
    </div>
  )
}
