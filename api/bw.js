// Black Week — auth multi-usuário + persistência via Vercel Blob
import { put, list, head } from '@vercel/blob'
import { createHmac, pbkdf2, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const pbkdf2Async = promisify(pbkdf2)

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://blackweek2026.vercel.app'
const SESSION_SECRET = process.env.BW_SESSION_SECRET || 'dev-secret-change-me'
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h
const CLINIC_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/
const MIN_PASSWORD_LEN = 6

function isValidClinicId(id) {
  return typeof id === 'string' && CLINIC_ID_RE.test(id)
}

function cors(req, res) {
  const origin = req.headers.origin || ''
  const allowed = origin === ALLOWED_ORIGIN || origin.startsWith('http://localhost')
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'null')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')
}

// ─── BW_CLINICS owner passwords ──────────────────────────────────────────────
function getOwnerPassword(clinic_id) {
  const raw = process.env.BW_CLINICS
  if (!raw) return null
  try {
    const map = JSON.parse(raw)
    return map[clinic_id] || null
  } catch { return null }
}

// ─── PBKDF2 helpers ───────────────────────────────────────────────────────────
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = (await pbkdf2Async(password, salt, 100000, 64, 'sha512')).toString('hex')
  return { salt, hash }
}

async function verifyPassword(password, salt, storedHash) {
  const hash = (await pbkdf2Async(password, salt, 100000, 64, 'sha512')).toString('hex')
  return timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash))
}

// ─── Session tokens: base64url(payload).HMAC ─────────────────────────────────
function signToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', SESSION_SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const data = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = createHmac('sha256', SESSION_SECRET).update(data).digest('base64url')
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch { return null }
  let payload
  try { payload = JSON.parse(Buffer.from(data, 'base64url').toString()) } catch { return null }
  if (!payload || Date.now() > payload.exp) return null
  return payload
}

// ─── Blob state helpers ───────────────────────────────────────────────────────
async function loadState(clinic_id) {
  const { blobs } = await list({ prefix: `bw/${clinic_id}/state.json` })
  if (blobs.length === 0) return null
  const blobMeta = await head(blobs[0].url)
  const r = await fetch(blobMeta.downloadUrl)
  return await r.json()
}

async function saveState(clinic_id, state) {
  await put(`bw/${clinic_id}/state.json`, JSON.stringify(state), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
  })
}

