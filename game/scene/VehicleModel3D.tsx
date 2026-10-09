"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { GameRuntime } from "@/game/runtime/GameRuntime";
import { mapToWorld } from "@/game/world/CityLayout";

export default function VehicleModel3D({ runtime }: { runtime: GameRuntime }) {
  const root = useRef<Group>(null);
  const wheels = useRef<Array<Group | null>>([]);
  useFrame((_, delta) => {
    if (!root.current) return;
    const world = mapToWorld(runtime.car.x, runtime.car.y);
    root.current.position.set(world[0], 0, world[2]);
    root.current.rotation.y = runtime.car.yaw;
    const spin = runtime.car.speed * delta * 0.85;
    wheels.current.forEach((wheel) => { if (wheel) wheel.rotation.x += spin; });
  });

  const wheelPositions: Array<[number, number, number]> = [
    [-0.96, 0.38, -1.07], [0.96, 0.38, -1.07], [-0.96, 0.38, 1.05], [0.96, 0.38, 1.05],
  ];

  return (
    <group ref={root}>
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.55, 16]} />
        <meshBasicMaterial color="#12171b" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.48, 0.04]} castShadow>
        <boxGeometry args={[1.98, 0.62, 3.72]} />
        <meshStandardMaterial color="#cf7b35" metalness={0.14} roughness={0.68} />
      </mesh>
      <mesh position={[0, 0.73, -0.76]} castShadow>
        <boxGeometry args={[1.9, 0.33, 1.62]} />
        <meshStandardMaterial color="#e19145" metalness={0.12} roughness={0.63} />
      </mesh>
      <mesh position={[0, 1.0, 0.24]} castShadow>
        <boxGeometry args={[1.45, 0.77, 1.63]} />
        <meshStandardMaterial color="#343a40" roughness={0.78} />
      </mesh>
      <mesh position={[0, 1.01, -0.61]}>
        <boxGeometry args={[1.29, 0.53, 0.045]} />
        <meshStandardMaterial color="#88a7b2" metalness={0.08} roughness={0.32} />
      </mesh>
      <mesh position={[0, 1.01, 1.06]}>
        <boxGeometry args={[1.25, 0.5, 0.04]} />
        <meshStandardMaterial color="#77929a" metalness={0.06} roughness={0.38} />
      </mesh>
      <mesh position={[-0.73, 1.0, 0.23]}>
        <boxGeometry args={[0.035, 0.49, 1.32]} />
        <meshStandardMaterial color="#879da0" roughness={0.4} />
      </mesh>
      <mesh position={[0.73, 1.0, 0.23]}>
        <boxGeometry args={[0.035, 0.49, 1.32]} />
        <meshStandardMaterial color="#879da0" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.42, 0.22]}>
        <boxGeometry args={[1.48, 0.11, 1.68]} />
        <meshStandardMaterial color="#4b5257" roughness={0.77} />
      </mesh>
      <mesh position={[-0.69, 0.58, -1.88]}>
        <boxGeometry args={[0.38, 0.13, 0.06]} />
        <meshStandardMaterial color="#f7dfac" emissive="#d89a42" emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0.69, 0.58, -1.88]}>
        <boxGeometry args={[0.38, 0.13, 0.06]} />
        <meshStandardMaterial color="#f7dfac" emissive="#d89a42" emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, 0.35, 1.92]}>
        <boxGeometry args={[1.85, 0.18, 0.14]} />
        <meshStandardMaterial color="#3b4145" metalness={0.12} roughness={0.7} />
      </mesh>
      {wheelPositions.map((position, index) => (
        <group key={index} position={position} ref={(element) => { wheels.current[index] = element; }} rotation={[0, 0, Math.PI / 2]}>
          <mesh rotation={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.34, 0.34, 0.22, 10]} />
            <meshStandardMaterial color="#202429" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.116, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.018, 8]} />
            <meshStandardMaterial color="#a5a7a5" metalness={0.28} roughness={0.45} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.47, -2.0]}>
        <boxGeometry args={[1.72, 0.13, 0.12]} />
        <meshStandardMaterial color="#5a5d5e" metalness={0.3} roughness={0.45} />
      </mesh>
    </group>
  );
}
