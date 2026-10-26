import { totalDuration, drawEndCard } from "./end-card.mjs";
import * as THREE from "../vendor/three.module.js";
import { validateStory, locateScene } from "./story.mjs";
import { createNarrator } from "./narration.mjs";
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const rendering = params.has("render");
if (rendering) document.body.classList.add("render");
const smooth = (x) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
};
function paperTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f1dfb9";
  ctx.fillRect(0, 0, 256, 256);
  let seed = 17;
  for (let i = 0; i < 16000; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = seed % 256;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = seed % 256;
    ctx.fillStyle = i % 2 ? "rgba(95,68,33,.045)" : "rgba(255,255,255,.11)";
    ctx.fillRect(x, y, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}
async function texture(name) {
  const image = new Image();
  image.src = new URL("../assets/" + name + ".svg", import.meta.url).href;
  await image.decode();
  const c = document.createElement("canvas");
  c.width = image.naturalWidth;
  c.height = image.naturalHeight;
  const ctx = c.getContext("2d");
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = "source-atop";
  for (let i = 0; i < 3500; i++) {
    const x = (i * 139 + 37) % c.width,
      y = (i * 173 + 59) % c.height;
    ctx.fillStyle = "rgba(83,63,34,.065)";
    ctx.fillRect(x, y, 1, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
try {
  const storyUrl = params.get("story") || "stories/joao.json";
  const u = new URL(storyUrl, location.href);
  if (u.origin !== location.origin)
    throw Error("O roteiro deve estar no mesmo servidor");
  const response = await fetch(u);
  if (!response.ok) throw Error("Roteiro não encontrado");
  const story = validateStory(await response.json());
  const length = totalDuration(story);
  const endCardCanvas = document.createElement("canvas");
  endCardCanvas.id = "end-card";
  endCardCanvas.width = 1280;
  endCardCanvas.height = 720;
  endCardCanvas.style.cssText =
    "position:absolute;inset:0;pointer-events:none;display:none";
  $("stage").append(endCardCanvas);
  let brandPlate = null;
  if (story.endCard?.image) {
    if (!/^assets\/marca\/[a-zA-Z0-9_-]+\.(png|jpg)$/.test(story.endCard.image))
      throw Error("Imagem de marca inválida");
    brandPlate = new Image();
    brandPlate.src = story.endCard.image;
    await brandPlate.decode();
  }
  drawEndCard(
    endCardCanvas.getContext("2d"),
    story.endCard,
    1280,
    720,
    brandPlate,
  );
  window.popupEndCard = endCardCanvas;

  window.popupNarrator = createNarrator(story);
  let voiceEnabled = false;
  $("narrate").onclick = async () => {
    try {
      if (voiceEnabled) {
        window.popupNarrator.disable();
        voiceEnabled = false;
        $("narrate").textContent = "Ouvir narração";
      } else {
        await window.popupNarrator.enable();
        voiceEnabled = true;
        playing = true;
        if (position >= length) position = 0;
        $("play").textContent = "Pausar";
        $("narrate").textContent = "Silenciar";
        $("status").textContent = "Narração Thalita · português do Brasil";
      }
    } catch (e) {
      $("status").textContent = e.message;
    }
  };
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#443326");
  scene.fog = new THREE.Fog("#443326", 26, 55);
  const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: rendering,
  });
  renderer.setPixelRatio(rendering ? 1 : Math.min(devicePixelRatio, 1.5));
  renderer.setSize(1280, 720);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  $("stage").prepend(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xfff4da, 0x70553d, 1.65));
  const light = new THREE.DirectionalLight(0xffedcf, 2.4);
  light.position.set(-5, 12, 7);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, {
    left: -13,
    right: 13,
    top: 15,
    bottom: -12,
    near: 0.5,
    far: 40,
  });
  light.shadow.normalBias = 0.025;
  light.shadow.bias = -0.00008;
  light.shadow.radius = 3;
  scene.add(light);
  const wood = document.createElement("canvas");
  wood.width = wood.height = 512;
  const wc = wood.getContext("2d");
  wc.fillStyle = "#624530";
  wc.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {
    wc.strokeStyle = i % 2 ? "#6b4b33" : "#593d2b";
    wc.lineWidth = 1 + (i % 3);
    wc.beginPath();
    wc.moveTo(0, i * 6);
    wc.bezierCurveTo(180, i * 6 + 7, 320, i * 6 - 8, 512, i * 6 + 3);
    wc.stroke();
  }
  const wt = new THREE.CanvasTexture(wood);
  wt.colorSpace = THREE.SRGBColorSpace;
  wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
  wt.repeat.set(15, 15);
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(100, 0.3, 100),
    new THREE.MeshStandardMaterial({ map: wt, color: "#b39473", roughness: 1 }),
  );
  table.position.y = -0.55;
  table.receiveShadow = true;
  scene.add(table);
  const paper = paperTexture();
  const pageMat = new THREE.MeshStandardMaterial({
    map: paper,
    roughness: 1,
    color: "#fff6df",
    side: THREE.DoubleSide,
  });
  const book = new THREE.Group();
  scene.add(book);
  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(12.6, 0.18, 8.4),
    new THREE.MeshStandardMaterial({ color: "#754936", roughness: 0.95 }),
  );
  cover.position.y = -0.32;
  cover.castShadow = cover.receiveShadow = true;
  book.add(cover);
  for (const side of [-1, 1]) {
    const pages = new THREE.Mesh(new THREE.BoxGeometry(6.05, 0.23, 8), pageMat);
    pages.position.set(side * 3.03, -0.13, 0);
    pages.receiveShadow = pages.castShadow = true;
    book.add(pages);
    for (let i = 0; i < 5; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(6, 0.012, 8.015),
        new THREE.MeshStandardMaterial({
          color: i % 2 ? "#bda77f" : "#e5d3ae",
        }),
      );
      line.position.set(side * 3.03, -0.21 + i * 0.035, 0);
      book.add(line);
    }
  }
  const crease = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.012, 7.95),
    new THREE.MeshStandardMaterial({ color: "#bfa77f" }),
  );
  crease.position.y = 0.005;
  book.add(crease);
  const turnPivot = new THREE.Group();
  book.add(turnPivot);
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(6, 0.018, 7.94), pageMat);
  sheet.position.set(3, 0.04, 0);
  sheet.castShadow = sheet.receiveShadow = true;
  turnPivot.add(sheet);
  const names = [
    ...new Set(
      story.scenes
        .flatMap((s) => s.actors.map((a) => a.asset))
        .concat(["folha"]),
    ),
  ];
  const textures = Object.fromEntries(
    await Promise.all(names.map(async (n) => [n, await texture(n)])),
  );
  function card(asset, width, height) {
    const pivot = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      map: textures[asset],
      transparent: false,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 1,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    mesh.position.y = height / 2;
    mesh.castShadow = mesh.receiveShadow = true;
    pivot.add(mesh);
    return pivot;
  }
  function floorTexture(clouds) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 640;
    const x = c.getContext("2d");
    x.fillStyle = clouds ? "#d9e0d6" : "#9fa770";
    x.fillRect(0, 0, 1024, 640);
    if (!clouds) {
      x.fillStyle = "#c3b58e";
      x.beginPath();
      x.moveTo(0, 100);
      x.lineTo(580, 140);
      x.lineTo(830, 640);
      x.lineTo(80, 640);
      x.closePath();
      x.fill();
      for (let yy = 100; yy < 640; yy += 22)
        for (let xx = 0; xx < 730; xx += 30) {
          if (xx > 580 + (yy - 140) * 0.5) continue;
          x.fillStyle = (xx + yy) % 4 ? "#d7c8a3" : "#b9aa86";
          x.beginPath();
          x.ellipse(xx + ((yy / 22) % 2) * 12, yy, 11, 7, 0, 0, 7);
          x.fill();
        }
      for (let i = 0; i < 120; i++) {
        const xx = 650 + ((i * 47) % 370),
          yy = (i * 97) % 640;
        x.fillStyle = ["#e9d59c", "#dccea1", "#ced496"][i % 3];
        x.beginPath();
        x.arc(xx, yy, 2.5, 0, 7);
        x.fill();
      }
    } else {
      for (let i = 0; i < 40; i++) {
        x.fillStyle = "#f3efde";
        x.beginPath();
        x.ellipse((i * 137) % 1024, (i * 83) % 640, 75, 35, 0, 0, 7);
        x.fill();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const groups = story.scenes.map((s) => {
    const group = new THREE.Group();
    book.add(group);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(11.6, 7.35),
      new THREE.MeshStandardMaterial({
        map: floorTexture(s.id === "castelo"),
        roughness: 1,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.015;
    ground.receiveShadow = true;
    group.add(ground);
    if (s.id !== "castelo") {
      for (const side of [-1, 1]) {
        const skyPivot = new THREE.Group();
        skyPivot.position.set(side * 2.85, 0.018, -3.45);
        const panel = new THREE.Mesh(
          new THREE.PlaneGeometry(5.7, 3.7),
          new THREE.MeshStandardMaterial({
            color: "#abc9c4",
            roughness: 1,
            side: THREE.DoubleSide,
          }),
        );
        panel.position.y = 1.85;
        panel.receiveShadow = true;
        skyPivot.add(panel);
        group.add(skyPivot);
      }
    }
    const actors = s.actors.map((a, i) => {
      const pivot = card(a.asset, a.width, a.height);
      pivot.position.set(a.x, a.y || 0.025, a.z);
      group.add(pivot);
      return { pivot, data: a, index: i };
    });
    let stalk = null;
    if (s.stalk) {
      stalk = new THREE.Group();
      stalk.position.set(1.6, 0.05, -0.1);
      group.add(stalk);
      const points = [];
      for (let i = 0; i <= 42; i++)
        points.push(new THREE.Vector3(Math.sin(i * 0.35) * 0.22, i / 6.2, 0));
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          90,
          0.12,
          8,
          false,
        ),
        new THREE.MeshStandardMaterial({ color: "#6d914b", roughness: 1 }),
      );
      tube.castShadow = true;
      stalk.add(tube);
      for (let i = 0; i < 10; i++) {
        const leaf = card("folha", 1.3, 0.9);
        const side = i % 2 ? 1 : -1;
        leaf.position.set(Math.sin((i + 2) * 0.9) * 0.2, (i + 0.7) * 0.58, 0);
        leaf.rotation.z = side * 0.9;
        leaf.rotation.y = i % 2 ? 0.3 : 2.8;
        stalk.add(leaf);
      }
    }
    return { group, actors, stalk };
  });
  const states = story.scenes.map((s) => {
    const state = { growth: s.fall ? 1 : 0 };
    const timeline = window.gsap.timeline({ paused: true });
    if (s.stalk && !s.fall)
      timeline.to(state, { growth: 1, duration: 6, ease: "power2.inOut" }, 2);
    return { state, timeline };
  });
  let position = 0,
    playing = !rendering,
    last = performance.now();
  $("seek").max = length;
  window.renderAt = (time) => {
    const { index, scene: s, local: t } = locateScene(story, time);
    position = Math.min(length, Math.max(0, time));
    const phase = t / s.duration;
    const pop = smooth((t - 0.25) / 1.5),
      closing =
        index < groups.length - 1
          ? 1 - smooth((t - (s.duration - 0.7)) / 0.65)
          : 1;
    for (let i = 0; i < groups.length; i++)
      groups[i].group.visible = i === index;
    const current = groups[index];
    for (const { pivot, data: a, index: n } of current.actors) {
      const enter = a.enter || 0;
      const raised = smooth((t - enter - 0.15 - n * 0.035) / 1.1) * closing;
      pivot.rotation.x = (-Math.PI / 2) * (1 - raised);
      pivot.visible = raised > 0.005;
      pivot.position.x = a.x + (a.walk || 0) * smooth((t - 2) / 5);
      pivot.position.y =
        (a.y || 0.025) +
        (a.walk && t > 2 && t < 7 ? Math.sin(t * 9) * 0.025 : 0);
      pivot.rotation.z = a.walk && t > 2 && t < 7 ? Math.sin(t * 9) * 0.025 : 0;
    }
    if (current.stalk) {
      states[index].timeline.totalTime(t, false);
      const growth = s.fall ? 1 : states[index].state.growth;
      current.stalk.scale.set(1, Math.max(0.001, growth * closing), 1);
      current.stalk.visible = growth > 0.001;
      current.stalk.rotation.z = s.fall ? -smooth((t - 4) / 4) * 1.7 : 0;
    }
    const move = smooth(phase);
    camera.position
      .fromArray(s.camera.from)
      .lerp(new THREE.Vector3(...s.camera.to), move);
    camera.lookAt(new THREE.Vector3(...s.camera.target));
    if (index === 0) {
      camera.position.multiplyScalar(1 + (1 - pop) * 0.15);
      book.scale.y = 0.25 + 0.75 * pop;
    } else book.scale.y = 1;
    turnPivot.visible = t < 1.2;
    turnPivot.rotation.z = Math.PI * (1 - smooth(t / 1.2));
    $("caption").style.opacity = String(smooth((t - 1.5) / 0.5) * closing);
    $("caption").firstElementChild.textContent = s.caption;
    $("seek").value = position;
    $("time").textContent = Math.floor(position) + " / " + length + " s";
    const showEnd = !!story.endCard && position >= story.duration;
    endCardCanvas.style.display = showEnd ? "block" : "none";
    if (showEnd) $("caption").style.opacity = "0";
    renderer.render(scene, camera);
    window.popupNarrator.sync(position, playing);
    window.popupState = {
      scene: s.id,
      time: position,
      sceneIndex: index,
      growth: states[index].state.growth,
    };
  };
  window.pauseForExport = () => {
    playing = false;
    window.popupNarrator.pause();
    $("play").textContent = "Reproduzir";
  };
  window.popupReady = true;
  window.popupDuration = length;
  window.renderAt(0);
  $("status").textContent = "Three.js + GSAP do Mira · cenas 3D locais";
  if (story.narration)
    window.popupNarrator
      .getAudio()
      .then((audio) => {
        if (audio)
          $("status").textContent =
            "Thalita pt-BR pronta. Clique em Ouvir narração.";
      })
      .catch((e) => {
        $("status").textContent = e.message;
      });
  $("play").onclick = () => {
    playing = !playing;
    if (!playing) window.popupNarrator.pause();
    $("play").textContent = playing ? "Pausar" : "Reproduzir";
    if (playing && position >= length) position = 0;
  };
  $("restart").onclick = () => {
    position = 0;
    playing = true;
    $("play").textContent = "Pausar";
  };
  $("seek").oninput = (e) => {
    playing = false;
    $("play").textContent = "Reproduzir";
    window.popupNarrator.pause();
    window.renderAt(+e.target.value);
  };
  function animate(now) {
    if (playing) {
      position = Math.min(length, position + (now - last) / 1000);
      window.renderAt(position);
      if (position >= length) {
        playing = false;
        $("play").textContent = "Reproduzir";
      }
    }
    last = now;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
} catch (error) {
  $("error").hidden = false;
  $("error").textContent = "Não foi possível abrir o livro: " + error.message;
  window.popupError = error.message;
  console.error(error);
}
