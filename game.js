'use strict';
/* Michael's Quest — a tiny retro RPG. Plain JS + canvas, all art drawn in code. */
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
  const SOLID = new Set(['T', 'P', '~', '#', 'R', 'H', 'D', 'S', 's', 'V', 'r', 'k', 'C', 'u', 'U', 'F', 'O', 'b', 'x']);

  // ---------------------------------------------------------------- characters
  function personSprite(o, dir, frame) {
    const { hair, shirt, shirt2, pants, skin = 12, robe, beard, longHair } = o;
    return outlined(mk(16, 16, (g) => {
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
      R(g, 4, 7, 8, 4, shirt);
      if (!robe) R(g, 4, 10, 8, 1, o.belt ?? 4);
      if (o.apron && dir !== 'up') R(g, dir === 'left' ? 4 : 5, 8, dir === 'left' ? 4 : 6, 5, o.apron);
      if (dir === 'left') {
        const ay = frame ? 8 : 7;
        R(g, 6, ay, 3, 3, shirt2); R(g, 6, ay + 3, 2, 1, skin);
      } else {
        const l = frame ? 0 : 1, r = frame ? 1 : 0;
        R(g, 3, 7, 1, 2 + l, shirt2); P(g, 3, 9 + l, skin);
        R(g, 12, 7, 1, 2 + r, shirt2); P(g, 12, 9 + r, skin);
      }
      R(g, 5, 2, 6, 5, skin);
      if (dir === 'up') {
        R(g, 4, 1, 8, 6, hair);
        if (longHair) R(g, 4, 7, 8, 2, hair);
      } else if (dir === 'left') {
        R(g, 4, 1, 8, 2, hair); R(g, 8, 3, 4, 3, hair); R(g, 4, 3, 1, 1, hair);
        if (longHair) R(g, 9, 6, 3, 3, hair);
        P(g, 6, 4, 0);
        if (beard) R(g, 5, 5, 4, 3, beard);
      } else {
        R(g, 4, 1, 8, 2, hair); R(g, 4, 3, 1, 3, hair); R(g, 11, 3, 1, 3, hair); P(g, 5, 3, hair); P(g, 10, 3, hair);
        if (longHair) { R(g, 4, 6, 1, 3, hair); R(g, 11, 6, 1, 3, hair); }
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
  const SPR = {
    hero: buildChar({ hair: 4, shirt: 8, shirt2: 2, pants: 2 }),
    elder: buildChar({ hair: 10, shirt: 5, shirt2: 0, pants: 5, robe: true, beard: 15 }),
    wren: buildChar({ hair: 6, shirt: 15, shirt2: 10, pants: 13, longHair: true }),
    pip: buildChar({ hair: 14, shirt: 9, shirt2: 4, pants: 4 }),
    bram: buildChar({ hair: 0, shirt: 6, shirt2: 1, pants: 3, beard: 4, apron: 4, belt: 0 }),
    cat: buildStatic(catSprite(0), catSprite(1)),
    king: buildStatic(slimeSprite(0, 8, 2, true), slimeSprite(1, 8, 2, true)),
  };
  const ENEMY_SPR = {
    slime: [0, 1].map((f) => slimeSprite(f, 11, 5)),
    gloop: [0, 1].map((f) => slimeSprite(f, 13, 8)),
    king: [0, 1].map((f) => slimeSprite(f, 8, 2, true)),
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
  const SHARD_SPR = [0, 1].map((f) => outlined(mk(16, 16, (g) => {
    P(g, 8, 5, 13); R(g, 7, 6, 3, 1, 13); R(g, 6, 7, 5, 2, 13); R(g, 7, 9, 3, 1, 13); P(g, 8, 10, 13);
    P(g, 7, 7, 15); P(g, 8, 6, 15); R(g, 9, 8, 2, 1, 8); P(g, 8, 10, 8);
    if (f) { P(g, 12, 4, 15); P(g, 12, 3, 15); P(g, 11, 4, 15); } else { P(g, 4, 6, 15); }
  })));

  // name, base stats, gold range, battle intro
  const ENEMIES = {
    slime: { name: 'SLIME', hp: 12, atk: 4, def: 0, xp: 5, gold: [3, 5], intro: 'oozes out!' },
    shroom: { name: 'SHROOMLET', hp: 16, atk: 5, def: 1, xp: 7, gold: [4, 6], intro: 'pops up!' },
    bat: { name: 'CAVE BAT', hp: 26, atk: 11, def: 2, xp: 12, gold: [6, 9], intro: 'swoops down!', cave: true },
    gloop: { name: 'GLOOP', hp: 36, atk: 13, def: 3, xp: 15, gold: [8, 11], intro: 'bubbles up!', cave: true },
    king: { name: 'DADDA BOSS', hp: 140, atk: 15, def: 5, xp: 80, gold: [100, 100], intro: 'blocks your way!', boss: true },
  };
  const WEAPONS = { none: { name: 'STICK', atk: 0 }, iron: { name: 'IRON SWORD', atk: 3 }, crystal: { name: 'CRYSTAL SWD', atk: 7 } };
  const ARMORS = { none: { name: 'TUNIC', def: 0 }, vest: { name: 'TOUGH VEST', def: 2 } };

  // ---------------------------------------------------------------- maps
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
        '#.........=========E',
        '#..RCRR.bx=...,FFFS#',
        '#..HHDH...=..T.uuu.#',
        '#....======....uuu.#',
        '#.T.......,..~~~...#',
        '#;..,.....T..~~~.T.#',
        '#..T..,..;.........#',
        '####################',
      ],
      exits: { '19,7': { map: 'forest', x: 1, y: 7, dir: 'right' } },
      signs: {
        '18,8': ['EAST: WHISPER WOODS.', 'Beware of slimes!'],
        '12,6': ['The village well. The water is cool and clear.', 'Somewhere far below, something goes *plip*.'],
        '9,3': ['A turnip with a big bite taken out of it.', 'The bite marks are... wobbly. Slimes!'],
      },
      forge: '4,8', // this chimney gets darker smoke and the odd spark
      encounter: null,
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
      encounter: { tile: 'g', table: [['slime', 0.6], ['shroom', 0.4]] },
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
      encounter: { tile: 'c', table: [['bat', 0.5], ['gloop', 0.5]] },
    },
  };
  for (const m of Object.values(MAPS)) { m.h = m.rows.length; m.w = m.rows[0].length; }

  const ITEMS = [
    { id: 'shard1', map: 'cave', x: 17, y: 3 },
    { id: 'shard2', map: 'cave', x: 3, y: 12 },
  ];

  // ---------------------------------------------------------------- state
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const STEP_FRAMES = 10;

  const QUESTS = {
    slimes: { title: 'SLIME TROUBLE', turnIn: 'ELDER' },
    biscuit: { title: 'LOST BISCUIT', turnIn: 'PIP' },
    glowcap: { title: 'GLOWCAP BREW', turnIn: 'WREN' },
    king: { title: 'THE DADDA BOSS', turnIn: 'ELDER' },
    shards: { title: 'CRYSTAL EDGE', turnIn: 'BRAM' },
  };
  const QUEST_ORDER = ['slimes', 'biscuit', 'glowcap', 'king', 'shards'];

  const newPlayer = () => ({
    map: 'village', x: 5, y: 4, dir: 'down', moving: false, fx: 5, fy: 4, tx: 5, ty: 4, t: 0,
    lvl: 1, hp: 30, maxhp: 30, atk: 6, def: 1, xp: 0, next: 12,
    herbs: 3, maxHerbs: 3, gold: 0, weapon: 'none', armor: 'none',
    shards: 0, glowcaps: 0, sickle: false, sinceBattle: 0,
  });
  // quest state s: 0 not started, 1 active, 2 ready to turn in, 3 done
  const newQuests = () => ({ slimes: { s: 0, n: 0 }, biscuit: { s: 0 }, glowcap: { s: 0 }, king: { s: 0 }, shards: { s: 0 } });

  const player = newPlayer();
  let q = newQuests();
  let flags = {};
  let stats = { won: 0, slimes: 0, steps: 0 };
  let tracked = null;

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
    return {
      text: {
        slimes: `SLIMES ${q.slimes.n}/3`, biscuit: 'FIND BISCUIT', glowcap: `GLOWCAPS ${player.glowcaps}/3`,
        king: 'DADDA BOSS', shards: `SHARDS ${player.shards}/2`,
      }[tracked],
    };
  }
  function questProgress(id) {
    const s = q[id].s;
    if (s === 3) return 'DONE';
    if (s === 2) return `SEE ${QUESTS[id].turnIn}`;
    return {
      slimes: `${q.slimes.n}/3 SLIMES`, biscuit: 'FIND THE CAT', glowcap: `${player.glowcaps}/3 GLOWCAPS`,
      king: 'IN CRYSTAL CAVE', shards: `${player.shards}/2 SHARDS`,
    }[id];
  }

  // ---------------------------------------------------------------- npcs
  const NPCS = [
    {
      id: 'elder', map: 'village', x: 8, y: 6, dir: 'down', home: 'down', spr: SPR.elder,
      // (slimes done but king not started = a save made mid-conversation; offer the king quest again)
      news: () => q.slimes.s === 0 || q.slimes.s === 2 || (q.slimes.s === 3 && q.king.s === 0) || q.king.s === 2,
      talk() {
        const N = 'ELDER MOSS';
        const kingIntro = () => say(N, [
          'But I fear more will come. The slimes pour out of Crystal Cave, past the east edge of the woods.',
          'Their ruler, the DADDA BOSS, sends them to raid us.',
          'Take my old sickle. It can cut through the thorny vines that block the cave. (Got the OLD SICKLE!)',
          'The Dadda Boss is strong. Grow stronger first, and visit Bram the smith for better gear.',
        ], () => { player.sickle = true; accept('king'); });
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
            fadeOut(() => { mode = 'victory'; victory = { t: 0 }; SFX.victory(); }, 40);
          });
        } else {
          say(N, [pick([
            'Thanks to you, the turnips grow in peace. Rest well, MICHAEL.',
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
          'Those turnips are MINE, little MICHAEL! Prepare to be absorbed!',
        ], () => { encounter = { t: 0, type: 'king' }; SFX.encounter(); });
      },
    },
  ];
  const npcVisible = (n) => !n.visible || n.visible();
  const npcAt = (map, x, y) => NPCS.find((n) => n.map === map && n.x === x && n.y === y && npcVisible(n));
  const itemAt = (map, x, y) => ITEMS.find((i) => i.map === map && i.x === x && i.y === y && !flags[i.id]);
  function tileAt(m, x, y) {
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return '#';
    const ch = m.rows[y][x];
    return ch === 'V' && flags.vines ? 'g' : ch;
  }
  const canWalk = (x, y) => !SOLID.has(tileAt(MAPS[player.map], x, y)) && !npcAt(player.map, x, y);

  // ---------------------------------------------------------------- save / load
  function saveGame() {
    try {
      const p = { ...player, moving: false, fx: player.x, fy: player.y, tx: player.x, ty: player.y, t: 0 };
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, player: p, q, flags, stats, tracked }));
      savedT = 90;
    } catch (e) { /* storage unavailable */ }
  }
  function readSave() {
    try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); return d && d.v === 1 ? d : null; } catch (e) { return null; }
  }
  function loadGame() {
    const d = readSave();
    if (!d) return false;
    Object.assign(player, newPlayer(), d.player);
    q = Object.assign(newQuests(), d.q);
    flags = d.flags || {};
    stats = Object.assign({ won: 0, slimes: 0, steps: 0 }, d.stats);
    tracked = d.tracked || null;
    return true;
  }
  function newGame() {
    Object.assign(player, newPlayer());
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
  function openShop() { shop = { sel: 0, note: '', noteT: 0 }; mode = 'shop'; }
  function buy(item) {
    const note = (t, ok) => { shop.note = t; shop.noteT = 120; ok ? SFX.coin() : SFX.deny(); };
    if (item.id === 'exit') { mode = 'world'; shop = null; SFX.move(); return; }
    if (item.id === 'herb' && player.herbs >= player.maxHerbs) return note('Your pouch is full!');
    if (item.id === 'iron' && player.weapon !== 'none') return note('You have a better blade.');
    if (item.id === 'vest' && player.armor === 'vest') return note('You already wear one.');
    if (player.gold < item.price) return note('Not enough gold!');
    player.gold -= item.price;
    if (item.id === 'herb') player.herbs++;
    if (item.id === 'iron') player.weapon = 'iron';
    if (item.id === 'vest') player.armor = 'vest';
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
      const owned = (it.id === 'iron' && player.weapon !== 'none') || (it.id === 'vest' && player.armor === 'vest');
      text(it.name, 42, y, owned ? 7 : 15);
      if (it.price) rtext(owned ? 'OWNED' : `${it.price}G`, 210, y, owned ? 7 : 14);
      if (shop.sel === i && Math.floor(tick / 16) % 3) cursor(30, y);
    });
    box(4, 108, 232, 48);
    const msg = shop.noteT > 0 ? shop.note : SHOP[shop.sel].desc();
    wrap(msg, 27).forEach((l, i) => text(l, 12, 117 + i * 11));
  }

  // ---------------------------------------------------------------- status menu
  function updateMenu() {
    if (aPressed || bPressed) { mode = 'world'; menuOpen = null; SFX.move(); }
  }
  function drawMenu() {
    R(ctx, 0, 0, W, H, 0);
    box(2, 2, 92, 156);
    text('MICHAEL', 10, 9, 14);
    const lines = [
      [`LV ${player.lvl}`, 15], [`HP ${player.hp}/${player.maxhp}`, 15], [`ATK ${atk()}`, 15], [`DEF ${def()}`, 15],
      [`XP ${player.xp}/${player.next}`, 13], [`GOLD ${player.gold}`, 14], [`HERB ${player.herbs}/${player.maxHerbs}`, 11],
    ];
    lines.forEach(([s, c], i) => text(s, 10, 24 + i * 12, c));
    text(WEAPONS[player.weapon].name, 10, 114, 10);
    text(ARMORS[player.armor].name, 10, 126, 10);
    if (player.sickle) text('SICKLE', 10, 138, 10);
    box(96, 2, 142, 156);
    text('QUESTS', 104, 9, 14);
    const known = QUEST_ORDER.filter((id) => q[id].s > 0);
    if (!known.length) text('None yet.', 104, 26, 10);
    known.forEach((id, i) => {
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
    if (sign) { SFX.move(); say('', sign); return; }
    if (tileAt(m, x, y) === 'V') {
      if (player.sickle) {
        SFX.cut();
        flags.vines = true;
        say('', ['You hack through the thorny vines with the old sickle. The way east is open!'], saveGame);
      } else say('', ['Thick, thorny vines block the way east.']);
    }
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
    if (item) {
      flags[item.id] = true;
      player.shards++;
      if (player.shards >= 2) markReady('shards');
      SFX.pickup();
      held.length = 0;
      say('', [`You found a CRYSTAL SHARD! (${player.shards} held)`], saveGame);
      return;
    }
    if (m.encounter && tileAt(m, player.x, player.y) === m.encounter.tile) {
      player.sinceBattle++;
      if (player.sinceBattle > 3 && Math.random() < 0.13) {
        player.sinceBattle = 0;
        held.length = 0;
        encounter = { t: 0 };
        SFX.encounter();
      }
    }
  }
  // ---------------------------------------------------------------- living village (visual only, never saved)
  const LOOKERS = new Set(['elder', 'wren', 'pip', 'bram']);
  const faceToward = (dx, dy) => (Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  // Villagers glance around now and then; they face Michael when he is right next to them,
  // and a villager with a "!" notices him from two tiles away.
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
    if (player.map !== 'village') { amb.ripple = null; return; }
    if (amb.ripple && ++amb.ripple.t >= 36) amb.ripple = null;
    if (--amb.nextRipple <= 0) {
      amb.nextRipple = rand(240, 420);
      const m = MAPS.village, ponds = [];
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
  function drawSmokeAndButterflies(m, camX, camY) {
    let i = 0;
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
      if (m.rows[ty][tx] !== 'C') continue;
      const forge = m.forge === `${tx},${ty}`;
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
    [[152, 36, 15, 0], [72, 196, 14, 2.1]].forEach(([ax, ay, c, ph]) => {
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
    if (bPressed) { queuedDir = null; mode = 'menu'; menuOpen = true; SFX.select(); return; }
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
      if (it.map !== player.map || flags[it.id]) continue;
      const bob = Math.floor(tick / 20) % 2;
      ctx.drawImage(SHARD_SPR[Math.floor(tick / 15) % 2], it.x * TS - camX, it.y * TS - camY - bob);
    }
    const village = player.map === 'village';
    if (village) drawRipple(camX, camY);
    const npcs = NPCS.filter((n) => n.map === player.map && npcVisible(n));
    const ents = npcs.map((n) => {
      const f = n.anim ? Math.floor(tick / 20) % 2 : (Math.floor((tick + n.x * 13) / 40) % 6 === 0 ? 1 : 0);
      return { x: n.x * TS, y: n.y * TS, img: n.spr[n.dir + f], news: n.news && n.news() };
    });
    const frame = player.moving && player.t < 0.5 ? 1 : 0;
    ents.push({ x: px, y: py, img: SPR.hero[player.dir + frame] });
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) ctx.drawImage(e.img, Math.round(e.x - camX), Math.round(e.y - camY - 1));
    if (village) drawSmokeAndButterflies(m, camX, camY);
    for (const e of ents) if (e.news) bubble(Math.round(e.x - camX) + 5, Math.round(e.y - camY) - 11 - (Math.floor(tick / 15) % 2));
    if (player.map === 'cave') { // dim the edges of the cave
      ctx.globalAlpha = 0.35;
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
    const enc = MAPS[player.map].encounter;
    if (player.map === 'forest') {
      // Slimes are more common during the slime quest; never more than 2 shroomlets in a row.
      const slimeOdds = q.slimes.s === 1 ? 0.75 : 0.6;
      const type = (Math.random() < slimeOdds || shroomStreak >= 2) ? 'slime' : 'shroom';
      shroomStreak = type === 'shroom' ? shroomStreak + 1 : 0;
      return type;
    }
    let r = Math.random();
    for (const [type, p] of enc.table) { if ((r -= p) < 0) return type; }
    return enc.table[0][0];
  }
  function startBattle(type) {
    type = type || pickEnemy();
    const e = ENEMIES[type];
    const L = e.boss ? 0 : e.cave ? Math.max(0, player.lvl - 5) : player.lvl - 1;
    const hp = e.hp + L * 3;
    battle = {
      type, name: e.name, boss: !!e.boss, hp, max: hp, shownHp: hp,
      atk: e.atk + L, def: e.def + Math.floor(L / 2), xp: e.xp + L * 2, gold: rand(...e.gold),
      cave: player.map === 'cave', turn: 0, charged: false, wobbled: false,
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
    await msg(`${battle.boss ? 'The' : 'A'} ${battle.name} ${intro}`, 700);
    toMenu();
  }
  const enemyX = () => (battle.boss ? 64 : 64);
  async function act(choice) {
    battle.phase = 'busy';
    SFX.select();
    if (choice === 0) {
      await msg('You swing your sword!', 150);
      const crit = Math.random() < 0.12;
      let dmg = Math.max(1, atk() + rand(0, 2) - battle.def);
      if (crit) dmg = Math.floor(dmg * 1.8);
      battle.hp = Math.max(0, battle.hp - dmg);
      battle.flash = 24;
      crit ? SFX.crit() : SFX.hit();
      float(enemyX(), battle.boss ? 24 : 36, crit ? `${dmg}!` : `${dmg}`, crit ? 14 : 15);
      if (crit) await msg('A critical hit!', 400); else await wait(500);
      if (battle.hp <= 0) return winBattle();
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
      if (battle.boss) {
        await msg("There's no escape from the Dadda Boss!", 500);
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
    if (b.boss) {
      if (b.charged) {
        b.charged = false;
        await msg('BELLY FLOP!!', 100);
        await enemyHit(2.2);
      } else if (b.turn % 3 === 0) {
        b.charged = true;
        SFX.charge();
        await msg('The DADDA BOSS puffs up huge! Brace yourself!', 900);
        return toMenu();
      } else {
        await msg(`${b.name} attacks!`, 100);
        await enemyHit(1);
      }
      if (!b.wobbled && b.hp < b.max * 0.3) { b.wobbled = true; await msg('The DADDA BOSS is wobbling!', 600); }
    } else {
      await msg(`${b.name} attacks!`, 100);
      await enemyHit(1);
    }
    if (player.hp <= 0) return loseBattle();
    toMenu();
  }
  async function winBattle() {
    const b = battle;
    b.dying = 40;
    SFX.defeat();
    await wait(700);
    b.gone = true;
    stats.won++;
    await msg(b.boss ? 'The DADDA BOSS melts into a puddle!' : `${b.name} is defeated!`, 600);
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
    if (b.type === 'shroom' && q.glowcap.s === 1 && Math.random() < 0.6) {
      player.glowcaps++;
      SFX.pickup();
      await msg(`It dropped a GLOWCAP! (${player.glowcaps}/3)`, 900);
      if (player.glowcaps >= 3) { markReady('glowcap'); await msg('That is enough glowcaps for Wren!', 900); }
    }
    if (b.boss) {
      markReady('king');
      await msg('The cave falls quiet. Return to Elder Moss!', 1000);
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
    fadeOut(() => { battle = null; mode = 'world'; held.length = 0; saveGame(); }, 36);
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
  function drawBackdrop(cave) {
    if (cave) {
      R(ctx, 0, 0, W, 60, 1);
      for (let x = 0; x < W; x += 12) { // stalactites
        const h = 6 + Math.floor(hash(x, 3) * 14);
        for (let i = 0; i < h; i++) { const w = Math.max(1, Math.round((h - i) / h * 4)); R(ctx, x + 6 - w, i, w * 2, 1, i < 2 ? 7 : 3); }
      }
      for (let i = 0; i < 10; i++) { const x = (i * 29 + 7) % W, y = 30 + (i * 13) % 26; P(ctx, x, y, Math.floor((tick + i * 11) / 25) % 3 ? 13 : 15); }
      R(ctx, 0, 60, W, 44, 3);
      for (let y = 62; y < 104; y += 2) for (let x = 0; x < W; x += 2) if (hash(x, y) < 0.04) P(ctx, x, y, 7);
      for (const x of [10, 200, 226]) ctx.drawImage(TILE['k'], x, 52);
    } else {
      R(ctx, 0, 0, W, 60, 2);
      for (let i = 0; i < 12; i++) { const x = (i * 37 + 11) % W, y = (i * 23) % 40; P(ctx, x, y, Math.floor((tick + i * 9) / 30) % 4 ? 13 : 15); }
      for (let x = -8; x < W + 16; x += 16) ctx.drawImage(TILE['P'], x + ((x / 16) % 2 ? 0 : 8), 44 + ((x / 16) % 3) * 2);
      R(ctx, 0, 60, W, 44, 5);
      for (let y = 62; y < 104; y += 3) for (let x = 0; x < W; x += 2) if (hash(x, y) < 0.04) { P(ctx, x, y, 11); P(ctx, x, y - 1, 11); }
    }
  }
  function drawBattle() {
    const b = battle;
    ctx.save();
    if (b.shake > 0) { const s = b.shake > 14 ? 4 : 2; ctx.translate(rand(-s, s), rand(-s, s)); }
    drawBackdrop(b.cave);
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
    box(132, 64, 104, 36);
    text('MICHAEL', 138, 69, 14);
    text(`LV${player.lvl}`, 202, 69, 15);
    text(`HP${player.hp}/${player.maxhp}`, 138, 79);
    bar(138, 91, 92, b.playerShownHp, player.maxhp);
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
    ctx.drawImage(SPR.hero['right' + bob], 88, 112, 16, 16);
    centered('For Michael', 144, 12);
    ctx.drawImage(ENEMY_SPR.slime[bob], 130, 112, 16, 16);
    if (title.hasSave) {
      ['CONTINUE', 'NEW GAME'].forEach((s, i) => {
        text(s, 88, 80 + i * 13, title.sel === i ? 15 : 7);
        if (title.sel === i && Math.floor(tick / 16) % 3) cursor(76, 80 + i * 13);
      });
    } else if (Math.floor(tick / 30) % 2) centered(isTouch ? 'TAP A TO START' : 'PRESS SPACE', 88, 15);
  }
  function drawVictory() {
    R(ctx, 0, 0, W, H, 0);
    drawStars(60);
    const t = victory.t;
    for (let i = 0; i < 24; i++) {
      const x = (hash(i, 5) * W + Math.sin((t + i * 20) / 20) * 6) | 0;
      const y = ((hash(i, 6) * H + t * (0.4 + hash(i, 7))) % (H + 10)) - 5 | 0;
      R(ctx, x, y, 2, 2, [14, 6, 13, 11, 9][i % 5]);
    }
    centered('VICTORY!', 12, 14, BIG);
    centered('The Dadda Boss is no more.', 32, 13);
    const bob = Math.floor(t / 12) % 2 ? -2 : 0;
    ctx.drawImage(SPR.hero.down0, 72, 44 + bob, 32, 32);
    ctx.drawImage(SPR.elder.down0, 104, 44, 32, 32);
    ctx.drawImage(SPR.pip.down0, 136, 44 - bob, 32, 32);
    const done = QUEST_ORDER.filter((id) => q[id].s === 3).length;
    centered(`LEVEL ${player.lvl}   QUESTS ${done}/5`, 84, 15);
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
        else { newGame(); startPlaying(true); }
      }
    } else if (mode === 'world') updateWorld();
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
      ctx.globalAlpha = 0.7; R(ctx, 0, 0, W, H, encounter.type === 'king' ? 6 : 15); ctx.globalAlpha = 1;
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
    player, NPCS, MAPS,
    get q() { return q; }, get flags() { return flags; }, get stats() { return stats; },
    get mode() { return mode; }, get battle() { return battle; }, get shop() { return shop; },
  };
})();
