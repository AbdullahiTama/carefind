import { useEffect, useState, useRef } from 'react'
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

  // Stories for this profile
  const [userStories, setUserStories] = useState([])
  const [viewerIndex, setViewerIndex] = useState(null)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef(null)
  const STORY_DURATION = 6000

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
        .select('id, full_name, display_name, is_verified, verification_label, location, website')
        .eq('id', id)
        .maybeSingle()

      if (!profileData) {
        setLoading(false)
        return
      }

      setProfile(profileData)

      const [postData, followerData, storyData] = await Promise.all([
        supabase.from('posts').select('id, content, created_at, post_type, theme').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', id),
        supabase.from('stories').select('id, title, body, image_url, bg_color, created_at').eq('user_id', id).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }),
      ])

      setPosts(postData.data || [])
      setFollowerCount(followerData.count || 0)
      setPostCount(postData.data?.length || 0)
      setUserStories(storyData.data || [])

      if (user) {
        const { data: followData } = await supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', id).maybeSingle()
        setIsFollowing(!!followData)
      }

      setLoading(false)
    }
    load()
  }, [id, user])

  // Story viewer progress
  useEffect(() => {
    if (viewerIndex === null) return
    setProgress(0)
    const st = userStories[viewerIndex]
    if (st) supabase.rpc('increment_story_view', { story_id: st.id })
    const start = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, (elapsed / STORY_DURATION) * 100)
      setProgress(pct)
      if (pct >= 100) { clearInterval(timerRef.current); goNext() }
    }, 50)
    return () => clearInterval(timerRef.current)
  }, [viewerIndex])

  function closeViewer() { setViewerIndex(null); if (timerRef.current) clearInterval(timerRef.current) }
  function goNext() {
    setViewerIndex((prev) => (prev === null ? null : prev + 1 >= userStories.length ? null : prev + 1))
  }
  function goPrev() {
    setViewerIndex((prev) => (prev === null ? null : prev - 1 < 0 ? 0 : prev - 1))
  }

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
  const hasStory = userStories.length > 0

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 90 }}>
      <div style={{ position: 'relative', marginBottom: 55 }}>
        <div style={{ height: 110, background: theme.heroGradient, position: 'relative' }}>
          <Link to="/" style={{ position: 'absolute', top: 16, left: 16, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>← Feed</Link>
        </div>
        <div style={{ position: 'absolute', bottom: -46, left: 16 }}>
          {/* Avatar with optional story ring */}
          <div
            onClick={() => { if (hasStory) setViewerIndex(0) }}
            style={{
              width: 94, height: 94, borderRadius: '50%', padding: hasStory ? 4 : 0,
              background: hasStory ? `linear-gradient(135deg, ${theme.tealBright}, ${theme.tealDeep})` : 'transparent',
              cursor: hasStory ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{
              width: 86, height: 86, borderRadius: '50%',
              background: theme.tealGradient,
              border: '4px solid #fff', boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 28, fontWeight: 800, boxSizing: 'border-box',
            }}>
              {displayName[0]?.toUpperCase() || '?'}
            </div>
          </div>
          {hasStory && (
            <span style={{ display: 'block', textAlign: 'center', fontSize: 10, fontWeight: 800, color: theme.tealDeep, marginTop: 2 }}>
              Tap to view story
            </span>
          )}
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
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, marginTop: 8 }}>
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

      {/* Story viewer */}
      {viewerIndex !== null && userStories[viewerIndex] && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 4, padding: '10px 10px 0' }}>
            {userStories.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: '#fff', width: i < viewerIndex ? '100%' : i === viewerIndex ? `${progress}%` : '0%', transition: i === viewerIndex ? 'width 0.05s linear' : 'none' }} />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: theme.tealGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14 }}>
              {displayName[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 800 }}>{displayName}</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{timeAgo(userStories[viewerIndex].created_at)}</p>
            </div>
            <button onClick={closeViewer} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 26, lineHeight: 1, padding: '0 6px' }}>✕</button>
          </div>

          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={goPrev} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '35%', zIndex: 2 }} />
            <div onClick={goNext} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '35%', zIndex: 2 }} />

            {userStories[viewerIndex].image_url ? (
              <div style={{ width: '100%', height: '100%', background: `url(${userStories[viewerIndex].image_url})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: userStories[viewerIndex].bg_color || theme.tealDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30, boxSizing: 'border-box' }}>
                <div style={{ textAlign: 'center', maxWidth: 340 }}>
                  {userStories[viewerIndex].title && <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: '0 0 14px 0', lineHeight: 1.2 }}>{userStories[viewerIndex].title}</h2>}
                  {userStories[viewerIndex].body && <p style={{ color: 'rgba(255,255,255,0.92)', fontSize: 17, lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{userStories[viewerIndex].body}</p>}
                </div>
              </div>
            )}

            {userStories[viewerIndex].image_url && (userStories[viewerIndex].title || userStories[viewerIndex].body) && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3, padding: '40px 20px 24px', background: 'linear-gradient(transparent, rgba(0,0,0,0.75))' }}>
                {userStories[viewerIndex].title && <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 900, margin: '0 0 6px 0' }}>{userStories[viewerIndex].title}</h2>}
                {userStories[viewerIndex].body && <p style={{ color: 'rgba(255,255,255,0.92)', fontSize: 14, lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{userStories[viewerIndex].body}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default PublicProfile
