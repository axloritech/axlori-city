import * as Phaser from "phaser";

function drawCharacter(scene: Phaser.Scene, key: string, facing: "up" | "down" | "side", shirt: number, hair: number, skin: number) {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.fillStyle(0x26352d, 0.28).fillEllipse(16, 36, 21, 6);
  g.fillStyle(0x282b33).fillRect(9, 28, 6, 7).fillRect(18, 28, 6, 7);
  g.fillStyle(0xf1d4a1).fillRect(7, 33, 9, 3).fillRect(17, 33, 9, 3);
  g.fillStyle(0x28534a).fillRect(7, 17, 18, 13);
  g.fillStyle(shirt).fillRect(8, 15, 16, 12);
  g.fillStyle(shirt - 0x14120a).fillRect(7, 25, 18, 4);
  g.fillStyle(skin).fillRect(4, 18, 4, 9).fillRect(24, 18, 4, 9);
  g.fillStyle(skin).fillRect(10, 6, 12, 12);
  if (facing === "up") {
    g.fillStyle(hair).fillRect(8, 3, 16, 12).fillRect(7, 8, 3, 8).fillRect(22, 8, 3, 8);
    g.fillStyle(0x263329).fillRect(9, 14, 14, 3);
  } else if (facing === "side") {
    g.fillStyle(hair).fillRect(9, 3, 14, 6).fillRect(8, 6, 4, 7).fillRect(19, 5, 5, 5);
    g.fillStyle(0x33231c).fillRect(17, 10, 2, 2);
    g.fillStyle(0x432d26).fillRect(17, 14, 4, 1);
  } else {
    g.fillStyle(hair).fillRect(8, 3, 16, 6).fillRect(7, 6, 4, 8).fillRect(21, 6, 4, 8);
    g.fillStyle(0x2c201c).fillRect(11, 10, 2, 2).fillRect(19, 10, 2, 2);
    g.fillStyle(0xf2c2a0).fillRect(14, 14, 5, 1);
  }
  g.fillStyle(0xefa365).fillRect(8, 19, 2, 2).fillRect(22, 19, 2, 2);
  g.generateTexture(key, 32, 40);
  g.destroy();
}

export function createPlayerTextures(scene: Phaser.Scene) {
  drawCharacter(scene, "player-down", "down", 0xe7774b, 0x241d1d, 0x9b6448);
  drawCharacter(scene, "player-up", "up", 0xe7774b, 0x241d1d, 0x9b6448);
  drawCharacter(scene, "player-side", "side", 0xe7774b, 0x241d1d, 0x9b6448);
}
