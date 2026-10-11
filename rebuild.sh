#!/usr/bin/env bash
# Rebuild DeepSeek Harness desktop for Intel macOS from an upstream tag.
# Mirrors what .github/workflows/rebuild.yml does in CI.
#
# Usage: ./rebuild.sh [upstream-tag]     (default: newest upstream tag)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
UPSTREAM_URL="https://github.com/deepseek-ai/deepseek-harness.git"
PINNED_ELECTRON="43.0.0"

TAG="${1:-}"
if [ -z "$TAG" ]; then
  echo "==> resolving newest upstream tag"
  TAG=$(gh api 'repos/deepseek-ai/deepseek-harness/tags?per_page=100' \
    --jq '[.[].name] | map(select(test("^dsh-v[0-9]+\\.[0-9]+\\.[0-9]+(-[0-9A-Za-z.-]+)?$"))) | .[0]')
fi
echo "==> upstream tag: $TAG"

WORK="${REPO_ROOT}/.build/upstream"
rm -rf "$WORK"
mkdir -p "$(dirname "$WORK")"
echo "==> shallow-cloning upstream at $TAG"
git clone --depth 1 --branch "$TAG" "$UPSTREAM_URL" "$WORK"

echo "==> pinning Electron to $PINNED_ELECTRON"
node "$REPO_ROOT/scripts/pin-electron.mjs" "$WORK"

echo "==> install (this can take a while)"
(cd "$WORK" && pnpm install --no-frozen-lockfile)

echo "==> build"
(cd "$WORK" && pnpm run build)

echo "==> package unsigned mac-x64"
(cd "$WORK" && pnpm run package:desktop:mac:x64:unsigned)

ART_DIR="$WORK/apps/desktop/.desktop-build/targets/mac-x64/unsigned-artifacts"
DMG=$(ls "$ART_DIR"/*.dmg | head -1)
echo "==> DMG ready: $DMG"
shasum -a 256 "$DMG"
echo "==> install with: hdiutil attach \"$DMG\" && cp -R \"/Volumes/\"DeepSeek*\"/*.app\" /Applications/"
