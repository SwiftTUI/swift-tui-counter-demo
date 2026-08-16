import CounterCore
import SwiftTUIRuntime

// The SwiftTUI app which `WASIRunner` runs in the browser.
//
// The `WindowIdentifier` is load-bearing here. `WASIRunner` writes it into
// `scene-manifest.json` as the scene id, and the browser host selects scenes by
// that id. `WindowGroup` defaults to `"window"`, so an unidentified scene would
// publish a manifest no browser host could address by name.
struct CounterApp: App {

  var body: some Scene {
    WindowGroup("Counter", id: WindowIdentifier("counter")) {
      CounterView()
    }
  }
}
