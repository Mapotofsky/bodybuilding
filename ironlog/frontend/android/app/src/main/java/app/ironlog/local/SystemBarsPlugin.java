package app.ironlog.local;

import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.Gravity;
import android.widget.FrameLayout;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {
    private View statusBackground;
    private View navigationBackground;

    @PluginMethod
    public void setTheme(PluginCall call) {
        final String statusColor = call.getString("statusColor");
        final String navigationColor = call.getString("navigationColor");
        final Boolean statusDarkIcons = call.getBoolean("statusDarkIcons");
        final Boolean navigationDarkIcons = call.getBoolean("navigationDarkIcons");
        if (statusColor == null || navigationColor == null || statusDarkIcons == null || navigationDarkIcons == null) {
            call.reject("系统栏颜色无效");
            return;
        }
        final int status;
        final int navigation;
        try {
            status = Color.parseColor(statusColor);
            navigation = Color.parseColor(navigationColor);
        } catch (IllegalArgumentException error) {
            call.reject("系统栏颜色无效", error);
            return;
        }
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            window.setStatusBarColor(status);
            window.setNavigationBarColor(navigation);
            View decor = window.getDecorView();
            int flags = decor.getSystemUiVisibility();
            flags = statusDarkIcons ? flags | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR : flags & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            flags = navigationDarkIcons ? flags | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : flags & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            decor.setSystemUiVisibility(flags);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController controller = window.getInsetsController();
                if (controller != null) {
                    int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                    int appearance = (statusDarkIcons ? WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS : 0)
                        | (navigationDarkIcons ? WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS : 0);
                    controller.setSystemBarsAppearance(appearance, mask);
                }
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setNavigationBarContrastEnforced(false);
                window.setStatusBarContrastEnforced(false);
            }
            if (Build.VERSION.SDK_INT >= 35) {
                FrameLayout root = (FrameLayout) decor;
                WindowInsets insets = root.getRootWindowInsets();
                if (insets != null) {
                    int statusHeight = insets.getInsets(WindowInsets.Type.statusBars()).top;
                    int navigationHeight = insets.getInsets(WindowInsets.Type.navigationBars()).bottom;
                    if (statusBackground == null) {
                        statusBackground = new View(getContext());
                        root.addView(statusBackground);
                    }
                    if (navigationBackground == null) {
                        navigationBackground = new View(getContext());
                        root.addView(navigationBackground);
                    }
                    statusBackground.setBackgroundColor(status);
                    navigationBackground.setBackgroundColor(navigation);
                    statusBackground.setLayoutParams(new FrameLayout.LayoutParams(-1, statusHeight, Gravity.TOP));
                    navigationBackground.setLayoutParams(new FrameLayout.LayoutParams(-1, navigationHeight, Gravity.BOTTOM));
                }
            }
            call.resolve();
        });
    }
}
