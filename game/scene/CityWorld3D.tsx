"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, Group, InstancedMesh, Object3D, SRGBColorSpace } from "three";
import type { GameRuntime } from "@/game/runtime/GameRuntime";
import { BUILDING_SPECS, CITY_DEPTH_METERS, CITY_WIDTH_METERS, MAP_TO_METERS, TREE_MAP_POSITIONS, mapToWorld } from "@/game/world/CityLayout";
import type { BuildingSpec } from "@/game/world/CityLayout";
import { WORLD_HEIGHT, WORLD_WIDTH } from "@/game/world/landmarks";

export default function CityWorld3D({ runtime }: { runtime: GameRuntime }) {
  const world = useRef<Group>(null);
  useFrame(() => { if (world.current) world.current.visible = !runtime.house.inside; });
  return (
    <group ref={world}>
      <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={false}>
        <planeGeometry args={[CITY_WIDTH_METERS + 18, CITY_DEPTH_METERS + 18]} />
        <meshStandardMaterial color="#7b856f" roughness={1} />
      </mesh>
      <TerrainBlocks />
      <RoadNetwork />
      <DistrictPark />
      {BUILDING_SPECS.map((spec) => <Building3D key={spec.landmark.id} spec={spec} runtime={runtime} />)}
      {TREE_MAP_POSITIONS.map(([x, y, variant], index) => <Tree3D key={`tree-${index}`} position={mapToWorld(x, y)} variant={variant} />)}
      <FuelCanopy />
      <MarketStalls />
      <TaxiShelter />
      <StreetLights runtime={runtime} />
      <StreetSigns />
    </group>
  );
}

function TerrainBlocks() {
  const blocks = [
    { x: 395, y: 363, w: 740, h: 240, color: "#7f8b70" },
    { x: 1_220, y: 363, w: 820, h: 240, color: "#8b8c78" },
    { x: 395, y: 808, w: 740, h: 510, color: "#82866f" },
    { x: 1_220, y: 808, w: 820, h: 510, color: "#858a77" },
    { x: 395, y: 1_425, w: 740, h: 400, color: "#7a866f" },
    { x: 1_220, y: 1_425, w: 820, h: 400, color: "#818575" },
  ];
  return <group>{blocks.map((block, index) => {
    const [x, , z] = mapToWorld(block.x, block.y);
    return <mesh key={index} position={[x, -0.07, z]}>
      <boxGeometry args={[block.w * MAP_TO_METERS, 0.08, block.h * MAP_TO_METERS]} />
      <meshStandardMaterial color={block.color} roughness={1} />
    </mesh>;
  })}</group>;
}

function RoadNetwork() {
  const horizontalRows = [500, 1_120];
  const verticalColumns = [790, 1_615];
  const horizontalDashes: Array<[number, number, number]> = [];
  const verticalDashes: Array<[number, number, number]> = [];
  horizontalRows.forEach((row) => {
    for (let x = 42; x < WORLD_WIDTH - 35; x += 92) {
      const [worldX, , worldZ] = mapToWorld(x, row);
      horizontalDashes.push([worldX, 0, worldZ]);
    }
  });
  verticalColumns.forEach((column) => {
    for (let y = 40; y < WORLD_HEIGHT - 30; y += 92) {
      const [worldX, , worldZ] = mapToWorld(column, y);
      verticalDashes.push([worldX, 0, worldZ]);
    }
  });
  return (
    <group>
      {horizontalRows.map((row) => {
        const [, , z] = mapToWorld(0, row);
        return <group key={`h-${row}`}>
          <mesh position={[0, -0.02, z]}>
            <boxGeometry args={[CITY_WIDTH_METERS + 2, 0.18, 7.1]} />
            <meshStandardMaterial color="#353b42" roughness={0.96} />
          </mesh>
          <mesh position={[0, 0.005, z]}>
            <boxGeometry args={[CITY_WIDTH_METERS + 2, 0.03, 0.13]} />
            <meshBasicMaterial color="#d7d0bd" />
          </mesh>
          {[-1, 1].map((side) => <group key={side}>
            <mesh position={[0, -0.015, z + side * 4.45]}>
              <boxGeometry args={[CITY_WIDTH_METERS + 2, 0.16, 1.7]} />
              <meshStandardMaterial color="#a7a39a" roughness={0.92} />
            </mesh>
            <mesh position={[0, 0.08, z + side * 3.53]}>
              <boxGeometry args={[CITY_WIDTH_METERS + 2, 0.12, 0.15]} />
              <meshStandardMaterial color="#d0c5b1" roughness={0.95} />
            </mesh>
          </group>)}
        </group>;
      })}
      {verticalColumns.map((column) => {
        const [x] = mapToWorld(column, 0);
        return <group key={`v-${column}`}>
          <mesh position={[x, -0.02, 0]}>
            <boxGeometry args={[7.1, 0.18, CITY_DEPTH_METERS + 2]} />
            <meshStandardMaterial color="#353b42" roughness={0.96} />
          </mesh>
          <mesh position={[x, 0.005, 0]}>
            <boxGeometry args={[0.13, 0.03, CITY_DEPTH_METERS + 2]} />
            <meshBasicMaterial color="#d7d0bd" />
          </mesh>
          {[-1, 1].map((side) => <group key={side}>
            <mesh position={[x + side * 4.45, -0.015, 0]}>
              <boxGeometry args={[1.7, 0.16, CITY_DEPTH_METERS + 2]} />
              <meshStandardMaterial color="#a7a39a" roughness={0.92} />
            </mesh>
            <mesh position={[x + side * 3.53, 0.08, 0]}>
              <boxGeometry args={[0.15, 0.12, CITY_DEPTH_METERS + 2]} />
              <meshStandardMaterial color="#d0c5b1" roughness={0.95} />
            </mesh>
          </group>)}
        </group>;
      })}
      <InstancedDashes points={horizontalDashes} horizontal />
      <InstancedDashes points={verticalDashes} horizontal={false} />
      <Crosswalks rows={horizontalRows} columns={verticalColumns} />
    </group>
  );
}

