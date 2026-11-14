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
      T.check('two chapters defined: Vestli, then Stovner without a boss quest', JSON.stringify(g.CHAPTERS) === '[{"name":"VESTLI","quest":"king"},{"name":"STOVNER","quest":null}]', JSON.stringify(g.CHAPTERS));
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
    save: { ...FIX.finished, q: { ...FIX.finished.q, mohsin: { s: 2 } } },
    run: async (T, g) => {
      await T.continueGame();
      T.check('loads into chapter 2 with the unknown quest kept', g.chapter === 1 && !g.storyDone && g.q.mohsin.s === 2);
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
      const starts = { village: [8, 7], forest: [1, 7], cave: [1, 7], stovner: [24, 9], stovnerOuter: [14, 18], tunnel: [9, 1] };
      T.check('six maps', Object.keys(g.MAPS).sort().join() === Object.keys(starts).sort().join(), Object.keys(g.MAPS).join());
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
      T.check('outer land: only the road behind the barricade cannot', unreached('stovnerOuter', 14, 18) === '14,0 15,0 14,1 15,1', unreached('stovnerOuter', 14, 18));
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
      T.check('both chests stand on open ground', g.ITEMS.filter((i) => i.chest).length === 2 && g.ITEMS.filter((i) => i.chest).every((i) => walk(g.MAPS[i.map], i.x, i.y, true) && !g.MAPS[i.map].exits[i.x + ',' + i.y]));
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
      T.check('Stovner still has no boss quest', g.CHAPTERS.length === 2 && g.CHAPTERS[1].name === 'STOVNER' && g.CHAPTERS[1].quest === null && g.QUEST_ORDER.join() === 'slimes,biscuit,glowcap,king,shards,road,cart,under,kebab', g.QUEST_ORDER.join());
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
      T.check('nobody new anywhere else but LÆRER HEIDI in the tunnel', g.NPCS.filter((n) => !['village', 'forest', 'cave', 'stovner'].includes(n.map)).map((n) => n.id + '@' + n.map).join() === 'heidi@tunnel,heidi2@tunnel'
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
          && Object.keys(g.flags).sort().join() === 'fragment1,metBram,redGate,redKey,shard1,shard2,tunnelOpen,vines' && g.QUEST_ORDER.join() === 'slimes,biscuit,glowcap,king,shards,road,cart,under,kebab'
          && g.CHAPTERS.length === 2 && g.CHAPTERS[1].quest === null, Object.keys(g.flags).sort().join());
        for (let i = 1; i <= 3; i++) await T.talk('johanne-after-' + i);
        T.check('rewarded once', g.player.gold === gold + 100 && g.player.maxHerbs === 6);
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
  ...manualSaveScenarios,
  ...encounterScenarios,
  ...heroSelectScenarios,
  ...heroScenarios,
];
