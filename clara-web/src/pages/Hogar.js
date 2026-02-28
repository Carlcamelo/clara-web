import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// Colores del diseño
const C = {
  bg: '#080d1a',
  surface: 'rgba(255,255,255,0.05)',
  surface2: 'rgba(255,255,255,0.09)',
  border: 'rgba(255,255,255,0.09)',
  border2: 'rgba(255,255,255,0.17)',
  text: '#eef2ff',
  text2: 'rgba(238,242,255,0.52)',
  text3: 'rgba(238,242,255,0.28)',
  green: '#5ef0b0',
  blue: '#60a5fa',
  purple: '#c084fc',
  red: '#f87171',
  amber: '#fbbf24',
}

const RATE = 4500 // Tasa COP/USD

// Emojis disponibles para hogares
const EMOJIS_HOGAR = ['🏠', '🏡', '🏢', '🏘️', '💼', '✈️', '👥', '🎯', '🌴', '❤️']

const responsiveCSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { display: none; }
  .desktop-nav { display: none !important; }
  .bottom-nav { display: flex !important; }
  .page-content { padding-bottom: 90px; }
  .hogar-grid { display: flex; flex-direction: column; }
  .mobile-header { display: flex; }
  @media (min-width: 768px) {
    .desktop-nav { display: flex !important; }
    .bottom-nav { display: none !important; }
    .page-content { max-width: 900px; margin: 0 auto; padding-bottom: 40px; }
    .hogar-grid { display: grid !important; grid-template-columns: 1fr 1fr; gap: 14px; padding: 0 18px; }
    .mobile-header { display: none !important; }
  }
