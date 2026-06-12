import { Html, OrbitControls, PerspectiveCamera, useAnimations, useGLTF, useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Maximize2, Minimize2, Mountain } from "lucide-react";
import { Component, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Group } from "three";
import * as THREE from "three";
import { AomSceneEnvironment } from "./AomSceneEnvironment";
import { playUiTone } from "../lib/sound";
import type { AnimationState, EnvironmentMode, EnvironmentPreset, UnitRecord, UnitTextureReplacement, UnitVisualPart } from "../types";

type Props = {
  unit: UnitRecord;
  animation: AnimationState;
  resetNonce: number;
  platformTexture?: string;
  environmentPreset?: EnvironmentPreset;
  enabledVisualPartIds?: string[];
  activeVisualStateIds?: string[];
};

const CULTURE_COLORS = {
  griega: "#c49b5c",
  egipcia: "#d5b35d",
  nordica: "#8ea3aa",
};

export function UnitViewer3D({
  unit,
  animation,
  resetNonce,
  platformTexture,
  environmentPreset,
  enabledVisualPartIds = [],
  activeVisualStateIds = [],
}: Props) {
  const viewerRef = useRef<HTMLElement>(null);
  const [environmentMode, setEnvironmentMode] = useState<EnvironmentMode>("full");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [worldScale, setWorldScale] = useState(1);
  const modelUrl = getModelUrl(unit, animation.name, activeVisualStateIds);
  const visualPartKey = enabledVisualPartIds.join("-");
  const visualStateKey = activeVisualStateIds.join("-");
  const backgroundColor = environmentMode === "hidden" ? "#080605" : environmentPreset?.backgroundColor ?? "#090705";
  const fogColor = environmentMode === "hidden" ? "#080605" : environmentPreset?.fogColor ?? backgroundColor;

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(document.fullscreenElement === viewerRef.current);

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  async function toggleFullscreen() {
    playUiTone("toggle");

    if (document.fullscreenElement === viewerRef.current) {
      await document.exitFullscreen();
      return;
    }

    if (viewerRef.current?.requestFullscreen) {
      await viewerRef.current.requestFullscreen();
    }
  }

  return (
    <section
      ref={viewerRef}
      className={`viewer-shell${isFullscreen ? " is-fullscreen" : ""}`}
      aria-label={`Modelo 3D de ${unit.name}`}
    >
      <Canvas shadows dpr={[1, 1.75]}>
        <PerspectiveCamera makeDefault position={[0, 2.4, 6.2]} fov={42} />
        <color attach="background" args={[backgroundColor]} />
        <fog attach="fog" args={[fogColor, environmentMode === "hidden" ? 9 : 7, environmentMode === "hidden" ? 18 : 24]} />
        <ambientLight color={environmentPreset?.ambientColor ?? "#f2d7a4"} intensity={0.82} />
        <directionalLight
          position={[4, 7, 4]}
          color={environmentPreset?.keyLightColor ?? "#ffd38a"}
          intensity={2.05}
          castShadow
        />
        <pointLight position={[-3, 2, -2]} color={environmentPreset?.fillLightColor ?? "#b45f35"} intensity={3.6} />
        <ModelErrorBoundary
          key={unit.id}
          fallback={<ProceduralMythUnit unit={unit} animation={animation} />}
        >
          <Suspense fallback={<LoadingModel />}>
            {modelUrl ? (
              <GeneratedModel
                key={`${unit.id}-${animation.name}-${visualPartKey}-${visualStateKey}`}
                unit={unit}
                animation={animation}
                modelUrl={modelUrl}
                enabledVisualPartIds={enabledVisualPartIds}
                activeVisualStateIds={activeVisualStateIds}
                onFitScaleChange={setWorldScale}
              />
            ) : (
              <ProceduralMythUnit unit={unit} animation={animation} />
            )}
          </Suspense>
        </ModelErrorBoundary>
        <Suspense fallback={null}>
          <AomSceneEnvironment
            culture={unit.culture}
            mode={environmentMode}
            platformTexture={platformTexture}
            preset={environmentPreset}
            worldScale={worldScale}
          />
        </Suspense>
        <OrbitControls
          key={resetNonce}
          makeDefault
          enablePan={false}
          minDistance={1.4}
          maxDistance={30}
          minPolarAngle={0.35}
          maxPolarAngle={1.62}
          target={[0, 1.35, 0]}
        />
      </Canvas>
      <button
        type="button"
        className="viewer-fullscreen-button"
        aria-label={isFullscreen ? "Salir de pantalla completa" : "Ver modelo en pantalla completa"}
        title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        onClick={() => void toggleFullscreen()}
        onMouseEnter={() => playUiTone("hover")}
      >
        {isFullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
      </button>
      <EnvironmentModeControls mode={environmentMode} onChange={setEnvironmentMode} />
    </section>
  );
}

function getModelUrl(unit: UnitRecord, animationName: string, activeVisualStateIds: string[]) {
  const activeVisualStates = (unit.assets.visualStates ?? []).filter((state) => activeVisualStateIds.includes(state.id));

  for (const state of [...activeVisualStates].reverse()) {
    const stateAnimationModel = state.animationModels?.[animationName];

    if (stateAnimationModel) {
      return stateAnimationModel;
    }

    if (state.model) {
      return state.model;
    }
  }

  return unit.assets.animationModels?.[animationName] ?? unit.assets.model;
}

class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function GeneratedModel({
  unit,
  animation,
  modelUrl,
  enabledVisualPartIds,
  activeVisualStateIds,
  onFitScaleChange,
}: {
  unit: UnitRecord;
  animation: AnimationState;
  modelUrl: string;
  enabledVisualPartIds: string[];
  activeVisualStateIds: string[];
  onFitScaleChange: (scale: number) => void;
}) {
  const group = useRef<Group>(null);
  const animatedBounds = useRef(new THREE.Box3());
  const groundedY = useRef(0);
  const gltf = useGLTF(modelUrl);
  const referenceGltf = useGLTF(getReferenceModelUrl(unit, modelUrl));
  const enabledParts = useMemo(() => {
    const parts = unit.assets.visualParts ?? [];

    if (parts.length) {
      const enabled = new Set(enabledVisualPartIds);
      return parts.filter((part) => enabled.has(part.id));
    }

    return (unit.assets.attachments ?? []).map((model, index) => ({
      id: `legacy-${index}`,
      label: `Pieza ${index + 1}`,
      category: "other",
      model,
    }) as UnitVisualPart);
  }, [enabledVisualPartIds, unit.assets.attachments, unit.assets.visualParts]);
  const attachmentUrls = useMemo(() => enabledParts.map((part) => part.model), [enabledParts]);
  const attachmentGltfs = useGLTF(attachmentUrls) as unknown as Array<{ scene: THREE.Object3D }>;
  const activeVisualStates = useMemo(
    () => (unit.assets.visualStates ?? []).filter((state) => activeVisualStateIds.includes(state.id)),
    [activeVisualStateIds, unit.assets.visualStates],
  );
  const textureReplacements = useMemo(
    () => activeVisualStates.flatMap((state) => state.replaceTextures ?? []).filter((replacement) => replacement.texture),
    [activeVisualStates],
  );
  const replacementTextures = useTexture(textureReplacements.map((replacement) => replacement.texture as string)) as
    | THREE.Texture
    | THREE.Texture[];
  const scene = useMemo(() => {
    const root = new THREE.Group();
    const mainScene = gltf.scene.clone(true);
    root.add(mainScene);

    applyTextureReplacements(mainScene, textureReplacements, replacementTextures);

    const attachments = Array.isArray(attachmentGltfs) ? attachmentGltfs : [];

    for (let index = 0; index < attachments.length; index += 1) {
      const part = enabledParts[index];
      const attachmentScene = attachments[index].scene.clone(true);

      if (!part?.attachTo) {
        root.add(attachmentScene);
        continue;
      }

      mountAttachment(mainScene, attachmentScene, part.attachTo, part.attachSource ?? "hotspot");
    }

    return root;
  }, [attachmentGltfs, enabledParts, gltf.scene, replacementTextures, textureReplacements]);
  const { actions } = useAnimations(gltf.animations, group);
  const referenceScale = useMemo(() => calculateFit(referenceGltf.scene).scale, [referenceGltf.scene]);
  const fit = useMemo(() => calculateFit(scene, referenceScale), [referenceScale, scene]);

  useEffect(() => {
    onFitScaleChange(fit.scale);
    groundedY.current = fit.position.y;
  }, [fit.scale, onFitScaleChange]);

  useEffect(() => {
    Object.values(actions).forEach((action) => action?.fadeOut(0.15));
    const selectedAction = actions[animation.name] ?? actions[Object.keys(actions)[0]] ?? Object.values(actions)[0];

    if (selectedAction && animation.playing) {
      selectedAction.reset().fadeIn(0.15).play();
    }

    return () => {
      selectedAction?.fadeOut(0.15);
    };
  }, [actions, animation.name, animation.playing]);

  useFrame((_, delta) => {
    if (!group.current) {
      return;
    }

    group.current.updateMatrixWorld(true);
    animatedBounds.current.setFromObject(scene.children[0] ?? group.current, true);

    if (Number.isFinite(animatedBounds.current.min.y)) {
      const correction = -animatedBounds.current.min.y;
      groundedY.current += correction;
      group.current.position.y = groundedY.current;
    }

    if (!animation.playing) {
      group.current.rotation.y += delta * 0.12;
    }
  });

  return (
    <group
      ref={group}
      position={[fit.position.x, fit.position.y, fit.position.z]}
      scale={fit.scale}
    >
      <primitive object={scene} />
    </group>
  );
}

function getReferenceModelUrl(unit: UnitRecord, fallback: string) {
  const idleEntry = Object.entries(unit.assets.animationModels ?? {}).find(
    ([name]) => name === "idle" || name.startsWith("idle-"),
  );

  return idleEntry?.[1] ?? unit.assets.model ?? fallback;
}

function mountAttachment(
  mainScene: THREE.Object3D,
  attachmentScene: THREE.Object3D,
  attachTo: string,
  attachSource: string,
) {
  const target = findAomNode(mainScene, attachTo);
  const hotspot = findAomNode(attachmentScene, attachSource);

  if (!target || !hotspot) {
    mainScene.add(attachmentScene);
    return;
  }

  attachmentScene.updateMatrixWorld(true);
  hotspot.updateMatrixWorld(true);

  const localHotspotMatrix = new THREE.Matrix4()
    .copy(attachmentScene.matrixWorld)
    .invert()
    .multiply(hotspot.matrixWorld);

  attachmentScene.applyMatrix4(localHotspotMatrix.invert());
  target.add(attachmentScene);
}

function findAomNode(root: THREE.Object3D, attachName: string) {
  const expected = normalizeAomName(attachName);
  let found: THREE.Object3D | undefined;

  root.traverse((node) => {
    if (found) {
      return;
    }

    const normalized = normalizeAomName(node.name).replace(/^dummy/, "");

    if (normalized === expected || normalized.endsWith(expected)) {
      found = node;
    }
  });

  return found;
}

function applyTextureReplacements(
  root: THREE.Object3D,
  replacements: UnitTextureReplacement[],
  loadedTextures: THREE.Texture | THREE.Texture[],
) {
  if (!replacements.length) {
    return;
  }

  const textures = Array.isArray(loadedTextures) ? loadedTextures : [loadedTextures];

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }

    const materials = Array.isArray(node.material) ? node.material : [node.material];

    for (const material of materials) {
      let replacementIndex = -1;

      replacements.forEach((replacement, index) => {
        if (materialMatchesTextureName(material.name, replacement.from)) {
          replacementIndex = index;
        }
      });

      if (replacementIndex < 0) {
        continue;
      }

      const texture = textures[replacementIndex];

      if (!texture) {
        continue;
      }

      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;

      const nextMaterial = material.clone();
      nextMaterial.map = texture;
      nextMaterial.needsUpdate = true;

      if (Array.isArray(node.material)) {
        node.material = node.material.map((candidate) => (candidate === material ? nextMaterial : candidate));
      } else {
        node.material = nextMaterial;
      }
    }
  });
}

