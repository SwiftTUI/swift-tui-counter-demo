// The SwiftTUI Android artifacts are served from GitHub Pages until they
// graduate to the Gradle Plugin Portal and Maven Central. The plugin and the
// AAR resolve through two separate repository blocks, so the URL appears twice.
// Gradle extracts `pluginManagement` and evaluates it before the rest of this
// script, so a shared `val` here would not be in scope inside it.
pluginManagement {
  repositories {
    google()
    mavenCentral()
    gradlePluginPortal()
    maven { url = uri("https://swifttui.github.io/swift-tui-android") }
  }
}

dependencyResolutionManagement {
  repositories {
    google()
    mavenCentral()
    maven { url = uri("https://swifttui.github.io/swift-tui-android") }
  }
}

rootProject.name = "SwiftTUICounterAndroid"
include(":app")
