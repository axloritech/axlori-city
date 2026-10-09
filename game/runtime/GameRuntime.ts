import type { Object3D } from "three";
import { CompanySystem } from "@/game/companies/CompanySystem";
import { TransactionLog } from "@/game/economy/TransactionLog";
import { FurnitureSystem, FURNITURE_CATALOG } from "@/game/furniture/FurnitureSystem";
import { HouseSystem, STARTER_HOME_NAME } from "@/game/houses/HouseSystem";
import { NAP_DURATION_MS, NapSystem } from "@/game/houses/NapSystem";
import { InventorySystem } from "@/game/inventory/InventorySystem";
import { InvestmentSystem } from "@/game/investments/InvestmentSystem";
import { JobSystem } from "@/game/jobs/JobSystem";
import { PropertySystem, PROPERTIES_FOR_SALE } from "@/game/properties/PropertySystem";
import { localSaveProvider } from "@/game/save/localSaveProvider";
import { RealTimeSystem, type TimeSnapshot } from "@/game/time/RealTimeSystem";
import type { GameCommand, GameUiState, PanelName, SaveData } from "@/game/types";
import { WeatherSystem, WEATHER, type WeatherKind } from "@/game/weather/WeatherSystem";
import { CITY_COLLISION_RECTS, MAP_TO_METERS, hitsCityObstacle } from "@/game/world/CityLayout";
import { LANDMARKS, WORLD_HEIGHT, WORLD_WIDTH, type Landmark } from "@/game/world/landmarks";

const PLAYER_NAME = "Kamsi Okoro";
const STARTING_MONEY = 10_000;
const DEMO_GRANT = 2_000_000;
const CAR_VALUE = 1_800_000;
const PLAYER_RADIUS = 13;
const CAR_RADIUS = 31;

type Vec2 = { x: number; y: number };
type NpcData = { name: string; role: string; x: number; y: number; color: string; route: Vec2[]; waypoint: number; pause: number; heading: number };

const NPC_SEEDS: Array<Omit<NpcData, "waypoint" | "pause" | "heading">> = [
  { name: "Chika", role: "market seller", x: 470, y: 890, color: "#bf7048", route: [{ x: 470, y: 890 }, { x: 700, y: 890 }, { x: 700, y: 970 }, { x: 490, y: 970 }] },
  { name: "Femi", role: "bus conductor", x: 680, y: 610, color: "#4d7f91", route: [{ x: 680, y: 610 }, { x: 900, y: 610 }, { x: 920, y: 665 }, { x: 650, y: 665 }] },
  { name: "Nneka", role: "courier", x: 1_250, y: 970, color: "#bb8d44", route: [{ x: 1_250, y: 970 }, { x: 1_480, y: 970 }, { x: 1_480, y: 1_015 }, { x: 1_250, y: 1_015 }] },
  { name: "Tamuno", role: "neighbour", x: 1_810, y: 915, color: "#776384", route: [{ x: 1_810, y: 915 }, { x: 2_020, y: 915 }, { x: 2_020, y: 980 }, { x: 1_810, y: 980 }] },
  { name: "Kene", role: "taxi driver", x: 780, y: 1_450, color: "#4f8267", route: [{ x: 780, y: 1_450 }, { x: 880, y: 1_450 }, { x: 880, y: 1_530 }, { x: 780, y: 1_530 }] },
  { name: "Aunty Eno", role: "cook", x: 1_420, y: 940, color: "#b55f65", route: [{ x: 1_420, y: 940 }, { x: 1_530, y: 940 }, { x: 1_530, y: 1_020 }, { x: 1_420, y: 1_020 }] },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function moveTowards(value: number, target: number, amount: number) {
  return value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);
}

function angleTowards(current: number, target: number, amount: number) {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + difference * amount;
}

export class GameRuntime {
  readonly inventory: InventorySystem;
  readonly jobs: JobSystem;
  readonly house: HouseSystem;
  readonly properties: PropertySystem;
  readonly furniture: FurnitureSystem;
  readonly companies: CompanySystem;
  readonly investments: InvestmentSystem;
  readonly transactions: TransactionLog;
  readonly realTime = new RealTimeSystem();
  readonly weather = new WeatherSystem();
  readonly nap = new NapSystem();
  readonly npcs: NpcData[] = NPC_SEEDS.map((seed, index) => ({ ...seed, route: seed.route.map((point) => ({ ...point })), waypoint: 1, pause: 600 + index * 210, heading: 0 }));

