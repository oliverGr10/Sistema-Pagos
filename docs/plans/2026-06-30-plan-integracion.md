# Plan de Integración — D&P Señor Cautivo S.R.L.
**Fecha:** 2026-06-30  
**Stack:** React + Vite + TypeScript + Tailwind v4 + Supabase + Recharts + Framer Motion + Lucide

---

## Contexto extraído de las imágenes Excel

### Gastos vistos (Febrero 2026)
| Categoría | Ejemplos |
|---|---|
| Personal | pago de mes Divan, Percy, Jhon, honorarios Wilson, honorarios contador |
| Operación | combustible, peaje, cochera |
| Mantenimiento | repuestos, cristal espejo, volante de motor, termostato, disco tornamesa, rodaje, revisión técnica, pistola limpieza motor |
| Seguros/Legal | PAGO POLIZA AFP, PAGO SCTR, PAGO DETRACCION, TOKEN DUPLICADO |
| Materiales | guantes industriales, guantes de tela, balanza, silicona, tvtex |
| Alimentación | consumo de comida |
| Administrativo | accesorios para oficina |

### Ventas vistas (Febrero 2026)
| Cliente | Monto S/ | Monto $ |
|---|---|---|
| saldo anterior | 41,862.81 | 4,622.40 |
| FACTURA EB01-4 | 3,455.00 | — |
| AQUAPRO | 2,000.00 | — |
| EN EFECTIVO | 4,100.00 | — |
| CORPORACION JMR SODIFER | 6,680.00 | — |
| PERCY CLAUDIO ROMERO | 3,817.00 | — |
| pago adelanto carga Juliaca | 4,000.00 | — |
| **TOTAL** | **65,914.81** | **4,622.40** |

### Regla de monedas (CRÍTICA)
- Las ventas pueden ser en **S/ (soles)** o **$ (dólares)**
- **NUNCA convertir dólares a soles** — el tipo de cambio es volátil
- La ganancia mensual se muestra en **dos líneas separadas**:
  - `Ganancia S/ = Ventas soles − Gastos soles`
  - `Ingresos $ = Total dólares` (informativo, sin restar gastos)

---

## Fase 1 — Correcciones inmediatas (HACER PRIMERO)

### 1A. Ganancia mensual con monedas separadas

**Cambio en `resumen_por_mes` (SQL):** la vista ya devuelve `ventas_soles`, `ventas_dolares` y `gastos` por separado. Solo cambiar cómo se muestra en el frontend.

**Cambio en `src/pages/Resumen.tsx`:**
```
// Antes (INCORRECTO)
Ganancia = ventas_soles - gastos  ← mezcla con dólares implícitamente

// Después (CORRECTO)
Ganancia S/ = ventas_soles - gastos
Ingresos $  = ventas_dolares  (mostrar en card separada, color verde oscuro)
```

**Card nueva para dólares:**
- Solo aparece si `ventas_dolares > 0`
- Label: "Ingresos en Dólares"
- Color: verde oscuro / teal
- Sub: "No incluido en ganancia neta"

### 1B. Mejorar modal de formulario

**Problemas actuales:**
- El modal centrado en desktop se ve genérico
- Falta separador visual entre campos
- Botón cancelar poco visible

**Mejoras:**
- Drawer lateral en desktop (slide desde la derecha, 420px) en lugar de modal centrado
- En móvil: bottom sheet (igual que ahora pero mejorado)
- Header del drawer con icono + título + botón X grande
- Campos con labels flotantes o mejor jerarquía
- Dos botones en footer: "Cancelar" (ghost) + "Guardar" (primary)
- Animación: slide-in desde la derecha (Framer Motion)

### 1C. Completar datos faltantes del Excel

