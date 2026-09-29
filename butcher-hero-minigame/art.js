"use strict";
// Sprites (ASCII, drawn by hand) and procedurally generated biome arenas.

const BUTCHER_PAL = {
  G: hx("#4ac86a"), g: hx("#1f7a44"), M: hx("#f4f0e2"), m: hx("#bdb4a2"), x: INK, b: hx("#d0202e"),
  R: hx("#ffa24a"), r: hx("#ec6e1e"), q: hx("#a8400e"), T: hx("#2aa092"), t: hx("#16605c"), n: hx("#4a2616"),
  k: SKIN.S, w: WHITE, j: hx("#4a0a14"),
};
const BUTCHER_TOP = [
  ".........gGGgGGg..........", ".......gGGGGgGGGGg........", "......gGGgGGGGGgGGg.......",
  "......GMMMMMMMMMMMMg......", "......MMMMMMMMMMMMMm......", "......MMbbMMMMMMbbMm......",
  "......MxxxbMMMMbxxxm......", "......MxxxxMMMMxxxxm......", "......MMxxMMMMMMxxMm......",
  "......MMMMMMMMMMMMMm......", ".......mMMMxMMxMMMm.......", "........mMMMMMMMMm........",
  "....RRRRrmmmmmmmmrrqqq....", "..RRRRRRRRRrrrrrrrrrqqqq..", ".RRRRRRRRRRrrrrrrrrrrqqqq.",
  "RRRRRRRRRRrrrrrrrrrrrqqqqq", "RRRRRRRRRrrrrbqrrrrrrqqqqq", "RRRRRRRRrrrrrrrrrrrrqqqqqq",
  "RRRRRRRrrrrrrrqrrrbbqqqqqq", "RRRRRRrrrrrrrrrrrrrqqbqqqq", "RRRRRrrrrrrrrrqrrrrqqqqqqq",
  ".RRRRrrrrrrrrrrrrrqqqqqqq.", ".RRRrrrrrrrrrrrrrqqqqqqqq.", "..rrrrrrrrrrrrrrqqqqqqq...",
  "...TTTTTTTTTTTTTTTtttt....", "...TTTTTTTTTttTTTTtttt....",
];
const LEGS = [
  ["...TTTTTTTt...TTTTttt.....", "...TTTTTTt.....TTTttt.....", "...tttttt......tttttt.....", "..nnnnnnn.....nnnnnnn.....", "..nnnnnn.......nnnnnn....."],
  ["...TTTTTTTt...TTTTttt.....", "...tttttttt....TTTttt.....", "..nnnnnnn......tttttt.....", "..nnnnnn......nnnnnnn.....", "...............nnnnnn....."],
  ["...TTTTTTTt...TTTTttt.....", "...TTTTTTt....tttttttt....", "...tttttt....nnnnnnn......", "..nnnnnnn....nnnnnn.......", "..nnnnnn.................."],
];
function butcherRows(mouth, legs) {
  const r = BUTCHER_TOP.slice();
  if (mouth === "open") {
    r[10] = ".......kwjwwjwwjwk........"; r[11] = ".......kjjjjbjjjjk........";
    r[12] = "....RRRRkjjbjjjjkrrqqq...."; r[13] = "..RRRRRRRkwjwwjwkrrrqqqq..";
  } else if (mouth === "bite") {
    r[10] = ".......kwjwwjwwjwk........"; r[11] = ".......kwwwwwwwwwk........"; r[12] = "....RRRRkkkkkkkkkrrqqq....";
  }
  return r.concat(LEGS[legs]);
}
const SPR = {};
SPR.butcher = {};
for (const m of ["idle", "open", "bite"]) for (let l = 0; l < 3; l++) SPR.butcher[m + l] = makeSprite(butcherRows(m, l), BUTCHER_PAL);
const BUTCHER_BELLY_UP = 15;  // belly is this many (unscaled) pixels above the feet