  player: Vec2;
  playerYaw = 0;
  cameraYaw = 0;
  cameraPitch = 0.18;
  cameraDistance = 5.8;
  velocity = { x: 0, y: 0 };
  input = { x: 0, y: 0 };
  running = false;
  driving = false;
  car: { x: number; y: number; yaw: number; speed: number };
  driveAccelerate = false;
  driveBrake = false;
  interiorPosition: Vec2 = { x: 360, y: 420 };
  health = 100;
  energy = 68;
  panel: PanelName | null = null;
  contextId: string | null = null;
  toast = "Welcome to Axlori City · Your district is ready.";
  showHints = true;
  demoGrantClaimed = false;
  private lastClock: TimeSnapshot;
  private clockAccumulator = 0;
  private publishAccumulator = 0;
  private saveAccumulator = 0;
  private energyAccumulator = 0;
  private toastRemaining = 4_200;
  private listeners = new Set<(state: GameUiState) => void>();
  private collisionRects = CITY_COLLISION_RECTS;
  private cameraBlockerMap = new Map<string, Object3D>();

  constructor() {
    const saved = localSaveProvider.load();
    this.inventory = new InventorySystem(saved?.money ?? STARTING_MONEY, saved?.inventory ?? {});
    this.jobs = new JobSystem(saved?.currentJob ?? null);
    this.house = new HouseSystem(saved?.ownsHouse ?? true);
    this.properties = new PropertySystem(saved?.ownedProperties ?? [], this.house.ownsHouse);
    this.furniture = new FurnitureSystem(saved?.furnitureOwned ?? {}, saved?.placedFurniture);
    this.companies = new CompanySystem(saved?.companies ?? []);
    this.investments = new InvestmentSystem(saved?.investments ?? {});
    this.transactions = new TransactionLog(saved?.transactions ?? []);
    if (!saved?.transactions?.length) this.transactions.record("credit", saved?.money ?? STARTING_MONEY, "Starting pocket money");
    this.player = { ...(saved?.player ?? { x: 360, y: 330 }) };
    this.car = { ...(saved?.vehicle ?? { x: 470, y: 330 }), yaw: 0, speed: 0 };
    this.energy = clamp(saved?.energy ?? 68, 0, 100);
    this.demoGrantClaimed = saved?.demoGrantClaimed ?? false;
    this.lastClock = this.realTime.read();
    this.npcs.forEach((npc) => { npc.heading = this.headingTo(npc.x, npc.y, npc.route[npc.waypoint]); });
  }

  subscribe(listener: (state: GameUiState) => void) {
    this.listeners.add(listener);
    listener(this.getUiState());
    return () => this.listeners.delete(listener);
  }

  get cameraBlockers() {
    const interiorOnly = this.house.inside;
    return [...this.cameraBlockerMap.entries()]
      .filter(([id]) => id.startsWith("interior:") === interiorOnly)
      .map(([, object]) => object);
  }

  get nightStrength() {
    return this.lastClock.nightStrength;
  }

  get timeSnapshot() {
    return this.lastClock;
  }

  registerCameraBlocker(id: string, object: Object3D | null) {
    if (object) this.cameraBlockerMap.set(id, object);
    else this.cameraBlockerMap.delete(id);
  }

