import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'

function Feed() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [reactions, setReactions] = useState([])
  const [comments, setComments] = useState({})
  const [openComments, setOpenComments] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  async function loadFeed() {
    setLoading(true)
    const { data: postData, error } = await supabase
      .from('posts')
      .select('id, content, created_at, user_id')
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
    } else {
      setReactions([])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadFeed()
  }, [])

  async function handlePost(e) {
    e.preventDefault()
    if (!content.trim() || !user) return
    setPosting(true)

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: content.trim(),
    })

    if (!error) {
      setContent('')
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

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Link to="/" style={{ color: '#0f766e', textDecoration: 'none', fontSize: 14 }}>← Search</Link>
        <h1 style={{ fontSize: 20, margin: 0 }}>CareFind Feed</h1>
        <div style={{ width: 50 }} />
      </div>

      {user ? (
        <form onSubmit={handlePost} style={{ marginBottom: 20, border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share a health tip, ask a question..."
            rows={3}
            style={{ width: '100%', padding: 8, fontSize: 15, border: '1px solid #ccc', borderRadius: 8, fontFamily: 'inherit' }}
          />
          <button
            type="submit"
            disabled={posting || !content.trim()}
            style={{ marginTop: 8, padding: '8px 16px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}
          >
            {posting ? 'Posting...' : 'Post'}
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
          <div key={post.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
            <p style={{ margin: '0 0 8px 0', whiteSpace: 'pre-wrap' }}>{post.content}</p>
            <p style={{ margin: '0 0 10px 0', color: '#999', fontSize: 12 }}>{timeAgo(post.created_at)}</p>

            <div style={{ display: 'flex', gap: 16, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
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
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f0f0f0' }}>
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
    </div>
  )
}

export default Feed
