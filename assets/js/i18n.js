/* ============================================================
 *  i18n.js — 页面文案中英切换
 *  加载时自动检测浏览器语言：中文 → 中文，其它语言 → 英文
 *  用户在下方语言栏的手动选择会记住（localStorage）
 *  暴露: window.I18N = { apply, detect, lang }
 *  说明：画布内的街机文字使用自制 5x7 点阵字库（仅 ASCII），不参与切换
 * ============================================================ */
(function (global) {
  'use strict';

  const doc = global.document;
  const STORE_KEY = 'fc-lang';
  const FALLBACK = 'en';

  const STR = {
    zh: {
      langLabel: '语言 / Language',
      keyMove: '方向键 / WASD', keyMoveDesc: '移动母舰',
      keyA: 'Z 或 J', keyADesc: 'A键 · 导弹',
      keyB: 'X 或 K', keyBDesc: 'B键 · 捕获光束',
      keyAB: 'Z + X', keyABDesc: '同时按 · 派出友军',
      keyNum: '1 ~ 5', keyNumDesc: '切换兵种 · Q/E 循环',
      keyEnter: 'Enter', keyEnterDesc: '开始 / 暂停',
      keyM: 'M', keyMDesc: '静音',

      briefTitle: '作战简报',
      brief1: '邪恶科学家 <b>フォゾム</b> 用洗脑装置 <b>ニップ</b> 把联邦士兵变成红军的傀儡。' +
              '你驾驶攻击母舰 <b>ジェネシス-3</b>，装备能让人清醒的 <b>捕获光束</b>。',
      brief2: '<b class="c-b">蓝 = 自军</b>　<b class="c-r">红 = 敌军</b>',
      brief3: '· 用 <b>导弹</b> 消灭不能捕获的敌人（直升机、ディオロフ）；<br>' +
              '· 用 <b>捕获光束</b> 把步兵、キース、HEL-99A、FL-880 变成自己的部队（捕获得分更高）；<br>' +
              '· 光束照射时母舰 <b>无法移动</b>，请在安全位置使用；<br>' +
              '· 用 <b>A+B</b> 把部队派上前线，它们会自动进攻。',
      brief4: '突破全 6 关，每关必须在时限内打掉大门前 <b>4 座 X-BC 炮台</b> 并冲进中央大门。' +
              '超时母舰机动性下降，小心。'
    },
    en: {
      langLabel: 'LANGUAGE',
      keyMove: 'Arrows / WASD', keyMoveDesc: 'Move the mothership',
      keyA: 'Z or J', keyADesc: 'A: Missile',
      keyB: 'X or K', keyBDesc: 'B: Capture beam',
      keyAB: 'Z + X', keyABDesc: 'Press together: deploy troops',
      keyNum: '1 ~ 5', keyNumDesc: 'Pick unit · Q/E cycle',
      keyEnter: 'Enter', keyEnterDesc: 'Start / Pause',
      keyM: 'M', keyMDesc: 'Mute',

      briefTitle: 'MISSION BRIEF',
      brief1: 'The evil scientist <b>Fozom</b> uses the brainwashing device <b>Nip</b> to turn ' +
              'Federation soldiers into puppets of the Red Army. You pilot the attack mothership ' +
              '<b>Genesis-3</b>, armed with a <b>Capture Beam</b> that snaps them back to their senses.',
      brief2: '<b class="c-b">Blue = your army</b>&nbsp;&nbsp;&nbsp;<b class="c-r">Red = enemy</b>',
      brief3: '· Use <b>missiles</b> on enemies that cannot be captured (helicopters, Dioroff);<br>' +
              '· Use the <b>Capture Beam</b> to turn Soldiers, Keith, HEL-99A and FL-880 into your own ' +
              'troops (capturing scores more);<br>' +
              '· While the beam is on the mothership <b>cannot move</b>, so fire it from a safe spot;<br>' +
              '· Press <b>A+B</b> to send troops to the front — they attack on their own.',
      brief4: 'Clear all 6 stages. In each stage you must destroy the <b>4 X-BC turrets</b> in front of ' +
              'the gate within the time limit, then charge through the center gate. ' +
              'If time runs out the mothership loses mobility — be careful.'
    }
  };

  const TITLE = { zh: '杀戮战场 FIELD COMBAT', en: 'FIELD COMBAT' };
  const HTML_LANG = { zh: 'zh-CN', en: 'en' };

  let cur = FALLBACK;

  /* 浏览器语言：只要有 zh* 就当中文，其余一律英文 */
  function detect() {
    const nav = global.navigator || {};
    const list = [].concat(nav.languages || [], nav.language || []);
    for (let i = 0; i < list.length; i++) {
      const tag = String(list[i] || '').toLowerCase();
      if (tag.indexOf('zh') === 0) return 'zh';
    }
    return FALLBACK;
  }

  function readStored() {
    try {
      const v = global.localStorage.getItem(STORE_KEY);
      return STR[v] ? v : null;
    } catch (e) { return null; }
  }

  function writeStored(lang) {
    try { global.localStorage.setItem(STORE_KEY, lang); } catch (e) { /* 隐私模式忽略 */ }
  }

  function markButtons(lang) {
    const btns = doc.querySelectorAll('[data-lang]');
    for (let i = 0; i < btns.length; i++) {
      const on = btns[i].getAttribute('data-lang') === lang;
      btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function apply(lang, save) {
    if (!STR[lang]) lang = FALLBACK;
    const s = STR[lang];
    cur = lang;

    doc.documentElement.lang = HTML_LANG[lang];
    doc.title = TITLE[lang];

    const nodes = doc.querySelectorAll('[data-i18n],[data-i18n-html]');
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const kHtml = el.getAttribute('data-i18n-html');
      const key = kHtml || el.getAttribute('data-i18n');
      if (!key || s[key] === undefined) continue;
      if (kHtml) el.innerHTML = s[key];
      else el.textContent = s[key];
    }

    markButtons(lang);
    if (save) writeStored(lang);
  }

  const btns = doc.querySelectorAll('[data-lang]');
  for (let i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      apply(this.getAttribute('data-lang'), true);
    });
  }

  apply(readStored() || detect(), false);

  global.I18N = {
    apply: apply,
    detect: detect,
    get lang() { return cur; }
  };
})(window);
