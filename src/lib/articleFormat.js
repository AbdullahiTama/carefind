// Lightweight formatting helpers for Article posts.
// Supports **bold** and ==highlight== markup, applied via toolbar buttons,
// and renders them safely (HTML-escaped first, then markup applied).

export function wrapSelection(textareaRef, text, setText, marker) {
  const el = textareaRef.current
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const selected = text.slice(start, end)
  const before = text.slice(0, start)
  const after = text.slice(end)

  if (!selected) {
    const inserted = `${marker}text${marker}`
    setText(before + inserted + after)
    return
  }

  const wrapped = `${marker}${selected}${marker}`
  setText(before + wrapped + after)
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function renderArticleHtml(content) {
  const paragraphs = content.split(/\n\s*\n/)
  return paragraphs
    .map((para) => {
      let safe = escapeHtml(para.trim())
      safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      safe = safe.replace(/==(.+?)==/g, '<mark>$1</mark>')
      safe = safe.replace(/\n/g, '<br/>')
      return `<p>${safe}</p>`
    })
    .join('')
}
