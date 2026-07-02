import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { TrendingUp, TrendingDown, Download, FileText, DollarSign } from 'lucide-react'
import { supabase, type Venta, type Gasto } from '../lib/supabase'

type ServicioResumen = { id: string; nombre: string; total_soles: number; total_dolares: number; num_ventas: number }

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function fmtBig(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return fmt(n)
}

function monthRange(mes: string) {
  const [y, mo] = mes.split('-')
  const last = new Date(Number(y), Number(mo), 0).getDate()
  return { from: `${y}-${mo}-01`, to: `${y}-${mo}-${last}`, days: last }
}

function getWeeks(mes: string): { label: string; from: string; to: string }[] {
  const [y, mo] = mes.split('-')
  const year = Number(y), month = Number(mo)
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const weeks: { label: string; from: string; to: string }[] = []

  let cur = new Date(firstDay)
  // Ajusta al lunes de esa semana o queda en día 1
  let weekStart = new Date(cur)
  let num = 1

  while (weekStart <= lastDay) {
    // Fin de semana = domingo o fin de mes
    const dayOfWeek = weekStart.getDay() // 0=dom,1=lun,...,6=sab
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
    let weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + daysUntilSunday)
    if (weekEnd > lastDay) weekEnd = new Date(lastDay)

    const pad = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    weeks.push({
      label: `Semana ${num}`,
      from: pad(weekStart),
      to: pad(weekEnd),
    })

    weekStart = new Date(weekEnd)
    weekStart.setDate(weekStart.getDate() + 1)
    num++
  }

  return weeks
}

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function Reportes({ mes }: { mes: string }) {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [anualVentas, setAnualVentas] = useState<number[]>(Array(12).fill(0))
  const [anualDolares, setAnualDolares] = useState<number[]>(Array(12).fill(0))
  const [anualGastos, setAnualGastos] = useState<number[]>(Array(12).fill(0))
  const [serviciosResumen, setServiciosResumen] = useState<ServicioResumen[]>([])
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  const year = mes.split('-')[0]

  useEffect(() => {
    setLoading(true)
    const { from, to } = monthRange(mes)
    Promise.all([
      supabase.from('ventas').select('*').gte('fecha', from).lte('fecha', to),
      supabase.from('gastos').select('*').gte('fecha', from).lte('fecha', to),
      supabase.from('ventas').select('fecha, monto_soles, monto_dolares').gte('fecha', `${year}-01-01`).lte('fecha', `${year}-12-31`),
      supabase.from('gastos').select('fecha, monto').gte('fecha', `${year}-01-01`).lte('fecha', `${year}-12-31`),
      supabase.from('servicios').select('id, nombre').eq('activo', true),
      supabase.from('ventas').select('servicio_id, monto_soles, monto_dolares').gte('fecha', from).lte('fecha', to),
    ]).then(([v, g, av, ag, svcs, vsrv]) => {
      setVentas((v.data ?? []) as Venta[])
      setGastos((g.data ?? []) as Gasto[])

      const vs = Array(12).fill(0)
      const vd = Array(12).fill(0)
      const gs = Array(12).fill(0)
      for (const x of av.data ?? []) {
        const m = Number(x.fecha.split('-')[1]) - 1
        vs[m] += Number(x.monto_soles)
        vd[m] += Number(x.monto_dolares)
      }
      for (const x of ag.data ?? []) {
        const m = Number(x.fecha.split('-')[1]) - 1
        gs[m] += Number(x.monto)
      }
      setAnualVentas(vs)
      setAnualDolares(vd)
      setAnualGastos(gs)

      // Resumen por servicio del mes
      const mapa: Record<string, { soles: number; dolares: number; count: number }> = {}
      for (const vv of vsrv.data ?? []) {
        if (!vv.servicio_id) continue
        if (!mapa[vv.servicio_id]) mapa[vv.servicio_id] = { soles: 0, dolares: 0, count: 0 }
        mapa[vv.servicio_id].soles += Number(vv.monto_soles)
        mapa[vv.servicio_id].dolares += Number(vv.monto_dolares)
        mapa[vv.servicio_id].count++
      }
      const resumen = (svcs.data ?? [])
        .map(s => ({ id: s.id, nombre: s.nombre, total_soles: mapa[s.id]?.soles ?? 0, total_dolares: mapa[s.id]?.dolares ?? 0, num_ventas: mapa[s.id]?.count ?? 0 }))
        .filter(s => s.num_ventas > 0)
        .sort((a, b) => b.total_soles - a.total_soles)
      setServiciosResumen(resumen)
      setLoading(false)
    })
  }, [mes])

  const totalVentasSoles = ventas.reduce((s, v) => s + Number(v.monto_soles), 0)
  const totalVentasDolares = ventas.reduce((s, v) => s + Number(v.monto_dolares), 0)
  const totalGastos = gastos.reduce((s, g) => s + Number(g.monto), 0)
  const ganancia = totalVentasSoles - totalGastos

  const weeks = getWeeks(mes)

  // Ganancia por semana
  const weekData = weeks.map(w => {
    const wv = ventas.filter(v => v.fecha >= w.from && v.fecha <= w.to)
    const wg = gastos.filter(g => g.fecha >= w.from && g.fecha <= w.to)
    const vs = wv.reduce((s, v) => s + Number(v.monto_soles), 0)
    const vd = wv.reduce((s, v) => s + Number(v.monto_dolares), 0)
    const gs = wg.reduce((s, g) => s + Number(g.monto), 0)
    return { ...w, ventas_soles: vs, ventas_dolares: vd, gastos: gs, ganancia: vs - gs }
  })

  // Gráfico anual
  const barData = {
    labels: MONTHS_ES,
    datasets: [
      {
        label: 'Ventas S/',
        data: anualVentas,
        backgroundColor: '#3B82F6',
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Gastos S/',
        data: anualGastos,
        backgroundColor: '#FCA5A5',
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { size: 11 }, color: '#6B7280', boxWidth: 12, padding: 16 } },
      tooltip: {
        callbacks: { label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) => `${ctx.dataset.label}: S/ ${fmt(ctx.parsed.y)}` },
        backgroundColor: '#fff', titleColor: '#374151', bodyColor: '#6B7280',
        borderColor: '#E5E7EB', borderWidth: 1, padding: 10, cornerRadius: 10,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9CA3AF', font: { size: 11 } } },
      y: {
        grid: { color: '#F3F4F6' },
        ticks: { color: '#9CA3AF', font: { size: 11 }, callback: (v: number | string) => `S/${fmtBig(Number(v))}` },
      },
    },
  }

  const csvSafe = (val: string | number) => {
    let s = String(val)
    // Neutralizar fórmulas de spreadsheet (=, +, -, @, |, \t, \r)
    if (/^[=+\-@|\t\r]/.test(s)) s = "'" + s
    // Escapar comillas dobles y envolver si tiene coma, comilla o salto de línea
    if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'
    return s
  }

  const exportCSV = () => {
    const sep = ';' // Punto y coma para mejor compatibilidad con Excel en español
    const fmtFecha = (f: string) => {
      const d = new Date(f + 'T00:00:00')
      return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    const rows = [
      ['D&P SEÑOR CAUTIVO - TRANSPORTES Y SERVICIOS S.R.L.'],
      [`REPORTE MENSUAL: ${mesLabel.toUpperCase()}`],
      [`Generado: ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}`],
      [],
      ['══ RESUMEN GENERAL ══'],
      ['Concepto', 'Monto'],
      ['Total Ventas (Soles)', `S/ ${fmt(totalVentasSoles)}`],
      ['Total Ventas (Dólares)', `$ ${fmt(totalVentasDolares)}`],
      ['Total Gastos', `S/ ${fmt(totalGastos)}`],
      ['Ganancia Neta', `S/ ${fmt(ganancia)}`],
      ['Nro. de Ventas', String(ventas.length)],
      ['Nro. de Gastos', String(gastos.length)],
      [],
      ['══ DETALLE POR SEMANA ══'],
      ['Semana', 'Desde', 'Hasta', 'Ventas S/', 'Ventas $', 'Gastos S/', 'Ganancia S/'],
      ...weekData.map(w => [
        w.label, fmtFecha(w.from), fmtFecha(w.to),
        `S/ ${fmt(w.ventas_soles)}`, `$ ${fmt(w.ventas_dolares)}`,
        `S/ ${fmt(w.gastos)}`, `S/ ${fmt(w.ganancia)}`,
      ]),
      [],
      ['══ VENTAS DEL MES ══'],
      ['N°', 'Fecha', 'Descripción', 'Monto Soles', 'Monto Dólares', 'Estado'],
      ...ventas.map((v, i) => [
        String(i + 1), fmtFecha(v.fecha), csvSafe(v.descripcion),
        `S/ ${fmt(Number(v.monto_soles))}`, `$ ${fmt(Number(v.monto_dolares))}`,
        v.pagado ? 'Pagado' : 'Pendiente',
      ]),
      [],
      ['══ GASTOS DEL MES ══'],
      ['N°', 'Fecha', 'Descripción', 'Monto'],
      ...gastos.map((g, i) => [
        String(i + 1), fmtFecha(g.fecha), csvSafe(g.descripcion),
        `S/ ${fmt(Number(g.monto))}`,
      ]),
    ]
    const csv = rows.map(r => r.map(c => csvSafe(c)).join(sep)).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `reporte-${mesLabel.replace(' ', '-')}.csv`
    a.click()
  }

  const exportPDF = () => {
    window.print()
  }

  const mesLabel = (() => {
    const [y, m] = mes.split('-')
    return `${MONTHS_ES[Number(m) - 1]} ${y}`
  })()

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1400px]" ref={printRef}>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Reporte — {mesLabel}</h2>
          <p className="text-sm text-gray-400 mt-0.5">Resumen mensual</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 text-sm font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer active:scale-95"
          >
            <Download size={14} /> CSV
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95"
          >
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* KPIs grandes para el jefe */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ventas del Mes', value: `S/ ${fmt(totalVentasSoles)}`, icon: TrendingUp, bg: 'bg-blue-50 border border-blue-100/60', text: 'text-blue-700', sub: `${ventas.length} facturas`, subColor: 'text-blue-400', iconBg: 'bg-blue-100' },
          { label: 'Gastos del Mes', value: `S/ ${fmt(totalGastos)}`, icon: TrendingDown, bg: 'bg-red-50 border border-red-100/60', text: 'text-red-600', sub: `${gastos.length} registros`, subColor: 'text-red-300', iconBg: 'bg-red-100' },
          { label: 'Ganancia Neta', value: `S/ ${fmt(ganancia)}`, icon: TrendingUp, bg: ganancia >= 0 ? 'bg-emerald-50 border border-emerald-100/60' : 'bg-red-50 border border-red-100/60', text: ganancia >= 0 ? 'text-emerald-700' : 'text-red-600', sub: ganancia >= 0 ? 'Positivo ✓' : 'Negativo ✗', subColor: ganancia >= 0 ? 'text-emerald-400' : 'text-red-400', iconBg: ganancia >= 0 ? 'bg-emerald-100' : 'bg-red-100' },
          { label: 'Ingresos Dolares', value: `$ ${fmt(totalVentasDolares)}`, icon: DollarSign, bg: 'bg-amber-50 border border-amber-100/60', text: 'text-amber-700', sub: 'No convertido', subColor: 'text-amber-400', iconBg: 'bg-amber-100' },
        ].map((k, i) => (
          <motion.div key={k.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={`${k.bg} rounded-2xl p-5`}
          >
            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                <div className="w-24 h-7 bg-gray-100 rounded mt-2" />
              </div>
            ) : (
              <>
                <div className={`w-8 h-8 ${k.iconBg} rounded-lg flex items-center justify-center mb-3`}>
                  <k.icon size={15} className={k.text} />
                </div>
                <p className={`text-xs font-medium ${k.text} opacity-60`}>{k.label}</p>
                <p className={`text-xl font-extrabold ${k.text} tracking-tight mt-0.5`}>{k.value}</p>
                <p className={`text-xs ${k.subColor} mt-1.5 font-medium`}>{k.sub}</p>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Semanas */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-800">Ganancia por Semana — {mesLabel}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Semanas calendario (lunes a domingo)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Período</th>
                <th className="text-right text-xs font-medium text-gray-400 px-4 py-3">Ventas S/</th>
                <th className="text-right text-xs font-medium text-gray-400 px-4 py-3 hidden sm:table-cell">Ventas $</th>
                <th className="text-right text-xs font-medium text-gray-400 px-4 py-3">Gastos S/</th>
                <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">Ganancia S/</th>
              </tr>
            </thead>
            <tbody>
              {weekData.map((w, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-xs font-semibold text-gray-800">{w.label}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(w.from + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} –{' '}
                      {new Date(w.to + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-gray-800">
                    {w.ventas_soles > 0 ? `S/ ${fmt(w.ventas_soles)}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-teal-600 hidden sm:table-cell">
                    {w.ventas_dolares > 0 ? `$ ${fmt(w.ventas_dolares)}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-red-400">
                    {w.gastos > 0 ? `S/ ${fmt(w.gastos)}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${w.ganancia >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      {w.ganancia >= 0 ? '+' : ''}S/ {fmt(w.ganancia)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-100">
                <td className="px-5 py-3 text-xs font-bold text-gray-700">TOTAL MES</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-gray-900">S/ {fmt(totalVentasSoles)}</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-teal-700 hidden sm:table-cell">$ {fmt(totalVentasDolares)}</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-red-500">S/ {fmt(totalGastos)}</td>
                <td className="px-5 py-3 text-right">
                  <span className={`text-xs font-black px-2 py-1 rounded-lg ${ganancia >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                    {ganancia >= 0 ? '+' : ''}S/ {fmt(ganancia)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>

      {/* Ingresos por tipo de servicio */}
      {serviciosResumen.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">Ingresos por Servicio — {mesLabel}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Qué tipo de trabajo generó más dinero este mes</p>
          </div>
          <div className="divide-y divide-gray-50">
            {serviciosResumen.map((s, i) => {
              const pct = totalVentasSoles > 0 ? (s.total_soles / totalVentasSoles) * 100 : 0
              return (
                <div key={s.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-blue-600">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">{s.nombre}</p>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs font-bold text-gray-900">S/ {fmt(s.total_soles)}</p>
                        {s.total_dolares > 0 && <p className="text-xs text-teal-600 font-medium">$ {fmt(s.total_dolares)}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{pct.toFixed(0)}% · {s.num_ventas} {s.num_ventas === 1 ? 'venta' : 'ventas'}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Gráfico anual */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
      >
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Comparativo Anual {year}</h3>
        <p className="text-xs text-gray-400 mb-4">Ventas vs Gastos por mes (en soles)</p>
        <div className="h-56">
          <Bar data={barData} options={barOptions as object} />
        </div>
      </motion.div>

      {/* Resumen anual tabla */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-800">Resumen Anual {year}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Mes</th>
                <th className="text-right text-xs font-medium text-gray-400 px-4 py-3">Ventas S/</th>
                <th className="text-right text-xs font-medium text-gray-400 px-4 py-3 hidden sm:table-cell">Ingresos $</th>
                <th className="text-right text-xs font-medium text-gray-400 px-4 py-3">Gastos S/</th>
                <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">Ganancia S/</th>
              </tr>
            </thead>
            <tbody>
              {MONTHS_ES.map((m, i) => {
                const v = anualVentas[i]
                const d = anualDolares[i]
                const g = anualGastos[i]
                const gan = v - g
                const isCurrent = String(i + 1).padStart(2, '0') === mes.split('-')[1]
                return (
                  <tr key={m} className={`border-b border-gray-50 last:border-0 ${isCurrent ? 'bg-blue-50/40' : 'hover:bg-gray-50/50'} transition-colors`}>
                    <td className="px-5 py-2.5">
                      <span className={`text-xs font-semibold ${isCurrent ? 'text-blue-600' : 'text-gray-700'}`}>
                        {m} {year}{isCurrent ? ' ←' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-700">
                      {v > 0 ? `S/ ${fmt(v)}` : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-teal-600 hidden sm:table-cell">
                      {d > 0 ? `$ ${fmt(d)}` : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-red-400">
                      {g > 0 ? `S/ ${fmt(g)}` : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {(v > 0 || g > 0) ? (
                        <span className={`text-xs font-bold ${gan >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {gan >= 0 ? '+' : ''}S/ {fmt(gan)}
                        </span>
                      ) : <span className="text-gray-200 text-xs">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
