"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, Color, Fog, LineBasicMaterial, LineSegments, Vector3 } from "three";
import type { AmbientLight, DirectionalLight, HemisphereLight } from "three";
import type { GameRuntime } from "@/game/runtime/GameRuntime";

const DAY_SKY = new Color("#a8bdc5");
const DUSK_SKY = new Color("#977a6d");
const NIGHT_SKY = new Color("#18232f");
const RAIN_SKY = new Color("#52616b");
const DAY_SUN = new Color("#fff0d2");
const NIGHT_SUN = new Color("#91a6c4");

export function SceneLighting({ runtime }: { runtime: GameRuntime }) {
  const ambient = useRef<AmbientLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const sun = useRef<DirectionalLight>(null);
  const { scene } = useThree();
  const skyColor = useMemo(() => new Color(), []);
  const dayFog = useMemo(() => new Fog("#a8bdc5", 35, 92), []);
  const nightFog = useMemo(() => new Fog("#18232f", 24, 72), []);

  useEffect(() => {
    scene.fog = dayFog;
    return () => { if (scene.fog === dayFog || scene.fog === nightFog) scene.fog = null; };
  }, [scene, dayFog, nightFog]);

  useFrame(() => {
    const night = runtime.nightStrength;
    const cloudy = runtime.weather.current === "cloudy" ? 0.2 : runtime.weather.current === "rain" ? 0.44 : 0;
    const dim = Math.min(0.8, night + cloudy);
    const dusk = Math.max(0, 1 - Math.abs(runtime.timeSnapshot.minutesAfterMidnight - 1_080) / 150) * 0.58;
    skyColor.copy(DAY_SKY).lerp(DUSK_SKY, dusk).lerp(NIGHT_SKY, Math.min(1, night * 2.2)).lerp(RAIN_SKY, runtime.weather.current === "rain" ? 0.32 : 0);
    scene.background = skyColor;
    if (scene.fog instanceof Fog) {
      scene.fog.color.copy(skyColor);
      scene.fog.near = runtime.house.inside ? 13 : 35;
      scene.fog.far = runtime.house.inside ? 34 : 92;
    }
    if (ambient.current) ambient.current.intensity = 0.38 + (1 - dim) * 0.55;
    if (hemi.current) hemi.current.intensity = 0.25 + (1 - dim) * 0.62;
    if (sun.current) {
      sun.current.intensity = Math.max(0.08, 1.2 - dim * 1.0);
      sun.current.color.copy(DAY_SUN).lerp(NIGHT_SUN, Math.min(1, night * 2.5));
    }
  });

  return <>
    <ambientLight ref={ambient} color="#e7e3da" intensity={0.86} />
    <hemisphereLight ref={hemi} args={["#dce8ed", "#596251", 0.72]} />
    <directionalLight ref={sun} position={[-18, 28, -12]} color="#fff0d2" intensity={1.15} />
  </>;
}

export function RainParticles({ runtime, count = 155 }: { runtime: GameRuntime; count?: number }) {
  const line = useRef<LineSegments>(null);
  const geometry = useMemo(() => new BufferGeometry(), []);
  const material = useMemo(() => new LineBasicMaterial({ color: "#c4d9e2", transparent: true, opacity: 0.44, depthWrite: false }), []);
  const positions = useMemo(() => new Float32Array(count * 6), [count]);
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: Math.sin(i * 91.7 + 8.2) * 11,
    z: Math.cos(i * 71.3 + 2.4) * 11,
    y: 2 + (i * 37 % 100) / 100 * 11,
  })), [count]);
  const target = useMemo(() => new Vector3(), []);

  useEffect(() => {
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setDrawRange(0, count * 2);
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material, positions, count]);

  useFrame((_, delta) => {
    if (!line.current) return;
    const rain = runtime.weather.current === "rain" && !runtime.house.inside;
    line.current.visible = rain;
    if (!rain) return;
    const actor = runtime.getActorMapPosition();
    const world = runtime.house.inside ? [0, 0, 0] : [(actor.x - 1_200) * 0.045, 0, (actor.y - 880) * 0.045];
    target.set(world[0], 0, world[2]);
    const dt = Math.min(delta, 0.075);
    seeds.forEach((drop, index) => {
      drop.y -= 17.5 * dt;
      if (drop.y < 0.15) {
        drop.y = 9 + ((index * 13) % 60) / 10;
        drop.x = Math.sin(index * 11.73 + performance.now() * 0.0002) * 11;
        drop.z = Math.cos(index * 8.27 + performance.now() * 0.0002) * 11;
      }
      const base = index * 6;
      positions[base] = target.x + drop.x;
      positions[base + 1] = drop.y;
      positions[base + 2] = target.z + drop.z;
      positions[base + 3] = target.x + drop.x + 0.035;
      positions[base + 4] = drop.y - 0.42;
      positions[base + 5] = target.z + drop.z;
    });
    (geometry.getAttribute("position") as BufferAttribute).needsUpdate = true;
  });

  return <lineSegments ref={line} geometry={geometry} material={material} frustumCulled={false} />;
}
