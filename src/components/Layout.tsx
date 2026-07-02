import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, Receipt,
  Users, BarChart3, Bell, Menu, X, LogOut,
  ChevronDown, Check, CheckCheck, Trash2, TrendingDown,
  CalendarDays, Wallet, Calendar, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Resumen' },
  { to: '/ventas', icon: TrendingUp, label: 'Ventas' },
  { to: '/gastos', icon: Receipt, label: 'Gastos' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
]

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function currentWeekRange() {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const lunes = new Date(today)
  lunes.setDate(today.getDate() + diff)
  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)
  const f = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { from: f(lunes), to: f(domingo) }
}

function currentMonthRange() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const last = new Date(y, d.getMonth() + 1, 0).getDate()
  return { from: `${y}-${m}-01`, to: `${y}-${m}-${last}` }
}

function currentYearRange() {
  const y = new Date().getFullYear()
  return { from: `${y}-01-01`, to: `${y}-12-31` }
}

function prevMonthRange() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const last = new Date(y, d.getMonth() + 1, 0).getDate()
  return { from: `${y}-${m}-01`, to: `${y}-${m}-${last}` }
}

type SummaryNotif = {
  id: string
  label: string
  sublabel: string
  ganancia: number
  icon: typeof CalendarDays
  iconBg: string
  iconColor: string
}

const HIDDEN_KEY = 'dp_notif_hidden'
const READ_KEY = 'dp_notif_read'

function getStoredSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'))
  } catch { return new Set() }
}
function saveSet(key: string, s: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...s]))
}

