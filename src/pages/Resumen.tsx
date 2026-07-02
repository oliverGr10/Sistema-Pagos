import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import {
  TrendingUp, TrendingDown, Receipt, DollarSign,
  ArrowUpRight, ArrowDownRight, CalendarDays, Wallet
} from 'lucide-react'
import { supabase, type Venta, type Gasto } from '../lib/supabase'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthRange(mes: string) {
  const [y, mo] = mes.split('-')
  const last = new Date(Number(y), Number(mo), 0).getDate()
  return { from: `${y}-${mo}-01`, to: `${y}-${mo}-${last}` }
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

function last7Days() {
  const days: string[] = []
  const d = new Date()
  for (let i = 6; i >= 0; i--) {
    const day = new Date(d)
    day.setDate(d.getDate() - i)
    days.push(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`)
  }
  return days
}

const card = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, delay },
})

const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />
)

export default function Resumen({ mes, dia }: { mes: string; dia?: string | null }) {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const { from, to } = monthRange(mes)
    Promise.all([
      supabase.from('ventas').select('*').gte('fecha', from).lte('fecha', to).order('fecha', { ascending: false }),
      supabase.from('gastos').select('*').gte('fecha', from).lte('fecha', to).order('fecha', { ascending: false }),
    ]).then(([v, g]) => {
      setVentas(v.data ?? [])
      setGastos(g.data ?? [])
      setLoading(false)
    })
  }, [mes])

  const today = localToday()
  const week = currentWeekRange()

  // KPIs operativos
  const ventasHoy = ventas.filter(v => v.fecha === today).reduce((s, v) => s + Number(v.monto_soles), 0)
  const gastosHoy = gastos.filter(g => g.fecha === today).reduce((s, g) => s + Number(g.monto), 0)
  const gananciaHoy = ventasHoy - gastosHoy

  const ventasSemana = ventas.filter(v => v.fecha >= week.from && v.fecha <= week.to).reduce((s, v) => s + Number(v.monto_soles), 0)
  const gastosSemana = gastos.filter(g => g.fecha >= week.from && g.fecha <= week.to).reduce((s, g) => s + Number(g.monto), 0)
  const gananciaSemana = ventasSemana - gastosSemana

  // Gráfico: últimos 7 días
  const days7 = last7Days()
  const chartLabels = days7.map(d => {
    const date = new Date(d + 'T12:00:00')
    return date.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' })
  })
  const chartVentas = days7.map(d => ventas.filter(v => v.fecha === d).reduce((s, v) => s + Number(v.monto_soles), 0))
  const chartGastos = days7.map(d => gastos.filter(g => g.fecha === d).reduce((s, g) => s + Number(g.monto), 0))

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Ventas S/',
        data: chartVentas,
        backgroundColor: 'rgba(59,130,246,0.85)',
        hoverBackgroundColor: 'rgba(59,130,246,1)',
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 24,
      },
      {
        label: 'Gastos S/',
        data: chartGastos,
        backgroundColor: 'rgba(248,113,113,0.85)',
        hoverBackgroundColor: 'rgba(248,113,113,1)',
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 24,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
            `${ctx.dataset.label}: S/ ${fmt(ctx.parsed.y)}`,
        },
        backgroundColor: '#1F2937',
        titleColor: '#F9FAFB',
        bodyColor: '#D1D5DB',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      },
    },
    layout: { padding: { top: 16, bottom: 4, left: 0, right: 8 } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9CA3AF', font: { size: 11 } } },
      y: {
        beginAtZero: true,
        grace: '20%',
        grid: { color: '#F3F4F6' },
        border: { dash: [3, 3] },
        ticks: {
          color: '#9CA3AF',
          font: { size: 11 },
          maxTicksLimit: 5,
          callback: (v: number | string) => {
            const n = Number(v)
            if (n >= 1000) return `S/${(n / 1000).toFixed(1).replace('.0', '')}K`
            return `S/${n}`
          },
        },
      },
    },
  }

  // Últimos movimientos combinados (ventas + gastos, máx 8)
  const movimientos = [
    ...ventas.slice(0, 10).map(v => ({ id: v.id, tipo: 'venta' as const, desc: v.descripcion, monto: Number(v.monto_soles), fecha: v.fecha })),
    ...gastos.slice(0, 10).map(g => ({ id: g.id, tipo: 'gasto' as const, desc: g.descripcion, monto: Number(g.monto), fecha: g.fecha })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8)

  const cards = [
    {
      label: 'Ganancia hoy',
      value: `S/ ${fmt(gananciaHoy)}`,
      sub: `Ventas S/ ${fmt(ventasHoy)} − Gastos S/ ${fmt(gastosHoy)}`,
      trend: gananciaHoy,
      icon: CalendarDays,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Ganancia semana',
      value: `S/ ${fmt(gananciaSemana)}`,
      sub: 'Lun – Dom actual',
      trend: gananciaSemana,
      icon: Wallet,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
    {
      label: 'Gastos hoy',
      value: `S/ ${fmt(gastosHoy)}`,
      sub: `${gastos.filter(g => g.fecha === today).length} registros`,
      trend: null,
      icon: TrendingDown,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
    },
    {
      label: 'Gastos semana',
      value: `S/ ${fmt(gastosSemana)}`,
      sub: `${gastos.filter(g => g.fecha >= week.from && g.fecha <= week.to).length} registros`,
      trend: null,
      icon: TrendingDown,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ]

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1400px]">

      {/* KPIs operativos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} {...card(i * 0.05)}
            className="bg-white rounded-2xl border border-gray-100 p-4 lg:p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="w-9 h-9" />
                <Skeleton className="w-28 h-6 mt-2" />
                <Skeleton className="w-20 h-3" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 ${c.iconBg} rounded-xl flex items-center justify-center`}>
                    <c.icon size={17} className={c.iconColor} />
                  </div>
                  {c.trend !== null && (
                    <span className={`flex items-center gap-0.5 text-xs font-semibold ${c.trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {c.trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {c.trend >= 0 ? 'positivo' : 'negativo'}
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-gray-400 mb-0.5">{c.label}</p>
                <p className="text-xl font-bold text-gray-900 tracking-tight">{c.value}</p>
                <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Gráfico 7 días + Panel resumen semana */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div {...card(0.2)} className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Últimos 7 días</h3>
              <p className="text-xs text-gray-400 mt-0.5">Ventas vs Gastos diarios</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-blue-500" />
                Ventas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-red-400" />
                Gastos
              </span>
            </div>
          </div>
          {loading ? (
            <Skeleton className="w-full h-44" />
          ) : (
            <div className="h-44">
              <Bar data={chartData} options={chartOptions as object} />
            </div>
          )}
        </motion.div>

        {/* Panel resumen semana */}
        <motion.div {...card(0.25)} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Resumen Semanal</h3>
          {[
            { label: 'Ventas semana', value: `S/ ${fmt(ventasSemana)}`, icon: TrendingUp, iconCls: 'text-blue-500', iconBg: 'bg-blue-50', valCls: 'text-blue-700' },
            { label: 'Gastos semana', value: `S/ ${fmt(gastosSemana)}`, icon: TrendingDown, iconCls: 'text-red-400', iconBg: 'bg-red-50', valCls: 'text-red-600' },
            { label: 'Ganancia semana', value: `S/ ${fmt(gananciaSemana)}`, icon: gananciaSemana >= 0 ? TrendingUp : TrendingDown, iconCls: gananciaSemana >= 0 ? 'text-emerald-600' : 'text-red-500', iconBg: gananciaSemana >= 0 ? 'bg-emerald-50' : 'bg-red-50', valCls: gananciaSemana >= 0 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold' },
            { label: 'Ventas hoy', value: `S/ ${fmt(ventasHoy)}`, icon: DollarSign, iconCls: 'text-teal-500', iconBg: 'bg-teal-50', valCls: 'text-teal-700' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg}`}>
                  <item.icon size={11} className={item.iconCls} />
                </div>
                <span className="text-xs text-gray-500">{item.label}</span>
              </div>
              <span className={`text-xs font-semibold ${item.valCls}`}>{loading ? '—' : item.value}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Detalle del día seleccionado */}
      {dia && (
        <motion.div {...card(0.28)} className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Detalle del {new Date(dia + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Ventas y gastos de este día</p>
            </div>
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Receipt size={14} className="text-blue-500" />
            </div>
          </div>
          {(() => {
            const diaVentas = ventas.filter(v => v.fecha === dia)
            const diaGastos = gastos.filter(g => g.fecha === dia)
            const diaTotalV = diaVentas.reduce((s, v) => s + Number(v.monto_soles), 0)
            const diaTotalG = diaGastos.reduce((s, g) => s + Number(g.monto), 0)
            const diaGanancia = diaTotalV - diaTotalG

            if (diaVentas.length === 0 && diaGastos.length === 0) {
              return <p className="text-sm text-gray-400 text-center py-4">Sin movimientos este día</p>
            }

            return (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50/50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-500 font-medium">Ventas</p>
                    <p className="text-sm font-bold text-blue-700">S/ {fmt(diaTotalV)}</p>
                    <p className="text-[10px] text-gray-400">{diaVentas.length} reg.</p>
                  </div>
                  <div className="bg-red-50/50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-500 font-medium">Gastos</p>
                    <p className="text-sm font-bold text-red-600">S/ {fmt(diaTotalG)}</p>
                    <p className="text-[10px] text-gray-400">{diaGastos.length} reg.</p>
                  </div>
                  <div className={`${diaGanancia >= 0 ? 'bg-emerald-50/50' : 'bg-red-50/50'} rounded-xl p-3 text-center`}>
                    <p className="text-[10px] text-gray-500 font-medium">Ganancia</p>
                    <p className={`text-sm font-bold ${diaGanancia >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>S/ {fmt(diaGanancia)}</p>
                  </div>
                </div>

                {diaVentas.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">Ventas</p>
                    <div className="space-y-1">
                      {diaVentas.map(v => (
                        <div key={v.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                          <span className="text-xs text-gray-700 truncate max-w-[200px]">{v.descripcion}</span>
                          <span className="text-xs font-semibold text-gray-900">S/ {fmt(Number(v.monto_soles))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {diaGastos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">Gastos</p>
                    <div className="space-y-1">
                      {diaGastos.map(g => (
                        <div key={g.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                          <span className="text-xs text-gray-700 truncate max-w-[200px]">{g.descripcion}</span>
                          <span className="text-xs font-semibold text-red-600">S/ {fmt(Number(g.monto))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </motion.div>
      )}

      {/* Últimos movimientos */}
      <motion.div {...card(0.3)} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-800">Últimos Movimientos</h3>
          <p className="text-xs text-gray-400 mt-0.5">Ventas y gastos más recientes</p>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="w-full h-10" />)}
          </div>
        ) : movimientos.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Sin movimientos este mes</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {movimientos.map(m => (
              <div key={m.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${m.tipo === 'venta' ? 'bg-blue-50' : 'bg-red-50'}`}>
                    {m.tipo === 'venta' ? <TrendingUp size={13} className="text-blue-500" /> : <TrendingDown size={13} className="text-red-400" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-800 truncate max-w-[200px]">{m.desc}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(m.fecha + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} · {m.tipo === 'venta' ? 'Venta' : 'Gasto'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-semibold ${m.tipo === 'venta' ? 'text-blue-700' : 'text-red-500'}`}>
                  {m.tipo === 'venta' ? '+' : '-'}S/ {fmt(m.monto)}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
