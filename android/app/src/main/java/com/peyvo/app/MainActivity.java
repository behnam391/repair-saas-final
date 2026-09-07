package com.peyvo.app;

import android.os.Bundle;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(MyketBillingPlugin.class);
        registerPlugin(NativeContactsPlugin.class);
        registerPlugin(AppVersionPlugin.class);
        super.onCreate(savedInstanceState);
        CookieManager.getInstance().setAcceptCookie(true);
    }

    @Override
    protected void onPause() {
        CookieManager.getInstance().flush();
        super.onPause();
    }
}
