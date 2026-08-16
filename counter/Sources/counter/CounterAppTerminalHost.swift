// The terminal host. This target imports the batteries-included `SwiftTUI`
// umbrella, whose `App.main()` runner owns the terminal: raw mode, input,
// frames, and the optional `--web` local web host.

import CounterCore
import SwiftTUI

// `@main` must sit on a type in the executable target, so this host declares
// its own `App` around the shared `CounterView`. The declaration conforms to
// `SwiftTUI.App`, which names a runner; keeping it here is what lets
// `CounterCore` stay host-neutral and export the view alone.
@main
struct CounterAppTerminalHost: App {
  var body: some Scene {
    WindowGroup("Counter", id: WindowIdentifier("counter")) {
      CounterView()
    }
  }
}
