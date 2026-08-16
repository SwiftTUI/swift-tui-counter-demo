# Android Example

> The same `CounterView` as a native Android app. A Jetpack Compose screen hosts
> the view that the terminal, SwiftUI, and browser hosts also run.

## Run

```bash
./gradlew :app:assembleDebug
```

Install the APK on an `arm64-v8a` device or emulator:

```bash
./gradlew :app:installDebug
```

Tap the counter button to increment it. That taps start ripples, the
same as every other host.

## Requirements

Android is a **arm64-only support tier**. The build needs four
things:

1. The Android SDK, with Platform 37.1. Android Studio installs it.
2. Android NDK `27.3.13750724`. The build uses it to strip the packaged
   libraries.
3. Swift 6.3.3, through [swiftly](https://www.swift.org/swiftly/).
4. The `swift-6.3.3-RELEASE_android` Swift SDK bundle, to cross-compile the
   app.

Materialize the Swift Android SDK's `ndk-sysroot` one time after you install
the bundle:

```bash
ANDROID_NDK_HOME="$HOME/Library/org.swift.swiftpm/swift-sdks/swift-6.3-RELEASE_android.artifactbundle/swift-android/android-ndk-r27d" \
  "$HOME/Library/org.swift.swiftpm/swift-sdks/swift-6.3.3-RELEASE_android.artifactbundle/swift-android/scripts/setup-android-sdk.sh"
```

If the toolchains are not on the default paths, name them on the command line:

```bash
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
ANDROID_HOME="$HOME/Library/Android/sdk" \
ANDROID_NDK_HOME="$HOME/Library/org.swift.swiftpm/swift-sdks/swift-6.3-RELEASE_android.artifactbundle/swift-android/android-ndk-r27d" \
SWIFT_ANDROID_SDK_BUNDLE="$HOME/Library/org.swift.swiftpm/swift-sdks/swift-6.3.3-RELEASE_android.artifactbundle" \
  ./gradlew :app:assembleDebug
```

The first build is slow. It compiles the SwiftTUI framework for Android from
source.

## Layout

Five small files hold the whole integration:

| Path | Role |
| --- | --- |
| [`SwiftPackage/Sources/CounterAndroidHost/CounterApp.swift`](SwiftPackage/Sources/CounterAndroidHost/CounterApp.swift) | This host's `App`, a `WindowGroup` around the shared `CounterView`. Every host declares its own; `CounterCore` exports no `App`. |
| [`SwiftPackage/Sources/CounterAndroidHost/CounterAndroidHost.swift`](SwiftPackage/Sources/CounterAndroidHost/CounterAndroidHost.swift) | The Swift entry point. It hands that `App` to `AndroidHostSceneHost` and exports one C symbol. |
| [`SwiftPackage/Package.swift`](SwiftPackage/Package.swift) | Declares that entry point as a **dynamic** library product. The app itself comes from the sibling `counter` package. |
| [`app/build.gradle.kts`](app/build.gradle.kts) | Ordinary Android configuration, plus one `swiftTuiAndroidHost { }` block that names the Swift product. |
| [`app/src/main/kotlin/sh/swifttui/counter/MainActivity.kt`](app/src/main/kotlin/sh/swifttui/counter/MainActivity.kt) | The Compose screen. It mounts `SwiftTUIHostView` and nothing else. |

## How it works

Android has no Swift entry point, because the JVM owns the process. The Swift
side is therefore a dynamic library, not an executable.

1. The `sh.swifttui.android` Gradle plugin cross-compiles `CounterAndroidHost`
   for `aarch64-unknown-linux-android28`.
2. The plugin renames the output to `libswift_tui_app_host.so`. It copies that
   library and the Swift runtime into the app's generated `jniLibs`.
3. At launch, `rememberSwiftTUIHostState` calls the JNI shim in the
   `sh.swifttui:android-host` AAR. The shim calls the exported
   `swift_tui_android_create_host` function.
4. `SwiftTUIHostView` measures the available pixels, converts them to a
   terminal-cell grid, and reports the size to SwiftTUI. It then paints each
   frame that the runtime publishes.

The AAR does not bundle the Swift runtime. The plugin supplies the runtime from
your Swift Android SDK, so the APK contains exactly one copy.

## Limits

This host does not yet support IME composition, the clipboard,
or link opening. `arm64-v8a` is the only packaged ABI.

## See also

- [`../README.md`](../README.md): the demo and its other three hosts.
- [`swift-tui-android`](https://github.com/SwiftTUI/swift-tui-android): the AAR
  and the Gradle plugin this example consumes.
- [DocC reference](https://swifttui.sh/docs/documentation/): the
  `SwiftTUIAndroidHost` API surface.
