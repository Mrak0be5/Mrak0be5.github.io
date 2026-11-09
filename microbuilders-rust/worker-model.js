(function (root) {
  'use strict';
  // The worker figure (game.js → createStick, tools/worker-studio.html): a chunky little builder in
  // the work clothes of his rank («Учебный центр», balance meta.training.ranks: helmet, suit).
  //
  // Bones: the body (torso, head and helmet, static) and four limbs on pivots — leftArm / rightArm
  // at the shoulders, leftLeg / rightLeg at the hips; game.js swings them (rotation.x) and splays
  // the arms (rotation.z). The worker faces +z.
  //
  // Every bone is one or a few meshes: all its parts are merged into one geometry per surface
  // (matte cloth and skin, glossy plastic, metal, glowing tape) with the colours in the vertices,
  // so a worker costs about a dozen draw calls whatever he wears. The geometries are cached by
  // rank and looks; a rank-up swaps them (dress).
  //
  // Ranks are rarities: every rank keeps what the one below wears and adds a piece —
  //   1 новичок: khaki overall, plain helmet, leather gloves;
  //   2: + reflective tape on the chest and the sleeves, a sticker on the helmet;
  //   3: + a tool belt with a pouch and a hammer, side stripes on the helmet;
  //   4: + bright gloves, knee pads, ear muffs;
  //   5: + a radio on the strap, goggles on the helmet, a blue glow under the feet;
  //   6: + a headlamp, shoulder pads, a star on the chest, a violet glow;
  //   7: gold — a shining gold helmet with a crest, gold tape and buckle, a gold glow.
  const THREE = root.THREE;

  const SKINS = [0xf6c9a4, 0xeab38b, 0xd99c72, 0xb97a52, 0x8d5a3b, 0xf3d3b8];
  const HAIRS = [0x3a2a1f, 0x5b3b22, 0x1f1b18, 0x8a5a2e, 0xb08a4a, 0x8e8a84, 0xc8c4bc];
  const FACES = ['plain', 'moustache', 'beard', 'stubble', 'plain', 'moustache'];
  const DARK = 0x2b2622;
  const BOOT = 0x4a3324;
  const SOLE = 0x231c17;
  const METAL = 0xc9ced4;
  const GOLD = 0xffcf4a;
  const TAPE = 0xeef3f8;

  const RANK_FALLBACK = [
    { helmet: 'f0cf5a', suit: '9c9272' }, { helmet: 'f28a2e', suit: 'c9652a' }, { helmet: 'e0473b', suit: 'a3302c' },
    { helmet: '52c26a', suit: '2f8748' }, { helmet: '3d8ef0', suit: '2b5aa6' }, { helmet: 'a86cf0', suit: '6b42b0' },
    { helmet: 'ffd84a', suit: 'c98a12' },
  ];

  function ranks() {
    const balance = root.MicroBuildersBalance;
    const list = balance && balance.meta && balance.meta.training && balance.meta.training.ranks;
    return list && list.length ? list : RANK_FALLBACK;
  }

  function rankIndex(rank) {
    return Math.max(0, Math.min(ranks().length, rank || 1) - 1);
  }

  // ---------- surfaces ----------
  const SURFACES = {
    matte: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.02 }),
    gloss: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.26, metalness: 0.12 }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.85 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
  };
  const SURFACE_ORDER = ['matte', 'gloss', 'metal', 'glow'];

  // ---------- shared primitives ----------
  const GEO = {
    sphere: new THREE.SphereGeometry(1, 16, 12),
    smallSphere: new THREE.SphereGeometry(1, 10, 8),
    dome: new THREE.SphereGeometry(1, 18, 9, 0, Math.PI * 2, 0, Math.PI * 0.5),
    halfDome: new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 18),
    lowCylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
    box: new THREE.BoxGeometry(1, 1, 1),
    capsule: new THREE.CapsuleGeometry(1, 1, 4, 10),
    ring: new THREE.TorusGeometry(1, 0.12, 6, 20),
    smile: new THREE.TorusGeometry(1, 0.22, 5, 10, Math.PI),
    // A half ring in the XY plane (radius 1): helmet ridge and overall straps, turned and stretched.
    arc: new THREE.TorusGeometry(1, 0.09, 6, 18, Math.PI),
    star: (function () {
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.45 : 1, a = Math.PI / 2 + i * Math.PI / 5;
        if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      return new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false });
    })(),
  };

  // A capsule of radius r and straight length len (total len + 2r), along y.
  function capsuleScale(r, len) {
    return [r, len / 2 + r, r];
  }

  // ---------- merging ----------
  const scratch = { matrix: new THREE.Matrix4(), quat: new THREE.Quaternion(), euler: new THREE.Euler(), color: new THREE.Color() };

  // Parts of one bone by surface; build() merges them into one indexed geometry per surface.
  function Bone() {
    this.parts = { matte: [], gloss: [], metal: [], glow: [] };
  }
  // add(surface, geometry, colour, [x, y, z], [sx, sy, sz] | s, [rx, ry, rz]); capsules take their
  // radius and length through capsuleScale.
  Bone.prototype.add = function (surface, geometry, color, position, scale, rotation) {
    const s = Array.isArray(scale) ? scale : [scale, scale, scale];
    const r = rotation || [0, 0, 0];
    scratch.euler.set(r[0], r[1], r[2]);
    scratch.quat.setFromEuler(scratch.euler);
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(position[0], position[1], position[2]), scratch.quat, new THREE.Vector3(s[0], s[1], s[2]));
    this.parts[surface].push({ geometry: geometry, color: color, matrix: matrix });
    return this;
  };
  Bone.prototype.build = function () {
    const out = {};
    SURFACE_ORDER.forEach(function (surface) {
      const parts = this.parts[surface];
      if (parts.length) out[surface] = merge(parts);
    }, this);
    return out;
  };

  function merge(parts) {
    let vertices = 0, indices = 0;
    parts.forEach(function (part) {
      vertices += part.geometry.attributes.position.count;
      indices += part.geometry.index ? part.geometry.index.count : part.geometry.attributes.position.count;
    });
    const position = new Float32Array(vertices * 3), normal = new Float32Array(vertices * 3), color = new Float32Array(vertices * 3);
    const index = new (vertices > 65535 ? Uint32Array : Uint16Array)(indices);
    const v = new THREE.Vector3(), n = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();
    let vo = 0, io = 0;
    parts.forEach(function (part) {
      const g = part.geometry, p = g.attributes.position, nn = g.attributes.normal;
      normalMatrix.getNormalMatrix(part.matrix);
      // Colours are sRGB hex; vertex colours live in the linear working space.
      scratch.color.setHex(part.color);
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(part.matrix);
        n.fromBufferAttribute(nn, i).applyMatrix3(normalMatrix).normalize();
        position[(vo + i) * 3] = v.x; position[(vo + i) * 3 + 1] = v.y; position[(vo + i) * 3 + 2] = v.z;
        normal[(vo + i) * 3] = n.x; normal[(vo + i) * 3 + 1] = n.y; normal[(vo + i) * 3 + 2] = n.z;
        color[(vo + i) * 3] = scratch.color.r; color[(vo + i) * 3 + 1] = scratch.color.g; color[(vo + i) * 3 + 2] = scratch.color.b;
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) index[io + i] = g.index.getX(i) + vo;
      else for (let i = 0; i < p.count; i++) index[io + i] = i + vo;
      vo += p.count;
      io += g.index ? g.index.count : p.count;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(color, 3));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    geometry.computeBoundingSphere();
    return geometry;
  }

  // ---------- colours ----------
  function shade(hex, k) {
    const c = new THREE.Color(hex);
    c.r = Math.min(1, c.r * k); c.g = Math.min(1, c.g * k); c.b = Math.min(1, c.b * k);
    return c.getHex();
  }
  function mix(a, b, t) {
    return new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
  }

  // The worker's own looks from his seed (the hiring order): skin, hair, face, brows.
  function looksOf(seed, shirt) {
    // A small integer hash, so neighbours in the hiring order look different.
    let h = (Math.abs(Math.floor(seed || 0)) + 1) * 2654435761 >>> 0;
    function pick(n) { h = (h ^ (h >>> 15)) * 2246822519 >>> 0; return h % n; }
    return {
      skin: SKINS[pick(SKINS.length)],
      hair: HAIRS[pick(HAIRS.length)],
      face: FACES[pick(FACES.length)],
      brow: pick(3) - 1,
      shirt: shirt === undefined ? 0x2f6fed : shirt,
    };
  }

  // The clothes of a rank: helmet and overall from the balance, the pieces it adds.
  function outfitOf(rank) {
    const index = rankIndex(rank), spec = ranks()[index];
    const helmet = parseInt(spec.helmet, 16), suit = parseInt(spec.suit || spec.helmet, 16);
    const top = index === ranks().length - 1;
    return {
      tier: index + 1,
      top: top,
      helmet: helmet,
      helmetDark: shade(helmet, 0.72),
      suit: suit,
      suitDark: shade(suit, 0.74),
      suitLight: shade(suit, 1.18),
      trim: top ? GOLD : TAPE,
      // Leather work gloves; bright ones from rank 4.
      glove: index >= 3 ? (top ? GOLD : mix(helmet, 0xffffff, 0.15)) : 0x8a6440,
      aura: index >= 4 ? helmet : null,
    };
  }

  // ---------- the figure ----------
  const HIP = 0.31;
  const SHOULDER = 0.6;

  function buildBody(o, l) {
    const b = new Bone();
    // Hips and torso: a rounded overall.
    b.add('matte', GEO.sphere, o.suit, [0, 0.335, 0], [0.155, 0.095, 0.125]);
    b.add('matte', GEO.capsule, o.suit, [0, 0.46, 0], capsuleScale(0.155, 0.13).map(function (v, i) { return i === 2 ? v * 0.82 : v; }));
    // Bib with a pocket, straps over the shoulders with buttons.
    b.add('matte', GEO.box, o.suitDark, [0, 0.47, 0.118], [0.2, 0.17, 0.03]);
    b.add('matte', GEO.box, shade(o.suitDark, 0.85), [0, 0.475, 0.135], [0.085, 0.06, 0.012]);
    [-1, 1].forEach(function (side) {
      b.add('matte', GEO.arc, o.suitDark, [0.07 * side, 0.525, 0], [0.122, 0.152, 0.26], [0, Math.PI / 2, 0]);
      b.add('metal', GEO.smallSphere, o.top ? GOLD : METAL, [0.072 * side, 0.548, 0.136], 0.018);
    });
    // Shirt collar of the worker's own colour and a patch on the chest.
    b.add('matte', GEO.cylinder, l.shirt, [0, 0.615, 0], [0.095, 0.04, 0.085]);
    b.add('matte', GEO.box, l.shirt, [-0.085, 0.53, 0.122], [0.05, 0.05, 0.012]);
    // Belt and buckle.
    b.add('matte', GEO.cylinder, DARK, [0, 0.365, 0], [0.158, 0.035, 0.13]);
    b.add('metal', GEO.box, o.top ? GOLD : METAL, [0, 0.365, 0.13], [0.05, 0.032, 0.012]);
    if (o.tier >= 2) {
      // Reflective tape round the chest.
      b.add('glow', GEO.cylinder, o.trim, [0, 0.42, 0], [0.163, 0.03, 0.137]);
    }
    if (o.tier >= 2) {
      // On the back: two tapes from the shoulders down to the belt.
      [-1, 1].forEach(function (side) {
        b.add('glow', GEO.box, o.trim, [0.06 * side, 0.5, -0.131], [0.028, 0.2, 0.01], [0.12, 0, 0]);
      });
    }
    if (o.tier >= 4) {
      // A round badge of the rank on the back.
      b.add('matte', GEO.cylinder, o.suitLight, [0, 0.525, -0.134], [0.055, 0.012, 0.055], [Math.PI / 2 - 0.12, 0, 0]);
      b.add('metal', GEO.star, o.top ? GOLD : o.helmet, [0, 0.525, -0.141], [0.032, 0.032, 0.015], [0.12, Math.PI, 0]);
    }
    if (o.tier >= 3) {
      // Tool belt: a pouch on the right, a hammer on the left.
      b.add('matte', GEO.box, 0x8a5a32, [0.135, 0.335, 0.05], [0.06, 0.08, 0.08], [0, 0.25, 0]);
      b.add('matte', GEO.box, 0x6b4426, [0.14, 0.375, 0.05], [0.065, 0.02, 0.085], [0, 0.25, 0]);
      b.add('matte', GEO.lowCylinder, 0x9b6b3d, [-0.16, 0.31, 0.04], [0.012, 0.14, 0.012], [0, 0, 0.12]);
      b.add('metal', GEO.box, METAL, [-0.168, 0.385, 0.04], [0.025, 0.025, 0.07], [0, 0, 0.12]);
    }
    if (o.tier >= 5) {
      // A radio on the left strap.
      b.add('matte', GEO.box, 0x24272b, [-0.07, 0.565, 0.135], [0.045, 0.06, 0.025]);
      b.add('matte', GEO.lowCylinder, 0x24272b, [-0.085, 0.625, 0.135], [0.006, 0.06, 0.006]);
      b.add('glow', GEO.smallSphere, 0x7dff8a, [-0.06, 0.58, 0.149], 0.007);
    }
    if (o.tier >= 6) {
      // A star on the bib.
      b.add('metal', GEO.star, o.top ? GOLD : 0xffd36b, [0.0, 0.535, 0.133], [0.022, 0.022, 0.02]);
    }
    buildHead(b, o, l);
    return b;
  }

  function buildHead(b, o, l) {
    const y = 0.8;
    // Head, ears, nose, cheeks.
    b.add('matte', GEO.sphere, l.skin, [0, y, 0], [0.19, 0.18, 0.18]);
    [-1, 1].forEach(function (side) {
      b.add('matte', GEO.smallSphere, shade(l.skin, 0.95), [0.183 * side, y - 0.01, -0.005], [0.035, 0.045, 0.03]);
      b.add('matte', GEO.smallSphere, mix(l.skin, 0xff6f6f, 0.35), [0.105 * side, y - 0.05, 0.145], [0.032, 0.022, 0.012]);
    });
    b.add('matte', GEO.smallSphere, mix(l.skin, 0xd97a5c, 0.25), [0, y - 0.025, 0.18], [0.032, 0.03, 0.03]);
    // Eyes: white, a dark pupil and a glint.
    [-1, 1].forEach(function (side) {
      b.add('matte', GEO.smallSphere, 0xffffff, [0.062 * side, y + 0.02, 0.16], [0.034, 0.042, 0.018]);
      b.add('gloss', GEO.smallSphere, 0x1d1712, [0.06 * side, y + 0.015, 0.175], [0.022, 0.028, 0.01]);
      b.add('glow', GEO.smallSphere, 0xffffff, [0.052 * side, y + 0.028, 0.184], 0.0065);
      // Brows: their tilt is the worker's own.
      b.add('matte', GEO.box, l.hair, [0.062 * side, y + 0.075, 0.16], [0.055, 0.014, 0.012], [0, 0, -0.12 * side * l.brow]);
    });
    // Mouth: a small smile.
    if (l.face === 'plain' || l.face === 'moustache') b.add('matte', GEO.smile, 0x6b2a22, [0, y - 0.075, 0.168], [0.03, 0.022, 0.03], [0, 0, Math.PI]);
    // Hair below the helmet: sideburns and the back.
    [-1, 1].forEach(function (side) {
      b.add('matte', GEO.box, l.hair, [0.18 * side, y + 0.035, 0.03], [0.022, 0.07, 0.05]);
    });
    b.add('matte', GEO.sphere, l.hair, [0, y + 0.045, -0.03], [0.184, 0.12, 0.165]);
    b.add('matte', GEO.cylinder, shade(l.skin, 0.92), [0, y - 0.16, -0.01], [0.075, 0.08, 0.07]);
    if (l.face === 'moustache') {
      [-1, 1].forEach(function (side) {
        b.add('matte', GEO.capsule, l.hair, [0.032 * side, y - 0.05, 0.172], capsuleScale(0.014, 0.03), [0, 0, Math.PI / 2 + 0.35 * side]);
      });
    } else if (l.face === 'beard') {
      b.add('matte', GEO.halfDome, l.hair, [0, y - 0.035, 0.02], [0.175, 0.15, 0.17]);
      b.add('matte', GEO.smallSphere, l.hair, [0, y - 0.13, 0.11], [0.08, 0.06, 0.06]);
      b.add('matte', GEO.smile, 0x6b2a22, [0, y - 0.07, 0.192], [0.026, 0.02, 0.03], [0, 0, Math.PI]);
    } else if (l.face === 'stubble') {
      b.add('matte', GEO.halfDome, mix(l.skin, l.hair, 0.35), [0, y - 0.02, 0.012], [0.183, 0.155, 0.17]);
      b.add('matte', GEO.smile, 0x6b2a22, [0, y - 0.075, 0.185], [0.03, 0.022, 0.03], [0, 0, Math.PI]);
    }
    buildHelmet(b, o, y);
  }

  function buildHelmet(b, o, y) {
    const hy = y + 0.055, surface = o.top ? 'metal' : 'gloss';
    // Dome, brim all round, a peak in front and a ridge over the top.
    b.add(surface, GEO.dome, o.helmet, [0, hy, 0], [0.208, 0.19, 0.212]);
    b.add(surface, GEO.cylinder, o.helmet, [0, hy, 0.012], [0.232, 0.022, 0.238]);
    b.add(surface, GEO.cylinder, o.helmet, [0, hy - 0.004, 0.13], [0.13, 0.018, 0.13]);
    b.add(surface, GEO.arc, o.helmetDark, [0, hy, 0], [0.214, 0.192, 0.24], [0, Math.PI / 2, 0]);
    if (o.tier >= 2 && !o.top) {
      // A sticker: a white disc with the rank's stripe.
      b.add('matte', GEO.cylinder, 0xffffff, [0.075, hy + 0.09, 0.172], [0.04, 0.01, 0.04], [1.0, 0, -0.38]);
      b.add('matte', GEO.box, o.suit, [0.078, hy + 0.091, 0.177], [0.05, 0.014, 0.004], [1.0 - Math.PI / 2, 0, -0.38]);
    }
    if (o.tier >= 3) {
      // Reflective stripes on the sides.
      [-1, 1].forEach(function (side) {
        b.add('glow', GEO.box, o.trim, [0.17 * side, hy + 0.09, -0.02], [0.008, 0.03, 0.15], [0, 0, 0.62 * side]);
      });
    }
    if (o.tier >= 4) {
      // Ear muffs on a band.
      [-1, 1].forEach(function (side) {
        b.add('matte', GEO.cylinder, 0x2c2f33, [0.205 * side, y - 0.005, 0], [0.06, 0.045, 0.06], [0, 0, Math.PI / 2]);
        b.add('gloss', GEO.cylinder, o.helmetDark, [0.23 * side, y - 0.005, 0], [0.045, 0.012, 0.045], [0, 0, Math.PI / 2]);
        b.add('matte', GEO.box, 0x2c2f33, [0.215 * side, y + 0.06, 0], [0.012, 0.11, 0.025], [0, 0, -0.25 * side]);
      });
    }
    if (o.tier >= 5) {
      // Goggles pushed up onto the helmet.
      b.add('matte', GEO.cylinder, 0x2c2f33, [0, hy + 0.04, 0.0], [0.214, 0.03, 0.216]);
      [-1, 1].forEach(function (side) {
        b.add('gloss', GEO.cylinder, 0x7fd3ff, [0.065 * side, hy + 0.05, 0.205], [0.05, 0.03, 0.05], [1.35, 0, 0]);
        b.add('metal', GEO.ring, METAL, [0.065 * side, hy + 0.05, 0.212], [0.05, 0.05, 0.25], [-0.22, 0, 0]);
      });
    }
    if (o.tier >= 6) {
      // A headlamp on the front.
      b.add('metal', GEO.cylinder, o.top ? GOLD : METAL, [0, hy + 0.11, 0.17], [0.042, 0.05, 0.042], [1.05, 0, 0]);
      b.add('glow', GEO.cylinder, 0xfff6c8, [0, hy + 0.122, 0.192], [0.032, 0.012, 0.032], [1.05, 0, 0]);
    }
    if (o.top) {
      // The gold helmet's crest: a plume of red over the ridge, wings at the sides.
      b.add('matte', GEO.capsule, 0xd93a2e, [0, hy + 0.215, -0.02], capsuleScale(0.03, 0.2), [Math.PI / 2 + 0.25, 0, 0]);
      [-1, 1].forEach(function (side) {
        b.add('metal', GEO.box, GOLD, [0.2 * side, hy + 0.08, -0.04], [0.012, 0.09, 0.12], [0.3, 0.25 * side, -0.4 * side]);
        b.add('metal', GEO.box, GOLD, [0.215 * side, hy + 0.13, -0.08], [0.01, 0.07, 0.09], [0.6, 0.25 * side, -0.55 * side]);
      });
      b.add('glow', GEO.smallSphere, 0xff3b5c, [0, hy + 0.1, 0.188], [0.03, 0.03, 0.015]);
    }
  }

  function buildArm(o, l, side) {
    const b = new Bone();
    // Shoulder, sleeve, cuff and glove; the pivot is the shoulder.
    b.add('matte', GEO.sphere, o.suit, [0, 0, 0], 0.063);
    b.add('matte', GEO.capsule, o.suit, [0, -0.12, 0], capsuleScale(0.055, 0.1));
    b.add('matte', GEO.cylinder, o.suitDark, [0, -0.215, 0], [0.06, 0.03, 0.06]);
    b.add('matte', GEO.sphere, o.glove, [0, -0.28, 0.005], [0.06, 0.065, 0.06]);
    b.add('matte', GEO.smallSphere, o.glove, [-0.03 * side, -0.265, 0.035], [0.025, 0.035, 0.025]);
    if (o.tier >= 2) b.add('glow', GEO.cylinder, o.trim, [0, -0.15, 0], [0.059, 0.022, 0.059]);
    if (o.tier >= 6) {
      // A shoulder pad with a trim.
      b.add('matte', GEO.halfDome, o.suitDark, [0.01 * side, 0.03, 0], [0.085, 0.06, 0.085], [Math.PI, 0, 0]);
      b.add('metal', GEO.cylinder, o.top ? GOLD : 0xffd36b, [0.01 * side, 0.03, 0], [0.087, 0.012, 0.087]);
    }
    return b;
  }

  function buildLeg(o) {
    const b = new Bone();
    // Trouser, a cuff, the boot with its sole and toe cap; the pivot is the hip.
    b.add('matte', GEO.capsule, o.suit, [0, -0.13, 0], capsuleScale(0.068, 0.12));
    b.add('matte', GEO.cylinder, o.suitDark, [0, -0.225, 0], [0.07, 0.03, 0.07]);
    b.add('matte', GEO.box, BOOT, [0, -0.27, 0.025], [0.12, 0.075, 0.17]);
    b.add('matte', GEO.sphere, BOOT, [0, -0.27, 0.1], [0.06, 0.04, 0.045]);
    b.add('matte', GEO.box, SOLE, [0, -0.302, 0.025], [0.13, 0.022, 0.185]);
    if (o.tier >= 4) b.add('matte', GEO.sphere, 0x2c2f33, [0, -0.11, 0.06], [0.055, 0.05, 0.025]);
    if (o.tier >= 2) b.add('glow', GEO.cylinder, o.trim, [0, -0.17, 0], [0.072, 0.02, 0.072]);
    return b;
  }

  // ---------- cache and meshes ----------
  const cache = new Map();
  function geometries(rank, looks) {
    const o = outfitOf(rank);
    const key = o.tier + '|' + looks.skin + '|' + looks.hair + '|' + looks.face + '|' + looks.brow + '|' + looks.shirt;
    let set = cache.get(key);
    if (!set) {
      set = {
        body: buildBody(o, looks).build(),
        leftArm: buildArm(o, looks, -1).build(),
        rightArm: buildArm(o, looks, 1).build(),
        leftLeg: buildLeg(o).build(),
        rightLeg: buildLeg(o).build(),
        aura: o.aura,
      };
      cache.set(key, set);
    }
    return set;
  }

  // The glow under the feet of the high ranks.
  const auraGeometry = new THREE.RingGeometry(0.2, 0.36, 32);
  const auraMaterials = new Map();
  function auraMaterial(color) {
    let material = auraMaterials.get(color);
    if (!material) {
      material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.42, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      auraMaterials.set(color, material);
    }
    return material;
  }

  function fill(holder, set) {
    for (let i = holder.children.length - 1; i >= 0; i--) {
      if (holder.children[i].userData.workerSkin) holder.remove(holder.children[i]);
    }
    SURFACE_ORDER.forEach(function (surface) {
      if (!set[surface]) return;
      const mesh = new THREE.Mesh(set[surface], SURFACES[surface]);
      mesh.castShadow = surface !== 'glow';
      mesh.userData.workerSkin = true;
      holder.add(mesh);
    });
  }

  // create({ shirt, rank, seed }) → THREE.Group with userData { body, leftArm, rightArm, leftLeg,
  // rightLeg, aura, looks, rank }: the bones game.js poses.
  function create(options) {
    const opts = options || {};
    const group = new THREE.Group();
    const body = new THREE.Group();
    const leftArm = new THREE.Group(), rightArm = new THREE.Group();
    const leftLeg = new THREE.Group(), rightLeg = new THREE.Group();
    leftArm.position.set(-0.205, SHOULDER - 0.015, 0.0);
    rightArm.position.set(0.205, SHOULDER - 0.015, 0.0);
    leftArm.rotation.z = 0.28;
    rightArm.rotation.z = -0.28;
    leftLeg.position.set(-0.075, HIP, 0);
    rightLeg.position.set(0.075, HIP, 0);
    const aura = new THREE.Mesh(auraGeometry, auraMaterial(0xffffff));
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.012;
    aura.renderOrder = 1;
    group.add(aura, body, leftArm, rightArm, leftLeg, rightLeg);
    group.userData = { body: body, leftArm: leftArm, rightArm: rightArm, leftLeg: leftLeg, rightLeg: rightLeg, aura: aura,
      looks: looksOf(opts.seed, opts.shirt), rank: 0 };
    dress(group, opts.rank || 1);
    return group;
  }

  // The clothes of `rank` on a figure made by create (built once per look and rank, swapped here).
  function dress(group, rank) {
    const parts = group.userData;
    if (parts.rank === rank) return;
    parts.rank = rank;
    const set = geometries(rank, parts.looks);
    fill(parts.body, set.body);
    fill(parts.leftArm, set.leftArm);
    fill(parts.rightArm, set.rightArm);
    fill(parts.leftLeg, set.leftLeg);
    fill(parts.rightLeg, set.rightLeg);
    parts.aura.visible = !!set.aura;
    if (set.aura) parts.aura.material = auraMaterial(set.aura);
  }

  root.MicroBuildersWorkerModel = { create: create, dress: dress, outfitOf: outfitOf, SKINS: SKINS, HAIRS: HAIRS };
})(typeof window !== 'undefined' ? window : this);
