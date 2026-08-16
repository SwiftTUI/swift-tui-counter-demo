import CounterCore
import SwiftTUIRuntime

// The SwiftTUI app which the Android host runs.
//
// Every host declares the same scene: a titled `WindowGroup` with the stable
// `"counter"` identifier that hosts address scenes by.
struct CounterApp: App {

  var body: some Scene {
    WindowGroup("Counter", id: WindowIdentifier("counter")) {
      CounterView()
    }
  }
}
