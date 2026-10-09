import type { FurniturePlacement } from "@/game/types";

export interface FurnitureDefinition {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  color: number;
  width: number;
  height: number;
}

export const FURNITURE_CATALOG: FurnitureDefinition[] = [
  { id: "bed", name: "Restful Bed", description: "A soft place to take a 15-second nap.", price: 2_800, icon: "▰", color: 0x557f7a, width: 68, height: 42 },
  { id: "chair", name: "Market Chair", description: "A sturdy woven seat.", price: 850, icon: "⌑", color: 0xb77c4c, width: 34, height: 34 },
  { id: "table", name: "Low Table", description: "A small hardwood centre table.", price: 1_500, icon: "▱", color: 0x8e633c, width: 52, height: 38 },
  { id: "sofa", name: "Palm Sofa", description: "A two-seat sofa in river-green fabric.", price: 4_200, icon: "▰", color: 0x47756a, width: 78, height: 42 },
  { id: "tv", name: "Mini Television", description: "A little screen for the living room.", price: 7_000, icon: "▣", color: 0x383e40, width: 46, height: 30 },
  { id: "refrigerator", name: "Cool Box Fridge", description: "Keep your drinks chilled.", price: 6_500, icon: "▯", color: 0x99b5b0, width: 34, height: 54 },
  { id: "air-conditioner", name: "Wall Air Unit", description: "A compact wall-mounted cooler.", price: 9_000, icon: "▤", color: 0xd8ddd0, width: 46, height: 22 },
  { id: "plant", name: "Potted Palm", description: "A touch of green for the corner.", price: 650, icon: "♧", color: 0x668d55, width: 30, height: 34 },
  { id: "wall-art", name: "Market Day Print", description: "A bright framed city illustration.", price: 700, icon: "▧", color: 0xd7864d, width: 34, height: 30 },
];

const STARTER_FURNITURE: FurniturePlacement[] = [
  { instanceId: "starter-bed", itemId: "bed", x: 545, y: 185, rotation: 0 },
  { instanceId: "starter-sofa", itemId: "sofa", x: 225, y: 365, rotation: 0 },
  { instanceId: "starter-table", itemId: "table", x: 365, y: 338, rotation: 0 },
  { instanceId: "starter-chair", itemId: "chair", x: 435, y: 337, rotation: 0 },
];

export class FurnitureSystem {
  owned: Record<string, number>;
  placed: FurniturePlacement[];
  placementMode = false;
  selectedFurnitureId: string | null = null;
  private pendingItemId: string | null = null;
  private nextInstance = 1;

  constructor(owned: Record<string, number> = {}, placed?: FurniturePlacement[]) {
    this.owned = { ...owned };
    this.placed = placed ? placed.map((item) => ({ ...item })) : STARTER_FURNITURE.map((item) => ({ ...item }));
    this.placed.forEach((item) => {
      const parsed = Number(item.instanceId.match(/(\d+)$/)?.[1] ?? 0);
      this.nextInstance = Math.max(this.nextInstance, parsed + 1);
    });
  }

  buy(itemId: string, balance: number) {
    const item = FURNITURE_CATALOG.find((entry) => entry.id === itemId);
    if (!item) return { ok: false, cost: 0, message: "That furniture item is not in stock." };
    if (balance < item.price) return { ok: false, cost: 0, message: "Not enough Naira for this furniture." };
    this.owned[item.id] = (this.owned[item.id] ?? 0) + 1;
    this.pendingItemId = item.id;
    this.placementMode = true;
    this.selectedFurnitureId = null;
    return { ok: true, cost: item.price, message: `${item.name} bought. Tap a spot in your home to place it.` };
  }

  beginPlace(itemId: string) {
    if ((this.owned[itemId] ?? 0) < 1) return false;
    this.pendingItemId = itemId;
    this.selectedFurnitureId = null;
    this.placementMode = true;
    return true;
  }

  beginMove(instanceId: string) {
    if (!this.placed.some((item) => item.instanceId === instanceId)) return false;
    this.pendingItemId = null;
    this.selectedFurnitureId = instanceId;
    this.placementMode = true;
    return true;
  }

  placeAt(x: number, y: number) {
    if (!this.placementMode) return null;
    const safeX = Math.max(60, Math.min(660, Math.round(x / 8) * 8));
    const safeY = Math.max(80, Math.min(425, Math.round(y / 8) * 8));
    let result: FurniturePlacement | null = null;
    if (this.pendingItemId) {
      const itemId = this.pendingItemId;
      if ((this.owned[itemId] ?? 0) < 1) return null;
      this.owned[itemId] -= 1;
      if (this.owned[itemId] <= 0) delete this.owned[itemId];
      result = { instanceId: `furniture-${this.nextInstance++}`, itemId, x: safeX, y: safeY, rotation: 0 };
      this.placed.push(result);
    } else if (this.selectedFurnitureId) {
      const item = this.placed.find((entry) => entry.instanceId === this.selectedFurnitureId);
      if (item) {
        item.x = safeX;
        item.y = safeY;
        result = item;
      }
    }
    this.placementMode = false;
    this.pendingItemId = null;
    this.selectedFurnitureId = null;
    return result;
  }

  rotateSelected() {
    const item = this.placed.find((entry) => entry.instanceId === this.selectedFurnitureId);
    if (!item) return false;
    item.rotation = (item.rotation + 90) % 360;
    return true;
  }

  removeSelected() {
    const index = this.placed.findIndex((entry) => entry.instanceId === this.selectedFurnitureId);
    if (index < 0) return false;
    const [item] = this.placed.splice(index, 1);
    this.owned[item.itemId] = (this.owned[item.itemId] ?? 0) + 1;
    this.placementMode = false;
    this.selectedFurnitureId = null;
    this.pendingItemId = null;
    return true;
  }

  cancelPlacement() {
    this.placementMode = false;
    this.selectedFurnitureId = null;
    this.pendingItemId = null;
  }

  nearestBed(position: { x: number; y: number }): FurniturePlacement | null {
    let nearest: FurniturePlacement | null = null;
    let nearestDistance = Infinity;
    for (const item of this.placed) {
      if (item.itemId !== "bed") continue;
      const distance = Math.hypot(position.x - item.x, position.y - item.y);
      if (distance < nearestDistance) {
        nearest = item;
        nearestDistance = distance;
      }
    }
    return nearestDistance < 78 ? nearest : null;
  }

  getValue() {
    return this.placed.reduce((sum, placement) => {
      const definition = FURNITURE_CATALOG.find((item) => item.id === placement.itemId);
      return sum + (definition?.price ?? 0);
    }, 0);
  }
}
