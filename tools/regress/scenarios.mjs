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
];
