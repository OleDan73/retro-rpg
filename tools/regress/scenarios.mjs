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
        const strip = (p) => JSON.stringify(Object.keys(p).filter((k) => k !== 'hero').sort().map((k) => [k, p[k]]));
        T.check('every other player field is exactly as saved', strip(g.player) === strip(before.player));
        T.check('quests, flags and stats are exactly as saved', JSON.stringify([g.q, g.flags, g.stats]) === JSON.stringify([before.q, before.flags, before.stats]));
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
      await T.tap('ArrowUp', 6);
      T.check('up goes back', g.menuPage === 0, g.menuPage);
      await T.tap('ArrowDown', 6);
      T.check('down goes forward', g.menuPage === 1, g.menuPage);
      await T.tap('Space', 6);
      T.check('the action button closes the log', g.mode === 'world', g.mode);
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
      await T.touch('down');
      T.check('down arrow: page 3', g.menuPage === 2, g.menuPage);
      T.shot('page-3');
      await T.touch('up');
      T.check('up arrow: page 2', g.menuPage === 1, g.menuPage);
      await T.touch('left');
      T.check('left arrow: page 1', g.menuPage === 0, g.menuPage);
      await T.touch('left');
      T.check('left arrow wraps to page 3', g.menuPage === 2, g.menuPage);
      await T.touch('a');
      T.check('A closes the log', g.mode === 'world', g.mode);
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
  ...encounterScenarios,
  ...heroSelectScenarios,
  ...heroScenarios,
];
