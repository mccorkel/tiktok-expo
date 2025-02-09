package com.tiktokexpo;

import android.os.Bundle;
import android.content.res.Configuration;
import android.app.PictureInPictureParams;
import android.util.Rational;
import android.util.Log;
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;

public class MainActivity extends ReactActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    // Pass null to prevent recreation of activity on configuration changes
    super.onCreate(null);
  }

  @Override
  public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
    Log.d("PIP", "PIP mode changed: " + isInPictureInPictureMode);
  }

  @Override
  public void onUserLeaveHint() {
    try {
      PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
      builder.setAspectRatio(new Rational(16, 9));
      enterPictureInPictureMode(builder.build());
      Log.d("PIP", "Entering PIP mode from onUserLeaveHint");
    } catch (Exception e) {
      Log.e("PIP", "Failed to enter PIP mode: " + e.getMessage());
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript.
   */
  @Override
  protected String getMainComponentName() {
    return "main";
  }
} 