// Декор снабжения карьера: самосвал и поддоны с блоками на въезде, столы планирования рабочих; грязь и сколы на краске
// техники (grime — и для машин game.js через dirty()). Всё из примитивов; неподвижные части склеены в одну геометрию
// с цветами вершин. Только вид: состояние стройки не читает и не меняет.
(function () {
  const Blocks = MicroBuildersBlocks;
  const C = {
    yellow: 0xf2b21c,
    yellowDark: 0xc98d12,
    dark: 0x2a2c2f,
    tire: 0x161718,
    lug: 0x36332f, // грунтозацепы светлее шины: стёрты и в пыли, протектор читается
    beacon: 0xff7a14,
    strap: 0x35587f,
    strapLight: 0xd9d3c2, // на синем материале синий ремень теряется
    glass: 0x2c4352,
    steel: 0x9aa1a8,
    light: 0xfff1c2,
    red: 0xb8322a,
    wood: 0xb07a45,
    woodDark: 0x7f532c,
    white: 0xffffff,
  };
  // Самосвал: цикл разгрузки по времени, с. Разгружается изредка: раз в 24 с, остальное время стоит.
  const DUMP = { period: 24, up: 16, top: 17.6, slide: 17.8, down: 20.2, flat: 21.6, refill: 22.6 };
  const TILT = 0.85;
  let shared = null;
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const tint = new THREE.Color();
  const dummy = new THREE.Object3D();
  const m4 = new THREE.Matrix4();
  let decor = null;
  // Ночь (0..1, часы стройки — night()): фары и лампы светятся только ночью; uniform общий для всей краски.
  const NIGHT = { value: 0 };

  // Атлас 256×128: левая половина белая (цвет даёт вершина), правая — чёткие чёрно-жёлтые сигнальные полосы с потёртой кромкой.
  function stripeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const g = canvas.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#f2b21c';
    g.fillRect(128, 0, 128, 128);
    g.fillStyle = '#1d1e20';
    for (let k = -128; k < 256; k += 64) {
      g.beginPath();
      g.moveTo(128 + k, 128);
      g.lineTo(160 + k, 128);
      g.lineTo(288 + k, 0);
      g.lineTo(256 + k, 0);
      g.closePath();
      g.fill();
    }
    g.strokeStyle = 'rgba(255,240,190,0.28)';
    g.lineWidth = 3;
    g.strokeRect(130, 2, 124, 124);
    // Полосы не должны залезать в белую половину.
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.userData.shared = true;
    return texture;
  }

  // Коробка в список частей; stripe — грани берут полосы из атласа.
  // Чертёж 512×288: синяя калька с миллиметровкой, сгибами листа, фасадом с кладкой, планом, осевыми линиями и штампом.
  function blueprintTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 288;
    const g = canvas.getContext('2d');
    const bg = g.createRadialGradient(256, 144, 30, 256, 144, 300);
    bg.addColorStop(0, '#417fb8');
    bg.addColorStop(1, '#2d6296');
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 288);
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 8; x < 512; x += 8) {
      g.moveTo(x + 0.5, 0);
      g.lineTo(x + 0.5, 288);
    }
    for (let y = 8; y < 288; y += 8) {
      g.moveTo(0, y + 0.5);
      g.lineTo(512, y + 0.5);
    }
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.beginPath();
    for (let x = 16; x < 512; x += 32) {
      g.moveTo(x + 0.5, 0);
      g.lineTo(x + 0.5, 288);
    }
    for (let y = 16; y < 288; y += 32) {
      g.moveTo(0, y + 0.5);
      g.lineTo(512, y + 0.5);
    }
    g.stroke();
    // Сгибы бумажного листа.
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(256, 12);
    g.lineTo(256, 276);
    g.moveTo(12, 144);
    g.lineTo(500, 144);
    g.stroke();
    g.strokeStyle = '#eef6ff';
    g.lineJoin = 'round';
    g.lineWidth = 4;
    g.strokeRect(12, 12, 488, 264);
    g.lineWidth = 1.5;
    g.strokeRect(18, 18, 476, 252);
    // Главный фасад с зубцами, аркой ворот, окнами с переплётом и отметками высот.
    g.lineWidth = 3.5;
    g.beginPath();
    g.moveTo(60, 224);
    g.lineTo(60, 56);
    for (let i = 0; i < 6; i++) {
      const x = 60 + i * 44;
      g.lineTo(x + 22, 56);
      g.lineTo(x + 22, 80);
      g.lineTo(x + 44, 80);
      g.lineTo(x + 44, 56);
    }
    g.lineTo(324, 224);
    g.closePath();
    g.moveTo(168, 224);
    g.lineTo(168, 168);
    g.arc(192, 168, 24, Math.PI, 0);
    g.lineTo(216, 224);
    g.rect(92, 116, 32, 32);
    g.rect(260, 116, 32, 32);
    g.rect(368, 56, 104, 104);
    g.moveTo(420, 56);
    g.lineTo(420, 120);
    g.lineTo(472, 120);
    g.stroke();
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(108, 116); g.lineTo(108, 148); g.moveTo(92, 132); g.lineTo(124, 132);
    g.moveTo(276, 116); g.lineTo(276, 148); g.moveTo(260, 132); g.lineTo(292, 132);
    g.moveTo(192, 144); g.lineTo(192, 224);
    g.rect(376, 64, 88, 88);
    // Размерные линии и штамп чертежа.
    g.lineWidth = 2.5;
    g.moveTo(60, 252);
    g.lineTo(324, 252);
    g.moveTo(60, 240);
    g.lineTo(60, 264);
    g.moveTo(324, 240);
    g.lineTo(324, 264);
    g.rect(368, 192, 104, 60);
    g.moveTo(368, 216);
    g.lineTo(472, 216);
    g.moveTo(368, 234);
    g.lineTo(472, 234);
    g.moveTo(412, 216);
    g.lineTo(412, 252);
    g.stroke();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.userData.shared = true;
    return texture;
  }

  function box(parts, w, h, d, x, y, z, color, stripe) {
    const geo = new THREE.BoxGeometry(w, h, d);
    geo.translate(x, y, z);
    parts.push([geo, color, stripe]);
  }

  // Склейка частей в одну геометрию: позиции, нормали, цвета вершин и uv атласа.
  // Метки в u белой половины атласа для grime(): 0,05 стекло, 0,15 фонарь, 0,25 краска техники, 0,35 дерево и прочее
  // без сколов (wood — поддоны, столы, ремни).
  function merge(parts, wood) {
    const base = wood ? 0.35 : 0.25;
    let count = 0;
    const flat = parts.map(function (part) {
      const geo = part[0].index ? part[0].toNonIndexed() : part[0];
      count += geo.attributes.position.count;
      return geo;
    });
    const position = new Float32Array(count * 3);
    const normal = new Float32Array(count * 3);
    const color = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    const tint = new THREE.Color();
    let at = 0;
    flat.forEach(function (geo, i) {
      const n = geo.attributes.position.count;
      const src = geo.attributes.uv.array;
      position.set(geo.attributes.position.array, at * 3);
      normal.set(geo.attributes.normal.array, at * 3);
      tint.set(parts[i][1]);
      for (let k = 0; k < n; k++) {
        color[(at + k) * 3] = tint.r;
        color[(at + k) * 3 + 1] = tint.g;
        color[(at + k) * 3 + 2] = tint.b;
        const c = parts[i][1];
        const isWood = c === C.wood || c === C.woodDark || c === 0xc08a52 || c === 0xd9b07a || c === 0xc4915a;
        uv[(at + k) * 2] = parts[i][2] ? 0.5 + src[k * 2] * 0.5 : c === C.glass ? 0.05 : c === C.light || c === C.beacon ? 0.15 : isWood ? 0.35 : (wood ? 0.44 : base);
        uv[(at + k) * 2 + 1] = parts[i][2] ? src[k * 2 + 1] : 0.5;
      }
      at += n;
      geo.dispose();
      parts[i][0].dispose();
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(position, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    out.setAttribute('color', new THREE.BufferAttribute(color, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.computeBoundingSphere();
    return out;
  }

  function disc(parts, x, y, z, radius, width, segments, color) {
    const geo = new THREE.CylinderGeometry(radius, radius, width, segments);
    geo.rotateZ(Math.PI / 2);
    geo.translate(x, y, z);
    parts.push([geo, color]);
  }

  // Колесо с глубоким протектором: шина, боковина, грунтозацепы ёлочкой, жёлтый диск с тёмной чашкой. Ось колеса — x.
  function wheel(parts, x, y, z, radius, width) {
    disc(parts, x, y, z, radius * 0.86, width, 20, C.tire);
    disc(parts, x, y, z, radius * 0.8, width + 0.016, 20, 0x242527);
    const lugs = 14;
    for (let i = 0; i < lugs; i++) {
      const a = (i / lugs) * Math.PI * 2;
      for (let s = -1; s <= 1; s += 2) {
        const lug = new THREE.BoxGeometry(width * 0.48, radius * 0.22, radius * 0.22);
        lug.rotateY(s * 0.42);
        lug.translate(s * width * 0.25, radius * 0.92, 0);
        lug.rotateX(a + (s > 0 ? Math.PI / lugs : 0));
        lug.translate(x, y, z);
        parts.push([lug, C.lug]);
      }
    }
    disc(parts, x, y, z, radius * 0.5, width + 0.03, 14, C.yellow);
    disc(parts, x, y, z, radius * 0.36, width + 0.044, 12, C.yellowDark);
    disc(parts, x, y, z, radius * 0.17, width + 0.06, 8, C.dark);
  }

  // real: техника в карьере — снизу присохшая пыль пятнами и подтёками (по высоте в мире: все машины стоят на земле),
  // мелкие потёртости по краске; стекло гладкое и отражает небо.
  // Узор грязи и сколов — по координатам детали (vMbLocal), чтобы не «плыл» по едущей машине; высота грязи — по миру.
  function grime(shader) {
    shader.uniforms.mbNight = NIGHT;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMbGrime;\nvarying vec3 vMbLocal;')
      .replace('#include <worldpos_vertex>', [
        '#include <worldpos_vertex>',
        'vMbLocal = transformed;',
        'vec4 mbG = vec4( transformed, 1.0 );',
        '#ifdef USE_INSTANCING',
        'mbG = instanceMatrix * mbG;',
        '#endif',
        'vMbGrime = ( modelMatrix * mbG ).xyz;',
      ].join('\n'));
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMbGrime;\nvarying vec3 vMbLocal;\nuniform float mbNight;\n' + Blocks.noise)
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        // Метка вида в u белой половины атласа; у машин game.js атласа нет — метка в define MB_U (dirty()).
        '#ifdef USE_MAP',
        'float mbU = vMapUv.x;',
        '#else',
        'float mbU = MB_U;',
        '#endif',
        'float mbGlass = step( mbU, 0.1 );',
        'float mbLamp = step( 0.1, mbU ) * step( mbU, 0.2 );',
        'float mbWood = step( 0.3, mbU ) * step( mbU, 0.5 );',
        'float mbBoard = step( 0.3, mbU ) * step( mbU, 0.4 );',
        'float mbPaint = 1.0 - mbGlass - mbLamp - mbWood;',
        // Волокна, годовые кольца, сучки и тёмные торцы спила на досках поддонов и столов планирования (mbBoard).
        'vec3 mbLNorm = normalize( cross( dFdx( vMbLocal ), dFdy( vMbLocal ) ) );',
        'float mbEnd = smoothstep( 0.65, 0.85, abs( mbLNorm.x ) );',
        'float mbWg = sin( ( ( vMbLocal.z * 32.0 + vMbLocal.y * 24.0 ) + mbNoise( vMbLocal * vec3( 3.5, 16.0, 16.0 ) ) * 5.0 ) * 3.14159 );',
        'float mbRing = sin( length( vMbLocal.yz * 28.0 + mbNoise( vMbLocal * 12.0 ) * 2.5 ) * 3.14159 );',
        'float mbWk = smoothstep( 0.76, 0.87, mbNoise( vMbLocal * vec3( 8.0, 10.0, 10.0 ) + 2.3 ) );',
        'float mbSeam = smoothstep( 0.92, 0.98, abs( sin( vMbLocal.z * 20.1 ) ) );',
        'diffuseColor.rgb *= 1.0 + mbBoard * ( mix( 0.09 * mbWg, 0.11 * mbRing - 0.14, mbEnd ) - 0.26 * mbWk - 0.12 * mbSeam );',
        // Сколы и подтёки — только по жёлтой краске техники: тёмный металл пятнами, вертикальные потёки грязи.
        'float mbYel = mbPaint * smoothstep( 0.3, 0.6, diffuseColor.r - diffuseColor.b );',
        // Сколы редкие: мелкий шум только там, где крупный (3/м) уже высок, — несколько потёртых мест, а не «леопард».
        'float mbC = mbNoise( vMbLocal * 22.0 ) * 0.5 + mbNoise( vMbLocal * 3.0 ) * 0.5;',
        'diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.07, 0.06, 0.05 ), mbYel * smoothstep( 0.8, 0.83, mbC ) * 0.7 );',
        // Потёки только по боковым граням: на крыше и капоте тот же шум даёт «губку» из точек.
        'float mbSide = smoothstep( 0.6, 0.3, abs( normalize( cross( dFdx( vMbGrime ), dFdy( vMbGrime ) ) ).y ) );',
        'diffuseColor.rgb *= 1.0 - 0.22 * mbYel * mbSide * smoothstep( 0.55, 0.9, mbNoise( vec3( vMbLocal.x * 30.0, vMbLocal.y * 1.6, vMbLocal.z * 30.0 ) ) );',
        // Присохшая грязь снизу и редкие брызги над ней; у земли темнее.
        'float mbN = mbNoise( vMbLocal * vec3( 7.0, 2.5, 7.0 ) );',
        'float mbSolid = 1.0 - mbGlass - mbLamp;',
        // Корка грязи с рваной кромкой на 0,3–0,65 м: колёса и низ кузова, выше — чисто.
        'float mbH = 0.42 + 0.22 * mbN;',
        'float mbMud = mbSolid * smoothstep( mbH, mbH - 0.14, vMbGrime.y ) * ( 0.55 + 0.35 * mbN ) * ( 1.0 - 0.6 * mbWood );',
        'mbMud = max( mbMud, mbPaint * smoothstep( 0.8, 0.84, mbNoise( vMbLocal * 11.0 ) ) * smoothstep( 0.9, 0.5, vMbGrime.y ) * 0.5 );',
        'diffuseColor.rgb = mix( diffuseColor.rgb, mix( vec3( 0.17, 0.115, 0.06 ), vec3( 0.085, 0.055, 0.03 ), smoothstep( 0.45, 0.05, vMbGrime.y ) ), mbMud );',
        'diffuseColor.rgb *= 1.0 - 0.05 * mbSolid * mbNoise( vMbLocal * 8.0 );',
      ].join('\n'))
      .replace('#include <roughnessmap_fragment>', [
        '#include <roughnessmap_fragment>',
        'roughnessFactor = mix( roughnessFactor, clamp( 0.82 - 0.08 * mbWg + 0.12 * mbWk + 0.08 * mbEnd, 0.55, 0.98 ), mbBoard );',
        'roughnessFactor = mix( mix( mix( roughnessFactor, 1.0, min( 1.0, mbMud * 1.6 ) ), 0.06, mbGlass ), 0.2, mbLamp );',
      ].join('\n'))
      .replace('#include <emissivemap_fragment>', [
        '#include <emissivemap_fragment>',
        // Блики на стекле: косая узкая полоса и широкая слабая рядом — читается как отражение неба под любым светом.
        'float mbS = ( vMbLocal.x + vMbLocal.z ) * 1.4 + vMbLocal.y * 2.2;',
        'float mbBand = 1.0 - smoothstep( 0.025, 0.07, abs( fract( mbS ) - 0.5 ) );',
        'mbBand += 0.4 * ( 1.0 - smoothstep( 0.05, 0.12, abs( fract( mbS + 0.2 ) - 0.5 ) ) );',
        'totalEmissiveRadiance += mbGlass * mbBand * vec3( 0.36, 0.44, 0.5 );',
        'totalEmissiveRadiance += mbLamp * diffuseColor.rgb * mbNight * 2.4;',
      ].join('\n'));
  }

  // Мягкая тень-пятно под предметом (art/quarry.js): w, d — размер по x и z в единицах parent.
  function blob(parent, x, z, w, d, turn) {
    const m = MicroBuildersQuarry.blob();
    m.position.set(x, 0.012, z);
    m.rotation.y = turn || 0;
    m.scale.set(w, 1, d);
    parent.add(m);
  }

  function mesh(geometry, material, parent, shadow) {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = shadow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function smooth(t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return t * t * (3 - 2 * t);
  }

  // Поддоны 2×2×2 с блоками: places — [{x, z, turn, materialId}], центр поддона в мире.
  function pallets(places, parent) {
    if (!shared) build();
    // Один меш на все поддоны вызова: настил, стяжные ремни с пряжками (кроме каждого третьего поддона)
    // и щепа с каменной крошкой на земле вокруг. Первым в parent — art/mech.js берёт материал блоков как children[1].
    const extra = [];
    places.forEach(function (place, i) {
      const parts = [];
      // Поддон: настил из досок на трёх брусках.
      for (let k = 0; k < 5; k++) box(parts, 0.98, 0.04, 0.16, 0, 0.16, (k - 2) * 0.205, k % 2 ? C.wood : C.woodDark);
      for (let k = -1; k <= 1; k++) box(parts, 0.12, 0.1, 0.98, k * 0.43, 0.07, 0, C.woodDark);
      for (let k = -1; k <= 1; k += 2) box(parts, 0.98, 0.03, 0.12, 0, 0.015, k * 0.42, C.wood);
      if (i % 3 !== 0) {
        const spec = window.MicroBuilders && window.MicroBuilders.MATERIAL[place.materialId];
        const blue = !!spec && (spec.color & 255) > ((spec.color >> 16) & 255) + 40;
        const strap = blue ? C.strapLight : C.strap;
        for (let s = -1; s <= 1; s += 2) {
          box(parts, 0.9, 0.012, 0.045, 0, 1.048, s * 0.22, strap);
          for (let e = -1; e <= 1; e += 2) box(parts, 0.012, 0.88, 0.045, e * 0.443, 0.61, s * 0.22, strap);
          box(parts, 0.018, 0.05, 0.066, 0.452, 0.48, s * 0.22, C.steel);
        }
      }
      let seed = Math.abs(Math.round(place.x * 37 + place.z * 91)) + i * 7 + 1;
      const rand = function () {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      for (let k = 0; k < 18; k++) {
        const a = rand() * Math.PI * 2;
        const r = 0.56 + rand() * rand() * 0.5;
        const dust = k % 3 === 2;
        const chip = new THREE.BoxGeometry(dust ? 0.025 : 0.035 + rand() * 0.05, 0.008, dust ? 0.025 : 0.016 + rand() * 0.022);
        chip.rotateY(rand() * Math.PI);
        chip.translate(Math.sin(a) * r, 0.004, Math.cos(a) * r);
        parts.push([chip, dust ? 0xb9ae9c : k % 2 ? 0xd9b07a : 0xc4915a]);
      }
      parts.forEach(function (p) {
        p[0].rotateY(place.turn);
        p[0].translate(place.x, 0, place.z);
        extra.push(p);
      });
    });
    const base = new THREE.Mesh(merge(extra, true), shared.paint);
    base.castShadow = true;
    base.receiveShadow = true;
    parent.add(base);
    dummy.scale.setScalar(1);
    const byMaterial = new Map();
    places.forEach(function (place) {
      if (!byMaterial.has(place.materialId)) byMaterial.set(place.materialId, []);
      byMaterial.get(place.materialId).push(place);
    });
    byMaterial.forEach(function (list, materialId) {
      const blocks = new THREE.InstancedMesh(shared.palletBlock, Blocks.material(materialId, 0), list.length * 8);
      blocks.castShadow = true;
      blocks.receiveShadow = true;
      let n = 0;
      list.forEach(function (place) {
        for (let k = 0; k < 8; k++) {
          const look = Blocks.look(Math.round(place.x) + k, k >> 2, Math.round(place.z));
          v2.set(((k & 1) - 0.5) * 0.44, 0.39 + (k >> 2) * 0.44, (((k >> 1) & 1) - 0.5) * 0.44);
          v2.applyAxisAngle(THREE.Object3D.DEFAULT_UP, place.turn);
          dummy.position.set(place.x + v2.x, v2.y, place.z + v2.z);
          dummy.rotation.set(0, place.turn + look.turn, 0);
          dummy.updateMatrix();
          blocks.setMatrixAt(n, dummy.matrix);
          blocks.setColorAt(n, tint.setScalar(look.tint));
          n += 1;
        }
      });
      parent.add(blocks);
    });
    // Пятна после блоков.
    places.forEach(function (place) { blob(parent, place.x, place.z, 1.3, 1.3, place.turn); });
  }

  // Стол планирования рабочего: x, z — центр его клетки, стол стоит перед ней (+z). Два меша: стол и чертёж.
  function desk(x, z, parent) {
    if (!shared) build();
    const k = Math.abs(Math.round(x) + Math.round(z)) % 2;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    mesh(shared.desks[k], shared.paint, group, true);
    blob(group, 0, 0.64, 1.1, 0.75);
    const sheet = mesh(shared.sheet, shared.blueprint, group, false);
    sheet.position.set(0, 0.522, 0.64);
    sheet.rotation.y = k ? -0.03 : 0.03;
    parent.add(group);
  }

  // Самосвал стоит на въезде в карьер и изредка опрокидывает кузов: блоки съезжают, падают на землю
  // и потом пропадают, кузов опускается и снова «загружен».
  function truck(x, z, turn, materialId, parent) {
    if (!shared) build();
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = turn;
    mesh(shared.truck, shared.paint, group, true);
    blob(group, 0, -0.1, 1.6, 3.3);
    const bed = new THREE.Group();
    bed.position.set(0, 0.76, -1.5);
    group.add(bed);
    mesh(shared.bed, shared.paint, bed, true);
    const blocks = new THREE.InstancedMesh(shared.truckBlock, Blocks.material(materialId, 1), 8);
    blocks.castShadow = true;
    blocks.receiveShadow = true;
    blocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(blocks);
    parent.add(group);
    const slots = [];
    for (let k = 0; k < 8; k++) {
      // Слоты в системе кузова: 2 в ширину, 2 в длину, 2 в высоту; лёгкий разброс, чтобы груз не был идеальным кубом.
      const jitter = Math.sin(k * 12.9898) * 0.04;
      slots.push({ x: ((k & 1) - 0.5) * 0.54 + jitter, y: 0.33 + (k >> 2) * 0.5, z: 0.73 + ((k >> 1) & 1) * 0.54, turn: jitter * 3, lag: (k >> 2) * -0.12 + ((k >> 1) & 1) * 0.1 });
    }
    // Матрица поднятого кузова: от неё считаются точки схода, чтобы упавшие блоки не ездили, пока кузов опускается.
    const raised = new THREE.Matrix4().compose(bed.position, new THREE.Quaternion().setFromEuler(new THREE.Euler(-TILT, 0, 0)), new THREE.Vector3(1, 1, 1));
    decor = { group: group, bed: bed, raised: raised, blocks: blocks, slots: slots, phase: 3 + (Math.abs(x * 7 + z * 3) % 5), dusted: false, hit: new THREE.Vector3(), smokeAt: -1, pipe: new THREE.Vector3() };
    group.userData.phase = decor.phase;
    animateTruck(0);
    return group;
  }

  // Кадр самосвала по времени. Блоки ссыпаются, касаются земли и подпрыгивают: высокий отскок и низкий.
  // Возвращает точку в мире в кадр первого касания кучки (game.js пускает один клубок пыли), иначе null.
  function animateTruck(time) {
    if (!decor) return null;
    let hit = null;
    const t = (time + decor.phase) % DUMP.period;
    if (t < DUMP.slide) decor.dusted = false;
    // Опускается с разгоном (пустой кузов падает на раму), потом подпрыгивает на ней; пока груз съезжает — дрожит.
    const drop = Math.min(1, Math.max(0, (t - DUMP.down) / (DUMP.flat - DUMP.down)));
    const tilt = t < DUMP.up ? 0 : t < DUMP.top ? smooth((t - DUMP.up) / (DUMP.top - DUMP.up)) * TILT
      : t < DUMP.down ? TILT : (1 - drop * drop) * TILT;
    const landed = t - DUMP.flat;
    const bounce = landed > 0 && landed < 1 ? Math.abs(Math.sin(landed * 13)) * Math.exp(-landed * 5) * 0.06 : 0;
    const slid = t - DUMP.slide;
    const rattle = slid > 0 && slid < 1.6 ? Math.sin(slid * 41) * Math.exp(-slid * 2.2) * 0.012 : 0;
    decor.bed.rotation.x = -(tilt + bounce + rattle);
    decor.bed.position.y = 0.76 + bounce * 0.5;
    decor.bed.updateMatrix();
    const bedEnd = -0.05;
    for (let k = 0; k < decor.slots.length; k++) {
      const slot = decor.slots[k];
      let scale = 1;
      const since = t - DUMP.slide - slot.lag;
      if (since <= 0 || t >= DUMP.refill) {
        // В кузове: до разгрузки и в момент наклона.
        if (t >= DUMP.refill) scale = smooth((t - DUMP.refill - (k >> 2) * 0.2) / 0.5);
        dummy.position.set(slot.x, slot.y, slot.z);
        dummy.rotation.set(0, slot.turn, 0);
        dummy.scale.setScalar(Math.max(scale, 0.001));
        dummy.updateMatrix();
        m4.multiplyMatrices(decor.bed.matrix, dummy.matrix);
        decor.blocks.setMatrixAt(k, m4);
        continue;
      }
      // Съезжает по наклонённому дну с ускорением, затем падает с края кузова.
      const accel = 3.2;
      const run = slot.z - bedEnd;
      const leave = Math.sqrt((2 * run) / accel);
      if (since < leave) {
        dummy.position.set(slot.x, slot.y, slot.z - 0.5 * accel * since * since);
        dummy.rotation.set(0, slot.turn, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        m4.multiplyMatrices(decor.bed.matrix, dummy.matrix);
        decor.blocks.setMatrixAt(k, m4);
        continue;
      }
      // Точка и скорость схода в системе самосвала (кузов в это время уже поднят на TILT).
      const speed = accel * leave;
      v1.set(slot.x, slot.y, bedEnd).applyMatrix4(decor.raised);
      const vz = -speed * Math.cos(TILT);
      const vy = -speed * Math.sin(TILT);
      // Время до земли (центр блока на 0,25): v1.y + vy·τ − 4,9·τ² = 0,25.
      const land = (vy + Math.sqrt(vy * vy + 19.6 * (v1.y - 0.25))) / 9.8;
      const fall = Math.min(since - leave, land);
      // После касания: отскок 0,14 за 0,3 с и 0,04 за 0,15 с, блок ещё чуть катится от кузова.
      const after = since - leave - land;
      let hop = 0;
      if (after > 0 && after < 0.45) {
        const s = after < 0.3 ? after / 0.3 : (after - 0.3) / 0.15;
        hop = 4 * (after < 0.3 ? 0.14 : 0.04) * s * (1 - s);
      }
      const roll = after > 0 ? vz * 0.2 * Math.min(after, 0.45) : 0;
      dummy.position.set(v1.x, v1.y + vy * fall - 4.9 * fall * fall + hop, v1.z + vz * fall + roll);
      if (after > 0 && !decor.dusted) {
        decor.dusted = true;
        hit = decor.group.localToWorld(decor.hit.copy(dummy.position));
      }
      // Падая, блок докручивается до лёжки на грани.
      dummy.rotation.set(-TILT - (fall / land) * (Math.PI / 2 - TILT), slot.turn, 0);
      // Кучка у кузова исчезает перед новой загрузкой.
      if (t >= DUMP.flat) scale = smooth(1 - (t - DUMP.flat) / 0.6);
      dummy.scale.setScalar(Math.max(scale, 0.001));
      dummy.updateMatrix();
      decor.blocks.setMatrixAt(k, dummy.matrix);
    }
    decor.blocks.instanceMatrix.needsUpdate = true;
    return hit;
  }

  // Верх выхлопной трубы самосвала в мире раз в 0,7 с (на подъёме кузова мотор ревёт — раз в 0,3 с), иначе null.
  function truckExhaust(time) {
    if (!decor) return null;
    const t = (time + decor.phase) % DUMP.period;
    if (Math.abs(time - decor.smokeAt) < (t >= DUMP.up && t < DUMP.top ? 0.3 : 0.7)) return null;
    decor.smokeAt = time;
    return decor.group.localToWorld(decor.pipe.set(-0.56, 1.66, 0.48));
  }

  // Декор уровня — площадка снабжения на въезде в карьер, перед рядами появления рабочих (внизу кадра):
  // самосвал слева кузовом к стройке, справа поддоны. Рабочие и погрузчики уходят от рядов только к стройке
  // и рудникам, поэтому сюда не заходят; логика о декоре не знает.
  function decorate(level, parent) {
    const footprint = level.footprint;
    const cx = Math.round((footprint.minX + footprint.maxX) / 2) + 0.5;
    let front = -Infinity;
    for (let i = 0; i < level.spawnPoints.length; i++) front = Math.max(front, level.spawnPoints[i][2]);
    const ids = level.materialIds;
    truck(cx - 2.6, front + 3.2, -Math.PI / 4, ids[0], parent);
    pallets([
      { x: cx + 1.6, z: front + 2.4, turn: 0.1, materialId: ids[1 % ids.length] },
      { x: cx + 2.9, z: front + 2.0, turn: -0.15, materialId: ids[2 % ids.length] },
      { x: cx + 2.3, z: front + 3.5, turn: 0.25, materialId: ids[1 % ids.length] },
    ], parent);
  }

  function build() {
    const texture = stripeTexture();
    const paint = new THREE.MeshStandardMaterial({ map: texture, vertexColors: true, roughness: 0.62, metalness: 0.18, envMap: Blocks.env(), envMapIntensity: 0.7 });
    paint.onBeforeCompile = grime;

    // Самосвал: рама, кабина, бампер с полосами, шесть колёс (стоит — колёса в корпусе).
    const truckParts = [];
    box(truckParts, 0.9, 0.22, 2.7, 0, 0.5, 0, C.dark);
    box(truckParts, 1.2, 0.74, 0.8, 0, 1.09, 0.95, C.yellow);
    box(truckParts, 1.08, 0.34, 0.06, 0, 1.22, 1.36, C.glass);
    for (let s = -1; s <= 1; s += 2) box(truckParts, 0.04, 0.3, 0.5, s * 0.6, 1.22, 1.0, C.glass);
    box(truckParts, 1.26, 0.06, 0.86, 0, 1.49, 0.95, C.yellowDark);
    box(truckParts, 1.24, 0.16, 0.08, 0, 0.5, 1.4, C.white, true);
    // Решётка радиатора и фары в тёмных ободках на лбу кабины.
    box(truckParts, 0.5, 0.22, 0.02, 0, 0.88, 1.355, C.dark);
    for (let k = 0; k < 3; k++) box(truckParts, 0.46, 0.025, 0.012, 0, 0.81 + k * 0.07, 1.367, 0x6d7378);
    for (let s = -1; s <= 1; s += 2) {
      box(truckParts, 0.17, 0.12, 0.02, s * 0.43, 0.86, 1.355, C.dark);
      box(truckParts, 0.13, 0.08, 0.02, s * 0.43, 0.86, 1.368, C.light);
      // Зеркала на двух кронштейнах у передних углов кабины, стекло смотрит назад.
      box(truckParts, 0.17, 0.025, 0.025, s * 0.68, 1.32, 1.28, C.dark);
      box(truckParts, 0.17, 0.025, 0.025, s * 0.68, 1.1, 1.28, C.dark);
      box(truckParts, 0.05, 0.26, 0.12, s * 0.78, 1.21, 1.28, C.dark);
      box(truckParts, 0.038, 0.22, 0.006, s * 0.78, 1.21, 1.217, C.glass);
    }
    box(truckParts, 0.36, 0.26, 0.36, 0.56, 0.62, 0.15, C.steel);
    // Выхлопная труба за кабиной: круглая, с решётчатым кожухом и кольцом на срезе (дым — truckExhaust()).
    const stack = new THREE.CylinderGeometry(0.038, 0.042, 0.62, 10);
    stack.translate(-0.56, 1.31, 0.48);
    truckParts.push([stack, C.dark]);
    const shield = new THREE.CylinderGeometry(0.054, 0.054, 0.26, 10);
    shield.translate(-0.56, 1.2, 0.48);
    truckParts.push([shield, C.steel]);
    const rim = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10);
    rim.translate(-0.56, 1.615, 0.48);
    truckParts.push([rim, 0x45484c]);
    for (let s = -1; s <= 1; s += 2) {
      wheel(truckParts, s * 0.55, 0.36, 0.86, 0.36, 0.26);
      wheel(truckParts, s * 0.55, 0.36, -0.55, 0.36, 0.26);
      wheel(truckParts, s * 0.55, 0.36, -1.0, 0.36, 0.26);
    }
    // Кузов: шарнир сзади на раме; дно, борта, высокий передний борт с козырьком над кабиной.
    const bedParts = [];
    box(bedParts, 1.24, 0.08, 2.0, 0, 0.04, 1.0, C.yellow);
    for (let s = -1; s <= 1; s += 2) {
      box(bedParts, 0.06, 0.5, 2.0, s * 0.62, 0.3, 1.0, C.yellow);
      box(bedParts, 0.08, 0.06, 2.02, s * 0.62, 0.56, 1.0, C.yellowDark);
      for (let k = 0; k < 3; k++) box(bedParts, 0.03, 0.44, 0.06, s * 0.66, 0.28, 0.4 + k * 0.6, C.yellowDark);
    }
    box(bedParts, 1.3, 0.95, 0.08, 0, 0.5, 1.96, C.yellow);
    box(bedParts, 1.3, 0.05, 0.42, 0, 0.96, 2.14, C.yellowDark);
    box(bedParts, 1.18, 0.1, 0.06, 0, 0.06, 0.02, C.yellowDark);

    // Стол планирования: три доски на жёлтых козлах, свёрнутый край чертежа и два камня-прижима.
    // Второй вариант — с красным ящиком инструментов под столом, чтобы ряд столов не был одинаковым.
    const deskParts = [];
    for (let k = -1; k <= 1; k++) box(deskParts, 0.8, 0.045, 0.148, 0, 0.497, 0.64 + k * 0.156, k ? C.wood : 0xc08a52);
    for (let s = -1; s <= 1; s += 2) {
      box(deskParts, 0.07, 0.05, 0.36, s * 0.29, 0.45, 0.64, C.white, true);
      for (let f = -1; f <= 1; f += 2) {
        const leg = new THREE.BoxGeometry(0.045, 0.46, 0.045);
        leg.rotateX(-f * 0.32);
        leg.translate(s * 0.29, 0.22, 0.64 + f * 0.075);
        deskParts.push([leg, C.yellow]);
      }
      box(deskParts, 0.03, 0.03, 0.24, s * 0.29, 0.12, 0.64, C.yellowDark);
    }
    const roll = new THREE.CylinderGeometry(0.024, 0.024, 0.62, 10);
    roll.rotateZ(Math.PI / 2);
    roll.translate(0, 0.545, 0.48);
    deskParts.push([roll, 0x3a76ad]);
    for (let s = -1; s <= 1; s += 2) {
      const stone = new THREE.BoxGeometry(0.07, 0.045, 0.06);
      stone.rotateY(s * 0.4);
      stone.translate(s * 0.25, 0.543, 0.76);
      deskParts.push([stone, s > 0 ? 0x8d9297 : 0x767b80]);
    }
    const toolParts = deskParts.slice();
    box(toolParts, 0.22, 0.1, 0.11, 0.06, 0.05, 0.6, C.red);
    box(toolParts, 0.226, 0.02, 0.116, 0.06, 0.09, 0.6, 0x8e2620);
    box(toolParts, 0.1, 0.025, 0.02, 0.06, 0.112, 0.6, C.dark);
    const sheet = new THREE.PlaneGeometry(0.6, 0.32);
    sheet.rotateX(-Math.PI / 2);

    shared = {
      paint: paint,
      truck: merge(truckParts),
      bed: merge(bedParts),
      truckBlock: Blocks.geometry(0.5, 0.05),
      palletBlock: Blocks.geometry(0.42, 0.04),
      // merge() освобождает исходные части, поэтому список для второго варианта копируется до склейки.
      desks: [merge(deskParts.map(function (p) { return [p[0].clone(), p[1], p[2]]; }), true), merge(toolParts, true)],
      sheet: sheet,
      blueprint: new THREE.MeshStandardMaterial({ map: blueprintTexture(), roughness: 0.9 }),
    };
  }

  // Грязь снизу, сколы и подтёки на материале машины game.js (без атласа полос): mark — вид в u атласа
  // (0,25 — краска со сколами, 0,35 — без сколов, 0,05 — стекло, 0,15 — фонарь).
  function dirty(material, mark) {
    material.defines = Object.assign({}, material.defines, { MB_U: mark.toFixed(2) });
    material.onBeforeCompile = grime;
  }

  function night(value) {
    NIGHT.value = value;
  }

  window.MicroBuildersVehicles = {
    pallets: pallets, desk: desk, truck: truck, animateTruck: animateTruck, truckExhaust: truckExhaust, decorate: decorate,
    dirty: dirty, night: night,
  };
})();
