// Фон и прогресс-декор (зона props). На плато за карьером — забор с сигнальной лентой по бровке, мачты освещения,
// башенный кран, бытовки и миниатюры 1–3 прошлых строек; во дворе — техника компании, её больше с номером заказа.
// Только вид: уровень читает, но не меняет. Фон — один меш (один draw call), техника — второй.
(function () {
  const ATLAS = 512;
  const CELL = 128;
  // Клетки атласа [столбец, ряд]. Почти всё нарисовано в сером: цвет даёт вершина.
  const R = {
    plain: [0, 0], truss: [1, 0], wall: [2, 0], door: [3, 0],
    lamp: [0, 1], tape: [1, 1], tread: [2, 1], tire: [3, 1],
    vent: [0, 2], glass: [1, 2], stripe: [2, 2], concrete: [3, 2],
  };
  const UV = {};
  for (const name in R) {
    const c = R[name];
    // Отступ 2 px: соседние клетки не просачиваются на мипах.
    UV[name] = [(c[0] * CELL + 2) / ATLAS, 1 - ((c[1] + 1) * CELL - 2) / ATLAS, ((c[0] + 1) * CELL - 2) / ATLAS, 1 - (c[1] * CELL + 2) / ATLAS];
  }
  // Ступени техники во дворе по номеру заказа кампании: компания растёт — у карьера больше машин.
  const TIERS = [3, 8, 15, 25];
  const DROP = 1.1; // с — новая техника опускается на площадку
  const YELLOW = 0xf2b31f;
  const ORANGE = 0xe2702a;
  const DARK = 0x2f3134;
  const STEEL = 0x8e9398;
  const CHROME = 0xc9ccd0;
  const CONCRETE = 0xc4bfb5;
  // Грани коробки: ключ, нормаль, углы BL BR TR TL (снаружи против часовой) в долях полуразмеров. Днища нет: камера всегда сверху.
  const FACES = [
    ['px', [1, 0, 0], [1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]],
    ['nx', [-1, 0, 0], [-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]],
    ['pz', [0, 0, 1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
    ['nz', [0, 0, -1], [1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]],
    ['py', [0, 1, 0], [-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]],
  ];
  const NEIGHBOR = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]];
  const ID = new THREE.Matrix4();
  const E = new THREE.Euler();
  let maps = null;
  let view = null;

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Атлас 512² рисуется один раз на всю игру; второй холст — маска свечения (только стёкла прожекторов).
  function atlas() {
    if (maps) return maps;
    const color = document.createElement('canvas');
    const glow = document.createElement('canvas');
    color.width = color.height = glow.width = glow.height = ATLAS;
    const g = color.getContext('2d');
    const e = glow.getContext('2d');
    e.fillStyle = '#000';
    e.fillRect(0, 0, ATLAS, ATLAS);
    const rand = rng(17);
    function cell(name, draw) {
      g.save();
      g.translate(R[name][0] * CELL, R[name][1] * CELL);
      g.beginPath();
      g.rect(0, 0, CELL, CELL);
      g.clip();
      draw();
      g.restore();
    }
    function speckle(n, alpha) {
      for (let i = 0; i < n; i++) {
        g.fillStyle = (rand() < 0.5 ? 'rgba(0,0,0,' : 'rgba(255,255,255,') + (alpha * rand()).toFixed(3) + ')';
        g.fillRect(rand() * CELL, rand() * CELL, 1 + rand() * 3, 1 + rand() * 3);
      }
    }
    function glass(x, y, w, h) {
      const gr = g.createLinearGradient(x, y, x + w * 0.4, y + h);
      gr.addColorStop(0, '#6c8194');
      gr.addColorStop(1, '#2c3946');
      g.fillStyle = gr;
      g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,0.16)';
      g.beginPath();
      g.moveTo(x + w * 0.15, y + h);
      g.lineTo(x + w * 0.45, y);
      g.lineTo(x + w * 0.62, y);
      g.lineTo(x + w * 0.32, y + h);
      g.fill();
    }
    function corrugated() {
      g.fillStyle = '#eeeeec';
      g.fillRect(0, 0, CELL, CELL);
      for (let x = 0; x < CELL; x += 8) {
        g.fillStyle = 'rgba(0,0,0,0.07)';
        g.fillRect(x, 0, 3, CELL);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.fillRect(x + 4, 0, 1, CELL);
      }
      g.fillStyle = 'rgba(0,0,0,0.16)';
      g.fillRect(0, CELL - 9, CELL, 9);
      g.fillStyle = 'rgba(0,0,0,0.08)';
      g.fillRect(0, 0, CELL, 5);
    }
    cell('plain', function () {
      g.fillStyle = '#f2f2f0';
      g.fillRect(0, 0, CELL, CELL);
      speckle(160, 0.05);
    });
    // Ферма: светлые пояса и раскосы, просветы тёмные — издали мачта читается сплошной, вблизи — решёткой.
    cell('truss', function () {
      g.fillStyle = '#4a4742';
      g.fillRect(0, 0, CELL, CELL);
      g.strokeStyle = '#f2f2f0';
      g.lineWidth = 10;
      g.beginPath();
      g.moveTo(8, CELL - 6);
      g.lineTo(CELL - 8, 6);
      g.stroke();
      g.fillStyle = '#f2f2f0';
      g.fillRect(0, 0, 15, CELL);
      g.fillRect(CELL - 15, 0, 15, CELL);
      g.fillRect(0, 0, CELL, 9);
      g.fillRect(0, CELL - 9, CELL, 9);
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.fillRect(13, 0, 2, CELL);
      g.fillRect(CELL - 15, 0, 2, CELL);
    });
    cell('wall', function () {
      corrugated();
      g.fillStyle = '#fafafa';
      g.fillRect(28, 28, 72, 54);
      glass(33, 33, 62, 44);
      g.fillStyle = '#fafafa';
      g.fillRect(62, 33, 4, 44);
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.fillRect(26, 82, 76, 4);
    });
    cell('door', function () {
      corrugated();
      g.fillStyle = '#d9d9d6';
      g.fillRect(38, 24, 52, 104);
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 3;
      g.strokeRect(39.5, 25.5, 49, 101);
      glass(50, 36, 28, 22);
      g.fillStyle = '#3a3a3a';
      g.fillRect(80, 80, 6, 4);
    });
    // Прожекторы 2 × 2 в тёмной раме; в маске свечения горят только стёкла.
    cell('lamp', function () {
      g.fillStyle = '#2e2f31';
      g.fillRect(0, 0, CELL, CELL);
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const x = 8 + i * 60;
          const y = 8 + j * 60;
          const gr = g.createRadialGradient(x + 26, y + 26, 2, x + 26, y + 26, 30);
          gr.addColorStop(0, '#f6f7f6');
          gr.addColorStop(1, '#8f979d');
          g.fillStyle = gr;
          g.fillRect(x, y, 52, 52);
          g.strokeStyle = 'rgba(0,0,0,0.3)';
          g.lineWidth = 2;
          for (let k = 1; k < 4; k++) {
            g.beginPath();
            g.moveTo(x + k * 13, y);
            g.lineTo(x + k * 13, y + 52);
            g.stroke();
          }
          const ex = R.lamp[0] * CELL + x;
          const ey = R.lamp[1] * CELL + y;
          const eg = e.createRadialGradient(ex + 26, ey + 26, 2, ex + 26, ey + 26, 34);
          eg.addColorStop(0, '#ffffff');
          eg.addColorStop(1, '#a0a0a0');
          e.fillStyle = eg;
          e.fillRect(ex, ey, 52, 52);
        }
      }
    });
    // Лента: отрезок между столбиками растянут на клетку, поэтому полосы почти вертикальные, 6 на пролёт.
    cell('tape', function () {
      g.fillStyle = '#f3efe6';
      g.fillRect(0, 0, CELL, CELL);
      g.fillStyle = '#d23a2b';
      const period = CELL / 6;
      for (let k = -1; k <= 6; k++) {
        const x = k * period;
        g.beginPath();
        g.moveTo(x + 6, 0);
        g.lineTo(x + 6 + period / 2, 0);
        g.lineTo(x + period / 2, CELL);
        g.lineTo(x, CELL);
        g.fill();
      }
    });
    // Звено гусеницы или протектор: тёмная плитка с рамкой — читается в любом направлении.
    cell('tread', function () {
      g.fillStyle = '#2a2a2b';
      g.fillRect(0, 0, CELL, CELL);
      g.fillStyle = '#48484a';
      g.fillRect(12, 12, CELL - 24, CELL - 24);
      g.fillStyle = '#3a3a3c';
      g.fillRect(12, 52, CELL - 24, 24);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(12, 12, CELL - 24, 3);
    });
    cell('tire', function () {
      g.fillStyle = '#262627';
      g.fillRect(0, 0, CELL, CELL);
      g.fillStyle = '#d8d8d8';
      g.beginPath();
      g.arc(64, 64, 36, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#9a9a9a';
      g.beginPath();
      g.arc(64, 64, 14, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#5a5a5a';
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3;
        g.fillRect(64 + Math.cos(a) * 24 - 3, 64 + Math.sin(a) * 24 - 3, 6, 6);
      }
    });
    cell('vent', function () {
      g.fillStyle = '#efefed';
      g.fillRect(0, 0, CELL, CELL);
      speckle(80, 0.05);
      g.fillStyle = 'rgba(0,0,0,0.55)';
      for (let y = 24; y < 100; y += 13) g.fillRect(18, y, 92, 6);
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.lineWidth = 3;
      g.strokeRect(12.5, 16.5, 103, 92);
    });
    cell('glass', function () {
      g.fillStyle = '#efefed';
      g.fillRect(0, 0, CELL, CELL);
      glass(14, 12, 100, 90);
      g.fillStyle = 'rgba(0,0,0,0.2)';
      g.fillRect(14, 102, 100, 4);
    });
    cell('stripe', function () {
      g.fillStyle = '#f4f4f2';
      g.fillRect(0, 0, CELL, CELL);
      g.fillStyle = '#222224';
      for (let k = -CELL; k < CELL * 2; k += 32) {
        g.beginPath();
        g.moveTo(k, CELL);
        g.lineTo(k + 16, CELL);
        g.lineTo(k + 16 + CELL, 0);
        g.lineTo(k + CELL, 0);
        g.fill();
      }
    });
    cell('concrete', function () {
      g.fillStyle = '#dcd9d2';
      g.fillRect(0, 0, CELL, CELL);
      speckle(320, 0.09);
      g.fillStyle = 'rgba(0,0,0,0.08)';
      g.fillRect(0, 42, CELL, 2);
      g.fillRect(0, 86, CELL, 2);
    });
    const map = new THREE.CanvasTexture(color);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const glowMap = new THREE.CanvasTexture(glow);
    glowMap.colorSpace = THREE.SRGBColorSpace;
    maps = { map: map, glow: glowMap };
    return maps;
  }

  function material() {
    const m = atlas();
    return new THREE.MeshStandardMaterial({ map: m.map, vertexColors: true, roughness: 0.84, metalness: 0, emissive: 0xffe2a8, emissiveMap: m.glow, emissiveIntensity: 0 });
  }

  function at(m, x, y, z, rx, ry, rz) {
    E.set(rx || 0, ry || 0, rz || 0);
    return m.clone().multiply(new THREE.Matrix4().makeRotationFromEuler(E).setPosition(x, y, z));
  }

  function placed(x, y, z, yaw, s) {
    return new THREE.Matrix4().makeRotationY(yaw).scale(new THREE.Vector3(s, s, s)).setPosition(x, y, z);
  }

  // Сборщик одного буфера: коробки, цилиндры и грани кубиков в координатах текущей матрицы.
  function mesher() {
    const pos = [];
    const nor = [];
    const uvs = [];
    const col = [];
    const idx = [];
    const v = new THREE.Vector3();
    const nv = new THREE.Vector3();
    const color = new THREE.Color();
    const NM = new THREE.Matrix3();
    let M = ID;
    // ao: [y0, h] — низ предмета темнее, он садится на землю без отдельной тени; shade — общий множитель цвета.
    const g = { ao: null, shade: 1, use: use, quad: quad, box: box, cyl: cyl, beam: beam, cube: cube, count: count, geometry: geometry };

    function use(m) {
      M = m;
      NM.getNormalMatrix(m);
    }
    function vert(x, y, z, nx, ny, nz, u, w, hex) {
      v.set(x, y, z).applyMatrix4(M);
      nv.set(nx, ny, nz).applyMatrix3(NM).normalize();
      color.setHex(hex);
      let k = g.shade;
      if (g.ao) {
        const t = Math.min(1, Math.max(0, (v.y - g.ao[0]) / g.ao[1]));
        k *= 0.58 + 0.42 * t * (2 - t);
      }
      pos.push(v.x, v.y, v.z);
      nor.push(nv.x, nv.y, nv.z);
      uvs.push(u, w);
      col.push(color.r * k, color.g * k, color.b * k);
      return pos.length / 3 - 1;
    }
    // Параллелограмм a-b-c-d против часовой снаружи (a — левый нижний); su × sv повторов клетки атласа.
    function quad(a, b, d, name, hex, su, sv) {
      su = su || 1;
      sv = sv || 1;
      const r = UV[name];
      const ux = b[0] - a[0];
      const uy = b[1] - a[1];
      const uz = b[2] - a[2];
      const wx = d[0] - a[0];
      const wy = d[1] - a[1];
      const wz = d[2] - a[2];
      const nx = uy * wz - uz * wy;
      const ny = uz * wx - ux * wz;
      const nz = ux * wy - uy * wx;
      for (let i = 0; i < su; i++) {
        for (let j = 0; j < sv; j++) {
          const s0 = i / su;
          const s1 = (i + 1) / su;
          const t0 = j / sv;
          const t1 = (j + 1) / sv;
          const k0 = vert(a[0] + ux * s0 + wx * t0, a[1] + uy * s0 + wy * t0, a[2] + uz * s0 + wz * t0, nx, ny, nz, r[0], r[1], hex);
          const k1 = vert(a[0] + ux * s1 + wx * t0, a[1] + uy * s1 + wy * t0, a[2] + uz * s1 + wz * t0, nx, ny, nz, r[2], r[1], hex);
          const k2 = vert(a[0] + ux * s1 + wx * t1, a[1] + uy * s1 + wy * t1, a[2] + uz * s1 + wz * t1, nx, ny, nz, r[2], r[3], hex);
          const k3 = vert(a[0] + ux * s0 + wx * t1, a[1] + uy * s0 + wy * t1, a[2] + uz * s0 + wz * t1, nx, ny, nz, r[0], r[3], hex);
          idx.push(k0, k1, k2, k0, k2, k3);
        }
      }
    }
    // look: имя клетки или { px, nx, pz, nz, py, x, z, y, all }; tile: [ось, n] — клетка повторяется n раз вдоль оси.
    function box(m, w, h, d, hex, look, tile) {
      use(m);
      const half = [w / 2, h / 2, d / 2];
      for (let f = 0; f < FACES.length; f++) {
        const face = FACES[f];
        const name = !look ? 'plain' : typeof look === 'string' ? look : look[face[0]] || look[face[0][1]] || look.all || 'plain';
        const a = [face[2][0] * half[0], face[2][1] * half[1], face[2][2] * half[2]];
        const b = [face[3][0] * half[0], face[3][1] * half[1], face[3][2] * half[2]];
        const d2 = [face[5][0] * half[0], face[5][1] * half[1], face[5][2] * half[2]];
        let su = 1;
        let sv = 1;
        if (tile) {
          if (face[3][tile[0]] !== face[2][tile[0]]) su = tile[1];
          if (face[5][tile[0]] !== face[2][tile[0]]) sv = tile[1];
        }
        quad(a, b, d2, name, hex, su, sv);
      }
    }
    // Цилиндр вдоль локальной x (колёса, валец): бок — клетка side на каждый сегмент, торцы — круг из клетки cap.
    function cyl(m, r, len, seg, hex, capHex, side, cap) {
      use(m);
      const s = UV[side];
      const c = UV[cap];
      const hx = len / 2;
      const cu = (c[0] + c[2]) / 2;
      const cv = (c[1] + c[3]) / 2;
      const ru = (c[2] - c[0]) / 2;
      const rv = (c[3] - c[1]) / 2;
      for (let i = 0; i < seg; i++) {
        const a0 = i / seg * Math.PI * 2;
        const a1 = (i + 1) / seg * Math.PI * 2;
        const c0 = Math.cos(a0);
        const s0 = Math.sin(a0);
        const c1 = Math.cos(a1);
        const s1 = Math.sin(a1);
        const k0 = vert(-hx, r * c0, r * s0, 0, c0, s0, s[0], s[1], hex);
        const k1 = vert(hx, r * c0, r * s0, 0, c0, s0, s[2], s[1], hex);
        const k2 = vert(hx, r * c1, r * s1, 0, c1, s1, s[2], s[3], hex);
        const k3 = vert(-hx, r * c1, r * s1, 0, c1, s1, s[0], s[3], hex);
        idx.push(k0, k2, k1, k0, k3, k2);
      }
      for (let side2 = -1; side2 <= 1; side2 += 2) {
        const center = vert(side2 * hx, 0, 0, side2, 0, 0, cu, cv, capHex);
        const ring = [];
        for (let i = 0; i <= seg; i++) {
          const a = i / seg * Math.PI * 2;
          ring.push(vert(side2 * hx, r * Math.cos(a), r * Math.sin(a), side2, 0, 0, cu + ru * Math.cos(a), cv + rv * Math.sin(a), capHex));
        }
        for (let i = 0; i < seg; i++) {
          if (side2 > 0) idx.push(center, ring[i], ring[i + 1]);
          else idx.push(center, ring[i + 1], ring[i]);
        }
      }
    }
    // Брус от точки a до b (локальная z вдоль бруса) — стрелы, тяги, стойки лестницы.
    function beam(m, a, b, w, h, hex, look, tile) {
      const from = new THREE.Vector3(a[0], a[1], a[2]);
      const to = new THREE.Vector3(b[0], b[1], b[2]);
      const len = from.distanceTo(to);
      const up = Math.abs(to.y - from.y) > len * 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const local = new THREE.Matrix4().lookAt(to, from, up).setPosition(from.add(to).multiplyScalar(0.5));
      box(m.clone().multiply(local), w, h, len, hex, look, tile);
    }
    // Кубик миниатюры [x..x+1] в текущей матрице; open(f) — грань f снаружи (соседа нет).
    function cube(x, y, z, hex, open) {
      for (let f = 0; f < FACES.length; f++) {
        if (!open(f)) continue;
        const face = FACES[f];
        const r = UV.plain;
        const n = face[1];
        const k = [];
        for (let c = 2; c < 6; c++) {
          k.push(vert(x + (face[c][0] + 1) / 2, y + (face[c][1] + 1) / 2, z + (face[c][2] + 1) / 2, n[0], n[1], n[2], c === 2 || c === 5 ? r[0] : r[2], c < 4 ? r[1] : r[3], hex));
        }
        idx.push(k[0], k[1], k[2], k[0], k[2], k[3]);
      }
    }
    function count() {
      return idx.length;
    }
    function geometry() {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.setIndex(idx);
      return geo;
    }
    return g;
  }

  // Подкова карьера той же формулой, что в art/quarry.js build(): бровка, плато (высота 3 уступа) и сужение к фронту.
  function contour(x0, x1, z0, z1, radius) {
    const out = [];
    let s = 0;
    function push(x, z, nx, nz) {
      if (out.length) {
        const last = out[out.length - 1];
        s += Math.hypot(x - last.x, z - last.z);
      }
      out.push({ x: x, z: z, nx: nx, nz: nz, s: s });
    }
    function line(ax, az, bx, bz, nx, nz) {
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 0.5));
      for (let i = 0; i < n; i++) push(ax + (bx - ax) * i / n, az + (bz - az) * i / n, nx, nz);
    }
    function corner(ox, oz, from, to) {
      for (let i = 0; i < 20; i++) {
        const a = from + (to - from) * i / 20;
        push(ox + Math.cos(a) * radius, oz + Math.sin(a) * radius, Math.cos(a), Math.sin(a));
      }
    }
    line(x1, z1, x1, z0 + radius, 1, 0);
    corner(x1 - radius, z0 + radius, 0, -Math.PI / 2);
    line(x1 - radius, z0, x0 + radius, z0, 0, -1);
    corner(x0 + radius, z0 + radius, -Math.PI / 2, -Math.PI);
    line(x0, z0 + radius, x0, z1, -1, 0);
    push(x0, z1, -1, 0);
    return out;
  }

  // Та же рамка, что у подковы карьера (art/quarry.js build): здание, камни, рудники, точки появления и хозяйство (extra).
  function site(level, extra) {
    const f = level.footprint;
    let minX = f.minX;
    let maxX = f.maxX;
    let minZ = f.minZ;
    let maxZ = f.maxZ;
    const cells = level.rocks.concat(level.mines.map(function (m) { return { x: m.standX, z: m.standZ }; }));
    for (let i = 0; i < level.spawnPoints.length; i++) cells.push({ x: level.spawnPoints[i][0], z: level.spawnPoints[i][2] });
    for (let i = 0; i < extra.length; i++) cells.push(extra[i]);
    for (let i = 0; i < cells.length; i++) {
      minX = Math.min(minX, cells[i].x);
      maxX = Math.max(maxX, cells[i].x);
      minZ = Math.min(minZ, cells[i].z);
      maxZ = Math.max(maxZ, cells[i].z);
    }
    const x0 = minX - 2.2;
    const x1 = maxX + 3.2;
    const z0 = minZ - 2.2;
    const z1 = maxZ + 2;
    const scale = Math.min(2.2, Math.max(1, Math.max(x1 - x0, z1 - z0) / 34));
    const W = 1.8 * scale;
    const radius = Math.min(7 * scale, (x1 - x0) / 4, (z1 - z0) / 4);
    const rim = contour(x0, x1, z0, z1, radius);
    const total = rim[rim.length - 1].s;
    const taper = Math.max(4, (rim[0].z - rim[Math.floor(rim.length / 2)].z) * 0.6);
    const top = 3 * 1.15 * scale;
    function t(s) {
      const e = Math.min(1, Math.min(s, total - s) / taper);
      return Math.max(0.04, e * e * (3 - 2 * e));
    }
    return {
      x0: x0, x1: x1, z0: z0, z1: z1, scale: scale, radius: radius, rim: rim, total: total, taper: taper, top: top, t: t,
      // Забор — за полосой валунов на плато: бровка 2,28 W ± 0,6 волны, валуны quarry ещё на 2,5 клетки дальше.
      fenceD: 2.28 * W + 3.1 * scale + 0.5,
      // Высота плато под точкой — по ближайшей точке бровки.
      y: function (x, z) {
        let best = rim[0];
        let bestD = Infinity;
        for (let i = 0; i < rim.length; i++) {
          const d = (rim[i].x - x) * (rim[i].x - x) + (rim[i].z - z) * (rim[i].z - z);
          if (d < bestD) {
            bestD = d;
            best = rim[i];
          }
        }
        return top * t(best.s);
      },
    };
  }

  // Забор по краю плато: столбики через 1,7 клетки и лента с двух сторон; только там, где стенка в полную высоту.
  function fence(g, S) {
    const s = S.scale;
    const d = S.fenceD;
    const step = 1.7 * s;
    let run = step;
    let prev = null;
    let last = null;
    for (let i = 0; i < S.rim.length; i++) {
      const p = S.rim[i];
      const x = p.x + p.nx * d;
      const z = p.z + p.nz * d;
      if (prev) run += Math.hypot(x - prev[0], z - prev[1]);
      prev = [x, z];
      const t = S.t(p.s);
      if (t < 0.45) {
        last = null;
        continue;
      }
      if (run < step) continue;
      run = 0;
      const y = S.top * t;
      g.ao = null;
      g.box(at(ID, x, y + 0.36 * s, z), 0.07 * s, 0.72 * s, 0.07 * s, 0xe6e2da);
      g.ao = [y, 0.12 * s];
      g.box(at(ID, x, y + 0.05 * s, z), 0.22 * s, 0.1 * s, 0.22 * s, 0xaaa59b, 'concrete');
      g.ao = null;
      if (last) {
        g.use(ID);
        const lo = 0.5 * s;
        const hi = 0.61 * s;
        g.quad([last[0], last[1] + lo, last[2]], [x, y + lo, z], [last[0], last[1] + hi, last[2]], 'tape', 0xffffff);
        g.quad([x, y + lo, z], [last[0], last[1] + lo, last[2]], [x, y + hi, z], 'tape', 0xffffff);
      }
      last = [x, y, z];
    }
  }

  // Мачта освещения (8 м × s): бетонный блок, опора, рама с прожекторами к стройке; ночью стёкла горят.
  function mast(g, m, y0, s) {
    g.ao = [y0, 0.45 * s];
    g.box(at(m, 0, 0.22, 0), 0.8, 0.44, 0.8, CONCRETE, 'concrete');
    g.ao = null;
    g.box(at(m, 0, 4.2, 0), 0.2, 7.6, 0.2, STEEL);
    g.box(at(m, 0, 1.3, 0.15), 0.32, 0.42, 0.12, 0x9fa4a8);
    g.box(at(m, 0, 7.85, 0.1), 1.8, 0.1, 0.1, DARK);
    for (let side = -1; side <= 1; side += 2) {
      const head = at(m, side * 0.45, 8.15, 0.22, 0.5, 0, 0);
      g.box(head, 0.8, 0.62, 0.16, DARK);
      g.use(head);
      g.quad([-0.37, -0.28, 0.081], [0.37, -0.28, 0.081], [-0.37, 0.28, 0.081], 'lamp', 0xffffff);
    }
  }

  // Бытовка 3 × 1,3 × 1,25: профлист, окна длинной стороной к карьеру (+z), двери в торцах, рама другого цвета.
  function cabin(g, m, body, frame, sleepers) {
    if (sleepers) {
      for (let k = -1; k <= 1; k += 2) g.box(at(m, k * 1.1, 0.06, 0), 0.22, 0.12, 1.4, 0x6e5c49);
    }
    g.box(at(m, 0, 0.77, 0), 2.96, 1.3, 1.21, body, { x: 'door', z: 'wall', y: 'plain' }, [0, 2]);
    for (let sx = -1; sx <= 1; sx += 2) {
      for (let sz = -1; sz <= 1; sz += 2) g.box(at(m, sx * 1.49, 0.78, sz * 0.615), 0.09, 1.34, 0.09, frame);
      g.box(at(m, sx * 1.49, 1.43, 0), 0.09, 0.09, 1.32, frame);
    }
    for (let sz = -1; sz <= 1; sz += 2) {
      g.box(at(m, 0, 1.43, sz * 0.615), 3.07, 0.09, 0.09, frame);
      g.box(at(m, 0, 0.13, sz * 0.615), 3.07, 0.09, 0.09, frame);
    }
  }

  // Городок: две бытовки рядом, третья сверху, наружная лестница в торце. Начало координат — центр нижней правой.
  function cabins(g, m, y0, s) {
    g.ao = [y0, 0.5 * s];
    cabin(g, m, 0xf1f0ea, 0x2b5ea8, true);
    cabin(g, at(m, -3.35, 0, 0), 0x3d6fb5, 0xeeeeea, true);
    g.ao = null;
    cabin(g, at(m, 0, 1.48, 0), 0xf1f0ea, 0x2b5ea8, false);
    for (let k = 0; k < 7; k++) g.box(at(m, 1.86, 0.2 * (k + 1), 0.78 - 0.2 * k), 0.58, 0.05, 0.22, STEEL);
    for (let sx = -1; sx <= 1; sx += 2) {
      g.beam(m, [1.86 + sx * 0.3, 0.02, 1.0], [1.86 + sx * 0.3, 1.47, -0.5], 0.05, 0.12, DARK);
    }
    g.beam(m, [2.16, 0.95, 0.95], [2.16, 2.32, -0.48], 0.04, 0.04, 0xd8d4cc);
    g.box(at(m, 2.16, 0.48, 0.95), 0.04, 0.95, 0.04, 0xd8d4cc);
    g.box(at(m, 2.16, 1.9, -0.48), 0.04, 0.85, 0.04, 0xd8d4cc);
    g.box(at(m, 1.86, 1.47, -0.48), 0.58, 0.06, 0.42, STEEL);
  }

  // Башенный кран: мачта-ферма 15 м × s, стрела 13 вдоль +x, противовесная консоль, тяги, тележка и крюк.
  function crane(g, m, y0, s) {
    const H = 15;
    const L = 13;
    g.ao = [y0, 0.6 * s];
    g.box(at(m, 0, 0.2, 0), 3.4, 0.4, 3.4, CONCRETE, 'concrete');
    for (let k = -1; k <= 1; k += 2) g.box(at(m, k * 0.95, 0.75, 0), 0.9, 0.7, 2.6, 0xb3aea4, 'concrete');
    g.ao = null;
    g.box(at(m, 0, 0.4 + H / 2, 0), 1, H, 1, YELLOW, 'truss', [1, 13]);
    g.box(at(m, 0, H + 0.6, 0), 1.3, 0.4, 1.3, DARK);
    g.box(at(m, 0.35, H + 1.25, 0.95), 0.9, 0.9, 0.85, YELLOW, { x: 'glass', z: 'glass', y: 'plain' });
    g.box(at(m, 0, H + 2.6, 0), 0.6, 3.6, 0.6, YELLOW, 'truss', [1, 3]);
    g.box(at(m, 0.5 + L / 2, H + 1.2, 0), L, 0.8, 0.7, YELLOW, 'truss', [0, 13]);
    g.box(at(m, -2.9, H + 1.1, 0), 4.8, 0.45, 0.9, YELLOW, 'truss', [0, 4]);
    for (let k = 0; k < 3; k++) g.box(at(m, -4.1 + k * 0.6, H + 0.45, 0), 0.5, 1.1, 1, 0xa7a29a, 'concrete');
    g.beam(m, [0, H + 4.35, 0], [L * 0.72, H + 1.62, 0], 0.07, 0.07, DARK);
    g.beam(m, [0, H + 4.35, 0], [-5, H + 1.35, 0], 0.07, 0.07, DARK);
    const tx = 0.5 + L * 0.55;
    g.box(at(m, tx, H + 0.7, 0), 0.8, 0.2, 0.8, DARK);
    for (let k = -1; k <= 1; k += 2) g.box(at(m, tx + k * 0.12, H - 2.2, 0), 0.03, 5.6, 0.03, DARK);
    g.box(at(m, tx, H - 5.2, 0), 0.45, 0.5, 0.3, YELLOW, { z: 'stripe', all: 'plain' });
    g.box(at(m, tx, H - 5.6, 0), 0.08, 0.3, 0.08, DARK);
  }

  // Миниатюры прошлых строек на бетонных постаментах между краном и бытовками: только наружные грани блоков.
  function minis(g, level, S, xa, xb, zFront) {
    const MB = window.MicroBuilders;
    const list = [];
    for (let i = Math.max(0, level.index - 3); i < level.index; i++) list.push(MB.LEVELS[i]);
    if (!list.length || xb <= xa) return;
    const s = S.scale;
    const gap = 1.2 * s;
    const margin = 0.5 * s;
    const ks = list.map(function (L) {
      const f = L.footprint;
      return Math.min(0.22 * s, 3.4 * s / Math.max(f.maxX - f.minX + 1, f.maxZ - f.minZ + 1, f.maxY + 1));
    });
    let width = gap * (list.length - 1);
    for (let i = 0; i < list.length; i++) width += (list[i].footprint.maxX - list[i].footprint.minX + 1) * ks[i] + margin;
    // Не влезают между краном и бытовками — все чуть мельче, ряд не наезжает на соседей.
    const fit = Math.min(1, (xb - xa) / width);
    let x = (xa + xb) / 2 - width * fit / 2;
    for (let i = 0; i < list.length; i++) {
      const L = list[i];
      const f = L.footprint;
      const k = ks[i] * fit;
      const w = (f.maxX - f.minX + 1) * k + margin * fit;
      const d = (f.maxZ - f.minZ + 1) * k + margin * fit;
      const cx = x + w / 2;
      const cz = zFront - d / 2;
      const y = S.y(cx, cz);
      g.ao = [y, 0.2 * s];
      g.box(at(ID, cx, y + 0.1 * s, cz), w, 0.2 * s, d, 0xc9c5bc, 'concrete');
      g.ao = null;
      const keys = new Set();
      for (let j = 0; j < L.blocks.length; j++) keys.add(L.blocks[j].x + ',' + L.blocks[j].y + ',' + L.blocks[j].z);
      // Модель стоит фасадом к карьеру, как и само здание.
      g.use(new THREE.Matrix4().makeScale(k, k, k).setPosition(cx - (f.minX + f.maxX + 1) / 2 * k, y + 0.2 * s, cz - (f.minZ + f.maxZ + 1) / 2 * k));
      for (let j = 0; j < L.blocks.length; j++) {
        const b = L.blocks[j];
        const hash = (((b.x * 73856093) ^ (b.y * 19349663) ^ (b.z * 83492791)) >>> 0) % 1000 / 1000;
        g.shade = 0.93 + 0.12 * hash;
        g.cube(b.x, b.y, b.z, MB.MATERIAL[b.materialId].color, function (n) {
          const o = NEIGHBOR[n];
          return !keys.has((b.x + o[0]) + ',' + (b.y + o[1]) + ',' + (b.z + o[2]));
        });
      }
      g.shade = 1;
      x += w + gap * fit;
    }
  }

  // Фон за карьером: забор, мачты, а в ряд за забором — кран слева, миниатюры в середине, бытовки справа.
  function backdrop(g, level, S, cx, cz) {
    const s = S.scale;
    fence(g, S);
    const sideLen = S.z1 - S.z0 - S.radius;
    const arc = Math.PI / 2 * S.radius;
    const at4 = [S.taper, sideLen + arc / 2, S.total - sideLen - arc / 2, S.total - S.taper];
    for (let i = 0; i < at4.length; i++) {
      let p = S.rim[0];
      for (let j = 0; j < S.rim.length; j++) if (Math.abs(S.rim[j].s - at4[i]) < Math.abs(p.s - at4[i])) p = S.rim[j];
      const d = S.fenceD + 0.9 * s;
      const x = p.x + p.nx * d;
      const z = p.z + p.nz * d;
      const y = S.top * S.t(p.s);
      mast(g, placed(x, y, z, Math.atan2(cx - x, cz - z), s), y, s);
      // Ночное пятно света у мачты: чуть вперёд, к стройке (build, update).
      const away = Math.hypot(cx - x, cz - z) || 1;
      S.pools.push([x + (cx - x) / away * 1.2 * s, y + 0.05, z + (cz - z) / away * 1.2 * s, 2.6 * s]);
    }
    const zRow = S.z0 - S.fenceD - 1.0 * s;
    const left = S.x0 + S.radius * 0.5;
    const right = S.x1 - S.radius * 0.5;
    const craneX = left + 1.7 * s;
    const craneZ = zRow - 3.2 * s;
    const craneY = S.y(craneX, craneZ);
    // Стрела вдоль задней бровки и чуть наружу — над плато, а не над стройкой.
    crane(g, placed(craneX, craneY, craneZ, 0.35, s), craneY, s);
    const cabX = right - 2.2 * s;
    const cabZ = zRow - 0.8 * s;
    const cabY = S.y(cabX, cabZ);
    cabins(g, placed(cabX, cabY, cabZ, 0, s), cabY, s);
    minis(g, level, S, craneX + 2.9 * s, cabX - 6.1 * s, zRow);
  }

  // Техника «Дохода» в локальных координатах (вперёд +z), по ступеням TIERS. r — радиус стоянки.
  function compressor(g, m) {
    g.box(at(m, 0, 0.66, -0.1), 0.86, 0.72, 1.45, ORANGE, { x: 'vent', all: 'plain' });
    g.box(at(m, 0, 1.05, -0.1), 0.9, 0.07, 1.5, 0xc95f22);
    g.box(at(m, 0, 0.3, 0), 0.7, 0.08, 1.9, DARK);
    for (let k = -1; k <= 1; k += 2) {
      g.cyl(at(m, k * 0.52, 0.27, -0.15), 0.27, 0.17, 12, 0xffffff, 0xd9d9d9, 'tread', 'tire');
      g.box(at(m, k * 0.52, 0.58, -0.15), 0.2, 0.05, 0.66, 0xc95f22);
    }
    g.beam(m, [0, 0.33, 0.7], [0, 0.27, 1.45], 0.08, 0.08, DARK);
    g.box(at(m, 0, 0.15, 1.32), 0.06, 0.3, 0.06, DARK);
    g.box(at(m, 0, 0.78, 0.64), 0.42, 0.3, 0.05, DARK);
    g.box(at(m, 0.22, 1.2, -0.6), 0.08, 0.26, 0.08, DARK);
  }

  function roller(g, m) {
    g.cyl(at(m, 0, 0.56, 0.9), 0.56, 1.5, 16, 0xa2a7ac, YELLOW, 'plain', 'plain');
    for (let k = -1; k <= 1; k += 2) {
      g.box(at(m, k * 0.82, 0.64, 0.9), 0.08, 0.72, 1.25, YELLOW);
      g.cyl(at(m, k * 0.62, 0.46, -0.62), 0.46, 0.4, 14, 0xffffff, YELLOW, 'tread', 'tire');
      g.box(at(m, k * 0.5, 1.77, -0.3), 0.07, 1.05, 0.07, DARK);
      g.box(at(m, k * 0.5, 1.77, 0.38), 0.07, 1.05, 0.07, DARK);
    }
    g.box(at(m, 0, 1.02, 0.85), 1.72, 0.14, 0.7, YELLOW);
    g.box(at(m, 0, 0.84, -0.55), 1.3, 0.72, 1.35, YELLOW, { x: 'vent', all: 'plain' });
    g.box(at(m, 0, 1.24, 0.05), 1.1, 0.1, 0.8, DARK);
    g.box(at(m, 0, 1.42, -0.05), 0.42, 0.32, 0.36, DARK);
    g.box(at(m, 0, 1.5, 0.3), 0.06, 0.42, 0.06, DARK);
    g.box(at(m, 0, 1.73, 0.3, -0.6, 0, 0), 0.32, 0.03, 0.32, DARK);
    g.box(at(m, 0, 2.32, 0.04), 1.16, 0.08, 0.96, YELLOW);
  }

  function excavator(g, m) {
    for (let k = -1; k <= 1; k += 2) {
      g.box(at(m, k * 0.72, 0.3, 0), 0.5, 0.56, 2.1, 0xffffff, 'tread', [2, 8]);
      for (let e = -1; e <= 1; e += 2) g.cyl(at(m, k * 0.72, 0.3, e * 1.05), 0.28, 0.5, 10, 0xffffff, STEEL, 'tread', 'tire');
    }
    g.box(at(m, 0, 0.45, 0), 0.95, 0.3, 1.5, DARK);
    // Поворотная часть развёрнута: ковш опущен на землю наискосок, силуэт не повторяет каток.
    const u = at(m, 0, 0, 0, 0, 0.55, 0);
    g.box(at(u, 0.05, 1, -0.2), 1.6, 0.66, 1.75, YELLOW, { x: 'vent', all: 'plain' });
    g.box(at(u, 0.05, 0.95, -1.25), 1.6, 0.56, 0.4, YELLOW, { nz: 'stripe', all: 'plain' });
    g.box(at(u, -0.42, 1.8, 0.3), 0.72, 0.95, 0.88, YELLOW, { x: 'glass', pz: 'glass', all: 'plain' });
    g.box(at(u, 0.55, 1.5, -0.7), 0.07, 0.35, 0.07, DARK);
    g.beam(u, [0.3, 1.2, 0.55], [0.3, 2.8, 2.35], 0.3, 0.36, YELLOW);
    g.beam(u, [0.3, 2.8, 2.35], [0.3, 0.72, 3.05], 0.24, 0.26, YELLOW);
    g.beam(u, [0.3, 1.05, 0.95], [0.3, 2.05, 1.8], 0.09, 0.09, CHROME);
    g.box(at(u, 0.3, 0.38, 3.12, 0.35, 0, 0), 0.62, 0.48, 0.5, 0x5e6266);
    g.box(at(u, 0.3, 0.1, 3.36), 0.6, 0.06, 0.12, DARK);
  }

  // Автокран на выносных опорах, стрела поднята над кабиной. Детали сдвинуты, чтобы машина была в центре стоянки.
  function truckCrane(g, m) {
    g.box(at(m, 0, 0.72, -0.7), 1, 0.32, 4.4, DARK);
    const axles = [0.75, -1.35, -2.2];
    for (let i = 0; i < axles.length; i++) {
      for (let k = -1; k <= 1; k += 2) g.cyl(at(m, k * 0.62, 0.42, axles[i]), 0.42, 0.32, 14, 0xffffff, 0xdddddd, 'tread', 'tire');
    }
    g.box(at(m, 0, 0.95, -1.2), 1.5, 0.12, 2.9, YELLOW);
    g.box(at(m, 0, 1.4, 1.05), 1.4, 1.05, 1, YELLOW, { x: 'glass', pz: 'glass', all: 'plain' });
    g.box(at(m, 0, 0.75, 1.6), 1.4, 0.25, 0.12, DARK);
    g.box(at(m, 0, 1.2, -1.6), 1.2, 0.35, 1.2, DARK);
    g.box(at(m, 0, 1.6, -1.85), 1.25, 0.5, 1.5, YELLOW, { x: 'vent', all: 'plain' });
    g.box(at(m, 0, 1.55, -2.75), 1.2, 0.5, 0.35, YELLOW, { nz: 'stripe', all: 'plain' });
    g.box(at(m, 0.52, 2.05, -1.45), 0.42, 0.65, 0.75, YELLOW, { x: 'glass', pz: 'glass', all: 'plain' });
    g.beam(m, [-0.1, 1.95, -2.2], [-0.1, 4.2, 1.4], 0.42, 0.46, YELLOW);
    g.beam(m, [-0.1, 4.1, 1.24], [-0.1, 5.05, 2.76], 0.3, 0.32, YELLOW);
    g.beam(m, [-0.1, 1.5, -1.0], [-0.1, 3.0, 0.3], 0.14, 0.14, CHROME);
    g.box(at(m, -0.1, 5.05, 2.8), 0.3, 0.3, 0.3, DARK);
    g.box(at(m, -0.1, 3.18, 2.85), 0.03, 3.7, 0.03, DARK);
    g.box(at(m, -0.1, 1.15, 2.85), 0.36, 0.42, 0.26, YELLOW, { z: 'stripe', all: 'plain' });
    const legs = [0.3, -2.6];
    for (let i = 0; i < legs.length; i++) {
      g.box(at(m, 0, 0.62, legs[i]), 3, 0.16, 0.2, YELLOW, 'stripe');
      for (let k = -1; k <= 1; k += 2) {
        g.box(at(m, k * 1.45, 0.34, legs[i]), 0.12, 0.52, 0.12, DARK);
        g.box(at(m, k * 1.45, 0.04, legs[i]), 0.42, 0.08, 0.42, DARK);
      }
    }
  }

  const MACHINES = [
    { build: compressor, r: 1.1 },
    { build: roller, r: 1.6 },
    { build: excavator, r: 2.6 },
    { build: truckCrane, r: 3.1 },
  ];

  function hull(points) {
    points.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    const lower = [];
    const upper = [];
    for (let i = 0; i < points.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) lower.pop();
      lower.push(points[i]);
    }
    for (let i = points.length - 1; i >= 0; i--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) upper.pop();
      upper.push(points[i]);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  // Расстояние от точки до выпуклой оболочки снаружи; внутри — 0.
  function outside(h, x, z) {
    let inside = true;
    let best = Infinity;
    for (let i = 0; i < h.length; i++) {
      const a = h[i];
      const b = h[(i + 1) % h.length];
      const ex = b[0] - a[0];
      const ez = b[1] - a[1];
      if (ex * (z - a[1]) - ez * (x - a[0]) < 0) inside = false;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez || 1)));
      best = Math.min(best, Math.hypot(a[0] + ex * t - x, a[1] + ez * t - z));
    }
    return inside ? 0 : best;
  }

  // Стоянка техники: двор вне выпуклой оболочки всего, куда ходят рабочие и погрузчики (здание, камни, места добычи,
  // ряды появления), и вне площадки самосвала (Vehicles.decorate); ближе к стройке, сначала справа от въезда.
  function parking(level, S, cx, cz, extra) {
    const f = level.footprint;
    const pts = [[f.minX - 1, f.minZ - 1], [f.maxX + 2, f.minZ - 1], [f.minX - 1, f.maxZ + 2], [f.maxX + 2, f.maxZ + 2]];
    for (let i = 0; i < extra.length; i++) pts.push([extra[i].x + 0.5, extra[i].z + 0.5]);
    for (let i = 0; i < level.rocks.length; i++) pts.push([level.rocks[i].x + 0.5, level.rocks[i].z + 0.5]);
    let front = -Infinity;
    for (let i = 0; i < level.spawnPoints.length; i++) {
      pts.push([level.spawnPoints[i][0] + 0.5, level.spawnPoints[i][2] + 0.5]);
      front = Math.max(front, level.spawnPoints[i][2]);
    }
    for (let i = 0; i < level.mines.length; i++) {
      const mine = level.mines[i];
      pts.push([mine.standX + 0.5, mine.standZ + 0.5]);
      for (let j = 0; j < mine.rocks.length; j++) pts.push([mine.rocks[j].x + 0.5, mine.rocks[j].z + 0.5]);
    }
    const h = hull(pts);
    const dx = Math.round((f.minX + f.maxX) / 2) + 0.5;
    const decor = [dx - 5.6, dx + 4.6, front + 0.6, front + 5.8];
    const taken = [];
    return function (r) {
      let best = null;
      let bestD = Infinity;
      for (let pass = 0; pass < 2 && !best; pass++) {
        for (let z = S.z0 + r + 1; z <= S.z1 + 3 - r; z += 0.5) {
          for (let x = S.x0 + r + 0.8; x <= S.x1 - r - 0.8; x += 0.5) {
            if (pass === 0 && x < cx) continue;
            const dist = Math.hypot(x - cx, z - cz);
            if (dist >= bestD) continue;
            if (x + r > decor[0] && x - r < decor[1] && z + r > decor[2] && z - r < decor[3]) continue;
            if (outside(h, x, z) < r + 1) continue;
            let clear = true;
            for (let i = 0; i < taken.length && clear; i++) clear = Math.hypot(x - taken[i][0], z - taken[i][1]) >= r + taken[i][2] + 0.5;
            if (!clear) continue;
            best = [x, z];
            bestD = dist;
          }
        }
      }
      if (best) taken.push([best[0], best[1], r]);
      return best;
    };
  }

  function tierOf(order) {
    let n = 0;
    while (n < TIERS.length && order >= TIERS[n]) n++;
    return n;
  }

  // options: { cells — хозяйство стройки (как у карьера), order — номер заказа кампании }.
  function build(level, cx, cz, options) {
    const group = new THREE.Group();
    const extra = options.cells || [];
    const S = site(level, extra);
    S.pools = [];
    const mat = material();
    const bg = mesher();
    backdrop(bg, level, S, cx, cz);
    const back = new THREE.Mesh(bg.geometry(), mat);
    group.add(back);
    // Пятна света под мачтами: мягкий тёплый круг на земле, ночью проявляется вместе с лампами (update).
    const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: poolTexture(), color: 0xffd49a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
      Math.max(1, S.pools.length));
    for (let i = 0; i < S.pools.length; i++) {
      const p = S.pools[i];
      pools.setMatrixAt(i, new THREE.Matrix4().makeScale(p[3] * 2, 1, p[3] * 2).setPosition(p[0], p[1], p[2]));
    }
    pools.count = S.pools.length;
    pools.frustumCulled = false;
    pools.visible = false;
    group.add(pools);

    // Вся техника в одном буфере по порядку ступеней: открытые ступени — префикс, drawRange отсекает остальное.
    const mg = mesher();
    const slot = parking(level, S, cx, cz, extra);
    const ends = [0];
    for (let i = 0; i < MACHINES.length; i++) {
      const p = slot(MACHINES[i].r);
      if (p) {
        mg.ao = [0, 0.35];
        // Мордой к въезду и камере, вполоборота: видно и бок, и кабину.
        MACHINES[i].build(mg, placed(p[0], 0, p[1], (p[0] >= cx ? -0.75 : 0.75) + (i % 2 ? 0.12 : -0.1), 1));
      }
      ends.push(mg.count());
    }
    const geo = mg.geometry();
    const parked = new THREE.Mesh(geo, mat);
    parked.castShadow = true;
    parked.receiveShadow = true;
    // Опускающаяся техника — те же буферы, свой drawRange и сдвиг по высоте.
    const dropGeo = new THREE.BufferGeometry();
    for (const name in geo.attributes) dropGeo.setAttribute(name, geo.attributes[name]);
    dropGeo.setIndex(geo.index);
    dropGeo.boundingSphere = geo.boundingSphere || (geo.computeBoundingSphere(), geo.boundingSphere);
    const dropping = new THREE.Mesh(dropGeo, mat);
    dropping.castShadow = true;
    dropping.receiveShadow = true;
    dropping.visible = false;
    group.add(parked, dropping);
    const tier = tierOf(options.order || 0);
    view = { material: mat, parked: parked, dropping: dropping, pools: pools, ends: ends, shown: tier, target: tier, t: 1 };
    show();
    return group;
  }

  // Мягкое пятно света: радиальный градиент, общий на игру (game.js не освобождает shared).
  let pool = null;
  function poolTexture() {
    if (pool) return pool;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.45, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    pool = new THREE.CanvasTexture(canvas);
    pool.colorSpace = THREE.SRGBColorSpace;
    pool.userData.shared = true;
    return pool;
  }

  function show() {
    const v = view;
    v.parked.geometry.setDrawRange(0, v.ends[v.shown]);
    v.parked.visible = v.ends[v.shown] > 0;
    v.dropping.geometry.setDrawRange(v.ends[v.shown], v.ends[v.target] - v.ends[v.shown]);
    v.dropping.visible = v.t < 1 && v.ends[v.target] > v.ends[v.shown];
  }

  // Каждый кадр: ночные лампы (night 0…1 — часы стройки) и новая ступень техники. Ступень, открытая в игре,
  // опускается; при загрузке — сразу на месте.
  function update(dt, night, order, playing) {
    const v = view;
    if (!v) return;
    const lamps = Math.min(1, Math.max(0, (night - 0.5) * 4));
    v.material.emissiveIntensity = 2.4 * lamps;
    MicroBuildersPost.mark(v.material, night > 0.5); // ночью лампы и окна бытовок светятся в посте (art/post.js)
    v.pools.material.opacity = 0.42 * lamps;
    v.pools.visible = lamps > 0.01;
    const tier = tierOf(order);
    if (tier !== v.target) {
      if (tier > v.target && playing) {
        v.t = 0;
      } else {
        v.shown = tier;
        v.t = 1;
      }
      v.target = tier;
      show();
    }
    if (v.t < 1) {
      v.t = Math.min(1, v.t + dt / DROP);
      const k = 1 - v.t;
      // Спуск с 4 клеток с замедлением, в конце — лёгкая просадка на подвеске.
      v.dropping.position.y = 4 * k * k * k - 0.05 * Math.sin(Math.min(1, Math.max(0, (v.t - 0.8) / 0.2)) * Math.PI);
      if (v.t >= 1) {
        v.shown = v.target;
        v.dropping.position.y = 0;
        show();
      }
    }
  }

  window.MicroBuildersProps = { build: build, update: update, TIERS: TIERS };
})();
