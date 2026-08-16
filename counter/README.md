# Counter

> One `CounterView` source, four hosts: the same view runs unchanged as a
> terminal executable, a native SwiftUI window, a static WASI bundle in the
> browser, and a native Android app. A SwiftTUI App targets every host without
> per-target source forks.
>
> This package holds the first three entry points. The Android entry point is
> in [`../AndroidExample/`](../AndroidExample), because its Gradle build needs
> its own SwiftPM package.

## Run

```bash
swift run --package-path counter counter
```

If your default `swift` is older than 6.3, put `swiftly run` in front of each
Swift command in this file.

Press `Space` or `Return` to increment the counter. Press `Ctrl-C` to quit.
The value uses the Gallery counter's `TextFigure` treatment. Each press starts
its own ripple, so rapid presses leave several rings in flight. Overlapping
rings brighten through screen blending.

Run the same scene in a **native SwiftUI window** (macOS-only SwiftPM target):

```bash
swift run --package-path counter CounterSwiftUI
```

Build the **static WASI bundle** for the browser host. It is a separate
product. The [Build](#build) section explains the required flags.

```bash
swift build \
  --package-path counter \
  --swift-sdk swift-6.3.3-RELEASE_wasm \
  -c release \
  -Xswiftc -Osize \
  -Xswiftc -Xfrontend -Xswiftc -disable-llvm-merge-functions-pass \
  --product CounterWASI
```

## Demonstrates

- `SwiftTUIRuntime` is the host-neutral authoring layer, not the `SwiftTUI`
  umbrella. One `CounterView` source compiles for each host, including WASI.
- Each host declares its own `App` over that shared view. `CounterCore` exports
  no `App`, so it never names a runner and stays host-neutral.
- The terminal host puts `@main` on its own `App` and uses the `SwiftTUI`
  umbrella runner.
- `SwiftUIHost` from `swift-tui-swiftui` mounts the same scene in a native
  `SwiftUI.Scene` and `WindowGroup` on macOS.
- `SwiftTUIWASI` runs the same scene through `WASIRunner.run` in the browser.
  Its dependency closure excludes the `SwiftTUIWebHost` server and Dispatch.
  Thus, the wasm has no server or runtime stack.
- Identity-preserving `ForEach` animation layers and `.screen` compositing let
  independently timed ripples overlap on each host.

## Layout

Each source file carries inline commentary. Read them in this order:

| Path | Role |
| --- | --- |
| [`Sources/CounterCore/CounterView.swift`](Sources/CounterCore/CounterView.swift) | The shared `CounterView` every host compiles. Imports `SwiftTUIRuntime` (not the `SwiftTUI` umbrella) so it stays host-neutral and WASI-safe. It declares no `App`. |
| [`Sources/counter/CounterAppTerminalHost.swift`](Sources/counter/CounterAppTerminalHost.swift) | Terminal entry point. Its own `@main App` wraps `CounterView` and uses the `SwiftTUI.App` runner (native only). |
| [`Sources/CounterSwiftUI/CounterApp.swift`](Sources/CounterSwiftUI/CounterApp.swift) | The SwiftUI host's `App`. |
| [`Sources/CounterSwiftUI/SwiftUIHostApp.swift`](Sources/CounterSwiftUI/SwiftUIHostApp.swift) | Native SwiftUI entry point: a `@main SwiftUI.App` hosting that `App` via `SwiftUIHostAppView` (macOS-only SwiftPM target). Its comments explain the `SwiftUI::` module-selector syntax. |
| [`Sources/CounterWASI/CounterApp.swift`](Sources/CounterWASI/CounterApp.swift) | The browser host's `App`. |
| [`Sources/CounterWASI/main.swift`](Sources/CounterWASI/main.swift) | Browser entry point with top-level `WASIRunner.run(CounterApp.self)`. It depends only on `SwiftTUIWASI`, so no server or Dispatch stack enters the wasm. |
| [`Tests/CounterCoreTests/`](Tests/CounterCoreTests/) | A smoke test asserting `CounterView` stays trivially instantiable. |

## Build

The browser host is a **separate product** named `CounterWASI`. The terminal
executable imports the `SwiftTUI` umbrella. Its runner serves HTTP through
SwiftTUI's built-in `SwiftTUIWebHost` server, which needs POSIX sockets and
Dispatch. Neither builds for WASI. Therefore, build the WASI product with the
`swift build` command above.

The `-Osize` and `-disable-llvm-merge-functions-pass` flags are required for
release wasm builds. A plain `-O` build emits merged helper functions whose
signatures exceed the browser WebAssembly limit of 1000 parameters, and the
module then fails to parse. [`../WebExample/`](../WebExample/) automates the
same build and serves the result.

The native SwiftUI host, `CounterSwiftUI`, is a macOS-only target.
`Package.swift` guards it with `#if os(macOS)`. Other platforms do not build
this target.

## Controls

| Key | Action |
| --- | --- |
| `Space` / `Return` | Increment the counter |
| `Ctrl-C` | Quit |

## Test

```bash
swift test --package-path counter
```

The command runs the `CounterCoreTests` target. Its smoke test creates the
shared `CounterView`, which guards the one contract every host depends on: the
view stays argument-free and its body builds.

## See also

- [`../WebExample/`](../WebExample/): the full browser/WASI deployment shell that serves a `.wasm` like this one.
- [`../AndroidExample/`](../AndroidExample/): the Android host, which cross-compiles `CounterCore` to a native library.
- [SwiftTUI DocC reference](https://swifttui.sh/docs/documentation/): `SwiftTUIRuntime`, `SwiftTUIWASI`, and `SwiftUIHost` API surface.
