import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import BottomNav from './BottomNav.jsx'

function Feed() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [reactions, setReactions] = useState([])
  const [profiles, setProfiles] = useState({})
  const [follows, setFollows] = useState([])
  const [comments, setComments] = useState({})
  const [openComments, setOpenComments] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState('text') // text, visual, question, review, article
  const [theme, setTheme] = useState('teal')
  const [postRating, setPostRating] = useState(5)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

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
        .select('id, display_name, avatar_url')
        .in('id', userIds)

      const profileMap = {}
      ;(profileData || []).forEach((p) => { profileMap[p.id] = p })
      setProfiles(profileMap)

      const { data: followData } = await supabase
        .from('follows')
        .select('id, follower_id, following_id')
        .in('following_id', userIds)
      setFollows(followData || [])
    } else {
      setReactions([])
      setProfiles({})
      setFollows([])
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

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: content.trim(),
      post_type: postType,
      theme: postType === 'visual' ? theme : null,
      rating: postType === 'review' ? postRating : null,
      image_url: imageUrl,
    })

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

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto', padding: 20, paddingBottom: 90 }}>
      <h1 style={{ fontSize: 22, margin: '0 0 16px 0' }}>CareFind</h1>

      {user ? (
        <form onSubmit={handlePost} style={{ marginBottom: 20, border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {Object.keys(postTypeLabels).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setPostType(t)}
                style={{
                  padding: '6px 12px', borderRadius: 16, border: '1px solid #0f766e', fontSize: 12, fontWeight: 600,
                  background: postType === t ? '#0f766e' : '#fff', color: postType === t ? '#fff' : '#0f766e',
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
                  onClick={() => setTheme(t)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: themes[t],
                    border: theme === t ? '3px solid #333' : '1px solid #ccc', cursor: 'pointer',
                  }}
                />
              ))}
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
            <div style={{ background: themes[theme], borderRadius: 10, padding: 24, marginBottom: 8, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                postType === 'question' ? 'Ask your question...' :
                postType === 'review' ? 'Share your experience with this product or service...' :
                postType === 'article' ? 'Write your article...' :
                'Share a health tip, ask a question...'
              }
              rows={postType === 'article' ? 8 : 3}
              style={{ width: '100%', padding: 8, fontSize: 15, border: '1px solid #ccc', borderRadius: 8, fontFamily: 'inherit' }}
            />
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
            style={{ marginTop: 10, padding: '8px 16px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}
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
      {!loading && posts.length === 0 && <p style={{ color: '#666' }}>No posts yet. Be the first to share something!</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {posts.map((post) => (
          <div key={post.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: post.post_type === 'visual' ? 0 : 14, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: post.post_type === 'visual' ? '12px 14px 0 14px' : 0, marginBottom: post.post_type === 'visual' ? 0 : 8 }}>
              <Link to={`/u/${post.user_id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                <div
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: profiles[post.user_id]?.avatar_url ? `url(${profiles[post.user_id].avatar_url})` : '#0f766e',
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {!profiles[post.user_id]?.avatar_url && (profiles[post.user_id]?.display_name?.[0]?.toUpperCase() || '?')}
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'block' }}>
                    {profiles[post.user_id]?.display_name || 'CareFind User'}
                  </span>
                  {post.post_type !== 'text' && post.post_type !== 'visual' && (
                    <span style={{ fontSize: 11, color: '#0f766e', fontWeight: 600 }}>
                      {post.post_type === 'question' ? '❓ Question' : post.post_type === 'review' ? '⭐ Review' : '📄 Article'}
                    </span>
                  )}
                </div>
              </Link>
              {user && post.user_id !== user.id && (
                <button
                  onClick={() => toggleFollow(post.user_id)}
                  style={{
                    background: isFollowing(post.user_id) ? '#0f766e' : 'transparent',
                    border: '1px solid #0f766e', borderRadius: 14, padding: '2px 10px',
                    fontSize: 12, color: isFollowing(post.user_id) ? '#fff' : '#0f766e',
                  }}
                >
                  {isFollowing(post.user_id) ? 'Following' : 'Follow'}
                </button>
              )}
            </div>

            {post.post_type === 'visual' ? (
              <div style={{ background: themes[post.theme] || themes.teal, padding: 28, minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#fff', fontSize: 20, fontWeight: 700, textAlign: 'center', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {post.content}
                </p>
              </div>
            ) : (
              <>
                {post.post_type === 'review' && post.rating && (
                  <p style={{ margin: '0 0 6px 0', color: '#f5b301' }}>
                    {'★'.repeat(post.rating)}{'☆'.repeat(5 - post.rating)}
                  </p>
                )}
                <p style={{ margin: '0 0 8px 0', whiteSpace: 'pre-wrap' }}>{post.content}</p>
                {post.image_url && (
                  <img src={post.image_url} alt="post" style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />
                )}
              </>
            )}
            <div style={{ padding: post.post_type === 'visual' ? '10px 14px 0 14px' : 0 }}>
              <p style={{ margin: '0 0 10px 0', color: '#999', fontSize: 12 }}>{timeAgo(post.created_at)}</p>
            </div>

            <div style={{ display: 'flex', gap: 16, borderTop: '1px solid #f0f0f0', paddingTop: 8, paddingLeft: post.post_type === 'visual' ? 14 : 0, paddingRight: post.post_type === 'visual' ? 14 : 0, paddingBottom: post.post_type === 'visual' ? 14 : 0 }}>
              <button
                onClick={() => toggleLike(post.id)}
                disabled={!user}
                style={{
                  background: 'none', border: 'none', fontSize: 14, cursor: user ? 'pointer' : 'default',
                  color: userHasLiked(post.id) ? '#0f766e' : '#666', fontWeight: userHasLiked(post.id) ? 700 : 400,
                }}
              >
                {userHasLiked(post.id) ? '❤️' : '🤍'} {likeCount(post.id) || ''}
              </button>
              <button
                onClick={() => toggleComments(post.id)}
                style={{ background: 'none', border: 'none', fontSize: 14, color: '#666', cursor: 'pointer' }}
              >
                💬 {comments[post.id] ? comments[post.id].length : 'Comments'}
              </button>
            </div>

            {openComments[post.id] && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f0f0f0', paddingLeft: post.post_type === 'visual' ? 14 : 0, paddingRight: post.post_type === 'visual' ? 14 : 0, paddingBottom: post.post_type === 'visual' ? 14 : 0 }}>
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
