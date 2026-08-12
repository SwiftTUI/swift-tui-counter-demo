// CounterApp.swift — the one scene that every host runs.
//
// This file is the whole app. The terminal host, the native SwiftUI host, and
// the browser host all compile this exact source. Each host only adds an entry
// point around it.
//
// The import is `SwiftTUIRuntime`, the host-neutral authoring layer. It is not
// the `SwiftTUI` umbrella, which adds the terminal and web-server runners. This
// choice keeps the module free of server and platform code, so it also builds
// for WASI. The `public` access-level import is a Swift 6 feature: public
// declarations below (`CounterApp`, its `Scene`) reference types from this
// module, so the import itself must be public.
public import SwiftTUIRuntime

// If you know SwiftUI, you know this view. `View`, `@State`, `@Environment`,
// `VStack`, `Button`, and the modifiers below are SwiftTUI declarations with
// the SwiftUI shapes. The difference is the canvas: layout runs in terminal
// cells, not points.
struct CounterView: View {

  // `\.terminalSize` is the SwiftTUI analog of a size-reading environment
  // value. It reports the scene size in character cells (columns x rows).
  @Environment(\.terminalSize) private var terminalSize
  @State private var count = 0

  // The identity of the ripple that is currently on screen. `nil` means no
  // ripple is active.
  @State private var activeRippleID: Int? = nil

  var body: some View {
    VStack(spacing: 1) {
      // `TextFigure` renders large multi-cell digits. It has no SwiftUI
      // equivalent; the nearest mental model is `Text` with a display font.
      TextFigure("\(count)", font: .future)
        .frame(minWidth: 14, alignment: .center)
      Button("Increment") {
        count += 1
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .onChange(of: count) {
      // Start a ripple only when none is active. While a ripple runs, more
      // presses change the count but do not restart the animation.
      if activeRippleID == nil {
        activeRippleID = count
      }
    }
    .background {
      if let rippleID = activeRippleID {
        RippleLayer(reach: reach) {
          // The completion runs when the ripple animation ends. Clear the
          // active identity so the next press can start a new ripple.
          if activeRippleID == rippleID {
            activeRippleID = nil
          }
        }
        // `.id(_:)` works exactly like the SwiftUI remount trick: a new
        // identity tears the old `RippleLayer` down and mounts a fresh one,
        // so its `@State progress` restarts at zero.
        .id(rippleID)
      }
    }
  }

  // The distance from the center to the farthest corner, in column units.
  // A terminal row is about two columns tall, so the full height stands in
  // for the aspect-corrected half height: (height / 2) x 2.
  private var reach: Double {
    let horizontal = Double(terminalSize.width) / 2
    let vertical = Double(terminalSize.height)
    return (horizontal * horizontal + vertical * vertical).squareRoot()
  }
}

// One expanding ring. The view owns its animation state, so each mount plays
// one full ripple and then reports completion.
private struct RippleLayer: View {
  @State private var progress: Double = 0

  let reach: Double
  let onCompletion: @MainActor @Sendable () -> Void

  var body: some View {
    Rectangle()
      .fill(ripple)
      // `.task` starts async work when the view mounts, exactly as in
      // SwiftUI. `withAnimation(_:completion:)` also matches SwiftUI, with
      // one divergence: SwiftTUI durations are `Duration` values
      // (`.milliseconds(1600)`), not floating-point seconds.
      .task {
        @MainActor in
        withAnimation(.linear(duration: .milliseconds(1600))) {
          progress = 1
        } completion: {
          onCompletion()
        }
      }
  }

  // The ring is a radial gradient whose start radius grows with `progress`.
  // The gradient is transparent at both edges and bright in the middle, so
  // it reads as a 5-cell-thick ring that expands from the center.
  private var ripple: RadialGradient {
    let innerEdge = progress * reach
    return RadialGradient(
      gradient: Gradient(stops: [
        .init(color: .clear, location: 0),
        .init(
          color: Color(red: 0x00 / 255, green: 0xE3 / 255, blue: 0xAB / 255),
          location: 0.5
        ),
        .init(color: .clear, location: 1),
      ]),
      center: .center,
      startRadius: innerEdge,
      endRadius: innerEdge + 5
    )
  }
}

// The `App` declaration each host mounts. `App`, `Scene`, and `WindowGroup`
// mirror their SwiftUI counterparts. The `WindowIdentifier` gives the scene a
// stable identity that hosts can address (the browser host selects scenes by
// this identifier).
public struct CounterApp: App {
  public init() {}

  public var body: some Scene {
    WindowGroup("Counter", id: WindowIdentifier("counter")) {
      CounterView()
    }
  }
}