  setMove(x: number, y: number) {
    this.input = { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
  }

  setRun(active: boolean) {
    this.running = active && !this.driving;
  }

  setPedals(accelerate: boolean, brake: boolean) {
    this.driveAccelerate = accelerate;
    this.driveBrake = brake;
  }

  placeFurnitureAt(x: number, y: number) {
    const item = this.furniture.placeAt(x, y);
    if (!item) {
      this.setToast("Choose a spot inside the room.", 2_000);
      return;
    }
    this.setToast("Furniture placed · Your home layout is saved on this device.", 3_000);
    this.saveGame(false);
  }

  rotateCamera(deltaX: number, deltaY: number, sensitivity = 0.0042) {
    this.cameraYaw -= deltaX * sensitivity;
    this.cameraPitch = clamp(this.cameraPitch + deltaY * sensitivity * 0.72, -0.18, 0.62);
  }

  setZoom(zoom: number) {
    this.cameraDistance = clamp(6.7 / clamp(zoom, 0.9, 1.45), 4.7, 7.5);
  }

  getActorMapPosition(): Vec2 {
    if (this.driving) return { x: this.car.x, y: this.car.y };
    if (this.house.inside) return { ...this.interiorPosition };
    return { ...this.player };
  }

  getActorHeading() {
    return this.driving ? this.car.yaw : this.playerYaw;
  }

  getPlayerWorldMapPosition(): Vec2 {
    return this.driving ? { x: this.car.x, y: this.car.y } : { ...this.player };
  }

  getPlayerMotionSpeed() {
    return this.driving ? Math.abs(this.car.speed) : Math.hypot(this.velocity.x, this.velocity.y) * MAP_TO_METERS;
  }

  getUiState(): GameUiState {
    const position = this.getPlayerWorldMapPosition();
    const job = this.jobs.getHud(position);
    const location = this.getLocation(position);
    return {
      ready: true,
      playerName: PLAYER_NAME,
      money: this.inventory.money,
      health: this.health,
      energy: this.energy,
      job: job.title,
      jobDetail: job.detail,
      jobProgress: job.progress,
      time: this.lastClock.display,
      timeOfDay: this.lastClock.phase,
      location: this.house.inside ? `${this.house.homeName} · Interior` : this.driving ? "Umu Ila Way · Driving" : location,
      prompt: this.showHints && !this.panel ? this.getPrompt() : "",
      insideHouse: this.house.inside,
      houseName: this.house.homeName,
      ownsHouse: this.house.ownsHouse,
      ownsVehicle: true,
      driving: this.driving,
      inventory: { ...this.inventory.items },
      player: this.house.inside ? this.house.exterior : position,
      jobTarget: job.target,
      panel: this.panel,
      toast: this.toast,
      weather: this.weather.current,
      napRemainingMs: this.nap.remainingMs,
      contextId: this.contextId,
      ownedPropertyIds: this.properties.getOwnedIds(),
      furnitureOwned: { ...this.furniture.owned },
      placedFurniture: this.furniture.placed.map((item) => ({ ...item })),
      placementMode: this.furniture.placementMode,
      selectedFurnitureId: this.furniture.selectedFurnitureId,
      companies: this.companies.owned.map((company) => ({ ...company })),
      investments: { ...this.investments.units },
      demoGrantClaimed: this.demoGrantClaimed,
      netWorth: this.getNetWorth(),
      transactions: this.transactions.recent(8),
    };
  }

  update(deltaSeconds: number) {
    const dt = clamp(deltaSeconds, 0, 0.075);
    if (dt <= 0) return;
    const ms = dt * 1_000;
    this.clockAccumulator += ms;
    if (this.clockAccumulator >= 700) {
      this.clockAccumulator = 0;
      this.lastClock = this.realTime.read();
    }

    const weatherChange = this.weather.update(ms);
    if (weatherChange) this.setToast(`Weather shift · ${WEATHER[weatherChange.current].name.toLowerCase()} skies.`, 3_000);
    if (this.toastRemaining > 0) {
      this.toastRemaining = Math.max(0, this.toastRemaining - ms);
      if (this.toastRemaining === 0) this.toast = "";
    }

    if (this.nap.update(ms)) {
      this.energy = 100;
      this.health = Math.min(100, this.health + 12);
      this.running = false;
      this.setToast("Energy restored · You feel ready for the day.", 4_000);
    }

    const canMove = !this.panel && !this.nap.active;
    if (canMove) {
      if (this.house.inside) this.updateWalking(dt, true);
      else if (this.driving) this.updateDriving(dt);
      else this.updateWalking(dt, false);
    } else {
      this.velocity.x = moveTowards(this.velocity.x, 0, 600 * dt);
      this.velocity.y = moveTowards(this.velocity.y, 0, 600 * dt);
    }

    if (!this.house.inside && !this.driving && !this.panel && !this.nap.active) this.updateNpcs(ms);
    if (!this.house.inside && !this.panel && !this.nap.active) {
      const completion = this.jobs.update(ms, this.getPlayerWorldMapPosition());
      if (completion) {
        this.inventory.money += completion.reward;
        this.transactions.record("credit", completion.reward, "Job payment");
        this.setToast(completion.message, 4_500);
      }
    }

    if (canMove && Math.hypot(this.input.x, this.input.y) > 0.1) {
      this.energyAccumulator += ms * (this.running ? 1.65 : this.driving ? 0.7 : 1);
      while (this.energyAccumulator >= 35_000) {
        this.energy = Math.max(0, this.energy - 1);
        this.energyAccumulator -= 35_000;
      }
    }

    this.saveAccumulator += ms;
    if (this.saveAccumulator >= 9_000) {
      this.saveAccumulator = 0;
      this.saveGame(false);
    }
    this.publishAccumulator += ms;
    if (this.publishAccumulator >= 140) {
      this.publishAccumulator = 0;
      this.publish();
    }
  }

  command(command: GameCommand) {
    if (this.nap.active) return;
    switch (command.type) {
      case "set-panel":
        this.panel = command.panel;
        this.contextId = command.panel === "property" ? this.contextId : null;
        if (command.panel) this.setMove(0, 0);
        this.publish();
        return;
      case "interact": this.interactNearest(); return;
      case "save": this.saveGame(true); return;
      case "buy-item": {
        const result = this.inventory.buy(command.itemId);
        if (result.ok) this.transactions.record("debit", result.cost, `Bought ${result.itemName}`);
        this.setToast(result.message, 3_000);
        return;
      }
      case "use-item": {
        const result = this.inventory.use(command.itemId);
        if (result.ok) this.health = Math.min(100, this.health + result.health);
        this.setToast(result.message, 3_000);
        return;
      }
      case "start-job": {
        const result = this.jobs.start(command.jobId);
        this.setToast(result.message, 3_500);
        if (result.ok) this.panel = null;
        return;
      }
      case "abandon-job": {
        const result = this.jobs.abandon();
        this.setToast(result.message, 3_000);
        return;
      }
      case "buy-property": this.buyProperty(command.propertyId); return;
      case "enter-property": this.enterOwnedProperty(command.propertyId); return;
      case "buy-furniture": this.buyFurniture(command.itemId); return;
      case "place-furniture":
        if (this.house.inside && this.furniture.beginPlace(command.itemId)) {
          this.panel = null;
          this.setToast("Placement mode · tap a spot inside your home.", 3_000);
        }
        return;
      case "move-furniture":
        if (this.house.inside && this.furniture.beginMove(command.instanceId)) {
          this.panel = null;
          this.setToast("Move mode · tap a new spot inside your home.", 3_000);
        }
        return;
      case "rotate-furniture":
        if (this.furniture.rotateSelected()) this.setToast("Furniture rotated.", 1_800);
        return;
      case "remove-furniture":
        if (this.furniture.removeSelected()) this.setToast("Item returned to your furniture bag.", 2_000);
        return;
      case "cancel-furniture":
        this.furniture.cancelPlacement();
        this.setToast("Furniture placement cancelled.", 1_800);
        return;
      case "start-nap": this.startNap(); return;
      case "create-company": this.createCompany(command.name, command.businessType, command.location); return;
      case "buy-company": this.buyCompany(command.companyId); return;
      case "buy-investment": {
        const result = this.investments.buy(command.investmentId, this.inventory.money);
        if (result.ok) {
          this.inventory.money -= result.cost;
          this.transactions.record("debit", result.cost, `Bought ${command.investmentId}`);
        }
        this.setToast(result.message, 3_000);
        return;
      }
      case "sell-investment": {
        const result = this.investments.sell(command.investmentId);
        if (result.ok) {
          this.inventory.money += result.credit;
          this.transactions.record("credit", result.credit, `Sold ${command.investmentId}`);
        }
        this.setToast(result.message, 3_000);
        return;
      }
      case "claim-demo-grant": this.claimDemoGrant(); return;
      case "camera-zoom": this.setZoom(command.zoom); this.publish(); return;
      case "set-hints": this.showHints = command.enabled; this.publish(); return;
    }
  }

  interactNearest() {
    if (this.nap.active || this.panel) return;
    if (this.driving) {
      this.exitVehicle();
      return;
    }
    const current = this.house.inside ? this.interiorPosition : this.player;
    if (this.house.inside) {
      const door = { x: 360, y: 438 };
      const bed = this.furniture.nearestBed(current);
      const doorDistance = this.distance(current, door);
      const bedDistance = bed ? this.distance(current, bed) : Infinity;
      if (doorDistance < 68 && doorDistance <= bedDistance) {
        this.leaveHouse();
        return;
      }
      if (bed && bedDistance < 78) {
        this.panel = "nap";
        this.publish();
        return;
      }
      this.setToast("Move closer to the door or bed to interact.", 1_700);
      return;
    }

    const carDistance = this.distance(this.player, { x: this.car.x, y: this.car.y });
    const npc = this.nearestNpc(this.player, 55);
    const nearbyLandmark = LANDMARKS.map((landmark) => ({ landmark, distance: this.distance(this.player, { x: landmark.entryX, y: landmark.entryY }) }))
      .filter((entry) => entry.distance < 76)
      .sort((a, b) => a.distance - b.distance)[0];

    const carCandidate = carDistance < 74;
    const npcCandidate = !!npc && npc.distance < 56;
    const nearestDistance = Math.min(carCandidate ? carDistance : Infinity, npcCandidate ? npc!.distance : Infinity, nearbyLandmark?.distance ?? Infinity);
    if (nearestDistance === Infinity) {
      this.setToast("Nothing close enough to interact with.", 1_700);
      return;
    }
    if (carCandidate && carDistance === nearestDistance) {
      this.enterVehicle();
      return;
    }
    if (npcCandidate && npc && npc.distance === nearestDistance) {
      this.setToast(`${npc.npc.name} · ${this.npcGreeting(npc.npc.name)}`, 3_500);
      return;
    }
    if (nearbyLandmark) this.interactWithLandmark(nearbyLandmark.landmark);
  }

  private updateWalking(dt: number, inside: boolean) {
    const inputLength = Math.hypot(this.input.x, this.input.y);
    let moveX = 0;
    let moveY = 0;
    if (inputLength > 0.05) {
      const inv = 1 / Math.max(1, inputLength);
      const localX = this.input.x * inv;
      const localForward = -this.input.y * inv;
      moveX = Math.cos(this.cameraYaw) * localX + Math.sin(this.cameraYaw) * localForward;
      moveY = Math.sin(this.cameraYaw) * localX - Math.cos(this.cameraYaw) * localForward;
    }
    const maxSpeedMeters = this.running ? 3.2 : 1.8;
    const targetSpeed = maxSpeedMeters / MAP_TO_METERS;
    const targetX = moveX * targetSpeed;
    const targetY = moveY * targetSpeed;
    const response = inputLength > 0.05 ? 1 - Math.exp(-8.4 * dt) : 1 - Math.exp(-9.6 * dt);
    this.velocity.x += (targetX - this.velocity.x) * response;
    this.velocity.y += (targetY - this.velocity.y) * response;

    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    if (speed > 3) {
      const targetYaw = Math.atan2(this.velocity.x, -this.velocity.y);
      this.playerYaw = angleTowards(this.playerYaw, targetYaw, 1 - Math.exp(-11 * dt));
    }

    const actor = inside ? this.interiorPosition : this.player;
    const nextX = actor.x + this.velocity.x * dt;
    const nextY = actor.y + this.velocity.y * dt;
    if (inside) {
      if (nextX > 35 && nextX < 685 && !this.hitsRoomFurniture(nextX, actor.y)) actor.x = nextX;
      else this.velocity.x = 0;
      if (nextY > 45 && nextY < 455 && !this.hitsRoomFurniture(actor.x, nextY)) actor.y = nextY;
      else this.velocity.y = 0;
      return;
    }
    const radius = PLAYER_RADIUS;
    if (!hitsCityObstacle(nextX, actor.y, radius)) actor.x = nextX;
    else this.velocity.x = 0;
    if (!hitsCityObstacle(actor.x, nextY, radius)) actor.y = nextY;
    else this.velocity.y = 0;
  }

  private updateDriving(dt: number) {
    const throttle = this.driveAccelerate || this.input.y < -0.12;
    const brake = this.driveBrake || this.input.y > 0.16;
    const steer = this.input.x;
    if (throttle) this.car.speed = moveTowards(this.car.speed, 12.5, 5.3 * dt);
    else if (brake) this.car.speed = moveTowards(this.car.speed, -2.5, 8.2 * dt);
    else this.car.speed = moveTowards(this.car.speed, 0, 2.7 * dt);
    const steeringStrength = 0.36 + Math.min(Math.abs(this.car.speed) / 12.5, 1) * 0.78;
    this.car.yaw += steer * steeringStrength * dt * Math.sign(this.car.speed || 1);
    const worldX = Math.sin(this.car.yaw);
    const worldY = -Math.cos(this.car.yaw);
    const nextX = this.car.x + worldX * (this.car.speed / MAP_TO_METERS) * dt;
    const nextY = this.car.y + worldY * (this.car.speed / MAP_TO_METERS) * dt;
    if (!hitsCityObstacle(nextX, nextY, CAR_RADIUS)) {
      this.car.x = clamp(nextX, 40, WORLD_WIDTH - 40);
      this.car.y = clamp(nextY, 40, WORLD_HEIGHT - 40);
    } else {
      this.car.speed = -this.car.speed * 0.14;
    }
  }

  private hitsRoomFurniture(x: number, y: number) {
    return this.furniture.placed.some((placed) => {
      const definition = FURNITURE_CATALOG.find((item) => item.id === placed.itemId);
      if (!definition) return false;
      const closestX = clamp(x, placed.x - definition.width / 2, placed.x + definition.width / 2);
      const closestY = clamp(y, placed.y - definition.height / 2, placed.y + definition.height / 2);
      return (x - closestX) ** 2 + (y - closestY) ** 2 < PLAYER_RADIUS ** 2;
    });
  }

  private updateNpcs(deltaMs: number) {
    this.npcs.forEach((npc) => {
      if (npc.pause > 0) {
        npc.pause = Math.max(0, npc.pause - deltaMs);
        return;
      }
      const target = npc.route[npc.waypoint];
      const dx = target.x - npc.x;
      const dy = target.y - npc.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 14) {
        npc.waypoint = (npc.waypoint + 1) % npc.route.length;
        npc.pause = 900 + Math.random() * 1_500;
        return;
      }
      const speed = 30 + (npc.name.length % 3) * 5;
      const dirX = dx / distance;
      const dirY = dy / distance;
      const nextX = npc.x + dirX * speed * (deltaMs / 1_000);
      const nextY = npc.y + dirY * speed * (deltaMs / 1_000);
      if (!hitsCityObstacle(nextX, nextY, 10)) {
        npc.x = nextX;
        npc.y = nextY;
        npc.heading = Math.atan2(dirX, -dirY);
      } else {
        npc.waypoint = (npc.waypoint + 1) % npc.route.length;
        npc.pause = 350;
      }
    });
  }

