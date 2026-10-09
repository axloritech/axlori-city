import type { CompanyRecord } from "@/game/types";

export interface CompanyListing extends CompanyRecord {
  price: number;
  description: string;
}

export const COMPANY_REGISTRATION_COST = 100_000;

export const COMPANIES_FOR_SALE: CompanyListing[] = [
  {
    id: "sale-axlori-cafe",
    name: "Axlori Cafe",
    businessType: "Restaurant",
    location: "Alao Market, Axlori City",
    owner: "Demo marketplace",
    value: 500_000,
    price: 500_000,
    incomePerDay: 5_600,
    description: "A busy neighbourhood cafe with a shaded patio.",
  },
  {
    id: "sale-city-delivery",
    name: "City Delivery",
    businessType: "Logistics",
    location: "Nembe Market Road, Axlori City",
    owner: "Demo marketplace",
    value: 750_000,
    price: 750_000,
    incomePerDay: 8_250,
    description: "A three-rider parcel service with a loyal local route.",
  },
  {
    id: "sale-portside-motors",
    name: "Portside Motors",
    businessType: "Automotive",
    location: "Koru Motor Works, Axlori City",
    owner: "Demo marketplace",
    value: 2_000_000,
    price: 2_000_000,
    incomePerDay: 17_500,
    description: "A fictional used-car lot and small repair shop.",
  },
];

export const BUSINESS_TYPES = ["Restaurant", "Retail", "Logistics", "Transport", "Fashion", "Technology"];
export const COMPANY_LOCATIONS = ["Port Harcourt", "Alao Market, Axlori City", "Riverside, Axlori City", "Nembe Market Road, Axlori City"];

export class CompanySystem {
  owned: CompanyRecord[];

  constructor(saved: CompanyRecord[] = []) {
    this.owned = saved.map((company) => ({ ...company }));
  }

  create(name: string, businessType: string, location: string, owner: string, balance: number) {
    const cleanName = name.trim().replace(/\s+/g, " ").slice(0, 36);
    if (cleanName.length < 3) return { ok: false, cost: 0, message: "Company name must be at least 3 characters." };
    if (!businessType || !location) return { ok: false, cost: 0, message: "Choose a business type and location." };
    if (this.owned.some((company) => company.name.toLowerCase() === cleanName.toLowerCase())) {
      return { ok: false, cost: 0, message: "You already own a company with that name." };
    }
    if (balance < COMPANY_REGISTRATION_COST) {
      return { ok: false, cost: 0, message: "You need ₦100,000 in cash to register a company." };
    }
    const id = `company-${Date.now().toString(36)}-${Math.floor(Math.random() * 10_000).toString(36)}`;
    this.owned.push({
      id,
      name: cleanName,
      businessType,
      location,
      owner,
      value: COMPANY_REGISTRATION_COST,
      incomePerDay: 1_250,
    });
    return { ok: true, cost: COMPANY_REGISTRATION_COST, message: `${cleanName} created successfully.` };
  }

  purchase(companyId: string, balance: number, owner = "Kamsi Okoro") {
    const listing = COMPANIES_FOR_SALE.find((company) => company.id === companyId);
    if (!listing) return { ok: false, cost: 0, message: "That company is no longer listed." };
    if (this.owned.some((company) => company.id === companyId)) return { ok: false, cost: 0, message: "You already own this company." };
    if (balance < listing.price) return { ok: false, cost: 0, message: "Not enough Naira to purchase this company." };
    const { price: _price, description: _description, ...record } = listing;
    this.owned.push({ ...record, owner });
    return { ok: true, cost: listing.price, message: `${listing.name} is now part of your portfolio.` };
  }

  getNetWorth() {
    return this.owned.reduce((sum, company) => sum + company.value, 0);
  }

  getOwnedIds() {
    return this.owned.map((company) => company.id);
  }
}
