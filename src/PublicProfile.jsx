import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { theme } from './lib/theme'

function PublicProfile() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, display_name, bio, avatar_url')
        .eq('id', id)
        .single()

      const { data: postData } = await supabase
        .from('posts')
        .select('id, content, created_at, post_type, theme')
        .eq('user_id', id)
        .order('created_at', { ascending: false })

      setProfile(profileData)
      setPosts(postData || [])
      setLoading(false)
    }
    load()
  }, [id])

  const visualThemes = {
    teal: 'linear-gradient(135deg, #0f766e, #134e4a)',
    sunset: 'linear-gradient(135deg, #f97316, #db2777)',
    ocean: 'linear-gradient(135deg, #0ea5e9, #1e3a8a)',
    purple: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
    forest: 'linear-gradient(135deg, #16a34a, #14532d)',
  }

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  if (loading) return <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>Loading...</div>
  if (!profile) return <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>User not found.</div>

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 420, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ background: theme.heroGradient, padding: '24px 20px 50px 20px', borderRadius: '0 0 28px 28px', color: '#fff', textAlign: 'center', position: 'relative' }}>
        <Link to="/" style={{ position: 'absolute', left: 20, top: 22, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>← Feed</Link>
      </div>

      <div style={{ textAlign: 'center', marginTop: -42, padding: '0 20px', marginBottom: 22 }}>
        <div
          style={{
            width: 88, height: 88, borderRadius: '50%',
            background: profile.avatar_url ? `url(${profile.avatar_url})` : theme.tealGradient,
            backgroundSize: 'cover', backgroundPosition: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 28, fontWeight: 800, margin: '0 auto',
            border: '4px solid #fff', boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          }}
        >
          {!profile.avatar_url && (profile.display_name ? profile.display_name[0].toUpperCase() : '?')}
        </div>
        <p style={{ margin: '14px 0 2px 0', fontWeight: 900, fontSize: 18, color: theme.navy }}>{profile.display_name || 'CareFind User'}</p>
        {profile.bio && <p style={{ margin: '6px 0 0 0', fontSize: 13.5, color: theme.textMid, lineHeight: 1.5 }}>{profile.bio}</p>}
      </div>

      <div style={{ padding: '0 20px' }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>Posts</p>
        {posts.length === 0 && <p style={{ color: theme.textLight, fontSize: 13 }}>No posts yet.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map((post) => (
            <div key={post.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 16, padding: post.post_type === 'visual' ? 0 : 14, overflow: 'hidden', background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              {post.post_type === 'visual' ? (
                <div style={{ background: visualThemes[post.theme] || visualThemes.teal, padding: 22, minHeight: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: '#fff', fontSize: 16, fontWeight: 800, textAlign: 'center', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {post.content}
                  </p>
                </div>
              ) : (
                <p style={{ margin: '0 0 8px 0', whiteSpace: 'pre-wrap', fontSize: 13.5, color: theme.textMid }}>{post.content}</p>
              )}
              <p style={{ margin: post.post_type === 'visual' ? '8px 14px' : 0, color: theme.textLight, fontSize: 11.5 }}>
                {timeAgo(post.created_at)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PublicProfile
