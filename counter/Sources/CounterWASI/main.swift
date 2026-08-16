// The browser host. Unlike the terminal host, whose runner serves HTTP from a
// native process, the WASI host runs *inside* the browser: this wasm module is
// the client. `@swifttui/web` loads it and mounts its scene on a canvas.
//
// Two things make that possible:
//
// - The entry point is `WASIRunner.run`, not a server runner. In the browser
//   it drives frames on a canvas that `@swifttui/web` provides.
// - The dependency closure stops at `SwiftTUIWASI` + `CounterCore`. It never
//   reaches the web-host server stack or Dispatch, which do not build for
//   WASI. That is why `CounterCore` imports `SwiftTUIRuntime`, not the
//   `SwiftTUI` umbrella.

import SwiftTUIWASI

try await WASIRunner.run(CounterApp.self)
