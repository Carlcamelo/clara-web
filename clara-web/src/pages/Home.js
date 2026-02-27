import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'

// ── Colores y estilos base ──────────────────────────────────────────
const C = {
  bg: '#080d1a', bg2: '#0c1220',
  surface: 'rgba(255,255,255,0.05)', surface2: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.09)', border2: 'rgba(255,255,255,0.16)',
  text: '#eef2ff', text2: 'rgba(238,242,255,0.52)', text3: 'rgba(238,242,255,0.28)',
  green: '#5ef0b0', blue: '#60a5fa', purple: '#c084fc',
  red: '#f87171', amber: '#fbbf24'
}

// ── Helpers ─────────────────────────────────────────────────────────
function fmt(n, currency = 'COP', rate = 4500) {
  if (currency === 'USD') {
    const usd = Math.round(n / rate)
    return (usd >= 0 ? '+' : '') + '$' + Math.abs(usd).toLocaleString('en-US')
  }
  const abs = Math.abs(Math.round(n))
  const sign = n < 0 ? '-' : n > 0 ? '+' : ''
  if (abs >= 1000000) return sign + '$' + (abs / 1000000).toFixed(1).replace('.0', '') + 'M'
  return sign + '$' + abs.toLocaleString('es-CO')
}

function fmtFull(n, currency = 'COP', rate = 4500) {
  if (currency === 'USD') {
    const usd = Math.round(Math.abs(n) / rate)
    return '$' + usd.toLocaleString('en-US')
  }
  return '$' + Math.abs(Math.round(n)).toLocaleString('es-CO')
}

function timeAgo(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

function getCycleInfo(diaInicio, duracion) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  let start = new Date(year, month, diaInicio)
  if (now < start) start = new Date(year, month - 1, diaInicio)
  const end = new Date(start)
  end.setDate(end.getDate() + duracion - 1)
  const diasTranscurridos = Math.floor((now - start) / 86400000) + 1
  const diasRestantes = Math.max(0, Math.floor((end - now) / 86400000))
  const pct = Math.min(100, Math.round((diasTranscurridos / duracion) * 100))
  return { start, end, diasTranscurridos, diasRestantes, duracion, pct }
}

// ── Componentes pequeños ─────────────────────────────────────────────
function Orbs() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {[
        { w: 600, h: 600, color: C.blue, top: -160, left: -160 },
        { w: 450, h: 450, color: C.purple, top: '35%', right: -140 },
        { w: 400, h: 400, color: C.green, bottom: -100, left: '18%' },
      ].map((o, i) => (
        <div key={i} style={{
          position: 'absolute', borderRadius: '50%',
          filter: 'blur(90px)', opacity: 0.14,
          width: o.w, height: o.h,
          background: o.color,
          top: o.top, left: o.left, right: o.right, bottom: o.bottom,
        }} />
      ))}
    </div>
  )
}

function Toast({ msg }) {
  return msg ? (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(12,18,32,0.96)', border: `1px solid ${C.border2}`,
      borderRadius: 28, padding: '11px 20px', fontSize: 12.5, color: C.text,
      backdropFilter: 'blur(20px)', zIndex: 999, display: 'flex',
      alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
      animation: 'fadeUp .3s ease'
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
      {msg}
    </div>
  ) : null
}

function CurrencyToggle({ currency, onChange, desktop }) {
  const s = (active) => ({
    flex: desktop ? undefined : 1,
    padding: desktop ? '5px 12px' : '7px',
    borderRadius: desktop ? 7 : 9,
    textAlign: 'center', fontSize: 12, fontWeight: 500, cursor: 'pointer',
    transition: 'all .25s',
    color: active ? C.text : C.text2,
    background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
    border: active ? `1px solid ${C.border2}` : '1px solid transparent',
  })
  return (
    <div style={{
      display: 'flex',
      background: desktop ? 'rgba(0,0,0,0.2)' : C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: desktop ? 10 : 12,
      padding: 3, gap: 2,
      margin: desktop ? 0 : '0 16px 16px',
    }}>
      <div style={s(currency === 'COP')} onClick={() => onChange('COP')}>🇨🇴 COP</div>
      <div style={s(currency === 'USD')} onClick={() => onChange('USD')}>🇺🇸 USD</div>
    </div>
  )
}