function InstancedDashes({ points, horizontal }: { points: Array<[number, number, number]>; horizontal: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  useEffect(() => {
    if (!mesh.current) return;
    const dummy = new Object3D();
    points.forEach(([x, , z], index) => {
      dummy.position.set(x, 0.085, z);
      dummy.rotation.set(0, horizontal ? 0 : Math.PI / 2, 0);
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [points, horizontal]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, points.length]}>
    <boxGeometry args={[2.6, 0.025, 0.12]} />
    <meshBasicMaterial color="#d9c77e" />
  </instancedMesh>;
}

function Crosswalks({ rows, columns }: { rows: number[]; columns: number[] }) {
  const acrossRoad = useRef<InstancedMesh>(null);
  const alongRoad = useRef<InstancedMesh>(null);
  useEffect(() => {
    const dummy = new Object3D();
    let acrossIndex = 0;
    let alongIndex = 0;
    rows.forEach((row) => columns.forEach((column) => {
      const [x, , z] = mapToWorld(column, row);
      for (let stripe = 0; stripe < 7; stripe += 1) {
        const offset = -2.45 + stripe * 0.7;
        dummy.position.set(x + offset, 0.09, z - 4.25);
        dummy.updateMatrix();
        acrossRoad.current?.setMatrixAt(acrossIndex++, dummy.matrix);
        dummy.position.set(x + offset, 0.09, z + 4.25);
        dummy.updateMatrix();
        acrossRoad.current?.setMatrixAt(acrossIndex++, dummy.matrix);
        dummy.position.set(x - 4.25, 0.09, z + offset);
        dummy.updateMatrix();
        alongRoad.current?.setMatrixAt(alongIndex++, dummy.matrix);
        dummy.position.set(x + 4.25, 0.09, z + offset);
        dummy.updateMatrix();
        alongRoad.current?.setMatrixAt(alongIndex++, dummy.matrix);
      }
    }));
    if (acrossRoad.current) acrossRoad.current.instanceMatrix.needsUpdate = true;
    if (alongRoad.current) alongRoad.current.instanceMatrix.needsUpdate = true;
  }, [rows, columns]);
  return <group>
    <instancedMesh ref={acrossRoad} args={[undefined, undefined, rows.length * columns.length * 14]}>
      <boxGeometry args={[0.39, 0.025, 1.1]} />
      <meshBasicMaterial color="#dad7cb" />
    </instancedMesh>
    <instancedMesh ref={alongRoad} args={[undefined, undefined, rows.length * columns.length * 14]}>
      <boxGeometry args={[1.1, 0.025, 0.39]} />
      <meshBasicMaterial color="#dad7cb" />
    </instancedMesh>
  </group>;
}

function DistrictPark() {
  const [x, , z] = mapToWorld(288, 1_445);
  return <group position={[x, 0, z]}>
    <mesh position={[0, -0.005, 0]}><boxGeometry args={[19.8, 0.18, 16.8]} /><meshStandardMaterial color="#b4ad98" roughness={0.98} /></mesh>
    <mesh position={[0, 0.09, 0]}><boxGeometry args={[18.2, 0.06, 15.2]} /><meshStandardMaterial color="#637b5b" roughness={1} /></mesh>
    <mesh position={[0, 0.13, 0]}><boxGeometry args={[2.5, 0.03, 14.7]} /><meshStandardMaterial color="#c7bda7" roughness={0.95} /></mesh>
    <mesh position={[0, 0.14, 0]}><boxGeometry args={[17.8, 0.03, 2.25]} /><meshStandardMaterial color="#c7bda7" roughness={0.95} /></mesh>
    <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[2.8, 3.1, 0.1, 20]} /><meshStandardMaterial color="#768761" roughness={1} /></mesh>
    <mesh position={[0, 0.52, 3.7]}><boxGeometry args={[1.8, 0.2, 0.48]} /><meshStandardMaterial color="#53463a" roughness={0.94} /></mesh>
    <mesh position={[-0.65, 0.27, 3.7]}><boxGeometry args={[0.12, 0.46, 0.13]} /><meshStandardMaterial color="#4a4136" /></mesh>
    <mesh position={[0.65, 0.27, 3.7]}><boxGeometry args={[0.12, 0.46, 0.13]} /><meshStandardMaterial color="#4a4136" /></mesh>
    <mesh position={[7.6, 0.09, -6.2]}><boxGeometry args={[1.2, 0.16, 1.2]} /><meshStandardMaterial color="#aca595" /></mesh>
  </group>;
}

function Building3D({ spec, runtime }: { spec: BuildingSpec; runtime: GameRuntime }) {
  const root = useRef<Group>(null);
  const { landmark, width, depth, height, wall, roof, trim, accent, floors } = spec;
  const [x, , z] = mapToWorld(landmark.x, landmark.y);
  const front = depth / 2;
  useEffect(() => {
    runtime.registerCameraBlocker(`building:${landmark.id}`, root.current);
    return () => runtime.registerCameraBlocker(`building:${landmark.id}`, null);
  }, [runtime, landmark.id]);

  const windowRows = Math.max(1, floors);
  const windowColumns = landmark.style === "apartment" || landmark.style === "office" ? 3 : 2;
  const windowMeshes = Array.from({ length: windowRows * windowColumns }, (_, index) => {
    const row = Math.floor(index / windowColumns);
    const column = index % windowColumns;
    const xPos = (column - (windowColumns - 1) / 2) * Math.min(1.75, width / (windowColumns + 1));
    const yPos = 1.65 + row * Math.min(2.4, (height - 1.4) / Math.max(1, windowRows));
    return <group key={index} position={[xPos, yPos, front + 0.02]}>
      <mesh><boxGeometry args={[0.82, 0.72, 0.09]} /><meshStandardMaterial color="#33383b" roughness={0.87} /></mesh>
      <mesh position={[0, 0, 0.052]}><boxGeometry args={[0.66, 0.55, 0.035]} /><meshStandardMaterial color="#7b9ba3" metalness={0.06} roughness={0.34} /></mesh>
      <mesh position={[0, 0, 0.075]}><boxGeometry args={[0.035, 0.54, 0.012]} /><meshStandardMaterial color="#d1c2a6" roughness={0.9} /></mesh>
    </group>;
  });

  return <group ref={root} position={[x, 0, z]}>
    <mesh position={[0, 0.13, 0]} receiveShadow={false}><boxGeometry args={[width + 0.45, 0.25, depth + 0.42]} /><meshStandardMaterial color="#8e8c81" roughness={0.94} /></mesh>
    <mesh position={[0, height / 2, 0]} castShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color={wall} roughness={0.92} /></mesh>
    <mesh position={[0, height + 0.18, 0]} castShadow><boxGeometry args={[width + 0.28, 0.36, depth + 0.28]} /><meshStandardMaterial color={roof} roughness={0.83} /></mesh>
    <mesh position={[0, 0.34, front + 0.03]}><boxGeometry args={[width - 0.08, 0.18, 0.1]} /><meshStandardMaterial color={accent} roughness={0.86} /></mesh>
    <mesh position={[0, 1.03, front + 0.065]}><boxGeometry args={[0.98, 1.93, 0.12]} /><meshStandardMaterial color="#5c4235" roughness={0.92} /></mesh>
    <mesh position={[0.29, 1.1, front + 0.133]}><sphereGeometry args={[0.035, 8, 6]} /><meshStandardMaterial color="#e8bb65" metalness={0.15} roughness={0.55} /></mesh>
    {windowMeshes}
    <mesh position={[0, height + 0.39, front + 0.09]}>
      <boxGeometry args={[width * 0.7, 0.52, 0.1]} />
      <meshStandardMaterial color="#30363c" roughness={0.9} />
    </mesh>
    <SignTexture label={landmark.name.toUpperCase()} color={accent} width={width * 0.68} position={[0, height + 0.39, front + 0.15]} />
    {landmark.style === "bank" && <FrontColumns width={width} front={front} />}
    {landmark.style === "office" && <Balconies width={width} front={front} height={height} />}
    {(landmark.style === "shop" || landmark.style === "restaurant" || landmark.style === "fuel") && <Awning width={width} front={front} color={accent} />}
    {landmark.style === "apartment" && <Balcony width={width} front={front} />}
  </group>;
}

function SignTexture({ label, color, width, position }: { label: string; color: string; width: number; position: [number, number, number] }) {
  const [texture, setTexture] = useState<CanvasTexture | null>(null);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#252a30";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 12, canvas.height);
    ctx.fillStyle = "#f5f4ef";
    ctx.font = "700 39px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let shown = label;
    while (ctx.measureText(shown).width > 460 && shown.length > 8) shown = `${shown.slice(0, -4)}…`;
    ctx.fillText(shown, 267, 66);
    const next = new CanvasTexture(canvas);
    next.colorSpace = SRGBColorSpace;
    setTexture(next);
    return () => next.dispose();
  }, [label, color]);
  return <mesh position={position}>
    <planeGeometry args={[width, 0.34]} />
    {texture ? <meshBasicMaterial map={texture} toneMapped={false} /> : <meshBasicMaterial color={color} />}
  </mesh>;
}

