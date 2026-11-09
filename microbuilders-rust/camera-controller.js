(function (root) {
  // Camera for the construction site, the company quarter and the worker follow view.
  // Input only writes the goal orbit; update() eases the current orbit toward it, so every move is smooth.
  // Scheme and integration notes: docs/tech/camera.md.

  // Vertical drag sign. +1: the content follows the finger (drag down -> the building moves down, the camera rises).
  // Flip to -1 if playtests prefer "drag up = camera up". Also drives the city rail and the worker-view lift.
  const ELEVATOR_SIGN = 1;
  const ORBIT_PER_WIDTH = Math.PI * 1.1; // a full-width swipe orbits about 200°
  const TOUCH_SLOP = 10; // stage px before a touch turns from a tap into a drag
  const MOUSE_SLOP = 4;
  const TAP_MS = 350;
  const DOUBLE_TAP_MS = 300;
  const DOUBLE_TAP_PX = 24;
  const TAU_DRAG = 0.05; // smoothing while a finger or the mouse holds the camera: feels attached
  const TAU_SMOOTH = 0.12; // wheel, keys, inertia, re-homing
  const TAU_OFFSET = 0.15; // safe-area shifts of the projection centre
  const FOLLOW_IDLE_MS = 6000;
  const SETTLE_MS = 400;
  const TITLE_SPIN_IDLE_MS = 2200;
  const TITLE_SPIN = 0.08;
  const INERTIA_WINDOW_MS = 60; // a release later than this after the last move is a stop, not a flick
  const INERTIA_STOP = 15; // stage px/s
  const INERTIA_MAX = 0.8; // flick speed cap in stage widths per second: at most about 0.8 rad of coasting orbit
  const BASE_FOV = 48; // vertical, degrees
  const MIN_HFOV = 30; // narrow (portrait) screens widen the vertical FOV until the horizontal one reaches this
  const MAX_FOV = 60;
  const PAN_VIEW_SHARE = 0.35; // pan input stops once the footprint edge is this share of the half-width off-centre
  const POLAR_MIN = 0.35;
  const POLAR_MAX = 1.38;
  const EYE_MIN_Y = 0.6;
  const SITE_POLAR = 1.0;
  // Worker focus (setTrack): near orbit distance, zoom range, tilt range and drag-to-tilt rate.
  const TRACK_DISTANCE = 11;
  const TRACK_MIN = 3;
  const TRACK_MAX = 40;
  const TRACK_POLAR = 0.95;
  const TRACK_POLAR_MIN = 0.15;
  const TRACK_POLAR_MAX = 1.45;
  const TRACK_TILT = 0.006;
  const SITE_AZIMUTH = 0.55;
  const CITY_POLAR = 0.85;
  const CITY_ORBIT = 0.35;
  const FILL_X = 1; // share of the half-width the framed box may use (corners may touch the edges)
  const MINE_WEIGHT = 0.5; // mines are framed at half their distance: in view without dwarfing the house
  const MARGIN_Y = 0.05; // share of the free band kept empty above and below the framed box
  const LINE_PX = 33; // deltaMode=1 (Firefox mouse): 3 lines ≈ one 100 px Chrome notch
  const MOUSE_ZOOM = 0.0015; // about 16% per 100 px notch
  const PINCH_ZOOM = 0.01; // ctrl+wheel trackpad pinch: the browser's own page-zoom curve
  const SHIFT_WHEEL_ORBIT = 0.35;
  const WHEEL_DRAG_GAIN = 0.6;
  const WHEEL_STREAM_MS = 250;
  const WHEEL_LOCK_PX = 6;
  const KEY_ORBIT = 1.6; // rad/s
  const KEY_ZOOM = 1.2; // e-folds/s
  const TWIST_START = 0.15; // rad of two-finger rotation before the twist starts orbiting
  const MAX_DISTANCE = 150;
  const WORKER_MIN = 2.5;
  const WORKER_MAX = 9;
  const WORKER_DISTANCE = 3.2;
  const WORKER_RELAX_MS = 3000;
  // Panels where wheel, Safari gestures and arrow keys belong to the page, not the camera.
  const DEFAULT_UI = '#overlay-root, #meta-panel, #level-info, #worker-log, #city-card, #settings-menu, #day-pop, .dock, .dock-tabs, .dev-tools';
  // ui.js puts this class on body while any overlay window is open: the scene then takes no input.
  const DEFAULT_MODAL_CLASS = 'has-modal';
  // The quarter: a boulevard from the camera into -z, facades facing +z.
  const DEFAULT_CITY = {
    mode: 'city',
    center: { x: 0, z: -34 },
    minX: -13, maxX: 13, minZ: -72, maxZ: 6, topY: 6,
    rail: { from: { x: 0, z: 4 }, to: { x: 0, z: -72 }, halfWidth: 4 },
  };
  const NO_LIMITS = { kind: 'none', yMin: 0.2, yMax: 500, minD: 1.5, maxD: 250, polarMin: 0.2, polarMax: 1.45 };
  const KEYS = {
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
    KeyQ: 'out', Minus: 'out', NumpadSubtract: 'out', '-': 'out',
    KeyE: 'in', Equal: 'in', NumpadAdd: 'in', '+': 'in', '=': 'in',
    KeyF: 'home', Home: 'home',
  };
  // Keys that scroll a focused panel: they stay with the panel.
  const SCROLL_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Home: 1 };

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  function pick(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function wrapAngle(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Orbit state: the eye sits at target + distance * (sin polar sin azimuth, cos polar, sin polar cos azimuth).
  function makeState(x, y, z, distance, azimuth, polar) {
    return { target: { x: x, y: y, z: z }, distance: distance, azimuth: azimuth, polar: polar };
  }

  function copyState(from, to) {
    const out = to || makeState(0, 0, 0, 1, 0, 1);
    out.target.x = from.target.x;
    out.target.y = from.target.y;
    out.target.z = from.target.z;
    out.distance = from.distance;
    out.azimuth = from.azimuth;
    out.polar = from.polar;
    return out;
  }

  // Missing fields come from base, so flyTo({ distance: 30 }) only zooms.
  function mergeState(partial, base) {
    const out = copyState(base);
    if (!partial) return out;
    const target = partial.target;
    if (target) {
      out.target.x = pick(target.x, out.target.x);
      out.target.y = pick(target.y, out.target.y);
      out.target.z = pick(target.z, out.target.z);
    }
    if (partial.distance > 0) out.distance = partial.distance;
    out.azimuth = pick(partial.azimuth, out.azimuth);
    out.polar = pick(partial.polar, out.polar);
    return out;
  }

  // Vertical FOV for a width/height aspect: the base on wide screens, wider on narrow ones so a
  // portrait phone does not need a huge distance to fit a wide site (horizontal FOV at least minH).
  function portraitFov(aspect, base, minH) {
    const fov = base > 0 ? base : BASE_FOV;
    if (!(aspect > 0) || !(minH > 0)) return fov;
    const need = 2 * Math.atan(Math.tan(minH * Math.PI / 360) / aspect) * 180 / Math.PI;
    return Math.max(fov, Math.min(need, MAX_FOV));
  }

  // Auto-follow moves the player's view by how much home moved, so a small deliberate zoom or
  // lift survives while the building grows: target shifts, distance scales, polar shifts.
  function shiftByHome(state, from, to) {
    const out = copyState(state);
    out.target.x += to.target.x - from.target.x;
    out.target.y += to.target.y - from.target.y;
    out.target.z += to.target.z - from.target.z;
    if (from.distance > 0 && to.distance > 0) out.distance *= to.distance / from.distance;
    out.polar += to.polar - from.polar;
    return out;
  }

  // Did home move enough to be worth a follow flight (a floor, a zoom step)?
  function homeMoved(from, to) {
    const shift = Math.max(
      Math.abs(to.target.y - from.target.y),
      Math.hypot(to.target.x - from.target.x, to.target.z - from.target.z)
    );
    return shift >= 1 || Math.abs(Math.log(to.distance / from.distance)) > 0.08 || Math.abs(to.polar - from.polar) > 0.05;
  }

  // Distance is interpolated in log space so zoom speed feels even at every scale.
  function lerpState(a, b, t, out) {
    out.target.x = a.target.x + (b.target.x - a.target.x) * t;
    out.target.y = a.target.y + (b.target.y - a.target.y) * t;
    out.target.z = a.target.z + (b.target.z - a.target.z) * t;
    out.distance = Math.exp(Math.log(a.distance) + (Math.log(b.distance) - Math.log(a.distance)) * t);
    out.azimuth = a.azimuth + (b.azimuth - a.azimuth) * t;
    out.polar = a.polar + (b.polar - a.polar) * t;
    return out;
  }

  function clampToRail(target, rail) {
    const dx = rail.bx - rail.ax;
    const dz = rail.bz - rail.az;
    const length2 = dx * dx + dz * dz;
    const along = length2 > 0 ? clamp(((target.x - rail.ax) * dx + (target.z - rail.az) * dz) / length2, 0, 1) : 0;
    const footX = rail.ax + dx * along;
    const footZ = rail.az + dz * along;
    const length = Math.sqrt(length2) || 1;
    const normalX = -dz / length;
    const normalZ = dx / length;
    const side = clamp((target.x - footX) * normalX + (target.z - footZ) * normalZ, -rail.halfWidth, rail.halfWidth);
    target.x = footX + normalX * side;
    target.z = footZ + normalZ * side;
    return target;
  }

  // limits: { kind: 'none'|'circle'|'rail', cx, cz, radius, rail, yMin, yMax, minD, maxD, polarMin, polarMax, azCenter, azRange }.
  function clampState(state, limits) {
    state.distance = clamp(state.distance, limits.minD, limits.maxD);
    state.polar = clamp(state.polar, limits.polarMin, limits.polarMax);
    const target = state.target;
    target.y = clamp(target.y, limits.yMin, limits.yMax);
    if (limits.kind === 'circle') {
      const dx = target.x - limits.cx;
      const dz = target.z - limits.cz;
      const radius = Math.hypot(dx, dz);
      if (radius > limits.radius) {
        target.x = limits.cx + dx * limits.radius / radius;
        target.z = limits.cz + dz * limits.radius / radius;
      }
    } else if (limits.kind === 'rail') {
      clampToRail(target, limits.rail);
    }
    if (limits.azRange >= 0 && Number.isFinite(limits.azCenter)) {
      // Adjust relative to the unwrapped value, so the smoothed azimuth never spins a full turn.
      const delta = wrapAngle(state.azimuth - limits.azCenter);
      state.azimuth -= delta - clamp(delta, -limits.azRange, limits.azRange);
    }
    // Eye above the ground: target.y + distance * cos(polar) >= EYE_MIN_Y.
    const lowest = (EYE_MIN_Y - target.y) / state.distance;
    if (lowest > -1) state.polar = Math.min(state.polar, Math.acos(Math.min(1, lowest)));
    return state;
  }

  // Smallest orbit distance at which every point projects inside the free band.
  // view: { width, height, top, bottom, left, right (insets, stage px), fov (vertical, degrees), fillX, marginY (px) }.
  // The target always projects to the centre of the band (see setSafeArea), so each point gives a closed-form bound.
  function fitDistance(points, target, azimuth, polar, view) {
    const sp = Math.sin(polar);
    const cp = Math.cos(polar);
    const sa = Math.sin(azimuth);
    const ca = Math.cos(azimuth);
    const k = view.height / 2 / Math.tan(view.fov * Math.PI / 360);
    const band = Math.max(1, view.height - view.top - view.bottom);
    const availX = Math.max(1, (view.width - (view.left || 0) - (view.right || 0)) / 2 * view.fillX);
    const availY = Math.max(1, band / 2 - view.marginY);
    let need = 0.5;
    for (let i = 0; i < points.length; i++) {
      const px = points[i].x - target.x;
      const py = points[i].y - target.y;
      const pz = points[i].z - target.z;
      const right = px * ca - pz * sa;
      const up = -px * sa * cp + py * sp - pz * ca * cp;
      const ahead = -px * sp * sa - py * cp - pz * sp * ca;
      const depth = Math.max(Math.abs(right) * k / availX, Math.abs(up) * k / availY, 0.3);
      need = Math.max(need, depth - ahead);
    }
    return need;
  }

  // Screen-space vertical extent (px above the target, + = up) of the points at a given distance.
  function verticalExtent(points, target, azimuth, polar, distance, k) {
    const sp = Math.sin(polar);
    const cp = Math.cos(polar);
    const sa = Math.sin(azimuth);
    const ca = Math.cos(azimuth);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const px = points[i].x - target.x;
      const py = points[i].y - target.y;
      const pz = points[i].z - target.z;
      const up = -px * sa * cp + py * sp - pz * ca * cp;
      const ahead = -px * sp * sa - py * cp - pz * sp * ca;
      const screen = up * k / Math.max(0.3, distance + ahead);
      if (screen < min) min = screen;
      if (screen > max) max = screen;
    }
    return { min: min, max: max };
  }

  // Fits the distance, then slides the target ('y' = up the building, 'ahead' = along the view on the ground)
  // until the points sit centred in the band, and refits. Mutates target, returns the distance.
  function frameCentered(points, target, azimuth, polar, view, axis, limit) {
    const k = view.height / 2 / Math.tan(view.fov * Math.PI / 360);
    let distance = fitDistance(points, target, azimuth, polar, view);
    for (let i = 0; i < 6; i++) {
      const extent = verticalExtent(points, target, azimuth, polar, distance, k);
      const offset = (extent.max + extent.min) / 2;
      if (Math.abs(offset) < 0.5) break;
      const step = offset * distance / k;
      if (axis === 'y') {
        target.y += step / Math.max(Math.sin(polar), 0.2);
      } else {
        const along = step / Math.max(Math.cos(polar), 0.2);
        target.x -= Math.sin(azimuth) * along;
        target.z -= Math.cos(azimuth) * along;
      }
      if (limit) limit(target);
      distance = fitDistance(points, target, azimuth, polar, view);
    }
    return distance;
  }

  // Box corners from low to top, plus a ring for the mines (MINE_WEIGHT of their distance), only while
  // the window still includes the ground.
  function sitePoints(bounds, low, top) {
    const points = [];
    const xs = [bounds.minX, bounds.maxX];
    const zs = [bounds.minZ, bounds.maxZ];
    const ys = [low, top];
    for (let a = 0; a < 2; a++) {
      for (let b = 0; b < 2; b++) {
        for (let c = 0; c < 2; c++) points.push({ x: xs[a], y: ys[c], z: zs[b] });
      }
    }
    const ring = (bounds.reach || 0) * MINE_WEIGHT;
    if (ring > 0 && low < 2) {
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        points.push({ x: bounds.center.x + Math.sin(angle) * ring, y: 0.3, z: bounds.center.z + Math.cos(angle) * ring });
      }
    }
    return points;
  }

  // Home view of a site at a given azimuth. Tall buildings frame a window of floors below the
  // active top instead of the whole height; full = true fits the entire finished building.
  function siteHome(bounds, azimuth, top, full, view) {
    const span = full ? Infinity : Math.max(10, 1.25 * Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ));
    const low = Math.max(0, top - span);
    const points = sitePoints(bounds, low, top);
    const yMin = Math.max(0.5, low);
    const yMax = Math.max(1, top);
    const target = { x: bounds.center.x, y: clamp(low + (top - low) * 0.45, yMin, yMax), z: bounds.center.z };
    const distance = frameCentered(points, target, azimuth, bounds.polar, view, 'y', function (point) {
      point.y = clamp(point.y, yMin, yMax);
    });
    return makeState(target.x, target.y, target.z, distance, azimuth, bounds.polar);
  }

  // Overview of the quarter: the whole box from the rail's near end, target slid along the rail to centre it.
  function cityHome(bounds, view) {
    const points = sitePoints({ minX: bounds.minX, maxX: bounds.maxX, minZ: bounds.minZ, maxZ: bounds.maxZ, reach: 0 }, 0, bounds.topY);
    const rail = bounds.rail;
    const target = { x: (rail.ax + rail.bx) / 2, y: 1, z: (rail.az + rail.bz) / 2 };
    const distance = frameCentered(points, target, bounds.azimuth, bounds.polar, view, 'ahead', function (point) {
      clampToRail(point, rail);
      point.y = 1;
    });
    return makeState(target.x, target.y, target.z, distance, bounds.azimuth, bounds.polar);
  }

  function normalizeRail(rail, box) {
    if (rail && Number.isFinite(rail.ax)) {
      return { ax: rail.ax, az: rail.az, bx: rail.bx, bz: rail.bz, halfWidth: pick(rail.halfWidth, 4) };
    }
    const from = (rail && rail.from) || { x: box.center.x, z: box.maxZ };
    const to = (rail && rail.to) || { x: box.center.x, z: box.minZ };
    return { ax: from.x, az: from.z, bx: to.x, bz: to.z, halfWidth: Math.max(0, pick(rail && rail.halfWidth, 4)) };
  }

  // Accepts the setBounds() input (or a record it produced) and fills in every derived field.
  function normalizeBounds(input) {
    const mode = input.mode === 'city' ? 'city' : 'site';
    const source = mode === 'city' && !Number.isFinite(input.minZ) ? Object.assign({}, DEFAULT_CITY, input) : input;
    const center = source.center || {};
    const minX = pick(source.minX, pick(center.x, 0) - 4);
    const maxX = pick(source.maxX, pick(center.x, 0) + 4);
    const minZ = pick(source.minZ, pick(center.z, 0) - 4);
    const maxZ = pick(source.maxZ, pick(center.z, 0) + 4);
    const out = {
      mode: mode,
      minX: minX,
      maxX: maxX,
      minZ: minZ,
      maxZ: maxZ,
      center: { x: pick(center.x, (minX + maxX) / 2), z: pick(center.z, (minZ + maxZ) / 2) },
      topY: Math.max(1, pick(source.topY, 3)),
      reach: Math.max(0, pick(source.reach, 0)),
      polar: clamp(pick(source.polar, mode === 'city' ? CITY_POLAR : SITE_POLAR), POLAR_MIN, POLAR_MAX),
      builtTop: Math.max(0, pick(source.builtTop, 0)),
      minDistance: Math.max(0, pick(source.minDistance, 0)),
      maxDistance: Math.max(0, pick(source.maxDistance, 0)),
      home: source.home || null,
      fresh: false,
    };
    const halfDiagonal = Math.hypot(maxX - minX, maxZ - minZ) / 2;
    out.panRadius = Math.max(0, pick(source.panRadius, Math.max(halfDiagonal, out.reach) + 2));
    if (mode === 'city') {
      out.rail = normalizeRail(source.rail, out);
      out.azimuth = pick(source.azimuth, Math.atan2(-(out.rail.bx - out.rail.ax), -(out.rail.bz - out.rail.az)));
      out.orbitRange = Math.max(0, pick(source.orbitRange, CITY_ORBIT));
    }
    out.key = source.key ? String(source.key) : [mode, minX, maxX, minZ, maxZ, out.topY].join(',');
    return out;
  }

  // Site bounds of a level: footprint box in world units, final height and the farthest mine.
  function siteBounds(level, cx, cz) {
    const footprint = level.footprint;
    const centerX = pick(cx, (footprint.minX + footprint.maxX) / 2 + 0.5);
    const centerZ = pick(cz, (footprint.minZ + footprint.maxZ) / 2 + 0.5);
    let reach = 0;
    const mines = level.mines || [];
    for (let i = 0; i < mines.length; i++) {
      reach = Math.max(reach, Math.hypot(mines[i].x + 0.5 - centerX, mines[i].z + 0.5 - centerZ));
    }
    return {
      mode: 'site',
      center: { x: centerX, z: centerZ },
      minX: footprint.minX,
      maxX: footprint.maxX + 1,
      minZ: footprint.minZ,
      maxZ: footprint.maxZ + 1,
      topY: footprint.maxY + 1,
      reach: reach,
      key: 'site:' + (level.name || '') + ':' + [footprint.minX, footprint.maxX, footprint.minZ, footprint.maxZ, footprint.maxY].join(','),
    };
  }

  // Notched mouse wheels report lines or 120-multiples; trackpads report small pixel deltas.
  function isMouseWheel(event) {
    if (event.deltaMode !== 0) return true;
    const wheelY = event.wheelDeltaY;
    const wheelX = event.wheelDeltaX;
    if (typeof wheelY === 'number' && wheelY !== 0 && wheelX === 0 && wheelY % 120 === 0) return true;
    if (typeof wheelX === 'number' && wheelX !== 0 && !wheelY && wheelX % 120 === 0 && event.shiftKey) return true;
    if (event.deltaX !== 0 || !Number.isInteger(event.deltaY)) return false;
    return Math.abs(event.deltaY) >= 50;
  }

  function lockAxis(dx, dy) {
    if (Math.abs(dx) > 2 * Math.abs(dy)) return 'x';
    if (Math.abs(dy) > 2 * Math.abs(dx)) return 'y';
    return '';
  }

  function create(options) {
    const THREE = root.THREE;
    const view = options.view;
    const doc = root.document;
    const stage = root.MicroBuildersStage;
    let viewW = stage ? stage.width() : root.innerWidth;
    let viewH = stage ? stage.height() : root.innerHeight;
    const baseFov = options.fov > 0 ? options.fov : BASE_FOV;
    const minHFov = options.minHorizontalFov === undefined ? MIN_HFOV : options.minHorizontalFov;
    const camera = new THREE.PerspectiveCamera(portraitFov(viewW / viewH, baseFov, minHFov), viewW / viewH, 0.1, 400);
    const uiSelector = options.uiSelector === undefined ? DEFAULT_UI : options.uiSelector;
    const modalClass = options.modalClass === undefined ? DEFAULT_MODAL_CLASS : options.modalClass;

    const goal = makeState(0, 2, 0, 22, 0.42, 1.02);
    const cur = copyState(goal);
    const lookPoint = new THREE.Vector3(0, 2, 0);
    const boundsByMode = { site: null, city: null };
    const layout = { fitFinal: 0, minD: NO_LIMITS.minD, maxD: NO_LIMITS.maxD, cityHome: null, stamp: 0 };
    let siteHomeCache = null;
    let bounds = null;
    let focus = null; // framePoint(): loose clamps around a point until the next frameHome/setBounds
    let siteLevel = null;
    let activityManual = false;
    let activityPoll = 0;
    let autoFollow = true;
    let followPoll = 0;
    // Home at the moment the player's view was last placed relative to it (frameHome, settle, restore).
    // Auto-follow flies only when home itself moves away from this, carrying the player's offset along.
    let followRef = null;
    let inputEnabled = true;
    let wasBlocked = false;
    let wheelZoomOnly = false;
    let lastInputAt = -Infinity;
    let inputDirty = false;
    let flight = null;
    let inertia = null;

    const safeInput = { top: 0, bottom: 0, left: 0, right: 0 };
    const safe = { top: 0, bottom: 0, left: 0, right: 0 };
    let offsetGoal = 0;
    let offsetCur = 0;
    let offsetApplied = NaN;
    // Side insets (a landscape nav rail, a side sheet) shift the projection centre sideways.
    let offsetXGoal = 0;
    let offsetXCur = 0;
    let offsetXApplied = NaN;

    const pointers = new Map();
    let gesture = null;
    let pinch = null;
    let lastTap = null;
    const held = new Set();
    const wheel = { last: -Infinity, kind: '', axis: '', accX: 0, accY: 0 };
    let safariGesture = null;

    let workerView = false;
    let savedOrbit = null;
    // The orbit centred on a moving point — the selected worker (setTrack): the target rides with
    // him, the player only turns, tilts and zooms. `saved` — the view before, for saveState.
    let track = null;
    const worker = {
      yaw: 0, x: 0, y: 0, z: 0,
      distance: WORKER_DISTANCE, yawOffset: 0, lift: 0,
      blend: 1, fromPos: new THREE.Vector3(), fromLook: new THREE.Vector3(),
    };

    function stageScale() {
      const scale = stage && stage.scale ? stage.scale() : 1;
      return scale > 0 ? scale : 1;
    }

    function interact(kind) {
      if (options.onInteract) options.onInteract(kind);
    }

    // Input is off while disabled by game code or while an overlay window is open (spec: under a
    // window neither the HUD nor the camera react).
    function inputBlocked() {
      if (!inputEnabled) return true;
      return !!(modalClass && doc && doc.body && doc.body.classList.contains(modalClass));
    }

    function noteInput() {
      lastInputAt = performance.now();
      inputDirty = true;
    }

    function busy(now) {
      return pointers.size > 0 || !!inertia || !!flight || held.size > 0 || !!safariGesture ||
        now - wheel.last < WHEEL_STREAM_MS;
    }

    function setCursor(kind) {
      if (options.cursor === false) return;
      view.style.cursor = kind;
      if (doc && doc.body) doc.body.classList.toggle('camera-dragging', kind !== 'grab');
    }

    // ---- bounds, layout, home ----

    function layoutView() {
      return {
        width: viewW,
        height: viewH,
        top: safe.top,
        bottom: safe.bottom,
        left: safe.left,
        right: safe.right,
        fov: camera.fov,
        fillX: FILL_X,
        marginY: (viewH - safe.top - safe.bottom) * MARGIN_Y,
      };
    }

    function activeTop(site) {
      return clamp(site.builtTop + 1.5, Math.min(2, site.topY), site.topY);
    }

    function relayout() {
      if (!bounds) return;
      layout.stamp++;
      const fitView = layoutView();
      if (bounds.mode === 'city') {
        const home = cityHome(bounds, fitView);
        layout.cityHome = home;
        layout.fitFinal = home.distance;
        layout.minD = bounds.minDistance || home.distance * 0.4;
        layout.maxD = Math.max(layout.minD, bounds.maxDistance || home.distance * 1.15);
        return;
      }
      let fit = 0;
      for (let i = 0; i < 4; i++) fit = Math.max(fit, siteHome(bounds, i * Math.PI / 4, bounds.topY, true, fitView).distance);
      layout.fitFinal = fit;
      layout.cityHome = null;
      layout.minD = bounds.minDistance || clamp(fit * 0.4, 4, 14);
      // The sky sphere has a radius of 180: past ~150 the eye would leave it on big sites.
      layout.maxD = Math.max(layout.minD, bounds.maxDistance || Math.min(Math.max(Math.min(fit * 1.7, 120), fit * 1.15), MAX_DISTANCE));
    }

    // The site home frames the worst of four azimuths, so orbiting never changes it and never
    // triggers an auto-follow zoom by itself. Cached until the built height or the layout changes.
    function siteHomeAnyAzimuth() {
      const key = bounds.key + '|' + bounds.builtTop + '|' + layout.stamp;
      if (siteHomeCache && siteHomeCache.key === key) return siteHomeCache.state;
      const fitView = layoutView();
      const top = activeTop(bounds);
      let worst = null;
      for (let i = 0; i < 4; i++) {
        const candidate = siteHome(bounds, i * Math.PI / 4, top, false, fitView);
        if (!worst || candidate.distance > worst.distance) worst = candidate;
      }
      siteHomeCache = { key: key, state: worst };
      return worst;
    }

    function homeState(azimuth) {
      if (!bounds) return copyState(flight ? flight.to : goal);
      let home;
      if (bounds.mode === 'city') {
        home = copyState(layout.cityHome);
      } else {
        home = copyState(siteHomeAnyAzimuth());
        home.azimuth = azimuth;
      }
      if (bounds.home) home = mergeState(bounds.home, home);
      home.distance = clamp(home.distance, layout.minD, layout.maxD);
      return home;
    }

    function trackPoint() {
      const point = track && track.point();
      return point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z) ? point : null;
    }

    function limits() {
      if (track) {
        const point = trackPoint() || (flight ? flight.to.target : goal.target);
        return {
          kind: 'circle', cx: point.x, cz: point.z, radius: 0.01, yMin: point.y - 0.01, yMax: point.y + 0.01,
          minD: TRACK_MIN, maxD: TRACK_MAX, polarMin: TRACK_POLAR_MIN, polarMax: TRACK_POLAR_MAX,
        };
      }
      if (focus) {
        return {
          kind: 'circle', cx: focus.x, cz: focus.z, radius: Math.max(focus.radius * 1.5, 12),
          yMin: 0.2, yMax: focus.y + Math.max(focus.radius, 6),
          minD: Math.max(1.5, focus.radius * 0.3), maxD: Math.max(focus.radius * 2.5, 24),
          polarMin: 0.2, polarMax: 1.45,
        };
      }
      if (!bounds) return NO_LIMITS;
      if (bounds.mode === 'city') {
        return {
          kind: 'rail', rail: bounds.rail, yMin: 0.5, yMax: bounds.topY + 1.5,
          minD: layout.minD, maxD: layout.maxD, polarMin: POLAR_MIN, polarMax: POLAR_MAX,
          azCenter: bounds.azimuth, azRange: bounds.orbitRange,
        };
      }
      return {
        kind: 'circle', cx: bounds.center.x, cz: bounds.center.z, radius: bounds.panRadius,
        yMin: 0.5, yMax: bounds.topY + 1.5,
        minD: layout.minD, maxD: layout.maxD, polarMin: POLAR_MIN, polarMax: POLAR_MAX,
      };
    }

    function isAwayFromHome() {
      if (workerView || focus || track) return true;
      if (!bounds) return false;
      const state = flight ? flight.to : goal;
      const home = homeState(state.azimuth);
      const near = Math.max(1.5, home.distance * 0.12);
      const ratio = state.distance / home.distance;
      return ratio < 0.75 || ratio > 1.35 ||
        Math.hypot(state.target.x - home.target.x, state.target.z - home.target.z) > near ||
        Math.abs(state.target.y - home.target.y) > near ||
        (bounds.mode === 'city' && Math.abs(wrapAngle(state.azimuth - home.azimuth)) > 0.2);
    }

    function markFollow() {
      followRef = bounds && !focus ? homeState(0) : null;
    }

    // Keeps a following camera framed after the layout changed (resize, safe area): the view moves
    // with home, so a camera at home stays at home and a small player offset is kept.
    function rehome() {
      if (!autoFollow || !bounds || focus || workerView || track || pointers.size) return;
      if (flight && flight.user) return;
      const home = homeState(goal.azimuth);
      if (flight) {
        if (followRef) flight.to = clampState(shiftByHome(flight.to, followRef, home), limits());
      } else {
        copyState(followRef ? shiftByHome(goal, followRef, home) : home, goal);
        clampState(goal, limits());
      }
      followRef = home;
    }

    function describeBounds() {
      if (!bounds) return null;
      return {
        mode: bounds.mode,
        key: bounds.key,
        center: { x: bounds.center.x, z: bounds.center.z },
        minX: bounds.minX,
        maxX: bounds.maxX,
        minZ: bounds.minZ,
        maxZ: bounds.maxZ,
        topY: bounds.topY,
        reach: bounds.reach,
        panRadius: bounds.panRadius,
        builtTop: bounds.builtTop,
        radius: Math.max(Math.hypot(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) / 2, bounds.reach),
        fitDistance: layout.fitFinal,
        minDistance: layout.minD,
        maxDistance: layout.maxD,
      };
    }

    function setBounds(input) {
      if (!input) return null;
      const next = normalizeBounds(input);
      const previous = boundsByMode[next.mode];
      if (previous && previous.key === next.key) {
        if (!Number.isFinite(input.builtTop)) next.builtTop = previous.builtTop;
        next.fresh = previous.fresh;
      } else {
        next.fresh = true;
      }
      if (next.mode === 'site' && next.fresh) siteLevel = null;
      if (next.fresh || !bounds || bounds.mode !== next.mode) followRef = null;
      boundsByMode[next.mode] = next;
      bounds = next;
      focus = null;
      relayout();
      return describeBounds();
    }

    function setMode(mode, opts) {
      const name = mode === 'city' ? 'city' : 'site';
      if (opts) {
        const merged = Object.assign({}, boundsByMode[name] || (name === 'city' ? DEFAULT_CITY : {}), opts, { mode: name });
        // A changed box is a new place; other tweaks (rail, clamps) keep the key and the remembered azimuth.
        const boxChanged = ['minX', 'maxX', 'minZ', 'maxZ', 'topY', 'center'].some(function (field) { return field in opts; });
        if (!opts.key && boxChanged) delete merged.key;
        return setBounds(merged);
      }
      if (!boundsByMode[name]) return name === 'city' ? setBounds(DEFAULT_CITY) : null;
      if (bounds !== boundsByMode[name]) followRef = null;
      bounds = boundsByMode[name];
      focus = null;
      if (name === 'site' && !activityManual) seedActivity(); // the site may have grown while the city was shown
      relayout();
      return describeBounds();
    }

    function seedActivity() {
      const world = options.getWorld && options.getWorld();
      const site = boundsByMode.site;
      if (!site || !world || world.level !== siteLevel || !world.blocks) return;
      let top = 0;
      for (let i = 0; i < world.blocks.length; i++) {
        const block = world.blocks[i];
        if (block.built && block.y + 1 > top) top = block.y + 1;
      }
      site.builtTop = top;
    }

    function setActivity(activity) {
      activityManual = true;
      const site = boundsByMode.site;
      if (!site || !activity) return;
      site.builtTop = Math.max(0, pick(activity.builtTop, site.builtTop));
    }

    // Until game.js reports activity itself, the built height is read from the world once a second.
    function pollActivity(dt) {
      if (activityManual || !siteLevel || !bounds || bounds !== boundsByMode.site) return;
      activityPoll -= dt;
      if (activityPoll > 0) return;
      activityPoll = 1;
      seedActivity();
    }

    function followCheck(dt, now) {
      followPoll -= dt;
      if (followPoll > 0) return;
      followPoll = 0.25;
      if (!autoFollow || focus || workerView || track || !bounds || bounds.mode !== 'site') return;
      if (busy(now) || now - lastInputAt < FOLLOW_IDLE_MS) return;
      const home = homeState(goal.azimuth);
      if (!followRef) {
        followRef = home;
        return;
      }
      // Only a moved home (the building grew, the layout changed) starts a flight; the player's own
      // small zoom or lift is never undone, it travels with home.
      if (!homeMoved(followRef, home)) return;
      const to = shiftByHome(goal, followRef, home);
      followRef = home;
      startFlight(to, 1.2, null, false);
    }

    // After the player lets go, the camera keeps following only if it was left near home; the
    // view they chose becomes the offset that follows home from now on.
    function settle(now) {
      if (!inputDirty || busy(now) || now - lastInputAt < SETTLE_MS) return;
      inputDirty = false;
      if (workerView || focus || track || !bounds) return;
      autoFollow = !isAwayFromHome();
      if (autoFollow) markFollow();
    }

    // ---- flights ----

    function startFlight(state, seconds, onDone, user) {
      const to = mergeState(state, flight ? flight.to : goal);
      clampState(to, limits());
      endFlight(false);
      inertia = null;
      if (!(seconds > 0)) {
        copyState(to, goal);
        copyState(to, cur);
        applyOrbit(cur);
        if (user) landed();
        if (onDone) onDone(true);
        return;
      }
      to.azimuth = cur.azimuth + wrapAngle(to.azimuth - cur.azimuth);
      flight = { from: copyState(cur), to: to, t: 0, duration: seconds, onDone: onDone || null, user: !!user };
    }

    function endFlight(completed) {
      const done = flight;
      if (!done) return;
      flight = null;
      if (completed) {
        copyState(done.to, goal);
        copyState(done.to, cur);
      } else {
        copyState(cur, goal);
      }
      if (done.user && completed) landed();
      if (done.onDone) done.onDone(completed);
    }

    // A flyTo that lands near home turns following back on from there.
    function landed() {
      autoFollow = !isAwayFromHome();
      if (autoFollow) markFollow();
    }

    function stepFlight(dt) {
      flight.t = Math.min(1, flight.t + dt / flight.duration);
      lerpState(flight.from, flight.to, easeInOutCubic(flight.t), cur);
      if (flight.t >= 1) endFlight(true);
    }

    function flyTo(state, seconds, onDone) {
      if (workerView) leaveWorkerView(true);
      autoFollow = false;
      startFlight(state, seconds === undefined ? 0.8 : seconds, onDone, true);
    }

    function frameHome(opts) {
      const settings = opts || {};
      if (workerView) leaveWorkerView(true);
      focus = null;
      track = null;
      autoFollow = true;
      let azimuth = (flight ? flight.to : goal).azimuth;
      if (bounds && bounds.fresh) azimuth = SITE_AZIMUTH;
      if (bounds) bounds.fresh = false;
      azimuth = pick(settings.azimuth, azimuth);
      const home = homeState(azimuth);
      followRef = copyState(home);
      if (settings.intro) {
        // Entry beat: start wider, higher and turned, then settle onto the site.
        const from = copyState(home);
        from.distance = home.distance * 1.6;
        from.azimuth = home.azimuth - 0.6;
        from.polar = 0.7;
        endFlight(false);
        copyState(from, cur);
        copyState(from, goal);
        startFlight(home, settings.seconds || 1.4, settings.onDone, false);
        return;
      }
      startFlight(home, settings.animate ? (settings.seconds || 0.8) : 0, settings.onDone, false);
    }

    function snap() {
      if (flight) endFlight(true);
      inertia = null;
      snapOffset();
      if (workerView) {
        worker.blend = 1;
        return;
      }
      clampState(goal, limits());
      copyState(goal, cur);
      applyOrbit(cur);
    }

    function saveState() {
      const state = track && track.saved ? track.saved : flight ? flight.to : workerView && savedOrbit ? savedOrbit : goal;
      // The home the view is measured from: a following view restored later moves by what home did meanwhile.
      const home = bounds && !focus ? followRef || homeState(0) : null;
      return {
        mode: bounds ? bounds.mode : '',
        key: bounds ? bounds.key : '',
        target: { x: state.target.x, y: state.target.y, z: state.target.z },
        distance: state.distance,
        azimuth: state.azimuth,
        polar: state.polar,
        autoFollow: autoFollow,
        home: home ? {
          target: { x: home.target.x, y: home.target.y, z: home.target.z },
          distance: home.distance,
          polar: home.polar,
        } : null,
      };
    }

    function restoreState(saved, opts) {
      if (!saved || !saved.target || !(saved.distance > 0)) return false;
      if (bounds && saved.mode && saved.mode !== bounds.mode) return false;
      if (bounds && saved.key && saved.key !== bounds.key) return false;
      const settings = opts || {};
      if (workerView) leaveWorkerView(true);
      focus = null;
      track = null;
      autoFollow = saved.autoFollow !== false;
      let state = saved;
      if (autoFollow && bounds) {
        // A following view comes back where it would be now: the building may have grown while away.
        const home = homeState(0);
        const then = saved.home;
        if (then && then.target && then.distance > 0 && Number.isFinite(then.polar)) {
          state = shiftByHome(mergeState(saved, goal), mergeState(then, home), home);
        }
        followRef = home;
      }
      startFlight(state, settings.animate ? (settings.seconds || 0.6) : 0, settings.onDone, false);
      if (!settings.animate) snapOffset();
      return true;
    }

    // Legacy and debug: snap onto a point with loose clamps around it (look helpers, material row, old city entry).
    function framePoint(x, y, z, radius, opts) {
      const settings = opts || {};
      const reach = radius > 0 ? radius : 8;
      if (workerView) leaveWorkerView(true);
      const state = makeState(x, y, z, reach, pick(settings.azimuth, 0.55), pick(settings.polar, 1.08));
      focus = { x: x, y: y, z: z, radius: reach, home: copyState(state) };
      startFlight(state, settings.seconds > 0 ? settings.seconds : 0, settings.onDone, false);
    }

    // Double tap, double click, F and Home: back to the view this screen is about. Under framePoint
    // (debug look, material row, the old HQ entry) that is the framed point, not the site.
    function recenter() {
      interact('home');
      // Following a worker: back onto him at the near distance.
      const point = track ? trackPoint() : null;
      if (point) {
        const state = flight ? flight.to : goal;
        startFlight(makeState(point.x, point.y, point.z, TRACK_DISTANCE, state.azimuth, TRACK_POLAR), 0.6, null, false);
        return;
      }
      if (focus && focus.home) {
        if (workerView) leaveWorkerView(true);
        startFlight(focus.home, 0.8, null, false);
        return;
      }
      frameHome({ animate: true });
    }

    // setView: restoreState that never leaves a stale framing behind. A refused state (another site
    // or mode) falls back to the home of the active bounds.
    function setView(saved, opts) {
      if (restoreState(saved, opts)) return true;
      if (bounds) frameHome();
      return false;
    }

    function frameLevel(level, cx, cz, opts) {
      setBounds(siteBounds(level, cx, cz));
      siteLevel = level;
      seedActivity(); // covers offline progress and restored saves; setActivity() refines it later
      const settings = opts || {};
      frameHome({ intro: !!settings.intro, animate: !!settings.animate });
    }

    // ---- safe area and projection ----

    function normalizeSafe() {
      let top = safeInput.top;
      let bottom = safeInput.bottom;
      const minBand = viewH * 0.25;
      if (viewH - top - bottom < minBand) {
        const scale = Math.max(0, viewH - minBand) / Math.max(1, top + bottom);
        top *= scale;
        bottom *= scale;
      }
      safe.top = top;
      safe.bottom = bottom;
      let left = safeInput.left;
      let right = safeInput.right;
      const minBandX = viewW * 0.4;
      if (viewW - left - right < minBandX) {
        const scale = Math.max(0, viewW - minBandX) / Math.max(1, left + right);
        left *= scale;
        right *= scale;
      }
      safe.left = left;
      safe.right = right;
      offsetGoal = (safe.bottom - safe.top) / 2;
      offsetXGoal = (safe.right - safe.left) / 2;
    }

    function snapOffset() {
      offsetCur = offsetGoal;
      offsetXCur = offsetXGoal;
      applyViewOffset(true);
    }

    // The projection centre moves into the middle of the free band; raycasts stay valid because
    // Raycaster.setFromCamera uses the offset projection matrix.
    function applyViewOffset(force) {
      if (!force && Math.abs(offsetCur - offsetApplied) < 0.2 && Math.abs(offsetXCur - offsetXApplied) < 0.2) return;
      offsetApplied = offsetCur;
      offsetXApplied = offsetXCur;
      if (Math.abs(offsetCur) < 0.2 && Math.abs(offsetXCur) < 0.2) {
        camera.aspect = viewW / viewH;
        if (camera.view && camera.view.enabled) camera.clearViewOffset();
        else camera.updateProjectionMatrix();
        return;
      }
      camera.setViewOffset(viewW, viewH, offsetXCur, offsetCur, viewW, viewH);
      camera.updateProjectionMatrix();
    }

    function smoothOffset(dt) {
      const blend = 1 - Math.exp(-dt / TAU_OFFSET);
      if (offsetCur !== offsetGoal) {
        offsetCur += (offsetGoal - offsetCur) * blend;
        if (Math.abs(offsetGoal - offsetCur) < 0.2) offsetCur = offsetGoal;
      }
      if (offsetXCur !== offsetXGoal) {
        offsetXCur += (offsetXGoal - offsetXCur) * blend;
        if (Math.abs(offsetXGoal - offsetXCur) < 0.2) offsetXCur = offsetXGoal;
      }
      applyViewOffset(false);
    }

    function setSafeArea(area, opts) {
      safeInput.top = Math.max(0, pick(area && area.top, 0));
      safeInput.bottom = Math.max(0, pick(area && area.bottom, 0));
      safeInput.left = Math.max(0, pick(area && area.left, 0));
      safeInput.right = Math.max(0, pick(area && area.right, 0));
      normalizeSafe();
      if (opts && opts.snap) snapOffset();
      relayout();
      rehome();
    }

    function resize(width, height) {
      if (width > 0) viewW = width;
      if (height > 0) viewH = height;
      camera.aspect = viewW / viewH;
      camera.fov = portraitFov(viewW / viewH, baseFov, minHFov);
      normalizeSafe();
      snapOffset();
      relayout();
      rehome();
    }

    // ---- input: shared moves ----

    function worldPerPx() {
      return 2 * goal.distance * Math.tan(camera.fov * Math.PI / 360) / viewH;
    }

    function cityRail() {
      return bounds && bounds.mode === 'city' && !focus;
    }

    function zoomBy(factor) {
      if (!(factor > 0) || !Number.isFinite(factor)) return;
      if (workerView) {
        worker.distance = clamp(worker.distance * factor, WORKER_MIN, WORKER_MAX);
        return;
      }
      const range = limits();
      goal.distance = clamp(goal.distance * factor, range.minD, range.maxD);
    }

    // How far from the site centre pan input may take the target at the current zoom: the footprint
    // plus a share of the visible half-width, so the building never leaves the screen by panning alone.
    // Zoomed out, the mines come into reach; panRadius stays the hard limit.
    function panReach() {
      const halfX = (bounds.maxX - bounds.minX) / 2;
      const halfZ = (bounds.maxZ - bounds.minZ) / 2;
      const halfView = goal.distance * Math.tan(camera.fov * Math.PI / 360) * viewW / viewH;
      return Math.min(bounds.panRadius, Math.max(Math.hypot(halfX, halfZ), Math.max(halfX, halfZ) + PAN_VIEW_SHARE * halfView));
    }

    // Ground-plane pan, 1:1 with the finger at the target's depth.
    function panBy(dx, dy) {
      if (workerView || track) return;
      const step = worldPerPx();
      const deep = step / Math.max(Math.cos(goal.polar), 0.35);
      const sa = Math.sin(goal.azimuth);
      const ca = Math.cos(goal.azimuth);
      const beforeX = goal.target.x;
      const beforeZ = goal.target.z;
      goal.target.x += -ca * dx * step - sa * dy * deep;
      goal.target.z += sa * dx * step - ca * dy * deep;
      if (!bounds || bounds.mode !== 'site' || focus) return;
      // Sticky: a target already farther out (zoomed in after panning) is not pulled back, it just cannot go farther.
      const cx = bounds.center.x;
      const cz = bounds.center.z;
      const after = Math.hypot(goal.target.x - cx, goal.target.z - cz);
      const allowed = Math.max(panReach(), Math.hypot(beforeX - cx, beforeZ - cz));
      if (after > allowed) {
        goal.target.x = cx + (goal.target.x - cx) * allowed / after;
        goal.target.z = cz + (goal.target.z - cz) * allowed / after;
      }
    }

    // City: forward and back along the rail itself, whatever the (limited) orbit angle, so the pivot
    // never drifts across the boulevard. amount > 0 = away from the eye.
    function moveAhead(amount) {
      if (cityRail()) {
        const rail = bounds.rail;
        const length = Math.hypot(rail.bx - rail.ax, rail.bz - rail.az);
        if (length > 0) {
          const ux = (rail.bx - rail.ax) / length;
          const uz = (rail.bz - rail.az) / length;
          const facing = -Math.sin(goal.azimuth) * ux - Math.cos(goal.azimuth) * uz >= 0 ? 1 : -1;
          goal.target.x += ux * facing * amount;
          goal.target.z += uz * facing * amount;
          return;
        }
      }
      goal.target.x -= Math.sin(goal.azimuth) * amount;
      goal.target.z -= Math.cos(goal.azimuth) * amount;
    }

    // dx, dy in stage px, screen directions (right, down). mode 'orbit': horizontal orbits, vertical rides
    // the elevator (site) or the rail (city). mode 'pan': ground-plane pan.
    function dragBy(dx, dy, mode) {
      if (workerView) {
        worker.yawOffset = clamp(worker.yawOffset - dx / viewW * ORBIT_PER_WIDTH, -Math.PI, Math.PI);
        worker.lift = clamp(worker.lift + ELEVATOR_SIGN * dy * 0.02, -1.2, 4);
        return;
      }
      if (track) {
        // Around the worker: sideways turns, up and down tilts (down — more from above).
        goal.azimuth -= dx / viewW * ORBIT_PER_WIDTH;
        goal.polar = clamp(goal.polar - dy * TRACK_TILT, TRACK_POLAR_MIN, TRACK_POLAR_MAX);
        return;
      }
      if (mode === 'pan') {
        panBy(dx, dy);
        return;
      }
      goal.azimuth -= dx / viewW * ORBIT_PER_WIDTH;
      if (!dy) return;
      if (cityRail()) {
        moveAhead(ELEVATOR_SIGN * dy * worldPerPx() / Math.max(Math.cos(goal.polar), 0.35));
        return;
      }
      goal.target.y += ELEVATOR_SIGN * dy * worldPerPx() / Math.max(Math.sin(goal.polar), 0.5);
    }

    function stopMotion() {
      endFlight(false);
      inertia = null;
    }

    // ---- input: pointers ----

    function pinchSample() {
      const values = pointers.values();
      const a = values.next().value;
      const b = values.next().value;
      return {
        span: Math.hypot(a.x - b.x, a.y - b.y),
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        angle: Math.atan2(b.y - a.y, b.x - a.x),
      };
    }

    // Re-seeded whenever the pointer count changes, so adding or lifting a finger never jumps.
    function seedPinch() {
      if (pointers.size < 2) {
        pinch = null;
        return;
      }
      const sample = pinchSample();
      pinch = Object.assign(sample, { twist: 0, twisting: false, started: pinch ? pinch.started : false });
    }

    function movePinch() {
      if (!pinch) seedPinch();
      const next = pinchSample();
      const scale = stageScale();
      if (!pinch.started) {
        pinch.started = true;
        interact('zoom');
      }
      if (pinch.span > 0 && next.span > 0) zoomBy(pinch.span / next.span);
      if (!workerView) {
        panBy((next.x - pinch.x) / scale, (next.y - pinch.y) / scale);
        const turn = wrapAngle(next.angle - pinch.angle);
        pinch.twist += turn;
        if (Math.abs(pinch.twist) > TWIST_START) pinch.twisting = true;
        if (pinch.twisting) goal.azimuth += turn;
      }
      pinch.span = next.span;
      pinch.x = next.x;
      pinch.y = next.y;
      pinch.angle = next.angle;
      noteInput();
    }

    function onPointerDown(event) {
      if (inputBlocked()) return;
      if (event.pointerType === 'mouse' && event.button > 2) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try {
        view.setPointerCapture(event.pointerId);
      } catch (error) {
        // Synthetic or already-released pointers cannot be captured; the drag still works on the canvas.
      }
      noteInput();
      stopMotion();
      const now = performance.now();
      if (pointers.size === 1) {
        const mouse = event.pointerType === 'mouse' || !event.pointerType;
        gesture = {
          mouse: mouse,
          mode: mouse && (event.button === 1 || event.button === 2 || event.shiftKey) ? 'pan' : 'orbit',
          multi: false,
          moved: false,
          axis: '',
          startX: event.clientX,
          startY: event.clientY,
          startT: now,
          lastX: event.clientX,
          lastY: event.clientY,
          lastT: now,
          velX: 0,
          velY: 0,
        };
        return;
      }
      if (gesture) gesture.multi = true;
      seedPinch();
    }

    function onPointerMove(event) {
      const point = pointers.get(event.pointerId);
      if (!point) return;
      point.x = event.clientX;
      point.y = event.clientY;
      if (pointers.size >= 2) {
        movePinch();
        return;
      }
      const g = gesture;
      if (!g || g.multi) return; // the finger left over after a pinch does nothing until all lift
      const scale = stageScale();
      if (!g.moved) {
        const totalX = (event.clientX - g.startX) / scale;
        const totalY = (event.clientY - g.startY) / scale;
        const slop = g.mouse ? MOUSE_SLOP : TOUCH_SLOP;
        if (totalX * totalX + totalY * totalY < slop * slop) return;
        g.moved = true;
        g.axis = g.mode === 'pan' ? '' : lockAxis(totalX, totalY);
        interact(g.mode === 'pan' ? 'pan' : 'orbit');
        setCursor(g.mode === 'pan' ? 'move' : 'grabbing');
      }
      // lastX starts at the press point, so the slop distance is applied too and the content stays under the finger.
      let dx = (event.clientX - g.lastX) / scale;
      let dy = (event.clientY - g.lastY) / scale;
      g.lastX = event.clientX;
      g.lastY = event.clientY;
      if (g.axis === 'x') dy = 0;
      if (g.axis === 'y') dx = 0;
      dragBy(dx, dy, g.mode);
      const now = performance.now();
      const ms = Math.max(8, now - g.lastT);
      g.lastT = now;
      g.velX += (dx * 1000 / ms - g.velX) * 0.35;
      g.velY += (dy * 1000 / ms - g.velY) * 0.35;
      noteInput();
    }

    function onTap(event, g) {
      const scale = stageScale();
      const x = event.clientX / scale;
      const y = event.clientY / scale;
      if (lastTap && g.startT - lastTap.t < DOUBLE_TAP_MS && Math.hypot(x - lastTap.x, y - lastTap.y) < DOUBLE_TAP_PX) {
        lastTap = null;
        recenter();
        return;
      }
      lastTap = { t: performance.now(), x: x, y: y };
      if (options.onClick) options.onClick(event);
    }

    function onPointerUp(event, allowTap) {
      if (!pointers.has(event.pointerId)) return;
      pointers.delete(event.pointerId);
      try {
        if (view.hasPointerCapture && view.hasPointerCapture(event.pointerId)) view.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Capture may already be gone (element hidden, pointer cancelled).
      }
      if (pointers.size >= 2) {
        seedPinch();
        return;
      }
      if (pointers.size === 1) {
        pinch = null;
        if (gesture) gesture.multi = true;
        return;
      }
      pinch = null;
      const g = gesture;
      gesture = null;
      setCursor('grab');
      if (!g || inputBlocked()) return;
      const now = performance.now();
      if (!g.multi && !g.moved) {
        if (allowTap && now - g.startT <= TAP_MS) onTap(event, g);
        return;
      }
      if (!g.multi && g.moved && !workerView && now - g.lastT < INERTIA_WINDOW_MS &&
          Math.hypot(g.velX, g.velY) > INERTIA_STOP * 4) {
        // Capped: an ordinary quick swipe should coast a little, not spin the site half a turn.
        const speed = Math.hypot(g.velX, g.velY);
        const cap = viewW * INERTIA_MAX;
        const keep = speed > cap ? cap / speed : 1;
        inertia = { vx: g.velX * keep, vy: g.velY * keep, mode: g.mode };
      }
    }

    function applyInertia(dt) {
      if (!inertia) return;
      dragBy(inertia.vx * dt, inertia.vy * dt, inertia.mode);
      inertia.vx *= Math.exp(-dt / 0.3);
      inertia.vy *= Math.exp(-dt / 0.22);
      if (Math.hypot(inertia.vx, inertia.vy) < INERTIA_STOP) inertia = null;
    }

    view.addEventListener('pointerdown', onPointerDown);
    view.addEventListener('pointermove', onPointerMove);
    view.addEventListener('pointerup', function (event) { onPointerUp(event, true); });
    view.addEventListener('pointercancel', function (event) { onPointerUp(event, false); });
    view.addEventListener('lostpointercapture', function (event) { onPointerUp(event, false); });
    view.addEventListener('contextmenu', function (event) { event.preventDefault(); });
    view.addEventListener('dblclick', function (event) { event.preventDefault(); });
    // Middle-button autoscroll would fight the pan.
    view.addEventListener('mousedown', function (event) { if (event.button === 1) event.preventDefault(); });
    setCursor('grab');

    // ---- input: wheel, trackpad, Safari gestures ----

    function isTextField(element) {
      if (!element) return false;
      const tag = element.tagName;
      return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || !!element.isContentEditable;
    }

    function scrollableAncestor(element, event) {
      const wantX = !event || event.deltaX !== 0;
      const wantY = !event || event.deltaY !== 0;
      for (let node = element; node && node.nodeType === 1 && node !== doc.body && node !== doc.documentElement; node = node.parentElement) {
        if (node === view) return false;
        const style = root.getComputedStyle(node);
        if (wantY && /auto|scroll|overlay/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) return true;
        if (wantX && /auto|scroll|overlay/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1) return true;
      }
      return false;
    }

    function isUiTarget(element, event) {
      if (!element || element === view || !element.closest) return false;
      if (options.isScrollable && options.isScrollable(element, event)) return true;
      if (uiSelector && element.closest(uiSelector)) return true;
      return scrollableAncestor(element, event);
    }

    function onWheel(event) {
      if (event.ctrlKey) event.preventDefault(); // never let a pinch or ctrl+wheel zoom the page
      if (inputBlocked()) return;
      if (event.target !== view && isUiTarget(event.target, event)) return;
      event.preventDefault();
      const now = performance.now();
      if (now - wheel.last > WHEEL_STREAM_MS) {
        // The device is decided once per stream, so a trackpad swipe never flips into zoom halfway.
        wheel.kind = isMouseWheel(event) ? 'mouse' : event.ctrlKey ? 'pinch' : 'trackpad';
        wheel.axis = '';
        wheel.accX = 0;
        wheel.accY = 0;
        interact(wheel.kind === 'trackpad' && !event.ctrlKey ? 'scroll' : 'zoom');
      }
      wheel.last = now;
      noteInput();
      stopMotion();
      const unit = event.deltaMode === 1 ? LINE_PX : event.deltaMode === 2 ? viewH : 1;
      const dx = event.deltaX * unit;
      const dy = event.deltaY * unit;
      if (event.ctrlKey) {
        if (safariGesture) return; // Safari already zooms through gesturechange
        if (wheel.kind === 'mouse') zoomBy(Math.exp(clamp(dy, -300, 300) * MOUSE_ZOOM));
        else zoomBy(Math.exp(clamp(dy, -60, 60) * PINCH_ZOOM));
        return;
      }
      if (wheel.kind === 'mouse' || wheelZoomOnly) {
        if (event.shiftKey && !wheelZoomOnly) dragBy(-(dy || dx) * SHIFT_WHEEL_ORBIT / stageScale(), 0, 'orbit');
        else zoomBy(Math.exp(clamp(dy, -300, 300) * MOUSE_ZOOM));
        return;
      }
      // Two-finger trackpad scroll: deltaX orbits, deltaY rides the elevator (or the city rail).
      // With natural scrolling the content follows the fingers, like a one-finger drag.
      const scale = stageScale();
      let moveX = -dx * WHEEL_DRAG_GAIN / scale;
      let moveY = -dy * WHEEL_DRAG_GAIN / scale;
      if (!wheel.axis) {
        wheel.accX += Math.abs(moveX);
        wheel.accY += Math.abs(moveY);
        if (wheel.accX + wheel.accY < WHEEL_LOCK_PX) return;
        wheel.axis = lockAxis(wheel.accX, wheel.accY) || 'free';
      }
      if (wheel.axis === 'x') moveY = 0;
      if (wheel.axis === 'y') moveX = 0;
      dragBy(moveX, moveY, 'orbit');
    }

    function onGesture(event) {
      event.preventDefault(); // Safari (macOS trackpad, iOS) would zoom the whole page otherwise
      if (event.type === 'gestureend') {
        safariGesture = null;
        return;
      }
      // iOS sends a touch pinch through pointer events as well: only one path may zoom.
      if (inputBlocked() || pointers.size > 0) {
        safariGesture = null;
        return;
      }
      if (event.type === 'gesturestart') {
        if (event.target !== view && isUiTarget(event.target, null)) return;
        safariGesture = { scale: 1 };
        noteInput();
        stopMotion();
        interact('zoom');
        return;
      }
      if (!safariGesture) return;
      const scale = Math.max(0.05, event.scale || 1);
      zoomBy(safariGesture.scale / scale);
      safariGesture.scale = scale;
      noteInput();
    }

    root.addEventListener('wheel', onWheel, { passive: false });
    if (doc) {
      doc.addEventListener('gesturestart', onGesture, { passive: false });
      doc.addEventListener('gesturechange', onGesture, { passive: false });
      doc.addEventListener('gestureend', onGesture, { passive: false });
    }

    // ---- input: keyboard ----

    function keyAction(event) {
      return KEYS[event.code] || KEYS[event.key] || null;
    }

    root.addEventListener('keydown', function (event) {
      const action = keyAction(event);
      if (!action || event.ctrlKey || event.metaKey || event.altKey) return;
      if (inputBlocked() || isTextField(event.target)) return;
      if (SCROLL_KEYS[event.code] && isUiTarget(event.target, null)) return;
      event.preventDefault();
      noteInput();
      if (action === 'home') {
        if (!event.repeat) recenter();
        return;
      }
      if (held.has(action)) return;
      if (!held.size) interact('key');
      held.add(action);
      stopMotion();
    });
    root.addEventListener('keyup', function (event) {
      const action = keyAction(event);
      if (action) held.delete(action);
    });
    root.addEventListener('blur', function () {
      held.clear();
    });

    function applyKeys(dt) {
      if (!held.size) return;
      const turn = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      const rise = (held.has('up') ? 1 : 0) - (held.has('down') ? 1 : 0);
      const zoom = (held.has('out') ? 1 : 0) - (held.has('in') ? 1 : 0);
      noteInput();
      if (zoom) zoomBy(Math.exp(zoom * KEY_ZOOM * dt));
      if (workerView) {
        worker.yawOffset = clamp(worker.yawOffset + turn * KEY_ORBIT * dt, -Math.PI, Math.PI);
        worker.lift = clamp(worker.lift + rise * 2.5 * dt, -1.2, 4);
        return;
      }
      goal.azimuth += turn * KEY_ORBIT * dt;
      if (!rise) return;
      if (track) {
        goal.polar = clamp(goal.polar - rise * 0.9 * dt, TRACK_POLAR_MIN, TRACK_POLAR_MAX);
        return;
      }
      if (cityRail()) moveAhead(rise * goal.distance * 0.7 * dt);
      else goal.target.y += rise * ((bounds ? bounds.topY : 6) + 4) / 2 * dt;
    }

    function setInputEnabled(enabled) {
      inputEnabled = !!enabled;
      if (!inputEnabled) dropInput();
    }

    // Forget every gesture in progress (input switched off, a window opened over the scene).
    function dropInput() {
      pointers.forEach(function (point, id) {
        try {
          view.releasePointerCapture(id);
        } catch (error) {
          // Already released.
        }
      });
      pointers.clear();
      gesture = null;
      pinch = null;
      inertia = null;
      held.clear();
      safariGesture = null;
      lastTap = null;
      setCursor('grab');
    }

    // ---- worker focus: the orbit around the selected worker ----

    // pointFn() → { x, y, z } of the worker now (null once he is gone). The camera flies in closer
    // than the site view and keeps him in the centre; turning, tilting and zoom stay with the player.
    function setTrack(pointFn) {
      if (workerView) leaveWorkerView(true);
      const first = pointFn && pointFn();
      if (!first) return false;
      const from = flight ? flight.to : goal;
      if (!track) track = { point: pointFn, saved: copyState(from) };
      else track.point = pointFn;
      focus = null;
      autoFollow = false;
      inertia = null;
      const state = makeState(first.x, first.y, first.z, Math.min(TRACK_DISTANCE, from.distance), from.azimuth,
        clamp(from.polar, TRACK_POLAR_MIN + 0.2, TRACK_POLAR_MAX - 0.2));
      startFlight(state, 0.6, null, false);
      return true;
    }

    // Back to the site view (silent: just drop the focus, e.g. the site is being replaced).
    function clearTrack(silent) {
      if (!track) return;
      track = null;
      if (silent) return;
      frameHome({ animate: true });
    }

    // ---- worker follow view ----

    function enterWorkerView() {
      const builder = options.getSelectedBuilder && options.getSelectedBuilder();
      const stick = builder && options.getStickView && options.getStickView(builder);
      if (!stick || !stick.group) return false;
      savedOrbit = copyState(flight ? flight.to : goal);
      stopMotion();
      workerView = true;
      const group = stick.group;
      worker.yaw = group.rotation.y;
      worker.x = group.position.x - Math.sin(worker.yaw) * 3;
      worker.y = group.position.y + 2.2;
      worker.z = group.position.z - Math.cos(worker.yaw) * 3;
      worker.distance = WORKER_DISTANCE;
      worker.yawOffset = 0;
      worker.lift = 0;
      // Ease from the orbit pose into the chase pose instead of cutting.
      worker.blend = 0;
      worker.fromPos.copy(camera.position);
      worker.fromLook.copy(lookPoint);
      return true;
    }

    // Leaves follow mode with the orbit placed at the current eye, so the next flight starts where the camera is.
    function leaveWorkerView(notify) {
      if (!workerView) return;
      workerView = false;
      savedOrbit = null;
      const dx = camera.position.x - lookPoint.x;
      const dy = camera.position.y - lookPoint.y;
      const dz = camera.position.z - lookPoint.z;
      const distance = Math.max(0.5, Math.hypot(dx, dy, dz));
      cur.target.x = lookPoint.x;
      cur.target.y = lookPoint.y;
      cur.target.z = lookPoint.z;
      cur.distance = distance;
      cur.azimuth = Math.atan2(dx, dz);
      cur.polar = Math.acos(clamp(dy / distance, -1, 1));
      copyState(cur, goal);
      if (notify && options.onWorkerViewChange) options.onWorkerViewChange(false);
    }

    function setWorkerView(enabled) {
      if (enabled) {
        if (!workerView) enterWorkerView();
        return;
      }
      if (!workerView) return;
      const back = savedOrbit;
      leaveWorkerView(false);
      startFlight(back || homeState(goal.azimuth), 0.6, null, false);
    }

    function updateWorker(dt, now) {
      const builder = options.getSelectedBuilder && options.getSelectedBuilder();
      const stick = builder && options.getStickView && options.getStickView(builder);
      if (!stick || !stick.group) return false;
      const group = stick.group;
      if (now - lastInputAt > WORKER_RELAX_MS) {
        const relax = Math.exp(-dt / 1.5);
        worker.yawOffset *= relax;
        worker.lift *= relax;
      }
      const movementX = builder.to[0] - builder.from[0];
      const movementZ = builder.to[2] - builder.from[2];
      if (movementX * movementX + movementZ * movementZ > 0.0004) {
        const targetYaw = Math.atan2(movementX, movementZ);
        worker.yaw += wrapAngle(targetYaw - worker.yaw) * (1 - Math.exp(-dt / 0.12));
      }
      const targetX = group.position.x;
      const targetY = group.position.y + 0.65;
      const targetZ = group.position.z;
      const relativeX = worker.x - targetX;
      const relativeZ = worker.z - targetZ;
      const currentDistance = Math.hypot(relativeX, relativeZ);
      const currentAngle = Math.atan2(relativeX, relativeZ);
      const desiredAngle = worker.yaw + Math.PI + worker.yawOffset;
      const orbitAngle = currentAngle + wrapAngle(desiredAngle - currentAngle) * (1 - Math.exp(-dt / 0.18));
      const springDistance = currentDistance + (worker.distance - currentDistance) * (1 - Math.exp(-dt / 0.35));
      const cameraDistance = Math.max(WORKER_MIN, springDistance);
      // Height keeps the default 3.2 / 2.2 slope as the follow distance changes.
      const desiredHeight = group.position.y + 0.65 + 1.55 * worker.distance / WORKER_DISTANCE + worker.lift;
      const desiredX = targetX + Math.sin(orbitAngle) * cameraDistance;
      const desiredY = worker.y + (desiredHeight - worker.y) * (1 - Math.exp(-dt / 0.35));
      const desiredZ = targetZ + Math.cos(orbitAngle) * cameraDistance;
      const clearPosition = resolvePosition(targetX, targetY, targetZ, desiredX, desiredY, desiredZ);
      const travelPosition = resolveTravel(worker.x, worker.y, worker.z, clearPosition[0], clearPosition[1], clearPosition[2]);
      worker.x = travelPosition[0];
      worker.y = travelPosition[1];
      worker.z = travelPosition[2];
      if (worker.blend < 1) {
        worker.blend = Math.min(1, worker.blend + dt / 0.6);
        const e = easeInOutCubic(worker.blend);
        camera.position.set(
          worker.fromPos.x + (worker.x - worker.fromPos.x) * e,
          worker.fromPos.y + (worker.y - worker.fromPos.y) * e,
          worker.fromPos.z + (worker.z - worker.fromPos.z) * e
        );
        lookPoint.set(
          worker.fromLook.x + (targetX - worker.fromLook.x) * e,
          worker.fromLook.y + (targetY - worker.fromLook.y) * e,
          worker.fromLook.z + (targetZ - worker.fromLook.z) * e
        );
      } else {
        camera.position.set(worker.x, worker.y, worker.z);
        lookPoint.set(targetX, targetY, targetZ);
      }
      camera.lookAt(lookPoint);
      return true;
    }

    function resolvePosition(targetX, targetY, targetZ, cameraX, cameraY, cameraZ) {
      const world = options.getWorld();
      const index = world.index;
      for (let height = 0; height <= 3; height += 0.5) {
        const raisedY = cameraY + height;
        const dx = cameraX - targetX;
        const dy = raisedY - targetY;
        const dz = cameraZ - targetZ;
        let clear = true;
        for (let i = 1; i <= 20; i++) {
          const part = i / 20;
          const x = Math.floor(targetX + dx * part);
          const y = Math.floor(targetY + dy * part);
          const z = Math.floor(targetZ + dz * part);
          if (!index.inside(x, y, z)) continue;
          if (!cellBlocked(world, index, x, y, z)) continue;
          clear = false;
          break;
        }
        if (clear) return [cameraX, raisedY, cameraZ];
      }
      return [cameraX, cameraY + 3.5, cameraZ];
    }

    function resolveTravel(fromX, fromY, fromZ, toX, toY, toZ) {
      const world = options.getWorld();
      const index = world.index;
      const dx = toX - fromX;
      const dy = toY - fromY;
      const dz = toZ - fromZ;
      for (let i = 1; i <= 20; i++) {
        const part = i / 20;
        const x = Math.floor(fromX + dx * part);
        const y = Math.floor(fromY + dy * part);
        const z = Math.floor(fromZ + dz * part);
        if (!index.inside(x, y, z)) continue;
        if (!cellBlocked(world, index, x, y, z)) continue;
        const safePart = (i - 1) / 20;
        return [
          fromX + dx * safePart,
          fromY + dy * safePart,
          fromZ + dz * safePart,
        ];
      }
      return [toX, toY, toZ];
    }

    function cellBlocked(world, index, x, y, z) {
      const id = index.id(x, y, z);
      return world.solidGrid[id] === 1 ||
        world.doorGrid[id] === 1 ||
        world.bridgeGrid[id] === 1;
    }

    // ---- frame ----

    function applyOrbit(state) {
      const sinPolar = Math.sin(state.polar);
      camera.position.set(
        state.target.x + state.distance * sinPolar * Math.sin(state.azimuth),
        state.target.y + state.distance * Math.cos(state.polar),
        state.target.z + state.distance * sinPolar * Math.cos(state.azimuth)
      );
      lookPoint.set(state.target.x, state.target.y, state.target.z);
      camera.lookAt(lookPoint);
    }

    function smoothToward(dt, tau) {
      const k = 1 - Math.exp(-dt / tau);
      cur.target.x += (goal.target.x - cur.target.x) * k;
      cur.target.y += (goal.target.y - cur.target.y) * k;
      cur.target.z += (goal.target.z - cur.target.z) * k;
      cur.distance = Math.exp(Math.log(cur.distance) + (Math.log(goal.distance) - Math.log(cur.distance)) * k);
      cur.azimuth += (goal.azimuth - cur.azimuth) * k;
      cur.polar += (goal.polar - cur.polar) * k;
    }

    function update(deltaTime, campaignStatus) {
      const dt = Math.min(Math.max(Number(deltaTime) || 0, 0), 0.1);
      const now = performance.now();
      const blocked = inputBlocked();
      if (blocked && !wasBlocked) dropInput(); // a window opened mid-drag: the drag must not go on under it
      wasBlocked = blocked;
      if (track) {
        const point = trackPoint();
        if (point) {
          const state = flight ? flight.to : goal;
          state.target.x = point.x;
          state.target.y = point.y;
          state.target.z = point.z;
        } else {
          clearTrack();
        }
      }
      if (workerView) {
        if (updateWorker(dt, now)) {
          smoothOffset(dt);
          return;
        }
        // The followed worker is gone: fly back to the orbit.
        const back = savedOrbit;
        leaveWorkerView(true);
        startFlight(back || homeState(goal.azimuth), 0.6, null, false);
      }
      applyKeys(dt);
      applyInertia(dt);
      if (campaignStatus === 'title' && !busy(now) && now - lastInputAt > TITLE_SPIN_IDLE_MS) goal.azimuth += dt * TITLE_SPIN;
      pollActivity(dt);
      followCheck(dt, now);
      settle(now);
      if (flight) {
        stepFlight(dt);
      } else {
        clampState(goal, limits());
        smoothToward(dt, (gesture && gesture.moved) || pinch ? TAU_DRAG : TAU_SMOOTH);
      }
      if (!flight && Math.abs(goal.azimuth) > 4 * Math.PI) {
        const turns = Math.round(goal.azimuth / (2 * Math.PI)) * 2 * Math.PI;
        goal.azimuth -= turns;
        cur.azimuth -= turns;
      }
      smoothOffset(dt);
      applyOrbit(cur);
    }

    applyViewOffset(true);
    applyOrbit(cur);

    const api = {
      camera: camera,
      // Legacy alias: the current orbit distance (game.js sized fog and shadows from it).
      get radius() {
        return cur.distance;
      },
      get homeDistance() {
        return homeState((flight ? flight.to : goal).azimuth).distance;
      },
      get minDistance() {
        return limits().minD;
      },
      get maxDistance() {
        return limits().maxD;
      },
      get mode() {
        return bounds ? bounds.mode : '';
      },
      get autoFollow() {
        return autoFollow;
      },
      update: update,
      resize: resize,
      frameLevel: frameLevel,
      framePoint: framePoint,
      frameHome: frameHome,
      flyTo: flyTo,
      snap: snap,
      setBounds: setBounds,
      getBounds: describeBounds,
      setMode: setMode,
      setActivity: setActivity,
      setSafeArea: setSafeArea,
      getSafeArea: function () {
        return { top: safe.top, bottom: safe.bottom, left: safe.left, right: safe.right };
      },
      saveState: saveState,
      restoreState: restoreState,
      // Aliases used by game.js when a site view is rebuilt in place (adoptSite).
      getView: saveState,
      setView: setView,
      setInputEnabled: setInputEnabled,
      isInputEnabled: function () {
        return inputEnabled;
      },
      setAutoFollow: function (enabled) {
        autoFollow = !!enabled;
        if (autoFollow) markFollow();
      },
      setWheelZoom: function (enabled) {
        wheelZoomOnly = !!enabled;
      },
      isAwayFromHome: isAwayFromHome,
      isFlying: function () {
        return !!flight;
      },
      setWorkerView: setWorkerView,
      setTrack: setTrack,
      clearTrack: clearTrack,
      isTracking: function () {
        return !!track;
      },
      isWorkerView: function () {
        return workerView;
      },
    };
    // Debug handle for the console and the screenshot harness; game code keeps its own reference.
    root.MicroBuildersCamera.current = api;
    return api;
  }

  root.MicroBuildersCamera = {
    create: create,
    siteBounds: siteBounds,
    ELEVATOR_SIGN: ELEVATOR_SIGN,
    // Pure helpers, exported for headless checks (no THREE or DOM needed).
    math: {
      clamp: clamp,
      wrapAngle: wrapAngle,
      easeInOutCubic: easeInOutCubic,
      makeState: makeState,
      lerpState: lerpState,
      clampState: clampState,
      clampToRail: clampToRail,
      portraitFov: portraitFov,
      shiftByHome: shiftByHome,
      homeMoved: homeMoved,
      fitDistance: fitDistance,
      verticalExtent: verticalExtent,
      siteHome: siteHome,
      cityHome: cityHome,
      normalizeBounds: normalizeBounds,
      isMouseWheel: isMouseWheel,
      lockAxis: lockAxis,
      DEFAULT_CITY: DEFAULT_CITY,
    },
  };
})(window);
