'use strict';
/* Turnip Vale — a tiny retro RPG. Plain JS + canvas, all art drawn in code. */
(() => {
  // ---------------------------------------------------------------- setup
  const W = 240, H = 160, TS = 16;
  // 16-colour palette
  const PAL = [
    '#140c1c', '#442434', '#30346d', '#4e4a4e', '#854c30', '#346524', '#d04648', '#757161',
    '#597dce', '#d27d2c', '#8595a1', '#6daa2c', '#d2aa99', '#6dc2ca', '#dad45e', '#deeed6',
  ];
  const FONT = '8px "Press Start 2P", monospace';
  const BIG = '16px "Press Start 2P", monospace';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = (f) => new Promise((r) => { const c = () => (f() ? r() : setTimeout(c, 16)); c(); });

  function mk(w, h, fn) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    fn(g);
    return c;
  }
  function R(g, x, y, w, h, c) { g.fillStyle = PAL[c]; g.fillRect(x, y, w, h); }
  function P(g, x, y, c) { R(g, x, y, 1, 1, c); }
  function circle(g, cx, cy, r, c) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r) P(g, x, y, c);
    }
  }
  function ellipse(g, cx, cy, rx, ry, c, maxY = 99) {
    for (let y = 0; y < 16 && y <= maxY; y++) for (let x = 0; x < 16; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) P(g, x, y, c);
    }
  }
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  // Adds a 1px dark outline around a sprite's silhouette.
  function outlined(src) {
    const sil = mk(src.width, src.height, (s) => {
      s.drawImage(src, 0, 0);
      s.globalCompositeOperation = 'source-in';
      s.fillStyle = PAL[0];
      s.fillRect(0, 0, src.width, src.height);
    });
    return mk(src.width, src.height, (g) => {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.drawImage(sil, dx, dy);
      g.drawImage(src, 0, 0);
    });
  }
  function flip(src) {
    return mk(src.width, src.height, (g) => { g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); });
  }

  // ---------------------------------------------------------------- tiles
  function grass(g, seed = 1) {
    R(g, 0, 0, 16, 16, 11);
    for (let y = 1; y < 16; y++) for (let x = 0; x < 15; x++) {
      if (hash(x + seed * 7, y + seed * 13) < 0.045) { P(g, x, y, 5); P(g, x + 1, y - 1, 5); }
    }
  }
  function forestGround(g, seed = 3) {
    R(g, 0, 0, 16, 16, 5);
    for (let y = 1; y < 16; y++) for (let x = 0; x < 15; x++) {
      const h = hash(x + seed * 5, y + seed * 11);
      if (h < 0.05) { P(g, x, y, 11); P(g, x, y - 1, 11); } else if (h > 0.975) P(g, x, y, 0);
    }
  }
  const TILE = {};
  TILE['.'] = mk(16, 16, (g) => grass(g));
  TILE[','] = mk(16, 16, (g) => {
    grass(g, 2);
    [[3, 3, 15], [11, 6, 6], [5, 12, 15], [13, 13, 14]].forEach(([x, y, c]) => {
      P(g, x, y - 1, c); P(g, x - 1, y, c); P(g, x + 1, y, c); P(g, x, y + 1, c); P(g, x, y, c === 14 ? 9 : 14);
    });
  });
  const pathTile = mk(16, 16, (g) => {
    R(g, 0, 0, 16, 16, 12);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const h = hash(x + 40, y + 9);
      if (h < 0.06) P(g, x, y, 7); else if (h > 0.96) P(g, x, y, 4);
    }
  });
  TILE['='] = pathTile;
  TILE['E'] = pathTile;
  TILE['T'] = mk(16, 16, (g) => {
    grass(g, 4);
    R(g, 3, 14, 10, 2, 5);
    circle(g, 8, 6.5, 6.6, 0);
    circle(g, 8, 6.5, 5.6, 5);
    circle(g, 6.6, 5.2, 3.2, 11);
    for (let y = 0; y < 13; y++) for (let x = 0; x < 16; x++) if (hash(x + 3, y + 77) < 0.12) {
      const dx = x + 0.5 - 6.6, dy = y + 0.5 - 5.2;
      if (dx * dx + dy * dy < 9) P(g, x, y, 5);
    }
    R(g, 6, 11, 4, 4, 0); R(g, 7, 11, 2, 4, 4);
  });
  TILE['P'] = mk(16, 16, (g) => {
    forestGround(g, 6);
    R(g, 2, 14, 12, 2, 0);
    R(g, 6, 12, 4, 4, 0); R(g, 7, 12, 2, 4, 4);
    for (const [top, h, mh] of [[7, 6, 7], [4, 5, 5], [1, 4, 3]]) {
      for (let r = 0; r < h; r++) {
        const hw = Math.round(1 + (mh - 1) * r / (h - 1)), y = top + r;
        R(g, 8 - hw, y, hw * 2, 1, 5);
        P(g, 8 - hw, y, 0); P(g, 7 + hw, y, 0);
        if (hw > 1) P(g, 9 - hw, y, 11);
        if (hw > 2) P(g, 6 + hw, y, 2);
      }
      R(g, 8 - mh, top + h, mh * 2, 1, 0);
    }
    P(g, 7, 0, 0); P(g, 8, 0, 0);
  });
  const water = [0, 1].map((f) => mk(16, 16, (g) => {
    R(g, 0, 0, 16, 16, 8);
    for (const y of [2, 7, 12]) {
      const x0 = (y * 5 + f * 4) % 16;
      for (let i = 0; i < 4; i++) P(g, (x0 + i) % 16, y, 13);
      P(g, (x0 + 1) % 16, y - 1, 15);
    }
    P(g, (f * 7 + 3) % 16, 10, 2); P(g, (f * 5 + 11) % 16, 4, 2);
  }));
  TILE['#'] = mk(16, 16, (g) => {
    R(g, 0, 0, 16, 16, 10);
    for (let r = 0; r < 4; r++) {
      const y = r * 4;
      R(g, 0, y + 3, 16, 1, 3);
      for (let x = (r % 2) * 4; x < 16; x += 8) R(g, x, y, 1, 3, 3);
      for (let x = (r % 2) * 4 + 1; x < 16; x += 8) R(g, x, y, 3, 1, 15);
    }
  });
  TILE['R'] = mk(16, 16, (g) => {
    R(g, 0, 0, 16, 16, 6);
    for (let r = 0; r < 4; r++) {
      const y = r * 4;
      R(g, 0, y + 3, 16, 1, 1);
      R(g, 0, y, 16, 1, 9);
      for (let x = (r % 2) * 3; x < 16; x += 6) R(g, x, y + 1, 1, 2, 1);
    }
  });
  function houseWall(g) {
    R(g, 0, 0, 16, 16, 12);
    R(g, 0, 0, 16, 2, 4); R(g, 0, 15, 16, 1, 4);
    R(g, 0, 0, 1, 16, 4); R(g, 15, 0, 1, 16, 4);
    R(g, 0, 2, 16, 1, 1);
  }
  TILE['H'] = mk(16, 16, (g) => {
    houseWall(g);
    R(g, 4, 4, 8, 7, 0); R(g, 5, 5, 6, 5, 13);
    R(g, 7, 5, 2, 5, 15); R(g, 5, 7, 6, 1, 15);
    R(g, 3, 11, 10, 1, 4);
  });
  TILE['D'] = mk(16, 16, (g) => {
    houseWall(g);
    R(g, 4, 4, 8, 12, 0); R(g, 5, 5, 6, 11, 4);
    R(g, 7, 5, 1, 11, 1); R(g, 9, 5, 1, 11, 1);
    P(g, 10, 10, 14);
  });
  function sign(base) {
    return mk(16, 16, (g) => {
      base(g);
      R(g, 6, 9, 4, 7, 0); R(g, 7, 9, 2, 6, 4);
      R(g, 2, 2, 12, 8, 0); R(g, 3, 3, 10, 6, 9);
      R(g, 4, 4, 8, 1, 4); R(g, 4, 6, 6, 1, 4);
    });
  }
  TILE['S'] = sign(grass);
  TILE['s'] = sign(forestGround);
  TILE['g'] = mk(16, 16, (g) => forestGround(g));
  TILE['m'] = mk(16, 16, (g) => {
    forestGround(g, 8);
    R(g, 4, 9, 4, 2, 6); P(g, 5, 9, 15); R(g, 5, 11, 2, 2, 12);
    R(g, 10, 5, 3, 1, 6); R(g, 11, 6, 1, 2, 12);
  });
  const SOLID = new Set(['T', 'P', '~', '#', 'R', 'H', 'D', 'S', 's']);

  // ---------------------------------------------------------------- characters
  function personSprite(o, dir, frame) {
    const { hair, shirt, shirt2, pants, skin = 12, robe, beard, longHair } = o;
    return outlined(mk(16, 16, (g) => {
      // legs / robe
      if (robe) {
        R(g, 4, 10, 8, 3, shirt);
        R(g, 4, 12, 8, 1, shirt2);
        if (frame) { R(g, 4, 13, 3, 1, 1); R(g, 10, 13, 2, 1, 1); } else { R(g, 5, 13, 2, 1, 1); R(g, 9, 13, 2, 1, 1); }
      } else if (dir === 'left') {
        if (frame) { R(g, 4, 11, 2, 2, pants); R(g, 9, 11, 2, 2, pants); R(g, 3, 13, 3, 1, 1); R(g, 9, 13, 3, 1, 1); }
        else { R(g, 6, 11, 4, 2, pants); R(g, 5, 13, 5, 1, 1); }
      } else if (frame) {
        R(g, 5, 11, 2, 1, pants); R(g, 5, 12, 2, 1, 1);
        R(g, 9, 11, 2, 2, pants); R(g, 9, 13, 2, 1, 1);
      } else {
        R(g, 5, 11, 2, 2, pants); R(g, 9, 11, 2, 2, pants);
        R(g, 5, 13, 2, 1, 1); R(g, 9, 13, 2, 1, 1);
      }
      // body
      R(g, 4, 7, 8, 4, shirt);
      if (!robe) R(g, 4, 10, 8, 1, 4);
      // arms
      if (dir === 'left') {
        const ay = frame ? 8 : 7;
        R(g, 6, ay, 3, 3, shirt2); R(g, 6, ay + 3, 2, 1, skin);
      } else {
        const l = frame ? 0 : 1, r = frame ? 1 : 0;
        R(g, 3, 7, 1, 2 + l, shirt2); P(g, 3, 9 + l, skin);
        R(g, 12, 7, 1, 2 + r, shirt2); P(g, 12, 9 + r, skin);
      }
      // head
      R(g, 5, 2, 6, 5, skin);
      if (dir === 'up') {
        R(g, 4, 1, 8, 6, hair);
        if (longHair) R(g, 4, 7, 8, 2, hair);
      } else if (dir === 'left') {
        R(g, 4, 1, 8, 2, hair); R(g, 8, 3, 4, 3, hair); R(g, 4, 3, 1, 1, hair);
        if (longHair) R(g, 9, 6, 3, 3, hair);
        P(g, 6, 4, 0);
        if (beard) { R(g, 5, 5, 4, 3, 15); }
      } else {
        R(g, 4, 1, 8, 2, hair); R(g, 4, 3, 1, 3, hair); R(g, 11, 3, 1, 3, hair); P(g, 5, 3, hair); P(g, 10, 3, hair);
        if (longHair) { R(g, 4, 6, 1, 3, hair); R(g, 11, 6, 1, 3, hair); }
        P(g, 6, 4, 0); P(g, 9, 4, 0);
        if (beard) { R(g, 6, 5, 4, 3, 15); P(g, 7, 8, 15); P(g, 8, 8, 15); }
        else P(g, 7, 6, 6), P(g, 8, 6, 6);
      }
    }));
  }
  function buildChar(o) {
    const s = {};
    for (const d of ['down', 'up', 'left']) for (const f of [0, 1]) s[d + f] = personSprite(o, d, f);
    s.right0 = flip(s.left0); s.right1 = flip(s.left1);
    return s;
  }
  const SPR = {
    hero: buildChar({ hair: 4, shirt: 8, shirt2: 2, pants: 2 }),
    elder: buildChar({ hair: 10, shirt: 5, shirt2: 0, pants: 5, robe: true, beard: true }),
    wren: buildChar({ hair: 6, shirt: 15, shirt2: 10, pants: 13, longHair: true }),
    pip: buildChar({ hair: 14, shirt: 9, shirt2: 4, pants: 4 }),
  };

  // enemies (16x16, drawn 3x in battle)
  const ENEMY_SPR = {
    slime: [0, 1].map((f) => outlined(mk(16, 16, (g) => {
      const ry = f ? 4.2 : 5, rx = f ? 7 : 6.2, cy = f ? 10.8 : 10;
      ellipse(g, 8, cy, rx, ry, 11);
      ellipse(g, 8, cy + 1.6, rx - 0.6, ry - 1.4, 5, 99);
      ellipse(g, 8, cy - 0.4, rx - 1, ry - 1.2, 11);
      P(g, 8, Math.floor(cy - ry) - 1 + (f ? 1 : 0), 11);
      R(g, 4, Math.floor(cy - ry + 2), 2, 1, 15); P(g, 4, Math.floor(cy - ry + 3), 15);
      R(g, 6, Math.floor(cy) - 1, 1, 2, 0); R(g, 10, Math.floor(cy) - 1, 1, 2, 0);
      R(g, 7, Math.floor(cy) + 2, 3, 1, 5);
    }))),
    shroom: [0, 1].map((f) => outlined(mk(16, 16, (g) => {
      const o = f ? 1 : 0;
      R(g, 5, 8 + o, 6, 5 - o, 12); R(g, 5, 12, 6, 1, 7);
      R(g, 6, 10 + o, 1, 2, 0); R(g, 9, 10 + o, 1, 2, 0);
      ellipse(g, 8, 7 + o, 7, 5, 6, 7 + o);
      R(g, 2, 7 + o, 12, 1, 1);
      P(g, 5, 3 + o, 15); R(g, 9, 4 + o, 2, 2, 15); P(g, 4, 6 + o, 15); P(g, 12, 6 + o, 15);
      if (f) { R(g, 4, 13, 3, 1, 4); R(g, 9, 13, 3, 1, 4); } else { R(g, 5, 13, 2, 1, 4); R(g, 9, 13, 2, 1, 4); }
    }))),
  };
  const ENEMIES = {
    slime: { name: 'SLIME', hp: 12, atk: 4, def: 0, xp: 5, intro: 'oozes out!' },
    shroom: { name: 'SHROOMLET', hp: 16, atk: 5, def: 1, xp: 7, intro: 'pops up!' },
  };

  // ---------------------------------------------------------------- maps
  const MAPS = {
    village: {
      name: 'TURNIP VALE',
      rows: [
        '####################',
        '#.T....,......T...T#',
        '#..RRRR.....RRRR...#',
        '#..HHDH.....HDHH...#',
        '#....=.......=..~~.#',
        '#....=========..~~.#',
        '#.,.......=.....~~.#',
        '#.........=========E',
        '#..RRRR...=....,..S#',
        '#..HHDH...=..T.....#',
        '#....======........#',
        '#.T.......,..~~~...#',
        '#...,.....T..~~~.T.#',
        '#..T..,............#',
        '####################',
      ],
      exits: { '19,7': { map: 'forest', x: 1, y: 7, dir: 'right' } },
      signs: { '18,8': ['EAST: WHISPER WOODS.', 'Beware of slimes!'] },
      encounters: false,
    },
    forest: {
      name: 'WHISPER WOODS',
      rows: [
        'PPPPPPPPPPPPPPPPPPPP',
        'PggggPPggmgggPPggggP',
        'PgPgggggggPgggggPggP',
        'Pggmgpgggggggggg~~gP',
        'PgggPPPgggPggggg~~gP',
        'PggggggggggggPgg~ggP',
        'PPsgPggggmgggggggggP',
        'E==gggggPggPgggggPgP',
        'PPgggPggggggggPggggP',
        'PgggPPgggPggggmggPgP',
        'PggggggggggPPgggggPP',
        'PgPgggPgggggggPggggP',
        'PggmgPPggPgggggPgggP',
        'PgggggggggggPggggggP',
        'PPPPPPPPPPPPPPPPPPPP',
      ].map((r) => r.replace(/p/g, 'g')),
      exits: { '0,7': { map: 'village', x: 18, y: 7, dir: 'left' } },
      signs: { '2,6': ['WEST: TURNIP VALE.'] },
      encounters: true,
    },
  };
  for (const m of Object.values(MAPS)) { m.h = m.rows.length; m.w = m.rows[0].length; }
  const tileAt = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? '#' : m.rows[y][x]);

  // ---------------------------------------------------------------- state
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const STEP_FRAMES = 10;

  const player = {
    map: 'village', x: 5, y: 4, dir: 'down', moving: false, fx: 5, fy: 4, tx: 5, ty: 4, t: 0,
    lvl: 1, hp: 30, maxhp: 30, atk: 6, def: 1, xp: 0, next: 12, herbs: 3, sinceBattle: 0,
  };
  const quest = { state: 0, kills: 0 }; // 0 none, 1 active, 2 ready to turn in, 3 done
  const stats = { won: 0, slimes: 0, steps: 0 };

  let mode = 'title';
  let tick = 0;
  let dlg = null, battle = null, fade = null, encounter = null, banner = null, victory = null;
  let lastBump = -99, shroomStreak = 0;

  const NPCS = [
    {
      id: 'elder', name: 'ELDER MOSS', map: 'village', x: 8, y: 6, dir: 'down', home: 'down', spr: SPR.elder,
      talk() {
        if (quest.state === 0) {
          say('ELDER MOSS', [
            'Ah, a traveler! Welcome to Turnip Vale. I am Elder Moss.',
            'Slimes from Whisper Woods keep sneaking in and eating our turnips!',
            'Could you defeat 3 slimes for us? The woods lie east, along the path.',
            'Wren can patch you up if you get hurt. Good luck!',
          ], () => { quest.state = 1; SFX.quest(); showBanner('QUEST: DEFEAT 3 SLIMES'); });
        } else if (quest.state === 1) {
          say('ELDER MOSS', [`You have defeated ${quest.kills} of 3 slimes. The woods lie east!`]);
        } else if (quest.state === 2) {
          say('ELDER MOSS', [
            'You did it! Not a single slime left nibbling our fields.',
            'The whole village thanks you, hero. The turnips are safe!',
          ], () => { quest.state = 3; fadeOut(() => { mode = 'victory'; victory = { t: 0 }; SFX.victory(); }, 40); });
        } else {
          say('ELDER MOSS', ['Thanks to you, the turnips grow in peace. Rest well, hero.']);
        }
      },
    },
    {
      id: 'wren', name: 'WREN', map: 'village', x: 14, y: 4, dir: 'left', home: 'left', spr: SPR.wren,
      talk() {
        say('WREN', [
          'I am Wren, the village healer. Hold still...',
        ], () => {
          player.hp = player.maxhp; player.herbs = 3; SFX.heal();
          say('WREN', ['HP fully restored! I packed 3 fresh herbs for you, too.']);
        });
      },
    },
    {
      id: 'pip', name: 'PIP', map: 'village', x: 7, y: 11, dir: 'right', home: 'right', spr: SPR.pip,
      talk() {
        const lines = quest.state >= 3
          ? ['You beat the slimes! When I grow up I want to be just like you!']
          : [[
            'Slimes are mostly jelly. If you poke one it goes SPLOOSH!',
            'Watch out for the mushroom things in the woods. They bite!',
            'Herbs heal you in battle. Wren always has more.',
          ][rand(0, 2)]];
        say('PIP', lines);
      },
    },
  ];
  const npcAt = (map, x, y) => NPCS.find((n) => n.map === map && n.x === x && n.y === y);
  const canWalk = (x, y) => {
    const m = MAPS[player.map];
    return !SOLID.has(tileAt(m, x, y)) && !npcAt(player.map, x, y);
  };

  // ---------------------------------------------------------------- audio
  let ac = null, master = null, muted = false, noiseBuf = null;
  function audioInit() {
    try {
      if (!ac) {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = 0.22; master.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { /* audio unavailable */ }
  }
  function tone(f, d, { type = 'square', vol = 0.3, to = null, delay = 0 } = {}) {
    if (!ac || muted) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + d + 0.02);
  }
  function noise(d, { vol = 0.3, delay = 0, freq = 2000 } = {}) {
    if (!ac || muted) return;
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
      const ch = noiseBuf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    }
    const t = ac.currentTime + delay;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + d + 0.02);
  }
  const seq = (notes, step, opts) => notes.forEach((n, i) => n && tone(n, opts.len || step, { ...opts, delay: i * step }));
  const SFX = {
    step: () => { noise(0.035, { vol: 0.12, freq: 700 }); tone(110, 0.03, { vol: 0.05, type: 'triangle' }); },
    bump: () => tone(90, 0.08, { vol: 0.15, to: 60 }),
    blip: () => tone(1200, 0.02, { vol: 0.04 }),
    move: () => tone(520, 0.03, { vol: 0.08 }),
    select: () => { tone(660, 0.05, { vol: 0.12 }); tone(990, 0.06, { vol: 0.12, delay: 0.05 }); },
    hit: () => { noise(0.15, { vol: 0.45, freq: 3500 }); tone(320, 0.12, { to: 70, vol: 0.2 }); },
    crit: () => { noise(0.25, { vol: 0.5, freq: 5000 }); tone(600, 0.2, { to: 80, vol: 0.22 }); },
    hurt: () => { noise(0.2, { vol: 0.4, freq: 1200 }); tone(200, 0.22, { to: 50, vol: 0.22, type: 'sawtooth' }); },
    heal: () => seq([523, 659, 784, 1047], 0.07, { vol: 0.14, type: 'triangle', len: 0.12 }),
    levelUp: () => seq([523, 659, 784, 1047, 0, 784, 1047, 1319], 0.08, { vol: 0.14, len: 0.12 }),
    encounter: () => seq([880, 660, 880, 660, 880, 1175], 0.06, { vol: 0.12 }),
    defeat: () => { seq([392, 523, 659, 784], 0.09, { vol: 0.14, len: 0.14 }); noise(0.4, { vol: 0.2, freq: 900 }); },
    run: () => seq([700, 560, 440, 330], 0.04, { vol: 0.1 }),
    quest: () => seq([659, 784, 988, 1319], 0.1, { vol: 0.14, type: 'triangle', len: 0.18 }),
    faint: () => seq([440, 392, 349, 294, 262], 0.16, { vol: 0.14, type: 'triangle', len: 0.2 }),
    victory: () => {
      seq([523, 523, 523, 659, 0, 587, 659, 0, 784, 1047], 0.12, { vol: 0.13, len: 0.14 });
      seq([262, 0, 330, 0, 392, 0, 330, 0, 392, 523], 0.12, { vol: 0.1, type: 'triangle', len: 0.2 });
    },
  };
  const muteBtn = document.getElementById('mute');
  function toggleMute() {
    muted = !muted;
    muteBtn.textContent = muted ? 'SOUND: OFF' : 'SOUND: ON';
    if (!muted) { audioInit(); SFX.select(); }
  }
  muteBtn.addEventListener('click', (e) => { toggleMute(); e.currentTarget.blur(); });

  // ---------------------------------------------------------------- input
  const held = [];
  let aPressed = false, navPressed = null, queuedDir = null;
  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right', Space: 'a', Enter: 'a', KeyZ: 'a',
  };
  function press(b) {
    audioInit();
    if (b === 'a') { aPressed = true; return; }
    if (!held.includes(b)) held.push(b);
    navPressed = b;
    queuedDir = b; // so a quick tap still takes one step
  }
  function release(b) { const i = held.indexOf(b); if (i >= 0) held.splice(i, 1); }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM') { if (!e.repeat) toggleMute(); return; }
    const b = KEYMAP[e.code];
    if (!b) return;
    e.preventDefault();
    if (!e.repeat) press(b);
  });
  window.addEventListener('keyup', (e) => { const b = KEYMAP[e.code]; if (b) release(b); });
  window.addEventListener('blur', () => { held.length = 0; });
  document.querySelectorAll('#controls button').forEach((btn) => {
    const b = btn.dataset.btn;
    const down = (e) => { e.preventDefault(); btn.setPointerCapture?.(e.pointerId); btn.classList.add('pressed'); press(b); };
    const up = (e) => { e.preventDefault(); btn.classList.remove('pressed'); if (b !== 'a') release(b); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  canvas.addEventListener('pointerdown', () => { audioInit(); if (mode === 'title' || mode === 'victory') aPressed = true; });

  // ---------------------------------------------------------------- helpers: text & ui
  function text(s, x, y, c = 15, font = FONT) {
    ctx.font = font; ctx.textBaseline = 'top';
    ctx.fillStyle = PAL[0]; ctx.fillText(s, x + 1, y + 1);
    ctx.fillStyle = PAL[c]; ctx.fillText(s, x, y);
  }
  function centered(s, y, c = 15, font = FONT) {
    ctx.font = font;
    const w = ctx.measureText(s).width;
    text(s, Math.round((W - w) / 2), y, c, font);
  }
  function box(x, y, w, h) {
    R(ctx, x, y, w, h, 0);
    R(ctx, x + 1, y + 1, w - 2, h - 2, 15);
    R(ctx, x + 2, y + 2, w - 4, h - 4, 2);
  }
  function bar(x, y, w, cur, max) {
    const f = clamp(cur / max, 0, 1);
    R(ctx, x - 1, y - 1, w + 2, 6, 0);
    R(ctx, x, y, w, 4, 1);
    R(ctx, x, y, Math.round(w * f), 4, f > 0.5 ? 11 : f > 0.25 ? 14 : 6);
    R(ctx, x, y, Math.round(w * f), 1, 15);
  }
  function wrap(t, n) {
    const lines = []; let cur = '';
    for (const w of t.split(' ')) {
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= n) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function typed(lines, shown, x, y, lh) {
    let left = Math.floor(shown);
    lines.forEach((l, i) => {
      if (left <= 0) return;
      text(l.slice(0, left), x, y + i * lh);
      left -= l.length;
    });
  }
  function cursor(x, y) { // small right-pointing triangle
    R(ctx, x, y, 1, 7, 15); R(ctx, x + 1, y + 1, 1, 5, 15); R(ctx, x + 2, y + 2, 1, 3, 15); R(ctx, x + 3, y + 3, 1, 1, 15);
  }
  function downArrow(x, y) { R(ctx, x, y, 7, 1, 15); R(ctx, x + 1, y + 1, 5, 1, 15); R(ctx, x + 2, y + 2, 3, 1, 15); R(ctx, x + 3, y + 3, 1, 1, 15); }

  function fadeOut(mid, dur = 30) { fade = { t: 0, dur, mid, fired: false }; }
  function showBanner(t) { banner = { text: t, t: 150 }; }

  // ---------------------------------------------------------------- dialog
  function say(name, texts, onDone) {
    const pages = [];
    for (const t of texts) {
      const lines = wrap(t, 27);
      for (let i = 0; i < lines.length; i += 3) pages.push(lines.slice(i, i + 3));
    }
    dlg = { name, pages, page: 0, chars: 0, onDone };
    mode = 'dialog';
  }
  function updateDialog() {
    const lines = dlg.pages[dlg.page];
    const total = lines.join('').length;
    if (dlg.chars < total) {
      const before = Math.floor(dlg.chars);
      dlg.chars = Math.min(total, dlg.chars + 0.6);
      if (Math.floor(dlg.chars) !== before && before % 3 === 0) SFX.blip();
    }
    if (aPressed) {
      if (dlg.chars < total) dlg.chars = total;
      else if (dlg.page < dlg.pages.length - 1) { dlg.page++; dlg.chars = 0; SFX.move(); }
      else {
        const cb = dlg.onDone;
        dlg = null; mode = 'world';
        NPCS.forEach((n) => { n.dir = n.home; });
        if (cb) cb();
      }
    }
  }
  function drawDialog() {
    const lines = dlg.pages[dlg.page];
    box(4, 108, 232, 48);
    if (dlg.name) {
      const w = dlg.name.length * 8 + 12;
      box(8, 96, w, 16);
      text(dlg.name, 14, 100, 14);
    }
    typed(lines, dlg.chars, 12, 117, 11);
    if (dlg.chars >= lines.join('').length && Math.floor(tick / 20) % 2) downArrow(222, 146);
  }

  // ---------------------------------------------------------------- world
  function heldDir() { return held[held.length - 1]; }
  function interact() {
    const [dx, dy] = DIRS[player.dir];
    const x = player.x + dx, y = player.y + dy;
    const npc = npcAt(player.map, x, y);
    if (npc) { npc.dir = OPP[player.dir]; SFX.move(); npc.talk(); return; }
    const sign = MAPS[player.map].signs?.[`${x},${y}`];
    if (sign) { SFX.move(); say('', sign); }
  }
  function enterMap(name, x, y, dir) {
    Object.assign(player, { map: name, x, y, fx: x, fy: y, tx: x, ty: y, dir, moving: false, t: 0 });
    showBanner(MAPS[name].name);
  }
  function onStep() {
    stats.steps++;
    SFX.step();
    const m = MAPS[player.map];
    const exit = m.exits[`${player.x},${player.y}`];
    if (exit) { fadeOut(() => enterMap(exit.map, exit.x, exit.y, exit.dir)); return; }
    if (m.encounters && tileAt(m, player.x, player.y) === 'g') {
      player.sinceBattle++;
      if (player.sinceBattle > 3 && Math.random() < 0.13) {
        player.sinceBattle = 0;
        held.length = 0;
        encounter = { t: 0 };
        SFX.encounter();
      }
    }
  }
  function updateWorld() {
    if (banner && --banner.t <= 0) banner = null;
    if (player.moving) {
      player.t += 1 / STEP_FRAMES;
      if (player.t >= 1) {
        player.moving = false; player.t = 0;
        player.x = player.tx; player.y = player.ty;
        onStep();
        if (fade || encounter) return;
      } else return;
    }
    if (aPressed) { queuedDir = null; interact(); return; }
    const d = heldDir() || queuedDir;
    queuedDir = null;
    if (!d) return;
    player.dir = d;
    const nx = player.x + DIRS[d][0], ny = player.y + DIRS[d][1];
    if (canWalk(nx, ny)) {
      Object.assign(player, { moving: true, fx: player.x, fy: player.y, tx: nx, ty: ny, t: 0 });
    } else if (tick - lastBump > 18) { SFX.bump(); lastBump = tick; }
  }
  function playerPx() {
    if (!player.moving) return [player.x * TS, player.y * TS];
    const t = player.t;
    return [(player.fx + (player.tx - player.fx) * t) * TS, (player.fy + (player.ty - player.fy) * t) * TS];
  }
  function drawWorld() {
    const m = MAPS[player.map];
    const [px, py] = playerPx();
    const camX = Math.round(clamp(px + 8 - W / 2, 0, m.w * TS - W));
    const camY = Math.round(clamp(py + 8 - H / 2, 0, m.h * TS - H));
    const wf = Math.floor(tick / 30) % 2;
    for (let ty = Math.floor(camY / TS); ty <= Math.floor((camY + H) / TS); ty++) {
      for (let tx = Math.floor(camX / TS); tx <= Math.floor((camX + W) / TS); tx++) {
        const ch = tileAt(m, tx, ty);
        const img = ch === '~' ? water[(wf + tx + ty) % 2] : TILE[ch] || TILE['.'];
        ctx.drawImage(img, tx * TS - camX, ty * TS - camY);
      }
    }
    const ents = NPCS.filter((n) => n.map === player.map).map((n) => ({ y: n.y * TS, img: n.spr[n.dir + (Math.floor((tick + n.x * 13) / 40) % 6 === 0 ? 1 : 0)], x: n.x * TS }));
    const frame = player.moving && player.t < 0.5 ? 1 : 0;
    ents.push({ x: px, y: py, img: SPR.hero[player.dir + frame] });
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) ctx.drawImage(e.img, Math.round(e.x - camX), Math.round(e.y - camY - 1));
  }
  function drawHud() {
    box(2, 2, 92, 30);
    text(`LV${player.lvl}`, 7, 7, 14);
    text(`*${player.herbs}`, 62, 7, 11);
    text(`HP${player.hp}/${player.maxhp}`, 7, 17);
    R(ctx, 6, 27, 84, 2, 1);
    R(ctx, 6, 27, Math.round(84 * player.xp / player.next), 2, 13);
    if (quest.state === 1 || quest.state === 2) {
      const s = quest.state === 1 ? `SLIMES ${quest.kills}/3` : 'SEE ELDER!';
      const w = s.length * 8 + 12;
      box(W - w - 2, 2, w, 16);
      text(s, W - w + 4, 6, quest.state === 2 ? 14 : 15);
    }
    if (banner && mode === 'world') {
      const w = banner.text.length * 8 + 16;
      if (banner.t > 20 || Math.floor(banner.t / 3) % 2) {
        box(Math.round((W - w) / 2), 124, w, 18);
        centered(banner.text, 129, 14);
      }
    }
  }

  // ---------------------------------------------------------------- battle
  function startBattle() {
    // Slimes are more common during the quest, and never more than 2 shroomlets in a row.
    const slimeOdds = quest.state === 1 ? 0.75 : 0.6;
    const type = (Math.random() < slimeOdds || shroomStreak >= 2) ? 'slime' : 'shroom';
    shroomStreak = type === 'shroom' ? shroomStreak + 1 : 0;
    const e = ENEMIES[type], L = player.lvl - 1;
    const hp = e.hp + L * 3;
    battle = {
      type, name: e.name, hp, max: hp, shownHp: hp, atk: e.atk + L, def: e.def + Math.floor(L / 2), xp: e.xp + L * 2,
      menu: 0, phase: 'busy', msg: '', shown: 0, floats: [], shake: 0, flash: 0, lunge: 0, dying: 0, gone: false,
      playerShownHp: player.hp,
    };
    mode = 'battle';
    runIntro(e.intro);
  }
  async function msg(t, hold = 650) {
    battle.msg = t; battle.shown = 0;
    await until(() => battle.shown >= t.length);
    await wait(hold);
  }
  function float(x, y, s, c) { battle.floats.push({ x, y, s, c, t: 0 }); }
  function toMenu() { battle.phase = 'menu'; battle.msg = 'What will you do?'; battle.shown = 99; }
  async function runIntro(intro) {
    await wait(350);
    await msg(`A ${battle.name} ${intro}`, 700);
    toMenu();
  }
  async function act(choice) {
    battle.phase = 'busy';
    SFX.select();
    if (choice === 0) {
      await msg('You swing your sword!', 150);
      const crit = Math.random() < 0.12;
      let dmg = Math.max(1, player.atk + rand(0, 2) - battle.def);
      if (crit) dmg = Math.floor(dmg * 1.8);
      battle.hp = Math.max(0, battle.hp - dmg);
      battle.flash = 24;
      crit ? SFX.crit() : SFX.hit();
      float(64, 36, crit ? `${dmg}!` : `${dmg}`, crit ? 14 : 15);
      if (crit) await msg('A critical hit!', 400); else await wait(500);
      if (battle.hp <= 0) return winBattle();
    } else if (choice === 1) {
      if (player.herbs <= 0) { await msg('No herbs left!', 500); return toMenu(); }
      player.herbs--;
      const amt = Math.min(player.maxhp - player.hp, 10 + player.lvl * 3 + rand(0, 4));
      player.hp += amt;
      SFX.heal();
      float(196, 58, `+${amt}`, 11);
      await msg(`You eat an herb. +${amt} HP`, 600);
    } else {
      if (Math.random() < 0.7) {
        SFX.run();
        await msg('You got away safely!', 500);
        return endBattle();
      }
      await msg("Couldn't get away!", 400);
    }
    await enemyTurn();
  }
  async function enemyTurn() {
    await msg(`${battle.name} attacks!`, 100);
    battle.lunge = 12;
    await wait(150);
    const dmg = Math.max(1, battle.atk + rand(0, 2) - player.def);
    player.hp = Math.max(0, player.hp - dmg);
    battle.shake = 14;
    SFX.hurt();
    float(196, 58, `${dmg}`, 6);
    await wait(650);
    if (player.hp <= 0) return loseBattle();
    toMenu();
  }
  async function winBattle() {
    battle.dying = 40;
    SFX.defeat();
    await wait(700);
    battle.gone = true;
    stats.won++;
    await msg(`${battle.name} is defeated!`, 500);
    player.xp += battle.xp;
    await msg(`You gain ${battle.xp} XP.`, 600);
    while (player.xp >= player.next) {
      player.xp -= player.next;
      player.lvl++;
      player.next = Math.floor(player.next * 1.5);
      player.maxhp += 6; player.atk += 2; player.def += 1;
      player.hp = player.maxhp;
      SFX.levelUp();
      await msg(`LEVEL UP! You are now LV${player.lvl}!`, 900);
      await msg('HP+6 ATK+2 DEF+1. HP refilled!', 900);
    }
    if (battle.type === 'slime') {
      stats.slimes++;
      if (quest.state === 1) {
        quest.kills++;
        if (quest.kills >= 3) {
          quest.state = 2;
          SFX.quest();
          await msg('That makes 3 slimes! Tell Elder Moss!', 1000);
        } else await msg(`Slimes defeated: ${quest.kills}/3`, 700);
      }
    }
    endBattle();
  }
  async function loseBattle() {
    SFX.faint();
    await msg('You collapse...', 1200);
    fadeOut(() => {
      battle = null;
      mode = 'world';
      player.hp = player.maxhp; player.herbs = 3;
      enterMap('village', 13, 5, 'up');
      banner = null;
      say('WREN', ['Easy there! I found you at the edge of the woods.', 'You are all patched up. Be careful out there!']);
    }, 50);
  }
  function endBattle() {
    fadeOut(() => { battle = null; mode = 'world'; held.length = 0; }, 36);
  }
  function updateBattle() {
    const b = battle;
    if (b.shown < b.msg.length) b.shown += 1;
    if (b.flash > 0) b.flash--;
    if (b.shake > 0) b.shake--;
    if (b.lunge > 0) b.lunge--;
    if (b.dying > 0) b.dying--;
    b.shownHp += (b.hp - b.shownHp) * 0.15;
    b.playerShownHp += (player.hp - b.playerShownHp) * 0.15;
    for (const f of b.floats) f.t++;
    b.floats = b.floats.filter((f) => f.t < 60);
    if (b.phase === 'menu') {
      if (navPressed === 'up') { b.menu = (b.menu + 2) % 3; SFX.move(); }
      if (navPressed === 'down') { b.menu = (b.menu + 1) % 3; SFX.move(); }
      if (aPressed) act(b.menu);
    } else if (aPressed && b.shown < b.msg.length) b.shown = b.msg.length;
  }
  function drawBattle() {
    const b = battle;
    ctx.save();
    if (b.shake > 0) ctx.translate(rand(-2, 2), rand(-2, 2));
    // backdrop
    R(ctx, 0, 0, W, 60, 2);
    for (let i = 0; i < 12; i++) { const x = (i * 37 + 11) % W, y = (i * 23) % 40; P(ctx, x, y, Math.floor((tick + i * 9) / 30) % 4 ? 13 : 15); }
    for (let x = -8; x < W + 16; x += 16) ctx.drawImage(TILE['P'], x + ((x / 16) % 2 ? 0 : 8), 44 + ((x / 16) % 3) * 2);
    R(ctx, 0, 60, W, 44, 5);
    for (let y = 62; y < 104; y += 3) for (let x = 0; x < W; x += 2) if (hash(x, y) < 0.04) { P(ctx, x, y, 11); P(ctx, x, y - 1, 11); }
    // enemy
    for (let x = -14; x <= 14; x++) R(ctx, 64 + x, 86, 1, Math.abs(x) < 10 ? 3 : 2, 0);
    if (!b.gone) {
      const frame = Math.floor(tick / 22) % 2;
      const blink = b.flash > 0 && Math.floor(b.flash / 3) % 2 === 0;
      const dyingHide = b.dying > 0 && Math.floor(b.dying / 2) % 2 === 0;
      if (!blink && !dyingHide) {
        const lx = b.lunge > 0 ? Math.round(Math.sin((12 - b.lunge) / 12 * Math.PI) * 14) : 0;
        const sink = b.dying > 0 ? Math.round((40 - b.dying) / 3) : 0;
        ctx.drawImage(ENEMY_SPR[b.type][frame], 40 + lx, 40 + sink, 48, 48 - sink);
      }
    }
    // enemy panel
    box(4, 4, 104, 28);
    text(b.name, 10, 9, 15);
    bar(10, 21, 92, b.shownHp, b.max);
    // player panel
    box(132, 64, 104, 36);
    text('HERO', 138, 69, 14);
    text(`LV${player.lvl}`, 202, 69, 15);
    text(`HP${player.hp}/${player.maxhp}`, 138, 79);
    bar(138, 91, 92, b.playerShownHp, player.maxhp);
    ctx.restore();
    // menu + message
    box(0, 104, 80, 56);
    const opts = ['ATTACK', `HEAL ${player.herbs}`, 'RUN'];
    opts.forEach((o, i) => text(o, 18, 114 + i * 14, b.phase === 'menu' ? (i === 1 && player.herbs === 0 ? 7 : 15) : 10));
    if (b.phase === 'menu' && Math.floor(tick / 16) % 3) cursor(7, 114 + b.menu * 14);
    box(80, 104, 160, 56);
    typed(wrap(b.msg, 18), b.shown, 88, 114, 12);
    // floating damage numbers
    for (const f of b.floats) {
      if (f.t > 40 && f.t % 4 < 2) continue;
      const y = f.y - Math.min(f.t, 24) * 0.6;
      text(f.s, f.x - f.s.length * 4, Math.round(y), f.c);
    }
  }

  // ---------------------------------------------------------------- title & victory
  function drawStars(n = 40) {
    for (let i = 0; i < n; i++) {
      const x = Math.floor(hash(i, 1) * W), y = Math.floor(hash(i, 2) * H);
      const on = Math.floor((tick + i * 17) / 20) % 5;
      if (on) P(ctx, x, y, on === 4 ? 15 : on > 1 ? 13 : 3);
    }
  }
  function drawTitle() {
    R(ctx, 0, 0, W, H, 0);
    drawStars();
    for (let x = 0; x < W; x += 16) ctx.drawImage(TILE['T'], x, 120);
    for (let x = 0; x < W; x += 16) ctx.drawImage(TILE['.'], x, 136);
    for (let x = 0; x < W; x += 16) ctx.drawImage(TILE['.'], x, 152);
    centered('TURNIP', 24, 14, BIG);
    centered('VALE', 44, 11, BIG);
    centered('~ a tiny slime quest ~', 66, 10);
    const bob = Math.floor(tick / 15) % 2;
    ctx.drawImage(SPR.hero['right' + bob], 88, 128 - 16, 16, 16);
    ctx.drawImage(ENEMY_SPR.slime[bob], 130, 112, 16, 16);
    if (Math.floor(tick / 30) % 2) centered(isTouch ? 'TAP A TO START' : 'PRESS SPACE', 88, 15);
  }
  function drawVictory() {
    R(ctx, 0, 0, W, H, 0);
    drawStars(60);
    const t = victory.t;
    // confetti
    for (let i = 0; i < 24; i++) {
      const x = (hash(i, 5) * W + Math.sin((t + i * 20) / 20) * 6) | 0;
      const y = ((hash(i, 6) * H + t * (0.4 + hash(i, 7))) % (H + 10)) - 5 | 0;
      R(ctx, x, y, 2, 2, [14, 6, 13, 11, 9][i % 5]);
    }
    centered('QUEST', 14, 14, BIG);
    centered('COMPLETE!', 34, 14, BIG);
    const bob = Math.floor(t / 12) % 2 ? -2 : 0;
    ctx.drawImage(SPR.hero.down0, 88, 58 + bob, 32, 32);
    ctx.drawImage(SPR.elder.down0, 124, 58, 32, 32);
    centered(`LEVEL ${player.lvl}   WINS ${stats.won}`, 98, 15);
    centered(`SLIMES ${stats.slimes}   STEPS ${stats.steps}`, 110, 15);
    centered('Turnip Vale is saved!', 126, 11);
    if (t > 90 && Math.floor(tick / 30) % 2) centered(isTouch ? 'TAP A TO CONTINUE' : 'PRESS SPACE', 144, 10);
  }

  // ---------------------------------------------------------------- loop
  function update() {
    tick++;
    if (fade) {
      fade.t++;
      if (!fade.fired && fade.t >= fade.dur / 2) { fade.fired = true; fade.mid?.(); }
      if (fade.t >= fade.dur) fade = null;
    } else if (encounter) {
      if (++encounter.t >= 40) { encounter = null; fadeOut(startBattle, 24); }
    } else if (mode === 'title') {
      if (aPressed) {
        SFX.select();
        fadeOut(() => {
          mode = 'world';
          showBanner(MAPS.village.name);
          say('TIP', [isTouch
            ? 'Use the arrow pad to walk. Tap A next to people to talk.'
            : 'Use ARROWS or WASD to walk. Press SPACE next to people to talk.',
          'Elder Moss stands in the middle of the village.']);
        }, 40);
      }
    } else if (mode === 'world') updateWorld();
    else if (mode === 'dialog') { queuedDir = null; updateDialog(); }
    else if (mode === 'battle') updateBattle();
    else if (mode === 'victory') {
      victory.t++;
      if (aPressed && victory.t > 90) { SFX.select(); fadeOut(() => { mode = 'world'; victory = null; }, 40); }
    }
    if (mode !== 'world' || fade || encounter) queuedDir = null;
    aPressed = false; navPressed = null;
  }
  function render() {
    ctx.imageSmoothingEnabled = false;
    if (mode === 'title') drawTitle();
    else if (mode === 'battle') drawBattle();
    else if (mode === 'victory') drawVictory();
    else {
      drawWorld();
      drawHud();
      if (mode === 'dialog') drawDialog();
    }
    if (encounter && Math.floor(encounter.t / 5) % 2 === 0) {
      ctx.globalAlpha = 0.7; R(ctx, 0, 0, W, H, 15); ctx.globalAlpha = 1;
    }
    if (fade) {
      const a = 1 - Math.abs(fade.t / (fade.dur / 2) - 1);
      ctx.globalAlpha = Math.round(a * 4) / 4;
      R(ctx, 0, 0, W, H, 0);
      ctx.globalAlpha = 1;
    }
  }

  let isTouch = false;
  function resize() {
    const ctrl = document.getElementById('controls');
    const bar = document.getElementById('bar');
    isTouch = getComputedStyle(ctrl).display !== 'none';
    const reserved = (isTouch ? ctrl.offsetHeight : 0) + bar.offsetHeight + 60;
    let s = Math.min((window.innerWidth - 32) / W, (window.innerHeight - reserved) / H);
    s = s >= 2 ? Math.floor(s) : Math.max(1, s);
    canvas.style.width = `${Math.floor(W * s)}px`;
    canvas.style.height = `${Math.floor(H * s)}px`;
  }
  window.addEventListener('resize', resize);
  resize();

  let last = performance.now(), acc = 0;
  const STEP = 1000 / 60;
  function loop(now) {
    acc += Math.min(250, now - last);
    last = now;
    while (acc >= STEP) { update(); acc -= STEP; }
    render();
    requestAnimationFrame(loop);
  }
  const fontReady = document.fonts ? Promise.race([document.fonts.load(FONT), wait(2500)]) : Promise.resolve();
  fontReady.finally(() => requestAnimationFrame(loop));

  // expose a tiny debug hook for testing
  window.__rpg = { player, quest, stats, get mode() { return mode; }, get battle() { return battle; } };
})();
