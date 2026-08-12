// The native SwiftUI host. This target mounts the shared `CounterApp` inside
// a real macOS `WindowGroup` through `SwiftUIHost` from `swift-tui-swiftui`.
//
// About the unusual name qualifiers in this file: `SwiftUIHost` re-exports the
// SwiftTUI authoring layer, so `App`, `Scene`, `State`, `View`, and `Group`
// each exist twice here — once from SwiftUI, once from SwiftTUI. Ambiguous
// uses must name their module. (A few, such as `WindowGroup` below, stay bare
// because the expected type already selects the SwiftUI candidate.) Two
// spellings name a module:
//
// - `SwiftUI.View` — member-style qualification, the classic spelling.
// - `SwiftUI::App` — the Swift 6.3 module selector. It resolves the name in
//   the named module and works in every position, including attributes such
//   as `@SwiftUI::State`, where the dot spelling is ambiguous to parse.
//
// A SwiftTUI view file never needs this. The collision exists only in host
// files like this one, where both frameworks meet.

import CounterCore
import SwiftUI
import SwiftUIHost

@main
struct CounterHostApp: SwiftUI::App {
  var body: some SwiftUI::Scene {
    WindowGroup {
      CounterHostRootView()
    }
  }
}

// The bridge view. `SwiftUIHostAppState` boots a SwiftTUI runtime for the
// shared app; `SwiftUIHostAppView` renders that runtime as SwiftUI content.
private struct CounterHostRootView: SwiftUI.View {
  // The host state is created once, in `launchHostIfNeeded`, because the
  // launch can throw. `@SwiftUI::State` keeps it alive across renders.
  @SwiftUI::State private var hostState: SwiftUIHostAppState<CounterApp>?
  @SwiftUI::State private var launchError: String?

  var body: some SwiftUI.View {
    SwiftUI.Group {
      if let hostState {
        // The live SwiftTUI scene, rendered inside SwiftUI.
        SwiftUIHostAppView(state: hostState)
      } else if let launchError {
        SwiftUI.ContentUnavailableView {
          SwiftUI.Label("SwiftTUI Host Failed", systemImage: "exclamationmark.triangle")
        } description: {
          SwiftUI.Text(launchError)
        }
      } else {
        SwiftUI.ProgressView("Starting SwiftTUI host")
      }
    }
    .task {
      launchHostIfNeeded()
    }
  }

  @MainActor
  private func launchHostIfNeeded() {
    guard hostState == nil, launchError == nil else {
      return
    }

    do {
      hostState = try SwiftUIHostAppState(app: CounterApp())
    } catch {
      launchError = String(describing: error)
    }
  }
}
