"use client";

import { useEffect, useRef } from "react";
import type * as Phaser from "phaser";
import type { GameCommand, GameCommandApi, GameUiState } from "@/game/types";

type Props = {
  onState: (state: GameUiState) => void;
  onApi: (api: GameCommandApi | null) => void;
  onError: (message: string) => void;
};

export default function GameCanvas({ onState, onApi, onError }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let cancelled = false;
    let uiHandler: ((state: GameUiState) => void) | null = null;

    async function boot() {
      try {
        const [PhaserModule, { GameScene }] = await Promise.all([
          import("phaser"),
          import("@/game/GameScene"),
        ]);
        if (cancelled || !mountRef.current) return;

        game = new PhaserModule.Game({
          type: PhaserModule.AUTO,
          parent: mountRef.current,
          backgroundColor: "#a9b879",
          width: 960,
          height: 540,
          pixelArt: true,
          roundPixels: true,
          antialias: false,
          scale: {
            mode: PhaserModule.Scale.RESIZE,
            autoCenter: PhaserModule.Scale.CENTER_BOTH,
            width: 960,
            height: 540,
          },
          physics: {
            default: "arcade",
            arcade: {
              debug: false,
              gravity: { x: 0, y: 0 },
              fps: 60,
            },
          },
          render: {
            pixelArt: true,
            roundPixels: true,
            antialias: false,
            powerPreference: "low-power",
          },
          input: {
            activePointers: 3,
            smoothFactor: 0,
          },
          scene: [GameScene],
        });

        const command = (value: GameCommand) => game?.events.emit("axlori:command", value);
        const api: GameCommandApi = {
          command,
          move: (x, y) => game?.events.emit("axlori:virtual-input", { x, y }),
        };
        onApi(api);
        uiHandler = (state) => onState(state);
        game.events.on("axlori:ui-state", uiHandler);
      } catch (error) {
        const message = error instanceof Error ? error.message : "The game could not start.";
        onError(message);
      }
    }

    void boot();
    return () => {
      cancelled = true;
      onApi(null);
      if (game && uiHandler) game.events.off("axlori:ui-state", uiHandler);
      game?.destroy(true);
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, [onApi, onError, onState]);

  return <div className="absolute inset-0 overflow-hidden bg-[#a9b879]" ref={mountRef} aria-label="Axlori City 2D game" />;
}
