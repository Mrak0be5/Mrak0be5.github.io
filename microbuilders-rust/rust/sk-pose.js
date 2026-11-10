// Позы под ношу (без three.js — числа и точки; применяет people.js → animateWorker, план встраивания — журнал
// tools/runs/rust/progress-sk-1.md). Слой поверх ходьбы и стойки: наклон корпуса под вес, руки — на ручках тачки,
// на древке козы, на ноше на плече, на дужках вёдер, на раме со стеклом; мах рук — меньше (руки заняты), шаг — короче
// под вес. Погрузка и выкладка — цикл «взять в A — положить в B» (точки даёт sk-crew.js): присед к нижней точке,
// хват, подъём, отпустить.
//
// walkPose(kind, sk, out) — ходьба и стойка с ношей: lean (наклон вперёд, рад), side (наклон вбок от плеча с ношей,
//   рад), swingL / swingR (мах руки 0..1: 0 — рука держит ношу), stride (длина шага ×), bob (качка ноши вверх-вниз,
//   м на шаг), sway (качание длинной ноши по шагу, рад), spread — руки от бёдер в стороны (рад; вёдра не задевают
//   ноги), handL / handR — куда кисти: 'grip' (точка хвата sk.gripL/R),
//   'free' (машет), gripL / gripR — сила хвата пальцев, styleL / styleR — 'fist' | 'flat';
// cycle(c, out) — цикл «взять — положить»: reach (0 — у A, 1 — у B), holding (несёт штуку), crouch (0..1 — присед
//   к нижней точке), grip (сила хвата);
// crouchFor(dy) — присед к точке на dy м выше стоп (0 — выпрямлен, 1 — присед на корточки).

// Под вес: тяжёлая ноша — наклон и короче шаг; лёгкая — почти как без неё. fill — заполнение ноши (MB.carryLoad),
// over — перегруз (замедление логики).
function weight(sk) { return Math.min(1.4, Math.max(0, (sk.fill || 0) * 0.8 + Math.max(0, (sk.over || 1) - 1) * 0.6)); }

export function walkPose(kind, sk, out) {
  out = out || {};
  const W = weight(sk);
  out.lean = 0; out.side = 0; out.swingL = 1; out.swingR = 1; out.stride = 1; out.bob = 0; out.sway = 0; out.spread = 0;
  out.handL = 'free'; out.handR = 'free'; out.gripL = 0.25; out.gripR = 0.25; out.styleL = 'fist'; out.styleR = 'fist';
  if (!kind || sk.mode === 'stow') return out;
  const empty = sk.mode === 'empty';
  switch (kind) {
    case 'barrow':
      // катит: руки почти прямые на ручках, корпус вперёд под вес, шаг короче; пустую — легко; тачка стоит
      // (у места работы, у подножия лестницы) — руки свободны
      if (!sk.push) break;
      out.lean = 0.12 + 0.16 * W; out.swingL = out.swingR = 0; out.stride = 1 - 0.18 * W;
      out.handL = out.handR = sk.push ? 'grip' : 'free'; out.gripL = out.gripR = sk.push ? 1 : 0.25;
      break;
    case 'hod':
      // коза на правом плече: правая на древке, корпус чуть влево (противовес), левая машет меньше
      out.lean = 0.05 + 0.08 * W; out.side = empty ? 0.02 : 0.06 + 0.05 * W; out.swingR = 0; out.swingL = 0.6;
      out.handR = 'grip'; out.gripR = 1; out.stride = 1 - 0.08 * W; out.bob = 0.012;
      break;
    case 'beam':
    case 'sheet':
      // на правом плече: правая придерживает спереди, длинная ноша качается в такт шагу
      out.lean = 0.04 + 0.08 * W; out.side = 0.05 + 0.05 * W; out.swingR = 0; out.swingL = 0.7;
      out.handR = 'grip'; out.gripR = 1; out.stride = 1 - 0.08 * W; out.bob = 0.018; out.sway = kind === 'beam' ? 0.045 : 0.03;
      break;
    case 'buckets':
      // два ведра: руки вниз и в стороны (вёдра — мимо бёдер и коленей), плечи опущены, мах малый (вёдра качаются сами)
      out.lean = 0.03 + 0.04 * W; out.swingL = out.swingR = 0.15; out.handL = out.handR = 'grip'; out.gripL = out.gripR = 1; out.stride = 1 - 0.1 * W;
      out.spread = empty ? 0.16 : 0.24;
      break;
    case 'stretcher':
      // рама на ремне справа: правая держит переднюю стойку у бедра, корпус — влево
      out.lean = 0.04; out.side = empty ? 0.02 : 0.06 + 0.04 * W; out.swingR = 0; out.swingL = 0.7; out.handR = 'grip'; out.gripR = 1;
      break;
    case 'crate':
      out.lean = -0.04 - 0.04 * W; out.swingL = out.swingR = 0; out.handL = out.handR = 'grip'; out.gripL = out.gripR = 0.9; out.styleL = out.styleR = 'flat';
      break;
    case 'back':
      // рама за спиной: кисти на лямках (как прежде — people.js straps)
      out.lean = 0.08 * W; out.swingL = out.swingR = 0.35;
      break;
  }
  // за спиной (лестница, уступ): руки свободны — для перекладин и края уступа
  if (sk.sling) { out.handL = out.handR = 'free'; out.swingL = out.swingR = 1; out.side = 0; }
  return out;
}

