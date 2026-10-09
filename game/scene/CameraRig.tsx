"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, PerspectiveCamera, Raycaster, Vector3 } from "three";
import { useMemo } from "react";
import type { GameRuntime } from "@/game/runtime/GameRuntime";
import { interiorToWorld, mapToWorld } from "@/game/world/CityLayout";

export default function CameraRig({ runtime }: { runtime: GameRuntime }) {
  const { camera } = useThree();
  const raycaster = useMemo(() => new Raycaster(), []);
  const target = useMemo(() => new Vector3(), []);
  const desired = useMemo(() => new Vector3(), []);
  const direction = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    const actor = runtime.getActorMapPosition();
    const point = runtime.house.inside ? interiorToWorld(actor.x, actor.y) : mapToWorld(actor.x, actor.y);
    target.set(point[0], runtime.driving ? 0.82 : 1.02, point[2]);
    const yaw = runtime.cameraYaw;
    const pitch = runtime.cameraPitch;
    const distance = runtime.house.inside ? Math.min(4.25, runtime.cameraDistance) : runtime.driving ? runtime.cameraDistance + 1.1 : runtime.cameraDistance;
    const horizontal = Math.cos(pitch) * distance;
    desired.set(
      target.x - Math.sin(yaw) * horizontal,
      target.y + 0.72 + Math.sin(pitch) * distance,
      target.z + Math.cos(yaw) * horizontal,
    );
    direction.copy(desired).sub(target);
    const distanceToDesired = direction.length();
    direction.normalize();
    raycaster.set(target, direction);
    raycaster.near = 0.12;
    raycaster.far = distanceToDesired;
    const blockers = runtime.cameraBlockers;
    const hit = blockers.length ? raycaster.intersectObjects(blockers, true)[0] : undefined;
    if (hit) {
      const safeDistance = Math.max(1.35, hit.distance - 0.42);
      desired.copy(target).addScaledVector(direction, safeDistance);
    }

    const cameraResponse = 1 - Math.exp(-Math.min(delta, 0.075) * (runtime.driving ? 7.6 : 9.2));
    camera.position.lerp(desired, cameraResponse);
    const currentDistance = camera.position.distanceTo(target);
    const maxDistance = target.distanceTo(desired);
    if (currentDistance > maxDistance + 0.05) camera.position.copy(desired);
    camera.lookAt(target);
    if (camera instanceof PerspectiveCamera) camera.fov = MathUtils.damp(camera.fov, runtime.driving ? 61 : 58, 4, delta);
  });

  return null;
}
