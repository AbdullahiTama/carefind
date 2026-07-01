import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { theme } from './lib/theme'
import BottomNav from './BottomNav.jsx'

const STATES = [
  'All Nigeria', 'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
  'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

const CATEGORIES = [
  { key: 'all', label: '🔍 All', icon: '🔍' },
  { key: 'medications', label: '💊 Medications', icon: '💊' },
  { key: 'businesses', label: '🏥 Businesses', icon: '🏥' },
  { key: 'reviews', label: '⭐ Reviews', icon: '⭐' },
  { key: 'posts', label: '📝 Posts', icon: '📝' },
]

const BUSINESS_TYPES = ['All Types', 'pharmacy', 'hospital', 'dental', 'optical', 'wellness', 'skincare']

function Search() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [selectedState, setSelectedState] = useState('All Nigeria')
  const [businessType, setBusinessType] = useState('All Types')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const [medicationResults, setMedicationResults] = useState([])
  const [businessResults, setBusinessResults] = useState([])
  const [reviewResults, setReviewResults] = useState([])
  const [postResults, setPostResults] = useState([])

  async function handleSearch(e) {
    if (e) e.preventDefault()
    if (!query.trim() && category === 'all') return
    setLoading(true)
    setSearched(true)

    const stateFilter = selectedState === 'All Nigeria' ? null : selectedState

    if (category === 'all' || category === 'medications') {
      let q = supabase
        .from('products')
        .select('id, name, generic_name, price, stock, emoji, business_id, businesses(name, city, state, whatsapp, visible_on_carefind)')
        .eq('list_on_carefind', true)
        .gt('stock', 0)

      if (query.trim()) q = q.or(`name.ilike.%${query}%,generic_name.ilike.%${query}%`)
      if (stateFilter) q = q.eq('businesses.state', stateFilter)

      const { data } = await q.limit(10)
      const filtered = (data || []).filter((p) => p.businesses?.visible_on_carefind)
      setMedicationResults(filtered)
    } else setMedicationResults([])

    if (category === 'all' || category === 'businesses') {
      let q = supabase
        .from('businesses')
        .select('id, name, address, city, state, business_type, whatsapp')
        .eq('visible_on_carefind', true)

      if (query.trim()) q = q.ilike('name', `%${query}%`)
      if (stateFilter) q = q.eq('state', stateFilter)
      if (businessType !== 'All Types') q = q.eq('business_type', businessType)

      const { data } = await q.limit(10)
      setBusinessResults(data || [])
    } else setBusinessResults([])

    if (category === 'all' || category === 'reviews') {
      let q = supabase
        .from('reviews')
        .select('id, rating, comment, created_at, business_id, businesses(name, city, state)')

      if (query.trim()) q = q.ilike('comment', `%${query}%`)
      if (stateFilter) q = q.eq('businesses.state', stateFilter)

      const { data } = await q.order('created_at', { ascending: false }).limit(8)
      setReviewResults(data || [])
    } else setReviewResults([])

    if (category === 'all' || category === 'posts') {
      let q = supabase
        .from('posts')
        .select('id, content, post_type, created_at, user_id, profiles(display_name, full_name)')

      if (query.trim()) q = q.ilike('content', `%${query}%`)

      const { data } = await q.order('created_at', { ascending: false }).limit(8)
      setPostResults(data || [])
    } else setPostResults([])

    setLoading(false)
  }

  async function handleCategoryFilter(cat) {
    setCategory(cat)
    if (searched) {
      setTimeout(() => handleSearch(null), 50)
    }
  }

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const totalResults = medicationResults.length + businessResults.length + reviewResults.length + postResults.length
  const hasResults = totalResults > 0

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>

      {/* Hero search header */}
      <div style={{ background: theme.heroGradient, padding: '22px 20px 20px 20px', borderRadius: '0 0 28px 28px', color: '#fff' }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 14px 0', letterSpacing: '-0.01em' }}>Search CareFind</h1>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 16, padding: '11px 14px',
          }}>
            <span>🔍</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Medication, pharmacy, health topic..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 14 }}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>✕</button>
            )}
          </div>
          <button type="submit" style={{ padding: '0 16px', fontSize: 13, fontWeight: 800, background: theme.tealBright, color: theme.navy, border: 'none', borderRadius: 14 }}>
            Go
          </button>
        </form>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 700 }}
        >
          ⚙️ Filters {selectedState !== 'All Nigeria' || businessType !== 'All Types' ? '●' : ''}
        </button>

        {showFilters && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Location</p>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: 'none', fontSize: 13, background: 'rgba(255,255,255,0.12)', color: '#fff' }}
              >
                {STATES.map((s) => <option key={s} value={s} style={{ color: '#000' }}>{s}</option>)}
              </select>
            </div>
            {(category === 'all' || category === 'businesses') && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Business Type</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {BUSINESS_TYPES.map((bt) => (
                    <button
                      key={bt}
                      onClick={() => setBusinessType(bt)}
                      style={{
                        padding: '5px 11px', borderRadius: 12, border: 'none', fontSize: 11.5, fontWeight: 700,
                        background: businessType === bt ? theme.tealBright : 'rgba(255,255,255,0.1)',
                        color: businessType === bt ? theme.navy : '#fff', textTransform: 'capitalize',
                      }}
                    >
                      {bt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '14px 20px 4px', overflowX: 'auto' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => handleCategoryFilter(cat.key)}
            style={{
              flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 700,
              border: category === cat.key ? 'none' : `1px solid ${theme.border}`,
              background: category === cat.key ? theme.tealGradient : theme.cardBg,
              color: category === cat.key ? '#fff' : theme.textMid,
              boxShadow: category === cat.key ? '0 2px 8px rgba(15,118,110,0.3)' : 'none',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 20px 0 20px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <p style={{ color: theme.textLight, fontSize: 13 }}>Searching...</p>
          </div>
        )}

        {!loading && searched && !hasResults && (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>🔍</div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: theme.navy, margin: '0 0 4px 0' }}>No results found</h3>
            <p style={{ fontSize: 13, color: theme.textLight }}>
              Try different keywords{selectedState !== 'All Nigeria' ? ` or search All Nigeria` : ''}
            </p>
          </div>
        )}

        {/* Medications */}
        {medicationResults.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '8px 0 10px 0' }}>
              💊 Medications ({medicationResults.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {medicationResults.map((p) => (
                <div key={p.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <Link to={`/drug/${encodeURIComponent(p.name)}`} style={{ textDecoration: 'none' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 800, color: theme.navy }}>{p.emoji ? `${p.emoji} ` : '💊 '}{p.name}</h3>
                  </Link>
                  {p.generic_name && <p style={{ margin: '0 0 4px 0', color: theme.textLight, fontSize: 12.5 }}>Generic: {p.generic_name}</p>}
                  <p style={{ margin: '0 0 8px 0', fontSize: 13, color: theme.textMid, fontWeight: 600 }}>₦{p.price} · Stock: {p.stock}</p>
                  {p.businesses && (
                    <>
                      <p style={{ margin: '0 0 2px 0', fontWeight: 700, fontSize: 13, color: theme.navy }}>{p.businesses.name}</p>
                      <p style={{ margin: '0 0 8px 0', color: theme.textLight, fontSize: 12 }}>{p.businesses.city}, {p.businesses.state}</p>
                      {p.businesses.whatsapp && (
                        <a href={`https://wa.me/${p.businesses.whatsapp}`} target="_blank" rel="noreferrer"
                          style={{ display: 'inline-block', padding: '7px 14px', background: '#25D366', color: '#fff', borderRadius: 12, textDecoration: 'none', fontSize: 12.5, fontWeight: 700 }}>
                          WhatsApp
                        </a>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Businesses */}
        {businessResults.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '8px 0 10px 0' }}>
              🏥 Businesses ({businessResults.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {businessResults.map((biz) => (
                <div key={biz.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <Link to={`/business/${biz.id}`} style={{ textDecoration: 'none' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 800, color: theme.navy }}>{biz.name}</h3>
                  </Link>
                  <p style={{ margin: '0 0 4px 0', color: theme.textLight, fontSize: 12.5, textTransform: 'capitalize' }}>
                    {biz.business_type} · {biz.city}, {biz.state}
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: 13, color: theme.textMid }}>{biz.address}</p>
                  {biz.whatsapp && (
                    <a href={`https://wa.me/${biz.whatsapp}`} target="_blank" rel="noreferrer"
                      style={{ display: 'inline-block', padding: '7px 14px', background: '#25D366', color: '#fff', borderRadius: 12, textDecoration: 'none', fontSize: 12.5, fontWeight: 700 }}>
                      WhatsApp
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Reviews */}
        {reviewResults.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '8px 0 10px 0' }}>
              ⭐ Reviews ({reviewResults.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {reviewResults.map((r) => (
                <div key={r.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  {r.businesses && (
                    <p style={{ margin: '0 0 4px 0', fontWeight: 700, fontSize: 13, color: theme.navy }}>{r.businesses.name}</p>
                  )}
                  <p style={{ margin: '0 0 4px 0', color: theme.warning, fontSize: 13 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                  {r.comment && <p style={{ margin: '0 0 4px 0', fontSize: 13.5, color: theme.textMid, lineHeight: 1.5 }}>{r.comment}</p>}
                  <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>{timeAgo(r.created_at)}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Posts */}
        {postResults.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '8px 0 10px 0' }}>
              📝 Posts & Articles ({postResults.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {postResults.map((p) => (
                <div key={p.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: theme.navy }}>
                      {p.profiles?.full_name || p.profiles?.display_name || 'CareFind User'}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize',
                      background: '#ecfdf5', color: theme.tealDeep,
                    }}>
                      {p.post_type}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 6px 0', fontSize: 13.5, color: theme.textMid, lineHeight: 1.5 }}>
                    {p.content.length > 150 ? p.content.slice(0, 150) + '...' : p.content}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>{timeAgo(p.created_at)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

export default Search
