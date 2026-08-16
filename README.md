# SwiftTUI Counter Demo

> One `CounterView` source runs on four hosts: a terminal, a native SwiftUI
> window, the browser, and Android. This repository is the clonable demo behind
> the live counter on [swifttui.sh](https://swifttui.sh).

## What this demo shows

[`counter/Sources/CounterCore/CounterView.swift`](counter/Sources/CounterCore/CounterView.swift)
contains the full app: one `View`. Every host compiles this one file.

Each host then declares its own `App`. The `App` is four lines — a
`WindowGroup` around `CounterView()` — but it belongs to the host, not to the
shared core. A host's `App` is where its entry point attaches, and each runner
attaches differently: the terminal host puts `@main` on it, the SwiftUI host
passes it to `SwiftUIHostAppState`, the browser host passes it to
`WASIRunner.run`, and the Android host passes it to `AndroidHostSceneHost`.
Keeping the `App` per host means the shared core never has to name a runner.

| Host | Entry point | Platform |
| --- | --- | --- |
| Terminal | [`counter/Sources/counter/`](counter/Sources/counter) | macOS, Linux |
| Native SwiftUI window | [`counter/Sources/CounterSwiftUI/`](counter/Sources/CounterSwiftUI) | macOS |
| Browser (WebAssembly) | [`WebExample/`](WebExample) | Any modern browser |
| Android (Jetpack Compose) | [`AndroidExample/`](AndroidExample) | Android 9+, `arm64-v8a` |

The source files carry inline commentary. Read them in the table order above;
the comments explain each SwiftTUI concept as it appears, with pointers for
readers who know SwiftUI.

## Requirements

- Swift 6.3 or later, for every host. The easiest install is
  [swiftly](https://www.swift.org/swiftly/). This repository pins its
  toolchain in `.swift-version`, and swiftly reads that file.
- The native SwiftUI window requires macOS 15 or later.
- The browser host requires Node.js 18 or later and one JavaScript package
  manager. npm is sufficient; Bun also works. The WebAssembly build has two
  more requirements; see [Run in the browser](#3-run-in-the-browser).
- The Android host requires the Android SDK, an NDK, and the Swift Android SDK.
  See [`AndroidExample/README.md`](AndroidExample/README.md). No other host
  needs them.

## Quick start

```bash
git clone https://github.com/SwiftTUI/swift-tui-counter-demo.git
cd swift-tui-counter-demo
swift run --package-path counter counter
```

If your default `swift` is older than 6.3, put `swiftly run` in front of each
Swift command: `swiftly run swift run --package-path counter counter`.

## Build and run each host

### 1. Run in the terminal

```bash
swift run --package-path counter counter
```

Press `Space` or `Return` to increment the counter. Press `Ctrl-C` to quit.
Each press starts its own ripple. Overlapping rings brighten through screen
blending.

### 2. Run as a native macOS window

```bash
swift run --package-path counter CounterSwiftUI
```

This command builds the macOS-only `CounterSwiftUI` target and opens a real
`SwiftUI.WindowGroup` that hosts the same scene. To use Xcode instead: open
[`counter/Package.swift`](counter/Package.swift), select the `CounterSwiftUI`
scheme, and run. Read
[`SwiftUIHostApp.swift`](counter/Sources/CounterSwiftUI/SwiftUIHostApp.swift)
for the host pattern, including the `SwiftUI::` module-selector syntax that
mixed SwiftTUI + SwiftUI files need.

### 3. Run in the browser

The browser host compiles the app to WebAssembly and mounts it on a canvas.
It has two extra requirements:

1. The `swift-6.3.3-RELEASE_wasm` Swift SDK. If the SDK is missing, the build
   stops and prints the exact install command.
2. [Binaryen](https://github.com/WebAssembly/binaryen) (`wasm-opt`), optional
   but recommended. Without it the wasm binary stays larger.

```bash
npm install
cd WebExample
npm run dev
```

Then open <http://localhost:3000>. The first build is slow: the WebAssembly
compile can take several minutes. The build scripts print each step and warn
before the slow parts. Bun users can substitute `bun install` and `bun run
dev`; the build scripts themselves run on Node.

See [`WebExample/README.md`](WebExample/README.md) for the embedding pattern
and the production build.

### 4. Run on Android

```bash
cd AndroidExample
./gradlew :app:installDebug
```

The command builds the app for `arm64-v8a` and installs it on a connected
device or emulator. A Gradle plugin cross-compiles the same scene to a native
library, and a Compose `SwiftTUIHostView` renders it.

This host needs the Android SDK, NDK `27.3.13750724`, and the
`swift-6.3.3-RELEASE_android` Swift SDK. See
[`AndroidExample/README.md`](AndroidExample/README.md) for the install steps
and the four files that make up the integration.

### Choose debug or release

SwiftTUI is a source dependency: each build compiles the framework together
with the app, and the build configuration applies to both. This is different
from SwiftUI, which ships as a prebuilt system framework. The trade-off:

- A **release** build optimizes the framework, so it is slow to compile.
- A **debug** build compiles fast, but the unoptimized framework is slow at
  run time.

Use debug builds (the `swift run` default) to iterate. Add `-c release` to
judge how the demo really performs. The browser scripts follow the same rule:
`npm run dev` makes a debug wasm build, `npm run build` makes the release
bundle.

## Layout

| Path | Role |
| --- | --- |
| [`counter/`](counter) | The core SwiftPM package: `CounterCore` (the shared view), `counter` (terminal executable), `CounterSwiftUI` (native macOS window), `CounterWASI` (browser/WASI executable) |
| [`WebExample/`](WebExample) | The browser deployment shell: build scripts that compile the app for WASI and a static server that mounts it on a canvas via `@swifttui/web`. The public website builds its live demo from this directory |
| [`AndroidExample/`](AndroidExample) | The Android app: a Gradle project plus a small SwiftPM package that exposes `CounterCore` to the Android host as a native library |

See [`counter/README.md`](counter/README.md) for how the package keeps the
shared core host-neutral: it depends on `SwiftTUIRuntime`, not the `SwiftTUI`
umbrella, so the WASI build never pulls in a server stack.

## Checks

```bash
npm run check          # full gate: counter build+test, TerminalApp build+test, web bundle
npm run check:linux    # counter package only (what Linux CI runs)
npm run check:web      # browser bundle only (wasm SDK required)
```

The check scripts prefer Bun when it is installed and fall back to npm.

## See also

- [SwiftTUI](https://github.com/SwiftTUI/swift-tui): the framework
- [swift-tui-examples](https://github.com/SwiftTUI/swift-tui-examples): the full example roster
- [swift-tui-android](https://github.com/SwiftTUI/swift-tui-android): the Android AAR and Gradle plugin
- [SwiftTUI DocC reference](https://swifttui.sh/docs/documentation/): `SwiftTUIRuntime`, `SwiftTUIWASI`, and `SwiftUIHost` API surface

## License

MIT; see [LICENSE](LICENSE).
