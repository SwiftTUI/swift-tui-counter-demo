// The terminal host. This target imports the batteries-included `SwiftTUI`
// umbrella, whose `App.main()` runner owns the terminal: raw mode, input,
// frames, and the optional `--web` local web host.

import CounterCore
import SwiftTUI

// `@main` must sit on a type in the executable target, so this thin wrapper
// re-declares the app and forwards its `body` to the shared `CounterApp`.
// The wrapper conforms to `SwiftTUI.App`; the shared scene stays host-neutral
// in `CounterCore`.
@main
struct CounterAppTerminalHost: App {
  var body: some Scene {
    CounterApp().body
  }
}
