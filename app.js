(function () {
  'use strict';

  var CATS = window.QOSYL_DATA.CATS;
  var CLUBS = (window.QOSYL_DATA.CLUBS || []).slice(); // заполняется из communities.json
  var PAGE = 30; // сколько карточек показываем за раз
  var CAT_HINTS = window.QOSYL_DATA.CAT_HINTS || {};
  var DISTRICTS = window.QOSYL_DATA.DISTRICTS || [];
  var CAT_ALIAS = window.QOSYL_DATA.CAT_ALIAS || {};
  var STR = window.QOSYL_STR;
  var CFG = window.QOSYL_CONFIG || {};

  var STORE_KEY = 'youths.clubs.v1';
  var LANG_KEY = 'youths.lang';
  var REPORT_KEY = 'youths.reported';
  var LANGS = [{ id: 'ru', label: 'РУ', html: 'ru' }, { id: 'kz', label: 'ҚАЗ', html: 'kk' }, { id: 'en', label: 'EN', html: 'en' }];
  var CENTER = [51.128, 71.43];

  // ---------- storage ----------
  function load(key, fallback) {
    try { var raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function today() {
    var d = new Date(), p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function slugify(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function tri(v) { return { ru: v, kz: v, en: v }; }
  function fmtDate(iso, L) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '—';
    if (L === 'en') {
      return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return m[3] + '.' + m[2] + '.' + m[1];
  }
  var pluralRules = {};
  function plural(n, L) {
    var T = STR[L];
    if (!pluralRules[L]) pluralRules[L] = new Intl.PluralRules({ ru: 'ru', kz: 'kk', en: 'en' }[L]);
    return T[pluralRules[L].select(n)] || T.many;
  }
  function catLabel(id, L) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i][L];
    return id;
  }
  function distLabel(id, L) {
    for (var i = 0; i < DISTRICTS.length; i++) if (DISTRICTS[i].id === id) return DISTRICTS[i][L];
    return id;
  }
  // Расстояние по прямой, в километрах (формула гаверсинуса).
  function distKm(aLat, aLng, bLat, bLng) {
    var R = 6371, p = Math.PI / 180;
    var dLa = (bLat - aLat) * p, dLo = (bLng - aLng) * p;
    var x = Math.sin(dLa / 2) * Math.sin(dLa / 2) +
      Math.cos(aLat * p) * Math.cos(bLat * p) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  // Близкие расстояния в метрах: «800 м» понятнее, чем «0,8 км».
  // Точность GPS — десятки метров, поэтому ближе 300 м цифру не выдумываем.
  function kmText(d, L) {
    var T = STR[L];
    if (d < 0.3) return T.km_here;
    if (d < 1) return Math.round(d * 10) * 100 + ' ' + T.m_away;
    var n = d < 10 ? d.toFixed(1) : String(Math.round(d));
    if (L !== 'en') n = n.replace('.', ',');
    return n + ' ' + T.km_away;
  }
  function hasCoords(c) {
    return !isNaN(c.lat) && !isNaN(c.lng) && (c.lat || c.lng);
  }
  // Расстояние от подростка до сообщества — только когда он сам включил «рядом со мной».
  function kmTo(c) {
    if (!state.near || !hasCoords(c)) return null;
    return distKm(state.near.lat, state.near.lng, c.lat, c.lng);
  }
  function digits(s) { return String(s || '').replace(/[^0-9]/g, ''); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
  // A photo can be a direct link, a file published next to the site (photos/name.jpg)
  // or an image embedded straight into the data file.
  function photoSrc(u) {
    u = String(u || '').trim();
    if (/^https?:\/\//i.test(u)) return u;
    if (/^data:image\/(png|jpeg|webp|gif);base64,/i.test(u)) return u;
    if (/^[\w][\w\-/]*\.(jpe?g|png|webp|avif|gif)$/i.test(u)) return u;
    return '';
  }

  var LOGO = function (size) {
    return '<svg class="logo" width="' + size + '" height="' + size + '" viewBox="0 0 32 32" fill="none" aria-hidden="true">' +
      '<path d="M16 4 L28 16 L16 28 L4 16 Z" stroke="#2F6BFF" stroke-opacity="0.3" stroke-width="1.4"/>' +
      '<path d="M10 16 C10 12 13 10.5 16 13 C19 10.5 22 12 22 16 C22 19.5 19 21.5 16 24 C13 21.5 10 19.5 10 16 Z" stroke="#2F6BFF" stroke-width="1.7" stroke-linejoin="round"/>' +
      '<circle cx="16" cy="8.5" r="1.9" fill="#2F6BFF"/><circle cx="23.5" cy="16" r="1.9" fill="#2F6BFF"/><circle cx="8.5" cy="16" r="1.9" fill="#2F6BFF"/></svg>';
  };

  var STAR = '<svg class="star" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6 14.9 9l6.6.7-4.9 4.5 1.4 6.5L12 17.4 6 20.7l1.4-6.5L2.5 9.7 9.1 9z"/></svg>';

  // Один крупный знак Qosyl вместо повторяющегося узора.
  var ORNAMENT = '<svg class="hero-orn" width="230" height="230" viewBox="0 0 32 32" fill="none" aria-hidden="true">' +
    '<path d="M16 4 L28 16 L16 28 L4 16 Z" stroke="#2F6BFF" stroke-opacity=".5" stroke-width=".7"/>' +
    '<path d="M10 16 C10 12 13 10.5 16 13 C19 10.5 22 12 22 16 C22 19.5 19 21.5 16 24 C13 21.5 10 19.5 10 16 Z" stroke="#2F6BFF" stroke-width=".9" stroke-linejoin="round"/>' +
    '<circle cx="16" cy="8.5" r="1.15" fill="#2F6BFF"/><circle cx="23.5" cy="16" r="1.15" fill="#2F6BFF"/>' +
    '<circle cx="8.5" cy="16" r="1.15" fill="#2F6BFF"/></svg>';

  // ---------- state ----------
  function initialLang() {
    var fromUrl = new URLSearchParams(window.location.search).get('lang');
    var stored = load(LANG_KEY, null);
    var pick = [fromUrl, stored].filter(function (l) { return l && STR[l]; })[0];
    if (pick) return pick;
    var nav = (navigator.language || '').toLowerCase();
    if (nav.indexOf('kk') === 0) return 'kz';
    if (nav.indexOf('en') === 0) return 'en';
    return 'ru';
  }
  function blankForm() {
    return { name: '', tag: '', about: '', cat: '', dist: '', age: '', cost: '', sched: '', addr: '', langs: '', tel: '', ig: '', tg: '', photo: '', kw: '', checked: '', lat: '', lng: '', beginner: true, verified: false, featured: false };
  }

  var state = {
    lang: initialLang(),
    q: '',
    cat: 'all',
    dist: 'all',
    allCats: false,      // показаны ли пустые пока секции
    free: false,         // только бесплатные
    beg: false,          // только те, что ждут новичков          // выбранный район, 'all' — все
    near: null,           // координаты подростка, пока он не ушёл со страницы
    nearState: null,      // null | 'asking' | 'denied'
    mine: load(STORE_KEY, []),
    reported: load(REPORT_KEY, []),
    form: blankForm(),
    formErr: '',
    justSaved: null,
    pin: null,
    copied: false,
    linkCopied: false,
    shown: PAGE, // сколько карточек списка показано
    photo: null // выбранный и сжатый файл: { dataUrl, blob, kb }
  };

  function normalizeUser(u) {
    return {
      id: u.id, cat: u.cat, dist: u.dist || '', slug: u.slug || u.id, verified: !!u.verified, beginner: !!u.beginner, featured: !!u.featured,
      checked: u.checked || '', mine: true, photo: u.photo || '',
      name: tri(u.name), tag: tri(u.tag || ''), about: tri(u.about || u.tag || ''),
      age: u.age || '—', cost: tri(u.cost || '—'), sched: tri(u.sched || '—'),
      addr: tri(u.addr || '—'), langs: tri(u.langs || '—'),
      tel: u.tel || '', ig: (u.ig || '').replace(/^@/, ''), tg: (u.tg || '').replace(/^@/, ''),
      lat: Number(u.lat), lng: Number(u.lng),
      kw: [u.name, u.kw, u.tag].join(' ')
    };
  }
  // ---------- цена ----------
  // «Бесплатно» написано словами и на трёх языках, поэтому разбираем текст.
  // Единственное место на сайте, где это решается: помощник берёт отсюда же.
  function costText(c) {
    var v = c.cost || {};
    return [v.ru, v.kz, v.en].join(' ').toLowerCase();
  }
  function isFree(c) {
    if (typeof c.free === 'boolean') return c.free;
    var t = costText(c);
    return /беспла|тегін|тегин|free|no cost/.test(t) || /^[\s0\-—–.,]*$/.test(t) || /\bнет\b|\bжоқ\b/.test(t);
  }
  function isPaid(c) {
    var t = costText(c);
    if (isFree(c)) return false;
    return /\d\s*(₸|тг|тенге|теңге|kzt|тыс)|плат|ақылы|paid|в месяц|per month|ай сайын/.test(t);
  }

  function allClubs() {
    var seen = {}, out = [];
    CLUBS.concat(state.mine.map(normalizeUser)).forEach(function (c) {
      var key = (c.id || '') + '|' + (c.slug || '');
      if (seen[key]) return;
      seen[key] = true;
      if (CAT_ALIAS[c.cat]) c.cat = CAT_ALIAS[c.cat];
      out.push(c);
    });
    return out;
  }
  function findClub(key) {
    return allClubs().filter(function (c) { return c.slug === key || c.id === key; })[0];
  }
  function hayOf(c) {
    if (!c.__hay) {
      c.__hay = [c.name.ru, c.name.kz, c.name.en, c.kw,
        catLabel(c.cat, 'ru'), catLabel(c.cat, 'kz'), catLabel(c.cat, 'en'),
        CAT_HINTS[c.cat] || '',
        c.dist ? distLabel(c.dist, 'ru') + ' ' + distLabel(c.dist, 'kz') + ' ' + distLabel(c.dist, 'en') : '',
        c.addr ? [c.addr.ru, c.addr.kz, c.addr.en].join(' ') : '',
        c.about ? [c.about.ru, c.about.kz, c.about.en].join(' ') : '',
        c.tag.ru, c.tag.kz, c.tag.en].join(' ').toLowerCase();
    }
    return c.__hay;
  }

  // ---------- поиск, который прощает ошибки ----------
  // Кириллицу, казахские буквы и латиницу сводим к одной латинской записи.
  // Из-за этого «дебаты», «debate» и «debat» становятся почти одним словом,
  // а «қ» и «к» перестают быть разными буквами.
  var TRANSLIT = {
    'а': 'a', 'ә': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'ғ': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'i', 'і': 'i', 'к': 'k', 'қ': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'ң': 'n', 'о': 'o', 'ө': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ұ': 'u', 'ү': 'u', 'ф': 'f', 'х': 'h', 'һ': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };

  function norm(s) {
    s = String(s == null ? '' : s).toLowerCase();
    var out = '', i, ch;
    for (i = 0; i < s.length; i++) {
      ch = s.charAt(i);
      if (TRANSLIT.hasOwnProperty(ch)) out += TRANSLIT[ch];
      else if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) out += ch;
      else out += ' ';
    }
    return out;
  }

  function toks(s) {
    return norm(s).split(/\s+/).filter(function (w) { return w.length > 1; });
  }

  function tokOf(c) {
    if (!c.__tok) c.__tok = toks(hayOf(c));
    return c.__tok;
  }

  // Расстояние Левенштейна с ранним выходом: считать больше max незачем.
  function lev(a, b, max) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur = [], i, j, best, cost;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      best = i;
      for (j = 1; j <= b.length; j++) {
        cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      for (j = 0; j <= b.length; j++) prev[j] = cur[j];
    }
    return prev[b.length];
  }

  // Сколько опечаток прощаем. В коротком слове — ни одной: иначе «бег»
  // начинает совпадать с «бокс» и поиск превращается в лотерею.
  function slack(w) { return w.length >= 7 ? 2 : w.length >= 4 ? 1 : 0; }

  function hitsWord(w, tokens) {
    var max = slack(w), i, t;
    for (i = 0; i < tokens.length; i++) {
      t = tokens[i];
      if (t.indexOf(w) !== -1) return true;
      if (!max) continue;
      // Опечатка в начале слова: сравниваем с куском такой же длины.
      if (t.length > w.length &&
        (lev(w, t.slice(0, w.length), max) <= max || lev(w, t.slice(0, w.length + 1), max) <= max)) return true;
      if (Math.abs(t.length - w.length) <= max && lev(w, t, max) <= max) return true;
      // Запрос длиннее слова в карточке: «благотворительность» против
      // ключевого «благотвор». Сравниваем по началу запроса.
      if (w.length > t.length && t.length >= 4 &&
        (w.indexOf(t) === 0 || lev(t, w.slice(0, t.length), slack(t)) <= slack(t))) return true;
    }
    return false;
  }

  function filtered() {
    var list = allClubs();
    if (state.cat !== 'all') list = list.filter(function (c) { return c.cat === state.cat; });
    if (state.dist !== 'all') list = list.filter(function (c) { return c.dist === state.dist; });
    if (state.free) list = list.filter(isFree);
    if (state.beg) list = list.filter(function (c) { return !!c.beginner; });
    var words = toks(state.q);
    if (words.length) {
      list = list.filter(function (c) {
        var tokens = tokOf(c);
        return words.every(function (w) { return hitsWord(w, tokens); });
      });
    }
    // «Рядом со мной» меняет только порядок, ничего не пряча: сообщество
    // без координат не исчезает, а уходит в конец списка.
    if (state.near) {
      list = list.slice().sort(function (a, b) {
        var da = kmTo(a), db = kmTo(b);
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
    }
    // Paid "featured" entries sit at the top; everything else keeps its order.
    var top = list.filter(function (c) { return c.featured; });
    return top.concat(list.filter(function (c) { return !c.featured; }));
  }
  function lastUpdated() {
    return CLUBS.map(function (c) { return c.checked; }).sort().pop();
  }
  function metaLine(c, L) { return catLabel(c.cat, L) + ' · ' + c.age + ' · ' + c.cost[L]; }
  function shareUrl(c) {
    var base = CFG.siteUrl || (window.location.origin + window.location.pathname);
    return base.replace(/#.*$/, '') + '#/club/' + encodeURIComponent(c.slug);
  }

  // ---------- routing ----------
  function route() {
    var h = window.location.hash.replace(/^#\/?/, '');
    var parts = h.split('/').map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    if (parts[0] === 'club' && parts[1]) return { screen: 'club', id: parts[1] };
    if (parts[0] === 'about' || parts[0] === 'map' || parts[0] === 'add') return { screen: parts[0] };
    return { screen: 'home' };
  }

  // ---------- views ----------
  function rowHTML(c, L, T) {
    var showCheck = c.verified;
    return '<a class="row' + (c.featured ? ' featured' : '') + '" href="#/club/' + esc(encodeURIComponent(c.slug)) + '">' +
      (c.featured ? '<span class="orn-bg" aria-hidden="true"></span><span class="top-badge">' + STAR + esc(T.featured) + '</span>' : '') +
      '<span class="row-head"><span class="row-name">' + esc(c.name[L]) + '</span><span class="cat-tag">' + esc(catLabel(c.cat, L)) + '</span></span>' +
      '<span class="row-tag">' + esc(c.tag[L]) + '</span>' +
      '<span class="meta">' +
      (function () { var d = kmTo(c); return d == null ? '' : '<span class="near-km">' + esc(kmText(d, L)) + '</span><span class="sep">·</span>'; })() +
      '<span>' + esc(c.age) + '</span><span class="sep">·</span><span>' + esc(c.cost[L]) + '</span>' +
      (c.beginner ? '<span class="sep">·</span><span class="beg">' + esc(T.beginner) + '</span>' : '') +
      (showCheck ? '<span class="sep">·</span><span>' + esc(T.verified) + '</span>' : '') +
      '</span></a>';
  }

  function resultsHTML() {
    var L = state.lang, T = STR[L], list = filtered();
    var head = '<div class="count-row"><span class="count" aria-live="polite">' + list.length + ' ' + esc(plural(list.length, L)) + ' ' + esc(T.found) + '</span>' +
      (lastUpdated() ? '<span class="updated">' + esc(T.updated_pre + ' ' + fmtDate(lastUpdated(), L)) + '</span>' : '') + '</div>';
    if (!list.length) {
      return head + '<div class="empty"><h2>' + esc(T.empty_h) + '</h2><p>' + esc(T.empty_p) + '</p>' +
        '<button class="btn-outline" data-action="reset">' + esc(T.empty_cta) + '</button></div>';
    }
    var shown = list.slice(0, state.shown);
    var rest = list.length - shown.length;
    return head + '<div class="list">' + shown.map(function (c) { return rowHTML(c, L, T); }).join('') + '</div>' +
      (rest > 0 ? '<button class="more" data-action="more">' + esc(T.more) + ' (' + rest + ')</button>' : '');
  }

  // Секции, в которых пока никого нет, прячем за кнопкой «ещё»: иначе
  // пустой каталог выглядит как десяток серых кнопок, то есть как заброшенный
  // сайт. Ничего не исчезает — разворачивается в один клик.
  function chipsHTML() {
    var L = state.lang, T = STR[L], cnt = {};
    allClubs().forEach(function (c) { cnt[c.cat] = (cnt[c.cat] || 0) + 1; });
    var full = [], empty = [];
    CATS.forEach(function (c) { (cnt[c.id] ? full : empty).push(c); });
    var shown = full.concat(state.allCats ? empty : []);
    var hidden = state.allCats ? 0 : empty.length;
    return [{ id: 'all', label: T.all, n: 1 }]
      .concat(shown.map(function (c) { return { id: c.id, label: c[L], n: cnt[c.id] || 0 }; }))
      .map(function (c) {
        return '<button class="chip' + (c.n ? '' : ' empty') + '" data-action="cat" data-id="' + c.id +
          '" aria-pressed="' + (state.cat === c.id) + '">' + esc(c.label) + '</button>';
      }).join('') +
      (hidden ? '<button class="chip more-cats" data-action="cats-more">' + esc(T.cats_more) + ' (' + hidden + ')</button>' : '');
  }

  // «Бесплатно» и «Новичкам» — два самых частых вопроса подростка,
  // поэтому они всегда на виду, а не спрятаны в меню фильтров.
  function flagsHTML() {
    var T = STR[state.lang];
    return [['free', T.f_free], ['beg', T.f_beg]].map(function (f) {
      return '<button class="chip sm flag" data-action="flag" data-id="' + f[0] +
        '" aria-pressed="' + !!state[f[0]] + '">' + esc(f[1]) + '</button>';
    }).join('');
  }

  // Районы показываем только те, что реально есть в каталоге: пустой фильтр
  // раздражает сильнее, чем его отсутствие.
  function districtsInUse() {
    var seen = {};
    allClubs().forEach(function (c) { if (c.dist) seen[c.dist] = true; });
    return DISTRICTS.filter(function (d) { return seen[d.id]; });
  }

  function nearBtnHTML() {
    var T = STR[state.lang];
    if (!navigator.geolocation || !allClubs().some(hasCoords)) return '';
    if (state.nearState === 'asking') return '<span class="near-btn wait">' + esc(T.near_wait) + '</span>';
    if (state.near) return '<button class="near-btn on" data-action="near-off"><span class="dot"></span>' + esc(T.near_off) + '</button>';
    return '<button class="near-btn" data-action="near"><span class="dot"></span>' + esc(T.near) + '</button>';
  }

  function distRowHTML() {
    var L = state.lang, T = STR[L], ds = districtsInUse(), near = nearBtnHTML();
    // Фильтр из одного района ничего не фильтрует — показываем от двух.
    if (ds.length < 2) ds = [];
    var chips = ds.length
      ? '<span class="dist-lbl">' + esc(T.f_dist) + '</span>' +
        [{ id: 'all', label: T.dist_all }].concat(ds.map(function (d) { return { id: d.id, label: d[L] }; }))
        .map(function (d) {
          return '<button class="chip sm" data-action="dist" data-id="' + d.id + '" aria-pressed="' + (state.dist === d.id) + '">' + esc(d.label) + '</button>';
        }).join('')
      : '';
    return '<div class="dist-row" id="dist-row">' + flagsHTML() + chips + near + '</div>' +
      (state.nearState === 'denied' ? '<p class="near-note">' + esc(T.near_no) + '</p>'
        : state.near ? '<p class="near-note">' + esc(T.near_on) + '</p>' : '');
  }

  function homeView() {
    var T = STR[state.lang];
    var ALL = allClubs();
    var stats = [
      [ALL.length, T.st_clubs],
      [CATS.length, T.st_cats],
      [ALL.filter(function (c) { return c.beginner; }).length, T.st_new]
    ];
    return '<section class="screen">' +
      '<div class="hero-card">' + ORNAMENT +
      '<div class="hero-body"><h1 class="hero">' + esc(T.h1) + '</h1>' +
      '<p class="lead">' + esc(T.lead) + '</p>' +
      '<ul class="stats">' + stats.map(function (st) { return '<li><b>' + st[0] + '</b><span>' + esc(st[1]) + '</span></li>'; }).join('') + '</ul>' +
      '</div></div>' +
      (window.QOSYL_HELPER ? window.QOSYL_HELPER.blockHTML() : '') +
      '<div class="search-row"><label class="search"><span class="sr-only">' + esc(T.search_label) + '</span>' +
      '<input id="q" type="search" autocomplete="off" value="' + esc(state.q) + '" placeholder="' + esc(T.search_ph) + '"></label>' +
      '<a class="map-btn" href="#/map" aria-label="' + esc(T.nav_map) + '"><span class="dot"></span><span class="lbl">' + esc(T.nav_map) + '</span></a></div>' +
      '<div class="chips" id="chips">' + chipsHTML() + '</div>' +
      '<div id="dist-wrap">' + distRowHTML() + '</div>' +
      '<div id="results">' + resultsHTML() + '</div>' +
      ownBlock() +
      '</section>';
  }


  // Призыв для организаторов: виден прямо под каталогом, а не только в «О проекте».
  function ownBlock() {
    var T = STR[state.lang], url = safeUrl(CFG.orgFormUrl) || '#/add';
    var ext = url.indexOf('#') === 0 ? '' : ' target="_blank" rel="noopener"';
    return '<section class="own"><div class="own-in">' +
      '<h2>' + esc(T.own_h) + '</h2><p>' + esc(T.own_p) + '</p>' +
      '<a class="own-btn" href="' + esc(url) + '"' + ext + '>' + esc(T.own_b) + '</a>' +
      '</div></section>';
  }

  function clubView(id) {
    var L = state.lang, T = STR[L];
    var c = findClub(id);
    if (!c) {
      return '<section class="screen tight"><a class="back" href="#/">' + esc(T.back) + '</a>' +
        '<div class="empty"><h2>' + esc(T.not_found_h) + '</h2><p>' + esc(T.not_found_p) + '</p>' +
        '<a class="btn-outline" href="#/">' + esc(T.empty_cta) + '</a></div></section>';
    }
    var reported = state.reported.indexOf(c.id) !== -1;
    var photo = photoSrc(c.photo);
    var tel = digits(c.tel);
    var geo = !isNaN(c.lat) && !isNaN(c.lng);
    var url = shareUrl(c);
    var ALL = allClubs();
    var similar = ALL.filter(function (s) { return s.cat === c.cat && s.id !== c.id; })
      .concat(ALL.filter(function (s) { return s.cat !== c.cat && s.beginner && s.id !== c.id; }))
      .slice(0, 2);

    var facts = [[T.f_sched, c.sched[L]], [T.f_addr, c.addr[L]]];
    if (c.dist) facts.push([T.f_dist, distLabel(c.dist, L)]);
    facts = facts.concat([[T.f_cost, c.cost[L]], [T.f_langs, c.langs[L]]]);

    return '<article class="screen tight">' +
      '<a class="back" href="#/">' + esc(T.back) + '</a>' +
      '<p class="eyebrow">' + esc(catLabel(c.cat, L)) + '</p>' +
      '<h1 class="title">' + esc(c.name[L]) + '</h1>' +
      '<div class="badges"><span class="badge">' + esc(c.age) + '</span>' +
      (c.featured ? '<span class="badge top">' + STAR + esc(T.featured) + '</span>' : '') +
      (c.beginner ? '<span class="badge beg">' + esc(T.beginner) + '</span>' : '') +
      (c.verified ? '<span class="badge ok">' + esc(T.verified) + '</span>' : '') + '</div>' +
      (photo
        ? '<img class="photo" src="' + esc(photo) + '" alt="' + esc(c.name[L]) + '" loading="lazy">'
        : '<div class="photo-ph"><span>' + esc(T.photo_ph) + '</span></div>') +
      '<p class="about-text">' + esc(c.about[L]) + '</p>' +
      '<dl class="facts">' + facts.map(function (f) { return '<div class="fact"><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<h2 class="sub">' + esc(T.contact_h) + '</h2>' +
      '<div class="contacts">' +
      (tel ? '<a class="wa" data-track="whatsapp" href="https://wa.me/' + tel + '?text=' + encodeURIComponent(T.greet) + '" target="_blank" rel="noopener">WhatsApp<small>' + esc(T.write) + '</small></a>' : '') +
      ((c.ig || c.tg) ? '<div class="grid2">' +
        (c.ig ? '<a class="social" data-track="instagram" href="https://instagram.com/' + esc(encodeURIComponent(c.ig)) + '" target="_blank" rel="noopener">Instagram</a>' : '') +
        (c.tg ? '<a class="social" data-track="telegram" href="https://t.me/' + esc(encodeURIComponent(c.tg)) + '" target="_blank" rel="noopener">Telegram</a>' : '') +
        '</div>' : '') +
      (tel ? '<a class="tel" data-track="phone" href="tel:+' + tel + '">' + esc(c.tel) + '</a>' : '') +
      '</div>' +
      (geo ? '<div class="grid2 maplinks">' +
        '<a class="maplink" href="https://www.google.com/maps/search/?api=1&amp;query=' + c.lat + ',' + c.lng + '" target="_blank" rel="noopener">' + esc(T.gmaps) + '</a>' +
        '<a class="maplink" href="https://2gis.kz/astana/geo/' + c.lng + ',' + c.lat + '" target="_blank" rel="noopener">' + esc(T.twogis) + '</a>' +
        '</div>' : '') +
      ((tel || c.ig || c.tg)
        ? '<div class="greet"><h3>' + esc(T.greet_h) + '</h3>' +
          '<p class="greet-text" id="greet-text">' + esc(T.greet) + '</p>' +
          '<div class="greet-row"><button class="greet-copy" data-action="copy-greet">' + esc(T.greet_copy) + '</button>' +
          '<span class="greet-note">' + esc(T.greet_p) + '</span></div></div>'
        : '') +
      '<div class="checked-row"><span class="date">' + esc(T.checked + ': ' + fmtDate(c.checked, L)) + '</span><div class="grow"></div>' +
      (reported
        ? '<span class="thanks" role="status">' + esc(T.reported) + '</span>'
        : '<button class="linkish" data-action="report" data-id="' + esc(c.id) + '">' + esc(T.report) + '</button>') +
      '</div>' +
      '<div class="share"><div class="qr" id="qr" aria-hidden="true"></div><div style="min-width:0">' +
      '<h2>' + esc(T.share_h) + '</h2><p class="share-url">' + esc(url.replace(/^https?:\/\//, '')) + '</p>' +
      '<div class="share-actions"><button data-action="copy-link" data-url="' + esc(url) + '">' + esc(state.linkCopied ? T.link_copied : T.copy_link) + '</button>' +
      '<button data-action="qr-dl" data-slug="' + esc(c.slug) + '">' + esc(T.qr_dl) + '</button></div>' +
      '</div></div>' +
      (similar.length ? '<h2 class="sub">' + esc(T.similar_h) + '</h2><div class="similar">' +
        similar.map(function (s) { return '<a class="card" href="#/club/' + esc(encodeURIComponent(s.slug)) + '"><b>' + esc(s.name[L]) + '</b><span>' + esc(metaLine(s, L)) + '</span></a>'; }).join('') +
        '</div>' : '') +
      '</article>';
  }

  function aboutView() {
    var T = STR[state.lang];
    var formUrl = safeUrl(CFG.orgFormUrl);
    return '<article class="screen about">' + LOGO(58) +
      '<h1>' + esc(T.about_h1) + '</h1>' +
      '<p class="lead-lg">' + esc(T.about_lead) + '</p>' +
      T.about_s.concat(CFG.goatcounter ? [{ h: T.stats_h, p: T.stats_p }] : [])
        .map(function (s) { return '<section><h2>' + esc(s.h) + '</h2><p>' + esc(s.p) + '</p></section>'; }).join('') +
      '<div class="cta"><h2>' + esc(T.cta_h) + '</h2><p>' + esc(T.cta_p) + '</p><div class="cta-btns">' +
      '<a class="cta-w" href="' + esc(formUrl || '#/add') + '"' + (formUrl ? ' target="_blank" rel="noopener"' : '') + '>' + esc(T.cta_b1) + '</a>' +
      '<a class="cta-o" href="#/">' + esc(T.cta_b2) + '</a></div></div>' +
      '</article>';
  }

  function mapListHTML() {
    var L = state.lang, T = STR[L];
    var all = allClubs();
    var rest = all.length - state.shown;
    return all.slice(0, state.shown).map(function (c) {
      return '<a class="map-item" href="#/club/' + esc(encodeURIComponent(c.slug)) + '"><span class="dot' + (c.mine ? ' mine' : '') + '" style="width:8px;height:8px"></span>' +
        '<b>' + esc(c.name[L]) + '</b><span>' + esc(c.addr[L]) + '</span></a>';
    }).join('') +
    (rest > 0 ? '<button class="more" data-action="more-map">' + esc(T.more) + ' (' + rest + ')</button>' : '');
  }

  function pinHTML() {
    var L = state.lang, T = STR[L];
    var c = state.pin && findClub(state.pin);
    if (!c) return '';
    return '<div class="pin-card"><span class="txt"><b>' + esc(c.name[L]) + '</b><span>' + esc(metaLine(c, L)) + '</span></span>' +
      '<a class="btn-solid" href="#/club/' + esc(encodeURIComponent(c.slug)) + '">' + esc(T.open) + '</a></div>';
  }

  function mapView() {
    var T = STR[state.lang];
    return '<section class="screen tight">' +
      '<a class="back" href="#/">' + esc(T.back) + '</a>' +
      '<h1 class="map-title">' + esc(T.map_h1) + '</h1>' +
      '<div class="map-box"><div class="map" id="map"></div><div id="pin">' + pinHTML() + '</div></div>' +
      '<div class="map-list" id="map-list">' + mapListHTML() + '</div>' +
      '</section>';
  }

  // ---------- creator panel (Russian only — it is for the site admin) ----------
  var FORM_FIELDS = [
    { key: 'name', label: 'Название сообщества', ph: 'Например: Дебатный клуб «Сөз»', wide: true },
    { key: 'tag', label: 'Одна строка для каталога', ph: 'Собираем роботов и учим их ездить по линии', wide: true },
    { key: 'age', label: 'Возраст', ph: '12–17' },
    { key: 'cost', label: 'Стоимость', ph: 'Бесплатно' },
    { key: 'sched', label: 'Когда', ph: 'Сб, 11:00–13:00' },
    { key: 'addr', label: 'Адрес', ph: 'ул. Кенесары, 40' },
    { key: 'langs', label: 'Языки', ph: 'Русский, казахский' },
    { key: 'tel', label: 'Телефон / WhatsApp', ph: '+7 701 234 56 78', type: 'tel' },
    { key: 'ig', label: 'Instagram без @', ph: 'robocode.ast' },
    { key: 'tg', label: 'Telegram без @', ph: 'robocode_ast' },
    { key: 'checked', label: 'Дата проверки', ph: today(), type: 'date' },
    { key: 'kw', label: 'Ключевые слова для поиска', ph: 'робот arduino инженер', wide: true }
  ];

  // Suggests a section from the words in the form (name, tagline, keywords, description).
  function guessCat(f) {
    var text = [f.name, f.tag, f.kw, f.about].join(' ').toLowerCase();
    if (text.replace(/\s/g, '').length < 3) return null;
    var best = null, bestScore = 0;
    Object.keys(CAT_HINTS).forEach(function (id) {
      var score = 0;
      CAT_HINTS[id].split(' ').forEach(function (w) { if (w && text.indexOf(w) !== -1) score += w.length; });
      if (score > bestScore) { bestScore = score; best = id; }
    });
    return bestScore >= 4 ? best : null;
  }

  function guessHTML() {
    var f = state.form, g = guessCat(f);
    if (!g) return '';
    var label = catLabel(g, 'ru');
    return '<div class="guess" role="status"><span>' +
      (f.cat === g ? 'Похоже на секцию «' + esc(label) + '» — совпадает с выбранной.' : 'По описанию это похоже на секцию «' + esc(label) + '».') +
      '</span>' + (f.cat !== g ? '<button data-action="form-cat" data-id="' + g + '">Поставить</button>' : '') + '</div>';
  }

  // Ближайший центр района к поставленной точке. Это ПОДСКАЗКА: район
  // сохраняется только тем, что выбрано руками. Далёкую точку не угадываем.
  function guessDist(f) {
    var la = Number(f.lat), ln = Number(f.lng);
    if (isNaN(la) || isNaN(ln) || (!la && !ln)) return null;
    var best = null, bestKm = 25;
    DISTRICTS.forEach(function (d) {
      var km = distKm(la, ln, d.lat, d.lng);
      if (km < bestKm) { bestKm = km; best = d.id; }
    });
    return best;
  }

  function formDistsHTML() {
    var f = state.form, g = guessDist(f);
    return DISTRICTS.map(function (d) {
      var on = f.dist === d.id;
      return '<button class="chip' + (!on && d.id === g ? ' hint' : '') + '" data-action="form-dist" data-id="' + d.id + '" aria-pressed="' + on + '">' + esc(d.ru) + '</button>';
    }).join('');
  }

  function formCatsHTML() {
    var f = state.form, g = guessCat(f);
    return CATS.map(function (c) {
      var on = f.cat === c.id;
      return '<button class="chip' + (!on && c.id === g ? ' hint' : '') + '" data-action="form-cat" data-id="' + c.id + '" aria-pressed="' + on + '">' + esc(c.ru) + '</button>';
    }).join('');
  }

  function updateGuess() {
    var box = document.getElementById('guess'), cats = document.getElementById('form-cats');
    if (box) box.innerHTML = guessHTML();
    if (cats) cats.innerHTML = formCatsHTML();
    updateDists();
  }
  function updateDists() {
    var el = document.getElementById('form-dists');
    if (el) el.innerHTML = formDistsHTML();
  }

  // Кириллические названия дают пустой slug, поэтому добавляем метку времени,
  // иначе файлы разных сообществ перезапишут друг друга.
  function photoName() {
    var base = slugify(state.form.name);
    return (base || 'photo-' + Date.now().toString(36)) + '.jpg';
  }

  function photoBlockHTML() {
    var f = state.form, ph = state.photo;
    var current = photoSrc(f.photo);
    return '<p class="label">Фото сообщества</p>' +
      '<div class="photo-box" id="photo-box">' +
        '<label class="file-btn">' + (ph ? 'Выбрать другое фото' : 'Выбрать фото с компьютера') +
          '<input type="file" accept="image/*" data-photo hidden></label>' +
        (ph
          ? '<img class="photo-prev" src="' + ph.dataUrl + '" alt="">' +
            '<p class="hint">Сжато до ' + ph.kb + ' КБ. Дальше выбери, как положить фото на сайт:</p>' +
            '<div class="photo-actions">' +
              '<button class="btn-small' + (ph.kb > 150 ? '' : ' ghost') + '" data-action="photo-download">1. Скачать файл и положить в папку photos</button>' +
              '<button class="btn-small' + (ph.kb > 150 ? ' ghost' : '') + '" data-action="photo-embed">2. Встроить фото прямо в код</button>' +
            '</div>' +
            (ph.kb > 150
              ? '<p class="warn">Фото тяжёлое (' + ph.kb + ' КБ). Лучше вариант 1: если встроить его в код, файл data.js вырастет примерно на ' + Math.round(ph.kb * 1.35) + ' КБ.</p>'
              : '')
          : '<p class="hint">Файл уменьшается до 1400 px и сжимается сам. Ссылки на Google Диск, Instagram и Pinterest не работают: это ссылки на страницу, а не на картинку.</p>') +
        (current
          ? '<p class="photo-now">В карточке сейчас: <code>' + esc(f.photo.slice(0, 60) + (f.photo.length > 60 ? '…' : '')) + '</code> ' +
            '<button class="linkish" data-action="photo-clear">убрать</button></p>'
          : '') +
        '<label class="field"><span>Или прямая ссылка на картинку</span>' +
        '<input data-field="photo" type="url" value="' + esc(/^data:/.test(f.photo) ? '' : f.photo || '') + '" placeholder="https://…/foto.jpg"></label>' +
      '</div>';
  }

  function updatePhotoBlock() {
    var box = document.getElementById('photo-box');
    if (box) box.outerHTML = photoBlockHTML().replace('<p class="label">Фото сообщества</p>', '');
  }

  // Большие снимки с телефона ужимаются, иначе файл сайта распухает.
  function handlePhotoFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 1400, w = img.width, h = img.height;
        if (w > max || h > max) { var k = max / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
        var cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        cv.toBlob(function (blob) {
          var fr = new FileReader();
          fr.onload = function () {
            state.photo = { dataUrl: fr.result, blob: blob, kb: Math.round(blob.size / 1024) };
            updatePhotoBlock();
          };
          fr.readAsDataURL(blob);
        }, 'image/jpeg', 0.75);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function coordText() {
    var f = state.form;
    return (f.lat && f.lng) ? ('широта ' + f.lat + ' · долгота ' + f.lng) : 'координаты не выбраны';
  }

  function exportEntry(m) {
    return {
      id: m.id, cat: m.cat, dist: m.dist || '', slug: m.slug, verified: !!m.verified, beginner: !!m.beginner, featured: !!m.featured, checked: m.checked,
      name: tri(m.name), tag: tri(m.tag || ''), about: tri(m.about || m.tag || ''),
      age: m.age || '—', cost: tri(m.cost || '—'), sched: tri(m.sched || '—'),
      addr: tri(m.addr || '—'), langs: tri(m.langs || '—'),
      tel: m.tel || '', ig: m.ig || '', tg: m.tg || '', photo: m.photo || '',
      lat: Number(m.lat), lng: Number(m.lng), kw: m.kw || ''
    };
  }
  function jsonOut() {
    return state.mine.map(function (m) { return JSON.stringify(exportEntry(m), null, 2); }).join(',\n');
  }

  // Полный каталог: то, что уже на сайте, плюс добавленное в этом браузере.
  // Повторы убираем: одно и то же сообщество может быть и там, и там.
  function catalogueFile() {
    var seen = {}, out = [];
    CLUBS.concat(state.mine.map(exportEntry)).forEach(function (c) {
      var key = (c.id || '') + '|' + (c.slug || '');
      if (seen[key]) return;
      seen[key] = true;
      out.push(c);
    });
    return JSON.stringify(out, null, 1);
  }

  function downloadCatalogue() {
    var blob = new Blob([catalogueFile()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'communities.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function addView() {
    var f = state.form;
    var mine = state.mine;
    var saved = state.justSaved && findClub(state.justSaved);
    return '<section class="screen tight creator">' +
      '<a class="back" href="#/">← Каталог</a>' +
      '<p class="eyebrow" style="font-size:10.5px">панель создателя</p>' +
      '<h1 class="title">Добавить сообщество</h1>' +
      '<p class="intro">Сообщество заполняет Google Форму, ты переносишь ответы сюда. Оно сразу появляется в каталоге и пином на карте — но только в этом браузере. Чтобы его увидели все, скопируй код внизу в массив CLUBS файла data.js и опубликуй сайт.</p>' +
      (saved ? '<div class="saved" role="status"><span>Сообщество добавлено — оно уже в каталоге и на карте.</span>' +
        '<a class="a1" href="#/club/' + esc(encodeURIComponent(saved.slug)) + '">Страница сообщества</a><a class="a2" href="#/map">На карте</a></div>' : '') +
      '<p class="label">Секция</p>' +
      '<div id="guess">' + guessHTML() + '</div>' +
      '<div class="chips" id="form-cats" style="margin:0 0 22px">' + formCatsHTML() + '</div>' +
      '<p class="label">Район <span class="label-note">необязательно — нужен для фильтра «рядом с домом»</span></p>' +
      '<div class="chips" id="form-dists" style="margin:0 0 22px">' + formDistsHTML() + '</div>' +
      '<div class="fields">' + FORM_FIELDS.map(function (fd) {
        return '<label class="field' + (fd.wide ? ' wide' : '') + '"><span>' + esc(fd.label) + '</span>' +
          '<input data-field="' + fd.key + '" type="' + (fd.type || 'text') + '" value="' + esc(f[fd.key] || '') + '" placeholder="' + esc(fd.ph) + '"></label>';
      }).join('') + '</div>' +
      '<label class="field" style="margin-bottom:18px"><span>Описание</span>' +
      '<textarea data-field="about" rows="4" placeholder="Кто ходит, как проходит первое занятие, можно ли прийти одному">' + esc(f.about) + '</textarea></label>' +
      photoBlockHTML() +
      '<div class="toggles">' + [['beginner', 'Подходит новичкам'], ['verified', 'Я связался с организатором'], ['featured', '★ Лучшее — размещение оплачено']].map(function (tg) {
        return '<button class="toggle" data-action="toggle" data-id="' + tg[0] + '" aria-pressed="' + !!f[tg[0]] + '"><i></i>' + tg[1] + '</button>';
      }).join('') + '</div>' +
      '<p class="label">Координаты — нажми на карту</p>' +
      '<div class="pick-box"><div class="pick" id="pick"></div><div class="coords" id="coords">' + esc(coordText()) + '</div></div>' +
      '<p class="form-err" id="form-err" role="alert"' + (state.formErr ? '' : ' hidden') + '>' + esc(state.formErr) + '</p>' +
      '<button class="save-btn" data-action="save">Добавить в каталог</button>' +
      (mine.length ? '<div class="block"><p class="block-h">Добавлено мной (' + mine.length + ')</p><div style="display:flex;flex-direction:column;gap:6px">' +
        mine.map(function (m) {
          return '<div class="mine-item"><span class="txt"><b>' + esc(m.name) + '</b><span>' + esc(catLabel(m.cat, 'ru') + ' · ' + (m.age || '—') + ' · ' + (m.cost || '—')) + '</span></span>' +
            '<a href="#/club/' + esc(encodeURIComponent(m.slug)) + '">Открыть</a><button data-action="delete" data-id="' + esc(m.id) + '">Удалить</button></div>';
        }).join('') + '</div></div>' +
        '<div class="block" style="margin-bottom:0">' +
        '<p class="block-h">Перенести на сайт</p>' +
        '<p class="intro" style="margin-bottom:14px">Скачай файл каталога и загрузи его на GitHub вместо старого <code>communities.json</code>. ' +
        'В файле уже всё: и то, что на сайте, и добавленное здесь (' + mine.length + ').</p>' +
        '<button class="btn-small" data-action="download-catalogue">Скачать communities.json</button>' +
        '<div class="json-head" style="margin-top:22px"><p>Или скопировать код вручную</p><button data-action="copy-json">' + (state.copied ? 'Скопировано' : 'Скопировать') + '</button></div>' +
        '<textarea class="json" readonly rows="8">' + esc(jsonOut()) + '</textarea></div>' : '') +
      '</section>';
  }

  // ---------- maps ----------
  var maps = { view: null, pins: null, pick: null, pickMark: null };

  function pinIcon(mine) {
    return window.L.divIcon({
      className: '',
      html: '<span style="display:block;width:14px;height:14px;border-radius:50%;background:' + (mine ? '#1B52DA' : '#2F6BFF') + ';border:2.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35)"></span>',
      iconSize: [14, 14], iconAnchor: [7, 7]
    });
  }
  function tiles() {
    return window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
  }
  function destroyMaps() {
    if (maps.view) { maps.view.remove(); maps.view = null; maps.pins = null; }
    if (maps.pick) { maps.pick.remove(); maps.pick = null; maps.pickMark = null; }
  }
  function drawPins() {
    if (!maps.view) return;
    var L = state.lang;
    maps.pins.clearLayers();
    allClubs().filter(function (c) { return !isNaN(c.lat) && !isNaN(c.lng); }).forEach(function (c) {
      var m = window.L.marker([c.lat, c.lng], { icon: pinIcon(c.mine), title: c.name[L] }).addTo(maps.pins);
      m.bindTooltip(c.name[L], { direction: 'top', offset: [0, -10] });
      m.on('click', function () { state.pin = c.id; document.getElementById('pin').innerHTML = pinHTML(); });
    });
  }
  function mountViewMap() {
    var el = document.getElementById('map');
    if (!el || !window.L) return;
    maps.view = window.L.map(el).setView(CENTER, 11);
    tiles().addTo(maps.view);
    maps.pins = window.L.layerGroup().addTo(maps.view);
    maps.view.on('click', function () {
      if (state.pin) { state.pin = null; document.getElementById('pin').innerHTML = ''; }
    });
    drawPins();
  }
  function setPickMarker() {
    var f = state.form, lat = Number(f.lat), lng = Number(f.lng);
    if (!maps.pick) return;
    if (f.lat && f.lng && !isNaN(lat) && !isNaN(lng)) {
      if (!maps.pickMark) maps.pickMark = window.L.marker([lat, lng], { icon: pinIcon() }).addTo(maps.pick);
      else maps.pickMark.setLatLng([lat, lng]);
    } else if (maps.pickMark) { maps.pick.removeLayer(maps.pickMark); maps.pickMark = null; }
  }
  function mountPickMap() {
    var el = document.getElementById('pick');
    if (!el || !window.L) return;
    var f = state.form;
    maps.pick = window.L.map(el).setView([Number(f.lat) || CENTER[0], Number(f.lng) || CENTER[1]], 11);
    tiles().addTo(maps.pick);
    maps.pick.on('click', function (e) {
      state.form.lat = e.latlng.lat.toFixed(5);
      state.form.lng = e.latlng.lng.toFixed(5);
      document.getElementById('coords').textContent = coordText();
      setPickMarker();
      updateDists();
    });
    setPickMarker();
  }

  function renderQR(url) {
    var box = document.getElementById('qr');
    if (!box) return;
    if (typeof window.qrcode !== 'function') { box.classList.add('qr-fallback'); return; }
    var qr = window.qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }
  function downloadQR(slug) {
    var svg = document.querySelector('#qr svg');
    if (!svg) return;
    var src = svg.outerHTML;
    if (src.indexOf('xmlns=') === -1) src = src.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    // Add a white quiet zone so the code scans when printed on a poster.
    var blob = new Blob([src], { type: 'image/svg+xml' });
    var img = new Image();
    var u = URL.createObjectURL(blob);
    img.onload = function () {
      var size = 1024, pad = 96, cv = document.createElement('canvas');
      cv.width = cv.height = size + pad * 2;
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, pad, pad, size, size);
      URL.revokeObjectURL(u);
      var a = document.createElement('a');
      a.download = 'qr-' + slug + '.png';
      a.href = cv.toDataURL('image/png');
      a.click();
    };
    img.src = u;
  }

  function copyText(text) {
    // Современный способ иногда отказывает (нет фокуса, старый браузер) — тогда старый.
    function legacy() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
    }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(legacy);
    }
    return legacy();
  }

  var toastTimer = null;
  function toast(text) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, 3200);
  }

  // Координаты берём у браузера и держим только в памяти вкладки: ни на сервер,
  // ни в localStorage, ни в статистику они не уходят — туда идёт лишь сам факт нажатия.
  function askNear() {
    if (!navigator.geolocation) return;
    state.nearState = 'asking';
    repaintList();
    navigator.geolocation.getCurrentPosition(function (p) {
      state.near = { lat: p.coords.latitude, lng: p.coords.longitude };
      state.nearState = null;
      state.shown = PAGE;
      statsSend({ path: 'near/on', title: 'Каталог — рядом со мной', event: true });
      repaintList();
    }, function () {
      state.near = null;
      state.nearState = 'denied';
      statsSend({ path: 'near/denied', title: 'Каталог — геолокация отклонена', event: true });
      repaintList();
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  // Перерисовываем только список и фильтры, чтобы страница не прыгала.
  function repaintList() {
    var wrap = document.getElementById('dist-wrap'), res = document.getElementById('results');
    if (wrap) wrap.innerHTML = distRowHTML();
    if (res) res.innerHTML = resultsHTML();
  }

  // ---------- chrome (header/footer) ----------
  function renderChrome(r) {
    var T = STR[state.lang];
    document.documentElement.lang = LANGS.filter(function (l) { return l.id === state.lang; })[0].html;
    document.querySelector('[data-logo]').innerHTML = LOGO(28) + '<span>Qosyl<span class="city"> · ' + (state.lang === 'en' ? 'Astana' : 'Астана') + '</span></span>';
    document.querySelector('[data-logo-big]').innerHTML = LOGO(76);
    document.getElementById('foot-mission').textContent = T.foot_mission;
    document.getElementById('foot-creator').textContent = T.creator;
    document.getElementById('foot-creator-note').textContent = T.creator_note;
    var about = document.getElementById('nav-about');
    about.textContent = T.nav_about;
    if (r.screen === 'about') about.setAttribute('aria-current', 'page'); else about.removeAttribute('aria-current');
    var langs = document.getElementById('langs');
    langs.setAttribute('aria-label', T.lang_label);
    langs.innerHTML = LANGS.map(function (l) {
      return '<button data-action="lang" data-id="' + l.id + '" aria-pressed="' + (state.lang === l.id) + '" lang="' + l.html + '">' + l.label + '</button>';
    }).join('');
    document.getElementById('foot-note').textContent = T.foot_note;
    document.getElementById('foot-about').textContent = T.nav_about;
    document.getElementById('foot-map').textContent = T.nav_map;
    document.getElementById('foot-priv').textContent = T.foot_priv;
    // The creator panel is for the site owner, so its link is hidden unless config says otherwise.
    document.getElementById('foot-add').hidden = !CFG.creatorLink;
  }

  function pageTitle(r) {
    var T = STR[state.lang], site = T.site;
    if (r.screen === 'club') { var c = findClub(r.id); return c ? c.name[state.lang] + ' — ' + site : site; }
    if (r.screen === 'about') return T.nav_about + ' — ' + site;
    if (r.screen === 'map') return T.map_h1 + ' — ' + site;
    if (r.screen === 'add') return 'Панель создателя — ' + site;
    return site + ' — ' + T.h1;
  }

  // ---------- render ----------
  var lastKey = null;
  function render(opts) {
    var r = route();
    var key = r.screen + '/' + (r.id || '');
    var changedPage = key !== lastKey;
    lastKey = key;
    if (changedPage) { state.pin = null; state.linkCopied = false; state.shown = PAGE; if (r.screen !== 'add') state.justSaved = null; }

    destroyMaps();
    renderChrome(r);
    var app = document.getElementById('app');
    var html = r.screen === 'club' ? clubView(r.id)
      : r.screen === 'about' ? aboutView()
      : r.screen === 'map' ? mapView()
      : r.screen === 'add' ? addView()
      : homeView();
    if (changedPage) app.setAttribute('data-enter', ''); else app.removeAttribute('data-enter');
    app.innerHTML = html;
    document.title = pageTitle(r);
    if (changedPage) trackPage(r);

    if (r.screen === 'map') mountViewMap();
    if (r.screen === 'add') mountPickMap();
    if (r.screen === 'club') { var c = findClub(r.id); if (c) renderQR(shareUrl(c)); }

    if (changedPage && !(opts && opts.keepScroll)) {
      window.scrollTo(0, 0);
      if (opts && opts.focus) app.focus({ preventScroll: true });
    }
  }

  // ---------- events ----------
  document.addEventListener('click', function (e) {
    var tr = e.target.closest('[data-track]');
    if (tr) {
      var how = tr.getAttribute('data-track');
      var r = route(), tc = r.screen === 'club' && findClub(r.id);
      if (tc) statsSend({ path: 'contact/' + how + '/' + tc.slug, title: tc.name.ru + ' — ' + how, event: true });
      // Instagram и Telegram не умеют открывать чат с готовым текстом — кладём его в буфер.
      if (how === 'instagram' || how === 'telegram') {
        var T2 = STR[state.lang];
        copyText(T2.greet).then(function () { toast(T2.greet_copied); }, function () {});
      }
    }
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var action = el.getAttribute('data-action'), id = el.getAttribute('data-id');
    switch (action) {
      case 'lang':
        state.lang = id; save(LANG_KEY, id);
        render({ keepScroll: true });
        break;
      case 'cat':
        state.cat = id;
        state.shown = PAGE;
        document.getElementById('chips').innerHTML = chipsHTML();
        document.getElementById('results').innerHTML = resultsHTML();
        break;
      case 'form-dist':
        state.form.dist = state.form.dist === id ? '' : id;
        updateGuess();
        break;
      case 'dist':
        state.dist = id;
        state.shown = PAGE;
        repaintList();
        break;
      case 'cats-more':
        state.allCats = true;
        document.getElementById('chips').innerHTML = chipsHTML();
        break;
      case 'flag':
        state[id] = !state[id];
        state.shown = PAGE;
        repaintList();
        break;
      case 'near':
        askNear();
        break;
      case 'near-off':
        state.near = null; state.nearState = null; state.shown = PAGE;
        repaintList();
        break;
      case 'reset':
        state.q = ''; state.cat = 'all'; state.dist = 'all'; state.free = false; state.beg = false; state.shown = PAGE;
        render({ keepScroll: true });
        break;
      case 'report': {
        if (state.reported.indexOf(id) === -1) state.reported.push(id);
        save(REPORT_KEY, state.reported);
        var club = findClub(id);
        if (CFG.reportEmail && club) {
          window.location.href = 'mailto:' + CFG.reportEmail + '?subject=' + encodeURIComponent('Устарела информация: ' + club.name.ru) +
            '&body=' + encodeURIComponent(shareUrl(club) + '\n\n');
        }
        render({ keepScroll: true });
        break;
      }
      case 'more':
        state.shown += PAGE;
        document.getElementById('results').innerHTML = resultsHTML();
        break;
      case 'more-map':
        state.shown += PAGE;
        document.getElementById('map-list').innerHTML = mapListHTML();
        break;
      case 'copy-greet':
        copyText(STR[state.lang].greet).then(function () {
          toast(STR[state.lang].greet_copied);
        }, function () {
          // Буфер недоступен — выделяем текст, чтобы его можно было скопировать вручную.
          var node = document.getElementById('greet-text');
          if (!node) return;
          var sel = window.getSelection(), rng = document.createRange();
          rng.selectNodeContents(node); sel.removeAllRanges(); sel.addRange(rng);
        });
        break;
      case 'copy-link':
        copyText(el.getAttribute('data-url')).then(function () {
          state.linkCopied = true;
          el.textContent = STR[state.lang].link_copied;
        }, function () {});
        break;
      case 'qr-dl':
        downloadQR(el.getAttribute('data-slug'));
        break;
      case 'form-cat':
        state.form.cat = id; state.formErr = '';
        updateGuess();
        showFormErr();
        break;
      case 'toggle':
        state.form[id] = !state.form[id];
        el.setAttribute('aria-pressed', String(state.form[id]));
        break;
      case 'save':
        saveClub();
        break;
      case 'delete':
        if (!window.confirm('Удалить это сообщество из каталога в этом браузере?')) return;
        state.mine = state.mine.filter(function (c) { return c.id !== id; });
        save(STORE_KEY, state.mine);
        state.justSaved = null;
        render({ keepScroll: true });
        break;
      case 'photo-download': {
        if (!state.photo) return;
        var name = photoName();
        var a = document.createElement('a');
        a.href = URL.createObjectURL(state.photo.blob);
        a.download = name;
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        state.form.photo = 'photos/' + name;
        updatePhotoBlock();
        break;
      }
      case 'photo-embed':
        if (!state.photo) return;
        state.form.photo = state.photo.dataUrl;
        updatePhotoBlock();
        break;
      case 'photo-clear':
        state.form.photo = '';
        state.photo = null;
        updatePhotoBlock();
        break;
      case 'download-catalogue':
        downloadCatalogue();
        break;
      case 'copy-json':
        copyText(jsonOut()).then(function () { state.copied = true; el.textContent = 'Скопировано'; }, function () {});
        break;
    }
  });

  document.addEventListener('change', function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute('data-photo')) handlePhotoFile(e.target.files[0]);
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'q') {
      state.q = t.value;
      state.shown = PAGE;
      document.getElementById('results').innerHTML = resultsHTML();
      return;
    }
    var key = t.getAttribute && t.getAttribute('data-field');
    if (key) {
      state.form[key] = t.value;
      if (state.formErr) { state.formErr = ''; showFormErr(); }
      if (key === 'name' || key === 'tag' || key === 'kw' || key === 'about') updateGuess();
    }
  });

  function showFormErr() {
    var p = document.getElementById('form-err');
    if (!p) return;
    p.textContent = state.formErr;
    p.hidden = !state.formErr;
  }

  function saveClub() {
    var f = state.form;
    var err = !f.name.trim() ? 'Впиши название сообщества.'
      : !f.cat ? 'Выбери секцию.'
      : (!f.lat || !f.lng || isNaN(Number(f.lat)) || isNaN(Number(f.lng))) ? 'Поставь точку на карте — без координат клуб не появится на карте.'
      : (f.photo && !photoSrc(f.photo)) ? 'Фото не распознано: выбери файл с компьютера или дай прямую ссылку на картинку (адрес должен заканчиваться на .jpg или .png).'
      : '';
    if (err) { state.formErr = err; showFormErr(); return; }
    var id = 'u' + Date.now().toString(36);
    var slug = slugify(f.name) || id;
    if (findClub(slug)) slug = slug + '-' + id;
    var rec = {};
    Object.keys(f).forEach(function (k) { rec[k] = typeof f[k] === 'string' ? f[k].trim() : f[k]; });
    rec.id = id; rec.slug = slug; rec.checked = rec.checked || today();
    rec.ig = rec.ig.replace(/^@/, ''); rec.tg = rec.tg.replace(/^@/, '');
    state.mine = state.mine.concat([rec]);
    save(STORE_KEY, state.mine);
    state.form = blankForm();
    state.photo = null;
    state.formErr = '';
    state.justSaved = id;
    state.copied = false;
    render({ keepScroll: true });
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', function () { render({ focus: true }); });
  window.addEventListener('storage', function (e) {
    if (e.key === STORE_KEY) { state.mine = load(STORE_KEY, []); render({ keepScroll: true }); }
  });

  // ---------- anonymous statistics (GoatCounter: no cookies, no personal data) ----------
  var stats = { ready: false, queue: [] };
  function statsSend(opts) {
    if (!CFG.goatcounter) return;
    if (stats.ready && window.goatcounter && window.goatcounter.count) window.goatcounter.count(opts);
    else stats.queue.push(opts);
  }
  function loadStats() {
    var code = String(CFG.goatcounter || '').trim();
    if (!code) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', /^https?:\/\//.test(code) ? code : 'https://' + code + '.goatcounter.com/count');
    // The site switches pages via #hash, so pages are counted by hand instead of on load.
    s.setAttribute('data-goatcounter-settings', JSON.stringify({ no_onload: true }));
    s.onload = function () { stats.ready = true; stats.queue.splice(0).forEach(statsSend); };
    document.head.appendChild(s);
  }
  // The creator panel is for the admin, so it is not counted.
  function trackPage(r) {
    if (r.screen === 'add') return;
    var path = r.screen === 'home' ? '/' : r.screen === 'club' ? '/club/' + r.id : '/' + r.screen;
    statsSend({ path: path, title: document.title });
  }

  // Каталог лежит в communities.json: так размер страницы не зависит от числа сообществ.
  function loadCatalogue() {
    return fetch('communities.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (list) { if (Array.isArray(list)) CLUBS = list; })
      .catch(function () { /* файла нет или сайт открыт через file:// — каталог остаётся пустым */ });
  }

  // Мост для helper.js (помощник выбора на главной): он не держит своих данных
  // и каждый раз берёт каталог, язык и разметку карточки отсюда.
  window.QOSYL_APP = {
    allClubs: allClubs,
    rowHTML: rowHTML,
    catLabel: catLabel,
    esc: esc,
    lang: function () { return state.lang; },
    distKm: distKm,
    isFree: isFree,
    isPaid: isPaid,
    kmText: kmText,
    track: statsSend,
    toast: toast
  };

  loadStats();
  render();
  loadCatalogue().then(function () { render({ keepScroll: true }); });
})();
