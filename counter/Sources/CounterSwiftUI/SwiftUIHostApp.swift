// The native SwiftUI host. This target mounts its own `TUICounterApp` (declared in
// `TUICounterApp.swift`, over the shared `CounterView`) inside a real macOS
// `WindowGroup` through `SwiftUIHost` from `swift-tui-swiftui`.
//
// Note: since `SwiftUIHost` re-exports the SwiftTUI authoring layer, 
// the names `App`, `Scene`, `State`, and `View` each exist twice here — 
// once from SwiftUI, once from SwiftTUI.
// Ambiguous uses must name their module, which this code does with the Swift 6.3
// module selector `::` syntax (`SwiftUI::App`). This resolves the entity in the named
// module — and works in cases where the earlier member-style qualification
// (`SwiftUI.View`) does not.
//
// Pure SwiftTUI files do not need this. The collision exists only in host
// files like this one, where both frameworks meet.

import SwiftUI
import SwiftUIHost

// A regular SwiftUI App.
@main
struct SwiftUIHostApp: SwiftUI::App {
  var body: some SwiftUI::Scene {
    WindowGroup {
      SwiftUIBridgeView()
    }
  }
}

// The SwiftUI<>SwiftTUI bridge view. 
//
// A bridge requires two things:
// - A `SwiftUIHostAppState` containing the TUI app's state
// - A `SwiftUIHostAppView` that renders the state to SwiftUI
private struct SwiftUIBridgeView: SwiftUI::View {
  
  // The TUI state is stored in a SwiftUI @State variable.
  @SwiftUI::State private var tuiState = try! SwiftUIHostAppState(app: TUICounterApp())

  var body: some SwiftUI.View {
    // The live SwiftTUI scene, rendered inside SwiftUI.
    SwiftUIHostAppView(state: tuiState)
  }

}
