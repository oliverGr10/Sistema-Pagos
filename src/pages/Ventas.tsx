import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Plus, Trash2, CheckCircle2, Clock, User, Search } from 'lucide-react'
import { supabase, type Venta, type Cliente } from '../lib/supabase'

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function monthRange(mes: string) {
  const [y, mo] = mes.split('-')
  const last = new Date(Number(y), Number(mo), 0).getDate()
  return { from: `${y}-${mo}-01`, to: `${y}-${mo}-${last}` }
}

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const EMPTY = { descripcion: '', fecha: localToday(), monto_soles: '', monto_dolares: '', cliente_id: '', clienteNombre: '', pagado: true }

const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />
)

// Combobox de cliente: busca existentes o crea uno nuevo inline
function ClienteCombobox({
  clientes,
  value,
  onChange,
  onClienteCreado,
}: {
  clientes: Cliente[]
  value: string
  onChange: (id: string, nombre: string) => void
  onClienteCreado: (c: Cliente) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [creando, setCreando] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Nombre del cliente seleccionado
  const seleccionado = clientes.find(c => c.id === value)

  const filtrados = query.trim()
    ? clientes.filter(c => c.nombre.toLowerCase().includes(query.toLowerCase()))
    : clientes

  const queryExacto = clientes.some(c => c.nombre.toLowerCase() === query.trim().toLowerCase())

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const crearCliente = async () => {
    if (!query.trim()) return
    setCreando(true)
    const nombre = query.trim().toUpperCase()
    const { data } = await supabase.from('clientes').insert({ nombre }).select().single()
    setCreando(false)
    if (data) {
      onClienteCreado(data as Cliente)
      onChange(data.id, data.nombre)
      setQuery('')
      setOpen(false)
    }
  }

  const limpiar = () => {
    onChange('', '')
    setQuery('')
    setOpen(true)
  }

  return (
    <div ref={ref} className="relative">
      {seleccionado ? (
        // Cliente seleccionado — mostrar chip con opción de cambiar
        <div className="flex items-center gap-2 border border-blue-200 bg-blue-50 rounded-xl px-3 py-2.5">
          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{seleccionado.nombre[0]}</span>
          </div>
          <span className="text-sm font-semibold text-blue-800 flex-1">{seleccionado.nombre}</span>
          <button onClick={limpiar} className="text-blue-400 hover:text-blue-600 text-lg leading-none ml-1">×</button>
        </div>
      ) : (
        // Campo de búsqueda
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Buscar o agregar cliente..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
          />
        </div>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {open && !seleccionado && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-52 overflow-y-auto"
          >
            {filtrados.length === 0 && !query.trim() && (
              <p className="px-4 py-3 text-xs text-gray-400">Escribe para buscar...</p>
            )}

            {filtrados.map(c => (
              <button key={c.id}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                onMouseDown={e => { e.preventDefault(); onChange(c.id, c.nombre); setQuery(''); setOpen(false) }}
              >
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-blue-600 text-xs font-bold">{c.nombre[0]}</span>
                </div>
                <span className="text-sm text-gray-800">{c.nombre}</span>
              </button>
            ))}

            {/* Opción agregar nuevo */}
            {query.trim() && !queryExacto && (
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-t border-gray-100"
                onMouseDown={e => { e.preventDefault(); crearCliente() }}
                disabled={creando}
              >
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <Plus size={12} className="text-white" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-blue-700">
                    {creando ? 'Creando...' : `Agregar "${query.trim().toUpperCase()}"`}
                  </span>
                  <p className="text-xs text-blue-400">Nuevo cliente</p>
                </div>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Ventas({ mes, dia }: { mes: string; dia?: string | null }) {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchVentas = () => {
    setLoading(true)
    const { from, to } = monthRange(mes)
    supabase
      .from('ventas')
      .select('*, clientes(nombre)')
      .gte('fecha', from).lte('fecha', to)
      .order('fecha', { ascending: false })
      .then(({ data }) => { setVentas((data ?? []) as Venta[]); setLoading(false) })
  }

  const fetchClientes = () => {
    supabase.from('clientes').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => setClientes(data ?? []))
  }

  useEffect(() => { fetchClientes() }, [])
  useEffect(() => { fetchVentas() }, [mes])

  // Filtrar por día si está seleccionado
  const displayVentas = dia ? ventas.filter(v => v.fecha === dia) : ventas
  const totalSoles = displayVentas.reduce((s, v) => s + Number(v.monto_soles), 0)
  const totalDolares = displayVentas.reduce((s, v) => s + Number(v.monto_dolares), 0)

  const handleSave = async () => {
    if (!form.cliente_id) { setError('Selecciona o agrega un cliente'); return }

    if (!form.descripcion.trim()) { setError('Ingresa una descripción'); return }
    if (!form.monto_soles && !form.monto_dolares) { setError('Ingresa al menos un monto'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('ventas').insert({
      descripcion: form.descripcion.trim(),
      fecha: form.fecha,
      monto_soles: Number(form.monto_soles) || 0,
      monto_dolares: Number(form.monto_dolares) || 0,
      cliente_id: form.cliente_id,

      pagado: form.pagado,
    })
    setSaving(false)
    if (err) { setError('Error al guardar.'); return }
    setShowForm(false); setForm(EMPTY); fetchVentas()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta venta?')) return
    await supabase.from('ventas').delete().eq('id', id)
    fetchVentas()
  }

  const handleTogglePagado = async (v: Venta) => {
    await supabase.from('ventas').update({ pagado: !v.pagado }).eq('id', v.id)
    setVentas(prev => prev.map(x => x.id === v.id ? { ...x, pagado: !v.pagado } : x))
  }

  const openForm = () => {
    const defaultDate = dia ?? (() => {
      const [y, m] = mes.split('-')
      const today = new Date()
      const isCurrentMonth = today.getFullYear() === Number(y) && (today.getMonth() + 1) === Number(m)
      return isCurrentMonth ? localToday() : `${y}-${m}-01`
    })()
    setShowForm(true)
    setForm({ ...EMPTY, fecha: defaultDate })
    setError('')
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1400px]">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Ventas</h2>
          <p className="text-sm text-gray-400 mt-0.5">{displayVentas.length} facturas {dia ? 'este día' : 'este mes'}</p>
        </div>
        <button onClick={openForm}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
        >
          <Plus size={15} /> Agregar Venta
        </button>
      </div>

      {/* Cards resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-blue-600 rounded-2xl p-5 flex items-center justify-between"
        >
          <div>
            <p className="text-blue-100 text-xs font-medium">Total Ventas (Soles)</p>
            <p className="text-2xl font-bold text-white tracking-tight mt-0.5">S/ {fmt(totalSoles)}</p>
          </div>
          <div className="w-11 h-11 bg-blue-500 rounded-xl flex items-center justify-center">
            <TrendingUp size={20} className="text-white" />
          </div>
        </motion.div>
        {totalDolares > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between shadow-sm"
          >
            <div>
              <p className="text-gray-400 text-xs font-medium">Ingresos en Dólares</p>
              <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">$ {fmt(totalDolares)}</p>
              <p className="text-xs text-gray-400 mt-0.5">No se convierte a soles</p>
            </div>
            <div className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-teal-500" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-800">{dia ? 'Facturas del Día' : 'Facturas del Mes'}</h3>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="w-full h-12" />)}
          </div>
        ) : displayVentas.length === 0 ? (
          <div className="py-16 text-center">
            <TrendingUp size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">{dia ? 'Sin ventas este día' : 'Sin ventas registradas'}</p>
            <p className="text-xs text-gray-400 mt-1">{dia ? 'Selecciona otro día o ve el mes completo' : 'Agrega la primera venta del mes'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Cliente / Factura</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3 hidden md:table-cell">Fecha</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3 hidden lg:table-cell">Estado</th>
                  <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">Monto</th>
                  <th className="px-3 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {displayVentas.map(v => {
                  const clienteNombre = v.clientes?.nombre ?? '—'
                  return (
                    <tr key={v.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                            <User size={13} className="text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-xs">{clienteNombre}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[180px]">{v.descripcion}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-400 hidden md:table-cell">
                        {new Date(v.fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <button
                          onClick={() => handleTogglePagado(v)}
                          title="Click para cambiar estado"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-80 ${
                            v.pagado
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          {v.pagado
                            ? <><CheckCircle2 size={11} /> Pagado</>
                            : <><Clock size={11} /> Pendiente</>
                          }
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {v.monto_soles > 0 && <p className="font-semibold text-gray-900 text-xs">S/ {fmt(Number(v.monto_soles))}</p>}
                        {v.monto_dolares > 0 && <p className="text-xs text-teal-600 font-medium">$ {fmt(Number(v.monto_dolares))}</p>}
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => handleDelete(v.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer lateral */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50 flex items-end lg:items-stretch lg:justify-end"
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}
          >
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="bg-white w-full lg:w-[420px] h-[90vh] lg:h-full rounded-t-3xl lg:rounded-none p-6 shadow-2xl overflow-y-auto flex flex-col"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Registrar Venta</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Los campos con * son obligatorios</p>
                </div>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl leading-none">×</button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>
              )}

              <div className="space-y-4 flex-1">
                {/* Cliente con combobox */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Cliente *
                  </label>
                  <ClienteCombobox
                    clientes={clientes}
                    value={form.cliente_id}
                    onChange={(id, nombre) => setForm(f => ({ ...f, cliente_id: id, clienteNombre: nombre }))}
                    onClienteCreado={c => setClientes(prev => [...prev, c].sort((a, b) => a.nombre.localeCompare(b.nombre)))}
                  />
                  <p className="text-xs text-gray-400 mt-1">Si el cliente no existe, escríbelo y aparecerá la opción para crearlo.</p>
                </div>

                {/* Descripción */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción / N° Factura *</label>
                  <input
                    className="w-full mt-1.5 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="FACTURA EB01-4, adelanto carga..."
                    value={form.descripcion}
                    onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  />
                </div>

                {/* Fecha */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha *</label>
                  <input type="date"
                    className="w-full mt-1.5 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  />
                </div>

                {/* Montos */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    Monto <span className="normal-case font-normal text-gray-400">(al menos uno)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">S/</span>
                      <input type="number" min="0" step="0.01"
                        className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="0.00"
                        value={form.monto_soles}
                        onChange={e => setForm(f => ({ ...f, monto_soles: e.target.value }))}
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">$</span>
                      <input type="number" min="0" step="0.01"
                        className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="0.00"
                        value={form.monto_dolares}
                        onChange={e => setForm(f => ({ ...f, monto_dolares: e.target.value }))}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Los dólares se guardan separados y no se convierten a soles.</p>
                </div>

                {/* Estado de pago */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Estado del pago</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, pagado: true }))}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        form.pagado
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <CheckCircle2 size={15} /> Pagado
                    </button>
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, pagado: false }))}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        !form.pagado
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <Clock size={15} /> Pendiente
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-4">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Venta'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
