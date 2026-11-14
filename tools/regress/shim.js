// Injected into the page before the game's own scripts (see run.mjs).
// Makes the game deterministic and gives the test scenarios a small driving API, window.__T.
(() => {
  // Fixed random sequence.
  let seed = 0x2f6e2b1;
  Math.random = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Fake clock: time only moves when a scenario asks for frames.
  const STEP = 1000 / 60;
  let now = 0, nextTimer = 1, raf = null;
  const timers = [];
  performance.now = () => now;
  window.setTimeout = (fn, ms = 0) => { const id = nextTimer++; timers.push({ t: now + (+ms || 0), fn, id }); return id; };
  window.clearTimeout = (id) => { const i = timers.findIndex((x) => x.id === id); if (i >= 0) timers.splice(i, 1); };
  window.requestAnimationFrame = (cb) => { raf = cb; return 0; };
  function runTimers() {
    for (;;) {
      let k = -1;
      for (let i = 0; i < timers.length; i++) {
        const a = timers[i];
        if (a.t <= now && (k < 0 || a.t < timers[k].t || (a.t === timers[k].t && a.id < timers[k].id))) k = i;
      }
      if (k < 0) return;
      timers.splice(k, 1)[0].fn();
    }
  }
  // A real macrotask, so every promise continuation settles between frames.
  const mc = new MessageChannel();
  let wake = null;
  mc.port1.onmessage = () => { const w = wake; wake = null; if (w) w(); };
  const macro = () => new Promise((r) => { wake = r; mc.port2.postMessage(0); });

  // No sound in tests.
  window.AudioContext = undefined;
  window.webkitAudioContext = undefined;

  const CODES = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  const SAVE_KEY = 'turnip-vale-save-v1';
  const T = window.__T = {
    zoom: 0,
    out: { shots: [], states: {}, checks: [], get fontOk() { return document.fonts.check('8px "Press Start 2P"'); } },
    get g() { return window.__rpg; },
    ready: () => !!raf && !!window.__rpg,

    async frames(n = 1) {
      for (let i = 0; i < n; i++) {
        now += STEP;
        runTimers();
        const cb = raf;
        if (cb) { raf = null; cb(now); }
        await macro();
        if (T.log) T.observe();
      }
    },

    // ---- frame-by-frame log: records the frame on which anything a player would notice changes
    // (battle messages, both HP values, the boss's charged state, rewards, quest state...), so the exact
    // order and timing of a fight can be compared between versions.
    log: null,
    startLog() { T.log = []; T.logFrame = 0; T.seen = {}; T.timedShots = []; T.onLog = null; },
    endLog(name) { T.out.states[name] = T.log; T.log = null; T.onLog = null; },
    shotAfter(frames, name) { T.timedShots.push([T.logFrame + frames, name]); },
    observe() {
      const g = window.__rpg, b = g.battle, f = T.logFrame++;
      const note = (k, v) => {
        if (T.seen[k] === v) return;
        T.seen[k] = v;
        const e = [f, k, v];
        T.log.push(e);
        if (T.onLog) T.onLog(e);
      };
      note('mode', g.mode);
      if (b) {
        note('enemy', b.type); note('msg', b.msg); note('phase', b.phase); note('turn', b.turn);
        note('enemyHp', b.hp); note('charged', b.charged); note('gone', b.gone);
      }
      const p = g.player;
      note('heroHp', p.hp); note('herbs', p.herbs); note('xp', p.xp); note('lvl', p.lvl); note('gold', p.gold);
      note('map', p.map); note('kingQuest', g.q.king.s); note('slimeCount', g.q.slimes.n); note('glowcaps', p.glowcaps);
      for (let i = T.timedShots.length - 1; i >= 0; i--) {
        if (T.timedShots[i][0] <= f) T.shot(T.timedShots.splice(i, 1)[0][1]);
      }
    },
    async until(pred, what = 'condition', max = 30000) {
      for (let i = 0; i < max; i++) { if (pred()) return; await T.frames(1); }
      throw new Error(`timed out waiting for ${what}`);
    },
    keyDown(code) { window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true })); },
    keyUp(code) { window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })); },
    async tap(code, after = 2) { T.keyDown(code); await T.frames(2); T.keyUp(code); await T.frames(after); },

    shot(name) {
      const c = document.getElementById('game');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let h = 2166136261;
      for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619); }
      const s = { name, hash: (h >>> 0).toString(16).padStart(8, '0'), png: c.toDataURL('image/png') };
      if (T.zoom) {
        const z = document.createElement('canvas');
        z.width = c.width * T.zoom; z.height = c.height * T.zoom;
        const zg = z.getContext('2d');
        zg.imageSmoothingEnabled = false;
        zg.drawImage(c, 0, 0, z.width, z.height);
        s.zoom = z.toDataURL('image/png');
      }
      T.out.shots.push(s);
    },
    state(name) {
      const g = window.__rpg, b = g.battle, raw = localStorage.getItem(SAVE_KEY);
      T.out.states[name] = JSON.parse(JSON.stringify({
        mode: g.mode, player: g.player, q: g.q, flags: g.flags, stats: g.stats,
        battle: b && { type: b.type, name: b.name, hp: b.hp, max: b.max, atk: b.atk, def: b.def, xp: b.xp, gold: b.gold, turn: b.turn },
        save: raw ? JSON.parse(raw) : null,
      }));
    },
    check(name, ok, detail) { T.out.checks.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) }); },
    savedPlayer() { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw).player : null; },

    // ---- test-only helpers for the quest log
    // Adds n made-up quests to the running game (never to the game's own data) so the quest log has
    // more than one page. Their stages cycle through active, ready and done.
    addTestQuests(n) {
      const g = window.__rpg;
      for (let i = 1; i <= n; i++) {
        const id = `test${i}`;
        g.QUESTS[id] = { title: `TEST QUEST ${i}`, turnIn: 'NOBODY', tracker: () => `TEST ${i}`, progress: () => `STEP ${i} OF 9` };
        g.QUEST_ORDER.push(id);
        g.q[id] = { s: ((i - 1) % 3) + 1 };
      }
    },
    // Adds a made-up chapter to the running game (never to the game's own data). By default it comes
    // after the real one, so the real chapter is no longer the last; with before = true it is an
    // already finished chapter in front of it.
    addTestChapter(before = false) {
      const g = window.__rpg, id = 'testchapter';
      g.QUESTS[id] = { title: 'TEST CHAPTER', turnIn: 'NOBODY', tracker: () => 'TEST', progress: () => 'TEST' };
      g.QUEST_ORDER.push(id);
      g.q[id] = { s: before ? 3 : 0 };
      if (before) g.CHAPTERS.unshift({ quest: id }); else g.CHAPTERS.push({ quest: id });
    },
    // Removes the chapters that are not built yet from the running game (never from the game's own
    // data), so that Vestli is the last chapter and its end is the end of the story.
    vestliIsLastChapter() { window.__rpg.CHAPTERS.splice(1); },
    // Puts the hero somewhere at once, instead of walking there through random encounters.
    place(map, x, y, dir) {
      Object.assign(window.__rpg.player, { map, x, y, fx: x, fy: y, tx: x, ty: y, dir, moving: false, t: 0 });
    },
    // Presses one of the on-screen touch buttons (up, down, left, right, a, b) the way a finger would.
    async touch(name, after = 6) {
      const btn = document.querySelector(`#controls button[data-btn="${name}"]`);
      btn.setPointerCapture = () => {}; // a synthetic pointer cannot be captured
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }));
      await T.frames(2);
      btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 1 }));
      await T.frames(after);
    },

    // ---- title screen
    async continueGame() {
      await T.frames(30);
      await T.tap('Space');
      await T.until(() => T.g.mode === 'world', 'world after CONTINUE');
      await T.frames(40);
    },
    // Starts a new game; works both before and after the hero-selection screen existed.
    async newGame(heroIndex = 0) {
      await T.frames(30);
      if (localStorage.getItem(SAVE_KEY)) await T.tap('ArrowDown');
      await T.tap('Space', 4);
      if (T.g.mode === 'heroSelect') {
        for (let i = 0; i < heroIndex; i++) await T.tap('ArrowRight', 4);
        await T.tap('Space', 4);
      }
      await T.until(() => T.g.mode === 'dialog', 'opening tip');
      await T.frames(30);
    },

    // ---- world
    async step(dir, n = 1) {
      for (let i = 0; i < n && T.g.mode === 'world'; i++) {
        T.keyDown(CODES[dir]); await T.frames(2); T.keyUp(CODES[dir]); await T.frames(1);
        await T.until(() => !T.g.player.moving, 'end of step');
        await T.frames(2);
      }
    },
    // Screenshots every page of the open dialogue (fully typed) and closes it, following chained dialogues.
    async dialog(prefix) {
      let i = 0;
      while (T.g.mode === 'dialog') {
        if (++i > 40) throw new Error('dialogue never ended');
        await T.frames(150);
        if (prefix) T.shot(`${prefix}-p${i}`);
        await T.tap('Space', 3);
      }
      await T.frames(10);
    },
    async talk(prefix) {
      await T.tap('Space', 3);
      if (T.g.mode !== 'dialog') throw new Error(`nothing to talk to (${prefix})`);
      await T.dialog(prefix);
    },
    async menuShot(name) {
      await T.tap('KeyX', 6);
      T.shot(name);
      await T.tap('KeyX', 6);
    },

    // ---- battle
    async untilBattle() {
      await T.until(() => T.g.mode === 'battle' && T.g.battle.phase === 'menu', 'battle menu');
      await T.frames(20);
    },
    // policy(g) returns 0 attack, 1 heal, 2 run. Returns when the battle is over.
    async fight(policy = () => 0) {
      for (let turn = 0; turn < 300; turn++) {
        await T.until(() => T.g.mode !== 'battle' || T.g.battle.phase === 'menu', 'battle menu');
        if (T.g.mode !== 'battle') break;
        const want = policy(T.g);
        while (T.g.battle.menu !== want) await T.tap('ArrowDown', 1);
        await T.tap('Space', 1);
        await T.until(() => T.g.mode !== 'battle' || T.g.battle.phase !== 'menu', 'action to start');
      }
      if (T.g.mode === 'battle') throw new Error('battle never ended');
      await T.frames(70);
    },
    // Paces back and forth until a random encounter starts.
    async wander(a = 'right', b = 'left', span = 6) {
      for (let lap = 0; lap < 60; lap++) {
        for (const d of [a, b]) {
          for (let i = 0; i < span; i++) {
            const { x, y } = T.g.player;
            await T.step(d);
            if (T.g.mode !== 'world') return T.untilBattle();
            if (T.g.player.x === x && T.g.player.y === y) {
              // Did not move: either blocked, or an encounter has begun.
              await T.frames(90);
              if (T.g.mode === 'battle') return T.untilBattle();
            }
          }
        }
      }
      throw new Error('no encounter happened');
    },
  };
})();