const GOB_ROWS = [
  "...GGGgg.....", "..GGGGGggd...", "gGGGGGyGyd...", "ggGGGGGGgdd..", "..gGGGgggd.ww",
  "...dgggdd.wWw", "..GGGggdddwWw", ".gGGgggdddGh.", "..GgggdddG.h.", "..cCCcccc....",
];
const GOB_LEGS = [["..gg...dd....", "..dd...dd...."], ["...gg.dd.....", "...dd.dd....."]];
const PALS = {
  goblin: { G: hx("#c2c448"), g: hx("#8e9228"), d: hx("#5c5e1a"), y: hx("#fff27a"), c: hx("#6a3a18"), C: hx("#9c5c2a"), w: METAL[1], W: METAL[0], h: HANDLE },
  brute: { G: hx("#d08a58"), g: hx("#a25a34"), d: hx("#6a3018"), y: hx("#ffea60"), c: hx("#3a2a2a"), C: hx("#5a4a4a"), w: METAL[1], W: METAL[0], h: HANDLE },
  ice: { G: hx("#d8ecff"), g: hx("#96b8e0"), d: hx("#58789e"), y: hx("#ff5a5a"), c: hx("#3a4a7a"), C: hx("#5a6aa0"), w: hx("#bff6ff"), W: WHITE, h: hx("#3a4a7a") },
};
for (const k of ["goblin", "brute", "ice"]) {
  SPR[k] = [0, 1].map(l => makeSprite(GOB_ROWS.concat(GOB_LEGS[l]), PALS[k]));
}
const YETI_PAL = { W: hx("#f4f8ff"), w: hx("#bcd0e8"), s: hx("#8aa2c4"), b: hx("#6a9ad0"), y: hx("#ff4040"), m: hx("#2a1a2a"), n: hx("#5a6a8a"), t: WHITE };
const YETI_TOP = [
  "....wwwwwww.....", "...wwWWWWWww....", "..wwWbbWbbWww...", "..wWWbybbybWw...", "..wWWbmtmtbWw...",
  ".wwwWWbbbbWwww..", "wwWWWWWWWWWWwww.", "wWWWWWWWWWWWWww.", "wWWsWWWWWWWsWww.", "wWWsWWWWWWWsWww.",
  ".wWWWWWWWWWWww..", "..wWWWsWWsWWw...", "..wWWWWWWWWWw...",
];
SPR.yeti = [
  makeSprite(YETI_TOP.concat(["...wWWw..wWWw...", "...wWWw..wWWw...", "..nnnn....nnnn.."]), YETI_PAL),
  makeSprite(YETI_TOP.concat(["...wWWw..wWWw...", "..nnnn...wWWw...", "..........nnnn.."]), YETI_PAL),
];
const LIZ_PAL = { G: hx("#7ad04a"), g: hx("#3e8a2a"), d: hx("#285a1e"), y: hx("#ffe04a"), L: hx("#e8d870"), s: hx("#8a5a2a"), S: METAL[1], K: hx("#e02050") };
const LIZ_TOP = [
  "....GGG.....S", "...GGyGg....S", "...GGGGgK...s", "....gGGg....s", "..GGGGGgg..Gs",
  ".GgGLLLgGgGGs", ".G.gLLLg....s", "...gLLLg.....", "...gGGGg....d", "..gg...gg..dd",
];
SPR.lizard = [
  makeSprite(LIZ_TOP.concat(["..gg...gg.dd.", "..dd...dd...."]), LIZ_PAL),
  makeSprite(LIZ_TOP.concat(["...gg.gg..dd.", "...dd.dd....."]), LIZ_PAL),
];
const PLANT_PAL = { r: hx("#a02040"), R: hx("#e04a6a"), y: hx("#ffe04a"), K: hx("#3a0a14"), g: hx("#3a8a2a"), G: hx("#6ac04a"), L: hx("#4aa83a"), l: hx("#2a7030"), w: WHITE };
SPR.plant = [
  makeSprite(["...rrrrr....", "..rRRRRRr...", ".rRRyRRyRr..", ".rRRRRRRRr..", ".rrKwKwKrr..", "..rrrrrrr...",
    "....gg......", "...gGg..gg..", "..gg.gGgGg..", ".gG...gg....", "......gg....", "..LLLLggLL..", ".LLlllllllL."], PLANT_PAL),
  makeSprite(["...rrrrr....", "..rRRRRRr...", ".rRRyRRyRr..", ".rKKKKKKKr..", ".rKwKwKwKr..", "..rrrrrrr...",
    "....gg......", "...gGg..gg..", "..gg.gGgGg..", ".gG...gg....", "......gg....", "..LLLLggLL..", ".LLlllllllL."], PLANT_PAL),
];
const ALIEN_PAL = { G: hx("#8ae05a"), g: hx("#4aa83a"), K: hx("#101018"), w: WHITE, S: hx("#c8ccd8"), s: hx("#8a8e9e"), m: hx("#ff4aa0") };
const ALIEN_TOP = ["..GGGGGG..", ".GGGGGGGG.", "GGKKGGKKGG", "GGKwGGKwGG", ".GGGGGGGG.", "..GGggGG..", "...GGGG...",
  "..SSSSSS..", ".SSSsSSSSm", ".GSSsSSG.m", "..SSsSS..."];
