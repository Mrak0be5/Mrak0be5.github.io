// Особые блоки в виде ветки NewVisual_Opus55: окна, двери, люки, мосты, скаты, балки, раскосы, арки, лестницы,
// балконы, купола, фонари, вода, зелень и тросы. Логика feature-blocks.js (опоры, проходы, стили) не меняется:
// здесь подменяются только createState/reset/build/update и добавляются sync и night.
// Блок — пустая группа: позицию и масштаб ставит game.js, поворот — сторона блока (+Z группы смотрит в face).
// Детали всех блоков уровня рисуются общими InstancedMesh по паре (геометрия, материал): draw calls не растут
// с числом блоков. sync() каждый кадр переносит изменившиеся группы в матрицы экземпляров.
// Окно — стеклянный куб в клетке стены (logic.js: glassOf — id куба стены): стена с проёмом из материала этой стены
// (context.blocks[glassOf]), стекло утоплено. Живые меши — только створки дверей (их крутит update).
// Состояние мира здесь не меняется.
(function () {
  const F = window.MicroBuilderFeatures;
  const base = { createState: F.createState, reset: F.reset, update: F.update };
  const dummy = new THREE.Object3D();
  const m4 = new THREE.Matrix4();
  const UP = new THREE.Vector3(0, 1, 0);
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const textures = {};

  // ---------- текстуры (общие на страницу) ----------

  function texture(name, w, h, paint) {
    if (textures[name]) return textures[name];
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    paint(canvas.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    t.userData.shared = true;
    textures[name] = t;
    return t;
  }

  // Дверное полотно: четыре доски, две железные полосы и латунная ручка.
  function paintPlanks(g, w, h) {
    const tones = ['#8a5a34', '#7b4f2e', '#94623a', '#83552f'];
    for (let i = 0; i < 4; i++) {
      g.fillStyle = tones[i];
      g.fillRect(i * w / 4, 0, w / 4, h);
    }
    g.fillStyle = 'rgba(52, 30, 14, 0.22)';
    for (let i = 0; i < 20; i++) g.fillRect((i * 13) % w, (i * 37) % h, 1, 22);
    g.fillStyle = '#3b2414';
    for (let i = 1; i < 4; i++) g.fillRect(i * w / 4 - 1, 0, 2, h);
    g.fillStyle = '#3a3836';
    g.fillRect(0, h * 0.16, w, 7);
    g.fillRect(0, h * 0.78, w, 7);
    g.fillStyle = '#d6b15a';
    g.beginPath();
    g.arc(w * 0.84, h * 0.52, 3.5, 0, Math.PI * 2);
    g.fill();
  }

  // Оконное стекло: тёплое, светлое, с мягким бликом по диагонали — стекло, а не крашеная доска.
  function paintPane(g, w, h) {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fff3d6');
    grad.addColorStop(1, '#e6c38a');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255, 255, 255, 0.4)';
    g.beginPath();
    g.moveTo(w * 0.12, h);
    g.lineTo(w * 0.4, h);
    g.lineTo(w * 0.92, 0);
    g.lineTo(w * 0.64, 0);
    g.closePath();
    g.fill();
  }

  // Стекло грани: тёплый тон, альфа 1 у кромки и 0,55 в середине (переход 10 px), мягкая светлая полоса блика по диагонали.
  function paintGlass(g, w, h) {
    const img = g.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = Math.min(1, Math.min(x, y, w - 1 - x, h - 1 - y) / 10);
        const band = Math.max(0, 1 - Math.abs(x + y - w * 0.8) / 9);
        const o = (y * w + x) * 4;
        d[o] = 243 + 12 * band;
        d[o + 1] = 223 + 30 * band;
        d[o + 2] = 180 + 66 * band;
        d[o + 3] = 255 * (1 - 0.45 * k * k * (3 - 2 * k) + 0.12 * band);
      }
    }
    g.putImageData(img, 0, 0);
  }

  // ---------- материалы и геометрии (на уровень, уничтожаются с ним) ----------

  // Металл матовый: без карты окружения блестящий металл чернеет (как у лесов).
  const MAT = {
    steel: function () { return new THREE.MeshStandardMaterial({ color: 0x5d656b, roughness: 0.55, metalness: 0.3 }); },
    wood: function () { return new THREE.MeshStandardMaterial({ map: texture('planks', 64, 128, paintPlanks), roughness: 0.8 }); },
    // Слабая подсветка той же текстурой: стекло в глубине проёма и в тени остаётся светлым. Ночью (night()) окна
    // pane горят тёплым светом, paneDim — тёмные комнаты: стекло темнеет и отражает небо.
    pane: function () {
      const map = texture('pane', 64, 64, paintPane);
      return new THREE.MeshStandardMaterial({ map: map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.3, roughness: 0.25, metalness: 0.05 });
    },
    paneDim: function () {
      const map = texture('pane', 64, 64, paintPane);
      return new THREE.MeshStandardMaterial({ map: map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.3, roughness: 0.25, metalness: 0.05 });
    },
    // Тёплое прозрачное стекло: не путается с голубыми призраками недостроенных блоков. Купол — без текстуры (шов развёртки).
    clear: function () { return glassMaterial(true); },
    dome: function () { return glassMaterial(false); },
    water: function () {
      return new THREE.MeshStandardMaterial({ color: 0x3e97a6, roughness: 0.14, metalness: 0.1, transparent: true, opacity: 0.85 });
    },
    leaf: function () { return new THREE.MeshStandardMaterial({ color: 0x62a046, roughness: 0.85, flatShading: true }); },
    leafDark: function () { return new THREE.MeshStandardMaterial({ color: 0x3c7537, roughness: 0.88, flatShading: true }); },
    stem: function () { return new THREE.MeshStandardMaterial({ color: 0x5a4a2e, roughness: 0.9 }); },
    // Фонари светятся слабо: видно, что это лампа, но без неона.
    lampWarm: function () { return new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffb04a, emissiveIntensity: 0.35, roughness: 0.3 }); },
    lampCold: function () { return new THREE.MeshStandardMaterial({ color: 0xe2eff5, emissive: 0x9cd2ee, emissiveIntensity: 0.25, roughness: 0.3 }); },
  };
  const NO_SHADOW = { clear: true, dome: true, water: true };

  // Стекло по френелю: анфас прозрачнее, под скользящим углом (край купола, перила сбоку) плотнее и со светлым отблеском неба.
  // framed — текстура paintGlass на каждой грани: плотная кромка, прозрачная середина, мягкая полоса блика. Без emissive.
  function glassMaterial(framed) {
    const m = new THREE.MeshStandardMaterial({
      color: framed ? 0xffffff : 0xf3dfb4, map: framed ? texture('glass', 64, 64, paintGlass) : null,
      roughness: 0.2, metalness: 0.1, transparent: true, opacity: framed ? 0.6 : 0.4, depthWrite: false,
    });
    m.onBeforeCompile = function (shader) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
        'float fres = pow(1.0 - abs(dot(normal, geometryViewDir)), 3.0);\n' +
        'outgoingLight += vec3(0.3, 0.33, 0.36) * fres;\n' +
        'diffuseColor.a = mix(diffuseColor.a, 0.9, fres);\n' +
        '#include <opaque_fragment>');
    };
    return m;
  }

  // T:<материал> — фактура блока (MicroBuildersBlocks), P:<материал> — его средний цвет для мелких деталей.
  function material(art, name) {
    let m = art.mats.get(name);
    if (!m) {
      const id = name.slice(2);
      if (name.startsWith('T:')) m = MicroBuildersBlocks.material(id, 0);
      else if (name.startsWith('P:')) m = MicroBuildersBlocks.plain(id);
      else m = MAT[name]();
      // Свечение в посте (art/post.js): фонари всегда, горящие окна — ночью (night).
      if (name === 'lampWarm' || name === 'lampCold') MicroBuildersPost.mark(m);
      art.mats.set(name, m);
      art.night = -1;
    }
    return m;
  }

  const SQUARE = [[-0.44, -0.44], [0.44, -0.44], [0.44, 0.44], [-0.44, 0.44]];

  function shape(points) {
    const s = new THREE.Shape();
    s.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], points[i][1]);
    s.closePath();
    return s;
  }

  // Блок стены 0,98 с проёмом: фаска как у блоков, развёртка «коробкой» — каждая грань берёт текстуру
  // блока по своей главной оси, как грани куба. Клетка: x, z от -0,49 до 0,49, y от 0,01 до 0,99.
  function wall(s) {
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.88, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 12 });
    geo.translate(0, 0.5, -0.44);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i += 3) {
      va.fromBufferAttribute(pos, i);
      vb.fromBufferAttribute(pos, i + 1).sub(va);
      vc.fromBufferAttribute(pos, i + 2).sub(va);
      vb.cross(vc);
      const ax = Math.abs(vb.x);
      const ay = Math.abs(vb.y);
      const az = Math.abs(vb.z);
      for (let j = i; j < i + 3; j++) {
        const x = pos.getX(j) + 0.5;
        const y = pos.getY(j);
        const z = pos.getZ(j) + 0.5;
        if (az >= ax && az >= ay) uv.setXY(j, x, y);
        else if (ax >= ay) uv.setXY(j, z, y);
        else uv.setXY(j, x, z);
      }
    }
    return geo;
  }

  function windowWall(hole) {
    const s = shape(SQUARE);
    s.holes.push(hole(new THREE.Path()));
    return wall(s);
  }

  // Скат: куб, у которого задний верх опущен. y от 0 до 1, подъём к +Z (к face).
  function wedge() {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0 && pos.getZ(i) < 0) pos.setY(i, -0.46);
    geo.translate(0, 0.5, 0);
    geo.computeVertexNormals();
    return geo;
  }

  const GEO = {
    box: function () { return new THREE.BoxGeometry(1, 1, 1); },
    cyl: function () { return new THREE.CylinderGeometry(1, 1, 1, 12); },
    cone: function () { return new THREE.ConeGeometry(1, 1, 10); },
    cone4: function () { return new THREE.ConeGeometry(1, 1, 4); },
    ico: function () { return new THREE.IcosahedronGeometry(1, 1); },
    hemi: function () { return new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2); },
    plane: function () { return new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); },
    ribThin: function () { return new THREE.TorusGeometry(1, 0.016, 5, 16, Math.PI / 2); },
    ribThick: function () { return new THREE.TorusGeometry(1, 0.05, 6, 12, Math.PI / 2); },
    wedge: wedge,
    // Дверной портал: стойки и перемычка, проём 0,72 × 0,87.
    portal: function () {
      return wall(shape([[-0.44, -0.44], [-0.41, -0.44], [-0.41, 0.42], [0.41, 0.42], [0.41, -0.44], [0.44, -0.44], [0.44, 0.44], [-0.44, 0.44]]));
    },
    'arch:round': function () {
      const s = new THREE.Shape().moveTo(-0.44, -0.44).lineTo(-0.4, -0.44).lineTo(-0.4, 0);
      s.absarc(0, 0, 0.4, Math.PI, 0, true);
      s.lineTo(0.4, -0.44).lineTo(0.44, -0.44).lineTo(0.44, 0.44).lineTo(-0.44, 0.44).closePath();
      return wall(s);
    },
    'arch:pointed': function () {
      const s = new THREE.Shape().moveTo(-0.44, -0.44).lineTo(-0.4, -0.44).lineTo(-0.4, -0.06);
      s.quadraticCurveTo(-0.4, 0.26, 0, 0.41).quadraticCurveTo(0.4, 0.26, 0.4, -0.06);
      s.lineTo(0.4, -0.44).lineTo(0.44, -0.44).lineTo(0.44, 0.44).lineTo(-0.44, 0.44).closePath();
      return wall(s);
    },
    'win:round': function () { return windowWall(function (p) { return p.absarc(0, 0, 0.38, 0, Math.PI * 2, false); }); },
    'win:rose': function () { return windowWall(function (p) { return p.absarc(0, 0, 0.4, 0, Math.PI * 2, false); }); },
    'win:triangle': function () { return windowWall(function (p) { return p.moveTo(-0.38, -0.32).lineTo(0.38, -0.32).lineTo(0, 0.4).closePath(); }); },
    'win:diamond': function () { return windowWall(function (p) { return p.moveTo(0, -0.41).lineTo(0.36, 0).lineTo(0, 0.41).lineTo(-0.36, 0).closePath(); }); },
    'win:arch': function () {
      return windowWall(function (p) { return p.moveTo(-0.3, -0.39).lineTo(0.3, -0.39).lineTo(0.3, 0.1).absarc(0, 0.1, 0.3, 0, Math.PI, false).closePath(); });
    },
    'win:slit': function () { return windowWall(function (p) { return p.moveTo(-0.12, -0.4).lineTo(0.12, -0.4).lineTo(0.12, 0.4).lineTo(-0.12, 0.4).closePath(); }); },
  };

  function geometry(art, name) {
    let g = art.geos.get(name);
    if (!g) {
      g = GEO[name]();
      art.geos.set(name, g);
    }
    return g;
  }

  // ---------- детали ----------

  // c — блок в сборке: { art, rec, node, T, P }. Деталь уходит в пачку (геометрия, материал) со своей матрицей.
  function put(c, g, m, matrix) {
    const key = g + '|' + m;
    let batch = c.art.batches.get(key);
    if (!batch) {
      batch = { geo: geometry(c.art, g), mat: material(c.art, m), shadow: !NO_SHADOW[m], count: 0, mesh: null };
      c.art.batches.set(key, batch);
    }
    c.rec.items.push({ batch: batch, index: batch.count++, local: matrix.clone(), node: c.node });
  }

  // Центр (x, y, z), размер (sx, sy, sz), поворот (rx, ry, rz) в системе блока.
  function part(c, g, m, x, y, z, sx, sy, sz, rx, ry, rz) {
    dummy.position.set(x, y, z);
    dummy.rotation.set(rx || 0, ry || 0, rz || 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    put(c, g, m, dummy.matrix);
  }

  function box(c, m, sx, sy, sz, x, y, z, rx) {
    part(c, 'box', m, x, y, z, sx, sy, sz, rx);
  }

  // Цилиндр радиуса r между точками a и b.
  function rod(c, m, a, b, r) {
    va.set(a[0], a[1], a[2]);
    vb.set(b[0], b[1], b[2]);
    dummy.position.copy(va).add(vb).multiplyScalar(0.5);
    vb.sub(va);
    const length = vb.length();
    dummy.quaternion.setFromUnitVectors(UP, vb.normalize());
    dummy.scale.set(r, length, r);
    dummy.updateMatrix();
    put(c, 'cyl', m, dummy.matrix);
  }

  // ---------- блоки ----------

  // Соседнее окно той же стороны и стиля; dx — вдоль стены (локальная +X), dy — по высоте.
  function sameWindow(block, context, dx, dy) {
    const n = context.getBlock(block.x + dx * block.faceZ, block.y + dy, block.z - dx * block.faceX);
    return n && n.feature === 'window' && n.faceX === block.faceX && n.faceZ === block.faceZ && n.style === block.style;
  }

  // Ночью горит примерно две трети окон: какие — по клетке, одни и те же каждую ночь.
  function paneOf(block) {
    let h = Math.imul(block.x * 73856093 ^ block.y * 19349663 ^ block.z * 83492791, 0x9e3779b1) >>> 0;
    h ^= h >>> 15;
    return h % 3 ? 'pane' : 'paneDim';
  }

  function buildWindow(c, block, context) {
    const pane = paneOf(block);
    if (block.style !== 'panorama') {
      // Фигурное окно — блок стены с проёмом, стекло утоплено, переплёт по стилю.
      part(c, 'win:' + block.style, c.T, 0, 0, 0, 1, 1, 1);
      box(c, pane, 0.9, 0.9, 0.03, 0, 0.5, 0.28);
      const z = 0.3;
      if (block.style === 'round') {
        box(c, 'steel', 0.025, 0.74, 0.025, 0, 0.5, z);
        box(c, 'steel', 0.74, 0.025, 0.025, 0, 0.5, z);
      } else if (block.style === 'rose') {
        for (let i = 0; i < 4; i++) part(c, 'box', 'steel', 0, 0.5, z, 0.78, 0.022, 0.022, 0, 0, i * Math.PI / 4);
        part(c, 'ico', c.P, 0, 0.5, z, 0.06, 0.06, 0.06);
      } else if (block.style === 'arch') {
        box(c, 'steel', 0.025, 0.78, 0.025, 0, 0.5, z);
        box(c, 'steel', 0.6, 0.025, 0.025, 0, 0.6, z);
      }
      return;
    }
    // Панорама: стеклянная стена; толстая рама по краю группы окон, тонкий импост между соседями.
    box(c, pane, 1, 1, 0.04, 0, 0.5, 0.44);
    const sides = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let i = 0; i < 4; i++) {
      const dx = sides[i][0];
      const dy = sides[i][1];
      const joined = sameWindow(block, context, dx, dy);
      const t = joined ? 0.03 : 0.08;
      const d = joined ? 0.07 : 0.14;
      if (dx) box(c, c.P, t, 1, d, dx * (0.5 - t / 2), 0.5, 0.44);
      else box(c, c.P, 1, t, d, 0, dy < 0 ? t / 2 : 1 - t / 2, 0.44);
    }
  }

  // Дверь: портал из материала блока и деревянная створка. Створка — живой меш, её крутит update().
  // Прорубленную дверь (additionalDoor) проходят в обе стороны и вдоль стены: портал тонкий, сверху плита
  // во всю клетку — на ней стоят рабочие.
  function buildDoor(c, block, context, state, group) {
    const cut = !!block.additionalDoor;
    if (cut) {
      part(c, 'portal', c.T, 0, 0, 0, 1, 1, 0.12);
      box(c, c.T, 0.98, 0.08, 0.98, 0, 0.95, 0);
    } else {
      part(c, 'portal', c.T, 0, 0, 0, 1, 1, 1);
    }
    const pivot = new THREE.Group();
    pivot.position.set(-0.36, 0, cut ? 0.07 : 0.3);
    const leaf = new THREE.Mesh(geometry(c.art, 'box'), material(c.art, 'wood'));
    leaf.position.set(0.36, 0.435, 0);
    leaf.scale.set(0.72, 0.87, 0.05);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    pivot.add(leaf);
    group.add(pivot);
    const view = { block: block, pivot: pivot, angle: 0, open: false };
    state.doors.set(block.id, view);
    state.doorsByCell.set(block.x + ',' + block.y + ',' + block.z, view);
  }

  // Люк: шахта в перекрытии из материала блока и стальная лесенка.
  function buildHatch(c) {
    for (let s = -1; s <= 1; s += 2) {
      box(c, c.T, 0.98, 0.98, 0.14, 0, 0.5, s * 0.42);
      box(c, c.T, 0.14, 0.98, 0.7, s * 0.42, 0.5, 0);
    }
    for (let i = 0; i < 4; i++) box(c, 'steel', 0.46, 0.03, 0.03, 0, 0.16 + i * 0.22, -0.33);
  }

  // Перила моста или балкона на свободной стороне. lx, lz — сторона в системе блока, rails — по мировым осям.
  function hasRail(block, lx, lz) {
    if (!block.rails) return false;
    const fx = block.faceX || 0;
    const fz = fx || block.faceZ ? block.faceZ : 1;
    const wx = lx * fz + lz * fx;
    const wz = -lx * fx + lz * fz;
    return block.rails[wx === 1 ? 0 : wx === -1 ? 1 : wz === 1 ? 2 : 3];
  }

  function buildBridge(c, block) {
    const style = block.style;
    if (style === 'stone') {
      box(c, c.T, 0.98, 0.16, 0.98, 0, 0.9, 0);
    } else if (style === 'metal') {
      box(c, c.P, 0.98, 0.06, 0.98, 0, 0.95, 0);
      for (let s = -1; s <= 1; s += 2) {
        box(c, 'steel', 0.98, 0.1, 0.06, 0, 0.87, s * 0.44);
        box(c, 'steel', 0.06, 0.1, 0.86, s * 0.44, 0.87, 0);
      }
    } else {
      box(c, 'clear', 0.92, 0.04, 0.92, 0, 0.95, 0);
      for (let s = -1; s <= 1; s += 2) {
        box(c, c.P, 0.98, 0.07, 0.04, 0, 0.945, s * 0.47);
        box(c, c.P, 0.04, 0.07, 0.9, s * 0.47, 0.945, 0);
      }
    }
    const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let i = 0; i < 4; i++) {
      const lx = sides[i][0];
      const lz = sides[i][1];
      if (!hasRail(block, lx, lz)) continue;
      const x = lx * 0.45;
      const z = lz * 0.45;
      const sx = lx ? 0.06 : 0.98;
      const sz = lx ? 0.98 : 0.06;
      if (style === 'stone') {
        box(c, c.T, sx, 0.24, sz, x, 1.1, z);
        continue;
      }
      if (style === 'glass') box(c, 'clear', lx ? 0.03 : 0.9, 0.3, lx ? 0.9 : 0.03, x, 1.13, z);
      else for (let p = -1; p <= 1; p += 2) box(c, 'steel', 0.04, 0.34, 0.04, lx ? x : p * 0.42, 1.15, lx ? p * 0.42 : z);
      box(c, style === 'glass' ? c.P : 'steel', sx, 0.04, sz, x, 1.32, z);
    }
  }

  // Балкон — площадка с перилами и две консоли под ней у стены (стена с -Z).
  function buildBalcony(c, block) {
    buildBridge(c, block);
    for (let s = -1; s <= 1; s += 2) part(c, 'wedge', c.T, s * 0.34, 0.84, -0.25, 0.1, 0.4, 0.5, Math.PI);
  }

  const SLOPE_ANGLE = -Math.atan2(0.96, 0.98);
  const SLOPE_LENGTH = Math.hypot(0.96, 0.98);

  function buildSlope(c, block) {
    if (block.style === 'stone') {
      part(c, 'wedge', c.T, 0, 0, 0, 0.98, 1, 0.98);
      return;
    }
    if (block.style === 'metal') {
      // Фальцевая кровля: скат цвета материала и три стальных фальца вдоль ската.
      part(c, 'wedge', c.P, 0, 0, 0, 0.98, 1, 0.98);
      for (let i = -1; i <= 1; i++) box(c, 'steel', 0.03, 0.03, SLOPE_LENGTH, i * 0.33, 0.535, 0, SLOPE_ANGLE);
      return;
    }
    // Стеклянный скат на двух стропилах и нижнем прогоне.
    box(c, 'clear', 0.92, 0.03, SLOPE_LENGTH, 0, 0.52, 0, SLOPE_ANGLE);
    for (let s = -1; s <= 1; s += 2) box(c, c.P, 0.05, 0.07, SLOPE_LENGTH, s * 0.465, 0.5, 0, SLOPE_ANGLE);
    box(c, c.P, 0.98, 0.07, 0.07, 0, 0.04, -0.46);
  }

  // Балка вдоль face: двутавр или труба с фланцами.
  function buildBeam(c, block) {
    if (block.style === 'round') {
      part(c, 'cyl', c.P, 0, 0.66, 0, 0.11, 1, 0.11, Math.PI / 2);
      for (let e = -1; e <= 1; e += 2) part(c, 'cyl', 'steel', 0, 0.66, e * 0.47, 0.15, 0.06, 0.15, Math.PI / 2);
      return;
    }
    box(c, c.P, 0.08, 0.3, 1, 0, 0.66, 0);
    box(c, c.P, 0.26, 0.06, 1, 0, 0.84, 0);
    box(c, c.P, 0.26, 0.06, 1, 0, 0.48, 0);
  }

  // Раскос по диагонали клетки вдоль face, косынки на концах; у креста — болт в середине.
  function buildBrace(c, block) {
    rod(c, c.P, [0, 0.08, -0.46], [0, 0.92, 0.46], 0.05);
    box(c, 'steel', 0.12, 0.16, 0.12, 0, 0.08, -0.44);
    box(c, 'steel', 0.12, 0.16, 0.12, 0, 0.92, 0.44);
    if (block.style !== 'cross') return;
    rod(c, c.P, [0, 0.92, -0.46], [0, 0.08, 0.46], 0.05);
    box(c, 'steel', 0.12, 0.16, 0.12, 0, 0.92, -0.44);
    box(c, 'steel', 0.12, 0.16, 0.12, 0, 0.08, 0.44);
    part(c, 'cyl', 'steel', 0, 0.5, 0, 0.08, 0.14, 0.08, 0, 0, Math.PI / 2);
  }

  // Арка — блок стены с полукруглым или стрельчатым проходом и замковым камнем.
  function buildArch(c, block) {
    part(c, 'arch:' + block.style, c.T, 0, 0, 0, 1, 1, 1);
    box(c, c.P, 0.14, 0.16, 1, 0, 0.91, 0);
  }

  // Лестница поднимается к face: каменная — сплошные ступени, металл и стекло — проступи на косоурах.
  function buildStair(c, block) {
    const style = block.style;
    for (let i = 0; i < 4; i++) {
      const z = -0.375 + i * 0.25;
      const top = 0.25 * (i + 1);
      if (style === 'stone') box(c, c.T, 0.98, top, 0.245, 0, top / 2, z);
      else box(c, style === 'glass' ? 'clear' : c.P, 0.96, 0.05, 0.24, 0, top - 0.025, z);
      // У стеклянной ступени цветная кромка: иначе ступени не читаются на светлой земле.
      if (style === 'glass') box(c, c.P, 0.96, 0.05, 0.03, 0, top - 0.025, z - 0.105);
    }
    if (style === 'stone') return;
    for (let s = -1; s <= 1; s += 2) box(c, style === 'glass' ? c.P : 'steel', 0.05, 0.1, Math.SQRT2, s * 0.465, 0.48, 0, -Math.PI / 4);
  }

  function buildDome(c, block) {
    box(c, c.P, 0.98, 0.08, 0.98, 0, 0.04, 0);
    if (block.style === 'glass') {
      // Большой стеклянный купол-оранжерея на 3 клетки: кольцо, тёплое стекло, 12 стальных рёбер, шпиль.
      part(c, 'cyl', c.P, 0, 0.12, 0, 1.6, 0.1, 1.6);
      part(c, 'hemi', 'dome', 0, 0.16, 0, 1.6, 1.6, 1.6);
      for (let i = 0; i < 12; i++) part(c, 'ribThin', 'steel', 0, 0.16, 0, 1.6, 1.6, 1.6, 0, i * Math.PI / 6);
      part(c, 'cone', c.P, 0, 1.9, 0, 0.08, 0.32, 0.08);
      part(c, 'ico', c.P, 0, 1.76, 0, 0.09, 0.09, 0.09);
      return;
    }
    const metal = block.style === 'metal';
    part(c, 'cyl', c.T, 0, 0.16, 0, 0.38, 0.16, 0.38);
    part(c, 'hemi', metal ? c.P : c.T, 0, 0.24, 0, 0.36, 0.36, 0.36);
    if (metal) for (let i = 0; i < 8; i++) part(c, 'ribThick', 'steel', 0, 0.24, 0, 0.36, 0.36, 0.36, 0, i * Math.PI / 4);
    part(c, 'cone', c.P, 0, 0.7, 0, 0.06, 0.2, 0.06);
    part(c, 'ico', c.P, 0, 0.6, 0, 0.045, 0.045, 0.045);
  }

  // Фонарь: стальной столбик, светлый плафон в рамке, четырёхскатная крышка.
  function buildLamp(c, block) {
    const glow = block.style === 'cold' ? 'lampCold' : 'lampWarm';
    box(c, 'steel', 0.22, 0.06, 0.22, 0, 0.03, 0);
    part(c, 'cyl', 'steel', 0, 0.22, 0, 0.035, 0.32, 0.035);
    box(c, 'steel', 0.2, 0.03, 0.2, 0, 0.39, 0);
    box(c, glow, 0.15, 0.2, 0.15, 0, 0.505, 0);
    for (let i = 0; i < 4; i++) box(c, 'steel', 0.025, 0.2, 0.025, i < 2 ? -0.08 : 0.08, 0.505, i % 2 ? -0.08 : 0.08);
    part(c, 'cone4', 'steel', 0, 0.66, 0, 0.15, 0.11, 0.15, 0, Math.PI / 4);
  }

  // Бассейн: дно и бортики из материала блока (бортик — только к соседу без воды), вода колышется.
  function buildWater(c, block, context, state) {
    box(c, c.T, 1, 0.1, 1, 0, 0.05, 0);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let i = 0; i < 4; i++) {
      const neighbor = context.getBlock(block.x + dirs[i][0], block.y, block.z + dirs[i][1]);
      if (neighbor && neighbor.feature === 'water') continue;
      const alongZ = dirs[i][0] !== 0;
      box(c, c.T, alongZ ? 0.12 : 0.98, 0.5, alongZ ? 0.98 : 0.12, dirs[i][0] * 0.43, 0.25, dirs[i][1] * 0.43);
    }
    if (block.style === 'cascade') {
      // Фонтан: тумба с чашей, струя колышется вместе с водой.
      part(c, 'cyl', c.P, 0, 0.32, 0, 0.08, 0.5, 0.08);
      part(c, 'cyl', c.P, 0, 0.58, 0, 0.2, 0.05, 0.2);
    }
    const node = new THREE.Object3D();
    node.position.y = 0.38;
    c.node = node;
    c.rec.node = node;
    part(c, 'plane', 'water', 0, 0, 0, 1, 1, 1);
    if (block.style === 'cascade') part(c, 'cyl', 'water', 0, 0.32, 0, 0.035, 0.22, 0.035);
    state.water.push({ mesh: node, base: 0.38, phase: block.x * 0.7 + block.z * 0.4 });
  }

  // Зелень у стены (стена с -Z): кадка с кустом или плющ по стене. Листва чуть качается.
  function buildGreenery(c, block) {
    const node = new THREE.Object3D();
    c.rec.node = node;
    if (block.style === 'shrub') {
      box(c, c.T, 0.7, 0.26, 0.4, 0, 0.13, -0.27);
      c.node = node;
      const crown = [[0, 0.42, -0.27, 0.18], [-0.19, 0.44, -0.22, 0.13], [0.19, 0.43, -0.24, 0.13], [0.02, 0.6, -0.26, 0.14], [0.07, 0.45, -0.1, 0.12]];
      for (let i = 0; i < crown.length; i++) {
        const r = crown[i][3];
        part(c, 'ico', i % 2 ? 'leafDark' : 'leaf', crown[i][0], crown[i][1], crown[i][2], r, r * 0.9, r);
      }
    } else {
      const stems = [-0.28, 0, 0.27];
      for (let i = 0; i < stems.length; i++) rod(c, 'stem', [stems[i], 0.02, -0.44], [stems[i] * 0.4, 0.96, -0.43], 0.018);
      c.node = node;
      const leaves = [[-0.3, 0.18], [-0.06, 0.3], [0.24, 0.24], [-0.22, 0.5], [0.12, 0.52], [0.32, 0.68], [-0.06, 0.74], [0.16, 0.9], [-0.28, 0.82]];
      for (let i = 0; i < leaves.length; i++) part(c, 'ico', i % 2 ? 'leafDark' : 'leaf', leaves[i][0], leaves[i][1], -0.41, 0.12, 0.09, 0.05);
    }
    c.art.green.push({ node: node, phase: block.x * 0.9 + block.y * 0.5 + block.z * 0.3 });
  }

  // Трос вдоль face: натянутый — стальной канат с хомутами, провисший — цепочка звеньев с проушинами.
  function buildCable(c, block) {
    if (block.style !== 'sag') {
      part(c, 'cyl', 'steel', 0, 0.58, 0, 0.04, 1, 0.04, Math.PI / 2);
      for (let e = -1; e <= 1; e += 2) part(c, 'cyl', c.P, 0, 0.58, e * 0.46, 0.075, 0.07, 0.075, Math.PI / 2);
      return;
    }
    let prev = [0, 0.84, -0.5];
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      const next = [0, 0.84 - Math.sin(t * Math.PI) * 0.3, -0.5 + t];
      rod(c, 'steel', prev, next, 0.03);
      prev = next;
    }
    for (let e = -1; e <= 1; e += 2) part(c, 'ico', c.P, 0, 0.84, e * 0.47, 0.065, 0.065, 0.065);
  }

  const BUILD = {
    window: buildWindow,
    door: buildDoor,
    hatch: buildHatch,
    bridge: buildBridge,
    slope: buildSlope,
    beam: buildBeam,
    brace: buildBrace,
    arch: buildArch,
    stair: buildStair,
    balcony: buildBalcony,
    dome: buildDome,
    lamp: buildLamp,
    water: buildWater,
    greenery: buildGreenery,
    cable: buildCable,
  };

  // ---------- контракт MicroBuilderFeatures ----------

  F.createState = function () {
    const state = base.createState();
    state.art = { parent: null, batches: new Map(), geos: new Map(), mats: new Map(), records: [], green: [], night: -1 };
    return state;
  };

  // Буферы экземпляров освобождаем здесь; геометрии и материалы уничтожит disposeLevel вместе с мешами.
  F.reset = function (state) {
    base.reset(state);
    const art = state.art;
    art.batches.forEach(function (batch) {
      if (batch.mesh) batch.mesh.dispose();
    });
    art.batches.clear();
    art.geos.clear();
    art.mats.clear();
    art.records.length = 0;
    art.green.length = 0;
    art.parent = null;
    art.night = -1;
  };

  F.build = function (block, context, state) {
    const art = state.art;
    art.parent = context.parent;
    const group = new THREE.Group();
    group.position.set(block.x + 0.5, block.y, block.z + 0.5);
    group.rotation.y = Math.atan2(block.faceX || 0, block.faceZ || 0);
    group.scale.setScalar(0.001);
    const rec = { group: group, node: null, items: [], last: [NaN, NaN, NaN, NaN, NaN, NaN] };
    art.records.push(rec);
    const wall = block.glassOf !== undefined && context.blocks ? context.blocks[block.glassOf] : null;
    const id = wall ? wall.materialId : block.materialId;
    BUILD[block.feature]({ art: art, rec: rec, node: null, T: 'T:' + id, P: 'P:' + id }, block, context, state, group);
    context.parent.add(group);
    return group;
  };

  // Створки дверей и вода — как раньше; зелень чуть качается.
  F.update = function (state, deltaTime, elapsedTime, walkers) {
    base.update(state, deltaTime, elapsedTime, walkers);
    const green = state.art.green;
    for (let i = 0; i < green.length; i++) green[i].node.rotation.z = Math.sin(elapsedTime * 1.3 + green[i].phase) * 0.035;
  };

  // Ночь (k 0…1): две трети окон горят тёплым светом, остальные темнеют; фонари ярче. Только при смене k.
  F.night = function (state, k) {
    const art = state.art;
    if (art.night === k) return;
    art.night = k;
    const mats = art.mats;
    const lit = mats.get('pane');
    if (lit) {
      // Тёплый свет ламп за стеклом: ярче, но не до белого (ACES), оттенок к оранжевому.
      lit.emissiveIntensity = 0.3 + 0.5 * k;
      lit.emissive.setRGB(1, 1 - 0.2 * k, 1 - 0.48 * k);
      MicroBuildersPost.mark(lit, k > 0.35);
    }
    const dim = mats.get('paneDim');
    if (dim) {
      dim.emissiveIntensity = 0.3 * (1 - 0.8 * k);
      dim.color.setScalar(1 - 0.55 * k);
    }
    const warm = mats.get('lampWarm');
    if (warm) warm.emissiveIntensity = 0.35 + 2.2 * k;
    const cold = mats.get('lampCold');
    if (cold) cold.emissiveIntensity = 0.25 + 1.8 * k;
  };

  // Каждый кадр, и на ×20 тоже: создаёт недостающие InstancedMesh и переносит изменившиеся группы в экземпляры.
  F.sync = function (state) {
    const art = state.art;
    let all = false;
    art.batches.forEach(function (batch) {
      if (batch.mesh && batch.count <= batch.mesh.instanceMatrix.count) {
        batch.mesh.count = batch.count;
        return;
      }
      if (batch.mesh) {
        art.parent.remove(batch.mesh);
        batch.mesh.dispose();
      }
      // Запас на двери и люки, которые прорубают по ходу стройки.
      batch.mesh = new THREE.InstancedMesh(batch.geo, batch.mat, batch.count + 8);
      batch.mesh.count = batch.count;
      batch.mesh.castShadow = batch.shadow;
      batch.mesh.receiveShadow = true;
      batch.mesh.frustumCulled = false;
      art.parent.add(batch.mesh);
      all = true;
    });
    const records = art.records;
    for (let r = 0; r < records.length; r++) {
      const rec = records[r];
      const g = rec.group;
      const last = rec.last;
      if (!all && !rec.node && last[0] === g.scale.x && last[1] === g.scale.y && last[2] === g.scale.z &&
        last[3] === g.position.x && last[4] === g.position.y && last[5] === g.position.z) continue;
      last[0] = g.scale.x;
      last[1] = g.scale.y;
      last[2] = g.scale.z;
      last[3] = g.position.x;
      last[4] = g.position.y;
      last[5] = g.position.z;
      g.updateMatrix();
      if (rec.node) rec.node.updateMatrix();
      for (let i = 0; i < rec.items.length; i++) {
        const item = rec.items[i];
        if (item.node) m4.multiplyMatrices(g.matrix, item.node.matrix).multiply(item.local);
        else m4.multiplyMatrices(g.matrix, item.local);
        item.batch.mesh.setMatrixAt(item.index, m4);
        item.batch.mesh.instanceMatrix.needsUpdate = true;
      }
    }
  };
})();
