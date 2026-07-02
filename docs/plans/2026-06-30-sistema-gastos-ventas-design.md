# Diseño: Sistema de Gastos y Ventas — D&P Señor Cautivo S.R.L.

**Fecha:** 2026-06-30
**Empresa:** Transportes y Servicios D&P Señor Cautivo S.R.L.

---

## Contexto

Actualmente Tío Wilson lleva el control en Excel manualmente. El jefe no entiende el Excel y solo quiere ver cuánto gastó y cuánto ganó. Se necesita algo simple para los dos.

---

## Usuarios

| Usuario | Rol | Necesidad |
|---|---|---|
| Tío Wilson | Operador | Ingresar gastos y ventas rápido |
| El Jefe | Visualizador | Ver totales y saldo del mes |

---

## Datos que se manejan

### Gastos
- NRO (opcional)
- Descripción (texto libre)
- Fecha
- Monto (soles)

### Ventas
- Descripción (texto libre)
- Fecha
- Monto en soles
- Monto en dólares (opcional)

### Resumen mensual
- Total Ventas (soles)
- Total Gastos (soles)
- Saldo = Ventas - Gastos

---

## Solución: App Web Simple

Una sola página web que funciona en el navegador (computadora o celular). Sin instalación.

### Vista de Wilson (ingreso de datos)

```
[ + Registrar Gasto ]   [ + Registrar Venta ]

--- Lista del mes actual ---
GASTOS                          VENTAS
peaje        S/ 116.40         FACTURA EB01-4   S/ 3,455
combustible  S/ 233.00         AQUAPRO          S/ 2,000
...                            ...
Total: S/ 34,850               Total: S/ 65,914
```

### Vista del Jefe (solo lectura, resumen)

```
╔══════════════════════════════╗
║    FEBRERO 2026              ║
╠══════════════════════════════╣
║  VENTAS     S/ 65,914.81     ║
║  GASTOS     S/ 34,850.06     ║
║  SALDO      S/ 31,064.75     ║
╚══════════════════════════════╝

[ Ver mes anterior ]  [ Ver mes siguiente ]
```

---

## Flujo de uso

1. Wilson abre la app en el navegador
2. Hace click en "+ Gasto" o "+ Venta"
3. Llena el formulario simple (descripción, fecha, monto)
4. El sistema guarda y actualiza los totales automáticamente
5. El jefe entra a la misma app y ve el resumen del mes en grande

---

## Stack técnico

- **Frontend:** React + Tailwind CSS (simple y rápido)
- **Backend / Base de datos:** Supabase (gratis, sin servidor propio)
- **Deploy:** Vercel (gratis, URL pública)

---

## Fases

### Fase 1 (ahora)
- Ingresar gastos y ventas
- Ver lista del mes
- Ver resumen: ventas / gastos / saldo
- Organización por mes

### Fase 2 (después)
- Exportar a Excel o PDF
- Inventario de productos
- Múltiples usuarios con contraseña
