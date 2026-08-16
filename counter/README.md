# Counter

> One `CounterView` source, four hosts: the same view runs unchanged as a
> terminal executable, a native SwiftUI window, a static WASI bundle in the
> browser, and a native Android app. A SwiftTUI App targets every host without
> per-target source forks.
>
> This package holds the first three entry points. The Android entry point is
> in [`../AndroidExample/`](../AndroidExample), because its Gradle build needs
> its own SwiftPM package.

## Demonstrates

- `SwiftTUIRuntime` is the host-neutral authoring layer, not the `SwiftTUI`
  'batteries included' terminal umbrella-module.
- One `CounterView` source compiles for each host, including WASI.
- Each host declares its own `App` over that shared view.
- The terminal host puts `@main` on its own `App` and uses the `SwiftTUI`
  umbrella runner.
- `SwiftUIHostAppView` from `swift-tui-swiftui` mounts the app in a native
  `SwiftUI.Scene` and `WindowGroup` on macOS.
- `SwiftTUIWASI` runs the app through `WASIRunner.run` in the browser.


## Controls

| Key | Action |
| --- | --- |
| `Space` / `Return` | Increment the counter |
| `Ctrl-D` | Quit |

## Build and Run

Use [swiftly](https://www.swift.org/install) to install Swift 6.3 and the SDKs described here.  
An Xcode Swift 6.3+ toolchain will only be able to build the terminal and SwiftUI examples.

### Terminal

```bash
swiftly run swift run --package-path counter counter
```

### SwiftUI
Run the app in a **native SwiftUI window**.

The native SwiftUI host, `CounterSwiftUI`, is a macOS-only target.
`Package.swift` guards it with `#if os(macOS)`. Other platforms do not build
this target.

```bash
swiftly run swift run --package-path counter CounterSwiftUI
```

### Browser / WASI

Use the `npm run` scripts in [`../WebExample/`](../WebExample/) to simplify these steps.

You can also build the **static WASI bundle** for the browser host directly.

```bash
swiftly run swift build \
  --package-path counter \
  --swift-sdk swift-6.3.3-RELEASE_wasm \
  -c release \
  -Xswiftc -Osize \
  -Xswiftc -Xfrontend -Xswiftc -disable-llvm-merge-functions-pass \
  --product CounterWASI
```

The `-Osize` and `-disable-llvm-merge-functions-pass` flags are required for
release wasm builds. A plain `-O` build emits merged helper functions whose
signatures exceed the browser WebAssembly limit of 1000 parameters, and the
module then fails to parse. [`../WebExample/`](../WebExample/) automates the
same build and serves the result.

## Test

```bash
swiftly run swift test --package-path counter
```

The command runs the `CounterCoreTests` target. Its smoke test creates the
shared `CounterView`, which guards the one contract every host depends on: the
view stays argument-free and its body builds.

## See also

- [`../WebExample/`](../WebExample/): the full browser/WASI deployment shell that serves a `.wasm`.
- [`../AndroidExample/`](../AndroidExample/): the Android host, which cross-compiles `CounterCore` to a native library.
- [SwiftTUI DocC reference](https://swifttui.sh/docs/documentation/): `SwiftTUIRuntime`, `SwiftTUIWASI`, and `SwiftUIHost` API surface.
