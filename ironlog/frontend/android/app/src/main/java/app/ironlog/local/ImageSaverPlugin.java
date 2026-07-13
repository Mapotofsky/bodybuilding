package app.ironlog.local;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(
    name = "ImageSaver",
    permissions = @Permission(strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }, alias = "legacyStorage")
)
public class ImageSaverPlugin extends Plugin {
    private static final String DATA_URL_PREFIX = "data:image/png;base64,";

    @PluginMethod
    public void savePng(PluginCall call) {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P && getPermissionState("legacyStorage") != PermissionState.GRANTED) {
            requestPermissionForAlias("legacyStorage", call, "legacyStoragePermissionCallback");
            return;
        }
        save(call);
    }

    @PermissionCallback
    private void legacyStoragePermissionCallback(PluginCall call) {
        if (getPermissionState("legacyStorage") != PermissionState.GRANTED) {
            call.reject("需要存储权限才能保存图片");
            return;
        }
        save(call);
    }

    private void save(PluginCall call) {
        String dataUrl = call.getString("dataUrl");
        String fileName = safeFileName(call.getString("fileName"));
        if (dataUrl == null || !dataUrl.startsWith(DATA_URL_PREFIX)) {
            call.reject("图片数据无效");
            return;
        }

        final byte[] bytes;
        try {
            bytes = Base64.decode(dataUrl.substring(DATA_URL_PREFIX.length()), Base64.DEFAULT);
        } catch (IllegalArgumentException error) {
            call.reject("图片数据无法解析");
            return;
        }

        try {
            Uri uri = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                ? saveWithMediaStore(bytes, fileName)
                : saveLegacy(bytes, fileName);
            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("保存图片失败", error);
        }
    }

    private Uri saveWithMediaStore(byte[] bytes, String fileName) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
        values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/IronLog");
        values.put(MediaStore.Images.Media.IS_PENDING, 1);
        Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        if (uri == null) throw new IllegalStateException("无法创建媒体文件");
        try {
            try (OutputStream output = resolver.openOutputStream(uri, "w")) {
                if (output == null) throw new IllegalStateException("无法打开媒体文件");
                output.write(bytes);
            }
            ContentValues published = new ContentValues();
            published.put(MediaStore.Images.Media.IS_PENDING, 0);
            resolver.update(uri, published, null, null);
            return uri;
        } catch (Exception error) {
            resolver.delete(uri, null, null);
            throw error;
        }
    }

    @SuppressWarnings("deprecation")
    private Uri saveLegacy(byte[] bytes, String fileName) throws Exception {
        File directory = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "IronLog");
        if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("无法创建图片目录");
        File file = new File(directory, fileName);
        try (OutputStream output = new FileOutputStream(file)) {
            output.write(bytes);
        }
        MediaScannerConnection.scanFile(getContext(), new String[] { file.getAbsolutePath() }, new String[] { "image/png" }, null);
        return Uri.fromFile(file);
    }

    static String safeFileName(String value) {
        String candidate = value == null ? "ironlog-workout.png" : value.replaceAll("[^A-Za-z0-9._-]", "-");
        candidate = candidate.replaceFirst("^[.-]+", "");
        if (candidate.trim().isEmpty()) candidate = "ironlog-workout.png";
        return candidate.toLowerCase().endsWith(".png") ? candidate : candidate + ".png";
    }
}
