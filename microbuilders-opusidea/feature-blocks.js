(function (root) {
  const AXIS_TYPES = new Set(['window', 'door', 'slope', 'beam', 'brace', 'arch', 'stair', 'balcony', 'greenery', 'cable']);
  const FLOOR_TYPES = new Set(['bridge', 'slope', 'stair', 'balcony']);
  const PASSAGE_TYPES = new Set(['door', 'hatch', 'arch']);
  const OPEN_TYPES = new Set(['beam', 'brace', 'lamp', 'greenery', 'cable']);
  const STYLES = {
    window: new Set(['panorama', 'round', 'rose', 'triangle', 'diamond', 'arch', 'slit']),
    bridge: new Set(['stone', 'metal', 'glass']),
    slope: new Set(['stone', 'metal', 'glass']),
    beam: new Set(['square', 'round']),
    brace: new Set(['single', 'cross']),
    arch: new Set(['round', 'pointed']),
    stair: new Set(['stone', 'metal', 'glass']),
    balcony: new Set(['stone', 'metal', 'glass']),
    dome: new Set(['stone', 'metal', 'glass']),
    lamp: new Set(['warm', 'cold']),
    water: new Set(['pool', 'cascade']),
    greenery: new Set(['vine', 'shrub']),
    cable: new Set(['straight', 'sag']),
  };

  function key(x, y, z) {
    return x + ',' + y + ',' + z;
  }

  function installBlueprint(target, add) {
    target.window = function (x, y, z, materialId, faceX, faceZ, style) {
      add(x, y, z, materialId, 'window', faceX, faceZ, style);
    };
    target.door = function (x, y, z, materialId, faceX, faceZ) {
      add(x, y, z, materialId, 'door', faceX, faceZ, 'wood');
    };
    target.bridge = function (x, y, z, materialId, style) {
      add(x, y, z, materialId, 'bridge', 0, 0, style);
    };
    target.slope = function (x, y, z, materialId, faceX, faceZ, style) {
      add(x, y, z, materialId, 'slope', faceX, faceZ, style);
    };
    target.beam = function (x, y, z, materialId, faceX, faceZ, style) {
      add(x, y, z, materialId, 'beam', faceX, faceZ, style);
    };
    target.brace = function (x, y, z, materialId, faceX, faceZ, style) {
      add(x, y, z, materialId, 'brace', faceX, faceZ, style);
    };
    target.arch = function (x, y, z, materialId, faceX, faceZ, style) {
      add(x, y, z, materialId, 'arch', faceX, faceZ, style);
    };
    target.stair = function (x, y, z, materialId, faceX, faceZ, style) {
      add(x, y, z, materialId, 'stair', faceX, faceZ, style);
    };
    target.balcony = function (x, y, z, materialId, faceX, faceZ, style) {
      add(x, y, z, materialId, 'balcony', faceX, faceZ, style);
    };
    target.dome = function (x, y, z, materialId, style) {
      add(x, y, z, materialId, 'dome', 0, 0, style);
    };
    target.lamp = function (x, y, z, materialId, style) {
      add(x, y, z, materialId, 'lamp', 0, 0, style);
    };
    target.water = function (x, y, z, materialId, style) {
      add(x, y, z, materialId, 'water', 0, 0, style);
    };
    target.greenery = function (x, y, z, materialId, faceX, faceZ, style) {
      add(x, y, z, materialId, 'greenery', faceX, faceZ, style);
    };
    target.cable = function (x, y, z, materialId, faceX, faceZ, style) {
      add(x, y, z, materialId, 'cable', faceX, faceZ, style);
    };
  }

  function validate(bp) {
    for (const cell of bp.cells.values()) {
      if (!cell.feature) {
        continue;
      }
      if (AXIS_TYPES.has(cell.feature) && Math.abs(cell.faceX) + Math.abs(cell.faceZ) !== 1) {
        throw new Error('Особый блок должен быть ориентирован по одной оси: ' + key(cell.x, cell.y, cell.z));
      }
      const styles = STYLES[cell.feature];
      if (styles && !styles.has(cell.style)) {
        throw new Error('Неизвестный стиль блока ' + cell.feature + ': ' + cell.style);
      }
      if (cell.feature === 'window') {
        for (let distance = 1; distance <= 5; distance++) {
          if (bp.cells.has(key(cell.x + cell.faceX * distance, cell.y, cell.z + cell.faceZ * distance))) {
            throw new Error('Перед окном нет свободного пространства: ' + key(cell.x, cell.y, cell.z));
          }
        }
      }
      if (cell.feature === 'door') {
        validatePassage(cell, bp, true);
      }
      if (cell.feature === 'arch') {
        validatePassage(cell, bp, false);
      }
      if (cell.feature === 'balcony' && !bp.cells.has(key(cell.x - cell.faceX, cell.y, cell.z - cell.faceZ))) {
        throw new Error('Балкон должен крепиться к стене: ' + key(cell.x, cell.y, cell.z));
      }
      if (cell.feature === 'greenery' && !bp.cells.has(key(cell.x - cell.faceX, cell.y, cell.z - cell.faceZ))) {
        throw new Error('Озеленение должно крепиться к стене: ' + key(cell.x, cell.y, cell.z));
      }
      if ((cell.feature === 'lamp' || cell.feature === 'water') && cell.y > 0 && !bp.cells.has(key(cell.x, cell.y - 1, cell.z))) {
        throw new Error('Блоку ' + cell.feature + ' нужна опора снизу: ' + key(cell.x, cell.y, cell.z));
      }
    }
  }

  function validatePassage(cell, bp, requireFloor) {
    const front = key(cell.x + cell.faceX, cell.y, cell.z + cell.faceZ);
    const back = key(cell.x - cell.faceX, cell.y, cell.z - cell.faceZ);
    if (bp.cells.has(front) || bp.cells.has(back)) {
      throw new Error('Проход перекрыт: ' + key(cell.x, cell.y, cell.z));
    }
    if (requireFloor && cell.y > 0) {
      const frontFloor = bp.cells.get(key(cell.x + cell.faceX, cell.y - 1, cell.z + cell.faceZ));
      const backFloor = bp.cells.get(key(cell.x - cell.faceX, cell.y - 1, cell.z - cell.faceZ));
      if (!frontFloor || FLOOR_TYPES.has(frontFloor.feature) || !backFloor || FLOOR_TYPES.has(backFloor.feature)) {
        throw new Error('С обеих сторон двери нужен твёрдый пол: ' + key(cell.x, cell.y, cell.z));
      }
    }
  }

  function finalize(block, byKey) {
    if (block.feature !== 'bridge' && block.feature !== 'balcony') {
      return;
    }
    block.rails = [
      !byKey.has(key(block.x + 1, block.y, block.z)),
      !byKey.has(key(block.x - 1, block.y, block.z)),
      !byKey.has(key(block.x, block.y, block.z + 1)),
      !byKey.has(key(block.x, block.y, block.z - 1)),
    ];
    if (block.feature === 'balcony') {
      if (block.faceX === 1) {
        block.rails[1] = false;
      }
      if (block.faceX === -1) {
        block.rails[0] = false;
      }
      if (block.faceZ === 1) {
        block.rails[3] = false;
      }
      if (block.faceZ === -1) {
        block.rails[2] = false;
      }
    }
  }

  function occupancy(feature) {
    if (PASSAGE_TYPES.has(feature)) {
      return 'passage';
    }
    if (FLOOR_TYPES.has(feature)) {
      return 'floor';
    }
    if (feature === 'water') {
      return 'water';
    }
    if (OPEN_TYPES.has(feature)) {
      return 'open';
    }
    return 'solid';
  }

  function occupy(block, world) {
    const id = world.index.id(block.x, block.y, block.z);
    const kind = occupancy(block.feature);
    if (kind === 'passage') {
      world.doorGrid[id] = 1;
    } else if (kind === 'floor') {
      world.bridgeGrid[id] = 1;
    } else if (kind === 'water') {
      world.waterGrid[id] = 1;
    } else if (kind === 'solid') {
      world.solidGrid[id] = 1;
    }
  }

  function supports(block, world) {
    const built = world.built;
    if (block.y === 0) {
      return true;
    }
    if (block.feature === 'door') {
      const frontFloorId = world.index.id(block.x + block.faceX, block.y - 1, block.z + block.faceZ);
      const backFloorId = world.index.id(block.x - block.faceX, block.y - 1, block.z - block.faceZ);
      return hardGrid(world, frontFloorId) && hardGrid(world, backFloorId);
    }
    if (block.feature === 'balcony' || block.feature === 'greenery') {
      return built.has(key(block.x - block.faceX, block.y, block.z - block.faceZ));
    }
    if (block.feature === 'slope' || block.feature === 'stair') {
      return built.has(key(block.x, block.y - 1, block.z)) ||
        built.has(key(block.x - block.faceX, block.y - 1, block.z - block.faceZ));
    }
    if (block.feature === 'beam' || block.feature === 'brace' || block.feature === 'cable') {
      return built.has(key(block.x, block.y - 1, block.z)) ||
        built.has(key(block.x - block.faceX, block.y, block.z - block.faceZ)) ||
        built.has(key(block.x + block.faceX, block.y, block.z + block.faceZ));
    }
    if (block.feature === 'lamp' || block.feature === 'water') {
      return built.has(key(block.x, block.y - 1, block.z));
    }
    if (built.has(key(block.x, block.y - 1, block.z))) {
      return true;
    }
    for (let i = 0; i < 4; i++) {
      const dx = i === 0 ? 1 : i === 1 ? -1 : 0;
      const dz = i === 2 ? 1 : i === 3 ? -1 : 0;
      const neighborKey = key(block.x + dx, block.y, block.z + dz);
      const neighbor = world.blockByKey.get(neighborKey);
      if (built.has(neighborKey) && (FLOOR_TYPES.has(block.feature) || occupancy(neighbor.feature) !== 'floor')) {
        return true;
      }
    }
    return false;
  }

  function hardGrid(world, id) {
    return world.solidGrid[id] === 1 || world.doorGrid[id] === 1;
  }

  function canSupportSolid(block) {
    return occupancy(block.feature) === 'solid' || occupancy(block.feature) === 'passage';
  }

  function allowsPassageStep(x, y, z, nx, ny, nz, world) {
    const from = world.blockByKey.get(key(x, y, z));
    const to = world.blockByKey.get(key(nx, ny, nz));
    const passage = from && PASSAGE_TYPES.has(from.feature) ? from : to && PASSAGE_TYPES.has(to.feature) ? to : null;
    if (passage) {
      const dx = nx - x;
      const dy = ny - y;
      const dz = nz - z;
      if (passage.feature === 'hatch') {
        return Math.abs(dx) + Math.abs(dy) + Math.abs(dz) === 1;
      }
      if (passage.additionalDoor) {
        return ny === y && Math.abs(dx) + Math.abs(dz) === 1;
      }
      return ny === y && Math.abs(dx) + Math.abs(dz) === 1 && dx * passage.faceX + dz * passage.faceZ !== 0;
    }
    const floorFrom = world.blockByKey.get(key(x, y - 1, z));
    const floorTo = world.blockByKey.get(key(nx, ny - 1, nz));
    const routed = floorFrom && (floorFrom.feature === 'slope' || floorFrom.feature === 'stair')
      ? floorFrom
      : floorTo && (floorTo.feature === 'slope' || floorTo.feature === 'stair')
        ? floorTo
        : null;
    if (!routed || ny === y) {
      return true;
    }
    const dx = nx - x;
    const dz = nz - z;
    return dx * routed.faceX + dz * routed.faceZ !== 0;
  }

  function createState() {
    return { doors: new Map(), doorsByCell: new Map(), water: [] };
  }

  function reset(state) {
    state.doors.clear();
    state.doorsByCell.clear();
    state.water.length = 0;
  }

  function build(block, context, state) {
    const group = new root.THREE.Group();
    group.position.set(block.x + 0.5, block.y, block.z + 0.5);
    group.scale.setScalar(0.001);
    BUILDERS[block.feature](group, block, context, state);
    context.parent.add(group);
    return group;
  }

  function material(block, roughness, metalness, options) {
    const settings = {
      color: root.MicroBuilders.MATERIAL[block.materialId].color,
      roughness: roughness,
      metalness: metalness,
    };
    if (options) {
      Object.assign(settings, options);
    }
    return new root.THREE.MeshStandardMaterial(settings);
  }

  function addBox(group, mat, size, position) {
    const mesh = new root.THREE.Mesh(new root.THREE.BoxGeometry(size[0], size[1], size[2]), mat);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  function faceRotation(block) {
    return Math.atan2(block.faceX, block.faceZ);
  }

  function buildWindow(group, block, context) {
    const frame = new root.THREE.MeshStandardMaterial({ color: 0xc99b52, roughness: 0.28, metalness: 0.78 });
    // Barely blue, almost clear.
    const glass = new root.THREE.MeshStandardMaterial({
      color: 0xd8f3fb,
      emissive: 0x0b2730,
      emissiveIntensity: 0.12,
      metalness: 0.08,
      roughness: 0.08,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: root.THREE.DoubleSide,
    });
    const alongX = block.faceX !== 0;
    const ox = block.faceX * 0.486;
    const oz = block.faceZ * 0.486;
    addBox(group, glass, [alongX ? 0.025 : 1.005, 1.005, alongX ? 1.005 : 0.025], [ox, 0.5, oz]);
    function matches(x, y, z) {
      const neighbor = context.getBlock(x, y, z);
      return neighbor && neighbor.feature === 'window' && neighbor.faceX === block.faceX && neighbor.faceZ === block.faceZ;
    }
    const negative = alongX ? matches(block.x, block.y, block.z - 1) : matches(block.x - 1, block.y, block.z);
    const positive = alongX ? matches(block.x, block.y, block.z + 1) : matches(block.x + 1, block.y, block.z);
    const below = matches(block.x, block.y - 1, block.z);
    const above = matches(block.x, block.y + 1, block.z);
    if (!below) {
      addBox(group, frame, [alongX ? 0.055 : 0.99, 0.055, alongX ? 0.99 : 0.055], [ox, 0.025, oz]);
    }
    if (!above) {
      addBox(group, frame, [alongX ? 0.055 : 0.99, 0.055, alongX ? 0.99 : 0.055], [ox, 0.975, oz]);
    }
    if (!negative) {
      addBox(group, frame, [0.055, 0.99, 0.055], [ox + (alongX ? 0 : -0.475), 0.5, oz + (alongX ? -0.475 : 0)]);
    }
    if (!positive) {
      addBox(group, frame, [0.055, 0.99, 0.055], [ox + (alongX ? 0 : 0.475), 0.5, oz + (alongX ? 0.475 : 0)]);
    }
  }

  function buildDoor(group, block, context, state) {
    const frame = material(block, 0.42, 0.52);
    const wood = new root.THREE.MeshStandardMaterial({ color: 0x75462b, roughness: 0.62, metalness: 0.08 });
    const gold = new root.THREE.MeshStandardMaterial({ color: 0xd8b75b, roughness: 0.24, metalness: 0.82 });
    const portal = new root.THREE.Group();
    portal.rotation.y = faceRotation(block);
    group.add(portal);
    // A walk-through box frame: a full roof slab (workers stand on it), a full floor and side walls
    // the depth of the cell. A cut-in door is walked through both ways, so it keeps slim jambs.
    addBox(portal, frame, [0.98, 0.08, 0.98], [0, 0.96, 0]);
    addBox(portal, frame, [0.98, 0.04, 0.98], [0, 0.02, 0]);
    const depth = block.additionalDoor ? 0.09 : 0.98;
    addBox(portal, frame, [0.09, 0.88, depth], [-0.445, 0.48, 0]);
    addBox(portal, frame, [0.09, 0.88, depth], [0.445, 0.48, 0]);
    const pivot = new root.THREE.Group();
    pivot.position.set(-0.4, 0, 0);
    const panel = addBox(pivot, wood, [0.8, 0.86, 0.055], [0.4, 0.47, 0]);
    panel.position.z = 0.01;
    addBox(pivot, gold, [0.035, 0.035, 0.09], [0.7, 0.48, 0.04]);
    portal.add(pivot);
    const view = { block: block, pivot: pivot, angle: 0, open: false };
    state.doors.set(block.id, view);
    state.doorsByCell.set(block.x + ',' + block.y + ',' + block.z, view);
  }

  function buildHatch(group, block) {
    const frame = material(block, 0.42, 0.52);
    const wood = new root.THREE.MeshStandardMaterial({ color: 0x75462b, roughness: 0.62, metalness: 0.08 });
    const gold = new root.THREE.MeshStandardMaterial({ color: 0xd8b75b, roughness: 0.24, metalness: 0.82 });
    addBox(group, frame, [1, 0.1, 0.1], [0, 0.05, -0.45]);
    addBox(group, frame, [1, 0.1, 0.1], [0, 0.05, 0.45]);
    addBox(group, frame, [0.1, 0.1, 0.8], [-0.45, 0.05, 0]);
    addBox(group, frame, [0.1, 0.1, 0.8], [0.45, 0.05, 0]);
    addBox(group, wood, [0.055, 0.78, 0.84], [0.42, 0.44, 0]);
    addBox(group, gold, [0.08, 0.06, 0.08], [0.38, 0.48, 0.3]);
  }

  function buildBridge(group, block) {
    const colors = { stone: 0x777d82, metal: 0x6f8790, glass: 0x8fd9e6 };
    const transparent = block.style === 'glass';
    const slab = new root.THREE.MeshStandardMaterial({
      color: colors[block.style],
      roughness: transparent ? 0.12 : 0.5,
      metalness: block.style === 'metal' ? 0.72 : 0.15,
      transparent: transparent,
      opacity: transparent ? 0.58 : 1,
    });
    const rail = new root.THREE.MeshStandardMaterial({ color: 0x48565c, roughness: 0.38, metalness: 0.72 });
    addBox(group, slab, [0.96, 0.14, 0.96], [0, 0.91, 0]);
    addRails(group, block.rails, rail);
  }

  function addRails(group, rails, mat) {
    for (let side = 0; side < rails.length; side++) {
      if (!rails[side]) {
        continue;
      }
      const xSide = side < 2;
      const sign = side === 0 || side === 2 ? 1 : -1;
      addBox(group, mat, [xSide ? 0.06 : 0.9, 0.06, xSide ? 0.9 : 0.06], [xSide ? sign * 0.43 : 0, 1.48, xSide ? 0 : sign * 0.43]);
      for (let p = -1; p <= 1; p += 2) {
        addBox(group, mat, [0.055, 0.58, 0.055], [xSide ? sign * 0.43 : p * 0.4, 1.2, xSide ? p * 0.4 : sign * 0.43]);
      }
    }
  }

  function buildSlope(group, block) {
    const roof = new root.THREE.Group();
    roof.rotation.y = faceRotation(block);
    group.add(roof);
    const glass = block.style === 'glass';
    const positions = [
      [-0.5, 0.06, -0.5], [0.5, 0.06, -0.5], [0.5, 0.78, 0.5], [-0.5, 0.78, 0.5],
      [-0.5, 0.2, -0.5], [0.5, 0.2, -0.5], [0.5, 0.94, 0.5], [-0.5, 0.94, 0.5],
    ];
    const quads = [[4, 5, 6], [4, 6, 7], [0, 2, 1], [0, 3, 2], [0, 1, 5], [0, 5, 4], [3, 6, 2], [3, 7, 6], [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5]];
    const vertices = [];
    for (let i = 0; i < quads.length; i++) {
      for (let p = 0; p < 3; p++) vertices.push(positions[quads[i][p]][0], positions[quads[i][p]][1], positions[quads[i][p]][2]);
    }
    const geometry = new root.THREE.BufferGeometry();
    geometry.setAttribute('position', new root.THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    const wedge = new root.THREE.Mesh(geometry, material(block, glass ? 0.08 : 0.55, block.style === 'metal' ? 0.72 : 0.16, glass ? { transparent: true, opacity: 0.45 } : null));
    wedge.castShadow = true;
    wedge.receiveShadow = true;
    roof.add(wedge);
  }

  function buildBeam(group, block) {
    const alongX = block.faceX !== 0;
    const mat = material(block, 0.38, 0.66);
    const dark = material(block, 0.5, 0.4);
    if (block.style === 'round') {
      const beam = new root.THREE.Mesh(new root.THREE.CylinderGeometry(0.11, 0.11, 1.08, 16), mat);
      beam.rotation[alongX ? 'z' : 'x'] = Math.PI / 2;
      beam.position.y = 0.68;
      beam.castShadow = true;
      group.add(beam);
      for (let end = -1; end <= 1; end += 2) {
        const collar = new root.THREE.Mesh(new root.THREE.CylinderGeometry(0.16, 0.16, 0.06, 16), dark);
        collar.rotation[alongX ? 'z' : 'x'] = Math.PI / 2;
        collar.position.set(alongX ? end * 0.46 : 0, 0.68, alongX ? 0 : end * 0.46);
        group.add(collar);
      }
      return;
    }
    const length = alongX ? [1.08, 0.34, 0.08] : [0.08, 0.34, 1.08];
    const flange = alongX ? [1.08, 0.07, 0.26] : [0.26, 0.07, 1.08];
    addBox(group, mat, length, [0, 0.66, 0]);
    addBox(group, dark, flange, [0, 0.84, 0]);
    addBox(group, dark, flange, [0, 0.48, 0]);
  }

  function addRod(group, mat, from, to, radius) {
    const start = new root.THREE.Vector3(from[0], from[1], from[2]);
    const end = new root.THREE.Vector3(to[0], to[1], to[2]);
    const delta = end.clone().sub(start);
    const mesh = new root.THREE.Mesh(new root.THREE.CylinderGeometry(radius, radius, delta.length(), 8), mat);
    mesh.position.copy(start.add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new root.THREE.Vector3(0, 1, 0), delta.normalize());
    mesh.castShadow = true;
    group.add(mesh);
  }

  function buildBrace(group, block) {
    const mat = material(block, 0.32, 0.78);
    const plate = material(block, 0.4, 0.55);
    const alongX = block.faceX !== 0;
    const span = alongX ? [[-0.46, 0.08, 0], [0.46, 0.92, 0]] : [[0, 0.08, -0.46], [0, 0.92, 0.46]];
    addRod(group, mat, span[0], span[1], 0.055);
    if (block.style === 'cross') addRod(group, mat, [span[0][0], span[1][1], span[0][2]], [span[1][0], span[0][1], span[1][2]], 0.055);
    const boss = new root.THREE.Mesh(new root.THREE.CylinderGeometry(0.09, 0.09, 0.08, 12), plate);
    boss.rotation.x = Math.PI / 2;
    boss.position.y = 0.5;
    group.add(boss);
    for (let end = 0; end < 2; end++) {
      addBox(group, plate, alongX ? [0.12, 0.16, 0.16] : [0.16, 0.16, 0.12], span[end]);
    }
  }

  function buildArch(group, block) {
    const mat = material(block, 0.72, 0.18);
    const trim = material(block, 0.34, 0.48);
    const portal = new root.THREE.Group();
    portal.rotation.y = faceRotation(block);
    group.add(portal);
    addBox(portal, mat, [0.2, 0.58, 0.34], [-0.4, 0.29, 0]);
    addBox(portal, mat, [0.2, 0.58, 0.34], [0.4, 0.29, 0]);
    addBox(portal, trim, [0.28, 0.08, 0.4], [-0.4, 0.58, 0]);
    addBox(portal, trim, [0.28, 0.08, 0.4], [0.4, 0.58, 0]);
    if (block.style === 'pointed') {
      addRod(portal, mat, [-0.36, 0.58, 0], [0, 0.98, 0], 0.1);
      addRod(portal, mat, [0.36, 0.58, 0], [0, 0.98, 0], 0.1);
      addRod(portal, trim, [-0.28, 0.58, 0], [0, 0.9, 0], 0.035);
      addRod(portal, trim, [0.28, 0.58, 0], [0, 0.9, 0], 0.035);
      return;
    }
    const arch = new root.THREE.Mesh(new root.THREE.TorusGeometry(0.36, 0.1, 10, 28, Math.PI), mat);
    arch.position.y = 0.58;
    portal.add(arch);
    const inner = new root.THREE.Mesh(new root.THREE.TorusGeometry(0.27, 0.025, 8, 24, Math.PI), trim);
    inner.position.y = 0.58;
    portal.add(inner);
  }

  function buildStair(group, block) {
    const glass = block.style === 'glass';
    const metal = block.style === 'metal';
    const tread = material(block, glass ? 0.08 : 0.58, metal ? 0.72 : 0.12, glass ? { transparent: true, opacity: 0.55 } : null);
    const edge = material(block, 0.36, 0.6);
    const stair = new root.THREE.Group();
    stair.rotation.y = faceRotation(block);
    group.add(stair);
    for (let step = 0; step < 4; step++) {
      const z = -0.375 + step * 0.25;
      const top = 0.25 * (step + 1);
      addBox(stair, tread, [1.04, metal ? 0.06 : 0.22, 0.3], [0, top - (metal ? 0.03 : 0.11), z]);
      addBox(stair, edge, [1.06, 0.045, 0.07], [0, top, z + 0.13]);
    }
    addRod(stair, edge, [-0.48, 0.08, -0.42], [-0.48, 0.96, 0.42], 0.035);
    addRod(stair, edge, [0.48, 0.08, -0.42], [0.48, 0.96, 0.42], 0.035);
  }

  function buildBalcony(group, block) {
    buildBridge(group, block);
  }

  function buildDome(group, block) {
    const glass = block.style === 'glass';
    const shellMat = material(block, glass ? 0.06 : 0.46, glass ? 0.18 : 0.28, {
      transparent: glass,
      opacity: glass ? 0.38 : 1,
      side: root.THREE.DoubleSide,
    });
    const ribMat = material(block, 0.28, 0.74);
    addBox(group, ribMat, [0.92, 0.08, 0.92], [0, 0.04, 0]);
    const drum = new root.THREE.Mesh(
      new root.THREE.CylinderGeometry(glass ? 1.45 : 0.34, glass ? 1.62 : 0.38, glass ? 0.22 : 0.16, glass ? 16 : 8),
      ribMat
    );
    drum.position.y = glass ? 0.11 : 0.14;
    group.add(drum);
    const radius = glass ? 1.65 : 0.36;
    const lift = glass ? 0.05 : 0.2;
    shellMat.emissive = new root.THREE.Color(glass ? 0x8ef8ff : 0x000000);
    shellMat.emissiveIntensity = glass ? 0.28 : 0;
    const shell = new root.THREE.Mesh(new root.THREE.SphereGeometry(radius, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2), shellMat);
    shell.position.y = lift;
    group.add(shell);
    for (let i = 0; i < 12; i++) {
      const rib = new root.THREE.Mesh(new root.THREE.TorusGeometry(radius, glass ? 0.025 : 0.018, 6, 18, Math.PI / 2), ribMat);
      rib.position.y = lift;
      rib.rotation.y = i * Math.PI / 6;
      group.add(rib);
    }
    const finial = new root.THREE.Mesh(new root.THREE.ConeGeometry(glass ? 0.1 : 0.06, glass ? 0.38 : 0.22, 8), ribMat);
    finial.position.y = glass ? 1.9 : 0.68;
    group.add(finial);
    const orb = new root.THREE.Mesh(new root.THREE.SphereGeometry(glass ? 0.09 : 0.045, 10, 8), ribMat);
    orb.position.y = glass ? 1.68 : 0.56;
    group.add(orb);
  }

  function buildLamp(group, block) {
    const cold = block.style === 'cold';
    const metal = new root.THREE.MeshStandardMaterial({ color: cold ? 0x2e3842 : 0xc69245, roughness: 0.28, metalness: 0.82 });
    const glowColor = cold ? 0x9fdfff : 0xffb45a;
    const glass = new root.THREE.MeshStandardMaterial({
      color: glowColor,
      emissive: glowColor,
      emissiveIntensity: cold ? 0.85 : 1.35,
      roughness: 0.08,
      transparent: true,
      opacity: 0.55,
      side: root.THREE.DoubleSide,
    });
    addBox(group, metal, [0.28, 0.06, 0.28], [0, 0.03, 0]);
    addBox(group, metal, [0.08, 0.22, 0.08], [0, 0.16, 0]);
    for (let corner = 0; corner < 4; corner++) {
      const x = corner < 2 ? -0.1 : 0.1;
      const z = corner % 2 === 0 ? -0.1 : 0.1;
      addBox(group, metal, [0.025, 0.28, 0.025], [x, 0.4, z]);
    }
    addBox(group, glass, [0.16, 0.24, 0.015], [0, 0.4, 0.09]);
    addBox(group, glass, [0.16, 0.24, 0.015], [0, 0.4, -0.09]);
    addBox(group, glass, [0.015, 0.24, 0.16], [0.09, 0.4, 0]);
    addBox(group, glass, [0.015, 0.24, 0.16], [-0.09, 0.4, 0]);
    const cap = new root.THREE.Mesh(new root.THREE.ConeGeometry(0.16, 0.14, 4), metal);
    cap.position.y = 0.6;
    cap.rotation.y = Math.PI / 4;
    group.add(cap);
  }

  function buildWater(group, block, context, state) {
    const stone = material(block, 0.78, 0.08);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let i = 0; i < dirs.length; i++) {
      const neighbor = context.getBlock(block.x + dirs[i][0], block.y, block.z + dirs[i][1]);
      if (neighbor && neighbor.feature === 'water') continue;
      const alongX = dirs[i][0] !== 0;
      addBox(group, stone, [alongX ? 0.1 : 0.96, 0.16, alongX ? 0.96 : 0.1], [dirs[i][0] * 0.45, 0.4, dirs[i][1] * 0.45]);
    }
    const mat = new root.THREE.MeshStandardMaterial({
      color: block.style === 'cascade' ? 0x8ed8ef : 0x2f86b8,
      emissive: 0x0e4d68,
      emissiveIntensity: 0.45,
      roughness: 0.04,
      metalness: 0.15,
      transparent: true,
      opacity: 0.72,
      side: root.THREE.DoubleSide,
    });
    const mesh = new root.THREE.Mesh(new root.THREE.PlaneGeometry(0.84, 0.84, 8, 8), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.34;
    group.add(mesh);
    if (block.style === 'cascade') {
      const jet = new root.THREE.Mesh(new root.THREE.CylinderGeometry(0.035, 0.06, 0.42, 8), mat);
      jet.position.y = 0.62;
      group.add(jet);
    }
    state.water.push({ mesh: mesh, phase: block.x * 0.7 + block.z * 0.4, base: 0.34 });
  }

  function buildGreenery(group, block) {
    const stem = new root.THREE.MeshStandardMaterial({ color: 0x3f5c32, roughness: 0.9 });
    const leafMat = new root.THREE.MeshStandardMaterial({ color: 0x67a84a, roughness: 0.82 });
    const darkLeaf = new root.THREE.MeshStandardMaterial({ color: 0x3d7a3a, roughness: 0.86 });
    const wall = new root.THREE.Group();
    wall.rotation.y = faceRotation(block);
    group.add(wall);
    if (block.style === 'shrub') {
      const planter = material(block, 0.74, 0.12);
      addBox(wall, planter, [0.62, 0.22, 0.28], [0, 0.11, 0.28]);
      const crown = [[0, 0.38, 0.16], [-0.16, 0.5, 0], [0.16, 0.48, 0.02], [0, 0.64, 0.04], [0.05, 0.5, 0.16]];
      for (let i = 0; i < crown.length; i++) {
        const mesh = new root.THREE.Mesh(new root.THREE.SphereGeometry(i === 3 ? 0.16 : 0.13, 10, 8), i % 2 === 0 ? leafMat : darkLeaf);
        mesh.position.set(crown[i][0], crown[i][1], crown[i][2] + 0.22);
        wall.add(mesh);
      }
      return;
    }
    const stems = [[-0.28, 0.96], [0, 0.84], [0.26, 0.98]];
    for (let i = 0; i < stems.length; i++) addRod(wall, stem, [stems[i][0], 0.02, 0.42], [stems[i][0] * 0.3, stems[i][1], 0.36], 0.018);
    const leaves = [[-0.3, 0.2], [-0.08, 0.34], [0.22, 0.28], [-0.2, 0.52], [0.12, 0.58], [0.3, 0.72], [-0.02, 0.78], [0.16, 0.92]];
    for (let i = 0; i < leaves.length; i++) {
      const mesh = new root.THREE.Mesh(new root.THREE.SphereGeometry(0.1, 8, 6), i % 2 === 0 ? leafMat : darkLeaf);
      mesh.scale.set(1.4, 0.45, 0.7);
      mesh.position.set(leaves[i][0], leaves[i][1], 0.34);
      wall.add(mesh);
    }
  }

  function buildCable(group, block) {
    const mat = material(block, 0.3, 0.86);
    const cap = material(block, 0.24, 0.7);
    const alongX = block.faceX !== 0;
    if (block.style !== 'sag') {
      const glow = new root.THREE.MeshStandardMaterial({
        color: 0xb8fff4,
        emissive: 0x19f0cf,
        emissiveIntensity: 1.35,
        roughness: 0.18,
        metalness: 0.35,
      });
      const tube = new root.THREE.Mesh(new root.THREE.CylinderGeometry(0.08, 0.08, 1.08, 14), glow);
      tube.rotation[alongX ? 'z' : 'x'] = Math.PI / 2;
      tube.position.y = 0.58;
      group.add(tube);
      for (let end = -1; end <= 1; end += 2) {
        const collar = new root.THREE.Mesh(new root.THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), cap);
        collar.rotation[alongX ? 'z' : 'x'] = Math.PI / 2;
        collar.position.set(alongX ? end * 0.46 : 0, 0.58, alongX ? 0 : end * 0.46);
        group.add(collar);
      }
      return;
    }
    const segments = 8;
    let previous = alongX ? [-0.5, 0.84, 0] : [0, 0.84, -0.5];
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const droop = block.style === 'sag' ? Math.sin(t * Math.PI) * 0.34 : 0;
      const next = alongX ? [-0.5 + t, 0.84 - droop, 0] : [0, 0.84 - droop, -0.5 + t];
      addRod(group, mat, previous, next, 0.035);
      previous = next;
    }
    for (let end = -1; end <= 1; end += 2) {
      const socket = new root.THREE.Mesh(new root.THREE.SphereGeometry(0.07, 10, 8), cap);
      socket.position.set(alongX ? end * 0.5 : 0, 0.84, alongX ? 0 : end * 0.5);
      group.add(socket);
    }
  }

  function update(state, deltaTime, elapsedTime, walkers) {
    state.doors.forEach(function (view) {
      view.open = false;
    });
    for (let i = 0; i < walkers.length; i++) {
      const builder = walkers[i];
      const fromDoor = state.doorsByCell.get(builder.from[0] + ',' + builder.from[1] + ',' + builder.from[2]);
      const toDoor = state.doorsByCell.get(builder.to[0] + ',' + builder.to[1] + ',' + builder.to[2]);
      if (fromDoor) fromDoor.open = true;
      if (toDoor) toDoor.open = true;
    }
    state.doors.forEach(function (view) {
      const target = view.open ? Math.PI * 0.46 : 0;
      const direction = target > view.angle ? 1 : -1;
      view.angle += direction * deltaTime * 5;
      if ((direction > 0 && view.angle > target) || (direction < 0 && view.angle < target)) {
        view.angle = target;
      }
      view.pivot.rotation.y = view.angle;
    });
    for (let i = 0; i < state.water.length; i++) {
      state.water[i].mesh.position.y = state.water[i].base + Math.sin(elapsedTime * 1.7 + state.water[i].phase) * 0.015;
    }
  }

  const BUILDERS = {
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

  root.MicroBuilderFeatures = {
    installBlueprint: installBlueprint,
    validate: validate,
    finalize: finalize,
    occupancy: occupancy,
    occupy: occupy,
    supports: supports,
    canSupportSolid: canSupportSolid,
    allowsPassageStep: allowsPassageStep,
    createState: createState,
    reset: reset,
    build: build,
    update: update,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
