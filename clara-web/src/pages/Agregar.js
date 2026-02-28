import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const C = {
  bg: '#080d1a', surface: 'rgba(255,255,255,0.05)', surface2: 'rgba(255,255,255,0.09)',
  border: 'rgba(255,255,255,0.09)', border2: 'rgba(255,255,255,0.17)',
  text: '#eef2ff', text2: 'rgba(238,242,255,0.52)', text3: 'rgba(238,242,255,0.28)',
  green: '#5ef0b0', blue: '#60a5fa', purple: '#c084fc', red: '#f87171', amber: '#fbbf24'
}

function Toast({ msg }) {
  return msg ? (
    <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: 'rgba(12,18,32,0.96)', border: `1px solid ${C.border2}`, borderRadius: 28, padding: '11px 20px', fontSize: 12.5, color: C.text, backdropFilter: 'blur(20px)', zIndex: 999, display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />{msg}
    </div>
  ) : null
}

function Inp({ label, ...props }) {
  return (
    <div style={{ marginBottom: 13 }}>
      {label && <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 6 }}>{label}</div>}
      <input style={{ width: '100%', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, fontWeight: 300, outline: 'none', boxSizing: 'border-box' }} {...props} />
    </div>
  )
}

export default function Agregar() {
  const navigate = useNavigate()
  const [tipo, setTipo] = useState('gasto')
  const [monto, setMonto] = useState('')
  const [currency, setCurrency] = useState('COP')
  const [nombre, setNombre] = useState('')
  const [catId, setCatId] = useState(null)
  const [metodoPagoId, setMetodoPagoId] = useState(null)
  const [hogarId, setHogarId] = useState(null)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [hora, setHora] = useState(new Date().toTimeString().slice(0, 5))
  const [notas, setNotas] = useState('')
  const [esRecurrente, setEsRecurrente] = useState(false)
  const [fuenteTrabajo, setFuenteTrabajo] = useState('')
  // Deuda
  const [deudaNombre, setDeudaNombre] = useState('')
  const [montoTotal, setMontoTotal] = useState('')
  const [cuotaMensual, setCuotaMensual] = useState('')
  const [cuotasTotales, setCuotasTotales] = useState('')
  const [diaPago, setDiaPago] = useState('')
  const [montoPagado, setMontoPagado] = useState('')
  // Custom category
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatEmoji, setNewCatEmoji] = useState('📌')
  const [newCatNombre, setNewCatNombre] = useState('')
  const [savingCat, setSavingCat] = useState(false)
  // Data
  const [categorias, setCategorias] = useState([])
  const [metodos, setMetodos] = useState([])
  const [hogares, setHogares] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [guardado, setGuardado] = useState(false)
  const RATE = 4500

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2600) }

  function fmtMoney(raw, cur) {
    const digits = String(raw).replace(/[^\d]/g, '')
    if (!digits) return ''
    const num = parseInt(digits, 10)
    return num.toLocaleString(cur === 'USD' ? 'en-US' : 'es-CO')
  }
  function handleMoney(rawValue, setter) {
    setter(rawValue.replace(/[^\d]/g, ''))
  }
  function rawToNum(raw) { return parseFloat(String(raw).replace(/[^\d]/g, '')) || 0 }

  async function guardarCategoria() {
    if (!newCatNombre.trim() || !user) return
    setSavingCat(true)
    const { data, error } = await supabase.from('categorias').insert({
      nombre: newCatNombre.trim(),
      emoji: newCatEmoji || '📌',
      tipo: tipo === 'deuda' ? 'deuda' : tipo,
      es_global: false,
      usuario_id: user.id,
    }).select().single()
    setSavingCat(false)
    if (error) { showToast('❌ Error al crear categoría'); return }
    setCategorias(prev => [...prev, data])
    setCatId(data.id)
    setShowNewCat(false)
    setNewCatNombre('')
    setNewCatEmoji('📌')
    showToast('✅ Categoría creada')
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      setUser(user)
      const [{ data: cats }, { data: mets }, { data: hogs }] = await Promise.all([
        supabase.from('categorias').select('*').or(`es_global.eq.true,usuario_id.eq.${user.id}`),
        supabase.from('metodos_pago').select('*').eq('usuario_id', user.id),
        supabase.from('hogares').select('*, hogar_miembros(usuario_id, estado)').eq('hogar_miembros.estado', 'activo'),
      ])
      setCategorias(cats || [])
      setMetodos(mets || [])
      setHogares(hogs || [])
      if (mets?.length) setMetodoPagoId(mets[0].id)
    }
    init()
  }, [navigate])

  const catsFiltradas = categorias.filter(c => {
    if (tipo === 'gasto') return c.tipo === 'gasto'
    if (tipo === 'ingreso') return c.tipo === 'ingreso'
    return c.tipo === 'deuda'
  })

  const montoNum = rawToNum(monto)
  const montoCOP = currency === 'USD' ? montoNum * RATE : montoNum
  const montoUSD = currency === 'COP' ? montoNum / RATE : montoNum

  async function guardar() {
    if (tipo === 'deuda') {
      if (!deudaNombre || !montoTotal || !cuotaMensual) { showToast('⚠️ Completá los campos obligatorios'); return }
      setLoading(true)
      const { error } = await supabase.from('deudas').insert({
        usuario_id: user.id,
        nombre: deudaNombre,
        monto_total_cop: rawToNum(montoTotal),
        cuota_mensual_cop: rawToNum(cuotaMensual),
        cuotas_totales: parseInt(cuotasTotales) || 1,
        monto_pagado_cop: rawToNum(montoPagado),
        dia_pago: parseInt(diaPago) || null,
        activa: true,
      })
      setLoading(false)
      if (error) { showToast('❌ Error al guardar'); return }
      setGuardado(true)
      setTimeout(() => navigate('/home', { replace: true }), 1500)
      return
    }

    if (!monto || montoNum <= 0) { showToast('⚠️ Ingresá un monto válido'); return }

    setLoading(true)
    if (tipo === 'gasto') {
      const { error } = await supabase.from('gastos').insert({
        usuario_id: user.id,
        nombre: nombre || 'Gasto',
        categoria_id: catId,
        monto_cop: -Math.abs(montoCOP),
        tasa_conversion: RATE,
        fecha, hora,
        metodo_pago_id: metodoPagoId,
        hogar_id: hogarId,
        notas,
        es_recurrente: esRecurrente,
      })
      setLoading(false)
      if (error) { showToast('❌ Error al guardar'); return }
    } else {
      const { error } = await supabase.from('ingresos').insert({
        usuario_id: user.id,
        nombre: nombre || 'Ingreso',
        categoria_id: catId,
        monto_cop: Math.abs(montoCOP),
        tasa_conversion: RATE,
        fecha,
        metodo_pago_id: metodoPagoId,
        fuente_trabajo: fuenteTrabajo,
        notas,
        es_programado: false,
      })
      setLoading(false)
      if (error) { showToast('❌ Error al guardar'); return }
    }
    setGuardado(true)
  }

  const tipoColor = tipo === 'gasto' ? C.red : tipo === 'ingreso' ? C.green : C.amber
  const tipoLabel = tipo === 'gasto' ? 'Guardar gasto' : tipo === 'ingreso' ? 'Registrar ingreso' : 'Registrar deuda'

  if (guardado) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, padding: 24, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ fontSize: 64 }}>{tipo === 'deuda' ? '📋' : tipo === 'ingreso' ? '💸' : '✅'}</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: C.text, marginBottom: 8 }}>
          {tipo === 'gasto' ? '¡Gasto guardado!' : tipo === 'ingreso' ? '¡Ingreso registrado!' : '¡Deuda registrada!'}
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: tipoColor, marginBottom: 8 }}>
          {tipo !== 'deuda' ? `$${Math.round(montoCOP).toLocaleString('es-CO')}` : `$${rawToNum(montoTotal).toLocaleString('es-CO')}`}
        </div>
        <div style={{ fontSize: 13, color: C.text2 }}>Registrado en tu ciclo actual</div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => { setGuardado(false); setMonto(''); setNombre(''); setCatId(null); setNotas('') }} style={{ padding: '12px 24px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          + Otro
        </button>
        <button onClick={() => navigate('/home')} style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, border: 'none', borderRadius: 12, color: '#080d1a', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          Ir al inicio
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; } ::-webkit-scrollbar { display: none; }
        input::placeholder { color: rgba(238,242,255,0.28); }
        .desktop-nav { display: none !important; }
        .bottom-nav { display: flex !important; }
        .mobile-back { display: flex; }
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .bottom-nav { display: none !important; }
          .mobile-back { display: none !important; }
        }
      `}</style>
      <Toast msg={toast} />

      {/* Desktop TopNav */}
      <div className="desktop-nav" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 11 }}>
        <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 21, background: `linear-gradient(135deg, ${C.text}, ${C.green})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Clara</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['Inicio', '/home'], ['Gastos', '/movimientos'], ['Plan', '/plan'], ['Hogar', '/hogar']].map(([label, to]) => (
            <button key={label} onClick={() => navigate(to)} style={{ padding: '7px 13px', borderRadius: 10, fontSize: 12, color: C.text2, cursor: 'pointer', border: '1px solid transparent', background: 'transparent', fontFamily: 'DM Sans, sans-serif' }}>{label}</button>
          ))}
        </div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer' }} onClick={() => navigate('/perfil')}>👤</div>
      </div>

      {/* Mobile Header */}
      <div className="mobile-back" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(8,13,26,0.95)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div onClick={() => navigate('/home')} style={{ width: 36, height: 36, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </div>
        <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 20 }}>Agregar</span>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 100px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 13, padding: 3, gap: 2, marginBottom: 20 }}>
          {[['gasto', '💳 Gasto'], ['ingreso', '💸 Ingreso'], ['deuda', '📋 Deuda']].map(([t, label]) => {
            const active = tipo === t
            const activeStyle = t === 'gasto' ? { background: 'rgba(248,113,113,0.18)', color: C.red, border: `1px solid rgba(248,113,113,0.25)` } : t === 'ingreso' ? { background: 'rgba(94,240,176,0.15)', color: C.green, border: `1px solid rgba(94,240,176,0.22)` } : { background: 'rgba(251,191,36,0.15)', color: C.amber, border: `1px solid rgba(251,191,36,0.22)` }
            return (
              <div key={t} onClick={() => { setTipo(t); setCatId(null) }} style={{ flex: 1, padding: '8px', borderRadius: 10, textAlign: 'center', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: C.text2, border: '1px solid transparent', transition: 'all .22s', ...(active ? activeStyle : {}) }}>
                {label}
              </div>
            )
          })}
        </div>

        {/* Monto — solo para gasto e ingreso */}
        {tipo !== 'deuda' && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'inline-flex', gap: 3, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '3px 4px', marginBottom: 8 }}>
              {['COP', 'USD'].map(c => (
                <div key={c} onClick={() => setCurrency(c)} style={{ padding: '3px 10px', borderRadius: 14, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: currency === c ? C.text : C.text2, background: currency === c ? 'rgba(255,255,255,0.12)' : 'transparent', transition: 'all .2s' }}>{c}</div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, color: C.text2 }}>{tipo === 'gasto' ? '-' : '+'}</span>
              <input value={fmtMoney(monto, currency)} onChange={e => handleMoney(e.target.value, setMonto)} type="text" inputMode="numeric" placeholder="0" style={{ fontFamily: 'DM Serif Display, serif', fontSize: 44, letterSpacing: '-0.03em', background: 'none', border: 'none', color: C.text, outline: 'none', width: 240, textAlign: 'center', caretColor: C.green }} />
            </div>
            {montoNum > 0 && (
              <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>
                ≈ {currency === 'COP' ? `$${montoUSD.toFixed(0)} USD` : `$${Math.round(montoCOP).toLocaleString('es-CO')} COP`} · Tasa ${RATE.toLocaleString('es-CO')}
              </div>
            )}
          </div>
        )}

        {/* ── GASTO ── */}
        {tipo === 'gasto' && (
          <>
            <Inp label="Descripción" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Rappi, Gasolina, Mercado…" />

            <div style={{ marginBottom: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 8 }}>Categoría</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                {catsFiltradas.map(cat => (
                  <div key={cat.id} onClick={() => setCatId(cat.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '7px 3px', borderRadius: 11, border: `1px solid ${catId === cat.id ? C.border2 : 'transparent'}`, background: catId === cat.id ? C.surface2 : 'transparent', transition: 'all .18s' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: `1px solid ${C.border}`, background: cat.color_hex ? cat.color_hex + '22' : C.surface }}>{cat.emoji}</div>
                    <span style={{ fontSize: 9, color: catId === cat.id ? C.text : C.text2, textAlign: 'center', lineHeight: 1.2 }}>{cat.nombre}</span>
                  </div>
                ))}
                <div onClick={() => setShowNewCat(!showNewCat)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '7px 3px', borderRadius: 11, border: `1px dashed ${showNewCat ? C.blue : C.border}`, background: showNewCat ? 'rgba(96,165,250,0.06)' : 'transparent', transition: 'all .18s' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: `1px dashed ${C.border}`, background: 'transparent', color: C.text3 }}>+</div>
                  <span style={{ fontSize: 9, color: C.text3, textAlign: 'center', lineHeight: 1.2 }}>Otra</span>
                </div>
              </div>
              {showNewCat && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)} maxLength={2} style={{ width: 44, padding: '9px 0', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 18, textAlign: 'center', outline: 'none' }} />
                  <input value={newCatNombre} onChange={e => setNewCatNombre(e.target.value)} placeholder="Nombre categoría" style={{ flex: 1, padding: '9px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, outline: 'none' }} />
                  <div onClick={guardarCategoria} style={{ padding: '9px 14px', borderRadius: 12, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', color: C.blue, fontSize: 12, fontWeight: 600, cursor: savingCat ? 'not-allowed' : 'pointer', opacity: savingCat ? 0.6 : 1 }}>{savingCat ? '...' : 'Crear'}</div>
                </div>
              )}
            </div>

            {metodos.length > 0 && (
              <div style={{ marginBottom: 13 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 8 }}>Método de pago</div>
                <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 3 }}>
                  {metodos.map(m => (
                    <div key={m.id} onClick={() => setMetodoPagoId(m.id)} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 14px', background: metodoPagoId === m.id ? 'rgba(96,165,250,0.1)' : C.surface, border: `1px solid ${metodoPagoId === m.id ? 'rgba(96,165,250,0.3)' : C.border}`, borderRadius: 14, cursor: 'pointer', minWidth: 68 }}>
                      <span style={{ fontSize: 22 }}>{m.tipo === 'efectivo' ? '💵' : m.tipo === 'digital' ? '📱' : '💳'}</span>
                      <span style={{ fontSize: 10, fontWeight: 500, color: metodoPagoId === m.id ? C.text : C.text2, textAlign: 'center' }}>{m.alias}</span>
                      {m.ultimos_4 && <span style={{ fontSize: 9, color: C.text3 }}>••{m.ultimos_4}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hogares.length > 0 && (
              <div style={{ marginBottom: 13 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 8 }}>Hogar compartido <span style={{ color: C.text3, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></div>
                {hogares.map(h => (
                  <div key={h.id} onClick={() => setHogarId(hogarId === h.id ? null : h.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: hogarId === h.id ? 'rgba(192,132,252,0.08)' : C.surface, border: `1px solid ${hogarId === h.id ? 'rgba(192,132,252,0.35)' : C.border}`, borderRadius: 14, cursor: 'pointer', marginBottom: 7 }}>
                    <div style={{ width: 19, height: 19, borderRadius: 6, border: `1.5px solid ${hogarId === h.id ? C.purple : C.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, background: hogarId === h.id ? C.purple : 'transparent', color: hogarId === h.id ? '#080d1a' : 'transparent' }}>✓</div>
                    <span style={{ fontSize: 19 }}>{h.emoji || '🏠'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{h.nombre}</div>
                      <div style={{ fontSize: 10.5, color: C.text2 }}>Gasto compartido</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 6 }}>Fecha y hora</div>
              <div style={{ display: 'flex', gap: 7 }}>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ flex: 1, padding: '11px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, outline: 'none' }} />
                <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={{ flex: 0.55, padding: '11px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, outline: 'none' }} />
              </div>
            </div>

            <div style={{ marginBottom: 13 }}>
              <div onClick={() => setEsRecurrente(!esRecurrente)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 13px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ fontSize: 15 }}>🔁</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Recurrente</div>
                    <div style={{ fontSize: 10.5, color: C.text2 }}>Se repite en el tiempo</div>
                  </div>
                </div>
                <div style={{ width: 38, height: 21, borderRadius: 11, background: esRecurrente ? C.green : 'rgba(255,255,255,0.1)', border: `1px solid ${esRecurrente ? C.green : C.border}`, position: 'relative', transition: 'all .25s' }}>
                  <div style={{ position: 'absolute', top: 2, left: esRecurrente ? 19 : 2, width: 15, height: 15, borderRadius: '50%', background: '#fff', transition: 'all .25s' }} />
                </div>
              </div>
            </div>

            <Inp label="Notas (opcional)" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Algún detalle adicional…" />
          </>
        )}

        {/* ── INGRESO ── */}
        {tipo === 'ingreso' && (
          <>
            <Inp label="Descripción" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Nómina marzo, Pago proyecto…" />

            <div style={{ marginBottom: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 8 }}>Categoría</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                {catsFiltradas.map(cat => (
                  <div key={cat.id} onClick={() => setCatId(cat.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '7px 3px', borderRadius: 11, border: `1px solid ${catId === cat.id ? C.border2 : 'transparent'}`, background: catId === cat.id ? C.surface2 : 'transparent', transition: 'all .18s' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: `1px solid ${C.border}`, background: cat.color_hex ? cat.color_hex + '22' : C.surface }}>{cat.emoji}</div>
                    <span style={{ fontSize: 9, color: catId === cat.id ? C.text : C.text2, textAlign: 'center', lineHeight: 1.2 }}>{cat.nombre}</span>
                  </div>
                ))}
                <div onClick={() => setShowNewCat(!showNewCat)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '7px 3px', borderRadius: 11, border: `1px dashed ${showNewCat ? C.green : C.border}`, background: showNewCat ? 'rgba(94,240,176,0.06)' : 'transparent', transition: 'all .18s' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: `1px dashed ${C.border}`, background: 'transparent', color: C.text3 }}>+</div>
                  <span style={{ fontSize: 9, color: C.text3, textAlign: 'center', lineHeight: 1.2 }}>Otra</span>
                </div>
              </div>
              {showNewCat && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)} maxLength={2} style={{ width: 44, padding: '9px 0', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 18, textAlign: 'center', outline: 'none' }} />
                  <input value={newCatNombre} onChange={e => setNewCatNombre(e.target.value)} placeholder="Nombre categoría" style={{ flex: 1, padding: '9px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, outline: 'none' }} />
                  <div onClick={guardarCategoria} style={{ padding: '9px 14px', borderRadius: 12, background: 'rgba(94,240,176,0.15)', border: '1px solid rgba(94,240,176,0.3)', color: C.green, fontSize: 12, fontWeight: 600, cursor: savingCat ? 'not-allowed' : 'pointer', opacity: savingCat ? 0.6 : 1 }}>{savingCat ? '...' : 'Crear'}</div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 8 }}>Fuente de ingreso</div>
              <input value={fuenteTrabajo} onChange={e => setFuenteTrabajo(e.target.value)} placeholder="Ej: Kiwi Studio, Freelance, Inversiones…" style={{ width: '100%', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, fontWeight: 300, outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 6 }}>Fecha</div>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ width: '100%', padding: '11px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, outline: 'none' }} />
            </div>

            <Inp label="Notas (opcional)" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Algún detalle adicional…" />
          </>
        )}

        {/* ── DEUDA ── */}
        {tipo === 'deuda' && (
          <>
            <Inp label="Nombre de la deuda" value={deudaNombre} onChange={e => setDeudaNombre(e.target.value)} placeholder="Ej: Crédito Bancolombia, Préstamo…" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 13 }}>
              {[
                { label: 'Deuda total', val: montoTotal, set: setMontoTotal, ph: '10.000.000', money: true },
                { label: 'Valor cuota', val: cuotaMensual, set: setCuotaMensual, ph: '500.000', money: true },
                { label: 'Ya pagado', val: montoPagado, set: setMontoPagado, ph: '0', money: true },
                { label: 'Total cuotas', val: cuotasTotales, set: setCuotasTotales, ph: '24', money: false },
                { label: 'Día de pago', val: diaPago, set: setDiaPago, ph: '15', money: false },
              ].map(({ label, val, set, ph, money }) => (
                <div key={label}>
                  <div style={{ fontSize: 9.5, color: C.text3, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{label}</div>
                  <input value={money ? fmtMoney(val, currency) : val} onChange={e => money ? handleMoney(e.target.value, set) : set(e.target.value)} type={money ? 'text' : 'number'} inputMode="numeric" placeholder={ph} style={{ width: '100%', padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none' }} />
                </div>
              ))}
            </div>

            {montoTotal && cuotaMensual && cuotasTotales && (() => {
              const total = rawToNum(montoTotal)
              const pagado = rawToNum(montoPagado)
              const cuota = rawToNum(cuotaMensual)
              const cuotasPagadas = cuota > 0 ? Math.floor(pagado / cuota) : 0
              const cuotasRest = Math.max(0, parseInt(cuotasTotales) - cuotasPagadas)
              const pendiente = Math.max(0, total - pagado)
              return (
                <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.14)', borderRadius: 14, padding: '12px 14px', marginBottom: 13 }}>
                  {[
                    ['Cuotas pagadas', String(cuotasPagadas)],
                    ['Cuotas restantes', String(cuotasRest)],
                    ['Saldo pendiente', `$${pendiente.toLocaleString('es-CO')}`],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                      <span style={{ color: C.text2 }}>{label}</span>
                      <span style={{ color: C.amber }}>{val}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </>
        )}

        {/* Botón guardar */}
        <button onClick={guardar} disabled={loading} style={{ width: '100%', padding: '15px', background: tipo === 'gasto' ? 'rgba(248,113,113,0.2)' : tipo === 'ingreso' ? 'rgba(94,240,176,0.2)' : 'rgba(251,191,36,0.2)', border: `1px solid ${tipoColor}40`, borderRadius: 14, color: tipoColor, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: loading ? 0.7 : 1, marginTop: 8 }}>
          {loading ? 'Guardando…' : tipoLabel}
        </button>

      </div>

      {/* Bottom nav - mobile only */}
      <div className="bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 80, background: 'rgba(8,13,26,0.88)', backdropFilter: 'blur(30px)', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 10, zIndex: 10 }}>
        {[
          { icon: <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>, label: 'Inicio', to: '/home' },
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, label: 'Gastos', to: '/movimientos' },
        ].map(({ icon, label, to }) => (
          <div key={label} onClick={() => navigate(to)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 12px', color: C.text3 }}>
            {icon}
            <span style={{ fontSize: 9.5 }}>{label}</span>
          </div>
        ))}
        <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginTop: -8, boxShadow: '0 6px 18px rgba(94,240,176,0.25)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#080d1a" strokeWidth="2.5" width="20" height="20"><path d="M12 5v14M5 12h14" /></svg>
        </div>
        {[
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>, label: 'Hogar', to: '/hogar' },
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: 'Perfil', to: '/perfil' },
        ].map(({ icon, label, to }) => (
          <div key={label} onClick={() => navigate(to)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 12px', color: C.text3 }}>
            {icon}
            <span style={{ fontSize: 9.5 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}