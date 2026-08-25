// swift-tools-version: 6.3

import PackageDescription

// The Android host is a *dynamic library*, not an executable: the Android app
// process is started by the JVM, and the Swift side is loaded into it with
// `dlopen`. SwiftPM names the output after the product, so `CounterAndroidHost`
// becomes `libCounterAndroidHost.so`; the Gradle plugin renames that to the
// canonical `libswift_tui_app_host.so` on the way into the APK.
//
// This package exists only to add the Android entry point. The app itself is
// still `CounterCore`, consumed by path from the sibling `counter` package that
// the terminal, SwiftUI, and WASI hosts also use.
let package = Package(
  name: "counter-android-host",
  platforms: [
    .macOS(.v15),
    .iOS(.v18),
  ],
  products: [
    .library(
      name: "CounterAndroidHost",
      type: .dynamic,
      targets: ["CounterAndroidHost"]
    )
  ],
  dependencies: [
    .package(path: "../../counter"),
    .package(url: "https://github.com/SwiftTUI/swift-tui.git", exact: "0.9.10"),
  ],
  targets: [
    .target(
      name: "CounterAndroidHost",
      dependencies: [
        .product(name: "CounterCore", package: "counter"),
        .product(name: "SwiftTUIAndroidHost", package: "swift-tui"),
      ]
    )
  ],
  swiftLanguageModes: [.v6]
)
