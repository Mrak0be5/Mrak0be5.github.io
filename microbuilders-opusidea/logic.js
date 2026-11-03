(function (root) {
  const Features = root.MicroBuilderFeatures;
  const SESSION_BALANCE = window.MicroBuildersBalance.session;
  const TUNING = window.MicroBuildersBalance.tuning;

  function evalFormula(formula, x) {
    const js = formula.replace(/\^/g, '**');
    return new Function('x', 'Math', 'return (' + js + ');')(x, Math);
  }

  function sessionValue(kind, level) {
    const spec = SESSION_BALANCE[kind];
    const locked = spec.overrides[String(level)];
    if (locked !== undefined) return locked;
    return evalFormula(spec.formula, level);
  }

  // A camp property line of the site graph at its level bought («Типовые проекты», «Скамейки», …).
  function campBoost(campaign, kind) {
    return sessionValue(kind, campaign.purchases[kind] || 0);
  }

  // Any site line's value at the level bought (0 levels — its formula at 0).
  function lineValue(campaign, kind) {
    return sessionValue(kind, (campaign && campaign.purchases[kind]) || 0);
  }
  const MATERIALS = [];

  // cell = mass of one mini-cube, grid = mini-cubes per edge (a cube is grid³ mini-cubes).
  // Mini-cube mass per grid: 1 → 2–100, 2 → 5–70, 3 → 10–120, 4 → 15–250, 5 → 25–800 kg.
  // The material ladder lives in balance.json → materials.ladder («Настройки» of the balance tool):
  // id, name, cell (mini-cube kg), grid, color, look, glow / glowStrength for diamonds.
  const MATERIAL_LADDER = window.MicroBuildersBalance.materials.ladder.map(function (item) { return Object.assign({}, item); });


  // Glass of windows: its own pile on every site with windows; not on the ladder (levels never
  // shift it).
  const GLASS = Object.assign({}, window.MicroBuildersBalance.materials.glass);
  for (let i = 0; i < MATERIAL_LADDER.length; i++) {
    const item = MATERIAL_LADDER[i];
    item.weight = item.cell * item.grid * item.grid * item.grid;
    MATERIALS.push(item);
  }
  GLASS.weight = GLASS.cell * GLASS.grid * GLASS.grid * GLASS.grid;
  MATERIALS.push(GLASS);

  const MATERIAL = {};
  for (let i = 0; i < MATERIALS.length; i++) MATERIAL[MATERIALS[i].id] = MATERIALS[i];

  const SHIRTS = [0x2f6fed, 0xd4543c, 0x2f9d6c, 0xef8a2a, 0x7a5af5, 0xdb4f8a, 0x1f8a8a, 0xc6a15b];

  const BALANCE = TUNING.builders;

  const VEHICLE = {
    basePlan: TUNING.machines.planBase,
    planStep: TUNING.machines.planStep,
    baseReach: 4,
    reachStep: 1,
    baseHeight: 3,
    heightStep: 1,
    driveSpeed: 3.8,
    loadSeconds: TUNING.machines.loadSeconds,
    turnSpeed: 4.2,
    boomSpeed: TUNING.machines.craneBoomSpeed,
    craneClearance: TUNING.machines.craneClearance,
  };

  const UPGRADES = {
    builders: { base: 200, growth: 1.92 },
    speed: { base: 80, growth: 1.64 },
    carry: { base: 50, growth: 1.6 },
    horizontal: { base: 90, growth: 1.62 },
    vertical: { base: 100, growth: 1.68 },
    plan: { base: 80, growth: 1.6 },
    vehicles: { base: 600, growth: 2.15 },
    vehicleHeight: { base: 240, growth: 1.78 },
    vehicleReach: { base: 220, growth: 1.75 },
    scaffold: { base: 110, growth: 1.72 },
    kitchen: { base: 500, growth: 3.2 },
    pickup: { base: 70, growth: 1.58 },
    smokeRare: { base: 90, growth: 1.7 },
    smokeShort: { base: 90, growth: 1.7 },
    lightCarry: { base: 80, growth: 1.66 },
    cubePay: { base: 120, growth: 1.74 },
    cubeCapital: { base: 160, growth: 1.8 },
    payMultiplier: { base: 180, growth: 1.82 },
    floorPay: { base: 200, growth: 1.84 },
    freeBuy: { base: 220, growth: 1.9 },
    triplePay: { base: 240, growth: 1.88 },
    triplePower: { base: 260, growth: 1.9 },
    engineers: { base: 280, growth: 1.92 },
    loaderSpeed: { base: 140, growth: 1.7 },
    boomSpeed: { base: 160, growth: 1.72 },
    gather: { base: 150, growth: 1.7 },
    droneSpeed: { base: 150, growth: 1.7 },
    droneBuild: { base: 160, growth: 1.72 },
    loaderMass: { base: 180, growth: 1.76 },
    patternHeight: { base: 170, growth: 1.74 },
    bucket: { base: 170, growth: 1.74 },
    helicopters: { base: 900, growth: 2.2 },
    heliSpeed: { base: 200, growth: 1.74 },
    heliMass: { base: 220, growth: 1.78 },
    heliWidth: { base: 210, growth: 1.76 },
    heliHeight: { base: 210, growth: 1.76 },
    elevators: { base: 500, growth: 2.05 },
    elevatorSpeed: { base: 160, growth: 1.7 },
    elevatorHeight: { base: 180, growth: 1.74 },
  };

  const DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const EMPTY_SET = new Set();
  const ROUTE_NONE = 0;
  const ROUTE_STARTED = 1;
  const ROUTE_WAITING = 2;
  const SURFACE_LADDER = 1;
  const SURFACE_DECK = 2;
  const SURFACE_STATE_COUNT = 4;

  const SCAFFOLD = {
    enabled: true,
    step: 1,
    erectSeconds: TUNING.scaffold.erectSeconds,
    horizontalPrice: TUNING.scaffold.horizontalPrice,
    verticalPrice: TUNING.scaffold.verticalPrice,
    shortcutRoutes: true,
    expansionBudget: 10000,
    ladderPrice: TUNING.scaffold.ladderPrice,
    deckPrice: TUNING.scaffold.deckPrice,
    passagePrice: TUNING.scaffold.passagePrice,
  };
  // Air taxis (docs/gdd/02-construction-session.md → «Аэротакси»): flight speeds as multiples of the
  // worker's ground walk, the climb above the highest built cube, boarding and getting off (seconds);
  // prefer — he takes the taxi while it is no slower than walking × prefer; minFloors — the line
  // opens once the building stands that many floors high.
  const TAXI = { fly: 2.5, rise: 1.5, clearance: 3, board: 1, prefer: 1.2, minFloors: 5 };

  // Scaffold types and wear (tuning.scaffold, docs/gdd/02-construction-session.md → «Леса»). Every
  // tierFloors floors the scaffolds change type (`tiers` types, the last one goes on up): each type
  // takes tierTime times longer to set and to repair than the one below. A piece has durability
  // (tierDurability times more a type); every pass of a worker over it takes workerWeight plus his
  // load. At crackShare it cracks, at zero it closes: the way through it is gone until a worker
  // repairs it in repairShare of its set time.
  const WEAR = TUNING.scaffold;
  const BROKEN_MAST = 1;
  const BROKEN_DECK = 2;
  const tierFactors = [];

  // Type of a piece on level y (a ladder spans y…y + 1): 1 on floors 1–5, 2 on 6–10, …
  function scaffoldTier(y) {
    return Math.min(WEAR.tiers || 1, Math.floor(Math.max(0, y) / (WEAR.tierFloors || Infinity)) + 1);
  }

  // How many times longer a piece on level y takes to set than one of the first type.
  function tierTimeFactor(y) {
    return tierFactors[y] || (tierFactors[y] = Math.pow(WEAR.tierTime || 1, scaffoldTier(y) - 1));
  }

  function pieceDurability(piece) {
    return (WEAR.durability > 0 ? WEAR.durability : Infinity) * Math.pow(WEAR.tierDurability || 1, scaffoldTier(piece.y) - 1);
  }


  function cellKey(x, y, z) {
    return x + ',' + y + ',' + z;
  }

  function createBlueprint() {
    const cells = new Map();
    const seals = [];

    function put(x, y, z, materialId) {
      cells.set(cellKey(x, y, z), { x: x, y: y, z: z, materialId: materialId });
    }

    function feature(x, y, z, materialId, type, faceX, faceZ, style) {
      cells.set(cellKey(x, y, z), {
        x: x,
        y: y,
        z: z,
        materialId: materialId,
        feature: type,
        faceX: faceX,
        faceZ: faceZ,
        style: style,
      });
    }

    function paint(x, y, z, materialId) {
      const cell = cells.get(cellKey(x, y, z));
      if (!cell) return;
      cell.materialId = materialId;
    }

    function box(x0, y0, z0, x1, y1, z1, materialId) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          for (let x = x0; x <= x1; x++) put(x, y, z, materialId);
        }
      }
    }

    function walls(x0, y0, z0, x1, y1, z1, materialId) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          for (let x = x0; x <= x1; x++) {
            if (x === x0 || x === x1 || z === z0 || z === z1) put(x, y, z, materialId);
          }
        }
      }
    }

    function cut(x, y, z) {
      const key = cellKey(x, y, z);
      if (!cells.has(key)) return;
      cells.delete(key);
      seals.push({ x: x, y: y, z: z });
    }

    function carve(x, z, y0, height, width) {
      for (let w = 0; w < width; w++) {
        for (let i = 0; i < height; i++) cut(x + w, y0 + i, z);
      }
    }

    function post(x, z, y0, y1, materialId) {
      for (let y = y0; y <= y1; y++) put(x, y, z, materialId);
    }

    function gable(x0, x1, z0, z1, y, materialId) {
      let inset = 0;
      while (x0 + inset <= x1 - inset) {
        box(x0 + inset, y + inset, z0, x1 - inset, y + inset, z1, materialId);
        inset += 1;
      }
    }

    function pyramid(x0, x1, z0, z1, y, materialId) {
      let inset = 0;
      while (x0 + inset <= x1 - inset && z0 + inset <= z1 - inset) {
        box(x0 + inset, y + inset, z0 + inset, x1 - inset, y + inset, z1 - inset, materialId);
        inset += 1;
      }
    }

    function band(x0, x1, y, z0, z1, materialId) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) paint(x, y, z, materialId);
      }
    }

    function crenels(x0, x1, z0, z1, y, materialId) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          const edge = x === x0 || x === x1 || z === z0 || z === z1;
          if (!edge || ((x + z) & 1) !== 0) continue;
          if (!cells.has(cellKey(x, y - 1, z))) continue;
          put(x, y, z, materialId);
        }
      }
    }

    function rampRun(x, z0, z1, steps, dx, materialId) {
      for (let i = 0; i < steps; i++) {
        const columnX = x + dx * i;
        for (let z = z0; z <= z1; z++) {
          for (let y = 0; y <= i; y++) put(columnX, y, z, materialId);
        }
      }
    }

    function rampRiseZ(z, x0, x1, steps, dz, materialId) {
      for (let i = 0; i < steps; i++) {
        const columnZ = z + dz * i;
        for (let x = x0; x <= x1; x++) {
          for (let y = 0; y <= i; y++) put(x, y, columnZ, materialId);
        }
      }
    }

    function lantern(y0, radii, materialId, hubId) {
      for (let i = 0; i < radii.length; i++) {
        const radius = radii[i];
        const y = y0 + i;
        walls(-radius, y, -radius, radius, y, radius, materialId);
        for (let x = -radius; x <= radius; x++) put(x, y, 0, hubId);
        for (let z = -radius; z <= radius; z++) put(0, y, z, hubId);
      }
    }

    function has(x, y, z) {
      return cells.has(cellKey(x, y, z));
    }

    function get(x, y, z) {
      return cells.get(cellKey(x, y, z));
    }

    const api = {
      cells: cells,
      seals: seals,
      has: has,
      get: get,
      put: put,
      paint: paint,
      box: box,
      walls: walls,
      cut: cut,
      carve: carve,
      post: post,
      gable: gable,
      pyramid: pyramid,
      band: band,
      crenels: crenels,
      rampRun: rampRun,
      rampRiseZ: rampRiseZ,
      lantern: lantern,
    };
    Features.installBlueprint(api, feature);
    return api;
  }

  function classifyShell(cells, seals) {
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (const cell of cells.values()) {
      if (cell.x < minX) minX = cell.x;
      if (cell.z < minZ) minZ = cell.z;
      if (cell.x > maxX) maxX = cell.x;
      if (cell.y > maxY) maxY = cell.y;
      if (cell.z > maxZ) maxZ = cell.z;
    }
    minX -= 1;
    minZ -= 1;
    maxX += 1;
    maxZ += 1;
    maxY += 1;
    const minY = -1;
    const blocked = new Set();
    for (const key of cells.keys()) blocked.add(key);
    for (let i = 0; i < seals.length; i++) {
      const seal = seals[i];
      blocked.add(cellKey(seal.x, seal.y, seal.z));
    }
    const outside = new Set();
    const queue = [];
    let head = 0;
    function visit(x, y, z) {
      if (x < minX || x > maxX || y < minY || y > maxY || z < minZ || z > maxZ) return;
      const key = cellKey(x, y, z);
      if (blocked.has(key) || outside.has(key)) return;
      outside.add(key);
      queue.push(x, y, z);
    }
    visit(minX, minY, minZ);
    while (head < queue.length) {
      const x = queue[head++];
      const y = queue[head++];
      const z = queue[head++];
      visit(x + 1, y, z);
      visit(x - 1, y, z);
      visit(x, y + 1, z);
      visit(x, y - 1, z);
      visit(x, y, z + 1);
      visit(x, y, z - 1);
    }
    const shell = new Set();
    for (const cell of cells.values()) {
      const exposed =
        outside.has(cellKey(cell.x + 1, cell.y, cell.z)) ||
        outside.has(cellKey(cell.x - 1, cell.y, cell.z)) ||
        outside.has(cellKey(cell.x, cell.y, cell.z + 1)) ||
        outside.has(cellKey(cell.x, cell.y, cell.z - 1)) ||
        outside.has(cellKey(cell.x, cell.y + 1, cell.z)) ||
        (cell.y > 0 && outside.has(cellKey(cell.x, cell.y - 1, cell.z)));
      if (exposed) shell.add(cellKey(cell.x, cell.y, cell.z));
    }
    return shell;
  }

  function finalizeBlocks(bp) {
    const shell = classifyShell(bp.cells, bp.seals);
    let cx = 0;
    let cz = 0;
    const total = bp.cells.size;
    for (const cell of bp.cells.values()) {
      cx += cell.x;
      cz += cell.z;
    }
    cx /= total;
    cz /= total;
    const blocks = [];
    let id = 0;
    for (const cell of bp.cells.values()) {
      const dist = Math.abs(cell.x - cx) + Math.abs(cell.z - cz);
      const isShell = shell.has(cellKey(cell.x, cell.y, cell.z));
      blocks.push({
        id: id,
        x: cell.x,
        y: cell.y,
        z: cell.z,
        materialId: cell.materialId,
        feature: cell.feature,
        faceX: cell.faceX,
        faceZ: cell.faceZ,
        style: cell.style,
        shell: isShell,
        priority: cell.y * 100000 + (isShell ? 5000 : 0) + dist * 10,
      });
      id += 1;
    }
    const byKey = new Map();
    for (let i = 0; i < blocks.length; i++) byKey.set(cellKey(blocks[i].x, blocks[i].y, blocks[i].z), blocks[i]);
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.feature) Features.finalize(block, byKey);
    }
    // A window cell is two cubes deep: first a plain cube of the wall material, then a glass cube
    // into the same cell (glassOf — the wall cube's id). The glass cube carries the window feature
    // and turns the cell into the window; it is not in the cell grids (the wall cube is).
    const count = blocks.length;
    for (let i = 0; i < count; i++) {
      const wall = blocks[i];
      if (wall.feature !== 'window') continue;
      const glass = Object.assign({}, wall, { id: blocks.length, materialId: GLASS.id, priority: wall.priority + 1, glassOf: wall.id });
      wall.feature = null;
      wall.glassId = glass.id;
      blocks.push(glass);
    }
    return blocks;
  }

  function validateSpecialBlocks(bp) {
    Features.validate(bp);
  }

  function rockPattern(index) {
    const patterns = [
      [[0, 0, 0], [1, 0, 0], [0, 0, 1], [0, 1, 0], [-1, 0, 0], [1, 1, 0], [0, 0, -1]],
      [[0, 0, 0], [-1, 0, 0], [0, 0, -1], [0, 1, 0], [1, 0, 1], [0, 2, 0], [1, 0, 0]],
      [[0, 0, 0], [1, 0, -1], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 1, 0], [1, 0, 0]],
      [[0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 1], [-1, 0, 1], [0, 1, 0], [-1, 0, 0]],
      [[0, 0, 0], [1, 0, 1], [-1, 0, -1], [0, 1, 0], [0, 2, 0], [1, 0, 0], [0, 0, -1]],
    ];
    return patterns[index % patterns.length];
  }

  function layoutSite(blocks, mineGap) {
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = 0;
    let maxZ = -Infinity;
    const occupied = new Set();
    const materialIds = [];
    const seen = new Set();
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.x < minX) minX = block.x;
      if (block.z < minZ) minZ = block.z;
      if (block.x > maxX) maxX = block.x;
      if (block.y > maxY) maxY = block.y;
      if (block.z > maxZ) maxZ = block.z;
      occupied.add(cellKey(block.x, block.y, block.z));
      if (!seen.has(block.materialId)) {
        seen.add(block.materialId);
        materialIds.push(block.materialId);
      }
    }
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const baseRadius = Math.max(maxX - minX, maxZ - minZ) * 0.5 + mineGap;
    const mines = [];
    const rocks = [];
    for (let i = 0; i < materialIds.length; i++) {
      const spread = Math.PI * 0.95;
      const t = materialIds.length === 1 ? 0.5 : i / (materialIds.length - 1);
      const angle = Math.PI - spread / 2 + spread * t;
      let radius = baseRadius;
      let mx = 0;
      let mz = 0;
      let guard = 0;
      while (guard < 48) {
        mx = Math.round(cx + Math.sin(angle) * radius);
        mz = Math.round(cz + Math.cos(angle) * radius);
        let clear = true;
        for (let dz = -2; dz <= 2 && clear; dz++) {
          for (let dx = -2; dx <= 2 && clear; dx++) {
            for (let y = 0; y <= 2; y++) {
              if (occupied.has(cellKey(mx + dx, y, mz + dz))) {
                clear = false;
                break;
              }
            }
          }
        }
        if (clear) break;
        radius += 1;
        guard += 1;
      }
      const offsets = rockPattern(i);
      const rockKeys = new Set();
      const mineRocks = [];
      for (let r = 0; r < offsets.length; r++) {
        const ox = mx + offsets[r][0];
        const oy = offsets[r][1];
        const oz = mz + offsets[r][2];
        const key = cellKey(ox, oy, oz);
        rockKeys.add(key);
        occupied.add(key);
        const rock = { x: ox, y: oy, z: oz };
        mineRocks.push(rock);
        rocks.push(rock);
      }
      let stand = null;
      for (let ring = 2; ring <= 5 && !stand; ring++) {
        for (let dz = -ring; dz <= ring && !stand; dz++) {
          for (let dx = -ring; dx <= ring; dx++) {
            if (Math.abs(dx) !== ring && Math.abs(dz) !== ring) continue;
            const sx = mx + dx;
            const sz = mz + dz;
            const key = cellKey(sx, 0, sz);
            if (rockKeys.has(key) || occupied.has(key)) continue;
            stand = [sx, 0, sz];
            break;
          }
        }
      }
      occupied.add(cellKey(stand[0], stand[1], stand[2]));
      mines.push({
        materialId: materialIds[i],
        x: mx,
        z: mz,
        standX: stand[0],
        standY: stand[1],
        standZ: stand[2],
        rocks: mineRocks,
      });
    }
    const helipad = taxiHelipad(blocks, minX, maxX, minZ, maxZ, occupied, mines);
    const elevators = helipad ? [helipad] : [];
    const spawnPoints = [];
    const spawnCenterX = Math.round(cx);
    let spawnZ = maxZ + 5;
    while (spawnPoints.length < 24) {
      for (let offsetX = -5; offsetX <= 5 && spawnPoints.length < 24; offsetX++) {
        const x = spawnCenterX + offsetX;
        if (occupied.has(cellKey(x, 0, spawnZ))) continue;
        spawnPoints.push([x, 0, spawnZ]);
        occupied.add(cellKey(x, 0, spawnZ));
      }
      spawnZ += 1;
    }
    let boundMinX = minX;
    let boundMaxX = maxX;
    let boundMinZ = minZ;
    let boundMaxZ = maxZ;
    for (let i = 0; i < rocks.length; i++) {
      boundMinX = Math.min(boundMinX, rocks[i].x);
      boundMaxX = Math.max(boundMaxX, rocks[i].x);
      boundMinZ = Math.min(boundMinZ, rocks[i].z);
      boundMaxZ = Math.max(boundMaxZ, rocks[i].z);
    }
    for (let i = 0; i < spawnPoints.length; i++) {
      boundMinX = Math.min(boundMinX, spawnPoints[i][0]);
      boundMaxX = Math.max(boundMaxX, spawnPoints[i][0]);
      boundMinZ = Math.min(boundMinZ, spawnPoints[i][2]);
      boundMaxZ = Math.max(boundMaxZ, spawnPoints[i][2]);
    }
    boundMinX = Math.min(boundMinX, minX - 44);
    boundMaxX = Math.max(boundMaxX, maxX + 44);
    boundMinZ = Math.min(boundMinZ, minZ - 44);
    boundMaxZ = Math.max(boundMaxZ, maxZ + 44);
    const minesByMaterial = {};
    for (let i = 0; i < mines.length; i++) minesByMaterial[mines[i].materialId] = mines[i];
    return {
      materialIds: materialIds,
      mines: mines,
      minesByMaterial: minesByMaterial,
      rocks: rocks,
      spawnPoints: spawnPoints,
      bounds: {
        minX: boundMinX - 4,
        maxX: boundMaxX + 4,
        minZ: boundMinZ - 4,
        maxZ: boundMaxZ + 4,
        maxY: maxY + 4,
      },
      footprint: { minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ, maxY: maxY },
      elevators: elevators,
    };
  }

  // The air taxis' helipad (3×3) right by the quarries: the free spot with the shortest walk from the
  // mines' stands, each weighted by its cubes (the busiest quarries pull it closest). Not on the
  // building and the ring round it (2 cells for scaffolds), off the piles (3 cells from a mine's
  // centre) and their stands, clear of the drones' pad and the loaders' yard by the first mine.
  function taxiHelipad(blocks, minX, maxX, minZ, maxZ, occupied, mines) {
    const cubes = {};
    for (let i = 0; i < blocks.length; i++) cubes[blocks[i].materialId] = (cubes[blocks[i].materialId] || 0) + 1;
    const first = mines[0];
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const free = function (x, z) {
      if (occupied.has(cellKey(x, 0, z))) return false;
      if (x >= minX - 2 && x <= maxX + 2 && z >= minZ - 2 && z <= maxZ + 2) return false;
      for (let i = 0; i < mines.length; i++) {
        const m = mines[i];
        if (Math.max(Math.abs(m.x - x), Math.abs(m.z - z)) < 3) return false;
        if (Math.max(Math.abs(m.standX - x), Math.abs(m.standZ - z)) < 2) return false;
      }
      if (x >= first.x + 1 && x <= first.x + 8 && z >= first.z - 6 && z <= first.z + 1) return false;
      if (x >= first.x + 6 && z >= first.z + 4 && z <= first.z + 16) return false;
      return true;
    };
    let lowX = minX;
    let highX = maxX;
    let lowZ = minZ;
    let highZ = maxZ;
    for (let i = 0; i < mines.length; i++) {
      lowX = Math.min(lowX, mines[i].x);
      highX = Math.max(highX, mines[i].x);
      lowZ = Math.min(lowZ, mines[i].z);
      highZ = Math.max(highZ, mines[i].z);
    }
    let best = null;
    for (let z = lowZ - 10; z <= highZ + 10; z++) {
      for (let x = lowX - 10; x <= highX + 10; x++) {
        let clear = true;
        for (let dz = 0; dz < 3 && clear; dz++) {
          for (let dx = 0; dx < 3 && clear; dx++) clear = free(x + dx, z + dz);
        }
        if (!clear) continue;
        let walk = 0;
        for (let i = 0; i < mines.length; i++) {
          const m = mines[i];
          walk += (cubes[m.materialId] || 0) * (Math.abs(m.standX - (x + 1)) + Math.abs(m.standZ - (z + 1)));
        }
        // Equal walks: the one nearer the building (shorter flights).
        const score = walk / Math.max(1, blocks.length) + 0.01 * Math.hypot(x + 1.5 - cx, z + 1.5 - cz);
        if (!best || score < best.score) best = { x: x, z: z, score: score };
      }
    }
    if (!best) return null;
    for (let dz = 0; dz < 3; dz++) {
      for (let dx = 0; dx < 3; dx++) occupied.add(cellKey(best.x + dx, 0, best.z + dz));
    }
    return { x: best.x, z: best.z };
  }

  const LEVEL_SPECS = root.MicroBuilderLevelSpecs;

  // ---------- materials of a building by its mass (docs/gdd/12-materials.md) ----------
  // A campaign building is drawn in the first materials of the ladder; its mass (balance of the
  // calendar: levels.js → LEVEL_MASS) sets how long it is built, and its materials are picked for that
  // mass. Each part of the blueprint (all cubes of one drawn material) takes the material of the same
  // tone and texture whose mass is closest to its share, so red brick stays red, oak stays wood. The
  // body is structural; an accent (gem, diamond — heavier than any structural of its grid) goes on
  // one small part high up, or on the gems of the drawing (camp forms) in the closest gems that fit.
  // The exact mass comes from the lower (or upper) cubes of one part in a neighbouring material of the
  // same tone: a plinth or a band.
  const STRUCTURAL = MATERIAL_LADDER.filter(function (item) { return !item.accent; });
  const ACCENTS = MATERIAL_LADDER.filter(function (item) { return item.accent; });
  const LOOK_FAMILY = {
    stone: 'stone', sand: 'stone', concrete: 'stone', obsidian: 'stone',
    wood: 'wood', brick: 'brick', tile: 'brick', metal: 'metal', platinum: 'metal', marble: 'marble',
  };
  // Green gems stand out on a roof of any other colour: an accent only where nothing else fits.
  const GREEN_ACCENTS = { 'ladder-malachite': true, 'ladder-jade': true, 'ladder-emerald': true, 'ladder-turquoise': true };
  const PICK = {
    lookPenalty: 10,     // tone cost of another texture family (wood → brick)
    massWeight: 10,      // tone cost of a part's mass off its share by e times
    errorWeight: 60,     // cost of the building's mass off the target by e times, past the tolerance
    tolerance: 0.25,     // mass the picking may miss by (ln); the band of a part makes it exact
    accentShare: 0.12,   // an accent part: at most this share of the cubes…
    accentHeight: 0.45,  // …with its middle at least this high (share of the building's height)…
    accentMass: 0.25,    // …and at most this share of the building's mass
    drawnAccentMass: 0.5, // drawn trim (gems of a camp form): all of it at most this share of the mass
    gridPenalty: 12,     // accent cost per grid below the building's
    greenPenalty: 20,
    bandLook: 15,        // band material of another texture family
  };

  function labColor(color) {
    const rgb = [(color >> 16) & 255, (color >> 8) & 255, color & 255].map(function (v) {
      v /= 255;
      return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
    });
    const f = function (t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; };
    const x = f((rgb[0] * 0.4124 + rgb[1] * 0.3576 + rgb[2] * 0.1805) / 0.95047);
    const y = f(rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722);
    const z = f((rgb[0] * 0.0193 + rgb[1] * 0.1192 + rgb[2] * 0.9505) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  }
  for (let i = 0; i < MATERIALS.length; i++) MATERIALS[i].lab = labColor(MATERIALS[i].color);

  // How far a material is from the drawn one by look: colour distance (CIELAB) plus another texture.
  function toneCost(from, to) {
    const d = Math.hypot(from.lab[0] - to.lab[0], from.lab[1] - to.lab[1], from.lab[2] - to.lab[2]);
    return d + (LOOK_FAMILY[from.look] === LOOK_FAMILY[to.look] ? 0 : PICK.lookPenalty);
  }

  function pickMaterials(blocks, mass, maxGrid) {
    const parts = new Map();
    let height = 0;
    let cubes = 0;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.materialId === GLASS.id) continue;
      let part = parts.get(block.materialId);
      if (!part) {
        part = { from: MATERIAL[block.materialId], blocks: [], y: 0 };
        parts.set(block.materialId, part);
      }
      part.blocks.push(block);
      part.y += block.y;
      height = Math.max(height, block.y);
      cubes += 1;
    }
    if (!cubes) return;
    // The closest accent of the building's grid or below for a part, its cubes at most `share` of the
    // building's mass (null — none fits).
    let trim = 0;
    function accentFor(part, share) {
      let best = Infinity;
      let pick = null;
      for (let i = 0; i < ACCENTS.length; i++) {
        const item = ACCENTS[i];
        if (item.grid > maxGrid || trim + part.blocks.length * item.weight > share * mass) continue;
        const green = GREEN_ACCENTS[item.id] && !GREEN_ACCENTS[part.from.id];
        const cost = toneCost(part.from, item) + PICK.gridPenalty * (maxGrid - item.grid) + (green ? PICK.greenPenalty : 0);
        if (cost < best) {
          best = cost;
          pick = item;
        }
      }
      return pick;
    }
    // Trim: gems and diamonds of the drawing stay trim (the largest part first); without them, the
    // highest small part (of three or more) becomes it.
    const accents = [];
    const drawnTrim = [];
    parts.forEach(function (part) { if (part.from.accent) drawnTrim.push(part); });
    drawnTrim.sort(function (a, b) { return b.blocks.length - a.blocks.length; });
    drawnTrim.forEach(function (part) {
      const item = accentFor(part, PICK.drawnAccentMass);
      if (!item) return;
      accents.push({ part: part, item: item });
      trim += part.blocks.length * item.weight;
    });
    if (!drawnTrim.length && parts.size >= 3) {
      let accent = null;
      parts.forEach(function (part) {
        const middle = part.y / part.blocks.length;
        if (part.blocks.length > PICK.accentShare * cubes || middle < PICK.accentHeight * height) return;
        if (!accent || middle > accent.y / accent.blocks.length) accent = part;
      });
      const item = accent && accentFor(accent, PICK.accentMass);
      if (item) {
        accents.push({ part: accent, item: item });
        trim += accent.blocks.length * item.weight;
      }
    }
    const body = [];
    parts.forEach(function (part) {
      if (!accents.some(function (accent) { return accent.part === part; })) body.push(part);
    });
    const target = mass - trim;
    const candidates = STRUCTURAL.filter(function (item) { return item.grid <= maxGrid; });
    if (!body.length) {
      accents.forEach(function (accent) {
        for (let i = 0; i < accent.part.blocks.length; i++) accent.part.blocks[i].materialId = accent.item.id;
      });
      return;
    }
    let drawn = 0;
    let bodyCubes = 0;
    for (let p = 0; p < body.length; p++) {
      const part = body[p];
      part.tones = candidates.map(function (item) { return toneCost(part.from, item); });
      drawn += part.blocks.length * part.from.weight;
      bodyCubes += part.blocks.length;
    }
    // A choice (candidate index of each part) at scale k (the masses of the drawn materials × k):
    // tone + how far each part is off its scaled mass + the building's mass past the tolerance.
    function score(choice, k) {
      let total = 0;
      let cost = 0;
      for (let p = 0; p < body.length; p++) {
        const part = body[p];
        const item = candidates[choice[p]];
        total += part.blocks.length * item.weight;
        cost += part.blocks.length * (part.tones[choice[p]] + PICK.massWeight * Math.abs(Math.log(item.weight / (part.from.weight * k))));
      }
      const miss = Math.abs(Math.log(total / target));
      return { cost: cost / bodyCubes + PICK.errorWeight * Math.max(0, miss - PICK.tolerance), total: total };
    }
    let best = null;
    const k0 = target / drawn;
    for (let step = -60; step <= 60; step++) {
      const k = k0 * Math.exp(step * 0.025);
      const choice = body.map(function (part) {
        let pick = 0;
        let low = Infinity;
        for (let c = 0; c < candidates.length; c++) {
          const cost = part.tones[c] + PICK.massWeight * Math.abs(Math.log(candidates[c].weight / (part.from.weight * k)));
          if (cost < low) {
            low = cost;
            pick = c;
          }
        }
        return pick;
      });
      const result = score(choice, k);
      if (!best || result.cost < best.cost) best = { cost: result.cost, total: result.total, choice: choice, k: k };
    }
    // Then part by part, while any single change helps.
    for (let pass = 0; pass < 4; pass++) {
      let improved = false;
      for (let p = 0; p < body.length; p++) {
        for (let c = 0; c < candidates.length; c++) {
          if (c === best.choice[p]) continue;
          const choice = best.choice.slice();
          choice[p] = c;
          const result = score(choice, best.k);
          if (result.cost < best.cost - 1e-9) {
            best = { cost: result.cost, total: result.total, choice: choice, k: best.k };
            improved = true;
          }
        }
      }
      if (!improved) break;
    }
    for (let p = 0; p < body.length; p++) {
      const id = candidates[best.choice[p]].id;
      for (let i = 0; i < body[p].blocks.length; i++) body[p].blocks[i].materialId = id;
    }
    // The band: j cubes of one part in another material of its tone make up the rest of the mass —
    // the heavier material below.
    const delta = target - best.total;
    if (Math.abs(delta) > 0.005 * target) {
      let band = null;
      for (let p = 0; p < body.length; p++) {
        const part = body[p];
        const was = candidates[best.choice[p]];
        for (let c = 0; c < candidates.length; c++) {
          const item = candidates[c];
          if (item === was || (item.weight - was.weight) * delta <= 0) continue;
          const j = Math.round(delta / (item.weight - was.weight));
          if (j < 1 || j >= part.blocks.length) continue;
          const cost = part.tones[c] + (LOOK_FAMILY[item.look] === LOOK_FAMILY[was.look] ? 0 : PICK.bandLook) +
            PICK.massWeight / 2 * Math.abs(Math.log(item.weight / was.weight));
          if (!band || cost < band.cost) band = { cost: cost, part: part, item: item, j: j, heavier: item.weight > was.weight };
        }
      }
      if (band) {
        const order = band.part.blocks.slice().sort(function (a, b) { return (a.y - b.y) || (a.id - b.id); });
        if (!band.heavier) order.reverse();
        for (let i = 0; i < band.j; i++) order[i].materialId = band.item.id;
      }
    }
    accents.forEach(function (accent) {
      for (let i = 0; i < accent.part.blocks.length; i++) accent.part.blocks[i].materialId = accent.item.id;
    });
  }

  const LEVEL_MASS = root.MicroBuilderLevelMass || {};
  const LEVEL_GRID_FROM = root.MicroBuilderLevelGridFrom || [];

  // The heaviest grid of a campaign level by the calendar.
  function levelGrid(number) {
    let grid = 1;
    for (let i = 0; i < LEVEL_GRID_FROM.length; i++) if (number >= LEVEL_GRID_FROM[i][0]) grid = LEVEL_GRID_FROM[i][1];
    return grid;
  }

  // A school stage: its top material is the heaviest part's (the rest scales with it, as drawn);
  // a top lighter than the drawn heaviest keeps the drawing.
  function schoolMaterials(blocks, topId) {
    const top = MATERIAL[topId];
    if (!top) return;
    let heaviest = 0;
    let drawn = 0;
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].materialId === GLASS.id) continue;
      const weight = MATERIAL[blocks[i].materialId].weight;
      heaviest = Math.max(heaviest, weight);
      drawn += weight;
    }
    if (top.weight <= heaviest) return;
    pickMaterials(blocks, drawn * top.weight / heaviest, top.grid);
  }

  const HQ_LEVELS = {};
  root.MicroBuilderHqSpecs.forEach(function (spec) {
    const bp = createBlueprint();
    spec.build(bp);
    validateSpecialBlocks(bp);
    const blocks = finalizeBlocks(bp);
    const site = layoutSite(blocks, spec.mineGap);
    HQ_LEVELS[spec.id] = {
      index: 0,
      number: 'Штаб',
      name: spec.name,
      pace: spec.pace,
      blurb: spec.blurb,
      blocks: blocks,
      materialIds: site.materialIds,
      mines: site.mines,
      minesByMaterial: site.minesByMaterial,
      rocks: site.rocks,
      spawnPoints: site.spawnPoints,
      bounds: site.bounds,
      footprint: site.footprint,
      elevators: site.elevators,
    };
  });

  // Geometry stays fixed; every ten tiers advance the material palette.
  const SCHOOL_LEVELS = {}, SCHOOL_LEVEL_VARIANTS = {};
  const SCHOOL_MATERIAL_STAGES = root.MicroBuildersBalance.meta.school.materialStages;
  (root.MicroBuilderSchoolSpecs || []).forEach(function (spec, index) {
    SCHOOL_LEVEL_VARIANTS[spec.id] = SCHOOL_MATERIAL_STAGES.map(function (stage, phase) {
      const bp = createBlueprint();
      spec.build(bp);
      validateSpecialBlocks(bp);
      const blocks = finalizeBlocks(bp);
      schoolMaterials(blocks, stage.top);
      const site = layoutSite(blocks, spec.mineGap);
      return {
        index: index, number: 'Испытание', name: spec.name, pace: spec.pace, blurb: spec.blurb,
        phase: phase + 1, materialTop: stage.top,
        blocks: blocks, materialIds: site.materialIds, mines: site.mines, minesByMaterial: site.minesByMaterial,
        rocks: site.rocks, spawnPoints: site.spawnPoints, bounds: site.bounds, footprint: site.footprint, elevators: site.elevators,
      };
    });
    SCHOOL_LEVELS[spec.id] = SCHOOL_LEVEL_VARIANTS[spec.id][0];
  });

  function schoolLevel(id, tier) {
    const variants = SCHOOL_LEVEL_VARIANTS[id];
    if (!variants) return null;
    tier = Math.max(1, Math.floor(tier || 1));
    let phase = 0;
    SCHOOL_MATERIAL_STAGES.forEach(function (stage, index) { if (tier >= stage.fromTier) phase = index; });
    return variants[phase];
  }

  const LEVELS = LEVEL_SPECS.map(function (spec, index) {
    const bp = createBlueprint();
    spec.build(bp);
    validateSpecialBlocks(bp);
    const blocks = finalizeBlocks(bp);
    if (LEVEL_MASS[index + 1]) pickMaterials(blocks, LEVEL_MASS[index + 1], levelGrid(index + 1));
    const site = layoutSite(blocks, spec.mineGap);
    return {
      index: index,
      number: index + 1,
      name: spec.name,
      pace: spec.pace,
      blurb: spec.blurb,
      blocks: blocks,
      materialIds: site.materialIds,
      mines: site.mines,
      minesByMaterial: site.minesByMaterial,
      rocks: site.rocks,
      spawnPoints: site.spawnPoints,
      bounds: site.bounds,
      footprint: site.footprint,
      elevators: site.elevators,
    };
  });

  function createIndex(bounds) {
    const minX = bounds.minX;
    const maxX = bounds.maxX;
    const minZ = bounds.minZ;
    const maxZ = bounds.maxZ;
    const maxY = bounds.maxY;
    const sx = maxX - minX + 1;
    const sz = maxZ - minZ + 1;
    const size = sx * (maxY + 1) * sz;
    return {
      size: size,
      minX: minX,
      maxX: maxX,
      minZ: minZ,
      maxZ: maxZ,
      maxY: maxY,
      inside: function (x, y, z) {
        return x >= minX && x <= maxX && z >= minZ && z <= maxZ && y >= 0 && y <= maxY;
      },
      id: function (x, y, z) {
        return (y * sz + (z - minZ)) * sx + (x - minX);
      },
      decode: function (n) {
        const x = minX + (n % sx);
        const rest = Math.floor(n / sx);
        const z = minZ + (rest % sz);
        const y = Math.floor(rest / sz);
        return [x, y, z];
      },
      decodeInto: function (n, out) {
        const rest = Math.floor(n / sx);
        out[0] = minX + (n % sx);
        out[1] = Math.floor(rest / sz);
        out[2] = minZ + (rest % sz);
      },
    };
  }

  function createHeap() {
    const items = [];
    return {
      get size() {
        return items.length / 2;
      },
      clear: function () {
        items.length = 0;
      },
      push: function (priority, value) {
        items.push(priority, value);
        let i = items.length / 2 - 1;
        while (i > 0) {
          const parent = (i - 1) >> 1;
          if (items[parent * 2] <= items[i * 2]) break;
          const parentPriority = items[parent * 2];
          const parentValue = items[parent * 2 + 1];
          items[parent * 2] = items[i * 2];
          items[parent * 2 + 1] = items[i * 2 + 1];
          items[i * 2] = parentPriority;
          items[i * 2 + 1] = parentValue;
          i = parent;
        }
      },
      pop: function () {
        const value = items[1];
        const lastPriority = items[items.length - 2];
        const lastValue = items[items.length - 1];
        items.length -= 2;
        if (items.length === 0) return value;
        items[0] = lastPriority;
        items[1] = lastValue;
        let i = 0;
        const count = items.length / 2;
        while (true) {
          const left = i * 2 + 1;
          const right = left + 1;
          let smallest = i;
          if (left < count && items[left * 2] < items[smallest * 2]) smallest = left;
          if (right < count && items[right * 2] < items[smallest * 2]) smallest = right;
          if (smallest === i) break;
          const swapPriority = items[smallest * 2];
          const swapValue = items[smallest * 2 + 1];
          items[smallest * 2] = items[i * 2];
          items[smallest * 2 + 1] = items[i * 2 + 1];
          items[i * 2] = swapPriority;
          items[i * 2 + 1] = swapValue;
          i = smallest;
        }
        return value;
      },
    };
  }

  function canStand(x, y, z, world) {
    const index = world.index;
    const grid = world.solidGrid;
    if (!index.inside(x, y, z)) return false;
    const id = index.id(x, y, z);
    if (grid[id] === 1) return false;
    if (world.waterGrid[id] === 1) return false;
    if (world.doorGrid[id] === 1) return true;
    if (y === 0) return true;
    if (world.mastGrid[id] === 1 || world.deckGrid[id] === 1) return true;
    if (index.inside(x, y - 1, z) && grid[index.id(x, y - 1, z)] === 1) return true;
    if (index.inside(x, y - 1, z) && world.bridgeGrid[index.id(x, y - 1, z)] === 1) return true;
    if (index.inside(x, y - 1, z) && world.doorGrid[index.id(x, y - 1, z)] === 1) return true;
    if (index.inside(x, y - 1, z) && world.mastGrid[index.id(x, y - 1, z)] === 1) return true;
    if (!SCAFFOLD.enabled) {
      for (let d = 0; d < DIRS.length; d++) {
        const nx = x + DIRS[d][0];
        const nz = z + DIRS[d][1];
        if (index.inside(nx, y, nz) && grid[index.id(nx, y, nz)] === 1) return true;
        if (index.inside(nx, y - 1, nz) && grid[index.id(nx, y - 1, nz)] === 1) return true;
      }
    }
    return false;
  }

  function deckCell(x, y, z, world) {
    const index = world.index;
    if (!index.inside(x, y, z)) return false;
    return world.deckGrid[index.id(x, y, z)] === 1;
  }

  function ladderColumn(x, y, z, world) {
    const index = world.index;
    if (!index.inside(x, y, z)) return false;
    const block = world.blockGrid[index.id(x, y, z)];
    if (block && block.feature === 'hatch') return true;
    if (world.mastGrid[index.id(x, y, z)] === 1) return true;
    if (y > 0 && index.inside(x, y - 1, z) && world.mastGrid[index.id(x, y - 1, z)] === 1) return true;
    return false;
  }

  function takeStamp(world) {
    world.searchStamp += 1;
    if (world.searchStamp === 4294967295) {
      world.xStamp.fill(0);
      world.searchStamp = 1;
    }
    return world.searchStamp;
  }

  function bumpNav(world) {
    world.navEpoch += 1;
    world.navSerial += 1;
    if (world.navEpoch === 4294967295) {
      world.navStamp.fill(0);
      world.navEpoch = 1;
    }
    world.navCursor = 0;
  }

  function invalidateNav(world, x, y, z) {
    const index = world.index;
    world.navSerial += 1;
    world.metrics.invalidations += 1;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          const nz = z + dz;
          if (ny < 0 || !index.inside(nx, ny, nz)) continue;
          const id = index.id(nx, ny, nz);
          world.navStamp[id] = 0;
        }
      }
    }
  }

  function invalidateNavBatch(world, blocks) {
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.x < minX) minX = block.x;
      if (block.y < minY) minY = block.y;
      if (block.z < minZ) minZ = block.z;
      if (block.x > maxX) maxX = block.x;
      if (block.y > maxY) maxY = block.y;
      if (block.z > maxZ) maxZ = block.z;
    }
    world.navSerial += 1;
    world.metrics.invalidations += 1;
    for (let y = minY - 2; y <= maxY + 2; y++) {
      for (let z = minZ - 2; z <= maxZ + 2; z++) {
        for (let x = minX - 2; x <= maxX + 2; x++) {
          if (y < 0 || !world.index.inside(x, y, z)) continue;
          world.navStamp[world.index.id(x, y, z)] = 0;
        }
      }
    }
  }

  function wakeVehicles(world) {
    world.vehicleWorkSerial += 1;
  }

  // A cell the body can pass through on the way: nothing solid, no door or other built feature.
  function passClear(x, y, z, world) {
    const index = world.index;
    if (!index.inside(x, y, z)) return false;
    const id = index.id(x, y, z);
    if (world.solidGrid[id] === 1 || world.doorGrid[id] === 1) return false;
    const block = world.blockGrid[id];
    return !(block && block.built && block.feature);
  }

  function hatchAt(x, y, z, world) {
    const index = world.index;
    if (!index.inside(x, y, z)) return false;
    const block = world.blockGrid[index.id(x, y, z)];
    return !!(block && block.feature === 'hatch');
  }

  // The space a move up or down really goes through (MB.builderPosition draws it the same way):
  // - straight up or down needs a ladder piece spanning the two floors (the piece at the lower one)
  //   or a hatch — a ladder that starts a floor higher can't be reached from the ground;
  // - onto a cube he climbs straight up in his own column first: that cell above him must be free;
  // - off a cube he steps to the edge and drops: the cell over the landing, at his height, must be
  //   free — no jumping down through a cube.
  function climbClear(x, y, z, nx, ny, nz, world) {
    if (!SCAFFOLD.enabled) return true;
    if (nx === x && nz === z) {
      const low = Math.min(y, ny);
      const index = world.index;
      return world.mastGrid[index.id(x, low, z)] === 1 || hatchAt(x, y, z, world) || hatchAt(x, ny, z, world);
    }
    return ny > y ? passClear(x, ny, z, world) : passClear(nx, y, nz, world);
  }

  function collectNeighbors(x, y, z, world) {
    const result = world.neighborIds;
    const index = world.index;
    const step = SCAFFOLD.step;
    result.length = 0;
    function add(nx, ny, nz) {
      if (!index.inside(nx, ny, nz)) return;
      if (Math.abs(ny - y) > step) return;
      if (ny !== y &&
          ((deckCell(x, y, z, world) && !ladderColumn(x, y, z, world)) ||
           (deckCell(nx, ny, nz, world) && !ladderColumn(nx, ny, nz, world)))) return;
      if ((nx !== x || nz !== z) && ny !== y && (ladderColumn(x, y, z, world) || ladderColumn(nx, ny, nz, world))) return;
      if (!canStand(nx, ny, nz, world)) return;
      if (!Features.allowsPassageStep(x, y, z, nx, ny, nz, world)) return;
      if (ny !== y && !climbClear(x, y, z, nx, ny, nz, world)) return;
      const id = index.id(nx, ny, nz);
      for (let n = 0; n < result.length; n++) if (result[n] === id) return;
      result.push(id);
    }
    let dy = 0;
    while (dy <= step) {
      if (dy !== 0) add(x, y + dy, z);
      if (dy !== 0) add(x, y - dy, z);
      for (let i = 0; i < DIRS.length; i++) {
        add(x + DIRS[i][0], y + dy, z + DIRS[i][1]);
        if (dy !== 0) add(x + DIRS[i][0], y - dy, z + DIRS[i][1]);
      }
      dy += 1;
    }
    return result;
  }

  function standNeighbors(x, y, z, world) {
    const index = world.index;
    const id = index.id(x, y, z);
    const result = world.neighborIds;
    if (world.navStamp[id] === world.navEpoch) {
      const start = world.navHead[id];
      const count = world.navCount[id];
      const pool = world.navPool;
      result.length = count;
      for (let i = 0; i < count; i++) result[i] = pool[start + i];
      return result;
    }
    collectNeighbors(x, y, z, world);
    const count = result.length;
    if (world.navCursor + count > world.navPool.length) bumpNav(world);
    const start = world.navCursor;
    const pool = world.navPool;
    for (let i = 0; i < count; i++) pool[start + i] = result[i];
    world.navCursor = start + count;
    world.navHead[id] = start;
    world.navCount[id] = count;
    world.navStamp[id] = world.navEpoch;
    return result;
  }

  function refreshSafeGround(world) {
    if (world.safeGroundSerial === world.navSerial) return;
    world.safeGroundEpoch += 1;
    if (world.safeGroundEpoch === 4294967295) {
      world.safeGroundStamp.fill(0);
      world.safeGroundEpoch = 1;
    }
    const epoch = world.safeGroundEpoch;
    const queue = world.safeGroundQueue;
    const stamp = world.safeGroundStamp;
    const index = world.index;
    queue.length = 0;
    for (let i = 0; i < world.level.spawnPoints.length; i++) {
      const spawn = world.level.spawnPoints[i];
      if (spawn[1] !== 0 || !canStand(spawn[0], 0, spawn[2], world)) continue;
      const id = index.id(spawn[0], 0, spawn[2]);
      if (stamp[id] === epoch) continue;
      stamp[id] = epoch;
      queue.push(id);
    }
    let head = 0;
    while (head < queue.length) {
      const id = queue[head++];
      index.decodeInto(id, world.safeGroundCell);
      const x = world.safeGroundCell[0];
      const z = world.safeGroundCell[2];
      for (let d = 0; d < DIRS.length; d++) {
        const nx = x + DIRS[d][0];
        const nz = z + DIRS[d][1];
        if (!index.inside(nx, 0, nz) || !canStand(nx, 0, nz, world)) continue;
        if (!Features.allowsPassageStep(x, 0, z, nx, 0, nz, world)) continue;
        const nextId = index.id(nx, 0, nz);
        if (stamp[nextId] === epoch) continue;
        stamp[nextId] = epoch;
        queue.push(nextId);
      }
    }
    world.safeGroundSerial = world.navSerial;
  }

  function isSafeGround(cell, world) {
    if (cell[1] !== 0) return false;
    refreshSafeGround(world);
    const id = world.index.id(cell[0], 0, cell[2]);
    return world.safeGroundStamp[id] === world.safeGroundEpoch;
  }

  // Path prices are times, in flat steps at the crew's current speeds (refreshPathPrices): a step onto
  // or off a cube is a flat step plus the climb, a ladder floor is the climb alone. So going round a
  // cube beats climbing over it whenever walking round is actually quicker.
  function moveCost(x, y, z, nx, ny, nz) {
    if (ny === y) return SCAFFOLD.horizontalPrice;
    const climb = SCAFFOLD.verticalPrice * Math.abs(ny - y);
    if (nx === x && nz === z) return climb;
    // Off a cube he jumps: half the climb (segmentSpeed).
    return SCAFFOLD.horizontalPrice + (ny < y ? climb / JUMP_DOWN : climb);
  }

  function refreshPathPrices(world) {
    const walk = walkSpeedNow(world);
    const climb = climbSpeedNow(world);
    if (!(walk > 0) || !(climb > 0)) return;
    SCAFFOLD.horizontalPrice = 1;
    SCAFFOLD.verticalPrice = walk / climb;
    // Setting a ladder or deck piece: its erect time in flat steps.
    SCAFFOLD.ladderPrice = scaffoldSeconds(world.campaign, world.level.pace) * walk;
    SCAFFOLD.deckPrice = SCAFFOLD.ladderPrice;
  }

  function findPath(start, goalIds, world) {
    const started = performance.now();
    world.metrics.pathSearches += 1;
    const path = findRouteAStar(world, null, start, false, goalIds, Infinity, false, false);
    world.metrics.path += performance.now() - started;
    return path;
  }

  function buildSurfaceMode(x, y, z, world) {
    const id = world.index.id(x, y, z);
    let mode = 0;
    if (ladderColumn(x, y, z, world)) mode |= SURFACE_LADDER;
    if (world.deckGrid[id] === 1) mode |= SURFACE_DECK;
    return mode;
  }

  function hasSolidFloor(x, y, z, world) {
    if (y === 0) return true;
    const index = world.index;
    if (!index.inside(x, y - 1, z)) return false;
    const below = index.id(x, y - 1, z);
    return world.solidGrid[below] === 1 || world.bridgeGrid[below] === 1 || world.doorGrid[below] === 1;
  }

  function canBuildBlockFrom(x, y, z, mode, block, world) {
    const dx = block.x - x;
    const dy = block.y - y;
    const dz = block.z - z;
    if ((hasSolidFloor(x, y, z, world) || (!SCAFFOLD.enabled && canStand(x, y, z, world))) &&
        BuildPatterns.allows(0, dx, dy, dz)) return true;
    if ((mode & SURFACE_LADDER) !== 0 && BuildPatterns.allows(1, dx, dy, dz)) return true;
    if ((mode & SURFACE_DECK) !== 0 && BuildPatterns.allows(2, dx, dy, dz)) return true;
    return false;
  }

  function isSupported(block, world) {
    // Window glass goes into its wall cube: ready once that cube and the cube above it (the
    // lintel, if the plan has one) are built.
    if (block.glassOf !== undefined) {
      if (!world.blocks[block.glassOf].built) return false;
      const above = world.index.inside(block.x, block.y + 1, block.z) ? world.blockGrid[world.index.id(block.x, block.y + 1, block.z)] : null;
      return !above || above.built;
    }
    if (block.feature) return Features.supports(block, world);
    if (block.y === 0) return true;
    const index = world.index;
    const below = world.blockGrid[index.id(block.x, block.y - 1, block.z)];
    if (below && below.built && Features.canSupportSolid(below)) return true;
    for (let i = 0; i < DIRS.length; i++) {
      const x = block.x + DIRS[i][0];
      const z = block.z + DIRS[i][1];
      if (!index.inside(x, block.y, z)) continue;
      const neighbor = world.blockGrid[index.id(x, block.y, z)];
      if (neighbor && neighbor.built && Features.canSupportSolid(neighbor)) return true;
    }
    return false;
  }

  // Unbuilt cubes that can never get support: support spreads from built cubes through the unbuilt
  // ones by the real rules (isSupported for plain cubes, Features.supports for beams, slopes,
  // bridges…), treating every cube it reaches as built; whatever it never reaches floats.
  function unbuildableBlocks(world) {
    const index = world.index;
    const pending = world.blocks.filter(function (block) { return !block.built; });
    const reached = new Set();
    const virtual = Object.create(world);
    virtual.built = new Set(world.built);
    virtual.solidGrid = world.solidGrid.slice();
    function solidAt(x, y, z) {
      if (!index.inside(x, y, z)) return false;
      const block = world.blockGrid[index.id(x, y, z)];
      return !!block && virtual.built.has(cellKey(x, y, z)) && Features.canSupportSolid(block);
    }
    let grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < pending.length; i++) {
        const block = pending[i];
        if (reached.has(block)) continue;
        let ok;
        if (block.glassOf !== undefined) {
          ok = virtual.built.has(cellKey(block.x, block.y, block.z)) &&
            (!world.blockByKey.has(cellKey(block.x, block.y + 1, block.z)) || virtual.built.has(cellKey(block.x, block.y + 1, block.z)));
        } else if (block.feature) {
          ok = Features.supports(block, virtual);
        } else {
          ok = block.y === 0 || solidAt(block.x, block.y - 1, block.z);
          for (let d = 0; d < DIRS.length && !ok; d++) ok = solidAt(block.x + DIRS[d][0], block.y, block.z + DIRS[d][1]);
        }
        if (ok) {
          reached.add(block);
          virtual.built.add(cellKey(block.x, block.y, block.z));
          if (!block.feature) virtual.solidGrid[index.id(block.x, block.y, block.z)] = 1;
          grew = true;
        }
      }
    }
    return pending.filter(function (block) { return !reached.has(block); });
  }

  function refreshReadyAround(world, x, y, z) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          const nz = z + dz;
          if (ny < 0 || !world.index.inside(nx, ny, nz)) continue;
          const block = world.blockGrid[world.index.id(nx, ny, nz)];
          if (block && !block.built) {
            block.ready = isSupported(block, world);
          }
        }
      }
    }
    // Glass of this cell and of the window below (this cube may be its lintel).
    for (let dy = -1; dy <= 0; dy++) {
      const glass = world.glassByKey.get(cellKey(x, y + dy, z));
      if (glass && !glass.built) glass.ready = isSupported(glass, world);
    }
  }

  function refreshReadyBatch(world, blocks) {
    const affected = new Set();
    for (let i = 0; i < blocks.length; i++) {
      const source = blocks[i];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            const x = source.x + dx;
            const y = source.y + dy;
            const z = source.z + dz;
            if (y < 0 || !world.index.inside(x, y, z)) continue;
            const block = world.blockGrid[world.index.id(x, y, z)];
            if (block && !block.built) affected.add(block);
          }
        }
      }
      for (let dy = -1; dy <= 0; dy++) {
        const glass = world.glassByKey.get(cellKey(source.x, source.y + dy, source.z));
        if (glass && !glass.built) affected.add(glass);
      }
    }
    for (const block of affected) block.ready = isSupported(block, world);
  }

  function sessionGain(kind, level) {
    return sessionValue(kind, level) - sessionValue(kind, 0);
  }

  // `builder` (optional): his dish from the canteen counts («Каша» — +10% to the carry). Rain wets
  // the material: the carry shrinks (campaign.environmentCarryMultiplier).
  function carryKg(campaign, builder) {
    // «Горячий шоколад» (rain): the material does not get wet for him.
    const wet = seasonOn(builder, campaign, 'rain') ? 1 : campaign.environmentCarryMultiplier || 1;
    return (sessionValue('carry', campaign.purchases.carry) * campaign.metaCarryScale + campaign.metaCarry) * dishBoost(builder, 'carry') *
      wet * advancedValue(campaign, 'advCarry', 1);
  }

  // ---------- canteen dishes (docs/gdd/20-site-camp.md) ----------
  // A worker who ate at the canteen keeps the dish of that meal until his next one.
  const CANTEEN = window.MicroBuildersBalance.canteen || {
    mealSeconds: 50, seats: 2, minMealSeconds: 10, maxCarry: 8, voxel: 1, forms: [], dishes: [],
  };
  const DISH = {};
  CANTEEN.dishes.forEach(function (dish) { DISH[dish.id] = dish; });

  // The menu grows a row a canteen level (balance canteen.rows, docs/gdd/23-canteen-draft.md): the dish
  // of the day (1), a pastry to take away (2, Кафе), the seasonal dishes (3, Бистро), the second dish (4,
  // Ресторан), the chef's signature (5, Гранд-ресторан). A dish is served only from its building level.
  const ROWS = CANTEEN.rows || { day: 1, snack: 2, kitchen: 3, dish2: 4, secrets: 4, signature: 5, grand: 5 };
  // The kitchen (canteen level 3+): workers given to it for the site, the chef's experience and level,
  // the secret dishes the chef finds, the grand dinners (docs/gdd/20-site-camp.md → «Кухня»). The chef's
  // levels, the secret chances and the grand dinner's cubes come from their timings (kitchen-calibration.js).
  const KITCHEN = CANTEEN.kitchen || { staff: [2, 3, 4, 5, 6], chefLevels: [10, 25, 50, 100, 200, 400, 800], dishPerLevel: [0.04, 0.05, 0.06, 0.07, 0.08],
    discovery: [1, 1.25, 1.5, 2, 2.5], multiplierPerMass: 0.000001, grandCubes: 200, grandKitchen: 5, signatureKitchen: 5, keepCrew: 2 };
  const ENVIRONMENT_KINDS = (TUNING.environment && TUNING.environment.kinds) || {};
  // Who ate at the canteen: the torte's and the feast's moments, and the pastry rush (stepWorld sets them).
  let canteenNow = { elapsed: 0, torte: false, feast: false, grand: {} };

  // The plain percentage of a day dish for each effect (the cutlet counts twice: carry and climb).
  function dayDishBonus(bonus, id, world) {
    const dish = DISH[id];
    if (!dish) return;
    const add = function (effect, value) { bonus[effect] = Math.max(bonus[effect] || 0, value); };
    if (dish.effect === 'carryClimb') {
      add('carry', dish.value);
      add('climb', dish.value);
    } else if (dish.effect === 'pelmeni') {
      // «Пельмени «Артельные»»: the common pot — more for every one eating at the canteen now.
      add('place', Math.min(dish.max || 0.3, dish.value * Math.max(1, canteenEating(world))));
    } else if (dish.effect === 'multi') {
      Object.keys(dish.effects || {}).forEach(function (effect) { add(effect, dish.effects[effect]); });
    } else if (dish.effect !== 'torte' && dish.effect !== 'deck' && !dish.weather) add(dish.effect, dish.value);
  }

  // «Шеф-повар» makes the dishes stronger: their power at the meal stays with the worker (dishPower).
  // The torte and the feast lift everything for a while; a «Пончик» lifts walking and climbing.
  function dishBoost(builder, effect) {
    if (!builder) return 1;
    let value = 0;
    if (builder.dishBonus) value = builder.dishBonus[effect] || 0;
    else if (builder.dish && DISH[builder.dish] && DISH[builder.dish].effect === effect) value = DISH[builder.dish].value;
    let boost = 1 + value * (builder.dishPower || 1);
    const work = effect === 'place' || effect === 'walk' || effect === 'climb' || effect === 'pickup' || effect === 'carry';
    if (work && canteenNow.torte && builder.ateTorte) boost *= 1 + (DISH.napoleon ? DISH.napoleon.value : 0.25);
    if (work && canteenNow.feast) boost *= 1 + (DISH.pir ? DISH.pir.value : 0.1);
    // Grand dinners: their stacks lift the whole crew till the hand-over.
    if (canteenNow.grand[effect]) boost *= 1 + canteenNow.grand[effect];
    if ((effect === 'walk' || effect === 'climb') && builder.rushUntil > canteenNow.elapsed) boost *= 1 + (DISH.ponchik ? DISH.ponchik.value : 0.4);
    return boost;
  }

  // Does he carry this dish from his last canteen meal (the day dish or the second one)?
  function ateDish(builder, test) {
    return !!builder && ((!!builder.dish && !!DISH[builder.dish] && test(DISH[builder.dish])) ||
      (!!builder.dish2 && !!DISH[builder.dish2] && test(DISH[builder.dish2])));
  }

  // A seasonal dish (a secret of the chef, served as a day dish) works while its weather (or the night) is on.
  function seasonOn(builder, campaign, weather) {
    if (!ateDish(builder, function (dish) { return dish.weather === weather; })) return false;
    return weather === 'night' ? !!campaign.environmentNight : campaign.environmentKind === weather;
  }

  // Half a penalty back: a factor m < 1 becomes (1 + m) / 2 — returned as the multiplier on top of m.
  function halfRelief(m) {
    return m > 0 && m < 1 ? (1 + m) / 2 / m : 1;
  }

  // `power` — «Шеф-повар» on this site (1 — none).
  function dishText(id, power) {
    const dish = DISH[id];
    if (!dish) return '';
    if (dish.text) return dish.text;
    const pct = Math.round(dish.value * (power || 1) * 100) + '%';
    if (dish.effect === 'carry') return '+' + pct + ' к ноше';
    if (dish.effect === 'place') return '+' + pct + ' к скорости укладки';
    if (dish.effect === 'walk') return '+' + pct + ' к скорости ходьбы';
    if (dish.effect === 'climb') return '+' + pct + ' к скорости подъёма';
    if (dish.effect === 'pickup') return '+' + pct + ' к набору в карьере';
    if (dish.effect === 'satiety') return 'Сытость дольше на ' + pct;
    if (dish.effect === 'smoke') return 'Перекуры реже на ' + pct;
    return '';
  }

  // Seconds of placing one mini-cube of `block` by this worker (hunger, rank, foremen, dish).
  function builderPlaceSeconds(builder, world, block) {
    return workSeconds(builder, placeSeconds(world.campaign, world.level.pace, block)) / dishBoost(builder, 'place') / seasonWork(builder, world.campaign);
  }

  // Seasonal dishes on the work: «Окрошка» halves the heat's, «Кофе ночной смены» the night's slowdown.
  function seasonWork(builder, campaign) {
    let factor = 1;
    if (seasonOn(builder, campaign, 'heat')) factor *= halfRelief(ENVIRONMENT_KINDS.heat ? ENVIRONMENT_KINDS.heat.work : 1);
    if (seasonOn(builder, campaign, 'night')) factor *= halfRelief(campaign.environmentNightWork || 1);
    return factor;
  }

  function planCubeLimit(campaign) {
    return sessionValue('plan', campaign.purchases.plan) + campaign.metaPlan;
  }

  function vehiclePlanLimit(campaign) {
    return VEHICLE.basePlan + campaign.purchases.plan * VEHICLE.planStep;
  }

  function vehicleHeight(campaign) {
    return sessionValue('vehicleHeight', campaign.purchases.vehicleHeight);
  }

  function vehicleReach(campaign) {
    return sessionValue('vehicleReach', campaign.purchases.vehicleReach);
  }

  function scaffoldSeconds(campaign, pace) {
    return SCAFFOLD.erectSeconds * pace /
      sessionValue('scaffold', campaign.purchases.scaffold) /
      campaign.metaScaffold;
  }

  // Setting a piece: the time of its type; a broken one is repaired in repairShare of it.
  function erectSeconds(piece, world) {
    return scaffoldSeconds(world.campaign, world.level.pace) * tierTimeFactor(piece.y) *
      (piece.broken ? WEAR.repairShare : 1);
  }

  // A* price of setting a piece at cell `id` on level y from the base price of the first type: its
  // type, and repairShare where a broken piece of this kind (`brokenBit`) waits for repair.
  function erectPrice(world, base, id, y, brokenBit) {
    return base * tierTimeFactor(y) * ((world.scaffoldBroken[id] & brokenBit) !== 0 ? WEAR.repairShare : 1);
  }

  function buildSpeed(campaign, pace) {
    return sessionValue('speed', campaign.purchases.speed) * advancedValue(campaign, 'advPlace', 1) *
      campaign.metaPlaceSpeed * campaign.environmentWorkMultiplier * campaign.foremanRush / pace;
  }

  function floorFactor(y, campaign) {
    const floor = y + 1;
    return 1 + (floor - 1) * BALANCE.heightStep * campaign.metaHeightPenalty;
  }

  function placeSeconds(campaign, pace, block) {
    // «Оконщица»: doors and windows go in at once.
    if (block.feature && campaign.foremen.glazier) return 0;
    // «Тяжеловес»: grid 2+ materials go in faster.
    const heavy = campaign.foremen.heavyMat && MATERIAL[block.materialId].grid >= 2 ? campaign.foremen.heavyMat.value : 1;
    const mass = MATERIAL[block.materialId].cell / heavy;
    return mass / buildSpeed(campaign, pace) * floorFactor(block.y, campaign);
  }

  // Price the WHOLE cube first, then pay the share represented by `units` mini-cubes.
  // Coin luck is independent of capital. Finds are rolled only by meta.js on whole-cube completion.
  function grantPlacePay(world, block, units, builder) {
    const campaign = world.campaign;
    const material = MATERIAL[block.materialId];
    const fullReward = Math.pow(material.weight, BALANCE.coinMassExponent) * BALANCE.coinRewardScale;
    let coins = fullReward * units / Math.pow(material.grid, 3) * campaign.metaCoinMultiplier;
    // «Бутерброд с икрой»: a worker who ate it earns more for his cubes.
    if (builder && builder.signature === 'ikra' && DISH.ikra) coins *= 1 + DISH.ikra.value;
    const foremen = campaign.foremen;
    if (block.feature && foremen.glazier) coins *= foremen.glazier.value;
    // «Витражи» of the office: windows and doors pay more.
    if (block.feature && campaign.office) coins *= campaign.office.glass;
    if (campaign.badWeather && foremen.meteo) coins *= 2;
    if (foremen.earlyCoins && campaign.levelElapsed < 300) coins *= foremen.earlyCoins.value;
    coins *= sessionValue('cubePay', campaign.purchases.cubePay);
    // «Золотые руки» (advanced): every 10th cube of the blueprint pays ×10.
    if (advancedOwned(campaign, 'advGold') && block.id % 10 === 9) coins *= ADVANCED_NODE.advGold.value;
    // «Золотая лихорадка» (a spell): every cube pays more for a while.
    if ((campaign.spellGoldUntil || 0) > campaign.levelElapsed) coins *= campaign.spellGold || 3;
    coins *= sessionValue('payMultiplier', campaign.purchases.payMultiplier);
    const floor = block.y + 1;
    coins *= 1 + (floor - 1) * sessionValue('floorPay', campaign.purchases.floorPay);
    const lucky = Math.random() < sessionValue('triplePay', campaign.purchases.triplePay);
    const luckyMultiplier = lucky ? sessionValue('triplePower', campaign.purchases.triplePower) : 1;
    if (lucky) coins *= luckyMultiplier;
    // Carry the fractional remainder so subdivision cannot change the total integer payout.
    const accumulated = coins + (campaign.coinRewardRemainder || 0);
    const rounded = Math.round(accumulated);
    campaign.coinRewardRemainder = accumulated - rounded;
    campaign.coins += rounded;
    campaign.coinsEarned = (campaign.coinsEarned || 0) + rounded;
    return {
      coins: rounded,
      capital: 0,
      lucky: lucky,
      luckyMultiplier: luckyMultiplier,
      capitalCoin: false,
    };
  }

  // A fresh smoke scale: smokePointsMin…Max points (a new roll after every smoke).
  function rollSmoke() {
    return rollSpan(BALANCE.smokePointsMin, BALANCE.smokePointsMax);
  }

  function smokeDuration(campaign) {
    return BALANCE.smokeSeconds / sessionValue('smokeShort', campaign.purchases.smokeShort) / campaign.metaSmokeShort;
  }

  // ---------- smoking habit and smoking together (docs/gdd/08-needs-weather-events.md) ----------
  // Every smoke on this site adds to the worker's habit (up to SMOKING.habitCap; «Реже перекуры»
  // slows the growth); the habit fills the smoke scale faster and makes smokes longer. A worker going
  // to smoke calls out: everyone within SMOKING.callRadius cells (a sphere) whose smoke desire is
  // past SMOKING.callDesire of his threshold goes too, as soon as his hands allow, and calls out in
  // turn — a chain. They gather at the first caller's spot and chat: every companion there makes
  // the smoke SMOKING.chat longer.
  const SMOKING = window.MicroBuildersBalance.smoking || {
    habitGrowth: 1, habitCap: 15, habitInterval: 0.12, habitDuration: 0.08,
    callRadius: 8, callDesire: 0.5, callSeconds: 20, chat: 0.1, chatMax: 5,
  };

  function habitGrowth(campaign) {
    // «Бросили курить» (advanced): the habit no longer grows.
    if (advancedOwned(campaign, 'advSmoke')) return 0;
    return SMOKING.habitGrowth / sessionValue('smokeRare', campaign.purchases.smokeRare) / lineValue(campaign, 'smokeHabit');
  }

  // ---------- fatigue and sleep (docs/gdd/08-needs-weather-events.md) ----------
  // Fatigue (a scale of SLEEP.fatiguePointsMin…Max rolled after every sleep, see fatigueRate: ×3
  // at night; a hire starts at 0) grows while a worker is awake and past SLEEP.debuffFrom of it slows his work (up to
  // SLEEP.debuffMax). When the scale is full he goes to sleep, by night or by day (at a desk visit
  // with free hands), in the trailers SLEEP.minSquares…maxSquares cells off the site, for
  // SLEEP.sleepMin…Max seconds; fatigue drains while he sleeps. The rolled scales and the fast night
  // spread the crew's sleep into a wave.
  const SLEEP = TUNING.sleep || {
    fatiguePointsMin: 1800, fatiguePointsMax: 3000, nightFatigue: 3, debuffFrom: 0.5, debuffMax: 0.4,
    sleepMin: 400, sleepMax: 600, minSquares: 30, maxSquares: 40, startFatigueMin: 0, startFatigueMax: 0, sleepHunger: 0.5,
  };

  function rollFatigue() {
    return rollSpan(SLEEP.fatiguePointsMin, SLEEP.fatiguePointsMax);
  }

  // The site clock now (sim.js → dayClock: night 20:00–6:00, a site starts at 8:00). Tools that run
  // the engine without the simulator get no night.
  function siteClock(world) {
    return root.MicroBuildersSim ? root.MicroBuildersSim.dayClock(world.campaign.levelElapsed) : null;
  }

  function nightNow(world) {
    if (!needOpen(world.campaign, 'night')) return false;
    const clock = siteClock(world);
    return !!clock && clock.night;
  }

  // Needs and the night open by the story level (balance.json → tuning.intro): no smoking before
  // smokeFromLevel, no hunger before hungerFromLevel, no night and no sleep before nightFromLevel.
  // The level — campaign.storyLevel (Meta.configureNewCampaign); an older save of a story order
  // falls back to its own level, anything else has everything open. The same as sim.js → introGates.
  const INTRO = TUNING.intro || {};
  function introLevel(campaign) {
    if (campaign.storyLevel > 0) return campaign.storyLevel;
    return campaign.runMode === 'campaign' && campaign.levelIndex >= 0 ? campaign.levelIndex + 1 : Infinity;
  }

  // need: 'smoke' | 'hunger' | 'night' (night and sleep).
  function needOpen(campaign, need) {
    const from = INTRO[need + 'FromLevel'];
    return !(from > introLevel(campaign));
  }

  function fatigueFill(builder) {
    return Math.min(1, (builder.fatigue || 0) / builder.fatigueScale);
  }

  function fatigueDebuff(builder) {
    const fatigue = fatigueFill(builder);
    if (fatigue <= SLEEP.debuffFrom) return 0;
    return SLEEP.debuffMax * Math.min(1, (fatigue - SLEEP.debuffFrom) / (1 - SLEEP.debuffFrom));
  }

  // His fatigue scale is full. Tools that run the engine without the simulator (no site clock) get
  // no sleep, as no night.
  function sleepDue(builder, world) {
    if (builder.trade !== 'builder' || !siteClock(world)) return false;
    return builder.fatigue >= builder.fatigueScale;
  }

  function sleepSeconds() {
    return rollSpan(SLEEP.sleepMin, SLEEP.sleepMax);
  }

  function carryWeight(campaign, materialId) {
    const heavy = campaign.foremen.heavyMat && MATERIAL[materialId].grid >= 2 ? campaign.foremen.heavyMat.value : 1;
    return MATERIAL[materialId].cell / sessionValue('lightCarry', campaign.purchases.lightCarry) / heavy;
  }

  // ---------- needs: hunger, smoke, fatigue (docs/gdd/08-needs-weather-events.md) ----------
  // Every need is a scale of points that fills at a rate in points a second: 1 at base, times what
  // speeds it up (the smoking habit, night for fatigue, the weather: campaign.environment*Rate) and
  // over what slows it (upgrades, the dish). Every scale is rolled anew after its need is served:
  // hunger hungerPointsMin…Max (builder.hungerScale; slows work from hungerDebuffFrom of it, at
  // the top a meal in town), smoke smokePointsMin…Max (builder.smokeThreshold), fatigue
  // SLEEP.fatiguePointsMin…Max (builder.fatigueScale; at the top sleep). A rate changing mid-way
  // (snow begins) only changes how fast the rest fills, and the worker card shows the time left at
  // the rate now (needSecondsLeft).
  function rollHunger() {
    return rollSpan(BALANCE.hungerPointsMin, BALANCE.hungerPointsMax);
  }

  function hungerRate(builder, world) {
    const campaign = world.campaign;
    // «Сытные порции»: after a canteen meal (he has its dish) the satiety lasts longer.
    // «Горячий сбитень»: the cold does not hurry his hunger.
    return (seasonOn(builder, campaign, 'snow') ? 1 : campaign.environmentHungerRate || 1) / advancedValue(campaign, 'advStamina', 1) /
      ((campaign.metaHunger || 1) * dishBoost(builder, 'satiety') * (builder.dish ? campBoost(campaign, 'portions') : 1));
  }

  function smokeRate(builder, world) {
    const campaign = world.campaign;
    // «Горячий шоколад»: the rain does not make him smoke more often.
    return (1 + SMOKING.habitInterval * (builder.habit || 0)) * (seasonOn(builder, campaign, 'rain') ? 1 : campaign.environmentSmokeRate || 1) /
      (sessionValue('smokeRare', campaign.purchases.smokeRare) * (campaign.metaSmoke || 1) * dishBoost(builder, 'smoke') *
        advancedValue(campaign, 'advSmoke', 1));
  }

  function fatigueRate(builder, world) {
    // «Окрошка на квасе»: the heat does not tire him faster.
    return (nightNow(world) ? SLEEP.nightFatigue : 1) * (seasonOn(builder, world.campaign, 'heat') ? 1 : world.campaign.environmentFatigueRate || 1) /
      advancedValue(world.campaign, 'advStamina', 1) /
      lineValue(world.campaign, 'coffee') /
      (world.campaign.office ? world.campaign.office.fatigue : 1);
  }

  function needState(builder, world, need) {
    if (need === 'hunger') return { points: builder.hunger, max: builder.hungerScale, rate: hungerRate(builder, world) };
    if (need === 'smoke') return { points: builder.smokeNeed, max: builder.smokeThreshold, rate: smokeRate(builder, world) };
    return { points: builder.fatigue || 0, max: builder.fatigueScale, rate: fatigueRate(builder, world) };
  }

  // Seconds until the need fills to `fill` of its scale (1 — the top) at its rate now; 0 if it is there.
  // Fatigue walks the site clock ahead instead (×SLEEP.nightFatigue at night, the weather as it is
  // now), so the time to sleep does not jump at nightfall and dawn.
  function needSecondsLeft(builder, world, need, fill) {
    const state = needState(builder, world, need);
    const target = state.max * (fill === undefined ? 1 : fill);
    const sim = root.MicroBuildersSim;
    if (need !== 'fatigue' || !siteClock(world)) return Math.max(0, (target - state.points) / state.rate);
    const weather = world.campaign.environmentFatigueRate || 1;
    const now = world.campaign.levelElapsed;
    const horizon = 3 * sim.cycleSeconds();
    const step = 5;
    let points = state.points;
    let t = 0;
    while (points < target && t < horizon) {
      const rate = (sim.dayClock(now + t).night ? SLEEP.nightFatigue : 1) * weather;
      if (points + rate * step >= target) return t + (target - points) / rate;
      points += rate * step;
      t += step;
    }
    return t;
  }

  function hungerFill(builder) {
    return Math.min(1, builder.hunger / builder.hungerScale);
  }

  // Hunger slows work from hungerDebuffFrom of the scale: hungerDebuffMin there, hungerDebuffMax at the top.
  // A worker holding on in the lunch queue (lunchQueueFull) works with the slowdown of its start.
  function hungerDebuff(builder) {
    if (builder.mealQueued) return BALANCE.hungerDebuffMin;
    const fill = hungerFill(builder);
    const from = BALANCE.hungerDebuffFrom;
    if (fill < from) return 0;
    return BALANCE.hungerDebuffMin + (BALANCE.hungerDebuffMax - BALANCE.hungerDebuffMin) * (fill - from) / (1 - from);
  }

  // The «Ускорение» factor of the world being stepped (1 — no spell).
  let spellHasteNow = 1;

  function workSeconds(builder, seconds) {
    seconds /= builder.timeEfficiency || 1;
    // «Ускорение» (a spell): the whole crew works faster for a while (set per step in stepWorld).
    seconds /= spellHasteNow;
    // A tired worker is slower (fatigue past SLEEP.debuffFrom).
    seconds /= 1 - fatigueDebuff(builder);
    // «Повар артели»: a good meal makes the worker faster for a while.
    if (builder.fedLeft > 0) seconds /= builder.fedBoost;
    return seconds / (1 - hungerDebuff(builder));
  }

  // A cube of a material with grid N is built from N³ mini-cubes; workers carry and set them one
  // by one (each one is an atomic placement). Machines and drones move whole cubes.
  function pourGrid(block) {
    return MATERIAL[block.materialId].grid;
  }

  function pourTotal(block) {
    const n = pourGrid(block);
    return n * n * n;
  }

  function pourCoord(index, n) {
    const layer = n * n;
    const y = (index / layer) | 0;
    const rest = index - y * layer;
    const z = (rest / n) | 0;
    const x = rest - z * n;
    return { x: x, y: y, z: z };
  }

  // Session upgrade value as it works on site, with company (meta) bonuses applied. Walking and
  // climbing show the characteristic, before the soft cap (softCap): the capped speed is hidden for now.
  function upgradeValue(campaign, kind, level) {
    const value = sessionValue(kind, level);
    if (kind === 'speed') return value * campaign.metaPlaceSpeed;
    if (kind === 'pickup') return value * campaign.metaPickupSpeed;
    if (kind === 'carry') return value * campaign.metaCarryScale + campaign.metaCarry;
    if (kind === 'plan') return value + campaign.metaPlan;
    if (kind === 'horizontal' || kind === 'vertical') return value * campaign.metaMovement;
    if (kind === 'scaffold') return value * campaign.metaScaffold;
    return value;
  }

  // Prices come from the balance (calibrated by pricing.js); the old curves are only a fallback.
  // `campaign` — the site's: «Оптовые закупки» of the office make every site upgrade a share cheaper.
  function upgradeCost(kind, purchases, campaign) {
    const prices = SESSION_BALANCE[kind] && SESSION_BALANCE[kind].prices;
    const spec = UPGRADES[kind];
    const base = prices && prices.length > 0 ? prices[Math.min(purchases, prices.length - 1)] : Math.round(spec.base * Math.pow(spec.growth, purchases));
    const discount = campaign && campaign.office ? Math.min(0.9, campaign.office.discount || 0) : 0;
    return discount > 0 ? Math.max(1, Math.round(base * (1 - discount))) : base;
  }

function statsOf(campaign, pace) {
  const move = campaign.metaMovement * campaign.environmentMoveMultiplier;
  const walk = move * (campaign.environmentWalkMultiplier || 1);
  const current = buildSpeed(campaign, pace);
  const next = sessionValue('speed', campaign.purchases.speed + 1) *
    campaign.metaPlaceSpeed * campaign.environmentWorkMultiplier * advancedValue(campaign, 'advPlace', 1) / pace;
  const horizontal = sessionValue('horizontal', campaign.purchases.horizontal) * walk / pace;
  const vertical = sessionValue('vertical', campaign.purchases.vertical) * move / pace;
  return {
    builders: sessionValue('builders', campaign.purchases.builders),
    buildSpeed: current,
    carryKg: carryKg(campaign),
    nextBuilders: sessionValue('builders', campaign.purchases.builders + 1),
    nextBuildSpeed: next,
    nextCarryKg: sessionValue('carry', campaign.purchases.carry + 1) * campaign.metaCarryScale + campaign.metaCarry,
    horizontalSpeed: horizontal,
    nextHorizontalSpeed: sessionValue('horizontal', campaign.purchases.horizontal + 1) * walk / pace,
    verticalSpeed: vertical,
    nextVerticalSpeed: sessionValue('vertical', campaign.purchases.vertical + 1) * move / pace,
    planCubes: planCubeLimit(campaign),
    nextPlanCubes: sessionValue('plan', campaign.purchases.plan + 1) + campaign.metaPlan,
    vehicles: sessionValue('vehicles', campaign.purchases.vehicles),
    nextVehicles: sessionValue('vehicles', campaign.purchases.vehicles + 1),
    vehicleHeight: vehicleHeight(campaign),
    nextVehicleHeight: sessionValue('vehicleHeight', campaign.purchases.vehicleHeight + 1),
    vehicleReach: vehicleReach(campaign),
    nextVehicleReach: sessionValue('vehicleReach', campaign.purchases.vehicleReach + 1),
    scaffoldSeconds: scaffoldSeconds(campaign, pace),
    nextScaffoldSeconds: SCAFFOLD.erectSeconds * pace /
      sessionValue('scaffold', campaign.purchases.scaffold + 1) /
      campaign.metaScaffold,
    kitchen: campaign.purchases.kitchen,
    nextKitchen: campaign.purchases.kitchen + 1,
  };
}

  // A building's cubes as the planning rules see them (sealsOther): the main site's blocks; a camp
  // building has its own view of its cubes (campCubesView), the rules are the same.
  const MAIN_CUBES = {
    at: function (world, x, y, z) {
      return world.index.inside(x, y, z) ? world.blockGrid[world.index.id(x, y, z)] || null : null;
    },
    built: function (block) { return block.built; },
    ready: function (block) { return block.ready; },
    reserved: function (block) { return block.reserved; },
  };

  function sealsOther(candidate, world, planned, cubes) {
    // Glass goes into a cell that is already solid: it closes nothing.
    if (candidate.glassOf !== undefined) return false;
    cubes = cubes || MAIN_CUBES;
    const index = world.index;
    const nearby = world.nearbyBlocks;
    nearby.length = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const block = cubes.at(world, candidate.x + dx, candidate.y + dy, candidate.z + dz);
          if (block && block !== candidate && !cubes.built(block)) {
            nearby.push(block);
          }
        }
      }
    }
    if (!SCAFFOLD.enabled) {
      for (let i = 0; i < nearby.length; i++) {
        const block = nearby[i];
        let open = false;
        for (let dy = -1; dy <= 1 && !open; dy++) {
          for (let dz = -1; dz <= 1 && !open; dz++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0 && dz === 0) continue;
              const x = block.x + dx;
              const y = block.y + dy;
              const z = block.z + dz;
              if (x === candidate.x && y === candidate.y && z === candidate.z) continue;
              if (y < 0 || !index.inside(x, y, z)) continue;
              const id = index.id(x, y, z);
              const future = cubes.at(world, x, y, z);
              if (world.solidGrid[id] === 1) continue;
              if (planned.has(id) || (future && cubes.reserved(future) && !cubes.built(future))) continue;
              open = true;
              break;
            }
          }
        }
        if (!open) return true;
      }
      return false;
    }
    if (!canStand(candidate.x, candidate.y, candidate.z, world)) return false;
    for (let i = 0; i < nearby.length; i++) {
      const block = nearby[i];
      if (!cubes.ready(block)) continue;
      let open = false;
      for (let dy = -1; dy <= 1 && !open; dy++) {
        for (let dz = -1; dz <= 1 && !open; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0 && dz === 0) continue;
            const x = block.x + dx;
            const y = block.y + dy;
            const z = block.z + dz;
            if (x === candidate.x && y === candidate.y && z === candidate.z) continue;
            if (y < 0 || !index.inside(x, y, z)) continue;
            const id = index.id(x, y, z);
            const future = cubes.at(world, x, y, z);
            if (planned.has(id) || (future && cubes.reserved(future) && !cubes.built(future))) continue;
            if (world.solidGrid[id] === 1) continue;
            const belowId = index.id(x, y - 1, z);
            const belowFuture = cubes.at(world, x, y - 1, z);
            if (y === 0 ||
                world.mastGrid[id] === 1 ||
                world.deckGrid[id] === 1 ||
                world.solidGrid[index.id(x, y - 1, z)] === 1 ||
                world.bridgeGrid[index.id(x, y - 1, z)] === 1 ||
                world.doorGrid[index.id(x, y - 1, z)] === 1 ||
                (x === candidate.x && y - 1 === candidate.y && z === candidate.z) ||
                planned.has(belowId) ||
                (belowFuture && cubes.reserved(belowFuture) && !cubes.built(belowFuture)) ||
                world.mastGrid[index.id(x, y - 1, z)] === 1) {
              open = true;
              break;
            }
          }
        }
      }
      if (!open) return true;
    }
    return false;
  }

  function refreshPlan(builder) {
    const next = [];
    for (let i = 0; i < builder.plan.length; i++) {
      if (!builder.plan[i].built) next.push(builder.plan[i]);
    }
    builder.plan = next;
  }

  // The plan has mini-cubes left to pick up. A started cube whose share of this plan is used up
  // stays in builder.plan (it is his) but waits for the next plan at the desk.
  function planHasWork(builder) {
    refreshPlan(builder);
    for (let i = 0; i < builder.plan.length; i++) {
      if (builder.plan[i].planLeft > 0) return true;
    }
    return false;
  }

  // View: mini-cubes of the current plan not set yet — still to pick up plus in his hands.
  function planMinis(builder) {
    let count = 0;
    for (let i = 0; i < builder.plan.length; i++) {
      if (!builder.plan[i].built) count += builder.plan[i].planLeft;
    }
    for (let i = 0; i < builder.carry.length; i++) {
      if (!builder.carry[i].built) count += 1;
    }
    return count;
  }

  function releasePlanBlock(block) {
    block.reserved = false;
    block.owner = -1;
    block.planLeft = 0;
  }

  function canCompleteAfter(block, world, completed) {
    const index = world.index;

    function completedSolid(x, y, z) {
      if (!completed.has(cellKey(x, y, z))) return false;
      const completedBlock = world.blockByKey.get(cellKey(x, y, z));
      return completedBlock && Features.canSupportSolid(completedBlock);
    }

    function solidThere(x, y, z) {
      if (!index.inside(x, y, z)) return false;
      if (completedSolid(x, y, z)) return true;
      const id = index.id(x, y, z);
      return world.solidGrid[id] === 1 || world.doorGrid[id] === 1;
    }

    if (block.glassOf !== undefined) return block.ready;
    if (block.ready || block.y === 0) return true;
    if (!block.feature) {
      if (completedSolid(block.x, block.y - 1, block.z)) return true;
      for (let i = 0; i < DIRS.length; i++) {
        if (completedSolid(block.x + DIRS[i][0], block.y, block.z + DIRS[i][1])) return true;
      }
      return false;
    }
    if (block.feature === 'door') {
      return solidThere(block.x + block.faceX, block.y - 1, block.z + block.faceZ) &&
        solidThere(block.x - block.faceX, block.y - 1, block.z - block.faceZ);
    }
    if (block.feature === 'balcony' || block.feature === 'greenery') {
      return completed.has(cellKey(block.x - block.faceX, block.y, block.z - block.faceZ)) ||
        world.built.has(cellKey(block.x - block.faceX, block.y, block.z - block.faceZ));
    }
    if (completed.has(cellKey(block.x, block.y - 1, block.z)) ||
        world.built.has(cellKey(block.x, block.y - 1, block.z))) return true;
    for (let i = 0; i < DIRS.length; i++) {
      const x = block.x + DIRS[i][0];
      const z = block.z + DIRS[i][1];
      if (completed.has(cellKey(x, block.y, z)) || world.built.has(cellKey(x, block.y, z))) return true;
    }
    return false;
  }

  // Carry limit of the next trip («Кладовщик»: every N-th trip of the crew carries double).
  function tripCapacity(world, builder) {
    const storekeeper = world.campaign.foremen.storekeeper;
    const doubled = !!storekeeper && (world.foremanTrips + 1) % Math.round(storekeeper.value) === 0;
    return { kg: carryKg(world.campaign, builder) * (doubled ? 2 : 1), doubled: doubled };
  }

  function cubeCarryWeight(world, block) {
    return (pourTotal(block) - block.poured) * carryWeight(world.campaign, block.materialId);
  }

  // A plan is one desk visit: up to «План работ» mini-cubes and no heavier than the carry. The
  // plan counts mini-cubes, so a big cube can take several plans: it stays his from the first
  // mini-cube on and heads each next plan until it is done. The plan takes whole cubes while the
  // count allows; only the last one may be cut by the count (a cut cube is no support yet, so it
  // is always last). A share heavier than the carry is a plan of its own and goes in parts.
  // builder.planReason (view): 'count' — the plan limit, 'weight' — the next cube would not fit,
  // 'front' — no more free cubes nearby, 'heavy' — the plan is heavier than the carry.
  function reservePlan(builder, world) {
    const limit = Math.max(1, Math.floor(planCubeLimit(world.campaign)));
    const capacity = tripCapacity(world, builder).kg;
    let load = 0;
    let count = 0;
    let weightBlocked = false;
    const chosen = [];
    const planned = new Set();
    const completed = new Set();
    const candidates = world.orderedBlocks;

    function take(block, share) {
      const rest = pourTotal(block) - block.poured;
      block.planLeft = share;
      count += share;
      load += share * carryWeight(world.campaign, block.materialId);
      chosen.push(block);
      planned.add(world.index.id(block.x, block.y, block.z));
      if (share >= rest) completed.add(cellKey(block.x, block.y, block.z));
    }

    // His started cubes go first: whoever started a cube finishes it.
    for (let i = 0; i < builder.plan.length; i++) {
      const block = builder.plan[i];
      if (block.built) continue;
      const share = Math.min(pourTotal(block) - block.poured, limit - count);
      if (share > 0) {
        take(block, share);
      } else if (block.poured > 0) {
        block.planLeft = 0;
        chosen.push(block);
      } else {
        releasePlanBlock(block);
      }
    }
    let anchor = null;
    for (let i = 0; i < chosen.length; i++) {
      if (chosen[i].planLeft > 0) {
        anchor = chosen[i];
        break;
      }
    }
    if (!anchor && count < limit) {
      for (let i = 0; i < candidates.length; i++) {
        const block = candidates[i];
        if (block.built || block.reserved || block.failedNavSerial === world.navSerial) continue;
        if (block.owner !== -1) continue;
        if (!block.ready) continue;
        if (sealsOther(block, world, planned)) continue;
        anchor = block;
        take(block, Math.min(pourTotal(block) - block.poured, limit - count));
        break;
      }
    }
    const heavy = anchor !== null && load > capacity;
    let added = anchor !== null && !heavy;
    while (added && count < limit) {
      added = false;
      for (let i = 0; i < candidates.length && count < limit; i++) {
        const block = candidates[i];
        if (block.built || block.reserved || block.failedNavSerial === world.navSerial) continue;
        if (block.owner !== -1) continue;
        const id = world.index.id(block.x, block.y, block.z);
        if (planned.has(id)) continue;
        if (Math.max(Math.abs(block.x - anchor.x), Math.abs(block.z - anchor.z)) > BALANCE.loadRadius) continue;
        const share = Math.min(pourTotal(block) - block.poured, limit - count);
        if (load + share * carryWeight(world.campaign, block.materialId) > capacity) {
          weightBlocked = true;
          continue;
        }
        if (!canCompleteAfter(block, world, completed)) continue;
        if (sealsOther(block, world, planned)) continue;
        take(block, share);
        added = true;
      }
    }
    for (let i = 0; i < chosen.length; i++) {
      chosen[i].reserved = true;
      chosen[i].owner = builder.index;
    }
    builder.plan = chosen;
    builder.planReason = heavy ? 'heavy' : count >= limit ? 'count' : weightBlocked ? 'weight' : 'front';
    return count;
  }

  // Trips a cube still needs after this one: the rest of this plan's share in carries of
  // `perTrip`, then plans of up to `limit` mini-cubes each.
  function cubeTripsAfter(rest, share, perTrip, limit) {
    let trips = Math.ceil(Math.min(share, rest) / perTrip);
    rest -= Math.min(share, rest);
    while (rest > 0) {
      const next = Math.min(limit, rest);
      trips += Math.ceil(next / perTrip);
      rest -= next;
    }
    return trips;
  }

  // Fills the carry from the plan. Also notes for the view why the load stopped growing
  // (builder.haulLimit: 'carry' — the weight limit (the plan was sized by weight, or a cube heavier
  // than the carry goes in parts), 'heavy' — one oversized mini-cube, 'plan' — the plan limit,
  // 'front' — no more free cubes nearby, 'order' — the rest of the plan waits for support or order)
  // and the capacity it was packed against; startHaul turns that into the trip record.
  // The notes never feed back into the simulation.
  function haulFromPlan(builder, world) {
    refreshPlan(builder);
    const trip = tripCapacity(world, builder);
    const doubled = trip.doubled;
    const capacity = trip.kg;
    let left = capacity;
    let split = null;
    const chosen = [];
    // finished — cubes this trip completes (support for the next ones); done — cubes whose share
    // of the plan this trip takes up.
    const finished = new Set();
    const done = new Set();
    const plan = builder.plan;
    const planLimit = Math.max(1, Math.floor(planCubeLimit(world.campaign)));
    let heavy = null;
    let limit = 'plan';

    let grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < plan.length; i++) {
        const block = plan[i];
        const key = cellKey(block.x, block.y, block.z);
        if (block.built || block.planLeft <= 0 || done.has(key) || block.failedNavSerial === world.navSerial) continue;
        if (!canCompleteAfter(block, world, finished)) continue;
        const weight = carryWeight(world.campaign, block.materialId);
        const rest = pourTotal(block) - block.poured;
        const need = Math.min(block.planLeft, rest);
        const remainingWeight = need * weight;
        if (weight > left) {
          if (weight > capacity) {
            if (!heavy) heavy = block;
            continue;
          }
          limit = 'carry';
          grew = false;
          break;
        }
        if (remainingWeight > left && remainingWeight <= capacity) {
          limit = 'carry';
          grew = false;
          break;
        }
        let taken = 0;
        while (taken < need && weight <= left) {
          chosen.push(block);
          left -= weight;
          taken += 1;
        }
        // A cube that does not go in one trip (heavier than the carry or bigger than the plan)
        // goes in parts: this is trip k of n for it.
        if (taken > 0 && (taken < rest || block.haulTrips > 0)) {
          const perTrip = Math.max(1, Math.floor(capacity / weight));
          const trip = block.haulTrips + 1;
          split = { trip: trip, trips: trip + cubeTripsAfter(rest - taken, need - taken, perTrip, planLimit) };
        }
        if (taken < need) {
          limit = 'carry';
          grew = false;
          break;
        }
        done.add(key);
        if (taken >= rest) finished.add(key);
        grew = true;
      }
    }
    // Nothing fits the carry limit: take one oversized cube and walk slower.
    if (chosen.length === 0 && heavy) {
      chosen.push(heavy);
      limit = 'heavy';
    } else if (limit === 'plan') {
      // The plan was not used up: an oversized cube stays for a trip of its own (the carry is the
      // limit), anything else waits for its support or the build order.
      for (let i = 0; i < plan.length; i++) {
        const block = plan[i];
        if (block.built || block.planLeft <= 0 || done.has(cellKey(block.x, block.y, block.z))) continue;
        if (carryWeight(world.campaign, block.materialId) > capacity) {
          limit = 'carry';
          continue;
        }
        limit = 'order';
        break;
      }
    }
    // The whole plan fits by construction, so say what sized the plan: the cube count («План работ»),
    // the weight («Ноша») or the lack of free cubes nearby.
    if (limit === 'plan') {
      const reason = builder.planReason;
      limit = reason === 'weight' || (reason === 'heavy' && split) ? 'carry' : reason === 'front' ? 'front' : 'plan';
    }
    builder.haulLimit = limit;
    builder.haulCapacity = capacity;
    builder.haulDoubled = doubled;
    builder.haulSplit = split;
    return chosen;
  }

  function carriedWeight(builder, world) {
    let weight = 0;
    for (let i = 0; i < builder.carry.length; i++) {
      if (!builder.carry[i].built) weight += carryWeight(world.campaign, builder.carry[i].materialId);
    }
    return weight;
  }

  // Walking slowdown for a load: weight over the base carry limit (not the doubled storekeeper
  // capacity — that is how the trip timing was calibrated).
  function overloadFactor(weight, world, builder) {
    const overload = Math.max(1, weight / carryKg(world.campaign, builder));
    // «Тяжеловес» softens the slowdown of an overloaded trip.
    const soften = world.campaign.foremen.overload;
    return soften ? 1 + (overload - 1) * soften.value : overload;
  }

  function carryOverload(builder, world) {
    return overloadFactor(carriedWeight(builder, world), world, builder);
  }

  // View: what the worker has in hands now. kg — real mini-cube weights («Снижение веса»,
  // «Тяжеловес» applied); capacity — the limit this trip was packed against (doubled on a
  // storekeeper trip), or the current carry limit between trips; fill = kg / capacity;
  // overload — the walking slowdown, the same number as carryOverload. Pass `out` to reuse an object.
  function carryLoad(builder, world, out) {
    const kg = carriedWeight(builder, world);
    const busy = builder.carry.length > 0 || builder.mineQueue.length > 0;
    const capacity = busy && builder.tripCapacity > 0 ? builder.tripCapacity : carryKg(world.campaign, builder);
    const load = out || {};
    load.kg = kg;
    load.capacity = capacity;
    load.fill = capacity > 0 ? kg / capacity : 0;
    load.overload = overloadFactor(kg, world, builder);
    return load;
  }

  function groupPlan(load, world) {
    const map = new Map();
    for (let i = 0; i < load.length; i++) {
      const block = load[i];
      let group = map.get(block.materialId);
      if (!group) {
        group = {
          materialId: block.materialId,
          blocks: [],
          mine: world.level.minesByMaterial[block.materialId],
        };
        map.set(block.materialId, group);
      }
      group.blocks.push(block);
    }
    return Array.from(map.values());
  }

  function createBuilder(index, cell) {
    return {
      index: index,
      shirt: SHIRTS[index % SHIRTS.length],
      homeCell: cell.slice(),
      cell: cell.slice(),
      from: cell.slice(),
      to: cell.slice(),
      segmentT: 1,
      phase: 'plan',
      wait: 0,
      blockedWalkAttempts: 0,
      path: null,
      pathIndex: 0,
      walkPurpose: '',
      needTrip: '',
      timer: BALANCE.planSeconds + index * BALANCE.planStagger,
      actionT: 0,
      carry: [],
      plan: [],
      loadBatchId: -1,
      mineQueue: [],
      erectPiece: null,
      passageBlock: null,
      passageVertical: false,
      routeId: -1,
      routeTargetId: -1,
      faceX: cell[0],
      faceZ: cell[2] + 1,
      // Need scales (points, see hungerRate): hunger, fatigue (spawnBuilder starts it part-way up).
      hunger: 0,
      hungerScale: rollHunger(),
      fatigue: 0,
      fatigueScale: rollFatigue(),
      // 'dorm' — tonight's bed is in the site's dorm, '' — the far trailers.
      sleepPlace: '',
      sleepFrom: 0,
      sleepTotal: 0,
      smokeNeed: 0,
      smokeThreshold: rollSmoke(),
      trade: 'builder',
      // «Учебный центр»: experience (cubes he set himself, by their grid), rank (1…), the efficiency
      // before the rank (the expertise rank of «Бригадир смены» or 1).
      xp: 0,
      rank: 1,
      baseEfficiency: 1,
      yardSlot: null,
      awayCell: null,
      mealCount: 0,
      restCount: 0,
      smokeCount: 0,
      breakKind: '',
      // Canteen: the dish of his last meal there ('' — none), where the current meal is
      // ('canteen' or ''), building the canteen now, canteen cubes in his hands.
      dish: '',
      // «Шеф-повар» at his last canteen meal; on his way back from a smoke («Дорожки на перекур»).
      dishPower: 1,
      fromSmoke: false,
      mealPlace: '',
      // Already tried the canteen this hunger cycle (one try between meals).
      canteenTried: false,
      // Smoking habit on this site; the smoke group he is with; a call he heard and will follow
      // ({ group, until } in level seconds); where this smoke is ('lounge' — a seat at the site's
      // lounge, '' — a spot off the site).
      habit: 0,
      smokeGroup: null,
      smokeCall: null,
      smokePlace: '',
      camp: null,
      campCarry: 0,
      campHops: 0,
      // Indices of the camp cubes in his hands and the one he is setting.
      campCubes: [],
      campIndex: -1,
      // Seconds he has waited on the camp since his last cube or trip (campStalled).
      campStall: 0,
      exitAfterPlace: false,
      forcePlace: false,
      // View-only bookkeeping (never read by the simulation): why the worker waits, the plan
      // it took, the current trip and what that trip has earned so far.
      waitReason: '',
      planTaken: 0,
      planLimit: 0,
      haulLimit: '',
      haulSplit: null,
      planReason: '',
      haulCapacity: 0,
      haulDoubled: false,
      tripLimit: '',
      tripCapacity: 0,
      tripKg: 0,
      tripLoad: 0,
      tripCoins: 0,
      tripCapital: 0,
      tripLucky: 0,
      tripCubes: 0,
      tripPours: 0,
      tripLuckyMultiplier: 1,
      tripBlock: null,
      carryVersion: 0,
    };
  }

  function beginPlanning(builder) {
    builder.waitReason = '';
    builder.needTrip = '';
    builder.phase = 'plan';
    builder.timer = workSeconds(builder, BALANCE.planSeconds);
    builder.actionT = 0;
    builder.faceX = builder.homeCell[0];
    builder.faceZ = builder.homeCell[2] + 1;
  }

  function spawnBuilder(world) {
    const index = world.builders.length;
    const cell = world.level.spawnPoints[index % world.level.spawnPoints.length];
    const builder = createBuilder(index, cell);
    // Only the workers brought by expertise have a rank. Recruits and session hires are regular.
    const ranks = world.campaign.metaWorkerRanks || [];
    builder.baseEfficiency = index < ranks.length ? ranks[index] : 1;
    builder.timeEfficiency = builder.baseEfficiency;
    builder.expertiseRank = index < ranks.length ? ranks[index] : 0;
    // «Учебный центр»: a resumed site gives back his experience (by hiring order); a fresh start —
    // the starting workers come at «Подготовленный набор», hires with «Стажировка».
    const training = world.campaign.training;
    const ordinal = countWorkers(world);
    const resumed = world.campaign.resumeWorkerXp || [];
    if (ordinal < resumed.length) builder.xp = resumed[ordinal] || 0;
    else if (training && training.on) {
      builder.xp = ordinal < (world.campaign.baseMetaBuilders || 0)
        ? rankXp(Math.min(training.startRank, training.cap)) : (training.hireXp || 0) + lineValue(world.campaign, 'hireXp');
    }
    builder.hungerScale += lineValue(world.campaign, 'satiety');
    settleRank(builder, world, false);
    builder.timer /= builder.timeEfficiency;
    // A hire starts rested: hires come at different times, so the crew's sleep spreads into a wave.
    builder.fatigue = ((SLEEP.startFatigueMin || 0) + Math.random() * ((SLEEP.startFatigueMax || 0) - (SLEEP.startFatigueMin || 0))) * builder.fatigueScale;
    world.builders.push(builder);
    world.events.push({ type: 'spawn', builder: builder });
    return builder;
  }

  // ---------- «Учебный центр»: experience and ranks (docs/gdd/26-builder-school-draft.md) ----------
  const TRAINING = (window.MicroBuildersBalance.meta && window.MicroBuildersBalance.meta.training) ||
    { ranks: [{ xp: 0, work: 1 }], baseRankCap: 3 };

  function countWorkers(world) {
    let count = 0;
    for (let i = 0; i < world.builders.length; i++) if (world.builders[i].trade !== 'engineer') count += 1;
    return count;
  }

  // Experience a rank starts at (rank 1 — 0).
  function rankXp(rank) {
    const spec = TRAINING.ranks[Math.max(0, Math.min(TRAINING.ranks.length, rank) - 1)];
    return spec ? spec.xp : 0;
  }

  // The work factor of a rank; «Сила разряда» stretches its bonus.
  function rankWork(rank, campaign) {
    const spec = TRAINING.ranks[Math.max(0, Math.min(TRAINING.ranks.length, rank) - 1)];
    const power = campaign && campaign.training ? campaign.training.power || 1 : 1;
    return 1 + ((spec ? spec.work : 1) - 1) * power;
  }

  // Rank from experience under the site's cap; the efficiency follows it. `announce` — a rank-up event.
  function settleRank(builder, world, announce) {
    const training = world.campaign.training;
    const cap = training && training.on ? training.cap : 1;
    let rank = 1;
    // «Ускоренная аттестация»: every rank asks for less experience.
    const exam = lineValue(world.campaign, 'rankFast');
    while (rank < cap && rank < TRAINING.ranks.length && builder.xp >= TRAINING.ranks[rank].xp * exam) rank += 1;
    if (announce && rank > builder.rank) world.events.push({ type: 'rankUp', builder: builder, rank: rank });
    builder.rank = rank;
    builder.timeEfficiency = builder.baseEfficiency * rankWork(rank, world.campaign);
  }

  // A worker set a whole cube himself: experience by its grid (a heavy grid-3 cube — 3 points).
  function gainWorkerXp(builder, world, block) {
    const training = world.campaign.training;
    if (!training || !training.on || builder.trade === 'engineer') return;
    // 1 a whole cube: not the mini-cubes, whatever the grid; «Мастер-класс» (advanced) doubles it.
    builder.xp += (training.xpScale || 1) * advancedValue(world.campaign, 'advXp', 1) * lineValue(world.campaign, 'xpRate');
    settleRank(builder, world, true);
  }

  // Offline cubes: their experience is shared by the workers evenly — 1 a whole cube, only the workers'
  // share of them (`share`, sim.js → builderShare; drones and machines give none).
  function shareWorkerXp(world, blocks, share) {
    const training = world.campaign.training;
    if (!training || !training.on || blocks.length === 0) return;
    const workers = world.builders.filter(function (builder) { return builder.trade !== 'engineer'; });
    if (workers.length === 0) return;
    const points = blocks.length * (share === undefined ? 1 : share);
    const each = points * (training.xpScale || 1) * advancedValue(world.campaign, 'advXp', 1) * lineValue(world.campaign, 'xpRate') / workers.length;
    workers.forEach(function (builder) {
      builder.xp += each;
      settleRank(builder, world, false);
    });
  }

  // After a meta purchase (cap, power): every worker's rank and efficiency anew.
  function refreshRanks(world) {
    for (let i = 0; i < world.builders.length; i++) {
      if (world.builders[i].trade !== 'engineer') settleRank(world.builders[i], world, true);
    }
  }

  // Experience of the workers in hiring order (the site snapshot keeps it).
  function workerXpList(world) {
    if (!world) return [];
    return world.builders.filter(function (builder) { return builder.trade !== 'engineer'; })
      .map(function (builder) { return Math.round((builder.xp || 0) * 10) / 10; });
  }

  // For the worker card: rank, experience and the next threshold (null — the cap or the top).
  function workerRankInfo(builder, campaign) {
    const training = campaign && campaign.training;
    const cap = training && training.on ? training.cap : 1;
    const next = builder.rank < cap && builder.rank < TRAINING.ranks.length ? TRAINING.ranks[builder.rank].xp : null;
    return { on: !!(training && training.on), rank: builder.rank || 1, xp: builder.xp || 0, from: rankXp(builder.rank || 1), next: next, cap: cap,
      work: rankWork(builder.rank || 1, campaign) };
  }

  function createVehicle(index, cell) {
    return {
      index: index,
      ownerId: -index - 2,
      kind: 'loader',
      pattern: [],
      yard: null,
      flyX: cell[0],
      flyY: 0,
      flyZ: cell[2],
      homeCell: cell.slice(),
      cell: cell.slice(),
      from: cell.slice(),
      to: cell.slice(),
      segmentT: 1,
      phase: 'plan',
      timer: BALANCE.planSeconds,
      buildDuration: 0,
      actionT: 0,
      path: null,
      pathIndex: 0,
      drivePurpose: '',
      driveTarget: null,
      plan: [],
      mineQueue: [],
      parkingCell: null,
      currentBlock: null,
      payloadReady: false,
      payloadHookBlock: null,
      payloadMinY: 0,
      craneStowedHookY: 0,
      craneClearanceY: 0,
      craneLiftSeconds: 0,
      craneExtendSeconds: 0,
      craneLowerSeconds: 0,
      craneDockSeconds: 0,
      faceX: cell[0],
      faceZ: cell[2] + 1,
      currentSpeed: 0,
      heading: 0,
      headingReady: false,
      altitude: TUNING.machines.idleAltitude,
      cableLength: TUNING.machines.heliCarryCable,
      carryDrop: TUNING.machines.loaderCarryDrop,
      hookT: 0,
      carried: false,
      patternMaxY: 0,
      patternSpanX: 0,
      patternSpanZ: 0,
      destMinX: 0,
      destMinY: 0,
      destMinZ: 0,
    };
  }

  function spawnVehicle(world) {
    const index = world.vehicles.length;
    const spawnIndex = world.level.spawnPoints.length - 1 - ((index * 3) % world.level.spawnPoints.length);
    const vehicle = createVehicle(index, world.level.spawnPoints[spawnIndex]);
    world.vehicles.push(vehicle);
    world.events.push({ type: 'spawnVehicle', vehicle: vehicle });
    return vehicle;
  }

  function vehicleCanDrive(x, z, world) {
    const index = world.index;
    if (!index.inside(x, 0, z)) return false;
    const id = index.id(x, 0, z);
    if (world.solidGrid[id] === 1 || world.waterGrid[id] === 1 || (world.campGrid[id] & CAMP_PAD) !== 0) return false;
    return world.blockGrid[id] === undefined;
  }

  function vehiclePath(from, target, world) {
    const index = world.index;
    from = [Math.round(from[0]), 0, Math.round(from[2])];
    target = [Math.round(target[0]), 0, Math.round(target[2])];
    if (!vehicleCanDrive(target[0], target[2], world)) return null;
    world.vehiclePathEpoch += 1;
    if (world.vehiclePathEpoch === 4294967295) {
      world.vehiclePathStamp.fill(0);
      world.vehiclePathEpoch = 1;
    }
    const epoch = world.vehiclePathEpoch;
    const stamp = world.vehiclePathStamp;
    const previous = world.vehiclePrevious;
    const queue = world.vehicleQueue;
    const startId = index.id(from[0], 0, from[2]);
    const goalId = index.id(target[0], 0, target[2]);
    queue.length = 1;
    queue[0] = startId;
    stamp[startId] = epoch;
    previous[startId] = -1;
    let head = 0;
    while (head < queue.length && stamp[goalId] !== epoch) {
      const id = queue[head++];
      index.decodeInto(id, world.vehicleCell);
      for (let d = 0; d < DIRS.length; d++) {
        const x = world.vehicleCell[0] + DIRS[d][0];
        const z = world.vehicleCell[2] + DIRS[d][1];
        if (!vehicleCanDrive(x, z, world)) continue;
        const nextId = index.id(x, 0, z);
        if (stamp[nextId] === epoch) continue;
        stamp[nextId] = epoch;
        previous[nextId] = id;
        queue.push(nextId);
      }
    }
    if (stamp[goalId] !== epoch) return null;
    const path = [];
    let cursor = goalId;
    while (cursor !== -1) {
      const cell = [0, 0, 0];
      index.decodeInto(cursor, cell);
      path.push(cell);
      cursor = previous[cursor];
    }
    path.reverse();
    return path;
  }

  function vehicleCanReachBlock(parking, block, campaign) {
    const dx = block.x - parking[0];
    const dz = block.z - parking[2];
    const reach = vehicleReach(campaign);
    return dx * dx + dz * dz <= reach * reach &&
      block.y + 1 <= vehicleHeight(campaign);
  }

  function exteriorBlock(block, world) {
    return world.exteriorStamp[world.index.id(block.x, block.y, block.z)] === world.exteriorEpoch;
  }

  function bestVehicleParking(vehicle, anchor, world) {
    let best = null;
    let bestPath = null;
    const reach = vehicleReach(world.campaign);
    for (let dz = -reach; dz <= reach; dz++) {
      for (let dx = -reach; dx <= reach; dx++) {
        if (dx * dx + dz * dz > reach * reach) continue;
        const cell = [anchor.x + dx, 0, anchor.z + dz];
        if (!vehicleCanDrive(cell[0], cell[2], world)) continue;
        const path = vehiclePath(vehicle.cell, cell, world);
        if (!path) continue;
        if (!bestPath || path.length < bestPath.length) {
          best = cell;
          bestPath = path;
        }
      }
    }
    return best ? { cell: best, path: bestPath } : null;
  }

  function touchesVehiclePlan(block, completed) {
    if (completed.has(cellKey(block.x, block.y - 1, block.z))) return true;
    if (completed.has(cellKey(block.x, block.y + 1, block.z))) return true;
    for (let d = 0; d < DIRS.length; d++) {
      if (completed.has(cellKey(block.x + DIRS[d][0], block.y, block.z + DIRS[d][1]))) return true;
    }
    return false;
  }

  function reserveVehiclePlan(vehicle, world) {
    refreshExteriorAir(world);
    const candidates = world.orderedBlocks;
    const limit = vehiclePlanLimit(world.campaign);
    let anchor = null;
    let parking = null;
    for (let i = 0; i < candidates.length; i++) {
      const block = candidates[i];
      if (block.built || block.reserved || block.owner !== -1 || !block.ready) continue;
      if (!exteriorBlock(block, world) || block.y + 1 > vehicleHeight(world.campaign)) continue;
      const candidateParking = bestVehicleParking(vehicle, block, world);
      if (!candidateParking) continue;
      anchor = block;
      parking = candidateParking;
      break;
    }
    if (!anchor) return false;
    const plan = [anchor];
    const completed = new Set([cellKey(anchor.x, anchor.y, anchor.z)]);
    let added = true;
    while (added && plan.length < limit) {
      added = false;
      for (let i = 0; i < candidates.length && plan.length < limit; i++) {
        const block = candidates[i];
        if (block.built || block.reserved || block.owner !== -1) continue;
        const key = cellKey(block.x, block.y, block.z);
        if (completed.has(key) || !touchesVehiclePlan(block, completed)) continue;
        if (!vehicleCanReachBlock(parking.cell, block, world.campaign)) continue;
        if (!exteriorBlock(block, world) || !canCompleteAfter(block, world, completed)) continue;
        plan.push(block);
        completed.add(key);
        added = true;
      }
    }
    for (let i = 0; i < plan.length; i++) {
      plan[i].reserved = true;
      plan[i].owner = vehicle.ownerId;
    }
    vehicle.plan = plan;
    vehicle.parkingCell = parking.cell;
    vehicle.mineQueue = groupPlan(plan, world);
    vehicle.mineQueue.sort(function (a, b) {
      const da = (a.mine.standX - vehicle.cell[0]) * (a.mine.standX - vehicle.cell[0]) +
        (a.mine.standZ - vehicle.cell[2]) * (a.mine.standZ - vehicle.cell[2]);
      const db = (b.mine.standX - vehicle.cell[0]) * (b.mine.standX - vehicle.cell[0]) +
        (b.mine.standZ - vehicle.cell[2]) * (b.mine.standZ - vehicle.cell[2]);
      return da - db;
    });
    return true;
  }

  function releaseVehiclePlan(vehicle) {
    for (let i = 0; i < vehicle.plan.length; i++) {
      const block = vehicle.plan[i];
      if (block.built || block.owner !== vehicle.ownerId) continue;
      block.reserved = false;
      block.owner = -1;
    }
    vehicle.plan = [];
    vehicle.pattern = [];
    vehicle.yard = null;
    vehicle.mineQueue = [];
    vehicle.parkingCell = null;
    vehicle.currentBlock = null;
    vehicle.payloadReady = false;
    vehicle.payloadHookBlock = null;
    if (vehicle.craneStages) {
      vehicle.craneStages = null;
      vehicle.cranePose = craneStow();
    }
    vehicle.carried = false;
  }

  function prepareVehiclePayload(vehicle) {
    let hook = vehicle.plan[0];
    let minY = hook.y;
    for (let i = 1; i < vehicle.plan.length; i++) {
      const block = vehicle.plan[i];
      if (block.y > hook.y) hook = block;
      if (block.y < minY) minY = block.y;
    }
    vehicle.payloadHookBlock = hook;
    vehicle.payloadMinY = minY;
    vehicle.currentBlock = hook;
    vehicle.craneStowedHookY = 0.65 + (hook.y - minY) + 0.55;
    vehicle.craneClearanceY = hook.y + 0.5 + VEHICLE.craneClearance;
  }

  function beginVehicleDrive(vehicle, path, purpose, target) {
    vehicle.path = path;
    vehicle.pathIndex = 0;
    vehicle.drivePurpose = purpose;
    vehicle.driveTarget = target.slice();
    vehicle.from = path[0].slice();
    vehicle.cell = path[0].slice();
    if (path.length === 1) {
      vehicle.to = path[0].slice();
      vehicle.segmentT = 1;
      arriveVehicle(vehicle);
      return;
    }
    vehicle.phase = 'drive';
    vehicle.to = path[1].slice();
    vehicle.segmentT = 0;
    vehicle.faceX = vehicle.to[0];
    vehicle.faceZ = vehicle.to[2];
  }

  // Driving route with as few turns as possible: Dijkstra over (cell, heading) with 8 headings,
  // where any change of heading costs more than any distance. Diagonal steps may not cut corners.
  const ROUTE_DIRS = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
  const ROUTE_TURN_COST = 1000;

  function vehicleRoute(from, target, world) {
    from = [Math.round(from[0]), 0, Math.round(from[2])];
    target = [Math.round(target[0]), 0, Math.round(target[2])];
    if (!vehicleCanDrive(target[0], target[2], world)) return null;
    if (from[0] === target[0] && from[2] === target[2]) return [from];
    const index = world.index;
    const startId = index.id(from[0], 0, from[2]);
    const goalId = index.id(target[0], 0, target[2]);
    const best = new Map();
    const parent = new Map();
    const heap = [];
    function push(cost, state) {
      heap.push([cost, state]);
      let i = heap.length - 1;
      while (i > 0) {
        const up = (i - 1) >> 1;
        if (heap[up][0] <= heap[i][0]) break;
        const swap = heap[up];
        heap[up] = heap[i];
        heap[i] = swap;
        i = up;
      }
    }
    function pop() {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length > 0) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1;
          const r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          const swap = heap[m];
          heap[m] = heap[i];
          heap[i] = swap;
          i = m;
        }
      }
      return top;
    }
    const cell = [0, 0, 0];
    for (let d = 0; d < 8; d++) {
      const state = startId * 8 + d;
      best.set(state, 0);
      parent.set(state, -1);
      push(0, state);
    }
    let goal = -1;
    while (heap.length > 0) {
      const item = pop();
      const cost = item[0];
      const state = item[1];
      if (cost > best.get(state)) continue;
      const id = Math.floor(state / 8);
      const dir = state % 8;
      if (id === goalId) {
        goal = state;
        break;
      }
      index.decodeInto(id, cell);
      for (let d = 0; d < 8; d++) {
        const step = ROUTE_DIRS[d];
        const x = cell[0] + step[0];
        const z = cell[2] + step[1];
        if (!vehicleCanDrive(x, z, world)) continue;
        const diagonal = step[0] !== 0 && step[1] !== 0;
        if (diagonal && (!vehicleCanDrive(cell[0] + step[0], cell[2], world) || !vehicleCanDrive(cell[0], cell[2] + step[1], world))) continue;
        const next = index.id(x, 0, z) * 8 + d;
        const nextCost = cost + (diagonal ? Math.SQRT2 : 1) + (d === dir || parent.get(state) === -1 ? 0 : ROUTE_TURN_COST);
        const known = best.get(next);
        if (known !== undefined && known <= nextCost) continue;
        best.set(next, nextCost);
        parent.set(next, state);
        push(nextCost, next);
      }
    }
    if (goal < 0) return null;
    const path = [];
    for (let state = goal; state !== -1; state = parent.get(state)) {
      const p = [0, 0, 0];
      index.decodeInto(Math.floor(state / 8), p);
      path.push(p);
    }
    path.reverse();
    return path;
  }

  function driveVehicleTo(vehicle, target, purpose, world) {
    const path = vehicleRoute(vehicle.cell, target, world);
    if (!path) return false;
    vehicle.world = world;
    beginVehicleDrive(vehicle, path, purpose, target);
    return true;
  }

  function arriveVehicle(vehicle) {
    const world = vehicle.world;
    vehicle.cell = vehicle.to.slice();
    vehicle.from = vehicle.cell.slice();
    vehicle.segmentT = 1;
    if (vehicle.drivePurpose === 'mine') {
      const group = vehicle.mineQueue[0];
      vehicle.phase = 'load';
      vehicle.timer = group.blocks.length * VEHICLE.loadSeconds * world.level.pace;
      vehicle.actionT = 0;
      vehicle.faceX = group.mine.x;
      vehicle.faceZ = group.mine.z;
      return;
    }
    if (vehicle.drivePurpose === 'pickup') {
      beginHook(vehicle);
      return;
    }
    if (vehicle.drivePurpose === 'park') {
      if (vehicle.carried) beginLower(vehicle);
      else beginVehicleBuild(vehicle, world);
      return;
    }
    if (vehicle.drivePurpose === 'home') {
      beginCooldown(vehicle);
      return;
    }
    vehicle.phase = 'plan';
    vehicle.timer = BALANCE.planSeconds;
    vehicle.actionT = 0;
  }

  function driveVehicleToNextMine(vehicle, world) {
    const group = vehicle.mineQueue[0];
    const target = [group.mine.standX, 0, group.mine.standZ];
    if (driveVehicleTo(vehicle, target, 'mine', world)) return;
    releaseVehiclePlan(vehicle);
    driveVehicleHome(vehicle, world);
  }

  function beginCooldown(vehicle) {
    vehicle.phase = 'cooldown';
    vehicle.timer = TUNING.machines.cooldownSeconds;
    vehicle.actionT = 0;
    vehicle.currentSpeed = 0;
    vehicle.carried = false;
    vehicle.hookT = 0;
  }

  function driveVehicleHome(vehicle, world) {
    const home = vehicle.homeCell;
    if (vehicle.kind === 'heli') {
      if (Math.hypot(vehicle.cell[0] - home[0], vehicle.cell[2] - home[2]) < TUNING.machines.homeDistance) {
        beginCooldown(vehicle);
        return;
      }
      beginHeliFlight(vehicle, world, [home[0], 0, home[2]], TUNING.machines.heliReturnAltitude, 'return');
      return;
    }
    if (sameCell(vehicle.cell, home)) {
      beginCooldown(vehicle);
      return;
    }
    if (driveVehicleTo(vehicle, home, 'home', world)) return;
    beginCooldown(vehicle);
  }

  function patternLimits(vehicle, campaign) {
    if (vehicle.kind === 'heli') {
      return {
        mass: sessionValue('heliMass', campaign.purchases.heliMass),
        width: sessionValue('heliWidth', campaign.purchases.heliWidth),
        height: sessionValue('heliHeight', campaign.purchases.heliHeight),
        boom: false,
      };
    }
    return {
      mass: sessionValue('loaderMass', campaign.purchases.loaderMass),
      width: sessionValue('bucket', campaign.purchases.bucket),
      height: sessionValue('patternHeight', campaign.purchases.patternHeight),
      boom: true,
    };
  }

  function clusterSeed(block) {
    return !block.built && !block.reserved && block.owner === -1 && block.ready && !block.feature && block.poured === 0;
  }

  // Cubes a pattern may take besides its anchor: support may come from the pattern itself
  // (canCompleteAfter checks that), so `ready` is not required here.
  function clusterMember(block) {
    return !block.built && !block.reserved && block.owner === -1 && !block.feature && block.poured === 0;
  }

  // Loader parking straight in line with the pattern along X or Z, so the jib runs out along one
  // axis; the jib reach (vehicleReach) is the depth from the parking cell to the pattern centre.
  function axisParking(vehicle, box, world) {
    const reach = vehicleReach(world.campaign);
    const cx = (box.minX + box.maxX + 1) / 2;
    const cz = (box.minZ + box.maxZ + 1) / 2;
    const column = Math.floor(cx);
    const row = Math.floor(cz);
    const options = [];
    // Two cells of clearance keep the chassis (about two cells long) off the pattern footprint.
    for (let z = box.minZ - 2; Math.abs(z + 0.5 - cz) <= reach; z--) options.push([column, 0, z]);
    for (let z = box.maxZ + 2; Math.abs(z + 0.5 - cz) <= reach; z++) options.push([column, 0, z]);
    for (let x = box.minX - 2; Math.abs(x + 0.5 - cx) <= reach; x--) options.push([x, 0, row]);
    for (let x = box.maxX + 2; Math.abs(x + 0.5 - cx) <= reach; x++) options.push([x, 0, row]);
    const drivable = options.filter(function (cell) { return vehicleCanDrive(cell[0], cell[2], world); });
    // Prefer the spot closest to the pattern: a short jib, the machine works right at the wall.
    drivable.sort(function (a, b) {
      return Math.hypot(a[0] + 0.5 - cx, a[2] + 0.5 - cz) - Math.hypot(b[0] + 0.5 - cx, b[2] + 0.5 - cz);
    });
    for (let i = 0; i < drivable.length && i < 8; i++) {
      if (vehiclePath(vehicle.cell, drivable[i], world)) return drivable[i];
    }
    return null;
  }

  function selectCluster(vehicle, world) {
    const limits = patternLimits(vehicle, world.campaign);
    const blocks = world.orderedBlocks;
    const height = vehicleHeight(world.campaign);
    for (let i = 0; i < blocks.length; i++) {
      const anchor = blocks[i];
      if (!clusterSeed(anchor)) continue;
      if (limits.boom && anchor.y + 1 > height) continue;
      const cluster = [anchor];
      const done = new Set([cellKey(anchor.x, anchor.y, anchor.z)]);
      let mass = MATERIAL[anchor.materialId].weight;
      const box = { minX: anchor.x, maxX: anchor.x, minY: anchor.y, maxY: anchor.y, minZ: anchor.z, maxZ: anchor.z };
      let grew = true;
      while (grew) {
        grew = false;
        for (let n = 0; n < blocks.length; n++) {
          const block = blocks[n];
          const key = cellKey(block.x, block.y, block.z);
          if (!clusterMember(block) || done.has(key) || !touchesVehiclePlan(block, done)) continue;
          const nextMass = mass + MATERIAL[block.materialId].weight;
          if (nextMass > limits.mass) continue;
          const nMinX = Math.min(box.minX, block.x);
          const nMaxX = Math.max(box.maxX, block.x);
          const nMinY = Math.min(box.minY, block.y);
          const nMaxY = Math.max(box.maxY, block.y);
          const nMinZ = Math.min(box.minZ, block.z);
          const nMaxZ = Math.max(box.maxZ, block.z);
          if (nMaxX - nMinX + 1 > limits.width || nMaxZ - nMinZ + 1 > limits.width) continue;
          if (nMaxY - nMinY + 1 > limits.height) continue;
          if (limits.boom && block.y + 1 > height) continue;
          if (!canCompleteAfter(block, world, done)) continue;
          cluster.push(block);
          done.add(key);
          mass = nextMass;
          box.minX = nMinX;
          box.maxX = nMaxX;
          box.minY = nMinY;
          box.maxY = nMaxY;
          box.minZ = nMinZ;
          box.maxZ = nMaxZ;
          grew = true;
        }
      }
      let parking = null;
      if (limits.boom) {
        parking = axisParking(vehicle, box, world);
        if (!parking && cluster.length > 1) {
          cluster.length = 1;
          box.minX = box.maxX = anchor.x;
          box.minY = box.maxY = anchor.y;
          box.minZ = box.maxZ = anchor.z;
          parking = axisParking(vehicle, box, world);
        }
        if (!parking) continue;
      }
      return { blocks: cluster, parking: parking, minX: box.minX, minY: box.minY, minZ: box.minZ, width: limits.width };
    }
    return null;
  }

  function yardOrigin(world, vehicle, width) {
    const mine = world.level.mines[0];
    let slot = 0;
    for (let i = 0; i < world.vehicles.length; i++) {
      if (world.vehicles[i] === vehicle) break;
      if (world.vehicles[i].pattern.length > 0) slot += 1;
    }
    return {
      x: mine.x + 8 + slot * (width + 3),
      z: mine.z + 6,
      width: width,
    };
  }

  function beginPattern(vehicle, world) {
    if (sessionValue('engineers', world.campaign.purchases.engineers) < 1) return false;
    const cluster = selectCluster(vehicle, world);
    if (!cluster) return false;
    const yard = yardOrigin(world, vehicle, cluster.width);
    vehicle.yard = yard;
    vehicle.parkingCell = cluster.parking;
    vehicle.plan = cluster.blocks;
    vehicle.pattern = [];
    let maxX = 0;
    let maxY = 0;
    let maxZ = 0;
    for (let i = 0; i < cluster.blocks.length; i++) {
      const block = cluster.blocks[i];
      block.reserved = true;
      block.owner = vehicle.ownerId;
      const localX = block.x - cluster.minX;
      const localY = block.y - cluster.minY;
      const localZ = block.z - cluster.minZ;
      if (localX > maxX) maxX = localX;
      if (localY > maxY) maxY = localY;
      if (localZ > maxZ) maxZ = localZ;
      vehicle.pattern.push({
        block: block,
        localX: localX,
        localY: localY,
        localZ: localZ,
        wx: yard.x + localX,
        wy: localY,
        wz: yard.z + localZ,
        deck: block.y === cluster.minY,
        done: false,
        worker: -1,
        vehicleIndex: vehicle.index,
      });
    }
    vehicle.patternMaxY = maxY;
    vehicle.patternSpanX = maxX;
    vehicle.patternSpanZ = maxZ;
    vehicle.destMinX = cluster.minX;
    vehicle.destMinY = cluster.minY;
    vehicle.destMinZ = cluster.minZ;
    vehicle.phase = 'assemble';
    vehicle.timer = 0.3;
    vehicle.actionT = 0;
    world.events.push({ type: 'yardOpen', vehicle: vehicle, yard: yard });
    return true;
  }

  function beginHeliFlight(vehicle, world, target, altitude, phase) {
    const speed = sessionValue('heliSpeed', world.campaign.purchases.heliSpeed);
    const dx = target[0] - vehicle.cell[0];
    const dz = target[2] - vehicle.cell[2];
    vehicle.phase = phase;
    vehicle.flightSeconds = Math.max(Math.hypot(dx, dz), 0.5) / speed * world.level.pace;
    vehicle.segmentT = 0;
    vehicle.actionT = 0;
    vehicle.flyY = altitude;
    vehicle.flyX = target[0];
    vehicle.flyZ = target[2];
    vehicle.from = vehicle.cell.slice();
    vehicle.to = target.slice();
    vehicle.faceX = target[0];
    vehicle.faceZ = target[2];
    vehicle.world = world;
  }

  // ---------- loader crane ----------
  // A loader's crane moves in separate visible stages: the mast rises, the turret swings (a quick
  // ~1 s turn), the jib runs out, then the hook goes down on its cable. Folding runs them backwards.
  // Mast, jib and cable all travel at the same speed: boomSpeed seconds per cell. Short pauses sit
  // between stages; stages with nothing to move are skipped.
  const CRANE = {
    turretX: 0,
    turretY: 0.78,
    turretZ: -0.35,
    stowMast: 1.75,
    stowReach: 0.9,
    stowCable: 0.45,
    carryCable: 0.6,
    carryLift: 0.35,
    clearance: 2,
    minRaise: 0.8,
    turnSeconds: 1,
    pauseSeconds: 0.2,
  };

  function craneStow() {
    return { mast: CRANE.stowMast, yaw: 0, reach: CRANE.stowReach, cable: CRANE.stowCable, shiftX: 0, shiftZ: 0 };
  }

  function craneTurret(vehicle) {
    const h = vehicle.heading || 0;
    const cx = vehicle.cell[0] + 0.5;
    const cz = vehicle.cell[2] + 0.5;
    return {
      x: cx + CRANE.turretX * Math.cos(h) + CRANE.turretZ * Math.sin(h),
      z: cz - CRANE.turretX * Math.sin(h) + CRANE.turretZ * Math.cos(h),
    };
  }

  // The jib always runs along world X or Z. The turret slides a little on the chassis
  // (shift, in vehicle-local cells) so the jib line passes exactly over the target.
  function craneAim(vehicle, x, z, from) {
    const turret = craneTurret(vehicle);
    const h = vehicle.heading || 0;
    const dx = x - turret.x;
    const dz = z - turret.z;
    let angle = 0;
    let reach = 0;
    let offX = 0;
    let offZ = 0;
    if (Math.abs(dz) >= Math.abs(dx)) {
      angle = dz >= 0 ? 0 : Math.PI;
      reach = Math.abs(dz);
      offX = dx;
    } else {
      angle = dx >= 0 ? Math.PI / 2 : -Math.PI / 2;
      reach = Math.abs(dx);
      offZ = dz;
    }
    return {
      yaw: from.yaw + angleDelta(from.yaw, angle - h),
      reach: Math.max(CRANE.stowReach, reach),
      shiftX: offX * Math.cos(h) - offZ * Math.sin(h),
      shiftZ: offX * Math.sin(h) + offZ * Math.cos(h),
    };
  }

  function patternAnchorPoint(vehicle, atDest) {
    return {
      x: (atDest ? vehicle.destMinX : vehicle.yard.x) + vehicle.patternSpanX / 2 + 0.5,
      y: (atDest ? vehicle.destMinY : 0) + vehicle.patternMaxY + 1,
      z: (atDest ? vehicle.destMinZ : vehicle.yard.z) + vehicle.patternSpanZ / 2 + 0.5,
    };
  }

  function craneCarryPose(vehicle) {
    const front = 1.7 + Math.max(vehicle.patternSpanX, vehicle.patternSpanZ) / 2;
    return {
      mast: vehicle.patternMaxY + 1 + CRANE.carryLift + CRANE.carryCable,
      yaw: 0,
      reach: front - CRANE.turretZ,
      cable: CRANE.carryCable,
      shiftX: 0,
      shiftZ: 0,
    };
  }

  function craneReachPose(vehicle, anchor) {
    const from = vehicle.cranePose || craneStow();
    const aim = craneAim(vehicle, anchor.x, anchor.z, from);
    const mast = Math.max(from.mast + CRANE.minRaise, anchor.y + CRANE.clearance);
    return { mast: mast, yaw: aim.yaw, reach: aim.reach, cable: mast - anchor.y, shiftX: aim.shiftX, shiftZ: aim.shiftZ };
  }

  function beginCrane(vehicle, world, phase, target, unfold) {
    const from = vehicle.cranePose || craneStow();
    const secondsPerCell = sessionValue('boomSpeed', world.campaign.purchases.boomSpeed) * world.level.pace;
    const order = unfold ? ['mast', 'yaw', 'reach', 'cable'] : ['cable', 'reach', 'yaw', 'mast'];
    const stages = [];
    let total = 0;
    for (let i = 0; i < order.length; i++) {
      const kind = order[i];
      let seconds = 0;
      if (kind === 'yaw') {
        const turn = Math.abs(target.yaw - from.yaw);
        const slide = Math.hypot((target.shiftX || 0) - (from.shiftX || 0), (target.shiftZ || 0) - (from.shiftZ || 0));
        if (turn > 0.02 || slide > 0.02) seconds = CRANE.turnSeconds * (0.5 + 0.5 * Math.min(1, turn / Math.PI));
      } else {
        seconds = Math.abs(target[kind] - from[kind]) * secondsPerCell;
      }
      if (seconds < 0.01) continue;
      if (stages.length > 0) {
        stages.push({ kind: 'pause', seconds: CRANE.pauseSeconds });
        total += CRANE.pauseSeconds;
      }
      stages.push({ kind: kind, seconds: seconds });
      total += seconds;
    }
    vehicle.phase = phase;
    vehicle.craneFrom = from;
    vehicle.craneTo = target;
    vehicle.craneStages = stages;
    vehicle.timer = total;
    vehicle.actionT = 0;
    vehicle.currentSpeed = 0;
  }

  function easeStage(t) {
    const x = t < 0 ? 0 : t > 1 ? 1 : t;
    return x * x * (3 - 2 * x);
  }

  // Current crane pose, for the view: stages run one after another.
  function cranePose(vehicle) {
    if (!vehicle.craneStages) return vehicle.cranePose || craneStow();
    const from = vehicle.craneFrom;
    const to = vehicle.craneTo;
    const pose = {
      mast: from.mast,
      yaw: from.yaw,
      reach: from.reach,
      cable: from.cable,
      shiftX: from.shiftX || 0,
      shiftZ: from.shiftZ || 0,
    };
    let left = vehicle.actionT;
    for (let i = 0; i < vehicle.craneStages.length; i++) {
      const stage = vehicle.craneStages[i];
      const t = stage.seconds <= 0 ? 1 : easeStage(left / stage.seconds);
      if (stage.kind === 'yaw') {
        pose.shiftX = (from.shiftX || 0) + ((to.shiftX || 0) - (from.shiftX || 0)) * t;
        pose.shiftZ = (from.shiftZ || 0) + ((to.shiftZ || 0) - (from.shiftZ || 0)) * t;
      }
      if (stage.kind !== 'pause') pose[stage.kind] = from[stage.kind] + (to[stage.kind] - from[stage.kind]) * t;
      left -= stage.seconds;
      if (left < 0) break;
    }
    return pose;
  }

  function advanceCrane(vehicle, world, dt) {
    world.constructionStallElapsed = 0;
    vehicle.actionT += dt;
    if (vehicle.actionT < vehicle.timer) return;
    vehicle.cranePose = vehicle.craneTo;
    vehicle.craneStages = null;
    if (vehicle.phase === 'hook') {
      vehicle.carried = true;
      world.events.push({ type: 'yardRigClear', vehicle: vehicle });
      beginCrane(vehicle, world, 'lift', craneCarryPose(vehicle), false);
      return;
    }
    if (vehicle.phase === 'lift') {
      if (vehicle.parkingCell && driveVehicleTo(vehicle, vehicle.parkingCell, 'park', world)) return;
      releaseVehiclePlan(vehicle);
      vehicle.carried = false;
      vehicle.cranePose = craneStow();
      driveVehicleHome(vehicle, world);
      return;
    }
    if (vehicle.phase === 'lower') {
      finishVehicleBuild(vehicle, world);
      return;
    }
    if (vehicle.phase === 'fold') beginVehicleBuild(vehicle, world);
  }

  function patternCenter(vehicle, originX, originZ) {
    return [originX + vehicle.patternSpanX / 2, originZ + vehicle.patternSpanZ / 2];
  }

  function beginHook(vehicle) {
    if (vehicle.kind !== 'heli') {
      beginCrane(vehicle, vehicle.world, 'hook', craneReachPose(vehicle, patternAnchorPoint(vehicle, false)), true);
      vehicle.carried = false;
      return;
    }
    const travel = vehicle.kind === 'heli'
      ? Math.max(vehicle.altitude - vehicle.patternMaxY - TUNING.machines.heliHookGap, TUNING.machines.hookMinTravel)
      : TUNING.machines.loaderCarryDrop;
    vehicle.phase = 'hook';
    vehicle.timer = travel / TUNING.machines.hookSpeed;
    vehicle.actionT = 0;
    vehicle.hookT = 0;
    vehicle.carried = false;
    vehicle.currentSpeed = 0;
  }

  function beginLower(vehicle) {
    if (vehicle.kind !== 'heli') {
      beginCrane(vehicle, vehicle.world, 'lower', craneReachPose(vehicle, patternAnchorPoint(vehicle, true)), true);
      vehicle.carried = true;
      return;
    }
    vehicle.phase = 'lower';
    vehicle.timer = TUNING.machines.lowerSeconds;
    vehicle.actionT = 0;
    vehicle.hookT = 0;
    vehicle.carried = true;
    vehicle.currentSpeed = 0;
  }

  function beginHeliFetch(vehicle, world) {
    const center = patternCenter(vehicle, vehicle.yard.x, vehicle.yard.z);
    vehicle.payloadReady = false;
    vehicle.carried = false;
    vehicle.hookT = 0;
    beginHeliFlight(vehicle, world, [center[0], 0, center[1]], vehicle.patternMaxY + TUNING.machines.heliFetchExtra, 'fetch');
  }

  function beginHeliDrop(vehicle, world) {
    const center = patternCenter(vehicle, vehicle.destMinX, vehicle.destMinZ);
    vehicle.carried = true;
    vehicle.hookT = 1;
    vehicle.cableLength = TUNING.machines.heliCarryCable;
    const cruise = world.level.footprint.maxY + vehicle.patternMaxY + TUNING.machines.heliCruiseExtra;
    beginHeliFlight(vehicle, world, [center[0], 0, center[1]], cruise, 'fly');
  }

  function arriveHeli(vehicle, world) {
    vehicle.cell = vehicle.to.slice();
    vehicle.from = vehicle.cell.slice();
    vehicle.segmentT = 1;
    vehicle.altitude = vehicle.flyY;
    if (vehicle.phase === 'fetch') {
      beginHook(vehicle);
      return;
    }
    if (vehicle.phase === 'return') {
      beginCooldown(vehicle);
      return;
    }
    beginLower(vehicle);
  }

  function advanceHookPhase(vehicle, world, dt) {
    if (vehicle.kind !== 'heli') {
      advanceCrane(vehicle, world, dt);
      return;
    }
    world.constructionStallElapsed = 0;
    if (vehicle.phase === 'lift' && vehicle.kind === 'heli') {
      const cable = TUNING.machines.heliCarryCable;
      const reel = TUNING.machines.heliReelSpeed * dt;
      if (vehicle.cableLength > cable) {
        vehicle.cableLength = vehicle.cableLength - reel < cable ? cable : vehicle.cableLength - reel;
      }
      const cruise = world.level.footprint.maxY + vehicle.patternMaxY + TUNING.machines.heliCruiseExtra;
      if (vehicle.altitude < cruise) {
        const climb = TUNING.machines.heliClimbSpeed * dt;
        const room = cruise - vehicle.altitude;
        vehicle.altitude += climb < room ? climb : room;
      }
      vehicle.hookT = 1;
      vehicle.carried = true;
      if (vehicle.cableLength > cable || vehicle.altitude < cruise) return;
      beginHeliDrop(vehicle, world);
      return;
    }
    vehicle.actionT += dt;
    const raw = vehicle.actionT / vehicle.timer;
    const t = raw > 1 ? 1 : raw;
    if (vehicle.phase === 'hook') vehicle.hookT = t;
    else if (vehicle.phase === 'lift') {
      vehicle.carried = true;
      vehicle.hookT = 1 - t;
    } else vehicle.hookT = t;
    if (t < 1) return;
    if (vehicle.phase === 'hook') {
      vehicle.carryDrop = vehicle.kind === 'heli'
        ? Math.max(vehicle.altitude - vehicle.patternMaxY - TUNING.machines.heliHookGap, TUNING.machines.hookMinTravel)
        : TUNING.machines.loaderCarryDrop;
      vehicle.cableLength = vehicle.carryDrop;
      vehicle.liftTarget = vehicle.altitude + (vehicle.kind === 'heli' ? 2.5 : 0);
      vehicle.phase = 'lift';
      vehicle.timer = vehicle.carryDrop / TUNING.machines.hookSpeed;
      vehicle.actionT = 0;
      vehicle.carried = true;
      vehicle.hookT = 1;
      world.events.push({ type: 'yardRigClear', vehicle: vehicle });
      return;
    }
    if (vehicle.phase === 'lift') {
      vehicle.hookT = 0;
      if (vehicle.kind === 'heli') beginHeliDrop(vehicle, world);
      else if (vehicle.parkingCell && driveVehicleTo(vehicle, vehicle.parkingCell, 'park', world)) return;
      else releaseVehiclePlan(vehicle);
      return;
    }
    finishVehicleBuild(vehicle, world);
  }

  function advanceHeli(vehicle, world, dt) {
    world.constructionStallElapsed = 0;
    const dx = vehicle.to[0] - vehicle.cell[0];
    const dz = vehicle.to[2] - vehicle.cell[2];
    const dist = Math.hypot(dx, dz);
    const desired = dist > 0.2 ? Math.atan2(dx, dz) : vehicle.heading;
    const speed = moveSpeed(vehicle, world, dt, desired);
    const step = speed * dt;
    if (dist > 0.05) {
      const move = step < dist ? step : dist;
      vehicle.cell[0] += dx / dist * move;
      vehicle.cell[2] += dz / dist * move;
    }
    const dy = vehicle.flyY - vehicle.altitude;
    const climb = step < Math.abs(dy) ? step : Math.abs(dy);
    if (dy > 0) vehicle.altitude += climb;
    else vehicle.altitude -= climb;
    vehicle.faceX = vehicle.cell[0] + Math.sin(vehicle.heading);
    vehicle.faceZ = vehicle.cell[2] + Math.cos(vehicle.heading);
    if (dist > TUNING.machines.arriveDistance || Math.abs(vehicle.flyY - vehicle.altitude) > TUNING.machines.arriveDistance) return;
    arriveHeli(vehicle, world);
  }

  // Park in front of the yard so the pattern hangs right before the crane, not under the wheels.
  function driveToYardFront(vehicle, world) {
    const front = [vehicle.yard.x + Math.floor(vehicle.patternSpanX / 2), 0, vehicle.yard.z - 2];
    if (vehicleCanDrive(front[0], front[2], world) && driveVehicleTo(vehicle, front, 'pickup', world)) return true;
    return driveVehicleTo(vehicle, [vehicle.yard.x, 0, vehicle.yard.z], 'pickup', world);
  }

  function checkPattern(vehicle, world) {
    let pending = 0;
    for (let i = 0; i < vehicle.pattern.length; i++) {
      if (!vehicle.pattern[i].done) pending += 1;
    }
    if (pending > 0) {
      vehicle.phase = 'assemble';
      vehicle.timer = 0.25;
      return;
    }
    if (vehicle.kind === 'heli') beginHeliFetch(vehicle, world);
    else if (vehicle.yard && driveToYardFront(vehicle, world)) return;
    else {
      world.events.push({ type: 'yardClear', vehicle: vehicle });
      if (vehicle.parkingCell && driveVehicleTo(vehicle, vehicle.parkingCell, 'park', world)) return;
      releaseVehiclePlan(vehicle);
    }
  }

  function requestVehiclePlan(vehicle, world) {
    if (world.vehicleNoWorkSerial === world.vehicleWorkSerial) {
      vehicle.phase = 'idle';
      vehicle.timer = 0.5;
      return;
    }
    if (!beginPattern(vehicle, world)) {
      vehicle.phase = 'idle';
      vehicle.timer = 0.5;
    }
  }

  // ---------- construction drones ----------
  // Drones live on their own landing pads. Jobs, by priority:
  //  1. pattern: fetch a cube from its mine into the yard of a machine that is assembling;
  //  2. build: when no pattern is wanted and the drone sits on its pad, it carries one cube
  //     straight to the building and slowly sets it. A build job is never interrupted; the drone
  //     flies home afterwards and only then may take pattern work.
  const DRONE_LANE = 0.5;
  const DRONE_HOVER = 2.4;
  const DRONE_SPACING = 1.15;

  function droneOwnerId(builder) {
    return -100 - builder.index;
  }

  function droneLane(builder) {
    return (builder.droneSlot % 6) * DRONE_LANE;
  }

  function droneSpeedValue(world) {
    return sessionValue('droneSpeed', world.campaign.purchases.droneSpeed) * machineFactor(world) / world.level.pace;
  }

  function droneMineSpot(builder, mine) {
    const angle = builder.droneSlot * 2.399;
    const radius = 1.2 + (builder.droneSlot % 3) * 0.45;
    return [mine.x + 0.5 + Math.cos(angle) * radius, DRONE_HOVER + droneLane(builder) * 0.6, mine.z + 0.5 + Math.sin(angle) * radius];
  }

  function beginDroneFlight(builder, world, target, purpose, cruise) {
    builder.phase = 'fly';
    builder.droneWork = null;
    builder.flyTarget = target;
    builder.flyPurpose = purpose;
    builder.flyCruise = Math.max(cruise, builder.cell[1], target[1]);
    builder.timer = 0;
    builder.actionT = 0;
  }

  function droneBaseCruise(builder) {
    return 3.4 + droneLane(builder);
  }

  // Cargo clears the site three floors above the highest cube built so far (checked once per leg).
  function droneHighCruise(builder, world, block) {
    let top = block ? block.y : 0;
    for (let i = 0; i < world.blocks.length; i++) {
      const other = world.blocks[i];
      if (other.built && other.y > top) top = other.y;
    }
    return top + 3 + droneLane(builder);
  }

  // Smooth flight: climb to the cruise lane, accelerate, brake on approach, then descend.
  function droneFlyStep(builder, world, dt) {
    const target = builder.flyTarget;
    const dx = target[0] - builder.cell[0];
    const dz = target[2] - builder.cell[2];
    const flat = Math.hypot(dx, dz);
    const maxSpeed = droneSpeedValue(world);
    const accel = maxSpeed / 0.6;
    const wantY = flat > 0.9 ? builder.flyCruise : target[1];
    const dy = wantY - builder.cell[1];
    const climb = Math.max(1.2, maxSpeed * 0.7) * dt;
    builder.cell[1] += Math.abs(dy) <= climb ? dy : Math.sign(dy) * Math.min(climb, Math.abs(dy) * 6 * dt + 0.01);
    const cleared = Math.abs(builder.cell[1] - wantY) < 0.6 || flat <= 0.9;
    const brake = Math.sqrt(2 * accel * flat) + 0.15;
    const wanted = cleared ? Math.min(maxSpeed, brake) : 0;
    if (builder.currentSpeed < wanted) builder.currentSpeed = Math.min(wanted, builder.currentSpeed + accel * dt);
    else builder.currentSpeed = Math.max(wanted, builder.currentSpeed - accel * 1.6 * dt);
    if (flat > 0.02) {
      const desired = Math.atan2(dx, dz);
      builder.heading += angleDelta(builder.heading, desired) * Math.min(1, dt * 5);
      const step = Math.min(flat, builder.currentSpeed * dt);
      builder.cell[0] += dx / flat * step;
      builder.cell[2] += dz / flat * step;
    }
    builder.from = builder.cell.slice();
    builder.to = builder.cell.slice();
    return flat < 0.06 && Math.abs(builder.cell[1] - target[1]) < 0.06;
  }

  // Keep flying drones from merging into one point.
  function separateDrone(builder, world, dt) {
    for (let i = 0; i < world.builders.length; i++) {
      const other = world.builders[i];
      if (other === builder || other.trade !== 'engineer') continue;
      const dx = builder.cell[0] - other.cell[0];
      const dy = builder.cell[1] - other.cell[1];
      const dz = builder.cell[2] - other.cell[2];
      const dist = Math.hypot(dx, dy * 1.6, dz);
      if (dist >= DRONE_SPACING) continue;
      const push = (DRONE_SPACING - dist) * Math.min(1, dt * 10);
      if (dist < 0.001) {
        builder.cell[0] += push * Math.cos(builder.droneSlot);
        builder.cell[2] += push * Math.sin(builder.droneSlot);
        continue;
      }
      builder.cell[0] += dx / dist * push;
      builder.cell[2] += dz / dist * push;
      builder.cell[1] += dy / dist * push * 0.5;
    }
  }

  function freePatternSlot(world) {
    for (let v = 0; v < world.vehicles.length; v++) {
      const vehicle = world.vehicles[v];
      if (vehicle.phase !== 'assemble') continue;
      for (let i = 0; i < vehicle.pattern.length; i++) {
        const item = vehicle.pattern[i];
        if (!item.done && item.worker === -1) return item;
      }
    }
    return null;
  }

  function startPatternJob(builder, world, slot) {
    slot.worker = builder.index;
    builder.droneJob = 'pattern';
    builder.yardSlot = slot;
    builder.droneBlock = slot.block;
    const mine = world.level.minesByMaterial[slot.block.materialId] || world.level.mines[0];
    beginDroneFlight(builder, world, droneMineSpot(builder, mine), 'mine', droneBaseCruise(builder));
  }

  // Keep one standby drone for machine patterns; active build jobs are never interrupted.
  function droneMayBuild(world) {
    let drones = 0;
    let building = 0;
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (builder.trade !== 'engineer') continue;
      drones += 1;
      if (builder.droneJob === 'build') building += 1;
    }
    return building < drones - (world.vehicles.length > 0 ? 1 : 0);
  }

  // Flying builders only set a cube that stands on a built cube or the ground, sits at most two
  // floors above the lowest unbuilt cube, and has nothing built above it in its column (no filling
  // gaps under existing cubes).
  function droneBuildCandidate(world) {
    const blocks = world.orderedBlocks;
    let lowest = Infinity;
    for (let i = 0; i < blocks.length; i++) {
      if (!blocks[i].built && blocks[i].y < lowest) lowest = blocks[i].y;
    }
    const top = world.level.footprint.maxY;
    let best = null;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.built || block.reserved || block.owner !== -1 || !block.ready || block.feature || block.poured > 0) continue;
      if (block.y >= lowest + 3) continue;
      if (best && block.y <= best.y) continue;
      if (block.failedNavSerial === world.navSerial) continue;
      if (block.y > 0 && !world.built.has(cellKey(block.x, block.y - 1, block.z))) continue;
      let covered = false;
      for (let y = block.y + 1; y <= top && !covered; y++) covered = world.built.has(cellKey(block.x, y, block.z));
      if (covered) continue;
      if (sealsOther(block, world, EMPTY_SET)) continue;
      best = block;
    }
    return best;
  }

  function startBuildJob(builder, world, block) {
    block.reserved = true;
    block.owner = droneOwnerId(builder);
    builder.droneJob = 'build';
    builder.droneBlock = block;
    builder.yardSlot = null;
    const mine = world.level.minesByMaterial[block.materialId] || world.level.mines[0];
    beginDroneFlight(builder, world, droneMineSpot(builder, mine), 'mine', droneBaseCruise(builder));
  }

  function droneGoHome(builder, world) {
    builder.droneJob = '';
    builder.yardSlot = null;
    builder.droneBlock = null;
    beginDroneFlight(builder, world, builder.homeCell.slice(), 'home', droneBaseCruise(builder));
  }

  function droneSetBlock(builder, world, block) {
    if (block.built) return;
    const pay = grantPlacePay(world, block, pourTotal(block) - block.poured);
    block.poured = pourTotal(block);
    block.built = true;
    block.reserved = false;
    block.owner = -1;
    world.built.add(cellKey(block.x, block.y, block.z));
    occupyBuiltBlock(block, world);
    refreshReadyAround(world, block.x, block.y, block.z);
    invalidateNav(world, block.x, block.y, block.z);
    pullOut(world, block, builder);
    world.remaining -= 1;
    cubeSet(world);
    world.foremanBuilt.push(block);
    world.stats.droneBlocks = (world.stats.droneBlocks || 0) + 1;
    world.constructionStallElapsed = 0;
    wakeVehicles(world);
    world.events.push({
      type: 'place',
      block: block,
      gained: pay.coins,
      capital: pay.capital,
      builder: builder.index,
      drone: true,
      lucky: pay.lucky,
      luckyMultiplier: pay.luckyMultiplier,
      capitalCoin: pay.capitalCoin,
    });
    if (world.remaining === 0) finishLevel(world);
  }

  function droneWorkRate(builder, world) {
    const campaign = world.campaign;
    return (builder.phase === 'pick'
      ? sessionValue('gather', campaign.purchases.gather) * campaign.metaPickupSpeed * droneWork(world, 'droneGather')
      : sessionValue('droneBuild', campaign.purchases.droneBuild) * campaign.metaPlaceSpeed * droneWork(world, 'machines', true)) / world.level.pace;
  }

  function beginDroneWork(builder, world, restored) {
    const mass = MATERIAL[builder.droneBlock.materialId].weight;
    const delay = builder.phase === 'pick' ? 0.6 : 0;
    // Old/restored phases may only have their elapsed and remaining timers. Recover the
    // completed work at their original rate, with the fixed pickup delay after the work.
    const duration = restored ? Math.max(0, builder.actionT + builder.timer - delay) : mass / droneWorkRate(builder, world);
    const elapsed = restored ? builder.actionT : 0;
    builder.droneWork = {
      phase: builder.phase,
      total: mass,
      remaining: mass * (1 - (duration > 0 ? Math.min(1, elapsed / duration) : 1)),
      workDuration: duration,
      delayTotal: delay,
      delay: Math.max(0, delay - Math.max(0, elapsed - duration)),
    };
  }

  function advanceDroneWork(builder, world, dt) {
    if (!builder.droneWork || builder.droneWork.phase !== builder.phase) beginDroneWork(builder, world, true);
    const work = builder.droneWork;
    const rate = droneWorkRate(builder, world);
    const done = Math.min(work.remaining, dt * rate);
    work.remaining -= done;
    work.delay = Math.max(0, work.delay - Math.max(0, dt - done / rate));
    builder.timer = work.remaining / rate + work.delay;
    // Project actual completed work onto the existing animation timer interface. Using
    // the initial phase weights keeps its fraction monotonic even when rates slow down.
    const elapsed = (1 - work.remaining / work.total) * work.workDuration + work.delayTotal - work.delay;
    const left = work.remaining / work.total * work.workDuration + work.delay;
    builder.actionT = left > 0 ? builder.timer * elapsed / left : work.workDuration + work.delayTotal;
  }

  function arriveDrone(builder, world) {
    const purpose = builder.flyPurpose;
    builder.currentSpeed = 0;
    if (purpose === 'home') {
      builder.phase = 'home';
      builder.wait = 0.2;
      return;
    }
    if (purpose === 'mine') {
      const block = builder.droneBlock;
      if (!block || block.built) {
        droneGoHome(builder, world);
        return;
      }
      builder.phase = 'pick';
      builder.carryMaterial = block.materialId;
      builder.carryColor = MATERIAL[block.materialId].color;
      builder.actionT = 0;
      beginDroneWork(builder, world, false);
      advanceDroneWork(builder, world, 0);
      return;
    }
    if (purpose === 'slot') {
      builder.phase = 'drop';
      builder.timer = 0.55;
      builder.actionT = 0;
      return;
    }
    if (purpose === 'block') {
      builder.phase = 'place';
      builder.actionT = 0;
      beginDroneWork(builder, world, false);
      advanceDroneWork(builder, world, 0);
    }
  }

  function updateEngineer(builder, world, dt) {
    if (builder.phase === 'fly') {
      if (droneFlyStep(builder, world, dt)) arriveDrone(builder, world);
      else separateDrone(builder, world, dt);
      return;
    }
    if (builder.phase === 'home') {
      builder.wait -= dt;
      if (builder.wait > 0) return;
      builder.wait = 0.3;
      if (world.remaining === 0) return;
      const slot = freePatternSlot(world);
      if (slot) {
        startPatternJob(builder, world, slot);
        return;
      }
      const block = droneMayBuild(world) ? droneBuildCandidate(world) : null;
      if (block) {
        startBuildJob(builder, world, block);
        return;
      }
      builder.wait = 1;
      return;
    }
    if (builder.phase === 'pick' || builder.phase === 'place') advanceDroneWork(builder, world, dt);
    else {
      builder.timer -= dt;
      builder.actionT += dt;
    }
    if (builder.droneJob === 'build') world.constructionStallElapsed = 0;
    if (builder.timer > 0) return;
    if (builder.phase === 'pick') {
      builder.carryingCube = true;
      builder.carryMaterial = builder.droneBlock.materialId;
      builder.carryColor = MATERIAL[builder.droneBlock.materialId].color;
      if (builder.droneJob === 'pattern') {
        const slot = builder.yardSlot;
        beginDroneFlight(builder, world, [slot.wx + 0.5, slot.wy + DRONE_HOVER, slot.wz + 0.5], 'slot', droneBaseCruise(builder));
      } else {
        const block = builder.droneBlock;
        beginDroneFlight(builder, world, [block.x + 0.5, block.y + DRONE_HOVER, block.z + 0.5], 'block', droneHighCruise(builder, world, block));
      }
      return;
    }
    if (builder.phase === 'drop') {
      const slot = builder.yardSlot;
      builder.carryingCube = false;
      let vehicle = null;
      for (let v = 0; v < world.vehicles.length; v++) {
        if (world.vehicles[v].pattern.indexOf(slot) >= 0) vehicle = world.vehicles[v];
      }
      if (vehicle) {
        slot.done = true;
        world.events.push({
          type: 'yardCube',
          vehicle: slot.vehicleIndex,
          x: slot.wx,
          y: slot.wy,
          z: slot.wz,
          materialId: slot.block.materialId,
        });
      }
      const next = freePatternSlot(world);
      if (next) startPatternJob(builder, world, next);
      else droneGoHome(builder, world);
      return;
    }
    if (builder.phase === 'place') {
      builder.carryingCube = false;
      droneSetBlock(builder, world, builder.droneBlock);
      droneGoHome(builder, world);
    }
  }

  function finishVehicleLoad(vehicle, world) {
    vehicle.mineQueue.shift();
    world.constructionStallElapsed = 0;
    if (vehicle.mineQueue.length > 0) {
      driveVehicleToNextMine(vehicle, world);
      return;
    }
    prepareVehiclePayload(vehicle);
    vehicle.payloadReady = true;
    if (!driveVehicleTo(vehicle, vehicle.parkingCell, 'park', world)) {
      releaseVehiclePlan(vehicle);
      driveVehicleHome(vehicle, world);
    }
  }

  function beginVehicleBuild(vehicle, world) {
    while (vehicle.plan.length > 0 && vehicle.plan[0].built) vehicle.plan.shift();
    if (vehicle.plan.length === 0) {
      releaseVehiclePlan(vehicle);
      driveVehicleHome(vehicle, world);
      return;
    }
    const block = vehicle.plan[0];
    if (!isSupported(block, world)) {
      releaseVehiclePlan(vehicle);
      driveVehicleHome(vehicle, world);
      return;
    }
    prepareVehiclePayload(vehicle);
    vehicle.payloadReady = true;
    vehicle.phase = 'build';
    const hook = vehicle.payloadHookBlock;
    const dx = hook.x - vehicle.cell[0];
    const dz = hook.z - vehicle.cell[2];
    const horizontalDistance = Math.hypot(dx, dz);
    vehicle.craneLiftSeconds =
      (vehicle.craneClearanceY - vehicle.craneStowedHookY) / VEHICLE.boomSpeed;
    vehicle.craneExtendSeconds = horizontalDistance / VEHICLE.boomSpeed;
    vehicle.craneLowerSeconds = VEHICLE.craneClearance / VEHICLE.boomSpeed;
    vehicle.craneDockSeconds = sessionValue('boomSpeed', world.campaign.purchases.boomSpeed) * vehicle.plan.length;
    vehicle.timer =
      vehicle.craneLiftSeconds +
      vehicle.craneExtendSeconds +
      vehicle.craneLowerSeconds +
      vehicle.craneDockSeconds;
    vehicle.buildDuration = vehicle.timer;
    vehicle.actionT = 0;
    vehicle.faceX = hook.x;
    vehicle.faceZ = hook.z;
  }

  function finishVehicleBuild(vehicle, world) {
    const plan = vehicle.plan.slice();
    const placed = [];
    let totalGained = 0;
    let totalCapital = 0;
    let luckyCount = 0;
    let luckyCoins = 0;
    let luckyMultiplier = 1;
    let capitalCoins = 0;
    for (let i = 0; i < plan.length; i++) {
      const block = plan[i];
      if (block.built || block.owner !== vehicle.ownerId) continue;
      const pay = grantPlacePay(world, block, pourTotal(block));
      const gained = pay.coins;
      if (pay.lucky) {
        luckyCount += 1;
        luckyCoins += gained;
        luckyMultiplier = pay.luckyMultiplier;
      }
      if (pay.capitalCoin) capitalCoins += 1;
      block.poured = pourTotal(block);
      block.built = true;
      block.reserved = false;
      block.owner = -1;
      totalGained += gained;
      totalCapital += pay.capital;
      world.built.add(cellKey(block.x, block.y, block.z));
      occupyBuiltBlock(block, world);
      world.remaining -= 1;
      cubeSet(world);
      world.foremanBuilt.push(block);
      world.stats.vehicleBlocks += 1;
      placed.push(block);
    }
    if (placed.length > 0) {
      refreshReadyBatch(world, placed);
      invalidateNavBatch(world, placed);
      pullOutBatch(world, placed);
      wakeVehicles(world);
      world.events.push({
        type: 'vehiclePlaceBatch',
        blocks: placed,
        gained: totalGained,
        capital: totalCapital,
        luckyCount: luckyCount,
        luckyCoins: luckyCoins,
        luckyMultiplier: luckyMultiplier,
        capitalCoins: capitalCoins,
      });
      world.constructionStallElapsed = 0;
    }
    vehicle.currentBlock = null;
    vehicle.payloadReady = false;
    vehicle.carried = false;
    vehicle.plan.length = 0;
    vehicle.pattern = [];
    vehicle.yard = null;
    world.events.push({ type: 'yardClear', vehicle: vehicle });
    if (world.remaining === 0) {
      releaseVehiclePlan(vehicle);
      vehicle.phase = 'idle';
      vehicle.timer = 0.5;
      finishLevel(world);
      return;
    }
    if (vehicle.kind !== 'heli') {
      beginCrane(vehicle, world, 'fold', craneStow(), false);
      return;
    }
    beginVehicleBuild(vehicle, world);
  }

  function driveRate(vehicle, world) {
    if (vehicle.kind === 'heli') return sessionValue('heliSpeed', world.campaign.purchases.heliSpeed) * machineFactor(world);
    return sessionValue('loaderSpeed', world.campaign.purchases.loaderSpeed) * machineFactor(world);
  }

  function angleDelta(from, to) {
    let diff = to - from;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  function moveSpeed(vehicle, world, dt, desiredHeading) {
    if (!vehicle.headingReady) {
      vehicle.heading = desiredHeading;
      vehicle.headingReady = true;
    }
    const diff = angleDelta(vehicle.heading, desiredHeading);
    const maxTurn = (Math.PI / 2) / TUNING.machines.turnSeconds * dt;
    if (diff > maxTurn) vehicle.heading += maxTurn;
    else if (diff < -maxTurn) vehicle.heading -= maxTurn;
    else vehicle.heading += diff;
    const max = driveRate(vehicle, world);
    const accel = max / TUNING.machines.accelSeconds;
    const stillTurning = Math.abs(angleDelta(vehicle.heading, desiredHeading)) > TUNING.machines.turnAlign;
    if (stillTurning) vehicle.currentSpeed -= accel * dt;
    else vehicle.currentSpeed += accel * dt;
    if (vehicle.currentSpeed > max) vehicle.currentSpeed = max;
    if (vehicle.currentSpeed < 0) vehicle.currentSpeed = 0;
    return vehicle.currentSpeed;
  }

  function advanceVehicleDrive(vehicle, world, dt) {
    // At a corner the vehicle stops on its cell and turns toward the next waypoint before moving on.
    const waiting = vehicle.segmentT >= 1 && vehicle.pathIndex < vehicle.path.length - 1;
    const aim = waiting ? vehicle.path[vehicle.pathIndex + 1] : vehicle.to;
    const base = waiting ? vehicle.cell : vehicle.from;
    const desired = Math.atan2(aim[0] - base[0], aim[2] - base[2]);
    const rate = moveSpeed(vehicle, world, dt, desired);
    vehicle.faceX = vehicle.cell[0] + Math.sin(vehicle.heading);
    vehicle.faceZ = vehicle.cell[2] + Math.cos(vehicle.heading);
    if (waiting) {
      if (Math.abs(angleDelta(vehicle.heading, desired)) > 0.35) return;
      vehicle.from = vehicle.cell.slice();
      vehicle.to = aim.slice();
      vehicle.segmentT = 0;
    }
    if (rate <= 0) return;
    let left = dt;
    while (left > 0 && vehicle.phase === 'drive') {
      if (!vehicleCanDrive(vehicle.to[0], vehicle.to[2], world)) {
        const path = vehicleRoute(vehicle.cell, vehicle.driveTarget, world);
        if (!path) {
          releaseVehiclePlan(vehicle);
          driveVehicleHome(vehicle, world);
          return;
        }
        beginVehicleDrive(vehicle, path, vehicle.drivePurpose, vehicle.driveTarget);
        return;
      }
      const length = Math.hypot(vehicle.to[0] - vehicle.from[0], vehicle.to[2] - vehicle.from[2]) || 1;
      const remain = (1 - vehicle.segmentT) * length / rate;
      if (left < remain) {
        vehicle.segmentT += left * rate / length;
        return;
      }
      left -= remain;
      vehicle.segmentT = 1;
      vehicle.cell = vehicle.to.slice();
      vehicle.pathIndex += 1;
      world.constructionStallElapsed = 0;
      if (vehicle.pathIndex >= vehicle.path.length - 1) {
        vehicle.to = vehicle.cell.slice();
        arriveVehicle(vehicle);
        return;
      }
      const next = vehicle.path[vehicle.pathIndex + 1];
      const nextHeading = Math.atan2(next[0] - vehicle.cell[0], next[2] - vehicle.cell[2]);
      if (Math.abs(angleDelta(vehicle.heading, nextHeading)) > 0.35) return;
      vehicle.from = vehicle.cell.slice();
      vehicle.to = next.slice();
      vehicle.segmentT = 0;
      vehicle.faceX = vehicle.to[0];
      vehicle.faceZ = vehicle.to[2];
    }
  }

  function updateVehicle(vehicle, world, dt) {
    if (vehicle.phase === 'drive') {
      advanceVehicleDrive(vehicle, world, dt);
      return;
    }
    if (vehicle.phase === 'fetch' || vehicle.phase === 'fly' || vehicle.phase === 'return') {
      advanceHeli(vehicle, world, dt);
      return;
    }
    if (vehicle.phase === 'cooldown') {
      vehicle.timer -= dt;
      if (vehicle.timer > 0) return;
      requestVehiclePlan(vehicle, world);
      return;
    }
    if (vehicle.phase === 'hook' || vehicle.phase === 'lift' || vehicle.phase === 'lower' || vehicle.phase === 'fold') {
      advanceHookPhase(vehicle, world, dt);
      return;
    }
    if (vehicle.phase === 'idle' &&
        world.vehicleNoWorkSerial === world.vehicleWorkSerial) return;
    vehicle.timer -= dt;
    vehicle.actionT += dt;
    if (vehicle.timer > 0) {
      if (vehicle.phase === 'load' || vehicle.phase === 'build') world.constructionStallElapsed = 0;
      return;
    }
    if (vehicle.phase === 'load') finishVehicleLoad(vehicle, world);
    else if (vehicle.phase === 'build' || vehicle.phase === 'fly') finishVehicleBuild(vehicle, world);
    else if (vehicle.phase === 'assemble') checkPattern(vehicle, world);
    else requestVehiclePlan(vehicle, world);
  }

  function beginWalk(builder, path, purpose, world) {
    builder.walkPurpose = purpose;
    builder.path = path;
    builder.pathIndex = 0;
    builder.from = path[0].slice();
    builder.cell = path[0].slice();
    if (path.length === 1) {
      builder.to = path[0].slice();
      builder.segmentT = 1;
      arrive(builder, world);
      return;
    }
    builder.phase = 'walk';
    builder.to = path[1].slice();
    builder.segmentT = 0;
    builder.faceX = builder.to[0];
    builder.faceZ = builder.to[2];
  }

  function arrive(builder, world) {
    // The first walk after a smoke ends here: the way back is over.
    if (builder.walkPurpose !== 'smoke') builder.fromSmoke = false;
    builder.cell = builder.to.slice();
    builder.from = builder.cell.slice();
    builder.segmentT = 1;
    if (builder.walkPurpose === 'campFetch') {
      beginCampFetch(builder, world);
      return;
    }
    if (builder.walkPurpose === 'kitchen') {
      builder.walkPurpose = '';
      builder.phase = 'kitchen';
      if (world.canteen) {
        builder.faceX = world.canteen.x + Math.floor(world.canteen.w / 2);
        builder.faceZ = world.canteen.z;
      }
      return;
    }
    if (builder.walkPurpose === 'mine') {
      const group = builder.mineQueue[0];
      builder.phase = 'mine';
      // Picking up goes by mass, like placing: every mini-cube of the group weighs one cell.
      let mass = 0;
      for (let i = 0; i < group.blocks.length; i++) mass += MATERIAL[group.blocks[i].materialId].cell;
      builder.timer = workSeconds(
        builder,
        mass * world.level.pace / (sessionValue('pickup', world.campaign.purchases.pickup) * world.campaign.metaPickupSpeed)
      ) / dishBoost(builder, 'pickup');
      builder.actionT = 0;
      builder.faceX = group.mine.x;
      builder.faceZ = group.mine.z;
      return;
    }
    if (builder.walkPurpose === 'erect') {
      const piece = builder.erectPiece;
      builder.phase = 'erect';
      builder.timer = workSeconds(builder, erectSeconds(piece, world));
      builder.actionT = 0;
      builder.faceX = piece.x;
      builder.faceZ = piece.z;
      return;
    }
    // A grand dinner seats everyone.
    if (builder.walkPurpose === 'meal' && builder.mealPlace === 'canteen' && !builder.grandDue && canteenEating(world) >= canteenSeats(world)) {
      // Every seat is taken: back to work, still hungry.
      builder.mealPlace = '';
      builder.needTrip = '';
      builder.awayCell = null;
      world.canteen.turnedAway += 1;
      world.events.push({ type: 'canteenFull', builder: builder });
      root.MicroBuildersWorkerLog.record(builder, world, 'В столовой нет мест; вернулся к работе голодным');
      beginExit(builder, world);
      return;
    }
    if (builder.walkPurpose === 'meal') {
      builder.phase = 'meal';
      // «Быстрый обед»: any meal a second shorter a level (not under 5 s).
      builder.timer = Math.max(5, (builder.mealPlace === 'canteen' ? canteenMealSeconds(world) : BALANCE.mealSeconds) - lineValue(world.campaign, 'mealFast'));
      builder.actionT = 0;
      builder.faceX = builder.cell[0];
      // At the canteen he faces its door.
      builder.faceZ = builder.cell[2] + (builder.mealPlace === 'canteen' ? -1 : 1);
      return;
    }
    if (builder.walkPurpose === 'sleep') {
      builder.phase = 'break';
      builder.breakKind = 'sleep';
      builder.sleepFrom = builder.fatigue;
      // «Здоровый сон»: a second shorter a level.
      builder.sleepTotal = Math.max(60, sleepSeconds() * (builder.sleepPlace === 'dorm' ? dormSleepScale(world.campaign) : 1) - lineValue(world.campaign, 'sleepFast'));
      builder.timer = builder.sleepTotal;
      builder.actionT = 0;
      builder.faceX = builder.cell[0];
      builder.faceZ = builder.cell[2] + 1;
      return;
    }
    if (builder.walkPurpose === 'smoke' && builder.smokePlace === 'lounge' && loungeSmokers(world) >= loungeSeats(world)) {
      // Every seat at the lounge is taken: off to the usual spot off the site instead.
      builder.smokePlace = '';
      if (world.lounge) world.lounge.turnedAway += 1;
      world.events.push({ type: 'loungeFull', builder: builder });
      root.MicroBuildersWorkerLog.record(builder, world, 'В зоне отдыха нет мест; пошёл курить на обычное место');
      // No way to a spot from here: he smokes where he stands.
      if (startSmokeOverflow(builder, world)) return;
    }
    if (builder.walkPurpose === 'smoke') {
      const lounge = builder.smokePlace === 'lounge';
      builder.phase = 'break';
      builder.breakKind = 'smoke';
      builder.timer = smokeDuration(world.campaign) * (1 + SMOKING.habitDuration * (builder.habit || 0)) *
        (1 + SMOKING.chat * Math.min(SMOKING.chatMax, smokeCompanions(builder, world))) *
        (lounge ? LOUNGE.smokeScale || 1 : 1);
      builder.actionT = 0;
      builder.faceX = builder.cell[0];
      // At the lounge he faces it.
      builder.faceZ = builder.cell[2] + (lounge ? -1 : 1);
      return;
    }
    if (builder.walkPurpose === 'out') {
      beginPlanning(builder);
      return;
    }
    if (builder.walkPurpose === 'recover') {
      builder.escapeKind = '';
      if (builder.unwall) {
        builder.unwall = false;
        builder.phase = 'idle';
        builder.wait = 0;
        requestWork(builder, world);
        return;
      }
      beginPlanning(builder);
      return;
    }
    if (builder.walkPurpose === 'route') {
      builder.phase = 'idle';
      builder.wait = 0;
      requestWork(builder, world);
      return;
    }
    if (builder.walkPurpose === 'taxi') {
      builder.walkPurpose = '';
      reachTaxi(builder, world);
      return;
    }
    const block = builder.carry[0];
    if (!block || (!block.built && !canPlaceHere(builder, block, world))) {
      cancelRoute(builder, world);
      continueAfterPlace(builder, world);
      return;
    }
    builder.phase = 'place';
    builder.actionT = 0;
    builder.faceX = block.x;
    builder.faceZ = block.z;
    builder.timer = block.poured >= pourTotal(block) ? 0 : builderPlaceSeconds(builder, world, block);
  }

function segmentSpeed(from, to, world) {
  const walk = segmentWalkSpeed(from, to, world);
  const climb = climbSpeedNow(world);
  const vertical = from[0] === to[0] && from[2] === to[2];
  if (vertical) return climb;
  // Onto a cube: walk up to its face, climb it, step on — the honest sum, no diagonal. Off a cube
  // he jumps down: the drop takes half the climb's time.
  if (from[1] !== to[1]) return 1 / (1 / walk + Math.abs(to[1] - from[1]) / (to[1] > from[1] ? climb : climb * JUMP_DOWN));
  return walk;
}

// Soft speed cap (balance.json → tuning.builders: walkSoftCap, climbSoftCap, softCapPower): the
// session upgrade × meta × foremen counts in full up to the threshold T, above it only as a root —
// T · (v / T)^power (T = 8, power 0,5: 16 → 11,3, 32 → 16). Weather, decks, the level's pace and a
// worker's own boosts (dish, rank, «Кладовщик») multiply after it. The same as sim.js → softCap.
function softCap(value, threshold) {
  if (!(threshold > 0) || !(value > threshold)) return value;
  return threshold * Math.pow(value / threshold, BALANCE.softCapPower || 0.5);
}

// Cells per second on flat ground and on a climb (ladder, cube face), with meta, weather and foremen.
// Snow slows the flat walking only (campaign.environmentWalkMultiplier).
function walkSpeedNow(world) {
  const campaign = world.campaign;
  const own = sessionValue('horizontal', campaign.purchases.horizontal) * campaign.metaMovement * campaign.foremanRush;
  return softCap(own, BALANCE.walkSoftCap) *
    campaign.environmentMoveMultiplier * (campaign.environmentWalkMultiplier || 1) / world.level.pace;
}

// Up on the building — cubes and decks, level y ≥ 1 — he walks slower than on the ground, and the
// higher, the more careful: deckWalk (×0,8) × (1 − deckFloorStep (4 %))^y. Snow adds its own deck
// share and floor penalty (ice: campaign.environmentDeckMultiplier, environmentFloorStep). The same
// as sim.js → deckFactor.
function deckFactor(world, y) {
  // «Уверенный шаг» (advanced): up on the building as on the ground.
  if (y <= 0 || advancedOwned(world.campaign, 'advDeck')) return 1;
  const campaign = world.campaign;
  const factor = BALANCE.deckWalk * (campaign.environmentDeckMultiplier || 1) *
    Math.pow(1 - BALANCE.deckFloorStep - (campaign.environmentFloorStep || 0), y);
  // «Уверенные настилы»: takes that share of the deck penalty away (all of it at the last level).
  return factor + (1 - factor) * Math.min(1, lineValue(campaign, 'deckWalk'));
}

// The flat part of a step, at the higher of its two levels.
function segmentWalkSpeed(from, to, world) {
  return walkSpeedNow(world) * deckFactor(world, Math.max(from[1], to[1]));
}

function climbSpeedNow(world) {
  const campaign = world.campaign;
  const own = sessionValue('vertical', campaign.purchases.vertical) * campaign.metaMovement * campaign.foremanRush * campaign.metaClimb;
  return softCap(own, BALANCE.climbSoftCap) * campaign.environmentMoveMultiplier * advancedValue(campaign, 'advClimb', 1) / world.level.pace;
}

// Jumping off a cube is this many times faster than climbing it.
const JUMP_DOWN = 2;

// View: where a walking builder is within its segment. A step onto or off a cube is three parts in
// time — walk to the face (feet stay at the lower height going up, at the upper height going down),
// climb straight up or down at the face, then walk onto the cell — so nobody slides diagonally.
// Writes into `out` {x, y, z, mode: 'walk' | 'climb' | 'descend' | 'ladder' | 'ride', climb: 0..1}.
const FACE_GAP = 0.24;
function builderPosition(builder, world, out) {
  const from = builder.from;
  const to = builder.to;
  const t = builder.segmentT;
  out.climb = 0;
  if (builder.phase !== 'walk' || t >= 1) {
    out.x = to[0]; out.y = to[1]; out.z = to[2]; out.mode = 'walk';
    if (builder.phase !== 'walk') { out.x = builder.cell[0]; out.y = builder.cell[1]; out.z = builder.cell[2]; }
    return out;
  }
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  if (dy === 0 || (dx === 0 && dz === 0)) {
    out.x = from[0] + dx * t; out.y = from[1] + dy * t; out.z = from[2] + dz * t;
    out.mode = dy === 0 ? 'walk' : 'ladder';
    out.climb = dy === 0 ? 0 : t;
    return out;
  }
  const flat = 1 / segmentWalkSpeed(from, to, world);
  const rise = Math.abs(dy) / (dy > 0 ? climbSpeedNow(world) : climbSpeedNow(world) * JUMP_DOWN);
  const total = flat + rise;
  let u;
  if (dy > 0) {
    // Up: he stops just short of the face, climbs straight up it, then steps onto the cell.
    const reach = 0.5 - FACE_GAP;
    const a = flat * reach / total;
    const b = a + rise / total;
    if (t < a) {
      u = reach * t / a;
      out.y = from[1];
      out.mode = 'walk';
    } else if (t < b) {
      u = reach;
      out.climb = (t - a) / (b - a);
      out.y = from[1] + dy * out.climb;
      out.mode = 'climb';
    } else {
      u = reach + (1 - reach) * (t - b) / (1 - b);
      out.y = to[1];
      out.mode = 'walk';
    }
  } else {
    // Down: he walks to the edge and jumps off, travelling FACE_GAP forward in the air (that bit's
    // walking time is part of the jump), then walks on at his usual pace.
    const a = flat * 0.5 / total;
    const b = a + (rise + flat * FACE_GAP) / total;
    if (t < a) {
      u = 0.5 * t / a;
      out.y = from[1];
      out.mode = 'walk';
    } else if (t < b) {
      out.climb = (t - a) / (b - a);
      u = 0.5 + FACE_GAP * out.climb;
      out.y = from[1] + dy * out.climb;
      out.mode = 'descend';
    } else {
      u = 0.5 + FACE_GAP + (0.5 - FACE_GAP) * (t - b) / (1 - b);
      out.y = to[1];
      out.mode = 'walk';
    }
  }
  out.x = from[0] + dx * u;
  out.z = from[2] + dz * u;
  return out;
}

  function canFollowPathStep(builder, from, to, world) {
    if (!world.index.inside(to[0], to[1], to[2])) return false;
    const nextId = world.index.id(to[0], to[1], to[2]);
    if (builder.walkPurpose === 'recover' &&
        Math.abs(from[0] - to[0]) + Math.abs(from[1] - to[1]) + Math.abs(from[2] - to[2]) === 1 &&
        (world.solidGrid[nextId] === 1 || canStand(to[0], to[1], to[2], world))) {
      return true;
    }
    const neighbors = standNeighbors(from[0], from[1], from[2], world);
    for (let i = 0; i < neighbors.length; i++) {
      if (neighbors[i] === nextId) return true;
    }
    return false;
  }

  function replanWalk(builder, world) {
    let path = null;
    if (builder.walkPurpose === 'mine') {
      const group = builder.mineQueue[0];
      path = findPathToCell(builder.cell, [group.mine.standX, group.mine.standY, group.mine.standZ], world);
    } else if (builder.walkPurpose === 'erect') {
      const piece = builder.erectPiece;
      const stands = piece.deck ? deckErectStands(piece, world) : mastErectStands(piece, world);
      path = findPath(builder.cell, stands, world);
    } else if (builder.walkPurpose === 'route') {
      const route = builder.routeId >= 0 ? world.routes[builder.routeId] : null;
      if (route && !route.complete && route.stepIndex < route.steps.length) {
        path = findPathToCell(builder.cell, route.steps[route.stepIndex].cell, world);
      }
    } else if (builder.walkPurpose === 'taxi') {
      if (builder.taxi) path = findPathToCell(builder.cell, taxiBoardCell(world, builder.taxi), world);
    } else if (builder.walkPurpose === 'meal' || builder.walkPurpose === 'smoke' || builder.walkPurpose === 'sleep') {
      path = findPathToCell(builder.cell, builder.awayCell, world);
    } else if (builder.walkPurpose === 'campFetch') {
      // On to the camp stack: the way home would end the walk there, and he would pick the cubes
      // from the spawn.
      path = findPathToCell(builder.cell, builder.path[builder.path.length - 1], world);
    } else {
      const spawn = world.level.spawnPoints[builder.index % world.level.spawnPoints.length];
      path = findPathToCell(builder.cell, spawn, world);
    }
    if (path) {
      beginWalk(builder, path, builder.walkPurpose, world);
      return;
    }
    rerouteOrAbandon(builder, world, 'Повторный поиск пути не нашёл маршрут');
  }

  // A blocked walk on a route or on the way home: lay a fresh way from here — to the cubes still in
  // hand (requestRoute, scaffolds and passages included) or home — instead of dropping the load.
  // A few tries in a row without a single step made fall back to the old recovery.
  const REROUTE_TRIES = 3;
  function rerouteOrAbandon(builder, world, reason) {
    if (sealCommittedCube(builder, world)) return;
    const purpose = builder.walkPurpose;
    if (purpose === 'taxi') leaveTaxi(builder);
    if ((purpose === 'route' || purpose === 'taxi' || purpose === 'out' || purpose === 'recover') && (builder.reroutes || 0) < REROUTE_TRIES) {
      builder.reroutes = (builder.reroutes || 0) + 1;
      cancelRoute(builder, world);
      builder.path = null;
      builder.walkPurpose = '';
      builder.phase = 'idle';
      builder.wait = 0;
      requestWork(builder, world);
      return;
    }
    builder.reroutes = 0;
    abandonJobAndRecover(builder, world, reason, 'path');
  }

  function advanceWalk(builder, world, dt) {
    let left = dt;
    let guard = 0;
    const overload = carryOverload(builder, world);
    while (left > 0 && builder.phase === 'walk' && guard < 16) {
      guard += 1;
      if (builder.segmentT === 0 && sameCell(builder.from, builder.to)) {
        builder.segmentT = 1;
      }
      if (builder.segmentT === 0 && !canFollowPathStep(builder, builder.from, builder.to, world)) {
        builder.blockedWalkAttempts += 1;
        if (builder.blockedWalkAttempts >= 2) {
          rerouteOrAbandon(builder, world, 'Путь дважды заблокирован в начале шага');
          return;
        }
        replanWalk(builder, world);
        return;
      }
      const speed = segmentSpeed(builder.from, builder.to, world) /
        overload * haulFactor(builder, world) * (builder.timeEfficiency || 1) * dishMove(builder, world) * smokeWalk(builder, world);
      const remain = (1 - builder.segmentT) / speed;
      if (left < remain) {
        builder.segmentT += left * speed;
        builder.blockedWalkAttempts = 0;
        builder.faceX = builder.to[0];
        builder.faceZ = builder.to[2];
        return;
      }
      left -= remain;
      builder.segmentT = 1;
      builder.cell = builder.to.slice();
      wearScaffold(builder, world);
      builder.blockedWalkAttempts = 0;
      builder.reroutes = 0;
      world.constructionStallElapsed = 0;
      builder.pathIndex += 1;
      // A step done: a smoke (his own or a call) may turn him off the way.
      if ((builder.smokeCall || builder.smokeNeed >= builder.smokeThreshold) && divertToSmoke(builder, world)) return;
      if (builder.pathIndex >= builder.path.length - 1) {
        builder.to = builder.cell.slice();
        arrive(builder, world);
        return;
      }
      builder.from = builder.to.slice();
      const next = builder.path[builder.pathIndex + 1];
      if (!canFollowPathStep(builder, builder.from, next, world)) {
        builder.blockedWalkAttempts += 1;
        if (builder.blockedWalkAttempts >= 2) {
          rerouteOrAbandon(builder, world, 'Следующая клетка пути дважды заблокирована');
          return;
        }
        replanWalk(builder, world);
        return;
      }
      builder.to = next.slice();
      builder.segmentT = 0;
      builder.faceX = builder.to[0];
      builder.faceZ = builder.to[2];
    }
  }

  // «Дорожки на перекур»: faster on the way to a smoke and back — only the trip, no buff after it.
  function smokeWalk(builder, world) {
    return builder.walkPurpose === 'smoke' || builder.fromSmoke ? campBoost(world.campaign, 'smokePath') : 1;
  }

  // Dish on the move: «Крепкий чай» for a climb or a ladder, «Макароны по-флотски» on the flat.
  function dishMove(builder, world) {
    const campaign = world.campaign;
    const flat = builder.from[1] === builder.to[1];
    let factor = 1;
    if (builder.dish) {
      // «Горячий сбитень» (snow) halves the snow's slowdown of walking; «Кофе ночной смены» the night's.
      if (flat && seasonOn(builder, campaign, 'snow')) factor *= halfRelief(campaign.environmentWalkMultiplier || 1);
      if (seasonOn(builder, campaign, 'night')) factor *= halfRelief(campaign.environmentNightMove || 1);
      // «Гарнир «Высотник»»: up on the decks half the penalty.
      if (flat && builder.from[1] > 0 && ateDish(builder, function (dish) { return dish.effect === 'deck'; })) factor *= halfRelief(deckFactor(world, builder.from[1]));
    }
    return factor * (flat ? dishBoost(builder, 'walk') : dishBoost(builder, 'climb'));
  }

  function releaseUnpicked(builder) {
    for (let i = 0; i < builder.mineQueue.length; i++) {
      const blocks = builder.mineQueue[i].blocks;
      for (let j = 0; j < blocks.length; j++) {
        if (!blocks[j].built && blocks[j].owner !== builder.index) blocks[j].reserved = false;
      }
    }
    builder.mineQueue = [];
  }

  function findPathToCell(cell, target, world) {
    if (!world.index.inside(target[0], target[1], target[2])) return null;
    world.singleGoal[0] = world.index.id(target[0], target[1], target[2]);
    return findPath(cell, world.singleGoal, world);
  }

  function walkToNextMine(builder, world) {
    const group = builder.mineQueue[0];
    const stand = [group.mine.standX, group.mine.standY, group.mine.standZ];
    const path = findPathToCell(builder.cell, stand, world);
    if (!path) {
      root.MicroBuildersWorkerLog.record(builder, world, 'Не найден путь к карьеру; текущая ходка отменена');
      releaseUnpicked(builder);
      builder.carry.sort(function (a, b) {
        const ownedA = a.owner === builder.index ? 0 : 1;
        const ownedB = b.owner === builder.index ? 0 : 1;
        return ownedA - ownedB || a.priority - b.priority || a.id - b.id;
      });
      touchCarry(builder);
      if (builder.carry.length > 0) {
        requestWork(builder, world);
        return;
      }
      beginExit(builder, world);
      return;
    }
    beginWalk(builder, path, 'mine', world);
  }

  function clearScaffolds(world) {
    for (let i = 0; i < world.scaffoldPieces.length; i++) {
      const piece = world.scaffoldPieces[i];
      piece.reserved = false;
      piece.built = false;
      piece.removed = true;
      resetWear(piece, world);
      world.mastGrid[world.index.id(piece.x, piece.y, piece.z)] = 0;
    }
    for (let i = 0; i < world.scaffoldDecks.length; i++) {
      const deck = world.scaffoldDecks[i];
      deck.reserved = false;
      deck.built = false;
      deck.removed = true;
      resetWear(deck, world);
      world.deckGrid[world.index.id(deck.x, deck.y, deck.z)] = 0;
    }
    world.events.push({ type: 'strip' });
  }

  function finishLevel(world) {
    if (world.completed || world.remaining > 0) return;
    clearScaffolds(world);
    world.completed = true;
    world.campaign.status = 'complete';
    if (world.campaign.runMode !== 'hq') {
      world.campaign.levelTimes.push(world.campaign.levelElapsed);
      world.campaign.levelStats[world.level.index] = {
        ladders: world.stats.ladders,
        decks: world.stats.decks,
        additionalDoors: world.stats.additionalDoors,
        verticalHatches: world.stats.verticalHatches,
        vehicleBlocks: world.stats.vehicleBlocks,
      };
    }
    world.events.push({ type: 'complete' });
  }

  function hasActiveConstruction(world) {
    for (let i = 0; i < world.vehicles.length; i++) {
      const vehicle = world.vehicles[i];
      if (vehicle.plan.length > 0 || vehicle.mineQueue.length > 0) return true;
      if (vehicle.phase === 'drive' || vehicle.phase === 'load' || vehicle.phase === 'build' ||
          vehicle.phase === 'assemble' || vehicle.phase === 'fetch' || vehicle.phase === 'fly' ||
          vehicle.phase === 'return' || vehicle.phase === 'cooldown' ||
          vehicle.phase === 'hook' || vehicle.phase === 'lift' || vehicle.phase === 'lower' ||
          vehicle.phase === 'fold') return true;
    }
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (builder.trade === 'engineer') {
        if (builder.droneJob === 'build') return true;
        continue;
      }
      if (builder.camp) continue;
      if (builder.carry.length > 0) return true;
      if (builder.mineQueue.length > 0 || builder.erectPiece || builder.routeId >= 0) return true;
      if (builder.phase === 'recover') return true;
      if (builder.phase !== 'idle' &&
          builder.phase !== 'plan' &&
          builder.walkPurpose !== 'out') return true;
    }
    for (let i = 0; i < world.orderedBlocks.length; i++) {
      const block = world.orderedBlocks[i];
      if (block.owner >= 0 && !block.built) return true;
    }
    return false;
  }

  function occupyBuiltBlock(block, world) {
    if (block.glassOf !== undefined) return;
    if (block.feature) Features.occupy(block, world);
    else world.solidGrid[world.index.id(block.x, block.y, block.z)] = 1;
  }

  function autoCompleteUnreachable(world) {
    const blocks = [];
    for (let i = 0; i < world.blocks.length; i++) {
      const block = world.blocks[i];
      if (block.built) continue;
      block.built = true;
      block.reserved = false;
      block.owner = -1;
      world.built.add(cellKey(block.x, block.y, block.z));
      occupyBuiltBlock(block, world);
      const pay = grantPlacePay(world, block, pourTotal(block) - block.poured);
      block.capitalPay = pay.capital;
      blocks.push(block);
    }
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      builder.carry = builder.carry.filter(function (block) { return !block.built; });
      touchCarry(builder);
    }
    world.autoCompleted = blocks.length;
    world.remaining = 0;
    let capital = 0;
    for (let i = 0; i < blocks.length; i++) capital += blocks[i].capitalPay;
    world.events.push({ type: 'autofill', blocks: blocks, capital: capital });
    finishLevel(world);
  }

  // No whole cube set for a while: if what is left can never stand (floating islands — levels 30, 32
  // and 35 have some), it is finished. The stall timer of resolveConstructionStall cannot see this:
  // every walk, meal and break sets it back to zero, so with a crew that eats and smokes it never ran
  // out and such a site hung at its last cubes. (A long trip to the top may well set no cube for a
  // minute, so a sliver that can still be built is left to the crew.)
  const LEFTOVER_ISLAND_SECONDS = 30;
  function finishLeftovers(world) {
    if (world.remaining <= 0 || world.campaign.status !== 'play' || !(world.noCubeElapsed >= LEFTOVER_ISLAND_SECONDS)) return;
    // The support search is a sweep of the grid: once a stretch.
    if (world.noCubeElapsed - (world.leftoverChecked || 0) < LEFTOVER_ISLAND_SECONDS) return;
    world.leftoverChecked = world.noCubeElapsed;
    if (unbuildableBlocks(world).length === world.remaining) autoCompleteUnreachable(world);
  }

  function resolveConstructionStall(world) {
    if (world.remaining === 0) return;
    if (hasActiveConstruction(world)) {
      if (world.constructionStallElapsed < BALANCE.constructionStallSeconds) return;
      for (let i = 0; i < world.vehicles.length; i++) {
        const vehicle = world.vehicles[i];
        if (vehicle.plan.length === 0 &&
            vehicle.mineQueue.length === 0 &&
            vehicle.phase !== 'drive' &&
            vehicle.phase !== 'load' &&
            vehicle.phase !== 'build') continue;
        releaseVehiclePlan(vehicle);
        driveVehicleHome(vehicle, world);
      }
      for (let i = 0; i < world.builders.length; i++) {
        const builder = world.builders[i];
        if (builder.trade === 'engineer' || builder.camp) continue;
        if (builder.carry.length === 0 &&
            builder.mineQueue.length === 0 &&
            !builder.erectPiece &&
            builder.routeId < 0 &&
            (builder.phase === 'idle' ||
             builder.phase === 'plan' ||
             builder.walkPurpose === 'out')) continue;
        if (sealCommittedCube(builder, world)) continue;
        abandonJobAndRecover(builder, world, 'Строительство не продвинулось ' + BALANCE.constructionStallSeconds + ' секунд', 'stall');
      }
      world.constructionStallElapsed = 0;
      return;
    }
    if (world.constructionStallElapsed < BALANCE.constructionStallSeconds) return;
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (builder.phase === 'walk' || builder.phase === 'recover') return;
    }
    for (let i = 0; i < world.vehicles.length; i++) {
      if ((world.vehicles[i].phase === 'plan' || world.vehicles[i].phase === 'idle') &&
          world.constructionStallElapsed < BALANCE.constructionStallSeconds) return;
    }
    // Only floating islands are left (nothing can ever support them), or just a sliver of the
    // building: finish it so the site never hangs.
    if (world.remaining / world.blocks.length < BALANCE.unreachableCompletionRatio ||
        unbuildableBlocks(world).length === world.remaining) {
      autoCompleteUnreachable(world);
      return;
    }
    if (world.campaign.runMode !== 'contract' && world.campaign.runMode !== 'school') {
      world.constructionStallElapsed = 0;
      return;
    }
    world.blocked = true;
    world.campaign.status = 'blocked';
    world.events.push({ type: 'blocked', remaining: world.remaining });
  }

  function completeRoute(builder, route, world) {
    route.complete = true;
    route.owner = -1;
    builder.routeId = -1;
  }

  function cancelRoute(builder, world) {
    if (builder.routeId >= 0) {
      completeRoute(builder, world.routes[builder.routeId], world);
    }
    builder.routeTargetId = -1;
  }

  function beginPlannedErect(builder, piece, world) {
    const stands = piece.deck ? deckErectStands(piece, world) : mastErectStands(piece, world);
    const builderId = world.index.id(builder.cell[0], builder.cell[1], builder.cell[2]);
    let canErect = false;
    for (let i = 0; i < stands.length; i++) {
      if (stands[i] === builderId) {
        canErect = true;
        break;
      }
    }
    if (!canErect) return false;
    piece.reserved = true;
    builder.erectPiece = piece;
    beginWalk(builder, [builder.cell.slice()], 'erect', world);
    return true;
  }

  // A built plain cube a passage may be cut through (not the wall cube of a window).
  function cuttableBlock(block) {
    return Boolean(block && block.built && !block.feature && block.glassId === undefined);
  }

  function beginPlannedPassage(builder, block, vertical, world) {
    if (!cuttableBlock(block)) return false;
    builder.passageBlock = block;
    builder.passageVertical = vertical;
    builder.phase = 'passage';
    builder.timer = workSeconds(builder, scaffoldSeconds(world.campaign, world.level.pace));
    builder.actionT = 0;
    builder.faceX = block.x;
    builder.faceZ = block.z;
    return true;
  }

  // View: bumped on every change of builder.carry, so the carried stack is rebuilt only then.
  function touchCarry(builder) {
    builder.carryVersion += 1;
  }

  function bringCarryForward(builder, block) {
    const mine = [];
    const rest = [];
    for (let i = 0; i < builder.carry.length; i++) {
      if (builder.carry[i] === block) mine.push(block);
      else rest.push(builder.carry[i]);
    }
    builder.carry = mine.concat(rest);
    touchCarry(builder);
  }

  function dropCarryBlock(builder, block) {
    const next = [];
    for (let i = 0; i < builder.carry.length; i++) {
      if (builder.carry[i] !== block) next.push(builder.carry[i]);
    }
    builder.carry = next;
    touchCarry(builder);
  }

  function carryHas(builder, block) {
    for (let i = 0; i < builder.carry.length; i++) {
      if (builder.carry[i] === block) return true;
    }
    return false;
  }

  function beginRoutePlacement(builder, route, world) {
    const targetIndex = builder.carry.findIndex(function (block) { return block.id === route.targetId; });
    if (targetIndex < 0) return false;
    const block = builder.carry[targetIndex];
    if (!block.ready || !canPlaceHere(builder, block, world)) return false;
    bringCarryForward(builder, block);
    beginWalk(builder, [builder.cell.slice()], 'place', world);
    return true;
  }

  function continueRoute(builder, world) {
    if (builder.routeId < 0) return ROUTE_NONE;
    const route = world.routes[builder.routeId];
    if (route.complete) {
      builder.routeId = -1;
      return ROUTE_NONE;
    }
    while (route.stepIndex < route.steps.length) {
      const step = route.steps[route.stepIndex];
      const piece = step.piece;
      if (step.passageBlock && step.passageBlock.built && !step.passageBlock.feature) {
        if (beginPlannedPassage(builder, step.passageBlock, step.passageVertical, world)) return ROUTE_STARTED;
        cancelRoute(builder, world);
        return ROUTE_NONE;
      }
      if (piece && (!piece.built || piece.removed)) {
        if (piece.reserved) {
          let reservationActive = false;
          for (let i = 0; i < world.builders.length; i++) {
            if (world.builders[i] !== builder && world.builders[i].erectPiece === piece) {
              reservationActive = true;
              break;
            }
          }
          if (reservationActive) return ROUTE_WAITING;
          piece.reserved = false;
        }
        if (beginPlannedErect(builder, piece, world)) return ROUTE_STARTED;
        root.MicroBuildersWorkerLog.record(builder, world, 'Не удалось начать установку элемента лесов; маршрут отменён');
        cancelRoute(builder, world);
        return ROUTE_NONE;
      }
      if (sameCell(builder.cell, step.cell)) {
        route.stepIndex += 1;
        continue;
      }
      beginWalk(builder, [builder.cell.slice(), step.cell.slice()], 'route', world);
      return ROUTE_STARTED;
    }
    completeRoute(builder, route, world);
    if (beginRoutePlacement(builder, route, world)) return ROUTE_STARTED;
    builder.routeTargetId = -1;
    return ROUTE_NONE;
  }

  function requestWork(builder, world) {
    const started = performance.now();
    const pathBefore = world.metrics.path;
    const scaffoldBefore = world.metrics.scaffoldSearch;
    world.metrics.assignments += 1;
    assignJob(builder, world);
    const nestedPath = world.metrics.path - pathBefore;
    const nestedScaffold = world.metrics.scaffoldSearch - scaffoldBefore;
    world.metrics.scheduler += performance.now() - started - nestedPath - nestedScaffold;
  }

  function carriedRouteTargets(builder, world) {
    const targets = new Set();
    for (let i = 0; i < builder.carry.length; i++) {
      const block = builder.carry[i];
      if (!block.ready || !isSupported(block, world)) continue;
      if (!SCAFFOLD.enabled && sealsOther(block, world, EMPTY_SET)) continue;
      targets.add(block.id);
    }
    return targets;
  }

  // View: the crew's last trips and what limited each load ('carry' | 'heavy' | 'plan' | 'order').
  const TRIP_STATS_SIZE = 20;

  function resetTripPay(builder) {
    builder.tripCoins = 0;
    builder.tripCapital = 0;
    builder.tripLucky = 0;
    builder.tripLuckyMultiplier = 1;
    builder.tripCubes = 0;
    builder.tripPours = 0;
    builder.tripBlock = null;
  }

  // View: a trip leaves — record its shape and the reason haulFromPlan stopped, announce it.
  function beginTrip(builder, world, load) {
    const campaign = world.campaign;
    let kg = 0;
    let cubes = 0;
    for (let i = 0; i < load.length; i++) {
      kg += carryWeight(campaign, load[i].materialId);
      if (i === 0 || load[i] !== load[i - 1]) cubes += 1;
    }
    builder.tripLimit = builder.haulLimit;
    builder.tripCapacity = builder.haulCapacity;
    builder.tripKg = kg;
    builder.tripLoad = load.length;
    resetTripPay(builder);
    if (!world.tripStats) world.tripStats = [];
    world.tripStats.push(builder.tripLimit);
    if (world.tripStats.length > TRIP_STATS_SIZE) world.tripStats.shift();
    world.events.push({
      type: 'trip',
      builder: builder.index,
      minis: load.length,
      cubes: cubes,
      kg: kg,
      capacity: builder.tripCapacity,
      limit: builder.tripLimit,
      // Why the plan (= this trip) is this big: 'count' | 'weight' | 'front' | 'heavy'.
      planReason: builder.planReason || '',
      // A cube heavier than the carry: this is trip `part` of `parts` for it, otherwise null.
      part: builder.haulSplit ? builder.haulSplit.trip : 0,
      parts: builder.haulSplit ? builder.haulSplit.trips : 0,
      overload: overloadFactor(kg, world, builder),
      doubled: builder.haulDoubled,
    });
  }

  // View: the carry is empty after placing — one event with what the whole trip earned.
  function finishTrip(builder, world) {
    if (builder.tripPours > 0) {
      const block = builder.tripBlock;
      world.events.push({
        type: 'tripDone',
        builder: builder.index,
        coins: builder.tripCoins,
        // Not `capital`: consumers add every event's `capital` to the treasury, and the pours
        // already carried it.
        capitalFound: builder.tripCapital,
        lucky: builder.tripLucky,
        luckyMultiplier: builder.tripLuckyMultiplier,
        cubes: builder.tripCubes,
        minis: builder.tripPours,
        x: block.x,
        y: block.y,
        z: block.z,
      });
    }
    resetTripPay(builder);
  }

  // View: share of the crew's last `lastN` trips whose load was limited by `kind` ('carry' counts
  // the single oversized cube too, 'plan', 'order'). Returns { hits, total, share }.
  function tripLimitShare(world, kind, lastN) {
    const stats = world.tripStats || [];
    const total = lastN > 0 ? Math.min(lastN, stats.length) : stats.length;
    let hits = 0;
    for (let i = stats.length - total; i < stats.length; i++) {
      if (stats[i] === kind || (kind === 'carry' && stats[i] === 'heavy')) hits += 1;
    }
    return { hits: hits, total: total, share: total > 0 ? hits / total : 0 };
  }

  function startHaul(builder, world, load) {
    builder.waitReason = '';
    if (departIfNeeded(builder, world)) return;
    world.foremanTrips += 1;
    beginTrip(builder, world, load);
    builder.loadBatchId = world.nextLoadBatchId;
    world.nextLoadBatchId += 1;
    for (let i = 0; i < load.length; i++) {
      load[i].reserved = true;
      load[i].owner = builder.index;
      load[i].loadBatchId = builder.loadBatchId;
      if (load[i].planLeft > 0) load[i].planLeft -= 1;
      if (i === 0 || load[i] !== load[i - 1]) load[i].haulTrips += 1;
    }
    const groups = groupPlan(load, world);
    groups.sort(function (a, b) {
      const da = (a.mine.standX - builder.cell[0]) * (a.mine.standX - builder.cell[0]) + (a.mine.standZ - builder.cell[2]) * (a.mine.standZ - builder.cell[2]);
      const db = (b.mine.standX - builder.cell[0]) * (b.mine.standX - builder.cell[0]) + (b.mine.standZ - builder.cell[2]) * (b.mine.standZ - builder.cell[2]);
      return da - db;
    });
    builder.mineQueue = groups;
    walkToNextMine(builder, world);
  }

  function assignJob(builder, world) {
    builder.waitReason = '';
    // On a camp building: his route, his cubes and the stack (resumeCamp).
    if (builder.camp) {
      resumeCamp(builder, world);
      return;
    }
    if (builder.carry.length > 0) {
      const routeProgress = continueRoute(builder, world);
      if (routeProgress === ROUTE_STARTED) return;
      if (routeProgress === ROUTE_WAITING) {
        builder.phase = 'idle';
        builder.wait = 0.1;
        builder.waitReason = 'path';
        return;
      }
      const targets = carriedRouteTargets(builder, world);
      const route = requestRoute(builder, world, targets);
      if (route && boardTaxi(builder, world, targets, route)) return;
      if (route) {
        const nextProgress = continueRoute(builder, world);
        if (nextProgress === ROUTE_STARTED) return;
        if (nextProgress === ROUTE_WAITING) {
          builder.phase = 'idle';
          builder.wait = 0.1;
          builder.waitReason = 'path';
          return;
        }
      }
      const pending = collectRouteTargets(world, targets);
      const sealedResult = openSealedTarget(world, pending);
      if (sealedResult.opened > 0) {
        root.MicroBuildersWorkerLog.record(
          builder,
          world,
          'Для доступа к замурованным кубам добавлено дверей: ' + sealedResult.opened
        );
        const openedRoute = requestRoute(builder, world, targets);
        if (openedRoute) {
          const openedProgress = continueRoute(builder, world);
          if (openedProgress === ROUTE_STARTED) return;
          if (openedProgress === ROUTE_WAITING) {
            builder.phase = 'idle';
            builder.wait = 0.1;
            builder.waitReason = 'path';
            return;
          }
        }
      }
      abandonJobAndRecover(
        builder,
        world,
        'Не найден маршрут к кубам из ноши, включая аварийный маршрут; ' +
          sealedFailureText(sealedResult),
        'route'
      );
      return;
    }
    if (world.remaining > 0) {
      if (builder.routeId >= 0 && world.routes[builder.routeId].home && continueHomeRoute(builder, world)) return;
      // A camp building short of the crew its slider asks for takes him as soon as his hands are
      // free and no cube of his is started, mid-plan too (the rest of the plan goes back to the
      // crew): a plan of heavy cubes carried in parts would otherwise keep him for many trips.
      if (planHasWork(builder) && campShort(world) && joinCamp(builder, world)) return;
      if (planHasWork(builder)) {
        const load = haulFromPlan(builder, world);
        if (load.length > 0) {
          startHaul(builder, world, load);
          return;
        }
        builder.phase = 'idle';
        builder.wait = 0.4;
        builder.waitReason = 'front';
        return;
      }
      if (!sameCell(builder.cell, builder.homeCell)) {
        beginExit(builder, world);
        return;
      }
      // A smoke or a meal first, before the plan: cubes reserved by someone away hold up the crew.
      if (departIfNeeded(builder, world)) return;
      if (joinCamp(builder, world)) return;
      builder.planTaken = reservePlan(builder, world);
      builder.planLimit = planCubeLimit(world.campaign);
      if (builder.planTaken > 0) {
        let cubes = 0;
        for (let i = 0; i < builder.plan.length; i++) if (builder.plan[i].planLeft > 0) cubes += 1;
        world.events.push({ type: 'plan', builder: builder.index, minis: builder.planTaken, cubes: cubes, limit: builder.planLimit, reason: builder.planReason });
      }
      const load = haulFromPlan(builder, world);
      if (load.length > 0) {
        startHaul(builder, world, load);
        return;
      }
      // Nothing free to carry: the same 2 s desk cycle as planning (the timing is calibrated),
      // but for the player it is waiting for a work front.
      beginPlanning(builder);
      builder.waitReason = 'front';
      return;
    }
    finishLevel(world);
    builder.phase = 'idle';
    builder.wait = 0.4;
  }

  function finishMine(builder, world) {
    const group = builder.mineQueue.shift();
    world.constructionStallElapsed = 0;
    if (group) {
      for (let i = 0; i < group.blocks.length; i++) builder.carry.push(group.blocks[i]);
      touchCarry(builder);
    }
    if (builder.mineQueue.length > 0) {
      walkToNextMine(builder, world);
      return;
    }
    builder.phase = 'idle';
    builder.wait = 0;
    builder.carry.sort(function (a, b) {
      const ownedA = a.owner === builder.index ? 0 : 1;
      const ownedB = b.owner === builder.index ? 0 : 1;
      return ownedA - ownedB || a.priority - b.priority || a.id - b.id;
    });
    touchCarry(builder);
    requestWork(builder, world);
  }

  function committedPlaceBlock(builder) {
    if ((builder.phase === 'place' || builder.walkPurpose === 'place') && builder.carry[0] && !builder.carry[0].built) {
      return builder.carry[0];
    }
    if (builder.walkPurpose !== 'route' || builder.routeTargetId < 0) return null;
    for (let i = 0; i < builder.carry.length; i++) {
      const block = builder.carry[i];
      if (block.id === builder.routeTargetId && !block.built) return block;
    }
    return null;
  }

  function sealCommittedCube(builder, world) {
    const block = committedPlaceBlock(builder);
    if (!block || !canPlaceHere(builder, block, world)) return false;
    if (builder.phase === 'place') return true;
    bringCarryForward(builder, block);
    builder.from = builder.cell.slice();
    builder.to = builder.cell.slice();
    builder.segmentT = 1;
    builder.path = null;
    builder.walkPurpose = '';
    builder.phase = 'place';
    builder.forcePlace = true;
    builder.actionT = 0;
    builder.faceX = block.x;
    builder.faceZ = block.z;
    builder.timer = builderPlaceSeconds(builder, world, block);
    return true;
  }

  function continueAfterPlace(builder, world) {
    builder.forcePlace = false;
    builder.phase = 'idle';
    builder.walkPurpose = '';
    builder.path = null;
    if (builder.carry.length === 0) finishTrip(builder, world);
    if (divertToSmoke(builder, world)) return;
    if (builder.exitAfterPlace) {
      builder.exitAfterPlace = false;
      if (builder.carry.length === 0) builder.loadBatchId = -1;
      beginExit(builder, world);
      return;
    }
    if (builder.carry.length > 0) {
      requestWork(builder, world);
      return;
    }
    builder.loadBatchId = -1;
    returnForNewTask(builder, world);
  }

  function finishPlace(builder, world) {
    const block = builder.carry[0];
    // A failed route or a stale place state must never grant progress from outside build reach.
    if (!block || (!block.built && !canPlaceHere(builder, block, world))) {
      cancelRoute(builder, world);
      continueAfterPlace(builder, world);
      return;
    }
    if (block.built) {
      dropCarryBlock(builder, block);
      continueAfterPlace(builder, world);
      return;
    }
    const total = pourTotal(block);
    const index = block.poured;
    block.poured += 1;
    block.owner = builder.index;
    block.reserved = true;
    // «Золотая уха»: his cube is a likelier find (meta.js → capitalRoll).
    if (builder.signature === 'ukha' && DISH.ukha) block.findBoost = DISH.ukha.value;
    const pay = grantPlacePay(world, block, 1, builder);
    const gained = pay.coins;
    world.events.push({
      type: 'pour',
      block: block,
      index: index,
      gained: gained,
      capital: pay.capital,
      builder: builder.index,
      lucky: pay.lucky,
      luckyMultiplier: pay.luckyMultiplier,
      capitalCoin: pay.capitalCoin,
    });
    builder.tripCoins += gained;
    builder.tripCapital += pay.capital;
    if (pay.lucky) {
      builder.tripLucky += 1;
      builder.tripLuckyMultiplier = pay.luckyMultiplier;
    }
    if (builder.tripBlock !== block) builder.tripCubes += 1;
    builder.tripBlock = block;
    builder.tripPours += 1;
    builder.carry.shift();
    touchCarry(builder);
    world.constructionStallElapsed = 0;
    if (block.poured < total) {
      if (builder.carry.length > 0 && builder.carry[0] === block) {
        // The mini-cube is set: a smoke may come in between (the cube waits for him).
        if (divertToSmoke(builder, world)) return;
        builder.timer = builderPlaceSeconds(builder, world, block);
        builder.actionT = 0;
        return;
      }
      if (!carryHas(builder, block) && builder.routeTargetId === block.id) builder.routeTargetId = -1;
      continueAfterPlace(builder, world);
      return;
    }
    if (builder.routeTargetId === block.id) builder.routeTargetId = -1;
    if (builder.routeId >= 0) {
      const route = world.routes[builder.routeId];
      if (route && route.targetId === block.id) completeRoute(builder, route, world);
    }
    dropCarryBlock(builder, block);
    block.built = true;
    block.reserved = false;
    block.owner = -1;
    world.built.add(cellKey(block.x, block.y, block.z));
    occupyBuiltBlock(block, world);
    refreshReadyAround(world, block.x, block.y, block.z);
    invalidateNav(world, block.x, block.y, block.z);
    pullOut(world, block, builder);
    world.remaining -= 1;
    cubeSet(world);
    world.foremanBuilt.push(block);
    wakeVehicles(world);
    world.events.push({ type: 'place', block: block, gained: 0, builder: builder.index });
    gainWorkerXp(builder, world, block);
    refreshPlan(builder);
    builder.blockedWalkAttempts = 0;
    continueAfterPlace(builder, world);
  }

  function returnForNewTask(builder, world) {
    if (planHasWork(builder)) {
      const load = haulFromPlan(builder, world);
      if (load.length > 0) {
        startHaul(builder, world, load);
        return;
      }
      builder.phase = 'idle';
      builder.wait = 0.4;
      builder.waitReason = 'front';
      return;
    }
    if (sameCell(builder.cell, builder.homeCell)) {
      beginPlanning(builder);
      return;
    }
    beginExit(builder, world);
  }

  function builderNeed(builder) {
    if (builder.phase === 'meal' || builder.walkPurpose === 'meal') return 'meal';
    if (builder.phase === 'break') return builder.breakKind;
    if (builder.walkPurpose === 'smoke') return 'smoke';
    if (builder.walkPurpose === 'sleep') return 'sleep';
    return '';
  }

  function rollSpan(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function pickPerimeterCell(world, minDist, maxDist) {
    const footprint = world.level.footprint;
    const dist = rollSpan(minDist, maxDist);
    const side = Math.floor(Math.random() * 4);
    const alongX = footprint.maxX - footprint.minX + 1 + dist * 2;
    const alongZ = footprint.maxZ - footprint.minZ + 1 + dist * 2;
    let x = footprint.minX - dist;
    let z = footprint.minZ - dist;
    if (side === 0) {
      x = footprint.minX - dist + Math.floor(Math.random() * alongX);
      z = footprint.maxZ + dist;
    } else if (side === 1) {
      x = footprint.minX - dist + Math.floor(Math.random() * alongX);
      z = footprint.minZ - dist;
    } else if (side === 2) {
      x = footprint.maxX + dist;
      z = footprint.minZ - dist + Math.floor(Math.random() * alongZ);
    } else {
      x = footprint.minX - dist;
      z = footprint.minZ - dist + Math.floor(Math.random() * alongZ);
    }
    return [x, 0, z];
  }

  // A bed in the dorm if one stands and a bed is free: a short way to its door (and inside) instead
  // of the far trailers, and a shorter sleep (DORM.sleepScale).
  function startDormSleep(builder, world) {
    const dorm = world.dorm;
    if (!dorm || dormSleepers(world) >= dormBeds(world)) return false;
    const path = sameCell(builder.cell, dorm.door) ? [builder.cell.slice()] : findPathToCell(builder.cell, dorm.door, world);
    if (!path) return false;
    builder.sleepPlace = 'dorm';
    builder.awayCell = dorm.door.slice();
    builder.needTrip = 'sleep';
    beginWalk(builder, path, 'sleep', world);
    return true;
  }

  function startNeedTrip(builder, world, kind) {
    const minDist = kind === 'meal' ? BALANCE.mealMinSquares : kind === 'sleep' ? SLEEP.minSquares : BALANCE.smokeMinSquares;
    const maxDist = kind === 'meal' ? BALANCE.mealMaxSquares : kind === 'sleep' ? SLEEP.maxSquares : BALANCE.smokeMaxSquares;
    let cell = pickPerimeterCell(world, minDist, maxDist);
    for (let tries = 0; tries < 6 && !canStand(cell[0], cell[1], cell[2], world); tries++) cell = pickPerimeterCell(world, minDist, maxDist);
    builder.awayCell = cell;
    builder.needTrip = kind;
    const path = findPathToCell(builder.cell, cell, world);
    if (path) {
      beginWalk(builder, path, kind, world);
      return;
    }
    builder.phase = 'recover';
    builder.wait = 0.2;
  }

  // Off to eat or smoke: the plan's cubes not started yet go back to the crew; a started one stays
  // with him (whoever started a cube finishes it).
  function releaseUnstartedPlan(builder, world) {
    const kept = [];
    let released = 0;
    for (let i = 0; i < builder.plan.length; i++) {
      const block = builder.plan[i];
      if (block.built) continue;
      if (block.poured > 0 && block.owner === builder.index) {
        kept.push(block);
        continue;
      }
      if (block.owner === builder.index) {
        releasePlanBlock(block);
        released += 1;
      }
    }
    builder.plan = kept;
    builder.planTaken = planMinis(builder);
    if (released > 0) wakeVehicles(world);
  }

  // «Обед по очереди» (tuning.builders.lunchQueue, a share of the crew): while that many of the crew are
  // away eating, a worker at the top of his hunger holds on and goes when one comes back — the site
  // never stops for one big lunch. 0 — off.
  function lunchQueueFull(builder, world) {
    const share = BALANCE.lunchQueue || 0;
    if (!(share > 0)) return false;
    let crew = 0;
    let eating = 0;
    for (let i = 0; i < world.builders.length; i++) {
      const other = world.builders[i];
      if (other.trade !== 'builder') continue;
      crew += 1;
      if (other !== builder && other.needTrip === 'meal') eating += 1;
    }
    return eating >= Math.max(1, Math.floor(crew * share));
  }

  function departIfNeeded(builder, world) {
    if (builder.carry.length > 0) return false;
    builder.mealQueued = builder.hunger >= builder.hungerScale && lunchQueueFull(builder, world);
    const hungry = builder.hunger >= builder.hungerScale && !builder.mealQueued;
    const canteen = canteenDue(builder, world) || (builder.grandDue && canteenActive(world));
    const smoke = smokeWanted(builder, world);
    const sleep = sleepDue(builder, world);
    if (hungry || canteen || smoke || sleep) releaseUnstartedPlan(builder, world);
    if (canteen && startCanteenMeal(builder, world)) return true;
    // At the top of hunger: the classic meal in town, far and long, with no dish.
    if (hungry) {
      startNeedTrip(builder, world, 'meal');
      return true;
    }
    // Worn out: off to the trailers to sleep (a call to smoke he heard is forgotten).
    if (sleep) {
      builder.smokeCall = null;
      builder.sleepPlace = '';
      if (!startDormSleep(builder, world)) startNeedTrip(builder, world, 'sleep');
      return true;
    }
    if (smoke) {
      if (!startSmoke(builder, world)) startNeedTrip(builder, world, 'smoke');
      return true;
    }
    return false;
  }

  // His own desire is due, or he heard a call that is still fresh.
  function smokeWanted(builder, world) {
    if (builder.trade !== 'builder') return false;
    if (builder.smokeCall && builder.smokeCall.until < world.campaign.levelElapsed) builder.smokeCall = null;
    return builder.smokeNeed >= builder.smokeThreshold || !!builder.smokeCall;
  }

  // A worker going to smoke: joins the group of the call he heard, else starts his own — at the
  // site's lounge once one stands (a seat in front of it; seats are checked when he gets there), else
  // at a random spot 10–20 cells off the building; calls out on the way. Null path — false (nothing
  // changes).
  function startSmoke(builder, world) {
    let group = builder.smokeCall ? builder.smokeCall.group : null;
    if (group && group.lounge && loungeSeats(world) === 0) group = smokeOverflowGroup(group, world);
    if (!group) {
      world.smokeSerial = (world.smokeSerial || 0) + 1;
      group = loungeSeats(world) > 0
        ? { id: world.smokeSerial, spot: world.lounge.smokeCells[0].slice(), size: 0, lounge: true, overflow: null }
        : { id: world.smokeSerial, spot: smokeSpot(world), size: 0 };
    }
    const cell = group.lounge ? loungeCell(builder, world) : smokeCell(group, world);
    const path = sameCell(builder.cell, cell) ? [builder.cell.slice()] : findPathToCell(builder.cell, cell, world);
    if (!path) return false;
    builder.smokeCall = null;
    builder.smokeGroup = group;
    builder.smokePlace = group.lounge ? 'lounge' : '';
    group.size += 1;
    builder.awayCell = cell.slice();
    builder.needTrip = 'smoke';
    callToSmoke(builder, world);
    beginWalk(builder, path, 'smoke', world);
    return true;
  }

  // A random standable spot 10–20 cells off the building (the usual smoke place).
  function smokeSpot(world) {
    let spot = pickPerimeterCell(world, BALANCE.smokeMinSquares, BALANCE.smokeMaxSquares);
    for (let tries = 0; tries < 6 && !canStand(spot[0], spot[1], spot[2], world); tries++) {
      spot = pickPerimeterCell(world, BALANCE.smokeMinSquares, BALANCE.smokeMaxSquares);
    }
    return spot;
  }

  // Those of a lounge group who found no seat smoke together at one usual spot (made by the first
  // of them).
  function smokeOverflowGroup(group, world) {
    if (!group.overflow) {
      world.smokeSerial = (world.smokeSerial || 0) + 1;
      group.overflow = { id: world.smokeSerial, spot: smokeSpot(world), size: 0 };
    }
    return group.overflow;
  }

  // Turned away at the lounge: on to his group's usual spot. False — no way there.
  function startSmokeOverflow(builder, world) {
    const lounge = builder.smokeGroup;
    const group = lounge && lounge.lounge ? smokeOverflowGroup(lounge, world) : { id: 0, spot: smokeSpot(world), size: 0 };
    const cell = smokeCell(group, world);
    const path = sameCell(builder.cell, cell) ? [builder.cell.slice()] : findPathToCell(builder.cell, cell, world);
    if (!path) return false;
    if (lounge) lounge.size = Math.max(0, lounge.size - 1);
    builder.smokeGroup = group;
    group.size += 1;
    builder.awayCell = cell.slice();
    beginWalk(builder, path, 'smoke', world);
    return true;
  }

  // A seat cell in front of the lounge nobody else is heading to or smoking at (the first standable
  // one if all are taken: he finds out at the door).
  function loungeCell(builder, world) {
    const cells = world.lounge.smokeCells;
    let fallback = null;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!canStand(cell[0], cell[1], cell[2], world)) continue;
      if (!fallback) fallback = cell;
      let taken = false;
      for (let k = 0; k < world.builders.length && !taken; k++) {
        const other = world.builders[k];
        if (other === builder || other.smokePlace !== 'lounge' || !other.awayCell || !sameCell(other.awayCell, cell)) continue;
        taken = (other.phase === 'walk' && other.walkPurpose === 'smoke') || (other.phase === 'break' && other.breakKind === 'smoke');
      }
      if (!taken) return cell.slice();
    }
    return (fallback || cells[0]).slice();
  }

  // The group gathers around its spot: the first at the spot, the next ones on the cells around it.
  const SMOKE_RING = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [0, 2], [-2, 0], [0, -2]];
  function smokeCell(group, world) {
    for (let i = 0; i < SMOKE_RING.length; i++) {
      const offset = SMOKE_RING[(group.size + i) % SMOKE_RING.length];
      const cell = [group.spot[0] + offset[0], group.spot[1], group.spot[2] + offset[1]];
      if (canStand(cell[0], cell[1], cell[2], world)) return cell;
    }
    return group.spot.slice();
  }

  // The call: everyone in range who wants a smoke enough and has no call yet (the first call wins;
  // those already smoking, eating or on the way there do not hear it).
  function callToSmoke(builder, world) {
    const radius = SMOKING.callRadius;
    const r2 = radius * radius;
    const until = world.campaign.levelElapsed + SMOKING.callSeconds;
    let heard = 0;
    for (let i = 0; i < world.builders.length; i++) {
      const other = world.builders[i];
      if (other === builder || other.trade !== 'builder' || other.smokeCall || other.smokeGroup) continue;
      if (other.phase === 'meal' || other.phase === 'break' || other.walkPurpose === 'meal' || other.walkPurpose === 'smoke' || other.walkPurpose === 'sleep') continue;
      const dx = other.cell[0] - builder.cell[0];
      const dy = other.cell[1] - builder.cell[1];
      const dz = other.cell[2] - builder.cell[2];
      if (dx * dx + dy * dy + dz * dz > r2) continue;
      // «Сила воли»: a call is heard only past a higher share of his own threshold.
      if (other.smokeNeed < Math.max(SMOKING.callDesire, lineValue(world.campaign, 'willpower')) * other.smokeThreshold) continue;
      other.smokeCall = { group: builder.smokeGroup, until: until };
      heard += 1;
    }
    world.events.push({ type: 'smokeCall', builder: builder, x: builder.cell[0], y: builder.cell[1], z: builder.cell[2], radius: radius, heard: heard });
  }

  // Others of his group on the way to the spot or smoking there.
  function smokeCompanions(builder, world) {
    const group = builder.smokeGroup;
    if (!group) return 0;
    let count = 0;
    for (let i = 0; i < world.builders.length; i++) {
      const other = world.builders[i];
      if (other !== builder && other.smokeGroup === group) count += 1;
    }
    return count;
  }

  // Between actions anywhere on the site (a step of a walk, a mini-cube just set): off to smoke if
  // due. A mini-cube being set is always finished first; cubes in the pack go along and wait for
  // him (so do the plan's cubes reserved for him); quarry picks not made yet go back to the crew.
  function smokeDivertible(builder) {
    const purpose = builder.walkPurpose;
    if (builder.phase === 'walk') {
      return purpose === 'mine' || purpose === 'route' || purpose === '' || purpose === 'out' || purpose === 'campFetch';
    }
    return builder.phase === 'idle' || builder.phase === 'place';
  }

  function divertToSmoke(builder, world) {
    if (!smokeWanted(builder, world) || !smokeDivertible(builder)) return false;
    // No way to a spot from here (high on the building): try again in a few seconds, not every step.
    if ((builder.smokeRetryAt || 0) > world.campaign.levelElapsed) return false;
    if (!canStand(builder.cell[0], builder.cell[1], builder.cell[2], world) || !startSmoke(builder, world)) {
      builder.smokeRetryAt = world.campaign.levelElapsed + 3;
      return false;
    }
    cancelRoute(builder, world);
    releaseUnpicked(builder);
    if (builder.erectPiece && !builder.erectPiece.removed) builder.erectPiece.reserved = false;
    builder.erectPiece = null;
    builder.passageBlock = null;
    builder.exitAfterPlace = false;
    builder.forcePlace = false;
    if (builder.carry.length === 0) releaseUnstartedPlan(builder, world);
    return true;
  }

  // ---------- site camp: buildings the crew builds by the desk (docs/gdd/20-site-camp.md) ----------
  // The canteen and the sales office. Each stands at a fixed place next to the desk; only workers
  // build it, as many as the player asks for (0 at the start, the slider of its sheet); they take its
  // cubes from its own stack beside it and set them bottom-up in a fixed order. Camp cubes pay
  // nothing: the price is the crew's time. world.camp lists the site's buildings in placing order;
  // world.canteen / world.sales point at them (null while closed for the company).
  const CAMP_H = 3;
  const SALES_W = 4;
  const SALES_D = 4;
  const SALES = window.MicroBuildersBalance.sales || {
    forms: [], payoutSeconds: 5, levelRate: 3, levelBonus: 0.1,
    upgrades: {
      managers: { name: 'Менеджеры', max: 25, gain: 5, gainGrowth: 1.25, payback: 60, paybackGrowth: 1.15 },
      showroom: { name: 'Шоу-рум', max: 5, perCube: 0.02, cost: 400, costGrowth: 2.5 },
    },
  };

  // Dorm (where the crew sleeps near the site) and the lighting masts (two, on both sides of the
  // building: they take off the night penalty), balance.json → dorm / light.
  const DORM = window.MicroBuildersBalance.dorm || { forms: [], beds: 3, sleepScale: 0.85 };
  const LIGHT = window.MicroBuildersBalance.light || { forms: [], reliefPerLevel: 0.1 };
  // Lounge: where the crew smokes near the site — a lean-to growing into an entertainment centre
  // (balance.json → lounge: seats per level, a shorter smoke there).
  const LOUNGE = window.MicroBuildersBalance.lounge || { forms: [], seats: 2, smokeScale: 0.85 };
  // Reactor (techno-magic): a camp building whose standing form fills the site with mana
  // (balance.json → meta.reactor: forms, manaPerLevel, manaMaxBase, manaMaxPerLevel).
  const REACTOR_SITE = (window.MicroBuildersBalance.meta && window.MicroBuildersBalance.meta.reactor) || { forms: [], manaPerLevel: 6, manaMaxBase: 40, manaMaxPerLevel: 20 };
  const CAMP_SPECS = { canteen: CANTEEN, sales: SALES, dorm: DORM, lounge: LOUNGE, light: LIGHT, reactor: REACTOR_SITE };

  function campCellFree(world, x, z, taken) {
    const level = world.level;
    const fp = level.footprint;
    if (!world.index.inside(x, 0, z) || !world.index.inside(x, CAMP_H, z)) return false;
    if (taken.has(cellKey(x, 0, z))) return false;
    if (x >= fp.minX - 3 && x <= fp.maxX + 3 && z >= fp.minZ - 3 && z <= fp.maxZ + 3) return false;
    for (let i = 0; i < level.spawnPoints.length; i++) {
      if (level.spawnPoints[i][0] === x && level.spawnPoints[i][2] === z) return false;
    }
    for (let i = 0; i < level.rocks.length; i++) {
      if (Math.abs(level.rocks[i].x - x) <= 1 && Math.abs(level.rocks[i].z - z) <= 1) return false;
    }
    for (let i = 0; i < level.mines.length; i++) {
      if (Math.abs(level.mines[i].standX - x) <= 1 && Math.abs(level.mines[i].standZ - z) <= 1) return false;
    }
    const pads = level.elevators || [];
    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      if (x >= pad.x - 1 && x <= pad.x + 3 && z >= pad.z - 1 && z <= pad.z + 3) return false;
    }
    return true;
  }

  // Right of the desk (the camera side) if there is room, else left of it, never on a pad taken by
  // another camp building; the stack stands two cells east of the house. Row 1 is the second row,
  // further toward the camera, the pads centred on the desk first.
  function campPad(world, w, d, taken, row) {
    const fp = world.level.footprint;
    const cx = Math.round((fp.minX + fp.maxX) / 2);
    const z0 = fp.maxZ + 5 + (row ? 14 : 0);
    for (let shift = 0; shift < 48; shift++) {
      const options = row
        ? [cx - Math.floor(w / 2) + shift, cx - Math.floor(w / 2) - shift]
        : [cx + 8 + shift, cx - 8 - (w + 2) - shift];
      for (let k = 0; k < options.length; k++) {
        const x0 = options[k];
        let clear = true;
        for (let z = z0 - 1; z <= z0 + d && clear; z++) {
          for (let x = x0 - 1; x <= x0 + w + 2 && clear; x++) clear = campCellFree(world, x, z, taken);
        }
        if (clear) return { x: x0, z: z0 };
      }
    }
    return null;
  }

  // The outer ring of a w × d house, starting at its front-left corner.
  function campRing(x0, z0, w, d) {
    const ring = [];
    for (let x = x0; x < x0 + w; x++) ring.push([x, z0]);
    for (let z = z0 + 1; z < z0 + d; z++) ring.push([x0 + w - 1, z]);
    for (let x = x0 + w - 2; x >= x0; x--) ring.push([x, z0 + d - 1]);
    for (let z = z0 + d - 2; z > z0; z--) ring.push([x0, z]);
    return ring;
  }

  // The ground cell a cube is set from: across its wall; a roof cube from the nearest side.
  function campStand(cube, x0, z0, w, d) {
    const toWest = cube.x - x0;
    const toEast = x0 + w - 1 - cube.x;
    const toFront = cube.z - z0;
    const toBack = z0 + d - 1 - cube.z;
    const near = Math.min(toWest, toEast, toFront, toBack);
    if (near === toBack) return [cube.x, 0, z0 + d];
    if (near === toFront) return [cube.x, 0, z0 - 1];
    if (near === toWest) return [x0 - 1, 0, cube.z];
    return [x0 + w, 0, cube.z];
  }

  // ---------- the camp buildings' forms ----------
  // Every level of a camp building is a building of its own (levels.js → MicroBuilderCampForms:
  // canteen — a log canteen, a café, a bistro, a restaurant, a grand restaurant; sales — high-tech
  // offices from a glass box to twisting skyscrapers) of voxels CAMP_VOXEL of a cell. The pad is
  // sized for the building's largest form; each form stands centred on it, its façade on the camera
  // side. A new level rebuilds it: the old building is gone at once (the view collapses it with a
  // show), the new one goes up from nothing; the building works at its old level meanwhile.
  const CAMP_FORMS = root.MicroBuilderCampForms || {};
  // The site upgrade that builds and raises each camp building.
  const CAMP_NODES = { canteen: 'kitchen', sales: 'sales', dorm: 'dorm', lounge: 'lounge', light: 'light', reactor: 'reactor' };
  const CANTEEN_FORMS = CAMP_FORMS.canteen || [];
  // Camp cubes are whole cells of the site grid (CANTEEN.voxel = 1): set ones are solid cells.
  const CAMP_VOXEL = CANTEEN.voxel || 1;
  // world.campGrid bits: the pad's ground (vehicles keep off it) and a cube of the form still to set
  // (no ladder or deck may go there).
  const CAMP_PAD = 1;
  const CAMP_FUTURE = 2;
  const campFormCache = {};

  function campFormCount(id) {
    return (CAMP_FORMS[id] || []).length;
  }

  // Form n (1…) of camp building id: its voxels {x, y, z, materialId, drawn} from 0, in the main site's
  // building order, and its size in voxels. A form is set by the main site's
  // laws, its cubes by their real mass; how long it takes is set by its balance (the camp building's
  // forms[n]: the day of the campaign, the minute of the session and the minutes the whole crew of
  // the reference player needs). tools/calibrate-camp.sh finds the form's mass for that (forms[n].mass,
  // .grid), and its materials are picked for the mass like a campaign building's (pickMaterials: the
  // drawing's colours and textures; its gems and diamonds stay trim). `drawn` — the drawn material.
  function campForm(id, n) {
    const key = id + ':' + n;
    if (campFormCache[key]) return campFormCache[key];
    const spec = CAMP_FORMS[id][n - 1];
    const bp = createBlueprint();
    spec.build(bp);
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    let maxY = 0;
    for (const cell of bp.cells.values()) {
      minX = Math.min(minX, cell.x);
      maxX = Math.max(maxX, cell.x);
      minZ = Math.min(minZ, cell.z);
      maxZ = Math.max(maxZ, cell.z);
      maxY = Math.max(maxY, cell.y);
    }
    // The building order of the main site (startLevel's priority): floor by floor, the inside before
    // the shell, from the centre out.
    const shell = classifyShell(bp.cells, bp.seals);
    let cx = 0;
    let cz = 0;
    for (const cell of bp.cells.values()) {
      cx += cell.x;
      cz += cell.z;
    }
    cx /= bp.cells.size;
    cz /= bp.cells.size;
    const voxels = [];
    for (const cell of bp.cells.values()) {
      if (cell.y < 0 || !MATERIAL[cell.materialId]) continue;
      const dist = Math.abs(cell.x - cx) + Math.abs(cell.z - cz);
      const priority = cell.y * 100000 + (shell.has(cellKey(cell.x, cell.y, cell.z)) ? 5000 : 0) + dist * 10;
      voxels.push({ id: voxels.length, x: cell.x - minX, y: cell.y, z: cell.z - minZ, materialId: cell.materialId, drawn: cell.materialId, priority: priority });
    }
    // Before the first calibration: the drawing's own mass (its gems aside — they go as light trim).
    const timing = (CAMP_SPECS[id].forms || [])[n - 1] || {};
    let mass = timing.mass;
    if (!(mass > 0)) {
      mass = 0;
      for (let i = 0; i < voxels.length; i++) {
        const material = MATERIAL[voxels[i].drawn];
        if (material.id !== GLASS.id && !material.accent) mass += material.weight;
      }
    }
    if (mass > 0) pickMaterials(voxels, mass, timing.grid || 1);
    voxels.sort(function (a, b) { return a.priority - b.priority || a.id - b.id; });
    campFormCache[key] = { name: spec.name, voxels: voxels, w: maxX - minX + 1, d: maxZ - minZ + 1, h: maxY + 1 };
    return campFormCache[key];
  }

  function canteenForm(n) {
    return campForm('canteen', n);
  }

  // The tallest camp building (any form) of those open on this site, in cells.
  function campTop(campaign) {
    let top = 0;
    [['canteen', campaign.canteenOpen], ['sales', campaign.salesOpen], ['dorm', campaign.dormOpen],
      ['lounge', campaign.loungeOpen], ['light', campaign.lightOpen], ['reactor', campaign.reactorOpen]].forEach(function (pair) {
      if (pair[1] && campFormCount(pair[0]) > 0) top = Math.max(top, Math.ceil(campPadSize(pair[0]).h));
    });
    return top;
  }

  // The pad of camp building id in cells (its largest form) and its height.
  function campPadSize(id) {
    let w = 1;
    let d = 1;
    let h = 1;
    for (let n = 1; n <= campFormCount(id); n++) {
      const form = campForm(id, n);
      w = Math.max(w, form.w);
      d = Math.max(d, form.d);
      h = Math.max(h, form.h);
    }
    return { w: Math.ceil(w * CAMP_VOXEL), d: Math.ceil(d * CAMP_VOXEL), h: h * CAMP_VOXEL };
  }

  // The cubes of form n on this site: centres in the world (wx, wy, wz), the cell they are in and
  // the ground cell they are set from.
  function campFormCubes(site, n) {
    const form = campForm(site.kind, n);
    const gridW = Math.floor(site.w / CAMP_VOXEL);
    const gridD = Math.floor(site.d / CAMP_VOXEL);
    const offX = Math.floor((gridW - form.w) / 2);
    const offZ = site.kind === 'light' ? Math.floor((gridD - form.d) / 2) : gridD - form.d;
    const marginX = (site.w - gridW * CAMP_VOXEL) / 2;
    const marginZ = site.d - gridD * CAMP_VOXEL;
    return form.voxels.map(function (v) {
      // The right-hand mast is mirrored, so its lamps face the building too.
      const gx = offX + (site.flip ? form.w - 1 - v.x : v.x);
      const gz = offZ + v.z;
      const cube = {
        wx: site.x + marginX + (gx + 0.5) * CAMP_VOXEL,
        wy: (v.y + 0.5) * CAMP_VOXEL,
        wz: site.z + marginZ + (gz + 0.5) * CAMP_VOXEL,
        materialId: v.materialId,
        drawn: v.drawn,
        // Set already; who has it in his hands (-1 — on the stack); the navigation it had no route
        // under (the main site's failedNavSerial: put off until the site changes).
        done: false,
        owner: -1,
        failedNavSerial: -1,
      };
      cube.x = Math.floor(cube.wx);
      cube.y = Math.floor(cube.wy);
      cube.z = Math.floor(cube.wz);
      cube.stand = campStand(cube, site.x, site.z, site.w, site.d);
      return cube;
    });
  }

  // The world size of what stands (or is going up) on the pad: for the outline, the sign, the tap.
  function campBox(site) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    let h = 0;
    const half = (site.voxel || 1) / 2;
    const add = function (cube) {
      x0 = Math.min(x0, cube.wx - half);
      x1 = Math.max(x1, cube.wx + half);
      z0 = Math.min(z0, cube.wz - half);
      z1 = Math.max(z1, cube.wz + half);
      h = Math.max(h, cube.wy + half);
    };
    site.cubes.forEach(add);
    site.box = { x0: x0, x1: x1, z0: z0, z1: z1, h: h };
  }

  // Start building form n from nothing (the standing one, if any, is gone).
  function setCampForm(world, site, n) {
    const cubes = campFormCubes(site, n);
    // The old building is gone from the grid: its cells are free, nothing waits for them.
    const old = site.cubes || [];
    for (let i = 0; i < old.length; i++) campCell(world, old[i], 0);
    site.target = n;
    site.cubes = cubes;
    site.total = cubes.length;
    site.built = 0;
    site.taken = 0;
    site.ready = false;
    site.cellIndex = new Map();
    for (let i = 0; i < cubes.length; i++) {
      site.cellIndex.set(cellKey(cubes[i].x, cubes[i].y, cubes[i].z), i);
      campCell(world, cubes[i], CAMP_FUTURE);
    }
    if (old.length + cubes.length > 0) invalidateNavBatch(world, old.concat(cubes));
    // The stack is back for the new build.
    for (let i = 0; i < site.pile.length; i++) world.waterGrid[world.index.id(site.pile[i][0], 0, site.pile[i][2])] = 1;
    campBox(site);
  }

  // A camp cube's cell in the grid: 0 — nothing (the building came down), CAMP_FUTURE — still to
  // set, 1 — set (a solid cell). Navigation is refreshed by the caller.
  function campCell(world, cube, state) {
    const index = world.index;
    if (!index.inside(cube.x, cube.y, cube.z)) return;
    const id = index.id(cube.x, cube.y, cube.z);
    world.solidGrid[id] = state === 1 ? 1 : 0;
    world.campGrid[id] = (world.campGrid[id] & ~CAMP_FUTURE) | (state === CAMP_FUTURE ? CAMP_FUTURE : 0);
  }

  // The first `count` cubes of the form stand but `gaps` (a restored site, a dev form).
  function markCampBuilt(world, site, count, gaps) {
    const skip = new Set(gaps || []);
    let built = 0;
    for (let i = 0; i < site.cubes.length; i++) {
      const done = i < count && !skip.has(i);
      if (done) built += 1;
      site.cubes[i].done = done;
      site.cubes[i].owner = -1;
      campCell(world, site.cubes[i], done ? 1 : CAMP_FUTURE);
    }
    site.built = built;
    site.taken = 0;
    if (site.cubes.length > 0) invalidateNavBatch(world, site.cubes);
  }

  // The level bought for a camp building («Полевая кухня» / «Офис продаж» on the site).
  function campBoughtLevel(world, site) {
    return world.campaign.purchases[CAMP_NODES[site.kind]] || 0;
  }

  // A level bought above the standing form starts the rebuild (straight to the level bought); the
  // event carries the old cubes for the view's collapse.
  function stepCampForms(world) {
    for (let i = 0; i < world.camp.length; i++) {
      const site = world.camp[i];
      if (!site.forms || !site.ready || !campActive(world, site)) continue;
      const want = Math.min(campFormCount(site.kind), campBoughtLevel(world, site));
      if (want > site.form) {
        const old = site.cubes;
        setCampForm(world, site, want);
        world.events.push({ type: 'campReform', site: site, old: old });
      }
    }
  }

  // Sales office: sandstone walls, a two-storey shop window and the door in the back wall (towards
  // the camera), small windows in the side walls, an oak roof.
  function salesCubes(x0, z0) {
    const ring = campRing(x0, z0, SALES_W, SALES_D);
    const back = z0 + SALES_D - 1;
    const cubes = [];
    for (let y = 0; y < 2; y++) {
      for (let i = 0; i < ring.length; i++) {
        const x = ring[i][0];
        const z = ring[i][1];
        if (z === back && x === x0 + 1) continue;
        const glass = (z === back && x === x0 + 2) || (y === 1 && z === z0 + 1 && (x === x0 || x === x0 + SALES_W - 1));
        cubes.push({ x: x, y: y, z: z, wx: x + 0.5, wy: y + 0.5, wz: z + 0.5, materialId: glass ? 'glass' : 'ladder-sandstone' });
      }
    }
    for (let z = z0; z < z0 + SALES_D; z++) {
      for (let x = x0; x < x0 + SALES_W; x++) cubes.push({ x: x, y: 2, z: z, wx: x + 0.5, wy: 2.5, wz: z + 0.5, materialId: 'ladder-oak' });
    }
    return cubes;
  }

  function createCampSite(world, id, w, d, cubes, taken, at) {
    const pad = at || campPad(world, w, d, taken, id === 'dorm' || id === 'lounge' || id === 'reactor' ? 1 : 0);
    if (!pad) return null;
    const x0 = pad.x;
    const z0 = pad.z;
    for (let z = z0 - 1; z <= z0 + d; z++) {
      for (let x = x0 - 1; x <= x0 + w + 2; x++) taken.add(cellKey(x, 0, z));
    }
    const site = {
      id: id,
      kind: id,
      x: x0,
      z: z0,
      w: w,
      d: d,
      h: CAMP_H,
      cubes: cubes ? cubes(x0, z0) : [],
      total: 0,
      built: 0,
      // Workers the player put on it (the slider); the crew follows it at the next desk visit.
      assigned: 0,
      ready: false,
      pile: [[x0 + w + 2, 0, z0 + 1], [x0 + w + 2, 0, z0 + 2]],
      pickStand: [x0 + w + 1, 0, z0 + 1],
    };
    site.total = site.cubes.length;
    for (let i = 0; i < site.cubes.length; i++) site.cubes[i].stand = campStand(site.cubes[i], x0, z0, w, d);
    site.voxel = 1;
    campBox(site);
    // Workers walk the pad like the main site (its set cubes are solid cells); vehicles keep off it.
    // The stack blocks its cells until the house stands.
    const index = world.index;
    for (let z = z0; z < z0 + d; z++) {
      for (let x = x0; x < x0 + w; x++) world.campGrid[index.id(x, 0, z)] |= CAMP_PAD;
    }
    for (let i = 0; i < site.pile.length; i++) world.waterGrid[index.id(site.pile[i][0], 0, site.pile[i][2])] = 1;
    world.camp.push(site);
    return site;
  }

  function createCamp(world) {
    const campaign = world.campaign;
    world.camp = [];
    world.canteen = null;
    world.sales = null;
    world.dorm = null;
    world.lounge = null;
    world.reactor = null;
    world.lights = [];
    const taken = new Set();
    if (campaign.canteenOpen && CANTEEN_FORMS.length > 0) {
      const pad = campPadSize('canteen');
      const canteen = createCampSite(world, 'canteen', pad.w, pad.d, null, taken);
      if (canteen) {
        const dishes = campaign.canteenDishes || [];
        canteen.dish = dishes.indexOf('kasha') >= 0 ? 'kasha' : dishes[0] || '';
        // The rows above the dish of the day; empty until the player picks (the pastry — the free pirozhok).
        canteen.dish2 = '';
        canteen.snack = dishes.indexOf('pirozhok') >= 0 ? 'pirozhok' : '';
        canteen.signature = '';
        canteen.grand = '';
        // The standing form (0 — nothing yet) and the one going up.
        canteen.form = 0;
        canteen.forms = true;
        canteen.voxel = CAMP_VOXEL;
        canteen.h = pad.h;
        setCampForm(world, canteen, 1);
        const mid = canteen.x + Math.floor(canteen.w / 2);
        const back = canteen.z + canteen.d;
        canteen.eatCells = [[mid, 0, back], [mid - 1, 0, back], [mid + 1, 0, back], [mid - 2, 0, back], [mid + 2, 0, back]];
        canteen.nextEat = 0;
        // Times a worker came to the door and found every seat taken (this site).
        canteen.turnedAway = 0;
        world.canteen = canteen;
      }
    }
    if (campaign.salesOpen) {
      const forms = campFormCount('sales') > 0;
      const pad = forms ? campPadSize('sales') : { w: SALES_W, d: SALES_D, h: CAMP_H };
      const sales = createCampSite(world, 'sales', pad.w, pad.d, forms ? null : salesCubes, taken);
      if (sales && forms) {
        sales.form = 0;
        sales.forms = true;
        sales.voxel = CAMP_VOXEL;
        sales.h = pad.h;
        setCampForm(world, sales, 1);
      }
      if (sales) {
        sales.upgrades = { managers: 0, showroom: 0 };
        // Coins earned but not paid yet (paid every SALES.payoutSeconds), the clock of the payout
        // and everything the office has paid on this site.
        sales.bank = 0;
        sales.clock = 0;
        sales.earned = 0;
        world.sales = sales;
      }
    }
    if (campaign.dormOpen && campFormCount('dorm') > 0) {
      const dorm = createFormSite(world, 'dorm', 'dorm', taken, null, false);
      if (dorm) {
        dorm.door = [dorm.x + Math.floor(dorm.w / 2), 0, dorm.z + dorm.d];
        world.dorm = dorm;
      }
    }
    if (campaign.loungeOpen && campFormCount('lounge') > 0) {
      const lounge = createFormSite(world, 'lounge', 'lounge', taken, null, false);
      if (lounge) {
        // Seats in front of it, facing it: a row along its front from the middle out, then a second row.
        const mid = lounge.x + Math.floor(lounge.w / 2);
        lounge.smokeCells = [];
        for (let row = 0; row < 2; row++) {
          for (let k = 0; k < lounge.w; k++) {
            const offset = k % 2 === 1 ? -(k + 1) / 2 : k / 2;
            lounge.smokeCells.push([mid + offset, 0, lounge.z + lounge.d + row]);
          }
        }
        // Times a worker came and found every seat taken (this site).
        lounge.turnedAway = 0;
        world.lounge = lounge;
      }
    }
    if (campaign.reactorOpen && campFormCount('reactor') > 0) {
      const reactor = createFormSite(world, 'reactor', 'reactor', taken, null, false);
      if (reactor) world.reactor = reactor;
    }
    if (campaign.lightOpen && campFormCount('light') > 0) {
      const pads = lightPads(world, taken);
      world.lights = [];
      pads.forEach(function (pad) {
        const mast = createFormSite(world, 'light-' + pad.side, 'light', taken, pad, pad.side === 'right');
        if (mast) world.lights.push(mast);
      });
    }
  }

  // A camp building with forms: its pad (sized for the largest form), form 1 to build.
  function createFormSite(world, id, kind, taken, at, flip) {
    const pad = campPadSize(kind);
    const site = createCampSite(world, id, pad.w, pad.d, null, taken, at);
    if (!site) return null;
    site.kind = kind;
    site.flip = !!flip;
    site.form = 0;
    site.forms = true;
    site.voxel = CAMP_VOXEL;
    site.h = pad.h;
    setCampForm(world, site, 1);
    return site;
  }

  // The two lighting masts: left and right of the building, level with its middle, a little out
  // from it (further out if something is in the way).
  function lightPads(world, taken) {
    const pad = campPadSize('light');
    const fp = world.level.footprint;
    const z0 = Math.round((fp.minZ + fp.maxZ) / 2 - pad.d / 2);
    const pads = [];
    [['left', -1], ['right', 1]].forEach(function (side) {
      for (let shift = 0; shift < 24; shift++) {
        const x0 = side[1] < 0 ? fp.minX - 5 - pad.w - shift : fp.maxX + 5 + shift;
        let clear = true;
        for (let z = z0 - 1; z <= z0 + pad.d && clear; z++) {
          for (let x = x0 - 1; x <= x0 + pad.w + 2 && clear; x++) clear = campCellFree(world, x, z, taken);
        }
        if (clear) {
          pads.push({ x: x0, z: z0, side: side[0] });
          break;
        }
      }
    });
    return pads;
  }

  function campSite(world, id) {
    for (let i = 0; i < (world.camp || []).length; i++) if (world.camp[i].id === id) return world.camp[i];
    return null;
  }

  // Shown and buildable once its site upgrade is bought.
  function campActive(world, site) {
    if (!site) return false;
    return (world.campaign.purchases[CAMP_NODES[site.kind]] || 0) >= 1;
  }

  // A level of a camp building above 1 + its meta «Уровни …» cannot be bought.
  function campCapped(campaign, node) {
    const max = { kitchen: campaign.canteenMaxLevel, sales: campaign.salesMaxLevel, dorm: campaign.dormMaxLevel, lounge: campaign.loungeMaxLevel, light: campaign.lightMaxLevel }[node];
    if (max === undefined) return false;
    return (campaign.purchases[node] || 0) >= (max || 1);
  }

  // ---------- dorm, lounge and lighting ----------
  // The dorm's beds: DORM.beds per level of the dorm that stands; who has one tonight (on the way or
  // asleep inside).
  // + «Двухъярусные койки».
  function dormBeds(world) {
    const dorm = world.dorm;
    return dorm && campActive(world, dorm) ? (DORM.beds || 3) * (dorm.form || 0) + campBoost(world.campaign, 'dormBeds') : 0;
  }

  // Sleep in the dorm: DORM.sleepScale as long, shorter with «Крепкий сон».
  function dormSleepScale(campaign) {
    return (DORM.sleepScale || 1) / campBoost(campaign, 'dormSleep');
  }

  function dormSleepers(world) {
    let count = 0;
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (builder.sleepPlace !== 'dorm') continue;
      if ((builder.phase === 'walk' && builder.walkPurpose === 'sleep') || (builder.phase === 'break' && builder.breakKind === 'sleep')) count += 1;
    }
    return count;
  }

  // The lounge's seats: LOUNGE.seats per level of the lounge that stands (the old level keeps
  // working while a new one goes up); who smokes at it now.
  function loungeSeats(world) {
    const lounge = world.lounge;
    return lounge && campActive(world, lounge) ? (LOUNGE.seats || 2) * (lounge.form || 0) + campBoost(world.campaign, 'loungeSeats') : 0;
  }

  function loungeSmokers(world) {
    let count = 0;
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (builder.phase === 'break' && builder.breakKind === 'smoke' && builder.smokePlace === 'lounge') count += 1;
    }
    return count;
  }

  // The night penalty the masts take off: lightReliefPerLevel per level of each standing mast.
  function lightRelief(world) {
    let relief = 0;
    const perLevel = lightReliefPerLevel(world.campaign);
    (world.lights || []).forEach(function (mast) {
      if (campActive(world, mast)) relief += perLevel * (mast.form || 0);
    });
    return Math.min(1, relief);
  }

  // LIGHT.reliefPerLevel, more with «Мощные прожекторы».
  function lightReliefPerLevel(campaign) {
    return (LIGHT.reliefPerLevel || 0.1) * campBoost(campaign, 'lightPower');
  }

  // The stack is taken away once the house stands: its cells are free ground again.
  function clearCampPile(world, site) {
    for (let i = 0; i < site.pile.length; i++) world.waterGrid[world.index.id(site.pile[i][0], 0, site.pile[i][2])] = 0;
  }

  // ---------- canteen ----------
  // Once it stands, the hungry eat at its door (a short meal) and take the dish of the day
  // (world.canteen.dish) until their next meal.

  // The meal there (meta «Короче обед»): CANTEEN.mealSeconds less a second per level.
  function canteenMealSeconds(world) {
    return world.campaign.canteenMealSeconds || CANTEEN.mealSeconds;
  }

  // «Полевая кухня» on the site: level 1 lets the crew build the canteen, every next level is a
  // canteen level (CANTEEN.seats seats each). A level above 1 + meta «Уровни столовой» cannot be bought.
  function canteenLevel(world) {
    return world.campaign.purchases.kitchen || 0;
  }

  function canteenActive(world) {
    return !!world.canteen && canteenLevel(world) >= 1;
  }

  function kitchenCapped(campaign) {
    return (campaign.purchases.kitchen || 0) >= (campaign.canteenMaxLevel || 1);
  }

  // Seats: CANTEEN.seats per level of the canteen that stands (a bought level counts once its
  // building is up) + meta «Места в столовой»; and who is eating there now.
  function canteenSeats(world) {
    const built = world.canteen ? world.canteen.form || 0 : 0;
    return (CANTEEN.seats || 2) * Math.max(1, built) + (world.campaign.canteenSeatBonus || 0);
  }

  // The level of the canteen that stands (0 — none yet).
  function canteenBuiltLevel(world) {
    return world.canteen ? world.canteen.form || 0 : 0;
  }

  function canteenEating(world) {
    let count = 0;
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (builder.phase === 'meal' && builder.mealPlace === 'canteen') count += 1;
    }
    return count;
  }

  // One try per hunger cycle, as soon as hunger reaches hungerDebuffFrom (at a desk visit with free
  // hands). A worker who finds every seat taken goes back to work; his hunger grows on, and at its
  // top he eats the classic way (far away in town), with no dish.
  function canteenDue(builder, world) {
    const canteen = world.canteen;
    return canteenActive(world) && canteen.form >= 1 && !builder.canteenTried && hungerFill(builder) >= BALANCE.hungerDebuffFrom;
  }

  function startCanteenMeal(builder, world) {
    const canteen = world.canteen;
    if (!canteenActive(world) || canteen.form < 1) return false;
    builder.canteenTried = true;
    const cell = canteen.eatCells[canteen.nextEat % canteen.eatCells.length];
    canteen.nextEat += 1;
    const path = sameCell(builder.cell, cell) ? [builder.cell.slice()] : findPathToCell(builder.cell, cell, world);
    if (!path) return false;
    builder.needTrip = 'meal';
    builder.mealPlace = 'canteen';
    builder.awayCell = cell.slice();
    beginWalk(builder, path, 'meal', world);
    return true;
  }

  // A meal ends: at the canteen the worker takes the menu of its standing level — the day dish(es) as a
  // bonus map, a pastry for later, the seasonal dishes, the chef's signature (with its per-meal effect);
  // a meal elsewhere leaves him nothing but the pastry he may still carry.
  function serveMenu(builder, world, atCanteen) {
    const canteen = world.canteen;
    const level = atCanteen && canteen ? Math.max(1, canteen.form || 0) : 0;
    builder.dish2 = level >= ROWS.dish2 ? canteen.dish2 || '' : '';
    builder.dishBonus = {};
    if (builder.dish) dayDishBonus(builder.dishBonus, builder.dish, world);
    if (builder.dish2) dayDishBonus(builder.dishBonus, builder.dish2, world);
    builder.ateTorte = builder.dish === 'napoleon' || builder.dish2 === 'napoleon';
    const kitchen = kitchenOf(world);
    builder.signature = level >= ROWS.signature && kitchen.level >= (KITCHEN.signatureKitchen || 5) ? canteen.signature || '' : '';
    if (!atCanteen) return;
    builder.grandDue = false;
    cookMeal(world);
    builder.snack = level >= ROWS.snack ? canteen.snack || '' : '';
    const signature = DISH[builder.signature];
    if (signature && signature.effect === 'feast') world.feastDishUntil = world.campaign.levelElapsed + (signature.seconds || 30);
    if (signature && signature.effect === 'mana' && world.campaign.manaMax > 0) {
      world.campaign.mana = Math.min(world.campaign.manaMax, (world.campaign.mana || 0) + signature.value);
    }
  }

  // The pastry, eaten where he stands once the hunger comes: the hunger closes (half a scale; «Шаурма» —
  // a full one), «Пончик» rushes his legs, «Кофе с собой» clears the wish to smoke. Not if the menu
  // changed since his meal: then he goes for the new dish and keeps the pastry. Next hunger — the canteen.
  function eatSnack(builder, world) {
    const canteen = world.canteen;
    const dish = DISH[builder.snack];
    if (!dish || !canteen) return;
    const dish2 = Math.max(1, canteen.form || 0) >= ROWS.dish2 ? canteen.dish2 || '' : '';
    if (canteen.dish !== builder.dish || dish2 !== (builder.dish2 || '')) return;
    const scale = rollHunger() + lineValue(world.campaign, 'satiety');
    builder.hunger = 0;
    builder.hungerScale = dish.snack === 'full' ? scale : scale / 2;
    if (dish.snack === 'rush') builder.rushUntil = world.campaign.levelElapsed + (dish.seconds || 40);
    if (dish.snack === 'smoke') builder.smokeNeed = 0;
    builder.snack = '';
    builder.canteenTried = false;
    world.events.push({ type: 'snack', builder: builder.index, dish: dish.id });
  }

  // A whole cube set: «Подарок за куб» rolls, and «Торт «Наполеон»» counts to its moment.
  function cubeSet(world) {
    // Whole cubes of the site (the kitchen calibration measures them a minute).
    world.cubesSet = (world.cubesSet || 0) + 1;
    rollCubeGift(world);
    countGrandDinner(world);
    const torte = DISH.napoleon;
    const canteen = world.canteen;
    if (!torte || !canteen || (canteen.dish !== 'napoleon' && canteen.dish2 !== 'napoleon')) return;
    world.torteCubes = (world.torteCubes || 0) + 1;
    if (world.torteCubes < (torte.cubes || 100)) return;
    world.torteCubes = 0;
    world.torteUntil = world.campaign.levelElapsed + (torte.seconds || 40);
    world.events.push({ type: 'torte' });
  }

  // ---------- the kitchen ----------
  function kitchenOf(world) {
    return world.kitchen || (world.kitchen = { level: 0, staff: [], xp: 0 });
  }

  // The chef's level by his experience (a canteen meal — 1).
  function chefLevel(world) {
    const xp = kitchenOf(world).xp;
    let level = 0;
    while (level < KITCHEN.chefLevels.length && xp >= KITCHEN.chefLevels[level]) level += 1;
    return level;
  }

  // How much stronger the chef makes the dishes: a share a chef level, bigger with a bigger kitchen.
  function chefPower(world) {
    const kitchen = kitchenOf(world);
    if (kitchen.level < 1) return 1;
    return 1 + chefLevel(world) * (KITCHEN.dishPerLevel[kitchen.level - 1] || 0);
  }

  // Workers the next kitchen level asks on top of those already in it; «Повар артели» in the crew stands
  // for the first level's staff.
  function kitchenStaffNeeded(world) {
    const kitchen = kitchenOf(world);
    if (kitchen.level >= KITCHEN.staff.length) return Infinity;
    const cook = world.campaign.foremen && world.campaign.foremen.feast ? KITCHEN.staff[0] : 0;
    // «Кухонный штат» of the office: fewer hands for every level.
    const office = world.campaign.office ? world.campaign.office.kitchenStaff || 0 : 0;
    return Math.max(0, KITCHEN.staff[kitchen.level] - cook - office - kitchen.staff.length);
  }

  // Who can go to the kitchen: plain workers (no foreman rank) at work, the last hired first.
  function kitchenCandidates(world) {
    return world.builders.filter(function (builder) {
      return builder.trade === 'builder' && !builder.kitchen && !builder.camp && !(builder.expertiseRank > 0) &&
        builder.phase !== 'taxi' && builder.phase !== 'meal' && builder.phase !== 'break';
    }).sort(function (a, b) { return b.index - a.index; });
  }

  // The kitchen never takes the last hands: KITCHEN.keepCrew plain workers stay on the site.
  function kitchenOpenable(world) {
    const canteen = world.canteen;
    return !!canteen && Math.max(1, canteen.form || 0) >= ROWS.kitchen && kitchenOf(world).level < KITCHEN.staff.length &&
      kitchenCandidates(world).length >= kitchenStaffNeeded(world) + kitchenKeep();
  }

  function kitchenKeep() {
    return KITCHEN.keepCrew === undefined ? 2 : KITCHEN.keepCrew;
  }

  // The next kitchen level: the workers it asks leave the crew for the site (their hands are emptied).
  function buyKitchen(world) {
    if (!kitchenOpenable(world)) return false;
    const kitchen = kitchenOf(world);
    const need = kitchenStaffNeeded(world);
    const pool = kitchenCandidates(world);
    for (let i = 0; i < need; i++) {
      kitchen.staff.push(pool[i].index);
      sendToKitchen(pool[i], world);
    }
    kitchen.level += 1;
    world.events.push({ type: 'kitchen', level: kitchen.level });
    return true;
  }

  function sendToKitchen(builder, world) {
    if (builder.carry.length > 0 || builder.plan.length > 0) {
      releaseBuilderDuties(builder, world, 'ушёл на кухню', 'kitchen');
      // Not an abandoned trip for the view: no «бросил ношу».
      world.events = world.events.filter(function (event) { return !(event.type === 'abandon' && event.builder === builder.index); });
    } else releaseHands(builder);
    builder.kitchen = true;
    builder.smokeNeed = 0;
    builder.hunger = 0;
    builder.fatigue = 0;
    const canteen = world.canteen;
    const cells = canteen ? canteen.eatCells : null;
    const cell = cells && cells.length ? cells[(cells.length - 1 - kitchenOf(world).staff.indexOf(builder.index) % cells.length + cells.length) % cells.length] : null;
    const path = cell ? (sameCell(builder.cell, cell) ? [builder.cell.slice()] : findPathToCell(builder.cell, cell, world)) : null;
    if (path && path.length > 1) beginWalk(builder, path, 'kitchen', world);
    else builder.phase = 'kitchen';
  }

  // A canteen meal is the chef's work: experience; from canteen level 4 every meal rolls for each secret
  // dish not found yet — its own chance (dish.chance, by its target day) × the company's discovery
  // multiplier (meta: grows a little with every cube) × the kitchen's own factor.
  function cookMeal(world) {
    const kitchen = kitchenOf(world);
    if (kitchen.level < 1) return;
    const before = chefLevel(world);
    // «Школа поваров» of the office: more experience a meal.
    kitchen.xp += world.campaign.office ? world.campaign.office.chef : 1;
    if (chefLevel(world) > before) world.events.push({ type: 'chefLevel', level: chefLevel(world) });
    const canteen = world.canteen;
    if (!canteen || Math.max(1, canteen.form || 0) < ROWS.secrets) return;
    const owned = world.campaign.canteenDishes || (world.campaign.canteenDishes = []);
    const factor = (world.campaign.discoveryMultiplier || 1) * (KITCHEN.discovery[kitchen.level - 1] || 1);
    CANTEEN.dishes.forEach(function (dish) {
      if (!dish.secret || owned.indexOf(dish.id) >= 0 || Math.random() >= (dish.chance || 0) * factor) return;
      owned.push(dish.id);
      world.events.push({ type: 'secretDish', dish: dish.id });
    });
  }

  // Grand dinners (canteen 5, kitchen 5, a grand dish picked): every KITCHEN.grandCubes whole cubes the
  // whole crew goes to dine; the dish's bonus stacks for the crew till the hand-over.
  function grandReady(world) {
    const canteen = world.canteen;
    return !!canteen && Math.max(1, canteen.form || 0) >= ROWS.grand && kitchenOf(world).level >= (KITCHEN.grandKitchen || 5) && !!DISH[canteen.grand];
  }

  function countGrandDinner(world) {
    if (!grandReady(world)) return;
    world.grandCubes = (world.grandCubes || 0) + 1;
    if (world.grandCubes < (KITCHEN.grandCubes || 200)) return;
    world.grandCubes = 0;
    const dish = DISH[world.canteen.grand];
    world.grandStacks = world.grandStacks || {};
    world.grandStacks[dish.effect] = (world.grandStacks[dish.effect] || 0) + dish.value;
    world.grandDinners = (world.grandDinners || 0) + 1;
    world.builders.forEach(function (builder) { if (builder.trade === 'builder' && !builder.kitchen && !builder.camp) builder.grandDue = true; });
    world.events.push({ type: 'grandDinner', dish: dish.id, count: world.grandDinners });
  }

  function setCanteenDish(world, id) {
    return setCanteenSlot(world, 'dish', id);
  }

  // A row of the menu: 'dish' and 'dish2' take day dishes, 'snack' a pastry ('' — «Без выпечки»),
  // 'signature' a chef's dish. A row opens with its canteen level; a dish needs a building of its level.
  const SLOT_ROW = { dish: 'day', dish2: 'day', snack: 'snack', signature: 'signature', grand: 'grand' };
  const SLOT_LEVEL = { dish: 'day', dish2: 'dish2', snack: 'snack', signature: 'signature', grand: 'grand' };
  function setCanteenSlot(world, slot, id) {
    const canteen = world.canteen;
    if (!canteen || !SLOT_ROW[slot]) return false;
    if (id === '' && slot !== 'dish') {
      canteen[slot] = '';
      return true;
    }
    const dish = DISH[id];
    if (!dish || (world.campaign.canteenDishes || []).indexOf(id) < 0 || dish.row !== SLOT_ROW[slot]) return false;
    if (Math.max(1, canteen.form || 0) < Math.max(dish.level || 1, ROWS[SLOT_LEVEL[slot]] || 1)) return false;
    if ((dish.kitchen || 0) > kitchenOf(world).level) return false;
    canteen[slot] = id;
    return true;
  }

  // ---------- sales office ----------
  // The same pattern as the canteen: the site upgrade «Офис продаж» (opened by the technology of the
  // same name) — level 1 lets the crew build it, every next level is an office level; a level above
  // 1 + meta «Уровни офиса продаж» cannot be bought. Once it stands it earns site coins on its own,
  // paid every SALES.payoutSeconds:
  //   (SALES.levelRate × office level + «Менеджеры» + «Шоу-рум» × built cubes of the main building)
  //   × (1 + SALES.levelBonus × (office level − 1)).
  // «Менеджеры» and «Шоу-рум» are bought in the office for site coins; a manager level costs its
  // gain × payback (the first: +5 coins/s for 300 — back in a minute). Fixed numbers for now.
  function salesLevel(world) {
    return world.campaign.purchases.sales || 0;
  }

  function salesActive(world) {
    return !!world.sales && salesLevel(world) >= 1;
  }

  // The level of the office that stands (0 — none yet): its income counts from it. An office of
  // whole cells (no forms) is at the level bought once built.
  function salesBuiltLevel(world) {
    const sales = world.sales;
    if (!sales) return 0;
    if (sales.forms) return sales.form || 0;
    return sales.ready ? salesLevel(world) : 0;
  }

  function salesCapped(campaign) {
    return (campaign.purchases.sales || 0) >= (campaign.salesMaxLevel || 1);
  }

  function salesBuiltCubes(world) {
    return world.blocks.length - world.remaining;
  }

  // Income of «Менеджеры» at `level`, coins per second: the sum of their per-level gains.
  function salesManagersIncome(level) {
    const spec = SALES.upgrades.managers;
    let income = 0;
    for (let i = 0; i < level; i++) income += spec.gain * Math.pow(spec.gainGrowth, i);
    return income;
  }

  // «Шоу-рум»: coins per second for every cube of the main building already built.
  function salesShowroomIncome(world) {
    const sales = world.sales;
    return sales ? SALES.upgrades.showroom.perCube * sales.upgrades.showroom * salesBuiltCubes(world) : 0;
  }

  // The office level's share of everything: +SALES.levelBonus per level above the first, times
  // «Реклама» of the site graph.
  function salesMultiplier(world) {
    return (1 + (SALES.levelBonus || 0) * Math.max(0, salesBuiltLevel(world) - 1)) * campBoost(world.campaign, 'salesAds');
  }

  // Coins per second now (0 until the office stands).
  function salesRate(world) {
    const sales = world.sales;
    if (!salesActive(world) || salesBuiltLevel(world) < 1) return 0;
    const base = SALES.levelRate * salesBuiltLevel(world) + salesManagersIncome(sales.upgrades.managers) + salesShowroomIncome(world);
    // «Тендерный отдел» of the office.
    return base * salesMultiplier(world) * (world.campaign.office ? world.campaign.office.sales : 1);
  }

  // The next level of an office upgrade: managers — +coins/s (with the office multiplier) and the
  // payback in seconds; showroom — +coins/s per built cube. Null at the maximum.
  function salesOffer(world, kind) {
    const sales = world.sales;
    const spec = SALES.upgrades[kind];
    if (!sales || !spec) return null;
    const level = sales.upgrades[kind];
    if (level >= spec.max) return null;
    const mult = salesMultiplier(world);
    if (kind === 'managers') {
      const gain = spec.gain * Math.pow(spec.gainGrowth, level);
      const cost = Math.max(1, Math.round(gain * spec.payback * Math.pow(spec.paybackGrowth, level)));
      return { level: level, max: spec.max, gain: gain * mult, payback: cost / (gain * mult), cost: cost };
    }
    return { level: level, max: spec.max, gain: spec.perCube * mult, cost: Math.max(1, Math.round(spec.cost * Math.pow(spec.costGrowth, level))) };
  }

  function buySalesUpgrade(world, kind) {
    const campaign = world.campaign;
    const offer = salesOffer(world, kind);
    if (!offer || salesBuiltLevel(world) < 1 || (!campaign.freePurchases && campaign.coins < offer.cost)) return false;
    if (!campaign.freePurchases) campaign.coins -= offer.cost;
    world.sales.upgrades[kind] += 1;
    world.events.push({ type: 'salesUpgrade', kind: kind, cost: campaign.freePurchases ? 0 : offer.cost });
    return true;
  }

  function stepSales(world, dt) {
    const sales = world.sales;
    if (!sales || salesBuiltLevel(world) < 1 || !salesActive(world)) return;
    sales.bank += salesRate(world) * dt;
    sales.clock += dt;
    if (sales.clock < SALES.payoutSeconds) return;
    sales.clock -= SALES.payoutSeconds;
    const coins = Math.floor(sales.bank);
    if (coins <= 0) return;
    sales.bank -= coins;
    sales.earned += coins;
    world.campaign.coins += coins;
    world.campaign.coinsEarned = (world.campaign.coinsEarned || 0) + coins;
    world.events.push({ type: 'salesPay', coins: coins });
  }

  // ---------- camp construction ----------
  // The crew builds a camp building by the laws of the main site: a cube is set from a cell next to
  // it that the pattern of reach allows (canBuildBlockFrom), reached by the same routes that erect
  // ladders and decks (findRouteAStar); set cubes are solid cells (walls to lean ladders on, roofs
  // to walk on). Only the material differs: it comes from the building's own stack. Each worker
  // takes the next free cubes of the form (cube.owner) and sets them bottom-up: a cube waits for
  // the one under it, if the form has one.
  function workerCount(world) {
    let count = 0;
    for (let i = 0; i < world.builders.length; i++) if (world.builders[i].trade === 'builder') count += 1;
    return count;
  }

  function campCrew(world, site) {
    let count = 0;
    for (let i = 0; i < world.builders.length; i++) if (world.builders[i].camp === site) count += 1;
    return count;
  }

  // Cubes nobody has: not set and not in anyone's hands (site.taken — cubes in hands).
  function campLeft(world, site) {
    return site ? site.total - site.built - (site.taken || 0) : 0;
  }

  // Some camp building going up has fewer workers than its slider asks for.
  function campShort(world) {
    if (!world.camp) return false;
    for (let i = 0; i < world.camp.length; i++) {
      const site = world.camp[i];
      if (campActive(world, site) && !site.ready && campCrew(world, site) < site.assigned && campLeft(world, site) > 0) return true;
    }
    return false;
  }

  // Free hands and no started cube (at the desk or between trips of a plan): joins the crew of the
  // first camp building that is short of the workers its slider asks for.
  function joinCamp(builder, world) {
    if (builder.trade !== 'builder' || !world.camp || world.camp.length === 0) return false;
    for (let i = 0; i < builder.plan.length; i++) {
      if (!builder.plan[i].built && builder.plan[i].poured > 0) return false;
    }
    for (let i = 0; i < world.camp.length; i++) {
      const site = world.camp[i];
      if (!campActive(world, site) || site.ready) continue;
      if (campCrew(world, site) >= site.assigned || campLeft(world, site) <= 0) continue;
      releaseUnstartedPlan(builder, world);
      cancelRoute(builder, world);
      builder.camp = site;
      builder.campCubes = [];
      if (startCampTrip(builder, world)) return true;
      builder.camp = null;
    }
    return false;
  }

  // Seconds to set a camp cube: as on the main site, by its material — a camp cube is set whole, so
  // as all grid³ mini-cubes of a main-site cube. «Типовые проекты» speed up every camp building.
  function campPieceSeconds(builder, world, site, cube) {
    const grid = MATERIAL[cube.materialId].grid;
    return builderPlaceSeconds(builder, world, cube) * grid * grid * grid / campBoost(world.campaign, 'campPrefab') /
      (world.campaign.office ? world.campaign.office.camp : 1);
  }

  // The cube can go in now — the main site's rule (isSupported): on the ground, or a set cube of the
  // building under it or beside it.
  function campSupported(site, cube) {
    if (cube.y === 0) return true;
    if (campDoneAt(site, cube.x, cube.y - 1, cube.z)) return true;
    for (let d = 0; d < DIRS.length; d++) {
      if (campDoneAt(site, cube.x + DIRS[d][0], cube.y, cube.z + DIRS[d][1])) return true;
    }
    return false;
  }

  function campCubeAt(site, x, y, z) {
    const k = site.cellIndex ? site.cellIndex.get(cellKey(x, y, z)) : undefined;
    return k === undefined ? null : site.cubes[k];
  }

  function campDoneAt(site, x, y, z) {
    const cube = campCubeAt(site, x, y, z);
    return !!cube && cube.done;
  }

  // The main site's canCompleteAfter for a camp cube: it can go in once the set cubes and the ones
  // taken for this trip (`chosen` — their cell keys) are in.
  function campCanCompleteAfter(site, cube, chosen) {
    if (campSupported(site, cube)) return true;
    if (chosen.has(cellKey(cube.x, cube.y - 1, cube.z))) return true;
    for (let d = 0; d < DIRS.length; d++) {
      if (chosen.has(cellKey(cube.x + DIRS[d][0], cube.y, cube.z + DIRS[d][1]))) return true;
    }
    return false;
  }

  // The camp building's cubes as the main site's planning rules see them (sealsOther).
  function campCubesView(site) {
    if (!site.cubesView) {
      site.cubesView = {
        at: function (world, x, y, z) { return campCubeAt(site, x, y, z); },
        built: function (cube) { return cube.done; },
        ready: function (cube) { return campSupported(site, cube); },
        reserved: function (cube) { return cube.owner >= 0; },
      };
    }
    return site.cubesView;
  }

  // Cubes still to set that can never get support (the main site's unbuildableBlocks): support
  // spreads from the set cubes through the rest by the same rule; whatever it never reaches floats.
  function campUnbuildable(site) {
    const reached = new Set();
    const solid = function (x, y, z) {
      const k = site.cellIndex.get(cellKey(x, y, z));
      return k !== undefined && (site.cubes[k].done || reached.has(k));
    };
    let grew = true;
    while (grew) {
      grew = false;
      for (let k = 0; k < site.cubes.length; k++) {
        const cube = site.cubes[k];
        if (cube.done || reached.has(k)) continue;
        let ok = cube.y === 0 || solid(cube.x, cube.y - 1, cube.z);
        for (let d = 0; d < DIRS.length && !ok; d++) ok = solid(cube.x + DIRS[d][0], cube.y, cube.z + DIRS[d][1]);
        if (ok) {
          reached.add(k);
          grew = true;
        }
      }
    }
    let left = 0;
    for (let k = 0; k < site.cubes.length; k++) if (!site.cubes[k].done && !reached.has(k)) left += 1;
    return left;
  }

  // His cubes go back to the stack (a break, the slider, the building came down).
  function releaseCampCubes(builder) {
    const site = builder.camp;
    const cubes = builder.campCubes || [];
    if (site && site.cubes) {
      for (let i = 0; i < cubes.length; i++) {
        const cube = site.cubes[cubes[i]];
        if (cube && !cube.done && cube.owner === builder.index) {
          cube.owner = -1;
          site.taken = Math.max(0, (site.taken || 0) - 1);
        }
      }
    }
    builder.campCubes = [];
    builder.campCarry = 0;
  }

  // From this cell (and its ladder or deck) the cube is within reach, as on the main site.
  function canSetCampFrom(cell, cube, world) {
    const index = world.index;
    if (!index.inside(cell[0], cell[1], cell[2])) return false;
    return canBuildBlockFrom(cell[0], cell[1], cell[2], buildSurfaceMode(cell[0], cell[1], cell[2], world), cube, world);
  }

  // To a cell (the stack): an ordinary path, else a route that erects ladders and decks (down off a
  // roof). The walk's purpose (or the route's camp goal) says what he does there.
  function campWalkTo(builder, world, cell, purpose) {
    const path = sameCell(builder.cell, cell) ? [builder.cell.slice()] : findPathToCell(builder.cell, cell, world);
    if (path) {
      beginWalk(builder, path, purpose, world);
      return true;
    }
    if (!SCAFFOLD.enabled) return false;
    const started = performance.now();
    const route = findRouteAStar(world, null, builder.cell, true, [world.index.id(cell[0], cell[1], cell[2])], Infinity, false, false, true);
    world.metrics.scaffoldSearch += performance.now() - started;
    if (!route) return false;
    route.home = false;
    route.camp = purpose;
    route.owner = builder.index;
    builder.routeId = route.id;
    builder.routeTargetId = -1;
    return continueCampRoute(builder, world);
  }

  // A route to a cell one of `targets` (his cubes that can go in now: x, y, z, id — the cube's index)
  // can be set from: the main site's search (routeToPending).
  function campRouteTo(builder, world, targets) {
    const route = routeToPending(builder, world, targets);
    if (!route) return null;
    route.camp = 'set';
    return route;
  }

  // One more step of a camp route (a walk step or a piece to erect); false once it is over.
  function continueCampRoute(builder, world) {
    const progress = continueRoute(builder, world);
    if (progress === ROUTE_STARTED) return true;
    if (progress === ROUTE_WAITING) {
      builder.phase = 'idle';
      builder.wait = 0.1;
      builder.waitReason = 'path';
      return true;
    }
    return false;
  }

  // A camp worker between steps (a route step walked, a piece erected, a wait over): on along his
  // route, then to his next cube or back to the stack.
  function resumeCamp(builder, world) {
    const site = builder.camp;
    if (campStalled(builder, world)) return;
    if (builder.routeId >= 0 && world.routes[builder.routeId].camp) {
      if (continueCampRoute(builder, world)) return;
    }
    if (!site || site.ready) {
      leaveCamp(builder, world);
      return;
    }
    if (builder.campCarry > 0) {
      walkToCampCube(builder, world);
      return;
    }
    if (sameCell(builder.cell, site.pickStand)) {
      beginCampFetch(builder, world);
      return;
    }
    continueCamp(builder, world);
  }

  function startCampTrip(builder, world) {
    const site = builder.camp;
    if (!site || campLeft(world, site) <= 0) return false;
    return campWalkTo(builder, world, site.pickStand, 'campFetch');
  }

  // At the stack: the cubes of the trip, chosen as the main site plans its cubes (reservePlan): the
  // first free cube in the building order that can go in now and walls in no other, then, near it
  // (loadRadius), the next ones that will stand on the set cubes or on the ones taken — as many as
  // the carry takes (at least one, at most CANTEEN.maxCarry; a camp cube is whole: its full mass in
  // the hands). Cubes put off for having no route wait until the site changes (failedNavSerial).
  // Picking goes by mass like at a quarry. Nothing to take now: he waits a moment.
  function beginCampFetch(builder, world) {
    const site = builder.camp;
    if (!site || campLeft(world, site) <= 0) {
      leaveCamp(builder, world);
      return;
    }
    const capacity = carryKg(world.campaign, builder);
    const view = campCubesView(site);
    const picks = [];
    const chosen = new Set();
    const planned = new Set();
    let kg = 0;
    let mass = 0;
    const free = function (cube) {
      return !cube.done && cube.owner < 0 && cube.failedNavSerial !== world.navSerial;
    };
    const take = function (k, weight) {
      const cube = site.cubes[k];
      kg += weight;
      mass += MATERIAL[cube.materialId].weight;
      picks.push(k);
      chosen.add(cellKey(cube.x, cube.y, cube.z));
      planned.add(world.index.id(cube.x, cube.y, cube.z));
    };
    const weightOf = function (cube) {
      const material = MATERIAL[cube.materialId];
      return carryWeight(world.campaign, cube.materialId) * material.weight / material.cell;
    };
    let anchor = null;
    for (let k = 0; k < site.cubes.length; k++) {
      const cube = site.cubes[k];
      if (!free(cube) || !campSupported(site, cube) || sealsOther(cube, world, planned, view)) continue;
      anchor = cube;
      take(k, weightOf(cube));
      break;
    }
    let added = anchor !== null && kg <= capacity;
    while (added && picks.length < CANTEEN.maxCarry) {
      added = false;
      for (let k = 0; k < site.cubes.length && picks.length < CANTEEN.maxCarry; k++) {
        const cube = site.cubes[k];
        if (!free(cube) || chosen.has(cellKey(cube.x, cube.y, cube.z))) continue;
        if (Math.max(Math.abs(cube.x - anchor.x), Math.abs(cube.z - anchor.z)) > BALANCE.loadRadius) continue;
        const weight = weightOf(cube);
        if (kg + weight > capacity) continue;
        if (!campCanCompleteAfter(site, cube, chosen)) continue;
        if (sealsOther(cube, world, planned, view)) continue;
        take(k, weight);
        added = true;
      }
    }
    if (picks.length === 0) {
      builder.phase = 'idle';
      builder.wait = 0.5;
      builder.waitReason = 'front';
      return;
    }
    for (let i = 0; i < picks.length; i++) site.cubes[picks[i]].owner = builder.index;
    site.taken = (site.taken || 0) + picks.length;
    builder.campCubes = picks;
    builder.campCarry = picks.length;
    builder.campHops = 0;
    builder.campStall = 0;
    builder.phase = 'campFetch';
    builder.actionT = 0;
    builder.timer = workSeconds(builder, mass * world.level.pace /
      (sessionValue('pickup', world.campaign.purchases.pickup) * world.campaign.metaPickupSpeed)) / dishBoost(builder, 'pickup');
    builder.faceX = site.pile[0][0];
    builder.faceZ = site.pile[0][2];
  }

  // Routes in a row to his cubes that ended without one of them in reach (the site changed on the way).
  const CAMP_ROUTE_TRIES = 4;

  // To his cubes, as on the main site: one that can go in now and is in reach from where he stands is
  // set; else a route to a cell one of them can be set from (all of them at once). None of them can go
  // in yet (the cube under it is someone else's): he waits a moment. No route: they are put off until
  // the site changes and he drops them and gets out (abandonJobAndRecover), as on the main site.
  function walkToCampCube(builder, world) {
    const site = builder.camp;
    if (!site || builder.campCarry <= 0 || site.built >= site.total) {
      releaseCampCubes(builder);
      continueCamp(builder, world);
      return;
    }
    const targets = [];
    const cubes = builder.campCubes;
    for (let i = 0; i < cubes.length; i++) {
      const cube = site.cubes[cubes[i]];
      if (cube.done || !campSupported(site, cube)) continue;
      if (canSetCampFrom(builder.cell, cube, world)) {
        builder.campIndex = cubes[i];
        beginCampBuild(builder, world);
        return;
      }
      targets.push({ x: cube.x, y: cube.y, z: cube.z, id: cubes[i] });
    }
    if (targets.length === 0) {
      builder.phase = 'idle';
      builder.wait = 0.5;
      builder.waitReason = 'front';
      return;
    }
    if (builder.campHops < CAMP_ROUTE_TRIES && campRouteTo(builder, world, targets)) {
      builder.campHops += 1;
      if (continueCampRoute(builder, world)) return;
      builder.phase = 'idle';
      builder.wait = 0.1;
      builder.waitReason = 'path';
      return;
    }
    for (let i = 0; i < cubes.length; i++) site.cubes[cubes[i]].failedNavSerial = world.navSerial;
    abandonJobAndRecover(builder, world, 'Не найден маршрут к кубам городка из ноши', 'route');
  }

  // Someone else stands in the cube's cell (or steps into it): the cube waits for him to leave. As on
  // the main site the crew may stand where a cube is still to go; one who only waits there is asked
  // to step aside.
  function campCellTaken(builder, world, cube) {
    const cell = [cube.x, cube.y, cube.z];
    for (let i = 0; i < world.builders.length; i++) {
      const other = world.builders[i];
      if (other === builder || other.trade !== 'builder') continue;
      if (other.phase === 'walk' && other.to && sameCell(other.to, cell)) return true;
      if (!sameCell(other.cell, cell)) continue;
      if (other.phase === 'idle' || other.phase === 'plan') stepAside(other, world, cell);
      return true;
    }
    return false;
  }

  // One step off `cell` to a free cell to stand in (not another cube still to set, if he can help it).
  function stepAside(builder, world, cell) {
    const index = world.index;
    let best = null;
    for (let dy = 0; dy <= 1 && !best; dy++) {
      for (let d = 0; d < DIRS.length; d++) {
        const x = cell[0] + DIRS[d][0];
        const y = cell[1] + dy;
        const z = cell[2] + DIRS[d][1];
        if (!canStand(x, y, z, world)) continue;
        const path = findPathToCell(builder.cell, [x, y, z], world);
        if (!path || path.length > 4) continue;
        const future = (world.campGrid[index.id(x, y, z)] & CAMP_FUTURE) !== 0;
        if (!best || (best.future && !future)) best = { path: path, future: future };
        if (!future) break;
      }
    }
    if (!best) return false;
    cancelRoute(builder, world);
    beginWalk(builder, best.path, 'route', world);
    return true;
  }

  function beginCampBuild(builder, world) {
    const site = builder.camp;
    const cube = site && site.cubes[builder.campIndex];
    if (!cube || cube.done) {
      walkToCampCube(builder, world);
      return;
    }
    // Out of reach (the site changed): to his cubes again.
    if (!canSetCampFrom(builder.cell, cube, world)) {
      walkToCampCube(builder, world);
      return;
    }
    if (campCellTaken(builder, world, cube)) {
      builder.phase = 'idle';
      builder.wait = 0.3;
      builder.waitReason = 'path';
      return;
    }
    builder.phase = 'campBuild';
    builder.actionT = 0;
    builder.timer = campPieceSeconds(builder, world, site, cube);
    builder.faceX = cube.x;
    builder.faceZ = cube.z;
  }

  function finishCampBuild(builder, world) {
    const site = builder.camp;
    const cube = site && site.cubes[builder.campIndex];
    if (cube && !cube.done) {
      if (campCellTaken(builder, world, cube)) {
        builder.campStall = (builder.campStall || 0) + 0.3;
        if (campStalled(builder, world)) return;
        builder.timer = 0.3;
        return;
      }
      builder.campStall = 0;
      if (cube.owner === builder.index) site.taken = Math.max(0, (site.taken || 0) - 1);
      setCampCube(world, site, builder.campIndex);
      world.events.push({ type: 'campCube', site: site, index: builder.campIndex, builder: builder });
      campReadyCheck(world, site);
    }
    builder.campCubes = (builder.campCubes || []).filter(function (k) { return !site.cubes[k].done; });
    builder.campCarry = builder.campCubes.length;
    if (builder.campCarry > 0 && !site.ready) {
      builder.campHops = 0;
      walkToCampCube(builder, world);
      return;
    }
    releaseCampCubes(builder);
    continueCamp(builder, world);
  }

  // Cube k of the camp building is set: a solid cell.
  function setCampCube(world, site, k) {
    const cube = site.cubes[k];
    cube.done = true;
    cube.owner = -1;
    site.built += 1;
    site.stall = 0;
    campCell(world, cube, 1);
    invalidateNav(world, cube.x, cube.y, cube.z);
  }

  function campReadyCheck(world, site) {
    if (site.built < site.total) return;
    site.ready = true;
    site.scaffolded = true;
    if (site.target) site.form = site.target;
    clearCampPile(world, site);
    world.events.push({ type: 'campReady', site: site });
  }

  // The main site's stall rule for the camp building as a whole (resolveConstructionStall): nobody
  // has had its cubes in hand for constructionStallSeconds and no cube went in, and what is left is
  // only floating cubes (nothing can ever support them) or a sliver of the building — it is finished
  // so the building never hangs.
  function stepCampStall(world, dt) {
    for (let i = 0; i < world.camp.length; i++) {
      const site = world.camp[i];
      if (!site.cubes || site.ready || !site.assigned || !campActive(world, site)) continue;
      let busy = false;
      for (let b = 0; b < world.builders.length && !busy; b++) busy = world.builders[b].camp === site && world.builders[b].campCarry > 0;
      site.stall = busy ? 0 : (site.stall || 0) + dt;
      if (site.stall < BALANCE.constructionStallSeconds) continue;
      site.stall = 0;
      const left = site.total - site.built;
      if (left / site.total >= BALANCE.unreachableCompletionRatio && campUnbuildable(site) < left) continue;
      for (let b = 0; b < world.builders.length; b++) {
        if (world.builders[b].camp === site) releaseCampCubes(world.builders[b]);
      }
      for (let k = 0; k < site.cubes.length; k++) if (!site.cubes[k].done) setCampCube(world, site, k);
      site.taken = 0;
      world.events.push({ type: 'campAutofill', site: site, cubes: left });
      campReadyCheck(world, site);
    }
  }

  // After a trip: another one while the building still wants him (hunger or a smoke first).
  function continueCamp(builder, world) {
    const site = builder.camp;
    if (!site || site.ready || campCrew(world, site) > site.assigned || campLeft(world, site) <= 0) {
      leaveCamp(builder, world);
      return;
    }
    if (departIfNeeded(builder, world)) return;
    if (!startCampTrip(builder, world)) leaveCamp(builder, world);
  }

  // Back to the desk and the main building (releaseHands gives the cubes back and clears the flags).
  function leaveCamp(builder, world) {
    cancelRoute(builder, world);
    beginExit(builder, world);
  }

  // The scaffolds round a finished camp building come down once nobody stands on them.
  function stripCampScaffolds(world) {
    for (let s = 0; s < world.camp.length; s++) {
      const site = world.camp[s];
      if (!site.ready || !site.scaffolded) continue;
      const x0 = site.x - 1;
      const x1 = site.x + site.w;
      const z0 = site.z - 1;
      const z1 = site.z + site.d;
      const inside = function (x, z) { return x >= x0 && x <= x1 && z >= z0 && z <= z1; };
      let busy = false;
      for (let i = 0; i < world.builders.length && !busy; i++) {
        const b = world.builders[i];
        if (b.trade !== 'builder') continue;
        if ((b.cell[1] > 0 && inside(b.cell[0], b.cell[2])) || (b.erectPiece && inside(b.erectPiece.x, b.erectPiece.z))) busy = true;
      }
      if (busy) continue;
      let removed = 0;
      const strip = function (piece, grid) {
        if (piece.removed || !inside(piece.x, piece.z)) return;
        piece.reserved = false;
        piece.built = false;
        piece.removed = true;
        resetWear(piece, world);
        grid[world.index.id(piece.x, piece.y, piece.z)] = 0;
        invalidateNav(world, piece.x, piece.y, piece.z);
        removed += 1;
      };
      world.scaffoldPieces.forEach(function (piece) { strip(piece, world.mastGrid); });
      world.scaffoldDecks.forEach(function (deck) { strip(deck, world.deckGrid); });
      site.scaffolded = false;
      if (removed > 0) world.events.push({ type: 'strip' });
    }
  }

  // The main site's stall rule for a camp worker: waited constructionStallSeconds without setting a
  // cube (the one under his never comes, a cell never clears) — he drops his cubes and gets out as on
  // the main site (abandonJobAndRecover), then comes back for a new trip.
  function campStalled(builder, world) {
    if (!(builder.campStall >= BALANCE.constructionStallSeconds)) return false;
    builder.campStall = 0;
    abandonJobAndRecover(builder, world, 'Ждал на городке ' + BALANCE.constructionStallSeconds + ' секунд', 'stall');
    return true;
  }

  function setCampCrew(world, id, count) {
    const site = campSite(world, id);
    if (!site) return;
    site.assigned = Math.max(0, Math.min(workerCount(world), Math.round(count)));
  }

  // Saved with the site: progress and the slider of every camp building, the canteen's dish, the
  // sales office's upgrades and earnings.
  function campState(world) {
    const state = {};
    (world.camp || []).forEach(function (site) {
      const entry = { built: site.built, assigned: site.assigned };
      if (site.target) {
        entry.form = site.form;
        entry.target = site.target;
        // Cubes are set out of order a little (each worker his own): the unset ones before the
        // last set one.
        let last = -1;
        for (let i = 0; i < site.cubes.length; i++) if (site.cubes[i].done) last = i;
        const gaps = [];
        for (let i = 0; i < last; i++) if (!site.cubes[i].done) gaps.push(i);
        if (gaps.length) entry.gaps = gaps;
      }
      if (site.id === 'canteen') {
        entry.dish = site.dish;
        entry.dish2 = site.dish2 || '';
        entry.snack = site.snack || '';
        entry.signature = site.signature || '';
        entry.grand = site.grand || '';
        entry.kitchen = world.kitchen ? { level: world.kitchen.level, staff: world.kitchen.staff.slice(), xp: world.kitchen.xp } : null;
        entry.grandCubes = world.grandCubes || 0;
        entry.grandStacks = Object.assign({}, world.grandStacks || {});
        entry.grandDinners = world.grandDinners || 0;
      }
      if (site.id === 'sales') {
        entry.upgrades = Object.assign({}, site.upgrades);
        entry.bank = site.bank;
        entry.earned = site.earned;
      }
      state[site.id] = entry;
    });
    return state;
  }

  // A camp building with forms on a saved site: the standing form and the one going up. A save from
  // before the forms: a finished building (the old canteen of 46 cubes, office of 38) is form 1.
  function restoreCampForm(world, site, entry) {
    const max = campFormCount(site.kind);
    const legacy = entry.form === undefined;
    const old = site.kind === 'canteen' ? 46 : site.kind === 'sales' ? 38 : Infinity;
    const form = Math.max(0, Math.min(max, Math.floor(legacy ? (entry.built >= old ? 1 : 0) : entry.form || 0)));
    const target = Math.max(1, Math.min(max, Math.floor(legacy ? Math.max(1, form) : entry.target || 1)));
    site.form = form;
    setCampForm(world, site, Math.max(form, target));
    const building = target > form;
    const gaps = building && Array.isArray(entry.gaps) ? entry.gaps : [];
    markCampBuilt(world, site, building ? (legacy ? 0 : Math.max(0, Math.min(site.total, Math.floor(entry.built || 0) + gaps.length))) : site.total, gaps);
    site.ready = site.built >= site.total;
    if (site.ready) {
      site.form = site.target;
      clearCampPile(world, site);
    }
  }

  function restoreCamp(world, data) {
    if (!data) return;
    (world.camp || []).forEach(function (site) {
      const entry = data[site.id];
      if (!entry) return;
      if (site.target) {
        restoreCampForm(world, site, entry);
      } else {
        site.built = Math.max(0, Math.min(site.total, Math.floor(entry.built || 0)));
        site.ready = site.built >= site.total;
        if (site.ready) clearCampPile(world, site);
      }
      site.assigned = Math.max(0, Math.floor(entry.assigned || 0));
      if (site.id === 'canteen' && entry.dish && (world.campaign.canteenDishes || []).indexOf(entry.dish) >= 0) site.dish = entry.dish;
      if (site.id === 'canteen') {
        if (entry.kitchen) world.kitchen = { level: entry.kitchen.level || 0, staff: (entry.kitchen.staff || []).slice(), xp: entry.kitchen.xp || 0 };
        world.grandCubes = entry.grandCubes || 0;
        world.grandStacks = Object.assign({}, entry.grandStacks || {});
        world.grandDinners = entry.grandDinners || 0;
        ['dish2', 'snack', 'signature', 'grand'].forEach(function (slot) {
          if (entry[slot] !== undefined && (entry[slot] === '' || (world.campaign.canteenDishes || []).indexOf(entry[slot]) >= 0)) site[slot] = entry[slot];
        });
      }
      if (site.id === 'sales' && entry.upgrades) {
        Object.keys(site.upgrades).forEach(function (kind) {
          site.upgrades[kind] = Math.max(0, Math.min(SALES.upgrades[kind].max, Math.floor(entry.upgrades[kind] || 0)));
        });
        site.bank = entry.bank || 0;
        site.earned = entry.earned || 0;
      }
    });
  }

  // Dev: camp building id stands finished as form n (MicroBuildersDebug.campForm); collapse — the
  // old one comes down with the show.
  function debugCampForm(world, id, n, collapse) {
    const sites = id === 'light' ? world.lights || [] : [campSite(world, id)];
    if (!sites[0] || !sites[0].target) return false;
    sites.forEach(function (site) {
      world.builders.forEach(function (builder) { if (builder.camp === site) releaseHands(builder); });
      const old = collapse && site.form >= 1 ? site.cubes : [];
      setCampForm(world, site, Math.max(1, Math.min(campFormCount(site.kind), n)));
      markCampBuilt(world, site, site.total);
      site.form = site.target;
      site.ready = true;
      clearCampPile(world, site);
      const node = CAMP_NODES[site.kind];
      world.campaign.purchases[node] = Math.max(world.campaign.purchases[node] || 0, site.form);
      world.events.push({ type: 'campReform', site: site, old: old });
    });
    return true;
  }

  // Level info «Тайминги»: worker-seconds of every state and sub-state, summed over the crew.
  function timeEntry(builder) {
    const phase = builder.phase;
    if (builder.kitchen) return ['Городок', 'Кухня'];
    const purpose = builder.walkPurpose;
    const loaded = builder.carry.length > 0;
    if (phase === 'meal') return ['Обед', 'Еда'];
    if (phase === 'campFetch') return ['Городок', 'Набор материала'];
    if (phase === 'campBuild') return ['Городок', 'Укладка'];
    // On a camp building: its scaffolds, routes and waits count to the camp.
    if (builder.camp && phase === 'erect') return ['Городок', builder.erectPiece && builder.erectPiece.broken ? 'Ремонт лесов' : 'Установка лесов'];
    if (builder.camp && phase === 'idle') return ['Городок', 'Ожидание'];
    if (builder.camp && phase === 'walk' && (purpose === 'route' || purpose === 'erect')) return ['Городок', 'Ходьба'];
    if (phase === 'break') return builder.breakKind === 'sleep' ? ['Сон', 'Сон'] : builder.breakKind === 'rest' ? ['Отдых', 'Отдых'] : ['Перекур', 'Курение'];
    // An empty re-plan is the same desk cycle, but the worker is waiting for free cubes.
    if (phase === 'plan') return builder.waitReason === 'front' ? ['Ожидание', 'Нет свободных кубов'] : ['План работ', 'Получение плана'];
    if (phase === 'mine') return ['Набор материала', 'Набор в карьере'];
    if (phase === 'place') return ['Укладка', 'Установка куба'];
    if (phase === 'erect') return ['Леса и проходы', builder.erectPiece && builder.erectPiece.broken ? 'Ремонт лесов' : 'Установка лесов'];
    if (phase === 'passage') return ['Леса и проходы', 'Пробивка прохода'];
    if (phase === 'idle') {
      if (builder.waitReason === 'path') return ['Ожидание', 'Ждёт проход'];
      if (builder.waitReason === 'front') return ['Ожидание', 'Нет свободных кубов'];
      return ['Ожидание', loaded ? 'С грузом, ждёт место' : 'Без задачи'];
    }
    if (phase === 'recover') return ['Аварийный возврат', 'Поиск выхода'];
    if (phase === 'taxi') return ['Аэротакси', builder.taxiRiding ? 'Полёт' : 'Посадка'];
    if (phase !== 'walk') return ['Прочее', phase];
    if (purpose === 'meal') return ['Обед', 'Путь к месту обеда'];
    if (purpose === 'sleep') return ['Сон', 'Путь в бытовки'];
    if (purpose === 'campFetch') return ['Городок', 'Ходьба'];
    if (purpose === 'smoke') return ['Перекур', 'Путь на перекур'];
    if (purpose === 'mine') return ['Набор материала', loaded ? 'Переход между карьерами' : 'Путь к карьеру'];
    if (purpose === 'route') return loaded ? ['Укладка', 'Путь с грузом к месту'] : ['Леса и проходы', 'Путь по маршруту'];
    if (purpose === 'taxi') return ['Аэротакси', 'Путь к стоянке'];
    if (purpose === 'erect') return ['Леса и проходы', 'Путь к лесам'];
    if (purpose === 'recover') return ['Аварийный возврат', 'Путь к столу'];
    if (purpose === 'out') {
      if (builder.needTrip === 'meal') return ['Обед', 'Путь обратно'];
      if (builder.needTrip === 'smoke') return ['Перекур', 'Путь обратно'];
      if (builder.needTrip === 'sleep') return ['Сон', 'Путь обратно'];
      return ['План работ', 'Путь к столу за планом'];
    }
    return ['Прочее', 'Ходьба'];
  }

  function addTime(ledger, name, sub, seconds) {
    if (!(seconds > 0)) return;
    let state = ledger[name];
    if (!state) state = ledger[name] = {};
    state[sub] = (state[sub] || 0) + seconds;
  }

  // Where a walk is heading, for the sub-rows of the movement categories.
  function walkGoal(builder) {
    const purpose = builder.walkPurpose;
    const loaded = builder.carry.length > 0;
    if (purpose === 'meal' || (purpose === 'out' && builder.needTrip === 'meal')) return 'К обеду и обратно';
    if (purpose === 'smoke' || (purpose === 'out' && builder.needTrip === 'smoke')) return 'На перекур и обратно';
    if (purpose === 'sleep' || (purpose === 'out' && builder.needTrip === 'sleep')) return 'В бытовки и обратно';
    if (purpose === 'campFetch' || (builder.camp && (purpose === 'route' || purpose === 'erect'))) return 'На стройке городка';
    if (purpose === 'mine') return loaded ? 'Между карьерами' : 'К карьеру';
    if (purpose === 'route') return loaded ? 'С грузом к месту' : 'По маршруту';
    if (purpose === 'taxi') return 'К стоянке аэротакси';
    if (purpose === 'erect') return 'К лесам';
    if (purpose === 'recover') return 'Аварийный возврат';
    if (purpose === 'out') return 'К столу за планом';
    return 'Прочее';
  }

  // «Тайминги» by category: the same worker-seconds regrouped by what speeds them up. A walking step
  // splits into its flat and climb parts the way segmentSpeed adds them up, the extra time of an
  // overloaded trip goes to «Перегруз»; any other phase keeps its state (a taxi trip — «Аэротакси»).
  function recordCategoryTime(builder, world, dt) {
    const ledger = world.timeCategories;
    if (builder.phase !== 'walk') {
      const entry = timeEntry(builder);
      addTime(ledger, entry[0], entry[1], dt);
      return;
    }
    const from = builder.from;
    const to = builder.to;
    const goal = walkGoal(builder);
    const moving = builder.carry.length > 0 ? dt / carryOverload(builder, world) : dt;
    addTime(ledger, 'Перегруз', goal, dt - moving);
    const dy = to[1] - from[1];
    let climbShare = 0;
    if (dy !== 0 && from[0] === to[0] && from[2] === to[2]) climbShare = 1;
    else if (dy !== 0) {
      const flat = 1 / segmentWalkSpeed(from, to, world);
      const rise = Math.abs(dy) / (dy > 0 ? climbSpeedNow(world) : climbSpeedNow(world) * JUMP_DOWN);
      climbShare = flat + rise > 0 ? rise / (flat + rise) : 0;
    }
    addTime(ledger, 'Горизонтальное движение', goal, moving * (1 - climbShare));
    addTime(ledger, 'Подъёмы и спуски', dy > 0 ? 'Подъём' : 'Спуск', moving * climbShare);
  }

  function recordTime(builder, world, dt) {
    const entry = timeEntry(builder);
    addTime(world.timeLedger, entry[0], entry[1], dt);
    recordCategoryTime(builder, world, dt);
  }

  // The needs fill all the time, through each other's breaks: hunger stops only on the way to a meal
  // and at it (in sleep it fills at half speed), fatigue only in sleep (it drains there), the urge to smoke on the way to a smoke and
  // at it, on the way to a meal and at it, and on the way to sleep and in it. Back from any of them
  // everything fills again.
  function accrueNeeds(builder, world, dt) {
    const purpose = builder.walkPurpose;
    const breakKind = builder.phase === 'break' ? builder.breakKind : '';
    const eating = builder.phase === 'meal' || purpose === 'meal';
    const asleep = breakKind === 'sleep' || breakKind === 'rest';
    const smoking = breakKind === 'smoke' || purpose === 'smoke';
    const campaign = world.campaign;
    // In sleep hunger fills SLEEP.sleepHunger as fast.
    if (!eating && needOpen(campaign, 'hunger')) {
      const rate = hungerRate(builder, world) * (asleep ? (SLEEP.sleepHunger === undefined ? 1 : SLEEP.sleepHunger) : 1);
      builder.hunger = Math.min(builder.hungerScale, builder.hunger + dt * rate);
      // A pastry from the cafe in his pocket: eaten where he stands once the hunger comes.
      if (builder.snack && !asleep && hungerFill(builder) >= BALANCE.hungerDebuffFrom) eatSnack(builder, world);
    }
    if (builder.trade === 'builder' && !asleep && needOpen(campaign, 'night')) {
      builder.fatigue = Math.min(builder.fatigueScale, builder.fatigue + dt * fatigueRate(builder, world));
    }
    if (!smoking && !eating && !asleep && purpose !== 'sleep' && needOpen(campaign, 'smoke')) {
      builder.smokeNeed += dt * smokeRate(builder, world);
    }
  }

  function updateBuilder(builder, world, dt) {
    if (builder.trade === 'engineer') {
      updateEngineer(builder, world, dt);
      return;
    }
    // The kitchen's hands: they walk to the canteen and stay there (no needs, no work).
    if (builder.kitchen || (world.kitchen && world.kitchen.staff.indexOf(builder.index) >= 0)) {
      if (!builder.kitchen) sendToKitchen(builder, world);
      recordTime(builder, world, dt);
      if (builder.phase === 'walk') advanceWalk(builder, world, dt);
      return;
    }
    // waitReason describes a plan/idle wait only; any other phase means the wait is over.
    if (builder.waitReason !== '' && builder.phase !== 'plan' && builder.phase !== 'idle') builder.waitReason = '';
    // The canteen crew is busy: the main building standing still meanwhile is not a stall.
    if (builder.camp) world.constructionStallElapsed = 0;
    recordTime(builder, world, dt);
    if (builder.fedLeft > 0) builder.fedLeft -= dt;
    accrueNeeds(builder, world, dt);
    if (builder.phase === 'meal' || builder.phase === 'break') {
      world.constructionStallElapsed = 0;
      builder.timer -= dt;
      builder.actionT += dt;
      if (builder.breakKind === 'sleep' && builder.sleepTotal > 0) {
        builder.fatigue = builder.sleepFrom * Math.max(0, builder.timer) / builder.sleepTotal;
      }
      if (builder.timer <= 0) {
        if (builder.phase === 'meal') {
          builder.hunger = 0;
          // «Запас сытости»: the scale is longer by the line's points.
          builder.hungerScale = rollHunger() + lineValue(world.campaign, 'satiety');
          // «Повар артели»: after anyone's meal the whole crew works faster for a while.
          const feast = world.campaign.foremen.feast;
          if (feast) world.feastUntil = world.campaign.levelElapsed + feast.second;
          // The canteen serves the dish of the day; a meal anywhere else leaves no dish.
          builder.dish = builder.mealPlace === 'canteen' && world.canteen ? world.canteen.dish : '';
          builder.dishPower = builder.dish ? campBoost(world.campaign, 'chef') * chefPower(world) : 1;
          serveMenu(builder, world, builder.mealPlace === 'canteen');
          builder.mealPlace = '';
          builder.canteenTried = false;
          builder.mealCount += 1;
          builder.awayCell = null;
          beginExit(builder, world);
        } else if (builder.breakKind === 'sleep') {
          builder.fatigue = 0;
          builder.fatigueScale = rollFatigue();
          builder.restCount += 1;
          builder.breakKind = '';
          builder.sleepPlace = '';
          refreshAfterBreak(builder, world);
          builder.awayCell = null;
          beginExit(builder, world);
        } else if (builder.breakKind === 'rest') {
          builder.fatigue = 0;
          builder.fatigueScale = rollFatigue();
          builder.restCount += 1;
          refreshAfterBreak(builder, world);
          beginPlanning(builder);
        } else {
          builder.smokeNeed = 0;
          refreshAfterBreak(builder, world);
          builder.habit = Math.min(SMOKING.habitCap, (builder.habit || 0) + habitGrowth(world.campaign));
          builder.smokeThreshold = rollSmoke();
          builder.smokeCount += 1;
          builder.fromSmoke = true;
          builder.awayCell = null;
          builder.smokeGroup = null;
          builder.smokePlace = '';
          builder.needTrip = '';
          // Cubes he went off with: straight back to setting them; empty hands — to the desk.
          if (builder.carry.length > 0) {
            builder.phase = 'idle';
            builder.wait = 0;
            builder.walkPurpose = '';
            requestWork(builder, world);
          } else {
            beginExit(builder, world);
          }
        }
      }
      return;
    }
    if (builder.phase === 'campFetch' || builder.phase === 'campBuild') {
      builder.actionT += dt;
      builder.timer -= dt;
      if (builder.timer > 0) return;
      if (builder.phase === 'campFetch') walkToCampCube(builder, world);
      else finishCampBuild(builder, world);
      return;
    }
    if (builder.phase === 'idle') {
      // Only with cubes in hand: one waiting at the stack for a cube to take waits like one at the desk.
      if (builder.camp && builder.campCarry > 0) builder.campStall = (builder.campStall || 0) + dt;
      builder.wait -= dt;
      if (builder.wait <= 0) {
        requestWork(builder, world);
      }
      return;
    }
    if (builder.phase === 'recover') {
      builder.wait -= dt;
      if (builder.wait <= 0) continueRecovery(builder, world);
      return;
    }
    if (builder.phase === 'plan') {
      builder.actionT += dt;
      builder.timer -= dt;
      if (builder.timer <= 0) requestWork(builder, world);
      return;
    }
    if (builder.phase === 'walk') {
      advanceWalk(builder, world, dt);
      return;
    }
    // Waiting for his taxi or flying in it: the taxi moves him (stepTaxis).
    if (builder.phase === 'taxi') {
      world.constructionStallElapsed = 0;
      if (!builder.taxi) {
        builder.phase = 'idle';
        builder.wait = 0;
      }
      return;
    }
    builder.actionT += dt;
    builder.timer -= dt;
    if (builder.timer > 0) {
      world.constructionStallElapsed = 0;
      return;
    }
    if (builder.phase === 'mine') finishMine(builder, world);
    else if (builder.phase === 'erect') finishErect(builder, world);
    else if (builder.phase === 'passage') finishPassage(builder, world);
    else finishPlace(builder, world);
  }

  function canPlaceHere(builder, block, world) {
    const x = builder.cell[0];
    const y = builder.cell[1];
    const z = builder.cell[2];
    return canBuildBlockFrom(x, y, z, buildSurfaceMode(x, y, z, world), block, world);
  }

  function sameCell(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }

  function escapePath(from, target, world) {
    const index = world.index;
    const startId = index.id(from[0], from[1], from[2]);
    const goalId = index.id(target[0], target[1], target[2]);
    if (startId === goalId) return [from.slice()];
    const mark = takeStamp(world);
    const seen = world.xStamp;
    const prev = world.prev;
    const at = world.at;
    const grid = world.solidGrid;
    seen[startId] = mark;
    prev[startId] = -1;
    const queue = world.escapeQueue;
    queue.length = 1;
    queue[0] = startId;
    let head = 0;
    let found = false;
    function walkable(x, y, z) {
      if (!index.inside(x, y, z)) return false;
      const id = index.id(x, y, z);
      if (grid[id] === 1) return true;
      return canStand(x, y, z, world);
    }
    while (head < queue.length) {
      const currentId = queue[head++];
      if (currentId === goalId) {
        found = true;
        break;
      }
      index.decodeInto(currentId, at);
      const x = at[0];
      const y = at[1];
      const z = at[2];
      const normalNeighbors = standNeighbors(x, y, z, world);
      for (let n = 0; n < normalNeighbors.length; n++) {
        const id = normalNeighbors[n];
        index.decodeInto(id, world.nxt);
        if (world.nxt[1] !== y &&
            !ladderColumn(x, y, z, world) &&
            !ladderColumn(world.nxt[0], world.nxt[1], world.nxt[2], world)) continue;
        if (seen[id] === mark) continue;
        seen[id] = mark;
        prev[id] = currentId;
        queue.push(id);
      }
      for (let d = 0; d < DIRS.length; d++) {
        const nx = x + DIRS[d][0];
        const nz = z + DIRS[d][1];
        if (!walkable(nx, y, nz)) continue;
        const id = index.id(nx, y, nz);
        if (seen[id] === mark) continue;
        seen[id] = mark;
        prev[id] = currentId;
        queue.push(id);
      }
      for (let direction = -1; direction <= 1; direction += 2) {
        const ny = y + direction;
        if (!walkable(x, ny, z)) continue;
        const id = index.id(x, ny, z);
        if (seen[id] === mark) continue;
        seen[id] = mark;
        prev[id] = currentId;
        queue.push(id);
      }
    }
    if (!found) return null;
    const path = [];
    let cursor = goalId;
    while (cursor !== -1) {
      const cell = [0, 0, 0];
      index.decodeInto(cursor, cell);
      path.push(cell);
      cursor = prev[cursor];
    }
    path.reverse();
    return path;
  }

  function releaseHands(builder) {
    releaseCampCubes(builder);
    builder.camp = null;
    builder.campCarry = 0;
    builder.forcePlace = false;
    builder.exitAfterPlace = false;
    if (builder.erectPiece && !builder.erectPiece.removed) builder.erectPiece.reserved = false;
    builder.erectPiece = null;
    builder.passageBlock = null;
    builder.passageVertical = false;
    releaseUnpicked(builder);
  }

  // kind (view): 'path' — the way got blocked, 'route' — no route to the carried cubes,
  // 'stall' — the whole site stopped progressing.
  function releaseBuilderDuties(builder, world, reason, kind) {
    // View: what the broken trip already earned is reported as usual, then what was dropped.
    finishTrip(builder, world);
    let dropped = 0;
    for (let i = 0; i < builder.carry.length; i++) if (!builder.carry[i].built) dropped += 1;
    world.events.push({
      type: 'abandon',
      builder: builder.index,
      dropped: dropped,
      reason: reason,
      kind: kind || 'path',
      x: builder.cell[0],
      y: builder.cell[1],
      z: builder.cell[2],
    });
    let releasedPlanBlocks = 0;
    for (let i = 0; i < builder.plan.length; i++) {
      const block = builder.plan[i];
      if (!block.built && block.poured === 0 && block.owner === builder.index) releasedPlanBlocks += 1;
    }
    if (releasedPlanBlocks > 0) {
      root.MicroBuildersWorkerLog.record(
        builder,
        world,
        reason + '; снято из плана ' + releasedPlanBlocks + ' ' +
          (releasedPlanBlocks === 1 ? 'куб' : 'куба/кубов')
      );
    }
    releaseHands(builder);
    for (let i = 0; i < builder.carry.length; i++) {
      const block = builder.carry[i];
      if (!block.built) {
        block.loadBatchId = -1;
        if (block.owner !== builder.index) {
          block.reserved = false;
          block.failedNavSerial = world.navSerial;
        }
      }
    }
    builder.carry.length = 0;
    touchCarry(builder);
    builder.waitReason = '';
    const kept = [];
    for (let i = 0; i < builder.plan.length; i++) {
      const block = builder.plan[i];
      if (block.built) continue;
      if (block.poured > 0 && block.owner === builder.index) {
        kept.push(block);
        block.reserved = true;
      } else if (block.owner === builder.index) {
        releasePlanBlock(block);
      }
    }
    builder.plan = kept;
    builder.planTaken = planMinis(builder);
    if (releasedPlanBlocks > 0) wakeVehicles(world);
    builder.loadBatchId = -1;
    if (builder.routeId >= 0) {
      const route = world.routes[builder.routeId];
      if (!route.complete && route.owner === builder.index) {
        route.complete = true;
        route.owner = -1;
      }
    }
    builder.routeId = -1;
    builder.routeTargetId = -1;
  }

  function abandonJobAndRecover(builder, world, reason, kind) {
    releaseBuilderDuties(builder, world, reason, kind);
    continueRecovery(builder, world);
  }

  function continueRecovery(builder, world) {
    beginWayHome(builder, world);
  }

  function beginExit(builder, world) {
    releaseHands(builder);
    beginWayHome(builder, world);
  }

  // Back to the desk: an ordinary path; else a route that erects ladders and decks (also down off a
  // roof); else a short escape through at most ESCAPE_SOLID_CELLS cubes at its start onto ground
  // walked on as usual (escapeKind 'short' — yellow «!»); else straight through the building as
  // before ('full' — red «!»).
  function beginWayHome(builder, world) {
    const home = builder.homeCell;
    builder.escapeKind = '';
    if (sameCell(builder.cell, home)) {
      beginPlanning(builder);
      return;
    }
    // Walled in (a cube was set in his cell): no ordinary way starts here — straight to the escape.
    const cell = builder.cell;
    const walled = world.solidGrid[world.index.id(cell[0], cell[1], cell[2])] === 1;
    const clear = walled ? null : findPathToCell(cell, home, world);
    if (clear && clear.length > 1) {
      beginWalk(builder, clear, 'out', world);
      return;
    }
    if (!walled && beginHomeRoute(builder, world)) return;
    const short = shortEscapePath(builder.cell, home, world);
    if (short && short.length > 1) {
      builder.escapeKind = 'short';
      beginWalk(builder, short, 'recover', world);
      return;
    }
    builder.escapeKind = 'full';
    const through = escapePath(builder.cell, home, world);
    if (through && through.length > 1) {
      beginWalk(builder, through, 'recover', world);
      return;
    }
    builder.phase = 'recover';
    builder.wait = 0.1;
  }

  // The way home as a route that may erect ladders and decks; false if there is none.
  function beginHomeRoute(builder, world) {
    if (!SCAFFOLD.enabled) return false;
    const home = builder.homeCell;
    const started = performance.now();
    const route = findRouteAStar(world, null, builder.cell, true, [world.index.id(home[0], home[1], home[2])], Infinity, false, false, true);
    world.metrics.scaffoldSearch += performance.now() - started;
    if (!route) return false;
    cancelRoute(builder, world);
    route.owner = builder.index;
    builder.routeId = route.id;
    builder.routeTargetId = -1;
    return continueHomeRoute(builder, world);
  }

  // One more step of the way home (after a walk step or an erected piece); false once it is done.
  function continueHomeRoute(builder, world) {
    const progress = continueRoute(builder, world);
    if (progress === ROUTE_STARTED) return true;
    if (progress === ROUTE_WAITING) {
      builder.phase = 'idle';
      builder.wait = 0.1;
      builder.waitReason = 'path';
      return true;
    }
    if (sameCell(builder.cell, builder.homeCell)) {
      beginPlanning(builder);
      return true;
    }
    return false;
  }

  // A way home through at most ESCAPE_SOLID_CELLS cubes, and only at its start: from the start or a
  // cube it steps into the next cube or a cell to stand in; once it stands on a free cell it walks on
  // ordinary moves only. target null: just out, to the first free cell to stand in. Null if none.
  const ESCAPE_SOLID_CELLS = 3;
  function shortEscapePath(from, target, world) {
    const index = world.index;
    const size = index.size;
    const trail = ESCAPE_SOLID_CELLS + 1;
    const total = size * (trail + 1);
    const seen = new Uint8Array(total);
    const prev = new Int32Array(total);
    const startId = index.id(from[0], from[1], from[2]);
    const goalId = target ? index.id(target[0], target[1], target[2]) : -1;
    const queue = [startId];
    seen[startId] = 1;
    prev[startId] = -1;
    const at = [0, 0, 0];
    const steps = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]];
    let goal = -1;
    function visit(state, fromState) {
      if (seen[state] === 1) return;
      seen[state] = 1;
      prev[state] = fromState;
      queue.push(state);
    }
    for (let head = 0; head < queue.length && goal < 0; head++) {
      const state = queue[head];
      const layer = Math.floor(state / size);
      const id = state - layer * size;
      if (id === goalId || (!target && layer === trail)) {
        goal = state;
        break;
      }
      index.decodeInto(id, at);
      const x = at[0];
      const y = at[1];
      const z = at[2];
      const solid = world.solidGrid[id] === 1;
      if (layer === trail) {
        const neighbors = standNeighbors(x, y, z, world).slice();
        for (let n = 0; n < neighbors.length; n++) visit(trail * size + neighbors[n], state);
        continue;
      }
      if (!solid && id !== startId) {
        if (canStand(x, y, z, world)) visit(trail * size + id, state);
        continue;
      }
      for (let d = 0; d < steps.length; d++) {
        const nx = x + steps[d][0];
        const ny = y + steps[d][1];
        const nz = z + steps[d][2];
        if (!index.inside(nx, ny, nz)) continue;
        const nextId = index.id(nx, ny, nz);
        if (world.solidGrid[nextId] === 1) {
          if (layer < ESCAPE_SOLID_CELLS) visit((layer + 1) * size + nextId, state);
        } else if (canStand(nx, ny, nz, world)) {
          visit(layer * size + nextId, state);
        }
      }
      if (id === startId && !solid && canStand(x, y, z, world)) visit(trail * size + id, state);
    }
    if (goal < 0) return null;
    const path = [];
    for (let state = goal; state >= 0; state = prev[state]) {
      const id = state % size;
      index.decodeInto(id, at);
      const last = path[path.length - 1];
      if (!last || last[0] !== at[0] || last[1] !== at[1] || last[2] !== at[2]) path.push([at[0], at[1], at[2]]);
      if (state === startId) break;
    }
    path.reverse();
    return path;
  }

  function pullOut(world, block, placer) {
    const builders = world.builders;
    for (let i = 0; i < builders.length; i++) {
      const other = builders[i];
      if (other === placer || other.trade === 'engineer') continue;
      if (other.cell[0] !== block.x || other.cell[1] !== block.y || other.cell[2] !== block.z) continue;
      if (other.phase === 'place') {
        other.exitAfterPlace = true;
        continue;
      }
      if (beginUnwall(other, world)) continue;
      beginExit(other, world);
    }
  }

  // Walled in while carrying: out onto the nearest free cell (through at most a few cubes), then on
  // with the load from there — no trip home.
  function beginUnwall(builder, world) {
    if (builder.carry.length === 0) return false;
    const path = shortEscapePath(builder.cell, null, world);
    if (!path || path.length < 2) return false;
    cancelRoute(builder, world);
    // Walled in while erecting: the piece is let go (else his own booking keeps him waiting for it).
    if (builder.erectPiece && !builder.erectPiece.removed) builder.erectPiece.reserved = false;
    builder.erectPiece = null;
    builder.passageBlock = null;
    builder.escapeKind = 'short';
    builder.unwall = true;
    beginWalk(builder, path, 'recover', world);
    return true;
  }

  function pullOutBatch(world, blocks) {
    const occupied = new Set();
    for (let i = 0; i < blocks.length; i++) {
      occupied.add(cellKey(blocks[i].x, blocks[i].y, blocks[i].z));
    }
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (builder.trade === 'engineer') continue;
      if (!occupied.has(cellKey(builder.cell[0], builder.cell[1], builder.cell[2]))) continue;
      if (builder.phase === 'place') {
        builder.exitAfterPlace = true;
        continue;
      }
      if (!beginUnwall(builder, world)) beginExit(builder, world);
    }
  }

  function mastErectStands(piece, world) {
    const ids = world.standIds;
    ids.length = 0;
    const index = world.index;
    if (canStand(piece.x, piece.y, piece.z, world)) {
      const id = index.id(piece.x, piece.y, piece.z);
      const hardFloor = piece.y === 0 ||
        world.deckGrid[id] === 1 ||
        world.solidGrid[index.id(piece.x, piece.y - 1, piece.z)] === 1 ||
        world.bridgeGrid[index.id(piece.x, piece.y - 1, piece.z)] === 1 ||
        world.doorGrid[index.id(piece.x, piece.y - 1, piece.z)] === 1;
      if (hardFloor || ladderColumn(piece.x, piece.y, piece.z, world)) ids.push(id);
    }
    // A ladder going down is set from the floor above it: straight above or one cell aside.
    const up = piece.y + 1;
    if (!index.inside(piece.x, up, piece.z)) return ids;
    if (canStand(piece.x, up, piece.z, world)) ids.push(index.id(piece.x, up, piece.z));
    for (let d = 0; d < DIRS.length; d++) {
      const x = piece.x + DIRS[d][0];
      const z = piece.z + DIRS[d][1];
      if (!index.inside(x, up, z)) continue;
      const id = index.id(x, up, z);
      if (world.solidGrid[id] !== 1 && canStand(x, up, z, world)) ids.push(id);
    }
    return ids;
  }

  function rungPiece(world, x, y, z) {
    const key = cellKey(x, y, z);
    const known = world.rungByKey.get(key);
    if (known) {
      if (known.removed) {
        known.removed = false;
        known.reserved = false;
        known.built = false;
        resetWear(known, world);
      }
      return known;
    }
    const piece = {
      id: 'r:' + x + ':' + y + ':' + z,
      x: x,
      y: y,
      z: z,
      ox: 0,
      oz: 1,
      ladder: true,
      built: false,
      reserved: false,
      removed: false,
      durability: 0,
      cracked: false,
      broken: false,
      worn: false,
    };
    piece.durability = pieceDurability(piece);
    const index = world.index;
    if (index.inside(x - 1, y, z) && (world.solidGrid[index.id(x - 1, y, z)] === 1 || world.doorGrid[index.id(x - 1, y, z)] === 1)) {
      piece.ox = -1;
      piece.oz = 0;
    } else if (index.inside(x + 1, y, z) && (world.solidGrid[index.id(x + 1, y, z)] === 1 || world.doorGrid[index.id(x + 1, y, z)] === 1)) {
      piece.ox = 1;
      piece.oz = 0;
    } else if (index.inside(x, y, z + 1) && (world.solidGrid[index.id(x, y, z + 1)] === 1 || world.doorGrid[index.id(x, y, z + 1)] === 1)) {
      piece.ox = 0;
      piece.oz = 1;
    } else if (index.inside(x, y, z - 1) && (world.solidGrid[index.id(x, y, z - 1)] === 1 || world.doorGrid[index.id(x, y, z - 1)] === 1)) {
      piece.ox = 0;
      piece.oz = -1;
    }
    world.scaffoldPieces.push(piece);
    world.rungByKey.set(key, piece);
    return piece;
  }

  function deckPiece(world, x, y, z, ax, az) {
    const key = cellKey(x, y, z);
    const known = world.deckByKey.get(key);
    if (known) {
      if (known.removed) {
        known.removed = false;
        known.reserved = false;
        known.built = false;
        resetWear(known, world);
      }
      return known;
    }
    const deck = {
      id: 'd:' + x + ':' + y + ':' + z,
      x: x,
      y: y,
      z: z,
      ox: -az,
      oz: ax,
      ax: ax,
      az: az,
      deck: true,
      built: false,
      reserved: false,
      removed: false,
      durability: 0,
      cracked: false,
      broken: false,
      worn: false,
    };
    deck.durability = pieceDurability(deck);
    world.scaffoldDecks.push(deck);
    world.deckByKey.set(key, deck);
    return deck;
  }

  function collectRouteTargets(world, targets) {
    const pending = [];
    const blocks = world.orderedBlocks;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.built || !block.ready) continue;
      if (targets ? !targets.has(block.id) : block.reserved) continue;
      pending.push(block);
    }
    return pending;
  }

  function refreshExteriorAir(world) {
    if (world.exteriorNavSerial === world.navSerial) return;
    world.exteriorEpoch += 1;
    if (world.exteriorEpoch === 4294967295) {
      world.exteriorStamp.fill(0);
      world.exteriorEpoch = 1;
    }
    const epoch = world.exteriorEpoch;
    const stamp = world.exteriorStamp;
    const queue = world.exteriorQueue;
    const index = world.index;
    queue.length = 0;

    function add(x, y, z) {
      if (!index.inside(x, y, z)) return;
      const id = index.id(x, y, z);
      if (stamp[id] === epoch || world.solidGrid[id] === 1) return;
      stamp[id] = epoch;
      queue.push(id);
    }

    for (let y = 0; y <= index.maxY; y++) {
      for (let z = index.minZ; z <= index.maxZ; z++) {
        add(index.minX, y, z);
        add(index.maxX, y, z);
      }
      for (let x = index.minX; x <= index.maxX; x++) {
        add(x, y, index.minZ);
        add(x, y, index.maxZ);
      }
    }
    for (let z = index.minZ; z <= index.maxZ; z++) {
      for (let x = index.minX; x <= index.maxX; x++) {
        add(x, 0, z);
        add(x, index.maxY, z);
      }
    }

    let head = 0;
    while (head < queue.length) {
      const id = queue[head++];
      index.decodeInto(id, world.exteriorCell);
      const x = world.exteriorCell[0];
      const y = world.exteriorCell[1];
      const z = world.exteriorCell[2];
      add(x + 1, y, z);
      add(x - 1, y, z);
      add(x, y + 1, z);
      add(x, y - 1, z);
      add(x, y, z + 1);
      add(x, y, z - 1);
    }
    world.exteriorNavSerial = world.navSerial;
  }

  function buildStandIds(block, world) {
    const ids = [];
    const index = world.index;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          if (!BuildPatterns.allows(0, -dx, -dy, -dz) &&
              !BuildPatterns.allows(1, -dx, -dy, -dz) &&
              !BuildPatterns.allows(2, -dx, -dy, -dz) &&
              !BuildPatterns.allows(3, -dx, -dy, -dz)) continue;
          const x = block.x + dx;
          const y = block.y + dy;
          const z = block.z + dz;
          if (!index.inside(x, y, z)) continue;
          ids.push(index.id(x, y, z));
        }
      }
    }
    return ids;
  }

  function sealedStandIds(block, world) {
    const ids = buildStandIds(block, world);
    const stamp = world.exteriorStamp;
    const epoch = world.exteriorEpoch;
    for (let i = 0; i < ids.length; i++) {
      if (world.solidGrid[ids[i]] !== 1 && stamp[ids[i]] === epoch) return null;
    }
    return ids;
  }

  function doorCutPath(goalIds, world) {
    const index = world.index;
    const distance = world.doorCutDistance;
    const previous = world.doorCutPrevious;
    distance.fill(Infinity);
    previous.fill(-1);
    const goals = new Set(goalIds);
    const heap = world.doorCutHeap;
    heap.clear();

    function cellCost(id) {
      if (world.solidGrid[id] !== 1) return 0;
      const block = world.blockGrid[id];
      if (!cuttableBlock(block)) return Infinity;
      return 1;
    }

    function push(id, price, from) {
      if (price >= distance[id]) return;
      distance[id] = price;
      previous[id] = from;
      heap.push(price, id);
    }

    index.decodeInto(goalIds[0], world.doorCutCell);
    const goalY = world.doorCutCell[1];
    for (let z = index.minZ; z <= index.maxZ; z++) {
      push(index.id(index.minX, goalY, z), 0, -2);
      push(index.id(index.maxX, goalY, z), 0, -2);
    }
    for (let x = index.minX; x <= index.maxX; x++) {
      push(index.id(x, goalY, index.minZ), 0, -2);
      push(index.id(x, goalY, index.maxZ), 0, -2);
    }

    let goal = -1;
    while (heap.size > 0) {
      const id = heap.pop();
      const price = distance[id];
      if (goals.has(id)) {
        goal = id;
        break;
      }
      index.decodeInto(id, world.doorCutCell);
      const x = world.doorCutCell[0];
      const z = world.doorCutCell[2];
      for (let d = 0; d < DIRS.length; d++) {
        const nx = x + DIRS[d][0];
        const nz = z + DIRS[d][1];
        if (!index.inside(nx, goalY, nz)) continue;
        const nextId = index.id(nx, goalY, nz);
        const cost = cellCost(nextId);
        if (cost === Infinity) continue;
        push(nextId, price + cost, id);
      }
    }
    if (goal < 0) return null;
    const path = [];
    let cursor = goal;
    while (cursor >= 0) {
      path.push(cursor);
      cursor = previous[cursor];
      if (cursor === -2) break;
    }
    path.reverse();
    return path;
  }

  function convertEmergencyDoors(path, world) {
    const index = world.index;
    let converted = 0;
    for (let i = 0; i < path.length; i++) {
      const id = path[i];
      if (world.solidGrid[id] !== 1) continue;
      const block = world.blockGrid[id];
      if (!cuttableBlock(block)) continue;
      const neighborId = i + 1 < path.length ? path[i + 1] : path[i - 1];
      index.decodeInto(id, world.doorCutCell);
      index.decodeInto(neighborId, world.doorCutNeighbor);
      block.feature = 'door';
      block.faceX = world.doorCutNeighbor[0] - world.doorCutCell[0];
      block.faceZ = world.doorCutNeighbor[2] - world.doorCutCell[2];
      block.style = 'wood';
      block.additionalDoor = true;
      world.solidGrid[id] = 0;
      world.doorGrid[id] = 1;
      world.stats.additionalDoors += 1;
      converted += 1;
      world.events.push({ type: 'retrofitDoor', block: block });
      invalidateNav(world, block.x, block.y, block.z);
    }
    return converted;
  }

  function openSealedTarget(world, pending) {
    refreshExteriorAir(world);
    let bestPath = null;
    const sealed = [];
    const exterior = [];
    for (let i = 0; i < pending.length; i++) {
      const standIds = sealedStandIds(pending[i], world);
      if (!standIds) {
        exterior.push(pending[i]);
        continue;
      }
      sealed.push(pending[i]);
      for (let stand = 0; stand < standIds.length; stand++) {
        const path = doorCutPath([standIds[stand]], world);
        if (!path) continue;
        let doors = 0;
        for (let p = 0; p < path.length; p++) {
          if (world.solidGrid[path[p]] === 1) doors += 1;
        }
        if (!bestPath || doors < bestPath.doors) bestPath = { ids: path, doors: doors };
      }
    }
    const opened = !bestPath || bestPath.doors === 0
      ? 0
      : convertEmergencyDoors(bestPath.ids, world);
    return { opened: opened, sealed: sealed, exterior: exterior };
  }

  function sealedFailureText(result) {
    const total = result.sealed.length + result.exterior.length;
    if (result.sealed.length === 0) {
      return 'проверка замурованности: нет, 0 из ' + total;
    }
    const cells = result.sealed.map(function (block) {
      return block.x + ',' + block.y + ',' + block.z;
    });
    return 'проверка замурованности: да, ' + result.sealed.length + ' из ' + total +
      ' (' + cells.join('; ') + ')';
  }

  // asRoute: with exactGoalIds, return a route (with its scaffold pieces) instead of a bare path —
  // the way home that erects ladders and decks.
  function findRouteAStar(world, pending, start, allowScaffolds, exactGoalIds, maxCost, greedy, allowPassages, asRoute) {
    const index = world.index;
    if (pending && pending.length === 0) return false;
    if (exactGoalIds && exactGoalIds.length === 0) return null;
    refreshPathPrices(world);
    const searchStarted = performance.now();
    const searchType = allowPassages
      ? 'маршрут с аварийными проходами'
      : greedy
      ? 'аварийный маршрут'
      : exactGoalIds
      ? 'путь'
      : allowScaffolds
        ? 'маршрут со срезами'
        : 'маршрут без лесов';
    let expansions = 0;
    let pushes = 0;
    let maxOpen = 0;
    function finishSearch(result, goal, steps) {
      const duration = performance.now() - searchStarted;
      let scaffoldSteps = 0;
      for (let i = 0; i < steps.length; i++) {
        if (steps[i].piece) scaffoldSteps += 1;
      }
      const info = {
        duration: duration,
        type: searchType,
        goals: exactGoalIds ? exactGoalIds.length : pending.length,
        expansions: expansions,
        pushes: pushes,
        maxOpen: maxOpen,
        success: goal >= 0,
        steps: steps.length,
        scaffoldSteps: scaffoldSteps,
        turns: goal >= 0 ? world.routeTurns[goal] : 0,
        cost: goal >= 0 ? world.routeDistance[goal] : 0,
        start: start.join(','),
        targetId: goal >= 0 && !exactGoalIds ? goalTargets.get(goal).id : -1,
        maxCost: maxCost,
        expansionBudget: allowScaffolds ? SCAFFOLD.expansionBudget : 0,
      };
      world.metrics.aStarSearches += 1;
      if (!world.metrics.aStarPeak || duration > world.metrics.aStarPeak.duration) {
        world.metrics.aStarPeak = info;
      }
      return result;
    }
    function free(x, y, z) {
      if (!index.inside(x, y, z)) return false;
      // A camp cube still to set: no ladder or deck goes into its cell.
      if ((world.campGrid[index.id(x, y, z)] & CAMP_FUTURE) !== 0) return false;
      const future = world.blockGrid[index.id(x, y, z)];
      if (future && future.feature !== 'door' && future.feature !== 'hatch' && future.feature !== 'bridge') return false;
      return world.solidGrid[index.id(x, y, z)] !== 1;
    }
    function canOpenPassageInto(x, y, z) {
      if (!index.inside(x, y, z)) return false;
      const block = world.blockGrid[index.id(x, y, z)];
      return cuttableBlock(block);
    }
    function touchesCube(x, y, z) {
      for (let d = 0; d < DIRS.length; d++) {
        const nx = x + DIRS[d][0];
        const nz = z + DIRS[d][1];
        if (!index.inside(nx, y, nz)) continue;
        const id = index.id(nx, y, nz);
        if (world.solidGrid[id] === 1 || world.doorGrid[id] === 1) return true;
      }
      return false;
    }
    function hardFloor(x, y, z) {
      if (y === 0) return true;
      const id = index.id(x, y, z);
      if (world.deckGrid[id] === 1) return true;
      const below = index.id(x, y - 1, z);
      return world.solidGrid[below] === 1 || world.bridgeGrid[below] === 1 || world.doorGrid[below] === 1;
    }
    function heuristic(x, y, z) {
      let best = Infinity;
      const count = exactGoalIds ? exactGoalIds.length : pending.length;
      for (let i = 0; i < count; i++) {
        let goalX;
        let goalY;
        let goalZ;
        let horizontalReach = 1;
        let verticalReach = 1;
        if (exactGoalIds) {
          index.decodeInto(exactGoalIds[i], world.goalCell);
          goalX = world.goalCell[0];
          goalY = world.goalCell[1];
          goalZ = world.goalCell[2];
          horizontalReach = 0;
          verticalReach = 0;
        } else {
          goalX = pending[i].x;
          goalY = pending[i].y;
          goalZ = pending[i].z;
        }
        const horizontalDistance = Math.max(0, Math.abs(goalX - x) + Math.abs(goalZ - z) - horizontalReach);
        const verticalDistance = Math.ceil(Math.max(0, Math.abs(goalY - y) - verticalReach) / SCAFFOLD.step);
        const sharedSteps = Math.min(horizontalDistance, verticalDistance);
        const verticalEstimate = SCAFFOLD.verticalPrice +
          (allowScaffolds && maxCost === Infinity ? SCAFFOLD.ladderPrice : 0);
        const estimate =
          verticalDistance * verticalEstimate +
          (horizontalDistance - sharedSteps) * SCAFFOLD.horizontalPrice;
        if (estimate < best) best = estimate;
      }
      return best;
    }
    const at = [0, 0, 0];
    const next = [0, 0, 0];
    const goalTargets = new Map();
    if (exactGoalIds) {
      for (let i = 0; i < exactGoalIds.length; i++) {
        index.decodeInto(exactGoalIds[i], at);
        const mode = buildSurfaceMode(at[0], at[1], at[2], world);
        goalTargets.set(exactGoalIds[i] * SURFACE_STATE_COUNT + mode, null);
      }
    } else {
      for (let p = 0; p < pending.length; p++) {
        const block = pending[p];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0 && dz === 0) continue;
              const x = block.x + dx;
              const y = block.y + dy;
              const z = block.z + dz;
              if (y < 0 || !index.inside(x, y, z)) continue;
              const id = index.id(x, y, z);
              for (let mode = 0; mode < SURFACE_STATE_COUNT; mode++) {
                if (!canBuildBlockFrom(x, y, z, mode, block, world)) continue;
                const state = id * SURFACE_STATE_COUNT + mode;
                if (!goalTargets.has(state)) goalTargets.set(state, block);
              }
            }
          }
        }
      }
    }
    const distance = world.routeDistance;
    const previous = world.routePrevious;
    const actionKind = world.routeActionKind;
    const actionAx = world.routeActionAx;
    const actionAz = world.routeActionAz;
    const turnCount = world.routeTurns;
    const direction = world.routeDirection;
    const seen = world.routeSeen;
    const settled = world.routeSettled;
    world.routeSearchStamp += 1;
    if (world.routeSearchStamp === 4294967295) {
      seen.fill(0);
      settled.fill(0);
      world.routeSearchStamp = 1;
    }
    const routeMark = world.routeSearchStamp;
    const heap = world.routeHeap;
    heap.clear();
    function push(state, price, from, action) {
      index.decodeInto(Math.floor(state / SURFACE_STATE_COUNT), next);
      let nextTurns = 0;
      let nextDirection = 0;
      if (from >= 0) {
        nextTurns = turnCount[from];
        index.decodeInto(Math.floor(from / SURFACE_STATE_COUNT), world.turnCell);
        const fromX = world.turnCell[0];
        const fromY = world.turnCell[1];
        const fromZ = world.turnCell[2];
        if (fromX === next[0] && fromY === next[1] && fromZ === next[2]) {
          nextDirection = direction[from];
        } else if (fromY === 0 && next[1] === 0) {
          if (next[0] > fromX) nextDirection = 1;
          else if (next[0] < fromX) nextDirection = 2;
          else if (next[2] > fromZ) nextDirection = 3;
          else if (next[2] < fromZ) nextDirection = 4;
          if (direction[from] !== 0 && nextDirection !== direction[from]) nextTurns += 1;
        }
      }
      if (seen[state] === routeMark &&
          (distance[state] < price ||
           (distance[state] === price && turnCount[state] <= nextTurns))) return;
      const estimate = heuristic(next[0], next[1], next[2]);
      if (price + estimate >= maxCost) return;
      seen[state] = routeMark;
      distance[state] = price;
      previous[state] = from;
      turnCount[state] = nextTurns;
      direction[state] = nextDirection;
      if (action) {
        if (action.kind === 'mast') {
          actionKind[state] = 1;
          actionAx[state] = action.ax;
          actionAz[state] = action.az;
        } else if (action.kind === 'deck') {
          actionKind[state] = 2;
          actionAx[state] = action.ax;
          actionAz[state] = action.az;
        } else if (action.kind === 'mastDown') {
          actionKind[state] = 5;
          actionAx[state] = action.ax;
          actionAz[state] = action.az;
        } else if (action.kind === 'door') {
          actionKind[state] = 3;
          actionAx[state] = 0;
          actionAz[state] = 0;
        } else {
          actionKind[state] = 4;
          actionAx[state] = 0;
          actionAz[state] = 0;
        }
      } else {
        actionKind[state] = 0;
      }
      const priority = allowPassages
        ? estimate + price * 0.05 + nextTurns * 0.000001
        : greedy
          ? estimate + price * 0.000001 + nextTurns * 0.000000001
          : price + estimate + nextTurns * 0.000001;
      heap.push(priority, state);
      pushes += 1;
      if (heap.size > maxOpen) maxOpen = heap.size;
    }
    const startId = index.id(start[0], start[1], start[2]);
    const startMode = buildSurfaceMode(start[0], start[1], start[2], world);
    const rootState = startId * SURFACE_STATE_COUNT + startMode;
    push(rootState, 0, -2, null);
    let goal = -1;
    while (heap.size > 0) {
      const state = heap.pop();
      if (settled[state] === routeMark) continue;
      settled[state] = routeMark;
      expansions += 1;
      if (!exactGoalIds) world.metrics.scaffoldExpansions += 1;
      const id = Math.floor(state / SURFACE_STATE_COUNT);
      const mode = state % SURFACE_STATE_COUNT;
      index.decodeInto(id, at);
      const x = at[0];
      const y = at[1];
      const z = at[2];
      const price = distance[state];
      if (goalTargets.has(state)) {
        goal = state;
        break;
      }
      if ((!exactGoalIds || asRoute) && expansions >= SCAFFOLD.expansionBudget) break;
        const passageHere = actionKind[state] === 3 || actionKind[state] === 4;
        if (canStand(x, y, z, world) || passageHere) {
          const neighbors = collectNeighbors(x, y, z, world);
          for (let n = 0; n < neighbors.length; n++) {
            index.decodeInto(neighbors[n], next);
            const nextMode = buildSurfaceMode(next[0], next[1], next[2], world);
            const travelPrice = moveCost(x, y, z, next[0], next[1], next[2]);
            push(neighbors[n] * SURFACE_STATE_COUNT + nextMode, price + travelPrice, state, null);
          }
          if (allowPassages) {
            for (let d = 0; d < DIRS.length; d++) {
              const nx = x + DIRS[d][0];
              const nz = z + DIRS[d][1];
              if (!canOpenPassageInto(nx, y, nz)) continue;
              const nextId = index.id(nx, y, nz);
              const nextMode = buildSurfaceMode(nx, y, nz, world);
              push(
                nextId * SURFACE_STATE_COUNT + nextMode,
                price + SCAFFOLD.horizontalPrice + SCAFFOLD.passagePrice,
                state,
                { kind: 'door' }
              );
            }
            if ((mode & SURFACE_LADDER) !== 0 ||
                (allowScaffolds && ((mode & SURFACE_DECK) !== 0 || hardFloor(x, y, z)))) {
              for (let direction = -1; direction <= 1; direction += 2) {
                if (direction < 0 && (mode & SURFACE_LADDER) === 0) continue;
                const ny = y + direction;
                if (!canOpenPassageInto(x, ny, z)) continue;
                const nextId = index.id(x, ny, z);
                const nextMode = SURFACE_LADDER | (world.deckGrid[nextId] === 1 ? SURFACE_DECK : 0);
                push(
                  nextId * SURFACE_STATE_COUNT + nextMode,
                  price + SCAFFOLD.verticalPrice + SCAFFOLD.passagePrice,
                  state,
                  { kind: 'hatch' }
                );
              }
            }
          }
        } else if (mode !== 0) {
          for (let d = 0; d < DIRS.length; d++) {
            const nx = x + DIRS[d][0];
            const nz = z + DIRS[d][1];
            if (!index.inside(nx, y, nz) || !canStand(nx, y, nz, world)) continue;
            const nextId = index.id(nx, y, nz);
            const nextMode = buildSurfaceMode(nx, y, nz, world);
            push(nextId * SURFACE_STATE_COUNT + nextMode, price + SCAFFOLD.horizontalPrice, state, null);
          }
        }
        if (allowScaffolds &&
            (hardFloor(x, y, z) || mode !== 0) &&
            (free(x, y, z) || passageHere) &&
            touchesCube(x, y, z) &&
            free(x, y + 1, z) &&
            Features.allowsPassageStep(x, y, z, x, y + 1, z, world)) {
          // (Not up out of a door: the walk would never take that step — standNeighbors.)
          const ladderId = index.id(x, y, z);
          const mastPrice = world.mastGrid[ladderId] === 1 ? 0 : erectPrice(world, SCAFFOLD.ladderPrice, ladderId, y, BROKEN_MAST);
          const nextId = index.id(x, y + 1, z);
          const action = world.mastGrid[ladderId] === 1 ? null : { kind: 'mast', ax: 0, az: 0 };
          const nextMode = SURFACE_LADDER | (world.deckGrid[nextId] === 1 ? SURFACE_DECK : 0);
          push(nextId * SURFACE_STATE_COUNT + nextMode, price + SCAFFOLD.verticalPrice + mastPrice, state, action);
        }
        // Ladders down (a piece spans its floor and the one above; it is set from above): off a roof
        // or floor edge into the free column beside it, then on down from a ladder. 'mastDown' puts
        // the piece one floor under the cell it is set from, ax/az aside.
        if (allowScaffolds && y > 0) {
          if ((mode & SURFACE_LADDER) !== 0 && free(x, y - 1, z) && touchesCube(x, y - 1, z) &&
              world.mastGrid[index.id(x, y - 1, z)] !== 1) {
            const downId = index.id(x, y - 1, z);
            push(downId * SURFACE_STATE_COUNT + (SURFACE_LADDER | (world.deckGrid[downId] === 1 ? SURFACE_DECK : 0)),
              price + SCAFFOLD.verticalPrice + erectPrice(world, SCAFFOLD.ladderPrice, downId, y - 1, BROKEN_MAST), state, { kind: 'mastDown', ax: 0, az: 0 });
          }
          if (canStand(x, y, z, world) || mode !== 0) {
            for (let d = 0; d < DIRS.length; d++) {
              const nx = x + DIRS[d][0];
              const nz = z + DIRS[d][1];
              if (!free(nx, y, nz) || !free(nx, y - 1, nz) || !touchesCube(nx, y - 1, nz)) continue;
              if (world.mastGrid[index.id(nx, y - 1, nz)] === 1 || canStand(nx, y, nz, world)) continue;
              push(index.id(nx, y, nz) * SURFACE_STATE_COUNT + SURFACE_LADDER,
                price + SCAFFOLD.horizontalPrice + erectPrice(world, SCAFFOLD.ladderPrice, index.id(nx, y - 1, nz), y - 1, BROKEN_MAST), state,
                { kind: 'mastDown', ax: DIRS[d][0], az: DIRS[d][1] });
            }
          }
          // On top of the ladder just planned below (the step aside): climb down it.
          if (actionKind[state] === 5 && (actionAx[state] !== 0 || actionAz[state] !== 0)) {
            const downId = index.id(x, y - 1, z);
            push(downId * SURFACE_STATE_COUNT + (SURFACE_LADDER | (world.deckGrid[downId] === 1 ? SURFACE_DECK : 0)),
              price + SCAFFOLD.verticalPrice, state, null);
          }
        }
        if (allowScaffolds && (mode & SURFACE_LADDER) !== 0 && (mode & SURFACE_DECK) === 0) {
          if (free(x, y, z) || passageHere) {
            push(id * SURFACE_STATE_COUNT + (mode | SURFACE_DECK), price + erectPrice(world, SCAFFOLD.deckPrice, id, y, BROKEN_DECK), state, {
              kind: 'deck',
              x: x,
              y: y,
              z: z,
              ax: 0,
              az: 0,
            });
          }
          continue;
        }
        if (!allowScaffolds) continue;
        for (let d = 0; d < DIRS.length; d++) {
          const nx = x + DIRS[d][0];
          const nz = z + DIRS[d][1];
          if (!free(nx, y, nz)) continue;
          const nextId = index.id(nx, y, nz);
          if (canStand(nx, y, nz, world)) {
            const nextMode = buildSurfaceMode(nx, y, nz, world);
            push(nextId * SURFACE_STATE_COUNT + nextMode, price + SCAFFOLD.horizontalPrice, state, null);
            continue;
          }
          const deckPrice = world.deckGrid[nextId] === 1 ? 0 : erectPrice(world, SCAFFOLD.deckPrice, nextId, y, BROKEN_DECK);
          const action = world.deckGrid[nextId] === 1 ? null : {
            kind: 'deck',
            x: nx,
            y: y,
            z: nz,
            ax: DIRS[d][0],
            az: DIRS[d][1],
          };
          const nextMode = SURFACE_DECK | (ladderColumn(nx, y, nz, world) ? SURFACE_LADDER : 0);
          push(nextId * SURFACE_STATE_COUNT + nextMode, price + SCAFFOLD.horizontalPrice + deckPrice, state, action);
        }
      }
    if (goal < 0) return finishSearch(exactGoalIds ? null : false, goal, []);
    const steps = [];
    let cursor = goal;
    while (cursor >= 0) {
      const from = previous[cursor];
      if (from === -2) break;
      index.decodeInto(Math.floor(cursor / SURFACE_STATE_COUNT), at);
      let piece = null;
      if (actionKind[cursor] === 1) {
        index.decodeInto(Math.floor(from / SURFACE_STATE_COUNT), next);
        piece = rungPiece(world, next[0] + actionAx[cursor], next[1], next[2] + actionAz[cursor]);
      } else if (actionKind[cursor] === 2) {
        piece = deckPiece(world, at[0], at[1], at[2], actionAx[cursor], actionAz[cursor]);
      } else if (actionKind[cursor] === 5) {
        index.decodeInto(Math.floor(from / SURFACE_STATE_COUNT), next);
        piece = rungPiece(world, next[0] + actionAx[cursor], next[1] - 1, next[2] + actionAz[cursor]);
      }
      const passageBlock = actionKind[cursor] === 3 || actionKind[cursor] === 4
        ? world.blockGrid[index.id(at[0], at[1], at[2])]
        : null;
      steps.push({
        cell: [at[0], at[1], at[2]],
        piece: piece,
        passageBlock: passageBlock,
        passageVertical: actionKind[cursor] === 4,
      });
      cursor = from;
    }
    steps.reverse();
    if (exactGoalIds && asRoute) {
      const home = { id: world.routes.length, targetId: -1, home: true, owner: -1, steps: steps, stepIndex: 0, complete: false, cost: distance[goal] };
      world.routes.push(home);
      return finishSearch(home, goal, steps);
    }
    if (exactGoalIds) {
      const path = [start.slice()];
      for (let i = 0; i < steps.length; i++) path.push(steps[i].cell);
      return finishSearch(path, goal, steps);
    }
    const target = goalTargets.get(goal);
    const route = {
      id: world.routes.length,
      targetId: target.id,
      owner: -1,
      steps: steps,
      stepIndex: 0,
      complete: false,
      cost: distance[goal],
    };
    world.routes.push(route);
    return finishSearch(route, goal, steps);
  }

  function requestRoute(builder, world, targets) {
    const pending = collectRouteTargets(world, targets);
    if (pending.length === 0) {
      return null;
    }
    return routeToPending(builder, world, pending);
  }

  // A worker's route to a cell one of the cubes `pending` (x, y, z, id) can be set from: plain, with
  // scaffolds if cheaper, greedy, with passages.
  function routeToPending(builder, world, pending) {
    const search = {
      builderIndex: builder.index,
    };
    const started = performance.now();
    const ordinary = findRouteAStar(world, pending, builder.cell, false, null, Infinity, false, false);
    let result = ordinary;
    if (SCAFFOLD.enabled && (SCAFFOLD.shortcutRoutes || !ordinary)) {
      const maxCost = ordinary ? ordinary.cost : Infinity;
      const shortcut = findRouteAStar(world, pending, builder.cell, true, null, maxCost, false, false);
      if (shortcut) {
        if (ordinary) ordinary.complete = true;
        result = shortcut;
      }
    }
    if (!result) {
      result = findRouteAStar(world, pending, builder.cell, SCAFFOLD.enabled, null, Infinity, true, false);
    }
    if (!result) {
      result = findRouteAStar(world, pending, builder.cell, SCAFFOLD.enabled, null, Infinity, false, true);
    }
    world.metrics.scaffoldSearch += performance.now() - started;
    return finishRouteSearch(world, search, result);
  }

  function finishRouteSearch(world, search, result) {
    const builder = world.builders[search.builderIndex];
    if (result) {
      result.owner = builder.index;
      builder.routeId = result.id;
      builder.routeTargetId = result.targetId;
    }
    return result;
  }

  function deckErectStands(deck, world) {
    const ids = world.standIds;
    ids.length = 0;
    const index = world.index;
    const y = deck.y;
    if (ladderColumn(deck.x, y, deck.z, world) && canStand(deck.x, y, deck.z, world)) {
      ids.push(index.id(deck.x, y, deck.z));
    }
    for (let d = 0; d < DIRS.length; d++) {
      const x = deck.x + DIRS[d][0];
      const z = deck.z + DIRS[d][1];
      if (!index.inside(x, y, z)) continue;
      const id = index.id(x, y, z);
      if (!canStand(x, y, z, world)) continue;
      // Hanging on a ladder (a piece in this cell) is no place to set a deck from; its top is.
      if (world.mastGrid[id] === 1 && !deckCell(x, y, z, world)) continue;
      ids.push(id);
    }
    return ids;
  }

  // The scaffold piece a step puts its weight on: the ladder of a climb straight up or down; else
  // what holds the cell he steps into — a deck, the ladder he hangs on there, the ladder top under him.
  function supportPiece(from, to, world) {
    const index = world.index;
    if (from[0] === to[0] && from[2] === to[2]) {
      if (from[1] === to[1]) return null;
      const low = Math.min(from[1], to[1]);
      return world.mastGrid[index.id(to[0], low, to[2])] === 1 ? world.rungByKey.get(cellKey(to[0], low, to[2])) : null;
    }
    const x = to[0];
    const y = to[1];
    const z = to[2];
    if (y <= 0 || !index.inside(x, y, z)) return null;
    const id = index.id(x, y, z);
    if (world.deckGrid[id] === 1) return world.deckByKey.get(cellKey(x, y, z));
    const below = index.id(x, y - 1, z);
    if (world.solidGrid[below] === 1 || world.bridgeGrid[below] === 1 || world.doorGrid[below] === 1) return null;
    if (world.mastGrid[id] === 1) return world.rungByKey.get(cellKey(x, y, z));
    return world.mastGrid[below] === 1 ? world.rungByKey.get(cellKey(x, y - 1, z)) : null;
  }

  // A step done (builder.from → builder.to): the piece under him loses his weight and his load.
  function wearScaffold(builder, world) {
    // «Вечные леса» (advanced): no wear.
    if (!(WEAR.durability > 0) || advancedOwned(world.campaign, 'advScaffold')) return;
    const piece = supportPiece(builder.from, builder.to, world);
    if (!piece || !piece.built) return;
    // «Прочный крепёж»: the same pass wears the piece less.
    piece.durability -= (WEAR.workerWeight + carriedWeight(builder, world)) / lineValue(world.campaign, 'scaffoldDurability');
    if (!piece.cracked && piece.durability <= pieceDurability(piece) * WEAR.crackShare) {
      piece.cracked = true;
      world.events.push({ type: 'scaffoldWear', id: piece.id, x: piece.x, y: piece.y, z: piece.z });
    }
    if (piece.durability <= 0 && !piece.worn) {
      piece.worn = true;
      world.wornScaffolds.push(piece);
    }
  }

  // Worn through: the piece breaks as soon as nobody stands, hangs or steps on it.
  function settleWornScaffolds(world) {
    const list = world.wornScaffolds;
    for (let i = list.length - 1; i >= 0; i--) {
      const piece = list[i];
      if (piece.removed || !piece.built || !piece.worn) {
        list.splice(i, 1);
        continue;
      }
      if (scaffoldOccupied(piece, world)) continue;
      list.splice(i, 1);
      breakScaffold(piece, world);
    }
  }

  function scaffoldOccupied(piece, world) {
    function on(cell) {
      return cell && cell[0] === piece.x && cell[2] === piece.z && (cell[1] === piece.y || (piece.ladder && cell[1] === piece.y + 1));
    }
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (on(builder.cell)) return true;
      if (builder.phase === 'walk' && (on(builder.from) || on(builder.to))) return true;
    }
    return false;
  }

  function breakScaffold(piece, world) {
    const id = world.index.id(piece.x, piece.y, piece.z);
    piece.built = false;
    piece.reserved = false;
    piece.worn = false;
    piece.broken = true;
    if (piece.deck) {
      world.deckGrid[id] = 0;
      world.scaffoldBroken[id] |= BROKEN_DECK;
    } else {
      world.mastGrid[id] = 0;
      world.scaffoldBroken[id] |= BROKEN_MAST;
    }
    world.stats.scaffoldBreaks += 1;
    world.events.push({ type: 'scaffoldWear', id: piece.id, x: piece.x, y: piece.y, z: piece.z, broken: true });
    invalidateNav(world, piece.x, piece.y, piece.z);
  }

  // A new, repaired or taken-down piece: full durability, no cracks, nothing to repair.
  function resetWear(piece, world) {
    piece.durability = pieceDurability(piece);
    piece.cracked = false;
    piece.worn = false;
    if (piece.broken) {
      piece.broken = false;
      world.scaffoldBroken[world.index.id(piece.x, piece.y, piece.z)] &= piece.deck ? ~BROKEN_DECK : ~BROKEN_MAST;
    }
  }

  function finishErect(builder, world) {
    const piece = builder.erectPiece;
    world.constructionStallElapsed = 0;
    builder.erectPiece = null;
    piece.reserved = false;
    piece.built = true;
    const id = world.index.id(piece.x, piece.y, piece.z);
    const repair = Boolean(piece.broken);
    resetWear(piece, world);
    if (repair) world.stats.scaffoldRepairs += 1;
    if (piece.deck) {
      world.deckGrid[id] = 1;
      if (!repair) world.stats.decks += 1;
    } else {
      world.mastGrid[id] = 1;
      if (!repair) world.stats.ladders += 1;
    }
    world.events.push({ type: 'scaffold', ids: [piece.id], x: piece.x, y: piece.y, z: piece.z, repair: repair });
    invalidateNav(world, piece.x, piece.y, piece.z);
    requestWork(builder, world);
  }

  function finishPassage(builder, world) {
    const block = builder.passageBlock;
    const vertical = builder.passageVertical;
    builder.passageBlock = null;
    builder.passageVertical = false;
    if (cuttableBlock(block)) {
      const id = world.index.id(block.x, block.y, block.z);
      block.feature = vertical ? 'hatch' : 'door';
      block.faceX = vertical ? 0 : block.x - builder.cell[0];
      block.faceZ = vertical ? 0 : block.z - builder.cell[2];
      block.style = 'wood';
      block.additionalDoor = true;
      world.solidGrid[id] = 0;
      world.doorGrid[id] = 1;
      invalidateNav(world, block.x, block.y, block.z);
      world.events.push({ type: 'retrofitDoor', block: block });
      if (vertical) world.stats.verticalHatches += 1;
      else world.stats.additionalDoors += 1;
      world.constructionStallElapsed = 0;
    }
    builder.phase = 'idle';
    builder.wait = 0;
    requestWork(builder, world);
  }

  function purchasesFromBalance() {
    const purchases = {};
    const kinds = Object.keys(SESSION_BALANCE);
    for (let i = 0; i < kinds.length; i++) purchases[kinds[i]] = 0;
    return purchases;
  }

  // ---------- air taxis (docs/gdd/02-construction-session.md → «Аэротакси») ----------
  // The stand is the helipad by the quarries (level.elevators[0], taxiHelipad), up to four
  // taxis on it. «Аэротакси» — how many, «Скорость аэротакси» — how fast they fly, «Потолок
  // аэротакси» — the highest floor they land on. Positions are world units (a cell's centre is +0.5;
  // y is the floor a taxi stands on). A taxi flies up, across and down, always above everything
  // built on its way (cubes and scaffolds), so it never passes through a cube.
  const TAXI_SPOTS = [[0.75, 0.75], [2.25, 2.25], [2.25, 0.75], [0.75, 2.25]];

  function activateTaxis(world) {
    const pad = world.level.elevators && world.level.elevators[0];
    if (!pad) return;
    const count = Math.min(TAXI_SPOTS.length, sessionValue('elevators', world.campaign.purchases.elevators));
    world.taxiPad = pad;
    while (world.taxis.length < count) {
      const i = world.taxis.length;
      const spot = [pad.x + TAXI_SPOTS[i][0], 0, pad.z + TAXI_SPOTS[i][1]];
      world.taxis.push({ index: i, spot: spot, pos: spot.slice(), state: 'parked', legs: [], leg: 0, t: 0,
        passenger: null, drop: null, heading: Math.PI * i / 2 });
    }
    world.events.push({ type: 'taxis' });
  }

  function taxiCeiling(world) {
    return sessionValue('elevatorHeight', world.campaign.purchases.elevatorHeight);
  }

  // Cells a second (horizontal, vertical): TAXI.fly / TAXI.rise times the ground walk, «Скорость
  // аэротакси» on top — its share of the first level's time.
  function taxiSpeeds(world) {
    const walk = walkSpeedNow(world);
    const up = sessionValue('elevatorSpeed', 0) / sessionValue('elevatorSpeed', world.campaign.purchases.elevatorSpeed);
    return [TAXI.fly * walk * up, TAXI.rise * walk * up];
  }

  // The top of what stands in a column (cubes, ladders, decks): the first free height above it.
  // boardTaxi weighs many flights at once: their columns are read once (taxiTops).
  let taxiTops = null;
  function columnTop(world, x, z) {
    const key = x * 4096 + z;
    if (taxiTops && taxiTops.has(key)) return taxiTops.get(key);
    const top = scanColumn(world, x, z);
    if (taxiTops) taxiTops.set(key, top);
    return top;
  }

  function scanColumn(world, x, z) {
    const index = world.index;
    for (let y = world.level.footprint.maxY + 3; y >= 0; y--) {
      if (!index.inside(x, y, z)) continue;
      const id = index.id(x, y, z);
      if (world.solidGrid[id] === 1 || world.mastGrid[id] === 1 || world.deckGrid[id] === 1) return y + 1;
    }
    return 0;
  }

  // The height a flight from a to b crosses at: above every column under its line (the taxi's width
  // too), clear by TAXI.clearance.
  function taxiCruise(world, a, b) {
    let top = Math.max(a[1], b[1]);
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) * 2));
    const seen = new Set();
    for (let i = 0; i <= steps; i++) {
      const x = a[0] + dx * i / steps;
      const z = a[2] + dz * i / steps;
      for (let ox = -0.45; ox <= 0.45; ox += 0.9) {
        for (let oz = -0.45; oz <= 0.45; oz += 0.9) {
          const cx = Math.floor(x + ox);
          const cz = Math.floor(z + oz);
          const key = cx * 4096 + cz;
          if (seen.has(key)) continue;
          seen.add(key);
          top = Math.max(top, columnTop(world, cx, cz));
        }
      }
    }
    return top + TAXI.clearance;
  }

  // A flight: straight up, across at the cruise height, straight down. → { legs, seconds }.
  function taxiFlight(world, a, b) {
    const cruise = taxiCruise(world, a, b);
    const speeds = taxiSpeeds(world);
    const up = [a[0], cruise, a[2]];
    const over = [b[0], cruise, b[2]];
    const legs = [
      { from: a.slice(), to: up, seconds: (cruise - a[1]) / speeds[1] },
      { from: up, to: over, seconds: Math.hypot(b[0] - a[0], b[2] - a[2]) / speeds[0] },
      { from: over, to: b.slice(), seconds: (cruise - b[1]) / speeds[1] },
    ];
    return { legs: legs, seconds: legs[0].seconds + legs[1].seconds + legs[2].seconds };
  }

  function cellCentre(cell) {
    return [cell[0] + 0.5, cell[1], cell[2] + 0.5];
  }

  // Where a taxi can put him down to set one of his cubes: a cell he can set it from, with open sky
  // above (nothing over it), up to the ceiling. The quickest flight from `from`. → { cell, seconds }.
  function taxiDrop(builder, world, targets, from) {
    const index = world.index;
    const ceiling = taxiCeiling(world);
    const pending = collectRouteTargets(world, targets);
    let best = null;
    const seen = new Set();
    for (let p = 0; p < pending.length; p++) {
      const block = pending[p];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            const x = block.x + dx;
            const y = block.y + dy;
            const z = block.z + dz;
            if (y < 1 || y >= ceiling || !index.inside(x, y, z)) continue;
            const id = index.id(x, y, z);
            if (seen.has(id)) continue;
            seen.add(id);
            if (!canStand(x, y, z, world)) continue;
            if (!canBuildBlockFrom(x, y, z, buildSurfaceMode(x, y, z, world), block, world)) continue;
            if (columnTop(world, x, z) > y) continue;
            const flight = taxiFlight(world, from, cellCentre([x, y, z]));
            if (!best || flight.seconds < best.seconds) best = { cell: [x, y, z], seconds: flight.seconds };
          }
        }
      }
    }
    return best;
  }

  // The building's height in floors: its highest built cube (floor = y + 1), read again after a change.
  function builtFloors(world) {
    if (world.floorsSerial !== world.navSerial) {
      let top = 0;
      for (let i = 0; i < world.blocks.length; i++) {
        if (world.blocks[i].built && world.blocks[i].y + 1 > top) top = world.blocks[i].y + 1;
      }
      world.floors = top;
      world.floorsSerial = world.navSerial;
    }
    return world.floors;
  }

  // Floors still to build before the taxi line opens (TAXI.minFloors); 0 — it is open.
  function taxiFloorsShort(world) {
    return Math.max(0, TAXI.minFloors - builtFloors(world));
  }

  // Where he gets in: the pad cell next to the taxi's corner (one per taxi, clockwise).
  const TAXI_BOARD = [[1, 0], [1, 2], [2, 1], [0, 1]];
  function taxiBoardCell(world, taxi) {
    const pad = world.taxiPad;
    return [pad.x + TAXI_BOARD[taxi.index][0], 0, pad.z + TAXI_BOARD[taxi.index][1]];
  }

  // A walk's seconds with the load (the same speeds as advanceWalk, overload counted).
  function pathSeconds(builder, world, path) {
    let seconds = 0;
    for (let i = 1; i < path.length; i++) seconds += 1 / segmentSpeed(path[i - 1], path[i], world);
    return seconds * carryOverload(builder, world);
  }

  // His route's seconds with the load: its price (flat steps at the ground walk, climbs, scaffolds to
  // set, passages) plus the decks — up on the building he walks slower (deckFactor), which the
  // planner's flat price leaves out.
  function routeSeconds(builder, world, route) {
    const walk = walkSpeedNow(world);
    let seconds = route.cost / walk;
    let from = builder.cell;
    for (let i = 0; i < route.steps.length; i++) {
      const to = route.steps[i].cell;
      if (from[1] > 0 || to[1] > 0) {
        seconds += 1 / segmentSpeed(from, to, world) - moveCost(from[0], from[1], from[2], to[0], to[1], to[2]) / walk;
      }
      from = to;
    }
    return seconds * carryOverload(builder, world);
  }

  // With a load on the ground (at the quarry): on foot (his route) or by air — a walk to a taxi on
  // the pad, boarding, the flight, getting off. Only with a taxi standing on the pad; the taxi wins
  // while it is no slower than walking × TAXI.prefer, and is booked for him while he walks to it.
  function boardTaxi(builder, world, targets, route) {
    if (!world.taxis || world.taxis.length === 0 || builder.cell[1] !== 0 || builder.camp) return false;
    let taxi = null;
    let best = Infinity;
    for (let i = 0; i < world.taxis.length; i++) {
      const t = world.taxis[i];
      if (t.state !== 'parked') continue;
      const board = taxiBoardCell(world, t);
      const d = Math.abs(board[0] - builder.cell[0]) + Math.abs(board[2] - builder.cell[2]);
      if (d < best) {
        best = d;
        taxi = t;
      }
    }
    if (!taxi) return false;
    const onFoot = routeSeconds(builder, world, route) * TAXI.prefer;
    // The flight alone (with boarding) already slower: no need to look for the way to the pad.
    taxiTops = new Map();
    const drop = taxiDrop(builder, world, targets, taxi.spot);
    taxiTops = null;
    if (!drop || !(drop.seconds + 2 * TAXI.board < onFoot)) return false;
    const path = findPathToCell(builder.cell, taxiBoardCell(world, taxi), world);
    if (!path || !(pathSeconds(builder, world, path) + drop.seconds + 2 * TAXI.board < onFoot)) return false;
    cancelRoute(builder, world);
    builder.taxi = taxi;
    builder.taxiRiding = false;
    builder.wait = 0;
    taxi.passenger = builder;
    taxi.drop = drop.cell;
    taxi.state = 'booked';
    taxi.legs = [];
    taxi.t = 0;
    world.events.push({ type: 'taxiCall', builder: builder, taxi: taxi.index });
    beginWalk(builder, path, 'taxi', world);
    return true;
  }

  // At the taxi: in he gets (boarding), unless it was let go meanwhile — then back to work.
  function reachTaxi(builder, world) {
    const taxi = builder.taxi;
    if (!taxi || taxi.passenger !== builder || taxi.state !== 'booked') {
      builder.taxi = null;
      builder.phase = 'idle';
      builder.wait = 0;
      requestWork(builder, world);
      return;
    }
    builder.phase = 'taxi';
    builder.wait = 0;
    builder.faceX = taxi.spot[0];
    builder.faceZ = taxi.spot[2];
    taxiHold(taxi, 'boarding');
  }

  // Off the way to his taxi (a reroute): the booking is let go.
  function leaveTaxi(builder) {
    const taxi = builder.taxi;
    builder.taxi = null;
    builder.taxiRiding = false;
    if (taxi && taxi.passenger === builder && taxi.state === 'booked') {
      taxi.passenger = null;
      taxi.drop = null;
      taxi.state = 'parked';
    }
  }

  function taxiFly(world, taxi, to, state) {
    const flight = taxiFlight(world, taxi.pos, to);
    taxi.legs = flight.legs;
    taxi.leg = 0;
    taxi.t = 0;
    taxi.state = state;
  }

  // A pause on the spot (boarding, getting off): one leg standing still.
  function taxiHold(taxi, state) {
    taxi.legs = [{ from: taxi.pos.slice(), to: taxi.pos.slice(), seconds: TAXI.board }];
    taxi.leg = 0;
    taxi.t = 0;
    taxi.state = state;
  }

  function stepTaxis(world, dt) {
    for (let i = 0; i < world.taxis.length; i++) {
      const taxi = world.taxis[i];
      if (taxi.state === 'parked') continue;
      // Booked: it waits on the pad while he walks to it; anything else he turned to lets it go.
      if (taxi.state === 'booked') {
        const walker = taxi.passenger;
        if (!walker || walker.taxi !== taxi || walker.phase !== 'walk' || walker.walkPurpose !== 'taxi') {
          if (walker && walker.taxi === taxi) walker.taxi = null;
          taxi.passenger = null;
          taxi.drop = null;
          taxi.state = 'parked';
        }
        continue;
      }
      // The passenger was taken off the job (a new site, an emergency): the taxi goes home.
      if (taxi.passenger && taxi.passenger.taxi !== taxi) {
        taxi.passenger = null;
        taxiFly(world, taxi, taxi.spot, 'return');
      }
      taxi.t += dt;
      while (taxi.state !== 'parked' && taxi.t >= taxi.legs[taxi.leg].seconds) {
        taxi.t -= taxi.legs[taxi.leg].seconds;
        taxi.leg += 1;
        if (taxi.leg < taxi.legs.length) continue;
        const end = taxi.legs[taxi.legs.length - 1].to;
        taxi.pos[0] = end[0];
        taxi.pos[1] = end[1];
        taxi.pos[2] = end[2];
        taxiArrive(world, taxi);
        if (taxi.state === 'parked') taxi.t = 0;
      }
      if (taxi.state === 'parked') continue;
      const leg = taxi.legs[taxi.leg];
      const u = leg.seconds > 0 ? Math.min(1, taxi.t / leg.seconds) : 1;
      taxi.pos[0] = leg.from[0] + (leg.to[0] - leg.from[0]) * u;
      taxi.pos[1] = leg.from[1] + (leg.to[1] - leg.from[1]) * u;
      taxi.pos[2] = leg.from[2] + (leg.to[2] - leg.from[2]) * u;
      if (leg.to[0] !== leg.from[0] || leg.to[2] !== leg.from[2]) taxi.heading = Math.atan2(leg.to[0] - leg.from[0], leg.to[2] - leg.from[2]);
    }
  }

  function taxiArrive(world, taxi) {
    const builder = taxi.passenger;
    if (taxi.state === 'boarding' && builder) {
      builder.taxiRiding = true;
      taxiFly(world, taxi, cellCentre(taxi.drop), 'carry');
    } else if (taxi.state === 'carry' && builder) taxiHold(taxi, 'alighting');
    else if (taxi.state === 'alighting' && builder) {
      // Off at the drop; if a cube took the cell meanwhile — a free one next to it, else the ground.
      let cell = taxi.drop;
      if (!canStand(cell[0], cell[1], cell[2], world)) {
        cell = null;
        for (let d = 0; d < DIRS.length && !cell; d++) {
          const x = taxi.drop[0] + DIRS[d][0];
          const z = taxi.drop[2] + DIRS[d][1];
          if (canStand(x, taxi.drop[1], z, world)) cell = [x, taxi.drop[1], z];
        }
        if (!cell) cell = [Math.floor(taxi.spot[0]), 0, Math.floor(taxi.spot[2])];
      }
      builder.cell = cell.slice();
      builder.from = cell.slice();
      builder.to = cell.slice();
      builder.segmentT = 0;
      builder.taxi = null;
      builder.taxiRiding = false;
      builder.phase = 'idle';
      builder.wait = 0;
      taxi.passenger = null;
      taxi.drop = null;
      world.events.push({ type: 'taxiDrop', builder: builder, taxi: taxi.index });
      taxiFly(world, taxi, taxi.spot, 'return');
    } else {
      taxi.passenger = null;
      if (taxi.state === 'return') {
        taxi.state = 'parked';
        taxi.legs = [];
      } else taxiFly(world, taxi, taxi.spot, 'return');
    }
  }

  function dronePad(world, slot) {
    const mine = world.level.mines[0];
    return [mine.x + 2.5 + (slot % 4) * 1.3, 0.32, mine.z - 2.5 - Math.floor(slot / 4) * 1.3];
  }

  function spawnEngineer(world) {
    const slot = countTrade(world, 'engineer');
    const pad = dronePad(world, slot);
    const builder = createBuilder(world.builders.length, pad);
    builder.trade = 'engineer';
    builder.shirt = 0x3d7ea6;
    builder.phase = 'home';
    builder.wait = 0.4 + slot * 0.15;
    builder.droneSlot = slot;
    builder.droneJob = '';
    builder.droneBlock = null;
    builder.currentSpeed = 0;
    builder.heading = 0;
    builder.headingReady = true;
    world.builders.push(builder);
    world.events.push({ type: 'spawn', builder: builder });
    return builder;
  }

  function spawnHelicopter(world) {
    const index = world.vehicles.length;
    const spawnIndex = world.level.spawnPoints.length - 1 - ((index * 3) % world.level.spawnPoints.length);
    const vehicle = createVehicle(index, world.level.spawnPoints[spawnIndex]);
    vehicle.kind = 'heli';
    world.vehicles.push(vehicle);
    world.events.push({ type: 'spawnVehicle', vehicle: vehicle });
    return vehicle;
  }

  function countTrade(world, trade) {
    let count = 0;
    for (let i = 0; i < world.builders.length; i++) {
      if (world.builders[i].trade === trade) count += 1;
    }
    return count;
  }

  function countKind(world, kind) {
    let count = 0;
    for (let i = 0; i < world.vehicles.length; i++) {
      if (world.vehicles[i].kind === kind) count += 1;
    }
    return count;
  }

  function createCampaign() {
    return {
      levelIndex: 0,
      coins: 0,
      builderCount: sessionValue('builders', 0),
      metaBuilders: sessionValue('builders', 0),
      metaWorkerRanks: [],
      vehicleCount: sessionValue('vehicles', 0),
      metaVehicles: sessionValue('vehicles', 0),
      purchases: purchasesFromBalance(),
      devGroups: {
        all: false,
        workers: false,
        cubes: false,
        economy: false,
        loaders: false,
        helicopters: false,
        elevators: false,
        site: false,
      },
      totalElapsed: 0,
      levelElapsed: 0,
      status: 'title',
      levelTimes: [],
      levelStats: [],
      freePurchases: false,
      // Tokens of this construction (meta.js → configureNewCampaign: balance.tokens.start) and the
      // graph's passes opened with them (buyGate).
      tokens: 0,
      gates: {},
      // Advanced key nodes bought on this site (buyAdvanced) and those the tech center researched.
      advanced: {},
      advancedOpen: [],
      runMode: 'campaign',
      runPayload: null,
      metaPlaceSpeed: 1,
      metaPickupSpeed: 1,
      metaHeightPenalty: 1,
      metaCarry: 0,
      metaCarryScale: 1,
      metaClimb: 1,
      metaSmokeShort: 1,
      metaHunger: 1,
      metaSmoke: 1,
      foremen: {},
      foremanKinds: [],
      foremanRush: 1,
      bonusDrones: 0,
      coinsEarned: 0,
      coinRewardRemainder: 0,
      metaMovement: 1,
      metaScaffold: 1,
      metaPlan: 0,
      metaNightRelief: 0,
      metaCoinMultiplier: 1,
      metaCapitalChance: 0,
      metaCapitalValue: 1,
      environmentWorkMultiplier: 1,
      environmentMoveMultiplier: 1,
      environmentWalkMultiplier: 1,
      environmentDeckMultiplier: 1,
      environmentFloorStep: 0,
      environmentCarryMultiplier: 1,
      environmentLightning: 0,
      environmentHungerRate: 1,
      environmentSmokeRate: 1,
      environmentFatigueRate: 1,
      mealInterval: 240,
      mealAwaySeconds: 60,
      mealKitchenSeconds: BALANCE.mealKitchenSeconds,
      restInterval: BALANCE.restInterval,
      restSeconds: BALANCE.restSeconds,
      smokeInterval: 120,
      smokeSeconds: BALANCE.smokeSeconds,
      kitchenUnlocked: false,
      // Canteen (meta.js applyCardStats): the personnel centre is built; dishes of the cookbook.
      canteenOpen: false,
      canteenDishes: ['kasha'],
      canteenSeatBonus: 0,
      // Sales office: the personnel centre stands (the office may stand on this site); the highest
      // level of the site's «Офис продаж» (1 + meta «Уровни офиса продаж»).
      salesOpen: false,
      dormOpen: false,
      dormMaxLevel: 1,
      loungeOpen: false,
      loungeMaxLevel: 1,
      lightOpen: false,
      lightMaxLevel: 1,
      siteNightRelief: 0,
      salesMaxLevel: 1,
      canteenMaxLevel: 1,
      canteenMealSeconds: CANTEEN.mealSeconds,
      resumeBuiltIds: [],
    };
  }

  function restoreBuiltBlocks(world, builtIds) {
    const blocksById = new Map();
    for (let i = 0; i < world.blocks.length; i++) blocksById.set(world.blocks[i].id, world.blocks[i]);
    for (let i = 0; i < builtIds.length; i++) {
      const block = blocksById.get(builtIds[i]);
      block.poured = pourTotal(block);
      block.built = true;
      block.reserved = false;
      block.owner = -1;
      world.built.add(cellKey(block.x, block.y, block.z));
      occupyBuiltBlock(block, world);
      world.remaining -= 1;
    }
    for (let i = 0; i < world.blocks.length; i++) {
      const block = world.blocks[i];
      block.ready = !block.built && isSupported(block, world);
    }
    world.constructionProgressRemaining = world.remaining;
  }

  // Offline work as mass (kg): whole cubes in build order while the budget lasts; a cube is set when
  // at least half of its remaining mass fits.
  function applyOfflineMass(world, mass) {
    return applyOfflineBlocks(world, Infinity, mass);
  }

  function applyOfflineBlocks(world, count, massBudget) {
    const built = [];
    let mass = massBudget === undefined ? Infinity : massBudget;
    while (count > 0 && world.remaining > 0 && mass > 0) {
      let block = null;
      for (let i = 0; i < world.orderedBlocks.length; i++) {
        const candidate = world.orderedBlocks[i];
        if (!candidate.built && isSupported(candidate, world)) {
          block = candidate;
          break;
        }
      }
      if (!block) break;
      const left = MATERIAL[block.materialId].weight * (1 - block.poured / pourTotal(block));
      if (left * 0.5 > mass) break;
      mass -= left;
      const pay = grantPlacePay(world, block, pourTotal(block) - block.poured);
      block.poured = pourTotal(block);
      block.built = true;
      block.reserved = false;
      block.owner = -1;
      world.built.add(cellKey(block.x, block.y, block.z));
      occupyBuiltBlock(block, world);
      world.remaining -= 1;
      cubeSet(world);
      block.capitalPay = pay.capital;
      built.push(block);
      count -= 1;
    }
    if (built.length > 0) {
      refreshReadyBatch(world, built);
      invalidateNavBatch(world, built);
      let capital = 0;
      for (let i = 0; i < built.length; i++) capital += built[i].capitalPay;
      world.events.push({ type: 'autofill', blocks: built, capital: capital });
    }
    if (world.remaining === 0) finishLevel(world);
    return built;
  }

  function startLevel(campaign) {
    const level = campaign.runMode === 'hq' ? HQ_LEVELS[campaign.runPayload.projectId]
      : campaign.runMode === 'school' ? schoolLevel(campaign.runPayload.bossId, campaign.runPayload.tier) : LEVELS[campaign.levelIndex];
    if (!level) throw Error('Unknown construction site: ' + campaign.runMode);
    campaign.status = 'play';
    campaign.levelElapsed = 0;
    const bounds = {
      minX: level.bounds.minX - 2,
      maxX: level.bounds.maxX + 2,
      minZ: level.bounds.minZ - 2,
      maxZ: level.bounds.maxZ + 2,
      // Tall enough for the tallest camp building this site may raise, with scaffolds over it.
      maxY: Math.max(level.bounds.maxY + 2, campTop(campaign) + 2),
    };
    const index = createIndex(bounds);
    const size = index.size;
    const world = {
      campaign: campaign,
      level: level,
      index: index,
      solidGrid: new Uint8Array(size),
      prev: new Int32Array(size),
      searchStamp: 0,
      xStamp: new Uint32Array(size),
      singleGoal: new Int32Array(1),
      vehicleCell: [0, 0, 0],
      vehicleQueue: [],
      vehiclePathStamp: new Uint32Array(size),
      vehiclePrevious: new Int32Array(size),
      vehiclePathEpoch: 0,
      neighborIds: [],
      standIds: [],
      escapeQueue: [],
      nearbyBlocks: [],
      at: [0, 0, 0],
      nxt: [0, 0, 0],
      goalCell: [0, 0, 0],
      turnCell: [0, 0, 0],
      safeGroundCell: [0, 0, 0],
      safeGroundQueue: [],
      safeGroundStamp: new Uint32Array(size),
      safeGroundSerial: 0,
      safeGroundEpoch: 0,
      exteriorCell: [0, 0, 0],
      exteriorQueue: [],
      exteriorStamp: new Uint32Array(size),
      exteriorEpoch: 0,
      exteriorNavSerial: -1,
      doorCutCell: [0, 0, 0],
      doorCutNeighbor: [0, 0, 0],
      doorCutDistance: new Float64Array(size),
      doorCutPrevious: new Int32Array(size),
      doorCutHeap: createHeap(),
      navEpoch: 1,
      navSerial: 1,
      navCursor: 0,
      navStamp: new Uint32Array(size),
      navHead: new Int32Array(size),
      navCount: new Uint8Array(size),
      navPool: new Int32Array(size * 16),
      routeDistance: new Float64Array(size * SURFACE_STATE_COUNT),
      routePrevious: new Int32Array(size * SURFACE_STATE_COUNT),
      routeActionKind: new Uint8Array(size * SURFACE_STATE_COUNT),
      routeActionAx: new Int8Array(size * SURFACE_STATE_COUNT),
      routeActionAz: new Int8Array(size * SURFACE_STATE_COUNT),
      routeTurns: new Uint16Array(size * SURFACE_STATE_COUNT),
      routeDirection: new Uint8Array(size * SURFACE_STATE_COUNT),
      routeSeen: new Uint32Array(size * SURFACE_STATE_COUNT),
      routeSettled: new Uint32Array(size * SURFACE_STATE_COUNT),
      routeSearchStamp: 0,
      routeHeap: createHeap(),
      routes: [],
      // Air taxis on the helipad (activateTaxis).
      taxis: [],
      taxiPad: null,
      deckByKey: new Map(),
      blocks: level.blocks.map(function (block) {
        return {
          id: block.id,
          x: block.x,
          y: block.y,
          z: block.z,
          materialId: block.materialId,
          feature: block.feature,
          faceX: block.faceX,
          faceZ: block.faceZ,
          style: block.style,
          rails: block.rails,
          shell: block.shell,
          priority: block.priority,
          glassOf: block.glassOf,
          glassId: block.glassId,
          built: false,
          reserved: false,
          ready: false,
          failedNavSerial: -1,
          poured: 0,
          owner: -1,
          // Mini-cubes of this cube still to be picked up in its owner's current plan.
          planLeft: 0,
          // Trips already made for this cube (view: «несёт частями: 2 из 5»).
          haulTrips: 0,
        };
      }),
      built: new Set(),
      builders: [],
      vehicles: [],
      events: [],
      remaining: level.blocks.length,
      constructionProgressRemaining: level.blocks.length,
      timeLedger: {},
      timeCategories: {},
      foremanBuilt: [],
      foremanCubes: 0,
      foremanTrips: 0,
      tripStats: [],
      floorStack: 0,
      windowRushUntil: 0,
      feastUntil: 0,
      floorBlocks: [],
      floorsDone: [],
      constructionStallElapsed: 0,
      completed: false,
      autoCompleted: 0,
      blocked: false,
      scaffoldPieces: [],
      scaffoldDecks: [],
      mastGrid: new Uint8Array(size),
      deckGrid: new Uint8Array(size),
      // Broken scaffold pieces waiting for repair: BROKEN_MAST | BROKEN_DECK by cell.
      scaffoldBroken: new Uint8Array(size),
      wornScaffolds: [],
      doorGrid: new Uint8Array(size),
      bridgeGrid: new Uint8Array(size),
      waterGrid: new Uint8Array(size),
      campGrid: new Uint8Array(size),
      rungByKey: new Map(),
      cubeSet: new Set(),
      blockByKey: new Map(),
      glassByKey: new Map(),
      blockGrid: new Array(size),
      orderedBlocks: [],
      nextLoadBatchId: 1,
      vehicleWorkSerial: 1,
      vehicleNoWorkSerial: 0,
      stats: {
        ladders: 0,
        decks: 0,
        scaffoldBreaks: 0,
        scaffoldRepairs: 0,
        additionalDoors: 0,
        verticalHatches: 0,
        vehicleBlocks: 0,
        lightningStrikes: 0,
        lightningCubes: 0,
      },
      lightningTimer: null,
      metrics: {
        scheduler: 0,
        path: 0,
        scaffoldSearch: 0,
        simulation: 0,
        scaffoldExpansions: 0,
        pathSearches: 0,
        aStarSearches: 0,
        aStarPeak: null,
        assignments: 0,
        invalidations: 0,
      },
    };
    world.orderedBlocks = world.blocks.slice();
    for (let i = 0; i < world.blocks.length; i++) {
      const y = world.blocks[i].y;
      (world.floorBlocks[y] = world.floorBlocks[y] || []).push(world.blocks[i]);
    }
    world.orderedBlocks.sort(function (a, b) {
      return a.priority - b.priority || a.id - b.id;
    });
    for (let i = 0; i < world.blocks.length; i++) {
      const block = world.blocks[i];
      if (block.glassOf !== undefined) {
        world.glassByKey.set(cellKey(block.x, block.y, block.z), block);
        continue;
      }
      world.cubeSet.add(cellKey(block.x, block.y, block.z));
      world.blockByKey.set(cellKey(block.x, block.y, block.z), block);
      world.blockGrid[index.id(block.x, block.y, block.z)] = block;
    }
    for (let i = 0; i < world.blocks.length; i++) {
      world.blocks[i].ready = isSupported(world.blocks[i], world);
    }
    // Mine piles are visual pickup points, not obstacles or scaffold supports.
    restoreBuiltBlocks(world, campaign.resumeBuiltIds);
    createCamp(world);
    campaign.builderCount = campaign.metaBuilders + sessionGain('builders', campaign.purchases.builders);
    for (let i = 0; i < campaign.builderCount; i++) spawnBuilder(world);
    campaign.vehicleCount = campaign.metaVehicles + sessionGain('vehicles', campaign.purchases.vehicles);
    for (let i = 0; i < campaign.vehicleCount; i++) spawnVehicle(world);
    const engineers = sessionValue('engineers', campaign.purchases.engineers);
    for (let i = 0; i < engineers; i++) spawnEngineer(world);
    const helicopters = sessionValue('helicopters', campaign.purchases.helicopters);
    for (let i = 0; i < helicopters; i++) spawnHelicopter(world);
    activateTaxis(world);
    // «Механик» brings drones from the start (they stay until the order is done).
    for (let i = 0; i < campaign.bonusDrones; i++) spawnEngineer(world);
    return world;
  }

  function advanceLevel(campaign) {
    campaign.levelIndex += 1;
    campaign.levelElapsed = 0;
    if (campaign.levelIndex >= LEVELS.length) {
      campaign.status = 'won';
      return null;
    }
    return startLevel(campaign);
  }

  function stepWorld(world, dt) {
    if (world.campaign.status !== 'play') return;
    const started = performance.now();
    world.campaign.totalElapsed += dt;
    world.campaign.levelElapsed += dt;
    // Techno-magic: mana fills only while a reactor form stands on the site — manaPerLevel a minute
    // and manaMaxBase + manaMaxPerLevel stored per level of the standing form.
    const reactorLevel = world.reactor && campActive(world, world.reactor) ? world.reactor.form || 0 : 0;
    world.campaign.manaRate = reactorLevel > 0 ? REACTOR_SITE.manaPerLevel * reactorLevel * (1 + advancedValue(world.campaign, 'advMana', 0)) : 0;
    world.campaign.manaMax = REACTOR_SITE.manaMaxBase + REACTOR_SITE.manaMaxPerLevel * reactorLevel;
    if (world.campaign.manaRate > 0) {
      world.campaign.mana = Math.min(world.campaign.manaMax, (world.campaign.mana || 0) + dt * world.campaign.manaRate / 60);
    }
    world.campaign.foremanRush = foremanRush(world);
    spellHasteNow = (world.campaign.spellHasteUntil || 0) > world.campaign.levelElapsed ? world.campaign.spellHaste || 2 : 1;
    canteenNow.elapsed = world.campaign.levelElapsed;
    canteenNow.torte = (world.torteUntil || 0) > world.campaign.levelElapsed;
    canteenNow.feast = (world.feastDishUntil || 0) > world.campaign.levelElapsed;
    canteenNow.grand = world.grandStacks || {};
    const builders = world.builders;
    for (let i = 0; i < builders.length; i++) updateBuilder(builders[i], world, dt);
    stepTaxis(world, dt);
    if (world.wornScaffolds.length > 0) settleWornScaffolds(world);
    if (world.sales) stepSales(world, dt);
    if (world.camp && world.camp.length > 0) {
      stepCampForms(world);
      stepCampStall(world, dt);
      stripCampScaffolds(world);
    }
    world.campaign.siteNightRelief = lightRelief(world);
    const vehicles = world.vehicles;
    for (let i = 0; i < vehicles.length; i++) updateVehicle(vehicles[i], world, dt);
    if (world.remaining < world.constructionProgressRemaining) {
      world.constructionProgressRemaining = world.remaining;
      world.constructionStallElapsed = 0;
      world.noCubeElapsed = 0;
      world.leftoverChecked = 0;
    } else {
      world.constructionStallElapsed += dt;
      world.noCubeElapsed = (world.noCubeElapsed || 0) + dt;
    }
    finishLeftovers(world);
    resolveConstructionStall(world);
    if (world.foremanBuilt.length > 0) stepForemen(world);
    stepLightning(world, dt);
    world.metrics.simulation += performance.now() - started;
  }

  // ---------- lightning (storm) ----------
  // A storm (campaign.environmentLightning — the rate, Meta.applyEnvironment) strikes lightning about
  // every strikeSeconds (±50 %, balance.json → tuning.environment.lightning) into a cube that tops its
  // column, from floor minFloor up, and knocks it out together with its built neighbours of the 3×3×3
  // around it. Knocked-out cubes go back into the plan and pay again when set
  // (docs/gdd/08-needs-weather-events.md → «Разрушительные события»). Only what can go without harm
  // goes (canKnockOut); a strike that would take nothing finds another cube.
  const LIGHTNING = TUNING.environment.lightning;

  function lightningInterval(rate) {
    return LIGHTNING.strikeSeconds * (0.5 + Math.random()) / rate;
  }

  function stepLightning(world, dt) {
    const rate = world.campaign.environmentLightning || 0;
    if (!(rate > 0) || world.remaining <= 0 || world.completed) {
      world.lightningTimer = null;
      return;
    }
    // «Громоотводы»: strikes come that many times more rarely.
    const rods = lineValue(world.campaign, 'lightningRods') * (world.campaign.office ? world.campaign.office.lightning : 1);
    if (world.lightningTimer === null || world.lightningTimer === undefined) world.lightningTimer = lightningInterval(rate) * rods;
    world.lightningTimer -= dt;
    if (world.lightningTimer > 0) return;
    world.lightningTimer = lightningInterval(rate) * rods;
    strikeLightning(world);
  }

  function blockAt(world, x, y, z) {
    if (y < 0 || !world.index.inside(x, y, z)) return null;
    return world.blockGrid[world.index.id(x, y, z)] || null;
  }

  // A plain built cube: not a feature, not a window or its wall cube.
  function strikableCube(block) {
    return !!block && block.built && !block.feature && block.glassOf === undefined && block.glassId === undefined;
  }

  // The top cube of every column, from floor minFloor up.
  function lightningTargets(world) {
    const tops = new Map();
    for (let i = 0; i < world.blocks.length; i++) {
      const block = world.blocks[i];
      if (!block.built || block.glassOf !== undefined) continue;
      const key = block.x + ',' + block.z;
      const top = tops.get(key);
      if (!top || block.y > top.y) tops.set(key, block);
    }
    const result = [];
    tops.forEach(function (block) {
      if (block.y + 1 >= LIGHTNING.minFloor && strikableCube(block)) result.push(block);
    });
    return result;
  }

  const KNOCK_SIDES = [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];

  // A cube may go with the others of `chosen` if nothing is left hanging and nobody is hurt:
  // - nothing built stays on it, and a built side neighbour that stays keeps a cube under it (no
  //   overhang loses its hold);
  // - no feature or window around (they lean on cubes by their own rules);
  // - no cube next to or on it is taken into work (a worker's plan, a machine's pattern, a drone) or
  //   half set — its support must not go from under it;
  // - nobody stands on it or is stepping onto it, nobody cuts a passage through it.
  function canKnockOut(world, block, chosen) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = block.x + dx;
          const y = block.y + dy;
          const z = block.z + dz;
          if (world.glassByKey.has(cellKey(x, y, z))) return false;
          const near = blockAt(world, x, y, z);
          if (near && (near.feature || near.glassId !== undefined)) return false;
        }
      }
    }
    for (let i = 0; i < KNOCK_SIDES.length; i++) {
      const side = KNOCK_SIDES[i];
      const near = blockAt(world, block.x + side[0], block.y + side[1], block.z + side[2]);
      if (!near || chosen.has(near)) continue;
      if (near.built) {
        if (side[1] === 1) return false;
        const below = blockAt(world, near.x, near.y - 1, near.z);
        if (near.y > 0 && !(below && below.built && !chosen.has(below))) return false;
      } else if (near.reserved || near.owner !== -1 || near.poured > 0) {
        return false;
      }
    }
    function onTop(cell) {
      return !!cell && cell[0] === block.x && cell[1] === block.y + 1 && cell[2] === block.z;
    }
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (builder.trade === 'engineer') continue;
      if (builder.passageBlock === block) return false;
      if (onTop(builder.cell)) return false;
      if (builder.phase === 'walk' && (onTop(builder.from) || onTop(builder.to))) return false;
    }
    return true;
  }

  // The cubes a strike into `target` knocks out: the plain built ones of the 3×3×3 around it, less
  // those that must stay — dropping one can hold up others, so until nothing changes. Null when the
  // target itself has to stay.
  function lightningCubes(world, target) {
    const chosen = new Set();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const block = blockAt(world, target.x + dx, target.y + dy, target.z + dz);
          if (strikableCube(block)) chosen.add(block);
        }
      }
    }
    let changed = true;
    while (changed && chosen.has(target)) {
      changed = false;
      chosen.forEach(function (block) {
        if (canKnockOut(world, block, chosen)) return;
        chosen.delete(block);
        changed = true;
      });
    }
    return chosen.has(target) ? Array.from(chosen) : null;
  }

  // Into a column top, the higher the likelier; up to a few tries if the cube can't go.
  function strikeLightning(world) {
    const targets = lightningTargets(world);
    for (let tries = 0; tries < 8 && targets.length > 0; tries++) {
      let total = 0;
      for (let i = 0; i < targets.length; i++) total += targets[i].y + 2 - LIGHTNING.minFloor;
      let roll = Math.random() * total;
      let pick = targets.length - 1;
      for (let i = 0; i < targets.length; i++) {
        roll -= targets[i].y + 2 - LIGHTNING.minFloor;
        if (roll < 0) {
          pick = i;
          break;
        }
      }
      const target = targets[pick];
      targets.splice(pick, 1);
      const blocks = lightningCubes(world, target);
      if (!blocks) continue;
      knockOutBlocks(world, blocks);
      world.stats.lightningStrikes += 1;
      world.stats.lightningCubes += blocks.length;
      world.events.push({ type: 'lightning', block: target, blocks: blocks });
      return true;
    }
    return false;
  }

  // Back into the plan: unbuilt, nothing set of it, nobody's, ready by its support again.
  function knockOutBlocks(world, blocks) {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      block.built = false;
      block.poured = 0;
      block.reserved = false;
      block.owner = -1;
      block.planLeft = 0;
      world.built.delete(cellKey(block.x, block.y, block.z));
      world.solidGrid[world.index.id(block.x, block.y, block.z)] = 0;
    }
    world.remaining += blocks.length;
    world.constructionProgressRemaining = world.remaining;
    world.constructionStallElapsed = 0;
    refreshReadyBatch(world, blocks);
    invalidateNavBatch(world, blocks);
    wakeVehicles(world);
  }

  // ---------- foremen ----------
  // Equipped foremen with counters and conditions (meta.js → equippedBonuses → campaign.foremen).
  // Every cube a worker, drone or machine finishes counts; cubes the crane or offline work set do
  // not, so the crane never feeds itself.

  // Crew-wide speed from foremen: «Бригадир смены» at the start, «Главный геодезист» per finished
  // floor (it stacks), «Оконщица» after a door or window, «Повар артели» after a meal.
  function foremanRush(world) {
    const campaign = world.campaign;
    const foremen = campaign.foremen;
    const now = campaign.levelElapsed;
    let factor = 1 + world.floorStack;
    if (foremen.rush && now < foremen.rush.value) factor *= foremen.rush.factor;
    if (foremen.windowRush && now < world.windowRushUntil) factor *= 1 + foremen.windowRush.value;
    if (foremen.feast && now < world.feastUntil) factor *= 1 + foremen.feast.value;
    return factor;
  }

  // «Табельщик»: after a smoke or a rest the worker is fresh for a while.
  function refreshAfterBreak(builder, world) {
    const fresh = world.campaign.foremen.afterBreak;
    if (!fresh) return;
    builder.fedLeft = fresh.second;
    builder.fedBoost = 1 + fresh.value;
  }

  // «Кладовщик»: the way to the quarry and back with a load is shorter.
  function haulFactor(builder, world) {
    const haul = world.campaign.foremen.haul;
    if (!haul) return 1;
    return builder.walkPurpose === 'mine' || builder.carry.length > 0 ? haul.value : 1;
  }

  // «Механик»: drones gather and set cubes faster (`second` of «machines», passive «droneGather»).
  function droneWork(world, effect, second) {
    const trigger = world.campaign.foremen[effect];
    if (!trigger) return 1;
    return second ? trigger.second : trigger.value;
  }

  // «Механик»: drones and machines move faster.
  function machineFactor(world) {
    const machines = world.campaign.foremen.machines;
    return machines ? machines.value : 1;
  }

  function every(trigger, count, second) {
    if (!trigger) return false;
    return count % Math.max(1, Math.round(second ? trigger.second : trigger.value)) === 0;
  }

  // «Подрядчик» gifts the level the player would buy next: the open, unmaxed level with the
  // earliest minute in the reference session (balance → session → pricedTimings).
  function giftUpgrade(world) {
    const campaign = world.campaign;
    let best = null;
    let bestMinute = Infinity;
    for (let i = 0; i < campaign.foremanKinds.length; i++) {
      const kind = campaign.foremanKinds[i];
      const spec = SESSION_BALANCE[kind];
      if (campaign.purchases[kind] >= spec.max || (kind === 'kitchen' && (!campaign.kitchenUnlocked || kitchenCapped(campaign)))) continue;
      // The camp is the player's choice (its window); a closed pass keeps its lines shut.
      if (CAMP_LINES[kind] || CAMP_UPGRADE_OF[kind] || lineGated(campaign, kind) || kind === 'tokenBuy') continue;
      if (kind === 'elevators' && !(campaign.purchases.elevators > 0) && taxiFloorsShort(world) > 0) continue;
      if (kind === 'sales' && salesCapped(campaign)) continue;
      if ((kind === 'dorm' || kind === 'lounge' || kind === 'light') && campCapped(campaign, kind)) continue;
      const minute = spec.pricedTimings ? spec.pricedTimings[campaign.purchases[kind]] : campaign.purchases[kind];
      if (minute < bestMinute) {
        bestMinute = minute;
        best = kind;
      }
    }
    return best && buyUpgrade(campaign, world, best, true) ? best : null;
  }

  function stepForemen(world) {
    const campaign = world.campaign;
    const foremen = campaign.foremen;
    const built = world.foremanBuilt;
    world.foremanBuilt = [];
    for (let i = 0; i < built.length && campaign.status === 'play'; i++) {
      const block = built[i];
      world.foremanCubes += 1;
      const count = world.foremanCubes;
      if (every(foremen.recruit, count)) {
        campaign.metaBuilders += 1;
        campaign.builderCount += 1;
        spawnBuilder(world);
        world.events.push({ type: 'foreman', card: foremen.recruit.card, office: foremen.recruit.office });
      }
      if (every(foremen.contractor, count)) {
        const kind = giftUpgrade(world);
        if (kind) world.events.push({ type: 'foreman', card: foremen.contractor.card, office: foremen.contractor.office, kind: kind });
      }
      if (every(foremen.golden, count)) {
        world.events.push({ type: 'foreman', card: foremen.golden.card, office: foremen.golden.office, block: block,
          gained: 0, findMultiplier: foremen.golden.factor || 3 });
      }
      if (every(foremen.jackpot, count)) {
        const pay = grantPlacePay(world, block, pourTotal(block) * ((foremen.jackpot.second || 10) - 1));
        world.events.push({
          type: 'foreman', card: foremen.jackpot.card, jackpot: true, jackpotMultiplier: foremen.jackpot.second || 10, block: block, gained: pay.coins, capital: pay.capital,
          lucky: pay.lucky, luckyMultiplier: pay.luckyMultiplier,
        });
      }
      if (foremen.windowRush && block.feature) world.windowRushUntil = campaign.levelElapsed + 45;
      if (foremen.floorStack && floorDone(world, block.y)) {
        world.floorStack += foremen.floorStack.value;
        world.events.push({ type: 'foreman', card: foremen.floorStack.card, office: foremen.floorStack.office, stack: world.floorStack });
      }
      if (every(foremen.crane, count) && world.remaining > 0) {
        const placed = applyOfflineBlocks(world, Math.round(foremen.crane.second));
        world.events.push({ type: 'foreman', card: foremen.crane.card, office: foremen.crane.office, count: placed.length });
      }
    }
  }

  function floorDone(world, y) {
    const floor = world.floorBlocks[y];
    if (!floor || world.floorsDone[y]) return false;
    for (let i = 0; i < floor.length; i++) if (!floor[i].built) return false;
    world.floorsDone[y] = true;
    return true;
  }

  function beginFrame(world) {
    world.metrics.scheduler = 0;
    world.metrics.path = 0;
    world.metrics.scaffoldSearch = 0;
    world.metrics.simulation = 0;
    world.metrics.scaffoldExpansions = 0;
    world.metrics.pathSearches = 0;
    world.metrics.aStarSearches = 0;
    world.metrics.aStarPeak = null;
    world.metrics.assignments = 0;
    world.metrics.invalidations = 0;
  }

  // ---------- tokens: the graph's passes and the camp buildings' starts ----------
  const TOKENS = window.MicroBuildersBalance.tokens || { start: 0, campStart: 0 };
  const GATES = window.MicroBuildersBalance.gates || {};
  const TREE_PARENT = {};
  window.MicroBuildersBalance.upgradeTree.forEach(function (pair) { TREE_PARENT[pair[0]] = pair[1]; });
  // The camp buildings' site lines (level 1 starts the building, higher levels rebuild it) and the
  // upgrades of each; they are bought in the building's window, not in the graph.
  const CAMP_LINES = { kitchen: 'canteen', sales: 'sales', dorm: 'dorm', lounge: 'lounge', light: 'light', reactor: 'reactor' };
  const CAMP_UPGRADE_OF = { portions: 'kitchen', chef: 'kitchen', salesAds: 'sales', lightPower: 'light', loungeSeats: 'lounge',
    smokePath: 'lounge', dormBeds: 'dorm', dormSleep: 'dorm' };

  // The way into the block of a pass: the lines right behind it (through a pass right behind it).
  // Every other line of the block opens after one of them, on the site and in the tech center alike.
  const GATE_LINES = {};
  function gateEntries(id) {
    const lines = [];
    window.MicroBuildersBalance.upgradeTree.forEach(function (pair) {
      if (TREE_PARENT[pair[0]] !== id) return;
      if (GATES[pair[0]]) Array.prototype.push.apply(lines, gateEntries(pair[0]));
      else lines.push(pair[0]);
    });
    return lines;
  }
  Object.keys(GATES).forEach(function (id) { GATE_LINES[id] = gateEntries(id); });

  function gatePassed(campaign, id) {
    return !!(campaign.gates && campaign.gates[id]);
  }

  // A pass is worth a token only once the meta has opened something of its block (a technology of
  // the tech center) — that is, one of its entry lines; till then it stays shut and nothing behind
  // it shows. devOpen(kind) — the dev panel's group switches (game.js): a line they open counts too.
  function gateResearched(campaign, id, devOpen) {
    if (campaign.devGroups && campaign.devGroups.all === true) return true;
    return (GATE_LINES[id] || []).some(function (kind) { return lineOpenByMeta(campaign, kind) || (!!devOpen && devOpen(kind)); });
  }

  // A pass costs its tokens (balance.gates[id].tokens) once the line before it has a level and its
  // block has something researched.
  function gateOpenable(campaign, id, devOpen) {
    if (!GATES[id] || gatePassed(campaign, id) || !gateResearched(campaign, id, devOpen)) return false;
    const parent = TREE_PARENT[id];
    return !parent || (GATES[parent] ? gatePassed(campaign, parent) : (campaign.purchases[parent] || 0) >= 1);
  }

  function buyGate(campaign, id, devOpen) {
    const cost = GATES[id] ? GATES[id].tokens || 1 : Infinity;
    if (!gateOpenable(campaign, id, devOpen) || (campaign.tokens || 0) < cost) return false;
    campaign.tokens -= cost;
    campaign.gates[id] = 1;
    return true;
  }

  // ---------- advanced upgrades (docs/gdd/29-tokens-draft.md) ----------
  // «Продвинутые улучшения»: the centre pass is a site line bought for coins (session.advanced, priced
  // at the reference's minute 500); around it the key nodes, ADVANCED.tokens each, that the tech
  // center's advanced technologies open (campaign.advancedOpen, meta.js → applyCardStats; from story
  // level ADVANCED.unlockLevel). Each changes a rule of this site only.
  const ADVANCED = window.MicroBuildersBalance.advanced || { nodes: [], tokens: 2 };
  const ADVANCED_NODE = {};
  ADVANCED.nodes.forEach(function (node) { ADVANCED_NODE[node.id] = node; });

  function advancedOwned(campaign, id) {
    return !!(campaign && campaign.advanced && campaign.advanced[id]);
  }

  // The node's number (balance advanced.nodes[].value) once it is bought here, else `otherwise`.
  function advancedValue(campaign, id, otherwise) {
    return advancedOwned(campaign, id) ? ADVANCED_NODE[id].value : otherwise;
  }

  function advancedResearched(campaign, id) {
    return (campaign.advancedOpen || []).indexOf(id) >= 0;
  }

  // The centre is bought; the node researched in the tech center and not bought yet.
  function advancedOpenable(campaign, id) {
    return !!ADVANCED_NODE[id] && campaign.purchases.advanced > 0 && advancedResearched(campaign, id) && !advancedOwned(campaign, id);
  }

  function buyAdvanced(campaign, world, id) {
    const cost = ADVANCED.tokens || 2;
    if (!advancedOpenable(campaign, id) || (campaign.tokens || 0) < cost) return false;
    campaign.tokens -= cost;
    campaign.advanced = Object.assign({}, campaign.advanced);
    campaign.advanced[id] = 1;
    if (world) world.events.push({ type: 'advanced', id: id });
    return true;
  }

  // A line behind a pass that is not open yet cannot be bought.
  function lineGated(campaign, kind) {
    for (let parent = TREE_PARENT[kind]; parent; parent = TREE_PARENT[parent]) {
      if (GATES[parent] && !gatePassed(campaign, parent)) return true;
    }
    return false;
  }

  // The meta has opened this site line (meta.js → applyCardStats: campaign.foremanKinds).
  function lineOpenByMeta(campaign, kind) {
    return (campaign.foremanKinds || []).indexOf(kind) >= 0;
  }

  // A camp building stands as a foundation until it is started: 1 token (balance.tokens.campStart)
  // and the coins of its first level; then its blue blueprint goes up for the workers.
  function campStartable(campaign, kind) {
    return !!CAMP_LINES[kind] && !(campaign.purchases[kind] > 0) && (kind !== 'kitchen' || campaign.kitchenUnlocked) &&
      lineOpenByMeta(campaign, kind) && (campaign.tokens || 0) >= (TOKENS.campStart || 0);
  }

  // A camp building the meta opened but this site has not started yet: its foundation stands.
  function campFoundation(world, site) {
    if (!site) return false;
    const kind = CAMP_NODES[site.kind];
    const campaign = world.campaign;
    return !!kind && !(campaign.purchases[kind] > 0) && lineOpenByMeta(campaign, kind) && (kind !== 'kitchen' || campaign.kitchenUnlocked);
  }

  // Tokens a camp building's level asks on top of its coins (balance.tokens.campLevels: level → tokens).
  function campLevelTokens(kind, level) {
    return CAMP_LINES[kind] ? (TOKENS.campLevels || {})[String(level)] || 0 : 0;
  }

  // «Подарок за куб»: a whole cube set — with the line's chance the cheapest open level of the site graph
  // comes free (not the camp, the passes, «Жетон стройки» or the advanced centre; its graph parent must
  // have a level).
  function rollCubeGift(world) {
    const campaign = world.campaign;
    if (!(campaign.purchases.cubeGift > 0) || Math.random() >= lineValue(campaign, 'cubeGift')) return;
    let best = null;
    let bestCost = Infinity;
    for (let i = 0; i < campaign.foremanKinds.length; i++) {
      const kind = campaign.foremanKinds[i];
      const spec = SESSION_BALANCE[kind];
      if (!spec || campaign.purchases[kind] >= spec.max || kind === 'tokenBuy' || kind === 'advanced') continue;
      if (CAMP_LINES[kind] || CAMP_UPGRADE_OF[kind] || lineGated(campaign, kind)) continue;
      let parent = TREE_PARENT[kind];
      while (parent && GATES[parent]) parent = TREE_PARENT[parent];
      if (parent && !(campaign.purchases[parent] > 0)) continue;
      const cost = upgradeCost(kind, campaign.purchases[kind], campaign);
      if (cost < bestCost) {
        bestCost = cost;
        best = kind;
      }
    }
    if (best) buyUpgrade(campaign, world, best, true);
  }

  function startCamp(campaign, world, kind) {
    if (!campStartable(campaign, kind)) return false;
    if (!buyUpgrade(campaign, world, kind, 'camp')) return false;
    campaign.tokens -= TOKENS.campStart || 0;
    return true;
  }

  function buyUpgrade(campaign, world, kind, gift) {
    if (!SESSION_BALANCE[kind]) return false;
    // A camp building's first level is its start (startCamp, a token); its upgrades come with it.
    if (CAMP_LINES[kind] && !(campaign.purchases[kind] > 0) && gift !== 'camp') return false;
    if (CAMP_UPGRADE_OF[kind] && !(campaign.purchases[CAMP_UPGRADE_OF[kind]] > 0)) return false;
    if (lineGated(campaign, kind)) return false;
    // The advanced centre: only once the tech center has researched one of its nodes.
    if (kind === 'advanced' && !(campaign.advancedOpen && campaign.advancedOpen.length)) return false;
    // The air taxi waits for the building to stand TAXI.minFloors floors high.
    if (kind === 'elevators' && !(campaign.purchases.elevators > 0) && world && taxiFloorsShort(world) > 0) return false;
    const devKitchen = campaign.devGroups.all === true || campaign.devGroups.site === true;
    if (kind === 'kitchen' && !campaign.kitchenUnlocked && !devKitchen) return false;
    if (kind === 'kitchen' && kitchenCapped(campaign)) return false;
    if (kind === 'sales' && salesCapped(campaign)) return false;
    if ((kind === 'dorm' || kind === 'lounge' || kind === 'light') && campCapped(campaign, kind)) return false;
    if (campaign.purchases[kind] >= SESSION_BALANCE[kind].max) return false;
    const cost = upgradeCost(kind, campaign.purchases[kind], campaign);
    let freeRoll = gift === true || (gift !== 'camp' && Math.random() < sessionValue('freeBuy', campaign.purchases.freeBuy));
    // View: why this level cost nothing ('gift' «Подрядчик», 'roll' «Бесплатная покупка», 'lucky').
    let freeBy = gift === true ? 'gift' : freeRoll ? 'roll' : '';
    if (!campaign.freePurchases && !freeRoll && campaign.coins < cost) return false;
    // The 3rd and 5th levels of a camp building cost tokens too (balance.tokens.campLevels); no roll waives them.
    const levelTokens = gift === 'camp' ? 0 : campLevelTokens(kind, campaign.purchases[kind] + 1);
    if ((campaign.tokens || 0) < levelTokens) return false;
    // «Счастливчик»: a bought level is sometimes on the house.
    const lucky = campaign.foremen.lucky;
    let luckyEvent = null;
    if (!freeRoll && !campaign.freePurchases && lucky && Math.random() < lucky.value) {
      freeRoll = true;
      freeBy = 'lucky';
      luckyEvent = { type: 'foreman', card: lucky.card, office: lucky.office, kind: kind, free: true, cost: cost, level: 0 };
      if (world) world.events.push(luckyEvent);
    }
    if (campaign.freePurchases) freeBy = '';
    if (!campaign.freePurchases && !freeRoll) campaign.coins -= cost;
    campaign.purchases[kind] += 1;
    campaign.tokens = (campaign.tokens || 0) - levelTokens;
    // «Жетон стройки»: a level is a token of this site.
    if (kind === 'tokenBuy') campaign.tokens += 1;
    if (luckyEvent) luckyEvent.level = campaign.purchases[kind];
    if (kind === 'builders') {
      const before = campaign.builderCount;
      campaign.builderCount = campaign.metaBuilders + sessionGain('builders', campaign.purchases.builders);
      const add = campaign.builderCount - before;
      if (world && campaign.status !== 'title' && campaign.status !== 'won') {
        for (let i = 0; i < add; i++) spawnBuilder(world);
      }
    }
    if (kind === 'vehicles') {
      const before = campaign.vehicleCount;
      campaign.vehicleCount = campaign.metaVehicles + sessionGain('vehicles', campaign.purchases.vehicles);
      const add = campaign.vehicleCount - before;
      if (world && campaign.status !== 'title' && campaign.status !== 'won') {
        for (let i = 0; i < add; i++) spawnVehicle(world);
      }
    }
    if (kind === 'engineers' && world && campaign.status !== 'title' && campaign.status !== 'won') {
      const next = sessionValue('engineers', campaign.purchases.engineers) + campaign.bonusDrones;
      const add = next - countTrade(world, 'engineer');
      for (let i = 0; i < add; i++) spawnEngineer(world);
    }
    if (kind === 'helicopters' && world && campaign.status !== 'title' && campaign.status !== 'won') {
      const next = sessionValue('helicopters', campaign.purchases.helicopters);
      const add = next - countKind(world, 'heli');
      for (let i = 0; i < add; i++) spawnHelicopter(world);
    }
    if (world && kind === 'elevators') activateTaxis(world);
    if (world && (kind === 'plan' || kind === 'vehicleHeight' || kind === 'vehicleReach' || kind === 'bucket' || kind === 'loaderMass' || kind === 'patternHeight' || kind === 'heliMass' || kind === 'heliWidth' || kind === 'heliHeight')) {
      wakeVehicles(world);
    }
    if (world) {
      world.events.push({
        type: 'upgrade',
        kind: kind,
        level: campaign.purchases[kind],
        cost: cost,
        // free: the player paid nothing thanks to a roll or a foreman (not the dev free mode).
        free: freeBy !== '',
        freeBy: freeBy,
      });
    }
    return true;
  }

  function focusBlock(world) {
    let best = null;
    const blocks = world.blocks;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.built) continue;
      if (!block.ready) continue;
      if (!best || block.priority < best.priority) best = block;
    }
    return best;
  }

  function formatClock(seconds) {
    const whole = Math.floor(seconds);
    const minutes = Math.floor(whole / 60);
    const secs = whole % 60;
    return minutes + ':' + (secs < 10 ? '0' : '') + secs;
  }

  root.MicroBuilders = {
    MATERIALS: MATERIALS,
    MATERIAL: MATERIAL,
    MATERIAL_LADDER: MATERIAL_LADDER,
    GLASS: GLASS,
    BALANCE: BALANCE,
    VEHICLE: VEHICLE,
    SCAFFOLD: SCAFFOLD,
    pourGrid: pourGrid,
    pourTotal: pourTotal,
    strikeLightning: strikeLightning,
    deckFactor: deckFactor,
    pourCoord: pourCoord,
    UPGRADES: UPGRADES,
    LEVELS: LEVELS,
    HQ_LEVELS: HQ_LEVELS,
    TRAINING_RANKS: TRAINING.ranks,
    workerXpList: workerXpList,
    workerRankInfo: workerRankInfo,
    refreshRanks: refreshRanks,
    shareWorkerXp: shareWorkerXp,
    SCHOOL_LEVELS: SCHOOL_LEVELS,
    SCHOOL_LEVEL_VARIANTS: SCHOOL_LEVEL_VARIANTS,
    schoolLevel: schoolLevel,
    createCampaign: createCampaign,
    startLevel: startLevel,
    advanceLevel: advanceLevel,
    beginFrame: beginFrame,
    stepWorld: stepWorld,
    buyUpgrade: buyUpgrade,
    TOKENS: TOKENS,
    CAMP_LINES: CAMP_LINES,
    CAMP_UPGRADE_OF: CAMP_UPGRADE_OF,
    gatePassed: gatePassed,
    gateOpenable: gateOpenable,
    ADVANCED: ADVANCED,
    advancedOwned: advancedOwned,
    advancedResearched: advancedResearched,
    advancedOpenable: advancedOpenable,
    buyAdvanced: buyAdvanced,
    campLevelTokens: campLevelTokens,
    gateResearched: gateResearched,
    TAXI: TAXI,
    gateEntries: function (id) { return (GATE_LINES[id] || []).slice(); },
    buyGate: buyGate,
    taxiFloorsShort: taxiFloorsShort,
    TAXI_FLOORS: TAXI.minFloors,
    lineGated: lineGated,
    campStartable: campStartable,
    startCamp: startCamp,
    campFoundation: campFoundation,
    upgradeCost: upgradeCost,
    statsOf: statsOf,
    scaffoldTier: scaffoldTier,
    needOpen: needOpen,
    upgradeValue: upgradeValue,
    sessionValue: sessionValue,
    lineValue: lineValue,
    carryOverload: carryOverload,
    carryLoad: carryLoad,
    carryWeight: carryWeight,
    tripLimitShare: tripLimitShare,
    carryKg: carryKg,
    planCubeLimit: planCubeLimit,
    planMinis: planMinis,
    CANTEEN: CANTEEN,
    SALES: SALES,
    DISH: DISH,
    dishText: dishText,
    campBoost: campBoost,
    dormSleepScale: dormSleepScale,
    lightReliefPerLevel: lightReliefPerLevel,
    workerCount: workerCount,
    campSite: campSite,
    campActive: campActive,
    campCrew: campCrew,
    setCampCrew: setCampCrew,
    campState: campState,
    restoreCamp: restoreCamp,
    canteenSeats: canteenSeats,
    canteenBuiltLevel: canteenBuiltLevel,
    canteenForm: canteenForm,
    CANTEEN_FORMS: CANTEEN_FORMS,
    debugCampForm: debugCampForm,
    campForm: campForm,
    campFormCount: campFormCount,
    setCampForm: setCampForm,
    campUnbuildable: campUnbuildable,
    // Forget the camp forms' materials (they are picked once per form): after the balance's form
    // masses change (camp calibration).
    resetCampForms: function () { Object.keys(campFormCache).forEach(function (key) { delete campFormCache[key]; }); },
    levelGrid: levelGrid,
    salesBuiltLevel: salesBuiltLevel,
    campCapped: campCapped,
    campFormCubes: campFormCubes,
    dormBeds: dormBeds,
    dormSleepers: dormSleepers,
    loungeSeats: loungeSeats,
    loungeSmokers: loungeSmokers,
    lightRelief: lightRelief,
    DORM: DORM,
    LOUNGE: LOUNGE,
    REACTOR_SITE: REACTOR_SITE,
    LIGHT: LIGHT,
    canteenEating: canteenEating,
    canteenLevel: canteenLevel,
    canteenActive: canteenActive,
    kitchenCapped: kitchenCapped,
    setCanteenDish: setCanteenDish,
    setCanteenSlot: setCanteenSlot,
    KITCHEN: KITCHEN,
    kitchenOf: kitchenOf,
    chefLevel: chefLevel,
    chefPower: chefPower,
    kitchenStaffNeeded: kitchenStaffNeeded,
    kitchenCandidates: kitchenCandidates,
    kitchenOpenable: kitchenOpenable,
    buyKitchen: buyKitchen,
    grandReady: grandReady,
    CANTEEN_ROWS: ROWS,
    SMOKING: SMOKING,
    SLEEP: SLEEP,
    fatigueDebuff: fatigueDebuff,
    fatigueFill: fatigueFill,
    hungerFill: hungerFill,
    hungerDebuff: hungerDebuff,
    needState: needState,
    needSecondsLeft: needSecondsLeft,
    salesActive: salesActive,
    salesLevel: salesLevel,
    salesCapped: salesCapped,
    salesRate: salesRate,
    salesShowroomIncome: salesShowroomIncome,
    salesMultiplier: salesMultiplier,
    salesBuiltCubes: salesBuiltCubes,
    salesOffer: salesOffer,
    buySalesUpgrade: buySalesUpgrade,
    focusBlock: focusBlock,
    formatClock: formatClock,
    applyOfflineBlocks: applyOfflineBlocks,
    applyOfflineMass: applyOfflineMass,
    unbuildableBlocks: unbuildableBlocks,
    isSupported: isSupported,
    cellKey: cellKey,
    builderPosition: builderPosition,
    builderNeed: builderNeed,
    cranePose: cranePose,
    CRANE: CRANE,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
