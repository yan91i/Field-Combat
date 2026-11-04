/* ============================================================
 *  gfx.js — 调色板 / 5x7 位图字体 / 像素精灵工厂
 *  暴露: window.GFX = { PAL, S, text, textWidth, sprite, flipV }
 * ============================================================ */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------
   *  NES 风格受限调色板
   * ---------------------------------------------------------- */
  const PAL = {
    black: '#000000',
    white: '#fcfcfc',
    gray: '#bcbcbc',
    grayDk: '#7c7c7c',
    grayDk2: '#4c4c4c',
    grayDk3: '#282828',

    red: '#d82800',
    redDk: '#8c0000',
    redLt: '#fc7460',
    redBr: '#fc2020',

    blue: '#0058f8',
    blueDk: '#0000a8',
    blueLt: '#3cbcfc',
    cyan: '#7cfcfc',

    green: '#00a800',
    greenDk: '#005000',
    greenLt: '#58d854',

    olive: '#b8b800',
    yellow: '#fce400',
    orange: '#e45c10',
    brown: '#a04000',
    brownDk: '#503000',
    tan: '#d8b878',
    tanDk: '#a07030'
  };

  /* ------------------------------------------------------------
   *  5 x 7 位图字体
   * ---------------------------------------------------------- */
  const RAW_FONT = {
    '0': '01110/10001/10011/10101/11001/10001/01110',
    '1': '00100/01100/00100/00100/00100/00100/01110',
    '2': '01110/10001/00001/00010/00100/01000/11111',
    '3': '11111/00010/00100/00010/00001/10001/01110',
    '4': '00010/00110/01010/10010/11111/00010/00010',
    '5': '11111/10000/11110/00001/00001/10001/01110',
    '6': '00110/01000/10000/11110/10001/10001/01110',
    '7': '11111/00001/00010/00100/01000/01000/01000',
    '8': '01110/10001/10001/01110/10001/10001/01110',
    '9': '01110/10001/10001/01111/00001/00010/01100',
    'A': '01110/10001/10001/11111/10001/10001/10001',
    'B': '11110/10001/10001/11110/10001/10001/11110',
    'C': '01110/10001/10000/10000/10000/10001/01110',
    'D': '11100/10010/10001/10001/10001/10010/11100',
    'E': '11111/10000/10000/11110/10000/10000/11111',
    'F': '11111/10000/10000/11110/10000/10000/10000',
    'G': '01110/10001/10000/10111/10001/10001/01111',
    'H': '10001/10001/10001/11111/10001/10001/10001',
    'I': '01110/00100/00100/00100/00100/00100/01110',
    'J': '00111/00010/00010/00010/00010/10010/01100',
    'K': '10001/10010/10100/11000/10100/10010/10001',
    'L': '10000/10000/10000/10000/10000/10000/11111',
    'M': '10001/11011/10101/10101/10001/10001/10001',
    'N': '10001/11001/10101/10011/10001/10001/10001',
    'O': '01110/10001/10001/10001/10001/10001/01110',
    'P': '11110/10001/10001/11110/10000/10000/10000',
    'Q': '01110/10001/10001/10001/10101/10010/01101',
    'R': '11110/10001/10001/11110/10100/10010/10001',
    'S': '01111/10000/10000/01110/00001/00001/11110',
    'T': '11111/00100/00100/00100/00100/00100/00100',
    'U': '10001/10001/10001/10001/10001/10001/01110',
    'V': '10001/10001/10001/10001/10001/01010/00100',
    'W': '10001/10001/10001/10101/10101/11011/10001',
    'X': '10001/10001/01010/00100/01010/10001/10001',
    'Y': '10001/10001/01010/00100/00100/00100/00100',
    'Z': '11111/00001/00010/00100/01000/10000/11111',
    '-': '00000/00000/00000/11111/00000/00000/00000',
    '_': '00000/00000/00000/00000/00000/00000/11111',
    '.': '00000/00000/00000/00000/00000/01100/01100',
    ',': '00000/00000/00000/00000/01100/00100/01000',
    ':': '00000/01100/01100/00000/01100/01100/00000',
    '/': '00001/00010/00010/00100/01000/01000/10000',
    '!': '00100/00100/00100/00100/00100/00000/00100',
    '?': '01110/10001/00001/00110/00100/00000/00100',
    '*': '00000/10101/01110/11111/01110/10101/00000',
    '+': '00000/00100/00100/11111/00100/00100/00000',
    '=': '00000/00000/11111/00000/11111/00000/00000',
    '(': '00100/01000/10000/10000/10000/01000/00100',
    ')': '00100/00010/00001/00001/00001/00010/00100',
    ' ': '00000/00000/00000/00000/00000/00000/00000'
  };

  const FONT = {};
  for (const k in RAW_FONT) FONT[k] = RAW_FONT[k].split('/').join('');

  const glyphCache = new Map();

  function glyphCanvas(ch, color) {
    const key = ch + '\u0000' + color;
    let c = glyphCache.get(key);
    if (c) return c;
    const bits = FONT[ch] || FONT[' '];
    c = document.createElement('canvas');
    c.width = 5; c.height = 7;
    const g = c.getContext('2d');
    g.fillStyle = color;
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 5; x++) {
        if (bits[y * 5 + x] === '1') g.fillRect(x, y, 1, 1);
      }
    }
    glyphCache.set(key, c);
    return c;
  }

  /** 绘制字符串（自动大写，仅支持 0-9 A-Z 与少数字符） */
  function text(ctx, str, x, y, color, scale) {
    scale = scale || 1;
    str = String(str).toUpperCase();
    let cx = x;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch !== ' ') ctx.drawImage(glyphCanvas(ch, color), cx, y, 5 * scale, 7 * scale);
      cx += 6 * scale;
    }
    return cx;
  }

  /** 居中绘制 */
  function textC(ctx, str, cx, y, color, scale) {
    scale = scale || 1;
    const w = String(str).length * 6 * scale - scale;
    return text(ctx, str, Math.round(cx - w / 2), y, color, scale);
  }

  function textWidth(str, scale) {
    scale = scale || 1;
    return String(str).length * 6 * scale - scale;
  }

  /* ------------------------------------------------------------
   *  像素精灵工厂
   * ---------------------------------------------------------- */
  function mk(w, h, fn) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const R = function (x, y, ww, hh, col) {
      if (ww <= 0 || hh <= 0) return;
      g.fillStyle = col;
      g.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh));
    };
    const P = function (x, y, col) { R(x, y, 1, 1, col); };
    const DISC = function (cx, cy, r, col) {
      for (let y = -r; y <= r; y++) {
        const ww = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
        R(cx - ww, cy + y, ww * 2 + 1, 1, col);
      }
    };
    const RING = function (cx, cy, r, col) {
      for (let y = -r; y <= r; y++) {
        const ww = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
        P(cx - ww, cy + y, col);
        P(cx + ww, cy + y, col);
      }
    };
    fn(R, P, DISC, RING);
    return c;
  }

  function flipV(src) {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    g.translate(0, src.height);
    g.scale(1, -1);
    g.drawImage(src, 0, 0);
    return c;
  }

  function flipH(src) {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    g.translate(src.width, 0);
    g.scale(-1, 1);
    g.drawImage(src, 0, 0);
    return c;
  }

  /* ------------------------------------------------------------
   *  队伍配色（同一套形状，换色即成敌我）
   *  基准朝向：向上（炮口朝上），敌军使用垂直翻转版本
   * ---------------------------------------------------------- */
  const T_ALLY = { main: PAL.blue, dark: PAL.blueDk, light: PAL.blueLt, trim: PAL.cyan, gun: PAL.grayDk };
  const T_ENEMY = { main: PAL.red, dark: PAL.redDk, light: PAL.redLt, trim: PAL.yellow, gun: PAL.grayDk };
  const T_NEUT = { main: PAL.gray, dark: PAL.grayDk, light: PAL.white, trim: PAL.redBr, gun: PAL.grayDk2 };

  /* ---------- 各兵种绘制函数（基准朝上） ---------- */

  // 自机：ジェネシス-3（飞碟母舰）
  function dGenesis(R, P, D, G, t) {
    R(6, 1, 4, 1, t.light);
    R(5, 2, 6, 1, t.light);
    R(4, 3, 8, 1, t.main);
    R(4, 4, 8, 1, t.main);
    R(2, 5, 12, 1, t.main);
    R(1, 6, 14, 1, t.main);
    R(1, 7, 14, 1, t.dark);
    R(2, 8, 12, 1, t.dark);
    P(3, 9, PAL.yellow); P(4, 9, PAL.yellow);
    P(7, 9, PAL.yellow); P(8, 9, PAL.yellow);
    P(11, 9, PAL.yellow); P(12, 9, PAL.yellow);
    R(4, 10, 8, 1, t.light);
    R(6, 11, 4, 1, PAL.cyan);
  }

  // 步兵 ソルジャー（pose: 0/1 = 行走两帧, 2 = 站立, 'fire' = 蹲下扛火箭筒）
  function dSoldierPose(R, P, D, G, t, pose) {
    if (pose === 'fire') {
      // 蹲伏瞄准：压低身体，肩扛火箭筒
      R(6, 5, 4, 1, t.light);          // 钢盔
      R(5, 6, 6, 1, t.light);
      R(4, 7, 8, 3, t.main);           // 蹲下的躯干
      R(4, 9, 8, 1, t.dark);
      R(3, 10, 10, 2, t.gun);          // 屈膝的腿
      R(3, 12, 4, 1, PAL.grayDk2);
      R(9, 12, 4, 1, PAL.grayDk2);
      R(7, 1, 2, 7, PAL.grayDk2);      // 火箭筒管
      R(6, 1, 4, 2, PAL.gray);         // 筒口
      R(5, 7, 6, 2, t.dark);           // 肩托
      return;
    }
    // 头 / 躯干（行走与站立共用）
    R(6, 3, 4, 1, t.light);
    R(5, 4, 6, 1, t.light);
    R(5, 5, 6, 1, t.main);
    R(5, 6, 6, 1, t.main);
    R(6, 7, 4, 1, t.dark);
    R(4, 5, 1, 2, t.dark); R(11, 5, 1, 2, t.dark);
    R(7, 6, 2, 5, PAL.grayDk2);        // 步枪
    if (pose === 0) {                  // 左腿踏出
      R(5, 8, 2, 3, t.gun);
      R(9, 8, 2, 5, t.gun);
      P(5, 10, PAL.gray); P(10, 13, PAL.gray);
    } else if (pose === 1) {           // 右腿踏出
      R(5, 8, 2, 5, t.gun);
      R(9, 8, 2, 3, t.gun);
      P(5, 13, PAL.gray); P(10, 10, PAL.gray);
    } else {                           // 站立
      R(5, 8, 2, 5, t.gun);
      R(9, 8, 2, 5, t.gun);
      P(5, 13, PAL.gray); P(10, 13, PAL.gray);
    }
  }

  function dSoldier(R, P, D, G, t) { dSoldierPose(R, P, D, G, t, 2); }

  // 装甲车 キース
  function dKeith(R, P, D, G, t) {
    R(7, 1, 2, 4, t.gun);          // 机炮
    R(2, 6, 12, 8, t.dark);        // 底盘
    R(2, 7, 12, 5, t.main);
    R(2, 7, 12, 1, t.light);
    R(5, 5, 6, 6, t.main);         // 炮塔
    R(5, 5, 6, 1, t.light);
    R(7, 7, 2, 3, t.dark);
    R(1, 7, 1, 6, PAL.grayDk2);
    R(14, 7, 1, 6, PAL.grayDk2);
    R(3, 13, 3, 2, PAL.grayDk2);
    R(10, 13, 3, 2, PAL.grayDk2);
  }

  // 主战坦克 HEL-99A
  function dTank(R, P, D, G, t) {
    R(7, 0, 2, 5, t.gun);          // 主炮
    R(6, 0, 4, 2, PAL.gray);
    R(1, 5, 3, 10, PAL.grayDk2);   // 履带
    R(12, 5, 3, 10, PAL.grayDk2);
    R(1, 6, 3, 1, PAL.black); R(1, 9, 3, 1, PAL.black); R(1, 12, 3, 1, PAL.black);
    R(12, 6, 3, 1, PAL.black); R(12, 9, 3, 1, PAL.black); R(12, 12, 3, 1, PAL.black);
    R(4, 5, 8, 10, t.main);        // 车体
    R(4, 5, 8, 1, t.light);
    R(4, 13, 8, 2, t.dark);
    D(7, 9, 3, t.light);           // 炮塔
    R(7, 8, 2, 3, t.dark);
  }

  // 长射程炮 FL-880（防空 / 重炮）
  function dFL880(R, P, D, G, t) {
    R(7, 0, 2, 8, t.gun);          // 长炮管
    R(6, 0, 4, 2, PAL.gray);
    R(6, 7, 4, 3, t.dark);         // 炮座
    R(2, 10, 12, 5, t.main);       // 车体
    R(2, 10, 12, 1, t.light);
    R(2, 13, 12, 2, t.dark);
    R(3, 15, 4, 1, PAL.grayDk2);
    R(9, 15, 4, 1, PAL.grayDk2);
    P(3, 11, t.trim); P(12, 11, t.trim);
  }

  // 武装直升机 ルイス-T
  function dHeli(R, P, D, G, t) {
    G(7, 7, 7, PAL.grayDk2);       // 旋翼
    G(7, 7, 6, PAL.grayDk3);
    D(7, 8, 3, t.main);            // 机身
    R(6, 4, 3, 3, t.light);        // 机首
    R(6, 3, 3, 1, t.trim);
    R(4, 11, 8, 1, t.dark);
    R(3, 12, 3, 1, PAL.grayDk2);
    R(11, 12, 3, 1, PAL.grayDk2);
    P(7, 13, PAL.grayDk2); P(7, 14, PAL.grayDk2);
  }

  // 敌军主力兵器 ディオロフ（24x24）
  function dDioroff(R, P, D, G, t) {
    R(1, 7, 4, 14, PAL.grayDk2);   // 履带
    R(19, 7, 4, 14, PAL.grayDk2);
    for (let i = 0; i < 6; i++) {
      R(1, 8 + i * 2, 4, 1, PAL.black);
      R(19, 8 + i * 2, 4, 1, PAL.black);
    }
    R(5, 6, 14, 15, t.dark);       // 车体
    R(5, 7, 14, 13, t.main);
    R(5, 7, 14, 1, t.light);
    R(5, 17, 14, 3, t.dark);
    R(4, 3, 5, 4, t.light);        // 导弹巢
    R(15, 3, 5, 4, t.light);
    P(5, 4, PAL.black); P(7, 4, PAL.black); P(5, 6, PAL.black); P(7, 6, PAL.black);
    P(16, 4, PAL.black); P(18, 4, PAL.black); P(16, 6, PAL.black); P(18, 6, PAL.black);
    D(12, 12, 6, t.dark);          // 炮塔
    D(12, 12, 5, t.main);
    D(12, 12, 2, PAL.redBr);
    R(11, 0, 2, 9, PAL.grayDk2);   // 主炮
    R(10, 0, 4, 2, PAL.gray);
    R(12, 19, 5, 4, PAL.grayDk2);
  }

  // X-BC 固定炮台（基准朝上，敌军用翻转版）
  function dTurret(R, P, D, G, t) {
    R(7, 0, 2, 7, PAL.grayDk2);
    R(6, 0, 4, 2, PAL.gray);
    R(2, 9, 12, 6, PAL.grayDk2);
    R(2, 9, 12, 1, PAL.gray);
    R(3, 14, 10, 2, PAL.grayDk3);
    D(7, 8, 4, PAL.grayDk2);
    D(7, 8, 3, PAL.gray);
    P(5, 10, PAL.redBr); P(7, 10, PAL.redBr); P(9, 10, PAL.redBr);
  }

  // 子弹 / 炮弹
  function dBullet(R, P, D, G, t) {
    R(6, 3, 4, 9, t.main);
    R(6, 3, 4, 3, PAL.white);
    R(6, 11, 4, 2, t.light);
  }

  /* ------------------------------------------------------------
   *  生成精灵表
   * ---------------------------------------------------------- */
  function unit(name, fn, w, h) {
    const allyUp = mk(w, h, (R, P, D, G) => fn(R, P, D, G, T_ALLY));
    const enemyUp = mk(w, h, (R, P, D, G) => fn(R, P, D, G, T_ENEMY));
    const neutUp = mk(w, h, (R, P, D, G) => fn(R, P, D, G, T_NEUT));
    return {
      ally: allyUp,
      enemy: flipV(enemyUp),
      enemyUp: enemyUp,
      neut: flipV(neutUp),
      neutUp: neutUp
    };
  }

  const S = {};

  // 自机
  S.genesis = mk(16, 16, (R, P, D, G) => dGenesis(R, P, D, G, T_ALLY));
  S.genesisHot = mk(16, 16, (R, P, D, G) => dGenesis(R, P, D, G, {
    main: PAL.white, dark: PAL.blueLt, light: PAL.white, trim: PAL.cyan, gun: PAL.grayDk
  }));
  S.genesisRed = mk(16, 16, (R, P, D, G) => dGenesis(R, P, D, G, T_ENEMY));

  S.soldier = unit('soldier', dSoldier, 16, 16);
  // 步兵行走两帧 + 蹲下扛火箭筒
  S.soldierWalk = [
    unit('soldierW0', (R, P, D, G, t) => dSoldierPose(R, P, D, G, t, 0), 16, 16),
    unit('soldierW1', (R, P, D, G, t) => dSoldierPose(R, P, D, G, t, 1), 16, 16)
  ];
  S.soldierFire = unit('soldierF', (R, P, D, G, t) => dSoldierPose(R, P, D, G, t, 'fire'), 16, 16);
  S.keith = unit('keith', dKeith, 16, 16);
  S.tank = unit('tank', dTank, 16, 16);
  S.fl880 = unit('fl880', dFL880, 16, 16);
  S.heli = unit('heli', dHeli, 16, 16);
  S.turret = unit('turret', dTurret, 16, 16);
  S.dioroff = unit('dioroff', dDioroff, 24, 24);

  // 弹丸（全部朝上，绘制时按方向旋转/翻转）
  S.bulletAlly = mk(16, 16, (R, P, D, G) => dBullet(R, P, D, G, T_ALLY));
  S.bulletEnemy = mk(16, 16, (R, P, D, G) => dBullet(R, P, D, G, T_ENEMY));
  S.bulletShell = mk(16, 16, function (R, P, D, G) {
    R(6, 2, 4, 11, PAL.yellow);
    R(6, 2, 4, 3, PAL.white);
    R(6, 11, 4, 3, PAL.orange);
  });

  // HUD 用小图标（14x14）
  function hudIcon(fn) {
    const src = mk(16, 16, (R, P, D, G) => fn(R, P, D, G, T_ALLY));
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    return c;
  }
  S.icon = {
    soldier: hudIcon(dSoldier),
    keith: hudIcon(dKeith),
    tank: hudIcon(dTank),
    fl880: hudIcon(dFL880),
    heli: hudIcon(dHeli),
    genesis: S.genesis
  };

  global.GFX = {
    PAL: PAL,
    S: S,
    text: text,
    textC: textC,
    textWidth: textWidth,
    sprite: mk,
    flipV: flipV,
    flipH: flipH
  };

})(window);
