import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, ChevronRight, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Servicio = {
  id: string
  nombre: string
  descripcion: string | null
  precio_base: number | null
  categoria: string | null
  activo: boolean
  total_soles?: number
  total_dolares?: number
  num_ventas?: number
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

const CATEGORIAS = ['Transporte', 'Operaciones', 'Almacenaje', 'Otro']

const CATEGORIA_COLORS: Record<string, string> = {
  'Transporte':  'bg-blue-50 text-blue-700 border-blue-100',
  'Operaciones': 'bg-violet-50 text-violet-700 border-violet-100',
  'Almacenaje':  'bg-amber-50 text-amber-700 border-amber-100',
  'Otro':        'bg-gray-50 text-gray-600 border-gray-100',
}

const EMPTY = { nombre: '', descripcion: '', precio_base: '', categoria: 'Transporte' }

export default function Servicios() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchServicios = async () => {
    setLoading(true)
    const [{ data: svcs }, { data: ventas }] = await Promise.all([
      supabase.from('servicios').select('*').eq('activo', true).order('categoria').order('nombre'),
      supabase.from('ventas').select('servicio_id, monto_soles, monto_dolares'),
    ])

    const mapa: Record<string, { soles: number; dolares: number; count: number }> = {}
    for (const v of ventas ?? []) {
      if (!v.servicio_id) continue
      if (!mapa[v.servicio_id]) mapa[v.servicio_id] = { soles: 0, dolares: 0, count: 0 }
      mapa[v.servicio_id].soles += Number(v.monto_soles)
      mapa[v.servicio_id].dolares += Number(v.monto_dolares)
      mapa[v.servicio_id].count++
    }

    setServicios((svcs ?? []).map(s => ({
      ...s,
      total_soles: mapa[s.id]?.soles ?? 0,
      total_dolares: mapa[s.id]?.dolares ?? 0,
      num_ventas: mapa[s.id]?.count ?? 0,
    })))
    setLoading(false)
  }

  useEffect(() => { fetchServicios() }, [])

  const handleSave = async () => {
    if (!form.nombre.trim()) return
    setSaving(true)
    await supabase.from('servicios').insert({
      nombre: form.nombre.trim().toUpperCase(),
      descripcion: form.descripcion.trim() || null,
      precio_base: form.precio_base ? Number(form.precio_base) : null,
      categoria: form.categoria,
    })
    setSaving(false)
    setShowForm(false)
    setForm(EMPTY)
    fetchServicios()
  }

  // Agrupar por categoría
  const grupos: Record<string, Servicio[]> = {}
  for (const s of servicios) {
    const cat = s.categoria ?? 'Otro'
    if (!grupos[cat]) grupos[cat] = []
    grupos[cat].push(s)
  }
  // Ordenar por el orden de CATEGORIAS
  const categoriasConDatos = CATEGORIAS.filter(c => grupos[c]?.length)

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-2xl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900">Servicios</h2>
          <p className="text-sm text-gray-400 mt-0.5">{servicios.length} servicios disponibles</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm(EMPTY) }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors shrink-0 whitespace-nowrap"
        >
          <Plus size={15} /> Agregar
        </button>
      </div>

      {/* Lista agrupada */}
      {loading ? (
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="w-24 h-4 bg-gray-100 rounded animate-pulse" />
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                {[...Array(2)].map((_, j) => (
                  <div key={j} className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="space-y-1.5 flex-1">
                      <div className="w-32 h-3 bg-gray-100 rounded animate-pulse" />
                      <div className="w-48 h-2.5 bg-gray-50 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : servicios.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Sin servicios registrados</p>
          <p className="text-xs text-gray-400 mt-1">Agrega el primero con el botón de arriba</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categoriasConDatos.map((cat, gi) => (
            <motion.div key={cat}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.07 }}
            >
              {/* Título de categoría */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${CATEGORIA_COLORS[cat]}`}>
                  {cat}
                </span>
                <span className="text-xs text-gray-300">{grupos[cat].length} {grupos[cat].length === 1 ? 'servicio' : 'servicios'}</span>
              </div>

              {/* Lista de servicios de esa categoría */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {grupos[cat].map((s, i) => (
                  <div key={s.id}
                    className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors group ${i > 0 ? 'border-t border-gray-50' : ''}`}
                  >
                    {/* Inicial */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${CATEGORIA_COLORS[cat]}`}>
                      {s.nombre[0]}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{s.nombre}</p>
                      {s.descripcion && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{s.descripcion}</p>
                      )}
                    </div>

                    {/* Totales generados */}
                    <div className="text-right shrink-0">
                      {(s.num_ventas ?? 0) > 0 ? (
                        <>
                          <div className="flex items-center gap-1 justify-end text-emerald-600">
                            <TrendingUp size={11} />
                            <p className="text-xs font-bold">S/ {fmt(s.total_soles ?? 0)}</p>
                          </div>
                          {(s.total_dolares ?? 0) > 0 && (
                            <p className="text-xs font-semibold text-teal-600">$ {fmt(s.total_dolares ?? 0)}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">{s.num_ventas} {s.num_ventas === 1 ? 'venta' : 'ventas'}</p>
                        </>
                      ) : (
                        <ChevronRight size={14} className="text-gray-200 group-hover:text-gray-400 transition-colors" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal agregar */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">Nuevo Servicio</h2>
                <button onClick={() => setShowForm(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                {/* Categoría */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría</label>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {CATEGORIAS.map(cat => (
                      <button key={cat}
                        onClick={() => setForm(f => ({ ...f, categoria: cat }))}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                          form.categoria === cat
                            ? CATEGORIA_COLORS[cat] + ' shadow-sm'
                            : 'border-gray-200 text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nombre */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre *</label>
                  <input autoFocus
                    className="w-full mt-1.5 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Transporte de carga"
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Descripción <span className="normal-case font-normal text-gray-300">(opcional)</span>
                  </label>
                  <input
                    className="w-full mt-1.5 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Breve descripción..."
                    value={form.descripcion}
                    onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  />
                </div>

                {/* Precio base */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Precio Base <span className="normal-case font-normal text-gray-300">(opcional)</span>
                  </label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">S/</span>
                    <input type="number" min="0" step="0.01"
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                      value={form.precio_base}
                      onChange={e => setForm(f => ({ ...f, precio_base: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving || !form.nombre.trim()}
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
