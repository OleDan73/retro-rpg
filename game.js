'use strict';
/* Michael's Quest — a tiny retro RPG. Plain JS + canvas, all art drawn in code. */
(() => {
  // ---------------------------------------------------------------- setup
  const W = 240, H = 160, TS = 16;
  // 16-colour palette, plus two pinks (16, 17) used for the Dadda Boss, Celine's bow and Alexandra's top,
  // and three hero-only colours: near-black hair (18), light brown skin (19), light blonde (20)
  const PAL = [
    '#140c1c', '#442434', '#30346d', '#4e4a4e', '#854c30', '#346524', '#d04648', '#757161',
    '#597dce', '#d27d2c', '#8595a1', '#6daa2c', '#d2aa99', '#6dc2ca', '#dad45e', '#deeed6',
    '#f078b4', '#a03870',
    '#2b2531', '#bf8a5e', '#ead583',
  ];
  const FONT = '8px "Press Start 2P", monospace';
  const BIG = '16px "Press Start 2P", monospace';
  const SAVE_KEY = 'turnip-vale-save-v1';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[rand(0, arr.length - 1)];
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
  function caveFloor(g, seed = 2) {
    R(g, 0, 0, 16, 16, 1);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const h = hash(x + seed * 19, y + seed * 3);
      if (h < 0.05) P(g, x, y, 3); else if (h > 0.98) P(g, x, y, 4);
    }
  }
  const TILE = {};
  TILE['.'] = mk(16, 16, (g) => grass(g));
  // Flower tiles get a second frame where every other flower leans 1px (a gentle sway).
  function flowerTile(seed, flowers, f) {
    return mk(16, 16, (g) => {
      grass(g, seed);
      flowers.forEach(([x0, y, c], i) => {
        const x = x0 + (f && i % 2 === 0 ? 1 : 0);
        P(g, x, y - 1, c); P(g, x - 1, y, c); P(g, x + 1, y, c); P(g, x, y + 1, c); P(g, x, y, c === 14 ? 9 : 14);
      });
    });
  }
  const FLOWERS = {
    ',': [0, 1].map((f) => flowerTile(2, [[3, 3, 15], [11, 6, 6], [5, 12, 15], [13, 13, 14]], f)),
    ';': [0, 1].map((f) => flowerTile(3, [[4, 4, 13], [12, 3, 12], [8, 11, 6], [3, 13, 13]], f)),
  };
  TILE[','] = FLOWERS[','][0];
  TILE[';'] = FLOWERS[';'][0];
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
  TILE['C'] = mk(16, 16, (g) => { // roof with a chimney
    g.drawImage(TILE['R'], 0, 0);
    R(g, 9, 0, 5, 10, 0);
    R(g, 10, 2, 3, 7, 7);
    R(g, 10, 4, 3, 1, 3); R(g, 10, 7, 3, 1, 3);
    R(g, 10, 1, 3, 1, 3);
  });
  // Turnip patch: brown soil with four turnips; `bitten` takes a slimy bite out of the front-left one.
  function turnipTile(bitten) {
    return mk(16, 16, (g) => {
      R(g, 0, 0, 16, 16, 4);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (hash(x + 61, y + 17) < 0.07) P(g, x, y, 1);
      R(g, 0, 8, 16, 1, 1); R(g, 0, 15, 16, 1, 1);
      [[2, 4], [10, 4], [5, 12], [12, 12]].forEach(([x, y], i) => {
        P(g, x, y - 2, 11); P(g, x + 3, y - 2, 11); P(g, x + 1, y - 2, 5); P(g, x + 2, y - 3, 11);
        P(g, x + 1, y - 1, 11); P(g, x + 2, y - 1, 11);
        R(g, x, y, 4, 2, 15); R(g, x + 1, y + 2, 2, 1, 15);
        R(g, x, y, 4, 1, 12); P(g, x + 3, y + 1, 10);
        if (bitten && i === 2) {
          P(g, x + 2, y, 4); P(g, x + 3, y, 4); P(g, x + 3, y + 1, 4);
          P(g, x + 2, y + 1, 12);
          P(g, x + 4, y + 1, 11); P(g, x + 4, y + 2, 11);
        }
      });
    });
  }
  TILE['u'] = turnipTile(false);
  TILE['U'] = turnipTile(true);
  TILE['F'] = mk(16, 16, (g) => { // wooden fence
    grass(g, 5);
    for (const y of [5, 10]) { R(g, 0, y, 16, 1, 9); R(g, 0, y + 1, 16, 1, 4); R(g, 0, y + 2, 16, 1, 0); }
    R(g, 6, 2, 4, 13, 0); R(g, 7, 3, 2, 11, 4); P(g, 7, 3, 9);
    R(g, 5, 15, 6, 1, 5);
  });
  TILE['O'] = mk(16, 16, (g) => { // well
    grass(g, 6);
    R(g, 2, 1, 2, 10, 0); R(g, 12, 1, 2, 10, 0);
    R(g, 3, 2, 1, 8, 4); R(g, 12, 2, 1, 8, 4);
    R(g, 1, 0, 14, 3, 0); R(g, 2, 1, 12, 1, 9);
    R(g, 8, 3, 1, 4, 12);
    R(g, 6, 6, 5, 4, 0); R(g, 7, 7, 3, 2, 7); R(g, 7, 7, 3, 1, 10);
    ellipse(g, 8, 12, 7, 3.6, 0);
    ellipse(g, 8, 12, 6, 2.7, 10);
    ellipse(g, 8, 11.4, 3.6, 1.3, 2);
    [[3, 13], [6, 14], [10, 14], [13, 12], [4, 11]].forEach(([x, y]) => P(g, x, y, 3));
  });
  TILE['b'] = mk(16, 16, (g) => { // barrel
    grass(g, 7);
    R(g, 4, 15, 8, 1, 5);
    ellipse(g, 8, 9, 5, 6.5, 0);
    ellipse(g, 8, 9, 4, 5.5, 4);
    R(g, 4, 5, 8, 1, 3); R(g, 4, 12, 8, 1, 3);
    R(g, 6, 4, 1, 10, 9);
    R(g, 5, 2, 6, 2, 0); R(g, 6, 3, 4, 1, 1);
  });
  TILE['x'] = mk(16, 16, (g) => { // crate
    grass(g, 8);
    R(g, 2, 15, 12, 1, 5);
    R(g, 2, 4, 12, 11, 0);
    R(g, 3, 5, 10, 9, 4);
    R(g, 4, 6, 8, 7, 9);
    for (let i = 0; i < 8; i++) P(g, 4 + i, 6 + Math.floor(i * 7 / 8), 4);
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
  TILE['V'] = mk(16, 16, (g) => { // thorny vines
    forestGround(g, 9);
    for (let i = 0; i < 7; i++) {
      let x = (i * 5 + 1) % 16, y = 15;
      while (y > 0) {
        P(g, x, y, 0); P(g, x + 1, y, 11);
        if (hash(x, y + i * 31) < 0.25) P(g, x + 2, y, 4);
        y--; x = clamp(x + (hash(i, y) < 0.5 ? -1 : 1), 0, 14);
      }
    }
    [[3, 4], [11, 8], [7, 12], [13, 2]].forEach(([x, y]) => { P(g, x, y, 6); P(g, x + 1, y, 6); });
  });
  TILE['c'] = mk(16, 16, (g) => caveFloor(g));
  TILE['X'] = mk(16, 16, (g) => {
    caveFloor(g, 5);
    for (let x = 0; x < 16; x += 2) P(g, x, 0, 3);
    R(g, 0, 1, 2, 14, 3);
  });
  TILE['r'] = mk(16, 16, (g) => { // cave rock wall
    R(g, 0, 0, 16, 16, 3);
    for (const [x, y, w, h] of [[0, 0, 7, 5], [8, 0, 8, 6], [0, 6, 5, 5], [6, 7, 10, 4], [0, 12, 9, 4], [10, 12, 6, 4]]) {
      R(g, x, y, w, h, 7);
      R(g, x, y, w, 1, 10);
      R(g, x + w - 1, y + 1, 1, h - 1, 3);
    }
    for (let i = 0; i < 6; i++) P(g, Math.floor(hash(i, 4) * 16), Math.floor(hash(i, 8) * 16), 0);
  });
  TILE['k'] = mk(16, 16, (g) => { // crystal cluster
    caveFloor(g, 7);
    const spike = (x, top, w) => {
      R(g, x - 1, top, w + 2, 15 - top, 0);
      R(g, x, top + 1, w, 14 - top, 13);
      R(g, x, top + 1, 1, 14 - top, 15);
      R(g, x + w - 1, top + 2, 1, 13 - top, 8);
    };
    spike(2, 8, 3); spike(10, 6, 3); spike(6, 2, 3);
    R(g, 1, 15, 14, 1, 0);
  });
  // A gate in a town wall: 'locked' (red lock), 'open' (doors ajar, can be walked through) or 'shut' (no lock).
  function wallGate(state) {
    const locked = state === 'locked';
    return mk(16, 16, (g) => {
      g.drawImage(TILE['#'], 0, 0);
      R(g, 2, 1, 12, 15, 0);
      R(g, 3, 2, 10, 14, 4);
      for (const x of [5, 8, 11]) R(g, x, 2, 1, 14, 1);
      R(g, 3, 4, 10, 1, 9); R(g, 3, 12, 10, 1, 9);
      if (locked) { R(g, 6, 6, 5, 5, 0); R(g, 7, 7, 3, 3, 6); P(g, 8, 8, 0); }
      else if (state === 'open') R(g, 7, 2, 3, 14, 0);
    });
  }
  TILE['K'] = wallGate('locked');
  TILE['L'] = wallGate('open');
  TILE['G'] = wallGate('shut');
  TILE['N'] = wallGate('open'); // an open gate that cannot be walked through yet: the road behind it is not built
  // ---- Stovner: paved streets, grey blocks with flat roofs, hedges and street lamps
  TILE['p'] = mk(16, 16, (g) => { // paving
    R(g, 0, 0, 16, 16, 7);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const h = hash(x + 23, y + 51);
      if (h < 0.05) P(g, x, y, 10); else if (h > 0.97) P(g, x, y, 3);
    }
    R(g, 0, 7, 16, 1, 3); R(g, 0, 15, 16, 1, 3);
    R(g, 7, 0, 1, 7, 3); R(g, 15, 0, 1, 7, 3); R(g, 3, 8, 1, 7, 3); R(g, 11, 8, 1, 7, 3);
  });
  TILE['A'] = mk(16, 16, (g) => { // flat roof
    R(g, 0, 0, 16, 16, 2);
    R(g, 0, 0, 16, 2, 0); R(g, 0, 2, 16, 1, 8);
    for (let x = 1; x < 16; x += 5) R(g, x, 6, 3, 1, 8);
    for (let x = 3; x < 16; x += 5) R(g, x, 10, 3, 1, 8);
    R(g, 0, 13, 16, 1, 10); R(g, 0, 14, 16, 2, 3);
  });
  function blockWall(g) {
    R(g, 0, 0, 16, 16, 10);
    R(g, 0, 0, 1, 16, 3); R(g, 15, 0, 1, 16, 3);
    R(g, 1, 15, 14, 1, 7);
  }
  TILE['B'] = mk(16, 16, (g) => { // block wall with a window
    blockWall(g);
    R(g, 3, 3, 10, 9, 0); R(g, 4, 4, 8, 7, 2);
    R(g, 4, 4, 8, 1, 13); R(g, 4, 5, 2, 2, 13);
    R(g, 8, 4, 1, 7, 0);
    R(g, 2, 12, 12, 1, 15);
  });
  TILE['d'] = mk(16, 16, (g) => { // block door
    blockWall(g);
    R(g, 3, 2, 10, 14, 0); R(g, 4, 3, 8, 13, 2);
    R(g, 5, 4, 6, 4, 13); R(g, 5, 4, 6, 1, 15);
    P(g, 10, 10, 14);
    R(g, 2, 1, 12, 1, 15);
  });
  TILE['h'] = mk(16, 16, (g) => { // hedge
    grass(g, 9);
    R(g, 0, 2, 16, 13, 0);
    R(g, 0, 3, 16, 11, 5);
    for (let y = 3; y < 14; y++) for (let x = 0; x < 16; x++) {
      const h = hash(x + 9, y + 33);
      if (h < 0.16) P(g, x, y, 11); else if (h > 0.93) P(g, x, y, 0);
    }
    R(g, 0, 3, 16, 1, 11);
  });
  TILE['l'] = mk(16, 16, (g) => { // street lamp
    grass(g, 10);
    R(g, 5, 15, 6, 1, 5);
    R(g, 6, 13, 4, 2, 0); R(g, 7, 6, 2, 8, 0); P(g, 7, 7, 3); P(g, 7, 9, 3); P(g, 7, 11, 3);
    R(g, 4, 0, 8, 7, 0); R(g, 5, 1, 6, 5, 14); R(g, 6, 2, 3, 2, 15);
    R(g, 5, 1, 6, 1, 3);
  });
  TILE['n'] = mk(16, 16, (g) => { // bench
    grass(g, 11);
    R(g, 1, 4, 14, 9, 0);
    R(g, 2, 5, 12, 2, 4); R(g, 2, 5, 12, 1, 9);
    R(g, 2, 8, 12, 2, 4); R(g, 2, 8, 12, 1, 9);
    R(g, 2, 11, 12, 1, 4);
    R(g, 2, 13, 2, 2, 0); R(g, 12, 13, 2, 2, 0);
    R(g, 2, 15, 12, 1, 5);
  });
  TILE['M'] = mk(16, 16, (g) => { // market stall, empty
    grass(g, 12);
    R(g, 0, 0, 16, 7, 0);
    for (let x = 1; x < 15; x++) R(g, x, 1, 1, 5, Math.floor((x - 1) / 2) % 2 ? 15 : 6);
    R(g, 1, 7, 1, 8, 0); R(g, 14, 7, 1, 8, 0);
    R(g, 2, 7, 12, 3, 1);
    R(g, 1, 10, 14, 5, 0); R(g, 2, 11, 12, 3, 4); R(g, 2, 11, 12, 1, 9);
    R(g, 1, 15, 14, 1, 5);
  });
  TILE['J'] = mk(16, 16, (g) => { // barricade across a road
    g.drawImage(pathTile, 0, 0);
    for (const x of [1, 7, 13]) { R(g, x - 1, 1, 4, 15, 0); R(g, x, 3, 2, 12, 4); P(g, x, 2, 9); P(g, x + 1, 2, 4); }
    for (const y of [5, 10]) { R(g, 0, y - 1, 16, 4, 0); R(g, 0, y, 16, 2, 4); R(g, 0, y, 16, 1, 9); }
    for (const [x, y] of [[4, 5], [10, 5], [5, 10], [11, 10]]) P(g, x, y, 10);
  });
  TILE['Q'] = mk(16, 16, (g) => { // tunnel mouth, barred
    g.drawImage(TILE['#'], 0, 0);
    R(g, 2, 3, 12, 13, 0); R(g, 3, 2, 10, 1, 0); R(g, 4, 1, 8, 1, 0);
    R(g, 3, 4, 10, 12, 1); R(g, 4, 3, 8, 1, 1);
    R(g, 4, 9, 8, 7, 0);
    for (const x of [4, 7, 10]) { R(g, x, 3, 1, 13, 10); R(g, x + 1, 3, 1, 13, 3); }
    R(g, 3, 6, 10, 1, 10); R(g, 3, 12, 10, 1, 10);
  });
  TILE['W'] = mk(16, 16, (g) => { // overturned cart
    grass(g, 13);
    R(g, 1, 14, 14, 2, 5);
    R(g, 1, 6, 13, 8, 0); R(g, 2, 7, 11, 6, 4); R(g, 2, 7, 11, 1, 9);
    R(g, 5, 8, 1, 5, 1); R(g, 9, 8, 1, 5, 1);
    circle(g, 11.5, 5.5, 4.6, 0); circle(g, 11.5, 5.5, 3.6, 4); circle(g, 11.5, 5.5, 2.4, 12); circle(g, 11.5, 5.5, 1, 0);
    R(g, 11, 2, 1, 7, 4); R(g, 8, 5, 7, 1, 4);
  });
  TILE['q'] = mk(16, 16, (g) => { // tunnel mouth, open
    g.drawImage(TILE['#'], 0, 0);
    R(g, 2, 3, 12, 13, 0); R(g, 3, 2, 10, 1, 0); R(g, 4, 1, 8, 1, 0);
    R(g, 3, 4, 10, 12, 1); R(g, 4, 3, 8, 1, 1);
    R(g, 4, 8, 8, 8, 0);
    R(g, 4, 12, 8, 1, 3); R(g, 5, 14, 6, 1, 3); // steps going down
  });
  // ---- the tunnel under Stovner: dark brick, paved floor
  TILE['t'] = mk(16, 16, (g) => { // tunnel floor
    R(g, 0, 0, 16, 16, 1);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (hash(x + 71, y + 29) < 0.05) P(g, x, y, 3);
    R(g, 0, 7, 16, 1, 0); R(g, 0, 15, 16, 1, 0);
    R(g, 5, 0, 1, 7, 0); R(g, 13, 8, 1, 7, 0);
  });
  TILE['w'] = mk(16, 16, (g) => { // tunnel wall
    R(g, 0, 0, 16, 16, 3);
    for (let r = 0; r < 4; r++) {
      const y = r * 4;
      R(g, 0, y + 3, 16, 1, 0);
      for (let x = (r % 2) * 4; x < 16; x += 8) R(g, x, y, 1, 3, 0);
      for (let x = (r % 2) * 4 + 1; x < 16; x += 8) R(g, x, y, 3, 1, 7);
    }
  });
  TILE['e'] = mk(16, 16, (g) => { // steps up to the town
    R(g, 0, 0, 16, 16, 0);
    for (let i = 0; i < 4; i++) { R(g, 1 + i, 12 - i * 4, 14 - i * 2, 3, 7); R(g, 1 + i, 12 - i * 4, 14 - i * 2, 1, 10); }
  });
  TILE['Y'] = mk(16, 16, (g) => { // a slate wall covered in chalk
    g.drawImage(TILE['w'], 0, 0);
    R(g, 1, 2, 14, 11, 4); R(g, 2, 3, 12, 9, 0);
    for (const [x, y, w] of [[3, 4, 5], [9, 4, 3], [3, 6, 8], [3, 8, 4], [8, 8, 3]]) R(g, x, y, w, 1, 15);
    R(g, 3, 10, 6, 1, 14);
    R(g, 10, 13, 3, 1, 15);
  });
  TILE['z'] = mk(16, 16, (g) => { // a cave-in
    g.drawImage(TILE['t'], 0, 0);
    for (const [x, y, w, h] of [[0, 9, 7, 7], [6, 6, 8, 10], [10, 2, 6, 14], [2, 3, 6, 6], [0, 0, 5, 4]]) {
      R(g, x, y, w, h, 0); R(g, x + 1, y + 1, w - 2, h - 2, 7); R(g, x + 1, y + 1, w - 2, 1, 10); R(g, x + w - 2, y + 2, 1, h - 3, 3);
    }
  });
  // ---- the shrine at the end of the north road: pale old stone
  TILE['o'] = mk(16, 16, (g) => { // shrine floor
    R(g, 0, 0, 16, 16, 10);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const h = hash(x + 57, y + 83);
      if (h < 0.04) P(g, x, y, 15); else if (h > 0.97) P(g, x, y, 7);
    }
    R(g, 0, 15, 16, 1, 7); R(g, 15, 0, 1, 16, 7);
  });
  TILE['i'] = mk(16, 16, (g) => { // pillar
    g.drawImage(TILE['o'], 0, 0);
    R(g, 3, 13, 10, 3, 0); R(g, 4, 14, 8, 1, 7);
    R(g, 4, 2, 8, 12, 0); R(g, 5, 2, 6, 12, 10); R(g, 5, 2, 1, 12, 15); R(g, 10, 2, 1, 12, 7);
    R(g, 3, 0, 10, 3, 0); R(g, 4, 1, 8, 1, 15);
    P(g, 7, 6, 13); P(g, 8, 9, 13); // a pale glint in the stone
  });
  TILE['I'] = mk(16, 16, (g) => { // the pedestal: a stone block with a hollow the shape of a shard
    g.drawImage(TILE['o'], 0, 0);
    R(g, 1, 12, 14, 4, 0); R(g, 2, 13, 12, 2, 7);
    R(g, 3, 4, 10, 9, 0); R(g, 4, 5, 8, 7, 10); R(g, 4, 5, 8, 1, 15); R(g, 11, 6, 1, 6, 7);
    R(g, 7, 6, 2, 1, 2); R(g, 6, 7, 4, 2, 2); R(g, 7, 9, 2, 1, 2); P(g, 7, 7, 13);
    P(g, 2, 2, 13); P(g, 13, 3, 13); P(g, 12, 1, 15); P(g, 3, 1, 15);
  });
  // The fountain is one 32x32 picture cut into four tiles: '1' '2' above '3' '4'.
  const fountain = mk(32, 32, (g) => {
    for (const [x, y] of [[0, 0], [16, 0], [0, 16], [16, 16]]) g.drawImage(TILE['p'], x, y);
    const disc = (cx, cy, rx, ry, c) => {
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) P(g, x, y, c);
      }
    };
    disc(16, 19, 14, 11, 0); disc(16, 19, 13, 10, 10); disc(16, 20, 13, 9, 3);
    disc(16, 18, 13, 9, 10); disc(16, 18, 11, 7, 8);
    for (const [x, y] of [[9, 16], [21, 15], [12, 22], [22, 21], [7, 19]]) { R(g, x, y, 3, 1, 13); P(g, x + 1, y - 1, 15); }
    R(g, 13, 6, 6, 14, 0); R(g, 14, 7, 4, 13, 10); R(g, 14, 7, 1, 13, 15);
    R(g, 10, 4, 12, 4, 0); R(g, 11, 5, 10, 2, 10); R(g, 11, 5, 10, 1, 15);
    R(g, 15, 1, 2, 3, 13); P(g, 15, 1, 15);
    for (const x of [10, 21]) { R(g, x, 8, 1, 6, 13); P(g, x, 8, 15); }
  });
  [['1', 0, 0], ['2', 16, 0], ['3', 0, 16], ['4', 16, 16]].forEach(([ch, x, y]) => {
    TILE[ch] = mk(16, 16, (g) => g.drawImage(fountain, -x, -y));
  });
  const SOLID = new Set(['T', 'P', '~', '#', 'R', 'H', 'D', 'S', 's', 'V', 'r', 'k', 'C', 'u', 'U', 'F', 'O', 'b', 'x', 'K',
    'G', 'A', 'B', 'd', 'h', 'l', 'n', 'M', 'J', 'Q', 'W', '1', '2', '3', '4', 'w', 'Y', 'z', 'N', 'i', 'I']);

  // ---------------------------------------------------------------- characters
  function personSprite(o, dir, frame) {
    const { hair, shirt, shirt2, pants, skin = 12, robe, beard, longHair } = o;
    const skirt = o.skirt != null;
    const n = o.slim ? 1 : 0; // a slim build is one pixel narrower on each side of the body
    return outlined(mk(16, 16, (g) => {
      if (robe) {
        R(g, 4, 10, 8, 3, shirt);
        R(g, 4, 12, 8, 1, shirt2);
        if (frame) { R(g, 4, 13, 3, 1, 1); R(g, 10, 13, 2, 1, 1); } else { R(g, 5, 13, 2, 1, 1); R(g, 9, 13, 2, 1, 1); }
      } else if (skirt) { // bare legs and shoes; the skirt itself is drawn over the torso below
        if (dir === 'left') {
          if (frame) { R(g, 4 + n, 12, 2, 1, skin); R(g, 9 - n, 12, 2, 1, skin); R(g, 3 + n, 13, 3, 1, 1); R(g, 9 - n, 13, 3, 1, 1); }
          else { R(g, 7, 12, 2, 1, skin); R(g, 6, 13, 4, 1, 1); }
        } else if (frame) {
          R(g, 5, 12, 2, 1, 1);
          R(g, 9, 12, 2, 1, skin); R(g, 9, 13, 2, 1, 1);
        } else {
          R(g, 5, 12, 2, 1, skin); R(g, 9, 12, 2, 1, skin);
          R(g, 5, 13, 2, 1, 1); R(g, 9, 13, 2, 1, 1);
        }
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
      R(g, 4 + n, 7, 8 - 2 * n, 4, shirt);
      if (skirt) { R(g, 4 + n, 10, 8 - 2 * n, 1, o.skirt); R(g, 3 + n, 11, 10 - 2 * n, 1, o.hem ?? o.skirt); }
      else if (!robe) R(g, 4 + n, 10, 8 - 2 * n, 1, o.belt ?? 4);
      if (o.apron && dir !== 'up') R(g, dir === 'left' ? 4 : 5, 8, dir === 'left' ? 4 : 6, 5, o.apron);
      if (dir === 'left') {
        const ay = frame ? 8 : 7;
        R(g, 6, ay, 3, 3, shirt2); R(g, 6, ay + 3, 2, 1, skin);
      } else {
        const l = frame ? 0 : 1, r = frame ? 1 : 0;
        R(g, 3 + n, 7, 1, 2 + l, shirt2); P(g, 3 + n, 9 + l, skin);
        R(g, 12 - n, 7, 1, 2 + r, shirt2); P(g, 12 - n, 9 + r, skin);
      }
      R(g, 5, 2, 6, 5, skin);
      if (dir === 'up') {
        R(g, 4, 1, 8, 6, hair);
        if (longHair) R(g, 4, 7, 8, 2, hair);
        if (o.ponytail != null) { R(g, 7, 7, 2, 3, hair); R(g, 7, 6, 2, 1, o.ponytail); }
        if (o.bow != null) { R(g, 4, 1, 3, 2, o.bow); R(g, 5, 1, 1, 2, o.bowKnot ?? o.bow); }
      } else if (dir === 'left') {
        R(g, 4, 1, 8, 2, hair); R(g, 8, 3, 4, 3, hair); R(g, 4, 3, 1, 1, hair);
        if (longHair) R(g, 9, 6, 3, 3, hair);
        if (o.ponytail != null) { P(g, 12, 3, o.ponytail); R(g, 12, 4, 2, 3, hair); P(g, 13, 7, hair); }
        if (o.bow != null) { R(g, 8, 1, 3, 2, o.bow); R(g, 9, 1, 1, 2, o.bowKnot ?? o.bow); }
        P(g, 6, 4, 0);
        if (beard) R(g, 5, 5, 4, 3, beard);
      } else {
        R(g, 4, 1, 8, 2, hair); R(g, 4, 3, 1, 3, hair); R(g, 11, 3, 1, 3, hair); P(g, 5, 3, hair); P(g, 10, 3, hair);
        if (longHair) { R(g, 4, 6, 1, 3, hair); R(g, 11, 6, 1, 3, hair); }
        if (o.ponytail != null) { P(g, 12, 2, o.ponytail); R(g, 12, 3, 2, 3, hair); P(g, 13, 6, hair); }
        if (o.bow != null) { R(g, 9, 1, 3, 2, o.bow); R(g, 10, 1, 1, 2, o.bowKnot ?? o.bow); }
        P(g, 6, 4, 0); P(g, 9, 4, 0);
        if (beard) { R(g, 6, 5, 4, 3, beard); P(g, 7, 8, beard); P(g, 8, 8, beard); }
        else { P(g, 7, 6, 6); P(g, 8, 6, 6); }
      }
    }));
  }
  function buildChar(o) {
    const s = {};
    for (const d of ['down', 'up', 'left']) for (const f of [0, 1]) s[d + f] = personSprite(o, d, f);
    s.right0 = flip(s.left0); s.right1 = flip(s.left1);
    return s;
  }
  // Same image for every facing (animals, monsters).
  function buildStatic(f0, f1) {
    const s = {};
    for (const d of ['down', 'up', 'left', 'right']) { s[d + 0] = f0; s[d + 1] = f1; }
    return s;
  }

  function slimeSprite(f, main, shade, crown) {
    return outlined(mk(16, 16, (g) => {
      const ry = f ? 4.2 : 5, rx = f ? 7 : 6.2, cy = f ? 10.8 : 10;
      ellipse(g, 8, cy, rx, ry, main);
      ellipse(g, 8, cy + 1.6, rx - 0.6, ry - 1.4, shade);
      ellipse(g, 8, cy - 0.4, rx - 1, ry - 1.2, main);
      const top = Math.floor(cy - ry);
      P(g, 8, top - 1 + (f ? 1 : 0), main);
      R(g, 4, top + 2, 2, 1, 15); P(g, 4, top + 3, 15);
      R(g, 6, Math.floor(cy) - 1, 1, 2, 0); R(g, 10, Math.floor(cy) - 1, 1, 2, 0);
      R(g, 7, Math.floor(cy) + 2, 3, 1, shade);
      if (crown) {
        const y = top - 2;
        R(g, 5, y, 7, 2, 14); R(g, 5, y + 1, 7, 1, 9);
        P(g, 5, y - 1, 14); P(g, 8, y - 1, 14); P(g, 11, y - 1, 14); P(g, 8, y - 2, 14);
        P(g, 8, y, 6);
        P(g, 5, Math.floor(cy) - 2, 0); P(g, 11, Math.floor(cy) - 2, 0);
        R(g, 7, Math.floor(cy) + 2, 3, 1, 0);
      }
    }));
  }
  function batSprite(f) {
    return outlined(mk(16, 16, (g) => {
      const wing = f
        ? [[8, 2, 5], [9, 1, 5], [10, 1, 4], [11, 1, 1], [11, 3, 3]]
        : [[3, 1, 1], [4, 1, 2], [5, 1, 3], [6, 2, 5], [7, 3, 5]];
      for (const [y, x0, x1] of wing) {
        for (let x = x0; x <= x1; x++) { P(g, x, y, 2); P(g, 15 - x, y, 2); }
      }
      ellipse(g, 8, 8.5, 2.6, 3.2, 1);
      P(g, 6, 5, 1); P(g, 9, 5, 1);
      P(g, 7, 7, 14); P(g, 9, 7, 14);
      P(g, 7, 10, 15); P(g, 9, 10, 15);
    }));
  }
  function catSprite(f) {
    return outlined(mk(16, 16, (g) => {
      ellipse(g, 8, 11, 4, 3, 9);
      R(g, 5, 13, 6, 1, 9);
      circle(g, 8, 6.5, 3.2, 9);
      R(g, 5, 3, 1, 2, 9); R(g, 10, 3, 1, 2, 9); P(g, 6, 4, 9); P(g, 9, 4, 9);
      R(g, 7, 4, 2, 1, 4); R(g, 6, 10, 1, 2, 4); R(g, 10, 10, 1, 2, 4);
      P(g, 7, 6, 0); P(g, 9, 6, 0); P(g, 8, 7, 6);
      P(g, 8, 9, 14);
      if (f) { R(g, 12, 8, 1, 4, 9); P(g, 13, 7, 9); } else { R(g, 12, 12, 3, 1, 9); P(g, 14, 11, 9); }
      R(g, 6, 13, 1, 1, 15); R(g, 9, 13, 1, 1, 15);
    }));
  }
  // Playable heroes. They all share the same stats and abilities; only the name and sprite differ.
  const HEROES = {
    michael: { name: 'MICHAEL', spr: buildChar({ hair: 18, shirt: 8, shirt2: 2, pants: 2 }) },
    mohammed: { name: 'MOHAMMED', spr: buildChar({ hair: 1, skin: 19, shirt: 6, shirt2: 1, pants: 3 }) },
    celine: { name: 'CELINE', spr: buildChar({ hair: 20, shirt: 13, shirt2: 8, skirt: 13, hem: 8, longHair: true, bow: 16, bowKnot: 17 }) },
    alexandra: { name: 'ALEXANDRA', spr: buildChar({ hair: 18, shirt: 16, shirt2: 9, skirt: 9, hem: 4, ponytail: 6, slim: true }) },
  };
  const HERO_ORDER = ['michael', 'mohammed', 'celine', 'alexandra']; // order on the hero-selection screen
  // Heroes that have been replaced: a save made with the old id carries on as the new hero.
  const HERO_RENAMED = { sandra: 'alexandra' };
  const DEFAULT_HERO = 'michael';
  const isHero = (id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(HEROES, id);
  // The hero being played. Anything unknown (such as a save from before heroes existed) counts as Michael.
  const hero = () => HEROES[isHero(player.hero) ? player.hero : DEFAULT_HERO];
  const SPR = {
    elder: buildChar({ hair: 10, shirt: 5, shirt2: 0, pants: 5, robe: true, beard: 15 }),
    wren: buildChar({ hair: 6, shirt: 15, shirt2: 10, pants: 13, longHair: true }),
    pip: buildChar({ hair: 14, shirt: 9, shirt2: 4, pants: 4 }),
    bram: buildChar({ hair: 0, shirt: 6, shirt2: 1, pants: 3, beard: 4, apron: 4, belt: 0 }),
    cat: buildStatic(catSprite(0), catSprite(1)),
    king: buildStatic(slimeSprite(0, 16, 17, true), slimeSprite(1, 16, 17, true)),
  };
  const ENEMY_SPR = {
    slime: [0, 1].map((f) => slimeSprite(f, 11, 5)),
    gloop: [0, 1].map((f) => slimeSprite(f, 13, 8)),
    king: [0, 1].map((f) => slimeSprite(f, 16, 17, true)),
    bat: [0, 1].map(batSprite),
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
  // ---- Stovner's people
  SPR.johanne = buildChar({ hair: 4, shirt: 11, shirt2: 5, skirt: 11, hem: 5, longHair: true, bow: 14 });
  SPR.basil = buildChar({ hair: 0, shirt: 15, shirt2: 10, pants: 3, beard: 0, apron: 6, belt: 0 });
  SPR.dot = buildChar({ hair: 10, shirt: 17, shirt2: 1, skirt: 17, hem: 1 });
  SPR.gus = buildChar({ hair: 7, shirt: 2, shirt2: 0, pants: 3, beard: 7 });
  // LÆRER HEIDI: a broad stone golem with a bun, spectacles and a pointer.
  function heidiSprite(f) {
    return outlined(mk(16, 16, (g) => { // the top rows stay empty: in battle they would sit behind the name box
      const o = f ? 1 : 0;
      R(g, 2, 8, 12, 6, 7); R(g, 2, 8, 12, 1, 10); R(g, 13, 9, 1, 5, 3);
      R(g, 4, 3, 8, 5, 7); R(g, 4, 3, 8, 1, 10); R(g, 11, 4, 1, 4, 3);
      R(g, 6, 2, 4, 1, 3);
      R(g, 5, 5, 2, 2, 15); R(g, 9, 5, 2, 2, 15); R(g, 7, 5, 2, 1, 15); P(g, 6, 6, 2); P(g, 10, 6, 2);
      R(g, 7, 7, 2, 1, 1);
      R(g, 0, 9 + o, 2, 5, 7); R(g, 0, 9 + o, 2, 1, 10); R(g, 0, 13 + o, 2, 1, 3);
      R(g, 14, 7 + o, 2, 6, 7); R(g, 14, 7 + o, 2, 1, 10);
      R(g, 15, 2 + o, 1, 5, 12); P(g, 15, 2 + o, 15);
      R(g, 3, 14, 4, 2, 3); R(g, 9, 14, 4, 2, 3);
      R(g, 2, 10, 12, 2, 3); for (const x of [3, 6, 9, 12]) P(g, x, 10, 10);
      P(g, 8, 9, 6);
    }));
  }
  SPR.heidi = buildStatic(heidiSprite(0), heidiSprite(1));
  // MOHSIN: a tall figure in a dark robe with a pale headband. In battle he stands facing the hero,
  // one pixel lower than usual (so his head clears the name box), with a long blade at his side.
  const MOHSIN_LOOK = { hair: 0, skin: 19, shirt: 2, shirt2: 0, pants: 2, robe: true, beard: 0 };
  SPR.mohsin = buildChar(MOHSIN_LOOK);
  for (const k of ['down0', 'down1']) {
    const plain = SPR.mohsin[k];
    SPR.mohsin[k] = mk(16, 16, (g) => { g.drawImage(plain, 0, 0); R(g, 5, 3, 6, 1, 13); });
  }
  ENEMY_SPR.mohsin = [0, 1].map((f) => mk(16, 16, (g) => {
    g.drawImage(SPR.mohsin['down' + f], 0, 1);
    R(g, 13, 2 + f, 3, 13, 0); R(g, 14, 3 + f, 1, 9, 15); P(g, 14, 2 + f, 13); R(g, 13, 12 + f, 3, 1, 9); R(g, 14, 13 + f, 1, 2, 4);
  }));
  ENEMY_SPR.heidi = [0, 1].map(heidiSprite);
  const KEBAB_SPR = outlined(mk(16, 16, (g) => {
    R(g, 5, 7, 6, 7, 15); R(g, 5, 7, 1, 7, 10); R(g, 6, 13, 4, 1, 10);
    R(g, 5, 4, 6, 3, 4); P(g, 6, 4, 11); P(g, 9, 5, 6); P(g, 7, 5, 15); P(g, 10, 4, 11);
  }));
  // ---- Stovner's monsters
  ENEMY_SPR.blue = [0, 1].map((f) => slimeSprite(f, 8, 2));
  // The glint slime is a blue slime with pale eyes and slivers of something bright growing out of its back.
  ENEMY_SPR.glint = [0, 1].map((f) => mk(16, 16, (g) => {
    g.drawImage(slimeSprite(f, 8, 2), 0, 0);
    const o = f ? 1 : 0, cy = f ? 10 : 10;
    R(g, 6, cy - 1, 1, 2, 13); R(g, 10, cy - 1, 1, 2, 13);
    for (const [x, top, h] of [[3, 4, 4], [7, 1, 5], [11, 3, 4]]) {
      R(g, x - 1, top + o - 1, 4, h + 1, 0);
      R(g, x, top + o, 2, h, 13); R(g, x, top + o, 1, h - 1, 15); P(g, x + 1, top + o + h - 1, 8);
    }
  }));
  ENEMY_SPR.rat = [0, 1].map((f) => outlined(mk(16, 16, (g) => {
    const o = f ? 1 : 0;
    for (const [x, y] of [[3, 11], [2, 10], [1, 9], [0, 8], [0, 7], [1, 6]]) P(g, x, y + o, 12); // tail
    ellipse(g, 7.5, 10.5 + o, 5, 3.4, 7);
    ellipse(g, 7.5, 12 + o, 4, 1.6, 3);
    ellipse(g, 12, 9 + o, 3, 2.6, 7);
    R(g, 10, 5 + o, 2, 2, 7); P(g, 10, 5 + o, 12); // ear
    P(g, 13, 8 + o, 0); P(g, 15, 9 + o, 16); // eye, nose
    R(g, 13, 11 + o, 1, 2, 15); // one big tooth
    if (f) { R(g, 4, 14, 2, 1, 12); R(g, 10, 14, 2, 1, 12); } else { R(g, 5, 14, 2, 1, 12); R(g, 9, 14, 2, 1, 12); }
  })));
  ENEMY_SPR.golem = [0, 1].map((f) => outlined(mk(16, 16, (g) => {
    const o = f ? 1 : 0;
    R(g, 3, 5, 10, 9, 7); R(g, 3, 5, 10, 1, 10); R(g, 12, 6, 1, 8, 3);
    R(g, 5, 1, 6, 4, 7); R(g, 5, 1, 6, 1, 10); R(g, 10, 2, 1, 3, 3);
    P(g, 6, 3, 14); P(g, 9, 3, 14);
    R(g, 0, 6 + o, 3, 6, 7); R(g, 0, 6 + o, 3, 1, 10); R(g, 0, 11 + o, 3, 2, 3);
    R(g, 13, 6 + o, 3, 6, 7); R(g, 13, 6 + o, 3, 1, 10); R(g, 13, 11 + o, 3, 2, 3);
    R(g, 4, 14, 3, 2, 3); R(g, 9, 14, 3, 2, 3);
    R(g, 3, 8, 10, 2, 3); for (const x of [4, 7, 10]) P(g, x, 8, 10); // an iron band with rivets
    P(g, 5, 11, 3); P(g, 6, 12, 3); P(g, 10, 11, 3);
  })));
  const CHEST_SPR = [0, 1].map((f) => outlined(mk(16, 16, (g) => {
    R(g, 3, 8, 10, 6, 4); R(g, 3, 5, 10, 3, 9); R(g, 3, 5, 10, 1, 14);
    R(g, 3, 8, 10, 1, 1); R(g, 3, 13, 10, 1, 1);
    R(g, 3, 5, 1, 9, 1); R(g, 12, 5, 1, 9, 1);
    R(g, 7, 7, 2, 3, 14); P(g, 7, 9, 9);
    if (f) P(g, 10, 6, 15); else P(g, 5, 6, 15);
  })));
  const SHARD_SPR = [0, 1].map((f) => outlined(mk(16, 16, (g) => {
    P(g, 8, 5, 13); R(g, 7, 6, 3, 1, 13); R(g, 6, 7, 5, 2, 13); R(g, 7, 9, 3, 1, 13); P(g, 8, 10, 13);
    P(g, 7, 7, 15); P(g, 8, 6, 15); R(g, 9, 8, 2, 1, 8); P(g, 8, 10, 8);
    if (f) { P(g, 12, 4, 15); P(g, 12, 3, 15); P(g, 11, 4, 15); } else { P(g, 4, 6, 15); }
  })));

  // name, base stats, gold range, battle intro
  // A boss also has a `boss` block. The battle engine asks it how the fight works, so the engine
  // itself never needs to know which boss it is:
  //   flash      colour of the screen flash when the fight begins
  //   noEscape   line shown when the hero tries to run (leave it out and running works as usual)
  //   turn(b)    the boss's whole turn, in place of a plain attack. It uses the battle helpers
  //              (msg, enemyHit, SFX) and may keep its own state on the battle object `b`;
  //              b.charged also makes the sprite swell on screen.
  //   defeated   line shown when the boss is beaten
  //   quest      quest that becomes ready to turn in when the boss is beaten
  //   aftermath  closing line of the battle
  //   named      the name is a person's: no "The" in front of it when the fight begins
  //   flag       saved flag set when the boss is beaten
  //   after()    called back in the world once the won battle has faded out and been saved
  // An ordinary enemy may set:
  //   armored    its defence only counts against weapons that are not `heavy`
  //   quick      it strikes once before the hero's first move, unless the hero's armour is `nimble`
  //   turn(b)    its whole turn in place of a plain attack, as for a boss
  //   defeated   line shown when it is beaten
  const ENEMIES = {
    slime: { name: 'SLIME', hp: 12, atk: 4, def: 0, xp: 5, gold: [3, 5], intro: 'oozes out!' },
    shroom: { name: 'SHROOMLET', hp: 16, atk: 5, def: 1, xp: 7, gold: [4, 6], intro: 'pops up!' },
    bat: { name: 'CAVE BAT', hp: 26, atk: 11, def: 2, xp: 12, gold: [6, 9], intro: 'swoops down!' },
    gloop: { name: 'GLOOP', hp: 36, atk: 13, def: 3, xp: 15, gold: [8, 11], intro: 'bubbles up!' },
    // ---- Stovner
    blue: { name: 'BLUE SLIME', hp: 44, atk: 19, def: 5, xp: 22, gold: [10, 14], intro: 'oozes out!' },
    rat: { name: 'STOVNER RAT', hp: 34, atk: 17, def: 3, xp: 20, gold: [8, 12], intro: 'scurries out!', quick: true },
    golem: {
      name: 'TUNNEL GOLEM', hp: 44, atk: 22, def: 16, xp: 34, gold: [16, 22], intro: 'lumbers up!', armored: true,
      // Slow: it only strikes on every second turn.
      async turn(b) {
        if (b.turn % 2) { await msg('The TUNNEL GOLEM grinds slowly forward...', 500); return; }
        await msg(`${b.name} swings a stone fist!`, 100);
        await enemyHit(1);
      },
    },
    glint: {
      name: 'GLINT SLIME', hp: 72, atk: 22, def: 8, xp: 60, gold: [30, 40], intro: 'glitters into view!',
      // On its second turn, and every third turn after that, it mends itself instead of attacking.
      async turn(b) {
        if (b.turn % 3 === 2 && b.hp < b.max) {
          b.hp = Math.min(b.max, b.hp + 14);
          SFX.heal();
          await msg('The GLINT SLIME shimmers. Its wounds close!', 700);
          return;
        }
        await msg(`${b.name} attacks!`, 100);
        await enemyHit(1);
      },
      defeated: 'The GLINT SLIME crumbles into glittering dust.',
    },
    king: {
      name: 'DADDA BOSS', hp: 140, atk: 15, def: 5, xp: 80, gold: [100, 100], intro: 'blocks your way!',
      boss: {
        flash: 6,
        noEscape: "There's no escape from the Dadda Boss!",
        // Every third turn she puffs up instead of attacking, then belly-flops on her next turn.
        async turn(b) {
          if (b.charged) {
            b.charged = false;
            await msg('BELLY FLOP!!', 100);
            await enemyHit(2.2);
          } else if (b.turn % 3 === 0) {
            b.charged = true;
            SFX.charge();
            await msg('The DADDA BOSS puffs up huge! Brace yourself!', 900);
            return;
          } else {
            await msg(`${b.name} attacks!`, 100);
            await enemyHit(1);
          }
          if (!b.wobbled && b.hp < b.max * 0.3) { b.wobbled = true; await msg('The DADDA BOSS is wobbling!', 600); }
        },
        defeated: 'The DADDA BOSS melts into a puddle!',
        quest: 'king',
        aftermath: 'The cave falls quiet. Return to Elder Moss!',
      },
    },
  };
  // The hero keeps every weapon and armour ever gained (player.weapons, player.armors) and wears one of
  // each (player.weapon, player.armor). The menu lists them in the order they are written here.
  //   heavy    the weapon ignores the defence of `armored` enemies
  //   nimble   `quick` enemies do not get their opening strike against this armour
  //   swing    battle line for an attack (default: 'You swing your sword!')
  //   desc     shown in the menu; at most three lines of 16 letters
  // (defined after the table so that the table above stays in story order)
  ENEMIES.heidi = {
    name: 'LÆRER HEIDI', hp: 100, atk: 20, def: 14, xp: 70, gold: [60, 60], intro: 'stomps forward!', armored: true,
    boss: {
      flash: 10,
      named: true,
      // Two stone strikes, then a warning, then the pop quiz: a blow twice as hard.
      async turn(b) {
        if (b.quiz) { // (not b.charged: that swells the sprite, and she is tall enough already)
          b.quiz = false;
          await msg('POP QUIZ!!', 100);
          await enemyHit(2);
        } else if (b.turn % 4 === 3) {
          b.quiz = true;
          SFX.charge();
          await msg('LÆRER HEIDI raps her pointer. "PAY ATTENTION!"', 900);
        } else {
          await msg(`${b.name} swings a stone fist!`, 100);
          await enemyHit(1);
        }
      },
      defeated: 'LÆRER HEIDI sits down with a crunch. "Class... dismissed."',
      quest: 'under',
      aftermath: 'The tunnel falls quiet. Tell JOHANNE!',
    },
  };
  ENEMIES.mohsin = {
    name: 'MOHSIN', hp: 125, atk: 23, def: 6, xp: 110, gold: [120, 120], intro: 'stands ready!', quick: true,
    boss: {
      flash: 8,
      named: true,
      // Four turns, over and over: a strike, a quick one-two, a step back, then a lunge with full force.
      async turn(b) {
        const step = b.turn % 4;
        if (step === 1) {
          await msg(`${b.name} strikes!`, 100);
          await enemyHit(1);
        } else if (step === 2) {
          await msg('MOHSIN darts in. One, two!', 100);
          await enemyHit(0.8);
          if (player.hp > 0) await enemyHit(0.8);
        } else if (step === 3) {
          SFX.charge();
          await msg('MOHSIN steps back and watches you closely.', 900);
        } else {
          await msg('MOHSIN lunges with full force!', 100);
          await enemyHit(1.8);
        }
      },
      defeated: 'MOHSIN steps back and lowers the blade. "Enough."',
      flag: 'mohsinBeaten',
      after: () => mohsinHandover(),
    },
  };
  const WEAPONS = {
    none: { name: 'STICK', atk: 0, desc: 'Better than nothing.' },
    iron: { name: 'IRON SWORD', atk: 3, desc: 'Sturdy and sharp. Good against anything.' },
    crystal: { name: 'CRYSTAL SWD', atk: 7, desc: 'Very sharp. The best blade around.' },
    axe: { name: 'HEAVY AXE', atk: 2, heavy: true, swing: 'You swing your axe!', desc: 'Smashes through armour. Clumsy otherwise.' },
  };
  const ARMORS = {
    none: { name: 'TUNIC', def: 0, desc: 'Plain cloth.' },
    vest: { name: 'TOUGH VEST', def: 2, desc: 'Padded leather. Solid protection.' },
    light: { name: 'LIGHT VEST', def: 1, nimble: true, desc: 'Quick enemies cannot strike you first.' },
  };

  // ---------------------------------------------------------------- maps
  // Everything that makes an area behave or look different lives in its entry here, so a new area
  // needs no code of its own. Besides name, rows, exits and signs, a map may set:
  //   encounter  random battles, or null for none:
  //                tile       the tile that can trigger a battle
  //                table      [enemy, probability] pairs
  //                pick()     optional: chooses the enemy itself when the area has special rules
  //                scaleFrom  enemies gain one level for each hero level above this (default 1)
  //                minSteps, chance   optional overrides of ENCOUNTER_DEFAULTS
  //                zones      in place of tile and table: a list of { at: [x0, y0, x1, y1], table }.
  //                           Battles only happen inside a zone (the first one that holds the hero),
  //                           with that zone's enemies; everywhere else on the map is safe.
  //   backdrop   which BACKDROPS entry is drawn behind battles here (default 'woods')
  //   ambient    decorative life, never saved:
  //                ripples       true: rings appear on water tiles
  //                chimneySmoke  {}: smoke rises from chimney tiles; forge: 'x,y' marks the smithy's chimney
  //                butterflies   list of [x, y, colour, phase] anchor points in pixels
  //   lighting   dimEdges: 0..1 darkens the edges of the screen by that much
  // A sign is a list of lines, or a function that shows whatever fits the moment.
  const ENCOUNTER_DEFAULTS = { minSteps: 3, chance: 0.13, scaleFrom: 1 };
  const MAPS = {
    village: {
      name: 'TURNIP VALE',
      rows: [
        '####################',
        '#.T....,FFF;..T...T#',
        '#..RCRR.uuu.RRCR...#',
        '#..HHDH.uUu.HDHH...#',
        '#..;.=.......=..~~.#',
        '#....=========..~~.#',
        '#.,.......=.O...~~.#',
        'K.........=========E',
        '#..RCRR.bx=...,FFFS#',
        '#..HHDH...=..T.uuu.#',
        '#....======....uuu.#',
        '#.T.......,..~~~...#',
        '#;..,.....T..~~~.T.#',
        '#..T..,..;.........#',
        '####################',
      ],
      exits: {
        '19,7': { map: 'forest', x: 1, y: 7, dir: 'right' },
        '0,7': { map: 'stovner', x: 24, y: 9, dir: 'left' }, // the old gate; shut until the Red Key opens it
      },
      signs: {
        '18,8': ['EAST: WHISPER WOODS.', 'Beware of slimes!'],
        '12,6': ['The village well. The water is cool and clear.', 'Somewhere far below, something goes *plip*.'],
        '9,3': ['A turnip with a big bite taken out of it.', 'The bite marks are... wobbly. Slimes!'],
      },
      encounter: null,
      ambient: {
        ripples: true,
        chimneySmoke: { forge: '4,8' }, // the forge chimney gets darker smoke and the odd spark
        butterflies: [[152, 36, 15, 0], [72, 196, 14, 2.1]],
      },
    },
    forest: {
      name: 'WHISPER WOODS',
      rows: [
        'PPPPPPPPPPPPPPPPPPPP',
        'PggggPPggmgggPPgggsP',
        'PgPgggggggPgggggPggP',
        'Pggmgggggggggggg~~VE',
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
      ],
      exits: {
        '0,7': { map: 'village', x: 18, y: 7, dir: 'left' },
        '19,3': { map: 'cave', x: 1, y: 7, dir: 'right' },
      },
      signs: { '2,6': ['WEST: TURNIP VALE.'], '18,1': ['EAST: CRYSTAL CAVE.', 'Keep out! By order of the DADDA BOSS.'] },
      encounter: {
        tile: 'g',
        table: [['slime', 0.6], ['shroom', 0.4]],
        // Slimes are more common during the slime quest; never more than 2 shroomlets in a row.
        pick() {
          const slimeOdds = q.slimes.s === 1 ? 0.75 : 0.6;
          const type = (Math.random() < slimeOdds || shroomStreak >= 2) ? 'slime' : 'shroom';
          shroomStreak = type === 'shroom' ? shroomStreak + 1 : 0;
          return type;
        },
      },
      backdrop: 'woods',
    },
    cave: {
      name: 'CRYSTAL CAVE',
      rows: [
        'rrrrrrrrrrrrrrrrrrrr',
        'rrrrrrrrcccccrrrrrrr',
        'rrkcccrrcccccrrcckrr',
        'rccccccrcccccrcccccr',
        'rcckcccrrrcrrrcc~~cr',
        'rccccrccccccccc~~ccr',
        'rrcccrcckcccrccccccr',
        'Xcccccccccccrcckcccr',
        'rrccrrrcccccccccrrcr',
        'rccccrrcc~~ccrcccccr',
        'rckcccccc~~ccrcckccr',
        'rccccrcccccccccccccr',
        'rrcccrrcckccrrcccrrr',
        'rrrcccccccccccccrrrr',
        'rrrrrrrrrrrrrrrrrrrr',
      ],
      exits: { '0,7': { map: 'forest', x: 18, y: 3, dir: 'left' } },
      signs: {},
      encounter: { tile: 'c', table: [['bat', 0.5], ['gloop', 0.5]], scaleFrom: 5 },
      backdrop: 'cave',
      lighting: { dimEdges: 0.35 },
    },
    // ---- Chapter 2: Stovner. A safe town with roads out in every direction, and the open land north of it.
    // Still closed: the west gate, the road north past the barricade, and the caved-in end of the tunnel.
    stovner: {
      name: 'STOVNER',
      rows: [
        'hhhhhhhhhhhhpphhhhhhhhhhhh',
        '#.T..AAAA..Spp...AAAA..T.#',
        '#....BBBB...pp...BBBB....#',
        '#....BdBB..lppl..BBdB....#',
        '#..pppppppppppppppppppp..#',
        '#.,p....;...pp...,....p.T#',
        '#..p.AAA..pppppp..AAA.p..#',
        '#..p.BBB.pppppppp.BBB.p..#',
        '#..p.BdB.ppp12ppp.BdB.p.S#',
        'Gppppppppppp34pppppppppppL',
        '#..p..n..pppppppp..M..p..#',
        '#..p.;....pppppp....,.p..#',
        '#..p.AAAA...pp...AAAA.p..#',
        '#.Tp.BBBB...pp...BBBB.p.T#',
        '#..p.BdBB..lppl..BBdB.p..#',
        '#..pppppppppppppppppppp..#',
        '#.,......;.#QQ#....;....T#',
        'hhhhhhhhhhhhhhhhhhhhhhhhhh',
      ],
      exits: {
        '25,9': { map: 'village', x: 1, y: 7, dir: 'right' },
        '12,0': { map: 'stovnerOuter', x: 14, y: 18, dir: 'up' },
        '13,0': { map: 'stovnerOuter', x: 15, y: 18, dir: 'up' },
        '12,16': { map: 'tunnel', x: 9, y: 1, dir: 'down' }, // the tunnel mouths; barred until JOHANNE has them opened
        '13,16': { map: 'tunnel', x: 10, y: 1, dir: 'down' },
      },
      signs: {
        '24,8': ['EAST: TURNIP VALE.'],
        '11,1': ['NORTH: OUTER STOVNER.'],
      },
      encounter: null,
    },
    stovnerOuter: {
      name: 'OUTER STOVNER',
      rows: [
        'TTTTTTTTTTTTrr==rrTTTTTTTTTTTT',
        'T..,...T..rrrr==rrrr.....T...T',
        'T.T.......rrrrJJrrrr.......;.T',
        'T....====..T..==......=====..T',
        'T.,..=..=.....==......=...=.TT',
        'T....=..========..T...=...=..T',
        'TT...=..=..T..==......=...=..T',
        'T..T.====.....=========...=.,T',
        'T......=...;..==...T......=..T',
        'T.~~~..=......==.......W..=..T',
        'T~~~~~.=..T...==....=======..T',
        'T~~~~~.=......==....=...T....T',
        'T.~~~..================...T..T',
        'T......=....T.==..,..........T',
        'T.T....=......==......T..;...T',
        'T...,..====...==...T.........T',
        'TT........=...==.........T...T',
        'T..T..;...======....T........T',
        'T........T....==S.;.....T....T',
        'TTTTTTTTTTTTTT==TTTTTTTTTTTTTT',
      ],
      exits: {
        '14,19': { map: 'stovner', x: 12, y: 1, dir: 'down' },
        '15,19': { map: 'stovner', x: 13, y: 1, dir: 'down' },
        '14,0': { map: 'northRoad', x: 5, y: 18, dir: 'up' }, // behind the barricade, which stands until JOHANNE has it cleared
        '15,0': { map: 'northRoad', x: 6, y: 18, dir: 'up' },
      },
      signs: {
        '16,18': ['SOUTH: STOVNER.'],
        '23,9': () => cartSign(),
      },
      // The avenue, the west loop, the lake shore, the south entrance and the far north-east are safe.
      encounter: {
        chance: 0.1, minSteps: 4, scaleFrom: 9,
        zones: [
          { at: [1, 1, 9, 2], table: [['glint', 0.3], ['blue', 0.7]] }, // the far north-west corner
          { at: [10, 3, 20, 4], table: [['golem', 0.7], ['rat', 0.3]] }, // under the rocks
          { at: [16, 5, 28, 11], table: [['rat', 0.7], ['blue', 0.3]] }, // the east loop, around the cart
          { at: [9, 6, 13, 11], table: [['blue', 0.6], ['rat', 0.4]] }, // the meadow west of the avenue
          { at: [1, 13, 9, 18], table: [['blue', 0.8], ['rat', 0.2]] }, // the south-west meadow
          { at: [18, 13, 28, 17], table: [['blue', 0.7], ['rat', 0.3]] }, // the south-east meadow
        ],
      },
      ambient: { ripples: true, butterflies: [[150, 136, 15, 1.3], [420, 232, 14, 0.4]] },
    },
  };
  // The tunnel under Stovner: steps down from the town, a ring of passage, and one room at the far end.
  MAPS.tunnel = {
    name: 'STOVNER TUNNEL',
    rows: [
      'wwwwwwwwweewwwwwwwww',
      'wwwwwwwwttttwwwwwwww',
      'wwwwwwwwttttwwwwwwww',
      'wwwttttttttttttttwww',
      'wwwtwwwwwwwwwwwwtwww',
      'wwwtwwwwwwwwwwwwtwww',
      'wwwtwwwwwwwwwwwwtwww',
      'wwwttttttttttttttwww',
      'wwwwwwwwwttwwwwwwwww',
      'wwwwwwwwwtwYwwwwwwww',
      'wwwwwwkttttttwwwwwww',
      'wwwwwwtttttttzwwwwww',
      'wwwwwwttttttkwwwwwww',
      'wwwwwwwwwwwwwwwwwwww',
    ],
    exits: {
      '9,0': { map: 'stovner', x: 12, y: 15, dir: 'up' },
      '10,0': { map: 'stovner', x: 13, y: 15, dir: 'up' },
    },
    signs: {
      '11,9': ['A slate wall covered in chalk. Sums, spelling, and a long list of names.', 'One name is underlined twice: MOHSIN.'],
      '13,11': ['The tunnel has caved in here. Cold air drifts through the cracks.'],
    },
    // The middle of the tunnel is safe: the steps, the way to the far room, and the room itself.
    encounter: {
      chance: 0.1, minSteps: 4, scaleFrom: 9,
      zones: [
        { at: [3, 3, 7, 7], table: [['golem', 0.5], ['rat', 0.3], ['blue', 0.2]] }, // the west passage
        { at: [12, 3, 16, 7], table: [['golem', 0.5], ['rat', 0.3], ['blue', 0.2]] }, // the east passage
      ],
    },
    backdrop: 'cave',
    lighting: { dimEdges: 0.45 },
  };
  // What the cart and the barricade have to say depends on JOHANNE's quests.
  function cartSign() {
    if (q.cart.s === 1) {
      say('', [
        'The cart was not tipped by the wind. Something heavy rammed it.',
        'Deep marks in the road. Chips of broken stone. A pale glitter in the dust.',
        'The trail runs south, toward the old tunnel under the town. Tell JOHANNE!',
      ], () => { markReady('cart'); saveGame(); });
    } else if (q.cart.s >= 2) say('', ['The overturned cart. Deep marks lead away from it, toward the town.']);
    else say('', ['An overturned cart, left where it fell.']);
  }
  // The road north of Outer Stovner: a narrow way between rocks and pines, up to the shrine.
  MAPS.northRoad = {
    name: 'NORTH ROAD',
    rows: [
      'rrrrrr==rrrrrrr',
      'rrrrPg==gPrrrrr',
      'rrrPgg==ggPrrrr',
      'rrPggg==gggPrrr',
      'rrgggg==ggggrrr',
      'rPgggg==ggggPrr',
      'rggPgg==ggmggrr',
      'rgggg====ggggrr',
      'rPggg====gggPrr',
      'rrggggg==ggggrr',
      'rrPgggg==gPggrr',
      'rrrgggg==ggggrr',
      'rrrPg====ggPrrr',
      'rrrgg====gggrrr',
      'rrPgg==gggggPrr',
      'rrggg==ggmgggrr',
      'rrPgg==ggggPrrr',
      'rrrPg==ggPrrrrr',
      'rrrrg==gPrrrrrr',
      'rrrrr==rrrrrrrr',
    ],
    exits: {
      '5,19': { map: 'stovnerOuter', x: 14, y: 1, dir: 'down' },
      '6,19': { map: 'stovnerOuter', x: 15, y: 1, dir: 'down' },
      '6,0': { map: 'shrine', x: 6, y: 11, dir: 'up' },
      '7,0': { map: 'shrine', x: 7, y: 11, dir: 'up' },
    },
    signs: {},
    // Safe at both ends and in the middle; the two wider stretches are not.
    encounter: {
      chance: 0.1, minSteps: 4, scaleFrom: 9,
      zones: [
        { at: [1, 12, 13, 15], table: [['blue', 0.5], ['rat', 0.5]] }, // the lower clearing
        { at: [1, 4, 13, 8], table: [['golem', 0.4], ['rat', 0.4], ['blue', 0.2]] }, // the upper clearing
      ],
    },
    backdrop: 'woods',
    lighting: { dimEdges: 0.2 },
  };
  // The shrine where the road ends. Nothing attacks here.
  MAPS.shrine = {
    name: 'NORTHERN SHRINE',
    rows: [
      'rrrrrrrrrrrrrrr',
      'rr###########rr',
      'rr#oooiIiooo#rr',
      'rr#ooooooooo#rr',
      'rr#oioooooio#rr',
      'rr#ooooooooo#rr',
      'rr#oioooooio#rr',
      'rr#ooooooooo#rr',
      'rr####ooo####rr',
      'rrrrr#ooo#rrrrr',
      'rrrrr#ooo#rrrrr',
      'rrrrrr==rrrrrrr',
      'rrrrrr==rrrrrrr',
    ],
    exits: {
      '6,12': { map: 'northRoad', x: 6, y: 1, dir: 'down' },
      '7,12': { map: 'northRoad', x: 7, y: 1, dir: 'down' },
    },
    signs: {},
    encounter: null,
    backdrop: 'cave',
  };
  // After the fight MOHSIN hands over the fragment and the key, exactly once. This runs by itself when
  // the won battle ends, and again from MOHSIN if the game was closed before it finished.
  function mohsinHandover() {
    say('MOHSIN', [
      'You have strength. I hope you have judgment.',
      'Take the fragment.',
      'The BLUE KEY opens paths sealed long ago.',
      'If you still believe the Crystal should be restored, find MARCUS, in AMMERUD.',
      'Ask him why it was broken.',
      '(Got CRYSTAL FRAGMENT 2 and the BLUE KEY!)',
    ], () => {
      flags.fragment2 = true; flags.blueKey = true;
      markReady('mohsin');
      SFX.quest();
      saveGame();
    });
  }
  for (const m of Object.values(MAPS)) { m.h = m.rows.length; m.w = m.rows[0].length; }

  // Things lying in the world, taken once by walking onto them; the id is the saved flag that records it.
  // A plain entry is a crystal shard. A `chest` holds one weapon or armour.
  const ITEMS = [
    { id: 'shard1', map: 'cave', x: 17, y: 3 },
    { id: 'shard2', map: 'cave', x: 3, y: 12 },
    // (a `quest` item lies there only while that quest is active; finding it makes the quest ready to turn in)
    { id: 'kebab', map: 'stovnerOuter', x: 6, y: 10, quest: 'kebab', found: ['A kebab, lying in the grass. There are tiny tooth marks in the foil.', 'Still warm. Best not to ask. Take it back to BASIL!'] },
    { id: 'chestAxe', map: 'stovnerOuter', x: 27, y: 1, chest: true, weapon: 'axe' },
    { id: 'chestVest', map: 'stovnerOuter', x: 9, y: 1, chest: true, armor: 'light' }, // clear of the status panel
  ];

  // ---------------------------------------------------------------- gates
  // A gate is an obstacle that blocks the way until the hero meets a requirement, and then stays open
  // for good. Each one sets:
  //   map, x, y   where it stands (the map row shows the closed tile there too, for readability)
  //   closed      the tile drawn and collided with while it is shut
  //   open        the tile it becomes once opened
  //   flag        the saved flag that records it has been opened
  //   needs()     true when the hero can open it: an item, a flag, a quest state...
  //   locked      lines shown when the hero tries it without meeting the requirement (or a function giving them)
  //   opened      lines shown when it opens
  //   beyond      lines shown when the hero tries an opened gate whose open tile still cannot be walked
  //               through, because what lies behind it is not built yet (optional)
  //   sfx         name of the sound played when it opens (optional)
  const GATES = [
    {
      map: 'forest', x: 18, y: 3, closed: 'V', open: 'g', flag: 'vines',
      needs: () => player.sickle,
      locked: ['Thick, thorny vines block the way east.'],
      opened: ['You hack through the thorny vines with the old sickle. The way east is open!'],
      sfx: 'cut',
    },
    { // The way to Stovner. The Red Key unlocks it; the open gate is the village's west exit.
      map: 'village', x: 0, y: 7, closed: 'K', open: 'L', flag: 'redGate',
      needs: () => flags.redKey,
      locked: ['An old gate with a red lock. The road to STOVNER lies beyond.'],
      opened: ['The RED KEY turns in the lock. The gate to STOVNER is unlocked!'],
      sfx: 'pickup',
    },
    // The tunnel mouths in Stovner. Nobody opens these by hand: JOHANNE has the bars taken off
    // (the tunnelOpen flag) when she sends the hero down.
    ...[12, 13].map((x) => ({
      map: 'stovner', x, y: 16, closed: 'Q', open: 'q', flag: 'tunnelOpen',
      needs: () => false,
      locked: ['A tunnel leads down under the town. Iron bars block the way in.'],
      opened: [],
    })),
    // The barricade on the north road. JOHANNE has it pulled down (the northOpen flag) when she
    // sends the hero after MOHSIN; then it is plain road.
    ...[14, 15].map((x) => ({
      map: 'stovnerOuter', x, y: 2, closed: 'J', open: '=', flag: 'northOpen',
      needs: () => false,
      locked: () => (q.under.s === 3
        ? ['A barricade blocks the road north. MOHSIN went this way. It will have to be opened somehow.']
        : ['A barricade blocks the road north.']),
      opened: [],
    })),
    { // Stovner's west gate, toward Ammerud. The Blue Key unlocks it; the road behind it is not built yet.
      map: 'stovner', x: 0, y: 9, closed: 'G', open: 'N', flag: 'blueGate',
      needs: () => flags.blueKey,
      locked: ['The west gate is shut tight.'],
      opened: ['The BLUE KEY turns in the west gate. The road to AMMERUD is open!'],
      beyond: ['The west gate stands open. The road to AMMERUD lies beyond.'],
      sfx: 'pickup',
    },
  ];
  for (const gate of GATES) (MAPS[gate.map].gates ||= {})[`${gate.x},${gate.y}`] = gate;
  const gateAt = (m, x, y) => m.gates?.[`${x},${y}`];

  // ---------------------------------------------------------------- state
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const STEP_FRAMES = 10;

  // Everything the HUD and the quest log show about a quest comes from its entry here. The ids are
  // saved in save files, so they must never be renamed. The order here is the order in the quest log.
  //   title       name in the quest log and in the NEW QUEST banner
  //   turnIn      who to see once the goal is met (shown as SEE <turnIn>)
  //   tracker()   short HUD label while the quest is active
  //   progress()  quest-log line while the quest is active
  //   state       extra saved fields besides the quest's stage `s`, with their starting values
  const QUESTS = {
    slimes: {
      title: 'SLIME TROUBLE', turnIn: 'ELDER', state: { n: 0 },
      tracker: () => `SLIMES ${q.slimes.n}/3`, progress: () => `${q.slimes.n}/3 SLIMES`,
    },
    biscuit: { title: 'LOST BISCUIT', turnIn: 'PIP', tracker: () => 'FIND BISCUIT', progress: () => 'FIND THE CAT' },
    glowcap: {
      title: 'GLOWCAP BREW', turnIn: 'WREN',
      tracker: () => `GLOWCAPS ${player.glowcaps}/3`, progress: () => `${player.glowcaps}/3 GLOWCAPS`,
    },
    king: { title: 'THE DADDA BOSS', turnIn: 'ELDER', tracker: () => 'DADDA BOSS', progress: () => 'IN CRYSTAL CAVE' },
    shards: {
      title: 'CRYSTAL EDGE', turnIn: 'BRAM',
      tracker: () => `SHARDS ${player.shards}/2`, progress: () => `${player.shards}/2 SHARDS`,
    },
    // ---- Stovner. JOHANNE's four follow one another, and the last ends the chapter; the kebab is
    // BASIL's and stands apart.
    road: {
      title: 'ROAD TROUBLE', turnIn: 'JOHANNE', state: { n: 0 },
      tracker: () => `ROADS ${q.road.n}/3`, progress: () => `${q.road.n}/3 MONSTERS`,
    },
    cart: { title: 'OVERTURNED CART', turnIn: 'JOHANNE', tracker: () => 'CHECK THE CART', progress: () => 'THE EAST LOOP' },
    under: { title: 'UNDER STOVNER', turnIn: 'JOHANNE', tracker: () => 'INTO THE TUNNEL', progress: () => 'SOUTH OF TOWN' },
    mohsin: { title: 'FIND MOHSIN', turnIn: 'JOHANNE', tracker: () => 'FIND MOHSIN', progress: () => 'UP THE ROAD' },
    kebab: { title: 'MISSING KEBAB', turnIn: 'BASIL', tracker: () => 'FIND THE KEBAB', progress: () => 'BY THE LAKE' },
  };
  const QUEST_ORDER = Object.keys(QUESTS);
  const QUESTS_PER_PAGE = 5; // how many fit on one page of the quest log

  // Which zone of a map's encounters the tile lies in (the whole encounter block for a map without zones).
  function encounterAt(m, x, y) {
    const enc = m.encounter;
    if (!enc) return null;
    if (enc.zones) return enc.zones.find((z) => x >= z.at[0] && y >= z.at[1] && x <= z.at[2] && y <= z.at[3]) || null;
    return tileAt(m, x, y) === enc.tile ? enc : null;
  }

  const newPlayer = () => ({
    map: 'village', x: 5, y: 4, dir: 'down', moving: false, fx: 5, fy: 4, tx: 5, ty: 4, t: 0,
    lvl: 1, hp: 30, maxhp: 30, atk: 6, def: 1, xp: 0, next: 12,
    herbs: 3, maxHerbs: 3, gold: 0, weapon: 'none', armor: 'none', weapons: ['none'], armors: ['none'],
    shards: 0, glowcaps: 0, sickle: false, sinceBattle: 0,
    hero: DEFAULT_HERO,
  });
  // quest state s: 0 not started, 1 active, 2 ready to turn in, 3 done
  // The story is a list of chapters, in order. A chapter ends when its boss quest is turned in.
  //   name    the part of Oslo it plays in
  //   quest   the boss quest that ends the chapter (null while the chapter is not built yet)
  // Nothing about chapters is saved: the current chapter is worked out from which of these quests
  // are done, so every save file, old or new, is always in a valid chapter.
  const CHAPTERS = [
    { name: 'VESTLI', quest: 'king' },
    { name: 'STOVNER', quest: 'mohsin' },
    { name: 'AMMERUD', quest: null }, // unlocked by finishing Stovner; nothing of it is built yet
  ];
  const chapterDone = (c) => c.quest != null && q[c.quest]?.s === 3;
  // Crystal Fragments and keys are kept as saved flags (fragment1, redKey, ...), set once and never unset.
  const fragments = () => Object.keys(flags).filter((k) => /^fragment\d+$/.test(k) && flags[k]).length;
  // Index of the chapter being played: the first unfinished one, or the last one when all are done.
  const currentChapter = () => {
    const i = CHAPTERS.findIndex((c) => !chapterDone(c));
    return i < 0 ? CHAPTERS.length - 1 : i;
  };
  const storyDone = () => CHAPTERS.every(chapterDone);
  // Call when a quest has just been turned in. If it ends a chapter this shows the closing screen:
  // the victory screen after the last chapter, a "chapter complete" screen after any earlier one.
  function endChapter(questId) {
    const i = CHAPTERS.findIndex((c) => c.quest === questId);
    if (i < 0) return;
    const last = i === CHAPTERS.length - 1;
    fadeOut(() => { mode = 'victory'; victory = last ? { t: 0 } : { t: 0, chapter: i + 1 }; SFX.victory(); }, 40);
  }
  const newQuests = () => Object.fromEntries(QUEST_ORDER.map((id) => [id, { s: 0, ...QUESTS[id].state }]));

  const player = newPlayer();
  let q = newQuests();
  let flags = {};
  let stats = { won: 0, slimes: 0, steps: 0 };
  let tracked = null;

  // kind is 'weapon' or 'armor'
  const gearTable = (kind) => (kind === 'weapon' ? WEAPONS : ARMORS);
  const ownedGear = (kind) => Object.keys(gearTable(kind)).filter((id) => player[kind + 's'].includes(id));
  const owns = (kind, id) => player[kind + 's'].includes(id);
  function own(kind, id) { if (!owns(kind, id)) player[kind + 's'].push(id); }
  const atk = () => player.atk + WEAPONS[player.weapon].atk;
  const def = () => player.def + ARMORS[player.armor].def;

  let mode = 'title';
  let tick = 0;
  let dlg = null, battle = null, fade = null, encounter = null, banner = null, victory = null, shop = null, menuOpen = null;
  let lastBump = -99, shroomStreak = 0, savedT = 0;
  const title = { sel: 0, hasSave: false };

  // ---------------------------------------------------------------- quests
  function accept(id) {
    q[id].s = 1; tracked = id;
    SFX.quest();
    showBanner(`NEW QUEST: ${QUESTS[id].title}`);
    saveGame();
  }
  function markReady(id) { if (q[id].s === 1) { q[id].s = 2; tracked = id; } }
  function complete(id) {
    q[id].s = 3;
    SFX.quest();
    showBanner('QUEST COMPLETE!');
    pickTracked();
    saveGame();
  }
  function pickTracked() {
    if (tracked && (q[tracked].s === 1 || q[tracked].s === 2)) return;
    tracked = QUEST_ORDER.find((id) => q[id].s === 1 || q[id].s === 2) || null;
  }
  function trackerLabel() {
    pickTracked();
    if (!tracked) return null;
    const s = q[tracked].s;
    if (s === 2) return { text: `SEE ${QUESTS[tracked].turnIn}!`, ready: true };
    return { text: QUESTS[tracked].tracker() };
  }
  function questProgress(id) {
    const s = q[id].s;
    if (s === 3) return 'DONE';
    if (s === 2) return `SEE ${QUESTS[id].turnIn}`;
    return QUESTS[id].progress();
  }
  // The quest log lists every quest that has been started, QUESTS_PER_PAGE to a page.
  const knownQuests = () => QUEST_ORDER.filter((id) => q[id].s > 0);
  const questPages = () => Math.max(1, Math.ceil(knownQuests().length / QUESTS_PER_PAGE));

  // ---------------------------------------------------------------- npcs
  const NPCS = [
    {
      id: 'elder', map: 'village', x: 8, y: 6, dir: 'down', home: 'down', spr: SPR.elder,
      // (slimes done but king not started = a save made mid-conversation; offer the king quest again)
      // (king done but no fragment = a save from before the fragments existed, or one made mid-conversation)
      news: () => q.slimes.s === 0 || q.slimes.s === 2 || (q.slimes.s === 3 && q.king.s === 0) || q.king.s === 2
        || (q.king.s === 3 && !flags.fragment1),
      talk() {
        const N = 'ELDER MOSS';
        const kingIntro = () => say(N, [
          'But I fear more will come. The slimes pour out of Crystal Cave, past the east edge of the woods.',
          'Their ruler, the DADDA BOSS, sends them to raid us.',
          'Take my old sickle. It can cut through the thorny vines that block the cave. (Got the OLD SICKLE!)',
          'The Dadda Boss is strong. Grow stronger first, and visit Bram the smith for better gear.',
        ], () => { player.sickle = true; accept('king'); });
        // The end of Chapter 1: the first Crystal Fragment and the Red Key, handed over exactly once.
        const fragment = () => say(N, [
          'Wait... what is that glowing in your pack?',
          'A CRYSTAL FRAGMENT! The DADDA BOSS had it all along?',
          'Long ago the Crystal kept monsters away from Oslo. Then it was broken.',
          'I know little else. Find the other pieces, and the monsters may leave us be.',
          'Take this RED KEY. It opens the old gate to STOVNER, at the west wall.',
          '(Got CRYSTAL FRAGMENT 1 and the RED KEY!)',
        ], () => {
          flags.fragment1 = true; flags.redKey = true;
          saveGame();
          endChapter('king');
        });
        if (q.slimes.s === 0) {
          say(N, [
            'Ah, a traveler! Welcome to Turnip Vale. I am Elder Moss.',
            'Slimes from Whisper Woods keep sneaking in and eating our turnips!',
            'Could you defeat 3 slimes for us? The woods lie east, along the path.',
            'Wren can patch you up if you get hurt. Good luck!',
          ], () => accept('slimes'));
        } else if (q.slimes.s === 1) {
          say(N, [`You have defeated ${q.slimes.n} of 3 slimes. The woods lie east!`]);
        } else if (q.slimes.s === 2) {
          say(N, [
            'You did it! Not a single slime left nibbling our fields.',
            'Please, take this. (Got 30 gold!)',
          ], () => {
            player.gold += 30;
            complete('slimes');
            kingIntro();
          });
        } else if (q.king.s === 0) {
          kingIntro();
        } else if (q.king.s === 1) {
          say(N, ['The DADDA BOSS lurks deep in Crystal Cave. Cut the vines at the east edge of the woods.', 'Be ready when she puffs up. That is when she hits hardest!']);
        } else if (q.king.s === 2) {
          say(N, [
            'You defeated the DADDA BOSS?! The slimes will trouble us no more!',
            'Tonight we feast on turnip stew in your honor!',
          ], () => {
            complete('king');
            fragment();
          });
        } else if (!flags.fragment1) {
          fragment();
        } else {
          say(N, [pick([
            `Thanks to you, the turnips grow in peace. Rest well, ${hero().name}.`,
            'The stew was delicious. I may have had three bowls.',
            "Pip has started calling you 'the slime hero'. I rather like it.",
          ])]);
        }
      },
    },
    {
      id: 'wren', map: 'village', x: 14, y: 4, dir: 'left', home: 'left', spr: SPR.wren,
      news: () => q.glowcap.s === 0 || q.glowcap.s === 2,
      talk() {
        const N = 'WREN';
        player.hp = player.maxhp;
        player.herbs = Math.max(player.herbs, 3);
        SFX.heal();
        const heal = 'Hold still... There! HP restored and herbs topped up.';
        if (q.glowcap.s === 0) {
          say(N, [
            'I am Wren, the village healer.', heal,
            'Say, could you help me? I want to brew a Vigor Tonic, but I need 3 glowcaps.',
            'Shroomlets in the woods sometimes drop them. Bring me 3?',
          ], () => accept('glowcap'));
        } else if (q.glowcap.s === 1) {
          say(N, [heal, `Glowcaps so far: ${player.glowcaps}/3. Shroomlets drop them!`]);
        } else if (q.glowcap.s === 2) {
          say(N, [
            heal, 'Glowcaps! Perfect, they are still glowing.',
            '...stir, stir, bubble... Here, drink this Vigor Tonic! (MAX HP +10!)',
          ], () => {
            player.glowcaps = 0;
            player.maxhp += 10; player.hp = player.maxhp;
            complete('glowcap');
          });
        } else {
          say(N, [heal, pick(q.king.s === 3 ? [
            'With the slimes gone, I can finally plant my herb garden.',
            'Elder Moss ate three bowls of stew. I have a tummy tonic ready.',
          ] : [
            'Mind the cave bats. Their bites sting for days.',
            'Pip keeps asking for a slime-proof bandage. I am working on it.',
          ])]);
        }
      },
    },
    {
      id: 'pip', map: 'village', x: 7, y: 11, dir: 'right', home: 'right', spr: SPR.pip,
      news: () => q.biscuit.s === 0 || q.biscuit.s === 2,
      talk() {
        const N = 'PIP';
        if (q.biscuit.s === 0) {
          say(N, [
            'Have you seen my cat Biscuit? She chased a butterfly into the woods!',
            'She is orange and fluffy and has a little bell. Please find her!',
          ], () => accept('biscuit'));
        } else if (q.biscuit.s === 1) {
          say(N, ['Biscuit loves warm, quiet corners. Maybe the far south side of the woods?']);
        } else if (q.biscuit.s === 2) {
          say(N, [
            'BISCUIT! You found her!',
            'Here, you can have my old herb pouch. It holds 5 herbs! (Herb pouch: 5 max!)',
          ], () => {
            player.maxHerbs = 5; player.herbs = 5;
            complete('biscuit');
          });
        } else {
          say(N, [pick([
            'Biscuit says thank you. Well, she said MEOW.',
            'Slimes are mostly jelly. If you poke one it goes SPLOOSH!',
            'When I grow up I want to fight slimes, just like you!',
            ...(q.king.s === 3 ? ["You beat the DADDA BOSS?! I'm telling EVERYONE!"] : []),
          ])]);
        }
      },
    },
    {
      id: 'bram', map: 'village', x: 7, y: 9, dir: 'left', home: 'left', spr: SPR.bram,
      news: () => (q.shards.s === 0 && q.king.s >= 1) || q.shards.s === 2 || (q.shards.s === 1 && player.shards >= 2),
      talk() {
        const N = 'BRAM';
        // A save made right after accepting can hold 2 shards with the quest still "active"; fix it up.
        if (q.shards.s === 1 && player.shards >= 2) markReady('shards');
        const open = () => openShop();
        if (q.shards.s === 0 && q.king.s >= 1) {
          say(N, [
            'Heading into Crystal Cave, eh? Then listen.',
            'Bring me 2 crystal shards from that cave, and I will forge you a CRYSTAL SWORD!',
          ], () => {
            accept('shards');
            if (player.shards >= 2) markReady('shards');
            open();
          });
        } else if (q.shards.s === 2) {
          say(N, [
            'Those are fine shards! Give me a moment...',
            '*CLANG* *CLANG* *HISS* ...Behold, the CRYSTAL SWORD! (ATK +7!)',
          ], () => {
            player.shards -= 2;
            own('weapon', 'crystal');
            player.weapon = 'crystal';
            complete('shards');
          });
        } else {
          const chat = flags.metBram ? pick([
            'Back again? Take a look.',
            'Mind the barrels. That one is full of nails.',
            ...(player.weapon === 'crystal' ? ['How is that crystal sword treating you? Keep it dry.'] : []),
          ]) : 'I am Bram, the smith. Need gear? Take a look.';
          say(N, [chat], () => { flags.metBram = true; open(); });
        }
      },
    },
    {
      id: 'cat', map: 'forest', x: 16, y: 12, dir: 'down', home: 'down', spr: SPR.cat,
      visible: () => q.biscuit.s <= 1,
      talk() {
        if (q.biscuit.s === 1) {
          SFX.meow();
          say('', ['Mrrrow? The cat has a little bell. This must be Biscuit!', 'Biscuit purrs and hops into your arms. Time to take her home.'], () => {
            markReady('biscuit'); saveGame();
          });
        } else {
          SFX.meow();
          say('', ['An orange cat with a little bell. Its tag says BISCUIT.', 'It does not want to leave with a stranger.']);
        }
      },
    },
    {
      id: 'cat2', map: 'village', x: 6, y: 11, dir: 'down', home: 'down', spr: SPR.cat,
      visible: () => q.biscuit.s >= 2,
      talk() {
        SFX.meow();
        say('', [pick(['Biscuit purrs happily.', 'Biscuit is watching a butterfly very closely.', 'Biscuit rubs against your leg. Her bell jingles.'])]);
      },
    },
    {
      id: 'king', map: 'cave', x: 10, y: 2, dir: 'down', home: 'down', spr: SPR.king, anim: true,
      visible: () => q.king.s <= 1,
      talk() {
        say('DADDA BOSS', [
          'BLORP! Who dares enter my glittering hall?!',
          `Those turnips are MINE, little ${hero().name}! Prepare to be absorbed!`,
        ], () => { encounter = { t: 0, type: 'king' }; SFX.encounter(); });
      },
    },
    // ---- Stovner
    {
      id: 'johanne', map: 'stovner', x: 16, y: 8, dir: 'down', home: 'down', spr: SPR.johanne,
      // (a quest done but the next not started = a save made mid-conversation; offer the next one again)
      news: () => q.road.s === 0 || q.road.s === 2 || (q.road.s === 3 && q.cart.s === 0) || q.cart.s === 2
        || (q.cart.s === 3 && q.under.s === 0) || q.under.s === 2 || (q.under.s === 3 && q.mohsin.s === 0) || q.mohsin.s === 2,
      talk() {
        const N = 'JOHANNE';
        const cartIntro = () => say(N, [
          'One more thing. A cart was found overturned on the east loop, and its owner will not say why.',
          'Would you take a look at it? North road out of town, then east.',
        ], () => accept('cart'));
        const underIntro = () => say(N, [
          'Something is under our town. The old tunnel has been barred for years.',
          'I will have GUS take the bars off. Please go down and see what is there.',
          'The tunnel is at the south end of town. Look after yourself!',
        ], () => { flags.tunnelOpen = true; accept('under'); });
        if (q.road.s === 0) {
          say(N, [
            'Oh, a traveller! Through the old gate, even. I am JOHANNE.',
            'I look after things here in STOVNER. Lately that means monsters.',
            'The roads north of town are crawling with them. Could you beat 3 of them for us?',
            'Take the north road out of the square. And do be careful!',
          ], () => accept('road'));
        } else if (q.road.s === 1) {
          say(N, [`You have beaten ${q.road.n} of 3. The north road leads out to them.`]);
        } else if (q.road.s === 2) {
          say(N, [
            'Three already? The carters will be so relieved!',
            'Here, for your trouble. (Got 60 gold!)',
          ], () => {
            player.gold += 60;
            complete('road');
            cartIntro();
          });
        } else if (q.cart.s === 0) {
          cartIntro();
        } else if (q.cart.s === 1) {
          say(N, ['The cart lies by the east loop of the outer roads. Have a good look at it.']);
        } else if (q.cart.s === 2) {
          say(N, [
            'Stone chips and glitter, leading to the tunnel? I do not like that at all.',
            'Thank you for looking. (Got 40 gold!)',
          ], () => {
            player.gold += 40;
            complete('cart');
            underIntro();
          });
        } else if (q.under.s === 0) {
          underIntro();
        } else if (q.under.s === 1) {
          say(N, ['GUS has opened the tunnel, at the south end of town. Mind your step down there.']);
        } else if (q.under.s === 2) {
          say(N, [
            'A stone teacher, under our streets? And you beat her? Goodness.',
            'The town can sleep again. You have earned this. (Got 100 gold! Herb pouch +1!)',
            'She spoke of MOHSIN? I have heard that name. MOHSIN went north, past the barricade.',
            'That road is still shut. Rest a while. I will find out how to open it.',
          ], () => {
            player.gold += 100;
            player.maxHerbs += 1; player.herbs = player.maxHerbs;
            player.hp = player.maxhp;
            complete('under');
          });
        } else if (q.mohsin.s === 0) {
          say(N, [
            'I have news! The carters are pulling the north barricade down as we speak.',
            'MOHSIN went up that road before it was shut. If anyone knows what is stirring around STOVNER, it may be MOHSIN.',
            'But go carefully. I do not think MOHSIN wants to be found.',
          ], () => { flags.northOpen = true; accept('mohsin'); });
        } else if (q.mohsin.s === 1) {
          say(N, ['The north road is open, past where the barricade stood. Go carefully.']);
        } else if (q.mohsin.s === 2) {
          say(N, ['You found MOHSIN, and came back in one piece! What happened up there?'], () => {
            say(hero().name, ['MOHSIN warned me about the Crystal. MARCUS, in AMMERUD, may know why it was broken.'], () => {
              say(N, [
                'Then STOVNER is no longer the end of your road.',
                'AMMERUD lies beyond our west gate. Whatever this Crystal is, I hope you are ready for the answer.',
              ], () => {
                complete('mohsin');
                endChapter('mohsin');
              });
            });
          });
        } else {
          say(N, [pick([
            'AMMERUD lies beyond the west gate. Go well.',
            'The square is lively again, thanks to you.',
            'BASIL has talked of nothing but kebab all day.',
          ])]);
        }
      },
    },
    {
      id: 'basil', map: 'stovner', x: 20, y: 10, dir: 'down', home: 'down', spr: SPR.basil,
      news: () => q.kebab.s === 0 || q.kebab.s === 2,
      talk() {
        const N = 'BASIL';
        if (q.kebab.s === 0) {
          say(N, [
            'DISASTER! My lunch! My beautiful kebab! GONE!',
            'I put it down for ONE moment by the lake outside town, and now it is missing.',
            'Find it for me? I cannot work. I cannot think. I can only mourn.',
          ], () => accept('kebab'));
        } else if (q.kebab.s === 1) {
          say(N, ['The lake! West of the north road! Extra garlic sauce! Please hurry!']);
        } else if (q.kebab.s === 2) {
          say(N, [
            'MY KEBAB! ...Something has nibbled it. I do not care. We are reunited.',
            'Wait here. I made you a fresh one. Eat! (MAX HP +6!)',
          ], () => {
            player.maxhp += 6; player.hp = player.maxhp;
            complete('kebab');
          });
        } else {
          say(N, [pick([
            'Best kebab in STOVNER. Only kebab in STOVNER.',
            'One day this stall will open again. Today I rest.',
            'Never put your lunch down near a lake.',
          ])]);
        }
      },
    },
    {
      id: 'dot', map: 'stovner', x: 7, y: 10, dir: 'down', home: 'down', spr: SPR.dot,
      talk() {
        say('DOT', [pick([
          'That barricade went up on the north road, and nobody will say who built it.',
          'I sit here every day. The fountain is better company than the monsters.',
          'A cart tipped over on the east loop. Its owner ran all the way home.',
          ...(q.under.s === 3 ? ['I slept the whole night through. First time in weeks.'] : []),
        ])]);
      },
    },
    {
      id: 'gus', map: 'stovner', x: 10, y: 16, dir: 'up', home: 'up', spr: SPR.gus,
      talk() {
        const N = 'GUS';
        if (q.under.s === 0) {
          say(N, [pick([
            'Nobody goes down the tunnel. I am GUS, and I make sure of it.',
            'Some nights I hear scraping down there. Like chalk on a slate.',
          ])]);
        } else if (q.under.s === 1) {
          say(N, ['JOHANNE says you may go down. The bars are off. Rather you than me.']);
        } else {
          say(N, ['A teacher made of stone? Well. That explains the scraping.']);
        }
      },
    },
    { // she blocks the way into the far room until she is beaten...
      id: 'heidi', map: 'tunnel', x: 9, y: 10, dir: 'up', home: 'up', spr: SPR.heidi, anim: true,
      visible: () => q.under.s <= 1,
      talk() {
        say('LÆRER HEIDI', [
          'WHO is running in my corridor?!',
          `Sit DOWN, little ${hero().name}. Today's lesson is GRAVEL.`,
        ], () => { encounter = { t: 0, type: 'heidi' }; SFX.encounter(); });
      },
    },
    { // ...and sits in the corner afterwards
      id: 'heidi2', map: 'tunnel', x: 7, y: 11, dir: 'right', home: 'right', spr: SPR.heidi,
      visible: () => q.under.s >= 2,
      talk() {
        say('LÆRER HEIDI', q.under.s === 2 ? [
          'Hmph. Top marks. I did not expect that.',
          'I only wanted a quiet classroom. Something up north keeps waking the stones.',
          'You want to know what? Ask MOHSIN. North road. Now off you go.',
        ] : [pick([
          'No running in the corridor.',
          'Ask MOHSIN. North road. I have marking to do.',
        ])]);
      },
    },
    { // he waits in front of the pedestal; beaten, he stays where he is and only talks
      id: 'mohsin', map: 'shrine', x: 7, y: 3, dir: 'down', home: 'down', spr: SPR.mohsin,
      talk() {
        const N = 'MOHSIN', H = hero().name;
        if (!flags.mohsinBeaten) {
          say(N, [
            'So. You are the one carrying the fragment out of VESTLI.',
            'DADDA should never have let you take it.',
          ], () => say(H, ['The monsters are getting worse everywhere. The fragments may be the only way to stop them.'],
            () => say(N, [
              'And you think putting the pieces together will stop them?',
              "You don't know what you're collecting.",
            ], () => say(H, ['Then tell me.'],
              () => say(N, [
                'No. Not all of it. Not yet.',
                'If you take this fragment, you take responsibility for what follows.',
                'Show me you can carry it.',
              ], () => { encounter = { t: 0, type: 'mohsin' }; SFX.encounter(); })))));
        } else if (!flags.fragment2) {
          mohsinHandover();
        } else {
          say(N, [pick([
            'Find MARCUS, in AMMERUD. Ask him why it was broken.',
            'You have strength. I still hope you have judgment.',
          ])]);
        }
      },
    },
  ];
  const npcVisible = (n) => !n.visible || n.visible();
  const npcAt = (map, x, y) => NPCS.find((n) => n.map === map && n.x === x && n.y === y && npcVisible(n));
  const itemThere = (i) => !flags[i.id] && (!i.quest || q[i.quest].s === 1);
  const itemAt = (map, x, y) => ITEMS.find((i) => i.map === map && i.x === x && i.y === y && itemThere(i));
  function tileAt(m, x, y) {
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return '#';
    const gate = gateAt(m, x, y);
    if (gate) return flags[gate.flag] ? gate.open : gate.closed;
    return m.rows[y][x];
  }
  const canWalk = (x, y) => !SOLID.has(tileAt(MAPS[player.map], x, y)) && !npcAt(player.map, x, y);
  // A save can hold a spot that somebody or something now stands on. If so, the hero wakes on the
  // nearest free tile that can be walked to from one of the map's ways in. Otherwise nothing changes.
  function settle() {
    const m = MAPS[player.map];
    if (!m || canWalk(player.x, player.y)) return;
    const seen = new Set(), todo = [];
    const visit = (x, y) => { const k = `${x},${y}`; if (!seen.has(k) && canWalk(x, y)) { seen.add(k); todo.push([x, y]); } };
    for (const from of Object.values(MAPS)) for (const e of Object.values(from.exits)) if (MAPS[e.map] === m) visit(e.x, e.y);
    let best = null;
    while (todo.length) {
      const [x, y] = todo.shift();
      if (m.exits[`${x},${y}`]) continue;
      const d = Math.abs(x - player.x) + Math.abs(y - player.y);
      if (!best || d < best.d || (d === best.d && (y < best.y || (y === best.y && x < best.x)))) best = { x, y, d };
      for (const [dx, dy] of Object.values(DIRS)) visit(x + dx, y + dy);
    }
    if (best) Object.assign(player, { x: best.x, y: best.y, fx: best.x, fy: best.y, tx: best.x, ty: best.y, moving: false, t: 0 });
  }

  // ---------------------------------------------------------------- save / load
  function saveGame() {
    try {
      const p = { ...player, moving: false, fx: player.x, fy: player.y, tx: player.x, ty: player.y, t: 0 };
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, player: p, q, flags, stats, tracked }));
      savedT = 90;
      return true;
    } catch (e) { return false; /* storage unavailable */ }
  }
  function readSave() {
    try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); return d && d.v === 1 ? d : null; } catch (e) { return null; }
  }
  function loadGame() {
    const d = readSave();
    if (!d) return false;
    Object.assign(player, newPlayer(), d.player);
    if (Object.prototype.hasOwnProperty.call(HERO_RENAMED, player.hero)) player.hero = HERO_RENAMED[player.hero];
    if (!isHero(player.hero)) player.hero = DEFAULT_HERO;
    // A save from before gear was kept owns the stick, the tunic and whatever it is wearing.
    for (const kind of ['weapon', 'armor']) {
      const list = Array.isArray(player[kind + 's']) ? player[kind + 's'].slice() : [];
      for (const id of ['none', player[kind]]) if (!list.includes(id)) list.push(id);
      player[kind + 's'] = list;
    }
    // Quests the save does not know yet start fresh; a saved quest keeps its values and gains any new fields.
    const fresh = newQuests();
    q = Object.assign({}, fresh, d.q);
    for (const id of QUEST_ORDER) q[id] = { ...fresh[id], ...q[id] };
    flags = d.flags || {};
    stats = Object.assign({ won: 0, slimes: 0, steps: 0 }, d.stats);
    tracked = d.tracked || null;
    settle();
    return true;
  }
  function newGame(heroId) {
    Object.assign(player, newPlayer(), { hero: isHero(heroId) ? heroId : DEFAULT_HERO });
    q = newQuests(); flags = {}; stats = { won: 0, slimes: 0, steps: 0 }; tracked = null;
  }

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
    deny: () => { tone(200, 0.08, { vol: 0.12 }); tone(150, 0.12, { vol: 0.12, delay: 0.08 }); },
    hit: () => { noise(0.15, { vol: 0.45, freq: 3500 }); tone(320, 0.12, { to: 70, vol: 0.2 }); },
    crit: () => { noise(0.25, { vol: 0.5, freq: 5000 }); tone(600, 0.2, { to: 80, vol: 0.22 }); },
    hurt: () => { noise(0.2, { vol: 0.4, freq: 1200 }); tone(200, 0.22, { to: 50, vol: 0.22, type: 'sawtooth' }); },
    slam: () => { noise(0.45, { vol: 0.6, freq: 800 }); tone(120, 0.4, { to: 30, vol: 0.3, type: 'sawtooth' }); },
    charge: () => tone(150, 0.6, { to: 600, vol: 0.12, type: 'sawtooth' }),
    heal: () => seq([523, 659, 784, 1047], 0.07, { vol: 0.14, type: 'triangle', len: 0.12 }),
    coin: () => { tone(988, 0.06, { vol: 0.12 }); tone(1319, 0.14, { vol: 0.12, delay: 0.06 }); },
    pickup: () => seq([784, 988, 1175, 1568], 0.05, { vol: 0.12, type: 'triangle', len: 0.1 }),
    cut: () => { noise(0.12, { vol: 0.3, freq: 6000 }); noise(0.12, { vol: 0.3, freq: 6000, delay: 0.12 }); },
    meow: () => { tone(700, 0.12, { to: 1000, vol: 0.08, type: 'triangle' }); tone(1000, 0.2, { to: 600, vol: 0.08, type: 'triangle', delay: 0.12 }); },
    levelUp: () => seq([523, 659, 784, 1047, 0, 784, 1047, 1319], 0.08, { vol: 0.14, len: 0.12 }),
    encounter: () => seq([880, 660, 880, 660, 880, 1175], 0.06, { vol: 0.12 }),
    boss: () => seq([196, 0, 196, 0, 185, 0, 175, 0, 165, 165], 0.1, { vol: 0.16, type: 'sawtooth', len: 0.14 }),
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
  let aPressed = false, bPressed = false, navPressed = null, queuedDir = null;
  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right', Space: 'a', Enter: 'a', KeyZ: 'a', KeyX: 'b', Escape: 'b', KeyQ: 'b',
  };
  function press(b) {
    audioInit();
    if (b === 'a') { aPressed = true; return; }
    if (b === 'b') { bPressed = true; return; }
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
    const up = (e) => { e.preventDefault(); btn.classList.remove('pressed'); release(b); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  canvas.addEventListener('pointerdown', () => { audioInit(); if (mode === 'victory') aPressed = true; });

  // ---------------------------------------------------------------- helpers: text & ui
  function text(s, x, y, c = 15, font = FONT) {
    ctx.font = font; ctx.textBaseline = 'top';
    ctx.fillStyle = PAL[0]; ctx.fillText(s, x + 1, y + 1);
    ctx.fillStyle = PAL[c]; ctx.fillText(s, x, y);
  }
  function rtext(s, x, y, c = 15) { text(s, x - s.length * 8, y, c); }
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
  function cursor(x, y) {
    R(ctx, x, y, 1, 7, 15); R(ctx, x + 1, y + 1, 1, 5, 15); R(ctx, x + 2, y + 2, 1, 3, 15); R(ctx, x + 3, y + 3, 1, 1, 15);
  }
  function downArrow(x, y) { R(ctx, x, y, 7, 1, 15); R(ctx, x + 1, y + 1, 5, 1, 15); R(ctx, x + 2, y + 2, 3, 1, 15); R(ctx, x + 3, y + 3, 1, 1, 15); }
  function bubble(x, y) { // "!" speech bubble
    R(ctx, x, y, 7, 9, 0); R(ctx, x + 1, y + 1, 5, 7, 15);
    R(ctx, x + 3, y + 2, 1, 3, 6); P(ctx, x + 3, y + 6, 6);
    P(ctx, x + 2, y + 9, 0); P(ctx, x + 3, y + 9, 0);
  }

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
    if (aPressed || bPressed) {
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

  // ---------------------------------------------------------------- shop
  const SHOP = [
    { id: 'herb', name: 'HERB', price: 8, desc: () => `Heals in battle. Have ${player.herbs}/${player.maxHerbs}.` },
    { id: 'iron', name: 'IRON SWORD', price: 40, desc: () => 'ATK +3. Sturdy and sharp.' },
    { id: 'vest', name: 'TOUGH VEST', price: 35, desc: () => 'DEF +2. Padded leather.' },
    { id: 'exit', name: 'LEAVE', price: 0, desc: () => 'Come back anytime!' },
  ];
  const shopOwned = (item) => (item.id === 'iron' && (owns('weapon', 'iron') || owns('weapon', 'crystal')))
    || (item.id === 'vest' && owns('armor', 'vest'));
  function openShop() { shop = { sel: 0, note: '', noteT: 0 }; mode = 'shop'; }
  function buy(item) {
    const note = (t, ok) => { shop.note = t; shop.noteT = 120; ok ? SFX.coin() : SFX.deny(); };
    if (item.id === 'exit') { mode = 'world'; shop = null; SFX.move(); return; }
    if (item.id === 'herb' && player.herbs >= player.maxHerbs) return note('Your pouch is full!');
    if (shopOwned(item)) return note(item.id === 'iron' ? 'You have a better blade.' : 'You already wear one.');
    if (player.gold < item.price) return note('Not enough gold!');
    player.gold -= item.price;
    if (item.id === 'herb') player.herbs++;
    if (item.id === 'iron') { own('weapon', 'iron'); player.weapon = 'iron'; }
    if (item.id === 'vest') { own('armor', 'vest'); player.armor = 'vest'; }
    note(`Bought ${item.name}!`, true);
    saveGame();
  }
  function updateShop() {
    if (shop.noteT > 0) shop.noteT--;
    if (navPressed === 'up') { shop.sel = (shop.sel + SHOP.length - 1) % SHOP.length; SFX.move(); }
    if (navPressed === 'down') { shop.sel = (shop.sel + 1) % SHOP.length; SFX.move(); }
    if (aPressed) buy(SHOP[shop.sel]);
    else if (bPressed) { mode = 'world'; shop = null; SFX.move(); }
  }
  function drawShop() {
    box(20, 10, 200, 96);
    text("BRAM'S FORGE", 30, 18, 14);
    rtext(`${player.gold}G`, 210, 18, 14);
    R(ctx, 28, 29, 184, 1, 8);
    SHOP.forEach((it, i) => {
      const y = 36 + i * 15;
      const owned = shopOwned(it);
      text(it.name, 42, y, owned ? 7 : 15);
      if (it.price) rtext(owned ? 'OWNED' : `${it.price}G`, 210, y, owned ? 7 : 14);
      if (shop.sel === i && Math.floor(tick / 16) % 3) cursor(30, y);
    });
    box(4, 108, 232, 48);
    const msg = shop.noteT > 0 ? shop.note : SHOP[shop.sel].desc();
    wrap(msg, 27).forEach((l, i) => text(l, 12, 117 + i * 11));
  }

  // ---------------------------------------------------------------- status menu
  // menuSel is the line the cursor is on: 0 weapon, 1 armour, 2 SAVE.
  let menuPage = 0, menuNote = null, menuSel = 2;
  function openMenu() {
    mode = 'menu'; menuOpen = true; menuNote = null; menuSel = 2;
    // Start on the page that holds the quest being tracked.
    pickTracked();
    menuPage = Math.max(0, Math.floor(knownQuests().indexOf(tracked) / QUESTS_PER_PAGE));
  }
  function updateMenu() {
    const pages = questPages();
    if (navPressed === 'up' || navPressed === 'down') { // up and down move the cursor
      const to = clamp(menuSel + (navPressed === 'up' ? -1 : 1), 0, 2);
      if (to !== menuSel) { menuSel = to; menuNote = null; SFX.move(); }
    } else if (pages > 1 && navPressed) { // left and right turn the pages of the quest log
      const step = navPressed === 'left' ? -1 : 1;
      menuPage = (Math.min(menuPage, pages - 1) + pages + step) % pages;
      SFX.move();
    }
    if (menuNote && --menuNote.t <= 0) menuNote = null;
    // On the weapon or armour line the action button puts on the next one the hero owns.
    if (aPressed && menuSel < 2) {
      const kind = menuSel === 0 ? 'weapon' : 'armor', list = ownedGear(kind);
      if (list.length > 1) { player[kind] = list[(list.indexOf(player[kind]) + 1) % list.length]; SFX.select(); }
      else SFX.deny();
    }
    // On SAVE it saves by hand. The menu only opens while standing in the world, so this is
    // the same save the game makes by itself, just made on request.
    if (aPressed && menuSel === 2) {
      const ok = saveGame();
      menuNote = { text: ok ? 'SAVED!' : 'FAILED!', c: ok ? 11 : 6, t: 90 };
      (ok ? SFX.select : SFX.deny)();
    }
    if (bPressed) { mode = 'world'; menuOpen = null; SFX.move(); }
  }
  function drawMenu() {
    R(ctx, 0, 0, W, H, 0);
    box(2, 2, 92, 156);
    text(hero().name, 10, 9, 14);
    const lines = [
      [`LV ${player.lvl}`, 15], [`HP ${player.hp}/${player.maxhp}`, 15], [`ATK ${atk()}`, 15], [`DEF ${def()}`, 15],
      [`XP ${player.xp}/${player.next}`, 13], [`GOLD ${player.gold}`, 14], [`HERB ${player.herbs}/${player.maxHerbs}`, 11],
    ];
    lines.forEach(([s, c], i) => text(s, 10, 24 + i * 12, c));
    text(WEAPONS[player.weapon].name, 10, 110, menuSel === 0 ? 15 : 10);
    text(ARMORS[player.armor].name, 10, 122, menuSel === 1 ? 15 : 10);
    cursor(5, [110, 122, 146][menuSel]);
    if (player.sickle) text('SICKLE', 10, 134, 10);
    // Story items share the sickle's line: a crystal with the number of fragments, and each key.
    if (fragments()) {
      ['..f.....', '.fd8....', 'fdd8....', 'fddd8...', '.fdd8...', '..fd8...', '...d....'].forEach((row, y) => {
        for (let x = 0; x < 8; x++) if (row[x] !== '.') P(ctx, 62 + x, 134 + y, { f: 15, d: 13, 8: 8 }[row[x]]);
      });
      text(String(fragments()), 70, 134, 13);
    }
    if (flags.redKey) {
      ['.66.....', '6..6....', '6..66666', '6..6.6.6', '.66.....'].forEach((row, y) => {
        for (let x = 0; x < 8; x++) if (row[x] !== '.') P(ctx, 82 + x, 135 + y, 6);
      });
    }
    if (flags.blueKey) { // under the red one
      ['.88.....', '8..8....', '8..88888', '8..8.8.8', '.88.....'].forEach((row, y) => {
        for (let x = 0; x < 8; x++) if (row[x] !== '.') P(ctx, 82 + x, 141 + y, 8);
      });
    }
    if (menuNote) text(menuNote.text, 10, 146, menuNote.c);
    else text(isTouch ? 'A:SAVE' : 'SPACE:SAVE', 10, 146, menuSel === 2 ? 14 : 7);
    box(96, 2, 142, 156);
    if (menuSel < 2) { // the cursor is on the weapon or armour: show what the hero owns in place of the quests
      const kind = menuSel === 0 ? 'weapon' : 'armor', table = gearTable(kind), list = ownedGear(kind), worn = table[player[kind]];
      text(kind === 'weapon' ? 'WEAPONS' : 'ARMOUR', 104, 9, 14);
      list.forEach((id, i) => {
        const on = id === player[kind], y = 24 + i * 12;
        text(table[id].name, 114, y, on ? 15 : 7);
        if (on) cursor(106, y);
      });
      text(kind === 'weapon' ? `ATK +${worn.atk}` : `DEF +${worn.def}`, 104, 80, 13);
      wrap(worn.desc, 16).forEach((l, i) => text(l, 104, 92 + i * 11, 10));
      if (list.length > 1) text(isTouch ? 'A:CHANGE' : 'SPACE:CHANGE', 104, 134, 14);
      if (Math.floor(tick / 30) % 2) rtext('X:BACK', 232, 146, 7);
      return;
    }
    text('QUESTS', 104, 9, 14);
    const known = knownQuests(), pages = questPages(), page = Math.min(menuPage, pages - 1);
    if (pages > 1) rtext(`< ${page + 1}/${pages} >`, 232, 9, 10);
    if (!known.length) text('None yet.', 104, 26, 10);
    known.slice(page * QUESTS_PER_PAGE, (page + 1) * QUESTS_PER_PAGE).forEach((id, i) => {
      const y = 24 + i * 24, s = q[id].s;
      text(QUESTS[id].title, 104, y, s === 3 ? 7 : 15);
      text(questProgress(id), 112, y + 10, s === 3 ? 11 : s === 2 ? 14 : 13);
    });
    if (Math.floor(tick / 30) % 2) rtext('X:BACK', 232, 146, 7);
  }

  // ---------------------------------------------------------------- world
  function heldDir() { return held[held.length - 1]; }
  function interact() {
    const [dx, dy] = DIRS[player.dir];
    const x = player.x + dx, y = player.y + dy;
    const npc = npcAt(player.map, x, y);
    if (npc) { npc.dir = OPP[player.dir]; SFX.move(); npc.talk(); return; }
    const m = MAPS[player.map];
    const sign = m.signs?.[`${x},${y}`];
    if (sign) { SFX.move(); if (typeof sign === 'function') sign(); else say('', sign); return; }
    const gate = gateAt(m, x, y);
    if (gate && !flags[gate.flag]) {
      if (gate.needs()) {
        SFX[gate.sfx]?.();
        flags[gate.flag] = true;
        say('', gate.opened, saveGame);
      } else say('', typeof gate.locked === 'function' ? gate.locked() : gate.locked);
    } else if (gate && gate.beyond) say('', gate.beyond);
  }
  function enterMap(name, x, y, dir) {
    Object.assign(player, { map: name, x, y, fx: x, fy: y, tx: x, ty: y, dir, moving: false, t: 0 });
    showBanner(MAPS[name].name);
    saveGame();
  }
  function onStep() {
    stats.steps++;
    SFX.step();
    const m = MAPS[player.map];
    const exit = m.exits[`${player.x},${player.y}`];
    if (exit) { fadeOut(() => enterMap(exit.map, exit.x, exit.y, exit.dir)); return; }
    const item = itemAt(player.map, player.x, player.y);
    if (item && item.quest) {
      flags[item.id] = true;
      markReady(item.quest);
      SFX.pickup();
      held.length = 0;
      say('', item.found, saveGame);
      return;
    }
    if (item && item.chest) {
      const kind = item.weapon ? 'weapon' : 'armor', id = item[kind];
      flags[item.id] = true;
      own(kind, id);
      SFX.pickup();
      held.length = 0;
      say('', [`You open the chest. Inside is a ${gearTable(kind)[id].name}!`, 'Pick it in the menu to use it.'], saveGame);
      return;
    }
    if (item) {
      flags[item.id] = true;
      player.shards++;
      if (player.shards >= 2) markReady('shards');
      SFX.pickup();
      held.length = 0;
      say('', [`You found a CRYSTAL SHARD! (${player.shards} held)`], saveGame);
      return;
    }
    if (encounterAt(m, player.x, player.y)) {
      const enc = { ...ENCOUNTER_DEFAULTS, ...m.encounter };
      player.sinceBattle++;
      if (player.sinceBattle > enc.minSteps && Math.random() < enc.chance) {
        player.sinceBattle = 0;
        held.length = 0;
        encounter = { t: 0 };
        SFX.encounter();
      }
    }
  }
  // ---------------------------------------------------------------- living world (visual only, never saved)
  const LOOKERS = new Set(['elder', 'wren', 'pip', 'bram', 'johanne', 'basil', 'dot', 'gus']);
  const faceToward = (dx, dy) => (Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  // Villagers glance around now and then; they face the hero when the hero is right next to them,
  // and a villager with a "!" notices the hero from two tiles away.
  function updateLookAround() {
    for (const n of NPCS) {
      if (n.map !== player.map || !LOOKERS.has(n.id)) continue;
      const dx = player.x - n.x, dy = player.y - n.y, dist = Math.abs(dx) + Math.abs(dy);
      if (dist === 1 || (dist === 2 && n.news && n.news())) {
        n.dir = faceToward(dx, dy); n.noticing = true; n.glance = 0;
        continue;
      }
      if (n.noticing) { n.noticing = false; n.dir = n.home; n.idle = rand(120, 240); }
      if (n.idle == null) n.idle = rand(240, 480);
      if (n.glance > 0) {
        if (--n.glance === 0) n.dir = n.home;
      } else if (--n.idle <= 0) {
        n.dir = pick(['down', 'left', 'right'].filter((d) => d !== n.home));
        n.glance = rand(60, 90);
        n.idle = rand(240, 480);
      }
    }
  }
  const amb = { ripple: null, nextRipple: 300 };
  function updateAmbient() {
    const m = MAPS[player.map];
    if (!m.ambient?.ripples) { amb.ripple = null; return; }
    if (amb.ripple && ++amb.ripple.t >= 36) amb.ripple = null;
    if (--amb.nextRipple <= 0) {
      amb.nextRipple = rand(240, 420);
      const ponds = [];
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.rows[y][x] === '~') ponds.push([x, y]);
      const [tx, ty] = pick(ponds);
      amb.ripple = { x: tx * TS + rand(4, 11), y: ty * TS + rand(4, 11), t: 0 };
    }
  }
  function drawRipple(camX, camY) {
    const rp = amb.ripple;
    if (!rp) return;
    const r = 1 + Math.floor(rp.t / 12), x = rp.x - camX, y = rp.y - camY;
    ctx.globalAlpha = 0.8 * (1 - rp.t / 36);
    P(ctx, x - r, y, 13); P(ctx, x + r, y, 13);
    R(ctx, x - r + 1, y - 1, 2 * r - 1, 1, 13); R(ctx, x - r + 1, y + 1, 2 * r - 1, 1, 13);
    ctx.globalAlpha = 1;
  }
  function drawChimneySmoke(m, smoke, camX, camY) {
    let i = 0;
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
      if (m.rows[ty][tx] !== 'C') continue;
      const forge = smoke.forge === `${tx},${ty}`;
      const cx = tx * TS + 11 - camX, top = ty * TS - camY;
      for (let k = 0; k < 2; k++) {
        const age = (tick + i * 37 + k * 75) % 150;
        const x = Math.round(cx + Math.sin(age / 20 + i) * 1.5 + age / 40), y = Math.round(top - age / 10);
        const s = age < 75 ? 2 : 1;
        ctx.globalAlpha = 0.5 * (1 - age / 150);
        R(ctx, x, y, s, s, forge ? 3 : 10);
      }
      ctx.globalAlpha = 1;
      if (forge) {
        const p = (tick + 90) % 260;
        if (p < 24) P(ctx, Math.round(cx + 1 + p / 8), Math.round(top - 1 - p / 3), p < 12 ? 14 : 9);
      }
      i++;
    }
  }
  // Each butterfly flutters around its anchor point: [x, y, colour, phase].
  function drawButterflies(list, camX, camY) {
    list.forEach(([ax, ay, c, ph]) => {
      const t = tick;
      const x = Math.round(ax + Math.sin(t * 0.013 + ph) * 14 + Math.sin(t * 0.031 + ph) * 4) - camX;
      const y = Math.round(ay + Math.sin(t * 0.021 + ph) * 6 + Math.cos(t * 0.047 + ph) * 2) - camY;
      if (Math.floor(t / 8) % 2) { R(ctx, x - 1, y - 1, 1, 2, c); R(ctx, x + 1, y - 1, 1, 2, c); }
      else R(ctx, x, y - 2, 1, 2, c);
      P(ctx, x, y, 0);
    });
  }
  const flowerFrame = (tx, ty) => (Math.floor((tick + Math.floor(hash(tx, ty) * 120)) / 40) % 3 === 0 ? 1 : 0);

  function updateWorld() {
    if (banner && --banner.t <= 0) banner = null;
    if (savedT > 0) savedT--;
    updateAmbient();
    updateLookAround();
    if (player.moving) {
      player.t += 1 / STEP_FRAMES;
      if (player.t >= 1) {
        player.moving = false; player.t = 0;
        player.x = player.tx; player.y = player.ty;
        onStep();
        if (fade || encounter || mode !== 'world') return;
      } else return;
    }
    if (aPressed) { queuedDir = null; interact(); return; }
    if (bPressed) { queuedDir = null; openMenu(); SFX.select(); return; }
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
        const img = ch === '~' ? water[(wf + tx + ty) % 2] : FLOWERS[ch] ? FLOWERS[ch][flowerFrame(tx, ty)] : TILE[ch] || TILE['.'];
        ctx.drawImage(img, tx * TS - camX, ty * TS - camY);
      }
    }
    for (const it of ITEMS) {
      if (it.map !== player.map || !itemThere(it)) continue;
      if (it.quest) { ctx.drawImage(KEBAB_SPR, it.x * TS - camX, it.y * TS - camY); continue; }
      if (it.chest) { ctx.drawImage(CHEST_SPR[Math.floor(tick / 30) % 2], it.x * TS - camX, it.y * TS - camY); continue; }
      const bob = Math.floor(tick / 20) % 2;
      ctx.drawImage(SHARD_SPR[Math.floor(tick / 15) % 2], it.x * TS - camX, it.y * TS - camY - bob);
    }
    const ambient = m.ambient || {};
    if (ambient.ripples) drawRipple(camX, camY);
    const npcs = NPCS.filter((n) => n.map === player.map && npcVisible(n));
    const ents = npcs.map((n) => {
      const f = n.anim ? Math.floor(tick / 20) % 2 : (Math.floor((tick + n.x * 13) / 40) % 6 === 0 ? 1 : 0);
      return { x: n.x * TS, y: n.y * TS, img: n.spr[n.dir + f], news: n.news && n.news() };
    });
    const frame = player.moving && player.t < 0.5 ? 1 : 0;
    ents.push({ x: px, y: py, img: hero().spr[player.dir + frame] });
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) ctx.drawImage(e.img, Math.round(e.x - camX), Math.round(e.y - camY - 1));
    if (ambient.chimneySmoke) drawChimneySmoke(m, ambient.chimneySmoke, camX, camY);
    if (ambient.butterflies) drawButterflies(ambient.butterflies, camX, camY);
    for (const e of ents) if (e.news) bubble(Math.round(e.x - camX) + 5, Math.round(e.y - camY) - 11 - (Math.floor(tick / 15) % 2));
    if (m.lighting?.dimEdges) {
      ctx.globalAlpha = m.lighting.dimEdges;
      R(ctx, 0, 0, W, 8, 0); R(ctx, 0, H - 8, W, 8, 0); R(ctx, 0, 0, 8, H, 0); R(ctx, W - 8, 0, 8, H, 0);
      ctx.globalAlpha = 1;
    }
  }
  function drawHud() {
    box(2, 2, 92, 30);
    text(`LV${player.lvl}`, 7, 7, 14);
    text(`*${player.herbs}`, 62, 7, 11);
    text(`HP${player.hp}/${player.maxhp}`, 7, 17);
    R(ctx, 6, 27, 84, 2, 1);
    R(ctx, 6, 27, Math.round(84 * player.xp / player.next), 2, 13);
    const tl = trackerLabel();
    if (tl) {
      const w = tl.text.length * 8 + 12;
      box(W - w - 2, 2, w, 16);
      text(tl.text, W - w + 4, 6, tl.ready ? 14 : 15);
    }
    if (savedT > 0 && savedT < 80 && mode === 'world') rtext('SAVED', W - 4, H - 12, 7);
    if (banner && mode === 'world') {
      const w = banner.text.length * 8 + 16;
      if (banner.t > 20 || Math.floor(banner.t / 3) % 2) {
        box(Math.round((W - w) / 2), 124, w, 18);
        centered(banner.text, 129, 14);
      }
    }
  }

  // ---------------------------------------------------------------- battle
  function pickEnemy() {
    const enc = encounterAt(MAPS[player.map], player.x, player.y) || MAPS[player.map].encounter;
    if (enc.pick) return enc.pick();
    let r = Math.random();
    for (const [type, p] of enc.table) { if ((r -= p) < 0) return type; }
    return enc.table[0][0];
  }
  function startBattle(type) {
    type = type || pickEnemy();
    const e = ENEMIES[type];
    const m = MAPS[player.map];
    const scaleFrom = m.encounter?.scaleFrom ?? ENCOUNTER_DEFAULTS.scaleFrom;
    const L = e.boss ? 0 : Math.max(0, player.lvl - scaleFrom);
    const hp = e.hp + L * 3;
    battle = {
      type, name: e.name, boss: !!e.boss, hp, max: hp, shownHp: hp,
      atk: e.atk + L, def: e.def + Math.floor(L / 2), xp: e.xp + L * 2, gold: rand(...e.gold),
      backdrop: m.backdrop || 'woods', turn: 0, charged: false, wobbled: false,
      menu: 0, phase: 'busy', msg: '', shown: 0, floats: [], shake: 0, flash: 0, lunge: 0, dying: 0, gone: false,
      playerShownHp: player.hp,
    };
    mode = 'battle';
    if (e.boss) SFX.boss();
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
    const article = ENEMIES[battle.type].boss?.named ? '' : battle.boss ? 'The ' : 'A ';
    await msg(`${article}${battle.name} ${intro}`, 700);
    if (ENEMIES[battle.type].quick) {
      if (ARMORS[player.armor].nimble) await msg('It darts at you, but you step lightly aside!', 500);
      else {
        await msg(`The ${battle.name} is quick! It strikes first!`, 100);
        await enemyHit(1);
        if (player.hp <= 0) return loseBattle();
      }
    }
    toMenu();
  }
  const enemyX = () => (battle.boss ? 64 : 64);
  async function act(choice) {
    battle.phase = 'busy';
    SFX.select();
    if (choice === 0) {
      const weapon = WEAPONS[player.weapon], armored = !!ENEMIES[battle.type].armored;
      const smash = armored && !!weapon.heavy;
      await msg(weapon.swing || 'You swing your sword!', 150);
      const crit = Math.random() < 0.12;
      let dmg = Math.max(1, atk() + rand(0, 2) - (smash ? 0 : battle.def));
      if (crit) dmg = Math.floor(dmg * 1.8);
      battle.hp = Math.max(0, battle.hp - dmg);
      battle.flash = 24;
      crit ? SFX.crit() : SFX.hit();
      float(enemyX(), battle.boss ? 24 : 36, crit ? `${dmg}!` : `${dmg}`, crit ? 14 : 15);
      if (crit) await msg('A critical hit!', 400); else await wait(500);
      if (battle.hp <= 0) return winBattle();
      if (armored && !battle.armorSaid) { // said once per fight, so the hero learns what armour does
        battle.armorSaid = true;
        await msg(smash ? 'The axe smashes right through its armour!' : 'Its armour turns most of the blow!', 500);
      }
    } else if (choice === 1) {
      if (player.herbs <= 0) { await msg('No herbs left!', 500); return toMenu(); }
      if (player.hp >= player.maxhp) { await msg('Your HP is already full!', 500); return toMenu(); }
      player.herbs--;
      const amt = Math.min(player.maxhp - player.hp, 10 + player.lvl * 3 + rand(0, 4));
      player.hp += amt;
      SFX.heal();
      float(196, 58, `+${amt}`, 11);
      await msg(`You eat an herb. +${amt} HP`, 600);
    } else {
      const boss = ENEMIES[battle.type].boss;
      if (boss && boss.noEscape) {
        await msg(boss.noEscape, 500);
      } else if (Math.random() < 0.7) {
        SFX.run();
        await msg('You got away safely!', 500);
        return endBattle();
      } else await msg("Couldn't get away!", 400);
    }
    await enemyTurn();
  }
  async function enemyHit(mult) {
    battle.lunge = 12;
    await wait(150);
    const dmg = Math.max(1, Math.round((battle.atk + rand(0, 2)) * mult) - def());
    player.hp = Math.max(0, player.hp - dmg);
    battle.shake = mult > 1 ? 24 : 14;
    mult > 1 ? SFX.slam() : SFX.hurt();
    float(196, 58, `${dmg}`, 6);
    await wait(650);
  }
  async function enemyTurn() {
    const b = battle;
    b.turn++;
    const boss = ENEMIES[b.type].boss;
    const special = (boss && boss.turn) || ENEMIES[b.type].turn;
    if (special) await special(b);
    else {
      await msg(`${b.name} attacks!`, 100);
      await enemyHit(1);
    }
    if (player.hp <= 0) return loseBattle();
    toMenu();
  }
  async function winBattle() {
    const b = battle;
    const boss = ENEMIES[b.type].boss;
    b.dying = 40;
    SFX.defeat();
    await wait(700);
    b.gone = true;
    stats.won++;
    b.won = true;
    if (boss && boss.flag) flags[boss.flag] = true;
    await msg(boss && boss.defeated ? boss.defeated : ENEMIES[b.type].defeated || `${b.name} is defeated!`, 600);
    player.xp += b.xp;
    player.gold += b.gold;
    SFX.coin();
    await msg(`You gain ${b.xp} XP and ${b.gold} gold.`, 700);
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
    if (b.type === 'slime') {
      stats.slimes++;
      if (q.slimes.s === 1) {
        q.slimes.n++;
        if (q.slimes.n >= 3) {
          markReady('slimes');
          SFX.quest();
          await msg('That makes 3 slimes! Tell Elder Moss!', 1000);
        } else await msg(`Slimes defeated: ${q.slimes.n}/3`, 700);
      }
    }
    if (q.road.s === 1 && player.map === 'stovnerOuter' && !boss) {
      q.road.n++;
      if (q.road.n >= 3) {
        markReady('road');
        SFX.quest();
        await msg('The roads feel safer already! Tell JOHANNE!', 1000);
      } else await msg(`Monsters off the road: ${q.road.n}/3`, 700);
    }
    if (b.type === 'shroom' && q.glowcap.s === 1 && Math.random() < 0.6) {
      player.glowcaps++;
      SFX.pickup();
      await msg(`It dropped a GLOWCAP! (${player.glowcaps}/3)`, 900);
      if (player.glowcaps >= 3) { markReady('glowcap'); await msg('That is enough glowcaps for Wren!', 900); }
    }
    if (boss) {
      if (boss.quest) markReady(boss.quest);
      if (boss.aftermath) await msg(boss.aftermath, 1000);
    }
    endBattle();
  }
  async function loseBattle() {
    SFX.faint();
    await msg('You collapse...', 1200);
    fadeOut(() => {
      battle = null;
      mode = 'world';
      player.hp = player.maxhp; player.herbs = Math.max(player.herbs, 3);
      enterMap('village', 13, 5, 'up');
      banner = null;
      say('WREN', ['Easy there! Someone carried you back to the village.', 'You are all patched up. Be careful out there!']);
    }, 50);
  }
  function endBattle() {
    fadeOut(() => {
      const after = battle.won && ENEMIES[battle.type].boss?.after;
      battle = null; mode = 'world'; held.length = 0;
      saveGame();
      if (after) after();
    }, 36);
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
  // Battle backgrounds, chosen by a map's `backdrop`.
  const BACKDROPS = {
    cave() {
      R(ctx, 0, 0, W, 60, 1);
      for (let x = 0; x < W; x += 12) { // stalactites
        const h = 6 + Math.floor(hash(x, 3) * 14);
        for (let i = 0; i < h; i++) { const w = Math.max(1, Math.round((h - i) / h * 4)); R(ctx, x + 6 - w, i, w * 2, 1, i < 2 ? 7 : 3); }
      }
      for (let i = 0; i < 10; i++) { const x = (i * 29 + 7) % W, y = 30 + (i * 13) % 26; P(ctx, x, y, Math.floor((tick + i * 11) / 25) % 3 ? 13 : 15); }
      R(ctx, 0, 60, W, 44, 3);
      for (let y = 62; y < 104; y += 2) for (let x = 0; x < W; x += 2) if (hash(x, y) < 0.04) P(ctx, x, y, 7);
      for (const x of [10, 200, 226]) ctx.drawImage(TILE['k'], x, 52);
    },
    woods() {
      R(ctx, 0, 0, W, 60, 2);
      for (let i = 0; i < 12; i++) { const x = (i * 37 + 11) % W, y = (i * 23) % 40; P(ctx, x, y, Math.floor((tick + i * 9) / 30) % 4 ? 13 : 15); }
      for (let x = -8; x < W + 16; x += 16) ctx.drawImage(TILE['P'], x + ((x / 16) % 2 ? 0 : 8), 44 + ((x / 16) % 3) * 2);
      R(ctx, 0, 60, W, 44, 5);
      for (let y = 62; y < 104; y += 3) for (let x = 0; x < W; x += 2) if (hash(x, y) < 0.04) { P(ctx, x, y, 11); P(ctx, x, y - 1, 11); }
    },
  };
  function drawBattle() {
    const b = battle;
    ctx.save();
    if (b.shake > 0) { const s = b.shake > 14 ? 4 : 2; ctx.translate(rand(-s, s), rand(-s, s)); }
    (BACKDROPS[b.backdrop] || BACKDROPS.woods)();
    // enemy
    const size = b.boss ? 64 : 48, ex = 64 - size / 2, ey = 88 - size;
    const sw = b.boss ? 22 : 14;
    for (let x = -sw; x <= sw; x++) R(ctx, 64 + x, 86, 1, Math.abs(x) < sw * 0.7 ? 3 : 2, 0);
    if (!b.gone) {
      const frame = Math.floor(tick / 22) % 2;
      const blink = b.flash > 0 && Math.floor(b.flash / 3) % 2 === 0;
      const dyingHide = b.dying > 0 && Math.floor(b.dying / 2) % 2 === 0;
      if (!blink && !dyingHide) {
        const lx = b.lunge > 0 ? Math.round(Math.sin((12 - b.lunge) / 12 * Math.PI) * 14) : 0;
        const sink = b.dying > 0 ? Math.round((40 - b.dying) / 3) : 0;
        const puff = b.charged ? 8 + (Math.floor(tick / 6) % 2) * 2 : 0;
        ctx.drawImage(ENEMY_SPR[b.type][frame], ex + lx - puff / 2, ey + sink - puff, size + puff, size - sink + puff);
      }
    }
    box(4, 4, 104, 28);
    text(b.name, 10, 9, b.boss ? 14 : 15);
    bar(10, 21, 92, b.shownHp, b.max);
    const wide = Math.max(0, hero().name.length - 7) * 8; // longer names widen the panel to the left
    box(132 - wide, 64, 104 + wide, 36);
    text(hero().name, 138 - wide, 69, 14);
    text(`LV${player.lvl}`, 202, 69, 15);
    text(`HP${player.hp}/${player.maxhp}`, 138 - wide, 79);
    bar(138 - wide, 91, 92 + wide, b.playerShownHp, player.maxhp);
    ctx.restore();
    box(0, 104, 80, 56);
    const opts = ['ATTACK', `HEAL ${player.herbs}`, 'RUN'];
    opts.forEach((o, i) => text(o, 18, 114 + i * 14, b.phase === 'menu' ? (i === 1 && player.herbs === 0 ? 7 : 15) : 10));
    if (b.phase === 'menu' && Math.floor(tick / 16) % 3) cursor(7, 114 + b.menu * 14);
    box(80, 104, 160, 56);
    typed(wrap(b.msg, 18), b.shown, 88, 114, 12);
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
    centered("MICHAEL'S", 20, 14, BIG);
    centered('QUEST', 40, 11, BIG);
    centered('~ a tiny slime quest ~', 62, 10);
    const bob = Math.floor(tick / 15) % 2;
    ctx.drawImage(HEROES.michael.spr['right' + bob], 88, 112, 16, 16); // the title art is always Michael
    centered('For Michael', 144, 12);
    ctx.drawImage(ENEMY_SPR.slime[bob], 130, 112, 16, 16);
    if (title.hasSave) {
      ['CONTINUE', 'NEW GAME'].forEach((s, i) => {
        text(s, 88, 80 + i * 13, title.sel === i ? 15 : 7);
        if (title.sel === i && Math.floor(tick / 16) % 3) cursor(76, 80 + i * 13);
      });
    } else if (Math.floor(tick / 30) % 2) centered(isTouch ? 'TAP A TO START' : 'PRESS SPACE', 88, 15);
  }
  // Shown after choosing NEW GAME. Nothing is saved or changed until a hero is confirmed.
  let heroSel = 0;
  function updateHeroSelect() {
    const n = HERO_ORDER.length;
    if (navPressed === 'left' || navPressed === 'up') { heroSel = (heroSel + n - 1) % n; SFX.move(); }
    if (navPressed === 'right' || navPressed === 'down') { heroSel = (heroSel + 1) % n; SFX.move(); }
    if (aPressed) { newGame(HERO_ORDER[heroSel]); startPlaying(true); }
    else if (bPressed) { mode = 'title'; SFX.move(); }
  }
  function drawHeroSelect() {
    R(ctx, 0, 0, W, H, 0);
    drawStars();
    centered('CHOOSE YOUR HERO', 16, 14);
    HERO_ORDER.forEach((id, i) => {
      const x = 29 + i * 50, y = 50, on = i === heroSel;
      if (on) box(x - 6, y - 6, 44, 46);
      ctx.globalAlpha = on ? 1 : 0.45;
      ctx.drawImage(HEROES[id].spr['down' + (on ? Math.floor(tick / 15) % 2 : 0)], x, y, 32, 32);
      ctx.globalAlpha = 1;
    });
    centered(HEROES[HERO_ORDER[heroSel]].name, 106, 15);
    if (Math.floor(tick / 20) % 2) { text('<', 68, 106, 10); text('>', 164, 106, 10); }
    centered(isTouch ? 'A: START   B: BACK' : 'SPACE: START   X: BACK', 138, 7);
  }
  function drawVictory() {
    R(ctx, 0, 0, W, H, 0);
    drawStars(60);
    const t = victory.t;
    if (victory.chapter) { // an earlier chapter has ended; the story goes on
      const ended = CHAPTERS[victory.chapter - 1], next = CHAPTERS[victory.chapter];
      centered(`CHAPTER ${victory.chapter}`, 30, 14, BIG);
      centered(ended.name ? `${ended.name} COMPLETE!` : 'COMPLETE!', 52, 14);
      ctx.drawImage(hero().spr.down0, 104, 66 + (Math.floor(t / 12) % 2 ? -2 : 0), 32, 32);
      centered(`LEVEL ${player.lvl}   WINS ${stats.won}`, 106, 15);
      if (next.name) centered(`${next.name} UNLOCKED!`, 118, 13);
      centered('The quest goes on...', 130, 11);
      if (t > 90 && Math.floor(tick / 30) % 2) centered(isTouch ? 'TAP A TO CONTINUE' : 'PRESS SPACE', 144, 10);
      return;
    }
    for (let i = 0; i < 24; i++) {
      const x = (hash(i, 5) * W + Math.sin((t + i * 20) / 20) * 6) | 0;
      const y = ((hash(i, 6) * H + t * (0.4 + hash(i, 7))) % (H + 10)) - 5 | 0;
      R(ctx, x, y, 2, 2, [14, 6, 13, 11, 9][i % 5]);
    }
    centered('VICTORY!', 12, 14, BIG);
    centered('The Dadda Boss is no more.', 32, 13);
    const bob = Math.floor(t / 12) % 2 ? -2 : 0;
    ctx.drawImage(hero().spr.down0, 72, 44 + bob, 32, 32);
    ctx.drawImage(SPR.elder.down0, 104, 44, 32, 32);
    ctx.drawImage(SPR.pip.down0, 136, 44 - bob, 32, 32);
    const done = QUEST_ORDER.filter((id) => q[id].s === 3).length;
    centered(`LEVEL ${player.lvl}   QUESTS ${done}/${QUEST_ORDER.length}`, 84, 15);
    centered(`WINS ${stats.won}   STEPS ${stats.steps}`, 96, 15);
    centered(`SLIMES SQUISHED ${stats.slimes}`, 108, 15);
    centered('Turnip Vale is saved!', 124, 11);
    if (t > 90 && Math.floor(tick / 30) % 2) centered(isTouch ? 'TAP A TO CONTINUE' : 'PRESS SPACE', 144, 10);
  }

  // ---------------------------------------------------------------- loop
  function startPlaying(isNew) {
    SFX.select();
    fadeOut(() => {
      mode = 'world';
      showBanner(MAPS[player.map].name);
      if (isNew) {
        saveGame();
        say('TIP', [isTouch
          ? 'Use the arrow pad to walk. Tap A next to people to talk. B opens your status and quests.'
          : 'ARROWS/WASD to walk. SPACE to talk. X opens your status and quest log.',
        'People with a ! have something for you. Elder Moss stands in the middle of the village.']);
      }
    }, 40);
  }
  function update() {
    tick++;
    if (fade) {
      fade.t++;
      if (!fade.fired && fade.t >= fade.dur / 2) { fade.fired = true; fade.mid?.(); }
      if (fade.t >= fade.dur) fade = null;
    } else if (encounter) {
      if (++encounter.t >= 40) { const type = encounter.type; encounter = null; fadeOut(() => startBattle(type), 24); }
    } else if (mode === 'title') {
      if (title.hasSave && (navPressed === 'up' || navPressed === 'down')) { title.sel ^= 1; SFX.move(); }
      if (aPressed) {
        if (title.hasSave && title.sel === 0) { loadGame(); startPlaying(false); }
        else { heroSel = 0; mode = 'heroSelect'; SFX.select(); }
      }
    } else if (mode === 'heroSelect') updateHeroSelect();
    else if (mode === 'world') updateWorld();
    else if (mode === 'dialog') { queuedDir = null; updateDialog(); }
    else if (mode === 'battle') updateBattle();
    else if (mode === 'shop') updateShop();
    else if (mode === 'menu') updateMenu();
    else if (mode === 'victory') {
      victory.t++;
      if (aPressed && victory.t > 90) { SFX.select(); fadeOut(() => { mode = 'world'; victory = null; }, 40); }
    }
    if (mode !== 'world' || fade || encounter) queuedDir = null;
    aPressed = false; bPressed = false; navPressed = null;
  }
  function render() {
    ctx.imageSmoothingEnabled = false;
    if (mode === 'title') drawTitle();
    else if (mode === 'heroSelect') drawHeroSelect();
    else if (mode === 'battle') drawBattle();
    else if (mode === 'victory') drawVictory();
    else if (mode === 'menu') drawMenu();
    else {
      drawWorld();
      drawHud();
      if (mode === 'dialog') drawDialog();
      if (mode === 'shop') drawShop();
    }
    if (encounter && Math.floor(encounter.t / 5) % 2 === 0) {
      ctx.globalAlpha = 0.7; R(ctx, 0, 0, W, H, ENEMIES[encounter.type]?.boss?.flash ?? 15); ctx.globalAlpha = 1;
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
    const barEl = document.getElementById('bar');
    isTouch = getComputedStyle(ctrl).display !== 'none';
    const reserved = (isTouch ? ctrl.offsetHeight : 0) + barEl.offsetHeight + 60;
    let s = Math.min((window.innerWidth - 32) / W, (window.innerHeight - reserved) / H);
    s = s >= 2 ? Math.floor(s) : Math.max(1, s);
    canvas.style.width = `${Math.floor(W * s)}px`;
    canvas.style.height = `${Math.floor(H * s)}px`;
  }
  window.addEventListener('resize', resize);
  resize();
  title.hasSave = !!readSave();

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

  // tiny debug hook for testing
  window.__rpg = {
    player, NPCS, MAPS, SOLID, QUESTS, QUEST_ORDER, CHAPTERS, ENEMIES, WEAPONS, ARMORS, ITEMS,
    get menuSel() { return menuSel; }, get dlg() { return dlg; },
    get chapter() { return currentChapter(); }, get storyDone() { return storyDone(); },
    get menuPage() { return menuPage; }, get menuNote() { return menuNote; }, get tracked() { return tracked; },
    get q() { return q; }, get flags() { return flags; }, get stats() { return stats; },
    get mode() { return mode; }, get battle() { return battle; }, get shop() { return shop; },
  };
})();
