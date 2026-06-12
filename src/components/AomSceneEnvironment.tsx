import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Component, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import type { Culture, EnvironmentMode, EnvironmentPreset, EnvironmentProp } from "../types";

const CULTURE_COLORS: Record<Culture, string> = {
  griega: "#c49b5c",
  egipcia: "#d5b35d",
  nordica: "#8ea3aa",
};

type Props = {
  culture: Culture;
  mode: EnvironmentMode;
  platformTexture?: string;
  preset?: EnvironmentPreset;
  worldScale: number;
};

export function AomSceneEnvironment({ culture, mode, platformTexture, preset, worldScale }: Props) {
  if (mode === "hidden") {
    return null;
  }

  const effectivePlatform = preset?.platformTexture ?? platformTexture;
  const props = mode === "full" ? preset?.props ?? [] : [];

  return (
    <group>
      <CultureBackdrop
        textureUrl={preset?.backdropTexture}
        color={preset?.backgroundColor ?? "#090705"}
        isWater={preset?.type === "water"}
      />
      <GroundStage
        textureUrl={effectivePlatform}
        detailTextureUrl={preset?.detailTexture}
        waterFrames={preset?.waterFrames}
        waterSpecTexture={preset?.waterSpecTexture}
        culture={culture}
        isWater={preset?.type === "water"}
      />
      <group scale={worldScale}>
        {props.map((prop) => (
          <EnvironmentPropErrorBoundary key={prop.id} fallback={<ProceduralEnvironmentProp prop={prop} culture={culture} />}>
            {prop.model ? <GeneratedEnvironmentProp prop={prop} /> : <ProceduralEnvironmentProp prop={prop} culture={culture} />}
          </EnvironmentPropErrorBoundary>
        ))}
      </group>
    </group>
  );
}

function CultureBackdrop({ textureUrl, color, isWater }: { textureUrl?: string; color: string; isWater?: boolean }) {
  return textureUrl ? (
    <TexturedBackdrop textureUrl={textureUrl} color={color} isWater={isWater} />
  ) : (
    <PlainBackdrop color={color} isWater={isWater} />
  );
}

function PlainBackdrop({ color, isWater }: { color: string; isWater?: boolean }) {
  return (
    <mesh position={[0, 5, 0]}>
      <cylinderGeometry args={[20, 20, 12, 96, 1, true]} />
      <meshBasicMaterial color={isWater ? "#071929" : color} side={THREE.BackSide} />
    </mesh>
  );
}

function TexturedBackdrop({ textureUrl, color, isWater }: { textureUrl: string; color: string; isWater?: boolean }) {
  const texture = useTexture(textureUrl);

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(2.5, 1);
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh position={[0, 5, 0]}>
      <cylinderGeometry args={[20, 20, 12, 96, 1, true]} />
      <meshBasicMaterial
        color={isWater ? "#9bd8ee" : color}
        map={texture}
        side={THREE.BackSide}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

function GroundStage({
  textureUrl,
  detailTextureUrl,
  culture,
  isWater,
  waterFrames,
  waterSpecTexture,
}: {
  textureUrl?: string;
  detailTextureUrl?: string;
  culture: Culture;
  isWater?: boolean;
  waterFrames?: string[];
  waterSpecTexture?: string;
}) {
  return (
    <group>
      {isWater && waterFrames?.length ? (
        <AnimatedWaterGround frameUrls={waterFrames} specTextureUrl={waterSpecTexture} />
      ) : textureUrl ? (
        <TexturedGround textureUrl={textureUrl} isWater={isWater} />
      ) : (
        <PlainGround isWater={isWater} />
      )}
      {detailTextureUrl && !isWater ? <TerrainDetailPatches textureUrl={detailTextureUrl} /> : null}
      {!isWater ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.018, 0]}>
          <ringGeometry args={[1.58, 1.62, 96]} />
          <meshBasicMaterial color={CULTURE_COLORS[culture]} transparent opacity={0.44} />
        </mesh>
      ) : null}
    </group>
  );
}

