import * as Phaser from "phaser";
import { InventorySystem } from "@/game/inventory/InventorySystem";
import { JobSystem } from "@/game/jobs/JobSystem";
import { NpcSystem, type NpcCharacter } from "@/game/npcs/NpcSystem";
import type { FurniturePlacement, GameCommand, GameUiState, PanelName, SaveData } from "@/game/types";
import { createPlayerTextures } from "@/game/player/PixelCharacters";
import { PlayerController } from "@/game/player/PlayerController";
import { CityWorld } from "@/game/world/CityWorld";
import { LANDMARKS, WORLD_HEIGHT, WORLD_WIDTH, type Landmark } from "@/game/world/landmarks";
import { createVehicleTexture } from "@/game/vehicles/PixelCar";
import { VehicleSystem } from "@/game/vehicles/VehicleSystem";
import { localSaveProvider } from "@/game/save/localSaveProvider";
import { RealTimeSystem } from "@/game/time/RealTimeSystem";
import { RainEffect } from "@/game/weather/RainEffect";
import { WEATHER, WeatherSystem } from "@/game/weather/WeatherSystem";
import { HouseSystem, STARTER_HOME_NAME } from "@/game/houses/HouseSystem";
import { NapSystem } from "@/game/houses/NapSystem";
import { FurnitureSystem, FURNITURE_CATALOG } from "@/game/furniture/FurnitureSystem";
import { PropertySystem, PROPERTIES_FOR_SALE } from "@/game/properties/PropertySystem";
import { CompanySystem } from "@/game/companies/CompanySystem";
import { InvestmentSystem } from "@/game/investments/InvestmentSystem";
import { TransactionLog } from "@/game/economy/TransactionLog";

interface InteractionTarget {
  type: "car" | "npc" | "landmark" | "bed" | "door";
  distance: number;
  landmark?: Landmark;
  npc?: NpcCharacter;
}

const PLAYER_NAME = "Kamsi Okoro";
const STARTING_MONEY = 10_000;
const DEMO_GRANT = 2_000_000;
const CAR_VALUE = 1_800_000;

export class GameScene extends Phaser.Scene {
  private city!: CityWorld;
  private player!: Phaser.Physics.Arcade.Sprite;
  private controller!: PlayerController;
  private npcs!: NpcSystem;
  private vehicle!: VehicleSystem;
  private inventory!: InventorySystem;
  private jobs!: JobSystem;
  private house!: HouseSystem;
  private properties!: PropertySystem;
  private nap = new NapSystem();
  private furniture!: FurnitureSystem;
  private companies!: CompanySystem;
  private investments!: InvestmentSystem;
  private transactions!: TransactionLog;
  private realTime = new RealTimeSystem();
  private weather = new WeatherSystem();
  private rain!: RainEffect;
  private atmosphere!: Phaser.GameObjects.Rectangle;
  private interiorLayer!: Phaser.GameObjects.Container;
  private interiorWalls!: Phaser.Physics.Arcade.StaticGroup;
  private furnitureGraphics: Phaser.GameObjects.Graphics[] = [];
  private placementGhost!: Phaser.GameObjects.Graphics;
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private phoneKey!: Phaser.Input.Keyboard.Key;
  private mapKey!: Phaser.Input.Keyboard.Key;
  private menuKey!: Phaser.Input.Keyboard.Key;
  private saveKey!: Phaser.Input.Keyboard.Key;
  private panel: PanelName | null = null;
  private contextId: string | null = null;
  private toast = "";
  private toastRemainingMs = 0;
  private health = 100;
  private energy = 68;
  private energyAccumulator = 0;
  private demoGrantClaimed = false;
  private showHints = true;
  private blocked = false;
  private hudAccumulator = 0;
  private saveAccumulator = 0;
  private timeAccumulator = 0;
  private lastClockSnapshot = this.realTime.read();
  private lastFootPosition = { x: 360, y: 330 };

  private commandHandler?: (command: GameCommand) => void;
  private moveHandler?: (vector: { x: number; y: number }) => void;

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    const saved = localSaveProvider.load();
    this.inventory = new InventorySystem(saved?.money ?? STARTING_MONEY, saved?.inventory ?? {});
    this.energy = Phaser.Math.Clamp(saved?.energy ?? 68, 0, 100);
    this.jobs = new JobSystem(saved?.currentJob ?? null);
    this.house = new HouseSystem(saved?.ownsHouse ?? true);
    this.properties = new PropertySystem(saved?.ownedProperties ?? [], this.house.ownsHouse);
    this.furniture = new FurnitureSystem(saved?.furnitureOwned ?? {}, saved?.placedFurniture);
    this.companies = new CompanySystem(saved?.companies ?? []);
    this.investments = new InvestmentSystem(saved?.investments ?? {});
    this.transactions = new TransactionLog(saved?.transactions ?? []);
    if (!saved?.transactions?.length) this.transactions.record("credit", saved?.money ?? STARTING_MONEY, "Starting pocket money");
    this.demoGrantClaimed = saved?.demoGrantClaimed ?? false;

