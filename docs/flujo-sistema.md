# Flujo del Sistema — D&P Señor Cautivo S.R.L.

## Estructura General

```
┌─────────────────────────────────────────────────────────┐
│                      HEADER                              │
│  [< Mes >]  ←click→ Selector de mes/día    Fecha  🔔 👤 │
└─────────────────────────────────────────────────────────┘
┌──────────┐ ┌────────────────────────────────────────────┐
│ SIDEBAR  │ │              CONTENIDO                      │
│          │ │                                            │
│ Resumen  │ │  Depende de la página seleccionada         │
│ Ventas   │ │                                            │
│ Gastos   │ │                                            │
│ Clientes │ │                                            │
│ Reportes │ │                                            │
│          │ │                                            │
│ [Wilson] │ │                                            │
│ Operador │ │                                            │
└──────────┘ └────────────────────────────────────────────┘
```

---

## Páginas y su Propósito

### 1. Resumen (Panel Operativo Diario)
**Ruta:** `/`  
**Propósito:** Vista rápida del día a día. Responde: "¿Cómo vamos hoy y esta semana?"

- **KPIs:** Ganancia hoy, Ganancia semana, Gastos hoy, Gastos semana
- **Gráfico:** Últimos 7 días (barras ventas vs gastos)
- **Panel lateral:** Resumen semanal consolidado
- **Detalle del día:** Aparece al seleccionar un día desde el calendario
- **Últimos movimientos:** 8 registros más recientes (ventas + gastos combinados)

### 2. Ventas
**Ruta:** `/ventas`  
**Propósito:** Registrar y ver todas las ventas/facturas del mes.

- Total ventas en soles y dólares
- Tabla con: cliente, descripción, fecha, estado (pagado/pendiente), monto
- Formulario para agregar nueva venta (cliente, descripción, montos, fecha)
- Filtra por día si hay uno seleccionado en el calendario

### 3. Gastos
**Ruta:** `/gastos`  
**Propósito:** Registrar y ver todos los gastos del mes.

- Total gastos del mes con promedio
- Tabla con: descripción, fecha, N° factura, monto, categoría
- Formulario con categorías predefinidas (Peaje, Combustible, Cochera, Personal, etc.)
- Calculadora automática (cantidad × precio) para categorías como Peaje y Combustible
- Filtra por día si hay uno seleccionado en el calendario

### 4. Clientes
**Ruta:** `/clientes`  
**Propósito:** Gestionar la base de clientes.

- Lista de clientes activos
- Agregar/desactivar clientes
- Se usan al registrar ventas (select de cliente)

### 5. Reportes (Informe Gerencial Mensual)
**Ruta:** `/reportes`  
**Propósito:** Números consolidados del mes para el jefe. Responde: "¿Cómo cerró el mes?"

- **KPIs grandes:** Ventas mes, Gastos mes, Ganancia neta, Dólares
- **Tabla semanal:** Desglose de ventas/gastos/ganancia por semana del mes
- **Ingresos por servicio:** Qué tipo de trabajo generó más dinero
- **Gráfico anual:** Comparativo de los 12 meses (ventas vs gastos)
- **Tabla anual:** Resumen mes a mes del año
- **Exportar:** CSV (Excel) y PDF (imprimir)

---

## Navegación por Fecha

### Selector de Mes (Header)
El selector central en el header controla qué período se muestra en toda la app.

```
Flujo:
1. Click en flechas < > → Navega mes a mes
2. Click en el nombre del mes → Abre dropdown
3. Dropdown muestra grilla de meses (Ene-Dic) con flechas de año
4. Click en un mes → Muestra calendario con días del mes
5. Click en un día → Selecciona ese día específico
6. "Ver mes completo" → Quita la selección de día
7. "Ir a hoy" → Vuelve al mes actual
```

### Comportamiento por página con día seleccionado

| Página | Sin día (mes completo) | Con día seleccionado |
|--------|----------------------|---------------------|
| Resumen | KPIs de hoy + semana, gráfico 7 días | + Panel "Detalle del día" con desglose |
| Ventas | Todas las ventas del mes | Solo ventas de ese día |
| Gastos | Todos los gastos del mes | Solo gastos de ese día |
| Reportes | Siempre muestra mes completo | No se afecta |

### Formularios con día seleccionado
Cuando abres "Agregar Gasto" o "Agregar Venta" estando en un día seleccionado, la fecha del formulario se pre-llena con ese día.

---

## Notificaciones (🔔)

Panel que se abre al tocar la campana. Muestra:

1. **Ganancia esta semana** — Ventas − Gastos de lun a dom
2. **Ventas vs mes anterior** — Diferencia con el mes pasado (+S/ X más / S/ X menos)
3. **Gastos vs mes anterior** — Comparativa de gastos
4. **Ganancia vs mes anterior** — Diferencia neta
5. **Ganancia este mes** — Acumulado mensual
6. **Ganancia este año** — Acumulado anual

Funciones:
- Marcar como leída (check)
- Marcar todas como leídas
- Ocultar notificación (trash)
- Badge rojo con contador de no leídas
- Se actualiza en tiempo real (Supabase Realtime)

---

## Perfil (👤)

Dropdown con:
- Nombre del usuario (desde tabla `perfiles`)
- Rol (operador/jefe)
- Botón cerrar sesión

---

## Autenticación

- Login con usuario (ej: `wilson43`) o email completo (`wilson43@dp.internal`)
- Validación con Zod
- Sesión manejada por Supabase Auth
- RLS: Solo usuarios autenticados pueden acceder a los datos

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Estilos | Tailwind CSS v4 |
| Animaciones | Framer Motion |
| Iconos | Lucide React |
| Gráficos | Chart.js + react-chartjs-2 |
| Backend/DB | Supabase (Postgres + Auth + Realtime) |
| Validación | Zod |
| Deploy | Vercel (pendiente) |

---

## Base de Datos (Supabase)

### Tablas principales
- `ventas` — id, descripcion, fecha, monto_soles, monto_dolares, pagado, cliente_id, servicio_id
- `gastos` — id, descripcion, fecha, monto, nro_factura, categoria
- `clientes` — id, nombre, ruc, activo
- `servicios` — id, nombre, activo
- `perfiles` — id (= auth.uid), nombre, rol

### Seguridad
- RLS habilitado en todas las tablas
- Solo rol `authenticated` tiene acceso (no hay acceso anónimo)
- Realtime habilitado en: ventas, gastos

---

## Flujo de Datos

```
Usuario → Login → Supabase Auth → Token JWT
                                      ↓
                            App carga con token
                                      ↓
                    ┌─────────────────────────────────┐
                    │  Supabase (RLS filtra por auth)  │
                    │                                 │
                    │  ventas ←→ gastos ←→ clientes   │
                    │  servicios ←→ perfiles           │
                    └─────────────────────────────────┘
                                      ↓
                    Realtime: cambios en ventas/gastos
                    notifican al panel de notificaciones
```
