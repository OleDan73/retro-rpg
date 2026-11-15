// Save fixtures and test scenarios for run.mjs.
//
// The fixtures are deliberately written in the ORIGINAL save format (version 1, no `hero` field), exactly
// as the first released game stored them. They double as the save-compatibility test: every later version
// of the game must load them and carry on. Do not "modernise" them when the save format grows.
//
// Each scenario's `run` is executed inside the page, so it can only use its arguments:
//   T = the driving API from shim.js, g = the game's debug hook (window.__rpg).
export const SAVE_KEY = 'turnip-vale-save-v1';

// Player stats at a given level, as the original game computes them.
function level(n) {
  let next = 12;
  for (let i = 1; i < n; i++) next = Math.floor(next * 1.5);
  return { lvl: n, maxhp: 30 + 6 * (n - 1), hp: 30 + 6 * (n - 1), atk: 6 + 2 * (n - 1), def: 1 + (n - 1), xp: 0, next };
}
function save({ at, lvl = 1, player = {}, q = {}, flags = {}, stats = {}, tracked = null }) {
  const [map, x, y, dir] = at;
  return {
    v: 1,
    player: {
      map, x, y, dir, moving: false, fx: x, fy: y, tx: x, ty: y, t: 0,
      ...level(lvl),
      herbs: 3, maxHerbs: 3, gold: 0, weapon: 'none', armor: 'none',
      shards: 0, glowcaps: 0, sickle: false, sinceBattle: 0,
      ...player,
    },
    q: { slimes: { s: 0, n: 0 }, biscuit: { s: 0 }, glowcap: { s: 0 }, king: { s: 0 }, shards: { s: 0 }, ...q },
    flags, stats: { won: 0, slimes: 0, steps: 0, ...stats }, tracked,
  };
}
const DONE = { s: 3 };

const FIX = {
  // Just started, standing below Elder Moss.
  fresh: save({ at: ['village', 8, 7, 'up'] }),
  // Three quests running, in the woods.
  woods: save({
    at: ['forest', 3, 5, 'right'], lvl: 2, player: { gold: 12, glowcaps: 1 },
    q: { slimes: { s: 1, n: 2 }, biscuit: { s: 1 }, glowcap: { s: 1 } }, stats: { won: 3, slimes: 2, steps: 140 }, tracked: 'slimes',
  }),
  // Next to Biscuit the cat.
  cat: save({ at: ['forest', 16, 13, 'up'], lvl: 2, q: { slimes: { s: 1, n: 1 }, biscuit: { s: 1 } }, tracked: 'biscuit' }),
  // At the vines without the sickle.
  vinesLocked: save({ at: ['forest', 18, 4, 'up'], lvl: 2, q: { slimes: { s: 1, n: 1 } }, tracked: 'slimes' }),
  // At the vines with the sickle, boss quest accepted.
  vines: save({
    at: ['forest', 18, 4, 'up'], lvl: 4, player: { sickle: true, gold: 60 },
    q: { slimes: { s: 3, n: 3 }, king: { s: 1 } }, stats: { won: 9, slimes: 5, steps: 400 }, tracked: 'king',
  }),
  // In front of the boss, well prepared.
  boss: save({
    at: ['cave', 10, 3, 'up'], lvl: 7,
    player: { maxhp: 76, hp: 76, herbs: 5, maxHerbs: 5, gold: 40, weapon: 'iron', armor: 'vest', sickle: true },
    q: { slimes: { s: 3, n: 3 }, biscuit: DONE, glowcap: DONE, king: { s: 1 }, shards: { s: 1 } },
    flags: { vines: true, metBram: true }, stats: { won: 30, slimes: 12, steps: 1500 }, tracked: 'king',
  }),
  // In front of the boss, far too weak.
  bossWeak: save({
    at: ['cave', 10, 3, 'up'], lvl: 1, player: { herbs: 0, sickle: true },
    q: { slimes: { s: 3, n: 3 }, king: { s: 1 } }, flags: { vines: true }, tracked: 'king',
  }),
  // Boss beaten, standing below Elder Moss, ready to report.
  report: save({
    at: ['village', 8, 7, 'up'], lvl: 8,
    player: { maxhp: 82, hp: 50, herbs: 2, maxHerbs: 5, gold: 180, weapon: 'iron', armor: 'vest', sickle: true, shards: 2 },
    q: { slimes: { s: 3, n: 3 }, biscuit: DONE, glowcap: DONE, king: { s: 2 }, shards: { s: 2 } },
    flags: { vines: true, metBram: true, shard1: true, shard2: true }, stats: { won: 41, slimes: 14, steps: 2100 }, tracked: 'king',
  }),
  // Beside Bram, carrying two shards before his quest was offered, with gold to spend.
  bram: save({
    at: ['village', 8, 9, 'left'], lvl: 5, player: { herbs: 2, gold: 100, sickle: true, shards: 2 },
    q: { slimes: { s: 3, n: 3 }, king: { s: 1 } }, flags: { vines: true, shard1: true, shard2: true }, tracked: 'king',
  }),
  // Beside Wren with the glowcaps, hurt.
  wren: save({
    at: ['village', 13, 4, 'right'], lvl: 3, player: { hp: 9, herbs: 0, glowcaps: 3 },
    q: { slimes: { s: 1, n: 2 }, glowcap: { s: 2 } }, tracked: 'glowcap',
  }),
  // Beside Pip, carrying Biscuit.
  pip: save({ at: ['village', 8, 11, 'left'], lvl: 2, q: { slimes: { s: 1, n: 0 }, biscuit: { s: 2 } }, tracked: 'biscuit' }),
  // Everything finished, standing below the well.
  finished: save({
    at: ['village', 12, 7, 'up'], lvl: 9,
    player: { maxhp: 88, hp: 88, herbs: 5, maxHerbs: 5, gold: 260, weapon: 'crystal', armor: 'vest', sickle: true },
    q: { slimes: { s: 3, n: 3 }, biscuit: DONE, glowcap: DONE, king: DONE, shards: DONE },
    flags: { vines: true, metBram: true, shard1: true, shard2: true }, stats: { won: 52, slimes: 17, steps: 2900 },
  }),
};

// ------------------------------------------------------------------ heroes
const HEROES = [['michael', 'MICHAEL'], ['mohammed', 'MOHAMMED'], ['celine', 'CELINE'], ['alexandra', 'ALEXANDRA']];
const withHero = (fix, id) => ({ ...fix, player: { ...fix.player, hero: id } });

// The boss fight, played the same way whoever the hero is.
const bossFight = async (T, g) => {
  await T.continueGame();
  T.shot('before');
  await T.talk('boss');
  await T.untilBattle();
  T.shot('battle');
  T.state('battle-start');
  let shotCharge = false, shotRun = false;
  await T.fight((g) => {
    if (g.battle.charged && !shotCharge) { shotCharge = true; T.shot('puffed-up'); }
    if (!shotRun) { shotRun = true; return 2; } // try to run once: must be refused
    return g.player.hp < 35 && g.player.herbs > 0 ? 1 : 0;
  });
  T.check('saw the boss puff up', shotCharge);
  T.state('won');
  T.shot('after');
  await T.menuShot('status');
};
const woodsFights = async (T, g) => {
  await T.continueGame();
  await T.wander();
  T.shot('battle');
  await T.fight();
  for (let i = 0; i < 5; i++) { await T.wander(); await T.fight(); }
  T.state('after-battles');
};
const reportVictory = async (T, g) => {
  await T.continueGame();
  await T.talk('elder');
  await T.until(() => g.mode === 'victory', 'victory screen');
  await T.frames(120);
  T.shot('victory');
  await T.tap('Space');
  await T.until(() => g.mode === 'world', 'world after victory');
  await T.frames(40);
  T.state('after-victory');
  for (let i = 1; i <= 6; i++) await T.talk(`elder-after-${i}`);
};

const heroScenarios = HEROES.flatMap(([id, name], index) => [
  {
    // New game as this hero, play a little, close the game, reopen it and continue.
    name: `hero-${id}-newgame`,
    run: [
      `async (T, g) => {
        await T.newGame(${index});
        T.check('new game is this hero', g.player.hero === '${id}', g.player.hero);
        T.check('the save records this hero', T.savedPlayer().hero === '${id}', T.savedPlayer().hero);
        const p = g.player;
        T.check('starting stats are the standard ones', p.lvl === 1 && p.hp === 30 && p.maxhp === 30 && p.atk === 6 && p.def === 1
          && p.xp === 0 && p.next === 12 && p.herbs === 3 && p.maxHerbs === 3 && p.gold === 0 && p.weapon === 'none' && p.armor === 'none');
        T.state('started');
        await T.dialog();
        await T.step('down', 3); T.shot('facing-down');
        await T.step('right', 3); T.shot('facing-right');
        await T.step('up'); T.shot('facing-up');
        await T.talk();
        await T.step('left'); T.shot('facing-left');
        await T.menuShot('status');
        T.check('still this hero after saving', T.savedPlayer().hero === '${id}' && g.q.slimes.s === 1);
        T.state('played');
      }`,
      `async (T, g) => {
        await T.continueGame();
        T.check('hero persists after reopening', g.player.hero === '${id}', g.player.hero);
        T.check('progress persists after reopening', g.q.slimes.s === 1 && g.player.map === 'village');
        T.shot('reopened');
        await T.menuShot('status-reopened');
        T.state('reopened');
      }`,
    ],
    sameAs: { started: 'hero-michael-newgame__started', played: 'hero-michael-newgame__played', reopened: 'hero-michael-newgame__reopened' },
  },
  { name: `hero-${id}-woods`, save: withHero(FIX.woods, id), run: woodsFights, sameAs: { 'after-battles': 'hero-michael-woods__after-battles' } },
  { name: `hero-${id}-boss`, save: withHero(FIX.boss, id), run: bossFight, sameAs: { 'battle-start': 'boss-win__battle-start', won: 'boss-win__won' } },
  { name: `hero-${id}-victory`, save: withHero(FIX.report, id), run: reportVictory, sameAs: { 'after-victory': 'victory__after-victory' } },
]);

const heroSelectScenarios = [
  {
    name: 'hero-select',
    run: async (T, g) => {
      await T.frames(30);
      await T.tap('Space', 6);
      T.check('NEW GAME opens hero selection', g.mode === 'heroSelect', g.mode);
      T.check('nothing is saved yet', localStorage.getItem('turnip-vale-save-v1') === null);
      T.shot('1-michael');
      await T.tap('ArrowRight', 6); T.shot('2-mohammed');
      await T.tap('ArrowRight', 6); T.shot('3-celine');
      await T.tap('ArrowRight', 6); T.shot('4-alexandra');
      await T.tap('ArrowRight', 6); T.shot('wraps-to-michael');
      await T.tap('ArrowLeft', 6); T.shot('wraps-to-alexandra');
      await T.tap('KeyX', 6);
      T.check('B goes back to the title', g.mode === 'title', g.mode);
      T.check('still nothing saved', localStorage.getItem('turnip-vale-save-v1') === null);
      T.shot('back-on-title');
      await T.tap('Space', 6);
      T.shot('reopened-on-michael');
    },
  },
  {
    // Choosing NEW GAME and backing out must leave an existing save exactly as it was.
    name: 'hero-select-keeps-save', save: FIX.boss,
    run: async (T, g) => {
      const before = localStorage.getItem('turnip-vale-save-v1');
      await T.frames(30);
      await T.tap('ArrowDown');
      await T.tap('Space', 6);
      T.check('hero selection is open', g.mode === 'heroSelect', g.mode);
      await T.tap('ArrowRight', 6); await T.tap('ArrowRight', 6);
      T.shot('choosing');
      await T.tap('Escape', 6);
      T.check('back on the title', g.mode === 'title', g.mode);
      T.check('the save is byte-for-byte unchanged', localStorage.getItem('turnip-vale-save-v1') === before);
      T.shot('title');
      await T.tap('ArrowUp');
      await T.tap('Space');
      await T.until(() => g.mode === 'world', 'world after CONTINUE');
      await T.frames(40);
      T.check('CONTINUE still loads the old game', g.player.map === 'cave' && g.player.lvl === 7 && g.player.weapon === 'iron' && g.player.hero === 'michael');
      T.state('continued');
    },
  },
];

// ------------------------------------------------------------------ encounters and enemy scaling
// Long runs of random battles. Every battle's enemy and scaled stats are recorded, so any change to
// which enemy appears, how often, or how enemies grow with the hero's level shows up as a difference.
// The hero is given plenty of HP so the run never ends early; levels rise along the way, which takes
// the cave run across the level where cave enemies start to scale.
const manyBattles = (count) => `async (T, g) => {
  await T.continueGame();
  for (let i = 1; i <= ${count}; i++) {
    await T.wander();
    if (i === 1) T.shot('first-battle');
    T.state('battle-' + String(i).padStart(2, '0'));
    await T.fight();
  }
  T.state('end');
}`;
const tough = { maxhp: 400, hp: 400, weapon: 'crystal', armor: 'vest', sickle: true };
const encounterScenarios = [
  { // slime quest finished: normal woods odds
    name: 'encounters-woods', run: manyBattles(14),
    save: save({ at: ['forest', 3, 5, 'right'], lvl: 9, player: tough, q: { slimes: { s: 3, n: 3 }, glowcap: { s: 1 } } }),
  },
  { // slime quest active: slimes are more common
    name: 'encounters-woods-quest', run: manyBattles(10),
    save: save({ at: ['forest', 3, 5, 'right'], lvl: 1, player: tough, q: { slimes: { s: 1, n: 0 } }, tracked: 'slimes' }),
  },
  { // starts below the level where cave enemies begin to scale, and levels up past it
    name: 'encounters-cave', run: manyBattles(16),
    save: save({ at: ['cave', 10, 5, 'down'], lvl: 3, player: tough, q: { slimes: { s: 3, n: 3 }, king: { s: 1 } }, flags: { vines: true } }),
  },
];

// Sandra was replaced by Alexandra shortly after release. A save made as Sandra must carry on as
// Alexandra with every other field intact, and be written back as Alexandra from then on.
const sandraScenarios = [
  {
    name: 'hero-sandra-migrates', save: withHero(FIX.report, 'sandra'),
    run: [
      async (T, g) => {
        const before = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        await T.continueGame();
        T.check('a Sandra save loads as Alexandra', g.player.hero === 'alexandra', g.player.hero);
        const strip = (p) => JSON.stringify(Object.keys(p).filter((k) => k !== 'hero' && k !== 'weapons' && k !== 'armors').sort().map((k) => [k, p[k]]));
        T.check('every other player field is exactly as saved', strip(g.player) === strip(before.player));
        T.check('quests, flags and stats are exactly as saved', T.questsKept(g.q, before.q) && JSON.stringify([g.flags, g.stats]) === JSON.stringify([before.flags, before.stats]));
        await T.menuShot('status');
        T.shot('village');
        await T.talk('elder');
        await T.until(() => g.mode === 'victory', 'victory screen');
        await T.frames(120);
        T.shot('victory');
        await T.tap('Space');
        await T.until(() => g.mode === 'world', 'world after victory');
        await T.frames(40);
        T.check('the next save is written as alexandra', T.savedPlayer().hero === 'alexandra', T.savedPlayer().hero);
        T.state('after-victory');
      },
      async (T, g) => {
        await T.continueGame();
        T.check('still Alexandra after reopening', g.player.hero === 'alexandra' && T.savedPlayer().hero === 'alexandra');
        T.check('progress kept after reopening', g.q.king.s === 3 && g.player.lvl === 8 && g.player.gold === 180);
        T.shot('reopened');
      },
    ],
    sameAs: { 'after-victory': 'victory__after-victory' },
  },
  { name: 'hero-sandra-boss', save: withHero(FIX.boss, 'sandra'), run: bossFight, sameAs: { 'battle-start': 'boss-win__battle-start', won: 'boss-win__won' } },
];

// ------------------------------------------------------------------ the vines (the first gate)
// Together with `vines-locked` and `vines` further down, these pin the vines' behaviour from every side:
// blocking with and without the sickle, both ways in, and a save where they were cut long ago.
const vinesCut = save({
  at: ['forest', 18, 4, 'up'], lvl: 4, player: { sickle: true, gold: 60 },
  q: { slimes: { s: 3, n: 3 }, king: { s: 1 } }, flags: { vines: true }, stats: { won: 9, slimes: 5, steps: 400 }, tracked: 'king',
});
const vineScenarios = [
  {
    name: 'vines-already-cut', save: vinesCut,
    run: async (T, g) => {
      await T.continueGame();
      T.check('the save still says the vines are cut', g.flags.vines === true);
      T.shot('open');
      await T.tap('Space', 8);
      T.check('nothing to interact with any more', g.mode === 'world', g.mode);
      await T.step('up');
      T.check('the hero can walk where the vines were', g.player.x === 18 && g.player.y === 3, `${g.player.x},${g.player.y}`);
      T.shot('standing-on-it');
      await T.step('right');
      await T.until(() => g.player.map === 'cave', 'cave');
      await T.frames(40);
      T.state('in-cave');
    },
  },
  {
    name: 'vines-block-without-sickle', save: FIX.vinesLocked,
    run: async (T, g) => {
      await T.continueGame();
      await T.step('up');
      T.check('blocked from below', g.player.x === 18 && g.player.y === 4, `${g.player.x},${g.player.y}`);
      T.check('still uncut', !g.flags.vines);
      T.shot('blocked');
      T.state('blocked');
    },
  },
  {
    name: 'vines-from-above', save: save({ at: ['forest', 18, 2, 'down'], lvl: 2, q: { slimes: { s: 1, n: 1 } }, tracked: 'slimes' }),
    run: async (T, g) => {
      await T.continueGame();
      await T.step('down');
      T.check('blocked from above', g.player.x === 18 && g.player.y === 2, `${g.player.x},${g.player.y}`);
      await T.talk('locked');
      T.check('still uncut', !g.flags.vines);
      T.state('blocked');
    },
  },
  {
    name: 'vines-block-until-cut', save: FIX.vines,
    run: async (T, g) => {
      await T.continueGame();
      await T.step('up');
      T.check('having the sickle is not enough: they block until cut', g.player.x === 18 && g.player.y === 4, `${g.player.x},${g.player.y}`);
      await T.talk('cut');
      T.check('cutting sets the vines flag', g.flags.vines === true);
      T.check('cutting saves the game', JSON.parse(localStorage.getItem('turnip-vale-save-v1')).flags.vines === true);
      await T.step('up');
      T.check('the way is open afterwards', g.player.x === 18 && g.player.y === 3, `${g.player.x},${g.player.y}`);
      T.shot('through');
      T.state('through');
    },
  },
];

// ------------------------------------------------------------------ the Dadda Boss fight in detail
// These record a frame-by-frame log of whole fights (see startLog in shim.js) plus screenshots at every
// turn, every hit and during the special moments, so the boss's exact behaviour is pinned down:
// turn order, the puff-up turn, the Belly Flop and its damage, the wobble, no running, rewards, aftermath.
const daddaWin = async (T, g) => {
  await T.continueGame();
  T.startLog();
  await T.talk('boss');
  T.shot('flash-1'); await T.frames(5); T.shot('flash-2'); await T.frames(5); T.shot('flash-3');
  await T.untilBattle();
  let turn = 0, hits = 0, ranCharged = false;
  T.onLog = (e) => {
    if (e[1] === 'heroHp') T.shot(`hit-${String(++hits).padStart(2, '0')}`);
    if (e[1] === 'enemyHp' && e[2] === 0) { T.shotAfter(8, 'melting-1'); T.shotAfter(30, 'melting-2'); }
    if (e[1] === 'charged' && e[2] === true) T.shotAfter(20, 'puffing');
  };
  await T.fight((g) => {
    T.shot(`turn-${String(++turn).padStart(2, '0')}`);
    if (turn === 1) return 2; // running must be refused
    if (g.battle.charged && !ranCharged) { ranCharged = true; return 2; } // also while she is puffed up
    return g.player.hp < 35 && g.player.herbs > 0 ? 1 : 0;
  });
  const msgs = T.log.filter((e) => e[1] === 'msg').map((e) => e[2]);
  const has = (t) => msgs.includes(t);
  T.check('running was refused', msgs.filter((m) => m === "There's no escape from the Dadda Boss!").length === 2);
  T.check('she puffed up', has('The DADDA BOSS puffs up huge! Brace yourself!'));
  T.check('she belly-flopped', has('BELLY FLOP!!'));
  T.check('she wobbled', has('The DADDA BOSS is wobbling!'));
  T.check('defeat and aftermath messages', has('The DADDA BOSS melts into a puddle!') && has('The cave falls quiet. Return to Elder Moss!'));
  T.check('reward message', has('You gain 80 XP and 100 gold.'));
  T.check('boss quest is ready to turn in', g.q.king.s === 2, g.q.king.s);
  T.check('back in the cave', g.mode === 'world' && g.player.map === 'cave');
  T.state('won');
  T.endLog('log');
  T.shot('after');
  await T.menuShot('status');
};
const daddaScenarios = [
  { // a prepared hero wins, and the 80 XP is enough for a level-up
    name: 'dadda-win', run: daddaWin,
    save: { ...FIX.boss, player: { ...FIX.boss.player, xp: 100 } },
  },
  { // a hero who is not ready loses to the Belly Flop
    name: 'dadda-lose',
    save: save({
      at: ['cave', 10, 3, 'up'], lvl: 3, player: { herbs: 0, sickle: true, gold: 25 },
      q: { slimes: { s: 3, n: 3 }, king: { s: 1 } }, flags: { vines: true }, tracked: 'king',
    }),
    run: async (T, g) => {
      await T.continueGame();
      T.startLog();
      await T.talk();
      await T.untilBattle();
      let hits = 0;
      T.onLog = (e) => { if (e[1] === 'heroHp') T.shot(`hit-${++hits}`); };
      await T.fight();
      const msgs = T.log.filter((e) => e[1] === 'msg').map((e) => e[2]);
      T.check('lost to the Belly Flop', msgs.indexOf('You collapse...') > msgs.indexOf('BELLY FLOP!!') && msgs.includes('BELLY FLOP!!'));
      T.check('carried back to the village', g.player.map === 'village' && g.player.hp === g.player.maxhp);
      T.check('the boss quest is still open', g.q.king.s === 1, g.q.king.s);
      T.check('gold and XP are kept', g.player.gold === 25);
      await T.dialog('wren');
      T.state('lost');
      T.endLog('log');
    },
  },
  { // a very long fight: dozens of turns of the three-turn pattern, with only weak hits from the hero
    name: 'dadda-long',
    save: save({
      at: ['cave', 10, 3, 'up'], lvl: 1, player: { maxhp: 3000, hp: 3000, herbs: 5, maxHerbs: 5, sickle: true },
      q: { slimes: { s: 3, n: 3 }, king: { s: 1 } }, flags: { vines: true }, tracked: 'king',
    }),
    run: async (T, g) => {
      await T.continueGame();
      T.startLog();
      await T.talk();
      await T.untilBattle();
      await T.fight();
      const flops = T.log.filter((e) => e[1] === 'msg' && e[2] === 'BELLY FLOP!!').length;
      T.check('many belly flops happened', flops >= 10, flops);
      T.check('won in the end', g.q.king.s === 2);
      T.state('won');
      T.endLog('log');
    },
  },
  { // ordinary battles, logged the same way: attacking, running away, healing, and the white encounter flash
    name: 'battle-detail-woods', save: FIX.woods,
    run: async (T, g) => {
      await T.continueGame();
      T.startLog();
      walking: for (;;) {
        for (const d of ['right', 'left']) {
          for (let k = 0; k < 6; k++) {
            const before = g.player.sinceBattle;
            await T.step(d);
            if (before > 0 && g.player.sinceBattle === 0) break walking;
          }
        }
      }
      T.shot('flash-1'); await T.frames(5); T.shot('flash-2'); await T.frames(5); T.shot('flash-3');
      await T.untilBattle();
      let turn = 0;
      await T.fight((g) => { T.shot(`first-turn-${++turn}`); return 0; });
      for (let i = 0; i < 4; i++) { await T.wander(); await T.fight(() => 2); } // keep trying to run
      await T.wander(); await T.fight((g) => (g.battle.turn === 0 ? 1 : 0)); // try to heal at full HP first
      await T.wander(); await T.fight((g) => (g.player.hp < g.player.maxhp && g.player.herbs > 0 ? 1 : 0));
      await T.wander(); await T.fight();
      T.state('end');
      T.endLog('log');
    },
  },
];

// ------------------------------------------------------------------ quests
// Every quest step that the older scenarios do not already play: accepting, turning in, rewards,
// collecting shards, and the fix-ups for saves made mid-conversation.
const slimesDone = { s: 3, n: 3 };
const talkAndRecord = (label) => `async (T, g) => {
  await T.continueGame();
  T.shot('before');
  await T.talk('${label}');
  if (g.mode === 'shop') { T.shot('shop'); await T.tap('KeyX', 6); }
  await T.frames(20);
  T.shot('after');
  T.state('after');
  await T.menuShot('log');
}`;
const questFlowScenarios = [
  { // Slime Trouble turn-in: 30 gold, then the boss quest and the Old Sickle in the same conversation
    name: 'quest-slimes-turn-in', run: talkAndRecord('elder'),
    save: save({ at: ['village', 8, 7, 'up'], lvl: 2, player: { gold: 14 }, q: { slimes: { s: 2, n: 3 } }, stats: { won: 3, slimes: 3, steps: 200 }, tracked: 'slimes' }),
  },
  { // a save made between the two halves of that conversation: the boss quest is offered again
    name: 'quest-king-offered-again', run: talkAndRecord('elder'),
    save: save({ at: ['village', 8, 7, 'up'], lvl: 2, player: { gold: 44 }, q: { slimes: slimesDone } }),
  },
  { name: 'quest-biscuit-accept', run: talkAndRecord('pip'), save: save({ at: ['village', 8, 11, 'left'] }) },
  { name: 'quest-glowcap-accept', run: talkAndRecord('wren'), save: save({ at: ['village', 13, 4, 'right'], player: { hp: 12, herbs: 1 } }) },
  { // Biscuit will not come along before Pip has asked
    name: 'quest-cat-before-asking', run: talkAndRecord('cat'), save: save({ at: ['forest', 16, 13, 'up'] }),
  },
  { // Bram before the boss quest: only the shop
    name: 'quest-bram-before-boss-quest', run: talkAndRecord('bram'), save: save({ at: ['village', 8, 9, 'left'], player: { gold: 50 } }),
  },
  { // a save holding both shards with Crystal Edge still marked active: Bram fixes it up and forges the sword
    name: 'quest-shards-fix-up', run: talkAndRecord('bram'),
    save: save({
      at: ['village', 8, 9, 'left'], lvl: 5, player: { sickle: true, shards: 2, weapon: 'iron' },
      q: { slimes: slimesDone, king: { s: 1 }, shards: { s: 1 } }, flags: { vines: true, metBram: true, shard1: true, shard2: true }, tracked: 'shards',
    }),
  },
  { // picking up the second shard while Crystal Edge is active makes it ready
    name: 'quest-shard-pickup',
    save: save({
      at: ['cave', 16, 3, 'right'], lvl: 5, player: { sickle: true, shards: 1 },
      q: { slimes: slimesDone, king: { s: 1 }, shards: { s: 1 } }, flags: { vines: true, metBram: true, shard2: true }, tracked: 'shards',
    }),
    run: async (T, g) => {
      await T.continueGame();
      T.shot('before');
      await T.step('right');
      await T.dialog('found');
      T.shot('after');
      T.state('after');
      await T.menuShot('log');
    },
  },
  { // picking up a shard before Bram has asked for them
    name: 'quest-shard-pickup-early',
    save: save({ at: ['cave', 16, 3, 'right'], lvl: 5, player: { sickle: true }, q: { slimes: slimesDone, king: { s: 1 } }, flags: { vines: true }, tracked: 'king' }),
    run: async (T, g) => {
      await T.continueGame();
      await T.step('right');
      await T.dialog('found');
      T.shot('after');
      T.state('after');
      await T.menuShot('log');
    },
  },
];

// The HUD tracker and the quest log for every quest in every state they can show.
const questViews = {
  none: {},
  'slimes-0': { q: { slimes: { s: 1, n: 0 } }, tracked: 'slimes' },
  'slimes-2': { q: { slimes: { s: 1, n: 2 } }, tracked: 'slimes' },
  'slimes-ready': { q: { slimes: { s: 2, n: 3 } }, tracked: 'slimes' },
  'biscuit-active': { q: { slimes: { s: 1, n: 1 }, biscuit: { s: 1 } }, tracked: 'biscuit' },
  'biscuit-ready': { q: { slimes: { s: 1, n: 1 }, biscuit: { s: 2 } }, tracked: 'biscuit' },
  'glowcap-1': { player: { glowcaps: 1 }, q: { glowcap: { s: 1 } }, tracked: 'glowcap' },
  'glowcap-ready': { player: { glowcaps: 3 }, q: { glowcap: { s: 2 } }, tracked: 'glowcap' },
  'king-active': { player: { sickle: true }, q: { slimes: slimesDone, king: { s: 1 } }, tracked: 'king' },
  'king-ready': { player: { sickle: true }, q: { slimes: slimesDone, king: { s: 2 } }, tracked: 'king' },
  'shards-1': { player: { sickle: true, shards: 1 }, q: { slimes: slimesDone, king: { s: 1 }, shards: { s: 1 } }, tracked: 'shards' },
  'shards-ready': { player: { sickle: true, shards: 2 }, q: { slimes: slimesDone, king: { s: 1 }, shards: { s: 2 } }, tracked: 'shards' },
  'all-active-untracked': { player: { sickle: true, glowcaps: 2, shards: 1 }, q: { slimes: { s: 1, n: 1 }, biscuit: { s: 1 }, glowcap: { s: 1 }, king: { s: 1 }, shards: { s: 1 } } },
  'all-ready': { player: { sickle: true, glowcaps: 3, shards: 2 }, q: { slimes: { s: 2, n: 3 }, biscuit: { s: 2 }, glowcap: { s: 2 }, king: { s: 2 }, shards: { s: 2 } }, tracked: 'glowcap' },
  'tracked-quest-is-done': { q: { slimes: slimesDone, biscuit: { s: 1 } }, tracked: 'slimes' },
  mixed: { player: { sickle: true, glowcaps: 2 }, q: { slimes: slimesDone, biscuit: { s: 2 }, glowcap: { s: 1 }, king: { s: 1 } }, tracked: 'king' },
  'all-done': { player: { sickle: true, weapon: 'crystal' }, q: { slimes: slimesDone, biscuit: DONE, glowcap: DONE, king: DONE, shards: DONE } },
};
const questViewScenarios = Object.entries(questViews).map(([label, v]) => ({
  name: `quest-view-${label}`,
  save: save({ at: ['village', 5, 5, 'down'], lvl: 3, ...v }),
  run: async (T) => { await T.continueGame(); T.shot('hud'); await T.menuShot('log'); T.state('loaded'); },
}));

// ------------------------------------------------------------------ quest log paging
// The game has five quests, so these add made-up quests at run time (see addTestQuests in shim.js).
const allFive = save({
  at: ['village', 5, 5, 'down'], lvl: 6, player: { sickle: true, glowcaps: 2, shards: 1 },
  q: { slimes: slimesDone, biscuit: { s: 2 }, glowcap: { s: 1 }, king: { s: 1 }, shards: { s: 1 } }, flags: { vines: true }, tracked: 'king',
});
const pagingScenarios = [
  { // exactly five quests: one page, no page marker, and the direction keys do nothing
    name: 'paging-5-quests', save: allFive,
    run: async (T, g) => {
      await T.continueGame();
      await T.tap('KeyX', 6);
      T.shot('log');
      for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown']) await T.tap(k, 4);
      T.check('still on the only page', g.menuPage === 0 && g.mode === 'menu', g.menuPage);
      T.shot('log-after-direction-keys');
      await T.tap('KeyX', 6);
      T.check('closed', g.mode === 'world');
    },
  },
  { // six quests: a second page appears
    name: 'paging-6-quests', save: allFive,
    run: async (T, g) => {
      await T.continueGame();
      T.addTestQuests(1);
      await T.tap('KeyX', 6);
      T.check('opens on the page with the tracked quest', g.menuPage === 0 && g.tracked === 'king', `${g.menuPage} ${g.tracked}`);
      T.shot('page-1');
      await T.tap('ArrowRight', 6);
      T.check('right goes to page 2', g.menuPage === 1, g.menuPage);
      T.shot('page-2');
      await T.tap('ArrowRight', 6);
      T.check('right wraps to page 1', g.menuPage === 0, g.menuPage);
      await T.tap('ArrowLeft', 6);
      T.check('left wraps to page 2', g.menuPage === 1, g.menuPage);
      await T.tap('ArrowLeft', 6);
      T.check('left goes back', g.menuPage === 0, g.menuPage);
      await T.tap('ArrowRight', 6);
      T.check('right goes forward', g.menuPage === 1, g.menuPage);
      await T.tap('ArrowUp', 6);
      T.check('up moves the cursor, not the page', g.menuPage === 1 && g.menuSel === 1, g.menuPage + ' ' + g.menuSel);
      await T.tap('ArrowLeft', 6); await T.tap('ArrowRight', 6);
      T.check('the pages still turn while the cursor is up there', g.menuPage === 1 && g.menuSel === 1, g.menuPage);
      await T.tap('ArrowDown', 6);
      T.check('down puts it back on SAVE', g.menuPage === 1 && g.menuSel === 2, g.menuPage + ' ' + g.menuSel);
      await T.tap('Space', 6);
      T.check('the action button saves and leaves the log open', g.mode === 'menu' && g.menuPage === 1, g.mode);
      await T.tap('KeyX', 6);
      T.check('X closes the log', g.mode === 'world', g.mode);
      await T.tap('KeyX', 6);
      T.check('reopens on the tracked page', g.mode === 'menu' && g.menuPage === 0);
      await T.tap('Escape', 6);
      T.check('the menu button closes the log', g.mode === 'world', g.mode);
      await T.step('down');
      T.check('the hero can walk again', g.player.y === 6, g.player.y);
    },
  },
  { // twelve quests: three pages; the tracked quest is on the last one
    name: 'paging-12-quests', save: { ...allFive, q: { ...allFive.q, glowcap: DONE, king: DONE, shards: DONE, biscuit: DONE }, tracked: null },
    run: async (T, g) => {
      await T.continueGame();
      T.addTestQuests(7);
      await T.frames(2);
      T.shot('hud');
      await T.tap('KeyX', 6);
      T.check('opens on the page of the first unfinished quest', g.menuPage === 1 && g.tracked === 'test1', `${g.menuPage} ${g.tracked}`);
      T.shot('opened-on-page-2');
      await T.tap('ArrowLeft', 6); T.shot('page-1');
      await T.tap('ArrowRight', 6); await T.tap('ArrowRight', 6);
      T.check('page 3 reached', g.menuPage === 2, g.menuPage);
      T.shot('page-3');
      await T.tap('ArrowRight', 6);
      T.check('wraps from page 3 to page 1', g.menuPage === 0, g.menuPage);
      await T.tap('ArrowLeft', 6);
      T.check('wraps from page 1 to page 3', g.menuPage === 2, g.menuPage);
      await T.tap('KeyX', 6);
    },
  },
  { // the same with the on-screen buttons used on phones
    name: 'paging-touch', save: allFive,
    run: async (T, g) => {
      await T.continueGame();
      T.addTestQuests(7);
      await T.touch('b');
      T.check('B opens the log', g.mode === 'menu' && g.menuPage === 0, `${g.mode} ${g.menuPage}`);
      await T.touch('right');
      T.check('right arrow: page 2', g.menuPage === 1, g.menuPage);
      await T.touch('right');
      T.check('right arrow again: page 3', g.menuPage === 2, g.menuPage);
      T.shot('page-3');
      await T.touch('left');
      T.check('left arrow: page 2', g.menuPage === 1, g.menuPage);
      await T.touch('left');
      T.check('left arrow: page 1', g.menuPage === 0, g.menuPage);
      await T.touch('left');
      T.check('left arrow wraps to page 3', g.menuPage === 2, g.menuPage);
      await T.touch('a');
      T.check('A saves and leaves the log open', g.mode === 'menu' && g.menuPage === 2, g.mode);
      await T.touch('b');
      T.check('B closes the log', g.mode === 'world', g.mode);
      await T.touch('b'); await T.touch('b');
      T.check('B opens and closes it', g.mode === 'world', g.mode);
      await T.touch('down', 20);
      T.check('the arrows walk again afterwards', g.player.y === 6, g.player.y);
    },
  },
  { // the victory screen counts however many quests exist
    name: 'paging-victory-count', save: FIX.report,
    run: async (T, g) => {
      await T.continueGame();
      T.addTestQuests(7);
      T.vestliIsLastChapter(); // the victory screen only follows the last chapter
      await T.talk();
      await T.until(() => g.mode === 'victory', 'victory screen');
      await T.frames(120);
      T.shot('victory');
    },
  },
];

// Saves written by other versions of the game: quests missing, quest fields missing, or quests this
// version has never heard of. All must load, play and save without losing what they hold.
const questSaveScenarios = [
  {
    name: 'quest-save-missing-quests',
    save: { ...FIX.fresh, q: { slimes: { s: 1, n: 2 } }, tracked: 'slimes' },
    run: async (T, g) => {
      await T.continueGame();
      T.check('saved quest kept', g.q.slimes.s === 1 && g.q.slimes.n === 2);
      T.check('missing quests start fresh', ['biscuit', 'glowcap', 'king', 'shards'].every((id) => g.q[id] && g.q[id].s === 0));
      await T.menuShot('log');
      await T.talk();
      T.state('after-talk');
    },
  },
  {
    name: 'quest-save-missing-field',
    save: { ...FIX.fresh, q: { ...FIX.fresh.q, slimes: { s: 1 } }, tracked: 'slimes' },
    run: async (T, g) => {
      await T.continueGame();
      T.check('the missing counter starts at 0', g.q.slimes.n === 0, g.q.slimes.n);
      T.shot('hud');
      await T.menuShot('log');
    },
  },
  {
    name: 'quest-save-unknown-quest',
    save: { ...FIX.report, q: { ...FIX.report.q, kebab1: { s: 1, found: 2 } } },
    run: async (T, g) => {
      await T.continueGame();
      T.check('known quests intact', g.q.king.s === 2 && g.q.shards.s === 2 && g.q.slimes.n === 3);
      await T.menuShot('log');
      await T.talk();
      await T.until(() => g.mode === 'victory', 'victory screen');
      await T.frames(120);
      await T.tap('Space');
      await T.until(() => g.mode === 'world', 'world');
      await T.frames(40);
      const saved = JSON.parse(localStorage.getItem('turnip-vale-save-v1')).q;
      T.check('the unknown quest is kept in the save untouched', JSON.stringify(saved.kebab1) === '{"s":1,"found":2}', JSON.stringify(saved.kebab1));
      T.check('the game carried on normally', saved.king.s === 3);
    },
  },
];

// Chapters. Vestli is Chapter 1. Turning in the Dadda quest hands over Crystal Fragment 1 and the Red
// Key, ends the chapter and unlocks Stovner, which is defined but not built. The scenarios named
// "...victory" elsewhere in this file now end on the chapter screen too; the real victory screen is
// reached here by removing the unbuilt chapters at run time.
// (Scenario code runs inside the page, so shared pieces are source text.)
const SAVED = `JSON.parse(localStorage.getItem('turnip-vale-save-v1'))`;
const chapterEnd = (close) => `async (T, g) => {
  await T.continueGame();
  T.check('in chapter 1 before the turn-in, nothing awarded', g.chapter === 0 && !g.storyDone && !g.flags.fragment1 && !g.flags.redKey, g.chapter);
  await T.talk('elder');
  await T.until(() => g.mode === 'victory', 'chapter screen');
  const auto = ${SAVED};
  T.check('fragment and key awarded', g.flags.fragment1 === true && g.flags.redKey === true);
  T.check('autosaved before the chapter screen', auto.flags.fragment1 === true && auto.flags.redKey === true && auto.q.king.s === 3);
  T.check('now in chapter 2, story not over', g.chapter === 1 && !g.storyDone, g.chapter);
  await T.frames(30);
  await T.tap('Space');
  T.check('cannot be skipped in the first moments', g.mode === 'victory', g.mode);
  await T.frames(120);
  T.shot('chapter-complete');
  await ${close};
  await T.until(() => g.mode === 'world', 'world after the chapter screen');
  await T.frames(40);
  T.shot('world');
  T.check('no chapter is written to the save', Object.keys(${SAVED}).sort().join() === 'flags,player,q,stats,tracked,v');
  T.state('after');
  const flags = JSON.stringify(g.flags), gold = g.player.gold;
  await T.talk('elder-after');
  for (let i = 0; i < 5; i++) await T.talk();
  T.check('talking to Elder Moss again gives nothing more', JSON.stringify(g.flags) === flags && g.player.gold === gold && g.mode === 'world');
  T.check('exactly one fragment and one key', Object.keys(g.flags).filter((k) => /^fragment/.test(k)).join() === 'fragment1' && g.flags.redKey === true);
  await T.menuShot('status');
}`;
const atElder = (fix) => ({ ...fix, player: { ...fix.player, map: 'village', x: 8, y: 7, fx: 8, fy: 7, tx: 8, ty: 7, dir: 'up' } });
const chapterScenarios = [
  {
    name: 'chapter-fresh', save: FIX.fresh,
    run: async (T, g) => {
      await T.continueGame();
      T.check('six chapters defined: Vestli, Stovner, Ammerud, Grorud, Veitvet, then Oslo S without a boss quest', JSON.stringify(g.CHAPTERS) === '[{"name":"VESTLI","quest":"king"},{"name":"STOVNER","quest":"mohsin"},{"name":"AMMERUD","quest":"trouble"},{"name":"GRORUD","quest":"power"},{"name":"VEITVET","quest":"signal"},{"name":"OSLO S","quest":null}]', JSON.stringify(g.CHAPTERS));
      T.check('a new game is in chapter 1', g.chapter === 0 && !g.storyDone, g.chapter);
      T.check('no fragment, key or open gate', !g.flags.fragment1 && !g.flags.redKey && !g.flags.redGate);
      T.check('nothing in the game uses a quest called null', !('null' in g.q) && !g.QUEST_ORDER.includes('null'));
    },
  },
  {
    name: 'chapter-boss-beaten', save: FIX.report,
    run: async (T, g) => {
      await T.continueGame();
      T.check('beating the boss alone does not end the chapter', g.chapter === 0 && !g.storyDone, g.chapter);
      T.check('nor does it award anything', !g.flags.fragment1 && !g.flags.redKey);
    },
  },
  { // a save that finished the one-chapter game: untouched by loading, and the story is no longer over
    name: 'chapter-finished', save: FIX.finished,
    run: `async (T, g) => {
      const before = localStorage.getItem('turnip-vale-save-v1');
      await T.continueGame();
      T.check('Vestli is done, Stovner is next, the story is not over', g.chapter === 1 && !g.storyDone, g.chapter);
      T.check('loading awards nothing by itself', !g.flags.fragment1 && !g.flags.redKey);
      await T.step('left');
      T.check('loading and walking change nothing in the save', localStorage.getItem('turnip-vale-save-v1') === before);
    }`,
  },
  { // the real victory screen still follows the last chapter (unbuilt chapters removed for the test)
    name: 'chapter-final-victory', save: FIX.report,
    run: async (T, g) => {
      await T.continueGame();
      T.vestliIsLastChapter();
      await T.talk();
      await T.until(() => g.mode === 'victory', 'victory screen');
      T.check('the story is complete', g.storyDone && g.chapter === 0, g.chapter);
      T.check('fragment and key are still handed over', g.flags.fragment1 === true && g.flags.redKey === true);
      await T.frames(120);
      T.shot('victory');
      await T.tap('Space');
      await T.until(() => g.mode === 'world', 'world after victory');
      await T.frames(40);
      T.state('after');
    },
    sameAs: { after: 'victory__after-victory' },
  },
  { // ...and also when an earlier, finished chapter comes before it
    name: 'chapter-last-of-two', save: FIX.report,
    run: async (T, g) => {
      await T.continueGame();
      T.vestliIsLastChapter();
      T.addTestChapter(true);
      T.check('in chapter 2 of 2', g.chapter === 1 && !g.storyDone, g.chapter);
      await T.talk();
      await T.until(() => g.mode === 'victory', 'victory screen');
      await T.frames(120);
      T.shot('victory');
      T.check('story complete', g.storyDone);
    },
  },
  { name: 'chapter-complete', save: FIX.report, run: chapterEnd(`T.tap('Space')`), sameAs: { after: 'victory__after-victory' } },
  { name: 'chapter-complete-touch', save: FIX.report, run: chapterEnd(`T.touch('a')`), sameAs: { after: 'victory__after-victory' } },
  { name: 'chapter-complete-alexandra', save: withHero(FIX.report, 'alexandra'), run: chapterEnd(`T.tap('Space')`), sameAs: { after: 'victory__after-victory' } },
  { // a save made by a version with more chapters still loads here
    name: 'chapter-save-unknown-boss-quest',
    save: { ...FIX.finished, q: { ...FIX.finished.q, marcus: { s: 2 } } },
    run: async (T, g) => {
      await T.continueGame();
      T.check('loads into chapter 2 with the unknown quest kept', g.chapter === 1 && !g.storyDone && g.q.marcus.s === 2);
      await T.menuShot('log');
    },
  },
  { // a save from before the boss fight: win, go back to Elder Moss, finish the chapter
    name: 'chapter-from-before-boss', save: FIX.boss,
    run: async (T, g) => {
      await T.continueGame();
      await T.talk();
      await T.untilBattle();
      await T.fight((g) => (g.player.hp < 35 && g.player.herbs > 0 ? 1 : 0));
      T.check('boss beaten, quest ready, nothing awarded yet', g.q.king.s === 2 && !g.flags.fragment1 && !g.flags.redKey && g.chapter === 0);
      T.place('village', 8, 7, 'up'); // skip the walk home
      await T.frames(10);
      await T.talk('elder');
      await T.until(() => g.mode === 'victory', 'chapter screen');
      await T.frames(120);
      T.shot('chapter-complete');
      await T.tap('Space');
      await T.until(() => g.mode === 'world', 'world');
      await T.frames(40);
      const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
      T.check('chapter finished and saved', d.q.king.s === 3 && d.flags.fragment1 === true && d.flags.redKey === true && g.chapter === 1);
      T.check('battle rewards kept', g.player.gold === 140 && g.player.lvl >= 7, g.player.gold);
      T.state('after');
    },
  },
  { // a save that finished the one-chapter game: Elder Moss has news, and hands the fragment and key over once
    name: 'chapter-old-finished-save', save: atElder(FIX.finished),
    run: [
      async (T, g) => {
        const before = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        await T.continueGame();
        T.shot('elder-has-news');
        await T.talk('elder');
        await T.until(() => g.mode === 'victory', 'chapter screen');
        await T.frames(120);
        T.shot('chapter-complete');
        await T.tap('Space');
        await T.until(() => g.mode === 'world', 'world');
        await T.frames(40);
        const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        T.check('fragment and key handed over and saved', d.flags.fragment1 === true && d.flags.redKey === true);
        T.check('old flags kept', ['vines', 'metBram', 'shard1', 'shard2'].every((k) => d.flags[k] === true) && Object.keys(d.flags).length === 6, Object.keys(d.flags).join());
        const strip = (p) => JSON.stringify(Object.keys(p).filter((k) => k !== 'hero' && k !== 'weapons' && k !== 'armors').sort().map((k) => [k, p[k]]));
        T.check('player, quests and stats exactly as they were', strip(d.player) === strip(before.player) && T.questsKept(d.q, before.q) && JSON.stringify(d.stats) === JSON.stringify(before.stats));
        T.state('after');
        T.shot('no-more-news');
        await T.talk('elder-after');
        T.check('nothing is handed over twice', JSON.stringify(g.flags) === JSON.stringify(d.flags));
      },
      async (T, g) => {
        await T.continueGame();
        T.check('still held after reopening', g.flags.fragment1 === true && g.flags.redKey === true && g.chapter === 1);
        await T.talk('elder-reopened');
        T.check('and still only once', Object.keys(g.flags).length === 6, Object.keys(g.flags).join());
        await T.menuShot('status');
      },
    ],
  },
  { // the game is closed in the middle of Elder Moss's speech, after the quest is done but before the hand-over
    name: 'chapter-closed-mid-conversation', save: FIX.report,
    run: [
      async (T, g) => {
        await T.continueGame();
        await T.tap('Space', 3);
        for (let i = 0; i < 2; i++) { await T.frames(150); await T.tap('Space', 3); }
        T.check('quest turned in, hand-over still being spoken', g.mode === 'dialog' && g.q.king.s === 3 && !g.flags.fragment1 && !g.flags.redKey);
        const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        T.check('that is what the save holds', d.q.king.s === 3 && !d.flags.fragment1 && !d.flags.redKey);
        await T.frames(150); await T.tap('Space', 3);
        T.shot('closed-here');
      },
      async (T, g) => {
        await T.continueGame();
        T.check('reopened without fragment or key', g.q.king.s === 3 && !g.flags.fragment1 && !g.flags.redKey);
        T.shot('elder-has-news');
        await T.talk('elder');
        await T.until(() => g.mode === 'victory', 'chapter screen');
        await T.frames(120);
        await T.tap('Space');
        await T.until(() => g.mode === 'world', 'world');
        await T.frames(40);
        T.check('handed over after all, once', g.flags.fragment1 === true && g.flags.redKey === true);
        T.state('after');
        await T.talk();
        T.check('and not again', Object.keys(g.flags).filter((k) => /^fragment|Key$/.test(k)).join() === 'fragment1,redKey');
      },
    ],
    sameAs: { after: 'victory__after-victory' },
  },
];

// The old gate to Stovner in the village's west wall.
const chapterOneDone = {
  ...FIX.finished, player: { ...FIX.finished.player, x: 1, fx: 1, tx: 1, dir: 'left' },
  flags: { ...FIX.finished.flags, fragment1: true, redKey: true },
};
const gateScenarios = [
  { // without the key
    name: 'stovner-gate-locked', save: FIX.fresh,
    run: async (T, g) => {
      const before = localStorage.getItem('turnip-vale-save-v1');
      await T.continueGame();
      await T.step('left', 7);
      T.check('standing at the gate', g.player.x === 1 && g.player.y === 7, g.player.x);
      T.shot('gate');
      await T.talk('locked');
      await T.step('left');
      T.check('the gate stays shut', g.player.x === 1 && !g.flags.redGate && g.mode === 'world');
      T.check('nothing saved', localStorage.getItem('turnip-vale-save-v1') === before);
    },
  },
  { // finish the chapter, walk to the gate, unlock it, save by hand, reopen
    name: 'stovner-gate', save: FIX.report,
    run: [
      async (T, g) => {
        await T.continueGame();
        await T.talk();
        await T.until(() => g.mode === 'victory', 'chapter screen');
        await T.frames(120);
        await T.tap('Space');
        await T.until(() => g.mode === 'world', 'world');
        await T.frames(40);
        await T.step('left', 7);
        T.shot('locked');
        await T.talk('unlock');
        T.check('unlocked and autosaved', g.flags.redGate === true && JSON.parse(localStorage.getItem('turnip-vale-save-v1')).flags.redGate === true);
        T.check('the key is kept', g.flags.redKey === true);
        T.shot('unlocked');
        await T.step('right', 2);
        await T.tap('KeyX', 6); await T.tap('Space', 6);
        T.shot('manual-save');
        await T.tap('KeyX', 6);
        T.check('saved by hand after the chapter', JSON.parse(localStorage.getItem('turnip-vale-save-v1')).player.x === 3);
        await T.step('up');
        T.state('saved');
      },
      async (T, g) => {
        await T.frames(30);
        T.shot('title');
        await T.continueGame();
        T.check('back where the manual save was made', g.player.x === 3 && g.player.y === 7, g.player.x);
        T.check('fragment, key and gate persist', g.flags.fragment1 === true && g.flags.redKey === true && g.flags.redGate === true && g.chapter === 1);
        T.state('continued');
        await T.step('left', 2);
        T.shot('still-unlocked');
        await T.tap('Space', 6);
        T.check('the open gate has nothing more to say', g.mode === 'world', g.mode);
        await T.menuShot('status');
        await T.step('right', 7); await T.step('up');
        await T.talk('elder');
        T.check('the rest of the village still works', g.player.x === 8 && g.mode === 'world', g.player.x);
      },
    ],
  },
  { // the same with the on-screen buttons only
    name: 'stovner-gate-touch', save: chapterOneDone,
    run: async (T, g) => {
      await T.continueGame();
      await T.touch('a');
      T.check('A tries the gate', g.mode === 'dialog', g.mode);
      await T.frames(150);
      T.shot('unlock');
      await T.touch('a');
      await T.until(() => g.mode === 'world', 'world');
      T.check('unlocked', g.flags.redGate === true);
      await T.touch('left', 20);
      await T.until(() => g.player.map === 'stovner', 'Stovner');
      await T.frames(60);
      T.check('through the gate into Stovner', g.player.x === 24 && g.player.y === 9 && g.player.dir === 'left' && g.mode === 'world', g.player.x);
      await T.touch('b'); await T.touch('a');
      const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
      T.check('saved with the on-screen buttons', g.menuNote && g.menuNote.text === 'SAVED!' && d.flags.redGate === true && d.player.map === 'stovner');
      T.shot('saved');
      await T.touch('b');
      T.check('back in the world', g.mode === 'world', g.mode);
      await T.touch('right', 20);
      await T.until(() => g.player.map === 'village', 'the village');
      await T.frames(60);
      T.check('and back again', g.player.x === 1 && g.player.y === 7 && g.player.dir === 'right' && g.mode === 'world', g.player.x);
      T.shot('back');
    },
  },
];

// Stovner: the town behind the old gate and the open land north of it. Nothing happens there yet, so
// these check the travel, the boundaries and the saving.
const moved = (fix, map, x, y, dir) => ({ ...fix, player: { ...fix.player, map, x, y, fx: x, fy: y, tx: x, ty: y, dir } });
const gateOpen = { ...chapterOneDone, flags: { ...chapterOneDone.flags, redGate: true } };
const inHub = moved(gateOpen, 'stovner', 24, 9, 'left');
const inOuter = moved(gateOpen, 'stovnerOuter', 14, 18, 'up');
const stovnerScenarios = [
  { // the boss is beaten but not reported: no key, no way through
    name: 'stovner-gate-before-turn-in', save: FIX.report,
    run: async (T, g) => {
      await T.continueGame();
      await T.step('left', 7);
      await T.talk('locked');
      await T.step('left');
      T.check('the gate stays shut', g.player.x === 1 && g.player.map === 'village' && !g.flags.redGate && g.mode === 'world', g.player.x);
    },
  },
  { // holding the key is not enough: the gate has to be unlocked
    name: 'stovner-gate-key-unused', save: chapterOneDone,
    run: async (T, g) => {
      await T.continueGame();
      await T.step('left', 2);
      await T.frames(60);
      T.check('walking into the locked gate does nothing', g.player.x === 1 && g.player.map === 'village' && !g.flags.redGate && g.mode === 'world', g.player.x);
    },
  },
  { // there and back, three times over
    name: 'stovner-travel', save: gateOpen,
    run: [
      async (T, g) => {
        await T.continueGame();
        const saved = () => JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        const keep = JSON.stringify([g.q, g.flags]);
        for (let lap = 1; lap <= 3; lap++) {
          await T.step('left');
          await T.until(() => g.player.map === 'stovner', 'Stovner');
          if (lap === 1) { await T.frames(20); T.shot('arriving'); }
          await T.frames(60);
          T.check('lap ' + lap + ': arrives inside the east gate, facing in', g.player.x === 24 && g.player.y === 9 && g.player.dir === 'left' && g.mode === 'world', g.player.x + ',' + g.player.y);
          T.check('lap ' + lap + ': autosaved in Stovner', saved().player.map === 'stovner' && saved().player.x === 24 && saved().player.y === 9);
          T.check('lap ' + lap + ': Chapter 2, not finished', g.chapter === 1 && g.storyDone === false);
          if (lap === 1) { T.shot('stovner'); T.state('arrived'); }
          await T.frames(120);
          T.check('lap ' + lap + ': stays put', g.player.map === 'stovner' && g.player.x === 24);
          await T.step('right');
          await T.until(() => g.player.map === 'village', 'the village');
          await T.frames(60);
          T.check('lap ' + lap + ': back inside the west gate, facing in', g.player.x === 1 && g.player.y === 7 && g.player.dir === 'right' && g.mode === 'world', g.player.x + ',' + g.player.y);
          T.check('lap ' + lap + ': autosaved in the village', saved().player.map === 'village' && saved().player.x === 1);
          if (lap === 1) T.shot('back');
          await T.frames(120);
          T.check('lap ' + lap + ': stays put', g.player.map === 'village' && g.player.x === 1);
        }
        T.check('quests and flags untouched', JSON.stringify([g.q, g.flags]) === keep);
        T.check('six steps, no battles', g.stats.steps === 2906 && g.stats.won === 52, g.stats.steps);
        T.state('home');
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE returns to the village gate', g.player.map === 'village' && g.player.x === 1 && g.player.y === 7);
        T.state('continued');
      },
    ],
  },
  { // every road in the town, and each of its closed ways
    name: 'stovner-hub-tour', save: inHub,
    run: async (T, g) => {
      await T.continueGame();
      T.shot('east-gate');
      await T.step('up');
      await T.talk('east-sign');
      await T.step('left', 10); await T.step('up', 2); await T.step('left', 3);
      T.check('round the fountain', g.player.x === 11 && g.player.y === 7, g.player.x + ',' + g.player.y);
      T.shot('plaza');
      await T.step('down', 2); await T.step('left', 10);
      T.shot('west-gate');
      await T.talk('west-gate');
      await T.step('left');
      T.check('the west gate is shut', g.player.x === 1 && g.player.y === 9 && g.player.map === 'stovner', g.player.x);
      await T.step('right', 2); await T.step('down', 6); await T.step('right', 9); await T.step('down');
      T.check('the tunnel is barred', g.player.x === 12 && g.player.y === 15 && g.player.dir === 'down', g.player.x + ',' + g.player.y);
      T.shot('tunnel');
      await T.talk('tunnel');
      await T.step('right'); await T.step('down');
      T.check('both sides of it', g.player.x === 13 && g.player.y === 15, g.player.x + ',' + g.player.y);
      await T.talk('tunnel-right');
      await T.step('left'); await T.step('up', 5); await T.step('up');
      T.check('the fountain is in the way', g.player.x === 12 && g.player.y === 10, g.player.x + ',' + g.player.y);
      await T.step('left'); await T.step('up', 3); await T.step('right'); await T.step('up', 6); await T.step('left');
      T.check('at the north road', g.player.x === 12 && g.player.y === 1 && g.player.dir === 'left', g.player.x + ',' + g.player.y);
      T.shot('north-road');
      await T.talk('north-sign');
      T.check('no battles, no gifts, same chapter', g.stats.won === 52 && g.player.gold === 260 && g.chapter === 1 && Object.keys(g.flags).length === 7, Object.keys(g.flags).join());
      await T.step('up');
      await T.until(() => g.player.map === 'stovnerOuter', 'Outer Stovner');
      await T.frames(60);
      T.check('out onto the avenue', g.player.x === 14 && g.player.y === 18 && g.player.dir === 'up' && g.mode === 'world', g.player.x + ',' + g.player.y);
      T.shot('outer');
      T.state('outer');
    },
  },
  { // both loops of the outer land, the barricade, and home again
    name: 'stovner-outer-tour', save: inOuter,
    run: async (T, g) => {
      await T.continueGame();
      g.MAPS.stovnerOuter.encounter = null; // the monsters have scenarios of their own
      await T.step('right', 2);
      await T.talk('south-sign');
      await T.step('left'); await T.step('up', 15); await T.step('up');
      T.check('stopped by the barricade', g.player.x === 14 && g.player.y === 3 && g.player.dir === 'up', g.player.x + ',' + g.player.y);
      T.shot('barricade');
      await T.talk('barricade');
      await T.step('right'); await T.step('up');
      T.check('on both sides', g.player.x === 15 && g.player.y === 3, g.player.x + ',' + g.player.y);
      await T.talk('barricade-right');
      await T.step('left'); await T.step('down', 4); await T.step('right', 8); await T.step('down', 3); await T.step('right'); await T.step('up');
      T.check('at the cart', g.player.x === 23 && g.player.y === 10 && g.player.dir === 'up', g.player.x + ',' + g.player.y);
      T.shot('cart');
      await T.talk('cart');
      await T.step('left', 3); await T.step('down', 2); await T.step('left', 13);
      T.check('by the lake', g.player.x === 7 && g.player.y === 12, g.player.x + ',' + g.player.y);
      T.shot('lake');
      await T.step('left', 3);
      T.check('the lake is not walkable', g.player.x === 5 && g.player.y === 12, g.player.x);
      await T.step('right', 2); await T.step('down', 3); await T.step('right', 3); await T.step('down', 2); await T.step('right', 4);
      T.check('no battles on the way', g.stats.won === 52 && g.mode === 'world' && g.chapter === 1 && g.storyDone === false);
      await T.step('down', 2);
      await T.until(() => g.player.map === 'stovner', 'Stovner');
      await T.frames(60);
      T.check('back in town at the north road', g.player.x === 12 && g.player.y === 1 && g.player.dir === 'down' && g.mode === 'world', g.player.x + ',' + g.player.y);
      T.shot('town');
      T.state('town');
    },
  },
  { // the other tile of each two-wide road leads to the matching tile
    name: 'stovner-wide-roads', save: moved(gateOpen, 'stovner', 13, 1, 'up'),
    run: async (T, g) => {
      await T.continueGame();
      await T.step('up');
      await T.until(() => g.player.map === 'stovnerOuter', 'Outer Stovner');
      await T.frames(60);
      T.check('right lane out', g.player.x === 15 && g.player.y === 18 && g.player.dir === 'up', g.player.x + ',' + g.player.y);
      await T.frames(120);
      T.check('no bouncing back', g.player.map === 'stovnerOuter' && g.player.y === 18);
      await T.step('down');
      await T.until(() => g.player.map === 'stovner', 'Stovner');
      await T.frames(60);
      T.check('right lane home', g.player.x === 13 && g.player.y === 1 && g.player.dir === 'down', g.player.x + ',' + g.player.y);
      await T.frames(120);
      T.check('no bouncing back either', g.player.map === 'stovner' && g.player.y === 1);
    },
  },
  { // save by hand in the town and in the outer land, reopen each time, then walk home and do it again
    name: 'stovner-save',
    save: (() => { const d = JSON.parse(JSON.stringify(withHero(gateOpen, 'alexandra'))); d.q.kebab1 = { s: 1, found: 2 }; return d; })(),
    run: [
      async (T, g) => {
        localStorage.setItem('regress-original', localStorage.getItem('turnip-vale-save-v1'));
        await T.continueGame();
        await T.step('left');
        await T.until(() => g.player.map === 'stovner', 'Stovner');
        await T.frames(60);
        await T.step('left', 3);
        T.check('walking alone does not save', JSON.parse(localStorage.getItem('turnip-vale-save-v1')).player.x === 24);
        await T.tap('KeyX', 6); await T.tap('Space', 6);
        T.shot('saved');
        T.check('SAVED! in Stovner', g.menuNote && g.menuNote.text === 'SAVED!', JSON.stringify(g.menuNote));
        await T.tap('KeyX', 6);
        T.state('saved-town');
      },
      async (T, g) => {
        await T.frames(30);
        T.shot('title');
        await T.continueGame();
        T.check('CONTINUE in the town', g.player.map === 'stovner' && g.player.x === 21 && g.player.y === 9 && g.player.dir === 'left' && g.player.hero === 'alexandra', g.player.map + ' ' + g.player.x);
        T.shot('continued-town');
        T.state('continued-town');
        await T.menuShot('status');
        await T.step('left', 6); await T.step('up', 2); await T.step('left', 2); await T.step('up', 7);
        await T.until(() => g.player.map === 'stovnerOuter', 'Outer Stovner');
        await T.frames(60);
        const auto = JSON.parse(localStorage.getItem('turnip-vale-save-v1')).player;
        T.check('autosaved on entering', auto.map === 'stovnerOuter' && auto.x === 15 && auto.y === 18, auto.map);
        await T.step('up', 3);
        T.check('walking alone does not save', JSON.parse(localStorage.getItem('turnip-vale-save-v1')).player.y === 18);
        await T.tap('KeyX', 6); await T.tap('Space', 6);
        T.check('SAVED! in Outer Stovner', g.menuNote && g.menuNote.text === 'SAVED!', JSON.stringify(g.menuNote));
        await T.tap('KeyX', 6);
        T.state('saved-outer');
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE in the outer land', g.player.map === 'stovnerOuter' && g.player.x === 15 && g.player.y === 15 && g.player.dir === 'up', g.player.map + ' ' + g.player.y);
        T.shot('continued-outer');
        T.state('continued-outer');
        await T.step('down', 4);
        await T.until(() => g.player.map === 'stovner', 'Stovner');
        await T.frames(60);
        await T.step('down', 6); await T.step('right', 2); await T.step('down', 2); await T.step('right', 10);
        await T.until(() => g.player.map === 'village', 'the village');
        await T.frames(60);
        await T.step('right', 2);
        await T.tap('KeyX', 6); await T.tap('Space', 6); await T.tap('KeyX', 6);
        T.state('saved-home');
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE back in the village', g.player.map === 'village' && g.player.x === 3 && g.player.y === 7 && g.player.dir === 'right', g.player.map + ' ' + g.player.x);
        const a = JSON.parse(localStorage.getItem('regress-original')), b = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        const where = ['map', 'x', 'y', 'fx', 'fy', 'tx', 'ty', 'dir', 'weapons', 'armors'];
        const rest = (p) => JSON.stringify(Object.keys(p).filter((k) => !where.includes(k)).sort().map((k) => [k, p[k]]));
        T.check('hero, level, gold, gear and items as they were', rest(a.player) === rest(b.player), rest(b.player));
        T.check('and it owns what it wore', JSON.stringify([b.player.weapons, b.player.armors]) === '[["none","crystal"],["none","vest"]]', JSON.stringify([b.player.weapons, b.player.armors]));
        T.check('quests as they were, the unknown one too', T.questsKept(b.q, a.q) && JSON.stringify(b.q.kebab1) === '{"s":1,"found":2}');
        T.check('fragment, key and gate as they were', JSON.stringify(a.flags) === JSON.stringify(b.flags) && b.flags.fragment1 && b.flags.redKey && b.flags.redGate);
        T.check('only the step count moved', b.stats.won === a.stats.won && b.stats.slimes === a.stats.slimes && b.stats.steps === a.stats.steps + 50, b.stats.steps - a.stats.steps);
        T.check('same save format', Object.keys(b).sort().join() === 'flags,player,q,stats,tracked,v' && b.v === 1);
        T.state('continued-home');
        await T.menuShot('status-home');
      },
    ],
  },
  { // the on-screen buttons: walk, save, reopen, walk home
    name: 'stovner-save-touch', save: inHub,
    run: [
      async (T, g) => {
        await T.continueGame();
        await T.touch('left', 14); await T.touch('left', 14);
        T.check('two steps with the D-pad', g.player.x === 22 && g.player.y === 9, g.player.x);
        await T.touch('b'); await T.touch('a');
        T.check('A saves', g.menuNote && g.menuNote.text === 'SAVED!' && JSON.parse(localStorage.getItem('turnip-vale-save-v1')).player.x === 22);
        T.shot('saved');
        await T.touch('b');
        T.check('B closes the menu', g.mode === 'world', g.mode);
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE in Stovner', g.player.map === 'stovner' && g.player.x === 22 && g.player.y === 9, g.player.map + ' ' + g.player.x);
        await T.touch('up', 14);
        T.check('the sign is solid', g.player.x === 22 && g.player.y === 8, g.player.y);
        await T.touch('down', 14);
        await T.touch('right', 14); await T.touch('right', 14); await T.touch('right', 14);
        await T.until(() => g.player.map === 'village', 'the village');
        await T.frames(60);
        T.check('home through the gate by D-pad', g.player.x === 1 && g.player.y === 7 && g.player.dir === 'right' && g.mode === 'world', g.player.x);
        T.state('home');
      },
    ],
  },
  { // a finished save from before the chapters: collect the key, unlock the gate, walk through
    name: 'stovner-from-old-finished-save', save: atElder(FIX.finished),
    run: [
      async (T, g) => {
        const before = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        await T.continueGame();
        await T.talk();
        await T.until(() => g.mode === 'victory', 'chapter screen');
        await T.frames(120);
        await T.tap('Space');
        await T.until(() => g.mode === 'world', 'world');
        await T.frames(40);
        await T.step('left', 7);
        await T.talk();
        T.check('gate unlocked', g.flags.redGate === true);
        await T.step('left');
        await T.until(() => g.player.map === 'stovner', 'Stovner');
        await T.frames(60);
        const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        T.check('in Stovner, saved there', d.player.map === 'stovner' && d.player.x === 24 && d.player.y === 9);
        T.check('nothing lost on the way', T.questsKept(d.q, before.q) && JSON.stringify([d.stats.won, d.player.gold, d.player.lvl, d.player.weapon, d.player.armor])
          === JSON.stringify([before.stats.won, before.player.gold, before.player.lvl, before.player.weapon, before.player.armor]));
        T.state('arrived');
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE in Stovner', g.player.map === 'stovner' && g.player.x === 24 && g.chapter === 1);
        T.shot('continued');
      },
    ],
  },
  { // the maps themselves: what can be walked, where the edges are, and where every exit leads
    name: 'stovner-map-audit', save: gateOpen,
    run: async (T, g) => {
      await T.continueGame();
      const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      const tile = (m, x, y, open) => { const gate = m.gates && m.gates[x + ',' + y]; return gate ? (open ? gate.open : gate.closed) : m.rows[y][x]; };
      const walk = (m, x, y, open) => x >= 0 && y >= 0 && x < m.w && y < m.h && !g.SOLID.has(tile(m, x, y, open));
      const reach = (name, sx, sy, open) => {
        const m = g.MAPS[name], seen = new Set([sx + ',' + sy]), todo = [[sx, sy]];
        while (todo.length) {
          const [x, y] = todo.pop();
          if (m.exits[x + ',' + y]) continue; // stepping here leaves the map
          for (const [dx, dy] of Object.values(DIRS)) {
            const k = (x + dx) + ',' + (y + dy);
            if (!seen.has(k) && walk(m, x + dx, y + dy, open)) { seen.add(k); todo.push([x + dx, y + dy]); }
          }
        }
        return seen;
      };
      T.check('gate shut: its tile cannot be reached', !reach('village', 8, 7, false).has('0,7'));
      T.check('gate open: it can', reach('village', 8, 7, true).has('0,7'));
      const starts = { village: [8, 7], forest: [1, 7], cave: [1, 7], stovner: [24, 9], stovnerOuter: [14, 18], tunnel: [9, 1], northRoad: [5, 18], shrine: [6, 11], ammerud: [28, 10], darkPath: [14, 10],
        grorudHeights: [15, 3], grorudTown: [12, 3], grorudWorks: [12, 16], veitvetRoad: [1, 5],
        veitvet: [1, 10], veitvetUnder: [2, 15], veitvetCenter: [11, 14], osloRoad: [1, 5] };
      T.check('eighteen maps', Object.keys(g.MAPS).sort().join() === Object.keys(starts).sort().join(), Object.keys(g.MAPS).join());
      for (const [name, [sx, sy]] of Object.entries(starts)) {
        const m = g.MAPS[name], seen = reach(name, sx, sy, true);
        const edge = [...seen].filter((k) => { const [x, y] = k.split(',').map(Number); return x === 0 || y === 0 || x === m.w - 1 || y === m.h - 1; });
        T.check(name + ': every reachable edge tile is an exit', edge.every((k) => m.exits[k]), edge.join(' '));
        T.check(name + ': every row is as wide as the map', m.rows.every((r) => r.length === m.w));
        for (const [k, e] of Object.entries(m.exits)) {
          const to = g.MAPS[e.map], [dx, dy] = DIRS[e.dir];
          T.check(name + ' ' + k + ': arrives on open ground', !!to && walk(to, e.x, e.y, true), e.map);
          T.check(name + ' ' + k + ': not onto another exit', !!to && !to.exits[e.x + ',' + e.y]);
          const back = to && to.exits[(e.x - dx) + ',' + (e.y - dy)];
          T.check(name + ' ' + k + ': the exit behind leads back', !!back && back.map === name, JSON.stringify(back));
          T.check(name + ' ' + k + ': and back to the tile in front of this one', !!back && Math.abs(back.x - Number(k.split(',')[0])) + Math.abs(back.y - Number(k.split(',')[1])) === 1);
        }
      }
      const unreached = (name, sx, sy) => {
        const m = g.MAPS[name], seen = reach(name, sx, sy, true), out = [];
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (walk(m, x, y, true) && !seen.has(x + ',' + y)) out.push(x + ',' + y);
        return out.join(' ');
      };
      T.check('town: all open ground can be reached', unreached('stovner', 24, 9) === '', unreached('stovner', 24, 9));
      T.check('outer land: all open ground can be reached once the barricade is down', unreached('stovnerOuter', 14, 18) === '', unreached('stovnerOuter', 14, 18));
      const shut = reach('stovnerOuter', 14, 18, false);
      T.check('barricade up: the road behind it cannot be reached', ['14,0', '15,0', '14,1', '15,1', '14,2', '15,2'].every((k) => !shut.has(k)));
      T.check('north road and shrine: all open ground can be reached', unreached('northRoad', 5, 18) === '' && unreached('shrine', 6, 11) === '', unreached('northRoad', 5, 18) + ' / ' + unreached('shrine', 6, 11));
      T.check('the shrine leads nowhere but back', Object.values(g.MAPS.shrine.exits).every((e) => e.map === 'northRoad') && g.MAPS.shrine.encounter === null);
      const nz = g.MAPS.northRoad.encounter.zones;
      T.check('north road: two zones of Stovner enemies, none within three steps of either end', nz.length === 2
        && nz.every((z) => z.table.every((e) => ['golem', 'rat', 'blue'].includes(e[0])) && Math.abs(z.table.reduce((n, e) => n + e[1], 0) - 1) < 1e-9)
        && [[5, 18], [6, 18], [6, 1], [7, 1]].every((p) => nz.every((z) => Math.max(z.at[0] - p[0], p[0] - z.at[2], 0) + Math.max(z.at[1] - p[1], p[1] - z.at[3], 0) >= 3)));
      T.check('the west gate: shut, it cannot be reached; open, it is the way to Ammerud', reach('stovner', 24, 9, true).has('0,9') && !reach('stovner', 24, 9, false).has('0,9') && g.SOLID.has('G') && g.MAPS.stovner.exits['0,9'].map === 'ammerud');
      T.check('the outer zones are as they were', JSON.stringify(g.MAPS.stovnerOuter.encounter.zones.map((z) => z.at)) === '[[1,1,9,2],[10,3,20,4],[16,5,28,11],[9,6,13,11],[1,13,9,18],[18,13,28,17]]');
      // every line of the quest log and every tracker must fit its box
      const wide = [];
      for (const id of g.QUEST_ORDER) {
        const d = g.QUESTS[id];
        if (d.title.length > 16) wide.push(d.title);
        if (d.progress().length > 15) wide.push(d.progress());
        if (d.tracker().length > 16) wide.push(d.tracker());
        if (('SEE ' + d.turnIn + '!').length > 16) wide.push(d.turnIn);
      }
      T.check('every quest title, log line and tracker fits', wide.length === 0, wide.join(' | '));
      const at = (name, x, y) => g.MAPS[name].rows[y][x];
      T.check('west gate, tunnel and barricade are solid', ['G', 'Q', 'J'].every((c) => g.SOLID.has(c))
        && at('stovner', 0, 9) === 'G' && at('stovner', 12, 16) === 'Q' && at('stovner', 13, 16) === 'Q'
        && at('stovnerOuter', 14, 2) === 'J' && at('stovnerOuter', 15, 2) === 'J');
      T.check('no battles in the town', g.MAPS.stovner.encounter === null);
      const enc = g.MAPS.stovnerOuter.encounter, outer = g.MAPS.stovnerOuter;
      T.check('six zones outside it, all inside the map', enc.zones.length === 6 && enc.zones.every((z) => z.at[0] >= 0 && z.at[1] >= 0 && z.at[2] < outer.w && z.at[3] < outer.h && z.at[0] <= z.at[2] && z.at[1] <= z.at[3]));
      T.check('every enemy in them exists and the odds add up', enc.zones.every((z) => z.table.every((e) => g.ENEMIES[e[0]]) && Math.abs(z.table.reduce((n, e) => n + e[1], 0) - 1) < 1e-9));
      T.check('only Stovner enemies', enc.zones.every((z) => z.table.every((e) => ['blue', 'rat', 'golem', 'glint'].includes(e[0]))));
      T.check('the glint slime lives in one zone only', enc.zones.filter((z) => z.table.some((e) => e[0] === 'glint')).length === 1);
      const inZone = (x, y) => enc.zones.some((z) => x >= z.at[0] && y >= z.at[1] && x <= z.at[2] && y <= z.at[3]);
      const near = [];
      for (let y = 0; y < outer.h; y++) for (let x = 0; x < outer.w; x++) {
        if (inZone(x, y) && [[14, 19], [15, 19], [14, 18], [15, 18]].some((p) => Math.abs(p[0] - x) + Math.abs(p[1] - y) <= 3)) near.push(x + ',' + y);
      }
      T.check('no zone within three steps of the way in', near.length === 0, near.join(' '));
      let danger = 0, open = 0;
      for (let y = 0; y < outer.h; y++) for (let x = 0; x < outer.w; x++) if (walk(outer, x, y, true)) { open++; if (inZone(x, y)) danger++; }
      T.check('between a third and two thirds of the open ground is dangerous', danger / open > 0.33 && danger / open < 0.67, danger + ' of ' + open);
      T.check('both chests stand on open ground', g.ITEMS.filter((i) => i.chest && i.map === 'stovnerOuter').length === 2 && g.ITEMS.filter((i) => i.chest && i.map === 'stovnerOuter').every((i) => walk(g.MAPS[i.map], i.x, i.y, true) && !g.MAPS[i.map].exits[i.x + ',' + i.y]));
      T.check('the old enemies are as they were', JSON.stringify(['slime', 'shroom', 'bat', 'gloop', 'king'].map((k) => [g.ENEMIES[k].hp, g.ENEMIES[k].atk, g.ENEMIES[k].def, g.ENEMIES[k].xp, g.ENEMIES[k].gold]))
        === '[[12,4,0,5,[3,5]],[16,5,1,7,[4,6]],[26,11,2,12,[6,9]],[36,13,3,15,[8,11]],[140,15,5,80,[100,100]]]');
      T.check('the old gear is as it was', JSON.stringify([g.WEAPONS.none.atk, g.WEAPONS.iron.atk, g.WEAPONS.crystal.atk, g.ARMORS.none.def, g.ARMORS.vest.def]) === '[0,3,7,0,2]'
        && g.WEAPONS.iron.name === 'IRON SWORD' && g.WEAPONS.crystal.name === 'CRYSTAL SWD' && g.ARMORS.vest.name === 'TOUGH VEST');
      T.check('tunnel shut: its mouths cannot be reached', !reach('stovner', 24, 9, false).has('12,16') && !reach('stovner', 24, 9, false).has('13,16'));
      T.check('tunnel open: they can', reach('stovner', 24, 9, true).has('12,16') && reach('stovner', 24, 9, true).has('13,16'));
      T.check('tunnel: all open ground can be reached', unreached('tunnel', 9, 1) === '', unreached('tunnel', 9, 1));
      T.check('tunnel: the only ways out are the two flights of steps', Object.keys(g.MAPS.tunnel.exits).join() === '9,0,10,0' && Object.values(g.MAPS.tunnel.exits).every((e) => e.map === 'stovner'));
      const tz = g.MAPS.tunnel.encounter.zones;
      T.check('tunnel: two zones, no glint slime, and none touching the steps or the way to the far room', tz.length === 2
        && tz.every((z) => z.table.every((e) => ['golem', 'rat', 'blue'].includes(e[0])) && Math.abs(z.table.reduce((n, e) => n + e[1], 0) - 1) < 1e-9)
        && [[9, 1], [10, 1], [9, 8], [10, 8], [9, 9]].every((p) => tz.every((z) => Math.max(z.at[0] - p[0], p[0] - z.at[2], 0) + Math.max(z.at[1] - p[1], p[1] - z.at[3], 0) >= 2)));
      // the town's people stand on ground that used to be open: nobody may be walled in by them
      const townPeople = new Set(g.NPCS.filter((n) => n.map === 'stovner').map((n) => n.x + ',' + n.y));
      const seenTown = new Set(['24,9']), todo = [[24, 9]], town = g.MAPS.stovner;
      while (todo.length) {
        const [x, y] = todo.pop();
        for (const [dx, dy] of Object.values(DIRS)) {
          const k = (x + dx) + ',' + (y + dy);
          if (!seenTown.has(k) && !townPeople.has(k) && walk(town, x + dx, y + dy, false)) { seenTown.add(k); todo.push([x + dx, y + dy]); }
        }
      }
      const cut = [];
      for (let y = 0; y < town.h; y++) for (let x = 0; x < town.w; x++) if (walk(town, x, y, false) && !townPeople.has(x + ',' + y) && !seenTown.has(x + ',' + y)) cut.push(x + ',' + y);
      T.check('the people of the town block nobody in', cut.length === 0, cut.join(' '));
      T.check('the old Stovner maps are as they were', g.MAPS.stovner.rows.join('').length === 26 * 18 && g.MAPS.stovnerOuter.rows.join('').length === 30 * 20
        && g.MAPS.stovner.rows[16] === '#.,......;.#QQ#....;....T#' && g.MAPS.stovnerOuter.rows[9] === 'T.~~~..=......==.......W..=..T');
      T.check('Stovner ends with FIND MOHSIN, Ammerud with AMMERUD TROUBLE, Grorud with POWER TO GRORUD, Veitvet with VEITVET SIGNAL, and Oslo S has no quests', g.CHAPTERS.length === 6 && g.CHAPTERS[1].name === 'STOVNER' && g.CHAPTERS[1].quest === 'mohsin' && g.CHAPTERS[2].quest === 'trouble' && g.CHAPTERS[3].quest === 'power' && g.CHAPTERS[4].quest === 'signal' && g.CHAPTERS[5].quest === null && g.QUEST_ORDER.join() === 'slimes,biscuit,glowcap,king,shards,road,cart,under,mohsin,kebab,trouble,ball,wisp,power,bag,yard,signal,phone', g.QUEST_ORDER.join());
    },
  },
];

// Stovner's monsters, the encounter zones of Outer Stovner, and the gear the hero owns and wears.
// (Scenario code runs inside the page, so shared helpers are pieces of source text.)
// meet(x, y, dir, v) starts a battle on tile x,y by stepping onto it in direction dir: the dice are
// held at 0 for the step, so the encounter is certain, and at v while the enemy is picked from the
// zone's table. The game's own dice are put back before the fight begins.
const MEET = `
  const KEY = 'turnip-vale-save-v1';
  const saved = () => JSON.parse(localStorage.getItem(KEY));
  const meet = async (x, y, dir, v, map = 'stovnerOuter') => {
    const from = { left: [1, 0], right: [-1, 0], up: [0, 1], down: [0, -1] }[dir];
    T.place(map, x + from[0], y + from[1], dir);
    g.player.sinceBattle = 99;
    const real = Math.random;
    Math.random = () => 0;
    await T.step(dir);
    Math.random = () => v;
    await T.until(() => g.mode === 'battle', 'a battle');
    Math.random = real;
    await T.untilBattle();
  };
  // One attack with the dice held in the middle (no critical hit, +1 of 0..2): returns the damage dealt.
  const swing = async () => {
    const real = Math.random, b = g.battle, hp = b.hp;
    Math.random = () => 0.5;
    while (b.menu !== 0) await T.tap('ArrowDown', 1);
    await T.tap('Space', 1);
    await T.until(() => b.hp !== hp, 'the blow to land');
    Math.random = real;
    return hp - b.hp;
  };
  const cautious = (g) => (g.player.hp < 30 && g.player.herbs > 0 ? 1 : 0);
`;
const RAT = `async (T, g) => {
  ${MEET}
  await T.continueGame();
  await meet(20, 8, 'left', 0);
  const b = g.battle;
  T.check('a Stovner rat', b.type === 'rat' && b.name === 'STOVNER RAT' && b.max === 34 && b.atk === 17 && b.def === 3 && b.xp === 20 && !b.boss, JSON.stringify([b.type, b.max, b.atk, b.def, b.xp]));
  const bite = 88 - g.player.hp;
  T.check('quick: it bit once before the hero could move', bite >= 6 && bite <= 8 && b.turn === 0, bite + ' turn ' + b.turn);
  T.shot('battle');
  let swings = 0;
  await T.fight(() => { swings++; return 0; });
  T.check('beaten in one or two blows', swings <= 2 && g.stats.won === 53 && g.player.xp === 20, swings);
  T.check('8 to 12 gold', g.player.gold >= 268 && g.player.gold <= 272, g.player.gold);
  const lostTough = 88 - g.player.hp;
  g.player.armors.push('light'); g.player.armor = 'light'; g.player.hp = 88;
  await meet(20, 8, 'left', 0);
  T.check('in the Light Vest it gets no opening bite', g.player.hp === 88 && g.battle.turn === 0 && g.battle.type === 'rat', g.player.hp);
  T.shot('battle-light-vest');
  await T.fight();
  const lostLight = 88 - g.player.hp;
  T.check('and the whole fight costs less than in the Tough Vest', lostLight < lostTough, lostLight + ' against ' + lostTough);
  T.check('still in Outer Stovner', g.player.map === 'stovnerOuter' && g.mode === 'world' && g.stats.won === 54);
  T.state('after');
}`;
// Fights the glint slime, eating an herb when hurt; photographs its mending and its end.
const GLINT = `async (T, g) => {
  ${MEET}
  await T.continueGame();
  const won = g.stats.won, gold = g.player.gold, xp = g.player.xp;
  await meet(5, 2, 'up', 0);
  const b = g.battle;
  T.check('a glint slime', b.type === 'glint' && b.name === 'GLINT SLIME' && b.max === 72 && b.atk === 22 && b.def === 8 && b.xp === 60 && !b.boss, JSON.stringify([b.type, b.max, b.atk, b.def, b.xp]));
  T.shot('battle');
  let mended = false, dust = false, turns = 0, herbs = g.player.herbs;
  while (g.mode === 'battle') {
    await T.until(() => g.mode !== 'battle' || b.phase === 'menu', 'the battle menu');
    if (g.mode !== 'battle') break;
    if (++turns > 40) throw new Error('the fight never ended');
    const want = cautious(g);
    while (b.menu !== want) await T.tap('ArrowDown', 1);
    await T.tap('Space', 1);
    await T.until(() => g.mode !== 'battle' || b.phase !== 'menu', 'the action to start');
    while (g.mode === 'battle' && b.phase !== 'menu') {
      if (!mended && /shimmers/.test(b.msg) && b.shown >= b.msg.length) { mended = true; T.shot('mends'); }
      if (!dust && /dust/.test(b.msg) && b.shown >= b.msg.length) { dust = true; T.shot('defeated'); }
      await T.frames(1);
    }
  }
  await T.frames(70);
  T.check('it mended itself during the fight', mended);
  T.check('and was beaten all the same', dust && g.stats.won === won + 1 && g.player.hp > 0 && g.player.map === 'stovnerOuter' && g.mode === 'world', g.player.map);
  T.check('60 XP and 30 to 40 gold', g.player.xp === xp + 60 && g.player.gold >= gold + 30 && g.player.gold <= gold + 40, g.player.gold - gold);
  T.check('a fair fight: at most ten turns and three herbs', turns <= 10 && herbs - g.player.herbs <= 3, turns + ' turns, ' + (herbs - g.player.herbs) + ' herbs');
  T.state('after');
}`;
// A hero who finished Vestli with the shop's gear only: level 8, Iron Sword, Tough Vest.
const modest = save({
  at: ['stovnerOuter', 14, 18, 'up'], lvl: 8,
  player: { maxhp: 82, hp: 82, herbs: 5, maxHerbs: 5, gold: 180, weapon: 'iron', armor: 'vest', sickle: true },
  q: { slimes: { s: 3, n: 3 }, biscuit: DONE, glowcap: DONE, king: DONE, shards: { s: 1 } },
  flags: { vines: true, metBram: true, fragment1: true, redKey: true, redGate: true }, stats: { won: 41, slimes: 14, steps: 2100 },
});
const feeble = save({
  at: ['stovnerOuter', 14, 18, 'up'], lvl: 1, player: { hp: 5, gold: 33, weapon: 'iron', sickle: true },
  q: { slimes: { s: 3, n: 3 }, king: DONE }, flags: { vines: true, fragment1: true, redKey: true, redGate: true },
});
const GEAR = [['none', 'none'], ['iron', 'none'], ['iron', 'vest'], ['crystal', 'none'], ['crystal', 'vest']];
const migrate = (i) => `async (T, g) => {
  const KEY = 'turnip-vale-save-v1', want = ${JSON.stringify(GEAR[i])}, next = ${JSON.stringify(GEAR[i + 1] || null)};
  const old = JSON.parse(localStorage.getItem(KEY));
  if (${i} === 0) { old.player.weapon = want[0]; old.player.armor = want[1]; old.player.mystery = 7; old.q.kebab1 = { s: 1, found: 2 }; localStorage.setItem(KEY, JSON.stringify(old)); }
  T.check('a save from before gear was kept', old.player.weapons === undefined && old.player.armors === undefined);
  await T.continueGame();
  const list = (id) => JSON.stringify(id === 'none' ? ['none'] : ['none', id]);
  T.check('still wearing ' + want.join(' and '), g.player.weapon === want[0] && g.player.armor === want[1]);
  T.check('and now owns exactly that', JSON.stringify(g.player.weapons) === list(want[0]) && JSON.stringify(g.player.armors) === list(want[1]), JSON.stringify([g.player.weapons, g.player.armors]));
  await T.tap('KeyX', 6); await T.tap('Space', 6); await T.tap('KeyX', 6);
  const d = JSON.parse(localStorage.getItem(KEY));
  T.check('saved that way', JSON.stringify(d.player.weapons) === list(want[0]) && JSON.stringify(d.player.armors) === list(want[1]) && d.player.weapon === want[0] && d.player.armor === want[1]);
  T.check('unknown quest and unknown field kept', JSON.stringify(d.q.kebab1) === '{"s":1,"found":2}' && d.player.mystery === 7);
  const rest = (p) => JSON.stringify(Object.keys(p).filter((k) => k !== 'weapons' && k !== 'armors' && k !== 'hero').sort().map((k) => [k, p[k]]));
  T.check('nothing else changed', rest(d.player) === rest(old.player) && T.questsKept(d.q, old.q) && JSON.stringify([d.flags, d.stats]) === JSON.stringify([old.flags, old.stats]));
  T.state('migrated-' + want.join('-'));
  if (next) { delete d.player.weapons; delete d.player.armors; d.player.weapon = next[0]; d.player.armor = next[1]; }
  else { d.player.weapons = ['none', 'crystal', 'futureBlade']; d.player.armors = ['futureCoat', 'vest']; }
  localStorage.setItem(KEY, JSON.stringify(d));
}`;
const combatScenarios = [
  { // save by hand, fight, win, save again, reopen
    name: 'stovner-blue-slime', save: inOuter,
    run: [
      `async (T, g) => {
        ${MEET}
        await T.continueGame();
        await T.tap('KeyX', 6); await T.tap('Space', 6); await T.tap('KeyX', 6);
        const before = localStorage.getItem(KEY);
        await meet(5, 15, 'left', 0);
        const b = g.battle;
        T.check('a blue slime', b.type === 'blue' && b.name === 'BLUE SLIME' && b.max === 44 && b.atk === 19 && b.def === 5 && b.xp === 22 && !b.boss, JSON.stringify([b.type, b.max, b.atk, b.def, b.xp]));
        T.check('it waits its turn', g.player.hp === 88 && b.turn === 0);
        T.shot('battle');
        await T.tap('KeyX', 6);
        T.check('no menu and no saving in battle', g.mode === 'battle' && localStorage.getItem(KEY) === before, g.mode);
        let swings = 0;
        await T.fight(() => { swings++; return 0; });
        T.check('beaten in two or three blows', swings >= 1 && swings <= 3 && g.stats.won === 53, swings);
        T.check('22 XP and 10 to 14 gold', g.player.xp === 22 && g.player.gold >= 270 && g.player.gold <= 274, g.player.gold);
        T.check('it did not hurt much', g.player.hp >= 68 && g.player.hp <= 88, g.player.hp);
        T.check('the win was autosaved over the manual save', saved().stats.won === 53 && saved().player.xp === 22);
        T.check('nothing else was touched', JSON.stringify(saved().flags) === JSON.stringify(JSON.parse(before).flags) && JSON.stringify(saved().q) === JSON.stringify(JSON.parse(before).q));
        T.shot('after');
        await T.step('right');
        await T.tap('KeyX', 6); await T.tap('Space', 6); await T.tap('KeyX', 6);
        T.state('won');
      }`,
      `async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE after the fight', g.player.map === 'stovnerOuter' && g.player.x === 6 && g.player.y === 15 && g.stats.won === 53 && g.player.xp === 22, g.player.x + ',' + g.player.y);
        T.check('fragment, key and gate still there', g.flags.fragment1 && g.flags.redKey && g.flags.redGate && g.chapter === 1 && g.storyDone === false);
        T.state('continued');
      }`,
    ],
  },
  { name: 'stovner-rat', save: inOuter, run: RAT },
  ...['mohammed', 'celine', 'alexandra'].map((id) => ({
    name: `stovner-rat-${id}`, save: withHero(inOuter, id), run: RAT, sameAs: { after: 'stovner-rat__after' },
  })),
  { // the golem with the Crystal Sword, then with the Heavy Axe
    name: 'stovner-golem', save: inOuter,
    run: `async (T, g) => {
      ${MEET}
      await T.continueGame();
      await meet(17, 4, 'up', 0);
      const b = g.battle;
      T.check('a tunnel golem', b.type === 'golem' && b.name === 'TUNNEL GOLEM' && b.max === 44 && b.atk === 22 && b.def === 16 && b.xp === 34 && !b.boss, JSON.stringify([b.type, b.max, b.atk, b.def, b.xp]));
      T.shot('battle');
      let swings = 0, afterFirst = null, said = false;
      await T.fight((g) => { if (swings === 1) { afterFirst = g.player.hp; said = g.battle.armorSaid === true; } swings++; return 0; });
      T.check('slow: it does not strike on its first turn', afterFirst === 88, afterFirst);
      T.check('the hero is told about its armour', said);
      const sword = swings, swordLost = 88 - g.player.hp;
      T.check('the Crystal Sword needs three to five blows', sword >= 3 && sword <= 5 && g.stats.won === 53, sword);
      T.check('16 to 22 gold, 34 XP', g.player.xp === 34 && g.player.gold >= 276 && g.player.gold <= 282, g.player.gold);
      g.player.weapons.push('axe'); g.player.weapon = 'axe'; g.player.hp = 88;
      await meet(17, 4, 'up', 0);
      const dealt = await swing();
      await T.until(() => /smashes/.test(g.battle.msg) && g.battle.shown >= g.battle.msg.length, 'the axe line');
      T.shot('axe');
      T.check('the axe ignores its armour: ATK 24, +1, no defence', dealt === 25, dealt);
      swings = 1;
      await T.fight(() => { swings++; return 0; });
      const axeLost = 88 - g.player.hp;
      T.check('the Heavy Axe needs fewer blows', swings < sword && swings <= 2 && g.stats.won === 54, swings + ' against ' + sword);
      T.check('and the hero is hurt less', axeLost < swordLost, axeLost + ' against ' + swordLost);
      T.state('after');
    }`,
  },
  { // one measured blow with each weapon against an ordinary enemy and against the armoured one
    name: 'stovner-weapons', save: inOuter,
    run: `async (T, g) => {
      ${MEET}
      await T.continueGame();
      const dealt = {};
      for (const w of ['iron', 'crystal', 'axe']) {
        g.player.weapon = w;
        for (const [foe, x, y, dir] of [['blue', 5, 15, 'left'], ['golem', 17, 4, 'up']]) {
          g.player.hp = 88;
          await meet(x, y, dir, 0);
          if (g.battle.type !== foe) throw new Error('met a ' + g.battle.type);
          dealt[w + ' ' + foe] = await swing();
          await T.fight(() => 2);
        }
      }
      // hero ATK 22; +3 / +7 / +2; +1 from the dice; less DEF 5 (slime) or 16 (golem, unless the axe)
      T.check('blue slime: iron 21, crystal 25, axe 20', dealt['iron blue'] === 21 && dealt['crystal blue'] === 25 && dealt['axe blue'] === 20, JSON.stringify(dealt));
      T.check('tunnel golem: iron 10, crystal 14, axe 25', dealt['iron golem'] === 10 && dealt['crystal golem'] === 14 && dealt['axe golem'] === 25, JSON.stringify(dealt));
      T.check('so the axe is the worst of the three on a slime and the best on a golem', dealt['axe blue'] < dealt['iron blue'] && dealt['axe golem'] > dealt['crystal golem']);
      T.check('running away cost no gear', g.player.weapon === 'axe' && g.stats.won === 52);
    }`,
  },
  { name: 'stovner-glint-slime', save: inOuter, run: GLINT },
  { name: 'stovner-glint-slime-modest', save: modest, run: GLINT },
  { // Iron Sword and Tough Vest at level 8: one of each ordinary enemy in a row, eating herbs when hurt
    name: 'stovner-modest-hero', save: modest,
    run: `async (T, g) => {
      ${MEET}
      await T.continueGame();
      const blows = {};
      for (const [foe, x, y, dir] of [['blue', 5, 15, 'left'], ['rat', 20, 8, 'left'], ['golem', 17, 4, 'up']]) {
        await meet(x, y, dir, 0);
        if (g.battle.type !== foe) throw new Error('met a ' + g.battle.type);
        if (foe === 'blue') T.check('enemies are not scaled up for a level 8 hero', g.battle.max === 44 && g.battle.atk === 19);
        let n = 0;
        await T.fight((g) => { const c = cautious(g); if (!c) n++; return c; });
        blows[foe] = n;
        T.check('beat the ' + foe, g.mode === 'world' && g.player.map === 'stovnerOuter' && g.player.hp > 0, g.player.map);
      }
      T.check('three wins', g.stats.won === 44 && g.player.xp === 76, g.stats.won + ' ' + g.player.xp);
      T.check('no fight dragged on', blows.blue <= 4 && blows.rat <= 3 && blows.golem <= 8, JSON.stringify(blows));
      T.check('with herbs to spare', g.player.herbs >= 3 && g.player.hp > 0, g.player.herbs + ' herbs, ' + g.player.hp + ' HP');
      T.state('after');
    }`,
  },
  { // a win that brings a level: saved, reopened, and the next enemy is one level stronger
    name: 'stovner-level-up', save: { ...inOuter, player: { ...inOuter.player, xp: 290 } },
    run: [
      `async (T, g) => {
        ${MEET}
        await T.continueGame();
        await meet(5, 15, 'left', 0);
        await T.fight();
        T.check('level 10', g.player.lvl === 10 && g.player.maxhp === 94 && g.player.hp === 94 && g.player.xp === 9 && g.player.atk === 24 && g.player.def === 10, JSON.stringify([g.player.lvl, g.player.maxhp, g.player.xp]));
        T.check('autosaved', saved().player.lvl === 10);
        await T.tap('KeyX', 6); await T.tap('Space', 6);
        T.shot('status');
        await T.tap('KeyX', 6);
      }`,
      `async (T, g) => {
        ${MEET}
        await T.continueGame();
        T.check('CONTINUE at level 10', g.player.lvl === 10 && g.player.maxhp === 94 && g.player.xp === 9);
        await meet(5, 15, 'left', 0);
        const b = g.battle;
        T.check('enemies grow with the hero above level 9', b.max === 47 && b.atk === 20 && b.def === 5 && b.xp === 24, JSON.stringify([b.max, b.atk, b.def, b.xp]));
        await T.fight(() => 2);
        T.state('after');
      }`,
    ],
  },
  { // which enemy lives where, and where nothing does
    name: 'stovner-zones', save: inOuter,
    run: `async (T, g) => {
      ${MEET}
      await T.continueGame();
      for (const [x, y, dir, v, want] of [
        [5, 15, 'left', 0.9, 'rat'], [17, 4, 'up', 0.9, 'rat'], [5, 2, 'up', 0.5, 'blue'], [20, 8, 'left', 0.9, 'blue'],
        [11, 8, 'left', 0, 'blue'], [11, 8, 'left', 0.9, 'rat'], [20, 15, 'left', 0, 'blue'], [20, 15, 'left', 0.9, 'rat'],
      ]) {
        g.player.hp = g.player.maxhp;
        await meet(x, y, dir, v);
        T.check('at ' + x + ',' + y + ' with the dice at ' + v + ': ' + want, g.battle.type === want, g.battle.type);
        await T.fight(() => 2);
      }
      // with the dice held at 0 every step inside a zone starts a battle, so a walk that ends in the world was safe
      const real = Math.random;
      Math.random = () => 0;
      const safe = async (what, map, x, y, steps) => {
        T.place(map, x, y, 'up');
        g.player.sinceBattle = 99;
        await T.frames(60);
        for (const [dir, n] of steps) await T.step(dir, n);
        await T.frames(90);
        T.check('safe: ' + what, g.mode === 'world' && g.player.map === map, g.mode + ' at ' + g.player.x + ',' + g.player.y);
      };
      await safe('standing where the road arrives, then up the avenue', 'stovnerOuter', 14, 18, [['up', 13]]);
      T.check('as far as the last crossing', g.player.x === 14 && g.player.y === 5);
      await safe('the other lane', 'stovnerOuter', 15, 18, [['up', 13], ['down', 13]]);
      await safe('the west loop and the lake shore', 'stovnerOuter', 7, 12, [['left', 2], ['right', 2], ['up', 5], ['left', 2], ['up', 4], ['right', 3], ['down', 2]]);
      T.check('all the way round', g.player.x === 8 && g.player.y === 5, g.player.x + ',' + g.player.y);
      await safe('the south road', 'stovnerOuter', 14, 17, [['left', 4], ['up', 2]]);
      await safe('the far north-east', 'stovnerOuter', 26, 3, [['up', 1], ['left', 4], ['down', 1]]);
      await safe('the town square', 'stovner', 24, 9, [['left', 10], ['up', 2], ['left', 3], ['down', 2], ['left', 10]]);
      await safe('the town ring road', 'stovner', 3, 9, [['down', 6], ['right', 19], ['up', 11], ['left', 19]]);
      await safe('the village', 'village', 10, 7, [['right', 8], ['left', 8]]);
      // the old areas keep their own monsters
      T.place('forest', 3, 5, 'right'); g.player.sinceBattle = 99;
      await T.step('right');
      await T.until(() => g.mode === 'battle', 'a battle in the woods');
      Math.random = real;
      await T.untilBattle();
      T.check('the woods still hold slimes', g.battle.type === 'slime', g.battle.type);
      await T.fight(() => 2);
      Math.random = () => 0;
      T.place('cave', 2, 7, 'right'); g.player.sinceBattle = 99;
      await T.step('right');
      await T.until(() => g.mode === 'battle', 'a battle in the cave');
      Math.random = real;
      await T.untilBattle();
      T.check('the cave still holds bats', g.battle.type === 'bat', g.battle.type);
      await T.fight(() => 2);
      const names = (m) => (g.MAPS[m].encounter.table || []).map((e) => e[0]).join();
      T.check('Vestli tables untouched', names('forest') === 'slime,shroom' && names('cave') === 'bat,gloop' && g.MAPS.village.encounter === null, names('forest') + ' / ' + names('cave'));
    }`,
  },
  { // beaten in Stovner: carried home, patched up, nothing lost, and CONTINUE is safe
    name: 'stovner-defeat', save: feeble,
    run: [
      `async (T, g) => {
        await T.continueGame();
        T.place('stovnerOuter', 21, 8, 'left'); g.player.sinceBattle = 99;
        const real = Math.random;
        Math.random = () => 0;
        await T.step('left');
        await T.until(() => g.mode === 'battle', 'a battle');
        Math.random = real;
        T.check('a rat', g.battle.type === 'rat');
        await T.until(() => g.mode === 'dialog', 'being carried home');
        T.shot('wren');
        T.check('its opening bite was enough', g.stats.won === 0);
        await T.dialog();
        T.check('back in the village, patched up', g.player.map === 'village' && g.player.x === 13 && g.player.y === 5 && g.player.hp === g.player.maxhp && g.player.herbs === 3 && g.mode === 'world', g.player.map + ' ' + g.player.hp);
        const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        T.check('saved there, not in the fight', d.player.map === 'village' && d.player.hp === d.player.maxhp);
        T.check('gold, gear, fragment, key and gate kept', d.player.gold === 33 && d.player.weapon === 'iron' && d.flags.fragment1 && d.flags.redKey && d.flags.redGate && d.q.king.s === 3);
        T.state('home');
      }`,
      `async (T, g) => {
        ${MEET}
        await T.continueGame();
        T.check('CONTINUE wakes up in the village', g.player.map === 'village' && g.player.hp === g.player.maxhp && g.mode === 'world');
        await meet(17, 4, 'up', 0);
        T.check('a golem', g.battle.type === 'golem');
        await T.fight();
        T.check('lost a real fight too', g.mode === 'dialog' && g.stats.won === 0, g.mode);
        await T.dialog();
        T.check('and is carried home again', g.player.map === 'village' && g.player.hp === g.player.maxhp && g.flags.redGate === true && g.chapter === 1);
        await T.step('left', 3);
        T.check('free to walk on', g.player.x < 13 && g.mode === 'world', g.player.x);
        T.state('home-again');
      }`,
    ],
  },
  { // the two chests: found once each, worn from the menu, kept through saving and travel
    name: 'stovner-chests', save: inOuter,
    run: [
      `async (T, g) => {
        ${MEET}
        await T.continueGame();
        T.check('an old save owns what it wears', JSON.stringify([g.player.weapons, g.player.armors]) === '[["none","crystal"],["none","vest"]]', JSON.stringify([g.player.weapons, g.player.armors]));
        T.place('stovnerOuter', 27, 2, 'up');
        await T.frames(20);
        T.shot('chest');
        await T.step('up');
        T.check('the chest opens', g.mode === 'dialog' && g.player.x === 27 && g.player.y === 1, g.mode);
        await T.dialog('axe');
        T.check('the Heavy Axe is owned, not worn', JSON.stringify(g.player.weapons) === '["none","crystal","axe"]' && g.player.weapon === 'crystal' && g.flags.chestAxe === true, JSON.stringify(g.player.weapons));
        T.check('and saved', JSON.stringify(saved().player.weapons) === '["none","crystal","axe"]' && saved().flags.chestAxe === true);
        T.shot('chest-gone');
        await T.step('down'); await T.step('up'); await T.tap('Space', 6);
        T.check('the chest is gone for good', g.mode === 'world' && g.player.y === 1 && g.player.weapons.length === 3, g.mode);
        // The Light Vest's chest must not sit under the status panel (2..93 across, 2..31 down) from
        // anywhere in the north-west corner, where the camera rests against the edge of the map.
        const vest = g.ITEMS.find((i) => i.id === 'chestVest'), outer = g.MAPS.stovnerOuter, hidden = [];
        T.check('the Light Vest chest stands at 9,1, in the glint slime zone', vest.x === 9 && vest.y === 1 && vest.map === 'stovnerOuter'
          && outer.encounter.zones.findIndex((z) => vest.x >= z.at[0] && vest.y >= z.at[1] && vest.x <= z.at[2] && vest.y <= z.at[3]) === 0);
        T.check('on open ground that was open before', outer.rows[1][9] === '.' && !g.SOLID.has('.'));
        for (let y = 1; y <= 5; y++) for (let x = 1; x <= 9; x++) {
          if (g.SOLID.has(outer.rows[y][x])) continue;
          const camX = Math.max(0, Math.min(x * 16 + 8 - 120, outer.w * 16 - 240)), camY = Math.max(0, Math.min(y * 16 + 8 - 80, outer.h * 16 - 160));
          const sx = vest.x * 16 - camX, sy = vest.y * 16 - camY;
          if (sx < 94 && sx + 16 > 2 && sy < 32 && sy + 16 > 2) hidden.push(x + ',' + y);
        }
        T.check('never under the status panel from the north-west corner', hidden.length === 0, hidden.join(' '));
        T.place('stovnerOuter', 8, 3, 'up'); g.player.sinceBattle = 0;
        await T.frames(20);
        T.shot('vest-chest');
        await T.step('up'); await T.step('right');
        T.shot('vest-chest-near');
        await T.step('up');
        T.check('three steps off the west loop', g.mode === 'dialog' && g.player.x === 9 && g.player.y === 1, g.mode + ' ' + g.player.x + ',' + g.player.y);
        await T.dialog('vest');
        T.check('the Light Vest is owned, not worn', JSON.stringify(g.player.armors) === '["none","vest","light"]' && g.player.armor === 'vest' && g.flags.chestVest === true, JSON.stringify(g.player.armors));
        T.check('and saved', JSON.stringify(saved().player.armors) === '["none","vest","light"]' && saved().flags.chestVest === true);
        await T.step('down'); await T.step('up');
        T.check('once only', g.mode === 'world' && g.player.armors.length === 3);
        // ---- the menu
        await T.tap('KeyX', 6);
        T.check('the cursor starts on SAVE', g.menuSel === 2);
        T.shot('menu');
        await T.tap('ArrowUp', 4);
        T.check('up: armour', g.menuSel === 1);
        T.shot('armour');
        await T.tap('ArrowUp', 4); await T.tap('ArrowUp', 4);
        T.check('up: weapon, and no further', g.menuSel === 0);
        T.shot('weapons');
        const wear = async (kind, want) => {
          await T.tap('Space', 4);
          T.check(kind + ' -> ' + want, g.player[kind] === want && g.mode === 'menu', g.player[kind]);
        };
        await wear('weapon', 'axe');
        T.shot('axe');
        await wear('weapon', 'none'); await wear('weapon', 'crystal'); await wear('weapon', 'axe');
        await T.tap('ArrowDown', 4);
        await wear('armor', 'light');
        T.shot('light-vest');
        await wear('armor', 'none'); await wear('armor', 'vest'); await wear('armor', 'light');
        T.check('nothing was lost by changing', JSON.stringify([g.player.weapons, g.player.armors]) === '[["none","crystal","axe"],["none","vest","light"]]');
        T.check('changing gear does not save by itself', saved().player.weapon === 'crystal' && saved().player.armor === 'vest');
        await T.tap('Enter', 4);
        T.check('Enter changes gear too', g.player.armor === 'none');
        await T.tap('Space', 4); await T.tap('Space', 4);
        await T.tap('ArrowLeft', 4); await T.tap('ArrowRight', 4);
        T.check('left and right leave the cursor alone', g.menuSel === 1 && g.menuPage === 0 && g.player.armor === 'light');
        await T.tap('ArrowDown', 4); await T.tap('ArrowDown', 4);
        T.check('down: SAVE, and no further', g.menuSel === 2);
        await T.tap('Space', 6);
        T.check('SAVED! with the new gear on', g.menuNote && g.menuNote.text === 'SAVED!' && saved().player.weapon === 'axe' && saved().player.armor === 'light');
        T.shot('saved');
        await T.tap('ArrowUp', 4);
        await T.tap('KeyX', 6);
        await T.tap('KeyX', 6);
        T.check('the cursor is back on SAVE when the menu opens again', g.mode === 'menu' && g.menuSel === 2);
        const raw = localStorage.getItem(KEY);
        await T.tap('Space', 6);
        T.check('and the action button saves straight away', g.menuNote && g.menuNote.text === 'SAVED!' && localStorage.getItem(KEY) === raw);
        await T.tap('Escape', 6);
        T.state('equipped');
      }`,
      `async (T, g) => {
        ${MEET}
        await T.continueGame();
        T.check('CONTINUE: wearing the axe and the Light Vest', g.player.weapon === 'axe' && g.player.armor === 'light');
        T.check('owning everything', JSON.stringify([g.player.weapons, g.player.armors]) === '[["none","crystal","axe"],["none","vest","light"]]', JSON.stringify([g.player.weapons, g.player.armors]));
        T.check('fragment, key, gate and both chest flags', ['fragment1', 'redKey', 'redGate', 'chestAxe', 'chestVest'].every((k) => g.flags[k] === true));
        await T.menuShot('status');
        T.place('stovnerOuter', 14, 18, 'down');
        await T.step('down');
        await T.until(() => g.player.map === 'stovner', 'Stovner');
        await T.frames(60);
        await T.step('up');
        await T.until(() => g.player.map === 'stovnerOuter', 'Outer Stovner');
        await T.frames(60);
        T.place('stovnerOuter', 27, 2, 'up');
        await T.step('up');
        T.place('stovnerOuter', 9, 2, 'up'); g.player.sinceBattle = 0;
        await T.step('up');
        T.check('back where the Light Vest was', g.player.x === 9 && g.player.y === 1);
        T.check('no second helping after reloading and travelling', g.mode === 'world' && g.player.weapons.length === 3 && g.player.armors.length === 3, g.mode);
        await T.tap('KeyX', 6); await T.tap('ArrowUp', 4); await T.tap('ArrowUp', 4);
        await T.tap('Space', 4); await T.tap('Space', 4);
        T.check('back to the Crystal Sword', g.player.weapon === 'crystal' && g.player.weapons.length === 3);
        await T.tap('ArrowDown', 4);
        await T.tap('Space', 4); await T.tap('Space', 4);
        T.check('back to the Tough Vest', g.player.armor === 'vest' && g.player.armors.length === 3);
        await T.tap('KeyX', 6);
        T.state('changed-back');
      }`,
    ],
  },
  { // the on-screen buttons: open a chest, wear the axe, fight a golem, save, reopen
    name: 'stovner-touch', save: inOuter,
    run: [
      `async (T, g) => {
        await T.continueGame();
        T.place('stovnerOuter', 27, 2, 'up');
        await T.touch('up', 14);
        T.check('the D-pad opens the chest', g.mode === 'dialog', g.mode);
        while (g.mode === 'dialog') { await T.frames(150); await T.touch('a', 3); }
        await T.frames(10);
        T.check('the axe is owned', g.player.weapons.includes('axe') && g.player.weapon === 'crystal');
        await T.touch('b');
        T.check('B opens the menu on SAVE', g.mode === 'menu' && g.menuSel === 2);
        await T.touch('up'); await T.touch('up');
        T.check('up twice: the weapon', g.menuSel === 0);
        T.shot('weapons');
        await T.touch('a');
        T.check('A wears the axe', g.player.weapon === 'axe' && g.mode === 'menu');
        await T.touch('down');
        await T.touch('a');
        T.check('A on the armour line with one vest: the tunic', g.player.armor === 'none');
        await T.touch('a');
        T.check('and back', g.player.armor === 'vest');
        await T.touch('left'); await T.touch('right');
        await T.touch('down');
        await T.touch('a');
        T.check('A on SAVE saves', g.menuNote && g.menuNote.text === 'SAVED!' && JSON.parse(localStorage.getItem('turnip-vale-save-v1')).player.weapon === 'axe');
        await T.touch('b');
        T.place('stovnerOuter', 17, 5, 'up'); g.player.sinceBattle = 99;
        const real = Math.random;
        Math.random = () => 0;
        await T.touch('up', 14);
        await T.until(() => g.mode === 'battle', 'a battle');
        Math.random = real;
        await T.untilBattle();
        T.check('a golem', g.battle.type === 'golem');
        let presses = 0;
        while (g.mode === 'battle') {
          await T.until(() => g.mode !== 'battle' || g.battle.phase === 'menu', 'the battle menu');
          if (g.mode !== 'battle') break;
          if (++presses > 20) throw new Error('the fight never ended');
          await T.touch('a', 3);
          await T.until(() => g.mode !== 'battle' || g.battle.phase !== 'menu', 'the action to start');
        }
        await T.frames(70);
        T.check('beaten with the A button', g.stats.won === 53 && presses <= 3 && g.mode === 'world', presses);
        await T.touch('b'); await T.touch('a');
        T.check('saved after the fight', g.menuNote && g.menuNote.text === 'SAVED!');
        T.shot('saved');
        await T.touch('b');
        T.state('saved');
      }`,
      `async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: the axe, the win and the chest flag', g.player.weapon === 'axe' && g.stats.won === 53 && g.player.xp === 34 && g.flags.chestAxe === true && g.player.map === 'stovnerOuter');
        T.state('continued');
      }`,
    ],
  },
  { // every way an old save can be dressed, one after another, then a save with gear this version does not know
    name: 'gear-migration', save: FIX.finished,
    run: [
      ...GEAR.map((_, i) => migrate(i)),
      `async (T, g) => {
        await T.continueGame();
        T.check('unknown gear is kept, and the stick and tunic are always there', JSON.stringify(g.player.weapons) === '["none","crystal","futureBlade"]' && JSON.stringify(g.player.armors) === '["futureCoat","vest","none"]', JSON.stringify([g.player.weapons, g.player.armors]));
        await T.tap('KeyX', 6); await T.tap('ArrowUp', 4); await T.tap('ArrowUp', 4);
        T.shot('weapons');
        await T.tap('Space', 4); await T.tap('Space', 4);
        T.check('the menu only offers what it knows', g.player.weapon === 'crystal' && g.mode === 'menu');
        await T.tap('ArrowDown', 4); await T.tap('ArrowDown', 4); await T.tap('Space', 6);
        const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        T.check('and saves the unknown gear back', d.player.weapons.includes('futureBlade') && d.player.armors.includes('futureCoat') && d.player.mystery === 7 && JSON.stringify(d.q.kebab1) === '{"s":1,"found":2}');
      }`,
    ],
  },
  { // Bram: buy the sword and the vest, have the Crystal Sword forged, and still own all three
    name: 'gear-bram', save: FIX.bram,
    run: async (T, g) => {
      await T.continueGame();
      await T.talk();
      await T.tap('ArrowDown'); await T.tap('Space', 4);
      await T.tap('ArrowDown'); await T.tap('Space', 4);
      T.check('bought and put on', g.player.weapon === 'iron' && g.player.armor === 'vest' && g.player.gold === 25, g.player.gold);
      await T.tap('KeyX', 6);
      await T.talk();
      T.check('the Crystal Sword is worn and the Iron Sword kept', g.player.weapon === 'crystal' && JSON.stringify(g.player.weapons) === '["none","iron","crystal"]' && JSON.stringify(g.player.armors) === '["none","vest"]', JSON.stringify(g.player.weapons));
      await T.talk();
      T.check('the shop again', g.mode === 'shop', g.mode);
      await T.tap('ArrowDown'); await T.tap('Space', 4);
      await T.tap('ArrowDown'); await T.tap('Space', 4);
      T.check('nothing can be bought twice', g.player.gold === 25 && g.player.weapons.length === 3 && g.player.armors.length === 2, g.player.gold);
      await T.tap('KeyX', 6);
      await T.tap('KeyX', 6); await T.tap('ArrowUp', 4); await T.tap('ArrowUp', 4);
      T.shot('weapons');
      await T.tap('Space', 4);
      T.check('crystal -> stick', g.player.weapon === 'none');
      await T.tap('Space', 4);
      T.check('stick -> iron', g.player.weapon === 'iron');
      T.shot('iron');
      await T.tap('Space', 4);
      T.check('iron -> crystal', g.player.weapon === 'crystal');
      await T.tap('KeyX', 6);
      T.state('after');
    },
  },
  { // the shop goes by what is owned, not by what is worn
    name: 'gear-shop-owned',
    save: { ...FIX.bram, player: { ...FIX.bram.player, weapon: 'axe', weapons: ['none', 'axe'], armor: 'light', armors: ['none', 'vest', 'light'] } },
    run: async (T, g) => {
      await T.continueGame();
      await T.talk();
      T.check('shop opened', g.mode === 'shop', g.mode);
      T.shot('shop');
      await T.tap('ArrowDown'); await T.tap('Space', 4);
      T.check('an axe is no reason not to buy a sword', g.player.gold === 60 && g.player.weapon === 'iron' && JSON.stringify(g.player.weapons) === '["none","axe","iron"]', JSON.stringify(g.player.weapons));
      await T.tap('ArrowDown'); await T.tap('Space', 4);
      T.check('a Tough Vest in the pack is not sold again', g.player.gold === 60 && g.player.armor === 'light' && g.player.armors.length === 3, g.player.gold);
      T.shot('vest-owned');
      await T.tap('KeyX', 6);
      T.state('after');
    },
  },
];

// Stovner's people and quests: JOHANNE's three, the tunnel, LÆRER HEIDI and BASIL's kebab.
const atJohanne = moved(gateOpen, 'stovner', 16, 9, 'up');
// With JOHANNE's first two quests done and the third running: the tunnel is open.
const withUnder = (fix) => ({
  ...fix, q: { ...fix.q, road: { s: 3, n: 3 }, cart: DONE, under: { s: 1 } }, flags: { ...fix.flags, tunnelOpen: true }, tracked: 'under',
});
const atTunnel = withUnder(moved(gateOpen, 'stovner', 12, 15, 'down'));
const atHeidi = withUnder(moved(gateOpen, 'tunnel', 9, 9, 'down'));
// The fight with LÆRER HEIDI, eating an herb when below 40 HP; photographs her warning, her quiz and her end.
const HEIDI = `async (T, g) => {
  ${MEET}
  await T.continueGame();
  const gold = g.player.gold, xp = g.player.xp, won = g.stats.won, herbs = g.player.herbs;
  await T.talk('before');
  await T.untilBattle();
  const b = g.battle;
  T.check('LÆRER HEIDI, by that exact name', b.name === 'LÆRER HEIDI' && b.name.length === 11 && b.name.charCodeAt(1) === 0xC6, b.name);
  T.check('a miniboss: 100 HP, ATK 20, DEF 14', b.type === 'heidi' && b.boss === true && b.max === 100 && b.atk === 20 && b.def === 14 && b.xp === 70, JSON.stringify([b.max, b.atk, b.def, b.xp]));
  T.check('she waits for the hero to move first', g.player.hp === g.player.maxhp && b.turn === 0);
  T.shot('battle');
  let turns = 0;
  const seen = {};
  while (g.mode === 'battle') {
    await T.until(() => g.mode !== 'battle' || b.phase === 'menu', 'the battle menu');
    if (g.mode !== 'battle') break;
    if (++turns > 30) throw new Error('the fight never ended');
    const want = g.player.hp < 40 && g.player.herbs > 0 ? 1 : 0;
    while (b.menu !== want) await T.tap('ArrowDown', 1);
    await T.tap('Space', 1);
    await T.until(() => g.mode !== 'battle' || b.phase !== 'menu', 'the action to start');
    while (g.mode === 'battle' && b.phase !== 'menu') {
      for (const [k, re] of [['warning', /PAY ATTENTION/], ['quiz', /POP QUIZ/], ['defeated', /dismissed/]]) {
        if (!seen[k] && re.test(b.msg) && b.shown >= b.msg.length) { seen[k] = true; T.shot(k); }
      }
      await T.frames(1);
    }
  }
  await T.frames(70);
  T.check('she warned before the pop quiz', seen.warning === true && seen.quiz === true);
  T.check('beaten', seen.defeated === true && g.stats.won === won + 1 && g.player.hp > 0 && g.mode === 'world' && g.player.map === 'tunnel', g.mode + ' ' + g.player.map);
  T.check('70 XP and 60 gold', g.player.xp === xp + 70 && g.player.gold === gold + 60, (g.player.xp - xp) + ' ' + (g.player.gold - gold));
  T.check('the quest is ready for JOHANNE', g.q.under.s === 2 && g.tracked === 'under');
  T.check('saved', saved().q.under.s === 2 && saved().stats.won === won + 1);
  T.check('a fair fight', turns <= LIMIT[0] && herbs - g.player.herbs <= LIMIT[1], turns + ' turns, ' + (herbs - g.player.herbs) + ' herbs');
  T.check('she has left the doorway', !g.NPCS.some((n) => n.id === 'heidi' && n.visible()) && g.NPCS.some((n) => n.id === 'heidi2' && n.visible()));
  T.state('beaten');
}`;
const heidiFight = (turns, herbs) => HEIDI.replace(/LIMIT/g, `[${turns}, ${herbs}]`);
// BASIL's kebab from start to finish, whatever else has been done.
const KEBAB = `async (T, g) => {
  const KEY = 'turnip-vale-save-v1', saved = () => JSON.parse(localStorage.getItem(KEY));
  await T.continueGame();
  const others = JSON.stringify([g.q.road, g.q.cart, g.q.under]), maxhp = g.player.maxhp, gold = g.player.gold;
  T.place('stovnerOuter', 7, 10, 'left');
  await T.step('left'); await T.step('right');
  T.check('no kebab lies about before BASIL asks', g.mode === 'world' && !g.flags.kebab);
  T.place('stovner', 20, 11, 'up');
  await T.frames(20);
  T.shot('basil');
  await T.talk('offer');
  T.check('accepted and saved', g.q.kebab.s === 1 && saved().q.kebab.s === 1 && g.tracked === 'kebab', g.tracked);
  T.shot('tracker');
  await T.menuShot('log');
  await T.talk('waiting');
  T.place('stovnerOuter', 7, 10, 'left');
  await T.frames(20);
  T.shot('kebab');
  await T.step('left');
  T.check('found by walking onto it', g.mode === 'dialog' && g.player.x === 6 && g.player.y === 10, g.mode);
  await T.dialog('found');
  T.check('ready and saved', g.q.kebab.s === 2 && g.flags.kebab === true && saved().q.kebab.s === 2 && saved().flags.kebab === true);
  await T.step('right'); await T.step('left');
  T.check('only one kebab', g.mode === 'world');
  T.place('stovner', 20, 11, 'up');
  await T.frames(20);
  T.shot('ready');
  await T.talk('return');
  T.check('MAX HP +6, healed, done', g.player.maxhp === maxhp + 6 && g.player.hp === maxhp + 6 && g.q.kebab.s === 3 && saved().q.kebab.s === 3, g.player.maxhp);
  await T.talk('after'); await T.talk('after-2');
  T.check('no second helping', g.player.maxhp === maxhp + 6 && g.player.gold === gold);
  T.check('JOHANNE\\'s quests are untouched', JSON.stringify([g.q.road, g.q.cart, g.q.under]) === others, others);
  T.state('done');
}`;
const questScenarios = [
  { // who lives in Stovner, what they say, and that the game's font can spell LÆRER
    name: 'stovner-people', save: inHub,
    run: async (T, g) => {
      await T.continueGame();
      T.shot('arriving');
      const c = document.createElement('canvas').getContext('2d');
      c.font = '8px "Press Start 2P"';
      const ae = c.measureText('Æ').width, m = c.measureText('M').width;
      c.font = '8px monospace';
      T.check('Æ is a letter of the game font, as wide as any other', ae === m && ae === 8 && c.measureText('Æ').width !== 8, ae + ' ' + m + ' ' + c.measureText('Æ').width);
      const here = g.NPCS.filter((n) => n.map === 'stovner').map((n) => n.id + ' ' + n.x + ',' + n.y).join('; ');
      T.check('four people in the town', here === 'johanne 16,8; basil 20,10; dot 7,10; gus 10,16', here);
      T.check('nobody new anywhere else but LÆRER HEIDI in the tunnel and MOHSIN in the shrine', g.NPCS.filter((n) => !['village', 'forest', 'cave', 'stovner', 'ammerud', 'darkPath', 'grorudHeights', 'grorudTown', 'grorudWorks', 'veitvet', 'veitvetUnder', 'veitvetCenter'].includes(n.map)).map((n) => n.id + '@' + n.map).join() === 'heidi@tunnel,heidi2@tunnel,mohsin@shrine'
        && g.NPCS.filter((n) => n.map === 'village').length === 5 && g.NPCS.filter((n) => n.map === 'stovnerOuter').length === 0);
      // JOHANNE must not sit under the status panel (2..93 across, 2..31 down) from the roads that lead to her
      const town = g.MAPS.stovner, hidden = [];
      const seenFrom = (x, y, tx, ty) => {
        const camX = Math.max(0, Math.min(x * 16 + 8 - 120, town.w * 16 - 240)), camY = Math.max(0, Math.min(y * 16 + 8 - 80, town.h * 16 - 160));
        const sx = tx * 16 - camX, sy = ty * 16 - camY;
        return sx < 94 && sx + 16 > 2 && sy < 32 && sy + 16 > 2;
      };
      for (let x = 1; x <= 24; x++) if (seenFrom(x, 9, 16, 8)) hidden.push(x + ',9');
      for (let y = 1; y <= 7; y++) if (seenFrom(12, y, 16, 8)) hidden.push('12,' + y);
      T.check('JOHANNE is never under the status panel from the main street or the north road', hidden.length === 0, hidden.join(' '));
      T.check('everybody has something to say first: JOHANNE and BASIL show a mark, DOT and GUS do not',
        g.NPCS.filter((n) => n.map === 'stovner' && n.news && n.news()).map((n) => n.id).join() === 'johanne,basil');
      await T.step('left', 8);
      T.shot('johanne');
      T.place('stovner', 7, 11, 'up');
      await T.frames(20);
      T.shot('dot');
      await T.talk('dot-1'); await T.talk('dot-2'); await T.talk('dot-3');
      T.check('DOT is DOT', g.mode === 'world');
      T.place('stovner', 10, 15, 'down');
      await T.frames(20);
      T.shot('gus');
      await T.talk('gus-1'); await T.talk('gus-2');
      T.place('stovner', 12, 15, 'down');
      await T.talk('tunnel-shut');
      await T.step('down');
      T.check('the tunnel is barred until JOHANNE says otherwise', g.player.y === 15 && g.player.map === 'stovner' && !g.flags.tunnelOpen);
      T.place('stovnerOuter', 23, 10, 'up');
      await T.talk('cart');
      T.check('the cart tells nothing before its quest', g.q.cart.s === 0);
      T.place('stovnerOuter', 14, 3, 'up');
      await T.talk('barricade');
      T.check('nothing was started, given or saved by talking', JSON.stringify(g.q.road) === '{"s":0,"n":0}' && g.q.kebab.s === 0 && g.player.gold === 260 && Object.keys(g.flags).length === 7);
    },
  },
  { // old saves standing where somebody now stands wake up beside them; everyone else stays put
    name: 'stovner-settle', save: moved(gateOpen, 'stovner', 16, 8, 'left'),
    run: [[16, 8, 16, 7], [20, 10, 20, 9], [7, 10, 7, 9], [10, 16, 10, 15], [14, 7, 14, 7]].map(([x, y, wx, wy], i, all) => `async (T, g) => {
      const KEY = 'turnip-vale-save-v1', next = ${JSON.stringify(all[i + 1] || null)};
      const before = JSON.parse(localStorage.getItem(KEY));
      T.check('saved at ${x},${y}', before.player.x === ${x} && before.player.y === ${y});
      await T.continueGame();
      T.check('wakes at ${wx},${wy}', g.player.x === ${wx} && g.player.y === ${wy} && g.player.map === 'stovner' && g.player.dir === 'left', g.player.x + ',' + g.player.y);
      T.check('on open ground, not on anybody', !g.SOLID.has(g.MAPS.stovner.rows[g.player.y][g.player.x]) && !g.NPCS.some((n) => n.map === 'stovner' && n.x === g.player.x && n.y === g.player.y));
      if (${i} === 0) T.shot('beside-johanne');
      await T.step('left'); await T.step('right');
      T.check('free to walk', g.mode === 'world' && g.player.x === ${wx} && g.player.y === ${wy}, g.player.x + ',' + g.player.y);
      await T.tap('KeyX', 6); await T.tap('Space', 6); await T.tap('KeyX', 6);
      const d = JSON.parse(localStorage.getItem(KEY));
      T.check('everything but the spot is as it was', d.player.gold === before.player.gold && JSON.stringify(d.flags) === JSON.stringify(before.flags) && d.player.weapon === before.player.weapon);
      if (next) { Object.assign(d.player, { x: next[0], y: next[1], fx: next[0], fy: next[1], tx: next[0], ty: next[1], dir: 'left' }); localStorage.setItem(KEY, JSON.stringify(d)); }
    }`),
  },
  { // JOHANNE's first two quests, with a reopen at every stage
    name: 'stovner-quests', save: atJohanne,
    run: [
      `async (T, g) => {
        ${MEET}
        await T.continueGame();
        T.shot('johanne');
        await T.talk('offer');
        T.check('ROAD TROUBLE accepted and saved', g.q.road.s === 1 && g.q.road.n === 0 && g.tracked === 'road' && saved().q.road.s === 1);
        T.check('the others wait their turn', g.q.cart.s === 0 && g.q.under.s === 0 && g.q.kebab.s === 0 && !g.flags.tunnelOpen);
        T.shot('tracker');
        await T.menuShot('log');
        await T.talk('progress-0');
        const wins = [[20, 8, 'left', 'rat'], [5, 15, 'left', 'blue'], [17, 4, 'up', 'golem']];
        for (let i = 0; i < 3; i++) {
          const [x, y, dir, foe] = wins[i];
          g.player.hp = g.player.maxhp;
          await meet(x, y, dir, 0);
          if (g.battle.type !== foe) throw new Error('met a ' + g.battle.type);
          if (i === 0) {
            await T.fight(() => 2);
            T.check('running away counts for nothing', g.q.road.n === 0);
            await meet(x, y, dir, 0);
          }
          await T.fight();
          T.check('monsters off the road: ' + (i + 1), g.q.road.n === i + 1 && g.q.road.s === (i === 2 ? 2 : 1), g.q.road.n + ' ' + g.q.road.s);
          if (i === 0) { T.shot('tracker-1'); await T.menuShot('log-1'); }
        }
        T.check('ready, tracked and saved', g.tracked === 'road' && saved().q.road.s === 2 && saved().q.road.n === 3);
        T.shot('tracker-ready');
        g.player.hp = g.player.maxhp;
        await meet(5, 15, 'left', 0);
        await T.fight();
        T.check('a fourth win changes nothing', g.q.road.n === 3 && g.q.road.s === 2);
        T.state('road-ready');
      }`,
      `async (T, g) => {
        ${MEET}
        await T.continueGame();
        T.check('CONTINUE: still ready', g.q.road.s === 2 && g.q.road.n === 3 && g.player.map === 'stovnerOuter');
        T.place('stovner', 16, 9, 'up');
        await T.frames(20);
        T.shot('johanne-ready');
        const gold = g.player.gold;
        await T.talk('turn-in');
        T.check('60 gold, done, and the cart quest follows at once', g.player.gold === gold + 60 && g.q.road.s === 3 && g.q.cart.s === 1 && g.tracked === 'cart' && saved().q.cart.s === 1, g.player.gold - gold);
        await T.talk('cart-progress');
        T.check('paid once', g.player.gold === gold + 60);
        T.shot('tracker-cart');
        await T.menuShot('log-cart');
        T.place('stovner', 12, 15, 'down');
        await T.step('down');
        T.check('the tunnel is still barred', g.player.y === 15 && !g.flags.tunnelOpen);
        T.place('stovnerOuter', 23, 10, 'up');
        await T.frames(20);
        T.shot('cart');
        await T.talk('clue');
        T.check('the cart is read: ready, saved, nothing handed over', g.q.cart.s === 2 && saved().q.cart.s === 2 && g.tracked === 'cart' && Object.keys(g.flags).length === 7 && g.player.gold === gold + 60);
        await T.talk('cart-again');
        T.check('reading it twice changes nothing', g.q.cart.s === 2);
        T.state('cart-ready');
      }`,
      `async (T, g) => {
        ${MEET}
        await T.continueGame();
        T.check('CONTINUE: the cart is still read', g.q.cart.s === 2 && g.q.road.s === 3);
        T.place('stovner', 16, 9, 'up');
        const gold = g.player.gold;
        await T.talk('turn-in-cart');
        T.check('40 gold, done, and UNDER STOVNER follows at once', g.player.gold === gold + 40 && g.q.cart.s === 3 && g.q.under.s === 1 && g.tracked === 'under', g.player.gold - gold);
        T.check('the bars are off, for good', g.flags.tunnelOpen === true && saved().flags.tunnelOpen === true && saved().q.under.s === 1);
        await T.talk('under-progress');
        T.check('paid once', g.player.gold === gold + 40);
        T.shot('tracker-under');
        await T.menuShot('log-under');
        T.place('stovner', 10, 15, 'down');
        await T.talk('gus');
        T.place('stovner', 12, 14, 'down');
        await T.step('down');
        await T.frames(20);
        T.shot('tunnel-open');
        await T.tap('KeyX', 6); await T.tap('Space', 6); await T.tap('KeyX', 6);
        T.check('fragment, key, gate and gear are as they were', g.flags.fragment1 && g.flags.redKey && g.flags.redGate && g.player.weapon === 'crystal' && g.chapter === 1 && g.storyDone === false);
        T.state('under-active');
      }`,
      `async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: the tunnel is still open', g.flags.tunnelOpen === true && g.q.under.s === 1 && g.player.x === 12 && g.player.y === 15);
        await T.step('down');
        await T.until(() => g.player.map === 'tunnel', 'the tunnel');
        await T.frames(60);
        T.check('down the steps', g.player.x === 9 && g.player.y === 1 && g.player.dir === 'down' && g.mode === 'world', g.player.x + ',' + g.player.y);
      }`,
    ],
  },
  { // a save closed between JOHANNE's reward and her next request is offered the request again
    name: 'stovner-quests-mid-conversation',
    save: { ...atJohanne, q: { ...atJohanne.q, road: { s: 3, n: 3 } } },
    run: [
      async (T, g) => {
        await T.continueGame();
        T.check('JOHANNE has news', g.NPCS.find((n) => n.id === 'johanne').news() === true);
        await T.talk('cart-offer');
        T.check('the cart quest', g.q.cart.s === 1 && g.player.gold === 260);
        g.q.cart.s = 3; g.tracked = null; // as if closed right after the cart's reward
        await T.tap('KeyX', 6); await T.tap('Space', 6); await T.tap('KeyX', 6);
      },
      async (T, g) => {
        await T.continueGame();
        T.check('JOHANNE has news again', g.q.cart.s === 3 && g.q.under.s === 0 && !g.flags.tunnelOpen && g.NPCS.find((n) => n.id === 'johanne').news() === true);
        await T.talk('under-offer');
        T.check('the tunnel quest, and the bars come off', g.q.under.s === 1 && g.flags.tunnelOpen === true && g.player.gold === 260);
      },
    ],
  },
  { // down the steps, round the ring, up to LÆRER HEIDI's door
    name: 'tunnel-tour', save: atTunnel,
    run: [
      async (T, g) => {
        await T.continueGame();
        await T.step('down');
        await T.until(() => g.player.map === 'tunnel', 'the tunnel');
        await T.frames(20);
        T.shot('arriving');
        await T.frames(40);
        const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        T.check('at the foot of the steps, autosaved', g.player.x === 9 && g.player.y === 1 && g.player.dir === 'down' && d.player.map === 'tunnel' && d.player.y === 1, g.player.x + ',' + g.player.y);
        await T.frames(120);
        T.check('no bouncing back', g.player.map === 'tunnel' && g.player.y === 1);
        // with the dice held at 0 every step inside a zone starts a battle
        const real = Math.random;
        Math.random = () => 0;
        g.player.sinceBattle = 99;
        await T.step('down', 2); await T.step('right'); await T.step('left', 2); await T.step('right');
        await T.frames(90);
        T.check('the foot of the steps is safe', g.mode === 'world' && g.player.x === 9 && g.player.y === 3, g.mode);
        T.place('tunnel', 9, 7, 'down'); g.player.sinceBattle = 99;
        await T.step('left'); await T.step('right', 3); await T.step('left', 2); await T.step('down', 2);
        await T.frames(90);
        T.check('so is the way to the far room', g.mode === 'world' && g.player.x === 9 && g.player.y === 9, g.mode + ' ' + g.player.x + ',' + g.player.y);
        T.place('tunnel', 8, 3, 'left'); g.player.sinceBattle = 99;
        await T.step('left');
        await T.until(() => g.mode === 'battle', 'a battle in the west passage');
        Math.random = real;
        await T.untilBattle();
        T.check('a golem in the west passage', g.battle.type === 'golem', g.battle.type);
        T.shot('battle');
        await T.fight(() => 2);
        Math.random = () => 0;
        T.place('tunnel', 11, 7, 'right'); g.player.sinceBattle = 99;
        await T.step('right');
        Math.random = () => 0.6;
        await T.until(() => g.mode === 'battle', 'a battle in the east passage');
        Math.random = real;
        await T.untilBattle();
        T.check('a rat in the east passage', g.battle.type === 'rat', g.battle.type);
        await T.fight(() => 2);
        // ---- the walk itself, with the monsters switched off in the running game
        g.MAPS.tunnel.encounter = null;
        g.player.hp = g.player.maxhp;
        T.place('tunnel', 9, 3, 'left');
        await T.step('left', 6); await T.step('left');
        T.check('the west corner', g.player.x === 3 && g.player.y === 3, g.player.x + ',' + g.player.y);
        T.shot('west-passage');
        await T.step('down', 4); await T.step('right', 13); await T.step('up', 4); await T.step('left', 6);
        T.check('all the way round the ring', g.player.x === 10 && g.player.y === 3, g.player.x + ',' + g.player.y);
        await T.step('left'); await T.step('down', 4); await T.step('down');
        T.check('the middle is solid', g.player.x === 9 && g.player.y === 3, g.player.x + ',' + g.player.y);
        T.place('tunnel', 10, 7, 'down');
        await T.step('down'); await T.step('down');
        T.check('one way on only', g.player.x === 10 && g.player.y === 8, g.player.x + ',' + g.player.y);
        await T.step('left'); await T.step('down'); await T.step('down');
        T.check('LÆRER HEIDI fills the doorway', g.player.x === 9 && g.player.y === 9 && g.player.dir === 'down', g.player.x + ',' + g.player.y);
        T.shot('heidi');
        await T.step('left'); await T.step('right');
        T.check('and there is no way round her', g.player.x === 9 && g.player.y === 9);
        await T.tap('KeyX', 6); await T.tap('Space', 6);
        T.check('SAVED! in the tunnel', g.menuNote && g.menuNote.text === 'SAVED!');
        await T.tap('KeyX', 6);
        T.state('at-the-door');
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE in the tunnel', g.player.map === 'tunnel' && g.player.x === 9 && g.player.y === 9 && g.q.under.s === 1);
        T.shot('continued');
        T.place('tunnel', 10, 1, 'up');
        await T.step('up');
        await T.until(() => g.player.map === 'stovner', 'the town');
        await T.frames(60);
        T.check('up the right-hand steps to the right-hand mouth', g.player.x === 13 && g.player.y === 15 && g.player.dir === 'up' && g.mode === 'world', g.player.x + ',' + g.player.y);
        T.shot('back-in-town');
        await T.frames(120);
        T.check('no bouncing back', g.player.map === 'stovner' && g.player.y === 15);
        await T.step('down');
        await T.until(() => g.player.map === 'tunnel', 'the tunnel');
        await T.frames(60);
        T.check('and down again', g.player.x === 10 && g.player.y === 1 && g.player.dir === 'down', g.player.x + ',' + g.player.y);
        T.place('tunnel', 9, 1, 'up');
        await T.step('up');
        await T.until(() => g.player.map === 'stovner', 'the town');
        await T.frames(60);
        T.check('the left-hand steps to the left-hand mouth', g.player.x === 12 && g.player.y === 15, g.player.x + ',' + g.player.y);
      },
    ],
  },
  { name: 'heidi', save: atHeidi, run: heidiFight(12, 2) },
  ...['mohammed', 'celine', 'alexandra'].map((id) => ({
    name: `heidi-${id}`, save: withHero(atHeidi, id), run: heidiFight(12, 2), sameAs: { beaten: 'heidi__beaten' },
  })),
  { // level 8, Iron Sword, Tough Vest, no axe: the hardest way to do it
    name: 'heidi-modest', save: withUnder(moved(modest, 'tunnel', 9, 9, 'down')), run: heidiFight(20, 5),
  },
  { // the same hero with the Heavy Axe from the chest
    name: 'heidi-modest-axe',
    save: (() => { const d = JSON.parse(JSON.stringify(withUnder(moved(modest, 'tunnel', 9, 9, 'down')))); d.player.weapons = ['none', 'iron', 'axe']; d.player.armors = ['none', 'vest']; d.player.weapon = 'axe'; return d; })(),
    run: heidiFight(8, 2),
  },
  { // one measured blow with each weapon, running away in between
    name: 'heidi-weapons', save: atHeidi,
    run: `async (T, g) => {
      ${MEET}
      await T.continueGame();
      const dealt = {};
      for (const w of ['iron', 'crystal', 'axe']) {
        g.player.weapon = w; g.player.hp = g.player.maxhp;
        await T.talk();
        await T.untilBattle();
        dealt[w] = await swing();
        await T.fight(() => 2);
        T.check('got away; she is still in the doorway', g.mode === 'world' && g.q.under.s === 1 && g.NPCS.some((n) => n.id === 'heidi' && n.visible()), g.mode);
      }
      // hero ATK 22; +3 / +7 / +2; +1 from the dice; less her DEF 14, unless the axe
      T.check('iron 12, crystal 16, axe 25', dealt.iron === 12 && dealt.crystal === 16 && dealt.axe === 25, JSON.stringify(dealt));
      g.player.hp = g.player.maxhp;
      const herbs = g.player.herbs;
      await T.talk();
      await T.untilBattle();
      let blows = 0;
      await T.fight(() => { blows++; return 0; });
      T.check('with the Heavy Axe: five blows at most and no herbs', blows <= 5 && g.player.herbs === herbs && g.q.under.s === 2 && g.player.hp > 0, blows + ' blows, ' + g.player.hp + ' HP');
      T.state('beaten-with-the-axe');
    }`,
  },
  { // beaten by her: carried home, and she is still there to try again
    name: 'heidi-defeat', save: withUnder(moved(feeble, 'tunnel', 9, 9, 'down')),
    run: [
      async (T, g) => {
        await T.continueGame();
        await T.talk();
        await T.untilBattle();
        await T.fight();
        T.check('carried home', g.mode === 'dialog' && g.stats.won === 0, g.mode);
        T.shot('wren');
        await T.dialog();
        const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        T.check('in the village, patched up, saved there', g.player.map === 'village' && g.player.hp === g.player.maxhp && d.player.map === 'village');
        T.check('the quest and the open tunnel are kept', d.q.under.s === 1 && d.flags.tunnelOpen === true && d.player.gold === 33);
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE in the village', g.player.map === 'village' && g.mode === 'world');
        T.place('tunnel', 9, 9, 'down');
        await T.tap('Space', 3);
        T.check('she is waiting for another try', g.mode === 'dialog' && g.dlg.name === 'LÆRER HEIDI', g.mode);
      },
    ],
  },
  { // after the fight: her corner, the slate, the cave-in, then JOHANNE and the way on
    name: 'stovner-after-heidi',
    save: { ...atHeidi, q: { ...atHeidi.q, under: { s: 2 } } },
    run: [
      async (T, g) => {
        await T.continueGame();
        T.check('a save made after the fight: she is out of the doorway', g.q.under.s === 2 && !g.NPCS.find((n) => n.id === 'heidi').visible());
        T.shot('doorway');
        await T.tap('Space', 6);
        T.check('nobody there to fight', g.mode === 'world');
        await T.step('down', 2); await T.step('left'); await T.step('left');
        T.check('beside her corner', g.player.x === 8 && g.player.y === 11 && g.player.dir === 'left', g.player.x + ',' + g.player.y);
        T.shot('room');
        await T.talk('heidi');
        T.check('talking is all she does now', g.mode === 'world' && g.stats.won === 52);
        await T.step('up'); await T.step('right', 3); await T.step('up');
        T.check('at the slate', g.player.x === 11 && g.player.y === 10 && g.player.dir === 'up', g.player.x + ',' + g.player.y);
        await T.talk('slate');
        await T.step('down'); await T.step('right'); await T.step('right');
        T.check('at the cave-in', g.player.x === 12 && g.player.y === 11 && g.player.dir === 'right', g.player.x + ',' + g.player.y);
        T.shot('cave-in');
        await T.talk('cave-in');
        await T.step('right');
        T.check('no way on', g.player.x === 12 && g.player.map === 'tunnel');
        T.place('stovner', 16, 9, 'up');
        await T.frames(20);
        T.shot('johanne-ready');
        const gold = g.player.gold;
        g.player.hp = 40; g.player.herbs = 1;
        await T.talk('turn-in');
        const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        T.check('100 gold, a bigger pouch filled, healed', g.player.gold === gold + 100 && g.player.maxHerbs === 6 && g.player.herbs === 6 && g.player.hp === g.player.maxhp, JSON.stringify([g.player.gold - gold, g.player.maxHerbs, g.player.hp]));
        T.check('UNDER STOVNER is done and saved', g.q.under.s === 3 && d.q.under.s === 3 && g.tracked === null);
        T.check('and that is all: no chapter end, no new fragment or key, no new quest', g.mode === 'world' && g.chapter === 1 && g.storyDone === false
          && Object.keys(g.flags).sort().join() === 'fragment1,metBram,redGate,redKey,shard1,shard2,tunnelOpen,vines' && g.q.mohsin.s === 0, Object.keys(g.flags).sort().join());
        T.check('JOHANNE has more to say', g.NPCS.find((n) => n.id === 'johanne').news() === true);
        T.shot('hud');
        await T.tap('KeyX', 6);
        T.check('eight quests known: the log opens on its first page', g.menuPage === 0 && g.menuSel === 2);
        T.shot('log-1');
        await T.tap('ArrowRight', 6);
        T.check('right: the Stovner quests', g.menuPage === 1);
        T.shot('log-2');
        await T.tap('ArrowUp', 4); await T.tap('ArrowLeft', 6);
        T.check('pages turn with the cursor on the armour', g.menuPage === 0 && g.menuSel === 1);
        await T.tap('KeyX', 6);
        T.place('stovnerOuter', 14, 3, 'up');
        await T.talk('barricade');
        await T.step('up');
        T.check('the road north is still shut', g.player.y === 3 && g.player.map === 'stovnerOuter');
        T.place('stovner', 1, 9, 'left');
        await T.talk('west-gate');
        await T.step('left');
        T.check('so is the west gate', g.player.x === 1 && g.player.map === 'stovner');
        T.place('stovner', 10, 15, 'down');
        await T.talk('gus');
        T.place('stovner', 7, 11, 'up');
        for (let i = 1; i <= 4; i++) await T.talk('dot-' + i);
        T.state('done');
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: all three done', g.q.road.s === 3 && g.q.cart.s === 3 && g.q.under.s === 3 && g.player.maxHerbs === 6);
        T.place('stovner', 12, 15, 'down');
        await T.step('down');
        await T.until(() => g.player.map === 'tunnel', 'the tunnel');
        await T.frames(60);
        T.place('tunnel', 8, 11, 'left');
        await T.talk('heidi-later');
        T.check('the tunnel can be visited again, and she stays beaten', g.mode === 'world' && g.q.under.s === 3 && g.stats.won === 52);
        T.state('revisit');
      },
    ],
  },
  { name: 'kebab', save: inHub, run: KEBAB },
  { name: 'kebab-during-the-chain', save: atTunnel, run: KEBAB },
  { // after everything else, as Alexandra
    name: 'kebab-after-the-chain',
    save: withHero({ ...atJohanne, q: { ...atJohanne.q, road: { s: 3, n: 3 }, cart: DONE, under: DONE }, flags: { ...atJohanne.flags, tunnelOpen: true } }, 'alexandra'),
    run: KEBAB,
  },
  { // the kebab with a reopen at each stage
    name: 'kebab-saves', save: moved(gateOpen, 'stovner', 20, 11, 'up'),
    run: [
      async (T, g) => { await T.continueGame(); await T.talk(); T.check('asked', g.q.kebab.s === 1); },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: still looking', g.q.kebab.s === 1 && g.tracked === 'kebab');
        T.place('stovnerOuter', 7, 10, 'left');
        await T.step('left');
        await T.dialog();
        T.check('found', g.q.kebab.s === 2);
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: carrying it, and none left in the grass', g.q.kebab.s === 2 && g.flags.kebab === true && g.player.x === 6 && g.player.y === 10);
        await T.step('right'); await T.step('left');
        T.check('no second kebab', g.mode === 'world');
        T.place('stovner', 20, 11, 'up');
        await T.talk();
        T.check('returned', g.q.kebab.s === 3 && g.player.maxhp === 94);
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: done, eaten once', g.q.kebab.s === 3 && g.player.maxhp === 94 && g.player.hp === 94);
        await T.talk(); await T.talk();
        T.check('BASIL has nothing more to give', g.player.maxhp === 94);
        T.state('done');
      },
    ],
  },
  { // the on-screen buttons: take JOHANNE's quest, read the log, and nothing else happens by accident
    name: 'stovner-quests-touch', save: atJohanne,
    run: async (T, g) => {
      await T.continueGame();
      const before = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
      await T.touch('a');
      T.check('A talks to JOHANNE', g.mode === 'dialog' && g.dlg.name === 'JOHANNE', g.mode);
      let presses = 0;
      while (g.mode === 'dialog') { await T.frames(150); await T.touch('a', 3); if (++presses > 12) throw new Error('the talk never ended'); }
      await T.frames(10);
      T.check('A through the talk takes the quest', g.q.road.s === 1 && g.mode === 'world');
      T.check('and neither saved by hand nor changed gear on the way', g.menuNote === null && g.player.weapon === before.player.weapon && g.player.armor === before.player.armor);
      await T.touch('b');
      T.check('B opens the log on the page of the new quest', g.mode === 'menu' && g.menuPage === 1 && g.menuSel === 2, g.menuPage);
      T.shot('log');
      await T.touch('left');
      T.check('left arrow: page 1', g.menuPage === 0);
      await T.touch('right');
      T.check('right arrow: page 2', g.menuPage === 1);
      await T.touch('up'); await T.touch('up');
      await T.touch('a');
      T.check('A on the weapon line still changes the weapon', g.player.weapon === 'none');
      await T.touch('a');
      await T.touch('down'); await T.touch('down');
      await T.touch('a');
      T.check('A on SAVE still saves', g.menuNote && g.menuNote.text === 'SAVED!' && g.player.weapon === 'crystal');
      await T.touch('b');
      T.check('B closes it', g.mode === 'world');
    },
  },
];

// FIND MOHSIN: JOHANNE's fourth quest, the north road, the shrine, MOHSIN, and the end of Chapter 2.
// A save from the end of Expansion 1D: JOHANNE's first three done, the bigger herb pouch, and no
// FIND MOHSIN quest in the file at all.
const chainDone = {
  ...atJohanne, player: { ...atJohanne.player, maxHerbs: 6, herbs: 6 },
  q: { ...atJohanne.q, road: { s: 3, n: 3 }, cart: DONE, under: DONE }, flags: { ...atJohanne.flags, tunnelOpen: true },
};
const withFind = (fix) => ({ ...fix, q: { ...fix.q, mohsin: { s: 1 } }, flags: { ...fix.flags, northOpen: true }, tracked: 'mohsin' });
const atMohsin = withFind(moved(chainDone, 'shrine', 7, 4, 'up'));
const gear = (fix, weapon, armor) => {
  const d = JSON.parse(JSON.stringify(fix));
  Object.assign(d.player, { weapon, armor, weapons: [...new Set(['none', 'crystal', weapon])], armors: [...new Set(['none', 'vest', armor])] });
  return d;
};
// The whole meeting with MOHSIN: the talk, the fight (an herb when below 45 HP), the hand-over.
const MOHSIN = `async (T, g) => {
  ${MEET}
  await T.continueGame();
  const gold = g.player.gold, xp = g.player.xp, won = g.stats.won, herbs = g.player.herbs, maxhp = g.player.maxhp;
  const nimble = g.ARMORS[g.player.armor].nimble === true;
  T.shot('shrine');
  await T.tap('KeyX', 6); await T.tap('Space', 6);
  T.check('SAVED! in front of MOHSIN', g.menuNote && g.menuNote.text === 'SAVED!' && saved().player.map === 'shrine');
  await T.tap('KeyX', 6);
  await T.frames(120);
  T.check('standing there starts nothing', g.mode === 'world' && g.player.y === 4);
  await T.talk(BEFORE);
  await T.untilBattle();
  const b = g.battle;
  T.check('MOHSIN: 125 HP, ATK 23, DEF 6', b.type === 'mohsin' && b.name === 'MOHSIN' && b.boss === true && b.max === 125 && b.atk === 23 && b.def === 6 && b.xp === 110, JSON.stringify([b.max, b.atk, b.def, b.xp]));
  T.check(nimble ? 'the Light Vest: no opening strike' : 'quick: he struck once before the hero could move',
    b.turn === 0 && (nimble ? g.player.hp === maxhp : g.player.hp < maxhp && g.player.hp >= maxhp - 16), g.player.hp);
  T.shot('battle');
  let turns = 0, blows = 0;
  const seen = {};
  while (g.mode === 'battle') {
    await T.until(() => g.mode !== 'battle' || b.phase === 'menu', 'the battle menu');
    if (g.mode !== 'battle') break;
    if (++turns > 40) throw new Error('the fight never ended');
    const want = g.player.hp < 45 && g.player.herbs > 0 ? 1 : 0;
    if (!want) blows++;
    while (b.menu !== want) await T.tap('ArrowDown', 1);
    await T.tap('Space', 1);
    await T.until(() => g.mode !== 'battle' || b.phase !== 'menu', 'the action to start');
    while (g.mode === 'battle' && b.phase !== 'menu') {
      for (const [k, re] of [['combo', /One, two/], ['pause', /steps back and watches/], ['lunge', /full force/], ['defeated', /Enough/]]) {
        if (!seen[k] && re.test(b.msg) && b.shown >= b.msg.length) { seen[k] = true; T.shot(k); }
      }
      await T.frames(1);
    }
  }
  T.check('beaten', seen.defeated === true && g.stats.won === won + 1 && g.player.hp > 0, g.mode + ' ' + g.player.hp);
  T.check('the whole pattern was seen', seen.combo === true && seen.pause === true && seen.lunge === true, JSON.stringify(seen));
  await T.until(() => g.mode === 'dialog', 'MOHSIN to speak');
  T.check('beaten is saved before anything is handed over', saved().flags.mohsinBeaten === true && !saved().flags.fragment2 && !saved().flags.blueKey && saved().q.mohsin.s === 1);
  T.check('nothing yet', !g.flags.fragment2 && !g.flags.blueKey && g.q.mohsin.s === 1 && g.dlg.name === 'MOHSIN');
  await T.dialog(HANDOVER);
  T.check('CRYSTAL FRAGMENT 2 and the BLUE KEY', g.flags.fragment2 === true && g.flags.blueKey === true && saved().flags.fragment2 === true && saved().flags.blueKey === true);
  T.check('fragment 1, the Red Key and the open gates are kept', g.flags.fragment1 === true && g.flags.redKey === true && g.flags.redGate === true && g.flags.tunnelOpen === true && g.flags.northOpen === true);
  T.check('the quest is ready for JOHANNE, and the chapter is not over', g.q.mohsin.s === 2 && g.tracked === 'mohsin' && saved().q.mohsin.s === 2 && g.chapter === 1 && g.mode === 'world');
  T.check('110 XP and 120 gold', g.player.xp + (g.player.lvl > 9 ? 303 : 0) === xp + 110 && g.player.gold === gold + 120, g.player.xp + ' ' + (g.player.gold - gold));
  T.check('a fair fight', turns <= LIMIT[0] && herbs - g.player.herbs <= LIMIT[1], turns + ' turns, ' + blows + ' blows, ' + (herbs - g.player.herbs) + ' herbs, ' + g.player.hp + ' HP left');
  T.shot('tracker');
  await T.menuShot('status');
  const flags = JSON.stringify(g.flags);
  await T.talk(AFTER1); await T.talk(AFTER2);
  T.check('he only talks now, and gives nothing twice', g.mode === 'world' && g.stats.won === won + 1 && JSON.stringify(g.flags) === flags);
  T.state('beaten');
}`;
// (only the first of these scenarios photographs the talk: it is the same for all of them)
const mohsinFight = (turns, herbs, talk = false) => MOHSIN.replace(/LIMIT/g, `[${turns}, ${herbs}]`)
  .replace('BEFORE', talk ? "'before'" : '').replace('HANDOVER', talk ? "'handover'" : '').replace('AFTER1', talk ? "'after'" : '').replace('AFTER2', talk ? "'after-2'" : '');
const mohsinReady = (fix) => ({
  ...fix, q: { ...fix.q, mohsin: { s: 2 } }, tracked: 'mohsin',
  flags: { ...fix.flags, northOpen: true, mohsinBeaten: true, fragment2: true, blueKey: true },
});
const mohsinScenarios = [
  { // nothing about FIND MOHSIN can be started before UNDER STOVNER is turned in
    name: 'mohsin-not-early',
    save: { ...atTunnel, q: { ...atTunnel.q, kebab: DONE }, flags: { ...atTunnel.flags, kebab: true } },
    run: async (T, g) => {
      await T.continueGame();
      T.place('stovner', 16, 9, 'up');
      await T.talk('johanne');
      T.check('JOHANNE still talks about the tunnel', g.q.mohsin.s === 0 && g.q.under.s === 1 && !g.flags.northOpen);
      T.place('stovnerOuter', 14, 3, 'up');
      await T.talk('barricade');
      await T.step('up');
      T.place('stovnerOuter', 15, 3, 'up');
      await T.step('up');
      T.check('the barricade stands, both lanes', g.player.x === 15 && g.player.y === 3 && g.player.map === 'stovnerOuter');
      T.place('stovner', 1, 9, 'left');
      await T.talk('west-gate');
      await T.step('left');
      T.check('the west gate is shut', g.player.x === 1 && !g.flags.blueGate);
      T.check('a finished kebab changes none of it', g.q.kebab.s === 3 && g.q.mohsin.s === 0 && g.chapter === 1);
    },
  },
  { // a save from the end of 1D: JOHANNE has news, the barricade comes down, the road north is open
    name: 'mohsin-offer', save: chainDone,
    run: [
      async (T, g) => {
        const KEY = 'turnip-vale-save-v1', saved = () => JSON.parse(localStorage.getItem(KEY));
        T.check('the save knows nothing of FIND MOHSIN', saved().q.mohsin === undefined);
        await T.continueGame();
        T.check('it loads with the quest unstarted and JOHANNE has news', g.q.mohsin.s === 0 && g.q.under.s === 3 && g.NPCS.find((n) => n.id === 'johanne').news() === true && g.chapter === 1);
        T.shot('johanne');
        T.place('stovnerOuter', 14, 3, 'up');
        await T.talk('barricade-shut');
        await T.step('up');
        T.check('the barricade is still up', g.player.y === 3);
        T.place('stovner', 16, 9, 'up');
        await T.talk('offer');
        T.check('FIND MOHSIN accepted, tracked and saved', g.q.mohsin.s === 1 && g.tracked === 'mohsin' && saved().q.mohsin.s === 1);
        T.check('the barricade is down, for good', g.flags.northOpen === true && saved().flags.northOpen === true);
        T.check('nothing else was given', !g.flags.fragment2 && !g.flags.blueKey && !g.flags.mohsinBeaten && g.player.gold === 260);
        T.shot('tracker');
        await T.tap('KeyX', 6);
        T.check('the log opens on the page of the new quest', g.menuPage === 1);
        T.shot('log');
        await T.tap('KeyX', 6);
        await T.talk('progress');
        T.check('talking again changes nothing', g.q.mohsin.s === 1 && g.mode === 'world');
        T.place('stovnerOuter', 14, 4, 'up');
        await T.frames(20);
        T.shot('barricade-gone');
        await T.step('up', 2);
        await T.tap('Space', 6);
        T.check('where the barricade stood is plain road', g.player.x === 14 && g.player.y === 2 && g.mode === 'world');
        await T.step('up', 2);
        await T.until(() => g.player.map === 'northRoad', 'the north road');
        await T.frames(20);
        T.shot('north-road');
        await T.frames(40);
        T.check('onto the north road, autosaved', g.player.x === 5 && g.player.y === 18 && g.player.dir === 'up' && saved().player.map === 'northRoad', g.player.x + ',' + g.player.y);
        await T.frames(120);
        T.check('no bouncing back', g.player.map === 'northRoad' && g.player.y === 18);
        await T.tap('KeyX', 6); await T.tap('Space', 6); await T.tap('KeyX', 6);
        T.state('on-the-road');
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE on the north road, the way still open', g.player.map === 'northRoad' && g.player.x === 5 && g.player.y === 18 && g.flags.northOpen === true && g.q.mohsin.s === 1);
        await T.step('down');
        await T.until(() => g.player.map === 'stovnerOuter', 'Outer Stovner');
        await T.frames(60);
        T.check('back down the left lane', g.player.x === 14 && g.player.y === 1 && g.player.dir === 'down' && g.mode === 'world', g.player.x + ',' + g.player.y);
        await T.frames(120);
        T.check('no bouncing back', g.player.map === 'stovnerOuter' && g.player.y === 1);
        await T.step('right'); await T.step('up');
        await T.until(() => g.player.map === 'northRoad', 'the north road');
        await T.frames(60);
        T.check('up the right lane', g.player.x === 6 && g.player.y === 18, g.player.x + ',' + g.player.y);
        await T.step('down');
        await T.until(() => g.player.map === 'stovnerOuter', 'Outer Stovner');
        await T.frames(60);
        T.check('and down it', g.player.x === 15 && g.player.y === 1, g.player.x + ',' + g.player.y);
        await T.step('down', 2);
        T.check('through where the barricade was', g.player.y === 3 && g.mode === 'world');
        T.state('back-in-outer');
      },
    ],
  },
  { // an unusual 1D save: kebab done, axe and Light Vest worn, unknown quest, gear and field
    name: 'mohsin-offer-odd-save',
    save: (() => {
      const d = JSON.parse(JSON.stringify(chainDone));
      Object.assign(d.player, { weapon: 'axe', weapons: ['none', 'crystal', 'axe', 'futureBlade'], armor: 'light', armors: ['none', 'vest', 'light'], mystery: 7, maxhp: 94, hp: 94 });
      d.q.kebab = { s: 3 }; d.q.kebab1 = { s: 1, found: 2 };
      Object.assign(d.flags, { kebab: true, chestAxe: true, chestVest: true });
      return d;
    })(),
    run: async (T, g) => {
      await T.continueGame();
      await T.talk();
      const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
      T.check('FIND MOHSIN offered and accepted', d.q.mohsin.s === 1 && d.flags.northOpen === true);
      T.check('gear, chests, kebab and the unknown things are kept', d.player.weapon === 'axe' && d.player.armor === 'light' && d.player.weapons.includes('futureBlade') && d.player.mystery === 7
        && JSON.stringify(d.q.kebab1) === '{"s":1,"found":2}' && d.q.kebab.s === 3 && d.flags.chestAxe && d.flags.chestVest && d.player.maxhp === 94);
      T.state('accepted');
    },
  },
  { // the road north: where the monsters are, the walk up it, the shrine, and back
    name: 'north-road-tour', save: withFind(moved(chainDone, 'northRoad', 5, 18, 'up')),
    run: [
      `async (T, g) => {
        ${MEET}
        await T.continueGame();
        const real = Math.random;
        Math.random = () => 0;
        const safe = async (what, x, y, steps) => {
          T.place('northRoad', x, y, 'up');
          g.player.sinceBattle = 99;
          await T.frames(60);
          for (const [dir, n] of steps) await T.step(dir, n);
          await T.frames(90);
          T.check('safe: ' + what, g.mode === 'world' && g.player.map === 'northRoad', g.mode + ' at ' + g.player.x + ',' + g.player.y);
        };
        await safe('the foot of the road', 5, 18, [['up', 2], ['right'], ['down', 2]]);
        await safe('the middle', 7, 11, [['up', 2], ['left', 3], ['right', 6]]);
        await safe('the top', 6, 3, [['up', 2], ['right'], ['down', 2]]);
        Math.random = real;
        for (const [x, y, dir, v, want] of [[5, 15, 'up', 0, 'blue'], [5, 15, 'up', 0.9, 'rat'], [7, 8, 'up', 0, 'golem'], [7, 8, 'up', 0.5, 'rat'], [7, 8, 'up', 0.9, 'blue']]) {
          g.player.hp = g.player.maxhp;
          await meet(x, y, dir, v, 'northRoad');
          T.check('at ' + x + ',' + y + ' with the dice at ' + v + ': ' + want, g.battle.type === want, g.battle.type);
          if (want === 'golem') T.shot('battle');
          await T.fight(() => 2);
        }
        // ---- the walk itself, with the monsters switched off in the running game
        g.MAPS.northRoad.encounter = null;
        g.player.hp = g.player.maxhp;
        T.place('northRoad', 5, 18, 'up');
        await T.step('up', 5); await T.step('left', 4);
        T.check('rock on the left', g.player.x === 3 && g.player.y === 13, g.player.x + ',' + g.player.y);
        T.shot('lower-clearing');
        await T.step('right', 4); await T.step('up', 5);
        T.shot('road');
        await T.step('up', 7);
        T.check('at the head of the road', g.player.x === 7 && g.player.y === 1, g.player.x + ',' + g.player.y);
        await T.step('up');
        await T.until(() => g.player.map === 'shrine', 'the shrine');
        await T.frames(20);
        T.shot('arriving');
        await T.frames(40);
        T.check('into the shrine, autosaved, and nothing happens by itself', g.player.x === 7 && g.player.y === 11 && g.player.dir === 'up' && g.mode === 'world' && saved().player.map === 'shrine', g.player.x + ',' + g.player.y);
        await T.frames(180);
        T.check('still nothing', g.mode === 'world' && g.player.map === 'shrine' && g.player.y === 11);
        Math.random = () => 0;
        g.player.sinceBattle = 99;
        await T.step('up', 4); await T.step('left', 4); await T.step('up', 2); await T.step('right', 8); await T.step('down', 2);
        Math.random = real;
        T.check('no monsters in the shrine, however long the walk', g.mode === 'world' && g.player.x === 11 && g.player.y === 7, g.player.x + ',' + g.player.y);
        T.shot('shrine');
        await T.step('left', 4); await T.step('up', 3); await T.step('up');
        T.check('MOHSIN stands in front of the pedestal', g.player.x === 7 && g.player.y === 4 && g.player.dir === 'up', g.player.x + ',' + g.player.y);
        T.shot('mohsin');
        await T.step('down', 6); await T.step('down', 2);
        await T.until(() => g.player.map === 'northRoad', 'the north road');
        await T.frames(60);
        T.check('free to leave without a fight', g.player.x === 7 && g.player.y === 1 && g.player.dir === 'down' && !g.flags.mohsinBeaten && g.stats.won === 52, g.player.x + ',' + g.player.y);
        await T.step('left'); await T.step('up');
        await T.until(() => g.player.map === 'shrine', 'the shrine');
        await T.frames(60);
        T.check('the left lane leads to the left lane', g.player.x === 6 && g.player.y === 11, g.player.x + ',' + g.player.y);
        await T.tap('KeyX', 6); await T.tap('Space', 6); await T.tap('KeyX', 6);
        T.state('in-the-shrine');
      }`,
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE in the shrine', g.player.map === 'shrine' && g.player.x === 6 && g.player.y === 11 && g.q.mohsin.s === 1 && g.mode === 'world');
        T.shot('continued');
      },
    ],
  },
  { name: 'mohsin', save: atMohsin, run: mohsinFight(12, 3, true) },
  ...['mohammed', 'celine', 'alexandra'].map((id) => ({
    name: `mohsin-${id}`, save: withHero(atMohsin, id), run: mohsinFight(12, 3), sameAs: { beaten: 'mohsin__beaten' },
  })),
  { name: 'mohsin-light-vest', save: gear(atMohsin, 'crystal', 'light'), run: mohsinFight(12, 3) },
  { name: 'mohsin-axe', save: gear(atMohsin, 'axe', 'vest'), run: mohsinFight(14, 4) },
  { // few herbs: two in a pouch of three
    name: 'mohsin-few-herbs', save: { ...atMohsin, player: { ...atMohsin.player, maxHerbs: 3, herbs: 2 } }, run: mohsinFight(12, 2),
  },
  { // level 8, Iron Sword, Tough Vest, the pouch JOHANNE filled: the hardest way to do it
    name: 'mohsin-modest',
    save: withFind({
      ...moved(modest, 'shrine', 7, 4, 'up'), player: { ...moved(modest, 'shrine', 7, 4, 'up').player, maxHerbs: 6, herbs: 6 },
      q: { ...modest.q, road: { s: 3, n: 3 }, cart: DONE, under: DONE }, flags: { ...modest.flags, tunnelOpen: true },
    }),
    run: mohsinFight(18, 5),
  },
  { // one measured blow with each weapon: the axe gets nothing extra, and running away leaves him unbeaten
    name: 'mohsin-weapons', save: atMohsin,
    run: `async (T, g) => {
      ${MEET}
      await T.continueGame();
      const dealt = {};
      for (const w of ['iron', 'crystal', 'axe']) {
        g.player.weapon = w; g.player.hp = g.player.maxhp;
        await T.talk();
        await T.untilBattle();
        dealt[w] = await swing();
        T.check(w + ': nothing is said about armour', g.battle.armorSaid !== true);
        await T.fight(() => 2);
        T.check('got away: he is unbeaten and nothing was handed over', g.mode === 'world' && !g.flags.mohsinBeaten && !g.flags.fragment2 && !g.flags.blueKey && g.q.mohsin.s === 1 && g.stats.won === 52, g.mode);
      }
      // hero ATK 22; +3 / +7 / +2; +1 from the dice; less his DEF 6
      T.check('iron 20, crystal 24, axe 19', dealt.iron === 20 && dealt.crystal === 24 && dealt.axe === 19, JSON.stringify(dealt));
      T.state('after');
    }`,
  },
  { // beaten by him: carried home with nothing, and free to try again
    name: 'mohsin-defeat', save: withFind(moved(feeble, 'shrine', 7, 4, 'up')),
    run: [
      async (T, g) => {
        await T.continueGame();
        await T.tap('Space', 3);
        while (g.mode === 'dialog') { await T.frames(150); await T.tap('Space', 3); }
        await T.until(() => g.mode === 'battle', 'the fight');
        await T.until(() => g.mode === 'dialog', 'being carried home');
        T.shot('wren');
        await T.dialog();
        const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        T.check('in the village, patched up, saved there', g.player.map === 'village' && g.player.hp === g.player.maxhp && d.player.map === 'village' && g.stats.won === 0);
        T.check('no fragment, no key, MOHSIN unbeaten, the quest still running, the road still open',
          !d.flags.fragment2 && !d.flags.blueKey && !d.flags.mohsinBeaten && d.q.mohsin.s === 1 && d.flags.northOpen === true && d.flags.fragment1 === true);
        T.state('home');
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE in the village', g.player.map === 'village' && g.mode === 'world');
        T.place('stovnerOuter', 14, 1, 'up');
        await T.step('up');
        await T.until(() => g.player.map === 'northRoad', 'the north road');
        await T.frames(60);
        T.place('shrine', 7, 4, 'up');
        await T.tap('Space', 3);
        T.check('MOHSIN is waiting for another try', g.mode === 'dialog' && g.dlg.name === 'MOHSIN', g.mode);
      },
    ],
  },
  { // closed in the middle of MOHSIN's hand-over: he finishes it next time, once
    name: 'mohsin-handover-interrupted', save: { ...atMohsin, flags: { ...atMohsin.flags, mohsinBeaten: true } },
    run: [
      async (T, g) => {
        await T.continueGame();
        T.check('beaten, nothing held yet', g.flags.mohsinBeaten === true && !g.flags.fragment2 && g.q.mohsin.s === 1);
        await T.talk('handover');
        T.check('no second fight: the fragment and the key', g.stats.won === 52 && g.flags.fragment2 === true && g.flags.blueKey === true && g.q.mohsin.s === 2 && g.mode === 'world');
        await T.talk('after');
        T.check('once', Object.keys(g.flags).filter((k) => /^fragment/.test(k)).length === 2);
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: both fragments and both keys', g.flags.fragment1 && g.flags.fragment2 && g.flags.redKey && g.flags.blueKey && g.q.mohsin.s === 2);
        await T.talk('later');
        T.check('still once', g.mode === 'world' && g.stats.won === 52);
      },
    ],
  },
  { // back to JOHANNE with the kebab quest still running: the chapter ends, the west gate opens, the world goes on
    name: 'chapter-two', save: { ...mohsinReady(chainDone), q: { ...mohsinReady(chainDone).q, kebab: { s: 1 } } },
    run: [
      async (T, g) => {
        const KEY = 'turnip-vale-save-v1', saved = () => JSON.parse(localStorage.getItem(KEY));
        await T.continueGame();
        T.check('ready to report, with the kebab quest running', g.q.mohsin.s === 2 && g.q.kebab.s === 1 && g.chapter === 1 && g.storyDone === false);
        T.shot('johanne-ready');
        T.place('stovner', 1, 9, 'left');
        await T.frames(20);
        T.shot('west-gate-shut');
        T.place('stovner', 16, 9, 'up');
        await T.talk('turn-in');
        await T.until(() => g.mode === 'victory', 'the chapter screen');
        await T.frames(120);
        T.shot('chapter-complete');
        T.check('FIND MOHSIN is done and saved', g.q.mohsin.s === 3 && saved().q.mohsin.s === 3);
        await T.tap('Space');
        await T.until(() => g.mode === 'world', 'the world');
        await T.frames(40);
        T.check('back beside JOHANNE in Stovner', g.player.map === 'stovner' && g.player.x === 16 && g.player.y === 9 && g.mode === 'world');
        T.check('Chapter 3 now, and the story is not over', g.chapter === 2 && g.storyDone === false && g.CHAPTERS[2].name === 'AMMERUD' && g.CHAPTERS[2].quest === 'trouble');
        T.check('the kebab quest is still running and is tracked again', g.q.kebab.s === 1 && g.tracked === 'kebab');
        T.shot('after');
        const flags = JSON.stringify(g.flags), gold = g.player.gold;
        await T.talk('johanne-after-1'); await T.talk('johanne-after-2');
        T.check('no second chapter screen, nothing given twice', g.mode === 'world' && JSON.stringify(g.flags) === flags && g.player.gold === gold);
        // ---- the west gate
        T.place('stovner', 1, 9, 'left');
        await T.talk('unlock');
        T.check('the BLUE KEY opens the west gate, saved', g.flags.blueGate === true && saved().flags.blueGate === true && g.flags.blueKey === true);
        T.shot('west-gate-open');
        await T.tap('Space', 6);
        T.check('the open gate has nothing more to say', g.mode === 'world');
        await T.step('left');
        await T.until(() => g.player.map === 'ammerud', 'Ammerud');
        await T.frames(60);
        T.check('the road beyond leads to AMMERUD, autosaved', g.player.x === 28 && g.player.y === 10 && g.player.dir === 'left' && saved().player.map === 'ammerud', g.player.x + ',' + g.player.y);
        T.shot('ammerud');
        await T.step('right');
        await T.until(() => g.player.map === 'stovner', 'Stovner');
        await T.frames(60);
        T.check('and back through the west gate', g.player.x === 1 && g.player.y === 9 && g.player.dir === 'right', g.player.x + ',' + g.player.y);
        T.check('the Red Key and the Red Gate are as they were', g.flags.redKey === true && g.flags.redGate === true);
        await T.tap('KeyX', 6);
        T.check('ten quests known: the log opens on the second page, where the kebab is', g.menuPage === 1 && g.menuSel === 2);
        T.shot('log-2');
        await T.tap('ArrowLeft', 6);
        T.check('left: the first page', g.menuPage === 0);
        T.shot('log-1');
        await T.tap('Space', 6);
        T.check('SAVED! after the chapter', g.menuNote && g.menuNote.text === 'SAVED!');
        await T.tap('KeyX', 6);
        T.state('chapter-done');
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: chapter, fragments, keys and gates', g.chapter === 2 && g.q.mohsin.s === 3 && ['fragment1', 'fragment2', 'redKey', 'blueKey', 'redGate', 'blueGate', 'northOpen', 'tunnelOpen', 'mohsinBeaten'].every((k) => g.flags[k] === true));
        T.shot('continued');
        T.check('the west gate is still open', g.flags.blueGate === true && g.player.map === 'stovner' && g.player.x === 1);
        // the kebab, after the chapter
        T.place('stovnerOuter', 7, 10, 'left');
        await T.step('left');
        await T.dialog();
        T.place('stovner', 20, 11, 'up');
        await T.talk();
        T.check('the kebab can be finished afterwards', g.q.kebab.s === 3 && g.player.maxhp === 94 && g.mode === 'world' && g.chapter === 2);
        // a chest, after the chapter
        T.place('stovnerOuter', 27, 2, 'up');
        await T.step('up');
        await T.dialog();
        T.check('so can a chest', g.player.weapons.includes('axe') && g.flags.chestAxe === true);
        // everyone stays as they were left
        T.place('shrine', 7, 4, 'up');
        await T.talk('mohsin-later');
        T.place('tunnel', 8, 11, 'left');
        await T.talk('heidi-later');
        T.check('MOHSIN and LÆRER HEIDI stay beaten', g.mode === 'world' && g.stats.won === 52);
        T.place('stovner', 24, 9, 'right');
        await T.step('right');
        await T.until(() => g.player.map === 'village', 'the village');
        await T.frames(60);
        T.check('Vestli is still a walk away', g.player.x === 1 && g.player.y === 7);
        T.place('village', 8, 7, 'up');
        await T.talk('elder');
        T.check('and Elder Moss has nothing new to hand over', g.mode === 'world' && Object.keys(g.flags).filter((k) => /^fragment/.test(k)).length === 2);
        T.state('wandered');
      },
    ],
  },
  { // the same ending by the on-screen buttons, as Alexandra
    name: 'chapter-two-touch', save: withHero(mohsinReady(chainDone), 'alexandra'),
    run: async (T, g) => {
      await T.continueGame();
      await T.touch('a');
      T.check('A talks to JOHANNE', g.mode === 'dialog' && g.dlg.name === 'JOHANNE', g.mode);
      let presses = 0, spoke = false;
      while (g.mode === 'dialog') {
        await T.frames(150);
        if (g.dlg.name === 'ALEXANDRA') { if (!spoke) T.shot('hero-speaks'); spoke = true; }
        await T.touch('a', 3);
        if (++presses > 12) throw new Error('the talk never ended');
      }
      T.check('the hero answers under the hero\'s own name', spoke);
      await T.until(() => g.mode === 'victory', 'the chapter screen');
      await T.frames(120);
      T.shot('chapter-complete');
      await T.touch('a');
      await T.until(() => g.mode === 'world', 'the world');
      await T.frames(40);
      T.check('A closes the chapter screen', g.q.mohsin.s === 3 && g.chapter === 2 && g.player.map === 'stovner');
      await T.touch('b');
      T.check('B opens the log; nothing is tracked, so page 1', g.mode === 'menu' && g.menuPage === 0 && g.menuSel === 2);
      await T.touch('right');
      T.check('right arrow: page 2', g.menuPage === 1);
      T.shot('log-2');
      await T.touch('a');
      T.check('A saves', g.menuNote && g.menuNote.text === 'SAVED!');
      await T.touch('b');
      T.state('done');
    },
  },
  { // the fight by the on-screen buttons
    name: 'mohsin-touch', save: gear(atMohsin, 'crystal', 'light'),
    run: async (T, g) => {
      await T.continueGame();
      await T.touch('a');
      let presses = 0;
      while (g.mode === 'dialog') { await T.frames(150); await T.touch('a', 3); if (++presses > 20) throw new Error('the talk never ended'); }
      await T.until(() => g.mode === 'battle' && g.battle.phase === 'menu', 'the battle menu');
      const b = g.battle;
      let turns = 0;
      while (g.mode === 'battle') {
        await T.until(() => g.mode !== 'battle' || b.phase === 'menu', 'the battle menu');
        if (g.mode !== 'battle') break;
        if (++turns > 30) throw new Error('the fight never ended');
        const want = g.player.hp < 45 && g.player.herbs > 0 ? 1 : 0;
        while (b.menu !== want) await T.touch(b.menu < want ? 'down' : 'up', 2);
        await T.touch('a', 2);
        await T.until(() => g.mode !== 'battle' || b.phase !== 'menu', 'the action to start');
      }
      await T.until(() => g.mode === 'dialog', 'MOHSIN to speak');
      presses = 0;
      while (g.mode === 'dialog') { await T.frames(150); await T.touch('a', 3); if (++presses > 12) throw new Error('the talk never ended'); }
      await T.frames(10);
      T.check('fought and won with the D-pad and A', g.flags.mohsinBeaten === true && g.flags.fragment2 === true && g.flags.blueKey === true && g.q.mohsin.s === 2 && g.mode === 'world', turns);
      await T.touch('b');
      T.shot('status');
      await T.touch('a');
      T.check('saved by touch', g.menuNote && g.menuNote.text === 'SAVED!');
      await T.touch('b');
    },
  },
];

// AMMERUD (Expansion 1F): Chapter 3. SELMA's AMMERUD TROUBLE brings MARCUS out at the basketball court,
// EMIL has lost his basketball, ASTRID has seen a light on the dark path, and NADIA keeps the kiosk.
// A save from the end of Expansion 1E: Chapter 2 finished, the west gate unlocked, the hero at level 10,
// standing just inside the gate, and nothing of Ammerud in the file at all.
const chapterTwoDone = (() => {
  const d = JSON.parse(JSON.stringify(mohsinReady(chainDone)));
  d.q.mohsin = { s: 3 }; d.q.kebab = { s: 3 }; d.tracked = null;
  Object.assign(d.flags, { blueGate: true, kebab: true });
  Object.assign(d.player, level(10), { maxhp: 100, hp: 100, gold: 520, map: 'stovner', x: 1, y: 9, fx: 1, fy: 9, tx: 1, ty: 9, dir: 'left' });
  return d;
})();
const inAmmerud = moved(chapterTwoDone, 'ammerud', 28, 10, 'left');
const withTrouble = (fix, c, r, b) => ({ ...fix, q: { ...fix.q, trouble: { s: 1, c, r, b } }, tracked: 'trouble' });
const atMarcus = withTrouble(moved(chapterTwoDone, 'ammerud', 7, 15, 'down'), 3, 3, 2);
const marcusDone = (fix) => {
  const d = JSON.parse(JSON.stringify(fix));
  d.q.trouble = { s: 2, c: 3, r: 3, b: 2 }; d.tracked = 'trouble';
  Object.assign(d.flags, { marcusBeaten: true, marcusBat: true });
  Object.assign(d.player, { weapon: 'bat', weapons: ['none', 'crystal', 'bat'] });
  return d;
};
// Fights the battle that is on, eating an herb below HEAL HP, and photographs the first time each pattern
// shows up in a battle message. Returns { turns, seen } where seen[name] counts the messages.
const WATCH = `
  const watchFight = async (heal, shots, onFrame) => {
    const b = g.battle, seen = {};
    let turns = 0, last = '';
    while (g.mode === 'battle') {
      await T.until(() => g.mode !== 'battle' || b.phase === 'menu', 'the battle menu');
      if (g.mode !== 'battle') break;
      if (++turns > 40) throw new Error('the fight never ended');
      const want = g.player.hp < heal && g.player.herbs > 0 ? 1 : 0;
      while (b.menu !== want) await T.tap('ArrowDown', 1);
      await T.tap('Space', 1);
      await T.until(() => g.mode !== 'battle' || b.phase !== 'menu', 'the action to start');
      while (g.mode === 'battle' && b.phase !== 'menu') {
        if (b.msg !== last && b.shown >= b.msg.length) {
          last = b.msg;
          for (const [k, re] of shots) if (re.test(b.msg)) { if (!seen[k]) T.shot(k); seen[k] = (seen[k] || 0) + 1; }
        }
        if (onFrame) onFrame();
        await T.frames(1);
      }
    }
    await T.frames(70);
    return { turns, seen };
  };
`;
// The whole meeting with MARCUS: the talk, the fight, the hand-over of the bat, and nothing twice.
const MARCUS = `async (T, g) => {
  ${MEET}
  ${WATCH}
  await T.continueGame();
  const gold = g.player.gold, xp = g.player.xp, won = g.stats.won, herbs = g.player.herbs, maxhp = g.player.maxhp, weapons = g.player.weapons.slice();
  T.check('MARCUS waits on the centre circle', g.NPCS.find((n) => n.id === 'marcus').visible() && g.player.x === 7 && g.player.y === 15);
  T.shot('court');
  await T.tap('KeyX', 6); await T.tap('Space', 6);
  T.check('SAVED! in front of MARCUS', g.menuNote && g.menuNote.text === 'SAVED!' && saved().player.map === 'ammerud');
  await T.tap('KeyX', 6);
  await T.frames(120);
  T.check('standing there starts nothing', g.mode === 'world');
  await T.talk(BEFORE);
  await T.untilBattle();
  const b = g.battle;
  T.check('MARCUS: 180 HP, ATK 26, DEF 9, a boss', b.type === 'marcus' && b.name === 'MARCUS' && b.boss === true && b.max === 180 && b.atk === 26 && b.def === 9 && b.xp === 150, JSON.stringify([b.max, b.atk, b.def, b.xp]));
  T.check('he lets the hero move first', b.turn === 0 && g.player.hp === maxhp);
  T.shot('battle');
  let angryAt = null, red = false;
  const { turns, seen } = await watchFight(HEAL, [['feint', /fakes left/], ['grin', /grins/], ['enough', /That's enough/], ['windup', /lifts the bat/], ['slam', /POWER SLAM/], ['defeated', /ALRIGHT/]],
    () => { if (b.angry && angryAt === null) { angryAt = b.hp; red = b.look === 'marcus2'; } });
  T.check('in his second phase the jersey turns red', red);
  T.check('the whole pattern was seen', seen.feint >= 1 && seen.grin >= 1 && seen.windup >= 1 && seen.slam >= 1, JSON.stringify(seen));
  T.check('"Okay. That\\'s enough." exactly once, at half HP or below', seen.enough === 1 && angryAt !== null && angryAt <= 90, JSON.stringify(seen) + ' ' + angryAt);
  T.check('every POWER SLAM was warned of first', seen.slam <= seen.windup, JSON.stringify(seen));
  T.check('beaten', seen.defeated === 1 && g.stats.won === won + 1 && g.player.hp > 0, g.mode + ' ' + g.player.hp);
  await T.until(() => g.mode === 'dialog', 'MARCUS to speak');
  T.check('beaten is saved before anything is handed over', saved().flags.marcusBeaten === true && !saved().flags.marcusBat && !saved().player.weapons.includes('bat') && saved().q.trouble.s === 1);
  T.check('nothing yet', !g.flags.marcusBat && !g.player.weapons.includes('bat') && g.q.trouble.s === 1 && g.dlg.name === 'MARCUS');
  await T.dialog(HANDOVER);
  T.check("MARCUS' BAT: owned and worn, saved", g.player.weapon === 'bat' && g.player.weapons.filter((w) => w === 'bat').length === 1 && g.flags.marcusBat === true
    && saved().player.weapon === 'bat' && saved().player.weapons.includes('bat'));
  T.check('every weapon owned before is kept', weapons.every((w) => g.player.weapons.includes(w)), JSON.stringify(g.player.weapons));
  T.check('the quest is ready for SELMA, and the chapter is not over', g.q.trouble.s === 2 && g.tracked === 'trouble' && saved().q.trouble.s === 2 && g.chapter === 2 && g.mode === 'world');
  T.check('150 XP and 150 gold', g.player.xp + (g.player.lvl > 10 ? 454 : 0) === xp + 150 && g.player.gold === gold + 150, g.player.xp + ' ' + (g.player.gold - gold));
  T.check('a fair fight', turns <= LIMIT[0] && herbs - g.player.herbs <= LIMIT[1], turns + ' turns, ' + (herbs - g.player.herbs) + ' herbs, ' + g.player.hp + ' HP left');
  T.shot('tracker');
  await T.menuShot('status');
  const flags = JSON.stringify(g.flags);
  await T.talk(AFTER1); await T.talk(AFTER2);
  T.check('he only talks now, and gives nothing twice', g.mode === 'world' && g.stats.won === won + 1 && JSON.stringify(g.flags) === flags && g.player.weapons.filter((w) => w === 'bat').length === 1);
  T.state('beaten');
}`;
const marcusFight = (turns, herbs, heal = 50, talk = false) => MARCUS.replace(/LIMIT/g, `[${turns}, ${herbs}]`).replace('HEAL', String(heal))
  .replace('BEFORE', talk ? "'before'" : '').replace('HANDOVER', talk ? "'handover'" : '').replace('AFTER1', talk ? "'after'" : '').replace('AFTER2', talk ? "'after-2'" : '');
// HUD rectangles on the 240x160 screen: the status panel, and the widest possible quest tracker.
const HUD_CHECK = `
  const HUD = [[2, 2, 94, 32], [98, 2, 238, 18]];
  const hiddenFrom = (mapName, px, py, tx, ty) => {
    const m = g.MAPS[mapName];
    const camX = Math.max(0, Math.min(px * 16 + 8 - 120, m.w * 16 - 240)), camY = Math.max(0, Math.min(py * 16 + 8 - 80, m.h * 16 - 160));
    const sx = tx * 16 - camX, sy = ty * 16 - camY;
    return HUD.some(([x0, y0, x1, y1]) => sx < x1 && sx + 16 > x0 && sy < y1 && sy + 16 > y0);
  };
`;
const ammerudScenarios = [
  { // a save from the end of 1E: through the west gate, into Ammerud, around the square, and back
    name: 'ammerud-arrive', save: chapterTwoDone,
    run: [
      async (T, g) => {
        const KEY = 'turnip-vale-save-v1', saved = () => JSON.parse(localStorage.getItem(KEY));
        T.check('the save knows nothing of Ammerud', saved().q.trouble === undefined && saved().q.ball === undefined && saved().q.wisp === undefined);
        await T.continueGame();
        T.check('it loads in Chapter 3 with every Ammerud quest unstarted', g.chapter === 2 && ['trouble', 'ball', 'wisp'].every((id) => g.q[id].s === 0)
          && JSON.stringify(g.q.trouble) === '{"s":0,"c":0,"r":0,"b":0}');
        await T.step('left');
        await T.until(() => g.player.map === 'ammerud', 'Ammerud');
        await T.frames(20);
        T.shot('arriving');
        await T.frames(40);
        T.check('through the west gate into AMMERUD, autosaved', g.player.x === 28 && g.player.y === 10 && g.player.dir === 'left' && saved().player.map === 'ammerud', g.player.x + ',' + g.player.y);
        await T.frames(120);
        T.check('no bouncing back, and nothing happens by itself', g.mode === 'world' && g.player.map === 'ammerud' && g.player.x === 28);
        const here = g.NPCS.filter((n) => n.map === 'ammerud').map((n) => n.id + ' ' + n.x + ',' + n.y).join('; ');
        T.check('six people in Ammerud', here === 'selma 25,9; emil 8,12; astrid 6,8; nadia 14,9; leif 12,11; marcus 7,16', here);
        const news = g.NPCS.filter((n) => n.map === 'ammerud' && n.news && n.news()).map((n) => n.id).join();
        T.check('SELMA, EMIL and ASTRID have a mark; NADIA and LEIF do not; MARCUS is nowhere to be seen', news === 'selma,emil,astrid' && !g.NPCS.find((n) => n.id === 'marcus').visible(), news);
        await T.step('up');
        await T.talk('sign');
        await T.step('left', 3);
        T.shot('selma');
        await T.step('left', 4);
        T.shot('square');
        T.place('ammerud', 13, 11, 'left');
        await T.talk('leif');
        T.check('LEIF saw nothing', g.mode === 'world');
        T.place('ammerud', 7, 14, 'down');
        await T.frames(20);
        T.shot('court');
        T.place('ammerud', 1, 9, 'down');
        await T.talk('dark-path-sign');
        T.place('ammerud', 15, 20, 'down');
        await T.frames(20);
        T.shot('south-gate');
        await T.talk('south-gate');
        await T.step('down');
        T.check('the south gate is shut', g.player.y === 20 && g.player.map === 'ammerud' && !g.flags.grorudGate);
        T.check('nothing was started, given or saved by looking around', ['trouble', 'ball', 'wisp'].every((id) => g.q[id].s === 0) && g.player.gold === 520 && !g.flags.metNadia);
        T.place('ammerud', 28, 10, 'right');
        await T.step('right');
        await T.until(() => g.player.map === 'stovner', 'Stovner');
        await T.frames(60);
        T.check('back to Stovner through the west gate', g.player.x === 1 && g.player.y === 9 && g.player.dir === 'right', g.player.x + ',' + g.player.y);
        await T.step('left');
        await T.until(() => g.player.map === 'ammerud', 'Ammerud');
        await T.frames(60);
        T.state('arrived');
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE in Ammerud', g.player.map === 'ammerud' && g.player.x === 28 && g.player.y === 10 && g.chapter === 2 && g.mode === 'world');
        T.shot('continued');
      },
    ],
  },
  { // a 1E save that finished the chapter but never tried the west gate: the Blue Key opens it, and the way is through
    name: 'ammerud-gate-unlock', save: { ...chapterTwoDone, flags: { ...chapterTwoDone.flags, blueGate: false } },
    run: async (T, g) => {
      await T.continueGame();
      await T.step('left');
      T.check('shut until it is opened', g.player.map === 'stovner' && g.player.x === 1);
      await T.talk('unlock');
      T.check('the BLUE KEY opens it', g.flags.blueGate === true && JSON.parse(localStorage.getItem('turnip-vale-save-v1')).flags.blueGate === true);
      await T.step('left');
      await T.until(() => g.player.map === 'ammerud', 'Ammerud');
      await T.frames(60);
      T.check('and the road leads to AMMERUD', g.player.x === 28 && g.player.y === 10);
    },
  },
  { // the maps themselves: open ground, edges, exits, monsters, and what the status panel might hide
    name: 'ammerud-map-audit', save: inAmmerud,
    run: `async (T, g) => {
      ${HUD_CHECK}
      await T.continueGame();
      const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      const tile = (m, x, y, open) => { const gate = m.gates && m.gates[x + ',' + y]; return gate ? (open ? gate.open : gate.closed) : m.rows[y][x]; };
      const walk = (m, x, y, open) => x >= 0 && y >= 0 && x < m.w && y < m.h && !g.SOLID.has(tile(m, x, y, open));
      const reach = (name, sx, sy, open) => {
        const m = g.MAPS[name], seen = new Set([sx + ',' + sy]), todo = [[sx, sy]];
        while (todo.length) {
          const [x, y] = todo.pop();
          if (m.exits[x + ',' + y]) continue;
          for (const [dx, dy] of Object.values(DIRS)) {
            const k = (x + dx) + ',' + (y + dy);
            if (!seen.has(k) && walk(m, x + dx, y + dy, open)) { seen.add(k); todo.push([x + dx, y + dy]); }
          }
        }
        return seen;
      };
      const am = g.MAPS.ammerud, dp = g.MAPS.darkPath;
      T.check('Ammerud is 30 by 22 and the dark path 16 by 16', am.w === 30 && am.h === 22 && dp.w === 16 && dp.h === 16 && am.rows.every((r) => r.length === 30) && dp.rows.every((r) => r.length === 16));
      for (const [name, sx, sy] of [['ammerud', 28, 10], ['darkPath', 14, 10]]) {
        const m = g.MAPS[name], seen = reach(name, sx, sy, true), out = [];
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (walk(m, x, y, true) && !seen.has(x + ',' + y)) out.push(x + ',' + y);
        T.check(name + ': all open ground can be reached', out.length === 0, out.join(' '));
      }
      T.check('Ammerud leads to Stovner, the dark path and (through the south gate) Grorud; the dark path only back', JSON.stringify(Object.values(am.exits).map((e) => e.map)) === '["stovner","darkPath","grorudHeights"]' && JSON.stringify(Object.values(dp.exits).map((e) => e.map)) === '["ammerud"]');
      T.check('the south gate cannot be walked through while shut; open, it is the way to Grorud', reach('ammerud', 28, 10, true).has('15,21') && !reach('ammerud', 28, 10, false).has('15,21')
        && tile(am, 15, 21, false) === 'G' && tile(am, 15, 21, true) === 'L' && am.exits['15,21'].map === 'grorudHeights');
      // monsters
      const inZone = (m, x, y) => m.encounter.zones.find((z) => x >= z.at[0] && y >= z.at[1] && x <= z.at[2] && y <= z.at[3]);
      const ok = (m) => m.encounter.zones.every((z) => z.at[0] >= 0 && z.at[1] >= 0 && z.at[2] < m.w && z.at[3] < m.h && z.table.every((e) => g.ENEMIES[e[0]] && !g.ENEMIES[e[0]].boss) && Math.abs(z.table.reduce((n, e) => n + e[1], 0) - 1) < 1e-9);
      T.check('every zone lies inside its map, its monsters exist, none is a boss, the odds add up', ok(am) && ok(dp));
      const types = (m) => [...new Set(m.encounter.zones.flatMap((z) => z.table.map((e) => e[0])))].sort().join();
      T.check('Ammerud: crawlers, shadow rats and brutes; the dark path: wisps, rats and crawlers', types(am) === 'brute,crawler,shadow' && types(dp) === 'crawler,shadow,wisp', types(am) + ' / ' + types(dp));
      T.check('every monster AMMERUD TROUBLE asks for turns up in every zone of Ammerud, at least one time in five', am.encounter.zones.every((z) => ['crawler', 'shadow', 'brute'].every((t) => z.table.some((e) => e[0] === t && e[1] >= 0.2))));
      T.check('the glowing wisp is never met at random', [am, dp].every((m) => m.encounter.zones.every((z) => z.table.every((e) => e[0] !== 'glowwisp'))));
      const near = [];
      for (const [m, ways] of [[am, [[28, 10], [29, 10], [0, 9], [1, 9]]], [dp, [[14, 10], [15, 10]]]]) {
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (inZone(m, x, y) && ways.some((p) => Math.abs(p[0] - x) + Math.abs(p[1] - y) <= 3)) near.push(m.name + ' ' + x + ',' + y);
      }
      T.check('no zone within three steps of a way in', near.length === 0, near.join(' '));
      const court = [];
      for (let y = 13; y <= 19; y++) for (let x = 1; x <= 13; x++) if (inZone(am, x, y)) court.push(x + ',' + y);
      for (let y = 7; y <= 12; y++) for (let x = 10; x <= 19; x++) if (inZone(am, x, y)) court.push(x + ',' + y);
      T.check('the court and the square are safe', court.length === 0, court.join(' '));
      // the court
      T.check('the court: hoops at both ends, keys, the halfway line, the centre circle, a fence with a way in', am.rows[16].slice(2, 13) === '5ZaaayaaaZ6' && am.rows[13][7] === 'a'
        && ['5', '6', 'f'].every((c) => g.SOLID.has(c)) && ['a', 'j', 'y', 'Z'].every((c) => !g.SOLID.has(c)));
      // nothing that matters hides under the HUD, from anywhere within three steps of it
      const things = [
        ...g.NPCS.filter((n) => n.map === 'ammerud' || n.map === 'darkPath').map((n) => [n.id, n.map, n.x, n.y]),
        ...g.ITEMS.filter((i) => i.map === 'ammerud' || i.map === 'darkPath').map((i) => [i.id, i.map, i.x, i.y]),
        ...Object.keys(am.signs).map((k) => ['sign ' + k, 'ammerud', ...k.split(',').map(Number)]),
        ...Object.keys(am.exits).map((k) => ['exit ' + k, 'ammerud', ...k.split(',').map(Number)]),
        ...Object.keys(dp.exits).map((k) => ['exit ' + k, 'darkPath', ...k.split(',').map(Number)]),
        ['south gate', 'ammerud', 15, 21],
      ];
      const hidden = [];
      for (const [id, map, tx, ty] of things) {
        const m = g.MAPS[map];
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
          if (Math.abs(x - tx) + Math.abs(y - ty) > 3 || !walk(m, x, y, true)) continue;
          if (hiddenFrom(map, x, y, tx, ty)) hidden.push(id + ' from ' + x + ',' + y);
        }
      }
      T.check('no person, item, chest, sign, exit or gate of Ammerud is ever under the status panel or the tracker', hidden.length === 0, hidden.slice(0, 12).join('; '));
      T.check('every chest and item stands on open ground, off the paths out', g.ITEMS.filter((i) => i.map === 'ammerud' || i.map === 'darkPath').every((i) => walk(g.MAPS[i.map], i.x, i.y, true) && !g.MAPS[i.map].exits[i.x + ',' + i.y]));
      // nobody walls anybody in
      for (const [name, sx, sy] of [['ammerud', 28, 10], ['darkPath', 14, 10]]) {
        const m = g.MAPS[name], people = new Set(g.NPCS.filter((n) => n.map === name).map((n) => n.x + ',' + n.y)), seen = new Set([sx + ',' + sy]), todo = [[sx, sy]];
        while (todo.length) {
          const [x, y] = todo.pop();
          for (const [dx, dy] of Object.values(DIRS)) {
            const k = (x + dx) + ',' + (y + dy);
            if (!seen.has(k) && !people.has(k) && walk(m, x + dx, y + dy, true)) { seen.add(k); todo.push([x + dx, y + dy]); }
          }
        }
        const cut = [];
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (walk(m, x, y, true) && !people.has(x + ',' + y) && !seen.has(x + ',' + y)) cut.push(x + ',' + y);
        T.check(name + ': the people block nobody in', cut.length === 0, cut.join(' '));
      }
      // what the HUD and the log say about the new quests, at every stage, must fit
      const wide = [], keep = JSON.stringify(g.q.trouble);
      for (const [c, r, b] of [[0, 0, 0], [2, 1, 2], [3, 3, 1], [3, 3, 2]]) {
        Object.assign(g.q.trouble, { c, r, b });
        for (const id of ['trouble', 'ball', 'wisp']) {
          const d = g.QUESTS[id];
          if (d.title.length > 16 || ('NEW QUEST: ' + d.title).length > 28) wide.push(d.title);
          if (d.progress().length > 15) wide.push(d.progress());
          if (d.tracker().length > 16) wide.push(d.tracker());
          if (('SEE ' + d.turnIn + '!').length > 16) wide.push(d.turnIn);
        }
      }
      Object.assign(g.q.trouble, JSON.parse(keep));
      T.check('every new quest title, log line and tracker fits', wide.length === 0, wide.join(' | '));
      T.check('new gear names fit the status panel', ['bat'].every((k) => g.WEAPONS[k].name.length <= 11) && ['sneakers', 'rvest'].every((k) => g.ARMORS[k].name.length <= 11));
      T.check('the old gear is as it was', JSON.stringify(['none', 'iron', 'crystal', 'axe'].map((k) => g.WEAPONS[k].atk)) === '[0,3,7,2]' && JSON.stringify(['none', 'vest', 'light'].map((k) => g.ARMORS[k].def)) === '[0,2,1]');
      T.check('the Stovner enemies and bosses are as they were', JSON.stringify(['blue', 'rat', 'golem', 'glint', 'heidi', 'mohsin'].map((k) => [g.ENEMIES[k].hp, g.ENEMIES[k].atk, g.ENEMIES[k].def, g.ENEMIES[k].xp]))
        === '[[44,19,5,22],[34,17,3,20],[44,22,16,34],[72,22,8,60],[100,20,14,70],[125,23,6,110]]');
    }`,
  },
  { // each of Ammerud's monsters, met for certain on a chosen tile; what the gear does against them
    name: 'ammerud-enemies', save: inAmmerud,
    run: `async (T, g) => {
      ${MEET}
      await T.continueGame();
      const want = { crawler: [58, 25, 7, 34], shadow: [40, 29, 4, 32], brute: [84, 25, 12, 48], wisp: [50, 27, 6, 40] };
      const stats = (b) => JSON.stringify([b.max, b.atk, b.def, b.xp]);
      // the crawler, on the lawn between the blocks
      await meet(9, 4, 'down', 0, 'ammerud');
      let b = g.battle;
      T.check('a concrete crawler, by its full name', b.type === 'crawler' && b.name === 'CONCRETE CRAWLER' && stats(b) === JSON.stringify(want.crawler) && !b.boss, b.type + ' ' + stats(b));
      T.check('it waits for the hero', g.player.hp === 100 && b.turn === 0);
      T.shot('crawler');
      T.check('crystal sword: 25', await swing() === 25);
      await T.fight(cautious);
      T.check('beaten, and still in Ammerud with nothing counted for an unstarted quest', g.mode === 'world' && g.player.map === 'ammerud' && g.q.trouble.c === 0 && g.stats.won === 53);
      // the brute, armoured: the axe smashes through, the sword does not
      g.player.hp = 100;
      await meet(9, 4, 'down', 0.5, 'ammerud');
      b = g.battle;
      T.check('a block brute', b.type === 'brute' && b.name === 'BLOCK BRUTE' && stats(b) === JSON.stringify(want.brute), b.type + ' ' + stats(b));
      T.shot('brute');
      T.check('crystal sword against its armour: 20', await swing() === 20);
      await T.until(() => b.phase === 'menu', 'the battle menu');
      g.player.weapons.push('axe'); g.player.weapon = 'axe';
      T.check('the heavy axe through its armour: 27', await swing() === 27);
      await T.fight(cautious);
      g.player.weapon = 'crystal';
      // the shadow rat, quick: it bites first in the Tough Vest, not in sneakers
      g.player.hp = 100;
      await meet(20, 15, 'down', 0, 'ammerud');
      b = g.battle;
      T.check('a shadow rat', b.type === 'shadow' && b.name === 'SHADOW RAT' && stats(b) === JSON.stringify(want.shadow), b.type + ' ' + stats(b));
      const bite = 100 - g.player.hp;
      T.check('quick: it bit before the hero could move, and hard', bite >= 17 && bite <= 19 && b.turn === 0, bite);
      T.shot('shadow');
      await T.fight(cautious);
      g.player.armors.push('sneakers'); g.player.armor = 'sneakers'; g.player.hp = 100;
      await meet(20, 15, 'down', 0, 'ammerud');
      T.check('in sneakers it gets no opening bite', g.player.hp === 100 && g.battle.type === 'shadow', g.player.hp);
      await T.fight(cautious);
      g.player.armor = 'vest';
      // the wisp, only on the dark path
      g.player.hp = 100;
      await meet(10, 4, 'up', 0, 'darkPath');
      b = g.battle;
      T.check('a forest wisp, with the dark path behind it', b.type === 'wisp' && b.name === 'FOREST WISP' && stats(b) === JSON.stringify(want.wisp) && b.backdrop === 'woods', b.type + ' ' + stats(b));
      T.shot('wisp');
      await T.fight(cautious);
      T.check('all beaten', g.stats.won === 57 && g.mode === 'world' && g.player.map === 'darkPath', g.stats.won);
      T.state('after');
    }`,
  },
  { // SELMA's quest from the offer to MARCUS turning up, with reloads along the way
    name: 'ammerud-trouble', save: moved(chapterTwoDone, 'ammerud', 25, 10, 'up'),
    run: [
      `async (T, g) => {
        ${MEET}
        await T.continueGame();
        await T.talk('offer');
        T.check('accepted, tracked and saved', g.q.trouble.s === 1 && g.tracked === 'trouble' && saved().q.trouble.s === 1 && JSON.stringify(saved().q.trouble) === '{"s":1,"c":0,"r":0,"b":0}');
        T.check('MARCUS is not at the court yet', !g.NPCS.find((n) => n.id === 'marcus').visible());
        T.shot('tracker');
        await T.tap('KeyX', 6);
        T.check('the log opens on the page of the new quest', g.menuPage === 2, g.menuPage);
        T.shot('log');
        await T.tap('KeyX', 6);
        await T.talk('progress');
        T.check('talking again changes nothing', g.q.trouble.s === 1 && g.mode === 'world');
        for (let i = 1; i <= 2; i++) {
          g.player.hp = g.player.maxhp;
          await meet(9, 4, 'down', 0, 'ammerud');
          await T.fight(cautious);
          T.check('crawler ' + i + ' counted and saved', g.q.trouble.c === i && saved().q.trouble.c === i, g.q.trouble.c);
        }
        T.shot('two-crawlers');
      }`,
      `async (T, g) => {
        ${MEET}
        ${WATCH}
        await T.continueGame();
        T.check('CONTINUE: two crawlers, nothing else', JSON.stringify(g.q.trouble) === '{"s":1,"c":2,"r":0,"b":0}', JSON.stringify(g.q.trouble));
        const fight = async (x, y, dir, v, type) => {
          g.player.hp = g.player.maxhp;
          await meet(x, y, dir, v, 'ammerud');
          T.check('a ' + type, g.battle.type === type, g.battle.type);
          return watchFight(30, [['last', /attention/]]);
        };
        await fight(9, 4, 'down', 0, 'crawler');
        await fight(9, 4, 'down', 0, 'crawler');
        T.check('a fourth crawler does not count', g.q.trouble.c === 3, g.q.trouble.c);
        for (let i = 0; i < 3; i++) await fight(20, 15, 'down', 0, 'shadow');
        await fight(9, 4, 'down', 0.5, 'brute');
        T.check('everything but one brute: still no MARCUS', JSON.stringify(g.q.trouble) === '{"s":1,"c":3,"r":3,"b":1}' && !g.NPCS.find((n) => n.id === 'marcus').visible(), JSON.stringify(g.q.trouble));
        const { seen } = await fight(9, 4, 'down', 0.5, 'brute');
        T.check('the last one says so', seen.last === 1);
        T.check('all counted and saved, the quest still running', JSON.stringify(g.q.trouble) === '{"s":1,"c":3,"r":3,"b":2}' && JSON.stringify(saved().q.trouble) === '{"s":1,"c":3,"r":3,"b":2}');
        T.check('MARCUS has turned up at the court', g.NPCS.find((n) => n.id === 'marcus').visible() && !g.flags.marcusBeaten);
        T.shot('tracker-done');
        T.place('ammerud', 25, 10, 'up');
        await T.talk('selma-court');
        T.check('SELMA sends the hero to the court, nothing else changes', g.q.trouble.s === 1 && g.mode === 'world');
      }`,
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: MARCUS is still at the court', g.NPCS.find((n) => n.id === 'marcus').visible() && g.q.trouble.s === 1);
        T.place('ammerud', 7, 14, 'down');
        await T.frames(20);
        T.shot('marcus-waits');
      },
    ],
  },
  { // no MARCUS before the quest, nor halfway through it
    name: 'ammerud-marcus-not-early', save: moved(inAmmerud, 'ammerud', 7, 15, 'down'),
    run: [[0, 0, 0, 0], [1, 3, 3, 1], [1, 2, 3, 2]].map(([s, c, r, b], i, all) => `async (T, g) => {
      const KEY = 'turnip-vale-save-v1', next = ${JSON.stringify(all[i + 1] || null)};
      await T.continueGame();
      T.check('quest at ${s} with ${c}/${r}/${b}: MARCUS is not there', g.q.trouble.s === ${s} && g.q.trouble.c === ${c} && !g.NPCS.find((n) => n.id === 'marcus').visible());
      await T.tap('Space', 6);
      T.check('nobody on the centre circle to talk to', g.mode === 'world');
      await T.step('down');
      T.check('the centre circle is free to walk on', g.player.y === 16 && g.mode === 'world');
      await T.step('up');
      if (${i} === 0) T.shot('empty-court');
      if (next) { const d = JSON.parse(localStorage.getItem(KEY)); d.q.trouble = { s: next[0], c: next[1], r: next[2], b: next[3] }; Object.assign(d.player, { x: 7, y: 15, fx: 7, fy: 15, tx: 7, ty: 15, dir: 'down' }); localStorage.setItem(KEY, JSON.stringify(d)); }
    }`),
  },
  { name: 'ammerud-marcus', save: atMarcus, run: marcusFight(13, 4, 50, true) },
  ...['mohammed', 'celine', 'alexandra'].map((id) => ({
    name: `ammerud-marcus-${id}`, save: withHero(atMarcus, id), run: marcusFight(13, 4), sameAs: { beaten: 'ammerud-marcus__beaten' },
  })),
  { name: 'ammerud-marcus-light-vest', save: gear(atMarcus, 'crystal', 'light'), run: marcusFight(13, 4) },
  { // level 9, the Iron Sword and the Tough Vest: the hardest sensible way to do it
    name: 'ammerud-marcus-modest',
    save: (() => { const d = gear(atMarcus, 'iron', 'vest'); Object.assign(d.player, level(9), { maxhp: 94, hp: 94, weapons: ['none', 'iron'] }); return d; })(),
    run: marcusFight(18, 6, 55),
  },
  { // one measured blow with each weapon, and running away leaves him unbeaten
    name: 'ammerud-marcus-weapons', save: atMarcus,
    run: `async (T, g) => {
      ${MEET}
      await T.continueGame();
      const dealt = {};
      g.player.weapons.push('axe', 'bat');
      for (const w of ['crystal', 'axe', 'bat']) {
        g.player.weapon = w; g.player.hp = g.player.maxhp;
        await T.talk();
        await T.untilBattle();
        dealt[w] = await swing();
        await T.fight(() => 2);
        T.check('got away: he is unbeaten and nothing was handed over', g.mode === 'world' && !g.flags.marcusBeaten && !g.flags.marcusBat && g.q.trouble.s === 1 && g.stats.won === 52, g.mode);
      }
      // hero ATK 24; +7 / +2 / +9; +1 from the dice; less his DEF 9
      T.check('crystal 23, axe 18, bat 25', dealt.crystal === 23 && dealt.axe === 18 && dealt.bat === 25, JSON.stringify(dealt));
    }`,
  },
  { // closed in the middle of the hand-over: he finishes it next time, once
    name: 'ammerud-marcus-handover-interrupted', save: { ...atMarcus, flags: { ...atMarcus.flags, marcusBeaten: true } },
    run: [
      async (T, g) => {
        await T.continueGame();
        T.check('beaten, no bat yet', g.flags.marcusBeaten === true && !g.flags.marcusBat && !g.player.weapons.includes('bat') && g.q.trouble.s === 1);
        await T.talk('handover');
        T.check('no second fight: the bat, once', g.stats.won === 52 && g.player.weapons.filter((w) => w === 'bat').length === 1 && g.player.weapon === 'bat' && g.q.trouble.s === 2 && g.mode === 'world');
        await T.talk('after');
        T.check('still once', g.player.weapons.filter((w) => w === 'bat').length === 1);
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: the bat is owned and worn, once', g.player.weapon === 'bat' && g.player.weapons.filter((w) => w === 'bat').length === 1 && g.flags.marcusBat === true && g.q.trouble.s === 2);
        await T.talk();
        T.check('and he gives nothing more', g.player.weapons.length === 3 && g.mode === 'world');
      },
    ],
  },
  { // beaten by him: carried home with nothing, and he waits for another try
    name: 'ammerud-marcus-defeat',
    save: (() => { const d = JSON.parse(JSON.stringify(atMarcus)); Object.assign(d.player, level(1), { hp: 5, herbs: 0 }); return d; })(),
    run: [
      async (T, g) => {
        await T.continueGame();
        await T.tap('Space', 3);
        while (g.mode === 'dialog') { await T.frames(150); await T.tap('Space', 3); }
        await T.untilBattle();
        await T.fight();
        await T.until(() => g.mode === 'dialog', 'being carried home');
        await T.dialog();
        const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        T.check('in the village, patched up, saved there', g.player.map === 'village' && g.player.hp === g.player.maxhp && d.player.map === 'village');
        T.check('no bat, MARCUS unbeaten, the quest and its counts as they were', !d.flags.marcusBeaten && !d.flags.marcusBat && !d.player.weapons.includes('bat') && JSON.stringify(d.q.trouble) === '{"s":1,"c":3,"r":3,"b":2}');
      },
      async (T, g) => {
        await T.continueGame();
        T.place('ammerud', 7, 15, 'down');
        await T.tap('Space', 3);
        T.check('MARCUS is waiting for another try', g.mode === 'dialog' && g.dlg.name === 'MARCUS', g.mode);
      },
    ],
  },
  { // back to SELMA with EMIL's ball still to find: the chapter ends, the south gate opens, Grorud is next
    name: 'ammerud-chapter', save: { ...marcusDone(moved(chapterTwoDone, 'ammerud', 25, 10, 'up')), q: { ...marcusDone(chapterTwoDone).q, ball: { s: 1 } } },
    run: [
      async (T, g) => {
        const KEY = 'turnip-vale-save-v1', saved = () => JSON.parse(localStorage.getItem(KEY));
        await T.continueGame();
        T.check('ready to report, Chapter 3', g.q.trouble.s === 2 && g.chapter === 2 && !g.storyDone && g.NPCS.find((n) => n.id === 'selma').news());
        let spoke = false;
        await T.tap('Space', 3);
        while (g.mode === 'dialog') {
          await T.frames(150);
          if (g.dlg.name === 'MICHAEL') { if (!spoke) T.shot('hero-speaks'); spoke = true; }
          await T.tap('Space', 3);
        }
        T.check('the hero answers under the hero\'s own name', spoke);
        await T.until(() => g.mode === 'victory', 'the chapter screen');
        await T.frames(120);
        T.shot('chapter-complete');
        T.check('AMMERUD TROUBLE is done, the south gate unlocked, both saved', g.q.trouble.s === 3 && saved().q.trouble.s === 3 && g.flags.grorudGate === true && saved().flags.grorudGate === true);
        await T.tap('Space');
        await T.until(() => g.mode === 'world', 'the world');
        await T.frames(40);
        T.check('Chapter 4 now, Grorud next, and the story is not over', g.chapter === 3 && !g.storyDone && g.CHAPTERS[3].name === 'GRORUD' && g.player.map === 'ammerud');
        T.check('the ball is still being looked for, and is tracked again', g.q.ball.s === 1 && g.tracked === 'ball');
        const flags = JSON.stringify(g.flags), gold = g.player.gold;
        await T.talk('selma-after-1'); await T.talk('selma-after-2');
        T.check('no second chapter screen, nothing given twice', g.mode === 'world' && JSON.stringify(g.flags) === flags && g.player.gold === gold);
        T.place('ammerud', 15, 20, 'down');
        await T.frames(20);
        T.shot('south-gate-open');
        await T.tap('Space', 6);
        T.check('the open gate has nothing more to say', g.mode === 'world');
        await T.step('down');
        await T.until(() => g.player.map === 'grorudHeights', 'Grorud Heights');
        await T.frames(60);
        T.check('the open south gate leads to GRORUD HEIGHTS', g.player.x === 15 && g.player.y === 3, g.player.x + ',' + g.player.y);
        T.place('grorudHeights', 15, 3, 'up');
        await T.step('up');
        await T.until(() => g.player.map === 'ammerud', 'Ammerud again');
        await T.frames(60);
        T.check('and back to AMMERUD, by the south gate', g.player.x === 15 && g.player.y === 20, g.player.x + ',' + g.player.y);
        T.place('ammerud', 15, 20, 'down'); // facing the way this run always did
        // switch away from the bat and save by hand
        await T.tap('KeyX', 6);
        await T.tap('ArrowUp', 4); await T.tap('ArrowUp', 4);
        T.check('the cursor reaches the weapon line', g.menuSel === 0);
        T.shot('weapons');
        await T.tap('Space', 4); await T.tap('Space', 4);
        T.check('the bat, the stick, then the crystal sword', g.player.weapon === 'crystal' && JSON.stringify(g.player.weapons) === '["none","crystal","bat"]', g.player.weapon);
        await T.tap('ArrowDown', 4); await T.tap('ArrowDown', 4);
        await T.tap('Space', 6);
        T.check('SAVED! with the crystal sword in hand', g.menuNote && g.menuNote.text === 'SAVED!' && saved().player.weapon === 'crystal');
        await T.tap('KeyX', 6);
        T.state('chapter-done');
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: chapter, gate, bat, and everything from before', g.chapter === 3 && g.q.trouble.s === 3 && g.player.weapon === 'crystal' && g.player.weapons.includes('bat')
          && ['fragment1', 'fragment2', 'redKey', 'blueKey', 'redGate', 'blueGate', 'marcusBeaten', 'marcusBat', 'grorudGate'].every((k) => g.flags[k] === true));
        await T.tap('KeyX', 6);
        await T.tap('ArrowUp', 4); await T.tap('ArrowUp', 4); await T.tap('Space', 4);
        T.check('the bat can be worn again', g.player.weapon === 'bat');
        await T.tap('KeyX', 6);
        await T.tap('KeyX', 6);
        T.check('twelve quests known: the log opens on page 3, where the ball is', g.menuPage === 2, g.menuPage);
        await T.tap('ArrowRight', 6);
        T.check('and turns over to page 1', g.menuPage === 0, g.menuPage);
        await T.tap('KeyX', 6);
        T.place('ammerud', 7, 15, 'down');
        await T.frames(20);
        T.check('in the world beside MARCUS', g.mode === 'world' && g.NPCS.find((n) => n.id === 'marcus').visible(), g.mode);
        await T.talk('marcus-later');
        T.check('MARCUS stays at the court and stays beaten', g.mode === 'world' && g.NPCS.find((n) => n.id === 'marcus').visible() && g.player.weapons.filter((w) => w === 'bat').length === 1);
        T.place('ammerud', 28, 10, 'right');
        await T.step('right');
        await T.until(() => g.player.map === 'stovner', 'Stovner');
        await T.frames(60);
        T.place('stovner', 16, 9, 'up');
        await T.talk('johanne');
        T.check('Stovner is still a walk away, and JOHANNE has nothing new', g.mode === 'world' && g.q.mohsin.s === 3);
        T.state('wandered');
      },
    ],
  },
  { // EMIL's ball, with a reload after finding it and after handing it back
    name: 'ammerud-ball', save: moved(inAmmerud, 'ammerud', 8, 11, 'down'),
    run: [
      async (T, g) => {
        const KEY = 'turnip-vale-save-v1', saved = () => JSON.parse(localStorage.getItem(KEY));
        await T.continueGame();
        g.MAPS.ammerud.encounter.chance = 0; // (only in this run of the game: no monsters while walking about)
        T.place('ammerud', 26, 19, 'right');
        await T.step('right');
        T.check('no ball lies about before EMIL asks', g.mode === 'world' && g.player.x === 27 && !g.flags.ball);
        T.place('ammerud', 8, 11, 'down');
        await T.frames(20);
        T.shot('emil');
        await T.talk('offer');
        T.check('accepted and saved', g.q.ball.s === 1 && saved().q.ball.s === 1 && g.tracked === 'ball');
        await T.talk('hint');
        T.place('ammerud', 26, 19, 'right');
        await T.frames(20);
        T.shot('ball');
        await T.step('right');
        T.check('found by walking onto it', g.mode === 'dialog' && g.player.x === 27 && g.player.y === 19, g.mode);
        await T.dialog('found');
        T.check('ready and saved', g.q.ball.s === 2 && g.flags.ball === true && saved().q.ball.s === 2 && saved().flags.ball === true);
        await T.step('left'); await T.step('right');
        T.check('only one ball', g.mode === 'world');
        T.shot('ball-gone');
      },
      async (T, g) => {
        const KEY = 'turnip-vale-save-v1', saved = () => JSON.parse(localStorage.getItem(KEY));
        await T.continueGame();
        T.check('CONTINUE: the ball is carried, not lying in the park', g.q.ball.s === 2 && !g.ITEMS.some((i) => i.id === 'ball' && !g.flags.ball));
        T.place('ammerud', 8, 11, 'down');
        await T.talk('return');
        T.check('SNEAKERS owned once, not put on by themselves, quest done and saved', g.player.armors.filter((a) => a === 'sneakers').length === 1 && g.player.armor === 'vest' && g.q.ball.s === 3
          && saved().q.ball.s === 3 && saved().player.armors.includes('sneakers'));
        await T.talk('after'); await T.talk('after-2');
        T.check('no second pair', g.player.armors.filter((a) => a === 'sneakers').length === 1);
        await T.tap('KeyX', 6);
        await T.tap('ArrowUp', 4);
        await T.tap('Space', 4);
        T.check('put on from the menu', g.player.armor === 'sneakers', g.player.armor);
        T.shot('sneakers');
        await T.tap('ArrowDown', 4); await T.tap('Space', 6); await T.tap('KeyX', 6);
      },
      `async (T, g) => {
        ${MEET}
        await T.continueGame();
        T.check('CONTINUE in sneakers', g.player.armor === 'sneakers' && g.q.ball.s === 3 && g.flags.ball === true);
        await meet(20, 15, 'down', 0, 'ammerud');
        T.check('a shadow rat gets no opening bite', g.battle.type === 'shadow' && g.player.hp === g.player.maxhp);
        await T.fight(cautious);
        T.state('done');
      }`,
    ],
  },
  { // ASTRID's light on the dark path, the glowing wisp, and the WISP FRAGMENT
    name: 'ammerud-wisp', save: moved(inAmmerud, 'ammerud', 6, 9, 'up'),
    run: [
      `async (T, g) => {
        ${MEET}
        ${WATCH}
        await T.continueGame();
        const wisp = () => g.NPCS.find((n) => n.id === 'glowwisp');
        T.check('no light on the path before ASTRID asks', !wisp().visible());
        await T.talk('offer');
        T.check('accepted and saved', g.q.wisp.s === 1 && saved().q.wisp.s === 1 && g.tracked === 'wisp');
        g.MAPS.darkPath.encounter.chance = 0; g.MAPS.ammerud.encounter.chance = 0; // (only in this run of the game: no monsters while walking about)
        await T.step('left', 6);
        await T.until(() => g.player.map === 'darkPath', 'the dark path');
        await T.frames(20);
        T.shot('dark-path');
        await T.frames(40);
        T.check('onto the dark path, autosaved', g.player.x === 14 && g.player.y === 10 && saved().player.map === 'darkPath');
        T.check('the light is there now', wisp().visible());
        T.place('darkPath', 5, 5, 'left');
        await T.frames(20);
        T.shot('the-light');
        await T.talk('wisp');
        await T.untilBattle();
        const b = g.battle;
        T.check('a glowing wisp: tougher than a wanderer, but no boss', b.type === 'glowwisp' && b.name === 'GLOWING WISP' && !b.boss && b.max === 110 && b.atk === 28 && b.def === 8 && b.xp === 90, JSON.stringify([b.max, b.atk, b.def, b.xp, b.boss]));
        T.shot('battle');
        await T.fight(() => 2);
        T.check('running away: the light stays, no fragment', g.mode === 'world' && wisp().visible() && !g.flags.wispFragment && g.q.wisp.s === 1);
        g.player.hp = g.player.maxhp;
        await T.talk();
        await T.untilBattle();
        const { turns, seen } = await watchFight(45, [['flare', /flares cold/], ['fragment', /WISP FRAGMENT/]]);
        T.check('it flared, and was beaten', seen.flare >= 1 && seen.fragment === 1 && g.player.hp > 0, JSON.stringify(seen));
        await T.frames(70);
        T.check('the WISP FRAGMENT, once; the quest is ready; all saved', g.flags.wispFragment === true && g.q.wisp.s === 2 && saved().flags.wispFragment === true && saved().q.wisp.s === 2);
        T.check('the light has gone out', !wisp().visible());
        T.check('a fair fight', turns <= 8, turns);
        T.shot('gone');
        await T.tap('KeyX', 6);
        T.check('the menu opens on SAVE, with the ITEMS line above it', g.menuSel === 2);
        T.shot('menu');
        await T.tap('ArrowUp', 4);
        T.check('up: ITEMS', g.menuSel === 3);
        T.shot('items');
        await T.tap('Space', 4);
        T.check('nothing to change there', g.menuSel === 3 && g.player.weapon === 'crystal' && g.player.armor === 'vest');
        await T.tap('ArrowUp', 4);
        T.check('up again: the armour', g.menuSel === 1);
        await T.tap('ArrowDown', 4); await T.tap('ArrowDown', 4);
        T.check('and back down to SAVE', g.menuSel === 2);
        await T.tap('Space', 6);
        await T.tap('KeyX', 6);
      }`,
      async (T, g) => {
        const KEY = 'turnip-vale-save-v1', saved = () => JSON.parse(localStorage.getItem(KEY));
        await T.continueGame();
        T.check('CONTINUE: the fragment is kept and the light stays out', g.flags.wispFragment === true && g.q.wisp.s === 2 && !g.NPCS.find((n) => n.id === 'glowwisp').visible());
        T.place('ammerud', 6, 9, 'up');
        const gold = g.player.gold;
        await T.talk('return');
        T.check('50 gold, quest done, the fragment kept', g.player.gold === gold + 50 && g.q.wisp.s === 3 && g.flags.wispFragment === true && saved().q.wisp.s === 3);
        await T.talk('after');
        T.check('no more gold', g.player.gold === gold + 50);
        T.check('the light never comes back', !g.NPCS.find((n) => n.id === 'glowwisp').visible());
        T.state('done');
      },
    ],
  },
  { // NADIA's kiosk: herbs, the bigger pouch once, the reinforced vest once
    name: 'ammerud-shop', save: moved(inAmmerud, 'ammerud', 14, 10, 'up'),
    run: [
      async (T, g) => {
        await T.continueGame();
        await T.talk('greeting');
        T.check('the kiosk opens', g.mode === 'shop' && g.shop.id === 'nadia');
        T.shot('shop');
        await T.tap('Space', 4);
        T.check('a full pouch takes no herb', g.player.gold === 520 && g.player.herbs === 6 && g.shop.note === 'Your pouch is full!');
        await T.tap('ArrowDown', 4); await T.tap('Space', 4);
        T.check('HERB POUCH+1: 90 gold, one more herb, and one in it', g.player.gold === 430 && g.player.maxHerbs === 7 && g.player.herbs === 7 && g.flags.pouchBought === true);
        await T.tap('Space', 4);
        T.check('only once', g.player.gold === 430 && g.player.maxHerbs === 7 && g.shop.note === 'Sold out!');
        await T.tap('ArrowDown', 4); await T.tap('Space', 4);
        T.check('REINF. VEST: 160 gold, owned and worn, the Tough Vest kept', g.player.gold === 270 && g.player.armor === 'rvest' && JSON.stringify(g.player.armors) === '["none","vest","rvest"]');
        await T.tap('Space', 4);
        T.check('not sold twice', g.player.gold === 270 && g.shop.note === 'You already wear one.');
        T.shot('bought');
        await T.tap('ArrowDown', 4); await T.tap('Space', 4);
        T.check('LEAVE', g.mode === 'world');
        await T.talk('again');
        T.check('she knows the hero now, and opens again', g.mode === 'shop' && g.flags.metNadia === true);
        await T.tap('KeyX', 4);
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: vest worn, pouch bigger, gold spent', g.player.armor === 'rvest' && g.player.maxHerbs === 7 && g.player.gold === 270 && g.flags.pouchBought === true);
        await T.talk();
        T.shot('owned');
        await T.tap('KeyX', 4);
        T.state('after');
      },
    ],
  },
  { // the two chests: 80 gold among the blocks, a bigger herb pouch on the dark path; neither comes back
    name: 'ammerud-chests', save: inAmmerud,
    run: [
      async (T, g) => {
        await T.continueGame();
        g.MAPS.ammerud.encounter.chance = 0; g.MAPS.darkPath.encounter.chance = 0; // (only in this run of the game: no monsters while walking about)
        T.place('ammerud', 27, 4, 'up');
        await T.frames(20);
        T.shot('gold-chest');
        await T.step('up');
        await T.dialog('gold');
        T.check('80 gold', g.player.gold === 600 && g.flags.chestGold === true);
        await T.step('down'); await T.step('up');
        T.check('opened once', g.player.gold === 600 && g.mode === 'world');
        T.place('darkPath', 8, 13, 'down');
        await T.frames(20);
        T.shot('pouch-chest');
        await T.step('down');
        await T.dialog('pouch');
        T.check('a bigger pouch, full', g.player.maxHerbs === 7 && g.player.herbs === 7 && g.flags.chestPouch === true);
        await T.step('up'); await T.step('down');
        T.check('opened once', g.player.maxHerbs === 7 && g.mode === 'world');
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: both opened, nothing back', g.flags.chestGold === true && g.flags.chestPouch === true && g.player.gold === 600 && g.player.maxHerbs === 7
          && g.ITEMS.filter((i) => i.chest && (i.map === 'ammerud' || i.map === 'darkPath')).every((i) => g.flags[i.id]));
        T.shot('continued');
        T.state('after');
      },
    ],
  },
  { // the on-screen buttons: SELMA's offer, the log, and the ITEMS line
    name: 'ammerud-touch', save: withHero({ ...moved(inAmmerud, 'ammerud', 25, 10, 'up'), flags: { ...inAmmerud.flags, wispFragment: true }, q: { ...inAmmerud.q, wisp: { s: 2 } } }, 'celine'),
    run: async (T, g) => {
      await T.continueGame();
      await T.touch('a');
      T.check('A talks to SELMA', g.mode === 'dialog' && g.dlg.name === 'SELMA', g.mode);
      let presses = 0, spoke = false;
      while (g.mode === 'dialog') {
        await T.frames(150);
        if (g.dlg.name === 'CELINE') { if (!spoke) T.shot('hero-speaks'); spoke = true; }
        await T.touch('a', 3);
        if (++presses > 12) throw new Error('the talk never ended');
      }
      T.check('the hero answers as CELINE, and the quest is taken', spoke && g.q.trouble.s === 1 && g.mode === 'world');
      await T.touch('b');
      T.check('B opens the log on the page of the new quest', g.mode === 'menu' && g.menuPage === 2, g.menuPage);
      T.shot('log');
      await T.touch('up');
      T.check('up: ITEMS', g.menuSel === 3);
      T.shot('items');
      await T.touch('down');
      await T.touch('a');
      T.check('A on SAVE saves', g.menuNote && g.menuNote.text === 'SAVED!');
      await T.touch('b');
      T.check('B closes it', g.mode === 'world');
    },
  },
];

// A save exactly as the published 1E game (commit a74c095) wrote it, byte for byte: made by playing that
// version from the end of Stovner, turning in to JOHANNE, opening the west gate with the Blue Key (which
// 1E showed as open but kept solid, "the road to AMMERUD lies beyond") and saving by hand in front of it.
// It has the 1E fields: hero, weapons, armors, the ten 1E quests and no Ammerud quest, blueGate: true.
const REAL_1E_SAVE = {"v":1,"player":{"map":"stovner","x":1,"y":9,"dir":"left","moving":false,"fx":1,"fy":9,"tx":1,"ty":9,"t":0,"lvl":10,"hp":100,"maxhp":100,"atk":24,"def":10,"xp":0,"next":454,"herbs":6,"maxHerbs":6,"gold":400,"weapon":"crystal","armor":"light","weapons":["none","crystal","axe"],"armors":["none","vest","light"],"shards":0,"glowcaps":0,"sickle":true,"sinceBattle":2,"hero":"mohammed"},"q":{"slimes":{"s":3,"n":3},"biscuit":{"s":3},"glowcap":{"s":3},"king":{"s":3},"shards":{"s":3},"road":{"s":3,"n":3},"cart":{"s":3},"under":{"s":3},"mohsin":{"s":3},"kebab":{"s":3}},"flags":{"vines":true,"metBram":true,"shard1":true,"shard2":true,"fragment1":true,"redKey":true,"redGate":true,"tunnelOpen":true,"northOpen":true,"mohsinBeaten":true,"fragment2":true,"blueKey":true,"chestAxe":true,"chestVest":true,"kebab":true,"blueGate":true},"stats":{"won":70,"slimes":17,"steps":4000},"tracked":null};
// The same save from before the gate was opened: the Blue Key is held, the gate is still shut.
const REAL_1E_SAVE_SHUT = (() => { const d = JSON.parse(JSON.stringify(REAL_1E_SAVE)); delete d.flags.blueGate; return d; })();
const realGateScenarios = [
  { // CONTINUE a real 1E save in front of the open west gate: through it, into Ammerud, saved, and back
    name: 'ammerud-gate-real-1e-save', save: REAL_1E_SAVE,
    run: [
      async (T, g) => {
        const KEY = 'turnip-vale-save-v1', saved = () => JSON.parse(localStorage.getItem(KEY));
        const raw = saved();
        T.check('the fixture is a 1E save: hero, gear lists, ten quests, no Ammerud quest, gate open', raw.v === 1 && raw.player.hero === 'mohammed' && Array.isArray(raw.player.weapons)
          && Object.keys(raw.q).join() === 'slimes,biscuit,glowcap,king,shards,road,cart,under,mohsin,kebab' && raw.flags.blueGate === true && raw.flags.blueKey === true && raw.player.x === 1 && raw.player.y === 9);
        await T.continueGame();
        const gate = g.MAPS.stovner.gates['0,9'];
        T.check('CONTINUE: in front of the west gate, which is open and can be walked on', g.player.map === 'stovner' && g.player.x === 1 && g.player.y === 9 && g.player.dir === 'left'
          && g.flags.blueGate === true && gate.open === 'L' && !g.SOLID.has(gate.open) && g.MAPS.stovner.exits['0,9'].map === 'ammerud');
        T.shot('gate-open');
        await T.tap('Space', 6);
        T.check('the open gate says nothing (1E said "the road to AMMERUD lies beyond" and kept the hero out)', g.mode === 'world');
        T.keyDown('ArrowLeft'); await T.frames(2); T.keyUp('ArrowLeft');
        await T.until(() => g.player.x === 0 || g.player.map !== 'stovner', 'the gate tile', 60);
        T.check('the hero steps onto the gate tile', g.player.x === 0 && g.player.y === 9 && g.player.map === 'stovner', g.player.map + ' ' + g.player.x);
        await T.until(() => g.player.map === 'ammerud', 'Ammerud', 120);
        await T.frames(60);
        T.check('in AMMERUD, just inside, facing west', g.player.x === 28 && g.player.y === 10 && g.player.dir === 'left' && g.mode === 'world', g.player.x + ',' + g.player.y + ' ' + g.player.dir);
        T.check('autosaved there, with everything from 1E kept', saved().player.map === 'ammerud' && saved().player.x === 28 && saved().player.hero === 'mohammed' && saved().player.armor === 'light'
          && saved().player.weapons.join() === 'none,crystal,axe' && saved().flags.blueGate === true && saved().q.mohsin.s === 3 && saved().q.trouble.s === 0);
        T.shot('ammerud');
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE in Ammerud', g.player.map === 'ammerud' && g.player.x === 28 && g.player.y === 10);
        await T.step('right');
        await T.until(() => g.player.map === 'stovner', 'Stovner', 120);
        await T.frames(60);
        T.check('back to Stovner, inside the west gate, facing east', g.player.x === 1 && g.player.y === 9 && g.player.dir === 'right' && g.mode === 'world', g.player.x + ',' + g.player.y);
        await T.touch('left', 20);
        await T.until(() => g.player.map === 'ammerud', 'Ammerud by touch', 120);
        await T.frames(60);
        T.check('and through again with the on-screen D-pad', g.player.x === 28 && g.player.y === 10);
      },
    ],
  },
  { // the same real 1E save before the Blue Key was used: the shut gate still blocks, then opens and lets the hero through
    name: 'ammerud-gate-real-1e-save-shut', save: REAL_1E_SAVE_SHUT,
    run: async (T, g) => {
      await T.continueGame();
      await T.step('left');
      await T.frames(60);
      T.check('shut: the hero stays in Stovner', g.player.map === 'stovner' && g.player.x === 1 && !g.flags.blueGate);
      T.shot('gate-shut');
      await T.talk('unlock');
      T.check('the Blue Key opens it, saved', g.flags.blueGate === true && JSON.parse(localStorage.getItem('turnip-vale-save-v1')).flags.blueGate === true);
      await T.step('left');
      await T.until(() => g.player.map === 'ammerud', 'Ammerud', 120);
      await T.frames(60);
      T.check('and then the way is through', g.player.x === 28 && g.player.y === 10 && g.player.dir === 'left');
    },
  },
];

// Manual saving from the menu. It writes the same save the game makes by itself, so everything here is
// checked against the ordinary save file and the ordinary CONTINUE.
// (Scenario code runs inside the page, so these are pieces of source text.)
const RAW = `localStorage.getItem('turnip-vale-save-v1')`;
const manualSave = (press) => [
  `async (T, g) => {
    await T.continueGame();
    const before = ${RAW};
    await T.step('right', 3);
    T.check('walked three steps from the saved spot', g.player.x === JSON.parse(before).player.x + 3, g.player.x);
    T.check('walking alone does not save (autosave unchanged)', ${RAW} === before);
    await T.tap('KeyX', 6);
    T.shot('menu');
    T.check('opening the menu does not save', ${RAW} === before);
    await ${press};
    T.shot('saved');
    T.check('confirmation shown, menu still open', g.mode === 'menu' && g.menuNote && g.menuNote.text === 'SAVED!', JSON.stringify(g.menuNote));
    const d = JSON.parse(${RAW});
    T.check('the new position is saved', d.player.x === g.player.x && d.player.y === g.player.y && d.player.map === g.player.map && d.player.dir === 'right');
    T.check('same save format', Object.keys(d).sort().join() === 'flags,player,q,stats,tracked,v' && d.v === 1);
    T.check('same player fields', Object.keys(d.player).sort().join() === [...new Set([...Object.keys(JSON.parse(before).player), 'hero', 'weapons', 'armors'])].sort().join());
    T.check('quests, flags and stats saved as they are', JSON.stringify(d.q) === JSON.stringify(g.q) && JSON.stringify(d.flags) === JSON.stringify(g.flags)
      && JSON.stringify(d.stats) === JSON.stringify(g.stats));
    await T.frames(100);
    T.shot('confirmation-gone');
    T.check('confirmation clears by itself', g.menuNote === null);
    await T.tap('KeyX', 6);
    T.check('X closes the menu', g.mode === 'world', g.mode);
    T.state('saved');
    await T.step('left', 2);
    T.check('walking on afterwards does not overwrite the save', ${RAW} === JSON.stringify(d));
  }`,
  `async (T, g) => {
    await T.frames(30);
    T.shot('title');
    await T.continueGame();
    T.state('continued');
    T.shot('world');
    await T.menuShot('status');
  }`,
];
const sameAsFirst = { saved: 'manual-save__saved', continued: 'manual-save__continued' };
const manualSaveScenarios = [
  { name: 'manual-save', save: FIX.report, run: manualSave(`T.tap('Space', 6)`) },
  { name: 'manual-save-enter', save: FIX.report, run: manualSave(`T.tap('Enter', 6)`), sameAs: sameAsFirst },
  { name: 'manual-save-touch', save: FIX.report, run: manualSave(`T.touch('a')`), sameAs: sameAsFirst },
  { name: 'manual-save-alexandra', save: withHero(FIX.report, 'alexandra'), run: manualSave(`T.tap('Space', 6)`), sameAs: sameAsFirst },
  { // touch from start to finish: open with B, save with A, close with B, then reopen the game
    name: 'manual-save-touch-only', save: FIX.woods,
    run: [
      async (T, g) => {
        await T.continueGame();
        await T.touch('b');
        T.check('B opens the menu', g.mode === 'menu', g.mode);
        await T.touch('a');
        T.check('A saves', g.menuNote && g.menuNote.text === 'SAVED!');
        T.shot('saved');
        await T.touch('b');
        T.check('B closes the menu', g.mode === 'world', g.mode);
        T.state('saved');
      },
      async (T, g) => { await T.continueGame(); T.state('continued'); },
    ],
  },
  { // a save written by hand and one written by the game are the same thing
    name: 'manual-save-equals-autosave', save: FIX.report,
    run: async (T, g) => {
      await T.continueGame();
      await T.talk(); // turning in the boss quest autosaves
      await T.until(() => g.mode === 'victory', 'victory screen');
      await T.frames(120);
      await T.tap('Space');
      await T.until(() => g.mode === 'world', 'world');
      await T.frames(40);
      const auto = localStorage.getItem('turnip-vale-save-v1');
      await T.tap('KeyX', 6); await T.tap('Space', 6); await T.tap('KeyX', 6);
      T.check('saving by hand right after an autosave writes the identical file', localStorage.getItem('turnip-vale-save-v1') === auto);
      T.state('after');
    },
    sameAs: { after: 'victory__after-victory' },
  },
  { // the newest save wins, whichever kind it is
    name: 'manual-save-then-autosave', save: FIX.fresh,
    run: [
      async (T, g) => {
        await T.continueGame();
        await T.step('right');
        await T.tap('KeyX', 6); await T.tap('Space', 6); await T.tap('KeyX', 6);
        const manual = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        T.check('saved by hand one step right', manual.player.x === 9 && manual.q.slimes.s === 0, manual.player.x);
        await T.step('left'); await T.step('up'); // back below Elder Moss, facing them
        await T.talk(); // accepting a quest autosaves
        const auto = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        T.check('the later autosave replaces it', auto.player.x === 8 && auto.q.slimes.s === 1, auto.player.x);
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE loads the latest save', g.player.x === 8 && g.q.slimes.s === 1, g.player.x);
      },
    ],
  },
  { // saving twice in a row, with every direction key pressed in between
    name: 'manual-save-repeat', save: FIX.finished,
    run: async (T, g) => {
      await T.continueGame();
      await T.tap('KeyX', 6);
      await T.tap('Space', 6);
      const first = localStorage.getItem('turnip-vale-save-v1');
      for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) await T.tap(k, 4);
      await T.tap('Space', 6);
      T.check('second save is identical', localStorage.getItem('turnip-vale-save-v1') === first && g.mode === 'menu');
      await T.tap('Escape', 6);
      T.check('Esc closes the menu', g.mode === 'world', g.mode);
      T.check('nothing moved', g.player.x === 12 && g.player.y === 7);
    },
  },
  { // storage that refuses to save: say so, and keep playing
    name: 'manual-save-storage-full', save: FIX.fresh,
    run: async (T, g) => {
      await T.continueGame();
      const real = Storage.prototype.setItem;
      Storage.prototype.setItem = () => { throw new Error('full'); };
      await T.tap('KeyX', 6); await T.tap('Space', 6);
      T.shot('failed');
      T.check('failure is reported', g.menuNote && g.menuNote.text === 'FAILED!', JSON.stringify(g.menuNote));
      Storage.prototype.setItem = real;
      await T.tap('KeyX', 6);
      await T.step('right');
      T.check('the game carries on', g.mode === 'world' && g.player.x === 9, g.player.x);
    },
  },
  { // the menu, and so saving by hand, is out of reach in dialogue and in battle
    name: 'manual-save-not-elsewhere', save: FIX.boss,
    run: async (T, g) => {
      await T.continueGame();
      const before = localStorage.getItem('turnip-vale-save-v1');
      const same = () => localStorage.getItem('turnip-vale-save-v1') === before;
      await T.tap('Space', 3);
      T.check('in dialogue', g.mode === 'dialog', g.mode);
      await T.tap('KeyX', 3);
      T.check('the menu does not open during dialogue', g.mode !== 'menu' && same(), g.mode);
      await T.dialog();
      await T.untilBattle();
      await T.tap('KeyX', 6);
      T.check('the menu does not open in battle', g.mode === 'battle' && same(), g.mode);
      await T.tap('Space', 1);
      await T.frames(30);
      T.check('the action button in battle does not save', g.mode === 'battle' && same() && g.menuNote === null);
    },
  },
  { // an old save without the newer fields: save by hand, reopen, nothing lost
    name: 'manual-save-old-save',
    save: (() => { const d = JSON.parse(JSON.stringify(FIX.bram)); delete d.tracked; delete d.q.shards; d.q.kebab1 = { s: 1, found: 2 }; return d; })(),
    run: [
      async (T, g) => {
        await T.continueGame();
        await T.tap('KeyX', 6); await T.tap('Space', 6); await T.tap('KeyX', 6);
        const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        T.check('unknown quest kept untouched', JSON.stringify(d.q.kebab1) === '{"s":1,"found":2}');
        T.check('missing quest filled in, hero defaulted', d.q.shards.s === 0 && d.player.hero === 'michael');
        T.state('saved');
      },
      async (T, g) => { await T.continueGame(); T.state('continued'); await T.menuShot('status'); },
    ],
  },
];

// Saves whose hero value is unusable must fall back to Michael, keep everything else, and still play.
const BAD_HEROES = { unknown: 'nobody', builtin: 'constructor', number: 42, nothing: null, empty: '', list: ['michael'] };
const badHeroScenarios = Object.entries(BAD_HEROES).map(([label, value]) => ({
  name: `hero-bad-${label}`,
  save: { ...FIX.report, player: { ...FIX.report.player, hero: value } },
  run: async (T, g) => {
    await T.continueGame();
    T.check('falls back to Michael', g.player.hero === 'michael', JSON.stringify(g.player.hero));
    T.check('keeps the rest of the save', g.player.lvl === 8 && g.player.gold === 180 && g.q.king.s === 2 && g.flags.vines === true);
    await T.menuShot('status');
    await T.talk('elder');
    await T.until(() => g.mode === 'victory', 'victory screen');
    await T.frames(120);
    T.shot('victory');
    T.check('saves michael from then on', T.savedPlayer().hero === 'michael', JSON.stringify(T.savedPlayer().hero));
  },
}));

// ------------------------------------------------------------------ Grorud (Expansion 1G)
// A save from the end of Ammerud, the way a player who explored normally would have it: level 11, MARCUS'
// bat in hand, the sneakers from EMIL, seven herbs, all of Ammerud done. Standing at the open south gate.
const chapterThreeDone = (() => {
  const d = marcusDone(chapterTwoDone);
  d.q.trouble = { s: 3, c: 3, r: 3, b: 2 }; d.q.ball = { s: 3 }; d.q.wisp = { s: 3 }; d.tracked = null;
  Object.assign(d.flags, { grorudGate: true, ball: true, wispFragment: true, chestPouch: true, metNadia: true });
  Object.assign(d.player, level(11), {
    maxhp: 106, hp: 106, maxHerbs: 7, herbs: 7, gold: 640, armor: 'sneakers', armors: ['none', 'vest', 'sneakers'],
    map: 'ammerud', x: 15, y: 20, fx: 15, fy: 20, tx: 15, ty: 20, dir: 'down',
  });
  d.stats = { won: 90, slimes: 17, steps: 5200 };
  return d;
})();
const inHeights = moved(chapterThreeDone, 'grorudHeights', 15, 3, 'down');
const inTown = moved(chapterThreeDone, 'grorudTown', 12, 3, 'down');
const withCells = (fix, s, list) => {
  const d = JSON.parse(JSON.stringify(fix));
  d.q.power = { s }; d.tracked = s ? 'power' : null;
  for (const k of list) d.flags[k] = true;
  return d;
};
const powered = (fix) => { const d = withCells(fix, 1, ['cell1', 'cell2', 'cell3']); d.flags.worksOpen = true; return d; };
const atNabilah = powered(moved(chapterThreeDone, 'grorudWorks', 12, 3, 'up'));
const nabilahDone = (fix) => {
  const d = JSON.parse(JSON.stringify(fix));
  d.q.power = { s: 2 }; d.tracked = 'power';
  Object.assign(d.flags, { nabilahBeaten: true, fragment3: true, factoryKey: true });
  return d;
};
const dressed = (fix, weapon, armor) => {
  const d = JSON.parse(JSON.stringify(fix));
  Object.assign(d.player, { weapon, armor, weapons: [...new Set([...d.player.weapons, weapon])], armors: [...new Set([...d.player.armors, armor])] });
  return d;
};
// Shared by the Grorud runs: reading the save, talking through chained dialogues, and what someone said.
// (GRX is the same without the save reader, for runs that also use MEET, which has its own.)
const GRX = `
  const quiet = () => { for (const m of ['grorudHeights', 'grorudTown', 'grorudWorks', 'ammerud']) g.MAPS[m].encounter.chance = 0; };
  // Talks to whoever is in front of the hero and returns everything that was said as one text, with
  // "| NAME:" wherever the speaker changes (pages run on with a space, as they read on screen).
  const hear = async (prefix) => {
    const said = [];
    let who = null;
    await T.tap('Space', 3);
    if (g.mode !== 'dialog') throw new Error('nothing to talk to (' + prefix + ')');
    let i = 0;
    while (g.mode === 'dialog') {
      if (++i > 40) throw new Error('the talk never ended');
      await T.frames(150);
      if (prefix) T.shot(prefix + '-p' + i);
      if (g.dlg.name !== who) { who = g.dlg.name; said.push('| ' + who + ':'); }
      said.push(g.dlg.pages[g.dlg.page].join(' '));
      await T.tap('Space', 3);
    }
    await T.frames(10);
    return said.join(' ');
  };
`;
const GR = `
  const KEY = 'turnip-vale-save-v1', saved = () => JSON.parse(localStorage.getItem(KEY));
  ${GRX}
`;
// The same wrap as the game's, to check that menu descriptions fit.
const WRAP = `
  const wrap = (t, n) => { const lines = []; let cur = ''; for (const w of t.split(' ')) { if (!cur) cur = w; else if ((cur + ' ' + w).length <= n) cur += ' ' + w; else { lines.push(cur); cur = w; } } if (cur) lines.push(cur); return lines; };
`;
const GRORUD_MAPS = ['grorudHeights', 'grorudTown', 'grorudWorks', 'veitvetRoad'];
const grorudScenarios = [
  { // a save from the end of Ammerud: through the south gate, down the heights into the town, and back
    name: 'grorud-arrive', save: chapterThreeDone,
    run: [
      `async (T, g) => {
        ${GR}
        T.check('the save knows nothing of Grorud', saved().q.power === undefined && saved().q.bag === undefined && saved().q.yard === undefined);
        await T.continueGame();
        T.check('it loads in Chapter 4 with every Grorud quest unstarted', g.chapter === 3 && ['power', 'bag', 'yard'].every((id) => g.q[id].s === 0) && JSON.stringify(g.q.yard) === '{"s":0,"n":0}');
        T.shot('south-gate');
        await T.step('down');
        await T.until(() => g.player.map === 'grorudHeights', 'the heights');
        await T.frames(20);
        T.shot('arriving');
        await T.frames(40);
        T.check('through the south gate onto GRORUD HEIGHTS, autosaved', g.player.x === 15 && g.player.y === 3 && g.player.dir === 'down' && saved().player.map === 'grorudHeights', g.player.x + ',' + g.player.y);
        await T.frames(120);
        T.check('no bouncing back, and nothing happens by itself', g.mode === 'world' && g.player.map === 'grorudHeights');
        quiet();
        T.place('grorudHeights', 15, 4, 'right');
        await T.talk('sign');
        T.place('grorudHeights', 21, 11, 'down');
        await T.step('down', 2);
        T.check('down through the gap in the ledge', g.player.x === 21 && g.player.y === 13);
        T.shot('ledge');
        T.place('grorudHeights', 14, 19, 'down');
        await T.step('down');
        await T.until(() => g.player.map === 'grorudTown', 'the town');
        await T.frames(20);
        T.shot('town');
        await T.frames(40);
        T.check('down the steps into GRORUD, autosaved', g.player.x === 12 && g.player.y === 3 && g.player.dir === 'down' && saved().player.map === 'grorudTown', g.player.x + ',' + g.player.y);
        const here = g.NPCS.filter((n) => n.map === 'grorudTown').map((n) => n.id + ' ' + n.x + ',' + n.y).join('; ');
        T.check('four people in Grorud', here === 'tobias 19,3; nawal 10,8; honey 7,3; joan 20,12', here);
        const news = g.NPCS.filter((n) => n.map === 'grorudTown' && n.news && n.news()).map((n) => n.id).join();
        T.check('TOBIAS, HONEY and JOAN have a mark; NAWAL does not', news === 'tobias,honey,joan', news);
        T.place('grorudTown', 12, 7, 'down'); await T.frames(20); T.shot('square');
        T.place('grorudTown', 20, 3, 'up'); await T.frames(20); T.shot('works-gate');
        const gate = await hear('works-gate');
        T.check('the Works gate says why it is shut', /power is off/.test(gate), gate);
        await T.step('up');
        T.check('the Works gate is shut', g.player.map === 'grorudTown' && g.player.y === 3 && !g.flags.worksOpen);
        T.place('grorudTown', 18, 4, 'up'); await T.talk('terminal');
        T.place('grorudTown', 24, 9, 'right'); await T.frames(20); T.shot('east-gate');
        await T.talk('east-gate');
        await T.step('right');
        T.check('the east gate is locked', g.player.map === 'grorudTown' && g.player.x === 24 && !g.flags.veitvetGate);
        T.place('grorudTown', 13, 3, 'up');
        await T.step('up');
        await T.until(() => g.player.map === 'grorudHeights', 'back up');
        await T.frames(60);
        T.check('back up the steps to the heights', g.player.x === 15 && g.player.y === 19 && g.player.dir === 'up', g.player.x + ',' + g.player.y);
        T.place('grorudHeights', 15, 3, 'up');
        await T.step('up');
        await T.until(() => g.player.map === 'ammerud', 'Ammerud');
        await T.frames(60);
        T.check('and back through the south gate to AMMERUD', g.player.x === 15 && g.player.y === 20 && g.player.dir === 'up', g.player.x + ',' + g.player.y);
        T.check('nothing was started, given or picked up by looking around', ['power', 'bag', 'yard'].every((id) => g.q[id].s === 0) && g.player.gold === 640 && !g.flags.cell1 && !g.flags.bag);
        await T.step('down');
        await T.until(() => g.player.map === 'grorudHeights', 'the heights again');
        await T.frames(60);
        T.state('arrived');
      }`,
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE on the heights', g.player.map === 'grorudHeights' && g.player.x === 15 && g.player.y === 3 && g.chapter === 3 && g.mode === 'world');
        T.shot('continued');
      },
    ],
  },
  { // the maps themselves: open ground, edges, exits, gates, monsters, and what the HUD might hide
    name: 'grorud-map-audit', save: inTown,
    run: `async (T, g) => {
      ${HUD_CHECK}
      ${WRAP}
      await T.continueGame();
      const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      const tile = (m, x, y, open) => { const gate = m.gates && m.gates[x + ',' + y]; return gate ? (open ? gate.open : gate.closed) : m.rows[y][x]; };
      const walk = (m, x, y, open) => x >= 0 && y >= 0 && x < m.w && y < m.h && !g.SOLID.has(tile(m, x, y, open));
      const reach = (name, sx, sy, open) => {
        const m = g.MAPS[name], seen = new Set([sx + ',' + sy]), todo = [[sx, sy]];
        while (todo.length) {
          const [x, y] = todo.pop();
          if (m.exits[x + ',' + y]) continue;
          for (const [dx, dy] of Object.values(DIRS)) {
            const k = (x + dx) + ',' + (y + dy);
            if (!seen.has(k) && walk(m, x + dx, y + dy, open)) { seen.add(k); todo.push([x + dx, y + dy]); }
          }
        }
        return seen;
      };
      const M = Object.fromEntries(${JSON.stringify(GRORUD_MAPS)}.map((n) => [n, g.MAPS[n]]));
      const size = Object.entries(M).map(([n, m]) => n + ' ' + m.w + 'x' + m.h + (m.rows.every((r) => r.length === m.w) ? '' : ' RAGGED')).join(', ');
      T.check('the heights 30x21, the town 26x18, the Works 24x18, the road 16x10', size === 'grorudHeights 30x21, grorudTown 26x18, grorudWorks 24x18, veitvetRoad 16x10', size);
      const START = { grorudHeights: [15, 3], grorudTown: [12, 3], grorudWorks: [12, 16], veitvetRoad: [1, 5] };
      for (const [name, [sx, sy]] of Object.entries(START)) {
        const m = M[name], seen = reach(name, sx, sy, true), out = [];
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (walk(m, x, y, true) && !seen.has(x + ',' + y)) out.push(x + ',' + y);
        T.check(name + ': all open ground can be reached', out.length === 0, out.join(' '));
      }
      const targets = (m) => JSON.stringify(Object.values(m.exits).map((e) => e.map));
      T.check('the exits: heights to Ammerud and the town; town to the heights, the Works and the road; the Works only back; the road back, and on to Veitvet',
        targets(M.grorudHeights) === '["ammerud","grorudTown","grorudTown"]' && targets(M.grorudTown) === '["grorudHeights","grorudHeights","grorudWorks","veitvetRoad"]'
        && targets(M.grorudWorks) === '["grorudTown"]' && targets(M.veitvetRoad) === '["grorudTown","veitvet"]' && g.MAPS.ammerud.exits['15,21'].map === 'grorudHeights',
        targets(M.grorudHeights) + ' ' + targets(M.grorudTown));
      const landing = [];
      for (const from of [...Object.keys(M), 'ammerud']) for (const [k, e] of Object.entries(g.MAPS[from].exits)) {
        if (!M[e.map] && e.map !== 'ammerud') continue;
        const to = g.MAPS[e.map];
        if (!walk(to, e.x, e.y, true) || to.exits[e.x + ',' + e.y]) landing.push(from + ' ' + k + ' -> ' + e.map + ' ' + e.x + ',' + e.y);
        const back = Object.entries(to.exits).some(([bk, be]) => be.map === from && Math.abs(+bk.split(',')[0] - e.x) + Math.abs(+bk.split(',')[1] - e.y) === 1);
        if (!back) landing.push('no way back from ' + e.map + ' ' + e.x + ',' + e.y);
      }
      T.check('every way in lands on open ground, one step from the way back', landing.length === 0, landing.join('; '));
      const shut = reach('grorudTown', 12, 3, false), open = reach('grorudTown', 12, 3, true);
      T.check('shut, the Works gate and the east gate cannot be walked through; open, they lead on', !shut.has('20,2') && !shut.has('25,9') && open.has('20,2') && open.has('25,9')
        && tile(M.grorudTown, 20, 2, false) === '[' && tile(M.grorudTown, 20, 2, true) === ']' && tile(M.grorudTown, 25, 9, false) === 'G' && tile(M.grorudTown, 25, 9, true) === 'L');
      T.check('the terminal stands beside the gate and lights up with it', tile(M.grorudTown, 18, 3, false) === '+' && tile(M.grorudTown, 18, 3, true) === '@' && g.SOLID.has('+') && g.SOLID.has('@'));
      const road = reach('veitvetRoad', 1, 5, true);
      T.check('the road to Veitvet now runs on into VEITVET: the barricade is gone', g.MAPS.veitvet && Object.keys(g.MAPS).length === 18
        && road.has('15,5') && !M.veitvetRoad.rows.join('').includes('J'));
      T.check('the first POWER CELL lies in the nook west of the stream, reachable from the way in', walk(M.grorudHeights, 2, 7, true) && reach('grorudHeights', 15, 3, true).has('2,7'));
      // monsters
      const zones = (m) => (m.encounter ? m.encounter.zones : []);
      const inZone = (m, x, y) => zones(m).find((z) => x >= z.at[0] && y >= z.at[1] && x <= z.at[2] && y <= z.at[3]);
      const ok = (m) => zones(m).every((z) => z.at[0] >= 0 && z.at[1] >= 0 && z.at[2] < m.w && z.at[3] < m.h && z.table.every((e) => g.ENEMIES[e[0]] && !g.ENEMIES[e[0]].boss) && Math.abs(z.table.reduce((n, e) => n + e[1], 0) - 1) < 1e-9);
      T.check('every zone lies inside its map, its monsters exist, none is a boss, the odds add up', Object.values(M).every(ok));
      const types = (m) => [...new Set(zones(m).flatMap((z) => z.table.map((e) => e[0])))].sort().join();
      T.check('the heights: rust rats, guards, a few scrap golems and old Ammerud faces; the town: rats, guards, golems and the first wisps; the Works: wisps, golems, sentinels and the odd rat',
        types(M.grorudHeights) === 'crawler,guard,rust,scrap,shadow' && types(M.grorudTown) === 'guard,pwisp,rust,scrap' && types(M.grorudWorks) === 'pwisp,rust,scrap,sentinel' && !M.veitvetRoad.encounter,
        types(M.grorudHeights) + ' / ' + types(M.grorudTown) + ' / ' + types(M.grorudWorks));
      const odds = (m, t) => zones(m).map((z) => (z.table.find((e) => e[0] === t) || [t, 0])[1]);
      T.check('the rust rat is the commonest thing on the heights; scrap golems are rare there', zones(M.grorudHeights).every((z) => z.table[0][0] === 'rust' || z.table[1][0] === 'rust') && Math.max(...odds(M.grorudHeights, 'scrap')) <= 0.25);
      T.check('sentinels only in the Works; rats there are rare (one zone, one time in five at most)', Object.values(g.MAPS).every((m) => m === M.grorudWorks || !(m.encounter && m.encounter.zones || []).some((z) => z.table.some((e) => e[0] === 'sentinel')))
        && odds(M.grorudWorks, 'rust').filter((p) => p > 0).length === 1 && Math.max(...odds(M.grorudWorks, 'rust')) <= 0.2);
      T.check('JOAN\\'s yard is mostly scrap golems', zones(M.grorudTown).some((z) => z.at.join() === '17,14,24,16' && z.table[0][0] === 'scrap' && z.table[0][1] >= 0.5));
      T.check('the big golem and NABILAH are never met at random', Object.values(g.MAPS).every((m) => !(m.encounter && m.encounter.zones || []).some((z) => z.table.some((e) => e[0] === 'hulk' || e[0] === 'nabilah'))));
      T.check('every Grorud map picks its own battle backdrop, and the Works its own', M.grorudHeights.backdrop === 'heights' && M.grorudTown.backdrop === 'blocks' && M.grorudWorks.backdrop === 'factory');
      const ways = { grorudHeights: [[15, 2], [15, 3], [14, 20], [15, 20], [14, 19], [15, 19]], grorudTown: [[12, 2], [13, 2], [12, 3], [13, 3], [20, 2], [20, 3], [25, 9], [24, 9]], grorudWorks: [[12, 17], [12, 16]] };
      const near = [];
      for (const [name, list] of Object.entries(ways)) {
        const m = M[name];
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (inZone(m, x, y) && list.some((p) => Math.abs(p[0] - x) + Math.abs(p[1] - y) <= 3)) near.push(name + ' ' + x + ',' + y);
      }
      T.check('no zone within three steps of a way in', near.length === 0, near.join(' '));
      const safe = [];
      for (let y = 3; y <= 12; y++) for (let x = 3; x <= 24; x++) if (inZone(M.grorudTown, x, y)) safe.push('town ' + x + ',' + y);
      for (const [x0, y0, x1, y1] of [[0, 0, 23, 5], [0, 13, 23, 17]]) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inZone(M.grorudWorks, x, y)) safe.push('works ' + x + ',' + y);
      for (let y = 0; y < M.grorudHeights.h; y++) for (let x = 0; x < M.grorudHeights.w; x++) if (M.grorudHeights.rows[y][x] === '=' && inZone(M.grorudHeights, x, y)) safe.push('heights path ' + x + ',' + y);
      T.check('the square and the streets, the way into the Works, the control room, NABILAH\\'s hall and the path down the heights are all safe', safe.length === 0, safe.slice(0, 12).join(' '));
      // nothing that matters hides under the HUD, from anywhere within three steps of it
      const things = [];
      for (const name of Object.keys(M)) {
        const m = M[name];
        things.push(...g.NPCS.filter((n) => n.map === name).map((n) => [n.id, name, n.x, n.y]));
        things.push(...g.ITEMS.filter((i) => i.map === name).map((i) => [i.id, name, i.x, i.y]));
        things.push(...Object.keys(m.signs).map((k) => ['sign ' + k, name, ...k.split(',').map(Number)]));
        things.push(...Object.keys(m.exits).map((k) => ['exit ' + k, name, ...k.split(',').map(Number)]));
        things.push(...Object.keys(m.gates || {}).map((k) => ['gate ' + k, name, ...k.split(',').map(Number)]));
      }
      things.push(['south gate', 'ammerud', 15, 21]);
      const hidden = [];
      for (const [id, map, tx, ty] of things) {
        const m = g.MAPS[map];
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
          if (Math.abs(x - tx) + Math.abs(y - ty) > 3 || !walk(m, x, y, true)) continue;
          if (hiddenFrom(map, x, y, tx, ty)) hidden.push(id + ' (' + map + ') from ' + x + ',' + y);
        }
      }
      T.check('no person, cell, bag, chest, sign, exit or gate of Grorud is ever under the status panel or the tracker', hidden.length === 0, hidden.slice(0, 12).join('; '));
      T.check('every chest, cell and the bag stand on open ground, off the paths out', g.ITEMS.filter((i) => M[i.map]).every((i) => walk(g.MAPS[i.map], i.x, i.y, true) && !g.MAPS[i.map].exits[i.x + ',' + i.y]) && g.ITEMS.filter((i) => M[i.map]).length === 5);
      for (const [name, [sx, sy]] of Object.entries(START)) {
        const m = M[name], people = new Set(g.NPCS.filter((n) => n.map === name).map((n) => n.x + ',' + n.y)), seen = new Set([sx + ',' + sy]), todo = [[sx, sy]];
        while (todo.length) {
          const [x, y] = todo.pop();
          for (const [dx, dy] of Object.values(DIRS)) {
            const k = (x + dx) + ',' + (y + dy);
            if (!seen.has(k) && !people.has(k) && walk(m, x + dx, y + dy, true)) { seen.add(k); todo.push([x + dx, y + dy]); }
          }
        }
        const cut = [];
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (walk(m, x, y, true) && !people.has(x + ',' + y) && !seen.has(x + ',' + y)) cut.push(x + ',' + y);
        T.check(name + ': the people block nobody in', cut.length === 0, cut.join(' '));
      }
      // what the HUD and the log say about the new quests, at every stage, must fit
      const wide = [], keep = JSON.stringify(g.flags), keepYard = JSON.stringify(g.q.yard);
      for (const [c1, c2, c3, open, n] of [[0, 0, 0, 0, 0], [1, 0, 0, 0, 1], [1, 1, 0, 0, 2], [1, 1, 1, 0, 2], [1, 1, 1, 1, 2]]) {
        Object.assign(g.flags, { cell1: !!c1, cell2: !!c2, cell3: !!c3, worksOpen: !!open }); g.q.yard.n = n;
        for (const id of ['power', 'bag', 'yard']) {
          const d = g.QUESTS[id];
          if (d.title.length > 16 || ('NEW QUEST: ' + d.title).length > 28) wide.push(d.title);
          if (d.progress().length > 15) wide.push(d.progress());
          if (d.tracker().length > 16) wide.push(d.tracker());
          if (('SEE ' + d.turnIn + '!').length > 16) wide.push(d.turnIn);
        }
      }
      const restore = JSON.parse(keep); for (const k of Object.keys(g.flags)) delete g.flags[k]; Object.assign(g.flags, restore); Object.assign(g.q.yard, JSON.parse(keepYard));
      T.check('every new quest title, log line and tracker fits', wide.length === 0, wide.join(' | '));
      const gear = [['weapon', 'wrench'], ['weapon', 'blade'], ['armor', 'insulated'], ['armor', 'factory']].map(([k, id]) => (k === 'weapon' ? g.WEAPONS : g.ARMORS)[id]);
      T.check('new gear names fit inside the status panel (10 letters) and the gear list (14), and what the menu says about them fits in three lines',
        gear.every((it) => it.name.length <= 10 && (it.full || it.name).length <= 14 && wrap(it.desc, 16).length <= 3), gear.map((it) => it.name + ' / ' + it.full + ': ' + wrap(it.desc, 16).join('/')).join(' | '));
      T.check('the new gear: wrench ATK +8 heavy, blade ATK +7 nimble and keen, insulated vest DEF +3 taking 40 percent off shocks, factory armour DEF +6',
        JSON.stringify([g.WEAPONS.wrench.atk, !!g.WEAPONS.wrench.heavy, g.WEAPONS.blade.atk, !!g.WEAPONS.blade.nimble, !!g.WEAPONS.blade.keen, g.ARMORS.insulated.def, g.ARMORS.insulated.insulated, g.ARMORS.factory.def, !!g.ARMORS.factory.insulated])
          === '[8,true,7,true,true,3,0.4,6,false]');
      T.check('the old gear is as it was', JSON.stringify(['none', 'iron', 'crystal', 'axe', 'bat'].map((k) => [g.WEAPONS[k].atk, !!g.WEAPONS[k].heavy, !!g.WEAPONS[k].nimble, !!g.WEAPONS[k].keen])) === '[[0,false,false,false],[3,false,false,false],[7,false,false,false],[2,true,false,false],[9,false,false,false]]'
        && JSON.stringify(['none', 'vest', 'light', 'sneakers', 'rvest'].map((k) => [g.ARMORS[k].def, !!g.ARMORS[k].nimble, !!g.ARMORS[k].insulated])) === '[[0,false,false],[2,false,false],[1,true,false],[3,true,false],[4,false,false]]');
      T.check('the Ammerud enemies and MARCUS are as they were, and none of the old ones is electric', JSON.stringify(['crawler', 'shadow', 'brute', 'wisp', 'glowwisp', 'marcus'].map((k) => [g.ENEMIES[k].hp, g.ENEMIES[k].atk, g.ENEMIES[k].def, g.ENEMIES[k].xp]))
        === '[[58,25,7,34],[40,29,4,32],[84,25,12,48],[50,27,6,40],[110,28,8,90],[180,26,9,150]]' && Object.keys(g.ENEMIES).filter((k) => g.ENEMIES[k].shock).join() === 'pwisp');
      T.check('Grorud ends with POWER TO GRORUD, and Veitvet comes next', JSON.stringify(g.CHAPTERS.slice(3, 5)) === '[{"name":"GRORUD","quest":"power"},{"name":"VEITVET","quest":"signal"}]');
      T.check('the Grorud quests follow the Ammerud ones, and the Veitvet ones follow them', g.QUEST_ORDER.join().startsWith('slimes,biscuit,glowcap,king,shards,road,cart,under,mohsin,kebab,trouble,ball,wisp,power,bag,yard,'), g.QUEST_ORDER.join());
    }`,
  },
  { // each of Grorud's monsters, met for certain on a chosen tile, and what the gear does against them
    name: 'grorud-enemies', save: inTown,
    run: `async (T, g) => {
      ${MEET}
      await T.continueGame();
      const want = { rust: [48, 27, 5, 30], guard: [64, 28, 8, 38], scrap: [70, 32, 15, 50], pwisp: [44, 30, 5, 40], sentinel: [96, 31, 11, 60], hulk: [120, 33, 16, 85] };
      const stats = (b) => JSON.stringify([b.max, b.atk, b.def, b.xp]);
      const full = () => { g.player.hp = g.player.maxhp; };
      // hero LV11: ATK 26 + 9 with MARCUS' bat, DEF 11 + 2 in the Tough Vest
      g.player.armor = 'vest'; full();
      await meet(5, 15, 'down', 0, 'grorudHeights');
      let b = g.battle;
      T.check('a rust rat on the heights, by its name and with the heights behind it', b.type === 'rust' && b.name === 'RUST RAT' && stats(b) === JSON.stringify(want.rust) && !b.boss && b.backdrop === 'heights', b.type + ' ' + stats(b));
      const bite = g.player.maxhp - g.player.hp;
      T.check('quick: it bit first through the Tough Vest', bite >= 14 && bite <= 16 && b.turn === 0, bite);
      T.shot('rust');
      T.check("MARCUS' bat: 31", await swing() === 31);
      await T.fight(cautious);
      g.player.weapons.push('blade'); g.player.weapon = 'blade'; full();
      await meet(5, 15, 'down', 0, 'grorudHeights');
      T.check('with the QUICK BLADE it gets no opening bite', g.player.hp === g.player.maxhp && g.battle.type === 'rust', g.player.hp);
      T.check('quick blade: 29', await swing() === 29);
      await T.fight(cautious);
      g.player.weapon = 'bat'; g.player.armor = 'sneakers'; full();
      await meet(24, 8, 'down', 0, 'grorudHeights');
      b = g.battle;
      T.check('a grorud guard on the east plateau', b.type === 'guard' && b.name === 'GRORUD GUARD' && stats(b) === JSON.stringify(want.guard), b.type + ' ' + stats(b));
      T.check('it waits for the hero', g.player.hp === g.player.maxhp && b.turn === 0);
      T.shot('guard');
      T.check('bat: 28', await swing() === 28);
      await T.fight(cautious);
      // the scrap golem in JOAN's yard: the wrench cracks its armour, the bat does not
      g.player.weapons.push('wrench'); g.player.weapon = 'wrench'; full();
      await meet(20, 15, 'down', 0, 'grorudTown');
      b = g.battle;
      T.check('a scrap golem in the yard, with the town behind it', b.type === 'scrap' && b.name === 'SCRAP GOLEM' && stats(b) === JSON.stringify(want.scrap) && b.backdrop === 'blocks', b.type + ' ' + stats(b));
      T.shot('scrap');
      T.check('the heavy wrench straight through its armour: 35', await swing() === 35);
      await T.until(() => /cracks right through/.test(b.msg) && b.shown >= b.msg.length, 'the wrench line');
      T.shot('wrench-smash');
      const before = g.player.hp;
      await T.until(() => b.phase === 'menu', 'the battle menu');
      T.check('slow: on its first turn it only creaks', g.player.hp === before && b.turn === 1, g.player.hp + ' ' + before);
      await T.fight(cautious);
      g.player.weapon = 'bat'; full();
      await meet(20, 15, 'down', 0, 'grorudTown');
      T.check("MARCUS' bat against its armour: 21", await swing() === 21);
      await T.until(() => /armour turns/.test(g.battle.msg), 'the armour line');
      await T.fight(cautious);
      // the power wisp: quick and electric; the insulated vest halves its shocks
      g.player.armor = 'vest'; full();
      await meet(20, 15, 'down', 0.6, 'grorudTown');
      b = g.battle;
      T.check('a power wisp', b.type === 'pwisp' && b.name === 'POWER WISP' && stats(b) === JSON.stringify(want.pwisp), b.type + ' ' + stats(b));
      const zap = g.player.maxhp - g.player.hp;
      T.check('quick and electric: it zapped first, through the Tough Vest', zap >= 17 && zap <= 19, zap);
      T.shot('pwisp');
      T.check('bat: 31', await swing() === 31);
      await T.until(() => b.zap > 0 && b.zap <= 14, 'the zap');
      T.shot('pwisp-zap');
      await T.fight(cautious);
      g.player.armors.push('insulated'); g.player.armor = 'insulated'; full();
      await meet(20, 15, 'down', 0.6, 'grorudTown');
      const soft = g.player.maxhp - g.player.hp;
      T.check('in the INSULATED VEST the same zap loses 40 percent (16..18 through its DEF, then 10..11)', soft >= 10 && soft <= 11 && g.battle.insulatedSaid === true, soft);
      await T.fight(cautious);
      // the factory sentinel, only in the Works
      g.player.armor = 'sneakers'; g.player.weapon = 'bat'; full();
      await meet(4, 10, 'down', 0.9, 'grorudWorks');
      b = g.battle;
      T.check('a factory sentinel, with the factory behind it', b.type === 'sentinel' && b.name === 'FACTORY SENTINEL' && stats(b) === JSON.stringify(want.sentinel) && b.backdrop === 'factory', b.type + ' ' + stats(b));
      T.shot('sentinel');
      T.check("MARCUS' bat against its armour: 25", await swing() === 25);
      await T.until(() => b.phase === 'menu', 'the battle menu');
      g.player.weapon = 'wrench';
      T.check('the wrench: 35', await swing() === 35);
      await T.fight(cautious);
      // the big scrap golem: not a boss, so the hero can back off
      g.player.weapon = 'bat'; full();
      T.place('grorudHeights', 26, 5, 'up');
      await T.talk('hulk');
      await T.untilBattle();
      b = g.battle;
      T.check('the BIG SCRAP GOLEM: tougher than any wanderer, armoured, but no boss', b.type === 'hulk' && b.name === 'BIG SCRAP GOLEM' && stats(b) === JSON.stringify(want.hulk) && !b.boss, b.type + ' ' + stats(b));
      T.shot('hulk');
      await T.fight(() => 2);
      T.check('running away: it is still there, with its cell', g.mode === 'world' && g.NPCS.find((n) => n.id === 'hulk').visible() && !g.flags.cell2);
      T.check('nothing counted for quests nobody gave, still LV11', g.q.yard.n === 0 && g.q.power.s === 0 && g.player.lvl === 11 && g.stats.won === 98, g.stats.won + ' ' + g.player.lvl);
      T.state('after');
    }`,
  },
  { // POWER TO GRORUD in the order NAWAL suggests: the cell on the heights, the big golem, then JOAN
    name: 'grorud-power', save: moved(chapterThreeDone, 'grorudTown', 19, 4, 'up'),
    run: [
      `async (T, g) => {
        ${GR}
        await T.continueGame();
        quiet();
        let said = await hear('offer');
        T.check('POWER TO GRORUD: accepted, tracked and saved', g.q.power.s === 1 && g.tracked === 'power' && saved().q.power.s === 1);
        T.check('TOBIAS explains it: no power, NABILAH inside, three POWER CELLS', /lost its power/.test(said) && /NABILAH/.test(said) && /three POWER CELLS/.test(said), said);
        T.shot('tracker');
        await T.tap('KeyX', 6);
        T.check('the log opens on page 3, on the new quest', g.menuPage === 2, g.menuPage);
        T.shot('log');
        await T.tap('KeyX', 6);
        said = await hear('count');
        T.check('he gives the count', /0 of 3/.test(said), said);
        T.place('grorudTown', 10, 9, 'up');
        said = await hear('nawal');
        T.check('NAWAL: where the first cell lies, the big golem, and how to beat scrap armour', /west of the stream/.test(said) && /BIG SCRAP GOLEM/.test(said) && /heavy tool/.test(said), said);
        T.check('she starts nothing and gives nothing', g.q.power.s === 1 && g.q.bag.s === 0 && g.q.yard.s === 0 && !g.flags.cell1);
        T.place('grorudHeights', 1, 4, 'down');
        await T.frames(20);
        T.shot('nook');
        await T.step('down', 3); await T.step('right');
        T.check('found by walking onto it', g.mode === 'dialog' && g.player.x === 2 && g.player.y === 7, g.mode + ' ' + g.player.x + ',' + g.player.y);
        T.check('it says what it is', /POWER CELL! \\(1\\/3\\)/.test(g.dlg.pages[0].join(' ')), g.dlg.pages[0].join(' '));
        await T.dialog('cell1');
        T.check('one cell, counted and saved', g.flags.cell1 === true && saved().flags.cell1 === true && g.q.power.s === 1);
        await T.step('left'); await T.step('right');
        T.check('it lay there only once', g.mode === 'world');
        await T.step('left'); await T.step('up', 3);
        T.check('and out of the nook the way in', g.player.x === 1 && g.player.y === 4, g.player.x + ',' + g.player.y);
        T.shot('tracker-1');
      }`,
      `async (T, g) => {
        ${GRX}
        ${MEET}
        ${WATCH}
        await T.continueGame();
        T.check('CONTINUE: one cell', g.flags.cell1 === true && g.q.power.s === 1 && !g.flags.cell2 && !g.flags.cell3);
        T.place('grorudHeights', 26, 5, 'up');
        await T.frames(20);
        T.shot('hulk');
        await T.talk('hulk');
        await T.untilBattle();
        const { seen } = await watchFight(50, [['cell', /POWER CELL rolls out/]]);
        T.check('beaten: the second cell rolls out, once, and is saved', seen.cell === 1 && g.flags.cell2 === true && saved().flags.cell2 === true, JSON.stringify(seen));
        T.check('the big golem is gone for good', !g.NPCS.find((n) => n.id === 'hulk').visible());
        await T.tap('Space', 6);
        T.check('nothing left there to talk to', g.mode === 'world');
        T.place('grorudTown', 20, 11, 'down');
        let said = await hear('joan-offer');
        T.check("JOAN'S YARD: accepted and saved; two golems wanted", g.q.yard.s === 1 && saved().q.yard.s === 1 && g.q.yard.n === 0 && /Beat 2/.test(said), said);
        said = await hear();
        T.check('she gives the count', /0 of 2/.test(said), said);
        for (let i = 1; i <= 2; i++) {
          g.player.hp = g.player.maxhp;
          await meet(20, 15, 'down', 0, 'grorudTown');
          await T.fight(cautious);
          T.check('golem ' + i + ' counted and saved', g.q.yard.n === i && saved().q.yard.n === i, g.q.yard.n);
        }
        T.check('the yard is ready for JOAN, and tracked', g.q.yard.s === 2 && g.tracked === 'yard' && saved().q.yard.s === 2);
        g.player.hp = g.player.maxhp;
        await meet(20, 15, 'down', 0, 'grorudTown');
        await T.fight(cautious);
        T.check('a third golem does not count', g.q.yard.n === 2);
        T.shot('tracker-yard');
      }`,
      `async (T, g) => {
        ${GR}
        await T.continueGame();
        quiet();
        T.check('CONTINUE: two cells, the yard ready', g.flags.cell1 && g.flags.cell2 && !g.flags.cell3 && g.q.yard.s === 2);
        T.place('grorudTown', 20, 11, 'down');
        await T.talk('joan-reward');
        T.check('the third cell, once; the yard done; both saved', g.flags.cell3 === true && g.q.yard.s === 3 && saved().flags.cell3 === true && saved().q.yard.s === 3);
        await T.talk('joan-after');
        T.check('nothing more from JOAN', g.mode === 'world' && g.q.yard.s === 3);
        T.shot('tracker-3');
        T.place('grorudTown', 10, 9, 'up');
        let said = await hear('nawal-3');
        T.check('NAWAL sends the hero to TOBIAS', /Hurry over to TOBIAS/.test(said), said);
        T.place('grorudTown', 18, 4, 'up');
        said = await hear('terminal');
        T.check('the terminal says TOBIAS knows how', /TOBIAS knows/.test(said) && !g.flags.worksOpen, said);
        T.place('grorudTown', 19, 4, 'up');
        T.check('TOBIAS has a mark', g.NPCS.find((n) => n.id === 'tobias').news());
        let flash = false;
        await T.tap('Space', 3);
        for (let i = 0; g.mode === 'dialog' && i < 40; i++) {
          if (g.flags.worksOpen && !flash) {
            await T.until(() => g.powerT > 0 && Math.floor(g.powerT / 5) % 2 === 0, 'the lights');
            T.shot('power-on');
            flash = true;
          }
          await T.frames(150);
          T.shot('install-p' + (i + 1));
          await T.tap('Space', 3);
        }
        await T.frames(10);
        T.check('the lights flickered on', flash);
        T.check('the Works gate is open and the terminal lit, saved', g.flags.worksOpen === true && saved().flags.worksOpen === true);
        T.check('the quest runs on, with NABILAH next', g.q.power.s === 1 && g.mode === 'world' && g.tracked === 'power');
        T.shot('gate-open');
        T.place('grorudTown', 20, 3, 'up');
        await T.step('up');
        await T.until(() => g.player.map === 'grorudWorks', 'the Works');
        await T.frames(20);
        T.shot('works');
        await T.frames(40);
        T.check('into OLD GRORUD WORKS, autosaved', g.player.x === 12 && g.player.y === 16 && g.player.dir === 'up' && saved().player.map === 'grorudWorks', g.player.x + ',' + g.player.y);
        T.place('grorudWorks', 12, 16, 'down');
        await T.step('down');
        await T.until(() => g.player.map === 'grorudTown', 'back to town');
        await T.frames(60);
        T.check('and back out, in front of the gate', g.player.x === 20 && g.player.y === 3 && g.player.dir === 'down', g.player.x + ',' + g.player.y);
        T.state('powered');
      }`,
      `async (T, g) => {
        ${GR}
        await T.continueGame();
        T.check('CONTINUE: the gate stays open, the cells stay installed', g.flags.worksOpen === true && g.flags.cell1 && g.flags.cell2 && g.flags.cell3 && g.q.power.s === 1);
        T.place('grorudTown', 19, 4, 'up');
        let said = await hear('tobias-after');
        T.check('TOBIAS sends the hero in, and installs nothing twice', /deep inside the WORKS/.test(said) && g.mode === 'world', said);
        T.place('grorudTown', 10, 9, 'up');
        said = await hear('nawal-works');
        T.check('NAWAL warns about the wisps and the POWER SURGE', /POWER WISPS/.test(said) && /POWER SURGE/.test(said), said);
        T.place('grorudTown', 20, 3, 'up');
        await T.step('up');
        await T.until(() => g.player.map === 'grorudWorks', 'the Works');
        await T.frames(60);
        T.check('the gate still lets the hero through', g.player.map === 'grorudWorks');
      }`,
    ],
  },
  { // the cells in another order: JOAN's first, then the one on the heights before TOBIAS asks, then the golem
    name: 'grorud-power-any-order', save: moved(chapterThreeDone, 'grorudTown', 20, 11, 'down'),
    run: [
      `async (T, g) => {
        ${GRX}
        ${MEET}
        await T.continueGame();
        await T.talk('joan-offer');
        T.check('JOAN asks even before TOBIAS does', g.q.yard.s === 1 && g.q.power.s === 0);
        for (let i = 0; i < 2; i++) { g.player.hp = g.player.maxhp; await meet(20, 15, 'down', 0, 'grorudTown'); await T.fight(cautious); }
        T.place('grorudTown', 20, 11, 'down');
        await T.talk('joan-reward');
        T.check('the third cell first, before anybody asked for cells', g.flags.cell3 === true && g.q.yard.s === 3 && g.q.power.s === 0 && saved().flags.cell3 === true);
        g.MAPS.grorudHeights.encounter.chance = 0;
        T.place('grorudHeights', 1, 6, 'down');
        await T.step('down'); await T.step('right');
        T.check('the first cell, found before TOBIAS asked', g.mode === 'dialog' && /Somebody in GRORUD must be missing this/.test(g.dlg.pages[0].join(' ')), g.mode);
        await T.dialog('early');
        T.check('kept and saved, and no quest started by it', g.flags.cell1 === true && saved().flags.cell1 === true && g.q.power.s === 0);
        T.place('grorudTown', 19, 4, 'up');
        let said = await hear('offer');
        T.check('TOBIAS counts the two the hero already has', /already have 2/.test(said) && g.q.power.s === 1 && !g.flags.worksOpen, said);
        T.shot('tracker-2');
      }`,
      `async (T, g) => {
        ${GR}
        ${WATCH}
        await T.continueGame();
        T.check('CONTINUE: two cells, quest running', g.q.power.s === 1 && g.flags.cell1 && g.flags.cell3 && !g.flags.cell2);
        T.place('grorudHeights', 26, 5, 'up');
        await T.talk();
        await T.untilBattle();
        await watchFight(50, []);
        T.check('the last cell from the big golem', g.flags.cell2 === true);
        T.place('grorudTown', 19, 4, 'up');
        await hear();
        T.check('TOBIAS hooks them up: the gate is open, whatever the order', g.flags.worksOpen === true && saved().flags.worksOpen === true && g.q.power.s === 1);
      }`,
    ],
  },
  { // all three cells before TOBIAS has said a word: he takes the job and hooks them up in one go
    name: 'grorud-power-all-at-once', save: withCells(moved(chapterThreeDone, 'grorudTown', 19, 4, 'up'), 0, ['cell1', 'cell2', 'cell3']),
    run: `async (T, g) => {
      ${GR}
      await T.continueGame();
      T.check('three cells, no quest, the gate shut', g.q.power.s === 0 && !g.flags.worksOpen);
      const said = await hear();
      T.check('accepted, and installed straight away', /already have 3/.test(said) && /We have POWER/.test(said) && g.q.power.s === 1 && g.flags.worksOpen === true && saved().flags.worksOpen === true, said);
    }`,
  },
  { // the Works gate opens only through TOBIAS; cells in the pack, or the quest started, are not enough
    name: 'grorud-gate-guards', save: withCells(moved(chapterThreeDone, 'grorudTown', 20, 3, 'up'), 0, ['cell1', 'cell2', 'cell3']),
    run: [
      `async (T, g) => {
        ${GR}
        await T.continueGame();
        let said = await hear('locked');
        await T.step('up');
        T.check('three cells but no quest: the gate is shut and stays shut', g.player.map === 'grorudTown' && g.player.y === 3 && !g.flags.worksOpen && /power is off/.test(said), said);
        T.place('grorudTown', 18, 4, 'up');
        said = await hear();
        T.check('the terminal does not take them by itself', /TOBIAS knows/.test(said) && !g.flags.worksOpen, said);
        const d = saved(); d.q.power = { s: 1 }; delete d.flags.cell2; Object.assign(d.player, { x: 20, y: 3, fx: 20, fy: 3, tx: 20, ty: 3, dir: 'up' }); localStorage.setItem(KEY, JSON.stringify(d));
      }`,
      `async (T, g) => {
        ${GR}
        await T.continueGame();
        const said = await hear('two-cells');
        await T.step('up');
        T.check('two cells and the quest: still shut, and it says how many are missing', g.player.y === 3 && !g.flags.worksOpen && /You have 2/.test(said), said);
        T.place('grorudTown', 24, 9, 'right');
        const d = saved(); d.flags.factoryKey = true; Object.assign(d.player, { x: 24, y: 9, fx: 24, fy: 9, tx: 24, ty: 9, dir: 'right', map: 'grorudTown' }); localStorage.setItem(KEY, JSON.stringify(d));
      }`,
      `async (T, g) => {
        ${GR}
        await T.continueGame();
        const said = await hear('key-too-early');
        await T.step('right');
        T.check('the FACTORY KEY alone does not open the east gate before TOBIAS has heard', g.player.x === 24 && !g.flags.veitvetGate && /TOBIAS will want/.test(said), said);
      }`,
    ],
  },
  { // HONEY's bag, with a reload after finding it and after handing it back
    name: 'grorud-honey', save: moved(chapterThreeDone, 'grorudTown', 7, 4, 'up'),
    run: [
      `async (T, g) => {
        ${GR}
        await T.continueGame();
        quiet();
        T.shot('honey');
        let said = await hear('offer');
        T.check("HONEY'S BAG: accepted and saved", g.q.bag.s === 1 && saved().q.bag.s === 1 && g.tracked === 'bag', said);
        said = await hear('hint');
        T.check('she says where to look', /south-west/.test(said), said);
        T.place('grorudHeights', 5, 16, 'down');
        await T.frames(20);
        T.shot('bag');
        await T.step('down');
        T.check('found by walking onto it', g.mode === 'dialog' && g.player.y === 17 && /Take it back to HONEY/.test(g.dlg.pages[g.dlg.pages.length - 1].join(' ')), g.mode);
        await T.dialog('found');
        T.check('ready and saved', g.q.bag.s === 2 && g.flags.bag === true && saved().q.bag.s === 2 && saved().flags.bag === true);
        await T.step('up'); await T.step('down');
        T.check('only one bag', g.mode === 'world');
      }`,
      `async (T, g) => {
        ${GR}
        await T.continueGame();
        T.check('CONTINUE: the bag is carried, not lying on the heights', g.q.bag.s === 2 && g.flags.bag === true);
        T.place('grorudTown', 7, 4, 'up');
        const said = await hear('return');
        T.check('the INSULATED VEST, owned once, not put on by itself; quest done and saved', g.player.armors.filter((a) => a === 'insulated').length === 1 && g.player.armor === 'sneakers' && g.q.bag.s === 3
          && saved().q.bag.s === 3 && saved().player.armors.includes('insulated') && /INSULATED VEST/.test(said), said);
        await T.talk('after'); await T.talk('after-2');
        T.check('no second vest', g.player.armors.filter((a) => a === 'insulated').length === 1);
        await T.tap('KeyX', 6);
        await T.tap('ArrowUp', 4); await T.tap('ArrowUp', 4);
        T.check('the cursor reaches the armour line', g.menuSel === 1, g.menuSel);
        await T.tap('Space', 4);
        T.check('put on from the menu', g.player.armor === 'insulated', g.player.armor);
        T.shot('vest');
        await T.tap('ArrowDown', 4); await T.tap('ArrowDown', 4); await T.tap('Space', 6); await T.tap('KeyX', 6);
      }`,
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE in the insulated vest, every old armour kept', g.player.armor === 'insulated' && JSON.stringify(g.player.armors) === '["none","vest","sneakers","insulated"]' && g.q.bag.s === 3);
        T.state('done');
      },
    ],
  },
  { // the bag found before HONEY asks: she thanks the hero at once, and the vest is still given only once
    name: 'grorud-honey-early', save: moved(chapterThreeDone, 'grorudHeights', 5, 16, 'down'),
    run: `async (T, g) => {
      ${GR}
      await T.continueGame();
      quiet();
      await T.step('down');
      T.check('it lies there before anybody asks, and says so', g.mode === 'dialog' && /must be missing this/.test(g.dlg.pages[g.dlg.pages.length - 1].join(' ')));
      await T.dialog('early');
      T.check('carried, saved, no quest started', g.flags.bag === true && saved().flags.bag === true && g.q.bag.s === 0);
      T.place('grorudTown', 7, 4, 'up');
      T.check('HONEY has a mark', g.NPCS.find((n) => n.id === 'honey').news());
      const said = await hear('honey');
      T.check('she recognises it, and the quest is done in one go', /before I even asked/.test(said) && g.q.bag.s === 3 && g.player.armors.filter((a) => a === 'insulated').length === 1 && saved().q.bag.s === 3, said);
      await T.talk();
      T.check('no second vest', g.player.armors.filter((a) => a === 'insulated').length === 1);
    }`,
  },
  { // the three chests, each opened once, and the status screen with seven weapons
    name: 'grorud-chests', save: (() => { const d = JSON.parse(JSON.stringify(inTown)); d.player.weapons = ['none', 'iron', 'crystal', 'axe', 'bat']; d.flags.chestAxe = true; return d; })(),
    run: [
      `async (T, g) => {
        ${GR}
        await T.continueGame();
        quiet();
        T.place('grorudHeights', 28, 16, 'down');
        await T.frames(20);
        T.shot('wrench-chest');
        await T.step('down');
        T.check('the wrench chest, by the full name of what is in it', g.mode === 'dialog' && /HEAVY WRENCH/.test(g.dlg.pages[0].join(' ')), g.mode);
        await T.dialog('wrench');
        T.check('the HEAVY WRENCH is owned, not worn', g.player.weapons.includes('wrench') && g.player.weapon === 'bat' && g.flags.chestWrench === true);
        await T.step('up'); await T.step('down');
        T.check('opened once', g.mode === 'world' && g.player.weapons.filter((w) => w === 'wrench').length === 1);
        T.place('grorudTown', 1, 15, 'down');
        await T.frames(20);
        T.shot('blade-chest');
        await T.step('down');
        await T.dialog('blade');
        T.check('the QUICK BLADE', g.player.weapons.includes('blade') && g.flags.chestBlade === true);
        T.place('grorudWorks', 22, 10, 'down');
        await T.frames(20);
        T.shot('armor-chest');
        await T.step('down');
        T.check('the armour chest, by its full name', g.mode === 'dialog' && /FACTORY ARMOR/.test(g.dlg.pages[0].join(' ')));
        await T.dialog('armor');
        T.check('the FACTORY ARMOR', g.player.armors.includes('factory') && g.flags.chestArmor === true);
        T.check('all saved', ['chestWrench', 'chestBlade', 'chestArmor'].every((k) => saved().flags[k] === true) && saved().player.weapons.length === 7);
        await T.tap('KeyX', 6);
        await T.tap('ArrowUp', 4); await T.tap('ArrowUp', 4); await T.tap('ArrowUp', 4);
        T.check('the cursor reaches the weapon line', g.menuSel === 0, g.menuSel);
        T.shot('weapons-bat');
        const order = [];
        for (let i = 0; i < 7; i++) { await T.tap('Space', 4); order.push(g.player.weapon); if (i === 0) T.shot('weapons-wrench'); if (i === 2) T.shot('weapons-stick'); }
        T.check('seven weapons, cycled in order and back round', order.join() === 'wrench,blade,none,iron,crystal,axe,bat', order.join());
        await T.tap('Space', 4);
        T.check('the wrench in hand', g.player.weapon === 'wrench');
        await T.tap('ArrowDown', 4);
        await T.tap('Space', 4);
        T.check('the factory armour on', g.player.armor === 'factory', g.player.armor);
        T.shot('armour-factory');
        await T.tap('ArrowDown', 4); await T.tap('ArrowDown', 4); await T.tap('Space', 6);
        T.check('SAVED!', g.menuNote && g.menuNote.text === 'SAVED!' && saved().player.weapon === 'wrench' && saved().player.armor === 'factory');
        await T.tap('KeyX', 6);
      }`,
      `async (T, g) => {
        ${GR}
        await T.continueGame();
        T.check('CONTINUE: wrench and factory armour on, all seven weapons and four armours kept', g.player.weapon === 'wrench' && g.player.armor === 'factory' && g.player.weapons.length === 7 && JSON.stringify(g.player.armors) === '["none","vest","sneakers","factory"]');
        T.check('DEF 11 + 6, ATK 26 + 8', g.player.def + g.ARMORS[g.player.armor].def === 17 && g.player.atk + g.WEAPONS[g.player.weapon].atk === 34);
        T.check('no chest comes back', g.ITEMS.filter((i) => i.chest && i.map.startsWith('grorud')).every((i) => g.flags[i.id]));
        await T.menuShot('status');
        T.state('after');
      }`,
    ],
  },
];
// The whole meeting with NABILAH: the talk, the fight (an herb below HEAL HP), the hand-over, and nothing twice.
const NABILAH = `async (T, g) => {
  ${GR}
  ${WATCH}
  await T.continueGame();
  const gold = g.player.gold, xp = g.player.xp, won = g.stats.won, herbs = g.player.herbs, weapons = g.player.weapons.slice(), armors = g.player.armors.slice();
  T.check('NABILAH waits in her hall, right in front of the hero', g.NPCS.some((n) => n.id === 'nabilah' && n.map === 'grorudWorks' && n.x === 12 && n.y === 2 && !n.visible) && g.player.x === 12 && g.player.y === 3);
  if (TALK) { T.shot('hall'); }
  await hear(TALK ? 'before' : '');
  await T.untilBattle();
  const b = g.battle;
  T.check('NABILAH: 250 HP, ATK 30, DEF 10, a boss', b.type === 'nabilah' && b.name === 'NABILAH' && b.boss === true && b.max === 250 && b.atk === 30 && b.def === 10 && b.xp === 190, JSON.stringify([b.max, b.atk, b.def, b.xp]));
  if (TALK) T.shot('battle');
  let surgeAt = null, glowing = false, defAfter = null, shotSurge = false, shotPhase2 = false;
  const { turns, seen } = await watchFight(HEAL, [['wrench', /giant wrench/], ['spark', /flicks a spark/], ['tune', /hums a tune/], ['surge', /POWER SURGE/], ['drops', /guard drops/],
    ['plug', /plugs into the wall/], ['overload', /OVERLOAD/], ['bolt', /bolt of lightning/], ['soak', /soaks up/], ['defeated', /power down/]], () => {
    if (b.surge && surgeAt === null) { surgeAt = b.hp; glowing = b.look === 'nabilah2'; defAfter = b.def; }
    if (TALK && b.surge && !shotSurge && b.msg === 'POWER SURGE!!' && b.shown >= b.msg.length && b.zap > 0 && Math.floor(b.zap / 3) % 2 === 0) { shotSurge = true; T.shot('power-surge'); }
    if (TALK && b.surge && !shotPhase2 && b.phase === 'busy' && /bolt of lightning/.test(b.msg) && b.shown >= b.msg.length) { shotPhase2 = true; T.shot('phase-2'); }
  });
  T.check('POWER SURGE exactly once, at half HP or below: she glows, her guard drops to 7', seen.surge === 1 && seen.drops === 1 && surgeAt !== null && surgeAt <= 125 && glowing && defAfter === 7, JSON.stringify(seen) + ' ' + surgeAt + ' ' + defAfter);
  T.check('the whole pattern was seen', seen.wrench >= 1 && seen.spark >= 1 && seen.tune >= 1 && seen.plug >= 1 && seen.bolt >= 1, JSON.stringify(seen));
  T.check('every OVERLOAD was warned of first', (seen.overload || 0) <= seen.plug, JSON.stringify(seen));
  T.check('the insulated vest speaks up once, and only when worn', (seen.soak || 0) === (g.player.armor === 'insulated' ? 1 : 0), JSON.stringify(seen));
  T.check('beaten', seen.defeated === 1 && g.stats.won === won + 1 && g.player.hp > 0, g.mode + ' ' + g.player.hp);
  await T.until(() => g.mode === 'dialog', 'NABILAH to speak');
  T.check('beaten is saved before anything is handed over', saved().flags.nabilahBeaten === true && !saved().flags.factoryKey && !saved().flags.fragment3 && saved().q.power.s === 1);
  T.check('nothing yet', !g.flags.factoryKey && !g.flags.fragment3 && g.q.power.s === 1 && g.dlg.name === 'NABILAH');
  await T.dialog(TALK ? 'handover' : '');
  T.check('CRYSTAL FRAGMENT 3 and the FACTORY KEY, saved', g.flags.fragment3 === true && g.flags.factoryKey === true && saved().flags.fragment3 === true && saved().flags.factoryKey === true);
  T.check('three Crystal Fragments now', Object.keys(g.flags).filter((k) => /^fragment\\d+$/.test(k) && g.flags[k]).length === 3);
  T.check('the quest is ready for TOBIAS, and the chapter is not over', g.q.power.s === 2 && g.tracked === 'power' && saved().q.power.s === 2 && g.chapter === 3 && g.mode === 'world');
  T.check('190 XP and 180 gold', g.player.xp + (g.player.lvl > LVL ? NEXT : 0) === xp + 190 && g.player.gold === gold + 180, g.player.xp + ' ' + (g.player.gold - gold));
  T.check('every weapon and armour owned before is kept, and what was worn is still worn', weapons.every((w) => g.player.weapons.includes(w)) && armors.every((a) => g.player.armors.includes(a)) && g.player.weapon === WEAPON && g.player.armor === ARMOR);
  T.check('a fair fight', turns <= LIMIT[0] && herbs - g.player.herbs <= LIMIT[1], turns + ' turns, ' + (herbs - g.player.herbs) + ' herbs, ' + g.player.hp + ' HP left');
  if (TALK) { T.shot('tracker'); await T.menuShot('status'); }
  const flags = JSON.stringify(g.flags);
  await hear(TALK ? 'after' : ''); await hear(TALK ? 'after-2' : '');
  T.check('she only talks now, and gives nothing twice', g.mode === 'world' && g.stats.won === won + 1 && JSON.stringify(g.flags) === flags);
  T.state('beaten');
}`;
const nabilahFight = (fix, { turns, herbs, heal = 55, talk = false }) => NABILAH.replace(/LIMIT/g, `[${turns}, ${herbs}]`).replace('HEAL', String(heal))
  .replace(/TALK/g, String(talk)).replace('WEAPON', `'${fix.player.weapon}'`).replace('ARMOR', `'${fix.player.armor}'`)
  .replace('LVL', String(fix.player.lvl)).replace('NEXT', String(fix.player.next));
const atNabilahIn = (weapon, armor) => dressed(atNabilah, weapon, armor);
const nabilahScenarios = [
  // Measured, with the fixed dice (MARCUS for comparison: 11 turns and 3 herbs with the usual gear, 16 and 6
  // for the weakest sensible hero). The limits leave the same room as MARCUS' tests do.
  //   wrench + insulated vest 13 turns, 3 herbs | wrench + factory armour 15, 5 | bat + sneakers 16, 6
  //   modest LV11 15, 6 (of 6) | LV10 in the Tough Vest 17, 7 (of 7) | LV13 with everything 9, 1
  { name: 'grorud-nabilah', save: atNabilahIn('wrench', 'insulated'), run: nabilahFight(atNabilahIn('wrench', 'insulated'), { turns: 15, herbs: 4, talk: true }) },
  { name: 'grorud-nabilah-celine', save: withHero(atNabilahIn('wrench', 'insulated'), 'celine'), run: nabilahFight(atNabilahIn('wrench', 'insulated'), { turns: 15, herbs: 4 }), sameAs: { beaten: 'grorud-nabilah__beaten' } },
  { name: 'grorud-nabilah-factory', save: atNabilahIn('wrench', 'factory'), run: nabilahFight(atNabilahIn('wrench', 'factory'), { turns: 17, herbs: 6 }) },
  { // no Grorud gear at all: MARCUS' bat and EMIL's sneakers
    name: 'grorud-nabilah-no-extras', save: atNabilah, run: nabilahFight(atNabilah, { turns: 18, herbs: 7 }),
  },
  { // level 11 without a single optional bonus from earlier chapters: no tonic, no kebab, the Tough Vest, six herbs
    name: 'grorud-nabilah-modest',
    save: (() => { const d = dressed(atNabilah, 'bat', 'vest'); Object.assign(d.player, level(11), { maxhp: 90, hp: 90, herbs: 6, maxHerbs: 6, armors: ['none', 'vest'] }); return d; })(),
    run: nabilahFight((() => { const d = dressed(atNabilah, 'bat', 'vest'); Object.assign(d.player, level(11)); return d; })(), { turns: 17, herbs: 6, heal: 50 }),
  },
  { // arriving a level early (10), in the Tough Vest
    name: 'grorud-nabilah-level-10',
    save: (() => { const d = dressed(atNabilah, 'bat', 'vest'); Object.assign(d.player, level(10), { maxhp: 100, hp: 100 }); return d; })(),
    run: nabilahFight((() => { const d = dressed(atNabilah, 'bat', 'vest'); Object.assign(d.player, level(10)); return d; })(), { turns: 19, herbs: 7 }),
  },
  { // arriving two levels up (13), with everything Grorud has to give
    name: 'grorud-nabilah-level-13',
    save: (() => { const d = atNabilahIn('wrench', 'insulated'); Object.assign(d.player, level(13), { maxhp: 118, hp: 118 }); return d; })(),
    run: nabilahFight((() => { const d = atNabilahIn('wrench', 'insulated'); Object.assign(d.player, level(13)); return d; })(), { turns: 11, herbs: 2 }),
  },
  { // one measured blow with each weapon, and running away leaves her unbeaten and gives nothing
    name: 'grorud-nabilah-weapons', save: atNabilahIn('wrench', 'insulated'),
    run: `async (T, g) => {
      ${MEET}
      await T.continueGame();
      const dealt = {};
      g.player.weapons.push('blade');
      for (const w of ['bat', 'wrench', 'blade']) {
        g.player.weapon = w; g.player.hp = g.player.maxhp;
        await T.tap('Space', 3);
        while (g.mode === 'dialog') { await T.frames(150); await T.tap('Space', 3); }
        await T.untilBattle();
        dealt[w] = await swing();
        await T.fight(() => 2);
        T.check('got away: unbeaten, nothing handed over', g.mode === 'world' && !g.flags.nabilahBeaten && !g.flags.factoryKey && !g.flags.fragment3 && g.q.power.s === 1 && g.stats.won === 90, g.mode);
      }
      // hero ATK 26; +9 / +8 / +7; +1 from the dice; less her DEF 10 (the wrench is no help: she wears no armour)
      T.check('bat 26, wrench 25, blade 24', dealt.bat === 26 && dealt.wrench === 25 && dealt.blade === 24, JSON.stringify(dealt));
    }`,
  },
  { // closed in the middle of the hand-over: she finishes it next time, once
    name: 'grorud-nabilah-handover-interrupted', save: { ...atNabilah, flags: { ...atNabilah.flags, nabilahBeaten: true } },
    run: [
      async (T, g) => {
        await T.continueGame();
        T.check('beaten, nothing handed over yet', g.flags.nabilahBeaten === true && !g.flags.factoryKey && g.q.power.s === 1);
        await T.talk('handover');
        T.check('no second fight: fragment and key, once', g.stats.won === 90 && g.flags.fragment3 === true && g.flags.factoryKey === true && g.q.power.s === 2 && g.mode === 'world');
        await T.talk('after');
        T.check('still once', g.q.power.s === 2 && g.stats.won === 90);
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: fragment and key kept, the quest ready', g.flags.fragment3 === true && g.flags.factoryKey === true && g.q.power.s === 2);
        await T.talk();
        T.check('and she gives nothing more', g.mode === 'world' && g.stats.won === 90);
      },
    ],
  },
  { // beaten by her: carried home with nothing lost, and she waits for another try
    name: 'grorud-nabilah-defeat',
    save: (() => { const d = JSON.parse(JSON.stringify(atNabilah)); Object.assign(d.player, level(1), { hp: 5, herbs: 0 }); return d; })(),
    run: [
      async (T, g) => {
        await T.continueGame();
        await T.tap('Space', 3);
        while (g.mode === 'dialog') { await T.frames(150); await T.tap('Space', 3); }
        await T.untilBattle();
        await T.fight();
        await T.until(() => g.mode === 'dialog', 'being carried home');
        await T.dialog();
        const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        T.check('in the village, patched up, saved there', g.player.map === 'village' && g.player.hp === g.player.maxhp && d.player.map === 'village');
        T.check('NABILAH unbeaten, nothing handed over; the power, the open gate and the cells all kept', !d.flags.nabilahBeaten && !d.flags.factoryKey && !d.flags.fragment3 && d.q.power.s === 1
          && d.flags.worksOpen === true && ['cell1', 'cell2', 'cell3'].every((k) => d.flags[k] === true));
      },
      async (T, g) => {
        await T.continueGame();
        T.place('grorudWorks', 12, 3, 'up');
        await T.tap('Space', 3);
        T.check('NABILAH is waiting for another try', g.mode === 'dialog' && g.dlg.name === 'NABILAH', g.mode);
      },
    ],
  },
  { // back to TOBIAS: the chapter ends, the FACTORY KEY opens the east gate, and the road stops at a barricade
    name: 'grorud-chapter', save: (() => { const d = nabilahDone(moved(powered(chapterThreeDone), 'grorudTown', 19, 4, 'up')); d.q.bag = { s: 1 }; return d; })(),
    run: [
      `async (T, g) => {
        ${GR}
        await T.continueGame();
        T.check('ready to report, Chapter 4', g.q.power.s === 2 && g.chapter === 3 && !g.storyDone && g.NPCS.find((n) => n.id === 'tobias').news());
        let spoke = false;
        await T.tap('Space', 3);
        while (g.mode === 'dialog') {
          await T.frames(150);
          if (g.dlg.name === 'MICHAEL') { if (!spoke) T.shot('hero-speaks'); spoke = true; }
          await T.tap('Space', 3);
        }
        T.check("the hero answers under the hero's own name", spoke);
        await T.until(() => g.mode === 'victory', 'the chapter screen');
        await T.frames(120);
        T.shot('chapter-complete');
        T.check('POWER TO GRORUD is done and saved', g.q.power.s === 3 && saved().q.power.s === 3);
        await T.tap('Space');
        await T.until(() => g.mode === 'world', 'the world');
        await T.frames(40);
        T.check('Chapter 5 now: Veitvet, and the story is not over', g.chapter === 4 && !g.storyDone && g.CHAPTERS[4].name === 'VEITVET' && g.player.map === 'grorudTown');
        T.check("HONEY's bag is still being looked for, and is tracked again", g.q.bag.s === 1 && g.tracked === 'bag');
        const flags = JSON.stringify(g.flags), gold = g.player.gold;
        await T.talk('tobias-after-1'); await T.talk('tobias-after-2');
        T.check('no second chapter screen, nothing given twice', g.mode === 'world' && JSON.stringify(g.flags) === flags && g.player.gold === gold);
        T.place('grorudTown', 24, 9, 'right');
        const said = await hear('east-gate');
        T.check('the FACTORY KEY opens the east gate, saved', g.flags.veitvetGate === true && saved().flags.veitvetGate === true && /ROAD TO VEITVET is open/.test(said), said);
        T.shot('east-gate-open');
        await T.step('right');
        await T.until(() => g.player.map === 'veitvetRoad', 'the road to Veitvet');
        await T.frames(20);
        T.shot('road');
        await T.frames(40);
        T.check('onto the ROAD TO VEITVET, autosaved', g.player.x === 1 && g.player.y === 5 && saved().player.map === 'veitvetRoad');
        await T.step('right', 11);
        T.check('along the road to the sign', g.player.x === 12 && g.player.y === 5, g.player.x + ',' + g.player.y);
        g.player.dir = 'up';
        await T.talk('sign');
        T.check('no victory screen', g.mode === 'world');
        T.shot('road-on');
        await T.step('right', 3);
        await T.until(() => g.player.map === 'veitvet', 'Veitvet');
        await T.frames(60);
        T.check('where the barricade stood in 1G, the road now runs on into VEITVET', g.player.x === 1 && g.player.y === 10 && g.mode === 'world');
        T.place('veitvetRoad', 12, 5, 'right');
        await T.frames(10);
        await T.tap('KeyX', 6);
        await T.tap('ArrowUp', 4);
        T.check('ITEMS: the fragments and the FACTORY KEY', g.menuSel === 3);
        T.shot('items');
        await T.tap('KeyX', 6);
        T.place('veitvetRoad', 1, 5, 'left');
        await T.step('left');
        await T.until(() => g.player.map === 'grorudTown', 'back to town');
        await T.frames(60);
        T.check('back through the east gate', g.player.x === 24 && g.player.y === 9 && g.player.dir === 'left');
        T.state('chapter-done');
      }`,
      `async (T, g) => {
        ${GR}
        await T.continueGame();
        T.check('CONTINUE: chapter, key, east gate and everything from before', g.chapter === 4 && g.q.power.s === 3 && g.flags.veitvetGate === true
          && ['fragment1', 'fragment2', 'fragment3', 'factoryKey', 'worksOpen', 'nabilahBeaten', 'grorudGate', 'marcusBat'].every((k) => g.flags[k] === true));
        await T.step('right');
        await T.until(() => g.player.map === 'veitvetRoad', 'the road');
        await T.frames(60);
        T.check('the east gate stays open', g.player.map === 'veitvetRoad');
        T.place('grorudWorks', 12, 3, 'up');
        const said = await hear('nabilah-later');
        T.check('NABILAH stays beaten: no battle, nothing more', g.mode === 'world' && g.stats.won === 90 && /VEITVET|machines|snacks/.test(said), said);
        T.state('later');
      }`,
    ],
  },
  { // the on-screen buttons: through the south gate, TOBIAS's offer, the log, and back up the steps
    name: 'grorud-touch', save: withHero(chapterThreeDone, 'alexandra'),
    run: `async (T, g) => {
      await T.continueGame();
      for (const m of ['grorudHeights', 'grorudTown']) g.MAPS[m].encounter.chance = 0;
      await T.touch('down', 30);
      await T.until(() => g.player.map === 'grorudHeights', 'the heights');
      await T.frames(60);
      T.check('the D-pad goes through the south gate', g.player.x === 15 && g.player.y === 3);
      T.place('grorudTown', 19, 4, 'up');
      await T.touch('a');
      T.check('A talks to TOBIAS', g.mode === 'dialog' && g.dlg.name === 'TOBIAS', g.mode);
      for (let i = 0; g.mode === 'dialog' && i < 12; i++) { await T.frames(150); await T.touch('a', 3); }
      T.check('the quest is taken', g.q.power.s === 1 && g.mode === 'world');
      await T.touch('b');
      T.check('B opens the log on the page of the new quest', g.mode === 'menu' && g.menuPage === 2, g.menuPage);
      T.shot('log');
      await T.touch('up'); await T.touch('up');
      T.check('up twice: the armour line', g.menuSel === 1);
      await T.touch('a');
      T.check('A changes the armour', g.player.armor === 'none', g.player.armor);
      T.shot('armour');
      await T.touch('a'); await T.touch('a');
      T.check('and round again to the sneakers', g.player.armor === 'sneakers', g.player.armor);
      await T.touch('down'); await T.touch('down');
      await T.touch('a');
      T.check('A on SAVE saves', g.menuNote && g.menuNote.text === 'SAVED!');
      await T.touch('b');
      T.check('B closes it', g.mode === 'world');
      T.place('grorudTown', 13, 3, 'up');
      await T.touch('up', 30);
      await T.until(() => g.player.map === 'grorudHeights', 'back up');
      await T.frames(60);
      T.check('the D-pad goes up the steps', g.player.x === 15 && g.player.y === 19);
    }`,
  },
  { // a save on what is now a wall or a machine wakes the hero on the nearest open ground
    name: 'grorud-settle', save: moved(chapterThreeDone, 'grorudTown', 18, 3, 'up'),
    run: [
      `async (T, g) => {
        await T.continueGame();
        T.check('off the terminal, onto open ground next to it', g.player.map === 'grorudTown' && !g.SOLID.has(g.MAPS.grorudTown.rows[g.player.y][g.player.x]) && Math.abs(g.player.x - 18) + Math.abs(g.player.y - 3) === 1, g.player.x + ',' + g.player.y);
        const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1')); Object.assign(d.player, { map: 'grorudWorks', x: 2, y: 9, fx: 2, fy: 9, tx: 2, ty: 9 }); localStorage.setItem('turnip-vale-save-v1', JSON.stringify(d));
      }`,
      `async (T, g) => {
        await T.continueGame();
        T.check('off the machine in the Works, onto the floor next to it', g.player.map === 'grorudWorks' && g.MAPS.grorudWorks.rows[g.player.y][g.player.x] === '-' && Math.abs(g.player.x - 2) + Math.abs(g.player.y - 9) === 1, g.player.x + ',' + g.player.y);
      }`,
    ],
  },
];
// A save exactly as the published 1F game (commit 3fae9f2) wrote it, byte for byte: made by playing that
// version from SELMA's hand-in, through the chapter screen to the open south gate (which 1F kept solid, "The
// road to GRORUD lies beyond"), and saving by hand in front of it. It has no Grorud quest and grorudGate: true.
const REAL_1F_SAVE = {"v":1,"player":{"map":"ammerud","x":15,"y":20,"dir":"down","moving":false,"fx":15,"fy":20,"tx":15,"ty":20,"t":0,"lvl":11,"hp":106,"maxhp":106,"atk":26,"def":11,"xp":0,"next":681,"herbs":7,"maxHerbs":7,"gold":640,"weapon":"bat","armor":"sneakers","weapons":["none","crystal","bat"],"armors":["none","vest","sneakers"],"shards":0,"glowcaps":0,"sickle":true,"sinceBattle":0,"hero":"mohammed"},"q":{"slimes":{"s":3,"n":3},"biscuit":{"s":3},"glowcap":{"s":3},"king":{"s":3},"shards":{"s":3},"road":{"s":3,"n":3},"cart":{"s":3},"under":{"s":3},"mohsin":{"s":3},"kebab":{"s":3},"trouble":{"s":3,"c":3,"r":3,"b":2},"ball":{"s":3},"wisp":{"s":3}},"flags":{"vines":true,"metBram":true,"shard1":true,"shard2":true,"fragment1":true,"redKey":true,"redGate":true,"tunnelOpen":true,"northOpen":true,"mohsinBeaten":true,"fragment2":true,"blueKey":true,"blueGate":true,"kebab":true,"marcusBeaten":true,"marcusBat":true,"ball":true,"wispFragment":true,"chestPouch":true,"grorudGate":true},"stats":{"won":52,"slimes":17,"steps":2900},"tracked":null};
const real1fScenario = {
  name: 'grorud-real-1f-save', save: REAL_1F_SAVE,
  run: [
    async (T, g) => {
      const KEY = 'turnip-vale-save-v1', saved = () => JSON.parse(localStorage.getItem(KEY));
      await T.continueGame();
      T.check('CONTINUE: in front of the open south gate, Chapter 4, nothing of Grorud started', g.player.map === 'ammerud' && g.player.x === 15 && g.player.y === 20 && g.chapter === 3
        && ['power', 'bag', 'yard'].every((id) => g.q[id].s === 0) && g.player.hero === 'mohammed');
      T.shot('gate');
      await T.tap('Space', 6);
      T.check('A at the open gate: no 1F line any more', g.mode === 'world');
      await T.step('down');
      await T.until(() => g.player.map === 'grorudHeights', 'the heights');
      await T.frames(60);
      T.check('through the gate onto GRORUD HEIGHTS', g.player.x === 15 && g.player.y === 3 && g.player.dir === 'down');
      const d = saved();
      T.check('autosaved with everything the 1F save had', d.player.map === 'grorudHeights' && T.questsKept(d.q, REAL.q) && Object.keys(REAL.flags).every((k) => d.flags[k] === REAL.flags[k])
        && JSON.stringify(d.player.weapons) === JSON.stringify(REAL.player.weapons) && JSON.stringify(d.player.armors) === JSON.stringify(REAL.player.armors) && d.player.weapon === 'bat' && d.player.armor === 'sneakers' && d.player.hero === 'mohammed');
    },
    async (T, g) => {
      await T.continueGame();
      T.check('CONTINUE on the heights', g.player.map === 'grorudHeights' && g.player.x === 15 && g.player.y === 3);
      T.place('grorudHeights', 15, 3, 'up');
      await T.touch('up', 30);
      await T.until(() => g.player.map === 'ammerud', 'Ammerud');
      await T.frames(60);
      T.check('back to Ammerud with the D-pad', g.player.x === 15 && g.player.y === 20);
      await T.touch('down', 30);
      await T.until(() => g.player.map === 'grorudHeights', 'the heights again');
      await T.frames(60);
      T.check('and through again with the D-pad', g.player.x === 15 && g.player.y === 3);
    },
  ].map((f) => `(${f})`.replace(/REAL/g, JSON.stringify(REAL_1F_SAVE))),
};
// Saves from every stage of Grorud, loaded one after another: each one carries on exactly where it was.
const GRORUD_STAGES = (() => {
  const s = (name, fix, check) => ({ name, fix, check });
  const bagDone = (() => { const d = withCells(moved(chapterThreeDone, 'grorudTown', 7, 4, 'up'), 1, ['cell1']); d.q.bag = { s: 3 }; d.flags.bag = true; d.player.armors = [...d.player.armors, 'insulated']; d.player.armor = 'insulated'; return d; })();
  return [
    s('one cell, on the spot where it lay', withCells(moved(chapterThreeDone, 'grorudHeights', 2, 7, 'up'), 1, ['cell1']), "g.flags.cell1 && !g.ITEMS.some((i) => i.id === 'cell1' && !g.flags[i.id]) && g.NPCS.find((n) => n.id === 'hulk').visible()"),
    s('two cells, the big golem beaten', withCells(moved(chapterThreeDone, 'grorudHeights', 26, 5, 'up'), 1, ['cell1', 'cell2']), "!g.NPCS.find((n) => n.id === 'hulk').visible() && g.mode === 'world'"),
    s('three cells, not yet hooked up', withCells(moved(chapterThreeDone, 'grorudTown', 19, 4, 'up'), 1, ['cell1', 'cell2', 'cell3']), "!g.flags.worksOpen && g.NPCS.find((n) => n.id === 'tobias').news()"),
    s("HONEY's bag handed back, the vest worn", bagDone, "g.player.armor === 'insulated' && g.q.bag.s === 3 && !g.NPCS.find((n) => n.id === 'honey').news()"),
    s('the power on, standing inside the Works', powered(moved(chapterThreeDone, 'grorudWorks', 4, 10, 'up')), "g.flags.worksOpen && g.player.map === 'grorudWorks'"),
    s('in front of NABILAH', atNabilah, "!g.flags.nabilahBeaten && g.q.power.s === 1 && g.player.y === 3"),
    s('NABILAH beaten, the key in the pack', nabilahDone(atNabilah), "g.q.power.s === 2 && g.flags.factoryKey && g.chapter === 3"),
    s('the chapter over, out on the road to Veitvet', (() => { const d = nabilahDone(moved(powered(chapterThreeDone), 'veitvetRoad', 8, 5, 'right')); d.q.power = { s: 3 }; d.flags.veitvetGate = true; d.tracked = null; return d; })(), "g.chapter === 4 && g.flags.veitvetGate && g.player.map === 'veitvetRoad'"),
  ];
})();
const stageScenario = {
  name: 'grorud-saves', save: GRORUD_STAGES[0].fix,
  run: GRORUD_STAGES.map((st, i) => `async (T, g) => {
    const KEY = 'turnip-vale-save-v1', before = JSON.parse(localStorage.getItem(KEY)), next = ${JSON.stringify(GRORUD_STAGES[i + 1] ? GRORUD_STAGES[i + 1].fix : null)};
    await T.continueGame();
    const p = g.player, b = before.player;
    T.check(${JSON.stringify(st.name)} + ': carries on where it was saved', g.mode === 'world' && p.map === b.map && p.x === b.x && p.y === b.y && p.dir === b.dir
      && T.questsKept(g.q, before.q) && JSON.stringify(g.flags) === JSON.stringify(before.flags) && p.weapon === b.weapon && p.armor === b.armor
      && JSON.stringify(p.weapons) === JSON.stringify(b.weapons) && JSON.stringify(p.armors) === JSON.stringify(b.armors), p.map + ' ' + p.x + ',' + p.y);
    T.check(${JSON.stringify(st.name)} + ': the world agrees with the save', ${st.check});
    if (${i} === 0 || ${i} === ${GRORUD_STAGES.length - 1}) T.shot('stage-${i + 1}');
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
  }`),
};
// ------------------------------------------------------------------ Veitvet (Expansion 1H)
// A save from the end of Grorud, the way a player who explored normally would have it: level 12, every Grorud
// quest done, the wrench in hand and the insulated vest on, all four Grorud chests opened, seven herbs.
// Standing on the road to Veitvet, where 1G's barricade used to be.
const chapterFourDone = (() => {
  const d = nabilahDone(powered(chapterThreeDone));
  d.q.power = { s: 3 }; d.q.bag = { s: 3 }; d.q.yard = { s: 3, n: 2 }; d.tracked = null;
  Object.assign(d.flags, { bag: true, chestWrench: true, chestBlade: true, chestArmor: true, veitvetGate: true });
  Object.assign(d.player, level(12), {
    maxhp: 112, hp: 112, maxHerbs: 7, herbs: 7, gold: 1100, weapon: 'wrench', armor: 'insulated',
    weapons: ['none', 'crystal', 'bat', 'wrench', 'blade'], armors: ['none', 'vest', 'sneakers', 'insulated', 'factory'],
    map: 'veitvetRoad', x: 12, y: 5, fx: 12, fy: 5, tx: 12, ty: 5, dir: 'right',
  });
  d.stats = { won: 130, slimes: 17, steps: 7300 };
  return d;
})();
const inVeitvet = moved(chapterFourDone, 'veitvet', 1, 10, 'right');
// The main quest running, with the given story flags set (underSeen, deviceSeen, shieldOff, signalOff, ...).
const withSignal = (fix, list, s = 1) => {
  const d = JSON.parse(JSON.stringify(fix));
  d.q.signal = { s }; d.tracked = s ? 'signal' : null;
  for (const k of list) d.flags[k] = true;
  return d;
};
const ALL_SIGNAL = ['underSeen', 'deviceSeen', 'shieldOff', 'signalOff'];
const atSandra = withSignal(moved(chapterFourDone, 'veitvetCenter', 10, 4, 'up'), ALL_SIGNAL);
const sandraDone = (fix) => {
  const d = JSON.parse(JSON.stringify(fix));
  d.q.signal = { s: 2 }; d.tracked = 'signal';
  Object.assign(d.flags, { sandraBeaten: true, fragment4: true });
  return d;
};
const atLevel = (fix, n, extra = {}) => { const d = JSON.parse(JSON.stringify(fix)); Object.assign(d.player, level(n), extra); return d; };
// Shared by the Veitvet runs (on top of GR): no random battles anywhere in Veitvet.
const VV = `
  ${GR}
  const calm = () => { for (const m of ['veitvet', 'veitvetUnder', 'veitvetCenter']) g.MAPS[m].encounter.chance = 0; };
`;
const VEITVET_MAPS = ['veitvetRoad', 'veitvet', 'veitvetUnder', 'veitvetCenter', 'osloRoad'];
// The whole meeting with SANDRA: the talk, the fight (an herb below HEAL HP), the hand-over, and nothing twice.
const SANDRA = `async (T, g) => {
  ${GR}
  ${WATCH.replace('const want = g.player.hp < heal && g.player.herbs > 0 ? 1 : 0;', 'const want = (g.player.hp < heal || (b.charged && g.player.hp <= feedback())) && g.player.herbs > 0 ? 1 : 0;')}
  // what a FEEDBACK would do to the hero right now (the dice at their worst), as a careful player reckons it
  const feedback = () => { const b = g.battle, a = g.ARMORS[g.player.armor]; const d = Math.max(1, Math.round((b.atk + 2) * 2) - Math.max(0, g.player.def + a.def - (b.soft ? b.soft.amt : 0))); return Math.round(d * (1 - (a.resist || 0))); };
  await T.continueGame();
  const p = g.player, gold = p.gold, xp = p.xp, won = g.stats.won, herbs = p.herbs, weapons = p.weapons.slice(), armors = p.armors.slice();
  const baseAtk = p.atk, baseDef = p.def;
  T.check('SANDRA waits on her stage, right in front of the hero', g.NPCS.some((n) => n.id === 'sandra' && n.map === 'veitvetCenter' && n.x === 10 && n.y === 3 && !n.visible) && p.x === 10 && p.y === 4);
  if (TALK) T.shot('stage');
  const said = await hear(TALK ? 'before' : '');
  T.check('she says what she is doing before the fight starts', /relay/.test(said) && /LOUDER/.test(said), said);
  await T.untilBattle();
  const b = g.battle;
  T.check('SANDRA: 290 HP, ATK 31, DEF 11, a boss; the device makes no difference to her', b.type === 'sandraBoss' && b.name === 'SANDRA' && b.boss === true && b.max === 290 && b.atk === 31 && b.def === 11 && b.xp === 230 && !b.boosted, JSON.stringify([b.max, b.atk, b.def, b.xp, b.boosted]));
  if (TALK) T.shot('battle');
  let overAt = null, pink = false, defAfter = null, shotOver = false, shotJam = false, shotDist = false, shotWarn = false, shotFeedback = false;
  const jams = [], dists = [], feedbackSoft = [];
  let lastMsg = '';
  const { turns, seen } = await watchFight(HEAL, [['swing', /mic stand/], ['pulse', /SIGNAL PULSE/], ['watch', /watches you/], ['burst', /STATIC BURST/],
    ['overload', /SIGNAL OVERLOAD/], ['warps', /warps and hisses/], ['jam', /^SIGNAL JAM/], ['atkdown', /ATK drops/], ['dist', /^DISTORTION/], ['defdown', /DEF drops/],
    ['warn', /shrill whine/], ['feedback', /FEEDBACK!!/], ['wave', /wave of noise/], ['clear', /head clears/],
    ['muffle', /muffle the noise/], ['soften', /softens the blow/], ['soak', /soaks up/], ['defeated', /Signal lost/]], () => {
    if (b.overload && overAt === null) { overAt = b.hp; pink = b.look === 'sandra2'; defAfter = b.def; }
    if (b.weak && !jams.includes(b.weak)) jams.push(b.weak);
    if (b.soft && !dists.includes(b.soft)) dists.push(b.soft);
    if (b.msg !== lastMsg) { lastMsg = b.msg; if (b.msg === 'FEEDBACK!!') feedbackSoft.push(!!b.soft); }
    if (TALK && !shotOver && /SIGNAL OVERLOAD/.test(b.msg) && b.shown >= b.msg.length && b.glitch > 0 && Math.floor(b.glitch / 3) % 2 === 0) { shotOver = true; T.shot('signal-overload'); }
    if (TALK && !shotJam && b.weak && /ATK drops/.test(b.msg) && b.shown >= b.msg.length) { shotJam = true; T.shot('signal-jam'); }
    if (TALK && !shotDist && b.soft && /DEF drops/.test(b.msg) && b.shown >= b.msg.length) { shotDist = true; T.shot('distortion'); }
    if (TALK && !shotWarn && b.charged && b.shown >= b.msg.length) { shotWarn = true; T.shot('feedback-warning'); }
    if (TALK && !shotFeedback && b.msg === 'FEEDBACK!!' && b.glitch > 0 && Math.floor(b.glitch / 3) % 2 === 0) { shotFeedback = true; T.shot('feedback'); }
  });
  const phones = p.armor === 'phones';
  T.check('SIGNAL OVERLOAD exactly once, at half HP or below: the coat turns pink, her guard drops to 9', seen.overload === 1 && seen.warps === 1 && overAt !== null && overAt <= 145 && pink && defAfter === 9, JSON.stringify(seen) + ' ' + overAt + ' ' + defAfter);
  T.check(DEEP ? 'phase 1 seen whole: a swing, a SIGNAL PULSE, a look and a STATIC BURST' : 'phase 1 seen: a swing, a SIGNAL PULSE and a look', seen.swing >= 1 && seen.pulse >= 1 && seen.watch >= 1 && (!DEEP || seen.burst >= 1), JSON.stringify(seen));
  T.check('phase 2 seen: SIGNAL JAM and DISTORTION, each with its warning line', seen.jam >= 1 && seen.atkdown === seen.jam && (seen.dist || 0) === (seen.defdown || 0) && (DEEP ? seen.dist >= 1 : true), JSON.stringify(seen));
  T.check('every FEEDBACK was warned of the turn before', (seen.feedback || 0) <= (seen.warn || 0), JSON.stringify(seen));
  T.check(phones ? 'with HEADPHONES: JAM -4 for 2 moves, DISTORTION -3 for 2' : 'without HEADPHONES: JAM -8 for 3 moves, DISTORTION -6 for 3',
    jams.every((j) => j.amt === (phones ? 4 : 8)) && dists.every((d) => d.amt === (phones ? 3 : 6)) && jams.length === seen.jam && dists.length === (seen.dist || 0), JSON.stringify([jams, dists]));
  T.check(phones ? 'with HEADPHONES the DISTORTION is gone before FEEDBACK lands' : 'without them, FEEDBACK lands while the DISTORTION is still on', feedbackSoft.every((s) => s === !phones), JSON.stringify(feedbackSoft));
  T.check('the armour speaks up once, and only the one being worn', (seen.muffle || 0) === (phones ? 1 : 0) && (seen.soften || 0) === (p.armor === 'padded' ? 1 : 0) && (seen.soak || 0) === (p.armor === 'insulated' ? 1 : 0), JSON.stringify(seen));
  T.check('beaten', seen.defeated === 1 && g.stats.won === won + 1 && p.hp > 0, g.mode + ' ' + p.hp);
  T.check('nothing of the JAM or the DISTORTION is left on the hero', g.battle === null && p.atk >= baseAtk && p.def >= baseDef);
  await T.until(() => g.mode === 'dialog', 'SANDRA to speak');
  T.check('beaten is saved before anything is handed over', saved().flags.sandraBeaten === true && !saved().flags.fragment4 && saved().q.signal.s === 1);
  T.check('nothing yet', !g.flags.fragment4 && g.q.signal.s === 1 && g.dlg.name === 'SANDRA');
  const hand = await (async () => { const out = []; let i = 0; while (g.mode === 'dialog') { if (++i > 40) throw new Error('never ended'); await T.frames(150); if (TALK) T.shot('handover-p' + i); out.push(g.dlg.pages[g.dlg.page].join(' ')); await T.tap('Space', 3); } await T.frames(10); return out.join(' '); })();
  T.check('THE FOUR FRAGMENTS BEGIN TO GLOW... and the crystal reacts to central Oslo', /THE FOUR FRAGMENTS BEGIN TO GLOW/.test(hand) && /CENTRAL OSLO/.test(hand) && !/OSAKA/i.test(hand), hand);
  T.check('CRYSTAL FRAGMENT 4, saved', g.flags.fragment4 === true && saved().flags.fragment4 === true);
  T.check('four Crystal Fragments now', Object.keys(g.flags).filter((k) => /^fragment\\d+$/.test(k) && g.flags[k]).length === 4);
  T.check('the quest is ready for MINA, and the chapter is not over', g.q.signal.s === 2 && g.tracked === 'signal' && saved().q.signal.s === 2 && g.chapter === 4 && g.mode === 'world');
  T.check('230 XP and 220 gold', p.xp + (p.lvl > LVL ? NEXT : 0) === xp + 230 && p.gold === gold + 220, p.xp + ' ' + (p.gold - gold));
  T.check('every weapon and armour owned before is kept, and what was worn is still worn', weapons.every((w) => p.weapons.includes(w)) && armors.every((a) => p.armors.includes(a)) && p.weapon === __WEAPON__ && p.armor === __ARMOR__);
  T.check('a fair fight', turns <= LIMIT[0] && herbs - p.herbs <= LIMIT[1], turns + ' turns, ' + (herbs - p.herbs) + ' herbs, ' + p.hp + ' HP left');
  T.out.states.balance = { turns, herbs: herbs - p.herbs, hpLeft: p.hp, maxhp: p.maxhp, seen };
  if (TALK) { T.shot('tracker'); await T.menuShot('status'); }
  const flags = JSON.stringify(g.flags);
  await hear(TALK ? 'after' : ''); await hear(TALK ? 'after-2' : '');
  T.check('she only talks now, and gives nothing twice', g.mode === 'world' && g.stats.won === won + 1 && JSON.stringify(g.flags) === flags);
  T.check('her masts have gone dark', ['8,2', '12,2'].every((k) => g.MAPS.veitvetCenter.gates[k].open === 'ò' && g.flags[g.MAPS.veitvetCenter.gates[k].flag] === true));
  T.state('beaten');
}`;
const sandraFight = (fix, { turns, herbs, heal = 55, talk = false, deep = true }) => SANDRA.replace(/LIMIT/g, `[${turns}, ${herbs}]`).replace('HEAL', String(heal))
  .replace(/TALK/g, String(talk)).replace(/DEEP/g, String(deep)).replace('__WEAPON__', `'${fix.player.weapon}'`).replace('__ARMOR__', `'${fix.player.armor}'`)
  .replace('LVL', String(fix.player.lvl)).replace('NEXT', String(fix.player.next));
const atSandraIn = (weapon, armor, base = atSandra) => dressed(base, weapon, armor);
const veitvetScenarios = [
  { // a save from the end of Grorud: on along the road, into Veitvet, a look around, and back
    name: 'veitvet-arrive', save: chapterFourDone,
    run: [
      `async (T, g) => {
        ${VV}
        T.check('the save knows nothing of Veitvet', saved().q.signal === undefined && saved().q.phone === undefined);
        await T.continueGame();
        T.check('it loads in Chapter 5 with every Veitvet quest unstarted, where the barricade used to be', g.chapter === 4 && g.q.signal.s === 0 && g.q.phone.s === 0 && g.player.map === 'veitvetRoad' && g.player.x === 12 && g.player.y === 5);
        T.shot('road');
        await T.step('right', 3);
        await T.until(() => g.player.map === 'veitvet', 'Veitvet');
        await T.frames(20);
        T.shot('arriving');
        await T.frames(40);
        T.check('along the road into VEITVET, autosaved', g.player.x === 1 && g.player.y === 10 && g.player.dir === 'right' && saved().player.map === 'veitvet', g.player.x + ',' + g.player.y);
        await T.frames(120);
        T.check('nothing happens by itself', g.mode === 'world' && g.player.map === 'veitvet');
        calm();
        const here = g.NPCS.filter((n) => n.map === 'veitvet' && (!n.visible || n.visible())).map((n) => n.id + ' ' + n.x + ',' + n.y).join('; ');
        T.check('three people in Veitvet to begin with (NOAH is still stuck below)', here === 'mina 4,9; elias 8,14; marianne 7,5', here);
        const news = g.NPCS.filter((n) => n.map === 'veitvet' && n.news && n.news()).map((n) => n.id).join();
        T.check('MINA and ELIAS have a mark; MARIANNE does not', news === 'mina,elias', news);
        T.check('the tracker is empty until MINA has asked', g.tracked === null);
        T.place('veitvet', 13, 9, 'up'); await T.frames(20); T.shot('square');
        T.place('veitvet', 21, 4, 'up'); await T.frames(20); T.shot('center-doors');
        const doors = await hear('center-doors');
        T.check('the centre is shuttered, and something buzzes behind it', /shutters/.test(doors) && /buzzes/.test(doors), doors);
        await T.step('up');
        T.check('the doors do not open', g.player.map === 'veitvet' && g.player.y === 4 && !g.flags.signalOff);
        T.place('veitvet', 26, 10, 'right'); await T.frames(20); T.shot('east-gate');
        const gate = await hear('east-gate');
        await T.step('right');
        T.check('the east gate to OSLO S is locked', /OSLO S/.test(gate) && g.player.map === 'veitvet' && g.player.x === 26 && !g.flags.osloGate, gate);
        T.place('veitvet', 13, 16, 'right'); await T.talk('station-sign');
        T.place('veitvet', 13, 16, 'down'); await T.frames(20); T.shot('stairs');
        await T.step('down');
        await T.until(() => g.player.map === 'veitvetUnder', 'the underground');
        await T.frames(20);
        T.shot('underground');
        await T.frames(40);
        T.check('down the stairs into the old station: noted as found, autosaved', g.player.x === 2 && g.player.y === 15 && g.flags.underSeen === true && saved().flags.underSeen === true && saved().player.map === 'veitvetUnder');
        await T.step('down');
        await T.until(() => g.player.map === 'veitvet', 'back up');
        await T.frames(60);
        T.check('and back up the stairs', g.player.x === 13 && g.player.y === 16, g.player.x + ',' + g.player.y);
        T.place('veitvet', 1, 10, 'left');
        await T.step('left');
        await T.until(() => g.player.map === 'veitvetRoad', 'the road');
        await T.frames(60);
        T.check('and back west along the road', g.player.x === 14 && g.player.y === 5 && g.player.dir === 'left', g.player.x + ',' + g.player.y);
        T.check('nothing was started, given or picked up by looking around', g.q.signal.s === 0 && g.q.phone.s === 0 && g.player.gold === 1100 && !g.flags.phone && !g.flags.noahHelped);
        await T.step('right', 2);
        await T.until(() => g.player.map === 'veitvet', 'Veitvet again');
        await T.frames(60);
        T.state('arrived');
      }`,
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE in Veitvet', g.player.map === 'veitvet' && g.player.x === 1 && g.player.y === 10 && g.chapter === 4 && g.mode === 'world');
        T.shot('continued');
      },
    ],
  },
  { // the maps themselves: open ground, edges, exits, gates, monsters, and what the HUD might hide
    name: 'veitvet-map-audit', save: inVeitvet,
    run: `async (T, g) => {
      ${HUD_CHECK}
      ${WRAP}
      await T.continueGame();
      const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      const tile = (m, x, y, open) => { const gate = m.gates && m.gates[x + ',' + y]; return gate ? (open ? gate.open : gate.closed) : m.rows[y][x]; };
      const walk = (m, x, y, open) => x >= 0 && y >= 0 && x < m.w && y < m.h && !g.SOLID.has(tile(m, x, y, open));
      const reach = (name, sx, sy, open) => {
        const m = g.MAPS[name], seen = new Set([sx + ',' + sy]), todo = [[sx, sy]];
        while (todo.length) {
          const [x, y] = todo.pop();
          if (m.exits[x + ',' + y]) continue;
          for (const [dx, dy] of Object.values(DIRS)) {
            const k = (x + dx) + ',' + (y + dy);
            if (!seen.has(k) && walk(m, x + dx, y + dy, open)) { seen.add(k); todo.push([x + dx, y + dy]); }
          }
        }
        return seen;
      };
      const M = Object.fromEntries(${JSON.stringify(VEITVET_MAPS)}.map((n) => [n, g.MAPS[n]]));
      const size = Object.entries(M).map(([n, m]) => n + ' ' + m.w + 'x' + m.h + (m.rows.every((r) => r.length === m.w) ? '' : ' RAGGED')).join(', ');
      T.check('the road 16x10, Veitvet 28x20, the underground 26x18, the centre 22x16, the road to Oslo S 16x10', size === 'veitvetRoad 16x10, veitvet 28x20, veitvetUnder 26x18, veitvetCenter 22x16, osloRoad 16x10', size);
      const START = { veitvetRoad: [1, 5], veitvet: [1, 10], veitvetUnder: [2, 15], veitvetCenter: [11, 14], osloRoad: [1, 5] };
      for (const [name, [sx, sy]] of Object.entries(START)) {
        const m = M[name], seen = reach(name, sx, sy, true), out = [];
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (walk(m, x, y, true) && !seen.has(x + ',' + y)) out.push(x + ',' + y);
        T.check(name + ': all open ground can be reached', out.length === 0, out.join(' '));
      }
      const targets = (m) => JSON.stringify(Object.values(m.exits).map((e) => e.map));
      T.check('the exits: the road between Grorud and Veitvet; Veitvet to the road, the centre, the station and the road to Oslo S; the rest only back',
        targets(M.veitvetRoad) === '["grorudTown","veitvet"]' && targets(M.veitvet) === '["veitvetRoad","veitvetCenter","veitvetUnder","osloRoad"]'
        && targets(M.veitvetUnder) === '["veitvet"]' && targets(M.veitvetCenter) === '["veitvet"]' && targets(M.osloRoad) === '["veitvet"]',
        targets(M.veitvetRoad) + ' ' + targets(M.veitvet));
      const landing = [];
      for (const from of [...Object.keys(M), 'grorudTown']) for (const [k, e] of Object.entries(g.MAPS[from].exits)) {
        if (!M[e.map]) continue;
        const to = g.MAPS[e.map];
        if (!walk(to, e.x, e.y, true) || to.exits[e.x + ',' + e.y]) landing.push(from + ' ' + k + ' -> ' + e.map + ' ' + e.x + ',' + e.y);
        const back = Object.entries(to.exits).some(([bk, be]) => be.map === from && Math.abs(+bk.split(',')[0] - e.x) + Math.abs(+bk.split(',')[1] - e.y) === 1);
        if (!back) landing.push('no way back from ' + e.map + ' ' + e.x + ',' + e.y);
      }
      T.check('every way in lands on open ground, one step from the way back', landing.length === 0, landing.join('; '));
      const shut = reach('veitvet', 1, 10, false), open = reach('veitvet', 1, 10, true);
      T.check('shut, the centre doors and the east gate cannot be walked through; open, they lead on', !shut.has('21,3') && !shut.has('27,10') && open.has('21,3') && open.has('27,10')
        && tile(M.veitvet, 21, 3, false) === 'Å' && tile(M.veitvet, 21, 3, true) === 'å' && tile(M.veitvet, 27, 10, false) === 'G' && tile(M.veitvet, 27, 10, true) === 'L');
      const below = reach('veitvetUnder', 2, 15, false), belowOpen = reach('veitvetUnder', 2, 15, true);
      T.check('under the town the shield keeps the device out of reach until it is down; the breaker can always be reached', !below.has('12,3') && belowOpen.has('12,3') && below.has('21,4') && below.has('12,5')
        && tile(M.veitvetUnder, 12, 4, false) === 'ß' && tile(M.veitvetUnder, 12, 4, true) === 'ä' && g.SOLID.has('ß'));
      T.check('the device, its relays, the breaker and her masts all stand solid, live and dead alike', ['Ü', 'ü', 'Ÿ', 'ÿ', '§', '¶', 'Ò', 'ò', 'Ø', 'Ð'].every((c) => g.SOLID.has(c)) && ['ä', 'ö', 'þ', 'ø', 'å', 'Ë', 'Í'].every((c) => !g.SOLID.has(c)));
      const flagOf = (m, k) => m.gates[k].flag;
      T.check('the centre doors, the device and both relays share one flag; the shield and the breaker another; the masts a third',
        ['21,3'].every((k) => flagOf(M.veitvet, k) === 'signalOff') && ['12,2', '11,2', '13,2'].every((k) => flagOf(M.veitvetUnder, k) === 'signalOff')
        && ['12,4', '21,3'].every((k) => flagOf(M.veitvetUnder, k) === 'shieldOff') && ['8,2', '12,2'].every((k) => flagOf(M.veitvetCenter, k) === 'sandraBeaten') && flagOf(M.veitvet, '27,10') === 'osloGate');
      const oslo = reach('osloRoad', 1, 5, true);
      T.check('Oslo S is not built: no such map, and nothing past the barricade can be reached', !Object.keys(g.MAPS).some((k) => /^oslo(s|S)?$|osloS|centralStation/i.test(k) && k !== 'osloRoad') && Object.keys(g.MAPS).length === 18
        && [...oslo].every((k) => +k.split(',')[0] < 15) && g.SOLID.has('J') && M.osloRoad.rows[5][14] === 'J');
      T.check('the old barricade on the road to Veitvet is gone', !M.veitvetRoad.rows.join('').includes('J') && reach('veitvetRoad', 1, 5, true).has('15,5'));
      // monsters
      const zones = (m) => (m.encounter ? m.encounter.zones : []);
      const inZone = (m, x, y) => zones(m).find((z) => x >= z.at[0] && y >= z.at[1] && x <= z.at[2] && y <= z.at[3]);
      const ok = (m) => zones(m).every((z) => z.at[0] >= 0 && z.at[1] >= 0 && z.at[2] < m.w && z.at[3] < m.h && z.table.every((e) => g.ENEMIES[e[0]] && !g.ENEMIES[e[0]].boss) && Math.abs(z.table.reduce((n, e) => n + e[1], 0) - 1) < 1e-9);
      T.check('every zone lies inside its map, its monsters exist, none is a boss, the odds add up', Object.values(M).every(ok));
      const types = (m) => [...new Set(zones(m).flatMap((z) => z.table.map((e) => e[0])))].sort().join();
      T.check('the town: bots, hounds and a few guards; the station: bots, hounds, wisps and golems; the centre: guards, wisps and hounds; the roads: nothing',
        types(M.veitvet) === 'bot,hound,vguard' && types(M.veitvetUnder) === 'bot,hound,swisp,ugolem' && types(M.veitvetCenter) === 'hound,swisp,vguard' && !M.veitvetRoad.encounter && !M.osloRoad.encounter,
        types(M.veitvet) + ' / ' + types(M.veitvetUnder) + ' / ' + types(M.veitvetCenter));
      T.check('the guards are mostly met in the centre; golems only below the town; the beast and SANDRA never at random',
        Math.max(...zones(M.veitvetCenter).map((z) => (z.table.find((e) => e[0] === 'vguard') || [0, 0])[1])) > Math.max(...zones(M.veitvet).map((z) => (z.table.find((e) => e[0] === 'vguard') || [0, 0])[1]))
        && Object.values(g.MAPS).every((m) => m === M.veitvetUnder || !(m.encounter && m.encounter.zones || []).some((z) => z.table.some((e) => e[0] === 'ugolem')))
        && Object.values(g.MAPS).every((m) => !(m.encounter && (m.encounter.zones || [m.encounter]) || []).some((z) => (z.table || []).some((e) => e[0] === 'beast' || e[0] === 'sandraBoss'))));
      T.check('every Veitvet map picks its own battle backdrop', M.veitvet.backdrop === 'veitvet' && M.veitvetUnder.backdrop === 'underground' && M.veitvetCenter.backdrop === 'center' && M.veitvet.encounter.scaleFrom === 13);
      const ways = { veitvet: [[0, 10], [1, 10], [21, 3], [21, 4], [13, 17], [13, 16], [27, 10], [26, 10]], veitvetUnder: [[2, 16], [2, 15]], veitvetCenter: [[11, 15], [11, 14]] };
      const near = [];
      for (const [name, list] of Object.entries(ways)) {
        const m = M[name];
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (inZone(m, x, y) && list.some((p) => Math.abs(p[0] - x) + Math.abs(p[1] - y) <= 3)) near.push(name + ' ' + x + ',' + y);
      }
      T.check('no zone within three steps of a way in', near.length === 0, near.join(' '));
      const safe = [];
      for (let y = 4; y <= 11; y++) for (let x = 0; x < 28; x++) if (inZone(M.veitvet, x, y)) safe.push('town ' + x + ',' + y);
      for (const [x0, y0, x1, y1] of [[6, 2, 7, 6], [11, 2, 13, 6], [19, 3, 23, 6], [1, 13, 5, 16]]) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inZone(M.veitvetUnder, x, y)) safe.push('station ' + x + ',' + y);
      for (const [x0, y0, x1, y1] of [[7, 2, 13, 5], [1, 5, 5, 8], [0, 11, 21, 15]]) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inZone(M.veitvetCenter, x, y)) safe.push('centre ' + x + ',' + y);
      for (let y = 13; y <= 18; y++) for (let x = 1; x <= 15; x++) if (inZone(M.veitvet, x, y)) safe.push('playground ' + x + ',' + y);
      T.check("the streets and the square, the playground, NOAH's corner, the device's chamber, the breaker room, the way in, the shops, the lobby and SANDRA's stage are all safe", safe.length === 0, safe.slice(0, 12).join(' '));
      // nothing that matters hides under the HUD, from anywhere within three steps of it
      const things = [];
      for (const name of Object.keys(M)) {
        const m = M[name];
        things.push(...g.NPCS.filter((n) => n.map === name).map((n) => [n.id, name, n.x, n.y]));
        things.push(...g.ITEMS.filter((i) => i.map === name).map((i) => [i.id, name, i.x, i.y]));
        things.push(...Object.keys(m.signs).map((k) => ['sign ' + k, name, ...k.split(',').map(Number)]));
        things.push(...Object.keys(m.exits).map((k) => ['exit ' + k, name, ...k.split(',').map(Number)]));
        things.push(...Object.keys(m.gates || {}).map((k) => ['gate ' + k, name, ...k.split(',').map(Number)]));
      }
      const hidden = [];
      for (const [id, map, tx, ty] of things) {
        const m = g.MAPS[map];
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
          if (Math.abs(x - tx) + Math.abs(y - ty) > 3 || !walk(m, x, y, true)) continue;
          if (hiddenFrom(map, x, y, tx, ty)) hidden.push(id + ' (' + map + ') from ' + x + ',' + y);
        }
      }
      T.check('no person, chest, phone, sign, exit, gate, device or mast of Veitvet is ever under the status panel or the tracker', hidden.length === 0, hidden.slice(0, 12).join('; '));
      T.check('every chest and the phone stand on open ground, off the paths out', g.ITEMS.filter((i) => M[i.map]).every((i) => walk(g.MAPS[i.map], i.x, i.y, true) && !g.MAPS[i.map].exits[i.x + ',' + i.y]) && g.ITEMS.filter((i) => M[i.map]).length === 5);
      for (const [name, [sx, sy]] of Object.entries(START)) {
        const m = M[name], people = new Set(g.NPCS.filter((n) => n.map === name && n.id !== 'beast').map((n) => n.x + ',' + n.y)), seen = new Set([sx + ',' + sy]), todo = [[sx, sy]];
        while (todo.length) {
          const [x, y] = todo.pop();
          for (const [dx, dy] of Object.values(DIRS)) {
            const k = (x + dx) + ',' + (y + dy);
            if (!seen.has(k) && !people.has(k) && walk(m, x + dx, y + dy, true)) { seen.add(k); todo.push([x + dx, y + dy]); }
          }
        }
        const cut = [];
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (walk(m, x, y, true) && !people.has(x + ',' + y) && !seen.has(x + ',' + y)) cut.push(x + ',' + y);
        T.check(name + ': the people block nobody in (the beast blocks its side tunnel on purpose)', cut.length === 0, cut.join(' '));
      }
      const beastRoom = (() => { const m = M.veitvetUnder, seen = new Set(['2,15']), todo = [[2, 15]]; while (todo.length) { const [x, y] = todo.pop(); for (const [dx, dy] of Object.values(DIRS)) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k) && k !== '23,14' && walk(m, x + dx, y + dy, true)) { seen.add(k); todo.push([x + dx, y + dy]); } } } return seen; })();
      T.check('the beast stands in the only way to the SIGNAL BLADE', !beastRoom.has('22,16') && reach('veitvetUnder', 2, 15, true).has('22,16'));
      // what the HUD and the log say about the new quests, at every stage, must fit
      const wide = [], keep = JSON.stringify(g.flags);
      for (const list of [[], ['underSeen'], ['underSeen', 'deviceSeen'], ['underSeen', 'deviceSeen', 'shieldOff'], ${JSON.stringify(ALL_SIGNAL)}]) {
        for (const k of ${JSON.stringify(ALL_SIGNAL)}) g.flags[k] = list.includes(k);
        for (const id of ['signal', 'phone']) {
          const d = g.QUESTS[id];
          if (d.title.length > 16 || ('NEW QUEST: ' + d.title).length > 28) wide.push(d.title);
          if (d.progress().length > 15) wide.push(d.progress());
          if (d.tracker().length > 16) wide.push(d.tracker());
          if (('SEE ' + d.turnIn + '!').length > 16) wide.push(d.turnIn);
        }
      }
      const restore = JSON.parse(keep); for (const k of Object.keys(g.flags)) delete g.flags[k]; Object.assign(g.flags, restore);
      T.check('every new quest title, log line and tracker fits', wide.length === 0, wide.join(' | '));
      const gear = [['weapon', 'sblade'], ['armor', 'padded'], ['armor', 'phones']].map(([k, id]) => (k === 'weapon' ? g.WEAPONS : g.ARMORS)[id]);
      T.check('new gear names fit inside the status panel (10 letters) and the gear list (14), and what the menu says about them fits in three lines',
        gear.every((it) => it.name.length <= 10 && (it.full || it.name).length <= 14 && wrap(it.desc, 16).length <= 3), gear.map((it) => it.name + ' / ' + it.full + ': ' + wrap(it.desc, 16).join('/')).join(' | '));
      T.check('the new gear: signal blade ATK +7 tuned x1.25; padded jacket DEF +5 taking 30 percent off big hits; headphones DEF +2 taking 35 percent off signal blows',
        JSON.stringify([g.WEAPONS.sblade.atk, g.WEAPONS.sblade.tuned, !!g.WEAPONS.sblade.heavy, !!g.WEAPONS.sblade.nimble, g.ARMORS.padded.def, g.ARMORS.padded.padded, !!g.ARMORS.padded.resist, !!g.ARMORS.padded.insulated, g.ARMORS.phones.def, g.ARMORS.phones.resist, !!g.ARMORS.phones.insulated])
          === '[7,1.25,false,false,5,0.3,false,false,2,0.35,false]');
      T.check('the old gear is as it was', JSON.stringify(['none', 'iron', 'crystal', 'axe', 'bat', 'wrench', 'blade'].map((k) => [g.WEAPONS[k].atk, !!g.WEAPONS[k].heavy, !!g.WEAPONS[k].nimble, !!g.WEAPONS[k].keen, !!g.WEAPONS[k].tuned])) === '[[0,false,false,false,false],[3,false,false,false,false],[7,false,false,false,false],[2,true,false,false,false],[9,false,false,false,false],[8,true,false,false,false],[7,false,true,true,false]]'
        && JSON.stringify(['none', 'vest', 'light', 'sneakers', 'rvest', 'insulated', 'factory'].map((k) => [g.ARMORS[k].def, !!g.ARMORS[k].nimble, g.ARMORS[k].insulated || 0, !!g.ARMORS[k].padded, !!g.ARMORS[k].resist])) === '[[0,false,0,false,false],[2,false,0,false,false],[1,true,0,false,false],[3,true,0,false,false],[4,false,0,false,false],[3,false,0.4,false,false],[6,false,0,false,false]]');
      T.check('the Grorud enemies and NABILAH are as they were, and only Veitvet ones are driven by the signal', JSON.stringify(['rust', 'guard', 'scrap', 'hulk', 'pwisp', 'sentinel', 'nabilah'].map((k) => [g.ENEMIES[k].hp, g.ENEMIES[k].atk, g.ENEMIES[k].def, g.ENEMIES[k].xp]))
        === '[[48,27,5,30],[64,28,8,38],[70,32,15,50],[120,33,16,85],[44,30,5,40],[96,31,11,60],[250,30,10,190]]' && Object.keys(g.ENEMIES).filter((k) => g.ENEMIES[k].signal).join() === 'bot,hound,swisp,beast,sandraBoss'
        && Object.keys(g.ENEMIES).filter((k) => g.ENEMIES[k].shock).join() === 'pwisp');
      T.check('six chapters: Veitvet ends with VEITVET SIGNAL, and Oslo S comes next without a quest', JSON.stringify(g.CHAPTERS.slice(4)) === '[{"name":"VEITVET","quest":"signal"},{"name":"OSLO S","quest":null}]' && g.CHAPTERS.length === 6);
      T.check('eighteen quests, the new two last', g.QUEST_ORDER.join() === 'slimes,biscuit,glowcap,king,shards,road,cart,under,mohsin,kebab,trouble,ball,wisp,power,bag,yard,signal,phone', g.QUEST_ORDER.join());
      T.check('no OSAKA anywhere', !/OSAKA/i.test(JSON.stringify(Object.values(g.MAPS).map((m) => [m.name, m.signs]))));
    }`,
  },
  { // THE VEITVET SIGNAL from MINA's first word to the device going dark, in the order the story suggests
    name: 'veitvet-signal', save: inVeitvet,
    run: [
      `async (T, g) => {
        ${VV}
        await T.continueGame();
        calm();
        const track = () => g.QUESTS.signal.tracker();
        T.place('veitvet', 4, 10, 'up');
        T.shot('mina');
        const offer = await hear('mina-offer');
        T.check('MINA asks about the hum, points down to the station, and notices the crystal', /hum/.test(offer) && /station/.test(offer) && /crystal in your pack/.test(offer), offer);
        T.check('VEITVET SIGNAL taken, tracked, saved', g.q.signal.s === 1 && g.tracked === 'signal' && saved().q.signal.s === 1 && track() === 'GO UNDERGROUND');
        await T.frames(20); T.shot('quest-banner');
        await T.menuShot('log');
        const hint1 = await hear('mina-hint-1');
        T.check('asked again, she says where the stairs are', /stairs/.test(hint1), hint1);
        T.place('veitvet', 13, 16, 'down');
        await T.step('down');
        await T.until(() => g.player.map === 'veitvetUnder', 'the station');
        await T.frames(60);
        T.check('down in the station: the log moves on', g.flags.underSeen === true && track() === 'FIND THE SOURCE' && g.QUESTS.signal.progress() === 'IN THE TUNNEL');
        T.place('veitvetUnder', 12, 5, 'up'); await T.frames(20); T.shot('shield');
        const field = await hear('shield');
        T.check('the shield: it blocks the way, and its cables run east', /shield/.test(field) && /east/.test(field) && g.flags.deviceSeen === true && saved().flags.deviceSeen === true && track() === 'FIND THE SWITCH', field);
        await T.step('up');
        T.check('the shield cannot be walked through', g.player.y === 5);
        T.place('veitvetUnder', 21, 4, 'up'); await T.frames(20); T.shot('breaker');
        const pull = await hear('breaker');
        T.check('the breaker: pulled once, the shield goes dark, saved', /CLUNK/.test(pull) && g.flags.shieldOff === true && saved().flags.shieldOff === true && track() === 'SIGNAL DEVICE', pull);
        T.shot('breaker-down');
        const again = await hear();
        T.check('pulled again: nothing more happens', /lever is down/.test(again) && g.flags.shieldOff === true, again);
        T.place('veitvetUnder', 12, 5, 'up');
        await T.step('up', 2);
        T.check('through where the shield was, into the chamber', g.player.x === 12 && g.player.y === 3, g.player.x + ',' + g.player.y);
        await T.frames(20); T.shot('device');
        await T.tap('Space', 3);
        let i = 0, said = [], lost = false, shotPulse = false;
        while (g.mode === 'dialog') {
          if (++i > 20) throw new Error('never ended');
          await T.frames(150);
          said.push(g.dlg.pages[g.dlg.page].join(' '));
          if (g.dlg.pages[g.dlg.page].join(' ') === 'SIGNAL LOST...') { lost = g.flags.signalOff === true; }
          T.shot('device-p' + i);
          await T.tap('Space', 3);
          if (!shotPulse && g.pulseT > 0) { for (let f = 0; f < 4 && !(Math.floor(g.pulseT / 6) % 2 === 0); f++) await T.frames(1); shotPulse = true; T.shot('signal-pulse'); }
        }
        const all = said.join(' | ');
        T.check('SIGNAL LOST... and then SOURCE MOVED., each on its own', said.includes('SIGNAL LOST...') && said.includes('SOURCE MOVED.') && said.indexOf('SIGNAL LOST...') < said.indexOf('SOURCE MOVED.') && lost, all);
        T.check('the screen pulsed and the device is off for good, saved', shotPulse && g.flags.signalOff === true && saved().flags.signalOff === true);
        T.check('the device and its relays have gone dark, and the centre doors are open', g.MAPS.veitvetUnder.gates['12,2'].open === 'ü' && g.MAPS.veitvet.gates['21,3'].open === 'å' && ['11,2', '13,2'].every((k) => g.flags[g.MAPS.veitvetUnder.gates[k].flag]));
        T.check('the log points at SANDRA in the centre', track() === 'SANDRA: CENTER' && g.QUESTS.signal.progress() === 'IN THE CENTER' && g.q.signal.s === 1);
        await T.frames(80); T.shot('device-dead');
        const dead = await hear();
        T.check('the device again: dead, nothing more', /dead/.test(dead) && g.mode === 'world', dead);
        T.state('device-off');
      }`,
      `async (T, g) => {
        ${VV}
        await T.continueGame();
        calm();
        T.check('CONTINUE: the device stays dead, the shield down, the doors open', g.flags.signalOff === true && g.flags.shieldOff === true && g.player.map === 'veitvetUnder');
        T.place('veitvet', 4, 10, 'up');
        const hint = await hear('mina-sandra');
        T.check('MINA now names SANDRA and the centre', /SANDRA/.test(hint) && /CENTER/.test(hint), hint);
        T.place('veitvet', 21, 4, 'up'); await T.frames(20); T.shot('center-open');
        await T.step('up');
        await T.until(() => g.player.map === 'veitvetCenter', 'the centre');
        await T.frames(20); T.shot('center');
        await T.frames(40);
        T.check('through the open doors into VEITVET CENTER, autosaved', g.player.x === 11 && g.player.y === 14 && saved().player.map === 'veitvetCenter');
        T.place('veitvetCenter', 10, 6, 'up'); await T.frames(20); T.shot('stage');
        T.check('SANDRA is there to be seen on her stage, with her masts buzzing', g.NPCS.some((n) => n.id === 'sandra' && n.x === 10 && n.y === 3) && !g.flags.sandraBeaten);
        T.place('veitvetCenter', 11, 14, 'down');
        await T.step('down');
        await T.until(() => g.player.map === 'veitvet', 'back out');
        await T.frames(60);
        T.check('and out again', g.player.x === 21 && g.player.y === 4 && g.player.dir === 'down');
        T.state('center');
      }`,
    ],
  },
  { // the other way round: everything found before MINA has asked, and MINA keeping up
    name: 'veitvet-signal-any-order', save: moved(chapterFourDone, 'veitvetUnder', 21, 4, 'up'),
    run: [
      `async (T, g) => {
        ${VV}
        await T.continueGame();
        calm();
        T.check('no quest yet, standing at the breaker', g.q.signal.s === 0 && g.tracked === null);
        await hear();
        T.check('the breaker can be pulled before anybody has asked, or the device been seen', g.flags.shieldOff === true && !g.flags.deviceSeen && g.q.signal.s === 0);
        T.place('veitvetUnder', 12, 3, 'up');
        await hear();
        T.check('and the device shut down', g.flags.signalOff === true && g.q.signal.s === 0 && g.tracked === null);
        T.place('veitvet', 4, 10, 'up');
        const offer = await hear('mina-late');
        T.check('MINA: the hum stopped, the centre opened, will the hero find out who', /stopped/.test(offer) && /CENTER/.test(offer) && !/old station, down the stairs/.test(offer), offer);
        T.check('the quest starts right where the story is: SANDRA, in the centre', g.q.signal.s === 1 && g.QUESTS.signal.tracker() === 'SANDRA: CENTER');
        T.state('caught-up');
      }`,
    ],
  },
  { // SANDRA beaten before MINA was ever asked: MINA takes it in, gives it back, and the chapter ends, once
    name: 'veitvet-signal-sandra-first', save: (() => { const d = sandraDone(withSignal(moved(chapterFourDone, 'veitvet', 4, 10, 'up'), ALL_SIGNAL)); d.q.signal = { s: 0 }; d.tracked = null; return d; })(),
    run: `async (T, g) => {
      ${VV}
      await T.continueGame();
      const said = await hear('mina');
      T.check('MINA hears the whole story at once: taken, ready and handed in', /was that you/.test(said) && /OSLO S/.test(said) && g.q.signal.s === 3, said);
      await T.until(() => g.mode === 'victory', 'the chapter screen');
      await T.frames(120);
      await T.tap('Space');
      await T.until(() => g.mode === 'world', 'the world');
      await T.frames(40);
      T.check('the east gate is open and the chapter over', g.flags.osloGate === true && g.chapter === 5 && saved().q.signal.s === 3);
    }`,
  },
  { // LOST PHONE the usual way round: asked first, then found, then handed back for the headphones
    name: 'veitvet-phone', save: moved(inVeitvet, 'veitvet', 8, 15, 'up'),
    run: [
      `async (T, g) => {
        ${VV}
        await T.continueGame();
        calm();
        T.check('ELIAS by the playground, with a mark', g.NPCS.find((n) => n.id === 'elias').news());
        const offer = await hear('elias-offer');
        T.check('LOST PHONE taken, tracked', g.q.phone.s === 1 && g.tracked === 'phone' && g.QUESTS.phone.tracker() === 'FIND THE PHONE' && /south-east/.test(offer), offer);
        T.place('veitvet', 26, 14, 'up'); await T.frames(20); T.shot('phone');
        await T.step('up');
        await T.until(() => g.mode === 'dialog', 'finding it');
        const found = await (async () => { const out = []; while (g.mode === 'dialog') { await T.frames(150); out.push(g.dlg.pages[g.dlg.page].join(' ')); await T.tap('Space', 3); } await T.frames(10); return out.join(' '); })();
        T.check('the phone: picked up, the quest ready, saved', /Take it back to ELIAS/.test(found) && g.flags.phone === true && g.q.phone.s === 2 && saved().flags.phone === true && saved().q.phone.s === 2, found);
        await T.step('down'); await T.step('up');
        T.check('it is not there twice', g.mode === 'world' && g.q.phone.s === 2);
        T.place('veitvet', 8, 15, 'up');
        const armors = g.player.armors.slice();
        const thanks = await hear('elias-thanks');
        T.check('HEADPHONES, once; LOST PHONE done; the old armour kept', g.player.armors.filter((a) => a === 'phones').length === 1 && armors.every((a) => g.player.armors.includes(a)) && g.q.phone.s === 3 && saved().q.phone.s === 3 && /HEADPHONES/.test(thanks) && /armour/.test(thanks), thanks);
        T.check('nothing put on by itself', g.player.armor === 'insulated');
        await hear('elias-after');
        T.check('nothing twice', g.player.armors.filter((a) => a === 'phones').length === 1 && g.q.phone.s === 3);
        await T.tap('KeyX', 6); await T.tap('ArrowUp', 4); await T.tap('ArrowUp', 4);
        T.check('the armour line', g.menuSel === 1);
        while (g.player.armor !== 'phones') await T.tap('Space', 4);
        T.shot('headphones-on');
        await T.tap('ArrowDown', 4); await T.tap('ArrowDown', 4); await T.tap('Space', 6);
        T.check('saved by hand with them on', g.menuNote && g.menuNote.text === 'SAVED!' && saved().player.armor === 'phones');
        await T.tap('KeyX', 6);
        T.state('phone-done');
      }`,
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: headphones on and kept, the phone gone for good', g.player.armor === 'phones' && g.q.phone.s === 3 && g.flags.phone === true && !g.ITEMS.some((i) => i.id === 'phone' && !g.flags.phone));
        await T.menuShot('status');
      },
    ],
  },
  { // LOST PHONE the other way round: the phone found first, ELIAS takes it at once
    name: 'veitvet-phone-early', save: moved(inVeitvet, 'veitvet', 26, 14, 'up'),
    run: `async (T, g) => {
      ${VV}
      await T.continueGame();
      calm();
      await T.step('up');
      await T.until(() => g.mode === 'dialog', 'finding it');
      const found = await (async () => { const out = []; while (g.mode === 'dialog') { await T.frames(150); T.shot('early-p' + (out.length + 1)); out.push(g.dlg.pages[g.dlg.page].join(' ')); await T.tap('Space', 3); } await T.frames(10); return out.join(' '); })();
      T.check('found before anybody asked: the early lines, kept, the quest not started', /must be missing this/.test(found) && g.flags.phone === true && g.q.phone.s === 0 && saved().flags.phone === true, found);
      T.place('veitvet', 8, 15, 'up');
      const said = await hear('elias');
      T.check('ELIAS: found before he even asked; taken, ready and done in one go; HEADPHONES once', /before I even asked/.test(said) && g.q.phone.s === 3 && g.player.armors.filter((a) => a === 'phones').length === 1, said);
      await hear();
      T.check('and nothing more', g.player.armors.filter((a) => a === 'phones').length === 1 && g.q.phone.s === 3);
    }`,
  },
  { // MARIANNE, before the device, after it, and after SANDRA
    name: 'veitvet-marianne', save: moved(inVeitvet, 'veitvet', 7, 6, 'up'),
    run: `async (T, g) => {
      ${VV}
      await T.continueGame();
      T.shot('marianne');
      const one = await hear('before');
      g.flags.signalOff = true;
      const two = await hear('after-device');
      g.flags.sandraBeaten = true;
      const three = await hear('after-sandra');
      T.check('before the device: bots, hounds, the hum, and the golems below (the wrench noticed)', /STREET BOTS/.test(one) && /crouch/.test(one) && /hum/.test(one) && /wrench/.test(one), one);
      T.check('after the device: the hum is gone, and SANDRA on the stage', /hum is gone/.test(two) && /SANDRA/.test(two) && /block/.test(two), two);
      T.check('after SANDRA: peace and quiet, and the road to OSLO S', /quiet/.test(three) && /OSLO S/.test(three), three);
      T.check('three different talks, no quest, nothing given', one !== two && two !== three && g.q.signal.s === 0 && g.player.gold === 1100 && !g.NPCS.find((n) => n.id === 'marianne').news);
    }`,
  },
  { // NOAH, stuck in the station: pulled free once, a small reward once, and up in the square afterwards
    name: 'veitvet-noah', save: (() => { const d = moved(chapterFourDone, 'veitvetUnder', 7, 4, 'up'); d.player.herbs = 2; return d; })(),
    run: [
      `async (T, g) => {
        ${VV}
        await T.continueGame();
        calm();
        T.check('NOAH is stuck in his corner', g.NPCS.find((n) => n.id === 'noah').visible() && !g.NPCS.find((n) => n.id === 'noah2').visible());
        T.shot('noah');
        const said = await hear('noah');
        T.check('pulled free: 60 gold and the herbs refilled, once; and a tip about the breaker', g.flags.noahHelped === true && g.player.gold === 1160 && g.player.herbs === 7 && saved().flags.noahHelped === true && /breaker/.test(said), said);
        T.check('he is gone from the station, and stands in the square', !g.NPCS.find((n) => n.id === 'noah').visible() && g.NPCS.find((n) => n.id === 'noah2').visible());
        await T.tap('Space', 3);
        T.check('nobody left to pull', g.mode === 'world');
        T.place('veitvet', 19, 9, 'up');
        await hear('noah-square');
        T.check('in the square he only talks', g.player.gold === 1160);
      }`,
      async (T, g) => {
        await T.continueGame();
        g.player.herbs = 1;
        T.place('veitvetUnder', 7, 4, 'up');
        await T.tap('Space', 3);
        T.check('CONTINUE: NOAH stays rescued, the reward is not given again', g.mode === 'world' && g.player.gold === 1160 && g.player.herbs === 1);
      },
    ],
  },
  { // the SIGNAL BEAST in the side tunnel: run from it and it stays; beat it and the SIGNAL BLADE is there to take
    name: 'veitvet-beast', save: moved(chapterFourDone, 'veitvetUnder', 23, 13, 'down'),
    run: [
      `async (T, g) => {
        ${VV}
        ${WATCH}
        await T.continueGame();
        calm();
        T.shot('beast');
        await hear('beast');
        await T.untilBattle();
        let b = g.battle;
        T.check('the SIGNAL BEAST: 140 HP, ATK 34 and 10 percent more while the signal runs, DEF 11, no boss', b.type === 'beast' && b.max === 140 && b.atk === 37 && b.def === 11 && b.xp === 110 && !b.boss && b.boosted, JSON.stringify([b.max, b.atk, b.def, b.xp, b.boosted]));
        T.shot('battle');
        await T.fight(() => 2);
        T.check('got away: it still blocks the tunnel', g.mode === 'world' && g.NPCS.find((n) => n.id === 'beast').visible() && !g.flags.beastBeaten && g.stats.won === 130);
        g.player.hp = g.player.maxhp;
        await T.tap('Space', 3);
        while (g.mode === 'dialog') { await T.frames(150); await T.tap('Space', 3); }
        await T.untilBattle();
        b = g.battle;
        const { turns, seen } = await watchFight(55, [['howl', /howls/], ['defeated', /fizzles/]]);
        T.check('beaten: it howls (a signal blow) every third turn, and it is gone for good', seen.howl >= 1 && seen.defeated === 1 && g.flags.beastBeaten === true && !g.NPCS.find((n) => n.id === 'beast').visible() && g.stats.won === 131, JSON.stringify(seen) + ' ' + turns);
        T.place('veitvetUnder', 23, 15, 'down');
        await T.step('down'); await T.step('left');
        await T.until(() => g.mode === 'dialog', 'the chest');
        const chest = await (async () => { const out = []; while (g.mode === 'dialog') { await T.frames(150); T.shot('chest-p' + (out.length + 1)); out.push(g.dlg.pages[g.dlg.page].join(' ')); await T.tap('Space', 3); } await T.frames(10); return out.join(' '); })();
        T.check('the SIGNAL BLADE, under its full name, once', /SIGNAL BLADE/.test(chest) && g.player.weapons.filter((w) => w === 'sblade').length === 1 && g.flags.chestSblade === true, chest);
        T.state('blade');
      }`,
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: the beast stays beaten, the blade kept, the chest empty', g.flags.beastBeaten === true && !g.NPCS.find((n) => n.id === 'beast').visible() && g.player.weapons.includes('sblade') && g.flags.chestSblade === true);
      },
    ],
  },
  { // the other chests, the gear menu with Veitvet's gear in it, and keeping it all over a save
    name: 'veitvet-chests', save: (() => { const d = withSignal(moved(chapterFourDone, 'veitvet', 1, 17, 'down'), ALL_SIGNAL); d.player.weapons.push('sblade'); d.player.armors.push('phones'); return d; })(),
    run: [
      `async (T, g) => {
        ${VV}
        await T.continueGame();
        calm();
        const take = async (map, x, y, dir) => {
          const from = { left: [1, 0], right: [-1, 0], up: [0, 1], down: [0, -1] }[dir];
          T.place(map, x + from[0], y + from[1], dir);
          await T.step(dir);
          await T.until(() => g.mode === 'dialog', 'a chest');
          const out = []; while (g.mode === 'dialog') { await T.frames(150); out.push(g.dlg.pages[g.dlg.page].join(' ')); await T.tap('Space', 3); } await T.frames(10);
          return out.join(' ');
        };
        const gold = g.player.gold;
        const a = await take('veitvet', 1, 18, 'down');
        T.check('behind the playground: 90 gold', /90 gold/.test(a) && g.player.gold === gold + 90, a);
        const b = await take('veitvetCenter', 1, 6, 'left');
        T.check('in the closed shop: the PADDED JACKET under its full name', /PADDED JACKET/.test(b) && g.player.armors.filter((x) => x === 'padded').length === 1, b);
        const c = await take('veitvetCenter', 19, 6, 'right');
        T.check('in the east wing: 120 gold', /120 gold/.test(c) && g.player.gold === gold + 210, c);
        T.check('all saved', ['chestVeitvet', 'chestPadded', 'chestCenter'].every((k) => saved().flags[k] === true));
        T.place('veitvetCenter', 2, 6, 'left'); await T.step('left');
        T.check('an opened chest is gone', g.mode === 'world' && g.player.gold === gold + 210);
        await T.tap('KeyX', 6);
        await T.tap('ArrowUp', 4); await T.tap('ArrowUp', 4);
        T.check('the armour line: seven armours, five shown with arrows', g.menuSel === 1 && g.player.armors.length === 7);
        T.shot('armours-insulated');
        const seen = [];
        for (let i = 0; i < 7; i++) { await T.tap('Space', 4); seen.push(g.player.armor); if (g.player.armor === 'padded') T.shot('armours-padded'); if (g.player.armor === 'phones') T.shot('armours-phones'); }
        T.check('round the whole list and back, in table order', seen.join() === 'factory,padded,phones,none,vest,sneakers,insulated', seen.join());
        while (g.player.armor !== 'padded') await T.tap('Space', 4);
        await T.tap('ArrowUp', 4);
        T.check('the weapon line: six weapons', g.menuSel === 0 && g.player.weapons.length === 6);
        while (g.player.weapon !== 'sblade') await T.tap('Space', 4);
        T.shot('weapons-sblade');
        await T.tap('ArrowDown', 4); await T.tap('ArrowDown', 4); await T.tap('ArrowDown', 4);
        await T.tap('Space', 6);
        T.check('saved by hand', g.menuNote && g.menuNote.text === 'SAVED!');
        T.shot('status');
        await T.tap('KeyX', 6);
      }`,
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: signal blade and padded jacket on, every weapon and armour kept', g.player.weapon === 'sblade' && g.player.armor === 'padded' && g.player.weapons.length === 6 && g.player.armors.length === 7);
        T.check('ATK 28 + 7, DEF 12 + 5', g.player.atk + g.WEAPONS.sblade.atk === 35 && g.player.def + g.ARMORS.padded.def === 17);
        T.check('no chest comes back', ['chestVeitvet', 'chestPadded', 'chestCenter'].every((k) => g.flags[k] === true));
        await T.menuShot('status');
      },
    ],
  },
  { // each of Veitvet's monsters, met for certain on a chosen tile; the signal's 10 percent, before and after; the gear
    name: 'veitvet-enemies', save: (() => { const d = JSON.parse(JSON.stringify(inVeitvet)); d.player.weapons.push('sblade'); d.player.armors.push('padded', 'phones'); return d; })(),
    run: `async (T, g) => {
      ${MEET}
      await T.continueGame();
      const stats = (b) => JSON.stringify([b.max, b.atk, b.def, b.xp]);
      const full = () => { g.player.hp = g.player.maxhp; };
      const wear = (w, a) => { g.player.weapon = w; g.player.armor = a; full(); };
      // hero LV12: ATK 28, DEF 12. The signal is live.
      wear('wrench', 'insulated');
      await meet(3, 8, 'right', 0, 'veitvetUnder');
      let b = g.battle;
      T.check('a street bot in the tunnel, the underground behind it: ATK 29 plus 10 percent while the signal runs', b.type === 'bot' && b.name === 'STREET BOT' && stats(b) === '[50,32,6,36]' && b.boosted && b.backdrop === 'underground', b.type + ' ' + stats(b));
      const bite = g.player.maxhp - g.player.hp;
      T.check('quick: it nipped first (32 + 0..2 against DEF 15)', bite >= 17 && bite <= 19 && b.turn === 0, bite);
      T.shot('bot-boosted');
      T.check('the wrench: 28 + 8 + 1 - 6 = 31', await swing() === 31);
      await T.fight(cautious);
      wear('blade', 'insulated');
      await meet(3, 8, 'right', 0, 'veitvetUnder');
      T.check('with the QUICK BLADE it gets no opening nip', g.player.hp === g.player.maxhp && g.battle.type === 'bot');
      await T.fight(cautious);
      wear('wrench', 'padded');
      await meet(3, 8, 'right', 0.5, 'veitvetUnder');
      b = g.battle;
      T.check('a shadow hound: ATK 32 plus 10 percent, waits for the hero', b.type === 'hound' && stats(b) === '[52,35,5,40]' && b.boosted && g.player.hp === g.player.maxhp, stats(b));
      T.shot('hound');
      let crouched = false, pounced = false, softened = false, last = '';
      while (g.mode === 'battle') {
        await T.until(() => g.mode !== 'battle' || b.phase === 'menu', 'menu');
        if (g.mode !== 'battle') break;
        if (b.charged && !crouched) { crouched = true; T.shot('hound-crouch'); }
        g.player.hp = g.player.maxhp;
        if (!pounced) b.hp = b.max; // (kept alive until it has pounced)
        while (b.menu !== 0) await T.tap('ArrowDown', 1);
        await T.tap('Space', 1);
        await T.until(() => g.mode !== 'battle' || b.phase !== 'menu', 'start');
        while (g.mode === 'battle' && b.phase !== 'menu') { if (b.msg !== last) { last = b.msg; if (/POUNCES/.test(b.msg)) pounced = true; if (/softens the blow/.test(b.msg)) softened = true; } await T.frames(1); }
      }
      await T.frames(70);
      T.check('it crouches low before it pounces, and the PADDED JACKET softens the pounce', crouched && pounced && softened);
      wear('wrench', 'insulated');
      await meet(3, 8, 'right', 0.9, 'veitvetUnder');
      b = g.battle;
      const zap1 = g.player.maxhp - g.player.hp;
      T.check('a signal wisp: quick, ATK 31 plus 10 percent; its nip is a signal blow, and the insulated vest is no help (34..36 - 15)', b.type === 'swisp' && stats(b) === '[46,34,6,42]' && zap1 >= 19 && zap1 <= 21, stats(b) + ' ' + zap1);
      T.shot('swisp');
      await T.fight(cautious);
      wear('wrench', 'phones');
      await meet(3, 8, 'right', 0.9, 'veitvetUnder');
      const zap2 = g.player.maxhp - g.player.hp;
      T.check('in the HEADPHONES its nip is muffled: (34..36 - 14) less 35 percent', zap2 >= 13 && zap2 <= 14, zap2);
      await T.until(() => /muffle/.test(g.battle.msg) || g.battle.phase === 'menu', 'the headphones line');
      T.check('and the headphones said so', g.battle.resistSaid === true);
      T.shot('swisp-headphones');
      await T.fight(cautious);
      wear('wrench', 'insulated');
      await meet(15, 8, 'right', 0.5, 'veitvetUnder');
      b = g.battle;
      T.check('an underground golem in the east tunnel: armoured, not driven by the signal', b.type === 'ugolem' && b.name === 'UNDERGROUND GOLEM' && stats(b) === '[84,34,17,58]' && !b.boosted, stats(b));
      T.shot('ugolem');
      T.check('the heavy wrench straight through its armour: 37', await swing() === 37);
      const hp = g.player.hp;
      await T.until(() => b.phase === 'menu', 'menu');
      T.check('on its first turn it only gathers grit', g.player.hp === hp && b.turn === 1);
      await T.fight(cautious);
      wear('bat', 'insulated');
      await meet(15, 8, 'right', 0.5, 'veitvetUnder');
      T.check("MARCUS' bat against its armour: 21", await swing() === 21);
      await T.fight(cautious);
      wear('sblade', 'insulated');
      await meet(15, 8, 'right', 0.5, 'veitvetUnder');
      T.check('the SIGNAL BLADE is no help against it: 28 + 7 + 1 - 17 = 19', await swing() === 19);
      await T.fight(cautious);
      wear('wrench', 'insulated');
      await meet(9, 7, 'down', 0, 'veitvetCenter');
      b = g.battle;
      T.check('a Veitvet guard in the centre, the centre behind it', b.type === 'vguard' && stats(b) === '[74,31,10,46]' && !b.boosted && b.backdrop === 'center', stats(b));
      T.shot('vguard');
      T.check('the wrench: 27', await swing() === 27);
      await T.fight(cautious);
      wear('wrench', 'insulated');
      await meet(20, 15, 'down', 0, 'veitvet');
      T.check('a street bot on the lawn, Veitvet behind it', g.battle.type === 'bot' && g.battle.backdrop === 'veitvet');
      T.shot('bot-lawn');
      await T.fight(cautious);
      // the device is off: the signal's 10 percent is gone
      g.flags.signalOff = true;
      wear('sblade', 'insulated');
      await meet(3, 8, 'right', 0, 'veitvetUnder');
      b = g.battle;
      T.check('the device off: the street bot is back to ATK 29, no hum', b.type === 'bot' && stats(b) === '[50,29,6,36]' && !b.boosted, stats(b));
      T.shot('bot-calm');
      T.check('the SIGNAL BLADE cuts it deeper: (28 + 7 + 1 - 6) x 1.25 = 38', await swing() === 38);
      await T.until(() => /hums and cuts deep/.test(b.msg) || b.phase === 'menu', 'the blade line');
      T.check('and says so', /hums and cuts deep/.test(b.msg));
      T.shot('sblade-hum');
      await T.fight(cautious);
      await meet(3, 8, 'right', 0.5, 'veitvetUnder');
      T.check('the hound back to ATK 32', g.battle.type === 'hound' && stats(g.battle) === '[52,32,5,40]' && !g.battle.boosted);
      await T.fight(cautious);
      await meet(3, 8, 'right', 0.9, 'veitvetUnder');
      T.check('the wisp back to ATK 31', g.battle.type === 'swisp' && stats(g.battle) === '[46,31,6,42]' && !g.battle.boosted);
      await T.fight(cautious);
      // nothing outside Veitvet cares about the signal
      wear('wrench', 'insulated');
      for (const off of [false, true]) {
        g.flags.signalOff = off;
        await meet(5, 15, 'down', 0, 'grorudHeights');
        T.check('a Grorud rust rat is the same with the signal ' + (off ? 'off' : 'on'), g.battle.type === 'rust' && stats(g.battle) === '[48,27,5,30]' && !g.battle.boosted);
        await T.fight(cautious);
      }
      T.state('after');
    }`,
  },
  { // back to MINA: the chapter ends, the east gate opens, and the road to Oslo S stops at a barricade
    name: 'veitvet-chapter', save: (() => { const d = sandraDone(withSignal(moved(chapterFourDone, 'veitvet', 4, 10, 'up'), ALL_SIGNAL)); d.q.phone = { s: 1 }; return d; })(),
    run: [
      `async (T, g) => {
        ${VV}
        await T.continueGame();
        calm();
        T.check('ready to report, Chapter 5, the east gate shut', g.q.signal.s === 2 && g.chapter === 4 && !g.storyDone && g.NPCS.find((n) => n.id === 'mina').news() && !g.flags.osloGate);
        let spoke = false, said = [];
        await T.tap('Space', 3);
        while (g.mode === 'dialog') {
          await T.frames(150);
          said.push(g.dlg.pages[g.dlg.page].join(' '));
          if (g.dlg.name === 'MICHAEL') { if (!spoke) T.shot('hero-speaks'); spoke = true; } else T.shot('mina-p' + said.length);
          await T.tap('Space', 3);
        }
        T.check("the hero answers under the hero's own name; MINA sees the four fragments and points to OSLO S", spoke && /four/.test(said.join(' ')) && /OSLO S/.test(said.join(' ')), said.join(' | '));
        await T.until(() => g.mode === 'victory', 'the chapter screen');
        await T.frames(120);
        T.shot('chapter-complete');
        T.check('VEITVET SIGNAL is done and saved, and the east gate opened with it', g.q.signal.s === 3 && saved().q.signal.s === 3 && g.flags.osloGate === true && saved().flags.osloGate === true);
        await T.tap('Space');
        await T.until(() => g.mode === 'world', 'the world');
        await T.frames(40);
        T.check('Chapter 6 now: Oslo S, and the story is not over', g.chapter === 5 && !g.storyDone && g.CHAPTERS[5].name === 'OSLO S' && g.player.map === 'veitvet');
        T.check('LOST PHONE is still being looked for, and is tracked again', g.q.phone.s === 1 && g.tracked === 'phone');
        const flags = JSON.stringify(g.flags), gold = g.player.gold;
        await T.talk('mina-after-1'); await T.talk('mina-after-2');
        T.check('no second chapter screen, nothing given twice', g.mode === 'world' && JSON.stringify(g.flags) === flags && g.player.gold === gold);
        T.place('veitvet', 26, 10, 'right'); await T.frames(20); T.shot('east-gate-open');
        await T.step('right');
        await T.until(() => g.player.map === 'osloRoad', 'the road to Oslo S');
        await T.frames(20);
        T.shot('road');
        await T.frames(40);
        T.check('onto the ROAD TO OSLO S, autosaved', g.player.x === 1 && g.player.y === 5 && saved().player.map === 'osloRoad');
        await T.step('right', 12);
        T.check('along the road', g.player.x === 13 && g.player.y === 5, g.player.x + ',' + g.player.y);
        await T.step('right');
        T.check('the barricade stops the hero', g.player.x === 13 && g.player.map === 'osloRoad');
        const end = await hear('barricade');
        T.check('TO BE CONTINUED, and never Osaka', /TO BE CONTINUED/.test(end) && /OSLO S/.test(end) && !/OSAKA/i.test(end) && g.mode === 'world', end);
        g.player.dir = 'up';
        await T.talk('sign');
        T.check('no victory screen, no new map', g.mode === 'world' && Object.keys(g.MAPS).length === 18 && !g.storyDone);
        T.shot('barricade');
        for (const [x, y, d] of [[13, 4, 'right'], [13, 6, 'right'], [14, 4, 'right'], [14, 6, 'right']]) {
          T.place('osloRoad', x, y, d); await T.step(d);
        }
        T.check('there is no way round it', g.player.map === 'osloRoad' && g.player.x <= 14);
        await T.tap('KeyX', 6);
        await T.tap('ArrowUp', 4);
        T.check('ITEMS: four fragments', g.menuSel === 3);
        T.shot('items');
        await T.tap('KeyX', 6);
        T.place('osloRoad', 1, 5, 'left');
        await T.step('left');
        await T.until(() => g.player.map === 'veitvet', 'back to town');
        await T.frames(60);
        T.check('back through the east gate', g.player.x === 26 && g.player.y === 10 && g.player.dir === 'left');
        T.place('osloRoad', 12, 5, 'right');
        await T.tap('KeyX', 6); await T.tap('Space', 6); await T.tap('KeyX', 6);
        T.state('chapter-done');
      }`,
      `async (T, g) => {
        ${VV}
        await T.continueGame();
        T.check('CONTINUE on the road to Oslo S: chapter, gate and everything from before', g.player.map === 'osloRoad' && g.chapter === 5 && g.q.signal.s === 3 && g.flags.osloGate === true
          && ['fragment1', 'fragment2', 'fragment3', 'fragment4', 'signalOff', 'sandraBeaten', 'veitvetGate', 'factoryKey', 'nabilahBeaten'].every((k) => g.flags[k] === true));
        T.shot('continued');
        T.place('veitvetCenter', 10, 4, 'up');
        const said = await hear('sandra-later');
        T.check('SANDRA stays beaten: no battle, nothing more', g.mode === 'world' && g.stats.won === 130 && /OSLO S|speakers|MINA/.test(said), said);
        T.state('later');
      }`,
    ],
  },
  { // the on-screen buttons: along the road, MINA's offer, the log, the armour, and down the station stairs
    name: 'veitvet-touch', save: withHero(chapterFourDone, 'alexandra'),
    run: `async (T, g) => {
      await T.continueGame();
      for (const m of ['veitvet', 'veitvetUnder']) g.MAPS[m].encounter.chance = 0;
      for (let i = 0; i < 3 && g.player.map === 'veitvetRoad'; i++) await T.touch('right', 20);
      await T.until(() => g.player.map === 'veitvet', 'Veitvet');
      await T.frames(60);
      T.check('the D-pad walks into Veitvet', g.player.x === 1 && g.player.y === 10);
      T.place('veitvet', 4, 10, 'up');
      await T.touch('a');
      T.check('A talks to MINA', g.mode === 'dialog' && g.dlg.name === 'MINA', g.mode);
      for (let i = 0; g.mode === 'dialog' && i < 12; i++) { await T.frames(150); await T.touch('a', 3); }
      T.check('the quest is taken', g.q.signal.s === 1 && g.mode === 'world');
      await T.touch('b');
      T.check('B opens the log on the page of the new quest', g.mode === 'menu' && g.menuPage === 3, g.menuPage);
      T.shot('log');
      await T.touch('up'); await T.touch('up');
      await T.touch('a');
      T.check('A changes the armour', g.player.armor === 'factory', g.player.armor);
      await T.touch('b');
      T.place('veitvet', 13, 16, 'down');
      await T.touch('down', 30);
      await T.until(() => g.player.map === 'veitvetUnder', 'the station');
      await T.frames(60);
      T.check('the D-pad goes down the stairs', g.player.x === 2 && g.player.y === 15);
    }`,
  },
  { // a save on what was open road in 1G and is a block wall now wakes the hero on the nearest open ground
    name: 'veitvet-settle', save: moved(chapterFourDone, 'veitvetRoad', 12, 1, 'up'),
    run: `async (T, g) => {
      await T.continueGame();
      const m = g.MAPS.veitvetRoad;
      T.check('off the wall, onto open ground next to it', g.player.map === 'veitvetRoad' && !g.SOLID.has(m.rows[g.player.y][g.player.x]) && Math.abs(g.player.x - 12) + Math.abs(g.player.y - 1) <= 2, g.player.x + ',' + g.player.y);
    }`,
  },
];
// A save exactly as the published 1G game (commit 5a8fcda) wrote it, byte for byte: made by playing that version
// from TOBIAS' hand-in, through the chapter screen and the east gate, along the road to the barricade (which 1G
// kept solid, "TO BE CONTINUED"), and saving by hand in front of it. It has no Veitvet quest.
const REAL_1G_SAVE = {"v":1,"player":{"map":"veitvetRoad","x":12,"y":5,"dir":"right","moving":false,"fx":12,"fy":5,"tx":12,"ty":5,"t":0,"lvl":12,"hp":104,"maxhp":112,"atk":28,"def":12,"xp":388,"next":1021,"herbs":5,"maxHerbs":7,"gold":1214,"weapon":"wrench","armor":"insulated","weapons":["none","crystal","bat","wrench","blade"],"armors":["none","vest","sneakers","insulated","factory"],"shards":0,"glowcaps":0,"sickle":true,"sinceBattle":3,"hero":"celine"},"q":{"slimes":{"s":3,"n":3},"biscuit":{"s":3},"glowcap":{"s":3},"king":{"s":3},"shards":{"s":3},"road":{"s":3,"n":3},"cart":{"s":3},"under":{"s":3},"mohsin":{"s":3},"kebab":{"s":3},"trouble":{"s":3,"c":3,"r":3,"b":2},"ball":{"s":3},"wisp":{"s":3},"power":{"s":3},"bag":{"s":3},"yard":{"s":3,"n":2}},"flags":{"vines":true,"metBram":true,"shard1":true,"shard2":true,"fragment1":true,"redKey":true,"redGate":true,"tunnelOpen":true,"northOpen":true,"mohsinBeaten":true,"fragment2":true,"blueKey":true,"blueGate":true,"kebab":true,"marcusBeaten":true,"marcusBat":true,"ball":true,"wispFragment":true,"chestPouch":true,"grorudGate":true,"metNadia":true,"cell1":true,"bag":true,"chestWrench":true,"chestBlade":true,"cell2":true,"cell3":true,"worksOpen":true,"chestArmor":true,"nabilahBeaten":true,"fragment3":true,"factoryKey":true,"veitvetGate":true},"stats":{"won":131,"slimes":17,"steps":7372},"tracked":null};
const real1gScenario = {
  name: 'veitvet-real-1g-save', save: REAL_1G_SAVE,
  run: [
    async (T, g) => {
      const KEY = 'turnip-vale-save-v1', saved = () => JSON.parse(localStorage.getItem(KEY));
      await T.continueGame();
      const p = g.player;
      T.check('CONTINUE: where the barricade stood, Chapter 5, nothing of Veitvet started, everything from 1G there', p.map === 'veitvetRoad' && p.x === 12 && p.y === 5 && g.chapter === 4
        && g.q.signal.s === 0 && g.q.phone.s === 0 && p.hero === 'celine' && p.lvl === 12 && p.xp === 388 && p.gold === 1214 && p.herbs === 5 && p.hp === 104);
      T.shot('road');
      await T.tap('Space', 6);
      T.check('A where the barricade was: no 1G line any more', g.mode === 'world');
      await T.step('right', 3);
      await T.until(() => g.player.map === 'veitvet', 'Veitvet');
      await T.frames(60);
      T.check('straight on into VEITVET', p.x === 1 && p.y === 10 && p.dir === 'right');
      const d = saved();
      T.check('autosaved with everything the 1G save had: quests, fragments 1-3, bosses, gates, gear', d.player.map === 'veitvet' && T.questsKept(d.q, REAL.q) && Object.keys(REAL.flags).every((k) => d.flags[k] === REAL.flags[k])
        && JSON.stringify(d.player.weapons) === JSON.stringify(REAL.player.weapons) && JSON.stringify(d.player.armors) === JSON.stringify(REAL.player.armors) && d.player.weapon === 'wrench' && d.player.armor === 'insulated'
        && d.player.hero === 'celine' && d.player.lvl === 12 && d.player.xp === 388 && d.player.gold === 1214 && d.player.herbs === 5 && d.player.maxHerbs === 7
        && ['fragment1', 'fragment2', 'fragment3', 'mohsinBeaten', 'marcusBeaten', 'nabilahBeaten', 'redGate', 'blueGate', 'grorudGate', 'worksOpen', 'veitvetGate'].every((k) => d.flags[k] === true));
    },
    async (T, g) => {
      await T.continueGame();
      T.check('CONTINUE in Veitvet', g.player.map === 'veitvet' && g.player.x === 1 && g.player.y === 10);
      T.place('veitvet', 1, 10, 'left');
      await T.touch('left', 30);
      await T.until(() => g.player.map === 'veitvetRoad', 'the road');
      await T.frames(60);
      T.check('back along the road with the D-pad', g.player.x === 14 && g.player.y === 5);
      T.place('veitvetRoad', 1, 5, 'left');
      await T.step('left');
      await T.until(() => g.player.map === 'grorudTown', 'Grorud');
      await T.frames(60);
      T.check('and all the way back to Grorud through the open east gate', g.player.x === 24 && g.player.y === 9 && g.flags.veitvetGate === true);
    },
  ].map((f) => `(${f})`.replace(/REAL/g, JSON.stringify(REAL_1G_SAVE))),
};
// Saves from every stage of Veitvet, loaded one after another: each one carries on exactly where it was.
const VEITVET_STAGES = (() => {
  const s = (name, fix, check) => ({ name, fix, check });
  const phoneDone = (() => { const d = JSON.parse(JSON.stringify(moved(inVeitvet, 'veitvet', 8, 15, 'up'))); d.q.phone = { s: 3 }; d.flags.phone = true; d.player.armors = [...d.player.armors, 'phones']; d.player.armor = 'phones'; return d; })();
  const chapterOver = (() => { const d = sandraDone(withSignal(moved(chapterFourDone, 'veitvet', 4, 10, 'up'), ALL_SIGNAL)); d.q.signal = { s: 3 }; d.flags.osloGate = true; d.tracked = null; return d; })();
  return [
    s('just arrived in Veitvet', inVeitvet, "g.q.signal.s === 0 && g.NPCS.find((n) => n.id === 'mina').news()"),
    s("MINA's quest taken", withSignal(inVeitvet, []), "g.q.signal.s === 1 && g.QUESTS.signal.tracker() === 'GO UNDERGROUND'"),
    s('the phone found before ELIAS asked', (() => { const d = JSON.parse(JSON.stringify(moved(inVeitvet, 'veitvet', 26, 13, 'up'))); d.flags.phone = true; return d; })(), "g.q.phone.s === 0 && !g.ITEMS.some((i) => i.id === 'phone' && !g.flags.phone) && g.NPCS.find((n) => n.id === 'elias').news()"),
    s('LOST PHONE done, the headphones worn', phoneDone, "g.player.armor === 'phones' && g.q.phone.s === 3 && !g.NPCS.find((n) => n.id === 'elias').news()"),
    s('down in the station', withSignal(moved(chapterFourDone, 'veitvetUnder', 5, 10, 'up'), ['underSeen']), "g.QUESTS.signal.tracker() === 'FIND THE SOURCE' && g.player.map === 'veitvetUnder'"),
    s('the shield down, in front of the device', withSignal(moved(chapterFourDone, 'veitvetUnder', 12, 3, 'up'), ['underSeen', 'deviceSeen', 'shieldOff']), "!g.flags.signalOff && g.QUESTS.signal.tracker() === 'SIGNAL DEVICE'"),
    s('the device shut down', withSignal(moved(chapterFourDone, 'veitvetUnder', 12, 3, 'up'), ALL_SIGNAL), "g.flags.signalOff && g.QUESTS.signal.tracker() === 'SANDRA: CENTER'"),
    s('inside VEITVET CENTER', withSignal(moved(chapterFourDone, 'veitvetCenter', 11, 13, 'up'), ALL_SIGNAL), "g.player.map === 'veitvetCenter' && !g.flags.sandraBeaten"),
    s('in front of SANDRA', atSandra, "!g.flags.sandraBeaten && g.q.signal.s === 1 && g.player.y === 4"),
    s('SANDRA beaten, fragment 4 in the pack', sandraDone(atSandra), "g.q.signal.s === 2 && g.flags.fragment4 && g.chapter === 4"),
    s('back from MINA, the chapter over', chapterOver, "g.chapter === 5 && g.flags.osloGate && g.q.signal.s === 3"),
    s('out on the road to Oslo S', moved(chapterOver, 'osloRoad', 13, 5, 'right'), "g.player.map === 'osloRoad' && g.chapter === 5"),
  ];
})();
const veitvetStages = {
  name: 'veitvet-saves', save: VEITVET_STAGES[0].fix,
  run: VEITVET_STAGES.map((st, i) => `async (T, g) => {
    const KEY = 'turnip-vale-save-v1', before = JSON.parse(localStorage.getItem(KEY)), next = ${JSON.stringify(VEITVET_STAGES[i + 1] ? VEITVET_STAGES[i + 1].fix : null)};
    await T.continueGame();
    const p = g.player, b = before.player;
    T.check(${JSON.stringify(st.name)} + ': carries on where it was saved', g.mode === 'world' && p.map === b.map && p.x === b.x && p.y === b.y && p.dir === b.dir
      && T.questsKept(g.q, before.q) && JSON.stringify(g.flags) === JSON.stringify(before.flags) && p.weapon === b.weapon && p.armor === b.armor
      && JSON.stringify(p.weapons) === JSON.stringify(b.weapons) && JSON.stringify(p.armors) === JSON.stringify(b.armors) && p.gold === b.gold && p.herbs === b.herbs && p.lvl === b.lvl && p.xp === b.xp, p.map + ' ' + p.x + ',' + p.y);
    T.check(${JSON.stringify(st.name)} + ': the world agrees with the save', ${st.check});
    if (${i} === 0 || ${i} === ${VEITVET_STAGES.length - 1}) T.shot('stage-${i + 1}');
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
  }`),
};
// Measured with the fixed dice and a careful player (an herb below 55 HP, or when a warned FEEDBACK would be too much).
// NABILAH for comparison: 13 turns and 3 herbs at level 11 with the Grorud gear; 9 and 1 at level 13.
//   LV13 wrench + padded jacket 15 turns, 3 herbs | wrench + headphones 13, 2 | wrench + insulated vest (no Veitvet gear) 16, 4
//   LV13 signal blade + padded 11, 2 | signal blade + headphones 11, 2 | bat + factory armour 14, 3
//   LV12 bat + Tough Vest, no extras 15, 4 (of 6) | LV11 wrench + insulated 20, 7 (of 7) | LV15 blade + headphones 8, 0
// The limits leave two turns and one herb of room, as NABILAH's tests do.
const sandraBossScenarios = [
  { name: 'veitvet-sandra', save: atLevel(atSandraIn('wrench', 'padded'), 13, { maxhp: 118, hp: 118 }), run: sandraFight(atLevel(atSandraIn('wrench', 'padded'), 13), { turns: 17, herbs: 4, talk: true }) },
  { name: 'veitvet-sandra-celine', save: withHero(atLevel(atSandraIn('wrench', 'padded'), 13, { maxhp: 118, hp: 118 }), 'celine'), run: sandraFight(atLevel(atSandraIn('wrench', 'padded'), 13), { turns: 17, herbs: 4 }), sameAs: { beaten: 'veitvet-sandra__beaten', balance: 'veitvet-sandra__balance' } },
  { // the signal blade and the headphones
    name: 'veitvet-sandra-blade-phones', save: atLevel(atSandraIn('sblade', 'phones'), 13, { maxhp: 118, hp: 118 }), run: sandraFight(atLevel(atSandraIn('sblade', 'phones'), 13), { turns: 13, herbs: 3 }),
  },
  { // the headphones alone, with the wrench
    name: 'veitvet-sandra-phones', save: atLevel(atSandraIn('wrench', 'phones'), 13, { maxhp: 118, hp: 118 }), run: sandraFight(atLevel(atSandraIn('wrench', 'phones'), 13), { turns: 15, herbs: 3 }),
  },
  { // the signal blade alone, with the padded jacket
    name: 'veitvet-sandra-blade', save: atLevel(atSandraIn('sblade', 'padded'), 13, { maxhp: 118, hp: 118 }), run: sandraFight(atLevel(atSandraIn('sblade', 'padded'), 13), { turns: 13, herbs: 3 }),
  },
  { // the best physical defence, nothing against the signal: MARCUS' bat and the factory armour
    name: 'veitvet-sandra-factory', save: atLevel(atSandraIn('bat', 'factory'), 13, { maxhp: 118, hp: 118 }), run: sandraFight(atLevel(atSandraIn('bat', 'factory'), 13), { turns: 16, herbs: 4 }),
  },
  { // no Veitvet gear at all: the wrench and the insulated vest from Grorud
    name: 'veitvet-sandra-no-veitvet-gear', save: atLevel(atSandraIn('wrench', 'insulated'), 13, { maxhp: 118, hp: 118 }), run: sandraFight(atLevel(atSandraIn('wrench', 'insulated'), 13), { turns: 18, herbs: 5 }),
  },
  { // the weakest sensible hero after Grorud: level 12, no optional bonus from earlier chapters, the bat and the Tough Vest, six herbs
    name: 'veitvet-sandra-modest',
    save: (() => { const d = dressed(atSandra, 'bat', 'vest'); Object.assign(d.player, level(12), { maxhp: 96, hp: 96, herbs: 6, maxHerbs: 6, weapons: ['none', 'crystal', 'bat'], armors: ['none', 'vest'] }); return d; })(),
    run: sandraFight((() => { const d = dressed(atSandra, 'bat', 'vest'); Object.assign(d.player, level(12)); return d; })(), { turns: 17, herbs: 5, heal: 50 }),
  },
  { // arriving a level early (11), with the Grorud gear
    name: 'veitvet-sandra-level-11', save: atLevel(atSandraIn('wrench', 'insulated'), 11, { maxhp: 106, hp: 106 }), run: sandraFight(atLevel(atSandraIn('wrench', 'insulated'), 11), { turns: 22, herbs: 7 }),
  },
  { // arriving strong (15), with the best Veitvet has to give
    name: 'veitvet-sandra-level-15', save: atLevel(atSandraIn('sblade', 'phones'), 15, { maxhp: 130, hp: 130 }), run: sandraFight(atLevel(atSandraIn('sblade', 'phones'), 15), { turns: 10, herbs: 1, deep: false }),
  },
  { // one measured blow with each weapon, and running away leaves her unbeaten, gives nothing and leaves no spell behind
    name: 'veitvet-sandra-weapons', save: (() => { const d = atSandraIn('wrench', 'insulated'); d.player.weapons.push('sblade'); return d; })(),
    run: `async (T, g) => {
      ${MEET}
      await T.continueGame();
      const dealt = {};
      for (const w of ['bat', 'wrench', 'blade', 'sblade']) {
        g.player.weapon = w; g.player.hp = g.player.maxhp;
        await T.tap('Space', 3);
        while (g.mode === 'dialog') { await T.frames(150); await T.tap('Space', 3); }
        await T.untilBattle();
        dealt[w] = await swing();
        g.battle.weak = { amt: 8, left: 3 }; g.battle.soft = { amt: 6, left: 3 };
        await T.fight(() => 2);
        T.check('got away: unbeaten, nothing handed over', g.mode === 'world' && !g.flags.sandraBeaten && !g.flags.fragment4 && g.q.signal.s === 1 && g.stats.won === 130, g.mode);
        T.check('and the hero is just as strong as before', g.battle === null && g.player.atk === 28 && g.player.def === 12);
      }
      // hero ATK 28; +9 / +8 / +7 / +7; +1 from the dice; less her DEF 11; the signal blade x1.25 (she is all signal)
      T.check('bat 27, wrench 26, quick blade 25, signal blade 31', dealt.bat === 27 && dealt.wrench === 26 && dealt.blade === 25 && dealt.sblade === 31, JSON.stringify(dealt));
    }`,
  },
  { // closed in the middle of the hand-over: she finishes it next time, once
    name: 'veitvet-sandra-handover-interrupted', save: { ...atSandra, flags: { ...atSandra.flags, sandraBeaten: true } },
    run: [
      async (T, g) => {
        await T.continueGame();
        T.check('beaten, nothing handed over yet', g.flags.sandraBeaten === true && !g.flags.fragment4 && g.q.signal.s === 1);
        await T.talk('handover');
        T.check('no second fight: the fragment, once', g.stats.won === 130 && g.flags.fragment4 === true && g.q.signal.s === 2 && g.mode === 'world');
        await T.talk('after');
        T.check('still once', g.q.signal.s === 2 && g.stats.won === 130);
      },
      async (T, g) => {
        await T.continueGame();
        T.check('CONTINUE: the fragment kept, the quest ready', g.flags.fragment4 === true && g.q.signal.s === 2);
        await T.talk();
        T.check('and she gives nothing more', g.mode === 'world' && g.stats.won === 130);
      },
    ],
  },
  { // beaten by her: carried home with nothing lost, and she waits for another try
    name: 'veitvet-sandra-defeat',
    save: (() => { const d = JSON.parse(JSON.stringify(atSandra)); Object.assign(d.player, level(1), { hp: 5, herbs: 0 }); return d; })(),
    run: [
      async (T, g) => {
        await T.continueGame();
        await T.tap('Space', 3);
        while (g.mode === 'dialog') { await T.frames(150); await T.tap('Space', 3); }
        await T.untilBattle();
        await T.fight();
        await T.until(() => g.mode === 'dialog', 'being carried home');
        await T.dialog();
        const d = JSON.parse(localStorage.getItem('turnip-vale-save-v1'));
        T.check('in the village, patched up, saved there', g.player.map === 'village' && g.player.hp === g.player.maxhp && d.player.map === 'village');
        T.check('SANDRA unbeaten, nothing handed over; the device, the shield and the open doors all kept', !d.flags.sandraBeaten && !d.flags.fragment4 && d.q.signal.s === 1
          && ['signalOff', 'shieldOff', 'underSeen'].every((k) => d.flags[k] === true));
      },
      async (T, g) => {
        await T.continueGame();
        T.place('veitvetCenter', 10, 4, 'up');
        await T.tap('Space', 3);
        T.check('SANDRA is waiting for another try', g.mode === 'dialog' && g.dlg.name === 'SANDRA', g.mode);
      },
    ],
  },
];
export const SCENARIOS = [
  {
    name: 'title',
    run: async (T) => { await T.frames(30); T.shot('no-save'); },
  },
  {
    name: 'title-save', save: FIX.finished,
    run: async (T) => { await T.frames(30); T.shot('with-save'); await T.tap('ArrowDown'); T.shot('new-game-selected'); },
  },
  {
    name: 'newgame',
    run: async (T, g) => {
      await T.newGame();
      T.check('a new save records the hero', T.savedPlayer().hero === 'michael', T.savedPlayer().hero);
      T.state('started');
      await T.dialog('tip');
      await T.step('down', 2); await T.step('right', 2);
      T.shot('village');
      await T.menuShot('status');
      T.state('walked');
    },
  },
  {
    name: 'elder-first', save: FIX.fresh,
    run: async (T, g) => {
      await T.continueGame();
      T.check('a save without a hero loads as Michael', g.player.hero === 'michael', g.player.hero);
      T.state('loaded');
      T.shot('village');
      await T.talk('elder');
      await T.frames(20);
      T.shot('quest-banner');
      T.check('saving again writes hero michael', T.savedPlayer().hero === 'michael', T.savedPlayer().hero);
      T.state('accepted');
      await T.menuShot('status');
      await T.talk('elder-again');
    },
  },
  {
    name: 'woods', save: FIX.woods,
    run: async (T, g) => {
      await T.continueGame();
      T.shot('woods');
      await T.wander();
      T.shot('battle-1');
      await T.fight();
      T.state('after-battle-1');
      await T.wander();
      await T.fight();
      T.state('after-battle-2');
      await T.wander();
      await T.fight((g) => 2); // run away
      T.state('after-running');
      for (let i = 0; i < 4; i++) { await T.wander(); await T.fight(); }
      T.state('after-more-battles');
      T.shot('woods-after');
      await T.menuShot('status');
    },
  },
  {
    name: 'cat', save: FIX.cat,
    run: async (T) => { await T.continueGame(); T.shot('cat'); await T.talk('cat'); T.state('found'); T.shot('cat-gone'); },
  },
  {
    name: 'vines-locked', save: FIX.vinesLocked,
    run: async (T) => { await T.continueGame(); await T.talk('vines'); T.state('still-locked'); },
  },
  {
    name: 'vines', save: FIX.vines,
    run: async (T, g) => {
      await T.continueGame();
      T.shot('before');
      await T.talk('cut');
      T.shot('after');
      T.state('cut');
      await T.step('up'); await T.step('right');
      await T.until(() => g.player.map === 'cave', 'cave');
      await T.frames(40);
      T.shot('cave');
      T.state('in-cave');
    },
  },
  {
    name: 'cave', save: FIX.boss,
    run: async (T, g) => {
      await T.continueGame();
      await T.step('down', 2);
      await T.wander('down', 'up', 4);
      T.shot('battle');
      T.state('battle-start');
      await T.fight();
      T.state('after-battle');
    },
  },
  {
    name: 'boss-win', save: FIX.boss,
    run: async (T, g) => {
      await T.continueGame();
      T.shot('before');
      await T.talk('boss');
      await T.untilBattle();
      T.shot('battle');
      T.state('battle-start');
      let shotCharge = false, shotRun = false;
      await T.fight((g) => {
        if (g.battle.charged && !shotCharge) { shotCharge = true; T.shot('puffed-up'); }
        if (!shotRun) { shotRun = true; return 2; } // try to run once: must be refused
        return g.player.hp < 35 && g.player.herbs > 0 ? 1 : 0;
      });
      T.check('saw the boss puff up', shotCharge);
      T.state('won');
      T.shot('after');
      await T.menuShot('status');
    },
  },
  {
    name: 'boss-lose', save: FIX.bossWeak,
    run: async (T, g) => {
      await T.continueGame();
      await T.talk();
      await T.untilBattle();
      await T.fight();
      T.check('woke up in the village', g.player.map === 'village');
      await T.dialog('wren');
      T.state('carried-home');
      T.shot('village');
    },
  },
  {
    name: 'victory', save: FIX.report,
    run: async (T, g) => {
      await T.continueGame();
      await T.talk('elder');
      await T.until(() => g.mode === 'victory', 'victory screen');
      await T.frames(120);
      T.shot('victory');
      await T.tap('Space');
      await T.until(() => g.mode === 'world', 'world after victory');
      await T.frames(40);
      T.state('after-victory');
      for (let i = 1; i <= 6; i++) await T.talk(`elder-after-${i}`);
      await T.menuShot('status');
    },
  },
  {
    name: 'bram', save: FIX.bram,
    run: async (T, g) => {
      await T.continueGame();
      await T.talk('offer');
      T.check('shop opened', g.mode === 'shop');
      T.shot('shop');
      await T.tap('Space', 4); T.shot('bought-herb');
      await T.tap('Space', 4);
      await T.tap('Space', 4); T.shot('pouch-full');
      await T.tap('ArrowDown'); await T.tap('Space', 4); T.shot('bought-sword');
      await T.tap('ArrowDown'); await T.tap('Space', 4);
      await T.tap('Space', 4); T.shot('vest-owned');
      await T.tap('KeyX', 6);
      T.state('shopped');
      await T.talk('forge');
      T.state('crystal-sword');
      await T.talk('chat');
      T.shot('shop-again');
      await T.tap('KeyX', 6);
      await T.menuShot('status');
    },
  },
  {
    name: 'wren', save: FIX.wren,
    run: async (T) => { await T.continueGame(); await T.talk('tonic'); T.state('tonic'); await T.talk('chat'); await T.menuShot('status'); },
  },
  {
    name: 'pip', save: FIX.pip,
    run: async (T) => { await T.continueGame(); T.shot('before'); await T.talk('pouch'); T.state('pouch'); await T.talk('chat'); T.shot('after'); },
  },
  {
    name: 'finished', save: FIX.finished,
    run: async (T, g) => {
      await T.continueGame();
      T.state('loaded');
      T.shot('village');
      await T.talk('well');
      await T.menuShot('status');
      // Walking into the woods saves the game: the old save must survive the round trip.
      await T.step('right', 7);
      await T.until(() => g.player.map === 'forest', 'woods');
      await T.frames(40);
      T.state('round-trip');
      T.shot('woods');
    },
  },
  ...badHeroScenarios,
  ...sandraScenarios,
  ...vineScenarios,
  ...daddaScenarios,
  ...questFlowScenarios,
  ...questViewScenarios,
  ...pagingScenarios,
  ...questSaveScenarios,
  ...chapterScenarios,
  ...gateScenarios,
  ...stovnerScenarios,
  ...combatScenarios,
  ...questScenarios,
  ...mohsinScenarios,
  ...ammerudScenarios,
  ...realGateScenarios,
  ...grorudScenarios,
  ...nabilahScenarios,
  stageScenario,
  real1fScenario,
  ...veitvetScenarios,
  ...sandraBossScenarios,
  veitvetStages,
  real1gScenario,
  ...manualSaveScenarios,
  ...encounterScenarios,
  ...heroSelectScenarios,
  ...heroScenarios,
];
