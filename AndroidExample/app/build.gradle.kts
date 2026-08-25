plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.plugin.compose")
  // Cross-builds the Swift host product for Android and copies it, plus the
  // Swift runtime, into this app's jniLibs. Everything below the
  // `swiftTuiAndroidHost { }` block is ordinary Android configuration.
  id("sh.swifttui.android") version "0.9.9"
}

android {
  namespace = "sh.swifttui.counter"

  compileSdk {
    version = release(37) {
      minorApiLevel = 1
    }
  }

  // Needed to strip the packaged Swift `.so` files.
  ndkVersion = "27.3.13750724"

  defaultConfig {
    applicationId = "sh.swifttui.counter"
    minSdk = 28
    targetSdk = 36
    versionCode = 1
    versionName = "0.9.9"

    ndk {
      // arm64-v8a is the 0.9 Android support tier. The framework also
      // cross-compiles for x86_64, but packaging that ABI needs a matching
      // Swift SDK lane in the convention plugin.
      abiFilters += "arm64-v8a"
    }
  }

  // Where copySwiftAndroidLibraries writes libswift_tui_app_host.so and the
  // Swift runtime. The JNI shim itself arrives in the android-host AAR.
  sourceSets["main"].jniLibs.directories.add(
    layout.buildDirectory.dir("generated/swiftJniLibs").get().asFile.path
  )

  buildFeatures {
    compose = true
  }

  packaging {
    jniLibs {
      // Extract the Swift runtime at install time so dlopen resolves it.
      useLegacyPackaging = true
    }
  }
}

// The only Swift wiring this app needs: which SwiftPM product to cross-build.
// `packageDirectory` defaults to ../SwiftPackage, which is where this example's
// Android entry point lives.
swiftTuiAndroidHost {
  productName = "CounterAndroidHost"
  // The app itself lives in the sibling `counter` package, so track its sources
  // too — otherwise editing CounterApp.swift would not retrigger the Swift
  // cross-build.
  additionalSwiftSources.from(layout.projectDirectory.dir("../../counter/Sources"))
}

dependencies {
  implementation("sh.swifttui:android-host:0.9.9")

  implementation(platform("androidx.compose:compose-bom:2026.08.00"))
  implementation("androidx.activity:activity-compose:1.13.0")
  implementation("androidx.compose.foundation:foundation")
}
