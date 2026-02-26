import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Agregar from './pages/Agregar'
import Movimientos from './pages/Movimientos'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      background: '#080d1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#5ef0b0',
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '1.2rem'
    }}>
      Cargando...
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/home" />} />
        <Route path="/onboarding" element={session ? <Onboarding /> : <Navigate to="/login" />} />
        <Route path="/home" element={session ? <Home /> : <Navigate to="/login" />} />
        <Route path="/agregar" element={session ? <Agregar /> : <Navigate to="/login" />} />
        <Route path="/movimientos" element={session ? <Movimientos /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={session ? "/home" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App