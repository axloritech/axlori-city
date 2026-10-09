import { LANDMARKS, WORLD_HEIGHT, WORLD_WIDTH, type Landmark } from "@/game/world/landmarks";

/** The original map data is retained as the simulation coordinate space; this converts it to metres for the 3D scene. */
export const MAP_TO_METERS = 0.045;
export const CITY_WIDTH_METERS = WORLD_WIDTH * MAP_TO_METERS;
export const CITY_DEPTH_METERS = WORLD_HEIGHT * MAP_TO_METERS;

export interface BuildingSpec {
  landmark: Landmark;
  width: number;
  depth: number;
  height: number;
  wall: string;
  roof: string;
  trim: string;
  accent: string;
  floors: number;
}

const STYLES: Record<Landmark["style"], Omit<BuildingSpec, "landmark">> = {
  home: { width: 6.1, depth: 5.2, height: 3.3, wall: "#c9aa83", roof: "#42474c", trim: "#292e34", accent: "#df8748", floors: 1 },
  apartment: { width: 8.1, depth: 6.3, height: 6.5, wall: "#bca17b", roof: "#394047", trim: "#272e34", accent: "#d99053", floors: 2 },
  shop: { width: 6.3, depth: 5.1, height: 3.7, wall: "#d0b78e", roof: "#383f46", trim: "#2b3137", accent: "#e4853f", floors: 1 },
  restaurant: { width: 6.2, depth: 5.4, height: 3.8, wall: "#c9a98a", roof: "#3d4248", trim: "#2a3036", accent: "#c96b50", floors: 1 },
  bank: { width: 7.8, depth: 6.1, height: 4.5, wall: "#c2b8a0", roof: "#454a50", trim: "#2d3339", accent: "#d89b55", floors: 1 },
  police: { width: 6.4, depth: 5.7, height: 3.8, wall: "#bdc2bc", roof: "#49545a", trim: "#2b3138", accent: "#d68947", floors: 1 },
  office: { width: 7.8, depth: 6.5, height: 8.8, wall: "#9ea9a5", roof: "#3b4248", trim: "#272e34", accent: "#e19650", floors: 3 },
  fuel: { width: 7.6, depth: 5.6, height: 4.0, wall: "#c2bda2", roof: "#4a5053", trim: "#30373c", accent: "#f29a38", floors: 1 },
  depot: { width: 7.3, depth: 5.6, height: 3.8, wall: "#c4aa7f", roof: "#41464b", trim: "#292f34", accent: "#e48642", floors: 1 },
};

export const BUILDING_SPECS: BuildingSpec[] = LANDMARKS.map((landmark) => ({ landmark, ...STYLES[landmark.style] }));

export interface CollisionRect {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const TREE_MAP_POSITIONS: Array<[number, number, number]> = [
  [142, 1_365, 1], [208, 1_335, 0], [350, 1_355, 1], [430, 1_510, 0], [160, 1_550, 1], [355, 1_570, 0],
  [170, 640, 0], [430, 640, 1], [1_500, 640, 0], [2_300, 640, 1], [920, 1_030, 1], [1_830, 1_035, 0], [930, 1_560, 0], [2_280, 1_520, 1],
  [95, 310, 0], [715, 345, 1], [920, 340, 0], [1_520, 370, 1], [2_270, 355, 0], [90, 935, 1], [2_270, 960, 0], [930, 1_245, 1], [1_510, 1_230, 0], [2_280, 1_250, 1],
];

export function mapToWorld(x: number, y: number): [number, number, number] {
  return [(x - WORLD_WIDTH / 2) * MAP_TO_METERS, 0, (y - WORLD_HEIGHT / 2) * MAP_TO_METERS];
}

export function worldToMap(x: number, z: number) {
  return { x: x / MAP_TO_METERS + WORLD_WIDTH / 2, y: z / MAP_TO_METERS + WORLD_HEIGHT / 2 };
}

export function interiorToWorld(x: number, y: number): [number, number, number] {
  return [(x - 360) * 0.01, 0, (y - 250) * 0.01];
}

export const CITY_COLLISION_RECTS: CollisionRect[] = [
  ...BUILDING_SPECS.filter(({ landmark }) => landmark.id !== "taxi-rank").map((spec) => ({
    id: `building:${spec.landmark.id}`,
    minX: spec.landmark.x - spec.width / MAP_TO_METERS / 2,
    maxX: spec.landmark.x + spec.width / MAP_TO_METERS / 2,
    minY: spec.landmark.y - spec.depth / MAP_TO_METERS / 2,
    maxY: spec.landmark.y + spec.depth / MAP_TO_METERS / 2,
  })),
  ...TREE_MAP_POSITIONS.map(([x, y], index) => ({
    id: `tree:${index}`,
    minX: x - 17,
    maxX: x + 17,
    minY: y - 17,
    maxY: y + 17,
  })),
  // Small market stalls and fuel islands have their own walk-around footprint.
  { id: "market-stall:1", minX: 375, maxX: 412, minY: 886, maxY: 916 },
  { id: "market-stall:2", minX: 440, maxX: 477, minY: 886, maxY: 916 },
  { id: "market-stall:3", minX: 505, maxX: 542, minY: 886, maxY: 916 },
  { id: "fuel-pump:1", minX: 238, maxX: 263, minY: 813, maxY: 840 },
  { id: "fuel-pump:2", minX: 307, maxX: 332, minY: 813, maxY: 840 },
];

export function hitsCityObstacle(x: number, y: number, radius: number) {
  if (x < radius || x > WORLD_WIDTH - radius || y < radius || y > WORLD_HEIGHT - radius) return true;
  return CITY_COLLISION_RECTS.some((rect) => {
    const closestX = Math.max(rect.minX, Math.min(x, rect.maxX));
    const closestY = Math.max(rect.minY, Math.min(y, rect.maxY));
    return (x - closestX) ** 2 + (y - closestY) ** 2 < radius ** 2;
  });
}
