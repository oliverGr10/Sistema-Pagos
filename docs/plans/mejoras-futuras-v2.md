# Mejoras Futuras — V2
**Fecha:** 2026-07-01  
**Estado:** Ideas para próximas versiones

---

## Reportes

| Mejora | Descripción | Prioridad |
|--------|-------------|-----------|
| Filtro por día en reporte | Permitir generar reporte de un día o rango específico (no solo mes completo) | Media |
| Reporte comparativo | Tabla mes actual vs mes anterior con diferencias absolutas y % | Alta |
| Top gastos del mes | Ranking de los 5-10 gastos más altos con barra visual | Media |
| Reporte por categoría | Desglose de gastos agrupados por categoría (Peaje, Combustible, Personal, etc.) con gráfico pie/donut | Alta |
| Exportar a Excel (.xlsx) | Usar librería como exceljs para generar Excel nativo con formato y colores | Baja |
| Reporte PDF mejorado | Usar @react-pdf/renderer para generar PDF con diseño propio (logo, colores, firma) | Media |
| Proyección de gastos | Estimar gastos del mes basado en promedio diario × días restantes | Baja |
| Reporte anual resumido | PDF/CSV con totales de los 12 meses + ganancia acumulada del año | Media |

## Dashboard / Resumen

| Mejora | Descripción | Prioridad |
|--------|-------------|-----------|
| Gráfico de tendencia | Línea de ganancia diaria acumulada del mes (ver si sube o baja) | Media |
| Indicador de meta mensual | Definir meta de ganancia y mostrar progreso (barra o gauge) | Baja |
| Widget de gastos recurrentes | Detectar gastos repetidos (peaje, cochera) y mostrar promedio mensual | Baja |

## Gastos / Ventas

| Mejora | Descripción | Prioridad |
|--------|-------------|-----------|
| Editar registros | Botón para modificar un gasto/venta existente (actualmente solo se eliminan) | Alta |
| Búsqueda / filtro por texto | Campo de búsqueda para encontrar un gasto o venta por descripción | Media |
| Paginación | Para meses con muchos registros (+50), paginar la tabla | Baja |
| Adjuntar foto de factura | Subir imagen de boleta/factura usando Supabase Storage | Media |
| Gastos recurrentes | Crear gasto "plantilla" que se auto-registre cada mes (cochera, AFP, etc.) | Media |

## Notificaciones

| Mejora | Descripción | Prioridad |
|--------|-------------|-----------|
| Alertas de exceso | Notificar si los gastos superan un umbral configurable | Media |
| Resumen semanal automático | Push notification o email con ganancia de la semana | Baja |
| Notificación de ventas pendientes | Alertar sobre ventas no pagadas que llevan más de X días | Alta |

## General / Infraestructura

| Mejora | Descripción | Prioridad |
|--------|-------------|-----------|
| Multi-usuario con roles | Jefe (solo lectura), Operador (lectura + escritura) | Alta |
| Dark mode | Toggle de tema oscuro | Baja |
| PWA / App móvil | Instalar como app en celular con service worker | Media |
| Backup automático | Exportar DB completa cada semana a Storage o email | Baja |
| Configuración de empresa | Página para cambiar nombre, logo, datos de la empresa | Baja |
