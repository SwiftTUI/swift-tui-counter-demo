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
- **`WebExample/`** — the browser deployment shell: Node-based build scripts
  plus a static server. It has its own [`AGENTS.md`](WebExample/AGENTS.md)
  (non-obvious COOP/COEP and wasm build-flag gotchas).

The demo is a teaching surface. Source files carry inline commentary aimed at
readers who come from SwiftUI; keep that commentary correct when you edit the
code. User-facing prose (READMEs, script output) follows ASD-STE100: short
sentences, active voice, one instruction per sentence.

This repository is public and releases in lockstep with the SwiftTUI org.
Default manifests must use tagged HTTPS SwiftPM dependencies and released
package artifacts — no sibling source checkouts, no coordination pin files.
Pre-tag integration belongs in `swift-tui-org`.

## Toolchains

Use **`swiftly run`** for Swift packages in checks and CI (pinned Swift 6.3.x
via `.swift-version`). User-facing docs may show bare `swift`, which works on
any Swift 6.3+ toolchain. The browser build runs on **Node 18+** with any npm
setup; **Bun** is optional (preferred installer in CI, and the test runner).
The wasm build also requires the `swift-6.3.3-RELEASE_wasm` SDK and benefits
from **Binaryen**.

## Commands

```bash
npm install                                      # workspace install (bun install also works)
npm run check                                    # repo gate (Scripts/check_counter_demo.sh --skip-clean)
swift run --package-path counter counter         # terminal demo
swift run --package-path counter CounterSwiftUI  # native SwiftUI window (macOS)
swift test --package-path counter                # counter tests
npm --prefix WebExample run dev                  # browser demo (or: cd WebExample && npm run dev)
```

`//:swift_tui_counter_demo_native_gate` in the org root runs the
platform-appropriate `Scripts/check_counter_demo.sh` suite.

## Conventions

`AGENTS.md` is the real file. `CLAUDE.md` is a symlink to it. Edit `AGENTS.md`.
