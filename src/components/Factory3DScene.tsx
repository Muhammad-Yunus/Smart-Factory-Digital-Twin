import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Box, Crosshair, Maximize2 } from 'lucide-react';
import type { EquipmentItemData } from '../types/dashboard';

interface Factory3DSceneProps {
  equipmentItems: EquipmentItemData[];
  selectedEquipmentCode: string | null;
  onSelectEquipment: (code: string | null) => void;
}

interface ProjectedTag {
  id: string;
  code: string;
  workMode: string;
  zoneLocation: string;
  loadState: string;
  variant: 'telemetry' | 'badge';
  x: number;
  y: number;
  visible: boolean;
}

const _projVec = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createCardboardTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Kraft cardboard base
  ctx.fillStyle = '#cf9e68';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle paper fiber grain
  for (let i = 0; i < 450; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(120, 74, 34, 0.08)' : 'rgba(255, 226, 185, 0.08)';
    ctx.fillRect(x, y, 4, 2);
  }

  // Center packing tape & flap seam
  ctx.fillStyle = '#b9834d';
  ctx.fillRect(0, 124, 256, 8);
  ctx.fillStyle = 'rgba(235, 200, 148, 0.55)';
  ctx.fillRect(114, 0, 28, 256);
  ctx.strokeStyle = 'rgba(92, 56, 24, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 248, 248);

  // Shipping label sticker
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(26, 28, 54, 34);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(32, 35, 42, 4);
  ctx.fillRect(32, 43, 28, 3);
  ctx.fillRect(32, 50, 36, 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createFloorGridTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#050a14';
  ctx.fillRect(0, 0, 512, 512);

  // Tech tile grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Subtle circuit accent lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, 488, 488);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = maxAniso;
  return tex;
}

function createHologramScreenTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 256, 160);
  grad.addColorStop(0, '#0284c7');
  grad.addColorStop(0.5, '#0ea5e9');
  grad.addColorStop(1, '#1d4ed8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 160);

  ctx.strokeStyle = 'rgba(186, 230, 253, 0.7)';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 240, 144);

  // Data bars & grid matrix
  ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      ctx.fillRect(24 + col * 36, 24 + row * 28, 26, 16);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createGreenZoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 125);
  grad.addColorStop(0, 'rgba(34, 197, 94, 0.42)');
  grad.addColorStop(0.6, 'rgba(22, 163, 74, 0.18)');
  grad.addColorStop(1, 'rgba(22, 163, 74, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Factory3DScene({
  equipmentItems,
  selectedEquipmentCode,
  onSelectEquipment,
}: Factory3DSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const equipmentRef = useRef<EquipmentItemData[]>(equipmentItems);
  equipmentRef.current = equipmentItems;

  const [tags, setTags] = useState<ProjectedTag[]>([]);
  const [cameraMode, setCameraMode] = useState<'iso' | 'top'>('iso');
  const cameraPresetRef = useRef<{
    pos: THREE.Vector3;
    target: THREE.Vector3;
    active: boolean;
  }>({
    pos: new THREE.Vector3(-15.5, 16.5, 20.5),
    target: new THREE.Vector3(0.2, 3.0, -0.5),
    active: false,
  });

  useEffect(() => {
    const mount = containerRef.current;
    if (!mount) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(mount.clientWidth, 320);
    const height = Math.max(mount.clientHeight, 320);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040914);
    scene.fog = new THREE.FogExp2(0x040914, 0.014);

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.2, 200);
    camera.position.set(-15.5, 16.5, 20.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0.2, 3.0, -0.5);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 10;
    controls.maxDistance = 46;
    controls.update();

    controls.addEventListener('start', () => {
      cameraPresetRef.current.active = false;
    });

    // Studio 3-Point Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.0);
    keyLight.position.set(-14, 24, 16);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 65;
    keyLight.shadow.camera.left = -22;
    keyLight.shadow.camera.right = 22;
    keyLight.shadow.camera.top = 22;
    keyLight.shadow.camera.bottom = -22;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(18, 12, -18);
    scene.add(rimLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const cardboardTex = createCardboardTexture(maxAniso);
    const floorTex = createFloorGridTexture(maxAniso);
    const screenTex = createHologramScreenTexture(maxAniso);
    const greenZoneTex = createGreenZoneTexture();

    // Shared PBR Materials
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.72,
      roughness: 0.34,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.75,
      roughness: 0.42,
    });
    const whiteTowerMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.35,
      roughness: 0.32,
    });
    const craneYellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.4,
      roughness: 0.28,
      emissive: 0x713f12,
      emissiveIntensity: 0.18,
    });
    const cardboardMat = new THREE.MeshStandardMaterial({
      map: cardboardTex,
      roughness: 0.82,
      metalness: 0.05,
    });
    const palletMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.35,
      roughness: 0.55,
    });
    const cyanTileMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.25,
      roughness: 0.25,
      metalness: 0.2,
    });

    // Factory Ground Floor
    const floorGeo = new THREE.PlaneGeometry(90, 90);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.65,
      metalness: 0.35,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Subtle green zone spotlight glow on front-left floor (matching reference)
    const greenZoneGeo = new THREE.PlaneGeometry(11, 11);
    const greenZoneMat = new THREE.MeshBasicMaterial({
      map: greenZoneTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const greenZone = new THREE.Mesh(greenZoneGeo, greenZoneMat);
    greenZone.rotation.x = -Math.PI / 2;
    greenZone.position.set(-7.2, 0.03, 5.5);
    scene.add(greenZone);

    // Curved Segmented Cyan Orbital Ring sweeping behind the AS/RS racks
    const tileGeo = new THREE.BoxGeometry(0.46, 0.04, 0.46);
    const arcRadii = [14.2, 14.9, 15.6];
    const arcCountPerRing = 48;
    const totalArcTiles = arcRadii.length * arcCountPerRing;
    const arcMesh = new THREE.InstancedMesh(tileGeo, cyanTileMat, totalArcTiles);
    const dummy = new THREE.Object3D();
    const tempColor = new THREE.Color();
    let tileIdx = 0;

    for (let r = 0; r < arcRadii.length; r++) {
      const radius = arcRadii[r];
      for (let i = 0; i < arcCountPerRing; i++) {
        const angle = -Math.PI * 0.92 + (i / (arcCountPerRing - 1)) * Math.PI * 1.12;
        dummy.position.set(
          Math.cos(angle) * radius,
          0.025,
          Math.sin(angle) * radius - 1.5,
        );
        dummy.rotation.set(0, -angle, 0);
        const checker = (i + r) % 3 === 0 ? 0.85 : 1.0;
        dummy.scale.set(checker, 1, checker);
        dummy.updateMatrix();
        arcMesh.setMatrixAt(tileIdx, dummy.matrix);
        tempColor.setHSL(0.53 - r * 0.02, 0.9, 0.42 + ((i % 4) * 0.08));
        arcMesh.setColorAt(tileIdx, tempColor);
        tileIdx++;
      }
    }
    arcMesh.computeBoundingSphere();
    scene.add(arcMesh);

    // =========================================================================
    // AS/RS HIGH-BAY STEEL RACK BANKS + INSTANCED CARDBOARD BOXES
    // =========================================================================
    const rackGroup = new THREE.Group();
    scene.add(rackGroup);

    const bayCountZ = 7;
    const bayLength = 2.05;
    const totalDepth = bayCountZ * bayLength;
    const zStart = -totalDepth / 2;
    const tierCount = 6;
    const tierHeight = 1.15;
    const totalRackHeight = tierCount * tierHeight + 0.4;

    // 4 rack rows forming 2 aisles (Left bank double, Right bank double)
    const rackRowXs = [-4.6, -2.9, 1.3, 3.0];

    const postMatrices: THREE.Matrix4[] = [];
    const beamMatrices: THREE.Matrix4[] = [];
    const boxMatrices: THREE.Matrix4[] = [];
    const boxColors: THREE.Color[] = [];
    const palletMatrices: THREE.Matrix4[] = [];

    const postGeo = new THREE.BoxGeometry(0.11, totalRackHeight, 0.11);
    const longBeamGeo = new THREE.BoxGeometry(0.08, 0.09, totalDepth);
    const crossBeamGeo = new THREE.BoxGeometry(1.4, 0.08, 0.08);
    const boxGeo = new THREE.BoxGeometry(0.95, 0.72, 0.85);
    const palletGeo = new THREE.BoxGeometry(1.06, 0.1, 1.82);

    for (const rowX of rackRowXs) {
      for (let b = 0; b <= bayCountZ; b++) {
        const z = zStart + b * bayLength;
        for (const sideOffset of [-0.62, 0.62]) {
          dummy.position.set(rowX + sideOffset, totalRackHeight / 2, z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          postMatrices.push(dummy.matrix.clone());
        }
      }

      for (let t = 0; t <= tierCount; t++) {
        const y = 0.28 + t * tierHeight;
        for (const sideOffset of [-0.62, 0.62]) {
          dummy.position.set(rowX + sideOffset, y, 0);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          beamMatrices.push(dummy.matrix.clone());
        }
      }
    }

    // Cross connectors tying paired rack rows together
    const crossGeo = new THREE.BoxGeometry(1.7, 0.08, 0.08);
    const crossMatrices: THREE.Matrix4[] = [];
    for (const pairCenter of [-3.75, 2.15]) {
      for (let b = 0; b <= bayCountZ; b++) {
        const z = zStart + b * bayLength;
        for (let t = 1; t <= tierCount; t += 2) {
          dummy.position.set(pairCenter, 0.28 + t * tierHeight, z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          crossMatrices.push(dummy.matrix.clone());
        }
      }
    }

    // Populate pallets & cardboard boxes (dense top row + realistic occupancy below)
    for (let rIdx = 0; rIdx < rackRowXs.length; rIdx++) {
      const rowX = rackRowXs[rIdx];
      for (let b = 0; b < bayCountZ; b++) {
        const bayCenterZ = zStart + (b + 0.5) * bayLength;
        for (let t = 0; t < tierCount; t++) {
          const isTop = t === tierCount - 1;
          // Deterministic realistic occupancy pattern matching reference density
          const hash = (rIdx * 19 + b * 7 + t * 13) % 10;
          const occupied = isTop ? true : hash < 6;
          if (!occupied) continue;

          const shelfY = 0.34 + t * tierHeight;

          // Pallet
          dummy.position.set(rowX, shelfY + 0.05, bayCenterZ);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          palletMatrices.push(dummy.matrix.clone());

          // Two cardboard boxes side-by-side on each pallet
          for (const bz of [-0.46, 0.46]) {
            dummy.position.set(rowX, shelfY + 0.47, bayCenterZ + bz);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            boxMatrices.push(dummy.matrix.clone());
            const tint = 0.92 + ((rIdx + b + t) % 4) * 0.04;
            boxColors.push(new THREE.Color(tint, tint * 0.97, tint * 0.93));
          }
        }
      }
    }

    const postInst = new THREE.InstancedMesh(postGeo, steelMat, postMatrices.length);
    postMatrices.forEach((m, i) => postInst.setMatrixAt(i, m));
    postInst.castShadow = !isSoftwareGl;
    postInst.receiveShadow = true;
    postInst.computeBoundingSphere();
    rackGroup.add(postInst);

    const beamInst = new THREE.InstancedMesh(longBeamGeo, steelMat, beamMatrices.length);
    beamMatrices.forEach((m, i) => beamInst.setMatrixAt(i, m));
    beamInst.receiveShadow = true;
    beamInst.computeBoundingSphere();
    rackGroup.add(beamInst);

    const crossInst = new THREE.InstancedMesh(crossGeo, darkSteelMat, crossMatrices.length);
    crossMatrices.forEach((m, i) => crossInst.setMatrixAt(i, m));
    crossInst.computeBoundingSphere();
    rackGroup.add(crossInst);

    const palletInst = new THREE.InstancedMesh(palletGeo, palletMat, palletMatrices.length);
    palletMatrices.forEach((m, i) => palletInst.setMatrixAt(i, m));
    palletInst.computeBoundingSphere();
    rackGroup.add(palletInst);

    const boxInst = new THREE.InstancedMesh(boxGeo, cardboardMat, boxMatrices.length);
    boxMatrices.forEach((m, i) => {
      boxInst.setMatrixAt(i, m);
      boxInst.setColorAt(i, boxColors[i]);
    });
    boxInst.castShadow = !isSoftwareGl;
    boxInst.receiveShadow = true;
    boxInst.computeBoundingSphere();
    rackGroup.add(boxInst);

    // Unused helper geometry cleanup note: crossBeamGeo was not needed separately
    crossBeamGeo.dispose();

    // Central Walkway Grating & Access Stairs between aisles (matching dark ribbed ramps in ref)
    const walkwayGroup = new THREE.Group();
    for (let s = 0; s < 5; s++) {
      const catwalk = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.08, totalDepth),
        darkSteelMat,
      );
      catwalk.position.set(-0.8, 0.32 + s * tierHeight, 0);
      catwalk.receiveShadow = true;
      walkwayGroup.add(catwalk);
    }
    rackGroup.add(walkwayGroup);

    // Glowing Blue Digital LED Display Panel on front-left rack face
    const ledHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 2.2, 3.2),
      darkSteelMat,
    );
    ledHousing.position.set(-5.32, 3.2, 1.8);
    rackGroup.add(ledHousing);

    const ledScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 2.0),
      new THREE.MeshBasicMaterial({ map: screenTex }),
    );
    ledScreen.rotation.y = -Math.PI / 2;
    ledScreen.position.set(-5.42, 3.2, 1.8);
    rackGroup.add(ledScreen);

    // =========================================================================
    // TWO TALL WHITE/SILVER VERTICAL LIFT/STACKER TOWERS (Front-Left & Front-Center)
    // =========================================================================
    function createVerticalTower(x: number, z: number): {
      group: THREE.Group;
      carriage: THREE.Mesh;
    } {
      const group = new THREE.Group();
      group.position.set(x, 0, z);

      const towerH = 9.0;
      const colGeo = new THREE.BoxGeometry(0.24, towerH, 0.24);
      const offsets: [number, number][] = [
        [-0.75, -0.75],
        [0.75, -0.75],
        [-0.75, 0.75],
        [0.75, 0.75],
      ];
      for (const [ox, oz] of offsets) {
        const col = new THREE.Mesh(colGeo, whiteTowerMat);
        col.position.set(ox, towerH / 2, oz);
        col.castShadow = !isSoftwareGl;
        group.add(col);
      }

      // Cladding panels on outer sides
      const sidePanelGeo = new THREE.BoxGeometry(1.65, towerH - 0.5, 0.08);
      const backPanel = new THREE.Mesh(sidePanelGeo, whiteTowerMat);
      backPanel.position.set(0, towerH / 2, -0.78);
      group.add(backPanel);

      const leftPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, towerH - 0.5, 1.65),
        whiteTowerMat,
      );
      leftPanel.position.set(-0.78, towerH / 2, 0);
      group.add(leftPanel);

      // Top cap
      const topCap = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.35, 1.9),
        whiteTowerMat,
      );
      topCap.position.set(0, towerH + 0.15, 0);
      topCap.castShadow = !isSoftwareGl;
      group.add(topCap);

      // Dark guide rail core
      const coreRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, towerH - 0.2, 0.18),
        darkSteelMat,
      );
      coreRail.position.set(0, towerH / 2, 0);
      group.add(coreRail);

      // Moving lift carriage
      const carriage = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.22, 1.15),
        darkSteelMat,
      );
      carriage.position.set(0, 2.5, 0);
      group.add(carriage);

      return { group, carriage };
    }

    const towerLeft = createVerticalTower(-6.4, 5.2);
    const towerCenter = createVerticalTower(-2.4, 8.2);
    scene.add(towerLeft.group);
    scene.add(towerCenter.group);

    // =========================================================================
    // ROLLER CONVEYOR TRACKS & FRONT AGV SHUTTLE
    // =========================================================================
    function createConveyorLine(x: number, z: number, length: number, rotY = 0) {
      const conv = new THREE.Group();
      conv.position.set(x, 0, z);
      conv.rotation.y = rotY;

      const railGeo = new THREE.BoxGeometry(0.08, 0.16, length);
      const leftRail = new THREE.Mesh(railGeo, steelMat);
      leftRail.position.set(-0.62, 0.55, 0);
      conv.add(leftRail);

      const rightRail = new THREE.Mesh(railGeo, steelMat);
      rightRail.position.set(0.62, 0.55, 0);
      conv.add(rightRail);

      // Support legs
      const legCount = Math.max(2, Math.floor(length / 2.2));
      const legGeo = new THREE.BoxGeometry(0.08, 0.55, 0.08);
      for (let i = 0; i < legCount; i++) {
        const lz = -length / 2 + 0.4 + (i / Math.max(1, legCount - 1)) * (length - 0.8);
        for (const lx of [-0.58, 0.58]) {
          const leg = new THREE.Mesh(legGeo, darkSteelMat);
          leg.position.set(lx, 0.275, lz);
          conv.add(leg);
        }
      }

      // Instanced rollers
      const rollerCount = Math.floor(length / 0.24);
      const rollerGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.16, 8);
      rollerGeo.rotateZ(Math.PI / 2);
      const rollers = new THREE.InstancedMesh(rollerGeo, darkSteelMat, rollerCount);
      for (let i = 0; i < rollerCount; i++) {
        dummy.position.set(0, 0.54, -length / 2 + 0.14 + i * 0.24);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        rollers.setMatrixAt(i, dummy.matrix);
      }
      rollers.computeBoundingSphere();
      conv.add(rollers);

      return conv;
    }

    scene.add(createConveyorLine(-6.4, 8.2, 5.2, 0));
    scene.add(createConveyorLine(-2.4, 10.6, 4.2, 0));
    scene.add(createConveyorLine(-4.4, 9.6, 4.2, Math.PI / 2));

    // White/Silver AGV Shuttle at bottom center-front
    const agvGroup = new THREE.Group();
    agvGroup.position.set(-1.1, 0, 12.6);
    const agvBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.55, 2.0),
      whiteTowerMat,
    );
    agvBody.position.y = 0.35;
    agvBody.castShadow = !isSoftwareGl;
    agvGroup.add(agvBody);
    const agvTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.14, 1.6),
      darkSteelMat,
    );
    agvTop.position.y = 0.68;
    agvGroup.add(agvTop);
    scene.add(agvGroup);

    // =========================================================================
    // AUTOMATED YELLOW AISLE STACKER CRANE (Driven by real-time telemetry!)
    // =========================================================================
    function createStackerCrane(aisleX: number) {
      const crane = new THREE.Group();
      crane.position.set(aisleX, 0, 0);

      const bogie = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.32, 2.0),
        craneYellowMat,
      );
      bogie.position.y = 0.22;
      bogie.castShadow = !isSoftwareGl;
      crane.add(bogie);

      const mast = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 7.6, 0.28),
        craneYellowMat,
      );
      mast.position.set(0, 4.0, 0);
      mast.castShadow = !isSoftwareGl;
      crane.add(mast);

      const carriageGroup = new THREE.Group();
      carriageGroup.position.set(0, 3.6, 0);

      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 0.18, 1.2),
        darkSteelMat,
      );
      carriageGroup.add(platform);

      const carriedBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.88, 0.68, 0.88),
        cardboardMat,
      );
      carriedBox.position.y = 0.43;
      carriageGroup.add(carriedBox);

      crane.add(carriageGroup);
      return { crane, carriageGroup, carriedBox };
    }

    const primaryCrane = createStackerCrane(-0.8);
    const secondaryCrane = createStackerCrane(4.4);
    scene.add(primaryCrane.crane);
    scene.add(secondaryCrane.crane);

    // Pre-compile shaders on hardware GPUs
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 3D Anchor points for projected callout tags
    const crane1Anchor = new THREE.Object3D();
    crane1Anchor.position.set(0, 6.2, 0);
    primaryCrane.crane.add(crane1Anchor);

    const crane2Anchor = new THREE.Object3D();
    crane2Anchor.position.set(0, 4.4, 0);
    secondaryCrane.crane.add(crane2Anchor);

    const badge1Anchor = new THREE.Vector3(2.2, 3.8, 3.2);
    const badge2Anchor = new THREE.Vector3(4.6, 3.4, -2.5);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let lastTagUpdate = 0;

    function projectTags(nowMs: number) {
      if (nowMs - lastTagUpdate < 50) return;
      lastTagUpdate = nowMs;

      const curW = mount?.clientWidth ?? width;
      const curH = mount?.clientHeight ?? height;
      const list = equipmentRef.current;

      const eqPrimary =
        list.find((e) => e.code === '1004') ||
        list.find((e) => e.category === 'stacker');
      const eqSecondary =
        list.find((e) => e.code === '1004-B') ||
        list.filter((e) => e.category === 'stacker')[1] ||
        eqPrimary;
      const eqConv1 = list.find((e) => e.code === '1002');
      const eqConv2 = list.find((e) => e.code === '1002-B') || eqConv1;

      const toScreen = (worldPos: THREE.Vector3) => {
        _projVec.copy(worldPos).project(camera);
        return {
          x: ((_projVec.x + 1) / 2) * curW,
          y: ((-_projVec.y + 1) / 2) * curH,
          visible: _projVec.z > -1 && _projVec.z < 1,
        };
      };

      const w1 = new THREE.Vector3();
      crane1Anchor.getWorldPosition(w1);
      const p1 = toScreen(w1);

      const w2 = new THREE.Vector3();
      crane2Anchor.getWorldPosition(w2);
      const p2 = toScreen(w2);

      const b1 = toScreen(badge1Anchor);
      const b2 = toScreen(badge2Anchor);

      const nextTags: ProjectedTag[] = [];
      if (eqPrimary) {
        nextTags.push({
          id: 'tag-primary',
          code: eqPrimary.code,
          workMode: eqPrimary.workMode || 'Working',
          zoneLocation: eqPrimary.zoneLocation || '11-23-1',
          loadState: eqPrimary.loadState || 'Loaded',
          variant: 'telemetry',
          ...p1,
        });
      }
      if (eqSecondary) {
        nextTags.push({
          id: 'tag-secondary',
          code: eqSecondary.code.replace('-B', ''),
          workMode: eqSecondary.workMode || 'Working',
          zoneLocation: eqSecondary.zoneLocation || '11-23-1',
          loadState: eqSecondary.loadState || 'Loaded',
          variant: 'telemetry',
          ...p2,
        });
      }
      nextTags.push({
        id: 'badge-1002-a',
        code: eqConv1?.code || '1002',
        workMode: eqConv1?.workMode || 'Running',
        zoneLocation: eqConv1?.zoneLocation || 'CV-01',
        loadState: eqConv1?.loadState || 'Loaded',
        variant: 'badge',
        ...b1,
      });
      nextTags.push({
        id: 'badge-1002-b',
        code: eqConv2?.code.replace('-B', '') || '1002',
        workMode: eqConv2?.workMode || 'Running',
        zoneLocation: eqConv2?.zoneLocation || 'CV-02',
        loadState: eqConv2?.loadState || 'Loaded',
        variant: 'badge',
        ...b2,
      });

      setTags(nextTags);
    }

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick(nowMs = performance.now()) {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Smooth damped camera preset transitions
      if (cameraPresetRef.current.active) {
        const lambda = 5.5;
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          cameraPresetRef.current.pos.x,
          lambda,
          delta,
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          cameraPresetRef.current.pos.y,
          lambda,
          delta,
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          cameraPresetRef.current.pos.z,
          lambda,
          delta,
        );
        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          cameraPresetRef.current.target.x,
          lambda,
          delta,
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          cameraPresetRef.current.target.y,
          lambda,
          delta,
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          cameraPresetRef.current.target.z,
          lambda,
          delta,
        );
        if (camera.position.distanceTo(cameraPresetRef.current.pos) < 0.05) {
          cameraPresetRef.current.active = false;
        }
      }

      // Update stacker cranes from live Postgres/Socket.IO equipment state
      const list = equipmentRef.current;
      const eq1 = list.find((e) => e.code === '1004') || list[0];
      const eq2 = list.find((e) => e.code === '1004-B') || list[1] || eq1;

      const targetZ1 = eq1 ? (eq1.aisleProgress - 0.5) * (totalDepth - 2.2) : -1.2;
      const targetY1 = eq1 ? 0.8 + eq1.liftProgress * 5.2 : 3.6;
      primaryCrane.crane.position.z = THREE.MathUtils.damp(
        primaryCrane.crane.position.z,
        targetZ1,
        3.2,
        delta,
      );
      primaryCrane.carriageGroup.position.y = THREE.MathUtils.damp(
        primaryCrane.carriageGroup.position.y,
        targetY1,
        3.2,
        delta,
      );
      primaryCrane.carriedBox.visible = eq1 ? eq1.loadState !== 'Empty' : true;

      const targetZ2 = eq2 ? (eq2.aisleProgress - 0.5) * (totalDepth - 2.2) : 1.4;
      const targetY2 = eq2 ? 0.8 + eq2.liftProgress * 5.2 : 2.8;
      secondaryCrane.crane.position.z = THREE.MathUtils.damp(
        secondaryCrane.crane.position.z,
        targetZ2,
        3.2,
        delta,
      );
      secondaryCrane.carriageGroup.position.y = THREE.MathUtils.damp(
        secondaryCrane.carriageGroup.position.y,
        targetY2,
        3.2,
        delta,
      );
      secondaryCrane.carriedBox.visible = eq2 ? eq2.loadState !== 'Empty' : true;

      // Subtle vertical elevator carriages inside front lift towers
      towerLeft.carriage.position.y = 2.6 + Math.sin(elapsed * 0.7) * 1.4;
      towerCenter.carriage.position.y = 3.2 + Math.cos(elapsed * 0.6) * 1.6;

      controls.update();
      renderer.render(scene, camera);
      projectTags(nowMs);

      if (isSoftwareGl) {
        afterDraw(() => tick(performance.now()));
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(entry.contentRect.width, 200);
        const h = Math.max(entry.contentRect.height, 200);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(mount);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      cardboardTex.dispose();
      floorTex.dispose();
      screenTex.dispose();
      greenZoneTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleResetView = () => {
    setCameraMode('iso');
    cameraPresetRef.current = {
      pos: new THREE.Vector3(-15.5, 16.5, 20.5),
      target: new THREE.Vector3(0.2, 3.0, -0.5),
      active: true,
    };
  };

  const handleCenterTarget = () => {
    cameraPresetRef.current = {
      pos: new THREE.Vector3(-11.5, 11.5, 15.0),
      target: new THREE.Vector3(-0.6, 3.2, 0.2),
      active: true,
    };
  };

  const handleToggleTopIso = () => {
    if (cameraMode === 'iso') {
      setCameraMode('top');
      cameraPresetRef.current = {
        pos: new THREE.Vector3(0, 28, 8),
        target: new THREE.Vector3(0, 1.5, 0),
        active: true,
      };
    } else {
      handleResetView();
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Dedicated WebGL Mount */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Projected 3D Telemetry Callout Tags */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {tags.map((tag) => {
          if (!tag.visible) return null;
          if (tag.variant === 'badge') {
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onSelectEquipment(tag.code)}
                style={{
                  transform: `translate3d(${tag.x}px, ${tag.y}px, 0) translate(-50%, -50%)`,
                }}
                className={`pointer-events-auto absolute top-0 left-0 px-2 py-0.5 text-[10px] font-mono-tabular font-semibold rounded-sm border transition-colors ${
                  selectedEquipmentCode === tag.code
                    ? 'bg-amber-500/85 border-amber-300 text-slate-950'
                    : 'bg-slate-900/80 border-slate-400/50 text-slate-100 hover:border-amber-400'
                }`}
              >
                {tag.code}
              </button>
            );
          }

          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onSelectEquipment(tag.code)}
              style={{
                transform: `translate3d(${tag.x}px, ${tag.y}px, 0) translate(-50%, -100%)`,
              }}
              className={`pointer-events-auto absolute top-0 left-0 text-left px-2.5 py-1.5 rounded-[2px] border transition-colors ${
                selectedEquipmentCode === tag.code
                  ? 'bg-[#364d2b]/95 border-amber-400 shadow-[0_0_12px_rgba(234,179,8,0.4)]'
                  : 'bg-[#2a3b24]/82 border-[#84a946]/65 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between gap-3 text-[11px] leading-tight">
                <span className="font-mono-tabular font-semibold text-white">{tag.code}</span>
                <span className="text-[#a3e635] font-medium">{tag.workMode}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2.5 text-[10px] leading-tight text-slate-200">
                <span className="flex items-center gap-1 font-mono-tabular">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] shrink-0" />
                  {tag.zoneLocation}
                </span>
                <span className="flex items-center gap-1 text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  {tag.loadState}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom-Left 3D Camera Controls (unobstructed in center viewport on xl, left-3 on compact viewports) */}
      <div className="absolute left-3 xl:left-[27.3%] bottom-4 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleResetView}
          title="Reset 3D Fit View"
          aria-label="Reset 3D Fit View"
          className="w-8 h-8 rounded-full bg-[#091224]/85 border border-slate-500/60 hover:border-[#D4A44A] text-slate-200 hover:text-[#FACC15] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCenterTarget}
          title="Focus Center Racks"
          aria-label="Focus Center Racks"
          className="w-8 h-8 rounded-full bg-[#091224]/85 border border-slate-500/60 hover:border-[#D4A44A] text-slate-200 hover:text-[#FACC15] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleToggleTopIso}
          title={cameraMode === 'iso' ? 'Switch to Top-Down View' : 'Switch to Isometric View'}
          aria-label="Toggle Isometric or Top View"
          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            cameraMode === 'top'
              ? 'bg-amber-500/25 border-[#D4A44A] text-[#FACC15]'
              : 'bg-[#091224]/85 border-slate-500/60 hover:border-[#D4A44A] text-slate-200 hover:text-[#FACC15]'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