function BudgetBar({ emoji, label, pct, usado, total, color, currency }) {
  const usadoPct = total > 0 ? Math.min(100, Math.round((Math.abs(usado) / total) * 100)) : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 500 }}>
          <span style={{ fontSize: 14 }}>{emoji}</span>
          {label}
          <span style={{ fontSize: 10, color: C.text3 }}>{pct}%</span>
        </div>
        <div style={{ fontSize: 11, color: C.text2 }}>
          {fmtFull(usado, currency)} / {fmtFull(total, currency)}
        </div>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${usadoPct}%`, borderRadius: 3, background: color, transition: 'width .7s ease' }} />
      </div>
    </div>
  )
}

// ── Pantalla principal ───────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [gastos, setGastos] = useState([])
  const [ingresos, setIngresos] = useState([])
  const [currency, setCurrency] = useState('COP')
  const [toast, setToast] = useState('')
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const RATE = 4500

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }

  useEffect(() => {
    async function cargarDatos() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      setUser(user)

      // Perfil
      const { data: p } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single()
      setPerfil(p)

      const diaInicio = p?.ciclo_dia_inicio || 1
      const duracion = p?.ciclo_duracion_dias || 30
      const ciclo = getCycleInfo(diaInicio, duracion)
      const desde = ciclo.start.toISOString().split('T')[0]
      const hasta = ciclo.end.toISOString().split('T')[0]

      // Gastos del ciclo
      const { data: g } = await supabase
        .from('gastos')
        .select('*')
        .eq('usuario_id', user.id)
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })
      setGastos(g || [])

      // Ingresos del ciclo
      const { data: i } = await supabase
        .from('ingresos')
        .select('*')
        .eq('usuario_id', user.id)
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('fecha', { ascending: false })
      setIngresos(i || [])

      setLoading(false)
    }
    cargarDatos()
  }, [navigate, location])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, fontFamily: 'DM Sans, sans-serif' }}>
      Cargando...
    </div>
  )

  const diaInicio = perfil?.ciclo_dia_inicio || 1
  const duracion = perfil?.ciclo_duracion_dias || 30
  const ciclo = getCycleInfo(diaInicio, duracion)

  const totalIngresos = ingresos.reduce((s, i) => s + Number(i.monto_cop), 0)
  const totalGastos = gastos.reduce((s, g) => s + Math.abs(Number(g.monto_cop)), 0)
  const saldo = totalIngresos - totalGastos

  // Presupuesto 50/30/20
  const presNecesidades = (perfil?.presupuesto_necesidades_pct || 50) / 100
  const presDeseos = (perfil?.presupuesto_deseos_pct || 30) / 100
  const presAhorro = (perfil?.presupuesto_ahorro_pct || 20) / 100

  // Ultimos movimientos combinados
  const movimientos = [
    ...gastos.map(g => ({ ...g, _tipo: 'gasto' })),
    ...ingresos.map(i => ({ ...i, _tipo: 'ingreso' }))
  ].sort((a, b) => {
    const da = new Date(a.fecha + 'T' + (a.hora || '00:00'))
    const db = new Date(b.fecha + 'T' + (b.hora || '00:00'))
    return db - da
  }).slice(0, 5)

  const nombre = perfil?.nombre || user?.email?.split('@')[0] || 'tú'
  const fotoUrl = perfil?.foto_url || null
  const avatar = perfil?.avatar_emoji || '👤'

  const formatCiclo = (d) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'DM Sans, sans-serif', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        .fu { animation: fadeUp .45s ease forwards; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <Orbs />
      <Toast msg={toast} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 48, padding: '40px 20px', minHeight: '100vh' }}>

        {/* ══════════════ MOBILE ══════════════ */}
        <div style={{
          width: 390, flexShrink: 0, position: 'relative',
          borderRadius: 48, border: `1.5px solid ${C.border2}`,
          background: 'rgba(8,13,26,0.7)', backdropFilter: 'blur(40px)',
          overflow: 'hidden', boxShadow: `0 40px 100px rgba(0,0,0,0.65)`,
          display: 'flex', flexDirection: 'column', minHeight: 844,
        }}>
          {/* Status bar */}
          <div style={{ padding: '14px 28px 0', display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
            <span>9:41</span>
            <div style={{ display: 'flex', gap: 5 }}>
              <span>●●●</span><span>WiFi</span><span>🔋</span>
            </div>
          </div>
          <div style={{ width: 118, height: 32, background: '#000', borderRadius: '0 0 20px 20px', margin: '6px auto 0' }} />

          {/* Body scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>

            {/* Top bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px 10px' }}>
              <div>
                <div style={{ fontSize: 12, color: C.text2, marginBottom: 2 }}>Buenos días,</div>
                <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, letterSpacing: '-0.02em' }}>{nombre}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  onClick={() => showToast('🔔 Sin notificaciones nuevas')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer', overflow: 'hidden' }}
                  onClick={() => navigate('/perfil')} title="Ver perfil">
                  {fotoUrl ? <img src={fotoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatar}
                </div>
              </div>
            </div>

            {/* Currency toggle */}
            <CurrencyToggle currency={currency} onChange={setCurrency} />

            {/* Balance card */}
            <div className="fu" style={{ margin: '0 16px 14px', padding: 22, borderRadius: 24, background: 'linear-gradient(135deg,rgba(96,165,250,0.18),rgba(94,240,176,0.12))', border: '1px solid rgba(94,240,176,0.18)', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
              <div style={{ fontSize: 11, color: C.text2, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                Ciclo actual · <span style={{ background: 'rgba(255,255,255,0.1)', border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 20, padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
                  onClick={() => showToast(`📅 ${formatCiclo(ciclo.start)} → ${formatCiclo(ciclo.end)}`)}>
                  {formatCiclo(ciclo.start)} → {formatCiclo(ciclo.end)}
                </span>
              </div>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 42, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>
                {fmtFull(saldo, currency, RATE)}
              </div>
              <div style={{ fontSize: 12, color: saldo >= 0 ? C.green : C.red, display: 'flex', alignItems: 'center', gap: 3, marginBottom: 18 }}>
                {saldo >= 0 ? '↑' : '↓'} Saldo disponible del ciclo
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { label: 'Ingresos', val: totalIngresos, color: C.green },
                  { label: 'Gastos', val: -totalGastos, color: C.red },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 12 }}>
                    <div style={{ fontSize: 10, color: C.text2, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: 17, fontWeight: 600, color }}>{fmtFull(val, currency, RATE)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 8, margin: '0 16px 16px' }}>
              {[
                { icon: '💳', label: 'Gasto', color: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.25)', action: () => navigate('/agregar') },
                { icon: '💸', label: 'Ingreso', color: 'rgba(94,240,176,0.15)', border: 'rgba(94,240,176,0.25)', action: () => navigate('/agregar') },
                { icon: '📅', label: 'Plan', color: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.25)', action: () => navigate('/plan') },
                { icon: '🏠', label: 'Hogar', color: 'rgba(192,132,252,0.15)', border: 'rgba(192,132,252,0.25)', action: () => navigate('/hogar') },
              ].map(({ icon, label, color, border, action }) => (
                <div key={label} onClick={action} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: color, border: `1px solid ${border}` }}>{icon}</div>
                  <span style={{ fontSize: 10, color: C.text2 }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Cycle progress */}
            <div style={{ margin: '0 16px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Progreso del ciclo</span>
                <span style={{ fontSize: 11, color: C.blue, cursor: 'pointer' }} onClick={() => navigate('/perfil')}>Cambiar ciclo</span>
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.text2 }}>Período activo</div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{formatCiclo(ciclo.start)} → {formatCiclo(ciclo.end)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 600, color: C.amber, lineHeight: 1 }}>{ciclo.diasRestantes}</div>
                    <div style={{ fontSize: 10, color: C.text2 }}>días restantes</div>
                  </div>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${ciclo.pct}%`, borderRadius: 3, background: `linear-gradient(90deg, ${C.blue}, ${C.green})`, transition: 'width .6s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.text3 }}>
                  <span>Día {ciclo.diasTranscurridos} de {ciclo.duracion}</span>
                  <span>{ciclo.pct}% del ciclo</span>
                </div>
              </div>
            </div>

            {/* Budget 50/30/20 */}
            <div style={{ margin: '0 16px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Presupuesto 50/30/20</span>
                <span style={{ fontSize: 11, color: C.blue, cursor: 'pointer' }} onClick={() => navigate('/plan')}>Editar</span>
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <BudgetBar emoji="🏠" label="Necesidades" pct={50} usado={totalGastos * presNecesidades} total={totalIngresos * presNecesidades} color={C.blue} currency={currency} />
                <BudgetBar emoji="🎬" label="Deseos" pct={30} usado={totalGastos * presDeseos} total={totalIngresos * presDeseos} color={C.purple} currency={currency} />
                <BudgetBar emoji="🏦" label="Ahorro" pct={20} usado={0} total={totalIngresos * presAhorro} color={C.green} currency={currency} />
              </div>
            </div>

            {/* Últimos movimientos */}
            <div style={{ margin: '0 16px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Últimos movimientos</span>
                <span style={{ fontSize: 11, color: C.blue, cursor: 'pointer' }} onClick={() => navigate('/movimientos')}>Ver todos</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {movimientos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: C.text2, fontSize: 13 }}>
                    Sin movimientos en este ciclo.<br />
                    <span style={{ color: C.green, cursor: 'pointer' }} onClick={() => navigate('/agregar')}>+ Agregar uno</span>
                  </div>
                ) : movimientos.map((m) => {
                  const esIngreso = m._tipo === 'ingreso'
                  const monto = esIngreso ? Number(m.monto_cop) : Number(m.monto_cop)
                  const color = esIngreso ? C.green : C.red
                  const bgColor = esIngreso ? 'rgba(94,240,176,0.14)' : `rgba(248,113,113,0.14)`
                  const emoji = m.categorias?.emoji || (esIngreso ? '💸' : '💳')
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, cursor: 'pointer' }}
                      onClick={() => showToast(`${emoji} ${m.nombre} · ${fmtFull(monto, currency, RATE)}`)}>
                      <div style={{ width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, background: bgColor }}>{emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.nombre}</div>
                        <div style={{ fontSize: 11, color: C.text2, marginTop: 1 }}>{m.categorias?.nombre || (esIngreso ? 'Ingreso' : 'Gasto')}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color }}>{esIngreso ? '+' : '-'}{fmtFull(monto, currency, RATE)}</div>
                        <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>{timeAgo(m.fecha)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>{/* /body */}

          {/* Bottom nav */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 82, background: 'rgba(8,13,26,0.85)', backdropFilter: 'blur(30px)', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 10, zIndex: 10 }}>
            {[
              { icon: <svg viewBox="0 0 24 24" fill="currentColor" width="21" height="21"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>, label: 'Inicio', active: true, to: '/home' },
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="21" height="21"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, label: 'Gastos', active: false, to: '/movimientos' },
            ].map(({ icon, label, active, to }) => (
              <div key={label} onClick={() => navigate(to)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 14px', color: active ? C.green : C.text3 }}>
                {icon}
                <span style={{ fontSize: 9.5 }}>{label}</span>
              </div>
            ))}
            <div onClick={() => navigate('/agregar')} style={{ width: 46, height: 46, borderRadius: 15, background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginTop: -10, boxShadow: `0 6px 20px rgba(94,240,176,0.28)` }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#080d1a" strokeWidth="2.5" width="21" height="21"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            {[
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="21" height="21"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>, label: 'Hogar', to: '/hogar' },
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="21" height="21"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: 'Perfil', to: '/perfil' },
            ].map(({ icon, label, to }) => (
              <div key={label} onClick={() => navigate(to)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 14px', color: C.text3 }}>
                {icon}
                <span style={{ fontSize: 9.5 }}>{label}</span>
              </div>
            ))}
          </div>

        </div>{/* /phone */}

        {/* ══════════════ DESKTOP ══════════════ */}
        <div style={{ display: 'none', width: 580, flexDirection: 'column', gap: 14 }} className="desktop-panel">

          {/* Top nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 }}>
            <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, background: `linear-gradient(135deg, #eef2ff, ${C.green})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Clara</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['Inicio', '/home', true], ['Movimientos', '/movimientos', false], ['Plan', '/plan', false], ['Hogar', '/hogar', false]].map(([label, to, active]) => (
                <button key={label} onClick={() => navigate(to)} style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12.5, color: active ? C.green : C.text2, cursor: 'pointer', border: active ? `1px solid rgba(94,240,176,0.18)` : '1px solid transparent', background: active ? 'rgba(94,240,176,0.07)' : 'none', fontFamily: 'DM Sans, sans-serif' }}>{label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: C.text2 }}>{nombre}</span>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer', overflow: 'hidden' }} onClick={() => navigate('/perfil')} title="Ver perfil">
                {fotoUrl ? <img src={fotoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatar}
              </div>
            </div>
          </div>

          {/* Balance hero */}
          <div style={{ background: 'linear-gradient(135deg,rgba(96,165,250,0.16),rgba(94,240,176,0.1))', border: `1px solid rgba(94,240,176,0.16)`, borderRadius: 20, padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: C.text2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Ciclo actual · {formatCiclo(ciclo.start)} → {formatCiclo(ciclo.end)}
              </div>
              <CurrencyToggle currency={currency} onChange={setCurrency} desktop />
            </div>
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 52, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 6 }}>
              {fmtFull(saldo, currency, RATE)}
            </div>
            <div style={{ fontSize: 12, color: C.green, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
              ↑ Saldo disponible · Tasa: ${RATE.toLocaleString('es-CO')} COP/USD
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: 'Ingresos del ciclo', val: totalIngresos, color: C.green },
                { label: 'Gastos del ciclo', val: -totalGastos, color: C.red },
                { label: 'Días restantes', val: null, extra: ciclo.diasRestantes + ' días', color: C.amber },
              ].map(({ label, val, extra, color }) => (
                <div key={label} style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 10, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color }}>{extra || fmtFull(val, currency, RATE)}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              {[['💳 Gasto', '/agregar'], ['💸 Ingreso', '/agregar'], ['📅 Plan', '/plan'], ['🏠 Hogar', '/hogar']].map(([label, to]) => (
                <button key={label} onClick={() => navigate(to)} style={{ padding: '9px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12, fontWeight: 500, color: C.text, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>{label}</button>
              ))}
            </div>
          </div>

          {/* 2-col: budget + ciclo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '22px 24px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 14 }}>Presupuesto 50/30/20</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <BudgetBar emoji="🏠" label="Necesidades" pct={50} usado={totalGastos * presNecesidades} total={totalIngresos * presNecesidades} color={C.blue} currency={currency} />
                <BudgetBar emoji="🎬" label="Deseos" pct={30} usado={totalGastos * presDeseos} total={totalIngresos * presDeseos} color={C.purple} currency={currency} />
                <BudgetBar emoji="🏦" label="Ahorro" pct={20} usado={0} total={totalIngresos * presAhorro} color={C.green} currency={currency} />
              </div>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.text3 }}>Ciclo de pago</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 3 }}>{formatCiclo(ciclo.start)} → {formatCiclo(ciclo.end)} 2026</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 28, fontWeight: 600, color: C.amber, lineHeight: 1 }}>{ciclo.diasRestantes}</div>
                  <div style={{ fontSize: 10, color: C.text2 }}>días restantes</div>
                </div>
              </div>
              <div style={{ height: 7, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${ciclo.pct}%`, borderRadius: 4, background: `linear-gradient(90deg, ${C.blue}, ${C.green})`, transition: 'width .7s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.text3, marginBottom: 16 }}>
                <span>Día {ciclo.diasTranscurridos} de {ciclo.duracion}</span>
                <span>{ciclo.pct}%</span>
              </div>
              {[
                ['Gasto diario promedio', totalGastos > 0 ? fmtFull(totalGastos / ciclo.diasTranscurridos, currency, RATE) + ' / día' : '—', C.text],
                ['Tasa activa', `Manual · $${RATE.toLocaleString('es-CO')} COP/USD`, C.blue],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                  <span style={{ color: C.text2 }}>{label}</span>
                  <span style={{ color }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transacciones desktop */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.text3 }}>Últimos movimientos</span>
              <span style={{ fontSize: 11, color: C.blue, cursor: 'pointer' }} onClick={() => navigate('/movimientos')}>Ver todos →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {movimientos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: C.text2, fontSize: 13 }}>
                  Sin movimientos. <span style={{ color: C.green, cursor: 'pointer' }} onClick={() => navigate('/agregar')}>+ Agregar</span>
                </div>
              ) : movimientos.map((m) => {
                const esIngreso = m._tipo === 'ingreso'
                const monto = Number(m.monto_cop)
                const color = esIngreso ? C.green : C.red
                const emoji = m.categorias?.emoji || (esIngreso ? '💸' : '💳')
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, cursor: 'pointer' }}
                    onClick={() => showToast(`${emoji} ${m.nombre} · ${fmtFull(monto, currency, RATE)}`)}>
                    <div style={{ width: 40, height: 40, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, background: esIngreso ? 'rgba(94,240,176,0.14)' : 'rgba(248,113,113,0.14)' }}>{emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{m.nombre}</div>
                      <div style={{ fontSize: 11.5, color: C.text2 }}>{m.categorias?.nombre || (esIngreso ? 'Ingreso' : 'Gasto')} · {timeAgo(m.fecha)}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color }}>{esIngreso ? '+' : '-'}{fmtFull(monto, currency, RATE)}</div>
                      <div style={{ fontSize: 10.5, color: C.text3, marginTop: 2 }}>≈ {fmt(monto, currency === 'COP' ? 'USD' : 'COP', RATE)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>{/* /desktop */}

      </div>

      {/* CSS para mostrar desktop panel en pantallas grandes */}
      <style>{`
        @media (min-width: 900px) {
          .desktop-panel { display: flex !important; }
        }
        @media (max-width: 440px) {
          .phone { width: 100vw !important; min-height: 100vh !important; border-radius: 0 !important; border: none !important; }
        }
      `}</style>
    </div>
  )
}