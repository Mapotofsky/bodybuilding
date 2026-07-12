package app.ironlog.local;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import android.content.Context;

import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.security.KeyStore;

@RunWith(AndroidJUnit4.class)
public class SecureSecretStoreInstrumentedTest {
    private static final String REF = "instrumentation-webdav-ref";
    private Context context;
    private SecureSecretStore store;

    @Before
    public void setUp() throws Exception {
        context = ApplicationProvider.getApplicationContext();
        context.getSharedPreferences(SecureSecretStore.PREFERENCES_NAME, Context.MODE_PRIVATE).edit().clear().commit();
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        keyStore.deleteEntry(SecureSecretStore.KEY_ALIAS);
        store = new SecureSecretStore(context);
    }

    @Test
    public void writesReadsOverwritesAndRemovesWithoutPlaintextStorage() throws Exception {
        store.write(REF, "first-value");
        String firstRecord = storedRecord();
        assertEquals("first-value", store.read(REF));
        assertFalse(firstRecord.contains("first-value"));

        store.write(REF, "first-value");
        String secondRecord = storedRecord();
        assertEquals("first-value", store.read(REF));
        assertNotEquals(firstRecord, secondRecord);

        store.write(REF, "second-value");
        assertEquals("second-value", store.read(REF));
        store.remove(REF);
        store.remove(REF);
        assertNull(store.read(REF));
    }

    @Test
    public void damagedCiphertextRequiresReentryAndCanBeOverwritten() throws Exception {
        store.write(REF, "recoverable-value");
        context.getSharedPreferences(SecureSecretStore.PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit().putString(SecureSecretStore.storageKey(REF), "damaged").commit();

        assertReentryRequired();
        store.write(REF, "replacement-value");
        assertEquals("replacement-value", store.read(REF));
    }

    @Test
    public void missingKeystoreKeyRequiresReentryAndCanBeOverwritten() throws Exception {
        store.write(REF, "recoverable-value");
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        keyStore.deleteEntry(SecureSecretStore.KEY_ALIAS);

        assertReentryRequired();
        store.write(REF, "replacement-value");
        assertEquals("replacement-value", store.read(REF));
    }

    private String storedRecord() throws Exception {
        String value = context.getSharedPreferences(SecureSecretStore.PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getString(SecureSecretStore.storageKey(REF), null);
        assertTrue(value != null && value.contains("\"version\":1"));
        return value;
    }

    private void assertReentryRequired() throws Exception {
        try {
            store.read(REF);
            fail("Expected reentry-required failure");
        } catch (SecureSecretStore.SecretStoreException error) {
            assertEquals("SECRET_REENTRY_REQUIRED", error.code);
        }
    }
}