**Gastos con monto oculto (####) — necesitar que tío Wilson confirme:**
1. pago de mes Divan ENERO — fecha 02/02/2026
2. pago de mes Percy ENERO — fecha 02/03/2026  
3. pago de mes Jhon ENERO — fecha 02/04/2026
4. PAGO DE HONORARIOS WILSON — fecha 02/04/2026
5. PAGO DE DETRACCION — fecha 02/04/2026
6. combustible — fecha 02/11/2026
7. combustible (segundo) — fecha 02/06/2026
8. repuestos — fecha 02/18/2026
9. volante de motor — fecha 02/23/2026
10. peaje — fecha 15/05/2026 (posible error de fecha)

**Total faltante estimado:** S/ 34,850.06 − S/ 5,627.10 = **S/ 29,222.96**

---

## Fase 2 — Nuevas tablas en Supabase

### 2A. Tabla `clientes`
```sql
CREATE TABLE clientes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre      TEXT NOT NULL,
  ruc         TEXT,
  telefono    TEXT,
  email       TEXT,
  direccion   TEXT,
  notas       TEXT,
  activo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes iniciales (del Excel)
INSERT INTO clientes (nombre) VALUES
  ('AQUAPRO'),
  ('CORPORACION JMR SODIFER'),
  ('PERCY CLAUDIO ROMERO');
```

**Relación con ventas** — agregar columna opcional:
```sql
ALTER TABLE ventas ADD COLUMN cliente_id UUID REFERENCES clientes(id);
```

### 2B. Tabla `servicios`
```sql
CREATE TABLE servicios (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  precio_base NUMERIC(12,2),
  activo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Servicios de transporte (inferidos del Excel)
INSERT INTO servicios (nombre, descripcion) VALUES
  ('Transporte de carga', 'Traslado de mercancía en camión'),
  ('Estiba y desestiba', 'Carga y descarga manual'),
  ('Transporte Juliaca', 'Ruta especial Juliaca'),
  ('Almacenaje', 'Custodia temporal de carga');
```

**Relación con ventas:**
```sql
ALTER TABLE ventas ADD COLUMN servicio_id UUID REFERENCES servicios(id);
```

### 2C. Tabla `categorias_gasto` (para organizar gastos)
```sql
CREATE TABLE categorias_gasto (
  id     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  color  TEXT DEFAULT '#6B7280',
  icono  TEXT
);

INSERT INTO categorias_gasto (nombre, color) VALUES
  ('Personal',      '#8B5CF6'),
  ('Combustible',   '#EF4444'),
  ('Peajes',        '#F59E0B'),
  ('Mantenimiento', '#3B82F6'),
  ('Seguros/Legal', '#10B981'),
  ('Alimentación',  '#F97316'),
  ('Materiales',    '#6366F1'),
  ('Administrativo','#6B7280');

ALTER TABLE gastos ADD COLUMN categoria_id UUID REFERENCES categorias_gasto(id);
```

---

## Fase 3 — Páginas nuevas

### 3A. Página Clientes (`/clientes`)

**Layout:**
- Tabla con columnas: Nombre | RUC | Teléfono | Total facturado | Última venta | Acciones
- Botón "+ Agregar Cliente"
- Click en cliente → panel lateral con historial de ventas
- Búsqueda en tiempo real

**Datos que se pueden calcular:**
- Total facturado = SUM de ventas donde cliente_id = X
- Última fecha de venta
- Cantidad de facturas

### 3B. Página Servicios (`/servicios`)

**Layout:**
- Grid de cards (no tabla) — más visual
- Cada card: nombre, descripción, precio base, estado activo/inactivo
- Botón "+ Agregar Servicio"
- Al registrar una venta se puede seleccionar el servicio

### 3C. Página Reportes (`/reportes`)

**Secciones:**
1. **Comparativo anual** — gráfico de barras agrupadas (ventas vs gastos por mes)
2. **Tabla resumen anual** — 12 filas, una por mes con totales y ganancia
3. **Exportar** — botón "Descargar Excel" y "Descargar PDF"

**Query necesaria:**
```sql
SELECT mes, ventas_soles, ventas_dolares, gastos, ganancia
FROM resumen_por_mes
WHERE mes LIKE '2026-%'
ORDER BY mes;
```

**Librería para exportar:**
- Excel: `xlsx` (npm)
- PDF: `jspdf` + `jspdf-autotable` (npm)

---

## Fase 4 — UX y pulido final

### 4A. Categorías en gastos
- Al agregar un gasto, mostrar selector de categoría (chips de colores)
- En la lista de gastos, mostrar badge de color por categoría
- En el dashboard, mini gráfico de dona mostrando gastos por categoría

### 4B. Vincular cliente al registrar venta
- En el formulario de venta, agregar campo "Cliente" con autocomplete
- Si el cliente no existe, opción "+ Agregar cliente nuevo" inline

### 4C. Vincular servicio a venta
- Campo opcional "Servicio" en formulario de venta
- Dropdown con los servicios activos

### 4D. Toast notifications
- Reemplazar `alert()` y `confirm()` por toasts elegantes
- Librería: `react-hot-toast` (npm)
- Posición: bottom-right en desktop, top-center en móvil

---

## Orden de implementación recomendado

```
Semana 1 (AHORA):
  ✅ Fase 1A — Ganancia con monedas separadas
  ✅ Fase 1B — Mejorar modal → drawer lateral
  ⏳ Fase 1C — Completar datos Excel (requiere tío Wilson)

Semana 2:
  ⏳ Fase 2A — Tabla clientes + página Clientes
  ⏳ Fase 2B — Tabla servicios + página Servicios

Semana 3:
  ⏳ Fase 2C — Categorías de gasto
  ⏳ Fase 3C — Página Reportes + exportar

Semana 4:
  ⏳ Fase 4 — Vincular clientes/servicios a ventas
  ⏳ Fase 4D — Toast notifications
  ⏳ Deploy final en Vercel
```

---

## Respuestas pendientes del tío Wilson

1. ¿Cuáles son los montos de los 10 gastos con `####`?
2. ¿Hay más meses de datos para cargar (enero, marzo, etc.)?
3. ¿Qué servicios específicos ofrece la empresa?
4. ¿Los clientes tienen RUC o solo nombre?
5. ¿Necesita el jefe exportar reportes o solo verlos en pantalla?
