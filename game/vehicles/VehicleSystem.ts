import * as Phaser from "phaser";

export class VehicleSystem {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly ownsVehicle: boolean;
  driving = false;

  constructor(sprite: Phaser.Physics.Arcade.Sprite, ownsVehicle = true) {
    this.sprite = sprite;
    this.ownsVehicle = ownsVehicle;
  }

  canEnter(position: { x: number; y: number }) {
    return this.ownsVehicle && !this.driving && Phaser.Math.Distance.Between(position.x, position.y, this.sprite.x, this.sprite.y) < 66;
  }

  enter(player: Phaser.Physics.Arcade.Sprite) {
    if (!this.ownsVehicle || this.driving) return false;
    this.driving = true;
    player.setVisible(false);
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;
    return true;
  }

  exit(player: Phaser.Physics.Arcade.Sprite) {
    if (!this.driving) return;
    this.driving = false;
    const offset = this.sprite.flipX ? -34 : 34;
    player.enableBody(true, this.sprite.x + offset, this.sprite.y + 18, true, true);
    player.setVisible(true);
    player.setDepth(player.y + 4);
  }

  get position() {
    return { x: this.sprite.x, y: this.sprite.y };
  }
}
