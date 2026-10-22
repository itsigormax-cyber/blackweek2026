import { useState, useEffect, useCallback, useRef } from 'react'
import sparkLogo from './assets/logo.webp'
import {
  ALL_TASKS, PHASES, getTasksByDate, getTasksByPhase,
  applyVars, DEFAULT_CONFIG, getDayProcedures,
  getProcedureEmoji, getProcedureEmojiStrict, OUTROS_EMOJIS,
} from './bw-tasks.js'

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const CLINIC_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeStatus(taskId, date, time, taskStates, now) {
  const saved = taskStates[taskId]
  if (saved?.status === 'done') return 'done'
  if (saved?.status === 'in_progress') return 'in_progress'
  if (date && time) {
    const taskDateTime = new Date(date + 'T' + time + ':00')
    if (now > taskDateTime && !saved) return 'overdue'
  }
  return saved?.status || 'pending'
}

function canSeeTask(task, role) {
  if (role === 'owner') return true
  if (task.role === 'owner') return false
  if (role === 'administrative') return ['c1', 'both', null, undefined].includes(task.role)
  if (role === 'commercial') return ['c2', 'both', null, undefined].includes(task.role)
  return true
}

function calcInstallments(price) {
  const p = parseFloat(price)
  if (isNaN(p) || p <= 0) return { installments: '', installmentPrice: '' }
  const n = p <= 800 ? 10 : 12
  const pp = Math.ceil((p / n) * 100) / 100
  return { installments: String(n), installmentPrice: pp.toFixed(2) }
}

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const CAMPAIGN_DATES = [
  '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'
]

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

// ─── CopyButton ───────────────────────────────────────────────────────────────
function CopyButton({ text, label, onCopy }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      onCopy && onCopy(label)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={handleCopy} className={`copy-btn${copied ? ' copied' : ''}`}>
      {copied ? '✓ Copiado' : '📋 Copiar'}
    </button>
  )
}

