// Small runtime probe used by the "Diagnostica" block in Impostazioni.
// Lets a user on a misbehaving iOS install screenshot real numbers
// (viewport size, safe-area insets, display-mode) instead of us guessing.

export interface SafeAreaInsets {
  top: string
  right: string
  bottom: string
  left: string
}

/** Reads the four env(safe-area-inset-*) values as resolved px strings.
 * Custom properties holding env() aren't reliably resolved by
 * getComputedStyle across browsers, so we apply them as real padding on a
 * throwaway, invisible probe element and read the computed padding back. */
export function readSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === 'undefined') {
    return { top: 'n/d', right: 'n/d', bottom: 'n/d', left: 'n/d' }
  }
  const probe = document.createElement('div')
  probe.style.position = 'fixed'
  probe.style.top = '0'
  probe.style.left = '0'
  probe.style.visibility = 'hidden'
  probe.style.pointerEvents = 'none'
  probe.style.paddingTop = 'env(safe-area-inset-top, 0px)'
  probe.style.paddingRight = 'env(safe-area-inset-right, 0px)'
  probe.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)'
  probe.style.paddingLeft = 'env(safe-area-inset-left, 0px)'
  document.body.appendChild(probe)
  const cs = getComputedStyle(probe)
  const insets: SafeAreaInsets = {
    top: cs.paddingTop,
    right: cs.paddingRight,
    bottom: cs.paddingBottom,
    left: cs.paddingLeft,
  }
  probe.remove()
  return insets
}

export interface DiagnosticsSnapshot {
  standalone: boolean | 'n/d'
  displayMode: string
  innerWidth: number
  innerHeight: number
  screenWidth: number | 'n/d'
  screenHeight: number | 'n/d'
  visualViewportHeight: number | 'n/d'
  insets: SafeAreaInsets
}

const DISPLAY_MODES = ['fullscreen', 'standalone', 'minimal-ui', 'browser'] as const

export function collectDiagnostics(): DiagnosticsSnapshot {
  const nav = navigator as Navigator & { standalone?: boolean }
  const displayMode =
    DISPLAY_MODES.find((mode) => window.matchMedia(`(display-mode: ${mode})`).matches) ?? 'unknown'

  return {
    standalone: typeof nav.standalone === 'boolean' ? nav.standalone : 'n/d',
    displayMode,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    screenWidth: window.screen?.width ?? 'n/d',
    screenHeight: window.screen?.height ?? 'n/d',
    visualViewportHeight: window.visualViewport?.height ?? 'n/d',
    insets: readSafeAreaInsets(),
  }
}
