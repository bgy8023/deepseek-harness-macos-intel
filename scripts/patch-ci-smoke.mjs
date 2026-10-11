/**
 * CI-only accommodation for arm64 runners: give the packaged-runtime smoke test
 * enough headroom for LibreOffice's cold start under Rosetta.
 *
 * Upstream hard-codes two 120s limits that the smoke path relies on:
 *   1. apps/desktop/scripts/smoke-runtime.ts — execFile timeouts (120_000)
 *   2. @deepseek-ai/libreoffice-kit DEFAULT_LIMITS.timeoutMs (12e4) — conversion deadline
 *
 * This script relaxes both to 10 minutes in the upstream checkout BEFORE
 * `pnpm install`, using a pnpm patchedDependencies entry for the kit. It does
 * not alter any shipped code — the kit patch only affects test limits.
 *
 * Usage: node scripts/patch-ci-smoke.mjs <path-to-upstream-checkout>
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const checkout = process.argv[2]
if (!checkout) {
  console.error('usage: node scripts/patch-ci-smoke.mjs <path-to-upstream-checkout>')
  process.exit(1)
}

// 1. smoke-runtime.ts exec timeouts
const smokePath = join(checkout, 'apps', 'desktop', 'scripts', 'smoke-runtime.ts')
const smoke = readFileSync(smokePath, 'utf8')
const relaxed = smoke.split('timeout: 120_000').join('timeout: 600_000')
if (relaxed === smoke) {
  console.log('patch-ci-smoke: smoke-runtime.ts had no 120_000 timeouts to relax (already patched?)')
} else {
  writeFileSync(smokePath, relaxed)
  console.log('patch-ci-smoke: smoke-runtime.ts exec timeouts 120_000 -> 600_000')
}

// 2. libreoffice-kit conversion deadline via pnpm patchedDependencies
const KIT_SPEC = '@deepseek-ai/libreoffice-kit@0.1.5'
const PATCH_REL = 'patches/ci--libreoffice-kit-smoke-timeout.patch'
const PATCH_ABS = join(checkout, PATCH_REL)

const PATCH_BODY = `--- a/lib/index.js
+++ b/lib/index.js
@@ -1388,6 +1388,6 @@
 ];
 const DEFAULT_LIMITS = {
-\ttimeoutMs: 12e4,
+\ttimeoutMs: 6e5,
 \tmaxInputBytes: 67108864,
 \tmaxOutputBytes: 134217728,
 \tmaxImageResolution: 144,
`

if (!existsSync(PATCH_ABS)) {
  mkdirSync(join(checkout, 'patches'), { recursive: true })
  writeFileSync(PATCH_ABS, PATCH_BODY)
  console.log(`patch-ci-smoke: wrote ${PATCH_REL}`)
}

const workspacePath = join(checkout, 'pnpm-workspace.yaml')
const workspace = readFileSync(workspacePath, 'utf8')
if (workspace.includes(KIT_SPEC)) {
  console.log('patch-ci-smoke: workspace already registers the kit patch')
} else {
  // Append a second `patchedDependencies:` mapping. YAML allows repeated top-level
  // keys only for mappings via merge — pnpm's loader accepts a single block, so
  // instead append the entry to the existing block if present, else add one.
  if (/^patchedDependencies:/m.test(workspace)) {
    const updated = workspace.replace(
      /^(patchedDependencies:)$/m,
      `$1\n  '${KIT_SPEC}': ${PATCH_REL}`
    )
    writeFileSync(workspacePath, updated)
  } else {
    writeFileSync(workspacePath, workspace + `\npatchedDependencies:\n  '${KIT_SPEC}': ${PATCH_REL}\n`)
  }
  console.log(`patch-ci-smoke: registered ${KIT_SPEC} -> ${PATCH_REL} in pnpm-workspace.yaml`)
}
