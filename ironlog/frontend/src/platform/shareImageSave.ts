import { Capacitor, registerPlugin } from "@capacitor/core";

interface ImageSaverPlugin {
  savePng(options: { dataUrl: string; fileName: string }): Promise<{ uri: string }>;
}

const ImageSaver = registerPlugin<ImageSaverPlugin>("ImageSaver");

export async function savePngImage(dataUrl: string, fileName: string): Promise<{ destination: "gallery" | "download"; uri: string | null }> {
  if (Capacitor.getPlatform() === "android") {
    const result = await ImageSaver.savePng({ dataUrl, fileName });
    return { destination: "gallery", uri: result.uri };
  }

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  return { destination: "download", uri: null };
}
