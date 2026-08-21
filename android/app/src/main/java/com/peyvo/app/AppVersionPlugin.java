package com.peyvo.app;

import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppVersion")
public class AppVersionPlugin extends Plugin {
    @PluginMethod
    public void getInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("versionCode", BuildConfig.VERSION_CODE);
        result.put("versionName", BuildConfig.VERSION_NAME);
        result.put("store", BuildConfig.STORE_ID);
        String installer = "";
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                installer = getContext().getPackageManager()
                    .getInstallSourceInfo(getContext().getPackageName())
                    .getInstallingPackageName();
            } else {
                installer = getContext().getPackageManager()
                    .getInstallerPackageName(getContext().getPackageName());
            }
        } catch (Exception ignored) {}
        result.put("installer", installer == null ? "" : installer);
        call.resolve(result);
    }
}
