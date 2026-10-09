export interface InvestmentListing {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  unitPrice: number;
  dailyChangePct: number;
  description: string;
}

export const INVESTMENTS: InvestmentListing[] = [
  { id: "river-energy", name: "Riverlight Energy Co-op", ticker: "RLE", sector: "Clean energy", unitPrice: 2_500, dailyChangePct: 2.4, description: "A fictional community solar project." },
  { id: "market-foods", name: "Market Basket Foods", ticker: "MBF", sector: "Food & retail", unitPrice: 1_800, dailyChangePct: 1.1, description: "A made-up neighbourhood food distributor." },
  { id: "creek-transit", name: "Creekline Transit", ticker: "CLT", sector: "Transport", unitPrice: 3_200, dailyChangePct: -0.6, description: "A fictional electric minibus cooperative." },
];

export class InvestmentSystem {
  units: Record<string, number>;

  constructor(saved: Record<string, number> = {}) {
    this.units = { ...saved };
  }

  buy(investmentId: string, balance: number) {
    const listing = INVESTMENTS.find((item) => item.id === investmentId);
    if (!listing) return { ok: false, cost: 0, message: "That opportunity is not available." };
    if (balance < listing.unitPrice) return { ok: false, cost: 0, message: "Not enough Naira for one unit." };
    this.units[listing.id] = (this.units[listing.id] ?? 0) + 1;
    return { ok: true, cost: listing.unitPrice, message: `1 ${listing.ticker} unit added to your portfolio.` };
  }

  sell(investmentId: string) {
    const listing = INVESTMENTS.find((item) => item.id === investmentId);
    if (!listing || (this.units[investmentId] ?? 0) < 1) return { ok: false, credit: 0, message: "You do not own a unit of that investment." };
    this.units[investmentId] -= 1;
    if (this.units[investmentId] <= 0) delete this.units[investmentId];
    return { ok: true, credit: listing.unitPrice, message: `1 ${listing.ticker} unit sold at the demo price.` };
  }

  getNetWorth() {
    return INVESTMENTS.reduce((sum, listing) => sum + listing.unitPrice * (this.units[listing.id] ?? 0), 0);
  }
}
