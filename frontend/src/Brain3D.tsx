/**
 * Brain3D — V12 "Volumetric Energy Fibers" 
 * Recreates a realistic translucent brain with glowing neural pathways 
 * flowing along the physical folds (gyri and sulci) of the anatomy.
 */
import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const PATH_COUNT = 1500;
const SEGMENTS_PER_PATH = 40;

// ── Anatomical regions ──────────
const REGIONS: Record<string, {
  center: THREE.Vector3;
  radius: number;
  label: string;
  description: string;
}> = {
  prefrontal:  { center: new THREE.Vector3(0.0, 0.4, 1.1),   radius: 0.6,  label: 'Prefrontal Cortex', description: 'Logic & Planning' },
  temporal:    { center: new THREE.Vector3(0.8, -0.1, 0.2),  radius: 0.5,  label: 'Temporal Lobe',     description: 'Pattern Recognition' },
  parietal:    { center: new THREE.Vector3(0.0, 0.8, -0.2),  radius: 0.55, label: 'Parietal Lobe',     description: 'Spatial Processing' },
  wernicke:    { center: new THREE.Vector3(-0.8, 0.1, -0.3), radius: 0.45, label: "Wernicke's Area",   description: 'Comprehension' },
  broca:       { center: new THREE.Vector3(-0.7, 0.2, 0.7),  radius: 0.4,  label: "Broca's Area",      description: 'Code Generation' },
  amygdala:    { center: new THREE.Vector3(0.3, -0.3, 0.2),  radius: 0.35, label: 'Amygdala',          description: 'Threat Detection' },
  hippocampus: { center: new THREE.Vector3(-0.3, -0.3, 0.1), radius: 0.35, label: 'Hippocampus',       description: 'Memory Retrieval' },
  cerebellum:  { center: new THREE.Vector3(0.0, -0.6, -0.7), radius: 0.5,  label: 'Cerebellum',        description: 'Motor Refinement' },
};

const REGION_KEYS = Object.keys(REGIONS);
const REGION_COLORS: Record<string, THREE.Color> = {
  amygdala:    new THREE.Color('#f97316'),
  hippocampus: new THREE.Color('#a855f7'),
  wernicke:    new THREE.Color('#06b6d4'),
  parietal:    new THREE.Color('#3b82f6'),
  temporal:    new THREE.Color('#10b981'),
  prefrontal:  new THREE.Color('#6366f1'),
  broca:       new THREE.Color('#f43f5e'),
  cerebellum:  new THREE.Color('#eab308'),
};

// Math function to shape a sphere into a wrinkled brain
function getBrainPoint(u: number, v: number, part: string): THREE.Vector3 {
  const theta = u * Math.PI * 2;
  const phi = v * Math.PI;
  
  let x = Math.sin(phi) * Math.cos(theta);
  let y = Math.cos(phi);
  let z = Math.sin(phi) * Math.sin(theta);
  
  if (part === 'cerebrum') {
    z *= 1.35; x *= 0.85; y *= 0.95;
    
    if (z > 0) { x *= (1.0 - z * 0.15); y *= (1.0 - z * 0.08); }
    if (z < 0) { x *= (1.0 + z * 0.1); }

    const fissure = Math.exp(-Math.pow(x * 12.0, 2));
    y -= fissure * 0.4;
    if (x > 0) x += 0.06 + fissure * 0.08;
    else x -= 0.06 + fissure * 0.08;

    const temporal = Math.exp(-Math.pow(z * 1.5, 2) - Math.pow((y + 0.2) * 2.5, 2));
    x += Math.sign(x) * temporal * 0.15;

    const wrinkles = 
      Math.sin(x*18 + Math.cos(y*18)) * Math.sin(y*18 + Math.cos(z*18)) * Math.sin(z*18 + Math.cos(x*18)) * 0.05;
      
    x += x * wrinkles; y += y * wrinkles; z += z * wrinkles;
    
    if (y < -0.2) y = -0.2 + (y + 0.2) * 0.3; 
    
  } else if (part === 'cerebellum') {
    x *= 1.4; y = y * 0.4 - 0.65; z = z * 0.8 - 0.75;
    const ridges = Math.sin(y * 60) * 0.02; 
    x += x * ridges; z += z * ridges;
  } else if (part === 'stem') {
    x *= 0.15; z = z * 0.15 - 0.15;
    y = y * 0.5 - 0.8;
  }
  return new THREE.Vector3(x, y, z);
}

