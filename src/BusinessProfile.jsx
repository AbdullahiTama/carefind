import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import { theme } from './lib/theme'
import { getSentimentSummary } from './lib/sentiment'

function BusinessProfile() {
  const { id } = useParams()
  const { user } = useAuth()
  const [biz, setBiz] = useState(null)
  const [products, setProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadAll() {
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

    const { data: reviewData } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at')
      .eq('business_id', id)
      .order('created_at', { ascending: false })

    setBiz(bizData)
    setProducts(productData || [])
    setReviews(reviewData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line
  }, [id])

  async function handleSubmitReview(e) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)

    const { error } = await supabase.from('reviews').insert({
      business_id: id,
      user_id: user.id,
      rating,
      comment,
    })

    if (!error) {
      setComment('')
      setRating(5)
      loadAll()
    } else {
      console.error('Review error:', error)
    }
    setSubmitting(false)
  }

  if (loading) return <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>Loading...</div>
  if (!biz) return <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>Business not found.</div>

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const typeIcons = { pharmacy: '💊', hospital: '🏥', dental: '🦷', optical: '👁️', wellness: '🌿', skincare: '✨' }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ background: theme.heroGradient, padding: '20px 20px 26px 20px', borderRadius: '0 0 28px 28px', color: '#fff' }}>
        <Link to="/search" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>← Back to search</Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <span style={{
            width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
          }}>
            {typeIcons[biz.business_type] || '🏪'}
          </span>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 900, margin: '0 0 2px 0', letterSpacing: '-0.01em' }}>{biz.name}</h1>
            <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.65)', textTransform: 'capitalize' }}>
              {biz.business_type} · {biz.city}, {biz.state}
            </p>
          </div>
        </div>

        {avgRating && (
          <p style={{ margin: '12px 0 0 0', fontWeight: 700, fontSize: 13, color: theme.tealBright }}>
            ⭐ {avgRating} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div style={{ padding: '20px 20px 0 20px' }}>
        <p style={{ margin: '0 0 4px 0', fontSize: 13.5, color: theme.textMid }}>{biz.address}</p>
        {biz.hours && <p style={{ margin: '0 0 14px 0', color: theme.textLight, fontSize: 12.5 }}>Hours: {biz.hours}</p>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {biz.whatsapp && (
            <a
              href={`https://wa.me/${biz.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              style={{ flex: 1, textAlign: 'center', padding: '11px 16px', background: '#25D366', color: '#fff', borderRadius: 14, textDecoration: 'none', fontSize: 13.5, fontWeight: 700 }}
            >
              WhatsApp
            </a>
          )}
          {biz.maps_link && (
            <a
              href={biz.maps_link}
              target="_blank"
              rel="noreferrer"
              style={{ flex: 1, textAlign: 'center', padding: '11px 16px', background: theme.tealGradient, color: '#fff', borderRadius: 14, textDecoration: 'none', fontSize: 13.5, fontWeight: 700 }}
            >
              Directions
            </a>
          )}
        </div>

        <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>
          Available Products
        </p>
        {products.length === 0 && <p style={{ color: theme.textLight, fontSize: 13 }}>No products listed yet.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
          {products.map((p) => (
            <div key={p.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: 13, background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <p style={{ margin: '0 0 2px 0', fontWeight: 700, fontSize: 14, color: theme.navy }}>{p.emoji ? `${p.emoji} ` : ''}{p.name}</p>
              {p.generic_name && <p style={{ margin: '0 0 2px 0', color: theme.textLight, fontSize: 12 }}>{p.generic_name}</p>}
              <p style={{ margin: 0, fontSize: 13, color: theme.textMid, fontWeight: 600 }}>₦{p.price} · In stock: {p.stock}</p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>
          Reviews
        </p>

        {reviews.length > 0 && (() => {
          const { positive, negative, neutral, themes } = getSentimentSummary(reviews)
          return (
            <div style={{ border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 16 }}>
              <p style={{ margin: '0 0 10px 0', fontSize: 12, fontWeight: 800, color: theme.textMid, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sentiment</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, background: '#ecfdf5', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: theme.success }}>{positive.length}</p>
                  <p style={{ margin: 0, fontSize: 10.5, color: theme.success, fontWeight: 700 }}>Positive</p>
                </div>
                <div style={{ flex: 1, background: '#fef9c3', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: theme.warning }}>{neutral.length}</p>
                  <p style={{ margin: 0, fontSize: 10.5, color: theme.warning, fontWeight: 700 }}>Neutral</p>
                </div>
                <div style={{ flex: 1, background: '#fef2f2', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: theme.alert }}>{negative.length}</p>
                  <p style={{ margin: 0, fontSize: 10.5, color: theme.alert, fontWeight: 700 }}>Negative</p>
                </div>
              </div>
              {themes.length > 0 && (
                <>
                  <p style={{ margin: '0 0 6px 0', fontSize: 11, fontWeight: 800, color: theme.textMid, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Common themes</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {themes.map((t) => (
                      <span key={t} style={{ padding: '4px 10px', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 20, fontSize: 12, color: theme.textMid, fontWeight: 600 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })()}

        {user ? (
          <form onSubmit={handleSubmitReview} style={{ marginBottom: 18, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ marginBottom: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setRating(n)}
                  style={{ background: 'none', border: 'none', fontSize: 22, color: n <= rating ? theme.warning : '#ddd' }}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={3}
              style={{ width: '100%', padding: 10, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 12, fontFamily: 'inherit' }}
            />
            <button
              type="submit"
              disabled={submitting}
              style={{ marginTop: 10, padding: '9px 18px', background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13 }}
            >
              {submitting ? 'Posting...' : 'Post Review'}
            </button>
          </form>
        ) : (
          <p style={{ color: theme.textLight, fontSize: 13, marginBottom: 18 }}>
            <Link to="/login" style={{ color: theme.tealDeep, fontWeight: 700 }}>Log in</Link> to leave a review.
          </p>
        )}

        {reviews.length === 0 && <p style={{ color: theme.textLight, fontSize: 13 }}>No reviews yet. Be the first!</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: 13, background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <p style={{ margin: '0 0 4px 0', color: theme.warning, fontSize: 13 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
              {r.comment && <p style={{ margin: 0, fontSize: 13.5, color: theme.textMid }}>{r.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BusinessProfile
