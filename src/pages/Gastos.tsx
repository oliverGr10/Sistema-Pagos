import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Receipt, Plus, Trash2, ArrowDownLeft, User } from 'lucide-react'
import { supabase, type Gasto } from '../lib/supabase'

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2 }).format(n)
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

const CATEGORIAS = [
  { id: 'peaje',         label: 'Peaje',         calc: { cantLabel: 'N° de peajes',    precioLabel: 'S/ por peaje' } },
  { id: 'combustible',   label: 'Combustible',   calc: { cantLabel: 'Galones',          precioLabel: 'S/ por galón' } },
  { id: 'cochera',       label: 'Cochera',       calc: { cantLabel: 'Días',             precioLabel: 'S/ por día' } },
  { id: 'personal',      label: 'Personal',      calc: null },
  { id: 'afp_sctr',      label: 'AFP / SCTR',    calc: null },
  { id: 'alimentacion',  label: 'Alimentación',  calc: { cantLabel: 'Cantidad',         precioLabel: 'S/ por unidad' } },
  { id: 'mantenimiento', label: 'Mantenimiento', calc: null },
  { id: 'administrativo',label: 'Administrativo',calc: null },
]

const EMPTY = {
  nro: '', descripcion: '', fecha: localToday(), monto: '',
  cantidad: '', precio_unit: '',
  categoria: '',
  trabajador: '', dias: '', tarifa_dia: '',
}

const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />
)

