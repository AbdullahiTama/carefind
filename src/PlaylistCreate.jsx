import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAuth } from './lib/AuthContext'
import { theme } from './lib/theme'
import BottomNav from './BottomNav.jsx'

// Create a playlist, then add parts one by one (text, image, or video).
function PlaylistCreate() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('info') // 'info' | 'parts'
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [playlistId, setPlaylistId] = useState(null)
  const [parts, setParts] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Draft part being built
  const [pTitle, setPTitle] = useState('')
  const [pKind, setPKind] = useState('text')
  const [pText, setPText] = useState('')
  const [pFile, setPFile] = useState(null)
  const [addingPart, setAddingPart] = useState(false)

  async function createPlaylist() {
    if (!title.trim()) { setError('Give your playlist a title.'); return }
    setSaving(true); setError('')
    const { data, error: insErr } = await supabase.from('playlists').insert({
      owner_id: user.id, title: title.trim(), description: description.trim() || null,
    }).select().maybeSingle()
    if (insErr || !data) { setError('Could not create: ' + (insErr?.message || 'unknown')); setSaving(false); return }
    setPlaylistId(data.id)
    setStep('parts')
    setSaving(false)
  }

  async function addPart() {
    if (!pTitle.trim()) { setError('Give this part a title.'); return }
    setAddingPart(true); setError('')
    let mediaUrl = null
    if ((pKind === 'image' || pKind === 'video') && pFile) {
      const ext = pFile.name.split('.').pop() || (pKind === 'video' ? 'mp4' : 'jpg')
      const path = `playlist-${playlistId}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('live-media').upload(path, pFile, { contentType: pFile.type })
      if (upErr) { setError('Media upload failed: ' + upErr.message); setAddingPart(false); return }
      const { data: urlData } = supabase.storage.from('live-media').getPublicUrl(path)
      mediaUrl = urlData.publicUrl
    }
    const { data, error: insErr } = await supabase.from('playlist_parts').insert({
      playlist_id: playlistId, position: parts.length, title: pTitle.trim(),
      kind: pKind, content: pText.trim() || null, media_url: mediaUrl,
    }).select().maybeSingle()
    if (insErr) { setError('Could not add part: ' + insErr.message); setAddingPart(false); return }
    setParts(prev => [...prev, data])
    setPTitle(''); setPText(''); setPFile(null); setPKind('text')
    setAddingPart(false)
  }

  const inputStyle = { width: '100%', padding: '12px 14px', fontSize: 15, border: `1px solid ${theme.border}`, borderRadius: 12, boxSizing: 'border-box', fontFamily: 'inherit' }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 480, margin: '0 auto', paddingBottom: 90, background: '#fff', minHeight: '100vh' }}>
      <div style={{ background: theme.heroGradient, padding: '18px 16px', color: '#fff' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>← Back</button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>🎬 Create Playlist</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>Build a series part by part — like a show in episodes.</p>
      </div>

      <div style={{ padding: 18 }}>
        {error && <p style={{ margin: '0 0 10px 0', fontSize: 12.5, color: theme.alert, fontWeight: 600 }}>{error}</p>}

        {step === 'info' && (
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: theme.textMid, marginBottom: 6, textTransform: 'uppercase' }}>Playlist title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Understanding Diabetes (Series)" style={{ ...inputStyle, marginBottom: 14 }} />
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: theme.textMid, marginBottom: 6, textTransform: 'uppercase' }}>Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this series about?" rows={3} style={{ ...inputStyle, marginBottom: 18, resize: 'none' }} />
            <button onClick={createPlaylist} disabled={saving} style={{ width: '100%', padding: 14, background: theme.tealGradient, color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15 }}>
              {saving ? 'Creating…' : 'Create & Add Parts →'}
            </button>
          </div>
        )}

        {step === 'parts' && (
          <div>
            {/* Existing parts */}
            {parts.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <p style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 800, color: theme.navy }}>{parts.length} part{parts.length !== 1 ? 's' : ''} added</p>
                {parts.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: theme.bg, borderRadius: 10, marginBottom: 6 }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: theme.tealGradient, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: theme.navy }}>{p.title}</span>
                    <span style={{ fontSize: 10, color: theme.textLight, marginLeft: 'auto' }}>{p.kind}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Add a part */}
            <div style={{ border: `1px dashed ${theme.border}`, borderRadius: 14, padding: 14, marginBottom: 18 }}>
              <p style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 800, color: theme.navy }}>➕ Add Part {parts.length + 1}</p>
              <input value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="Part title (e.g. What is insulin?)" style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {['text', 'image', 'video'].map(k => (
                  <button key={k} onClick={() => setPKind(k)} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 12, background: pKind === k ? theme.tealDeep : theme.bg, color: pKind === k ? '#fff' : theme.textMid, textTransform: 'capitalize' }}>{k}</button>
                ))}
              </div>
              <textarea value={pText} onChange={(e) => setPText(e.target.value)} placeholder={pKind === 'text' ? 'Write this part…' : 'Caption (optional)'} rows={3} style={{ ...inputStyle, marginBottom: 10, resize: 'none' }} />
              {(pKind === 'image' || pKind === 'video') && (
                <label style={{ display: 'block', fontSize: 12.5, color: theme.tealDeep, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
                  📎 {pFile ? pFile.name.slice(0, 26) : `Choose ${pKind} file`}
                  <input type="file" accept={pKind === 'image' ? 'image/*' : 'video/*'} onChange={(e) => setPFile(e.target.files[0] || null)} style={{ display: 'none' }} />
                </label>
              )}
              <button onClick={addPart} disabled={addingPart} style={{ width: '100%', padding: 11, background: theme.navy, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 13 }}>
                {addingPart ? 'Adding…' : '+ Add this part'}
              </button>
            </div>

            <button onClick={() => navigate(`/playlist/${playlistId}`)} disabled={parts.length === 0} style={{ width: '100%', padding: 14, background: parts.length === 0 ? theme.border : theme.tealGradient, color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15 }}>
              {parts.length === 0 ? 'Add at least one part' : '✓ Done — View Playlist'}
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

export default PlaylistCreate