function FrontColumns({ width, front }: { width: number; front: number }) {
  return <group>{[-0.31, 0, 0.31].map((ratio) => <group key={ratio} position={[ratio * width, 0, front + 0.12]}>
    <mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[0.12, 0.15, 3.0, 7]} /><meshStandardMaterial color="#d6ccae" roughness={0.92} /></mesh>
    <mesh position={[0, 3.04, 0]}><boxGeometry args={[0.42, 0.14, 0.38]} /><meshStandardMaterial color="#797b74" /></mesh>
  </group>)}</group>;
}

function Balconies({ width, front, height }: { width: number; front: number; height: number }) {
  return <group>{[2.7, 5.15, 7.55].filter((y) => y < height).map((y) => <group key={y} position={[0, y, front + 0.14]}>
    <mesh position={[0, 0.03, 0]}><boxGeometry args={[width * 0.75, 0.1, 0.62]} /><meshStandardMaterial color="#757977" roughness={0.87} /></mesh>
    <mesh position={[0, 0.45, 0.25]}><boxGeometry args={[width * 0.74, 0.68, 0.055]} /><meshStandardMaterial color="#545b5f" metalness={0.35} roughness={0.58} /></mesh>
  </group>)}</group>;
}

function Balcony({ width, front }: { width: number; front: number }) {
  return <group position={[0, 3.7, front + 0.14]}>
    <mesh position={[0, 0.05, 0]}><boxGeometry args={[width * 0.72, 0.12, 0.72]} /><meshStandardMaterial color="#777b75" roughness={0.9} /></mesh>
    <mesh position={[0, 0.52, 0.3]}><boxGeometry args={[width * 0.7, 0.8, 0.06]} /><meshStandardMaterial color="#5e6361" metalness={0.25} roughness={0.65} /></mesh>
  </group>;
}

