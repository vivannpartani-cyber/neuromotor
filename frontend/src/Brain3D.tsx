import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';

type NodeKey = 'idle' | 'amygdala' | 'hippocampus' | 'frontal_lobe' | 'tools' | 'end' | 'error';

// Anatomically-inspired positions on the brain surface
const LOBE_POSITIONS: Record<string, [number, number, number]> = {
  amygdala:     [0.65,  -0.55,  0.52],   // temporal lobe, anterior-medial
  hippocampus:  [-0.58, -0.48, -0.25],   // medial temporal lobe
  frontal_lobe: [0,      0.70,  1.05],   // prefrontal cortex
};

const LOBE_COLORS: Record<string, THREE.Color> = {
  amygdala:     new THREE.Color('#f97316'),
  hippocampus:  new THREE.Color('#a855f7'),
  frontal_lobe: new THREE.Color('#10b981'),
};

// ─────────────────────────────────────────────────────
// Procedural brain hemisphere with gyral folds
// ─────────────────────────────────────────────────────
function Hemisphere({ flip }: { flip?: boolean }) {
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1.28, 128, 128);
    const pos = geo.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.sqrt(x * x + y * y + z * z);
      if (r === 0) continue;

      const theta = Math.acos(Math.max(-1, Math.min(1, y / r)));
      const phi   = Math.atan2(z, x);

      // Overlapping sinusoids → gyri + sulci (brain folds)
      const fold =
        Math.sin(theta * 6.8  + phi * 2.9) * 0.074 +
        Math.sin(theta * 11.5 + phi * 6.3) * 0.044 +
        Math.cos(theta * 4.2  - phi * 4.8) * 0.058 +
        Math.sin(theta * 18.1 + phi * 9.7) * 0.021 +
        Math.cos(theta * 8.6  - phi * 3.3) * 0.036 +
        Math.sin(theta * 14.4 + phi * 7.1) * 0.028;

      const nr = r + fold;
      pos.setXYZ(i, (x / r) * nr, (y / r) * nr, (z / r) * nr);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh
      geometry={geometry}
      position={flip ? [-0.53, 0, 0] : [0.53, 0, 0]}
      scale={flip ? [-1, 1, 1] : [1, 1, 1]}
    >
      <meshStandardMaterial
        color="#b57878"
        roughness={0.84}
        metalness={0.04}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────
// Cerebellum (back-bottom of brain)
// ─────────────────────────────────────────────────────
function Cerebellum() {
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.62, 48, 48);
    geo.scale(1.35, 0.65, 1.0);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.sqrt(x * x + y * y + z * z);
      if (r === 0) continue;
      const theta = Math.acos(Math.max(-1, Math.min(1, y / r)));
      const fold = Math.sin(theta * 22) * 0.045 + Math.sin(theta * 14 + x * 8) * 0.028;
      const nr = r + fold;
      pos.setXYZ(i, (x / r) * nr, (y / r) * nr, (z / r) * nr);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} position={[0, -0.92, -1.05]}>
      <meshStandardMaterial color="#9e6060" roughness={0.88} metalness={0.02} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────
