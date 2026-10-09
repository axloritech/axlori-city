"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import type { GameCommandApi, GameUiState } from "@/game/types";

type Props = {
  onState: (state: GameUiState) => void;
  onApi: (api: GameCommandApi | null) => void;
  onError: (message: string) => void;
};

const GameCanvasInner = dynamic(() => import("@/components/GameCanvasInner"), {
  ssr: false,
  loading: () => <div className="game-canvas-loading" aria-hidden="true" />,
});

function GameCanvas(props: Props) {
  return <GameCanvasInner {...props} />;
}

export default memo(GameCanvas);
