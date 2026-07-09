import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

interface Brain3DProps {
  activeNodes: Set<string>; // 'amygdala', 'hippocampus', 'syntax', 'logic', 'security', 'frontal_lobe'
}

export default function Brain3D({ activeNodes }: Brain3DProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const PARTICLE_COUNT = 15000;

  // Lobe centers for the neural network
  // Amygdala (Deep center, base)
  // Hippocampus (Curving around Amygdala)
  // Syntax Node / Parietal (Top Back)
  // Logic Node / Temporal (Sides, lower)
  // Security Node / Insular (Deep lateral)
  // Frontal Lobe (Front)
  
  const LOBE_CENTERS = useMemo(() => ({
    amygdala:     new THREE.Vector3(0, -0.5, 0),
    hippocampus:  new THREE.Vector3(0, -0.2, -0.5),
    syntax:       new THREE.Vector3(0, 1.2, -1.0),
    logic:        new THREE.Vector3(1.0, 0, 0),
    security:     new THREE.Vector3(-1.0, 0, 0),
    frontal_lobe: new THREE.Vector3(0, 0.8, 1.5)
  }), []);

  const [positions, colors, baseOpacities, clusterAssignments] = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);
    const opa = new Float32Array(PARTICLE_COUNT);
    const cls = new Array<string>(PARTICLE_COUNT);
    
    // Base colors for each lobe
    const COLORS = {
      amygdala:     new THREE.Color('#f97316'), // Orange
      hippocampus:  new THREE.Color('#a855f7'), // Purple
      syntax:       new THREE.Color('#3b82f6'), // Blue
      logic:        new THREE.Color('#eab308'), // Yellow
      security:     new THREE.Color('#ef4444'), // Red
      frontal_lobe: new THREE.Color('#10b981'), // Emerald
      generic:      new THREE.Color('#334155')  // Slate
    };

    const lobeKeys = Object.keys(LOBE_CENTERS) as Array<keyof typeof LOBE_CENTERS>;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Generate a brain-like shape (ellipsoid)
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = Math.cbrt(Math.random()) * 2.5;

      // Squish into brain shape
      let x = r * Math.sin(phi) * Math.cos(theta) * 0.8; // width
      let y = r * Math.sin(phi) * Math.sin(theta) * 0.9; // height
      let z = r * Math.cos(phi) * 1.1; // length
      
      // Hemispheric split
      if (Math.abs(x) < 0.1) x += (x > 0 ? 0.1 : -0.1);

      pos[i * 3]     = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      const pVec = new THREE.Vector3(x, y, z);
      
      // Assign to closest lobe
      let minDst = Infinity;
      let assignedLobe = 'generic';
      
      for (const lobe of lobeKeys) {
        // Since logic and security are on sides, we check distance to their absolute X centers but mirror it
        let center = LOBE_CENTERS[lobe].clone();
        if (lobe === 'logic') center.x = Math.abs(x) > 0 ? 1.0 : -1.0; 
        
        const d = pVec.distanceTo(center);
        if (d < minDst) {
          minDst = d;
          assignedLobe = lobe;
        }
      }
      
      // If it's too far from any specific center, it's generic cortex
      if (minDst > 1.2) assignedLobe = 'generic';
      
      cls[i] = assignedLobe;
      
      const c = COLORS[assignedLobe as keyof typeof COLORS];
      col[i * 3]     = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      
      opa[i] = assignedLobe === 'generic' ? 0.1 : 0.2;
    }
    
    return [pos, col, opa, cls];
  }, [LOBE_CENTERS]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(baseOpacities, 1));
    return geo;
  }, [positions, colors, baseOpacities]);

  // Custom Shader to handle per-particle alpha and glow pulsing based on active nodes
  const shaderMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      activeAmygdala: { value: 0 },
      activeHippocampus: { value: 0 },
      activeSyntax: { value: 0 },
      activeLogic: { value: 0 },
      activeSecurity: { value: 0 },
      activeFrontal: { value: 0 },
    },
    vertexShader: `
      attribute float alpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (10.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        // Soft circular particle
        float d = distance(gl_PointCoord, vec2(0.5));
        if (d > 0.5) discard;
        gl_FragColor = vec4(vColor, vAlpha * (1.0 - (d * 2.0)));
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
  }), []);

  useFrame((state) => {
    if (pointsRef.current) {
      // Slow brain rotation
      pointsRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.3;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.1;
      
      // Update Uniforms for pulsing
      shaderMaterial.uniforms.time.value = state.clock.elapsedTime;
      
      // We manually update alphas in the buffer instead of uniforms to keep it simple, 
      // but uniforms are faster. Let's just update the alpha buffer directly for the clusters.
      const alphas = geometry.attributes.alpha.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const lobe = clusterAssignments[i];
        let targetAlpha = 0.1; // Base generic alpha
        
        if (lobe !== 'generic') {
          targetAlpha = 0.15; // Base lobe alpha
          const isActive = activeNodes.has(lobe);
          if (isActive) {
            targetAlpha = 2.0 + Math.sin(state.clock.elapsedTime * 10 + i) * 0.5; // Huge glow
          }
        }
        
        // Smoothly interpolate alpha
        alphas[i] += (targetAlpha - alphas[i]) * 0.1;
      }
      geometry.attributes.alpha.needsUpdate = true;
    }
  });

  return (
    <>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.2} />
      <points ref={pointsRef} geometry={geometry} material={shaderMaterial} />
      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} opacity={1.5} />
      </EffectComposer>
    </>
  );
}
