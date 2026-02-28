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

  const montoNum = parseFloat(monto) || 0
  const montoCOP = currency === 'USD' ? montoNum * RATE : montoNum
  const montoUSD = currency === 'COP' ? montoNum / RATE : montoNum

  async function guardar() {
    if (tipo === 'deuda') {
      if (!deudaNombre || !montoTotal || !cuotaMensual) { showToast('⚠️ Completá los campos obligatorios'); return }
      setLoading(true)
      const { error } = await supabase.from('deudas').insert({
        usuario_id: user.id,
        nombre: deudaNombre,
        monto_total_cop: parseFloat(montoTotal),
        cuota_mensual_cop: parseFloat(cuotaMensual),
        cuotas_totales: parseInt(cuotasTotales) || 1,
        monto_pagado_cop: 0,
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
          {tipo !== 'deuda' ? `$${Math.round(montoCOP).toLocaleString('es-CO')}` : `$${parseFloat(montoTotal || 0).toLocaleString('es-CO')}`}
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap'); * { box-sizing: border-box; } ::-webkit-scrollbar { display: none; } input::placeholder { color: rgba(238,242,255,0.28); }`}</style>
      <Toast msg={toast} />

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(8,13,26,0.95)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
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
              <input value={monto} onChange={e => setMonto(e.target.value)} type="number" placeholder="0" style={{ fontFamily: 'DM Serif Display, serif', fontSize: 44, letterSpacing: '-0.03em', background: 'none', border: 'none', color: C.text, outline: 'none', width: 200, textAlign: 'center', caretColor: C.green }} />
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
              </div>
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
              </div>
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
                { label: 'Deuda total', val: montoTotal, set: setMontoTotal, ph: '10.000.000' },
                { label: 'Valor cuota', val: cuotaMensual, set: setCuotaMensual, ph: '500.000' },
                { label: 'Total cuotas', val: cuotasTotales, set: setCuotasTotales, ph: '24' },
                { label: 'Día de pago', val: diaPago, set: setDiaPago, ph: '15' },
              ].map(({ label, val, set, ph }) => (
                <div key={label}>
                  <div style={{ fontSize: 9.5, color: C.text3, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{label}</div>
                  <input value={val} onChange={e => set(e.target.value)} type="number" placeholder={ph} style={{ width: '100%', padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none' }} />
                </div>
              ))}
            </div>

            {montoTotal && cuotaMensual && cuotasTotales && (
              <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.14)', borderRadius: 14, padding: '12px 14px', marginBottom: 13 }}>
                {[
                  ['Cuotas pagadas', '0'],
                  ['Cuotas restantes', cuotasTotales],
                  ['Saldo pendiente', `$${parseFloat(montoTotal || 0).toLocaleString('es-CO')}`],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: C.text2 }}>{label}</span>
                    <span style={{ color: C.amber }}>{val}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Botón guardar */}
        <button onClick={guardar} disabled={loading} style={{ width: '100%', padding: '15px', background: tipo === 'gasto' ? 'rgba(248,113,113,0.2)' : tipo === 'ingreso' ? 'rgba(94,240,176,0.2)' : 'rgba(251,191,36,0.2)', border: `1px solid ${tipoColor}40`, borderRadius: 14, color: tipoColor, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: loading ? 0.7 : 1, marginTop: 8 }}>
          {loading ? 'Guardando…' : tipoLabel}
        </button>

      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 70, background: 'rgba(8,13,26,0.95)', backdropFilter: 'blur(30px)', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingTop: 8, zIndex: 10 }}>
        {[
          { icon: '🏠', label: 'Inicio', to: '/home' },
          { icon: '📊', label: 'Gastos', to: '/movimientos' },
        ].map(({ icon, label, to }) => (
          <div key={label} onClick={() => navigate(to)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', color: C.text3 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 9.5 }}>{label}</span>
          </div>
        ))}
        <div style={{ width: 46, height: 46, borderRadius: 15, background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -10, boxShadow: `0 6px 20px rgba(94,240,176,0.28)` }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#080d1a" strokeWidth="2.5" width="21" height="21"><path d="M12 5v14M5 12h14" /></svg>
        </div>
        {[
          { icon: '👥', label: 'Hogar', to: '/hogar' },
          { icon: '👤', label: 'Perfil', to: '/perfil' },
        ].map(({ icon, label, to }) => (
          <div key={label} onClick={() => navigate(to)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', color: C.text3 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 9.5 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}