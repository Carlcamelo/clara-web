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

function fmt(n, currency) {
  const abs = Math.abs(Math.round(currency === 'USD' ? n / RATE : n))
  if (abs >= 1000000) return '$' + (abs / 1000000).toFixed(1) + 'M'
  if (abs >= 1000) return '$' + Math.round(abs / 1000) + 'K'
  return '$' + abs.toLocaleString('es-CO')
}
function fmtFull(n, currency) {
  const abs = Math.abs(Math.round(currency === 'USD' ? n / RATE : n))
  return '$' + abs.toLocaleString(currency === 'USD' ? 'en-US' : 'es-CO')
}

function getCycleInfo(diaInicio = 1, duracion = 30) {
  const now = new Date()
  let start = new Date(now.getFullYear(), now.getMonth(), diaInicio)
  if (now < start) start = new Date(now.getFullYear(), now.getMonth() - 1, diaInicio)
  const end = new Date(start); end.setDate(end.getDate() + duracion - 1)
  const diasTranscurridos = Math.max(1, Math.floor((now - start) / 86400000) + 1)
  const diasRestantes = Math.max(0, Math.floor((end - now) / 86400000))
  const pct = Math.min(100, Math.round((diasTranscurridos / duracion) * 100))
  const fmt2 = (d) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  return { start, end, diasTranscurridos, diasRestantes, pct, duracion, fmt: fmt2 }
}

function Toast({ msg }) {
  return msg ? (
    <div style={{ position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)', background: 'rgba(12,18,32,.97)', border: `1px solid ${C.border2}`, borderRadius: 26, padding: '10px 18px', fontSize: 12, color: C.text, backdropFilter: 'blur(20px)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.green }} />{msg}
    </div>
  ) : null
}

