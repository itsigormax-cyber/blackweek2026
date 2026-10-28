import { useState, useEffect, useRef, useCallback } from 'react'

let _nid = 1000
const genId = () => 'n' + (++_nid)

const DEFAULT_NODES = [
  { id: 'root', text: 'Black Week 2026', x: 0, y: 0, parentId: null, color: '#E8923A', root: true },
  { id: 'b1', text: '🔧 Pré-campanha', x: -270, y: -130, parentId: 'root', color: '#F472B6' },
  { id: 'b1a', text: 'Configurar ofertas', x: -450, y: -210, parentId: 'b1', color: '#F472B6' },
  { id: 'b1b', text: 'Cadastrar equipe', x: -450, y: -130, parentId: 'b1', color: '#F472B6' },
  { id: 'b1c', text: 'Grupo WhatsApp', x: -450, y: -50, parentId: 'b1', color: '#F472B6' },
  { id: 'b2', text: '🔑 Acesso', x: 0, y: -210, parentId: 'root', color: '#A78BFA' },
  { id: 'b2a', text: 'URL exclusiva', x: -135, y: -320, parentId: 'b2', color: '#A78BFA' },
  { id: 'b2b', text: 'Login por cargo', x: 125, y: -320, parentId: 'b2', color: '#A78BFA' },
  { id: 'b3', text: '📅 Rotina Diária', x: 270, y: -130, parentId: 'root', color: '#34D399' },
  { id: 'b3a', text: 'Ver oferta do dia', x: 450, y: -235, parentId: 'b3', color: '#34D399' },
  { id: 'b3b', text: 'Copiar enquete WA', x: 450, y: -155, parentId: 'b3', color: '#34D399' },
  { id: 'b3c', text: 'Postar Stories', x: 450, y: -75, parentId: 'b3', color: '#34D399' },
  { id: 'b3d', text: 'Registrar vendas', x: 450, y: 5, parentId: 'b3', color: '#34D399' },
  { id: 'b4', text: '👥 Equipe', x: 270, y: 140, parentId: 'root', color: '#38BDF8' },
  { id: 'b4a', text: 'Dono / Admin', x: 450, y: 80, parentId: 'b4', color: '#38BDF8' },
  { id: 'b4b', text: 'Consultora Adm.', x: 450, y: 140, parentId: 'b4', color: '#38BDF8' },
  { id: 'b4c', text: 'Consultora Com.', x: 450, y: 200, parentId: 'b4', color: '#38BDF8' },
  { id: 'b5', text: '📣 Conteúdo', x: 0, y: 210, parentId: 'root', color: '#FB923C' },
  { id: 'b5a', text: 'Enquete WA pronta', x: -155, y: 320, parentId: 'b5', color: '#FB923C' },
  { id: 'b5b', text: 'Story Instagram', x: 5, y: 345, parentId: 'b5', color: '#FB923C' },
  { id: 'b5c', text: 'Preço + parcelas', x: 165, y: 320, parentId: 'b5', color: '#FB923C' },
]