SPR.alien = [
  makeSprite(ALIEN_TOP.concat(["..SS..SS..", "..ss..ss.."]), ALIEN_PAL),
  makeSprite(ALIEN_TOP.concat(["...SSSS...", "...s..s..."]), ALIEN_PAL),
];
const DRONE_PAL = { c: hx("#8af0ff"), C: hx("#d8fcff"), m: hx("#6a6e80"), M: hx("#b8bccb"), y: hx("#ffe04a"), r: hx("#ff4a4a") };
SPR.drone = [
  makeSprite(["....cccc....", "...cCCCCc...", ".mmmmmmmmmm.", "mMMMMMMMMMMm", ".mmyymmrrmm.", "...mmmmmm..."], DRONE_PAL),
  makeSprite(["....cccc....", "...cCCCCc...", ".mmmmmmmmmm.", "mMMMMMMMMMMm", ".mmrrmmyymm.", "...mmmmmm..."], DRONE_PAL),
];
const ITEM_PAL = { r: hx("#b0283a"), R: hx("#ff6a6a"), w: hx("#f4ecd8"), W: WHITE, g: GOLD, G: hx("#c08a1a"), p: hx("#ff9ac0") };
SPR.meat = makeSprite(["..pP.", ".pPPp", ".pppp", "w.pp.", "Ww..."], { p: hx("#e0607a"), P: hx("#ffb0c0"), w: hx("#f4ecd8"), W: WHITE });
SPR.bigmeat = makeSprite(["..pPPp.", ".pPPPPp", ".pPPPPp", ".ppPPpp", "..pppp.", "Ww.....", "WW....."], { p: hx("#e0607a"), P: hx("#ffb0c0"), w: hx("#f4ecd8"), W: WHITE });
SPR.heart = makeSprite([".R.R.", "RRRRR", "RRRRR", ".RRR.", "..R.."], { R: hx("#ff3a5a") });
SPR.bone = makeSprite(["w...w", ".www.", "w...w"], ITEM_PAL);
const CHEST_PAL = { R: hx("#e0402a"), r: hx("#8a1a1a"), Y: hx("#ffd23a"), y: hx("#c08a1a"), G: hx("#9a9cac"), g: hx("#5a5c6c"), L: hx("#ffe04a"), d: hx("#3a1a10"), c: hx("#ffe860") };
SPR.chest = makeSprite(["..YYRRYYRRYYRR..", ".YYRRYYRRYYRRYY.", "YYRRYYRRYYRRYYRy", "GGGGGGGGGGGGGGGg", "yYRRYYRLLRYYRRYy",
  "YYRRYYLLLLYYRRYy", "YYRRYYRLLRYYRRYy", "YYRRYYRRYYRRYYRy", "gGGGGGGGGGGGGGGg"], CHEST_PAL);
SPR.chestOpen = makeSprite(["GGGGGGGGGGGGGGGg", "YdddddddddddddRy", "YYdddddddddddYRy", ".YYRRYYRRYYRRYy.", "GcLcLcLcLcLcLcLg",
  "yYRRYYRLLRYYRRYy", "YYRRYYLLLLYYRRYy", "YYRRYYRLLRYYRRYy", "YYRRYYRRYYRRYYRy", "gGGGGGGGGGGGGGGg"], CHEST_PAL);
SPR.hand = makeSprite(["..##.......", ".#ww#......", ".#wg#......", ".#wg###....", ".#wg#wg##..", "##wg#wg#g#.",
  "#wwwwwwwgg#", "#wwwwwwwwg#", ".#wwwwwwwg#", "..#wwwwwg#.", "...######.."], { "#": INK, w: WHITE, g: METAL[1] }, 0);