// ─── WAPollCard ───────────────────────────────────────────────────────────────
function WAPollCard({ poll, config, dayIndex }) {
  const procedures = dayIndex ? getDayProcedures((config.days || [])[dayIndex - 1]) : []
  const isMultiProc = procedures.length > 1
  const isMulti = poll.type === 'multi' || poll.allowMultiple || isMultiProc

  // Embaralha uma vez por montagem para emojis "outros" aleatórios sem repetir
  const [shuffledOutros] = useState(() => shuffleArray(OUTROS_EMOJIS))

  let question
  let options
  let outrosIdx = 0
  const getEmoji = (name) => {
    const known = getProcedureEmojiStrict(name)
    if (known !== null) return known
    return shuffledOutros[outrosIdx++ % shuffledOutros.length]
  }

  if (isMultiProc) {
    // Dia com 2+ procedimentos: cada procedimento vira uma opção
    question = 'Qual você quer garantir hoje? 🤩'
    options = procedures.map(p => {
      const em = getEmoji(p.name)
      const price = parseFloat(p.price)
      let priceStr = '[VALOR]'
      if (p.price) {
        if (price > 1000 && p.installments && p.installmentPrice) {
          priceStr = `${p.installments}x de R$${p.installmentPrice}`
        } else {
          priceStr = `R$${p.price}`
        }
      }
      return `${em} ${p.name} por apenas ${priceStr}`
    })
  } else {
    // Dia com 1 procedimento: opções fixas, questão aplicada com vars
    question = poll.question || ''
    if (dayIndex) question = applyVars(question, config, dayIndex)
    options = poll.options || []
  }

  const emoji = !isMultiProc ? getEmoji(procedures[0]?.name || '') : ''

  return (
    <div className="wa-poll-card">
      <div className="wa-poll-header">
        <span className="wa-poll-icon">📊</span>
        <span className="wa-poll-title">ENQUETE</span>
        {isMulti && <span className="wa-poll-multi">permite múltiplas respostas</span>}
      </div>
      {!isMultiProc && dayIndex && config.days?.[dayIndex - 1]?.condition && (
        <div className="wa-poll-condition">{config.days[dayIndex - 1].condition}</div>
      )}
      {question && (
        <div className="wa-poll-question">{emoji && `${emoji} `}{question}</div>
      )}
      <div className="wa-poll-options">
        {options.map((opt, i) => (
          <div key={i} className="wa-poll-option">
            <span className="wa-poll-dot" />
            <span className="wa-poll-opt-text">{opt}</span>
          </div>
        ))}
      </div>
      <div className="wa-poll-note">Crie esta enquete diretamente no WhatsApp</div>
    </div>
  )
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────
function TaskCard({ task, status, config, onStatusChange, onCopy, dimmed }) {
  const s_list = task.scripts || []
  const c_list = task.checks || []
  const di = task.dayIndex

  return (
    <div className={`task-card status-${status}${dimmed ? ' dimmed' : ''}`}>
      <div className="task-header">
        <div className="task-meta">
          {task.time && <span className="task-time">⏰ {task.time}</span>}
          {task.channel && <span className={`task-channel ch-${task.channel}`}>{channelLabel(task.channel)}</span>}
          {task.role && <span className={`task-role role-${task.role}`}>{roleLabel(task.role)}</span>}
        </div>
        <h3 className="task-title">{task.title}</h3>
        {task.note && <p className="task-note-static">{task.note}</p>}
      </div>

      {s_list.length > 0 && (
        <div className="task-scripts">
          {s_list.map((s, i) => {
            if (s.poll) {
              return (
                <div key={i} className="script-block">
                  <WAPollCard poll={s.poll} config={config} dayIndex={di} />
                </div>
              )
            }
            if (!s.text && s.note) {
              return (
                <div key={i} className="amber-box">
                  ⚠️ {s.note}
                </div>
              )
            }
            return (
              <div key={i} className="script-block">
                {s.label && <div className="script-label">{s.label}</div>}
                <div className="script-text-wrap">
                  <pre className="script-text">{applyVars(s.text, config, di)}</pre>
                  {s.text && (
                    <CopyButton
                      text={applyVars(s.text, config, di)}
                      label={s.label || task.title}
                      onCopy={onCopy}
                    />
                  )}
                </div>
                {s.note && <div className="amber-box" style={{ marginTop: 6 }}>⚠️ {s.note}</div>}
                {s.atAll && (
                  <div className="amber-box atall-box" style={{ marginTop: 6 }}>
                    📣 Lembre de marcar <strong>@all</strong> no grupo ao enviar esta mensagem
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {c_list.length > 0 && (
        <div className="task-checks">
          {c_list.map((c, i) => (
            <label key={i} className="check-item">
              <input type="checkbox" /> {c}
            </label>
          ))}
        </div>
      )}

      <div className="task-actions">
        {status !== 'done' && (
          <>
            {status !== 'in_progress' && (
              <button className="btn-status btn-start" onClick={() => onStatusChange(task.id, 'in_progress')}>
                ▶ Iniciar
              </button>
            )}
            <button className="btn-status btn-done" onClick={() => onStatusChange(task.id, 'done')}>
              ✓ Concluir
            </button>
          </>
        )}
        {status === 'done' && (
          <button className="btn-status btn-undo" onClick={() => onStatusChange(task.id, 'pending')}>
            ↩ Desfazer
          </button>
        )}
      </div>
    </div>
  )
}

function channelLabel(ch) {
  const map = { group: '👥 Grupo', private: '💬 Privado', instagram: '📷 Instagram', spark: '🏢 Spark', internal: '🏠 Interno' }
  return map[ch] || ch
}
function roleLabel(r) {
  const map = { c1: 'Admin (C1)', c2: 'Comercial (C2)', both: 'Ambas', owner: 'Proprietário' }
  return map[r] || r
}

// ─── TodayTab ─────────────────────────────────────────────────────────────────
function getNextTaskDate(fromDate) {
  const allDates = [...new Set(ALL_TASKS.map(t => t.date).filter(Boolean))].sort()
  return allDates.find(d => d >= fromDate) || null
}

function TodayTab({ taskStates, config, currentUser, onStatusChange, onCopy }) {
  const today = getTodayDate()
  const now = new Date()

  const todayTasks = getTasksByDate(today).filter(t => canSeeTask(t, currentUser.role))
  const hasTodayTasks = todayTasks.length > 0

  const nextDate = getNextTaskDate(hasTodayTasks ? today + 'Z' : today) // if today has tasks, next = future
  const futureDateForCountdown = hasTodayTasks
    ? getNextTaskDate(today.slice(0, 8) + String(parseInt(today.slice(8)) + 1).padStart(2, '0'))
    : nextDate

  const nextTasks = (!hasTodayTasks && futureDateForCountdown)
    ? getTasksByDate(futureDateForCountdown).filter(t => canSeeTask(t, currentUser.role))
    : []

  let daysLeft = 0, nextDateFmt = '', phaseInfo = null
  if (!hasTodayTasks && futureDateForCountdown) {
    daysLeft = Math.ceil((new Date(futureDateForCountdown + 'T12:00:00') - new Date(today + 'T12:00:00')) / 86400000)
    nextDateFmt = new Date(futureDateForCountdown + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    const phase = nextTasks[0]?.phase
    phaseInfo = PHASES.find(p => p.id === phase)
  }

  const done = hasTodayTasks ? todayTasks.filter(t => taskStates[t.id]?.status === 'done').length : 0
  const pct = hasTodayTasks ? Math.round((done / todayTasks.length) * 100) : 0
  const todayFmt = new Date(today + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (!hasTodayTasks && !futureDateForCountdown) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏆</div>
        <h3>Campanha concluída!</h3>
        <p>Todas as etapas foram executadas. Confira o Playbook para revisão.</p>
      </div>
    )
  }

  const grouped = {}
  todayTasks.forEach(t => {
    const h = t.time ? t.time.slice(0, 5) : '—'
    if (!grouped[h]) grouped[h] = []
    grouped[h].push(t)
  })

  return (
    <div className="tab-content">
      {/* Status card — sempre visível */}
      <div className={`today-status-card ${hasTodayTasks ? 'today-status-active' : 'today-status-waiting'}`}>
        {hasTodayTasks ? (
          <>
            <div className="today-date-label">{todayFmt}</div>
            <div className="today-progress">
              <div className="today-progress-bar"><div className="today-progress-fill" style={{ width: `${pct}%` }} /></div>
              <span className="today-progress-label">{done}/{todayTasks.length} tarefas</span>
            </div>
          </>
        ) : (
          <>
            <div className="countdown-row">
              <span className="countdown-number">{daysLeft}</span>
              <span className="countdown-unit">{daysLeft === 1 ? 'dia' : 'dias'}</span>
              <span className="countdown-sep">·</span>
              <span className="countdown-phase">{phaseInfo?.icon} {nextDateFmt}</span>
            </div>
            <div className="countdown-label">Próxima etapa: <strong>{phaseInfo?.label}</strong></div>
          </>
        )}
      </div>

      {/* Tarefas de hoje */}
      {hasTodayTasks && Object.entries(grouped)
        .sort(([a], [b]) => a === '—' ? 1 : b === '—' ? -1 : a.localeCompare(b))
        .map(([hour, htasks]) => (
          <div key={hour} className="hour-group">
            <div className="hour-label">{hour !== '—' ? `⏰ ${hour}` : '📋 Sem horário fixo'}</div>
            {htasks.map(t => {
              const status = computeStatus(t.id, t.date, t.time, taskStates, now)
              return (
                <TaskCard key={t.id} task={t} status={status} config={config}
                  onStatusChange={onStatusChange} onCopy={(label) => onCopy(t.id, label)} />
              )
            })}
          </div>
        ))
      }

      {/* Tarefas futuras — sempre visíveis, dimmed mas clicáveis */}
      {!hasTodayTasks && nextTasks.length > 0 && (
        <>
          <div className="future-tasks-label">O que vem por aí</div>
          {nextTasks.map(t => {
            const status = computeStatus(t.id, t.date, t.time, taskStates, now)
            return (
              <TaskCard key={t.id} task={t} status={status} config={config}
                onStatusChange={onStatusChange} onCopy={(label) => onCopy(t.id, label)}
                dimmed={true} />
            )
          })}
        </>
      )}
    </div>
  )
}

// ─── PlaybookTab ──────────────────────────────────────────────────────────────
function PlaybookTab({ taskStates, config, currentUser, onStatusChange, onCopy }) {
  const [activePhase, setActivePhase] = useState(PHASES[0].id)
  const phaseNavRef = useRef(null)
  const now = new Date()

  useEffect(() => {
    if (!phaseNavRef.current) return
    const active = phaseNavRef.current.querySelector('.phase-chip.active')
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activePhase])

  const tasks = getTasksByPhase(activePhase).filter(t => canSeeTask(t, currentUser.role))

  const phaseProgress = (phaseId) => {
    const all = getTasksByPhase(phaseId).filter(t => canSeeTask(t, currentUser.role))
    if (all.length === 0) return null
    const done = all.filter(t => taskStates[t.id]?.status === 'done').length
    return { done, total: all.length }
  }

  return (
    <div className="tab-content playbook-tab">
      <div className="phase-nav-wrap">
        <div className="phase-nav" ref={phaseNavRef}>
          {PHASES.map(ph => {
            const prog = phaseProgress(ph.id)
            return (
              <button
                key={ph.id}
                className={`phase-chip${activePhase === ph.id ? ' active' : ''}`}
                onClick={() => setActivePhase(ph.id)}
              >
                <span>{ph.icon}</span>
                <span className="phase-chip-name">{ph.label}</span>
                {prog && <span className="phase-chip-prog">{prog.done}/{prog.total}</span>}
              </button>
            )
          })}
        </div>
      </div>
      <div className="phase-content">
        {tasks.length === 0 ? (
          <div className="empty-state"><p>Nenhuma tarefa nesta fase para o seu perfil.</p></div>
        ) : (
          tasks.map(t => {
            const status = computeStatus(t.id, t.date, t.time, taskStates, now)
            return (
              <TaskCard
                key={t.id}
                task={t}
                status={status}
                config={config}
                onStatusChange={onStatusChange}
                onCopy={(label) => onCopy(t.id, label)}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── CRMTab ───────────────────────────────────────────────────────────────────
const CRM_COLS = [
  { id: 'vender_black', label: 'Vender Black',      color: '#f59e0b' },
  { id: 'link_enviado', label: 'Link Enviado',       color: '#3b82f6' },
  { id: 'agendar',      label: 'Agendar no Sistema', color: '#10b981' },
]

function CRMTab({ crm, onCrmChange }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', procedure: '', status: 'vender_black', note: '' })
  const [editId, setEditId] = useState(null)

  const save = () => {
    if (!form.name.trim()) return
    if (editId) {
      onCrmChange(crm.map(c => c.id === editId ? { ...c, ...form } : c))
      setEditId(null)
    } else {
      onCrmChange([...crm, { id: Date.now().toString(), ...form, date: new Date().toISOString() }])
    }
    setForm({ name: '', phone: '', procedure: '', status: 'vender_black', note: '' })
    setShowForm(false)
  }

  const del = (id) => onCrmChange(crm.filter(c => c.id !== id))

  const edit = (entry) => {
    setForm({ name: entry.name, phone: entry.phone || '', procedure: entry.procedure || '', status: entry.status, note: entry.note || '' })
    setEditId(entry.id)
    setShowForm(true)
  }

  const moveCol = (id, newStatus) => {
    onCrmChange(crm.map(c => c.id === id ? { ...c, status: newStatus } : c))
  }

  return (
    <div className="tab-content crm-tab">
      <div className="crm-header">
        <h2>CRM Black Week</h2>
        <button className="btn-primary" onClick={() => {
          setShowForm(true); setEditId(null)
          setForm({ name: '', phone: '', procedure: '', status: 'vender_black', note: '' })
        }}>+ Novo Lead</button>
      </div>

      {showForm && (
        <div className="crm-form card">
          <h3>{editId ? 'Editar Lead' : 'Novo Lead'}</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Nome *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome da paciente" />
            </div>
            <div className="form-field">
              <label>Telefone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" />
            </div>
            <div className="form-field">
              <label>Procedimento</label>
              <input value={form.procedure} onChange={e => setForm(f => ({ ...f, procedure: e.target.value }))} placeholder="Ex: Botox 3 regiões" />
            </div>
            <div className="form-field">
              <label>Coluna</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {CRM_COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-field" style={{ marginTop: 8 }}>
            <label>Observações</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} placeholder="Notas sobre o atendimento..." />
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={save}>Salvar</button>
            <button className="btn-ghost" onClick={() => { setShowForm(false); setEditId(null) }}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="crm-kanban">
        {CRM_COLS.map(col => {
          const entries = crm.filter(c => c.status === col.id)
          return (
            <div key={col.id} className="crm-col">
              <div className="crm-col-header" style={{ borderColor: col.color }}>
                <span style={{ color: col.color, fontWeight: 600 }}>{col.label}</span>
                <span className="crm-count">{entries.length}</span>
              </div>
              {entries.map(entry => (
                <div key={entry.id} className="crm-card">
                  <div className="crm-card-name">{entry.name}</div>
                  {entry.phone && <div className="crm-card-meta">📱 {entry.phone}</div>}
                  {entry.procedure && <div className="crm-card-meta">✨ {entry.procedure}</div>}
                  {entry.note && <div className="crm-card-note">{entry.note}</div>}
                  <div className="crm-card-actions">
                    <div className="crm-move">
                      {CRM_COLS.filter(c => c.id !== col.id).map(c => (
                        <button key={c.id} className="btn-move" style={{ borderColor: c.color, color: c.color }} onClick={() => moveCol(entry.id, c.id)}>
                          → {c.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-ghost-sm" onClick={() => edit(entry)}>✏️</button>
                      <button className="btn-ghost-sm danger" onClick={() => del(entry.id)}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
              {entries.length === 0 && <div className="crm-empty">Nenhum lead</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── SetupTab ─────────────────────────────────────────────────────────────────
const DAY_LABELS = [
  'Dia 1 — Seg 09/11', 'Dia 2 — Ter 10/11', 'Dia 3 — Qua 11/11',
  'Dia 4 — Qui 12/11', 'Dia 5 — Sex 13/11'
]

function SetupTab({ config, onConfigChange, currentUser, users, onUserAction }) {
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'administrative' })
  const [userMsg, setUserMsg] = useState('')
  const [resetPw, setResetPw] = useState({})

  const updateField = (field, value) => onConfigChange({ ...config, [field]: value })

  const updateDay = (di, updater) => {
    const days = [...(config.days || DEFAULT_CONFIG.days)]
    days[di] = updater(days[di] || {})
    onConfigChange({ ...config, days })
  }

  const addProc = (di) => updateDay(di, day => ({
    ...day,
    procedures: [...getDayProcedures(day), { name: '', price: '', vagas: '', installments: '', installmentPrice: '' }]
  }))

  const removeProc = (di, pi) => updateDay(di, day => ({
    ...day,
    procedures: getDayProcedures(day).filter((_, i) => i !== pi)
  }))

  const updateProc = (di, pi, field, value) => updateDay(di, day => {
    const procs = getDayProcedures(day).map((p, i) => {
      if (i !== pi) return p
      const updated = { ...p, [field]: value }
      if (field === 'price' && day.showInstallments) {
        return { ...updated, ...calcInstallments(value) }
      }
      return updated
    })
    return { ...day, procedures: procs }
  })

  const toggleInstallments = (di, checked) => updateDay(di, day => {
    const procs = getDayProcedures(day).map(p => checked ? { ...p, ...calcInstallments(p.price) } : p)
    return { ...day, showInstallments: checked, procedures: procs }
  })

  const createUser = async () => {
    if (!newUser.name || !newUser.username || !newUser.password) {
      setUserMsg('Preencha todos os campos'); return
    }
    if (newUser.password.length < 6) {
      setUserMsg('Senha deve ter pelo menos 6 caracteres'); return
    }
    if (!/^[a-zA-Z0-9_.-]{1,32}$/.test(newUser.username)) {
      setUserMsg('Username: apenas letras, números, _ . - (máx. 32)'); return
    }
    setUserMsg('Salvando…')
    const res = await onUserAction('create_user', newUser)
    if (res?.ok) {
      setUserMsg('Consultora criada com sucesso!')
      setNewUser({ name: '', username: '', password: '', role: 'administrative' })
    } else setUserMsg(res?.error || 'Erro ao criar')
  }

  const deleteUser = async (username, name) => {
    if (!confirm(`Remover ${name} (@${username})?`)) return
    setUserMsg('Removendo…')
    const res = await onUserAction('delete_user', { username })
    setUserMsg(res?.ok ? 'Removida com sucesso.' : res?.error || 'Erro')
  }

  const doResetPw = async (username) => {
    const pw = resetPw[username]
    if (!pw) return
    if (pw.length < 6) { setUserMsg('Senha deve ter pelo menos 6 caracteres'); return }
    setUserMsg('Salvando…')
    const res = await onUserAction('reset_password', { username, password: pw })
    if (res?.ok) {
      setUserMsg('Senha redefinida!')
      setResetPw(r => ({ ...r, [username]: '' }))
    } else setUserMsg(res?.error || 'Erro')
  }

  return (
    <div className="tab-content setup-tab">
      <section className="setup-section">
        <h2 className="section-title">Informações da Clínica</h2>
        <div className="form-grid">
          <div className="form-field">
            <label>Nome da Clínica</label>
            <input value={config.clinicName || ''} onChange={e => updateField('clinicName', e.target.value)} placeholder="Ex: Clínica Bella" />
          </div>
          <div className="form-field">
            <label>Cidade</label>
            <input value={config.city || ''} onChange={e => updateField('city', e.target.value)} placeholder="Ex: São Paulo" />
          </div>
        </div>
      </section>

      <section className="setup-section">
        <h2 className="section-title">Procedimentos por Dia</h2>
        {DAY_LABELS.map((label, di) => {
          const day = (config.days || DEFAULT_CONFIG.days)[di] || {}
          const procs = getDayProcedures(day)
          const firstProc = procs[0] || {}
          const previewProc = firstProc.name || '[Procedimento]'
          const previewVal = firstProc.price ? `R$${firstProc.price}` : '[Valor]'
          const previewCond = day.condition || ''
          const isMultiDay = di === 3
          return (
            <div key={di} className="day-config card">
              <div className="day-config-header">
                <span className="day-label">🔥 {label}</span>
                <label className="toggle-label">
                  <input type="checkbox" checked={!!day.showInstallments} onChange={e => toggleInstallments(di, e.target.checked)} />
                  Parcelamento
                </label>
              </div>
              <div className="day-config-body">
                <div className="day-config-form">
                  {procs.map((proc, pi) => (
                    <div key={pi} className="proc-row">
                      <input placeholder="Procedimento" value={proc.name} onChange={e => updateProc(di, pi, 'name', e.target.value)} className="proc-name" />
                      <input placeholder="Valor (R$)" value={proc.price} onChange={e => updateProc(di, pi, 'price', e.target.value)} className="proc-price" />
                      <input placeholder="Vagas" value={proc.vagas} onChange={e => updateProc(di, pi, 'vagas', e.target.value)} className="proc-vagas" />
                      {day.showInstallments && (
                        <>
                          <input placeholder="Parcelas" value={proc.installments} onChange={e => updateProc(di, pi, 'installments', e.target.value)} className="proc-install" />
                          <input placeholder="R$/parcela" value={proc.installmentPrice} onChange={e => updateProc(di, pi, 'installmentPrice', e.target.value)} className="proc-install" />
                        </>
                      )}
                      {pi > 0 && <button className="btn-ghost-sm danger" onClick={() => removeProc(di, pi)}>✕</button>}
                    </div>
                  ))}
                  <button className="btn-ghost-sm" onClick={() => addProc(di)}>+ Procedimento</button>
                  <div className="form-field" style={{ marginTop: 8 }}>
                    <label>Condição do Dia <span className="field-hint">→ vira a mensagem de revelação</span></label>
                    <textarea
                      rows={3}
                      placeholder={'Ex: Bioestimuladores 20% off só para pacientes do grupo VIP 🤯🤯🤯'}
                      value={previewCond}
                      onChange={e => updateDay(di, d => ({ ...d, condition: e.target.value }))}
                      className="day-condition-textarea"
                    />
                  </div>
                </div>
                <div className="day-config-preview">
                  <div className="preview-label">Preview da enquete</div>
                  {previewCond && (
                    <div className="wa-bubble wa-reveal">
                      <pre className="wa-reveal-text">{previewCond}</pre>
                    </div>
                  )}
                  <div className="wa-bubble wa-poll">
                    <div className="wa-poll-header">
                      <span className="wa-poll-icon">📊</span>
                      <span className="wa-poll-title">ENQUETE</span>
                    </div>
                    <div className="wa-poll-question">
                      {isMultiDay ? 'Qual vai garantir hoje?' : `${previewProc} por apenas ${previewVal} 🤯`}
                    </div>
                    <div className="wa-poll-options">
                      {isMultiDay ? (
                        procs.length > 0 ? procs.map((p, i) => (
                          <div key={i} className="wa-poll-option">
                            <span className="wa-radio" />
                            <span>{p.name || `[Procedimento ${i+1}]`}</span>
                          </div>
                        )) : (
                          <div className="wa-poll-option"><span className="wa-radio" /><span>[Procedimento 1]</span></div>
                        )
                      ) : (
                        <>
                          <div className="wa-poll-option"><span className="wa-radio" /><span>QUERO 🤯🤯🤯</span></div>
                          <div className="wa-poll-option"><span className="wa-radio" /><span>QUERO MUITO</span></div>
                        </>
                      )}
                    </div>
                    {isMultiDay && <div className="wa-poll-multi">✓ Múltiplas respostas</div>}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      {currentUser.role === 'owner' && (
        <section className="setup-section">
          <h2 className="section-title">Equipe de Consultoras</h2>
          {users.length > 0 ? (
            <div className="users-list">
              {users.map(u => (
                <div key={u.username} className="user-row card">
                  <div className="user-info">
                    <span className="user-name">{u.name}</span>
                    <span className="user-username">@{u.username}</span>
                    <span className={`role-badge role-${u.role}`}>{u.role === 'administrative' ? 'Administrativa' : 'Comercial'}</span>
                  </div>
                  <div className="user-actions">
                    <input
                      type="password"
                      placeholder="Nova senha"
                      value={resetPw[u.username] || ''}
                      onChange={e => setResetPw(r => ({ ...r, [u.username]: e.target.value }))}
                      className="pw-input"
                    />
                    <button className="btn-ghost-sm" onClick={() => doResetPw(u.username)}>🔑 Redefinir</button>
                    <button className="btn-ghost-sm danger" onClick={() => deleteUser(u.username, u.name)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-small">Nenhuma consultora cadastrada ainda.</p>
          )}

          <div className="card new-user-form">
            <h3>Nova Consultora</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>Nome Completo</label>
                <input value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} placeholder="Nome da consultora" />
              </div>
              <div className="form-field">
                <label>Username</label>
                <input value={newUser.username} onChange={e => setNewUser(u => ({ ...u, username: e.target.value.replace(/\s/g, '') }))} placeholder="sem espaços" />
              </div>
              <div className="form-field">
                <label>Senha</label>
                <input type="password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Função</label>
                <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}>
                  <option value="administrative">Administrativa (C1)</option>
                  <option value="commercial">Comercial (C2)</option>
                </select>
              </div>
            </div>
            {userMsg && <div className="user-msg">{userMsg}</div>}
            <button className="btn-primary" style={{ marginTop: 12 }} onClick={createUser}>Criar Consultora</button>
          </div>
        </section>
      )}
    </div>
  )
}

// ─── AuditTab ─────────────────────────────────────────────────────────────────
function AuditTab({ audit }) {
  const sorted = [...(audit || [])].reverse()
  return (
    <div className="tab-content audit-tab">
      <h2 style={{ marginBottom: 16 }}>Auditoria de Ações</h2>
      {sorted.length === 0 ? (
        <div className="empty-state"><p>Nenhum registro ainda.</p></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="audit-table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry, i) => (
                <tr key={i}>
                  <td className="audit-ts">{fmtDate(entry.timestamp)}</td>
                  <td>{entry.user}</td>
                  <td>
                    <span className={`audit-badge action-${entry.action}`}>
                      {entry.action === 'status_change' ? 'Status' : 'Cópia'}
                    </span>
                  </td>
                  <td className="audit-detail">{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── LoginScreen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const rawId = new URLSearchParams(window.location.search).get('c') || ''
  const clinicId = CLINIC_ID_RE.test(rawId) ? rawId : null
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!clinicId) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <img src={sparkLogo} alt="Spark" className="bw-logo-img login-logo" />
          <h1>Black Week</h1>
          <div className="login-error" style={{ marginTop: 16 }}>
            Link inválido. Peça o link correto ao proprietário da clínica.
          </div>
        </div>
        <style>{CSS}</style>
      </div>
    )
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (import.meta.env.DEV) {
      const DEV_CLINICS = { 'clinica_demo': 'BW2026demo', 'spark_test': 'Spark@BW26', 'demo': 'BW2026demo' }
      if (username === 'owner' && DEV_CLINICS[clinicId] === password) {
        onLogin({ clinic_id: clinicId, token: 'dev-token', username: 'owner', role: 'owner', name: 'Proprietário' })
        setLoading(false)
        return
      }
    }

    try {
      const res = await fetch('/api/bw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auth', clinic_id: clinicId, username: username.trim(), password }),
      })
      const data = await res.json()
      if (data.ok && data.token) {
        onLogin({ clinic_id: clinicId, token: data.token, username: data.username, role: data.role, name: data.name || data.username })
      } else {
        setError(data.error || 'Credenciais inválidas')
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    }
    setLoading(false)
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <img src={sparkLogo} alt="Spark" className="bw-logo-img login-logo" />
        <h1>Black Week</h1>
        <p className="login-subtitle">Sistema de Execução de Campanha</p>
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-field">
            <label>Usuário</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Seu username"
              autoComplete="username"
              required
            />
          </div>
          <div className="form-field">
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Sua senha"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
      <style>{CSS}</style>
    </div>
  )
}

// ─── Main BlackWeek ───────────────────────────────────────────────────────────
export default function BlackWeek() {
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState('today')
  const [taskStates, setTaskStates] = useState({})
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [crm, setCrm] = useState([])
  const [audit, setAudit] = useState([])
  const [users, setUsers] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('bw-theme')
      if (stored) return stored
      return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'
    } catch { return 'light' }
  })
  const saveTimer = useRef(null)
  const pendingSave = useRef(null)

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    try { localStorage.setItem('bw-theme', next) } catch {}
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
    if (!mq) return
    const handler = (e) => {
      try {
        if (!localStorage.getItem('bw-theme')) {
          setTheme(e.matches ? 'dark' : 'light')
        }
      } catch {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!currentUser) return
    const load = async () => {
      setSyncing(true)
      try {
        if (import.meta.env.DEV && currentUser.token === 'dev-token') {
          setSyncing(false); return
        }
        const res = await fetch(`/api/bw?token=${encodeURIComponent(currentUser.token)}`)
        const data = await res.json()
        if (data.state) {
          const s = data.state
          setTaskStates(s.taskStates || {})
          setConfig({ ...DEFAULT_CONFIG, ...(s.config || {}) })
          setCrm(s.crm || [])
          setAudit(s.audit || [])
          setUsers(s.users || [])
        }
      } catch (e) { console.error('[bw] load error', e) }
      setSyncing(false)
    }
    load()
  }, [currentUser?.token])

  useEffect(() => {
    const flush = () => {
      if (!currentUser || !pendingSave.current || document.visibilityState !== 'hidden') return
      if (import.meta.env.DEV && currentUser.token === 'dev-token') return
      clearTimeout(saveTimer.current)
      const { ts, cfg, c, a } = pendingSave.current
      navigator.sendBeacon('/api/bw', new Blob([JSON.stringify({
        action: 'save', session_token: currentUser.token,
        state: { taskStates: ts, config: cfg, crm: c, audit: a },
      })], { type: 'application/json' }))
      pendingSave.current = null
    }
    document.addEventListener('visibilitychange', flush)
    return () => document.removeEventListener('visibilitychange', flush)
  }, [currentUser])

  const scheduleSave = useCallback((ts, cfg, c, a) => {
    pendingSave.current = { ts, cfg, c, a }
    clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(async () => {
      if (!currentUser || (import.meta.env.DEV && currentUser.token === 'dev-token')) {
        setSaveStatus(null); return
      }
      try {
        const r = await fetch('/api/bw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save', session_token: currentUser.token, state: { taskStates: ts, config: cfg, crm: c, audit: a } }),
        })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        setSaveStatus('saved')
        pendingSave.current = null
        setTimeout(() => setSaveStatus(s => s === 'saved' ? null : s), 2000)
      } catch (e) {
        console.error('[bw] save error', e)
        setSaveStatus('error')
        setTimeout(() => setSaveStatus(s => s === 'error' ? null : s), 4000)
      }
    }, 1500)
  }, [currentUser])

  const handleStatusChange = (taskId, status) => {
    const newStates = {
      ...taskStates,
      [taskId]: { status, timestamp: new Date().toISOString(), updatedBy: currentUser.username },
    }
    if (status === 'pending') {
      delete newStates[taskId]
    }
    const task = ALL_TASKS.find(t => t.id === taskId)
    const newAudit = [...audit, {
      timestamp: new Date().toISOString(),
      user: currentUser.name || currentUser.username,
      action: 'status_change',
      target: taskId,
      detail: `"${task?.title || taskId}" → ${status}`,
    }]
    setTaskStates(newStates)
    setAudit(newAudit)
    scheduleSave(newStates, config, crm, newAudit)
  }

  const handleCopy = (taskId, label) => {
    const task = ALL_TASKS.find(t => t.id === taskId)
    const newAudit = [...audit, {
      timestamp: new Date().toISOString(),
      user: currentUser.name || currentUser.username,
      action: 'copy',
      target: taskId,
      detail: `${label} (tarefa: "${task?.title || taskId}")`,
    }]
    setAudit(newAudit)
    scheduleSave(taskStates, config, crm, newAudit)
  }

  const handleConfigChange = (newConfig) => {
    setConfig(newConfig)
    scheduleSave(taskStates, newConfig, crm, audit)
  }

  const handleCrmChange = (newCrm) => {
    setCrm(newCrm)
    scheduleSave(taskStates, config, newCrm, audit)
  }

  const handleUserAction = async (action, data) => {
    if (!currentUser) return { error: 'Não autenticado' }

    // Dev bypass: simulate user management locally (no API in Vite dev mode)
    if (import.meta.env.DEV && currentUser.token === 'dev-token') {
      if (action === 'create_user') {
        const { name, username, password, role } = data
        if (!name || !username || !password) return { error: 'Preencha todos os campos' }
        if (users.find(u => u.username === username)) return { error: 'Username já existe' }
        setUsers(prev => [...prev, { username, name, role }])
        return { ok: true }
      }
      if (action === 'delete_user') {
        setUsers(prev => prev.filter(u => u.username !== data.username))
        return { ok: true }
      }
      if (action === 'reset_password') return { ok: true }
      return { ok: true }
    }

    try {
      const res = await fetch('/api/bw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, session_token: currentUser.token, ...data }),
      })
      const result = await res.json()
      if (result.ok) {
        const sr = await fetch(`/api/bw?token=${encodeURIComponent(currentUser.token)}`)
        const sd = await sr.json()
        if (sd.state?.users) setUsers(sd.state.users)
      }
      return result
    } catch { return { error: 'Erro de conexão' } }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setTaskStates({})
    setConfig(DEFAULT_CONFIG)
    setCrm([])
    setAudit([])
    setUsers([])
  }

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />

  const TABS = [
    { id: 'today',    label: '📅 Hoje',      show: true },
    { id: 'playbook', label: '📋 Playbook',  show: true },
    { id: 'crm',      label: '👥 CRM',       show: true },
    { id: 'setup',    label: '⚙️ Config',    show: true },
    { id: 'audit',    label: '🔍 Auditoria', show: currentUser.role === 'owner' },
  ]

  const doneTasks = Object.values(taskStates).filter(s => s?.status === 'done').length
  const totalVisible = ALL_TASKS.filter(t => canSeeTask(t, currentUser.role)).length

  return (
    <div className="bw-app" data-theme={theme}>
      <header className="bw-header">
        <div className="bw-header-left">
          <img src={sparkLogo} alt="Spark" className="bw-logo-img" />
          {syncing && <span className="sync-spin">↻</span>}
          {saveStatus === 'saving' && <span className="sync-status saving" title="Salvando...">↑</span>}
          {saveStatus === 'saved' && <span className="sync-status saved" title="Salvo">✓</span>}
          {saveStatus === 'error' && <span className="sync-status error" title="Erro ao salvar">✕</span>}
          <span className="progress-pill">{doneTasks}/{totalVisible}</span>
        </div>
        <div className="bw-header-right">
          <span className="user-pill">{currentUser.name || currentUser.username} · {roleShort(currentUser.role)}</span>
          <button className="btn-ghost-sm theme-toggle" onClick={toggleTheme} title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button className="btn-ghost-sm" onClick={handleLogout}>Sair</button>
        </div>
      </header>

      <nav className="bw-nav">
        {TABS.filter(t => t.show).map(tab => (
          <button key={tab.id} className={`nav-btn${activeTab === tab.id ? ' active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="bw-main">
        {activeTab === 'today' && (
          <TodayTab taskStates={taskStates} config={config} currentUser={currentUser} onStatusChange={handleStatusChange} onCopy={handleCopy} />
        )}
        {activeTab === 'playbook' && (
          <PlaybookTab taskStates={taskStates} config={config} currentUser={currentUser} onStatusChange={handleStatusChange} onCopy={handleCopy} />
        )}
        {activeTab === 'crm' && <CRMTab crm={crm} onCrmChange={handleCrmChange} />}
        {activeTab === 'setup' && (
          <SetupTab config={config} onConfigChange={handleConfigChange} currentUser={currentUser} users={users} onUserAction={handleUserAction} />
        )}
        {activeTab === 'audit' && currentUser.role === 'owner' && <AuditTab audit={audit} />}
      </main>

      <style>{CSS}</style>
    </div>
  )
}

function roleShort(role) {
  if (role === 'owner') return 'Proprietário'
  if (role === 'administrative') return 'Admin'
  if (role === 'commercial') return 'Comercial'
  return role
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; min-width: 0; }
html, body { overflow-x: hidden; }
:root {
  --bg:      #ffffff;
  --base:    #f5f5f7;
  --raised:  #ffffff;
  --hover:   #ebebf0;
  --active:  #d8d8df;
  --text:    #1d1d1f;
  --text2:   #6e6e73;
  --text3:   #86868b;
  --accent:  #e8923a;
  --accent-h:#d47d2a;
  --amber:   #ff9f0a;
  --green:   #34c759;
  --blue:    #0071e3;
  --red:     #ff3b30;
  --r-xs: 6px; --r-sm: 10px; --r: 14px; --r-lg: 20px;
  --shadow: 0 2px 12px rgba(0,0,0,.07);
  --shadow-lg: 0 8px 40px rgba(0,0,0,.13);
  --nav-bg: rgba(255,255,255,.82);
  --border: rgba(0,0,0,.08);
}
[data-theme="dark"], [data-theme="dark"] :root {
  --bg:      #000000;
  --base:    #111111;
  --raised:  #1c1c1e;
  --hover:   #2c2c2e;
  --active:  #3a3a3c;
  --text:    #ffffff;
  --text2:   #c7c7cc;
  --text3:   #8e8e93;
  --green:   #30d158;
  --blue:    #3d8bc8;
  --red:     #ff453a;
  --shadow: 0 4px 20px rgba(0,0,0,.8);
  --shadow-lg: 0 8px 40px rgba(0,0,0,.95);
  --nav-bg: rgba(0,0,0,.92);
  --border: rgba(255,255,255,.1);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg:      #000000;
    --base:    #111111;
    --raised:  #1c1c1e;
    --hover:   #2c2c2e;
    --active:  #3a3a3c;
    --text:    #ffffff;
    --text2:   #c7c7cc;
    --text3:   #8e8e93;
    --green:   #30d158;
    --blue:    #3d8bc8;
    --red:     #ff453a;
    --shadow: 0 4px 20px rgba(0,0,0,.8);
    --shadow-lg: 0 8px 40px rgba(0,0,0,.95);
    --nav-bg: rgba(0,0,0,.92);
    --border: rgba(255,255,255,.1);
  }
}
[data-theme="light"] {
  --bg:      #ffffff;
  --base:    #f5f5f7;
  --raised:  #ffffff;
  --hover:   #ebebf0;
  --active:  #d8d8df;
  --text:    #1d1d1f;
  --text2:   #6e6e73;
  --text3:   #86868b;
  --green:   #34c759;
  --blue:    #0071e3;
  --red:     #ff3b30;
  --shadow: 0 2px 12px rgba(0,0,0,.07);
  --shadow-lg: 0 8px 40px rgba(0,0,0,.13);
  --nav-bg: rgba(255,255,255,.82);
  --border: rgba(0,0,0,.08);
}
body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.5;
  overflow-x: hidden;
}

/* ── App shell ── */
.bw-app { min-height: 100vh; display: flex; flex-direction: column; overflow-x: hidden; }

/* ── Header ── */
.bw-header {
  background: var(--nav-bg);
  backdrop-filter: saturate(1.8) blur(20px);
  -webkit-backdrop-filter: saturate(1.8) blur(20px);
  border-bottom: 1px solid var(--border);
  padding: 0 24px;
  height: 48px;
  display: flex; justify-content: space-between; align-items: center;
  gap: 16px; position: sticky; top: 0; z-index: 100;
}
.bw-header-left,.bw-header-right { display: flex; align-items: center; gap: 10px; }
.bw-title { font-size: 14px; font-weight: 600; letter-spacing: -.02em; color: var(--text); }
.bw-logo-img { height: 26px; width: auto; object-fit: contain; }
.sync-spin { animation: spin 1s linear infinite; color: var(--text3); font-size: 13px; }
@keyframes spin { to { transform: rotate(360deg); } }
.progress-pill {
  background: var(--base); border-radius: 980px;
  padding: 4px 12px; font-size: 12px; color: var(--text2); font-weight: 600;
  cursor: default; transition: background .2s, color .2s; border: 1px solid var(--border);
}
.progress-pill:hover { background: var(--hover); color: var(--text); }
.user-pill { font-size: 13px; color: var(--text2); font-weight: 400; letter-spacing: -.01em; }

/* ── Nav ── */
.bw-nav {
  background: var(--nav-bg);
  backdrop-filter: saturate(1.8) blur(20px);
  -webkit-backdrop-filter: saturate(1.8) blur(20px);
  border-bottom: 1px solid var(--border);
  display: flex; overflow-x: auto; gap: 0; padding: 0 20px; scrollbar-width: none;
}
.bw-nav::-webkit-scrollbar { display: none; }
.nav-btn {
  background: transparent; border: none; color: var(--text3);
  padding: 0 16px; height: 44px; font-size: 13px; cursor: pointer; white-space: nowrap;
  font-weight: 500; letter-spacing: -.01em;
  transition: color .2s; position: relative;
  -webkit-tap-highlight-color: transparent;
}
.nav-btn::after {
  content: ''; position: absolute; bottom: 0; left: 16px; right: 16px; height: 2px;
  background: var(--accent); border-radius: 1px 1px 0 0; opacity: 0; transition: opacity .2s;
}
.nav-btn.active { color: var(--text); font-weight: 600; }
.nav-btn.active::after { opacity: 1; }
.nav-btn:hover:not(.active) { color: var(--text2); }

/* ── Main ── */
.bw-main { flex: 1; max-width: 900px; margin: 0 auto; width: 100%; padding: 24px 20px 48px; }
.tab-content { display: flex; flex-direction: column; gap: 12px; }

/* ── Today status card ── */
.today-status-card {
  border-radius: var(--r-lg); padding: 24px 28px; margin-bottom: 8px;
}
.today-status-active {
  background: var(--base); border: 1px solid var(--border);
}
.today-status-waiting {
  background: linear-gradient(135deg, rgba(232,146,58,.07) 0%, rgba(232,146,58,.02) 100%);
  border: 1px solid rgba(232,146,58,.2);
}
.today-date-label {
  font-size: 24px; font-weight: 700; letter-spacing: -.03em; margin-bottom: 16px;
  text-transform: capitalize; color: var(--text);
}
.today-progress { display: flex; align-items: center; gap: 16px; }
.today-progress-bar {
  flex: 1; height: 4px; background: rgba(0,0,0,.08); border-radius: 2px; overflow: hidden; cursor: pointer;
}
.today-progress-bar:hover .today-progress-fill { background: var(--accent-h); }
.today-progress-fill {
  height: 100%; border-radius: 2px; background: var(--accent);
  transition: width .5s cubic-bezier(.4,0,.2,1), background .2s;
}
.today-progress-label { font-size: 13px; color: var(--text2); white-space: nowrap; font-weight: 600; }

.countdown-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.countdown-number { font-size: 56px; font-weight: 700; letter-spacing: -.04em; color: var(--accent); line-height: 1; }
.countdown-unit { font-size: 20px; font-weight: 600; color: var(--accent); }
.countdown-sep { font-size: 16px; color: var(--text3); margin: 0 4px; }
.countdown-phase { font-size: 15px; color: var(--text2); font-weight: 500; }
.countdown-label { font-size: 14px; color: var(--text2); margin-top: 4px; }
.countdown-label strong { color: var(--text); font-weight: 600; }

.future-tasks-label {
  font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
  color: var(--text3); padding: 8px 0 4px;
}

/* ── Hour groups ── */
.hour-group { margin-bottom: 4px; }
.hour-label {
  font-size: 11px; font-weight: 600; color: var(--text3);
  padding: 16px 0 8px; letter-spacing: .06em; text-transform: uppercase;
  display: flex; align-items: center; gap: 10px;
}
.hour-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }

/* ── Task card ── */
.task-card {
  background: var(--raised);
  border: 1px solid var(--border);
  border-left: 3px solid transparent;
  border-radius: var(--r);
  padding: 14px 16px; margin-bottom: 6px;
  box-shadow: var(--shadow);
  transition: background .2s, opacity .25s, box-shadow .2s;
}
.task-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.1); background: #fafafa; }
.task-card.dimmed { opacity: 0.4; }
.task-card.dimmed:hover { opacity: 0.65; }
.task-card.status-pending { border-left-color: transparent; }
.task-card.status-in_progress { border-left-color: var(--blue); background: rgba(0,113,227,.03); }
.task-card.status-done { border-left-color: var(--green); opacity: .45; }
.task-card.status-done:hover { opacity: .65; }
.task-card.status-overdue { border-left-color: var(--red); background: rgba(255,59,48,.03); }

.task-header { margin-bottom: 10px; }
.task-meta { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 8px; }
.task-time,.task-channel,.task-role {
  font-size: 11px; padding: 2px 9px; border-radius: 980px; font-weight: 600;
  letter-spacing: .01em;
}
.task-time { background: var(--base); color: var(--text3); border: 1px solid var(--border); }
.ch-group { background: rgba(52,199,89,.1); color: #1a9e41; border: 1px solid rgba(52,199,89,.2); }
.ch-private { background: rgba(0,113,227,.08); color: #0057b8; border: 1px solid rgba(0,113,227,.15); }
.ch-instagram { background: rgba(193,53,132,.08); color: #c13584; border: 1px solid rgba(193,53,132,.15); }
.ch-spark { background: rgba(232,146,58,.1); color: #b86a20; border: 1px solid rgba(232,146,58,.2); }
.task-role { background: var(--base); color: var(--text3); border: 1px solid var(--border); }
.task-title { font-size: 15px; font-weight: 600; line-height: 1.4; letter-spacing: -.01em; color: var(--text); }
.task-note-static { font-size: 13px; color: var(--text2); margin-top: 6px; line-height: 1.5; }

/* ── Scripts ── */
.task-scripts { display: flex; flex-direction: column; gap: 10px; margin: 12px 0; }
.script-label {
  font-size: 11px; text-transform: uppercase; letter-spacing: .06em;
  color: var(--text3); margin-bottom: 5px; font-weight: 600;
}
.script-text-wrap { position: relative; }
.script-text {
  background: var(--base); border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 12px 80px 12px 14px;
  font-size: 14px; white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word;
  font-family: inherit; min-height: 48px; line-height: 1.7; color: var(--text);
}
.copy-btn {
  position: absolute; top: 8px; right: 8px;
  background: var(--raised); border: 1px solid var(--border);
  border-radius: 980px; color: var(--text2); font-size: 11px;
  padding: 4px 10px; cursor: pointer; font-weight: 600; letter-spacing: .01em;
  transition: background .15s, color .15s; white-space: nowrap;
}
.copy-btn:hover { background: var(--hover); color: var(--text); }
.copy-btn.copied { background: rgba(52,199,89,.1); color: #1a9e41; border-color: rgba(52,199,89,.25); }

/* ── Amber info box ── */
.amber-box {
  background: rgba(255,159,10,.06); border: 1px solid rgba(255,159,10,.2);
  border-left: 3px solid var(--amber);
  border-radius: var(--r-sm); padding: 10px 14px;
  font-size: 13px; color: #7a4f00; line-height: 1.5;
}

/* ── WhatsApp Poll ── */
.wa-poll-card {
  background: #e7fce1; border: 1px solid rgba(52,199,89,.2);
  border-radius: var(--r-lg); padding: 16px 18px;
}
.wa-poll-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.wa-poll-icon { font-size: 15px; }
.wa-poll-title {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; color: #1a7a35;
}
.wa-poll-multi {
  font-size: 10px; background: rgba(52,199,89,.15); border: 1px solid rgba(52,199,89,.25);
  padding: 2px 8px; border-radius: 980px; color: #1a7a35; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
}
.wa-poll-question { font-size: 15px; font-weight: 700; margin-bottom: 12px; color: #1a1a1a; letter-spacing: -.01em; }
.wa-poll-options { display: flex; flex-direction: column; gap: 5px; }
.wa-poll-option {
  display: flex; align-items: center; gap: 12px;
  background: rgba(255,255,255,.65); border: 1px solid rgba(52,199,89,.12);
  border-radius: var(--r-sm); padding: 10px 14px;
  transition: background .15s;
}
.wa-poll-option:hover { background: rgba(255,255,255,.9); }
.wa-poll-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(52,199,89,.6); flex-shrink: 0; }
.wa-poll-opt-text { font-size: 14px; color: #1a1a1a; }
.wa-poll-note { margin-top: 10px; font-size: 12px; color: #5a7a5a; }
.wa-poll-condition {
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
  color: var(--accent); background: rgba(232,146,58,.1); border: 1px solid rgba(232,146,58,.25);
  border-radius: 980px; padding: 3px 10px; margin-bottom: 10px; display: inline-block;
}

/* ── Checklist ── */
.task-checks { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
.check-item { display: flex; align-items: center; gap: 10px; font-size: 14px; cursor: pointer; padding: 4px 0; color: var(--text2); }
.check-item:hover { color: var(--text); }
.check-item input { cursor: pointer; accent-color: var(--accent); width: 15px; height: 15px; }

/* ── Task actions ── */
.task-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.btn-status {
  padding: 7px 18px; border-radius: 980px; border: none;
  cursor: pointer; font-size: 13px; font-weight: 600; letter-spacing: -.01em;
  transition: background .15s, transform .1s, box-shadow .15s; -webkit-tap-highlight-color: transparent;
}
.btn-status:hover { filter: brightness(.92); box-shadow: 0 2px 8px rgba(0,0,0,.15); }
.btn-status:active { transform: scale(.96); }
.btn-start { background: var(--blue); color: #fff; }
.btn-done { background: var(--green); color: #fff; }
.btn-undo { background: var(--base); border: 1px solid var(--border); color: var(--text2); }
.btn-undo:hover { background: var(--hover); color: var(--text); filter: none; box-shadow: none; }

/* ── Playbook phase nav ── */
.phase-nav-wrap {
  position: relative; margin-bottom: 12px;
}
.phase-nav-wrap::after {
  content: '';
  position: absolute; right: 0; top: 0; bottom: 2px;
  width: 52px;
  background: linear-gradient(to right, transparent, var(--bg) 85%);
  pointer-events: none;
}
.phase-nav {
  display: flex; overflow-x: auto; gap: 6px;
  padding-bottom: 2px; scrollbar-width: none;
}
.phase-nav::-webkit-scrollbar { display: none; }
.phase-chip {
  background: var(--base); border: 1px solid var(--border);
  border-radius: 980px; color: var(--text2); padding: 6px 14px;
  cursor: pointer; white-space: nowrap; font-weight: 500; flex-shrink: 0;
  display: flex; align-items: center; gap: 6px; font-size: 13px;
  transition: background .15s, border-color .15s, color .15s, box-shadow .15s;
}
.phase-chip:hover { background: var(--hover); color: var(--text); }
.phase-chip.active { background: var(--text); border-color: var(--text); color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.18); }
.phase-chip.active .phase-chip-prog { color: rgba(255,255,255,.75); }
.phase-chip-name { font-size: 12px; font-weight: 500; letter-spacing: -.01em; }
.phase-chip-prog { font-size: 11px; color: var(--green); font-weight: 600; opacity: .9; }

/* ── CRM ── */
.crm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.crm-header h2 { font-size: 22px; font-weight: 700; letter-spacing: -.03em; color: var(--text); }
.crm-kanban { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
@media (max-width: 680px) { .crm-kanban { grid-template-columns: 1fr; } }
.crm-col {
  background: var(--base); border: 1px solid var(--border);
  border-radius: var(--r-lg); padding: 14px;
}
.crm-col-header {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 12px; border-bottom: 1px solid var(--border); margin-bottom: 12px;
}
.crm-count { background: var(--raised); border-radius: 980px; padding: 2px 10px; font-size: 12px; font-weight: 600; color: var(--text2); border: 1px solid var(--border); }
.crm-card {
  background: var(--raised); border: 1px solid var(--border);
  border-radius: var(--r-sm); padding: 12px; margin-bottom: 6px; transition: box-shadow .15s;
  box-shadow: var(--shadow);
}
.crm-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); }
.crm-card-name { font-weight: 600; font-size: 15px; margin-bottom: 5px; letter-spacing: -.01em; color: var(--text); }
.crm-card-meta { font-size: 13px; color: var(--text2); margin-bottom: 2px; }
.crm-card-note { font-size: 12px; color: var(--text3); margin-top: 6px; }
.crm-card-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; gap: 4px; flex-wrap: wrap; }
.crm-move { display: flex; gap: 4px; flex-wrap: wrap; }
.btn-move {
  background: var(--base); border: 1px solid var(--border);
  border-radius: 980px; padding: 4px 12px; font-size: 11px;
  cursor: pointer; white-space: nowrap; color: var(--text2); font-weight: 600;
  letter-spacing: -.01em; transition: background .12s;
}
.btn-move:hover { background: var(--hover); color: var(--text); }
.crm-empty { font-size: 13px; color: var(--text3); text-align: center; padding: 20px 0; }
.crm-form { padding: 14px; }
.crm-form h3 { font-size: 18px; font-weight: 700; margin-bottom: 16px; letter-spacing: -.02em; }

/* ── Setup ── */
.setup-section {
  display: flex; flex-direction: column; gap: 14px;
  padding-bottom: 24px; border-bottom: 1px solid var(--border);
}
.setup-section:last-child { border-bottom: none; }
.section-title {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .06em; color: var(--text3);
}
.day-config {
  background: var(--raised); border: 1px solid var(--border);
  border-radius: var(--r-lg); padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
  transition: box-shadow .2s; box-shadow: var(--shadow);
}
.day-config:hover { box-shadow: 0 4px 16px rgba(0,0,0,.09); }
.day-config-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.day-label { font-weight: 700; font-size: 15px; }
.toggle-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text2); cursor: pointer; }
.toggle-label:hover { color: var(--text); }
.day-config-body { display: grid; grid-template-columns: 1fr 220px; gap: 20px; align-items: start; }
.day-config-form { display: flex; flex-direction: column; gap: 6px; }
.proc-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.proc-name { flex: 2; min-width: 130px; }
.proc-price,.proc-vagas,.proc-install { flex: 1; min-width: 70px; }
.day-condition-textarea { width: 100%; resize: vertical; font-family: inherit; font-size: 13px; }
.field-hint { font-size: 11px; color: var(--text3); font-weight: 400; margin-left: 4px; }

/* ── WhatsApp preview ── */
.day-config-preview { display: flex; flex-direction: column; gap: 6px; }
.preview-label { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--text3); margin-bottom: 2px; }
.wa-bubble { border-radius: 8px 8px 8px 0; padding: 10px 12px; max-width: 100%; }
.wa-reveal { background: #dcf8c6; color: #111; }
[data-theme="dark"] .wa-reveal { background: #1a3a1a; color: #e8f5e2; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .wa-reveal { background: #1a3a1a; color: #e8f5e2; } }
.wa-reveal-text { font-size: 12px; line-height: 1.45; white-space: pre-wrap; margin: 0; font-family: inherit; }
.wa-poll { background: #fffde7; color: #111; border: 1px solid rgba(0,0,0,.08); }
[data-theme="dark"] .wa-poll { background: #1e1e12; color: #f5f0d0; border-color: rgba(255,255,255,.08); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .wa-poll { background: #1e1e12; color: #f5f0d0; border-color: rgba(255,255,255,.08); } }
.wa-poll-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.wa-poll-icon { font-size: 16px; }
.wa-poll-title { font-size: 10px; font-weight: 700; letter-spacing: .08em; color: #128c7e; }
[data-theme="dark"] .wa-poll-title { color: #25d366; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .wa-poll-title { color: #25d366; } }
.wa-poll-question { font-size: 13px; font-weight: 600; line-height: 1.4; margin-bottom: 8px; }
.wa-poll-options { display: flex; flex-direction: column; gap: 5px; }
.wa-poll-option { display: flex; align-items: center; gap: 7px; font-size: 12px; padding: 5px 8px; border-radius: 6px; background: rgba(0,0,0,.05); }
[data-theme="dark"] .wa-poll-option { background: rgba(255,255,255,.06); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .wa-poll-option { background: rgba(255,255,255,.06); } }
.wa-radio { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #128c7e; flex-shrink: 0; }
[data-theme="dark"] .wa-radio { border-color: #25d366; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .wa-radio { border-color: #25d366; } }
.wa-poll-multi { font-size: 10px; color: var(--text3); margin-top: 6px; }

/* ── Users ── */
.users-list { display: flex; flex-direction: column; gap: 6px; }
.user-row {
  background: var(--raised); border: 1px solid var(--border);
  border-radius: var(--r); padding: 14px 16px;
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px; flex-wrap: wrap; transition: box-shadow .15s; box-shadow: var(--shadow);
}
.user-row:hover { box-shadow: 0 4px 16px rgba(0,0,0,.09); }
.user-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.user-name { font-weight: 600; font-size: 15px; letter-spacing: -.01em; color: var(--text); }
.user-username { font-size: 13px; color: var(--text2); }
.role-badge { font-size: 10px; padding: 3px 10px; border-radius: 980px; font-weight: 600; text-transform: uppercase; letter-spacing: .03em; }
.role-administrative { background: rgba(52,199,89,.1); color: #1a7a35; border: 1px solid rgba(52,199,89,.2); }
.role-commercial { background: rgba(0,113,227,.08); color: #0057b8; border: 1px solid rgba(0,113,227,.15); }
.user-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.pw-input { width: 120px !important; font-size: 13px !important; }
.new-user-form {
  background: var(--raised); border: 1px solid var(--border);
  border-radius: var(--r-lg); padding: 18px; box-shadow: var(--shadow);
}
.new-user-form h3 { font-size: 17px; font-weight: 700; margin-bottom: 16px; letter-spacing: -.02em; }
.user-msg { font-size: 13px; color: #7a4f00; padding: 8px 0; }
.empty-small { font-size: 14px; color: var(--text2); }

/* ── Audit ── */
.audit-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.audit-table th {
  text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border);
  color: var(--text3); font-size: 10px; text-transform: uppercase; letter-spacing: .06em; font-weight: 600;
}
.audit-table td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
.audit-ts { white-space: nowrap; color: var(--text2); font-size: 12px; }
.audit-detail { color: var(--text2); max-width: 300px; word-break: break-word; }
.audit-badge { font-size: 10px; padding: 3px 10px; border-radius: 980px; white-space: nowrap; font-weight: 600; text-transform: uppercase; letter-spacing: .03em; }
.action-status_change { background: rgba(52,199,89,.1); color: #1a7a35; border: 1px solid rgba(52,199,89,.2); }
.action-copy { background: rgba(0,113,227,.08); color: #0057b8; border: 1px solid rgba(0,113,227,.15); }

/* ── Login ── */
.login-screen {
  min-height: 100vh; background: var(--base);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.login-card {
  background: var(--raised); border: 1px solid var(--border);
  border-radius: var(--r-lg); padding: 48px 36px;
  width: 100%; max-width: 380px; text-align: center;
  box-shadow: var(--shadow-lg);
}
.bw-logo { font-size: 44px; margin-bottom: 14px; }
.login-logo { height: 60px; width: auto; margin-bottom: 20px; }
.login-card h1 { font-size: 28px; font-weight: 700; margin-bottom: 6px; letter-spacing: -.03em; color: var(--text); }
.login-subtitle { color: var(--text2); font-size: 14px; margin-bottom: 32px; line-height: 1.5; }
.login-form { text-align: left; display: flex; flex-direction: column; gap: 14px; }
.login-error {
  color: var(--red); font-size: 13px; text-align: center; padding: 10px 14px;
  background: rgba(255,59,48,.06); border-radius: var(--r-sm);
  border: 1px solid rgba(255,59,48,.2);
}

/* ── Forms ── */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 500px) { .form-grid { grid-template-columns: 1fr; } }
.form-field { display: flex; flex-direction: column; gap: 5px; }
.form-field label { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: .06em; font-weight: 600; }
input, select, textarea {
  background: var(--base); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--text); padding: 10px 13px; font-size: 14px;
  font-family: inherit; outline: none; width: 100%;
  transition: border-color .2s, box-shadow .2s;
}
input::placeholder, textarea::placeholder { color: var(--text3); }
input:focus, select:focus, textarea:focus {
  border-color: var(--accent); box-shadow: 0 0 0 3px rgba(232,146,58,.15);
}
textarea { resize: vertical; }
select option { background: var(--raised); color: var(--text); }

/* ── Buttons ── */
.btn-primary {
  background: var(--accent); color: #fff; border: none; border-radius: 980px;
  padding: 12px 32px; font-weight: 600; font-size: 15px; cursor: pointer;
  letter-spacing: -.01em;
  transition: background .15s, transform .1s, box-shadow .15s;
  box-shadow: 0 2px 8px rgba(232,146,58,.3);
  -webkit-tap-highlight-color: transparent;
}
.btn-primary:hover { background: var(--accent-h); box-shadow: 0 4px 16px rgba(232,146,58,.4); }
.btn-primary:active { transform: scale(.97); }
.btn-primary:disabled { opacity: .35; cursor: not-allowed; box-shadow: none; }
.btn-full { width: 100%; }
.btn-ghost {
  background: var(--raised); border: 1px solid var(--border);
  border-radius: 980px; color: var(--text); padding: 10px 24px;
  font-size: 14px; cursor: pointer; font-weight: 600; letter-spacing: -.01em;
  transition: background .15s, border-color .15s, box-shadow .15s;
  -webkit-tap-highlight-color: transparent;
}
.btn-ghost:hover { background: var(--hover); box-shadow: var(--shadow); }
.btn-ghost-sm {
  background: var(--base); border: 1px solid var(--border);
  border-radius: 980px; color: var(--text2); padding: 5px 12px;
  font-size: 12px; cursor: pointer; font-weight: 500; letter-spacing: -.01em;
  transition: background .12s, box-shadow .12s; -webkit-tap-highlight-color: transparent;
}
.btn-ghost-sm:hover { background: var(--hover); color: var(--text); }
.btn-ghost-sm.danger { color: var(--red); border-color: rgba(255,59,48,.25); }
.btn-ghost-sm.danger:hover { background: rgba(255,59,48,.06); border-color: rgba(255,59,48,.4); }
.form-actions { display: flex; gap: 8px; margin-top: 12px; }

/* ── Card base ── */
.card { background: var(--raised); border: 1px solid var(--border); border-radius: var(--r); box-shadow: var(--shadow); }
.empty-state { text-align: center; padding: 56px 16px; color: var(--text2); }
.empty-icon { font-size: 40px; margin-bottom: 14px; opacity: .4; }

/* ── Dark mode component overrides ── */
[data-theme="dark"] .bw-app,
[data-theme="dark"] .login-screen { background: var(--bg); }
@media (prefers-color-scheme: dark) {
  .bw-app, .login-screen, body { background: var(--bg); color: var(--text); }
  .bw-header { background: var(--nav-bg); border-color: var(--border); }
  .nav-btn.active { background: rgba(232,146,58,.15); color: var(--accent); }
  input, select, textarea { background: #111111; border-color: rgba(255,255,255,.12); color: #ffffff; }
  input::placeholder, textarea::placeholder { color: #6e6e73; }
  .task-card { border-color: rgba(255,255,255,.08); }
  .task-card:hover { background: var(--raised); border-color: rgba(255,255,255,.13); }
  .crm-card, .user-row, .day-config, .new-user-form, .login-card, .card { border-color: rgba(255,255,255,.08); }
  .copy-btn { background: #1c1c1e; border-color: rgba(255,255,255,.12); color: var(--text2); }
  .copy-btn.copied { background: rgba(48,209,88,.12); color: #30d158; border-color: rgba(48,209,88,.25); }
  .btn-ghost-sm { background: #1c1c1e; border-color: rgba(255,255,255,.1); color: var(--text2); }
  .progress-pill { background: #1c1c1e; border-color: rgba(255,255,255,.1); }
  .script-text { background: var(--bg); color: var(--text2); }
}
[data-theme="dark"] .login-card { background: var(--base); }
@media (prefers-color-scheme: dark) { .login-card { background: var(--base); } }
[data-theme="dark"] .wa-poll-card { background: #0d1e13; border-color: rgba(48,209,88,.12); }
[data-theme="dark"] .wa-poll-title { color: #30d158; }
[data-theme="dark"] .wa-poll-multi { background: rgba(48,209,88,.1); border-color: rgba(48,209,88,.2); color: #30d158; }
[data-theme="dark"] .wa-poll-question { color: var(--text); }
[data-theme="dark"] .wa-poll-option { background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.06); }
[data-theme="dark"] .wa-poll-option:hover { background: rgba(255,255,255,.06); }
[data-theme="dark"] .wa-poll-dot { border-color: rgba(48,209,88,.5); }
[data-theme="dark"] .wa-poll-opt-text { color: rgba(255,255,255,.88); }
[data-theme="dark"] .wa-poll-note { color: var(--text3); }
[data-theme="dark"] .wa-poll-condition { color: var(--accent); background: rgba(232,146,58,.12); border-color: rgba(232,146,58,.3); }
[data-theme="dark"] .script-text { background: var(--bg); color: var(--text2); }
[data-theme="dark"] .amber-box { color: #f5c842; }
[data-theme="dark"] .today-status-active { background: var(--base); }
[data-theme="dark"] .today-status-waiting { background: linear-gradient(135deg, rgba(232,146,58,.12) 0%, rgba(232,146,58,.04) 100%); }
[data-theme="dark"] .today-progress-bar { background: rgba(255,255,255,.1); }
[data-theme="dark"] .phase-chip.active { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 2px 8px rgba(232,146,58,.3); }
[data-theme="dark"] .phase-chip.active .phase-chip-prog { color: rgba(255,255,255,.8); }
[data-theme="dark"] .ch-group { background: rgba(48,209,88,.1); color: #30d158; border-color: rgba(48,209,88,.2); }
[data-theme="dark"] .ch-private { background: rgba(61,139,200,.12); color: #5aabde; border-color: rgba(61,139,200,.2); }
[data-theme="dark"] .ch-instagram { background: rgba(193,53,132,.12); color: #e1306c; border-color: rgba(193,53,132,.2); }
[data-theme="dark"] .ch-spark { background: rgba(232,146,58,.12); color: #e8923a; border-color: rgba(232,146,58,.25); }
[data-theme="dark"] .role-administrative { background: rgba(48,209,88,.1); color: #30d158; border-color: rgba(48,209,88,.2); }
[data-theme="dark"] .role-commercial { background: rgba(61,139,200,.1); color: #5aabde; border-color: rgba(61,139,200,.2); }
[data-theme="dark"] .action-status_change { background: rgba(48,209,88,.1); color: #30d158; border-color: rgba(48,209,88,.2); }
[data-theme="dark"] .action-copy { background: rgba(61,139,200,.1); color: #5aabde; border-color: rgba(61,139,200,.2); }
[data-theme="dark"] input, [data-theme="dark"] select, [data-theme="dark"] textarea {
  background: #111111; border-color: rgba(255,255,255,.12); color: #ffffff;
}
[data-theme="dark"] input::placeholder, [data-theme="dark"] textarea::placeholder { color: #6e6e73; }
[data-theme="dark"] input:focus, [data-theme="dark"] select:focus, [data-theme="dark"] textarea:focus {
  border-color: var(--accent); box-shadow: 0 0 0 3px rgba(232,146,58,.2);
}
[data-theme="dark"] .task-card { box-shadow: none; border-color: rgba(255,255,255,.08); }
[data-theme="dark"] .task-card:hover { background: var(--raised); box-shadow: none; border-color: rgba(255,255,255,.13); }
[data-theme="dark"] .crm-card { box-shadow: none; border-color: rgba(255,255,255,.08); }
[data-theme="dark"] .user-row { box-shadow: none; border-color: rgba(255,255,255,.08); }
[data-theme="dark"] .day-config { box-shadow: none; border-color: rgba(255,255,255,.08); }
[data-theme="dark"] .new-user-form { border-color: rgba(255,255,255,.08); }
[data-theme="dark"] .login-card { border-color: rgba(255,255,255,.08); }
[data-theme="dark"] .card { border-color: rgba(255,255,255,.08); }
[data-theme="dark"] .section-title { color: var(--text2); }
[data-theme="dark"] .copy-btn { background: #1c1c1e; border-color: rgba(255,255,255,.12); color: var(--text2); }
[data-theme="dark"] .copy-btn:hover { background: #2c2c2e; color: #fff; }
[data-theme="dark"] .copy-btn.copied { background: rgba(48,209,88,.12); color: #30d158; border-color: rgba(48,209,88,.25); }
[data-theme="dark"] .btn-ghost-sm { background: #1c1c1e; border-color: rgba(255,255,255,.1); color: var(--text2); }
[data-theme="dark"] .btn-ghost-sm:hover { background: #2c2c2e; color: #fff; }
[data-theme="dark"] .progress-pill { background: #1c1c1e; border-color: rgba(255,255,255,.1); }
.theme-toggle { font-size: 14px; padding: 4px 8px; }

/* ── Save status ── */
.sync-status { font-size: 11px; font-weight: 700; padding: 2px 5px; border-radius: 4px; }
.sync-status.saving { color: var(--text3); animation: pulse .8s ease-in-out infinite alternate; }
.sync-status.saved { color: var(--green); }
.sync-status.error { color: var(--red); }
@keyframes pulse { to { opacity: .4; } }

/* ── Tablet (≤820px) ── */
@media (max-width: 820px) {
  .day-config-body { grid-template-columns: 1fr 190px; gap: 14px; }
}

/* ── Mobile (≤580px) ── */
@media (max-width: 580px) {
  .bw-header { padding: 0 12px; gap: 6px; }
  .bw-header-left { gap: 6px; }
  .bw-header-right { gap: 4px; }
  .user-pill { display: none; }
  .progress-pill { font-size: 11px; padding: 3px 8px; }
  .bw-main { padding: 10px 10px 48px; }
  .today-status-card { padding: 14px 14px; }
  .task-card { padding: 10px 12px; }
  .task-meta { flex-wrap: wrap; gap: 4px; }
  .task-actions { flex-wrap: wrap; gap: 6px; }
  .wa-poll-card { padding: 12px 12px 10px; }
  .login-card { padding: 28px 16px; margin: 12px; }
  .crm-kanban { grid-template-columns: 1fr; }
  /* day config — stacked single column */
  .day-config { padding: 12px 12px; overflow: hidden; }
  .day-config-body { grid-template-columns: 1fr; gap: 10px; }
  /* day header — stack label + toggle vertically to avoid overflow */
  .day-config-header { flex-direction: column; align-items: flex-start; gap: 6px; margin-bottom: 10px; }
  .day-label { font-size: 14px; }
  /* preview — two bubbles side by side with wrap */
  .day-config-preview { display: flex; flex-direction: row; flex-wrap: wrap; gap: 8px; }
  .day-config-preview .wa-bubble { flex: 1 1 140px; min-width: 0; }
  .preview-label { width: 100%; }
  /* proc row — tighter inputs */
  .proc-row { gap: 5px; }
  .proc-name { min-width: 100px; font-size: 13px; }
  .proc-price, .proc-vagas, .proc-install { min-width: 56px; font-size: 13px; }
  /* script copy button stays visible but compact */
  .script-text { padding: 10px 64px 10px 12px; font-size: 13px; }
  .copy-btn { font-size: 10px; padding: 3px 8px; top: 6px; right: 6px; }
  /* user row */
  .user-row { flex-direction: column; align-items: flex-start; }
  .user-actions { width: 100%; flex-wrap: wrap; }
  .pw-input { flex: 1 1 100px; width: auto !important; min-width: 80px; }
  /* misc */
  .section-title, .config-section h2 { font-size: 16px; }
  .nav-btn { padding: 0 9px; font-size: 12px; }
  /* amber box word wrap */
  .amber-box { word-break: break-word; overflow-wrap: break-word; }
  /* setup sections */
  .setup-section { padding-bottom: 16px; }
  /* form grid single column earlier */
  .form-grid { grid-template-columns: 1fr; }
}

/* ── Very small (≤380px) ── */
@media (max-width: 380px) {
  .bw-logo-img { height: 20px; }
  .btn-ghost-sm { font-size: 11px; padding: 3px 7px; }
  .progress-pill { display: none; }
  .phase-chip { padding: 5px 8px; font-size: 11px; }
  .bw-main { padding: 8px 8px 48px; }
  .proc-name { min-width: 80px; }
  .proc-price, .proc-vagas, .proc-install { min-width: 48px; }
}
`