interface Brain3DProps {
  activeNodes: Set<string>;
  nodeLabel?: string;
}

export default function Brain3D({ activeNodes }: Brain3DProps) {
  const linesRef = useRef<THREE.LineSegments>(null!);
  const coreRef = useRef<THREE.Mesh>(null!);

  // ── 1. VOLUMETRIC GLASS CORE ──
  const { coreGeo, coreMat } = useMemo(() => {
    const coreGeo = new THREE.SphereGeometry(1, 128, 128);
    const posAttr = coreGeo.attributes.position;
    for(let i = 0; i < posAttr.count; i++) {
       const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
       const u = 0.5 + Math.atan2(v.z, v.x) / (2 * Math.PI);
       const v_coord = 0.5 - Math.asin(v.y) / Math.PI;
       
       const mapped = getBrainPoint(u, v_coord, 'cerebrum');
       mapped.multiplyScalar(0.96); 
       posAttr.setXYZ(i, mapped.x, mapped.y, mapped.z);
    }
    coreGeo.computeVertexNormals();

    const coreMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          
          float rim = 1.0 - max(dot(viewDir, normal), 0.0);
          rim = smoothstep(0.5, 1.0, rim);
          
          vec3 coreColor = vec3(0.0, 0.05, 0.2); 
          vec3 rimColor = vec3(0.0, 0.5, 1.0);   
          
          vec3 finalColor = coreColor + rimColor * rim * 1.5;
          gl_FragColor = vec4(finalColor, 0.4 + rim * 0.4);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { coreGeo, coreMat };
  }, []);

  // ── 2. FIBER OPTIC PATHWAYS ──
  const { lnGeo, lnMat, assignments } = useMemo(() => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const pathIds: number[] = [];
    const assigns: string[] = [];
    const colors: number[] = [];

    for(let p = 0; p < PATH_COUNT; p++) {
      const partRand = Math.random();
      const part = partRand < 0.85 ? 'cerebrum' : (partRand < 0.95 ? 'cerebellum' : 'stem');
      
      let u = Math.random();
      let v = Math.random();
      const du = (Math.random() - 0.5) * 0.02;
      const dv = (Math.random() - 0.5) * 0.02;

      let prevPoint = getBrainPoint(u, v, part);

      let minD = Infinity, assigned = 'generic';
      for (const key of REGION_KEYS) {
        const d = prevPoint.distanceTo(REGIONS[key].center);
        if (d < minD && d < REGIONS[key].radius) {
          minD = d; assigned = key;
        }
      }

      const clr = assigned !== 'generic' ? REGION_COLORS[assigned] : new THREE.Color('#0066ff');

      for(let s = 0; s < SEGMENTS_PER_PATH - 1; s++) {
        u += du; v += dv;
        if (v < 0.01 || v > 0.99) v = Math.max(0.01, Math.min(0.99, v));
        
        const currPoint = getBrainPoint(u, v, part);
        
        positions.push(prevPoint.x, prevPoint.y, prevPoint.z);
        positions.push(currPoint.x, currPoint.y, currPoint.z);
        
        uvs.push(s / SEGMENTS_PER_PATH);
        uvs.push((s+1) / SEGMENTS_PER_PATH);
        
        pathIds.push(p, p);
        assigns.push(assigned, assigned);
        colors.push(clr.r, clr.g, clr.b, clr.r, clr.g, clr.b);
        
        prevPoint = currPoint;
      }
    }

    const lnGeo = new THREE.BufferGeometry();
    lnGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    lnGeo.setAttribute('uvX', new THREE.BufferAttribute(new Float32Array(uvs), 1));
    lnGeo.setAttribute('pathId', new THREE.BufferAttribute(new Float32Array(pathIds), 1));
    lnGeo.setAttribute('customColor', new THREE.BufferAttribute(new Float32Array(colors), 3));
    
    const actArr = new Float32Array(positions.length / 3);
    lnGeo.setAttribute('isActive', new THREE.BufferAttribute(actArr, 1));

    const lnMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        attribute float uvX;
        attribute float pathId;
        attribute float isActive;
        attribute vec3 customColor;
        
        varying float vUv;
        varying float vPathId;
        varying float vIsActive;
        varying vec3 vColor;
        
        void main() {
          vUv = uvX;
          vPathId = pathId;
          vIsActive = isActive;
          vColor = customColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying float vUv;
        varying float vPathId;
        varying float vIsActive;
        varying vec3 vColor;
        
        void main() {
          vec3 inactiveBase = vec3(0.0, 0.2, 0.8) * 0.2;
          vec3 activeBase = vColor * 0.5;
          
          vec3 inactivePulse = vec3(0.0, 0.6, 1.0);
          vec3 activePulse = mix(vColor, vec3(1.0), 0.5); // Bright pastel version of the region color
          
          vec3 base = mix(inactiveBase, activeBase, vIsActive);
          vec3 pulseColor = mix(inactivePulse, activePulse, vIsActive);
          
          float speed = mix(1.0, 2.5, vIsActive); 
          float sparkPos = fract(time * speed + vPathId * 0.453);
          
          float dist = abs(vUv - sparkPos);
          dist = min(dist, 1.0 - dist); 
          
          float glow = exp(-dist * 25.0); 
          
          vec3 finalColor = base + pulseColor * glow * 2.5;
          float alpha = mix(0.15, 0.6, vIsActive) + glow;
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { lnGeo, lnMat, assignments: assigns };
  }, []);

  // ── 3. REACT STATE -> SHADER ATTRIBUTES ──
  useEffect(() => {
    if (!lnGeo) return;
    const actArr = lnGeo.attributes.isActive.array as Float32Array;
    
    for (let i = 0; i < assignments.length; i++) {
      const reg = assignments[i];
      actArr[i] = (reg !== 'generic' && activeNodes.has(reg)) ? 1.0 : 0.0;
    }
    lnGeo.attributes.isActive.needsUpdate = true;
  }, [activeNodes, assignments, lnGeo]);

  // ── 4. ANIMATION LOOP ──
  useFrame((state) => {
    if (!linesRef.current || !coreRef.current) return;
    const time = state.clock.elapsedTime;
    lnMat.uniforms.time.value = time;
    
    const rotY = time * 0.15;
    const rotX = Math.sin(time * 0.1) * 0.1;
    
    linesRef.current.rotation.set(rotX, rotY, 0);
    coreRef.current.rotation.set(rotX, rotY, 0);
  });

  const activeRegionEntries = REGION_KEYS
    .filter(k => activeNodes.has(k))
    .map(k => ({ key: k, ...REGIONS[k] }));

  return (
    <group>
      <mesh ref={coreRef} geometry={coreGeo} material={coreMat} />
      <lineSegments ref={linesRef} geometry={lnGeo} material={lnMat} />
      
      {/* Floating labels for active regions */}
      {activeRegionEntries.map(({ key, center, label, description }) => {
        const color = REGION_COLORS[key].getStyle();
        return (
          <Html
            key={key}
            position={[center.x * 1.3, center.y * 1.3, center.z * 1.3]}
            style={{ pointerEvents: 'none' }}
            center
          >
            <div style={{
              background: 'rgba(0, 5, 20, 0.85)',
              border: `1px solid rgba(0, 170, 255, 0.3)`,
              borderLeft: `3px solid ${color}`,
              padding: '6px 12px',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(8px)',
              boxShadow: `0 4px 20px ${color}40`,
            }}>
              <div style={{ color: color, fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', fontFamily: 'monospace' }}>
                {label.toUpperCase()}
              </div>
              <div style={{ color: '#0066cc', fontSize: 9, fontFamily: 'monospace', marginTop: '2px', letterSpacing: '0.05em' }}>
                {description}
              </div>
            </div>
          </Html>
        );
      })}
    </group>
  );
}