export default function MindMapTab({ mindmap, onMindmapChange }) {
  const [nodes, setNodes] = useState(() => {
    const saved = mindmap?.nodes
    return saved?.length ? saved : DEFAULT_NODES
  })
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(0.85)
  const [selId, setSelId] = useState(null)
  const [editId, setEditId] = useState(null)
  const [editText, setEditText] = useState('')
  const [hovId, setHovId] = useState(null)
  const interRef = useRef(null)
  const nodesRef = useRef(nodes)
  const outerRef = useRef(null)
  const inputRef = useRef(null)
  const saveTimer = useRef(null)
  nodesRef.current = nodes

  useEffect(() => {
    if (!outerRef.current) return
    const r = outerRef.current.getBoundingClientRect()
    setPan({ x: r.width / 2, y: r.height / 2 })
  }, [])

  useEffect(() => {
    if (mindmap?.nodes?.length) setNodes(mindmap.nodes)
  }, [mindmap])

  useEffect(() => {
    if (editId) setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 30)
  }, [editId])

  const pushChange = useCallback((ns) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => onMindmapChange?.({ nodes: ns }), 700)
  }, [onMindmapChange])

  const mutate = useCallback((updater) => {
    setNodes(prev => {
      const next = updater(prev)
      pushChange(next)
      return next
    })
  }, [pushChange])

  // ── operations ────────────────────────────────────────────────────────────
  function addChild(parentId) {
    const parent = nodesRef.current.find(n => n.id === parentId)
    if (!parent) return
    const siblings = nodesRef.current.filter(n => n.parentId === parentId).length
    const dir = parent.x >= 0 ? 1 : -1
    const id = genId()
    const child = {
      id,
      text: 'Nova ideia',
      x: parent.x + dir * 165,
      y: parent.y + (siblings - Math.max(0, siblings - 1) / 2) * 65,
      parentId,
      color: parent.color,
    }
    mutate(prev => [...prev, child])
    setSelId(id)
    setEditId(id)
    setEditText('Nova ideia')
  }

  function deleteNode(nodeId) {
    if (nodeId === 'root') return
    const toDelete = new Set()
    const q = [nodeId]
    while (q.length) {
      const id = q.pop()
      toDelete.add(id)
      nodesRef.current.forEach(n => { if (n.parentId === id) q.push(n.id) })
    }
    mutate(prev => prev.filter(n => !toDelete.has(n.id)))
    if (selId && toDelete.has(selId)) setSelId(null)
  }

  function commitEdit() {
    if (!editId) return
    const text = editText.trim() || 'Nó'
    mutate(prev => prev.map(n => n.id === editId ? { ...n, text } : n))
    setEditId(null)
  }

  // ── mouse ─────────────────────────────────────────────────────────────────
  function onOuterDown(e) {
    if (editId) { commitEdit(); return }
    const cls = e.target.classList
    if (!cls.contains('mm-outer') && !cls.contains('mm-bg')) return
    setSelId(null)
    interRef.current = { type: 'pan', sx: e.clientX - pan.x, sy: e.clientY - pan.y }
  }

  function onNodeDown(e, nodeId) {
    e.stopPropagation()
    if (editId === nodeId) return
    if (editId) commitEdit()
    setSelId(nodeId)
    const node = nodesRef.current.find(n => n.id === nodeId)
    if (!node) return
    interRef.current = {
      type: 'drag', nodeId,
      sx: e.clientX, sy: e.clientY,
      ox: node.x, oy: node.y,
      moved: false,
    }
    e.preventDefault()
  }

  function onMove(e) {
    const it = interRef.current
    if (!it) return
    if (it.type === 'pan') {
      setPan({ x: e.clientX - it.sx, y: e.clientY - it.sy })
    } else if (it.type === 'drag') {
      const dx = (e.clientX - it.sx) / scale
      const dy = (e.clientY - it.sy) / scale
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) it.moved = true
      if (it.moved) {
        setNodes(prev => prev.map(n =>
          n.id === it.nodeId ? { ...n, x: it.ox + dx, y: it.oy + dy } : n
        ))
      }
    }
  }

  function onUp() {
    if (interRef.current?.type === 'drag' && interRef.current.moved) {
      pushChange(nodesRef.current)
    }
    interRef.current = null
  }

  function onWheel(e) {
    e.preventDefault()
    const f = e.deltaY < 0 ? 1.12 : 0.9
    const rect = outerRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    setPan(p => ({ x: mx + (p.x - mx) * f, y: my + (p.y - my) * f }))
    setScale(s => Math.max(0.18, Math.min(3, s * f)))
  }

  const touchRef = useRef({})
  function onTouchStart(e) {
    [...e.changedTouches].forEach(t => { touchRef.current[t.identifier] = { x: t.clientX, y: t.clientY } })
  }
  function onTouchMove(e) {
    e.preventDefault()
    if (e.touches.length === 1) {
      const t = e.touches[0], prev = touchRef.current[t.identifier]
      if (prev) setPan(p => ({ x: p.x + t.clientX - prev.x, y: p.y + t.clientY - prev.y }))
      touchRef.current[t.identifier] = { x: t.clientX, y: t.clientY }
    } else if (e.touches.length === 2) {
      const [a, b] = e.touches
      const pa = touchRef.current[a.identifier], pb = touchRef.current[b.identifier]
      if (pa && pb) {
        const d0 = Math.hypot(pa.x - pb.x, pa.y - pb.y)
        const d1 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
        const f = d1 / (d0 || 1)
        const rect = outerRef.current.getBoundingClientRect()
        const mx = (a.clientX + b.clientX) / 2 - rect.left
        const my = (a.clientY + b.clientY) / 2 - rect.top
        setPan(p => ({ x: mx + (p.x - mx) * f, y: my + (p.y - my) * f }))
        setScale(s => Math.max(0.18, Math.min(3, s * f)))
      }
      touchRef.current[a.identifier] = { x: a.clientX, y: a.clientY }
      touchRef.current[b.identifier] = { x: b.clientX, y: b.clientY }
    }
  }
  function onTouchEnd(e) {
    [...e.changedTouches].forEach(t => delete touchRef.current[t.identifier])
  }

  function center() {
    const r = outerRef.current?.getBoundingClientRect()
    if (r) { setPan({ x: r.width / 2, y: r.height / 2 }); setScale(0.85) }
  }

  // ── edges ─────────────────────────────────────────────────────────────────
  const edges = nodes.filter(n => n.parentId).map(n => {
    const p = nodes.find(x => x.id === n.parentId)
    if (!p) return null
    const mx = (p.x + n.x) / 2
    const isSel = selId === n.id || selId === n.parentId
    return (
      <path
        key={n.id}
        d={`M${p.x},${p.y} C${mx},${p.y} ${mx},${n.y} ${n.x},${n.y}`}
        fill="none"
        stroke={n.color}
        strokeWidth={isSel ? 2.5 : 1.8}
        strokeOpacity={isSel ? 0.85 : 0.35}
        strokeLinecap="round"
      />
    )
  })

  const tr = `translate(${pan.x}px,${pan.y}px) scale(${scale})`

  return (
    <div
      ref={outerRef}
      className="mm-outer"
      onMouseDown={onOuterDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* dot grid background */}
      <div className="mm-bg" />

      <div style={{ position: 'absolute', inset: 0, overflow: 'visible', transformOrigin: '0 0', transform: tr }}>
        <svg
          style={{ position: 'absolute', left: -5000, top: -5000, width: 10000, height: 10000, pointerEvents: 'none', overflow: 'visible' }}
          viewBox="-5000 -5000 10000 10000"
        >
          {edges}
        </svg>

        {nodes.map(node => {
          const isSel = selId === node.id
          const isEdit = editId === node.id
          const isHov = hovId === node.id
          return (
            <div
              key={node.id}
              className={`mm-node${node.root ? ' mm-root' : ''}${isSel ? ' mm-sel' : isHov ? ' mm-hov' : ''}`}
              style={{ left: node.x, top: node.y, '--nc': node.color }}
              onMouseDown={e => onNodeDown(e, node.id)}
              onMouseEnter={() => setHovId(node.id)}
              onMouseLeave={() => setHovId(null)}
              onDoubleClick={e => { e.stopPropagation(); if (!isEdit) { setEditId(node.id); setEditText(node.text) } }}
            >
              {isEdit ? (
                <textarea
                  ref={inputRef}
                  className="mm-ta"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
                    if (e.key === 'Escape') setEditId(null)
                  }}
                  rows={2}
                />
              ) : (
                <span className="mm-label">{node.text}</span>
              )}

              {(isSel || isHov) && !isEdit && (
                <div className="mm-acts">
                  <button
                    className="mm-act"
                    title="Adicionar filho"
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); addChild(node.id) }}
                  >+</button>
                  {!node.root && (
                    <button
                      className="mm-act mm-act-del"
                      title="Excluir ramo"
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); deleteNode(node.id) }}
                    >×</button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mm-controls">
        <button className="mm-ctrl-btn" onClick={() => setScale(s => Math.min(3, s * 1.15))}>+</button>
        <div className="mm-ctrl-sep" />
        <button className="mm-ctrl-btn" onClick={() => setScale(s => Math.max(0.18, s * 0.87))}>−</button>
        <div className="mm-ctrl-sep" />
        <button className="mm-ctrl-btn" title="Centralizar" onClick={center}>⌖</button>
      </div>

      <div className="mm-tip">Duplo clique para editar · + para adicionar filho · Arraste para mover</div>
    </div>
  )
}