// Цикл «взять в A — положить в B»: 0–0,32 тянется к A (присед), 0,32–0,42 хват, 0,42–0,82 несёт к B, 0,82–0,9
// отпускает, 0,9–1 — назад к A.
function ss(x, a, b) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
export function cycle(c, out) {
  out = out || {};
  out.reach = ss(c, 0.42, 0.82) * (1 - ss(c, 0.9, 1));
  out.holding = c > 0.36 && c < 0.86;
  out.crouch = 1 - ss(c, 0.42, 0.7) * (1 - ss(c, 0.9, 1));
  out.grip = out.holding ? 1 : 0.3;
  return out;
}
// Присед к точке на dy м выше стоп: по колено и ниже — на корточки, по пояс — наклон, у груди — прямо.
export function crouchFor(dy) { return 1 - ss(dy, 0.25, 1.05); }

// Положение носилки на теле (оси груди ведущего скелета, м и рад; people.js → w.armRest.R.sh — правое плечо):
// где опора (shoulder — от плеча), повороты (Euler YXZ) и за спиной (sling). Подбирается стендом rv-sk-stand.mjs.
export const MOUNT = {
  // коза: древко вниз-вперёд к правой (30° от отвеса), лоток (отогнут на HOD_BEND, sk-props.js) лежит на плече и
  // уходит назад; за спиной (лестница, уступ, кладка с поднятого настила — руки нужны) — древко наискось вдоль спины к
  // левому бедру, лоток над правой лопаткой
  hod: { at: [0.005, 0.05, -0.02], rot: [-Math.PI / 6, 0, 0], sling: { at: [0.1, 0.02, -0.19], rot: [0.16, 0, 0.42] } },
  // брус: вдоль хода над плечом (первый столбик — у шеи), чуть задран нос; за спиной — наискось
  beam: { at: [0.015, 0.08, 0], rot: [-0.06, 0, 0.05], sling: { at: [0.18, 0.05, -0.16], rot: [-1.2, 0, 0.55] } },
  // лист: на ребре у правого бока снаружи руки, верхняя кромка — на плече, низ чуть от ноги; за спиной — плашмя
  // по спине, длинной стороной вверх
  sheet: { at: [-0.16, 0.07, 0], rot: [0, 0, Math.PI / 2 - 0.22], sling: { at: [0.495, -0.15, -0.2], rot: [-Math.PI / 2, 0, 0] } },
  // рама со стеклом: у правого бедра снаружи (полка — мимо ноги), плоскость — вдоль хода; хват — верх передней стойки
  stretcher: { at: [-0.1, -0.3, 0.18], rot: [0, 0, 0.08], sling: { at: [0.2, 0.25, -0.2], rot: [0, Math.PI / 2, 0] } },
  // ящик: перед грудью
  crate: { at: [0.185, -0.42, 0.2], rot: [0, 0, 0], sling: null },
};
