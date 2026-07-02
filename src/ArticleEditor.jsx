import { useState, useRef, useEffect, useCallback } from 'react'
import { theme } from './lib/theme'
import { renderArticleHtml } from './lib/articleFormat'

// ─────────────────────────────────────────────
//  Drawing Canvas Block
// ─────────────────────────────────────────────
function DrawingBlock({ block, onChange, onDelete, readOnly }) {
  const canvasRef = useRef(null)
  const [tool, setTool] = useState('pen')
  const [penColor, setPenColor] = useState('#0f172a')
  const [penSize, setPenSize] = useState(3)
  const [isDrawing, setIsDrawing] = useState(false)
  const [history, setHistory] = useState([block.strokes || []])
  const [historyIdx, setHistoryIdx] = useState(0)
  const lastPoint = useRef(null)
  const currentStroke = useRef([])

  // Redraw canvas from strokes
  const redraw = useCallback((strokes) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    strokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length < 2) return
      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalCompositeOperation = stroke.eraser ? 'destination-out' : 'source-over'
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
      ctx.stroke()
    })
    ctx.globalCompositeOperation = 'source-over'
  }, [])

  useEffect(() => {
    redraw(block.strokes || [])
  }, [block.strokes, redraw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = 200 * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = '200px'
      canvas.getContext('2d').scale(dpr, dpr)
      redraw(block.strokes || [])
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  function getPoint(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function startDraw(e) {
    if (readOnly) return
    e.preventDefault()
    setIsDrawing(true)
    const pt = getPoint(e)
    lastPoint.current = pt
    currentStroke.current = [pt]
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, (tool === 'eraser' ? penSize * 3 : penSize) / 2, 0, Math.PI * 2)
    ctx.fillStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : penColor
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  function draw(e) {
    if (!isDrawing || readOnly) return
    e.preventDefault()
    const pt = getPoint(e)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.strokeStyle = penColor
    ctx.lineWidth = tool === 'eraser' ? penSize * 4 : penSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
    lastPoint.current = pt
    currentStroke.current.push(pt)
  }

  function endDraw(e) {
    if (!isDrawing || readOnly) return
    setIsDrawing(false)
    if (currentStroke.current.length < 2) return
    const newStroke = {
      points: currentStroke.current,
      color: penColor,
      size: tool === 'eraser' ? penSize * 4 : penSize,
      eraser: tool === 'eraser',
    }
    const newStrokes = [...(block.strokes || []), newStroke]
    const newHistory = history.slice(0, historyIdx + 1)
    newHistory.push(newStrokes)
    setHistory(newHistory)
    setHistoryIdx(newHistory.length - 1)
    onChange({ ...block, strokes: newStrokes })
    currentStroke.current = []
  }

  function undo() {
    if (historyIdx <= 0) return
    const newIdx = historyIdx - 1
    setHistoryIdx(newIdx)
    const strokes = history[newIdx]
    onChange({ ...block, strokes })
    redraw(strokes)
  }

  function redo() {
    if (historyIdx >= history.length - 1) return
    const newIdx = historyIdx + 1
    setHistoryIdx(newIdx)
    const strokes = history[newIdx]
    onChange({ ...block, strokes })
    redraw(strokes)
  }

  function clearCanvas() {
    const newStrokes = []
    const newHistory = [...history.slice(0, historyIdx + 1), newStrokes]
    setHistory(newHistory)
    setHistoryIdx(newHistory.length - 1)
    onChange({ ...block, strokes: newStrokes })
    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }

  const COLORS = ['#0f172a', '#0f766e', '#dc2626', '#2563eb', '#7c3aed', '#d97706', '#059669']
  const SIZES = [2, 4, 7, 12]

  return (
    <div style={{ border: `2px solid ${theme.tealBright}`, borderRadius: 16, overflow: 'hidden', marginBottom: 8, background: '#fff' }}>
      {!readOnly && (
        <div style={{ background: '#f8fafc', borderBottom: `1px solid ${theme.border}`, padding: '8px 10px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Tool buttons */}
          <button onClick={() => setTool('pen')} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, background: tool === 'pen' ? theme.tealDeep : theme.bg, color: tool === 'pen' ? '#fff' : theme.textMid }}>✏️ Pen</button>
          <button onClick={() => setTool('eraser')} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, background: tool === 'eraser' ? '#fef2f2' : theme.bg, color: tool === 'eraser' ? theme.alert : theme.textMid }}>⬜ Erase</button>

          {/* Pen sizes */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {SIZES.map(s => (
              <button key={s} onClick={() => setPenSize(s)} style={{ width: s + 14, height: s + 14, borderRadius: '50%', background: penSize === s ? theme.tealDeep : '#e2e8f0', border: 'none', cursor: 'pointer' }} />
            ))}
          </div>

          {/* Colors */}
          <div style={{ display: 'flex', gap: 4 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => { setTool('pen'); setPenColor(c) }} style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: penColor === c && tool === 'pen' ? '2px solid #0f172a' : '1px solid #ccc', cursor: 'pointer' }} />
            ))}
          </div>

          {/* History + Delete */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button onClick={undo} disabled={historyIdx <= 0} style={{ padding: '4px 8px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, fontSize: 13, opacity: historyIdx <= 0 ? 0.4 : 1 }}>↩</button>
            <button onClick={redo} disabled={historyIdx >= history.length - 1} style={{ padding: '4px 8px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, fontSize: 13, opacity: historyIdx >= history.length - 1 ? 0.4 : 1 }}>↪</button>
            <button onClick={clearCanvas} style={{ padding: '4px 8px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, fontSize: 12, color: theme.textLight }}>Clear</button>
            <button onClick={onDelete} style={{ padding: '4px 8px', borderRadius: 8, border: 'none', background: '#fef2f2', fontSize: 13, color: theme.alert }}>🗑️</button>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', background: '#fafafa', backgroundImage: 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)', backgroundSize: '100% 24px', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', touchAction: 'none' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {(!block.strokes || block.strokes.length === 0) && !readOnly && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <p style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 600 }}>✏️ Draw here — pen, sketch, or annotate</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
//  Text Block
// ─────────────────────────────────────────────
function TextBlock({ block, onChange, onDelete, readOnly, textareaRef }) {
  return (
    <div style={{ position: 'relative', marginBottom: 4 }}>
      {!readOnly && (
        <button onClick={onDelete} style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', color: '#cbd5e1', fontSize: 14, cursor: 'pointer', zIndex: 1, opacity: 0 }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0}
        >🗑️</button>
      )}
      <textarea
        ref={textareaRef}
        value={block.content}
        onChange={e => onChange({ ...block, content: e.target.value })}
        readOnly={readOnly}
        placeholder="Write here..."
        rows={4}
        style={{
          width: '100%', padding: '10px 12px', fontSize: 15, lineHeight: 1.7,
          border: readOnly ? 'none' : `1px solid ${theme.border}`,
          borderRadius: 12, fontFamily: 'Georgia, serif', resize: 'vertical',
          background: readOnly ? 'transparent' : '#fff', outline: 'none',
          boxSizing: 'border-box', color: theme.textDark,
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
//  Main Article Editor
// ─────────────────────────────────────────────
export default function ArticleEditor({ value, onChange, readOnly = false }) {
  // Parse blocks from string value or use default
  const parseBlocks = (val) => {
    if (!val) return [{ id: uid(), type: 'text', content: '' }]
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed) && parsed[0]?.type) return parsed
    } catch {}
    // Legacy plain text — wrap in single text block
    return [{ id: uid(), type: 'text', content: val }]
  }

  const uid = () => Math.random().toString(36).slice(2)
  const [blocks, setBlocks] = useState(() => parseBlocks(value))
  const [highlightColor, setHighlightColor] = useState('#fde68a')
  const [activeBlockId, setActiveBlockId] = useState(blocks[0]?.id)
  const lastTextareaRef = useRef(null)

  // Sync blocks → parent onChange as JSON string
  useEffect(() => {
    if (!readOnly && onChange) onChange(JSON.stringify(blocks))
  }, [blocks])

  // Update a single block
  function updateBlock(id, updated) {
    setBlocks(prev => prev.map(b => b.id === id ? updated : b))
  }

  // Delete a block (keep at least one text block)
  function deleteBlock(id) {
    setBlocks(prev => {
      const next = prev.filter(b => b.id !== id)
      return next.length ? next : [{ id: uid(), type: 'text', content: '' }]
    })
  }

  // Insert drawing block after active block
  function insertDrawing() {
    const newBlock = { id: uid(), type: 'drawing', strokes: [] }
    const textBlock = { id: uid(), type: 'text', content: '' }
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === activeBlockId)
      const insertAt = idx >= 0 ? idx + 1 : prev.length
      const next = [...prev]
      next.splice(insertAt, 0, newBlock, textBlock)
      return next
    })
    setActiveBlockId(textBlock.id)
  }

  // Bold / Italic helpers operate on active text block
  function wrapActive(marker) {
    setBlocks(prev => prev.map(b => {
      if (b.id !== activeBlockId || b.type !== 'text') return b
      const ta = lastTextareaRef.current
      if (!ta) return b
      const s = ta.selectionStart; const e = ta.selectionEnd
      const sel = b.content.slice(s, e)
      const wrapped = sel ? `${marker}${sel}${marker}` : `${marker}${marker}`
      const next = b.content.slice(0, s) + wrapped + b.content.slice(e)
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + (sel ? wrapped.length : marker.length) }, 0)
      return { ...b, content: next }
    }))
  }

  // Render for read mode
  if (readOnly) {
    return (
      <div style={{ fontFamily: 'Georgia, serif' }}>
        {blocks.map(b => b.type === 'drawing'
          ? <DrawingBlock key={b.id} block={b} onChange={() => {}} onDelete={() => {}} readOnly />
          : <div key={b.id} className="article-body" dangerouslySetInnerHTML={{ __html: renderArticleHtml(b.content) }} style={{ fontSize: 15, lineHeight: 1.75, color: theme.textDark, marginBottom: 12 }} />
        )}
      </div>
    )
  }

  const activeBlock = blocks.find(b => b.id === activeBlockId)

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onClick={() => wrapActive('**')} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, fontWeight: 900, fontSize: 13 }}>B</button>
        <button type="button" onClick={() => wrapActive('*')} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg, fontStyle: 'italic', fontSize: 13 }}>I</button>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {['#fde68a', '#a7f3d0', '#bfdbfe', '#fbcfe8', '#fecaca', '#ddd6fe'].map(c => (
            <button type="button" key={c} onClick={() => { setHighlightColor(c); wrapActive(`==color|`) }}
              style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: highlightColor === c ? '2px solid #333' : '1px solid #ccc' }} />
          ))}
        </div>
        <button
          type="button"
          onClick={insertDrawing}
          style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 8, border: `1px solid ${theme.tealDeep}`, background: '#ecfdf5', color: theme.tealDeep, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          ✏️ + Drawing
        </button>
      </div>

      {/* Block list */}
      <div>
        {blocks.map((block, idx) => (
          <div key={block.id} onClick={() => setActiveBlockId(block.id)}
            style={{ outline: activeBlockId === block.id && block.type === 'text' ? `2px solid ${theme.tealBright}` : 'none', borderRadius: 12, transition: 'outline 0.1s' }}>
            {block.type === 'text' ? (
              <TextBlock
                block={block}
                onChange={updated => updateBlock(block.id, updated)}
                onDelete={() => deleteBlock(block.id)}
                readOnly={false}
                textareaRef={activeBlockId === block.id ? lastTextareaRef : null}
              />
            ) : (
              <DrawingBlock
                block={block}
                onChange={updated => updateBlock(block.id, updated)}
                onDelete={() => deleteBlock(block.id)}
                readOnly={false}
              />
            )}
            {/* Insert divider between blocks */}
            {idx < blocks.length - 1 && (
              <div style={{ display: 'flex', alignItems: 'center', margin: '2px 0', opacity: 0.3 }}>
                <div style={{ flex: 1, height: 1, background: theme.border }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: theme.textLight, marginTop: 6 }}>
        Tap <strong>✏️ + Drawing</strong> to insert a sketch anywhere in your article
      </p>
    </div>
  )
}