`

export default function Hogar() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState(null)
  const [hogares, setHogares] = useState([])
  const [hogarActivo, setHogarActivo] = useState(null)
  const [miembros, setMiembros] = useState([])
  const [gastos, setGastos] = useState([])
  const [recurrentes, setRecurrentes] = useState([])
  const [moneda, setMoneda] = useState('COP')
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState(false)

  // Estados para modal Crear Hogar
  const [modalCrear, setModalCrear] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoEmoji, setNuevoEmoji] = useState('🏠')
  const [guardando, setGuardando] = useState(false)

  // Estados para modal Invitar
  const [modalInvitar, setModalInvitar] = useState(false)
  const [invitarEmail, setInvitarEmail] = useState('')
  const [invitarRol, setInvitarRol] = useState('miembro')
  const [invitarPorcentaje, setInvitarPorcentaje] = useState(50)

  // Estados para modal Unirse
  const [modalUnirse, setModalUnirse] = useState(false)
  const [codigoUnirse, setCodigoUnirse] = useState('')

  // Fase 4: Modal Agregar Gasto
  const [modalGasto, setModalGasto] = useState(false)
  const [gastoNombre, setGastoNombre] = useState('')
  const [gastoMonto, setGastoMonto] = useState('')
  const [gastoCatId, setGastoCatId] = useState(null)
  const [gastoPagadoPor, setGastoPagadoPor] = useState(null)
  const [gastoNotas, setGastoNotas] = useState('')
  const [categorias, setCategorias] = useState([])

  // Fase 5: Liquidaciones
  const [liquidaciones, setLiquidaciones] = useState([])
  const [modalLiquidar, setModalLiquidar] = useState(false)
  const [liquidarMonto, setLiquidarMonto] = useState('')
  const [liquidarDe, setLiquidarDe] = useState(null)
  const [liquidarA, setLiquidarA] = useState(null)

  // Fase 6: Modal Agregar Recurrente
  const [modalRecurrente, setModalRecurrente] = useState(false)
  const [recNombre, setRecNombre] = useState('')
  const [recMonto, setRecMonto] = useState('')
  const [recCatId, setRecCatId] = useState(null)
  const [recDia, setRecDia] = useState('1')
  const [recPagadoPor, setRecPagadoPor] = useState(null)
  const [recMiPorcentaje, setRecMiPorcentaje] = useState(50)

  // Toast
  const [toast, setToast] = useState(null)

  const mostrarToast = (mensaje) => {
    setToast(mensaje)
    setTimeout(() => setToast(null), 3000)
  }

  // Cargar datos al iniciar
  useEffect(() => {
    const cargarDatos = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return navigate('/login')

      const { data: perfil } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setUsuario(perfil)
      await cargarHogares(user.id)
      const { data: cats } = await supabase.from('categorias').select('*').or(`es_global.eq.true,usuario_id.eq.${user.id}`)
      setCategorias((cats || []).filter(c => c.tipo === 'gasto'))
      setLoading(false)
    }

    cargarDatos()
  }, [navigate])

  // Función para cargar hogares
  const cargarHogares = async (userId) => {
    const { data: membresias } = await supabase
      .from('hogar_miembros')
      .select(`*, hogar:hogares(*)`)
      .eq('usuario_id', userId)
      .in('estado', ['activo', 'pendiente'])

    if (membresias && membresias.length > 0) {
      const listaHogares = membresias.map(m => ({
        ...m.hogar,
        miRol: m.rol,
        miPorcentaje: m.porcentaje_aporte,
        miEstado: m.estado
      }))
      setHogares(listaHogares)
      if (!hogarActivo) {
        setHogarActivo(listaHogares[0])
      }
    }
  }

  // Cargar miembros y gastos cuando cambia el hogar activo
  useEffect(() => {
    if (!hogarActivo) return

    const cargarMiembros = async () => {
      const { data } = await supabase
        .from('hogar_miembros')
        .select(`*, usuario:usuarios(id, nombre, avatar_emoji, foto_url)`)
        .eq('hogar_id', hogarActivo.id)
        .order('created_at')
      if (data) setMiembros(data)
    }

    const cargarGastos = async () => {
      const { data } = await supabase
        .from('gastos')
        .select(`*, categoria:categorias(nombre, emoji, color_hex), pagador:usuarios(id, nombre, avatar_emoji, foto_url)`)
        .eq('hogar_id', hogarActivo.id)
        .order('fecha', { ascending: false })
        .limit(50)
      if (data) {
        setRecurrentes(data.filter(g => g.es_recurrente))
        setGastos(data.filter(g => !g.es_recurrente))
      }
    }
    const cargarLiquidaciones = async () => {
      const { data } = await supabase.from('liquidaciones').select(`*, de_usuario:usuarios!liquidaciones_de_usuario_id_fkey(id, nombre, avatar_emoji), a_usuario:usuarios!liquidaciones_a_usuario_id_fkey(id, nombre, avatar_emoji)`).eq('hogar_id', hogarActivo.id).order('created_at', { ascending: false })
      setLiquidaciones(data || [])
    }
    cargarMiembros()
    cargarGastos()
    cargarLiquidaciones()
  }, [hogarActivo])

  // Crear hogar
  const crearHogar = async () => {
    if (!nuevoNombre.trim()) {
      mostrarToast('⚠️ Ingresá un nombre para el hogar')
      return
    }

    setGuardando(true)

    try {
      const { data: nuevoHogar, error: errorHogar } = await supabase
        .from('hogares')
        .insert({
          nombre: nuevoNombre.trim(),
          emoji: nuevoEmoji,
          admin_id: usuario.id
        })
        .select()
        .single()

      if (errorHogar) throw errorHogar

      const { error: errorMiembro } = await supabase
        .from('hogar_miembros')
        .insert({
          hogar_id: nuevoHogar.id,
          usuario_id: usuario.id,
          rol: 'admin',
          porcentaje_aporte: 100,
          estado: 'activo'
        })

      if (errorMiembro) throw errorMiembro

      const hogarCompleto = {
        ...nuevoHogar,
        miRol: 'admin',
        miPorcentaje: 100,
        miEstado: 'activo'
      }
      
      setHogares(prev => [...prev, hogarCompleto])
      setHogarActivo(hogarCompleto)
      setModalCrear(false)
      setNuevoNombre('')
      setNuevoEmoji('🏠')
      mostrarToast(`✅ ${nuevoEmoji} ${nuevoHogar.nombre} creado`)

    } catch (error) {
      console.error('Error creando hogar:', error)
      mostrarToast('❌ Error al crear el hogar')
    } finally {
      setGuardando(false)
    }
  }

  // ============ INVITAR MIEMBRO ============
  const invitarMiembro = async () => {
    if (!invitarEmail.trim()) {
      mostrarToast('⚠️ Ingresá un email')
      return
    }

    if (!hogarActivo) return

    setGuardando(true)

    try {
      // Verificar si ya existe una invitación para ese email en este hogar
      const { data: existente } = await supabase
        .from('hogar_miembros')
        .select('id')
        .eq('hogar_id', hogarActivo.id)
        .eq('email_invitacion', invitarEmail.trim().toLowerCase())
        .single()

      if (existente) {
        mostrarToast('⚠️ Ya existe una invitación para ese email')
        setGuardando(false)
        return
      }

      // Verificar si el usuario ya existe en la app
      const { data: usuarioExistente } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', invitarEmail.trim().toLowerCase())
        .single()

      // Crear la invitación
      const { error } = await supabase
        .from('hogar_miembros')
        .insert({
          hogar_id: hogarActivo.id,
          usuario_id: usuarioExistente?.id || null,
          email_invitacion: invitarEmail.trim().toLowerCase(),
          rol: invitarRol,
          porcentaje_aporte: invitarPorcentaje,
          estado: 'pendiente'
        })

      if (error) throw error

      // Recargar miembros
      const { data: nuevosMiembros } = await supabase
        .from('hogar_miembros')
        .select(`*, usuario:usuarios(id, nombre, avatar_emoji, foto_url)`)
        .eq('hogar_id', hogarActivo.id)
        .order('created_at')
      
      if (nuevosMiembros) setMiembros(nuevosMiembros)

      // Cerrar modal y limpiar
      setModalInvitar(false)
      setInvitarEmail('')
      setInvitarRol('miembro')
      setInvitarPorcentaje(50)
      
      mostrarToast(`✅ Invitación enviada a ${invitarEmail}`)

    } catch (error) {
      console.error('Error invitando:', error)
      mostrarToast('❌ Error al enviar invitación')
    } finally {
      setGuardando(false)
    }
  }

  // ============ UNIRSE CON CÓDIGO ============
  const unirseConCodigo = async () => {
    if (!codigoUnirse.trim()) {
      mostrarToast('⚠️ Ingresá el código de invitación')
      return
    }

    setGuardando(true)

    try {
      // Buscar el hogar por código
      const { data: hogar, error: errorBuscar } = await supabase
        .from('hogares')
        .select('*')
        .eq('codigo_invitacion', codigoUnirse.trim().toUpperCase())
        .single()

      if (errorBuscar || !hogar) {
        mostrarToast('❌ Código no válido')
        setGuardando(false)
        return
      }

      // Verificar si ya es miembro
      const { data: yaEsMiembro } = await supabase
        .from('hogar_miembros')
        .select('id, estado')
        .eq('hogar_id', hogar.id)
        .eq('usuario_id', usuario.id)
        .single()

      if (yaEsMiembro) {
        if (yaEsMiembro.estado === 'activo') {
          mostrarToast('⚠️ Ya eres miembro de este hogar')
        } else {
          // Activar membresía pendiente
          await supabase
            .from('hogar_miembros')
            .update({ estado: 'activo' })
            .eq('id', yaEsMiembro.id)
          
          mostrarToast(`✅ Te uniste a ${hogar.emoji} ${hogar.nombre}`)
        }
        setGuardando(false)
        setModalUnirse(false)
        setCodigoUnirse('')
        await cargarHogares(usuario.id)
        return
      }

      // Verificar si hay invitación pendiente por email
      const { data: invitacionPendiente } = await supabase
        .from('hogar_miembros')
        .select('*')
        .eq('hogar_id', hogar.id)
        .eq('email_invitacion', usuario.email)
        .eq('estado', 'pendiente')
        .single()

      if (invitacionPendiente) {
        // Actualizar la invitación con el usuario_id y activar
        await supabase
          .from('hogar_miembros')
          .update({ 
            usuario_id: usuario.id,
            estado: 'activo' 
          })
          .eq('id', invitacionPendiente.id)
      } else {
        // Crear nueva membresía
        const { error: errorUnirse } = await supabase
          .from('hogar_miembros')
          .insert({
            hogar_id: hogar.id,
            usuario_id: usuario.id,
            rol: 'miembro',
            porcentaje_aporte: 50,
            estado: 'activo'
          })

        if (errorUnirse) throw errorUnirse
      }

      // Recargar hogares
      await cargarHogares(usuario.id)
      
      // Seleccionar el nuevo hogar
      const hogarCompleto = {
        ...hogar,
        miRol: invitacionPendiente?.rol || 'miembro',
        miPorcentaje: invitacionPendiente?.porcentaje_aporte || 50,
        miEstado: 'activo'
      }
      setHogarActivo(hogarCompleto)

      // Cerrar modal
      setModalUnirse(false)
      setCodigoUnirse('')
      
      mostrarToast(`✅ Te uniste a ${hogar.emoji} ${hogar.nombre}`)

    } catch (error) {
      console.error('Error uniéndose:', error)
      mostrarToast('❌ Error al unirse al hogar')
    } finally {
      setGuardando(false)
    }
  }

  // ============ RECARGAR DATOS ============
  const recargarGastos = async () => {
    if (!hogarActivo) return
    const { data } = await supabase.from('gastos').select(`*, categoria:categorias(nombre, emoji, color_hex), pagador:usuarios(id, nombre, avatar_emoji, foto_url)`).eq('hogar_id', hogarActivo.id).order('fecha', { ascending: false }).limit(50)
    if (data) { setRecurrentes(data.filter(g => g.es_recurrente)); setGastos(data.filter(g => !g.es_recurrente)) }
    const { data: liq } = await supabase.from('liquidaciones').select(`*, de_usuario:usuarios!liquidaciones_de_usuario_id_fkey(id, nombre, avatar_emoji), a_usuario:usuarios!liquidaciones_a_usuario_id_fkey(id, nombre, avatar_emoji)`).eq('hogar_id', hogarActivo.id).order('created_at', { ascending: false })
    setLiquidaciones(liq || [])
  }

  // ============ FASE 4: AGREGAR GASTO ============
  const abrirModalGasto = () => { setGastoNombre(''); setGastoMonto(''); setGastoCatId(null); setGastoPagadoPor(usuario?.id || null); setGastoNotas(''); setModalGasto(true) }

  const guardarGastoHogar = async () => {
    if (!gastoMonto || parseFloat(gastoMonto) <= 0) { mostrarToast('⚠️ Ingresá un monto válido'); return }
    if (!hogarActivo) return
    setGuardando(true)
    try {
      const { error } = await supabase.from('gastos').insert({ usuario_id: gastoPagadoPor || usuario.id, nombre: gastoNombre || 'Gasto del hogar', categoria_id: gastoCatId, monto_cop: -Math.abs(parseFloat(gastoMonto)), tasa_conversion: RATE, fecha: new Date().toISOString().split('T')[0], hora: new Date().toTimeString().slice(0, 5), hogar_id: hogarActivo.id, notas: gastoNotas, es_recurrente: false })
      if (error) throw error
      await recargarGastos(); setModalGasto(false); mostrarToast(`✅ Gasto agregado`)
    } catch (e) { console.error('Error guardando gasto:', e); mostrarToast('❌ Error al guardar') }
    finally { setGuardando(false) }
  }

  // ============ FASE 5: BALANCES Y LIQUIDACIÓN ============
  const calcularBalances = () => {
    const ma = miembros.filter(m => m.estado === 'activo'); const n = ma.length || 1
    const balances = {}
    ma.forEach(m => { balances[m.usuario_id] = { usuario: m.usuario, usuario_id: m.usuario_id, pagado: 0, debe: 0, balance: 0 } })
    // Gastos normales: split equitativo
    gastos.forEach(g => {
      const monto = Math.abs(g.monto_cop || 0); const parte = monto / n
      if (balances[g.usuario_id]) balances[g.usuario_id].pagado += monto
      ma.forEach(m => { if (balances[m.usuario_id]) balances[m.usuario_id].debe += parte })
    })
    // Recurrentes: usar porcentaje custom si existe
    recurrentes.forEach(g => {
      const monto = Math.abs(g.monto_cop || 0)
      if (balances[g.usuario_id]) balances[g.usuario_id].pagado += monto
      let pctPagador = null
      try { const parsed = JSON.parse(g.notas); if (parsed?.porcentaje) pctPagador = parsed.porcentaje } catch {}
      if (pctPagador !== null && n === 2) {
        // Custom %: pagador paga pctPagador%, el otro paga el resto
        ma.forEach(m => {
          if (m.usuario_id === g.usuario_id) { if (balances[m.usuario_id]) balances[m.usuario_id].debe += monto * pctPagador / 100 }
          else { if (balances[m.usuario_id]) balances[m.usuario_id].debe += monto * (100 - pctPagador) / 100 }
        })
      } else {
        const parte = monto / n
        ma.forEach(m => { if (balances[m.usuario_id]) balances[m.usuario_id].debe += parte })
      }
    })
    liquidaciones.forEach(l => {
      const monto = Math.abs(l.monto_cop || 0)
      if (balances[l.de_usuario_id]) balances[l.de_usuario_id].pagado += monto
      if (balances[l.a_usuario_id]) balances[l.a_usuario_id].debe += monto
    })
    Object.values(balances).forEach(b => { b.balance = b.pagado - b.debe })
    return Object.values(balances)
  }

  const calcularDeudas = (balances) => {
    const deudores = balances.filter(b => b.balance < -0.5).map(b => ({ ...b }))
    const acreedores = balances.filter(b => b.balance > 0.5).map(b => ({ ...b }))
    const transferencias = []
    deudores.sort((a, b) => a.balance - b.balance); acreedores.sort((a, b) => b.balance - a.balance)
    let i = 0, j = 0
    while (i < deudores.length && j < acreedores.length) {
      const monto = Math.min(Math.abs(deudores[i].balance), acreedores[j].balance)
      if (monto > 0.5) transferencias.push({ de: deudores[i], a: acreedores[j], monto: Math.round(monto) })
      deudores[i].balance += monto; acreedores[j].balance -= monto
      if (Math.abs(deudores[i].balance) < 0.5) i++
      if (acreedores[j].balance < 0.5) j++
    }
    return transferencias
  }

  const abrirModalLiquidar = (de, a, monto) => { setLiquidarDe(de); setLiquidarA(a); setLiquidarMonto(String(Math.round(monto))); setModalLiquidar(true) }

  const liquidar = async () => {
    if (!liquidarMonto || parseFloat(liquidarMonto) <= 0) { mostrarToast('⚠️ Ingresá un monto válido'); return }
    if (!liquidarDe || !liquidarA || !hogarActivo) return
    setGuardando(true)
    try {
      const { error } = await supabase.from('liquidaciones').insert({ hogar_id: hogarActivo.id, de_usuario_id: liquidarDe, a_usuario_id: liquidarA, monto_cop: Math.abs(parseFloat(liquidarMonto)) })
      if (error) throw error
      await recargarGastos(); setModalLiquidar(false); mostrarToast('✅ Liquidación registrada')
    } catch (e) { console.error('Error liquidando:', e); mostrarToast('❌ Error al registrar liquidación') }
    finally { setGuardando(false) }
  }

  // ============ FASE 6: AGREGAR RECURRENTE ============
  const abrirModalRecurrente = () => { setRecNombre(''); setRecMonto(''); setRecCatId(null); setRecDia('1'); setRecPagadoPor(usuario?.id || null); setRecMiPorcentaje(50); setModalRecurrente(true) }

  const guardarRecurrente = async () => {
    if (!recMonto || parseFloat(recMonto) <= 0) { mostrarToast('⚠️ Ingresá un monto válido'); return }
    if (!hogarActivo) return
    setGuardando(true)
    try {
      const dia = parseInt(recDia) || 1
      const hoy = new Date()
      const fechaBase = new Date(hoy.getFullYear(), hoy.getMonth(), Math.min(dia, 28))
      const notasJson = JSON.stringify({ porcentaje: recMiPorcentaje })
      const { error } = await supabase.from('gastos').insert({ usuario_id: recPagadoPor || usuario.id, nombre: recNombre || 'Recurrente', categoria_id: recCatId, monto_cop: -Math.abs(parseFloat(recMonto)), tasa_conversion: RATE, fecha: fechaBase.toISOString().split('T')[0], hora: '00:00', hogar_id: hogarActivo.id, es_recurrente: true, notas: notasJson })
      if (error) throw error
      await recargarGastos(); setModalRecurrente(false); mostrarToast(`✅ Recurrente "${recNombre || 'Recurrente'}" agregado`)
    } catch (e) { console.error('Error guardando recurrente:', e); mostrarToast('❌ Error al guardar') }
    finally { setGuardando(false) }
  }

  // Formatear moneda
  const fmt = (monto) => {
    const valor = Math.abs(monto || 0)
    if (moneda === 'USD') {
      return '$' + Math.round(valor / RATE).toLocaleString('en-US')
    }
    return '$' + Math.round(valor).toLocaleString('es-CO')
  }

  // Calcular totales
  const totalGastos = gastos.reduce((sum, g) => sum + Math.abs(g.monto_cop || 0), 0)
  const totalRecurrentes = recurrentes.reduce((sum, g) => sum + Math.abs(g.monto_cop || 0), 0)
  const balances = calcularBalances()
  const deudas = calcularDeudas(balances)
  const miBalance = balances.find(b => b.usuario_id === usuario?.id)?.balance || 0

  // Formatear fecha
  const formatFecha = (fecha) => {
    const hoy = new Date()
    const f = new Date(fecha)
    const diffDias = Math.floor((hoy - f) / (1000 * 60 * 60 * 24))
    
    if (diffDias === 0) return 'hoy'
    if (diffDias === 1) return 'ayer'
    if (diffDias < 7) return `hace ${diffDias} días`
    
    return f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  }

  // Loading
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'DM Sans, sans-serif', padding: '60px 18px 90px' }}>
        <style>{`@keyframes pulse{0%,100%{opacity:.06}50%{opacity:.13}}`}</style>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ height: 32, width: 120, borderRadius: 12, background: 'white', animation: 'pulse 1.4s ease infinite', marginBottom: 20 }} />
          <div style={{ height: 160, borderRadius: 24, background: 'white', animation: 'pulse 1.4s ease infinite', marginBottom: 18 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 64, borderRadius: 14, background: 'white', animation: 'pulse 1.4s ease infinite', animationDelay: `${i*0.1}s` }} />)}
          </div>
        </div>
      </div>
    )
  }

  // Estado vacío
  if (hogares.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'DM Sans, sans-serif', color: C.text }}>
        <style>{responsiveCSS}</style>
        <TopNav navigate={navigate} usuario={usuario} active="hogar" />
        <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)', padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🏠</div>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, marginBottom: 10 }}>Aún no tienes un hogar</h2>
          <p style={{ color: C.text2, fontSize: 14, marginBottom: 30, maxWidth: 280 }}>Crea un hogar para compartir gastos con tu pareja, roomies o familia</p>
          <button onClick={() => setModalCrear(true)} style={btnPrimary}>+ Crear hogar</button>
          <button onClick={() => setModalUnirse(true)} style={btnSecondary}>Tengo un código de invitación</button>
        </div>
        <BottomNav navigate={navigate} active="hogar" />
        <ModalCrearHogar visible={modalCrear} onClose={() => setModalCrear(false)} nombre={nuevoNombre} setNombre={setNuevoNombre} emoji={nuevoEmoji} setEmoji={setNuevoEmoji} onGuardar={crearHogar} guardando={guardando} />
        <ModalUnirse visible={modalUnirse} onClose={() => setModalUnirse(false)} codigo={codigoUnirse} setCodigo={setCodigoUnirse} onUnirse={unirseConCodigo} guardando={guardando} />
        {toast && <Toast mensaje={toast} />}
      </div>
    )
  }

  // Vista principal con hogares
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'DM Sans, sans-serif', color: C.text }}>
      <style>{responsiveCSS}</style>
      <TopNav navigate={navigate} usuario={usuario} active="hogar" />

      <div className="page-content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 10px' }}>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, margin: 0 }}>Hogar</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <IconBtn onClick={abrirModalGasto}><PlusIcon /></IconBtn>
            <IconBtn onClick={() => {}}><SettingsIcon /></IconBtn>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 7, padding: '0 18px 12px', overflowX: 'auto' }}>
          {hogares.map(h => (
            <div key={h.id} onClick={() => setHogarActivo(h)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', background: hogarActivo?.id === h.id ? 'rgba(192,132,252,0.12)' : C.surface, border: `1px solid ${hogarActivo?.id === h.id ? 'rgba(192,132,252,0.3)' : C.border}`, borderRadius: 20, cursor: 'pointer', fontSize: 12, color: hogarActivo?.id === h.id ? C.text : C.text2 }}>
              {h.emoji} {h.nombre}
            </div>
          ))}
          <div onClick={() => setModalCrear(true)} style={{ flexShrink: 0, padding: '7px 13px', border: `1px dashed ${C.text3}`, borderRadius: 20, cursor: 'pointer', fontSize: 12, color: C.text3 }}>+ Nuevo</div>
        </div>

        {/* Saldo Card */}
        {hogarActivo && (
          <SaldoCard hogar={hogarActivo} miembros={miembros} moneda={moneda} setMoneda={setMoneda} totalGastos={totalGastos} totalRecurrentes={totalRecurrentes} miBalance={miBalance} fmt={fmt} onInvitar={() => setModalInvitar(true)} />
        )}

        {/* Grid: 2 columnas en desktop */}
        <div className="hogar-grid">
          <div>
            <SeccionBalances balances={balances} deudas={deudas} usuario={usuario} fmt={fmt} onLiquidar={abrirModalLiquidar} />
            <SeccionRecurrentes recurrentes={recurrentes} fmt={fmt} onAgregar={abrirModalRecurrente} usuario={usuario} miembros={miembros} />
          </div>
          <div>
            <SeccionGastos gastos={gastos} fmt={fmt} formatFecha={formatFecha} onAgregar={abrirModalGasto} usuario={usuario} miembros={miembros} />
            <SeccionMiembros miembros={miembros} usuario={usuario} hogarActivo={hogarActivo} expandido={expandido} setExpandido={setExpandido} mostrarToast={mostrarToast} onInvitar={() => setModalInvitar(true)} />
          </div>
        </div>
      </div>

      <BottomNav navigate={navigate} active="hogar" />

      {/* Modales y Toast */}
      <ModalCrearHogar visible={modalCrear} onClose={() => setModalCrear(false)} nombre={nuevoNombre} setNombre={setNuevoNombre} emoji={nuevoEmoji} setEmoji={setNuevoEmoji} onGuardar={crearHogar} guardando={guardando} />
      <ModalInvitar visible={modalInvitar} onClose={() => setModalInvitar(false)} email={invitarEmail} setEmail={setInvitarEmail} rol={invitarRol} setRol={setInvitarRol} porcentaje={invitarPorcentaje} setPorcentaje={setInvitarPorcentaje} onInvitar={invitarMiembro} guardando={guardando} hogar={hogarActivo} />
      <ModalUnirse visible={modalUnirse} onClose={() => setModalUnirse(false)} codigo={codigoUnirse} setCodigo={setCodigoUnirse} onUnirse={unirseConCodigo} guardando={guardando} />
      <ModalGastoHogar visible={modalGasto} onClose={() => setModalGasto(false)} nombre={gastoNombre} setNombre={setGastoNombre} monto={gastoMonto} setMonto={setGastoMonto} catId={gastoCatId} setCatId={setGastoCatId} pagadoPor={gastoPagadoPor} setPagadoPor={setGastoPagadoPor} notas={gastoNotas} setNotas={setGastoNotas} categorias={categorias} miembros={miembros} hogar={hogarActivo} onGuardar={guardarGastoHogar} guardando={guardando} fmt={fmt} />
      <ModalLiquidar visible={modalLiquidar} onClose={() => setModalLiquidar(false)} monto={liquidarMonto} setMonto={setLiquidarMonto} de={liquidarDe} a={liquidarA} miembros={miembros} onLiquidar={liquidar} guardando={guardando} fmt={fmt} />
      <ModalRecurrente visible={modalRecurrente} onClose={() => setModalRecurrente(false)} nombre={recNombre} setNombre={setRecNombre} monto={recMonto} setMonto={setRecMonto} catId={recCatId} setCatId={setRecCatId} dia={recDia} setDia={setRecDia} pagadoPor={recPagadoPor} setPagadoPor={setRecPagadoPor} miPorcentaje={recMiPorcentaje} setMiPorcentaje={setRecMiPorcentaje} categorias={categorias} miembros={miembros} hogar={hogarActivo} onGuardar={guardarRecurrente} guardando={guardando} fmt={fmt} />
      {toast && <Toast mensaje={toast} />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// COMPONENTES
// ══════════════════════════════════════════════════════════════

function TopNav({ navigate, usuario, active }) {
  const items = [
    { label: 'Inicio', path: '/home', id: 'home' },
    { label: 'Gastos', path: '/movimientos', id: 'movimientos' },
    { label: 'Plan', path: '/plan', id: 'plan' },
    { label: 'Hogar', path: '/hogar', id: 'hogar' },
  ]
  return (
    <div className="desktop-nav" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 900, margin: '0 auto' }}>
      <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 21, background: `linear-gradient(135deg, ${C.text}, ${C.purple})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Clara</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {items.map(item => (
          <button key={item.id} onClick={() => navigate(item.path)} style={{ padding: '7px 13px', borderRadius: 10, fontSize: 12, color: active === item.id ? C.purple : C.text2, cursor: 'pointer', border: active === item.id ? '1px solid rgba(192,132,252,0.2)' : '1px solid transparent', background: active === item.id ? 'rgba(192,132,252,0.07)' : 'transparent', fontFamily: 'DM Sans, sans-serif' }}>{item.label}</button>
        ))}
      </div>
      <div onClick={() => navigate('/perfil')} style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer', overflow: 'hidden' }}>
        {usuario?.foto_url ? <img src={usuario.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (usuario?.avatar_emoji || '👤')}
      </div>
    </div>
  )
}

