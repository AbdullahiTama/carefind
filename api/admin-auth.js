import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Simple hash using Web Crypto API (works on Vercel Edge)
async function hashPassword(password) {
  const salt = process.env.ADMIN_SECRET_SALT || 'carefind_admin_2024_secure'
  const encoder = new TextEncoder()
  const data = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function generateToken(adminId, role) {
  const payload = `${adminId}:${role}:${Date.now()}`
  const salt = process.env.ADMIN_SECRET_SALT || 'carefind_admin_2024_secure'
  const encoder = new TextEncoder()
  const keyData = encoder.encode(salt)
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return btoa(`${payload}:${sigHex}`)
}

async function verifyToken(token) {
  try {
    const decoded = atob(token)
    const lastColon = decoded.lastIndexOf(':')
    const payload = decoded.substring(0, lastColon)
    const sig = decoded.substring(lastColon + 1)
    const parts = payload.split(':')
    if (parts.length !== 3) return null
    const [adminId, role, timestamp] = parts
    if (Date.now() - parseInt(timestamp) > 86400000) return null

    const salt = process.env.ADMIN_SECRET_SALT || 'carefind_admin_2024_secure'
    const encoder = new TextEncoder()
    const keyData = encoder.encode(salt)
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const expectedSigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    const expectedSig = Array.from(new Uint8Array(expectedSigBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

    if (sig !== expectedSig) return null
    return { adminId, role }
  } catch { return null }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, email, password, token } = req.body

  if (action === 'login') {
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

    const hash = await hashPassword(password)
    const { data: admin } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role, is_active')
      .eq('email', email.toLowerCase())
      .eq('password_hash', hash)
      .eq('is_active', true)
      .maybeSingle()

    if (!admin) return res.status(401).json({ error: 'Invalid email or password' })

    await supabase.from('admin_users').update({ last_login: new Date().toISOString() }).eq('id', admin.id)
    const sessionToken = await generateToken(admin.id, admin.role)
    return res.status(200).json({ token: sessionToken, admin: { id: admin.id, email: admin.email, full_name: admin.full_name, role: admin.role } })
  }

  if (action === 'verify') {
    if (!token) return res.status(401).json({ error: 'No token' })
    const payload = await verifyToken(token)
    if (!payload) return res.status(401).json({ error: 'Invalid or expired token' })
    const { data: admin } = await supabase.from('admin_users').select('id, email, full_name, role, is_active').eq('id', payload.adminId).eq('is_active', true).maybeSingle()
    if (!admin) return res.status(401).json({ error: 'Admin not found' })
    return res.status(200).json({ admin })
  }

  if (action === 'create_staff') {
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'super_admin') return res.status(403).json({ error: 'Only super admin can create staff' })
    const { newEmail, newPassword, newName, newRole } = req.body
    if (!newEmail || !newPassword || !newName || !newRole) return res.status(400).json({ error: 'All fields required' })
    const hash = await hashPassword(newPassword)
    const { error } = await supabase.from('admin_users').insert({ email: newEmail.toLowerCase(), password_hash: hash, full_name: newName, role: newRole, created_by: payload.adminId })
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  if (action === 'list_staff') {
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'super_admin') return res.status(403).json({ error: 'Only super admin can view staff' })
    const { data } = await supabase.from('admin_users').select('id, email, full_name, role, is_active, last_login, created_at').order('created_at')
    return res.status(200).json({ staff: data || [] })
  }

  if (action === 'toggle_staff') {
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'super_admin') return res.status(403).json({ error: 'Unauthorized' })
    const { staffId, isActive } = req.body
    await supabase.from('admin_users').update({ is_active: isActive }).eq('id', staffId)
    return res.status(200).json({ success: true })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
