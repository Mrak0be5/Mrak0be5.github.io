// Вид блоков: куб с фаской и по 3 варианта фактуры на каждый материал (balance.json → materials.ladder, вид look).
// Всё рисуется кодом на canvas: цвет, рельеф для bumpMap и карта ORM (R — глубина самоцвета, G — шероховатость,
// B — металл). Шейдер добавляет затенение в стыках, пыль, потёки, сколы и волну блеска финала.
(function () {
  const S = 256;
  const VARIANTS = 3;
  const cache = new Map();

  function rng(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function layers(seed) {
    const make = function () {
      const canvas = document.createElement('canvas');
      canvas.width = S;
      canvas.height = S;
      return canvas.getContext('2d');
    };
    return { c: make(), h: make(), o: make(), r: rng(seed) };
  }

  function gray(v) {
    return 'rgb(' + v + ',' + v + ',' + v + ')';
  }

  function orm(rough, metal) {
    return 'rgb(0,' + Math.round(rough * 255) + ',' + Math.round(metal * 255) + ')';
  }

  function ormRgb(rough, metal) {
    return '0,' + Math.round(rough * 255) + ',' + Math.round(metal * 255);
  }

  function fillAll(L, color, height, ormStyle) {
    L.c.fillStyle = color;
    L.c.fillRect(0, 0, S, S);
    L.h.fillStyle = gray(height);
    L.h.fillRect(0, 0, S, S);
    L.o.fillStyle = ormStyle;
    L.o.fillRect(0, 0, S, S);
  }

  // Одна фигура во все три слоя; высоту размываем, иначе рельеф идёт лесенкой.
  function paint(L, path, color, height, ormStyle, rule) {
    if (color) {
      L.c.fillStyle = color;
      L.c.fill(path, rule || 'nonzero');
    }
    if (height) {
      L.h.save();
      L.h.filter = 'blur(1.5px)';
      L.h.fillStyle = height;
      L.h.fill(path, rule || 'nonzero');
      L.h.restore();
    }
    if (ormStyle) {
      L.o.fillStyle = ormStyle;
      L.o.fill(path, rule || 'nonzero');
    }
  }

  function blot(ctx, x, y, radius, rgb, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Комковатое пятно из пересекающихся кругов: патина, ржавчина, налёт.
  function lump(r, x, y, size, parts) {
    const path = new Path2D();
    for (let i = 0; i < parts; i++) {
      const a = r() * Math.PI * 2;
      const d = r() * size;
      const px = x + Math.cos(a) * d;
      const py = y + Math.sin(a) * d;
      const pr = size * (0.25 + r() * 0.35);
      path.moveTo(px + pr, py);
      path.arc(px, py, pr, 0, Math.PI * 2);
    }
    return path;
  }

  function grain(L, count, alpha) {
    for (let i = 0; i < count; i++) {
      const rgb = L.r() < 0.5 ? '255,255,255' : '0,0,0';
      L.c.fillStyle = 'rgba(' + rgb + ',' + (alpha * L.r()).toFixed(3) + ')';
      L.c.fillRect(L.r() * S, L.r() * S, 1 + L.r() * 1.5, 1 + L.r() * 1.5);
    }
  }

  function groove(L, path, width, depth) {
    L.h.save();
    L.h.filter = 'blur(1px)';
    L.h.strokeStyle = gray(128 - depth);
    L.h.lineWidth = width;
    L.h.stroke(path);
    L.h.restore();
    L.c.strokeStyle = 'rgba(25,25,30,0.4)';
    L.c.lineWidth = width * 0.7;
    L.c.stroke(path);
  }

  function line(x0, y0, x1, y1) {
    const path = new Path2D();
    path.moveTo(x0, y0);
    path.lineTo(x1, y1);
    return path;
  }

  // Металл стёрт до блеска на рёбрах: светлая рамка по фаске.
  function edgeWear(L, rgb, alpha, rough) {
    L.c.save();
    L.c.filter = 'blur(3px)';
    L.c.strokeStyle = 'rgba(' + rgb + ',' + alpha + ')';
    L.c.lineWidth = 12;
    L.c.strokeRect(6, 6, S - 12, S - 12);
    L.c.restore();
    L.o.strokeStyle = orm(rough, 1);
    L.o.lineWidth = 10;
    L.o.strokeRect(5, 5, S - 10, S - 10);
  }


  // ---------- тона от цвета материала ----------
  function rgbOf(hex) {
    return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
  }

  // k < 1 — темнее, k > 1 — светлее к белому: у тёмных материалов светлые тона не уходят в серое.
  function sh(hex, k) {
    const c = rgbOf(hex);
    for (let i = 0; i < 3; i++) c[i] = Math.round(k <= 1 ? c[i] * k : c[i] + (255 - c[i]) * Math.min(1, k - 1));
    return (c[0] << 16) | (c[1] << 8) | c[2];
  }

  function css(hex, alpha) {
    const c = rgbOf(hex);
    return alpha === undefined ? 'rgb(' + c.join(',') + ')' : 'rgba(' + c.join(',') + ',' + alpha + ')';
  }

  // 'r,g,b' для blot().
  function trip(hex) {
    return rgbOf(hex).join(',');
  }

  function mix(a, b, t) {
    const p = rgbOf(a);
    const q = rgbOf(b);
    return (Math.round(p[0] + (q[0] - p[0]) * t) << 16) | (Math.round(p[1] + (q[1] - p[1]) * t) << 8) | Math.round(p[2] + (q[2] - p[2]) * t);
  }

  function lum(hex) {
    const c = rgbOf(hex);
    return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
  }

  // Светлая потёртость по фаске у неметаллов: только цвет, шероховатость и металл не трогает.
  function edgeLight(L, rgb, alpha) {
    L.c.save();
    L.c.filter = 'blur(3px)';
    L.c.strokeStyle = 'rgba(' + rgb + ',' + alpha + ')';
    L.c.lineWidth = 10;
    L.c.strokeRect(5, 5, S - 10, S - 10);
    L.c.restore();
  }

  function rectPath(x, y, w, h) {
    const path = new Path2D();
    path.rect(x, y, w, h);
    return path;
  }

  // Ломаная трещина: случайное блуждание от точки.
  function crackPath(r, x, y, len, angle) {
    const path = new Path2D();
    path.moveTo(x, y);
    let a = angle;
    for (let i = 0; i < 10; i++) {
      a += (r() - 0.5) * 0.9;
      x += Math.cos(a) * len / 10;
      y += Math.sin(a) * len / 10;
      path.lineTo(x, y);
    }
    return path;
  }

  function crack(L, x, y, len, angle, color) {
    const path = crackPath(L.r, x, y, len, angle);
    L.c.strokeStyle = color;
    L.c.lineWidth = 1.2;
    L.c.stroke(path);
    L.h.save();
    L.h.filter = 'blur(0.8px)';
    L.h.strokeStyle = gray(70);
    L.h.lineWidth = 2;
    L.h.stroke(path);
    L.h.restore();
  }

  // Плавная прожилка (мрамор, кальцит, смола): размытая линия по мягкому блужданию.
  function vein(L, x, y, len, angle, width, color, blur) {
    const path = new Path2D();
    path.moveTo(x, y);
    let a = angle;
    const steps = 24;
    for (let i = 0; i < steps; i++) {
      a += (L.r() - 0.5) * 0.5;
      x += Math.cos(a) * len / steps;
      y += Math.sin(a) * len / steps;
      path.lineTo(x, y);
    }
    L.c.save();
    L.c.filter = 'blur(' + blur + 'px)';
    L.c.strokeStyle = color;
    L.c.lineWidth = width;
    L.c.lineJoin = 'round';
    L.c.lineCap = 'round';
    L.c.stroke(path);
    L.c.restore();
    return path;
  }

  // Искры-крестики: блеск самоцветов и звёзд.
  function sparkles(L, count, color) {
    for (let i = 0; i < count; i++) {
      const x = L.r() * S;
      const y = L.r() * S;
      const s = 2 + L.r() * 4;
      L.c.fillStyle = color;
      L.c.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
      L.c.globalAlpha = 0.45;
      L.c.fillRect(x - s, y - 0.4, s * 2, 0.8);
      L.c.fillRect(x - 0.4, y - s, 0.8, s * 2);
      L.c.globalAlpha = 1;
    }
  }

  // Лучи из точки (звёздчатый сапфир, ядро звезды).
  function rays(L, cx, cy, n, len, width, color, blur) {
    L.c.save();
    L.c.filter = 'blur(' + blur + 'px)';
    L.c.strokeStyle = color;
    L.c.lineWidth = width;
    L.c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.2;
      L.c.beginPath();
      L.c.moveTo(cx - Math.cos(a) * len, cy - Math.sin(a) * len);
      L.c.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      L.c.stroke();
    }
    L.c.restore();
  }

  // Ячейки Вороного: для каждого пикселя ближайшее зерно и зазор до второго; pixel() красит три слоя.
  function voronoi(L, seeds, pixel) {
    const color = L.c.createImageData(S, S);
    const height = L.h.createImageData(S, S);
    const surface = L.o.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        let d1 = Infinity;
        let d2 = Infinity;
        let best = 0;
        for (let i = 0; i < seeds.length; i++) {
          const dx = x - seeds[i].x;
          const dy = y - seeds[i].y;
          const d = dx * dx + dy * dy;
          if (d < d1) {
            d2 = d1;
            d1 = d;
            best = i;
          } else if (d < d2) {
            d2 = d;
          }
        }
        const p = (y * S + x) * 4;
        pixel(seeds[best], Math.sqrt(d1), Math.sqrt(d2), x, y, p, color.data, height.data, surface.data);
        color.data[p + 3] = height.data[p + 3] = surface.data[p + 3] = 255;
      }
    }
    L.c.putImageData(color, 0, 0);
    L.h.putImageData(height, 0, 0);
    L.o.putImageData(surface, 0, 0);
  }

  function rivet(L, x, y, radius, hex) {
    L.c.save();
    L.c.shadowColor = 'rgba(0,0,0,0.5)';
    L.c.shadowBlur = 3;
    L.c.shadowOffsetX = 1.5;
    L.c.shadowOffsetY = 2;
    const g = L.c.createRadialGradient(x - radius * 0.35, y - radius * 0.35, 0, x, y, radius);
    g.addColorStop(0, css(sh(hex, 1.5)));
    g.addColorStop(0.5, css(sh(hex, 1.02)));
    g.addColorStop(1, css(sh(hex, 0.55)));
    L.c.fillStyle = g;
    L.c.beginPath();
    L.c.arc(x, y, radius, 0, Math.PI * 2);
    L.c.fill();
    L.c.restore();
    blot(L.h, x, y, radius * 1.25, '255,255,255', 0.9);
    L.o.fillStyle = orm(0.35, 1);
    L.o.beginPath();
    L.o.arc(x, y, radius, 0, Math.PI * 2);
    L.o.fill();
  }

  function wobblyCircle(cx, cy, radius, p1, p2, a1, a2) {
    const path = new Path2D();
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const m = radius * (1 + a1 * Math.sin(a * 3 + p1) + a2 * Math.sin(a * 7 + p2));
      if (i === 0) path.moveTo(cx + Math.cos(a) * m, cy + Math.sin(a) * m);
      else path.lineTo(cx + Math.cos(a) * m, cy + Math.sin(a) * m);
    }
    return path;
  }

  // Малахит: вложенные волнистые кольца, широкие тёмные полосы чередуются с тонкими светлыми.
  function rings(L, cx, cy, tones, ink) {
    const r = L.r;
    const p1 = r() * 6.3;
    const p2 = r() * 6.3;
    let radius = Math.hypot(Math.max(cx, S - cx), Math.max(cy, S - cy)) * 1.15 + 20;
    for (let k = 0; radius > 3; k++) {
      const light = k % 2 === 1;
      const path = wobblyCircle(cx, cy, radius, p1, p2, 0.07, 0.04);
      L.c.fillStyle = light ? tones[3 + Math.floor(r() * 3)] : tones[Math.floor(r() * 3)];
      L.c.fill(path);
      L.c.strokeStyle = ink;
      L.c.lineWidth = 1;
      L.c.stroke(path);
      radius -= light ? 2 + r() * 3 : 5 + r() * 9;
    }
  }

  function ingot(L, x, y, w, h, hex) {
    const bar = new Path2D();
    bar.roundRect(x, y, w, h, 9);
    const g = L.c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, css(sh(hex, 1.6)));
    g.addColorStop(0.22, css(sh(hex, 1.08)));
    g.addColorStop(0.75, css(sh(hex, 0.88)));
    g.addColorStop(1, css(sh(hex, 0.66)));
    L.c.save();
    L.c.shadowColor = css(sh(hex, 0.25), 0.6);
    L.c.shadowBlur = 5;
    L.c.shadowOffsetY = 2;
    L.c.fillStyle = g;
    L.c.fill(bar);
    L.c.restore();
    L.h.save();
    L.h.filter = 'blur(3px)';
    L.h.fillStyle = gray(200);
    L.h.fill(bar);
    L.h.restore();
    L.o.fillStyle = orm(0.16, 1);
    L.o.fill(bar);
    // Клеймо: утопленная рамка с «надписью» из штрихов.
    const sw = Math.min(w * 0.42, 74);
    const sh2 = Math.min(h * 0.38, 30);
    const sx = x + (w - sw) / 2;
    const sy = y + (h - sh2) / 2;
    const stamp = new Path2D();
    stamp.roundRect(sx, sy, sw, sh2, 4);
    L.c.fillStyle = css(sh(hex, 0.78), 0.35);
    L.c.fill(stamp);
    L.c.strokeStyle = css(sh(hex, 0.58), 0.85);
    L.c.lineWidth = 2;
    L.c.stroke(stamp);
    L.h.strokeStyle = gray(150);
    L.h.lineWidth = 2.5;
    L.h.stroke(stamp);
    L.c.fillStyle = css(sh(hex, 0.58), 0.75);
    const cell = (sw - 12) / 3;
    for (let i = 0; i < 3; i++) {
      L.c.fillRect(sx + 6 + i * cell, sy + sh2 * 0.3, cell - 5, 2.5);
      if (i !== 1) L.c.fillRect(sx + 6 + i * cell, sy + sh2 * 0.62, cell - 9, 2);
    }
    L.c.strokeStyle = css(sh(hex, 1.7), 0.8);
    L.c.lineWidth = 2;
    L.c.stroke(line(x + 9, y + 3, x + w - 9, y + 3));
  }

  // ---------- металлы (вид metal и platinum): семь манер, тон — от цвета материала ----------
  // Олово, сталь, мифрил: шлифовка штрихами; бронза, латунь: литьё с рельефом и патиной; медь: чеканка;
  // серебро, платина: полировка с гравировкой; железо, титан: клёпаная плита с потёками; золото: слитки; осмий: свинцовый лист.
  const METAL_STYLE = {
    'ladder-bronze': 'bronze', 'ladder-brass': 'bronze', 'ladder-orichalcum': 'bronze',
    'ladder-copper': 'copper',
    'ladder-iron': 'iron', 'ladder-steel-hard': 'iron', 'ladder-meteor-iron': 'iron', 'ladder-titanium': 'iron',
    'ladder-steel': 'tin', 'ladder-steel-stainless': 'tin', 'ladder-mithril': 'tin', 'ladder-iridium': 'tin',
    'ladder-starsteel': 'tin', 'ladder-adamantium': 'tin',
    'ladder-steel-mirror': 'silver', 'ladder-silver': 'silver', 'ladder-silver-pure': 'silver',
    'ladder-gold': 'gold', 'ladder-sun-gold': 'gold',
    'ladder-osmium': 'lead',
  };
  // Железо не у всех ржавеет: титан, калёная сталь — без потёков.
  const NO_RUST = { 'ladder-titanium': true, 'ladder-steel-hard': true };
  const STAMPS = { 'ladder-osmium': 'Os' };

  function metalStyle(spec) {
    if (spec.look === 'platinum') return spec.id === 'ladder-platinum-black' ? 'lead' : 'silver';
    if (METAL_STYLE[spec.id]) return METAL_STYLE[spec.id];
    const c = rgbOf(spec.color);
    if (c[0] > c[2] + 60 && lum(spec.color) > 0.55) return 'gold';
    if (c[0] > c[2] + 50) return 'bronze';
    return lum(spec.color) < 0.45 ? 'iron' : 'tin';
  }

  const METAL = {
    // Шлифовка штрихами; 0 — кольцевая проточка с бобышкой, 1 — две проточки, 2 — мелкие вмятины.
    tin: function (L, v, bare, spec) {
      const c = spec.color;
      fillAll(L, css(sh(c, 0.94)), 128, orm(0.42, 0.9));
      for (let i = 0; i < 9; i++) {
        blot(L.c, L.r() * S, L.r() * S, 30 + L.r() * 50, trip(sh(c, L.r() < 0.5 ? 0.82 : 1.14)), 0.35);
      }
      const dark = trip(sh(c, 0.45));
      for (let i = 0; i < 520; i++) {
        const y = L.r() * S;
        const x = L.r() * S - 40;
        const len = 30 + L.r() * 140;
        L.c.strokeStyle = L.r() < 0.5
          ? 'rgba(255,255,255,' + (0.05 + L.r() * 0.1).toFixed(3) + ')'
          : 'rgba(' + dark + ',' + (0.04 + L.r() * 0.08).toFixed(3) + ')';
        L.c.lineWidth = 0.6 + L.r();
        L.c.stroke(line(x, y, x + len, y + (L.r() - 0.5) * 2));
        if (i % 4 === 0) {
          L.o.strokeStyle = orm(0.26 + L.r() * 0.3, 0.9);
          L.o.lineWidth = 1;
          L.o.stroke(line(x, y, x + len, y));
        }
      }
      if (!bare && v === 0) {
        const ring = new Path2D();
        ring.arc(S / 2, S / 2, 34, 0, Math.PI * 2);
        groove(L, ring, 5, 60);
        const boss = new Path2D();
        boss.arc(S / 2, S / 2, 12, 0, Math.PI * 2);
        paint(L, boss, css(sh(c, 1.3), 0.8), gray(170), orm(0.25, 0.95));
      } else if (!bare && v === 1) {
        groove(L, line(0, S * 0.36, S, S * 0.36), 5, 60);
        groove(L, line(0, S * 0.64, S, S * 0.64), 5, 60);
      } else {
        for (let i = 0; i < 6; i++) blot(L.h, L.r() * S, L.r() * S, 12 + L.r() * 18, '70,70,70', 0.7);
      }
      edgeWear(L, trip(sh(c, 1.5)), 0.35, 0.25);
    },

    // Медь: чеканка мелкими вмятинами. Патина — в шейдере по стыкам и рёбрам (MB_PATINA).
    copper: function (L, v, bare, spec) {
      const c = spec.color;
      const g = L.c.createLinearGradient(0, 0, S, S);
      g.addColorStop(0, css(sh(c, 1.12)));
      g.addColorStop(1, css(sh(c, 0.86)));
      fillAll(L, g, 128, orm(0.3, 1));
      for (let i = 0; i < 110; i++) {
        const x = L.r() * S;
        const y = L.r() * S;
        const radius = 6 + L.r() * 10;
        blot(L.h, x, y, radius, '70,70,70', 0.55);
        blot(L.c, x - radius * 0.3, y - radius * 0.3, radius * 0.8, trip(sh(c, 1.45)), 0.2);
        blot(L.c, x + radius * 0.35, y + radius * 0.35, radius * 0.8, trip(sh(c, 0.5)), 0.18);
      }
      edgeWear(L, trip(sh(c, 1.35)), 0.4, 0.2);
    },

    // Литьё: тонкий бортик и низкий рельеф в поле, в углублениях патина. Рельеф почти в тон полю: двойная
    // контрастная рамка на каждой грани читалась как деревянный ящик.
    bronze: function (L, v, bare, spec) {
      const c = spec.color;
      fillAll(L, css(c), 100, orm(0.3, 1));
      grain(L, 1200, 0.08);
      if (bare) {
        for (let i = 0; i < 10; i++) blot(L.c, L.r() * S, L.r() * S, 30 + L.r() * 60, trip(sh(c, L.r() < 0.5 ? 1.2 : 0.76)), 0.3);
        edgeWear(L, trip(sh(c, 1.3)), 0.3, 0.25);
        return;
      }
      for (let i = 0; i < 4; i++) {
        const x = i % 2 === 0 ? 30 + L.r() * 20 : S - 30 - L.r() * 20;
        const y = i < 2 ? 30 + L.r() * 20 : S - 30 - L.r() * 20;
        paint(L, lump(L.r, x, y, 7 + L.r() * 7, 9), 'rgba(90,150,120,0.5)', null, orm(0.85, 0.1));
      }
      const raised = L.c.createLinearGradient(0, 0, S, S);
      raised.addColorStop(0, css(sh(c, 1.28)));
      raised.addColorStop(1, css(sh(c, 1.03)));
      const shapes = new Path2D();
      shapes.roundRect(12, 12, S - 24, S - 24, 12);
      shapes.roundRect(22, 22, S - 44, S - 44, 8);
      const motif = new Path2D();
      const m = S / 2;
      if (v === 0) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          motif.ellipse(m + Math.cos(a) * 34, m + Math.sin(a) * 34, 22, 10, a, 0, Math.PI * 2);
        }
        motif.moveTo(m + 14, m);
        motif.arc(m, m, 14, 0, Math.PI * 2);
      } else if (v === 1) {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          motif.moveTo(m + Math.cos(a) * 34 + 26, m + Math.sin(a) * 34);
          motif.arc(m + Math.cos(a) * 34, m + Math.sin(a) * 34, 26, 0, Math.PI * 2);
        }
        motif.moveTo(m + 12, m);
        motif.arc(m, m, 12, 0, Math.PI * 2);
      } else {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          motif.moveTo(m + Math.cos(a) * 62 + 8, m + Math.sin(a) * 62);
          motif.arc(m + Math.cos(a) * 62, m + Math.sin(a) * 62, 8, 0, Math.PI * 2);
        }
        motif.moveTo(m + 28, m);
        motif.arc(m, m, 28, 0, Math.PI * 2);
      }
      L.c.save();
      L.c.shadowColor = css(sh(c, 0.25), 0.35);
      L.c.shadowBlur = 4;
      L.c.shadowOffsetX = 1;
      L.c.shadowOffsetY = 2;
      paint(L, shapes, raised, gray(160), orm(0.22, 1), 'evenodd');
      paint(L, motif, raised, gray(160), orm(0.22, 1), 'evenodd');
      L.c.restore();
      if (v === 2) {
        const ring = new Path2D();
        ring.arc(m, m, 18, 0, Math.PI * 2);
        groove(L, ring, 3, 70);
      }
      edgeWear(L, trip(sh(c, 1.3)), 0.3, 0.25);
    },

    // Полировка с гравировкой; 0 — гильош, 1 — завитки по рамке, 2 — гладкое в царапинах.
    silver: function (L, v, bare, spec) {
      const c = spec.color;
      const dark = lum(c) < 0.4;
      const g = L.c.createLinearGradient(0, 0, 0, S);
      g.addColorStop(0, css(sh(c, 1.06)));
      g.addColorStop(1, css(sh(c, 0.86)));
      fillAll(L, g, 128, orm(0.15, 1));
      const m = S / 2;
      const ink = dark ? css(sh(c, 1.9), 0.6) : css(mix(sh(c, 0.42), 0x505c70, 0.4), 0.7);
      const engrave = function (path, width) {
        L.c.strokeStyle = ink;
        L.c.lineWidth = width;
        L.c.stroke(path);
        L.h.strokeStyle = gray(90);
        L.h.lineWidth = width + 0.4;
        L.h.stroke(path);
      };
      const scratches = function () {
        for (let i = 0; i < 46; i++) {
          const x = L.r() * S;
          const y = L.r() * S;
          const a = L.r() * Math.PI;
          const len = 10 + L.r() * 50;
          const path = line(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
          L.c.strokeStyle = L.r() < 0.5 ? 'rgba(255,255,255,0.6)' : css(sh(c, 0.6), 0.35);
          L.c.lineWidth = 0.7;
          L.c.stroke(path);
          L.o.strokeStyle = orm(0.3, 1);
          L.o.lineWidth = 1;
          L.o.stroke(path);
        }
      };
      if (bare) {
        scratches();
      } else if (v === 0) {
        L.c.save();
        L.h.save();
        const field = rectPath(30, 30, S - 60, S - 60);
        L.c.clip(field);
        L.h.clip(field);
        for (let k = 0; k < 34; k++) {
          const path = new Path2D();
          const base = 6 + k * 3.6;
          for (let i = 0; i <= 160; i++) {
            const a = (i / 160) * Math.PI * 2;
            const r = base + 2.6 * Math.sin(a * 18 + k * 0.35);
            if (i === 0) path.moveTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
            else path.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
          }
          engrave(path, 1);
        }
        L.c.restore();
        L.h.restore();
        const frame = new Path2D();
        frame.rect(26, 26, S - 52, S - 52);
        frame.rect(30, 30, S - 60, S - 60);
        engrave(frame, 1.4);
      } else if (v === 1) {
        const frame = new Path2D();
        frame.rect(18, 18, S - 36, S - 36);
        frame.rect(38, 38, S - 76, S - 76);
        engrave(frame, 1.6);
        const curls = new Path2D();
        for (let t = 36; t <= S - 36; t += 20) {
          for (const [x, y] of [[t, 28], [t, S - 28], [28, t], [S - 28, t]]) {
            curls.moveTo(x + 6, y);
            curls.arc(x, y, 6, 0, Math.PI * 1.5);
            curls.arc(x + 1.5, y - 1, 2.5, Math.PI * 1.5, Math.PI * 3.5);
          }
        }
        engrave(curls, 1.1);
        const star = new Path2D();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const len = i % 2 === 0 ? 30 : 16;
          star.moveTo(m, m);
          star.lineTo(m + Math.cos(a) * len, m + Math.sin(a) * len);
        }
        engrave(star, 1.5);
      } else {
        scratches();
        const plate = new Path2D();
        plate.roundRect(20, 20, S - 40, S - 40, 18);
        plate.roundRect(28, 28, S - 56, S - 56, 12);
        engrave(plate, 1.8);
        const oval = new Path2D();
        oval.ellipse(m, m, 46, 32, 0, 0, Math.PI * 2);
        oval.moveTo(m + 38, m);
        oval.ellipse(m, m, 38, 24, 0, 0, Math.PI * 2);
        engrave(oval, 1.6);
      }
      const tx = L.r() < 0.5 ? 30 : S - 30;
      const ty = L.r() < 0.5 ? 30 : S - 30;
      blot(L.c, tx, ty, 70 + L.r() * 30, trip(mix(c, 0x968c78, 0.6)), 0.24);
      blot(L.o, tx, ty, 70, ormRgb(0.45, 0.9), 0.6);
      edgeWear(L, '255,255,255', dark ? 0.25 : 0.5, 0.1);
    },

    // Клёпаная плита; 0 — заклёпки по рамке, 1 — две полосы обшивки, 2 — шов посередине. Ржавые потёки вниз.
    iron: function (L, v, bare, spec) {
      const c = spec.color;
      const rust = !NO_RUST[spec.id];
      fillAll(L, css(sh(c, 0.82)), 128, orm(0.55, 0.85));
      for (let i = 0; i < 16; i++) {
        blot(L.c, L.r() * S, L.r() * S, 30 + L.r() * 50, trip(sh(c, L.r() < 0.5 ? 0.66 : 1.02)), 0.35);
      }
      grain(L, 2500, 0.16);
      const rivets = [];
      const row = function (x0, y0, x1, y1, count) {
        for (let i = 0; i < count; i++) {
          const t = count === 1 ? 0.5 : i / (count - 1);
          rivets.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
        }
      };
      if (bare) {
        // Гладкий лист: без заклёпок и швов.
      } else if (v === 0) {
        row(22, 22, S - 22, 22, 6);
        row(22, S - 22, S - 22, S - 22, 6);
        row(22, 64, 22, S - 64, 3);
        row(S - 22, 64, S - 22, S - 64, 3);
      } else if (v === 1) {
        for (const y of [S / 3, (S * 2) / 3]) {
          groove(L, line(0, y, S, y), 4, 70);
          row(18, y - 13, S - 18, y - 13, 6);
        }
        row(18, 20, S - 18, 20, 6);
      } else {
        groove(L, line(0, S / 2, S, S / 2), 4, 70);
        row(20, S / 2 - 15, S - 20, S / 2 - 15, 7);
        row(20, S / 2 + 15, S - 20, S / 2 + 15, 7);
        row(20, 22, S - 20, 22, 7);
        row(20, S - 22, S - 20, S - 22, 7);
      }
      if (rust) {
        for (const [x, y] of rivets) {
          if (L.r() > 0.45) continue;
          const len = 20 + L.r() * 50;
          const w = 3 + L.r() * 4;
          const g = L.c.createLinearGradient(x, y, x, y + len);
          g.addColorStop(0, 'rgba(138,70,30,0.65)');
          g.addColorStop(1, 'rgba(138,70,30,0)');
          L.c.fillStyle = g;
          L.c.fillRect(x - w / 2, y, w, len);
          L.o.fillStyle = orm(0.9, 0.2);
          L.o.fillRect(x - w / 2, y, w, len * 0.6);
        }
        for (let i = 0; i < 5; i++) {
          const x = L.r() < 0.5 ? L.r() * 40 : S - L.r() * 40;
          const y = L.r() * S;
          paint(L, lump(L.r, x, y, 10 + L.r() * 16, 12), 'rgba(122,62,26,0.6)', null, orm(0.95, 0.05));
          paint(L, lump(L.r, x, y, 6 + L.r() * 8, 6), 'rgba(170,88,38,0.5)', null, null);
        }
      }
      for (const [x, y] of rivets) rivet(L, x, y, 7, c);
      edgeWear(L, trip(sh(c, 1.35)), 0.3, 0.35);
    },

    // Золото: слитки с клеймом; 0 — два ряда, 1 — три ряда, 2 — кладка вперевязку.
    gold: function (L, v, bare, spec) {
      const c = spec.color;
      if (bare) {
        const g = L.c.createLinearGradient(0, 0, S, S);
        g.addColorStop(0, css(sh(c, 1.08)));
        g.addColorStop(1, css(sh(c, 0.82)));
        fillAll(L, g, 128, orm(0.22, 1));
        for (let i = 0; i < 40; i++) {
          const x = L.r() * S;
          const y = L.r() * S;
          const radius = 10 + L.r() * 18;
          blot(L.h, x, y, radius, '80,80,80', 0.45);
          blot(L.c, x - radius * 0.3, y - radius * 0.3, radius * 0.8, trip(sh(c, 1.5)), 0.18);
          blot(L.c, x + radius * 0.35, y + radius * 0.35, radius * 0.8, trip(sh(c, 0.55)), 0.16);
        }
        grain(L, 800, 0.08);
        edgeWear(L, trip(sh(c, 1.6)), 0.4, 0.15);
        return;
      }
      fillAll(L, css(sh(c, 0.45)), 70, orm(0.6, 0.9));
      const rows = v === 1 ? 3 : 2;
      const margin = 7;
      const gap = 8;
      const h = (S - margin * 2 - gap * (rows - 1)) / rows;
      for (let row = 0; row < rows; row++) {
        const y = margin + row * (h + gap);
        const cuts = v === 2 ? [row === 0 ? 0.56 : 0.38] : [];
        const xs = [margin - gap / 2].concat(cuts.map(function (k) { return k * S; }), [S - margin + gap / 2]);
        for (let k = 0; k + 1 < xs.length; k++) {
          ingot(L, xs[k] + gap / 2, y, xs[k + 1] - xs[k] - gap, h, c);
        }
      }
      grain(L, 800, 0.08);
    },

    // Свинцовый лист: белёсый налёт, вмятины и царапины; 1 — клеймо, 2 — литейные швы.
    lead: function (L, v, bare, spec) {
      const c = spec.color;
      fillAll(L, css(c), 128, orm(0.6, 0.6));
      for (let i = 0; i < 18; i++) {
        blot(L.c, L.r() * S, L.r() * S, 25 + L.r() * 55, trip(sh(c, L.r() < 0.5 ? 1.2 : 0.75)), 0.4);
      }
      for (let k = 0; k < 10; k++) {
        const cx = L.r() * S;
        const cy = L.r() * S;
        for (let i = 0; i < 45; i++) {
          const a = L.r() * Math.PI * 2;
          const d = L.r() * L.r() * 30;
          const size = 1 + L.r() * 2;
          L.c.fillStyle = 'rgba(222,226,236,' + (0.2 + L.r() * 0.35).toFixed(3) + ')';
          L.c.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, size, size);
        }
        blot(L.o, cx, cy, 30, ormRgb(0.85, 0.25), 0.6);
      }
      for (let i = 0; i < 7; i++) {
        const x = L.r() * S;
        const y = L.r() * S;
        const radius = 10 + L.r() * 16;
        blot(L.h, x, y, radius, '60,60,60', 0.7);
        blot(L.c, x, y, radius, trip(sh(c, 0.6)), 0.25);
      }
      for (let i = 0; i < 16; i++) {
        const x = L.r() * S;
        const y = L.r() * S;
        const a = L.r() * Math.PI;
        const len = 15 + L.r() * 35;
        L.c.strokeStyle = css(sh(c, 1.5), 0.55);
        L.c.lineWidth = 0.8;
        L.c.stroke(line(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len));
      }
      if (!bare && v === 1) {
        const plate = new Path2D();
        plate.roundRect(S / 2 - 50, S / 2 - 28, 100, 56, 8);
        L.c.save();
        L.c.shadowColor = 'rgba(0,0,0,0.55)';
        L.c.shadowBlur = 5;
        L.c.shadowOffsetY = 3;
        paint(L, plate, css(sh(c, 1.12)), gray(170), orm(0.5, 0.7));
        L.c.restore();
        const text = STAMPS[spec.id];
        if (text) {
          for (const ctx of [L.c, L.h]) {
            ctx.font = 'bold 38px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = ctx === L.c ? css(sh(c, 1.55)) : gray(215);
            ctx.fillText(text, S / 2, S / 2 + 2);
          }
        }
      } else if (!bare && v === 2) {
        groove(L, line(S * 0.34, 0, S * 0.34, S), 4, 55);
        groove(L, line(S * 0.66, 0, S * 0.66, S), 4, 55);
      }
      edgeWear(L, trip(sh(c, 1.4)), 0.3, 0.5);
    },
  };

  // ---------- камни, дерево, кирпич и прочие виды (balance.json → materials.ladder[].look) ----------
  // Особенности отдельных камней: крап (сколько и каких тонов), полосчатость, поры, вкрапления, окаменелости, звёзды.
  const STONE = {
    'ladder-granite': { fleck: 1600, tones: [0x2b2a2a, 0xd8d2cc, 0xa07a70] },
    'ladder-granite-dark': { fleck: 1500, tones: [0x1d1b1a, 0xb9b2aa, 0x7a6a62] },
    'ladder-diorite': { fleck: 1800, tones: [0x2a2a2a, 0xf2f0ea] },
    'ladder-gneiss': { fleck: 900, tones: [0x3a3530, 0xe6e0d6], bands: true },
    'ladder-basalt': { fleck: 300, tones: [0x2a2826, 0x8a847c], holes: 26 },
    'ladder-titan-stone': { fleck: 400, tones: [0x2a2622, 0x9a8f84], holes: 14 },
    'ladder-porphyry': { fleck: 260, tones: [0x3a1a1e, 0xc99a8a], crystals: true },
    'ladder-limestone': { fleck: 500, tones: [0x8f877a, 0xe4dccc], fossils: true },
    'ladder-slate': { fleck: 200, tones: [0x3e4044, 0x7a7e84], slate: true },
    'ladder-cobble': { cobble: true },
    'ladder-meteor-stone': { fleck: 700, tones: [0x2e2b28, 0xc9ccd2], metal: true },
    'ladder-regolith': { fleck: 900, tones: [0x6f6a62, 0xd8d4cc], craters: true },
    'ladder-starstone': { fleck: 500, tones: [0x3c3936, 0xffffff], stars: true },
    'ladder-cloudstone': { fleck: 300, tones: [0xffffff, 0x8f8d88], clouds: true },
    'ladder-worldstone': { fleck: 1200, tones: [0x3a3630, 0xf0e8d8, 0x8a6a4a], bands: true },
  };

  // Булыжник: окатанные камни в растворе, у каждого свой тон и блик сверху слева.
  function cobbles(L, c, v) {
    const mortar = sh(c, 0.58);
    fillAll(L, css(mortar), 70, orm(0.95, 0));
    grain(L, 1200, 0.14);
    const rows = v === 1 ? 3 : 4;
    const h = S / rows;
    for (let row = 0; row < rows; row++) {
      let x = (row % 2) * (S / 8) - S / 8 - L.r() * 10;
      while (x < S) {
        const w = (S / (rows === 3 ? 3 : 4)) * (0.8 + L.r() * 0.4);
        const cx = x + w / 2;
        const cy = row * h + h / 2 + (L.r() - 0.5) * 6;
        const path = new Path2D();
        path.ellipse(cx, cy, w / 2 - 3, h / 2 - 3, (L.r() - 0.5) * 0.3, 0, Math.PI * 2);
        const tone = sh(c, 0.8 + L.r() * 0.4);
        const g = L.c.createRadialGradient(cx - w * 0.15, cy - h * 0.2, 2, cx, cy, w / 2);
        g.addColorStop(0, css(sh(tone, 1.18)));
        g.addColorStop(1, css(sh(tone, 0.78)));
        paint(L, path, g, gray(175), orm(0.85, 0));
        x += w;
      }
    }
    grain(L, 1600, 0.12);
  }

  // Кромка тёсаного блока: гладкая рамка (выше поля, светлее) и шов по её краю.
  function draftedMargin(L, c, band) {
    const frame = new Path2D();
    frame.rect(0, 0, S, S);
    frame.rect(band, band, S - band * 2, S - band * 2);
    paint(L, frame, css(sh(c, 1.08), 0.45), gray(150), null, 'evenodd');
    groove(L, rectPath(band, band, S - band * 2, S - band * 2), 2, 30);
  }

  // Мягкая волнистая полоса на всю ширину (слои осадка, полосчатость).
  function band(L, y, h, color, height) {
    const path = new Path2D();
    const amp = 2 + L.r() * 4;
    const ph = L.r() * 6.3;
    const f = 0.02 + L.r() * 0.03;
    path.moveTo(0, y + Math.sin(ph) * amp);
    for (let x = 8; x <= S; x += 8) path.lineTo(x, y + Math.sin(x * f + ph) * amp);
    for (let x = S; x >= 0; x -= 8) path.lineTo(x, y + h + Math.sin(x * f + ph + 0.6) * amp);
    path.closePath();
    paint(L, path, color, height, null);
  }

  // Волокна доски вдоль оси (vertical — вдоль y): волнистые линии чуть темнее и светлее тона.
  function grainLines(L, c, x0, y0, w, h, vertical, n) {
    for (let i = 0; i < n; i++) {
      const p = L.r();
      const path = new Path2D();
      const amp = 1 + L.r() * 3;
      const f = 0.02 + L.r() * 0.04;
      const ph = L.r() * 6.3;
      for (let k = 0; k <= 20; k++) {
        const a = (vertical ? h : w) * k / 20;
        const b = (vertical ? w : h) * p + Math.sin(a * f + ph) * amp;
        const x = vertical ? x0 + b : x0 + a;
        const y = vertical ? y0 + a : y0 + b;
        if (k === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      }
      L.c.strokeStyle = css(sh(c, L.r() < 0.7 ? 0.68 : 1.16), (0.12 + L.r() * 0.22).toFixed(2));
      L.c.lineWidth = 0.6 + L.r() * 1.4;
      L.c.stroke(path);
      if (i % 3 === 0) {
        L.h.strokeStyle = gray(112);
        L.h.lineWidth = 1;
        L.h.stroke(path);
      }
    }
  }

  function knot(L, c, x, y, s) {
    for (let k = 5; k >= 1; k--) {
      const path = new Path2D();
      path.ellipse(x, y, s * k / 5 * 1.6, s * k / 5, 0, 0, Math.PI * 2);
      L.c.strokeStyle = css(sh(c, 0.5 + k * 0.06), 0.5);
      L.c.lineWidth = 1.2;
      L.c.stroke(path);
    }
    const core = new Path2D();
    core.ellipse(x, y, s * 0.55, s * 0.36, 0, 0, Math.PI * 2);
    paint(L, core, css(sh(c, 0.42)), gray(100), null);
  }

  // Дерево с особенностями: окаменелое — с кварцевыми искрами, тёмные «легендарные» — с тлеющими прожилками.
  const WOOD = {
    'ladder-petrified-wood': { glitter: true },
    'ladder-dragonwood': { glow: 0xff6a2a },
    'ladder-abyss-wood': { glow: 0x9a5aff },
    'ladder-worldtree': { glow: 0x9ae06a },
    'ladder-lifetree': { glow: 0xb4f07a },
    'ladder-cedar-star': { glitter: true },
  };

  const SAND = {
    'ladder-travertine': { pores: 'long' },
    'ladder-tuff': { pores: 'round' },
    'ladder-shellrock': { shells: true },
    'ladder-quartz-sand': { glitter: 0.5 },
    'ladder-sand-gold': { glitter: 0.8, gold: true },
    'ladder-stardust': { glitter: 1, stars: true },
    'ladder-sand-pharaoh': { chisel: true },
  };

  const MARBLE_VEIN = {
    'ladder-marble-black': 0xe8e2d6, 'ladder-marble-rose': 0xa0525a, 'ladder-marble-sky': 0x7f9cc4,
    'ladder-marble-cloud': 0x9aa8bc, 'ladder-marble-moon': 0x9ea6b8, 'ladder-marble-gods': 0xc9a24a,
    'ladder-marble-pearl': 0xb9a88a,
  };

  // Отсветы в глубине тёмного камня.
  const OBSIDIAN_GLOW = {
    'ladder-obsidian': 0x6a3a8a, 'ladder-obsidian-black': 0x4a3a6a, 'ladder-abyss-basalt': 0x5a3a7a,
    'ladder-neutronium': 0x3a5aa0, 'ladder-dark-matter': 0x6a3ab0,
  };

  const PAINT = {
    metal: function (L, v, bare, spec) {
      METAL[metalStyle(spec)](L, v, bare, spec);
    },

    platinum: function (L, v, bare, spec) {
      METAL[metalStyle(spec)](L, v, bare, spec);
    },

    // Камень: тон пятнами, крап, бугры; 0 — тёсаный блок с гладкой рамкой и бороздами по полю, 1 — колотый
    // (крупные бугры, трещины), 2 — пиленый с прожилкой. Без рисунка — ровный камень с крапом.
    stone: function (L, v, bare, spec) {
      const c = spec.color;
      const k = STONE[spec.id] || { fleck: 700, tones: [sh(c, 0.6), sh(c, 1.3)] };
      fillAll(L, css(c), 128, orm(0.9, 0));
      if (k.cobble) {
        cobbles(L, c, v);
        edgeLight(L, trip(sh(c, 1.3)), 0.2);
        return;
      }
      for (let i = 0; i < 16; i++) blot(L.c, L.r() * S, L.r() * S, 30 + L.r() * 60, trip(sh(c, L.r() < 0.5 ? 0.84 : 1.12)), 0.35);
      if (k.clouds) for (let i = 0; i < 10; i++) blot(L.c, L.r() * S, L.r() * S, 40 + L.r() * 50, trip(sh(c, 1.25)), 0.5);
      if (k.bands) {
        for (let y = -6; y < S; ) {
          const h = 6 + L.r() * 14;
          band(L, y, h, css(sh(c, L.r() < 0.5 ? 0.72 : 1.18), 0.35), null);
          y += h + 6 + L.r() * 16;
        }
      }
      if (k.slate) {
        for (let y = 0; y < S; ) {
          const h = 6 + L.r() * 14;
          L.c.fillStyle = css(sh(c, 0.85 + L.r() * 0.3), 0.6);
          L.c.fillRect(0, y, S, h);
          L.h.fillStyle = gray(110 + Math.floor(L.r() * 40));
          L.h.fillRect(0, y, S, h);
          y += h;
        }
      }
      const tones = k.tones;
      for (let i = 0; i < k.fleck; i++) {
        const x = L.r() * S;
        const y = L.r() * S;
        const s = 1 + L.r() * (k.fleck > 1200 ? 2.2 : 1.6);
        L.c.fillStyle = css(tones[Math.floor(L.r() * tones.length)], (0.25 + L.r() * 0.45).toFixed(2));
        L.c.fillRect(x, y, s, s);
        if (k.metal && L.r() < 0.3) {
          L.o.fillStyle = orm(0.3, 1);
          L.o.fillRect(x, y, s, s);
        }
      }
      if (k.crystals) {
        for (let i = 0; i < 46; i++) {
          L.c.save();
          L.c.translate(L.r() * S, L.r() * S);
          L.c.rotate(L.r() * Math.PI);
          L.c.fillStyle = css(0xe8d8c8, 0.7);
          L.c.fillRect(-3, -1.5, 6 + L.r() * 4, 3);
          L.c.restore();
        }
      }
      if (k.holes) {
        for (let i = 0; i < k.holes; i++) {
          const x = L.r() * S;
          const y = L.r() * S;
          const r = 1.5 + L.r() * 3.5;
          const hole = new Path2D();
          hole.arc(x, y, r, 0, Math.PI * 2);
          paint(L, hole, css(sh(c, 0.35), 0.85), gray(60), null);
        }
      }
      if (k.fossils) {
        for (let i = 0; i < 4; i++) {
          const x = 30 + L.r() * (S - 60);
          const y = 30 + L.r() * (S - 60);
          const shell = new Path2D();
          for (let t = 0; t < 26; t++) {
            const a = t * 0.5;
            const r = 1 + t * 0.45;
            if (t === 0) shell.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
            else shell.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
          }
          L.c.strokeStyle = css(sh(c, 0.62), 0.55);
          L.c.lineWidth = 1.4;
          L.c.stroke(shell);
          L.h.strokeStyle = gray(150);
          L.h.lineWidth = 2;
          L.h.stroke(shell);
        }
      }
      if (k.stars) sparkles(L, 26, 'rgba(255,255,255,0.9)');
      if (k.craters) {
        for (let i = 0; i < 8; i++) {
          const x = L.r() * S;
          const y = L.r() * S;
          const r = 5 + L.r() * 12;
          blot(L.h, x, y, r, '60,60,60', 0.8);
          blot(L.c, x + r * 0.25, y + r * 0.25, r, trip(sh(c, 0.6)), 0.4);
          blot(L.c, x - r * 0.3, y - r * 0.3, r * 0.6, trip(sh(c, 1.3)), 0.3);
        }
      }
      for (let i = 0; i < 40; i++) blot(L.h, L.r() * S, L.r() * S, 6 + L.r() * 18, L.r() < 0.5 ? '96,96,96' : '168,168,168', 0.45);
      if (!bare && v === 0) {
        const band0 = 16;
        // Борозды тёсаного поля — косые штрихи внутри рамки.
        L.c.save();
        L.h.save();
        const field = rectPath(band0, band0, S - band0 * 2, S - band0 * 2);
        L.c.clip(field);
        L.h.clip(field);
        for (let i = -S; i < S * 2; i += 5 + L.r() * 4) {
          const path = line(i, band0, i - S * 0.4, S - band0);
          L.c.strokeStyle = css(sh(c, 0.72), (0.12 + L.r() * 0.12).toFixed(2));
          L.c.lineWidth = 1 + L.r();
          L.c.stroke(path);
          L.h.strokeStyle = gray(104);
          L.h.lineWidth = 1.5;
          L.h.stroke(path);
        }
        L.c.restore();
        L.h.restore();
        draftedMargin(L, c, band0);
      } else if (!bare && v === 1) {
        for (let i = 0; i < 10; i++) {
          const x = L.r() * S;
          const y = L.r() * S;
          const r = 30 + L.r() * 30;
          const up = L.r() < 0.5;
          blot(L.h, x, y, r, up ? '205,205,205' : '70,70,70', 0.5);
          blot(L.c, x - r * 0.3, y - r * 0.3, r * 0.8, trip(sh(c, up ? 1.14 : 0.86)), 0.22);
        }
        for (let i = 0; i < 2; i++) crack(L, L.r() * S, L.r() * S, 60 + L.r() * 80, L.r() * 6.3, css(sh(c, 0.4), 0.7));
      } else if (!bare) {
        vein(L, -10, L.r() * S, S * 1.4, (L.r() - 0.5) * 0.6, 1.4, css(sh(c, 1.35), 0.5), 0.8);
        crack(L, L.r() * S, L.r() * S, 50 + L.r() * 60, L.r() * 6.3, css(sh(c, 0.42), 0.6));
      }
      grain(L, 1400, 0.12);
      edgeLight(L, trip(sh(c, 1.3)), 0.25);
    },

    // Песчаник и родня: слои осадка; 1 — косая слоистость, 2 — тёсаная кромка; поры, ракушки, искры кварца.
    sand: function (L, v, bare, spec) {
      const c = spec.color;
      const k = SAND[spec.id] || {};
      fillAll(L, css(c), 128, orm(0.92, 0));
      for (let y = -10; y < S + 10; ) {
        const h = 5 + L.r() * 18;
        band(L, y, h, css(sh(c, 0.88 + L.r() * 0.22), 0.55), gray(118 + Math.floor(L.r() * 22)));
        y += h;
      }
      if (!bare && v === 1) {
        for (let i = 0; i < 34; i++) {
          const x = L.r() * S * 1.4 - S * 0.2;
          const y = L.r() * S;
          L.c.strokeStyle = css(sh(c, 0.78), 0.18);
          L.c.lineWidth = 1;
          L.c.stroke(line(x, y, x + 40 + L.r() * 40, y + 10 + L.r() * 14));
        }
      }
      if ((!bare && v === 2) || k.chisel) draftedMargin(L, c, 14);
      if (k.pores === 'long') {
        for (let i = 0; i < 60; i++) {
          const pore = new Path2D();
          pore.ellipse(L.r() * S, L.r() * S, 2 + L.r() * 8, 0.8 + L.r() * 1.6, 0, 0, Math.PI * 2);
          paint(L, pore, css(sh(c, 0.5), 0.75), gray(70), null);
        }
      } else if (k.pores === 'round') {
        for (let i = 0; i < 50; i++) {
          const pore = new Path2D();
          pore.arc(L.r() * S, L.r() * S, 1 + L.r() * 3, 0, Math.PI * 2);
          paint(L, pore, css(sh(c, 0.45), 0.8), gray(70), null);
        }
        for (let i = 0; i < 160; i++) {
          L.c.fillStyle = css(0x3a3028, 0.5);
          L.c.fillRect(L.r() * S, L.r() * S, 2, 2);
        }
      }
      if (k.shells) {
        for (let i = 0; i < 40; i++) {
          const x = L.r() * S;
          const y = L.r() * S;
          const r = 3 + L.r() * 5;
          const a = L.r() * 6.3;
          const shell = new Path2D();
          shell.moveTo(x, y);
          shell.arc(x, y, r, a, a + 1.6);
          shell.closePath();
          paint(L, shell, css(sh(c, 1.25), 0.7), gray(160), null);
          L.c.strokeStyle = css(sh(c, 0.6), 0.5);
          L.c.lineWidth = 0.8;
          L.c.stroke(shell);
        }
      }
      if (k.glitter) {
        for (let i = 0; i < 260 * k.glitter; i++) {
          const x = L.r() * S;
          const y = L.r() * S;
          L.c.fillStyle = k.gold ? 'rgba(255,214,110,0.85)' : 'rgba(255,255,255,' + (0.5 + L.r() * 0.4).toFixed(2) + ')';
          L.c.fillRect(x, y, 1.4, 1.4);
          L.o.fillStyle = orm(0.25, k.gold ? 0.8 : 0.1);
          L.o.fillRect(x, y, 1.4, 1.4);
        }
      }
      if (k.stars) sparkles(L, 20, 'rgba(255,255,255,0.95)');
      for (let i = 0; i < 30; i++) blot(L.h, L.r() * S, L.r() * S, 6 + L.r() * 14, L.r() < 0.5 ? '100,100,100' : '160,160,160', 0.35);
      grain(L, 2600, 0.14);
      edgeLight(L, trip(sh(c, 1.25)), 0.2);
    },

    // Бетон: 0 — архитектурный, с конусами стяжек, 1 — отпечаток досок опалубки, 2 — потёки воды; раковины везде.
    concrete: function (L, v, bare, spec) {
      const c = spec.color;
      fillAll(L, css(c), 128, orm(0.86, 0));
      for (let i = 0; i < 20; i++) blot(L.c, L.r() * S, L.r() * S, 20 + L.r() * 50, trip(sh(c, L.r() < 0.5 ? 0.9 : 1.08)), 0.3);
      grain(L, 3000, 0.1);
      if (!bare && v === 0) {
        for (const [x, y] of [[S * 0.25, S * 0.25], [S * 0.75, S * 0.25], [S * 0.25, S * 0.75], [S * 0.75, S * 0.75]]) {
          const g = L.c.createRadialGradient(x - 1, y - 1, 0, x, y, 8);
          g.addColorStop(0, css(sh(c, 0.35)));
          g.addColorStop(0.7, css(sh(c, 0.7)));
          g.addColorStop(1, css(sh(c, 0.95), 0));
          L.c.fillStyle = g;
          L.c.fillRect(x - 9, y - 9, 18, 18);
          blot(L.h, x, y, 9, '40,40,40', 0.9);
        }
        groove(L, line(0, 3, S, 3), 1.5, 25);
        groove(L, line(3, 0, 3, S), 1.5, 25);
      } else if (!bare && v === 1) {
        for (let y = 0; y < S; y += 32) {
          L.c.fillStyle = css(sh(c, 0.93 + L.r() * 0.12), 0.5);
          L.c.fillRect(0, y, S, 32);
          groove(L, line(0, y, S, y), 1.5, 20);
          grainLines(L, sh(c, 0.95), 0, y + 2, S, 28, false, 6);
        }
      } else if (!bare) {
        for (let i = 0; i < 7; i++) {
          const x = L.r() * S;
          const w = 6 + L.r() * 16;
          const len = 60 + L.r() * 150;
          const g = L.c.createLinearGradient(0, 0, 0, len);
          g.addColorStop(0, css(sh(c, 0.72), 0.35));
          g.addColorStop(1, css(sh(c, 0.72), 0));
          L.c.fillStyle = g;
          L.c.fillRect(x, 0, w, len);
        }
      }
      for (let i = 0; i < 60; i++) {
        const x = L.r() * S;
        const y = L.r() * S;
        const r = 0.8 + L.r() * 2.2;
        const hole = new Path2D();
        hole.arc(x, y, r, 0, Math.PI * 2);
        L.c.fillStyle = css(sh(c, 0.48), 0.8);
        L.c.fill(hole);
        blot(L.h, x, y, r * 1.6, '60,60,60', 0.8);
      }
      if (spec.id === 'ladder-fiber-concrete') {
        for (let i = 0; i < 160; i++) {
          const x = L.r() * S;
          const y = L.r() * S;
          const a = L.r() * Math.PI;
          L.c.strokeStyle = 'rgba(242,242,238,0.5)';
          L.c.lineWidth = 0.8;
          L.c.stroke(line(x, y, x + Math.cos(a) * 6, y + Math.sin(a) * 6));
        }
      }
      if (spec.id === 'ladder-titan-concrete') {
        for (let i = 0; i < 140; i++) {
          const x = L.r() * S;
          const y = L.r() * S;
          L.c.fillStyle = 'rgba(216,220,224,0.7)';
          L.c.fillRect(x, y, 2, 2);
          L.o.fillStyle = orm(0.35, 0.8);
          L.o.fillRect(x, y, 2, 2);
        }
      }
      edgeLight(L, trip(sh(c, 1.2)), 0.2);
    },

    // Дерево: 0 — вертикальные доски, 1 — горизонтальные, 2 — цельный брус с «собором» годовых слоёв.
    // Без рисунка — сплошное волокно.
    wood: function (L, v, bare, spec) {
      const c = spec.color;
      const k = WOOD[spec.id] || {};
      fillAll(L, css(c), 128, orm(0.74, 0));
      if (bare) {
        grainLines(L, c, 0, 0, S, S, true, 70);
      } else if (v === 0 || v === 1) {
        const vertical = v === 0;
        const n = vertical ? 3 : 4;
        const span = S / n;
        for (let i = 0; i < n; i++) {
          const tone = sh(c, 0.88 + L.r() * 0.22);
          L.c.fillStyle = css(tone);
          if (vertical) L.c.fillRect(i * span, 0, span, S);
          else L.c.fillRect(0, i * span, S, span);
          if (vertical) grainLines(L, tone, i * span + 2, 0, span - 4, S, true, 26);
          else grainLines(L, tone, 0, i * span + 2, S, span - 4, false, 22);
          if (L.r() < 0.55) {
            const kx = vertical ? i * span + span * (0.3 + L.r() * 0.4) : 30 + L.r() * (S - 60);
            const ky = vertical ? 30 + L.r() * (S - 60) : i * span + span * (0.3 + L.r() * 0.4);
            knot(L, tone, kx, ky, 4 + L.r() * 4);
          }
          if (i > 0) groove(L, vertical ? line(i * span, 0, i * span, S) : line(0, i * span, S, i * span), 3, 55);
        }
        for (let i = 0; i < n; i++) {
          for (const t of [14, S - 14]) {
            const x = vertical ? i * span + span / 2 : t;
            const y = vertical ? t : i * span + span / 2;
            const nail = new Path2D();
            nail.arc(x, y, 2.4, 0, Math.PI * 2);
            paint(L, nail, css(0x3a3530), gray(150), orm(0.5, 0.7));
          }
        }
      } else {
        const cx = S * (0.35 + L.r() * 0.3);
        for (let ring = 0; ring < 16; ring++) {
          const w = 10 + ring * 9;
          const top = S * 0.15 + ring * 11;
          const path = new Path2D();
          path.moveTo(cx - w, S + 4);
          path.bezierCurveTo(cx - w, top + 30, cx - w * 0.3, top, cx, top);
          path.bezierCurveTo(cx + w * 0.3, top, cx + w, top + 30, cx + w, S + 4);
          L.c.strokeStyle = css(sh(c, ring % 2 ? 0.72 : 1.12), 0.35);
          L.c.lineWidth = 1.5 + L.r() * 2;
          L.c.stroke(path);
          if (ring % 2) {
            L.h.strokeStyle = gray(116);
            L.h.lineWidth = 2;
            L.h.stroke(path);
          }
        }
        grainLines(L, c, 0, 0, S, S, true, 30);
        knot(L, c, S * (0.2 + L.r() * 0.6), S * (0.2 + L.r() * 0.3), 5);
      }
      if (k.glitter) {
        for (let i = 0; i < 120; i++) {
          const x = L.r() * S;
          const y = L.r() * S;
          L.c.fillStyle = 'rgba(255,250,235,0.7)';
          L.c.fillRect(x, y, 1.5, 1.5);
          L.o.fillStyle = orm(0.3, 0.1);
          L.o.fillRect(x, y, 1.5, 1.5);
        }
      }
      if (k.glow) {
        for (let i = 0; i < 6; i++) vein(L, L.r() * S, -10, S * 1.2, Math.PI / 2 + (L.r() - 0.5) * 0.3, 1.2, css(k.glow, 0.45), 1.2);
      }
      grain(L, 900, 0.08);
      edgeLight(L, trip(sh(c, 1.25)), 0.2);
    },

    // Кирпич: курсы по 4 на грань; 0 — ложковая перевязка, 1 — фламандская (тычки через ложок),
    // 2 — пояс из кирпичей на ребро. Тон каждого кирпича свой, у четверти сколот угол.
    brick: function (L, v, bare, spec) {
      const c = spec.color;
      const mortar = lum(c) > 0.7 ? mix(c, 0x8a857c, 0.55) : mix(0xd6cfc2, c, 0.18);
      fillAll(L, css(mortar), 70, orm(0.95, 0));
      grain(L, 1500, 0.15);
      const rows = 4;
      const rh = S / rows;
      const gap = 7;
      const course = function (row, kind) {
        const y = row * rh + gap / 2;
        const h = rh - gap;
        const pieces = [];
        if (kind === 'soldier') {
          for (let x = 0; x < S; x += S / 8) pieces.push([x, S / 8]);
        } else if (kind === 'flemish') {
          let x = row % 2 ? -S / 8 : 0;
          let header = false;
          while (x < S) {
            const w = header ? S / 8 : S / 4;
            pieces.push([x, w]);
            x += w;
            header = !header;
          }
        } else {
          const off = row % 2 ? S / 4 : 0;
          for (let x = -off; x < S; x += S / 2) pieces.push([x, S / 2]);
        }
        for (const [x, w] of pieces) {
          const bx = x + gap / 2;
          const bw = w - gap;
          const tone = sh(c, 0.82 + L.r() * 0.3);
          const path = new Path2D();
          path.roundRect(bx, y, bw, h, 3);
          const g = L.c.createLinearGradient(0, y, 0, y + h);
          g.addColorStop(0, css(sh(tone, 1.08)));
          g.addColorStop(1, css(sh(tone, 0.9)));
          paint(L, path, g, gray(160), orm(0.88, 0));
          L.c.save();
          L.c.clip(path);
          for (let i = 0; i < 4; i++) blot(L.c, bx + L.r() * bw, y + L.r() * h, 8 + L.r() * 20, trip(sh(tone, L.r() < 0.5 ? 0.72 : 1.2)), 0.35);
          for (let i = 0; i < 40; i++) {
            L.c.fillStyle = css(sh(tone, L.r() < 0.5 ? 0.55 : 1.3), 0.4);
            L.c.fillRect(bx + L.r() * bw, y + L.r() * h, 1.5, 1.5);
          }
          L.c.restore();
          if (L.r() < 0.25) {
            const cx = L.r() < 0.5 ? bx : bx + bw;
            const cy = L.r() < 0.5 ? y : y + h;
            paint(L, lump(L.r, cx, cy, 4 + L.r() * 4, 5), css(mortar, 0.9), gray(90), orm(0.95, 0));
          }
        }
      };
      for (let row = 0; row < rows; row++) course(row, bare ? 'run' : v === 1 ? 'flemish' : v === 2 && row === 1 ? 'soldier' : 'run');
      edgeLight(L, trip(sh(c, 1.2)), 0.15);
    },

    // Мрамор: полировка, облачный тон и прожилки с ответвлениями; 0 — три косые, 1 — сеть, 2 — две жирные.
    marble: function (L, v, bare, spec) {
      const c = spec.color;
      const dark = lum(c) < 0.3;
      const ink = MARBLE_VEIN[spec.id] || (dark ? sh(c, 1.7) : sh(mix(c, 0x6a6f78, 0.6), 0.85));
      fillAll(L, css(c), 128, orm(spec.id === 'ladder-marble-polished' ? 0.08 : 0.18, 0));
      for (let i = 0; i < 12; i++) blot(L.c, L.r() * S, L.r() * S, 30 + L.r() * 70, trip(sh(c, L.r() < 0.5 ? 0.94 : 1.05)), 0.4);
      const count = bare ? 2 : [3, 7, 2][v];
      for (let i = 0; i < count; i++) {
        const x = L.r() * S;
        const y = L.r() < 0.5 ? -10 : L.r() * S;
        const width = (v === 2 && !bare ? 4.5 : 2.2) + L.r() * 1.6;
        const path = vein(L, x, y, S * (0.9 + L.r() * 0.6), Math.PI * (0.15 + L.r() * 0.7), width, css(ink, (0.7 + L.r() * 0.25).toFixed(2)), 1);
        for (let b = 0; b < 3; b++) vein(L, L.r() * S, L.r() * S, 30 + L.r() * 50, L.r() * 6.3, 0.8 + L.r() * 0.8, css(ink, 0.5), 0.6);
        L.h.strokeStyle = gray(118);
        L.h.lineWidth = 1.5;
        L.h.stroke(path);
      }
      for (let i = 0; i < 20; i++) vein(L, L.r() * S, L.r() * S, 20 + L.r() * 40, L.r() * 6.3, 0.5, css(ink, 0.18), 0.3);
      if (spec.id === 'ladder-quartzite') sparkles(L, 18, 'rgba(255,255,255,0.7)');
      edgeLight(L, '255,255,255', dark ? 0.12 : 0.25);
    },

    // Изразец: глазурь с бликом и кракелюром; 0 — 4 × 4, 1 — 2 × 2 с розеткой, 2 — шахматка двух тонов.
    tile: function (L, v, bare, spec) {
      const c = spec.color;
      const grout = mix(0xcfc8b8, c, 0.15);
      fillAll(L, css(grout), 80, orm(0.92, 0));
      const n = !bare && v === 1 ? 2 : 4;
      const cell = S / n;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const tone = !bare && v === 2 && (x + y) % 2 ? sh(c, 0.8) : sh(c, 0.94 + L.r() * 0.1);
          const path = new Path2D();
          path.roundRect(x * cell + 3, y * cell + 3, cell - 6, cell - 6, 4);
          const g = L.c.createLinearGradient(x * cell, y * cell, x * cell + cell, y * cell + cell);
          g.addColorStop(0, css(sh(tone, 1.12)));
          g.addColorStop(1, css(sh(tone, 0.9)));
          paint(L, path, g, gray(150), orm(0.12, 0));
          L.c.fillStyle = 'rgba(255,255,255,0.3)';
          L.c.fillRect(x * cell + 7, y * cell + 7, cell * 0.35, 2.5);
          if (!bare && v === 1) {
            const cx = x * cell + cell / 2;
            const cy = y * cell + cell / 2;
            const rosette = new Path2D();
            for (let p = 0; p < 8; p++) {
              const a = (p / 8) * Math.PI * 2;
              rosette.ellipse(cx + Math.cos(a) * cell * 0.18, cy + Math.sin(a) * cell * 0.18, cell * 0.14, cell * 0.06, a, 0, Math.PI * 2);
            }
            paint(L, rosette, css(sh(c, lum(c) > 0.5 ? 0.62 : 1.5), 0.75), gray(160), null);
            const dot = new Path2D();
            dot.arc(cx, cy, cell * 0.07, 0, Math.PI * 2);
            paint(L, dot, css(sh(c, 1.6), 0.9), gray(170), null);
          }
        }
      }
      for (let i = 0; i < 10; i++) {
        const path = crackPath(L.r, L.r() * S, L.r() * S, 20 + L.r() * 30, L.r() * 6.3);
        L.c.strokeStyle = css(sh(c, 0.55), 0.22);
        L.c.lineWidth = 0.7;
        L.c.stroke(path);
      }
    },

    // Самоцветы-камни: малахит — кольца, бирюза — паутина матрицы, нефрит и прочие — мутные пятна и волокна.
    gem: function (L, v, bare, spec) {
      const c = spec.color;
      if (spec.id === 'ladder-malachite') {
        const tones = [0.35, 0.5, 0.68, 0.95, 1.2, 1.45].map(function (k) { return css(sh(c, k)); });
        fillAll(L, tones[1], 128, orm(0.14, 0));
        if (!bare && v === 1) rings(L, S * 0.42, S * 0.58, tones, css(sh(c, 0.2), 0.35));
        else rings(L, S * 1.15, -S * 0.25, tones, css(sh(c, 0.2), 0.35));
        if (!bare && v === 2) {
          const nodule = wobblyCircle(S * 0.7, S * 0.32, S * 0.3, L.r() * 6.3, L.r() * 6.3, 0.08, 0.05);
          L.c.save();
          L.c.clip(nodule);
          rings(L, S * 0.7, S * 0.32, tones, css(sh(c, 0.2), 0.35));
          L.c.restore();
          L.c.strokeStyle = css(sh(c, 0.18), 0.7);
          L.c.lineWidth = 2.5;
          L.c.stroke(nodule);
          groove(L, nodule, 2, 25);
        }
        grain(L, 900, 0.08);
        return;
      }
      fillAll(L, css(c), 128, orm(spec.id === 'ladder-turquoise' ? 0.32 : 0.2, 0));
      for (let i = 0; i < 22; i++) blot(L.c, L.r() * S, L.r() * S, 20 + L.r() * 50, trip(sh(c, L.r() < 0.5 ? 0.78 : 1.22)), 0.35);
      if (spec.id === 'ladder-turquoise') {
        for (let i = 0; i < (bare ? 10 : 22); i++) {
          const path = crackPath(L.r, L.r() * S, L.r() * S, 40 + L.r() * 80, L.r() * 6.3);
          L.c.strokeStyle = 'rgba(74,58,42,' + (0.5 + L.r() * 0.35).toFixed(2) + ')';
          L.c.lineWidth = 1 + L.r() * 2;
          L.c.stroke(path);
          L.h.strokeStyle = gray(90);
          L.h.lineWidth = 2;
          L.h.stroke(path);
        }
      } else {
        for (let i = 0; i < 40; i++) vein(L, L.r() * S, L.r() * S, 30 + L.r() * 60, L.r() * 6.3, 0.7, css(sh(c, 1.35), 0.16), 0.5);
        for (let i = 0; i < 8; i++) blot(L.o, L.r() * S, L.r() * S, 30 + L.r() * 40, '190,51,0', 0.5);
      }
      grain(L, 600, 0.06);
    },

    // Кристаллы: зёрна разного тона и наклона (ячейки Вороного), светлые рёбра, искры.
    // ORM.R — глубина зерна: по ней шейдер (MB_GEM) светлит толщу при взгляде в лоб.
    crystal: function (L, v, bare, spec) {
      const c = spec.color;
      const tones = [0.68, 0.82, 0.95, 1.1, 1.25].map(function (k) { return rgbOf(sh(c, k)); });
      const rim = rgbOf(sh(c, 1.65));
      const n = bare ? 14 : [20, 30, 12][v];
      const seeds = [];
      for (let i = 0; i < n; i++) {
        const a = L.r() * Math.PI * 2;
        seeds.push({ x: L.r() * S, y: L.r() * S, t: tones[Math.floor(L.r() * tones.length)], gx: Math.cos(a), gy: Math.sin(a), k: 0.3 + L.r() * 0.5, depth: 0.4 + L.r() * 0.6 });
      }
      voronoi(L, seeds, function (s, d1, d2, x, y, p, col, hgt, srf) {
        const along = ((x - s.x) * s.gx + (y - s.y) * s.gy) / 60;
        const gap = d2 - d1;
        const edge = gap < 1.8;
        const shade = 1 + along * s.k * 0.5;
        for (let ch = 0; ch < 3; ch++) {
          const base = Math.min(255, s.t[ch] * shade);
          col[p + ch] = edge ? base * 0.45 + rim[ch] * 0.55 : base;
        }
        const h = edge ? 70 : Math.max(60, Math.min(200, 128 + along * 40 * s.k));
        hgt[p] = hgt[p + 1] = hgt[p + 2] = h;
        srf[p] = Math.min(1, gap / 28) * s.depth * 255;
        srf[p + 1] = edge ? 90 : 38;
        srf[p + 2] = 20;
      });
      sparkles(L, 16, css(sh(c, 1.85), 0.85));
      if (spec.id === 'ladder-star-sapphire' && !bare) rays(L, S / 2, S / 2, 3, 110, 2.2, 'rgba(255,255,255,0.5)', 1.6);
      if (spec.id === 'ladder-moonstone') blot(L.c, S * 0.45, S * 0.4, 90, '200,225,255', 0.45);
    },

    // Обсидиан, оникс и тёмная материя: стеклянный излом дугами блеска, у оникса — полосы, в глубине — цветные отсветы.
    obsidian: function (L, v, bare, spec) {
      const c = spec.color;
      fillAll(L, css(c), 128, orm(0.1, 0.35));
      if (spec.id === 'ladder-onyx') {
        for (let y = -8; y < S; ) {
          const h = 3 + L.r() * 10;
          band(L, y, h, L.r() < 0.4 ? 'rgba(233,228,218,0.75)' : css(sh(c, 0.8 + L.r() * 0.6), 0.8), null);
          y += h + 3 + L.r() * 14;
        }
      }
      const centers = bare ? 1 : [2, 3, 1][v];
      for (let i = 0; i < centers; i++) {
        const cx = L.r() * S;
        const cy = L.r() * S;
        for (let k = 1; k < 9; k++) {
          const path = new Path2D();
          const r = k * (10 + L.r() * 6);
          const a0 = L.r() * 6.3;
          path.arc(cx, cy, r, a0, a0 + 1.6 + L.r() * 1.8);
          L.c.strokeStyle = css(sh(c, 2.2), (0.08 + 0.12 * L.r()).toFixed(3));
          L.c.lineWidth = 1.2;
          L.c.stroke(path);
          L.h.strokeStyle = gray(k % 2 ? 140 : 116);
          L.h.lineWidth = 3;
          L.h.stroke(path);
        }
      }
      const glow = OBSIDIAN_GLOW[spec.id];
      if (glow) for (let i = 0; i < 6; i++) blot(L.c, L.r() * S, L.r() * S, 30 + L.r() * 50, trip(glow), 0.22);
      if (spec.id === 'ladder-neutronium' || spec.id === 'ladder-dark-matter') sparkles(L, 30, 'rgba(220,230,255,0.85)');
      grain(L, 600, 0.05);
    },

    // Алмаз: огранка — веер граней вокруг площадки (0 — 8, 1 — 12) или сетка ромбов (2 и без рисунка); рёбра светлые.
    diamond: function (L, v, bare, spec) {
      const c = spec.color;
      const dark = lum(c) < 0.3;
      fillAll(L, css(c), 128, orm(0.06, 0.15));
      const edge = dark ? 'rgba(230,240,255,0.85)' : css(sh(c, 1.85), 0.95);
      const facet = function (points) {
        const path = new Path2D();
        path.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) path.lineTo(points[i][0], points[i][1]);
        path.closePath();
        const tone = L.r() < 0.25 ? mix(sh(c, 0.75), 0x9ec8ff, 0.25) : sh(c, 0.68 + L.r() * 0.7);
        paint(L, path, css(tone), gray(100 + Math.floor(L.r() * 60)), 'rgb(' + Math.floor(150 + L.r() * 100) + ',15,38)');
        L.c.strokeStyle = edge;
        L.c.lineWidth = 1;
        L.c.stroke(path);
      };
      const m = S / 2;
      if (bare || v === 2) {
        const step = S / 3;
        for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 3; x++) {
            const cx = x * step + step / 2;
            const cy = y * step + step / 2;
            facet([[cx, cy - step / 2], [cx + step / 2, cy], [cx, cy]]);
            facet([[cx + step / 2, cy], [cx, cy + step / 2], [cx, cy]]);
            facet([[cx, cy + step / 2], [cx - step / 2, cy], [cx, cy]]);
            facet([[cx - step / 2, cy], [cx, cy - step / 2], [cx, cy]]);
          }
        }
      } else {
        const n = v === 0 ? 8 : 12;
        const inner = [];
        const outer = [];
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + Math.PI / n;
          inner.push([m + Math.cos(a) * 46, m + Math.sin(a) * 46]);
          outer.push([m + Math.cos(a) * S * 0.75, m + Math.sin(a) * S * 0.75]);
        }
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          facet([inner[i], outer[i], outer[j]]);
          facet([inner[i], inner[j], outer[j]]);
        }
        facet(inner);
      }
      sparkles(L, 12, 'rgba(255,255,255,0.95)');
    },

    // Лазурит: глубокий синий, светлые прожилки кальцита и металлические искры пирита.
    lapis: function (L, v, bare, spec) {
      const c = spec.color;
      fillAll(L, css(c), 128, orm(0.3, 0));
      for (let i = 0; i < 18; i++) blot(L.c, L.r() * S, L.r() * S, 20 + L.r() * 50, trip(sh(c, L.r() < 0.5 ? 0.7 : 1.22)), 0.35);
      for (let i = 0; i < (bare ? 1 : 3); i++) vein(L, -10, L.r() * S, S * 1.3, (L.r() - 0.5) * 0.8, 2 + L.r() * 3, 'rgba(232,238,244,0.45)', 1.5);
      for (let i = 0; i < 70; i++) {
        const x = L.r() * S;
        const y = L.r() * S;
        const s = 1 + L.r() * 2.5;
        L.c.fillStyle = L.r() < 0.5 ? '#f5d76e' : '#d9b443';
        L.c.fillRect(x, y, s, s);
        L.o.fillStyle = orm(0.25, 1);
        L.o.fillRect(x, y, s, s);
        L.h.fillStyle = gray(170);
        L.h.fillRect(x, y, s, s);
      }
      grain(L, 900, 0.08);
    },

    // Янтарь: светлое сердце, натёки смолы, пузырьки; 1 — мушка внутри, 2 — листик.
    amber: function (L, v, bare, spec) {
      const c = spec.color;
      const g = L.c.createRadialGradient(S * 0.45, S * 0.45, 8, S / 2, S / 2, S * 0.75);
      g.addColorStop(0, css(sh(c, 1.35)));
      g.addColorStop(1, css(sh(c, 0.62)));
      fillAll(L, g, 128, orm(0.14, 0));
      for (let i = 0; i < 8; i++) vein(L, -10, L.r() * S, S * 1.3, (L.r() - 0.5) * 0.4, 6 + L.r() * 10, css(sh(c, L.r() < 0.5 ? 0.8 : 1.2), 0.2), 4);
      for (let i = 0; i < 16; i++) {
        const x = L.r() * S;
        const y = L.r() * S;
        const r = 1.5 + L.r() * 2.5;
        L.c.strokeStyle = 'rgba(255,240,200,0.6)';
        L.c.lineWidth = 1;
        L.c.beginPath();
        L.c.arc(x, y, r, 0, Math.PI * 2);
        L.c.stroke();
        L.c.fillStyle = 'rgba(255,255,255,0.7)';
        L.c.fillRect(x - r * 0.5, y - r * 0.5, 1, 1);
      }
      if (!bare && v === 1) {
        const x = S * (0.35 + L.r() * 0.3);
        const y = S * (0.35 + L.r() * 0.3);
        L.c.strokeStyle = css(sh(c, 0.25), 0.7);
        L.c.lineWidth = 1;
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + 0.3;
          L.c.beginPath();
          L.c.moveTo(x, y);
          L.c.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 9);
          L.c.stroke();
        }
        const body = new Path2D();
        body.ellipse(x, y, 7, 4, 0.4, 0, Math.PI * 2);
        L.c.fillStyle = css(sh(c, 0.22), 0.85);
        L.c.fill(body);
      } else if (!bare && v === 2) {
        const leaf = new Path2D();
        leaf.ellipse(S * 0.55, S * 0.5, 34, 12, -0.6, 0, Math.PI * 2);
        L.c.fillStyle = css(sh(mix(c, 0x3a4a1a, 0.6), 0.6), 0.55);
        L.c.fill(leaf);
        L.c.strokeStyle = css(sh(c, 0.3), 0.5);
        L.c.lineWidth = 1;
        L.c.stroke(line(S * 0.55 - 28, S * 0.5 + 19, S * 0.55 + 28, S * 0.5 - 19));
      }
      blot(L.o, S / 2, S / 2, 110, '230,36,0', 0.6);
    },

    // Опал, перламутр, лабрадорит: игра цвета мозаикой, перламутровые волны или синие всполохи по тёмному.
    opal: function (L, v, bare, spec) {
      const c = spec.color;
      fillAll(L, css(c), 128, orm(0.12, 0.05));
      if (spec.id === 'ladder-pearl') {
        const tints = ['255,200,220', '200,255,230', '215,205,255', '255,240,200'];
        for (let y = -10; y < S + 10; y += 8 + L.r() * 10) band(L, y, 6 + L.r() * 8, 'rgba(' + tints[Math.floor(L.r() * tints.length)] + ',0.2)', null);
        for (let i = 0; i < 8; i++) blot(L.c, L.r() * S, L.r() * S, 40 + L.r() * 50, '255,255,255', 0.25);
      } else if (spec.id === 'ladder-labradorite') {
        for (let i = 0; i < 14; i++) blot(L.c, L.r() * S, L.r() * S, 20 + L.r() * 50, trip(sh(c, L.r() < 0.5 ? 0.7 : 1.15)), 0.4);
        const flash = ['60,140,255', '47,208,192', '224,176,64'];
        for (let i = 0; i < 9; i++) blot(L.c, L.r() * S, L.r() * S, 30 + L.r() * 50, flash[i % flash.length], 0.45);
        for (let i = 0; i < 16; i++) {
          const x = L.r() * S;
          L.c.strokeStyle = css(sh(c, 0.5), 0.35);
          L.c.lineWidth = 1 + L.r() * 2;
          L.c.stroke(line(x, 0, x + (L.r() - 0.5) * 60, S));
        }
      } else {
        const fire = [0xff8ac8, 0x7cf0c0, 0x7cb4ff, 0xc890ff, 0xffd890];
        const n = bare ? 30 : [40, 60, 24][v];
        const seeds = [];
        for (let i = 0; i < n; i++) seeds.push({ x: L.r() * S, y: L.r() * S, t: rgbOf(mix(c, fire[Math.floor(L.r() * fire.length)], 0.3 + L.r() * 0.35)) });
        voronoi(L, seeds, function (s, d1, d2, x, y, p, col, hgt, srf) {
          const fade = Math.min(1, (d2 - d1) / 6);
          const base = rgbOf(c);
          for (let ch = 0; ch < 3; ch++) col[p + ch] = base[ch] + (s.t[ch] - base[ch]) * fade;
          hgt[p] = hgt[p + 1] = hgt[p + 2] = 128;
          srf[p] = 160;
          srf[p + 1] = 30;
          srf[p + 2] = 12;
        });
      }
      grain(L, 500, 0.05);
    },

    // Сердце магмы: плиты остывшей корки, между ними светящиеся трещины (светятся через emissiveMap = map).
    magma: function (L, v, bare, spec) {
      const c = spec.color;
      const hot = rgbOf(0xffd070);
      const glow = rgbOf(c);
      const n = bare ? 14 : [18, 26, 12][v];
      const seeds = [];
      for (let i = 0; i < n; i++) seeds.push({ x: L.r() * S, y: L.r() * S, t: rgbOf(sh(0x2a1410, 0.7 + L.r() * 0.6)) });
      voronoi(L, seeds, function (s, d1, d2, x, y, p, col, hgt, srf) {
        const gap = d2 - d1;
        const heat = gap < 5 ? 1 - gap / 5 : 0;
        const inner = Math.min(1, d1 / 70);
        for (let ch = 0; ch < 3; ch++) {
          const crust = s.t[ch] * (1.15 - 0.4 * inner);
          const fire = glow[ch] + (hot[ch] - glow[ch]) * heat * heat;
          col[p + ch] = crust + (fire - crust) * Math.min(1, heat * 1.6);
        }
        const h = heat > 0 ? 60 : 150 + 30 * (1 - inner);
        hgt[p] = hgt[p + 1] = hgt[p + 2] = h;
        srf[p] = 0;
        srf[p + 1] = heat > 0 ? 120 : 210;
        srf[p + 2] = 0;
      });
    },

    // Звёздное ядро: яркий центр, лучи и искры; без рисунка — звёздное поле с туманностью, 2 — спиральные рукава.
    cosmic: function (L, v, bare, spec) {
      const c = spec.color;
      const core = L.c.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S * 0.7);
      core.addColorStop(0, '#ffffff');
      core.addColorStop(0.1, css(sh(c, 1.2)));
      core.addColorStop(0.4, css(sh(c, 0.85)));
      core.addColorStop(1, css(sh(mix(c, 0x40206a, 0.6), 0.6)));
      fillAll(L, core, 128, orm(0.15, 0.2));
      if (bare) {
        for (let i = 0; i < 6; i++) blot(L.c, L.r() * S, L.r() * S, 40 + L.r() * 50, L.r() < 0.5 ? '150,110,255' : '110,170,255', 0.25);
        sparkles(L, 60, 'rgba(255,255,255,0.9)');
        return;
      }
      if (v === 2) {
        for (let arm = 0; arm < 3; arm++) {
          const path = new Path2D();
          for (let t = 0; t < 60; t++) {
            const a = arm * 2.09 + t * 0.09;
            const r = t * 2;
            const x = S / 2 + Math.cos(a) * r;
            const y = S / 2 + Math.sin(a) * r;
            if (t === 0) path.moveTo(x, y);
            else path.lineTo(x, y);
          }
          L.c.save();
          L.c.filter = 'blur(3px)';
          L.c.strokeStyle = 'rgba(255,255,255,0.4)';
          L.c.lineWidth = 6;
          L.c.stroke(path);
          L.c.restore();
        }
      } else {
        rays(L, S / 2, S / 2, v === 0 ? 4 : 6, 120, 2.5, 'rgba(255,255,255,0.55)', 2);
      }
      sparkles(L, 24, 'rgba(255,255,255,0.9)');
    },

    // Стекло окон в штабеле: голубой тон с косыми отсветами.
    glass: function (L, v, bare, spec) {
      const c = spec.color;
      const g = L.c.createLinearGradient(0, 0, S, S);
      g.addColorStop(0, css(sh(c, 1.25)));
      g.addColorStop(1, css(sh(c, 0.85)));
      fillAll(L, g, 128, orm(0.05, 0.1));
      L.c.save();
      L.c.globalAlpha = 0.3;
      L.c.fillStyle = '#ffffff';
      L.c.beginPath();
      L.c.moveTo(S * 0.15, 0);
      L.c.lineTo(S * 0.4, 0);
      L.c.lineTo(S * 0.05, S);
      L.c.lineTo(-S * 0.2, S);
      L.c.closePath();
      L.c.fill();
      L.c.globalAlpha = 0.18;
      L.c.fillRect(S * 0.55, 0, S * 0.08, S);
      L.c.restore();
      edgeLight(L, '255,255,255', 0.4);
    },
  };

  // Сила рельефа (bumpScale) по манере.
  const BUMP = {
    stone: 1.5, sand: 1, concrete: 0.8, wood: 1.1, brick: 1.6, marble: 0.35, tile: 1, gem: 0.4, crystal: 1.2, obsidian: 0.5,
    diamond: 0.8, lapis: 0.5, amber: 0.3, opal: 0.3, magma: 1.6, cosmic: 0.4, glass: 0.2,
    tin: 1, copper: 1.4, bronze: 1.4, silver: 0.8, iron: 1.6, gold: 1.5, lead: 1.3,
  };
  // Шероховатость и металл ровных кубов без текстуры (заливка, ноша): по виду материала.
  const FINISH = {
    stone: [0.9, 0], sand: [0.9, 0], concrete: [0.85, 0], wood: [0.75, 0], brick: [0.86, 0], metal: [0.35, 0.9], platinum: [0.2, 0.95],
    marble: [0.2, 0], tile: [0.2, 0], gem: [0.25, 0], crystal: [0.15, 0.1], obsidian: [0.12, 0.4], diamond: [0.06, 0.15],
    lapis: [0.3, 0.1], amber: [0.18, 0], opal: [0.14, 0.05], magma: [0.7, 0], cosmic: [0.15, 0.2], glass: [0.06, 0.1],
  };
  // Светятся сами (emissiveMap = map): трещины магмы и ядро звезды, а не весь куб ровным тоном.
  const SELF_LIT = { magma: true, cosmic: true };
  // Камнеподобный блеск с глубиной (MB_GEM) у прозрачных и полупрозрачных.
  const GEM = { crystal: true, diamond: true, amber: true, opal: true, gem: true };

  let env = null;

  function specOf(id) {
    const all = window.MicroBuilders && window.MicroBuilders.MATERIAL;
    return (all && all[id]) || { id: id, color: 0x9a947f, look: 'stone' };
  }

  // Манера рисунка: для металлов — своя из семи, иначе вид материала.
  function styleOf(spec) {
    return spec.look === 'metal' || spec.look === 'platinum' ? metalStyle(spec) : PAINT[spec.look] ? spec.look : 'stone';
  }

  function seedOf(id) {
    let h = 7;
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193) >>> 0;
    return h % 100000;
  }

  // Атлас 2S×S: слева грань с рисунком (эмблема, слитки, клёпки), справа та же фактура без него.
  // Половину выбирает шейдер по маске look().mask; без маски (ноша, штабели, город) — всегда левая.
  // small — вдвое мельче (город, штабели, техника): меньше памяти, а издали разницы нет.
  function textures(id, variant, small) {
    const name = id + ':' + variant + (small ? ':s' : '');
    let set = cache.get(name);
    if (set) return set;
    const spec = specOf(id);
    const seed = seedOf(id) * 13 + 17 * variant + 7;
    const A = layers(seed);
    const B = layers(seed + 500);
    const painter = PAINT[spec.look] || PAINT.stone;
    painter(A, variant, false, spec);
    painter(B, variant, true, spec);
    const k = small ? 0.5 : 1;
    const atlas = function (a, b) {
      const canvas = document.createElement('canvas');
      canvas.width = S * 2 * k;
      canvas.height = S * k;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(a.canvas, 0, 0, S * k, S * k);
      ctx.drawImage(b.canvas, S * k, 0, S * k, S * k);
      const texture = new THREE.CanvasTexture(canvas);
      texture.userData.shared = true;
      return texture;
    };
    const map = atlas(A.c, B.c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    set = { map: map, bump: atlas(A.h, B.h), orm: atlas(A.o, B.o), id: id, small: !!small };
    cache.set(name, set);
    return set;
  }

  // Оставить в кэше крупные фактуры только этих материалов (смена стройки): остальные освобождают видеопамять
  // и canvas. Мелкие (small) остаются: на них ссылаются материалы штабелей, ноши и города, а весят они вчетверо меньше.
  function keep(ids) {
    const wanted = new Set(ids);
    const dropped = new Set();
    cache.forEach(function (set, name) {
      if (set.small || wanted.has(set.id)) return;
      set.map.dispose();
      set.bump.dispose();
      set.orm.dispose();
      cache.delete(name);
      dropped.add(set.id);
    });
    return Array.from(dropped);
  }

  // Общие uniform всех блоков: волна блеска (полоса, ширина, сила) и рамка здания по XZ, чтобы не блестела руда рудников.
  const GLINT = { value: new THREE.Vector4(0, 1, 0, 0) };
  const GLINT_BOX = { value: new THREE.Vector4(0, 0, 0, 0) };
  // Погода на зданиях (game.js updateSky пишет сюда то же, что земле): snow — снежный покров 0…1, wet — мокрость 0…1.
  const WEATHER = { snow: { value: 0 }, wet: { value: 0 } };

  // Затенение в стыках: у каждого блока маска занятых клеток вокруг (game.js refreshBlockAo), x — 12 диагоналей рёбер
  // (биты 0–11) и 8 углов (12–19), y — 6 соседей по граням. Грань темнеет к ребру, за которым стоит сосед (ниша),
  // шов с соседом в той же плоскости — узкая тёмная щель, внешнее ребро почти не темнеет — как кладка на референсе.
  // Только у здания (define MB_NB, material(id, variant, true)): без атрибута WebGL читает общее значение по умолчанию,
  // и поддоны с машинами потемнели бы случайно. В WebGL 2 маска идёт flat: интерполяция 2^20 может уйти на ±0,4.
  // z — маска вида блока look().mask (атрибут mbLook).
  const NB_VARYING = '#ifdef MB_NB\n#if __VERSION__ >= 300\nflat varying vec3 vMbNb;\n#else\nvarying vec3 vMbNb;\n#endif\n#endif\n';
  const OCCLUSION = [
    'float mbBit( vec3 d ) {',
    '  if ( d.x != 0.0 && d.y != 0.0 && d.z != 0.0 ) return 12.0 + step( 0.0, d.x ) * 4.0 + step( 0.0, d.y ) * 2.0 + step( 0.0, d.z );',
    '  if ( d.z == 0.0 ) return step( 0.0, d.x ) * 2.0 + step( 0.0, d.y );',
    '  if ( d.y == 0.0 ) return 4.0 + step( 0.0, d.x ) * 2.0 + step( 0.0, d.z );',
    '  return 8.0 + step( 0.0, d.y ) * 2.0 + step( 0.0, d.z );',
    '}',
    'float mbHas( float nb, vec3 d ) { return mod( floor( ( nb + 0.5 ) / exp2( mbBit( d ) ) ), 2.0 ); }',
    'float mbSide( float nb, vec3 d ) {',
    '  float bit = d.x != 0.0 ? ( d.x > 0.0 ? 0.0 : 1.0 ) : d.y != 0.0 ? ( d.y > 0.0 ? 2.0 : 3.0 ) : ( d.z > 0.0 ? 4.0 : 5.0 );',
    '  return mod( floor( ( nb + 0.5 ) / exp2( bit ) ), 2.0 );',
    '}',
    // Узкая щель: швы прямые (shade(), mbSq), широкое затемнение снова читалось бы кубиками.
    'float mbEdgeFall( float dist ) { return 1.0 - smoothstep( 0.008, 0.06, dist ); }',
    'float mbFall( float dist ) { float f = 1.0 - smoothstep( 0.0, 0.5, dist ); return f * sqrt( f ); }',
    // x — ниша (непрямой свет), y — щели и рёбра (весь свет).
    'vec2 mbOcclusion( vec2 nb, vec3 face, vec3 o ) {',
    '  vec3 a = abs( face );',
    '  vec3 n = a.x > a.y && a.x > a.z ? vec3( sign( face.x ), 0.0, 0.0 ) : a.y > a.z ? vec3( 0.0, sign( face.y ), 0.0 ) : vec3( 0.0, 0.0, sign( face.z ) );',
    '  vec3 t1 = n.x != 0.0 ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );',
    '  vec3 t2 = n.z != 0.0 ? vec3( 0.0, 1.0, 0.0 ) : vec3( 0.0, 0.0, 1.0 );',
    '  float o1 = dot( o, t1 );',
    '  float o2 = dot( o, t2 );',
    '  vec3 s1 = t1 * ( o1 < 0.0 ? -1.0 : 1.0 );',
    '  vec3 s2 = t2 * ( o2 < 0.0 ? -1.0 : 1.0 );',
    '  float f1 = mbFall( 0.5 - abs( o1 ) );',
    '  float f2 = mbFall( 0.5 - abs( o2 ) );',
    '  float h1 = mbHas( nb.x, n + s1 );',
    '  float h2 = mbHas( nb.x, n + s2 );',
    '  float hc = mbHas( nb.x, n + s1 + s2 ) * ( 1.0 - h1 ) * ( 1.0 - h2 );',
    '  float d = 1.0 - ( 1.0 - h1 * f1 ) * ( 1.0 - h2 * f2 ) * ( 1.0 - hc * f1 * f2 );',
    '  float e1 = mbEdgeFall( 0.5 - abs( o1 ) );',
    '  float e2 = mbEdgeFall( 0.5 - abs( o2 ) );',
    '  float k1 = ( 1.0 - h1 ) * mix( 0.14, 0.7, mbSide( nb.y, s1 ) );',
    '  float k2 = ( 1.0 - h2 ) * mix( 0.14, 0.7, mbSide( nb.y, s2 ) );',
    '  return vec2( 1.0 - 0.72 * d, ( 1.0 - k1 * e1 * e1 ) * ( 1.0 - k2 * e2 * e2 ) );',
    '}',
    '',
  ].join('\n');

  // real: шум значений 3D (mbNoise) — пятна тона, пыль и сколы уложенных блоков; им же пачкается техника в art/vehicles.js.
  const NOISE = [
    'float mbHash( vec3 p ) { p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }',
    'float mbNoise( vec3 x ) {',
    '  vec3 i = floor( x );',
    '  vec3 f = fract( x );',
    '  f = f * f * ( 3.0 - 2.0 * f );',
    '  return mix( mix( mix( mbHash( i ), mbHash( i + vec3( 1.0, 0.0, 0.0 ) ), f.x ), mix( mbHash( i + vec3( 0.0, 1.0, 0.0 ) ), mbHash( i + vec3( 1.0, 1.0, 0.0 ) ), f.x ), f.y ),',
    '    mix( mix( mbHash( i + vec3( 0.0, 0.0, 1.0 ) ), mbHash( i + vec3( 1.0, 0.0, 1.0 ) ), f.x ), mix( mbHash( i + vec3( 0.0, 1.0, 1.0 ) ), mbHash( i + vec3( 1.0, 1.0, 1.0 ) ), f.x ), f.y ), f.z );',
    '}',
  ].join('\n');
  const DUST = '#ifdef MB_NB\n' + NOISE + '\n#endif\n';

  // Снег шапками на гранях, смотрящих вверх (пятнами по шуму, как на земле: покров растёт — пятна сливаются),
  // дождь — темнее и глянцевее, сверху сильнее. p — точка мира, n — нормаль в мире. x — снег, y — мокрость.
  const WEATHER_GLSL = [
    'uniform float mbSnow;',
    'uniform float mbWet;',
    'vec2 mbWeather( vec3 p, vec3 n ) {',
    '  float up = smoothstep( 0.55, 0.85, n.y );',
    '  float k = mbNoise( p * 2.3 ) * 0.55 + mbNoise( p * 6.1 + 4.0 ) * 0.3 + 0.08;',
    '  float s = up * smoothstep( k - 0.06, k + 0.06, mbSnow * 1.25 - 0.1 );',
    '  return vec2( s, mbWet * ( 1.0 - s ) * ( 0.6 + 0.4 * up ) );',
    '}',
    // Снег белый и матовый, рельеф фактуры под ним сглажен; мокрое темнее и блестит.
    'void mbWeatherApply( vec2 w, vec3 geo, inout vec3 color, inout float rough, inout float metal, inout vec3 nrm ) {',
    '  color = mix( color * ( 1.0 - 0.3 * w.y ), vec3( 0.9, 0.93, 0.97 ), w.x );',
    '  rough = mix( mix( rough, 0.22, w.y ), 0.85, w.x );',
    '  metal *= 1.0 - w.x;',
    '  nrm = normalize( mix( nrm, geo, w.x ) );',
    '}',
    '',
  ].join('\n');

  // Затенение у рёбер (щели между блоками темнее) и волна блеска на финале. Рёбра — по атрибуту mbEdge
  // из geometry(): у прочих геометрий (детали окон, арок) его нет, WebGL подставляет 0 и затенения нет.
  // Атлас (textures()): u сжат в половину; без маски вида — всегда левая половина с рисунком.
  // MB_NB (здание): голая/с рисунком половина по грани, прямой шов у соседа, пыль, потёки, сколы углов.
  function shade(shader) {
    shader.uniforms.mbGlint = GLINT;
    shader.uniforms.mbGlintBox = GLINT_BOX;
    shader.uniforms.mbSnow = WEATHER.snow;
    shader.uniforms.mbWet = WEATHER.wet;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 mbEdge;\nattribute vec3 mbFace;\n#ifdef MB_NB\nattribute vec2 mbNb;\nattribute float mbLook;\nattribute vec3 mbSq;\n#endif\nvarying vec3 vMbEdge;\nvarying vec3 vMbWorld;\nvarying vec3 vMbFace;\nvarying vec3 vMbOff;\n' + NB_VARYING + '#ifdef MB_NB\n' + OCCLUSION + '#endif\n' +
        'float mbAtlas( float u, float bare, float mir ) { u = clamp( u, 0.002, 0.998 ); return ( mix( u, 1.0 - u, mir ) + bare ) * 0.5; }\n')
      .replace('#include <uv_vertex>', [
        '#include <uv_vertex>',
        'float mbBare = 0.0;',
        'float mbMir = 0.0;',
        '#ifdef MB_NB',
        'vec3 mbA = abs( mbFace );',
        'float mbFi = mbA.x > 0.5 ? 0.5 - 0.5 * mbFace.x : mbA.y > 0.5 ? 2.5 - 0.5 * mbFace.y : 4.5 - 0.5 * mbFace.z;',
        'mbBare = 1.0 - mod( floor( ( mbLook + 0.5 ) / exp2( mbFi ) ), 2.0 );',
        'mbMir = mbBare * mod( floor( ( mbLook + 0.5 ) / 64.0 ), 2.0 );',
        '#endif',
        '#ifdef USE_MAP',
        'vMapUv.x = mbAtlas( vMapUv.x, mbBare, mbMir );',
        '#endif',
        '#ifdef USE_BUMPMAP',
        'vBumpMapUv.x = mbAtlas( vBumpMapUv.x, mbBare, mbMir );',
        '#endif',
        '#ifdef USE_ROUGHNESSMAP',
        'vRoughnessMapUv.x = mbAtlas( vRoughnessMapUv.x, mbBare, mbMir );',
        '#endif',
        '#ifdef USE_METALNESSMAP',
        'vMetalnessMapUv.x = mbAtlas( vMetalnessMapUv.x, mbBare, mbMir );',
        '#endif',
        '#ifdef USE_EMISSIVEMAP',
        'vEmissiveMapUv.x = mbAtlas( vEmissiveMapUv.x, mbBare, mbMir );',
        '#endif',
      ].join('\n'))
      .replace('#include <beginnormal_vertex>', [
        '#include <beginnormal_vertex>',
        'vec3 mbP = position;',
        '#ifdef MB_NB',
        // Ребро к соседу (или ребро закрытой грани) — прямое до края клетки: стык читается плотной кладкой, а не
        // желобом между двумя скруглёнными кубиками. Скругление по остальным осям сохраняется (m осей вместо k).
        'vec3 mbG = abs( mbSq );',
        'float mbHh = max( mbG.x, max( mbG.y, mbG.z ) );',
        'vec3 mbRim = step( mbHh - 1e-4, mbG );',
        'float mbK = mbRim.x + mbRim.y + mbRim.z;',
        'if ( mbK > 1.5 ) {',
        '  mat3 mbR = mat3( 1.0 );',
        '  #ifdef USE_INSTANCING',
        '  mbR = mat3( instanceMatrix ) / max( length( instanceMatrix[ 0 ].xyz ), 1e-6 );',
        '  #endif',
        '  vec3 mbS = sign( mbSq );',
        '  vec3 mbF = abs( mbFace );',
        '  float mbOwn = mbSide( mbNb.y, floor( mbR * ( mbS * mbF ) + 0.5 ) );',
        '  vec3 mbQ = vec3( 0.0 );',
        '  if ( mbRim.x * ( 1.0 - mbF.x ) > 0.5 ) mbQ.x = max( mbOwn, mbSide( mbNb.y, floor( mbR * vec3( mbS.x, 0.0, 0.0 ) + 0.5 ) ) );',
        '  if ( mbRim.y * ( 1.0 - mbF.y ) > 0.5 ) mbQ.y = max( mbOwn, mbSide( mbNb.y, floor( mbR * vec3( 0.0, mbS.y, 0.0 ) + 0.5 ) ) );',
        '  if ( mbRim.z * ( 1.0 - mbF.z ) > 0.5 ) mbQ.z = max( mbOwn, mbSide( mbNb.y, floor( mbR * vec3( 0.0, 0.0, mbS.z ) + 0.5 ) ) );',
        '  float mbMm = mbK - ( mbQ.x + mbQ.y + mbQ.z );',
        '  float mbB = ( mbHh - abs( dot( position, mbFace ) ) ) / ( 1.0 - inversesqrt( mbK ) );',
        '  vec3 mbT = vec3( mbHh - mbB + mbB * inversesqrt( mbMm ) );',
        '  mbP = mix( position, mbS * mix( mbT, vec3( mbHh ), mbQ ), mbRim );',
        '  objectNormal = normalize( mbS * mbRim * ( 1.0 - mbQ ) );',
        '}',
        '#endif',
      ].join('\n'))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = mbP;')
      .replace('#include <worldpos_vertex>', [
        '#include <worldpos_vertex>',
        'vMbEdge = mbEdge;',
        'vec4 mbW = vec4( transformed, 1.0 );',
        'vMbFace = mbFace;',
        'vMbOff = transformed;',
        '#ifdef USE_INSTANCING',
        'mbW = instanceMatrix * mbW;',
        'mat3 mbM = mat3( instanceMatrix );',
        'vMbFace = mbM * mbFace;',
        'vMbOff = mbM * transformed / max( length( mbM[ 0 ] ), 1e-4 );',
        '#endif',
        '#ifdef MB_NB',
        'vMbNb = vec3( mbNb, mbLook );',
        '#endif',
        'vMbWorld = ( modelMatrix * mbW ).xyz;',
      ].join('\n'));
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec4 mbGlint;\nuniform vec4 mbGlintBox;\nvarying vec3 vMbEdge;\nvarying vec3 vMbWorld;\nvarying vec3 vMbFace;\nvarying vec3 vMbOff;\n' + NB_VARYING + OCCLUSION + '#ifndef MB_NB\n' + NOISE + '\n#endif\n' + DUST + WEATHER_GLSL)
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        'vec2 mbOcc = vec2( 1.0, -1.0 );',
        'float mbPat = 0.0;',
        '#ifdef MB_NB',
        'vec3 mbNbI = floor( vMbNb + 0.5 );',
        'mbOcc = mbOcclusion( mbNbI.xy, vMbFace, vMbOff );',
        'vec3 mbFn = vMbFace / max( length( vMbFace ), 1e-4 );',
        'float mbTop = step( 0.7, mbFn.y );',
        'float mbWall = 1.0 - step( 0.5, abs( mbFn.y ) );',
        // Пыль: полоса земли на нижних 1–2 рядах (рваная по высоте), пятна и забитые швы на верхних гранях.
        'float mbGround = 1.0 - smoothstep( 0.0, 1.4 + 0.6 * mbNoise( vMbWorld * vec3( 1.1, 0.0, 1.1 ) ), vMbWorld.y );',
        'float mbDust = clamp( mbGround * mbGround * 0.32 * ( 0.45 + mbNoise( vMbWorld * 1.7 ) ) + mbTop * ( 0.1 * smoothstep( 0.35, 0.8, mbNoise( vMbWorld * 0.9 + 5.0 ) ) + 0.2 * ( 1.0 - mbOcc.y ) ), 0.0, 0.42 );',
        // Потёки вниз от верхнего края у открытого сверху блока; под соседом — слабые сплошные полосы.
        'float mbAlong = dot( vMbWorld.xz, abs( mbFn.zx ) );',
        'float mbStreak = mbWall * smoothstep( 0.58, 0.9, mbNoise( vec3( mbAlong * 9.0, vMbWorld.y * 0.7, dot( mbFn, vec3( 3.0, 0.0, 7.0 ) ) ) ) ) * mix( smoothstep( -0.5, 0.45, vMbOff.y ), 0.4, mbSide( mbNbI.y, vec3( 0.0, 1.0, 0.0 ) ) );',
        'vec2 mbEe = min( vMbEdge.xy, 1.0 - vMbEdge.xy );',
        'float mbChip = vMbEdge.z * ( 1.0 - smoothstep( 0.015, 0.06, min( mbEe.x, mbEe.y ) ) ) * step( 0.6, mbNoise( vMbWorld * 9.0 ) );',
        // Скол угла: биты 7–14 маски, рваная граница скола.
        'float mbCi = step( 0.0, vMbOff.x ) * 4.0 + step( 0.0, vMbOff.y ) * 2.0 + step( 0.0, vMbOff.z );',
        'float mbCorner = mod( floor( ( mbNbI.z + 0.5 ) / exp2( 7.0 + mbCi ) ), 2.0 ) * step( 1.3 - 0.05 * mbNoise( vMbWorld * 16.0 ), abs( vMbOff.x ) + abs( vMbOff.y ) + abs( vMbOff.z ) );',
        'diffuseColor.rgb *= ( 0.93 + 0.14 * mbNoise( vMbWorld * 0.45 + 3.1 ) ) * ( 1.0 + 0.22 * mbChip + 0.3 * mbCorner ) * ( 1.0 - 0.28 * mbStreak );',
        '#ifdef MB_PATINA',
        // Патина копится в стыках, нишах и по рёбрам; на верхних гранях слабее — пол не рябит пятнами.
        'float mbPn = mbNoise( vMbWorld * 3.3 + 1.7 );',
        'mbPat = clamp( max( 1.0 - smoothstep( 0.0, 0.04 + 0.12 * mbPn, min( mbEe.x, mbEe.y ) ), ( 1.0 - mbOcc.x ) * 1.4 ) * smoothstep( 0.3, 0.6, mbNoise( vMbWorld * 7.0 ) ) * ( 1.0 - 0.6 * mbTop ), 0.0, 1.0 );',
        'diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.1, 0.33, 0.25 ), 0.75 * mbPat );',
        '#endif',
        'diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.45, 0.33, 0.2 ), mbDust );',
        '#endif',
      ].join('\n'))
      .replace('#include <metalnessmap_fragment>', [
        '#include <metalnessmap_fragment>',
        '#ifdef MB_NB',
        'roughnessFactor = mix( roughnessFactor, 1.0, min( 1.0, mbDust + 0.5 * mbChip + 0.4 * mbCorner + 0.3 * mbStreak ) );',
        'metalnessFactor = mix( metalnessFactor, 0.0, max( mbDust, mbPat ) );',
        'roughnessFactor = mix( roughnessFactor, 0.85, mbPat );',
        '#endif',
      ].join('\n'))
      .replace('#include <normal_fragment_maps>', [
        '#include <normal_fragment_maps>',
        '#ifdef MB_NB',
        'normal = normalize( mix( normal, normalize( ( viewMatrix * vec4( sign( vMbOff ), 0.0 ) ).xyz ), 0.85 * mbCorner ) );',
        '#endif',
        // Погода: по нормали геометрии (без рельефа фактуры). У здания снег ложится и узкой полосой по верхней
        // кромке боковых граней блока, открытого сверху.
        'vec3 mbFlat = normalize( vNormal );',
        'vec2 mbW = mbWeather( vMbWorld, ( vec4( mbFlat, 0.0 ) * viewMatrix ).xyz );',
        '#ifdef MB_NB',
        'mbW.x = max( mbW.x, 0.9 * mbWall * smoothstep( 0.36, 0.46, vMbOff.y ) * ( 1.0 - mbSide( mbNbI.y, vec3( 0.0, 1.0, 0.0 ) ) ) * smoothstep( 0.55, 0.85, mbSnow ) );',
        '#endif',
        'mbWeatherApply( mbW, mbFlat, diffuseColor.rgb, roughnessFactor, metalnessFactor, normal );',
      ].join('\n'))
      .replace('#include <aomap_fragment>', [
        '#include <aomap_fragment>',
        'reflectedLight.indirectDiffuse *= mbOcc.x;',
        'reflectedLight.indirectSpecular *= mbOcc.x;',
        'reflectedLight.directDiffuse *= mix( 1.0, mbOcc.x, 0.55 );',
        'reflectedLight.directSpecular *= mbOcc.x;',
        '#ifdef MB_GEM',
        // Кобальт как камень, а не пластик: блик только при скользящем свете, глубина ячеек (R карты ORM) светится изнутри.
        'float mbGr = 1.0 - saturate( dot( normal, geometryViewDir ) );',
        'mbGr *= mbGr;',
        'reflectedLight.directSpecular *= mix( 0.2, 1.6, mbGr );',
        'reflectedLight.indirectSpecular *= mix( 0.35, 1.3, mbGr );',
        'float mbIn = 1.0 + 0.4 * texelRoughness.r * ( 1.0 - mbGr );',
        'reflectedLight.directDiffuse *= mbIn;',
        'reflectedLight.indirectDiffuse *= mbIn;',
        '#endif',
      ].join('\n'))
      .replace('#include <opaque_fragment>', [
        'vec2 mbE = min( vMbEdge.xy, 1.0 - vMbEdge.xy );',
        'float mbAo = ( 0.7 + 0.3 * smoothstep( 0.0, 0.11, mbE.x ) ) * ( 0.7 + 0.3 * smoothstep( 0.0, 0.11, mbE.y ) );',
        'outgoingLight *= mbOcc.y < 0.0 ? mix( 1.0, mbAo, vMbEdge.z ) : mbOcc.y;',
        'float mbH = vMbWorld.y + ( vMbWorld.x - vMbWorld.z ) * 0.25;',
        'float mbBand = mbGlint.z * ( 1.0 - smoothstep( 0.0, mbGlint.y, abs( mbH - mbGlint.x ) ) );',
        'mbBand *= step( mbGlintBox.x, vMbWorld.x ) * step( vMbWorld.x, mbGlintBox.y ) * step( mbGlintBox.z, vMbWorld.z ) * step( vMbWorld.z, mbGlintBox.w );',
        'outgoingLight = outgoingLight * ( 1.0 + 0.6 * mbBand ) + vec3( 1.0, 0.92, 0.72 ) * mbBand * 0.22;',
        '#include <opaque_fragment>',
      ].join('\n'));
  }

  // Волна блеска по зданию снизу вверх: progress 0…1 (вне — выключена), box — footprint уровня.
  function glint(progress, box) {
    const lo = (box.minX - box.maxZ - 1) * 0.25 - 1;
    const hi = box.maxY + 1 + (box.maxX + 1 - box.minZ) * 0.25 + 1;
    GLINT.value.set(lo + (hi - lo) * progress, Math.max(1.1, (hi - lo) * 0.07), progress >= 0 && progress <= 1 ? 1 : 0, 0);
    GLINT_BOX.value.set(box.minX - 0.1, box.maxX + 1.1, box.minZ - 0.1, box.maxZ + 1.1);
  }

  // Ровный цвет без текстуры, но не «заглушка»: пятна тона, мелкое зерно, разная шероховатость и пыль сверху (по миру).
  function shadePlain(shader) {
    shader.uniforms.mbSnow = WEATHER.snow;
    shader.uniforms.mbWet = WEATHER.wet;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMbP;\nvarying vec3 vMbN;')
      .replace('#include <worldpos_vertex>', [
        '#include <worldpos_vertex>',
        'vec4 mbW = vec4( transformed, 1.0 );',
        'vec3 mbN = objectNormal;',
        '#ifdef USE_INSTANCING',
        'mbW = instanceMatrix * mbW;',
        'mbN = mat3( instanceMatrix ) * mbN;',
        '#endif',
        'vMbP = ( modelMatrix * mbW ).xyz;',
        'vMbN = mat3( modelMatrix ) * mbN;',
      ].join('\n'));
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMbP;\nvarying vec3 vMbN;\n' + NOISE + '\n' + WEATHER_GLSL)
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        'float mbD = smoothstep( 0.6, 0.9, normalize( vMbN ).y ) * 0.3 * smoothstep( 0.3, 0.8, mbNoise( vMbP * 1.3 + 7.0 ) );',
        'diffuseColor.rgb *= ( 0.86 + 0.26 * mbNoise( vMbP * 0.8 ) ) * ( 0.93 + 0.14 * mbNoise( vMbP * vec3( 1.5, 11.0, 11.0 ) ) );',
        'diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.45, 0.33, 0.2 ), mbD );',
      ].join('\n'))
      .replace('#include <metalnessmap_fragment>', [
        '#include <metalnessmap_fragment>',
        'roughnessFactor = clamp( roughnessFactor + 0.34 * ( mbNoise( vMbP * 2.1 + 11.0 ) - 0.5 ) + mbD, 0.05, 1.0 );',
        'metalnessFactor *= 1.0 - mbD;',
      ].join('\n'))
      .replace('#include <normal_fragment_maps>', [
        '#include <normal_fragment_maps>',
        'vec3 mbFlat = normalize( vNormal );',
        'mbWeatherApply( mbWeather( vMbP, normalize( vMbN ) ), mbFlat, diffuseColor.rgb, roughnessFactor, metalnessFactor, normal );',
      ].join('\n'));
  }

  // Свечение: магма и звезда светятся рисунком (трещины, ядро), самоцветы и алмазы — ровным тоном (glow в balance.json).
  function glowOf(m, spec, map) {
    if (SELF_LIT[spec.look]) {
      m.emissive.setHex(0xffffff);
      m.emissiveMap = map;
      m.emissiveIntensity = (spec.glowStrength || 0.6) * (spec.look === 'cosmic' ? 0.45 : 1.1);
    } else if (spec.glow !== undefined) {
      m.emissive.setHex(spec.glow);
      m.emissiveIntensity = (spec.glowStrength || 0.3) * 0.55;
    }
  }

  // Материал блока: id — материал (balance.json), variant — 0…2, occlusion — блок здания (затенение в стыках, пыль,
  // сколы, патина), small — вдвое мельче фактура (город, штабели, техника). Материалы здания создаются на уровень и
  // уничтожаются с ним; фактуры живут в кэше до keep().
  function material(id, variant, occlusion, small) {
    const spec = specOf(id);
    const style = styleOf(spec);
    const set = textures(id, variant % VARIANTS, small);
    const m = new THREE.MeshStandardMaterial({
      map: set.map,
      bumpMap: set.bump,
      bumpScale: BUMP[style] || 1,
      roughnessMap: set.orm,
      metalnessMap: set.orm,
      roughness: 1,
      metalness: 1,
      envMap: env,
    });
    glowOf(m, spec, set.map);
    // Свечение в посте (art/post.js): магма, звезда, самоцветы с glow и золото.
    if (SELF_LIT[spec.look] || spec.glow !== undefined || style === 'gold') MicroBuildersPost.mark(m);
    if (spec.look === 'glass') {
      m.transparent = true;
      m.opacity = 0.8;
      m.depthWrite = false;
    }
    m.onBeforeCompile = shade;
    if (occlusion) m.defines.MB_NB = '';
    if (occlusion && style === 'copper') m.defines.MB_PATINA = '';
    if (GEM[spec.look]) m.defines.MB_GEM = '';
    return m;
  }

  // Ровный цвет без текстуры, но не «заглушка»: пятна тона, зерно, разная шероховатость и пыль сверху (по миру).
  function plain(id) {
    const spec = specOf(id);
    const finish = FINISH[spec.look] || FINISH.stone;
    const m = new THREE.MeshStandardMaterial({ color: spec.color, roughness: finish[0], metalness: finish[1], envMap: env });
    if (spec.glow !== undefined) {
      m.emissive.setHex(spec.glow);
      m.emissiveIntensity = (spec.glowStrength || 0.3) * 0.55;
    }
    m.onBeforeCompile = shadePlain;
    return m;
  }

  // Куб с округлой фаской: BoxGeometry 3×3×3, крайние ряды сдвинуты к ребру и выгнуты по радиусу bevel.
  function geometry(size, bevel) {
    const geo = new THREE.BoxGeometry(size, size, size, 3, 3, 3);
    const half = size / 2;
    const inner = half - bevel;
    const edgeUv = bevel / size;
    const pos = geo.attributes.position;
    const normal = geo.attributes.normal;
    const uv = geo.attributes.uv;
    const p = new THREE.Vector3();
    const q = new THREE.Vector3();
    const toGrid = function (v) {
      return Math.abs(v) > half * 0.9 ? v : Math.sign(v) * inner;
    };
    const clamp = function (v) {
      return Math.max(-inner, Math.min(inner, v));
    };
    const toUv = function (u) {
      return u < 0.01 || u > 0.99 ? u : u < 0.5 ? edgeUv : 1 - edgeUv;
    };
    // mbSq — точка сетки до скругления: по ней шейдер делает ребро у соседа прямым (shade(), MB_NB).
    const square = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      p.set(toGrid(pos.getX(i)), toGrid(pos.getY(i)), toGrid(pos.getZ(i)));
      square.set([p.x, p.y, p.z], i * 3);
      q.set(clamp(p.x), clamp(p.y), clamp(p.z));
      p.sub(q).normalize();
      normal.setXYZ(i, p.x, p.y, p.z);
      p.multiplyScalar(bevel).add(q);
      pos.setXYZ(i, p.x, p.y, p.z);
      uv.setXY(i, toUv(uv.getX(i)), toUv(uv.getY(i)));
    }
    // Для затенения у рёбер в shade(): uv грани и флаг «это куб с фаской».
    const edge = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) edge.set([uv.getX(i), uv.getY(i), 1], i * 3);
    geo.setAttribute('mbEdge', new THREE.BufferAttribute(edge, 3));
    // Нормаль исходной грани для затенения в стыках: BoxGeometry кладёт грани px, nx, py, ny, pz, nz поровну вершин.
    const faces = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const face = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) face.set(faces[Math.floor(i * 6 / pos.count)], i * 3);
    geo.setAttribute('mbFace', new THREE.BufferAttribute(face, 3));
    geo.setAttribute('mbSq', new THREE.BufferAttribute(square, 3));
    return geo;
  }

  // Вид конкретного блока по клетке: вариант фактуры, поворот вокруг вертикали (низ боковых граней остаётся низом) и оттенок.
  // mask (атрибут mbLook в game.js): биты 0–5 — рисунок на грани px, nx, py, ny, pz, nz (~19 %, иначе стена-обои),
  // 6 — зеркало голой грани, 7–14 — скол угла (по знаку xyz: x·4 + y·2 + z) у четверти блоков.
  function look(x, y, z) {
    let h = Math.imul((x * 73856093) ^ (y * 19349663) ^ (z * 83492791), 0x9e3779b1);
    h ^= h >>> 15;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    const u = h >>> 0;
    // real: ручная кладка — блок чуть сдвинут и довёрнут, ровная стена ловит свет неровно.
    // Сдвиг вдвое меньше прежнего: швы — плотный контакт кладки, а не зазоры между кубиками.
    const w = Math.imul(u ^ (u >>> 16), 0x27d4eb2d) >>> 0;
    const e = Math.imul(w ^ (w >>> 13), 0x165667b1) >>> 0;
    const c = Math.imul(e ^ (e >>> 11), 0x2c1b3c6d) >>> 0;
    let mask = e & 0x1000000 ? 64 : 0;
    for (let f = 0; f < 6; f++) if (((e >>> (f * 4)) & 15) < 3) mask |= 1 << f;
    if (c % 100 < 26) mask |= 128 << ((c >>> 8) & 7);
    if (c % 100 < 6) mask |= 128 << ((c >>> 12) & 7);
    return {
      variant: u % VARIANTS,
      turn: ((u >>> 4) % 4) * (Math.PI / 2),
      tint: 0.9 + (((u >>> 8) % 100) / 100) * 0.14,
      jx: ((w % 1000) / 1000 - 0.5) * 0.02,
      jz: (((w >>> 10) % 1000) / 1000 - 0.5) * 0.02,
      yaw: (((w >>> 20) % 1000) / 1000 - 0.5) * 0.016,
      mask: mask,
    };
  }

  // Окружение для отражений металла: небо, тёплый горизонт, земля, солнце и два облака.
  // Только блокам (envMap), не всей сцене: иначе пересветит траву и рабочих.
  function environment(renderer) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const sky = ctx.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, '#6f9fc8');
    sky.addColorStop(0.45, '#cfe0ea');
    sky.addColorStop(0.5, '#f3dcc0');
    sky.addColorStop(0.56, '#ab9a7c');
    sky.addColorStop(1, '#827360');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 256);
    blot(ctx, 150, 62, 36, '255,248,225', 1);
    blot(ctx, 150, 62, 12, '255,255,255', 1);
    blot(ctx, 360, 90, 60, '255,255,255', 0.5);
    blot(ctx, 40, 100, 50, '255,255,255', 0.4);
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(renderer);
    env = pmrem.fromEquirectangular(texture).texture;
    texture.dispose();
    pmrem.dispose();
  }

  window.MicroBuildersBlocks = {
    VARIANTS: VARIANTS, geometry: geometry, material: material, plain: plain, look: look, environment: environment,
    glint: glint, keep: keep, env: function () { return env; }, noise: NOISE, weather: WEATHER,
  };
})();