function SaldoCard({ hogar, miembros, moneda, setMoneda, totalGastos, totalRecurrentes, miBalance, fmt, onInvitar }) {
  const balColor = miBalance > 0.5 ? C.green : miBalance < -0.5 ? C.red : C.text2
  const balLabel = miBalance > 0.5 ? 'Te deben' : miBalance < -0.5 ? 'Debes' : 'Estás al día'
  return (
    <div style={{ margin: '0 18px 14px', padding: '18px 18px 16px', borderRadius: 22, background: 'linear-gradient(135deg, rgba(192,132,252,0.18), rgba(96,165,250,0.1))', border: '1px solid rgba(192,132,252,0.2)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, rgba(192,132,252,0.1), transparent)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>{hogar.emoji} {hogar.nombre}</div>
          <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 36, letterSpacing: '-0.03em', lineHeight: 1, color: balColor }}>{miBalance > 0.5 ? '+' : ''}{fmt(Math.abs(miBalance))}</div>
          <div style={{ fontSize: 10.5, color: balColor, display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>{miBalance > 0.5 ? '↑' : miBalance < -0.5 ? '↓' : '✓'} {balLabel}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 3, gap: 2 }}>
            {['COP', 'USD'].map(m => (
              <div key={m} onClick={() => setMoneda(m)} style={{ padding: '4px 10px', borderRadius: 15, fontSize: 10.5, fontWeight: 600, cursor: 'pointer', color: moneda === m ? C.text : C.text2, background: moneda === m ? 'rgba(255,255,255,0.12)' : 'transparent' }}>
                {m}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {miembros.slice(0, 4).map((m, i) => (
              <Avatar 
                key={m.id}
                usuario={m.usuario}
                size={26}
                marginRight={i < miembros.length - 1 ? -7 : 0}
                opacity={m.estado === 'pendiente' ? 0.5 : 1}
                bgColor={m.estado === 'pendiente' ? 'rgba(251,191,36,0.15)' : `rgba(${i % 2 === 0 ? '94,240,176' : '96,165,250'},0.2)`}
              />
            ))}
            <div onClick={onInvitar} style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: C.text3, cursor: 'pointer', marginLeft: 10 }}>+</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 13 }}>
        <div style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 13, padding: '12px 14px' }}>
          <span style={{ fontSize: 10, color: C.text2, display: 'block' }}>Gastos ciclo</span>
          <span style={{ fontSize: 17, fontWeight: 600, color: C.red }}>{fmt(totalGastos)}</span>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 13, padding: '12px 14px' }}>
          <span style={{ fontSize: 10, color: C.text2, display: 'block' }}>Recurrentes/mes</span>
          <span style={{ fontSize: 17, fontWeight: 600, color: C.amber }}>{fmt(totalRecurrentes)}</span>
        </div>
      </div>
    </div>
  )
}

