/**
 * CI-only accommodation for arm64 runners: give the packaged-runtime smoke test
 * enough headroom for LibreOffice's cold start under Rosetta.
 *
 * Upstream hard-codes several 120s limits that the smoke path relies on:
 *   1. apps/desktop/scripts/smoke-prepared-runtime.ts — execFile timeout (120_000)
 *      for the packaged-app runtime-payload launch (pnpm/koffi/sharp check).
 *      This is the one that actually SIGTERMs: an x64 Electron cold start under
 *      Rosetta on an arm64 runner routinely exceeds 120s once the payload set
 *      grows. Symptom in CI logs: `runtime payload: killed=true, signal=SIGTERM`.
 *   2. apps/desktop/scripts/smoke-runtime.ts — execFile timeouts (120_000)
 *   3. apps/desktop/scripts/smoke-runtime.ts — AbortSignal.timeout(120_000) fetch deadlines
 *   4. @deepseek-ai/libreoffice-kit DEFAULT_LIMITS.timeoutMs (12e4) — conversion deadline
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

// 1. smoke-prepared-runtime.ts packaged-app launch timeout (the SIGTERM culprit)
const preparedPath = join(checkout, 'apps', 'desktop', 'scripts', 'smoke-prepared-runtime.ts')
const prepared = readFileSync(preparedPath, 'utf8')
const preparedRelaxed = prepared.split('timeout: 120_000').join('timeout: 600_000')
if (preparedRelaxed === prepared) {
  console.log('patch-ci-smoke: smoke-prepared-runtime.ts had no 120_000 timeout to relax (already patched?)')
} else {
  writeFileSync(preparedPath, preparedRelaxed)
  console.log('patch-ci-smoke: smoke-prepared-runtime.ts exec timeout 120_000 -> 600_000')
}

// 2. smoke-runtime.ts exec timeouts + fetch deadlines
const smokePath = join(checkout, 'apps', 'desktop', 'scripts', 'smoke-runtime.ts')
const smoke = readFileSync(smokePath, 'utf8')
const relaxed = smoke
  .split('timeout: 120_000').join('timeout: 600_000')
  .split('AbortSignal.timeout(120_000)').join('AbortSignal.timeout(600_000)')
if (relaxed === smoke) {
  console.log('patch-ci-smoke: smoke-runtime.ts had no 120_000 timeouts to relax (already patched?)')
} else {
  writeFileSync(smokePath, relaxed)
  console.log('patch-ci-smoke: smoke-runtime.ts exec timeouts + fetch deadlines 120_000 -> 600_000')
}

// 3. libreoffice-kit conversion deadline via pnpm patchedDependencies
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
