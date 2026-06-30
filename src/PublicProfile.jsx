import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'

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

  const themes = {
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

  if (loading) return <div style={{ padding: 20, fontFamily: 'sans-serif' }}>Loading...</div>
  if (!profile) return <div style={{ padding: 20, fontFamily: 'sans-serif' }}>User not found.</div>

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 420, margin: '0 auto', padding: 20 }}>
      <Link to="/feed" style={{ color: '#0f766e', textDecoration: 'none', fontSize: 14 }}>← Back to Feed</Link>

      <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 24 }}>
        <div
          style={{
            width: 88, height: 88, borderRadius: '50%',
            background: profile.avatar_url ? `url(${profile.avatar_url})` : '#0f766e',
            backgroundSize: 'cover', backgroundPosition: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 auto',
          }}
        >
          {!profile.avatar_url && (profile.display_name ? profile.display_name[0].toUpperCase() : '?')}
        </div>
        <p style={{ margin: '12px 0 2px 0', fontWeight: 700, fontSize: 18 }}>{profile.display_name || 'CareFind User'}</p>
        {profile.bio && <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#333' }}>{profile.bio}</p>}
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Posts</h2>
      {posts.length === 0 && <p style={{ color: '#666' }}>No posts yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {posts.map((post) => (
          <div key={post.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: post.post_type === 'visual' ? 0 : 14, overflow: 'hidden' }}>
            {post.post_type === 'visual' ? (
              <div style={{ background: themes[post.theme] || themes.teal, padding: 24, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#fff', fontSize: 18, fontWeight: 700, textAlign: 'center', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {post.content}
                </p>
              </div>
            ) : (
              <p style={{ margin: '0 0 8px 0', whiteSpace: 'pre-wrap' }}>{post.content}</p>
            )}
            <p style={{ margin: post.post_type === 'visual' ? '8px 14px' : 0, color: '#999', fontSize: 12 }}>
              {timeAgo(post.created_at)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PublicProfile
