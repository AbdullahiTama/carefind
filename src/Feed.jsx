import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'

function Feed() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  async function loadPosts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('id, content, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Feed load error:', error)
      setPosts([])
    } else {
      setPosts(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPosts()
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
      loadPosts()
    } else {
      console.error('Post error:', error)
    }
    setPosting(false)
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
            <p style={{ margin: 0, color: '#999', fontSize: 12 }}>{timeAgo(post.created_at)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Feed
