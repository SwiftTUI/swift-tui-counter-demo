# AGENTS.md

Guidance for agentic assistants working in **`swift-tui-counter-demo`**. Keep
this file concise. [`README.md`](README.md) is the full reference.

## What this repo is

The clonable SwiftTUI counter demo: one shared `CounterApp` scene that runs as
a terminal executable, a native SwiftUI window, and a static WASI bundle in the
browser. The public website (`swift-tui-site`) clones this repository at a
release tag and builds [`WebExample/`](WebExample) for the live demo on
swifttui.sh — keep that build working.

Two parts:

- **`counter/`** — the three-host SwiftPM package (`CounterCore`, `counter`,
  `CounterSwiftUI`, `CounterWASI`). `CounterCore` depends on `SwiftTUIRuntime`
  only, so it stays host-neutral and WASI-safe.
- **`WebExample/`** — the Bun-served browser deployment shell. It has its own
  [`AGENTS.md`](WebExample/AGENTS.md) (non-obvious COOP/COEP and wasm
  build-flag gotchas).

This repository is public and releases in lockstep with the SwiftTUI org.
Default manifests must use tagged HTTPS SwiftPM dependencies and released
package artifacts — no sibling source checkouts, no coordination pin files.
Pre-tag integration belongs in `swift-tui-org`.

## Toolchains

Use **`swiftly run`** for Swift packages (pinned Swift 6.3.x via
`.swift-version`). Do not use bare `swift` in checks or CI. The browser build
also requires **Bun**, **Binaryen**, and the `swift-6.3.3-RELEASE_wasm` SDK.

## Commands

```bash
bun install                                      # Bun workspace install
bun run check                                    # repo gate (Scripts/check_counter_demo.sh --skip-clean)
swiftly run swift run --package-path counter counter          # terminal demo
swiftly run swift run --package-path counter CounterSwiftUI   # native SwiftUI window (macOS)
swiftly run swift test --package-path counter    # counter tests
bun --cwd WebExample dev                         # browser demo
```

`//:swift_tui_counter_demo_native_gate` in the org root runs the
platform-appropriate `Scripts/check_counter_demo.sh` suite.

## Conventions

`AGENTS.md` is the real file. `CLAUDE.md` is a symlink to it. Edit `AGENTS.md`.