function Awning({ width, front, color }: { width: number; front: number; color: string }) {
  return <group position={[0, 2.45, front + 0.34]}>
    <mesh rotation={[0.11, 0, 0]} castShadow><boxGeometry args={[width * 0.92, 0.16, 0.75]} /><meshStandardMaterial color={color} roughness={0.83} /></mesh>
    <mesh position={[0, -0.24, 0.12]}><boxGeometry args={[width * 0.92, 0.1, 0.09]} /><meshStandardMaterial color="#eee5d3" roughness={0.94} /></mesh>
  </group>;
}

function Tree3D({ position, variant }: { position: [number, number, number]; variant: number }) {
  const canopy = variant ? "#5e7656" : "#526f50";
  return <group position={position}>
    <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.72, 12]} /><meshBasicMaterial color="#14191c" transparent opacity={0.16} depthWrite={false} /></mesh>
    <mesh position={[0, 0.9, 0]} castShadow><cylinderGeometry args={[0.15, 0.23, 1.8, 7]} /><meshStandardMaterial color="#705640" roughness={1} /></mesh>
    <mesh position={[0, 2.25, 0]} castShadow><sphereGeometry args={[1.18, 9, 7]} /><meshStandardMaterial color={canopy} roughness={1} /></mesh>
    <mesh position={[-0.56, 2.0, 0.12]} castShadow><sphereGeometry args={[0.66, 8, 6]} /><meshStandardMaterial color={variant ? "#667e57" : "#5b7854"} roughness={1} /></mesh>
    <mesh position={[0.58, 2.05, -0.12]} castShadow><sphereGeometry args={[0.69, 8, 6]} /><meshStandardMaterial color={variant ? "#597250" : "#667e57"} roughness={1} /></mesh>
  </group>;
}

