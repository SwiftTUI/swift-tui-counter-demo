// The executable behind the browser demo. `WASIRunner.run` has two modes:
//
// - Compiled for WASI and loaded in the browser, it runs the app and drives
//   frames on a canvas.
// - Run natively with the environment variable `SWIFTTUI_MODE=manifest`, it
//   prints the scene manifest as JSON instead of running the app. The build
//   step packages that manifest next to the wasm file.
//
// The build scripts in `WebExample/scripts/` invoke both modes through
// `@swifttui/build`.
import SwiftTUIWASI
import WebExampleScenes

try await WASIRunner.run(WebExampleApp.self)
