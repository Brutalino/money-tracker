/** Append a key ('0'-'9' | ',' | 'back') to an amount-entry buffer, enforcing max 2 decimals. */
export function applyKeypadKey(buffer: string, key: string): string {
  if (key === 'back') {
    return buffer.slice(0, -1)
  }
  if (key === ',') {
    if (buffer.includes(',')) return buffer
    if (buffer === '') return '0,'
    return buffer + ','
  }
  // digit
  const commaIndex = buffer.indexOf(',')
  if (commaIndex !== -1 && buffer.length - commaIndex - 1 >= 2) {
    return buffer // already 2 decimals
  }
  if (commaIndex === -1 && buffer.replace(/^0+/, '').length >= 8) {
    return buffer // guard against absurd values
  }
  if (buffer === '0') {
    return key === '0' ? '0' : key
  }
  return buffer + key
}

/** Format the raw buffer for display, e.g. "1250,5" -> "1.250,5" */
export function formatBufferDisplay(buffer: string): string {
  if (!buffer) return '0'
  const [intPartRaw, decPart] = buffer.split(',')
  const intPart = intPartRaw === '' ? '0' : intPartRaw.replace(/^0+(?=\d)/, '')
  const intFormatted = Number(intPart || '0').toLocaleString('it-IT')
  if (decPart === undefined) return intFormatted
  return `${intFormatted},${decPart}`
}
