/* Qosyl — движение.
   Эффекты из библиотеки React Bits, переписанные на обычный JavaScript:
   у сайта нет сборки и React, поэтому компоненты перенесены по смыслу.
   · ring  — кольцо направлений на главной (CircularCarousel, вид «cylinder»);
   · fold  — буквы крупных заголовков раскладываются, как бумага (FoldText);
   · grain — «живой» градиент под выдачей каталога (Grainient), его можно
             размешать мышкой или пальцем;
   Всплывающие пузыри фильтров (BubbleMenu) и плавное появление блоков
   (AnimatedContent) сделаны на CSS-анимациях — их включает app.js.
   Кто попросил браузер «уменьшить движение», получает всё сразу и неподвижно. */
window.QOSYL_FX = (function () {
  'use strict';

  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var TO_RAD = Math.PI / 180;
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function wrapDeg(d) { return ((((d + 180) % 360) + 360) % 360) - 180; }
  function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }
  function rotX(p, d) { var r = d * TO_RAD, c = Math.cos(r), s = Math.sin(r); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
  function rotY(p, d) { var r = d * TO_RAD, c = Math.cos(r), s = Math.sin(r); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }

  // Всё, что запущено на текущей странице, — чтобы остановить перед перерисовкой.
  var running = [];
  function reset() {
    running.splice(0).forEach(function (stop) { stop(); });
  }

  // ---------- кольцо направлений ----------
  // Плитки стоят по кругу и медленно вращаются. Кольцо можно раскрутить
  // пальцем или мышкой, под курсором оно останавливается, а при первом показе
  // плитки по очереди мягко выезжают снизу.
  var SPRING = 118, SETTLE_SPEED = 9, DRAG_MIN = 5, INTRO_MS = 1400;
  var ringAngle = 0; // угол помним между перерисовками, чтобы кольцо не прыгало

  function ring(root, opts) {
    var stage = root.querySelector('.ring-stage');
    var cam = root.querySelector('.ring-cam');
    var spin = root.querySelector('.ring-spin');
    var cards = Array.prototype.slice.call(root.querySelectorAll('.ring-card'));
    var n = cards.length;
    if (!stage || !cam || !spin || n < 3) return;
    var o = { tilt: -14, perspective: 1000, speed: 14, depthFade: 0.55, parallax: REDUCED ? 0 : 0.3, momentum: 0.6, stretch: REDUCED ? 0 : 0.5 };
    var step = 360 / n;
    var W = 0, R = 0;
    var st = {
      angle: ringAngle, vel: 0, target: null, dir: -1, press: null, drag: false, hover: false,
      pointer: { inside: false, x: 0, y: 0 }, yaw: 0, pitch: 0,
      intro: opts && opts.intro && !REDUCED ? 0 : -1, introAt: 0,
      hold: 0, fit: 1, drop: 0, last: 0, suppress: false, wheelTimer: 0
    };
    var raf = 0, visible = true;

    function nearest(a) { return Math.round(a / step) * step; }

    function size() {
      W = Math.round(clamp(root.clientWidth * 0.26, 78, 124));
      R = (W * 1.22) / (2 * Math.sin(Math.PI / n));
      root.style.setProperty('--rw', W + 'px');
    }

    // Подгоняем масштаб так, чтобы всё кольцо помещалось в рамку.
    function measure() {
      var rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var P = o.perspective, h = W / 2;
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      var corners = [[-h, -h], [h, -h], [-h, h], [h, h]];
      for (var a = -180; a <= 180; a += 7.5) {
        for (var c = 0; c < 4; c++) {
          var p = rotX(rotY([corners[c][0], corners[c][1], R], a), o.tilt);
          p[2] -= R;
          if (p[2] >= P * 0.95) continue;
          var k = P / (P - p[2]);
          minX = Math.min(minX, p[0] * k); maxX = Math.max(maxX, p[0] * k);
          minY = Math.min(minY, p[1] * k); maxY = Math.max(maxY, p[1] * k);
        }
      }
      var fit = Math.min(1, (rect.width * 0.96) / Math.max(maxX - minX, 1), (rect.height * 0.94) / Math.max(maxY - minY, 1));
      st.fit = fit;
      st.drop = (rect.height / fit) * 0.55 + W;
      stage.style.perspective = P + 'px';
      stage.style.transform = 'translate3d(0,' + (-((minY + maxY) / 2) * fit).toFixed(1) + 'px,0) scale(' + fit.toFixed(4) + ')';
    }

    function advance(dt, now) {
      if (st.intro === 0) { st.intro = 1; st.introAt = now; }
      if (st.intro === 1 && now - st.introAt >= INTRO_MS) st.intro = -1;
      var paused = st.hover || st.drag || now < st.hold;
      var cruise = !REDUCED && !paused && st.intro !== 1 ? o.speed * st.dir : 0;
      var busy = st.intro === 1 || st.drag;
      if (st.drag || st.intro === 1) {
        if (!st.drag) st.vel = 0;
      } else if (st.target !== null) {
        var left = dt, damp = 2 * Math.sqrt(SPRING);
        while (left > 0) {
          var hs = Math.min(left, 1 / 240);
          st.vel += (SPRING * (st.target - st.angle) - damp * st.vel) * hs;
          st.angle += st.vel * hs;
          left -= hs;
        }
        if (Math.abs(st.target - st.angle) < 0.004 && Math.abs(st.vel) < 0.03) { st.angle = st.target; st.vel = 0; st.target = null; }
        busy = true;
      } else {
        var tau = 0.18 + o.momentum * 1.5;
        st.vel += (cruise - st.vel) * (1 - Math.exp(-dt / tau));
        st.angle += st.vel * dt;
        if (cruise === 0 && Math.abs(st.vel) < SETTLE_SPEED) st.target = nearest(st.angle);
        busy = busy || cruise !== 0 || Math.abs(st.vel) > 0.01 || st.target !== null;
      }
      if (now < st.hold) busy = true;
      var ease = 1 - Math.exp(-dt / 0.35);
      var aimYaw = st.pointer.inside ? st.pointer.x * o.parallax * 9 : 0;
      var aimPitch = st.pointer.inside ? -st.pointer.y * o.parallax * 6 : 0;
      st.yaw += (aimYaw - st.yaw) * ease;
      st.pitch += (aimPitch - st.pitch) * ease;
      if (Math.abs(aimYaw - st.yaw) > 0.01 || Math.abs(aimPitch - st.pitch) > 0.01) busy = true;
      return busy;
    }

    function paint(now) {
      var elapsed = st.intro === 1 ? now - st.introAt : 0;
      var swell = 1 + o.stretch * 0.12 * Math.min(1, Math.abs(st.vel) / 420);
      var r = R * swell;
      cam.style.transform = 'translate3d(0,0,' + (-r).toFixed(1) + 'px) rotateX(' + (o.tilt + st.pitch).toFixed(2) + 'deg) rotateY(' + st.yaw.toFixed(2) + 'deg)';
      spin.style.transform = 'rotateY(' + st.angle.toFixed(2) + 'deg)';
      for (var i = 0; i < n; i++) {
        var base = i * step, world = wrapDeg(base + st.angle);
        var t = 'rotateY(' + base + 'deg) translateZ(' + r.toFixed(1) + 'px)';
        var lift = 0;
        if (st.intro === 0) lift = st.drop;
        else if (st.intro === 1) {
          var delay = (Math.abs(world) / 180) * 480;
          lift = (1 - easeOutQuint(clamp((elapsed - delay) / 900, 0, 1))) * st.drop;
        }
        if (lift > 0.5) t += ' translateY(' + lift.toFixed(1) + 'px)';
        cards[i].style.transform = t;
        var fade = o.depthFade * Math.pow((1 - Math.cos(world * TO_RAD)) / 2, 1.25);
        cards[i].style.setProperty('--fade', fade.toFixed(3));
      }
      ringAngle = st.angle;
    }

    function frame(now) {
      raf = 0;
      var dt = st.last ? Math.min((now - st.last) / 1000, 0.05) : 1 / 60;
      st.last = now;
      var busy = advance(dt, now);
      paint(now);
      if (busy && visible && !document.hidden) raf = requestAnimationFrame(frame);
      else st.last = 0;
    }
    function wake() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }

    function onVisibility() {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; st.last = 0; } else wake();
    }

    function locate(e) {
      var rect = root.getBoundingClientRect();
      st.pointer.x = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      st.pointer.y = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    }
    function onDown(e) {
      st.suppress = false;
      if (e.button !== 0) return;
      st.press = { id: e.pointerId, x: e.clientX, y: e.clientY, angle: st.angle, moved: false, origin: 0, samples: [{ t: performance.now(), a: st.angle }] };
    }
    function onMove(e) {
      if (e.pointerType === 'mouse') { st.pointer.inside = true; locate(e); }
      var pr = st.press;
      if (!pr || pr.id !== e.pointerId) { wake(); return; }
      var dx = e.clientX - pr.x, dy = e.clientY - pr.y;
      if (!pr.moved) {
        if (Math.abs(dx) < DRAG_MIN) return;
        // Палец ведёт вертикально — это прокрутка страницы, а не кольца.
        if (Math.abs(dy) > Math.abs(dx) * 1.2 && e.pointerType !== 'mouse') { st.press = null; return; }
        pr.moved = true; pr.origin = dx;
        st.drag = true; st.target = null; st.vel = 0;
        root.classList.add('dragging');
        try { root.setPointerCapture(e.pointerId); } catch (err) { /* указатель уже отпущен */ }
      }
      var perPx = 180 / (Math.PI * R * st.fit);
      st.angle = pr.angle + (dx - pr.origin) * perPx;
      var now = performance.now();
      pr.samples.push({ t: now, a: st.angle });
      while (pr.samples.length > 2 && now - pr.samples[0].t > 110) pr.samples.shift();
      wake();
    }
    function onUp(e) {
      var pr = st.press;
      if (!pr || pr.id !== e.pointerId) return;
      st.press = null;
      if (!pr.moved) return;
      st.drag = false;
      root.classList.remove('dragging');
      st.suppress = true;
      var a = pr.samples[0], b = pr.samples[pr.samples.length - 1], span = (b.t - a.t) / 1000;
      var v = span > 0.008 ? clamp((b.a - a.a) / span, -1400, 1400) : 0;
      st.vel = v;
      if (Math.abs(v) > 60) st.dir = v > 0 ? 1 : -1;
      if (REDUCED || (st.hover && e.pointerType === 'mouse')) {
        st.target = Math.round((st.angle + v * (0.18 + o.momentum * 1.5) * 0.55) / step) * step;
      }
      wake();
    }
    function onEnter(e) { if (e.pointerType === 'mouse') { st.hover = true; wake(); } }
    function onLeave(e) {
      if (e.pointerType === 'mouse') { st.hover = false; st.pointer.inside = false; }
      wake();
    }
    // После броска кольца не открываем плитку, на которой отпустили палец.
    function onClick(e) {
      if (st.suppress) { st.suppress = false; e.stopPropagation(); e.preventDefault(); }
    }
    function onWheel(e) {
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0;
      if (!d) return;
      e.preventDefault();
      var perPx = 180 / (Math.PI * R * st.fit);
      st.target = null;
      st.angle -= d * perPx;
      st.vel = -d * perPx * 30;
      st.hold = performance.now() + 1600;
      clearTimeout(st.wheelTimer);
      st.wheelTimer = setTimeout(function () { st.target = nearest(st.angle + st.vel * 0.12); wake(); }, 140);
      wake();
    }

    size();
    measure();
    paint(performance.now());

    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { size(); measure(); paint(performance.now()); wake(); }) : null;
    if (ro) ro.observe(root);
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible) wake(); else { cancelAnimationFrame(raf); raf = 0; st.last = 0; }
    }) : null;
    if (io) io.observe(root);
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('click', onClick, true);
    root.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('visibilitychange', onVisibility);
    // Ждём шрифт и раскладку, прежде чем пускать плитки снизу.
    setTimeout(wake, 60);

    running.push(function () {
      cancelAnimationFrame(raf); raf = 0;
      clearTimeout(st.wheelTimer);
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    });
  }

  // ---------- складывающиеся буквы ----------
  // Каждая буква лежит «сложенной» вверх и раскрывается на петле по очереди.
  // Пока буквы складываются, на сгибе видна тень. После раскрытия буквы рядом
  // с курсором слегка приподнимаются — это заметно только мышкой.
  var FOLD = { angle: 92, ms: 650, stagger: 45, radius: 140 };
  var folds = [];

  function fold(el, opts) {
    if (!el || el.getAttribute('data-fold')) return;
    opts = opts || {};
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;
    el.setAttribute('data-fold', '1');
    var vis = document.createElement('span');
    vis.className = 'fx';
    vis.setAttribute('aria-hidden', 'true');
    while (el.firstChild) vis.appendChild(el.firstChild);
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    el.appendChild(sr);
    el.appendChild(vis);

    var pieces = [], grads = [], nodes = [];
    var walker = document.createTreeWalker(vis, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) nodes.push(walker.currentNode);
    // Градиентный текст (как «Каталог» или «после уроков») рисуется фоном.
    // Если разрезать слово на буквы, градиент начнётся заново в каждой —
    // поэтому каждой букве даём кусок общего фона во всю ширину слова.
    nodes.forEach(function (node) {
      // Текст прямо в обёртке берёт оформление у самого заголовка.
      var parent = node.parentNode === vis ? el : node.parentNode;
      var cs = window.getComputedStyle(parent);
      var clip = cs.webkitBackgroundClip || cs.backgroundClip || '';
      var bg = cs.backgroundImage !== 'none' && clip.indexOf('text') !== -1 ? cs.backgroundImage : '';
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span');
        w.className = 'fx-w';
        Array.from(part).forEach(function (ch) {
          var s = document.createElement('span');
          s.className = 'fx-s';
          var p = document.createElement('span');
          p.className = 'fx-p';
          p.textContent = ch;
          p.style.setProperty('--i', pieces.length);
          s.appendChild(p);
          w.appendChild(s);
          pieces.push(p);
          if (bg) grads.push({ p: p, s: s, box: parent, bg: bg });
        });
        frag.appendChild(w);
      });
      node.parentNode.replaceChild(frag, node);
      if (bg) parent.style.backgroundImage = 'none';
    });

    var inst = { el: el, vis: vis, pieces: pieces, grads: grads, done: false, io: null, timer: 0 };
    paintGrad(inst);
    folds.push(inst);

    function finish() { vis.classList.add('fx-done'); inst.done = true; }
    function play() {
      vis.classList.add('fx-in');
      inst.timer = setTimeout(finish, FOLD.ms + pieces.length * FOLD.stagger + 80);
    }
    if (opts.instant || REDUCED) {
      vis.classList.add('fx-in');
      finish();
    } else if (opts.trigger === 'scroll' && 'IntersectionObserver' in window) {
      inst.io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        inst.io.disconnect(); inst.io = null;
        play();
      }, { rootMargin: '0px 0px -18% 0px' });
      inst.io.observe(el);
    } else {
      requestAnimationFrame(function () { requestAnimationFrame(play); });
    }
    running.push(function () {
      if (inst.io) inst.io.disconnect();
      clearTimeout(inst.timer);
      folds.splice(folds.indexOf(inst), 1);
    });
  }

  function paintGrad(inst) {
    if (!inst.grads.length) return;
    inst.grads.forEach(function (g) {
      var box = g.box.getBoundingClientRect(), s = g.s.getBoundingClientRect();
      var pad = parseFloat(window.getComputedStyle(g.p).paddingTop) || 0;
      g.p.style.backgroundImage = g.bg;
      g.p.style.backgroundSize = box.width.toFixed(1) + 'px ' + box.height.toFixed(1) + 'px';
      g.p.style.backgroundPosition = (box.left - s.left).toFixed(1) + 'px ' + (box.top - s.top + pad).toFixed(1) + 'px';
    });
  }
  var gradTimer = 0;
  function repaintGrads() {
    clearTimeout(gradTimer);
    gradTimer = setTimeout(function () { folds.forEach(paintGrad); }, 120);
  }
  window.addEventListener('resize', repaintGrads);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(repaintGrads);

  var mouse = null, refoldRAF = 0;
  function refold() {
    refoldRAF = 0;
    folds.forEach(function (inst) {
      if (!inst.done) return;
      var box = inst.vis.getBoundingClientRect(), rad = FOLD.radius;
      var near = mouse && mouse.x > box.left - rad && mouse.x < box.right + rad && mouse.y > box.top - rad && mouse.y < box.bottom + rad;
      inst.pieces.forEach(function (p) {
        var v = 0;
        if (near) {
          var r = p.parentNode.getBoundingClientRect();
          var d = Math.sqrt(Math.pow(r.left + r.width / 2 - mouse.x, 2) + Math.pow(r.top + r.height / 2 - mouse.y, 2)) / rad;
          if (d < 1) v = 1 - d * d * (3 - 2 * d);
        }
        if (v !== p._r) { p._r = v; p.style.setProperty('--r', v.toFixed(3)); }
      });
    });
  }
  if (!REDUCED) {
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      mouse = { x: e.clientX, y: e.clientY };
      if (!refoldRAF && folds.length) refoldRAF = requestAnimationFrame(refold);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () {
      mouse = null;
      if (!refoldRAF && folds.length) refoldRAF = requestAnimationFrame(refold);
    });
  }

  // ---------- живой градиент ----------
  // Перенос Grainient: шейдер WebGL2 рисует плавный градиент, курсор тянет
  // краску за собой, щелчок закручивает её в вихрь. Холст размером с экран
  // и рисует кадры, только пока что-то движется, — батарею не ест.
  var MAX_COLORS = 8, MAX_STIRS = 24, MAX_TWIRLS = 4;
  var STIR_LIFE = 1.3, STIR_STEP = 0.06, TWIRL_LIFE = 2.6, INTRO_SECONDS = 1.6;

  var VERTEX = '#version 300 es\n' +
    'out vec2 vUv;\n' +
    'void main() {\n' +
    '  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));\n' +
    '  vUv = p;\n' +
    '  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);\n' +
    '}';

  var FIELD = '#version 300 es\n' +
    'precision highp float;\nprecision highp int;\n' +
    'uniform float uAspect;\nuniform float uTime;\nuniform vec3 uRamp[8];\nuniform int uCount;\nuniform int uType;\n' +
    'uniform vec2 uDir;\nuniform float uExtent;\nuniform float uBands;\nuniform float uSoftness;\nuniform float uFlow;\n' +
    'uniform float uScale;\nuniform float uSilk;\nuniform vec4 uStir[24];\nuniform float uStirWeight[24];\nuniform vec4 uTwirl[4];\n' +
    'uniform vec2 uSeed;\nuniform float uContrast;\nuniform float uSaturation;\nuniform float uSettle;\nuniform float uReveal;\n' +
    'in vec2 vUv;\nout vec4 outColor;\n' +
    'vec2 hash2(vec2 p) {\n' +
    '  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));\n' +
    '  q += dot(q, q.yzx + 33.33);\n' +
    '  return fract((q.xx + q.yz) * q.zy) * 2.0 - 1.0;\n' +
    '}\n' +
    'float noise(vec2 p) {\n' +
    '  vec2 i = floor(p);\n  vec2 f = fract(p);\n' +
    '  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);\n' +
    '  float a = dot(hash2(i), f);\n' +
    '  float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));\n' +
    '  float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));\n' +
    '  float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));\n' +
    '  return 0.5 + 0.5 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);\n' +
    '}\n' +
    'vec2 drift(vec2 p, float t) {\n' +
    '  vec2 w1 = vec2(noise(p * 0.85 + vec2(t * 0.11, t * 0.07)), noise(p * 0.85 + vec2(4.1, 1.7) - vec2(t * 0.08, t * 0.12)));\n' +
    '  vec2 w2 = vec2(noise(p * 1.55 + w1 * 1.8 + vec2(1.3, 7.1) + t * 0.05), noise(p * 1.55 + w1 * 1.8 + vec2(6.4, 2.2) - t * 0.06));\n' +
    '  return (w1 - 0.5) * 1.1 + (w2 - 0.5) * 0.55;\n' +
    '}\n' +
    'vec2 warp(vec2 p) {\n' +
    '  vec2 q = p / uScale;\n' +
    '  if (uType == 1) {\n' +
    '    float turn = uTime * 0.35;\n' +
    '    q = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * q;\n' +
    '  } else {\n' +
    '    q += vec2(-uDir.y, uDir.x) * uTime * 0.45;\n' +
    '  }\n' +
    '  return p + drift(q + uSeed, uTime) * uFlow * uScale * uSettle;\n' +
    '}\n' +
    'float coord(vec2 p) {\n' +
    '  vec2 w = warp(p);\n' +
    '  return uType == 1 ? 1.0 - length(w) * 1.1 : dot(w, uDir) / uExtent + 0.5;\n' +
    '}\n' +
    'vec3 labToRgb(vec3 lab) {\n' +
    '  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;\n' +
    '  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;\n' +
    '  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;\n' +
    '  l = l * l * l;\n  m = m * m * m;\n  s = s * s * s;\n' +
    '  return vec3(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);\n' +
    '}\n' +
    'vec3 encode(vec3 c) {\n' +
    '  c = clamp(c, 0.0, 1.0);\n' +
    '  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));\n' +
    '}\n' +
    'void main() {\n' +
    '  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);\n' +
    '  for (int i = 0; i < 24; i++) {\n' +
    '    float w = uStirWeight[i];\n' +
    '    if (w <= 0.0) continue;\n' +
    '    vec2 d = p - uStir[i].xy;\n' +
    '    p -= uStir[i].zw * w * exp(-dot(d, d) / 0.045);\n' +
    '  }\n' +
    '  for (int i = 0; i < 4; i++) {\n' +
    '    float angle = uTwirl[i].z;\n' +
    '    if (angle == 0.0) continue;\n' +
    '    vec2 d = p - uTwirl[i].xy;\n' +
    '    float a = angle * exp(-dot(d, d) / (uTwirl[i].w * uTwirl[i].w));\n' +
    '    float c = cos(a);\n    float s = sin(a);\n' +
    '    p = uTwirl[i].xy + mat2(c, -s, s, c) * d;\n' +
    '  }\n' +
    '  float raw = coord(p);\n' +
    '  float s = raw;\n' +
    '  if (uBands > 1.0) {\n' +
    '    s *= uBands;\n    float cycle = floor(s);\n    s = fract(s);\n' +
    '    if (mod(cycle, 2.0) > 0.5) s = 1.0 - s;\n' +
    '  }\n' +
    '  s = clamp(s, 0.0, 1.0);\n' +
    '  float scaled = s * float(uCount - 1);\n' +
    '  int index = int(min(floor(scaled), float(uCount - 2)));\n' +
    '  float f = scaled - float(index);\n' +
    '  float edge = max(uSoftness * 0.5, fwidth(scaled) * 0.75);\n' +
    '  float shaped = smoothstep(0.5 - edge, 0.5 + edge, f);\n' +
    '  vec3 from = uRamp[0];\n  vec3 to = uRamp[1];\n' +
    '  for (int i = 0; i < 7; i++) {\n' +
    '    if (i == index) { from = uRamp[i]; to = uRamp[i + 1]; }\n' +
    '  }\n' +
    '  vec3 lab = mix(from, to, shaped);\n' +
    '  if (uSilk > 0.0) {\n' +
    '    vec2 grad = vec2(coord(p + vec2(0.004, 0.0)) - raw, coord(p + vec2(0.0, 0.004)) - raw) / 0.004;\n' +
    '    vec2 slope = grad * sin(3.14159265 * clamp(raw, 0.0, 1.0) * uBands) * uSilk * 4.0;\n' +
    '    vec3 normal = normalize(vec3(-slope, 1.0));\n' +
    '    vec3 light = normalize(vec3(-uDir.y, uDir.x, 1.2));\n' +
    '    float diffuse = dot(normal, light) - light.z;\n' +
    '    lab = uRamp[0] + (lab - uRamp[0]) * (1.0 + (diffuse * 0.35 + max(diffuse, 0.0) * diffuse * 0.6) * uSilk);\n' +
    '  }\n' +
    '  lab = mix(uRamp[0], lab, smoothstep(0.0, 1.0, uReveal * 1.5 - length(vUv - 0.5) * 0.6));\n' +
    '  lab.x = (lab.x - 0.55) * uContrast + 0.55;\n' +
    '  lab.yz *= uSaturation;\n' +
    '  outColor = vec4(encode(labToRgb(lab)), 1.0);\n' +
    '}';

  var COMPOSITE = '#version 300 es\n' +
    'precision highp float;\n' +
    'uniform sampler2D uField;\nuniform float uGrain;\nuniform float uGrainSize;\nuniform float uFrame;\n' +
    'in vec2 vUv;\nout vec4 outColor;\n' +
    'float hash(vec2 p) {\n' +
    '  vec3 q = fract(vec3(p.xyx) * 0.1031);\n' +
    '  q += dot(q, q.yzx + 33.33);\n' +
    '  return fract((q.x + q.y) * q.z);\n' +
    '}\n' +
    'float clump(vec2 p) {\n' +
    '  vec2 i = floor(p);\n  vec2 f = fract(p);\n  vec2 u = f * f * (3.0 - 2.0 * f);\n' +
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);\n' +
    '}\n' +
    'void main() {\n' +
    '  vec3 color = texture(uField, vUv).rgb;\n' +
    '  vec2 pixel = gl_FragCoord.xy + uFrame * vec2(17.0, 59.0);\n' +
    '  float fine = hash(pixel) + hash(pixel + 7.13) - 1.0;\n' +
    '  float coarse = (clump(pixel / max(uGrainSize, 1.0)) - 0.5) * 2.0;\n' +
    '  float grain = mix(fine, coarse, clamp(uGrainSize - 1.0, 0.0, 1.0) * 0.8);\n' +
    '  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));\n' +
    '  color += grain * uGrain * (0.45 + 2.2 * luma * (1.0 - luma));\n' +
    '  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);\n' +
    '}';

  function toLinear(v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function toLab(rgb) {
    var lr = toLinear(rgb[0]), lg = toLinear(rgb[1]), lb = toLinear(rgb[2]);
    var l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    var m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    var s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    ];
  }
  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh;
    gl.deleteShader(sh);
    return null;
  }
  function link(gl, fragSrc) {
    var vs = compile(gl, gl.VERTEX_SHADER, VERTEX), fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc), prog = gl.createProgram();
    if (!vs || !fs || !prog) return null;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl.deleteProgram(prog); return null; }
    var u = {}, count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < count; i++) {
      var info = gl.getActiveUniform(prog, i);
      if (!info) continue;
      var name = info.name.replace(/\[0\]$/, '');
      u[name] = gl.getUniformLocation(prog, name);
    }
    return { program: prog, u: u };
  }
  function parseColor(hex) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex) || [0, '00', '00', '00'];
    return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
  }

  function grain(container, opts) {
    var s = {
      colors: (opts.colors || ['#120f17', '#f97316']).slice(0, MAX_COLORS),
      type: opts.type === 'radial' ? 1 : 0,
      angle: opts.angle != null ? opts.angle : 55,
      bands: clamp(opts.bands || 1, 1, 8),
      speed: Math.max(0, opts.speed != null ? opts.speed : 1),
      flow: clamp(opts.flow != null ? opts.flow : 0.8, 0, 3),
      scale: clamp(opts.scale || 1, 0.25, 3),
      softness: clamp(opts.softness != null ? opts.softness : 1, 0, 1),
      silk: clamp(opts.silk != null ? opts.silk : 0.35, 0, 1),
      grainAmount: clamp(opts.grainAmount != null ? opts.grainAmount : 0.08, 0, 0.5),
      grainSize: clamp(opts.grainSize || 1.2, 0.5, 4),
      grainAnimated: opts.grainAnimated !== false,
      contrast: clamp(opts.contrast || 1, 0.2, 2),
      saturation: clamp(opts.saturation != null ? opts.saturation : 1, 0, 2),
      variation: Math.max(0, opts.variation || 0),
      interactive: opts.interactive !== false,
      stir: clamp(opts.stir != null ? opts.stir : 1, 0, 2),
      clickSwirl: opts.clickSwirl !== false,
      intro: opts.intro !== false
    };
    if (s.colors.length < 2) s.colors = [s.colors[0], s.colors[0]];
    var canvas = document.createElement('canvas');
    canvas.className = 'grain-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    var gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
    // Нет WebGL2 — остаётся обычный CSS-градиент того же цвета под холстом.
    if (!gl) return;
    var field = link(gl, FIELD), comp = link(gl, COMPOSITE);
    if (!field || !comp) return;
    container.appendChild(canvas);
    var fu = field.u, cu = comp.u;
    var vao = gl.createVertexArray();
    var target = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, target);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var fbo = gl.createFramebuffer();
    var fieldSize = { w: 0, h: 0 };
    var view = { w: 1, h: 1, ratio: 1 };
    var ramp = new Float32Array(MAX_COLORS * 3);
    var stirs = new Float32Array(MAX_STIRS * 4);
    var stirWeights = new Float32Array(MAX_STIRS);
    var twirls = new Float32Array(MAX_TWIRLS * 4);
    var trail = [], spins = [];
    var pointer = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5, vx: 0, inside: false, fresh: true };
    var time = 0, introClock = s.intro && !REDUCED ? 0 : 1, frameSeed = 0, grainClock = 0, raf = 0, last = 0, visible = true;

    // Режим lightMode из оригинала не переносили: светлую палитру задаём цветами напрямую.
    s.colors.map(function (c) { return toLab(parseColor(c)); }).forEach(function (lab, i) { ramp.set(lab, i * 3); });

    function draw() {
      var aspect = view.w / view.h, rad = (s.angle * Math.PI) / 180;
      gl.bindVertexArray(vao);
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, fieldSize.w, fieldSize.h);
      gl.useProgram(field.program);
      gl.uniform1f(fu.uAspect, aspect);
      gl.uniform1f(fu.uTime, time);
      gl.uniform3fv(fu.uRamp, ramp);
      gl.uniform1i(fu.uCount, s.colors.length);
      gl.uniform1i(fu.uType, s.type);
      gl.uniform2f(fu.uDir, Math.sin(rad), Math.cos(rad));
      gl.uniform1f(fu.uExtent, aspect * Math.abs(Math.sin(rad)) + Math.abs(Math.cos(rad)));
      gl.uniform1f(fu.uBands, s.bands);
      gl.uniform1f(fu.uSoftness, s.softness);
      gl.uniform1f(fu.uFlow, s.flow);
      gl.uniform1f(fu.uScale, s.scale);
      gl.uniform1f(fu.uSilk, s.silk);
      gl.uniform4fv(fu.uStir, stirs);
      gl.uniform1fv(fu.uStirWeight, stirWeights);
      gl.uniform4fv(fu.uTwirl, twirls);
      gl.uniform2f(fu.uSeed, s.variation * 3.17, s.variation * 1.91);
      gl.uniform1f(fu.uContrast, s.contrast);
      gl.uniform1f(fu.uSaturation, s.saturation);
      gl.uniform1f(fu.uSettle, introClock * introClock * (3 - 2 * introClock));
      gl.uniform1f(fu.uReveal, introClock);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(comp.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, target);
      gl.uniform1i(cu.uField, 0);
      gl.uniform1f(cu.uGrain, s.grainAmount);
      gl.uniform1f(cu.uGrainSize, s.grainSize * view.ratio);
      gl.uniform1f(cu.uFrame, frameSeed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function resize() {
      view.w = Math.max(1, container.clientWidth);
      view.h = Math.max(1, container.clientHeight);
      view.ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(view.w * view.ratio));
      canvas.height = Math.max(1, Math.round(view.h * view.ratio));
      var w = Math.max(1, Math.round(canvas.width / 2)), h = Math.max(1, Math.round(canvas.height / 2));
      if (w !== fieldSize.w || h !== fieldSize.h) {
        fieldSize.w = w; fieldSize.h = h;
        gl.bindTexture(gl.TEXTURE_2D, target);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      draw();
      wake();
    }

    function updateTouches(dt, aspect) {
      var follow = 1 - Math.exp(-dt / 0.06);
      var px = pointer.sx, py = pointer.sy;
      pointer.sx += (pointer.x - pointer.sx) * follow;
      pointer.sy += (pointer.y - pointer.sy) * follow;
      var vx = ((pointer.sx - px) / dt) * aspect, vy = (pointer.sy - py) / dt;
      pointer.vx = vx;
      var head = trail[0];
      trail.forEach(function (t) { if (t.done) t.age += dt; });
      if (s.interactive && pointer.inside && Math.sqrt(vx * vx + vy * vy) > 0.02 && !REDUCED) {
        if (!head || head.done) {
          trail.unshift({ x: 0, y: 0, vx: 0, vy: 0, age: 0, grow: 0, done: false });
          if (trail.length > MAX_STIRS) trail.pop();
        }
        var live = trail[0];
        live.x = (pointer.sx - 0.5) * aspect;
        live.y = pointer.sy - 0.5;
        live.vx = vx; live.vy = vy;
        live.grow = Math.min(1, live.grow + dt / STIR_STEP);
        live.done = live.grow >= 1;
      } else if (head) head.done = true;
      while (trail.length && trail[trail.length - 1].age > STIR_LIFE) trail.pop();
      for (var i = 0; i < MAX_STIRS; i++) {
        var t = trail[i];
        if (!t) { stirWeights[i] = 0; continue; }
        var fade = 1 - t.age / STIR_LIFE;
        var cap = Math.min(1, 2.2 / Math.max(Math.sqrt(t.vx * t.vx + t.vy * t.vy), 0.001));
        stirs.set([t.x, t.y, t.vx * cap, t.vy * cap], i * 4);
        stirWeights[i] = fade * fade * t.grow * s.stir * 0.05;
      }
      spins.forEach(function (sp) { sp.age += dt; });
      while (spins.length && spins[spins.length - 1].age > TWIRL_LIFE) spins.pop();
      for (var j = 0; j < MAX_TWIRLS; j++) {
        var sp = spins[j];
        if (!sp) { twirls[j * 4 + 2] = 0; continue; }
        var k = sp.age / TWIRL_LIFE;
        var env = Math.min(1, sp.age / 0.18) * (1 - k) * (1 - k);
        twirls.set([sp.x, sp.y, sp.dir * 2.4 * env, 0.16 + 0.1 * Math.min(1, sp.age / 0.5)], j * 4);
      }
    }

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      var dt = last ? clamp((now - last) / 1000, 0.001, 0.05) : 1 / 60;
      last = now;
      if (!REDUCED) time += dt * s.speed * 0.16;
      if (introClock < 1) introClock = Math.min(1, introClock + dt / INTRO_SECONDS);
      grainClock += dt;
      if (s.grainAnimated && !REDUCED && grainClock > 1 / 24) { grainClock = 0; frameSeed = (frameSeed + 1) % 97; }
      updateTouches(dt, view.w / view.h);
      draw();
      var busy = (!REDUCED && (s.speed > 0 || s.grainAnimated)) || introClock < 1 || trail.length > 0 || spins.length > 0;
      if (busy) raf = requestAnimationFrame(frame);
      else last = 0;
    }
    function wake() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }

    function locate(e) {
      var rect = container.getBoundingClientRect();
      var x = (e.clientX - rect.left) / Math.max(1, rect.width);
      var y = 1 - (e.clientY - rect.top) / Math.max(1, rect.height);
      pointer.inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      pointer.x = x; pointer.y = y;
      if (pointer.fresh || !pointer.inside) { pointer.sx = x; pointer.sy = y; pointer.fresh = false; }
    }
    function onMove(e) { locate(e); if (pointer.inside || trail.length) wake(); }
    function onDown(e) {
      locate(e);
      if (!pointer.inside || !s.clickSwirl || REDUCED) return;
      spins.unshift({ x: (pointer.x - 0.5) * (view.w / view.h), y: pointer.y - 0.5, age: 0, dir: pointer.vx < 0 ? 1 : -1 });
      if (spins.length > MAX_TWIRLS) spins.pop();
      wake();
    }
    function onLeave() { pointer.inside = false; }
    function onVisibility() { last = 0; wake(); }

    var ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(container); else window.addEventListener('resize', resize);
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
      visible = en.some(function (x) { return x.isIntersecting; });
      if (visible) { last = 0; wake(); }
    }) : null;
    if (io) io.observe(container);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    resize();

    running.push(function () {
      cancelAnimationFrame(raf); raf = 0;
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      if (io) io.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteTexture(target);
      gl.deleteFramebuffer(fbo);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(field.program);
      gl.deleteProgram(comp.program);
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    });
  }

  return { reset: reset, ring: ring, fold: fold, grain: grain, reduced: REDUCED };
})();