function materialMatchesTextureName(materialName: string, textureName: string) {
  const material = normalizeAomName(materialName.replace(/\(.*?\)/g, ""));
  const texture = normalizeAomName(textureName);

  return material === texture || material.endsWith(texture);
}

function normalizeAomName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function calculateFit(scene: THREE.Object3D, scaleOverride?: number) {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
  const scale = scaleOverride ?? 3 / maxDimension;

  return {
    scale,
    position: new THREE.Vector3(-center.x * scale, -box.min.y * scale, -center.z * scale),
  };
}

function ProceduralMythUnit({ unit, animation }: { unit: UnitRecord; animation: AnimationState }) {
  const group = useRef<Group>(null);
  const baseColor = CULTURE_COLORS[unit.culture];
  const accent = unit.culture === "egipcia" ? "#2d8f88" : unit.culture === "nordica" ? "#8fb6d8" : "#b7422a";

  useFrame((state, delta) => {
    if (!group.current) {
      return;
    }

    const t = state.clock.elapsedTime;

    if (animation.playing) {
      group.current.rotation.y += delta * (animation.name === "walk" || animation.name === "fly" ? 0.9 : 0.38);
      group.current.position.y = Math.sin(t * 2.2) * 0.035;
    } else {
      group.current.rotation.y += delta * 0.08;
    }
  });

  const silhouette = useMemo(() => {
    if (unit.id.includes("giant") || unit.id === "colossus" || unit.id === "cyclops") {
      return "giant";
    }

    if (unit.id.includes("phoenix") || unit.id.includes("manticore") || unit.id.includes("chimera")) {
      return "winged";
    }

    if (unit.id.includes("centaur") || unit.id.includes("valkyrie") || unit.id.includes("sphinx")) {
      return "quadruped";
    }

    if (unit.id.includes("kraken") || unit.id.includes("hydra")) {
      return "serpentine";
    }

    return "humanoid";
  }, [unit.id]);

  return (
    <group ref={group} dispose={null}>
      <mesh castShadow receiveShadow position={[0, 1.15, 0]}>
        <capsuleGeometry args={[silhouette === "giant" ? 0.62 : 0.42, silhouette === "giant" ? 1.65 : 1.05, 12, 24]} />
        <meshStandardMaterial color={baseColor} roughness={0.64} metalness={unit.id === "colossus" ? 0.65 : 0.12} />
      </mesh>
      <mesh castShadow position={[0, silhouette === "giant" ? 2.35 : 1.85, 0]}>
        <sphereGeometry args={[silhouette === "giant" ? 0.38 : 0.27, 24, 16]} />
        <meshStandardMaterial color={accent} roughness={0.5} emissive={accent} emissiveIntensity={0.08} />
      </mesh>
      <Appendages silhouette={silhouette} baseColor={baseColor} accent={accent} />
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[1.18, 1.27, 64]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.28} transparent opacity={0.76} />
      </mesh>
    </group>
  );
}

