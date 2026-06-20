package app.ironlog.local;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.io.IOException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import okhttp3.Headers;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

@CapacitorPlugin(name = "WebDavHttp")
public class WebDavHttpPlugin extends Plugin {
    private static final Set<String> ALLOWED_METHODS = new HashSet<>(Arrays.asList(
        "DELETE", "GET", "MKCOL", "MOVE", "PROPFIND", "PUT"
    ));

    private final OkHttpClient client = new OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build();

    @PluginMethod
    public void request(PluginCall call) {
        final String method = call.getString("method", "").toUpperCase(Locale.ROOT);
        final String url = call.getString("url");
        final JSObject headerObject = call.getObject("headers", new JSObject());
        final String body = call.getString("body");

        if (!ALLOWED_METHODS.contains(method)) {
            call.reject("Unsupported WebDAV method", "UNSUPPORTED_METHOD");
            return;
        }
        if (url == null || url.isEmpty()) {
            call.reject("WebDAV URL is required", "INVALID_URL");
            return;
        }
        if ("PUT".equals(method) && body == null) {
            call.reject("PUT requires a request body", "INVALID_REQUEST");
            return;
        }

        final Request request;
        try {
            request = buildRequest(method, url, headerObject, body);
        } catch (IllegalArgumentException | JSONException error) {
            call.reject("Invalid WebDAV request", "INVALID_REQUEST", error);
            return;
        }

        execute(() -> {
            try (Response response = client.newCall(request).execute()) {
                JSObject result = new JSObject();
                result.put("status", response.code());
                result.put("body", response.body() == null ? "" : response.body().string());
                result.put("headers", responseHeaders(response.headers()));
                call.resolve(result);
            } catch (IOException error) {
                call.reject("WebDAV network request failed", "NETWORK_ERROR", error);
            }
        });
    }

    private Request buildRequest(String method, String url, JSObject headerObject, String body) throws JSONException {
        Headers.Builder headers = new Headers.Builder();
        Iterator<String> keys = headerObject.keys();
        String contentType = null;
        while (keys.hasNext()) {
            String key = keys.next();
            String value = headerObject.getString(key);
            headers.add(key, value);
            if ("content-type".equalsIgnoreCase(key)) {
                contentType = value;
            }
        }

        RequestBody requestBody = body == null
            ? null
            : RequestBody.create(body, MediaType.parse(contentType == null ? "application/octet-stream" : contentType));
        return new Request.Builder()
            .url(url)
            .headers(headers.build())
            .method(method, requestBody)
            .build();
    }

    private JSObject responseHeaders(Headers headers) {
        JSObject result = new JSObject();
        for (String name : headers.names()) {
            result.put(name.toLowerCase(Locale.ROOT), headers.get(name));
        }
        return result;
    }
}
