(function () {
  'use strict';

  var CATS = window.YOUTHS_DATA.CATS;
  var CLUBS = window.YOUTHS_DATA.CLUBS;
  var CAT_HINTS = window.YOUTHS_DATA.CAT_HINTS || {};
  var STR = window.YOUTHS_STR;
  var CFG = window.YOUTHS_CONFIG || {};

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
  function digits(s) { return String(s || '').replace(/[^0-9]/g, ''); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }

  var LOGO = function (size) {
    return '<svg class="logo" width="' + size + '" height="' + size + '" viewBox="0 0 32 32" fill="none" aria-hidden="true">' +
      '<path d="M16 4 L28 16 L16 28 L4 16 Z" stroke="#2F6BFF" stroke-opacity="0.3" stroke-width="1.4"/>' +
      '<path d="M10 16 C10 12 13 10.5 16 13 C19 10.5 22 12 22 16 C22 19.5 19 21.5 16 24 C13 21.5 10 19.5 10 16 Z" stroke="#2F6BFF" stroke-width="1.7" stroke-linejoin="round"/>' +
      '<circle cx="16" cy="8.5" r="1.9" fill="#2F6BFF"/><circle cx="23.5" cy="16" r="1.9" fill="#2F6BFF"/><circle cx="8.5" cy="16" r="1.9" fill="#2F6BFF"/></svg>';
  };

  var ORNAMENT = '<svg class="hero-orn" width="190" height="190" viewBox="0 0 176 176" fill="none" aria-hidden="true"><defs>' +
    '<pattern id="ornPat" width="44" height="44" patternUnits="userSpaceOnUse" viewBox="0 0 32 32">' +
    '<path d="M16 4 L28 16 L16 28 L4 16 Z" stroke="#2F6BFF" stroke-width="1.4" fill="none"/>' +
    '<path d="M10 16 C10 12 13 10.5 16 13 C19 10.5 22 12 22 16 C22 19.5 19 21.5 16 24 C13 21.5 10 19.5 10 16 Z" stroke="#2F6BFF" stroke-width="1.7" stroke-linejoin="round" fill="none"/>' +
    '</pattern></defs><rect width="176" height="176" fill="url(#ornPat)"/></svg>';

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
    return { name: '', tag: '', about: '', cat: '', age: '', cost: '', sched: '', addr: '', langs: '', tel: '', ig: '', tg: '', photo: '', kw: '', checked: '', lat: '', lng: '', beginner: true, verified: false };
  }

  var state = {
    lang: initialLang(),
    q: '',
    cat: 'all',
    mine: load(STORE_KEY, []),
    reported: load(REPORT_KEY, []),
    form: blankForm(),
    formErr: '',
    justSaved: null,
    pin: null,
    copied: false,
    linkCopied: false
  };

  function normalizeUser(u) {
    return {
      id: u.id, cat: u.cat, slug: u.slug || u.id, verified: !!u.verified, beginner: !!u.beginner,
      checked: u.checked || '', mine: true, photo: u.photo || '',
      name: tri(u.name), tag: tri(u.tag || ''), about: tri(u.about || u.tag || ''),
      age: u.age || '—', cost: tri(u.cost || '—'), sched: tri(u.sched || '—'),
      addr: tri(u.addr || '—'), langs: tri(u.langs || '—'),
      tel: u.tel || '', ig: (u.ig || '').replace(/^@/, ''), tg: (u.tg || '').replace(/^@/, ''),
      lat: Number(u.lat), lng: Number(u.lng),
      kw: [u.name, u.kw, u.tag].join(' ')
    };
  }
  function allClubs() { return CLUBS.concat(state.mine.map(normalizeUser)); }
  function findClub(key) {
    return allClubs().filter(function (c) { return c.slug === key || c.id === key; })[0];
  }
  function filtered() {
    var L = state.lang, q = state.q.trim().toLowerCase();
    var list = allClubs();
    if (state.cat !== 'all') list = list.filter(function (c) { return c.cat === state.cat; });
    if (q) {
      var words = q.split(/\s+/);
      list = list.filter(function (c) {
        var hay = [c.name.ru, c.name.kz, c.name.en, c.kw,
          catLabel(c.cat, 'ru'), catLabel(c.cat, 'kz'), catLabel(c.cat, 'en'), c.tag[L]].join(' ').toLowerCase();
        return words.every(function (w) { return hay.indexOf(w) !== -1; });
      });
    }
    return list;
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
    return '<a class="row" href="#/club/' + esc(encodeURIComponent(c.slug)) + '">' +
      '<span class="row-head"><span class="row-name">' + esc(c.name[L]) + '</span><span class="cat-tag">' + esc(catLabel(c.cat, L)) + '</span></span>' +
      '<span class="row-tag">' + esc(c.tag[L]) + '</span>' +
      '<span class="meta"><span>' + esc(c.age) + '</span><span class="sep">·</span><span>' + esc(c.cost[L]) + '</span>' +
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
    return head + '<div class="list">' + list.map(function (c) { return rowHTML(c, L, T); }).join('') + '</div>';
  }

  function chipsHTML() {
    var L = state.lang, T = STR[L];
    return [{ id: 'all', label: T.all }].concat(CATS.map(function (c) { return { id: c.id, label: c[L] }; }))
      .map(function (c) {
        return '<button class="chip" data-action="cat" data-id="' + c.id + '" aria-pressed="' + (state.cat === c.id) + '">' + esc(c.label) + '</button>';
      }).join('');
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
      '<div class="search-row"><label class="search"><span class="sr-only">' + esc(T.search_label) + '</span>' +
      '<input id="q" type="search" autocomplete="off" value="' + esc(state.q) + '" placeholder="' + esc(T.search_ph) + '"></label>' +
      '<a class="map-btn" href="#/map" aria-label="' + esc(T.nav_map) + '"><span class="dot"></span><span class="lbl">' + esc(T.nav_map) + '</span></a></div>' +
      '<div class="chips" id="chips">' + chipsHTML() + '</div>' +
      '<div id="results">' + resultsHTML() + '</div>' +
      '</section>';
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
    var photo = safeUrl(c.photo);
    var tel = digits(c.tel);
    var geo = !isNaN(c.lat) && !isNaN(c.lng);
    var url = shareUrl(c);
    var ALL = allClubs();
    var similar = ALL.filter(function (s) { return s.cat === c.cat && s.id !== c.id; })
      .concat(ALL.filter(function (s) { return s.cat !== c.cat && s.beginner && s.id !== c.id; }))
      .slice(0, 2);

    var facts = [[T.f_sched, c.sched[L]], [T.f_addr, c.addr[L]], [T.f_cost, c.cost[L]], [T.f_langs, c.langs[L]]];

    return '<article class="screen tight">' +
      '<a class="back" href="#/">' + esc(T.back) + '</a>' +
      '<p class="eyebrow">' + esc(catLabel(c.cat, L)) + '</p>' +
      '<h1 class="title">' + esc(c.name[L]) + '</h1>' +
      '<div class="badges"><span class="badge">' + esc(c.age) + '</span>' +
      (c.beginner ? '<span class="badge beg">' + esc(T.beginner) + '</span>' : '') +
      (c.verified ? '<span class="badge ok">' + esc(T.verified) + '</span>' : '') + '</div>' +
      (photo
        ? '<img class="photo" src="' + esc(photo) + '" alt="' + esc(c.name[L]) + '" loading="lazy">'
        : '<div class="photo-ph"><span>' + esc(T.photo_ph) + '</span></div>') +
      '<p class="about-text">' + esc(c.about[L]) + '</p>' +
      '<dl class="facts">' + facts.map(function (f) { return '<div class="fact"><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<h2 class="sub">' + esc(T.contact_h) + '</h2>' +
      '<div class="contacts">' +
      (tel ? '<a class="wa" data-track="whatsapp" href="https://wa.me/' + tel + '" target="_blank" rel="noopener">WhatsApp<small>' + esc(T.write) + '</small></a>' : '') +
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
    var L = state.lang;
    return allClubs().map(function (c) {
      return '<a class="map-item" href="#/club/' + esc(encodeURIComponent(c.slug)) + '"><span class="dot' + (c.mine ? ' mine' : '') + '" style="width:8px;height:8px"></span>' +
        '<b>' + esc(c.name[L]) + '</b><span>' + esc(c.addr[L]) + '</span></a>';
    }).join('');
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
      '<div class="map-list">' + mapListHTML() + '</div>' +
      '</section>';
  }

  // ---------- creator panel (Russian only — it is for the site admin) ----------
  var FORM_FIELDS = [
    { key: 'name', label: 'Название клуба', ph: 'Робокод', wide: true },
    { key: 'tag', label: 'Одна строка для каталога', ph: 'Собираем роботов и учим их ездить по линии', wide: true },
    { key: 'age', label: 'Возраст', ph: '12–17' },
    { key: 'cost', label: 'Стоимость', ph: 'Бесплатно' },
    { key: 'sched', label: 'Когда', ph: 'Сб, 11:00–13:00' },
    { key: 'addr', label: 'Адрес', ph: 'ул. Кенесары, 40' },
    { key: 'langs', label: 'Языки', ph: 'Русский, казахский' },
    { key: 'tel', label: 'Телефон / WhatsApp', ph: '+7 701 234 56 78', type: 'tel' },
    { key: 'ig', label: 'Instagram без @', ph: 'robocode.ast' },
    { key: 'tg', label: 'Telegram без @', ph: 'robocode_ast' },
    { key: 'photo', label: 'Ссылка на фото', ph: 'https://…', type: 'url' },
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
  }

  function coordText() {
    var f = state.form;
    return (f.lat && f.lng) ? ('широта ' + f.lat + ' · долгота ' + f.lng) : 'координаты не выбраны';
  }

  function exportEntry(m) {
    return {
      id: m.id, cat: m.cat, slug: m.slug, verified: !!m.verified, beginner: !!m.beginner, checked: m.checked,
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

  function addView() {
    var f = state.form;
    var mine = state.mine;
    var saved = state.justSaved && findClub(state.justSaved);
    return '<section class="screen tight creator">' +
      '<a class="back" href="#/">← Каталог</a>' +
      '<p class="eyebrow" style="font-size:10.5px">панель создателя</p>' +
      '<h1 class="title">Добавить клуб</h1>' +
      '<p class="intro">Клуб заполняет Google Форму, ты переносишь ответы сюда. Клуб сразу появляется в каталоге и пином на карте — но только в этом браузере. Чтобы клуб увидели все, скопируй готовый код внизу в массив CLUBS файла js/data.js и опубликуй сайт.</p>' +
      (saved ? '<div class="saved" role="status"><span>Клуб добавлен — он уже в каталоге и на карте.</span>' +
        '<a class="a1" href="#/club/' + esc(encodeURIComponent(saved.slug)) + '">Страница клуба</a><a class="a2" href="#/map">На карте</a></div>' : '') +
      '<p class="label">Секция</p>' +
      '<div id="guess">' + guessHTML() + '</div>' +
      '<div class="chips" id="form-cats" style="margin:0 0 22px">' + formCatsHTML() + '</div>' +
      '<div class="fields">' + FORM_FIELDS.map(function (fd) {
        return '<label class="field' + (fd.wide ? ' wide' : '') + '"><span>' + esc(fd.label) + '</span>' +
          '<input data-field="' + fd.key + '" type="' + (fd.type || 'text') + '" value="' + esc(f[fd.key] || '') + '" placeholder="' + esc(fd.ph) + '"></label>';
      }).join('') + '</div>' +
      '<label class="field" style="margin-bottom:18px"><span>Описание</span>' +
      '<textarea data-field="about" rows="4" placeholder="Кто ходит, как проходит первое занятие, можно ли прийти одному">' + esc(f.about) + '</textarea></label>' +
      '<div class="toggles">' + [['beginner', 'Подходит новичкам'], ['verified', 'Я связался с клубом']].map(function (tg) {
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
        '<div class="block" style="margin-bottom:0"><div class="json-head"><p>Код для js/data.js</p><button data-action="copy-json">' + (state.copied ? 'Скопировано' : 'Скопировать') + '</button></div>' +
        '<textarea class="json" readonly rows="10">' + esc(jsonOut()) + '</textarea></div>' : '') +
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
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  // ---------- chrome (header/footer) ----------
  function renderChrome(r) {
    var T = STR[state.lang];
    document.documentElement.lang = LANGS.filter(function (l) { return l.id === state.lang; })[0].html;
    document.querySelector('[data-logo]').innerHTML = LOGO(28) + '<span>Youths<span class="city"> · ' + (state.lang === 'en' ? 'Astana' : 'Астана') + '</span></span>';
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
    if (changedPage) { state.pin = null; state.linkCopied = false; if (r.screen !== 'add') state.justSaved = null; }

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
      var r = route(), tc = r.screen === 'club' && findClub(r.id);
      if (tc) statsSend({ path: 'contact/' + tr.getAttribute('data-track') + '/' + tc.slug, title: tc.name.ru + ' — ' + tr.getAttribute('data-track'), event: true });
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
        document.getElementById('chips').innerHTML = chipsHTML();
        document.getElementById('results').innerHTML = resultsHTML();
        break;
      case 'reset':
        state.q = ''; state.cat = 'all';
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
      case 'copy-link':
        copyText(el.getAttribute('data-url')).then(function () {
          state.linkCopied = true;
          el.textContent = STR[state.lang].link_copied;
        });
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
        if (!window.confirm('Удалить этот клуб из каталога в этом браузере?')) return;
        state.mine = state.mine.filter(function (c) { return c.id !== id; });
        save(STORE_KEY, state.mine);
        state.justSaved = null;
        render({ keepScroll: true });
        break;
      case 'copy-json':
        copyText(jsonOut()).then(function () { state.copied = true; el.textContent = 'Скопировано'; });
        break;
    }
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'q') {
      state.q = t.value;
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
    var err = !f.name.trim() ? 'Впиши название клуба.'
      : !f.cat ? 'Выбери секцию.'
      : (!f.lat || !f.lng || isNaN(Number(f.lat)) || isNaN(Number(f.lng))) ? 'Поставь точку на карте — без координат клуб не появится на карте.'
      : (f.photo && !safeUrl(f.photo)) ? 'Ссылка на фото должна начинаться с https://'
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

  loadStats();
  render();
})();
