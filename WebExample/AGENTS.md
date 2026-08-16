# AGENTS.md

Guidance for agentic assistants working in **WebExample**. Keep this file
concise. [`README.md`](README.md) is the full reference.

## What this is

This package contains the **reference embedding pattern** for SwiftTUI in the
browser. The build compiles a real SwiftTUI `App` for WASI. `@swifttui/web`
mounts the app on a canvas. This package has **no terminal emulator
dependency**. The public website uses this package for the live demo. Keep the
package small and focused on the embedding contract.

Three cooperating parts:

- **`TerminalApp/`** — A Swift package whose `WebExampleApp` declares this
  host's `App` over the shared `CounterCore.CounterView`. (`CounterCore`
  exports no `App`; each host owns its own.) A small executable calls
  `WASIRunner.run(...)`.
- **`scripts/`** — Node-compatible build and serve scripts (`.mjs`, no Bun
  APIs). `build-terminal.mjs` builds the wasm + manifest through
  `@swifttui/build`; `build-web.mjs` bundles the front end with esbuild;
  `serve.mjs` serves everything with COOP/COEP headers and backs the browser
  tests.
- **`src/`** — The browser front end. The load-bearing bootstrap is in
  [`src/frontend.ts`](src/frontend.ts).

The package depends on `@swifttui/web` and `@swifttui/build`. Pre-public source
checkouts can use workspace dependencies. Public releases must use npm versions
or public release tarballs.

## Toolchains

- The build and serve scripts run on **Node 18+** (Bun can run them too). Any
  npm setup can drive the package scripts.
- **Bun** is the test runner (`bun test`, `bun run test:browser`).
- Use **`swiftly`** Swift 6.3.3 and the `swift-6.3.3-RELEASE_wasm` SDK for the
  WASI build. The build scripts check both and print install guidance.

## Commands

```bash
npm install            # once, in the repository root
npm run dev            # debug wasm build, then serve with front-end watch
npm run build          # dist/ (web) + pages-dist/ (web + TerminalApp/dist)
npm start              # serve a production build
bun test               # unit tests
bun run test:browser   # Playwright browser-integration specs (*.browser.ts)
```

## Gotchas

- **WASI build flags are load-bearing.** The release build needs
  `-Xswiftc -Osize` **plus**
  `-Xswiftc -Xfrontend -Xswiftc -disable-llvm-merge-functions-pass`. Plain `-O`
  (and on some Darwin runners, plain `-Osize`) emits merged outlined copy
  helpers. Their signatures exceed the browser WebAssembly API's 1000-parameter
  limit. This causes `WebAssembly.Module doesn't parse` at startup. The
  canonical commands live in `scripts/build-terminal.mjs` and
  `TerminalApp/build.sh`.
- **COOP/COEP headers are required.** The host must serve
  `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp` so `SharedArrayBuffer`-backed
  stdin operates. `scripts/serve.mjs` adds them to every response.
- **No hot reload.** The watch mode only rebuilds the bundle. Refresh the page
  after frontend edits.
- **Script output style.** Build scripts print bold step titles and dim detail
  lines, never red details; failure text is plain guidance. Keep new output
  consistent (`scripts/term-style.mjs`).

## Conventions

`AGENTS.md` is the real file. `CLAUDE.md` is a symlink to it. Edit `AGENTS.md`.
See the SwiftTUI package `docs/DEVELOPMENT.md` for the full
toolchain/environment story.
