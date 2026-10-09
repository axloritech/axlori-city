export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  effect?: "health";
  amount?: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: "zobo", name: "Chilled Zobo", description: "Hibiscus cooler for the long walk.", price: 250, emoji: "◉", effect: "health", amount: 18 },
  { id: "boli", name: "Boli & Groundnut", description: "A warm street-side snack.", price: 450, emoji: "◆", effect: "health", amount: 28 },
  { id: "transit-card", name: "Axlori Go Card", description: "A bright little transit pass.", price: 900, emoji: "▰" },
  { id: "raffia-cap", name: "Raffia Sun Cap", description: "Handwoven shade from the market.", price: 1_200, emoji: "⌂" },
];

export class InventorySystem {
  money: number;
  items: Record<string, number>;

  constructor(money = 10_000, items: Record<string, number> = {}) {
    this.money = Math.max(0, Math.floor(money));
    this.items = { ...items };
  }

  buy(itemId: string): { ok: boolean; message: string; cost: number; itemName: string } {
    const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
    if (!item) return { ok: false, message: "That item is not on today's stall.", cost: 0, itemName: "" };
    if (this.money < item.price) return { ok: false, message: "Not enough Naira for that one.", cost: 0, itemName: item.name };
    this.money -= item.price;
    this.items[item.id] = (this.items[item.id] ?? 0) + 1;
    return { ok: true, message: `${item.name} added to your bag.`, cost: item.price, itemName: item.name };
  }

  use(itemId: string): { ok: boolean; message: string; health: number } {
    const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
    if (!item || (this.items[itemId] ?? 0) < 1) {
      return { ok: false, message: "You don't have that item yet.", health: 0 };
    }
    this.items[itemId] -= 1;
    if (this.items[itemId] <= 0) delete this.items[itemId];
    if (item.effect === "health") {
      return { ok: true, message: `You enjoyed ${item.name}. Feeling fresher!`, health: item.amount ?? 0 };
    }
    return { ok: true, message: `You checked your ${item.name.toLowerCase()}.`, health: 0 };
  }
}
