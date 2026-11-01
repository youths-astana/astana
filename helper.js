// Помощник выбора: пять вопросов и подбор по каталогу.
// Никакого ИИ и никакой сети: весь расчёт идёт в браузере по communities.json.
// Файл подключается ДО app.js, но все данные берёт лениво из window.QOSYL_APP.
window.QOSYL_HELPER = (function () {
  'use strict';

  // Мост в app.js: каталог, разметка карточки, язык, статистика.
  function A() { return window.QOSYL_APP || {}; }
  function str() { var s = window.QOSYL_STR, l = A().lang && A().lang(); return s && l ? s[l] : null; }
  function esc(s) { return A().esc ? A().esc(s) : String(s == null ? '' : s); }

  // Вопросы. Для первого вопроса у каждого ответа свой вес по секциям:
  // ответ не отрезает каталог, а поднимает подходящее — поэтому пустого экрана не бывает.
  var QUESTIONS = [
    { id: 'what', opts: [
      { id: 'move',   cats: { sport: 8 } },
      { id: 'make',   cats: { eng: 8, it: 7, stem: 5 } },
      { id: 'create', cats: { art: 8, media: 6 } },
      { id: 'speak',  cats: { debate: 8, lang: 7 } },
      { id: 'help',   cats: { vol: 8 } },
      { id: 'build',  cats: { biz: 8, it: 4, stem: 3 } },
      { id: 'people', cats: { vol: 7, art: 5, debate: 5 } }
    ] },
    { id: 'age',   opts: [{ id: 'a12', age: 13 }, { id: 'a14', age: 15 }, { id: 'a16', age: 17 }, { id: 'a18', age: 19 }] },
    { id: 'exp',   opts: [{ id: 'new' }, { id: 'some' }, { id: 'pro' }] },
    { id: 'money', opts: [{ id: 'free' }, { id: 'cheap' }, { id: 'any' }] },
    { id: 'who',   opts: [{ id: 'alone' }, { id: 'friends' }, { id: 'either' }] }
  ];
  var STEP_PAGE = 3; // сколько карточек показываем за раз

  // Состояние живёт в модуле, а не в DOM: app.js перерисовывает главную целиком
  // (смена языка, догрузка каталога), и ответы при этом не теряются.
  // geo: null — не спрашивали, 'asking' — ждём браузер, 'on' — координаты есть,
  // 'denied' — отказ или ошибка. pos никуда не уходит: только в памяти вкладки.
  var st = { view: 'closed', step: 0, ans: {}, shown: STEP_PAGE, focus: false, geo: null, pos: null };

  function opt(qid, oid) {
    var q = QUESTIONS.filter(function (x) { return x.id === qid; })[0];
    if (!q) return null;
    return q.opts.filter(function (o) { return o.id === oid; })[0] || null;
  }

  // ---------- разбор полей каталога ----------
  // Возраст в карточках пишут по-разному: «14+», «14-20», «от 14», «12–18».
  function ageRange(s) {
    var t = String(s || '').replace(/[–—]/g, '-');
    var m = /(\d{1,2})\s*-\s*(\d{1,2})/.exec(t);
    if (m) return { min: +m[1], max: +m[2] };
    m = /(\d{1,2})\s*\+/.exec(t);
    if (m) return { min: +m[1], max: 99 };
    m = /(?:от|from|бастап)\s*(\d{1,2})/i.exec(t);
    if (m) return { min: +m[1], max: 99 };
    m = /(\d{1,2})/.exec(t);
    if (m) return { min: +m[1], max: 99 };
    return null;
  }
  // «Бесплатно» и «платно» разбирает app.js: одни правила на каталог,
  // фильтры и помощник, иначе они со временем разойдутся.
  function isFree(c) { return !!(A().isFree && A().isFree(c)); }
  function isPaid(c) { return !!(A().isPaid && A().isPaid(c)); }

  // ---------- подбор ----------
  // Платная пометка «Лучшее» намеренно НЕ влияет на подбор: в рекомендации
  // стоит то, что подходит человеку, а не то, за что заплатили.
  function score(c) {
    var a = st.ans, why = [], s = 0;

    var o = opt('what', a.what);
    var w = (o && o.cats[c.cat]) || 0;
    s += w;
    if (w >= 4) why.push('cat');

    var ao = opt('age', a.age), age = ao && ao.age, r = ageRange(c.age);
    if (age && r) {
      if (age >= r.min && age <= r.max) { s += 4; why.push('age'); }
      else if (age >= r.min - 1 && age <= r.max + 1) s += 1;
      else s -= 9;
    }

    if (a.exp === 'new') { if (c.beginner) { s += 4; why.push('beg'); } else s -= 1; }
    if (a.exp === 'pro' && !c.beginner) s += 1;

    if (a.money === 'free') { if (isFree(c)) { s += 4; why.push('free'); } else if (isPaid(c)) s -= 7; }
    if (a.money === 'cheap' && isFree(c)) s += 2;

    if (a.who === 'alone') {
      if (c.beginner) { s += 3; if (why.indexOf('beg') === -1) why.push('alone'); }
      if (c.verified) s += 1;
    }
    if (c.verified) s += 1;

    // Расстояние учитываем, только если подросток сам нажал «показать ближайшие».
    // У карточки без координат расстояние неизвестно — её не штрафуем.
    var km = null;
    if (st.geo === 'on' && st.pos) {
      var la = Number(c.lat), ln = Number(c.lng);
      if (!isNaN(la) && !isNaN(ln) && (la || ln)) {
        km = A().distKm(st.pos.lat, st.pos.lng, la, ln);
        s += km <= 2 ? 6 : km <= 5 ? 4 : km <= 10 ? 1 : km <= 20 ? -2 : -4;
      }
    }

    var order = ['beg', 'alone', 'free', 'cat', 'age'];
    why.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
    return { club: c, s: s, km: km, why: why.slice(0, 3) };
  }

  function matches() {
    var all = (A().allClubs && A().allClubs()) || [];
    return all.map(score)
      .filter(function (h) { return h.s > 0; })
      .sort(function (x, y) {
        if (y.s !== x.s) return y.s - x.s;
        if (!!y.club.beginner !== !!x.club.beginner) return y.club.beginner ? 1 : -1;
        return (y.club.verified ? 1 : 0) - (x.club.verified ? 1 : 0);
      });
  }

  // Координаты берём у браузера и держим только в памяти вкладки:
  // ни на сервер, ни в localStorage, ни в статистику они не попадают.
  function askGeo() {
    if (!navigator.geolocation) return;
    st.geo = 'asking';
    paint();
    navigator.geolocation.getCurrentPosition(function (p) {
      st.pos = { lat: p.coords.latitude, lng: p.coords.longitude };
      st.geo = 'on';
      st.shown = STEP_PAGE;
      track('geo/on');
      paint();
    }, function () {
      st.geo = 'denied';
      st.pos = null;
      track('geo/denied');
      paint();
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  // ---------- разметка ----------
  function wrapHTML(cls, inner) {
    return '<section class="helper' + (cls ? ' ' + cls : '') + '" id="helper">' + inner + '</section>';
  }

  function closedHTML(T) {
    return wrapHTML('', '<div class="helper-call">' +
      '<div class="helper-call-txt"><h2>' + esc(T.h_h) + '</h2><p>' + esc(T.h_p) + '</p></div>' +
      '<button class="helper-go" data-h="start">' + esc(T.h_start) + '</button>' +
      '</div>');
  }

  function stepHTML(T) {
    var q = QUESTIONS[st.step];
    return wrapHTML('open',
      '<div class="helper-top">' +
      '<span class="helper-step mono">' + esc(T.h_step) + ' ' + (st.step + 1) + ' / ' + QUESTIONS.length + '</span>' +
      '<button class="helper-x" data-h="close">' + esc(T.h_close) + '</button>' +
      '</div>' +
      '<div class="helper-bar"><i style="width:' + Math.round((st.step / QUESTIONS.length) * 100) + '%"></i></div>' +
      '<div class="helper-body" aria-live="polite">' +
      '<h3 class="helper-q" id="helper-q" tabindex="-1">' + esc(T['h_q_' + q.id]) + '</h3>' +
      '<div class="helper-opts">' + q.opts.map(function (o) {
        return '<button class="helper-opt" data-h="pick" data-q="' + q.id + '" data-o="' + o.id + '">' +
          esc(T['h_o_' + o.id]) + '</button>';
      }).join('') + '</div>' +
      (st.step > 0 ? '<button class="helper-back" data-h="back">' + esc(T.h_back) + '</button>' : '') +
      '</div>');
  }

  function hitHTML(h, L, T) {
    var row = A().rowHTML ? A().rowHTML(h.club, L, T) : '';
    var why = (h.km != null ? '<span class="d">' + esc(A().kmText(h.km, L)) + '</span>' : '') +
      h.why.map(function (k) { return '<span>' + esc(T['h_why_' + k]) + '</span>'; }).join('');
    return '<div class="helper-hit">' + row + (why ? '<p class="helper-why">' + why + '</p>' : '') + '</div>';
  }

  // Кнопка «рядом со мной» и честная строчка о том, куда уходят координаты.
  function geoHTML(T) {
    if (!navigator.geolocation) return '';
    if (st.geo === 'asking') return '<span class="helper-geo wait">' + esc(T.h_geo_wait) + '</span>';
    if (st.geo === 'on') return '<button class="helper-geo on" data-h="geo-off">' + esc(T.h_geo_off) + '</button>';
    return '<button class="helper-geo" data-h="geo">' + esc(T.h_geo) + '</button>';
  }
  function geoNoteHTML(T) {
    if (!navigator.geolocation) return '';
    var txt = st.geo === 'denied' ? T.h_geo_no : st.geo === 'on' ? T.h_geo_on : T.h_geo_note;
    return '<p class="helper-geo-note">' + esc(txt) + '</p>';
  }

  function resultHTML(T) {
    var L = A().lang(), list = matches();
    if (!list.length) {
      return wrapHTML('open res',
        '<div class="helper-top"><span class="helper-step mono">' + esc(T.h_res_step) + '</span>' +
        '<button class="helper-x" data-h="close">' + esc(T.h_close) + '</button></div>' +
        '<div class="helper-body"><h3 class="helper-q">' + esc(T.h_none_h) + '</h3>' +
        '<p class="helper-note">' + esc(T.h_none_p) + '</p>' +
        '<div class="helper-foot"><button class="helper-back" data-h="again">' + esc(T.h_again) + '</button></div></div>');
    }
    var shown = list.slice(0, st.shown), rest = list.length - shown.length;
    return wrapHTML('open res',
      '<div class="helper-top"><span class="helper-step mono">' + esc(T.h_res_step) + '</span>' +
      '<button class="helper-x" data-h="close">' + esc(T.h_close) + '</button></div>' +
      '<div class="helper-body"><h3 class="helper-q" id="helper-q" tabindex="-1">' + esc(T.h_res_h) + '</h3>' +
      '<p class="helper-note">' + esc(T.h_res_p) + '</p>' +
      '<div class="helper-hits">' + shown.map(function (h) { return hitHTML(h, L, T); }).join('') + '</div>' +
      '<div class="helper-foot">' +
      geoHTML(T) +
      (rest > 0 ? '<button class="helper-more" data-h="more">' + esc(T.h_more) + ' (' + rest + ')</button>' : '') +
      '<button class="helper-back" data-h="again">' + esc(T.h_again) + '</button>' +
      '</div>' + geoNoteHTML(T) + '</div>');
  }

  // Вызывается из homeView() в app.js при каждой перерисовке главной.
  function blockHTML() {
    var T = str();
    if (!T || !A().allClubs) return '';
    if (st.view === 'result') return resultHTML(T);
    if (st.view === 'q') return stepHTML(T);
    return closedHTML(T);
  }

  function paint() {
    var el = document.getElementById('helper');
    if (!el) return;
    el.outerHTML = blockHTML();
    if (st.focus) {
      var q = document.getElementById('helper-q');
      if (q) q.focus({ preventScroll: true });
      st.focus = false;
    }
  }

  function track(path, title) {
    if (A().track) A().track({ path: 'helper/' + path, title: title || ('Помощник — ' + path), event: true });
  }

  // ---------- события ----------
  // Свой префикс data-h, чтобы не пересекаться с data-action из app.js.
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-h]');
    if (!el) return;
    var act = el.getAttribute('data-h');

    if (act === 'start' || act === 'again') {
      st.view = 'q'; st.step = 0; st.ans = {}; st.shown = STEP_PAGE; st.focus = (act === 'again');
      if (st.geo === 'asking' || st.geo === 'denied') { st.geo = null; st.pos = null; }
      track(act === 'start' ? 'open' : 'again');
      paint();
      return;
    }
    if (act === 'close') { st.view = 'closed'; paint(); return; }
    if (act === 'back') {
      if (st.step > 0) { st.step -= 1; st.focus = true; } else st.view = 'closed';
      paint();
      return;
    }
    if (act === 'more') { st.shown += STEP_PAGE; paint(); return; }
    if (act === 'geo') { askGeo(); return; }
    if (act === 'geo-off') { st.geo = null; st.pos = null; st.shown = STEP_PAGE; paint(); return; }
    if (act === 'pick') {
      var q = el.getAttribute('data-q'), o = el.getAttribute('data-o');
      if (!opt(q, o)) return;
      st.ans[q] = o;
      if (st.step + 1 >= QUESTIONS.length) {
        st.view = 'result'; st.shown = STEP_PAGE;
        track('done/' + st.ans.what, 'Помощник — подбор: ' + st.ans.what);
      } else {
        st.step += 1;
      }
      st.focus = true;
      paint();
    }
  });

  return { blockHTML: blockHTML };
})();
