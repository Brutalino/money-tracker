import { decimalSeparator as decimalSeparatorFor, localeTag } from './locale'

/** Append a key ('0'-'9' | decimalSeparator | 'back') to an amount-entry buffer, enforcing max 2 decimals. */
export function applyKeypadKey(
  buffer: string,
  key: string,
  decimalSeparator: string = decimalSeparatorFor()
): string {
  if (key === 'back') {
    return buffer.slice(0, -1)
  }
  if (key === decimalSeparator) {
    if (buffer.includes(decimalSeparator)) return buffer
    if (buffer === '') return `0${decimalSeparator}`
    return buffer + decimalSeparator
  }
  // digit
  const sepIndex = buffer.indexOf(decimalSeparator)
  if (sepIndex !== -1 && buffer.length - sepIndex - 1 >= 2) {
    return buffer // already 2 decimals
  }
  if (sepIndex === -1 && buffer.replace(/^0+/, '').length >= 8) {
    return buffer // guard against absurd values
  }
  if (buffer === '0') {
    return key === '0' ? '0' : key
  }
  return buffer + key
}

/** Format the raw buffer for display, e.g. "1250,5" -> "1.250,5" (it) or "1250.5" -> "1,250.5" (en) */
export function formatBufferDisplay(
  buffer: string,
  decimalSeparator: string = decimalSeparatorFor(),
  locale: string = localeTag()
): string {
  if (!buffer) return '0'
  const [intPartRaw, decPart] = buffer.split(decimalSeparator)
  const intPart = intPartRaw === '' ? '0' : intPartRaw.replace(/^0+(?=\d)/, '')
  const intFormatted = Number(intPart || '0').toLocaleString(locale)
  if (decPart === undefined) return intFormatted
  return `${intFormatted}${decimalSeparator}${decPart}`
}
