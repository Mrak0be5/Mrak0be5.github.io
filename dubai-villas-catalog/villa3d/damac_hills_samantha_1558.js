// DAMAC Hills · вилла у гольф-поля (предложение Samantha, 3 видео и 2 фото WhatsApp 01.11.2026) — тип DAMAC VD-1 «Golf View 1».
// Планировка — по поэтажным планам VD-1 с Bayut (Brookfield; тот же план у The Turf «D-1» и DAMAC Villas by Paramount)
// и по плану DAMAC «Villas at AKOYA», стр. 47. Размеры — по масштабу плана 3,0 см на пиксель, сверенному по площади дома
// (≈5 200 sqft по объявлениям VD-1), машине и дверям: дом 26,8 × 10,4 м, участок ≈41,7 × 16,8 м, этаж 3,7 м.
// Высоты, окна, лестница, отделка, двор и деревья — по видео и фото. Мебели нет: дом сдаётся пустым, как на видео.
// Оси: X — вдоль дома (минус — к гольфу, плюс — к улице), Z — поперёк (минус — сторона входа, плюс — южная сторона),
// Y — вверх, метры. Ориентация совпадает с планом Bayut: пилон и балкон спальни хозяина слева, если смотреть с гольфа.
// Детализация: профили окон со штапиками и подоконниками, плинтусы, выключатели и розетки, фурнитура дверей,
// подробные кухня и санузлы; двери открываются сами, когда к ним подходишь (прогулка, пролёт), и закрываются за спиной.
import { makeTextures } from './vd1_tex.js?v=vd1-fix-20261106';
import { makePlants } from './vd1_plants.js?v=vd1-fix-20261106';

export const info = {
  title: 'DAMAC Hills · вилла VD-1 у гольф-поля',
  note: 'Модель по планам VD-1 (Bayut и DAMAC) в масштабе и по трём видео и двум фото риэлтора: дом 26,8 × 10,4 м, участок ≈42 × 17 м, этаж 3,7 м, оба этажа с комнатами, кухней, санузлами, лестницей и вторым светом у входа; двери открываются, когда подходишь. Двор без озеленения, гольф, озеро и деревья за оградой, соседние дома того же типа. Точность планировки ±0,2–0,3 м.'
};

