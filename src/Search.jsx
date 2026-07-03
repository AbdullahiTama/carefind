import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { theme } from './lib/theme'
import BottomNav from './BottomNav.jsx'

function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all') // all, businesses, products, professionals
  const [locationFilter, setLocationFilter] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('')
  const [businesses, setBusinesses] = useState([])
  const [products, setProducts] = useState([])
  const [professionals, setProfessionals] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // MedMarket featured strip
  const [featured, setFeatured] = useState([])

  useEffect(() => {
    loadFeatured()
  }, [])

  async function loadFeatured() {
    const { data } = await supabase
      .from('products')
      .select('id, name, emoji, price, business_id, businesses(name)')
      .eq('list_on_carefind', true)
      .order('created_at', { ascending: false })
      .limit(14)
    setFeatured(data || [])
  }

  async function runSearch(e) {
    if (e) e.preventDefault()
    if (!query.trim() && !locationFilter.trim() && !specialtyFilter.trim()) return
    setLoading(true)
    setSearched(true)

    const q = query.trim()

    // Businesses
    if (tab === 'all' || tab === 'businesses') {
      let bizQuery = supabase.from('businesses').select('id, name, business_type, city, state, cover_url, whatsapp').eq('visible_on_carefind', true)
      if (q) bizQuery = bizQuery.ilike('name', `%${q}%`)
      if (locationFilter.trim()) bizQuery = bizQuery.or(`city.ilike.%${locationFilter}%,state.ilike.%${locationFilter}%`)
      const { data } = await bizQuery.limit(20)
      setBusinesses(data || [])
    } else {
      setBusinesses([])
    }

    // Products
    if (tab === 'all' || tab === 'products') {
      let prodQuery = supabase.from('products').select('id, name, emoji, price, prescription_required, business_id, businesses(name, city)').eq('list_on_carefind', true)
      if (q) prodQuery = prodQuery.ilike('name', `%${q}%`)
      const { data } = await prodQuery.limit(20)
      setProducts(data || [])
    } else {
      setProducts([])
    }

    // Professionals
    if (tab === 'all' || tab === 'professionals') {
      let profQuery = supabase.from('profiles').select('id, full_name, display_name, verification_label, specialty, location, is_verified').eq('is_verified', true)
      if (q) profQuery = profQuery.or(`full_name.ilike.%${q}%,display_name.ilike.%${q}%`)
      if (specialtyFilter.trim()) profQuery = profQuery.ilike('specialty', `%${specialtyFilter}%`)
      if (locationFilter.trim()) profQuery = profQuery.ilike('location', `%${locationFilter}%`)
      const { data } = await profQuery.limit(20)
      setProfessionals(data || [])
    } else {
      setProfessionals([])
    }

    setLoading(false)
  }

  function quickCategory(cat) {
    setTab(cat)
    setSearched(true)
    setLoading(true)
    // Trigger a broad search for that category
    setTimeout(() => { runSearch() }, 0)
  }

  const inputStyle = { width: '100%', padding: 13, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 12, boxSizing: 'border-box' }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>
      <style>{`
        @keyframes medmarket-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .mm-track { display: flex; gap: 12px; width: max-content; animation: medmarket-scroll 30s linear infinite; }
        .mm-track:active { animation-play-state: paused; }
      `}</style>

      {/* MedMarket hero */}
      <div style={{ background: theme.heroGradient, padding: '24px 18px 22px', borderRadius: '0 0 26px 26px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 24 }}>🛒</span>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 900, letterSpacing: '-0.02em' }}>MedMarket</h1>
        </div>
        <p style={{ margin: '0 0 16px 0', fontSize: 13.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.45 }}>
          Your health marketplace — find medications, trusted pharmacies, health products and verified professionals near you, all in one place.
        </p>
        <form onSubmit={runSearch}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search medication, pharmacy, doctor…"
              style={{ flex: 1, padding: 13, fontSize: 14, border: 'none', borderRadius: 13, boxSizing: 'border-box' }}
            />
            <button type="submit" style={{ padding: '0 18px', background: '#fff', color: theme.tealDeep, border: 'none', borderRadius: 13, fontWeight: 800, fontSize: 14 }}>Go</button>
          </div>
        </form>
      </div>

      {/* Category quick tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, padding: '14px 16px 6px' }}>
        {[
          { key: 'products', label: 'Products', icon: '💊' },
          { key: 'businesses', label: 'Pharmacies', icon: '🏥' },
          { key: 'professionals', label: 'Doctors', icon: '🩺' },
          { key: 'all', label: 'All', icon: '🔍' },
        ].map((c) => (
          <button
            key={c.key}
            onClick={() => setTab(c.key)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 4px',
              borderRadius: 14, border: tab === c.key ? `2px solid ${theme.tealDeep}` : `1px solid ${theme.border}`,
              background: tab === c.key ? '#ecfdf5' : theme.cardBg, cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 22 }}>{c.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: theme.navy }}>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Auto-scrolling featured products */}
      {featured.length > 0 && !searched && (
        <div style={{ padding: '10px 0 4px' }}>
          <p style={{ margin: '0 0 10px 16px', fontSize: 12, fontWeight: 900, color: theme.navy }}>✨ Featured on MedMarket</p>
          <div style={{ overflow: 'hidden', width: '100%' }}>
            <div className="mm-track">
              {[...featured, ...featured].map((p, i) => (
                <Link key={i} to={`/business/${p.business_id}`} style={{ textDecoration: 'none', color: 'inherit', flexShrink: 0, width: 130 }}>
                  <div style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: 12, background: theme.cardBg, textAlign: 'center' }}>
                    <div style={{ fontSize: 30, marginBottom: 6 }}>{p.emoji || '💊'}</div>
                    <p style={{ margin: '0 0 3px 0', fontSize: 12.5, fontWeight: 800, color: theme.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    {p.price != null && <p style={{ margin: '0 0 2px 0', fontSize: 12, fontWeight: 700, color: theme.tealDeep }}>₦{Number(p.price).toLocaleString()}</p>}
                    <p style={{ margin: 0, fontSize: 10, color: theme.textLight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.businesses?.name || ''}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search area */}
      <div style={{ padding: '10px 16px 0' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'businesses', label: '🏥 Pharmacies' },
            { key: 'products', label: '💊 Products' },
            { key: 'professionals', label: '🩺 Professionals' },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flexShrink: 0, padding: '7px 13px', borderRadius: 18, fontSize: 12, fontWeight: 700, border: tab === t.key ? 'none' : `1px solid ${theme.border}`, background: tab === t.key ? theme.tealGradient : theme.bg, color: tab === t.key ? '#fff' : theme.textMid }}>{t.label}</button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="📍 Location" style={{ ...inputStyle, flex: 1 }} />
          {(tab === 'all' || tab === 'professionals') && (
            <input value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)} placeholder="Specialty" style={{ ...inputStyle, flex: 1 }} />
          )}
        </div>
        <button onClick={() => runSearch()} style={{ width: '100%', padding: 12, background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, marginBottom: 16 }}>
          Search MedMarket
        </button>

        {loading && <p style={{ color: theme.textLight, fontSize: 13 }}>Searching…</p>}

        {searched && !loading && businesses.length === 0 && products.length === 0 && professionals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: theme.navy, margin: '0 0 4px 0' }}>No results found</p>
            <p style={{ fontSize: 12.5, color: theme.textLight, margin: 0 }}>Try a different search or location.</p>
          </div>
        )}

        {/* Businesses */}
        {businesses.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', margin: '0 0 8px 0' }}>Pharmacies & Clinics</p>
            {businesses.map((b) => (
              <Link key={b.id} to={`/business/${b.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', gap: 12, padding: 12, border: `1px solid ${theme.border}`, borderRadius: 14, marginBottom: 8, background: theme.cardBg }}>
                <div style={{ width: 46, height: 46, borderRadius: 10, background: b.cover_url ? `url(${b.cover_url})` : theme.navy, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, flexShrink: 0 }}>
                  {!b.cover_url && (b.name?.[0]?.toUpperCase() || '🏥')}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 2px 0', fontSize: 14, fontWeight: 800, color: theme.navy }}>{b.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: theme.textLight, textTransform: 'capitalize' }}>{b.business_type} · {b.city}{b.state ? `, ${b.state}` : ''}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Products */}
        {products.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', margin: '0 0 8px 0' }}>Products & Medication</p>
            {products.map((p) => (
              <Link key={p.id} to={`/business/${p.business_id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', gap: 12, padding: 12, border: `1px solid ${theme.border}`, borderRadius: 14, marginBottom: 8, background: theme.cardBg, alignItems: 'center' }}>
                <div style={{ fontSize: 26 }}>{p.emoji || '💊'}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 2px 0', fontSize: 14, fontWeight: 800, color: theme.navy }}>{p.name} {p.prescription_required && <span style={{ fontSize: 9, fontWeight: 800, color: '#92400e', background: '#fef3c7', padding: '1px 6px', borderRadius: 10 }}>Rx</span>}</p>
                  <p style={{ margin: 0, fontSize: 12, color: theme.textLight }}>{p.businesses?.name}{p.businesses?.city ? ` · ${p.businesses.city}` : ''}</p>
                </div>
                {p.price != null && <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: theme.tealDeep }}>₦{Number(p.price).toLocaleString()}</p>}
              </Link>
            ))}
          </div>
        )}

        {/* Professionals */}
        {professionals.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', margin: '0 0 8px 0' }}>Health Professionals</p>
            {professionals.map((pr) => (
              <Link key={pr.id} to={`/u/${pr.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', gap: 12, padding: 12, border: `1px solid ${theme.border}`, borderRadius: 14, marginBottom: 8, background: theme.cardBg, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: theme.tealGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, flexShrink: 0 }}>
                  {(pr.full_name?.[0] || pr.display_name?.[0] || '?').toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 2px 0', fontSize: 14, fontWeight: 800, color: theme.navy }}>{pr.full_name || pr.display_name} <span style={{ color: theme.tealDeep }}>✓</span></p>
                  <p style={{ margin: 0, fontSize: 12, color: theme.textLight }}>{pr.verification_label || pr.specialty}{pr.location ? ` · ${pr.location}` : ''}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

export default Search
