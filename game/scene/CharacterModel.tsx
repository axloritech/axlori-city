"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { GameRuntime } from "@/game/runtime/GameRuntime";
import { interiorToWorld, mapToWorld } from "@/game/world/CityLayout";

type NpcLike = { x: number; y: number; heading: number; color: string };

type Props = {
  runtime: GameRuntime;
  npc?: NpcLike;
  color?: string;
  scale?: number;
};

export default function CharacterModel({ runtime, npc, color = "#df8441", scale = 1 }: Props) {
  const root = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame((state, delta) => {
    if (!root.current) return;
    const mapPosition = npc ? { x: npc.x, y: npc.y } : runtime.getActorMapPosition();
    const world = runtime.house.inside ? interiorToWorld(mapPosition.x, mapPosition.y) : mapToWorld(mapPosition.x, mapPosition.y);
    root.current.position.set(world[0], 0, world[2]);
    root.current.rotation.y = npc ? npc.heading : runtime.getActorHeading();
    root.current.visible = npc ? !runtime.house.inside && !runtime.driving : !runtime.driving;

    const speed = npc ? 0.75 : runtime.getPlayerMotionSpeed();
    const moving = speed > 0.18;
    const isRunning = !npc && runtime.running;
    phase.current += delta * (isRunning ? 12.8 : 8.5);
    const amount = moving ? (isRunning ? 0.62 : 0.34) : 0.025;
    const swing = Math.sin(phase.current) * amount;
    if (leftLeg.current) leftLeg.current.rotation.x = swing;
    if (rightLeg.current) rightLeg.current.rotation.x = -swing;
    if (leftArm.current) leftArm.current.rotation.x = -swing * 0.82;
    if (rightArm.current) rightArm.current.rotation.x = swing * 0.82;
    root.current.position.y = moving ? Math.max(0, Math.sin(phase.current * 2) * (isRunning ? 0.035 : 0.017)) : Math.sin(state.clock.elapsedTime * 2) * 0.012;
  });

  const jacket = npc?.color ?? color;
  const skin = npc ? "#805542" : "#8c5b47";

  return (
    <group ref={root} scale={scale}>
      {/* A deliberately lightweight, original resident model built from shared low-poly primitives. */}
      <mesh position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.36, 12]} />
        <meshBasicMaterial color="#12171b" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.14, 0]} castShadow>
        <boxGeometry args={[0.33, 0.17, 0.31]} />
        <meshStandardMaterial color="#252a30" roughness={0.93} />
      </mesh>
      <group ref={leftLeg} position={[-0.135, 0.82, 0]}>
        <mesh position={[0, -0.29, 0]} castShadow>
          <capsuleGeometry args={[0.105, 0.44, 3, 7]} />
          <meshStandardMaterial color="#34383c" roughness={0.95} />
        </mesh>
        <mesh position={[0, -0.59, -0.045]} castShadow>
          <boxGeometry args={[0.16, 0.105, 0.29]} />
          <meshStandardMaterial color="#22262b" roughness={0.93} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.135, 0.82, 0]}>
        <mesh position={[0, -0.29, 0]} castShadow>
          <capsuleGeometry args={[0.105, 0.44, 3, 7]} />
          <meshStandardMaterial color="#34383c" roughness={0.95} />
        </mesh>
        <mesh position={[0, -0.59, -0.045]} castShadow>
          <boxGeometry args={[0.16, 0.105, 0.29]} />
          <meshStandardMaterial color="#22262b" roughness={0.93} />
        </mesh>
      </group>
      <mesh position={[0, 0.86, 0]} castShadow>
        <capsuleGeometry args={[0.23, 0.32, 4, 8]} />
        <meshStandardMaterial color="#34383c" roughness={0.92} />
      </mesh>
      <mesh position={[0, 1.23, 0]} castShadow>
        <capsuleGeometry args={[0.255, 0.48, 4, 8]} />
        <meshStandardMaterial color={jacket} roughness={0.83} />
      </mesh>
      <mesh position={[0, 1.2, -0.257]}>
        <boxGeometry args={[0.075, 0.37, 0.015]} />
        <meshStandardMaterial color="#f4bd72" roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.42, -0.04]}>
        <boxGeometry args={[0.36, 0.1, 0.31]} />
        <meshStandardMaterial color="#282d32" roughness={0.96} />
      </mesh>
      <group ref={leftArm} position={[-0.31, 1.42, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <capsuleGeometry args={[0.09, 0.31, 3, 7]} />
          <meshStandardMaterial color={jacket} roughness={0.86} />
        </mesh>
        <mesh position={[0, -0.42, 0]}>
          <sphereGeometry args={[0.085, 8, 6]} />
          <meshStandardMaterial color={skin} roughness={0.88} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.31, 1.42, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <capsuleGeometry args={[0.09, 0.31, 3, 7]} />
          <meshStandardMaterial color={jacket} roughness={0.86} />
        </mesh>
        <mesh position={[0, -0.42, 0]}>
          <sphereGeometry args={[0.085, 8, 6]} />
          <meshStandardMaterial color={skin} roughness={0.88} />
        </mesh>
      </group>
      <mesh position={[0, 1.72, -0.015]} castShadow>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color={skin} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.81, 0.018]}>
        <sphereGeometry args={[0.157, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
        <meshStandardMaterial color="#272628" roughness={0.98} />
      </mesh>
      <mesh position={[-0.055, 1.75, -0.16]}><sphereGeometry args={[0.017, 6, 5]} /><meshStandardMaterial color="#252324" roughness={0.7} /></mesh>
      <mesh position={[0.055, 1.75, -0.16]}><sphereGeometry args={[0.017, 6, 5]} /><meshStandardMaterial color="#252324" roughness={0.7} /></mesh>
      <mesh position={[0, 1.705, -0.178]}><boxGeometry args={[0.04, 0.04, 0.025]} /><meshStandardMaterial color="#704638" roughness={0.9} /></mesh>
    </group>
  );
}
