import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import BottomNav from './BottomNav.jsx'
import { theme } from './lib/theme'

function Search() {
  const [query, setQuery] = useState('')
  const [businessResults, setBusinessResults] = useState([])
  const [productResults, setProductResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setSearched(true)

    const [bizRes, prodRes] = await Promise.all([
      supabase
        .from('businesses')
        .select('id, name, address, city, state, business_type, whatsapp')
        .eq('visible_on_carefind', true)
        .ilike('name', `%${query}%`),
      supabase
        .from('products')
        .select('id, name, generic_name, price, stock, emoji, business_id, businesses(name, address, city, state, whatsapp, visible_on_carefind)')
        .eq('list_on_carefind', true)
        .gt('stock', 0)
        .or(`name.ilike.%${query}%,generic_name.ilike.%${query}%`),
    ])

    setBusinessResults(bizRes.data || [])
    const filteredProducts = (prodRes.data || []).filter((p) => p.businesses && p.businesses.visible_on_carefind)
    setProductResults(filteredProducts)
    setLoading(false)
  }

  async function handleCategoryFilter(type) {
    setLoading(true)
    setSearched(true)
    setQuery('')
    setProductResults([])

    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, address, city, state, business_type, whatsapp')
      .eq('visible_on_carefind', true)
      .eq('business_type', type)

    if (error) {
      console.error('Category filter error:', error)
      setBusinessResults([])
    } else {
      setBusinessResults(data || [])
    }
    setLoading(false)
  }

  const categoryIcons = {
    pharmacy: { icon: '💊', bg: '#ecfdf5' },
    hospital: { icon: '🏥', bg: '#eff6ff' },
    dental: { icon: '🦷', bg: '#fdf4ff' },
    optical: { icon: '👁️', bg: '#fff7ed' },
    wellness: { icon: '🌿', bg: '#f0fdf4' },
    skincare: { icon: '✨', bg: '#fdf2f8' },
  }
  const categories = Object.keys(categoryIcons)
  const hasResults = businessResults.length > 0 || productResults.length > 0

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>
      <div style={{
        background: theme.heroGradient, padding: '22px 20px 26px 20px',
        borderRadius: '0 0 28px 28px', color: '#fff', marginBottom: 20,
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>Search CareFind</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: '0 0 16px 0', fontWeight: 500 }}>
          Medications, pharmacies, hospitals & clinics
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.18)', borderRadius: 16, padding: '11px 14px',
          }}>
            <span>🔍</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anything..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 14 }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0 18px', fontSize: 14, fontWeight: 800, background: theme.tealBright,
              color: theme.navy, border: 'none', borderRadius: 16,
            }}
          >
            Go
          </button>
        </form>
      </div>

      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryFilter(cat)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 14,
                border: `1px solid ${theme.border}`, background: theme.cardBg, fontSize: 12.5, fontWeight: 700,
                color: theme.textMid, textTransform: 'capitalize', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <span style={{
                width: 20, height: 20, borderRadius: 6, background: categoryIcons[cat].bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
              }}>
                {categoryIcons[cat].icon}
              </span>
              {cat}
            </button>
          ))}
        </div>

        {loading && <p style={{ color: theme.textMid }}>Searching...</p>}

        {!loading && searched && !hasResults && (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, background: '#fef3c7', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px auto',
            }}>
              🔎
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: theme.navy, margin: '0 0 4px 0' }}>No results found</h3>
            <p style={{ fontSize: 13, color: theme.textLight, margin: 0 }}>Try a different name for "{query}"</p>
          </div>
        )}

        {productResults.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0' }}>
              Medications
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
              {productResults.map((p) => (
                <div key={p.id} style={{
                  border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14,
                  background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}>
                  <Link to={`/drug/${encodeURIComponent(p.name)}`} style={{ textDecoration: 'none' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 800, color: theme.navy }}>
                      {p.emoji ? `${p.emoji} ` : ''}{p.name}
                    </h3>
                  </Link>
                  {p.generic_name && (
                    <p style={{ margin: '0 0 4px 0', color: theme.textLight, fontSize: 12.5 }}>Generic: {p.generic_name}</p>
                  )}
                  <p style={{ margin: '0 0 8px 0', fontSize: 13, color: theme.textMid, fontWeight: 600 }}>
                    ₦{p.price} · In stock: {p.stock}
                  </p>
                  {p.businesses && (
                    <>
                      <p style={{ margin: '0 0 2px 0', fontWeight: 700, fontSize: 13, color: theme.navy }}>{p.businesses.name}</p>
                      <p style={{ margin: '0 0 10px 0', color: theme.textLight, fontSize: 12 }}>
                        {p.businesses.city}, {p.businesses.state}
                      </p>
                      {p.businesses.whatsapp && (
                        <a
                          href={`https://wa.me/${p.businesses.whatsapp}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-block', padding: '8px 16px', background: '#25D366',
                            color: '#fff', borderRadius: 12, textDecoration: 'none', fontSize: 13, fontWeight: 700,
                          }}
                        >
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

        {businessResults.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0' }}>
              Businesses
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {businessResults.map((biz) => (
                <div key={biz.id} style={{
                  border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14,
                  background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}>
                  <Link to={`/business/${biz.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 800, color: theme.navy }}>{biz.name}</h3>
                  </Link>
                  <p style={{ margin: '0 0 4px 0', color: theme.textLight, fontSize: 12.5, textTransform: 'capitalize' }}>
                    {biz.business_type} · {biz.city}, {biz.state}
                  </p>
                  <p style={{ margin: '0 0 10px 0', fontSize: 13, color: theme.textMid }}>{biz.address}</p>
                  {biz.whatsapp && (
                    <a
                      href={`https://wa.me/${biz.whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-block', padding: '8px 16px', background: '#25D366',
                        color: '#fff', borderRadius: 12, textDecoration: 'none', fontSize: 13, fontWeight: 700,
                      }}
                    >
                      WhatsApp
                    </a>
                  )}
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
