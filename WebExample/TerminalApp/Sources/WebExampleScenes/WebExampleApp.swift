import CounterCore
// `public` because `App` and `Scene` appear in this file's public API below.
// `CounterCore` does not, so it stays a plain (internal) import.
public import SwiftTUIRuntime

/// The browser deployment's `App`. Like every other host, it declares its own
/// `App` over the shared `CounterView` from `CounterCore`, so the terminal,
/// native SwiftUI, browser, and Android hosts all run the same view.
///
/// The type is `public` because the wasm entry point lives in a separate
/// executable target. If you fork this example, swap `CounterView` for your own
/// root view.
public struct WebExampleApp: App {

  public init() {}

  public var body: some Scene {
    // The identifier is load-bearing: `WASIRunner` writes it into
    // `scene-manifest.json` as the scene id, and `src/frontend.ts` addresses the
    // scene by that id. `WindowGroup` defaults to `"window"`, so dropping it
    // would publish a manifest the front end cannot select.
    WindowGroup("Counter", id: WindowIdentifier("counter")) {
      CounterView()
    }
  }
}
