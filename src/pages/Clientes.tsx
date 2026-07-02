import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, ChevronRight, X, TrendingUp, DollarSign, Receipt } from 'lucide-react'
import { supabase, type Cliente, type Venta } from '../lib/supabase'

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />
)

type ClienteConTotales = Cliente & {
  total_soles: number
  total_dolares: number
  num_ventas: number
  ultima_venta: string | null
}

export default function Clientes() {
  const [clientes, setClientes] = useState<ClienteConTotales[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ClienteConTotales | null>(null)
  const [historial, setHistorial] = useState<Venta[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const fetchClientes = async () => {
    setLoading(true)
    const { data: cls } = await supabase.from('clientes').select('*').eq('activo', true).order('nombre')
    const { data: ventas } = await supabase.from('ventas').select('cliente_id, monto_soles, monto_dolares, fecha')

    const mapa: Record<string, { soles: number; dolares: number; count: number; ultima: string | null }> = {}
    for (const v of ventas ?? []) {
      if (!v.cliente_id) continue
      if (!mapa[v.cliente_id]) mapa[v.cliente_id] = { soles: 0, dolares: 0, count: 0, ultima: null }
      mapa[v.cliente_id].soles += Number(v.monto_soles)
      mapa[v.cliente_id].dolares += Number(v.monto_dolares)
      mapa[v.cliente_id].count++
      if (!mapa[v.cliente_id].ultima || v.fecha > mapa[v.cliente_id].ultima!) {
        mapa[v.cliente_id].ultima = v.fecha
      }
    }

    const result = (cls ?? []).map(c => ({
      ...c,
      total_soles: mapa[c.id]?.soles ?? 0,
      total_dolares: mapa[c.id]?.dolares ?? 0,
      num_ventas: mapa[c.id]?.count ?? 0,
      ultima_venta: mapa[c.id]?.ultima ?? null,
    }))

    setClientes(result)
    setLoading(false)
  }

  useEffect(() => { fetchClientes() }, [])

  const openCliente = async (c: ClienteConTotales) => {
    setSelected(c)
    setLoadingHistorial(true)
    const { data } = await supabase
      .from('ventas').select('*')
      .eq('cliente_id', c.id)
      .order('fecha', { ascending: false })
    setHistorial((data ?? []) as Venta[])
    setLoadingHistorial(false)
  }

  const handleAgregar = async () => {
    if (!nuevoNombre.trim()) return
    setSaving(true)
    await supabase.from('clientes').insert({ nombre: nuevoNombre.trim().toUpperCase() })
    setSaving(false)
    setNuevoNombre('')
    setShowForm(false)
    fetchClientes()
  }

  const filtered = clientes.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Clientes</h2>
          <p className="text-sm text-gray-400 mt-0.5">{clientes.length} clientes registrados</p>
        </div>
        <button onClick={() => { setShowForm(true); setNuevoNombre('') }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
        >
          <Plus size={15} /> Agregar Cliente
        </button>
      </div>

      {/* Búsqueda */}
      <input
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        placeholder="Buscar cliente..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Tabla de clientes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="w-full h-14" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              {search ? `Sin resultados para "${search}"` : 'Sin clientes registrados'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-400 px-5 py-3">Cliente</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Total S/</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3 hidden sm:table-cell">Total $</th>
                  <th className="text-center text-xs font-semibold text-gray-400 px-4 py-3 hidden md:table-cell">Ventas</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3 hidden lg:table-cell">Última venta</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => openCliente(c)}
                    className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-blue-600">{c.nombre[0]}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{c.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`text-sm font-bold ${c.total_soles > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                        {c.total_soles > 0 ? `S/ ${fmt(c.total_soles)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                      <span className={`text-sm font-semibold ${c.total_dolares > 0 ? 'text-teal-600' : 'text-gray-200'}`}>
                        {c.total_dolares > 0 ? `$ ${fmt(c.total_dolares)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center hidden md:table-cell">
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                        c.num_ventas > 0 ? 'bg-blue-50 text-blue-700' : 'text-gray-300'
                      }`}>
                        {c.num_ventas > 0 ? `${c.num_ventas} ${c.num_ventas === 1 ? 'venta' : 'ventas'}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                      <span className="text-xs text-gray-400">
                        {c.ultima_venta
                          ? new Date(c.ultima_venta + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight size={15} className="text-gray-200 group-hover:text-blue-400 transition-colors" />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel historial de cliente */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50 flex justify-end"
            onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
          >
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="bg-white w-full lg:max-w-md h-full overflow-y-auto flex flex-col shadow-2xl"
            >
              {/* Header panel */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                    <X size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600">{selected.nombre[0]}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{selected.nombre}</h3>
                    <p className="text-xs text-gray-400">{selected.num_ventas} ventas registradas</p>
                  </div>
                </div>

                {/* Totales del cliente */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-blue-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp size={13} className="text-blue-500" />
                      <p className="text-xs text-blue-500 font-medium">Total Soles</p>
                    </div>
                    <p className="text-lg font-bold text-blue-700">S/ {fmt(selected.total_soles)}</p>
                  </div>
                  {selected.total_dolares > 0 ? (
                    <div className="bg-teal-50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign size={13} className="text-teal-500" />
                        <p className="text-xs text-teal-500 font-medium">Total Dólares</p>
                      </div>
                      <p className="text-lg font-bold text-teal-700">$ {fmt(selected.total_dolares)}</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Receipt size={13} className="text-gray-400" />
                        <p className="text-xs text-gray-400 font-medium">Ventas</p>
                      </div>
                      <p className="text-lg font-bold text-gray-700">{selected.num_ventas}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Historial */}
              <div className="flex-1 p-6">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Historial de Ventas</h4>
                {loadingHistorial ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="w-full h-16" />)}
                  </div>
                ) : historial.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Sin ventas registradas</p>
                ) : (
                  <div className="space-y-2">
                    {historial.map(v => (
                      <div key={v.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-800">{v.descripcion}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(v.fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          {v.monto_soles > 0 && <p className="text-xs font-semibold text-gray-900">S/ {fmt(Number(v.monto_soles))}</p>}
                          {v.monto_dolares > 0 && <p className="text-xs font-semibold text-teal-600">$ {fmt(Number(v.monto_dolares))}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal agregar cliente */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            >
              <h2 className="text-base font-bold text-gray-900 mb-4">Nuevo Cliente</h2>
              <input
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Nombre del cliente"
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAgregar()}
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button onClick={handleAgregar} disabled={saving || !nuevoNombre.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
