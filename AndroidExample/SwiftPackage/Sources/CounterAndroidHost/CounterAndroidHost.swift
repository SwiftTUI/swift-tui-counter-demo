// The Android entry point. Android has no Swift entry point of its own — the
// JVM owns the process — so instead of a `main`, this host publishes a factory
// function that the Kotlin side calls through JNI.
//
// Like every other host, it declares its own `App` (in `CounterApp.swift`) over
// the shared `CounterView` from `CounterCore`.

import SwiftTUIAndroidHost

/// Creates the SwiftTUI host and returns an opaque handle for the JNI shim.
///
/// `@_cdecl` gives the function an unmangled C name. The name is fixed:
/// `libswift_tui_jni.so` in the `sh.swifttui:android-host` AAR looks up exactly
/// `swift_tui_android_create_host`, so every SwiftTUI Android app exports this
/// one symbol and nothing else.
///
/// The handle is an `Int64` rather than a pointer because it crosses into
/// Kotlin, where a `Long` is the natural width. `AndroidHostHandleRegistry` owns
/// the host object and hands back a key, so the Swift side keeps the only strong
/// reference. Returning `0` reports failure; the Kotlin host then shows no
/// frames instead of crashing the app.
@_cdecl("swift_tui_android_create_host")
public func swift_tui_android_create_host() -> Int64 {
  // The runtime is `@MainActor`-isolated, and JNI calls this on the Android main
  // thread, so the isolation already holds — `assumeIsolated` states that fact
  // rather than hopping to reach it.
  MainActor.assumeIsolated {
    do {
      let host = try AndroidHostSceneHost(app: CounterApp())
      return AndroidHostHandleRegistry.register(host)
    } catch {
      return 0
    }
  }
}
