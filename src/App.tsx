import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Resumen from './pages/Resumen'
import Gastos from './pages/Gastos'
import Ventas from './pages/Ventas'
import Clientes from './pages/Clientes'
import Servicios from './pages/Servicios'
import Reportes from './pages/Reportes'
import './index.css'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  return new Date(y, m - 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
}

function prevMonth(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 2)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [mes, setMes] = useState(currentMonth)
  const [dia, setDia] = useState<string | null>(null)
  const [mesInicial] = useState(currentMonth)

  const handleSetMes = (m: string) => {
    setMes(m)
    setDia(null) // al cambiar mes, limpiar día seleccionado
  }

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Auto-avance de mes al cambiar de fecha
  useEffect(() => {
    const interval = setInterval(() => {
      const ahora = currentMonth()
      setMes(prev => prev === mesInicial ? ahora : prev)
    }, 60_000)
    return () => clearInterval(interval)
  }, [mesInicial])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Login />

  // Rol: el jefe no puede editar (solo ver). Detectado por metadata o email
  const rol = (user.user_metadata?.rol as string) ?? 'operador'

  return (
    <BrowserRouter>
      <Layout
        mes={mes}
        dia={dia}
        onSetMes={handleSetMes}
        onSetDia={setDia}
        user={user}
        rol={rol}
      >
        <Routes>
          <Route path="/" element={<Resumen mes={mes} dia={dia} />} />
          <Route path="/gastos" element={<Gastos mes={mes} dia={dia} />} />
          <Route path="/ventas" element={<Ventas mes={mes} dia={dia} />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/servicios" element={<Servicios />} />
          <Route path="/reportes" element={<Reportes mes={mes} />} />
          <Route path="*" element={<Resumen mes={mes} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
