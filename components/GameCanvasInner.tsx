"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import AxloriScene3D from "@/game/scene/AxloriScene3D";
import { GameRuntime } from "@/game/runtime/GameRuntime";
import type { GameCommandApi, GameUiState } from "@/game/types";

type Props = {
  onState: (state: GameUiState) => void;
  onApi: (api: GameCommandApi | null) => void;
  onError: (message: string) => void;
};

type DragState = { pointerId: number; x: number; y: number } | null;

function GameCanvasInner({ onState, onApi, onError }: Props) {
  const [runtime, setRuntime] = useState<GameRuntime | null>(null);
  const runtimeRef = useRef<GameRuntime | null>(null);
  const apiRef = useRef<GameCommandApi | null>(null);
  const drag = useRef<DragState>(null);
  const inputCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const nextRuntime = new GameRuntime();
      runtimeRef.current = nextRuntime;
      unsubscribe = nextRuntime.subscribe(onState);
      const api: GameCommandApi = {
        command: (value) => nextRuntime.command(value),
        move: (x, y) => nextRuntime.setMove(x, y),
        setRun: (active) => nextRuntime.setRun(active),
        look: (dx, dy, sensitivity) => nextRuntime.rotateCamera(dx, dy, sensitivity),
        setPedals: (accelerate, brake) => nextRuntime.setPedals(accelerate, brake),
      };
      apiRef.current = api;
      onApi(api);
      setRuntime(nextRuntime);

      const pressed = new Set<string>();
      const isEditable = (target: EventTarget | null) => target instanceof HTMLElement && !!target.closest("input, textarea, select, [contenteditable='true']");
      const updateMovement = () => {
        const x = Number(pressed.has("d") || pressed.has("arrowright")) - Number(pressed.has("a") || pressed.has("arrowleft"));
        const y = Number(pressed.has("s") || pressed.has("arrowdown")) - Number(pressed.has("w") || pressed.has("arrowup"));
        nextRuntime.setMove(x, y);
      };
      const clearInput = () => {
        pressed.clear();
        nextRuntime.setMove(0, 0);
        nextRuntime.setRun(false);
        nextRuntime.setPedals(false, false);
      };
      const keyDown = (event: KeyboardEvent) => {
        if (isEditable(event.target)) return;
        const key = event.key.toLowerCase();
        if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "shift"].includes(key)) {
          event.preventDefault();
          pressed.add(key);
          updateMovement();
          if (key === "shift") nextRuntime.setRun(true);
          if (nextRuntime.driving) nextRuntime.setPedals(pressed.has("w") || pressed.has("arrowup"), pressed.has("s") || pressed.has("arrowdown"));
          return;
        }
        if (event.repeat) return;
        if (key === "e") { event.preventDefault(); nextRuntime.command({ type: "interact" }); }
        if (key === "p") { event.preventDefault(); nextRuntime.command({ type: "set-panel", panel: nextRuntime.panel === "phone" ? null : "phone" }); }
        if (key === "m") { event.preventDefault(); nextRuntime.command({ type: "set-panel", panel: nextRuntime.panel === "map" ? null : "map" }); }
        if (key === "escape") { event.preventDefault(); nextRuntime.command({ type: "set-panel", panel: nextRuntime.panel ? null : "menu" }); }
        if (key === "f5") { event.preventDefault(); nextRuntime.command({ type: "save" }); }
      };
      const keyUp = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase();
        pressed.delete(key);
        updateMovement();
        if (key === "shift") nextRuntime.setRun(false);
        if (nextRuntime.driving) nextRuntime.setPedals(pressed.has("w") || pressed.has("arrowup"), pressed.has("s") || pressed.has("arrowdown"));
      };
      window.addEventListener("keydown", keyDown, { passive: false });
      window.addEventListener("keyup", keyUp);
      window.addEventListener("blur", clearInput);

      const keyCleanup = () => {
        window.removeEventListener("keydown", keyDown);
        window.removeEventListener("keyup", keyUp);
        window.removeEventListener("blur", clearInput);
        clearInput();
      };
      inputCleanup.current = keyCleanup;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The 3D district could not start.";
      onError(message);
    }
    return () => {
      unsubscribe?.();
      inputCleanup.current?.();
      inputCleanup.current = null;
      runtimeRef.current = null;
      apiRef.current = null;
      onApi(null);
    };
  }, [onApi, onError, onState]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || event.button !== 2) return;
    event.preventDefault();
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    apiRef.current?.look(event.clientX - state.x, event.clientY - state.y, 0.0036);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const stopDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  };

  return (
    <div className="game-canvas-frame" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag} onContextMenu={(event) => event.preventDefault()}>
      {runtime && <Canvas
        dpr={[1, typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, window.innerWidth < 740 ? 1.3 : 1.55)]}
        camera={{ position: [0, 2.8, 6.0], fov: 58, near: 0.08, far: 150 }}
        gl={{ antialias: false, powerPreference: "low-power", alpha: false, stencil: false, depth: true, toneMapping: ACESFilmicToneMapping }}
        onCreated={({ gl }) => { gl.outputColorSpace = SRGBColorSpace; gl.setClearColor("#a8bdc5", 1); }}
        performance={{ min: 0.65 }}
        shadows={false}
      >
        <AxloriScene3D runtime={runtime} />
      </Canvas>}
      {!runtime && <div className="game-canvas-loading" aria-hidden="true" />}
    </div>
  );
}

export default memo(GameCanvasInner);
