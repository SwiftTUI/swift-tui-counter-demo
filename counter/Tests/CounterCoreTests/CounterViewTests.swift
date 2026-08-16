import Testing

@testable import CounterCore

@Suite("CounterView wiring")
struct CounterViewTests {
  @Test("CounterView is buildable from any host without extra arguments")
  @MainActor
  func counterViewIsTriviallyInstantiable() async throws {
    // `CounterCore` exports the view, not an `App`: every host declares its own
    // `App` over this view. So the shared contract this test guards is that
    // `CounterView()` stays argument-free and its body builds.
    let view = CounterView()
    _ = view.body
  }
}
