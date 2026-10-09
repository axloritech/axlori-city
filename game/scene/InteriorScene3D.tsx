"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import type { GameRuntime } from "@/game/runtime/GameRuntime";
import { FURNITURE_CATALOG } from "@/game/furniture/FurnitureSystem";
import { interiorToWorld } from "@/game/world/CityLayout";

export default function InteriorScene3D({ runtime }: { runtime: GameRuntime }) {
  const room = useRef<Group>(null);
  useFrame(() => { if (room.current) room.current.visible = runtime.house.inside; });

  return <group ref={room}>
    <mesh position={[0, -0.09, 0]} receiveShadow={false}>
      <boxGeometry args={[7.2, 0.18, 5.0]} />
      <meshStandardMaterial color="#b4a589" roughness={0.92} />
    </mesh>
    <mesh position={[0, 0.015, 0]}>
      <boxGeometry args={[6.72, 0.035, 4.55]} />
      <meshStandardMaterial color="#c9b792" roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.04, 0.25]}>
      <boxGeometry args={[2.8, 0.055, 1.42]} />
      <meshStandardMaterial color="#8b6049" roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.08, 0.25]}>
      <boxGeometry args={[2.5, 0.035, 1.14]} />
      <meshStandardMaterial color="#d0a96f" roughness={0.98} />
    </mesh>
    <InteriorWall runtime={runtime} id="interior:back" position={[0, 1.4, -2.48]} size={[7.2, 2.8, 0.16]} color="#c8b795" />
    <InteriorWall runtime={runtime} id="interior:left" position={[-3.55, 1.4, 0]} size={[0.16, 2.8, 5.0]} color="#c6b492" />
    <InteriorWall runtime={runtime} id="interior:right" position={[3.55, 1.4, 0]} size={[0.16, 2.8, 5.0]} color="#c6b492" />
    <InteriorWall runtime={runtime} id="interior:front-left" position={[-2.12, 1.4, 2.48]} size={[2.96, 2.8, 0.16]} color="#c8b795" />
    <InteriorWall runtime={runtime} id="interior:front-right" position={[2.12, 1.4, 2.48]} size={[2.96, 2.8, 0.16]} color="#c8b795" />
    <mesh position={[0, 0.9, -2.36]}><boxGeometry args={[1.28, 1.25, 0.11]} /><meshStandardMaterial color="#445452" roughness={0.65} /></mesh>
    <mesh position={[0, 0.9, -2.28]}><boxGeometry args={[1.12, 1.08, 0.035]} /><meshStandardMaterial color="#89a8a6" roughness={0.38} /></mesh>
    <mesh position={[0, 0.9, -2.24]}><boxGeometry args={[0.025, 1.02, 0.02]} /><meshStandardMaterial color="#dae0d7" roughness={0.8} /></mesh>
    <mesh position={[0, 0.9, -2.23]}><boxGeometry args={[1.08, 0.025, 0.02]} /><meshStandardMaterial color="#dae0d7" roughness={0.8} /></mesh>
    <mesh position={[0, 2.28, -2.37]}><boxGeometry args={[2.4, 0.12, 0.2]} /><meshStandardMaterial color="#8c6849" roughness={0.9} /></mesh>
    <mesh position={[0, 2.49, -2.39]}><boxGeometry args={[1.8, 0.12, 0.08]} /><meshStandardMaterial color="#e0d4bb" roughness={0.93} /></mesh>
    <mesh position={[-2.25, 1.1, 2.38]}>
      <boxGeometry args={[0.65, 2.0, 0.08]} />
      <meshStandardMaterial color="#594437" roughness={0.93} />
    </mesh>
    <mesh position={[-2.05, 1.16, 2.33]}><sphereGeometry args={[0.045, 8, 6]} /><meshStandardMaterial color="#e8bb65" metalness={0.15} /></mesh>
    {runtime.furniture.placed.map((item) => <FurnitureItem3D key={item.instanceId} item={item} onSelect={() => runtime.command({ type: "set-panel", panel: "furniture" })} />)}
    <mesh position={[0, 2.74, 0]}>
      <boxGeometry args={[0.72, 0.06, 0.72]} />
      <meshStandardMaterial color="#f0dfb7" emissive="#f0dfb7" emissiveIntensity={0.24} />
    </mesh>
  </group>;
}

function InteriorWall({ runtime, id, position, size, color }: { runtime: GameRuntime; id: string; position: [number, number, number]; size: [number, number, number]; color: string }) {
  const mesh = useRef<Mesh>(null);
  useEffect(() => {
    runtime.registerCameraBlocker(id, mesh.current);
    return () => runtime.registerCameraBlocker(id, null);
  }, [runtime, id]);
  return <mesh ref={mesh} position={position} castShadow={false}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.93} />
  </mesh>;
}

