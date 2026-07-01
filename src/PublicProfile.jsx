import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import { theme } from './lib/theme'
import BottomNav from './BottomNav.jsx'

function PublicProfile() {
  const { id } = useParams()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [followerCount, setFollowerCount] = useState(0)
  const [postCount, setPostCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)

  const visualThemes = {
    teal: 'linear-gradient(135deg, #0f766e, #134e4a)',
    sunset: 'linear-gradient(135deg, #f97316, #db2777)',
    ocean: 'linear-gradient(135deg, #0ea5e9, #1e3a8a)',
    purple: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
    forest: 'linear-gradient(135deg, #16a34a, #14532d)',
  }

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, display_name, bio, avatar_url, is_verified, verification_label, location, website')
        .eq('id', id)
        .maybeSingle()

      if (!profileData) {
        setLoading(false)
        return
      }

      setProfile(profileData)

      const [postData, followerData] = await Promise.all([
        supabase.from('posts').select('id, content, created_at, post_type, theme').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', id),
      ])

      setPosts(postData.data || [])
      setFollowerCount(followerData.count || 0)
      setPostCount(postData.data?.length || 0)

      if (user) {
        const { data: followData } = await supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', id).maybeSingle()
        setIsFollowing(!!followData)
      }

      setLoading(false)
    }
    load()
  }, [id, user])

  async function toggleFollow() {
    if (!user) return
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', id)
      setIsFollowing(false)
      setFollowerCount((n) => n - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: id })
      setIsFollowing(true)
      setFollowerCount((n) => n + 1)
    }
  }

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  if (loading) return <div style={{ padding: 20, fontFamily: 'system-ui' }}>Loading...</div>

  if (!profile) {
    return (
      <div style={{ fontFamily: 'system-ui', maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>
        <div style={{ background: theme.heroGradient, padding: '22px 20px 26px 20px', borderRadius: '0 0 28px 28px', color: '#fff' }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>← Feed</Link>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>👤</div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: theme.navy, margin: '0 0 6px 0' }}>Profile not found</h3>
          <p style={{ fontSize: 13, color: theme.textLight }}>This user may have deleted their account.</p>
          <Link to="/" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: theme.tealGradient, color: '#fff', borderRadius: 14, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>
            Back to Feed
          </Link>
        </div>
        <BottomNav />
      </div>
    )
  }

  const displayName = profile.full_name || profile.display_name || 'CareFind User'
  const isOwnProfile = user?.id === id

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>
      <div style={{ position: 'relative', marginBottom: 55 }}>
        <div style={{ height: 110, background: theme.heroGradient, position: 'relative' }}>
          <Link to="/" style={{ position: 'absolute', top: 16, left: 16, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>← Feed</Link>
        </div>
        <div style={{ position: 'absolute', bottom: -46, left: 16 }}>
          <div style={{
            width: 86, height: 86, borderRadius: '50%',
            background: profile.avatar_url ? `url(${profile.avatar_url})` : theme.tealGradient,
            backgroundSize: 'cover', backgroundPosition: 'center',
            border: '4px solid #fff', boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 28, fontWeight: 800,
          }}>
            {!profile.avatar_url && (displayName[0]?.toUpperCase() || '?')}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: -40, right: 16 }}>
          {isOwnProfile ? (
            <Link to="/profile" style={{
              border: `1px solid ${theme.border}`, background: '#fff', color: theme.navy,
              borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}>
              Edit Profile
            </Link>
          ) : user ? (
            <button onClick={toggleFollow} style={{
              background: isFollowing ? '#fff' : theme.tealGradient,
              color: isFollowing ? theme.navy : '#fff',
              border: `1px solid ${isFollowing ? theme.border : 'transparent'}`,
              borderRadius: 20, padding: '7px 18px', fontSize: 13, fontWeight: 700,
            }}>
              {isFollowing ? 'Following' : '+ Follow'}
            </button>
          ) : (
            <Link to="/login" style={{
              background: theme.tealGradient, color: '#fff', border: 'none',
              borderRadius: 20, padding: '7px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}>
              + Follow
            </Link>
          )}
        </div>
      </div>

      <div style={{ padding: '0 16px 16px 16px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: theme.navy, margin: '0 0 2px 0' }}>{displayName}</h1>
        {profile.display_name && <p style={{ margin: '0 0 6px 0', fontSize: 13, color: theme.textLight }}>@{profile.display_name}</p>}
        {profile.is_verified && (
          <span style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, background: '#ecfdf5', padding: '2px 10px', borderRadius: 20, border: `1px solid ${theme.tealBright}`, display: 'inline-block', marginBottom: 8 }}>
            ✓ Verified {profile.verification_label}
          </span>
        )}
        {profile.bio && <p style={{ margin: '8px 0 6px 0', fontSize: 14, color: theme.textMid, lineHeight: 1.5 }}>{profile.bio}</p>}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          {profile.location && <span style={{ fontSize: 12.5, color: theme.textLight }}>📍 {profile.location}</span>}
          {profile.website && <a href={profile.website} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: theme.tealDeep, textDecoration: 'none' }}>🔗 {profile.website}</a>}
        </div>

        <div style={{ display: 'flex', gap: 20, borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`, padding: '12px 0', marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: theme.navy }}>{postCount}</p>
            <p style={{ margin: 0, fontSize: 11, color: theme.textLight, fontWeight: 600 }}>Posts</p>
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: theme.navy }}>{followerCount}</p>
            <p style={{ margin: 0, fontSize: 11, color: theme.textLight, fontWeight: 600 }}>Followers</p>
          </div>
        </div>

        <p style={{ fontSize: 11, fontWeight: 800, color: theme.tealDeep, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>Posts</p>
        {posts.length === 0 && <p style={{ color: theme.textLight, fontSize: 13 }}>No posts yet.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map((post) => (
            <div key={post.id} style={{ border: `1px solid ${theme.border}`, borderRadius: 16, padding: post.post_type === 'visual' ? 0 : 14, overflow: 'hidden', background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              {post.post_type === 'visual' ? (
                <div style={{ background: visualThemes[post.theme] || visualThemes.teal, padding: 22, minHeight: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: '#fff', fontSize: 16, fontWeight: 800, textAlign: 'center', margin: 0, whiteSpace: 'pre-wrap' }}>{post.content}</p>
                </div>
              ) : (
                <p style={{ margin: '0 0 8px 0', whiteSpace: 'pre-wrap', fontSize: 13.5, color: theme.textMid }}>{post.content}</p>
              )}
              <p style={{ margin: post.post_type === 'visual' ? '8px 14px' : 0, color: theme.textLight, fontSize: 11.5 }}>{timeAgo(post.created_at)}</p>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export default PublicProfile