// Strip sensitive fields before returning to client
function sanitizeState(state) {
  if (!state) return state
  const clean = { ...state }
  if (Array.isArray(clean.users)) {
    clean.users = clean.users.map(({ username, role, name }) => ({ username, role, name }))
  }
  return clean
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  // ── GET: read state ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { token } = req.query
    const payload = verifyToken(token)
    if (!payload) return res.status(401).json({ error: 'Sessão inválida ou expirada' })
    if (!isValidClinicId(payload.clinic_id)) return res.status(400).json({ error: 'ID de clínica inválido' })
    try {
      const state = await loadState(payload.clinic_id)
      return res.status(200).json({ state: sanitizeState(state) })
    } catch (err) {
      console.error('[bw] GET error:', err.message)
      return res.status(500).json({ error: 'Erro ao ler estado' })
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  let body
  try { body = req.body } catch { return res.status(400).json({ error: 'Body inválido' }) }
  const { action } = body || {}

  // ── AUTH ─────────────────────────────────────────────────────────────────
  if (action === 'auth') {
    const { clinic_id, username, password } = body
    if (!clinic_id || !username || !password) return res.status(400).json({ error: 'Dados incompletos' })
    if (!isValidClinicId(clinic_id)) return res.status(400).json({ error: 'ID de clínica inválido' })

    if (username === 'owner') {
      const ownerPw = getOwnerPassword(clinic_id)
      let valid = false
      if (ownerPw) {
        try {
          valid = timingSafeEqual(Buffer.from(password), Buffer.from(ownerPw))
        } catch { valid = false } // lengths differ
      }
      if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' })
      const token = signToken({ clinic_id, username: 'owner', role: 'owner', exp: Date.now() + TOKEN_TTL_MS })
      return res.status(200).json({ ok: true, token, role: 'owner', username: 'owner' })
    }

    // Consultora login
    let state
    try { state = await loadState(clinic_id) } catch { return res.status(500).json({ error: 'Erro interno' }) }
    const users = state?.users || []
    const user = users.find(u => u.username === username)
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' })

    let ok = false
    try { ok = await verifyPassword(password, user.salt, user.hash) } catch { }
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' })

    const token = signToken({ clinic_id, username: user.username, role: user.role, name: user.name, exp: Date.now() + TOKEN_TTL_MS })
    return res.status(200).json({ ok: true, token, role: user.role, username: user.username, name: user.name })
  }

  // All other actions require a valid session token
  const payload = verifyToken(body?.session_token)
  if (!payload) return res.status(401).json({ error: 'Sessão inválida ou expirada' })
  const { clinic_id } = payload
  if (!isValidClinicId(clinic_id)) return res.status(400).json({ error: 'ID de clínica inválido' })

  // ── SAVE STATE ───────────────────────────────────────────────────────────
  if (action === 'save') {
    const { state: clientState } = body
    if (!clientState) return res.status(400).json({ error: 'State ausente' })
    try {
      // Preserve server-side users and audit from existing state
      const existing = await loadState(clinic_id)
      const merged = {
        ...clientState,
        users: existing?.users || clientState.users || [],
        audit: clientState.audit || existing?.audit || [],
      }
      await saveState(clinic_id, merged)
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[bw] save error:', err.message)
      return res.status(500).json({ error: 'Erro ao salvar estado' })
    }
  }

  // ── CREATE USER (owner only) ─────────────────────────────────────────────
  if (action === 'create_user') {
    if (payload.role !== 'owner') return res.status(403).json({ error: 'Apenas o proprietário pode criar usuários' })
    const { name, username, password, role } = body
    if (!name || !username || !password || !['administrative', 'commercial'].includes(role)) {
      return res.status(400).json({ error: 'Dados inválidos' })
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LEN) {
      return res.status(400).json({ error: `Senha deve ter pelo menos ${MIN_PASSWORD_LEN} caracteres` })
    }
    if (!/^[a-zA-Z0-9_.-]{1,32}$/.test(username)) {
      return res.status(400).json({ error: 'Username inválido (apenas letras, números, _ . -)' })
    }
    try {
      const state = await loadState(clinic_id) || {}
      const users = state.users || []
      if (users.find(u => u.username === username)) {
        return res.status(409).json({ error: 'Username já existe' })
      }
      const { salt, hash } = await hashPassword(password)
      users.push({ username, name, role, salt, hash })
      await saveState(clinic_id, { ...state, users })
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[bw] create_user error:', err.message)
      return res.status(500).json({ error: 'Erro interno' })
    }
  }

  // ── RESET PASSWORD (owner only) ──────────────────────────────────────────
  if (action === 'reset_password') {
    if (payload.role !== 'owner') return res.status(403).json({ error: 'Apenas o proprietário pode redefinir senhas' })
    const { username, password } = body
    if (!username || !password) return res.status(400).json({ error: 'Dados inválidos' })
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LEN) {
      return res.status(400).json({ error: `Senha deve ter pelo menos ${MIN_PASSWORD_LEN} caracteres` })
    }
    try {
      const state = await loadState(clinic_id) || {}
      const users = state.users || []
      const idx = users.findIndex(u => u.username === username)
      if (idx === -1) return res.status(404).json({ error: 'Usuário não encontrado' })
      const { salt, hash } = await hashPassword(password)
      users[idx] = { ...users[idx], salt, hash }
      await saveState(clinic_id, { ...state, users })
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[bw] reset_password error:', err.message)
      return res.status(500).json({ error: 'Erro interno' })
    }
  }

  // ── DELETE USER (owner only) ─────────────────────────────────────────────
  if (action === 'delete_user') {
    if (payload.role !== 'owner') return res.status(403).json({ error: 'Apenas o proprietário pode remover usuários' })
    const { username } = body
    if (!username) return res.status(400).json({ error: 'Username ausente' })
    try {
      const state = await loadState(clinic_id) || {}
      const users = (state.users || []).filter(u => u.username !== username)
      await saveState(clinic_id, { ...state, users })
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[bw] delete_user error:', err.message)
      return res.status(500).json({ error: 'Erro interno' })
    }
  }

  return res.status(400).json({ error: 'Ação desconhecida' })
}
