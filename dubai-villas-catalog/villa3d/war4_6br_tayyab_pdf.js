// Вилла Al Warqa 4 · современная 6BR (брошюра «BrandNew Modern 6BR Villa W Pool ~ War4», объявление dubizzle AW4550K11127).
// Модель собрана по 35 фото брошюры, 30 фото объявления и цифрам: дом ~703 м² (7 570 sqft), участок ~1 116 м² (12 017 sqft),
// угловой участок, 2 этажа, первый этаж поднят на ~0,9 м, этажи ~4,4 м, второй свет ~8 м. Поэтажного плана нет — размеры приблизительные.
// Интерьер — по фото брошюры и списку комнат из объявления; мебели нет, дом сдаётся без неё.
// Оси: X — вдоль главной улицы (на восток), Z — к главной улице (на юг), Y — вверх, метры.

export const info = {
  title: 'Al Warqa 4 · современная 6BR',
  note: 'Модель по фото брошюры и объявления: дом, двор, бассейн и интерьер. Поэтажного плана нет, поэтому размеры и расстановка комнат приблизительные; мебели нет — дом сдаётся без неё.'
};

export function build(THREE) {
  const root = new THREE.Group();
  root.name = 'war4_villa';

  // ---------- материалы ----------
  function canvasTexture(size, draw, metersPerTile, h = size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = h;
    draw(canvas.getContext('2d'), size, h);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.repeat.set(1 / metersPerTile, 1 / metersPerTile);
    return texture;
  }
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  function speckle(ctx, size, amount, spread, h = size) {
    for (let i = 0; i < amount; i++) {
      const v = (rnd() - 0.5) * spread;
      ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      ctx.fillRect(rnd() * size, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
    }
  }
  const tileTex = canvasTexture(512, (ctx, s) => { // светлая плитка 0,6×1,2 м, на текстуре 2,4×2,4 м
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
      const shade = 222 + Math.floor(rnd() * 12);
      ctx.fillStyle = `rgb(${shade},${shade - 8},${shade - 22})`;
      const off = (r % 2) * (s / 4);
      ctx.fillRect((c * s / 2 + off) % s, r * s / 4, s / 2, s / 4);
      ctx.fillRect((c * s / 2 + off) % s - s, r * s / 4, s / 2, s / 4);
    }
    speckle(ctx, s, 9000, 0.06);
    ctx.strokeStyle = 'rgba(120,105,85,0.55)';
    ctx.lineWidth = 2;
    for (let r = 0; r <= 4; r++) { ctx.beginPath(); ctx.moveTo(0, r * s / 4); ctx.lineTo(s, r * s / 4); ctx.stroke(); }
    for (let r = 0; r < 4; r++) for (let c = 0; c <= 2; c++) {
      const x = (c * s / 2 + (r % 2) * (s / 4)) % s;
      ctx.beginPath(); ctx.moveTo(x, r * s / 4); ctx.lineTo(x, (r + 1) * s / 4); ctx.stroke();
    }
  }, 2.4);
  const paverTex = canvasTexture(512, (ctx, s) => { // тёмная брусчатка 0,2×0,1 м «ёлочкой», на текстуре 1,6 м
    const u = s / 16;
    ctx.fillStyle = '#4a4e52';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const g = 84 + Math.floor(rnd() * 22);
      ctx.fillStyle = `rgb(${g},${g + 3},${g + 6})`;
      if ((x + y) % 2 === 0) ctx.fillRect(x * u + 1, y * u + 1, u * 2 - 2, u - 2);
      else ctx.fillRect(x * u + 1, y * u + 1, u - 2, u * 2 - 2);
    }
    speckle(ctx, s, 6000, 0.08);
  }, 1.6);
  const grassTex = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#4f9a37';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) {
      const g = 120 + Math.floor(rnd() * 70);
      ctx.fillStyle = `rgba(${40 + Math.floor(rnd() * 30)},${g},${30 + Math.floor(rnd() * 25)},0.55)`;
      ctx.fillRect(rnd() * s, rnd() * s, 1, 2 + rnd() * 3);
    }
  }, 1.5);
  const sandTex = canvasTexture(256, (ctx, s) => { ctx.fillStyle = '#d29a62'; ctx.fillRect(0, 0, s, s); speckle(ctx, s, 14000, 0.16); }, 2.5);
  const asphaltTex = canvasTexture(256, (ctx, s) => { ctx.fillStyle = '#3c3f43'; ctx.fillRect(0, 0, s, s); speckle(ctx, s, 16000, 0.12); }, 3);
  const slatTex = canvasTexture(256, (ctx, s) => { // вертикальные ламели ограды
    ctx.fillStyle = '#17191b';
    ctx.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 16) { ctx.fillStyle = '#2b2e31'; ctx.fillRect(x, 0, 3, s); ctx.fillStyle = '#0c0d0e'; ctx.fillRect(x + 12, 0, 3, s); }
  }, 0.8);
  // интерьер: крупная глянцевая плитка, шпон, камень санузлов
  function floorTiles(base, spread, grout, tiles) {
    return (ctx, s) => {
      const t = s / tiles;
      for (let r = 0; r < tiles; r++) for (let c = 0; c < tiles; c++) {
        const k = (rnd() - 0.5) * spread;
        ctx.fillStyle = `rgb(${Math.round(base[0] + k)},${Math.round(base[1] + k)},${Math.round(base[2] + k * 0.8)})`;
        ctx.fillRect(c * t, r * t, t, t);
      }
      speckle(ctx, s, 7000, 0.035);
      ctx.strokeStyle = grout;
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= tiles; i++) {
        ctx.beginPath(); ctx.moveTo(i * t, 0); ctx.lineTo(i * t, s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * t); ctx.lineTo(s, i * t); ctx.stroke();
      }
    };
  }
  const floorCreamTex = canvasTexture(512, floorTiles([238, 214, 176], 10, 'rgba(150,120,84,0.35)', 2), 2.0);
  const floorRoomTex = canvasTexture(512, floorTiles([146, 128, 108], 12, 'rgba(70,58,46,0.45)', 2), 2.0);
  const floorBathTex = canvasTexture(256, floorTiles([96, 92, 88], 10, 'rgba(40,38,36,0.5)', 2), 1.2);
  const oakTex = canvasTexture(256, (ctx, s) => { // светлый дуб, панели шкафов 0,6 м с вертикальной ручкой-пазом
    ctx.fillStyle = '#c9a47a';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 160; i++) {
      const x = rnd() * s, w = 0.5 + rnd() * 1.5, a = 0.04 + rnd() * 0.1;
      ctx.fillStyle = rnd() > 0.5 ? `rgba(120,80,40,${a})` : `rgba(255,235,200,${a})`;
      ctx.fillRect(x, 0, w, s);
    }
    ctx.fillStyle = 'rgba(60,40,20,0.75)';
    ctx.fillRect(s - 3, 0, 3, s);
  }, 0.6);
  const walnutTex = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#6b4329';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = rnd() > 0.5 ? `rgba(40,20,8,${0.05 + rnd() * 0.12})` : `rgba(170,120,80,${0.04 + rnd() * 0.08})`;
      ctx.fillRect(rnd() * s, 0, 0.5 + rnd() * 1.5, s);
    }
  }, 0.5);
  const stoneDarkTex = canvasTexture(256, (ctx, s) => { // тёмный камень стен санузлов с прожилками
    ctx.fillStyle = '#4c4946';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 9000, 0.08);
    ctx.strokeStyle = 'rgba(190,180,165,0.12)';
    for (let i = 0; i < 9; i++) {
      ctx.lineWidth = 0.6 + rnd() * 1.4;
      ctx.beginPath();
      let x = rnd() * s, y = 0;
      ctx.moveTo(x, y);
      while (y < s) { x += (rnd() - 0.5) * 30; y += 12 + rnd() * 20; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }, 1.2);
  const washTex = (() => { // мягкое пятно света на стене от бра (яркое у светильника)
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(64, 128);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 64; x++) {
      const v = 1 - y / 127, u = Math.abs(x - 31.5) / 32;
      const a = Math.pow(Math.max(0, v), 1.8) * Math.pow(Math.max(0, 1 - u * (0.6 + 0.9 * (1 - v))), 1.5);
      const i = (y * 64 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * Math.min(1, a));
    }
    ctx.putImageData(img, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  })();

  const M = {
    white: new THREE.MeshStandardMaterial({ color: 0xebe5da, roughness: 0.82 }),
    frame: new THREE.MeshStandardMaterial({ color: 0xf4f0e7, roughness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x24333d, metalness: 0.9, roughness: 0.06, envMapIntensity: 1.6 }),
    black: new THREE.MeshStandardMaterial({ color: 0x1b1c1e, metalness: 0.35, roughness: 0.45 }),
    stone: new THREE.MeshStandardMaterial({ color: 0xe2d6c1, roughness: 0.85 }),
    coping: new THREE.MeshStandardMaterial({ color: 0xd9c9ad, roughness: 0.8 }),
    tiles: new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.75 }),
    pavers: new THREE.MeshStandardMaterial({ map: paverTex, roughness: 0.9 }),
    grass: new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }),
    sand: new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 }),
    asphalt: new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.95 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xd3cdc3, roughness: 0.9 }),
    slats: new THREE.MeshStandardMaterial({ map: slatTex, roughness: 0.6, metalness: 0.2 }),
    water: new THREE.MeshStandardMaterial({ color: 0x35c6b0, metalness: 0.05, roughness: 0.05, envMapIntensity: 1.1, emissive: 0x0d4a40, emissiveIntensity: 0.45 }),
    poolWall: new THREE.MeshStandardMaterial({ color: 0x8fd8c7, roughness: 0.5 }),
    door: new THREE.MeshStandardMaterial({ color: 0x2a2b2d, metalness: 0.4, roughness: 0.35 }),
    paint: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: 0.95 }),
    frond: new THREE.MeshStandardMaterial({ color: 0x467f30, roughness: 0.8, side: THREE.DoubleSide }),
    frondDry: new THREE.MeshStandardMaterial({ color: 0x7d8a3c, roughness: 0.85, side: THREE.DoubleSide }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 }),
    shrub: new THREE.MeshStandardMaterial({ color: 0x9a9a5a, roughness: 1 }),
    play: new THREE.MeshStandardMaterial({ color: 0xcf4a2a, roughness: 0.6 }),
    slide: new THREE.MeshStandardMaterial({ color: 0x2c6fd6, roughness: 0.4 }),
    neighbor: new THREE.MeshStandardMaterial({ color: 0xe6dac6, roughness: 0.9 }),
    neighborDark: new THREE.MeshStandardMaterial({ color: 0x5d6770, roughness: 0.5, metalness: 0.4 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0x8e9499, metalness: 0.6, roughness: 0.4 })
  };
  // Интерьер. Материалы с userData.room отражают и рассеивают «комнатную» среду просмотрщика (светлая тёплая
  // комната с окнами), а не уличное небо — иначе глянцевый пол синеет. Потолок — ровный белый, без отсвета песка.
  const MI = {
    wall: new THREE.MeshStandardMaterial({ color: 0xf2e9dc, roughness: 0.9 }),
    ceiling: new THREE.MeshBasicMaterial({ color: 0xe9e5de, toneMapped: false }),
    floor: new THREE.MeshStandardMaterial({ map: floorCreamTex, roughness: 0.16 }),
    floorRoom: new THREE.MeshStandardMaterial({ map: floorRoomTex, roughness: 0.22 }),
    floorBath: new THREE.MeshStandardMaterial({ map: floorBathTex, roughness: 0.3 }),
    walnut: new THREE.MeshStandardMaterial({ map: walnutTex, roughness: 0.5 }),
    oak: new THREE.MeshStandardMaterial({ map: oakTex, roughness: 0.6 }),
    stoneDark: new THREE.MeshStandardMaterial({ map: stoneDarkTex, roughness: 0.42 }),
    stoneLight: new THREE.MeshStandardMaterial({ color: 0xdccaa9, roughness: 0.35 }),
    tread: new THREE.MeshStandardMaterial({ color: 0xe8dbc3, roughness: 0.3 }),
    porcelain: new THREE.MeshStandardMaterial({ color: 0xf7f6f2, roughness: 0.12 }),
    basin: new THREE.MeshStandardMaterial({ color: 0xd9e3e6, roughness: 0.18 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd5d9dc, metalness: 1, roughness: 0.2 }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xc9d1d6, metalness: 1, roughness: 0.04 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xcfe8ea, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
    led: new THREE.MeshStandardMaterial({ color: 0xfff1d8, emissive: 0xffd49a, emissiveIntensity: 2.4 }),
    riser: new THREE.MeshStandardMaterial({ color: 0xf3e6cf, emissive: 0xffd8a0, emissiveIntensity: 0.55, roughness: 0.4 }),
    downlight: new THREE.MeshBasicMaterial({ color: 0xfffaf0, toneMapped: false }),
    wash: new THREE.MeshBasicMaterial({ map: washTex, color: 0xffd9a8, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }),
    slot: new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.7 })
  };
  for (const key of ['led', 'downlight', 'wash', 'glass']) MI[key].userData.noCast = true;
  MI.wash.userData.keepUV = true;
  for (const m of Object.values(MI)) if (m.isMeshStandardMaterial) m.userData.room = true;

  // ---------- помощники ----------
  const add = (obj, parent = root) => { parent.add(obj); return obj; };
  function boxMM(x0, x1, y0, y1, z0, z1, mat, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return add(m, parent);
  }
  function rectZ(x0, x1, y0, y1, z, mat, facing, parent) { // вертикальный прямоугольник, нормаль ±Z
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
    if (facing < 0) m.rotation.y = Math.PI;
    return add(m, parent);
  }
  function rectX(z0, z1, y0, y1, x, mat, facing, parent) { // нормаль ±X
    const m = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, y1 - y0), mat);
    m.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2);
    m.rotation.y = facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    return add(m, parent);
  }
  // Окна: стекло смотрит только наружу — снаружи тёмное зеркальное, изнутри не мешает видеть улицу.
  function gridZ(x0, x1, y0, y1, z, cols, rows, facing, parent, bar = 0.07) { // стекло с чёрными переплётами
    rectZ(x0, x1, y0, y1, z + facing * 0.005, M.glass, facing, parent);
    const zc = z + facing * 0.05;
    for (let i = 0; i <= cols; i++) { const x = x0 + (i * (x1 - x0)) / cols; boxMM(x - bar / 2, x + bar / 2, y0, y1, zc - 0.05, zc + 0.05, M.black, parent); }
    for (let j = 0; j <= rows; j++) { const y = y0 + (j * (y1 - y0)) / rows; boxMM(x0, x1, y - bar / 2, y + bar / 2, zc - 0.05, zc + 0.05, M.black, parent); }
  }
  function gridX(z0, z1, y0, y1, x, cols, rows, facing, parent, bar = 0.07) {
    rectX(z0, z1, y0, y1, x + facing * 0.005, M.glass, facing, parent);
    const xc = x + facing * 0.05;
    for (let i = 0; i <= cols; i++) { const z = z0 + (i * (z1 - z0)) / cols; boxMM(xc - 0.05, xc + 0.05, y0, y1, z - bar / 2, z + bar / 2, M.black, parent); }
    for (let j = 0; j <= rows; j++) { const y = y0 + (j * (y1 - y0)) / rows; boxMM(xc - 0.05, xc + 0.05, y - bar / 2, y + bar / 2, z0, z1, M.black, parent); }
  }
  const toShape = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const toPath = (pts) => new THREE.Path(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  function prismXY(pts, z0, z1, mat, holes = [], parent) { // многоугольник в плоскости XY, вытянут по Z
    const shape = toShape(pts);
    holes.forEach((h) => shape.holes.push(toPath(h)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1 });
    geo.translate(0, 0, z0);
    return add(new THREE.Mesh(geo, mat), parent);
  }
  function ground(ptsXZ, y, mat, holesXZ = [], parent) { // горизонтальная поверхность по точкам плана (x, z)
    const shape = toShape(ptsXZ.map(([x, z]) => [x, -z]));
    holesXZ.forEach((h) => shape.holes.push(toPath(h.map(([x, z]) => [x, -z]))));
    const geo = new THREE.ShapeGeometry(shape, 24);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.userData.noCast = true;
    return add(m, parent);
  }
  const rectXZ = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  function ribbon(ptsXZ, y0, y1, mat, parent) { // вертикальная лента вдоль замкнутого контура
    const pos = [];
    for (let i = 0; i < ptsXZ.length; i++) {
      const [ax, az] = ptsXZ[i];
      const [bx, bz] = ptsXZ[(i + 1) % ptsXZ.length];
      pos.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat.clone());
    m.material.side = THREE.DoubleSide;
    return add(m, parent);
  }
  function offsetConvex(pts, d) { // сдвиг выпуклого многоугольника (против часовой) внутрь на d
    const n = pts.length;
    const lines = pts.map((a, i) => {
      const b = pts[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      const nx = -dy / len, ny = dx / len;
      return [[a[0] + nx * d, a[1] + ny * d], [b[0] + nx * d, b[1] + ny * d]];
    });
    return lines.map((l1, i) => {
      const l0 = lines[(i - 1 + n) % n];
      return intersect(l0[0], l0[1], l1[0], l1[1]);
    });
  }
  function intersect(p1, p2, p3, p4) {
    const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]);
    const t = ((p1[0] - p3[0]) * (p3[1] - p4[1]) - (p1[1] - p3[1]) * (p3[0] - p4[0])) / d;
    return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
  }
  function clipX(pts, xs, keepGreater) { // отсечение многоугольника вертикальной прямой x = xs
    const inside = (p) => (keepGreater ? p[0] >= xs : p[0] <= xs);
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if (inside(a)) out.push(a);
      if (inside(a) !== inside(b)) {
        const t = (xs - a[0]) / (b[0] - a[0]);
        out.push([xs, a[1] + t * (b[1] - a[1])]);
      }
    }
    return out;
  }
  function latticeHoles(quad, cols, rows, inset) { // треугольные проёмы декоративной решётки внутри четырёхугольника
    const [q0, q1, q2, q3] = quad;
    const P = (u, v) => [
      (1 - u) * (1 - v) * q0[0] + u * (1 - v) * q1[0] + u * v * q2[0] + (1 - u) * v * q3[0],
      (1 - u) * (1 - v) * q0[1] + u * (1 - v) * q1[1] + u * v * q2[1] + (1 - u) * v * q3[1]
    ];
    const jitter = [0.12, -0.1, 0.07, -0.13, 0.1, -0.06, 0.09, -0.11];
    const grid = [];
    for (let j = 0; j <= rows; j++) {
      grid.push([]);
      for (let i = 0; i <= cols; i++) {
        const edge = i === 0 || j === 0 || i === cols || j === rows;
        const k = (i * 3 + j * 5) % jitter.length;
        grid[j].push(P(i / cols + (edge ? 0 : jitter[k] / cols), j / rows + (edge ? 0 : jitter[(k + 3) % jitter.length] / rows)));
      }
    }
    const holes = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], d = grid[j + 1][i];
      const tris = (i + j) % 2 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
      for (const t of tris) {
        const la = Math.hypot(t[1][0] - t[2][0], t[1][1] - t[2][1]);
        const lb = Math.hypot(t[0][0] - t[2][0], t[0][1] - t[2][1]);
        const lc = Math.hypot(t[0][0] - t[1][0], t[0][1] - t[1][1]);
        const per = la + lb + lc;
        const ix = (la * t[0][0] + lb * t[1][0] + lc * t[2][0]) / per;
        const iy = (la * t[0][1] + lb * t[1][1] + lc * t[2][1]) / per;
        const s = per / 2;
        const area = Math.sqrt(Math.max(0, s * (s - la) * (s - lb) * (s - lc)));
        const r = area / s;
        if (r - inset < 0.08) continue;
        const k = (r - inset) / r;
        holes.push(t.map((p) => [ix + (p[0] - ix) * k, iy + (p[1] - iy) * k]));
      }
    }
    return holes;
  }
  // Пакет: детали одного материала сливаются в одну сетку (меньше вызовов отрисовки). Развёртка — по мировым
  // координатам в метрах, поэтому плитка и шпон ложатся в одном масштабе на все поверхности.
  function makeBatch() {
    const groups = new Map();
    const put = (geo, mat) => {
      if (!groups.has(mat)) groups.set(mat, []);
      groups.get(mat).push(geo.index ? geo.toNonIndexed() : geo);
    };
    return {
      geo: put,
      box(x0, x1, y0, y1, z0, z1, mat) {
        if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
        const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
        g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        put(g, mat);
      },
      boxSplit(x0, x1, y0, y1, z0, z1, mat, innerMat, axis, sign) { // грань, смотрящая внутрь дома (axis, sign), — отделкой
        if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
        const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).toNonIndexed();
        g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        const k = axis === 'x' ? 0 : 2, p = g.attributes.position.array, q = g.attributes.normal.array;
        const parts = [[[], []], [[], []]];
        for (let i = 0; i < p.length; i += 9) {
          const part = parts[q[i + k] * sign > 0.5 ? 1 : 0];
          for (let j = 0; j < 9; j++) { part[0].push(p[i + j]); part[1].push(q[i + j]); }
        }
        parts.forEach(([pos, nor], j) => {
          if (!pos.length) return;
          const h = new THREE.BufferGeometry();
          h.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          h.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
          put(h, j ? innerMat : mat);
        });
        g.dispose();
      },
      flush(parent) {
        for (const [mat, list] of groups) {
          let n = 0;
          for (const g of list) n += g.attributes.position.count;
          const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
          let o = 0;
          for (const g of list) {
            const p = g.attributes.position.array, q = g.attributes.normal.array, c = g.attributes.position.count;
            pos.set(p, o * 3);
            nor.set(q, o * 3);
            if (mat.userData.keepUV) uv.set(g.attributes.uv.array, o * 2);
            else for (let i = 0; i < c; i++) {
              const ax = Math.abs(q[i * 3]), ay = Math.abs(q[i * 3 + 1]), az = Math.abs(q[i * 3 + 2]);
              const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
              uv[(o + i) * 2] = ay >= ax && ay >= az ? x : ax >= az ? z : x;
              uv[(o + i) * 2 + 1] = ay >= ax && ay >= az ? z : y;
            }
            o += c;
            g.dispose();
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
          geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
          const mesh = new THREE.Mesh(geo, mat);
          if (mat.userData.noCast) mesh.userData.noCast = true;
          parent.add(mesh);
        }
        groups.clear();
      }
    };
  }
  // Стена с проёмами: along 'x' — стена вдоль X (толщина t0..t1 по Z), 'z' — вдоль Z (толщина по X);
  // holes — [a0, a1, y0, y1] вдоль стены. Стена режется на прямоугольники вокруг проёмов.
  // inner — [материал, знак]: грань, смотрящая внутрь дома (по оси толщины в сторону знака), получает отделку.
  function wall(batch, along, a0, a1, y0, y1, t0, t1, holes, mat, inner = null) {
    const cut = (vals, lo, hi) => [...new Set(vals)].filter((v) => v >= lo && v <= hi).sort((p, q) => p - q);
    const ua = cut([a0, a1, ...holes.flatMap((h) => [h[0], h[1]])], a0, a1);
    const uy = cut([y0, y1, ...holes.flatMap((h) => [h[2], h[3]])], y0, y1);
    for (let j = 0; j < uy.length - 1; j++) {
      const yc = (uy[j] + uy[j + 1]) / 2;
      let start = null;
      for (let i = 0; i < ua.length; i++) {
        const ac = i < ua.length - 1 ? (ua[i] + ua[i + 1]) / 2 : null;
        const solid = ac !== null && !holes.some(([h0, h1, hy0, hy1]) => ac > h0 && ac < h1 && yc > hy0 && yc < hy1);
        if (solid && start === null) start = ua[i];
        if (!solid && start !== null) {
          const b = along === 'x' ? [start, ua[i], uy[j], uy[j + 1], t0, t1] : [t0, t1, uy[j], uy[j + 1], start, ua[i]];
          if (inner) batch.boxSplit(...b, mat, inner[0], along === 'x' ? 'z' : 'x', inner[1]);
          else batch.box(...b, mat);
          start = null;
        }
      }
    }
  }

  // ---------- размеры ----------
  const PODIUM = 0.9;      // первый этаж выше земли (5 ступеней у входа)
  const WING_FRONT = 6.6;  // лицевая плоскость рамы крыла (к улице)
  const WING_BACK = -7.6;  // задняя плоскость рамы крыла (к бассейну)
  const CORE = { x: 4.0, front: 4.6, back: -6.0, top: 9.7 };
  const F0 = PODIUM, F1 = 5.3;          // чистый пол 1-го и 2-го этажей
  const CG = 4.6, CGB = 4.25, C1 = 8.45; // потолки: залы 1-го этажа, комнаты 1-го этажа, комнаты 2-го этажа
  const CC = CORE.top - 0.5;             // потолок холла со вторым светом
  const IN = CORE.x - 0.25;              // внутренняя грань боковых стен холла
  // проёмы в стене между холлом и крыльями: проход в зал, дверь в коридор, дверь на втором этаже
  const SIDE_HOLES = [[-5.4, -2.4, F0, 3.9], [1.5, 2.6, F0, 3.2], [-0.6, 0.6, F1, F1 + 2.4]];

  // ---------- подиум, крыльцо ----------
  boxMM(-12.6, 12.6, 0, PODIUM, -7.7, 6.7, M.stone);
  for (let i = 0; i < 5; i++) boxMM(-2.3, 2.3, 0, PODIUM - i * 0.18, 6.7, 6.7 + (i + 1) * 0.35, M.stone);

  // ---------- центральный объём: холл со вторым светом и лестницей ----------
  const core = new THREE.Group();
  add(core);
  const coreShell = makeBatch();
  wall(coreShell, 'x', -CORE.x, CORE.x, PODIUM, CORE.top - 0.45, CORE.front - 0.25, CORE.front,
    [[-1.7, 1.7, PODIUM, 4.0], [-1.7, 1.7, 4.05, 4.95], [-3.6, 3.6, 5.2, CORE.top - 0.55]], M.white, [MI.wall, -1]);
  wall(coreShell, 'x', -CORE.x, CORE.x, PODIUM, CORE.top - 0.45, CORE.back, CORE.back + 0.25, [[-3.6, 3.6, PODIUM + 0.05, CORE.top - 0.55]], M.white, [MI.wall, 1]);
  wall(coreShell, 'z', CORE.back, CORE.front, PODIUM, CORE.top - 0.45, IN, CORE.x, SIDE_HOLES, M.white, [MI.wall, -1]);
  wall(coreShell, 'z', CORE.back, CORE.front, PODIUM, CORE.top - 0.45, -CORE.x, -IN, SIDE_HOLES, M.white, [MI.wall, 1]);
  coreShell.box(-CORE.x, CORE.x, CORE.top - 0.45, CORE.top, CORE.back, CORE.front, M.white);
  coreShell.flush(core);
  boxMM(-CORE.x - 0.1, CORE.x + 0.1, CORE.top - 0.45, CORE.top + 0.05, CORE.back - 0.1, CORE.front + 0.1, M.frame, core);
  gridZ(-3.6, 3.6, 5.2, CORE.top - 0.55, CORE.front, 5, 2, 1, core);          // стекло второго света над входом
  gridZ(-1.7, 1.7, 4.05, 4.95, CORE.front, 3, 1, 1, core);                     // фрамуга
  gridZ(-1.7, -0.9, PODIUM, 4.0, CORE.front, 1, 2, 1, core);
  gridZ(0.9, 1.7, PODIUM, 4.0, CORE.front, 1, 2, 1, core);
  gridZ(-3.6, 3.6, PODIUM + 0.05, CORE.top - 0.55, CORE.back, 5, 3, -1, core);  // витраж холла к бассейну
  // поворотная входная дверь: ось в 0,4 м от левого края, при пролёте открывается внутрь
  const entryDoor = new THREE.Group();
  entryDoor.position.set(-0.45, 0, CORE.front + 0.04);
  core.add(entryDoor);
  boxMM(-0.4, 1.3, PODIUM, 4.0, -0.04, 0.04, M.door, entryDoor);
  for (const z of [0.04, -0.1]) boxMM(0.41, 0.49, 2.2, 2.9, z, z + 0.06, M.frame, entryDoor); // ручки-штанги
  entryDoor.userData.openAngle = 1.45;

  // ---------- крылья (правое строится, левое — зеркально) ----------
  const wing = new THREE.Group();
  const wingShell = makeBatch();
  // разрез рамы: дно 4,85 м, крыша поднимается к краю, торец наклонён наружу («бабочка»)
  const outer = [[CORE.x, 4.85], [13.0, 4.85], [15.0, 10.2], [CORE.x, 8.95]];
  const inner = offsetConvex(outer, 0.45);
  const [, J, K, L] = inner;
  const roofAt = (x) => L[1] + (x - L[0]) * (K[1] - L[1]) / (K[0] - L[0]);
  // рама без левой стенки (её строим отдельно, с дверью с галереи холла)
  prismXY([...outer, [CORE.x, roofAt(CORE.x)], K, J, [CORE.x, F1]], WING_BACK, WING_FRONT, M.frame, [], wing);
  wall(wingShell, 'z', WING_BACK, WING_FRONT, F1, L[1], CORE.x, CORE.x + 0.45, [SIDE_HOLES[2]], M.frame, [MI.wall, 1]);
  const LATTICE_X = 11.0;
  const latticeZone = clipX(inner, LATTICE_X, true);
  const wallZone = clipX(inner, LATTICE_X, false);
  const glassBack = M.glass.clone();
  glassBack.side = THREE.BackSide; // стекло лоджии со стороны бассейна тоже смотрит наружу
  const whiteBack = M.white.clone();
  whiteBack.side = THREE.BackSide;
  const liningBack = MI.wall.clone();
  liningBack.side = THREE.BackSide;
  for (const side of [1, -1]) {
    const face = side > 0 ? WING_FRONT : WING_BACK;
    const back = face - side * 1.0;             // утопленная стена второго этажа
    const win = side > 0 ? [5.3, 10.5, 5.75, 8.35] : [4.6, 10.6, 5.6, 8.5];
    const wallGeo = new THREE.ShapeGeometry((() => {
      const s = toShape(wallZone);
      s.holes.push(toPath([[win[0], win[2]], [win[1], win[2]], [win[1], win[3]], [win[0], win[3]]]));
      return s;
    })());
    for (const mat of side > 0 ? [M.white, liningBack] : [whiteBack, MI.wall]) { // грань +Z смотрит на улицу у фасада и в дом у бассейна
      const wallMesh = new THREE.Mesh(wallGeo, mat);
      wallMesh.position.z = back;
      wing.add(wallMesh);
    }
    gridZ(win[0], win[1], win[2], win[3], back, side > 0 ? 4 : 5, 2, side, wing);
    // за решёткой — стеклянная стена лоджии
    const glassBehind = new THREE.Mesh(new THREE.ShapeGeometry(toShape(latticeZone)), side > 0 ? M.glass : glassBack);
    glassBehind.position.z = back - side * 0.01;
    wing.add(glassBehind);
    // декоративная решётка с треугольными проёмами почти в плоскости рамы
    const holes = latticeHoles(latticeZone, 3, 3, 0.13);
    const z0 = side > 0 ? face - 0.32 : face + 0.1;
    prismXY(latticeZone, z0, z0 + 0.22, M.frame, holes, wing);
  }
  // первый этаж крыла: наружные стены с проёмами окон (внутри — комнаты)
  const NARROW = [5.0, 6.2, 7.4];
  const END_WIN = [-3.6, 0.3];
  wall(wingShell, 'x', CORE.x, 12.0, PODIUM, 4.85, 5.75, 6.0, [...NARROW.map((x) => [x, x + 0.7, 1.35, 4.35]), [8.8, 11.2, 1.35, 4.35]], M.white, [MI.wall, -1]);
  wall(wingShell, 'x', CORE.x, 12.0, PODIUM, 4.85, -7.0, -6.75, [[4.4, 11.6, PODIUM + 0.05, 4.6]], M.white, [MI.wall, 1]);
  wall(wingShell, 'z', -7.0, 6.0, PODIUM, 4.85, 11.75, 12.0, [[END_WIN[0], END_WIN[1], 1.4, 4.2]], M.white, [MI.wall, -1]);
  wall(wingShell, 'z', -7.0, 6.0, PODIUM, 4.85, CORE.x, CORE.x + 0.25, SIDE_HOLES.slice(0, 2), M.white, [MI.wall, 1]);
  wingShell.flush(wing);
  // к улице: узкие высокие окна и окно спальни
  for (const x of NARROW) gridZ(x, x + 0.7, 1.35, 4.35, 6.0, 1, 2, 1, wing);
  gridZ(8.8, 11.2, 1.35, 4.35, 6.0, 2, 2, 1, wing);
  // к бассейну: витраж зала с колоннами
  gridZ(4.4, 11.6, PODIUM + 0.05, 4.6, -7.0, 4, 1, -1, wing);
  for (const x of [4.25, 7.9, 11.75]) boxMM(x - 0.25, x + 0.25, PODIUM, 4.85, -7.35, -6.85, M.white, wing);
  // торец
  gridX(END_WIN[0], END_WIN[1], 1.4, 4.2, 12.0, 2, 1, 1, wing);
  add(wing);
  const leftWing = wing.clone();
  leftWing.scale.x = -1;
  add(leftWing);

  // ---------- задний двор: бассейн, настил, газон, детская площадка ----------
  const poolShape = new THREE.Shape();
  poolShape.moveTo(-4.6, 8.15);
  poolShape.lineTo(9.6, 8.15);
  poolShape.splineThru([new THREE.Vector2(9.1, 10.2), new THREE.Vector2(7.0, 12.0), new THREE.Vector2(3.0, 12.9), new THREE.Vector2(-1.2, 12.5), new THREE.Vector2(-3.9, 10.8), new THREE.Vector2(-4.6, 8.15)]);
  const poolPts = poolShape.getPoints(48).map((p) => [p.x, -p.y]); // в план (x, z)
  // контур с бортом 0,45 м: смещаем точки наружу от центра бассейна
  const cx = poolPts.reduce((s, p) => s + p[0], 0) / poolPts.length;
  const cz = poolPts.reduce((s, p) => s + p[1], 0) / poolPts.length;
  const copingPts = poolPts.map(([x, z]) => {
    if (Math.abs(z + 8.15) < 0.01) return [x + Math.sign(x - cx) * 0.45, -7.85];
    const dx = x - cx, dz = (z - cz) * 1.8, len = Math.hypot(dx, dz) || 1;
    return [x + (dx / len) * 0.45, z + (dz / len) * 0.45];
  });
  ground([[-16.8, -16.3], [16.8, -16.3], [16.8, -7.7], [-16.8, -7.7]], 0.03, M.tiles, [copingPts]);
  ground(copingPts, 0.05, M.coping, [poolPts]);
  ground(poolPts, -0.005, M.water);                                         // чуть выше земли-подложки
  ribbon(poolPts, -0.006, 0.05, M.poolWall);
  ground(rectXZ(-16.6, -6.4, -16.1, -10.6), 0.06, M.grass);              // газон с детской площадкой
  ground(rectXZ(10.4, 16.6, -11.6, -7.9), 0.06, M.grass);
  // душ у бассейна
  boxMM(10.05, 10.15, 0, 2.3, -8.65, -8.55, M.lamp);
  boxMM(10.1, 10.6, 2.25, 2.32, -8.65, -8.55, M.lamp);
  // детская площадка: качели и горка
  const play = new THREE.Group();
  for (const x of [-15.2, -12.2]) {
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.55, 8), M.play);
      leg.position.set(x, 1.2, -13.6 + s * 0.45);
      leg.rotation.x = s * 0.36;
      play.add(leg);
    }
  }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.3, 8), M.play);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(-13.7, 2.38, -13.6);
  play.add(beam);
  for (const x of [-14.4, -13.0]) {
    boxMM(x - 0.25, x + 0.25, 0.55, 0.6, -13.75, -13.45, M.black, play);
    for (const dx of [-0.2, 0.2]) boxMM(x + dx - 0.01, x + dx + 0.01, 0.6, 2.35, -13.61, -13.59, M.black, play);
  }
  boxMM(-11.9, -11.0, 1.35, 1.45, -14.2, -13.0, M.play, play);           // площадка горки
  const slide = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.6), M.slide);
  slide.position.set(-9.95, 0.75, -13.6);
  slide.rotation.z = -0.55;
  play.add(slide);
  add(play);

  // ---------- двор у дома: боковые проходы, пальмы, пристройка ----------
  ground(rectXZ(12.6, 16.8, -7.7, 6.7), 0.03, M.tiles);
  ground(rectXZ(-16.8, -12.6, -7.7, 6.7), 0.03, M.tiles);
  ground(rectXZ(15.3, 16.75, -7.6, 6.6), 0.05, M.sand);
  const frondGeo = (() => { // лист: заострённая лопасть, прогнутая вниз к концу
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.22, 0.45, 0.02, 1);
    shape.quadraticCurveTo(-0.22, 0.45, 0, 0);
    const geo = new THREE.ShapeGeometry(shape, 6);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setZ(i, -0.55 * y * y); }
    geo.computeVertexNormals();
    geo.rotateX(-Math.PI / 2);
    return geo;
  })();
  function palm(x, z, h, lean = 0.06, parent = root) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, h, 8), M.trunk);
    trunk.position.y = h / 2;
    g.add(trunk);
    const n = 18, size = Math.min(2.4, 1.0 + h * 0.25);
    for (let i = 0; i < n; i++) {
      const frond = new THREE.Mesh(frondGeo, i % 4 === 3 ? M.frondDry : M.frond);
      const a = (i / n) * Math.PI * 2 + (i % 2) * 0.17;
      frond.scale.setScalar(size * (0.85 + (i % 3) * 0.1));
      frond.position.set(0, h, 0);
      frond.rotation.set(0, a, 0, 'YXZ');
      frond.rotateX(-0.55 + (i % 3) * 0.35);
      g.add(frond);
    }
    g.position.set(x, 0, z);
    g.rotation.z = lean;
    return add(g, parent);
  }
  for (const z of [-5.5, -1.0, 3.5]) palm(16.0, z, 5.2 + (z > 0 ? 0.6 : 0));
  for (const [x, z] of [[15.9, -6.8], [15.6, 1.2], [15.9, 5.8]]) {
    const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), M.shrub);
    shrub.scale.y = 0.7;
    shrub.position.set(x, 0.25, z);
    add(shrub);
  }
  boxMM(12.2, 16.6, 0, 3.3, -16.25, -12.5, M.white);                      // водительская / летняя кухня
  boxMM(12.1, 16.7, 3.3, 3.45, -16.35, -12.4, M.frame);
  boxMM(13.2, 14.2, 0, 2.4, -12.5, -12.44, M.door);
  palm(2.9, 5.6, 4.6, 0.04);                                               // пальма в кашпо у входа
  boxMM(2.3, 3.5, PODIUM, PODIUM + 0.55, 5.0, 6.2, M.door);

  // ---------- передний двор и ограда с ламелями ----------
  ground(rectXZ(-16.8, 16.8, 6.7, 16.3), 0.03, M.pavers);
  ground(rectXZ(-2.3, 2.3, 8.45, 16.3), 0.04, M.tiles);
  // машины для масштаба: 5 мест внутри и 5 снаружи по объявлению
  function car(x, z, rot, color) {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.35 });
    boxMM(-2.35, 2.35, 0.32, 1.05, -0.93, 0.93, body, g);
    boxMM(-1.25, 1.05, 1.05, 1.62, -0.84, 0.84, M.glass, g);
    boxMM(-1.0, 0.9, 1.6, 1.66, -0.8, 0.8, body, g);
    for (const wx of [-1.5, 1.5]) for (const wz of [-0.86, 0.86]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.26, 14), M.tyre);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.37, wz);
      g.add(wheel);
    }
    g.position.set(x, 0.03, z);
    g.rotation.y = rot;
    return add(g);
  }
  car(-9.3, 11.6, Math.PI / 2, 0xf2f2f0);
  car(9.1, 11.4, Math.PI / 2, 0x202326);
  car(-3.9, 21.8, Math.PI / 2, 0xb7bcc2);
  const H = 2.65;
  function fence(axis, a0, a1, at, gates) { // ограда: белое основание 0,9 м, столбы, чёрные ламели; gates — проёмы до земли
    const segs = [];
    let cur = a0;
    for (const [g0, g1] of gates) { segs.push([cur, g0, false]); segs.push([g0, g1, true]); cur = g1; }
    segs.push([cur, a1, false]);
    for (const [s0, s1, gate] of segs) {
      if (s1 - s0 < 0.05) continue;
      const pieces = gate ? 1 : Math.max(1, Math.round((s1 - s0) / 4.5));
      for (let k = 0; k < pieces; k++) {
        const p0 = s0 + ((s1 - s0) * k) / pieces, p1 = s0 + ((s1 - s0) * (k + 1)) / pieces;
        const yb = gate ? 0 : 0.9;
        if (axis === 'x') {
          if (!gate) boxMM(p0, p1, 0, 0.9, at - 0.17, at + 0.17, M.white);
          const panel = boxMM(p0 + 0.25, p1 - 0.25, yb, H - 0.15, at - 0.06, at + 0.06, M.slats);
          panel.material = M.slats.clone();
          panel.material.map = M.slats.map.clone();
          panel.material.map.repeat.set((p1 - p0) / 0.8, 1);
          panel.material.map.needsUpdate = true;
          boxMM(p0 - 0.28, p0 + 0.28, 0, H, at - 0.28, at + 0.28, M.frame);
        } else {
          if (!gate) boxMM(at - 0.17, at + 0.17, 0, 0.9, p0, p1, M.white);
          const panel = boxMM(at - 0.06, at + 0.06, yb, H - 0.15, p0 + 0.25, p1 - 0.25, M.slats);
          panel.material = M.slats.clone();
          panel.material.map = M.slats.map.clone();
          panel.material.map.repeat.set((p1 - p0) / 0.8, 1);
          panel.material.map.needsUpdate = true;
          boxMM(at - 0.28, at + 0.28, 0, H, p0 - 0.28, p0 + 0.28, M.frame);
        }
      }
    }
    if (axis === 'x') boxMM(a1 - 0.28, a1 + 0.28, 0, H, at - 0.28, at + 0.28, M.frame);
    else boxMM(at - 0.28, at + 0.28, 0, H, a1 - 0.28, a1 + 0.28, M.frame);
  }
  fence('x', -16.8, 16.8, 16.5, [[-12.0, -6.6], [-2.0, -0.7], [6.6, 11.6]]); // главная улица: два въезда и калитка
  fence('z', -16.5, 16.5, 16.8, []);                                       // боковая улица (угловой участок)
  boxMM(-17.0, -16.6, 0, 3.0, -16.5, 16.5, M.white);                       // глухие стены к соседям
  boxMM(-17.0, 16.6, 0, 3.0, -16.75, -16.35, M.white);

  // ---------- улицы ----------
  ground(rectXZ(-90, 28, 19.2, 33), 0.01, M.asphalt);
  ground(rectXZ(19.6, 28, -90, 33), 0.012, M.asphalt);
  boxMM(-90, 19.6, 0, 0.14, 16.75, 19.2, M.concrete);                     // тротуары
  boxMM(17.05, 19.6, 0, 0.14, -90, 16.75, M.concrete);
  ground(rectXZ(-9.4, 4.4, 19.2, 24.4), 0.03, M.pavers);                    // 5 мест снаружи
  for (let i = 0; i <= 5; i++) boxMM(-9.4 + i * 2.76 - 0.06, -9.4 + i * 2.76 + 0.06, 0.03, 0.045, 19.3, 24.3, M.paint);
  for (let x = -86; x < 18; x += 6) boxMM(x, x + 3, 0.012, 0.022, 28.15, 28.3, M.paint);
  for (let z = -86; z < 18; z += 6) boxMM(23.7, 23.85, 0.014, 0.024, z, z + 3, M.paint);
  ground(rectXZ(5.2, 7.4, 17.2, 18.8), 0.15, M.sand);
  ground(rectXZ(10.2, 12.4, 17.2, 18.8), 0.15, M.sand);
  palm(6.3, 18.0, 1.4, 0.02);
  palm(11.3, 18.0, 1.4, 0.02);
  function lamp(x, z, rot) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 8, 8), M.lamp);
    pole.position.y = 4;
    g.add(pole);
    boxMM(-0.05, 1.4, 7.85, 7.95, -0.05, 0.05, M.lamp, g);
    boxMM(1.1, 1.6, 7.75, 7.9, -0.15, 0.15, M.lamp, g);
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    return add(g);
  }
  for (const x of [-38, -20, -4, 12]) lamp(x, 18.8, -Math.PI / 2);
  for (const z of [-40, -22, -4]) lamp(19.1, z, 0);

  // ---------- соседи и дальние дома (для масштаба) ----------
  boxMM(-44, -21, 0, 8.2, -12, 9, M.neighbor);
  boxMM(-44.4, -20.6, 8.2, 9.0, -12.4, 9.4, M.neighbor);
  boxMM(-6, 16, 0, 7.6, -50, -33, M.neighbor);
  boxMM(-3, 12, 4.0, 6.8, -32.95, -32.9, M.neighborDark);
  boxMM(36, 58, 0, 7.5, -30, -6, M.neighbor);
  boxMM(-70, -50, 0, 9.0, 40, 60, M.neighbor);
  boxMM(40, 66, 0, 11, 44, 70, M.neighbor);

  // =====================================================================================================
  // ---------- интерьер ----------
  // Комнаты — по списку объявления: 1-й этаж — входной холл со вторым светом и П-образной лестницей, большая гостиная,
  // столовая, гостевая спальня с санузлом, комната прислуги, прачечная и кладовая; 2-й этаж — галереи, малая гостиная
  // с пантри, 4 спальни с санузлами и кабинет. Кухня — в отдельной пристройке во дворе.
  const interior = new THREE.Group();
  interior.name = 'interior';
  add(interior);
  const ib = makeBatch();
  const VX = 2.3, VZ = -2.0;              // проём второго света: |x| < VX, z > VZ
  const W1 = CORE.x + 0.45;               // внутренняя грань рамы крыла на 2-м этаже
  const LZ = 10.95;                       // начало зоны за решёткой (санузлы, кабинет)
  const slantX = (y) => J[0] + (y - J[1]) * (K[0] - J[0]) / (K[1] - J[1]); // наклонный торец крыла
  const SX = slantX(F1);                  // торец на уровне пола 2-го этажа
  const sx = (s, a, b) => (s > 0 ? [a, b] : [-b, -a]);
  const floorAt = (x0, x1, z0, z1, y, mat = MI.floor) => ib.box(x0, x1, y, y + 0.012, z0, z1, mat);

  function downlights(x0, x1, z0, z1, y, step = 1.7) {
    const nx = Math.max(1, Math.round((x1 - x0) / step)), nz = Math.max(1, Math.round((z1 - z0) / step));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const g = new THREE.CircleGeometry(0.055, 12);
      g.rotateX(Math.PI / 2);
      g.translate(x0 + (i + 0.5) * (x1 - x0) / nx, y - 0.003, z0 + (j + 0.5) * (z1 - z0) / nz);
      ib.geo(g, MI.downlight);
    }
  }
  // потолок; tray — ниша глубиной 0,2 м с отступом tray от стен и светодиодной подсветкой по периметру
  function ceiling(x0, x1, z0, z1, y, tray = 0) {
    if (!tray) {
      ib.box(x0, x1, y, y + 0.04, z0, z1, MI.ceiling);
      downlights(x0 + 0.3, x1 - 0.3, z0 + 0.3, z1 - 0.3, y);
      return;
    }
    const d = tray, ty = y + 0.2;
    ib.box(x0, x1, y, y + 0.04, z0, z0 + d, MI.ceiling);
    ib.box(x0, x1, y, y + 0.04, z1 - d, z1, MI.ceiling);
    ib.box(x0, x0 + d, y, y + 0.04, z0 + d, z1 - d, MI.ceiling);
    ib.box(x1 - d, x1, y, y + 0.04, z0 + d, z1 - d, MI.ceiling);
    ib.box(x0 + d, x1 - d, ty, ty + 0.04, z0 + d, z1 - d, MI.ceiling);
    for (const [a, b, c, e] of [[x0 + d, x1 - d, z0 + d, z0 + d + 0.03], [x0 + d, x1 - d, z1 - d - 0.03, z1 - d], [x0 + d, x0 + d + 0.03, z0 + d, z1 - d], [x1 - d - 0.03, x1 - d, z0 + d, z1 - d]]) {
      ib.box(a, b, y + 0.04, ty, c, e, MI.ceiling);
    }
    const g = 0.09;
    for (const [a, b, c, e] of [[x0 + d - g, x1 - d + g, z0 + d - g, z0 + d - g + 0.03], [x0 + d - g, x1 - d + g, z1 - d + g - 0.03, z1 - d + g], [x0 + d - g, x0 + d - g + 0.03, z0 + d - g, z1 - d + g], [x1 - d + g - 0.03, x1 - d + g, z0 + d - g, z1 - d + g]]) {
      ib.box(a, b, y + 0.05, y + 0.07, c, e, MI.led);
    }
    downlights(x0 + d / 2 - 0.3, x1 - d / 2 + 0.3, z0 + d / 2 - 0.3, z0 + d / 2 + 0.3, y, 1.9);
    downlights(x0 + d / 2 - 0.3, x1 - d / 2 + 0.3, z1 - d / 2 - 0.3, z1 - d / 2 + 0.3, y, 1.9);
  }
  // линейная щель кондиционера на потолке
  const slot = (x0, x1, z0, z1, y) => ib.box(x0, x1, y - 0.012, y, z0, z1, MI.slot);
  // «у стены»: u — вдоль стены, v — расстояние от стены в комнату (n — куда смотрит грань стены)
  function onWall(along, at, n) {
    return {
      box(u0, u1, y0, y1, v0, v1, mat) {
        const a = at + n * v0, b = at + n * v1;
        const t0 = Math.min(a, b), t1 = Math.max(a, b);
        if (along === 'x') ib.box(u0, u1, y0, y1, t0, t1, mat); else ib.box(t0, t1, y0, y1, u0, u1, mat);
      },
      at(u, v) { return along === 'x' ? [u, at + n * v] : [at + n * v, u]; },
      yaw: along === 'x' ? (n > 0 ? 0 : Math.PI) : (n > 0 ? Math.PI / 2 : -Math.PI / 2),
      long: along
    };
  }
  function sconce(w, u, y) { // настенный светильник «вверх-вниз» с пятнами света на стене
    w.box(u - 0.06, u + 0.06, y - 0.07, y + 0.07, 0, 0.08, M.black);
    for (const dir of [1, -1]) {
      const g = new THREE.PlaneGeometry(0.62, 1.1);
      if (dir < 0) g.rotateZ(Math.PI);
      g.translate(0, dir * 0.55, 0);
      g.rotateY(w.yaw);
      const [x, z] = w.at(u, 0.006);
      g.translate(x, y, z);
      ib.geo(g, MI.wash);
    }
  }
  function placed(geo, w, u, y, v, mat) { // геометрия, повёрнутая лицом в комнату
    geo.rotateY(w.yaw);
    const [x, z] = w.at(u, v);
    geo.translate(x, y, z);
    ib.geo(geo, mat);
  }
  // проём с наличниками и открытой створкой; створка у края hinge (0 — a0, 1 — a1), отклонена в сторону swing (0 — без створки)
  function doorway(along, a0, a1, y0, h, t0, t1, swing, hinge = 0) {
    const w = 0.07, p = 0.015;
    const put = (aa0, aa1, yy0, yy1, tt0, tt1) => (along === 'x' ? ib.box(aa0, aa1, yy0, yy1, tt0, tt1, MI.walnut) : ib.box(tt0, tt1, yy0, yy1, aa0, aa1, MI.walnut));
    for (const [tt0, tt1] of [[t0 - p, t0], [t1, t1 + p]]) {
      put(a0 - w, a0, y0, y0 + h + w, tt0, tt1);
      put(a1, a1 + w, y0, y0 + h + w, tt0, tt1);
      put(a0 - w, a1 + w, y0 + h, y0 + h + w, tt0, tt1);
    }
    put(a0, a0 + 0.02, y0, y0 + h, t0, t1); // коробка
    put(a1 - 0.02, a1, y0, y0 + h, t0, t1);
    put(a0, a1, y0 + h - 0.02, y0 + h, t0, t1);
    if (!swing) return;
    const width = a1 - a0 - 0.05, th = 0.045;
    const ah = hinge === 0 ? a0 + 0.025 : a1 - 0.025 - th;
    const face = swing > 0 ? t1 : t0;
    put(ah, ah + th, y0 + 0.01, y0 + h - 0.03, swing > 0 ? face : face - width, swing > 0 ? face + width : face);
  }
  // перегородка с дверями: doors — [a0, a1, swing, hinge]; mirror s отражает план левого крыла
  function partition(s, along, a0, a1, t0, t1, y0, y1, doors = [], h = 2.4) {
    let A = [a0, a1], T = [t0, t1], D = doors;
    if (s < 0) {
      if (along === 'x') { A = sx(s, a0, a1); D = doors.map(([d0, d1, sw = 1, hi = 0]) => [-d1, -d0, sw, 1 - hi]); }
      else { T = sx(s, t0, t1); D = doors.map(([d0, d1, sw = 1, hi = 0]) => [d0, d1, -sw, hi]); }
    }
    wall(ib, along, A[0], A[1], y0, y1, T[0], T[1], D.map(([d0, d1]) => [d0, d1, y0, y0 + h]), MI.wall);
    for (const [d0, d1, sw = 1, hi = 0] of D) doorway(along, d0, d1, y0, h, T[0], T[1], sw, hi);
  }
  // перегородка в зоне за решёткой: нижняя часть до торца на уровне пола + клин под наклонным торцом
  function slantPartition(s, t0, t1, doors = []) {
    partition(s, 'x', LZ - 0.2, SX, t0, t1, F1, C1, doors);
    const pts = [[SX, F1], [slantX(C1), C1], [SX, C1]].map(([x, y]) => [s * x, y]);
    const g = new THREE.ExtrudeGeometry(toShape(pts), { depth: t1 - t0, bevelEnabled: false });
    g.translate(0, 0, t0);
    ib.geo(g, MI.wall);
  }
  function clad(w, u0, u1, y0, y1) { w.box(u0, u1, y0, y1, 0, 0.015, MI.stoneDark); } // каменная облицовка санузла
  function wardrobe(w, u0, u1, y0, depth = 0.6, h = 2.8) { w.box(u0, u1, y0, y0 + h, 0, depth, MI.oak); }
  function vanity(w, u0, u1, y0, sinks = 1) { // подвесная столешница, раковины-чаши, смеситель, зеркало
    w.box(u0, u1, y0 + 0.62, y0 + 0.8, 0, 0.55, MI.oak);
    w.box(u0, u1, y0 + 0.8, y0 + 0.83, 0, 0.56, MI.stoneLight);
    w.box(u0 + 0.05, u1 - 0.05, y0 + 1.15, y0 + 2.15, 0.015, 0.03, MI.mirror);
    for (let k = 0; k < sinks; k++) {
      const u = u0 + ((k + 0.5) * (u1 - u0)) / sinks;
      placed(new THREE.CylinderGeometry(0.21, 0.15, 0.14, 24), w, u, y0 + 0.9, 0.3, MI.porcelain);
      placed(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 8), w, u, y0 + 1.0, 0.07, MI.chrome);
      w.box(u - 0.015, u + 0.015, y0 + 1.15, y0 + 1.18, 0.07, 0.2, MI.chrome);
    }
  }
  function toilet(w, u, y0) { // подвесной унитаз и клавиша смыва
    const bowl = new THREE.SphereGeometry(0.2, 18, 12);
    bowl.scale(0.95, 0.75, 1.45);
    placed(bowl, w, u, y0 + 0.4, 0.3, MI.porcelain);
    w.box(u - 0.18, u + 0.18, y0 + 0.3, y0 + 0.5, 0, 0.1, MI.porcelain);
    w.box(u - 0.12, u + 0.12, y0 + 1.0, y0 + 1.16, 0, 0.012, MI.chrome);
  }
  function showerHead(w, u, y0) {
    w.box(u - 0.015, u + 0.015, y0 + 2.2, y0 + 2.23, 0, 0.35, MI.chrome);
    placed(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 24), w, u, y0 + 2.2, 0.35, MI.chrome);
    w.box(u - 0.08, u + 0.08, y0 + 1.0, y0 + 1.14, 0, 0.05, MI.chrome);
  }
  function tub(x, z, y0, alongZ) { // отдельностоящая овальная ванна со смесителем
    const outerTub = new THREE.CylinderGeometry(0.4, 0.33, 0.58, 32);
    const top = new THREE.CylinderGeometry(0.35, 0.35, 0.01, 32);
    for (const g of [outerTub, top]) g.scale(alongZ ? 1 : 2.1, 1, alongZ ? 2.1 : 1);
    outerTub.translate(x, y0 + 0.29, z);
    top.translate(x, y0 + 0.555, z);
    ib.geo(outerTub, MI.porcelain);
    ib.geo(top, MI.basin);
    const fx = alongZ ? x + 0.55 : x, fz = alongZ ? z : z + 0.55;
    const filler = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8);
    filler.translate(fx, y0 + 0.5, fz);
    ib.geo(filler, MI.chrome);
  }
  function glassPanel(along, a0, a1, at, y0, h = 2.0) {
    if (along === 'x') ib.box(a0, a1, y0, y0 + h, at - 0.006, at + 0.006, MI.glass);
    else ib.box(at - 0.006, at + 0.006, y0, y0 + h, a0, a1, MI.glass);
  }
  function railing(along, a0, a1, at, y0) { // стеклянное ограждение 1,05 м с чёрным профилем внизу и кромкой сверху
    glassPanel(along, a0, a1, at, y0 + 0.05, 1.0);
    if (along === 'x') {
      ib.box(a0, a1, y0, y0 + 0.07, at - 0.03, at + 0.03, M.black);
      ib.box(a0, a1, y0 + 1.05, y0 + 1.065, at - 0.012, at + 0.012, M.black);
    } else {
      ib.box(at - 0.03, at + 0.03, y0, y0 + 0.07, a0, a1, M.black);
      ib.box(at - 0.012, at + 0.012, y0 + 1.05, y0 + 1.065, a0, a1, M.black);
    }
  }

  // ----- холл: полы, галереи, малая гостиная над холлом у бассейна -----
  floorAt(-IN, IN, CORE.back + 0.25, CORE.front - 0.25, F0);
  ib.box(-IN, IN, CG, F1, CORE.back + 0.25, VZ, MI.ceiling);                 // перекрытие малой гостиной
  floorAt(-IN, IN, CORE.back + 0.25, VZ, F1);
  for (const s of [1, -1]) {
    ib.box(...sx(s, VX, IN), CG, F1, VZ, CORE.front - 0.25, MI.ceiling);    // галереи вдоль второго света
    floorAt(...sx(s, VX, IN), VZ, CORE.front - 0.25, F1);
    downlights(...sx(s, VX + 0.2, IN - 0.2), VZ + 0.4, CORE.front - 0.6, CG, 1.8);
  }
  downlights(-IN + 0.4, IN - 0.4, CORE.back + 0.6, VZ - 0.3, CG, 1.9);
  railing('z', VZ, -0.55, -VX, F1);                                          // проём для выхода с лестницы
  railing('z', 0.75, CORE.front - 0.25, -VX, F1);
  railing('z', VZ, CORE.front - 0.25, VX, F1);
  railing('x', -VX, VX, VZ, F1);
  // потолок второго света с подсветкой по периметру
  ib.box(-IN, IN, CC, CC + 0.05, CORE.back + 0.25, CORE.front - 0.25, MI.ceiling);
  for (const [a, b, c, e] of [[-IN, IN, CORE.back + 0.25, CORE.back + 0.29], [-IN, IN, CORE.front - 0.29, CORE.front - 0.25], [-IN, -IN + 0.04, CORE.back + 0.25, CORE.front - 0.25], [IN - 0.04, IN, CORE.back + 0.25, CORE.front - 0.25]]) {
    ib.box(a, b, CC - 0.03, CC, c, e, MI.led);
  }
  downlights(-IN + 0.5, IN - 0.5, CORE.back + 0.6, CORE.front - 0.6, CC, 2.0);
  slot(-1.2, 1.2, 3.6, 3.72, CC);
  slot(-1.2, 1.2, -5.1, -4.98, CC);
  // бра у входной двери и на стенах холла
  const coreFront = onWall('x', CORE.front - 0.25, -1);
  for (const u of [-2.45, 2.45]) sconce(coreFront, u, F0 + 1.85);
  for (const s of [1, -1]) {
    const side = onWall('z', s * IN, -s);
    sconce(side, 3.5, F0 + 1.85);
    sconce(side, -1.3, F0 + 1.85);
    sconce(side, 2.6, F1 + 1.85);
    if (s > 0) sconce(side, -3.9, F1 + 1.85); // слева у этой стены пантри
    // двери из холла в коридоры крыльев (низ) и с галерей в крылья (верх)
    doorway('z', 1.5, 2.6, F0, 2.3, ...sx(s, IN, CORE.x + 0.25), -s, 1); // створка в холл, коридор свободен
    doorway('z', -0.6, 0.6, F1, 2.4, ...sx(s, IN, W1), 0);                  // проём с галереи без створки
  }
  // пантри на втором этаже: шкафы из дуба, каменная столешница, мойка, стеновая панель
  const pantry = onWall('z', -IN, 1);
  pantry.box(-5.4, -2.6, F1, F1 + 0.86, 0, 0.6, MI.oak);
  pantry.box(-5.4, -2.6, F1 + 0.86, F1 + 0.9, 0, 0.62, MI.stoneLight);
  pantry.box(-4.3, -3.7, F1 + 0.88, F1 + 0.905, 0.15, 0.47, M.black);
  pantry.box(-5.4, -2.6, F1 + 0.9, F1 + 2.2, 0, 0.02, MI.stoneLight);
  pantry.box(-4.02, -3.98, F1 + 0.9, F1 + 1.25, 0.05, 0.09, M.black);
  pantry.box(-4.02, -3.98, F1 + 1.21, F1 + 1.25, 0.09, 0.28, M.black);

  // ----- П-образная лестница: 26 подъёмов по 0,17 м, марши поперёк холла, площадка у правой галереи -----
  const RISE = (F1 - F0) / 26, RUN = 0.26, XS = -2.25, XL = XS + 12 * RUN, T = 0.3;
  const ZA = [-1.95, -0.65], ZB = [-0.55, 0.75];
  const flightA = [[XS, F0]];
  for (let i = 1; i <= 12; i++) flightA.push([XS + (i - 1) * RUN, F0 + i * RISE], [XS + i * RUN, F0 + i * RISE]);
  flightA.push([XL, F0 + 12 * RISE - T], [XS + T * RUN / RISE, F0]);
  const flightB = [[XL, F0 + 13 * RISE - T], [XL, F0 + 13 * RISE]];
  for (let j = 1; j <= 12; j++) flightB.push([XL - (j - 1) * RUN, F0 + (13 + j) * RISE], [XL - j * RUN, F0 + (13 + j) * RISE]);
  flightB.push([XS, F0 + 25 * RISE - T]);
  for (const [pts, [z0, z1]] of [[flightA, ZA], [flightB, ZB]]) {
    const g = new THREE.ExtrudeGeometry(toShape(pts), { depth: z1 - z0, bevelEnabled: false });
    g.translate(0, 0, z0);
    ib.geo(g, MI.wall);
  }
  for (let i = 1; i <= 12; i++) { // каменные проступи и подсвеченные подступёнки
    const a = XS + (i - 1) * RUN, top = F0 + i * RISE;
    ib.box(a - 0.02, a + RUN, top - 0.005, top + 0.025, ZA[0], ZA[1], MI.tread);
    ib.box(a - 0.004, a, top - RISE, top - 0.005, ZA[0] + 0.02, ZA[1] - 0.02, MI.riser);
    const b = XL - i * RUN, topB = F0 + (13 + i) * RISE;
    ib.box(b, b + RUN + 0.02, topB - 0.005, topB + 0.025, ZB[0], ZB[1], MI.tread);
    ib.box(b + RUN, b + RUN + 0.004, topB - RISE, topB - 0.005, ZB[0] + 0.02, ZB[1] - 0.02, MI.riser);
  }
  ib.box(XL, VX - 0.05, F0 + 13 * RISE - T, F0 + 13 * RISE, ZA[0], ZB[1], MI.wall);       // площадка
  ib.box(XL, VX - 0.05, F0 + 13 * RISE, F0 + 13 * RISE + 0.025, ZA[0], ZB[1], MI.tread);
  ib.box(XL - 0.004, XL, F0 + 12 * RISE, F0 + 13 * RISE - 0.005, ZA[0] + 0.02, ZA[1] - 0.02, MI.riser);
  // стеклянные ограждения маршей и площадки
  const sloped = (x0, y0, x1, y1, z) => {
    const g = new THREE.ExtrudeGeometry(toShape([[x0, y0], [x1, y1], [x1, y1 + 1.0], [x0, y0 + 1.0]]), { depth: 0.012, bevelEnabled: false });
    g.translate(0, 0, z);
    ib.geo(g, MI.glass);
  };
  sloped(XS, F0 + RISE - 0.1, XL, F0 + 12 * RISE - 0.1, ZA[0] - 0.02);
  sloped(XL, F0 + 14 * RISE - 0.1, XS, F0 + 25 * RISE - 0.1, ZB[1] + 0.008);
  sloped(XL, F0 + 14 * RISE - 0.1, XS, F0 + 25 * RISE - 0.1, ZB[0] - 0.012);
  const landingTop = F0 + 13 * RISE;
  glassPanel('x', XL, VX - 0.05, ZA[0] - 0.014, landingTop, 1.05);
  glassPanel('x', XL, VX - 0.05, ZB[1] + 0.014, landingTop, 1.05);
  glassPanel('z', ZA[0], ZB[1], VX - 0.04, landingTop, 1.05);

  // ----- крылья, 1-й этаж -----
  for (const s of [1, -1]) {
    const X = (a, b) => sx(s, a, b);
    // зал у бассейна: столовая справа, большая гостиная слева
    floorAt(...X(4.25, 11.75), -6.75, 0.55, F0);
    ceiling(...X(4.25, 11.75), -6.75, 0.55, CG, 1.0);
    slot(...X(5.0, 11.0), -6.2, -6.08, CG);
    const hallWall = onWall('z', s * 4.25, s);
    sconce(hallWall, -1.1, F0 + 1.85);
    sconce(hallWall, -6.1, F0 + 1.85);
    partition(s, 'x', 4.25, 11.75, 0.55, 0.75, F0, 4.85, s > 0 ? [[4.5, 5.6, 1, 0], [9.5, 10.4, 1, 1]] : [[4.5, 5.6, 1, 0]]);
    // коридор от холла к улице
    floorAt(...X(4.25, 5.95), 0.75, 5.75, F0);
    ceiling(...X(4.25, 5.95), 0.75, 5.75, CGB);
  }
  // правое крыло: прачечная и кладовая, санузел и комната прислуги
  partition(1, 'z', 0.75, 5.75, 5.95, 6.1, F0, 4.85, [[1.3, 2.2, 1, 0]]);
  partition(1, 'x', 6.1, 8.45, 2.85, 3.0, F0, 4.85);
  partition(1, 'z', 0.75, 5.75, 8.45, 8.6, F0, 4.85, [[3.6, 4.4, -1, 1]]);
  floorAt(6.1, 8.45, 0.75, 2.85, F0, MI.floorBath);
  ceiling(6.1, 8.45, 0.75, 2.85, CGB);
  const laundry = onWall('z', 8.45, -1);
  for (const [u0, u1] of [[0.95, 1.55], [1.6, 2.2]]) { // стиральная и сушильная машины
    laundry.box(u0, u1, F0, F0 + 0.85, 0, 0.6, MI.porcelain);
    placed(new THREE.CircleGeometry(0.2, 24), laundry, (u0 + u1) / 2, F0 + 0.45, 0.605, M.black);
  }
  wardrobe(onWall('x', 0.75, 1), 6.2, 8.35, F0, 0.5, 2.6);
  floorAt(6.1, 8.45, 3.0, 5.75, F0, MI.floorBath);
  ceiling(6.1, 8.45, 3.0, 5.75, CGB);
  const maidBath = { vanity: onWall('x', 3.0, 1), toilet: onWall('z', 6.1, 1) };
  vanity(maidBath.vanity, 6.4, 7.4, F0);
  toilet(maidBath.toilet, 4.3, F0);
  showerHead(maidBath.toilet, 5.3, F0);
  glassPanel('x', 6.1, 7.3, 4.85, F0);
  clad(maidBath.toilet, 3.0, 5.75, F0, CGB);
  floorAt(8.6, 11.75, 0.75, 5.75, F0, MI.floorRoom);
  ceiling(8.6, 11.75, 0.75, 5.75, CGB);
  wardrobe(onWall('z', 11.75, -1), 1.0, 3.4, F0);
  sconce(onWall('x', 0.75, 1), 11.1, F0 + 1.7);
  // левое крыло: гостевая спальня с санузлом
  partition(-1, 'z', 0.75, 5.75, 5.95, 6.1, F0, 4.85, [[1.2, 2.1, 1, 0]]);
  partition(1, 'x', -8.6, -6.1, 2.85, 3.0, F0, 4.85, [[-7.9, -7.0, -1, 0]]);
  partition(1, 'z', 3.0, 5.75, -8.6, -8.45, F0, 4.85);
  floorAt(-11.75, -6.1, 0.75, 2.85, F0, MI.floorRoom);
  floorAt(-11.75, -8.6, 2.85, 5.75, F0, MI.floorRoom);
  ceiling(-11.75, -6.1, 0.75, 5.75, CGB);
  wardrobe(onWall('z', -11.75, 1), 1.0, 5.4, F0);
  const guestHead = onWall('x', 0.75, 1);
  sconce(guestHead, -10.9, F0 + 1.1);
  sconce(guestHead, -8.3, F0 + 1.1);
  slot(-10.6, -9.0, 5.1, 5.22, CGB);
  floorAt(-8.45, -6.1, 3.0, 5.75, F0, MI.floorBath);
  const guestBath = { vanity: onWall('z', -8.45, 1), toilet: onWall('z', -6.1, -1) };
  vanity(guestBath.vanity, 3.3, 4.6, F0);
  toilet(guestBath.toilet, 3.9, F0);
  showerHead(guestBath.vanity, 5.3, F0);
  glassPanel('x', -8.45, -7.2, 4.85, F0);
  clad(guestBath.vanity, 3.0, 5.75, F0, CGB);
  clad(guestBath.toilet, 3.0, 5.75, F0, CGB);

  // ----- крылья, 2-й этаж -----
  for (const s of [1, -1]) {
    const X = (a, b) => sx(s, a, b);
    ib.box(...X(W1, slantX(C1)), C1, C1 + 0.04, -6.6, 5.6, MI.ceiling);
    const lining = new THREE.ExtrudeGeometry(toShape([[SX - 0.012, F1], [slantX(C1) - 0.012, C1], [slantX(C1) - 0.002, C1], [SX - 0.002, F1]].map(([x, y]) => [s * x, y])), { depth: 12.2, bevelEnabled: false });
    lining.translate(0, 0, -6.6);
    ib.geo(lining, MI.wall); // отделка наклонного торца изнутри
    // коридор от галереи вдоль крыла, по бокам — спальни
    floorAt(...X(W1, SX), -0.7, 0.7, F1);
    downlights(...X(W1 + 0.4, SX - 0.4), -0.3, 0.3, C1, 2.0);
    partition(s, 'x', W1, LZ - 0.2, -0.85, -0.7, F1, C1, [[4.9, 5.9, -1, 0]]);
    partition(s, 'x', W1, LZ - 0.2, 0.7, 0.85, F1, C1, s > 0 ? [[4.9, 5.9, 1, 0]] : [[4.9, 5.9, 1, 0]]);
    slantPartition(s, -0.85, -0.7);
    slantPartition(s, 0.7, 0.85, s > 0 ? [[11.1, 12.0, 1, 1]] : []);
    partition(s, 'z', -6.6, -0.85, 10.75, LZ, F1, C1, [[-4.25, -3.35, -1, 0]]);
    partition(s, 'z', 0.85, 5.6, 10.75, LZ, F1, C1, s > 0 ? [] : [[3.35, 4.25, -1, 1]]);
    // спальня у бассейна (справа — хозяйская, 36 м²) и спальня к улице
    floorAt(...X(W1, 10.75), -6.6, -0.85, F1, MI.floorRoom);
    downlights(...X(W1 + 0.6, 10.15), -6.0, -1.5, C1);
    ib.box(...X(4.7, 10.5), C1 - 0.03, C1, -6.5, -6.46, MI.led);              // подсветка карниза у окна
    slot(...X(5.4, 9.6), -6.1, -5.98, C1);
    wardrobe(onWall('x', -0.85, -1), ...X(6.2, 10.6), F1);
    const headBack = onWall('z', s * W1, s);
    sconce(headBack, -2.5, F1 + 1.1);
    sconce(headBack, -5.3, F1 + 1.1);
    floorAt(...X(W1, s > 0 ? 9.15 : 10.75), 0.85, 5.6, F1, MI.floorRoom);
    downlights(...X(W1 + 0.6, s > 0 ? 8.6 : 10.15), 1.4, 5.1, C1);
    ib.box(...X(5.5, 10.3), C1 - 0.03, C1, 5.46, 5.5, MI.led);
    wardrobe(onWall('x', 0.85, 1), ...X(6.2, 9.0), F1);
    const headFront = onWall('z', s * W1, s);
    sconce(headFront, 2.0, F1 + 1.1);
    sconce(headFront, 4.8, F1 + 1.1);
  }
  // правое крыло: ванная хозяина с ванной у решётки, санузел спальни 2, кабинет за решёткой
  floorAt(LZ, SX, -6.6, -0.85, F1, MI.floorBath);
  downlights(LZ + 0.3, SX - 0.2, -6.2, -1.2, C1, 1.6);
  const masterBath = { vanity: onWall('z', LZ, 1), toilet: onWall('x', -0.85, -1) };
  clad(masterBath.vanity, -6.6, -4.32, F1, C1);
  clad(masterBath.vanity, -3.28, -0.85, F1, C1);
  clad(masterBath.toilet, LZ, SX, F1, C1);
  vanity(masterBath.vanity, -3.0, -1.35, F1, 2);
  toilet(masterBath.toilet, 12.05, F1);
  tub(11.8, -5.45, F1, true);
  partition(1, 'z', 0.85, 5.6, 9.15, 9.3, F1, C1, [[1.2, 2.0, -1, 0]]);
  floorAt(9.3, 10.75, 0.85, 5.6, F1, MI.floorBath);
  downlights(9.5, 10.55, 1.2, 5.2, C1, 1.4);
  const bath2 = onWall('z', 10.75, -1);
  clad(bath2, 0.85, 5.6, F1, C1);
  vanity(bath2, 2.3, 3.5, F1);
  toilet(bath2, 3.95, F1);
  showerHead(bath2, 5.1, F1);
  glassPanel('x', 9.3, 10.15, 4.55, F1);
  floorAt(LZ, SX, 0.85, 5.6, F1, MI.floorRoom);
  downlights(LZ + 0.3, SX - 0.2, 1.3, 5.2, C1, 1.6);
  sconce(onWall('z', LZ, 1), 3.2, F1 + 1.6);
  // левое крыло: санузлы спален 3 и 4 за решёткой, шкаф в конце коридора
  const bath3 = { vanity: onWall('z', -LZ, -1), toilet: onWall('x', -0.85, -1) };
  floorAt(-SX, -LZ, -6.6, -0.85, F1, MI.floorBath);
  downlights(-SX + 0.2, -LZ - 0.3, -6.2, -1.2, C1, 1.6);
  clad(bath3.vanity, -6.6, -4.32, F1, C1);
  clad(bath3.vanity, -3.28, -0.85, F1, C1);
  vanity(bath3.vanity, -3.0, -1.6, F1);
  toilet(bath3.toilet, -12.05, F1);
  showerHead(bath3.vanity, -5.8, F1);
  glassPanel('x', -SX, -LZ, -5.0, F1);
  const bath4 = { vanity: onWall('z', -LZ, -1), toilet: onWall('x', 0.85, 1) };
  floorAt(-SX, -LZ, 0.85, 5.6, F1, MI.floorBath);
  downlights(-SX + 0.2, -LZ - 0.3, 1.2, 5.2, C1, 1.6);
  clad(bath4.vanity, 0.85, 3.28, F1, C1);
  clad(bath4.vanity, 4.32, 5.6, F1, C1);
  vanity(bath4.vanity, 1.2, 2.6, F1);
  toilet(bath4.toilet, -12.05, F1);
  showerHead(bath4.vanity, 5.1, F1);
  glassPanel('x', -SX, -11.55, 4.6, F1);
  wardrobe(onWall('z', -SX, 1), -0.65, 0.65, F1, 0.55, 2.6);
  ib.flush(interior);

  const views = {
    start: { pos: [31, 15, 37], target: [0, 4, 0] },
    street: { pos: [9, 1.7, 31], target: [0, 5.2, 4] },
    back: { pos: [-21, 19, -38], target: [1, 2.5, -6] },
    pool: { pos: [-12.5, 2.4, -15.6], target: [3, 3.6, -6.5] },
    top: { pos: [0.2, 78, 10], target: [0, 0, 0] }
  };

  // ---------- пролёт по дому: точки камеры (глаза на 1,6 м над полом), куда смотреть, подписи ----------
  const E0 = F0 + 1.6, E1 = F1 + 1.6, step = (i) => F0 + i * RISE + 1.6;
  const tour = [
    { pos: [0, 2.1, 15.2], look: [0, 4.6, 4.6], label: 'Вход с улицы', hold: 1.0 },
    { pos: [0.1, 2.4, 10.4], look: [0.2, 3.4, 4.6] },
    { pos: [0.3, E0, 6.4], look: [0.3, 2.7, 2.0] },
    { pos: [0.3, E0, 4.0], look: [0.0, 5.0, 0.0] },
    { pos: [0.4, E0, 2.4], look: [0.0, 6.2, -2.6], label: 'Входной холл, второй свет ~8 м', hold: 1.5 },
    { pos: [2.45, E0, 1.4], look: [3.0, 2.4, -3.0] },
    { pos: [3.0, E0, -1.0], look: [3.4, 2.4, -4.0] },
    { pos: [3.2, E0, -3.4], look: [8.0, 2.4, -4.0] },
    { pos: [4.6, E0, -3.9], look: [8.5, 2.4, -5.0] },
    { pos: [7.4, E0, -3.4], look: [8.2, 2.2, -8.0], label: 'Столовая с видом на бассейн', hold: 1.2 },
    { pos: [9.2, E0, -1.6], look: [11.5, 2.3, -2.0] },
    { pos: [6.6, E0, -4.6], look: [-2.0, 2.4, -4.4] },
    { pos: [2.6, E0, -4.4], look: [0.0, 2.3, -9.0], label: 'Холл к бассейну' },
    { pos: [-2.6, E0, -4.2], look: [-8.0, 2.4, -4.0] },
    { pos: [-4.8, E0, -3.9], look: [-8.5, 2.4, -5.0] },
    { pos: [-7.6, E0, -3.4], look: [-8.2, 2.2, -8.0], label: 'Большая гостиная', hold: 1.2 },
    { pos: [-9.8, E0, -1.5], look: [-6.0, 2.4, 0.0] },
    { pos: [-5.1, E0, -0.4], look: [-5.1, 2.5, 3.0] },
    { pos: [-5.05, E0, 1.6], look: [-9.0, 2.5, 1.7], label: 'Гостевая спальня с санузлом' },
    { pos: [-6.8, E0, 1.65], look: [-10.0, 2.3, 4.0] },
    { pos: [-8.8, E0, 1.9], look: [-10.0, 2.2, 5.9], hold: 1.0 },
    { pos: [-6.6, E0, 1.6], look: [-4.0, 2.5, 1.9] },
    { pos: [-5.0, E0, 2.0], look: [-2.0, 2.5, 2.0] },
    { pos: [-3.2, E0, 2.05], look: [-3.0, 2.5, -2.0] },
    { pos: [-3.1, E0, -1.3], look: [0.0, 3.6, -1.3], label: 'Лестница' },
    { pos: [-2.0, step(1.5), -1.3], look: [1.0, step(8), -1.3], speed: 0.9 },
    { pos: [0.6, step(12), -1.3], look: [2.3, step(13), -1.0], speed: 0.9 },
    { pos: [1.6, step(13), -1.0], look: [1.6, step(14), 1.0], speed: 0.9 },
    { pos: [1.6, step(13), 0.1], look: [-1.0, step(20), 0.1], speed: 0.9 },
    { pos: [-0.6, step(19), 0.1], look: [-3.0, step(25), 0.1], speed: 0.9 },
    { pos: [-2.0, step(25), 0.1], look: [-4.5, E1, 0.1] },
    { pos: [-3.0, E1, 0.3], look: [0.5, 5.2, 4.2], label: 'Галерея второго этажа', hold: 1.2 },
    { pos: [-4.1, E1, 0.0], look: [-6.0, E1, 0.0] },
    { pos: [-5.4, E1, 0.0], look: [-5.4, E1, -3.0] },
    { pos: [-5.4, E1, -1.6], look: [-7.5, 6.7, -4.5] },
    { pos: [-7.3, E1, -3.7], look: [-7.8, 6.4, -8.5], label: 'Спальня 3 с видом на бассейн', hold: 1.0 },
    { pos: [-5.5, E1, -1.3], look: [-5.3, E1, 1.0] },
    { pos: [-5.3, E1, 0.0], look: [-2.0, E1, 0.0] },
    { pos: [-3.1, E1, -0.4], look: [-2.6, E1, -4.0] },
    { pos: [-2.4, E1, -3.2], look: [0.5, 6.2, -9.0] },
    { pos: [-0.4, E1, -4.3], look: [0.6, 6.0, -9.5], label: 'Малая гостиная и пантри', hold: 1.2 },
    { pos: [2.6, E1, -3.3], look: [3.0, E1, 0.0] },
    { pos: [3.0, E1, -0.4], look: [6.0, E1, 0.0] },
    { pos: [4.1, E1, 0.0], look: [6.0, E1, 0.0] },
    { pos: [5.4, E1, 0.0], look: [5.4, E1, -3.0] },
    { pos: [5.4, E1, -1.6], look: [7.6, 6.7, -4.5] },
    { pos: [7.6, E1, -3.6], look: [8.0, 6.4, -8.5], label: 'Спальня хозяина, 36 м²', hold: 1.2 },
    { pos: [10.1, E1, -3.8], look: [12.0, 6.6, -3.8] },
    { pos: [11.6, E1, -3.7], look: [11.8, 6.0, -6.3], label: 'Ванная с отдельностоящей ванной', hold: 1.0 },
    { pos: [10.0, E1, -4.3], look: [7.6, 6.6, -6.6] },
    { pos: [7.8, 6.6, -5.6], look: [7.6, 6.4, -7.5] },
    { pos: [7.6, 6.4, -6.9], look: [7.0, 6.0, -12.0] },
    { pos: [7.0, 8.5, -12.0], look: [2.0, 4.0, -4.0] },
    { pos: [6.0, 13.5, -25.0], look: [0.0, 4.0, -2.0], label: 'Дом со стороны бассейна', hold: 0.5 }
  ];
  return { root, views, tour, doors: [entryDoor] };
}
