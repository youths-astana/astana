/* Qosyl — движение.
   Эффекты из библиотеки React Bits, переписанные на обычный JavaScript:
   у сайта нет сборки и React, поэтому компоненты перенесены по смыслу.
   · ring  — кольцо направлений на главной (CircularCarousel, вид «cylinder»);
   · fold  — буквы крупных заголовков раскладываются, как бумага (FoldText);
   · dots  — поле точек за страницей «Конкурсы» (DotGrid);
   · pills — меню разделов «Главная · Каталог · Конкурсы» (PillNav);
   · glass — «параллакс» стеклянных значков направлений (GlassIcons).
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


  // ---------- поле точек ----------
  // Перенос DotGrid: сетка точек на WebGL2 за страницей «Конкурсы». Курсор
  // расталкивает точки, они тянут соседей, как желе, и светлеют, пока движутся;
  // щелчок пускает волну. При появлении точки выпрыгивают из центра.
  // Кадры рисуются, только пока что-то движется, — батарею не ест.
  var DOT_VERTEX = [
    '#version 300 es',
    'precision highp float;',
    'layout(location = 0) in vec2 aCorner;',
    'layout(location = 1) in vec4 aMotion;',
    'layout(location = 2) in vec2 aState;',
    'uniform vec2 uResolution;',
    'uniform float uSize;',
    'uniform float uSwell;',
    'uniform float uStretch;',
    'uniform float uGlow;',
    'out vec2 vLocal;',
    'out vec2 vPoint;',
    'out float vLength;',
    'out float vRadius;',
    'out float vEnergy;',
    'void main() {',
    '  float energy = aState.x;',
    '  float radius = 0.5 * uSize * aState.y * (1.0 + uSwell * energy);',
    '  float speed = length(aMotion.zw);',
    '  float angle = speed > 0.001 ? atan(aMotion.w, aMotion.z) : 0.0;',
    '  float axis = floor(angle / 1.5707963 + 0.5) * 1.5707963;',
    '  angle = axis + (angle - axis) * smoothstep(8.0, 70.0, speed);',
    '  vec2 dir = vec2(cos(angle), sin(angle));',
    '  float halfLength = min(uSize * 2.0, speed * uStretch * 0.02);',
    '  float pad = radius * (1.0 + uGlow * energy * 2.5) + 2.0;',
    '  vec2 local = aCorner * vec2(halfLength + pad, pad);',
    '  vec2 point = aMotion.xy + dir * local.x + vec2(-dir.y, dir.x) * local.y;',
    '  vLocal = local;',
    '  vPoint = point;',
    '  vLength = halfLength;',
    '  vRadius = radius;',
    '  vEnergy = energy;',
    '  vec2 clip = point / uResolution * 2.0 - 1.0;',
    '  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);',
    '}'
  ].join('\n');

  var DOT_FRAGMENT = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 vLocal;',
    'in vec2 vPoint;',
    'in float vLength;',
    'in float vRadius;',
    'in float vEnergy;',
    'uniform vec2 uResolution;',
    'uniform vec3 uBase;',
    'uniform vec3 uActive;',
    'uniform float uGlow;',
    'uniform float uOpacity;',
    'uniform float uFade;',
    'out vec4 outColor;',
    'float smootherstep01(float t) {',
    '  t = clamp(t, 0.0, 1.0);',
    '  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);',
    '}',
    'void main() {',
    '  float d = length(vec2(max(abs(vLocal.x) - vLength, 0.0), vLocal.y)) - vRadius;',
    '  float aa = max(fwidth(d), 0.0001);',
    '  float body = clamp(0.5 - d / aa, 0.0, 1.0);',
    '  float halo = uGlow * vEnergy * 0.5 * exp(-max(d, 0.0) / max(vRadius * 1.3, 0.6));',
    '  float alpha = body + (1.0 - body) * halo;',
    '  vec3 color = mix(uBase, uActive, clamp(vEnergy * 1.2, 0.0, 1.0));',
    '  float fade = 1.0;',
    '  if (uFade > 0.0) {',
    '    vec2 edge = min(vPoint, uResolution - vPoint) / (uFade * 0.4 * min(uResolution.x, uResolution.y));',
    '    fade = smootherstep01(edge.x) * smootherstep01(edge.y);',
    '  }',
    '  alpha *= uOpacity * fade;',
    '  outColor = vec4(color * alpha, alpha);',
    '}'
  ].join('\n');

  function smoother(t) { var x = clamp(t, 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); }
  function backOut(t) { var s = 1.9, x = t - 1; return 1 + x * x * ((s + 1) * x + s); }
  function rgbOf(hex) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return [1, 1, 1];
    var h = m[1].length === 3 ? m[1].replace(/./g, function (c) { return c + c; }) : m[1];
    return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16) / 255; });
  }
  function shader(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
    gl.deleteShader(s);
    return null;
  }

  function dots(container, opts) {
    var o = Object.assign({
      dotSize: 5, gap: 18, baseColor: '#3a3446', activeColor: '#ffffff', proximity: 140, strength: 1,
      bounce: 0.6, tension: 0.4, returnDuration: 0.8, shockRadius: 320, shockStrength: 5,
      swell: 0.8, stretch: 0.5, glow: 0.5, fade: 0, opacity: 1, intro: true
    }, opts || {});
    var canvas = document.createElement('canvas');
    canvas.className = 'dot-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    var gl = null;
    try { gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false }); } catch (e) { gl = null; }
    if (!gl) return; // без WebGL2 остаётся спокойный CSS-фон с точками
    var vs = shader(gl, gl.VERTEX_SHADER, DOT_VERTEX);
    var fs = shader(gl, gl.FRAGMENT_SHADER, DOT_FRAGMENT);
    if (!vs || !fs) return;
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    container.appendChild(canvas);
    container.classList.add('has-dots');

    var U = {};
    ['uResolution', 'uSize', 'uSwell', 'uStretch', 'uGlow', 'uBase', 'uActive', 'uOpacity', 'uFade'].forEach(function (n) {
      U[n] = gl.getUniformLocation(program, n);
    });
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    var cornerBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var instBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 24, 16);
    gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);

    var base = rgbOf(o.baseColor), accent = rgbOf(o.activeColor);
    var view = { width: 0, height: 0, ratio: 0 };
    var grid = { count: 0, cols: 1, rows: 1, cell: 1, centerX: 0, centerY: 0, reach: 1 };
    var rest = new Float32Array(0), offset = rest, velocity = rest, force = rest, next = rest, wave = rest, energy = rest, inst = rest;
    var pointer = { x: 0, y: 0, vx: 0, vy: 0, time: 0, inside: false, presence: 0 };
    var shocks = [];
    var introStart = o.intro && !REDUCED ? -1 : null;
    var visible = true, raf = 0, last = 0, alive = true;

    function rebuild() {
      var size = o.dotSize, spacing = o.gap;
      var cell = Math.max(2, size + spacing);
      var cols = Math.max(1, Math.floor((view.width + spacing) / cell));
      var rows = Math.max(1, Math.floor((view.height + spacing) / cell));
      var startX = (view.width - (cols * cell - spacing)) / 2 + size / 2;
      var startY = (view.height - (rows * cell - spacing)) / 2 + size / 2;
      var count = cols * rows;
      rest = new Float32Array(count * 2);
      offset = new Float32Array(count * 2);
      velocity = new Float32Array(count * 2);
      force = new Float32Array(count * 2);
      next = new Float32Array(count * 2);
      wave = new Float32Array(count * 4);
      energy = new Float32Array(count);
      inst = new Float32Array(count * 6);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var i = (r * cols + c) * 2;
          rest[i] = startX + c * cell;
          rest[i + 1] = startY + r * cell;
        }
      }
      grid.count = count; grid.cols = cols; grid.rows = rows; grid.cell = cell;
      grid.centerX = view.width / 2; grid.centerY = view.height / 2;
      grid.reach = Math.hypot(view.width, view.height) / 2;
      gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
      gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW);
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
      if (w === view.width && h === view.height && ratio === view.ratio) return;
      view.width = w; view.height = h; view.ratio = ratio;
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      rebuild();
      draw(performance.now());
    }

    function step(dt, now) {
      var motion = REDUCED ? 0 : 1;
      var zeta = 1 - 0.85 * clamp(o.bounce, 0, 1);
      var omega = 4 / (zeta * Math.max(0.2, o.returnDuration));
      var stiffness = omega * omega, damping = 2 * zeta * omega;
      var radius = Math.max(1, o.proximity);
      var speed = Math.hypot(pointer.vx, pointer.vy);
      var drive = pointer.inside ? 6500 * Math.tanh(speed / 900) * o.strength * motion : 0;
      var dirX = speed > 0.001 ? pointer.vx / speed : 0;
      var dirY = speed > 0.001 ? pointer.vy / speed : 0;
      var width = grid.cell * 1.4, travel = 650;
      var active = shocks.map(function (s) {
        var front = (now - s.start) / 1000 * travel;
        var power = smoother(1 - front / Math.max(1, o.shockRadius));
        return { x: s.x, y: s.y, front: front, amp: power * o.shockStrength * grid.cell * 0.24 * motion };
      });
      var coupling = Math.pow(Math.max(0, o.tension) * 900, 2) / (grid.cell * grid.cell);
      var viscosity = Math.sqrt(coupling) * 0.06;
      var limit = Math.sqrt(stiffness + 8 * coupling) + damping + 8 * viscosity;
      var steps = Math.min(24, Math.max(1, Math.ceil(dt / Math.min(1 / 120, 1.2 / limit))));
      var h = dt / steps;
      var i, idx, k;
      for (i = 0; i < grid.count; i++) {
        idx = i * 2;
        var rx = rest[idx], ry = rest[idx + 1], ax = 0, ay = 0;
        if (drive > 0) {
          var ex = rx + offset[idx] - pointer.x, ey = ry + offset[idx + 1] - pointer.y;
          var dist = Math.hypot(ex, ey);
          if (dist < radius) {
            var wgt = smoother(1 - dist / radius) * drive;
            var nx = dist > 0.001 ? ex / dist : 0, ny = dist > 0.001 ? ey / dist : 0;
            ax += wgt * (dirX + nx * 0.6);
            ay += wgt * (dirY + ny * 0.6);
          }
        }
        var wx = 0, wy = 0, wvx = 0, wvy = 0;
        for (k = 0; k < active.length; k++) {
          var sh = active[k];
          if (sh.amp <= 0) continue;
          var sx = rx - sh.x, sy = ry - sh.y, sd = Math.hypot(sx, sy);
          var u = (sd - sh.front) / width;
          if (Math.abs(u) < 3 && sd > 0.001) {
            var snx = sx / sd, sny = sy / sd, prof = Math.exp(-u * u), push = sh.amp * prof;
            var rate = sh.amp * 2 * u * prof / width * travel;
            wx += snx * push; wy += sny * push;
            wvx += snx * rate; wvy += sny * rate;
            ax += snx * push * stiffness * 0.35;
            ay += sny * push * stiffness * 0.35;
          }
        }
        force[idx] = ax; force[idx + 1] = ay;
        var w4 = i * 4;
        wave[w4] = wx; wave[w4 + 1] = wy; wave[w4 + 2] = wvx; wave[w4 + 3] = wvy;
      }
      var cols = grid.cols, rows = grid.rows, stride = cols * 2;
      for (var n = 0; n < steps; n++) {
        for (var row = 0; row < rows; row++) {
          for (var col = 0; col < cols; col++) {
            idx = (row * cols + col) * 2;
            var fx = force[idx] - stiffness * offset[idx] - damping * velocity[idx];
            var fy = force[idx + 1] - stiffness * offset[idx + 1] - damping * velocity[idx + 1];
            if (coupling > 0) {
              var lx = -4 * offset[idx], ly = -4 * offset[idx + 1];
              var mx = -4 * velocity[idx], my = -4 * velocity[idx + 1];
              if (col > 0) { lx += offset[idx - 2]; ly += offset[idx - 1]; mx += velocity[idx - 2]; my += velocity[idx - 1]; }
              if (col < cols - 1) { lx += offset[idx + 2]; ly += offset[idx + 3]; mx += velocity[idx + 2]; my += velocity[idx + 3]; }
              if (row > 0) { lx += offset[idx - stride]; ly += offset[idx - stride + 1]; mx += velocity[idx - stride]; my += velocity[idx - stride + 1]; }
              if (row < rows - 1) { lx += offset[idx + stride]; ly += offset[idx + stride + 1]; mx += velocity[idx + stride]; my += velocity[idx + stride + 1]; }
              fx += coupling * lx + viscosity * mx;
              fy += coupling * ly + viscosity * my;
            }
            next[idx] = velocity[idx] + fx * h;
            next[idx + 1] = velocity[idx + 1] + fy * h;
          }
        }
        for (i = 0; i < offset.length; i++) {
          velocity[i] = next[i];
          offset[i] += velocity[i] * h;
        }
      }
      for (i = 0; i < grid.count; i++) {
        idx = i * 2;
        var q = i * 4;
        energy[i] = Math.min(1,
          Math.hypot(velocity[idx] + wave[q + 2], velocity[idx + 1] + wave[q + 3]) / 380 * 0.85 +
          Math.hypot(offset[idx] + wave[q], offset[idx + 1] + wave[q + 1]) / (grid.cell * 2.2) * 0.35);
      }
      for (i = shocks.length - 1; i >= 0; i--) {
        if (active[i].front > o.shockRadius + width * 3) shocks.splice(i, 1);
      }
      var decay = 1 - Math.exp(-dt / 0.08);
      pointer.vx -= pointer.vx * decay;
      pointer.vy -= pointer.vy * decay;
      pointer.presence += ((pointer.inside ? 1 : 0) - pointer.presence) * (1 - Math.exp(-dt / 0.2));
    }

    function draw(now) {
      var radius = Math.max(1, o.proximity);
      var age = introStart === null ? Infinity : introStart < 0 ? 0 : (now - introStart) / 1000;
      var front = age * grid.reach * 1.25, band = grid.cell * 4;
      for (var i = 0; i < grid.count; i++) {
        var idx = i * 2, q = i * 4;
        var x = rest[idx] + offset[idx] + wave[q];
        var y = rest[idx + 1] + offset[idx + 1] + wave[q + 1];
        var lit = energy[i];
        if (pointer.presence > 0.001) {
          var d = Math.hypot(x - pointer.x, y - pointer.y);
          if (d < radius) lit = Math.max(lit, smoother(1 - d / radius) * 0.4 * pointer.presence);
        }
        var scale = 1;
        if (introStart !== null) {
          var dc = Math.hypot(rest[idx] - grid.centerX, rest[idx + 1] - grid.centerY);
          var appear = clamp((front - dc) / band, 0, 1);
          scale = appear >= 1 ? 1 : Math.max(0, backOut(appear));
          lit = Math.max(lit, Math.sin(appear * Math.PI) * 0.6);
        }
        var t6 = i * 6;
        inst[t6] = x;
        inst[t6 + 1] = y;
        inst[t6 + 2] = velocity[idx] + wave[q + 2];
        inst[t6 + 3] = velocity[idx + 1] + wave[q + 3];
        inst[t6 + 4] = lit;
        inst[t6 + 5] = scale;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program);
      gl.uniform2f(U.uResolution, view.width, view.height);
      gl.uniform1f(U.uSize, Math.max(0.5, o.dotSize));
      gl.uniform1f(U.uSwell, REDUCED ? 0 : Math.max(0, o.swell));
      gl.uniform1f(U.uStretch, REDUCED ? 0 : Math.max(0, o.stretch));
      gl.uniform1f(U.uGlow, Math.max(0, o.glow));
      gl.uniform3f(U.uBase, base[0], base[1], base[2]);
      gl.uniform3f(U.uActive, accent[0], accent[1], accent[2]);
      gl.uniform1f(U.uOpacity, clamp(o.opacity, 0, 1));
      gl.uniform1f(U.uFade, clamp(o.fade, 0, 1));
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, grid.count);
      gl.bindVertexArray(null);
    }

    function settled(now) {
      if (shocks.length) return false;
      if (introStart !== null) {
        if (introStart < 0 || (now - introStart) / 1000 < 1.6) return false;
        introStart = null;
      }
      if (Math.abs(pointer.vx) + Math.abs(pointer.vy) > 1) return false;
      if (Math.abs((pointer.inside ? 1 : 0) - pointer.presence) > 0.002) return false;
      for (var i = 0; i < offset.length; i++) {
        if (Math.abs(offset[i]) > 0.02 || Math.abs(velocity[i]) > 0.5) return false;
      }
      return true;
    }

    function frame(now) {
      raf = 0;
      if (!alive || !visible) return;
      if (introStart !== null && introStart < 0) introStart = now;
      var dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      step(dt, now);
      draw(now);
      if (!settled(now)) raf = requestAnimationFrame(frame);
    }
    function wake() {
      if (raf || !alive || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function locate(e) {
      var r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }
    function onMove(e) {
      var p = locate(e), x = p[0], y = p[1];
      var inside = x >= 0 && y >= 0 && x <= view.width && y <= view.height;
      var time = e.timeStamp || performance.now();
      if (inside && pointer.inside && pointer.time) {
        var el = Math.max(4, time - pointer.time) / 1000;
        pointer.vx += ((x - pointer.x) / el - pointer.vx) * 0.6;
        pointer.vy += ((y - pointer.y) / el - pointer.vy) * 0.6;
      } else {
        pointer.vx = 0;
        pointer.vy = 0;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.time = time;
      if (inside !== pointer.inside || inside) {
        pointer.inside = inside;
        wake();
      }
    }
    function onLeave() { pointer.inside = false; pointer.time = 0; wake(); }
    function onOut(e) { if (!e.relatedTarget) onLeave(); }
    function onDown(e) {
      if (REDUCED) return;
      var p = locate(e);
      if (p[0] < 0 || p[1] < 0 || p[0] > view.width || p[1] > view.height) return;
      shocks.push({ x: p[0], y: p[1], start: performance.now() });
      if (shocks.length > 6) shocks.shift();
      wake();
    }
    function onVis() {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake();
    }
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerout', onOut);
    window.addEventListener('blur', onLeave);
    document.addEventListener('visibilitychange', onVis);
    var ro = new ResizeObserver(function () { resize(); wake(); });
    ro.observe(canvas);
    var io = new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible) wake();
    });
    io.observe(canvas);
    resize();
    wake();

    running.push(function () {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerout', onOut);
      window.removeEventListener('blur', onLeave);
      document.removeEventListener('visibilitychange', onVis);
      gl.deleteBuffer(cornerBuf);
      gl.deleteBuffer(instBuf);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      container.classList.remove('has-dots');
    });
  }

  // ---------- меню разделов ----------
  // Перенос PillNav: у каждого раздела своя «таблетка». При наведении снизу
  // поднимается синий круг, а подпись перекатывается вверх. Текущий раздел
  // отмечен точкой, которая на пружине переезжает к новому пункту и
  // вытягивается на ходу. При первом открытии полоска разворачивается слева.
  // Меню живёт вне #app, поэтому перерисовка страницы его не трогает.
  var EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
  function pills(nav, opts) {
    opts = opts || {};
    var bar = nav.querySelector('.pn-bar');
    var track = nav.querySelector('.pn-track');
    var dot = nav.querySelector('.pn-dot');
    var slots = Array.prototype.slice.call(nav.querySelectorAll('.pn-slot'));
    var active = opts.active == null ? -1 : opts.active;
    var BOUNCE = 0.3;
    var st = { x: 0, v: 0, a: 0, hover: -1, waiting: false };
    var rects = [], raf = 0, last = 0, alive = true;

    function measure() {
      slots.forEach(function (s, i) {
        rects[i] = { left: s.offsetLeft, width: s.offsetWidth };
        var reach = Math.ceil(2 * Math.sqrt(Math.pow(s.offsetWidth / 2, 2) + Math.pow(s.offsetHeight, 2))) + 2;
        s.style.setProperty('--pn-fill', reach + 'px');
      });
    }
    function sync() {
      slots.forEach(function (s, i) { s.toggleAttribute('data-hover', st.hover === i); });
      nav.toggleAttribute('data-dot-lit', st.hover >= 0 && st.hover === active);
    }
    function paint() {
      if (!dot) return;
      var pull = clamp(Math.abs(st.v) / 700, 0, 2.2);
      dot.style.transform = 'translate3d(' + st.x.toFixed(2) + 'px,0,0) scaleX(' + (1 + pull).toFixed(3) + ')';
      dot.style.opacity = st.a.toFixed(3);
    }
    function tick(now) {
      raf = 0;
      if (!alive) return;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      var busy = false;
      var target = active >= 0 ? rects[active] : null;
      if (target && target.width && !st.waiting) {
        var center = target.left + target.width / 2;
        if (st.a < 0.02 || REDUCED) { st.x = center; st.v = 0; }
        else {
          var k = 360, steps = Math.ceil(dt / (1 / 240)), h = dt / steps;
          for (var i = 0; i < steps; i++) {
            st.v += (-k * (st.x - center) - 2 * (1 - 0.5 * BOUNCE) * Math.sqrt(k) * st.v) * h;
            st.x += st.v * h;
          }
        }
        st.a += (1 - st.a) * (REDUCED ? 1 : 1 - Math.exp(-dt / 0.1));
        if (Math.abs(st.x - center) > 0.05 || Math.abs(st.v) > 0.5 || st.a < 0.999) busy = true;
      } else {
        st.a += (0 - st.a) * (REDUCED ? 1 : 1 - Math.exp(-dt / 0.1));
        if (st.a > 0.002) busy = true; else st.a = 0;
      }
      paint();
      if (busy) raf = requestAnimationFrame(tick); else last = 0;
    }
    function wake() { if (!raf && alive) { last = 0; raf = requestAnimationFrame(tick); } }

    function onEnter(e) {
      if (e.pointerType === 'touch') return;
      st.hover = slots.indexOf(e.currentTarget);
      sync();
    }
    function onLeave() { st.hover = -1; sync(); }
    function onFocus(e) {
      var vis = false;
      try { vis = e.target.matches(':focus-visible'); } catch (x) { vis = false; }
      if (vis) { st.hover = slots.indexOf(e.currentTarget); sync(); }
    }
    slots.forEach(function (s) {
      s.addEventListener('pointerenter', onEnter);
      s.addEventListener('focusin', onFocus);
      s.addEventListener('focusout', onLeave);
    });
    if (track) track.addEventListener('pointerleave', onLeave);

    if (opts.intro && !REDUCED && bar && bar.animate) {
      var bw = bar.offsetWidth, bh = bar.offsetHeight;
      if (bw && bh) {
        bar.animate([
          { clipPath: 'inset(0px ' + Math.max(0, bw - bh) + 'px 0px 0px round ' + bh / 2 + 'px)' },
          { clipPath: 'inset(0px 0px 0px 0px round ' + bh / 2 + 'px)' }
        ], { duration: 760, delay: 90, easing: EASE_OUT, fill: 'backwards' });
        slots.forEach(function (s, i) {
          s.animate([{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }],
            { duration: 560, delay: 200 + i * 50, easing: EASE_OUT, fill: 'backwards' });
        });
        st.waiting = true;
        setTimeout(function () { st.waiting = false; wake(); }, 420);
      }
    }

    var ro = window.ResizeObserver ? new ResizeObserver(function () { measure(); wake(); }) : null;
    if (ro && track) ro.observe(track);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (alive) { measure(); wake(); } });
    measure();
    sync();
    paint();
    wake();

    return {
      set: function (i) { active = i; measure(); sync(); wake(); },
      destroy: function () { alive = false; cancelAnimationFrame(raf); if (ro) ro.disconnect(); }
    };
  }

  // ---------- стеклянные значки ----------
  // Как GlassIcons: значок направления лежит на матовом стекле, за ним —
  // наклонная цветная пластинка. Всё движение в CSS, здесь только «параллакс»:
  // пластинка чуть уходит от курсора, а блик на стекле идёт за ним.
  function glass(root) {
    if (REDUCED || !root) return;
    var cur = null;
    function clear(tile) {
      var gi = tile && tile.querySelector('.gi');
      if (gi) { gi.style.removeProperty('--px'); gi.style.removeProperty('--py'); }
    }
    function move(e) {
      if (e.pointerType === 'touch') return;
      var tile = e.target.closest ? e.target.closest('.cat') : null;
      if (cur && cur !== tile) clear(cur);
      cur = tile;
      if (!tile) return;
      var gi = tile.querySelector('.gi');
      if (!gi) return;
      var r = tile.getBoundingClientRect();
      var x = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1);
      var y = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1);
      gi.style.setProperty('--px', x.toFixed(3));
      gi.style.setProperty('--py', y.toFixed(3));
    }
    function leave() { if (cur) clear(cur); cur = null; }
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', leave);
    running.push(function () {
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerleave', leave);
    });
  }

  return { reset: reset, ring: ring, fold: fold, dots: dots, pills: pills, glass: glass, reduced: REDUCED };
})();