function Appendages({
  silhouette,
  baseColor,
  accent,
}: {
  silhouette: string;
  baseColor: string;
  accent: string;
}) {
  if (silhouette === "winged") {
    return (
      <>
        <Wing side={-1} color={accent} />
        <Wing side={1} color={accent} />
        <Tail color={baseColor} />
      </>
    );
  }

  if (silhouette === "quadruped") {
    return (
      <>
        {[-0.42, 0.42].map((x) =>
          [-0.35, 0.35].map((z) => <Leg key={`${x}-${z}`} x={x} z={z} color={baseColor} />),
        )}
        <mesh castShadow position={[0, 1.0, -0.72]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.16, 0.9, 8, 14]} />
          <meshStandardMaterial color={baseColor} roughness={0.6} />
        </mesh>
      </>
    );
  }

  if (silhouette === "serpentine") {
    return (
      <>
        {[-0.55, 0, 0.55].map((x, index) => (
          <mesh key={x} castShadow position={[x, 0.85 + index * 0.12, -0.2]} rotation={[0, 0, x * 0.45]}>
            <torusGeometry args={[0.33, 0.11, 12, 28]} />
            <meshStandardMaterial color={index === 1 ? accent : baseColor} roughness={0.55} />
          </mesh>
        ))}
      </>
    );
  }

  return (
    <>
      <Arm side={-1} color={baseColor} />
      <Arm side={1} color={baseColor} />
      <Leg x={-0.25} z={0} color={baseColor} />
      <Leg x={0.25} z={0} color={baseColor} />
    </>
  );
}

