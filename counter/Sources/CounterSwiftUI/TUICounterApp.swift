import CounterCore
import SwiftTUIRuntime

// The SwiftTUI app which is run in the `SwiftUIHostAppView`.
struct TUICounterApp: App {

  var body: some Scene {
    WindowGroup("Counter", id: WindowIdentifier("counter")) {
      CounterView()
    }
  }
}
