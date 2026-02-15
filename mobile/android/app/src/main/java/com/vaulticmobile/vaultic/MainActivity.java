package com.vaulticmobile.vaultic;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BiometricAuthPlugin.class);
        registerPlugin(PostHookHandlerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
