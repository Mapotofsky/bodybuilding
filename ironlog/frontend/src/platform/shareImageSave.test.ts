import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("uses the Android media-library plugin instead of the ineffective anchor download", async () => {
    mocks.getPlatform.mockReturnValue("android");
    mocks.savePng.mockResolvedValue({ uri: "content://media/image/1" });

    await expect(savePngImage("data:image/png;base64,AA==", "ironlog.png")).resolves.toEqual({
      destination: "gallery",
      uri: "content://media/image/1",
    });
    expect(mocks.savePng).toHaveBeenCalledWith({ dataUrl: "data:image/png;base64,AA==", fileName: "ironlog.png" });
  });
});