function SeccionRecurrentes({ recurrentes, fmt, onAgregar, usuario, miembros }) {
  const miembrosActivos = (miembros || []).filter(m => m.estado === 'activo')
  const numMiembros = miembrosActivos.length || 1

  const proximoCobro = (fecha) => {
    const dia = new Date(fecha).getDate()
    const hoy = new Date()
    let proximo = new Date(hoy.getFullYear(), hoy.getMonth(), dia)
    if (proximo < hoy) proximo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, dia)
    const diff = Math.floor((proximo - hoy) / (1000 * 60 * 60 * 24))
    if (diff === 0) return { text: 'Hoy', color: C.amber }
    if (diff === 1) return { text: 'Mañana', color: C.amber }
    if (diff <= 5) return { text: `En ${diff} días`, color: C.text2 }
    return { text: `En ${diff} días`, color: C.text3 }
  }

  return (
    <div style={{ padding: '0 18px', marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>🔁 Pagos recurrentes</span>
        <span onClick={onAgregar} style={{ fontSize: 11, color: C.purple, cursor: 'pointer' }}>+ Añadir</span>
      </div>
      {recurrentes.length === 0 ? (
        <div onClick={onAgregar} style={{ padding: 16, background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 14, textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>🔁</div>
          <div style={{ fontSize: 12, color: C.text2 }}>Agregá servicios fijos: Netflix, arriendo, internet…</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {recurrentes.map(r => {
            const montoAbs = Math.abs(r.monto_cop || 0)
            let pct = null
            try { const parsed = JSON.parse(r.notas); if (parsed?.porcentaje) pct = parsed.porcentaje } catch {}
            const yoPago = r.usuario_id === usuario?.id
            // Si hay % custom y soy el pagador: mi parte es pct%, si no soy pagador: mi parte es (100-pct)%
            const miParte = pct !== null && numMiembros === 2
              ? montoAbs * (yoPago ? pct : (100 - pct)) / 100
              : montoAbs / numMiembros
            const pctLabel = pct !== null && numMiembros === 2 ? `${yoPago ? pct : (100 - pct)}%` : null
            const prox = proximoCobro(r.fecha)
            const pagadorCorto = (r.pagador?.nombre || 'Alguien').split(' ')[0]
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${r.categoria?.color_hex || C.blue}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{r.categoria?.emoji || '📦'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{r.nombre}</div>
                  <div style={{ fontSize: 10, color: C.text2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <span>Día {new Date(r.fecha).getDate()}</span>
                    <span style={{ color: C.text3 }}>·</span>
                    {r.pagador && <Avatar usuario={r.pagador} size={13} border={false} bgColor="rgba(96,165,250,0.2)" />}
                    <span>{yoPago ? 'Tú pagas' : `${pagadorCorto} paga`}</span>
                    <span style={{ color: C.text3 }}>·</span>
                    <span style={{ color: prox.color }}>{prox.text}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.amber }}>{fmt(montoAbs)}</div>
                  {numMiembros > 1 && <div style={{ fontSize: 9.5, color: C.text3 }}>{pctLabel ? `${pctLabel} · ` : ''}{fmt(miParte)}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SeccionGastos({ gastos, fmt, formatFecha, onAgregar, usuario, miembros }) {
  const n = (miembros || []).filter(m => m.estado === 'activo').length || 1
  return (
    <div style={{ padding: '0 18px', marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Gastos del ciclo</span>
        <span onClick={onAgregar} style={{ fontSize: 11, color: C.purple, cursor: 'pointer' }}>+ Agregar</span>
      </div>
      {gastos.length === 0 ? (
        <div style={{ padding: 20, background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🧾</div>
          <div style={{ fontSize: 12, color: C.text2 }}>No hay gastos en este ciclo</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {gastos.map(g => {
            const montoAbs = Math.abs(g.monto_cop || 0); const mitad = montoAbs / n
            const pagadorCorto = (g.pagador?.nombre || 'Alguien').split(' ')[0]
            const yoPague = g.usuario_id === usuario?.id
            return (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${g.categoria?.color_hex || C.red}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{g.categoria?.emoji || '🛒'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{g.nombre}</div>
                  <div style={{ fontSize: 10, color: C.text2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {g.pagador && <Avatar usuario={g.pagador} size={14} border={false} bgColor="rgba(94,240,176,0.2)" />}
                    <span>{yoPague ? 'Tú pagaste' : `${pagadorCorto} pagó`}</span>
                    {n > 1 && <><span style={{ color: C.text3 }}>·</span><span style={{ color: yoPague ? C.green : C.amber, fontWeight: 500 }}>{yoPague ? `Te deben ${fmt(montoAbs - mitad)}` : `Debes ${fmt(mitad)}`}</span></>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.red }}>{fmt(montoAbs)}</div>
                  <div style={{ fontSize: 9.5, color: C.text3 }}>{formatFecha(g.fecha)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SeccionBalances({ balances, deudas, usuario, fmt, onLiquidar }) {
  if (balances.length <= 1) return null
  return (
    <div style={{ padding: '0 18px', marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 9 }}>⚖️ Balances</div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '10px 13px', marginBottom: 8 }}>
        {balances.map((b, i) => {
          const color = b.balance > 0.5 ? C.green : b.balance < -0.5 ? C.red : C.text2
          return (
            <div key={b.usuario_id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: i < balances.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <Avatar usuario={b.usuario} size={24} border={false} bgColor={`rgba(${i % 2 === 0 ? '94,240,176' : '96,165,250'},0.15)`} />
              <div style={{ flex: 1 }}><span style={{ fontSize: 12, fontWeight: 500 }}>{b.usuario?.nombre?.split(' ')[0] || 'Miembro'}</span>{b.usuario_id === usuario?.id && <span style={{ fontSize: 9, color: C.text3, marginLeft: 4 }}>(Tú)</span>}</div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color }}>{b.balance > 0.5 ? '+' : ''}{fmt(Math.abs(b.balance))}</span>
            </div>
          )
        })}
      </div>
      {deudas.length > 0 && deudas.map((d, i) => {
        const deN = (d.de.usuario?.nombre || '').split(' ')[0]; const aN = (d.a.usuario?.nombre || '').split(' ')[0]
        const esYoD = d.de.usuario_id === usuario?.id; const esYoA = d.a.usuario_id === usuario?.id
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', background: esYoD ? 'rgba(248,113,113,0.06)' : esYoA ? 'rgba(94,240,176,0.06)' : C.surface, border: `1px solid ${esYoD ? 'rgba(248,113,113,0.15)' : esYoA ? 'rgba(94,240,176,0.15)' : C.border}`, borderRadius: 14, marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{esYoD ? 'Tú' : deN} → {esYoA ? 'Tú' : aN}</div>
              <div style={{ fontSize: 10.5, color: C.text2 }}>{esYoD ? `Debes ${fmt(d.monto)}` : esYoA ? `Te debe ${fmt(d.monto)}` : `${deN} debe ${fmt(d.monto)} a ${aN}`}</div>
            </div>
            <button onClick={() => onLiquidar(d.de.usuario_id, d.a.usuario_id, d.monto)} style={{ padding: '6px 12px', background: 'rgba(94,240,176,0.1)', border: '1px solid rgba(94,240,176,0.2)', borderRadius: 10, fontSize: 10.5, fontWeight: 600, color: C.green, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>💸 Liquidar</button>
          </div>
        )
      })}
      {deudas.length === 0 && <div style={{ padding: 12, background: 'rgba(94,240,176,0.06)', border: '1px solid rgba(94,240,176,0.15)', borderRadius: 14, textAlign: 'center' }}><span style={{ fontSize: 12, color: C.green }}>✓ Todos están al día</span></div>}
    </div>
  )
}

function SeccionMiembros({ miembros, usuario, hogarActivo, expandido, setExpandido, mostrarToast, onInvitar }) {
  return (
    <div style={{ padding: '0 18px', marginBottom: 14 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div onClick={() => setExpandido(!expandido)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {miembros.slice(0, 3).map((m, i) => (
                <Avatar 
                  key={m.id}
                  usuario={m.usuario}
                  size={22}
                  marginRight={-5}
                  opacity={m.estado === 'pendiente' ? 0.5 : 1}
                  bgColor={m.estado === 'pendiente' ? 'rgba(251,191,36,0.15)' : `rgba(${i % 2 === 0 ? '94,240,176' : '96,165,250'},0.2)`}
                />
              ))}
            </div>
            <span style={{ marginLeft: 10, fontSize: 12.5, fontWeight: 500 }}>Miembros e invitaciones</span>
          </div>
          <span style={{ fontSize: 11, color: C.text3, transform: expandido ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.25s' }}>▾</span>
        </div>

        {expandido && (
          <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.border}` }}>
            {miembros.map((m, i) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 0', borderBottom: i < miembros.length - 1 ? `1px solid ${C.border}` : 'none', opacity: m.estado === 'pendiente' ? 0.65 : 1 }}>
                <Avatar 
                  usuario={m.usuario}
                  size={32}
                  border={false}
                  bgColor={m.estado === 'pendiente' ? 'rgba(251,191,36,0.12)' : `rgba(${i % 2 === 0 ? '94,240,176' : '96,165,250'},0.15)`}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>
                    {m.usuario?.nombre || m.email_invitacion}
                    {m.usuario_id === usuario?.id && ' (Tú)'}
                  </div>
                  <div style={{ fontSize: 10, color: C.text2, display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                    {m.rol === 'admin' ? 'Admin' : 'Miembro'}
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10, fontWeight: 600, background: m.estado === 'activo' ? 'rgba(94,240,176,0.1)' : 'rgba(251,191,36,0.1)', color: m.estado === 'activo' ? C.green : C.amber, border: `1px solid ${m.estado === 'activo' ? 'rgba(94,240,176,0.2)' : 'rgba(251,191,36,0.2)'}` }}>
                      {m.estado === 'activo' ? 'Activo' : '⏳ Pendiente'}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: m.estado === 'pendiente' ? C.text3 : C.purple }}>
                  {m.estado === 'pendiente' ? '—' : `${m.porcentaje_aporte}%`}
                </div>
              </div>
            ))}

            {hogarActivo && (
              <div style={{ marginTop: 12, padding: 12, background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.18)', borderRadius: 14 }}>
                <div style={{ fontSize: 11.5, fontWeight: 500, marginBottom: 9 }}>🔗 Invitar al hogar</div>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ flex: 1, padding: '9px 12px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(192,132,252,0.25)', borderRadius: 9, fontSize: 14, fontWeight: 700, letterSpacing: '0.16em', color: C.purple, fontFamily: 'monospace', textAlign: 'center' }}>
                    {hogarActivo.codigo_invitacion}
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(hogarActivo.codigo_invitacion); mostrarToast('📋 Código copiado') }} style={{ padding: '9px 12px', background: 'rgba(192,132,252,0.14)', border: '1px solid rgba(192,132,252,0.25)', borderRadius: 9, color: C.purple, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    Copiar
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={onInvitar} style={{ flex: 1, padding: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 11.5, color: C.text2, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>✉️ Por email</button>
                  <button onClick={() => { navigator.clipboard.writeText(`https://clara-web-kappa.vercel.app/hogar/unirse/${hogarActivo.codigo_invitacion}`); mostrarToast('📲 Link copiado') }} style={{ flex: 1, padding: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 11.5, color: C.text2, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>📲 Link</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════
// MODALES Y COMPONENTES AUXILIARES
// ══════════════════════════════════════════════════════════════

function ModalGastoHogar({ visible, onClose, nombre, setNombre, monto, setMonto, catId, setCatId, pagadoPor, setPagadoPor, notas, setNotas, categorias, miembros, hogar, onGuardar, guardando, fmt }) {
  if (!visible) return null
  const montoNum = parseFloat(monto) || 0
  const ma = miembros.filter(m => m.estado === 'activo'); const n = ma.length || 1; const mitad = montoNum / n
  return (<>
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 20 }} />
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 420, background: 'rgba(10,16,30,0.98)', borderRadius: '26px 26px 0 0', borderTop: `1px solid ${C.border2}`, zIndex: 21, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border2, margin: '12px auto 0' }} />
      <div style={{ padding: '4px 20px 36px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14, marginBottom: 3 }}><span style={{ fontSize: 22 }}>{hogar?.emoji || '🏠'}</span><div><h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, margin: 0 }}>Nuevo gasto</h2><div style={{ fontSize: 11, color: C.text2 }}>{hogar?.nombre}</div></div></div>
        <div style={{ textAlign: 'center', margin: '18px 0 14px' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}><span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, color: C.text2 }}>-$</span><input value={monto} onChange={e => setMonto(e.target.value)} type="number" placeholder="0" autoFocus style={{ fontFamily: 'DM Serif Display, serif', fontSize: 40, background: 'none', border: 'none', color: C.text, outline: 'none', width: 180, textAlign: 'center', caretColor: C.purple }} /></div>{montoNum > 0 && <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>≈ ${Math.round(montoNum / RATE).toLocaleString('en-US')} USD</div>}</div>
        <div style={{ marginBottom: 13 }}><div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 6 }}>Descripción</div><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Mercado, Servicios…" style={{ width: '100%', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, fontWeight: 300, outline: 'none', boxSizing: 'border-box' }} /></div>
        {categorias.length > 0 && <div style={{ marginBottom: 13 }}><div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 8 }}>Categoría</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>{categorias.slice(0, 8).map(cat => (<div key={cat.id} onClick={() => setCatId(catId === cat.id ? null : cat.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '7px 3px', borderRadius: 11, border: `1px solid ${catId === cat.id ? C.border2 : 'transparent'}`, background: catId === cat.id ? C.surface2 : 'transparent' }}><div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: `1px solid ${C.border}`, background: cat.color_hex ? cat.color_hex + '22' : C.surface }}>{cat.emoji}</div><span style={{ fontSize: 9, color: catId === cat.id ? C.text : C.text2, textAlign: 'center', lineHeight: 1.2 }}>{cat.nombre}</span></div>))}</div></div>}
        {ma.length > 1 && <div style={{ marginBottom: 13 }}><div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 8 }}>¿Quién pagó?</div><div style={{ display: 'flex', gap: 7 }}>{ma.map(m => { const sel = pagadoPor === m.usuario_id; return (<div key={m.id} onClick={() => setPagadoPor(m.usuario_id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 8px', background: sel ? 'rgba(192,132,252,0.1)' : C.surface, border: `1px solid ${sel ? 'rgba(192,132,252,0.35)' : C.border}`, borderRadius: 14, cursor: 'pointer' }}><Avatar usuario={m.usuario} size={30} border={false} bgColor={sel ? 'rgba(192,132,252,0.2)' : 'rgba(96,165,250,0.15)'} /><span style={{ fontSize: 11, fontWeight: 500, color: sel ? C.text : C.text2 }}>{m.usuario?.nombre?.split(' ')[0] || 'Miembro'}</span>{sel && <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.purple }} />}</div>) })}</div></div>}
        {montoNum > 0 && n > 1 && <div style={{ padding: 14, background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.15)', borderRadius: 14, marginBottom: 13 }}><div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 8 }}>División 50/50</div>{ma.map(m => { const ep = m.usuario_id === pagadoPor; return (<div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar usuario={m.usuario} size={20} border={false} bgColor="rgba(96,165,250,0.15)" /><span style={{ fontSize: 12 }}>{m.usuario?.nombre?.split(' ')[0]}</span>{ep && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, background: 'rgba(94,240,176,0.1)', color: C.green }}>Pagó</span>}</div><span style={{ fontSize: 12, fontWeight: 600, color: ep ? C.green : C.amber }}>{ep ? `Le deben ${fmt(montoNum - mitad)}` : `Debe ${fmt(mitad)}`}</span></div>) })}</div>}
        <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 6 }}>Notas <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></div><input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Algún detalle…" style={{ width: '100%', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, fontWeight: 300, outline: 'none', boxSizing: 'border-box' }} /></div>
        <button onClick={onGuardar} disabled={guardando || montoNum <= 0} style={{ ...btnPrimary, width: '100%', opacity: (guardando || montoNum <= 0) ? 0.5 : 1, background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.25)', color: C.red, boxShadow: 'none' }}>{guardando ? 'Guardando…' : `💸 Registrar gasto ${montoNum > 0 ? fmt(montoNum) : ''}`}</button>
      </div>
    </div>
  </>)
}

function ModalLiquidar({ visible, onClose, monto, setMonto, de, a, miembros, onLiquidar, guardando, fmt }) {
  if (!visible) return null
  const mDe = miembros.find(m => m.usuario_id === de); const mA = miembros.find(m => m.usuario_id === a); const montoNum = parseFloat(monto) || 0
  return (<>
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 20 }} />
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 420, background: 'rgba(10,16,30,0.98)', borderRadius: '26px 26px 0 0', borderTop: `1px solid ${C.border2}`, zIndex: 21, maxHeight: '85%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border2, margin: '12px auto 0' }} />
      <div style={{ padding: '4px 20px 36px', overflowY: 'auto' }}>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, marginBottom: 3, paddingTop: 14 }}>💸 Liquidar deuda</h2>
        <p style={{ fontSize: 12.5, color: C.text2, marginBottom: 18 }}>Registrar un pago entre miembros</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 20, padding: 16, background: 'rgba(94,240,176,0.06)', border: '1px solid rgba(94,240,176,0.15)', borderRadius: 16 }}>
          <div style={{ textAlign: 'center' }}><Avatar usuario={mDe?.usuario} size={40} border={false} bgColor="rgba(248,113,113,0.15)" /><div style={{ fontSize: 11, fontWeight: 500, marginTop: 4 }}>{mDe?.usuario?.nombre?.split(' ')[0] || 'Miembro'}</div><div style={{ fontSize: 9, color: C.red }}>Paga</div></div>
          <div style={{ fontSize: 20, color: C.green }}>→</div>
          <div style={{ textAlign: 'center' }}><Avatar usuario={mA?.usuario} size={40} border={false} bgColor="rgba(94,240,176,0.15)" /><div style={{ fontSize: 11, fontWeight: 500, marginTop: 4 }}>{mA?.usuario?.nombre?.split(' ')[0] || 'Miembro'}</div><div style={{ fontSize: 9, color: C.green }}>Recibe</div></div>
        </div>
        <div style={{ marginBottom: 20 }}><div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 6 }}>Monto</div><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 18, color: C.text2 }}>$</span><input value={monto} onChange={e => setMonto(e.target.value)} type="number" style={{ flex: 1, padding: '14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.green, fontFamily: 'DM Serif Display, serif', fontSize: 28, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} /></div></div>
        <button onClick={onLiquidar} disabled={guardando || montoNum <= 0} style={{ ...btnPrimary, width: '100%', opacity: (guardando || montoNum <= 0) ? 0.5 : 1, background: 'rgba(94,240,176,0.15)', border: '1px solid rgba(94,240,176,0.25)', color: C.green, boxShadow: 'none' }}>{guardando ? 'Registrando…' : `✅ Registrar pago de ${montoNum > 0 ? fmt(montoNum) : '$0'}`}</button>
      </div>
    </div>
  </>)
}

function ModalRecurrente({ visible, onClose, nombre, setNombre, monto, setMonto, catId, setCatId, dia, setDia, pagadoPor, setPagadoPor, miPorcentaje, setMiPorcentaje, categorias, miembros, hogar, onGuardar, guardando, fmt }) {
  if (!visible) return null
  const montoNum = parseFloat(monto) || 0
  const ma = miembros.filter(m => m.estado === 'activo'); const n = ma.length || 1
  const miParte = n === 2 ? montoNum * miPorcentaje / 100 : montoNum / n
  const otroParte = n === 2 ? montoNum * (100 - miPorcentaje) / 100 : montoNum / n
  const presets = [{ l: '50/50', v: 50 }, { l: '60/40', v: 60 }, { l: '70/30', v: 70 }, { l: '80/20', v: 80 }, { l: '100%', v: 100 }]
  return (<>
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 20 }} />
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 420, background: 'rgba(10,16,30,0.98)', borderRadius: '26px 26px 0 0', borderTop: `1px solid ${C.border2}`, zIndex: 21, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border2, margin: '12px auto 0' }} />
      <div style={{ padding: '4px 20px 36px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14, marginBottom: 3 }}><span style={{ fontSize: 22 }}>🔁</span><div><h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, margin: 0 }}>Nuevo recurrente</h2><div style={{ fontSize: 11, color: C.text2 }}>{hogar?.emoji} {hogar?.nombre}</div></div></div>

        <div style={{ textAlign: 'center', margin: '18px 0 14px' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}><span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, color: C.text2 }}>$</span><input value={monto} onChange={e => setMonto(e.target.value)} type="number" placeholder="0" autoFocus style={{ fontFamily: 'DM Serif Display, serif', fontSize: 40, background: 'none', border: 'none', color: C.amber, outline: 'none', width: 180, textAlign: 'center', caretColor: C.amber }} /></div>{montoNum > 0 && <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>≈ ${Math.round(montoNum / RATE).toLocaleString('en-US')} USD/mes</div>}</div>

        <div style={{ marginBottom: 13 }}><div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 6 }}>Nombre del servicio</div><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Netflix, Arriendo, Internet…" style={{ width: '100%', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, fontWeight: 300, outline: 'none', boxSizing: 'border-box' }} /></div>

        {categorias.length > 0 && <div style={{ marginBottom: 13 }}><div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 8 }}>Categoría</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>{categorias.slice(0, 8).map(cat => (<div key={cat.id} onClick={() => setCatId(catId === cat.id ? null : cat.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '7px 3px', borderRadius: 11, border: `1px solid ${catId === cat.id ? C.border2 : 'transparent'}`, background: catId === cat.id ? C.surface2 : 'transparent' }}><div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: `1px solid ${C.border}`, background: cat.color_hex ? cat.color_hex + '22' : C.surface }}>{cat.emoji}</div><span style={{ fontSize: 9, color: catId === cat.id ? C.text : C.text2, textAlign: 'center', lineHeight: 1.2 }}>{cat.nombre}</span></div>))}</div></div>}

        <div style={{ marginBottom: 13 }}><div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 8 }}>Día de cobro</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{[1,5,10,15,20,25,28].map(d => (<div key={d} onClick={() => setDia(String(d))} style={{ width: 40, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: parseInt(dia) === d ? 'rgba(251,191,36,0.12)' : C.surface, border: `1px solid ${parseInt(dia) === d ? 'rgba(251,191,36,0.3)' : C.border}`, color: parseInt(dia) === d ? C.amber : C.text2 }}>{d}</div>))}<input value={dia} onChange={e => setDia(e.target.value)} type="number" min="1" max="31" placeholder="Otro" style={{ width: 60, padding: '8px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none', textAlign: 'center' }} /></div></div>

        {ma.length > 1 && <div style={{ marginBottom: 13 }}><div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 8 }}>¿Quién paga este servicio?</div><div style={{ display: 'flex', gap: 7 }}>{ma.map(m => { const sel = pagadoPor === m.usuario_id; return (<div key={m.id} onClick={() => setPagadoPor(m.usuario_id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 8px', background: sel ? 'rgba(251,191,36,0.08)' : C.surface, border: `1px solid ${sel ? 'rgba(251,191,36,0.3)' : C.border}`, borderRadius: 14, cursor: 'pointer' }}><Avatar usuario={m.usuario} size={30} border={false} bgColor={sel ? 'rgba(251,191,36,0.15)' : 'rgba(96,165,250,0.15)'} /><span style={{ fontSize: 11, fontWeight: 500, color: sel ? C.text : C.text2 }}>{m.usuario?.nombre?.split(' ')[0] || 'Miembro'}</span>{sel && <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber }} />}</div>) })}</div></div>}

        {ma.length > 1 && (
          <div style={{ marginBottom: 13 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.text3, marginBottom: 8 }}>
              División: <span style={{ color: C.amber }}>{miPorcentaje}% / {100 - miPorcentaje}%</span>
            </div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
              {presets.map(p => (
                <div key={p.v} onClick={() => setMiPorcentaje(p.v)} style={{ flex: 1, padding: '7px 4px', background: miPorcentaje === p.v ? 'rgba(251,191,36,0.12)' : C.surface, border: `1px solid ${miPorcentaje === p.v ? 'rgba(251,191,36,0.3)' : C.border}`, borderRadius: 10, textAlign: 'center', cursor: 'pointer', fontSize: 11, color: miPorcentaje === p.v ? C.amber : C.text2, fontWeight: miPorcentaje === p.v ? 600 : 400 }}>{p.l}</div>
              ))}
            </div>
            <input type="range" min="0" max="100" value={miPorcentaje} onChange={e => setMiPorcentaje(Number(e.target.value))} style={{ width: '100%', accentColor: C.amber }} />
            {montoNum > 0 && (
              <div style={{ padding: 12, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 12, marginTop: 8 }}>
                {ma.map((m, i) => {
                  const esPagador = m.usuario_id === pagadoPor
                  const pct = esPagador ? miPorcentaje : (100 - miPorcentaje)
                  const parte = montoNum * pct / 100
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < ma.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Avatar usuario={m.usuario} size={18} border={false} bgColor="rgba(96,165,250,0.15)" />
                        <span style={{ fontSize: 11.5 }}>{m.usuario?.nombre?.split(' ')[0]}</span>
                        <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 6, background: 'rgba(251,191,36,0.1)', color: C.amber }}>{pct}%</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.amber }}>{fmt(parte)}/mes</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <button onClick={onGuardar} disabled={guardando || montoNum <= 0} style={{ ...btnPrimary, width: '100%', opacity: (guardando || montoNum <= 0) ? 0.5 : 1, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.25)', color: C.amber, boxShadow: 'none' }}>{guardando ? 'Guardando…' : `🔁 Agregar recurrente ${montoNum > 0 ? fmt(montoNum) + '/mes' : ''}`}</button>
      </div>
    </div>
  </>)
}

function ModalCrearHogar({ visible, onClose, nombre, setNombre, emoji, setEmoji, onGuardar, guardando }) {
  if (!visible) return null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 20 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 420, background: 'rgba(10,16,30,0.98)', borderRadius: '26px 26px 0 0', borderTop: `1px solid ${C.border2}`, zIndex: 21, maxHeight: '85%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border2, margin: '12px auto 0' }} />
        <div style={{ padding: '4px 20px 36px', overflowY: 'auto' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, marginBottom: 3, paddingTop: 14 }}>Nuevo hogar</h2>
          <p style={{ fontSize: 12.5, color: C.text2, marginBottom: 18 }}>Centro de costos compartido</p>

          <div style={{ marginBottom: 13 }}>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.text3, display: 'block', marginBottom: 6 }}>Emoji</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
              {EMOJIS_HOGAR.map(e => (
                <div key={e} onClick={() => setEmoji(e)} style={{ width: 44, height: 44, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', background: emoji === e ? C.surface2 : 'transparent', border: `1px solid ${emoji === e ? C.border2 : 'transparent'}` }}>{e}</div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 13 }}>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.text3, display: 'block', marginBottom: 6 }}>Nombre</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Casa, Oficina, Viaje Cartagena…" style={{ width: '100%', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ padding: 14, background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.15)', borderRadius: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(192,132,252,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{emoji}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{nombre || 'Mi hogar'}</div>
              <div style={{ fontSize: 10, color: C.text2 }}>Tú como admin · 100%</div>
            </div>
          </div>

          <button onClick={onGuardar} disabled={guardando} style={{ ...btnPrimary, width: '100%', opacity: guardando ? 0.7 : 1 }}>
            {guardando ? 'Creando...' : 'Crear hogar'}
          </button>
        </div>
      </div>
    </>
  )
}

// ============ MODAL INVITAR ============
function ModalInvitar({ visible, onClose, email, setEmail, rol, setRol, porcentaje, setPorcentaje, onInvitar, guardando, hogar }) {
  if (!visible) return null

  const presets = [
    { label: '50/50', value: 50 },
    { label: '60/40', value: 60 },
    { label: '70/30', value: 70 },
    { label: '80/20', value: 80 },
  ]

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 20 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 420, background: 'rgba(10,16,30,0.98)', borderRadius: '26px 26px 0 0', borderTop: `1px solid ${C.border2}`, zIndex: 21, maxHeight: '85%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border2, margin: '12px auto 0' }} />
        <div style={{ padding: '4px 20px 36px', overflowY: 'auto' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, marginBottom: 3, paddingTop: 14 }}>Invitar miembro</h2>
          <p style={{ fontSize: 12.5, color: C.text2, marginBottom: 18 }}>
            Invitar a {hogar?.emoji} {hogar?.nombre}
          </p>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.text3, display: 'block', marginBottom: 6 }}>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="email@ejemplo.com" 
              style={{ width: '100%', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontFamily: 'DM Sans, sans-serif', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} 
            />
          </div>

          {/* Rol */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.text3, display: 'block', marginBottom: 6 }}>Rol</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['miembro', 'admin'].map(r => (
                <div 
                  key={r}
                  onClick={() => setRol(r)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    background: rol === r ? 'rgba(192,132,252,0.12)' : C.surface,
                    border: `1px solid ${rol === r ? 'rgba(192,132,252,0.3)' : C.border}`,
                    borderRadius: 12,
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: rol === r ? C.text : C.text2,
                    fontWeight: rol === r ? 500 : 400
                  }}
                >
                  {r === 'admin' ? '👑 Admin' : '👤 Miembro'}
                </div>
              ))}
            </div>
          </div>

          {/* Porcentaje */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.text3, display: 'block', marginBottom: 6 }}>
              Porcentaje de aporte: <span style={{ color: C.purple }}>{porcentaje}%</span>
            </label>
            
            {/* Presets */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {presets.map(p => (
                <div 
                  key={p.value}
                  onClick={() => setPorcentaje(p.value)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: porcentaje === p.value ? 'rgba(192,132,252,0.12)' : C.surface,
                    border: `1px solid ${porcentaje === p.value ? 'rgba(192,132,252,0.3)' : C.border}`,
                    borderRadius: 10,
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontSize: 11,
                    color: porcentaje === p.value ? C.text : C.text2
                  }}
                >
                  {p.label}
                </div>
              ))}
            </div>

            {/* Slider */}
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={porcentaje} 
              onChange={e => setPorcentaje(Number(e.target.value))}
              style={{ width: '100%', accentColor: C.purple }}
            />
          </div>

          {/* Preview */}
          <div style={{ padding: 14, background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.15)', borderRadius: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.text2, marginBottom: 8 }}>Vista previa de la invitación:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{email || 'email@ejemplo.com'}</div>
                <div style={{ fontSize: 10, color: C.text2 }}>{rol === 'admin' ? 'Admin' : 'Miembro'} · {porcentaje}%</div>
              </div>
              <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 10, background: 'rgba(251,191,36,0.1)', color: C.amber, border: '1px solid rgba(251,191,36,0.2)' }}>
                ⏳ Pendiente
              </span>
            </div>
          </div>

          {/* Botón */}
          <button onClick={onInvitar} disabled={guardando} style={{ ...btnPrimary, width: '100%', opacity: guardando ? 0.7 : 1 }}>
            {guardando ? 'Enviando...' : '✉️ Enviar invitación'}
          </button>
        </div>
      </div>
    </>
  )
}

// ============ MODAL UNIRSE ============
function ModalUnirse({ visible, onClose, codigo, setCodigo, onUnirse, guardando }) {
  if (!visible) return null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 20 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50)', width: '100%', maxWidth: 420, background: 'rgba(10,16,30,0.98)', borderRadius: '26px 26px 0 0', borderTop: `1px solid ${C.border2}`, zIndex: 21, maxHeight: '85%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border2, margin: '12px auto 0' }} />
        <div style={{ padding: '4px 20px 36px', overflowY: 'auto' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, marginBottom: 3, paddingTop: 14 }}>Unirse a un hogar</h2>
          <p style={{ fontSize: 12.5, color: C.text2, marginBottom: 18 }}>
            Ingresá el código de invitación que te compartieron
          </p>

          {/* Código */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.text3, display: 'block', marginBottom: 6 }}>Código de invitación</label>
            <input 
              type="text" 
              value={codigo} 
              onChange={e => setCodigo(e.target.value.toUpperCase())} 
              placeholder="ABCD1234" 
              maxLength={8}
              style={{ 
                width: '100%', 
                padding: '16px 14px', 
                background: C.surface, 
                border: `1px solid ${C.border}`, 
                borderRadius: 14, 
                color: C.purple, 
                fontFamily: 'monospace', 
                fontSize: 20, 
                fontWeight: 700,
                letterSpacing: '0.2em',
                textAlign: 'center',
                outline: 'none', 
                boxSizing: 'border-box' 
              }} 
            />
          </div>

          {/* Info */}
          <div style={{ padding: 14, background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 14, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>
              El código tiene 8 caracteres y te lo debe compartir el admin del hogar. También podés unirte mediante un link de invitación.
            </div>
          </div>

          {/* Botón */}
          <button onClick={onUnirse} disabled={guardando || codigo.length < 8} style={{ ...btnPrimary, width: '100%', opacity: (guardando || codigo.length < 8) ? 0.5 : 1 }}>
            {guardando ? 'Verificando...' : '🏠 Unirme al hogar'}
          </button>
        </div>
      </div>
    </>
  )
}

function Toast({ mensaje }) {
  return (
    <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: 'rgba(10,16,30,0.95)', border: `1px solid ${C.border2}`, borderRadius: 12, padding: '10px 18px', fontSize: 13, color: C.text, zIndex: 100, boxShadow: '0 8px 30px rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}>
      {mensaje}
    </div>
  )
}

function IconBtn({ onClick, children }) {
  return (
    <div onClick={onClick} style={{ width: 34, height: 34, borderRadius: 11, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      {children}
    </div>
  )
}

function PlusIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.text2} strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
}

function SettingsIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.text2} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41" /></svg>
}

function BottomNav({ navigate, active = '' }) {
  const items = [
    { id: 'home', icon: '🏠', label: 'Inicio', path: '/home' },
    { id: 'movimientos', icon: '📊', label: 'Gastos', path: '/movimientos' },
    { id: 'agregar', icon: '+', label: '', path: '/agregar', special: true },
    { id: 'plan', icon: '📅', label: 'Plan', path: '/plan' },
    { id: 'hogar', icon: '🏡', label: 'Hogar', path: '/hogar' },
  ]

  return (
    <div className="bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 80, background: 'rgba(8,13,26,0.88)', backdropFilter: 'blur(30px)', borderTop: `1px solid ${C.border}`, alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 10, zIndex: 10 }}>
      {items.map(item => (
        item.special ? (
          <div key={item.id} onClick={() => navigate(item.path)} style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.green}, ${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginTop: -8, boxShadow: '0 6px 18px rgba(94,240,176,0.25)', fontSize: 20, color: C.bg }}>+</div>
        ) : (
          <div key={item.id} onClick={() => navigate(item.path)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 12px', color: active === item.id ? C.purple : C.text3 }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 9.5 }}>{item.label}</span>
          </div>
        )
      ))}
    </div>
  )
}

// Componente Avatar reutilizable
function Avatar({ usuario, size = 26, border = true, opacity = 1, marginRight = 0, bgColor }) {
  const defaultBg = bgColor || `linear-gradient(135deg, ${C.blue}, ${C.purple})`
  
  if (usuario?.foto_url) {
    return (
      <img 
        src={usuario.foto_url} 
        alt="" 
        style={{ 
          width: size, 
          height: size, 
          borderRadius: '50%', 
          objectFit: 'cover',
          border: border ? '2px solid rgba(8,13,26,0.9)' : 'none',
          marginRight,
          opacity
        }} 
      />
    )
  }
  
  return (
    <div style={{ 
      width: size, 
      height: size, 
      borderRadius: '50%', 
      border: border ? '2px solid rgba(8,13,26,0.9)' : 'none',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      fontSize: size * 0.46,
      background: defaultBg,
      marginRight,
      opacity
    }}>
      {usuario?.avatar_emoji || '👤'}
    </div>
  )
}

// Estilos reutilizables
const btnPrimary = {
  padding: '14px 28px',
  background: `linear-gradient(135deg, ${C.purple}, #a855f7)`,
  border: 'none',
  borderRadius: 14,
  color: '#fff',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
  marginBottom: 16,
  boxShadow: '0 8px 20px rgba(192,132,252,0.2)'
}

const btnSecondary = {
  padding: '12px 24px',
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  color: C.text2,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif'
}