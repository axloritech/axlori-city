import type { SaveData } from "@/game/types";
import type { SaveProvider } from "@/game/save/SaveProvider";

const SAVE_KEY = "axlori-city-save-v1";

function isSaveData(value: unknown): value is SaveData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SaveData>;
  return (
    candidate.version === 1 &&
    typeof candidate.playerName === "string" &&
    typeof candidate.money === "number" &&
    !!candidate.player &&
    typeof candidate.player.x === "number" &&
    typeof candidate.player.y === "number" &&
    !!candidate.inventory &&
    typeof candidate.inventory === "object"
  );
}

export const localSaveProvider: SaveProvider = {
  load() {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return isSaveData(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  save(data) {
    if (typeof window === "undefined") return false;
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },
};
