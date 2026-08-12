public import CounterCore

/// The browser deployment intentionally runs the exact `CounterApp` shared by
/// the terminal and native SwiftUI hosts. The alias keeps the public
/// `WebExampleApp` entry point stable while avoiding a second authored app.
/// If you fork this example, replace the alias with your own `App` type.
public typealias WebExampleApp = CounterApp
