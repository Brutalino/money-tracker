import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const iconsDir = join(publicDir, 'icons')
mkdirSync(iconsDir, { recursive: true })

// Base icon: rounded square, blue background (categorical slot 1), white euro sign.
const iconSvg = (size, radius, contentScale = 1) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#2a78d6"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
    font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-weight="700"
    font-size="${size * 0.56 * contentScale}" fill="#ffffff">&#8364;</text>
</svg>`

// Maskable icon needs extra safe-zone padding (icon content within ~80% center circle)
const maskableSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#2a78d6"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
    font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-weight="700"
    font-size="${size * 0.4}" fill="#ffffff">&#8364;</text>
</svg>`

const favicon = iconSvg(64, 14)
writeFileSync(join(publicDir, 'favicon.svg'), favicon.trim())

const targets = [
  { name: 'icon-192.png', size: 192, radius: 40, svg: iconSvg },
  { name: 'icon-512.png', size: 512, radius: 108, svg: iconSvg },
  { name: 'icon-maskable-512.png', size: 512, radius: 0, svg: maskableSvg },
]

for (const t of targets) {
  const svg = t.svg === maskableSvg ? maskableSvg(t.size) : iconSvg(t.size, t.radius)
  await sharp(Buffer.from(svg)).png().toFile(join(iconsDir, t.name))
  console.log('wrote', t.name)
}

// apple touch icon (no transparency, 180x180, slight radius handled by iOS itself)
const appleSvg = iconSvg(180, 0)
await sharp(Buffer.from(appleSvg)).png().toFile(join(publicDir, 'apple-touch-icon.png'))
console.log('wrote apple-touch-icon.png')

console.log('done')
