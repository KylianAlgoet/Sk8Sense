import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

function buildSkateboard(accentHex) {
  const group = new THREE.Group();

  const accent = new THREE.Color(accentHex);

  // ── Deck ────────────────────────────────────────────────────────────────
  const deckGeo = new THREE.BoxGeometry(2.0, 0.09, 5.7);
  const deckMat = new THREE.MeshPhongMaterial({
    color: 0x2e1a08, shininess: 20,
  });
  group.add(new THREE.Mesh(deckGeo, deckMat));

  // Deck bottom veneer (lighter wood, visible from below)
  const veneerGeo = new THREE.BoxGeometry(1.95, 0.015, 5.6);
  const veneerMat = new THREE.MeshPhongMaterial({ color: 0x4a2e10 });
  const veneer = new THREE.Mesh(veneerGeo, veneerMat);
  veneer.position.y = -0.053;
  group.add(veneer);

  // Grip tape (slightly smaller, dark, low-shine)
  const gripGeo = new THREE.BoxGeometry(1.93, 0.028, 5.52);
  const gripMat = new THREE.MeshPhongMaterial({ color: 0x101010, shininess: 2 });
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.position.y = 0.059;
  group.add(grip);

  // Concave (thin raised edge strips on grip to fake concave)
  [-0.88, 0.88].forEach((x) => {
    const concaveGeo = new THREE.BoxGeometry(0.06, 0.02, 5.3);
    const concaveMat = new THREE.MeshPhongMaterial({ color: 0x0a0a0a, shininess: 1 });
    const c = new THREE.Mesh(concaveGeo, concaveMat);
    c.position.set(x, 0.074, 0);
    group.add(c);
  });

  // ── Pressure zones (emissive planes on grip) ────────────────────────────
  const makeZone = (w, h) => {
    const mat = new THREE.MeshPhongMaterial({
      color: 0x000000,
      emissive: accent,
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0.9,
    });
    return mat;
  };

  const tailZoneGeo = new THREE.BoxGeometry(1.6, 0.031, 1.3);
  const tailZoneMat = makeZone();
  const tailZone = new THREE.Mesh(tailZoneGeo, tailZoneMat);
  tailZone.position.set(0, 0.075, 2.05);
  group.add(tailZone);

  const noseZoneGeo = new THREE.BoxGeometry(1.5, 0.031, 1.1);
  const noseZoneMat = makeZone();
  const noseZone = new THREE.Mesh(noseZoneGeo, noseZoneMat);
  noseZone.position.set(0, 0.075, -2.0);
  group.add(noseZone);

  const heelZoneGeo = new THREE.BoxGeometry(0.55, 0.031, 2.2);
  const heelZoneMat = makeZone();
  const heelZone = new THREE.Mesh(heelZoneGeo, heelZoneMat);
  heelZone.position.set(-0.72, 0.075, 0);
  group.add(heelZone);

  const toeZoneGeo = new THREE.BoxGeometry(0.55, 0.031, 2.2);
  const toeZoneMat = makeZone();
  const toeZone = new THREE.Mesh(toeZoneGeo, toeZoneMat);
  toeZone.position.set(0.72, 0.075, 0);
  group.add(toeZone);

  // ── Bolt holes ──────────────────────────────────────────────────────────
  const boltGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.04, 8);
  const boltMat = new THREE.MeshPhongMaterial({ color: 0x777777, shininess: 120 });
  [[-0.55, -1.65], [0.55, -1.65], [-0.55, 1.65], [0.55, 1.65]].forEach(([x, z]) => {
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.set(x, 0.076, z);
    group.add(bolt);
  });

  // ── Trucks ──────────────────────────────────────────────────────────────
  const truckBaseMat = new THREE.MeshPhongMaterial({ color: 0x8a8a8a, shininess: 90 });
  const truckHangerMat = new THREE.MeshPhongMaterial({ color: 0xb0b0b0, shininess: 130 });

  [-1.72, 1.72].forEach((z) => {
    // Baseplate
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.13, 0.4), truckBaseMat);
    base.position.set(0, -0.11, z);
    group.add(base);

    // Kingpin nut
    const kingpin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.16, 6),
      truckBaseMat
    );
    kingpin.position.set(0, -0.06, z);
    group.add(kingpin);

    // Hanger
    const hanger = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.28), truckHangerMat);
    hanger.position.set(0, -0.19, z);
    group.add(hanger);

    // Axle
    const axle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 2.55, 10),
      truckBaseMat
    );
    axle.rotation.z = Math.PI / 2;
    axle.position.set(0, -0.24, z);
    group.add(axle);
  });

  // ── Wheels ──────────────────────────────────────────────────────────────
  const wheelMat = new THREE.MeshPhongMaterial({ color: 0xeeeeee, shininess: 50 });
  const hubMat   = new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 110 });
  const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.29, 20);
  const hubGeo   = new THREE.CylinderGeometry(0.09, 0.09, 0.31, 10);
  const bearingMat = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 200 });
  const bearingGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.32, 8);

  [[-1.2, -1.72], [1.2, -1.72], [-1.2, 1.72], [1.2, 1.72]].forEach(([x, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, -0.26, z);
    group.add(wheel);

    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x, -0.26, z);
    group.add(hub);

    const bearing = new THREE.Mesh(bearingGeo, bearingMat);
    bearing.rotation.z = Math.PI / 2;
    bearing.position.set(x, -0.26, z);
    group.add(bearing);
  });

  // Default pose: slight tilt for 3/4 view
  group.rotation.x = -0.22;

  return { group, tailZoneMat, noseZoneMat, heelZoneMat, toeZoneMat };
}

