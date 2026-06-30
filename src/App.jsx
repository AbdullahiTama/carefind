import { useState } from 'react'
import { supabase } from './lib/supabaseClient'

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setSearched(true)

    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, address, city, state, business_type, whatsapp')
      .eq('visible_on_carefind', true)
      .ilike('name', `%${query}%`)

    if (error) {
      console.error('Search error:', error)
      setResults([])
    } else {
      setResults(data || [])
    }

    setLoading(false)
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto', padding: 20 }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>CareFind</h1>
      <p style={{ color: '#666', marginBottom: 20 }}>Find pharmacies, hospitals & clinics near you</p>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search business name..."
          style={{ flex: 1, padding: 10, fontSize: 16, border: '1px solid #ccc', borderRadius: 8 }}
        />
        <button
          type="submit"
          style={{ padding: '10px 16px', fontSize: 16, background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8 }}
        >
          Search
        </button>
      </form>

      {loading && <p>Searching...</p>}

      {!loading && searched && results.length === 0 && (
        <p style={{ color: '#666' }}>No businesses found for "{query}".</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {results.map((biz) => (
          <div key={biz.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
            <h3 style={{ margin: '0 0 4px 0' }}>{biz.name}</h3>
            <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: 14 }}>
              {biz.business_type} · {biz.city}, {biz.state}
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: 14 }}>{biz.address}</p>
            {biz.whatsapp && (
              <a
                href={`https://wa.me/${biz.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '8px 14px',
                  background: '#25D366',
                  color: '#fff',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 14,
                }}
              >
                WhatsApp
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
