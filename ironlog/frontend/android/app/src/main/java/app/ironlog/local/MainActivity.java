package app.ironlog.local;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(WebDavHttpPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