  private nearestNpc(position: Vec2, radius: number): { npc: NpcData; distance: number } | null {
    let found: { npc: NpcData; distance: number } | null = null;
    for (const npc of this.npcs) {
      const distance = this.distance(position, npc);
      if (distance < radius && (!found || distance < found.distance)) found = { npc, distance };
    }
    return found;
  }

  private npcGreeting(name: string) {
    const greetings: Record<string, string> = {
      Chika: "Fresh fruit just came in. You should see what's on the stall.",
      Femi: "The road is clear again. Safe travels, boss.",
      Nneka: "Taking the long route keeps the day interesting.",
      Tamuno: "Morning, neighbour. The breeze is good by the park.",
      Kene: "Need a lift? My cab is parked by the rank.",
      "Aunty Eno": "You're welcome, dear. There's always something cooking.",
    };
    return greetings[name] ?? "Good to see you out and about.";
  }

  private enterVehicle() {
    this.driving = true;
    this.running = false;
    this.car.speed = 0;
    this.cameraYaw = this.car.yaw;
    this.setToast("Boro Sprint ready · WASD, arrows or the touch stick to drive.", 3_000);
  }

  private exitVehicle() {
    const sideX = Math.cos(this.car.yaw) * 58;
    const sideY = Math.sin(this.car.yaw) * 58;
    const candidateA = { x: this.car.x + sideX, y: this.car.y + sideY };
    const candidateB = { x: this.car.x - sideX, y: this.car.y - sideY };
    const candidate = hitsCityObstacle(candidateA.x, candidateA.y, PLAYER_RADIUS) ? candidateB : candidateA;
    this.player = { x: clamp(candidate.x, 40, WORLD_WIDTH - 40), y: clamp(candidate.y, 40, WORLD_HEIGHT - 40) };
    this.driving = false;
    this.car.speed = 0;
    this.playerYaw = this.car.yaw;
    this.setToast("You stepped out of the Boro Sprint.", 2_200);
  }

