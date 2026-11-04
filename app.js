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
  var DRAFT_KEY = 'qosyl.join.v1'; // черновик заявки организатора
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
    // 0,95 км округлилось бы до «1000 м» — это уже километр, пишем 900.
    if (d < 1) return Math.min(9, Math.round(d * 10)) * 100 + ' ' + T.m_away;
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

  // ---------- иконки ----------
  // Свои линейные иконки 24×24 с одной толщиной линии — без внешних библиотек.
  var DOT = function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="1.15" fill="currentColor" stroke="none"/>'; };
  var ICON = {
    all: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
    it: '<path d="M8.5 8 4.5 12l4 4M15.5 8l4 4-4 4M13.5 5.5l-3 13"/>',
    eng: '<rect x="5" y="8.5" width="14" height="10.5" rx="3"/><path d="M12 5.2v3.3M9 19v1.5M15 19v1.5"/><circle cx="12" cy="4.2" r="1"/>' + DOT(9.5, 13.4) + DOT(14.5, 13.4),
    stem: '<path d="M9.5 3.5h5M10.5 3.5V9l-4.9 8.6a2 2 0 0 0 1.8 2.9h9.2a2 2 0 0 0 1.8-2.9L13.5 9V3.5"/><path d="M7.6 14.5h8.8"/>',
    debate: '<path d="M4 6.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9.5L6 16.5v-3a2 2 0 0 1-2-2z"/><path d="M16 9h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2v2.5L15 18h-3.5a2 2 0 0 1-2-2v-.5"/>',
    lang: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5s1.2-6.1 3.6-8.5z"/>',
    sport: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17M6.2 5.8c2 1.7 3.1 3.8 3.1 6.2s-1.1 4.5-3.1 6.2M17.8 5.8c-2 1.7-3.1 3.8-3.1 6.2s1.1 4.5 3.1 6.2"/>',
    art: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7h2.1a3.9 3.9 0 0 0 3.9-3.9c0-4-3.8-7.3-8.5-7.3z"/>' + DOT(7.6, 11.4) + DOT(10, 7.7) + DOT(14.6, 7.9),
    media: '<rect x="3" y="6.5" width="13" height="11" rx="2.5"/><path d="m16 10.5 5-3v9l-5-3"/>',
    vol: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
    biz: '<path d="M4 19.5h16"/><path d="m6 15.5 4-4.5 3 3 5.5-6.5"/><path d="M14.5 7.5h4v4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    pin: '<path d="M12 21s-6.5-5.7-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.3 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/>',
    tenge: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 8h7M8.5 10.7h7M12 10.7V17"/>',
    talk: '<path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3.5v-3.5a2 2 0 0 1-1.5-2z"/><path d="M8.5 9.5h7M8.5 12.5h4"/>',
    user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6"/>',
    users: '<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19.5c.7-3.2 2.9-5 5.5-5s4.8 1.8 5.5 5"/><circle cx="16.5" cy="8" r="2.6"/><path d="M16.5 13.2c2.1 0 3.7 1.4 4.2 4"/>',
    map: '<path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2-6-2z"/><path d="M9 4.5v13M15 6.5v13"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="4"/>' + DOT(8.6, 8.6) + DOT(15.4, 8.6) + DOT(12, 12) + DOT(8.6, 15.4) + DOT(15.4, 15.4),
    shield: '<path d="M12 3.5 5 6v5.5c0 4.4 3 7.7 7 9 4-1.3 7-4.6 7-9V6z"/><path d="m8.8 12 2.3 2.3 4.2-4.6"/>',
    spark: '<path d="M12 3.5c.6 4.4 2.1 5.9 6.5 6.5-4.4.6-5.9 2.1-6.5 6.5-.6-4.4-2.1-5.9-6.5-6.5 4.4-.6 5.9-2.1 6.5-6.5z"/><path d="M18.5 15.5v4M16.5 17.5h4"/>',
    door: '<path d="M6 20.5V5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 18 5v15.5"/><path d="M4 20.5h16"/>' + DOT(14.3, 12.5),
    trophy: '<path d="M8 4.5h8v5a4 4 0 0 1-8 0z"/><path d="M8 6.5H5.5A2.5 2.5 0 0 0 8 10M16 6.5h2.5A2.5 2.5 0 0 1 16 10M12 13.5v3M9.5 16.5h5V20h-5z"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
    wa: '<path d="M12 3.6a8.4 8.4 0 0 0-7.3 12.6L3.6 20.4l4.3-1.1A8.4 8.4 0 1 0 12 3.6z"/><path fill="currentColor" stroke="none" d="M9.3 7.8c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.1.3 0 .5.7 1.1 1.5 1.9 2.6 2.5.2.1.3.1.5 0l.6-.6c.2-.2.4-.2.6-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.1.5-.4.7-.6.4-1.3.5-2 .4-2.6-.6-4.6-2.6-5.2-5.2-.1-.7 0-1.4.4-2z"/>',
    ig: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/>',
    tg: '<path d="M20.5 4.5 3.5 11.2l5.6 2 2 6.3 3.2-3.8 4.4 3.3z"/><path d="m9.1 13.2 11.4-8.7"/>',
    yt: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.3v5.4l4.8-2.7z" fill="currentColor" stroke="none"/>',
    tt: '<path d="M14 3.5v11.2a3.6 3.6 0 1 1-3.6-3.6"/><path d="M14 3.5c.5 2.6 2.4 4.4 5.2 4.7"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5S9.6 5.8 12 3.5z"/>',
    sort: '<path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4M13.5 7.5 17 4l3.5 3.5"/>',
    photo: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 5-4.5 3.5 3 2.5-2 5 4"/>'
  };
  function icon(name, size) {
    var s = size || 22;
    return '<svg class="ic-svg" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[name] || ICON.spark) + '</svg>';
  }
  // Знак Qosyl для украшений: цвет берёт от родителя.
  function MARK(cls) {
    return '<svg class="' + cls + '" viewBox="0 0 32 32" fill="none" aria-hidden="true">' +
      '<path d="M16 4 L28 16 L16 28 L4 16 Z" stroke="currentColor" stroke-opacity=".6" stroke-width=".7"/>' +
      '<path d="M10 16 C10 12 13 10.5 16 13 C19 10.5 22 12 22 16 C22 19.5 19 21.5 16 24 C13 21.5 10 19.5 10 16 Z" stroke="currentColor" stroke-width=".9" stroke-linejoin="round"/>' +
      '<circle cx="16" cy="8.5" r="1.15" fill="currentColor"/><circle cx="23.5" cy="16" r="1.15" fill="currentColor"/><circle cx="8.5" cy="16" r="1.15" fill="currentColor"/></svg>';
  }
  // Цвет направления — только оттенок в OKLCH; светлоту и насыщенность задаёт CSS,
  // поэтому все десять цветов одной «громкости» и не спорят друг с другом.
  var CAT_HUE = { all: 262, it: 285, eng: 250, stem: 212, debate: 20, lang: 318, sport: 148, art: 352, media: 48, vol: 174, biz: 82 };
  function hueOf(cat) { return CAT_HUE[cat] != null ? CAT_HUE[cat] : 262; }

  // ---------- state ----------
  function initialLang() {
    var fromUrl = new URLSearchParams(window.location.search).get('lang');
    var stored = load(LANG_KEY, null);
    var pick = [fromUrl, stored].filter(function (l) { return l && STR[l]; })[0];
    if (pick) return pick;
    // Казахский телефон — казахский сайт. Английский только по кнопке или ?lang=en:
    // поисковые роботы Google открывают сайт с английским браузером, и раньше
    // в выдаче из-за этого стоял английский заголовок вместо русского.
    var nav = (navigator.language || '').toLowerCase();
    if (nav.indexOf('kk') === 0) return 'kz';
    return 'ru';
  }
  function blankForm() {
    return { name: '', tag: '', about: '', cat: '', dist: '', age: '', cost: '', sched: '', addr: '', langs: '', tel: '', ig: '', tg: '', photo: '', media: '', kw: '', checked: '', lat: '', lng: '', beginner: true, verified: false, featured: false };
  }

  var state = {
    lang: initialLang(),
    q: '',
    cat: 'all',
    dist: 'all',
    free: false,         // только бесплатные
    beg: false,          // только те, что ждут новичков
    ok: false,           // только подтверждённые организаторами
    sort: 'rec',         // 'rec' — сначала подтверждённые, 'az' — по алфавиту
    view: 'list',        // каталог списком или на карте
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
    photo: null, // выбранный и сжатый файл: { dataUrl, blob, kb }
    join: loadDraft(),   // заявка организатора с сайта (#/join)
    joinStep: 0,
    joinErr: {},
    joinStatus: ''       // '' | 'sending' | 'sent' | 'fail'
  };

  function normalizeUser(u) {
    return {
      id: u.id, cat: u.cat, dist: u.dist || '', slug: u.slug || u.id, verified: !!u.verified, beginner: !!u.beginner, featured: !!u.featured,
      checked: u.checked || '', mine: true, photo: u.photo || '', media: u.media || '',
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
  // Большой центр (дворец школьников, комплекс) ведёт десятки кружков сразу.
  // Основная секция у него одна — она задаёт цвет, — а остальные лежат в also,
  // поэтому дворец находится и в «Робототехнике», и в «Спорте».
  function alsoOf(c) {
    return (Array.isArray(c.also) ? c.also : []).filter(function (id) {
      return id !== c.cat && CATS.some(function (k) { return k.id === id; });
    });
  }
  function inCat(c, cat) {
    return cat === 'all' || c.cat === cat || alsoOf(c).indexOf(cat) !== -1;
  }
  // Карточку собрали мы сами по открытым данным, организатор её ещё не подтвердил.
  function isOpen(c) { return !!c.open && !c.verified; }
  function hayOf(c) {
    if (!c.__hay) {
      c.__hay = [c.name.ru, c.name.kz, c.name.en, c.kw,
        alsoOf(c).map(function (id) { return catLabel(id, 'ru') + ' ' + catLabel(id, 'kz') + ' ' + catLabel(id, 'en'); }).join(' '),
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
    if (state.cat !== 'all') list = list.filter(function (c) { return inCat(c, state.cat); });
    if (state.dist !== 'all') list = list.filter(function (c) { return c.dist === state.dist; });
    if (state.free) list = list.filter(isFree);
    if (state.beg) list = list.filter(function (c) { return !!c.beginner; });
    if (state.ok) list = list.filter(function (c) { return !isOpen(c); });
    // Порядок по умолчанию: сначала карточки, которые подтвердили организаторы,
    // потом собранные из открытых данных; внутри секции — те, где она основная.
    if (state.sort === 'az') {
      list = list.slice().sort(function (a, b) { return a.name[state.lang].localeCompare(b.name[state.lang], state.lang === 'kz' ? 'kk' : state.lang); });
    } else {
      list = list.map(function (c, i) { return { c: c, i: i }; }).sort(function (a, b) {
        var oa = isOpen(a.c) ? 1 : 0, ob = isOpen(b.c) ? 1 : 0;
        if (oa !== ob) return oa - ob;
        if (state.cat !== 'all') {
          var ma = a.c.cat === state.cat ? 0 : 1, mb = b.c.cat === state.cat ? 0 : 1;
          if (ma !== mb) return ma - mb;
        }
        return a.i - b.i;
      }).map(function (x) { return x.c; });
    }
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
    if (parts[0] === 'join') return { screen: 'join', id: parts[1] || '' };
    if (parts[0] === 'about' || parts[0] === 'map' || parts[0] === 'add' || parts[0] === 'catalog') return { screen: parts[0] };
    return { screen: 'home' };
  }

  // ---------- фото и видео сообщества ----------
  // Принимаем ссылки на посты и рилсы Instagram, видео YouTube и TikTok и прямые картинки.
  // Всё остальное молча пропускаем: лучше не показать ссылку, чем показать сломанную.
  function parseMedia(u) {
    u = String(u || '').trim();
    var m;
    if ((m = /instagram\.com\/(?:[\w.]+\/)?(p|reels?|tv)\/([\w-]+)/i.exec(u))) {
      var sub = m[1].toLowerCase() === 'p' ? 'p' : 'reel';
      return { kind: 'ig', sub: sub, id: m[2], url: 'https://www.instagram.com/' + sub + '/' + m[2] + '/' };
    }
    if ((m = /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i.exec(u))) {
      return { kind: 'yt', id: m[1], short: /shorts\//i.test(u), url: 'https://www.youtube.com/' + (/shorts\//i.test(u) ? 'shorts/' : 'watch?v=') + m[1] };
    }
    if ((m = /tiktok\.com\/@[\w.-]+\/video\/(\d+)/i.exec(u))) return { kind: 'tt', id: m[1], url: u.split('?')[0] };
    if (/^https?:\/\/[^\s]+\.(jpe?g|png|webp|avif|gif)(\?[^\s]*)?$/i.test(u) || /^photos\/[\w\-/]+\.(jpe?g|png|webp|avif|gif)$/i.test(u)) {
      return { kind: 'img', src: u, url: u };
    }
    return null;
  }
  // Одна ссылка — одна строка; если в строку вставили несколько ссылок подряд, делим их.
  function mediaLines(t) {
    return String(t || '').split(/\n+/).reduce(function (out, line) {
      line = line.trim();
      if (!line) return out;
      var urls = line.match(/https?:\/\/[^\s,]+/g);
      return out.concat(urls && urls.length > 1 ? urls : [line]);
    }, []);
  }
  function mediaList(v) {
    var arr = Array.isArray(v) ? v : mediaLines(v);
    var seen = {};
    return arr.map(parseMedia).filter(function (x) {
      if (!x || seen[x.url]) return false;
      seen[x.url] = true;
      return true;
    }).slice(0, 12);
  }
  function mediaTileHTML(m, i, T) {
    if (m.kind === 'img') {
      return '<button class="m-tile" data-action="lightbox" data-src="' + esc(m.src) + '" aria-label="' + esc(T.media_photo) + '">' +
        '<img src="' + esc(m.src) + '" alt="" loading="lazy" decoding="async"></button>';
    }
    var label = m.kind === 'ig' ? (m.sub === 'reel' ? T.media_reel : T.media_ig) : m.kind === 'yt' ? T.media_yt : T.media_tt;
    return '<button class="m-tile m-' + m.kind + '" data-action="embed" data-i="' + i + '" aria-label="' + esc(label) + '">' +
      (m.kind === 'yt' ? '<img src="https://i.ytimg.com/vi/' + esc(m.id) + '/hqdefault.jpg" alt="" loading="lazy" decoding="async">' : '') +
      '<span class="m-play">' + icon('play', 26) + '</span>' +
      '<span class="m-cap"><b>' + icon(m.kind, 16) + esc(label) + '</b><span>' + esc(T.media_tap) + '</span></span></button>';
  }
  // Встраивание грузится только по нажатию: до этого Instagram, YouTube и TikTok
  // ничего не знают о посетителе — так сайт держит обещание «без слежки».
  function embedHTML(m) {
    if (m.kind === 'ig') return '<iframe class="m-frame" src="https://www.instagram.com/' + m.sub + '/' + encodeURIComponent(m.id) + '/embed/" height="' + (m.sub === 'reel' ? 720 : 580) + '" allowfullscreen title="Instagram"></iframe>';
    if (m.kind === 'yt') return '<iframe class="m-frame' + (m.short ? '' : ' wide') + '" src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(m.id) + '?autoplay=1&amp;rel=0&amp;playsinline=1"' + (m.short ? ' height="640"' : '') + ' allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="YouTube"></iframe>';
    if (m.kind === 'tt') return '<iframe class="m-frame" src="https://www.tiktok.com/embed/v2/' + encodeURIComponent(m.id) + '" height="740" allow="encrypted-media" allowfullscreen title="TikTok"></iframe>';
    return '';
  }

  // ---------- views ----------
  // Обложка без фото. У центра с несколькими направлениями вокруг главного
  // значка «плавают» значки остальных секций — сразу видно, что там много всего.
  function coverArt(c) {
    var also = alsoOf(c).slice(0, 6);
    return '<span class="cover-art' + (also.length ? ' multi' : '') + '">' + icon(c.cat, 64) +
      also.map(function (id, i) { return '<span class="ca-f ca-' + i + '" style="--h:' + hueOf(id) + '">' + icon(id, 22) + '</span>'; }).join('') +
      MARK('mark') + '</span>';
  }

  // Адрес для карточки: без «—» и «нет», с обрезкой, чтобы не ломать сетку.
  function shortAddr(c, L) {
    var a = String((c.addr && c.addr[L]) || '').trim();
    if (!a || a === '—' || /^(нет|жоқ|no|none)$/i.test(a)) return '';
    return a.length > 52 ? a.slice(0, 50).replace(/[\s,]+\S*$/, '') + '…' : a;
  }

  // Карточка сообщества. Одна и та же в каталоге, в помощнике и в «похожих»:
  // она самодостаточна, поэтому её нельзя «сломать», вложив в другой блок.
  function cardHTML(c, L, T, extra) {
    var photo = photoSrc(c.photo);
    var d = kmTo(c);
    var cost = c.cost[L];
    var also = alsoOf(c);
    var addr = shortAddr(c, L);
    var alsoHTML = also.length && photo
      ? '<span class="club-also" role="img" aria-label="' + esc(T.also_lbl + ': ' + also.map(function (id) { return catLabel(id, L); }).join(', ')) + '">' +
        also.slice(0, 5).map(function (id) { return '<i style="--h:' + hueOf(id) + '">' + icon(id, 14) + '</i>'; }).join('') +
        (also.length > 5 ? '<i class="n">+' + (also.length - 5) + '</i>' : '') + '</span>'
      : '';
    return '<a class="club' + (c.featured ? ' featured' : '') + (isOpen(c) ? ' is-open' : '') + '" href="#/club/' + esc(encodeURIComponent(c.slug)) + '" style="--h:' + hueOf(c.cat) + '">' +
      '<span class="club-cover">' +
      (photo ? '<img src="' + esc(photo) + '" alt="" loading="lazy" decoding="async">' : coverArt(c)) +
      '<span class="club-cat">' + icon(c.cat, 16) + esc(catLabel(c.cat, L)) + '</span>' + alsoHTML +
      (c.featured ? '<span class="seal" role="img" aria-label="' + esc(T.featured) + '"></span>' : '') +
      '</span>' +
      '<span class="club-body">' +
      '<span class="club-name">' + esc(c.name[L]) + '</span>' +
      (c.tag[L] ? '<span class="club-tag">' + esc(c.tag[L]) + '</span>' : '') +
      (addr ? '<span class="club-addr">' + icon('pin', 14) + esc(addr) + '</span>' : '') +
      '<span class="club-meta">' +
      (c.featured ? '<span class="m top">' + STAR + esc(T.featured) + '</span>' : '') +
      (d != null ? '<span class="m km">' + esc(kmText(d, L)) + '</span>' : '') +
      (c.age && c.age !== '—' ? '<span class="m">' + esc(c.age) + '</span>' : '') +
      (isFree(c) ? '<span class="m free">' + esc(T.f_free) + '</span>'
        : cost && cost !== '—' && isPaid(c) ? '<span class="m">' + esc(cost) + '</span>' : '') +
      (c.beginner ? '<span class="m beg">' + esc(T.beginner) + '</span>' : '') +
      (c.verified ? '<span class="m ok">' + icon('check', 13) + esc(T.verified) + '</span>'
        : isOpen(c) ? '<span class="m src">' + esc(T.open_badge) + '</span>' : '') +
      '</span>' + (extra || '') +
      '</span></a>';
  }
  var rowHTML = cardHTML;

  function emptyHTML() {
    var T = STR[state.lang];
    // Выбрана секция, где пока никого нет: говорим это прямо и зовём подсказать.
    var catEmpty = state.cat !== 'all' && !allClubs().some(function (c) { return inCat(c, state.cat); });
    return '<div class="empty" style="--h:' + hueOf(state.cat) + '"><span class="ic">' + icon(catEmpty ? state.cat : 'search', 28) + '</span>' +
      '<h2>' + esc(catEmpty ? T.cat_empty_h : T.empty_h) + '</h2><p>' + esc(catEmpty ? T.cat_empty_p : T.empty_p) + '</p>' +
      '<div class="empty-btns">' + (catEmpty ? '<a class="btn-solid" href="#/join">' + icon('plus', 18) + esc(T.cat_empty_b) + '</a>' : '') +
      '<button class="btn-outline" data-action="reset">' + esc(T.empty_cta) + '</button></div></div>';
  }

  function anyFilter() {
    return !!(state.q.trim() || state.cat !== 'all' || state.dist !== 'all' || state.free || state.beg || state.ok);
  }

  // Подсказка между подтверждёнными карточками и собранными из открытых данных:
  // честно говорим, откуда информация, прямо в выдаче, а не мелким шрифтом.
  function openSepHTML(T) {
    return '<div class="grid-sep" role="note"><span class="ic">' + icon('shield', 20) + '</span>' +
      '<div><b>' + esc(T.open_sep_h) + '</b><p>' + esc(T.open_sep_p) + '</p></div></div>';
  }

  function resultsHTML() {
    var L = state.lang, T = STR[L], list = filtered();
    var q = state.q.trim();
    var head = '<div class="count-row"><span class="count-l"><span class="count" aria-live="polite">' + list.length + ' ' + esc(plural(list.length, L)) + ' ' + esc(T.found) + '</span>' +
      (q ? '<button class="q-pill" data-action="clear-q" aria-label="' + esc(T.q_clear) + '">«' + esc(q) + '» <i aria-hidden="true">✕</i></button>' : '') +
      (anyFilter() ? '<button class="linkish reset-all" data-action="reset">' + esc(T.reset_all) + '</button>' : '') + '</span>' +
      (lastUpdated() ? '<span class="updated">' + esc(T.updated_pre + ' ' + fmtDate(lastUpdated(), L)) + '</span>' : '') + '</div>';
    if (!list.length) return head + emptyHTML();
    if (state.view === 'map') return head + catMapHTML(list);
    var shown = list.slice(0, state.shown);
    var rest = list.length - shown.length;
    var sepAt = -1;
    if (state.sort === 'rec' && !state.near) {
      for (var i = 0; i < shown.length; i++) if (isOpen(shown[i]) && !shown[i].featured) { sepAt = i; break; }
    }
    return head + '<div class="grid">' + shown.map(function (c, i) {
      return (i === sepAt ? openSepHTML(T) : '') + cardHTML(c, L, T);
    }).join('') + '</div>' +
      (rest > 0 ? '<button class="more" data-action="more">' + esc(T.more) + ' (' + rest + ')</button>' : '');
  }

  // Каталог на карте: слева список, справа карта (на телефоне — карта сверху).
  // Сообщества без точки остаются в списке, а под картой сказано, сколько их.
  function catMapHTML(list) {
    var L = state.lang, T = STR[L];
    var noGeo = list.filter(function (c) { return !hasCoords(c); }).length;
    return '<div class="cs-split"><div class="cs-map"><div id="cat-map" class="cat-map"></div>' +
      (noGeo ? '<p class="cs-map-note">' + esc(T.map_nogeo.replace('{n}', noGeo)) + '</p>' : '') + '</div>' +
      '<div class="cs-rows">' + list.map(function (c) {
        var addr = shortAddr(c, L) || catLabel(c.cat, L);
        return '<a class="map-item" data-pin="' + esc(c.id) + '" href="#/club/' + esc(encodeURIComponent(c.slug)) + '" style="--h:' + hueOf(c.cat) + '">' +
          '<span class="ic">' + icon(c.cat, 18) + '</span><b>' + esc(c.name[L]) + '</b><span>' + esc(addr) + '</span></a>';
      }).join('') + '</div></div>';
  }

  // Направления — цветные плитки, как полки в магазине приложений: сразу видно,
  // что это каталог и что в нём есть. Сначала те, где уже есть сообщества.
  function catsHTML() {
    var L = state.lang, T = STR[L], cnt = {}, ALL = allClubs();
    CATS.forEach(function (k) { cnt[k.id] = ALL.filter(function (c) { return inCat(c, k.id); }).length; });
    var full = [], empty = [];
    CATS.forEach(function (c) { (cnt[c.id] ? full : empty).push(c); });
    full.sort(function (a, b) { return cnt[b.id] - cnt[a.id]; });
    function tile(id, label, n) {
      return '<button class="cat' + (n ? '' : ' is-empty') + '" data-action="cat" data-id="' + id + '" aria-pressed="' + (state.cat === id) + '" style="--h:' + hueOf(id) + '">' +
        '<span class="cat-art" aria-hidden="true">' + icon(id, 64) + '</span>' +
        '<span class="ic">' + icon(id, 21) + '</span><span class="cat-txt"><b>' + esc(label) + '</b>' +
        '<small>' + (n ? n + ' ' + esc(plural(n, L)) : esc(T.cat_none)) + '</small></span></button>';
    }
    return tile('all', T.all, ALL.length) + full.concat(empty).map(function (c) { return tile(c.id, c[L], cnt[c.id] || 0); }).join('');
  }
  var chipsHTML = catsHTML;

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
    if (state.nearState === 'asking') return '<span class="pill wait">' + esc(T.near_wait) + '</span>';
    if (state.near) return '<button class="pill near on" data-action="near-off">' + icon('pin', 16) + esc(T.near_off) + '</button>';
    return '<button class="pill near" data-action="near">' + icon('pin', 16) + esc(T.near) + '</button>';
  }

  // Панель над выдачей: фильтры слева, район, порядок и «список / карта» справа.
  // Фильтров мало, поэтому они в одну строку, а не в боковой колонке:
  // так выдача на компьютере получает все три столбца.
  function distRowHTML() {
    var L = state.lang, T = STR[L], ds = districtsInUse();
    if (ds.length < 2) ds = [];
    var flags = [['free', T.f_free], ['beg', T.f_beg], ['ok', T.f_ok]].map(function (f) {
      return '<button class="pill" data-action="flag" data-id="' + f[0] + '" aria-pressed="' + !!state[f[0]] + '">' + esc(f[1]) + '</button>';
    }).join('');
    var dist = ds.length
      ? '<label class="sel"><span class="sr-only">' + esc(T.f_dist) + '</span>' + icon('map', 16) +
        '<select data-dist-sel>' + [{ id: 'all', label: T.dist_all }].concat(ds.map(function (d) { return { id: d.id, label: d[L] }; })).map(function (d) {
          return '<option value="' + d.id + '"' + (state.dist === d.id ? ' selected' : '') + '>' + esc(d.label) + '</option>';
        }).join('') + '</select></label>'
      : '';
    var sort = '<label class="sel"><span class="sr-only">' + esc(T.sort_lbl) + '</span>' + icon('sort', 16) +
      '<select data-sort>' + [['rec', T.sort_rec], ['az', T.sort_az]].map(function (o) {
        return '<option value="' + o[0] + '"' + (state.sort === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
      }).join('') + '</select></label>';
    var views = '<div class="seg" role="group" aria-label="' + esc(T.view_lbl) + '">' + [['list', T.view_list, 'all'], ['map', T.view_map, 'map']].map(function (v) {
      return '<button data-action="view" data-id="' + v[0] + '" aria-pressed="' + (state.view === v[0]) + '">' + icon(v[2], 16) + esc(v[1]) + '</button>';
    }).join('') + '</div>';
    return '<div class="cs-bar-in"><div class="filters">' + flags + nearBtnHTML() + '</div>' +
      '<div class="cs-tools">' + dist + sort + views + '</div></div>' +
      (state.nearState === 'denied' ? '<p class="near-note">' + esc(T.near_no) + '</p>'
        : state.near ? '<p class="near-note">' + esc(T.near_on) + '</p>' : '');
  }

  // Каталог целиком: своя тёмная шапка с названием, цифрами и поиском, под ней
  // плитки направлений, липкая панель фильтров и выдача. На главной он стоит
  // после «как это работает», а по адресу #/catalog открывается отдельно.
  function catalogHTML(page) {
    var L = state.lang, T = STR[L], ALL = allClubs();
    var H = page ? 'h1' : 'h2';
    var stats = [
      [ALL.length, plural(ALL.length, L)],
      [ALL.filter(isFree).length, T.cs_free],
      [ALL.filter(function (c) { return !isOpen(c); }).length, T.cs_ok]
    ];
    return '<section class="catalog' + (page ? ' is-page' : '') + '" id="catalog">' +
      '<div class="cs-top"><span class="cs-glow" aria-hidden="true"></span>' + MARK('cs-mark') +
      '<div class="wrap cs-top-in"><div class="cs-title">' +
      '<p class="cs-kicker">' + icon('all', 15) + esc(T.cat_k) + '</p>' +
      '<' + H + ' class="cs-h">' + esc(T.catalog_h) + '</' + H + '>' +
      '<p class="cs-lead">' + esc(T.catalog_lead) + '</p></div>' +
      '<ul class="cs-stats">' + stats.map(function (s) { return '<li><b data-count="' + s[0] + '">' + s[0] + '</b><span>' + esc(s[1]) + '</span></li>'; }).join('') + '</ul>' +
      '<form class="cs-search" role="search" data-search>' + icon('search', 20) +
      '<label class="sr-only" for="cq">' + esc(T.search_label) + '</label>' +
      '<input id="cq" type="search" autocomplete="off" enterkeyhint="search" value="' + esc(state.q) + '" placeholder="' + esc(T.cs_search_ph) + '"></form>' +
      '</div></div>' +
      '<div class="wrap cs-body">' +
      '<div class="cats" id="chips" role="group" aria-label="' + esc(T.cat_k) + '">' + catsHTML() + '</div>' +
      '<div class="cs-bar" id="dist-wrap">' + distRowHTML() + '</div>' +
      '<div id="results">' + resultsHTML() + '</div></div></section>';
  }

  // Плитки направлений в бренд-блоке. На компьютере — сетка справа, которая
  // чуть сдвигается вслед за мышкой; на телефоне — бегущая лента под цифрами.
  // Это украшение-дубль ряда направлений в каталоге, поэтому скрыто от дикторов.
  function heroTiles(L, T, cnt, kind, limit) {
    var list = CATS.filter(function (c) { return cnt[c.id]; }).concat(CATS.filter(function (c) { return !cnt[c.id]; }));
    if (limit) list = list.slice(0, limit);
    var short = T.cat_short || {};
    var tiles = list.map(function (c, i) {
      return '<span class="float-tile" data-action="go-cat" data-id="' + c.id + '" style="--h:' + hueOf(c.id) + ';--d:' + (6 + (i * 5) % 14) + 'px;--sd:' + (i * 0.9).toFixed(1) + 's" title="' + esc(c[L]) + '">' +
        (cnt[c.id] ? '<span class="n">' + cnt[c.id] + '</span>' : '') + icon(c.id, 48) + '<b>' + esc(short[c.id] || c[L]) + '</b></span>';
    }).join('');
    if (kind === 'hero-strip') return '<div class="hero-strip" aria-hidden="true"><div class="hero-strip-in">' + tiles + tiles + '</div></div>';
    return '<div class="hero-art" aria-hidden="true">' + tiles + '</div>';
  }

  // Параллакс: плитки смещаются вслед за мышкой, каждая на свою глубину (--d).
  var parallaxRAF = 0;
  document.addEventListener('mousemove', function (e) {
    var art = document.querySelector('.hero-art');
    if (!art || parallaxRAF || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    parallaxRAF = window.requestAnimationFrame(function () {
      parallaxRAF = 0;
      var hero = art.closest('.hero'), r = hero && hero.getBoundingClientRect();
      if (!r || e.clientY < r.top || e.clientY > r.bottom) { art.style.setProperty('--px', 0); art.style.setProperty('--py', 0); return; }
      art.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      art.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
  });

  function heroFoundHTML() {
    var T = STR[state.lang];
    if (!state.q.trim()) return '';
    return '<button class="hero-found" data-action="to-catalog">' + esc(T.hero_found + ' ' + filtered().length + ' — ' + T.hero_look) + icon('down', 16) + '</button>';
  }

  function homeView() {
    var L = state.lang, T = STR[L], ALL = allClubs(), cnt = {};
    CATS.forEach(function (k) { cnt[k.id] = ALL.filter(function (c) { return inCat(c, k.id); }).length; });
    // Быстрые кнопки в бренд-блоке: сначала направления, где уже есть сообщества.
    var quick = CATS.filter(function (c) { return cnt[c.id]; }).sort(function (a, b) { return cnt[b.id] - cnt[a.id]; }).slice(0, 4);
    var stats = [
      [ALL.length, plural(ALL.length, L)],
      [CATS.length, T.st_cats],
      [ALL.filter(function (c) { return c.beginner; }).length, T.st_new]
    ];
    var hero = '<section class="hero">' + MARK('hero-mark') +
      '<div class="wrap hero-in"><div class="hero-copy">' +
      '<p class="hero-kicker"><span class="pulse"></span>' + esc(T.hero_kicker) + '</p>' +
      '<h1 class="hero-h"><span>' + esc(T.hero_a) + '</span> <em>' + esc(T.hero_b) + '</em></h1>' +
      '<p class="hero-lead">' + esc(T.lead) + '</p>' +
      '<form class="hero-search" role="search" data-search>' + icon('search', 22) +
      '<label class="sr-only" for="q">' + esc(T.search_label) + '</label>' +
      '<input id="q" type="search" autocomplete="off" enterkeyhint="search" value="' + esc(state.q) + '" placeholder="' + esc(T.search_ph) + '">' +
      '<button class="hero-go" type="submit">' + esc(T.search_go) + '</button></form>' +
      '<div id="hero-found">' + heroFoundHTML() + '</div>' +
      '<div class="hero-quick">' + (quick.length ? '<span class="lbl">' + esc(T.quick_lbl) + '</span>' : '') +
      quick.map(function (c) {
        return '<button class="q-chip" data-action="go-cat" data-id="' + c.id + '" style="--h:' + hueOf(c.id) + '">' + icon(c.id, 18) + esc(c[L]) + '</button>';
      }).join('') +
      (ALL.length > 1 ? '<button class="q-chip dice" data-action="random">' + icon('dice', 18) + esc(T.random) + '</button>' : '') +
      '</div>' +
      '<ul class="hero-stats">' + stats.map(function (s) { return '<li><b data-count="' + s[0] + '">' + s[0] + '</b><span>' + esc(s[1]) + '</span></li>'; }).join('') + '</ul>' +
      '</div>' +
      heroTiles(L, T, cnt, 'hero-art', 8) +
      '</div>' + heroTiles(L, T, cnt, 'hero-strip', 0) + '</section>';

    var how = '<section class="sec wrap" data-reveal><div class="sec-head"><div><p class="sec-kicker">' + esc(T.how_k) + '</p>' +
      '<h2 class="sec-h">' + esc(T.how_h) + '</h2></div></div><div class="steps">' +
      [['spark', 262, T.how_1h, T.how_1p], ['wa', 150, T.how_2h, T.how_2p], ['door', 40, T.how_3h, T.how_3p]].map(function (st, i) {
        return '<div class="step" style="--h:' + st[1] + '"><span class="step-n" aria-hidden="true">0' + (i + 1) + '</span>' +
          '<span class="step-ic">' + icon(st[0], 26) + '</span><h3>' + esc(st[2]) + '</h3><p>' + esc(st[3]) + '</p></div>';
      }).join('') + '</div></section>';

    var helper = window.QOSYL_HELPER ? window.QOSYL_HELPER.blockHTML() : '';

    var catalog = catalogHTML(false);

    return '<div class="home">' + hero + how +
      (helper ? '<div class="sec wrap" data-reveal>' + helper + '</div>' : '') +
      catalog + '<div class="sec wrap">' + ownBlock() + '</div></div>';
  }

  // Каталог отдельной страницей (#/catalog): та же выдача, что на главной,
  // но без бренд-блока — открыл и сразу выбираешь.
  function catalogView() {
    return '<div class="home is-catalog">' + catalogHTML(true) + '<div class="sec wrap">' + ownBlock() + '</div></div>';
  }

  // Призыв для организаторов: ведёт на форму прямо на сайте.
  function ownBlock() {
    var T = STR[state.lang];
    return '<section class="own" data-reveal>' + MARK('mark') +
      '<div class="own-txt"><h2>' + esc(T.own_h) + '</h2><p>' + esc(T.own_p) + '</p>' +
      '<a class="own-btn" href="#/join">' + icon('plus', 20) + esc(T.own_b) + '</a></div>' +
      '<ul class="perks">' + [T.perk1, T.perk2, T.perk3, T.perk4].map(function (p) {
        return '<li><span class="ok-ic">' + icon('check', 16) + '</span>' + esc(p) + '</li>';
      }).join('') + '</ul></section>';
  }

  function aboutParas(text) {
    return String(text || '').split(/\n+/).map(function (p) { return p.trim(); }).filter(Boolean)
      .map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
  }

  function clubView(id) {
    var L = state.lang, T = STR[L];
    var c = findClub(id);
    if (!c) {
      return '<section class="screen tight wrap"><a class="back" href="#/">' + esc(T.back) + '</a>' +
        '<div class="empty"><span class="ic">' + icon('search', 28) + '</span><h2>' + esc(T.not_found_h) + '</h2><p>' + esc(T.not_found_p) + '</p>' +
        '<div class="empty-btns"><a class="btn-outline" href="#/">' + esc(T.empty_cta) + '</a></div></div></section>';
    }
    var h = hueOf(c.cat);
    var photo = photoSrc(c.photo);
    var tel = digits(c.tel);
    var geo = hasCoords(c);
    var url = shareUrl(c);
    var reported = state.reported.indexOf(c.id) !== -1;
    var media = mediaList(c.media);
    var slug = esc(encodeURIComponent(c.slug));
    var ALL = allClubs();
    var similar = ALL.filter(function (s) { return inCat(s, c.cat) && s.id !== c.id; })
      .concat(ALL.filter(function (s) { return s.cat !== c.cat && s.beginner && s.id !== c.id; }))
      .slice(0, 3);

    var facts = [['user', T.f_age, c.age], ['tenge', T.f_cost, c.cost[L]], ['clock', T.f_sched, c.sched[L]], ['pin', T.f_addr, c.addr[L]]];
    if (c.dist) facts.push(['map', T.f_dist, distLabel(c.dist, L)]);
    facts.push(['talk', T.f_langs, c.langs[L]]);
    facts = facts.filter(function (f) { return f[2] && f[2] !== '—' && !/^нет$/i.test(String(f[2]).trim()); });

    // Фото от организаторов бывают любых пропорций и часто это логотип: показываем
    // картинку целиком, а пустые поля заполняем её же размытой копией.
    var cover = '<div class="cp-cover">' + (photo
      ? '<img class="cp-bg" src="' + esc(photo) + '" alt="" aria-hidden="true"><img class="cp-img" src="' + esc(photo) + '" alt="' + esc(c.name[L]) + '">'
      : coverArt(c)) +
      (c.featured ? '<span class="seal lg" role="img" aria-label="' + esc(T.featured) + '"></span>' : '') + '</div>';

    var head = '<header class="cp-head"><span class="cp-cat">' + icon(c.cat, 18) + esc(catLabel(c.cat, L)) + '</span>' +
      '<h1 class="cp-title">' + esc(c.name[L]) + '</h1>' +
      (c.tag[L] ? '<p class="cp-tag">' + esc(c.tag[L]) + '</p>' : '') +
      '<div class="cp-badges">' +
      (c.featured ? '<span class="m top">' + STAR + esc(T.featured) + '</span>' : '') +
      (isFree(c) ? '<span class="m free">' + esc(T.f_free) + '</span>' : '') +
      (c.beginner ? '<span class="m beg">' + esc(T.beginner) + '</span>' : '') +
      (c.verified ? '<span class="m ok">' + icon('check', 13) + esc(T.verified) + '</span>'
        : isOpen(c) ? '<span class="m src">' + esc(T.open_badge) + '</span>' : '') +
      '</div></header>';

    // Все направления центра — кнопками: нажал и попал в каталог этой секции.
    var dirs = alsoOf(c).length ? '<div class="cp-dirs"><h2 class="sr-only">' + esc(T.also_h) + '</h2>' + [c.cat].concat(alsoOf(c)).map(function (id) {
      return '<button class="dir" data-action="go-cat" data-id="' + id + '" style="--h:' + hueOf(id) + '">' + icon(id, 16) + esc(catLabel(id, L)) + '</button>';
    }).join('') + '</div>' : '';

    var factsHTML = facts.length ? '<dl class="cp-facts">' + facts.map(function (f) {
      return '<div class="cp-fact"><span class="ic">' + icon(f[0], 20) + '</span><div><dt>' + esc(f[1]) + '</dt><dd>' + esc(f[2]) + '</dd></div></div>';
    }).join('') + '</dl>' : '';

    var about = c.about[L] ? '<section class="cp-sec cp-about-sec"><h2>' + esc(T.about_h2) + '</h2><div class="cp-about">' + aboutParas(c.about[L]) + '</div></section>' : '';

    var mediaSec = '<section class="cp-sec cp-media-sec"><h2>' + esc(T.media_h) + '</h2>' +
      (media.length
        ? '<div class="media" id="media">' + media.map(function (m, i) { return mediaTileHTML(m, i, T); }).join('') + '</div>' +
          (media.some(function (m) { return m.kind !== 'img'; }) ? '<p class="media-note">' + esc(T.media_note) + '</p>' : '')
        : '<div class="media-empty"><span class="ic">' + icon('ig', 24) + '</span><b>' + esc(T.media_empty_h) + '</b>' +
          '<p>' + esc(T.media_empty_p) + ' <a href="#/join/' + slug + '">' + esc(T.media_empty_b) + ' →</a></p></div>') +
      '</section>';

    // Точки на карте нет, но адрес есть — даём поиск по адресу в 2ГИС и Google.
    var findQ = encodeURIComponent(c.name.ru + ', ' + (shortAddr(c, 'ru') || '') + ', Астана');
    var mapSec = !geo && shortAddr(c, L) && !/онлайн|online/i.test(c.addr[L]) ? '<section class="cp-sec cp-map-sec"><h2>' + esc(T.where_h) + '</h2>' +
      '<div class="maplinks"><a class="maplink" href="https://2gis.kz/astana/search/' + findQ + '" target="_blank" rel="noopener">' + icon('map', 18) + esc(T.twogis_find) + '</a>' +
      '<a class="maplink" href="https://www.google.com/maps/search/?api=1&amp;query=' + findQ + '" target="_blank" rel="noopener">' + icon('pin', 18) + esc(T.gmaps) + '</a></div></section>' : '';
    if (geo) mapSec = '<section class="cp-sec cp-map-sec"><h2>' + esc(T.where_h) + '</h2><div class="mini-map" id="mini-map"></div>' +
      '<div class="maplinks"><a class="maplink" href="https://2gis.kz/astana/geo/' + c.lng + ',' + c.lat + '" target="_blank" rel="noopener">' + icon('map', 18) + esc(T.twogis) + '</a>' +
      '<a class="maplink" href="https://www.google.com/maps/search/?api=1&amp;query=' + c.lat + ',' + c.lng + '" target="_blank" rel="noopener">' + icon('pin', 18) + esc(T.gmaps) + '</a></div></section>';

    var hasContact = tel || c.ig || c.tg;
    var web = safeUrl(c.web);
    // Карточка из открытых данных: телефонов в ней нет, только ссылка на сайт
    // организации и честная пометка, откуда взяты сведения.
    var openNote = isOpen(c) ? '<div class="open-note"><h2>' + icon('shield', 18) + esc(T.open_note_h) + '</h2><p>' + esc(T.open_note_p) + '</p>' +
      (Array.isArray(c.src) && c.src.length ? '<p class="src-h">' + esc(T.src_h) + '</p><ul class="src-list">' + c.src.filter(function (x) { return x && safeUrl(x.u); }).map(function (x) {
        return '<li><a href="' + esc(x.u) + '" target="_blank" rel="noopener nofollow">' + esc(x.n || x.u.replace(/^https?:\/\//, '').split('/')[0]) + ' ↗</a></li>';
      }).join('') + '</ul>' : '') +
      '<a class="btn-solid claim" href="#/join/' + slug + '">' + icon('check', 18) + esc(T.claim_b) + '</a>' +
      '<button class="linkish" data-action="remove-req" data-id="' + esc(c.id) + '">' + esc(T.remove_b) + '</button></div>' : '';
    var join = isOpen(c) && !hasContact
      ? '<div class="join-card"><h2>' + esc(T.how_h) + '</h2>' +
        (web ? '<a class="btn-web" href="' + esc(web) + '" target="_blank" rel="noopener" data-track="website">' + icon('globe', 20) + esc(T.web_link) + '</a>' : '') +
        '<p class="join-note">' + esc(T.open_contact) + '</p>' +
        (c.beginner ? '<p class="join-note">' + icon('spark', 18) + esc(T.beg_note) + '</p>' : '') + '</div>'
      : '<div class="join-card"><h2>' + esc(T.join_h) + '</h2>' +
      (tel ? '<a class="btn-wa" data-track="whatsapp" href="https://wa.me/' + tel + '?text=' + encodeURIComponent(T.greet) + '" target="_blank" rel="noopener">' + icon('wa', 22) + 'WhatsApp <small>· ' + esc(T.write) + '</small></a>' : '') +
      (hasContact
        ? '<div class="chat"><p class="chat-lbl">' + esc(T.bubble_lbl) + '</p>' +
          '<div class="bubble"><span id="greet-text">' + esc(T.greet) + '</span><time aria-hidden="true">✓✓</time></div>' +
          '<button class="chat-copy" data-action="copy-greet">' + icon('copy', 16) + esc(T.greet_copy) + '</button></div>'
        : '<p class="join-note">' + esc(T.no_contact) + '</p>') +
      ((c.ig || c.tg) ? '<div class="soc">' +
        (c.ig ? '<a data-track="instagram" href="https://instagram.com/' + esc(encodeURIComponent(c.ig)) + '" target="_blank" rel="noopener">' + icon('ig', 19) + 'Instagram</a>' : '') +
        (c.tg ? '<a data-track="telegram" href="https://t.me/' + esc(encodeURIComponent(c.tg)) + '" target="_blank" rel="noopener">' + icon('tg', 19) + 'Telegram</a>' : '') +
        '</div>' : '') +
      (tel ? '<a class="tel" data-track="phone" href="tel:+' + tel + '">' + esc(c.tel) + '</a>' : '') +
      (c.beginner ? '<p class="join-note">' + icon('spark', 18) + esc(T.beg_note) + '</p>' : '') +
      '</div>';

    var trust = '<div class="trust"><span class="date">' + icon('shield', 18) + esc((isOpen(c) ? T.collected : T.checked) + ': ' + fmtDate(c.checked, L)) + '</span><div class="grow"></div>' +
      (reported
        ? '<span class="thanks" role="status">' + esc(T.reported) + '</span>'
        : '<button class="linkish" data-action="report" data-id="' + esc(c.id) + '">' + esc(T.report) + '</button>') + '</div>';

    var share = '<div class="share"><div class="qr" id="qr" aria-hidden="true"></div><div style="min-width:0">' +
      '<h2>' + esc(T.share_h) + '</h2><p class="share-url">' + esc(url.replace(/^https?:\/\//, '')) + '</p>' +
      '<div class="share-actions"><button data-action="copy-link" data-url="' + esc(url) + '">' + esc(state.linkCopied ? T.link_copied : T.copy_link) + '</button>' +
      '<button data-action="qr-dl" data-slug="' + esc(c.slug) + '">' + esc(T.qr_dl) + '</button></div></div></div>';

    var upd = isOpen(c) ? '' : '<a class="upd-link" href="#/join/' + slug + '">' + icon('plus', 16) + esc(T.update_link) + '</a>';

    return '<article class="screen tight wrap" style="--h:' + h + '">' +
      '<a class="back" href="#/">' + esc(T.back) + '</a>' +
      '<div class="cp">' + cover +
      '<div class="cp-main">' + head + dirs + factsHTML + about + mediaSec + mapSec + '</div>' +
      '<aside class="cp-side">' + openNote + join + trust + share + upd + '</aside>' +
      '</div>' +
      (similar.length ? '<section class="sec" data-reveal><div class="sec-head"><h2 class="sec-h">' + esc(T.similar_h) + '</h2></div>' +
        '<div class="grid">' + similar.map(function (s) { return cardHTML(s, L, T); }).join('') + '</div></section>' : '') +
      '</article>';
  }

  function aboutView() {
    var T = STR[state.lang];
    return '<article class="screen wrap"><div class="about"><div class="about-hero">' + LOGO(58) +
      '<h1>' + esc(T.about_h1) + '</h1>' +
      '<p class="lead-lg">' + esc(T.about_lead) + '</p></div>' +
      '<div class="about-list">' +
      T.about_s.concat(CFG.goatcounter ? [{ h: T.stats_h, p: T.stats_p }] : [])
        .map(function (s) { return '<section data-reveal><h2>' + esc(s.h) + '</h2><p>' + esc(s.p) + '</p></section>'; }).join('') +
      '</div>' +
      '<div class="cta" data-reveal><h2>' + esc(T.cta_h) + '</h2><p>' + esc(T.cta_p) + '</p><div class="cta-btns">' +
      '<a class="cta-w" href="#/join">' + esc(T.cta_b1) + '</a>' +
      '<a class="cta-o" href="#/">' + esc(T.cta_b2) + '</a></div></div>' +
      '</div></article>';
  }

  // ---------- форма для организаторов (#/join) ----------
  // Заявка уходит в ту же Google Форму, что и раньше (номера полей — в config.js),
  // поэтому проверять её Дамир продолжает там же. Черновик хранится в браузере
  // организатора, чтобы случайное обновление страницы не стёрло пять минут работы.
  function blankJoin() {
    return { name: '', cat: '', tag: '', about: '', age: '', cost: '', sched: '', addr: '', dist: '', langs: [], langOther: '', beginner: '',
      tel: '', ig: '', tg: '', media: '', cover: '', contact: '', consent: false, top: '', upd: '', code: '', hp: '' };
  }
  function loadDraft() {
    var d = load(DRAFT_KEY, null);
    if (!d || typeof d !== 'object') return blankJoin();
    var b = blankJoin();
    Object.keys(b).forEach(function (k) { if (d[k] != null) b[k] = d[k]; });
    if (!Array.isArray(b.langs)) b.langs = [];
    b.hp = '';
    return b;
  }
  // Код сообщества в черновик не попадает: компьютер бывает общий.
  function saveDraft() {
    var copy = {};
    Object.keys(state.join).forEach(function (k) { if (k !== 'code' && k !== 'hp') copy[k] = state.join[k]; });
    save(DRAFT_KEY, copy);
  }
  function clearDraft() { try { window.localStorage.removeItem(DRAFT_KEY); } catch (e) { /* хранилище недоступно */ } }

  // Карточка уже на сайте — открываем форму с её данными, чтобы организатор
  // только дописал недостающее (чаще всего — фото и видео).
  // Карточку из открытых данных организатор подтверждает без кода: кода у него
  // ещё нет. Дамир проверяет такую заявку звонком по номеру с сайта организации.
  function claiming(d) {
    var c = d.upd && findClub(d.upd);
    return !!(c && isOpen(c));
  }
  function joinFromClub(c) {
    var d = blankJoin(), L = 'ru';
    d.upd = c.slug;
    d.name = c.name[L] || '';
    d.cat = c.cat || '';
    d.tag = c.tag[L] || '';
    d.about = c.about[L] || '';
    d.age = c.age && c.age !== '—' ? c.age : '';
    ['cost', 'sched', 'addr'].forEach(function (k) { var v = c[k] && c[k][L]; d[k] = v && v !== '—' ? v : ''; });
    d.dist = c.dist || '';
    d.tel = c.tel || '';
    d.ig = c.ig || '';
    d.tg = c.tg || '';
    d.media = mediaList(c.media).map(function (m) { return m.url; }).join('\n');
    d.beginner = c.beginner ? 'yes' : '';
    return d;
  }

  var JOIN_STEPS = 4;
  function jfLabel(text, optional) {
    var T = STR[state.lang];
    return '<span class="jf-l">' + esc(text) + (optional ? ' <span class="opt">' + esc(T.j_opt) + '</span>' : '') + '</span>';
  }
  function jfNote(key, hint) {
    var err = state.joinErr[key];
    return err ? '<span class="jf-err" role="alert">' + esc(err) + '</span>' : (hint ? '<span class="jf-hint">' + esc(hint) + '</span>' : '');
  }
  function jfInput(key, label, o) {
    o = o || {};
    var v = state.join[key] || '';
    return '<label class="jf-f' + (state.joinErr[key] ? ' bad' : '') + '">' + jfLabel(label, o.optional) +
      (o.area
        ? '<textarea data-j="' + key + '" rows="' + (o.rows || 4) + '" placeholder="' + esc(o.ph || '') + '">' + esc(v) + '</textarea>'
        : '<input data-j="' + key + '" type="' + (o.type || 'text') + '" value="' + esc(v) + '" placeholder="' + esc(o.ph || '') + '"' +
          (o.auto ? ' autocomplete="' + o.auto + '"' : '') + (o.mode ? ' inputmode="' + o.mode + '"' : '') + '>') +
      jfNote(key, o.hint) + (o.after || '') + '</label>';
  }
  function mediaCountText() {
    var T = STR[state.lang];
    var lines = mediaLines(state.join.media);
    if (!lines.length) return '';
    var ok = mediaList(lines).length;
    return T.j_media_ok + ': ' + ok + ' / ' + lines.length;
  }

  function wizardHTML() {
    var L = state.lang, T = STR[L], d = state.join, step = state.joinStep;
    var titles = [T.j_s1, T.j_s2, T.j_s3, T.j_s4];
    var body = '';
    if (step === 0) {
      // Изменить чужую карточку можно только с кодом, который знают организатор
      // и владелец сайта. Сайт код не проверяет — он лишь передаёт его вместе
      // с заявкой, а сверяет Дамир по своему закрытому списку (в репозиторий
      // список не попадает, иначе его увидел бы любой).
      body = (d.upd && !claiming(d) ? jfInput('code', T.j_code, { ph: 'QS-XXXX-XXXX', hint: T.j_code_hint, auto: 'off' }) : '') +
        jfInput('name', T.j_name, { ph: T.j_name_ph, auto: 'organization' }) +
        '<div class="jf-f' + (state.joinErr.cat ? ' bad' : '') + '">' + jfLabel(T.j_cat) +
        '<div class="jf-cats" role="group" aria-label="' + esc(T.j_cat) + '">' +
        CATS.map(function (c) {
          return '<button type="button" class="jf-cat" data-action="j-cat" data-id="' + c.id + '" aria-pressed="' + (d.cat === c.id) + '" style="--h:' + hueOf(c.id) + '">' +
            '<span class="ic">' + icon(c.id, 19) + '</span>' + esc(c[L]) + '</button>';
        }).join('') +
        '<button type="button" class="jf-cat" data-action="j-cat" data-id="other" aria-pressed="' + (d.cat === 'other') + '" style="--h:262"><span class="ic">' + icon('plus', 19) + '</span>' + esc(T.j_cat_other) + '</button>' +
        '</div>' + jfNote('cat') + '</div>' +
        jfInput('tag', T.j_tag, { ph: T.j_tag_ph }) +
        jfInput('about', T.j_about, { area: true, rows: 5, ph: T.j_about_ph, hint: T.j_about_hint });
    } else if (step === 1) {
      body = '<div class="jf-row two">' + jfInput('age', T.j_age, { ph: '12–17' }) +
        jfInput('cost', T.j_cost, { ph: T.j_cost_ph, after: '<span class="jf-pills" style="margin-top:2px"><button type="button" class="pill" data-action="j-free" aria-pressed="' + (d.cost === T.f_free) + '">' + esc(T.f_free) + '</button></span>' }) + '</div>' +
        '<div class="jf-row two">' + jfInput('sched', T.j_sched, { ph: T.j_sched_ph }) + jfInput('addr', T.j_addr, { ph: T.j_addr_ph, auto: 'street-address' }) + '</div>' +
        '<div class="jf-f">' + jfLabel(T.j_dist, true) + '<div class="jf-pills">' +
        DISTRICTS.map(function (x) {
          return '<button type="button" class="pill" data-action="j-dist" data-id="' + x.id + '" aria-pressed="' + (d.dist === x.id) + '">' + esc(x[L]) + '</button>';
        }).join('') + '</div></div>' +
        '<div class="jf-f' + (state.joinErr.langs ? ' bad' : '') + '">' + jfLabel(T.j_langs) + '<div class="jf-pills">' +
        [['kz', 'Қазақша'], ['ru', 'Русский'], ['en', 'English']].map(function (l) {
          return '<button type="button" class="pill" data-action="j-lang" data-id="' + l[0] + '" aria-pressed="' + (d.langs.indexOf(l[0]) !== -1) + '">' + l[1] + '</button>';
        }).join('') + '</div>' +
        '<input data-j="langOther" type="text" value="' + esc(d.langOther) + '" placeholder="' + esc(T.j_lang_other) + '" style="max-width:280px">' +
        jfNote('langs') + '</div>' +
        '<div class="jf-f' + (state.joinErr.beginner ? ' bad' : '') + '">' + jfLabel(T.j_beg) + '<div class="jf-pills">' +
        '<button type="button" class="pill" data-action="j-beg" data-id="yes" aria-pressed="' + (d.beginner === 'yes') + '">' + esc(T.j_yes) + '</button>' +
        '<button type="button" class="pill" data-action="j-beg" data-id="no" aria-pressed="' + (d.beginner === 'no') + '">' + esc(T.j_no) + '</button>' +
        '</div>' + jfNote('beginner') + '</div>';
    } else if (step === 2) {
      body = jfInput('tel', T.j_tel, { type: 'tel', ph: '+7 701 234 56 78', hint: T.j_tel_hint, auto: 'tel', mode: 'tel' }) +
        '<div class="jf-row two">' + jfInput('ig', 'Instagram', { ph: '@club.astana', optional: true }) + jfInput('tg', 'Telegram', { ph: '@club_astana', optional: true }) + '</div>' +
        jfInput('media', T.j_media, { area: true, rows: 4, optional: true, ph: 'https://www.instagram.com/p/…\nhttps://youtu.be/…', hint: T.j_media_hint,
          after: '<span class="jf-hint" id="media-count" aria-live="polite">' + esc(mediaCountText()) + '</span>' }) +
        jfInput('cover', T.j_cover, { optional: true, ph: 'https://…', hint: T.j_cover_hint });
    } else {
      body = jfInput('contact', T.j_contact, { ph: T.j_contact_ph, hint: T.j_contact_hint, auto: 'name' }) +
        '<div class="jf-f">' + jfLabel(T.j_top, true) + '<div class="jf-pills">' +
        '<button type="button" class="pill" data-action="j-top" data-id="no" aria-pressed="' + (d.top === 'no') + '">' + esc(T.j_top_no) + '</button>' +
        '<button type="button" class="pill" data-action="j-top" data-id="yes" aria-pressed="' + (d.top === 'yes') + '">' + esc(T.j_top_yes) + '</button>' +
        '</div></div>' +
        '<button type="button" class="jf-check' + (state.joinErr.consent ? ' bad' : '') + '" data-action="j-consent" aria-pressed="' + !!d.consent + '"><i>' + (d.consent ? icon('check', 15) : '') + '</i><span>' + esc(T.j_consent) + '</span></button>' +
        jfNote('consent') +
        '<label class="hp" aria-hidden="true">Website<input data-j="hp" type="text" tabindex="-1" autocomplete="off"></label>';
    }
    var sending = state.joinStatus === 'sending';
    var club = d.upd && findClub(d.upd);
    return '<div class="wiz-top"><span class="wiz-step">' + esc(T.j_step + ' ' + (step + 1) + ' ' + T.j_of + ' ' + JOIN_STEPS) + '</span>' +
      '<span class="wiz-saved">' + esc(T.j_saved) + '</span></div>' +
      '<div class="wiz-bar" aria-hidden="true">' + [0, 1, 2, 3].map(function (i) { return '<i' + (i <= step ? ' class="on"' : '') + '></i>'; }).join('') + '</div>' +
      '<h2 id="wiz-h" tabindex="-1">' + esc(titles[step]) + '</h2>' +
      (club ? '<p class="upd-banner">' + esc((isOpen(club) ? T.j_claim_p : T.j_update_p).replace('{name}', club.name[L])) + '</p>' : '') +
      '<div class="jf">' + body + '</div>' +
      (state.joinStatus === 'fail'
        ? '<p class="wiz-fail" role="alert">' + esc(T.j_fail) + (safeUrl(CFG.orgFormUrl) ? ' <a href="' + esc(CFG.orgFormUrl) + '" target="_blank" rel="noopener">' + esc(T.j_fail_alt) + '</a>' : '') + '</p>'
        : '') +
      '<div class="wiz-nav">' +
      (step > 0 ? '<button type="button" class="wiz-back" data-action="j-back">← ' + esc(T.j_back) + '</button>' : '') +
      (step < JOIN_STEPS - 1
        ? '<button type="button" class="wiz-next" data-action="j-next">' + esc(T.j_next) + icon('arrow', 18) + '</button>'
        : '<button type="button" class="wiz-next" data-action="j-send"' + (sending ? ' disabled' : '') + '>' + esc(sending ? T.j_sending : T.j_send) + (sending ? '' : icon('arrow', 18)) + '</button>') +
      '</div>';
  }

  function sentHTML() {
    var T = STR[state.lang];
    return '<div class="wiz-ok"><span class="big">' + icon('check', 40) + '</span>' +
      '<h2 id="wiz-h" tabindex="-1">' + esc(T.j_ok_h) + '</h2><p>' + esc(T.j_ok_p) + '</p>' +
      '<div class="empty-btns"><a class="btn-solid" href="#/">' + esc(T.j_ok_b) + '</a>' +
      '<button class="btn-outline" data-action="j-again">' + esc(T.j_ok_more) + '</button></div></div>';
  }

  function joinView() {
    var T = STR[state.lang];
    var li = function (p) { return '<li><span class="ok-ic">' + icon('check', 15) + '</span>' + esc(p) + '</li>'; };
    return '<section class="screen wrap join"><a class="back" href="#/">' + esc(T.back) + '</a>' +
      '<div class="join-grid"><aside class="join-aside">' +
      '<p class="sec-kicker">' + esc(T.join_k) + '</p><h1>' + esc(T.join_h1) + '</h1><p class="lead">' + esc(T.join_lead) + '</p>' +
      '<ul class="join-perks">' + [T.perk1, T.perk2, T.perk3, T.perk4].map(li).join('') + '</ul>' +
      '<div class="join-how"><h2>' + esc(T.join_how_h) + '</h2><ol>' +
      [T.join_how1, T.join_how2, T.join_how3].map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ol></div>' +
      '</aside><div class="wiz" id="wiz">' + (state.joinStatus === 'sent' ? sentHTML() : wizardHTML()) + '</div></div></section>';
  }

  // Перерисовываем только саму форму и возвращаем фокус туда, где он был.
  function paintWiz(focusHead) {
    var box = document.getElementById('wiz');
    if (!box) return;
    var a = document.activeElement;
    var key = a && a.getAttribute && (a.getAttribute('data-action') ? '[data-action="' + a.getAttribute('data-action') + '"]' + (a.getAttribute('data-id') ? '[data-id="' + a.getAttribute('data-id') + '"]' : '') : null);
    box.innerHTML = state.joinStatus === 'sent' ? sentHTML() : wizardHTML();
    if (focusHead) {
      var hd = document.getElementById('wiz-h');
      if (hd) hd.focus({ preventScroll: true });
      var top = box.getBoundingClientRect().top + window.pageYOffset - 84;
      if (window.pageYOffset > top) window.scrollTo(0, top);
      return;
    }
    if (key) { var again = box.querySelector(key); if (again) again.focus({ preventScroll: true }); }
  }

  function joinCheck(step) {
    var T = STR[state.lang], d = state.join, e = {};
    function req(k) { if (!String(d[k] || '').trim()) e[k] = T.j_req; }
    if (step === 0) { if (d.upd && !claiming(d) && !String(d.code || '').trim()) e.code = T.j_req_code; req('name'); if (!d.cat) e.cat = T.j_req_cat; req('tag'); req('about'); }
    if (step === 1) {
      req('age'); req('cost'); req('sched'); req('addr');
      if (!d.langs.length && !String(d.langOther || '').trim()) e.langs = T.j_req_lang;
      if (d.beginner !== 'yes' && d.beginner !== 'no') e.beginner = T.j_req_beg;
    }
    if (step === 2 && digits(d.tel).length < 10) e.tel = T.j_req_tel;
    if (step === 3) { req('contact'); if (!d.consent) e.consent = T.j_req_consent; }
    return e;
  }

  // Описание — единственное большое поле формы, поэтому в него же кладём всё,
  // для чего в Google Форме нет отдельного вопроса: точную секцию, район,
  // ссылки на фото и видео и пометку, что это обновление существующей карточки.
  function joinCarrier(d) {
    var head = [];
    var cat = d.cat === 'other' ? 'Другое' : catLabel(d.cat, 'ru');
    head.push('Секция на сайте: ' + cat);
    if (d.dist) head.push('Район: ' + distLabel(d.dist, 'ru'));
    if (d.upd && claiming(d)) head.push('ПОДТВЕРЖДЕНИЕ карточки из открытых источников: ' + d.upd + ' · перед публикацией позвонить по номеру с официального сайта');
    else if (d.upd) head.push('ОБНОВЛЕНИЕ карточки: ' + d.upd + ' · код: ' + (String(d.code || '').trim().toUpperCase() || 'НЕ УКАЗАН'));
    var links = mediaLines(d.media);
    var tail = [];
    if (links.length) tail.push('Фото и видео:\n' + links.join('\n'));
    if (String(d.cover || '').trim()) tail.push('Обложка: ' + d.cover.trim());
    tail.push('Отправлено с qosyl.club');
    return head.join('\n') + '\n\n' + String(d.about || '').trim() + '\n\n' + tail.join('\n\n');
  }

  function joinSubmit() {
    var F = CFG.form, d = state.join;
    if (state.joinStatus === 'sending') return;
    // Скрытое поле заполняют только роботы: делаем вид, что всё отправилось.
    if (d.hp) { state.joinStatus = 'sent'; paintWiz(true); return; }
    if (!F || !F.action || !window.fetch) { state.joinStatus = 'fail'; paintWiz(); return; }
    var E = F.entries, p = new URLSearchParams();
    p.append(E.name, d.name.trim());
    p.append(E.cat, F.cat[d.cat] || F.cat.other);
    p.append(E.tag, d.tag.trim());
    p.append(E.about, joinCarrier(d));
    p.append(E.age, d.age.trim());
    p.append(E.cost, d.cost.trim());
    p.append(E.sched, d.sched.trim());
    p.append(E.addr, d.addr.trim());
    d.langs.forEach(function (l) { if (F.langs[l]) p.append(E.langs, F.langs[l]); });
    if (String(d.langOther || '').trim()) {
      p.append(E.langs, '__other_option__');
      p.append(E.langs + '.other_option_response', d.langOther.trim());
    }
    p.append(E.beginner, d.beginner === 'yes' ? F.yes : F.no);
    p.append(E.tel, d.tel.trim());
    if (d.ig.trim()) p.append(E.ig, d.ig.trim().replace(/^@/, ''));
    if (d.tg.trim()) p.append(E.tg, d.tg.trim().replace(/^@/, ''));
    p.append(E.contact, d.contact.trim());
    p.append(E.consent, F.consent);
    if (d.top) p.append(E.top, d.top === 'yes' ? F.topYes : F.topNo);
    p.append('pageHistory', F.pages);
    p.append('fvv', '1');
    state.joinStatus = 'sending';
    paintWiz();
    // Google не разрешает читать ответ с чужого сайта (no-cors), поэтому
    // успехом считаем то, что запрос ушёл без сетевой ошибки.
    fetch(F.action, { method: 'POST', mode: 'no-cors', body: p }).then(function () {
      state.joinStatus = 'sent';
      statsSend({ path: 'join/sent' + (d.upd ? '/update' : ''), title: 'Заявка с сайта', event: true });
      state.join = blankJoin();
      state.joinStep = 0;
      clearDraft();
      paintWiz(true);
    }, function () {
      state.joinStatus = 'fail';
      paintWiz();
    });
  }

  // ---------- оживление ----------
  // Плавное появление блоков при прокрутке. instant — для частичных перерисовок
  // (поиск, фильтры), где анимация на каждое нажатие клавиши только мешала бы.
  var revealIO = null;
  function reveal(root, instant) {
    if (!root) return;
    var els = root.querySelectorAll('[data-reveal]:not(.in)');
    if (instant || !revealIO) { for (var i = 0; i < els.length; i++) els[i].classList.add('in'); return; }
    for (var j = 0; j < els.length; j++) revealIO.observe(els[j]);
  }
  if ('IntersectionObserver' in window && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    document.documentElement.classList.add('js-reveal');
    window.addEventListener('beforeprint', function () { reveal(document, true); });
  }

  // Цифры в бренд-блоке «набегают» от нуля при первом показе главной.
  function countUp(root) {
    if (!root || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    var els = root.querySelectorAll('[data-count]');
    var t0 = null, dur = 900;
    function frame(t) {
      if (t0 == null) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      for (var i = 0; i < els.length; i++) els[i].textContent = String(Math.round(Number(els[i].getAttribute('data-count')) * e));
      if (k < 1) window.requestAnimationFrame(frame);
    }
    if (els.length) window.requestAnimationFrame(frame);
  }

  function toCatalog() {
    var el = document.getElementById('catalog');
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.pageYOffset - 70;
    var smooth = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
  }

  function openLightbox(src) {
    closeLightbox();
    var T = STR[state.lang];
    var box = document.createElement('div');
    box.className = 'lb';
    box.id = 'lb';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.innerHTML = '<img src="' + esc(src) + '" alt=""><button class="lb-x" data-action="lb-close" aria-label="' + esc(T.close) + '">✕</button>';
    box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('.lb-x')) closeLightbox(); });
    document.body.appendChild(box);
    box.querySelector('.lb-x').focus();
  }
  function closeLightbox() {
    var box = document.getElementById('lb');
    if (box) box.parentNode.removeChild(box);
  }

  function mapListHTML() {
    var L = state.lang, T = STR[L];
    var all = allClubs();
    var rest = all.length - state.shown;
    return all.slice(0, state.shown).map(function (c) {
      var addr = c.addr[L] && c.addr[L] !== '—' && !/^нет$/i.test(c.addr[L]) ? c.addr[L] : catLabel(c.cat, L);
      return '<a class="map-item" href="#/club/' + esc(encodeURIComponent(c.slug)) + '" style="--h:' + hueOf(c.cat) + '"><span class="ic">' + icon(c.cat, 18) + '</span>' +
        '<b>' + esc(c.name[L]) + '</b><span>' + esc(addr) + '</span></a>';
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
    return '<section class="screen tight wrap">' +
      '<a class="back" href="#/">' + esc(T.back) + '</a>' +
      '<h1 class="page-h">' + esc(T.map_h1) + '</h1>' +
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
      media: mediaList(m.media).map(function (x) { return x.url; }),
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
      '<p class="intro">Заявки приходят в Google Форму — с формы на сайте (#/join) или напрямую. Ссылки на фото и видео лежат в конце описания заявки. Ты переносишь ответы сюда. Оно сразу появляется в каталоге и пином на карте — но только в этом браузере. Чтобы его увидели все, скопируй код внизу в массив CLUBS файла data.js и опубликуй сайт.</p>' +
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
      '<label class="field" style="margin-bottom:18px"><span>Фото и видео — ссылки, по одной в строке</span>' +
      '<textarea data-field="media" rows="3" placeholder="https://www.instagram.com/p/…">' + esc(f.media) + '</textarea></label>' +
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
  var maps = { view: null, pins: null, pick: null, pickMark: null, mini: null, cat: null };

  // Пин в цвет направления; у добавленных в этом браузере — тёмная обводка.
  function pinIcon(mine, hue) {
    var bg = hue == null ? '#2F6BFF' : 'oklch(0.56 0.17 ' + hue + ')';
    return window.L.divIcon({
      className: '',
      html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:' + bg + ';border:3px solid ' + (mine ? '#0E1530' : '#fff') + ';box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>',
      iconSize: [18, 18], iconAnchor: [9, 9]
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
    if (maps.mini) { maps.mini.remove(); maps.mini = null; }
    if (maps.cat) { maps.cat.remove(); maps.cat = null; }
  }
  function drawPins() {
    if (!maps.view) return;
    var L = state.lang;
    maps.pins.clearLayers();
    allClubs().filter(function (c) { return !isNaN(c.lat) && !isNaN(c.lng); }).forEach(function (c) {
      var m = window.L.marker([c.lat, c.lng], { icon: pinIcon(c.mine, hueOf(c.cat)), title: c.name[L] }).addTo(maps.pins);
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
  // Маленькая карта на странице сообщества. На телефоне её нельзя таскать
  // пальцем, иначе она перехватывает прокрутку страницы.
  function mountMiniMap(c) {
    var el = document.getElementById('mini-map');
    if (!el || !window.L || !c || !hasCoords(c)) return;
    var mobile = window.L.Browser && window.L.Browser.mobile;
    maps.mini = window.L.map(el, { zoomControl: !mobile, scrollWheelZoom: false, dragging: !mobile, tap: false }).setView([c.lat, c.lng], 14);
    tiles().addTo(maps.mini);
    window.L.marker([c.lat, c.lng], { icon: pinIcon(false, hueOf(c.cat)) }).addTo(maps.mini);
  }
  // Карта каталога: точки только тех сообществ, что сейчас в выдаче, и масштаб
  // подгоняется под них. На телефоне карту двигают двумя пальцами — одним
  // пальцем страница листается, как обычно.
  function mountCatMap() {
    var el = document.getElementById('cat-map');
    if (!el || !window.L || maps.cat) return;
    var L = state.lang, T = STR[L];
    var mobile = window.L.Browser && window.L.Browser.mobile;
    maps.cat = window.L.map(el, { scrollWheelZoom: false, dragging: !mobile, tap: false }).setView(CENTER, 11);
    tiles().addTo(maps.cat);
    var pts = [];
    filtered().filter(hasCoords).forEach(function (c) {
      var m = window.L.marker([c.lat, c.lng], { icon: pinIcon(false, hueOf(c.cat)), title: c.name[L] }).addTo(maps.cat);
      m.bindPopup('<a class="pop" href="#/club/' + esc(encodeURIComponent(c.slug)) + '"><b>' + esc(c.name[L]) + '</b>' +
        '<span>' + esc(catLabel(c.cat, L)) + ' · ' + esc(T.open) + ' →</span></a>', { closeButton: false });
      m.on('click', function () { highlightRow(c.id); });
      pts.push([c.lat, c.lng]);
    });
    if (pts.length > 1) maps.cat.fitBounds(pts, { padding: [34, 34], maxZoom: 14 });
    else if (pts.length === 1) maps.cat.setView(pts[0], 14);
  }
  function highlightRow(id) {
    var rows = document.querySelectorAll('.cs-rows [data-pin]'), hit = null;
    for (var i = 0; i < rows.length; i++) {
      var on = rows[i].getAttribute('data-pin') === id;
      rows[i].classList.toggle('hl', on);
      if (on) hit = rows[i];
    }
    if (hit && window.matchMedia('(min-width: 900px)').matches) hit.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
    paintResults();
    var hf = document.getElementById('hero-found');
    if (hf) hf.innerHTML = heroFoundHTML();
  }
  // Выдача перерисовывается и при наборе в поиске: карту каталога пересоздаём вместе с ней.
  function paintResults() {
    var res = document.getElementById('results');
    if (!res) return;
    if (maps.cat) { maps.cat.remove(); maps.cat = null; }
    res.innerHTML = resultsHTML();
    reveal(res, true);
    mountCatMap();
  }
  function paintChips() {
    var ch = document.getElementById('chips');
    if (ch) ch.innerHTML = catsHTML();
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
    var nav = { 'nav-about': ['about', T.nav_about], 'nav-cat': ['catalog', T.nav_catalog], 'nav-add': ['join', T.nav_add] };
    Object.keys(nav).forEach(function (id) {
      var a = document.getElementById(id);
      if (!a) return;
      a.textContent = nav[id][1];
      if (r.screen === nav[id][0]) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
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
    if (r.screen === 'catalog') return T.title_catalog;
    if (r.screen === 'add') return 'Панель создателя — ' + site;
    if (r.screen === 'join') return T.join_h1 + ' — ' + site;
    return T.title_home;
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
    // Прямая ссылка «подтвердить/дополнить карточку»: каталог мог догрузиться
    // уже после первой отрисовки — тогда подставляем данные сообщества сейчас.
    if (r.screen === 'join' && (changedPage || (r.id && state.join.upd !== r.id && findClub(r.id)))) prepareJoin(r.id);
    var html = r.screen === 'club' ? clubView(r.id)
      : r.screen === 'join' ? joinView()
      : r.screen === 'about' ? aboutView()
      : r.screen === 'map' ? mapView()
      : r.screen === 'add' ? addView()
      : r.screen === 'catalog' ? catalogView()
      : homeView();
    if (changedPage) app.setAttribute('data-enter', ''); else app.removeAttribute('data-enter');
    app.innerHTML = html;
    document.title = pageTitle(r);
    if (changedPage) trackPage(r);

    if (r.screen === 'map') mountViewMap();
    if (r.screen === 'home' || r.screen === 'catalog') mountCatMap();
    if (r.screen === 'add') mountPickMap();
    if (r.screen === 'club') { var c = findClub(r.id); if (c) { renderQR(shareUrl(c)); mountMiniMap(c); } }
    reveal(app, !changedPage);
    if ((r.screen === 'home' || r.screen === 'catalog') && changedPage) countUp(app);

    if (changedPage && !(opts && opts.keepScroll)) {
      window.scrollTo(0, 0);
      if (opts && opts.focus) app.focus({ preventScroll: true });
    }
  }

  // Открыли форму: по ссылке «дополнить карточку» подставляем данные сообщества,
  // по обычной — начинаем с чистого листа, если в черновике было чужое обновление.
  function prepareJoin(slug) {
    state.joinErr = {};
    if (state.joinStatus !== 'sending') state.joinStatus = '';
    var c = slug && findClub(slug);
    if (c && state.join.upd !== c.slug) { state.join = joinFromClub(c); state.joinStep = 0; saveDraft(); }
    else if (!slug && state.join.upd) { state.join = blankJoin(); state.joinStep = 0; saveDraft(); }
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
        paintChips();
        repaintList();
        break;
      case 'view':
        state.view = id === 'map' ? 'map' : 'list';
        statsSend({ path: 'catalog/' + state.view, title: 'Каталог — ' + (state.view === 'map' ? 'карта' : 'список'), event: true });
        repaintList();
        break;
      case 'go-cat':
        state.cat = id;
        state.shown = PAGE;
        if (document.getElementById('chips')) { paintChips(); repaintList(); toCatalog(); }
        else window.location.hash = '#/catalog';
        break;
      case 'to-catalog':
        toCatalog();
        break;
      case 'clear-q': {
        state.q = '';
        state.shown = PAGE;
        syncSearch(null);
        repaintList();
        break;
      }
      case 'random': {
        var pool = allClubs();
        var cur = route().id;
        var others = pool.filter(function (c) { return c.slug !== cur; });
        var pick = (others.length ? others : pool)[Math.floor(Math.random() * (others.length || pool.length))];
        if (pick) { statsSend({ path: 'random', title: 'Случайное сообщество', event: true }); window.location.hash = '#/club/' + encodeURIComponent(pick.slug); }
        break;
      }
      case 'embed': {
        var rc = route(), ec = rc.screen === 'club' && findClub(rc.id);
        var item = ec && mediaList(ec.media)[Number(el.getAttribute('data-i'))];
        if (!item) break;
        var holder = document.createElement('div');
        holder.className = 'm-open';
        holder.innerHTML = embedHTML(item);
        el.parentNode.replaceChild(holder, el);
        statsSend({ path: 'media/' + item.kind + '/' + ec.slug, title: ec.name.ru + ' — ' + item.kind, event: true });
        break;
      }
      case 'lightbox':
        openLightbox(el.getAttribute('data-src'));
        break;
      case 'j-cat':
        state.join.cat = id; delete state.joinErr.cat; saveDraft(); paintWiz();
        break;
      case 'j-dist':
        state.join.dist = state.join.dist === id ? '' : id; saveDraft(); paintWiz();
        break;
      case 'j-lang': {
        var ls = state.join.langs, at = ls.indexOf(id);
        if (at === -1) ls.push(id); else ls.splice(at, 1);
        delete state.joinErr.langs; saveDraft(); paintWiz();
        break;
      }
      case 'j-beg':
        state.join.beginner = id; delete state.joinErr.beginner; saveDraft(); paintWiz();
        break;
      case 'j-free': {
        var free = STR[state.lang].f_free;
        state.join.cost = state.join.cost === free ? '' : free; delete state.joinErr.cost; saveDraft(); paintWiz();
        break;
      }
      case 'j-top':
        state.join.top = state.join.top === id ? '' : id; saveDraft(); paintWiz();
        break;
      case 'j-consent':
        state.join.consent = !state.join.consent; delete state.joinErr.consent; saveDraft(); paintWiz();
        break;
      case 'j-next': {
        var errs = joinCheck(state.joinStep);
        state.joinErr = errs;
        if (Object.keys(errs).length) {
          paintWiz();
          var bad = document.querySelector('#wiz .bad input, #wiz .bad textarea, #wiz .bad button, #wiz .jf-check.bad');
          if (bad) bad.focus();
          break;
        }
        state.joinStep = Math.min(JOIN_STEPS - 1, state.joinStep + 1);
        state.joinStatus = '';
        saveDraft();
        paintWiz(true);
        statsSend({ path: 'join/step-' + (state.joinStep + 1), title: 'Заявка — шаг ' + (state.joinStep + 1), event: true });
        break;
      }
      case 'j-back':
        state.joinErr = {};
        state.joinStep = Math.max(0, state.joinStep - 1);
        paintWiz(true);
        break;
      case 'j-send': {
        var all = {};
        for (var si = 0; si < JOIN_STEPS; si++) {
          var se = joinCheck(si);
          if (Object.keys(se).length) { state.joinErr = se; state.joinStep = si; paintWiz(true); all = null; break; }
        }
        if (all) { state.joinErr = {}; joinSubmit(); }
        break;
      }
      case 'j-again':
        state.join = blankJoin(); state.joinStep = 0; state.joinStatus = ''; state.joinErr = {};
        clearDraft();
        if (route().id) window.location.hash = '#/join'; else paintWiz(true);
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
      case 'reset': {
        state.q = ''; state.cat = 'all'; state.dist = 'all'; state.free = false; state.beg = false; state.ok = false; state.shown = PAGE;
        syncSearch(null);
        paintChips();
        repaintList();
        break;
      }
      case 'remove-req': {
        var rc2 = findClub(id);
        if (CFG.reportEmail && rc2) {
          window.location.href = 'mailto:' + CFG.reportEmail + '?subject=' + encodeURIComponent('Убрать карточку: ' + rc2.name.ru) +
            '&body=' + encodeURIComponent(shareUrl(rc2) + '\n\nПрошу убрать карточку. Я представляю организацию: ');
        }
        break;
      }
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
        paintResults();
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
    var t = e.target;
    if (!t.hasAttribute) return;
    if (t.hasAttribute('data-photo')) handlePhotoFile(t.files[0]);
    if (t.hasAttribute('data-sort')) { state.sort = t.value === 'az' ? 'az' : 'rec'; state.shown = PAGE; repaintList(); }
    if (t.hasAttribute('data-dist-sel')) { state.dist = t.value || 'all'; state.shown = PAGE; repaintList(); }
  });

  // Поиск есть в двух местах — в бренд-блоке и в шапке каталога. Текст держим одинаковым.
  function syncSearch(from) {
    ['q', 'cq'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el !== from && el.value !== state.q) el.value = state.q;
    });
  }

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'q' || t.id === 'cq') {
      state.q = t.value;
      state.shown = PAGE;
      syncSearch(t);
      paintResults();
      var hf = document.getElementById('hero-found');
      if (hf) hf.innerHTML = heroFoundHTML();
      return;
    }
    var jk = t.getAttribute && t.getAttribute('data-j');
    if (jk) {
      state.join[jk] = t.value;
      if (state.joinErr[jk]) {
        delete state.joinErr[jk];
        var f = t.closest('.jf-f');
        if (f) { f.classList.remove('bad'); var er = f.querySelector('.jf-err'); if (er) er.parentNode.removeChild(er); }
      }
      if (jk === 'langOther' && state.joinErr.langs && t.value.trim()) delete state.joinErr.langs;
      if (jk === 'media') { var mc = document.getElementById('media-count'); if (mc) mc.textContent = mediaCountText(); }
      if (jk !== 'hp') saveDraft();
      return;
    }
    var key = t.getAttribute && t.getAttribute('data-field');
    if (key) {
      state.form[key] = t.value;
      if (state.formErr) { state.formErr = ''; showFormErr(); }
      if (key === 'name' || key === 'tag' || key === 'kw' || key === 'about') updateGuess();
    }
  });

  // Поиск в бренд-блоке: Enter прокручивает к найденному и прячет клавиатуру телефона.
  document.addEventListener('submit', function (e) {
    if (!e.target.hasAttribute || !e.target.hasAttribute('data-search')) return;
    e.preventDefault();
    var qi = e.target.querySelector('input');
    if (qi) qi.blur();
    statsSend({ path: 'search', title: 'Поиск: ' + state.q.trim().slice(0, 40), event: true });
    toCatalog();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
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
    rowHTML: cardHTML,
    icon: icon,
    hueOf: hueOf,
    reveal: reveal,
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
