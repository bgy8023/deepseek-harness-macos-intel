/**
 * Pin the Electron runtime to the newest version that still supports macOS 12 (Monterey).
 *
 * Upstream deepseek-harness pins Electron 44+, whose Chromium requires macOS 13+.
 * Electron 43.0.0 keeps macOS 12.0 compatibility and is a fingerprint recognized by
 * the runtime's `node-addon-require-builtin@0.1.x` allowlist (43.0.0 / 44.0.0 / 44.7.0 / 45.0.0-alpha.6),
 * so this is the only 43.x line that passes the packaged-runtime smoke test.
 *
 * Usage: node scripts/pin-electron.mjs <path-to-upstream-checkout>
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const checkout = process.argv[2]
if (!checkout) {
  console.error('usage: node scripts/pin-electron.mjs <path-to-upstream-checkout>')
  process.exit(1)
}

const pinnedVersion = '43.0.0'
const manifestPath = join(checkout, 'apps', 'desktop', 'package.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

if (!manifest.devDependencies?.electron) {
  console.error(`pin-electron: no electron entry in ${manifestPath}`)
  process.exit(1)
}

const previous = manifest.devDependencies.electron
manifest.devDependencies.electron = pinnedVersion
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`pin-electron: ${previous} -> ${pinnedVersion} (macOS 12 compatible)`)