  private enterHouse(homeId: string, homeName: string) {
    const position = { ...this.player };
    if (!this.house.enter(position, homeId, homeName)) return;
    this.interiorPosition = { x: 360, y: 420 };
    this.velocity = { x: 0, y: 0 };
    this.running = false;
    this.cameraYaw = 0;
    this.playerYaw = 0;
    this.setToast(`Welcome to ${homeName}.`, 3_000);
  }

  private leaveHouse() {
    const exterior = this.house.leave();
    this.player = { x: exterior.x, y: exterior.y + 22 };
    this.velocity = { x: 0, y: 0 };
    this.furniture.cancelPlacement();
    this.nap.cancel();
    this.setToast("Back on the street · Your home is yours to arrange.", 3_000);
    this.saveGame(false);
  }

  private interactWithLandmark(landmark: Landmark) {
    if (landmark.kind === "house") {
      if (landmark.id === "amara-court") {
        this.enterHouse("amara-court-flat", STARTER_HOME_NAME);
        return;
      }
      const property = this.properties.getForSale(landmark.id);
      if (property && !this.properties.owns(property.id)) {
        this.contextId = property.id;
        this.panel = "property";
        this.publish();
        return;
      }
      if (property && this.properties.owns(property.id)) this.enterHouse(property.id, property.name);
      return;
    }
    if (landmark.kind === "shop" || landmark.kind === "restaurant" || landmark.kind === "fuel") {
      this.contextId = landmark.id;
      this.panel = "shop";
      this.publish();
      return;
    }
    if (landmark.kind === "bank") {
      this.contextId = landmark.id;
      this.panel = "bank";
      this.publish();
      return;
    }
    if (landmark.kind === "job" && landmark.jobId) {
      const result = this.jobs.start(landmark.jobId);
      this.setToast(result.message, 3_500);
      return;
    }
    if (landmark.kind === "office") {
      this.setToast(`${landmark.name} · Check the Jobs app on your phone for local work.`, 3_000);
      this.panel = "phone";
      this.publish();
      return;
    }
    this.setToast(`${landmark.name} · The neighbourhood is calm today.`, 2_500);
  }

