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
  // ---- Ammerud: pale concrete blocks with orange balconies, a kiosk, and the basketball court
  TILE['7'] = mk(16, 16, (g) => { // gravel roof
    R(g, 0, 0, 16, 16, 3);
    for (let y = 3; y < 13; y++) for (let x = 0; x < 16; x++) if (hash(x + 13, y + 91) < 0.12) P(g, x, y, 7);
    R(g, 0, 0, 16, 2, 0); R(g, 0, 2, 16, 1, 10);
    R(g, 0, 13, 16, 1, 7); R(g, 0, 14, 16, 2, 0);
  });
  function concreteWall(g) {
    R(g, 0, 0, 16, 16, 12);
    for (let y = 0; y < 16; y++) for (let x = 1; x < 15; x++) if (hash(x + 5, y + 37) < 0.05) P(g, x, y, 10);
    R(g, 0, 0, 1, 16, 7); R(g, 15, 0, 1, 16, 7);
    R(g, 1, 15, 14, 1, 4);
  }
  TILE['8'] = mk(16, 16, (g) => { // block wall: a window over a balcony
    concreteWall(g);
    R(g, 3, 1, 10, 8, 0); R(g, 4, 2, 8, 6, 2);
    R(g, 4, 2, 8, 1, 13); R(g, 4, 3, 2, 2, 13); R(g, 8, 2, 1, 6, 0);
    R(g, 2, 9, 12, 5, 0); R(g, 3, 10, 10, 3, 9); R(g, 3, 10, 10, 1, 14);
    for (const x of [5, 8, 11]) R(g, x, 11, 1, 2, 4);
  });
  TILE['9'] = mk(16, 16, (g) => { // block entrance
    concreteWall(g);
    R(g, 2, 1, 12, 2, 9); R(g, 2, 3, 12, 1, 4);
    R(g, 4, 4, 8, 12, 0); R(g, 5, 5, 6, 11, 4);
    R(g, 6, 6, 4, 5, 13); R(g, 6, 6, 4, 1, 15); R(g, 8, 6, 1, 5, 0);
    P(g, 10, 12, 14);
  });
  TILE['v'] = mk(16, 16, (g) => { // kiosk window under a striped awning
    concreteWall(g);
    for (let x = 0; x < 16; x++) R(g, x, 0, 1, 4, Math.floor(x / 2) % 2 ? 15 : 6);
    R(g, 0, 4, 16, 1, 0);
    R(g, 2, 6, 12, 7, 0); R(g, 3, 7, 10, 5, 13); R(g, 3, 7, 10, 1, 15);
    for (const [x, c] of [[4, 6], [6, 14], [8, 11], [10, 16], [11, 9]]) R(g, x, 10, 1, 2, c);
    R(g, 1, 13, 14, 2, 4); R(g, 1, 13, 14, 1, 9);
  });
  TILE['f'] = mk(16, 16, (g) => { // chain-link fence
    grass(g, 14);
    for (let y = 2; y < 15; y++) for (let x = 0; x < 16; x++) if ((x + y) % 4 === 0 || (x - y + 64) % 4 === 0) P(g, x, y, 10);
    R(g, 0, 1, 16, 1, 3); R(g, 0, 2, 16, 1, 10);
    R(g, 0, 1, 2, 15, 3); R(g, 14, 1, 2, 15, 3); R(g, 0, 1, 1, 15, 10); R(g, 14, 1, 1, 15, 10);
    R(g, 0, 15, 16, 1, 5);
  });
  function court(g) {
    R(g, 0, 0, 16, 16, 8);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const h = hash(x + 29, y + 47);
      if (h < 0.02) P(g, x, y, 2); else if (h > 0.985) P(g, x, y, 13);
    }
  }
  TILE['a'] = mk(16, 16, (g) => court(g));
  TILE['j'] = mk(16, 16, (g) => { court(g); R(g, 7, 0, 2, 16, 15); }); // halfway line
  TILE['y'] = mk(16, 16, (g) => { // centre circle
    court(g);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 8);
      if (d > 5.6 && d <= 7) P(g, x, y, 15);
    }
    R(g, 7, 0, 2, 16, 15);
  });
  TILE['Z'] = mk(16, 16, (g) => { // the painted key under a hoop
    R(g, 0, 0, 16, 16, 6);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (hash(x + 3, y + 67) < 0.05) P(g, x, y, 1);
    R(g, 0, 0, 1, 16, 15); R(g, 15, 0, 1, 16, 15);
  });
  TILE['5'] = mk(16, 16, (g) => { // hoop on its post, facing right
    court(g);
    R(g, 0, 15, 6, 1, 2);
    R(g, 1, 2, 3, 14, 0); R(g, 2, 3, 1, 13, 10);
    R(g, 3, 1, 4, 11, 0); R(g, 4, 2, 2, 9, 15); R(g, 4, 5, 2, 3, 6);
    R(g, 6, 6, 7, 2, 0); R(g, 7, 6, 5, 1, 9);
    for (let y = 8; y < 12; y++) for (let x = 7 + (y % 2); x < 12; x += 2) P(g, x, y, 15);
  });
  TILE['6'] = flip(TILE['5']);
  // ---- Grorud: green heights with a cliff, old red-brick houses, and the dark factory
  TILE['^'] = mk(16, 16, (g) => { // a rock ledge: grass on top, a stone face below
    grass(g, 15);
    R(g, 0, 5, 16, 11, 7);
    for (const [x, y, w, h] of [[0, 6, 6, 4], [6, 6, 10, 3], [0, 11, 9, 4], [9, 10, 7, 5]]) {
      R(g, x, y, w, 1, 10); R(g, x + w - 1, y + 1, 1, h - 1, 3);
    }
    R(g, 0, 4, 16, 1, 5); R(g, 0, 15, 16, 1, 3);
    P(g, 4, 12, 3); P(g, 12, 7, 3);
  });
  TILE['>'] = mk(16, 16, (g) => { // stone steps cut into the ledge
    g.drawImage(TILE['^'], 0, 0);
    R(g, 2, 4, 12, 12, 3);
    for (let i = 0; i < 4; i++) { R(g, 3, 5 + i * 3, 10, 2, 10); R(g, 3, 7 + i * 3, 10, 1, 7); }
  });
  function brickWall(g) {
    R(g, 0, 0, 16, 16, 4);
    for (let r = 0; r < 4; r++) {
      const y = r * 4;
      R(g, 0, y + 3, 16, 1, 1);
      for (let x = (r % 2) * 4; x < 16; x += 8) R(g, x, y, 1, 3, 1);
      for (let x = (r % 2) * 4 + 1; x < 16; x += 8) R(g, x, y, 3, 1, 6);
    }
    R(g, 0, 15, 16, 1, 1);
  }
  TILE['&'] = mk(16, 16, (g) => { // red brick with a window
    brickWall(g);
    R(g, 3, 3, 10, 9, 0); R(g, 4, 4, 8, 7, 2);
    R(g, 4, 4, 8, 1, 13); R(g, 4, 5, 2, 2, 13); R(g, 8, 4, 1, 7, 0);
    R(g, 2, 12, 12, 1, 12);
  });
  TILE['$'] = mk(16, 16, (g) => { // red brick door
    brickWall(g);
    R(g, 3, 2, 10, 14, 0); R(g, 4, 3, 8, 13, 5);
    R(g, 5, 4, 6, 4, 13); R(g, 5, 4, 6, 1, 15); R(g, 8, 4, 1, 4, 0);
    P(g, 10, 10, 14);
  });
  TILE['<'] = mk(16, 16, (g) => { // the factory's saw-tooth roof
    R(g, 0, 0, 16, 16, 3);
    for (const y0 of [0, 8]) {
      for (let i = 0; i < 8; i++) R(g, 0, y0 + i, 16 - i * 2, 1, i < 2 ? 10 : 7);
      R(g, 13, y0 + 1, 3, 6, 13); R(g, 13, y0 + 1, 1, 6, 15); R(g, 0, y0 + 7, 16, 1, 0);
    }
  });
  TILE['|'] = mk(16, 16, (g) => { // the factory's dark brick front, with a pipe
    R(g, 0, 0, 16, 16, 1);
    for (let r = 0; r < 4; r++) {
      const y = r * 4;
      R(g, 0, y + 3, 16, 1, 0);
      for (let x = (r % 2) * 4; x < 16; x += 8) R(g, x, y, 1, 3, 0);
    }
    R(g, 11, 0, 3, 16, 3); R(g, 11, 0, 1, 16, 10); R(g, 10, 6, 5, 2, 7);
    R(g, 0, 15, 16, 1, 0);
  });
  function worksGate(open) {
    return mk(16, 16, (g) => {
      g.drawImage(TILE['|'], 0, 0);
      R(g, 1, 1, 14, 15, 0);
      if (open) {
        R(g, 2, 2, 12, 14, 1); R(g, 3, 5, 10, 11, 0);
        for (let x = 2; x < 14; x += 4) { R(g, x, 2, 2, 2, 14); R(g, x + 2, 2, 2, 2, 0); }
        R(g, 7, 0, 2, 1, 11);
      } else {
        R(g, 2, 2, 12, 14, 10);
        for (let y = 4; y < 16; y += 3) R(g, 2, y, 12, 1, 7);
        for (let x = 2; x < 14; x += 4) { R(g, x, 13, 2, 2, 14); R(g, x + 2, 13, 2, 2, 0); }
        R(g, 7, 0, 2, 1, 6);
      }
    });
  }
  TILE['['] = worksGate(false);
  TILE[']'] = worksGate(true);
  function terminal(on) { // the power terminal in front of the factory: three slots and a screen
    return mk(16, 16, (g) => {
      grass(g, 16);
      R(g, 3, 1, 10, 14, 0); R(g, 4, 2, 8, 12, 7); R(g, 4, 2, 8, 1, 10);
      R(g, 5, 3, 6, 4, on ? 13 : 0); if (on) { R(g, 6, 4, 2, 1, 15); R(g, 6, 5, 4, 1, 8); }
      for (const x of [5, 7, 9]) R(g, x, 9, 2, 3, on ? 14 : 1);
      P(g, 11, 13, on ? 11 : 6);
      R(g, 3, 15, 10, 1, 5);
    });
  }
  TILE['+'] = terminal(false);
  TILE['@'] = terminal(true);
  TILE['*'] = mk(16, 16, (g) => { // a power post: Grorud's save point
    g.drawImage(TILE['p'], 0, 0);
    R(g, 4, 13, 8, 3, 0); R(g, 5, 14, 6, 1, 3);
    R(g, 6, 5, 4, 9, 0); R(g, 7, 5, 2, 9, 10);
    circle(g, 8, 4, 3.6, 0); circle(g, 8, 4, 2.6, 13); P(g, 7, 3, 15);
    P(g, 8, 8, 14); P(g, 7, 9, 14); P(g, 8, 10, 14); P(g, 7, 11, 14); // a little bolt
  });
  function metalFloor(g) {
    R(g, 0, 0, 16, 16, 3);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (hash(x + 87, y + 13) < 0.04) P(g, x, y, 7);
    R(g, 0, 0, 16, 1, 1); R(g, 0, 0, 1, 16, 1);
    for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) P(g, x, y, 10);
  }
  TILE['-'] = mk(16, 16, (g) => metalFloor(g));
  TILE[':'] = mk(16, 16, (g) => { // hazard stripes on the floor
    metalFloor(g);
    for (let x = 0; x < 16; x += 4) { R(g, x, 0, 2, 3, 14); R(g, x + 2, 0, 2, 3, 0); R(g, x, 13, 2, 3, 14); R(g, x + 2, 13, 2, 3, 0); }
  });
  TILE['{'] = mk(16, 16, (g) => { // inside wall: dark plates and pipes
    R(g, 0, 0, 16, 16, 1);
    R(g, 0, 0, 16, 1, 3); R(g, 7, 0, 1, 16, 0); R(g, 0, 15, 16, 1, 0);
    R(g, 0, 4, 16, 3, 3); R(g, 0, 4, 16, 1, 10); R(g, 0, 10, 16, 2, 7); R(g, 0, 10, 16, 1, 10);
    P(g, 3, 8, 6); P(g, 12, 13, 14);
  });
  TILE['}'] = mk(16, 16, (g) => { // a machine
    metalFloor(g);
    R(g, 1, 2, 14, 13, 0); R(g, 2, 3, 12, 11, 7); R(g, 2, 3, 12, 1, 10); R(g, 13, 4, 1, 10, 3);
    circle(g, 5.5, 7.5, 2.4, 0); circle(g, 5.5, 7.5, 1.6, 15); P(g, 5, 6, 6);
    R(g, 9, 6, 3, 1, 11); R(g, 9, 8, 3, 1, 14); R(g, 9, 10, 3, 1, 6);
    R(g, 3, 11, 10, 2, 3);
  });
  const coil = [0, 1].map((f) => mk(16, 16, (g) => { // a crackling coil
    metalFloor(g);
    R(g, 4, 12, 8, 3, 0); R(g, 5, 13, 6, 1, 7);
    R(g, 6, 4, 4, 9, 0); for (let y = 5; y < 12; y += 2) R(g, 6, y, 4, 1, 9);
    circle(g, 8, 3, 3, 0); circle(g, 8, 3, 2, f ? 15 : 14);
    if (f) { P(g, 3, 1, 14); P(g, 2, 2, 15); P(g, 13, 4, 14); P(g, 12, 6, 15); }
    else { P(g, 12, 1, 14); P(g, 13, 2, 15); P(g, 3, 5, 14); P(g, 4, 7, 15); }
  }));
  TILE['!'] = coil[0];
  TILE['('] = mk(16, 16, (g) => { // the heavy door to NABILAH's hall, standing open
    g.drawImage(TILE['{'], 0, 0);
    R(g, 1, 1, 14, 15, 0); R(g, 3, 4, 10, 12, 1);
    for (let x = 1; x < 15; x += 4) { R(g, x, 1, 2, 2, 14); R(g, x + 2, 1, 2, 2, 0); }
    P(g, 2, 8, 6); P(g, 13, 8, 6);
  });
  TILE['%'] = mk(16, 16, (g) => { // a heap of scrap
    grass(g, 17);
    R(g, 1, 14, 14, 2, 5);
    ellipse(g, 8, 11, 7, 4.4, 0); ellipse(g, 8, 11, 6, 3.4, 3);
    R(g, 3, 8, 5, 3, 10); R(g, 3, 8, 5, 1, 15); R(g, 9, 6, 2, 6, 4); P(g, 9, 6, 9);
    circle(g, 11, 10, 2.6, 0); circle(g, 11, 10, 1.4, 7);
    R(g, 5, 12, 3, 1, 9); P(g, 12, 13, 6);
  });
  // ---- Veitvet: the blocks and the playground, the underground below, and the old shopping centre.
  // (Every plain letter is taken by now, so Veitvet's tiles use the letters around them.)
  function savePillar(g) { // a glowing info pillar: Veitvet's save point (drawn over whatever floor it stands on)
    R(g, 4, 13, 8, 3, 0); R(g, 5, 14, 6, 1, 3);
    R(g, 5, 2, 6, 12, 0); R(g, 6, 3, 4, 10, 10); R(g, 6, 3, 1, 10, 15);
    R(g, 6, 4, 4, 4, 13); R(g, 7, 5, 2, 1, 15); R(g, 7, 6, 1, 1, 8);
    P(g, 8, 10, 14); R(g, 7, 11, 3, 1, 14);
    R(g, 7, 1, 2, 1, 13);
  }
  TILE['Ø'] = mk(16, 16, (g) => { g.drawImage(TILE['p'], 0, 0); savePillar(g); });
  TILE['ø'] = mk(16, 16, (g) => { // stairs down into the underpass
    g.drawImage(TILE['p'], 0, 0);
    R(g, 1, 0, 14, 16, 0);
    for (let i = 0; i < 6; i++) R(g, 2, 1 + Math.round(i * 2.5), 12, 2, [10, 7, 7, 3, 3, 1][i]);
    R(g, 1, 0, 1, 16, 10); R(g, 14, 0, 1, 16, 10); R(g, 2, 0, 12, 1, 14);
  });
  TILE['Æ'] = mk(16, 16, (g) => { // the glass front of VEITVET CENTER
    R(g, 0, 0, 16, 16, 3);
    R(g, 1, 2, 6, 13, 8); R(g, 9, 2, 6, 13, 8);
    R(g, 1, 2, 6, 6, 13); R(g, 9, 2, 6, 6, 13);
    for (let i = 0; i < 4; i++) { P(g, 2 + i, 6 - i, 15); P(g, 10 + i, 7 - i, 15); }
    R(g, 0, 0, 16, 2, 10); R(g, 0, 15, 16, 1, 0);
  });
  TILE['Å'] = mk(16, 16, (g) => { // its doors, shuttered
    g.drawImage(TILE['Æ'], 0, 0);
    R(g, 1, 2, 14, 14, 0); R(g, 2, 3, 12, 13, 10);
    for (let y = 4; y < 16; y += 2) R(g, 2, y, 12, 1, 7);
    R(g, 6, 13, 4, 2, 6);
  });
  TILE['å'] = mk(16, 16, (g) => { // its doors, open: a dark doorway with a mat (walkable)
    g.drawImage(TILE['Æ'], 0, 0);
    R(g, 1, 2, 14, 14, 0); R(g, 3, 3, 10, 13, 2);
    R(g, 1, 3, 2, 13, 13); R(g, 13, 3, 2, 13, 13);
    R(g, 4, 13, 8, 3, 6); R(g, 4, 13, 8, 1, 17);
  });
  TILE['æ'] = mk(16, 16, (g) => { // a swing
    grass(g, 21);
    R(g, 1, 1, 14, 2, 4); R(g, 1, 1, 14, 1, 9);
    for (const x of [1, 13]) { R(g, x, 1, 2, 14, 4); R(g, x, 1, 1, 14, 9); }
    R(g, 6, 3, 1, 8, 10); R(g, 9, 3, 1, 8, 10);
    R(g, 5, 11, 6, 2, 6); R(g, 5, 11, 6, 1, 16);
  });
  TILE['0'] = mk(16, 16, (g) => { // a slide
    grass(g, 23);
    R(g, 2, 2, 2, 13, 10); R(g, 5, 2, 2, 13, 10); for (let y = 4; y < 14; y += 3) R(g, 2, y, 5, 1, 10);
    for (let i = 0; i < 11; i++) R(g, 6 + Math.round(i * 0.8), 2 + i, 3, 2, i < 1 ? 16 : 6);
    R(g, 2, 1, 6, 2, 6);
  });
  function tunnelWall(g) { // white tiles gone grey
    R(g, 0, 0, 16, 16, 10);
    for (let y = 0; y < 16; y += 4) R(g, 0, y, 16, 1, 7);
    for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < 16; x += 4) R(g, x, y, 1, 4, 7);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (hash(x + 61, y + 17) < 0.06) P(g, x, y, 3);
    R(g, 0, 12, 16, 4, 3); R(g, 0, 12, 16, 1, 1); R(g, 0, 15, 16, 1, 0);
  }
  TILE['Ä'] = mk(16, 16, (g) => tunnelWall(g));
  function platform(g) { // the underground floor: worn concrete
    R(g, 0, 0, 16, 16, 3);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const h = hash(x + 33, y + 71);
      if (h < 0.05) P(g, x, y, 7); else if (h > 0.97) P(g, x, y, 1);
    }
    R(g, 0, 0, 16, 1, 1);
  }
  TILE['ä'] = mk(16, 16, (g) => platform(g));
  TILE['ö'] = mk(16, 16, (g) => { // the old tracks
    R(g, 0, 0, 16, 16, 1);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (hash(x + 5, y + 91) < 0.08) P(g, x, y, 3);
    for (let x = 1; x < 16; x += 5) R(g, x, 0, 3, 16, 4);
    R(g, 0, 3, 16, 2, 10); R(g, 0, 3, 16, 1, 15); R(g, 0, 11, 16, 2, 10); R(g, 0, 11, 16, 1, 15);
  });
  TILE['þ'] = mk(16, 16, (g) => { // stairs up, out of the underground
    platform(g);
    R(g, 1, 0, 14, 16, 0);
    for (let i = 0; i < 6; i++) R(g, 2, 13 - Math.round(i * 2.5), 12, 2, [3, 3, 7, 7, 10, 15][i]);
    R(g, 1, 0, 1, 16, 10); R(g, 14, 0, 1, 16, 10);
  });
  TILE['Ð'] = mk(16, 16, (g) => { platform(g); savePillar(g); });
  // The SIGNAL DEVICE: a cabinet of antennas and lights. Live it blinks; shut down it is dead grey.
  const signalDevice = (f, live) => mk(16, 16, (g) => {
    tunnelWall(g);
    R(g, 2, 4, 12, 12, 0); R(g, 3, 5, 10, 10, live ? 2 : 3); R(g, 3, 5, 10, 1, live ? 8 : 7);
    R(g, 5, 0, 1, 5, 0); R(g, 10, 1, 1, 4, 0); P(g, 5, 0, live ? (f ? 16 : 15) : 7); P(g, 10, 1, live ? (f ? 15 : 16) : 7);
    for (let i = 0; i < 4; i++) P(g, 4 + i * 2, 7, live ? ((i + f) % 2 ? 16 : 13) : 1);
    R(g, 5, 9, 6, 3, live ? 13 : 1); if (live) { R(g, 6, 10, 4, 1, f ? 16 : 15); }
    R(g, 4, 13, 8, 1, live ? 17 : 1);
  });
  const deviceLive = [0, 1].map((f) => signalDevice(f, true));
  TILE['Ü'] = deviceLive[0];
  TILE['ü'] = signalDevice(0, false);
  // A relay antenna beside the device: rings pulse out of it while the signal is on.
  const relay = (f, live) => mk(16, 16, (g) => {
    tunnelWall(g);
    R(g, 7, 4, 2, 12, 0); R(g, 7, 4, 1, 12, 7); R(g, 5, 14, 6, 2, 0);
    circle(g, 8, 4, 2.4, 0); circle(g, 8, 4, 1.4, live ? (f ? 16 : 15) : 3);
    if (live) {
      const r = f ? [[3, 2], [3, 6], [13, 2], [13, 6]] : [[4, 1], [4, 7], [12, 1], [12, 7], [2, 4], [14, 4]];
      for (const [x, y] of r) P(g, x, y, 16);
    }
  });
  const relayLive = [0, 1].map((f) => relay(f, true));
  TILE['Ÿ'] = relayLive[0];
  TILE['ÿ'] = relay(0, false);
  // The shield in front of the device's chamber: crackling bars of signal across the floor.
  const shield = [0, 1].map((f) => mk(16, 16, (g) => {
    platform(g);
    for (let x = 1 + f; x < 16; x += 3) for (let y = 0; y < 16; y++) if ((y + x * 3 + f * 5) % 7 < 5) P(g, x, y, (y + f) % 3 ? 16 : 15);
    R(g, 0, 0, 16, 1, 17); R(g, 0, 15, 16, 1, 17);
  }));
  TILE['ß'] = shield[0];
  const breaker = (on) => mk(16, 16, (g) => { // the breaker for the shield: lever up while the power runs
    tunnelWall(g);
    R(g, 2, 2, 12, 13, 0); R(g, 3, 3, 10, 11, 7); R(g, 3, 3, 10, 1, 10);
    R(g, 7, 5, 2, 7, 0);
    if (on) { R(g, 6, 3, 4, 3, 6); R(g, 7, 3, 2, 1, 15); } else { R(g, 6, 10, 4, 3, 6); R(g, 7, 12, 2, 1, 1); }
    P(g, 4, 12, on ? 11 : 6); P(g, 11, 12, on ? 11 : 6);
    R(g, 4, 5, 2, 1, 14); R(g, 10, 5, 2, 1, 14);
  });
  TILE['§'] = breaker(true);
  TILE['¶'] = breaker(false);
  function mallFloor(g) { // the centre's floor: big pale tiles
    R(g, 0, 0, 16, 16, 15);
    R(g, 0, 0, 8, 8, 12); R(g, 8, 8, 8, 8, 12);
    R(g, 0, 0, 16, 1, 10); R(g, 0, 0, 1, 16, 10);
    P(g, 3, 11, 10); P(g, 12, 4, 10);
  }
  TILE['Ë'] = mk(16, 16, (g) => mallFloor(g));
  TILE['È'] = mk(16, 16, (g) => { // the centre's walls
    R(g, 0, 0, 16, 16, 12); R(g, 0, 0, 16, 2, 15);
    R(g, 0, 6, 16, 1, 4); R(g, 0, 12, 16, 4, 4); R(g, 0, 12, 16, 1, 9); R(g, 0, 15, 16, 1, 1);
    P(g, 4, 9, 9); P(g, 11, 3, 9);
  });
  TILE['Ê'] = mk(16, 16, (g) => { // a closed shop: the shutter is down
    R(g, 0, 0, 16, 16, 12);
    R(g, 0, 0, 16, 4, 2); R(g, 2, 1, 12, 2, 13); R(g, 3, 1, 3, 2, 8); R(g, 9, 1, 2, 2, 14);
    R(g, 1, 4, 14, 12, 7); for (let y = 5; y < 16; y += 2) R(g, 1, y, 14, 1, 10);
    R(g, 6, 13, 4, 1, 0);
  });
  TILE['Ì'] = mk(16, 16, (g) => { // a planter with a little tree
    mallFloor(g);
    R(g, 2, 9, 12, 7, 0); R(g, 3, 10, 10, 5, 4); R(g, 3, 10, 10, 1, 9);
    ellipse(g, 8, 6, 5.4, 5, 0); ellipse(g, 8, 6, 4.4, 4, 5); ellipse(g, 7, 5, 2.6, 2.2, 11);
  });
  function stageFloor(g) { // the stage: dark boards
    R(g, 0, 0, 16, 16, 1);
    for (let y = 0; y < 16; y += 4) { R(g, 0, y, 16, 1, 0); R(g, (y * 5) % 16, y + 1, 1, 3, 0); }
    for (let y = 2; y < 16; y += 4) P(g, (y * 7) % 16, y, 17);
  }
  TILE['Í'] = mk(16, 16, (g) => stageFloor(g));
  TILE['Ñ'] = mk(16, 16, (g) => { // a tall speaker stack
    stageFloor(g);
    R(g, 2, 0, 12, 16, 0); R(g, 3, 1, 10, 14, 3);
    for (const [cy, r] of [[4.5, 2.6], [11, 3.6]]) { circle(g, 8, cy, r, 0); circle(g, 8, cy, r - 1.2, 1); circle(g, 8, cy, 0.9, 10); }
  });
  // SANDRA's signal masts on the stage: live they blink and buzz; once she is beaten they go dark.
  const mast = (f, live) => mk(16, 16, (g) => {
    stageFloor(g);
    R(g, 7, 3, 2, 13, 0); R(g, 7, 3, 1, 13, 10); R(g, 4, 14, 8, 2, 0);
    for (const y of [6, 10]) R(g, 5, y, 6, 1, 0);
    circle(g, 8, 2.5, 2.2, 0); P(g, 8, 2, live ? (f ? 16 : 15) : 3); P(g, 7, 2, live ? 16 : 3);
    if (live) for (const [x, y] of f ? [[3, 1], [13, 1], [2, 4], [14, 4]] : [[4, 0], [12, 0], [3, 3], [13, 3]]) P(g, x, y, 16);
  });
  const mastLive = [0, 1].map((f) => mast(f, true));
  TILE['Ò'] = mastLive[0];
  TILE['ò'] = mast(0, false);
  // Tiles drawn with more than one frame in the world (besides water and flowers).
  const ANIM_TILES = { '!': coil, 'Ü': deviceLive, 'Ÿ': relayLive, 'ß': shield, 'Ò': mastLive };
  const SOLID = new Set(['T', 'P', '~', '#', 'R', 'H', 'D', 'S', 's', 'V', 'r', 'k', 'C', 'u', 'U', 'F', 'O', 'b', 'x', 'K',
    'G', 'A', 'B', 'd', 'h', 'l', 'n', 'M', 'J', 'Q', 'W', '1', '2', '3', '4', 'w', 'Y', 'z', 'N', 'i', 'I',
    '7', '8', '9', 'v', 'f', '5', '6',
    '^', '>', '&', '$', '<', '|', '[', '+', '@', '*', '{', '}', '!', '%',
    'Ø', 'Æ', 'Å', 'æ', '0', 'Ä', 'Ð', 'Ü', 'ü', 'Ÿ', 'ÿ', 'ß', '§', '¶', 'È', 'Ê', 'Ì', 'Ñ', 'Ò', 'ò']);

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
  // A rat in the given colours: fur, belly, pink (tail, ear, feet), eye, nose.
  const ratSprite = (f, [fur, belly, pink, eye, nose]) => outlined(mk(16, 16, (g) => {
    const o = f ? 1 : 0;
    for (const [x, y] of [[3, 11], [2, 10], [1, 9], [0, 8], [0, 7], [1, 6]]) P(g, x, y + o, pink); // tail
    ellipse(g, 7.5, 10.5 + o, 5, 3.4, fur);
    ellipse(g, 7.5, 12 + o, 4, 1.6, belly);
    ellipse(g, 12, 9 + o, 3, 2.6, fur);
    R(g, 10, 5 + o, 2, 2, fur); P(g, 10, 5 + o, pink); // ear
    P(g, 13, 8 + o, eye); P(g, 15, 9 + o, nose); // eye, nose
    R(g, 13, 11 + o, 1, 2, 15); // one big tooth
    if (f) { R(g, 4, 14, 2, 1, pink); R(g, 10, 14, 2, 1, pink); } else { R(g, 5, 14, 2, 1, pink); R(g, 9, 14, 2, 1, pink); }
  }));
  ENEMY_SPR.rat = [0, 1].map((f) => ratSprite(f, [7, 3, 12, 0, 16]));
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
  // ---- Ammerud's people
  SPR.selma = buildChar({ hair: 1, shirt: 5, shirt2: 0, pants: 2, longHair: true });
  SPR.nadia = buildChar({ hair: 0, skin: 19, shirt: 13, shirt2: 8, pants: 2, apron: 9, belt: 0, longHair: true });
  SPR.leif = buildChar({ hair: 15, shirt: 7, shirt2: 3, pants: 3, beard: 15 });
  SPR.astrid = buildChar({ hair: 10, shirt: 17, shirt2: 1, skirt: 2, hem: 0, longHair: true });
  SPR.emil = buildChar({ hair: 4, skin: 19, shirt: 11, shirt2: 5, pants: 8, slim: true });
  // MARCUS: a basketball jersey and a battered bat. In battle he stands facing the hero, one pixel lower
  // (so his head clears the name box); in his second phase the jersey turns red and the bat comes up.
  const MARCUS_LOOK = { hair: 18, skin: 4, shirt: 9, shirt2: 4, pants: 2, belt: 0 };
  SPR.marcus = buildChar(MARCUS_LOOK);
  const marcusBattle = (look, raised) => [0, 1].map((f) => mk(16, 16, (g) => {
    g.drawImage(buildChar(look)['down' + f], 0, 1);
    R(g, 5, 8, 6, 1, 15); // jersey trim
    if (raised) { R(g, 12, 0, 3, 9, 0); R(g, 13, 1, 1, 7, 9); R(g, 13, 7 + f, 1, 2, 4); P(g, 13, 1, 14); }
    else { R(g, 12, 6 + f, 3, 9, 0); R(g, 13, 7 + f, 1, 7, 9); R(g, 13, 7 + f, 1, 2, 4); P(g, 13, 13 + f, 14); }
  }));
  ENEMY_SPR.marcus = marcusBattle(MARCUS_LOOK, false);
  ENEMY_SPR.marcus2 = marcusBattle({ ...MARCUS_LOOK, shirt: 6, shirt2: 1 }, true);
  // ---- Ammerud's monsters
  ENEMY_SPR.shadow = [0, 1].map((f) => ratSprite(f, [1, 0, 3, 6, 6]));
  // A crawling slab of concrete with rebar sticking out of its back.
  ENEMY_SPR.crawler = [0, 1].map((f) => outlined(mk(16, 16, (g) => {
    const o = f ? 1 : 0;
    for (const x of [3, 6, 9, 12]) { R(g, x - (f ? 1 : 0), 12, 1, 3, 3); P(g, x - (f ? 2 : -1), 14, 3); }
    R(g, 2, 7 + o, 12, 6 - o, 7); R(g, 2, 7 + o, 12, 1, 10); R(g, 13, 8 + o, 1, 5 - o, 3);
    R(g, 3, 6 + o, 10, 1, 7);
    for (const [x, y] of [[5, 9], [6, 10], [10, 9], [9, 11]]) P(g, x, y + o, 3); // cracks
    for (const [x, h] of [[5, 4], [9, 5]]) { R(g, x, 6 + o - h, 1, h, 4); P(g, x, 6 + o - h, 9); } // rebar
    R(g, 11, 9 + o, 1, 1, 14); R(g, 13, 9 + o, 1, 1, 14);
  })));
  // A whole little apartment block on stubby legs, and in a temper.
  ENEMY_SPR.brute = [0, 1].map((f) => outlined(mk(16, 16, (g) => {
    const o = f ? 1 : 0;
    R(g, 3, 1 + o, 10, 12, 12); R(g, 3, 1 + o, 10, 1, 15); R(g, 12, 2 + o, 1, 11, 7);
    R(g, 2, 0 + o, 12, 2, 3);
    R(g, 4, 3 + o, 2, 1, 0); R(g, 10, 3 + o, 2, 1, 0); P(g, 5, 4 + o, 6); P(g, 10, 4 + o, 6); // angry eyes
    for (const y of [6, 9]) for (const x of [4, 7, 10]) { R(g, x, y + o, 2, 2, 2); P(g, x, y + o, 13); }
    R(g, 0, 5 + o, 3, 5, 12); R(g, 13, 5 + o, 3, 5, 12); R(g, 0, 9 + o, 3, 1, 7); R(g, 13, 9 + o, 3, 1, 7);
    R(g, 4, 13, 3, 3, 3); R(g, 9, 13, 3, 3, 3);
    R(g, 3, 12 + o, 10, 1, 9);
  })));
  // A cold blue light with a trailing tail. No outline: it glows.
  const wispSprite = (f, core, glow) => mk(16, 16, (g) => {
    const o = f ? 1 : 0;
    ellipse(g, 8, 7 + o, 5, 5, glow);
    ellipse(g, 8, 7 + o, 3.4, 3.4, core);
    ellipse(g, 7.4, 6.4 + o, 1.6, 1.6, 15);
    for (const [x, y] of f ? [[6, 12], [7, 13], [8, 14], [9, 15]] : [[9, 12], [8, 13], [7, 14], [6, 15]]) P(g, x, y, glow);
    P(g, 6, 7 + o, 2); P(g, 10, 7 + o, 2);
  });
  ENEMY_SPR.wisp = [0, 1].map((f) => wispSprite(f, 13, 8));
  ENEMY_SPR.glowwisp = [0, 1].map((f) => wispSprite(f, 15, 13));
  SPR.glowwisp = buildStatic(ENEMY_SPR.glowwisp[0], ENEMY_SPR.glowwisp[1]);
  const BALL_SPR = outlined(mk(16, 16, (g) => {
    circle(g, 8, 10, 4.6, 9);
    R(g, 4, 10, 9, 1, 4); R(g, 8, 6, 1, 9, 4);
    P(g, 5, 7, 4); P(g, 5, 13, 4); P(g, 11, 7, 4); P(g, 11, 13, 4);
    P(g, 6, 8, 14);
  }));
  // ---- Grorud's people
  SPR.tobias = buildChar({ hair: 4, shirt: 8, shirt2: 2, pants: 3, belt: 0 });
  SPR.nawal = buildChar({ hair: 0, shirt: 13, shirt2: 8, pants: 2, longHair: true });
  SPR.honey = buildChar({ hair: 14, shirt: 9, shirt2: 4, skirt: 9, hem: 4, longHair: true });
  SPR.joan = buildChar({ hair: 6, shirt: 5, shirt2: 0, pants: 3, apron: 7, belt: 0, ponytail: 6 });
  // NABILAH: overalls in hi-vis yellow and a giant wrench. In battle she stands facing the hero, one pixel
  // lower (so her head clears the name box); after the POWER SURGE sparks crackle all around her.
  const NABILAH_LOOK = { hair: 18, shirt: 14, shirt2: 9, pants: 2, belt: 0, longHair: true };
  SPR.nabilah = buildChar(NABILAH_LOOK);
  const nabilahBattle = (surge) => [0, 1].map((f) => mk(16, 16, (g) => {
    g.drawImage(buildChar(surge ? { ...NABILAH_LOOK, shirt: 13, shirt2: 8 } : NABILAH_LOOK)['down' + f], 0, 1);
    R(g, 5, 3, 6, 1, 0); P(g, 6, 3, 13); P(g, 9, 3, 13); // goggles pushed up
    R(g, 12, 3 + f, 2, 11, 0); R(g, 13, 4 + f, 1, 9, 10); R(g, 11, 2 + f, 4, 3, 0); R(g, 12, 3 + f, 2, 1, 7); // the wrench
    if (surge) for (const [x, y] of f ? [[1, 2], [2, 6], [14, 1], [1, 11], [15, 9]] : [[2, 1], [0, 5], [15, 3], [2, 13], [14, 11]]) { P(g, x, y, 14); P(g, x, y + 1, 15); }
  }));
  ENEMY_SPR.nabilah = nabilahBattle(false);
  ENEMY_SPR.nabilah2 = nabilahBattle(true);
  // ---- Grorud's monsters
  // The rust rat: a rat with a wind-up key in its back and a bolt for an ear.
  ENEMY_SPR.rust = [0, 1].map((f) => mk(16, 16, (g) => {
    g.drawImage(ratSprite(f, [9, 4, 12, 0, 6]), 0, 0);
    const o = f ? 1 : 0;
    R(g, 6, 4 + o, 1, 4, 0); R(g, 4, 3 + o - f, 5, 2, 0); R(g, 5, 3 + o - f, 1, 1, 10); R(g, 7, 3 + o - f, 1, 1, 10); // the key
    P(g, 11, 5 + o, 10); P(g, 9, 10 + o, 10); P(g, 5, 11 + o, 10); // rivets
  }));
  // The guard: a boxy patrol robot with a visor and a shield.
  ENEMY_SPR.guard = [0, 1].map((f) => outlined(mk(16, 16, (g) => {
    const o = f ? 1 : 0;
    R(g, 5, 1 + o, 6, 5, 10); R(g, 5, 1 + o, 6, 1, 15); R(g, 10, 2 + o, 1, 4, 7);
    R(g, 6, 3 + o, 4, 1, 6); P(g, 7 + f, 3 + o, 16); P(g, 8, 0 + o, 3);
    R(g, 4, 6, 8, 6, 2); R(g, 4, 6, 8, 1, 8); P(g, 7, 8, 14); P(g, 8, 8, 14);
    R(g, 12, 6 + o, 2, 5, 10);
    R(g, 0, 5, 5, 8, 7); R(g, 1, 6, 3, 6, 10); R(g, 2, 7, 1, 4, 14);
    R(g, 5, 12, 2, 3, 3); R(g, 9, 12, 2, 3, 3); R(g, 4, 15, 3, 1, 0); R(g, 9, 15, 3, 1, 0);
  })));
  // A heap of scrap that walks: rusty plates, a tyre for a shoulder, pipes for arms, two glowing eyes.
  const scrapSprite = (f, [plate, rust, dark], cell) => outlined(mk(16, 16, (g) => {
    const o = f ? 1 : 0;
    R(g, 3, 4, 10, 10, plate); R(g, 3, 4, 10, 1, 15); R(g, 12, 5, 1, 9, dark);
    R(g, 5, 0, 6, 4, plate); R(g, 5, 0, 6, 1, 15); P(g, 6, 2, 14); P(g, 9, 2, 14);
    R(g, 4, 7, 3, 2, rust); R(g, 9, 10, 3, 2, rust); P(g, 6, 12, dark); P(g, 8, 6, dark);
    circle(g, 2.5, 6.5 + o, 2.6, 0); circle(g, 2.5, 6.5 + o, 1.2, dark);
    R(g, 0, 8 + o, 2, 5, 10); R(g, 14, 5 + o, 2, 7, 10); R(g, 14, 5 + o, 1, 7, 15);
    R(g, 4, 14, 3, 2, dark); R(g, 9, 14, 3, 2, dark);
    if (cell) { R(g, 6, 7, 4, 4, 0); R(g, 7, 8, 2, 2, f ? 15 : 13); }
  }));
  ENEMY_SPR.scrap = [0, 1].map((f) => scrapSprite(f, [7, 9, 3]));
  ENEMY_SPR.hulk = [0, 1].map((f) => scrapSprite(f, [4, 6, 1], true));
  SPR.hulk = buildStatic(ENEMY_SPR.hulk[0], ENEMY_SPR.hulk[1]);
  // A yellow light with sparks: the power wisp.
  ENEMY_SPR.pwisp = [0, 1].map((f) => mk(16, 16, (g) => {
    g.drawImage(wispSprite(f, 14, 9), 0, 0);
    for (const [x, y] of f ? [[1, 4], [2, 5], [1, 6], [14, 8], [13, 9]] : [[14, 3], [13, 4], [14, 5], [2, 9], [1, 10]]) P(g, x, y, 15);
  }));
  // The factory sentinel: a tall robot on three legs with one big red eye.
  ENEMY_SPR.sentinel = [0, 1].map((f) => outlined(mk(16, 16, (g) => {
    const o = f ? 1 : 0;
    R(g, 4, 1, 8, 9, 10); R(g, 4, 1, 8, 1, 15); R(g, 11, 2, 1, 8, 7);
    circle(g, 8, 5, 2.8, 0); circle(g, 8, 5, 1.8, f ? 16 : 6); P(g, 7, 4, 15);
    R(g, 7, 0, 2, 1, 3); P(g, 8, 0, 6);
    R(g, 5, 10, 6, 2, 3); R(g, 2, 3 + o, 2, 6, 7); R(g, 12, 3 + o, 2, 6, 7); P(g, 2, 9 + o, 14); P(g, 13, 9 + o, 14);
    R(g, 3, 12, 2, 4, 3); R(g, 7, 12, 2, 4, 3); R(g, 11, 12, 2, 4, 3);
  })));
  const CELL_SPR = [0, 1].map((f) => outlined(mk(16, 16, (g) => {
    R(g, 5, 4, 6, 10, 7); R(g, 5, 4, 6, 1, 10); R(g, 7, 2, 2, 2, 10);
    R(g, 6, 6, 4, 6, f ? 15 : 13); R(g, 7, 7, 2, 1, 14); R(g, 8, 8, 1, 2, 14); R(g, 7, 10, 1, 1, 14);
    if (f) { P(g, 3, 5, 14); P(g, 12, 9, 14); }
  })));
  const BAG_SPR = outlined(mk(16, 16, (g) => {
    R(g, 6, 3, 4, 1, 1); R(g, 5, 4, 1, 3, 1); R(g, 10, 4, 1, 3, 1);
    R(g, 3, 7, 10, 7, 16); R(g, 3, 7, 10, 1, 15); R(g, 12, 8, 1, 6, 17); R(g, 3, 13, 10, 1, 17);
    R(g, 7, 9, 3, 2, 14); P(g, 7, 10, 0); P(g, 9, 9, 0); P(g, 8, 8, 15); P(g, 10, 8, 15); // a little bee
  }));
  // ---- Veitvet's people
  SPR.mina = buildChar({ hair: 1, skin: 19, shirt: 11, shirt2: 5, pants: 2, belt: 0, ponytail: 14 });
  SPR.elias = buildChar({ hair: 14, shirt: 6, shirt2: 1, pants: 8, slim: true });
  SPR.marianne = buildChar({ hair: 4, shirt: 16, shirt2: 17, skirt: 17, hem: 1, longHair: true, bow: 13 });
  SPR.noah = buildChar({ hair: 0, skin: 19, shirt: 9, shirt2: 4, pants: 3, belt: 0 });
  // SANDRA: a long purple coat, big headphones and an antenna rig on her back. In battle she stands facing the
  // hero, one pixel lower (so her head clears the name box); in SIGNAL OVERLOAD the coat turns pink and her
  // signal crackles all around her.
  const SANDRA_LOOK = { hair: 6, shirt: 17, shirt2: 1, pants: 0, longHair: true, belt: 13 };
  const sandraRig = (g, f, oy) => {
    R(g, 3, 2 + oy, 1, 4, 0); R(g, 12, 2 + oy, 1, 4, 0); R(g, 3, 1 + oy, 10, 1, 0); // headphones
    R(g, 2, 3 + oy, 2, 3, 13); R(g, 12, 3 + oy, 2, 3, 13);
    R(g, 13, 0, 1, 8 + oy, 0); P(g, 13, 0, f ? 16 : 15); // the antenna
  };
  SPR.sandra = (() => {
    const plain = buildChar(SANDRA_LOOK), s = {};
    for (const [k, img] of Object.entries(plain)) s[k] = k.startsWith('up') ? img : mk(16, 16, (g) => { g.drawImage(img, 0, 0); sandraRig(g, +k.slice(-1), 0); });
    return s;
  })();
  const sandraBattle = (overload) => [0, 1].map((f) => mk(16, 16, (g) => {
    const look = overload ? { ...SANDRA_LOOK, shirt: 16, shirt2: 17 } : SANDRA_LOOK;
    g.drawImage(buildChar(look)['down' + f], 0, 1);
    sandraRig(g, f, 1);
    R(g, 1, 7 + f, 2, 5, 0); R(g, 1, 8 + f, 1, 3, 10); P(g, 1, 7 + f, 16); // the microphone in her hand
    if (overload) for (const [x, y] of f ? [[0, 1], [15, 4], [1, 13], [14, 12], [6, 0]] : [[1, 3], [14, 1], [0, 10], [15, 13], [10, 0]]) { P(g, x, y, 16); P(g, x + (x < 8 ? 1 : -1), y, 15); }
  }));
  ENEMY_SPR.sandraBoss = sandraBattle(false);
  ENEMY_SPR.sandra2 = sandraBattle(true);
  // ---- Veitvet's monsters
  // The street bot: a boxy little robot on one wheel, with a traffic-light eye and a whip antenna.
  ENEMY_SPR.bot = [0, 1].map((f) => outlined(mk(16, 16, (g) => {
    const o = f ? 1 : 0;
    R(g, 4, 3 + o, 8, 8, 13); R(g, 4, 3 + o, 8, 1, 15); R(g, 11, 4 + o, 1, 7, 8);
    R(g, 5, 5 + o, 6, 3, 0); P(g, 6, 6 + o, f ? 11 : 6); P(g, 8, 6 + o, 14); P(g, 9, 6 + o, f ? 6 : 11);
    R(g, 6, 9 + o, 4, 1, 8);
    R(g, 10, 0, 1, 3 + o, 0); P(g, 10, 0, 16);
    R(g, 2, 6 + o, 2, 3, 10); R(g, 12, 6 + o, 2, 3, 10);
    circle(g, 8, 13, 2.6, 0); circle(g, 8, 13, 1.4, 7); R(g, 7, 11, 2, 1, 3);
  })));
  // The shadow hound: a lean black dog with a glowing pink eye and spiky fur.
  ENEMY_SPR.hound = [0, 1].map((f) => outlined(mk(16, 16, (g) => {
    const o = f ? 1 : 0;
    ellipse(g, 7, 9 + o, 5.4, 3, 1);
    ellipse(g, 12, 6 + o, 3, 2.6, 1); R(g, 13, 7 + o, 3, 2, 1); P(g, 15, 7 + o, 0); // head and snout
    R(g, 11, 2 + o, 2, 3, 1); P(g, 11, 2 + o, 0); // ear
    P(g, 13, 5 + o, 16); P(g, 14, 5 + o, 15); // eye
    R(g, 13, 9 + o, 2, 1, 15); // teeth
    for (const [x, y] of [[3, 6], [5, 5], [7, 5], [9, 5]]) P(g, x, y + o, 0); // spiky back
    for (let i = 0; i < 3; i++) P(g, 1 - (i ? 1 : 0), 7 + i + o, 1); // tail
    if (f) { R(g, 3, 12, 2, 3, 1); R(g, 9, 12, 2, 3, 1); } else { R(g, 4, 12, 2, 3, 1); R(g, 8, 12, 2, 3, 1); }
  })));
  // The signal wisp: not a flame but a pulse: a pink core with rings of signal around it.
  ENEMY_SPR.swisp = [0, 1].map((f) => mk(16, 16, (g) => {
    const o = f ? 1 : 0;
    circle(g, 8, 7 + o, 3, 17); circle(g, 8, 7 + o, 2, 16); P(g, 7, 6 + o, 15);
    P(g, 7, 7 + o, 0); P(g, 9, 7 + o, 0);
    const ring = (r, c) => { for (let a = 0; a < 24; a++) { const t = a / 24 * Math.PI * 2; if (Math.abs(Math.cos(t)) > 0.55) P(g, Math.round(8 + Math.cos(t) * r), Math.round(7 + o + Math.sin(t) * r), c); } };
    ring(f ? 5 : 4.4, 13); ring(f ? 7 : 6.4, f ? 16 : 8);
    for (const [x, y] of f ? [[8, 12], [7, 13], [8, 14]] : [[8, 11], [9, 12], [8, 13], [7, 14]]) P(g, x, y, 16);
  }));
  // The underground golem: a slab of tunnel wall that got up, tiles and all, with a rail for an arm.
  ENEMY_SPR.ugolem = [0, 1].map((f) => outlined(mk(16, 16, (g) => {
    const o = f ? 1 : 0;
    R(g, 3, 3, 10, 11, 10); for (let y = 3; y < 14; y += 3) R(g, 3, y, 10, 1, 7); for (const x of [6, 9]) R(g, x, 3, 1, 11, 7);
    R(g, 12, 4, 1, 10, 3); R(g, 3, 3, 10, 1, 15);
    R(g, 5, 5, 2, 1, 0); R(g, 9, 5, 2, 1, 0); P(g, 6, 5, 6); P(g, 9, 5, 6);
    R(g, 4, 1, 3, 2, 3); R(g, 10, 1, 2, 2, 3); // broken top
    R(g, 0, 5 + o, 3, 7, 3); R(g, 0, 5 + o, 3, 1, 10);
    R(g, 13, 4 + o, 2, 9, 10); R(g, 15, 4 + o, 1, 9, 15); // the rail
    R(g, 4, 14, 3, 2, 3); R(g, 9, 14, 3, 2, 3);
    P(g, 8, 10, 3); P(g, 5, 11, 3);
  })));
  // The Veitvet guard: a big security guard in navy, cap pulled low, torch in hand.
  ENEMY_SPR.vguard = [0, 1].map((f) => mk(16, 16, (g) => {
    g.drawImage(buildChar({ hair: 0, shirt: 2, shirt2: 0, pants: 0, belt: 14 })['down' + f], 0, 1);
    R(g, 4, 1, 8, 2, 2); R(g, 4, 3, 9, 1, 0); P(g, 7, 2, 14); // cap
    R(g, 12, 8 + f, 3, 2, 0); R(g, 13, 8 + f, 2, 1, 10); P(g, 15, 8 + f, 14); // torch
  }));
  // The signal beast: a hulking hound of static, antennas sprouting from its back.
  const beastSprite = (f) => outlined(mk(16, 16, (g) => {
    const o = f ? 1 : 0;
    ellipse(g, 7, 9 + o, 6.4, 4, 17); ellipse(g, 7, 10 + o, 5, 2.4, 1);
    ellipse(g, 12.5, 7 + o, 3.4, 3, 17); R(g, 13, 8 + o, 3, 3, 17); R(g, 13, 10 + o, 3, 1, 15);
    P(g, 13, 6 + o, 15); P(g, 14, 6 + o, 16);
    for (const [x, h] of [[3, 4], [6, 6], [9, 4]]) { R(g, x, 6 + o - h, 1, h, 0); P(g, x, 6 + o - h, f ? 16 : 15); }
    if (f) { R(g, 2, 12, 2, 4, 17); R(g, 9, 12, 2, 4, 17); } else { R(g, 3, 12, 2, 4, 17); R(g, 8, 12, 2, 4, 17); }
    for (const [x, y] of [[4, 9], [8, 8], [6, 11]]) P(g, x, y + o, 16);
  }));
  ENEMY_SPR.beast = [0, 1].map(beastSprite);
  SPR.beast = buildStatic(ENEMY_SPR.beast[0], ENEMY_SPR.beast[1]);
  const PHONE_SPR = outlined(mk(16, 16, (g) => {
    R(g, 5, 4, 6, 10, 0); R(g, 6, 5, 4, 7, 13); R(g, 6, 5, 4, 1, 15); P(g, 8, 13, 10);
    R(g, 7, 7, 2, 2, 16); // a heart sticker on the screen
  }));

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
  //   quick      it strikes once before the hero's first move, unless the hero's armour or weapon is `nimble`
  //   shock      its blows are electric (see enemyHit)
  //   signal     it is driven by the SIGNAL (see Veitvet below); signalHit: its blows are signal blows
  //   turn(b)    its whole turn in place of a plain attack, as for a boss
  //   defeated   line shown when it is beaten
  //   won(b)     called (and awaited) at the end of a battle it lost, after the rewards
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
  //   heavy    the weapon ignores the defence of `armored` enemies (smash: the line said when it does)
  //   nimble   `quick` enemies do not get their opening strike against this armour, or this weapon
  //   keen     the weapon lands a critical hit twice as often
  //   insulated  the armour takes this share (0..1) off every electric blow
  //   tuned    the weapon's blows are multiplied by this against `signal` enemies (hum: the line said once a fight)
  //   padded   the armour takes this share off every big physical blow (one stronger than a plain attack)
  //   resist   the armour takes this share off every signal blow, and blunts SANDRA's JAM and DISTORTION
  //   swing    battle line for an attack (default: 'You swing your sword!')
  //   name     for the status panel: at most 10 letters fit inside it; `full` is the name in the gear list and
  //            in messages, if it differs (at most 14 letters)
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
  // ---- Ammerud
  ENEMIES.crawler = { name: 'CONCRETE CRAWLER', hp: 58, atk: 25, def: 7, xp: 34, gold: [14, 18], intro: 'scrapes out!' };
  ENEMIES.shadow = { name: 'SHADOW RAT', hp: 40, atk: 29, def: 4, xp: 32, gold: [12, 16], intro: 'darts out!', quick: true };
  ENEMIES.brute = {
    name: 'BLOCK BRUTE', hp: 84, atk: 25, def: 12, xp: 48, gold: [20, 26], intro: 'stomps up!', armored: true,
    // Heavy: every third turn it stops to crack its knuckles.
    async turn(b) {
      if (b.turn % 3 === 0) { await msg('The BLOCK BRUTE cracks its knuckles...', 500); return; }
      await msg(`${b.name} slams into you!`, 100);
      await enemyHit(1);
    },
  };
  // Every third turn a cold light washes over the hero: a harder blow.
  async function wispTurn(b) {
    if (b.turn % 3 === 0) {
      await msg(`The ${b.name} flares cold and blue!`, 100);
      await enemyHit(1.4);
      return;
    }
    await msg(`${b.name} drifts into you!`, 100);
    await enemyHit(1);
  }
  ENEMIES.wisp = { name: 'FOREST WISP', hp: 50, atk: 27, def: 6, xp: 40, gold: [16, 22], intro: 'flickers into view!', turn: wispTurn };
  // The one on the dark path, met once for THE DARK PATH: tougher than any wanderer, but no boss.
  ENEMIES.glowwisp = {
    name: 'GLOWING WISP', hp: 110, atk: 28, def: 8, xp: 90, gold: [40, 40], intro: 'blazes up!', turn: wispTurn,
    defeated: 'The GLOWING WISP gutters out. Something small drops to the path.',
    async won() {
      if (q.wisp.s !== 1 || flags.wispFragment) return;
      flags.wispFragment = true;
      markReady('wisp');
      SFX.pickup();
      await msg('You got the WISP FRAGMENT! Show ASTRID!', 1000);
    },
  };
  ENEMIES.marcus = {
    name: 'MARCUS', hp: 180, atk: 26, def: 9, xp: 150, gold: [150, 150], intro: 'spins his bat!',
    boss: {
      flash: 9,
      named: true,
      // Phase 1: a swing, a feint, a grin. Below half HP, once: "Okay. That's enough." From then on his
      // jersey is red and he swings harder, and every third turn he winds up for a POWER SLAM.
      async turn(b) {
        if (!b.angry && b.hp <= b.max / 2) {
          b.angry = true; b.look = 'marcus2'; b.step = 0;
          SFX.charge();
          await msg('MARCUS: "Okay. That\'s enough."', 900);
        }
        if (b.charged) {
          b.charged = false;
          await msg('POWER SLAM!!', 100);
          await enemyHit(2);
        } else if (b.angry) {
          b.step++;
          if (b.step % 3 === 0) {
            b.charged = true;
            SFX.charge();
            await msg('MARCUS lifts the bat high over his head...', 900);
          } else {
            await msg('MARCUS swings hard!', 100);
            await enemyHit(1.1);
          }
        } else if (b.turn % 3 === 1) {
          await msg('MARCUS swings his bat!', 100);
          await enemyHit(1);
        } else if (b.turn % 3 === 2) {
          await msg('MARCUS fakes left... and swings right!', 100);
          await enemyHit(1.3);
        } else {
          await msg('MARCUS spins the bat and grins.', 700);
        }
      },
      defeated: 'MARCUS drops to one knee. "Alright. ALRIGHT."',
      flag: 'marcusBeaten',
      after: () => marcusHandover(),
    },
  };
  // ---- Grorud. Every one of these is a shade tougher than its Ammerud counterpart; an electric enemy
  // sets `shock` (its plain blows are electric) or passes true to enemyHit for a single electric blow.
  ENEMIES.rust = { name: 'RUST RAT', hp: 48, atk: 27, def: 5, xp: 30, gold: [11, 15], intro: 'clanks out!', quick: true };
  ENEMIES.guard = { name: 'GRORUD GUARD', hp: 64, atk: 28, def: 8, xp: 38, gold: [16, 21], intro: 'marches up!' };
  // Slow: it only strikes on every second turn, but hard. Its plates only give way to a heavy weapon.
  async function scrapTurn(b) {
    if (b.turn % 2) { await msg(`The ${b.name} creaks and rattles...`, 500); return; }
    await msg(`${b.name} swings a pipe!`, 100);
    await enemyHit(1);
  }
  ENEMIES.scrap = { name: 'SCRAP GOLEM', hp: 70, atk: 32, def: 15, xp: 50, gold: [22, 30], intro: 'clatters up!', armored: true, turn: scrapTurn };
  // The big one on the heights, met once: it carries a POWER CELL, and it always drops it.
  ENEMIES.hulk = {
    name: 'BIG SCRAP GOLEM', hp: 120, atk: 33, def: 16, xp: 85, gold: [40, 40], intro: 'looms over you!', armored: true, turn: scrapTurn,
    defeated: 'The BIG SCRAP GOLEM clatters into a heap.',
    async won() {
      if (flags.cell2) return;
      flags.cell2 = true;
      SFX.pickup();
      await msg(`A POWER CELL rolls out of the heap! (${cells()}/3)`, 1000);
    },
  };
  // Quick and electric: every blow is a shock, and every third turn a bigger one.
  ENEMIES.pwisp = {
    name: 'POWER WISP', hp: 44, atk: 30, def: 5, xp: 40, gold: [16, 22], intro: 'crackles into view!', quick: true, shock: true,
    async turn(b) {
      if (b.turn % 3 === 0) {
        await msg(`The ${b.name} flares! ZZZAP!`, 100);
        await enemyHit(1.4);
        return;
      }
      await msg(`The ${b.name} zaps you!`, 100);
      await enemyHit(1);
    },
  };
  // Only inside the Works: armoured, and every third turn it arcs static at the hero.
  ENEMIES.sentinel = {
    name: 'FACTORY SENTINEL', hp: 96, atk: 31, def: 11, xp: 60, gold: [28, 36], intro: 'whirs into life!', armored: true,
    async turn(b) {
      if (b.turn % 3 === 0) {
        await msg('The SENTINEL sends out a STATIC ARC!', 100);
        await enemyHit(1.2, true);
        return;
      }
      await msg(`${b.name} punches!`, 100);
      await enemyHit(1);
    },
  };
  // Harder than MARCUS for the same hero; the insulated vest takes a clear share of it off, the factory armour
  // less, and a hero with neither still wins with the herbs a normal journey brings.
  ENEMIES.nabilah = {
    name: 'NABILAH', hp: 250, atk: 30, def: 10, xp: 190, gold: [180, 180], intro: 'cracks her knuckles!',
    boss: {
      flash: 14,
      named: true,
      // Phase 1: a swing of the wrench, a spark, a little tune. At half HP, once: POWER SURGE! From then on
      // she glows, her guard drops a little, her shocks hit harder, and every third turn she plugs into the
      // wall and lets go with an OVERLOAD.
      async turn(b) {
        if (!b.surge && b.hp <= b.max / 2) {
          b.surge = true; b.look = 'nabilah2'; b.step = 0; b.def = Math.max(0, b.def - 3); b.zap = 30;
          SFX.charge();
          await msg('POWER SURGE!!', 900);
          await msg('NABILAH crackles with power. Her guard drops!', 700);
        }
        if (b.charged) {
          b.charged = false;
          await msg('OVERLOAD!!', 100);
          await enemyHit(2, true);
        } else if (b.surge) {
          b.step++;
          if (b.step % 3 === 0) {
            b.charged = true;
            SFX.charge();
            await msg('NABILAH plugs into the wall. Sparks fly...', 900);
          } else if (b.step % 3 === 1) {
            await msg('NABILAH hurls a bolt of lightning!', 100);
            await enemyHit(1.3, true);
          } else {
            await msg('NABILAH swings her giant wrench!', 100);
            await enemyHit(1.1);
          }
        } else if (b.turn % 3 === 1) {
          await msg('NABILAH swings her giant wrench!', 100);
          await enemyHit(1);
        } else if (b.turn % 3 === 2) {
          await msg('NABILAH flicks a spark at you! ZAP!', 100);
          await enemyHit(1.2, true);
        } else {
          await msg('NABILAH tightens a bolt and hums a tune.', 700);
        }
      },
      defeated: 'NABILAH fizzles and sits down. "Okay... power down."',
      flag: 'nabilahBeaten',
      after: () => nabilahHandover(),
    },
  };
  // ---- Veitvet. A shade tougher again than Grorud. An enemy marked `signal` is driven by the SIGNAL: while the
  // device under Veitvet is live (until the signalOff flag) an ordinary one hits 10% harder, and the SIGNAL BLADE
  // cuts it deeper. `signalHit` makes its plain blows signal blows (see enemyHit).
  ENEMIES.bot = { name: 'STREET BOT', hp: 50, atk: 29, def: 6, xp: 36, gold: [13, 17], intro: 'whirs out!', quick: true, signal: true };
  // Two bites, then it crouches low (a warning), then it pounces: a big blow.
  ENEMIES.hound = {
    name: 'SHADOW HOUND', hp: 52, atk: 32, def: 5, xp: 40, gold: [15, 20], intro: 'bares its teeth!', signal: true,
    async turn(b) {
      if (b.charged) {
        b.charged = false;
        await msg(`The ${b.name} POUNCES!`, 100);
        await enemyHit(1.6);
      } else if (b.turn % 3 === 0) {
        b.charged = true;
        await msg(`The ${b.name} crouches low...`, 600);
      } else {
        await msg(`The ${b.name} bites!`, 100);
        await enemyHit(1);
      }
    },
  };
  // Quick, and every blow is a signal blow; every third turn it lets out a piercing whine.
  ENEMIES.swisp = {
    name: 'SIGNAL WISP', hp: 46, atk: 31, def: 6, xp: 42, gold: [16, 22], intro: 'pulses into view!', quick: true, signal: true, signalHit: true,
    async turn(b) {
      if (b.turn % 3 === 0) {
        await msg(`The ${b.name} lets out a piercing whine!`, 100);
        await enemyHit(1.35);
        return;
      }
      await msg(`The ${b.name} buzzes into you!`, 100);
      await enemyHit(1);
    },
  };
  // Armoured and heavy: it gathers itself, strikes, then hurls a chunk of tunnel. Over and over.
  ENEMIES.ugolem = {
    name: 'UNDERGROUND GOLEM', hp: 84, atk: 34, def: 17, xp: 58, gold: [24, 32], intro: 'tears itself off the wall!', armored: true,
    async turn(b) {
      const step = b.turn % 3;
      if (step === 1) { await msg('The GOLEM grinds and gathers grit...', 500); return; }
      if (step === 2) { await msg(`${b.name} swings a rail!`, 100); await enemyHit(1); return; }
      await msg('The GOLEM hurls a chunk of tunnel!', 100);
      await enemyHit(1.4);
    },
  };
  ENEMIES.vguard = { name: 'VEITVET GUARD', hp: 74, atk: 31, def: 10, xp: 46, gold: [18, 24], intro: 'steps out of the shadows!' };
  // The big one under Veitvet, met once: it guards a side tunnel. No boss: it can be run from.
  ENEMIES.beast = {
    name: 'SIGNAL BEAST', hp: 140, atk: 34, def: 11, xp: 110, gold: [60, 60], intro: 'rises, crackling!', signal: true,
    async turn(b) {
      if (b.turn % 3 === 0) {
        await msg('The SIGNAL BEAST howls! The air warps!', 100);
        await enemyHit(1.35, false, true);
        return;
      }
      await msg(`The ${b.name} slashes!`, 100);
      await enemyHit(1);
    },
    defeated: 'The SIGNAL BEAST fizzles into static!',
    async won() { flags.beastBeaten = true; },
  };
  // The most tactical fight so far. Her own rig feeds her, so the device under Veitvet makes no difference
  // to her. Phase 1: a swing of the mic stand, a SIGNAL PULSE, a look, a STATIC BURST (electric). At half HP,
  // once: SIGNAL OVERLOAD. From then on: SIGNAL JAM (the hero's ATK drops for a while), a swing, DISTORTION
  // (the hero's DEF drops for a while), a warning, and FEEDBACK: a huge signal blow. HEADPHONES shorten and
  // soften the JAM and the DISTORTION and take a share off every signal blow.
  ENEMIES.sandraBoss = {
    name: 'SANDRA', hp: 290, atk: 31, def: 11, xp: 230, gold: [220, 220], intro: 'taps the microphone!', signal: true,
    boss: {
      flash: 16,
      named: true,
      async turn(b) {
        if (!b.overload && b.hp <= b.max / 2) {
          b.overload = true; b.look = 'sandra2'; b.step = 0; b.def = Math.max(0, b.def - 2); b.glitch = 40;
          SFX.overload();
          await msg('SANDRA ACTIVATES SIGNAL OVERLOAD!', 900);
          await msg('The air warps and hisses around her!', 700);
        }
        const resist = !!ARMORS[player.armor].resist;
        if (b.charged) {
          b.charged = false;
          await msg('FEEDBACK!!', 100);
          await enemyHit(2, false, true);
        } else if (b.overload) {
          const step = ++b.step % 5;
          if (step === 1) {
            await msg('SIGNAL JAM!', 100);
            await enemyHit(0.8, false, true);
            if (player.hp > 0) await heroFx('weak', resist ? 4 : 8, resist ? 2 : 3, 'Your ATK drops!');
          } else if (step === 2) {
            await msg('SANDRA swings her mic stand!', 100);
            await enemyHit(1.1);
          } else if (step === 3) {
            await msg('DISTORTION!', 100);
            await enemyHit(0.7, false, true);
            if (player.hp > 0) await heroFx('soft', resist ? 3 : 6, resist ? 2 : 3, 'Your DEF drops!');
          } else if (step === 4) {
            b.charged = true;
            SFX.charge();
            await msg('SANDRA aims her speakers. A shrill whine...', 900);
          } else {
            await msg('SANDRA hurls a wave of noise!', 100);
            await enemyHit(1.2, false, true);
          }
        } else if (b.turn % 4 === 1) {
          await msg('SANDRA swings her mic stand!', 100);
          await enemyHit(1);
        } else if (b.turn % 4 === 2) {
          await msg('SIGNAL PULSE!', 100);
          await enemyHit(1.1, false, true);
        } else if (b.turn % 4 === 3) {
          await msg('SANDRA adjusts her antenna and watches you.', 700);
        } else {
          await msg('Her speakers crackle! STATIC BURST!', 100);
          await enemyHit(1.2, true);
        }
      },
      defeated: '"...Okay. Signal lost." Her rig sputters out.',
      flag: 'sandraBeaten',
      after: () => sandraHandover(),
    },
  };
  const WEAPONS = {
    none: { name: 'STICK', atk: 0, desc: 'Better than nothing.' },
    iron: { name: 'IRON SWORD', atk: 3, desc: 'Sturdy and sharp. Good against anything.' },
    crystal: { name: 'CRYSTAL SWD', atk: 7, desc: 'Very sharp. The best blade around.' },
    axe: { name: 'HEAVY AXE', atk: 2, heavy: true, swing: 'You swing your axe!', desc: 'Smashes through armour. Clumsy otherwise.' },
    bat: { name: "MARCUS' BAT", atk: 9, swing: 'You swing the bat!', desc: 'Heavy, battered and surprisingly effective.' },
    wrench: {
      name: 'HVY WRENCH', full: 'HEAVY WRENCH', atk: 8, heavy: true, swing: 'You swing the wrench!',
      smash: 'The wrench cracks right through its armour!', desc: 'Hits hard. Cracks scrap armour.',
    },
    blade: { name: 'Q. BLADE', full: 'QUICK BLADE', atk: 7, nimble: true, keen: true, swing: 'You flick the quick blade!', desc: 'More crits. Quick foes never go first.' },
    sblade: {
      name: 'SIG. BLADE', full: 'SIGNAL BLADE', atk: 7, tuned: 1.25, swing: 'You swing the signal blade!',
      hum: 'The SIGNAL BLADE hums and cuts deep!', desc: 'Cuts deeper into anything driven by SIGNAL.',
    },
  };
  const ARMORS = {
    none: { name: 'TUNIC', def: 0, desc: 'Plain cloth.' },
    vest: { name: 'TOUGH VEST', def: 2, desc: 'Padded leather. Solid protection.' },
    light: { name: 'LIGHT VEST', def: 1, nimble: true, desc: 'Quick enemies cannot strike you first.' },
    sneakers: { name: 'SNEAKERS', def: 3, nimble: true, desc: 'Fresh kicks. Quick foes never strike first.' },
    rvest: { name: 'REINF. VEST', def: 4, desc: 'Steel plates sewn in. Very solid.' },
    insulated: { name: 'INSUL VEST', full: 'INSULATED VEST', def: 3, insulated: 0.4, desc: 'Rubber-lined. Softens electric shocks.' },
    factory: { name: 'FACT ARMOR', full: 'FACTORY ARMOR', def: 6, desc: 'Thick steel plates. No help with shocks.' },
    padded: { name: 'PADDED JKT', full: 'PADDED JACKET', def: 5, padded: 0.3, desc: 'Thick and puffy. Softens big hits.' },
    // (worn in place of armour: Michael's Quest has no slot for anything else)
    phones: { name: 'HEADPHONES', def: 2, resist: 0.35, desc: 'Blocks out the SIGNAL. Weakens its tricks.' },
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
  //              shade: 0..1 darkens the ground (not the people, things or monsters on it) by that much
  //   onEnter()  called each time the hero walks in (before the game saves itself), e.g. to note a place as found
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
    // The west gate (opened by the Blue Key) leads to Ammerud. Still closed: the caved-in end of the tunnel.
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
        '0,9': { map: 'ammerud', x: 28, y: 10, dir: 'left' }, // the west gate; shut until the Blue Key opens it
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
  // ---- Chapter 3: Ammerud. Blocks to the north, the little square with the kiosk in the middle, the
  // basketball court to the south-west and the park to the south-east. The dark path leaves to the west;
  // the south gate is the road to Grorud.
  MAPS.ammerud = {
    name: 'AMMERUD',
    rows: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'T.,..T......;.......T.....,..T',
      'T.777777..777777..777777..T..T',
      'T.888888..888888..888888.....T',
      'T.889888..888988..888898..;..T',
      'T...=........=........=......T',
      'T..========================..T',
      'T.......=.lpp777pppl..T...;..T',
      'T.......=.pppv9vpppp.........T',
      '==========pppppppppp........ST',
      'TS........pppppppppp==========',
      'T.,.......pnpppppppp..;......T',
      'T......=..lppppppppl.T.......T',
      'Tffffffaffffff.=.hhh.hhhhhhhhT',
      'Tfaaaaajaaaaaf.=........,..T.T',
      'TfaZaaajaaaZaf.=......~~~~.T.T',
      'Tf5ZaaayaaaZ6f.=...,..~~~~...T',
      'TfaZaaajaaaZaf.=.T....~~~....T',
      'Tfaaaaajaaaaaf.=.;.....T.....T',
      'Tfffffffffffff.=...T.....T...T',
      'T.,...;........=.....,....;..T',
      'TTTTTTTTTTTTTT#G#TTTTTTTTTTTTT',
    ],
    exits: {
      '29,10': { map: 'stovner', x: 1, y: 9, dir: 'right' },
      '0,9': { map: 'darkPath', x: 14, y: 10, dir: 'left' },
      '15,21': { map: 'grorudHeights', x: 15, y: 3, dir: 'down' }, // the south gate; shut until SELMA has it unlocked
    },
    signs: {
      '28,9': ['WELCOME TO AMMERUD.', 'EAST: STOVNER.'],
      '1,10': ['WEST: THE DARK PATH.', 'Somebody has scratched underneath: NOT AFTER DARK.'],
    },
    // The square, the court, the paths and the way in are safe; the lawns by the blocks and the park are not.
    encounter: {
      chance: 0.1, minSteps: 4, scaleFrom: 11,
      zones: [
        { at: [1, 1, 28, 5], table: [['crawler', 0.45], ['brute', 0.3], ['shadow', 0.25]] }, // around the blocks
        { at: [17, 14, 28, 20], table: [['shadow', 0.45], ['crawler', 0.35], ['brute', 0.2]] }, // the park
      ],
    },
    backdrop: 'blocks',
    ambient: { ripples: true, butterflies: [[392, 280, 14, 0.7]] },
  };
  // The dark path west of Ammerud: pines, a black pond, and something glowing.
  MAPS.darkPath = {
    name: 'DARK PATH',
    rows: [
      'PPPPPPPPPPPPPPPP',
      'PPPPPPPPPPPPPPPP',
      'PPPPPPPPPgggPPPP',
      'PPPPPPPPgg=gPPPP',
      'PPPgggPPPg=gPPPP',
      'PPgggggPPg=ggPPP',
      'PPgg~~ggPg=gPPPP',
      'PPg~~~gg===gPPPP',
      'PPgg~gggPPg=gPPP',
      'PPPggmgPPgg=gPPP',
      'PPPPggPPPg======',
      'PPPPPPPPgg=gPPPP',
      'PPPPPPPgg=ggPPPP',
      'PPPPPPPg==gPPPPP',
      'PPPPPPPgggmPPPPP',
      'PPPPPPPPPPPPPPPP',
    ],
    exits: { '15,10': { map: 'ammerud', x: 1, y: 9, dir: 'right' } },
    signs: {},
    encounter: {
      chance: 0.1, minSteps: 4, scaleFrom: 11,
      zones: [
        { at: [8, 2, 12, 6], table: [['wisp', 0.5], ['shadow', 0.25], ['crawler', 0.25]] }, // up the path
        { at: [2, 4, 7, 9], table: [['wisp', 0.6], ['shadow', 0.4]] }, // the clearing by the pond
        { at: [7, 11, 11, 14], table: [['wisp', 0.5], ['crawler', 0.5]] }, // the hollow to the south
      ],
    },
    backdrop: 'woods',
    lighting: { dimEdges: 0.45, shade: 0.35 },
  };
  // ---- Chapter 4: Grorud. Through Ammerud's south gate onto the green heights, down a ledge into the
  // town, and from the town into the old factory, once the power is back. The east gate of the town is
  // the road to Veitvet, which ends at a barricade: Veitvet itself is not built yet.
  MAPS.grorudHeights = {
    name: 'GRORUD HEIGHTS',
    rows: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTT#N#TTTTTTTTTTTTT', // Ammerud's south wall, seen from this side
      'T....,..~......=.......T.....T',
      'T.T.....~......=..........,..T',
      'T......~~...;..=S....rr......T',
      'T.rr...~.......=....r..r.....T',
      'T..r..~~.......=======.......T',
      'T..r..~......T.......=...;...T',
      'Trrr.~~..,...........=.......T',
      'T....~.......;.......=....T..T',
      'T.T.~~...............=.......T',
      'T.,.~.....T.....,....=....,..T',
      'T^^.^^^^^^^^^^^^^^^^^=^^^^^^^T',
      'T....................=.......T',
      'T..;.....,...=========...TTT.T',
      'T.T..........=.............T.T',
      'T.....;......=.....,....T..T.T',
      'T..,.........=.............T.T',
      'T......T.....=....T........TTT',
      'T............===.............T',
      'TTTTTTTTTTTTTT==TTTTTTTTTTTTTT',
    ],
    exits: {
      '15,2': { map: 'ammerud', x: 15, y: 20, dir: 'up' },
      '14,20': { map: 'grorudTown', x: 12, y: 3, dir: 'down' },
      '15,20': { map: 'grorudTown', x: 13, y: 3, dir: 'down' },
    },
    signs: { '16,4': ['GRORUD HEIGHTS.', 'NORTH: AMMERUD. SOUTH: GRORUD.'] },
    // The path, the middle of the heights and the ways in are safe.
    encounter: {
      chance: 0.1, minSteps: 4, scaleFrom: 12,
      zones: [
        { at: [1, 2, 7, 11], table: [['rust', 0.5], ['crawler', 0.25], ['guard', 0.25]] }, // west of the stream
        { at: [22, 2, 28, 11], table: [['guard', 0.45], ['rust', 0.4], ['scrap', 0.15]] }, // the east plateau
        { at: [1, 13, 11, 18], table: [['rust', 0.55], ['guard', 0.3], ['shadow', 0.15]] }, // below the ledge, west
        { at: [18, 15, 26, 18], table: [['guard', 0.4], ['rust', 0.35], ['scrap', 0.25]] }, // below the ledge, east
      ],
    },
    backdrop: 'heights',
    ambient: { butterflies: [[280, 232, 14, 0.9], [96, 280, 15, 2.4]] },
  };
  MAPS.grorudTown = {
    name: 'GRORUD',
    rows: [
      'TTTTTTTTTTTTTTTTT<<<<<<<<T',
      'T^^^7777^^^^>>^^^<<<<<<<<T',
      'h...&$&&....==...|||[||||h',
      'h....=.....lppl.S.+.p....h',
      'h..pppppppppppppppppppp..h',
      'h..p........pp........p.Th',
      'h..p777.pppppppppp....p..h',
      'h.,p&$&.lppppppppl....p..#',
      'h..p....pppp*ppppp....pS.#',
      'h..p....pppppppppppppppppG',
      'h..p.;..lppppppppl....p..#',
      'h..p........pp........p..#',
      'h..pppppppppppppppppppp..h',
      'h..T......,.....fffff.fffh',
      'h.,......T......f..x...%.h',
      'h..T............f.%....b.h',
      'h.....;.........f....x...h',
      'hhhhhhhhhhhhhhhhhhhhhhhhhh',
    ],
    exits: {
      '12,2': { map: 'grorudHeights', x: 14, y: 19, dir: 'up' },
      '13,2': { map: 'grorudHeights', x: 15, y: 19, dir: 'up' },
      '20,2': { map: 'grorudWorks', x: 12, y: 16, dir: 'up' }, // the Works gate; shut until the power is back
      '25,9': { map: 'veitvetRoad', x: 1, y: 5, dir: 'right' }, // the east gate; locked until the FACTORY KEY opens it
    },
    signs: {
      '16,3': ['WELCOME TO GRORUD.', 'NORTH-EAST: OLD GRORUD WORKS. EAST: ROAD TO VEITVET.'],
      '23,8': ['EAST: ROAD TO VEITVET.'],
      '18,3': () => terminalSign(),
      '12,8': () => savePoint(),
    },
    // The square and the streets are safe; the lawn to the south-west and JOAN's yard are not.
    encounter: {
      chance: 0.1, minSteps: 4, scaleFrom: 12,
      zones: [
        { at: [1, 13, 15, 16], table: [['rust', 0.5], ['guard', 0.5]] }, // the lawn
        { at: [17, 14, 24, 16], table: [['scrap', 0.55], ['pwisp', 0.25], ['guard', 0.2]] }, // JOAN's yard
      ],
    },
    backdrop: 'blocks',
  };
  MAPS.grorudWorks = {
    name: 'OLD GRORUD WORKS',
    rows: [
      '{{{{{{{{{{{{{{{{{{{{{{{{',
      '{{{{{{{{!------!{{{{{{{{',
      '{{{{{{{{{------{{{{{{{{{',
      '{{{{{{{{{------{{{{{{{{{',
      '{{{{{{{{!------!{{{{{{{{',
      '{{{{{{{{{{{{({{{{{{{{{{{',
      '{-----------:----------{',
      '{-}------------}-------{',
      '{-----------------{{-{{{',
      '{-}}--}}--}}--}}-{-----{',
      '{----------------{--!--{',
      '{-}}--}}--}}--}}-{-----{',
      '{----------------{-----{',
      '{{{{-{{{{------{{{{{{{{{',
      '{-*----{{------{{{{{{{{{',
      '{--------------{{{{{{{{{',
      '{}-----{{---:--{{{{{{{{{',
      '{{{{{{{{{{{{]{{{{{{{{{{{',
    ],
    exits: { '12,17': { map: 'grorudTown', x: 20, y: 3, dir: 'down' } },
    signs: { '2,14': () => savePoint() },
    // The way in, the control room and NABILAH's hall are safe.
    encounter: {
      chance: 0.1, minSteps: 4, scaleFrom: 12,
      zones: [
        { at: [1, 6, 22, 7], table: [['sentinel', 0.45], ['pwisp', 0.35], ['scrap', 0.2]] }, // the long corridor
        { at: [1, 8, 16, 12], table: [['pwisp', 0.45], ['scrap', 0.3], ['sentinel', 0.25]] }, // the factory floor
        { at: [18, 8, 22, 12], table: [['pwisp', 0.5], ['scrap', 0.3], ['rust', 0.2]] }, // the side room
      ],
    },
    backdrop: 'factory',
    lighting: { dimEdges: 0.35 },
  };
  // Where the east gate of Grorud leads: a stretch of country road that turns into Veitvet's first street.
  MAPS.veitvetRoad = {
    name: 'ROAD TO VEITVET',
    rows: [
      'TTTTTTTTTTTT7777',
      'T...,....T..8888',
      'T.T.....;...8988',
      'T.....T.....hhhh',
      'T..;........Sppl',
      '============pppp',
      'T.......,...lpph',
      'T.T.......T.hhhh',
      'T....;......hhhh',
      'TTTTTTTTTTTThhhh',
    ],
    exits: {
      '0,5': { map: 'grorudTown', x: 24, y: 9, dir: 'left' },
      '15,5': { map: 'veitvet', x: 1, y: 10, dir: 'right' },
    },
    signs: { '12,4': ['ROAD TO VEITVET.', 'EAST: VEITVET. WEST: GRORUD.'] },
    encounter: null,
    backdrop: 'heights',
  };
  // ---- Chapter 5: Veitvet. Blocks, a playground and the old shopping centre; under the town, the closed
  // station where the SIGNAL DEVICE hums. Shutting it down opens the centre, where SANDRA waits on the stage.
  // East of town the road to Oslo S begins, and ends at a barricade: Oslo S is not built yet.
  MAPS.veitvet = {
    name: 'VEITVET',
    rows: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'T7777777T7777777TAAAAAAAAAAT',
      'T8889888T8898888TÆÆÆÆÆÆÆÆÆÆT',
      'T8888888T8888888hÆÆÆÆÅÆÆÆÆÆT',
      'T...=......=....hpppppppppS#',
      'T.;.=...n..=..l.hppppppplpp#',
      'Tpppppppppppppppppppppppppp#',
      'T..p......pppppppp.........#',
      'T..p.....lpppØppppl...;....#',
      'T..p......pppppppp.........#',
      'pppppppppppppppppppppppppppG',
      'T.,p......pppppppp.....,...#',
      'Thhphhhhhhhhh=hhhhhh.hhhhhh#',
      'Tf.p.f.......=n.......h....#',
      'Tfæp.f......h=h...;...h.T..#',
      'Tf..........h=h.T.....h....#',
      'Tf.æ0f..;...h=S.......h.T..#',
      'Tffffff.....hø.,..T...h...;#',
      'T.;.....T...hhh.......,....#',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    exits: {
      '0,10': { map: 'veitvetRoad', x: 14, y: 5, dir: 'left' },
      '21,3': { map: 'veitvetCenter', x: 11, y: 14, dir: 'up' }, // the centre's doors; shut until the device is off
      '13,17': { map: 'veitvetUnder', x: 2, y: 15, dir: 'up' }, // the stairs down to the old station
      '27,10': { map: 'osloRoad', x: 1, y: 5, dir: 'right' }, // the east gate; MINA has it opened when the chapter ends
    },
    signs: {
      '26,4': ['VEITVET CENTER.', 'SHOPS - CAFE - STAGE.'],
      '14,16': ['VEITVET STATION. OUT OF SERVICE.', 'Somebody has scratched underneath: IT HUMS AT NIGHT.'],
      '13,8': () => savePoint(PILLAR),
    },
    // The streets, the square, the playground and every way in are safe; the lawn to the south-east is not.
    encounter: {
      chance: 0.1, minSteps: 4, scaleFrom: 13,
      zones: [{ at: [17, 14, 26, 18], table: [['bot', 0.45], ['hound', 0.35], ['vguard', 0.2]] }],
    },
    backdrop: 'veitvet',
    ambient: { butterflies: [[56, 232, 14, 1.3]] },
  };
  MAPS.veitvetUnder = {
    name: 'VEITVET UNDERGROUND',
    rows: [
      'ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ',
      'ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ',
      'ÄÄÄÄÄÄääÄÄÄŸÜŸÄÄÄÄÄÄÄÄÄÄÄÄ',
      'ÄÄÄÄÄÄääÄÄÄäääÄÄÄÄÄää§ääÄÄ',
      'ÄÄÄÄÄÄääÄÄÄÄßÄÄÄÄÄÄäääääÄÄ',
      'ÄÄÄÄÄÄääÄÄÄÄäÄÄÄÄÄÄäääääÄÄ',
      'ÄÄÄÄÄÄäÄÄÄÄÄäÄÄÄÄÄÄÄÄäÄÄÄÄ',
      'ÄääääääääääääääääääääääääÄ',
      'ÄööööööööööööööööööööööööÄ',
      'ÄööööööööööööööööööööööööÄ',
      'ÄääääääääääääääääääääääääÄ',
      'ÄÄÄäÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄäÄÄÄÄ',
      'ÄÄÄäÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄäÄÄÄÄ',
      'ÄäääääÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄääääÄ',
      'ÄäÐäääÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄäÄÄ',
      'ÄäääääÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄäÄÄ',
      'ÄÄþÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄäääÄ',
      'ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ',
    ],
    exits: { '2,16': { map: 'veitvet', x: 13, y: 16, dir: 'up' } },
    signs: {
      '2,14': () => savePoint(PILLAR),
      '12,2': () => deviceSign(),
      '21,3': () => breakerSign(),
    },
    // The way in, the device's chamber, the breaker room and NOAH's corner are safe; the tunnel is not.
    encounter: {
      chance: 0.11, minSteps: 4, scaleFrom: 13,
      zones: [
        { at: [1, 7, 11, 10], table: [['bot', 0.4], ['hound', 0.35], ['swisp', 0.25]] }, // the tunnel, west
        { at: [13, 7, 24, 10], table: [['swisp', 0.35], ['ugolem', 0.35], ['hound', 0.3]] }, // the tunnel, east
        { at: [21, 11, 24, 13], table: [['ugolem', 0.5], ['swisp', 0.5]] }, // the side tunnel
      ],
    },
    backdrop: 'underground',
    lighting: { dimEdges: 0.45 },
    onEnter: () => { flags.underSeen = true; },
  };
  MAPS.veitvetCenter = {
    name: 'VEITVET CENTER',
    rows: [
      'ÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈ',
      'ÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈÈ',
      'ÈÈÈÈÈÈÈÑÒÍÍÍÒÑÈÈÈÈÈÈÈÈ',
      'ÈÈÈÈÈÈÈÑÍÍÍÍÍÑÈÈÈÈÈÈÈÈ',
      'ÈÈÈÈÈÈÈÌÍÍÍÍÍÌÈÈÈÈÈÈÈÈ',
      'ÈÊÊÊÈÈÈÌÌËËËÌÌÈÈÈÊÊÊÊÈ',
      'ÈËËËÊÈËËËËËËËËËËÈËËËËÈ',
      'ÈËËËËËËËÌËËËËÌËËËËËËËÈ',
      'ÈËËËÊÈËËËËËËËËËËÈÊÊÊËÈ',
      'ÈÈÈÈÈÈËËËËÌËËËËËÈÈÈÈËÈ',
      'ÈÊÊÊÊÈËËÌËËËËÌËËÊÊÊÊËÈ',
      'ÈËËËËËËËËËËËËËËËËËËËËÈ',
      'ÈÊÊÊÊÈËËËËËËËËËËÈÊÊÊÊÈ',
      'ÈÈÈÈÈÈËËÌËËËËÌËËÈÈÈÈÈÈ',
      'ÈÈÈÈÈÈËËËËËËËËËËÈÈÈÈÈÈ',
      'ÈÈÈÈÈÈÈÈÈÈÈåÈÈÈÈÈÈÈÈÈÈ',
    ],
    exits: { '11,15': { map: 'veitvet', x: 21, y: 4, dir: 'down' } },
    signs: {},
    // The lobby, the cross corridor, the shops and SANDRA's stage are safe; the hall and the east wing are not.
    encounter: {
      chance: 0.1, minSteps: 4, scaleFrom: 13,
      zones: [
        { at: [6, 6, 15, 10], table: [['vguard', 0.45], ['swisp', 0.3], ['hound', 0.25]] }, // the hall
        { at: [17, 6, 20, 10], table: [['vguard', 0.5], ['hound', 0.5]] }, // the east wing
      ],
    },
    backdrop: 'center',
  };
  // Where Veitvet's east gate leads: the road toward the city, and a barricade. To be continued...
  MAPS.osloRoad = {
    name: 'ROAD TO OSLO S',
    rows: [
      'TTTTTTTTTTTTTTTT',
      'T7777..T...7777T',
      'T8988......8898T',
      'T....;..,......T',
      'T.l.......l..S.T',
      'ppppppppppppppJT',
      'T.l.......l....T',
      'T...,..T...;...T',
      'T.T.........T..T',
      'TTTTTTTTTTTTTTTT',
    ],
    exits: { '0,5': { map: 'veitvet', x: 26, y: 10, dir: 'left' } },
    signs: {
      '13,4': ['ROAD TO OSLO S.', 'CITY CENTRE: STRAIGHT AHEAD.'],
      '14,5': ['The road to OSLO S is closed off for now.', 'TO BE CONTINUED...'],
    },
    encounter: null,
    backdrop: 'veitvet',
  };
  // A power post (or, in Veitvet, an info pillar): rest in its glow (HP back to full, herbs not) and save.
  const PILLAR = 'A glowing info pillar. Its screen says: REST HERE. You sit down for a moment.';
  function savePoint(line = 'A humming power post. You rest a moment in its warm glow.') {
    player.hp = player.maxhp;
    SFX.heal();
    const ok = saveGame();
    say('', [line, ok ? 'HP restored. Game saved!' : 'HP restored. (The game could not be saved!)']);
  }
  // The breaker in the side room under Veitvet feeds the shield around the SIGNAL DEVICE. Pulling it, once,
  // takes the shield down for good. It can be pulled before anybody has asked, or before the device is found.
  function breakerSign() {
    if (flags.shieldOff) { say('', ['The lever is down. Somewhere to the west, the shield stays dark.']); return; }
    say('', ['A big breaker box, humming. Thick cables run from it, west along the tunnel.', 'You heave the lever down...'], () => {
      flags.shieldOff = true;
      SFX.cut();
      saveGame();
      say('', ['CLUNK! Far to the west, a crackling sound dies away.']);
    });
  }
  // The SIGNAL DEVICE itself, behind the shield: shutting it down, exactly once, opens VEITVET CENTER.
  function deviceSign() {
    if (flags.signalOff) { say('', ['The SIGNAL DEVICE is dead. Just a box of wires now.']); return; }
    say('', ['A cabinet of antennas and blinking lights: the SIGNAL DEVICE.', 'It buzzes right through your teeth.', 'You yank its cables out, one by one...'], () => {
      flags.signalOff = true;
      pulseT = 70;
      SFX.signalLost();
      saveGame();
      say('', ['SIGNAL LOST...'], () => say('', ['SOURCE MOVED.'], () => say(hero().name, [
        'Moved? Then this box was only passing the signal on...',
        'Far above, something heavy clicks open. VEITVET CENTER?',
      ])));
    });
  }
  // After the fight SANDRA hands over the fragment, exactly once. This runs by itself when the won battle ends,
  // and again from SANDRA if the game was closed before it finished.
  function sandraHandover() {
    const H = hero().name;
    say('SANDRA', ['Fine. FINE. My show is over.'], () => say(H, ['NABILAH said the trail led to VEITVET. Why the signal?'],
      () => say('SANDRA', [
        'I was only LISTENING. Something started singing, so I turned it up.',
        'Take it. It has been humming in my rig for weeks.',
        '(Got CRYSTAL FRAGMENT 4!)',
      ], () => {
        flags.fragment4 = true;
        markReady('signal');
        SFX.quest();
        saveGame();
        say('', ['THE FOUR FRAGMENTS BEGIN TO GLOW...', 'THE CRYSTAL IS REACTING TO SOMETHING IN CENTRAL OSLO.'], () => say('SANDRA', ['Central OSLO. OSLO S, if you ask me.', 'Go and tell MINA. She worries.']));
      })));
  }
  function terminalSign() {
    if (flags.worksOpen) say('', ['The terminal hums happily. Three POWER CELLS glow in their slots.']);
    else if (cells() === 3) say('', ['Three empty slots, and you carry three POWER CELLS.', 'TOBIAS knows how to hook them up.']);
    else say('', ['A dead power terminal with three empty slots.', 'A label says: OLD GRORUD WORKS. NO POWER, NO GATE.']);
  }
  // TOBIAS hooks up the three cells, exactly once: the lights come on and the Works gate slides open.
  function powerOn(then) {
    say('TOBIAS', ['Three POWER CELLS! Hand them over. Red to red, blue to blue...', 'Stand back!'], () => {
      if (!flags.worksOpen) flags.worksOpen = true;
      powerT = 60;
      SFX.power();
      saveGame();
      say('', ['ZZZT... CLUNK! The terminal lights up.', 'With a deep hum, the gate of OLD GRORUD WORKS slides open!'], () => say('TOBIAS', [
        'We have POWER! Look at that!',
        'NABILAH is somewhere deep inside the WORKS. She loves her machines more than visitors.',
        'Be careful in there.',
      ]));
    });
  }
  // After the fight NABILAH hands over the fragment and the key, exactly once. This runs by itself when the
  // won battle ends, and again from NABILAH if the game was closed before it finished.
  function nabilahHandover() {
    const H = hero().name;
    say('NABILAH', ['Okay, okay! You win. My poor machines needed a rest anyway.'], () => say(H, ['MARCUS said GRORUD had answers about the Crystal.'],
      () => say('NABILAH', [
        'Answers? I only have this. It ran my whole factory, once. Then it went quiet.',
        'Whatever broke the Crystal, the trail leads east, to VEITVET.',
        'Take the fragment, and my FACTORY KEY. It opens the east gate of GRORUD.',
        '(Got CRYSTAL FRAGMENT 3 and the FACTORY KEY!)',
      ], () => {
        flags.fragment3 = true; flags.factoryKey = true;
        markReady('power');
        SFX.quest();
        saveGame();
      })));
  }
  // After the fight MARCUS hands over his bat, exactly once, and sends the hero on to Grorud. This runs by
  // itself when the won battle ends, and again from MARCUS if the game was closed before it finished.
  function marcusHandover() {
    const H = hero().name;
    say('MARCUS', ['Okay. You hit harder than you look.'], () => say(H, ['MOHSIN said you would know why the Crystal was broken.'],
      () => say('MARCUS', [
        'MOHSIN talks too much.',
        'The answer is not in AMMERUD. Go south, to GRORUD. Ask there.',
        'And take this. You earned it.',
        "(Got MARCUS' BAT! ATK +9!)",
      ], () => {
        if (!flags.marcusBat) {
          flags.marcusBat = true;
          own('weapon', 'bat');
          player.weapon = 'bat';
        }
        markReady('trouble');
        SFX.quest();
        saveGame();
      })));
  }
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
    // ---- Ammerud (a quest item may have its own `spr`; a chest may hold `gold`, or a bigger herb `pouch`)
    { id: 'ball', map: 'ammerud', x: 27, y: 19, quest: 'ball', spr: BALL_SPR, found: ['A basketball, stuck under a bush. EMIL is written on it in marker.', 'Take it back to EMIL!'] },
    { id: 'chestGold', map: 'ammerud', x: 27, y: 3, chest: true, gold: 80 },
    { id: 'chestPouch', map: 'darkPath', x: 8, y: 14, chest: true, pouch: true },
    // ---- Grorud (a `cell` is a POWER CELL; an item marked `always` lies there before its quest is given,
    // and says its `early` lines if it is found then)
    { id: 'cell1', map: 'grorudHeights', x: 2, y: 7, cell: true },
    {
      id: 'bag', map: 'grorudHeights', x: 5, y: 17, quest: 'bag', always: true, spr: BAG_SPR,
      found: ['A pink handbag with a little bee on it. HONEY is stitched inside.', 'Take it back to HONEY!'],
      early: ['A pink handbag with a little bee on it. HONEY is stitched inside.', 'Somebody in GRORUD must be missing this.'],
    },
    { id: 'chestWrench', map: 'grorudHeights', x: 28, y: 17, chest: true, weapon: 'wrench' },
    { id: 'chestBlade', map: 'grorudTown', x: 1, y: 16, chest: true, weapon: 'blade' },
    { id: 'chestArmor', map: 'grorudWorks', x: 22, y: 11, chest: true, armor: 'factory' },
    // ---- Veitvet
    {
      id: 'phone', map: 'veitvet', x: 26, y: 13, quest: 'phone', always: true, spr: PHONE_SPR,
      found: ['A phone with a heart sticker. ELIAS is on the lock screen.', 'Take it back to ELIAS!'],
      early: ['A phone with a heart sticker. ELIAS is on the lock screen.', 'Somebody in VEITVET must be missing this.'],
    },
    { id: 'chestVeitvet', map: 'veitvet', x: 1, y: 18, chest: true, gold: 90 },
    { id: 'chestSblade', map: 'veitvetUnder', x: 22, y: 16, chest: true, weapon: 'sblade' },
    { id: 'chestPadded', map: 'veitvetCenter', x: 1, y: 6, chest: true, armor: 'padded' },
    { id: 'chestCenter', map: 'veitvetCenter', x: 19, y: 6, chest: true, gold: 120 },
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
    { // Stovner's west gate, toward Ammerud. The Blue Key unlocks it; the open gate is the town's west exit.
      map: 'stovner', x: 0, y: 9, closed: 'G', open: 'L', flag: 'blueGate',
      needs: () => flags.blueKey,
      locked: ['The west gate is shut tight.'],
      opened: ['The BLUE KEY turns in the west gate. The road to AMMERUD is open!'],
      sfx: 'pickup',
    },
    { // Ammerud's south gate, toward Grorud. SELMA has it unlocked (the grorudGate flag) when the chapter
      // ends; the open gate is the town's south exit.
      map: 'ammerud', x: 15, y: 21, closed: 'G', open: 'L', flag: 'grorudGate',
      needs: () => false,
      locked: ['A gate in the south wall. A rusty sign on it says GRORUD.', 'It is locked.'],
      opened: [],
    },
    // The gate of OLD GRORUD WORKS, and the terminal beside it. Nobody opens these by hand: they come on
    // together (the worksOpen flag) when TOBIAS hooks up the three POWER CELLS.
    {
      map: 'grorudTown', x: 20, y: 2, closed: '[', open: ']', flag: 'worksOpen',
      needs: () => false,
      locked: () => (q.power.s === 0
        ? ['A huge steel gate: OLD GRORUD WORKS.', 'It is shut tight. The power is off.']
        : ['The gate is dead without power.', `TOBIAS needs three POWER CELLS. You have ${cells()}.`]),
      opened: [],
    },
    { map: 'grorudTown', x: 18, y: 3, closed: '+', open: '@', flag: 'worksOpen', needs: () => false, locked: [], opened: [] },
    { // Grorud's east gate, the road to Veitvet. NABILAH's FACTORY KEY opens it, once TOBIAS has heard the news.
      map: 'grorudTown', x: 25, y: 9, closed: 'G', open: 'L', flag: 'veitvetGate',
      needs: () => flags.factoryKey === true && q.power.s === 3,
      locked: () => (!flags.factoryKey
        ? ['A gate in the east wall. A sign on it says: ROAD TO VEITVET.', 'It is locked. The lock is big and greasy.']
        : ['The FACTORY KEY fits! But TOBIAS will want to hear about NABILAH first.']),
      opened: ['The FACTORY KEY turns with a screech. The ROAD TO VEITVET is open!'],
      sfx: 'pickup',
    },
    // Veitvet. VEITVET CENTER's doors, the SIGNAL DEVICE and its two relays all change together (the signalOff
    // flag) when the hero shuts the device down; the shield and its breaker together (shieldOff) when the hero
    // pulls the breaker; SANDRA's masts (sandraBeaten) when she is beaten. Nobody opens these by hand.
    {
      map: 'veitvet', x: 21, y: 3, closed: 'Å', open: 'å', flag: 'signalOff',
      needs: () => false,
      locked: () => (flags.underSeen
        ? ['The shutters of VEITVET CENTER are down. Something buzzes behind them.', 'It hums in time with the tunnel below.']
        : ['The shutters of VEITVET CENTER are down. Something buzzes behind them.']),
      opened: [],
    },
    { map: 'veitvetUnder', x: 12, y: 2, closed: 'Ü', open: 'ü', flag: 'signalOff', needs: () => false, locked: [], opened: [] },
    ...[11, 13].map((x) => ({
      map: 'veitvetUnder', x, y: 2, closed: 'Ÿ', open: 'ÿ', flag: 'signalOff', needs: () => false,
      locked: ['A relay antenna, buzzing with SIGNAL. It is wired to the cabinet beside it.'], opened: [],
    })),
    {
      map: 'veitvetUnder', x: 12, y: 4, closed: 'ß', open: 'ä', flag: 'shieldOff', needs: () => false,
      locked: () => { // (finding it moves the quest log on, so it is saved at once)
        if (!flags.deviceSeen) { flags.deviceSeen = true; saveGame(); }
        return ['A crackling shield of SIGNAL blocks the way. Something blinks behind it.', 'Thick cables run from the shield, east along the tunnel.'];
      },
      opened: [],
    },
    { map: 'veitvetUnder', x: 21, y: 3, closed: '§', open: '¶', flag: 'shieldOff', needs: () => false, locked: [], opened: [] },
    ...[8, 12].map((x) => ({
      map: 'veitvetCenter', x, y: 2, closed: 'Ò', open: 'ò', flag: 'sandraBeaten', needs: () => false,
      locked: ["One of SANDRA's signal masts. It buzzes like an angry wasp."], opened: [],
    })),
    { // Veitvet's east gate, the road to Oslo S. MINA has it opened (the osloGate flag) when the chapter ends.
      map: 'veitvet', x: 27, y: 10, closed: 'G', open: 'L', flag: 'osloGate',
      needs: () => false,
      locked: ['A gate in the east wall. A sign on it says: OSLO S.', 'It is locked.'],
      opened: [],
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
    // ---- Ammerud. SELMA's hunt brings out MARCUS and ends the chapter; EMIL's ball and ASTRID's path
    // stand apart. (The hunt's counts: c crawlers, r shadow rats, b brutes; see HUNT.)
    trouble: {
      title: 'AMMERUD TROUBLE', turnIn: 'SELMA', state: { c: 0, r: 0, b: 0 },
      tracker: () => (huntDone() ? 'MARCUS: COURT' : huntLine()), progress: () => (huntDone() ? 'AT THE COURT' : huntLine()),
    },
    ball: { title: 'LOST BASKETBALL', turnIn: 'EMIL', tracker: () => 'FIND THE BALL', progress: () => 'IN THE PARK' },
    wisp: { title: 'THE DARK PATH', turnIn: 'ASTRID', tracker: () => 'THE DARK PATH', progress: () => 'WEST OF TOWN' },
    // ---- Grorud. TOBIAS's three POWER CELLS open the Works, NABILAH waits inside, and turning in ends the
    // chapter. HONEY's bag and JOAN's yard stand apart (JOAN's reward is the third cell). The cells are
    // saved flags (cell1..cell3), so a cell can never be counted twice.
    power: {
      title: 'POWER TO GRORUD', turnIn: 'TOBIAS',
      tracker: () => (flags.worksOpen ? 'NABILAH: WORKS' : cells() === 3 ? 'CELLS TO TOBIAS' : `POWER CELLS ${cells()}/3`),
      progress: () => (flags.worksOpen ? 'IN THE WORKS' : cells() === 3 ? 'TO TOBIAS' : `${cells()}/3 CELLS`),
    },
    bag: { title: "HONEY'S BAG", turnIn: 'HONEY', tracker: () => 'FIND THE BAG', progress: () => 'ON THE HEIGHTS' },
    yard: {
      title: "JOAN'S YARD", turnIn: 'JOAN', state: { n: 0 },
      tracker: () => `GOLEMS ${q.yard.n}/${YARD_GOLEMS}`, progress: () => `${q.yard.n}/${YARD_GOLEMS} GOLEMS`,
    },
    // ---- Veitvet. MINA's signal leads down into the station, back up into the centre and to SANDRA, and turning
    // in ends the chapter. Every step is a saved flag (underSeen, deviceSeen, shieldOff, signalOff, sandraBeaten),
    // so the hero can find things in any order and the log always names the next thing to do.
    signal: {
      title: 'VEITVET SIGNAL', turnIn: 'MINA',
      tracker: () => (flags.signalOff ? 'SANDRA: CENTER' : flags.shieldOff ? 'SIGNAL DEVICE' : flags.deviceSeen ? 'FIND THE SWITCH' : flags.underSeen ? 'FIND THE SOURCE' : 'GO UNDERGROUND'),
      progress: () => (flags.signalOff ? 'IN THE CENTER' : flags.shieldOff ? 'SHUT IT DOWN' : flags.deviceSeen ? 'CUT ITS POWER' : flags.underSeen ? 'IN THE TUNNEL' : 'UNDER VEITVET'),
    },
    phone: { title: 'LOST PHONE', turnIn: 'ELIAS', tracker: () => 'FIND THE PHONE', progress: () => 'SOUTH-EAST' },
  };
  const YARD_GOLEMS = 2; // how many scrap golems JOAN's yard asks for
  const cells = () => ['cell1', 'cell2', 'cell3'].filter((k) => flags[k] === true).length;
  // What AMMERUD TROUBLE asks for: which enemy, which saved count, how many, and its name in messages.
  const HUNT = [
    { type: 'crawler', k: 'c', n: 3, name: 'CRAWLERS' },
    { type: 'shadow', k: 'r', n: 3, name: 'SHADOW RATS' },
    { type: 'brute', k: 'b', n: 2, name: 'BRUTES' },
  ];
  const huntDone = () => HUNT.every((h) => q.trouble[h.k] >= h.n);
  const huntLine = () => HUNT.map((h) => `${h.k.toUpperCase()}${Math.min(q.trouble[h.k], h.n)}/${h.n}`).join(' ');
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
    { name: 'AMMERUD', quest: 'trouble' },
    { name: 'GRORUD', quest: 'power' },
    { name: 'VEITVET', quest: 'signal' },
    { name: 'OSLO S', quest: null }, // unlocked by finishing Veitvet; nothing of it is built yet
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
  let powerT = 0; // frames left of the flicker when the power comes back on in Grorud (never saved)
  let pulseT = 0; // frames left of the pink pulse when the SIGNAL DEVICE is shut down in Veitvet (never saved)
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
    // ---- Ammerud
    {
      id: 'selma', map: 'ammerud', x: 25, y: 9, dir: 'down', home: 'down', spr: SPR.selma,
      news: () => q.trouble.s === 0 || q.trouble.s === 2,
      talk() {
        const N = 'SELMA', H = hero().name;
        if (q.trouble.s === 0) {
          say(N, ["New face. Through the STOVNER gate, too. You're looking for MARCUS?"], () => say(H, ['I am. MOHSIN sent me.'],
            () => say(N, [
              'Everyone is looking for MARCUS, until they actually find him.',
              'He runs AMMERUD, and he does not wait around for challengers.',
              'Cause enough trouble for his monsters and he will come to you.',
              'Beat 3 CONCRETE CRAWLERS, 3 SHADOW RATS and 2 BLOCK BRUTES. Then try the basketball court.',
            ], () => accept('trouble'))));
        } else if (q.trouble.s === 1 && !huntDone()) {
          say(N, [
            `So far: ${HUNT.map((h) => `${h.name} ${Math.min(q.trouble[h.k], h.n)}/${h.n}`).join(', ')}.`,
            'They hang around the blocks up north, and in the park.',
          ]);
        } else if (q.trouble.s === 1) {
          say(N, ['That was loud enough. MARCUS will have heard.', 'Go to the basketball court, south-west of the square.']);
        } else if (q.trouble.s === 2) {
          say(N, ['You beat MARCUS? On his own court?'], () => say(H, ['He said the answer is in GRORUD.'], () => say(N, [
            'Then AMMERUD owes you one. I will have the south gate unlocked.',
            'GRORUD is past it. Whatever you are looking for, I hope it is there.',
          ], () => {
            flags.grorudGate = true;
            complete('trouble');
            endChapter('trouble');
          })));
        } else {
          say(N, [pick([
            'The south gate is open. GRORUD is that way.',
            'Even the crawlers seem calmer now.',
            'MARCUS still plays every evening. He just loses more.',
          ])]);
        }
      },
    },
    {
      id: 'emil', map: 'ammerud', x: 8, y: 12, dir: 'down', home: 'down', spr: SPR.emil,
      news: () => q.ball.s === 0 || q.ball.s === 2,
      talk() {
        const N = 'EMIL';
        if (q.ball.s === 0) {
          say(N, [
            'My basketball is gone! One shot, it hit the rim, and it just... kept going.',
            'Over the fence and into the park. I am not going in there. There are RATS.',
            'Could you find it? Please?',
          ], () => accept('ball'));
        } else if (q.ball.s === 1) {
          say(N, ['It is orange, it is round, and it has my name on it. The park is past the hedge, east of here.']);
        } else if (q.ball.s === 2) {
          say(N, [
            'MY BALL! You found it!',
            "Here, take these. They were my big brother's. They make you SO fast. (Got AMMERUD SNEAKERS!)",
            'Put them on in the menu!',
          ], () => {
            own('armor', 'sneakers');
            complete('ball');
          });
        } else {
          say(N, [pick([
            'Watch this! ...okay, do not watch that one.',
            'One day I am going to beat MARCUS at one-on-one.',
            'Nice sneakers. They suit you.',
          ])]);
        }
      },
    },
    {
      id: 'astrid', map: 'ammerud', x: 6, y: 8, dir: 'down', home: 'down', spr: SPR.astrid,
      news: () => q.wisp.s === 0 || q.wisp.s === 2,
      talk() {
        const N = 'ASTRID';
        if (q.wisp.s === 0) {
          say(N, [
            'I have walked my dog on the path west of here every day for thirty years.',
            'Last night something was glowing out there. Blue, by the black pond. My dog will not go near it.',
            'Would you have a look? Carefully, dear.',
          ], () => accept('wisp'));
        } else if (q.wisp.s === 1) {
          say(N, ['The path starts just west of here. The light was by the pond, deep in the trees.']);
        } else if (q.wisp.s === 2) {
          say(N, [
            'You found the light? And it left this behind?',
            'A fragment, glowing like that... I have never seen the like. Keep it safe.',
            'Thank you, dear. Here, for your trouble. (Got 50 gold!)',
          ], () => {
            player.gold += 50;
            complete('wisp');
          });
        } else {
          say(N, [pick([
            'My dog walks the path again. Mostly.',
            'Keep that fragment safe. I have a feeling it matters.',
            'Thirty years, and I have never seen a light like that.',
          ])]);
        }
      },
    },
    {
      id: 'nadia', map: 'ammerud', x: 14, y: 9, dir: 'down', home: 'down', spr: SPR.nadia,
      talk() {
        const chat = flags.metNadia ? pick([
          'Back again? Have a look.',
          'Herbs, vests and gossip. Only two of those are for sale.',
        ]) : "Welcome to NADIA'S KIOSK! Herbs, snacks, and a vest or two.";
        say('NADIA', [chat], () => { flags.metNadia = true; openShop('nadia'); });
      },
    },
    {
      id: 'leif', map: 'ammerud', x: 12, y: 11, dir: 'left', home: 'left', spr: SPR.leif,
      talk() {
        const N = 'LEIF';
        if (flags.marcusBeaten) {
          say(N, [pick([
            'MARCUS lost? On his own court? I saw nothing. As usual.',
            'Forty years on this bench. Best seat in AMMERUD.',
          ])]);
        } else say(hero().name, ['Have you seen MARCUS?'], () => say(N, ['MARCUS?', 'Nope.', "I didn't see anything."]));
      },
    },
    { // he only turns up at the court once AMMERUD TROUBLE has made enough noise; beaten, he stays and talks
      id: 'marcus', map: 'ammerud', x: 7, y: 16, dir: 'down', home: 'down', spr: SPR.marcus,
      visible: () => flags.marcusBeaten === true || (q.trouble.s === 1 && huntDone()),
      talk() {
        const N = 'MARCUS', H = hero().name;
        if (!flags.marcusBeaten) {
          say(N, ["So you're the one causing trouble in AMMERUD."], () => say(H, ["I'm looking for MARCUS."],
            () => say(N, ['Then you found him.'], () => { encounter = { t: 0, type: 'marcus' }; SFX.encounter(); })));
        } else if (!flags.marcusBat) {
          marcusHandover();
        } else {
          say(N, [pick([
            'GRORUD is south, through the gate. Go on.',
            'Keep the bat. I have another one. Somewhere.',
            'Next time, I win.',
          ])]);
        }
      },
    },
    { // the light ASTRID saw, by the black pond; there only while THE DARK PATH is running and unsolved
      id: 'glowwisp', map: 'darkPath', x: 4, y: 5, dir: 'down', home: 'down', spr: SPR.glowwisp, anim: true,
      visible: () => q.wisp.s === 1 && !flags.wispFragment,
      talk() {
        say('', ['A cold blue light hangs over the black pond.', 'It flares up as you come close!'], () => {
          encounter = { t: 0, type: 'glowwisp' }; SFX.encounter();
        });
      },
    },
    // ---- Grorud
    {
      id: 'tobias', map: 'grorudTown', x: 19, y: 3, dir: 'down', home: 'down', spr: SPR.tobias,
      // (NABILAH beaten with the quest still active = a save made mid-hand-over; she finishes it herself)
      news: () => q.power.s === 0 || q.power.s === 2 || (q.power.s === 1 && cells() === 3 && !flags.worksOpen),
      talk() {
        const N = 'TOBIAS', H = hero().name;
        if (q.power.s === 0) {
          const have = cells();
          say(N, [
            `${H}! Good to see you. You picked a dark day to visit GRORUD.`,
            'OLD GRORUD WORKS has lost its power, and the big gate will not open without it.',
            'NABILAH has shut herself in there. If anybody knows about the Crystal, it is her.',
            'This terminal needs three POWER CELLS. Find them, and I will hook them up.',
            ...(have ? [`Wait, you already have ${have}? Brilliant!`] : ['NAWAL hears everything in this town. She may know where to look.']),
          ], () => {
            accept('power');
            if (cells() === 3) powerOn();
          });
        } else if (q.power.s === 1 && !flags.worksOpen && cells() < 3) {
          say(N, [`POWER CELLS so far: ${cells()} of 3.`, 'NAWAL by the square may have a hint or two.']);
        } else if (q.power.s === 1 && !flags.worksOpen) {
          powerOn();
        } else if (q.power.s === 1) {
          say(N, ['The gate is open. NABILAH is somewhere deep inside the WORKS.', 'Come back and tell me everything!']);
        } else if (q.power.s === 2) {
          say(N, ['You beat NABILAH? And the lights are still on!'], () => say(H, ['She gave me a CRYSTAL FRAGMENT. She says the trail leads east, to VEITVET.'], () => say(N, [
            'VEITVET? Then GRORUD is not the end of your road either.',
            'Use her FACTORY KEY on the east gate of town. And thank you, from all of GRORUD.',
          ], () => {
            complete('power');
            endChapter('power');
          })));
        } else {
          say(N, [pick([
            'The east gate leads to VEITVET. Go on, then!',
            'The whole town has power again. My toaster has never been happier.',
            'NABILAH came out for coffee today. First time in years.',
          ])]);
        }
      },
    },
    {
      id: 'nawal', map: 'grorudTown', x: 10, y: 8, dir: 'down', home: 'down', spr: SPR.nawal,
      // Hints, never a quest: the first thing still missing, and a word of warning about what lies ahead.
      talk() {
        const N = 'NAWAL', H = hero().name;
        if (flags.nabilahBeaten) {
          say(N, [pick([
            `You beat NABILAH? Everybody is talking about it, ${H}.`,
            'The WORKS are humming again. It sounds like home.',
            'I heard HONEY telling the bakery all about you.',
          ])]);
          return;
        }
        const hints = [];
        if (q.power.s === 0) hints.push(`Hi ${H}! TOBIAS by the terminal has been pacing all morning. Go and talk to him.`);
        else if (!flags.worksOpen) {
          if (!flags.cell1) hints.push('One POWER CELL rolled off a cart up on the HEIGHTS. Try the rocks west of the stream, below the ledge.');
          if (!flags.cell2) hints.push('A BIG SCRAP GOLEM stomps about the east side of the HEIGHTS. Something in its chest glows!');
          if (!flags.cell3) hints.push('JOAN keeps a spare POWER CELL in her yard, south-east of the square. Ask her.');
          if (cells() === 3) hints.push('Three cells! Hurry over to TOBIAS.');
        } else hints.push('In the WORKS the little yellow lights are POWER WISPS. Their zaps sting! Something insulated helps.', 'And NABILAH gets a POWER SURGE when she is cross.');
        const warn = flags.worksOpen ? [] : [owns('weapon', 'wrench')
          ? 'That HEAVY WRENCH of yours cracks scrap golems like nuts.'
          : 'SCRAP GOLEMS have thick armour. A heavy tool cracks it best. I saw one lying about on the HEIGHTS.'];
        say(N, [...hints.slice(0, 2), ...warn]);
      },
    },
    {
      id: 'honey', map: 'grorudTown', x: 7, y: 3, dir: 'down', home: 'down', spr: SPR.honey,
      news: () => q.bag.s === 0 || q.bag.s === 2,
      talk() {
        const N = 'HONEY', H = hero().name;
        const thanks = () => say(N, [
          'My bag! My lucky pen, my lip balm, my other lucky pen... It is all here!',
          'Here, take this. My uncle wore it at the WORKS. Lightning slides right off it. (Got INSULATED VEST!)',
          'Put it on in the menu!',
        ], () => {
          own('armor', 'insulated');
          complete('bag');
        });
        if (q.bag.s === 0 && flags.bag) {
          say(N, [`${H}! Is that... my bag? You found it before I even asked!`], () => { accept('bag'); markReady('bag'); thanks(); });
        } else if (q.bag.s === 0) {
          say(N, [
            `${H}! Oh, have you seen my handbag? Pink, with a little bee on it.`,
            'A RUST RAT chased me on the HEIGHTS and I dropped it somewhere.',
            'Could you look for it? Please?',
          ], () => accept('bag'));
        } else if (q.bag.s === 1) {
          say(N, ['It must be on the HEIGHTS, south-west, below the ledge. I ran past the flowers there.']);
        } else if (q.bag.s === 2) {
          thanks();
        } else {
          say(N, [pick([
            'I am never walking on the HEIGHTS again. Well. Maybe on Sundays.',
            'How is the vest? Not too itchy?',
            `Thank you again, ${H}. You are a star.`,
          ])]);
        }
      },
    },
    {
      id: 'joan', map: 'grorudTown', x: 20, y: 12, dir: 'down', home: 'down', spr: SPR.joan,
      news: () => q.yard.s === 0 || q.yard.s === 2,
      talk() {
        const N = 'JOAN';
        if (q.yard.s === 0) {
          say(N, [
            'Hey! I am JOAN. That is my yard behind me, and SCRAP GOLEMS have moved in.',
            `My spare POWER CELL is in the shed back there. Beat ${YARD_GOLEMS} of those golems and I can get to it.`,
            'Mind the armour on them. Hitting them with a sword is like tickling a fridge.',
          ], () => accept('yard'));
        } else if (q.yard.s === 1) {
          say(N, [`${q.yard.n} of ${YARD_GOLEMS} golems so far. They lurk in the yard, through the gap in the fence.`]);
        } else if (q.yard.s === 2) {
          say(N, [
            'The yard is clear! Hang on...',
            'Here it is. TOBIAS needs it more than my shed does. (Got a POWER CELL!)',
          ], () => {
            if (!flags.cell3) flags.cell3 = true;
            complete('yard');
          });
        } else {
          say(N, [pick([
            'My yard is all mine again. Just me and the scrap.',
            'If you see another golem, tell it the yard is full.',
            'Good luck in the WORKS. Mind NABILAH, she bites. Well, she zaps.',
          ])]);
        }
      },
    },
    { // the big golem on the heights carries the second POWER CELL; it is there until it has dropped it
      id: 'hulk', map: 'grorudHeights', x: 26, y: 4, dir: 'down', home: 'down', spr: SPR.hulk, anim: true,
      visible: () => !flags.cell2,
      talk() {
        say('', ['A huge golem made of scrap metal blocks your way.', 'Something glows inside its chest... a POWER CELL!'], () => {
          encounter = { t: 0, type: 'hulk' }; SFX.encounter();
        });
      },
    },
    { // she waits in her hall at the top of the Works; beaten, she stays and only talks
      id: 'nabilah', map: 'grorudWorks', x: 12, y: 2, dir: 'down', home: 'down', spr: SPR.nabilah,
      talk() {
        const N = 'NABILAH', H = hero().name;
        if (!flags.nabilahBeaten) {
          say(N, ['Who turned the power back on? Oh! A visitor!', 'Welcome to OLD GRORUD WORKS. Mind the cables. Mind the sparks. Mind ME!'],
            () => say(H, ['I am looking for answers about the Crystal.'], () => say(N, [
              'Answers cost extra.',
              'Let us see if you can handle a little POWER!',
            ], () => { encounter = { t: 0, type: 'nabilah' }; SFX.encounter(); })));
        } else if (!flags.factoryKey) {
          nabilahHandover();
        } else {
          say(N, [pick([
            'The trail leads east, to VEITVET. Off you go.',
            'My machines are purring again. Thank you for not breaking them. Much.',
            'Next time, bring snacks.',
          ])]);
        }
      },
    },
    // ---- Veitvet
    {
      id: 'mina', map: 'veitvet', x: 4, y: 9, dir: 'down', home: 'down', spr: SPR.mina,
      news: () => q.signal.s === 0 || q.signal.s === 2,
      talk() {
        const N = 'MINA', H = hero().name, s = q.signal.s;
        const turnIn = () => say(H, ['SANDRA had a CRYSTAL FRAGMENT. Now all four of them are glowing.'], () => say(N, [
          'Four! Look at them shine... as if they were pointing somewhere. Toward the city.',
          'Toward OSLO S. Whatever broke the Crystal, the answer is waiting there.',
          'I will have the east gate opened for you. Thank you, from all of VEITVET.',
        ], () => {
          flags.osloGate = true;
          complete('signal');
          endChapter('signal');
        }));
        if (s === 0 && flags.fragment4) {
          say(N, [`You must be ${H}. The hum is gone... was that you? All of it?`], () => { accept('signal'); markReady('signal'); turnIn(); });
        } else if (s === 0) {
          say(N, [
            `You must be ${H}. I am MINA. Welcome to VEITVET.`,
            ...(flags.signalOff
              ? ['The hum under the town stopped this morning. Was that you?', 'Then the noise has moved. The doors of VEITVET CENTER slid open by themselves.', 'Somebody is behind this. Will you find out who?']
              : ['Can you hear that hum? It has been coming up through the ground for weeks.', 'It makes the bots and the hounds mean, and it gets into your head.',
                'It comes from the old station: down the stairs, south of the square.', 'Will you find out what it is?']),
            ...(fragments() ? ['And... the crystal in your pack is humming along with it. Strange.'] : []),
          ], () => accept('signal'));
        } else if (s === 1 && !flags.signalOff) {
          if (!flags.underSeen) say(N, ['The stairs to the old station are south of the square, by the playground.', 'Be careful down there.']);
          else if (flags.shieldOff) say(N, ['The shield is down? Then shut that thing off before it starts up again!']);
          else if (flags.deviceSeen) say(N, ['A shield? Then something must be feeding it power. Follow the cables!']);
          else say(N, ['It must be somewhere along the tunnel. Look for blinking lights.']);
        } else if (s === 1) {
          say(N, ['SOURCE MOVED? Then the CENTER: its doors opened when the hum stopped.', 'SANDRA runs the stage in there. Nobody has seen her come out for weeks.', 'If anybody is behind this noise, it is her.']);
        } else if (s === 2) {
          turnIn();
        } else {
          say(N, [pick([
            'The east gate is open. OSLO S is that way.',
            'VEITVET is so quiet now. I can hear the birds again.',
            `Four fragments, ${H}. Only one place left to go.`,
          ])]);
        }
      },
    },
    {
      id: 'elias', map: 'veitvet', x: 8, y: 14, dir: 'down', home: 'down', spr: SPR.elias,
      news: () => q.phone.s === 0 || q.phone.s === 2,
      talk() {
        const N = 'ELIAS', H = hero().name;
        const thanks = () => say(N, [
          'My phone! Three hundred unread messages. Ugh.',
          'Take these. They block out noise like nothing else. (Got HEADPHONES!)',
          'Put them on in the menu. They go where your armour goes, so choose well!',
        ], () => {
          own('armor', 'phones');
          complete('phone');
        });
        if (q.phone.s === 0 && flags.phone) {
          say(N, [`Hey, ${H}, that is MY phone! You found it before I even asked!`], () => { accept('phone'); markReady('phone'); thanks(); });
        } else if (q.phone.s === 0) {
          say(N, [
            'I am ELIAS. A SHADOW HOUND chased me, and I dropped my phone!',
            'It is somewhere south-east, behind the hedges. Could you look for it? Please?',
          ], () => accept('phone'));
        } else if (q.phone.s === 1) {
          say(N, ['South-east, behind the hedges. Go round the bottom: there is a gap.']);
        } else if (q.phone.s === 2) {
          thanks();
        } else {
          say(N, [pick([
            'The headphones are great, right? Total silence.',
            'I finally beat my high score. Thanks to you.',
            'Mind the hounds on that lawn.',
          ])]);
        }
      },
    },
    {
      id: 'marianne', map: 'veitvet', x: 7, y: 5, dir: 'down', home: 'down', spr: SPR.marianne,
      // Never a quest: what she has seen of the town, which changes as the story goes on.
      talk() {
        const N = 'MARIANNE';
        if (flags.sandraBeaten) {
          say(N, [
            'Peace and quiet at last! I almost miss the hum. Almost.',
            'SANDRA came by the bakery this morning and said sorry. With a cake!',
            'They say the road east goes all the way to OSLO S. Mind how you go, love.',
          ]);
        } else if (flags.signalOff) {
          say(N, [
            'The hum is gone! My radio works again. Well, it plays one song. Over and over.',
            'The bots and hounds seem calmer too. Not friendly. Calmer.',
            'But the centre flickers like a disco. SANDRA is up on that stage.',
            'Her noise gets inside your head. Anything that blocks it out, wear it!',
          ]);
        } else {
          say(N, [
            'Hello, love. I am MARIANNE.', 'Mind the STREET BOTS: they nip before you can blink.',
            'SHADOW HOUNDS crouch low before they pounce. When you see that, get ready!',
            'And that hum makes the whole lot of them meaner. My radio only plays static.',
            owns('weapon', 'wrench')
              ? 'Old tunnel golems lurk in the station. Your wrench should crack them.'
              : 'Old tunnel golems lurk in the station. You want something heavy for those.',
          ]);
        }
      },
    },
    { // stuck in the underground until the hero pulls him free; then he goes home, and stands in the square
      id: 'noah', map: 'veitvetUnder', x: 7, y: 3, dir: 'down', home: 'down', spr: SPR.noah,
      visible: () => !flags.noahHelped,
      talk() {
        const N = 'NOAH';
        const tip = flags.signalOff ? ['Did you shut that humming thing off? The tunnel feels so much lighter.']
          : flags.shieldOff ? ['The shield by the humming cabinet just went dark. Go and switch it off!']
            : ['I saw the thing that hums: a cabinet behind a shield, north of the tracks.', 'A breaker in the east room feeds the shield. Pull it, and the shield goes down.'];
        say(N, ['Thank goodness, a person! I am NOAH. My jacket is stuck in this old gate.', 'I have been down here since lunch. Could you give it a pull?'],
          () => say('', ['You grab the jacket and heave. RRRIP! NOAH tumbles free.'], () => say(N, [
            'Free! Thanks! Here, take this. (Got 60 gold! Your herbs are refilled!)',
            ...tip,
            'I am getting out of here. See you up top!',
          ], () => {
            if (!flags.noahHelped) {
              flags.noahHelped = true;
              player.gold += 60; player.herbs = player.maxHerbs;
              SFX.pickup();
            }
            saveGame();
          })));
      },
    },
    {
      id: 'noah2', map: 'veitvet', x: 19, y: 8, dir: 'down', home: 'down', spr: SPR.noah,
      visible: () => flags.noahHelped === true,
      talk() {
        say('NOAH', [flags.signalOff ? 'The hum is gone. Tonight I am going to sleep for a week.' : 'That breaker in the room east of the shield. Pull it!',
          pick(['Thanks again for pulling me out. I owe you one.', 'I am never taking a shortcut through the station again.', 'My jacket has a hole now. Worth it.'])]);
      },
    },
    { // the beast in the side tunnel guards the SIGNAL BLADE; it is there until it is beaten
      id: 'beast', map: 'veitvetUnder', x: 23, y: 14, dir: 'down', home: 'down', spr: SPR.beast, anim: true,
      visible: () => !flags.beastBeaten,
      talk() {
        say('', ['A huge beast of static fills the side tunnel, crackling.', 'Behind it, something glints in the dark...'], () => {
          encounter = { t: 0, type: 'beast' }; SFX.encounter();
        });
      },
    },
    { // she waits on her stage at the back of the centre; beaten, she stays and only talks
      id: 'sandra', map: 'veitvetCenter', x: 10, y: 3, dir: 'down', home: 'down', spr: SPR.sandra,
      talk() {
        const N = 'SANDRA', H = hero().name;
        if (!flags.sandraBeaten) {
          say(N, ['Well, well. The one who pulled the plug on my relay.', 'Do you know how long it took me to wire up the whole of VEITVET?'],
            () => say(H, ['Why are you doing this? The whole town can hear it!'], () => say(N, [
              'Because something out there is singing. And I want to hear it LOUDER.',
              'Let us see how you handle a little FEEDBACK!',
            ], () => { encounter = { t: 0, type: 'sandraBoss' }; SFX.encounter(); })));
        } else if (!flags.fragment4) {
          sandraHandover();
        } else {
          say(N, [pick([
            'OSLO S. That is where the song comes from. Go.',
            'I am keeping the speakers. For a quiet show. Very quiet.',
            'Tell MINA I am sorry about the noise.',
          ])]);
        }
      },
    },
  ];
  const npcVisible = (n) => !n.visible || n.visible();
  const npcAt = (map, x, y) => NPCS.find((n) => n.map === map && n.x === x && n.y === y && npcVisible(n));
  const itemThere = (i) => !flags[i.id] && (!i.quest || i.always || q[i.quest].s === 1);
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
    zap: () => { noise(0.18, { vol: 0.35, freq: 6000 }); tone(1800, 0.12, { to: 200, vol: 0.12, type: 'sawtooth' }); },
    power: () => { tone(80, 0.9, { to: 640, vol: 0.14, type: 'sawtooth' }); seq([0, 0, 0, 0, 523, 659, 784, 1047], 0.1, { vol: 0.12, type: 'triangle', len: 0.16 }); },
    signal: () => { tone(900, 0.08, { to: 1400, vol: 0.08 }); tone(1400, 0.08, { to: 700, vol: 0.08, delay: 0.08 }); tone(700, 0.1, { to: 1200, vol: 0.08, delay: 0.16 }); noise(0.2, { vol: 0.15, freq: 4000 }); },
    overload: () => { tone(200, 0.8, { to: 1600, vol: 0.14, type: 'sawtooth' }); seq([1047, 0, 1047, 0, 1047, 1319], 0.08, { vol: 0.1, len: 0.06 }); noise(0.5, { vol: 0.2, freq: 5000, delay: 0.3 }); },
    signalLost: () => { tone(1200, 1, { to: 60, vol: 0.14, type: 'sawtooth' }); seq([784, 0, 659, 0, 523, 0, 392], 0.12, { vol: 0.1, type: 'triangle', len: 0.1 }); },
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
  function upArrow(x, y) { R(ctx, x + 3, y, 1, 1, 15); R(ctx, x + 2, y + 1, 3, 1, 15); R(ctx, x + 1, y + 2, 5, 1, 15); R(ctx, x, y + 3, 7, 1, 15); }
  const GEAR_ROWS = 5; // how many weapons or armours the status screen lists at once
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
  // Each shop has a title and a list of wares. A ware that is gear (`kind` and `gear`) is owned and worn
  // once bought; `better` lists gear that makes it pointless to buy. Herbs, the pouch and LEAVE are
  // handled by id.
  const HERB_WARE = { id: 'herb', name: 'HERB', price: 8, desc: () => `Heals in battle. Have ${player.herbs}/${player.maxHerbs}.` };
  const LEAVE_WARE = { id: 'exit', name: 'LEAVE', price: 0, desc: () => 'Come back anytime!' };
  const SHOPS = {
    bram: {
      title: "BRAM'S FORGE",
      wares: [
        HERB_WARE,
        { id: 'iron', name: 'IRON SWORD', price: 40, kind: 'weapon', gear: 'iron', better: ['crystal'], desc: () => 'ATK +3. Sturdy and sharp.' },
        { id: 'vest', name: 'TOUGH VEST', price: 35, kind: 'armor', gear: 'vest', desc: () => 'DEF +2. Padded leather.' },
        LEAVE_WARE,
      ],
    },
    nadia: {
      title: "NADIA'S KIOSK",
      wares: [
        HERB_WARE,
        { id: 'pouch', name: 'HERB POUCH+1', price: 90, desc: () => `Holds one more herb. Yours holds ${player.maxHerbs}.` },
        { id: 'rvest', name: 'REINF. VEST', price: 160, kind: 'armor', gear: 'rvest', desc: () => 'DEF +4. Steel plates sewn in.' },
        LEAVE_WARE,
      ],
    },
  };
  const shopWares = () => SHOPS[shop.id].wares;
  const shopOwned = (item) => (item.gear && (owns(item.kind, item.gear) || (item.better || []).some((id) => owns(item.kind, id))))
    || (item.id === 'pouch' && flags.pouchBought === true);
  function openShop(id = 'bram') { shop = { id, sel: 0, note: '', noteT: 0 }; mode = 'shop'; }
  function buy(item) {
    const note = (t, ok) => { shop.note = t; shop.noteT = 120; ok ? SFX.coin() : SFX.deny(); };
    if (item.id === 'exit') { mode = 'world'; shop = null; SFX.move(); return; }
    if (item.id === 'herb' && player.herbs >= player.maxHerbs) return note('Your pouch is full!');
    if (shopOwned(item)) {
      return note(item.kind === 'weapon' ? 'You have a better blade.' : item.kind ? 'You already wear one.' : 'Sold out!');
    }
    if (player.gold < item.price) return note('Not enough gold!');
    player.gold -= item.price;
    if (item.id === 'herb') player.herbs++;
    if (item.id === 'pouch') { flags.pouchBought = true; player.maxHerbs++; player.herbs++; }
    if (item.gear) { own(item.kind, item.gear); player[item.kind] = item.gear; }
    note(`Bought ${item.name}!`, true);
    saveGame();
  }
  function updateShop() {
    const wares = shopWares();
    if (shop.noteT > 0) shop.noteT--;
    if (navPressed === 'up') { shop.sel = (shop.sel + wares.length - 1) % wares.length; SFX.move(); }
    if (navPressed === 'down') { shop.sel = (shop.sel + 1) % wares.length; SFX.move(); }
    if (aPressed) buy(wares[shop.sel]);
    else if (bPressed) { mode = 'world'; shop = null; SFX.move(); }
  }
  function drawShop() {
    const wares = shopWares();
    box(20, 10, 200, 96);
    text(SHOPS[shop.id].title, 30, 18, 14);
    rtext(`${player.gold}G`, 210, 18, 14);
    R(ctx, 28, 29, 184, 1, 8);
    wares.forEach((it, i) => {
      const y = 36 + i * 15;
      const owned = shopOwned(it);
      text(it.name, 42, y, owned ? 7 : 15);
      if (it.price) rtext(owned ? 'OWNED' : `${it.price}G`, 210, y, owned ? 7 : 14);
      if (shop.sel === i && Math.floor(tick / 16) % 3) cursor(30, y);
    });
    box(4, 108, 232, 48);
    const msg = shop.noteT > 0 ? shop.note : wares[shop.sel].desc();
    wrap(msg, 27).forEach((l, i) => text(l, 12, 117 + i * 11));
  }

  // ---------------------------------------------------------------- status menu
  // menuSel is the line the cursor is on: 0 weapon, 1 armour, 2 SAVE, 3 ITEMS.
  // Story items are shown as icons on the line above SAVE. Once the hero carries one that has something
  // to say about itself (a `desc`), that line becomes ITEMS and the cursor can stop on it to read them.
  const KEY_ITEMS = [
    { name: () => 'OLD SICKLE', has: () => player.sickle },
    { name: () => `CRYSTAL FRAG x${fragments()}`, has: () => fragments() > 0 },
    { name: () => 'RED KEY', has: () => flags.redKey },
    { name: () => 'BLUE KEY', has: () => flags.blueKey },
    { name: () => 'WISP FRAGMENT', has: () => flags.wispFragment, desc: 'A strange fragment glowing with faint blue light.' },
    { name: () => `POWER CELL x${cells()}`, has: () => cells() > 0 && !flags.worksOpen, desc: 'Heavy little batteries. TOBIAS can hook them up.' },
    { name: () => 'FACTORY KEY', has: () => flags.factoryKey, desc: 'Big and greasy. It opens the east gate of GRORUD.' },
  ];
  const keyItems = () => KEY_ITEMS.filter((i) => i.has());
  const menuLines = () => (keyItems().some((i) => i.desc) ? [0, 1, 3, 2] : [0, 1, 2]); // top to bottom
  const MENU_Y = { 0: 110, 1: 122, 3: 134, 2: 146 };
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
      const lines = menuLines(), at = lines.indexOf(menuSel);
      const to = lines[clamp((at < 0 ? lines.length - 1 : at) + (navPressed === 'up' ? -1 : 1), 0, lines.length - 1)];
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
    cursor(5, MENU_Y[menuSel]);
    if (menuLines().includes(3)) text('ITEMS', 10, 134, menuSel === 3 ? 15 : 10);
    else if (player.sickle) text('SICKLE', 10, 134, 10);
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
    if (menuSel === 3) { // the story items, and what the ones with a description look like
      const items = keyItems();
      text('KEY ITEMS', 104, 9, 14);
      items.forEach((it, i) => text(it.name(), 104, 24 + i * 11, 15));
      const read = items.filter((it) => it.desc).pop();
      if (read) wrap(read.desc, 16).forEach((l, i) => text(l, 104, 24 + items.length * 11 + 8 + i * 11, 13));
      if (Math.floor(tick / 30) % 2) rtext('X:BACK', 232, 146, 7);
      return;
    }
    if (menuSel < 2) { // the cursor is on the weapon or armour: show what the hero owns in place of the quests
      const kind = menuSel === 0 ? 'weapon' : 'armor', table = gearTable(kind), list = ownedGear(kind), worn = table[player[kind]];
      text(kind === 'weapon' ? 'WEAPONS' : 'ARMOUR', 104, 9, 14);
      // Five fit; a longer list shows the five around the one being worn, with arrows for the rest.
      const first = clamp(list.indexOf(player[kind]) - 2, 0, Math.max(0, list.length - GEAR_ROWS));
      list.slice(first, first + GEAR_ROWS).forEach((id, i) => {
        const on = id === player[kind], y = 24 + i * 12;
        text(table[id].full || table[id].name, 114, y, on ? 15 : 7);
        if (on) cursor(106, y);
      });
      if (first > 0) upArrow(228, 25);
      if (first + GEAR_ROWS < list.length) downArrow(228, 74);
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
    MAPS[name].onEnter?.();
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
      const early = q[item.quest].s !== 1;
      flags[item.id] = true;
      markReady(item.quest);
      SFX.pickup();
      held.length = 0;
      say('', early && item.early ? item.early : item.found, saveGame);
      return;
    }
    if (item && item.cell) {
      flags[item.id] = true;
      SFX.pickup();
      held.length = 0;
      const n = cells();
      say('', q.power.s === 0
        ? ['A POWER CELL, still charged! Somebody in GRORUD must be missing this.']
        : [`You found a POWER CELL! (${n}/3)`, ...(n === 3 ? ['That makes three. Take them to TOBIAS!'] : [])], saveGame);
      return;
    }
    if (item && item.chest) {
      flags[item.id] = true;
      SFX.pickup();
      held.length = 0;
      if (item.gold) {
        player.gold += item.gold;
        say('', [`You open the chest. Inside are ${item.gold} gold!`], saveGame);
      } else if (item.pouch) {
        player.maxHerbs++; player.herbs = player.maxHerbs;
        say('', ['You open the chest. Inside is a bigger herb pouch, full of fresh herbs!', `(Herb pouch: ${player.maxHerbs} max!)`], saveGame);
      } else {
        const kind = item.weapon ? 'weapon' : 'armor', id = item[kind], gear = gearTable(kind)[id];
        own(kind, id);
        say('', [`You open the chest. Inside is a ${gear.full || gear.name}!`, 'Pick it in the menu to use it.'], saveGame);
      }
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
  const LOOKERS = new Set(['elder', 'wren', 'pip', 'bram', 'johanne', 'basil', 'dot', 'gus', 'selma', 'emil', 'astrid', 'nadia', 'leif',
    'tobias', 'nawal', 'honey', 'joan', 'mina', 'elias', 'marianne', 'noah2']);
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
        const img = ch === '~' ? water[(wf + tx + ty) % 2] : FLOWERS[ch] ? FLOWERS[ch][flowerFrame(tx, ty)]
          : ANIM_TILES[ch] ? ANIM_TILES[ch][(Math.floor(tick / 12) + tx) % 2] : TILE[ch] || TILE['.'];
        ctx.drawImage(img, tx * TS - camX, ty * TS - camY);
      }
    }
    if (m.lighting?.shade) { ctx.globalAlpha = m.lighting.shade; R(ctx, 0, 0, W, H, 0); ctx.globalAlpha = 1; }
    for (const it of ITEMS) {
      if (it.map !== player.map || !itemThere(it)) continue;
      if (it.quest) { ctx.drawImage(it.spr || KEBAB_SPR, it.x * TS - camX, it.y * TS - camY); continue; }
      if (it.cell) { ctx.drawImage(CELL_SPR[Math.floor(tick / 20) % 2], it.x * TS - camX, it.y * TS - camY); continue; }
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
    if (powerT > 0 && Math.floor(powerT / 5) % 2 === 0) { ctx.globalAlpha = 0.35; R(ctx, 0, 0, W, H, 14); ctx.globalAlpha = 1; }
    if (pulseT > 0 && Math.floor(pulseT / 6) % 2 === 0) { ctx.globalAlpha = 0.3 + (pulseT % 12) / 40; R(ctx, 0, 0, W, H, 16); ctx.globalAlpha = 1; }
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
    // An ordinary enemy driven by the SIGNAL hits 10% harder while the device under Veitvet is live.
    const boosted = !!e.signal && !e.boss && !flags.signalOff;
    battle = {
      type, name: e.name, boss: !!e.boss, hp, max: hp, shownHp: hp, boosted,
      atk: boosted ? Math.round((e.atk + L) * 1.1) : e.atk + L, def: e.def + Math.floor(L / 2), xp: e.xp + L * 2, gold: rand(...e.gold),
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
    const article = ENEMIES[battle.type].boss?.named ? '' : battle.boss ? 'The ' : /^[AEIOU]/.test(battle.name) ? 'An ' : 'A ';
    await msg(`${article}${battle.name} ${intro}`, 700);
    if (battle.boosted) await msg('The SIGNAL hums around it. It looks stronger!', 600);
    if (ENEMIES[battle.type].quick) {
      if (ARMORS[player.armor].nimble || WEAPONS[player.weapon].nimble) await msg('It darts at you, but you step lightly aside!', 500);
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
      const crit = Math.random() < (weapon.keen ? 0.24 : 0.12);
      let dmg = Math.max(1, atk() - (battle.weak?.amt || 0) + rand(0, 2) - (smash ? 0 : battle.def));
      const tuned = weapon.tuned && ENEMIES[battle.type].signal;
      if (tuned) dmg = Math.round(dmg * weapon.tuned);
      if (crit) dmg = Math.floor(dmg * 1.8);
      battle.hp = Math.max(0, battle.hp - dmg);
      battle.flash = 24;
      crit ? SFX.crit() : SFX.hit();
      float(enemyX(), battle.boss ? 24 : 36, crit ? `${dmg}!` : `${dmg}`, crit ? 14 : 15);
      if (crit) await msg('A critical hit!', 400); else await wait(500);
      if (battle.hp <= 0) return winBattle();
      if (armored && !battle.armorSaid) { // said once per fight, so the hero learns what armour does
        battle.armorSaid = true;
        await msg(smash ? weapon.smash || 'The axe smashes right through its armour!' : 'Its armour turns most of the blow!', 500);
      }
      if (tuned && !battle.tunedSaid) { battle.tunedSaid = true; await msg(weapon.hum, 500); } // the same, for the signal blade
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
  // One blow at the hero. An electric blow (`shock`, by default whatever the enemy's own `shock` says)
  // flashes yellow, and insulated armour takes its share off what gets through the defence. A signal blow
  // (`signal`, by default the enemy's own `signalHit`) warps the screen pink, and resisting armour takes its
  // share off. Padded armour takes its share off a big physical blow. DISTORTION (battle.soft) lowers the
  // hero's defence while it lasts.
  async function enemyHit(mult, shock = !!ENEMIES[battle.type].shock, signal = !shock && !!ENEMIES[battle.type].signalHit) {
    battle.lunge = 12;
    await wait(150);
    let dmg = Math.max(1, Math.round((battle.atk + rand(0, 2)) * mult) - Math.max(0, def() - (battle.soft?.amt || 0)));
    const armor = ARMORS[player.armor];
    const off = shock ? armor.insulated || 0 : signal ? armor.resist || 0 : mult > 1 ? armor.padded || 0 : 0;
    if (off) dmg = Math.max(1, Math.round(dmg * (1 - off)));
    player.hp = Math.max(0, player.hp - dmg);
    battle.shake = mult > 1 ? 24 : 14;
    if (shock) { battle.zap = 18; SFX.zap(); } else if (signal) { battle.glitch = 18; SFX.signal(); } else if (mult > 1) SFX.slam(); else SFX.hurt();
    float(196, 58, `${dmg}`, shock ? 14 : signal ? 16 : 6);
    await wait(650);
    const said = shock ? 'insulatedSaid' : signal ? 'resistSaid' : 'paddedSaid';
    if (off && !battle[said] && player.hp > 0) { // said once per fight, so the hero learns what it does
      battle[said] = true;
      await msg(shock ? `Your ${armor.full || armor.name} soaks up the shock!` : signal ? `Your ${armor.full || armor.name} muffle the noise!` : `Your ${armor.full || armor.name} softens the blow!`, 500);
    }
  }
  // A spell on the hero that lasts for a few turns: 'weak' (SIGNAL JAM: less ATK) or 'soft' (DISTORTION: less
  // DEF). It lives on the battle itself, so it can never outlast the fight, whether that is won, lost or run from.
  async function heroFx(kind, amt, turns, line) {
    battle[kind] = { amt, left: turns };
    battle.glitch = 24;
    SFX.signal();
    await msg(`${line} (-${amt})`, 600);
  }
  async function enemyTurn() {
    const b = battle;
    b.turn++;
    // Spells on the hero wear off: each lasts for the number of the hero's moves it was cast for.
    for (const [kind, what] of [['weak', 'ATK'], ['soft', 'DEF']]) {
      if (b[kind] && --b[kind].left <= 0) { b[kind] = null; await msg(`Your head clears. ${what} back to normal!`, 500); }
    }
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
    const hunt = HUNT.find((h) => h.type === b.type);
    if (hunt && q.trouble.s === 1 && q.trouble[hunt.k] < hunt.n) {
      q.trouble[hunt.k]++;
      if (huntDone()) {
        SFX.quest();
        await msg('That should get MARCUS\'s attention! Try the basketball court.', 1000);
      } else await msg(`${hunt.name}: ${q.trouble[hunt.k]}/${hunt.n}`, 700);
    }
    if (b.type === 'scrap' && q.yard.s === 1 && q.yard.n < YARD_GOLEMS) {
      q.yard.n++;
      if (q.yard.n >= YARD_GOLEMS) {
        markReady('yard');
        SFX.quest();
        await msg('That is the last of them! Tell JOAN!', 1000);
      } else await msg(`Scrap golems: ${q.yard.n}/${YARD_GOLEMS}`, 700);
    }
    if (b.type === 'shroom' && q.glowcap.s === 1 && Math.random() < 0.6) {
      player.glowcaps++;
      SFX.pickup();
      await msg(`It dropped a GLOWCAP! (${player.glowcaps}/3)`, 900);
      if (player.glowcaps >= 3) { markReady('glowcap'); await msg('That is enough glowcaps for Wren!', 900); }
    }
    if (ENEMIES[b.type].won) await ENEMIES[b.type].won(b);
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
    if (b.zap > 0) b.zap--;
    if (b.glitch > 0) b.glitch--;
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
    heights() { // a bright day on the heights: hills, a ledge of rock, and grass underfoot
      R(ctx, 0, 0, W, 60, 8);
      for (const [x, y, w] of [[18, 10, 30], [120, 6, 40], [196, 16, 26]]) { R(ctx, x, y, w, 4, 15); R(ctx, x + 6, y - 3, w - 12, 3, 15); }
      for (let x = 0; x < W; x++) {
        const h1 = 18 + Math.round(Math.sin(x / 31) * 6 + Math.sin(x / 11) * 2), h2 = 10 + Math.round(Math.sin(x / 19 + 2) * 4);
        R(ctx, x, 60 - h1, 1, h1, 5); R(ctx, x, 60 - h2, 1, h2, 11);
      }
      for (const [cx, w, h] of [[24, 18, 14], [44, 10, 8], [214, 16, 12], [196, 8, 6]]) { // boulders
        for (let y = 0; y < h; y++) {
          const hw = Math.round(w * Math.sqrt(1 - ((h - y) / h) ** 2));
          R(ctx, cx - hw, 60 - h + y, hw * 2, 1, y < 2 ? 10 : y < h - 3 ? 7 : 3);
        }
      }
      R(ctx, 0, 60, W, 44, 11);
      for (let y = 62; y < 104; y += 3) for (let x = 0; x < W; x += 2) if (hash(x + 3, y) < 0.04) { P(ctx, x, y, 5); P(ctx, x, y - 1, 5); }
    },
    factory() { // inside the Works: pipes overhead, blinking lamps, a steel floor with hazard stripes
      R(ctx, 0, 0, W, 60, 0);
      for (const y of [8, 22]) { R(ctx, 0, y, W, 5, 3); R(ctx, 0, y, W, 1, 10); }
      for (const x of [30, 96, 168, 214]) { R(ctx, x, 0, 6, 60, 3); R(ctx, x, 0, 1, 60, 10); }
      for (const [x, w, top] of [[0, 26, 34], [44, 40, 40], [118, 34, 30], [184, 24, 38]]) {
        R(ctx, x, top, w, 60 - top, 1); R(ctx, x, top, w, 1, 7);
        for (let i = 0; i < 3; i++) P(ctx, x + 4 + i * 5, top + 4, Math.floor((tick + x + i * 9) / 25) % 3 ? 11 : 6);
      }
      for (let i = 0; i < 6; i++) { const x = (i * 43 + 12) % W; P(ctx, x, 16, Math.floor((tick + i * 17) / 20) % 4 ? 14 : 3); }
      R(ctx, 0, 60, W, 44, 3);
      for (let x = 0; x < W; x += 24) R(ctx, x, 60, 1, 44, 1);
      for (let y = 62; y < 104; y += 2) for (let x = 0; x < W; x += 2) if (hash(x + 11, y) < 0.03) P(ctx, x, y, 7);
      for (let x = 0; x < W; x += 8) { R(ctx, x, 96, 4, 3, 14); R(ctx, x + 4, 96, 4, 3, 0); }
    },
    veitvet() { // dusk in Veitvet: the blocks, the lit sign of the centre, and wet paving underfoot
      R(ctx, 0, 0, W, 60, 17); R(ctx, 0, 0, W, 26, 2);
      for (let i = 0; i < 6; i++) { const x = (i * 47 + 9) % W, y = (i * 7) % 20; P(ctx, x, y, Math.floor((tick + i * 19) / 30) % 4 ? 13 : 15); }
      for (const [x, top, w] of [[0, 18, 30], [34, 26, 24], [176, 22, 26], [206, 14, 34]]) {
        R(ctx, x, top, w, 60 - top, 0); R(ctx, x + 1, top + 1, w - 2, 59 - top, 3);
        for (let y = top + 4; y < 56; y += 6) for (let wx = x + 3; wx < x + w - 3; wx += 5) R(ctx, wx, y, 2, 3, hash(wx, y) < 0.4 ? 14 : 1);
      }
      R(ctx, 70, 30, 96, 30, 0); R(ctx, 71, 31, 94, 29, 12); R(ctx, 71, 31, 94, 2, 15); // the centre
      for (let x = 74; x < 162; x += 11) R(ctx, x, 42, 8, 18, 8);
      R(ctx, 92, 34, 52, 6, 0); R(ctx, 94, 35, 48, 4, Math.floor(tick / 40) % 2 ? 16 : 13);
      R(ctx, 0, 60, W, 44, 3);
      for (let y = 62; y < 104; y += 2) for (let x = 0; x < W; x += 2) if (hash(x + 29, y) < 0.04) P(ctx, x, y, y % 4 ? 7 : 8);
      for (let x = 10; x < W; x += 40) R(ctx, x, 82, 18, 1, 10);
    },
    underground() { // the closed station: grimy tiles, a dead sign, and the tracks running off into the dark
      R(ctx, 0, 0, W, 60, 10);
      for (let y = 0; y < 60; y += 6) R(ctx, 0, y, W, 1, 7);
      for (let y = 0; y < 60; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < W; x += 6) R(ctx, x, y, 1, 6, 7);
      for (let y = 0; y < 60; y++) for (let x = 0; x < W; x += 2) if (hash(x + 3, y + 77) < 0.03) P(ctx, x, y, 3);
      R(ctx, 0, 0, W, 6, 1);
      R(ctx, 84, 12, 72, 14, 0); R(ctx, 85, 13, 70, 12, 2); // the station sign
      for (let i = 0; i < 7; i++) R(ctx, 92 + i * 9, 17, 6, 3, Math.floor((tick + i * 23) / 50) % 5 ? 13 : 3);
      ctx.globalAlpha = 0.45; R(ctx, 0, 0, W, 60, 0); ctx.globalAlpha = 1;
      R(ctx, 0, 60, W, 44, 1);
      for (let x = 0; x < W; x += 12) R(ctx, x, 70, 6, 34, 4);
      R(ctx, 0, 74, W, 2, 10); R(ctx, 0, 74, W, 1, 15); R(ctx, 0, 94, W, 2, 10); R(ctx, 0, 94, W, 1, 15);
      R(ctx, 0, 60, W, 4, 3); for (let x = 0; x < W; x += 8) R(ctx, x, 60, 4, 2, 14);
    },
    center() { // inside VEITVET CENTER: shut shops, hanging lights, a polished floor
      R(ctx, 0, 0, W, 60, 12);
      R(ctx, 0, 0, W, 8, 15); R(ctx, 0, 8, W, 1, 4);
      for (let x = 6; x < W; x += 58) { // shop fronts with their shutters down
        R(ctx, x, 20, 48, 40, 0); R(ctx, x + 1, 21, 46, 6, 2); R(ctx, x + 4, 22, 12, 4, [13, 14, 16, 11][(x / 58) | 0]);
        R(ctx, x + 1, 27, 46, 33, 7); for (let y = 29; y < 60; y += 3) R(ctx, x + 1, y, 46, 1, 10);
      }
      for (let i = 0; i < 6; i++) { const x = 18 + i * 40; R(ctx, x, 8, 1, 6, 0); R(ctx, x - 3, 14, 7, 2, Math.floor((tick + i * 15) / 20) % 3 ? 16 : 14); }
      R(ctx, 0, 60, W, 44, 15);
      for (let y = 60; y < 104; y += 11) for (let x = (y % 22 ? 0 : 11); x < W; x += 22) R(ctx, x, y, 11, 11, 12);
      R(ctx, 0, 60, W, 1, 10);
    },
    blocks() { // evening over Ammerud: tall blocks with lit windows, and asphalt underfoot
      R(ctx, 0, 0, W, 60, 2);
      for (let i = 0; i < 8; i++) { const x = (i * 41 + 17) % W, y = (i * 11) % 22; P(ctx, x, y, Math.floor((tick + i * 13) / 30) % 4 ? 13 : 15); }
      for (const [x, top, w] of [[0, 24, 34], [40, 14, 30], [78, 30, 26], [140, 18, 34], [182, 26, 22], [210, 12, 30]]) {
        R(ctx, x, top, w, 60 - top, 0); R(ctx, x + 1, top + 1, w - 2, 59 - top, 1);
        for (let y = top + 4; y < 56; y += 6) for (let wx = x + 3; wx < x + w - 3; wx += 5) {
          R(ctx, wx, y, 2, 3, hash(wx, y) < 0.35 ? 14 : 3);
        }
      }
      R(ctx, 0, 60, W, 44, 3);
      for (let y = 62; y < 104; y += 2) for (let x = 0; x < W; x += 2) if (hash(x + 7, y) < 0.04) P(ctx, x, y, 7);
      R(ctx, 0, 96, W, 1, 7);
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
        ctx.drawImage(ENEMY_SPR[b.look || b.type][frame], ex + lx - puff / 2, ey + sink - puff, size + puff, size - sink + puff);
      }
    }
    if (b.zap > 0 && Math.floor(b.zap / 3) % 2 === 0) { // an electric blow: a yellow flash and a bolt
      ctx.globalAlpha = 0.3; R(ctx, 0, 0, W, 104, 14); ctx.globalAlpha = 1;
      const pts = [[150, 0], [170, 18], [160, 26], [182, 44], [172, 50], [192, 66]];
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let s = 0; s <= n; s++) {
          const x = Math.round(x0 + (x1 - x0) * s / n), y = Math.round(y0 + (y1 - y0) * s / n);
          R(ctx, x - 1, y - 1, 3, 3, 0); P(ctx, x, y, 15);
        }
      }
    }
    if (b.glitch > 0 && Math.floor(b.glitch / 3) % 2 === 0) { // a signal blow: the picture warps, in pink bands
      ctx.globalAlpha = 0.25; R(ctx, 0, 0, W, 104, 16); ctx.globalAlpha = 1;
      for (let i = 0; i < 6; i++) {
        const y = (i * 17 + b.glitch * 7) % 100, x = (i * 53 + b.glitch * 13) % W;
        R(ctx, x, y, 30 + (i * 11) % 40, 2, i % 2 ? 16 : 15);
      }
    }
    if (b.boosted && !b.gone) { // the signal around an enemy it drives: little pulsing rings
      const r = 2 + (Math.floor(tick / 10) % 3) * 3;
      for (let a = 0; a < 16; a++) {
        const t = a / 16 * Math.PI * 2;
        if (Math.abs(Math.cos(t)) > 0.5) P(ctx, Math.round(64 + Math.cos(t) * (26 + r)), Math.round(60 + Math.sin(t) * (10 + r)), 16);
      }
    }
    box(4, 4, Math.max(104, b.name.length * 8 + 8), 28); // a long name widens the box to the right
    text(b.name, 10, 9, b.boss ? 14 : 15);
    bar(10, 21, 92, b.shownHp, b.max);
    const wide = Math.max(0, hero().name.length - 7) * 8; // longer names widen the panel to the left
    box(132 - wide, 64, 104 + wide, 36);
    text(hero().name, 138 - wide, 69, 14);
    text(`LV${player.lvl}`, 202, 69, 15);
    text(`HP${player.hp}/${player.maxhp}`, 138 - wide, 79);
    bar(138 - wide, 91, 92 + wide, b.playerShownHp, player.maxhp);
    // Spells on the hero, over the panel: what they took and how many moves they have left.
    const spells = [['weak', 'ATK'], ['soft', 'DEF']].filter(([k]) => b[k]);
    spells.forEach(([k, what], i) => {
      const s = `${what}-${b[k].amt} ${b[k].left}`, w = s.length * 8 + 8, x = 236 - w;
      box(x, 48 - i * 14, w, 14);
      text(s, x + 4, 51 - i * 14, 16);
    });
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
    if (powerT > 0) powerT--;
    if (pulseT > 0) pulseT--;
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
    get mode() { return mode; }, get battle() { return battle; }, get shop() { return shop; }, get powerT() { return powerT; },
    get pulseT() { return pulseT; },
  };
})();