const ICON_PAL = { R: hx("#ff3a5a"), B: hx("#8a5a2a"), b: hx("#c08a4a"), S: SKIN.S, s: SKIN.s, M: METAL[1], m: METAL[3], r: hx("#e02030"), G: GREEN, g: hx("#1f7a44"), w: WHITE, W: METAL[0], p: hx("#ff9ac0") };
SPR.icons = {
  meaty: makeSprite([".RR.RR.", "RRRRRRR", "RRRRRRR", ".RRRRR.", "..RRR..", "...R..."], ICON_PAL),
  speed: makeSprite(["...BBb.", "...BBb.", "...BBb.", "BBBBBb.", "BBBBBBb", "bbbbbbb"], ICON_PAL),
  might: makeSprite([".SSSS..", "SSSSSS.", "SSSSSSs", "SSSSSSs", ".SSSSs.", "..sss.."], ICON_PAL),
  magnet: makeSprite(["rr...rr", "rr...rr", "rr...rr", "rr...rr", ".rrrrr.", "WW...WW"], ICON_PAL),
  hook: makeSprite(["...MM..", "..M..M.", ".....M.", "....M..", "M..M...", ".MM....", "mmm...."], ICON_PAL),
  glutton: makeSprite(["..rRR..", ".rRpRRw", "rRRRRRw", "rrRRRWw", ".rrrr.."], ITEM_PAL),
  regen: makeSprite(["..G..", "..G..", "GGGGG", "..G..", "..G.."], ICON_PAL),
  feast: makeSprite([".RR.RR.", "RRRRRRR", "RRwRRRR", ".RRRRR.", "..RRR..", "...R..."], ICON_PAL),
};
const CACTUS = makeSprite(["....GG...", "...GgGG..", "...GgGG..", "G..GgGG..", "GG.GgGG.G", "GGGGgGG.G", ".GGGgGGGG",
  "...GgGGG.", "...GgGG..", "...GgGG..", "...GgGG..", "..dddddd."], { G: hx("#6ab04a"), g: hx("#3a8030"), d: hx("#8a5020") });
const CRYSTAL = makeSprite(["..p..", ".pPp.", ".pPp.", "pPPPp", "pPWPp", ".pPp."], { p: hx("#9a4ae0"), P: hx("#d08aff"), W: WHITE });
const MUSH = makeSprite(["..yYYy..", ".yYYYYyo", "yYYYYYyo", ".oyyyyo.", "...ww...", "...ww...", "...wo..."],
  { Y: hx("#fff6a0"), y: hx("#ffc83a"), o: hx("#e08a1a"), w: hx("#f6e2b4") });

const SKEL_PAL = { W: hx("#f4ecd8"), w: hx("#c8bca0"), d: hx("#8a7c68"), K: hx("#2a1a1a"), r: hx("#ff3a2a"), s: METAL[1], S: METAL[0], h: HANDLE };
const SKEL_TOP = ["...WWWw....", "..WWWWWw.S.", "..WKrWKw.s.", "..WWWWWw.s.", "...wKKw..s.", "....ww...s.",
  "..wWWWw..h.", ".wWdWdWwwh.", ".w.WWWw....", "...wdw.....", "...WWW....."];
