package com.peyvo.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(MyketBillingPlugin.class);
        registerPlugin(NativeContactsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
