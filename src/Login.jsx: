import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'

function Login() {
  const [authMethod, setAuthMethod] = useState('email') // 'email' or 'phone'
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    } else {
      navigate('/')
    }

    setLoading(false)
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 400, margin: '0 auto', padding: 20 }}>
      <Link to="/" style={{ color: '#0f766e', textDecoration: 'none', fontSize: 14 }}>← Back</Link>

      <h1 style={{ fontSize: 22, margin: '16px 0 20px 0' }}>
        {isSignUp ? 'Create your CareFind account' : 'Log in to CareFind'}
      </h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setAuthMethod('email')}
          style={{
            flex: 1, padding: 10, borderRadius: 8, border: '1px solid #0f766e',
            background: authMethod === 'email' ? '#0f766e' : '#fff',
            color: authMethod === 'email' ? '#fff' : '#0f766e', fontWeight: 600,
          }}
        >
          Email
        </button>
        <button
          onClick={() => setAuthMethod('phone')}
          style={{
            flex: 1, padding: 10, borderRadius: 8, border: '1px solid #0f766e',
            background: authMethod === 'phone' ? '#0f766e' : '#fff',
            color: authMethod === 'phone' ? '#fff' : '#0f766e', fontWeight: 600,
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
            style={{ padding: 12, fontSize: 16, border: '1px solid #ccc', borderRadius: 8 }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            style={{ padding: 12, fontSize: 16, border: '1px solid #ccc', borderRadius: 8 }}
          />

          {error && <p style={{ color: '#c0392b', fontSize: 14, margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ padding: 12, fontSize: 16, background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}
          >
            {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Log In'}
          </button>
        </form>
      ) : (
        <p style={{ color: '#666', fontSize: 14 }}>
          Phone login is coming soon. Please use email for now.
        </p>
      )}

      <p style={{ marginTop: 20, fontSize: 14, color: '#666' }}>
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          onClick={() => { setIsSignUp(!isSignUp); setError('') }}
          style={{ background: 'none', border: 'none', color: '#0f766e', fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          {isSignUp ? 'Log In' : 'Sign Up'}
        </button>
      </p>
    </div>
  )
}

export default Login
