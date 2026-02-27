import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const C = {
  bg: '#080d1a', surface: 'rgba(255,255,255,0.05)', surface2: 'rgba(255,255,255,0.09)',
  border: 'rgba(255,255,255,0.09)', border2: 'rgba(255,255,255,0.17)',
  text: '#eef2ff', text2: 'rgba(238,242,255,0.52)', text3: 'rgba(238,242,255,0.28)',
  green: '#5ef0b0', blue: '#60a5fa', purple: '#c084fc', red: '#f87171', amber: '#fbbf24'
}

const RATE = 4500

// ── Helpers ─────────────────────────────────────────────────────────
function fmtMonto(n, currency) {
  const abs = Math.abs(Math.round(currency === 'USD' ? n / RATE : n))
  const sign = n >= 0 ? '+' : '-'
  return sign + '$' + abs.toLocaleString(currency === 'USD' ? 'en-US' : 'es-CO')
}

function fmtFull(n, currency) {
  const abs = Math.abs(Math.round(currency === 'USD' ? n / RATE : n))
  return '$' + abs.toLocaleString(currency === 'USD' ? 'en-US' : 'es-CO')
}

function getCycleInfo(diaInicio, duracion) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  let start = new Date(year, month, diaInicio)
  if (now < start) start = new Date(year, month - 1, diaInicio)
  const end = new Date(start)
  end.setDate(end.getDate() + duracion - 1)
  const diasRestantes = Math.max(0, Math.floor((end - now) / 86400000))
  const diasTranscurridos = Math.floor((now - start) / 86400000) + 1
  return { start, end, diasRestantes, diasTranscurridos, duracion }
}

function labelFecha(fechaStr) {
  const hoy = new Date().toISOString().split('T')[0]
  const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (fechaStr === hoy) return 'Hoy'
  if (fechaStr === ayer) return 'Ayer'
  const d = new Date(fechaStr + 'T12:00:00')
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
}

