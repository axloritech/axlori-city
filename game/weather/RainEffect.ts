import * as Phaser from "phaser";

interface Drop {
  x: number;
  y: number;
  speed: number;
  length: number;
}

/** A tiny pooled screen-space particle pass; intentionally avoids a heavy emitter on phones. */
export class RainEffect {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private drops: Drop[] = [];
  private active = false;
  private width = 0;
  private height = 0;

  constructor(private readonly scene: Phaser.Scene, count = 54) {
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(1_000_001).setVisible(false);
    this.resize(scene.scale.width, scene.scale.height);
    this.drops = Array.from({ length: count }, () => this.makeDrop(true));
  }

  resize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    if (!this.drops.length) return;
    this.drops.forEach((drop) => {
      drop.x = Math.random() * this.width;
      drop.y = Math.random() * this.height;
    });
  }

  setActive(active: boolean) {
    this.active = active;
    this.graphics.setVisible(active);
    if (!active) this.graphics.clear();
  }

  update(deltaMs: number) {
    if (!this.active) return;
    const deltaSeconds = Math.min(deltaMs, 50) / 1_000;
    this.graphics.clear();
    this.graphics.lineStyle(1.25, 0xdbe9ec, 0.42);
    this.drops.forEach((drop) => {
      drop.x -= deltaSeconds * 58;
      drop.y += deltaSeconds * drop.speed;
      if (drop.y > this.height + drop.length || drop.x < -10) Object.assign(drop, this.makeDrop(false));
      this.graphics.lineBetween(drop.x, drop.y, drop.x - 3, drop.y + drop.length);
    });
  }

  private makeDrop(initial: boolean): Drop {
    return {
      x: Math.random() * this.width,
      y: initial ? Math.random() * this.height : -10 - Math.random() * 28,
      speed: 300 + Math.random() * 240,
      length: 6 + Math.random() * 9,
    };
  }
}