// Brainstem
// ─────────────────────────────────────────────────────
function Brainstem() {
  return (
    <mesh position={[0, -1.5, -0.1]}>
      <cylinderGeometry args={[0.26, 0.17, 0.75, 24]} />
      <meshStandardMaterial color="#9a5c5c" roughness={0.9} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────
// Glowing lobe region overlay
// ─────────────────────────────────────────────────────
function LobeGlow({ lobeKey, isActive, isDone }: {
  lobeKey: string; isActive: boolean; isDone: boolean;
}) {
  const meshRef  = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const position = LOBE_POSITIONS[lobeKey] as [number, number, number];
  const color    = LOBE_COLORS[lobeKey];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;

    if (isActive) {
      const pulse = 0.45 + Math.sin(t * 5.5) * 0.3;
      mat.emissiveIntensity    = pulse;
      mat.opacity              = 0.6 + Math.sin(t * 5.5) * 0.2;
      meshRef.current.scale.setScalar(1 + Math.sin(t * 5.5) * 0.12);
      if (lightRef.current) lightRef.current.intensity = 2.5 + Math.sin(t * 5.5) * 1.5;
    } else if (isDone) {
      mat.emissiveIntensity    = 0.18;
      mat.opacity              = 0.45;
      meshRef.current.scale.setScalar(1);
      if (lightRef.current) lightRef.current.intensity = 0.55;
    } else {
      mat.emissiveIntensity    = 0.04;
      mat.opacity              = 0.18;
      meshRef.current.scale.setScalar(1);
      if (lightRef.current) lightRef.current.intensity = 0;
    }
  });

  return (
    <>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.04}
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        position={position}
        color={color}
        intensity={0}
        distance={2.8}
        decay={2}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────
// Animated synaptic arc (signal traveling between lobes)
// ─────────────────────────────────────────────────────
function SynapticArc({ from, to, color, active }: {
  from: [number, number, number];
  to: [number, number, number];
  color: THREE.Color;
  active: boolean;
}) {
  const dotRef = useRef<THREE.Mesh>(null);
  const tRef   = useRef(0);

  const curvePoints = useMemo(() => {
    const mid: [number, number, number] = [
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2 + 0.4,
      (from[2] + to[2]) / 2,
    ];
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...from),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...to),
    );
    return curve.getPoints(30);
  }, [from, to]);

  useFrame((_, delta) => {
    if (!active || !dotRef.current) { tRef.current = 0; return; }
    tRef.current = (tRef.current + delta * 1.2) % 1;
    const idx = Math.floor(tRef.current * (curvePoints.length - 1));
    const pt  = curvePoints[idx];
    dotRef.current.position.set(pt.x, pt.y, pt.z);
  });

  if (!active) return null;

  return (
    <>
      <Line
        points={curvePoints.map(p => [p.x, p.y, p.z] as [number, number, number])}
        color={color}
        lineWidth={1.2}
        transparent
        opacity={0.35}
      />
      <mesh ref={dotRef} position={from}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.5}
          blending={THREE.AdditiveBlending}
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

// ─────────────────────────────────────────────────────
// Full brain scene
// ─────────────────────────────────────────────────────
function BrainScene({ activeNode, doneNodes }: {
  activeNode: NodeKey; doneNodes: Set<NodeKey>;
}) {
  const active = (k: string) => activeNode === k;
  const done   = (k: string) => doneNodes.has(k as NodeKey);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.18} />
      <directionalLight position={[6, 6, 6]}   intensity={0.55} color="#fff8f0" />
      <directionalLight position={[-4, 3, -5]}  intensity={0.18} color="#8090ff" />
      <directionalLight position={[0, -4, 2]}   intensity={0.08} color="#ff9060" />

      {/* Brain anatomy */}
      <Hemisphere />
      <Hemisphere flip />
      <Cerebellum />
      <Brainstem />

      {/* Mid-sagittal fissure */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.07, 2.35, 2.5]} />
        <meshStandardMaterial color="#06070f" transparent opacity={0.97} />
      </mesh>

      {/* Lobe glows */}
      {Object.keys(LOBE_POSITIONS).map(k => (
        <LobeGlow key={k} lobeKey={k} isActive={active(k)} isDone={done(k)} />
      ))}

      {/* Synaptic signal arcs */}
      <SynapticArc
        from={LOBE_POSITIONS.amygdala}
        to={LOBE_POSITIONS.hippocampus}
        color={LOBE_COLORS.hippocampus}
        active={active('hippocampus')}
      />
      <SynapticArc
        from={LOBE_POSITIONS.hippocampus}
        to={LOBE_POSITIONS.frontal_lobe}
        color={LOBE_COLORS.frontal_lobe}
        active={active('frontal_lobe')}
      />

      <OrbitControls
        autoRotate
        autoRotateSpeed={0.55}
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI * 4 / 5}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────
// Exported component
// ─────────────────────────────────────────────────────
export default function Brain3D({ activeNode, doneNodes }: {
  activeNode: NodeKey; doneNodes: Set<NodeKey>;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.4, 4.6], fov: 44 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <BrainScene activeNode={activeNode} doneNodes={doneNodes} />
    </Canvas>
  );
}
