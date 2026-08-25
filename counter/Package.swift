// swift-tools-version: 6.3

import PackageDescription

var platforms: [SupportedPlatform]? = nil
var targets: [Target] = [
  // Shared, host-neutral core. Depends on the runtime/authoring layer only —
  // NOT the `SwiftTUI` convenience umbrella, whose default runner serves over
  // HTTP via the built-in `SwiftTUIWebHost` server (→ POSIX sockets and
  // Dispatch) and therefore cannot build for WASI.
  // Keeping the core at `SwiftTUIRuntime` lets every host consume it, including
  // the browser/WASI host below.
  .target(
    name: "CounterCore",
    dependencies: [
      .product(name: "SwiftTUIRuntime", package: "swift-tui")
    ]
  ),
  // Terminal host: the batteries-included `SwiftTUI.App` runner (terminal +
  // WebHost). Sockets and Dispatch are available on native platforms, so this
  // host imports the umbrella directly. It can no longer reach `SwiftTUI`
  // transitively through the core, so the dependency is declared here.
  .executableTarget(
    name: "counter",
    dependencies: [
      "CounterCore",
      .product(name: "SwiftTUI", package: "swift-tui"),
    ],
    linkerSettings: [
      // Windows reserves 1 MiB of main-thread stack from the PE header;
      // SwiftTUI's resolve descent is budgeted against the 8 MiB POSIX
      // floor, so a default-link Windows debug build degrades to the
      // stack-lean engine profile (and, before the runtime floor check,
      // died at launch with STATUS_STACK_OVERFLOW). A root package may
      // carry unsafeFlags — and the WebExample/TerminalApp path dependency
      // tolerates it — so the demo links the full-engine reserve out of
      // the box. (swift-tui-org Windows plan, Stage 6 item 9.)
      .unsafeFlags(
        ["-Xlinker", "/STACK:16777216"],
        .when(platforms: [.windows])
      )
    ]
  ),
  // Browser host: runs inside the browser via `WASIRunner.run`. Its dependency
  // closure stops at `SwiftTUIWASI`, which never reaches the web-host server
  // stack.
  .executableTarget(
    name: "CounterWASI",
    dependencies: [
      "CounterCore",
      .product(name: "SwiftTUIWASI", package: "swift-tui"),
    ]
  ),
  // Host-neutral core tests. The test bundle lives under
  // Tests/CounterCoreTests; declaring the target here lets
  // `swift test` discover it (the examples gate runs it explicitly).
  .testTarget(
    name: "CounterCoreTests",
    dependencies: ["CounterCore"]
  ),
]
var products: [Product] = [
  .library(
    name: "CounterCore",
    targets: ["CounterCore"]
  ),
  .executable(
    name: "counter",
    targets: ["counter"]
  ),
  .executable(
    name: "CounterWASI",
    targets: ["CounterWASI"]
  ),
]
#if os(macOS)
  platforms = [.macOS(.v15)]
  targets += [
    .executableTarget(
      name: "CounterSwiftUI",
      dependencies: [
        "CounterCore",
        .product(name: "SwiftUIHost", package: "swift-tui-swiftui"),
      ]
    )
  ]
  products += [
    .executable(name: "CounterSwiftUI", targets: ["CounterSwiftUI"])
  ]
#endif

let package = Package(
  name: "counter",
  platforms: platforms,
  products: products,
  dependencies: [
    .package(url: "https://github.com/SwiftTUI/swift-tui.git", exact: "0.9.9"),
    .package(url: "https://github.com/SwiftTUI/swift-tui-swiftui.git", exact: "0.9.9"),
  ],
  targets: targets,
  swiftLanguageModes: [.v6]
)
