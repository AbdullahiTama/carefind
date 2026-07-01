const cardStyles = {
  'teal-depth': {
    label: '🌊 Ocean',
    background: `
      radial-gradient(ellipse 55% 50% at 85% 15%, rgba(20,184,166,0.45) 0%, transparent 60%),
      radial-gradient(ellipse 40% 45% at 15% 75%, rgba(15,118,110,0.5) 0%, transparent 55%),
      linear-gradient(155deg, #0a1628 0%, #0f2a3a 30%, #0d3a35 60%, #0f766e 100%)`,
  },
  'navy-clinical': {
    label: '✨ Sky',
    background: `
      radial-gradient(ellipse 80% 40% at 50% 0%, rgba(186,230,253,0.2) 0%, transparent 55%),
      radial-gradient(ellipse 60% 60% at 50% 50%, rgba(14,116,144,0.3) 0%, transparent 65%),
      linear-gradient(175deg, #dbeafe 0%, #93c5fd 8%, #1e40af 22%, #1e3a8a 45%, #0f172a 75%, #020617 100%)`,
  },
  'midnight-teal': {
    label: '🌃 Night',
    background: `
      radial-gradient(ellipse 50% 55% at 85% 50%, rgba(20,184,166,0.3) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 15% 30%, rgba(15,118,110,0.25) 0%, transparent 55%),
      linear-gradient(135deg, #020617 0%, #0f172a 40%, #0c2a2a 70%, #0f3d38 100%)`,
    showGrid: true,
  },
  'forest-wellness': {
    label: '🌿 Forest',
    background: `
      radial-gradient(ellipse 55% 50% at 80% 20%, rgba(20,184,166,0.4) 0%, transparent 55%),
      radial-gradient(ellipse 45% 55% at 20% 75%, rgba(6,78,59,0.5) 0%, transparent 50%),
      linear-gradient(145deg, #011a0a 0%, #022c16 25%, #043a20 55%, #065f46 85%, #0f766e 100%)`,
  },
  'slate-pulse': {
    label: '❤️ Pulse',
    background: `
      radial-gradient(ellipse 60% 45% at 50% 100%, rgba(15,118,110,0.5) 0%, transparent 60%),
      radial-gradient(ellipse 40% 40% at 90% 10%, rgba(20,184,166,0.25) 0%, transparent 55%),
      linear-gradient(160deg, #020617 0%, #0f172a 35%, #0a1f2f 60%, #0f3a38 100%)`,
    showEcg: true,
  },
}

function VisualCard({ templateKey, content, preview = false }) {
  const style = cardStyles[templateKey] || cardStyles['teal-depth']

  return (
    <div style={{
      background: style.background,
      borderRadius: preview ? 14 : 0,
      minHeight: preview ? 160 : 200,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
    }}>
      {/* ECG line for slate-pulse */}
      {style.showEcg && (
        <svg style={{ position: 'absolute', top: '35%', left: 0, width: '100%', opacity: 0.18, zIndex: 1 }} viewBox="0 0 400 50" preserveAspectRatio="none" height="50">
          <polyline points="0,25 50,25 70,2 90,48 110,25 150,25 170,10 190,40 210,25 260,25 280,5 300,45 320,25 400,25"
            stroke="#14b8a6" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        </svg>
      )}

      {/* Dot grid for midnight */}
      {style.showGrid && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          backgroundImage: 'radial-gradient(circle 1.5px at 50% 50%, rgba(20,184,166,0.18) 0%, transparent 100%)',
          backgroundSize: '28px 28px',
        }} />
      )}

      {/* Dark overlay so text is always readable */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 3, padding: preview ? '14px 16px 14px' : '20px 22px 20px' }}>
        <p style={{
          fontSize: preview ? 15.5 : 19, fontWeight: 800, color: '#fff', lineHeight: 1.45,
          letterSpacing: '-0.01em', textShadow: '0 2px 12px rgba(0,0,0,0.7)',
          margin: '0 0 14px 0', whiteSpace: 'pre-wrap',
          minHeight: preview ? 40 : 60,
        }}>
          {content || ''}
        </p>

        {/* CareFind branding only — small and minimal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 6, fontSize: 10, fontWeight: 900, color: '#fff',
            background: 'linear-gradient(135deg, #14b8a6, #0f766e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>C</div>
          <span style={{ fontSize: 9.5, fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>CAREFIND</span>
        </div>
      </div>
    </div>
  )
}

export { cardStyles }
export default VisualCard
