import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// ─────────────────────────────────────────
// Brain Particle System
// ─────────────────────────────────────────
function BrainParticles({ activeNode, doneNodes }: { activeNode: string; doneNodes: Set<string> }) {
  const pointsRef = useRef<THREE.Points>(null);

  const PARTICLE_COUNT = 15000;
  
  // Mathematical procedural generation of a point-cloud brain
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);
    const baseColor = new THREE.Color('#3b82f6'); // Default blue-ish

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // 1. Generate random point in an ellipsoid (rough brain shape)
      let r = Math.cbrt(Math.random()) * 2.5; // Radius
      let theta = Math.random() * 2 * Math.PI;
      let phi = Math.acos(2 * Math.random() - 1);
      
      let x = r * Math.sin(phi) * Math.cos(theta) * 0.8; // Width
      let y = r * Math.sin(phi) * Math.sin(theta) * 1.1; // Height
      let z = r * Math.cos(phi) * 1.4; // Length
      
      // 2. Separate into hemispheres (Sagittal Fissure)
      if (x > 0) x += 0.15;
      else x -= 0.15;
      
      // 3. Add random noise for "gyri and sulci" texture
      x += (Math.random() - 0.5) * 0.2;
      y += (Math.random() - 0.5) * 0.2;
      z += (Math.random() - 0.5) * 0.2;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // Initialize all with a dark blue glow
      col[i * 3] = baseColor.r * 0.3;
      col[i * 3 + 1] = baseColor.g * 0.3;
      col[i * 3 + 2] = baseColor.b * 0.3;
    }
    return [pos, col];
  }, []);

  // Animate the particle colors based on active nodes
  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const time = clock.getElapsedTime();
    const colorsArr = pointsRef.current.geometry.attributes.color.array as Float32Array;
    const posArr = pointsRef.current.geometry.attributes.position.array as Float32Array;

    const targetColors: Record<string, THREE.Color> = {
      amygdala: new THREE.Color('#f97316'), // Orange
      hippocampus: new THREE.Color('#a855f7'), // Purple
      frontal_lobe: new THREE.Color('#10b981'), // Green
      base: new THREE.Color('#3b82f6').multiplyScalar(0.2) // Dim blue
    };

    // Locate rough coordinate centers for lobes
    const centers = {
      amygdala: new THREE.Vector3(0, -0.5, 0),
      hippocampus: new THREE.Vector3(0, -0.2, 0.5),
      frontal_lobe: new THREE.Vector3(0, 1.0, 1.0)
    };

    const isIdle = activeNode === 'idle' || activeNode === 'end';
    
    // Rotate the whole brain slowly
    pointsRef.current.rotation.y = time * 0.1;
    pointsRef.current.rotation.z = Math.sin(time * 0.2) * 0.05;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = posArr[i * 3];
      const y = posArr[i * 3 + 1];
      const z = posArr[i * 3 + 2];
      
      const pt = new THREE.Vector3(x, y, z);
      let r = targetColors.base.r;
      let g = targetColors.base.g;
      let b = targetColors.base.b;
      let intensity = 1.0;

      // Pulse the whole brain when idle
      if (isIdle) {
        intensity = 1.0 + Math.sin(time * 2 + y * 2) * 0.3;
      } 
      // If a node is active, highlight the region
      else {
        // Frontal Lobe activation
        if (activeNode === 'frontal_lobe' && pt.distanceTo(centers.frontal_lobe) < 1.8) {
          intensity = 3.0 + Math.sin(time * 8) * 2;
          r = targetColors.frontal_lobe.r; g = targetColors.frontal_lobe.g; b = targetColors.frontal_lobe.b;
        }
        // Amygdala activation
        else if (activeNode === 'amygdala' && pt.distanceTo(centers.amygdala) < 1.2) {
          intensity = 4.0 + Math.random() * 2; // Frantic flickering
          r = targetColors.amygdala.r; g = targetColors.amygdala.g; b = targetColors.amygdala.b;
        }
        // Hippocampus activation
        else if (activeNode === 'hippocampus' && pt.distanceTo(centers.hippocampus) < 1.5) {
          intensity = 2.0 + Math.sin(time * 4) * 1.5;
          r = targetColors.hippocampus.r; g = targetColors.hippocampus.g; b = targetColors.hippocampus.b;
        }
      }

      // Smooth color transition
      colorsArr[i * 3] += (r * intensity - colorsArr[i * 3]) * 0.1;
      colorsArr[i * 3 + 1] += (g * intensity - colorsArr[i * 3 + 1]) * 0.1;
      colorsArr[i * 3 + 2] += (b * intensity - colorsArr[i * 3 + 2]) * 0.1;
    }
    
    pointsRef.current.geometry.attributes.color.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={PARTICLE_COUNT} array={colors} itemSize={3} />
      </bufferGeometry>
      {/* Additive blending makes the points glow when overlapping */}
      <pointsMaterial size={0.03} vertexColors blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.8} />
    </points>
  );
}

// ─────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────
export default function Brain3D({ activeNode, doneNodes }: { activeNode: string; doneNodes: Set<string> }) {
  return (
    <Canvas camera={{ position: [5, 2, -4], fov: 45 }} gl={{ antialias: false, alpha: true }}>
      <color attach="background" args={['#020617']} />
      
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
      
      <BrainParticles activeNode={activeNode} doneNodes={doneNodes} />

      {/* Bloom Post-Processing for the crazy neon glow */}
      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
      </EffectComposer>
    </Canvas>
  );
}
