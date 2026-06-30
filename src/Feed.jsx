import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import BottomNav from './BottomNav.jsx'
import { theme } from './lib/theme'
import { wrapBold, wrapItalic, wrapHighlight, renderArticleHtml } from './lib/articleFormat'
import { useRef } from 'react'

function Feed() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [reactions, setReactions] = useState([])
  const [profiles, setProfiles] = useState({})
  const [follows, setFollows] = useState([])
  const [savedPosts, setSavedPosts] = useState([])
  const [reportedPosts, setReportedPosts] = useState([])
  const [reportingId, setReportingId] = useState(null)
  const [comments, setComments] = useState({})
  const [openComments, setOpenComments] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState('text') // text, visual, question, review, article
  const [visualTheme, setVisualTheme] = useState('teal')
  const [postRating, setPostRating] = useState(5)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const articleTextareaRef = useRef(null)
  const [highlightColor, setHighlightColor] = useState('#fde68a')
  const [reviewTarget, setReviewTarget] = useState(null) // { type: 'business'|'product', id, name }
  const [reviewSearch, setReviewSearch] = useState('')
  const [reviewSearchResults, setReviewSearchResults] = useState([])
  const [reviewSearching, setReviewSearching] = useState(false)

  const themes = {
    teal: 'linear-gradient(135deg, #0f766e, #134e4a)',
    sunset: 'linear-gradient(135deg, #f97316, #db2777)',
    ocean: 'linear-gradient(135deg, #0ea5e9, #1e3a8a)',
    purple: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
    forest: 'linear-gradient(135deg, #16a34a, #14532d)',
  }

  const postTypeLabels = {
    text: 'Text Post',
    visual: 'Visual Post',
    question: 'Question',
    review: 'Review',
    article: 'Article',
  }

  const blockedPhrases = ['spam', 'buy now', 'click here', 'whatsapp me', 'send money', 'wire transfer']

  function screenContent(text) {
    const lower = text.toLowerCase()
    return blockedPhrases.some((phrase) => lower.includes(phrase))
  }

  async function searchReviewTargets(q) {
    if (!q.trim()) return
    setReviewSearching(true)
    const [bizRes, prodRes] = await Promise.all([
      supabase.from('businesses').select('id, name, business_type').eq('visible_on_carefind', true).ilike('name', `%${q}%`).limit(4),
      supabase.from('products').select('id, name, emoji').eq('list_on_carefind', true).ilike('name', `%${q}%`).limit(4),
    ])
    const results = [
      ...(bizRes.data || []).map((b) => ({ type: 'business', id: b.id, name: b.name, sub: b.business_type })),
      ...(prodRes.data || []).map((p) => ({ type: 'product', id: p.id, name: `${p.emoji || '💊'} ${p.name}`, sub: 'Medication' })),
    ]
    setReviewSearchResults(results)
    setReviewSearching(false)
  }

  async function loadFeed() {
    setLoading(true)
    const { data: postData, error } = await supabase
      .from('posts')
      .select('id, content, created_at, user_id, post_type, theme, image_url, rating')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Feed load error:', error)
      setPosts([])
      setLoading(false)
      return
    }

    const postIds = (postData || []).map((p) => p.id)
    setPosts(postData || [])

    if (postIds.length > 0) {
      const { data: reactionData } = await supabase
        .from('post_reactions')
        .select('id, post_id, user_id')
        .in('post_id', postIds)
      setReactions(reactionData || [])

      const userIds = [...new Set((postData || []).map((p) => p.user_id))]
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, is_verified')
        .in('id', userIds)

      const profileMap = {}
      ;(profileData || []).forEach((p) => { profileMap[p.id] = p })
      setProfiles(profileMap)

      const { data: followData } = await supabase
        .from('follows')
        .select('id, follower_id, following_id')
        .in('following_id', userIds)
      setFollows(followData || [])

      if (user) {
        const { data: savedData } = await supabase
          .from('saved_posts')
          .select('id, post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds)
        setSavedPosts(savedData || [])
      } else {
        setSavedPosts([])
      }
    } else {
      setReactions([])
      setProfiles({})
      setFollows([])
      setSavedPosts([])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadFeed()
  }, [])

  function handleImageSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
  }

  async function handlePost(e) {
    e.preventDefault()
    if (!content.trim() || !user) return
    setPosting(true)

    let imageUrl = null

    if (imageFile) {
      setUploadingImage(true)
      const fileExt = imageFile.name.split('.').pop()
      const filePath = `${user.id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, imageFile)

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(filePath)
        imageUrl = urlData.publicUrl
      }
      setUploadingImage(false)
    }

    if (screenContent(content.trim())) {
      alert('Your post was flagged for review. Please remove any spam-like content and try again.')
      setPosting(false)
      return
    }

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: content.trim(),
      post_type: postType,
      theme: postType === 'visual' ? visualTheme : null,
      rating: postType === 'review' ? postRating : null,
      image_url: imageUrl,
    })

    // If it's a review and a target is tagged, also write to the intelligence layer
    if (!error && postType === 'review' && reviewTarget) {
      if (reviewTarget.type === 'business') {
        await supabase.from('reviews').insert({
          business_id: reviewTarget.id,
          user_id: user.id,
          rating: postRating,
          comment: content.trim(),
        })
      } else if (reviewTarget.type === 'product') {
        await supabase.from('product_reviews').insert({
          product_id: reviewTarget.id,
          user_id: user.id,
          rating: postRating,
          comment: content.trim(),
        })
      }
      setReviewTarget(null)
      setReviewSearch('')
      setReviewSearchResults([])
    }

    if (!error) {
      setContent('')
      setImageFile(null)
      setImagePreview(null)
      setPostRating(5)
      loadFeed()
    } else {
      console.error('Post error:', error)
    }
    setPosting(false)
  }

  function likeCount(postId) {
    return reactions.filter((r) => r.post_id === postId).length
  }

  function userHasLiked(postId) {
    if (!user) return false
    return reactions.some((r) => r.post_id === postId && r.user_id === user.id)
  }

  async function toggleLike(postId) {
    if (!user) return
    const existing = reactions.find((r) => r.post_id === postId && r.user_id === user.id)

    if (existing) {
      await supabase.from('post_reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('post_reactions').insert({ post_id: postId, user_id: user.id, reaction_type: 'like' })
    }
    loadFeed()
  }

  async function toggleComments(postId) {
    const isOpen = !openComments[postId]
    setOpenComments({ ...openComments, [postId]: isOpen })

    if (isOpen && !comments[postId]) {
      const { data } = await supabase
        .from('post_comments')
        .select('id, content, created_at, user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      setComments({ ...comments, [postId]: data || [] })
    }
  }

  async function handleAddComment(postId) {
    const text = (commentDrafts[postId] || '').trim()
    if (!text || !user) return

    const { error } = await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: user.id,
      content: text,
    })

    if (!error) {
      setCommentDrafts({ ...commentDrafts, [postId]: '' })
      const { data } = await supabase
        .from('post_comments')
        .select('id, content, created_at, user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      setComments({ ...comments, [postId]: data || [] })
    }
  }

  function isFollowing(authorId) {
    if (!user) return false
    return follows.some((f) => f.follower_id === user.id && f.following_id === authorId)
  }

  async function toggleFollow(authorId) {
    if (!user || authorId === user.id) return
    const existing = follows.find((f) => f.follower_id === user.id && f.following_id === authorId)

    if (existing) {
      await supabase.from('follows').delete().eq('id', existing.id)
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: authorId })
    }
    loadFeed()
  }

  async function handleReport(postId) {
    if (!user) return
    if (reportedPosts.includes(postId)) return
    setReportingId(postId)

    const reason = prompt('Why are you reporting this post?\n\n1. Spam\n2. False medical information\n3. Harassment\n4. Inappropriate content\n\nType the reason:')
    if (!reason) {
      setReportingId(null)
      return
    }

    await supabase.from('reports').insert({
      reporter_id: user.id,
      post_id: postId,
      reason: reason,
    })

    setReportedPosts((prev) => [...prev, postId])
    setReportingId(null)
  }

  function isSaved(postId) {
    return savedPosts.some((s) => s.post_id === postId)
  }

  async function toggleSave(postId) {
    if (!user) return
    const existing = savedPosts.find((s) => s.post_id === postId)

    if (existing) {
      await supabase.from('saved_posts').delete().eq('id', existing.id)
    } else {
      await supabase.from('saved_posts').insert({ user_id: user.id, post_id: postId })
    }
    loadFeed()
  }

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto', padding: 20, paddingBottom: 90 }}>
      <style>{`
        .article-body p { margin: 0 0 14px 0; }
        .article-body p:last-child { margin-bottom: 0; }
        .article-body p:first-of-type::first-letter {
          font-size: 2.6em; font-weight: 800; float: left; line-height: 0.85;
          padding-right: 6px; padding-top: 4px; color: ${theme.tealDeep};
        }
        .article-body mark {
          background: #fef9c3; color: #713f12; padding: 1px 4px; border-radius: 4px;
        }
        .article-body strong { font-weight: 800; color: ${theme.navy}; }
      `}</style>
      <div style={{
        background: theme.heroGradient, margin: '-20px -20px 0 -20px', padding: '22px 20px 26px 20px',
        borderRadius: '0 0 28px 28px', color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em' }}>
            CareFind<span style={{ color: theme.tealBright }}>.</span>
          </span>
          <Link to={user ? '/profile' : '/login'}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', background: theme.tealBright,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: theme.navy, fontWeight: 800, fontSize: 13, border: '2px solid rgba(255,255,255,0.3)',
            }}>
              {user ? (user.email ? user.email[0].toUpperCase() : '?') : '?'}
            </div>
          </Link>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
          Your CareFind feed
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: '0 0 16px 0', fontWeight: 500 }}>
          Health tips, questions & community near you
        </p>
        <Link to="/search" style={{
          display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.18)', borderRadius: 16, padding: '12px 16px',
          color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none',
        }}>
          🔍 Search medication, pharmacy, clinic...
        </Link>
      </div>

      {user ? (
        <form onSubmit={handlePost} style={{
          marginTop: 18, marginBottom: 16, background: theme.cardBg, border: `1px solid ${theme.border}`,
          borderRadius: 18, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {Object.keys(postTypeLabels).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setPostType(t)}
                style={{
                  padding: '7px 13px', borderRadius: 14, border: postType === t ? 'none' : `1px solid ${theme.border}`,
                  fontSize: 11.5, fontWeight: 700,
                  background: postType === t ? theme.tealGradient : theme.bg,
                  color: postType === t ? '#fff' : theme.textMid,
                }}
              >
                {postTypeLabels[t]}
              </button>
            ))}
          </div>

          {postType === 'visual' && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {Object.keys(themes).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setVisualTheme(t)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: themes[t],
                    border: visualTheme === t ? '3px solid #333' : '1px solid #ccc', cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          )}

          {postType === 'review' && (
            <div style={{ marginBottom: 10 }}>
              {reviewTarget ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ecfdf5', borderRadius: 12, padding: '8px 12px' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: theme.tealDeep, flex: 1 }}>
                    {reviewTarget.type === 'business' ? '🏥' : '💊'} {reviewTarget.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setReviewTarget(null); setReviewSearch(''); setReviewSearchResults([]) }}
                    style={{ background: 'none', border: 'none', color: theme.textLight, fontSize: 16 }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      value={reviewSearch}
                      onChange={(e) => { setReviewSearch(e.target.value) }}
                      placeholder="Tag a business or medication..."
                      style={{ flex: 1, padding: 9, fontSize: 13, border: `1px solid ${theme.border}`, borderRadius: 10 }}
                    />
                    <button
                      type="button"
                      onClick={() => searchReviewTargets(reviewSearch)}
                      style={{ padding: '8px 12px', background: theme.tealDeep, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700 }}
                    >
                      {reviewSearching ? '...' : 'Find'}
                    </button>
                  </div>
                  {reviewSearchResults.length > 0 && (
                    <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10, marginTop: 4, overflow: 'hidden' }}>
                      {reviewSearchResults.map((r) => (
                        <button
                          type="button"
                          key={r.id}
                          onClick={() => { setReviewTarget(r); setReviewSearchResults([]) }}
                          style={{ width: '100%', padding: '9px 12px', background: '#fff', border: 'none', borderBottom: `1px solid ${theme.border}`, textAlign: 'left', fontSize: 13 }}
                        >
                          <span style={{ fontWeight: 700, color: theme.navy }}>{r.name}</span>
                          <span style={{ color: theme.textLight, fontSize: 11, marginLeft: 6 }}>{r.sub}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {postType === 'review' && (
            <div style={{ marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setPostRating(n)}
                  style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: n <= postRating ? '#f5b301' : '#ccc' }}
                >
                  ★
                </button>
              ))}
            </div>
          )}

          {postType === 'visual' ? (
            <div style={{ background: themes[visualTheme], borderRadius: 10, padding: 24, marginBottom: 8, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your message..."
                rows={3}
                style={{
                  width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: 20, fontWeight: 700,
                  textAlign: 'center', resize: 'none', fontFamily: 'inherit', outline: 'none',
                }}
              />
            </div>
          ) : (
            <>
              {postType === 'article' && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => wrapBold(articleTextareaRef, content, setContent)}
                      style={{
                        padding: '5px 12px', borderRadius: 8, border: `1px solid ${theme.border}`,
                        background: theme.bg, fontWeight: 800, fontSize: 13, color: theme.textMid,
                      }}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => wrapItalic(articleTextareaRef, content, setContent)}
                      style={{
                        padding: '5px 13px', borderRadius: 8, border: `1px solid ${theme.border}`,
                        background: theme.bg, fontWeight: 700, fontSize: 13, fontStyle: 'italic', color: theme.textMid,
                      }}
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => wrapHighlight(articleTextareaRef, content, setContent, highlightColor)}
                      style={{
                        padding: '5px 12px', borderRadius: 8, border: `1px solid ${theme.border}`,
                        background: highlightColor, fontWeight: 700, fontSize: 12, color: '#1f2937',
                      }}
                    >
                      Highlight
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: theme.textLight, marginRight: 2 }}>Color:</span>
                    {['#fde68a', '#a7f3d0', '#bfdbfe', '#fbcfe8', '#fecaca', '#ddd6fe'].map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setHighlightColor(c)}
                        style={{
                          width: 20, height: 20, borderRadius: '50%', background: c,
                          border: highlightColor === c ? '2px solid #333' : '1px solid #ccc',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <textarea
                ref={postType === 'article' ? articleTextareaRef : null}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  postType === 'question' ? 'Ask your question...' :
                  postType === 'review' ? 'Share your experience with this product or service...' :
                  postType === 'article' ? 'Write your article... (separate paragraphs with a blank line)' :
                  'Share a health tip, ask a question...'
                }
                rows={postType === 'article' ? 10 : 3}
                style={{ width: '100%', padding: 10, fontSize: 14, border: `1px solid ${theme.border}`, borderRadius: 12, fontFamily: 'inherit' }}
              />
            </>
          )}

          {postType !== 'visual' && (
            <div style={{ marginTop: 8 }}>
              {imagePreview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={imagePreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8 }} />
                  <button
                    type="button"
                    onClick={clearImage}
                    style={{ position: 'absolute', top: 4, right: 4, background: '#000', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 12 }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label style={{ fontSize: 13, color: '#0f766e', fontWeight: 600, cursor: 'pointer' }}>
                  📷 Add a photo
                  <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={posting || !content.trim() || uploadingImage}
            style={{
              marginTop: 12, padding: '10px 20px', background: theme.tealGradient, color: '#fff', border: 'none',
              borderRadius: 12, fontWeight: 800, fontSize: 13, boxShadow: '0 3px 8px rgba(15,118,110,0.25)',
            }}
          >
            {posting ? (uploadingImage ? 'Uploading photo...' : 'Posting...') : 'Post'}
          </button>
        </form>
      ) : (
        <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
          <Link to="/login" style={{ color: '#0f766e', fontWeight: 600 }}>Log in</Link> to post and join the conversation.
        </p>
      )}

      {loading && <p>Loading feed...</p>}
      {!loading && posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: '#ecfdf5', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px auto',
          }}>
            🌱
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: theme.navy, margin: '0 0 4px 0' }}>No posts yet</h3>
          <p style={{ fontSize: 13, color: theme.textLight, margin: 0 }}>Be the first to share something with the community</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {posts.map((post) => (
          <div key={post.id} style={{
            border: `1px solid ${theme.border}`, borderRadius: 18, padding: post.post_type === 'visual' ? 0 : 16,
            overflow: 'hidden', background: theme.cardBg, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: post.post_type === 'visual' ? '12px 14px 0 14px' : 0, marginBottom: post.post_type === 'visual' ? 0 : 8 }}>
              <Link to={`/u/${post.user_id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                <div
                  style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: profiles[post.user_id]?.avatar_url ? `url(${profiles[post.user_id].avatar_url})` : theme.tealGradient,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 14, fontWeight: 800, flexShrink: 0,
                  }}
                >
                  {!profiles[post.user_id]?.avatar_url && (profiles[post.user_id]?.display_name?.[0]?.toUpperCase() || '?')}
                </div>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: theme.navy, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {profiles[post.user_id]?.display_name || 'CareFind User'}
                    {profiles[post.user_id]?.is_verified && (
                      <span style={{
                        width: 14, height: 14, borderRadius: '50%', background: theme.tealDeep, color: '#fff',
                        fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900,
                      }}>
                        ✓
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 11, color: theme.textLight, fontWeight: 600 }}>{timeAgo(post.created_at)}</span>
                </div>
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {post.post_type !== 'text' && post.post_type !== 'visual' && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20,
                    textTransform: 'uppercase', letterSpacing: '0.03em',
                    background: post.post_type === 'question' ? '#fef3c7' : post.post_type === 'review' ? '#fef9c3' : '#e0f2fe',
                    color: post.post_type === 'question' ? theme.warning : post.post_type === 'review' ? '#a16207' : '#0369a1',
                  }}>
                    {post.post_type}
                  </span>
                )}
                {user && post.user_id !== user.id && (
                  <button
                    onClick={() => toggleFollow(post.user_id)}
                    style={{
                      background: isFollowing(post.user_id) ? theme.tealDeep : 'transparent',
                      border: `1px solid ${theme.tealDeep}`, borderRadius: 14, padding: '3px 11px',
                      fontSize: 11, fontWeight: 700, color: isFollowing(post.user_id) ? '#fff' : theme.tealDeep,
                    }}
                  >
                    {isFollowing(post.user_id) ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            </div>

            {post.post_type === 'visual' ? (
              <div style={{ background: themes[post.theme] || themes.teal, padding: 30, minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#fff', fontSize: 20, fontWeight: 800, textAlign: 'center', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                  {post.content}
                </p>
              </div>
            ) : (
              <>
                {post.post_type === 'review' && post.rating && (
                  <p style={{ margin: '8px 0 6px 0', color: theme.warning, fontSize: 14 }}>
                    {'★'.repeat(post.rating)}{'☆'.repeat(5 - post.rating)}
                  </p>
                )}
                {post.post_type === 'article' ? (
                  <div
                    className="article-body"
                    style={{ margin: '10px 0 12px 0', fontSize: 15, color: theme.textDark, lineHeight: 1.75, fontFamily: 'Georgia, "Times New Roman", serif' }}
                    dangerouslySetInnerHTML={{ __html: renderArticleHtml(post.content) }}
                  />
                ) : (
                  <p style={{ margin: '8px 0 10px 0', whiteSpace: 'pre-wrap', fontSize: 14, color: theme.textMid, lineHeight: 1.5 }}>{post.content}</p>
                )}
                {post.image_url && (
                  <img src={post.image_url} alt="post" style={{ width: '100%', borderRadius: 12, marginBottom: 8 }} />
                )}
              </>
            )}
            {likeCount(post.id) > 0 && (
              <p style={{
                margin: 0, padding: post.post_type === 'visual' ? '8px 16px 0 16px' : '2px 0 0 0',
                fontSize: 11.5, color: theme.textLight, fontWeight: 600,
              }}>
                ❤️ {likeCount(post.id)} {likeCount(post.id) === 1 ? 'like' : 'likes'}
              </p>
            )}
            <div style={{
              display: 'flex', borderTop: `1px solid ${theme.border}`, marginTop: 8,
              marginLeft: post.post_type === 'visual' ? 16 : 0, marginRight: post.post_type === 'visual' ? 16 : 0,
              marginBottom: post.post_type === 'visual' ? 16 : 0,
            }}>
              <button
                onClick={() => toggleLike(post.id)}
                disabled={!user}
                style={{
                  flex: 1, background: 'none', border: 'none', fontSize: 13, cursor: user ? 'pointer' : 'default',
                  color: userHasLiked(post.id) ? '#0f766e' : '#555', fontWeight: 600,
                  padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 16 }}>{userHasLiked(post.id) ? '❤️' : '🤍'}</span> Like
              </button>
              <button
                onClick={() => toggleComments(post.id)}
                style={{
                  flex: 1, background: 'none', border: 'none', fontSize: 13, color: '#555', fontWeight: 600,
                  cursor: 'pointer', padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 16 }}>💬</span> Comment
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'CareFind', text: post.content, url: window.location.href })
                  }
                }}
                style={{
                  flex: 1, background: 'none', border: 'none', fontSize: 13, color: '#555', fontWeight: 600,
                  cursor: 'pointer', padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 16 }}>↗️</span> Share
              </button>
              <button
                onClick={() => toggleSave(post.id)}
                disabled={!user}
                style={{
                  flex: 1, background: 'none', border: 'none', fontSize: 13,
                  color: isSaved(post.id) ? theme.tealDeep : '#555', fontWeight: 600,
                  cursor: user ? 'pointer' : 'default', padding: '10px 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 16 }}>{isSaved(post.id) ? '🔖' : '📑'}</span> Save
              </button>
              {user && post.user_id !== user.id && (
                <button
                  onClick={() => handleReport(post.id)}
                  disabled={reportedPosts.includes(post.id) || reportingId === post.id}
                  style={{
                    flex: 1, background: 'none', border: 'none', fontSize: 13,
                    color: reportedPosts.includes(post.id) ? theme.textLight : '#555', fontWeight: 600,
                    cursor: 'pointer', padding: '10px 0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <span style={{ fontSize: 16 }}>🚩</span>
                  {reportedPosts.includes(post.id) ? 'Reported' : 'Report'}
                </button>
              )}
            </div>

            {openComments[post.id] && (
              <div style={{ paddingTop: 10, borderTop: '1px solid #f0f0f0', paddingLeft: post.post_type === 'visual' ? 14 : 0, paddingRight: post.post_type === 'visual' ? 14 : 0, paddingBottom: post.post_type === 'visual' ? 14 : 0 }}>
                {(comments[post.id] || []).map((c) => (
                  <p key={c.id} style={{ margin: '0 0 6px 0', fontSize: 13, color: '#333' }}>{c.content}</p>
                ))}

                {user ? (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input
                      type="text"
                      value={commentDrafts[post.id] || ''}
                      onChange={(e) => setCommentDrafts({ ...commentDrafts, [post.id]: e.target.value })}
                      placeholder="Add a comment..."
                      style={{ flex: 1, padding: 8, fontSize: 13, border: '1px solid #ccc', borderRadius: 8 }}
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      style={{ padding: '8px 12px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13 }}
                    >
                      Send
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: '#999' }}>
                    <Link to="/login" style={{ color: '#0f766e' }}>Log in</Link> to comment.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}

export default Feed
