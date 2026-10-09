"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { GameRuntime } from "@/game/runtime/GameRuntime";
import { mapToWorld } from "@/game/world/CityLayout";
import CameraRig from "@/game/scene/CameraRig";
import CharacterModel from "@/game/scene/CharacterModel";
import CityWorld3D from "@/game/scene/CityWorld3D";
import InteriorScene3D from "@/game/scene/InteriorScene3D";
import VehicleModel3D from "@/game/scene/VehicleModel3D";
import { RainParticles, SceneLighting } from "@/game/scene/WeatherAndLighting";

export default function AxloriScene3D({ runtime }: { runtime: GameRuntime }) {
  useFrame((_, delta) => runtime.update(delta));
  const mobile = typeof navigator !== "undefined" && /Android|iPhone|iPad/i.test(navigator.userAgent);

  return <>
    <SceneLighting runtime={runtime} />
    <CameraRig runtime={runtime} />
    <CityWorld3D runtime={runtime} />
    <InteriorScene3D runtime={runtime} />
    <VehicleModel3D runtime={runtime} />
    <CharacterModel runtime={runtime} />
    {runtime.npcs.map((npc) => <CharacterModel key={npc.name} runtime={runtime} npc={npc} scale={0.93} />)}
    <DestinationMarker runtime={runtime} />
    <RainParticles runtime={runtime} count={mobile ? 85 : 150} />
  </>;
}

function DestinationMarker({ runtime }: { runtime: GameRuntime }) {
  const marker = useRef<Group>(null);
  useFrame((state) => {
    if (!marker.current) return;
    const active = runtime.jobs.active;
    if (!active) {
      marker.current.visible = false;
      return;
    }
    const definition = runtime.jobs.definition(active.id);
    const target = definition?.target ?? definition?.workplacePoint;
    if (!target) {
      marker.current.visible = false;
      return;
    }
    const world = mapToWorld(target.x, target.y);
    marker.current.position.set(world[0], 0, world[2]);
    marker.current.visible = !runtime.house.inside;
    marker.current.rotation.y = state.clock.elapsedTime * 0.7;
  });
  return <group ref={marker}>
    <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.72, 0.9, 20]} />
      <meshBasicMaterial color="#f29a38" transparent opacity={0.86} depthWrite={false} />
    </mesh>
    <mesh position={[0, 1.3, 0]}>
      <cylinderGeometry args={[0.035, 0.11, 2.6, 7]} />
      <meshBasicMaterial color="#f29a38" transparent opacity={0.35} depthWrite={false} />
    </mesh>
    <mesh position={[0, 2.7, 0]}>
      <sphereGeometry args={[0.18, 10, 7]} />
      <meshBasicMaterial color="#ffc36d" />
    </mesh>
  </group>;
}