SPR.skel = [
  makeSprite(SKEL_TOP.concat(["..W...W....", ".ww...ww..."]), SKEL_PAL),
  makeSprite(SKEL_TOP.concat(["...W.W.....", "..ww.ww...."]), SKEL_PAL),
];
SPR.bonepile = makeSprite(["..W.w..", ".wWWdW.", "WdwWwWd", ".dwdwd."], SKEL_PAL);
const BAT_PAL = { P: hx("#5a2a6a"), p: hx("#9a5aaa"), R: hx("#ff3a3a") };
SPR.bat = [
  makeSprite(["P.......P", "PP.p.p.PP", "PPPpppPPP", ".PPpRpPP.", "...ppp..."], BAT_PAL),
  makeSprite(["...p.p...", "..ppppp..", ".PPpRpPP.", "PP.ppp.PP", "P.......P"], BAT_PAL),
];
const IMP_PAL = { R: hx("#e04a2a"), r: hx("#a02a1a"), y: hx("#ffe04a"), K: hx("#3a0a0a"), o: hx("#ff9a2a"), O: hx("#ffe060") };
const IMP_TOP = ["R......R..", ".R.RR.R...", "..RRRRR...", "..RyRyR...", "..RRRRR.o.", "...RKR..oO", "..rRRRr.o.", ".rRRRRRr..", "..rRRRr..."];
SPR.imp = [
  makeSprite(IMP_TOP.concat(["...R.R....", "..RR.RR..."]), IMP_PAL),
  makeSprite(IMP_TOP.concat(["...RR.....", "...R.RR..."]), IMP_PAL),
];
const SLIME_PAL = { O: hx("#ffb02a"), o: hx("#ff6a1a"), K: hx("#3a0a0a"), r: hx("#8a2a0a"), w: hx("#fff0a0") };
SPR.slime = [
  makeSprite(["....OOOO....", "..OOowooOO..", ".OoooooooO..", "OooKoooKooO.", "OoooooooooO.", "OooooKKoooO.", ".OOooooooOO.", "..rrrrrrrr.."], SLIME_PAL),
  makeSprite(["...OOOOOO...", ".OOowoooooO.", "OooKoooKoooO", "OoooooKKoooO", "OoooooooooO.", "rrrrrrrrrrr."], SLIME_PAL),
];
const DARK_PAL = Object.assign({}, BUTCHER_PAL, {
  G: hx("#c02040"), g: hx("#6a0a1a"), M: hx("#4a4a58"), m: hx("#26262e"), x: hx("#ff2a2a"), b: hx("#ff7a2a"),
  R: hx("#9a5ad0"), r: hx("#6a2aa0"), q: hx("#3e1266"), T: hx("#34344a"), t: hx("#1a1a28"), n: hx("#101018"),
});
SPR.dark = {};
for (const m of ["idle", "open", "bite"]) for (let l = 0; l < 3; l++) SPR.dark[m + l] = makeSprite(butcherRows(m, l), DARK_PAL);
const TOMB = makeSprite(["..gggg..", ".gGGGGg.", "gGGKGGGg", "gGKKKGGg", "gGGKGGGg", "gGGKGGGg", "gGGGGGGg", "gGGGGGGg", "dddddddd"],
  { G: hx("#a8a8b8"), g: hx("#6a6a7a"), K: hx("#3a3a4a"), d: hx("#3a2a2a") });
const CANDLE = makeSprite([".y.", ".Y.", ".w.", ".w.", "www"], { y: hx("#ffe04a"), Y: hx("#ff8a2a"), w: hx("#e8e0d0") });
const BASALT = makeSprite(["..kkkk...", ".kKKKkk..", "kKKkkKkk.", "kKkkkkkkk", ".kkooookk", "..kkkkk.."], { K: hx("#6a5a58"), k: hx("#3a2e2e"), o: hx("#ff6a1a") });

// ---- biomes ----
const BIOMES = {
  forest: {
    ground: ["#8e4c16", "#b3671c", "#cd8526", "#e2a43a"], crack: "#7a3c12", tuft: ["#f6cc4a", "#b06a14"],
    trees: [["#ffe06a", "#f5a830", "#c96418", "#8a3a12"], ["#ffb04a", "#e8702a", "#b0401a", "#6e2410"]], trunk: ["#6a3418", "#3e1c10"],
    rock: ["#e2d8c6", "#b0a492", "#7c7066"], props: [MUSH], weather: "leaves", fx: [hx("#e0561c"), hx("#f08a24"), hx("#ffc24a")],
  },
  snow: {
    ground: ["#8aa0c0", "#aebfd8", "#cfdcec", "#eef4fb"], crack: "#7a8cae", tuft: ["#ffffff", "#9ab8e0"],
    trees: [["#ffffff", "#9cc4d8", "#4a7a8a", "#284a58"], ["#e8f4ff", "#7ab0c8", "#3a6478", "#1c3a48"]], trunk: ["#5a4a4a", "#3a2a2a"],
    rock: ["#e8f0ff", "#a8b8d0", "#6a7a98"], props: [], weather: "snow", fx: [WHITE, hx("#dfeaff")],
  },
  jungle: {
    ground: ["#2e4a1a", "#3e6420", "#517e2a", "#6a9a36"], crack: "#243a14", tuft: ["#9ae05a", "#2a5a1a"],
    trees: [["#9ae05a", "#4aa83a", "#2a7030", "#15401e"], ["#c0f070", "#6ac04a", "#3a8a30", "#1a4a20"]], trunk: ["#5a3a1a", "#2e1a0a"],
    rock: ["#a8b890", "#788a64", "#4a5a3e"], props: [], weather: "rain", fx: [hx("#bfe8ff"), hx("#8ac4f0")],
  },
  grave: {
    ground: ["#3a3440", "#4a4250", "#5a5064", "#6a6078"], crack: "#2a2430", tuft: ["#8a8a6a", "#4a4a3a"],
    trees: [], dead: true, trunk: ["#5a4a5a", "#342834"], rock: ["#8a8a9a", "#5a5a6a", "#3a3a48"], props: [TOMB, TOMB, TOMB, CANDLE],
    weather: "fog", fx: [hx("#8a8aa0"), hx("#6a6a84")],
  },
  lava: {
    ground: ["#2a1a1a", "#3a2424", "#4a2e2a", "#5a3a30"], crack: "#ff6a1a", crackGlow: "#ffc03a", tuft: ["#6a4a3a", "#3a2a22"],
    trees: [], trunk: ["#3a2a22", "#1a1210"], rock: ["#6a5a58", "#4a3a38", "#2a2020"], props: [BASALT],
    weather: "embers", fx: [hx("#ff9a2a"), hx("#ffe060"), hx("#ff5a1a")],
  },
  desert: {
    ground: ["#a8662a", "#c98a40", "#e0ae5a", "#f2cc80"], crack: "#8a5020", tuft: ["#f6e2a0", "#a06a2a"],
    trees: [], trunk: ["#6a3418", "#3e1c10"], rock: ["#e89a6a", "#c0643a", "#7a3a24"], props: [CACTUS, CRYSTAL],
    weather: "sand", fx: [hx("#f6dca0"), hx("#e8c078")],
  },
};

