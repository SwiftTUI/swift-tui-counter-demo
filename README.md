# SwiftTUI Counter Demo

> One `CounterApp` source, three hosts: the same scene runs unchanged as a
> terminal executable, a native SwiftUI window, and a static WASI bundle in the
> browser. This repository is the clonable demo behind the live counter on
> [swifttui.sh](https://swifttui.sh).

## Quick start

Requires Swift 6.3+ (the easiest install is [swiftly](https://www.swift.org/swiftly/)).

```bash
git clone https://github.com/SwiftTUI/swift-tui-counter-demo.git
cd swift-tui-counter-demo
swift run --package-path counter counter
```

Increment the counter with `Space` or `Return`. Quit with `Ctrl-C`. Each press
launches its own ripple; overlapping rings brighten through screen blending.

Run the same scene in a **native SwiftUI window** (macOS only):

```bash
swift run --package-path counter CounterSwiftUI
```

Run the same scene in the **browser** (requires [Bun](https://bun.sh) and the
`swift-6.3.3-RELEASE_wasm` Swift SDK; see
[`WebExample/README.md`](WebExample/README.md)):

```bash
bun install
bun --cwd WebExample dev
```

## Layout

| Path | Role |
| --- | --- |
| [`counter/`](counter) | The three-host SwiftPM package: `CounterCore` (shared, host-neutral scene), `counter` (terminal executable), `CounterSwiftUI` (native macOS window), `CounterWASI` (browser/WASI executable) |
| [`WebExample/`](WebExample) | The browser deployment shell: a Bun-served host that compiles the app for WASI and mounts it on a canvas via `@swifttui/web`. The public website builds its live demo from this directory |

The interesting part is [`counter/Sources/CounterCore/CounterApp.swift`](counter/Sources/CounterCore/CounterApp.swift):
one `View` + `App` definition consumed unchanged by every host. See
[`counter/README.md`](counter/README.md) for how the package keeps the shared
core host-neutral (it depends on `SwiftTUIRuntime`, not the `SwiftTUI`
umbrella, so the WASI build never pulls in a server stack).

## Checks

```bash
bun run check          # full gate: counter build+test, TerminalApp build+test, web bundle
bun run check:linux    # counter package only (what Linux CI runs)
bun run check:web      # browser bundle only (wasm SDK + Binaryen required)
```

## See also

- [SwiftTUI](https://github.com/SwiftTUI/swift-tui): the framework
- [swift-tui-examples](https://github.com/SwiftTUI/swift-tui-examples): the full example roster
- [SwiftTUI DocC reference](https://swifttui.sh/docs/documentation/): `SwiftTUIRuntime`, `SwiftTUIWASI`, and `SwiftUIHost` API surface

## License

MIT; see [LICENSE](LICENSE).
