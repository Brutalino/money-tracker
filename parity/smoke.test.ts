import { describe, expect, it } from 'vitest'
import { formatCents } from '../src/lib/money'
import { setActiveLanguage } from '../src/lib/locale'

describe('parity smoke test', () => {
  it('formats cents as EUR currency for the English locale', () => {
    setActiveLanguage('en')
    expect(formatCents(150000)).toBe('€1,500.00')
  })
})