function Toast({ msg }) {
  return msg ? (
    <div style={{ position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)', background: 'rgba(12,18,32,.97)', border: `1px solid ${C.border2}`, borderRadius: 26, padding: '10px 18px', fontSize: 12, color: C.text, backdropFilter: 'blur(20px)', zIndex: 999, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.blue }} />{msg}
    </div>
  ) : null
}

// ── Gráfica de barras ────────────────────────────────────────────────
function BarChart({ movimientos, currency }) {
  const [activeDay, setActiveDay] = useState(null)

  const chartData = useMemo(() => {
    const byDay = {}
    movimientos.forEach(m => {
      if (!byDay[m.fecha]) byDay[m.fecha] = { g: 0, i: 0 }
      const monto = Math.abs(Number(m.monto_cop))
      if (m._tipo === 'gasto') byDay[m.fecha].g += monto
      else byDay[m.fecha].i += monto
    })
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).slice(-10).map(([fecha, vals]) => ({
      fecha,
      lbl: new Date(fecha + 'T12:00').getDate(),
      ...vals
    }))
  }, [movimientos])

  const maxVal = Math.max(...chartData.map(d => Math.max(d.g, d.i)), 1)
  const HEIGHT = 66

  if (chartData.length === 0) return null

  const active = activeDay ?? chartData[chartData.length - 1]?.fecha

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Tooltip */}
      <div style={{ height: 22, display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
        {active && (() => {
          const d = chartData.find(x => x.fecha === active)
          if (!d) return null
          const parts = []
          if (d.i > 0) parts.push(`💰 +${fmtFull(d.i, currency)}`)
          if (d.g > 0) parts.push(`💸 -${fmtFull(d.g, currency)}`)
          return (
            <div style={{ fontSize: 10, padding: '2px 9px', borderRadius: 20, background: C.surface2, border: `1px solid ${C.border2}`, color: C.text, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {labelFecha(active)} · {parts.length ? parts.join('  ') : 'Sin movimientos'}
            </div>
          )
        })()}
      </div>
      {/* Bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: HEIGHT }}>
        {chartData.map(d => {
          const gH = Math.round((d.g / maxVal) * HEIGHT)
          const iH = Math.round((d.i / maxVal) * HEIGHT)
          const isActive = d.fecha === active
          return (
            <div key={d.fecha} onClick={() => setActiveDay(d.fecha)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: HEIGHT - 16, gap: 2 }}>
                {d.i > 0 && <div style={{ borderRadius: '4px 4px 0 0', background: C.green, width: '68%', height: iH, opacity: isActive ? 1 : 0.6, boxShadow: isActive ? `0 0 8px rgba(94,240,176,0.4)` : 'none', transition: 'all .2s' }} />}
                {d.g > 0 ? <div style={{ borderRadius: '4px 4px 0 0', background: C.red, width: '68%', height: gH, opacity: isActive ? 1 : 0.6, boxShadow: isActive ? `0 0 8px rgba(248,113,113,0.4)` : 'none', transition: 'all .2s' }} /> : <div style={{ height: 3, width: '68%', borderRadius: 3, background: 'rgba(255,255,255,0.06)' }} />}
              </div>
              <span style={{ fontSize: 9, color: isActive ? C.text2 : C.text3, marginTop: 2 }}>{d.lbl}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Fila de transacción ──────────────────────────────────────────────
function TxRow({ m, currency }) {
  const [open, setOpen] = useState(false)
  const esIngreso = m._tipo === 'ingreso'
  const monto = Number(m.monto_cop)
  const color = esIngreso ? C.green : m._tipo === 'deuda' ? C.amber : C.red
  const borderColor = esIngreso ? C.green : m._tipo === 'deuda' ? C.amber : C.red
  const bgIco = esIngreso ? 'rgba(94,240,176,0.14)' : 'rgba(248,113,113,0.14)'
  const emoji = m._emoji || (esIngreso ? '💸' : '💳')

  return (
    <div style={{ marginBottom: 6, background: C.surface, border: `1px solid ${open ? C.border2 : C.border}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color .2s' }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', cursor: 'pointer', position: 'relative' }}>
        {/* barra lateral coloreada */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: '3px 0 0 3px', background: borderColor }} />
        <div style={{ width: 34, height: 34, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, background: bgIco }}>{emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.nombre}</div>
          <div style={{ fontSize: 10.5, color: C.text2, marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>{m._catNombre || (esIngreso ? 'Ingreso' : 'Gasto')}</span>
            {m.hogar_id && <span style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 8, background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.18)', color: C.purple }}>🏠 Hogar</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color }}>{fmtMonto(monto, currency)}</div>
          <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>{m.hora?.slice(0, 5) || ''}</div>
        </div>
      </div>
      {open && (
        <div style={{ padding: '9px 13px 11px', borderTop: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.15)' }}>
          {[
            ['Tipo', esIngreso ? 'Ingreso' : 'Gasto'],
            m.fuente_trabajo ? ['Fuente', m.fuente_trabajo] : null,
            m.notas ? ['Notas', m.notas] : null,
            ['≈ USD', `$${Math.round(Math.abs(monto) / RATE).toLocaleString('en-US')}`],
          ].filter(Boolean).map(([lbl, val]) => (
            <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
              <span style={{ color: C.text3 }}>{lbl}</span>
              <span style={{ color: C.blue, fontWeight: 500 }}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Pantalla principal ───────────────────────────────────────────────
export default function Movimientos() {
  const navigate = useNavigate()
  const [perfil, setPerfil] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [currency, setCurrency] = useState('COP')
  const [filtro, setFiltro] = useState('all')
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2600) }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const { data: p } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
      setPerfil(p)

      const ciclo = getCycleInfo(p?.ciclo_dia_inicio || 1, p?.ciclo_duracion_dias || 30)
      const desde = ciclo.start.toISOString().split('T')[0]
      const hasta = ciclo.end.toISOString().split('T')[0]

      const [{ data: gastos }, { data: ingresos }] = await Promise.all([
        supabase.from('gastos').select('*').eq('usuario_id', user.id).gte('fecha', desde).lte('fecha', hasta).order('fecha', { ascending: false }).order('hora', { ascending: false }),
        supabase.from('ingresos').select('*').eq('usuario_id', user.id).gte('fecha', desde).lte('fecha', hasta).order('fecha', { ascending: false }),
      ])

      const todos = [
        ...(gastos || []).map(g => ({ ...g, _tipo: 'gasto', _emoji: '💳', _catNombre: 'Gasto' })),
        ...(ingresos || []).map(i => ({ ...i, _tipo: 'ingreso', _emoji: '💸', _catNombre: 'Ingreso' })),
      ].sort((a, b) => {
        const da = new Date(a.fecha + 'T' + (a.hora || '00:00'))
        const db = new Date(b.fecha + 'T' + (b.hora || '00:00'))
        return db - da
      })

      setMovimientos(todos)
      setLoading(false)
    }
    init()
  }, [navigate])

  const filtrados = useMemo(() => {
    return movimientos.filter(m => {
      if (filtro === 'gasto' && m._tipo !== 'gasto') return false
      if (filtro === 'ingreso' && m._tipo !== 'ingreso') return false
      if (filtro === 'hogar' && !m.hogar_id) return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        if (!m.nombre?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [movimientos, filtro, busqueda])

  // Agrupar por fecha
  const porFecha = useMemo(() => {
    const groups = {}
    filtrados.forEach(m => {
      if (!groups[m.fecha]) groups[m.fecha] = []
      groups[m.fecha].push(m)
    })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filtrados])

  const totalIngresos = movimientos.filter(m => m._tipo === 'ingreso').reduce((s, m) => s + Math.abs(Number(m.monto_cop)), 0)
  const totalGastos = movimientos.filter(m => m._tipo === 'gasto').reduce((s, m) => s + Math.abs(Number(m.monto_cop)), 0)
  const saldo = totalIngresos - totalGastos

  const ciclo = getCycleInfo(perfil?.ciclo_dia_inicio || 1, perfil?.ciclo_duracion_dias || 30)
  const formatCiclo = (d) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  const nombre = perfil?.nombre || '—'
  const fotoUrl = perfil?.foto_url || null
  const avatar = perfil?.avatar_emoji || '👤'

  const FILTROS = [
    { key: 'all', label: 'Todos', color: C.blue, bg: 'rgba(96,165,250,0.14)', border: 'rgba(96,165,250,0.3)' },
    { key: 'gasto', label: '💸 Gastos', color: C.red, bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.28)' },
    { key: 'ingreso', label: '💰 Ingresos', color: C.green, bg: 'rgba(94,240,176,0.12)', border: 'rgba(94,240,176,0.28)' },
    { key: 'hogar', label: '🏠 Hogar', color: C.purple, bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.28)' },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, fontFamily: 'DM Sans, sans-serif' }}>Cargando...</div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap'); * { box-sizing: border-box; } ::-webkit-scrollbar { display: none; } input::placeholder { color: rgba(238,242,255,0.28); }`}</style>
      <Toast msg={toast} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 52, padding: '40px 20px', minHeight: '100vh' }}>

        {/* ══════════════ MOBILE ══════════════ */}
        <div style={{ width: 390, flexShrink: 0, position: 'relative', borderRadius: 48, border: `1.5px solid ${C.border2}`, background: 'rgba(8,13,26,0.72)', backdropFilter: 'blur(40px)', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.65)', display: 'flex', flexDirection: 'column', minHeight: 844 }}>
          {/* Status bar */}
          <div style={{ padding: '14px 28px 0', display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}><span>9:41</span><div style={{ display: 'flex', gap: 5 }}><span>●●●</span><span>WiFi</span><span>🔋</span></div></div>
          <div style={{ width: 118, height: 32, background: '#000', borderRadius: '0 0 20px 20px', margin: '6px auto 0' }} />

          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>
            {/* Topbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 10px' }}>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, letterSpacing: '-.02em' }}>Movimientos</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 11, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => showToast(`📅 ${formatCiclo(ciclo.start)} → ${formatCiclo(ciclo.end)} · ${ciclo.diasRestantes} días restantes`)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                </div>
              </div>
            </div>

            {/* Currency + ciclo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 12px' }}>
              <div style={{ display: 'flex', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 3, gap: 2 }}>
                {['COP', 'USD'].map(c => (
                  <div key={c} onClick={() => setCurrency(c)} style={{ padding: '4px 11px', borderRadius: 15, fontSize: 10.5, fontWeight: 600, cursor: 'pointer', color: currency === c ? C.text : C.text2, background: currency === c ? 'rgba(255,255,255,0.11)' : 'transparent', transition: 'all .2s' }}>{c}</div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, fontSize: 11, color: C.text2, cursor: 'pointer' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
                {formatCiclo(ciclo.start)} → {formatCiclo(ciclo.end)}
              </div>
            </div>

            {/* Balance card */}
            <div style={{ margin: '0 18px 14px', padding: '16px 18px', borderRadius: 22, background: 'linear-gradient(135deg,rgba(96,165,250,0.16),rgba(94,240,176,0.09))', border: '1px solid rgba(96,165,250,0.18)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 10, color: C.text2, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>Saldo del ciclo</div>
                  <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 32, letterSpacing: '-.03em', lineHeight: 1 }}>{fmtFull(saldo, currency)}</div>
                  <div style={{ fontSize: 10.5, color: saldo >= 0 ? C.green : C.red, marginTop: 3 }}>{saldo >= 0 ? '↑' : '↓'} {ciclo.diasRestantes} días restantes</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: C.text3 }}>Día {ciclo.diasTranscurridos} de {ciclo.duracion}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.amber }}>{ciclo.diasRestantes}</div>
                  <div style={{ fontSize: 9, color: C.text3 }}>días restantes</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                {[['Ingresos', totalIngresos, C.green], ['Gastos', -totalGastos, C.red]].map(([lbl, val, color]) => (
                  <div key={lbl} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 11, padding: '10px 12px' }}>
                    <div style={{ fontSize: 9.5, color: C.text2, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{lbl}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color }}>{fmtFull(val, currency)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gráfica */}
            <div style={{ margin: '0 18px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Gasto diario</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['Ingresos', C.green], ['Gastos', C.red]].map(([lbl, color]) => (
                    <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.text2 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />{lbl}
                    </div>
                  ))}
                </div>
              </div>
              <BarChart movimientos={movimientos} currency={currency} />
            </div>

            {/* Búsqueda */}
            <div style={{ padding: '0 18px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: C.text3, flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar movimiento…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13 }} />
                {busqueda && <span onClick={() => setBusqueda('')} style={{ fontSize: 16, color: C.text3, cursor: 'pointer', lineHeight: 1 }}>×</span>}
              </div>
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: 6, padding: '0 18px 12px', overflowX: 'auto' }}>
              {FILTROS.map(f => {
                const active = filtro === f.key
                return (
                  <div key={f.key} onClick={() => setFiltro(f.key)} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', border: `1px solid ${active ? f.border : C.border}`, background: active ? f.bg : C.surface, color: active ? f.color : C.text2, transition: 'all .2s' }}>
                    {f.label}
                  </div>
                )
              })}
            </div>

            {/* Lista de transacciones agrupada por día */}
            <div style={{ padding: '0 18px' }}>
              {porFecha.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '40px 20px', textAlign: 'center' }}>
                  <span style={{ fontSize: 40, opacity: .4 }}>🔍</span>
                  <div style={{ fontSize: 14, color: C.text2 }}>Sin resultados</div>
                  <div style={{ fontSize: 12, color: C.text3 }}>Probá con otro filtro o búsqueda</div>
                </div>
              ) : porFecha.map(([fecha, txs]) => {
                const dayTotal = txs.reduce((s, m) => {
                  const val = Math.abs(Number(m.monto_cop))
                  return s + (m._tipo === 'ingreso' ? val : -val)
                }, 0)
                return (
                  <div key={fecha} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.text2, textTransform: 'uppercase', letterSpacing: '.06em' }}>{labelFecha(fecha)}</span>
                      <span style={{ fontSize: 11, color: dayTotal >= 0 ? C.green : C.red, opacity: .7 }}>{fmtMonto(dayTotal, currency)}</span>
                    </div>
                    {txs.map(m => <TxRow key={m.id} m={m} currency={currency} />)}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom nav */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'rgba(8,13,26,0.88)', backdropFilter: 'blur(30px)', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 10, zIndex: 10 }}>
            <div onClick={() => navigate('/home')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 12px', color: C.text3 }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
              <span style={{ fontSize: 9.5 }}>Inicio</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 12px', color: C.blue }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <span style={{ fontSize: 9.5 }}>Gastos</span>
            </div>
            <div onClick={() => navigate('/agregar')} style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginTop: -8, boxShadow: '0 6px 18px rgba(94,240,176,0.25)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#080d1a" strokeWidth="2.5" width="20" height="20"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <div onClick={() => navigate('/plan')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 12px', color: C.text3 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              <span style={{ fontSize: 9.5 }}>Plan</span>
            </div>
            <div onClick={() => navigate('/hogar')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 12px', color: C.text3 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span style={{ fontSize: 9.5 }}>Hogar</span>
            </div>
          </div>
        </div>

        {/* ══════════════ DESKTOP ══════════════ */}
        <div style={{ display: 'none', width: 500, flexDirection: 'column', gap: 13 }} className="desktop-panel">

          {/* Top nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4 }}>
            <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 21, background: `linear-gradient(135deg, #eef2ff, ${C.blue})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Clara</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['Inicio', '/home', false], ['Movimientos', '/movimientos', true], ['Plan', '/plan', false], ['Hogar', '/hogar', false]].map(([label, to, active]) => (
                <button key={label} onClick={() => navigate(to)} style={{ padding: '7px 13px', borderRadius: 10, fontSize: 12, color: active ? C.blue : C.text2, cursor: 'pointer', border: active ? `1px solid rgba(96,165,250,0.2)` : 'none', background: active ? 'rgba(96,165,250,0.07)' : 'none', fontFamily: 'DM Sans, sans-serif' }}>{label}</button>
              ))}
            </div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, overflow: 'hidden', cursor: 'pointer' }} onClick={() => navigate('/perfil')}>
              {fotoUrl ? <img src={fotoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatar}
            </div>
          </div>

          {/* Balance hero */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '18px 20px', background: 'linear-gradient(135deg,rgba(96,165,250,0.16),rgba(94,240,176,0.09))', borderColor: 'rgba(96,165,250,0.2)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: C.text2, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3 }}>
                  Ciclo {formatCiclo(ciclo.start)} → {formatCiclo(ciclo.end)}
                </div>
                <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 42, letterSpacing: '-.03em', lineHeight: 1 }}>{fmtFull(saldo, currency)}</div>
                <div style={{ fontSize: 11, color: C.green, marginTop: 3 }}>↑ Saldo disponible del ciclo</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.22)', border: `1px solid ${C.border}`, borderRadius: 20, padding: 3, gap: 2 }}>
                  {['COP', 'USD'].map(c => (
                    <div key={c} onClick={() => setCurrency(c)} style={{ padding: '4px 11px', borderRadius: 15, fontSize: 10.5, fontWeight: 600, cursor: 'pointer', color: currency === c ? C.text : C.text2, background: currency === c ? 'rgba(255,255,255,0.11)' : 'transparent' }}>{c}</div>
                  ))}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: C.text3 }}>Día {ciclo.diasTranscurridos} de {ciclo.duracion}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.amber }}>{ciclo.diasRestantes}</div>
                  <div style={{ fontSize: 9, color: C.text3 }}>días restantes</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              {[['Ingresos', totalIngresos, C.green], ['Gastos', totalGastos, C.red]].map(([lbl, val, color]) => (
                <div key={lbl} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 11, padding: '11px 13px' }}>
                  <div style={{ fontSize: 9.5, color: C.text2, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{lbl}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color }}>{fmtFull(val, currency)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfica desktop */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: C.text3 }}>Gasto diario · ciclo actual</span>
              <div style={{ display: 'flex', gap: 10 }}>
                {[['Ingresos', C.green], ['Gastos', C.red]].map(([lbl, color]) => (
                  <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.text2 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />{lbl}
                  </div>
                ))}
              </div>
            </div>
            <BarChart movimientos={movimientos} currency={currency} />
          </div>

          {/* Search + filtros desktop */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '14px 16px' }}>
            <div style={{ display: 'flex', gap: 9, marginBottom: 11 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 14 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: C.text3 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar movimiento…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FILTROS.map(f => {
                const active = filtro === f.key
                return (
                  <div key={f.key} onClick={() => setFiltro(f.key)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', border: `1px solid ${active ? f.border : C.border}`, background: active ? f.bg : C.surface, color: active ? f.color : C.text2 }}>
                    {f.label}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Lista desktop */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {porFecha.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: C.text2 }}>Sin resultados</div>
            ) : porFecha.map(([fecha, txs]) => {
              const dayTotal = txs.reduce((s, m) => {
                const val = Math.abs(Number(m.monto_cop))
                return s + (m._tipo === 'ingreso' ? val : -val)
              }, 0)
              return (
                <div key={fecha} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.text2, textTransform: 'uppercase', letterSpacing: '.06em' }}>{labelFecha(fecha)}</span>
                    <span style={{ fontSize: 11, color: dayTotal >= 0 ? C.green : C.red, opacity: .7 }}>{fmtMonto(dayTotal, currency)}</span>
                  </div>
                  {txs.map(m => <TxRow key={m.id} m={m} currency={currency} />)}
                </div>
              )
            })}
          </div>

        </div>
      </div>

      <style>{`
        @media (min-width: 900px) { .desktop-panel { display: flex !important; } }
        @media (max-width: 440px) { .phone { width: 100vw !important; min-height: 100vh !important; border-radius: 0 !important; border: none !important; } }
      `}</style>
    </div>
  )
}