    createPlayerTextures(this);
    createVehicleTexture(this);
    this.city = new CityWorld(this);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const spawn = saved?.player ?? { x: 360, y: 330 };
    this.player = this.physics.add.sprite(spawn.x, spawn.y, "player-down");
    this.lastFootPosition = { x: spawn.x, y: spawn.y };
    this.player.setDepth(this.player.y + 5).setCollideWorldBounds(true);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setSize(15, 14).setOffset(8, 21);
    playerBody.setMaxVelocity(180, 180);
    this.controller = new PlayerController(this, this.player);
    this.physics.add.collider(this.player, this.city.obstacles);

    const vehiclePosition = saved?.vehicle ?? { x: 470, y: 330 };
    const carSprite = this.physics.add.sprite(vehiclePosition.x, vehiclePosition.y, "boro-sprint");
    carSprite.setDepth(carSprite.y + 6).setCollideWorldBounds(true);
    const carBody = carSprite.body as Phaser.Physics.Arcade.Body;
    carBody.setSize(44, 24).setOffset(10, 8).setMaxVelocity(250, 250);
    carBody.setDrag(240, 240);
    this.vehicle = new VehicleSystem(carSprite, saved?.ownsVehicle ?? true);
    carSprite.setVisible(this.vehicle.ownsVehicle);
    carBody.enable = this.vehicle.ownsVehicle;
    this.physics.add.collider(carSprite, this.city.obstacles);
    this.physics.add.collider(this.player, carSprite);

    this.npcs = new NpcSystem(this, this.city.obstacles);
    this.npcs.characters.forEach((character) => {
      this.physics.add.collider(this.player, character.sprite);
      this.physics.add.collider(carSprite, character.sprite);
    });