function valueNoise(seed, cell, w, h) {
  const r = seeded(seed), gw = Math.ceil(w / cell) + 2, g = new Float32Array(gw * (Math.ceil(h / cell) + 2));
  for (let i = 0; i < g.length; i++) g[i] = r();
  return (x, y) => {
    const gx = x / cell, gy = y / cell, i = Math.floor(gx), j = Math.floor(gy);
    let u = gx - i, v = gy - j;
    u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
    const a = g[j * gw + i] * (1 - u) + g[j * gw + i + 1] * u, b = g[(j + 1) * gw + i] * (1 - u) + g[(j + 1) * gw + i + 1] * u;
    return a * (1 - v) + b * v;
  };
}

// Arena bitmap: ground, cracks, tufts, rocks and props inside; a ring of trees / cliffs around the walkable area.
const AW = 480, AH = 300, INSET = { l: 28, r: 28, t: 44, b: 22 };
function makeArena(biomeKey, seed) {
  const B = BIOMES[biomeKey], d = new Uint32Array(AW * AH), r = seeded(seed);
  const G = B.ground.map(hx), n1 = valueNoise(seed + 1, 34, AW, AH), n2 = valueNoise(seed + 2, 9, AW, AH);
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const v = n1(x, y) * 0.72 + n2(x, y) * 0.28 + (BAYER[y % 4][x % 4] / 16 - 0.47) * 0.07;
    d[y * AW + x] = G[clamp(Math.floor((v - 0.12) * 5), 0, 3)];
  }
  const A = { w: AW, h: AH, d, biome: biomeKey, base: null };
  const P = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && x < AW && y >= 0 && y < AH) d[y * AW + x] = c; };
  const crack = hx(B.crack);
  for (let k = 0; k < (B.crackGlow ? 11 : 7); k++) {
    let x = r() * AW, y = r() * AH, dx = r() - 0.5, dy = r() - 0.5;
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const glow = B.crackGlow ? hx(B.crackGlow) : 0, n = (B.crackGlow ? 140 : 90) + r() * 80;
    for (let i = 0; i < n; i++) {
      P(x, y, crack);
      if (glow) { P(x + 1, y, i % 3 ? crack : glow); P(x, y - 1, mix(crack, G[1], 0.5)); }
      x += dx + (r() - 0.5) * 0.9; y += dy + (r() - 0.5) * 0.9;
    }
  }
  const tuft = B.tuft.map(hx);
  for (let k = 0; k < 70; k++) {
    const x = r() * AW, y = r() * AH;
    if (biomeKey === "snow") { P(x, y, tuft[0]); P(x + 1, y, tuft[0]); P(x, y + 1, tuft[1]); continue; }
    [[1, 0, 1], [3, 0, 1], [0, 1, 1], [2, 1, 1], [3, 1, 0], [1, 2, 0], [2, 2, 1], [3, 2, 0]].forEach(([a, b, c]) => P(x + a, y + b, tuft[c]));
  }
  if (biomeKey === "jungle") for (let k = 0; k < 9; k++) {
    const cx = INSET.l + r() * (AW - 80), cy = INSET.t + r() * (AH - 80), rx = 6 + r() * 10, ry = rx * 0.5;
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++)
      if ((x / rx) ** 2 + (y / ry) ** 2 <= 1) P(cx + x, cy + y, (x + y * 1.5) < -rx * 0.4 ? hx("#6ab0c0") : hx("#3a7a8a"));
  }
  const decals = [];
  const rockPal = B.rock.map(hx);
  for (let k = 0; k < 6; k++) decals.push({ kind: "rock", x: INSET.l + 20 + r() * (AW - 100), y: INSET.t + 20 + r() * (AH - 90), s: 6 + r() * 6 });
  for (let k = 0; k < (B.props.length ? 9 : 0); k++) decals.push({ kind: "prop", spr: B.props[Math.floor(r() * B.props.length)], x: INSET.l + 10 + r() * (AW - 70), y: INSET.t + 16 + r() * (AH - 80) });
  // border trees / rocks
  if (B.dead) {
    for (let x = -10; x < AW + 20; x += 18 + r() * 10) {
      decals.push({ kind: "dead", x, y: 14 + r() * 24, h: 36 + r() * 18 });
      decals.push({ kind: "dead", x: x + 7, y: AH + 16 + r() * 8, h: 30 + r() * 12 });
    }
    for (let y = 30; y < AH; y += 18 + r() * 8) {
      decals.push({ kind: "dead", x: 6 + r() * 10, y: y + 30, h: 34 + r() * 16 });
      decals.push({ kind: "dead", x: AW - 6 - r() * 10, y: y + 30, h: 34 + r() * 16 });
    }
  } else if (B.trees.length) {
    for (let x = -10; x < AW + 20; x += 15 + r() * 8) {
      decals.push({ kind: "tree", x, y: 8 + r() * 26, h: 40 + r() * 22, pal: B.trees[Math.floor(r() * 2)] });
      decals.push({ kind: "tree", x: x + 6, y: AH + 20 + r() * 10, h: 34 + r() * 16, pal: B.trees[Math.floor(r() * 2)] });
    }
    for (let y = 30; y < AH; y += 16 + r() * 8) {
      decals.push({ kind: "tree", x: 4 + r() * 12, y: y + 30, h: 38 + r() * 20, pal: B.trees[Math.floor(r() * 2)] });
      decals.push({ kind: "tree", x: AW - 4 - r() * 12, y: y + 30, h: 38 + r() * 20, pal: B.trees[Math.floor(r() * 2)] });
    }
  } else {
    for (let x = -6; x < AW + 10; x += 12 + r() * 10) {
      decals.push({ kind: "cliff", x, y: 4 + r() * 22, s: 10 + r() * 8 });
      decals.push({ kind: "cliff", x, y: AH + 2 - r() * 10, s: 9 + r() * 6 });
    }
    for (let y = 20; y < AH; y += 12 + r() * 8) {
      decals.push({ kind: "cliff", x: r() * 16, y, s: 10 + r() * 6 });
      decals.push({ kind: "cliff", x: AW - r() * 16, y, s: 10 + r() * 6 });
    }
  }
  decals.sort((a, b) => a.y - b.y);
  // draw decals into the bitmap through the screen buffer helpers (temporarily redirect put)
  const L2 = [];
  for (const dc of decals) {
    const L = new Layer();
    if (dc.kind === "rock" || dc.kind === "cliff") {
      const s = dc.s, cx = dc.x, cy = dc.y;
      for (let y = -s; y <= s * 0.4; y++) for (let x = -s * 1.2; x <= s * 1.2; x++) {
        const dd = (x / (s * 1.2)) ** 2 + (y / s) ** 2;
        if (dd <= 1 && !(y > s * 0.2 && dd > 0.7)) L.set(cx + x, cy + y, (x + y * 1.4) < -s * 0.3 ? rockPal[0] : (x + y) < s * 0.5 ? rockPal[1] : rockPal[2]);
      }
    } else if (dc.kind === "dead") {
      deadTreeLayer(L, dc.x, dc.y, dc.h, B.trunk.map(hx), seeded(Math.floor(dc.x * 13 + dc.y * 7)));
    } else if (dc.kind === "tree") {
      pineLayer(L, dc.x, dc.y - dc.h, dc.h, dc.h * 0.7, dc.pal.map(hx), B.trunk.map(hx));
    }
    L2.push({ L, dc });
  }
  for (const { L, dc } of L2) {
    if (dc.kind === "tree" || dc.kind === "cliff" || dc.kind === "dead") {
      const sh = dc.kind !== "cliff" ? { x: dc.x + 8, y: dc.y, rx: dc.h * 0.3, ry: 4 } : { x: dc.x + 3, y: dc.y + 3, rx: dc.s, ry: 3 };
      for (let y = -sh.ry; y <= sh.ry; y++) for (let x = -sh.rx; x <= sh.rx; x++)
        if ((x / sh.rx) ** 2 + (y / sh.ry) ** 2 <= 1) {
          const xx = (sh.x + x) | 0, yy = (sh.y + y) | 0;
          if (xx >= 0 && xx < AW && yy >= 0 && yy < AH) d[yy * AW + xx] = mul(d[yy * AW + xx], SHADOW_K);
        }
    }
    if (dc.kind === "prop") { stampSprite(d, dc.spr, dc.x, dc.y); continue; }
    stampLayer(d, L);
  }
  A.base = d.slice();
  return A;
}
function stampLayer(d, L) {
  const P = (x, y, c) => { if (x >= 0 && x < AW && y >= 0 && y < AH) d[y * AW + x] = c; };
  for (const k of L.m.keys()) {
    const x = (k % 4096) - 1024, y = Math.floor(k / 4096) - 512;
    if (!L.m.has(k + 1)) P(x + 1, y, INK);
    if (!L.m.has(k - 1)) P(x - 1, y, INK);
    if (!L.m.has(k + 4096)) P(x, y + 1, INK);
    if (!L.m.has(k - 4096)) P(x, y - 1, INK);
  }
  for (const [k, c] of L.m) P((k % 4096) - 1024, Math.floor(k / 4096) - 512, c);
}
function stampSprite(d, s, x0, y0) {
  x0 = Math.round(x0 - s.w / 2); y0 = Math.round(y0 - s.h);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const c = s.d[y * s.w + x], xx = x0 + x, yy = y0 + y;
    if (c && xx >= 0 && xx < AW && yy >= 0 && yy < AH) d[yy * AW + xx] = c;
  }
}
function deadTreeLayer(L, x, base, h, pal, r) {
  const branch = (x0, y0, ang, len, w, depth) => {
    const n = Math.ceil(len);
    for (let i = 0; i <= n; i++) {
      const cx = x0 + Math.cos(ang) * i, cy = y0 + Math.sin(ang) * i;
      for (let o = -w / 2; o <= w / 2; o += 1) L.set(cx + o * Math.sin(ang), cy - o * Math.cos(ang), o < 0 ? pal[0] : pal[1]);
    }
    if (depth > 0) {
      const ex = x0 + Math.cos(ang) * len, ey = y0 + Math.sin(ang) * len;
      branch(ex, ey, ang - 0.5 - r() * 0.3, len * 0.6, Math.max(1, w - 1), depth - 1);
      branch(ex, ey, ang + 0.4 + r() * 0.3, len * 0.55, Math.max(1, w - 1), depth - 1);
    }
  };
  branch(x, base, -Math.PI / 2 + (r() - 0.5) * 0.2, h * 0.55, 4, 3);
}
function pineLayer(L, cx, top, h, w, pal, trunk) {
  for (let y = top + h * 0.86; y < top + h * 1.02; y++) for (let x = cx - 2; x < cx + 2; x++) L.set(x, y, x < cx ? trunk[0] : trunk[1]);
  for (let i = 3; i >= 0; i--) {
    const t0 = top + i * h * 0.19, t1 = top + h * (0.36 + i * 0.17), hw = w * (0.42 + 0.58 * (i + 1) / 4) / 2;
    for (let y = Math.floor(t0); y <= t1; y++) {
      const frac = (y - t0) / Math.max(t1 - t0, 1), half = hw * (0.15 + 0.85 * frac);
      for (let x = Math.floor(cx - half); x <= cx + half; x++) {
        if (y >= Math.floor(t1) - 1 && ((Math.floor(x / 2) % 2 + 2) % 2) === (y % 2)) continue;
        const rel = (x - cx) / Math.max(half, 1);
        let c = y >= Math.floor(t1) - 2 ? (rel > 0.1 ? pal[3] : pal[2]) : rel < -0.45 ? pal[0] : rel < 0.2 ? pal[1] : pal[2];
        if (frac < 0.12) c = pal[0];
        L.set(x, y, c);
      }
    }
  }
}
