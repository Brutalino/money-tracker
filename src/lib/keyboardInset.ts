const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]'

function isEditable(el: unknown): el is Element {
  return el instanceof Element && el.matches(EDITABLE_SELECTOR)
}

/**
 * iOS standalone PWAs never resize the layout viewport for the software
 * keyboard: WebKit scrolls the whole (position: fixed) document upward to
 * reveal the focused field and can leave it stranded there. Mirror the
 * keyboard overlap into `--keyboard-inset` so CSS can lift bottom sheets and
 * pad inner scrollers above the keyboard, and pin the document scroll back to
 * zero whenever WebKit shifts it (this shell only ever scrolls internally).
 */
export function initKeyboardInsetWatcher(): void {
  const vv = window.visualViewport
  if (!vv) return
  const root = document.documentElement
  let editing = false
  let blurTimer: ReturnType<typeof setTimeout> | undefined

  // Arrow expressions (not function declarations) so TS retains the `vv`
  // non-null narrowing from the guard clause above inside these closures.
  const pinWindow = () => {
    if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0)
  }

  const apply = () => {
    if (!editing) return
    // Pinch zoom also shrinks the visual viewport; only track the keyboard.
    const inset = vv.scale > 1.02 ? 0 : Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
    root.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`)
    pinWindow()
    requestAnimationFrame(() => {
      const active = document.activeElement
      if (editing && isEditable(active)) active.scrollIntoView({ block: 'nearest' })
    })
  }

  const clear = () => {
    root.style.setProperty('--keyboard-inset', '0px')
    pinWindow()
  }

  document.addEventListener('focusin', (e) => {
    if (!isEditable(e.target)) return
    if (blurTimer !== undefined) clearTimeout(blurTimer)
    editing = true
    apply()
  })

  document.addEventListener('focusout', () => {
    if (blurTimer !== undefined) clearTimeout(blurTimer)
    blurTimer = setTimeout(() => {
      if (!isEditable(document.activeElement)) {
        editing = false
        clear()
      }
    }, 250)
  })

  vv.addEventListener('resize', apply)
  vv.addEventListener('scroll', apply)
  window.addEventListener('scroll', pinWindow)
}
