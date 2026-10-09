export interface PropertyDefinition {
  id: string;
  name: string;
  location: string;
  price: number;
  value: number;
  description: string;
  landmarkId: string;
}

export const STARTER_PROPERTY = {
  id: "amara-court-flat",
  name: "Amara Court · Flat 2B",
  location: "Umu Ila Way, Axlori City",
  value: 6_500_000,
  description: "Your furnished starter apartment.",
};

export const PROPERTIES_FOR_SALE: PropertyDefinition[] = [
  {
    id: "oruama-homes",
    landmarkId: "oruama-homes",
    name: "Oruama Homes · Unit 3",
    location: "North Grove, Axlori City",
    price: 8_500,
    value: 185_000,
    description: "A compact painted home with room for your own furniture. Demo starter price.",
  },
  {
    id: "koru-suites",
    landmarkId: "koru-suites",
    name: "Koru Courtyard House",
    location: "Creekline Avenue, Axlori City",
    price: 250_000,
    value: 4_800_000,
    description: "A quiet courtyard home with a shaded front step.",
  },
];

export class PropertySystem {
  private owned = new Set<string>();
  readonly ownsStarterHome: boolean;

  constructor(ownedIds: string[] = [], ownsStarterHome = true) {
    this.owned = new Set(ownedIds);
    this.ownsStarterHome = ownsStarterHome;
  }

  getForSale(propertyId: string) {
    return PROPERTIES_FOR_SALE.find((property) => property.id === propertyId) ?? null;
  }

  owns(propertyId: string) {
    return this.owned.has(propertyId) || (propertyId === STARTER_PROPERTY.id && this.ownsStarterHome);
  }

  purchase(propertyId: string, availableMoney: number) {
    const property = this.getForSale(propertyId);
    if (!property) return { ok: false, cost: 0, message: "That property is no longer listed." };
    if (this.owned.has(propertyId)) return { ok: false, cost: 0, message: "You already own this property." };
    if (availableMoney < property.price) return { ok: false, cost: 0, message: "Not enough Naira to buy this home yet." };
    this.owned.add(propertyId);
    return { ok: true, cost: property.price, message: `${property.name} is now owned by you.` };
  }

  getOwnedIds() {
    return [...this.owned];
  }

  getOwnedProperties() {
    const owned = PROPERTIES_FOR_SALE.filter((property) => this.owned.has(property.id));
    return this.ownsStarterHome ? [STARTER_PROPERTY, ...owned] : owned;
  }

  getNetWorth() {
    return this.getOwnedProperties().reduce((total, property) => total + property.value, 0);
  }
}