  private getPrompt() {
    if (this.nap.active) return "Taking a nap…";
    if (this.house.inside) {
      const door = { x: 360, y: 438 };
      const bed = this.furniture.nearestBed(this.interiorPosition);
      const doorDistance = this.distance(this.interiorPosition, door);
      const bedDistance = bed ? this.distance(this.interiorPosition, bed) : Infinity;
      if (doorDistance < 68 && doorDistance <= bedDistance) return "Press E · Leave your home";
      if (bed && bedDistance < 78) return "Press E · Take a nap";
      return "";
    }
    if (this.driving) return "Press E · Exit Boro Sprint";
    const carDistance = this.distance(this.player, { x: this.car.x, y: this.car.y });
    if (carDistance < 74) return "Press E · Enter Boro Sprint";
    const npc = this.nearestNpc(this.player, 55);
    if (npc) return `Press E · Talk to ${npc.npc.name} · ${npc.npc.role}`;
    const nearest = LANDMARKS.map((landmark) => ({ landmark, distance: this.distance(this.player, { x: landmark.entryX, y: landmark.entryY }) }))
      .filter((entry) => entry.distance < 76)
      .sort((a, b) => a.distance - b.distance)[0];
    if (!nearest) return "";
    const landmark = nearest.landmark;
    if (landmark.kind === "house") {
      if (landmark.id === "amara-court") return `Press E · Enter ${STARTER_HOME_NAME}`;
      const property = this.properties.getForSale(landmark.id);
      if (property && !this.properties.owns(property.id)) return `Press E · House for sale · ₦${property.price.toLocaleString("en-NG")}`;
      return `Press E · Enter ${property?.name ?? landmark.name}`;
    }
    if (landmark.kind === "job" && landmark.jobId) return `Press E · Start ${this.jobs.definition(landmark.jobId)?.title ?? "job"}`;
    if (landmark.kind === "bank") return `Press E · Open ${landmark.name}`;
    if (landmark.kind === "shop" || landmark.kind === "restaurant" || landmark.kind === "fuel") return `Press E · Visit ${landmark.name}`;
    if (landmark.kind === "office") return `Press E · Browse work at ${landmark.name}`;
    return `Press E · ${landmark.name}`;
  }

