package com.playhub.app;

import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    requestMaxRefreshRate();
  }

  /**
   * Android keeps WebView apps at 60Hz on many devices unless the window
   * explicitly asks for a faster display mode. Pick the highest refresh rate
   * available at the current resolution so the app animates at the device's
   * native rate (90/120Hz). The system may still drop to 60Hz under battery
   * saver or thermal throttling.
   */
  private void requestMaxRefreshRate() {
    Display display = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
      ? getDisplay()
      : getWindowManager().getDefaultDisplay();
    if (display == null) {
      return;
    }

    Display.Mode active = display.getMode();
    Display.Mode best = active;
    for (Display.Mode mode : display.getSupportedModes()) {
      if (mode.getPhysicalWidth() == active.getPhysicalWidth()
          && mode.getPhysicalHeight() == active.getPhysicalHeight()
          && mode.getRefreshRate() > best.getRefreshRate()) {
        best = mode;
      }
    }

    if (best.getModeId() != active.getModeId()) {
      WindowManager.LayoutParams attrs = getWindow().getAttributes();
      attrs.preferredDisplayModeId = best.getModeId();
      getWindow().setAttributes(attrs);
    }
  }
}