export function build(THREE, opts = {}) {
  const quality = opts.quality === 'low' ? 'low' : 'high';
  const hi = quality === 'high';
  const root = new THREE.Group();
  root.name = 'vd1_villa';
  const V3 = THREE.Vector3;
  const { T, rnd } = makeTextures(THREE, { quality, images: opts.images });

  // ---------- материалы ----------
  function pbr(t, o = {}, ns = 1) {
    const m = new THREE.MeshStandardMaterial({ roughness: 1, ...o });
    if (t) {
      m.map = t.map || null;
      m.normalMap = t.normalMap || null;
      m.roughnessMap = t.roughnessMap || null;
      if (m.normalMap) m.normalScale.set(ns * (t.normalScale || 1), ns * (t.normalScale || 1));
      if (t.tint) m.color.multiply(new THREE.Color(...t.tint));   // фотоскан: альбедо подогнано под фото дома
      if (t.rough) m.roughness = t.rough;
    }
    return m;
  }
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);
  // стекло фасада: бронзовое солнцезащитное в два прохода — тонировка умножением (вид сквозь стекло без искажений и
  // «призраков» листвы) и отражение неба и солнца сложением (по Френелю); в облегчённом режиме — тёмное зеркальное
  const glassHi = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.62, 0.58, 0.5), blending: THREE.MultiplyBlending, premultipliedAlpha: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false });
  const glassRefl = phys({ color: 0x000000, metalness: 0, roughness: 0.03, ior: 1.95, specularIntensity: 1, envMapIntensity: 1.25, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const glassLo = new THREE.MeshStandardMaterial({ color: 0x2c3237, metalness: 0.86, roughness: 0.05, envMapIntensity: 1.5, side: THREE.DoubleSide });
  const glassFar = new THREE.MeshStandardMaterial({ color: 0x262c31, metalness: 0.85, roughness: 0.06, envMapIntensity: 1.4 });
  const M = {
    render: pbr(T.render),
    renderShade: pbr(T.render, { color: 0xe9e4da }),                       // кромки плит и парапет — чуть светлее
    cap: pbr(T.concrete, { color: 0xf2ecdf }),
    dark: pbr(T.darkPanel),
    stone: pbr(T.stone, {}, 1.25),
    brick: pbr(T.brick),
    glass: hi ? glassHi : glassLo,
    frame: pbr(T.powder, { metalness: 0.45 }),
    railGlass: phys({ color: 0xdcecee, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.5, depthWrite: false, side: THREE.DoubleSide }),
    gravel: pbr(T.gravel),
    pavers: pbr(T.pavers),
    concrete: pbr(T.concrete),
    lawn: pbr(T.lawn),
    fairway: pbr(T.fairway),
    green: pbr(T.fairway, { color: 0xb8e0a0 }),
    rough: pbr(T.rough),
    sand: pbr(T.sand),
    soil: pbr(T.soil),
    asphalt: pbr(T.asphalt),
    kerb: pbr(T.concrete, { color: 0xe4dfd4 }),
    water: new THREE.MeshStandardMaterial({ color: 0x2e5659, metalness: 0.1, roughness: 0.06, envMapIntensity: 1.25, normalMap: T.ripple.normalMap.clone() }),
    poolWater: phys({ color: 0x44c3b9, metalness: 0, roughness: 0.04, envMapIntensity: 1.1, emissive: 0x0b4842, emissiveIntensity: 0.55, normalMap: T.ripple.normalMap.clone(), clearcoat: 1, clearcoatRoughness: 0.03 }),
    white: pbr(T.renderWhite),
    rust: pbr(T.rust, { metalness: 0.3 }, 0.35),
    steel: pbr(T.powder, { color: 0x45484b, metalness: 0.55 }),
    stainless: pbr(T.brushed, { metalness: 1, color: 0xdde1e4 }),
    pole: pbr(T.brushed, { metalness: 0.7, color: 0x9ba1a6 }),
    neighbor: pbr(T.renderWhite),
    ac: pbr(T.brushed, { color: 0xe4e4df, metalness: 0.1 }),
    acDark: new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.6, metalness: 0.3 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff3dc, emissive: 0xffe2b0, emissiveIntensity: 0.9, roughness: 0.4 }),
    paint: new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.7 }),
    flag: new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.8, side: THREE.DoubleSide }),
    cup: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 }),
    oak: pbr(T.oak)
  };
  M.water.normalMap.repeat.set(1 / 6, 1 / 6);
  M.water.normalScale.set(0.35, 0.35);
  M.poolWater.normalMap.repeat.set(1 / 2.5, 1 / 2.5);
  M.poolWater.normalScale.set(0.5, 0.5);
  for (const k of ['glass', 'railGlass', 'water', 'poolWater', 'lamp']) M[k].userData.noCast = true;
  for (const m of [glassHi, glassRefl, glassLo, glassFar]) m.userData.noCast = true;
  // Интерьер: материалы с userData.room берут «комнатную» среду отражений просмотрщика
  const MI = {
    wall: pbr(T.paint),
    ceiling: pbr(T.paint, { color: 0xf9f8f4, emissive: 0x23221f }),
    floor: pbr(T.floor),
    skirt: pbr(T.floor),
    kitchenFloor: pbr(T.kitchenFloor),
    bathFloor: pbr(T.bath),
    bathWall: pbr(T.bath),
    stoneStair: pbr(T.stair),
    groove: new THREE.MeshStandardMaterial({ color: 0x8f7d62, roughness: 0.6 }),
    wenge: pbr(T.wenge),
    wengeV: pbr(T.wengeV || T.wenge),
    gloss: phys({ color: 0xf6f6f3, roughness: 0.14, clearcoat: 0.7, clearcoatRoughness: 0.08 }),
    counter: pbr(T.quartz),
    splash: phys({ color: 0xe2ece8, roughness: 0.03, metalness: 0, clearcoat: 1 }),
    steel: pbr(T.brushed, { metalness: 1, color: 0xd2d6d9 }),
    porcelain: phys({ color: 0xf8f7f3, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe8eaec, metalness: 1, roughness: 0.07 }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xdfe3e6, metalness: 1, roughness: 0.015 }),
    glass: phys({ color: 0xd4ecee, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.14, envMapIntensity: 1.4, depthWrite: false, side: THREE.DoubleSide }),
    led: new THREE.MeshStandardMaterial({ color: 0xfff1d8, emissive: 0xffd49a, emissiveIntensity: 2.2 }),
    downlight: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e2, emissiveIntensity: 2.0 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.35, metalness: 0.2 }),
    slot: new THREE.MeshStandardMaterial({ color: 0x2b2e32, roughness: 0.7 }),
    grille: new THREE.MeshStandardMaterial({ color: 0xe4e1da, roughness: 0.6 }),
    blackGlass: phys({ color: 0x0b0c0d, roughness: 0.04, clearcoat: 1, metalness: 0 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0xf5f4f0, roughness: 0.45 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1a1a1b, roughness: 0.9 })
  };
  for (const key of ['led', 'downlight', 'glass']) MI[key].userData.noCast = true;
  if (!T.wengeV) for (const k of ['map', 'normalMap', 'roughnessMap']) if (MI.wengeV[k]) { MI.wengeV[k] = MI.wengeV[k].clone(); MI.wengeV[k].center.set(0.5, 0.5); MI.wengeV[k].rotation = Math.PI / 2; }
  for (const m of Object.values(MI)) m.userData.room = true;
  // имена материалов с префиксом (x_ — снаружи, i_ — интерьер): по ним Blender подставляет фотоскан-материалы
  const named = (o, pre) => { for (const [k, m] of Object.entries(o)) m.name = `${pre}${k}`; };
  named(M, 'x_'); named(MI, 'i_');
  glassHi.name = 'x_glass'; glassLo.name = 'x_glass'; glassFar.name = 'x_glassFar'; glassRefl.name = 'x_glassRefl';

  // ---------- физика прогулки ----------
  // colliders — коробки [x0,y0,z0,x1,y1,z1]; walkables — поверхности [x0,z0,x1,z1,высота]; dynamic — закрытые двери
  const physData = { colliders: [], walkables: [], polys: [], dynamic: [] };
  const col = (x0, x1, y0, y1, z0, z1) => physData.colliders.push([Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)]);
  const walkOn = (x0, x1, z0, z1, top) => physData.walkables.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), top]);

  // ---------- помощники ----------
  const add = (obj, parent = root) => { parent.add(obj); return obj; };
  const toShape = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const toPath = (pts) => new THREE.Path(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const rectXZ = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  function ground(ptsXZ, y, mat, holesXZ = []) { // горизонтальная поверхность по точкам плана (x, z), в общем пакете земли
    const shape = toShape(ptsXZ.map(([x, z]) => [x, -z]));
    holesXZ.forEach((h) => shape.holes.push(toPath(h.map(([x, z]) => [x, -z]))));
    const geo = new THREE.ShapeGeometry(shape, 24);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, y, 0);
    GB.geo(geo, mat);
  }
  // Пакет: детали одного материала сливаются в одну сетку; развёртка — по мировым координатам в метрах.
  const solids = opts.audit ? [] : null;   // для аудита (audit.html): все коробки модели
  function makeBatch(tag, bo = {}) {
    const groups = new Map();
    const put = (geo, mat) => {
      if (!groups.has(mat)) groups.set(mat, []);
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (!g.attributes.normal) g.computeVertexNormals();
      groups.get(mat).push(g);
    };
    return {
      geo: put,
      box(x0, x1, y0, y1, z0, z1, mat) {
        if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
        const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
        g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        if (solids && !mat.transparent) solids.push([x0, y0, z0, x1, y1, z1]);
        put(g, mat);
      },
      cyl(x, y0, z, r, h, mat, seg = 16, r2 = r) { const g = new THREE.CylinderGeometry(r2, r, h, seg); g.translate(x, y0 + h / 2, z); put(g, mat); },
      boxSplit(x0, x1, y0, y1, z0, z1, mat, innerMat, axis, sign) { // грань, смотрящая внутрь дома (axis, sign), — отделкой
        if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
        if (solids) solids.push([x0, y0, z0, x1, y1, z1]);
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
        const out = [];
        for (const [mat, list] of groups) {
          let n = 0;
          for (const g of list) n += g.attributes.position.count;
          const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
          let o = 0;
          for (const g of list) {
            const p = g.attributes.position.array, q = g.attributes.normal.array, c = g.attributes.position.count;
            pos.set(p, o * 3);
            nor.set(q, o * 3);
            for (let i = 0; i < c; i++) {
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
          geo.computeBoundingSphere();
          const mesh = new THREE.Mesh(geo, mat);
          mesh.name = `${tag}_${mat.name || 'part'}`;
          if (mat.userData.noCast || bo.noCast) mesh.userData.noCast = true;
          if (mat.transparent) mesh.userData.noAO = true;   // стекло не закрывает затенение того, что за ним
          if (parent) parent.add(mesh);
          out.push({ geo, mat, mesh });
        }
        groups.clear();
        return out;
      }
    };
  }
  const HB = makeBatch('house');    // наружная оболочка дома (её же копии — соседние дома того же типа)
  const HD = makeBatch('hdetail');  // мелкие детали фасада: штапики, кронштейны, светильники (копии — только у ближних соседей)
  const NB = makeBatch('nproxy');   // заглушки проёмов для копий-соседей (у нас там подвижные створки)
  const PB = makeBatch('plot');     // участок: двор, ограды, навес
  const EB = makeBatch('env');      // гольф, улица, дальние дома
  const ib = makeBatch('interior'); // интерьер
  const GB = makeBatch('ground', { noCast: true }); // земля, газоны, дорожки, вода — тени принимают, но не отбрасывают
  const glassMeshes = [];           // сетки со стеклом фасада — меняются при смене качества
  const B = HB;

  // ===================================================================================================================
  // ---------- уровни и размеры (метры) ----------
  const F0 = 0.30;             // чистый пол 1-го этажа (над двором одна ступень 0,15 и порог)
  const F1 = 4.00;             // чистый пол 2-го этажа: этаж 3,70 м, 21 подъём по 0,176 м
  const CG = F0 + 3.05;        // опуск потолка 1-го этажа ~3,05 м (оценка по дверям на видео)
  const CG_TOP = F0 + 3.35;    // низ плиты / кессон гостиной ~3,35 м
  const C1 = F1 + 3.0;         // опуск потолка 2-го этажа
  const C1_TOP = F1 + 3.25;    // низ плиты крыши
  const ROOF = C1_TOP + 0.35;  // верх плиты крыши
  const PARA = ROOF + 0.8;     // верх парапета и рамы
  const RISE = (F1 - F0) / 21;
  // лестница по плану Bayut: оба марша от Z 1,10 до 3,57 (план 1-го этажа, пкс 337–419), площадка до витража;
  // нижний марш (9 проступей) — у стены коридора, верхний (10 проступей) — над дверью кухни
  const Z1 = 1.10, ZL = 3.57, T1 = (ZL - Z1) / 9, T2 = (ZL - Z1) / 10, ZT = ZL - 10 * T2;
  const LAND = F0 + 10 * RISE;
  const FX = [3.15, 4.26], SX = [0.87, 2.1];
  const soffitAt = (z) => LAND - 0.25 + (F1 - 0.35 - (LAND - 0.25)) * Math.min(1, Math.max(0, (ZL - z) / (ZL - ZT))); // низ верхнего марша
  const FW = F1 - 0.345;       // низ стен 2-го этажа на 5 мм выше низа плиты: их грани не совпадают с гранями плиты
  // 2-й этаж снят с плана Bayut и переведён в координаты 1-го этажа (zf — для координат Z плана 2-го этажа)
  const zf = (z) => -5.19 + (z + 5.07) * 1.0211;
  const XW = -13.0;            // витраж 1-го этажа к гольфу
  const XWF = -12.62;          // остекление 2-го этажа к гольфу
  const XB = -14.04;           // край балкона и рамы к гольфу (над пилоном)
  const ZN = -5.19, ZS = 5.25; // северная (вход) и южная наружные грани 2-го этажа
  const XE1 = 12.5;            // восточная наружная грань 2-го этажа
  const XEB = 13.8;            // край восточных балконов
  const PX0 = -21.21, PX1 = 20.2, PZ0 = -8.16, PZ1 = 8.25; // участок
  const floorAtY = (y) => (y < F1 - 0.5 ? F0 : F1);

  // ===================================================================================================================
  // ---------- стены, окна, ограждения ----------
  // Стена с проёмами: along 'x' — стена вдоль X (толщина t0..t1 по Z), 'z' — вдоль Z (толщина по X);
  // holes — [a0, a1, y0, y1] вдоль стены. inner — [материал, знак] для грани, смотрящей в дом. Сплошные куски — препятствия.
  // skirt — [знаки граней] с плинтусом 10 см из той же плитки, что пол (у проёмов плинтус обрывается)
  function wall(batch, along, a0, a1, y0, y1, t0, t1, holes, mat, inner = null, solid = true, skirt = null) {
    const cut = (vals, lo, hi2) => [...new Set(vals)].filter((v) => v >= lo && v <= hi2).sort((p, q) => p - q);
    const ua = cut([a0, a1, ...holes.flatMap((h) => [h[0], h[1]])], a0, a1);
    const uy = cut([y0, y1, ...holes.flatMap((h) => [h[2], h[3]])], y0, y1);
    const fy = skirt ? floorAtY(Math.max(y0, F0 - 0.01) + 0.31) : 0;
    for (let j = 0; j < uy.length - 1; j++) {
      const yc = (uy[j] + uy[j + 1]) / 2;
      let start = null;
      for (let i = 0; i < ua.length; i++) {
        const ac = i < ua.length - 1 ? (ua[i] + ua[i + 1]) / 2 : null;
        const filled = ac !== null && !holes.some(([h0, h1, hy0, hy1]) => ac > h0 && ac < h1 && yc > hy0 && yc < hy1);
        if (filled && start === null) start = ua[i];
        if (!filled && start !== null) {
          const b = along === 'x' ? [start, ua[i], uy[j], uy[j + 1], t0, t1] : [t0, t1, uy[j], uy[j + 1], start, ua[i]];
          if (inner) batch.boxSplit(...b, mat, inner[0], along === 'x' ? 'z' : 'x', inner[1]);
          else batch.box(...b, mat);
          if (solid) {
            // полоса ниже пола: под дверными проёмами — порог, на который поднимаются со ступени, а не препятствие
            const sills = uy[j + 1] <= F0 + 0.001 ? holes.filter((h) => h[2] <= F0 + 0.001 && h[1] > start && h[0] < ua[i]).sort((p, q) => p[0] - q[0]) : [];
            const seg = (u0, u1) => { if (u1 - u0 > 1e-4) { if (along === 'x') col(u0, u1, b[2], b[3], b[4], b[5]); else col(b[0], b[1], b[2], b[3], u0, u1); } };
            let s0 = start;
            for (const h of sills) { seg(s0, h[0]); s0 = Math.max(s0, h[1]); }
            seg(s0, ua[i]);
          }
          if (skirt && uy[j] <= fy + 0.01 && uy[j + 1] >= fy + 0.1) {
            for (const s of skirt) {
              const tt = s > 0 ? [t1, t1 + 0.011] : [t0 - 0.011, t0];
              if (along === 'x') ib.box(start, ua[i], fy, fy + 0.1, tt[0], tt[1], MI.skirt); else ib.box(tt[0], tt[1], fy, fy + 0.1, start, ua[i], MI.skirt);
            }
          }
          start = null;
        }
      }
    }
  }
  // Подвижные части: двери на петлях, поворотная входная дверь, раздвижные створки
  const doors = [];
  const doorParts = (name) => { const g = new THREE.Group(); g.name = name; return g; };
  const partMesh = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); parent.add(m); if (mat === M.glass) glassMeshes.push(m); if (mat.userData.noCast) m.userData.noCast = true; return m; };
  const boxGeo = (x0, x1, y0, y1, z0, z1) => {
    [x0, x1] = [Math.min(x0, x1), Math.max(x0, x1)]; [y0, y1] = [Math.min(y0, y1), Math.max(y0, y1)]; [z0, z1] = [Math.min(z0, z1), Math.max(z0, z1)];
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g;
  };

  // Остекление в плоскости стены: along 'x' — в плоскости z = at, 'z' — в плоскости x = at; out — куда смотрит наружу (±1).
  // Рамы — чёрный алюминий: широкий контур, импосты, штапики с обеих сторон, наружный отлив и внутренний подоконник.
  // cols — число створок или массив координат стоек; rows — высоты горизонтальных профилей между y0 и y1.
  // opts.open = [o0, o1] — раздвижная створка: в обзоре закрыта, отъезжает за соседнее стекло, когда к ней подходят.
  function glazing(along, a0, a1, at, y0, y1, cols, rows, out, opts = {}) {
    const bar = opts.bar || 0.06, deep = opts.deep || 0.1, fw = Math.max(bar, 0.065), fd = deep + 0.03;
    const W = (u0, u1, v0, v1, d0, d1, mat, batch = HB) => { const e0 = Math.min(d0, d1), e1 = Math.max(d0, d1); if (along === 'x') batch.box(u0, u1, v0, v1, at + e0, at + e1, mat); else batch.box(at + e0, at + e1, v0, v1, u0, u1, mat); };
    const pane = (u0, u1, v0, v1, batch = HB, mat = M.glass) => {
      const g = new THREE.PlaneGeometry(u1 - u0, v1 - v0);
      if (along === 'x') { if (out < 0) g.rotateY(Math.PI); g.translate((u0 + u1) / 2, (v0 + v1) / 2, at); }
      else { g.rotateY(out > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(at, (v0 + v1) / 2, (u0 + u1) / 2); }
      batch.geo(g, mat);
    };
    const stops = Array.isArray(cols) ? cols : Array.from({ length: cols + 1 }, (_, i) => a0 + (i * (a1 - a0)) / cols);
    const hs = [y0, ...(rows || []), y1];
    const open = opts.open;
    const isOpenCell = (u0, u1, v0) => open && u0 >= open[0] - 0.01 && u1 <= open[1] + 0.01 && v0 < (opts.doorTop || y1) - 0.01;
    // стекло по ячейкам и штапики вокруг каждой
    for (let i = 0; i < stops.length - 1; i++) for (let j = 0; j < hs.length - 1; j++) {
      const u0 = stops[i] + bar / 2, u1 = stops[i + 1] - bar / 2, v0 = hs[j] + (j === 0 ? fw : bar / 2), v1 = hs[j + 1] - (j === hs.length - 2 ? fw : bar / 2);
      if (u1 - u0 < 0.02 || v1 - v0 < 0.02) continue;
      if (isOpenCell(stops[i], stops[i + 1], hs[j])) { pane(u0, u1, v0, v1, NB, glassFar); continue; }
      pane(u0, u1, v0, v1);
      if (hi || !opts.far) for (const s of [-1, 1]) {
        const d0 = s * 0.008, d1 = s * 0.024;
        const [p0, p1] = [Math.min(d0, d1), Math.max(d0, d1)];
        W(u0, u1, v0, v0 + 0.018, p0, p1, M.frame, HD); W(u0, u1, v1 - 0.018, v1, p0, p1, M.frame, HD);
        W(u0, u0 + 0.018, v0, v1, p0, p1, M.frame, HD); W(u1 - 0.018, u1, v0, v1, p0, p1, M.frame, HD);
      }
    }
    // контур рамы и импосты
    W(a0, a1, y0, y0 + fw, -fd / 2, fd / 2, M.frame);
    W(a0, a1, y1 - fw, y1, -fd / 2, fd / 2, M.frame);
    W(a0, a0 + fw, y0, y1, -fd / 2, fd / 2, M.frame);
    W(a1 - fw, a1, y0, y1, -fd / 2, fd / 2, M.frame);
    for (const u of stops.slice(1, -1)) W(u - bar / 2, u + bar / 2, y0, y1, -deep / 2, deep / 2, M.frame);
    for (const v of rows || []) {
      if (open) { // фрамуга над створкой: импост во всю ширину, но под ним у створки — проём
        W(a0, a1, v - bar / 2, v + bar / 2, -deep / 2, deep / 2, M.frame);
      } else W(a0, a1, v - bar / 2, v + bar / 2, -deep / 2, deep / 2, M.frame);
    }
    // отлив снаружи и подоконник внутри у окон, поднятых над полом
    const floorY = floorAtY(y0 + 0.01);
    if (y0 > floorY + 0.25) {
      W(a0 - 0.03, a1 + 0.03, y0 - 0.031, y0 + 0.004, out * fd / 2, out * (fd / 2 + 0.07), M.frame);
      if (opts.sill !== false) {
        const d0 = -out * fd / 2, d1 = -out * (fd / 2 + 0.16);
        W(a0 - 0.04, a1 + 0.04, y0 - 0.026, y0 + 0.004, Math.min(d0, d1), Math.max(d0, d1), MI.stoneStair, ib);
      }
    }
    if (open) {
      const [o0, o1] = open, w = o1 - o0, toLow = o0 - a0 >= w - 0.01, top = opts.doorTop || y1;
      const leaf = doorParts('slider');
      const sb = makeBatch('slider');
      const h = top - y0 - fw / 2, c = (o0 + o1) / 2, d = -out * 0.088;      // створка ходит в 9 см за неподвижным стеклом
      const L = (u0, u1, v0, v1, t0, t1, mat) => sb.geo(along === 'x' ? boxGeo(u0, u1, v0, v1, t0, t1) : boxGeo(t0, t1, v0, v1, u0, u1), mat);
      const P = (u0, u1, v0, v1) => {
        const g = new THREE.PlaneGeometry(u1 - u0, v1 - v0);
        if (along === 'x') g.translate((u0 + u1) / 2, (v0 + v1) / 2, 0); else { g.rotateY(Math.PI / 2); g.translate(0, (v0 + v1) / 2, (u0 + u1) / 2); }
        sb.geo(g, M.glass);
      };
      const pf = 0.072, pd = 0.055;
      P(-w / 2 + pf, w / 2 - pf, -h / 2 + pf, h / 2 - pf);
      L(-w / 2, w / 2, -h / 2, -h / 2 + pf, -pd / 2, pd / 2, M.frame);
      L(-w / 2, w / 2, h / 2 - pf, h / 2, -pd / 2, pd / 2, M.frame);
      L(-w / 2, -w / 2 + pf, -h / 2, h / 2, -pd / 2, pd / 2, M.frame);
      L(w / 2 - pf, w / 2, -h / 2, h / 2, -pd / 2, pd / 2, M.frame);
      // вертикальная ручка-скоба с обеих сторон у свободного края
      const hu = toLow ? w / 2 - pf - 0.06 : -w / 2 + pf + 0.06;
      for (const s of [-1, 1]) {
        L(hu - 0.012, hu + 0.012, -0.25, 0.25, s * (pd / 2 + 0.035), s * (pd / 2 + 0.035) + s * 0.022, M.stainless);
        for (const v of [-0.22, 0.22]) L(hu - 0.008, hu + 0.008, v - 0.008, v + 0.008, s * pd / 2, s * (pd / 2 + 0.036), M.stainless);
      }
      for (const part of sb.flush(leaf)) if (part.mat === M.glass) glassMeshes.push(part.mesh);
      if (along === 'x') leaf.position.set(c, y0 + fw / 2 + h / 2, at + d); else leaf.position.set(at + d, y0 + fw / 2 + h / 2, c);
      add(leaf);
      // нижняя направляющая во всю ширину
      W(a0, a1, y0 - 0.005, y0 + 0.012, -out * 0.13, out * 0.02, M.frame);
      const slide = along === 'x' ? [toLow ? -w + pf : w - pf, 0] : [0, toLow ? -w + pf : w - pf];
      const cx = along === 'x' ? c : at, cz = along === 'x' ? at : c;
      const box = along === 'x' ? [o0, y0, at - 0.05, o1, top, at + 0.05] : [at - 0.05, y0, o0, at + 0.05, top, o1];
      doors.push({ kind: 'slide', obj: leaf, base: leaf.position.clone(), slide, center: [cx, floorY, cz], reach: 2.6, time: 1.35, collider: box, p: 0, target: 0, hold: 0, label: opts.label || 'раздвижная дверь' });
    }
    if (opts.solid !== false) {
      const spans = open ? [[a0, open[0]], [open[1], a1]].filter(([u0, u1]) => u1 - u0 > 0.01) : [[a0, a1]];
      for (const [u0, u1] of spans) {
        if (along === 'x') col(u0, u1, y0, y1, at - 0.05, at + 0.05); else col(at - 0.05, at + 0.05, y0, y1, u0, u1);
      }
    }
  }
  // Стеклянное ограждение 1,1 м: стекло на точечных креплениях, поручень на кронштейнах (наружные — чёрные, у лестницы — нержавейка)
  function railing(along, a0, a1, at, y0, opts = {}) {
    const h = opts.h || 1.1, batch = opts.batch || ib, mat = opts.glass || MI.glass, metal = opts.rail || MI.chrome;
    const R = (u0, u1, v0, v1, t0, t1, m, b = batch) => (along === 'x' ? b.box(u0, u1, v0, v1, at + t0, at + t1, m) : b.box(at + t0, at + t1, v0, v1, u0, u1, m));
    const len = a1 - a0, n = Math.max(1, Math.round(len / 1.25));
    for (let i = 0; i < n; i++) { // панели с зазором 1 см
      const u0 = a0 + (i * len) / n + 0.005, u1 = a0 + ((i + 1) * len) / n - 0.005;
      R(u0, u1, y0 + 0.06, y0 + h - 0.06, -0.006, 0.006, mat);
      const fix = opts.batch === HB ? HD : batch;
      for (const u of [u0 + 0.12, u1 - 0.12]) for (const v of [y0 + 0.16, y0 + h - 0.22]) { // точечные держатели
        const g = new THREE.CylinderGeometry(0.022, 0.022, 0.05, 12);
        if (along === 'x') g.rotateX(Math.PI / 2); else g.rotateZ(Math.PI / 2);
        if (along === 'x') g.translate(u, v, at - 0.03); else g.translate(at - 0.03, v, u);
        fix.geo(g, metal);
      }
    }
    if (opts.posts) for (let i = 0; i <= n; i++) { const a = a0 + (i * len) / n; R(a - 0.02, a + 0.02, y0, y0 + h, -0.04, 0.04, metal); }
    const rail = new THREE.CylinderGeometry(0.024, 0.024, len, 14);
    rail.rotateZ(Math.PI / 2);
    if (along === 'z') rail.rotateY(Math.PI / 2);
    if (along === 'x') rail.translate((a0 + a1) / 2, y0 + h + 0.03, at); else rail.translate(at, y0 + h + 0.03, (a0 + a1) / 2);
    batch.geo(rail, metal);
    for (let i = 0; i <= n; i++) { const a = a0 + 0.06 + (i * (len - 0.12)) / n; R(a - 0.008, a + 0.008, y0 + h - 0.06, y0 + h + 0.02, -0.008, 0.008, metal); }
    if (along === 'x') col(a0, a1, y0, y0 + h, at - 0.05, at + 0.05); else col(at - 0.05, at + 0.05, y0, y0 + h, a0, a1);
  }
  // наклонное ограждение марша вдоль Z: стекло-параллелограмм, стойки и поручень по уклону
  function slopeRail(x, z0, y0, z1, y1, h = 1.0) {
    const s = new THREE.Shape([new THREE.Vector2(z0, y0 + 0.1), new THREE.Vector2(z1, y1 + 0.1), new THREE.Vector2(z1, y1 + h - 0.06), new THREE.Vector2(z0, y0 + h - 0.06)]);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false });
    g.rotateY(-Math.PI / 2);
    g.translate(x + 0.006, 0, 0);
    ib.geo(g, MI.glass);
    const n = Math.max(1, Math.round(Math.abs(z1 - z0) / 1.0));
    for (let i = 0; i <= n; i++) {
      const t = i / n, z = z0 + (z1 - z0) * t, y = y0 + (y1 - y0) * t;
      ib.box(x - 0.02, x + 0.02, y, y + h, z - 0.02, z + 0.02, MI.chrome);
      ib.box(x - 0.035, x + 0.035, y, y + 0.012, z - 0.035, z + 0.035, MI.chrome);
    }
    const len = Math.hypot(z1 - z0, y1 - y0);
    const dir = new V3(0, y1 - y0, z1 - z0).normalize();
    const rail = new THREE.CylinderGeometry(0.024, 0.024, len, 14);
    rail.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir));
    rail.translate(x, (y0 + y1) / 2 + h, (z0 + z1) / 2);
    ib.geo(rail, MI.chrome);
    const segs = Math.max(2, Math.round(Math.abs(z1 - z0) / 0.3));
    for (let i = 0; i < segs; i++) {
      const za = z0 + ((z1 - z0) * i) / segs, zb = z0 + ((z1 - z0) * (i + 1)) / segs, ya = y0 + ((y1 - y0) * i) / segs, yb = y0 + ((y1 - y0) * (i + 1)) / segs;
      col(x - 0.05, x + 0.05, Math.min(ya, yb), Math.max(ya, yb) + h, Math.min(za, zb), Math.max(za, zb));
    }
  }

  // ---------- двери на петлях ----------
  // Проём с наличниками, коробкой и притвором; полотно венге на трёх петлях, нажимные ручки с обеих сторон.
  // plan — куда дверь открыта на плане (знак по оси толщины), hinge — у какого края петли (0 — a0, 1 — a1).
  // При прогулке дверь открывается от идущего, если с той стороны хватает места (иначе — как на плане).
  const switches = [];
  function hingedDoor(along, a0, a1, y0, h, t0, t1, plan, hinge = 0, o = {}) {
    const leafMat = o.leaf || MI.wenge, casing = 0.07, lip = 0.014;
    const put = (aa0, aa1, yy0, yy1, tt0, tt1, mat = MI.wenge) => (along === 'x' ? ib.box(aa0, aa1, yy0, yy1, tt0, tt1, mat) : ib.box(tt0, tt1, yy0, yy1, aa0, aa1, mat));
    if (!o.noFrame) {
      for (const [tt0, tt1] of [[t0 - lip, t0], [t1, t1 + lip]]) { // наличники со ступенькой профиля
        put(a0 - casing, a0, y0, y0 + h + casing, tt0, tt1);
        put(a1, a1 + casing, y0, y0 + h + casing, tt0, tt1);
        put(a0 - casing, a1 + casing, y0 + h, y0 + h + casing, tt0, tt1);
        const s = tt0 < t0 ? -1 : 1, e0 = s > 0 ? tt1 : tt0 - 0.006, e1 = s > 0 ? tt1 + 0.006 : tt0;
        put(a0 - casing * 0.45, a0, y0, y0 + h + casing * 0.45, e0, e1);
        put(a1, a1 + casing * 0.45, y0, y0 + h + casing * 0.45, e0, e1);
        put(a0 - casing * 0.45, a1 + casing * 0.45, y0 + h, y0 + h + casing * 0.45, e0, e1);
      }
      put(a0, a0 + 0.02, y0, y0 + h, t0, t1);                // коробка
      put(a1 - 0.02, a1, y0, y0 + h, t0, t1);
      put(a0, a1, y0 + h - 0.02, y0 + h, t0, t1);
      const tm = (t0 + t1) / 2;                                // притвор посередине коробки
      put(a0 + 0.02, a0 + 0.034, y0, y0 + h - 0.02, tm - 0.025, tm + 0.025);
      put(a1 - 0.034, a1 - 0.02, y0, y0 + h - 0.02, tm - 0.025, tm + 0.025);
      put(a0 + 0.02, a1 - 0.02, y0 + h - 0.034, y0 + h - 0.02, tm - 0.025, tm + 0.025);
    }
    if (!plan) return;                                    // проход без двери — только наличники
    const th = 0.042, gap = 0.036, W = a1 - a0 - 2 * gap, tm = (t0 + t1) / 2;
    const ah = hinge === 0 ? a0 + gap + th / 2 : a1 - gap - th / 2;
    const dirA = hinge === 0 ? 1 : -1;                       // от петель к свободному краю
    const pivot = doorParts('door');
    const leaf = new THREE.Group();
    pivot.add(leaf);
    const lb = makeBatch('leaf');
    // в локальных осях: u — вдоль стены (от петель), t — по толщине, y — вверх
    const L = (u0, u1, v0, v1, w0, w1, mat, parent = leaf) => {
      const [p0, p1] = dirA > 0 ? [u0, u1] : [-u1, -u0];
      const g = along === 'x' ? boxGeo(p0, p1, v0, v1, w0, w1) : boxGeo(w0, w1, v0, v1, p0, p1);
      if (parent === leaf) lb.geo(g, mat); else partMesh(g, mat, parent);
    };
    L(-th / 2, W - th / 2, 0.008, h - 0.006, -th / 2, th / 2, leafMat === MI.wenge ? MI.wengeV : leafMat);
    for (const v of [0.24, h * 0.5, h - 0.26]) { // петли
      const g = new THREE.CylinderGeometry(0.011, 0.011, 0.1, 10);
      g.translate(0, v, 0);
      lb.geo(g, MI.chrome);
    }
    const handles = [];
    const hu = W - th / 2 - 0.068, hv = 1.02;
    for (const s of [-1, 1]) {
      const rose = new THREE.CylinderGeometry(0.026, 0.026, 0.01, 18);
      if (along === 'x') rose.rotateX(Math.PI / 2); else rose.rotateZ(Math.PI / 2);
      const ru = dirA > 0 ? hu : -hu, rt = s * (th / 2 + 0.005);
      if (along === 'x') rose.translate(ru, hv, rt); else rose.translate(rt, hv, ru);
      lb.geo(rose, MI.chrome);
      if (o.lock) { const lk = rose.clone(); lk.translate(0, -0.16, 0); lb.geo(lk, MI.chrome); }
      const lever = new THREE.Group();          // ручка поворачивается вокруг оси розетки при нажатии
      if (along === 'x') lever.position.set(ru, hv, s * (th / 2 + 0.01)); else lever.position.set(s * (th / 2 + 0.01), hv, ru);
      leaf.add(lever);
      const neck = new THREE.CylinderGeometry(0.009, 0.009, 0.05, 10);
      if (along === 'x') { neck.rotateX(Math.PI / 2); neck.translate(0, 0, s * 0.025); } else { neck.rotateZ(Math.PI / 2); neck.translate(s * 0.025, 0, 0); }
      const hb = makeBatch('lever');
      hb.geo(neck, MI.chrome);
      const arm = along === 'x' ? boxGeo(0, -dirA * 0.13, -0.009, 0.009, s * 0.042, s * 0.06) : boxGeo(s * 0.042, s * 0.06, -0.009, 0.009, 0, -dirA * 0.13);
      hb.geo(arm, MI.chrome);
      hb.flush(lever);
      lever.userData.axis = along === 'x' ? 'z' : 'x';
      lever.userData.sign = along === 'x' ? dirA : -dirA;
      handles.push(lever);
    }
    lb.flush(leaf);
    if (along === 'x') pivot.position.set(ah, y0, tm); else pivot.position.set(tm, y0, ah);
    add(pivot);
    // выключатель у двери со стороны ручки, с обеих сторон стены
    for (const s of [-1, 1]) switches.push({ along, a: hinge === 0 ? a1 + casing + 0.09 : a0 - casing - 0.09, y: y0 + 1.1, t: s > 0 ? t1 : t0, s });
    const n = along === 'x' ? [0, 1] : [1, 0];
    const cx = along === 'x' ? (a0 + a1) / 2 : tm, cz = along === 'x' ? tm : (a0 + a1) / 2;
    const box = along === 'x' ? [a0, y0, tm - th / 2, a1, y0 + h, tm + th / 2] : [tm - th / 2, y0, a0, tm + th / 2, y0 + h, a1];
    doors.push({ kind: 'hinge', obj: pivot, handles, along, dirA, plan: plan || 1, n, ah, tm, W, y0, h, center: [cx, y0, cz], reach: 2.2, time: 0.95, maxAngle: 1.62, collider: box, sides: null, p: 0, target: 0, hold: 0, sign: plan || 1, label: o.label || 'дверь' });
  }
  // перегородка с дверями: doors — [a0, a1, plan, hinge, {lock}]; h — высота дверей; плинтус с обеих сторон
  function partition(along, a0, a1, t0, t1, y0, y1, dl = [], h = 2.2, mat = MI.wall) {
    wall(ib, along, a0, a1, y0, y1, t0, t1, dl.map(([d0, d1]) => [d0, d1, y0, y0 + h]), mat, null, true, [-1, 1]);
    for (const [d0, d1, sw = 1, hinge = 0, o = {}] of dl) hingedDoor(along, d0, d1, y0, h, t0, t1, sw, hinge, o);
  }
  function downlights(x0, x1, z0, z1, y, step = 1.6) {
    const nx = Math.max(1, Math.round((x1 - x0) / step)), nz = Math.max(1, Math.round((z1 - z0) / step));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = x0 + (i + 0.5) * (x1 - x0) / nx, z = z0 + (j + 0.5) * (z1 - z0) / nz;
      const ring = new THREE.CylinderGeometry(0.062, 0.062, 0.006, 18);
      ring.translate(x, y - 0.003, z);
      ib.geo(ring, MI.trim);
      const g = new THREE.CircleGeometry(0.045, 16);
      g.rotateX(Math.PI / 2);
      g.translate(x, y - 0.0065, z);
      ib.geo(g, MI.downlight);
    }
  }
  // потолок: tray — ширина опуска по периметру (на видео — кессон с опуском и светодиодной подсветкой в щели)
  function ceiling(x0, x1, z0, z1, y, tray = 0, rise = 0.28, slots = true) {
    if (!tray) {
      ib.box(x0, x1, y, y + 0.04, z0, z1, MI.ceiling);
      downlights(x0 + 0.3, x1 - 0.3, z0 + 0.3, z1 - 0.3, y);
      return;
    }
    const d = tray, ty = y + rise;
    ib.box(x0, x1, y, y + 0.04, z0, z0 + d, MI.ceiling);
    ib.box(x0, x1, y, y + 0.04, z1 - d, z1, MI.ceiling);
    ib.box(x0, x0 + d, y, y + 0.04, z0 + d, z1 - d, MI.ceiling);
    ib.box(x1 - d, x1, y, y + 0.04, z0 + d, z1 - d, MI.ceiling);
    ib.box(x0 + d, x1 - d, ty, ty + 0.04, z0 + d, z1 - d, MI.ceiling);
    for (const [a, b, c, e] of [[x0 + d, x1 - d, z0 + d, z0 + d + 0.03], [x0 + d, x1 - d, z1 - d - 0.03, z1 - d], [x0 + d, x0 + d + 0.03, z0 + d, z1 - d], [x1 - d - 0.03, x1 - d, z0 + d, z1 - d]]) ib.box(a, b, y + 0.04, ty, c, e, MI.ceiling);
    const g = 0.07;
    for (const [a, b, c, e] of [[x0 + d - g, x1 - d + g, z0 + d - g, z0 + d - g + 0.025], [x0 + d - g, x1 - d + g, z1 - d + g - 0.025, z1 - d + g], [x0 + d - g, x0 + d - g + 0.025, z0 + d - g, z1 - d + g], [x1 - d + g - 0.025, x1 - d + g, z0 + d - g, z1 - d + g]]) ib.box(a, b, y + 0.05, y + 0.065, c, e, MI.led);
    if (slots && x1 - x0 > 3) { // щель кондиционера с ламелями
      const sx = x0 + d * 0.3;
      ib.box(sx, sx + 0.1, y - 0.004, y, z0 + d + 0.4, z1 - d - 0.4, MI.slot);
      for (let z = z0 + d + 0.45; z < z1 - d - 0.4; z += 0.05) ib.box(sx + 0.01, sx + 0.09, y - 0.006, y - 0.002, z, z + 0.008, MI.grille);
    }
    downlights(x0 + d / 2 - 0.25, x1 - d / 2 + 0.25, z0 + d / 2 - 0.25, z0 + d / 2 + 0.25, y, 1.8);
    downlights(x0 + d / 2 - 0.25, x1 - d / 2 + 0.25, z1 - d / 2 - 0.25, z1 - d / 2 + 0.25, y, 1.8);
  }
  function grilleAC(x, z, y) {
    ib.box(x - 0.3, x + 0.3, y - 0.015, y, z - 0.3, z + 0.3, MI.grille);
    ib.box(x - 0.22, x + 0.22, y - 0.02, y - 0.015, z - 0.22, z + 0.22, MI.slot);
    for (let k = -0.2; k <= 0.2; k += 0.05) ib.box(x - 0.21, x + 0.21, y - 0.024, y - 0.016, z + k - 0.006, z + k + 0.006, MI.grille);
  }
  // «у стены»: u — вдоль стены, v — от стены в комнату; n — куда смотрит грань стены (±1)
  function onWall(along, at, n) {
    return {
      box(u0, u1, y0, y1, v0, v1, mat, solid = false) {
        const a = at + n * v0, b = at + n * v1;
        const t0 = Math.min(a, b), t1 = Math.max(a, b);
        if (along === 'x') { ib.box(u0, u1, y0, y1, t0, t1, mat); if (solid) col(u0, u1, y0, y1, t0, t1); }
        else { ib.box(t0, t1, y0, y1, u0, u1, mat); if (solid) col(t0, t1, y0, y1, u0, u1); }
      },
      at(u, v) { return along === 'x' ? [u, at + n * v] : [at + n * v, u]; },
      yaw: along === 'x' ? (n > 0 ? 0 : Math.PI) : (n > 0 ? Math.PI / 2 : -Math.PI / 2)
    };
  }
  function placed(geo, w, u, y, v, mat) { geo.rotateY(w.yaw); const [x, z] = w.at(u, v); geo.translate(x, y, z); ib.geo(geo, mat); }
  const roundBox = (wx, hy, dz, r) => { // скруглённый брусок (раковины, ванна, сантехника)
    const s = new THREE.Shape();
    const x0 = -wx / 2, x1 = wx / 2, z0 = -dz / 2, z1 = dz / 2;
    s.moveTo(x0 + r, z0); s.lineTo(x1 - r, z0); s.quadraticCurveTo(x1, z0, x1, z0 + r); s.lineTo(x1, z1 - r); s.quadraticCurveTo(x1, z1, x1 - r, z1);
    s.lineTo(x0 + r, z1); s.quadraticCurveTo(x0, z1, x0, z1 - r); s.lineTo(x0, z0 + r); s.quadraticCurveTo(x0, z0, x0 + r, z0);
    const g = new THREE.ExtrudeGeometry(s, { depth: hy, bevelEnabled: true, bevelThickness: Math.min(0.012, hy * 0.2), bevelSize: Math.min(0.012, r * 0.5), bevelSegments: 3, curveSegments: 6 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, 0);
    return g;
  };
  function vanity(w, u0, u1, y0, sinks = 1) { // тумба венге с ящиками, столешница-кварц, раковины, смесители, зеркало с подсветкой
    w.box(u0, u1, y0 + 0.3, y0 + 0.82, 0, 0.55, MI.wenge, true);
    w.box(u0 + 0.005, u1 - 0.005, y0 + 0.56, y0 + 0.565, 0.55, 0.553, MI.slot);
    w.box(u0, u1, y0 + 0.82, y0 + 0.86, 0, 0.56, MI.counter);
    w.box(u0 + 0.04, u1 - 0.04, y0 + 1.08, y0 + 2.08, 0.02, 0.03, MI.mirror);
    w.box(u0 + 0.06, u1 - 0.06, y0 + 1.06, y0 + 1.07, 0.012, 0.022, MI.led);
    for (let k = 0; k < sinks; k++) {
      const u = u0 + ((k + 0.5) * (u1 - u0)) / sinks;
      placed(roundBox(0.48, 0.13, 0.36, 0.06), w, u, y0 + 0.86, 0.3, MI.porcelain);
      placed(new THREE.CylinderGeometry(0.02, 0.02, 0.006, 12), w, u, y0 + 0.992, 0.3, MI.chrome);
      placed(new THREE.CylinderGeometry(0.018, 0.022, 0.24, 14), w, u, y0 + 0.86, 0.085, MI.chrome);
      const spout = new THREE.CylinderGeometry(0.012, 0.012, 0.14, 10);
      spout.rotateX(Math.PI / 2); spout.translate(0, 0, 0.07);
      placed(spout, w, u, y0 + 1.09, 0.085, MI.chrome);
      w.box(u - 0.008, u + 0.008, y0 + 1.12, y0 + 1.135, 0.06, 0.12, MI.chrome);
    }
    for (let i = 1; i < 3; i++) { const u = u0 + (i * (u1 - u0)) / 3; w.box(u - 0.002, u + 0.002, y0 + 0.31, y0 + 0.81, 0.55, 0.553, MI.slot); }
  }
  function toilet(w, u, y0) { // подвесной унитаз с инсталляцией и клавишей
    const bowl = new THREE.SphereGeometry(0.2, 22, 14);
    bowl.scale(0.92, 0.55, 1.45);
    placed(bowl, w, u, y0 + 0.36, 0.34, MI.porcelain);
    placed(roundBox(0.36, 0.035, 0.52, 0.12), w, u, y0 + 0.44, 0.31, MI.porcelain);
    w.box(u - 0.19, u + 0.19, y0 + 0.2, y0 + 0.47, 0, 0.12, MI.porcelain, true);
    w.box(u - 0.11, u + 0.11, y0 + 0.98, y0 + 1.13, 0, 0.012, MI.chrome);
    w.box(u - 0.002, u + 0.002, y0 + 0.99, y0 + 1.12, 0.012, 0.014, MI.slot);
  }
  function shower(x0, x1, z0, z1, y0, screen) { // поддон в уровень, стеклянная перегородка на петлях, тропическая лейка, трап
    ib.box(x0, x1, y0, y0 + 0.012, z0, z1, MI.bathFloor);
    if (screen) {
      const [along, a0, a1, at] = screen;
      if (along === 'x') ib.box(a0, a1, y0 + 0.012, y0 + 2.0, at - 0.005, at + 0.005, MI.glass); else ib.box(at - 0.005, at + 0.005, y0 + 0.012, y0 + 2.0, a0, a1, MI.glass);
      for (const v of [0.3, 1.7]) { if (along === 'x') ib.box(a0, a0 + 0.06, y0 + v, y0 + v + 0.08, at - 0.012, at + 0.012, MI.chrome); else ib.box(at - 0.012, at + 0.012, y0 + v, y0 + v + 0.08, a0, a0 + 0.06, MI.chrome); }
      if (along === 'x') ib.box(a0, a1, y0 + 1.98, y0 + 2.0, at - 0.01, at + 0.01, MI.chrome); else ib.box(at - 0.01, at + 0.01, y0 + 1.98, y0 + 2.0, a0, a1, MI.chrome);
    }
    const hx = (x0 + x1) / 2, hz = (z0 + z1) / 2;
    const head = new THREE.CylinderGeometry(0.14, 0.14, 0.012, 28);
    head.translate(hx, y0 + 2.2, hz);
    ib.geo(head, MI.chrome);
    ib.box(hx - 0.01, hx + 0.01, y0 + 2.21, CG_TOP_FOR(y0), hz - 0.01, hz + 0.01, MI.chrome);
    ib.box(hx - 0.05, hx + 0.05, y0 + 0.0125, y0 + 0.014, hz - 0.3, hz + 0.3, MI.steel); // щелевой трап
  }
  function wardrobe(along, a0, a1, at, n, y0, depth = 0.6, h = 2.5) { // встроенный шкаф венге с ручками-планками
    const w = onWall(along, at, n);
    w.box(a0, a1, y0, y0 + h, 0, depth, MI.wenge, true);
    const dn = Math.max(1, Math.round((a1 - a0) / 0.6));
    for (let i = 1; i < dn; i++) { const u = a0 + (i * (a1 - a0)) / dn; w.box(u - 0.003, u + 0.003, y0 + 0.02, y0 + h - 0.02, depth, depth + 0.002, MI.slot); }
    w.box(a0, a1, y0, y0 + 0.08, depth - 0.03, depth + 0.001, MI.slot);
    for (let i = 0; i < dn; i++) { const u = a0 + ((i + (i % 2 ? 0.1 : 0.9)) * (a1 - a0)) / dn; w.box(u - 0.009, u + 0.009, y0 + 0.85, y0 + 1.45, depth + 0.012, depth + 0.03, MI.steel); w.box(u - 0.006, u + 0.006, y0 + 0.87, y0 + 0.9, depth, depth + 0.013, MI.steel); w.box(u - 0.006, u + 0.006, y0 + 1.4, y0 + 1.43, depth, depth + 0.013, MI.steel); }
  }
  const CG_TOP_FOR = (y0) => (y0 < F1 - 0.5 ? F0 + 2.7 : F1 + 2.7);
  function socket(along, a, y, t, s) { // розетка/выключатель: рамка и клавиши
    const d0 = s > 0 ? t : t - 0.01, d1 = s > 0 ? t + 0.01 : t;
    if (along === 'x') { ib.box(a - 0.043, a + 0.043, y - 0.043, y + 0.043, d0, d1, MI.plastic); ib.box(a - 0.03, a + 0.03, y - 0.03, y + 0.03, s > 0 ? d1 : d0 - 0.003, s > 0 ? d1 + 0.003 : d0, MI.plastic); }
    else { ib.box(d0, d1, y - 0.043, y + 0.043, a - 0.043, a + 0.043, MI.plastic); ib.box(s > 0 ? d1 : d0 - 0.003, s > 0 ? d1 + 0.003 : d0, y - 0.03, y + 0.03, a - 0.03, a + 0.03, MI.plastic); }
  }

  // ===================================================================================================================
  // ---------- окружение: гольф, озеро, улица ----------
  ground(rectXZ(-460, PX0 - 0.27, -360, 360), 0.004, M.rough);
  const fairways = [
    [[-48, -40], [-120, -70], [-215, -60], [-250, -10], [-210, 40], [-120, 52], [-60, 30], [-44, -5]],
    [[-70, 60], [-150, 75], [-240, 95], [-260, 140], [-180, 150], [-90, 120], [-60, 90]],
    [[-260, -120], [-330, -110], [-360, -40], [-300, 0], [-262, -40]]
  ];
  for (const f of fairways) ground(f, 0.012, M.fairway);
  // грин с флажком и лункой (за большой акацией, ~90 м)
  const greenPts = [];
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; greenPts.push([-104 + Math.cos(a) * 13 * (1 + 0.12 * Math.sin(a * 3)), 14 + Math.sin(a) * 9]); }
  ground(greenPts, 0.016, M.green);
  EB.cyl(-102, 0.0, 15, 0.054, 0.02, M.cup, 16);
  EB.cyl(-102, 0.0, 15, 0.012, 2.25, M.white, 8);
  { const flag = new THREE.PlaneGeometry(0.5, 0.34); flag.translate(-102 + 0.25, 2.05, 15); EB.geo(flag, M.flag); }
  for (const b of [[-58, 8, 7, 3.5], [-92, -42, 9, 4], [-140, 30, 6, 3], [-44, -22, 5, 2.5], [-205, 70, 8, 3.5], [-118, 22, 4.5, 2.2]]) {
    const pts = [];
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; pts.push([b[0] + Math.cos(a) * b[2] * (0.85 + 0.3 * Math.sin(a * 3)), b[1] + Math.sin(a) * b[3]]); }
    ground(pts, 0.02, M.sand);
  }
  // дорожка для гольф-каров: бетонная лента вдоль рафа
  {
    const curve = new THREE.CatmullRomCurve3([[-36, -60], [-40, -30], [-38, -6], [-43, 18], [-41, 44], [-46, 70]].map(([x, z]) => new V3(x, 0, z)));
    const n = 120, w = 1.3, pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const p = curve.getPointAt(i / n), t = curve.getTangentAt(i / n), q = new V3(-t.z, 0, t.x);
      pos.push(p.x + q.x * w, 0.02, p.z + q.z * w, p.x - q.x * w, 0.02, p.z - q.z * w);
      if (i < n) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    EB.geo(g, M.concrete);
  }
  // холмики с сухой травой у ограды (видео с балкона): гладкие купола, трава по поверхности
  const mounds = [[-26, -4, 5, 3, 0.7], [-29, 9, 6, 3.5, 0.9], [-33, -16, 7, 4, 1.0], [-24.5, 15, 4, 3, 0.6], [-38, 2, 6, 4, 0.8], [-25, -12, 3.5, 2.5, 0.5], [-58, -24, 10, 5, 1.1], [-70, 40, 9, 5, 1.0]];
  const moundH = (x, z) => { let h = 0; for (const [mx, mz, sx, sz, mh] of mounds) { const d = ((x - mx) / sx) ** 2 + ((z - mz) / sz) ** 2; if (d < 1) h = Math.max(h, mh * Math.sqrt(1 - d)); } return h; };
  {
    const geo = new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    for (const [x, z, sx, sz, h] of mounds) {
      const g = geo.clone();
      g.scale(sx, h, sz);
      g.translate(x, 0, z);
      EB.geo(g, M.rough);
    }
  }
  const plants = makePlants(THREE, { T, quality });
  let grassPoints = [];
  // пучки сухой травы на рафе между оградой и полем и на холмиках
  {
    const items = [];
    const n = hi ? 9000 : 2600;
    for (let i = 0; i < n; i++) {
      const x = PX0 - 0.6 - Math.pow(rnd(), 0.7) * 24, z = (rnd() - 0.5) * 80;
      const onFair = x < -44 && Math.abs(z) < 30;
      if (onFair) continue;
      const tone = rnd(), hgt = 0.35 + rnd() * 0.55;
      items.push([x, moundH(x, z), z, hgt * (1 + moundH(x, z) * 0.2), 0.35 + rnd() * 0.35, tone]);
    }
    for (const [mx, mz, sx, sz] of mounds) for (let i = 0; i < (hi ? 260 : 80); i++) {
      const a = rnd() * 6.28, d = Math.sqrt(rnd()) * 0.95, x = mx + Math.cos(a) * sx * d, z = mz + Math.sin(a) * sz * d;
      items.push([x, moundH(x, z) - 0.03, z, 0.45 + rnd() * 0.5, 0.4 + rnd() * 0.3, 0.2 + rnd() * 0.8]);
    }
    plants.tufts(items);
    grassPoints = items;
  }
  // озеро на северо-западе: с балкона видно слева от большой акации, за ним — ряд вилл на другой стороне поля
  const lake = [[-78, -24], [-96, -30], [-124, -26], [-150, -38], [-162, -60], [-148, -82], [-118, -90], [-92, -78], [-80, -56], [-72, -38]];
  ground(lake.map(([x, z]) => [x + Math.sign(x + 115) * 3, z + Math.sign(z + 57) * 3]), 0.014, M.sand);
  ground(lake, 0.03, M.water);
  // прожекторы поля: конический столб, траверса и две головы (видны на видео с балкона)
  function floodlight(x, z, h) {
    EB.cyl(x, 0, z, 0.24, h, M.pole, 14, 0.12);
    EB.box(x - 0.9, x + 0.9, h - 0.12, h, z - 0.06, z + 0.06, M.pole);
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.6, 0.38, 0.32);
      g.rotateX(-0.5);
      g.translate(x + s * 0.6, h + 0.18, z);
      EB.geo(g, M.steel);
    }
  }
  floodlight(-44, -10, 18);
  floodlight(-71, 24, 18);
  floodlight(-102, -64, 18);
  floodlight(-150, 12, 18);
  floodlight(-128, 56, 18);
  // ряд вилл на другой стороне поля: белые объёмы, тёмные полосы окон, парапеты (на видео вдали)
  for (let z = -230; z <= 230; z += 19) {
    const x = -285 - Math.abs(z) * 0.12, h = 7.5 + (Math.round(z / 19) % 2 ? 0.6 : 0);
    EB.box(x - 13, x + 13, 0, 4.0, z - 5.6, z + 5.6, M.neighbor);
    EB.box(x - 13.6, x + 11, 4.0, h, z - 5.2, z + 5.2, M.neighbor);
    EB.box(x - 13.62, x - 13.55, 0.5, 3.4, z - 4.6, z + 4.6, glassFar);
    EB.box(x - 13.65, x - 13.58, 4.5, h - 0.6, z - 3.8, z + 3.8, glassFar);
    EB.box(x - 13.7, x + 11, h - 0.15, h, z - 5.3, z + 5.3, M.dark);
  }
  // улица со стороны гаража: асфальт, бордюры, тротуар у участка, разметка, фонари
  ground(rectXZ(PX1 + 1.6, PX1 + 9.6, -140, 140), 0.01, M.asphalt);
  EB.box(PX1, PX1 + 1.6, 0, 0.12, -140, 140, M.pavers);
  EB.box(PX1 + 1.45, PX1 + 1.6, 0, 0.14, -140, 140, M.kerb);
  EB.box(PX1 + 9.6, PX1 + 9.75, 0, 0.14, -140, 140, M.kerb);
  EB.box(PX1 + 9.75, PX1 + 11.2, 0, 0.12, -140, 140, M.pavers);
  for (let z = -136; z < 140; z += 6) EB.box(PX1 + 5.55, PX1 + 5.65, 0.011, 0.016, z, z + 3, M.paint);
  for (let z = -125; z <= 125; z += 25) { // фонари
    const x = PX1 + 1.0;
    EB.cyl(x, 0.12, z, 0.07, 6.0, M.steel, 10, 0.05);
    EB.box(x, x + 1.2, 6.05, 6.12, z - 0.04, z + 0.04, M.steel);
    EB.box(x + 0.9, x + 1.45, 5.98, 6.1, z - 0.13, z + 0.13, M.steel);
    EB.box(x + 0.95, x + 1.4, 5.97, 5.98, z - 0.1, z + 0.1, M.lamp);
  }
  walkOn(PX1, PX1 + 11.2, -60, 60, 0.0);
  walkOn(PX1, PX1 + 1.6, -60, 60, 0.12);

  // ---------- деревья ----------
  // ближние деревья за оградой у гольфа — по видео с балкона и фото гостиной
  plants.acacia(-24.4, -0.9, 6.8, 3.7, 1);   // большая акация почти напротив балкона
  plants.acacia(-23.7, 6.4, 5.3, 2.9, 2);    // акация слева на фото гостиной
  plants.acacia(-26.8, -12.6, 5.8, 3.2, 3);
  plants.acacia(-27.6, 14.8, 5.0, 2.7, 4);
  plants.acacia(-31.0, -3.5, 4.2, 2.2, 5);
  plants.palm(-29.2, 3.6, 8.6, 0.03, 1);     // пальма по центру вида из гостиной
  plants.palm(-34.5, -7.4, 7.6, -0.04, 2);
  plants.palm(-31.5, 18.5, 9.0, 0.05, 3);
  for (let i = 0; i < 10; i++) plants.acacia(-46 - rnd() * 40, -70 + i * 15 + rnd() * 6, 4.5 + rnd() * 2, 2.4 + rnd(), 10 + i, 1);
  for (let i = 0; i < 6; i++) plants.palm(-60 - rnd() * 60, -50 + i * 22 + rnd() * 8, 8 + rnd() * 3, 0.03, 20 + i, 1);
  for (const [x, z, r, h, s] of [[-22.6, -6.2, 0.9, 1.1, 1], [-22.8, 2.6, 1.1, 1.3, 2], [-22.4, 10.8, 0.8, 1.0, 3], [-23.2, -15.5, 1.0, 1.2, 4], [-22.9, 5.2, 0.6, 1.6, 5]]) plants.shrub(x, z, r, h, s);
  plants.palm(-9.5, -11.4, 7.0, 0.02, 7);       // пальма у соседа за северной стеной (видна на фото фасада)
  plants.palm(-3.5, 12.6, 6.4, 0.03, 8);
  for (const c of plants.colliders) physData.colliders.push(c);

  // ===================================================================================================================
  // ---------- участок: двор, дорожки, ограды ----------
  ground(rectXZ(PX0, PX1, PZ0, PZ1), 0.02, M.gravel);                       // двор не озеленён: серый гравий (фото)
  ground(rectXZ(-15.6, -5.31, ZN - 0.04, -4.59), 0.03, M.pavers);           // под нависанием 2-го этажа
  ground(rectXZ(-16.5, PX1, -7.25, ZN), 0.032, M.pavers);                   // дорожка вдоль северной стороны к входу
  PB.box(-16.5, PX1, 0, 0.06, -7.33, -7.25, M.kerb);                        // бордюр дорожки
  ground(rectXZ(12.24, 13.65, -4.86, 0.9), 0.025, M.soil);                  // грядка у гостевой спальни
  ground(rectXZ(13.8, PX1, 0.9, PZ1), 0.034, M.pavers);                     // навес для двух машин
  ground(rectXZ(15.9, PX1, PZ0, -1.1), 0.035, M.lawn);                      // газон у улицы
  ground(rectXZ(13.65, PX1, -1.1, 0.9), 0.034, M.pavers);
  // бетонная терраса у витража гостиной с подступенком у раздвижной двери (фото фасада)
  PB.box(-15.0, XW, 0, 0.15, -4.585, ZS, M.concrete);
  PB.box(-15.42, -15.0, 0, 0.075, -3.0, -1.5, M.concrete);
  walkOn(-15.0, XW, -4.59, ZS, 0.15);
  walkOn(-15.42, -15.0, -3.0, -1.5, 0.075);
  // задняя ограда к гольфу: низкая стенка, чёрная решётка с пиками, бежевые столбы с шапками (фото гостиной)
  PB.box(PX0 - 0.27, PX0, 0, 0.5, PZ0 - 0.27, PZ1 + 0.27, M.render);
  PB.box(PX0 - 0.3, PX0 + 0.03, 0.5, 0.56, PZ0 - 0.25, PZ1 + 0.25, M.cap);
  for (let z = PZ0; z <= PZ1 + 0.01; z += (PZ1 - PZ0) / 6) { PB.box(PX0 - 0.32, PX0 + 0.05, 0, 1.6, z - 0.18, z + 0.18, M.render); PB.box(PX0 - 0.35, PX0 + 0.08, 1.6, 1.66, z - 0.21, z + 0.21, M.cap); }
  PB.box(PX0 - 0.16, PX0 - 0.11, 1.42, 1.46, PZ0, PZ1, M.frame);
  PB.box(PX0 - 0.16, PX0 - 0.11, 0.62, 0.66, PZ0, PZ1, M.frame);
  for (let z = PZ0 + 0.06; z < PZ1; z += 0.13) {
    PB.box(PX0 - 0.148, PX0 - 0.122, 0.56, 1.5, z - 0.011, z + 0.011, M.frame);
    const tip = new THREE.ConeGeometry(0.018, 0.05, 6); tip.translate(PX0 - 0.135, 1.525, z); PB.geo(tip, M.frame);
  }
  col(PX0 - 0.3, PX0 + 0.05, 0, 1.6, PZ0 - 0.3, PZ1 + 0.3);
  // боковые стены к соседям 2,0 м с пилястрами, у улицы — 1,0 м; светильники на столбах у улицы
  for (const [z0, z1] of [[-8.43, PZ0], [PZ1, 8.52]]) {
    wall(PB, 'x', PX0 - 0.27, 13.8, 0, 2.0, z0, z1, [], M.render);
    PB.box(PX0 - 0.27, 13.8, 2.0, 2.06, z0 - 0.025, z1 + 0.025, M.cap);
    for (let x = PX0 + 3; x < 13.5; x += 3.4) { PB.box(x - 0.2, x + 0.2, 0, 2.12, z0 - 0.06, z1 + 0.06, M.render); PB.box(x - 0.23, x + 0.23, 2.12, 2.17, z0 - 0.09, z1 + 0.09, M.cap); }
    wall(PB, 'x', 13.8, PX1, 0, 1.0, z0, z1, [], M.render);
    PB.box(13.8, PX1, 1.0, 1.06, z0 - 0.025, z1 + 0.025, M.cap);
    PB.box(PX1 - 0.4, PX1, 0, 1.5, z0 - 0.08, z1 + 0.08, M.render);
    PB.box(PX1 - 0.43, PX1 + 0.03, 1.5, 1.56, z0 - 0.11, z1 + 0.11, M.cap);
    PB.box(PX1 - 0.3, PX1 - 0.1, 1.56, 1.8, (z0 + z1) / 2 - 0.1, (z0 + z1) / 2 + 0.1, M.lamp);
  }
  // ниши для счётчиков у южной стены с дверцами
  for (const [x0, x1] of [[-2.58, -0.3], [17.91, 20.19]]) {
    PB.box(x0, x1, 0, 1.8, 7.32, PZ1, M.render);
    PB.box(x0 + 0.15, (x0 + x1) / 2 - 0.01, 0.1, 1.6, 7.3, 7.32, M.dark);
    PB.box((x0 + x1) / 2 + 0.01, x1 - 0.15, 0.1, 1.6, 7.3, 7.32, M.dark);
    for (const x of [(x0 + x1) / 2 - 0.06, (x0 + x1) / 2 + 0.04]) PB.box(x, x + 0.02, 0.8, 0.95, 7.285, 7.3, M.stainless);
    col(x0, x1, 0, 1.8, 7.32, PZ1);
  }
  // навес для машин: тёмный стальной каркас, прогоны, плоская кровля, светильники снизу
  for (const [x, z] of [[19.7, 1.2], [19.7, 7.9], [14.1, 7.9]]) { PB.box(x - 0.09, x + 0.09, 0, 2.95, z - 0.09, z + 0.09, M.steel); PB.box(x - 0.16, x + 0.16, 0, 0.012, z - 0.16, z + 0.16, M.steel); col(x - 0.12, x + 0.12, 0, 2.95, z - 0.12, z + 0.12); }
  PB.box(13.8, 19.9, 2.86, 3.0, 1.0, 1.2, M.steel);
  PB.box(13.8, 19.9, 2.86, 3.0, 7.8, 8.0, M.steel);
  PB.box(19.6, 19.8, 2.86, 3.0, 1.0, 8.1, M.steel);
  for (let x = 14.4; x < 19.6; x += 0.9) PB.box(x - 0.04, x + 0.04, 2.9, 3.0, 1.0, 8.1, M.steel);
  PB.box(13.8, 19.9, 3.0, 3.1, 1.0, 8.1, M.steel);
  PB.box(13.8, 19.9, 3.1, 3.13, 1.0, 8.1, M.dark);
  for (const [x, z] of [[15.5, 3.0], [18.2, 3.0], [15.5, 6.0], [18.2, 6.0]]) { const d = new THREE.CircleGeometry(0.08, 16); d.rotateX(Math.PI / 2); d.translate(x, 2.895, z); PB.geo(d, M.lamp); }
  walkOn(PX0, PX1 + 9.6, PZ0, PZ1, 0.0);

  // ---------- соседи: тот же тип VD-1 (копии нашей оболочки), газоны, бассейн и пергола у северного соседа ----------
  function neighborYard(dz, pool) {
    ground(rectXZ(PX0, PX1, -8.16 + dz, 8.25 + dz), 0.02, M.lawn);
    PB.box(-15.0, XW, 0, 0.15, -4.585 + dz, ZS + dz, M.concrete);
    wall(PB, 'x', PX0 - 0.27, PX1, 0, 2.0, (dz < 0 ? -8.43 : 8.25) + dz, (dz < 0 ? -8.16 : 8.52) + dz, [], M.render, null, false);
    PB.box(PX0 - 0.27, PX0, 0, 0.5, PZ0 + dz, PZ1 + dz, M.render);
    PB.box(PX0 - 0.16, PX0 - 0.11, 1.42, 1.46, PZ0 + dz, PZ1 + dz, M.frame);
    for (let z = PZ0 + 0.06; z < PZ1; z += 0.26) PB.box(PX0 - 0.148, PX0 - 0.122, 0.5, 1.46, z + dz - 0.011, z + dz + 0.011, M.frame);
    if (pool) {
      const [px0, px1, pz0, pz1] = pool;
      PB.box(px0 - 0.6, px1 + 0.6, 0, 0.06, pz0 - 0.6, pz1 + 0.6, M.cap);
      ground(rectXZ(px0, px1, pz0, pz1), 0.065, M.poolWater);
      const gx0 = px1 - 2.3, gx1 = px1 + 0.4; // белая пергола над краем бассейна у дома (видна с балкона справа внизу)
      for (const [x, z] of [[gx0, pz0 - 0.4], [gx0, pz1 + 0.4], [gx1, pz0 - 0.4], [gx1, pz1 + 0.4]]) PB.box(x - 0.08, x + 0.08, 0, 2.7, z - 0.08, z + 0.08, M.white);
      PB.box(gx0 - 0.1, gx1 + 0.1, 2.62, 2.78, pz0 - 0.5, pz1 + 0.5, M.white);
      for (let x = gx0; x <= gx1; x += 0.12) PB.box(x - 0.025, x + 0.025, 2.78, 2.84, pz0 - 0.5, pz1 + 0.5, M.oak);
    }
  }
  neighborYard(-16.95, [-19.8, -14.6, -12.6, -9.3]);   // бассейн соседа у нашей стены (видео с балкона)
  neighborYard(16.95, null);
  for (const dz of [-33.9, 33.9]) neighborYard(dz, null);
  // дома через улицу (тот же тип, развёрнуты к улице) — газоны и ограды
  const across = [];
  for (let k = -5; k <= 5; k++) across.push(k * 16.95);
  for (const z of across) {
    ground(rectXZ(PX1 + 11.2, PX1 + 52.6, z - 8.2, z + 8.2), 0.02, M.lawn);
    PB.box(PX1 + 11.2, PX1 + 11.6, 0, 1.0, z - 8.2, z - 7.9, M.render);
  }

  // ===================================================================================================================
  // ---------- дом: перекрытия ----------
  B.box(XW, 12.24, 0, F0, -4.59, ZS, M.render);
  B.box(-5.31, 0.15, 0, F0, ZN, -4.59, M.render);
  B.box(0.15, 12.24, 0, F0, ZN, -4.59, M.render);
  B.box(12.24, 13.795, 0, F0, 0.905, ZS - 0.005, M.render);
  // крыльцо: ступень с дорожки и пол под двухсветным порталом
  B.box(0.87, 4.35, 0, F0 - 0.15, ZN - 0.36, ZN, M.concrete);
  walkOn(0.87, 4.35, ZN - 0.36, ZN, F0 - 0.15);
  walkOn(0.87, 4.35, ZN, -2.36, F0);
  ib.box(0.87, 4.35, F0, F0 + 0.006, ZN, -2.36, MI.bathFloor);
  // плита 2-го этажа (снаружи — бежевая кромка с теневым швом)
  const slab = (x0, x1, z0, z1) => { B.box(x0 + 0.005, x1 - 0.005, F1 - 0.35, F1, z0 + 0.005, z1 - 0.005, M.renderShade); }; // кромку, где есть стена, закрывает стена
  slab(XB, 0.87, ZN, ZS);
  slab(4.26, XE1, ZN, ZS);
  slab(XE1, XEB, 0.9, ZS);
  slab(XE1, XEB, ZN, zf(-0.457));
  walkOn(XWF, 0.87, ZN, ZS, F1);
  walkOn(0.87, 4.26, -0.62, ZT, F1);
  walkOn(4.26, XE1, ZN, ZS, F1);
  walkOn(XB, XWF, zf(-4.58), zf(0.614), F1);
  walkOn(XE1, XEB, ZN, zf(-0.602), F1);
  walkOn(XE1, XEB, zf(1.03), ZS, F1);
  // крыша: плита, парапет-рама с отливом-капельником, кондиционеры с вентиляторами, бак, выход на крышу
  B.box(XB, XEB, C1_TOP, ROOF, ZN, ZS, M.render);
  wall(B, 'x', XB, XEB, ROOF, PARA, ZN, ZN + 0.25, [], M.render, null, false);
  wall(B, 'x', XB, XEB, ROOF, PARA, ZS - 0.25, ZS, [], M.render, null, false);
  wall(B, 'z', ZN + 0.25, ZS - 0.25, ROOF, PARA, XB, XB + 0.25, [], M.render, null, false);
  wall(B, 'z', ZN + 0.25, ZS - 0.25, ROOF, PARA, XEB - 0.25, XEB, [], M.render, null, false);
  for (const [x0, x1, z0, z1] of [[XB - 0.03, XEB + 0.03, ZN - 0.03, ZN + 0.28], [XB - 0.03, XEB + 0.03, ZS - 0.28, ZS + 0.03], [XB - 0.03, XB + 0.28, ZN + 0.28, ZS - 0.28], [XEB - 0.28, XEB + 0.03, ZN + 0.28, ZS - 0.28]]) B.box(x0, x1, PARA, PARA + 0.05, z0, z1, M.cap);
  B.box(XB + 0.25, XEB - 0.25, ROOF, ROOF + 0.02, ZN + 0.25, ZS - 0.25, M.concrete);        // гидроизоляция с бетонной стяжкой
  for (let i = 0; i < 5; i++) {
    const x0 = 3 + i * 1.3;
    B.box(x0, x0 + 0.95, ROOF + 0.02, ROOF + 0.85, 2.2, 2.6, M.ac);
    const fan = new THREE.CylinderGeometry(0.27, 0.27, 0.012, 24); fan.rotateX(Math.PI / 2); fan.translate(x0 + 0.475, ROOF + 0.45, 2.193); B.geo(fan, M.acDark);
    for (let k = -0.24; k <= 0.24; k += 0.06) HD.box(x0 + 0.2, x0 + 0.75, ROOF + 0.45 + k - 0.004, ROOF + 0.45 + k + 0.004, 2.186, 2.19, M.ac);
    B.box(x0 + 0.1, x0 + 0.85, ROOF + 0.02, ROOF + 0.08, 2.6, 2.8, M.acDark);
  }
  { const tank = new THREE.CylinderGeometry(0.65, 0.65, 1.5, 24); tank.translate(-2.5, ROOF + 0.77, 3.0); B.geo(tank, M.ac); B.box(-3.2, -1.8, ROOF + 0.02, ROOF + 0.1, 2.3, 3.7, M.steel); }
  B.box(6.5, 7.6, ROOF, ROOF + 1.0, -2.0, -1.0, M.render);
  B.box(6.5, 7.6, ROOF + 1.0, ROOF + 1.05, -2.05, -0.95, M.cap);

  // ---------- дом: 1-й этаж, наружные стены ----------
  const IN = (s) => [MI.wall, s];
  // северная стена гостиной и пилон у гольфа в камне со светильником-полусферой (фото фасада)
  wall(B, 'x', -12.84, -5.31, F0 - 0.3, F1 - 0.35, -4.59, -4.32, [], M.render, IN(1), true, [1]);
  B.box(-14.04, -12.84, 0, F1 - 0.35, -4.59, -4.02, M.stone);
  col(-14.04, -12.84, 0, F1, -4.59, -4.02);
  { const lan = new THREE.SphereGeometry(0.12, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); lan.rotateZ(Math.PI / 2); lan.scale(0.6, 1, 1); lan.translate(-14.04, 1.9, -4.3); HD.geo(lan, M.lamp); HD.box(-14.06, -14.04, 1.76, 2.04, -4.44, -4.16, M.stainless); }
  // эркер малой гостиной с витражом к входной дорожке
  wall(B, 'z', ZN, -4.32, F0 - 0.3, F1 - 0.35, -5.31, -5.0, [], M.render, IN(1), true, [1]);
  wall(B, 'x', -5.0, -3.24, F0 - 0.3, F1 - 0.35, ZN, -4.92, [], M.render, IN(1), true, [1]);
  wall(B, 'x', -3.24, 0.15, CG, F1 - 0.35, ZN, -4.92, [], M.render, IN(1), false);
  glazing('x', -3.24, 0.15, -5.06, F0, CG, 3, [F0 + 2.45], -1);
  // стена-пилон слева от крыльца (до крыши) и стена справа (санузлы)
  wall(B, 'z', ZN, -2.28, 0, ROOF, 0.15, 0.87, [], M.render, null);
  wall(B, 'z', ZN, -0.57, 0, F1 - 0.35, 4.35, 4.62, [], M.render, IN(1), true, [1]);
  // санузел и умывальная у входа: стена к дорожке с узким окном
  wall(B, 'x', 4.62, 6.54, F0 - 0.3, F1 - 0.35, ZN, -4.86, [[5.76, 6.4, F0 + 1.75, F0 + 2.55]], M.render, IN(1));
  glazing('x', 5.76, 6.4, -5.03, F0 + 1.75, F0 + 2.55, 1, [], -1);
  // гостевая спальня: глухая стена к дорожке, окно в пол к восточной грядке
  wall(B, 'x', 6.54, 12.24, F0 - 0.3, F1 - 0.35, -4.86, -4.56, [], M.render, IN(1), true, [1]);
  wall(B, 'z', -4.86, 1.2, F0 - 0.3, F1 - 0.35, 11.94, 12.24, [[-3.18, -0.69, F0, CG], [0.39, 0.99, F0 + 1.7, F0 + 2.6]], M.render, IN(-1), true, [-1]);
  glazing('z', -3.18, -0.69, 12.09, F0, CG, 2, [F0 + 2.45], 1);
  glazing('z', 0.39, 0.99, 12.09, F0 + 1.7, F0 + 2.6, 1, [], 1);
  // комната водителя у навеса: кирпичная облицовка снаружи
  wall(B, 'x', 12.24, 13.5, F0 - 0.3, F1 - 0.35, 0.9, 1.2, [], M.render, IN(1), true, [1]);
  wall(B, 'z', 0.9, ZS, F0 - 0.3, F1 - 0.35, 13.5, 13.8, [], M.brick, IN(-1), true, [-1]);
  // южная стена: столовая, кухня (дверь и окно над мойкой), лестничный витраж, кладовая, прислуга, водитель
  wall(B, 'x', -11.58, 0.87, F0 - 0.3, F1 - 0.35, 4.98, ZS, [[-4.23, -3.24, F0, F0 + 2.4], [-2.85, -0.3, F0 + 1.05, F0 + 2.55]], M.render, IN(-1), true, [-1]);
  glazing('x', -2.85, -0.3, 5.12, F0 + 1.05, F0 + 2.55, 2, [], 1, { sill: false });
  wall(B, 'x', 4.26, 13.5, F0 - 0.3, F1 - 0.35, 4.98, ZS, [[6.81, 7.5, F0 + 0.9, F0 + 2.6], [12.36, 13.35, F0, F0 + 2.3]], M.render, IN(-1), true, [-1]);
  glazing('x', 6.81, 7.5, 5.12, F0 + 0.9, F0 + 2.6, 1, [], 1);
  hingedDoor('x', -4.23, -3.24, F0, 2.4, 4.98, ZS, -1, 0, { label: 'дверь кухни во двор' });
  hingedDoor('x', 12.36, 13.35, F0, 2.3, 4.98, ZS, -1, 1, { label: 'дверь водителя' });
  for (const [a0, a1] of [[-4.23, -3.24], [12.36, 13.35]]) { PB.box(a0 - 0.15, a1 + 0.15, 0, 0.15, ZS, ZS + 0.4, M.concrete); walkOn(a0 - 0.15, a1 + 0.15, ZS, ZS + 0.4, 0.15); } // ступень 15 см
  // витраж гостиной к гольфу: две секции по сторонам колонны, фрамуга; угловое остекление к югу
  glazing('z', -4.02, ZS, XW, F0, CG, [-4.02, -2.84, -1.66, -0.48, 0.7, 1.84, 2.98, 4.12, 5.25], [F0 + 2.55], -1, { bar: 0.07, open: [-2.84, -1.66], doorTop: F0 + 2.55, label: 'раздвижная дверь на террасу' });
  glazing('x', XW + 0.002, -11.58, 5.12, F0, CG, 1, [F0 + 2.55], 1, { bar: 0.07 });
  B.box(XW, -11.58, CG, F1 - 0.35, 4.98, ZS, M.render);
  B.box(XW - 0.15, XW + 0.15, CG, F1 - 0.35, -4.02, ZS, M.render);       // ригель над витражом
  { const c = new THREE.CylinderGeometry(0.19, 0.19, CG - F0, 32); c.translate(-12.72, (CG + F0) / 2, 0.7); ib.geo(c, MI.wall); col(-12.92, -12.52, F0, CG, 0.5, 0.9); ib.cyl(-12.72, F0, 0.7, 0.2, 0.1, MI.skirt, 32); }

  // ---------- дом: вход ----------
  // двухсветный витраж у входа (от пола до крыши) с поворотной медно-ржавой дверью на оси
  glazing('x', 0.87, 2.7, -2.36, F0, F0 + 3.05, 1, [F0 + 2.55], -1);
  glazing('x', 0.87, 4.35, -2.36, F0 + 3.05, C1_TOP, [0.87, 2.03, 3.19, 4.35], [F1 + 0.5, F1 + 1.9], -1);
  B.box(2.7, 4.35, F0 + 3.0, F0 + 3.1, -2.42, -2.3, M.frame);
  B.box(4.05, 4.35, F0, F0 + 3.05, -2.42, -2.3, M.frame);
  B.box(2.7, 2.76, F0, F0 + 3.0, -2.42, -2.3, M.frame);
  {
    const pivot = doorParts('entry');
    pivot.position.set(3.75, 0, -2.36);
    const eb = makeBatch('entry');
    const P = (x0, x1, y0, y1, z0, z1, mat) => eb.geo(boxGeo(x0, x1, y0, y1, z0, z1), mat);
    P(-1.025, 0.285, F0 + 0.005, F0 + 2.995, -0.035, 0.035, M.rust);
    for (let k = 1; k < 6; k++) P(-1.02, 0.28, F0 + k * 0.5 - 0.003, F0 + k * 0.5 + 0.003, -0.037, 0.037, M.frame); // фрезерованные швы
    for (const s of [-1, 1]) { // длинные ручки-скобы на стойках с обеих сторон
      P(-0.9, -0.86, F0 + 0.6, F0 + 2.2, s * 0.075, s * 0.075 + s * 0.035, M.frame);
      for (const y of [F0 + 0.7, F0 + 2.1]) P(-0.893, -0.867, y - 0.013, y + 0.013, s * 0.035, s * 0.078, M.frame);
    }
    P(-0.03, 0.03, F0 - 0.004, F0 + 0.005, -0.03, 0.03, M.stainless);
    eb.flush(pivot);
    add(pivot);
    doors.push({ kind: 'pivot', obj: pivot, handles: [], along: 'x', dirA: -1, plan: 1, n: [0, 1], center: [3.4, F0, -2.36], reach: 2.6, time: 1.6, maxAngle: 1.42, collider: [2.72, F0, -2.42, 4.05, F0 + 3, -2.3], sides: [1, -1], p: 0, target: 0, hold: 0, sign: 1, label: 'входная дверь' });
  }
  NB.box(2.725, 4.055, F0, F0 + 3.0, -2.395, -2.325, M.rust);                 // у соседей входная дверь закрыта
  NB.box(-4.2, -3.27, F0, F0 + 2.38, 5.0, 5.04, MI.wenge);
  NB.box(12.39, 13.32, F0, F0 + 2.28, 5.0, 5.04, MI.wenge);
  // табличка с номером и видеодомофон у входа, навесной светильник
  HD.box(0.87, 0.9, F0 + 1.35, F0 + 1.55, -3.0, -2.86, M.stainless);
  HD.box(0.87, 0.89, F0 + 1.38, F0 + 1.42, -2.95, -2.91, MI.blackGlass);
  for (const z of [-4.4, -3.2]) { const d = new THREE.CircleGeometry(0.08, 16); d.rotateX(Math.PI / 2); d.translate(2.6, C1_TOP - 0.005, z); HD.geo(d, M.lamp); }

  // ---------- дом: 2-й этаж, наружные стены ----------
  const RG = { batch: B, glass: M.railGlass, rail: M.frame };
  wall(B, 'x', XB, 0.87, FW, C1_TOP, ZN, zf(-4.80), [], M.render, IN(1), true, [1]);
  wall(B, 'x', 4.26, XE1, FW, C1_TOP, ZN, zf(-4.80), [], M.render, IN(1), true, [1]);
  B.box(XB, -12.31, F1, C1_TOP, zf(-4.80), zf(-4.58), M.render);
  B.box(-12.93, -12.31, F1, C1_TOP, zf(-4.58), zf(-4.05), M.render);
  col(XB, -12.31, F1, C1_TOP, ZN, zf(-4.05));
  wall(B, 'x', XWF - 0.17, 0.868, FW, C1_TOP, zf(4.83), ZS, [[-7.22, -6.55, F1 + 1.4, F1 + 2.6], [-3.21, -0.62, F1, C1]], M.render, IN(-1), true, [-1]);
  glazing('x', -7.22, -6.55, ZS - 0.12, F1 + 1.4, F1 + 2.6, 1, [], 1);
  glazing('x', -3.21, -0.62, ZS - 0.12, F1, C1, 2, [F1 + 2.45], 1);
  railing('x', -3.21, -0.62, ZS + 0.06, F1, RG);
  wall(B, 'x', 4.26, XE1, FW, C1_TOP, zf(4.83), ZS, [], M.render, IN(-1), true, [-1]);
  B.box(XB, XWF - 0.17, F1, C1_TOP, zf(4.83), ZS, M.render);
  col(XB, XWF - 0.17, F1, C1_TOP, zf(4.83), ZS);
  glazing('z', zf(-4.05), zf(0.614), XWF, F1, C1, 4, [F1 + 2.5], -1, { open: [zf(-4.05) + 2 * (zf(0.614) - zf(-4.05)) / 4, zf(-4.05) + 3 * (zf(0.614) - zf(-4.05)) / 4], doorTop: F1 + 2.5, label: 'дверь на балкон спальни хозяина' });
  wall(B, 'z', zf(-4.05), zf(0.614), C1, C1_TOP, XWF - 0.17, XWF + 0.12, [], M.render, IN(1), false);
  wall(B, 'z', zf(0.614), zf(0.78), F1, C1_TOP, XWF - 0.17, XWF + 0.12, [], M.render, IN(1));
  wall(B, 'z', zf(0.78), zf(4.83), C1, C1_TOP, XWF - 0.17, XWF + 0.12, [], M.render, IN(1), false);
  glazing('z', zf(0.78), zf(4.83), XWF, F1 + 0.05, C1, 2, [F1 + 1.6], -1);
  B.box(XB + 0.005, XB + 0.06, F1, F1 + 0.95, zf(0.78), zf(4.83), M.dark);
  col(XB, XWF - 0.17, F1, F1 + 1.1, zf(0.7), zf(4.83));
  B.box(XB + 0.005, XWF - 0.17, C1_TOP - 0.06, C1_TOP, zf(-4.80), zf(4.83), M.dark);
  B.box(XB + 0.005, XWF - 0.17, F1, C1_TOP - 0.06, zf(-4.80), zf(-4.80) + 0.02, M.dark); // тёмные панели в глубине рамы
  for (const z of [-2.4, 0.9, 3.6]) { const d = new THREE.CircleGeometry(0.07, 16); d.rotateX(Math.PI / 2); d.translate(-13.55, F1 - 0.353, z); HD.geo(d, M.lamp); HD.cyl(-13.55, F1 - 0.36, z, 0.09, 0.008, M.stainless, 18); }
  { const d = new THREE.CircleGeometry(0.08, 16); d.rotateX(Math.PI / 2); d.translate(-13.35, C1_TOP - 0.065, -2.0); HD.geo(d, M.lamp); }
  for (let z = zf(-4.05) + 0.06; z < zf(-3.15); z += 0.11) B.box(XWF - 0.26, XWF - 0.2, F1, C1, z - 0.025, z + 0.025, M.dark);
  railing('z', zf(-4.58), zf(0.614), XB + 0.08, F1, RG);
  railing('x', XB + 0.08, XWF - 0.17, zf(0.614), F1, RG);
  // восток (к улице): витражи спален 3 и 4 на балконы, стенка между балконами
  wall(B, 'z', ZN, zf(1.141), FW, C1_TOP, 12.17, XE1, [[zf(-3.145), zf(-0.602), F1, C1]], M.render, IN(-1), true, [-1]);
  wall(B, 'z', zf(1.141), ZS, FW, C1_TOP, 12.17, XE1, [[zf(1.141), zf(4.83), F1, C1]], M.render, IN(-1), true, [-1]);
  glazing('z', zf(-3.145), zf(-0.602), 12.33, F1, C1, 3, [F1 + 2.5], 1, { open: [zf(-3.145) + (zf(-0.602) - zf(-3.145)) / 3, zf(-3.145) + 2 * (zf(-0.602) - zf(-3.145)) / 3], doorTop: F1 + 2.5, label: 'дверь на балкон спальни 3' });
  glazing('z', zf(1.141), zf(4.83), 12.33, F1, C1, 4, [F1 + 2.5], 1, { open: [zf(1.141) + (zf(4.83) - zf(1.141)) / 4, zf(1.141) + 2 * (zf(4.83) - zf(1.141)) / 4], doorTop: F1 + 2.5, label: 'дверь на балкон спальни 4' });
  B.box(XE1, XEB, F1, C1_TOP, zf(-0.602), zf(-0.457), M.render);
  col(XE1, XEB, F1, C1_TOP, zf(-0.602), zf(-0.457));
  railing('z', ZN + 0.1, zf(-0.602), XEB - 0.08, F1, RG);
  railing('z', zf(1.03), ZS - 0.1, XEB - 0.08, F1, RG);
  railing('x', XE1, XEB, ZN + 0.12, F1, RG);
  railing('x', XE1, XEB, zf(1.03), F1, RG);
  railing('x', XE1, XEB, ZS - 0.12, F1, RG);
  B.box(XE1, XEB - 0.005, C1_TOP - 0.06, C1_TOP, ZN + 0.005, ZS - 0.005, M.dark);
  for (const z of [-3.0, 3.0]) { const d = new THREE.CircleGeometry(0.07, 16); d.rotateX(Math.PI / 2); d.translate(13.2, C1_TOP - 0.065, z); HD.geo(d, M.lamp); }
  // стенки второго света над входом
  wall(ib, 'z', -2.28, -0.62, FW, C1_TOP, 0.36, 0.87, [], MI.wall);
  ib.box(4.26, 4.6, FW, F1, zf(-4.80), -0.62, MI.wall);                     // полоса перекрытия у восточной стенки
  B.box(0.87, 4.26, C1_TOP - 0.06, C1_TOP, ZN, -2.36, M.dark);
  // лестничный витраж на два этажа (южный фасад)
  glazing('x', 0.87, 4.26, 5.12, F0, C1_TOP, [0.87, 2.0, 3.13, 4.26], [F0 + 2.5, F1 - 0.2, F1 + 2.5], 1, { bar: 0.07 });
  wall(B, 'z', 4.98, ZS, 0, C1_TOP, 0.72, 0.87, [], M.render, null);
  B.box(0.72, 4.44, C1_TOP - 0.05, C1_TOP, 4.98, ZS, M.render);
  // теневой шов на уровне перекрытия по всем фасадам (тонкая тёмная полоса под кромкой плиты)
  for (const [x0, x1, z0, z1] of [[XW, 12.24, -4.61, -4.59], [-5.31, 0.15, ZN - 0.02, ZN], [4.62, 12.24, ZN - 0.02, ZN], [-11.58, 13.8, ZS, ZS + 0.02]]) HD.box(x0, x1, F1 - 0.37, F1 - 0.35, z0, z1, M.dark);

  // ===================================================================================================================
  // ---------- интерьер 1-го этажа ----------
  const floorAt = (x0, x1, z0, z1, y, mat = MI.floor) => ib.box(x0, x1, y, y + 0.006, z0, z1, mat);
  floorAt(-12.84, 0.87, -4.32, 4.98, F0);
  floorAt(-5.0, 0.15, -4.92, -4.32, F0);
  floorAt(0.87, 4.35, -2.36, 4.98, F0);
  floorAt(4.62, 6.54, -0.57, 3.0, F0);
  floorAt(6.72, 11.94, -4.56, 1.38, F0);
  floorAt(4.44, 6.6, 3.0, 4.98, F0);
  floorAt(6.69, 8.82, 1.53, 4.98, F0);
  floorAt(11.07, 13.5, 1.2, 4.98, F0);
  floorAt(-5.13, 0.72, 1.11, 4.98, F0 + 0.003, MI.kitchenFloor);
  for (const [x0, x1, z0, z1] of [[4.62, 6.54, -4.86, -0.6], [8.97, 11.94, -0.42, 1.38], [8.97, 10.86, 1.53, 3.18], [8.97, 10.86, 3.39, 4.98]]) floorAt(x0, x1, z0, z1, F0 + 0.004, MI.bathFloor);
  walkOn(XW, 12.24, -4.59, ZS, F0);
  walkOn(-5.31, 0.15, ZN, -4.59, F0);
  walkOn(4.62, 12.24, ZN, -4.59, F0);
  walkOn(12.24, 13.8, 0.9, ZS, F0);
  // перегородки 1-го этажа (толщины и проёмы — по плану)
  partition('x', -5.28, 0.87, 0.84, 1.11, F0, CG_TOP);
  partition('z', 1.11, 4.98, -5.28, -5.13, F0, CG_TOP, [[2.01, 3.0, 1, 0]]);
  const KD = [1.86, 2.72], KDH = Math.min(2.05, Math.floor((soffitAt(KD[1] + 0.08) - F0 - 0.08) * 50) / 50); // дверь кухни к лестнице: под верхним маршем
  partition('z', 1.11, 4.98, 0.72, 0.87, F0, F1, [[KD[0], KD[1], -1, 0]], KDH);
  partition('z', 1.02, 4.98, 4.26, 4.44, F0, FW);
  ib.box(4.26, 4.44, FW, F1, 1.02, zf(4.83), MI.wall);                       // полоса перекрытия — до южной стены 2-го этажа
  partition('x', 4.44, 5.22, 0.84, 0.99, F0, CG);
  partition('x', 4.44, 6.63, 2.85, 3.0, F0, CG, [[5.22, 6.18, -1, 1]]);
  partition('z', 3.0, 4.98, 6.54, 6.69, F0, CG);
  partition('z', 0.63, 3.0, 6.54, 6.72, F0, CG, [[1.6, 2.5, 1, 0]]);
  partition('x', 6.72, 11.94, 1.38, 1.53, F0, CG);
  partition('z', 1.53, 4.98, 8.82, 8.97, F0, CG, [[1.71, 2.58, 1, 0, { lock: true }]]);
  partition('x', 8.97, 10.86, 3.18, 3.39, F0, CG);
  partition('z', 1.53, 4.98, 10.86, 11.07, F0, CG, [[3.9, 4.77, -1, 1, { lock: true }]]);
  partition('z', -4.56, 0.63, 6.54, 6.72, F0, CG, [[-0.36, 0.55, 1, 1]]);
  partition('x', 8.43, 11.94, -0.69, -0.42, F0, CG);
  partition('z', -0.42, 1.38, 8.82, 8.97, F0, CG, [[-0.21, 0.6, 1, 0, { lock: true }]]);
  partition('x', 4.62, 6.54, -2.58, -2.43, F0, CG, [[5.4, 6.3, 1, 0, { lock: true }]]);
  partition('x', 4.62, 5.31, -0.75, -0.57, F0, CG);
  partition('z', -0.57, 0.84, 4.35, 4.62, F0, CG, [[-0.57, 0.84, 0]], 2.6);       // проход холл — коридор
  // кухня по плану Bayut: ряд у северной стены от стены до стены (варочная панель, духовка, вытяжка), у окна — ряд
  // с двойной мойкой, у западной стены — высокий шкаф с холодильником, в юго-западном углу — простенок у двери во двор
  {
    const w = onWall('x', 1.11, 1);
    const mods = [-5.13, -4.53, -3.93, -3.63, -2.83, -2.23, -1.63, -1.03, -0.43, 0.17, 0.72];   // фасады; духовка −3,63…−2,83
    const U0 = mods[0], U1 = mods[mods.length - 1], OV = [-3.63, -2.83], HC = (OV[0] + OV[1]) / 2;
    w.box(U0, U1, F0, F0 + 0.1, 0.06, 0.55, MI.slot);
    w.box(U0, U1, F0 + 0.1, F0 + 0.87, 0, 0.6, MI.wenge, true);
    for (const u of mods.slice(1, -1)) w.box(u - 0.002, u + 0.002, F0 + 0.11, F0 + 0.86, 0.6, 0.603, MI.slot);
    for (const y of [F0 + 0.62, F0 + 0.4]) w.box(U0 + 0.01, mods[2] - 0.01, y - 0.002, y + 0.002, 0.6, 0.603, MI.slot);   // ящики
    w.box(U0, U1, F0 + 0.87, F0 + 0.91, 0, 0.62, MI.counter);
    w.box(U0, U1, F0 + 0.91, F0 + 1.5, 0, 0.012, MI.splash);
    for (const [a, b] of [[U0, OV[0]], [OV[1], U1]]) w.box(a, b, F0 + 1.5, F0 + 2.3, 0, 0.36, MI.gloss);   // верхние шкафы по сторонам вытяжки
    for (const u of mods.slice(1, -1)) if (u < OV[0] - 0.01 || u > OV[1] + 0.01) w.box(u - 0.002, u + 0.002, F0 + 1.52, F0 + 2.28, 0.36, 0.363, MI.slot);
    w.box(-1.63, -1.03, F0 + 1.55, F0 + 2.25, 0.362, 0.37, MI.glass);           // две стеклянные дверцы
    w.box(-1.03, -0.43, F0 + 1.55, F0 + 2.25, 0.362, 0.37, MI.glass);
    for (const [a, b] of [[U0 + 0.02, OV[0] - 0.02], [OV[1] + 0.02, U1 - 0.02]]) w.box(a, b, F0 + 1.49, F0 + 1.5, 0.05, 0.08, MI.led);   // подсветка рабочей зоны
    w.box(HC - 0.4, HC + 0.4, F0 + 0.91, F0 + 0.916, 0.06, 0.56, MI.blackGlass);  // индукционная панель 80 см
    for (const [du, dv, r] of [[-0.2, 0.15, 0.1], [0.2, 0.15, 0.1], [-0.2, 0.41, 0.08], [0.2, 0.41, 0.12]]) placed(new THREE.TorusGeometry(r, 0.003, 4, 32).rotateX(Math.PI / 2), w, HC + du, F0 + 0.918, 0.06 + dv, MI.trim);
    w.box(OV[0] + 0.01, OV[1] - 0.01, F0 + 0.12, F0 + 0.72, 0.6, 0.612, MI.blackGlass);   // духовка: стеклянная дверца
    w.box(OV[0] + 0.08, OV[1] - 0.08, F0 + 0.66, F0 + 0.68, 0.612, 0.64, MI.steel);
    w.box(OV[0] + 0.01, OV[1] - 0.01, F0 + 0.72, F0 + 0.86, 0.6, 0.61, MI.steel);
    w.box(OV[0], OV[1], F0 + 1.42, F0 + 1.5, 0, 0.5, MI.steel);                    // вытяжка: козырёк и короб до потолка
    w.box(HC - 0.225, HC + 0.225, F0 + 1.5, CG - 0.002, 0, 0.3, MI.steel);
    for (let k = 0; k < mods.length - 1; k++) {
      const a = mods[k], b = mods[k + 1];
      if (a !== OV[0]) w.box(a + 0.08, b - 0.08, F0 + 0.73, F0 + 0.745, 0.6, 0.625, MI.steel);        // ручки-планки
      if (b <= OV[0] + 0.01 || a >= OV[1] - 0.01) w.box(a + 0.08, b - 0.08, F0 + 1.52, F0 + 1.53, 0.36, 0.38, MI.steel);
    }
  }
  { // ряд у окна: двойная мойка по центру окна, посудомойка за фасадом
    const w = onWall('x', 4.98, -1);
    const mods = [-2.95, -2.35, -1.975, -1.175, -0.55, 0.05, 0.72];
    const V0 = mods[0], V1 = mods[mods.length - 1], S0 = mods[2], S1 = mods[3], SC = (S0 + S1) / 2, BT = F0 + 0.7;
    w.box(V0, V1, F0, F0 + 0.1, 0.06, 0.55, MI.slot);
    w.box(V0, S0, F0 + 0.1, F0 + 0.87, 0, 0.6, MI.wenge);
    w.box(S1, V1, F0 + 0.1, F0 + 0.87, 0, 0.6, MI.wenge);
    w.box(S0, S1, F0 + 0.1, BT - 0.01, 0, 0.6, MI.wenge);                          // тумба под мойкой — ниже чаш
    for (const [v0, v1] of [[0, 0.13], [0.47, 0.6]]) w.box(S0, S1, BT - 0.01, F0 + 0.87, v0, v1, MI.wenge);
    col(V0, V1, F0, F0 + 0.91, 4.98 - 0.62, 4.98);
    for (const u of mods.slice(1, -1)) w.box(u - 0.002, u + 0.002, F0 + 0.11, F0 + 0.86, 0.6, 0.603, MI.slot);
    // столешница с вырезом, под ней две чаши из нержавейки с перегородкой и сливы
    w.box(V0, S0, F0 + 0.87, F0 + 0.91, 0, 0.62, MI.counter);
    w.box(S1, V1, F0 + 0.87, F0 + 0.91, 0, 0.62, MI.counter);
    for (const [v0, v1] of [[0, 0.13], [0.47, 0.62]]) w.box(S0, S1, F0 + 0.87, F0 + 0.91, v0, v1, MI.counter);
    w.box(S0, S1, BT - 0.01, BT, 0.13, 0.47, MI.steel);
    for (const [a, b] of [[S0, S0 + 0.012], [SC - 0.02, SC + 0.02], [S1 - 0.012, S1]]) w.box(a, b, BT, F0 + 0.905, 0.13, 0.47, MI.steel);
    for (const [v0, v1] of [[0.13, 0.142], [0.458, 0.47]]) w.box(S0 + 0.012, S1 - 0.012, BT, F0 + 0.905, v0, v1, MI.steel);
    for (const u of [(S0 + SC) / 2, (SC + S1) / 2]) { const d = new THREE.CircleGeometry(0.035, 18); d.rotateX(-Math.PI / 2); placed(d, w, u, BT + 0.001, 0.3, MI.slot); }
    placed(new THREE.CylinderGeometry(0.022, 0.026, 0.06, 16), w, SC, F0 + 0.91, 0.065, MI.chrome);   // смеситель
    { const pipe = new THREE.CylinderGeometry(0.014, 0.014, 0.32, 12); pipe.translate(0, 0.16, 0); placed(pipe, w, SC, F0 + 0.91, 0.065, MI.chrome); }
    { const arc = new THREE.TorusGeometry(0.15, 0.012, 8, 24, Math.PI); arc.rotateY(Math.PI / 2); arc.translate(0, 0.32, 0.15); placed(arc, w, SC, F0 + 0.91, 0.065, MI.chrome); }
    for (let k = 0; k < mods.length - 1; k++) w.box(mods[k] + 0.08, mods[k + 1] - 0.08, F0 + 0.73, F0 + 0.745, 0.6, 0.625, MI.steel);
  }
  { // высокий шкаф у западной стены (план: Z 3,33…4,53): холодильник «side-by-side» из нержавейки и антресоль
    const w = onWall('z', -5.13, 1);
    const R0 = 3.33, R1 = 4.53, RC = (R0 + R1) / 2;
    w.box(R0, R1, F0, F0 + 2.3, 0, 0.7, MI.wenge, true);
    w.box(R0 + 0.1, R1 - 0.1, F0 + 0.05, F0 + 1.85, 0.7, 0.712, MI.steel);
    w.box(RC - 0.003, RC + 0.003, F0 + 0.05, F0 + 1.85, 0.712, 0.714, MI.slot);
    for (const u of [RC - 0.05, RC + 0.05]) {
      w.box(u - 0.012, u + 0.012, F0 + 0.7, F0 + 1.5, 0.736, 0.756, MI.steel);   // ручки-скобы
      for (const y of [F0 + 0.75, F0 + 1.45]) w.box(u - 0.008, u + 0.008, y - 0.008, y + 0.008, 0.712, 0.737, MI.steel);
    }
    w.box(R0 + 0.01, R1 - 0.01, F0 + 1.9, F0 + 1.904, 0.7, 0.703, MI.slot);        // шов антресоли
    w.box(R0 + 0.15, R1 - 0.15, F0 + 2.18, F0 + 2.195, 0.7, 0.725, MI.steel);
    // простенок в углу у двери во двор (на плане — сплошная стена) и плинтус по его открытым граням
    ib.box(-5.13, -4.3, F0, CG, 4.53, 4.98, MI.wall); col(-5.13, -4.3, F0, CG, 4.53, 4.98);
    ib.box(-4.3, -4.289, F0, F0 + 0.1, 4.53, 4.98, MI.skirt);
    ib.box(-4.43, -4.289, F0, F0 + 0.1, 4.519, 4.53, MI.skirt);
  }
  // санузел у входа и умывальная с двумя раковинами (план), гостевой санузел, санузлы прислуги и водителя
  toilet(onWall('x', -4.86, 1), 5.35, F0);
  vanity(onWall('z', 4.62, 1), -3.6, -2.8, F0);
  vanity(onWall('z', 4.62, 1), -2.3, -0.9, F0, 2);
  for (const [x0, x1, z0, z1] of [[4.62, 6.54, -4.56, -2.58], [8.97, 11.94, -0.42, 1.38], [8.97, 10.86, 1.59, 3.18], [9.03, 10.92, 3.39, 4.98]]) ceiling(x0, x1, z0, z1, F0 + 2.7);
  vanity(onWall('x', 1.38, -1), 9.1, 10.8, F0);                              // гостевой: тумба у южной стены, унитаз у северной, душ во всю глубину
  toilet(onWall('x', -0.42, 1), 10.47, F0);
  shower(10.95, 11.94, -0.42, 1.38, F0, ['z', -0.42, 0.75, 10.95]);
  vanity(onWall('x', 3.18, -1), 9.15, 9.85, F0);                             // прислуги: раковина у южной стены, унитаз у восточной, душ в углу
  toilet(onWall('z', 10.86, -1), 2.72, F0);
  shower(9.95, 10.86, 1.53, 2.3, F0, ['x', 9.95, 10.86, 2.3]);
  toilet(onWall('x', 3.39, 1), 9.63, F0);                                    // водителя: унитаз и раковина у северной стены, душ в юго-западном углу
  vanity(onWall('x', 3.39, 1), 10.05, 10.75, F0);
  shower(8.97, 9.95, 4.3, 4.98, F0, ['x', 8.97, 9.95, 4.3]);
  // санузлы: стены в мраморной плитке до потолка (тонкий слой с теми же проёмами, что у стены)
  function tiles(along, at, n, a0, a1, y0, y1, holes = []) { const t0 = n > 0 ? at : at - 0.009, t1 = n > 0 ? at + 0.009 : at; wall(ib, along, a0, a1, y0, y1, t0, t1, holes, MI.bathWall, null, false); }
  tiles('z', 4.62, 1, -4.86, -2.58, F0 + 0.006, F0 + 2.7);
  tiles('x', -4.86, 1, 4.62, 6.54, F0 + 0.006, F0 + 2.7, [[5.76, 6.4, F0 + 1.75, F0 + 2.55]]);
  tiles('z', 6.54, -1, -4.86, -2.58, F0 + 0.006, F0 + 2.7);
  tiles('x', -2.58, -1, 4.62, 6.54, F0 + 0.006, F0 + 2.7, [[5.4, 6.3, F0, F0 + 2.2]]);
  tiles('x', -0.42, 1, 8.97, 11.94, F0 + 0.006, F0 + 2.7);
  tiles('z', 8.97, 1, -0.42, 1.38, F0 + 0.006, F0 + 2.7, [[-0.21, 0.6, F0, F0 + 2.2]]);
  tiles('z', 11.94, -1, -0.42, 1.38, F0 + 0.006, F0 + 2.7, [[0.39, 0.99, F0 + 1.7, F0 + 2.6]]);
  tiles('x', 1.38, -1, 8.97, 11.94, F0 + 0.006, F0 + 2.7);
  tiles('x', 1.53, 1, 8.97, 10.86, F0 + 0.006, F0 + 2.7);
  tiles('z', 8.97, 1, 1.53, 3.18, F0 + 0.006, F0 + 2.7, [[1.71, 2.58, F0, F0 + 2.2]]);
  tiles('z', 10.86, -1, 1.53, 3.18, F0 + 0.006, F0 + 2.7);
  tiles('x', 3.18, -1, 8.97, 10.86, F0 + 0.006, F0 + 2.7);
  tiles('x', 3.39, 1, 8.97, 10.86, F0 + 0.006, F0 + 2.7);
  tiles('z', 8.97, 1, 3.39, 4.98, F0 + 0.006, F0 + 2.7);
  tiles('z', 10.86, -1, 3.39, 4.98, F0 + 0.006, F0 + 2.7, [[3.9, 4.77, F0, F0 + 2.2]]);
  tiles('x', 4.98, -1, 8.97, 10.86, F0 + 0.006, F0 + 2.7);
  // шкафы в коридоре (две складные двери), полки кладовой
  wardrobe('z', 1.0, 2.85, 4.44, 1, F0, 0.7, 2.4);
  for (const y of [0.6, 1.1, 1.6, 2.1]) { ib.box(4.5, 6.45, F0 + y, F0 + y + 0.03, 4.5, 4.95, MI.wenge); }
  col(4.5, 6.45, F0, F0 + 2.2, 4.5, 4.95);
  // потолки 1-го этажа: кессоны в гостиной и спальне, ровные в кухне, коридорах и санузлах
  ceiling(-12.84, -5.31, -4.32, 4.98, CG, 0.55, CG_TOP - CG - 0.05);
  ceiling(-5.31, 0.72, -4.92, 0.84, CG, 0.5, CG_TOP - CG - 0.05);
  ceiling(-5.13, 0.72, 1.11, 4.98, CG);
  ceiling(0.87, 4.35, -0.62, ZT, CG);
  ceiling(4.62, 6.54, -2.43, 3.0, F0 + 2.85);
  ceiling(6.72, 11.94, -4.56, -0.69, CG, 0.45, 0.22);
  ceiling(6.72, 8.82, -0.69, 1.38, F0 + 2.85);
  ceiling(6.69, 8.82, 1.53, 4.98, F0 + 2.85);
  ceiling(11.07, 13.5, 1.53, 4.98, F0 + 2.85);
  ceiling(4.44, 6.54, 3.0, 4.98, F0 + 2.85);
  // розетки у телевизорной стены гостиной и в спальнях
  for (const [along, a, y, t, s] of [['x', -9.0, F0 + 0.3, -4.32, 1], ['x', -8.6, F0 + 0.3, -4.32, 1], ['x', -9.0, F0 + 1.2, -4.32, 1], ['z', -2.0, F0 + 0.3, 11.94, -1], ['x', 8.5, F0 + 0.3, -4.56, 1], ['x', -2.0, F0 + 1.1, 1.122, 1], ['x', -1.0, F0 + 1.1, 1.122, 1]]) socket(along, a, y, t, s);

  // ---------- лестница: П-образная, 21 подъём, светлый мрамор с бороздками, стекло и поручень из нержавейки ----------
  function stepBox(x0, x1, z0, z1, top) {
    ib.box(x0, x1, top - 0.03, top, z0 - 0.02, z1, MI.stoneStair);                 // проступь со свесом 2 см
    ib.box(x0, x1, top - RISE, top - 0.03, z0, z0 + 0.02, MI.stoneStair);
    for (const k of [0.03, 0.055]) ib.box(x0 + 0.05, x1 - 0.05, top + 0.001, top + 0.0025, z0 + k, z0 + k + 0.008, MI.groove);
    walkOn(x0, x1, z0, z1, top);
  }
  for (let i = 1; i <= 9; i++) {
    const z0 = Z1 + (i - 1) * T1, top = F0 + i * RISE;
    stepBox(FX[0], FX[1], z0, z0 + T1, top);
    ib.box(FX[0], FX[1], F0, top - RISE, z0, z0 + T1, MI.wall);                    // тело марша
    ib.box(FX[0], FX[1], top - RISE, top - 0.03, z0 + 0.02, z0 + T1, MI.wall);     // заполнение под проступью
  }
  ib.box(FX[0], FX[1], LAND - RISE, LAND - 0.03, ZL - 0.02, ZL, MI.stoneStair);  // 10-й подступенок у площадки
  ib.box(SX[0], FX[1], LAND - 0.25, LAND - 0.03, ZL, 4.98, MI.wall);
  ib.box(SX[0], FX[0], LAND - 0.03, LAND, ZL, 4.98, MI.stoneStair);
  ib.box(FX[0], FX[1], LAND - 0.03, LAND, ZL - 0.02, 4.98, MI.stoneStair);
  walkOn(SX[0], FX[1], ZL, 4.98, LAND);
  for (let j = 1; j <= 10; j++) {
    const z1 = ZL - (j - 1) * T2, top = LAND + j * RISE;
    ib.box(SX[0], SX[1], top - 0.03, top, z1 - T2, z1 + 0.02, MI.stoneStair);
    ib.box(SX[0], SX[1], top - RISE, top - 0.03, z1 - 0.02, z1, MI.stoneStair);
    ib.box(SX[0], SX[1], top - RISE, top - 0.03, z1 - T2, z1 - 0.02, MI.wall);    // заполнение под проступью
    for (const k of [0.03, 0.055]) ib.box(SX[0] + 0.05, SX[1] - 0.05, top + 0.001, top + 0.0025, z1 - k - 0.008, z1 - k, MI.groove);
    walkOn(SX[0], SX[1], z1 - T2, z1, top);
  }
  // 21-й подъём: каменный подступенок и кромка у площадки 2-го этажа
  ib.box(SX[0], SX[1], F1 - RISE, F1 - 0.03, ZT, ZT + 0.02, MI.stoneStair);
  ib.box(SX[0], SX[1], F1 - 0.03, F1 + 0.003, ZT - 0.03, ZT + 0.04, MI.stoneStair);
  {
    // косоур верхнего марша: снизу — ровный потолок над дверью кухни, сверху — чуть ниже внутренних углов ступеней
    const s2 = new THREE.Shape([new THREE.Vector2(ZL, LAND - 0.25), new THREE.Vector2(ZT, F1 - 0.35), new THREE.Vector2(ZT, F1 - RISE - 0.005), new THREE.Vector2(ZL, LAND - 0.005)]);
    const g = new THREE.ExtrudeGeometry(s2, { depth: SX[1] - SX[0], bevelEnabled: false });
    g.rotateY(-Math.PI / 2);
    g.translate(SX[1], 0, 0);
    ib.geo(g, MI.wall);
    const zHead = ZL - (F0 + 1.9 - (LAND - 0.25)) / (F1 - 0.35 - (LAND - 0.25)) * (ZL - ZT); // ниже 1,9 м над полом под маршем не пройти
    col(SX[0], SX[1], F0, LAND - 0.25, zHead, ZL);
  }
  slopeRail(FX[0] + 0.03, Z1, F0, ZL, LAND - RISE);
  slopeRail(SX[1] - 0.03, ZL, LAND, ZT, F1 - RISE);
  railing('x', SX[1], FX[0], ZL + 0.04, LAND, { posts: true });
  railing('x', 0.87, 4.26, -0.6, F1, { posts: true });
  railing('x', SX[1], 4.26, ZT + 0.01, F1, { posts: true });
  railing('z', 1.84, 4.6, 0.8, F1, { posts: true });
  ib.box(0.87, 4.26, F1 - 0.35, F1, -0.62, ZT, MI.ceiling);
  ib.box(0.875, 4.255, F1 - 0.356, F1 - 0.35, -0.615, -0.595, MI.led);

  // ===================================================================================================================
  // ---------- интерьер 2-го этажа ----------
  const Z = zf;
  floorAt(XWF + 0.12, 0.87, ZN + 0.27, ZS - 0.3, F1);
  floorAt(0.87, 4.26, -0.62, ZT, F1);
  floorAt(4.26, 12.17, ZN + 0.27, ZS - 0.3, F1);
  for (const [x0, x1, z0, z1] of [[-2.94, 0.36, Z(-4.76), Z(-0.77)], [-7.24, -4.35, Z(3.03), ZS - 0.3], [4.6, 6.6, Z(-4.56), Z(-2.0)], [4.74, 7.62, Z(0.996), Z(2.866)]]) floorAt(x0, x1, z0, z1, F1 + 0.004, MI.bathFloor);
  ib.box(XB + 0.02, XWF - 0.17, F1, F1 + 0.008, Z(-4.58), Z(0.614), MI.bathFloor);
  ib.box(XE1, XEB - 0.02, F1, F1 + 0.008, ZN + 0.02, Z(-0.602), MI.bathFloor);
  ib.box(XE1, XEB - 0.02, F1, F1 + 0.008, Z(1.03), ZS - 0.02, MI.bathFloor);
  partition('x', XWF + 0.12, -4.4, Z(0.614), Z(0.778), F1, C1_TOP);
  partition('z', Z(-4.16), Z(-1.31), -6.48, -6.32, F1, C1_TOP);
  ib.box(-6.48, -5.4, F1, C1_TOP, ZN + 0.27, Z(-4.16), MI.wall); col(-6.48, -5.4, F1, C1_TOP, ZN, Z(-4.16));
  partition('x', -6.3, -5.63, Z(-1.456), Z(-1.31), F1, C1_TOP);
  partition('z', Z(-1.51), Z(-0.475), -4.35, -4.17, F1, C1_TOP);
  partition('z', Z(-0.475), Z(0.487), -4.35, -4.17, F1, C1_TOP, [[Z(-0.475), Z(0.487), -1, 1]], 2.2);
  partition('x', -4.17, -3.12, Z(-0.875), Z(-0.602), F1, C1_TOP);
  partition('z', Z(-4.76), Z(-0.6), -3.1, -2.94, F1, C1_TOP, [[Z(-3.126), Z(-2.255), 1, 0, { lock: true }]]);
  partition('x', -2.93, 0.36, Z(-0.766), Z(-0.62), F1, C1_TOP);
  ib.box(-0.1, 0.63, F1, C1_TOP, ZN + 0.27, Z(-3.544), MI.wall); col(-0.1, 0.63, F1, C1_TOP, ZN, Z(-3.544));
  partition('z', Z(-3.53), Z(-0.62), 0.36, 0.63, F1, C1_TOP);
  wardrobe('z', Z(-4.16), Z(-1.46), -6.32, 1, F1, 0.6, 2.6);
  wardrobe('x', -5.4, -3.12, Z(-4.80), 1, F1, 0.6, 2.6);
  { // ванная хозяина: ванна у восточной стены, душ и унитаз у северной, двойная тумба у южной
    ib.box(-0.62, 0.34, F1, F1 + 0.55, Z(-3.6), Z(-1.5), MI.bathWall);
    const tub = roundBox(0.86, 0.06, 1.95, 0.25);
    tub.translate(-0.14, F1 + 0.5, (Z(-3.6) + Z(-1.5)) / 2);
    ib.geo(tub, MI.porcelain);
    ib.box(-0.5, 0.22, F1 + 0.5, F1 + 0.555, Z(-3.46), Z(-1.64), MI.porcelain);
    ib.cyl(0.22, F1 + 0.555, Z(-2.55), 0.02, 0.2, MI.chrome, 12);
    col(-0.62, 0.36, F1, F1 + 0.55, Z(-3.6), Z(-1.5));
    shower(-1.0, 0.34, Z(-4.76), Z(-3.75), F1, ['x', -1.0, 0.34, Z(-3.75)]);
    toilet(onWall('x', Z(-4.76), 1), -2.2, F1);
    vanity(onWall('x', Z(-0.766), -1), -2.75, -1.25, F1, 2);
    onWall('z', 0.36, -1).box(Z(-4.76), Z(-0.77), F1, F1 + 2.6, 0, 0.012, MI.bathWall);
    onWall('x', Z(-4.76), 1).box(-2.94, 0.36, F1, F1 + 2.6, 0, 0.008, MI.bathWall);
  }
  partition('z', Z(0.487), Z(1.813), -4.35, -4.17, F1, C1_TOP);
  partition('z', Z(1.813), Z(2.776), -4.35, -4.17, F1, C1_TOP, [[Z(1.813), Z(2.776), -1, 0]], 2.2);
  partition('z', Z(2.776), ZS - 0.3, -4.35, -4.17, F1, C1_TOP);
  partition('x', -7.4, -4.37, Z(2.884), Z(3.03), F1, C1_TOP, [[-6.42, -5.51, -1, 1, { lock: true }]]);
  partition('z', Z(3.03), ZS - 0.3, -7.4, -7.24, F1, C1_TOP);
  vanity(onWall('z', -7.24, 1), Z(3.4), Z(4.2), F1);
  toilet(onWall('x', ZS - 0.3, -1), -5.9, F1);
  shower(-5.1, -4.35, Z(3.4), ZS - 0.3, F1, ['z', Z(3.4), ZS - 0.3, -5.1]);
  ib.box(0.57, 0.87, F1, C1_TOP, Z(0.687), Z(1.795), MI.wall); col(0.57, 0.87, F1, C1_TOP, Z(0.687), Z(1.795));
  ib.box(0.57, 0.87, F1, C1_TOP, Z(4.501), Z(4.83), MI.wall); col(0.57, 0.87, F1, C1_TOP, Z(4.501), ZS);
  partition('z', Z(-3.853), Z(-0.602), 4.26, 4.6, F1, C1_TOP);
  ib.box(4.26, 5.06, F1, C1_TOP, zf(-4.80), Z(-3.853), MI.wall); col(4.26, 5.06, F1, C1_TOP, ZN, Z(-3.853));
  partition('x', 4.6, 6.6, Z(-2.0), Z(-1.837), F1, C1_TOP, [[5.5, 6.41, -1, 1, { lock: true }]]);
  partition('z', ZN + 0.27, Z(-1.855), 6.6, 6.77, F1, C1_TOP);
  partition('x', 4.6, 12.17, Z(-0.766), Z(-0.602), F1, C1_TOP, [[4.74, 5.77, -1, 0]]);
  partition('z', Z(-0.602), Z(0.996), 6.08, 6.29, F1, C1_TOP, [[Z(-0.44), Z(0.524), 1, 0]]);
  partition('x', 6.29, 7.85, Z(0.778), Z(0.996), F1, C1_TOP);
  partition('z', Z(0.996), Z(3.084), 7.62, 7.85, F1, C1_TOP);
  partition('x', 4.74, 7.62, Z(2.866), Z(3.084), F1, C1_TOP, [[5.83, 6.75, 1, 0, { lock: true }]]);
  partition('z', Z(0.614), Z(3.193), 4.26, 4.74, F1, C1_TOP);
  partition('z', Z(3.193), Z(4.83), 4.26, 4.49, F1, C1_TOP);
  wardrobe('z', Z(3.25), ZS - 0.35, 4.49, 1, F1, 0.6, 2.6);
  wardrobe('x', 4.78, 6.06, Z(0.996), -1, F1, 0.4, 2.4);
  shower(5.1, 6.5, Z(-4.56), Z(-3.85), F1, ['x', 5.1, 6.5, Z(-3.85)]);
  toilet(onWall('z', 6.6, -1), Z(-3.1), F1);
  vanity(onWall('z', 4.6, 1), Z(-3.6), Z(-2.6), F1);
  shower(6.75, 7.62, Z(1.0), Z(2.0), F1, ['z', Z(1.0), Z(2.0), 6.75]);
  toilet(onWall('x', Z(0.996), 1), 6.6, F1);
  vanity(onWall('z', 4.74, 1), Z(1.9), Z(2.7), F1);
  tiles('x', Z(-0.766), -1, -2.94, 0.36, F1 + 0.006, F1 + 2.7);
  tiles('z', -2.94, 1, Z(-4.80), Z(-0.766), F1 + 0.006, F1 + 2.7, [[Z(-3.126), Z(-2.255), F1, F1 + 2.2]]);
  tiles('z', -7.24, 1, Z(3.03), Z(4.83), F1 + 0.006, F1 + 2.7);
  tiles('x', Z(3.03), 1, -7.24, -4.35, F1 + 0.006, F1 + 2.7, [[-6.42, -5.51, F1, F1 + 2.2]]);
  tiles('z', -4.35, -1, Z(3.03), Z(4.83), F1 + 0.006, F1 + 2.7);
  tiles('x', Z(4.83), -1, -7.24, -4.35, F1 + 0.006, F1 + 2.7, [[-7.22, -6.55, F1 + 1.4, F1 + 2.6]]);
  tiles('z', 4.6, 1, Z(-4.56), Z(-2.0), F1 + 0.006, F1 + 2.7);
  tiles('z', 6.6, -1, Z(-4.56), Z(-2.0), F1 + 0.006, F1 + 2.7);
  tiles('z', 4.74, 1, Z(0.996), Z(2.866), F1 + 0.006, F1 + 2.7);
  tiles('x', Z(0.996), 1, 4.74, 7.62, F1 + 0.006, F1 + 2.7);
  const R1 = C1_TOP - C1 - 0.05;
  ceiling(XWF + 0.12, -6.48, ZN + 0.27, Z(0.614), C1, 0.5, R1);
  ceiling(-6.32, -3.1, ZN + 0.27, Z(-1.31), F1 + 2.75);
  ceiling(-6.48, -4.35, Z(-1.31), Z(0.614), F1 + 2.75);
  ceiling(-2.94, 0.36, ZN + 0.27, Z(-0.766), F1 + 2.7);
  ceiling(XWF + 0.12, -4.35, Z(0.778), Z(4.83), C1, 0.45, R1 * 0.8);
  ceiling(-7.24, -4.35, Z(3.03), Z(4.83), F1 + 2.7);
  ceiling(-4.17, 0.57, Z(-0.602), Z(4.83), C1, 0.4, R1 * 0.8);
  ceiling(0.87, 4.26, -0.62, ZT, C1);
  ceiling(4.6, 6.6, ZN + 0.27, Z(-2.0), F1 + 2.7);
  ceiling(6.77, 12.17, ZN + 0.27, Z(-0.766), C1, 0.45, R1 * 0.8);
  ceiling(4.6, 6.08, Z(-1.837), Z(0.614), F1 + 2.9);
  ceiling(4.74, 12.17, Z(0.996), Z(4.83), C1, 0.45, R1 * 0.8);
  ceiling(4.74, 7.62, Z(0.996), Z(2.866), F1 + 2.7);
  ib.box(0.87, 4.26, C1_TOP - 0.04, C1_TOP, -2.36, -0.62, MI.ceiling);
  ib.box(0.87, 4.26, C1_TOP - 0.04, C1_TOP, ZT, 4.98, MI.ceiling);
  for (const [x, z, y] of [[2.6, 0.1, C1], [-1.8, 0.0, C1], [5.3, -0.1, F1 + 2.9]]) grilleAC(x, z, y);
  for (const [x, z] of [[2.6, -1.5], [2.6, 2.9]]) { ib.cyl(x, C1_TOP - 0.1, z, 0.23, 0.06, MI.trim, 32); const d = new THREE.CircleGeometry(0.21, 32); d.rotateX(Math.PI / 2); d.translate(x, C1_TOP - 0.101, z); ib.geo(d, MI.downlight); }
  for (const [along, a, y, t, s] of [['x', -9.0, F1 + 0.3, Z(-4.80), 1], ['x', -8.4, F1 + 0.3, Z(-4.80), 1], ['x', 9.0, F1 + 0.3, Z(-4.80), 1], ['x', 9.0, F1 + 0.3, Z(4.83), -1], ['x', -9.0, F1 + 0.3, Z(4.83), -1]]) socket(along, a, y, t, s);
  for (const s of switches) socket(s.along, s.a, s.y, s.t, s.s);

  // ===================================================================================================================
  // ---------- сборка: сетки по материалам, копии оболочки для соседей ----------
  const shellGroup = new THREE.Group(); shellGroup.name = 'house_shell';
  const shellParts = HB.flush(shellGroup);
  const detailParts = HD.flush(shellGroup);
  const proxyParts = NB.flush(null);
  root.add(shellGroup);
  PB.flush(root);
  EB.flush(root);
  GB.flush(root);
  ib.flush(root);
  plants.flush(root);
  for (const part of shellParts) if (part.mat === M.glass) glassMeshes.push(part.mesh);
  // соседи: копии оболочки (InstancedMesh по материалам), стекло у них непрозрачное
  {
    const near = [-16.95, 16.95, -33.9, 33.9];
    const tAll = [];
    for (const dz of near) tAll.push(new THREE.Matrix4().makeTranslation(0, 0, dz));
    if (hi) for (const z of across) tAll.push(new THREE.Matrix4().makeRotationY(Math.PI).premultiply(new THREE.Matrix4().makeTranslation(PX1 + 11.2 + PX1, 0, z)));
    const nearOnly = tAll.slice(0, near.length);
    const inst = (parts, list) => {
      for (const { geo, mat } of parts) {
        const m = new THREE.InstancedMesh(geo, mat === M.glass ? glassFar : mat, list.length);
        list.forEach((t, i) => m.setMatrixAt(i, t));
        m.name = `neighbors_${mat.name || 'part'}`;
        if (mat.userData.noCast || mat === M.glass) m.userData.noCast = true;
        m.computeBoundingSphere();
        root.add(m);
      }
    };
    inst(shellParts, tAll);
    inst(proxyParts, tAll);
    inst(detailParts, nearOnly);
  }
  // отражающий слой фасадного стекла: та же сетка поверх тонировки; окна рисуются после остального прозрачного
  const reflMeshes = [];
  for (const g of glassMeshes) {
    g.renderOrder = 2; g.userData.noAO = true;
    const r = new THREE.Mesh(g.geometry, glassRefl);
    r.name = `${g.name}_refl`; r.renderOrder = 3; r.userData.noCast = true; r.userData.noAO = true;
    r.position.copy(g.position); r.quaternion.copy(g.quaternion); r.scale.copy(g.scale);
    g.parent.add(r);
    reflMeshes.push(r);
  }
  const extraMaterials = [glassHi, glassRefl, glassLo, glassFar];

  // ---------- двери: с какой стороны есть место для открывания ----------
  const blocked = (x, z, y0, y1) => physData.colliders.some((c) => x > c[0] && x < c[3] && z > c[2] && z < c[5] && c[4] > y0 + 0.2 && c[1] < y1);
  for (const d of doors) {
    if (d.kind !== 'hinge') continue;
    d.sides = [];
    for (const s of [1, -1]) {
      let ok = true;
      for (const r of [0.35, 0.6, 0.85]) for (const deg of [25, 50, 75, 90]) {
        const th = (deg * Math.PI) / 180, u = Math.cos(th) * r * d.W, v = Math.sin(th) * r * d.W + 0.06;
        const along = d.ah + d.dirA * u, across = d.tm + s * (v + 0.03);
        const [x, z] = d.along === 'x' ? [along, across] : [across, along];
        if (blocked(x, z, d.y0, d.y0 + 2)) ok = false;
      }
      if (ok) d.sides.push(s);
    }
    if (!d.sides.length) d.sides = [d.plan];
  }

  // ---------- анимация дверей ----------
  // p — ход 0..1 (время open/close с плавным разгоном и торможением), ручка нажимается в начале хода;
  // распашные: угол = sign × maxAngle × ease(p); раздвижные: сдвиг на ширину створки.
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function applyDoor(d) {
    if (d.kind === 'slide') {
      const k = ease(d.p);
      d.obj.position.set(d.base.x + d.slide[0] * k, d.base.y, d.base.z + d.slide[1] * k);
      return;
    }
    const k = ease(Math.min(1, Math.max(0, (d.p - 0.06) / 0.94)));
    // поворот вокруг вертикали: положительный угол уводит свободный край в сторону +n при dirA·(ось) — знак подобран по осям
    const base = d.along === 'x' ? -d.dirA : d.dirA;
    d.obj.rotation.y = d.sign * base * d.maxAngle * k;
    const press = sstep(0, 0.07, d.p) * (1 - sstep(0.2, 0.36, d.p));
    for (const h of d.handles) h.rotation[h.userData.axis] = 0.55 * press * h.userData.sign;
  }
  doors.forEach(applyDoor);
  const obsLast = new V3();
  let obsSpeed = 0, obsSeen = false;
  function updateDoors(dt, ctx) {
    let moved = false;
    const dyn = [];
    // скорость наблюдателя: чем быстрее идёт, тем раньше открывается дверь
    if (ctx.observer && dt > 0 && dt < 1) {
      const v = obsSeen ? ctx.observer.distanceTo(obsLast) / dt : 0;
      obsSpeed += (Math.min(6, v) - obsSpeed) * Math.min(1, dt * 6);
      obsLast.copy(ctx.observer);
      obsSeen = true;
    } else if (!ctx.observer) { obsSeen = false; obsSpeed = 0; }
    const lead = Math.min(2.6, obsSpeed * 0.65);
    for (const d of doors) {
      let want = 0;
      if (ctx.mode === 'plan') { want = d.kind === 'hinge' ? 1 : 0; if (d.p === 0) d.sign = d.plan; }
      else if (ctx.observer) {
        const o = ctx.observer;
        const dx = o.x - d.center[0], dz = o.z - d.center[2];
        const R = d.reach + lead;
        const near = Math.abs(o.y - d.center[1]) < 1.5 && dx * dx + dz * dz < R * R;
        if (near) { want = 1; d.hold = 1.1; }
        else if (d.hold > 0 && dx * dx + dz * dz < (R + 1.2) ** 2) { d.hold -= dt; want = 1; }
        else d.hold = 0;
        if (want && d.p === 0 && d.kind !== 'slide') {
          const side = dx * d.n[0] + dz * d.n[1] > 0 ? 1 : -1;  // открыть от идущего, если там есть место
          d.sign = d.sides && d.sides.includes(-side) ? -side : (d.sides ? d.sides[0] : d.plan);
        }
      }
      const step = dt / d.time;
      const np = want ? Math.min(1, d.p + step) : Math.max(0, d.p - step * 0.85);
      if (np !== d.p) { d.p = np; applyDoor(d); moved = true; }
      if (d.p < 0.18 && d.collider) dyn.push(d.collider);
    }
    physData.dynamic = dyn;
    return moved;
  }

  // ---------- комнаты (подписи при прогулке, на плане — с площадью) ----------
  const rooms = [
    { name: 'Гостиная и столовая · окна в пол на гольф', box: [XW, -5.31, F0, CG_TOP, -4.32, 4.98] },
    { name: 'Малая гостиная с эркером', box: [-5.31, 0.87, F0, CG_TOP, -4.92, 0.84] },
    { name: 'Кухня', box: [-5.13, 0.72, F0, CG_TOP, 1.11, 4.98] },
    { name: 'Входной холл · второй свет', box: [0.87, 4.35, F0, F1, -2.36, Z1] },
    { name: 'Лестница · витраж на два этажа', box: [0.87, 4.26, F0, F1 + 0.5, Z1, 4.98] },
    { name: 'Санузел и умывальная', box: [4.62, 6.54, F0, CG, -4.56, -0.6] },
    { name: 'Коридор, шкафы, кладовая', box: [4.44, 6.6, F0, CG, -0.6, 4.98] },
    { name: 'Гостевая спальня с санузлом', box: [6.72, 11.94, F0, CG, -4.56, 1.38] },
    { name: 'Комната прислуги с санузлом', box: [6.69, 10.86, F0, CG, 1.53, 4.98] },
    { name: 'Комната водителя', box: [10.86, 13.5, F0, CG, 1.53, 4.98] },
    { name: 'Крыльцо · вход', box: [0.87, 4.35, 0, 4, ZN - 0.4, -2.36] },
    { name: 'Терраса и двор к гольфу', box: [PX0, XW, 0, 3, PZ0, PZ1] },
    { name: 'Спальня хозяина · балкон на гольф', box: [XWF, -6.32, F1, C1_TOP, ZN, Z(0.614)] },
    { name: 'Гардеробная хозяина', box: [-6.48, -3.1, F1, C1_TOP, ZN, Z(0.614)] },
    { name: 'Ванная хозяина', box: [-3.1, 0.63, F1, C1_TOP, ZN, Z(-0.62)] },
    { name: 'Балкон спальни хозяина', box: [XB, XWF, F1, C1_TOP, ZN, Z(0.614)] },
    { name: 'Спальня 2 с санузлом', box: [XWF, -4.17, F1, C1_TOP, Z(0.778), ZS] },
    { name: 'Малая гостиная 2-го этажа', box: [-4.17, 0.87, F1, C1_TOP, Z(-0.602), ZS] },
    { name: 'Галерея между вторыми светами', box: [0.87, 4.26, F1, C1_TOP, -0.62, ZT + 0.01] },
    { name: 'Спальня 3 · балкон к улице', box: [4.6, XEB, F1, C1_TOP, ZN, Z(-0.602)] },
    { name: 'Спальня 4 · балкон к улице', box: [4.49, XEB, F1, C1_TOP, Z(-0.457), ZS] },
    { name: 'Навес для машин', box: [13.8, PX1, 0, 3.1, 0.9, PZ1] },
    { name: 'Двор вдоль дома', box: [-16, PX1, 0, 3, PZ0, PZ1] }
  ];
  // ---------- ракурсы, точки появления, пролёт ----------
  const views = {
    start: { pos: [-41, 15, -12], target: [-4, 3.4, 0.5] },
    golf: { pos: [-44, 5.5, -4], target: [-8, 4, 0] },
    street: { pos: [33, 5.5, -13], target: [6, 3.5, -1] },
    back: { pos: [-20.4, 1.7, -5.5], target: [-10, 4.2, 1] },
    top: { pos: [-0.5, 70, 0.1], target: [-0.5, 0, 0] },
    gf: { pos: [-0.4, 46, 15], target: [-0.4, 0, 1.5], clip: F0 + 2.3 },
    ff: { pos: [-0.4, 50, 15], target: [-0.4, 3.7, 1.5], clip: F1 + 2.3 }
  };
  const spawns = {
    entry: { pos: [3.1, 0.03, -7.2], yaw: Math.PI, label: 'у входа' },
    living: { pos: [-8.5, F0, 0.4], yaw: Math.PI / 2, label: 'в гостиной' },
    upstairs: { pos: [2.6, F1, 0.1], yaw: Math.PI / 2, label: 'на 2-м этаже' },
    balcony: { pos: [-13.4, F1, -2.0], yaw: Math.PI / 2, label: 'на балконе' },
    garden: { pos: [-18.5, 0.03, 2.0], yaw: -Math.PI / 2, label: 'во дворе' }
  };
  const E0 = F0 + 1.6, E1 = F1 + 1.6, st = (k) => F0 + k * RISE + 1.6;
  const tour = [
    { pos: [18.6, 1.7, -6.7], look: [6.0, 2.4, -6.2], label: 'Дорожка от улицы к входу', hold: 1.0 },
    { pos: [8.0, 1.7, -6.8], look: [3.0, 2.8, -4.5] },
    { pos: [3.4, 1.75, -6.4], look: [3.4, 3.6, -2.4], label: 'Крыльцо под двухсветным порталом' },
    { pos: [3.3, E0, -3.4], look: [3.2, 4.2, -1.0], speed: 1.2 },
    { pos: [3.0, E0, -1.4], look: [2.4, 6.5, 0.2], label: 'Входной холл · второй свет до крыши', hold: 1.2 },
    { pos: [1.4, E0, -1.2], look: [-4.0, 2.2, -1.5] },
    { pos: [-2.2, E0, -1.6], look: [-3.0, 2.2, -5.0], label: 'Малая гостиная с эркером' },
    { pos: [-5.0, E0, -1.2], look: [-12.0, 2.4, -0.5] },
    { pos: [-8.6, E0, -0.2], look: [-16.0, 2.6, 0.5], label: 'Гостиная: витраж на гольф и колонна', hold: 1.5 },
    { pos: [-10.6, E0, 2.6], look: [-14.0, 2.2, 6.0], label: 'Столовая · угловое остекление' },
    { pos: [-7.0, E0, 2.6], look: [-4.0, 2.2, 2.5] },
    { pos: [-5.4, E0, 2.5], look: [-2.0, 2.3, 1.6] },
    { pos: [-3.2, E0, 2.6], look: [-2.0, 2.0, 1.3], label: 'Кухня' },
    { pos: [-1.0, E0, 2.29], look: [2.0, 2.2, 2.29] },
    { pos: [0.8, E0, 2.29], look: [3.0, 2.4, 1.2] },
    { pos: [2.6, E0, 0.4], look: [3.7, 2.8, 3.0], label: 'Лестница к витражу' },
    { pos: [3.7, st(1.5), 1.3], look: [3.7, st(6), 3.6], speed: 0.9 },
    { pos: [3.7, st(8), 3.15], look: [3.0, st(10), 4.6], speed: 0.9 },
    { pos: [2.6, st(10), 4.3], look: [1.4, st(12), 3.0], speed: 0.9, label: 'Площадка у витража на два этажа' },
    { pos: [1.5, st(11), 3.45], look: [1.5, st(16), 1.4], speed: 0.9 },
    { pos: [1.5, st(18), 1.72], look: [1.5, E1, -0.6], speed: 0.9 },
    { pos: [1.6, E1, 0.1], look: [3.0, 5.5, -2.4], label: 'Галерея между вторыми светами', hold: 1.0 },
    { pos: [0.0, E1, 0.0], look: [-3.0, E1, 0.0] },
    { pos: [-3.4, E1, 0.0], look: [-6.0, E1, -0.5], speed: 1.2 },
    { pos: [-5.4, E1, -0.6], look: [-5.2, 5.4, -3.6], label: 'Гардеробная хозяина' },
    { pos: [-7.0, E1, -1.2], look: [-13.0, 5.6, -2.0] },
    { pos: [-11.0, E1, -2.0], look: [-21.0, 5.0, -1.5], label: 'Спальня хозяина · вид на гольф', hold: 1.2 },
    { pos: [-13.4, E1, -2.0], look: [-31.0, 4.2, -3.0], label: 'Балкон: гольф, акация, озеро справа', hold: 1.5 },
    { pos: [-10.6, E1, -1.0], look: [-6.5, E1, 0.0] },
    { pos: [-5.0, E1, 0.0], look: [-1.0, E1, 0.0], speed: 1.2 },
    { pos: [-3.2, E1, 0.6], look: [-1.6, 5.0, 4.5] },
    { pos: [-2.2, E1, 2.8], look: [-1.7, 5.0, 6.0], label: 'Малая гостиная 2-го этажа' },
    { pos: [-3.6, E1, 2.4], look: [-9.5, 5.3, 2.6] },
    { pos: [-5.8, E1, 2.6], look: [-12.0, 5.2, 3.0], speed: 1.2 },
    { pos: [-8.4, E1, 2.6], look: [-14.5, 5.2, 2.8], label: 'Спальня 2', hold: 0.8 },
    { pos: [-5.6, E1, 2.4], look: [-3.0, E1, 2.3], speed: 1.2 },
    { pos: [-3.4, E1, 1.4], look: [0.0, E1, 0.3] },
    { pos: [2.6, E1, 0.2], look: [6.0, E1, 0.2] },
    { pos: [5.4, E1, 0.1], look: [7.0, E1, 2.0], speed: 1.2 },
    { pos: [8.0, E1, 2.6], look: [14.0, 5.0, 3.0], label: 'Спальня 4 · балкон к улице', hold: 1.0 },
    { pos: [5.5, E1, 0.2], look: [5.3, E1, -2.0], speed: 1.2 },
    { pos: [6.6, E1, -1.4], look: [12.0, 5.2, -2.2], label: 'Спальня 3' },
    { pos: [11.0, E1, -2.2], look: [15.0, 4.6, -2.4] },
    { pos: [24.0, 12.0, -10.0], look: [4.0, 3.5, 0.0], label: 'Дом с улицы' },
    { pos: [2.0, 24.0, -30.0], look: [-2.0, 3.0, 0.0] },
    { pos: [-36.0, 12.0, -16.0], look: [-4.0, 3.0, 0.0], label: 'Дом со стороны гольфа', hold: 0.5 }
  ];
  const inside = (p) => p.x > XB - 0.3 && p.x < 13.9 && p.z > ZN - 0.3 && p.z < ZS + 0.3 && p.y < PARA;

  // ---------- кадр: двери, ветер, рябь воды ----------
  function update(dt, time, ctx = {}) {
    plants.update(time);
    M.water.normalMap.offset.set(time * 0.006, time * 0.004);
    M.poolWater.normalMap.offset.set(time * 0.01, -time * 0.007);
    return updateDoors(Math.min(dt, 10), ctx);
  }
  const glow = { down: MI.downlight.emissiveIntensity, led: MI.led.emissiveIntensity, lamp: M.lamp.emissiveIntensity };
  function setLights(k) {
    MI.downlight.emissiveIntensity = glow.down * (0.5 + 5 * k);
    MI.led.emissiveIntensity = glow.led * (0.5 + 4 * k);
    M.lamp.emissiveIntensity = glow.lamp * (0.3 + 8 * k);
  }
  const nightLights = rooms.filter((r) => r.box[3] <= C1_TOP + 0.1 && r.box[0] > XB - 0.5 && r.box[1] < 14 && r.box[4] > ZN - 0.5 && r.box[5] < ZS + 0.5)
    .map((r) => { const [x0, x1, y0, y1, z0, z1] = r.box; const a = (x1 - x0) * (z1 - z0); return [(x0 + x1) / 2, Math.min(y1, y0 + 3.2) - 0.35, (z0 + z1) / 2, Math.min(2.2, 0.5 + a / 25)]; });
  function setQuality(q) {
    const low = q === 'low';
    for (const m of glassMeshes) m.material = low ? glassLo : glassHi;
    for (const m of reflMeshes) m.visible = !low;
  }
  return {
    root, views, tour, phys: physData, spawns, rooms, inside, update, setQuality, extraMaterials, setLights, nightLights,
    sun: { azimuth: 145, elevation: 38 },
    doorsAuto: doors.map((d) => ({ label: d.label, kind: d.kind, center: d.center, box: d.collider, n: d.n, along: d.along, ah: d.ah, tm: d.tm, W: d.W, dirA: d.dirA, y0: d.y0, sides: d.sides, plan: d.plan })),
    exportInfo: { grass: grassPoints, sun: { azimuth: 145, elevation: 38 } },
    stats: { doors: doors.length },
    auditSolids: solids
  };
}
