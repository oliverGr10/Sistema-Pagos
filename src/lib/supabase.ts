import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Gasto = {
  id: string
  nro: string | null
  descripcion: string
  fecha: string
  monto: number
  created_at: string
}

export type Cliente = {
  id: string
  nombre: string
  ruc: string | null
  telefono: string | null
  notas: string | null
  activo: boolean
  created_at: string
}

export type Venta = {
  id: string
  descripcion: string
  fecha: string
  monto_soles: number
  monto_dolares: number
  cliente_id: string | null
  pagado: boolean
  created_at: string
  clientes?: { nombre: string } | null
}

export type ResumenMes = {
  mes: string
  ventas_soles: number
  ventas_dolares: number
  gastos: number
  ganancia: number
}
