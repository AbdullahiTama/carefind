import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { theme } from './lib/theme'
import BottomNav from './BottomNav.jsx'
import ArticleEditor from './ArticleEditor.jsx'

function NewsArticle() {
  const { id } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('news')
        .select('id, headline, subtitle, body, hero_image_url, published_at, created_at, status, author_id, profiles(full_name, display_name, verification_label, is_verified)')
        .eq('id', id)
        .maybeSingle()
      setArticle(data || null)

      // A few more approved stories to show at the bottom
      const { data: moreData } = await supabase
        .from('news')
        .select('id, headline, hero_image_url, published_at, created_at')
        .eq('status', 'approved')
        .neq('id', id)
        .order('published_at', { ascending: false })
        .limit(4)
      setMore(moreData || [])
      setLoading(false)
      window.scrollTo(0, 0)
    }
    load()
  }, [id])

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  function authorName(a) {
    return a?.profiles?.full_name || a?.profiles?.display_name || 'CareFind Contributor'
  }

  if (loading) return <div style={{ padding: 20, fontFamily: 'system-ui' }}>Loading…</div>

  if (!article || article.status !== 'approved') {
    return (
      <div style={{ fontFamily: 'system-ui', maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}>📰</div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: theme.navy, margin: '0 0 6px 0' }}>Article not available</h3>
          <p style={{ fontSize: 13, color: theme.textLight }}>This story may have been removed or is still under review.</p>
          <Link to="/news" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: theme.tealGradient, color: '#fff', borderRadius: 14, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>Back to News</Link>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', maxWidth: 480, margin: '0 auto', paddingBottom: 90, background: '#fff' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${theme.border}`, fontFamily: 'system-ui' }}>
        <Link to="/news" style={{ fontSize: 13, fontWeight: 700, color: theme.textMid, textDecoration: 'none' }}>← News</Link>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: theme.tealDeep, textTransform: 'uppercase' }}>CareFind Health News</span>
        <button
          onClick={() => { if (navigator.share) navigator.share({ title: article.headline, url: window.location.href }) }}
          style={{ background: 'none', border: 'none', fontSize: 16, color: theme.textMid }}
        >↗</button>
      </div>

      <div style={{ padding: '20px 18px 0' }}>
        {/* Kicker */}
        <p style={{ margin: '0 0 10px 0', fontFamily: 'system-ui', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: theme.tealDeep, textTransform: 'uppercase' }}>Health</p>

        {/* Headline */}
        <h1 style={{ margin: '0 0 12px 0', fontSize: 29, fontWeight: 900, color: theme.navy, lineHeight: 1.12, letterSpacing: '-0.02em' }}>
          {article.headline}
        </h1>

        {/* Subtitle */}
        {article.subtitle && (
          <p style={{ margin: '0 0 16px 0', fontSize: 17, color: theme.textMid, lineHeight: 1.45, fontStyle: 'italic' }}>
            {article.subtitle}
          </p>
        )}

        {/* Byline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`, marginBottom: 18, fontFamily: 'system-ui' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: theme.tealGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 15 }}>
            {(authorName(article)[0] || 'C').toUpperCase()}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: theme.navy }}>
              By {authorName(article)}
              {article.profiles?.is_verified && <span style={{ color: theme.tealDeep, marginLeft: 4 }}>✓</span>}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: theme.textLight }}>
              {article.profiles?.verification_label ? `${article.profiles.verification_label} · ` : ''}{formatDate(article.published_at || article.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Hero image */}
      {article.hero_image_url && (
        <figure style={{ margin: '0 0 20px 0' }}>
          <img src={article.hero_image_url} alt={article.headline} style={{ width: '100%', display: 'block' }} />
        </figure>
      )}

      {/* Body */}
      <div style={{ padding: '0 18px' }}>
        <div style={{ fontSize: 17, lineHeight: 1.7, color: '#1f2937' }}>
          <ArticleEditor value={article.body} readOnly />
        </div>
      </div>

      {/* End mark */}
      <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
        <span style={{ fontSize: 18, color: theme.tealDeep, fontWeight: 900 }}>■</span>
      </div>

      {/* More news */}
      {more.length > 0 && (
        <div style={{ borderTop: `8px solid ${theme.bg}`, marginTop: 12, padding: '16px 18px' }}>
          <p style={{ margin: '0 0 12px 0', fontFamily: 'system-ui', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: theme.tealDeep, textTransform: 'uppercase' }}>More from CareFind News</p>
          {more.map((m) => (
            <Link key={m.id} to={`/news/${m.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 800, color: theme.navy, lineHeight: 1.25 }}>{m.headline}</h4>
                <p style={{ margin: 0, fontFamily: 'system-ui', fontSize: 11, color: theme.textLight }}>{formatDate(m.published_at || m.created_at)}</p>
              </div>
              {m.hero_image_url && (
                <div style={{ width: 74, height: 74, borderRadius: 6, flexShrink: 0, background: `url(${m.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              )}
            </Link>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default NewsArticle
