// Эффекты стройки: заливка блока при укладке, пыль, крошка, искры и блики по материалу, удары инструмента,
// волна закрытия яруса, залпы конфетти и флажок финала, мигалки и шлейфы Аврала, «+N» монет к счётчику и вспышка этапа.
// Только картинка: game.js передаёт координаты и числа, состояние симуляции здесь не читается и не меняется.
// Всё из пулов, созданных один раз: в кадре нет новых геометрий, материалов и объектов.
(function () {
  const S = 10; // поля частицы: x y z vx vy vz life max spin size
  const CHIPS = 96;
  const CONFETTI = 128; // три залпа финала по 40
  const DUST = 64; // укладка + волна пыли яруса (до 28 клубков)
  const SPARKS = 48;
  const SMOKE = 48; // выхлоп техники
  const GLINTS = 8;
  const GRIT = 192; // мелкая пыль: удары инструмента, кольцо под блоком, шлейфы бега в Аврал
  const BEACONS = 4; // мигалок Аврала
  const EDGES = 192; // отрезков кромки яруса
  const SALVO = 0.55; // секунд между залпами конфетти
  const COINS = 10;
  const FILL_CAP = 24; // заливок одного материала за кадр: столько рабочих укладывают сразу
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const tint = new THREE.Color();
  const point = new THREE.Vector3();
  const CONFETTI_COLORS = [0xf2c230, 0xff7a1a, 0x3cc8e6, 0xffffff, 0xe5433b, 0x58c45a];
  let glassMap = null;

  // Блок появляется за 0,25 с: 0,85 → 1,05 → 1.
  function popScale(u) {
    if (u >= 1) return 1;
    if (u < 0.6) {
      const k = 1 - u / 0.6;
      return 0.85 + 0.2 * (1 - k * k);
    }
    const k = (u - 0.6) / 0.4;
    return 1.05 - 0.05 * k * k * (3 - 2 * k);
  }

  // Класс материала для частиц и звука укладки: стекло, дерево, камень, золото или прочий металл
  // (вид материала в balance.json → materials.ladder[].look).
  const GOLD = { 'ladder-gold': true, 'ladder-sun-gold': true, 'ladder-brass': true };
  function kind(block) {
    if (block.feature === 'window' || block.glassOf !== undefined) return 'glass';
    if (block.feature === 'door' || block.feature === 'greenery') return 'wood';
    const spec = window.MicroBuilders && window.MicroBuilders.MATERIAL[block.materialId];
    const look = spec ? spec.look : 'stone';
    if (look === 'metal' || look === 'platinum') return GOLD[block.materialId] ? 'gold' : 'metal';
    if (look === 'wood') return 'wood';
    if (look === 'glass' || look === 'crystal' || look === 'diamond') return 'glass';
    return 'stone';
  }

  // Призрак: тонкие светящиеся рёбра и еле заметное стекло; рамку рисует шейдер по координатам точки в клетке (куб 1 × 0,98 × 1).
  // Цвет экземпляра — данные, а не цвет (game.js refreshGhosts): r — вид (0 — ярус, который строят; 1 — к клетке несут блок,
  // мерцает; 2 — силуэт цели), g — маска соседей той же группы (биты: 6 граней +x −x +y −y +z −z, потом 12 рёбер по парам осей
  // xy, xz, yz). Грань к соседу не рисуется, ребро — только где поверхность ломается: группа читается одним объёмом, а не сеткой.
  // Клетка, к которой несут блок, остаётся в рамке группы (иначе десятки целых кубов дают дымку) и мерцает сама.
  // У одиночных призраков дверей и окон цвета экземпляра нет — целый куб яруса. Прозрачность задаёт шейдер, opacity не влияет.
  // Материал — на уровень (уничтожается с уровнем); material.userData.time.value — секунды для мерцания.
  function glass() {
    const time = { value: 0 };
    const material = new THREE.MeshStandardMaterial({
      color: 0x5cd9ff,
      roughness: 0.45,
      metalness: 0,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    material.userData.time = time;
    material.onBeforeCompile = function (shader) {
      shader.uniforms.uGhostTime = time;
      shader.vertexShader = 'varying vec3 vGhostPos;\nvarying vec3 vGhostN;\nvarying float vGhostPhase;\n' + shader.vertexShader.replace('#include <begin_vertex>', [
        '#include <begin_vertex>',
        'vGhostPos = position;',
        'vGhostN = normal;',
        '#ifdef USE_INSTANCING',
        'vGhostPhase = dot(instanceMatrix[3].xyz, vec3(1.7, 2.9, 1.3));',
        '#else',
        'vGhostPhase = 0.0;',
        '#endif',
      ].join('\n'));
      shader.fragmentShader = [
        'uniform float uGhostTime;',
        'varying vec3 vGhostPos;',
        'varying vec3 vGhostN;',
        'varying float vGhostPhase;',
        'bool ghostBit(int m, int b) { return ((m >> b) & 1) == 1; }',
        // Ребро грани (ось n, знак sn) со стороны оси t (знак st): поверхность продолжается, если там сосед, а над ним по n — пусто.
        'bool ghostEdge(int m, int n, float sn, int t, float st) {',
        '  int a = min(n, t);',
        '  int b = max(n, t);',
        '  float sa = n < t ? sn : st;',
        '  float sb = n < t ? st : sn;',
        '  return !ghostBit(m, t * 2 + (st > 0.0 ? 0 : 1)) || ghostBit(m, 6 + (a + b - 1) * 4 + (sa > 0.0 ? 0 : 2) + (sb > 0.0 ? 0 : 1));',
        '}',
        // Линия шириной w (доли клетки) с краем в пиксель px: уже пикселя — бледнее, а не толще, поэтому на дальнем зуме рёбра не рябят.
        'float ghostLine(float d, float w, float px) {',
        '  float e = max(w, px);',
        '  return min(w / px, 1.0) * (1.0 - smoothstep(e - px * 0.5, e + px * 0.5, d));',
        '}',
        shader.fragmentShader.replace('#include <color_fragment>', [
          'float ghostKind = 0.0;',
          'int ghostMask = 0;',
          '#ifdef USE_COLOR',
          'ghostKind = vColor.r;',
          'ghostMask = int(vColor.g + 0.5);',
          '#endif',
          'bool ghostBusy = ghostKind > 0.5 && ghostKind < 1.5;',
          'bool ghostSil = ghostKind > 1.5;',
          'bool ghostBack = !gl_FrontFacing;',
          // Силуэт — только лицевые грани: оболочка объёма, а не каркас насквозь.
          'if (ghostSil && ghostBack) discard;',
          'vec3 ghostA = abs(vGhostN);',
          'int gn = ghostA.x > 0.5 ? 0 : ghostA.y > 0.5 ? 1 : 2;',
          'float gs = gn == 0 ? vGhostN.x : gn == 1 ? vGhostN.y : vGhostN.z;',
          'if (ghostBit(ghostMask, gn * 2 + (gs > 0.0 ? 0 : 1))) discard;',
          'int gt1 = gn == 0 ? 1 : 0;',
          'int gt2 = gn == 2 ? 1 : 2;',
          'vec3 ghostH = vec3(0.5, 0.49, 0.5);',
          'vec3 ghostFw = max(fwidth(vGhostPos), vec3(1e-4));',
          'float ghostE = 0.0;',
          'float ghostS = 0.0;',
          // Шов клетки, к которой несут блок, толще: её контур проступает внутри рамки группы.
          'float ghostSw = ghostBusy ? 0.024 : 0.014;',
          'for (int k = 0; k < 4; k++) {',
          '  int t = k < 2 ? gt1 : gt2;',
          '  float st = (k == 0 || k == 2) ? 1.0 : -1.0;',
          '  float d = ghostH[t] - st * vGhostPos[t];',
          // Контур силуэта не тоньше ~пикселя: на дальнем зуме башня читается рамкой, а не дымкой; швов у силуэта нет, рябить нечему.
          '  float ghostW = ghostSil ? max(0.028, ghostFw[t] * 0.8) : 0.028;',
          '  if (ghostEdge(ghostMask, gn, gs, t, st)) ghostE = max(ghostE, ghostLine(d, ghostW, ghostFw[t]));',
          '  else ghostS = max(ghostS, ghostLine(d, ghostSw, ghostFw[t]) * smoothstep(0.5, 1.0, ghostSw / ghostFw[t]));',
          '}',
          'float ghostPulse = ghostBusy ? 0.5 + 0.5 * sin(uGhostTime * 4.0 + vGhostPhase) : 0.0;',
          // Ярус: яркая рамка, тонкие швы между клетками (видно, сколько блоков), заливка только на лицевых гранях — без дымки
          // в два слоя; задние рёбра бледнее, как у стекла. Клетка, к которой несут блок, мерцает заливкой и контуром.
          // Силуэт — бледная оболочка: верх чуть плотнее боков, чтобы объём читался и на дальнем зуме, рёбра без швов.
          'float ghostFill = ghostBack ? 0.0 : ghostSil ? (gn == 1 && gs > 0.0 ? 0.075 : 0.04) : 0.035 + 0.1 * ghostPulse;',
          'float ghostLineA = ghostSil ? ghostE * 0.22 : max(ghostE * 0.95, ghostS * (ghostBusy ? 0.3 + 0.5 * ghostPulse : 0.22));',
          'if (ghostBack) ghostLineA *= 0.45;',
          'float ghostGlow = ghostSil ? 0.3 : 0.8 + 0.6 * ghostPulse;',
          'if (ghostSil) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), 0.55);',
          'diffuseColor.a = ghostFill + (1.0 - ghostFill) * ghostLineA;',
          'totalEmissiveRadiance += diffuseColor.rgb * ghostLineA * ghostGlow;',
        ].join('\n')),
      ].join('\n');
    };
    return material;
  }

  // Этап 25/50/75/100 %: короткая вспышка полосы прогресса. Экспорт MicroBuildersFx.flashBar — для бонуса этапа (mech).
  function flashBar() {
    const fill = document.getElementById('bar-fill');
    if (!fill || !fill.animate) return;
    fill.animate([
      { filter: 'brightness(1)' },
      { filter: 'brightness(1.9) saturate(1.2)', offset: 0.2 },
      { filter: 'brightness(1)' },
    ], { duration: 600, easing: 'ease-out' });
    fill.parentElement.animate([
      { boxShadow: '0 0 0 0 rgba(255, 224, 110, 0)' },
      { boxShadow: '0 0 12px 3px rgba(255, 224, 110, 0.85)', offset: 0.2 },
      { boxShadow: '0 0 0 0 rgba(255, 224, 110, 0)' },
    ], { duration: 600, easing: 'ease-out' });
  }

  function makePool(scene, geometry, material, size) {
    const mesh = new THREE.InstancedMesh(geometry, material, size);
    mesh.frustumCulled = false;
    mesh.visible = false;
    for (let i = 0; i < size; i++) {
      mesh.setMatrixAt(i, ZERO);
      mesh.setColorAt(i, color.setHex(0xffffff));
    }
    scene.add(mesh);
    return { mesh: mesh, size: size, next: 0, d: new Float32Array(size * S) };
  }

  function spawn(pool, x, y, z, vx, vy, vz, life, size, hex) {
    const i = pool.next;
    pool.next = (i + 1) % pool.size;
    const d = pool.d;
    const o = i * S;
    d[o] = x; d[o + 1] = y; d[o + 2] = z;
    d[o + 3] = vx; d[o + 4] = vy; d[o + 5] = vz;
    d[o + 6] = life; d[o + 7] = life;
    d[o + 8] = Math.random() * 6.28;
    d[o + 9] = size;
    pool.mesh.setColorAt(i, color.setHex(hex));
    pool.mesh.instanceColor.needsUpdate = true;
    pool.mesh.visible = true;
  }

  // flutter — конфетти: падает медленно, качается и кувыркается; иначе крошка: баллистика с вращением.
  function stepPool(pool, dt, gravity, drag, flutter) {
    if (!pool.mesh.visible) return;
    const d = pool.d;
    const keep = 1 - Math.min(1, drag * dt);
    let live = 0;
    for (let i = 0; i < pool.size; i++) {
      const o = i * S;
      if (d[o + 6] <= 0) continue;
      d[o + 6] -= dt;
      if (d[o + 6] <= 0) {
        pool.mesh.setMatrixAt(i, ZERO);
        continue;
      }
      live++;
      d[o + 4] -= gravity * dt;
      d[o + 3] *= keep;
      d[o + 5] *= keep;
      if (flutter && d[o + 4] < -1.3) d[o + 4] = -1.3;
      const age = d[o + 7] - d[o + 6];
      const spin = d[o + 8];
      d[o] += d[o + 3] * dt + (flutter ? Math.sin(age * 5 + spin) * 0.5 * dt : 0);
      d[o + 1] += d[o + 4] * dt;
      d[o + 2] += d[o + 5] * dt + (flutter ? Math.cos(age * 4 + spin) * 0.5 * dt : 0);
      if (d[o + 1] < 0.03) {
        d[o + 1] = 0.03;
        d[o + 3] = 0;
        d[o + 4] = 0;
        d[o + 5] = 0;
      }
      dummy.position.set(d[o], d[o + 1], d[o + 2]);
      if (flutter) dummy.rotation.set(age * 7 + spin, spin, age * 4.5);
      else dummy.rotation.set(spin + age * 9, spin, age * 6);
      dummy.scale.setScalar(d[o + 9] * Math.min(1, d[o + 6] / 0.25));
      dummy.updateMatrix();
      pool.mesh.setMatrixAt(i, dummy.matrix);
    }
    pool.mesh.instanceMatrix.needsUpdate = true;
    pool.mesh.visible = live > 0;
  }

  function clearPool(pool) {
    for (let i = 0; i < pool.size; i++) {
      pool.d[i * S + 6] = 0;
      pool.mesh.setMatrixAt(i, ZERO);
    }
    pool.mesh.instanceMatrix.needsUpdate = true;
    pool.mesh.visible = false;
  }

  // Мягкие точки (пыль, искры, блики) лицом к камере: размер общий, прозрачность у каждой своя (цвет RGBA).
  // wait — задержка появления (волна пыли по ярусу); fade(t) — яркость по доле оставшейся жизни.
  function makePoints(scene, n, size, map, additive, fade) {
    const geo = new THREE.BufferGeometry();
    const p = {
      n: n, next: 0, fade: fade, geo: geo,
      pos: new Float32Array(n * 3), vel: new Float32Array(n * 3), rgba: new Float32Array(n * 4),
      life: new Float32Array(n), max: new Float32Array(n), wait: new Float32Array(n),
    };
    geo.setAttribute('position', new THREE.BufferAttribute(p.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(p.rgba, 4));
    p.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: size,
      map: map,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      toneMapped: !additive, // искры и блики не гасит тон-маппинг
    }));
    p.points.frustumCulled = false;
    p.points.visible = false;
    scene.add(p.points);
    return p;
  }

  function emit(p, x, y, z, vx, vy, vz, life, wait, hex) {
    const i = p.next;
    p.next = (i + 1) % p.n;
    p.pos[i * 3] = x; p.pos[i * 3 + 1] = y; p.pos[i * 3 + 2] = z;
    p.vel[i * 3] = vx; p.vel[i * 3 + 1] = vy; p.vel[i * 3 + 2] = vz;
    p.life[i] = life; p.max[i] = life; p.wait[i] = wait;
    color.setHex(hex);
    // Видна уже в кадре выпуска: удар инструмента выпускает частицы после шага пула, иначе искра отстаёт на кадр.
    p.rgba[i * 4] = color.r; p.rgba[i * 4 + 1] = color.g; p.rgba[i * 4 + 2] = color.b; p.rgba[i * 4 + 3] = wait > 0 ? 0 : p.fade(1);
    p.geo.attributes.position.needsUpdate = true;
    p.geo.attributes.color.needsUpdate = true;
    p.points.visible = true;
  }

  // gravity — вниз по y; drag — торможение по x и z.
  function stepPoints(p, dt, gravity, drag) {
    if (!p.points.visible) return;
    const keep = 1 - Math.min(1, drag * dt);
    let live = 0;
    for (let i = 0; i < p.n; i++) {
      if (p.life[i] <= 0) continue;
      live++;
      if (p.wait[i] > 0) {
        p.wait[i] -= dt;
        continue;
      }
      p.life[i] -= dt;
      p.rgba[i * 4 + 3] = p.life[i] > 0 ? p.fade(p.life[i] / p.max[i]) : 0;
      const o = i * 3;
      p.vel[o + 1] -= gravity * dt;
      p.vel[o] *= keep;
      p.vel[o + 2] *= keep;
      p.pos[o] += p.vel[o] * dt;
      p.pos[o + 1] = Math.max(0.03, p.pos[o + 1] + p.vel[o + 1] * dt);
      p.pos[o + 2] += p.vel[o + 2] * dt;
    }
    p.geo.attributes.position.needsUpdate = true;
    p.geo.attributes.color.needsUpdate = true;
    p.points.visible = live > 0;
  }

  function clearPoints(p) {
    p.life.fill(0);
    p.wait.fill(0);
    for (let i = 0; i < p.n; i++) p.rgba[i * 4 + 3] = 0;
    p.geo.attributes.color.needsUpdate = true;
    p.points.visible = false;
  }

  // Блик: четырёхлучевая звёздочка с мягким центром.
  function starTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(32, 0); ctx.lineTo(35, 29); ctx.lineTo(64, 32); ctx.lineTo(35, 35);
    ctx.lineTo(32, 64); ctx.lineTo(29, 35); ctx.lineTo(0, 32); ctx.lineTo(29, 29);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(32, 32, 9, 0, Math.PI * 2);
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // hard — плотное ядро до половины радиуса (искры), иначе мягкий клубок (пыль).
  function dotTexture(hard) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, hard ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Луч мигалки: клин от лампы (u = 0) наружу, яркое ядро у лампы, к концу и краям гаснет.
  function beamTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.filter = 'blur(4px)';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(2, 29); ctx.lineTo(126, 8); ctx.lineTo(126, 56); ctx.lineTo(2, 35);
    ctx.closePath();
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Детали одного цвета → одна геометрия с цветом вершин: мигалка — одна InstancedMesh, один draw call.
  function mergeTinted(parts) {
    let vn = 0;
    let n = 0;
    for (let i = 0; i < parts.length; i += 2) {
      vn += parts[i].attributes.position.count;
      n += parts[i].index.count;
    }
    const pos = new Float32Array(vn * 3);
    const nor = new Float32Array(vn * 3);
    const col = new Float32Array(vn * 3);
    const idx = new Uint16Array(n);
    let v = 0;
    let o = 0;
    for (let i = 0; i < parts.length; i += 2) {
      const g = parts[i];
      const count = g.attributes.position.count;
      pos.set(g.attributes.position.array, v * 3);
      nor.set(g.attributes.normal.array, v * 3);
      color.setHex(parts[i + 1]);
      for (let k = 0; k < count; k++) col.set([color.r, color.g, color.b], (v + k) * 3);
      for (let k = 0; k < g.index.count; k++) idx[o + k] = g.index.array[k] + v;
      v += count;
      o += g.index.count;
      g.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    return geo;
  }

  // Две скрещённые полосы (вертикальная и горизонтальная) вдоль +x длиной 1: луч читается с любого ракурса.
  function beamGeometry() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, -0.5, 0, 1, -0.5, 0, 1, 0.5, 0, 0, 0.5, 0,
      0, 0, 0.5, 1, 0, 0.5, 1, 0, -0.5, 0, 0, -0.5,
    ]), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1]), 2));
    geo.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
    return geo;
  }

  function injectStyle() {
    const style = document.createElement('style');
    // Вне анимации узлы прозрачны: Web Animations задаёт путь и прозрачность, после конца узел снова невидим.
    style.textContent =
      '.fx-fly,.fx-gain{position:fixed;left:0;top:0;z-index:9000;pointer-events:none;opacity:0;will-change:transform,opacity}' +
      '.fx-fly.coin{width:18px;height:18px}' +
      '.fx-gain{font:800 18px Manrope,"Segoe UI",sans-serif;color:#ffe27a;white-space:nowrap;' +
      'text-shadow:0 2px 0 #5a3d06,0 0 3px rgba(0,0,0,.65)}';
    document.head.appendChild(style);
  }

  const BOUNCE = [
    { transform: 'translateY(0) scale(1)' },
    { transform: 'translateY(-5px) scale(1.1)', offset: 0.35 },
    { transform: 'translateY(0) scale(1)' },
  ];

  // Точка экрана на верхней плашке, нижней панели или кнопке Аврала: «+N» там не пишем, только полёт монеты.
  function onHud(x, y) {
    const list = document.querySelectorAll('#hud .top, #hud .dock, #rush');
    for (let i = 0; i < list.length; i++) {
      const r = list[i].getBoundingClientRect();
      if (x > r.left - 8 && x < r.right + 8 && y > r.top - 8 && y < r.bottom + 8) return true;
    }
    return false;
  }

  // getCamera — функция: камера в game.js появляется позже эффектов. format — формат монет как в HUD.
  function create(scene, getCamera, format) {
    const chips = makePool(scene, new THREE.BoxGeometry(0.07, 0.07, 0.07), new THREE.MeshLambertMaterial(), CHIPS);
    const confettiPool = makePool(scene, new THREE.PlaneGeometry(0.2, 0.12), new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), CONFETTI);

    const dot = dotTexture();
    // Размер точки three.js — в долях высоты экрана на расстоянии 1: при fov 48° на экране он ≈ 0,45 клетки на единицу size.
    const dust = makePoints(scene, DUST, 1, dot, false, function (t) { return 0.6 * t * (2 - t); });
    // Искры — насыщенные оранжевые точки обычным смешиванием: сложение на светлом песке и металле уходит в белое и теряется.
    // Яркие почти всю жизнь, гаснут в последней трети; рисуются после стекла призраков (renderOrder), чтобы оно их не бледнило.
    const sparks = makePoints(scene, SPARKS, 0.45, dotTexture(true), false, function (t) { return Math.min(1, t * 3); });
    sparks.points.material.toneMapped = false;
    sparks.points.renderOrder = 1;
    const glints = makePoints(scene, GLINTS, 1.4, starTexture(), true, function (t) { return t > 0.7 ? (1 - t) / 0.3 : t / 0.7; });
    glints.points.renderOrder = 1;
    // Дизельный выхлоп: тёмные клубы плавно густеют у трубы, всплывают и растворяются по ветру.
    const smoke = makePoints(scene, SMOKE, 2.2, dot, false, function (t) { return 0.4 * t * Math.min(1, (1 - t) * 6); });
    // Пыль у земли — цвета грунта карьера, выше — светлая каменная.
    function dustHex(y) { return y < 0.6 ? 0xd9c3a0 : 0xf3ead8; }
    // Мелкая пыль (~0,25 клетки): удар инструмента, кольцо под блоком, шлейф бега. Крупные клубки dust для неё велики.
    const grit = makePoints(scene, GRIT, 0.55, dot, false, function (t) { return 0.8 * t * (2 - t); });

    // Кольцо пыли по низу блока: клубки по периметру клетки расходятся наружу и оседают.
    function ring(x, y, z) {
      const hex = dustHex(y);
      for (let k = 0; k < 10; k++) {
        const a = (k + Math.random() * 0.5) * 0.628;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const r = 0.5 / Math.max(Math.abs(c), Math.abs(s));
        const v = 1.1 + Math.random() * 0.4;
        emit(grit, x + c * r, y + 0.06, z + s * r, c * v, 0.1, s * v, 0.42 + Math.random() * 0.1, 0, hex);
      }
    }

    // Аврал: мигалки у углов стройки — тумба со стойкой, линза и вращающийся луч; три InstancedMesh, видны только в Аврал.
    const LENS_Y = 0.775;
    const beaconBody = new THREE.InstancedMesh(mergeTinted([
      new THREE.BoxGeometry(0.34, 0.07, 0.34).translate(0, 0.035, 0), 0x2e3136,
      new THREE.CylinderGeometry(0.045, 0.06, 0.64, 8).translate(0, 0.39, 0), 0xf2c230,
      new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12).translate(0, 0.685, 0), 0x2e3136,
      new THREE.CylinderGeometry(0.05, 0.105, 0.05, 12).translate(0, 0.865, 0), 0x2e3136,
    ]), new THREE.MeshLambertMaterial({ vertexColors: true }), BEACONS);
    const beaconLens = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.105, 0.13, 12).translate(0, LENS_Y, 0),
      new THREE.MeshBasicMaterial({ toneMapped: false }), BEACONS);
    const beamMaterial = new THREE.MeshBasicMaterial({
      map: beamTexture(), color: 0xff6a2a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    });
    const beaconBeam = new THREE.InstancedMesh(beamGeometry(), beamMaterial, BEACONS);
    beaconBeam.renderOrder = 1;
    for (let i = 0; i < BEACONS; i++) beaconLens.setColorAt(i, color.setHex(0xff4a1a));
    [beaconBody, beaconLens, beaconBeam].forEach(function (mesh) {
      mesh.frustumCulled = false;
      mesh.visible = false;
      scene.add(mesh);
    });
    const beacon = { on: false, run: true, night: 0, k: 0, spin: 0, n: 0, s: 1, box: null, x: new Float32Array(BEACONS), z: new Float32Array(BEACONS) };

    // k: 0..1 — мигалки вырастают с отскоком за 0,35 с и уходят в землю за 0,25 с.
    function stepBeacons(dt) {
      if (!beacon.on && beacon.k <= 0) return;
      beacon.k = beacon.on ? Math.min(1, beacon.k + dt / 0.35) : Math.max(0, beacon.k - dt / 0.25);
      const on = beacon.k > 0;
      beaconBody.visible = on;
      beaconLens.visible = on;
      beaconBeam.visible = on;
      if (!on) return;
      if (beacon.run) beacon.spin += dt * 9;
      const u = beacon.k - 1;
      const s = beacon.s * (beacon.on ? Math.max(0.001, 1 + 2.7 * u * u * u + 1.7 * u * u) : beacon.k);
      const cam = getCamera().position;
      for (let i = 0; i < beacon.n; i++) {
        const x = beacon.x[i];
        const z = beacon.z[i];
        dummy.position.set(x, 0, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        beaconBody.setMatrixAt(i, dummy.matrix);
        beaconLens.setMatrixAt(i, dummy.matrix);
        const a = beacon.spin + i * 1.57;
        dummy.position.y = LENS_Y * s;
        dummy.rotation.y = a;
        dummy.scale.set(2.2 * s, 0.8 * s, 0.8 * s);
        dummy.updateMatrix();
        beaconBeam.setMatrixAt(i, dummy.matrix);
        // Луч (+x после поворота на a) смотрит в камеру — линза вспыхивает: так мигалка и читается мигающей.
        const cx = cam.x - x;
        const cz = cam.z - z;
        const d = Math.max(0, (Math.cos(a) * cx - Math.sin(a) * cz) / (Math.hypot(cx, cz) || 1));
        const f = d * d * d * d;
        // Вспышка только в оранжевый: белая линза теряет цвет «опасность».
        beaconLens.setColorAt(i, color.setRGB(0.78 + 0.22 * f, 0.1 + 0.3 * f, 0.03 + 0.04 * f));
      }
      beaconBody.count = beacon.n;
      beaconLens.count = beacon.n;
      beaconBeam.count = beacon.n;
      beaconBody.instanceMatrix.needsUpdate = true;
      beaconLens.instanceMatrix.needsUpdate = true;
      beaconLens.instanceColor.needsUpdate = true;
      beaconBeam.instanceMatrix.needsUpdate = true;
      beamMaterial.opacity = beacon.k * (0.5 + 0.4 * beacon.night);
    }

    // count клубков пыли расходятся от основания; wait — задержка (волна по ярусу).
    function puffs(x, y, z, count, wait) {
      for (let k = 0; k < count; k++) {
        const a = k * 6.283 / count + Math.random() * 0.6;
        const cx = Math.cos(a);
        const cz = Math.sin(a);
        emit(dust, x + cx * 0.45, y + 0.12, z + cz * 0.45, cx * 0.7, 0.25, cz * 0.7, 0.55, wait, dustHex(y));
      }
    }

    // Вспышка кромки закрытого яруса: тонкие светлые планки по внешним верхним рёбрам, гаснут за 0,35 с.
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff0b8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const edges = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), edgeMaterial, EDGES);
    edges.frustumCulled = false;
    edges.visible = false;
    edges.count = 0;
    scene.add(edges);
    let edgeT = 0;

    // Залпы конфетти финала: первый сразу, ещё два через SALVO.
    const salvo = { left: 0, t: 0, x: 0, y: 0, z: 0, radius: 1 };
    function fireSalvo(index) {
      const radius = salvo.radius;
      const size = Math.min(2.5, Math.max(1, radius / 5));
      const a0 = index * 2.1;
      const off = index === 0 ? 0 : radius * 0.4;
      const x = salvo.x + Math.cos(a0) * off;
      const z = salvo.z + Math.sin(a0) * off;
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * 6.28;
        const speed = (0.6 + Math.random()) * Math.min(4, 1 + radius * 0.25);
        spawn(confettiPool, x + Math.cos(a) * radius * 0.25, salvo.y + Math.random(), z + Math.sin(a) * radius * 0.25,
          Math.cos(a) * speed, 2.5 + Math.random() * 2.5, Math.sin(a) * speed,
          2.2 + Math.random() * 0.9, size, CONFETTI_COLORS[(i + index) % CONFETTI_COLORS.length]);
      }
    }

    // Флажок на вершине сданного здания: древко и полотнище, полотнище колышется волной от древка.
    const flag = new THREE.Group();
    flag.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 6).translate(0, 0.8, 0), new THREE.MeshLambertMaterial({ color: 0xf4f1ea })));
    const clothGeo = new THREE.PlaneGeometry(0.9, 0.55, 8, 2).translate(0.48, 1.32, 0);
    flag.add(new THREE.Mesh(clothGeo, new THREE.MeshLambertMaterial({ color: 0xe5433b, side: THREE.DoubleSide })));
    flag.visible = false;
    scene.add(flag);
    const clothPos = clothGeo.attributes.position;
    const clothNormal = clothGeo.attributes.normal;
    let flagT = 0;
    let flagScale = 1;

    // Заливка: по InstancedMesh на материал (заводится при первой укладке этого материала), коробка растёт снизу вверх.
    const fillGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const fills = {};
    const fillList = [];

    // Монеты: пара узлов на слот — «+N», тающее вверх над блоком, и монета, летящая по дуге в счётчик.
    injectStyle();
    const coinNodes = [];
    let lastCoin = null;
    let bounceAt = 0;
    for (let i = 0; i < COINS; i++) {
      const fly = document.createElement('i');
      fly.className = 'fx-fly coin';
      const gain = document.createElement('b');
      gain.className = 'fx-gain';
      const slot = { fly: fly, gain: gain, value: 0, busy: false };
      document.body.append(fly, gain);
      coinNodes.push(slot);
    }

    function arrive(slot) {
      slot.busy = false;
      const coins = document.getElementById('coins');
      const now = performance.now();
      if (!coins || !coins.animate || now - bounceAt < 120) return;
      bounceAt = now;
      coins.animate(BOUNCE, { duration: 260, easing: 'ease-out' });
    }

    return {
      // Каменная крошка, щепа, пыль самосвала: мелкие кубики по баллистике.
      chips: function (x, y, z, hex, count) {
        for (let i = 0; i < count; i++) {
          spawn(chips, x, y, z, (Math.random() - 0.5) * 2.4, 1.2 + Math.random() * 1.6, (Math.random() - 0.5) * 2.4, 0.35, 1, hex);
        }
      },

      // Пыль при укладке и приземлении рабочего: пять мягких клубков расходятся от основания.
      dust: function (x, y, z) {
        puffs(x, y, z, 5, 0);
      },

      smoke: function (x, y, z) {
        emit(smoke, x, y, z, 0.25 + Math.random() * 0.12, 0.6, -0.1 + Math.random() * 0.2, 1.6, 0, 0x5a554e);
      },

      // Дымок сигареты: маленький светлый клубок, медленно поднимается и тает.
      puff: function (x, y, z, hex) {
        emit(grit, x, y, z, (Math.random() - 0.5) * 0.15, 0.25 + Math.random() * 0.1, (Math.random() - 0.5) * 0.15,
          1.1 + Math.random() * 0.4, 0, hex);
      },

      // Касание блока (x, z — центр клетки, y — низ): кольцо пыли по низу и по классу материала kind(): камень — крошка,
      // металл — 4–6 искр, золото — искры и блик, стекло — блик, дерево — щепа. Мало и коротко.
      place: function (cls, x, y, z, hex) {
        ring(x, y, z);
        // Крошка и искры — с верхней кромки блока: у основания их прячут соседние блоки.
        if (cls === 'stone' || cls === 'wood') {
          for (let i = 0; i < 4; i++) {
            const a = Math.random() * 6.28;
            const c = Math.cos(a);
            const s = Math.sin(a);
            const r = 0.5 / Math.max(Math.abs(c), Math.abs(s));
            spawn(chips, x + c * r, y + 0.95, z + s * r, c * 1.4, 1 + Math.random(), s * 1.4,
              0.35, cls === 'wood' ? 1.4 : 1.6, cls === 'wood' ? 0xc49a5c : hex);
          }
        }
        if (cls === 'metal' || cls === 'gold') {
          const n = 4 + Math.floor(Math.random() * 3);
          for (let i = 0; i < n; i++) {
            const a = Math.random() * 6.28;
            const c = Math.cos(a);
            const s = Math.sin(a);
            const r = 0.5 / Math.max(Math.abs(c), Math.abs(s));
            const v = 1.2 + Math.random();
            emit(sparks, x + c * r, y + 1, z + s * r, c * v, 1.4 + Math.random(), s * v,
              0.3, 0, cls === 'gold' ? 0xffd23a : 0xff9a2e);
          }
        }
        if (cls === 'gold' || cls === 'glass') {
          // Блик на верхнем углу, повёрнутом к камере.
          const cam = getCamera().position;
          emit(glints, x + (cam.x > x ? 0.45 : -0.45), y + 0.98, z + (cam.z > z ? 0.45 : -0.45), 0, 0, 0, 0.3, 0, 0xfff6d8);
        }
      },

      // Удар инструмента: x, y, z — кончик, (dx, dz) — куда смотрит рабочий; tool — 'pick' | 'hammer' | 'drill' | 'rotary',
      // cls — класс материала под ударом (kind()), hex — его цвет. Искры отскакивают от поверхности к рабочему,
      // пыль — облачком у кончика: кирка по руде и перфоратор — искры, по камню — пыль; молоток и дрель — опилки.
      strike: function (tool, cls, x, y, z, dx, dz, hex) {
        const hot = cls === 'metal' || cls === 'gold';
        const n = hot ? (tool === 'hammer' || tool === 'drill' ? 2 : 3) : tool === 'rotary' ? 1 : 0;
        for (let i = 0; i < n; i++) {
          const a = Math.atan2(-dx, -dz) + (Math.random() - 0.5) * 2.2;
          const v = 1.5 + Math.random();
          emit(sparks, x, y, z, Math.sin(a) * v, 1 + Math.random(), Math.cos(a) * v, 0.22 + Math.random() * 0.1, 0,
            cls === 'gold' ? 0xffd23a : 0xff9a2e);
        }
        // Опилки дерева, светлая пыль стекла, пыль камня и руды с оттенком материала.
        if (cls === 'wood') tint.setHex(0xe8d2a2);
        else if (cls === 'glass') tint.setHex(0xf4f2ec);
        else tint.setHex(0xe9dfcc).lerp(color.setHex(hex), cls === 'stone' ? 0.35 : 0.2);
        const count = tool === 'pick' ? (hot ? 1 : 3) : 2;
        for (let i = 0; i < count; i++) {
          // Дрель выплёвывает стружку вбок, остальное — облачко вокруг кончика.
          const side = tool === 'drill' ? (i % 2 ? 1 : -1) * 0.7 : 0;
          const a = Math.random() * 6.28;
          const r = tool === 'drill' ? 0.15 : 0.45;
          emit(grit, x, y + 0.02, z, dz * side + Math.cos(a) * r, 0.3 + Math.random() * 0.2, -dx * side + Math.sin(a) * r,
            0.4 + Math.random() * 0.15, 0, tint.getHex());
        }
      },

      // Шлейф бега: клубок мелкой пыли из-под ног позади бегущего, (dx, dz) — куда он бежит.
      trail: function (x, y, z, dx, dz) {
        emit(grit, x - dx * 0.12, y + 0.05, z - dz * 0.12, -dx * 0.35 + (Math.random() - 0.5) * 0.3, 0.2,
          -dz * 0.35 + (Math.random() - 0.5) * 0.3, 0.5 + Math.random() * 0.15, 0, dustHex(y));
      },

      // Аврал: on — идёт ли, box — footprint уровня, run — крутить (на паузе луч замирает), night — 0..1, ночью луч ярче.
      // Мигалки встают у углов стройки за лесами: 4, у маленьких зданий 2 — слева и справа по ракурсу по умолчанию.
      rush: function (on, box, run, night) {
        beacon.on = on;
        beacon.run = run;
        beacon.night = night;
        if (!on || box === beacon.box) return;
        beacon.box = box;
        const size = Math.max(box.maxX - box.minX, box.maxZ - box.minZ) + 1;
        beacon.n = size >= 4 ? 4 : 2;
        beacon.s = Math.min(1.8, Math.max(1, size / 8));
        const x0 = box.minX - 1.45;
        const x1 = box.maxX + 2.45;
        const z0 = box.minZ - 1.45;
        const z1 = box.maxZ + 2.45;
        beacon.x[0] = x1; beacon.z[0] = z0;
        beacon.x[1] = x0; beacon.z[1] = z1;
        beacon.x[2] = x0; beacon.z[2] = z0;
        beacon.x[3] = x1; beacon.z[3] = z1;
      },

      // Ярус закрыт. list — внешние рёбра [x, z, nx, nz, …] (середина ребра и наружу), y — низ яруса, cx/cz — центр здания.
      // Кромка поверху вспыхивает, по низу идёт волна пыли вокруг здания (до 28 клубков за 0,45 с).
      tier: function (list, y, cx, cz) {
        const n = Math.min(EDGES, list.length / 4);
        for (let i = 0; i < n; i++) {
          const o = i * 4;
          dummy.position.set(list[o] + list[o + 2] * 0.04, y + 1, list[o + 1] + list[o + 3] * 0.04);
          dummy.rotation.set(0, 0, 0);
          if (list[o + 2] !== 0) dummy.scale.set(0.12, 0.12, 1.06);
          else dummy.scale.set(1.06, 0.12, 0.12);
          dummy.updateMatrix();
          edges.setMatrixAt(i, dummy.matrix);
        }
        edges.count = n;
        edges.instanceMatrix.needsUpdate = true;
        edges.visible = n > 0;
        edgeT = 0.35;
        const step = Math.max(1, Math.ceil(n / 28));
        for (let i = 0; i < n; i += step) {
          const o = i * 4;
          const wait = (Math.atan2(list[o + 1] - cz, list[o] - cx) + Math.PI) / (2 * Math.PI) * 0.45;
          emit(dust, list[o] + list[o + 2] * 0.15, y + 0.15, list[o + 1] + list[o + 3] * 0.15, list[o + 2] * 0.8, 0.3, list[o + 3] * 0.8, 0.6, wait, dustHex(y));
        }
      },

      // Финал: три залпа конфетти за 1,1 с над зданием; radius — полуразмер здания, от него разлёт и размер.
      confetti: function (x, y, z, radius) {
        salvo.x = x;
        salvo.y = y;
        salvo.z = z;
        salvo.radius = radius;
        salvo.left = 2;
        salvo.t = SALVO;
        fireSalvo(0);
      },

      // Флажок на крыше (x, y, z — верх блока под древком), scale — от размера здания. Вырастает с отскоком.
      flag: function (x, y, z, scale) {
        flag.position.set(x, y, z);
        flag.rotation.y = Math.atan2(getCamera().position.x - x, getCamera().position.z - z) + 0.5; // полотнище к камере вполоборота
        flagScale = scale;
        flagT = 0;
        flag.scale.setScalar(0.001);
        flag.visible = true;
      },

      // «+N» тает вверх над точкой мира, монета летит по дуге (кривая Безье) в счётчик, счётчик подпрыгивает.
      // Точка старта на HUD — без числа, только полёт. Не больше 10 в полёте: лишнее прибавляется к последней.
      coin: function (x, y, z, value) {
        const target = document.querySelector('#coins em') || document.getElementById('coin-value');
        if (!target) return;
        const rect = target.getBoundingClientRect();
        if (rect.width === 0) return;
        let slot = null;
        for (let i = 0; i < COINS; i++) {
          if (!coinNodes[i].busy) {
            slot = coinNodes[i];
            break;
          }
        }
        if (!slot) {
          lastCoin.value += value;
          lastCoin.gain.textContent = '+' + format(lastCoin.value);
          return;
        }
        point.set(x, y, z).project(getCamera());
        if (point.z > 1) return;
        const x0 = (point.x + 1) * 0.5 * window.innerWidth;
        const y0 = (1 - point.y) * 0.5 * window.innerHeight;
        const x2 = rect.left + rect.width * 0.5;
        const y2 = rect.top + rect.height * 0.5;
        // Контрольная точка: выше старта и чуть назад от цели — монета сперва взлетает, потом заворачивает в счётчик.
        const x1 = x0 - (x2 - x0) * 0.2;
        const y1 = Math.min(y0, y2) - Math.max(60, Math.abs(y0 - y2) * 0.3);
        const frames = [];
        for (let k = 0; k <= 10; k++) {
          const t = k / 10;
          const s = t * (0.4 + 0.6 * t); // разгон к счётчику
          const a = (1 - s) * (1 - s);
          const b = 2 * (1 - s) * s;
          const c = s * s;
          const scale = k === 0 ? 0.5 : k < 3 ? 1.1 : 1.1 - 0.4 * t;
          frames.push({
            transform: 'translate(' + (a * x0 + b * x1 + c * x2).toFixed(1) + 'px,' + (a * y0 + b * y1 + c * y2).toFixed(1) + 'px) translate(-50%,-50%) scale(' + scale.toFixed(2) + ')',
            opacity: k === 0 ? 0 : 1,
          });
        }
        slot.busy = true;
        slot.value = value;
        slot.fly.animate(frames, 750).onfinish = function () { arrive(slot); };
        if (!onHud(x0, y0)) {
          slot.gain.textContent = '+' + format(value);
          const from = 'translate(' + x0.toFixed(1) + 'px,' + y0.toFixed(1) + 'px) translate(-50%,-100%)';
          slot.gain.animate([
            { transform: from + ' translateY(0)', opacity: 0 },
            { transform: from + ' translateY(-14px)', opacity: 1, offset: 0.2 },
            { transform: from + ' translateY(-40px)', opacity: 0 },
          ], { duration: 850, easing: 'ease-out' });
        }
        lastCoin = slot;
      },

      flashBar: flashBar,

      fillBegin: function () {
        for (let i = 0; i < fillList.length; i++) fillList[i].used = 0;
      },

      // Заливка внутри блока: коробка 0,85 растёт от низа клетки; в конце её сменяет блок с тем же стартовым масштабом 0,85.
      fill: function (materialId, x, y, z, fraction) {
        let f = fills[materialId];
        if (!f) {
          const material = MicroBuildersBlocks.plain(materialId);
          material.metalness *= 0.35; // чистый металл на заливке темнеет от окружения: оттенок материала читается хуже
          const mesh = new THREE.InstancedMesh(fillGeo, material, FILL_CAP);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.frustumCulled = false;
          mesh.count = 0;
          scene.add(mesh);
          f = fills[materialId] = { mesh: mesh, used: 0 };
          fillList.push(f);
        }
        if (f.used >= FILL_CAP) return;
        dummy.position.set(x + 0.5, y + 0.075, z + 0.5);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.85, Math.max(0.001, 0.85 * fraction), 0.85);
        dummy.updateMatrix();
        f.mesh.setMatrixAt(f.used++, dummy.matrix);
      },

      fillEnd: function () {
        for (let i = 0; i < fillList.length; i++) {
          const f = fillList[i];
          f.mesh.count = f.used;
          f.mesh.visible = f.used > 0;
          if (f.used > 0) f.mesh.instanceMatrix.needsUpdate = true;
        }
      },

      update: function (dt) {
        stepPool(chips, dt, 6, 0, false);
        stepPool(confettiPool, dt, 5, 1.4, true);
        stepPoints(dust, dt, 0, 2.5);
        stepPoints(sparks, dt, 7, 0);
        stepPoints(glints, dt, 0, 0);
        stepPoints(smoke, dt, -0.3, 0.8);
        stepPoints(grit, dt, -0.25, 4);
        stepBeacons(dt);
        if (salvo.left > 0) {
          salvo.t -= dt;
          if (salvo.t <= 0) {
            fireSalvo(3 - salvo.left);
            salvo.left--;
            salvo.t = SALVO;
          }
        }
        if (edges.visible) {
          edgeT -= dt;
          const u = Math.max(0, edgeT) / 0.35;
          edgeMaterial.opacity = u * u;
          edges.visible = edgeT > 0;
        }
        if (flag.visible) {
          flagT += dt;
          const u = Math.min(1, flagT / 0.4) - 1; // рост с отскоком (easeOutBack)
          flag.scale.setScalar(flagScale * Math.max(0.001, 1 + 2.7 * u * u * u + 1.7 * u * u));
          for (let i = 0; i < clothPos.count; i++) {
            const k = (clothPos.getX(i) - 0.03) / 0.9; // 0 у древка, 1 на свободном краю
            const phase = flagT * 7 - k * 5;
            clothPos.setZ(i, Math.sin(phase) * 0.11 * k);
            // Нормаль волны z(x) считаем сразу: computeVertexNormals заводит векторы на каждый вызов.
            const slope = 0.11 * (Math.sin(phase) - 5 * k * Math.cos(phase)) / 0.9;
            const len = Math.sqrt(1 + slope * slope);
            clothNormal.setXYZ(i, -slope / len, 0, 1 / len);
          }
          clothPos.needsUpdate = true;
          clothNormal.needsUpdate = true;
        }
      },

      // Флажок стоит до смены уровня и не мешает гасить остальное на ×20.
      busy: function () {
        return chips.mesh.visible || confettiPool.mesh.visible || dust.points.visible || sparks.points.visible ||
          glints.points.visible || smoke.points.visible || grit.points.visible || edges.visible || salvo.left > 0 ||
          (beacon.k > 0 && !beacon.on);
      },

      // ×20 и смена уровня: всё сразу пропадает. Монеты в HUD долетают сами.
      clear: function () {
        clearPool(chips);
        clearPool(confettiPool);
        clearPoints(dust);
        clearPoints(sparks);
        clearPoints(glints);
        clearPoints(smoke);
        clearPoints(grit);
        beacon.on = false;
        beacon.k = 0;
        beacon.box = null;
        beaconBody.visible = false;
        beaconLens.visible = false;
        beaconBeam.visible = false;
        salvo.left = 0;
        edges.visible = false;
        flag.visible = false;
      },
    };
  }

  window.MicroBuildersFx = { create: create, popScale: popScale, kind: kind, glass: glass, flashBar: flashBar };
})();
