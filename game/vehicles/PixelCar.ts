import * as Phaser from "phaser";

export function createVehicleTexture(scene: Phaser.Scene) {
  if (scene.textures.exists("boro-sprint")) return;
  const g = scene.add.graphics();
  g.fillStyle(0x24332c, 0.3).fillEllipse(32, 22, 56, 25);
  g.fillStyle(0x24292c).fillRect(7, 8, 9, 8).fillRect(48, 8, 9, 8).fillRect(7, 25, 9, 8).fillRect(48, 25, 9, 8);
  g.fillStyle(0xe3a33e).fillRoundedRect(10, 2, 44, 36, 8);
  g.fillStyle(0x80522e).fillRoundedRect(14, 5, 36, 29, 6);
  g.fillStyle(0x90b8b2).fillRoundedRect(17, 8, 30, 10, 4);
  g.fillStyle(0x44726f).fillRoundedRect(17, 21, 30, 9, 3);
  g.fillStyle(0xf5d47d).fillRect(17, 2, 30, 3);
  g.fillStyle(0xffe4a1).fillRect(17, 34, 6, 2).fillRect(41, 34, 6, 2);
  g.fillStyle(0xb64637).fillRect(17, 4, 5, 2).fillRect(42, 4, 5, 2);
  g.fillStyle(0xd38135).fillRect(30, 9, 4, 20);
  g.generateTexture("boro-sprint", 64, 40);
  g.destroy();
}
