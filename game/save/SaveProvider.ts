import type { SaveData } from "@/game/types";

/** Storage seam: replace this adapter with a remote implementation when accounts are added. */
export interface SaveProvider {
  load(): SaveData | null;
  save(data: SaveData): boolean;
}
