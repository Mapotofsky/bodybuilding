import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPlatform: vi.fn(),
  savePng: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: mocks.getPlatform },
  registerPlugin: vi.fn(() => ({ savePng: mocks.savePng })),
}));

import { savePngImage } from "./shareImageSave";

describe("share image saving", () => {
  beforeEach(() => {
    mocks.getPlatform.mockReset();
    mocks.savePng.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves Android images through the media library and reports the gallery destination", async () => {
    mocks.getPlatform.mockReturnValue("android");
    mocks.savePng.mockResolvedValue({ uri: "content://media/image/1" });

    await expect(savePngImage("data:image/png;base64,AA==", "ironlog.png")).resolves.toEqual({
      destination: "gallery",
      uri: "content://media/image/1",
    });
    expect(mocks.savePng).toHaveBeenCalledWith({ dataUrl: "data:image/png;base64,AA==", fileName: "ironlog.png" });
  });

  it("downloads images in the browser and reports the download destination", async () => {
    const link = { href: "", download: "", rel: "", click: vi.fn(), remove: vi.fn() };
    const appendChild = vi.fn();
    const createElement = vi.fn(() => link);
    vi.stubGlobal("document", { createElement, body: { appendChild } });
    mocks.getPlatform.mockReturnValue("web");

    await expect(savePngImage("data:image/png;base64,AA==", "ironlog.png")).resolves.toEqual({
      destination: "download",
      uri: null,
    });
    expect(createElement).toHaveBeenCalledWith("a");
    expect(link).toMatchObject({ href: "data:image/png;base64,AA==", download: "ironlog.png", rel: "noopener" });
    expect(appendChild).toHaveBeenCalledWith(link);
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).toHaveBeenCalledOnce();
  });
});
