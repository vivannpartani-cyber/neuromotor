/**
 * Brain3D — V9 Anatomical Neural Visualization
 * 
 * Each region is a real anatomical location with:
 * - Its own color identity
 * - Glowing label when active
 * - Correct hemisphere/lobe positioning
 */
import { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const PARTICLE_COUNT = 18000;

// ── Anatomical regions with real approximate positions & colors ──────────
const REGIONS: Record<string, {
  center: THREE.Vector3;
  radius: number;
  color: THREE.Color;
  label: string;
  description: string;
}> = {
  amygdala:    { center: new THREE.Vector3(0.6, -0.7, 0.2),  radius: 0.35, color: new THREE.Color('#f97316'), label: 'Amygdala',          description: 'Threat Detection' },
  hippocampus: { center: new THREE.Vector3(-0.5, -0.5, 0.0), radius: 0.4,  color: new THREE.Color('#a855f7'), label: 'Hippocampus',       description: 'Memory Recall' },
  wernicke:    { center: new THREE.Vector3(-1.0, 0.0, 0.3),  radius: 0.45, color: new THREE.Color('#06b6d4'), label: "Wernicke's Area",   description: 'Comprehension' },
  parietal:    { center: new THREE.Vector3(0.0, 1.1, 0.3),   radius: 0.65, color: new THREE.Color('#3b82f6'), label: 'Parietal Lobe',     description: 'Logic Tracing' },
  temporal:    { center: new THREE.Vector3(1.1, -0.1, 0.2),  radius: 0.55, color: new THREE.Color('#10b981'), label: 'Temporal Lobe',     description: 'Pattern Recognition' },
  prefrontal:  { center: new THREE.Vector3(0.0, 0.5, 1.3),   radius: 0.7,  color: new THREE.Color('#6366f1'), label: 'Prefrontal Cortex', description: 'Planning' },
  broca:       { center: new THREE.Vector3(-0.9, 0.2, 0.8),  radius: 0.4,  color: new THREE.Color('#f43f5e'), label: "Broca's Area",      description: 'Code Generation' },
  cerebellum:  { center: new THREE.Vector3(0.0, -1.2, -0.8), radius: 0.6,  color: new THREE.Color('#eab308'), label: 'Cerebellum',        description: 'Refinement' },
};

const REGION_KEYS = Object.keys(REGIONS);

interface Brain3DProps {
  activeNodes: Set<string>;
  nodeLabel?: string;
}

export default function Brain3D({ activeNodes, nodeLabel }: Brain3DProps) {
  const pointsRef = useRef<THREE.Points>(null!);
  const { size } = useThree();

  // Build particle geometry once
  const { geometry, assignments } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);
    const opa = new Float32Array(PARTICLE_COUNT);
    const siz = new Float32Array(PARTICLE_COUNT);
    const assigns: string[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Ellipsoid brain shape
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = Math.cbrt(Math.random()) * 2.2;

      let x = r * Math.sin(phi) * Math.cos(theta) * 0.85;
      let y = r * Math.sin(phi) * Math.sin(theta) * 1.0;
      let z = r * Math.cos(phi) * 1.15;

      // Hemisphere gap
      if (Math.abs(x) < 0.08) x += x >= 0 ? 0.08 : -0.08;

      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;

      const pv = new THREE.Vector3(x, y, z);

      // Assign to nearest region
      let minD = Infinity, assigned = 'generic';
      for (const key of REGION_KEYS) {
        const d = pv.distanceTo(REGIONS[key].center);
        if (d < minD && d < REGIONS[key].radius * 1.5) {
          minD = d; assigned = key;
        }
      }
      assigns.push(assigned);

      const baseColor = assigned !== 'generic'
        ? REGIONS[assigned].color
        : new THREE.Color('#1e3a5f');

      col[i * 3] = baseColor.r; col[i * 3 + 1] = baseColor.g; col[i * 3 + 2] = baseColor.b;
      opa[i] = assigned !== 'generic' ? 0.12 : 0.05;
      siz[i] = assigned !== 'generic' ? 6 + Math.random() * 4 : 3 + Math.random() * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    geo.setAttribute('alpha',    new THREE.BufferAttribute(opa, 1));
    geo.setAttribute('size',     new THREE.BufferAttribute(siz, 1));
    return { geometry: geo, assignments: assigns };
  }, []);

  const shaderMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      attribute float alpha;
      attribute float size;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        if (d > 0.5) discard;
        float glow = 1.0 - (d * 1.8);
        gl_FragColor = vec4(vColor, vAlpha * glow);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
  }), []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.08) * 0.25;
    pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.12) * 0.08;
    shaderMaterial.uniforms.time.value = state.clock.elapsedTime;

    const alphas = geometry.attributes.alpha.array as Float32Array;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const reg = assignments[i];
      if (reg === 'generic') {
        alphas[i] = 0.04 + Math.sin(t * 0.5 + i * 0.001) * 0.02;
        continue;
      }
      const isActive = activeNodes.has(reg);
      if (isActive) {
        // Intense, rapid pulsing glow
        alphas[i] = 1.8 + Math.sin(t * 15 + i * 0.1) * 0.6;
      } else {
        // Gentle idle shimmer
        alphas[i] = 0.1 + Math.sin(t * 0.8 + i * 0.01) * 0.04;
      }
    }
    geometry.attributes.alpha.needsUpdate = true;
  });

  // Compute label positions for active regions (in 3D space)
  const activeRegionEntries = REGION_KEYS
    .filter(k => activeNodes.has(k))
    .map(k => ({ key: k, ...REGIONS[k] }));

  return (
    <group>
      <ambientLight intensity={0.1} />

      <points ref={pointsRef} geometry={geometry} material={shaderMaterial} />

      {/* Floating labels for active regions */}
      {activeRegionEntries.map(({ key, center, color, label, description }) => (
        <Html
          key={key}
          position={[center.x * 1.1 + 0.2, center.y * 1.1 + 0.2, center.z]}
          style={{ pointerEvents: 'none' }}
          center
        >
          <div style={{
            background: 'rgba(2,6,23,0.85)',
            border: `1px solid ${color.getStyle()}`,
            borderRadius: 6,
            padding: '3px 8px',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(6px)',
            boxShadow: `0 0 12px ${color.getStyle()}`,
          }}>
            <div style={{ color: color.getStyle(), fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', fontFamily: 'monospace' }}>
              {label.toUpperCase()}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 8, fontFamily: 'monospace' }}>
              {description}
            </div>
          </div>
        </Html>
      ))}
    </group>
  );
}
