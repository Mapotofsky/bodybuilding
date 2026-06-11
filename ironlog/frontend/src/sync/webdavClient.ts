export interface WebDavCredentials {
  url: string;
  username: string;
  password: string;
}

export interface WebDavResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
}

export class WebDavClient {
  constructor(private credentials: WebDavCredentials) {}

  async propfind(path = ""): Promise<WebDavResponse> {
    return this.request("PROPFIND", path, {
      headers: { Depth: "1" },
      body: '<?xml version="1.0"?><propfind xmlns="DAV:"><prop><resourcetype/><getetag/></prop></propfind>',
    });
  }

  async get(path: string): Promise<WebDavResponse> {
    return this.request("GET", path);
  }

  async put(path: string, body: string, etag?: string | null): Promise<WebDavResponse> {
    return this.request("PUT", path, {
      body,
      headers: etag ? { "If-Match": etag } : undefined,
    });
  }

  async move(from: string, to: string, overwrite = true): Promise<WebDavResponse> {
    const destination = joinUrl(this.credentials.url, to);
    return this.request("MOVE", from, {
      headers: {
        Destination: destination,
        Overwrite: overwrite ? "T" : "F",
      },
    });
  }

  async delete(path: string): Promise<WebDavResponse> {
    return this.request("DELETE", path);
  }

  async mkcol(path: string): Promise<void> {
    const res = await this.request("MKCOL", path);
    if (![201, 405].includes(res.status)) throw new Error(`MKCOL failed: ${res.status}`);
  }

  private async request(method: string, path: string, init?: { body?: string; headers?: Record<string, string> }): Promise<WebDavResponse> {
    const headers = {
      Authorization: `Basic ${btoa(`${this.credentials.username}:${this.credentials.password}`)}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    };
    const url = joinUrl(this.credentials.url, path);

    if (isNativeCapacitor()) {
      const { CapacitorHttp } = await import("@capacitor/core");
      const response = await CapacitorHttp.request({
        method,
        url,
        headers,
        data: init?.body,
        responseType: "text",
      });
      return {
        status: response.status,
        body: typeof response.data === "string" ? response.data : JSON.stringify(response.data ?? ""),
        headers: normalizeHeaders(response.headers || {}),
      };
    }

    const response = await fetch(url, { method, headers, body: init?.body });
    return {
      status: response.status,
      body: await response.text(),
      headers: normalizeHeaders(Object.fromEntries(response.headers.entries())),
    };
  }
}

function isNativeCapacitor(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
}

function joinUrl(base: string, path: string): string {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  return cleanPath ? `${cleanBase}/${cleanPath}` : cleanBase;
}

function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
}
