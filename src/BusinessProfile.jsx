import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'

function BusinessProfile() {
  const { id } = useParams()
  const [biz, setBiz] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: bizData } = await supabase
        .from('businesses')
        .select('id, name, address, city, state, business_type, whatsapp, hours, maps_link')
        .eq('id', id)
        .single()

      const { data: productData } = await supabase
        .from('products')
        .select('id, name, generic_name, price, stock, emoji')
        .eq('business_id', id)
        .eq('list_on_carefind', true)
        .gt('stock', 0)

      setBiz(bizData)
      setProducts(productData || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div style={{ padding: 20, fontFamily: 'sans-serif' }}>Loading...</div>
  if (!biz) return <div style={{ padding: 20, fontFamily: 'sans-serif' }}>Business not found.</div>

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto', padding: 20 }}>
      <Link to="/" style={{ color: '#0f766e', textDecoration: 'none', fontSize: 14 }}>← Back to search</Link>

      <h1 style={{ fontSize: 22, margin: '12px 0 4px 0' }}>{biz.name}</h1>
      <p style={{ color: '#666', margin: '0 0 12px 0' }}>{biz.business_type} · {biz.city}, {biz.state}</p>
      <p style={{ margin: '0 0 4px 0' }}>{biz.address}</p>
      {biz.hours && <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: 14 }}>Hours: {biz.hours}</p>}

      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        {biz.whatsapp && (
          <a
            href={`https://wa.me/${biz.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            style={{ padding: '10px 16px', background: '#25D366', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 14 }}
          >
            WhatsApp
          </a>
        )}
        {biz.maps_link && (
          <a
            href={biz.maps_link}
            target="_blank"
            rel="noreferrer"
            style={{ padding: '10px 16px', background: '#0f766e', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 14 }}
          >
            Directions
          </a>
        )}
      </div>

      <h2 style={{ fontSize: 18, marginTop: 24, marginBottom: 12 }}>Available Products</h2>
      {products.length === 0 && <p style={{ color: '#666' }}>No products listed yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {products.map((p) => (
          <div key={p.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 12 }}>
            <p style={{ margin: '0 0 2px 0', fontWeight: 600 }}>{p.emoji ? `${p.emoji} ` : ''}{p.name}</p>
            {p.generic_name && <p style={{ margin: '0 0 2px 0', color: '#666', fontSize: 13 }}>{p.generic_name}</p>}
            <p style={{ margin: 0, fontSize: 14 }}>₦{p.price} · In stock: {p.stock}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BusinessProfile