function PanelNotificaciones({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<SummaryNotif[]>([])
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState(() => getStoredSet(HIDDEN_KEY))
  const [read, setRead] = useState(() => getStoredSet(READ_KEY))
  const ref = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    const semana = currentWeekRange()
    const mes = currentMonthRange()
    const anio = currentYearRange()
    const prevMes = prevMonthRange()

    const [vRes, gRes] = await Promise.all([
      supabase.from('ventas').select('monto_soles, fecha').gte('fecha', prevMes.from).lte('fecha', anio.to),
      supabase.from('gastos').select('monto, fecha').gte('fecha', prevMes.from).lte('fecha', anio.to),
    ])

    const ventas = vRes.data ?? []
    const gastos = gRes.data ?? []

    const sumV = (from: string, to: string) =>
      ventas.filter(r => r.fecha >= from && r.fecha <= to).reduce((s, r) => s + Number(r.monto_soles ?? 0), 0)
    const sumG = (from: string, to: string) =>
      gastos.filter(r => r.fecha >= from && r.fecha <= to).reduce((s, r) => s + Number(r.monto ?? 0), 0)

    // Valores actuales y del mes anterior
    const ventasMes = sumV(mes.from, mes.to)
    const gastosMes = sumG(mes.from, mes.to)
    const gananciaMes = ventasMes - gastosMes
    const ventasPrev = sumV(prevMes.from, prevMes.to)
    const gastosPrev = sumG(prevMes.from, prevMes.to)
    const gananciaPrev = ventasPrev - gastosPrev

    // Diferencias
    const diffVentas = ventasMes - ventasPrev
    const diffGastos = gastosMes - gastosPrev
    const diffGanancia = gananciaMes - gananciaPrev

    const compVentas = diffVentas >= 0
      ? `+S/ ${fmt(diffVentas)} más que el mes pasado`
      : `S/ ${fmt(Math.abs(diffVentas))} menos que el mes pasado`
    const compGastos = diffGastos > 0
      ? `+S/ ${fmt(diffGastos)} más que el mes pasado`
      : `S/ ${fmt(Math.abs(diffGastos))} menos que el mes pasado`
    const compGanancia = diffGanancia >= 0
      ? `+S/ ${fmt(diffGanancia)} mejor que el mes pasado`
      : `S/ ${fmt(Math.abs(diffGanancia))} peor que el mes pasado`

    setItems([
      {
        id: 'semana',
        label: 'Ganancia esta semana',
        sublabel: 'Lun – Dom · Ventas − Gastos',
        ganancia: sumV(semana.from, semana.to) - sumG(semana.from, semana.to),
        icon: CalendarDays,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
      {
        id: 'comp-ventas',
        label: 'Ventas vs mes anterior',
        sublabel: compVentas,
        ganancia: diffVentas,
        icon: diffVentas >= 0 ? ArrowUpRight : ArrowDownRight,
        iconBg: diffVentas >= 0 ? 'bg-emerald-100' : 'bg-red-100',
        iconColor: diffVentas >= 0 ? 'text-emerald-600' : 'text-red-500',
      },
      {
        id: 'comp-gastos',
        label: 'Gastos vs mes anterior',
        sublabel: compGastos,
        ganancia: -diffGastos, // negativo porque más gastos es malo
        icon: diffGastos <= 0 ? ArrowDownRight : ArrowUpRight,
        iconBg: diffGastos <= 0 ? 'bg-emerald-100' : 'bg-red-100',
        iconColor: diffGastos <= 0 ? 'text-emerald-600' : 'text-red-500',
      },
      {
        id: 'comp-ganancia',
        label: 'Ganancia vs mes anterior',
        sublabel: compGanancia,
        ganancia: diffGanancia,
        icon: diffGanancia >= 0 ? ArrowUpRight : ArrowDownRight,
        iconBg: diffGanancia >= 0 ? 'bg-emerald-100' : 'bg-red-100',
        iconColor: diffGanancia >= 0 ? 'text-emerald-600' : 'text-red-500',
      },
      {
        id: 'mes',
        label: 'Ganancia este mes',
        sublabel: 'Acumulado del mes actual',
        ganancia: gananciaMes,
        icon: Wallet,
        iconBg: 'bg-violet-100',
        iconColor: 'text-violet-600',
      },
      {
        id: 'anio',
        label: 'Ganancia este año',
        sublabel: 'Acumulado anual',
        ganancia: sumV(anio.from, anio.to) - sumG(anio.from, anio.to),
        icon: Calendar,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
      },
    ])
    setLoading(false)
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('notif-summary')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gastos' }, () => loadData())
      .subscribe()

    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('mousedown', handler)
    }
  }, [onClose])

  const visible = items.filter(n => !hidden.has(n.id))
  const unreadCount = visible.filter(n => !read.has(n.id)).length

  const markRead = (id: string) => {
    const next = new Set(read)
    next.add(id)
    setRead(next)
    saveSet(READ_KEY, next)
  }

  const markAllRead = () => {
    const next = new Set(read)
    visible.forEach(n => next.add(n.id))
    setRead(next)
    saveSet(READ_KEY, next)
  }

  const hideNotif = (id: string) => {
    const next = new Set(hidden)
    next.add(id)
    setHidden(next)
    saveSet(HIDDEN_KEY, next)
  }

  const restoreAll = () => {
    setHidden(new Set())
    setRead(new Set())
    localStorage.removeItem(HIDDEN_KEY)
    localStorage.removeItem(READ_KEY)
  }

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 w-88 bg-white rounded-2xl border border-gray-100 shadow-2xl shadow-gray-200/60 z-50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Notificaciones</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={15} />
          </button>
        </div>
        {visible.length > 0 && (
          <div className="flex items-center gap-3 mt-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                <CheckCheck size={13} />
                Marcar todo como leído
              </button>
            )}
            {hidden.size > 0 && (
              <button onClick={restoreAll} className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors ml-auto">
                Restaurar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lista */}
      <div>
        {loading ? (
          <div className="py-10 flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Cargando...</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Bell size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">Sin notificaciones</p>
            {hidden.size > 0 && (
              <button onClick={restoreAll} className="text-xs text-blue-500 hover:text-blue-600 mt-2 font-medium">
                Restaurar eliminadas
              </button>
            )}
          </div>
        ) : (
          visible.map((n) => {
            const isRead = read.has(n.id)
            const Icon = n.icon
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3.5 transition-colors group cursor-pointer border-b border-gray-50 last:border-0 ${
                  isRead ? 'bg-white hover:bg-gray-50/50' : 'bg-blue-50/40 hover:bg-blue-50/60'
                }`}
                onClick={() => { if (!isRead) markRead(n.id) }}
              >
                {/* Icono */}
                <div className={`w-10 h-10 ${n.iconBg} rounded-full flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon size={18} className={n.iconColor} />
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${isRead ? 'text-gray-500' : 'text-gray-900 font-semibold'}`}>
                    {n.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.sublabel}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {n.ganancia >= 0
                      ? <TrendingUp size={13} className="text-emerald-500" />
                      : <TrendingDown size={13} className="text-red-400" />}
                    <span className={`text-sm font-bold ${n.ganancia >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      S/ {fmt(Math.abs(n.ganancia))}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 shrink-0 mt-1">
                  {!isRead && (
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                  )}
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isRead && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead(n.id) }}
                        title="Marcar como leída"
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-blue-100 text-gray-300 hover:text-blue-500 transition-colors"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); hideNotif(n.id) }}
                      title="Eliminar"
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      {visible.length > 0 && (
        <div className="px-4 py-2 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs text-gray-400">En vivo</span>
          </div>
          {unreadCount > 0 && (
            <span className="text-xs font-semibold text-blue-600">{unreadCount} sin leer</span>
          )}
        </div>
      )}
    </div>
  )
}

type Props = {
  children: React.ReactNode
  mes: string
  dia: string | null
  onSetMes: (m: string) => void
  onSetDia: (d: string | null) => void
  user: User
  rol: string
}

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo - 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
}

function MonthPicker({ mes, dia, onSetMes, onSetDia }: { mes: string; dia: string | null; onSetMes: (m: string) => void; onSetDia: (d: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'months' | 'days'>('months')
  const ref = useRef<HTMLDivElement>(null)
  const [viewYear, setViewYear] = useState(() => Number(mes.split('-')[0]))
  const [viewMonth, setViewMonth] = useState(() => mes)
  const current = currentMonthStr()
  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const isCurrentMonth = mes === current

  const prev = () => { onSetMes((() => { const [y,m] = mes.split('-').map(Number); const d = new Date(y, m-2); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })()) }
  const next = () => { if (isCurrentMonth) return; onSetMes((() => { const [y,m] = mes.split('-').map(Number); const d = new Date(y, m); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })()) }

  const selectMonth = (moIdx: number) => {
    const m = `${viewYear}-${String(moIdx + 1).padStart(2, '0')}`
    if (m <= current) {
      setViewMonth(m)
      setView('days')
    }
  }

  // Generar días del mes para el calendario
  const daysInMonth = () => {
    const [y, mo] = viewMonth.split('-').map(Number)
    const firstDay = new Date(y, mo - 1, 1).getDay() // 0=Dom
    const totalDays = new Date(y, mo, 0).getDate()
    const offset = firstDay === 0 ? 6 : firstDay - 1 // Lun=0
    return { offset, totalDays, y, mo }
  }

  const selectDay = (day: number) => {
    const [y, mo] = viewMonth.split('-').map(Number)
    const d = `${y}-${String(mo).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    if (d > today) return
    onSetMes(viewMonth)
    onSetDia(d)
    setOpen(false)
  }

  const label = dia
    ? new Date(dia + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
    : monthLabel(mes)

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-1 py-1">
        <button onClick={prev} className="p-1 rounded-md hover:bg-white hover:shadow-sm transition-all text-gray-400 hover:text-gray-700 cursor-pointer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button
          onClick={() => { setViewYear(Number(mes.split('-')[0])); setViewMonth(mes); setView('months'); setOpen(!open) }}
          className="text-sm font-semibold text-gray-700 px-2 capitalize min-w-36 text-center hover:bg-white hover:shadow-sm rounded-md py-0.5 transition-all cursor-pointer"
        >
          {label}
        </button>
        <button onClick={next} disabled={isCurrentMonth} className="p-1 rounded-md hover:bg-white hover:shadow-sm transition-all text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg p-3 z-50 w-72">
          {view === 'months' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => setViewYear(v => v - 1)} className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <span className="text-sm font-bold text-gray-800">{viewYear}</span>
                <button onClick={() => setViewYear(v => v + 1)} disabled={viewYear >= Number(current.split('-')[0])} className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30 cursor-pointer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {months.map((lbl, i) => {
                  const m = `${viewYear}-${String(i + 1).padStart(2, '0')}`
                  const isCurrent = m === mes
                  const isFuture = m > current
                  return (
                    <button
                      key={lbl}
                      onClick={() => selectMonth(i)}
                      disabled={isFuture}
                      className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer
                        ${isCurrent ? 'bg-blue-600 text-white shadow-sm' : ''}
                        ${isFuture ? 'text-gray-300 cursor-not-allowed' : ''}
                        ${!isCurrent && !isFuture ? 'text-gray-600 hover:bg-gray-100' : ''}
                      `}
                    >
                      {lbl}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => setView('months')} className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer text-xs font-medium flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                  Meses
                </button>
                <span className="text-sm font-bold text-gray-800 capitalize">
                  {new Date(Number(viewMonth.split('-')[0]), Number(viewMonth.split('-')[1]) - 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(d => (
                  <span key={d} className="text-[10px] font-medium text-gray-400 py-1">{d}</span>
                ))}
                {(() => {
                  const { offset, totalDays } = daysInMonth()
                  const cells = []
                  for (let i = 0; i < offset; i++) cells.push(<span key={`e${i}`} />)
                  for (let d = 1; d <= totalDays; d++) {
                    const dateStr = `${viewMonth}-${String(d).padStart(2,'0')}`
                    const isFuture = dateStr > today
                    const isSelected = dateStr === dia
                    const isToday = dateStr === today
                    cells.push(
                      <button
                        key={d}
                        onClick={() => selectDay(d)}
                        disabled={isFuture}
                        className={`w-8 h-8 text-xs rounded-lg transition-all cursor-pointer
                          ${isSelected ? 'bg-blue-600 text-white font-bold shadow-sm' : ''}
                          ${isToday && !isSelected ? 'bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-200' : ''}
                          ${isFuture ? 'text-gray-300 cursor-not-allowed' : ''}
                          ${!isSelected && !isToday && !isFuture ? 'text-gray-700 hover:bg-gray-100 font-medium' : ''}
                        `}
                      >
                        {d}
                      </button>
                    )
                  }
                  return cells
                })()}
              </div>
            </>
          )}
          <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
            {dia && (
              <button
                onClick={() => { onSetDia(null); setOpen(false) }}
                className="flex-1 text-xs text-gray-600 font-medium py-1.5 rounded-lg hover:bg-gray-50 transition-all cursor-pointer"
              >
                Ver mes completo
              </button>
            )}
            {mes !== current && (
              <button
                onClick={() => { onSetMes(current); onSetDia(null); setOpen(false) }}
                className="flex-1 text-xs text-blue-600 font-medium py-1.5 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"
              >
                Ir a hoy
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Layout({ children, mes, dia, onSetMes, onSetDia, user, rol }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [showPerfil, setShowPerfil] = useState(false)
  const [perfil, setPerfil] = useState<{ nombre: string; rol: string } | null>(null)
  const [unreadBadge, setUnreadBadge] = useState(0)
  const now = useClock()
  const perfilRef = useRef<HTMLDivElement>(null)

  const fechaCompleta = now.toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const hora = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

  // Cargar perfil desde la tabla perfiles
  useEffect(() => {
    supabase
      .from('perfiles')
      .select('nombre, rol')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setPerfil(data)
      })
  }, [user.id])

  // Badge: contar no leídas/no ocultas desde localStorage
  useEffect(() => {
    const calcBadge = () => {
      const readSet = getStoredSet(READ_KEY)
      const hiddenSet = getStoredSet(HIDDEN_KEY)
      const ids: ('semana' | 'mes' | 'anio')[] = ['semana', 'mes', 'anio']
      const count = ids.filter(id => !hiddenSet.has(id) && !readSet.has(id)).length
      setUnreadBadge(count)
    }
    calcBadge()
    window.addEventListener('storage', calcBadge)
    const interval = setInterval(calcBadge, 2000)
    return () => { window.removeEventListener('storage', calcBadge); clearInterval(interval) }
  }, [])

  const nombreUsuario = perfil?.nombre ?? (user.user_metadata?.nombre as string) ?? user.email?.split('@')[0] ?? 'Usuario'
  const rolUsuario = perfil?.rol ?? rol
  const inicial = nombreUsuario[0].toUpperCase()
  const email = user.email ?? ''
  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  // Click outside para perfil
  useEffect(() => {
    if (!showPerfil) return
    const handler = (e: MouseEvent) => {
      if (perfilRef.current && !perfilRef.current.contains(e.target as Node)) setShowPerfil(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPerfil])

  const SidebarContent = () => (
    <>
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-tight truncate">D&P Señor Cautivo</p>
            <p className="text-xs text-gray-400 truncate">Transportes y Servicios</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mt-1">
          <div className="w-7 h-7 bg-linear-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">{inicial}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-800 truncate">{nombreUsuario}</p>
            <p className="text-xs text-gray-400 truncate capitalize">{rolUsuario}</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} title="Cerrar sesión"
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors shrink-0">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-gray-100 shrink-0">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-56 h-full bg-white shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center gap-3 px-4 lg:px-6 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-50 text-gray-500">
            <Menu size={18} />
          </button>

          {/* Month selector */}
          <MonthPicker mes={mes} dia={dia} onSetMes={onSetMes} onSetDia={onSetDia} />

          {/* Fecha y hora */}
          <div className="hidden md:flex flex-col items-end ml-auto mr-2">
            <span className="text-xs font-semibold text-gray-700 capitalize">{fechaCompleta}</span>
            <span className="text-xs text-gray-400 tabular-nums">{hora}</span>
          </div>

          {/* Notificaciones + perfil */}
          <div className="flex items-center gap-1.5 md:ml-0 ml-auto">
            {/* Bell */}
            <div className="relative">
              <button
                onClick={() => { setShowNotif(v => !v); setShowPerfil(false) }}
                className="relative p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <Bell size={16} />
                {unreadBadge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white">
                    {unreadBadge > 9 ? '9+' : unreadBadge}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {showNotif && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                  >
                    <PanelNotificaciones onClose={() => setShowNotif(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile avatar */}
            <div className="relative" ref={perfilRef}>
              <button
                onClick={() => { setShowPerfil(v => !v); setShowNotif(false) }}
                className="flex items-center gap-1.5 p-1 pr-2 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-7 h-7 bg-linear-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {inicial}
                </div>
                <ChevronDown size={12} className="text-gray-400 hidden sm:block" />
              </button>

              <AnimatePresence>
                {showPerfil && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-gray-100 shadow-2xl shadow-gray-200/60 z-50 overflow-hidden"
                  >
                    {/* Profile header */}
                    <div className="px-4 pt-5 pb-4 text-center border-b border-gray-100">
                      <div className="w-14 h-14 bg-linear-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3 shadow-lg shadow-blue-200/50">
                        {inicial}
                      </div>
                      <p className="text-sm font-bold text-gray-900">{nombreUsuario}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{email}</p>
                      <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mt-2 ${
                        rolUsuario === 'jefe'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {rolUsuario === 'jefe' ? 'Administrador' : 'Operador'}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="px-4 py-3 space-y-2.5">
                      {createdAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Miembro desde</span>
                          <span className="text-xs font-medium text-gray-600">{createdAt}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Estado</span>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          <span className="text-xs font-medium text-emerald-600">Activo</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Última conexión</span>
                        <span className="text-xs font-medium text-gray-600">Ahora</span>
                      </div>
                    </div>

                    {/* Sign out */}
                    <div className="px-3 py-2.5 border-t border-gray-100">
                      <button
                        onClick={() => supabase.auth.signOut()}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={14} />
                        Cerrar sesión
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