function Wing({ side, color }: { side: -1 | 1; color: string }) {
  return (
    <mesh castShadow position={[side * 0.72, 1.35, -0.05]} rotation={[0.25, 0, side * 0.72]}>
      <coneGeometry args={[0.58, 1.55, 4]} />
      <meshStandardMaterial color={color} roughness={0.5} side={THREE.DoubleSide} transparent opacity={0.84} />
    </mesh>
  );
}

function Arm({ side, color }: { side: -1 | 1; color: string }) {
  return (
    <mesh castShadow position={[side * 0.52, 1.2, 0]} rotation={[0.25, 0, side * 0.35]}>
      <capsuleGeometry args={[0.12, 0.85, 8, 14]} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>
  );
}

function Leg({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <mesh castShadow position={[x, 0.45, z]} rotation={[0.08, 0, x * 0.12]}>
      <capsuleGeometry args={[0.13, 0.8, 8, 14]} />
      <meshStandardMaterial color={color} roughness={0.68} />
    </mesh>
  );
}

function Tail({ color }: { color: string }) {
  return (
    <mesh castShadow position={[0, 0.78, -0.82]} rotation={[Math.PI / 2.5, 0, 0]}>
      <coneGeometry args={[0.18, 1.3, 16]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  );
}

function LoadingModel() {
  return (
    <Html center>
      <div className="model-loading">Cargando reliquia...</div>
    </Html>
  );
}

function EnvironmentModeControls({
  mode,
  onChange,
}: {
  mode: EnvironmentMode;
  onChange: (mode: EnvironmentMode) => void;
}) {
  const options: Array<{ value: EnvironmentMode; label: string }> = [
    { value: "full", label: "Completo" },
    { value: "simple", label: "Simple" },
    { value: "hidden", label: "Oculto" },
  ];

  return (
    <details className="environment-mode-controls">
      <summary aria-label="Configurar ambiente" title="Ambiente">
        <Mountain size={19} aria-hidden="true" />
      </summary>
      <div className="environment-mode-menu" aria-label="Modo de ambiente 3D">
        <span>Ambiente</span>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={mode === option.value ? "active" : ""}
            onClick={() => {
              playUiTone("toggle");
              onChange(option.value);
            }}
            onMouseEnter={() => playUiTone("hover")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </details>
  );
}
