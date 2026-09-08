import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Chirality, FingerName } from "../contracts/pnge";
import { PRINT_READY, SHELL_MESH_NAMES } from "../contracts/pnge";
import { plateParams } from "../geometry/fingers";
import { buildObjectHeader } from "../geometry/header";
import { measureShell } from "../geometry/measure";
import {
  buildNailPlate,
  buildNailPlateDetailed,
  buildWearableShell,
  buildWearableShellDetailed,
  shellMeshes,
} from "../geometry/shell";
import type { MeshData, ShellGeometry } from "../geometry/types";
import { TRAY, tenNailTrayPoses, type NailPose } from "./layout";

export type ViewPreset = "tray" | "side" | "tip";
export type Kind = "plate" | "shell";

function toGeometry(mesh: MeshData): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(mesh.normals, 3));
  g.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  return g;
}

function shellGroup(shell: ShellGeometry, kind: Kind): THREE.Group {
  const group = new THREE.Group();
  group.name = kind === "plate" ? "plate" : "shell";
  const mats: Record<string, THREE.MeshPhysicalMaterial> = {
    outer_form: new THREE.MeshPhysicalMaterial({
      color: kind === "shell" ? 0xf4f1ea : 0xf7f4ef,
      roughness: kind === "shell" ? 0.22 : 0.38,
      metalness: 0.04,
      clearcoat: kind === "shell" ? 0.55 : 0.2,
      clearcoatRoughness: 0.25,
      sheen: 0.35,
      sheenColor: new THREE.Color(0xf3e7d3),
    }),
    inner_fit: new THREE.MeshPhysicalMaterial({
      color: 0xe8cfc4,
      roughness: 0.72,
      metalness: 0,
    }),
    edge_band: new THREE.MeshPhysicalMaterial({
      color: 0xf8f6f2,
      roughness: 0.3,
      metalness: 0.02,
    }),
  };
  for (const mesh of shellMeshes(shell)) {
    const m = new THREE.Mesh(toGeometry(mesh), mats[mesh.name] ?? mats.outer_form);
    m.name = mesh.name;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  return group;
}

export function createViewer(host: HTMLElement): { dispose: () => void } {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd9d9e2);
  scene.fog = new THREE.Fog(0xd9d9e2, 180, 420);

  const camera = new THREE.PerspectiveCamera(35, host.clientWidth / host.clientHeight, 1, 800);
  camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 8, 2);

  const hemi = new THREE.HemisphereLight(0xf3f3fa, 0x8a857c, 0.35);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.8);
  key.position.set(70, 8, 18);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 10;
  key.shadow.camera.far = 200;
  key.shadow.camera.left = -90;
  key.shadow.camera.right = 90;
  key.shadow.camera.top = 70;
  key.shadow.camera.bottom = -70;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff6ee, 0.28);
  fill.position.set(-40, -20, 50);
  scene.add(fill);

  const trayMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.55, metalness: 0 });
  const tray = new THREE.Mesh(new THREE.BoxGeometry(TRAY.width, TRAY.depth, TRAY.thickness), trayMat);
  tray.position.z = -TRAY.thickness / 2;
  tray.receiveShadow = true;
  scene.add(tray);

  const nails = new THREE.Group();
  scene.add(nails);
  const pads = new THREE.Group();
  scene.add(pads);
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xe8d5c4,
    roughness: 0.78,
    metalness: 0,
  });

  const state = {
    view: "tray" as ViewPreset,
    kind: "shell" as Kind,
    finger: "middle" as FingerName,
    side: "R" as Chirality,
    trayMode: true,
  };

  function poseNail(obj: THREE.Object3D, pose: NailPose, lift: number): void {
    obj.position.set(pose.x, pose.y, lift);
    obj.rotation.set(0, 0, pose.yaw);
  }

  function rebuild(): void {
    const clearGroup = (group: THREE.Group, disposeMat: boolean): void => {
      while (group.children.length) {
        const child = group.children.pop()!;
        child.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            if (disposeMat) {
              const mat = o.material;
              if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
              else mat.dispose();
            }
          }
        });
      }
    };
    clearGroup(nails, true);
    clearGroup(pads, false);

    const wrap = state.kind === "shell" ? 0.18 : 0;
    if (state.trayMode) {
      for (const pose of tenNailTrayPoses()) {
        const params = plateParams(pose.finger, pose.side);
        const geom =
          state.kind === "shell"
            ? buildWearableShell(params, { wrapMm: wrap })
            : buildNailPlate(params);
        const g = shellGroup(geom, state.kind);
        poseNail(g, pose, params.sidewallMm * 0.15);
        nails.add(g);
        const padR = params.widthMm * 0.55;
        const padLen = params.lengthMm * 2.4;
        const pad = new THREE.Mesh(new THREE.CapsuleGeometry(padR, padLen, 5, 10), skinMat);
        pad.rotation.z = pose.yaw;
        pad.scale.set(1.05, 1, 0.42);
        pad.position.set(pose.x, pose.y - padLen * 0.18, -padR * 0.42 + 0.2);
        pad.castShadow = true;
        pad.receiveShadow = true;
        pads.add(pad);
      }
    } else {
      const params = plateParams(state.finger, state.side);
      const geom =
        state.kind === "shell"
          ? buildWearableShell(params, { wrapMm: wrap })
          : buildNailPlate(params);
      const g = shellGroup(geom, state.kind);
      g.position.set(0, -params.lengthMm * 0.35, params.sidewallMm * 0.15);
      nails.add(g);
    }
    applyView(false);
    updateHud();
  }

  function focusPoint(): THREE.Vector3 {
    if (state.trayMode) return new THREE.Vector3(0, 6, 2.5);
    return new THREE.Vector3(0, 6, 2.2);
  }

  function applyView(animate = true): void {
    const f = focusPoint();
    controls.target.copy(f);
    if (state.view === "side") {
      camera.position.set(f.x + 52, f.y + 4, f.z + 5);
    } else if (state.view === "tip") {
      camera.position.set(f.x, f.y + 44, f.z + 6);
    } else {
      camera.position.set(96, -22, 24);
      controls.target.set(0, 8, 1.6);
    }
    void animate;
    controls.update();
  }

  const hud = document.createElement("aside");
  hud.className = "panel";
  hud.innerHTML = `
    <h1>PNGE 原型</h1>
    <p class="warn">不可打印 · 非制造交付 · 婚甲渲染仅为灵感</p>
    <label>布局
      <select id="layout">
        <option value="tray" selected>十指托盘</option>
        <option value="single">单指</option>
      </select>
    </label>
    <label>种类
      <select id="kind">
        <option value="plate">甲面 plate</option>
        <option value="shell" selected>甲壳 shell</option>
      </select>
    </label>
    <label>视角
      <select id="view">
        <option value="tray" selected>托盘 3/4</option>
        <option value="side">侧面（纵拱）</option>
        <option value="tip">尖端（C 曲）</option>
      </select>
    </label>
    <label>手指
      <select id="finger">
        <option value="thumb">拇指</option>
        <option value="index">食指</option>
        <option value="middle" selected>中指</option>
        <option value="ring">无名指</option>
        <option value="pinky">小指</option>
      </select>
    </label>
    <label>左右
      <select id="side">
        <option value="L">L</option>
        <option value="R" selected>R</option>
      </select>
    </label>
    <p class="hint">网格通道名：${SHELL_MESH_NAMES.join(" / ")}（inner_fit 是床面通道，不是贴合承诺）</p>
    <pre id="metrics"></pre>
    <p class="hint">样例 GLB：<code>/samples/plate_middle_R.glb</code></p>
  `;
  document.body.appendChild(hud);

  const metricsEl = hud.querySelector("#metrics") as HTMLPreElement;

  function updateHud(): void {
    const params = plateParams(state.finger, state.side);
    const build =
      state.kind === "shell"
        ? buildWearableShellDetailed(params, { wrapMm: 0.18 })
        : buildNailPlateDetailed(params);
    const m = measureShell(build.shell);
    const header = buildObjectHeader(build);
    const fp = header.fingerprints;
    metricsEl.textContent = [
      `${params.finger}_${params.side}  ${state.kind}`,
      `C 深    ${m.cDepthMm.toFixed(2)} mm`,
      `纵拱    ${m.archMm.toFixed(2)} mm`,
      `侧壁    ${m.sidewallMm.toFixed(2)} mm`,
      `长×宽   ${m.lengthMm.toFixed(1)} × ${m.maxWidthMm.toFixed(1)} mm`,
      `PRINT_READY=${PRINT_READY}`,
      `公差带  ${header.toleranceBands.version}`,
      `fit     ${fp.fit.slice(0, 12)}…`,
      `shape   ${fp.shape.slice(0, 12)}…`,
      `edge    ${fp.edgeBand.slice(0, 12)}…`,
    ].join("\n");
  }

  hud.querySelector("#layout")!.addEventListener("change", (e) => {
    state.trayMode = (e.target as HTMLSelectElement).value === "tray";
    rebuild();
  });
  hud.querySelector("#kind")!.addEventListener("change", (e) => {
    state.kind = (e.target as HTMLSelectElement).value as Kind;
    rebuild();
  });
  hud.querySelector("#view")!.addEventListener("change", (e) => {
    state.view = (e.target as HTMLSelectElement).value as ViewPreset;
    applyView();
  });
  hud.querySelector("#finger")!.addEventListener("change", (e) => {
    state.finger = (e.target as HTMLSelectElement).value as FingerName;
    if (!state.trayMode) rebuild();
    else updateHud();
  });
  hud.querySelector("#side")!.addEventListener("change", (e) => {
    state.side = (e.target as HTMLSelectElement).value as Chirality;
    if (!state.trayMode) rebuild();
    else updateHud();
  });

  function onResize(): void {
    const w = host.clientWidth;
    const h = host.clientHeight;
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  let raf = 0;
  const tick = (): void => {
    raf = requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, camera);
  };

  rebuild();
  applyView();
  tick();

  return {
    dispose: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      hud.remove();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
