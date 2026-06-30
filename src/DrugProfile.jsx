import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import { theme } from './lib/theme'
import BottomNav from './BottomNav.jsx'

function DrugProfile() {
  const { name } = useParams()
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState(null)
  const [userReviewedIds, setUserReviewedIds] = useState([])

  async function loadAll() {
    setLoading(true)
    const decodedName = decodeURIComponent(name)

    const { data: productData } = await supabase
      .from('products')
      .select('id, name, generic_name, price, stock, emoji, business_id, businesses(id, name, city, state, whatsapp, visible_on_carefind)')
      .ilike('name', `%${decodedName}%`)
      .eq('list_on_carefind', true)
      .gt('stock', 0)

    const filtered = (productData || []).filter((p) => p.businesses?.visible_on_carefind)
    setProducts(filtered)

    if (filtered.length > 0) {
      const productIds = filtered.map((p) => p.id)

      const { data: reviewData } = await supabase
        .from('product_reviews')
        .select('id, rating, comment, created_at, product_id, user_id')
        .in('product_id', productIds)
        .order('created_at', { ascending: false })
      setReviews(reviewData || [])

      if (user) {
        const alreadyReviewed = (reviewData || [])
          .filter((r) => r.user_id === user.id)
          .map((r) => r.product_id)
        setUserReviewedIds(alreadyReviewed)
      }

      setSelectedProductId(productIds[0])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line
  }, [name, user])

  async function handleSubmitReview(e) {
    e.preventDefault()
    if (!user || !selectedProductId) return
    setSubmitting(true)

    const { error } = await supabase.from('product_reviews').insert({
      user_id: user.id,
      product_id: selectedProductId,
      rating,
      comment: comment.trim(),
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

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const ratingBreakdown = [5, 4, 3, 2, 1].map((n) => ({
    star: n,
    count: reviews.filter((r) => r.rating === n).length,
    pct: reviews.length ? Math.round((reviews.filter((r) => r.rating === n).length / reviews.length) * 100) : 0,
  }))

  const lowestPrice = products.length ? Math.min(...products.map((p) => p.price)) : null

  const alreadyReviewedSelected = userReviewedIds.includes(selectedProductId)

  if (loading) return <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>Loading...</div>

  if (products.length === 0) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>
        <div style={{ background: theme.heroGradient, padding: '22px 20px 26px 20px', borderRadius: '0 0 28px 28px', color: '#fff' }}>
          <Link to="/search" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>← Search</Link>
          <h1 style={{ fontSize: 21, fontWeight: 900, margin: '14px 0 4px 0' }}>{decodeURIComponent(name)}</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px auto' }}>💊</div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: theme.navy, margin: '0 0 4px 0' }}>No listings found</h3>
          <p style={{ fontSize: 13, color: theme.textLight, margin: 0 }}>This medication isn't listed by any pharmacy yet</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  const drugName = products[0]?.name || decodeURIComponent(name)
  const genericName = products[0]?.generic_name

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>
      <div style={{ background: theme.heroGradient, padding: '22px 20px 26px 20px', borderRadius: '0 0 28px 28px', color: '#fff' }}>
        <Link to="/search" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>← Search</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <span style={{ fontSize: 28 }}>{products[0]?.emoji || '💊'}</span>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 900, margin: '0 0 2px 0' }}>{drugName}</h1>
            {genericName && <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.65)' }}>Generic: {genericName}</p>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '10px 12px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>{products.length}</p>
            <p style={{ margin: 0, fontSize: 10.5, color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>Pharmacies</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '10px 12px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>₦{lowestPrice?.toLocaleString()}</p>
            <p style={{ margin: 0, fontSize: 10.5, color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>Lowest Price</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '10px 12px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>{avgRating || '—'}</p>
            <p style={{ margin: 0, fontSize: 10.5, color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>Avg Rating</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 20px 0 20px' }}>
        {avgRating && (
          <>
            <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>
              Review Intelligence
            </p>
            <div style={{ border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: theme.navy }}>{avgRating}</span>
                <div>
                  <p style={{ margin: 0, color: theme.warning, fontSize: 14 }}>{'★'.repeat(Math.round(Number(avgRating)))}{'☆'.repeat(5 - Math.round(Number(avgRating)))}</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: theme.textLight }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''} from users</p>
                </div>
              </div>
              {ratingBreakdown.map((r) => (
                <div key={r.star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 11.5, color: theme.textMid, width: 12 }}>{r.star}</span>
                  <span style={{ fontSize: 11, color: theme.warning }}>★</span>
                  <div style={{ flex: 1, height: 6, background: theme.bg, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${r.pct}%`, height: '100%', background: r.star >= 4 ? theme.success : r.star === 3 ? theme.warning : theme.alert, borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, color: theme.textLight, width: 24 }}>{r.count}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>
          Where to Buy ({products.length})
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {products.sort((a, b) => a.price - b.price).map((p) => (
            <div key={p.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <Link to={`/business/${p.business_id}`} style={{ textDecoration: 'none' }}>
                    <p style={{ margin: '0 0 2px 0', fontWeight: 800, fontSize: 14, color: theme.navy }}>{p.businesses?.name}</p>
                  </Link>
                  <p style={{ margin: 0, fontSize: 12, color: theme.textLight }}>{p.businesses?.city}, {p.businesses?.state}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 2px 0', fontWeight: 900, fontSize: 16, color: theme.tealDeep }}>₦{p.price?.toLocaleString()}</p>
                  <p style={{ margin: 0, fontSize: 11, color: theme.textLight }}>Stock: {p.stock}</p>
                </div>
              </div>
              {p.businesses?.whatsapp && (
                <a
                  href={`https://wa.me/${p.businesses.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-block', padding: '7px 14px', background: '#25D366', color: '#fff', borderRadius: 12, textDecoration: 'none', fontSize: 12.5, fontWeight: 700 }}
                >
                  WhatsApp
                </a>
              )}
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>
          Leave a Review
        </p>

        {user ? (
          <form onSubmit={handleSubmitReview} style={{ border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 20 }}>
            {products.length > 1 && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11.5, color: theme.textLight, fontWeight: 700 }}>Reviewing which product?</label>
                <select
                  value={selectedProductId || ''}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  style={{ width: '100%', padding: 10, fontSize: 13, border: `1px solid ${theme.border}`, borderRadius: 10, marginTop: 4, background: '#fff' }}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.businesses?.name} — ₦{p.price}</option>
                  ))}
                </select>
              </div>
            )}

            {alreadyReviewedSelected ? (
              <p style={{ fontSize: 13, color: theme.textLight, margin: 0 }}>You've already reviewed this product listing.</p>
            ) : (
              <>
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
                  placeholder="Share your experience with this medication..."
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
              </>
            )}
          </form>
        ) : (
          <p style={{ color: theme.textLight, fontSize: 13, marginBottom: 20 }}>
            <Link to="/login" style={{ color: theme.tealDeep, fontWeight: 700 }}>Log in</Link> to leave a review on this medication.
          </p>
        )}

        {reviews.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>
              Recent Reviews
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reviews.slice(0, 10).map((r) => {
                const productForReview = products.find((p) => p.id === r.product_id)
                return (
                  <div key={r.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: 12, background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <p style={{ margin: '0 0 2px 0', fontSize: 10.5, color: theme.textLight, fontWeight: 700 }}>
                      {productForReview?.businesses?.name}
                    </p>
                    <p style={{ margin: '0 0 4px 0', color: theme.warning, fontSize: 13 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                    {r.comment && <p style={{ margin: 0, fontSize: 13, color: theme.textMid }}>{r.comment}</p>}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

export default DrugProfile
