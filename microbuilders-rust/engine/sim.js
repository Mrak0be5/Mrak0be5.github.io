(function (root) {
  // Session simulator: steady-state coins / mass / capital per minute from session stats.
  //
  // Heuristic and cheap on purpose — no pathfinding, no graph search. A level is reduced once to a
  // static topology summary (cubes per material and floor, average distances to mines, elevator pads
  // and the building edge), so the estimate depends on the building's shape but never on what is
  // already built: online and offline always agree.
  //
  // Every session upgrade enters the formulas so that buying it can never lower the result
  // (see checkMonotonic). Weather and other temporary environment effects are left out.
  //
  // Needs only window.MicroBuildersBalance, so the balance tool can use it too:
  //   const summary = MicroBuildersSim.summarizeLevel(level);   // once per level
  //   const result = MicroBuildersSim.estimate(summary, stats); // stats: campaign-like object
  const BALANCE = root.MicroBuildersBalance;
  const SESSION = BALANCE.session;
  const TUNING = BALANCE.tuning;
  const WORK = TUNING.builders;
  const MACHINE = TUNING.machines;
  const DRONE = TUNING.drones;

  // Fitted coefficients of the estimate (balance.json → tuning.simulator, «Настройки» of the balance tool;
  // tools/simfit fits them to headless runs of the game): setting and picking match the game exactly;
  // walking, planning and crew size are the fudge.
  //   crewEfficiency — overall crew factor; crewPower — crew output grows as builders^crewPower;
  //   machineEfficiency — machines wait for free clusters, parking, cooldowns; tripLatency / cubeLatency —
  //   fixed seconds per trip / per cube; frontierShare — useful builders per cube of an average floor;
  //   walkDetour — grid paths vs a straight line; floorWalk — extra cells per floor of height;
  //   scaffoldPiecesPerCube — ladder/deck pieces per cube above ground; patternFill — share of the pattern
  //   box a cluster fills; driveOverhead / droneOverhead — seconds per drive / per drone cube;
  //   heliHookTravel / craneCells — cable / crane travel per pattern, cells; craneFixedSeconds — crane
  //   turns and pauses per pattern; edgeBuckets — edge-distance histogram size.
  const HEURISTIC = TUNING.simulator;



  const formulaCache = {};
  function sessionValue(kind, level) {
    const spec = SESSION[kind];
    const locked = spec.overrides && spec.overrides[String(level)];
    if (locked !== undefined) return locked;
    // Keyed by the formula text, so edits in the balance tool take effect at once.
    let fn = formulaCache[spec.formula];
    if (!fn) {
      fn = new Function('x', 'Math', 'return (' + spec.formula.replace(/\^/g, '**') + ');');
      formulaCache[spec.formula] = fn;
    }
    return fn(level, Math);
  }

  // Material stats the simulator needs: whole cube weight, mini-cube (cell) weight and grid.
  function defaultMaterial(materialId) {
    const material = root.MicroBuilders.MATERIAL[materialId];
    return { weight: material.weight, cell: material.cell, grid: material.grid };
  }

  // ---------- static topology summary ----------

  // materialOf(id) → { weight, cell, grid } (defaults to MicroBuilders.MATERIAL).
  function summarizeLevel(level, materialOf) {
    const materialStats = materialOf || defaultMaterial;
    const fp = level.footprint;
    const centerX = (fp.minX + fp.maxX) / 2 + 0.5;
    const centerZ = (fp.minZ + fp.maxZ) / 2 + 0.5;
    const pads = (level.elevators || []).map(function (pad) { return [pad.x + 1.5, pad.z + 1.5]; });
    const home = level.spawnPoints[0];
    const firstMine = level.mines[0];
    const yardX = firstMine.x + 8;
    const yardZ = firstMine.z + 6;
    const groups = new Map();
    let droneDistSum = 0;
    let droneCubes = 0;
    let siteToEdge = Math.max(fp.maxX - fp.minX, fp.maxZ - fp.minZ) / 2;

    for (let i = 0; i < level.blocks.length; i++) {
      const block = level.blocks[i];
      const key = block.materialId + '|' + block.y;
      let group = groups.get(key);
      if (!group) {
        const stats = materialStats(block.materialId);
        group = {
          materialId: block.materialId,
          weight: stats.weight,
          part: stats.cell,
          parts: stats.grid * stats.grid * stats.grid,
          y: block.y,
          cubes: 0,
          machineCubes: 0,
          mineDistSum: 0,
          padDistSum: pads.map(function () { return 0; }),
          edgeHist: new Array(HEURISTIC.edgeBuckets).fill(0),
        };
        groups.set(key, group);
      }
      const mine = level.minesByMaterial[block.materialId] || firstMine;
      group.cubes += 1;
      group.mineDistSum += Math.hypot(block.x + 0.5 - mine.standX - 0.5, block.z + 0.5 - mine.standZ - 0.5);
      // Distance to the nearest of the first n elevator pads, for every n.
      let nearest = Infinity;
      for (let p = 0; p < pads.length; p++) {
        nearest = Math.min(nearest, Math.hypot(block.x + 0.5 - pads[p][0], block.z + 0.5 - pads[p][1]));
        group.padDistSum[p] += nearest;
      }
      if (!block.feature) {
        const edge = Math.min(block.x - fp.minX, fp.maxX - block.x, block.z - fp.minZ, fp.maxZ - block.z);
        group.machineCubes += 1;
        group.edgeHist[Math.min(HEURISTIC.edgeBuckets - 1, edge)] += 1;
        droneDistSum += Math.hypot(mine.x - yardX, mine.z - yardZ);
        droneCubes += 1;
      }
    }

    const list = [];
    groups.forEach(function (group) {
      list.push({
        materialId: group.materialId,
        weight: group.weight,
        part: group.part,
        parts: group.parts,
        y: group.y,
        cubes: group.cubes,
        machineCubes: group.machineCubes,
        mineDist: group.mineDistSum / group.cubes,
        padDist: group.padDistSum.map(function (sum) { return sum / group.cubes; }),
        edgeHist: group.edgeHist,
      });
    });
    let machineMass = 0;
    let machineCubes = 0;
    for (let i = 0; i < list.length; i++) {
      machineMass += list[i].machineCubes * list[i].weight;
      machineCubes += list[i].machineCubes;
    }
    const floors = new Set();
    for (let i = 0; i < list.length; i++) floors.add(list[i].y);
    return {
      pace: level.pace || 1,
      chapter: Math.floor((level.index || 0) / 10),
      // The story level's index for its weather forecast; -1 for HQ builds and orders (clear).
      levelIndex: level.index === undefined ? -1 : level.index,
      maxY: fp.maxY,
      floors: Math.max(1, floors.size),
      groups: list,
      homeDist: Math.hypot(home[0] + 0.5 - centerX, home[2] + 0.5 - centerZ),
      yardHomeDist: Math.hypot(yardX - home[0], yardZ - home[2]),
      yardSiteDist: Math.max(0, Math.hypot(yardX - centerX, yardZ - centerZ) - siteToEdge),
      droneDist: droneCubes > 0 ? droneDistSum / droneCubes : 0,
      machineWeight: machineCubes > 0 ? machineMass / machineCubes : 0,
    };
  }

  // ---------- stats ----------

  function readStats(stats) {
    const p = stats.purchases;
    function v(kind) { return sessionValue(kind, p[kind] || 0); }
    function meta(name, fallback) { return stats[name] === undefined ? fallback : stats[name]; }
    const builders = meta('builderCount', v('builders'));
    const ranks = meta('metaWorkerRanks', []);
    // Ranked starting workers are already included in the total crew; later hires have rank 1.
    const timeEfficiency = builders > 0
      ? (builders - ranks.length + ranks.reduce(function (sum, rank) { return sum + rank; }, 0)) / builders
      : 1;
    return {
      v: v,
      level: function (kind) { return p[kind] || 0; },
      builders: builders,
      timeEfficiency: timeEfficiency,
      loaders: meta('vehicleCount', v('vehicles')),
      placeSpeed: meta('metaPlaceSpeed', 1),
      pickupSpeed: meta('metaPickupSpeed', 1),
      carry: meta('metaCarry', 0),
      carryScale: meta('metaCarryScale', 1),
      movement: meta('metaMovement', 1),
      scaffold: meta('metaScaffold', 1),
      plan: meta('metaPlan', 0),
      // «Оптовые закупки» of the office: upgrades a share cheaper — as many more coins to buy them with.
      coin: meta('metaCoinMultiplier', 1) / (1 - Math.min(0.9, (stats.office && stats.office.discount) || 0)),
      office: stats.office || {},
      capitalChance: Math.max(0, Math.min(1, meta('metaCapitalChance', 0))),
      capitalValue: Math.max(1, Math.round(meta('metaCapitalValue', 1) + v('cubeCapital'))),
      findCritical: stats.foremen && stats.foremen.prospector ? stats.foremen.prospector.value : 0,
      golden: stats.foremen && stats.foremen.golden,
      heightPenalty: meta('metaHeightPenalty', 1),
      hunger: meta('metaHunger', 1),
      smoke: meta('metaSmoke', 1),
      smokeShort: meta('metaSmokeShort', 1),
      overload: stats.foremen && stats.foremen.overload ? stats.foremen.overload.value : 1,
      droneGather: stats.foremen && stats.foremen.droneGather ? stats.foremen.droneGather.value : 1,
      dronePlace: stats.foremen && stats.foremen.machines ? stats.foremen.machines.second : 1,
      machineSpeed: stats.foremen && stats.foremen.machines ? stats.foremen.machines.value : 1,
      canteenMeal: meta('canteenMealSeconds', BALANCE.canteen ? BALANCE.canteen.mealSeconds : 50),
      canteenSeatBonus: meta('canteenSeatBonus', 0),
      nightRelief: meta('metaNightRelief', 0),
    };
  }

  // Sleep (balance.json → tuning.sleep, logic.js → SLEEP) in the steady state of day cycles: the
  // share of wall time a builder is off to the trailers (the walk there and back plus the sleep) and
  // his average fatigue slowdown while awake. A builder sleeps whenever his fatigue scale is full
  // (fatiguePointsMin…Max, filling ×nightFatigue at night and `rate` times faster in the weather),
  // so this follows a few scales across that range for three cycles after a warm-up one.
  // `dorm` — he sleeps in the dorm: a short way there (CAMP_CELLS) and a sleep `dorm` times as long
  // (DORM.sleepScale over «Крепкий сон»); 0 — in the far trailers.
  const sleepCache = {};
  function sleepShare(walkSpeed, rate, dorm) {
    const key = Math.round(walkSpeed * 100) + '|' + Math.round(rate * 1000) + (dorm ? '|' + Math.round(dorm * 1000) : '');
    if (sleepCache[key]) return sleepCache[key];
    const SLEEP = TUNING.sleep;
    const cycle = cycleSeconds();
    const trip = (dorm ? 2 * CAMP_CELLS : SLEEP.minSquares + SLEEP.maxSquares) * HEURISTIC.walkDetour / walkSpeed;
    const nap = (SLEEP.sleepMin + SLEEP.sleepMax) / 2 * (dorm || 1);
    const step = 5;
    let away = 0;
    let slow = 0;
    let awake = 0;
    [0.1, 0.3, 0.5, 0.7, 0.9].forEach(function (share) {
      const scale = SLEEP.fatiguePointsMin + (SLEEP.fatiguePointsMax - SLEEP.fatiguePointsMin) * share;
      let fatigue = 0;
      let off = 0;
      for (let t = 0; t < 4 * cycle; t += step) {
        const counted = t >= cycle;
        if (off > 0) {
          off -= step;
          if (counted) away += step;
          continue;
        }
        fatigue = Math.min(scale, fatigue + step * (dayClock(t).night ? SLEEP.nightFatigue : 1) * rate);
        const fill = fatigue / scale;
        if (counted) {
          awake += step;
          if (fill > SLEEP.debuffFrom) slow += step * SLEEP.debuffMax * (fill - SLEEP.debuffFrom) / (1 - SLEEP.debuffFrom);
        }
        if (fatigue >= scale) {
          off = trip + nap;
          fatigue = 0;
        }
      }
    });
    sleepCache[key] = { away: Math.min(0.9, away / (away + awake)), debuff: awake > 0 ? slow / awake : 0 };
    return sleepCache[key];
  }

  // Camp buildings (balance.json → canteen, dorm, lounge, light, sales; docs/gdd/20-site-camp.md),
  // taken as standing at the level bought — the crew's time to put them up is not counted. Each
  // serves its seats: of the crew on that break at once only `seats` get one, the rest go the usual
  // way off the site. CAMP_CELLS — a typical walk from the building to a camp door. The graph's camp
  // lines count too, except «Типовые проекты» (build time) and «Шеф-повар» (dishes).
  const CANTEEN = BALANCE.canteen || { seats: 2 };
  const DORM = BALANCE.dorm || { beds: 3, sleepScale: 1 };
  const LOUNGE = BALANCE.lounge || { seats: 2, smokeScale: 1 };
  const LIGHT = BALANCE.light || { reliefPerLevel: 0 };
  const SALES = BALANCE.sales || { levelRate: 0, levelBonus: 0 };
  const CAMP_CELLS = 10;
  const LIGHT_MASTS = 2;

  // Share of a break's takers that find a seat: `seats` for `crew` builders who are each on that
  // break `busy` of the time.
  function seatedShare(seats, crew, busy) {
    if (!(seats > 0)) return 0;
    return Math.min(1, seats / Math.max(1e-6, crew * busy));
  }

  // The masts' night relief: LIGHT.reliefPerLevel × «Мощные прожекторы» per level of each mast
  // (logic.js → lightRelief).
  function siteNightRelief(s) {
    return Math.min(1, s.nightRelief + (LIGHT.reliefPerLevel || 0) * s.v('lightPower') * LIGHT_MASTS * s.level('light'));
  }

  // Site coins a second of the sales office at the level bought (logic.js → salesRate, without the
  // office's own «Менеджеры» and «Шоу-рум»), with «Реклама».
  function salesRate(s) {
    const level = s.level('sales');
    return level > 0 ? (SALES.levelRate || 0) * level * (1 + (SALES.levelBonus || 0) * (level - 1)) * s.v('salesAds') * (s.office.sales || 1) : 0;
  }

  // Share of wall time a builder spends working, folding in smoke, sleep and meal breaks plus the
  // hunger slowdown before a meal. The needs are scales of points filling at a rate (logic.js →
  // hungerRate): 1 a second, slowed by upgrades and sped up by the weather (`environment` rates).
  // They fill through each other's breaks (logic.js → accrueNeeds): hunger stops only on the way to
  // a meal and at it, so meals come per wall time; the urge to smoke also stops on the way to a
  // meal or to sleep and in them, so smokes come per the rest of the time.
  // The camp buildings shorten the breaks of those who find a seat (see seatedShare).
  // Needs start empty on a fresh site (logic.js → createBuilder: hunger, smoke urge and fatigue 0), so
  // a short build never reaches the later part of their cycles. A need as a cycle of `calm` seconds
  // without effect and then `active` seconds with it: its effect over the first `span` seconds as a
  // share of the steady state — 0 before the first `calm`, around 1 over many cycles; no span — 1.
  function warmUp(span, calm, active) {
    if (!(span > 0) || !Number.isFinite(span) || !(active > 0) || !(calm >= 0)) return 1;
    const cycle = calm + active, whole = Math.floor(span / cycle), rest = span - whole * cycle;
    return (whole * active + Math.min(active, Math.max(0, rest - calm))) / span / (active / cycle);
  }

  // `span` — seconds since the session start the needs are averaged over (warmUp); none — steady state.
  function builderAvailability(s, walkSpeed, environment, span) {
    const detour = HEURISTIC.walkDetour;
    const env = environment || null;
    const crew = Math.max(1, s.builders);
    const campTrip = 2 * CAMP_CELLS * detour / walkSpeed;
    // Smoke: the lounge seats LOUNGE.seats a level + «Скамейки», its break LOUNGE.smokeScale as long.
    const smokeEvery = (WORK.smokePointsMin + WORK.smokePointsMax) / 2 * s.v('smokeRare') * s.smoke / (env ? env.smokeRate : 1);
    // «Дорожки на перекур» speed up only the walk there and back.
    const smokePath = s.v('smokePath');
    const smokeTrip = 2 * (WORK.smokeMinSquares + WORK.smokeMaxSquares) / 2 * detour / walkSpeed / smokePath;
    const smokeSeconds = WORK.smokeSeconds / (s.v('smokeShort') * s.smokeShort);
    const smokeOut = smokeTrip + smokeSeconds;
    const smokeIn = campTrip / smokePath + smokeSeconds * (LOUNGE.smokeScale || 1);
    const lounge = s.level('lounge');
    const smokers = seatedShare(lounge > 0 ? (LOUNGE.seats || 2) * lounge + s.v('loungeSeats') : 0, crew, smokeOut / (smokeEvery + smokeOut));
    const smokeBreak = smokers * smokeIn + (1 - smokers) * smokeOut;
    // The urge stops on the way there and at the smoke; the way back fills it again.
    const smokeGo = smokers * (campTrip / smokePath / 2 + smokeSeconds * (LOUNGE.smokeScale || 1)) + (1 - smokers) * (smokeTrip / 2 + smokeSeconds);
    // Sleep: the dorm beds DORM.beds a level + «Двухъярусные койки» near by with a shorter sleep
    // («Крепкий сон»); the rest go to the far trailers.
    // «Крепкий сон» of the office: fatigue fills slower.
    const fatigueRate = (env ? env.fatigueRate : 1) / (s.office.fatigue || 1);
    const far = sleepShare(walkSpeed, fatigueRate, 0);
    const dorm = s.level('dorm');
    const beds = dorm > 0 ? (DORM.beds || 3) * dorm + s.v('dormBeds') : 0;
    const near = beds > 0 ? sleepShare(walkSpeed, fatigueRate, (DORM.sleepScale || 1) / s.v('dormSleep')) : far;
    const sleepers = seatedShare(beds, crew, near.away);
    // Before the night opens nobody tires: no sleep and no fatigue slowdown (s.intro, introGates).
    const intro = s.intro || { smoke: true, hunger: true, night: true };
    // Tiredness starts at debuffFrom of the scale, sleep at the top (then the nap).
    const fatigueScale = (TUNING.sleep.fatiguePointsMin + TUNING.sleep.fatiguePointsMax) / 2 / fatigueRate;
    const sleepWarm = warmUp(span, fatigueScale * TUNING.sleep.debuffFrom,
      fatigueScale * (1 - TUNING.sleep.debuffFrom) + (TUNING.sleep.sleepMin + TUNING.sleep.sleepMax) / 2);
    const away = intro.night ? (sleepers * near.away + (1 - sleepers) * far.away) * sleepWarm : 0;
    const sleepDebuff = intro.night ? (sleepers * near.debuff + (1 - sleepers) * far.debuff) * sleepWarm : 0;
    // Hunger: no slowdown up to hungerDebuffFrom of the scale, then hungry up to the top (a meal).
    // In sleep it fills SLEEP.sleepHunger as fast: `fill` — its average speed outside meals.
    const hungerRate = (env ? env.hungerRate : 1) / s.hunger;
    const fill = 1 - away * (1 - (TUNING.sleep.sleepHunger === undefined ? 1 : TUNING.sleep.sleepHunger));
    const hungerPoints = (WORK.hungerPointsMin + WORK.hungerPointsMax) / 2;
    const grace = hungerPoints * WORK.hungerDebuffFrom / hungerRate;
    const hungry = hungerPoints * (1 - WORK.hungerDebuffFrom) / hungerRate;
    const mealTrip = 2 * (WORK.mealMinSquares + WORK.mealMaxSquares) / 2 * detour / walkSpeed + WORK.mealSeconds;
    const mealGo = (WORK.mealMinSquares + WORK.mealMaxSquares) / 2 * detour / walkSpeed + WORK.mealSeconds;
    const debuff = (WORK.hungerDebuffMin + WORK.hungerDebuffMax) / 2;
    // «Полевая кухня» = the site canteen: a seated worker eats there as soon as his hunger reaches
    // the debuff (no hungry stretch), CANTEEN.seats a level + meta «Места в столовой»; the dish is
    // not modelled; «Сытные порции» stretch the grace after a canteen meal. The others eat off the
    // site after the hungry stretch.
    const canteenBreak = s.canteenMeal + campTrip;
    const canteenGo = s.canteenMeal + campTrip / 2;
    const kitchen = s.level('kitchen');
    const fed = grace * s.v('portions');
    const eaters = kitchen > 0
      ? seatedShare((CANTEEN.seats || 2) * kitchen + s.canteenSeatBonus, crew, canteenBreak / (fed / fill + canteenGo))
      : 0;
    // Hunger warms up through the grace (no slowdown), then the hungry stretch and the meal.
    const hungerWarm = warmUp(span, grace / fill, eaters * canteenBreak + (1 - eaters) * (hungry / fill + mealTrip));
    const productivity = intro.hunger ? 1 - (1 - (eaters + (1 - eaters) * (grace + hungry * (1 - debuff)) / (grace + hungry))) * hungerWarm : 1;
    // Share of wall time away for meals: a meal's break per its cycle (the scale plus the part
    // of the break that does not fill it).
    const mealShare = !intro.hunger ? 0
      : (eaters * canteenBreak / (fed / fill + canteenGo) + (1 - eaters) * mealTrip / ((grace + hungry) / fill + mealGo)) * hungerWarm;
    // Smokes come in the time outside meals and sleep, a break per its cycle; the first after a whole urge.
    const smokeShare = intro.smoke ? Math.max(0, 1 - away - mealShare) * smokeBreak / (smokeEvery + smokeGo) * warmUp(span, smokeEvery, smokeBreak) : 0;
    return productivity * (1 - sleepDebuff) * Math.max(0, 1 - away - mealShare - smokeShare);
  }

  function coinsPerCube(s, weight, y) {
    const lucky = 1 + s.v('triplePay') * (s.v('triplePower') - 1);
    return Math.pow(weight, WORK.coinMassExponent) * WORK.coinRewardScale * s.coin * s.v('cubePay') * s.v('payMultiplier') *
      (1 + y * s.v('floorPay')) * lucky;
  }

  // ---------- environment ----------

  // Day, night and weather of a site (balance.json → tuning.environment; meta.js → environment and
  // the game's sky read these too): the site clock, the night work/move multipliers, the weather
  // forecast of each level and the weather kinds. Weather phases of 3 minutes in a cycle of four; a
  // season a chapter (winter snow, spring rain, summer heat and thunderstorms, autumn rain), see forecast.
  const ENVIRONMENT = TUNING.environment;

  // The site clock. A site starts at startHour (8:00 — the work day begins), one game hour lasts
  // hourSeconds of simulation (a minute). Night runs from nightFromHour to nightToHour across
  // midnight (20:00–6:00); dawn takes dawnHours after it, sunset and twilight duskHours before it.
  // Sites with long northern nights later just get other hours.
  function wrapHours(hours) {
    return ((hours % 24) + 24) % 24;
  }

  function cycleSeconds() {
    return 24 * ENVIRONMENT.hourSeconds;
  }

  // Seconds from the site start to its first nightfall and to the first morning (end of the night).
  function nightfallOffset() {
    return wrapHours(ENVIRONMENT.nightFromHour - ENVIRONMENT.startHour) * ENVIRONMENT.hourSeconds;
  }

  function morningOffset() {
    return wrapHours(ENVIRONMENT.nightToHour - ENVIRONMENT.startHour) * ENVIRONMENT.hourSeconds;
  }

  // dayClock(seconds of the site) → { hour (0…24, fractional), day, phase ('night' / 'dawn' /
  // 'day' / 'dusk'), progress (0…1 through the phase), night, nightIndex (the same number all
  // night long), sinceNightfall and untilChange (seconds of simulation) }.
  function dayClock(seconds) {
    const env = ENVIRONMENT;
    const hours = env.startHour + seconds / env.hourSeconds;
    const hour = wrapHours(hours);
    const nightHours = wrapHours(env.nightToHour - env.nightFromHour);
    const sinceNight = wrapHours(hour - env.nightFromHour);
    const sinceMorning = wrapHours(hour - env.nightToHour);
    const dayHours = 24 - nightHours;
    let phase = 'day';
    let progress = 0;
    let left = 0;
    if (sinceNight < nightHours) {
      phase = 'night';
      progress = sinceNight / nightHours;
      left = nightHours - sinceNight;
    } else if (sinceMorning < env.dawnHours) {
      phase = 'dawn';
      progress = sinceMorning / env.dawnHours;
      left = env.dawnHours - sinceMorning;
    } else if (dayHours - sinceMorning <= env.duskHours) {
      phase = 'dusk';
      progress = 1 - (dayHours - sinceMorning) / env.duskHours;
      left = dayHours - sinceMorning;
    } else {
      const span = Math.max(1e-6, dayHours - env.dawnHours - env.duskHours);
      progress = (sinceMorning - env.dawnHours) / span;
      left = span - (sinceMorning - env.dawnHours);
    }
    return {
      hour: hour,
      day: Math.floor(hours / 24),
      phase: phase,
      progress: progress,
      night: phase === 'night',
      nightIndex: Math.floor((hours - env.nightFromHour) / 24),
      sinceNightfall: sinceNight * env.hourSeconds,
      untilChange: left * env.hourSeconds,
    };
  }

  // The weather forecast of a story level (balance.json → tuning.environment.seasons): a season for
  // each chapter of ten levels, its `levels` one code a level — a letter per weather phase of the
  // cycle of four ('.' clear, s snow, r rain, h heat, t storm). Chapters past the last season go
  // round the seasons again from `repeatFrom`. Not a story site (index −1: HQ builds, orders) — clear.
  const WEATHER_CODES = { '.': '', s: 'snow', r: 'rain', h: 'heat', t: 'storm' };
  const CLEAR = ['', '', '', ''];

  function seasonOf(levelIndex) {
    const seasons = ENVIRONMENT.seasons || [];
    if (!(levelIndex >= 0) || !seasons.length) return null;
    const chapter = Math.floor(levelIndex / 10);
    if (chapter < seasons.length) return seasons[chapter];
    const from = Math.max(0, Math.min(seasons.length - 1, ENVIRONMENT.repeatFrom || 0));
    return seasons[from + (chapter - seasons.length) % (seasons.length - from)];
  }

  function forecast(levelIndex) {
    const season = seasonOf(levelIndex);
    if (!season || !season.levels || !season.levels.length) return CLEAR;
    const code = season.levels[Math.min(season.levels.length - 1, levelIndex % 10)] || '';
    const out = [];
    for (let i = 0; i < 4; i++) out.push(WEATHER_CODES[code[i]] || '');
    return out;
  }

  // The weather at a moment of the site: '' (clear) or a key of ENVIRONMENT.kinds.
  function weatherAt(levelIndex, seconds) {
    const phase = ((Math.floor(seconds / ENVIRONMENT.weatherPhaseSeconds) % 4) + 4) % 4;
    return forecast(levelIndex)[phase];
  }

  // The averaged fields: multipliers, the extra floor penalty and lightning added (add); worse is
  // lower, except the floor penalty, lightning and the need rates (high).
  const ENVIRONMENT_FIELDS = [
    { key: 'work' }, { key: 'move' }, { key: 'walk' }, { key: 'deck' }, { key: 'carry' },
    { key: 'floorStep', add: true, high: true }, { key: 'lightning', add: true, high: true },
    { key: 'hungerRate', high: true }, { key: 'smokeRate', high: true }, { key: 'fatigueRate', high: true },
  ];

  // What the night and the weather do to the crew now. Each weather hits its own thing (kinds in
  // balance.json): work — setting (night, heat, rain: the mortar won't set); move — walking and
  // climbing (night, heat); walk — horizontal walking only (snow); deck — walking on the building on
  // top of the base deck slowdown and floorStep — its extra per-floor penalty (snow: ice; see
  // deckFactor); carry — the carry limit (rain: wet material); lightning — strikes in the top of the
  // building (storm, see the game's lightning), as a rate; hungerRate, smokeRate, fatigueRate — how
  // fast the needs fill (snow: hunger from the cold; logic.js → hungerRate). noNight: a level before
  // the night opens (introGates) — the weather goes on, the night never comes.
  function environmentAt(levelIndex, seconds, relief, noNight) {
    const night = !noNight && dayClock(seconds).night;
    const phase = ((Math.floor(seconds / ENVIRONMENT.weatherPhaseSeconds) % 4) + 4) % 4;
    const value = {
      night: night,
      phase: phase,
      weather: weatherAt(levelIndex, seconds),
      work: night ? ENVIRONMENT.nightWork + (1 - ENVIRONMENT.nightWork) * relief : 1,
      move: night ? ENVIRONMENT.nightMove + (1 - ENVIRONMENT.nightMove) * relief : 1,
      walk: 1,
      deck: 1,
      floorStep: 0,
      carry: 1,
      lightning: 0,
      hungerRate: 1,
      smokeRate: 1,
      fatigueRate: 1,
    };
    if (value.weather) {
      const kind = ENVIRONMENT.kinds[value.weather];
      ENVIRONMENT_FIELDS.forEach(function (field) {
        if (kind[field.key] === undefined) return;
        if (field.add) value[field.key] += kind[field.key];
        else value[field.key] *= kind[field.key];
      });
    }
    return value;
  }

  // Scaffold types by height (tuning.scaffold: every tierFloors floors, `tiers` types): each takes
  // tierTime times longer to set than the one below. The same as logic.js → tierTimeFactor. Wear and
  // repairs of the pieces are not modelled here.
  function scaffoldTierTime(y) {
    const spec = TUNING.scaffold;
    const tier = Math.min(spec.tiers || 1, Math.floor(Math.max(0, y) / (spec.tierFloors || Infinity)) + 1);
    return Math.pow(spec.tierTime || 1, tier - 1);
  }

  // Soft speed cap of walking and climbing (tuning.builders: walkSoftCap, climbSoftCap, softCapPower):
  // in full up to the threshold T, above it T · (v / T)^power. The same as logic.js → softCap.
  function softCap(value, threshold) {
    if (!(threshold > 0) || !(value > threshold)) return value;
    return threshold * Math.pow(value / threshold, WORK.softCapPower || 0.5);
  }

  // Walking speed on the building at level y (y ≥ 1: on cubes and decks) as a share of the speed on
  // the ground: deckWalk (×0,8) and minus deckFloorStep (4 %) a floor, compounded — the higher, the
  // more careful. Snow: its deck share on top and floorStep added to the step.
  function deckFactor(y, deck, floorStep) {
    if (y <= 0) return 1;
    return WORK.deckWalk * (deck === undefined ? 1 : deck) * Math.pow(1 - WORK.deckFloorStep - (floorStep || 0), y);
  }

  // Integrate at actual day/weather boundaries, over their common period. Keep the running
  // worst of the prefix average: a shorter construction never gets a worse environment.
  // The signature invalidates tables after live editor changes, including chapter thresholds.
  const environmentCache = new Map();
  function environmentAverage(levelIndex, seconds, relief, noNight) {
    const key = forecast(levelIndex).join(',') + '|' + relief + '|' + (noNight ? 'day' : '') + '|' + JSON.stringify(ENVIRONMENT);
    let table = environmentCache.get(key);
    if (!table) {
      function gcd(a, b) { while (b) { const next = a % b; a = b; b = next; } return a; }
      const day = cycleSeconds();
      const weather = ENVIRONMENT.weatherPhaseSeconds;
      const period = day / gcd(day, weather * 4) * weather * 4;
      const cuts = new Set([0, period]);
      for (let t = 0; t < period; t += day) {
        cuts.add(t);
        [nightfallOffset(), morningOffset()].forEach(function (offset) {
          if (offset > 0 && offset < day) cuts.add(t + offset);
        });
      }
      for (let t = weather; t < period; t += weather) cuts.add(t);
      const times = Array.from(cuts).sort(function (a, b) { return a - b; });
      table = { period: period, times: times, sum: {}, worst: {}, rates: [] };
      ENVIRONMENT_FIELDS.forEach(function (field) {
        table.sum[field.key] = [0];
        table.worst[field.key] = [field.add ? 0 : 1];
      });
      for (let i = 0; i < times.length - 1; i++) {
        const value = environmentAt(levelIndex, (times[i] + times[i + 1]) / 2, relief, noNight);
        const duration = times[i + 1] - times[i];
        table.rates.push(value);
        ENVIRONMENT_FIELDS.forEach(function (field) {
          const sum = table.sum[field.key];
          const worst = table.worst[field.key];
          sum.push(sum[i] + value[field.key] * duration);
          const average = sum[i + 1] / times[i + 1];
          worst.push(field.high ? Math.max(worst[i], average) : Math.min(worst[i], average));
        });
      }
      if (environmentCache.size >= 64) environmentCache.clear();
      environmentCache.set(key, table);
    }
    const span = Math.min(table.period, Math.max(10, Math.round(seconds / 10) * 10));
    let low = 0, high = table.times.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (table.times[mid] <= span) low = mid; else high = mid - 1;
    }
    const rate = table.rates[low] || null;
    const tail = span - table.times[low];
    const result = {};
    ENVIRONMENT_FIELDS.forEach(function (field) {
      const average = (table.sum[field.key][low] + (rate ? rate[field.key] : 0) * tail) / span;
      const worst = table.worst[field.key][low];
      result[field.key] = field.high ? Math.max(worst, average) : Math.min(worst, average);
    });
    return result;
  }

  // Seconds of deck walking up to floor y, in seconds of flat walking: floorWalk cells a floor,
  // each floor k at its deck speed (deckFactor) — Σ 1 / factor(k), summed in closed form.
  function deckCells(y, environment) {
    if (y <= 0) return 0;
    const deck = WORK.deckWalk * (environment ? environment.deck : 1);
    const r = 1 - WORK.deckFloorStep - (environment ? environment.floorStep : 0);
    const sum = Math.abs(1 - r) < 1e-9 ? y : (Math.pow(r, -y) - 1) / (1 - r);
    return HEURISTIC.floorWalk * sum / deck;
  }

  // Builders: seconds of crew work per cube, mass, coins and capital over the whole building.
  // `environment` (optional, environmentAt / environmentAverage fields): night and weather — work
  // scales setting, move walking and climbing, walk the flat walking, deck and floorStep walking on
  // the building (deckCells), carry the carry limit.
  function builderPass(summary, s, environment) {
    const env = environment || null;
    const work = env ? env.work : 1;
    const move = env ? env.move : 1;
    const pace = summary.pace;
    const detour = HEURISTIC.walkDetour;
    // Average rank speeds up worker actions and walking, but not elevator travel or machines.
    const efficiency = s.timeEfficiency;
    // Upgrade × meta under the soft cap (softCap), then the weather, the rank and the pace.
    const walk = softCap(s.v('horizontal') * s.movement, WORK.walkSoftCap) * move * (env ? env.walk : 1) * efficiency / pace;
    const climb = softCap(s.v('vertical') * s.movement, WORK.climbSoftCap) * move * efficiency / pace;
    const build = s.v('speed') * s.placeSpeed * work * efficiency / pace;
    const capacity = (s.v('carry') * s.carryScale + s.carry) * (env ? env.carry : 1);
    const lighter = s.v('lightCarry');
    const planLimit = Math.max(1, Math.floor(s.v('plan') + s.plan));
    const pickup = s.v('pickup') * s.pickupSpeed * efficiency / pace;
    const scaffoldSeconds = TUNING.scaffold.erectSeconds * pace / (s.v('scaffold') * s.scaffold * efficiency);
    const elevatorCount = Math.min(s.v('elevators'), summary.groups.length ? summary.groups[0].padDist.length : 0);
    const elevatorTop = s.v('elevatorHeight');
    const perFloor = s.v('elevatorSpeed');
    // One desk visit per plan; how many mini-cubes a plan holds depends on the material (see below).
    const planVisit = 2 * summary.homeDist * detour / walk + WORK.planSeconds / efficiency;
    const result = { mass: 0, cubes: 0, coins: 0, capital: 0, experience: 0, seconds: 0, walk: walk };
    const golden = s.golden ? (s.golden.factor || 3) / Math.max(1, Math.round(s.golden.value)) : 0;
    const capitalPerCube = s.capitalValue * (s.capitalChance + golden) * (1 + s.findCritical);

    // Workers carry and set mini-cubes (grid³ per cube, each one cell of mass). A plan is one desk
    // visit of up to planLimit mini-cubes: whole cubes while the count allows, a big cube spans
    // several plans. No heavier than the carry, except a share of one cube heavier than the carry,
    // which goes in parts (ceil(share / per trip) trips); a single mini-cube heavier than the carry
    // goes alone, overloaded.
    for (let i = 0; i < summary.groups.length; i++) {
      const g = summary.groups[i];
      const carried = g.part / lighter;
      const cubeWeight = carried * g.parts;
      const byWeight = carried > capacity ? 1 : Math.floor(capacity / carried);
      let perTrip;
      let tripsPerCube;
      let plansPerCube;
      if (planLimit <= byWeight) {
        // The plan is the limit: planLimit mini-cubes a trip.
        perTrip = planLimit;
        tripsPerCube = g.parts / planLimit;
        plansPerCube = tripsPerCube;
      } else if (cubeWeight <= capacity) {
        // The carry is the limit: whole cubes while they fit.
        perTrip = Math.floor(byWeight / g.parts) * g.parts;
        tripsPerCube = g.parts / perTrip;
        plansPerCube = tripsPerCube;
      } else {
        // A cube heavier than the carry: plans of up to planLimit of its mini-cubes, in parts.
        const share = Math.min(planLimit, g.parts);
        perTrip = byWeight;
        plansPerCube = g.parts / share;
        tripsPerCube = plansPerCube * Math.ceil(share / byWeight);
      }
      const planOverhead = planVisit * plansPerCube;
      const overload = 1 + (Math.max(1, carried * perTrip / capacity) - 1) * s.overload;
      const flat = (g.mineDist + deckCells(g.y, env)) * detour / walk;
      const ladder = g.y / climb;
      let up = ladder * overload;
      let down = ladder;
      if (elevatorCount > 0 && g.y <= elevatorTop) {
        const toPad = g.padDist[elevatorCount - 1] / walk;
        up = Math.min(up, toPad * overload + g.y * perFloor);
        down = Math.min(down, toPad + g.y * perFloor);
      }
      const place = g.part / build * (1 + g.y * WORK.heightStep * s.heightPenalty);
      const scaffold = g.y > 0 ? HEURISTIC.scaffoldPiecesPerCube * scaffoldSeconds * scaffoldTierTime(g.y) : 0;
      const mine = g.part / pickup;
      const walks = flat + flat * overload + up + down + HEURISTIC.tripLatency / efficiency;
      result.seconds += g.cubes * (tripsPerCube * walks + g.parts * (mine + place) + scaffold + HEURISTIC.cubeLatency / efficiency + planOverhead);
      const pay = coinsPerCube(s, g.weight, g.y);
      result.mass += g.cubes * g.weight;
      result.cubes += g.cubes;
      // Base XP is cbrt(full mass) per whole cube, independent of grid subdivisions and construction method.
      result.experience += g.cubes * Math.cbrt(g.weight);
      result.coins += g.cubes * pay;
      result.capital += g.cubes * capitalPerCube;
    }
    return result;
  }

  // Level seconds for a builder pass plus machines (`environment`: the need rates, see builderAvailability).
  function levelSeconds(summary, s, pass, machines, environment, span) {
    const availability = builderAvailability(s, pass.walk, environment, span);
    // Only cubes whose support is already built can be set, so a crew larger than the open
    // frontier of a floor adds less and less.
    const frontier = Math.max(1, HEURISTIC.frontierShare * pass.cubes / summary.floors);
    const crew = Math.pow(s.builders, HEURISTIC.crewPower) * frontier / (s.builders + frontier);
    const builderMassRate = crew * availability * HEURISTIC.crewEfficiency * pass.mass / pass.seconds;
    const pool = Math.min(pass.mass, machines.poolMass);
    // Machines only take the cubes they can reach; builders finish the rest.
    const seconds = Math.max(
      pass.mass / (builderMassRate + machines.massRate),
      (pass.mass - pool) / builderMassRate
    );
    return { seconds: seconds, availability: availability, builderMassRate: builderMassRate, pool: pool };
  }

  // Storm lightning (the game's lightning): every strikeSeconds of storm it knocks about simCubes
  // cubes out of the top — only floors from minFloor up, so only for the share of the build spent
  // up there (≈ the share of cubes up there) — and the crew sets them again. Returns the share of the
  // crew's placing that goes into that rebuilding, at `secondsPerCube` of the whole site.
  function lightningLoss(summary, lightning, secondsPerCube) {
    const spec = ENVIRONMENT.lightning;
    if (!spec || !(lightning > 0)) return 0;
    let tall = 0;
    let cubes = 0;
    for (let i = 0; i < summary.groups.length; i++) {
      const g = summary.groups[i];
      cubes += g.cubes;
      if (g.y + 1 >= spec.minFloor) tall += g.cubes;
    }
    if (tall === 0) return 0;
    return Math.min(0.8, lightning * tall / cubes * spec.simCubes / spec.strikeSeconds * secondsPerCube);
  }

  // Needs and the night by the story level (tuning.intro, the same as logic.js → needOpen): no smoking
  // before smokeFromLevel, no hunger before hungerFromLevel, no night and sleep before nightFromLevel.
  // levelNumber: stats.storyLevel (a live campaign), else the story level of the summary; an HQ
  // building or the reference tower without one has everything open.
  function introGates(levelNumber) {
    const intro = TUNING.intro || {};
    const open = function (from) { return !(from > levelNumber); };
    return { smoke: open(intro.smokeFromLevel), hunger: open(intro.hungerFromLevel), night: open(intro.nightFromLevel) };
  }

  function estimate(summary, stats) {
    const s = readStats(stats);
    s.intro = introGates(stats.storyLevel > 0 ? stats.storyLevel
      : summary.levelIndex >= 0 ? summary.levelIndex + 1 : Infinity);
    let pass = builderPass(summary, s, null);
    if (pass.cubes === 0) {
      return { coinsPerMinute: 0, massPerMinute: 0, capitalPerMinute: 0, effectiveCoinsPerMinute: 0, cubesPerMinute: 0, experiencePerMinute: 0,
        trainingPerMinute: 0, builderShare: 0 };
    }
    const machines = machineRate(summary, s);
    let level = levelSeconds(summary, s, pass, machines);
    // Night and weather, averaged over the time this building takes (stats.environment === false
    // turns them off, e.g. to compare with headless runs that skip the environment;
    // stats.environmentSeconds averages over a given span instead, e.g. the session time so far).
    // Lightning makes the building take longer (cubes set twice), but every setting still pays:
    // coins, experience and capital keep their rate, mass and cubes of progress lose `loss`.
    // The needs warm up from the session start over the same span (builderAvailability → warmUp): the
    // steady-state time of a short building is too long a span, so it is taken once more over the
    // building's own new time.
    let loss = 0, environment = null, span = stats.environmentSeconds || level.seconds;
    for (let round = 0; round < 2; round++) {
      if (stats.environment !== false) {
        environment = environmentAverage(summary.levelIndex === undefined ? -1 : summary.levelIndex, span, siteNightRelief(s),
          !s.intro.night);
        pass = builderPass(summary, s, environment);
      }
      level = levelSeconds(summary, s, pass, machines, environment, span);
      if (stats.environmentSeconds || !(level.seconds < span * 0.95)) break;
      span = level.seconds;
    }
    if (environment) loss = lightningLoss(summary, environment.lightning, level.seconds / pass.cubes);
    const perMinute = 60 / level.seconds;
    const seconds = level.seconds / (1 - loss);
    const freeBuy = Math.min(0.95, s.v('freeBuy'));
    const sales = salesRate(s) * 60;
    return {
      coinsPerMinute: pass.coins * perMinute + sales,
      massPerMinute: pass.mass * perMinute * (1 - loss),
      cubesPerMinute: pass.cubes * perMinute * (1 - loss),
      experiencePerMinute: pass.experience * perMinute,
      // The training centre's experience: 1 a whole cube the workers set — not the mini-cubes, not the
      // drones' and machines' cubes (game.js → consumeEvents, logic.js → gainWorkerXp). builderShare —
      // the workers' share of the mass, offline too (game.js → catchUpWorld). Like coins, a cube the
      // lightning knocked out pays again when it is set again.
      builderShare: Math.min(1, level.builderMassRate * level.seconds / pass.mass),
      trainingPerMinute: pass.cubes * perMinute * Math.min(1, level.builderMassRate * level.seconds / pass.mass),
      capitalPerMinute: pass.capital * perMinute,
      // Free purchases stretch the budget: coins worth of upgrades bought per minute.
      effectiveCoinsPerMinute: (pass.coins * perMinute + sales) / (1 - freeBuy),
      levelSeconds: seconds,
      lightningLoss: loss,
      builders: {
        count: s.builders,
        availability: level.availability,
        secondsPerCube: pass.seconds / pass.cubes,
        massPerMinute: level.builderMassRate * 60,
      },
      machines: {
        massPerMinute: machines.massRate * 60,
        poolMass: level.pool,
      },
    };
  }

  // Share of machine-placeable mass a loader's boom can reach (height and radius upgrades).
  function loaderReachShare(summary, s) {
    const reach = s.v('vehicleReach');
    const height = s.v('vehicleHeight');
    let reachable = 0;
    let total = 0;
    for (let i = 0; i < summary.groups.length; i++) {
      const g = summary.groups[i];
      total += g.machineCubes * g.weight;
      if (g.y + 1 > height) continue;
      let cubes = 0;
      for (let d = 0; d < g.edgeHist.length && d + 1 <= reach; d++) cubes += g.edgeHist[d];
      reachable += cubes * g.weight;
    }
    return total > 0 ? reachable / total : 0;
  }

  // Construction drones assemble patterns for loaders and helicopters; whatever drone time the
  // machines leave unused goes into slow direct building (fly a cube to the site and set it).
  // A drone-second spent on patterns always yields at least as much as one spent building directly,
  // so buying machines never lowers the estimate.
  function machineRate(summary, s) {
    const drones = s.v('engineers');
    const loaders = s.loaders;
    const helis = s.v('helicopters');
    const none = { massRate: 0, poolMass: 0 };
    if (drones < 1 || summary.machineWeight <= 0) return none;
    const pace = summary.pace;
    const weight = summary.machineWeight;
    const flySpeed = s.v('droneSpeed') * s.machineSpeed / pace;
    const gather = weight / (s.v('gather') * s.pickupSpeed * s.droneGather) * pace + 0.6;
    const climb = 2 * 3.4 / Math.max(1.2, flySpeed * 0.7);
    const patternCube = 2 * summary.droneDist / flySpeed + gather + 0.55 + climb + HEURISTIC.droneOverhead;
    const directCube = Math.max(
      patternCube,
      2 * (summary.droneDist + summary.yardSiteDist) / flySpeed + gather +
        weight / (s.v('droneBuild') * s.placeSpeed * s.dronePlace) * pace +
        2 * (summary.maxY + 2.2) / Math.max(1.2, flySpeed * 0.7) + HEURISTIC.droneOverhead
    );
    const assemblePerCube = patternCube / drones;
    const route = summary.yardHomeDist + summary.yardSiteDist + summary.homeDist;

    let patternRate = 0;
    if (loaders >= 1) {
      const size = Math.max(1, Math.min(
        Math.floor(s.v('loaderMass') / weight),
        Math.floor(s.v('bucket') * s.v('bucket') * s.v('patternHeight') * HEURISTIC.patternFill)
      ));
      const cycle = route * HEURISTIC.walkDetour / (s.v('loaderSpeed') * s.machineSpeed) * pace +
        3 * HEURISTIC.driveOverhead +
        (HEURISTIC.craneCells + summary.maxY * 0.5) * s.v('boomSpeed') * pace +
        HEURISTIC.craneFixedSeconds +
        MACHINE.cooldownSeconds;
      patternRate += loaders * size / (cycle + size * assemblePerCube) * loaderReachShare(summary, s);
    }
    if (helis >= 1) {
      const size = Math.max(1, Math.min(
        Math.floor(s.v('heliMass') / weight),
        Math.floor(s.v('heliWidth') * s.v('heliWidth') * s.v('heliHeight') * HEURISTIC.patternFill)
      ));
      const cycle = route / (s.v('heliSpeed') * s.machineSpeed) * pace +
        3 * HEURISTIC.driveOverhead +
        HEURISTIC.heliHookTravel / MACHINE.hookSpeed +
        summary.maxY / MACHINE.heliClimbSpeed +
        MACHINE.lowerSeconds + MACHINE.cooldownSeconds;
      patternRate += helis * size / (cycle + size * assemblePerCube);
    }
    // Patterns have priority; one drone stays available while idle surplus drones build.
    // Try every useful split of drone time so buying another machine cannot lower output.
    const machines = (loaders >= 1 ? loaders : 0) + (helis >= 1 ? helis : 0);
    let cubeRate = drones / directCube;
    for (let reserve = 1; machines > 0 && reserve <= drones; reserve++) {
      const rate = Math.min(patternRate, reserve / patternCube) + (drones - reserve) / directCube;
      if (rate > cubeRate) cubeRate = rate;
    }

    // Drones can set any regular cube, so with drones the whole non-feature mass is open to machines.
    let poolMass = 0;
    for (let i = 0; i < summary.groups.length; i++) poolMass += summary.groups[i].machineCubes * summary.groups[i].weight;
    return { massRate: cubeRate * weight * HEURISTIC.machineEfficiency, poolMass: poolMass };
  }

  // Dev check: buying one more level of any upgrade must not lower coins per minute.
  function checkMonotonic(summary, stats) {
    const base = estimate(summary, stats).coinsPerMinute;
    const failures = [];
    Object.keys(SESSION).forEach(function (kind) {
      const level = stats.purchases[kind] || 0;
      if (level >= SESSION[kind].max) return;
      const purchases = Object.assign({}, stats.purchases);
      purchases[kind] = level + 1;
      const next = Object.assign({}, stats, { purchases: purchases });
      if (kind === 'builders' && stats.builderCount !== undefined) {
        next.builderCount = stats.builderCount + sessionValue('builders', level + 1) - sessionValue('builders', level);
      }
      if (kind === 'vehicles' && stats.vehicleCount !== undefined) {
        next.vehicleCount = stats.vehicleCount + sessionValue('vehicles', level + 1) - sessionValue('vehicles', level);
      }
      const value = estimate(summary, next).coinsPerMinute;
      if (value < base - 1e-9) failures.push({ kind: kind, from: base, to: value });
    });
    return failures;
  }

  root.MicroBuildersSim = {
    HEURISTIC: HEURISTIC,
    ENVIRONMENT: ENVIRONMENT,
    environmentAt: environmentAt,
    weatherAt: weatherAt,
    forecast: forecast,
    seasonOf: seasonOf,
    dayClock: dayClock,
    cycleSeconds: cycleSeconds,
    environmentAverage: environmentAverage,
    sessionValue: sessionValue,
    summarizeLevel: summarizeLevel,
    estimate: estimate,
    introGates: introGates,
    checkMonotonic: checkMonotonic,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
