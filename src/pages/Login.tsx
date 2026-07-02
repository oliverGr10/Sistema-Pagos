import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Eye, EyeOff } from 'lucide-react'
import { z } from 'zod'
import { supabase } from '../lib/supabase'

const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Ingresa tu usuario o correo')
    .regex(/^[a-zA-Z0-9_.@]+$/, 'Solo letras, números, guión bajo, punto y @'),
  password: z
    .string()
    .min(1, 'Ingresa tu contraseña')
    .min(6, 'Mínimo 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>
type FieldErrors = Partial<Record<keyof LoginForm, string>>

export default function Login() {
  const [form, setForm] = useState<LoginForm>({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setServerError('')

    const result = loginSchema.safeParse(form)
    if (!result.success) {
      const fieldErrors: FieldErrors = {}
      result.error.issues.forEach((issue: z.ZodIssue) => {
        const field = issue.path[0] as keyof LoginForm
        if (!fieldErrors[field]) fieldErrors[field] = issue.message
      })
      setErrors(fieldErrors)
      return
    }
    setErrors({})

    setLoading(true)
    // Si ya incluye @, usar tal cual; si no, agregar @dp.internal
    const input = result.data.username.toLowerCase()
    const email = input.includes('@') ? input : `${input}@dp.internal`
    const { error } = await supabase.auth.signInWithPassword({ email, password: result.data.password })
    setLoading(false)

    if (error) setServerError('Usuario o contraseña incorrectos')
  }

  const field = (name: keyof LoginForm) => ({
    value: form[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(f => ({ ...f, [name]: e.target.value }))
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }))
    },
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-blue-500/20 rotate-3 hover:rotate-0 transition-transform duration-300">
            <TrendingUp size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">D&P Señor Cautivo</h1>
          <p className="text-sm text-gray-400 mt-1.5 font-medium">Transportes y Servicios S.R.L.</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-100/80 shadow-xl shadow-gray-100/50 p-7">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Bienvenido</h2>
            <p className="text-sm text-gray-400 mt-0.5">Ingresa tus credenciales para continuar</p>
          </div>

          {serverError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-100/80 text-red-600 text-sm rounded-xl px-4 py-3 mb-5 flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />
              {serverError}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Usuario */}
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-2">
                Usuario
              </label>
              <input
                autoFocus
                autoComplete="username"
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder:text-gray-300 ${
                  errors.username
                    ? 'border-red-200 focus:ring-red-300 bg-red-50/50'
                    : 'border-gray-200/80 focus:ring-blue-400/50 hover:border-gray-300'
                }`}
                placeholder="Tu nombre de usuario"
                {...field('username')}
              />
              {errors.username && (
                <p className="text-xs text-red-500 mt-1.5">{errors.username}</p>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`w-full border rounded-xl px-4 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder:text-gray-300 ${
                    errors.password
                      ? 'border-red-200 focus:ring-red-300 bg-red-50/50'
                      : 'border-gray-200/80 focus:ring-blue-400/50 hover:border-gray-300'
                  }`}
                  placeholder="••••••••"
                  {...field('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-all"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1.5">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-300 mt-8">Sistema de gestión interno · v1.0</p>
      </motion.div>
    </div>
  )
}
