import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('¡Revisá tu email para confirmar tu cuenta!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Email o contraseña incorrectos')
    }

    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080d1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif',
      padding: '1rem'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>💜</div>
          <h1 style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: '2.5rem',
            color: '#ffffff',
            margin: 0
          }}>Clara</h1>
          <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.95rem',
            marginTop: '0.5rem'
          }}>Tu dinero, con claridad</p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '1.5rem',
          padding: '2rem',
          backdropFilter: 'blur(20px)'
        }}>
          <h2 style={{
            color: '#ffffff',
            fontSize: '1.3rem',
            marginTop: 0,
            marginBottom: '1.5rem'
          }}>
            {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.85rem',
                marginBottom: '0.5rem'
              }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.75rem',
                  padding: '0.85rem 1rem',
                  color: '#ffffff',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.85rem',
                marginBottom: '0.5rem'
              }}>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="mínimo 6 caracteres"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.75rem',
                  padding: '0.85rem 1rem',
                  color: '#ffffff',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.3)',
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
                color: '#f87171',
                fontSize: '0.9rem',
                marginBottom: '1rem'
              }}>{error}</div>
            )}

            {message && (
              <div style={{
                background: 'rgba(94,240,176,0.1)',
                border: '1px solid rgba(94,240,176,0.3)',
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
                color: '#5ef0b0',
                fontSize: '0.9rem',
                marginBottom: '1rem'
              }}>{message}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                border: 'none',
                borderRadius: '0.75rem',
                padding: '0.95rem',
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Cargando...' : isRegister ? 'Crear cuenta' : 'Entrar'}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.9rem',
            marginTop: '1.5rem',
            marginBottom: 0
          }}>
            {isRegister ? '¿Ya tenés cuenta?' : '¿No tenés cuenta?'}{' '}
            <span
              onClick={() => { setIsRegister(!isRegister); setError(''); setMessage('') }}
              style={{ color: '#c084fc', cursor: 'pointer', fontWeight: '600' }}
            >
              {isRegister ? 'Iniciá sesión' : 'Registrate'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}