function AnimatedWaterGround({
  frameUrls,
  specTextureUrl,
}: {
  frameUrls: string[];
  specTextureUrl?: string;
}) {
  const material = useRef<THREE.MeshPhysicalMaterial>(null);
  const frames = useTexture(frameUrls) as THREE.Texture[];
  const specTexture = useTexture(specTextureUrl ?? frameUrls[0]);
  const frameIndex = useRef(-1);

  useMemo(() => {
    for (const texture of frames) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(5, 5);
      texture.colorSpace = THREE.SRGBColorSpace;
    }

    specTexture.wrapS = THREE.RepeatWrapping;
    specTexture.wrapT = THREE.RepeatWrapping;
    specTexture.repeat.set(5, 5);
  }, [frames, specTexture]);

  useFrame(({ clock }) => {
    if (!material.current || !frames.length) {
      return;
    }

    const nextFrame = Math.floor(clock.elapsedTime * 9) % frames.length;

    if (frameIndex.current !== nextFrame) {
      material.current.map = frames[nextFrame];
      material.current.needsUpdate = true;
      frameIndex.current = nextFrame;
    }

    const offset = clock.elapsedTime * 0.008;
    frames[nextFrame].offset.set(offset, offset * 0.62);
    specTexture.offset.set(-offset * 0.45, offset * 0.3);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.055, 0]} receiveShadow>
      <circleGeometry args={[16, 160]} />
      <meshPhysicalMaterial
        ref={material}
        map={frames[0]}
        roughnessMap={specTexture}
        color="#b4dce6"
        emissive="#082d3a"
        emissiveIntensity={0.22}
        roughness={0.22}
        metalness={0.12}
        clearcoat={0.9}
        clearcoatRoughness={0.18}
        transparent
        opacity={0.92}
      />
    </mesh>
  );
}

function PlainGround({ isWater }: { isWater?: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.045, 0]} receiveShadow>
      <circleGeometry args={[16, 128]} />
      <meshStandardMaterial
        color={isWater ? "#0a2632" : "#24180f"}
        roughness={isWater ? 0.35 : 0.92}
        metalness={isWater ? 0.08 : 0}
      />
    </mesh>
  );
}

function TexturedGround({ textureUrl, isWater }: { textureUrl: string; isWater?: boolean }) {
  const texture = useTexture(textureUrl);

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(isWater ? 12 : 16, isWater ? 12 : 16);
  texture.anisotropy = 4;
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.045, 0]} receiveShadow>
      <circleGeometry args={[16, 128]} />
      <meshStandardMaterial
        color={isWater ? "#76b9ca" : "#d8d0be"}
        map={texture}
        roughness={isWater ? 0.28 : 0.9}
        metalness={isWater ? 0.08 : 0}
      />
    </mesh>
  );
}

function TerrainDetailPatches({ textureUrl }: { textureUrl: string }) {
  const sourceTexture = useTexture(textureUrl);
  const patches = [
    { position: [-5.2, -0.034, -2.8] as [number, number, number], radius: 4.8, rotation: 0.2 },
    { position: [5.8, -0.033, -4.5] as [number, number, number], radius: 5.6, rotation: -0.55 },
    { position: [1.4, -0.032, 6.4] as [number, number, number], radius: 4.2, rotation: 0.8 },
  ];
  const textures = useMemo(
    () => patches.map((_, index) => {
      const texture = sourceTexture.clone();
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3.2, 3.2);
      texture.offset.set(index * 0.17, index * 0.11);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      return texture;
    }),
    [sourceTexture],
  );

  return (
    <>
      {patches.map((patch, index) => {
        return (
          <mesh
            key={`${patch.position[0]}-${patch.position[2]}`}
            rotation={[-Math.PI / 2, 0, patch.rotation]}
            position={patch.position}
            receiveShadow
          >
            <circleGeometry args={[patch.radius, 64]} />
            <meshStandardMaterial
              map={textures[index]}
              transparent
              opacity={0.32}
              roughness={0.94}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </>
  );
}

function GeneratedEnvironmentProp({ prop }: { prop: EnvironmentProp }) {
  const gltf = useGLTF(prop.model as string);
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);

    clone.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }

      node.castShadow = prop.castShadow !== false;
      node.receiveShadow = prop.receiveShadow !== false;

      const materials = Array.isArray(node.material) ? node.material : [node.material];

      for (const material of materials) {
        material.depthWrite = true;
        material.needsUpdate = true;
      }
    });

    return clone;
  }, [gltf.scene, prop.castShadow, prop.receiveShadow]);

  return (
    <group
      position={prop.position}
      rotation={prop.rotation ?? [0, 0, 0]}
      scale={prop.scale ?? 1}
    >
      <primitive object={scene} />
    </group>
  );
}

function ProceduralEnvironmentProp({ prop, culture }: { prop: EnvironmentProp; culture: Culture }) {
  const color = CULTURE_COLORS[culture];

  return (
    <group
      position={prop.position}
      rotation={prop.rotation ?? [0, 0, 0]}
      scale={prop.scale ?? 1}
    >
      <mesh castShadow receiveShadow position={[0, 0.8, 0]}>
        <boxGeometry args={[2.7, 1.6, 1.8]} />
        <meshStandardMaterial color="#2b2117" roughness={0.86} />
      </mesh>
      <mesh castShadow position={[0, 1.75, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.85, 1.15, 4]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}

class EnvironmentPropErrorBoundary extends Component<
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
