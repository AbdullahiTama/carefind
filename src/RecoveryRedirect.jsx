import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'

// A password-reset link signs the person in with a temporary recovery session.
// If Supabase drops them on the home page instead of the reset form, they end
// up logged in having never chosen a new password. This catches that and sends
// them where they meant to go.
export default function RecoveryRedirect() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Fired when the recovery session is established.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') navigate('/reset-password')
    })

    // Belt and braces: the link's fragment is sometimes consumed before the
    // listener attaches, so check the URL directly too.
    const hash = window.location.hash || ''
    const search = window.location.search || ''
    const looksLikeRecovery = hash.includes('type=recovery') || search.includes('type=recovery')
    if (looksLikeRecovery && location.pathname !== '/reset-password') {
      navigate('/reset-password')
    }

    return () => { sub?.subscription?.unsubscribe?.() }
    // eslint-disable-next-line
  }, [])

  return null
}
