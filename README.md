# DeepSeek Harness for Intel macOS

Unofficial **x86_64** builds of the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) desktop app (DeepSeek 官方开源的 agent 桌面端)，automatically rebuilt whenever upstream publishes a new tag. 从上游 tag 重建，仅修改一个依赖版本，不含任何上游代码改动。

Official macOS packages require macOS 13+ (Electron 44 runtime), leaving Intel Mac users on Monterey behind. 本仓库把 Electron 运行时钉回 **43.0.0**——仍被上游运行时的原生 addon 指纹白名单接受、且支持 macOS 12.0+ 的最后一条 Electron 大版本线——让 Intel Mac + macOS 12 用户可以继续使用官方桌面端。

## Downloads

See [Releases](../../releases). Each release contains:

- `DeepSeek-Harness-<version>-mac-x64.dmg` — drag-and-drop installer
- `SHA256SUMS.txt` — checksums

**Requirements:** Intel Mac (x86_64), macOS 12 Monterey or newer.

## First launch (Gatekeeper)

Builds are unsigned (ad-hoc signed) and unnotarized. On first launch macOS will warn:

- Right-click `DeepSeek Harness.app` → **Open** → confirm **Open** in the dialog, or
- Remove the quarantine flag: `xattr -dr com.apple.quarantine "/Applications/DeepSeek Harness.app"`

## What changes vs upstream

One line: `apps/desktop/package.json` → `"electron": "43.0.0"` (upstream pins `^44.x`, which requires macOS 13+). Everything else is upstream code built by upstream's own packaging pipeline (`package:desktop:mac:x64:unsigned`). Consequences:

- Auto-update is disabled in unsigned builds. Follow this repo for new releases, or rebuild locally (see below).
- Builds are ad-hoc signed, not Developer ID signed.

## Automation

A scheduled GitHub Actions workflow (daily, 00:00 UTC) watches upstream tags and publishes a release here for each new one. You can also trigger a specific tag manually via *Actions → Rebuild upstream release for Intel macOS → Run workflow*.

## Rebuild locally

```sh
git clone https://github.com/<you>/deepseek-harness-macos-intel.git
cd deepseek-harness-macos-intel
./rebuild.sh dsh-v0.2.1-alpha.2   # tag optional; defaults to newest upstream tag
```

The script needs Node.js ≥ 22.19 (24 recommended), pnpm 11, and Xcode Command Line Tools.

## Disclaimer

This project is not affiliated with or endorsed by DeepSeek AI. DeepSeek Harness is MIT licensed; these builds redistribute unmodified upstream code with a single dependency-version pin. Audit the upstream source yourself before trusting any binary.

Method inspired by [lkw88-lab/hermes-desktop-macos-intel](https://github.com/lkw88-lab/hermes-desktop-macos-intel).