function FuelCanopy() {
  const [x, , z] = mapToWorld(285, 735);
  return <group position={[x, 0, z + 2.7]}>
    <mesh position={[0, 3.0, 0]} castShadow><boxGeometry args={[7.5, 0.28, 3.2]} /><meshStandardMaterial color="#e7dfcc" roughness={0.78} /></mesh>
    <mesh position={[0, 3.2, 0]}><boxGeometry args={[7.5, 0.14, 3.2]} /><meshStandardMaterial color="#e58a3e" roughness={0.7} /></mesh>
    {[-3.3, 3.3].map((x2) => [-1.25, 1.25].map((z2) => <mesh key={`${x2}-${z2}`} position={[x2, 1.48, z2]}><cylinderGeometry args={[0.09, 0.11, 2.95, 7]} /><meshStandardMaterial color="#545a5c" metalness={0.12} roughness={0.8} /></mesh>))}
    {[-2.1, 2.1].map((pump) => <group key={pump} position={[pump, 0.65, 0.25]}>
      <mesh><boxGeometry args={[0.55, 1.14, 0.42]} /><meshStandardMaterial color="#39464a" roughness={0.7} /></mesh>
      <mesh position={[0, 0.25, 0.22]}><boxGeometry args={[0.36, 0.28, 0.025]} /><meshStandardMaterial color="#91a7a7" emissive="#466162" emissiveIntensity={0.12} /></mesh>
      <mesh position={[0, -0.12, 0.235]}><boxGeometry args={[0.32, 0.07, 0.03]} /><meshStandardMaterial color="#e99b44" /></mesh>
    </group>)}
  </group>;
}

function MarketStalls() {
  const colors = ["#b85d43", "#597a65", "#c18e4d"];
  return <group>{colors.map((color, index) => {
    const [x, , z] = mapToWorld(383 + index * 66, 869);
    return <group key={color} position={[x, 0, z]}>
      <mesh position={[0, 0.68, 0]} castShadow><boxGeometry args={[2.2, 1.3, 1.35]} /><meshStandardMaterial color="#75563c" roughness={0.94} /></mesh>
      <mesh position={[0, 1.38, 0]} rotation={[0.04, 0, 0]} castShadow><boxGeometry args={[2.55, 0.16, 1.65]} /><meshStandardMaterial color={color} roughness={0.86} /></mesh>
      <mesh position={[0, 0.42, 0.69]}><boxGeometry args={[1.98, 0.58, 0.06]} /><meshStandardMaterial color="#d3b57e" roughness={0.93} /></mesh>
      <mesh position={[-0.75, 0.07, 0.46]}><boxGeometry args={[0.1, 0.8, 0.1]} /><meshStandardMaterial color="#473b30" /></mesh>
      <mesh position={[0.75, 0.07, 0.46]}><boxGeometry args={[0.1, 0.8, 0.1]} /><meshStandardMaterial color="#473b30" /></mesh>
      <mesh position={[0, 1.05, 0.82]}><boxGeometry args={[0.8, 0.23, 0.05]} /><meshStandardMaterial color="#a7a087" /></mesh>
    </group>;
  })}</group>;
}

