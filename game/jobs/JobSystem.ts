import type { JobId, SavedJob } from "@/game/types";

export interface JobDefinition {
  id: JobId;
  title: string;
  description: string;
  workplace: string;
  workplacePoint: { x: number; y: number };
  objective: string;
  target: { x: number; y: number } | null;
  reward: number;
  durationMs?: number;
}

export interface JobCompletion {
  reward: number;
  message: string;
}

export const JOB_DEFINITIONS: JobDefinition[] = [
  {
    id: "delivery",
    title: "Delivery Worker",
    description: "Collect a parcel from the courier depot and drop it at Uju's Corner Shop.",
    workplace: "Axlori Couriers · South Market Road",
    workplacePoint: { x: 1_030, y: 1_489 },
    objective: "Drop a parcel at Uju's Corner Shop",
    target: { x: 1_365, y: 1_489 },
    reward: 1_400,
  },
  {
    id: "shop",
    title: "Shop Worker",
    description: "Help the stallholders at Alao Market for a short local shift.",
    workplace: "Alao Market · Creekline Avenue",
    workplacePoint: { x: 575, y: 819 },
    objective: "Finish a 20-second market shift",
    target: null,
    reward: 1_750,
    durationMs: 20_000,
  },
  {
    id: "taxi",
    title: "Taxi Driver",
    description: "Pick up a passenger at the Riverside Taxi Rank and take them to the bank.",
    workplace: "Riverside Taxi Rank · Palm Street",
    workplacePoint: { x: 665, y: 1_485 },
    objective: "Take your passenger to Ogbonna Community Bank",
    target: { x: 1_060, y: 819 },
    reward: 2_500,
  },
];

const DEFINITION_BY_ID = Object.fromEntries(JOB_DEFINITIONS.map((definition) => [definition.id, definition])) as Record<JobId, JobDefinition>;

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class JobSystem {
  active: SavedJob | null;

  constructor(saved: SavedJob | null = null) {
    this.active = saved ? { ...saved } : null;
  }

  definition(id = this.active?.id): JobDefinition | null {
    return id ? DEFINITION_BY_ID[id] ?? null : null;
  }

  start(id: JobId): { ok: boolean; message: string } {
    if (this.active) return { ok: false, message: "Finish or leave your current shift before taking another." };
    const definition = DEFINITION_BY_ID[id];
    this.active = { id, ...(id === "shop" ? { remainingMs: definition.durationMs } : {}) };
    return { ok: true, message: `${definition.title} accepted. Your objective is ready.` };
  }

  abandon() {
    if (!this.active) return { ok: false, message: "You do not have an active job." };
    const title = DEFINITION_BY_ID[this.active.id].title;
    this.active = null;
    return { ok: true, message: `${title} shift left. No reward was earned.` };
  }

  update(deltaMs: number, player: { x: number; y: number }): JobCompletion | null {
    if (!this.active) return null;
    const definition = DEFINITION_BY_ID[this.active.id];
    if (this.active.id === "shop") {
      const remaining = this.active.remainingMs ?? definition.durationMs ?? 20_000;
      if (distance(player, definition.workplacePoint) > 145) return null;
      this.active.remainingMs = Math.max(0, remaining - deltaMs);
      if (this.active.remainingMs <= 0) return this.complete(definition);
      return null;
    }
    if (definition.target && distance(player, definition.target) < 58) return this.complete(definition);
    return null;
  }

  private complete(definition: JobDefinition): JobCompletion {
    this.active = null;
    return {
      reward: definition.reward,
      message: `${definition.title} complete · +₦${definition.reward.toLocaleString("en-NG")}`,
    };
  }

  getHud(player?: { x: number; y: number }) {
    if (!this.active) return { title: "No active job", detail: "Find a workplace or check your phone for a paid shift.", progress: null, target: null };
    const definition = DEFINITION_BY_ID[this.active.id];
    const target = definition.target;
    let detail = definition.objective;
    let progress: number | null = null;
    if (this.active.id === "shop") {
      const total = definition.durationMs ?? 20_000;
      const remaining = Math.max(0, this.active.remainingMs ?? total);
      const atWorkplace = player ? distance(player, definition.workplacePoint) <= 145 : true;
      detail = atWorkplace
        ? `${Math.ceil(remaining / 1_000)}s left · helping at Alao Market`
        : "Head to Alao Market to begin your shift";
      progress = Math.round(((total - remaining) / total) * 100);
    }
    return { title: definition.title, detail, progress, target };
  }
}