    this.createInterior();
    this.setupAtmosphere();
    this.setupKeyboard();
    this.setupBridgeEvents();
    this.setupInputEvents();
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT).setZoom(1.15).startFollow(this.player, true, 0.12, 0.12);
    this.applyAtmosphere();
    this.setToast("Welcome to Axlori City · Find a place, a job, or a new story.", 4_200);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.publishHud();
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 250);
    this.timeAccumulator += delta;
    if (this.timeAccumulator >= 700) {
      this.timeAccumulator = 0;
      this.lastClockSnapshot = this.realTime.read();
      this.applyAtmosphere();
    }

    const weatherChange = this.weather.update(dt);
    if (weatherChange) {
      this.setToast(`Weather shift · ${WEATHER[weatherChange.current].name.toLowerCase()} skies.`, 3_000);
      this.applyAtmosphere();
    }
    this.rain.update(dt);

    if (this.toastRemainingMs > 0) {
      this.toastRemainingMs = Math.max(0, this.toastRemainingMs - dt);
      if (this.toastRemainingMs === 0) this.toast = "";
    }

    const finishedNap = this.nap.update(dt);
    if (finishedNap) {
      this.energy = 100;
      this.health = Math.min(100, this.health + 12);
      this.setToast("Energy restored · You feel ready for the day.", 4_000);
    }

    const canAct = !this.blocked && !this.nap.active;
    const movement = this.controller.update(dt, this.vehicle.driving ? 238 : (this.energy < 20 ? 105 : 150), canAct);
    if (movement && canAct) {
      this.energyAccumulator += dt * (this.vehicle.driving ? 1.6 : 1);
      while (this.energyAccumulator >= 25_000) {
        this.energy = Math.max(0, this.energy - 1);
        this.energyAccumulator -= 25_000;
      }
    }
    const input = this.controller.movementVector;
    const carBody = this.vehicle.sprite.body as Phaser.Physics.Arcade.Body;
    if (this.vehicle.driving) {
      const targetX = input.x * 235;
      const targetY = input.y * 235;
      const blend = Math.min(1, Math.max(0.06, dt / 75));
      carBody.setVelocity(Phaser.Math.Linear(carBody.velocity.x, targetX, blend), Phaser.Math.Linear(carBody.velocity.y, targetY, blend));
      if (Math.hypot(input.x, input.y) > 0.08) {
        this.vehicle.sprite.setRotation(Math.atan2(input.y, input.x) + Math.PI / 2);
      }
      this.vehicle.sprite.setDepth(this.vehicle.sprite.y + 6);
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    } else {
      this.player.setDepth(this.player.y + 5);
      if (!this.house.inside) this.lastFootPosition = { x: this.player.x, y: this.player.y };
      if (!movement) {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        if (this.blocked || this.nap.active) body.setVelocity(0, 0);
      }
    }

    this.npcs.update(dt, !this.blocked && !this.nap.active && !this.house.inside);

    if (!this.blocked && !this.nap.active && !this.house.inside) {
      const worldPosition = this.getPlayerWorldPosition();
      const completion = this.jobs.update(dt, worldPosition);
        if (completion) {
        this.inventory.money += completion.reward;
        this.transactions.record("credit", completion.reward, "Job payment");
        this.setToast(completion.message, 4_500);
      }
      if (this.interactionKey && Phaser.Input.Keyboard.JustDown(this.interactionKey)) this.interactNearest();
    }

    if (!this.blocked && !this.nap.active) {
      if (this.phoneKey && Phaser.Input.Keyboard.JustDown(this.phoneKey)) this.setPanel(this.house.inside ? "phone" : "phone");
      if (this.mapKey && Phaser.Input.Keyboard.JustDown(this.mapKey)) this.setPanel("map");
      if (this.menuKey && Phaser.Input.Keyboard.JustDown(this.menuKey)) this.setPanel("menu");
      if (this.saveKey && Phaser.Input.Keyboard.JustDown(this.saveKey)) this.saveGame(true);
    }

    this.updatePlacementGhost();
    this.saveAccumulator += dt;
    if (this.saveAccumulator >= 8_000) {
      this.saveAccumulator = 0;
      this.saveGame(false);
    }
    this.hudAccumulator += dt;
    if (this.hudAccumulator >= 240) {
      this.hudAccumulator = 0;
      this.publishHud();
    }
  }

  private setupKeyboard() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    this.interactionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.phoneKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.mapKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.menuKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.saveKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F5);
  }

  private setupBridgeEvents() {
    this.commandHandler = (command) => this.handleCommand(command);
    this.moveHandler = (vector) => this.controller.setVirtualInput(vector.x, vector.y);
    this.game.events.on("axlori:command", this.commandHandler);
    this.game.events.on("axlori:virtual-input", this.moveHandler);
  }

  private setupInputEvents() {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!this.house.inside || !this.furniture.placementMode || this.nap.active) return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const placed = this.furniture.placeAt(point.x, point.y);
      if (!placed) {
        this.setToast("Choose a place inside the room.", 2_000);
        return;
      }
      this.renderFurniture();
      this.setToast("Furniture placed · tap it in your phone's Furnish panel to move it again.", 3_500);
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.house.inside || !this.furniture.placementMode) return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.placementGhost.setPosition(point.x, point.y).setVisible(true);
    });
    this.scale.on("resize", (size: Phaser.Structs.Size) => {
      this.resizeAtmosphere(size.width, size.height);
    });
  }

  private createInterior() {
    this.interiorLayer = this.add.container(0, 0).setDepth(-80).setVisible(false);
    const room = this.add.graphics();
    room.fillStyle(0x39453a).fillRect(0, 0, 720, 500);
    room.fillStyle(0xcbb88f).fillRect(24, 24, 672, 452);
    room.fillStyle(0xdecda4).fillRect(39, 39, 642, 422);
    // floor tiles and a woven rug
    room.lineStyle(1, 0xbba77e, 0.38);
    for (let x = 65; x < 680; x += 48) room.beginPath().moveTo(x, 42).lineTo(x, 458).strokePath();
    for (let y = 72; y < 460; y += 48) room.beginPath().moveTo(42, y).lineTo(678, y).strokePath();
    room.fillStyle(0x8b5440).fillRoundedRect(148, 273, 280, 135, 8);
    room.fillStyle(0xd0a86e).fillRoundedRect(158, 283, 260, 115, 7);
    room.lineStyle(3, 0xa2533f, 0.8).strokeRoundedRect(168, 293, 240, 95, 5);
    // rear window, kitchen shelf and front door
    room.fillStyle(0x315e62).fillRect(301, 31, 116, 11);
    room.fillStyle(0xa7d0bd).fillRect(308, 34, 102, 6);
    room.fillStyle(0x8a6747).fillRect(40, 90, 7, 78).fillRect(673, 90, 7, 78);
    room.fillStyle(0x617964).fillRect(43, 127, 10, 6).fillRect(667, 127, 10, 6);
    room.fillStyle(0x865c3e).fillRect(325, 460, 70, 12);
    room.fillStyle(0xdcb36b).fillRect(346, 461, 29, 10);
    room.fillStyle(0x2e433a).fillRect(324, 459, 2, 14).fillRect(394, 459, 2, 14);
    this.interiorLayer.add(room);

    const wallLabel = this.add.text(360, 18, "AMARA COURT · FLAT 2B", {
      fontFamily: "monospace", fontSize: "12px", fontStyle: "bold", color: "#f6e8bc", backgroundColor: "#294b43", padding: { x: 9, y: 4 },
    }).setOrigin(0.5, 0);
    this.interiorLayer.add(wallLabel);
    const welcome = this.add.text(360, 72, "Home is where the zobo stays cold.", {
      fontFamily: "monospace", fontSize: "11px", color: "#61705b", fontStyle: "italic",
    }).setOrigin(0.5);
    this.interiorLayer.add(welcome);

    this.interiorWalls = this.physics.add.staticGroup();
    this.addInteriorWall(360, 10, 720, 20);
    this.addInteriorWall(10, 250, 20, 500);
    this.addInteriorWall(710, 250, 20, 500);
    this.addInteriorWall(190, 490, 340, 20);
    this.addInteriorWall(570, 490, 300, 20);
    this.interiorWalls.getChildren().forEach((object) => {
      const body = (object as Phaser.GameObjects.GameObject & { body?: Phaser.Physics.Arcade.StaticBody }).body;
      if (body) body.enable = false;
    });

    this.physics.add.collider(this.player, this.interiorWalls);
    this.placementGhost = this.add.graphics().setDepth(900).setVisible(false);
    this.placementGhost.fillStyle(0xf0b34d, 0.22).fillCircle(0, 0, 24);
    this.placementGhost.lineStyle(2, 0xffdc88, 0.9).strokeCircle(0, 0, 24);
  }

  private addInteriorWall(x: number, y: number, width: number, height: number) {
    const wall = this.add.rectangle(x, y, width, height, 0xffffff, 0).setVisible(false);
    this.physics.add.existing(wall, true);
    this.interiorWalls.add(wall);
  }

  private setupAtmosphere() {
    const width = this.scale.width;
    const height = this.scale.height;
    this.atmosphere = this.add.rectangle(0, 0, width, height, 0x18243a, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(1_000_000);
    this.rain = new RainEffect(this);
    this.resizeAtmosphere(width, height);
  }

  private resizeAtmosphere(width: number, height: number) {
    if (!this.atmosphere) return;
    this.atmosphere.setPosition(0, 0).setDisplaySize(width, height);
    this.rain?.resize(width, height);
  }

  private applyAtmosphere() {
    if (!this.atmosphere || !this.rain) return;
    const descriptor = this.weather.descriptor;
    const weatherTint = this.weather.current === "rain" ? 0x26364c : this.weather.current === "cloudy" ? 0x525b5a : 0x18243a;
    const weatherDarkness = descriptor.darkness;
    const alpha = Math.min(0.46, this.lastClockSnapshot.nightStrength + weatherDarkness);
    this.atmosphere.setFillStyle(weatherTint, alpha);
    this.rain.setActive(descriptor.rain && !this.house?.inside);
  }

  private handleCommand(command: GameCommand) {
    if (this.nap.active) return;
    switch (command.type) {
      case "set-panel":
        this.setPanel(command.panel);
        return;
      case "interact":
        if (!this.blocked) this.interactNearest();
        return;
      case "save":
        this.saveGame(true);
        return;
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
        if (result.ok) this.setPanel(null);
        return;
      }
      case "abandon-job": {
        const result = this.jobs.abandon();
        this.setToast(result.message, 3_000);
        return;
      }
      case "buy-property":
        this.buyProperty(command.propertyId);
        return;
      case "enter-property":
        this.enterOwnedProperty(command.propertyId);
        return;
      case "buy-furniture":
        this.buyFurniture(command.itemId);
        return;
      case "place-furniture":
        if (this.house.inside && this.furniture.beginPlace(command.itemId)) {
          this.setPanel(null);
          this.setToast("Placement mode · tap a spot inside your home.", 3_000);
        }
        return;
      case "move-furniture":
        if (this.furniture.beginMove(command.instanceId)) {
          this.setPanel(null);
          this.setToast("Move mode · tap a new spot inside your home.", 3_000);
        }
        return;
      case "rotate-furniture":
        if (this.furniture.rotateSelected()) {
          this.renderFurniture();
          this.setToast("Furniture rotated.", 1_800);
        }
        return;
      case "remove-furniture":
        if (this.furniture.removeSelected()) {
          this.renderFurniture();
          this.setToast("Item returned to your furniture bag.", 2_000);
        }
        return;
      case "cancel-furniture":
        this.furniture.cancelPlacement();
        this.placementGhost.setVisible(false);
        this.setToast("Furniture placement cancelled.", 1_800);
        return;
      case "start-nap":
        this.startNap();
        return;
      case "create-company":
        this.createCompany(command.name, command.businessType, command.location);
        return;
      case "buy-company":
        this.buyCompany(command.companyId);
        return;
      case "buy-investment": {
        const result = this.investments.buy(command.investmentId, this.inventory.money);
        if (result.ok) {
          this.inventory.money -= result.cost;
          this.transactions.record("debit", result.cost, "Investment purchase");
        }
        this.setToast(result.message, 3_000);
        return;
      }
      case "sell-investment": {
        const result = this.investments.sell(command.investmentId);
        if (result.ok) {
          this.inventory.money += result.credit;
          this.transactions.record("credit", result.credit, "Investment sale");
        }
        this.setToast(result.message, 3_000);
        return;
      }
      case "claim-demo-grant":
        this.claimDemoGrant();
        return;
      case "camera-zoom":
        this.cameras.main.setZoom(Phaser.Math.Clamp(command.zoom, 0.9, 1.45));
        this.setToast(`Camera zoom set to ${command.zoom.toFixed(1)}×.`, 2_000);
        return;
      case "set-hints":
        this.showHints = command.enabled;
        this.setToast(command.enabled ? "Interaction hints enabled." : "Interaction hints hidden.", 2_000);
        return;
      default:
        return;
    }
  }

  private setPanel(panel: PanelName | null) {
    if (this.nap.active && panel !== null) return;
    this.panel = panel;
    this.blocked = panel !== null;
    if (panel !== "property") this.contextId = panel === "furniture" ? null : this.contextId;
    this.publishHud();
  }

  private buyProperty(propertyId: string) {
    const result = this.properties.purchase(propertyId, this.inventory.money);
    if (result.ok) {
      this.inventory.money -= result.cost;
      this.transactions.record("debit", result.cost, `Purchased ${this.properties.getForSale(propertyId)?.name ?? "property"}`);
      this.setToast(result.message, 3_500);
      this.contextId = propertyId;
      this.panel = "property";
      this.blocked = true;
      this.saveGame(false);
    } else this.setToast(result.message, 3_000);
  }

  private enterOwnedProperty(propertyId: string) {
    if (propertyId === "amara-court-flat") {
      this.enterHouse("amara-court", STARTER_HOME_NAME);
      return;
    }
    const property = this.properties.getForSale(propertyId);
    if (!property || !this.properties.owns(propertyId)) {
      this.setToast("Purchase this home before entering.", 2_500);
      return;
    }
    this.enterHouse(property.landmarkId, property.name);
  }

  private buyFurniture(itemId: string) {
    if (!this.house.inside) {
      this.setToast("Furniture can only be placed in your home.", 2_500);
      return;
    }
    const result = this.furniture.buy(itemId, this.inventory.money);
    if (result.ok) {
      this.inventory.money -= result.cost;
      const item = FURNITURE_CATALOG.find((entry) => entry.id === itemId);
      this.transactions.record("debit", result.cost, `Bought ${item?.name ?? "furniture"}`);
      this.panel = null;
      this.blocked = false;
      this.contextId = null;
      this.setToast(result.message, 3_500);
    } else this.setToast(result.message, 3_000);
  }

  private startNap() {
    if (!this.house.inside) {
      this.setToast("Head home before taking a nap.", 2_200);
      return;
    }
    this.panel = null;
    this.blocked = false;
    this.nap.start();
    this.setToast("Taking a nap… 15 seconds to recharge.", 2_600);
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
      this.setToast("Your one-time demo founder grant has already been claimed.", 3_000);
      return;
    }
    this.demoGrantClaimed = true;
    this.inventory.money += DEMO_GRANT;
    this.transactions.record("credit", DEMO_GRANT, "One-time demo founder grant");
    this.setToast(`Demo founder grant received · +₦${DEMO_GRANT.toLocaleString("en-NG")}`, 4_000);
    this.saveGame(false);
  }

  private enterHouse(homeId: string, homeName: string) {
    if (!this.house.enter(this.getPlayerWorldPosition(), homeId, homeName)) return;
    this.city.setVisible(false);
    this.npcs.setWorldVisible(false);
    const carBody = this.vehicle.sprite.body as Phaser.Physics.Arcade.Body;
    carBody.enable = false;
    carBody.setVelocity(0, 0);
    this.vehicle.sprite.setVisible(false);
    this.vehicle.driving = false;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.enable = true;
    playerBody.setVelocity(0, 0);
    this.player.setPosition(360, 425).setVisible(true).setTexture("player-up");
    this.interiorLayer.setVisible(true);
    this.interiorWalls.getChildren().forEach((object) => {
      const body = (object as Phaser.GameObjects.GameObject & { body?: Phaser.Physics.Arcade.StaticBody }).body;
      if (body) body.enable = true;
    });
    this.physics.world.setBounds(0, 0, 720, 500);
    this.cameras.main.setBounds(0, 0, 720, 500).setZoom(1.1).startFollow(this.player, true, 0.12, 0.12);
    this.panel = null;
    this.blocked = false;
    this.contextId = null;
    this.renderFurniture();
    this.applyAtmosphere();
    this.setToast(`Welcome to ${homeName}.`, 3_000);
  }

  private leaveHouse() {
    if (!this.house.inside) return;
    const exterior = this.house.leave();
    this.nap.cancel();
    this.interiorLayer.setVisible(false);
    this.furnitureGraphics.forEach((graphics) => graphics.setVisible(false));
    this.interiorWalls.getChildren().forEach((object) => {
      const body = (object as Phaser.GameObjects.GameObject & { body?: Phaser.Physics.Arcade.StaticBody }).body;
      if (body) body.enable = false;
    });
    this.city.setVisible(true);
    this.npcs.setWorldVisible(true);
    const carBody = this.vehicle.sprite.body as Phaser.Physics.Arcade.Body;
    carBody.enable = this.vehicle.ownsVehicle;
    this.vehicle.sprite.setVisible(this.vehicle.ownsVehicle);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.enable = true;
    playerBody.setVelocity(0, 0);
    this.player.setPosition(exterior.x, exterior.y + 6).setVisible(true).setTexture("player-down");
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT).setZoom(1.15).startFollow(this.player, true, 0.12, 0.12);
    this.panel = null;
    this.blocked = false;
    this.applyAtmosphere();
    this.setToast("Back on the street · Your home is yours to arrange.", 3_000);
    this.saveGame(false);
  }

  private createInteriorFurniture(item: FurniturePlacement) {
    const definition = FURNITURE_CATALOG.find((entry) => entry.id === item.itemId);
    if (!definition) return;
    const g = this.add.graphics({ x: item.x, y: item.y });
    const halfW = definition.width / 2;
    const halfH = definition.height / 2;
    g.fillStyle(0x27352f, 0.22).fillEllipse(0, halfH - 1, definition.width + 5, 10);
    g.fillStyle(0x433b31).fillRoundedRect(-halfW - 2, -halfH - 2, definition.width + 4, definition.height + 5, 5);
    g.fillStyle(definition.color).fillRoundedRect(-halfW, -halfH, definition.width, definition.height, 4);
    switch (item.itemId) {
      case "bed":
        g.fillStyle(0xf0dfba).fillRoundedRect(-halfW + 5, -halfH + 4, definition.width - 10, 12, 4);
        g.fillStyle(0xcce1d2).fillRoundedRect(-halfW + 6, -halfH + 18, definition.width - 12, definition.height - 22, 3);
        g.fillStyle(0xd28e63).fillRect(-halfW + 8, -halfH + 19, definition.width - 16, 5);
        break;
      case "sofa":
        g.fillStyle(0x355f56).fillRoundedRect(-halfW + 5, -halfH + 7, definition.width - 10, definition.height - 12, 5);
        g.fillStyle(0x81a495).fillRect(-4, -halfH + 9, 3, definition.height - 17);
        break;
      case "table":
        g.fillStyle(0xc89a5b).fillRoundedRect(-halfW + 4, -halfH + 5, definition.width - 8, definition.height - 10, 3);
        g.fillStyle(0x6f4e32).fillRect(-halfW + 8, halfH - 5, 5, 7).fillRect(halfW - 13, halfH - 5, 5, 7);
        break;
      case "chair":
        g.fillStyle(0x6c4d36).fillRect(-halfW + 3, -halfH + 3, definition.width - 6, 7);
        g.fillStyle(0xe3bd80).fillRect(-halfW + 5, -halfH + 12, definition.width - 10, 10);
        break;
      case "tv":
        g.fillStyle(0x172328).fillRect(-halfW + 4, -halfH + 4, definition.width - 8, definition.height - 8);
        g.fillStyle(0x9dd2c3).fillRect(-halfW + 8, -halfH + 8, definition.width - 16, definition.height - 16);
        break;
      case "refrigerator":
        g.fillStyle(0xc6d8cf).fillRect(-halfW + 5, -halfH + 4, definition.width - 10, definition.height - 8);
        g.lineStyle(2, 0x697b73).beginPath().moveTo(0, -halfH + 7).lineTo(0, halfH - 3).strokePath();
        break;
      case "air-conditioner":
        g.fillStyle(0xf3f0df).fillRoundedRect(-halfW + 4, -halfH + 3, definition.width - 8, definition.height - 6, 4);
        g.lineStyle(2, 0x809088).beginPath().moveTo(-halfW + 8, 2).lineTo(halfW - 8, 2).strokePath();
        break;
      case "plant":
        g.fillStyle(0x9b633f).fillRoundedRect(-10, 2, 20, 13, 3);
        g.fillStyle(0x598555).fillRect(-3, -halfH + 3, 6, 20).fillRect(-13, -halfH + 5, 12, 6).fillRect(2, -halfH, 13, 6);
        break;
      case "wall-art":
        g.fillStyle(0xf0dca7).fillRect(-halfW + 4, -halfH + 4, definition.width - 8, definition.height - 8);
        g.fillStyle(0xd7744c).fillRect(-halfW + 9, -halfH + 10, 7, 12);
        g.fillStyle(0x4e8b72).fillRect(3, -halfH + 8, 10, 15);
        break;
      default:
        break;
    }
    g.setRotation(Phaser.Math.DegToRad(item.rotation)).setDepth(item.y + 10);
    return g;
  }

  private renderFurniture() {
    this.furnitureGraphics.forEach((graphics) => graphics.destroy());
    this.furnitureGraphics = this.furniture.placed.map((item) => this.createInteriorFurniture(item)).filter((item): item is Phaser.GameObjects.Graphics => Boolean(item));
  }

  private updatePlacementGhost() {
    if (!this.placementGhost || !this.house?.inside || !this.furniture?.placementMode) {
      this.placementGhost?.setVisible(false);
      return;
    }
    this.placementGhost.setVisible(true);
  }

  private buyItemInStore(itemId: string) {
    const result = this.inventory.buy(itemId);
    this.setToast(result.message, 3_000);
  }

  private interactNearest() {
    if (this.nap.active) return;
    if (this.vehicle.driving) {
      this.vehicle.exit(this.player);
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      this.setToast("You stepped out of the Boro Sprint.", 2_200);
      return;
    }
    const target = this.findInteractionTarget();
    if (!target) {
      this.setToast("Nothing close enough to interact with.", 1_700);
      return;
    }
    if (target.type === "car") {
      if (this.vehicle.enter(this.player)) {
        this.cameras.main.startFollow(this.vehicle.sprite, true, 0.12, 0.12);
        this.setToast("Boro Sprint ready · Drive with WASD or the joystick.", 3_000);
      }
      return;
    }
    if (target.type === "npc" && target.npc) {
      const npc = target.npc;
      this.setToast(`${npc.name} · ${this.npcGreeting(npc.name)}`, 3_800);
      return;
    }
    if (target.type === "door") {
      this.leaveHouse();
      return;
    }
    if (target.type === "bed") {
      this.contextId = null;
      this.setPanel("nap");
      return;
    }
    if (target.type === "landmark" && target.landmark) this.interactWithLandmark(target.landmark);
  }

  private npcGreeting(name: string) {
    const greetings: Record<string, string> = {
      Chika: "fresh zobo is cold today — come by Alao Market!",
      Femi: "the taxi rank is busy after the afternoon rain.",
      Nneka: "every parcel has a story; this one is heading south.",
      Tamuno: "Nembe Towers has the best view at sunset.",
      Kene: "need a lift? take the Boro Sprint for a spin.",
      "Aunty Eno": "there's pepper soup simmering at Sisi Ada's.",
    };
    return greetings[name] ?? "good day, neighbour!";
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
        this.setPanel("property");
        return;
      }
      const owned = property ? this.properties.getForSale(property.id) : null;
      if (owned && this.properties.owns(owned.id)) this.enterHouse(owned.id, owned.name);
      return;
    }
    if (landmark.kind === "shop" || landmark.kind === "restaurant" || landmark.kind === "fuel") {
      this.contextId = landmark.id;
      this.setPanel("shop");
      return;
    }
    if (landmark.kind === "bank") {
      this.contextId = landmark.id;
      this.setPanel("bank");
      return;
    }
    if (landmark.kind === "job" && landmark.jobId) {
      const result = this.jobs.start(landmark.jobId);
      this.setToast(result.message, 3_500);
      return;
    }
    if (landmark.kind === "office") {
      this.setToast(`${landmark.name} · Check the Jobs app on your phone for local work.`, 3_500);
      this.setPanel("phone");
      return;
    }
    if (landmark.kind === "police") {
      this.setToast("Axlori Police Post · The neighbourhood is calm today.", 3_000);
      return;
    }
  }

  private findInteractionTarget(): InteractionTarget | null {
    const point = this.getPlayerWorldPosition();
    if (this.house.inside) {
      const door = { x: 360, y: 438 };
      const doorDistance = Phaser.Math.Distance.Between(point.x, point.y, door.x, door.y);
      const bed = this.furniture.nearestBed(point);
      const bedDistance = bed ? Phaser.Math.Distance.Between(point.x, point.y, bed.x, bed.y) : Infinity;
      if (doorDistance < 68 && doorDistance <= bedDistance) return { type: "door", distance: doorDistance };
      if (bed && bedDistance < 78) return { type: "bed", distance: bedDistance };
      return null;
    }
    if (this.vehicle.driving) return { type: "car", distance: 0 };
    const options: InteractionTarget[] = [];
    if (this.vehicle.ownsVehicle && this.vehicle.canEnter(point)) {
      options.push({ type: "car", distance: Phaser.Math.Distance.Between(point.x, point.y, this.vehicle.sprite.x, this.vehicle.sprite.y) });
    }
    const npc = this.npcs.nearest(point, 55);
    if (npc) options.push({ type: "npc", npc, distance: Phaser.Math.Distance.Between(point.x, point.y, npc.sprite.x, npc.sprite.y) });
    LANDMARKS.forEach((landmark) => {
      const distance = Phaser.Math.Distance.Between(point.x, point.y, landmark.entryX, landmark.entryY);
      if (distance < 72) options.push({ type: "landmark", landmark, distance });
    });
    return options.sort((a, b) => a.distance - b.distance)[0] ?? null;
  }

  private getPrompt() {
    if (this.nap.active) return "Taking a nap…";
    if (this.furniture?.placementMode && this.house?.inside) return "Tap a spot to place or move furniture";
    const target = this.findInteractionTarget();
    if (!target) return "";
    if (target.type === "car") return this.vehicle.driving ? "Press E · Exit Boro Sprint" : "Press E · Enter Boro Sprint";
    if (target.type === "npc" && target.npc) return `Press E · Talk to ${target.npc.name} · ${target.npc.role}`;
    if (target.type === "door") return "Press E · Leave your home";
    if (target.type === "bed") return "Press E · Take a nap";
    const landmark = target.landmark;
    if (!landmark) return "";
    if (landmark.kind === "house") {
      if (landmark.id === "amara-court") return `Press E · Enter ${STARTER_HOME_NAME}`;
      const property = this.properties.getForSale(landmark.id);
      if (property && !this.properties.owns(property.id)) return `Press E · House for sale · ₦${property.price.toLocaleString("en-NG")}`;
      return `Press E · Enter ${property?.name ?? landmark.name}`;
    }
    if (landmark.kind === "job" && landmark.jobId) {
      const title = this.jobs.definition(landmark.jobId)?.title ?? "job";
      return `Press E · Start ${title}`;
    }
    if (landmark.kind === "bank") return `Press E · Open ${landmark.name}`;
    if (landmark.kind === "shop" || landmark.kind === "restaurant" || landmark.kind === "fuel") return `Press E · Visit ${landmark.name}`;
    if (landmark.kind === "office") return `Press E · Browse work at ${landmark.name}`;
    return `Press E · ${landmark.name}`;
  }

  private getPlayerWorldPosition() {
    if (this.vehicle?.driving) return this.vehicle.position;
    if (this.house?.inside) return { x: this.player.x, y: this.player.y };
    return { x: this.player.x, y: this.player.y };
  }

  private getOutsidePositionForSave() {
    if (this.house?.inside) return this.house.exterior;
    if (this.vehicle?.driving) return { ...this.lastFootPosition };
    return this.getPlayerWorldPosition();
  }

  private getLocation() {
    if (this.house?.inside) return `${this.house.homeName} · Interior`;
    const pos = this.getPlayerWorldPosition();
    const nearby = LANDMARKS
      .map((landmark) => ({ landmark, distance: Phaser.Math.Distance.Between(pos.x, pos.y, landmark.entryX, landmark.entryY) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (nearby && nearby.distance < 210) return nearby.landmark.name;
    if (pos.y < 500) return "North Grove";
    if (pos.y < 1_120) return pos.x < 790 ? "Creekline Market District" : pos.x > 1_615 ? "Nembe East Ward" : "Nembe Market District";
    return pos.x < 790 ? "Green Palm Park" : "South Market Road";
  }

  private getNetWorth() {
    return this.inventory.money + this.properties.getNetWorth() + (this.vehicle.ownsVehicle ? CAR_VALUE : 0) +
      this.furniture.getValue() + this.companies.getNetWorth() + this.investments.getNetWorth();
  }

  private publishHud() {
    if (!this.player || !this.inventory) return;
    const jobState = this.jobs.getHud(this.getPlayerWorldPosition());
    const state: GameUiState = {
      ready: true,
      playerName: PLAYER_NAME,
      money: this.inventory.money,
      health: this.health,
      energy: this.energy,
      job: jobState.title,
      jobDetail: jobState.detail,
      jobProgress: jobState.progress,
      time: this.lastClockSnapshot.display,
      timeOfDay: this.lastClockSnapshot.phase,
      location: this.getLocation(),
      prompt: this.showHints && !this.panel ? this.getPrompt() : "",
      insideHouse: this.house.inside,
      houseName: this.house.homeName,
      ownsHouse: this.house.ownsHouse,
      ownsVehicle: this.vehicle.ownsVehicle,
      driving: this.vehicle.driving,
      inventory: { ...this.inventory.items },
      player: this.house.inside ? this.house.exterior : this.getPlayerWorldPosition(),
      jobTarget: jobState.target,
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
    this.game.events.emit("axlori:ui-state", state);
  }

  private setToast(message: string, durationMs = 3_000) {
    this.toast = message;
    this.toastRemainingMs = durationMs;
    this.publishHud();
  }

  private saveGame(showToast: boolean) {
    if (!this.inventory || !this.player) return;
    const saveData: SaveData = {
      version: 1,
      playerName: PLAYER_NAME,
      player: this.getOutsidePositionForSave(),
      money: this.inventory.money,
      energy: this.energy,
      currentJob: this.jobs.active ? { ...this.jobs.active } : null,
      inventory: { ...this.inventory.items },
      ownsHouse: this.house.ownsHouse,
      ownsVehicle: this.vehicle.ownsVehicle,
      vehicle: { x: this.vehicle.sprite.x, y: this.vehicle.sprite.y },
      ownedProperties: this.properties.getOwnedIds(),
      furnitureOwned: { ...this.furniture.owned },
      placedFurniture: this.furniture.placed.map((item) => ({ ...item })),
      companies: this.companies.owned.map((company) => ({ ...company })),
      investments: { ...this.investments.units },
      demoGrantClaimed: this.demoGrantClaimed,
      transactions: this.transactions.recent(20),
    };
    const ok = localSaveProvider.save(saveData);
    if (showToast) this.setToast(ok ? "Game saved on this device." : "Save unavailable · Check this browser's storage settings.", 3_000);
  }

  private cleanup() {
    if (this.commandHandler) this.game.events.off("axlori:command", this.commandHandler);
    if (this.moveHandler) this.game.events.off("axlori:virtual-input", this.moveHandler);
  }
}
