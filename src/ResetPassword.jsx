import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { theme } from './lib/theme'

// Step 2: the person arrives here from the emailed link. Supabase has already
// signed them in with a temporary recovery session, so all we do is take the
// new password and save it.
export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)
  const [linkBad, setLinkBad] = useState(false)

  useEffect(() => {
    // The recovery session lands a moment after the page opens.
    let done = false
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) { done = true; setReady(true) }
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) { done = true; setReady(true) }
    })
    const timer = setTimeout(() => { if (!done) setLinkBad(true) }, 3500)
    return () => { clearTimeout(timer); sub?.subscription?.unsubscribe?.() }
  }, [])

  async function save(e) {
    if (e) e.preventDefault()
    if (password.length < 6) { alert('Use at least 6 characters.'); return }
    if (password !== confirm) { alert('The two passwords do not match.'); return }

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (error) {
      alert('Could not change your password: ' + error.message)
      return
    }
    alert('Password changed. You are now signed in.')
    navigate('/')
  }

  const inputStyle = { width: '100%', padding: '13px 14px', borderRadius: 12, border: `1px solid ${theme.border}`, fontSize: 14, boxSizing: 'border-box', outline: 'none' }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 420, margin: '0 auto', padding: 20, minHeight: '100vh' }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.navy, margin: '30px 0 6px 0' }}>Set a new password</h1>

      {linkBad && !ready ? (
        <div style={{ padding: 18, borderRadius: 14, background: '#fef2f2', border: '1px solid #fecaca', marginTop: 14 }}>
          <p style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 800, color: '#dc2626' }}>This link has expired</p>
          <p style={{ margin: 0, fontSize: 13, color: '#7f1d1d', lineHeight: 1.6 }}>
            Reset links last one hour and can only be used once. Request a fresh one.
          </p>
          <Link to='/forgot-password' style={{ display: 'inline-block', marginTop: 14, color: theme.tealDeep, fontWeight: 700, fontSize: 13 }}>
            Send me a new link
          </Link>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13.5, color: theme.textMid, lineHeight: 1.6, margin: '0 0 22px 0' }}>
            Choose something you will remember. At least 6 characters.
          </p>

          <form onSubmit={save}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.textMid, marginBottom: 6 }}>New password</label>
            <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete='new-password' style={inputStyle} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.textMid, margin: '14px 0 6px 0' }}>Type it again</label>
            <input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete='new-password' style={inputStyle} />

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12.5, color: theme.textMid }}>
              <input type='checkbox' checked={show} onChange={(e) => setShow(e.target.checked)} />
              Show password
            </label>

            <button type='submit' disabled={saving || !ready}
              style={{ width: '100%', marginTop: 18, padding: 14, borderRadius: 14, border: 'none', background: (saving || !ready) ? '#94a3b8' : theme.tealGradient, color: '#fff', fontSize: 15, fontWeight: 800 }}>
              {saving ? 'Saving…' : !ready ? 'Checking your link…' : 'Change password'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
