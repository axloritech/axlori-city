export type JobId = "delivery" | "shop" | "taxi";
export type PanelName =
  | "menu"
  | "map"
  | "inventory"
  | "character"
  | "settings"
  | "shop"
  | "bank"
  | "phone"
  | "property"
  | "furniture"
  | "nap";
export type LandmarkKind = "house" | "shop" | "restaurant" | "bank" | "job" | "police" | "office" | "fuel" | "taxi";

export interface SavedJob {
  id: JobId;
  remainingMs?: number;
}

export interface SaveData {
  version: 1;
  playerName: string;
  player: { x: number; y: number };
  money: number;
  energy?: number;
  currentJob: SavedJob | null;
  inventory: Record<string, number>;
  ownsHouse: boolean;
  ownsVehicle: boolean;
  vehicle: { x: number; y: number };
  /** Kept for save compatibility; the live city clock now uses device local time. */
  dayMinute?: number;
  ownedProperties?: string[];
  furnitureOwned?: Record<string, number>;
  placedFurniture?: FurniturePlacement[];
  companies?: CompanyRecord[];
  investments?: Record<string, number>;
  demoGrantClaimed?: boolean;
  transactions?: TransactionRecord[];
}

export interface FurniturePlacement {
  instanceId: string;
  itemId: string;
  x: number;
  y: number;
  rotation: number;
}

export interface CompanyRecord {
  id: string;
  name: string;
  businessType: string;
  location: string;
  owner: string;
  value: number;
  incomePerDay: number;
}

export interface TransactionRecord {
  id: string;
  kind: "credit" | "debit";
  amount: number;
  label: string;
  at: string;
}

export interface GameUiState {
  ready: boolean;
  playerName: string;
  money: number;
  health: number;
  energy: number;
  job: string;
  jobDetail: string;
  jobProgress: number | null;
  time: string;
  timeOfDay: string;
  location: string;
  prompt: string;
  insideHouse: boolean;
  houseName: string;
  ownsHouse: boolean;
  ownsVehicle: boolean;
  driving: boolean;
  inventory: Record<string, number>;
  player: { x: number; y: number };
  jobTarget: { x: number; y: number } | null;
  panel: PanelName | null;
  toast: string;
  weather: "sunny" | "cloudy" | "rain";
  napRemainingMs: number | null;
  contextId: string | null;
  ownedPropertyIds: string[];
  furnitureOwned: Record<string, number>;
  placedFurniture: FurniturePlacement[];
  placementMode: boolean;
  selectedFurnitureId: string | null;
  companies: CompanyRecord[];
  investments: Record<string, number>;
  demoGrantClaimed: boolean;
  netWorth: number;
  transactions: TransactionRecord[];
}

export type GameCommand =
  | { type: "set-panel"; panel: PanelName | null }
  | { type: "interact" }
  | { type: "save" }
  | { type: "buy-item"; itemId: string }
  | { type: "use-item"; itemId: string }
  | { type: "start-job"; jobId: JobId }
  | { type: "abandon-job" }
  | { type: "buy-property"; propertyId: string }
  | { type: "enter-property"; propertyId: string }
  | { type: "buy-furniture"; itemId: string }
  | { type: "place-furniture"; itemId: string }
  | { type: "move-furniture"; instanceId: string }
  | { type: "rotate-furniture" }
  | { type: "remove-furniture" }
  | { type: "cancel-furniture" }
  | { type: "start-nap" }
  | { type: "create-company"; name: string; businessType: string; location: string }
  | { type: "buy-company"; companyId: string }
  | { type: "buy-investment"; investmentId: string }
  | { type: "sell-investment"; investmentId: string }
  | { type: "claim-demo-grant" }
  | { type: "camera-zoom"; zoom: number }
  | { type: "set-hints"; enabled: boolean };

export interface GameCommandApi {
  command: (command: GameCommand) => void;
  move: (x: number, y: number) => void;
}