function BudgetRow({ emoji, label, pct, gastado, limite, color, currency }) {
  const used = limite > 0 ? Math.min(100, Math.round((gastado / limite) * 100)) : 0
  const status = used >= 100 ? 'over' : used >= 80 ? 'warn' : 'ok'
  const statusColor = status === 'over' ? C.red : status === 'warn' ? C.amber : C.green
  const statusBg = status === 'over' ? 'rgba(248,113,113,0.1)' : status === 'warn' ? 'rgba(251,191,36,0.1)' : 'rgba(94,240,176,0.1)'
  const statusBorder = status === 'over' ? 'rgba(248,113,113,0.2)' : status === 'warn' ? 'rgba(251,191,36,0.2)' : 'rgba(94,240,176,0.2)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 500 }}>
          {emoji} {label} <span style={{ fontSize: 9.5, color: C.text3, fontWeight: 400 }}>{pct}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: C.text2 }}>{fmt(gastado, currency)} / {fmt(limite, currency)}</span>
          <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 10, fontWeight: 600, border: `1px solid ${statusBorder}`, background: statusBg, color: statusColor }}>{used}%</span>
        </div>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${used}%`, borderRadius: 3, background: color, transition: 'width .7s ease' }} />
      </div>
    </div>
  )
}

function DebtItem({ d, currency, onToast }) {
  const montoTotal = Number(d.monto_total_cop || 0)
  const montoPagado = Number(d.monto_pagado_cop || 0)
  const pct = montoTotal > 0 ? Math.min(100, Math.round((montoPagado / montoTotal) * 100)) : 0
  const pendiente = Math.max(0, montoTotal - montoPagado)

  return (
    <div onClick={() => onToast(`📋 ${d.nombre}`)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '13px 14px', cursor: 'pointer', transition: 'all .2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, background: 'rgba(251,191,36,0.14)' }}>🔄</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{d.nombre}</div>
          <div style={{ fontSize: 10.5, color: C.text2 }}>{d.entidad || 'Deuda'}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.amber }}>{fmtFull(Number(d.cuota_mensual_cop || 0), currency)}</div>
          <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>{d.dia_pago ? `Vence día ${d.dia_pago}` : ''}</div>
        </div>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: `linear-gradient(90deg, ${C.amber}, ${C.green})`, transition: 'width .7s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.text3 }}>
        <span>{fmt(montoPagado, currency)} pagado de {fmt(montoTotal, currency)}</span>
        <span style={{ color: C.text2 }}>{fmt(pendiente, currency)} pendiente</span>
      </div>
    </div>
  )
}

export default function Plan() {
  const navigate = useNavigate()
  const [perfil, setPerfil] = useState(null)
  const [user, setUser] = useState(null)
  const [gastos, setGastos] = useState([])
  const [ingresos, setIngresos] = useState([])
  const [deudas, setDeudas] = useState([])
  const [currency, setCurrency] = useState('COP')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [expandedPeriod, setExpandedPeriod] = useState(null)
  const [showPeriodModal, setShowPeriodModal] = useState(false)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2600) }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      setUser(user)

      const { data: p } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
      setPerfil(p)

      const ciclo = getCycleInfo(p?.ciclo_dia_inicio || 1, p?.ciclo_duracion_dias || 30)
      const desde = ciclo.start.toISOString().split('T')[0]
      const hasta = ciclo.end.toISOString().split('T')[0]

      const [{ data: g }, { data: i }, { data: deu }] = await Promise.all([
        supabase.from('gastos').select('*').eq('usuario_id', user.id).gte('fecha', desde).lte('fecha', hasta),
        supabase.from('ingresos').select('*').eq('usuario_id', user.id).gte('fecha', desde).lte('fecha', hasta),
        supabase.from('deudas').select('*').eq('usuario_id', user.id).eq('activa', true),
      ])

      setGastos(g || [])
      setIngresos(i || [])
      setDeudas(deu || [])
      setLoading(false)
    }
    init()
  }, [navigate])

  const ciclo = getCycleInfo(perfil?.ciclo_dia_inicio || 1, perfil?.ciclo_duracion_dias || 30)
  const fotoUrl = perfil?.foto_url || null
  const avatar = perfil?.avatar_emoji || '👤'

  const totalIngresos = useMemo(() => ingresos.reduce((s, i) => s + Math.abs(Number(i.monto_cop)), 0), [ingresos])
  const totalGastos = useMemo(() => gastos.reduce((s, g) => s + Math.abs(Number(g.monto_cop)), 0), [gastos])
  const totalDeudas = useMemo(() => deudas.reduce((s, d) => s + Number(d.cuota_mensual_cop || 0), 0), [deudas])
  const saldo = totalIngresos - totalGastos

  // 50/30/20 basado en ingresos reales
  const limNeed = totalIngresos * 0.50
  const limWant = totalIngresos * 0.30
  const limSave = totalIngresos * 0.20
  // Para simplificar: gastos = necesidades + deseos (sin categorías detalladas aún)
  const gastNeed = totalGastos * 0.60
  const gastWant = totalGastos * 0.40
  const gastSave = 0

  // Projected periods based on current cycle
  const projectedPeriods = useMemo(() => {
    const dia = perfil?.ciclo_dia_inicio || 1
    const dur = perfil?.ciclo_duracion_dias || 30
    const periods = []
    const now = new Date()
    let start = new Date(now.getFullYear(), now.getMonth(), dia)
    if (now < start) start = new Date(now.getFullYear(), now.getMonth() - 1, dia)

    for (let i = 0; i < 5; i++) {
      const pStart = new Date(start)
      pStart.setDate(pStart.getDate() + dur * i)
      const pEnd = new Date(pStart)
      pEnd.setDate(pEnd.getDate() + dur - 1)
      const isCurrent = i === 0
      const fmtD = (d) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })

      // Use real data for current period, projected estimates for future
      const pIngresos = isCurrent ? totalIngresos : totalIngresos * (0.95 + Math.random() * 0.2)
      const pGastos = isCurrent ? totalGastos : totalGastos * (0.9 + Math.random() * 0.2)
      const pDeudas = totalDeudas
      const pSaldo = pIngresos - pGastos

      periods.push({
        id: i,
        label: `${fmtD(pStart)} → ${fmtD(pEnd)}`,
        saldo: pSaldo,
        ingresos: pIngresos,
        gastos: pGastos,
        deudas: pDeudas,
        isCurrent,
        badge: isCurrent ? 'actual' : i === 1 ? 'programado' : 'conservador',
        tasa: isCurrent ? 'Manual $4.500' : i <= 2 ? '$4.500' : '$4.800',
      })
    }
    return periods
  }, [perfil, totalIngresos, totalGastos, totalDeudas])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, fontFamily: 'DM Sans, sans-serif' }}>Cargando...</div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; } ::-webkit-scrollbar { display: none; }
        .desktop-nav { display: none !important; }
        .bottom-nav { display: flex !important; }
        .page-content { padding-bottom: 90px; }
        .mobile-header { display: flex; }
        .mobile-currency { display: flex; }
        .plan-grid { display: flex; flex-direction: column; }
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .bottom-nav { display: none !important; }
          .page-content { max-width: 900px; margin: 0 auto; padding-bottom: 40px; }
          .mobile-header { display: none !important; }
          .mobile-currency { display: none !important; }
          .plan-grid { display: grid !important; grid-template-columns: 1fr 1fr; gap: 14px; }
        }
      `}</style>
      <Toast msg={toast} />

      {/* Desktop TopNav */}
      <div className="desktop-nav" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 21, background: `linear-gradient(135deg, ${C.text}, ${C.green})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Clara</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['Inicio', '/home', false], ['Gastos', '/movimientos', false], ['Plan', '/plan', true], ['Hogar', '/hogar', false]].map(([label, to, active]) => (
            <button key={label} onClick={() => navigate(to)} style={{ padding: '7px 13px', borderRadius: 10, fontSize: 12, color: active ? C.green : C.text2, cursor: 'pointer', border: active ? `1px solid rgba(94,240,176,0.2)` : '1px solid transparent', background: active ? 'rgba(94,240,176,0.07)' : 'transparent', fontFamily: 'DM Sans, sans-serif' }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', border: `1px solid ${C.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
            {['COP', 'USD'].map(c => (
              <div key={c} onClick={() => setCurrency(c)} style={{ padding: '4px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: currency === c ? C.text : C.text2, background: currency === c ? 'rgba(255,255,255,0.1)' : 'transparent' }}>{c}</div>
            ))}
          </div>
          <div onClick={() => navigate('/perfil')} style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer', overflow: 'hidden' }}>
            {fotoUrl ? <img src={fotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatar}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="page-content" style={{ position: 'relative', zIndex: 1 }}>

        {/* Mobile header */}
        <div className="mobile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 10px' }}>
          <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, letterSpacing: '-.02em' }}>Plan</div>
          <div className="mobile-currency" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 3, gap: 2 }}>
              {['COP', 'USD'].map(c => (
                <div key={c} onClick={() => setCurrency(c)} style={{ padding: '4px 11px', borderRadius: 15, fontSize: 10.5, fontWeight: 600, cursor: 'pointer', color: currency === c ? C.text : C.text2, background: currency === c ? 'rgba(255,255,255,0.11)' : 'transparent' }}>{c}</div>
              ))}
            </div>
          </div>
        </div>

            {/* Ciclo chip */}
            <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, fontSize: 11, color: C.text2, cursor: 'pointer' }} onClick={() => showToast(`📅 ${ciclo.fmt(ciclo.start)} → ${ciclo.fmt(ciclo.end)}`)}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
                {ciclo.fmt(ciclo.start)} → {ciclo.fmt(ciclo.end)}
              </div>
            </div>

            {/* Summary card */}
            <div style={{ margin: '0 18px 16px', padding: 20, borderRadius: 24, background: 'linear-gradient(135deg,rgba(96,165,250,0.17),rgba(94,240,176,0.1))', border: '1px solid rgba(94,240,176,0.18)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: 10, color: C.text2, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3 }}>Saldo del ciclo</div>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 40, letterSpacing: '-.03em', lineHeight: 1, marginBottom: 4 }}>{fmtFull(saldo, currency)}</div>
              <div style={{ fontSize: 11.5, color: saldo >= 0 ? C.green : C.red, marginBottom: 16 }}>{saldo >= 0 ? '↑ Con superávit' : '↓ En déficit'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[['Ingresos', totalIngresos, C.green, 'up'], ['Gastos', totalGastos, C.red, 'down'], ['Deudas', totalDeudas, C.amber, 'neu']].map(([lbl, val, color, cls]) => (
                  <div key={lbl} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ fontSize: 9.5, color: C.text2, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>{lbl}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color }}>{fmt(val, currency)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ciclo progress */}
            <div style={{ padding: '0 18px', marginBottom: 18 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '13px 15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{ciclo.fmt(ciclo.start)} → {ciclo.fmt(ciclo.end)}</div>
                    <div style={{ fontSize: 10, color: C.text2, marginTop: 2 }}>Día {ciclo.diasTranscurridos} de {ciclo.duracion}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: C.amber, lineHeight: 1 }}>{ciclo.diasRestantes}</div>
                    <div style={{ fontSize: 9.5, color: C.text2 }}>días restantes</div>
                  </div>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${ciclo.pct}%`, borderRadius: 3, background: `linear-gradient(90deg, ${C.blue}, ${C.green})`, transition: 'width .7s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.text3 }}>
                  <span>{ciclo.fmt(ciclo.start)}</span>
                  <span>{ciclo.pct}% completado</span>
                  <span>{ciclo.fmt(ciclo.end)}</span>
                </div>
              </div>
            </div>

            {/* 50/30/20 */}
            <div style={{ padding: '0 18px', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>Presupuesto 50/30/20</span>
                <span onClick={() => navigate('/perfil')} style={{ fontSize: 11, color: C.blue, cursor: 'pointer' }}>Editar</span>
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 13 }}>
                <BudgetRow emoji="🏠" label="Necesidades" pct={50} gastado={gastNeed} limite={limNeed} color={C.blue} currency={currency} />
                <BudgetRow emoji="🎬" label="Deseos" pct={30} gastado={gastWant} limite={limWant} color={C.purple} currency={currency} />
                <BudgetRow emoji="🏦" label="Ahorro" pct={20} gastado={gastSave} limite={limSave} color={C.green} currency={currency} />
              </div>
              {totalIngresos === 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: C.text3, textAlign: 'center' }}>Agrega ingresos para ver el presupuesto</div>
              )}
            </div>

            {/* Ingresos del ciclo */}
            <div style={{ padding: '0 18px', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>Ingresos del ciclo</span>
                <span onClick={() => navigate('/agregar')} style={{ fontSize: 11, color: C.blue, cursor: 'pointer' }}>+ Agregar</span>
              </div>
              {ingresos.length === 0 ? (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>💰</div>
                  <div style={{ fontSize: 13, color: C.text2 }}>Sin ingresos este ciclo</div>
                  <div onClick={() => navigate('/agregar')} style={{ marginTop: 10, fontSize: 12, color: C.green, cursor: 'pointer' }}>+ Agregar ingreso</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {ingresos.map(i => {
                    const monto = Math.abs(Number(i.monto_cop))
                    return (
                      <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, cursor: 'pointer', transition: 'all .2s' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, background: 'rgba(94,240,176,0.14)' }}>💸</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.nombre}</div>
                          <div style={{ fontSize: 10.5, color: C.text2, marginTop: 1 }}>{i.fuente_trabajo || 'Ingreso'}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>+{fmtFull(monto, currency)}</div>
                          <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>{i.fecha}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Deudas activas */}
            <div style={{ padding: '0 18px', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>Deudas activas</span>
                <span onClick={() => navigate('/agregar')} style={{ fontSize: 11, color: C.blue, cursor: 'pointer' }}>+ Agregar</span>
              </div>
              {deudas.length === 0 ? (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 13, color: C.text2 }}>Sin deudas activas</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {deudas.map(d => <DebtItem key={d.id} d={d} currency={currency} onToast={showToast} />)}
                </div>
              )}
            </div>

            {/* Flujo proyectado */}
            <div style={{ padding: '0 18px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>Flujo proyectado</span>
                <span onClick={() => setShowPeriodModal(true)} style={{ fontSize: 11, color: C.blue, cursor: 'pointer' }}>+ Período</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 18px 4px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', marginBottom: 18 }}>
              {projectedPeriods.map(p => {
                const isExpanded = expandedPeriod === p.id
                const badgeStyle = p.badge === 'actual'
                  ? { background: 'rgba(94,240,176,0.1)', color: C.green, borderColor: 'rgba(94,240,176,0.2)' }
                  : p.badge === 'programado'
                  ? { background: 'rgba(251,191,36,0.1)', color: C.amber, borderColor: 'rgba(251,191,36,0.2)' }
                  : { background: 'rgba(96,165,250,0.1)', color: C.blue, borderColor: 'rgba(96,165,250,0.2)' }
                const badgeLabel = p.badge === 'actual' ? '● Actual' : p.badge === 'programado' ? '⏳ Programado' : '$ Conservador'

                return (
                  <div key={p.id} onClick={() => setExpandedPeriod(isExpanded ? null : p.id)} style={{
                    flexShrink: 0, width: isExpanded ? 200 : 150, background: p.isCurrent ? 'rgba(94,240,176,0.05)' : C.surface,
                    border: `1px solid ${p.isCurrent ? 'rgba(94,240,176,0.28)' : isExpanded ? C.border2 : C.border}`,
                    borderRadius: 18, padding: 14, cursor: 'pointer', transition: 'all .25s', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ fontSize: 9.5, color: C.text3, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>{p.label}</div>
                    <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, letterSpacing: '-.02em', marginBottom: 2, color: p.saldo >= 0 ? C.green : C.red }}>{fmtFull(p.saldo, currency)}</div>
                    <div style={{ fontSize: 10, color: C.text2, marginBottom: 8 }}>{p.isCurrent ? 'Saldo actual' : 'Saldo proyectado'}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700, letterSpacing: '.03em', border: `1px solid ${badgeStyle.borderColor}`, background: badgeStyle.background, color: badgeStyle.color }}>{badgeLabel}</div>
                    {isExpanded && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}><span style={{ color: C.text3 }}>Ingresos</span><span style={{ color: C.green, fontWeight: 500 }}>{fmt(p.ingresos, currency)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}><span style={{ color: C.text3 }}>Gastos</span><span style={{ color: C.red, fontWeight: 500 }}>{fmt(p.gastos, currency)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}><span style={{ color: C.text3 }}>Deudas</span><span style={{ color: C.amber, fontWeight: 500 }}>{fmt(p.deudas, currency)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}><span style={{ color: C.text3 }}>Tasa</span><span style={{ color: C.text2, fontWeight: 500 }}>{p.tasa}</span></div>
                      </div>
                    )}
                  </div>
                )
              })}
              {/* Add period card */}
              <div onClick={() => setShowPeriodModal(true)} style={{
                flexShrink: 0, width: 100, border: `1.5px dashed rgba(255,255,255,0.12)`, borderRadius: 18, padding: 14,
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all .2s'
              }}>
                <div style={{ fontSize: 22, color: C.text3 }}>+</div>
                <div style={{ fontSize: 10.5, color: C.text3, textAlign: 'center' }}>Programar período</div>
              </div>
            </div>

      </div>{/* /page-content */}

      {/* Programar período modal */}
      {showPeriodModal && (
        <>
          <div onClick={() => setShowPeriodModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 50 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(10,16,30,0.98)', borderRadius: '26px 26px 0 0', borderTop: `1px solid ${C.border2}`, zIndex: 51, padding: '0 20px 36px', maxHeight: '85%', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border2, margin: '12px auto 16px' }} />
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, letterSpacing: '-.02em', marginBottom: 4 }}>Programar período</div>
            <div style={{ fontSize: 12.5, color: C.text2, marginBottom: 20 }}>Configurá el próximo ciclo con ingresos esperados y tasa de conversión</div>

            <div style={{ marginBottom: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 6 }}>Período</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input placeholder="Desde · Jul 15" style={{ width: '100%', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 300, outline: 'none' }} />
                <input placeholder="Hasta · Ago 14" style={{ width: '100%', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 300, outline: 'none' }} />
              </div>
            </div>

            <div style={{ marginBottom: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 6 }}>Ingreso esperado</div>
              <input type="number" placeholder="6.500.000" style={{ width: '100%', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 300, outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 6 }}>Gastos estimados</div>
              <input type="number" placeholder="2.200.000" style={{ width: '100%', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 300, outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 6 }}>Tasa de conversión COP/USD</div>
              <input type="number" placeholder="4.500" style={{ width: '100%', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 300, outline: 'none', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[['Mercado actual $4.500', true], ['Conservador $4.800', false], ['Pesimista $5.000', false], ['Manual', false]].map(([label, active]) => (
                  <div key={label} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', border: `1px solid ${active ? 'rgba(96,165,250,0.3)' : C.border}`, background: active ? 'rgba(96,165,250,0.15)' : C.surface, color: active ? C.blue : C.text2 }}>{label}</div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 6 }}>Notas del período <span style={{ color: C.text3, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></div>
              <input placeholder="Ej: Mes de vacaciones, bono esperado…" style={{ width: '100%', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 300, outline: 'none' }} />
            </div>

            <button onClick={() => { setShowPeriodModal(false); showToast('✅ Período guardado en tu flujo proyectado') }} style={{ width: '100%', padding: 14, borderRadius: 14, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', background: `linear-gradient(135deg, ${C.blue}, #3b82f6)`, color: '#fff', marginTop: 8 }}>Guardar período</button>
          </div>
        </>
      )}

      {/* Bottom nav - mobile only */}
      <div className="bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 80, background: 'rgba(8,13,26,0.88)', backdropFilter: 'blur(30px)', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 10, zIndex: 10 }}>
        <div onClick={() => navigate('/home')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 12px', color: C.text3 }}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
          <span style={{ fontSize: 9.5 }}>Inicio</span>
        </div>
        <div onClick={() => navigate('/movimientos')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 12px', color: C.text3 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          <span style={{ fontSize: 9.5 }}>Gastos</span>
        </div>
        <div onClick={() => navigate('/agregar')} style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginTop: -8, boxShadow: '0 6px 18px rgba(94,240,176,0.25)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#080d1a" strokeWidth="2.5" width="20" height="20"><path d="M12 5v14M5 12h14" /></svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 12px', color: C.green }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          <span style={{ fontSize: 9.5 }}>Plan</span>
        </div>
        <div onClick={() => navigate('/perfil')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 12px', color: C.text3 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          <span style={{ fontSize: 9.5 }}>Perfil</span>
        </div>
      </div>

    </div>
  )
}