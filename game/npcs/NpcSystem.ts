import * as Phaser from "phaser";

export interface NpcCharacter {
  name: string;
  role: string;
  sprite: Phaser.Physics.Arcade.Sprite;
  route: Array<{ x: number; y: number }>;
  waypoint: number;
  pauseMs: number;
  speed: number;
}

const NPC_SEEDS = [
  { name: "Chika", role: "market seller", x: 470, y: 890, color: 0xd98959, route: [{ x: 470, y: 890 }, { x: 700, y: 890 }, { x: 700, y: 970 }, { x: 490, y: 970 }] },
  { name: "Femi", role: "bus conductor", x: 680, y: 610, color: 0x4b91a3, route: [{ x: 680, y: 610 }, { x: 900, y: 610 }, { x: 920, y: 665 }, { x: 650, y: 665 }] },
  { name: "Nneka", role: "courier", x: 1250, y: 970, color: 0xd5a644, route: [{ x: 1250, y: 970 }, { x: 1480, y: 970 }, { x: 1480, y: 1015 }, { x: 1250, y: 1015 }] },
  { name: "Tamuno", role: "neighbour", x: 1810, y: 915, color: 0x7f69a4, route: [{ x: 1810, y: 915 }, { x: 2020, y: 915 }, { x: 2020, y: 980 }, { x: 1810, y: 980 }] },
  { name: "Kene", role: "taxi driver", x: 780, y: 1450, color: 0x4e9a6e, route: [{ x: 780, y: 1450 }, { x: 880, y: 1450 }, { x: 880, y: 1530 }, { x: 780, y: 1530 }] },
  { name: "Aunty Eno", role: "cook", x: 1420, y: 940, color: 0xc66a73, route: [{ x: 1420, y: 940 }, { x: 1530, y: 940 }, { x: 1530, y: 1020 }, { x: 1420, y: 1020 }] },
];

function makeNpcTexture(scene: Phaser.Scene, key: string, shirt: number, skin: number) {
  if (scene.textures.exists(key)) return;
  const graphics = scene.add.graphics();
  graphics.fillStyle(0x26342c, 0.3).fillEllipse(16, 35, 19, 6);
  graphics.fillStyle(0x343238).fillRect(9, 27, 6, 8).fillRect(18, 27, 6, 8);
  graphics.fillStyle(0x8a5544).fillRect(8, 32, 8, 3).fillRect(17, 32, 8, 3);
  graphics.fillStyle(shirt).fillRect(7, 14, 18, 15);
  graphics.fillStyle(shirt - 0x15100a).fillRect(7, 26, 18, 3);
  graphics.fillStyle(skin).fillRect(4, 16, 4, 10).fillRect(24, 16, 4, 10);
  graphics.fillStyle(skin).fillRect(10, 5, 12, 12);
  graphics.fillStyle(0x30221e).fillRect(9, 3, 14, 5).fillRect(8, 6, 3, 7);
  graphics.fillStyle(0x251c1a).fillRect(12, 10, 2, 2).fillRect(19, 10, 2, 2);
  graphics.fillStyle(0xe7b798).fillRect(14, 13, 5, 1);
  graphics.generateTexture(key, 32, 38);
  graphics.destroy();
}

export class NpcSystem {
  readonly characters: NpcCharacter[] = [];
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup) {
    this.scene = scene;
    NPC_SEEDS.forEach((seed, index) => {
      const key = `npc-${index}`;
      makeNpcTexture(scene, key, seed.color, index % 2 === 0 ? 0x9c674a : 0x744c3d);
      const sprite = scene.physics.add.sprite(seed.x, seed.y, key);
      sprite.setDepth(seed.y + 3);
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      body.setSize(15, 14).setOffset(8, 21);
      body.setCollideWorldBounds(true);
      body.setBounce(0);
      const character: NpcCharacter = {
        name: seed.name,
        role: seed.role,
        sprite,
        route: seed.route,
        waypoint: 1,
        pauseMs: Phaser.Math.Between(700, 2_200),
        speed: 34 + index * 3,
      };
      this.characters.push(character);
      scene.physics.add.collider(sprite, obstacles, () => this.pauseAndReroute(character));
    });
  }

  update(deltaMs: number, enabled = true) {
    this.characters.forEach((character) => {
      const body = character.sprite.body as Phaser.Physics.Arcade.Body;
      if (!enabled || !character.sprite.active || !character.sprite.visible) {
        body.setVelocity(0, 0);
        return;
      }
      if (character.pauseMs > 0) {
        character.pauseMs = Math.max(0, character.pauseMs - deltaMs);
        body.setVelocity(0, 0);
        character.sprite.setDepth(character.sprite.y + 3);
        return;
      }
      const target = character.route[character.waypoint];
      const dx = target.x - character.sprite.x;
      const dy = target.y - character.sprite.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 12) {
        character.waypoint = (character.waypoint + 1) % character.route.length;
        character.pauseMs = Phaser.Math.Between(900, 2_700);
        body.setVelocity(0, 0);
      } else {
        body.setVelocity((dx / distance) * character.speed, (dy / distance) * character.speed);
      }
      character.sprite.setDepth(character.sprite.y + 3);
    });
  }

  private pauseAndReroute(character: NpcCharacter) {
    character.pauseMs = 550;
    character.waypoint = (character.waypoint + 1) % character.route.length;
  }

  nearest(position: { x: number; y: number }, maxDistance: number) {
    let nearest: NpcCharacter | null = null;
    let best = maxDistance;
    for (const character of this.characters) {
      if (!character.sprite.visible || !character.sprite.active) continue;
      const distance = Phaser.Math.Distance.Between(position.x, position.y, character.sprite.x, character.sprite.y);
      if (distance < best) {
        best = distance;
        nearest = character;
      }
    }
    return nearest;
  }

  setWorldVisible(visible: boolean) {
    this.characters.forEach((character) => {
      character.sprite.setVisible(visible);
      const body = character.sprite.body as Phaser.Physics.Arcade.Body;
      body.enable = visible;
      if (!visible) body.setVelocity(0, 0);
    });
  }
}
