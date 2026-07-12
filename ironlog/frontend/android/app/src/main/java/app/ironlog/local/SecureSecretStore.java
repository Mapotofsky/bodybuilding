package app.ironlog.local;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import org.json.JSONException;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.MessageDigest;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class SecureSecretStore {
    static final String KEY_ALIAS = "ironlog.webdav.secret.v1";
    static final String PREFERENCES_NAME = "ironlog.secure-secrets";
    private static final int FORMAT_VERSION = 1;
    private static final int GCM_TAG_BITS = 128;
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";

    private final SharedPreferences preferences;

    SecureSecretStore(Context context) {
        preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
    }

    String read(String ref) throws SecretStoreException {
        String record = preferences.getString(storageKey(ref), null);
        if (record == null) return null;

        try {
            JSONObject json = new JSONObject(record);
            if (json.getInt("version") != FORMAT_VERSION) throw new JSONException("Unsupported format");
            byte[] iv = Base64.decode(json.getString("iv"), Base64.NO_WRAP);
            byte[] ciphertext = Base64.decode(json.getString("ciphertext"), Base64.NO_WRAP);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(GCM_TAG_BITS, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | JSONException | IllegalArgumentException error) {
            throw SecretStoreException.reentryRequired();
        }
    }

    void write(String ref, String value) throws SecretStoreException {
        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
            byte[] ciphertext = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            JSONObject record = new JSONObject();
            record.put("version", FORMAT_VERSION);
            record.put("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP));
            record.put("ciphertext", Base64.encodeToString(ciphertext, Base64.NO_WRAP));
            if (!preferences.edit().putString(storageKey(ref), record.toString()).commit()) {
                throw SecretStoreException.storageFailure();
            }
        } catch (GeneralSecurityException | JSONException error) {
            throw SecretStoreException.storageFailure();
        }
    }

    void remove(String ref) throws SecretStoreException {
        if (!preferences.edit().remove(storageKey(ref)).commit()) {
            throw SecretStoreException.storageFailure();
        }
    }

    static String storageKey(String ref) throws SecretStoreException {
        if (ref == null || ref.isEmpty()) throw SecretStoreException.invalidReference();
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(ref.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte value : digest) hex.append(String.format("%02x", value & 0xff));
            return "secret." + hex;
        } catch (GeneralSecurityException error) {
            throw SecretStoreException.storageFailure();
        }
    }

    private SecretKey getOrCreateKey() throws GeneralSecurityException {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        try {
            keyStore.load(null);
        } catch (IOException error) {
            throw new KeyStoreException(error);
        }
        SecretKey existing = (SecretKey) keyStore.getKey(KEY_ALIAS, null);
        if (existing != null) return existing;

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
        generator.init(new KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setRandomizedEncryptionRequired(true)
            .build());
        return generator.generateKey();
    }

    static final class SecretStoreException extends Exception {
        final String code;

        private SecretStoreException(String code) {
            this.code = code;
        }

        static SecretStoreException reentryRequired() {
            return new SecretStoreException("SECRET_REENTRY_REQUIRED");
        }

        static SecretStoreException storageFailure() {
            return new SecretStoreException("SECRET_STORE_ERROR");
        }

        static SecretStoreException invalidReference() {
            return new SecretStoreException("INVALID_SECRET_REF");
        }
    }
}
