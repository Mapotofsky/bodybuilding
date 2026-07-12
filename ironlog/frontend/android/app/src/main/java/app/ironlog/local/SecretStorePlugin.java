package app.ironlog.local;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SecretStore")
public class SecretStorePlugin extends Plugin {
    private SecureSecretStore store;

    @Override
    public void load() {
        store = new SecureSecretStore(getContext());
    }

    @PluginMethod
    public void readSecret(PluginCall call) {
        String ref = call.getString("ref");
        try {
            JSObject result = new JSObject();
            result.put("value", store.read(ref));
            call.resolve(result);
        } catch (SecureSecretStore.SecretStoreException error) {
            reject(call, error);
        }
    }

    @PluginMethod
    public void writeSecret(PluginCall call) {
        String ref = call.getString("ref");
        String value = call.getString("value");
        if (value == null) {
            call.reject("Secret value is required", "INVALID_SECRET_VALUE");
            return;
        }
        try {
            store.write(ref, value);
            call.resolve();
        } catch (SecureSecretStore.SecretStoreException error) {
            reject(call, error);
        }
    }

    @PluginMethod
    public void removeSecret(PluginCall call) {
        String ref = call.getString("ref");
        try {
            store.remove(ref);
            call.resolve();
        } catch (SecureSecretStore.SecretStoreException error) {
            reject(call, error);
        }
    }

    private void reject(PluginCall call, SecureSecretStore.SecretStoreException error) {
        String message = "SECRET_REENTRY_REQUIRED".equals(error.code)
            ? "Stored credential cannot be decrypted"
            : "Secure credential operation failed";
        call.reject(message, error.code);
    }
}
