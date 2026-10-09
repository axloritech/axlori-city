import * as Phaser from "phaser";

export class PlayerController {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd: Record<string, Phaser.Input.Keyboard.Key>;
  private virtualX = 0;
  private virtualY = 0;
  private lastFacing: "up" | "down" | "side" = "down";
  private direction = { x: 0, y: 0 };

  get movementVector() {
    return { ...this.direction };
  }

  constructor(scene: Phaser.Scene, sprite: Phaser.Physics.Arcade.Sprite) {
    this.sprite = sprite;
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error("A keyboard input manager is required for the player controller.");
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys({ up: "W", down: "S", left: "A", right: "D" }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  setVirtualInput(x: number, y: number) {
    this.virtualX = Phaser.Math.Clamp(x, -1, 1);
    this.virtualY = Phaser.Math.Clamp(y, -1, 1);
  }

  update(deltaMs: number, speed: number, enabled = true) {
    const keyboardX = Number(this.cursors.right.isDown || this.wasd.right.isDown) - Number(this.cursors.left.isDown || this.wasd.left.isDown);
    const keyboardY = Number(this.cursors.down.isDown || this.wasd.down.isDown) - Number(this.cursors.up.isDown || this.wasd.up.isDown);
    let x = enabled ? Phaser.Math.Clamp(keyboardX + this.virtualX, -1, 1) : 0;
    let y = enabled ? Phaser.Math.Clamp(keyboardY + this.virtualY, -1, 1) : 0;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    this.direction = { x, y };

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const blend = Math.min(1, Math.max(0.08, deltaMs / 48));
    const targetX = x * speed;
    const targetY = y * speed;
    body.setVelocity(
      Phaser.Math.Linear(body.velocity.x, targetX, blend),
      Phaser.Math.Linear(body.velocity.y, targetY, blend),
    );

    if (length > 0.08 && enabled) {
      if (Math.abs(x) > Math.abs(y)) {
        this.lastFacing = "side";
        this.sprite.setTexture("player-side").setFlipX(x < 0);
      } else {
        this.lastFacing = y < 0 ? "up" : "down";
        this.sprite.setTexture(`player-${this.lastFacing}`).setFlipX(false);
      }
    } else {
      this.sprite.setTexture(`player-${this.lastFacing}`);
    }

    return length > 0.08 && enabled;
  }
}
