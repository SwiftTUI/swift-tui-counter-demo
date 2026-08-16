// Import SwiftTUIRuntime since this view is built for all platforms.
// (A regular terminal app can use the batteries-included `import SwiftTUI`)
public import SwiftTUIRuntime

public struct CounterView: View {

  public init() {}

  // `\.terminalSize` reports the scene size in character cells (columns x rows).
  @Environment(\.terminalSize) private var terminalSize
  @State private var count = 0

  // The identity of the ripple that is currently on screen. `nil` means no
  // ripple is active.
  @State private var activeRippleID: Int? = nil

  public var body: some View {
    VStack(spacing: 1) {
      // `TextFigure` is a specialized SwiftTUI view which renders FIGlet text.
      TextFigure("\(count)", font: .future)
        .frame(minWidth: 14, alignment: .center)
      Button("Increment") {
        count += 1
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .onChange(of: count) {
      // Start a ripple only when none is active.
      if activeRippleID == nil {
        activeRippleID = count
      }
    }
    .background {
      if let rippleID = activeRippleID {
        RippleLayer(reach: reach) {
          // This completion runs when the ripple animation ends.
          // We clear the finished ripple so new ones can start.
          if activeRippleID == rippleID {
            activeRippleID = nil
          }
        }
        .id(rippleID)
      }
    }
  }

  // The distance from the center to the farthest corner, in column units.
  // (A terminal cell's height is, by convention, double the width)
  private var reach: Double {
    let horizontal = Double(terminalSize.width) / 2
    let vertical = Double(terminalSize.height)
    return (horizontal * horizontal + vertical * vertical).squareRoot()
  }
}

// An expanding ring. The view owns its animation state, so each mount plays
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
