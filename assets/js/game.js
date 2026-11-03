/* ============================================================
 *  game.js — 杀戮战场 FIELD COMBAT (Jaleco / FC 1985 复刻)
 * ============================================================ */
(function () {
  'use strict';

  const GFX = window.GFX, AU = window.AU;
  const PAL = GFX.PAL, S = GFX.S;
  const text = GFX.text, textC = GFX.textC;

  /* ============================================================
   *  常量
   * ============================================================ */
  const W = 256, H = 240;
  const HUD_H = 30, FIELD_TOP = HUD_H, FIELD_H = H - HUD_H;   // 210
  const WORLD_H = 1800;
  const CAM_MAX = WORLD_H - FIELD_H;                          // 1590
  const VIEW_OFF = 162;                                       // 自机在视野中的垂直位置
  const PLAYER_MIN_Y = 40;
  const BEAM_LEN = 180, BEAM_HALF = 18;
  const CAP_NEED = 26;
  const TURRET_Y = 150;
  const TURRET_X = [44, 90, 166, 212];
  const DOOR_L = 100, DOOR_R = 156, DOOR_TOP = 8, DOOR_BOT = 92;
  const STEP = 1000 / 60;

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(rnd(a, b + 1));
  const pad = (n, l) => String(Math.max(0, Math.floor(n))).padStart(l, '0');

  /* ============================================================
   *  数据表
   * ============================================================ */
  // 兵种（敌我共用形状，参数分别调）
  const TYPES = ['soldier', 'keith', 'tank', 'fl880', 'heli'];
  const NAME = { soldier: 'SOLDIER', keith: 'KEITH', tank: 'HEL-99A', fl880: 'FL-880', heli: 'LEWIS-T', dioroff: 'DIOROFF' };

  const ENEMY = {
    soldier: { hp: 1, spd: 0.34, cd: 142, dmg: 1, cap: true, kill: 200, capScore: 300, w: 10, h: 10, air: false, fire: 'rifle' },
    keith: { hp: 2, spd: 0.68, cd: 110, dmg: 1, cap: true, kill: 400, capScore: 500, w: 13, h: 13, air: false, fire: 'mg' },
    tank: { hp: 4, spd: 0.31, cd: 152, dmg: 2, cap: true, kill: 600, capScore: 700, w: 14, h: 14, air: false, fire: 'shell' },
    fl880: { hp: 2, spd: 0.27, cd: 172, dmg: 2, cap: true, kill: 400, capScore: 500, w: 13, h: 13, air: false, fire: 'longshell' },
    heli: { hp: 2, spd: 0.66, cd: 120, dmg: 1, cap: false, kill: 500, capScore: 0, w: 14, h: 14, air: true, fire: 'mg' },
    dioroff: { hp: 16, spd: 0.23, cd: 132, dmg: 2, cap: false, kill: 2000, capScore: 0, w: 20, h: 20, air: false, fire: 'dioroff' }
  };

  const ALLY = {
    soldier: { spd: 0.38, cd: 68, range: 82, dmg: 1, w: 10, h: 10, air: false },
    keith: { spd: 0.88, cd: 58, range: 70, dmg: 1, w: 13, h: 13, air: false },
    tank: { spd: 0.42, cd: 82, range: 96, dmg: 2, w: 14, h: 14, air: false },
    fl880: { spd: 0.30, cd: 104, range: 152, dmg: 1, w: 13, h: 13, air: false },
    heli: { spd: 0.92, cd: 76, range: 112, dmg: 2, w: 14, h: 14, air: true }
  };

  const STAGES = [
    { theme: 0, time: 90, spawn: [86, 158], pool: ['soldier', 'soldier', 'soldier', 'keith', 'tank'], air: 0.00, dioroff: 0, turretHp: 3 },
    { theme: 1, time: 90, spawn: [74, 138], pool: ['soldier', 'soldier', 'keith', 'tank', 'fl880'], air: 0.06, dioroff: 0, turretHp: 3 },
    { theme: 2, time: 95, spawn: [64, 124], pool: ['soldier', 'keith', 'tank', 'fl880', 'tank'], air: 0.10, dioroff: 1, turretHp: 4 },
    { theme: 3, time: 95, spawn: [56, 112], pool: ['keith', 'tank', 'fl880', 'soldier', 'tank'], air: 0.13, dioroff: 1, turretHp: 4 },
    { theme: 4, time: 100, spawn: [48, 104], pool: ['tank', 'fl880', 'keith', 'tank', 'soldier'], air: 0.16, dioroff: 1, turretHp: 5 },
    { theme: 5, time: 105, spawn: [42, 94], pool: ['tank', 'tank', 'fl880', 'keith', 'fl880'], air: 0.19, dioroff: 2, turretHp: 5 }
  ];

  const THEMES = [
    { ground: '#1d4a12', g2: '#123a0a', g3: '#2f6b1a', blob: '#0b2a06', road: '#5d4c24', roadE: '#7a6738', water: '#1c3f8e' },
    { ground: '#a8843e', g2: '#8b6830', g3: '#c9a463', blob: '#7a5824', road: '#6d5c3c', roadE: '#8e7c58', water: '#2c6b98' },
    { ground: '#2a4a18', g2: '#1b3310', g3: '#3e6620', blob: '#122508', road: '#5c5238', roadE: '#7d7050', water: '#1c4c8e' },
    { ground: '#8a9aab', g2: '#6b7b8c', g3: '#adbccc', blob: '#5a6a7a', road: '#6b6b6b', roadE: '#8d8d8d', water: '#3c6c9c' },
    { ground: '#4c3c2c', g2: '#392b1d', g3: '#6c583e', blob: '#2a1e12', road: '#6c5c42', roadE: '#8b7a5c', water: '#2c4c6c' },
    { ground: '#3c2b2b', g2: '#2b1d1d', g3: '#5d3b3b', blob: '#1b1010', road: '#5c4c4c', roadE: '#7c6060', water: '#4c2b2b' }
  ];

  /* ============================================================
   *  画布
   * ============================================================ */
  const cv = document.getElementById('screen');
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  function resize() {
    const maxW = Math.max(200, window.innerWidth - 70);
    const maxH = Math.max(200, window.innerHeight - 120);
    let sc = Math.min(maxW / W, maxH / H);
    sc = sc >= 1 ? Math.floor(sc * 2) / 2 : sc;
    if (sc < 1) sc = Math.max(0.6, sc);
    cv.style.width = Math.round(W * sc) + 'px';
    cv.style.height = Math.round(H * sc) + 'px';
  }
  window.addEventListener('resize', resize);

  /* ============================================================
   *  输入
   * ============================================================ */
  const IN = { up: 0, down: 0, left: 0, right: 0, a: 0, b: 0, start: 0 };
  const KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    KeyZ: 'a', KeyJ: 'a', Space: 'a',
    KeyX: 'b', KeyK: 'b',
    Enter: 'start', NumpadEnter: 'start'
  };
  const aPrev = { a: 0, b: 0, start: 0 };

  window.addEventListener('keydown', function (e) {
    const k = KEYMAP[e.code];
    if (k) { IN[k] = 1; e.preventDefault(); }
    if (e.code === 'KeyM') { AU.setEnabled(!AU.isEnabled()); }
    if (e.code === 'KeyQ') cycleSel(-1);
    if (e.code === 'KeyE') cycleSel(1);
    if (/^Digit[1-5]$/.test(e.code)) selectSlot(+e.code.slice(5) - 1);
    if (e.code === 'KeyP') togglePause();
    AU.unlock();
  }, { passive: false });

  window.addEventListener('keyup', function (e) {
    const k = KEYMAP[e.code];
    if (k) { IN[k] = 0; e.preventDefault(); }
  }, { passive: false });

  window.addEventListener('blur', function () {
    for (const k in IN) IN[k] = 0;
  });

  // 触屏
  (function () {
    const layer = document.getElementById('touch');
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (!isTouch) return;
    layer.classList.remove('hide');
    const btns = layer.querySelectorAll('[data-k]');
    function set(el, v) {
      const k = el.getAttribute('data-k');
      IN[k] = v;
      if (v) { AU.unlock(); onPress(k); }
    }
    btns.forEach(function (el) {
      const on = function (e) { e.preventDefault(); set(el, 1); };
      const off = function (e) { e.preventDefault(); set(el, 0); };
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('touchend', off, { passive: false });
      el.addEventListener('touchcancel', off, { passive: false });
      el.addEventListener('mousedown', on);
      el.addEventListener('mouseup', off);
      el.addEventListener('mouseleave', off);
    });
  })();

  function onPress(k) {
    if (game.mode === 'title' && (k === 'start' || k === 'a' || k === 'b')) {
      startGame();
    } else if ((game.mode === 'over' || game.mode === 'clear') && k === 'start') {
      if (game.mode === 'over') startGame();
    }
  }

  /* ============================================================
   *  游戏状态
   * ============================================================ */
  let camY = CAM_MAX;
  let frameNo = 0;
  let bg = null;

  const game = {
    mode: 'title',       // title | play | pause | clear | over
    score: 0, hi: 0, lives: 3, stage: 1, loop: 1,
    timeLeft: 0, timeMax: 0,
    spawnCd: 0, msgT: 0, msg: '', msgSub: '',
    clearT: 0, overT: 0, nextLife: 0,
    gateOpen: false, flash: 0
  };

  const stock = { soldier: 0, keith: 0, tank: 0, fl880: 0, heli: 3 };
  let sel = 0;

  let player = null;
  let enemies = [], allies = [], pbul = [], ebul = [], fx = [], turrets = [];

  function resetPlayer() {
    player = {
      x: W / 2, y: WORLD_H - 22, spd: 1.22,
      alive: true, inv: 150, fireCd: 0, beam: false, beamTick: 0,
      anim: 0, deadT: 0, spawnT: 0
    };
  }

  /* ============================================================
   *  地形
   * ============================================================ */
  function discFill(g, cx, cy, r, col) {
    g.fillStyle = col;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
      g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  }

  function makeTerrain(themeIdx) {
    const th = THEMES[themeIdx % THEMES.length];
    const c = document.createElement('canvas');
    c.width = W; c.height = WORLD_H;
    const g = c.getContext('2d');

    g.fillStyle = th.ground;
    g.fillRect(0, 0, W, WORLD_H);

    // 颗粒
    for (let i = 0; i < 3200; i++) {
      g.fillStyle = Math.random() < 0.5 ? th.g2 : th.g3;
      g.fillRect(ri(0, W - 2), ri(0, WORLD_H - 2), 2, 2);
    }
    // 植被 / 岩块
    for (let i = 0; i < 150; i++) {
      const x = ri(0, W), y = ri(40, WORLD_H), r = ri(5, 15);
      discFill(g, x, y, r, th.blob);
      discFill(g, x - r * 0.3 | 0, y - r * 0.3 | 0, r * 0.6 | 0, th.g2);
    }
    // 河流
    const ry = ri(WORLD_H * 0.35, WORLD_H * 0.8);
    for (let y = ry - 26; y < ry + 26; y++) {
      const w = 24 + Math.sin(y * 0.08) * 6;
      g.fillStyle = th.water;
      g.fillRect(0, y, W, 1);
      g.fillStyle = 'rgba(255,255,255,0.16)';
      g.fillRect(ri(0, W - 30), y, ri(6, 30), 1);
      if (Math.abs(y - ry) > w) { /* 边缘外覆盖回地面 */ }
    }
    // 河岸
    g.fillStyle = th.g3;
    g.fillRect(0, ry - 27, W, 2);
    g.fillRect(0, ry + 26, W, 2);

    // 公路
    let rx = W / 2;
    for (let y = 0; y < WORLD_H; y += 2) {
      rx += (Math.random() - 0.5) * 2.0;
      rx = clamp(rx, 58, W - 58);
      g.fillStyle = th.road;
      g.fillRect(Math.round(rx - 16), y, 32, 2);
      g.fillStyle = th.roadE;
      g.fillRect(Math.round(rx - 17), y, 1, 2);
      g.fillRect(Math.round(rx + 16), y, 1, 2);
      if (y % 16 === 0) {
        g.fillStyle = 'rgba(0,0,0,0.20)';
        g.fillRect(Math.round(rx - 1), y, 2, 8);
      }
    }
    // 弹坑 & 沙袋
    for (let i = 0; i < 70; i++) {
      const x = ri(6, W - 20), y = ri(120, WORLD_H - 10);
      if (Math.random() < 0.5) {
        discFill(g, x, y, ri(3, 6), '#3a3220');
        discFill(g, x, y, ri(2, 4), '#241e12');
      } else {
        g.fillStyle = th.roadE;
        g.fillRect(x, y, 12, 5);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(x, y + 4, 12, 1);
      }
    }
    return c;
  }

  /* ============================================================
   *  坐标转换
   * ============================================================ */
  function screenY(wy) { return wy - camY + FIELD_TOP; }

  /* ============================================================
   *  实体工厂
   * ============================================================ */
  function makeEnemy(type, x, y) {
    const st = ENEMY[type];
    const hpMul = 1 + (game.loop - 1) * 0.2;
    return {
      type: type, x: x, y: y, vx: 0, vy: st.spd * (1 + (game.loop - 1) * 0.05),
      hp: Math.ceil(st.hp * hpMul), maxHp: Math.ceil(st.hp * hpMul),
      w: st.w, h: st.h, air: st.air, cap: st.cap,
      cd: ri(70, st.cd), capProg: 0, stun: 0, flash: 0,
      phase: Math.random() * 6.28, t: 0, dead: false
    };
  }

  function makeAlly(type, x, y) {
    const st = ALLY[type];
    return {
      type: type, x: x, y: y, hp: type === 'tank' ? 4 : type === 'soldier' ? 1 : 2,
      maxHp: type === 'tank' ? 4 : type === 'soldier' ? 1 : 2,
      w: st.w, h: st.h, cd: 0, target: null, air: st.air, flash: 0, phase: Math.random() * 6.28
    };
  }

  function makeTurret(x) {
    const hp = STAGES[(game.stage - 1) % 6].turretHp + Math.floor((game.loop - 1) * 1.2);
    return { x: x, y: TURRET_Y, hp: hp, maxHp: hp, cd: ri(110, 190), dead: false, flash: 0, w: 14, h: 14 };
  }

  /* ============================================================
   *  流程
   * ============================================================ */
  function startGame() {
    game.mode = 'play';
    game.score = 0;
    game.lives = 3;
    game.stage = 1;
    game.loop = 1;
    game.nextLife = 0;
    AU.unlock();
    AU.musicStart();
    AU.sfx('start');
    loadStage();
  }

  function loadStage() {
    const idx = (game.stage - 1) % 6;
    const cfg = STAGES[idx];
    game.loop = Math.floor((game.stage - 1) / 6) + 1;
    game.timeMax = cfg.time;
    game.timeLeft = cfg.time * 60;
    game.spawnCd = 90;
    game.gateOpen = false;
    game.flash = 40;

    bg = makeTerrain(cfg.theme);
    camY = CAM_MAX;

    enemies = []; allies = []; pbul = []; ebul = []; fx = [];
    turrets = TURRET_X.map(makeTurret);

    stock.soldier = 0; stock.keith = 0; stock.tank = 0; stock.fl880 = 0; stock.heli = 3;
    sel = 0;

    resetPlayer();

    banner('STAGE ' + game.stage, game.loop > 1 ? 'LOOP ' + game.loop : 'ADVANCE TO THE GATE', 130);
  }

  function banner(msg, sub, t) {
    game.msg = msg; game.msgSub = sub || ''; game.msgT = t || 90;
  }

  function togglePause() {
    if (game.mode === 'play') { game.mode = 'pause'; AU.musicStop(); }
    else if (game.mode === 'pause') { game.mode = 'play'; AU.musicStart(); }
  }

  function cycleSel(d) {
    if (game.mode !== 'play') return;
    sel = (sel + d + 5) % 5;
    AU.sfx('menu');
  }
  function selectSlot(i) {
    if (game.mode !== 'play' || i < 0 || i > 4) return;
    sel = i;
    AU.sfx('menu');
  }

  function toast(str, x, y, col) {
    fx.push({ type: 'pop', x: x, y: y, t: 0, life: 62, txt: str, col: col || PAL.cyan });
  }

  function addScore(v) {
    game.score += v;
    if (game.score > game.hi) game.hi = game.score;
    const th = game.nextLife === 0 ? 10000 : game.nextLife === 1 ? 30000 : -1;
    if (th > 0 && game.score >= th) {
      game.nextLife++;
      game.lives++;
      AU.sfx('extra');
      toast('EXTRA LIFE', player.x, player.y - 40, PAL.yellow);
    }
  }

  /* ============================================================
   *  更新
   * ============================================================ */
  let aPend = -1, bPend = -1, beamSuppress = false;
  let aPrevDown = false, bPrevDown = false;

  function updateInput() {
    const aDown = !!IN.a, bDown = !!IN.b;

    if (aDown && !aPrevDown) aPend = frameNo;
    if (bDown && !bPrevDown) bPend = frameNo;
    if (!bDown) beamSuppress = false;

    if (aPend >= 0 && bPend >= 0) {
      deploy();
      aPend = -1; bPend = -1;
      beamSuppress = true;
      if (player) player.fireCd = 22;
    } else {
      if (aPend >= 0 && frameNo - aPend >= 5) aPend = -1;
      if (bPend >= 0 && frameNo - bPend >= 5) bPend = -1;
    }

    aPrevDown = aDown; bPrevDown = bDown;
  }

  function updatePlayer() {
    const p = player;
    if (!p) return;

    if (!p.alive) {
      p.deadT--;
      if (p.deadT <= 0) {
        if (game.lives <= 0) {
          game.mode = 'over'; game.overT = 240;
          AU.jingleOver();
          return;
        }
        p.x = W / 2;
        p.y = clamp(camY + VIEW_OFF + 30, PLAYER_MIN_Y, WORLD_H - 22);
        p.alive = true; p.inv = 180; p.beam = false; p.fireCd = 30;
      }
      return;
    }

    const wantBeam = !!IN.b && bPend < 0 && !beamSuppress;
    p.beam = wantBeam;
    p.anim++;

    if (p.inv > 0) p.inv--;

    if (!p.beam) {
      let dx = (IN.right ? 1 : 0) - (IN.left ? 1 : 0);
      let dy = (IN.down ? 1 : 0) - (IN.up ? 1 : 0);
      if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
      const slow = game.timeLeft <= 0 ? 0.45 : 1;
      p.x += dx * p.spd * slow;
      p.y += dy * p.spd * slow;
      p.x = clamp(p.x, 12, W - 12);
      p.y = clamp(p.y, PLAYER_MIN_Y, WORLD_H - 16);
    }

    // 射击
    if (p.fireCd > 0) p.fireCd--;
    const wantFire = !!IN.a && aPend < 0 && !beamSuppress;
    if (wantFire && !p.beam && p.fireCd <= 0) {
      p.fireCd = 17;
      pbul.push({ x: p.x, y: p.y - 12, vx: 0, vy: -4.4, dmg: 1, w: 6, h: 12, team: 0, kind: 'missile', t: 0 });
      AU.sfx('missile');
    }

    // 捕获光束
    if (p.beam) {
      p.beamTick++;
      if (p.beamTick % 14 === 0) AU.sfx('enemyShot');
      applyBeam();
    } else {
      p.beamTick = 0;
      for (let i = 0; i < enemies.length; i++) {
        if (enemies[i].capProg > 0) enemies[i].capProg = Math.max(0, enemies[i].capProg - 2);
      }
    }

    // 摄像机
    let target = p.y - VIEW_OFF;
    target = clamp(target, 0, CAM_MAX);
    camY += (target - camY) * 0.14;
    camY = clamp(camY, 0, CAM_MAX);
  }

  function applyBeam() {
    const p = player;
    const top = p.y - BEAM_LEN;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.cap || e.dead) continue;
      const inX = Math.abs(e.x - p.x) < BEAM_HALF + e.w * 0.4;
      const inY = e.y < p.y - 4 && e.y > top;
      if (inX && inY) {
        e.capProg++;
        e.stun = 6;
        e.vx = 0;
        // 被光束向上牵引
        e.y -= 0.35;
        if (e.capProg === 1) AU.sfx('hit');
        if (e.capProg >= CAP_NEED) captureEnemy(e);
      }
    }
  }

  function captureEnemy(e) {
    const st = ENEMY[e.type];
    e.dead = true;
    if (stock[e.type] < 9) stock[e.type]++;
    addScore(st.capScore);
    toast('+' + st.capScore, e.x, e.y, PAL.cyan);
    fx.push({ type: 'ring', x: e.x, y: e.y, t: 0, life: 26, size: 34, col: PAL.cyan });
    fx.push({ type: 'ring', x: e.x, y: e.y, t: 0, life: 20, size: 22, col: PAL.white });
    AU.sfx('captured');
  }

  function deploy() {
    if (game.mode !== 'play' || !player || !player.alive) return;
    if (sel < 0 || sel > 4) return;
    const t = TYPES[sel];
    if (stock[t] <= 0) { AU.sfx('enemyShot'); return; }

    const onField = allies.filter(function (a) { return a.air === ALLY[t].air; }).length;
    if (t === 'heli') { if (onField >= 1) { AU.sfx('enemyShot'); return; } }
    else if (onField >= 5) { AU.sfx('enemyShot'); return; }

    stock[t]--;
    const a = makeAlly(t, clamp(player.x + rnd(-14, 14), 16, W - 16), player.y - 26);
    allies.push(a);
    fx.push({ type: 'ring', x: a.x, y: a.y, t: 0, life: 18, size: 22, col: PAL.blueLt });
    AU.sfx('deploy');
    toast(NAME[t], a.x, a.y - 18, PAL.blueLt);
  }

  /* ---------- 敌机 ---------- */
  function updateEnemies() {
    const idx = (game.stage - 1) % 6;
    const cfg = STAGES[idx];

    // 生成
    if (!game.gateOpen) {
      game.spawnCd--;
      if (game.spawnCd <= 0) {
        const iv = cfg.spawn;
        game.spawnCd = Math.round(rnd(iv[0], iv[1]) * Math.max(0.55, 1 - (game.loop - 1) * 0.10));
        const n = Math.random() < 0.18 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          let type = cfg.pool[ri(0, cfg.pool.length - 1)];
          if (Math.random() < cfg.air) type = 'heli';
          const x = ri(20, W - 20);
          enemies.push(makeEnemy(type, x, camY - ri(18, 46) - i * 22));
        }
      }
      // ディオロフ
      if (cfg.dioroff > 0) {
        const alive = enemies.filter(function (e) { return e.type === 'dioroff'; }).length;
        if (alive < cfg.dioroff && Math.random() < 0.0025) {
          enemies.push(makeEnemy('dioroff', ri(50, W - 50), camY - 40));
        }
      }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.dead) { enemies.splice(i, 1); continue; }

      e.t++;
      if (e.flash > 0) e.flash--;

      // 死亡爆炸
      if (e.hp <= 0 && !e.dead) {
        e.dead = true;
        const st = ENEMY[e.type];
        addScore(st.kill);
        boom(e.x, e.y, e.type === 'dioroff' ? 30 : 16);
        AU.sfx(e.type === 'dioroff' ? 'bigBoom' : 'boom');
        continue;
      }

      // 被光束定住
      if (e.stun > 0) { e.stun--; continue; }

      e.y += e.vy;
      // 横向机动
      if (e.type === 'keith' || e.type === 'heli' || e.type === 'soldier') {
        e.x += Math.sin(e.t * (e.type === 'heli' ? 0.05 : 0.03) + e.phase) * (e.type === 'keith' ? 0.9 : 0.5);
      } else if (e.type === 'fl880') {
        if (e.y > camY + 120) e.vy = 0;
      } else if (e.type === 'dioroff') {
        e.x += Math.sin(e.t * 0.02) * 0.5;
      }
      e.x = clamp(e.x, 12, W - 12);

      // 射击
      e.cd--;
      if (e.cd <= 0 && e.y > camY - 10 && e.y < camY + FIELD_H) {
        enemyFire(e);
        const st = ENEMY[e.type];
        e.cd = Math.round(st.cd * rnd(0.75, 1.25) / (1 + (game.loop - 1) * 0.10));
      }

      // ディオロフ 抓走友军
      if (e.type === 'dioroff' && e.t % 150 === 0) {
        for (let j = allies.length - 1; j >= 0; j--) {
          const a = allies[j];
          if (Math.hypot(a.x - e.x, a.y - e.y) < 90) {
            fx.push({ type: 'beam', x1: e.x, y1: e.y, x2: a.x, y2: a.y, t: 0, life: 36, col: PAL.redBr });
            fx.push({ type: 'ring', x: a.x, y: a.y, t: 0, life: 20, size: 24, col: PAL.redBr });
            allies.splice(j, 1);
            AU.sfx('hit');
            break;
          }
        }
      }

      // 越界回收
      if (e.y > camY + FIELD_H + 40 || e.y < camY - 320) enemies.splice(i, 1);
    }
  }

  function enemyFire(e) {
    const p = player;
    const st = ENEMY[e.type];
    const aim = function (speed, spread, dmg, kind) {
      let dx = 0, dy = 1;
      if (p && p.alive) {
        dx = p.x - e.x; dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        dx /= d; dy /= d;
      }
      dx += rnd(-spread, spread); dy += rnd(-spread, spread);
      const d2 = Math.hypot(dx, dy) || 1;
      ebul.push({ x: e.x, y: e.y + 8, vx: dx / d2 * speed, vy: dy / d2 * speed, dmg: dmg, w: 5, h: 11, team: 1, kind: kind, t: 0 });
    };

    switch (st.fire) {
      case 'rifle':
        aim(1.3, 0.09, 1, 'rifle');
        AU.sfx('enemyShot');
        break;
      case 'mg':
        aim(1.95, 0.13, 1, 'rifle');
        if (Math.random() < 0.3) aim(1.95, 0.17, 1, 'rifle');
        AU.sfx('enemyShot');
        break;
      case 'shell':
        aim(1.25, 0.05, 2, 'shell');
        AU.sfx('shell');
        break;
      case 'longshell':
        aim(1.6, 0.04, 2, 'shell');
        AU.sfx('shell');
        break;
      case 'dioroff':
        if (e.t % 300 < 150) { aim(1.85, 0.12, 1, 'rifle'); aim(1.85, 0.16, 1, 'rifle'); }
        else { aim(1.4, 0.07, 2, 'shell'); }
        AU.sfx('enemyShot');
        break;
    }
  }

  /* ---------- 炮台 ---------- */
  function updateTurrets() {
    for (let i = 0; i < turrets.length; i++) {
      const t = turrets[i];
      if (t.dead) continue;
      if (t.flash > 0) t.flash--;
      if (t.hp <= 0) {
        t.dead = true;
        addScore(500);
        boom(t.x, t.y, 26);
        AU.sfx('bigBoom');
        checkGate();
        continue;
      }
      if (t.y > camY + FIELD_H + 40) continue;
      t.cd--;
      if (t.cd <= 0 && player && player.alive && Math.abs(player.y - t.y) < 210) {
        t.cd = Math.round(rnd(110, 175) / (1 + (game.loop - 1) * 0.10));
        const dx = player.x - t.x, dy = player.y - t.y;
        const d = Math.hypot(dx, dy) || 1;
        ebul.push({ x: t.x, y: t.y + 8, vx: dx / d * 1.9, vy: dy / d * 1.9, dmg: 1, w: 5, h: 11, team: 1, kind: 'shell', t: 0 });
        AU.sfx('shell');
      }
    }
  }

  function checkGate() {
    if (game.gateOpen) return;
    if (turrets.every(function (t) { return t.dead; })) {
      game.gateOpen = true;
      banner('GATE OPEN', 'ENTER THE CENTER', 140);
      AU.sfx('gateOpen');
    }
  }

  /* ---------- 友军 ---------- */
  function updateAllies() {
    for (let i = allies.length - 1; i >= 0; i--) {
      const a = allies[i];
      if (a.flash > 0) a.flash--;
      const st = ALLY[a.type];

      // 寻找目标
      let best = null, bestD = 1e9, bestAir = null, bestAirD = 1e9;
      for (let j = 0; j < enemies.length; j++) {
        const e = enemies[j];
        const d = Math.hypot(e.x - a.x, e.y - a.y);
        if (d > st.range) continue;
        if (e.air) { if (d < bestAirD) { bestAirD = d; bestAir = e; } }
        if (d < bestD) { bestD = d; best = e; }
      }
      let tgt = null;
      if (a.air && bestAir) tgt = bestAir;
      else tgt = best || (a.air ? bestAir : null);

      if (tgt) {
        a.cd--;
        if (a.cd <= 0) {
          a.cd = st.cd;
          allyFire(a, tgt);
        }
      } else {
        a.y -= st.spd;
        if (a.cd > 0) a.cd--;
      }
      if (a.type === 'heli') a.x += Math.sin(frameNo * 0.05 + a.phase) * 0.8;
      a.x = clamp(a.x, 14, W - 14);
      if (a.y < 16) a.y = 16;
    }
  }

  function allyFire(a, tgt) {
    const st = ALLY[a.type];
    const dx = tgt.x - a.x, dy = tgt.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const sp = a.type === 'fl880' ? 4.6 : a.type === 'tank' ? 4.0 : 3.4;
    pbul.push({
      x: a.x, y: a.y - 8, vx: dx / d * sp, vy: dy / d * sp, dmg: st.dmg,
      w: 5, h: 11, team: 0, kind: a.type === 'tank' ? 'shell' : 'missile', t: 0,
      col: PAL.blueLt
    });
    AU.sfx('enemyShot');
  }

  /* ---------- 子弹 ---------- */
  function updateBullets() {
    for (let i = pbul.length - 1; i >= 0; i--) {
      const b = pbul[i];
      b.x += b.vx; b.y += b.vy; b.t++;
      let gone = (b.y < camY - 30 || b.y > camY + FIELD_H + 30 || b.x < -20 || b.x > W + 20);

      if (!gone) {
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (e.dead) continue;
          if (Math.abs(b.x - e.x) < (b.w + e.w) * 0.5 && Math.abs(b.y - e.y) < (b.h + e.h) * 0.5) {
            e.hp -= b.dmg; e.flash = 5; gone = true;
            spark(b.x, b.y, PAL.yellow);
            AU.sfx('hit');
            break;
          }
        }
      }
      if (!gone) {
        for (let j = 0; j < turrets.length; j++) {
          const t = turrets[j];
          if (t.dead) continue;
          if (Math.abs(b.x - t.x) < (b.w + t.w) * 0.5 && Math.abs(b.y - t.y) < (b.h + t.h) * 0.5) {
            t.hp -= b.dmg; t.flash = 5; gone = true;
            spark(b.x, b.y, PAL.yellow);
            AU.sfx('hit');
            break;
          }
        }
      }
      if (gone) pbul.splice(i, 1);
    }

    for (let i = ebul.length - 1; i >= 0; i--) {
      const b = ebul[i];
      b.x += b.vx; b.y += b.vy; b.t++;
      let gone = (b.y < camY - 30 || b.y > camY + FIELD_H + 30 || b.x < -20 || b.x > W + 20);

      if (!gone && player && player.alive && player.inv <= 0) {
        if (Math.abs(b.x - player.x) < (b.w + 7) * 0.5 && Math.abs(b.y - player.y) < (b.h + 7) * 0.5) {
          killPlayer();
          gone = true;
        }
      }
      if (!gone) {
        for (let j = allies.length - 1; j >= 0; j--) {
          const a = allies[j];
          if (Math.abs(b.x - a.x) < (b.w + a.w) * 0.5 && Math.abs(b.y - a.y) < (b.h + a.h) * 0.5) {
            a.hp -= b.dmg; a.flash = 5; gone = true;
            spark(b.x, b.y, PAL.redLt);
            if (a.hp <= 0) {
              boom(a.x, a.y, 12);
              AU.sfx('boom');
              allies.splice(j, 1);
            } else AU.sfx('hit');
            break;
          }
        }
      }
      if (gone) ebul.splice(i, 1);
    }
  }

  function updateContacts() {
    if (!player || !player.alive || player.inv > 0) return;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead) continue;
      const risk = (e.type === 'dioroff') ? 12 : 7;
      if (Math.abs(e.x - player.x) < (e.w + risk) * 0.5 && Math.abs(e.y - player.y) < (e.h + risk) * 0.5) {
        killPlayer();
        return;
      }
    }
    for (let i = 0; i < turrets.length; i++) {
      const t = turrets[i];
      if (t.dead) continue;
      if (Math.abs(t.x - player.x) < (t.w + 7) * 0.5 && Math.abs(t.y - player.y) < (t.h + 7) * 0.5) {
        killPlayer();
        return;
      }
    }
    // 自机撞友军无伤害；友军与敌军接触互相伤害
    for (let i = allies.length - 1; i >= 0; i--) {
      const a = allies[i];
      for (let j = 0; j < enemies.length; j++) {
        const e = enemies[j];
        if (e.dead) continue;
        if (Math.abs(e.x - a.x) < (e.w + a.w) * 0.5 && Math.abs(e.y - a.y) < (e.h + a.h) * 0.5) {
          e.hp -= 3; e.flash = 5;
          a.hp -= 2;
          spark(a.x, a.y, PAL.white);
          if (a.hp <= 0) { boom(a.x, a.y, 12); allies.splice(i, 1); AU.sfx('boom'); }
          break;
        }
      }
    }
  }

  function killPlayer() {
    const p = player;
    if (!p.alive) return;
    p.alive = false;
    p.beam = false;
    p.deadT = 100;
    game.lives--;
    boom(p.x, p.y, 30);
    fx.push({ type: 'ring', x: p.x, y: p.y, t: 0, life: 30, size: 46, col: PAL.white });
    AU.sfx('playerDie');
    game.flash = 26;
  }

  function boom(x, y, r) {
    fx.push({ type: 'boom', x: x, y: y, t: 0, life: 24, size: r });
  }
  function spark(x, y, col) {
    fx.push({ type: 'spark', x: x, y: y, t: 0, life: 10, col: col });
  }

  function updateFx() {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.t++;
      if (f.t >= f.life) fx.splice(i, 1);
    }
  }

  /* ---------- 关卡进度 ---------- */
  function updateStage() {
    if (game.timeLeft > 0) game.timeLeft--;
    if (game.msgT > 0) game.msgT--;
    if (game.flash > 0) game.flash--;

    // 进入大门
    if (game.gateOpen && player && player.alive) {
      if (player.y < 70 && player.x > DOOR_L + 6 && player.x < DOOR_R - 6) {
        stageClear();
      }
    }
  }

  function stageClear() {
    game.mode = 'clear';
    game.clearT = 200;
    const bonusStock = stock.soldier + stock.keith + stock.tank + stock.fl880 + stock.heli * 2;
    const bonus = 1000 + game.stage * 400 + bonusStock * 150;
    game.clearBonus = bonus;
    addScore(bonus);
    AU.jingleClear();
    banner('STAGE CLEAR', 'BONUS ' + bonus, 999);
  }

  function nextStage() {
    game.stage++;
    game.mode = 'play';
    AU.musicStart();
    loadStage();
  }

  /* ============================================================
   *  绘制
   * ============================================================ */
  function render() {
    ctx.fillStyle = PAL.black;
    ctx.fillRect(0, 0, W, H);

    if (game.mode === 'title') { drawTitle(); return; }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, FIELD_TOP, W, FIELD_H);
    ctx.clip();

    if (bg) {
      const srcY = clamp(camY, 0, WORLD_H - FIELD_H);
      ctx.drawImage(bg, 0, srcY, W, FIELD_H, 0, FIELD_TOP, W, FIELD_H);
    }

    drawGate();
    drawTurrets();
    drawFx(true);
    drawEnemies();
    drawAllies();
    drawBullets();
    drawPlayer();
    drawFx(false);

    if (game.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (game.flash / 60) + ')';
      ctx.fillRect(0, FIELD_TOP, W, FIELD_H);
    }
    ctx.restore();

    drawHud();
    drawBanner();

    if (game.mode === 'pause') drawPause();
  }

  function drawPlayer() {
    const p = player;
    if (!p || !p.alive) return;
    const x = Math.round(p.x), y = Math.round(screenY(p.y));

    if (p.beam) drawBeam(x, y);

    if (p.inv > 0 && Math.floor(frameNo / 4) % 2 === 0) return;
    const sp = (p.inv > 90 && Math.floor(frameNo / 3) % 2 === 0) ? S.genesisHot : S.genesis;
    ctx.drawImage(sp, x - 8, y - 8);

    // 引擎光
    if (Math.floor(frameNo / 4) % 2 === 0) {
      ctx.fillStyle = PAL.cyan;
      ctx.fillRect(x - 4, y + 8, 8, 2);
    }
  }

  function drawBeam(bx, by) {
    const top = by - BEAM_LEN;
    ctx.fillStyle = 'rgba(60,188,252,0.16)';
    ctx.fillRect(bx - BEAM_HALF, top, BEAM_HALF * 2, by - top);
    ctx.fillStyle = 'rgba(124,252,252,0.75)';
    ctx.fillRect(bx - BEAM_HALF, top, 1, by - top);
    ctx.fillRect(bx + BEAM_HALF - 1, top, 1, by - top);

    for (let i = 0; i < 8; i++) {
      const off = (frameNo * 3.2 + i * 24) % BEAM_LEN;
      const yy = by - 4 - off;
      if (yy < top) continue;
      const wdt = 24 - Math.abs(off - BEAM_LEN / 2) * 0.06;
      ctx.fillStyle = (i % 2 === 0) ? 'rgba(124,252,252,0.9)' : 'rgba(60,188,252,0.75)';
      ctx.fillRect(Math.round(bx - wdt / 2), Math.round(yy), Math.round(wdt), 2);
    }
    // 发射口
    ctx.fillStyle = PAL.cyan;
    ctx.fillRect(bx - 6, by - 12, 12, 3);
  }

  function drawEnemies() {
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const x = Math.round(e.x), y = Math.round(screenY(e.y));
      if (y < FIELD_TOP - 40 || y > H + 40) continue;
      const set = e.type === 'dioroff' ? S.dioroff : S[e.type];
      const spr = e.air ? (set.enemyUp) : set.enemy;
      ctx.drawImage(spr, x - spr.width / 2, y - spr.height / 2);

      if (e.flash > 0) {
        ctx.globalAlpha = 0.7;
        ctx.drawImage(spr, x - spr.width / 2, y - spr.height / 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(x - spr.width / 2, y - spr.height / 2, spr.width, spr.height);
      }
      // 血条
      if (e.hp < e.maxHp) {
        const w = spr.width - 2;
        ctx.fillStyle = PAL.black;
        ctx.fillRect(x - w / 2, y - spr.height / 2 - 4, w, 2);
        ctx.fillStyle = PAL.redBr;
        ctx.fillRect(x - w / 2, y - spr.height / 2 - 4, Math.max(0, w * e.hp / e.maxHp), 2);
      }
      // 捕获进度
      if (e.capProg > 0 && e.cap) {
        const w = 20;
        ctx.fillStyle = PAL.black;
        ctx.fillRect(x - w / 2 - 1, y + spr.height / 2 + 1, w + 2, 4);
        ctx.fillStyle = PAL.cyan;
        ctx.fillRect(x - w / 2, y + spr.height / 2 + 2, w * e.capProg / CAP_NEED, 2);
      }
    }
  }

  function drawAllies() {
    for (let i = 0; i < allies.length; i++) {
      const a = allies[i];
      const x = Math.round(a.x), y = Math.round(screenY(a.y));
      if (y < FIELD_TOP - 40 || y > H + 40) continue;
      const set = S[a.type];
      const spr = a.air ? set.enemyUp : set.ally;
      ctx.drawImage(spr, x - spr.width / 2, y - spr.height / 2);
      if (a.flash > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(x - spr.width / 2, y - spr.height / 2, spr.width, spr.height);
      }
      if (a.hp < a.maxHp) {
        const w = spr.width - 2;
        ctx.fillStyle = PAL.black;
        ctx.fillRect(x - w / 2, y - spr.height / 2 - 4, w, 2);
        ctx.fillStyle = PAL.blueLt;
        ctx.fillRect(x - w / 2, y - spr.height / 2 - 4, Math.max(0, w * a.hp / a.maxHp), 2);
      }
    }
  }

  function drawBullets() {
    for (let i = 0; i < pbul.length; i++) {
      const b = pbul[i];
      const x = Math.round(b.x), y = Math.round(screenY(b.y));
      drawShot(x, y, b, true);
    }
    for (let i = 0; i < ebul.length; i++) {
      const b = ebul[i];
      const x = Math.round(b.x), y = Math.round(screenY(b.y));
      drawShot(x, y, b, false);
    }
  }

  function drawShot(x, y, b, friendly) {
    const r = Math.atan2(b.vy, b.vx);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r + Math.PI / 2);
    let spr;
    if (b.kind === 'shell') spr = S.bulletShell;
    else spr = friendly ? S.bulletAlly : S.bulletEnemy;
    ctx.drawImage(spr, -8, -8);
    ctx.restore();
  }

  function drawTurrets() {
    for (let i = 0; i < turrets.length; i++) {
      const t = turrets[i];
      if (t.dead) continue;
      const x = Math.round(t.x), y = Math.round(screenY(t.y));
      if (y < FIELD_TOP - 40 || y > H + 40) continue;
      ctx.drawImage(S.turret.enemy, x - 8, y - 8);
      if (t.flash > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(x - 8, y - 8, 16, 16);
      }
      const w = 16;
      ctx.fillStyle = PAL.black;
      ctx.fillRect(x - w / 2, y - 14, w, 3);
      ctx.fillStyle = PAL.redBr;
      ctx.fillRect(x - w / 2, y - 14, w * Math.max(0, t.hp) / t.maxHp, 3);
    }
  }

  function drawGate() {
    const gy = screenY(0);
    if (gy > FIELD_TOP + 200) return;
    const top = gy;
    const bot = screenY(DOOR_BOT);

    // 地基
    ctx.fillStyle = PAL.grayDk2;
    ctx.fillRect(66, screenY(DOOR_BOT - 10), 124, 12);
    ctx.fillStyle = PAL.grayDk3;
    ctx.fillRect(66, screenY(DOOR_BOT - 2), 124, 4);

    // 门洞
    const doorTop = screenY(DOOR_TOP);
    if (game.gateOpen) {
      ctx.fillStyle = '#08121c';
      ctx.fillRect(DOOR_L, doorTop, DOOR_R - DOOR_L, bot - doorTop);
      const pulse = 0.35 + 0.3 * Math.sin(frameNo * 0.12);
      ctx.fillStyle = 'rgba(60,188,252,' + pulse.toFixed(2) + ')';
      ctx.fillRect(DOOR_L + 4, doorTop + 4, DOOR_R - DOOR_L - 8, 3);
      for (let i = 0; i < 5; i++) {
        const yy = doorTop + 10 + ((frameNo * 1.6 + i * 22) % (bot - doorTop - 14));
        ctx.fillStyle = 'rgba(124,252,252,0.5)';
        ctx.fillRect(DOOR_L + 8, Math.round(yy), DOOR_R - DOOR_L - 16, 2);
      }
    } else {
      ctx.fillStyle = PAL.grayDk;
      ctx.fillRect(DOOR_L, doorTop, DOOR_R - DOOR_L, bot - doorTop);
      ctx.fillStyle = PAL.grayDk3;
      for (let y = doorTop; y < bot; y += 10) ctx.fillRect(DOOR_L, y, DOOR_R - DOOR_L, 2);
      ctx.fillStyle = PAL.red;
      ctx.fillRect(DOOR_L + 20, doorTop + 12, 16, 5);
      ctx.fillRect(DOOR_R - 36, doorTop + 30, 16, 5);
    }

    // 左右塔
    tower(72, top, DOOR_L, bot);
    tower(DOOR_R, top, 184, bot);

    // 顶部横梁
    ctx.fillStyle = PAL.gray;
    ctx.fillRect(72, doorTop, DOOR_R - DOOR_L, 6);
    ctx.fillStyle = PAL.grayDk;
    ctx.fillRect(72, doorTop + 6, DOOR_R - DOOR_L, 2);

    // 剩余炮台指示
    if (!game.gateOpen) {
      const left = turrets.filter(function (t) { return !t.dead; }).length;
      textC(ctx, 'X-BC ' + left, W / 2, screenY(DOOR_BOT) + 4, PAL.redBr);
    }
  }

  function tower(x0, y0, x1, y1) {
    ctx.fillStyle = PAL.grayDk;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = PAL.gray;
    ctx.fillRect(x0, y0, 3, y1 - y0);
    ctx.fillStyle = PAL.grayDk3;
    ctx.fillRect(x1 - 3, y0, 3, y1 - y0);
    for (let y = y0 + 8; y < y1 - 6; y += 12) {
      ctx.fillStyle = PAL.gray;
      ctx.fillRect(x0 + 4, y, x1 - x0 - 8, 4);
    }
    ctx.fillStyle = PAL.red;
    ctx.fillRect(x0 + 4, y0 + 2, x1 - x0 - 8, 3);
  }

  function drawFx(ground) {
    for (let i = 0; i < fx.length; i++) {
      const f = fx[i];
      const isGround = (f.type === 'boom' || f.type === 'ring');
      if (isGround !== ground) continue;
      const x = Math.round(f.x), y = Math.round(screenY(f.y));

      if (f.type === 'boom') {
        const k = f.t / f.life;
        const r = f.size * (0.35 + k * 0.9);
        const cols = [PAL.white, PAL.yellow, PAL.orange, PAL.red, PAL.redDk];
        const ci = Math.min(cols.length - 1, Math.floor(k * cols.length));
        ctx.fillStyle = cols[ci];
        circleFill(x, y, r * (1 - k * 0.35));
        ctx.fillStyle = cols[Math.max(0, ci - 1)];
        circleFill(x, y, r * (0.5 - k * 0.25));
      } else if (f.type === 'ring') {
        const k = f.t / f.life;
        ctx.strokeStyle = f.col;
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, f.size * k + 3, 0, 6.2832);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (f.type === 'spark') {
        ctx.fillStyle = f.col;
        const k = 1 - f.t / f.life;
        ctx.fillRect(x - 1, y - 6 * k, 2, 6 * k);
        ctx.fillRect(x - 6 * k, y - 1, 6 * k, 2);
        ctx.fillRect(x + 1, y - 6 * k, 2, 6 * k);
        ctx.fillRect(x, y - 1, 6 * k, 2);
      } else if (f.type === 'pop') {
        const a = f.t < 36 ? 1 : 1 - (f.t - 36) / (f.life - 36);
        ctx.globalAlpha = Math.max(0, a);
        textC(ctx, f.txt, x, y - f.t * 0.25, f.col);
        ctx.globalAlpha = 1;
      } else if (f.type === 'beam') {
        const x1 = Math.round(f.x1), y1 = Math.round(screenY(f.y1));
        const x2 = Math.round(f.x2), y2 = Math.round(screenY(f.y2));
        ctx.strokeStyle = f.col;
        ctx.globalAlpha = 0.9 * (1 - f.t / f.life);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = PAL.white;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  function circleFill(cx, cy, r) {
    r = Math.max(1, r);
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
      ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
    }
  }

  /* ---------- HUD ---------- */
  function drawHud() {
    ctx.fillStyle = '#070a07';
    ctx.fillRect(0, 0, W, HUD_H);
    ctx.fillStyle = '#1c2a1c';
    ctx.fillRect(0, HUD_H - 1, W, 1);

    text(ctx, 'SCORE', 3, 1, PAL.cyan);
    text(ctx, pad(game.score, 6), 37, 1, PAL.white);
    text(ctx, 'HI', 78, 1, PAL.cyan);
    text(ctx, pad(game.hi, 6), 92, 1, PAL.gray);
    text(ctx, 'ST', 134, 1, PAL.cyan);
    text(ctx, pad(game.stage, 2), 152, 1, PAL.white);
    text(ctx, 'LOOP', 168, 1, PAL.cyan);
    text(ctx, pad(game.loop, 2), 194, 1, PAL.gray);
    text(ctx, 'LIFE', 216, 1, PAL.cyan);
    text(ctx, pad(Math.max(0, game.lives), 2), 244, 1, PAL.white);

    // 兵种栏
    const SLOT_W = 42, START_X = 24;
    // 显示名字
    text(ctx, 'ALLY', 3, 12, PAL.grayDk);

    for (let i = 0; i < 5; i++) {
      const t = TYPES[i];
      const x = START_X + i * SLOT_W;
      const isSel = (i === sel) && game.mode === 'play';
      if (isSel) {
        ctx.fillStyle = 'rgba(60,188,252,0.22)';
        ctx.fillRect(x - 3, 10, 38, 18);
        ctx.fillStyle = PAL.cyan;
        ctx.fillRect(x - 3, 10, 38, 1);
        ctx.fillRect(x - 3, 27, 38, 1);
        ctx.fillRect(x - 3, 10, 1, 18);
        ctx.fillRect(x + 34, 10, 1, 18);
      }
      const n = stock[t];
      ctx.globalAlpha = n > 0 ? 1 : 0.28;
      const icon = S.icon[t];
      ctx.drawImage(icon, 0, 0, 16, 16, x, 11, 14, 14);
      ctx.globalAlpha = 1;
      text(ctx, n, x + 17, 16, n > 0 ? PAL.white : PAL.grayDk);
      if (isSel && Math.floor(frameNo / 8) % 2 === 0) {
        text(ctx, '^', x + 17, 26, PAL.yellow);
      }
    }

    // 时限条
    const ratio = clamp(game.timeLeft / (game.timeMax * 60), 0, 1);
    ctx.fillStyle = '#222';
    ctx.fillRect(2, 28, 252, 2);
    const warn = ratio < 0.25;
    ctx.fillStyle = warn && Math.floor(frameNo / 8) % 2 === 0 ? PAL.redBr : (warn ? PAL.orange : PAL.greenLt);
    ctx.fillRect(2, 28, Math.round(252 * ratio), 2);
  }

  function drawBanner() {
    if (game.msgT <= 0) return;
    const cy = FIELD_TOP + 70;

    if (game.mode === 'clear') {
      textC(ctx, 'STAGE CLEAR', W / 2, cy - 10, PAL.cyan, 2);
      textC(ctx, 'BONUS ' + game.clearBonus, W / 2, cy + 40, PAL.yellow);
      textC(ctx, 'GET READY...', W / 2, cy + 60, PAL.white);
      return;
    }
    if (game.msgT > 100) {
      textC(ctx, game.msg, W / 2, cy - 10, PAL.cyan, 2);
      textC(ctx, game.msgSub, W / 2, cy + 10, PAL.white);
    } else {
      textC(ctx, game.msg, W / 2, cy - 10, PAL.cyan);
      textC(ctx, game.msgSub, W / 2, cy + 2, PAL.gray);
    }
  }

  function drawPause() {
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, FIELD_TOP, W, FIELD_H);
    textC(ctx, 'PAUSE', W / 2, FIELD_TOP + 90, PAL.white, 2);
    textC(ctx, 'PRESS ENTER', W / 2, FIELD_TOP + 116, PAL.cyan);
  }

  /* ---------- 标题 ---------- */
  function drawTitle() {
    const t = frameNo;
    ctx.fillStyle = '#08130c';
    ctx.fillRect(0, 0, W, H);

    // 星空/战场
    for (let i = 0; i < 40; i++) {
      const x = (i * 61 + t * 0.3) % W;
      const y = (i * 37 + t * 0.7) % H;
      ctx.fillStyle = i % 3 === 0 ? '#123' : '#0a1a12';
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }

    // 标题
    textC(ctx, 'FIELD', W / 2, 34, PAL.blueLt, 4);
    textC(ctx, 'COMBAT', W / 2, 70, PAL.cyan, 4);

    ctx.fillStyle = PAL.red;
    ctx.fillRect(24, 106, 208, 2);

    textC(ctx, 'JALECO 1985  FC', W / 2, 114, PAL.gray, 1);

    // 演示动画
    const bx = W / 2 + Math.sin(t * 0.03) * 40;
    ctx.drawImage(S.genesis, Math.round(bx - 8), 140);
    ctx.drawImage(S.tank.enemy, 60, Math.round(150 + Math.sin(t * 0.05) * 6));
    ctx.drawImage(S.soldier.enemy, 200, Math.round(160 + Math.cos(t * 0.06) * 5));
    ctx.drawImage(S.heli.enemyUp, 150, Math.round(190 + Math.sin(t * 0.04) * 8));

    if (Math.floor(t / 30) % 2 === 0) {
      textC(ctx, 'PRESS ENTER TO START', W / 2, 205, PAL.yellow);
    }
    textC(ctx, 'A:MISSILE  B:CAPTURE  A+B:DEPLOY', W / 2, 220, PAL.grayDk);
  }

  /* ============================================================
   *  主循环
   * ============================================================ */
  function tick() {
    frameNo++;

    if (game.mode === 'play') {
      updateInput();
      updatePlayer();
      if (game.mode !== 'play') return;
      updateEnemies();
      updateTurrets();
      updateAllies();
      updateBullets();
      updateContacts();
      updateFx();
      updateStage();
    } else if (game.mode === 'clear') {
      updateFx();
      if (game.msgT > 0) game.msgT--;
      game.clearT--;
      if (game.clearT <= 0) nextStage();
    } else if (game.mode === 'over') {
      updateFx();
      game.overT--;
      if (game.overT <= 0) {
        game.mode = 'title';
        AU.musicStop();
      }
    } else if (game.mode === 'title') {
      // 等待输入
      if (IN.start && !aPrev.start) startGame();
    }

    aPrev.a = IN.a; aPrev.b = IN.b; aPrev.start = IN.start;
  }

  let acc = 0, last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!last) last = now;
    let dt = now - last;
    last = now;
    if (dt > 250) dt = 250;
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard++ < 5) {
      tick();
      acc -= STEP;
    }
    render();
  }

  /* ---------- 启动 ---------- */
  bg = makeTerrain(0);
  resetPlayer();
  resize();
  requestAnimationFrame(loop);

  window.addEventListener('pointerdown', function () { AU.unlock(); }, { once: true });

})();
