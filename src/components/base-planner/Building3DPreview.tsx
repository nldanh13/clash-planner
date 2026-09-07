import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getModelCandidateUrls } from "./model3d";

interface Building3DPreviewProps {
  buildingId: string;
  level?: number;
  /** Called once we know whether a real model exists, so the parent can
   *  hide the whole card instead of showing an empty 3D viewport for the
   *  ~52/53 buildings that don't have one yet. */
  onAvailabilityChange?: (available: boolean) => void;
  size?: number;
}

/**
 * Live, rotatable three.js preview of a building's Hyper3D-generated .glb
 * model (see raw-models/README.txt) — the real 3D asset, not a pre-baked
 * screenshot, so it stays inspectable/adjustable the way a flat sprite
 * never could. Silently reports unavailable (via onAvailabilityChange)
 * for any building that doesn't have a model yet, which today is nearly
 * all of them; the parent decides what to render instead.
 */
export function Building3DPreview({ buildingId, level, onAvailabilityChange, size = 220 }: Building3DPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let frameId = 0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(2.2, 2.2, 2.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.2, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.update();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x445544, 1.2));
    const dir = new THREE.DirectionalLight(0xffffff, 1.3);
    dir.position.set(3, 5, 2);
    scene.add(dir);

    const animate = () => {
      if (disposed) return;
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    let root: THREE.Object3D | null = null;
    const candidates = getModelCandidateUrls(buildingId, level);
    const loader = new GLTFLoader();

    const tryLoad = (index: number) => {
      if (index >= candidates.length) {
        if (!disposed) {
          setStatus("unavailable");
          onAvailabilityChange?.(false);
        }
        return;
      }
      loader.load(
        candidates[index],
        (gltf) => {
          if (disposed) return;
          root = gltf.scene;
          const box = new THREE.Box3().setFromObject(root);
          const dimensions = new THREE.Vector3();
          box.getSize(dimensions);
          const center = new THREE.Vector3();
          box.getCenter(center);
          const maxDim = Math.max(dimensions.x, dimensions.y, dimensions.z) || 1;
          const scale = 1.6 / maxDim;
          root.scale.setScalar(scale);
          root.position.sub(center.multiplyScalar(scale));
          scene.add(root);
          setStatus("ready");
          onAvailabilityChange?.(true);
          animate();
        },
        undefined,
        () => tryLoad(index + 1)
      );
    };
    tryLoad(0);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      controls.dispose();
      renderer.dispose();
      if (root) {
        root.traverse((obj: any) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const m of mats) m.dispose();
          }
        });
      }
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId, level, size]);

  if (status === "unavailable") return null;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div ref={containerRef} style={{ width: size, height: size }} />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400">
          Đang tải model 3D...
        </div>
      )}
    </div>
  );
}