function TaxiShelter() {
  const [x, , z] = mapToWorld(665, 1_410);
  return <group position={[x, 0, z]}>
    <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.7, 12]} /><meshBasicMaterial color="#151a1d" transparent opacity={0.12} depthWrite={false} /></mesh>
    <mesh position={[0, 2.65, 0]} castShadow><boxGeometry args={[4.5, 0.22, 2.2]} /><meshStandardMaterial color="#4c5c59" roughness={0.8} /></mesh>
    <mesh position={[0, 2.82, 0]}><boxGeometry args={[4.55, 0.12, 2.25]} /><meshStandardMaterial color="#d8a34d" roughness={0.78} /></mesh>
    {[-2, 2].map((x2) => <mesh key={x2} position={[x2, 1.28, 0.8]}><cylinderGeometry args={[0.075, 0.09, 2.5, 6]} /><meshStandardMaterial color="#52615c" metalness={0.18} /></mesh>)}
    <mesh position={[0, 0.55, 0.4]}><boxGeometry args={[2.7, 0.18, 0.58]} /><meshStandardMaterial color="#70553d" /></mesh>
    <mesh position={[0, 1.2, -1.08]}><boxGeometry args={[3.1, 1.12, 0.09]} /><meshStandardMaterial color="#363d40" /></mesh>
    <SignTexture label="RIVERSIDE TAXI RANK" color="#e5a54e" width={2.9} position={[0, 1.2, -1.02]} />
  </group>;
}

function StreetLights({ runtime }: { runtime: GameRuntime }) {
  const poles: Array<[number, number]> = [];
  [500, 1_120].forEach((row) => [250, 1_050, 1_850, 2_280].forEach((x) => poles.push([x, row + 60])));
  [790, 1_615].forEach((column) => [130, 900, 1_390].forEach((y) => poles.push([column + 65, y])));
  return <group>{poles.map(([mapX, mapY], index) => {
    const [x, , z] = mapToWorld(mapX, mapY);
    return <StreetLight key={index} x={x} z={z} runtime={runtime} />;
  })}</group>;
}

function StreetLight({ x, z, runtime }: { x: number; z: number; runtime: GameRuntime }) {
  const lamp = useRef<import("three").Mesh>(null);
  useFrame(() => {
    if (lamp.current) {
      const emissive = runtime.nightStrength > 0.18 ? 0.95 : 0.04;
      (lamp.current.material as import("three").MeshStandardMaterial).emissiveIntensity = emissive;
    }
  });
  return <group position={[x, 0, z]}>
    <mesh position={[0, 2.2, 0]}><cylinderGeometry args={[0.045, 0.075, 4.4, 6]} /><meshStandardMaterial color="#42494e" metalness={0.22} roughness={0.8} /></mesh>
    <mesh position={[0.55, 4.33, 0]} rotation={[0, 0, -0.16]}><cylinderGeometry args={[0.035, 0.035, 1.15, 6]} /><meshStandardMaterial color="#42494e" /></mesh>
    <mesh position={[1.06, 4.25, 0]} ref={lamp}><boxGeometry args={[0.38, 0.14, 0.24]} /><meshStandardMaterial color="#efc988" emissive="#f3bc67" emissiveIntensity={0.04} roughness={0.6} /></mesh>
  </group>;
}

function StreetSigns() {
  const signs = [
    { x: 560, y: 489, text: "UMU ILA WAY" },
    { x: 1_280, y: 1_109, text: "NEMBE MARKET ROAD" },
    { x: 820, y: 860, text: "CREEKLINE AVENUE" },
  ];
  return <group>{signs.map((sign) => {
    const [x, , z] = mapToWorld(sign.x, sign.y);
    return <group key={sign.text} position={[x, 0, z]}>
      <mesh position={[0, 2.15, 0]}><cylinderGeometry args={[0.04, 0.06, 4.3, 6]} /><meshStandardMaterial color="#484f50" /></mesh>
      <mesh position={[0, 3.83, 0]}><boxGeometry args={[2.2, 0.45, 0.08]} /><meshStandardMaterial color="#414a4a" roughness={0.85} /></mesh>
      <SignTexture label={sign.text} color="#d7954c" width={2.05} position={[0, 3.83, 0.06]} />
    </group>;
  })}</group>;
}
