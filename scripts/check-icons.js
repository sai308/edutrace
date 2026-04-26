import { readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')
const svgPath = join(publicDir, 'favicon.svg')

let svgMtime
try {
    svgMtime = statSync(svgPath).mtimeMs
}
catch {
    // Source SVG missing — nothing to compare against
    process.exit(0)
}

const pngs = readdirSync(publicDir).filter(f => f.endsWith('.png'))

if (pngs.length === 0) {
    console.warn('[icons] No generated PNGs found in public/ — run pnpm pwa:icons')
    process.exit(0)
}

const oldestPngMtime = Math.min(...pngs.map(f => statSync(join(publicDir, f)).mtimeMs))

if (svgMtime > oldestPngMtime) {
    console.warn('[icons] public/favicon.svg is newer than generated icons — run pnpm pwa:icons')
}
