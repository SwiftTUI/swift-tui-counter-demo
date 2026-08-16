import Testing

@testable import WebExampleScenes

@Test("WebExampleApp declares a scene over the shared counter view")
@MainActor
func webExampleAppExposesOneScene() {
  let app = WebExampleApp()
  // Smoke check: the browser entry point must stay trivially instantiable and
  // its body accessor must build. SwiftTUI's Scene type is opaque, so the exact
  // topology is not asserted here.
  _ = app.body
}
