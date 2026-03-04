import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const C = {
  bg: '#080d1a', surface: 'rgba(255,255,255,0.05)', surface2: 'rgba(255,255,255,0.09)',
  border: 'rgba(255,255,255,0.09)', border2: 'rgba(255,255,255,0.17)',
  text: '#eef2ff', text2: 'rgba(238,242,255,0.52)', text3: 'rgba(238,242,255,0.28)',
  green: '#5ef0b0', blue: '#60a5fa', purple: '#c084fc', red: '#f87171', amber: '#fbbf24'
}

const AVATARES = ['🦊','🌙','🐻','🐺','🦁','🐯','🦋','🌸','⚡','🎯','🚀','🌊']
const DIAS_RAPIDOS = [1, 5, 10, 15, 20, 25]
const DURACIONES = [
  { val: 7, label: '7 días' }, { val: 14, label: '14 días' },
  { val: 28, label: '28 días' }, { val: 30, label: '30 días' }
]
const COLORES_TARJETA = ['#60a5fa','#c084fc','#5ef0b0','#f87171','#fbbf24','#e5e7eb','#1e293b']
const TASA_PRESETS = [
  { val: 4500, label: '$4.500 · hoy' }, { val: 4800, label: '$4.800 · conserv.' },
  { val: 5000, label: '$5.000 · pesimista' }, { val: 5200, label: '$5.200 · extremo' }
]

/* ── Toast ── */
function Toast({ msg }) {
  return msg ? (
    <div style={{ position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)', background: 'rgba(12,18,32,.97)', border: `1px solid ${C.border2}`, borderRadius: 26, padding: '10px 18px', fontSize: 12, color: C.text, backdropFilter: 'blur(20px)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.purple }} />{msg}
    </div>
  ) : null
}

/* ── Toggle switch ── */
function Toggle({ on, onClick }) {
  return (
    <div onClick={onClick} style={{ width: 38, height: 21, borderRadius: 11, background: on ? C.purple : 'rgba(255,255,255,0.1)', border: `1px solid ${on ? C.purple : C.border}`, position: 'relative', transition: 'all .25s', flexShrink: 0, cursor: 'pointer' }}>
      <div style={{ position: 'absolute', top: 2, left: on ? 19 : 2, width: 15, height: 15, borderRadius: '50%', background: '#fff', transition: 'all .25s' }} />
    </div>
  )
}

/* ── Setting row ── */
function SRow({ icon, bg, title, sub, value, onClick, danger, toggle, toggleOn }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: C.surface, border: `1px solid ${danger ? 'rgba(248,113,113,0.15)' : C.border}`, borderRadius: 14, marginBottom: 6, cursor: 'pointer', transition: 'all .2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, background: bg || 'rgba(255,255,255,0.06)' }}>{icon}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: danger ? C.red : C.text }}>{title}</div>
          {sub && <div style={{ fontSize: 10.5, color: C.text2, marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {value && <span style={{ fontSize: 12, color: C.text2 }}>{value}</span>}
        {toggle ? <Toggle on={toggleOn} /> : !danger && <span style={{ fontSize: 11, color: C.text3 }}>›</span>}
      </div>
    </div>
  )
}

/* ── Modal ── */
function Modal({ open, onClose, children }) {
  if (!open) return null
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 20 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'rgba(10,16,30,0.98)', borderRadius: '26px 26px 0 0', border: `1px solid ${C.border2}`, zIndex: 21, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border2, margin: '12px auto 0', flexShrink: 0 }} />
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 20px 36px' }}>
          {children}
        </div>
      </div>
    </>
  )
}

/* ── Save button ── */
function SaveBtn({ onClick, loading, label = 'Guardar', color = C.purple }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ width: '100%', padding: 14, borderRadius: 14, fontFamily: 'DM Sans, sans-serif', fontSize: 14.5, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', border: 'none', background: `linear-gradient(135deg, ${color}, #a855f7)`, color: '#fff', marginTop: 10, opacity: loading ? 0.7 : 1 }}>
      {loading ? 'Guardando…' : label}
    </button>
  )
}

/* ── Modal field label ── */
function MFL({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 7 }}>{children}</div>
}

