// Земля стройплощадки и карьер-«подкова». Всё рисуется кодом:
// земля — одна canvas-текстура на уровень (колеи, щебень, трава по краям), уступы — одна геометрия
// с цветами вершин, руда, валуны, самоцветы и щебень — InstancedMesh. Логику рудников не трогает:
// стены стоят за границей сетки уровня (level.bounds), куда рабочие и техника не заходят.
(function () {
  // Уступы растут с размером карьера, иначе на больших уровнях они теряются тонкой полоской.
  let STEP_H = 1.15;
  let STEP_W = 1.8;
  const PLATEAU = 46;
  const ROCK = [0x8d8579, 0x9a9184, 0x7f786e, 0xa59c8e];
  const CUT = [0xc4c3be, 0xb0aea8, 0xd0cec8, 0xa5a39c, 0xbab4a8];
  const PEBBLE = [0xa59c8e, 0x9a9184, 0xb0a794, 0x8f8579, 0x9b8064, 0x7f786e];
  const LEDGE = [0xae9068, 0xa38660, 0xb59872];
  // Сухая трава: соломенно-оливковая, как выгоревший луг вокруг карьера.
  const GRASS = 0x9a9a62;
  const GRASS_CSS = '#9a9a62';
  let groundCanvas = null;
  let groundTexture = null;
  let gritTexture = null;

  function rng(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Светлый шум для всех поверхностей карьера: цвет дают вершины и экземпляры, текстура только «зерно».
  function grit() {
    if (gritTexture) return gritTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const rand = rng(91);
    ctx.fillStyle = '#ececec';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) {
      const v = 190 + Math.floor(rand() * 65);
      ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.55)';
      ctx.fillRect(rand() * 128, rand() * 128, 1 + rand() * 3, 1 + rand() * 2);
    }
    gritTexture = new THREE.CanvasTexture(canvas);
    gritTexture.wrapS = THREE.RepeatWrapping;
    gritTexture.wrapT = THREE.RepeatWrapping;
    gritTexture.colorSpace = THREE.SRGBColorSpace;
    return gritTexture;
  }

  // look4: колотый камень с рыжим лишайником, как штабели по краям карьера на референсе. Цвет даёт экземпляр.
  let stoneTexture = null;

  function stoneMap() {
    if (stoneTexture) return stoneTexture;
    const S = 512;
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d');
    const rand = rng(43);
    // Бесшовно, как grainMap: у каждого блока свой сдвиг узора (onBeforeCompile ниже), повтор не виден.
    function tiled(draw) {
      for (let ox = -S; ox <= S; ox += S) for (let oy = -S; oy <= S; oy += S) draw(ox, oy);
    }
    ctx.fillStyle = '#cfcdc8';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 70; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const r = 16 + rand() * 50;
      const v = 160 + Math.floor(rand() * 80);
      tiled(function (ox, oy) {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        g.addColorStop(0, 'rgba(' + v + ',' + v + ',' + (v - 4) + ',0.5)');
        g.addColorStop(1, 'rgba(' + v + ',' + v + ',' + (v - 4) + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      });
    }
    // Зерно гранита: светлые и тёмные крапинки.
    for (let i = 0; i < 9000; i++) {
      const v = rand() < 0.5 ? 70 + Math.floor(rand() * 60) : 200 + Math.floor(rand() * 55);
      ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.25 + rand() * 0.35) + ')';
      ctx.fillRect(rand() * S, rand() * S, 1 + rand() * 2, 1 + rand() * 2);
    }
    // Трещины.
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const pts = [[rand() * S, rand() * S]];
      let a = rand() * Math.PI * 2;
      for (let j = 0; j < 6; j++) {
        a += (rand() - 0.5) * 1.1;
        const q = pts[pts.length - 1];
        pts.push([q[0] + Math.cos(a) * (10 + rand() * 20), q[1] + Math.sin(a) * (10 + rand() * 20)]);
      }
      tiled(function (ox, oy) {
        ctx.strokeStyle = 'rgba(70,66,62,0.55)';
        ctx.beginPath();
        ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy);
        for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0] + ox, pts[j][1] + oy);
        ctx.stroke();
      });
    }
    // Лишайник: рваные рыжие наросты по блуждающей цепочке центров, кое-где с серо-зелёным.
    const lichen = ['214,108,46', '232,140,60', '190,86,40', '226,164,84', '160,150,96'];
    for (let i = 0; i < 7; i++) {
      let cx = rand() * S;
      let cy = rand() * S;
      for (let j = 0; j < 7; j++) {
        cx += (rand() - 0.5) * 60;
        cy += (rand() - 0.5) * 60;
        const r = 14 + rand() * 26;
        for (let n = 0; n < 70; n++) {
          const a = rand() * Math.PI * 2;
          const d = r * Math.sqrt(rand());
          const x = cx + Math.cos(a) * d;
          const y = cy + Math.sin(a) * d;
          const rr = 1 + rand() * 3.2;
          ctx.fillStyle = 'rgba(' + lichen[Math.floor(rand() * lichen.length)] + ',' + (0.5 + rand() * 0.4) + ')';
          tiled(function (ox, oy) {
            ctx.beginPath();
            ctx.arc(x + ox, y + oy, rr, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }
    }
    stoneTexture = new THREE.CanvasTexture(canvas);
    stoneTexture.colorSpace = THREE.SRGBColorSpace;
    stoneTexture.wrapS = stoneTexture.wrapT = THREE.RepeatWrapping;
    stoneTexture.anisotropy = 8;
    return stoneTexture;
  }

  // Скальная стенка уступа (real): горизонтальные пласты, вертикальные трещины отдельности со светлой верхней кромкой,
  // зерно гранита, рыжий лишайник и потёки воды. Бесшовно; одна канва — цветом (sRGB) и рельефом (bump).
  let strataTextures = null;

  function strataMap() {
    if (strataTextures) return strataTextures;
    const S = 512;
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d');
    const rand = rng(61);
    function tiled(draw) {
      for (let ox = -S; ox <= S; ox += S) for (let oy = -S; oy <= S; oy += S) draw(ox, oy);
    }
    // Пласты: толщина 28–72 px, последний добирает до края тайла, чтобы повтор по высоте был без шва.
    const bounds = [0];
    while (S - bounds[bounds.length - 1] > 100) bounds.push(bounds[bounds.length - 1] + 28 + Math.floor(rand() * 44));
    bounds.push(S);
    ctx.fillStyle = '#c4c1ba';
    ctx.fillRect(0, 0, S, S);
    for (let l = 0; l < bounds.length - 1; l++) {
      const y0 = bounds[l];
      const y1 = bounds[l + 1];
      const v = 172 + Math.floor(rand() * 52);
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, 'rgb(' + (v + 22) + ',' + (v + 21) + ',' + (v + 18) + ')');
      g.addColorStop(0.12, 'rgb(' + v + ',' + (v - 1) + ',' + (v - 4) + ')');
      g.addColorStop(0.8, 'rgb(' + (v - 8) + ',' + (v - 9) + ',' + (v - 12) + ')');
      g.addColorStop(1, 'rgb(' + (v - 40) + ',' + (v - 41) + ',' + (v - 42) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, y0, S, y1 - y0);
      // Пятна тона внутри пласта: мягкие овалы, чтобы скала не делилась на прямоугольные плитки.
      for (let i = 0; i < 6; i++) {
        const x = rand() * S;
        const w = 30 + rand() * 90;
        const t = 150 + Math.floor(rand() * 90);
        tiled(function (ox) {
          ctx.fillStyle = 'rgba(' + t + ',' + t + ',' + (t - 3) + ',0.16)';
          ctx.beginPath();
          ctx.ellipse(x + ox, (y0 + y1) / 2, w / 2, (y1 - y0) / 2 - 2, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      // Редкие вертикальные трещины, часто не на всю толщину пласта: частая сетка швов читалась как кирпичная кладка.
      let x = rand() * 200;
      while (x < S) {
        const full = rand() < 0.4;
        const ya = full ? y0 : y0 + rand() * (y1 - y0) * 0.5;
        const yb = full ? y1 : ya + (y1 - ya) * (0.4 + rand() * 0.6);
        const pts = [[x, ya]];
        for (let yy = ya + 6; yy < yb; yy += 6) pts.push([pts[pts.length - 1][0] + (rand() - 0.5) * 7, yy]);
        pts.push([pts[pts.length - 1][0] + (rand() - 0.5) * 7, yb]);
        const wide = full && rand() < 0.4;
        tiled(function (ox) {
          ctx.lineWidth = wide ? 3 : 1.6;
          ctx.strokeStyle = 'rgba(52,49,46,0.6)';
          ctx.beginPath();
          for (let j = 0; j < pts.length; j++) ctx[j ? 'lineTo' : 'moveTo'](pts[j][0] + ox, pts[j][1]);
          ctx.stroke();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = 'rgba(236,234,228,0.5)';
          ctx.beginPath();
          for (let j = 0; j < pts.length; j++) ctx[j ? 'lineTo' : 'moveTo'](pts[j][0] + ox + (wide ? 2.6 : 1.8), pts[j][1]);
          ctx.stroke();
        });
        x += 120 + rand() * 260;
      }
      // Шов пласта: тёмная щель, под ней светлая кромка нижнего пласта.
      ctx.fillStyle = 'rgba(46,43,40,0.85)';
      ctx.fillRect(0, y1 - 2.5, S, 2.5);
      ctx.fillStyle = 'rgba(240,238,232,0.55)';
      ctx.fillRect(0, y1 % S, S, 1.5);
    }
    // Зерно гранита.
    for (let i = 0; i < 14000; i++) {
      const v = rand() < 0.55 ? 60 + Math.floor(rand() * 60) : 205 + Math.floor(rand() * 50);
      ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.2 + rand() * 0.35) + ')';
      ctx.fillRect(rand() * S, rand() * S, 1 + rand() * 1.6, 1 + rand() * 1.6);
    }
    // Потёки воды из швов: узкие вертикальные полосы, гаснут книзу.
    for (let i = 0; i < 26; i++) {
      const l = Math.floor(rand() * (bounds.length - 1));
      const x = rand() * S;
      const y = bounds[l + 1] - 1;
      const len = 30 + rand() * 110;
      const w = 3 + rand() * 7;
      tiled(function (ox, oy) {
        const g = ctx.createLinearGradient(0, y + oy, 0, y + oy + len);
        g.addColorStop(0, 'rgba(84,76,64,0.42)');
        g.addColorStop(1, 'rgba(84,76,64,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x + ox, y + oy, w, len);
      });
    }
    // Лишайник рыжими колониями, гуще по верхним кромкам пластов.
    const lichen = ['214,108,46', '232,140,60', '190,86,40', '226,164,84', '150,146,92'];
    for (let i = 0; i < 9; i++) {
      const l = Math.floor(rand() * (bounds.length - 1));
      let cx = rand() * S;
      let cy = bounds[l] + 4 + rand() * 10;
      for (let j = 0; j < 5; j++) {
        cx += (rand() - 0.5) * 50;
        cy += (rand() - 0.3) * 12;
        const r = 8 + rand() * 18;
        for (let n = 0; n < 45; n++) {
          const a = rand() * Math.PI * 2;
          const d = r * Math.sqrt(rand());
          const x = cx + Math.cos(a) * d;
          const y = cy + Math.sin(a) * d * 0.6;
          const rr = 0.8 + rand() * 2.6;
          ctx.fillStyle = 'rgba(' + lichen[Math.floor(rand() * lichen.length)] + ',' + (0.45 + rand() * 0.45) + ')';
          tiled(function (ox, oy) {
            ctx.beginPath();
            ctx.arc(x + ox, y + oy, rr, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const bump = new THREE.CanvasTexture(canvas);
    map.wrapS = map.wrapT = bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    map.anisotropy = bump.anisotropy = 8;
    strataTextures = { map: map, bump: bump };
    return strataTextures;
  }

  // Нормали с порогом угла: плавно по выпуклостям, резкий излом на сколах (между гранями > 40°).
  function smoothNormals(geo) {
    const pos = geo.attributes.position;
    const count = pos.count;
    const fn = [];
    const groups = new Map();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (let t = 0; t < count / 3; t++) {
      a.fromBufferAttribute(pos, t * 3);
      b.fromBufferAttribute(pos, t * 3 + 1).sub(a);
      c.fromBufferAttribute(pos, t * 3 + 2).sub(a);
      fn.push(b.cross(c).normalize().clone());
    }
    const key = function (i) { return Math.round(pos.getX(i) * 1e4) + ',' + Math.round(pos.getY(i) * 1e4) + ',' + Math.round(pos.getZ(i) * 1e4); };
    for (let i = 0; i < count; i++) {
      const k = key(i);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(i);
    }
    const normal = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const own = fn[Math.floor(i / 3)];
      const list = groups.get(key(i));
      a.set(0, 0, 0);
      for (let j = 0; j < list.length; j++) {
        const other = fn[Math.floor(list[j] / 3)];
        if (other.dot(own) > 0.77) a.add(other);
      }
      a.normalize();
      normal[i * 3] = a.x;
      normal[i * 3 + 1] = a.y;
      normal[i * 3 + 2] = a.z;
    }
    geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  }

  // Колотая глыба: скруглённый куб (суперэллипсоид), углы срезаны плоскими сколами, поверх лёгкая неровность.
  // Деформация — функция исходной точки, поэтому общие вершины соседних треугольников не расходятся.
  // atlas: развёртка под атлас 2×2 сырой руды (oreMaps) вместо повторяющейся фактуры.
  function rockGeometry(seed, atlas) {
    const rand = rng(seed);
    const geo = new THREE.IcosahedronGeometry(1, 4);
    const chips = [];
    const count = (atlas ? 8 : 6) + Math.floor(rand() * 4);
    for (let i = 0; i < count; i++) {
      const n = new THREE.Vector3((rand() < 0.5 ? -1 : 1) * (0.4 + rand()), (rand() < 0.35 ? -0.4 : 1) * (0.3 + rand()), (rand() < 0.5 ? -1 : 1) * (0.4 + rand())).normalize();
      chips.push([n, (atlas ? 0.33 : 0.36) + rand() * 0.1]);
    }
    const f1 = 1.7 + rand() * 1.2;
    const f2 = 4.1 + rand() * 2;
    const ph = rand() * 10;
    const pos = geo.attributes.position;
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      // Сырая глыба — почти острые рёбра (степень 10): на 6 груда читалась мягкими подушками.
      const pw = atlas ? 10 : 6;
      const box = Math.pow(Math.pow(Math.abs(p.x), pw) + Math.pow(Math.abs(p.y), pw) + Math.pow(Math.abs(p.z), pw), 1 / pw);
      const bumpy = 1 + 0.035 * Math.sin(p.x * f1 + ph) * Math.sin(p.y * f1 * 1.3 - ph) + 0.02 * Math.sin(p.z * f2 + p.x * f2 * 0.7 + ph * 2);
      p.multiplyScalar(0.5 * bumpy / box);
      for (let j = 0; j < chips.length; j++) {
        const over = p.dot(chips[j][0]) - chips[j][1];
        if (over > 0) p.addScaledVector(chips[j][0], -over);
      }
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    smoothNormals(geo);
    // Развёртка кубом по доминирующей оси треугольника: фактура не тянется на сколах.
    const uv = geo.attributes.uv;
    const normal = geo.attributes.normal;
    for (let t = 0; t < pos.count; t += 3) {
      let nx = 0;
      let ny = 0;
      let nz = 0;
      let up = 0;
      for (let j = 0; j < 3; j++) {
        nx += Math.abs(normal.getX(t + j));
        ny += Math.abs(normal.getY(t + j));
        nz += Math.abs(normal.getZ(t + j));
        up += normal.getY(t + j);
      }
      for (let j = 0; j < 3; j++) {
        const i = t + j;
        if (atlas) {
          // Тайлы: x — откол со шпурами, z — пиленая грань, верх, низ. Зажим 0.01–0.99: тайлы не залезают друг на друга.
          const lx = Math.min(0.99, Math.max(0.01, pos.getX(i) + 0.5));
          const ly = Math.min(0.99, Math.max(0.01, pos.getY(i) + 0.5));
          const lz = Math.min(0.99, Math.max(0.01, pos.getZ(i) + 0.5));
          if (nx >= ny && nx >= nz) uv.setXY(i, lz * 0.5, 0.5 + ly * 0.5);
          else if (ny >= nz) uv.setXY(i, (up > 0 ? 0 : 0.5) + lx * 0.5, lz * 0.5);
          else uv.setXY(i, 0.5 + lx * 0.5, 0.5 + ly * 0.5);
        } else if (nx >= ny && nx >= nz) uv.setXY(i, pos.getZ(i), pos.getY(i));
        else if (ny >= nz) uv.setXY(i, pos.getX(i), pos.getZ(i));
        else uv.setXY(i, pos.getX(i), pos.getY(i));
      }
    }
    return geo;
  }

  // Сырая руда: тон — цвет материала из logic (как блоки здания), прожилки и вкрапления — свои у каждой руды.
  // vein: [цвет, металл, шероховатость, ширина]; spot: [цвет, металл, шероховатость, плотность, размер в px].
  const ORE = {
    tin: { rock: 0x9a9c9f, mix: 0.55, vein: [0xe4e9ee, 0.85, 0.3, 0.03], spot: [0x2f2824, 0, 0.7, 0.4, 1.4] },
    copper: { rock: 0x86654f, mix: 0.7, vein: [0xf0a066, 1, 0.3, 0.035], spot: [0x4fb5a2, 0, 0.8, 0.22, 2] },
    malachite: { rock: 0x4c6b58, mix: 0.85, bands: [0x0e4a2b, 0x46b67f], vein: [0x0b2e1c, 0, 0.4, 0.015] },
    bronze: { rock: 0x7a6250, mix: 0.65, vein: [0xd09858, 0.9, 0.35, 0.025], spot: [0xe0ac68, 1, 0.25, 0.3, 1] },
    silver: { rock: 0xc4c8cc, mix: 0.6, vein: [0xf4f7fa, 1, 0.18, 0.04], spot: [0x4a4e56, 0.3, 0.6, 0.14, 1.2] },
    cobalt: { rock: 0x56606f, mix: 0.7, vein: [0xa9c0e6, 0, 0.5, 0.025], spot: [0x3d7ae0, 0.15, 0.25, 0.32, 2.4] },
    iron: { rock: 0x6e6a67, mix: 0.6, rust: 0x9c5a34, vein: [0x3e434a, 0.8, 0.35, 0.05] },
    gold: { rock: 0xb39a5c, mix: 0.6, vein: [0xf1ede2, 0, 0.45, 0.05], spot: [0xffd65c, 1, 0.2, 0.4, 1.2], onVein: true },
    lead: { rock: 0x5e6470, mix: 0.7, vein: [0x80889a, 0.6, 0.4, 0.02], spot: [0xa2abbb, 1, 0.22, 0.38, 2.4], cube: true },
  };
  // Профиль руды по материалу (balance.json → materials.ladder): металлы — свои жилы, самоцветы — вкрапления
  // своего цвета, малахит — полосы, остальное (камень, кирпич, дерево…) — простая глыба в тон материала.
  const ORE_BY_ID = {
    'ladder-copper': 'copper', 'ladder-bronze': 'bronze', 'ladder-brass': 'bronze', 'ladder-orichalcum': 'bronze',
    'ladder-iron': 'iron', 'ladder-steel-hard': 'iron', 'ladder-meteor-iron': 'iron', 'ladder-titanium': 'iron',
    'ladder-gold': 'gold', 'ladder-sun-gold': 'gold', 'ladder-silver': 'silver', 'ladder-silver-pure': 'silver',
    'ladder-steel-mirror': 'silver', 'ladder-osmium': 'lead', 'ladder-malachite': 'malachite',
  };
  const GEM_LOOKS = { crystal: true, gem: true, lapis: true, diamond: true, opal: true, amber: true };

  function oreProfile(id, tone) {
    if (ORE_BY_ID[id]) return ORE[ORE_BY_ID[id]];
    const spec = window.MicroBuilders && window.MicroBuilders.MATERIAL[id];
    const look = spec ? spec.look : 'stone';
    if (look === 'metal') return ORE.tin;
    if (look === 'platinum') return ORE.silver;
    if (GEM_LOOKS[look]) return { rock: 0x6a6660, mix: 0.3, vein: [0xd8d2c8, 0, 0.5, 0.02], spot: [tone, 0.1, 0.2, 0.36, 2.2] };
    return { rock: tone, mix: 1 };
  }
  const oreCache = new Map();

  // Смена стройки: в кэше остаются фактуры руды только её рудников.
  function keep(ids) {
    const wanted = new Set(ids);
    oreCache.forEach(function (maps, id) {
      if (wanted.has(id)) return;
      maps.map.dispose();
      maps.bump.dispose();
      maps.orm.dispose();
      oreCache.delete(id);
    });
  }

  function hash2(a, b) {
    let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h ^= h >>> 12;
    return (h >>> 0) / 4294967296;
  }

  function vnoise(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    let fx = x - ix;
    let fy = y - iy;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const a = hash2(ix, iy);
    const b = hash2(ix + 1, iy);
    const c = hash2(ix, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + hash2(ix + 1, iy + 1)) * fx * fy;
  }

  function fbm(x, y) {
    return vnoise(x, y) * 0.57 + vnoise(x * 2.03 + 5.1, y * 2.03 + 1.7) * 0.29 + vnoise(x * 4.11 + 9.3, y * 4.11 + 3.9) * 0.14;
  }

  function smooth(a, b, x) {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function rgb(hex) {
    return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
  }

  function mixHex(a, b, t) {
    const p = rgb(a);
    const q = rgb(b);
    return (Math.round(p[0] + (q[0] - p[0]) * t) << 16) | (Math.round(p[1] + (q[1] - p[1]) * t) << 8) | Math.round(p[2] + (q[2] - p[2]) * t);
  }

  // Атлас 2×2 по 128 px (развёртка rockGeometry(seed, true)): откол с рядом полуцилиндров шпуров, пиленая грань с дугами
  // диска, верх с выемками шпуров и пылью, низ в земле. Три канвы: цвет, рельеф, шероховатость (G) и металл (B).
  function oreMaps(id, tone) {
    if (oreCache.has(id)) return oreCache.get(id);
    const T = 128;
    const S = T * 2;
    const o = oreProfile(id, tone);
    const base = rgb(mixHex(o.rock, tone, o.mix));
    let seed = 7;
    for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) % 97;
    const hr = rng(seed + 5);
    const holes = [];
    // Три шпура на грань: пять тёмных желобов читались штрихкодом.
    for (let i = 0; i < 3; i++) holes.push([(0.24 + i * 0.26 + (hr() - 0.5) * 0.04) * T, (0.4 + hr() * 0.3) * T]);
    const R = 0.055 * T;
    const vein = o.vein && rgb(o.vein[0]);
    const spot = o.spot && rgb(o.spot[0]);
    const dark = o.bands && rgb(o.bands[0]);
    const light = o.bands && rgb(o.bands[1]);
    const rust = o.rust && rgb(o.rust);
    const dust = rgb(0xbca98c);
    const earth = rgb(0x5d4b3a);
    const canvases = [];
    const images = [];
    for (let i = 0; i < 3; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = S;
      canvas.height = S;
      canvases.push(canvas);
      images.push(canvas.getContext('2d').createImageData(S, S));
    }
    const col = [0, 0, 0];
    function blend(c, t) {
      col[0] += (c[0] - col[0]) * t;
      col[1] += (c[1] - col[1]) * t;
      col[2] += (c[2] - col[2]) * t;
    }
    for (let py = 0; py < S; py++) {
      for (let px = 0; px < S; px++) {
        const tile = (py < T ? 0 : 2) + (px < T ? 0 : 1);
        const lx = px % T;
        const ly = py % T;
        const X = px / T * 3 + seed;
        const Y = py / T * 3;
        const n = fbm(X * 2, Y * 2);
        const g = vnoise(X * 24, Y * 24);
        const saw = tile === 1;
        let h = 0.5 + (n - 0.5) * (saw ? 0.12 : 0.8) + (g - 0.5) * (saw ? 0.04 : 0.25);
        let rough = saw ? (o.bands ? 0.3 : 0.62) : 0.9;
        let metal = 0;
        let ao = 1;
        const tn = (0.86 + 0.28 * n) * (0.94 + 0.12 * g) * (saw ? 1.05 : 1);
        col[0] = base[0] * tn;
        col[1] = base[1] * tn;
        col[2] = base[2] * tn;
        if (o.bands) {
          // Малахит: концентрические полосы тёмной и светлой зелени.
          const s = 0.5 + 0.5 * Math.sin((fbm(X * 0.7 + 4, Y * 0.7) * 9 + (px + py) / T * 1.5) * 6.283);
          const c = s * s;
          blend([dark[0] + (light[0] - dark[0]) * c, dark[1] + (light[1] - dark[1]) * c, dark[2] + (light[2] - dark[2]) * c], 0.75);
        }
        let near = 0;
        if (vein) {
          const d = Math.abs(fbm(X * 0.8 + 11, Y * 0.8 + 3) - 0.5);
          const w = o.vein[3];
          near = 1 - smooth(w, w * 2.5, d);
          const e = (1 - smooth(w * 0.25, w * 0.5, d)) * smooth(0.3, 0.55, vnoise(X * 1.5 + 7, Y * 1.5 + 2));
          if (e > 0) {
            blend(vein, e);
            rough += (o.vein[2] - rough) * e;
            metal += (o.vein[1] - metal) * e;
            h += e * 0.06;
          }
        }
        if (spot) {
          const size = o.spot[4];
          const cs = size * 4;
          const cx = Math.floor(px / cs);
          const cy = Math.floor(py / cs);
          if (hash2(cx + seed * 7, cy) < o.spot[3]) {
            const ox = px - (cx + 0.3 + 0.4 * hash2(cy, cx + 3)) * cs;
            const oy = py - (cy + 0.3 + 0.4 * hash2(cx + 1, cy + 9)) * cs;
            const rr = size * (0.6 + 0.6 * hash2(cx + 9, cy + 5));
            const d = o.cube ? Math.max(Math.abs(ox), Math.abs(oy)) : Math.hypot(ox, oy);
            let e = 1 - smooth(rr * 0.6, rr, d);
            if (o.onVein) e *= near;
            if (e > 0) {
              // Кубики галенита: светлая и тёмная грань, иначе читаются круглыми пятнами.
              const shade = o.cube ? (ox + oy < 0 ? 1.18 : 0.86) : 1;
              blend([spot[0] * shade, spot[1] * shade, spot[2] * shade], e);
              rough += (o.spot[2] - rough) * e;
              metal += (o.spot[1] - metal) * e;
              h += e * 0.1;
            }
          }
        }
        if (rust && tile < 2) {
          // Ржавые потёки сверху вниз по бокам.
          const s = smooth(0.55, 0.8, vnoise(X * 6 + 3, Y * 0.9)) * (0.5 + 0.5 * vnoise(X * 2, Y * 2));
          blend(rust, s * 0.7);
          rough += (0.95 - rough) * s;
        }
        if (tile === 0) {
          for (let i = 0; i < holes.length; i++) {
            const dx = lx - holes[i][0];
            if (Math.abs(dx) >= R) continue;
            const dd = Math.hypot(dx, Math.max(0, ly - (holes[i][1] - R)));
            if (dd >= R) continue;
            const q = Math.sqrt(1 - (dd / R) * (dd / R));
            h += -0.3 * q + 0.03 * q * Math.sin(ly * 1.3);
            ao *= 1 - 0.2 * q;
            rough = 0.92;
            metal *= 1 - q;
          }
        } else if (tile === 1) {
          const arc = 0.5 + 0.5 * Math.sin(Math.hypot(lx + 0.7 * T, ly - 1.5 * T) * 6.283 / 4.5);
          const k = 0.6 + 0.4 * vnoise(X * 3, Y * 3);
          h += 0.035 * arc * k;
          const a = 0.97 + 0.05 * arc * k;
          col[0] *= a;
          col[1] *= a;
          col[2] *= a;
        } else if (tile === 2) {
          for (let i = 0; i < holes.length; i++) {
            const dy = ly - (T - holes[i][0]);
            if (Math.abs(dy) >= R) continue;
            for (let edge = 0; edge <= T; edge += T) {
              const dd = Math.hypot(lx - edge, dy);
              if (dd >= R) continue;
              const q = Math.sqrt(1 - (dd / R) * (dd / R));
              h -= 0.3 * q;
              ao *= 1 - 0.25 * q;
            }
          }
          blend(dust, 0.12 + 0.12 * fbm(X * 1.3, Y * 1.3));
        } else {
          col[0] *= 0.7;
          col[1] *= 0.7;
          col[2] *= 0.7;
          blend(earth, 0.5);
        }
        h = Math.min(1, Math.max(0, h));
        const lum = ao * (0.84 + 0.32 * h);
        const at = (py * S + px) * 4;
        const m = images[0].data;
        m[at] = col[0] * lum;
        m[at + 1] = col[1] * lum;
        m[at + 2] = col[2] * lum;
        m[at + 3] = 255;
        const b = images[1].data;
        b[at] = b[at + 1] = b[at + 2] = h * 255;
        b[at + 3] = 255;
        const r = images[2].data;
        r[at] = 255;
        r[at + 1] = Math.min(1, rough) * 255;
        r[at + 2] = Math.min(1, metal) * 255;
        r[at + 3] = 255;
      }
    }
    for (let i = 0; i < 3; i++) canvases[i].getContext('2d').putImageData(images[i], 0, 0);
    const maps = { map: new THREE.CanvasTexture(canvases[0]), bump: new THREE.CanvasTexture(canvases[1]), orm: new THREE.CanvasTexture(canvases[2]) };
    maps.map.colorSpace = THREE.SRGBColorSpace;
    oreCache.set(id, maps);
    return maps;
  }

  // Одна геометрия на рудник: у каждой глыбы своя кривизна граней (сдвиг по нормали от номера экземпляра),
  // иначе груда — одинаковые повёрнутые кубики. Тень от сдвига на ±0,06 не отличима.
  function oreShader(shader) {
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', [
      '#include <begin_vertex>',
      'float mbI = float( gl_InstanceID );',
      'transformed += objectNormal * 0.06 * sin( dot( position, vec3( 3.1, 2.3, 2.7 ) ) + mbI * 2.17 ) * sin( dot( position, vec3( -2.4, 3.6, 1.9 ) ) + mbI * 1.31 );',
    ].join('\n'));
  }

  // Подсыпка под грудами руды: низкий холм, спадает за MOUND_D от клеток нижнего ряда. dist — скруглённое
  // расстояние до клеток (внутри < 0), at — высота (ниже −0.02 холм уходит под землю).
  const MOUND_H = 0.13;
  const MOUND_D = 0.45;

  function mounds(level) {
    const piles = level.mines.map(function (mine) {
      const cells = mine.rocks.filter(function (r) { return r.y === 0; });
      const pile = { cells: cells, x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
      for (let i = 0; i < cells.length; i++) {
        pile.x0 = Math.min(pile.x0, cells[i].x);
        pile.x1 = Math.max(pile.x1, cells[i].x + 1);
        pile.z0 = Math.min(pile.z0, cells[i].z);
        pile.z1 = Math.max(pile.z1, cells[i].z + 1);
      }
      return pile;
    });
    function dist(x, z) {
      let best = Infinity;
      for (let p = 0; p < piles.length; p++) {
        const pile = piles[p];
        if (x < pile.x0 - 1 || x > pile.x1 + 1 || z < pile.z0 - 1 || z > pile.z1 + 1) continue;
        for (let i = 0; i < pile.cells.length; i++) {
          const qx = Math.max(Math.abs(x - pile.cells[i].x - 0.5) - 0.2, 0);
          const qz = Math.max(Math.abs(z - pile.cells[i].z - 0.5) - 0.2, 0);
          best = Math.min(best, Math.hypot(qx, qz) - 0.3);
        }
      }
      return best;
    }
    function at(x, z) {
      const d = dist(x, z) + 0.08 * Math.sin(x * 3.1 + z * 1.7) * Math.sin(z * 2.3 - x * 1.1);
      return MOUND_H * (1 - smooth(0, MOUND_D, d)) - 0.03;
    }
    return { piles: piles, dist: dist, at: at };
  }

  // Холм — тот же материал, что земля, с её мировыми UV: шва с площадкой нет. Сетка 0.1 клетки, без пустых квадов.
  function moundMesh(mound, material, gx, gz, half) {
    const STEP = 0.1;
    const pad = MOUND_D + 0.15;
    const pos = [];
    const uv = [];
    const index = [];
    for (let p = 0; p < mound.piles.length; p++) {
      const pile = mound.piles[p];
      if (!pile.cells.length) continue;
      const nx = Math.ceil((pile.x1 - pile.x0 + pad * 2) / STEP);
      const nz = Math.ceil((pile.z1 - pile.z0 + pad * 2) / STEP);
      const start = pos.length / 3;
      for (let j = 0; j <= nz; j++) {
        for (let i = 0; i <= nx; i++) {
          const x = pile.x0 - pad + i * STEP;
          const z = pile.z0 - pad + j * STEP;
          pos.push(x, mound.at(x, z), z);
          uv.push((x - gx + half) / (2 * half), (half - (z - gz)) / (2 * half));
        }
      }
      for (let j = 0; j < nz; j++) {
        for (let i = 0; i < nx; i++) {
          const a = start + j * (nx + 1) + i;
          const b = a + nx + 1;
          if (Math.max(pos[a * 3 + 1], pos[(a + 1) * 3 + 1], pos[b * 3 + 1], pos[(b + 1) * 3 + 1]) < -0.025) continue;
          index.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(index);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  // Лужа: вода (тёмная, гладкая, полуметалл — небо из envMap только отсветом) и широкий мокрый ободок с мягким краем.
  // Светлая вода читалась белым пятном краски. Вода чуть тёплая: синий зенит отражается в ней серо-голубым, а не чернилами.
  // Ободок матовый и без окружения (aoMap = R): иначе он ловил небо и светился голубым ореолом.
  let puddleTextures = null;

  function puddleMaps() {
    if (puddleTextures) return puddleTextures;
    const W = 256;
    const H = 128;
    const canvases = [];
    const images = [];
    for (let i = 0; i < 2; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      canvases.push(canvas);
      images.push(canvas.getContext('2d').createImageData(W, H));
    }
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const nx = (px + 0.5) / W * 2 - 1;
        const nz = (py + 0.5) / H * 2 - 1;
        const a = Math.atan2(nz, nx);
        const edge = 1 + 0.12 * Math.sin(a * 3 + 1) + 0.07 * Math.sin(a * 5 + 2) + 0.05 * Math.sin(a * 7 + 4);
        const e = Math.hypot(nx, nz) * 1.24 / edge;
        const w = smooth(0.5, 0.58, e);
        const n = vnoise(px * 0.08, py * 0.16);
        const at = (py * W + px) * 4;
        const m = images[0].data;
        m[at] = 96 + (62 - 96) * w + (n - 0.5) * 10;
        m[at + 1] = 90 + (46 - 90) * w + (n - 0.5) * 10;
        m[at + 2] = 82 + (33 - 82) * w + (n - 0.5) * 8;
        m[at + 3] = (1 + (0.7 * (1 - smooth(0.66, 1, e)) * (0.8 + 0.4 * n) - 1) * w) * 255;
        const r = images[1].data;
        r[at] = (1 - 0.8 * w) * 255;
        r[at + 1] = (0.05 + 0.85 * w) * 255;
        r[at + 2] = 0.7 * (1 - w) * 255;
        r[at + 3] = 255;
      }
    }
    for (let i = 0; i < 2; i++) canvases[i].getContext('2d').putImageData(images[i], 0, 0);
    puddleTextures = { map: new THREE.CanvasTexture(canvases[0]), orm: new THREE.CanvasTexture(canvases[1]) };
    puddleTextures.map.colorSpace = THREE.SRGBColorSpace;
    return puddleTextures;
  }

  // Лужи в низинах колей (spots из tracks): вне стройки и рудников, не ближе 1.6 друг к другу, въезд — первым.
  // По умолчанию 2–3 мелкие; в дождь игры (wetOf — намокание земли) появляются остальные и все растут.
  function puddles(level, b, spots, rand, env, wetOf) {
    const f = level.footprint;
    const order = spots.map(function (s) { return [s, s[4] + rand()]; }).sort(function (p, q) { return p[1] - q[1]; });
    const chosen = [];
    for (let i = 0; i < order.length && chosen.length < 12; i++) {
      const s = order[i][0];
      if (s[1] > b.maxZ + 8) continue;
      if (s[0] > f.minX - 1 && s[0] < f.maxX + 2 && s[1] > f.minZ - 1 && s[1] < f.maxZ + 2) continue;
      if (level.mines.some(function (m) { return Math.hypot(s[0] - m.x - 0.5, s[1] - m.z - 0.5) < 2.6; })) continue;
      if (chosen.some(function (c) { return Math.hypot(c[0] - s[0], c[1] - s[1]) < 1.6; })) continue;
      chosen.push(s);
    }
    if (!chosen.length) return null;
    const n = chosen.length;
    const first = Math.min(n, 2 + (rand() < 0.5 ? 1 : 0));
    const sizes = chosen.map(function () { return [0.6 + rand() * 0.5, 0.36 + rand() * 0.16]; });
    const t = puddleMaps();
    const material = new THREE.MeshStandardMaterial({
      map: t.map,
      roughnessMap: t.orm,
      metalnessMap: t.orm,
      aoMap: t.orm,
      roughness: 1,
      metalness: 1,
      envMap: env,
      // Половина неба: в полную силу синее отражение читалось пятном краски.
      envMapIntensity: 0.55,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), material, n);
    mesh.renderOrder = 1;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const dummy = new THREE.Object3D();
    let last = -1;
    mesh.onBeforeRender = function () {
      const wet = wetOf ? Math.min(1, wetOf()) : 0;
      if (last >= 0 && Math.abs(wet - last) <= 0.01) return;
      last = wet;
      const extra = wet * (n - first);
      let count = 0;
      for (let i = 0; i < n; i++) {
        const grow = i < first ? 1 : Math.min(1, extra - (i - first));
        if (grow <= 0) break;
        const s = chosen[i];
        const k = (1 + 0.9 * wet) * grow;
        dummy.position.set(s[0], 0.016, s[1]);
        dummy.rotation.set(0, Math.atan2(-s[3], s[2]), 0);
        dummy.scale.set(sizes[i][0] * k, 1, sizes[i][1] * k);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        count = i + 1;
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    };
    return mesh;
  }

  // Контактная тень: мягкое тёмное пятно под камнями и техникой — там, куда не доходит рассеянный свет.
  let blobMaterial = null;
  let blobGeometry = null;

  function blob() {
    if (!blobMaterial) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(0,0,0,0.9)');
      g.addColorStop(0.4, 'rgba(0,0,0,0.6)');
      g.addColorStop(0.75, 'rgba(0,0,0,0.16)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      const map = new THREE.CanvasTexture(canvas);
      blobMaterial = new THREE.MeshBasicMaterial({ map: map, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      blobGeometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    }
    const mesh = new THREE.Mesh(blobGeometry, blobMaterial);
    mesh.renderOrder = 1;
    return mesh;
  }

  // Тени облаков: мягкие пятна по земле, медленно плывут. Текстура бесшовная, время — uniform из onBeforeRender.
  const CLOUD_T = { value: new THREE.Vector2() };
  let cloudTexture = null;

  function cloudMap() {
    if (cloudTexture) return cloudTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const rand = rng(5);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 9; i++) {
      const x = rand() * 128;
      const y = rand() * 128;
      const r = 14 + rand() * 18;
      // Каждое пятно девять раз со сдвигом на размер текстуры — швов на повторе нет.
      for (let ox = -128; ox <= 128; ox += 128) {
        for (let oy = -128; oy <= 128; oy += 128) {
          const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          g.addColorStop(0, 'rgba(255,255,255,0.75)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        }
      }
    }
    cloudTexture = new THREE.CanvasTexture(canvas);
    cloudTexture.wrapS = THREE.RepeatWrapping;
    cloudTexture.wrapT = THREE.RepeatWrapping;
    return cloudTexture;
  }

  // Фактура земли вблизи (look4): комья, трещины засохшей земли, камешки с бликом сверху-слева и тенью снизу-справа
  // (солнце слева спереди), пыль. Тайл 4 клетки, 128 px на клетку, бесшовный; среднее ≈ 128 — издали мип-уровни дают 1.
  let grainTexture = null;

  function grainMap() {
    if (grainTexture) return grainTexture;
    const S = 512;
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d');
    const rand = rng(17);
    // Каждый мазок девять раз со сдвигом на размер тайла — швов на повторе нет.
    function tiled(draw) {
      for (let ox = -S; ox <= S; ox += S) for (let oy = -S; oy <= S; oy += S) draw(ox, oy);
    }
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 150; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const r = 18 + rand() * 60;
      const v = 92 + Math.floor(rand() * 76);
      tiled(function (ox, oy) {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        g.addColorStop(0, 'rgba(' + v + ',' + v + ',' + v + ',0.42)');
        g.addColorStop(1, 'rgba(' + v + ',' + v + ',' + v + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      });
    }
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 30; i++) {
      let x = rand() * S;
      let y = rand() * S;
      let a = rand() * Math.PI * 2;
      const pts = [[x, y]];
      for (let j = 0; j < 7; j++) {
        a += (rand() - 0.5) * 1.3;
        x += Math.cos(a) * (6 + rand() * 12);
        y += Math.sin(a) * (6 + rand() * 12);
        pts.push([x, y]);
      }
      tiled(function (ox, oy) {
        ctx.strokeStyle = 'rgba(58,58,58,0.5)';
        ctx.beginPath();
        ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy);
        for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0] + ox, pts[j][1] + oy);
        ctx.stroke();
      });
    }
    for (let i = 0; i < 560; i++) {
      const x = rand() * S;
      const y = rand() * S;
      const r = 1.3 + rand() * rand() * 5.5;
      const q = 0.55 + rand() * 0.45;
      const turn = rand() * Math.PI;
      const v = 118 + Math.floor(rand() * 62);
      tiled(function (ox, oy) {
        ctx.fillStyle = 'rgba(40,40,40,0.55)';
        ctx.beginPath();
        ctx.ellipse(x + ox + r * 0.35, y + oy + r * 0.4, r, r * q, turn, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
        ctx.beginPath();
        ctx.ellipse(x + ox, y + oy, r, r * q, turn, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(235,235,235,0.6)';
        ctx.beginPath();
        ctx.ellipse(x + ox - r * 0.3, y + oy - r * 0.3, r * 0.45, r * q * 0.4, turn, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    for (let i = 0; i < 3000; i++) {
      const dark = i % 3 !== 0;
      const v = dark ? 70 + Math.floor(rand() * 40) : 160 + Math.floor(rand() * 30);
      ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (dark ? 0.5 : 0.45) + ')';
      ctx.fillRect(rand() * (S - 2), rand() * (S - 2), 1 + rand() * 1.5, 1 + rand() * 1.5);
    }
    grainTexture = new THREE.CanvasTexture(canvas);
    grainTexture.wrapS = THREE.RepeatWrapping;
    grainTexture.wrapT = THREE.RepeatWrapping;
    grainTexture.anisotropy = 8;
    return grainTexture;
  }

  // Затенение земли у стен здания: 4 текселя на клетку по рамке индекса уровня, пересчёт из game.js при укладке.
  const AO = { map: { value: null }, box: { value: new THREE.Vector4() } };
  const AO_RES = 4;
  const AO_PAD = 2; // клеток вокруг здания: тень спадает за 1.6, а край карты тянется по всей земле (ClampToEdge)
  let aoTexture = null;

  // Вес столба клетки: чем выше сплошная стена (до трёх рядов), тем гуще тень у её подножия.
  function occlusion(index, grid) {
    const w = (index.maxX - index.minX + 1 + 2 * AO_PAD) * AO_RES;
    const h = (index.maxZ - index.minZ + 1 + 2 * AO_PAD) * AO_RES;
    if (!aoTexture || aoTexture.image.width !== w || aoTexture.image.height !== h) {
      if (aoTexture) aoTexture.dispose();
      aoTexture = new THREE.DataTexture(new Uint8Array(w * h), w, h, THREE.RedFormat, THREE.UnsignedByteType);
      aoTexture.magFilter = THREE.LinearFilter;
      aoTexture.minFilter = THREE.LinearFilter;
      AO.map.value = aoTexture;
    }
    AO.box.value.set(index.minX - AO_PAD, index.minZ - AO_PAD, AO_RES / w, AO_RES / h);
    const cw = index.maxX - index.minX + 1;
    const ch = index.maxZ - index.minZ + 1;
    const column = new Float32Array(cw * ch);
    for (let x = index.minX; x <= index.maxX; x++) {
      for (let z = index.minZ; z <= index.maxZ; z++) {
        let v = 0;
        for (let y = 0; y < 3; y++) if (index.inside(x, y, z) && grid[index.id(x, y, z)] === 1) v += y === 0 ? 0.6 : y === 1 ? 0.28 : 0.12;
        column[(x - index.minX) + (z - index.minZ) * cw] = v;
      }
    }
    const data = aoTexture.image.data;
    for (let tz = 0; tz < h; tz++) {
      const pz = (tz + 0.5) / AO_RES - AO_PAD;
      for (let tx = 0; tx < w; tx++) {
        const px = (tx + 0.5) / AO_RES - AO_PAD;
        let occ = 0;
        for (let cx = Math.max(0, Math.floor(px) - 2); cx <= Math.min(cw - 1, Math.floor(px) + 2); cx++) {
          for (let cz = Math.max(0, Math.floor(pz) - 2); cz <= Math.min(ch - 1, Math.floor(pz) + 2); cz++) {
            const v = column[cx + cz * cw];
            if (v === 0) continue;
            const d = Math.hypot(Math.max(cx - px, 0, px - cx - 1), Math.max(cz - pz, 0, pz - cz - 1));
            const f = Math.max(0, 1 - d / 1.6);
            occ += v * f * f;
          }
        }
        data[tx + tz * w] = Math.min(255, Math.round(occ * 255));
      }
    }
    aoTexture.needsUpdate = true;
  }

  // Земля: тени облаков, зерно по миру, крупные пятна тона; MB_GROUND_AO — тень у стен здания;
  // MB_WORLD_BUMP — рельеф камешков и трещин из того же зерна по мировым xz (бамп-карта = grainMap).
  function cloudShader(shader) {
    shader.uniforms.mbGrain = { value: grainMap() };
    shader.uniforms.mbClouds = { value: cloudMap() };
    shader.uniforms.mbCloudT = CLOUD_T;
    shader.uniforms.mbAo = AO.map;
    shader.uniforms.mbAoBox = AO.box;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vMbGround;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef MB_WORLD_BUMP\nvBumpMapUv = ( modelMatrix * vec4( position, 1.0 ) ).xz * 0.2;\n#endif')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvMbGround = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D mbClouds;\nuniform sampler2D mbGrain;\nuniform vec2 mbCloudT;\nuniform sampler2D mbAo;\nuniform vec4 mbAoBox;\nvarying vec2 vMbGround;')
      .replace('#include <aomap_fragment>', [
        '#include <aomap_fragment>',
        '#ifdef MB_GROUND_AO',
        'float mbGa = texture2D( mbAo, ( vMbGround - mbAoBox.xy ) * mbAoBox.zw ).r;',
        'reflectedLight.indirectDiffuse *= 1.0 - 0.75 * mbGa;',
        'reflectedLight.directDiffuse *= 1.0 - 0.35 * mbGa;',
        '#endif',
      ].join('\n'))
      .replace('#include <opaque_fragment>', [
        'float mbMacro = texture2D( mbClouds, vMbGround * 0.043 + vec2( 0.31, 0.57 ) ).r;',
        'outgoingLight *= ( 1.0 - 0.14 * smoothstep( 0.25, 0.65, texture2D( mbClouds, vMbGround * 0.011 + mbCloudT ).r ) ) * ( 0.66 + 0.68 * texture2D( mbGrain, vMbGround * 0.2 ).r ) * ( 0.9 + 0.2 * mbMacro );',
        '#include <opaque_fragment>',
      ].join('\n'));
  }

  function cloudTick() {
    const t = performance.now() / 1000;
    CLOUD_T.value.set((t * 0.0035) % 1, (t * 0.0022) % 1);
  }

  // Тени облаков и зерно на меш земли (здесь — площадка и колеи, в game.js — дальняя трава).
  function clouds(mesh) {
    mesh.material.onBeforeCompile = cloudShader;
    mesh.onBeforeRender = cloudTick;
    return mesh;
  }

  // Контур «подковы»: правый бок от фронта, задний край, левый бок к фронту. Нормаль смотрит наружу.
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

  function nearestMine(level, x, z) {
    let best = null;
    let bestD = Infinity;
    for (let i = 0; i < level.mines.length; i++) {
      const mine = level.mines[i];
      const d = Math.hypot(mine.x + 0.5 - x, mine.z + 0.5 - z);
      if (d < bestD) {
        bestD = d;
        best = mine;
      }
    }
    return { mine: best, distance: bestD };
  }

  // Уступы (real): три наклонные скальные стенки по 5 рядов с плавной волной и полки грунта между ними, сверху плато.
  // Скала и грунт — разные меши: на бровке резкий излом, сами стенки сглажены. rings[i][k * ROWS + j] — ряд j стенки k.
  const ROWS = 5;

  function terraces(level, rim, colors, rand) {
    const W = STEP_W;
    const H = STEP_H;
    const scale = W / 1.8;
    const lean = 0.28 * W;
    const profile = [];
    for (let k = 0; k < 3; k++) {
      for (let j = 0; j < ROWS; j++) profile.push([k * W + lean * j / (ROWS - 1), (k + j / (ROWS - 1)) * H, 1]);
    }
    profile.push([3 * W + PLATEAU, 3 * H, 0], [3 * W + PLATEAU, -0.1, 0]);
    const total = rim[rim.length - 1].s;
    // Сужение к открытому фронту: стены сходят на нет к концам подковы, она открыта к камере.
    const taper = Math.max(4, (rim[0].z - rim[Math.floor(rim.length / 2)].z) * 0.6);
    const ph = rand() * 100;
    const rings = rim.map(function (p) {
      const e = Math.min(1, Math.min(p.s, total - p.s) / taper);
      const t = Math.max(0.04, e * e * (3 - 2 * e));
      // Волна стены: медленный изгиб бровки плюс неровность скалы по высоте, у общих точек одна и та же.
      const bend = 0.35 * scale * Math.sin(p.s * 0.13 + ph);
      return profile.map(function (q, n) {
        const y = q[1];
        const w = q[2] * (bend + 0.25 * scale * (0.5 * Math.sin(p.s * 0.45 + y * 1.3 + ph) + 0.3 * Math.sin(p.s * 1.25 - y * 2.9 + ph * 1.7) + 0.2 * Math.sin(p.s * 2.4 + y * 5.1)));
        const j = n % ROWS;
        const lift = q[2] && (j === ROWS - 1 || (j === 0 && n > 0)) ? 0.06 * scale * Math.sin(p.s * 0.9 + n * 2.1 + ph) : 0;
        const d = q[0] + w;
        return [p.x + p.nx * d, (y + lift) * t, p.z + p.nz * d];
      });
    });
    const c = new THREE.Color();
    const tint = new THREE.Color();
    function geometry() {
      return { pos: [], col: [], uv: [], index: [] };
    }
    // Сетка «кольца × колонки»: порядок вершин даёт нормаль внутрь карьера и вверх.
    function grid(m, cols, point, color, uvOf) {
      const base = m.pos.length / 3;
      for (let i = 0; i < rings.length; i++) {
        for (let j = 0; j < cols; j++) {
          const p = point(i, j);
          m.pos.push(p[0], p[1], p[2]);
          color(i, j);
          m.col.push(c.r, c.g, c.b);
          const q = uvOf(i, j, p);
          m.uv.push(q[0], q[1]);
          if (i > 0 && j > 0) {
            const a = base + (i - 1) * cols + j - 1;
            const b = base + i * cols + j - 1;
            m.index.push(a, b + 1, b, a, a + 1, b + 1);
          }
        }
      }
    }
    function mesh(m, material) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(m.pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(m.col, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(m.uv, 2));
      geo.setIndex(m.index);
      geo.computeVertexNormals();
      const out = new THREE.Mesh(geo, material);
      out.castShadow = true;
      out.receiveShadow = true;
      return out;
    }
    // Длина вдоль каждого ряда стенки: фактура не тянется на поворотах подковы.
    const along = profile.map(function () { return new Float32Array(rings.length); });
    for (let n = 0; n < profile.length; n++) {
      for (let i = 1; i < rings.length; i++) {
        along[n][i] = along[n][i - 1] + Math.hypot(rings[i][n][0] - rings[i - 1][n][0], rings[i][n][2] - rings[i - 1][n][2]);
      }
    }
    const near = rim.map(function (p) { return nearestMine(level, p.x, p.z); });
    const rock = geometry();
    for (let k = 0; k < 3; k++) {
      grid(rock, ROWS, function (i, j) { return rings[i][k * ROWS + j]; }, function (i, j) {
        const y = rings[i][k * ROWS + j][1];
        c.setHex(0xb3ada2).lerp(tint.setHex(0x989389), 0.5 + 0.5 * Math.sin(rim[i].s * 0.21 + k * 1.9 + ph));
        // Низ каждой стенки в тени полки и осыпи, верх у бровки светлее.
        c.multiplyScalar(0.8 + 0.2 * j / (ROWS - 1));
        // Жилы руды в стене напротив рудника: косые полосы цвета материала.
        const m = near[i];
        if (m.mine && m.distance < 11) {
          const vein = Math.max(0, Math.sin(rim[i].s * 0.8 + y * 2.1 + k) * Math.sin(rim[i].s * 0.31 - y * 0.7 + ph));
          c.lerp(tint.setHex(colors[m.mine.materialId].color), 0.6 * vein * (1 - m.distance / 11));
        }
      }, function (i, j, p) {
        return [along[k * ROWS + j][i] * 0.13 + k * 0.37, p[1] * 0.13];
      });
    }
    const soil = geometry();
    const ledge = function (i, k) { return c.setHex(LEDGE[(i * 7 + k * 3) % LEDGE.length]).multiplyScalar(0.96 + 0.06 * Math.sin(rim[i].s * 0.7 + k)); };
    const worldUv = function (i, j, p) { return [p[0] * 0.2, p[2] * 0.2]; };
    // Полки: от бровки (светлее) к подножию следующей стенки (в её тени).
    for (let k = 0; k < 2; k++) {
      grid(soil, 3, function (i, j) {
        const a = rings[i][k * ROWS + ROWS - 1];
        const b = rings[i][(k + 1) * ROWS];
        return j === 0 ? a : j === 2 ? b : [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      }, function (i, j) {
        ledge(i, k).multiplyScalar(j === 0 ? 1 : j === 1 ? 0.95 : 0.78);
      }, worldUv);
    }
    // Плато: полоса грунта у бровки переходит в выгоревшую траву, дальний край спускается к земле.
    grid(soil, 4, function (i, j) {
      const a = rings[i][3 * ROWS - 1];
      if (j === 0) return a;
      if (j === 1) return [a[0] + rim[i].nx * 1.2 * scale, a[1], a[2] + rim[i].nz * 1.2 * scale];
      return rings[i][3 * ROWS + j - 2];
    }, function (i, j) {
      if (j === 0) ledge(i, 2);
      else c.setHex(GRASS).multiplyScalar(0.97 + 0.05 * Math.sin(rim[i].s * 0.5));
    }, worldUv);
    const strata = strataMap();
    const rockMesh = mesh(rock, new THREE.MeshStandardMaterial({ vertexColors: true, map: strata.map, bumpMap: strata.bump, bumpScale: 2.2, roughness: 0.9 }));
    const soilMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, bumpMap: grainMap(), bumpScale: 1.6 });
    soilMaterial.defines = { MB_WORLD_BUMP: '' };
    const soilMesh = clouds(mesh(soil, soilMaterial));
    const group = new THREE.Group();
    group.add(rockMesh, soilMesh);
    return { mesh: group, rings: rings };
  }

  // Валун: куб с фаской, вершины сдвинуты по хешу позиции, чтобы швы граней не разошлись. rough — разброс сдвига
  // (0.3 — глыба, 0.1 — колотый блок).
  function boulderGeometry(blocks, seed, rough) {
    rough = rough || 0.3;
    const geo = blocks.geometry(1, 0.16);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      let h = Math.imul(Math.round(x * 997) ^ Math.imul(Math.round(y * 991), 31) ^ Math.imul(Math.round(z * 983), 131) ^ seed, 0x9e3779b1);
      h ^= h >>> 15;
      const k = 0.99 - rough / 2 + ((h >>> 0) % 1000) / 1000 * rough;
      pos.setXYZ(i, x * k, y * k, z * k);
    }
    geo.computeVertexNormals();
    return geo;
  }

  function place(mesh, index, dummy, x, y, z, sx, sy, sz, ry, tilt) {
    dummy.position.set(x, y, z);
    dummy.rotation.set(tilt, ry, tilt * 0.6);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  function paintGround(level, cx, cz, gx, gz, half, size, rim, b) {
    if (!groundCanvas || groundCanvas.width !== size) {
      groundCanvas = document.createElement('canvas');
      groundCanvas.width = size;
      groundCanvas.height = size;
      if (groundTexture) groundTexture.dispose();
      groundTexture = new THREE.CanvasTexture(groundCanvas);
      groundTexture.colorSpace = THREE.SRGBColorSpace;
    }
    const ctx = groundCanvas.getContext('2d');
    const k = size / (half * 2);
    const px = function (x) { return (x - gx + half) * k; };
    const pz = function (z) { return (z - gz + half) * k; };
    const rand = rng(level.index * 131 + 7);
    const f = level.footprint;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    // Сухая трава снаружи: соломенный фон, пучки и стебли (зелёные, соломенные, бурые), потом утоптанная земля
    // внутри подковы и перед стройкой поверх.
    ctx.fillStyle = GRASS_CSS;
    ctx.fillRect(0, 0, size, size);
    const blades = ['164,154,98', '120,128,74', '182,166,112', '132,112,78', '104,116,64'];
    for (let i = 0; i < size * 14; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const l = (0.12 + rand() * 0.22) * k;
      ctx.strokeStyle = 'rgba(' + blades[Math.floor(rand() * blades.length)] + ',' + (0.35 + rand() * 0.4) + ')';
      ctx.lineWidth = Math.max(1, k * 0.04);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * l, y - l);
      ctx.stroke();
    }
    for (let i = 0; i < 260; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = (0.5 + rand() * 1.6) * k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const tone = rand() < 0.5 ? '176,160,104' : '110,120,66';
      g.addColorStop(0, 'rgba(' + tone + ',0.35)');
      g.addColorStop(1, 'rgba(' + tone + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.save();
    ctx.filter = 'blur(' + Math.round(k * 2.5) + 'px)';
    ctx.fillStyle = '#98826a';
    ctx.beginPath();
    ctx.ellipse(px(cx), pz(f.maxZ + 6), (b.maxX - b.minX) * 0.5 * k, (b.maxZ - f.maxZ + 6) * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px(rim[0].x), pz(rim[0].z));
    for (let i = 1; i < rim.length; i++) ctx.lineTo(px(rim[i].x), pz(rim[i].z));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Пятна тона земли: крупные мягкие, без мелких блёсток; look4 — бурая земля как на референсе, пятна контрастнее.
    const tones = ['112,90,66', '176,154,124', '96,78,58', '160,136,106'];
    for (let i = 0; i < 520; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = (0.8 + rand() * 3.2) * k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const tone = tones[Math.floor(rand() * tones.length)];
      g.addColorStop(0, 'rgba(' + tone + ',0.3)');
      g.addColorStop(1, 'rgba(' + tone + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // real: крупные пятна — сырая тёмная земля, светлая пыль, серая щебёнка; издали земля не «одна заливка».
    const patches = [['78,60,42', 0.32, 3, 7], ['204,186,156', 0.3, 3, 8], ['136,130,120', 0.38, 1.5, 4]];
    for (let i = 0; i < 90; i++) {
      const kind = patches[i % 3];
      const x = px(b.minX - 6 + rand() * (b.maxX - b.minX + 12));
      const y = pz(b.minZ - 4 + rand() * (b.maxZ - b.minZ + 24));
      const r = (kind[2] + rand() * (kind[3] - kind[2])) * k;
      // Пятно сжато вместе с градиентом и собрано из трёх смещённых: эллипс поверх круглого градиента резал край
      // и давал тёмные овалы с жёсткой границей.
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rand() * Math.PI);
      ctx.scale(1, 0.5 + rand() * 0.5);
      for (let s = 0; s < 3; s++) {
        const ox = (rand() - 0.5) * r * 0.8;
        const oy = (rand() - 0.5) * r * 0.8;
        const rr = r * (0.55 + rand() * 0.35);
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, rr);
        g.addColorStop(0, 'rgba(' + kind[0] + ',' + kind[1] * 0.7 + ')');
        g.addColorStop(0.6, 'rgba(' + kind[0] + ',' + kind[1] * 0.4 + ')');
        g.addColorStop(1, 'rgba(' + kind[0] + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(ox - rr, oy - rr, rr * 2, rr * 2);
      }
      ctx.restore();
      // В пятне щебёнки — россыпь серых камешков с тенью.
      if (i % 3 === 2) {
        for (let j = 0; j < 60; j++) {
          const a = rand() * Math.PI * 2;
          const d = Math.sqrt(rand()) * r * 0.85;
          const sx = x + Math.cos(a) * d;
          const sy = y + Math.sin(a) * d * 0.75;
          const s = (0.05 + rand() * 0.09) * k;
          const v = 110 + Math.floor(rand() * 70);
          ctx.fillStyle = 'rgba(52,44,36,0.45)';
          ctx.fillRect(sx + s * 0.3, sy + s * 0.35, s, s * 0.8);
          ctx.fillStyle = 'rgb(' + v + ',' + (v - 4) + ',' + (v - 10) + ')';
          ctx.fillRect(sx, sy, s, s * 0.8);
        }
      }
    }
    // Утоптанная площадка вокруг стройки; тень у самых стен даёт occlusion() по уложенным блокам.
    ctx.save();
    ctx.filter = 'blur(' + Math.round(k * 1.2) + 'px)';
    ctx.fillStyle = 'rgba(204,176,134,0.35)';
    ctx.fillRect(px(f.minX - 2), pz(f.minZ - 2), (f.maxX - f.minX + 5) * k, (f.maxZ - f.minZ + 5) * k);
    ctx.restore();
    // Щебень у рудников: серо-бурое пятно и камешки.
    for (let i = 0; i < level.mines.length; i++) {
      const mine = level.mines[i];
      const mx = px(mine.x + 0.5);
      const mz = pz(mine.z + 0.5);
      const g = ctx.createRadialGradient(mx, mz, 0, mx, mz, 3.6 * k);
      g.addColorStop(0, 'rgba(128,116,100,0.55)');
      g.addColorStop(1, 'rgba(128,116,100,0)');
      ctx.fillStyle = g;
      ctx.fillRect(mx - 3.6 * k, mz - 3.6 * k, 7.2 * k, 7.2 * k);
      for (let j = 0; j < 40; j++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * 3.4 * k;
        const v = 95 + Math.floor(rand() * 60);
        ctx.fillStyle = 'rgba(' + v + ',' + (v - 6) + ',' + (v - 14) + ',0.8)';
        ctx.fillRect(mx + Math.cos(a) * r, mz + Math.sin(a) * r, (0.08 + rand() * 0.1) * k, (0.06 + rand() * 0.08) * k);
      }
      // Контактная тень под нижним рядом глыб: та же текстура лежит на подсыпке, тёмный край у подножия каждой глыбы.
      ctx.save();
      ctx.filter = 'blur(' + Math.max(1, Math.round(k * 0.18)) + 'px)';
      ctx.fillStyle = 'rgba(40,31,22,0.5)';
      for (let j = 0; j < mine.rocks.length; j++) {
        const rock = mine.rocks[j];
        if (rock.y === 0) ctx.fillRect(px(rock.x + 0.02), pz(rock.z + 0.02), 0.96 * k, 0.96 * k);
      }
      ctx.restore();
    }
    // Редкие тёмные камешки по всей площадке.
    for (let i = 0; i < size * 1.2; i++) {
      const v = 120 + Math.floor(rand() * 40);
      ctx.fillStyle = 'rgba(' + v + ',' + (v - 10) + ',' + (v - 22) + ',0.55)';
      ctx.fillRect(rand() * size, rand() * size, (0.07 + rand() * 0.08) * k, (0.05 + rand() * 0.06) * k);
    }
    groundTexture.needsUpdate = true;
    return groundTexture;
  }

  // Колея (real): поперёк — валики выдавленного грунта по краям, вдавленное дно с отпечатками грунтозацепов «ёлочкой».
  // Яркость — высота: та же канва идёт цветом (sRGB) и рельефом (bump); альфа — покрытие с мягкими краями.
  let treadTextures = null;

  function tread() {
    if (treadTextures) return treadTextures;
    const W = 64;
    const H = 64;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const rand = rng(29);
    const across = ctx.createLinearGradient(0, 0, W, 0);
    across.addColorStop(0, 'rgba(236,236,236,0)');
    across.addColorStop(0.08, 'rgba(250,250,250,0.85)');
    across.addColorStop(0.17, 'rgba(232,232,232,0.9)');
    across.addColorStop(0.24, 'rgba(178,178,178,0.9)');
    across.addColorStop(0.5, 'rgba(168,168,168,0.9)');
    across.addColorStop(0.76, 'rgba(178,178,178,0.9)');
    across.addColorStop(0.83, 'rgba(232,232,232,0.9)');
    across.addColorStop(0.92, 'rgba(250,250,250,0.85)');
    across.addColorStop(1, 'rgba(236,236,236,0)');
    ctx.fillStyle = across;
    ctx.fillRect(0, 0, W, H);
    // Отпечатки грунтозацепов: мелкие вдавленные шевроны со светлым гребнем за каждым (повтор по v бесшовный).
    // Крупные и тёмные читались как шпалы — здесь 4 на тайл и мягче по тону.
    for (let oy = -H; oy <= H; oy += H) {
      for (let j = 0; j < 4; j++) {
        const y = oy + j * H / 4 + 3;
        ctx.lineCap = 'butt';
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = 'rgba(214,214,214,0.8)';
        ctx.beginPath();
        ctx.moveTo(W * 0.24, y + 3);
        ctx.lineTo(W * 0.5, y + 9);
        ctx.lineTo(W * 0.76, y + 3);
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(118,118,118,0.85)';
        ctx.beginPath();
        ctx.moveTo(W * 0.24, y);
        ctx.lineTo(W * 0.5, y + 6);
        ctx.lineTo(W * 0.76, y);
        ctx.stroke();
      }
    }
    // Комочки и крошка на валиках.
    for (let i = 0; i < 90; i++) {
      const x = rand() < 0.5 ? rand() * W * 0.2 : W * 0.8 + rand() * W * 0.2;
      const v = rand() < 0.5 ? 120 : 255;
      ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.55)';
      ctx.fillRect(x, rand() * H, 1 + rand() * 2, 1 + rand() * 2);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const bump = new THREE.CanvasTexture(canvas);
    map.wrapT = bump.wrapT = THREE.RepeatWrapping;
    treadTextures = { map: map, bump: bump };
    return treadTextures;
  }

  // Колеи лентой поверх земли (в текстуре земли они размыты при близкой камере): въезд во двор
  // и от каждого рудника к ближайшему краю стройки — там, где ходят рабочие и техника. Один меш.
  function tracks(level, cx, b, rand, anisotropy) {
    const f = level.footprint;
    const pos = [];
    const uv = [];
    const index = [];
    // Низины колеи для луж: [x, z, касательная x, z, 0 — въезд / 1 — от рудника].
    const spots = [];
    function track(x0, z0, x1, z1, bend, kind) {
      const mx = (x0 + x1) / 2 - (z1 - z0) * bend;
      const mz = (z0 + z1) / 2 + (x1 - x0) * bend;
      const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5) || 1;
      for (let side = -1; side <= 1; side += 2) {
        let v = 0;
        let lx = 0;
        let lz = 0;
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          const s = 1 - t;
          // Точка и касательная квадратичной кривой, колесо — в 0,55 клетки сбоку от оси.
          const tx = s * (mx - x0) + t * (x1 - mx);
          const tz = s * (mz - z0) + t * (z1 - mz);
          const tl = Math.hypot(tx, tz) || 1;
          const nx = -tz / tl;
          const nz = tx / tl;
          const x = s * s * x0 + 2 * s * t * mx + t * t * x1 + nx * 0.55 * side;
          const z = s * s * z0 + 2 * s * t * mz + t * t * z1 + nz * 0.55 * side;
          if (i > 0) v += Math.hypot(x - lx, z - lz) / 0.5;
          if (i > 0 && i < n && i % 3 === 1) spots.push([x, z, tx / tl, tz / tl, kind]);
          lx = x;
          lz = z;
          const at = pos.length / 3;
          pos.push(x - nx * 0.22, 0.012, z - nz * 0.22, x + nx * 0.22, 0.012, z + nz * 0.22);
          uv.push(0, v, 1, v);
          if (i > 0) index.push(at - 2, at - 1, at, at - 1, at + 1, at);
        }
      }
    }
    const yardZ = f.maxZ + 4;
    track(cx - 2, b.maxZ + 30, cx - 1, yardZ, 0.12, 0);
    track(cx + 6, b.maxZ + 30, cx + 3, yardZ + 1, -0.1, 0);
    for (let i = 0; i < level.mines.length; i++) {
      const mine = level.mines[i];
      const sx = mine.standX + 0.5;
      const sz = mine.standZ + 0.5;
      track(sx, sz, Math.max(f.minX - 1, Math.min(f.maxX + 2, sx)), Math.max(f.minZ - 1, Math.min(f.maxZ + 2, sz)), (rand() - 0.5) * 0.16, 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map(function (_, i) { return i % 3 === 1 ? 1 : 0; }), 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(index);
    const t = tread();
    t.map.anisotropy = t.bump.anisotropy = anisotropy || 1;
    const material = new THREE.MeshStandardMaterial({
      color: 0xa58d70,
      map: t.map,
      bumpMap: t.bump,
      bumpScale: 2,
      roughness: 1,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    material.defines = { MB_GROUND_AO: '' };
    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    mesh.userData.spots = spots;
    return mesh;
  }

  // options: { materials: MB.MATERIAL, blocks: MicroBuildersBlocks, mobile, anisotropy }
  function build(level, cx, cz, options) {
    const group = new THREE.Group();
    const rand = rng(level.index * 7919 + 17);
    const dummy = new THREE.Object3D();
    // Подкова по рамке всего, куда ходят рабочие и техника (здание, камни, места добычи, точки появления),
    // плюс 2 клетки: пути по сетке без обходов не выходят за рамку своих концов.
    const f = level.footprint;
    let minX = f.minX;
    let maxX = f.maxX;
    let minZ = f.minZ;
    let maxZ = f.maxZ;
    const cells = level.rocks.concat(level.mines.map(function (m) { return { x: m.standX, z: m.standZ }; }));
    for (let i = 0; i < level.spawnPoints.length; i++) cells.push({ x: level.spawnPoints[i][0], z: level.spawnPoints[i][2] });
    // Хозяйство стройки (городок, мачты света, площадки дронов и вертолётов, двор сборки — game.js quarryCells).
    const extra = options.cells || [];
    for (let i = 0; i < extra.length; i++) cells.push(extra[i]);
    for (let i = 0; i < cells.length; i++) {
      minX = Math.min(minX, cells[i].x);
      maxX = Math.max(maxX, cells[i].x);
      minZ = Math.min(minZ, cells[i].z);
      maxZ = Math.max(maxZ, cells[i].z);
    }
    const b = { minX: minX - 2, maxX: maxX + 2, minZ: minZ - 2, maxZ: maxZ + 1 };
    // Снег, мокрая земля и жара игры (game.js weatherSurface) — поверх своего шейдера материала.
    const surface = options.surface || function () {};
    const x0 = b.minX - 0.2;
    const x1 = b.maxX + 1.2;
    const z0 = b.minZ - 0.2;
    const z1 = b.maxZ + 1;
    const scale = Math.min(2.2, Math.max(1, Math.max(x1 - x0, z1 - z0) / 34));
    STEP_H = 1.15 * scale;
    STEP_W = 1.8 * scale;
    const radius = Math.min(7 * scale, (x1 - x0) / 4, (z1 - z0) / 4);
    const rim = contour(x0, x1, z0, z1, radius);
    const gx = (x0 + x1) / 2;
    const gz = (z0 + z1) / 2;
    const half = Math.max(x1 - x0, z1 - z0) / 2 + 3 * STEP_W + 30;

    const texture = paintGround(level, cx, cz, gx, gz, half, options.mobile ? 1024 : 2048, rim, b);
    texture.anisotropy = options.anisotropy || 1;
    const groundMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, bumpMap: grainMap(), bumpScale: 1.6 });
    groundMaterial.defines = { MB_GROUND_AO: '', MB_WORLD_BUMP: '' };
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, half * 2), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(gx, 0, gz);
    ground.receiveShadow = true;
    group.add(clouds(ground));
    const ruts = tracks(level, cx, b, rng(level.index * 31 + 3), options.anisotropy);
    group.add(clouds(ruts));
    surface(ruts.material, 'ground');
    const env = options.blocks.env();
    const pools = puddles(level, b, ruts.userData.spots, rng(level.index * 53 + 9), env, options.wet);
    if (pools) group.add(pools);

    const wall = terraces(level, rim, options.materials, rand);
    group.add(wall.mesh);
    surface(wall.mesh.children[0].material, 'rock');
    surface(wall.mesh.children[1].material, 'soil');

    // Руда: груда сырых глыб на подсыпке, по мешу на рудник. Глыбы стоят на клетках камней рудника без пересечений:
    // поворот кратен 90°, низ — на холме или на верхе нижней глыбы. Цвет и прожилки — oreMaps.
    const mound = mounds(level);
    group.add(clouds(moundMesh(mound, groundMaterial, gx, gz, half)));
    // Погода — после всех clouds() на общем материале земли: clouds() заново ставит свой onBeforeCompile.
    surface(groundMaterial, 'ground');
    const gems = [];
    // Контактные тени: [x, y, z, ширина, глубина, поворот].
    const blobs = [];
    // Щебень: [x, z, размер, цвет?, сплющенность?].
    const rubble = [];
    for (let i = 0; i < level.mines.length; i++) {
      const mine = level.mines[i];
      const tone = options.materials[mine.materialId].color;
      const maps = oreMaps(mine.materialId, tone);
      maps.map.anisotropy = maps.bump.anisotropy = maps.orm.anisotropy = options.anisotropy || 1;
      const material = new THREE.MeshStandardMaterial({ map: maps.map, bumpMap: maps.bump, bumpScale: 1.4, roughnessMap: maps.orm, metalnessMap: maps.orm, roughness: 1, metalness: 1, envMap: env });
      material.onBeforeCompile = oreShader;
      surface(material, 'ore');
      const mesh = new THREE.InstancedMesh(rockGeometry(level.index * 17 + i * 31 + 3, true), material, mine.rocks.length);
      const rocks = mine.rocks.slice().sort(function (p, q) { return p.y - q.y; });
      const tops = {};
      let topY = -1;
      let top = null;
      for (let r = 0; r < rocks.length; r++) {
        const rock = rocks[r];
        const key = rock.x + ',' + rock.z;
        const low = tops[key] === undefined;
        const x = rock.x + 0.5 + (rand() - 0.5) * 0.06;
        const z = rock.z + 0.5 + (rand() - 0.5) * 0.06;
        const y = low ? mound.at(x, z) - 0.05 : tops[key] - 0.04;
        const s = low ? 0.78 + rand() * 0.08 : 0.74 + rand() * 0.1;
        const sy = low ? 0.72 + rand() * 0.18 : 0.62 + rand() * 0.18;
        place(mesh, r, dummy, x, y + sy * 0.5, z, s * (0.96 + rand() * 0.06), sy, s * (0.96 + rand() * 0.06), Math.floor(rand() * 4) * Math.PI / 2 + (rand() - 0.5) * 0.12, low ? 0 : (rand() - 0.5) * 0.08);
        // Нижняя глыба вдавлена в подсыпку: тёмное пятно контакта по её следу.
        if (low) blobs.push([x, y + 0.05, z, s * 1.3, s * 1.3, 0]);
        tops[key] = y + sy;
        if (tops[key] > topY) {
          topY = tops[key];
          top = [x, z];
        }
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      group.add(mesh);
      // Бирюзовые самоцветы торчат из верхней глыбы.
      gems.push([top[0] + (rand() - 0.5) * 0.3, topY + 0.04, top[1] + (rand() - 0.5) * 0.3, 1.1]);
      if (rand() < 0.6) gems.push([top[0] + (rand() - 0.5) * 0.5, topY - 0.01, top[1] + (rand() - 0.5) * 0.5, 0.75]);
      // Щебень и осколки у подножия: три крупных куска и мелочь, часть — в цвет руды.
      const cells = mound.piles[i].cells;
      for (let r = 0, guard = 0; r < 16 && guard < 120; guard++) {
        const c = cells[Math.floor(rand() * cells.length)];
        const a = rand() * Math.PI * 2;
        const d = 0.5 + rand() * 0.6;
        const x = c.x + 0.5 + Math.cos(a) * d;
        const z = c.z + 0.5 + Math.sin(a) * d;
        const gap = mound.dist(x, z);
        if (gap < 0.02 || gap > 0.55) continue;
        const big = r < 3;
        const color = rand() < 0.4 ? mixHex(PEBBLE[Math.floor(rand() * PEBBLE.length)], tone, 0.45) : undefined;
        rubble.push([x, z, big ? 0.1 + rand() * 0.06 : 0.035 + rand() * 0.045, color, big ? 0.55 : 0.45 + rand() * 0.25]);
        r++;
      }
    }

    // Валуны на полках и у верхней кромки; рядом с рудником — с прожилками его цвета.
    const boulders = [];
    const tint = new THREE.Color();
    for (let i = 0; i < rim.length; i += 2) {
      const ring = wall.rings[i];
      const p = rim[i];
      const height = ring[ROWS - 1][1] / STEP_H;
      if (height < 0.35) continue;
      // look4: штабели колотых блоков по полкам, как на референсе, — плотно, местами в два яруса.
      for (let k = 0; k < 3; k++) {
        if (rand() > 0.62) continue;
        const size = (k === 2 ? 0.85 + rand() * 0.9 : 0.6 + rand() * 0.45) * scale;
        // Полка — от бровки стенки k до подножия стенки k + 1 (у верхней — 2,5 клетки плато).
        const a = ring[k * ROWS + ROWS - 1];
        const e = k < 2 ? ring[(k + 1) * ROWS] : null;
        let ux = p.nx;
        let uz = p.nz;
        let len = 2.5 * scale;
        if (e) {
          len = Math.hypot(e[0] - a[0], e[2] - a[2]) || 0.01;
          ux = (e[0] - a[0]) / len;
          uz = (e[2] - a[2]) / len;
        }
        const d = 0.15 + size * 0.5 + rand() * Math.max(0.05, len - 0.3 - size);
        const y = e ? a[1] + (e[1] - a[1]) * Math.min(1, d / len) : a[1];
        const sy = size * (0.72 + rand() * 0.22);
        const side = rand() - 0.5;
        const x = a[0] + ux * d + p.nz * side;
        const z = a[2] + uz * d - p.nx * side;
        boulders.push({ x: x, y: y + sy * 0.46, z: z, size: size, sy: sy, at: p });
        blobs.push([x, y, z, size * 1.5, size * 1.25, Math.atan2(p.nx, p.nz)]);
        if (rand() < 0.3) {
          const s2 = size * (0.6 + rand() * 0.25);
          boulders.push({ x: x + ux * 0.15, y: y + sy * 0.92 + s2 * 0.4, z: z + uz * 0.15, size: s2, sy: s2 * 0.85, at: p });
        }
      }
      // Осыпь у подножия стены — немного крупного щебня, без россыпи мелочи.
      if (rand() < 0.3) {
        const d = 0.15 + rand() * 0.9;
        rubble.push([ring[0][0] - p.nx * d, ring[0][2] - p.nz * d, 0.18 + rand() * 0.22]);
      }
      if (i % 18 === 8 && rand() < 0.5) {
        const a = ring[(rand() < 0.5 ? 0 : 1) * ROWS + ROWS - 1];
        gems.push([a[0] + p.nx * 0.45, a[1] + 0.1, a[2] + p.nz * 0.45, 0.9]);
      }
    }
    if (boulders.length) {
      const map = stoneMap();
      const material = new THREE.MeshStandardMaterial({ map: map, bumpMap: map, bumpScale: 1.2, roughness: 0.9 });
      // Сдвиг узора по позиции блока: соседние камни не повторяют один и тот же рисунок.
      material.onBeforeCompile = function (shader) {
        shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvec2 mbOff = fract( instanceMatrix[3].xz * vec2( 0.37, 0.53 ) );\nvMapUv += mbOff;\nvBumpMapUv += mbOff;');
      };
      surface(material, 'stone');
      // Три формы колотых глыб вперемешку: соседние камни не повторяют один силуэт.
      const shapes = [0, 1, 2].map(function (v) {
        const list = boulders.filter(function (_, i) { return i % 3 === v; });
        return list.length ? new THREE.InstancedMesh(rockGeometry(level.index * 13 + v * 71 + 5), material, list.length) : null;
      });
      const used = [0, 0, 0];
      for (let i = 0; i < boulders.length; i++) {
        const item = boulders[i];
        const s = item.size;
        const mesh = shapes[i % 3];
        const at = used[i % 3]++;
        // Блок развёрнут вдоль стены, с небольшим разбросом — штабель, а не россыпь.
        place(mesh, at, dummy, item.x, item.y, item.z, s, item.sy, s * (0.85 + rand() * 0.3), Math.atan2(item.at.nx, item.at.nz) + (rand() - 0.5) * 0.6, (rand() - 0.5) * 0.12);
        tint.setHex(CUT[Math.floor(rand() * CUT.length)]);
        const near = nearestMine(level, item.at.x, item.at.z);
        if (near.mine && near.distance < 10 && rand() < 0.4) tint.lerp(new THREE.Color(options.materials[near.mine.materialId].color), 0.35);
        mesh.setColorAt(at, tint);
      }
      for (let v = 0; v < 3; v++) {
        if (!shapes[v]) continue;
        shapes[v].castShadow = true;
        shapes[v].receiveShadow = true;
        group.add(shapes[v]);
      }
    }
    // Щебень россыпью по площадке: кучками у рудников и редко по двору, не ближе 2 клеток к зданию.
    const pebbles = level.mines.length * 7 + 24;
    for (let i = 0, guard = 0; i < pebbles && guard < pebbles * 6; guard++) {
      const mine = level.mines[guard % level.mines.length];
      const nearMine = i < level.mines.length * 7;
      const a = rand() * Math.PI * 2;
      const r = 1.2 + rand() * 3;
      const x = nearMine ? mine.standX + 0.5 + Math.cos(a) * r : b.minX + rand() * (b.maxX - b.minX + 1);
      const z = nearMine ? mine.standZ + 0.5 + Math.sin(a) * r : b.minZ + rand() * (b.maxZ - b.minZ + 1);
      if (x > f.minX - 2 && x < f.maxX + 3 && z > f.minZ - 2 && z < f.maxZ + 3) continue;
      rubble.push([x, z, 0.05 + rand() * 0.09]);
      i++;
    }
    // look4: россыпь мелких камешков по всему двору, до самых стен стройки, — земля вблизи живая, как на референсе.
    const yard = Math.min(1400, Math.round((b.maxX - b.minX + 1) * (b.maxZ - b.minZ + 1) * 0.55));
    for (let i = 0; i < yard; i++) {
      const x = b.minX + rand() * (b.maxX - b.minX + 1);
      const z = b.minZ + rand() * (b.maxZ - b.minZ + 1);
      if (x > f.minX - 0.15 && x < f.maxX + 1.15 && z > f.minZ - 0.15 && z < f.maxZ + 1.15) continue;
      rubble.push([x, z, rand() < 0.08 ? 0.1 + rand() * 0.12 : 0.025 + rand() * 0.06]);
    }
    if (rubble.length) {
      const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), rubble.length);
      surface(mesh.material, 'stone');
      for (let i = 0; i < rubble.length; i++) {
        const r = rubble[i];
        // Осколки у груды лежат на склоне подсыпки, а не под ней.
        const y = Math.max(0, mound.at(r[0], r[1]));
        const flat = r[4] || 0.7;
        place(mesh, i, dummy, r[0], y + r[2] * flat * 0.55, r[1], r[2], r[2] * flat, r[2], rand() * 6, 0);
        if (r[2] > 0.1) blobs.push([r[0], y, r[1], r[2] * 2.6, r[2] * 2.6, 0]);
        mesh.setColorAt(i, tint.setHex(r[3] !== undefined ? r[3] : PEBBLE[Math.floor(rand() * PEBBLE.length)]).multiplyScalar(0.85 + rand() * 0.2));
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    if (gems.length) {
      const mesh = new THREE.InstancedMesh(
        new THREE.OctahedronGeometry(0.17, 0),
        new THREE.MeshStandardMaterial({ color: 0x3cc9b8, roughness: 0.28, metalness: 0.05, flatShading: true }),
        gems.length * 2
      );
      MicroBuildersPost.mark(mesh.material); // самоцветы в груде мягко светятся (art/post.js)
      for (let i = 0; i < gems.length; i++) {
        const g = gems[i];
        const s = g[3];
        place(mesh, i * 2, dummy, g[0], g[1], g[2], s, s * 2, s, rand() * 3, 0.35);
        place(mesh, i * 2 + 1, dummy, g[0] + 0.14, g[1] - 0.08, g[2] - 0.1, s * 0.7, s * 1.5, s * 0.7, rand() * 3, -0.5);
      }
      mesh.castShadow = true;
      group.add(mesh);
    }
    if (blobs.length) {
      const one = blob();
      const mesh = new THREE.InstancedMesh(one.geometry, one.material, blobs.length);
      for (let i = 0; i < blobs.length; i++) {
        const q = blobs[i];
        place(mesh, i, dummy, q[0], q[1] + 0.015, q[2], q[3], 1, q[4], q[5], 0);
      }
      mesh.renderOrder = 1;
      group.add(mesh);
    }
    // Жизнь карьера (вихри, следы, камешки) живёт в группе уровня: disposeLevel уберёт её вместе с карьером.
    if (window.MicroBuildersAmbient) group.add(MicroBuildersAmbient.build(level, b, wall.rings, ROWS));
    return group;
  }

  window.MicroBuildersQuarry = { build: build, clouds: clouds, occlusion: occlusion, blob: blob, keep: keep };
})();
