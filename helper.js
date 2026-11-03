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
      { id: 'move',   ic: 'sport',  cat: 'sport',  cats: { sport: 8 } },
      { id: 'make',   ic: 'eng',    cat: 'eng',    cats: { eng: 8, it: 7, stem: 5 } },
      { id: 'create', ic: 'art',    cat: 'art',    cats: { art: 8, media: 6 } },
      { id: 'speak',  ic: 'debate', cat: 'debate', cats: { debate: 8, lang: 7 } },
      { id: 'help',   ic: 'vol',    cat: 'vol',    cats: { vol: 8 } },
      { id: 'build',  ic: 'biz',    cat: 'biz',    cats: { biz: 8, it: 4, stem: 3 } },
      { id: 'people', ic: 'users',  cat: 'lang',   cats: { vol: 7, art: 5, debate: 5 } }
    ] },
    { id: 'age',   opts: [{ id: 'a12', age: 13, txt: '12' }, { id: 'a14', age: 15, txt: '14' }, { id: 'a16', age: 17, txt: '16' }, { id: 'a18', age: 19, txt: '18' }] },
    { id: 'exp',   opts: [{ id: 'new', ic: 'spark', hue: 150 }, { id: 'some', ic: 'check', hue: 212 }, { id: 'pro', ic: 'trophy', hue: 82 }] },
    { id: 'money', opts: [{ id: 'free', ic: 'tenge', hue: 148 }, { id: 'cheap', ic: 'tenge', hue: 82 }, { id: 'any', ic: 'tenge', hue: 262 }] },
    { id: 'who',   opts: [{ id: 'alone', ic: 'user', hue: 285 }, { id: 'friends', ic: 'users', hue: 352 }, { id: 'either', ic: 'dice', hue: 212 }] }
  ];
  var STEP_PAGE = 3; // сколько карточек показываем за раз
  // Ниже этого числа блока на главной нет: на пустом каталоге спрашивать
  // человека о вкусах не о чем. Порог низкий намеренно — пока сообществ
  // мало, помощник ценен не подбором, а ответом «в этом направлении пока
  // никого нет» и событием helper/none в статистике: по нему видно,
  // каких секций людям не хватает.
  var MIN_CLUBS = 2;
  // С этого веса направление считается «тем самым»: 8 — прямое попадание,
  // 4–7 — смежное. Ниже — просто другая секция.
  var ON_TOPIC = 4;

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
    return { club: c, s: s, w: w, km: km, why: why.slice(0, 3) };
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

  function ic(name, size) { return A().icon ? A().icon(name, size) : ''; }

  function closedHTML(T) {
    return wrapHTML('', '<div class="helper-call">' +
      '<span class="helper-dots" aria-hidden="true"><span></span><span></span></span>' +
      '<div class="helper-call-txt"><span class="tag">' + ic('spark', 14) + esc(T.h_tag) + '</span>' +
      '<h2>' + esc(T.h_h) + '</h2><p>' + esc(T.h_p) + '</p></div>' +
      '<button class="helper-go" data-h="start">' + esc(T.h_start) + ic('arrow', 18) + '</button>' +
      '</div>');
  }

  function stepHTML(T) {
    var q = QUESTIONS[st.step];
    return wrapHTML('open',
      '<div class="helper-top">' +
      '<span class="helper-step">' + esc(T.h_step) + ' ' + (st.step + 1) + ' / ' + QUESTIONS.length + '</span>' +
      '<button class="helper-x" data-h="close">' + esc(T.h_close) + '</button>' +
      '</div>' +
      '<div class="helper-bar"><i style="width:' + Math.round((st.step / QUESTIONS.length) * 100) + '%"></i></div>' +
      '<div class="helper-body" aria-live="polite">' +
      '<h3 class="helper-q" id="helper-q" tabindex="-1">' + esc(T['h_q_' + q.id]) + '</h3>' +
      '<div class="helper-opts">' + q.opts.map(function (o) {
        var hue = o.cat ? (A().hueOf ? A().hueOf(o.cat) : 262) : (o.hue || 262);
        var badge = o.txt ? '<b>' + esc(o.txt) + '</b>' : ic(o.ic, 22);
        return '<button class="helper-opt" data-h="pick" data-q="' + q.id + '" data-o="' + o.id + '" style="--h:' + hue + '">' +
          '<span class="ic">' + badge + '</span><span>' + esc(T['h_o_' + o.id]) + '</span></button>';
      }).join('') + '</div>' +
      (st.step > 0 ? '<button class="helper-back" data-h="back">' + esc(T.h_back) + '</button>' : '') +
      '</div>');
  }

  // Подбор показываем той же карточкой, что и каталог, а причины — внутри неё.
  // Раньше карточка вкладывалась в отдельную рамку, и у «Лучшего» слетали отступы.
  function hitHTML(h, L, T) {
    var why = (h.km != null ? '<span class="d">' + esc(A().kmText(h.km, L)) + '</span>' : '') +
      h.why.map(function (k) { return '<span>' + esc(T['h_why_' + k]) + '</span>'; }).join('');
    return A().rowHTML ? A().rowHTML(h.club, L, T, why ? '<span class="club-why">' + why + '</span>' : '') : '';
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

  function headHTML(T) {
    return '<div class="helper-top"><span class="helper-step">' + esc(T.h_res_step) + '</span>' +
      '<button class="helper-x" data-h="close">' + esc(T.h_close) + '</button></div>';
  }

  // Главное правило экрана результатов: сообщество из чужой секции никогда
  // не стоит под заголовком «вот что тебе подходит». Подросток спросил про
  // спорт — он должен услышать «спорта пока нет», а не получить волонтёрство
  // с уверенным видом. Иначе подбор перестаёт чего-либо стоить.
  function resultHTML(T) {
    var L = A().lang(), list = matches();
    var fit = list.filter(function (h) { return h.w >= ON_TOPIC; });
    var other = list.filter(function (h) { return h.w < ON_TOPIC; }).slice(0, 2);

    var foot = '<div class="helper-foot">' + geoHTML(T) + '%MORE%' +
      '<button class="helper-back" data-h="again">' + esc(T.h_again) + '</button></div>' + geoNoteHTML(T);

    // Ничего не подошло совсем — даже по возрасту и цене.
    if (!list.length) {
      return wrapHTML('open res', headHTML(T) +
        '<div class="helper-body"><h3 class="helper-q" id="helper-q" tabindex="-1">' + esc(T.h_none_h) + '</h3>' +
        '<p class="helper-note">' + esc(T.h_none_p) + '</p>' +
        '<div class="helper-foot"><button class="helper-back" data-h="again">' + esc(T.h_again) + '</button></div></div>');
    }

    // В выбранном направлении пусто: говорим это прямо и зовём добавить.
    if (!fit.length) {
      return wrapHTML('open res', headHTML(T) +
        '<div class="helper-body"><h3 class="helper-q" id="helper-q" tabindex="-1">' + esc(T.h_off_h) + '</h3>' +
        '<p class="helper-note">' + esc(T.h_off_p) + '</p>' +
        (other.length
          ? '<p class="helper-sub">' + esc(T.h_near_h) + '</p>' +
            '<div class="helper-hits grid">' + other.map(function (h) { return hitHTML(h, L, T); }).join('') + '</div>'
          : '') +
        foot.replace('%MORE%', '') + '</div>');
    }

    var shown = fit.slice(0, st.shown), rest = fit.length - shown.length;
    var more = rest > 0 ? '<button class="helper-more" data-h="more">' + esc(T.h_more) + ' (' + rest + ')</button>' : '';
    return wrapHTML('open res', headHTML(T) +
      '<div class="helper-body"><h3 class="helper-q" id="helper-q" tabindex="-1">' + esc(T.h_res_h) + '</h3>' +
      '<p class="helper-note">' + esc(T.h_res_p) + '</p>' +
      '<div class="helper-hits grid">' + shown.map(function (h) { return hitHTML(h, L, T); }).join('') + '</div>' +
      // Чужие секции показываем, только если своих нашлось совсем мало,
      // и обязательно под отдельной честной подписью.
      (fit.length < 3 && other.length
        ? '<p class="helper-sub">' + esc(T.h_near_h) + '</p>' +
          '<div class="helper-hits grid">' + other.map(function (h) { return hitHTML(h, L, T); }).join('') + '</div>'
        : '') +
      foot.replace('%MORE%', more) + '</div>');
  }

  // Вызывается из homeView() в app.js при каждой перерисовке главной.
  function blockHTML() {
    var T = str();
    if (!T || !A().allClubs) return '';
    if ((A().allClubs() || []).length < MIN_CLUBS) return '';
    if (st.view === 'result') return resultHTML(T);
    if (st.view === 'q') return stepHTML(T);
    return closedHTML(T);
  }

  function paint() {
    var el = document.getElementById('helper'), html = blockHTML();
    if (!el || !html) return;
    el.outerHTML = html;
    if (A().reveal) A().reveal(document.getElementById('helper'), true);
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
        // Отдельное событие, когда в выбранном направлении пусто: по нему
        // в статистике видно, чего в каталоге не хватает больше всего.
        var fit = matches().filter(function (h) { return h.w >= ON_TOPIC; }).length;
        track((fit ? 'done/' : 'none/') + st.ans.what,
          'Помощник — ' + (fit ? 'подбор' : 'нет направления') + ': ' + st.ans.what);
      } else {
        st.step += 1;
      }
      st.focus = true;
      paint();
    }
  });

  return { blockHTML: blockHTML };
})();