export default function SkateboardGL({ stepIndex = 0, phase = 'steps', trickColor = '#4CAF50', style }) {
  const mountedRef  = useRef(true);
  const animRef     = useRef(null);
  const sceneState  = useRef({ stepIndex, phase });

  useEffect(() => {
    sceneState.current = { stepIndex, phase };
  }, [stepIndex, phase]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const onContextCreate = async (gl) => {
    const { drawingBufferWidth: W, drawingBufferHeight: H } = gl;

    const renderer = new Renderer({ gl });
    renderer.setSize(W, H);
    renderer.setClearColor(0x0a0a0a, 1);
    renderer.shadowMap.enabled = false;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a0a, 18, 28);

    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 100);
    camera.position.set(0, 3.8, 7.0);
    camera.lookAt(0, 0, 0);

    // ── Lighting ────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(4, 7, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8090ff, 0.3);
    fillLight.position.set(-4, 2, -2);
    scene.add(fillLight);

    const accentLight = new THREE.PointLight(new THREE.Color(trickColor), 0.0, 8);
    accentLight.position.set(0, 2, 0);
    scene.add(accentLight);

    // ── Ground reflection plane ─────────────────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(8, 16);
    const groundMat = new THREE.MeshPhongMaterial({
      color: 0x141414, shininess: 10, transparent: true, opacity: 0.6,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.1;
    scene.add(ground);

    // Board shadow (fake)
    const shadowGeo = new THREE.PlaneGeometry(2.2, 6);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.45,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.09;
    scene.add(shadow);

    // ── Skateboard ──────────────────────────────────────────────────────
    const { group, tailZoneMat, noseZoneMat, heelZoneMat, toeZoneMat }
      = buildSkateboard(trickColor);
    scene.add(group);

    // ── Animation loop ──────────────────────────────────────────────────
    let t = 0;
    const loop = () => {
      if (!mountedRef.current) return;
      animRef.current = requestAnimationFrame(loop);
      t += 0.018;

      const { stepIndex: step, phase: ph } = sceneState.current;

      // Reset emissive each frame
      tailZoneMat.emissiveIntensity = 0;
      noseZoneMat.emissiveIntensity = 0;
      heelZoneMat.emissiveIntensity = 0;
      toeZoneMat.emissiveIntensity  = 0;
      accentLight.intensity = 0;

      const pulse = (freq, min = 0, max = 1) =>
        min + (max - min) * (0.5 + 0.5 * Math.sin(t * freq));

      if (ph === 'combine') {
        // Full trick animation: 4s cycle
        const cycle = (t % 4.0) / 4.0;
        group.rotation.y = 0;

        if (cycle < 0.12) {
          // Crouch/load
          group.rotation.x = -0.22 - cycle * 3;
          group.position.y = 0;
          tailZoneMat.emissiveIntensity = cycle * 7;
          accentLight.intensity = cycle * 4;
        } else if (cycle < 0.28) {
          // Pop + rise
          const p = (cycle - 0.12) / 0.16;
          group.position.y = p * 2.2;
          group.rotation.x = -0.22 + p * 0.3;
          tailZoneMat.emissiveIntensity = (1 - p) * 0.8;
          accentLight.intensity = (1 - p) * 3;
        } else if (cycle < 0.58) {
          // Flip/spin
          const p = (cycle - 0.28) / 0.30;
          group.position.y = 2.2 - p * 0.4;
          group.rotation.z = p * Math.PI * 2;
          heelZoneMat.emissiveIntensity = Math.sin(p * Math.PI) * 0.9;
          accentLight.intensity = Math.sin(p * Math.PI) * 2;
        } else if (cycle < 0.72) {
          // Land
          const p = (cycle - 0.58) / 0.14;
          group.position.y = 1.8 * (1 - p);
          group.rotation.z = Math.PI * 2 * (1 - p * 0.05);
          if (p > 0.85) {
            const impact = (p - 0.85) / 0.15;
            [tailZoneMat, noseZoneMat, heelZoneMat, toeZoneMat].forEach(
              (m) => (m.emissiveIntensity = impact)
            );
            accentLight.intensity = impact * 4;
          }
        } else {
          // Idle after land
          group.position.y = 0;
          group.rotation.z = 0;
          group.rotation.x = -0.22 + Math.sin(t * 0.6) * 0.04;
          group.rotation.y = Math.sin(t * 0.4) * 0.09;
        }
      } else {
        // Step phase
        switch (step) {
          case 0: // Foot Position
            group.rotation.x = -0.22 + Math.sin(t * 0.45) * 0.05;
            group.rotation.y = Math.sin(t * 0.3) * 0.12;
            group.position.y = 0;
            tailZoneMat.emissiveIntensity = pulse(1.4, 0.1, 0.55);
            heelZoneMat.emissiveIntensity = pulse(1.1, 0.15, 0.6);
            accentLight.intensity = pulse(1.2, 0, 1.2);
            break;

          case 1: // The Pop
            group.rotation.y = Math.sin(t * 0.3) * 0.07;
            {
              const popCycle = (t % 2.2) / 2.2;
              if (popCycle < 0.15) {
                group.rotation.x = -0.22 - popCycle * 9;
                group.position.y = 0;
                tailZoneMat.emissiveIntensity = popCycle * 6;
                accentLight.intensity = popCycle * 5;
              } else if (popCycle < 0.4) {
                const p = (popCycle - 0.15) / 0.25;
                group.position.y = p * 1.6;
                group.rotation.x = -0.22 + p * 0.25;
                tailZoneMat.emissiveIntensity = (1 - p) * 0.8;
                accentLight.intensity = (1 - p) * 3;
              } else {
                group.position.y = Math.max(0, 1.6 * (1 - (popCycle - 0.4) / 0.6));
                group.rotation.x = -0.22 + Math.sin(t * 0.5) * 0.04;
              }
            }
            break;

          case 2: // The Slide
            {
              const sc = (t % 2.5) / 2.5;
              group.position.y = sc < 0.5
                ? sc * 2 * 1.4
                : 1.4 * (1 - (sc - 0.5) * 2);
              group.rotation.x = -0.22 + Math.sin(t * 1.2) * 0.18;
              group.rotation.z = Math.sin(t * 0.7) * 0.06;
              heelZoneMat.emissiveIntensity = pulse(2.0, 0.3, 1.0);
              toeZoneMat.emissiveIntensity  = pulse(2.0, 0.1, 0.4);
              accentLight.intensity = pulse(1.8, 0, 2);
            }
            break;

          case 3: // Level Out
            group.position.y = 1.4 + Math.sin(t * 1.0) * 0.25;
            group.rotation.x = Math.sin(t * 0.9) * 0.12;
            group.rotation.z = Math.sin(t * 0.7) * 0.08;
            group.rotation.y = Math.sin(t * 0.5) * 0.1;
            noseZoneMat.emissiveIntensity = pulse(1.5, 0.4, 1.0);
            accentLight.intensity = pulse(1.2, 1, 3);
            break;

          case 4: // The Landing
            {
              const lc = (t % 2.0) / 2.0;
              group.position.y = lc < 0.4
                ? (1 - lc / 0.4) * 1.6
                : 0;
              if (group.position.y < 0.05) {
                const impact = Math.max(0, 0.6 - (t % 2.0 - 0.8) * 2);
                [tailZoneMat, noseZoneMat, heelZoneMat, toeZoneMat].forEach(
                  (m) => (m.emissiveIntensity = impact)
                );
                accentLight.intensity = impact * 4;
              }
              group.rotation.x = -0.22 + Math.sin(t * 0.5) * 0.04;
              group.rotation.y = Math.sin(t * 0.35) * 0.08;
            }
            break;

          default:
            group.rotation.y += 0.008;
        }
      }

      // Shadow follows board height
      const lift = group.position.y;
      shadow.scale.set(
        Math.max(0.4, 1 - lift * 0.12),
        Math.max(0.4, 1 - lift * 0.12),
        1
      );
      shadow.material.opacity = Math.max(0.05, 0.45 - lift * 0.08);

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    loop();
  };

  return (
    <GLView
      style={[{ flex: 1 }, style]}
      onContextCreate={onContextCreate}
    />
  );
}
