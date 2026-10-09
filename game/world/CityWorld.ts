import * as Phaser from "phaser";
import { LANDMARKS, WORLD_HEIGHT, WORLD_WIDTH, type Landmark } from "@/game/world/landmarks";

const BUILDING_PALETTES: Record<Landmark["style"], { wall: number; shade: number; roof: number; trim: number }> = {
  home: { wall: 0xe8c88f, shade: 0xb87a56, roof: 0x994d3d, trim: 0x31584c },
  apartment: { wall: 0xd8b875, shade: 0x98704e, roof: 0x376e68, trim: 0x25534e },
  shop: { wall: 0xf0cb75, shade: 0xb88443, roof: 0x2f7165, trim: 0xc55e43 },
  restaurant: { wall: 0xe8b984, shade: 0xb77a58, roof: 0xb84f3e, trim: 0x315e55 },
  bank: { wall: 0xcabf91, shade: 0x797c63, roof: 0x315c50, trim: 0xb28b47 },
  police: { wall: 0xc9d1bd, shade: 0x728178, roof: 0x456c79, trim: 0xe4ae58 },
  office: { wall: 0xc5d0bc, shade: 0x7d8d80, roof: 0x486e78, trim: 0xdca44a },
  fuel: { wall: 0xd8d3a3, shade: 0x8b8965, roof: 0x397d80, trim: 0xe7a546 },
  depot: { wall: 0xd5b879, shade: 0x90704b, roof: 0x527263, trim: 0xd28145 },
};

