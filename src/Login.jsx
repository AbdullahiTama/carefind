import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import { theme } from './lib/theme'

// Nigeria first because that is where most people are today, then the rest
// alphabetically. Anyone can pick their own country at signup.
const COUNTRIES = [
  'Nigeria',
  'Ghana', 'Kenya', 'South Africa', "Côte d'Ivoire", 'Egypt', 'Ethiopia', 'Rwanda',
  'Senegal', 'Tanzania', 'Uganda', 'Zambia', 'Zimbabwe', 'Cameroon', 'Benin', 'Togo',
  'Sierra Leone', 'Liberia', 'Gambia', 'Botswana', 'Namibia', 'Morocco', 'Algeria', 'Tunisia',
  'United Kingdom', 'United States', 'Canada', 'Ireland', 'Germany', 'France', 'Netherlands',
  'United Arab Emirates', 'Saudi Arabia', 'India', 'Pakistan', 'China', 'Australia',
  'Other',
]

function Login() {
  const [authMethod, setAuthMethod] = useState('email')
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState('Nigeria')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const action = isSignUp ? signUp : signIn
    const { error: authError } = await action(email, password)

    if (authError) {
      setError(authError.message)
    } else if (isSignUp) {
      // Onboarding picks this up and saves it with the rest of the profile,
      // so signup itself stays down to email, password and country.
      try { localStorage.setItem('carefind_signup_country', country) } catch (err) {}
      // New users go to onboarding to complete their profile
      navigate('/onboarding')
    } else {
      navigate('/')
    }

    setLoading(false)
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 420, margin: '0 auto', minHeight: '100vh', background: theme.bg }}>
      <div style={{ background: theme.heroGradient, padding: '24px 20px 50px 20px', borderRadius: '0 0 28px 28px', color: '#fff' }}>
        <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>← Back</Link>
        <h1 style={{ fontSize: 23, fontWeight: 900, margin: '18px 0 4px 0', letterSpacing: '-0.02em' }}>
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
          {isSignUp ? 'Join the CareFind community' : 'Log in to continue'}
        </p>
      </div>

      <div style={{ padding: '0 20px', marginTop: -28 }}>
        <div style={{ background: theme.cardBg, borderRadius: 20, padding: 18, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <button
              onClick={() => setAuthMethod('email')}
              style={{
                flex: 1, padding: 9, borderRadius: 12, border: authMethod === 'email' ? 'none' : `1px solid ${theme.border}`,
                background: authMethod === 'email' ? theme.tealGradient : theme.bg,
                color: authMethod === 'email' ? '#fff' : theme.textMid, fontWeight: 700, fontSize: 13,
              }}
            >
              Email
            </button>
            <button
              onClick={() => setAuthMethod('phone')}
              style={{
                flex: 1, padding: 9, borderRadius: 12, border: authMethod === 'phone' ? 'none' : `1px solid ${theme.border}`,
                background: authMethod === 'phone' ? theme.tealGradient : theme.bg,
                color: authMethod === 'phone' ? '#fff' : theme.textMid, fontWeight: 700, fontSize: 13,
              }}
            >
              Phone
            </button>
          </div>

          {authMethod === 'email' ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                style={{ padding: 13, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 13 }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                style={{ padding: 13, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 13 }}
              />

              {isSignUp && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.textMid, marginBottom: 6 }}>
                    Where are you?
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    style={{ width: '100%', padding: 13, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 13, background: '#fff', boxSizing: 'border-box' }}
                  >
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <p style={{ margin: '6px 0 0 0', fontSize: 11, color: theme.textLight }}>
                    Helps us show you pharmacies and health facilities near you.
                  </p>
                </div>
              )}

              {error && <p style={{ color: theme.alert, fontSize: 13, margin: 0 }}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: 13, fontSize: 14, background: theme.tealGradient, color: '#fff', border: 'none',
                  borderRadius: 13, fontWeight: 800, boxShadow: '0 3px 8px rgba(15,118,110,0.25)',
                }}
              >
                {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Log In'}
              </button>

              {!isSignUp && (
                <Link
                  to="/forgot-password"
                  style={{ textAlign: 'center', fontSize: 13, color: theme.tealDeep, fontWeight: 700, textDecoration: 'none' }}
                >
                  Forgot your password?
                </Link>
              )}
            </form>
          ) : (
            <p style={{ color: theme.textLight, fontSize: 13.5 }}>
              Phone login is coming soon. Please use email for now.
            </p>
          )}

          <p style={{ marginTop: 16, fontSize: 13, color: theme.textLight, textAlign: 'center' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              style={{ background: 'none', border: 'none', color: theme.tealDeep, fontWeight: 700, padding: 0 }}
            >
              {isSignUp ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
