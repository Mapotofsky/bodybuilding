import type { SettingsDoc, WeightUnit } from "@/core/models";
import { localRepository } from "@/repositories/localJsonRepository";

export interface Settings {
  weight_unit: WeightUnit;
  theme_id: string;
  last_sync_at: string | null;
}

export async function getSettings(): Promise<Settings> {
  return toSettings(await localRepository.getSettings());
}

export async function updateSettings(body: { weight_unit?: WeightUnit; theme_id?: string }): Promise<Settings> {
  return toSettings(await localRepository.updateSettings({
    weightUnit: body.weight_unit,
    themeId: body.theme_id,
  }));
}

function toSettings(doc: SettingsDoc): Settings {
  return {
    weight_unit: doc.weightUnit,
    theme_id: doc.themeId,
    last_sync_at: doc.lastSyncAt,
  };
}
