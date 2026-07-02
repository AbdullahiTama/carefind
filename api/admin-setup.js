import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // One-time setup endpoint - creates super admin account
  const setupKey = req.query.key
  if (setupKey !== process.env.ADMIN_SECRET_SALT) {
    return res.status(403).json({ error: 'Invalid setup key' })
  }

  const email = 'admin@carefind.ng'
  const password = 'CareFind@Admin2024!'
  const hash = crypto.createHash('sha256').update(password + process.env.ADMIN_SECRET_SALT).digest('hex')

  const { data: existing } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return res.status(200).json({ message: 'Super admin already exists', email })
  }

  const { error } = await supabase.from('admin_users').insert({
    email,
    password_hash: hash,
    full_name: 'Abdullahi Tama',
    role: 'super_admin',
    is_active: true,
  })

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({
    success: true,
    message: 'Super admin created successfully',
    credentials: {
      email: 'admin@carefind.ng',
      password: 'CareFind@Admin2024!',
      note: 'Change this password after first login'
    }
  })
}