/* ── Pill options ── */
function Pills({ options, selected, onSelect, color = C.purple }) {
  const colorBg = color === C.blue ? 'rgba(96,165,250,0.14)' : 'rgba(192,132,252,0.14)'
  const colorBorder = color === C.blue ? 'rgba(96,165,250,0.3)' : 'rgba(192,132,252,0.3)'
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(o => {
        const val = typeof o === 'object' ? o.val : o
        const label = typeof o === 'object' ? o.label : o
        const active = selected === val
        return (
          <div key={val} onClick={() => onSelect(val)} style={{ padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1px solid ${active ? colorBorder : C.border}`, background: active ? colorBg : C.surface, color: active ? color : C.text2, transition: 'all .2s' }}>{label}</div>
        )
      })}
    </div>
  )
}

/* ── Toggle row for modals ── */
function TogRow({ icon, title, sub, on, onToggle }) {
  return (
    <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 13px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 7, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
          {sub && <div style={{ fontSize: 10.5, color: C.text2, marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      <Toggle on={on} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */
export default function Perfil() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [metodos, setMetodos] = useState([])
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modales
  const [modPerfil, setModPerfil] = useState(false)
  const [modCiclo, setModCiclo] = useState(false)
  const [modMetodo, setModMetodo] = useState(false)
  const [modTasa, setModTasa] = useState(false)

  // Form perfil
  const [nombre, setNombre] = useState('')
  const [avatar, setAvatar] = useState('🦊')
  const [moneda, setMoneda] = useState('COP')
  const [fotoUrl, setFotoUrl] = useState(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)

  // Form ciclo
  const [cicloDia, setCicloDia] = useState(1)
  const [cicloDuracion, setCicloDuracion] = useState(30)

  // Form método de pago
  const [metodoAlias, setMetodoAlias] = useState('')
  const [metodoTipo, setMetodoTipo] = useState('credito')
  const [metodoUltimos4, setMetodoUltimos4] = useState('')
  const [metodoColor, setMetodoColor] = useState('#60a5fa')
  const [metodoApplePay, setMetodoApplePay] = useState(false)
  const [metodoGooglePay, setMetodoGooglePay] = useState(false)
  const [metodoRecurrente, setMetodoRecurrente] = useState(false)
  const [metodoDefault, setMetodoDefault] = useState(false)

  // Form tasa
  const [tasa, setTasa] = useState(4500)
  const [tasaTipo, setTasaTipo] = useState('manual')

  // Preferencias
  const [prefNotif, setPrefNotif] = useState(true)
  const [prefBiom, setPrefBiom] = useState(true)

  // API Token (Atajos iOS)
  const [apiToken, setApiToken] = useState('')
  const [modAtajos, setModAtajos] = useState(false)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2600) }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      setUser(user)

      const { data: p } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
      if (p) {
        setPerfil(p)
        setNombre(p.nombre || '')
        setAvatar(p.avatar_emoji || '🦊')
        setMoneda(p.moneda_preferida || 'COP')
        setCicloDia(p.ciclo_dia_inicio || 1)
        setCicloDuracion(p.ciclo_duracion_dias || 30)
        if (p.foto_url) setFotoUrl(p.foto_url)
        if (p.api_token) setApiToken(p.api_token)
      }

      const { data: m } = await supabase.from('metodos_pago').select('*').eq('usuario_id', user.id)
      setMetodos(m || [])
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  /* ── Subir foto ── */
  async function subirFoto(file) {
    if (!file) return
    setSubiendoFoto(true)
    // Recortar y comprimir en canvas
    const bitmap = await createImageBitmap(file)
    const size = 300
    const canvas = document.createElement('canvas')
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext('2d')
    const min = Math.min(bitmap.width, bitmap.height)
    const sx = (bitmap.width - min) / 2
    const sy = (bitmap.height - min) / 2
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(bitmap, sx, sy, min, min, 0, 0, size, size)
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.88))
    const path = `${user.id}/avatar.jpg`
    const { error } = await supabase.storage.from('avatares').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (error) { showToast('❌ Error al subir foto'); setSubiendoFoto(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatares').getPublicUrl(path)
    const url = publicUrl + '?t=' + Date.now()
    setFotoUrl(url)
    setSubiendoFoto(false)
    showToast('✅ Foto cargada')
  }

  /* ── Save handlers ── */
  async function guardarPerfil() {
    setSaving(true)
    await supabase.from('usuarios').update({ nombre, avatar_emoji: avatar, moneda_preferida: moneda, foto_url: fotoUrl || null }).eq('id', user.id)
    setPerfil(p => ({ ...p, nombre, avatar_emoji: avatar, moneda_preferida: moneda, foto_url: fotoUrl }))
    setSaving(false)
    setModPerfil(false)
    showToast(`✅ Perfil de ${nombre} guardado`)
  }

  async function guardarCiclo() {
    setSaving(true)
    await supabase.from('usuarios').update({ ciclo_dia_inicio: cicloDia, ciclo_duracion_dias: cicloDuracion }).eq('id', user.id)
    setPerfil(p => ({ ...p, ciclo_dia_inicio: cicloDia, ciclo_duracion_dias: cicloDuracion }))
    setSaving(false)
    setModCiclo(false)
    showToast(`✅ Ciclo actualizado · inicia el día ${cicloDia}`)
  }

  async function guardarMetodo() {
    if (!metodoAlias) { showToast('⚠️ Escribí un alias'); return }
    setSaving(true)
    const { data } = await supabase.from('metodos_pago').insert({
      usuario_id: user.id, alias: metodoAlias, tipo: metodoTipo,
      ultimos_4: metodoUltimos4 || null, color_hex: metodoColor
    }).select().single()
    if (data) setMetodos(m => [...m, data])
    setSaving(false)
    setModMetodo(false)
    setMetodoAlias(''); setMetodoUltimos4(''); setMetodoColor('#60a5fa')
    setMetodoApplePay(false); setMetodoGooglePay(false)
    setMetodoRecurrente(false); setMetodoDefault(false)
    showToast(`✅ "${metodoAlias}" guardado`)
  }

  async function eliminarMetodo(id) {
    await supabase.from('metodos_pago').delete().eq('id', id)
    setMetodos(m => m.filter(x => x.id !== id))
    showToast('🗑 Método eliminado')
  }

  async function generarToken() {
    const token = crypto.randomUUID()
    await supabase.from('usuarios').update({ api_token: token }).eq('id', user.id)
    setApiToken(token)
    setPerfil(p => ({ ...p, api_token: token }))
    showToast('✅ Token generado')
  }

  function copiarTexto(text, label) {
    navigator.clipboard.writeText(text).then(() => showToast(`📋 ${label} copiado`))
  }

  async function cerrarSesion() {
    localStorage.removeItem('clara_session')
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  /* ── Cycle calculator ── */
  function getCycleInfo() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    let start = new Date(year, month, cicloDia)
    if (now < start) start = new Date(year, month - 1, cicloDia)
    const end = new Date(start)
    end.setDate(end.getDate() + cicloDuracion - 1)
    const diasTranscurridos = Math.floor((now - start) / 86400000) + 1
    const diasRestantes = Math.max(0, Math.floor((end - now) / 86400000))
    const pct = Math.min(100, Math.round((diasTranscurridos / cicloDuracion) * 100))
    const fmt = (d) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    const fmtLong = (d) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
    return { start, end, diasTranscurridos, diasRestantes, pct, fmt, fmtLong }
  }

  const ciclo = getCycleInfo()

  /* ── Helpers ── */
  const tipoIcon = (t) => t === 'efectivo' ? '💵' : t === 'digital' ? '📱' : '💳'
  const tipoLabel = (t) => t === 'efectivo' ? 'Efectivo' : t === 'digital' ? 'Digital' : t === 'debito' ? 'Débito' : 'Crédito'
  const tipoBadgeStyle = (t) => {
    if (t === 'efectivo') return { background: 'rgba(94,240,176,0.1)', color: C.green, borderColor: 'rgba(94,240,176,0.2)' }
    if (t === 'digital') return { background: 'rgba(251,191,36,0.1)', color: C.amber, borderColor: 'rgba(251,191,36,0.2)' }
    if (t === 'debito') return { background: 'rgba(96,165,250,0.1)', color: C.blue, borderColor: 'rgba(96,165,250,0.2)' }
    return { background: 'rgba(192,132,252,0.1)', color: C.purple, borderColor: 'rgba(192,132,252,0.2)' }
  }
  const tipoIconBg = (t) => {
    if (t === 'efectivo') return 'rgba(94,240,176,0.12)'
    if (t === 'digital') return 'rgba(251,191,36,0.12)'
    if (t === 'debito') return 'rgba(96,165,250,0.12)'
    return 'rgba(192,132,252,0.12)'
  }

  const isCard = metodoTipo === 'credito' || metodoTipo === 'debito'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'DM Sans, sans-serif', padding: '60px 18px 90px' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:.06}50%{opacity:.13}}`}</style>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'white', animation: 'pulse 1.4s ease infinite', marginBottom: 14 }} />
        <div style={{ height: 22, width: 140, borderRadius: 10, background: 'white', animation: 'pulse 1.4s ease infinite', marginBottom: 8 }} />
        <div style={{ height: 14, width: 200, borderRadius: 8, background: 'white', animation: 'pulse 1.4s ease infinite', marginBottom: 28 }} />
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => <div key={i} style={{ height: 56, borderRadius: 14, background: 'white', animation: 'pulse 1.4s ease infinite', animationDelay: `${i*0.08}s` }} />)}
        </div>
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
        .page-content { padding-bottom: 90px; }
        .mobile-header { display: flex; }
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .bottom-nav { display: none !important; }
          .page-content { max-width: 900px; margin: 0 auto; padding-bottom: 40px; }
          .mobile-header { display: none !important; }
        }
      `}</style>
      <Toast msg={toast} />

      {/* Desktop TopNav */}
      <div className="desktop-nav" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 21, background: `linear-gradient(135deg, ${C.text}, ${C.purple})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Clara</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['Inicio', '/home', false], ['Gastos', '/movimientos', false], ['Plan', '/plan', false], ['Hogar', '/hogar', false]].map(([label, to, active]) => (
            <button key={label} onClick={() => navigate(to)} style={{ padding: '7px 13px', borderRadius: 10, fontSize: 12, color: C.text2, cursor: 'pointer', border: '1px solid transparent', background: 'transparent', fontFamily: 'DM Sans, sans-serif' }}>{label}</button>
          ))}
        </div>
        <div onClick={() => setModPerfil(true)} style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${C.purple}, ${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer', overflow: 'hidden' }}>
          {perfil?.foto_url ? <img src={perfil.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : perfil?.avatar_emoji || '👤'}
        </div>
      </div>

      {/* Content */}
      <div className="page-content" style={{ position: 'relative', zIndex: 1 }}>

        {/* Mobile header */}
        <div className="mobile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 10px' }}>
          <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, letterSpacing: '-.02em' }}>Perfil</div>
          <div onClick={() => setModPerfil(true)} style={{ width: 34, height: 34, borderRadius: 11, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
        </div>

            {/* ① Perfil card */}
            <div onClick={() => setModPerfil(true)} style={{ margin: '0 18px 16px', padding: 20, borderRadius: 24, background: 'linear-gradient(135deg,rgba(192,132,252,0.18),rgba(96,165,250,0.1))', border: '1px solid rgba(192,132,252,0.22)', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'all .2s', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(192,132,252,0.3),rgba(96,165,250,0.2))', border: '2px solid rgba(192,132,252,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, overflow: 'hidden' }}>
  {perfil?.foto_url ? <img src={perfil.foto_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : perfil?.avatar_emoji || '🦊'}
</div>
                <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, border: '2px solid rgba(8,13,26,0.9)' }}>✏️</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, letterSpacing: '-.02em', marginBottom: 2 }}>{perfil?.nombre || 'Tu nombre'}</div>
                <div style={{ fontSize: 11.5, color: C.text2, marginBottom: 8 }}>{user?.email}</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div><div style={{ fontSize: 14, fontWeight: 600 }}>{metodos.length}</div><div style={{ fontSize: 9.5, color: C.text3 }}>métodos</div></div>
                  <div><div style={{ fontSize: 14, fontWeight: 600 }}>Ciclo {ciclo.diasTranscurridos}</div><div style={{ fontSize: 9.5, color: C.text3 }}>día actual</div></div>
                </div>
              </div>
            </div>

            {/* ② Ciclo de pago */}
            <div style={{ padding: '0 18px', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Ciclo de pago</span>
                <span onClick={() => setModCiclo(true)} style={{ fontSize: 11, color: C.purple, cursor: 'pointer' }}>Editar</span>
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '15px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{ciclo.fmtLong(ciclo.start)} → {ciclo.fmtLong(ciclo.end)}</div>
                    <div style={{ fontSize: 10.5, color: C.text2, marginTop: 2 }}>Día {ciclo.diasTranscurridos} de {cicloDuracion} · comienza el {cicloDia} de cada mes</div>
                  </div>
                  <div style={{ fontSize: 10, padding: '4px 10px', borderRadius: 20, background: 'rgba(94,240,176,0.1)', border: '1px solid rgba(94,240,176,0.2)', color: C.green, fontWeight: 600, flexShrink: 0 }}>Activo</div>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
                  <div style={{ height: '100%', width: `${ciclo.pct}%`, borderRadius: 3, background: `linear-gradient(90deg, ${C.purple}, ${C.blue})`, transition: 'width .6s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.text3, marginBottom: 12 }}>
                  <span>{ciclo.pct}% transcurrido</span>
                  <span>{ciclo.diasRestantes} días restantes</span>
                </div>
                {/* Duration selector inline */}
                <div>
                  <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 7 }}>Duración del ciclo</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DURACIONES.map(d => (
                      <div key={d.val} onClick={() => { setCicloDuracion(d.val); showToast(`📅 Ciclo de ${d.label}`) }} style={{ padding: '6px 13px', borderRadius: 20, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', border: `1px solid ${cicloDuracion === d.val ? 'rgba(192,132,252,0.3)' : C.border}`, background: cicloDuracion === d.val ? 'rgba(192,132,252,0.15)' : C.surface, color: cicloDuracion === d.val ? C.purple : C.text2, transition: 'all .2s' }}>{d.label}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ③ Métodos de pago */}
            <div style={{ padding: '0 18px', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Métodos de pago</span>
                <span onClick={() => setModMetodo(true)} style={{ fontSize: 11, color: C.purple, cursor: 'pointer' }}>+ Añadir</span>
              </div>
              {metodos.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 7, cursor: 'pointer', transition: 'all .2s' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, border: `1px solid ${C.border}`, background: tipoIconBg(m.tipo) }}>{tipoIcon(m.tipo)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{m.alias}</div>
                    <div style={{ fontSize: 10.5, color: C.text2, marginTop: 1 }}>
                      {m.ultimos_4 ? `••${m.ultimos_4} · ` : ''}{tipoLabel(m.tipo)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 10, fontWeight: 600, border: '1px solid', ...tipoBadgeStyle(m.tipo) }}>{tipoLabel(m.tipo)}</span>
                    <div onClick={(e) => { e.stopPropagation(); eliminarMetodo(m.id) }} style={{ fontSize: 10, color: C.red, padding: '2px 7px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', cursor: 'pointer' }}>Quitar</div>
                  </div>
                </div>
              ))}
              <div onClick={() => setModMetodo(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: `1.5px dashed rgba(192,132,252,0.25)`, borderRadius: 14, cursor: 'pointer', transition: 'all .2s', color: C.text3 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(192,132,252,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>+</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Añadir método de pago</div>
                  <div style={{ fontSize: 10.5, color: C.text3, marginTop: 1 }}>Tarjeta, billetera, efectivo…</div>
                </div>
              </div>
            </div>

            {/* ④ Tasas de conversión */}
            <div style={{ padding: '0 18px', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Tasas de conversión COP/USD</span>
                <span onClick={() => setModTasa(true)} style={{ fontSize: 11, color: C.purple, cursor: 'pointer' }}>+ Período</span>
              </div>
              {/* Current cycle rate */}
              <div onClick={() => setModTasa(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, cursor: 'pointer', marginBottom: 7 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, background: 'rgba(94,240,176,0.12)' }}>📅</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{ciclo.fmtLong(ciclo.start)} → {ciclo.fmtLong(ciclo.end)}</div>
                  <div style={{ fontSize: 10.5, color: C.text2, marginTop: 1 }}>Ciclo actual · tasa manual</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.blue }}>${tasa.toLocaleString('es-CO')}</div>
                  <div style={{ fontSize: 9.5, color: C.text3, marginTop: 1 }}>Manual</div>
                </div>
              </div>
            </div>

            {/* ⑤ Preferencias */}
            <div style={{ padding: '0 18px', marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Preferencias</div>
              <SRow icon="🔔" bg="rgba(251,191,36,0.12)" title="Notificaciones" sub="Alertas de gastos y deudas" toggle toggleOn={prefNotif} onClick={() => setPrefNotif(!prefNotif)} />
              <SRow icon="🔒" bg="rgba(94,240,176,0.12)" title="Face ID / Touch ID" sub="Para abrir la app" toggle toggleOn={prefBiom} onClick={() => setPrefBiom(!prefBiom)} />
              <SRow icon="💱" bg="rgba(96,165,250,0.12)" title="Moneda por defecto" sub="Cómo se muestran los valores" value={`🇨🇴 ${moneda}`} onClick={() => setModPerfil(true)} />
              <SRow icon="📤" bg="rgba(192,132,252,0.12)" title="Exportar datos" sub="CSV · PDF · Excel" onClick={() => showToast('📤 Exportar datos como CSV')} />
            </div>

            {/* ⑥ Atajos iOS / Automatización */}
            <div style={{ padding: '0 18px', marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Automatización</div>
              <SRow icon="⚡" bg="rgba(251,191,36,0.12)" title="Atajos de iOS" sub={apiToken ? 'Configurado · Toca para ver' : 'Registra gastos automáticamente'} onClick={() => setModAtajos(true)} />
            </div>

            {/* ⑦ Cuenta */}
            <div style={{ padding: '0 18px', marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Cuenta</div>
              <SRow icon="📧" title="Email" sub={user?.email} onClick={() => showToast('📧 ' + user?.email)} />
              <SRow icon="🔑" title="Contraseña" sub="Última actualización: hace 3 meses" onClick={() => showToast('🔑 Cambiar contraseña')} />
              <SRow icon="🚪" bg="rgba(248,113,113,0.1)" title="Cerrar sesión" danger onClick={cerrarSesion} />
            </div>

            <div style={{ height: 10 }} />

          {/* ══ MODAL: Editar perfil ══ */}
          <Modal open={modPerfil} onClose={() => setModPerfil(false)}>
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, marginBottom: 3, paddingTop: 14 }}>Editar perfil</div>
            <div style={{ fontSize: 12.5, color: C.text2, marginBottom: 20 }}>Tu nombre y avatar en Clara</div>

            {/* Avatar section */}
            <div style={{ marginBottom: 14 }}>
              <MFL>Foto de perfil</MFL>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(192,132,252,0.3),rgba(96,165,250,0.2))', border: '2.5px solid rgba(192,132,252,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, overflow: 'hidden' }}>
                    {fotoUrl ? <img src={fotoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatar}
                  </div>
                  <label style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, border: '2px solid rgba(8,13,26,0.9)', cursor: 'pointer' }}>
                    {subiendoFoto ? '⏳' : '📷'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => subirFoto(e.target.files[0])} />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <label style={{ padding: '7px 14px', borderRadius: 10, background: 'rgba(192,132,252,0.14)', border: '1px solid rgba(192,132,252,0.28)', color: C.purple, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    📷 Subir foto
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => subirFoto(e.target.files[0])} />
                  </label>
                  {fotoUrl && <button onClick={() => setFotoUrl(null)} style={{ padding: '7px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: C.red, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>✕ Quitar</button>}
                </div>
                <div style={{ fontSize: 10.5, color: C.text3 }}>La foto se recorta automáticamente en círculo</div>
              </div>
              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 10, color: C.text3 }}>O usá un emoji</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6 }}>
                {AVATARES.map(e => (
                  <div key={e} onClick={() => { setAvatar(e); setFotoUrl(null) }} style={{ width: 40, height: 40, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', border: `1px solid ${avatar === e && !fotoUrl ? 'rgba(192,132,252,0.4)' : C.border}`, background: avatar === e && !fotoUrl ? C.surface2 : C.surface, transform: avatar === e && !fotoUrl ? 'scale(1.08)' : 'scale(1)', transition: 'all .18s' }}>{e}</div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <MFL>Nombre</MFL>
              <input value={nombre} onChange={e => setNombre(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 300, outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <MFL>Email</MFL>
              <input value={user?.email || ''} readOnly style={{ width: '100%', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text2, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 300, outline: 'none', opacity: 0.6 }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <MFL>Moneda principal</MFL>
              <Pills options={[{ val: 'COP', label: '🇨🇴 COP' }, { val: 'USD', label: '🇺🇸 USD' }]} selected={moneda} onSelect={setMoneda} />
            </div>

            <SaveBtn onClick={guardarPerfil} loading={saving} label="Guardar perfil" />
          </Modal>

          {/* ══ MODAL: Ciclo ══ */}
          <Modal open={modCiclo} onClose={() => setModCiclo(false)}>
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, marginBottom: 3, paddingTop: 14 }}>Ciclo de pago</div>
            <div style={{ fontSize: 12.5, color: C.text2, marginBottom: 20 }}>Define cuándo empieza y cuánto dura tu período financiero</div>

            <div style={{ marginBottom: 14 }}>
              <MFL>Fecha de inicio</MFL>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: C.text2 }}>El ciclo empieza el día</span>
                <input value={cicloDia} onChange={e => setCicloDia(parseInt(e.target.value) || 1)} type="number" min="1" max="31" style={{ width: 100, padding: '7px 10px', background: 'rgba(0,0,0,0.25)', border: `1px solid ${C.border2}`, borderRadius: 9, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, textAlign: 'right', outline: 'none' }} />
                <span style={{ fontSize: 12, color: C.text3 }}>de cada mes</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DIAS_RAPIDOS.map(d => (
                  <div key={d} onClick={() => setCicloDia(d)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', border: `1px solid ${cicloDia === d ? 'rgba(96,165,250,0.3)' : C.border}`, background: cicloDia === d ? 'rgba(96,165,250,0.14)' : C.surface, color: cicloDia === d ? C.blue : C.text2 }}>Día {d}</div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <MFL>Duración del ciclo</MFL>
              <Pills options={[...DURACIONES, { val: 'custom', label: 'Custom' }]} selected={cicloDuracion} onSelect={(v) => { if (v !== 'custom') setCicloDuracion(v); else showToast('📅 Duración personalizada') }} />
            </div>

            {/* Preview */}
            <div style={{ padding: 13, background: 'rgba(94,240,176,0.06)', border: '1px solid rgba(94,240,176,0.15)', borderRadius: 14, marginBottom: 4 }}>
              <div style={{ fontSize: 11, color: C.text2, lineHeight: 1.6 }}>
                📅 Con estas fechas tu ciclo actual sería<br/>
                <strong style={{ color: C.green }}>{ciclo.fmtLong(ciclo.start)} → {ciclo.fmtLong(ciclo.end)}</strong> · {cicloDuracion} días<br/>
                <span style={{ color: C.text3 }}>Día {ciclo.diasTranscurridos} de {cicloDuracion} · {ciclo.diasRestantes} días restantes</span>
              </div>
            </div>

            <SaveBtn onClick={guardarCiclo} loading={saving} label="Guardar ciclo" />
          </Modal>

          {/* ══ MODAL: Método de pago ══ */}
          <Modal open={modMetodo} onClose={() => setModMetodo(false)}>
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, marginBottom: 3, paddingTop: 14 }}>Nuevo método de pago</div>
            <div style={{ fontSize: 12.5, color: C.text2, marginBottom: 20 }}>Tarjeta, billetera digital o efectivo</div>

            <div style={{ marginBottom: 14 }}>
              <MFL>Tipo</MFL>
              <Pills options={[
                { val: 'credito', label: '💳 Crédito' }, { val: 'debito', label: '🏦 Débito' },
                { val: 'digital', label: '📱 Digital' }, { val: 'efectivo', label: '💵 Efectivo' }
              ]} selected={metodoTipo} onSelect={setMetodoTipo} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <MFL>Alias / Nombre</MFL>
              <input value={metodoAlias} onChange={e => setMetodoAlias(e.target.value)} placeholder={isCard ? 'Ej: Visa Bancolombia viajes' : metodoTipo === 'digital' ? 'Ej: Nequi, Daviplata…' : 'Ej: Efectivo, Billetera…'} style={{ width: '100%', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 300, outline: 'none' }} />
            </div>

            {isCard && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <MFL>Últimos 4 dígitos</MFL>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }}>
                    <span style={{ flex: 1, fontSize: 12.5, color: C.text2 }}>Número de tarjeta ••••</span>
                    <input value={metodoUltimos4} onChange={e => setMetodoUltimos4(e.target.value)} type="number" placeholder="4821" maxLength="4" style={{ width: 100, padding: '7px 10px', background: 'rgba(0,0,0,0.25)', border: `1px solid ${C.border2}`, borderRadius: 9, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, textAlign: 'right', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <MFL>Color de la tarjeta</MFL>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {COLORES_TARJETA.map(c => (
                      <div key={c} onClick={() => setMetodoColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', transition: 'all .2s', border: metodoColor === c ? '2px solid rgba(255,255,255,0.5)' : c === '#1e293b' ? '1px solid rgba(255,255,255,0.2)' : '2px solid transparent', transform: metodoColor === c ? 'scale(1.15)' : 'scale(1)' }} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Wallet toggles (cards only) */}
            {isCard && (
              <div style={{ marginBottom: 14 }}>
                <MFL>Disponible en wallets</MFL>
                <TogRow icon="🍎" title="Apple Pay" sub="Pagos con iPhone o Apple Watch" on={metodoApplePay} onToggle={() => setMetodoApplePay(!metodoApplePay)} />
                <TogRow icon="🤖" title="Google Pay" sub="Pagos con Android" on={metodoGooglePay} onToggle={() => setMetodoGooglePay(!metodoGooglePay)} />
              </div>
            )}

            {/* Behavior toggles */}
            <div style={{ marginBottom: 14 }}>
              <MFL>Comportamiento</MFL>
              <TogRow icon="🔁" title="Pago recurrente" sub="Asociar a gastos fijos del mes" on={metodoRecurrente} onToggle={() => setMetodoRecurrente(!metodoRecurrente)} />
              <TogRow icon="⭐" title="Método por defecto" sub="Preseleccionado al agregar gastos" on={metodoDefault} onToggle={() => setMetodoDefault(!metodoDefault)} />
            </div>

            <SaveBtn onClick={guardarMetodo} loading={saving} label="Guardar método" />
          </Modal>

          {/* ══ MODAL: Tasa ══ */}
          <Modal open={modTasa} onClose={() => setModTasa(false)}>
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, marginBottom: 3, paddingTop: 14 }}>Tasa de conversión</div>
            <div style={{ fontSize: 12.5, color: C.text2, marginBottom: 20 }}>Define el valor del dólar para un período específico</div>

            <div style={{ marginBottom: 14 }}>
              <MFL>Tipo de tasa</MFL>
              <Pills options={[
                { val: 'manual', label: 'Manual' }, { val: 'conservador', label: 'Conservador' },
                { val: 'pesimista', label: 'Pesimista' }, { val: 'mercado', label: 'Mercado actual' }
              ]} selected={tasaTipo} onSelect={(t) => {
                setTasaTipo(t)
                const vals = { manual: 4500, conservador: 4800, pesimista: 5000, mercado: 4520 }
                if (vals[t]) setTasa(vals[t])
              }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <MFL>Valor COP por 1 USD</MFL>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: C.text2 }}>1 USD =</span>
                <input value={tasa} onChange={e => setTasa(parseFloat(e.target.value) || 4500)} type="number" style={{ width: 120, padding: '7px 10px', background: 'rgba(0,0,0,0.25)', border: `1px solid ${C.border2}`, borderRadius: 9, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, textAlign: 'right', outline: 'none' }} />
                <span style={{ fontSize: 12, color: C.text3 }}>COP</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TASA_PRESETS.map(p => (
                  <div key={p.val} onClick={() => setTasa(p.val)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', border: `1px solid ${tasa === p.val ? 'rgba(96,165,250,0.3)' : C.border}`, background: tasa === p.val ? 'rgba(96,165,250,0.14)' : C.surface, color: tasa === p.val ? C.blue : C.text2 }}>{p.label}</div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ padding: 13, background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 14, marginBottom: 4 }}>
              <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Vista previa</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: C.text2 }}>$1.000.000 COP =</span>
                <span style={{ fontSize: 18, fontWeight: 600, color: C.blue }}>${Math.round(1000000 / tasa).toLocaleString('en-US')} USD</span>
              </div>
            </div>

            <SaveBtn onClick={() => { setModTasa(false); showToast(`✅ Tasa $${tasa.toLocaleString('es-CO')} COP guardada`) }} label="Guardar tasa" color={C.blue} />
          </Modal>

          {/* ══ MODAL: Atajos iOS ══ */}
          <Modal open={modAtajos} onClose={() => setModAtajos(false)}>
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, marginBottom: 3, paddingTop: 14 }}>⚡ Atajos de iOS</div>
            <div style={{ fontSize: 12.5, color: C.text2, marginBottom: 20 }}>Registra gastos automáticamente desde notificaciones de tu banco</div>

            {/* Step 1: Token */}
            <div style={{ marginBottom: 16 }}>
              <MFL>1. Tu token personal</MFL>
              {apiToken ? (
                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  <div style={{ flex: 1, padding: '11px 13px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, fontFamily: 'monospace', fontSize: 11, color: C.green, wordBreak: 'break-all' }}>{apiToken}</div>
                  <div onClick={() => copiarTexto(apiToken, 'Token')} style={{ padding: '11px 14px', borderRadius: 12, background: 'rgba(94,240,176,0.12)', border: '1px solid rgba(94,240,176,0.25)', color: C.green, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Copiar</div>
                </div>
              ) : (
                <button onClick={generarToken} style={{ width: '100%', padding: 13, borderRadius: 14, fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid rgba(251,191,36,0.3)`, background: 'rgba(251,191,36,0.12)', color: C.amber }}>Generar token</button>
              )}
            </div>

            {/* Step 2: URL */}
            {apiToken && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <MFL>2. URL para el Atajo</MFL>
                  <div onClick={() => copiarTexto(`${process.env.REACT_APP_SUPABASE_URL}/rest/v1/rpc/crear_gasto_rapido`, 'URL')} style={{ padding: '11px 13px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, fontFamily: 'monospace', fontSize: 10, color: C.blue, wordBreak: 'break-all', cursor: 'pointer' }}>
                    {process.env.REACT_APP_SUPABASE_URL}/rest/v1/rpc/crear_gasto_rapido
                    <span style={{ fontSize: 9, color: C.text3, display: 'block', marginTop: 4, fontFamily: 'DM Sans, sans-serif' }}>Toca para copiar</span>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <MFL>3. API Key</MFL>
                  <div onClick={() => copiarTexto(process.env.REACT_APP_SUPABASE_ANON_KEY, 'API Key')} style={{ padding: '11px 13px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, fontFamily: 'monospace', fontSize: 10, color: C.purple, wordBreak: 'break-all', cursor: 'pointer' }}>
                    {process.env.REACT_APP_SUPABASE_ANON_KEY?.slice(0, 20)}...
                    <span style={{ fontSize: 9, color: C.text3, display: 'block', marginTop: 4, fontFamily: 'DM Sans, sans-serif' }}>Toca para copiar</span>
                  </div>
                </div>

                {/* Instructions */}
                <div style={{ marginBottom: 16 }}>
                  <MFL>4. Configurar en Atajos de iOS</MFL>
                  <div style={{ padding: '13px 14px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 14 }}>
                    {[
                      'Abrir app "Atajos" en tu iPhone',
                      'Pestaña "Automatización" > + Nueva',
                      'Disparador: "Notificación" de tu app bancaria',
                      'Acción: "Obtener contenido de URL"',
                      'Método: POST · URL: la de arriba',
                      'Headers: apikey + Authorization (Bearer + API Key)',
                      'Body JSON: { p_token, p_monto, p_descripcion }',
                    ].map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 9, marginBottom: i < 6 ? 8 : 0, fontSize: 11.5, color: C.text2, lineHeight: 1.4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.amber, flexShrink: 0, width: 16 }}>{i + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Test */}
                <div style={{ padding: '13px 14px', background: 'rgba(94,240,176,0.06)', border: '1px solid rgba(94,240,176,0.15)', borderRadius: 14, marginBottom: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: C.text3, marginBottom: 6 }}>Ejemplo del body JSON</div>
                  <div onClick={() => copiarTexto(JSON.stringify({ p_token: apiToken, p_monto: 45000, p_descripcion: 'Rappi' }, null, 2), 'JSON de ejemplo')} style={{ fontFamily: 'monospace', fontSize: 11, color: C.green, cursor: 'pointer', lineHeight: 1.5 }}>
                    {'{'}<br />
                    &nbsp;&nbsp;"p_token": "{apiToken.slice(0, 8)}...",<br />
                    &nbsp;&nbsp;"p_monto": 45000,<br />
                    &nbsp;&nbsp;"p_descripcion": "Rappi"<br />
                    {'}'}
                    <span style={{ fontSize: 9, color: C.text3, display: 'block', marginTop: 4, fontFamily: 'DM Sans, sans-serif' }}>Toca para copiar ejemplo completo</span>
                  </div>
                </div>
              </>
            )}
          </Modal>

      </div>{/* /page-content */}

      {/* Bottom nav - mobile only */}
      <div className="bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 80, background: 'rgba(8,13,26,0.88)', backdropFilter: 'blur(30px)', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 10, zIndex: 10 }}>
        {[
          { icon: <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>, label: 'Inicio', to: '/home' },
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, label: 'Gastos', to: '/movimientos' },
        ].map(({ icon, label, to }) => (
          <div key={label} onClick={() => navigate(to)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 12px', color: C.text3 }}>
            {icon}<span style={{ fontSize: 9.5 }}>{label}</span>
          </div>
        ))}
        <div onClick={() => navigate('/agregar')} style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginTop: -8, boxShadow: '0 6px 18px rgba(94,240,176,0.25)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#080d1a" strokeWidth="2.5" width="20" height="20"><path d="M12 5v14M5 12h14"/></svg>
        </div>
        {[
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: 'Hogar', to: '/hogar' },
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: 'Perfil', to: '/perfil', active: true },
        ].map(({ icon, label, to, active }) => (
          <div key={label} onClick={() => navigate(to)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 12px', color: active ? C.purple : C.text3 }}>
            {icon}<span style={{ fontSize: 9.5 }}>{label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}