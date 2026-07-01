import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import { theme } from './lib/theme'
import BottomNav from './BottomNav.jsx'

function VerifyProfessional() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [profession, setProfession] = useState('Pharmacist')
  const [file, setFile] = useState(null)
  const [existingRequest, setExistingRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const professions = [
    'Pharmacist', 'Medical Doctor', 'Cardiologist', 'Surgeon', 'Pediatrician',
    'Dentist', 'Optometrist', 'Nurse', 'Dermatologist', 'Gynaecologist',
    'Psychiatrist', 'Physiotherapist', 'Radiologist', 'Nutritionist / Dietitian',
    'Other Healthcare Professional',
  ]

  useEffect(() => {
    async function load() {
      if (!user) {
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('verification_requests')
        .select('id, full_name, profession, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setExistingRequest(data)
      setLoading(false)
    }
    if (!authLoading) load()
  }, [user, authLoading])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!fullName.trim() || !file) {
      setError('Please enter your full name and upload a credential photo.')
      return
    }
    setSubmitting(true)
    setError('')

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('credentials').upload(filePath, file)
    if (uploadError) {
      setError('Upload failed. Try a smaller image.')
      setSubmitting(false)
      return
    }

    const { data: urlData } = supabase.storage.from('credentials').getPublicUrl(filePath)

    const { error: insertError } = await supabase.from('verification_requests').insert({
      user_id: user.id,
      full_name: fullName.trim(),
      profession,
      credential_url: urlData.publicUrl,
    })

    // Pre-save specialty to profile so it's searchable even before approval
    await supabase.from('profiles').update({ specialty: profession }).eq('id', user.id)

    if (insertError) {
      setError('Something went wrong submitting your request.')
    } else {
      setExistingRequest({ full_name: fullName, profession, status: 'pending' })
    }
    setSubmitting(false)
  }

  if (authLoading || loading) return <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>Loading...</div>

  if (!user) {
    return (
      <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif', maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ color: theme.textMid }}>Log in to request verification.</p>
        <Link to="/login" style={{ color: theme.tealDeep, fontWeight: 700 }}>Log In</Link>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 420, margin: '0 auto', paddingBottom: 90 }}>
      <div style={{ background: theme.heroGradient, padding: '22px 20px 50px 20px', borderRadius: '0 0 28px 28px', color: '#fff' }}>
        <Link to="/profile" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>← Profile</Link>
        <h1 style={{ fontSize: 21, fontWeight: 900, margin: '14px 0 4px 0' }}>Get Verified</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
          Get a verified badge as a healthcare professional
        </p>
      </div>

      <div style={{ padding: '0 20px', marginTop: -28 }}>
        <div style={{ background: theme.cardBg, borderRadius: 20, padding: 18, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          {existingRequest ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: existingRequest.status === 'approved' ? '#ecfdf5' : existingRequest.status === 'rejected' ? '#fef2f2' : '#fef3c7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px auto',
              }}>
                {existingRequest.status === 'approved' ? '✅' : existingRequest.status === 'rejected' ? '❌' : '⏳'}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: theme.navy, margin: '0 0 4px 0' }}>
                {existingRequest.status === 'approved' ? 'You are verified!' :
                 existingRequest.status === 'rejected' ? 'Request not approved' :
                 'Request under review'}
              </h3>
              <p style={{ fontSize: 13, color: theme.textLight, margin: 0 }}>
                {existingRequest.full_name} · {existingRequest.profession}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11.5, color: theme.textLight, fontWeight: 700 }}>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full professional name"
                  style={{ width: '100%', padding: 12, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 12, marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11.5, color: theme.textLight, fontWeight: 700 }}>Specialty / Role</label>
                <select
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  style={{ width: '100%', padding: 12, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 12, marginTop: 4, background: '#fff' }}
                >
                  {professions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11.5, color: theme.textLight, fontWeight: 700 }}>Credential Photo (license, ID card, certificate)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files[0])}
                  style={{ width: '100%', marginTop: 6, fontSize: 13 }}
                />
              </div>
              {error && <p style={{ color: theme.alert, fontSize: 13, margin: 0 }}>{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: 13, background: theme.tealGradient, color: '#fff', border: 'none',
                  borderRadius: 13, fontWeight: 800, fontSize: 14, boxShadow: '0 3px 8px rgba(15,118,110,0.25)',
                }}
              >
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
              <p style={{ fontSize: 11.5, color: theme.textLight, margin: 0, textAlign: 'center' }}>
                Your credential photo is reviewed manually before approval.
              </p>
            </form>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export default VerifyProfessional