function FurnitureItem3D({ item, onSelect }: { item: { instanceId: string; itemId: string; x: number; y: number; rotation: number }; onSelect: () => void }) {
  const definition = FURNITURE_CATALOG.find((entry) => entry.id === item.itemId);
  if (!definition) return null;
  const [x, , z] = interiorToWorld(item.x, item.y);
  const rotate = (item.rotation * Math.PI) / 180;
  return <group position={[x, 0, z]} rotation={[0, rotate, 0]} onPointerDown={(event) => { if (event.button === 0) { event.stopPropagation(); onSelect(); } }}>
    {item.itemId === "bed" && <>
      <mesh position={[0, 0.23, 0]} castShadow><boxGeometry args={[0.86, 0.36, 0.62]} /><meshStandardMaterial color="#6a503d" roughness={0.92} /></mesh>
      <mesh position={[0, 0.48, 0.03]} castShadow><boxGeometry args={[0.8, 0.22, 0.6]} /><meshStandardMaterial color="#789293" roughness={0.96} /></mesh>
      <mesh position={[0, 0.61, -0.18]}><boxGeometry args={[0.34, 0.12, 0.22]} /><meshStandardMaterial color="#e0d4bd" roughness={0.95} /></mesh>
      <mesh position={[0, 0.56, -0.4]}><boxGeometry args={[0.9, 0.82, 0.12]} /><meshStandardMaterial color="#674c3d" roughness={0.92} /></mesh>
    </>}
    {item.itemId === "sofa" && <>
      <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[1.02, 0.5, 0.48]} /><meshStandardMaterial color="#55766e" roughness={0.91} /></mesh>
      <mesh position={[0, 0.73, 0.18]}><boxGeometry args={[1.02, 0.48, 0.18]} /><meshStandardMaterial color="#49675f" roughness={0.92} /></mesh>
      {[-0.52, 0.52].map((side) => <mesh key={side} position={[side, 0.54, 0]}><boxGeometry args={[0.16, 0.46, 0.5]} /><meshStandardMaterial color="#44635c" roughness={0.92} /></mesh>)}
    </>}
    {item.itemId === "table" && <>
      <mesh position={[0, 0.53, 0]}><boxGeometry args={[0.75, 0.14, 0.52]} /><meshStandardMaterial color="#8b6343" roughness={0.91} /></mesh>
      {[-0.28, 0.28].flatMap((dx) => [-0.18, 0.18].map((dz) => <mesh key={`${dx}-${dz}`} position={[dx, 0.27, dz]}><boxGeometry args={[0.08, 0.5, 0.08]} /><meshStandardMaterial color="#6b4d39" /></mesh>))}
    </>}
    {item.itemId === "chair" && <>
      <mesh position={[0, 0.48, 0]}><boxGeometry args={[0.4, 0.14, 0.4]} /><meshStandardMaterial color="#ad7748" roughness={0.9} /></mesh>
      <mesh position={[0, 0.77, 0.16]}><boxGeometry args={[0.4, 0.47, 0.09]} /><meshStandardMaterial color="#9c6842" roughness={0.92} /></mesh>
      {[-0.14, 0.14].flatMap((dx) => [-0.14, 0.14].map((dz) => <mesh key={`${dx}-${dz}`} position={[dx, 0.23, dz]}><boxGeometry args={[0.065, 0.45, 0.065]} /><meshStandardMaterial color="#765239" /></mesh>))}
    </>}
    {item.itemId === "tv" && <>
      <mesh position={[0, 0.55, 0]}><boxGeometry args={[0.62, 0.42, 0.11]} /><meshStandardMaterial color="#25292d" roughness={0.78} /></mesh>
      <mesh position={[0, 0.57, 0.063]}><boxGeometry args={[0.52, 0.3, 0.018]} /><meshStandardMaterial color="#7d969a" emissive="#527177" emissiveIntensity={0.08} /></mesh>
      <mesh position={[0, 0.23, 0]}><boxGeometry args={[0.45, 0.22, 0.35]} /><meshStandardMaterial color="#79583b" /></mesh>
    </>}
    {item.itemId === "refrigerator" && <>
      <mesh position={[0, 0.77, 0]}><boxGeometry args={[0.45, 1.48, 0.48]} /><meshStandardMaterial color="#aeb9b4" metalness={0.06} roughness={0.54} /></mesh>
      <mesh position={[0.16, 0.78, 0.248]}><boxGeometry args={[0.025, 0.48, 0.02]} /><meshStandardMaterial color="#5f6666" metalness={0.25} /></mesh>
      <mesh position={[0.16, 1.35, 0.248]}><boxGeometry args={[0.025, 0.22, 0.02]} /><meshStandardMaterial color="#5f6666" metalness={0.25} /></mesh>
    </>}
    {item.itemId === "air-conditioner" && <>
      <mesh position={[0, 2.0, 0]}><boxGeometry args={[0.7, 0.28, 0.3]} /><meshStandardMaterial color="#d4d4ca" roughness={0.65} /></mesh>
      <mesh position={[0, 1.9, 0.13]}><boxGeometry args={[0.48, 0.025, 0.025]} /><meshStandardMaterial color="#838987" /></mesh>
    </>}
    {item.itemId === "plant" && <>
      <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.17, 0.22, 0.38, 8]} /><meshStandardMaterial color="#a66643" roughness={0.94} /></mesh>
      <mesh position={[0, 0.8, 0]}><coneGeometry args={[0.38, 1.1, 7]} /><meshStandardMaterial color="#56754f" roughness={1} /></mesh>
      <mesh position={[0.04, 1.12, -0.03]}><coneGeometry args={[0.25, 0.82, 7]} /><meshStandardMaterial color="#68865a" roughness={1} /></mesh>
    </>}
    {item.itemId === "wall-art" && <>
      <mesh position={[0, 1.25, 0]}><boxGeometry args={[0.6, 0.55, 0.08]} /><meshStandardMaterial color="#825b43" roughness={0.9} /></mesh>
      <mesh position={[0, 1.25, 0.05]}><boxGeometry args={[0.48, 0.43, 0.02]} /><meshStandardMaterial color="#df9a53" roughness={0.8} /></mesh>
    </>}
    <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[Math.max(definition.width, definition.height) * 0.006, 10]} />
      <meshBasicMaterial color="#11161a" transparent opacity={0.12} depthWrite={false} />
    </mesh>
  </group>;
}