  private interactWithLandmarkById(id: string) {
    const landmark = LANDMARKS.find((entry) => entry.id === id);
    if (landmark) this.interactWithLandmark(landmark);
  }

  private getLocation(position: Vec2) {
    const nearby = LANDMARKS.map((landmark) => ({ landmark, distance: this.distance(position, { x: landmark.entryX, y: landmark.entryY }) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (nearby && nearby.distance < 210) return nearby.landmark.name;
    if (position.y < 500) return "North Grove";
    if (position.y < 1_120) return position.x < 790 ? "Creekline Market District" : position.x > 1_615 ? "Nembe East Ward" : "Nembe Market District";
    return position.x < 790 ? "Green Palm Park" : "South Market Road";
  }

  private getNetWorth() {
    return this.inventory.money + this.properties.getNetWorth() + CAR_VALUE + this.furniture.getValue() + this.companies.getNetWorth() + this.investments.getNetWorth();
  }

  private startNap() {
    if (!this.house.inside) {
      this.setToast("Head home before taking a nap.", 2_200);
      return;
    }
    this.panel = null;
    this.running = false;
    this.setMove(0, 0);
    this.nap.start();
    this.setToast(`Taking a nap… ${Math.ceil(NAP_DURATION_MS / 1_000)} seconds to recharge.`, 2_600);
  }

  private buyProperty(propertyId: string) {
    const result = this.properties.purchase(propertyId, this.inventory.money);
    if (result.ok) {
      this.inventory.money -= result.cost;
      this.transactions.record("debit", result.cost, `Bought ${propertyId.replaceAll("-", " ")}`);
      this.setToast(result.message, 3_500);
      this.saveGame(false);
    } else this.setToast(result.message, 3_000);
  }

  private enterOwnedProperty(propertyId: string) {
    const property = PROPERTIES_FOR_SALE.find((entry) => entry.id === propertyId);
    if (!property || !this.properties.owns(propertyId)) {
      this.setToast("Buy this home before entering it.", 2_500);
      return;
    }
    const landmark = LANDMARKS.find((entry) => entry.id === property.landmarkId);
    if (landmark) this.player = { x: landmark.entryX, y: landmark.entryY + 25 };
    this.contextId = null;
    this.panel = null;
    this.enterHouse(property.id, property.name);
  }

  private buyFurniture(itemId: string) {
    const result = this.furniture.buy(itemId, this.inventory.money);
    if (result.ok) {
      this.inventory.money -= result.cost;
      this.transactions.record("debit", result.cost, `Bought ${FURNITURE_CATALOG.find((item) => item.id === itemId)?.name ?? "furniture"}`);
      this.panel = null;
    }
    this.setToast(result.message, 3_000);
  }

  private createCompany(name: string, businessType: string, location: string) {
    const result = this.companies.create(name, businessType, location, PLAYER_NAME, this.inventory.money);
    if (result.ok) {
      this.inventory.money -= result.cost;
      this.transactions.record("debit", result.cost, `Registered ${name.trim()}`);
      this.setToast(`Company Created Successfully · ${name.trim()}`, 4_000);
      this.saveGame(false);
    } else this.setToast(result.message, 3_500);
  }

  private buyCompany(companyId: string) {
    const result = this.companies.purchase(companyId, this.inventory.money, PLAYER_NAME);
    if (result.ok) {
      this.inventory.money -= result.cost;
      this.transactions.record("debit", result.cost, `Purchased ${companyId.replace("sale-", "")}`);
      this.setToast(result.message, 3_500);
      this.saveGame(false);
    } else this.setToast(result.message, 3_000);
  }

  private claimDemoGrant() {
    if (this.demoGrantClaimed) {
      this.setToast("Your one-time demo founder grant has already been claimed.", 2_500);
      return;
    }
    this.demoGrantClaimed = true;
    this.inventory.money += DEMO_GRANT;
    this.transactions.record("credit", DEMO_GRANT, "One-time demo founder grant");
    this.setToast(`Demo founder grant received · +₦${DEMO_GRANT.toLocaleString("en-NG")}`, 4_000);
    this.saveGame(false);
  }

  private saveGame(showToast: boolean) {
    const saveData: SaveData = {
      version: 1,
      playerName: PLAYER_NAME,
      player: this.house.inside ? this.house.exterior : this.driving ? { x: this.player.x, y: this.player.y } : { ...this.player },
      money: this.inventory.money,
      energy: this.energy,
      currentJob: this.jobs.active ? { ...this.jobs.active } : null,
      inventory: { ...this.inventory.items },
      ownsHouse: this.house.ownsHouse,
      ownsVehicle: true,
      vehicle: { x: this.car.x, y: this.car.y },
      ownedProperties: this.properties.getOwnedIds(),
      furnitureOwned: { ...this.furniture.owned },
      placedFurniture: this.furniture.placed.map((item) => ({ ...item })),
      companies: this.companies.owned.map((company) => ({ ...company })),
      investments: { ...this.investments.units },
      demoGrantClaimed: this.demoGrantClaimed,
      transactions: this.transactions.recent(20),
    };
    const saved = localSaveProvider.save(saveData);
    if (showToast) this.setToast(saved ? "Game saved on this device." : "Save unavailable · Check this browser's storage settings.", 3_000);
  }

  private setToast(message: string, durationMs = 3_000) {
    this.toast = message;
    this.toastRemaining = durationMs;
    this.publish();
  }

  private publish() {
    const state = this.getUiState();
    this.listeners.forEach((listener) => listener(state));
  }

  private distance(a: Vec2, b: Vec2) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private headingTo(x: number, y: number, target: Vec2) {
    return Math.atan2(target.x - x, -(target.y - y));
  }
}
