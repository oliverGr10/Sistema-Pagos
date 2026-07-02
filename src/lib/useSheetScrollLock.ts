import { useEffect, type RefObject } from 'react'

/**
 * Bloquea el rebote (rubber-band) y el scroll del fondo en iOS mientras un
 * modal/sheet está abierto. Permite el scroll solo dentro del panel indicado,
 * y evita el "scroll chaining" cuando se llega al inicio o al final.
 */
export function useSheetScrollLock(open: boolean, scrollRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return

    // Bloquea el scroll del contenido principal detrás del modal.
    document.body.classList.add('sheet-open')

    let startY = 0
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? 0
    }
    const onTouchMove = (e: TouchEvent) => {
      const el = scrollRef.current
      // Toque fuera del panel scrollable -> bloquear por completo.
      if (!el || !el.contains(e.target as Node)) {
        e.preventDefault()
        return
      }
      const { scrollTop, scrollHeight, clientHeight } = el
      const deltaY = (e.touches[0]?.clientY ?? 0) - startY
      const atTop = scrollTop <= 0
      const atBottom = scrollTop + clientHeight >= scrollHeight
      // En los bordes, evitar que el gesto arrastre el fondo/viewport.
      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        e.preventDefault()
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: false })
    document.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      document.body.classList.remove('sheet-open')
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
    }
  }, [open, scrollRef])
}