export class CityWorld {
  readonly scene: Phaser.Scene;
  readonly obstacles: Phaser.Physics.Arcade.StaticGroup;
  readonly groundLayer: Phaser.GameObjects.Container;
  readonly scenery: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.obstacles = scene.physics.add.staticGroup();
    this.groundLayer = scene.add.container(0, 0).setDepth(-100);
    this.drawGround();
    this.createBuildingTextures();
    this.drawLandmarks();
    this.addStreetLabels();
    this.addMapEdgeObstacles();
  }

  private drawGround() {
    const g = this.scene.add.graphics();
    g.fillStyle(0xa9b879).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    g.fillStyle(0xb7c185, 0.42).fillRect(0, 0, WORLD_WIDTH, 490);
    g.fillStyle(0xa5b276, 0.4).fillRect(0, 600, WORLD_WIDTH, 490);
    g.fillStyle(0xb0ba7c, 0.38).fillRect(0, 1_205, WORLD_WIDTH, WORLD_HEIGHT - 1_205);

    // Sparse, fixed flecks keep the open ground from feeling like a flat plane without taxing mobile GPUs.
    let seed = 43;
    const random = () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return seed / 4_294_967_296;
    };
    for (let index = 0; index < 250; index += 1) {
      const x = 16 + random() * (WORLD_WIDTH - 32);
      const y = 16 + random() * (WORLD_HEIGHT - 32);
      const color = index % 2 === 0 ? 0x7e9b64 : 0xd0c78c;
      g.fillStyle(color, 0.22).fillRect(Math.floor(x / 4) * 4, Math.floor(y / 4) * 4, 4, 3);
    }

    // A compact park patch with looping paths, planted before the street grid.
    g.fillStyle(0xc7c29c).fillRoundedRect(86, 1_278, 405, 340, 22);
    g.fillStyle(0x6f9b69).fillRoundedRect(100, 1_292, 377, 312, 18);
    g.lineStyle(8, 0xd5c995, 0.95).strokeRoundedRect(112, 1_304, 353, 288, 16);
    g.lineStyle(6, 0xd4c58f, 0.9).beginPath().moveTo(126, 1_444).lineTo(440, 1_444).strokePath();
    g.lineStyle(6, 0xd4c58f, 0.9).beginPath().moveTo(281, 1_315).lineTo(281, 1_585).strokePath();
    g.fillStyle(0x8eb276).fillEllipse(281, 1_445, 125, 106);
    g.fillStyle(0x6e9063).fillRoundedRect(225, 1_520, 56, 10, 3);
    g.fillStyle(0x4d5943).fillRect(232, 1_530, 5, 10).fillRect(269, 1_530, 5, 10);
    this.groundLayer.add(g);

    this.drawHorizontalRoad(500);
    this.drawHorizontalRoad(1_120);
    this.drawVerticalRoad(790);
    this.drawVerticalRoad(1_615);
    this.drawCrossings();

    // Faded footpaths leading from doorways toward the nearest street.
    const paths = this.scene.add.graphics();
    paths.fillStyle(0xc9c39d, 0.72);
    LANDMARKS.forEach((landmark) => {
      if (landmark.id === "taxi-rank") return;
      paths.fillRect(landmark.x - 13, landmark.y + 57, 26, 47);
    });
    this.groundLayer.add(paths);
  }

  private drawHorizontalRoad(y: number) {
    const g = this.scene.add.graphics();
    g.fillStyle(0xc9c4a4).fillRect(0, y - 61, WORLD_WIDTH, 122);
    g.fillStyle(0x9c9d83).fillRect(0, y - 50, WORLD_WIDTH, 100);
    g.fillStyle(0x474b49).fillRect(0, y - 43, WORLD_WIDTH, 86);
    g.fillStyle(0x3d4140, 0.55).fillRect(0, y - 43, WORLD_WIDTH, 4).fillRect(0, y + 39, WORLD_WIDTH, 4);
    for (let x = 32; x < WORLD_WIDTH - 20; x += 82) {
      g.fillStyle(0xe8bd58, 0.88).fillRect(x, y - 2, 35, 4);
    }
    g.lineStyle(2, 0xd6d3bd, 0.65).beginPath().moveTo(0, y - 31).lineTo(WORLD_WIDTH, y - 31).strokePath();
    g.lineStyle(2, 0xd6d3bd, 0.65).beginPath().moveTo(0, y + 31).lineTo(WORLD_WIDTH, y + 31).strokePath();
    this.groundLayer.add(g);
  }

  private drawVerticalRoad(x: number) {
    const g = this.scene.add.graphics();
    g.fillStyle(0xc9c4a4).fillRect(x - 61, 0, 122, WORLD_HEIGHT);
    g.fillStyle(0x9c9d83).fillRect(x - 50, 0, 100, WORLD_HEIGHT);
    g.fillStyle(0x474b49).fillRect(x - 43, 0, 86, WORLD_HEIGHT);
    g.fillStyle(0x3d4140, 0.55).fillRect(x - 43, 0, 4, WORLD_HEIGHT).fillRect(x + 39, 0, 4, WORLD_HEIGHT);
    for (let y = 30; y < WORLD_HEIGHT - 20; y += 82) {
      g.fillStyle(0xe8bd58, 0.88).fillRect(x - 2, y, 4, 35);
    }
    g.lineStyle(2, 0xd6d3bd, 0.65).beginPath().moveTo(x - 31, 0).lineTo(x - 31, WORLD_HEIGHT).strokePath();
    g.lineStyle(2, 0xd6d3bd, 0.65).beginPath().moveTo(x + 31, 0).lineTo(x + 31, WORLD_HEIGHT).strokePath();
    this.groundLayer.add(g);
  }

  private drawCrossings() {
    const g = this.scene.add.graphics();
    [790, 1_615].forEach((x) => {
      [500, 1_120].forEach((y) => {
        for (let stripe = -4; stripe <= 4; stripe += 1) {
          g.fillStyle(0xe8e1c9, 0.84).fillRect(x - 37 + stripe * 9, y - 40, 5, 19);
          g.fillStyle(0xe8e1c9, 0.84).fillRect(x - 37 + stripe * 9, y + 21, 5, 19);
          g.fillStyle(0xe8e1c9, 0.84).fillRect(x - 40, y - 37 + stripe * 9, 19, 5);
          g.fillStyle(0xe8e1c9, 0.84).fillRect(x + 21, y - 37 + stripe * 9, 19, 5);
        }
      });
    });
    this.groundLayer.add(g);
  }

  private createBuildingTextures() {
    const styles = Object.keys(BUILDING_PALETTES) as Landmark["style"][];
    styles.forEach((style) => {
      const key = `building-${style}`;
      if (this.scene.textures.exists(key)) return;
      const palette = BUILDING_PALETTES[style];
      const g = this.scene.add.graphics();
      g.fillStyle(0x29372d, 0.24).fillEllipse(80, 112, 140, 22);
      g.fillStyle(palette.shade).fillRect(16, 41, 128, 61);
      g.fillStyle(palette.wall).fillRect(20, 35, 120, 64);
      g.fillStyle(palette.shade, 0.45).fillRect(20, 82, 120, 17);
      g.fillStyle(palette.roof).fillRect(11, 22, 138, 42);
      g.fillStyle(palette.roof).fillRect(19, 12, 122, 44);
      g.fillStyle(palette.trim).fillRect(25, 15, 110, 6);
      g.fillStyle(0xf1d28d, 0.32).fillRect(22, 54, 116, 4);
      g.fillStyle(0x38493e).fillRect(21, 97, 118, 5);

      if (style === "apartment" || style === "office") {
        for (let row = 0; row < 2; row += 1) {
          for (let col = 0; col < 4; col += 1) {
            g.fillStyle(0x304a4c).fillRect(31 + col * 27, 35 + row * 22, 15, 11);
            g.fillStyle(0xaad0bf, 0.7).fillRect(33 + col * 27, 37 + row * 22, 5, 7);
          }
        }
        g.fillStyle(palette.trim).fillRect(17, 78, 126, 4);
      } else if (style === "shop" || style === "restaurant" || style === "fuel") {
        g.fillStyle(palette.trim).fillRect(23, 54, 114, 9);
        for (let col = 0; col < 8; col += 1) {
          g.fillStyle(col % 2 === 0 ? 0xffdc89 : palette.trim).fillRect(24 + col * 14, 54, 7, 9);
        }
        g.fillStyle(0x294d47).fillRect(29, 68, 31, 24).fillRect(101, 68, 25, 24);
        g.fillStyle(0xb7d5bf, 0.82).fillRect(33, 72, 22, 16).fillRect(104, 72, 19, 16);
      } else if (style === "bank") {
        g.fillStyle(0x6a755f).fillRect(28, 54, 104, 6);
        for (let col = 0; col < 4; col += 1) {
          g.fillStyle(0xddd2ad).fillRect(34 + col * 26, 57, 7, 36);
          g.fillStyle(0x667966).fillRect(36 + col * 26, 60, 3, 30);
        }
      } else if (style === "police") {
        g.fillStyle(0x426d7a).fillRect(29, 62, 33, 29).fillRect(98, 62, 30, 29);
        g.fillStyle(0xd5dfc9).fillRect(34, 67, 23, 19).fillRect(103, 67, 20, 19);
        g.fillStyle(0xe4ae58).fillRect(75, 31, 10, 10).fillRect(70, 44, 20, 4);
      } else if (style === "depot") {
        g.fillStyle(0x304d46).fillRect(28, 65, 103, 27);
        g.fillStyle(0xa7c6b2).fillRect(34, 70, 25, 15).fillRect(100, 70, 24, 15);
        g.fillStyle(0x3a5448).fillRect(68, 68, 23, 31);
      } else if (style === "home") {
        g.fillStyle(0x365b4f).fillRect(29, 68, 33, 19).fillRect(100, 68, 30, 19);
        g.fillStyle(0xc2d7b8).fillRect(33, 71, 24, 13).fillRect(104, 71, 22, 13);
      }
      g.fillStyle(0x47372d).fillRect(71, 78, 18, 22);
      g.fillStyle(0xe9ba68).fillRect(75, 84, 3, 3);
      g.fillStyle(palette.trim).fillRect(12, 99, 136, 5);
      g.generateTexture(key, 160, 120);
      g.destroy();
    });
  }

  private drawLandmarks() {
    LANDMARKS.forEach((landmark) => {
      if (landmark.id === "taxi-rank") {
        this.drawTaxiRank(landmark);
        return;
      }
      const image = this.scene.add.image(landmark.x, landmark.y, `building-${landmark.style}`);
      image.setDepth(landmark.y + 30);
      this.scenery.push(image);

      const label = this.scene.add.text(landmark.x, landmark.y + 66, landmark.name.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#263b32",
        backgroundColor: "#e7d6a5",
        padding: { x: 5, y: 3 },
        align: "center",
      });
      label.setOrigin(0.5, 0.5).setDepth(landmark.y + 74);
      this.scenery.push(label);
      this.addObstacle(landmark.x, landmark.y + 30, landmark.style === "office" ? 132 : 126, 45);

      if (landmark.style === "fuel") this.drawFuelPumps(landmark.x, landmark.y + 91);
      if (landmark.style === "shop" && landmark.id === "alao-market") this.drawMarketStalls();
      if (landmark.id === "amara-court") this.drawPlanters(landmark.x, landmark.y + 80);
    });
    this.drawParkTrees();
    this.drawRoadsideTrees();
  }

  private drawTaxiRank(landmark: Landmark) {
    const g = this.scene.add.graphics({ x: landmark.x - 56, y: landmark.y - 36 });
    g.fillStyle(0x30463c, 0.28).fillEllipse(59, 56, 120, 25);
    g.fillStyle(0x876c47).fillRect(13, 18, 90, 9);
    g.fillStyle(0xe2b955).fillRect(8, 9, 100, 11);
    g.fillStyle(0x3b6056).fillRect(17, 20, 6, 36).fillRect(94, 20, 6, 36);
    g.fillStyle(0x805c3f).fillRect(28, 36, 57, 9);
    g.fillStyle(0x445347).fillRect(34, 45, 5, 11).fillRect(76, 45, 5, 11);
    g.fillStyle(0xeee0b9).fillRect(27, 0, 59, 13);
    g.fillStyle(0x38554d).fillRect(32, 3, 49, 7);
    g.fillStyle(0xf3d37a).fillRect(40, 5, 3, 3).fillRect(48, 5, 3, 3).fillRect(56, 5, 3, 3);
    g.setDepth(landmark.y + 20);
    this.scenery.push(g);
    const label = this.scene.add.text(landmark.x, landmark.y + 32, "RIVERSIDE TAXI RANK", {
      fontFamily: "monospace", fontSize: "10px", fontStyle: "bold", color: "#263b32", backgroundColor: "#e7d6a5", padding: { x: 5, y: 3 },
    }).setOrigin(0.5).setDepth(landmark.y + 48);
    this.scenery.push(label);
  }

  private drawFuelPumps(x: number, y: number) {
    const g = this.scene.add.graphics({ x: x - 50, y: y - 14 });
    g.fillStyle(0x3d5950).fillRect(1, 11, 20, 29).fillRect(72, 11, 20, 29);
    g.fillStyle(0xe4ac4a).fillRect(4, 14, 14, 21).fillRect(75, 14, 14, 21);
    g.fillStyle(0xf2dfa7).fillRect(7, 17, 8, 6).fillRect(78, 17, 8, 6);
    g.fillStyle(0x34483e).fillRect(43, 17, 17, 27);
    g.fillStyle(0x5d8271).fillRect(45, 19, 13, 11);
    g.setDepth(y + 20);
    this.scenery.push(g);
    this.addObstacle(x - 39, y + 8, 23, 22);
    this.addObstacle(x + 39, y + 8, 23, 22);
  }

  private drawMarketStalls() {
    const g = this.scene.add.graphics({ x: 365, y: 865 });
    const stallColors = [0xc96648, 0x477d6a, 0xd5a843];
    stallColors.forEach((color, index) => {
      const x = index * 65;
      g.fillStyle(0x554533).fillRect(x + 7, 22, 45, 28);
      g.fillStyle(color).fillRect(x, 13, 58, 10);
      g.fillStyle(0xf1d48d).fillRect(x + 5, 23, 49, 4);
      g.fillStyle(0x31473b).fillRect(x + 10, 50, 5, 7).fillRect(x + 44, 50, 5, 7);
    });
    g.setDepth(910);
    this.scenery.push(g);
    this.addObstacle(395, 901, 46, 28);
    this.addObstacle(460, 901, 46, 28);
    this.addObstacle(525, 901, 46, 28);
  }

  private drawPlanters(x: number, y: number) {
    const g = this.scene.add.graphics({ x: x - 78, y: y - 8 });
    g.fillStyle(0x9a6843).fillRect(0, 20, 31, 12).fillRect(125, 20, 31, 12);
    g.fillStyle(0x5e8a53).fillRect(4, 8, 23, 15).fillRect(129, 8, 23, 15);
    g.fillStyle(0x8eaa62).fillRect(7, 3, 16, 12).fillRect(132, 3, 16, 12);
    g.setDepth(y + 10);
    this.scenery.push(g);
    this.addObstacle(x - 62, y + 10, 26, 12);
    this.addObstacle(x + 62, y + 10, 26, 12);
  }

  private drawParkTrees() {
    [
      [142, 1_365], [208, 1_335], [350, 1_355], [430, 1_510], [160, 1_550], [355, 1_570],
    ].forEach(([x, y], index) => this.addTree(x, y, index % 2 === 0 ? 1 : 0));
  }

  private drawRoadsideTrees() {
    [
      [170, 640], [430, 640], [1_500, 640], [2_300, 640], [920, 1_030], [1_830, 1_035], [930, 1_560], [2_280, 1_520],
    ].forEach(([x, y], index) => this.addTree(x, y, index % 2));
  }

  private addTree(x: number, y: number, variant: number) {
    const g = this.scene.add.graphics({ x, y });
    g.fillStyle(0x324232, 0.25).fillEllipse(0, 19, 49, 19);
    g.fillStyle(0x745640).fillRect(-5, 3, 10, 24);
    g.fillStyle(variant ? 0x5e8855 : 0x4e7e52).fillRect(-17, -16, 34, 29);
    g.fillStyle(variant ? 0x81a563 : 0x76a05d).fillRect(-11, -24, 24, 18);
    g.fillStyle(0x9eb870, 0.8).fillRect(-5, -20, 9, 7);
    g.setDepth(y + 20);
    this.scenery.push(g);
    this.addObstacle(x, y + 13, 18, 14);
  }

  private addStreetLabels() {
    const labels = [
      { x: 330, y: 479, text: "UMU ILA WAY" },
      { x: 1_260, y: 1_099, text: "NEMBE MARKET ROAD" },
      { x: 805, y: 890, text: "CREEKLINE AVENUE" },
      { x: 1_630, y: 1_480, text: "PALM STREET" },
    ];
    labels.forEach((entry) => {
      const text = this.scene.add.text(entry.x, entry.y, entry.text, {
        fontFamily: "monospace", fontSize: "10px", fontStyle: "bold", color: "#efe5c5", backgroundColor: "#545957", padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setDepth(4);
      this.scenery.push(text);
    });
  }

  private addMapEdgeObstacles() {
    this.addObstacle(WORLD_WIDTH / 2, -12, WORLD_WIDTH, 24);
    this.addObstacle(WORLD_WIDTH / 2, WORLD_HEIGHT + 12, WORLD_WIDTH, 24);
    this.addObstacle(-12, WORLD_HEIGHT / 2, 24, WORLD_HEIGHT);
    this.addObstacle(WORLD_WIDTH + 12, WORLD_HEIGHT / 2, 24, WORLD_HEIGHT);
  }

  private addObstacle(x: number, y: number, width: number, height: number) {
    const object = this.scene.add.rectangle(x, y, width, height, 0xffffff, 0);
    this.scene.physics.add.existing(object, true);
    object.setVisible(false);
    this.obstacles.add(object);
  }

  setVisible(visible: boolean) {
    this.groundLayer.setVisible(visible);
    this.scenery.forEach((object) => { (object as Phaser.GameObjects.GameObject & { visible: boolean }).visible = visible; });
    this.obstacles.getChildren().forEach((object) => {
      const body = (object as Phaser.GameObjects.GameObject & { body?: Phaser.Physics.Arcade.StaticBody }).body;
      if (body) body.enable = visible;
    });
  }
}
