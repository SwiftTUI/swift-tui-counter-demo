package sh.swifttui.counter

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.ui.Modifier
import sh.swifttui.android.host.SwiftTUIHostView
import sh.swifttui.android.host.rememberSwiftTUIHostState

/**
 * The whole Kotlin half of the Android host.
 *
 * `rememberSwiftTUIHostState` calls into the Swift `swift_tui_android_create_host`
 * symbol through the AAR's JNI shim, then drives the runtime and republishes each
 * frame as Compose state. `SwiftTUIHostView` measures the space it is given,
 * converts it to a terminal-cell grid, reports the size back to SwiftTUI, and
 * paints the returned cells on a Canvas. Touch and keyboard input go the other
 * way as terminal bytes.
 *
 * There is no counter code here, and no `AndroidView` interop: the composable is
 * the host.
 */
class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent {
      SwiftTUIHostView(
        state = rememberSwiftTUIHostState(),
        // safeDrawingPadding keeps the cell grid clear of the status bar and
        // any display cutout, so no row is hidden under system chrome.
        modifier = Modifier.fillMaxSize().safeDrawingPadding()
      )
    }
  }
}
