import { parityModule } from './harness'
import { applyKeypadKey, formatBufferDisplay } from '../src/lib/keypadBuffer'
import { setActiveLanguage } from '../src/lib/locale'
import type { Language } from '../src/db/types'

interface ApplyInput {
  buffer: string
  key: string
  decimalSeparator: string
}

interface FormatInput {
  buffer: string
  lang: Language
}

parityModule('keypadBuffer', {
  applyKeypadKey: {
    cases: [
      // comma separator
      { name: 'comma: empty + digit', input: { buffer: '', key: '5', decimalSeparator: ',' } },
      { name: 'comma: 0 + 0', input: { buffer: '0', key: '0', decimalSeparator: ',' } },
      { name: 'comma: 0 + 7', input: { buffer: '0', key: '7', decimalSeparator: ',' } },
      { name: 'comma: 12 + comma', input: { buffer: '12', key: ',', decimalSeparator: ',' } },
      { name: 'comma: 12, + comma (already has separator)', input: { buffer: '12,', key: ',', decimalSeparator: ',' } },
      { name: 'comma: empty + comma', input: { buffer: '', key: ',', decimalSeparator: ',' } },
      { name: 'comma: 12,5 + 0', input: { buffer: '12,5', key: '0', decimalSeparator: ',' } },
      { name: 'comma: 12,50 + 3 (capped at 2 decimals)', input: { buffer: '12,50', key: '3', decimalSeparator: ',' } },
      { name: 'comma: 1234567 + 8 (7 digits, allowed)', input: { buffer: '1234567', key: '8', decimalSeparator: ',' } },
      { name: 'comma: 12345678 + 9 (8 digits, guarded)', input: { buffer: '12345678', key: '9', decimalSeparator: ',' } },
      { name: 'comma: 0 + comma', input: { buffer: '0', key: ',', decimalSeparator: ',' } },
      { name: 'comma: 00000000 + 1 (leading zeros do not count)', input: { buffer: '00000000', key: '1', decimalSeparator: ',' } },
      { name: 'comma: 12,5 + back', input: { buffer: '12,5', key: 'back', decimalSeparator: ',' } },
      { name: 'comma: 1 + back', input: { buffer: '1', key: 'back', decimalSeparator: ',' } },
      { name: 'comma: empty + back', input: { buffer: '', key: 'back', decimalSeparator: ',' } },
      { name: 'comma: 0, + back', input: { buffer: '0,', key: 'back', decimalSeparator: ',' } },
      // dot separator
      { name: 'dot: empty + digit', input: { buffer: '', key: '5', decimalSeparator: '.' } },
      { name: 'dot: 0 + 0', input: { buffer: '0', key: '0', decimalSeparator: '.' } },
      { name: 'dot: 0 + 7', input: { buffer: '0', key: '7', decimalSeparator: '.' } },
      { name: 'dot: 12 + dot', input: { buffer: '12', key: '.', decimalSeparator: '.' } },
      { name: 'dot: 12. + dot (already has separator)', input: { buffer: '12.', key: '.', decimalSeparator: '.' } },
      { name: 'dot: empty + dot', input: { buffer: '', key: '.', decimalSeparator: '.' } },
      { name: 'dot: 12.5 + 0', input: { buffer: '12.5', key: '0', decimalSeparator: '.' } },
      { name: 'dot: 12.50 + 3 (capped at 2 decimals)', input: { buffer: '12.50', key: '3', decimalSeparator: '.' } },
      { name: 'dot: 1234567 + 8 (7 digits, allowed)', input: { buffer: '1234567', key: '8', decimalSeparator: '.' } },
      { name: 'dot: 12345678 + 9 (8 digits, guarded)', input: { buffer: '12345678', key: '9', decimalSeparator: '.' } },
      { name: 'dot: 0 + dot', input: { buffer: '0', key: '.', decimalSeparator: '.' } },
      { name: 'dot: 00000000 + 1 (leading zeros do not count)', input: { buffer: '00000000', key: '1', decimalSeparator: '.' } },
      { name: 'dot: 12.5 + back', input: { buffer: '12.5', key: 'back', decimalSeparator: '.' } },
      { name: 'dot: 1 + back', input: { buffer: '1', key: 'back', decimalSeparator: '.' } },
      { name: 'dot: empty + back', input: { buffer: '', key: 'back', decimalSeparator: '.' } },
      { name: 'dot: 0. + back', input: { buffer: '0.', key: 'back', decimalSeparator: '.' } },
    ] as { name: string; input: ApplyInput }[],
    impl: (input: ApplyInput) => applyKeypadKey(input.buffer, input.key, input.decimalSeparator),
  },
  formatBufferDisplay: {
    cases: (['it', 'en'] as Language[]).flatMap((lang) => [
      { name: `${lang}: empty`, input: { buffer: '', lang } },
      { name: `${lang}: 0`, input: { buffer: '0', lang } },
      { name: `${lang}: 7`, input: { buffer: '7', lang } },
      { name: `${lang}: 1250`, input: { buffer: '1250', lang } },
      { name: `${lang}: 1250 + decimals`, input: { buffer: lang === 'it' ? '1250,5' : '1250.5', lang } },
      { name: `${lang}: 1250 + 2 decimals`, input: { buffer: lang === 'it' ? '1250,50' : '1250.50', lang } },
      { name: `${lang}: 1234567`, input: { buffer: '1234567', lang } },
      { name: `${lang}: 12345678`, input: { buffer: '12345678', lang } },
      { name: `${lang}: 0 + decimal`, input: { buffer: lang === 'it' ? '0,5' : '0.5', lang } },
      { name: `${lang}: 007`, input: { buffer: '007', lang } },
      { name: `${lang}: 1000`, input: { buffer: '1000', lang } },
      { name: `${lang}: 999`, input: { buffer: '999', lang } },
      { name: `${lang}: 1000000 + decimals`, input: { buffer: lang === 'it' ? '1000000,25' : '1000000.25', lang } },
    ]) as { name: string; input: FormatInput }[],
    impl: (input: FormatInput) => {
      setActiveLanguage(input.lang)
      return formatBufferDisplay(input.buffer)
    },
  },
})