function CategoriaCombobox({ value, onChange }: { value: string; onChange: (id: string, label: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const seleccionada = CATEGORIAS.find(c => c.id === value)
  // texto visible en el input: el label de la categoría seleccionada, o el valor custom
  const displayValue = seleccionada ? seleccionada.label : value.startsWith('custom_') ? value.replace('custom_', '') : value

  const filtradas = displayValue.trim() && !seleccionada
    ? CATEGORIAS.filter(c => c.label.toLowerCase().includes(displayValue.toLowerCase()))
    : CATEGORIAS
  const hayExacta = CATEGORIAS.some(c => c.label.toLowerCase() === displayValue.trim().toLowerCase())

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (id: string, label: string) => { onChange(id, label); setOpen(false) }

  return (
    <div ref={ref} className="relative">
      <input
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
        placeholder="Peaje, combustible, personal..."
        value={displayValue}
        onFocus={() => setOpen(true)}
        onChange={e => {
          const txt = e.target.value
          // resetea selección al tipear
          onChange('custom_' + txt, txt)
          setOpen(true)
        }}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden"
          >
            <div className="max-h-52 overflow-y-auto py-1">
              {filtradas.map(cat => (
                <button key={cat.id} onMouseDown={e => e.preventDefault()} onClick={() => select(cat.id, cat.label)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-red-50 hover:text-red-700 ${cat.id === value ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-700'}`}
                >
                  {cat.label}
                </button>
              ))}
              {displayValue.trim() && !hayExacta && (
                <button onMouseDown={e => e.preventDefault()} onClick={() => select('custom_' + displayValue.trim(), displayValue.trim())}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 font-medium hover:bg-red-50 border-t border-gray-100"
                >
                  + Usar "{displayValue.trim()}"
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Gastos({ mes, dia }: { mes: string; dia?: string | null }) {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchGastos = () => {
    setLoading(true)
    const { from, to } = monthRange(mes)
    supabase
      .from('gastos').select('*').gte('fecha', from).lte('fecha', to)
      .order('fecha', { ascending: false })
      .then(({ data }) => { setGastos(data ?? []); setLoading(false) })
  }

  useEffect(() => { fetchGastos() }, [mes])

  // Filtrar por día si está seleccionado
  const displayGastos = dia ? gastos.filter(g => g.fecha === dia) : gastos
  const total = displayGastos.reduce((s, g) => s + Number(g.monto), 0)

  const handleSave = async () => {
    const esPersonal = form.categoria === 'personal'
    if (esPersonal) {
      if (!form.trabajador.trim()) { setError('Ingresa el nombre del trabajador'); return }
      if (!form.dias || !form.tarifa_dia) { setError('Ingresa días y tarifa por día'); return }
    } else {
      if (!form.descripcion.trim()) { setError('Ingresa una descripción'); return }
    }
    if (!form.monto || Number(form.monto) <= 0) { setError('El monto debe ser mayor a 0'); return }

    const descripcion = esPersonal
      ? `PERSONAL - ${form.trabajador.trim().toUpperCase()} - ${form.dias} días × S/${form.tarifa_dia}`
      : form.descripcion.trim()

    setSaving(true); setError('')
    const { error: err } = await supabase.from('gastos').insert({
      nro: form.nro || null,
      descripcion,
      fecha: form.fecha,
      monto: Number(form.monto),
    })
    setSaving(false)
    if (err) { setError('Error al guardar.'); return }
    setShowForm(false); setForm(EMPTY); fetchGastos()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return
    await supabase.from('gastos').delete().eq('id', id)
    fetchGastos()
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1400px]">

      {/* Header de página */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900">Gastos</h2>
          <p className="text-sm text-gray-400 mt-0.5">{displayGastos.length} registros {dia ? 'este día' : 'este mes'}</p>
        </div>
        <button
          onClick={() => {
            const defaultDate = dia ?? (() => {
              const [y, m] = mes.split('-')
              const today = new Date()
              const isCurrentMonth = today.getFullYear() === Number(y) && (today.getMonth() + 1) === Number(m)
              return isCurrentMonth ? localToday() : `${y}-${m}-01`
            })()
            setShowForm(true)
            setForm({ ...EMPTY, fecha: defaultDate })
            setError('')
          }}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors shrink-0 whitespace-nowrap"
        >
          <Plus size={15} /> Agregar Gasto
        </button>
      </div>

      {/* Total card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center">
            <ArrowDownLeft size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400">{dia ? 'Total Gastos del Día' : 'Total Gastos del Mes'}</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">S/ {fmt(total)}</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-400">{displayGastos.length} registros</p>
          <p className="text-sm font-semibold text-gray-500 mt-0.5">Promedio: S/ {displayGastos.length ? fmt(total / displayGastos.length) : '0.00'}</p>
        </div>
      </motion.div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-800">Detalle de Gastos</h3>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="w-full h-12" />)}
          </div>
        ) : displayGastos.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">{dia ? 'Sin gastos este día' : 'Sin gastos registrados'}</p>
            <p className="text-xs text-gray-400 mt-1">{dia ? 'Selecciona otro día o ve el mes completo' : 'Agrega el primer gasto del mes'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Descripción</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3 hidden md:table-cell">Fecha</th>
                  <th className="text-left text-xs font-medium text-gray-400 px-3 py-3 hidden lg:table-cell">N° Factura</th>
                  <th className="text-right text-xs font-medium text-gray-400 px-5 py-3">Monto</th>
                  <th className="px-3 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {displayGastos.map(g => (
                  <tr key={g.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                          <Receipt size={13} className="text-red-400" />
                        </div>
                        <span className="font-medium text-gray-800 text-xs capitalize">{g.descripcion}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-400 hidden md:table-cell">
                      {new Date(g.fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {g.nro
                        ? <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{g.nro}</span>
                        : <span className="text-xs text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-semibold text-red-500 text-xs">−S/ {fmt(Number(g.monto))}</span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sheet lateral */}
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
              className="bg-white w-full lg:w-[420px] h-[88dvh] lg:h-full rounded-t-3xl lg:rounded-none p-5 lg:p-6 shadow-2xl overflow-y-auto flex flex-col"
            >
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-gray-900">Registrar Gasto</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Los campos con * son obligatorios</p>
                </div>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl leading-none">×</button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>
              )}

              <div className="space-y-4 flex-1">

                {/* Categoría */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Categoría</label>
                  <CategoriaCombobox
                    value={form.categoria}
                    onChange={(id) => setForm(f => ({
                      ...f,
                      categoria: id,
                      trabajador: '', dias: '', tarifa_dia: '', monto: '',
                      cantidad: '', precio_unit: '',
                    }))}
                  />
                </div>

                {/* Modo PERSONAL */}
                {form.categoria === 'personal' ? (
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={14} className="text-orange-500" />
                      <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Pago de trabajador</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Nombre del trabajador *</p>
                      <input
                        autoFocus
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all bg-white"
                        placeholder="Ej: Juan Pérez"
                        value={form.trabajador}
                        onChange={e => setForm(f => ({ ...f, trabajador: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Días trabajados *</p>
                        <input type="number" min="1" step="1"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all bg-white"
                          placeholder="22"
                          value={form.dias}
                          onChange={e => {
                            const dias = e.target.value
                            const monto = dias && form.tarifa_dia ? String(Number(dias) * Number(form.tarifa_dia)) : ''
                            setForm(f => ({ ...f, dias, monto }))
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Tarifa por día S/ *</p>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">S/</span>
                          <input type="number" min="0" step="0.01"
                            className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all bg-white"
                            placeholder="80.00"
                            value={form.tarifa_dia}
                            onChange={e => {
                              const tarifa = e.target.value
                              const monto = form.dias && tarifa ? String(Number(form.dias) * Number(tarifa)) : ''
                              setForm(f => ({ ...f, tarifa_dia: tarifa, monto }))
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {form.monto && (
                      <div className="bg-white rounded-xl border border-orange-200 px-4 py-3 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {form.dias} días × S/{form.tarifa_dia}
                        </p>
                        <p className="text-base font-bold text-orange-700">S/ {fmt(Number(form.monto))}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Descripción */}
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción del Gasto</label>
                      <input
                        autoFocus={!form.categoria}
                        className="w-full mt-1.5 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
                        placeholder="descripción del gasto..."
                        value={form.descripcion}
                        onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                      />
                    </div>

                    {/* Monto */}
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Monto *</label>
                      {(() => {
                        const catActiva = CATEGORIAS.find(c => c.id === form.categoria)
                        const calc = catActiva?.calc ?? null
                        return (
                          <>
                            {calc && (
                              <div className="grid grid-cols-2 gap-2 mt-1.5">
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">{calc.cantLabel}</p>
                                  <input type="number" min="1" step="1"
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
                                    placeholder="1"
                                    value={form.cantidad}
                                    onChange={e => {
                                      const cant = e.target.value
                                      const total = cant && form.precio_unit ? String(Number(cant) * Number(form.precio_unit)) : ''
                                      setForm(f => ({ ...f, cantidad: cant, monto: total }))
                                    }}
                                  />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">{calc.precioLabel}</p>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">S/</span>
                                    <input type="number" min="0" step="0.01"
                                      className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
                                      placeholder="0.00"
                                      value={form.precio_unit}
                                      onChange={e => {
                                        const precio = e.target.value
                                        const total = form.cantidad && precio ? String(Number(form.cantidad) * Number(precio)) : ''
                                        setForm(f => ({ ...f, precio_unit: precio, monto: total }))
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className={calc ? 'mt-2' : 'mt-1.5'}>
                              {calc && (
                                <p className="text-xs text-gray-400 mb-1">
                                  Total S/
                                  {!form.cantidad && !form.precio_unit && <span className="ml-1 text-gray-300">— o ingresa directo</span>}
                                </p>
                              )}
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">S/</span>
                                <input type="number" min="0" step="0.01"
                                  className={`w-full border rounded-xl pl-8 pr-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all ${
                                    form.monto ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200'
                                  }`}
                                  placeholder="0.00"
                                  value={form.monto}
                                  onChange={e => setForm(f => ({ ...f, monto: e.target.value, cantidad: '', precio_unit: '' }))}
                                />
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </>
                )}

                {/* Fecha */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha *</label>
                  <input type="date"
                    className="w-full mt-1.5 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
                    value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  />
                </div>

                {/* N° Factura */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    N° Factura <span className="normal-case font-normal text-gray-300">(opcional)</span>
                  </label>
                  <input
                    className="w-full mt-1.5 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
                    placeholder="E001-123"
                    value={form.nro}
                    onChange={e => setForm(f => ({ ...f, nro: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-4">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Gasto'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
