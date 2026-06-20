import { registerPlugin } from "@capacitor/core";

export interface NativeWebDavRequest {
  method: "DELETE" | "GET" | "MKCOL" | "MOVE" | "PROPFIND" | "PUT";
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface NativeWebDavResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
}

interface WebDavHttpPlugin {
  request(options: NativeWebDavRequest): Promise<NativeWebDavResponse>;
}

export const nativeWebDavHttp = registerPlugin<WebDavHttpPlugin>("WebDavHttp");
