// Fiducia site behaviour: the keyword rings, the example file browser and the blog filter.
(function () {
  // Keyword rings: each ring is one family of verification technique and its
  // words travel round it. The rings are flat concentric ellipses (one plane seen
  // from a low angle), so words swing behind the centre and come forward again (nearer = larger and
  // brighter). Drag sideways to spin them. Honours prefers-reduced-motion
  // (static, drag only) and pauses off-screen.
  var RINGS = {
    // Ring radius as a fraction of the stage half-width, inner to outer: interactive theorem
    // proving, automatic proving and checking, the agents, then the language itself. The first ring sits well clear of the planet; the gaps between rings
    // are consecutive Fibonacci numbers: 3 : 5 : 8. speed: rad/frame; font: type scale; gain: how
    // much a word grows toward the front (inner rings are crowded, so they stay small).
    itp:      { a: 0.400, speed: -0.0046, font: 0.78, gain: 0.22 },
    atp:      { a: 0.512, speed:  0.0036, font: 0.78, gain: 0.22 },
    agent:    { a: 0.700, speed: -0.0040, font: 0.95, gain: 0.30 },
    language: { a: 1.000, speed:  0.0026, font: 1.05, gain: 0.46 }
  };

  // All rings lie in one plane seen from a low angle: ratio = minor/major axis, tilt in
  // degrees on screen (negative = right side up).
  var PLANE = { ratio: 0.5, tilt: -10 };



  document.querySelectorAll('[data-cloud]').forEach(function (root) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var items = Array.prototype.slice.call(root.children);
    var groups = {}, core = null;
    items.forEach(function (li) {
      var r = li.dataset.ring;
      if (r === 'core') {
        core = li;
        var label = li.textContent;
        li.textContent = '';
        ['core-planet'].forEach(function (cls) {
          var e = document.createElement('i'); e.className = cls; e.setAttribute('aria-hidden', 'true'); li.appendChild(e);
        });
        var t = document.createElement('span'); t.className = 'core-label'; t.textContent = label;
        li.appendChild(t);
        return;
      }
      (groups[r] = groups[r] || []).push(li);
    });
    var names = Object.keys(RINGS).filter(function (k) { return groups[k]; });
    names.forEach(function (k, gi) {
      var g = groups[k], cfg = RINGS[k];
      cfg.t = gi * 1.3;
      g.forEach(function (li, i) { li.dataset.a0 = (i / g.length) * Math.PI * 2; li.dataset.font = cfg.font; li.dataset.gain = cfg.gain; });
    });

    // Dust belts: a canvas of fine drifting dust behind the words, one belt per
    // ring, each jittered about the ring's path and tinted like it.
    var cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.className = 'ring-lines';
    root.insertBefore(cv, root.firstChild);
    // A second canvas for the near half of each belt, stacked above the planet.
    var cvF = document.createElement('canvas');
    cvF.setAttribute('aria-hidden', 'true');
    cvF.className = 'ring-lines ring-front';
    root.appendChild(cvF);
    var ctxB = cv.getContext('2d'), ctxF = cvF.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var VARS = { language: '--c-lang', itp: '--c-itp', atp: '--c-atp', agent: '--c-agent' };
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var belts = {};
    names.forEach(function (k) {
      // Fine dust only: the words are the asteroids.
      var cfg = RINGS[k], n = Math.round(170 + cfg.a * 300), list = [];
      for (var i = 0; i < n; i += 1) {
        list.push({ a: rnd() * Math.PI * 2, dr: (rnd() + rnd() - 1) * 0.06, dy: (rnd() - 0.5) * 0.05,
                    k: 0.88 + rnd() * 0.24, size: 0.55 + rnd() * rnd() * 1.3, alpha: 0.18 + rnd() * 0.45 });
      }
      belts[k] = list;
    });
    var tints = {};

    var W = 0, H = 0, Rx = 0, Ry = 0;
    var spin = 0, dragging = false, lastX = 0, visible = true, raf = 0;

    // Point on a ring at angle t -> [x, y, depth] in pixels from the stage centre; depth is
    // 0 (back) .. 1 (front). k widens or narrows the ellipse, to jitter dust about the path.
    function point(cfg, t, k) {
      var A = cfg.a * (k || 1) * Rx, B = A * PLANE.ratio, ro = PLANE.tilt * Math.PI / 180;
      var x = A * Math.cos(t), y = B * Math.sin(t);
      return [x * Math.cos(ro) - y * Math.sin(ro), x * Math.sin(ro) + y * Math.cos(ro), Math.sin(t) * 0.5 + 0.5];
    }

    function measure() {
      root.classList.add('is-cloud', 'is-rings');
      W = root.clientWidth;
      var scale = Math.min(0.8, Math.max(0.55, W / 960));
      H = Math.round(Math.min(Math.max(W * 0.6, 340), 480));
      Rx = W / 2 - Math.min(78, W * 0.09); Ry = H / 2 - 10;
      root.style.height = H + 'px';
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      cvF.width = cv.width; cvF.height = cv.height;
      cvF.style.width = cv.style.width; cvF.style.height = cv.style.height;
      var cs = getComputedStyle(document.documentElement);
      names.forEach(function (k) { tints[k] = cs.getPropertyValue(VARS[k]).trim() || '#888'; });
      items.forEach(function (li) {
        li.style.fontSize = '';
        li.style.fontSize = Math.max(10, parseFloat(getComputedStyle(li).fontSize) * scale * (+li.dataset.font || 1)) + 'px';
        li.dataset.bw = li.offsetWidth; li.dataset.bh = li.offsetHeight;
      });
    }

    function place(li, p) {
      var depth = p[2], gain = +li.dataset.gain || 0.46, s = 1 - gain / 2 + gain * depth;
      var x = W / 2 + p[0] - li.dataset.bw * s / 2;
      var y = H / 2 + p[1] - li.dataset.bh * s / 2;
      li.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + s.toFixed(3) + ')';
      li.style.opacity = (0.28 + 0.72 * depth).toFixed(2);
      li.style.zIndex = Math.round(depth * 100);
    }

    function drawBelts() {
      ctxB.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxF.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxB.clearRect(0, 0, W, H);
      ctxF.clearRect(0, 0, W, H);
      names.forEach(function (k) {
        var cfg = RINGS[k];
        ctxB.fillStyle = ctxF.fillStyle = tints[k];
        belts[k].forEach(function (b) {
          var p = point(cfg, b.a + cfg.t * b.k, 1 + b.dr);
          var d = p[2], ctx = d >= 0.5 ? ctxF : ctxB;
          ctx.globalAlpha = Math.min(1, b.alpha * 1.25) * (0.4 + 0.6 * d) * 0.7;
          var x = W / 2 + p[0], y = H / 2 + p[1] + b.dy * Ry, sz = b.size * (0.7 + 0.6 * d);
          ctx.beginPath();
          ctx.arc(x, y, sz, 0, 6.2832);
          ctx.fill();
        });
      });
      ctxB.globalAlpha = ctxF.globalAlpha = 1;
    }

    function draw() {
      drawBelts();
      names.forEach(function (k) {
        var cfg = RINGS[k];
        groups[k].forEach(function (li) { place(li, point(cfg, +li.dataset.a0 + cfg.t)); });
      });
      if (core) {
        core.style.transform = 'translate3d(' + (W / 2 - core.dataset.bw / 2).toFixed(1) + 'px,' + (H / 2 - core.dataset.bh / 2).toFixed(1) + 'px,0)';
        core.style.opacity = 1; core.style.zIndex = 49; // between the back half of the rings (below) and the front half (above)
      }
    }

    function tick() {
      raf = 0;
      names.forEach(function (k) {
        var cfg = RINGS[k];
        cfg.t += (reduce ? 0 : cfg.speed) + (dragging ? 0 : spin * (cfg.speed < 0 ? -1 : 1));
      });
      if (!dragging) spin *= 0.94;
      draw();
      if ((visible && !reduce) || Math.abs(spin) > 1e-4) raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(tick); }

    root.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; spin = 0;
      root.setPointerCapture(e.pointerId); root.classList.add('is-grabbing'); kick();
    });
    root.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var d = (e.clientX - lastX) * 0.008;
      names.forEach(function (k) { RINGS[k].t += d * (RINGS[k].speed < 0 ? -1 : 1); });
      spin = d; lastX = e.clientX; draw();
    });
    function release() { dragging = false; root.classList.remove('is-grabbing'); kick(); }
    root.addEventListener('pointerup', release);
    root.addEventListener('pointercancel', release);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(root);
    }
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(function () { measure(); draw(); kick(); });
    var timer;
    window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(function () { measure(); draw(); }, 120); });
  });

  // File browser: a vertical tablist of files beside one visible panel.
  document.querySelectorAll('[data-files]').forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    var path = root.querySelector('[data-files-path]');
    var note = root.querySelector('[data-files-note]');

    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (path) path.textContent = tab.dataset.path;
      if (note) note.textContent = tab.dataset.note;
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') next = tabs[0];
        if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
    var initial = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    if (initial) select(initial, false);
  });

  // Blog filter: chips toggle which feed items show; ?cat=release preselects.
  document.querySelectorAll('[data-filter]').forEach(function (root) {
    var chips = Array.prototype.slice.call(root.querySelectorAll('[data-cat]'));
    var items = Array.prototype.slice.call(document.querySelectorAll(root.dataset.filter + ' > li'));
    var empty = document.querySelector(root.dataset.empty);

    function apply(cat) {
      var shown = 0;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.cat === cat ? 'true' : 'false'); });
      items.forEach(function (li) {
        var on = cat === 'all' || li.dataset.cat === cat;
        li.hidden = !on;
        if (on) shown++;
      });
      if (empty) empty.hidden = shown !== 0;
    }

    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        apply(c.dataset.cat);
        var url = new URL(window.location.href);
        if (c.dataset.cat === 'all') url.searchParams.delete('cat'); else url.searchParams.set('cat', c.dataset.cat);
        history.replaceState(null, '', url);
      });
    });
    var param = new URLSearchParams(window.location.search).get('cat');
    apply(chips.some(function (c) { return c.dataset.cat === param; }) ? param : 'all');
  });
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // Run cb once, the first time el is at least partly on screen. Uses
  // IntersectionObserver, with a scroll check as a backstop.
  function whenVisible(el, cb) {
    var done = false;
    function fire() { if (done) return; done = true; window.removeEventListener('scroll', check); cb(); }
    function check() {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.8 && r.bottom > window.innerHeight * 0.2) fire();
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es, ob) { if (es[0].isIntersecting) { ob.disconnect(); fire(); } }, { threshold: 0.3 }).observe(el);
    }
    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  // Install one-liner: pick a platform, copy the command.
  document.querySelectorAll('[data-oneliner]').forEach(function (root) {
    var code = root.querySelector('[data-oneliner-cmd]');
    var btns = root.querySelectorAll('[data-cmd]');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        code.textContent = b.dataset.cmd;
      });
    });
    var copy = root.querySelector('[data-copy]');
    copy.addEventListener('click', function () {
      var done = function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(code.textContent).then(done, function () {});
    });
  });

  // Agent terminal: plays a recorded session.
  // A real Claude Code session (Sonnet 5.5) with fic 2.81.0 on its
  // demo/datadiode, recorded 2026-11-17. Prompts and the agent's messages are
  // shortened, paths made relative, and warnings and repeated progress lines
  // left out; nothing is added.
  var SESSION = [
    ['you', 'For debugging, add a tap so eth_outer can read the inner DMA buffer and we can see frames after they cross the diode.'],
    ['agent', 'I\'ll add the tap as a mapping of inner_dma into eth_outer, then run the check.'],
    ['file', 'eth_outer.fi'],
    ['add', 'Low Mapping inner_tap(inner_dma, 0x2_800_000, "r", false);'],
    ['cmd', 'fic . --check'],
    ['ok', '  ✓ Resolved names'],
    ['dim', '  ⋮'],
    ['err', 'Error: error: information flow violation: High memory region \'inner_dma\' is accessed through Low mapping \'inner_tap\''],
    ['dim', '  --> ./eth_outer.fi:10:1'],
    ['agent', 'The checker rejected the tap. I\'m going to revert it instead of working around the error.'],
    ['cmd', 'git checkout eth_outer.fi'],
    ['agent', 'The error is the diode guarantee itself, not a typo or a bug. eth_outer is a Low protection domain and inner_dma is High, so any tap that lets eth_outer read it is a High→Low flow. Smallest change instead: log on the High side, in eth_inner.fi.'],
    ['you', 'Do the High-side logging. Then run the checks and build the model.'],
    ['file', 'eth_inner.fi'],
    ['del', 'dbg("delivered");'],
    ['add', 'dbg("delivered len=", f.len, " origin=", f.origin);'],
    ['cmd', 'fic . --check'],
    ['ok', '  ✓ Resolved names'],
    ['dim', '  ⋮'],
    ['ok', '  ✓ Type-checked information flow'],
    ['ok', '  ✓ Checked channel dependency acyclicity (WF2)'],
    ['agent', 'Check passes. Building now.'],
    ['cmd', 'fire build --target=xta .'],
    ['ok', '  ✓ UPPAAL model written to build/datadiode.xta'],
    ['agent', 'Both passed. I didn\'t run fire verify, so I haven\'t confirmed that spec/datadiode.q still holds on the new model.']
  ];
  document.querySelectorAll('[data-term]').forEach(function (out) {
    var replay = out.parentNode.querySelector('[data-term-replay]');
    var run = 0, started = false;
    function line(kind, text) {
      var el = document.createElement('span');
      el.className = 'ln ' + kind;
      el.textContent = text;
      out.appendChild(el);
      out.scrollTop = out.scrollHeight;
      return el;
    }
    function play() {
      var me = ++run;
      out.textContent = '';
      if (reduceMotion) { SESSION.forEach(function (s) { line(s[0], s[1]); }); return; }
      var caret = document.createElement('span');
      caret.className = 'caret';
      var i = 0;
      (function step() {
        if (me !== run) return;
        if (i >= SESSION.length) { out.appendChild(caret); setTimeout(function () { if (me === run) play(); }, 6000); return; }
        var s = SESSION[i++], typed = s[0] === 'cmd' || s[0] === 'agent' || s[0] === 'you';
        if (!typed) { line(s[0], s[1]); setTimeout(step, s[0] === 'err' || s[0] === 'ok' ? 260 : 140); return; }
        var el = line(s[0], ''), k = 0;
        el.appendChild(caret);
        (function type() {
          if (me !== run) return;
          if (k < s[1].length) { caret.before(s[1][k++]); out.scrollTop = out.scrollHeight; setTimeout(type, s[0] === 'cmd' ? 45 : 14); return; }
          caret.remove();
          setTimeout(step, s[0] === 'cmd' ? 650 : 900);
        })();
      })();
    }
    if (replay) replay.addEventListener('click', play);
    whenVisible(out, function () { if (!started) { started = true; play(); } });
  });

  // How it works: a pulse walks the loop. Lap 1 fails at
  // System verification and goes round through Counterexample and Repair;
  // lap 2 holds and drops to the image. Each step's panel shows a real
  // snippet from demo/datadiode.
  var LOOP = [
    { step: 1, lap: 1, kicker: 'Step 1 · you write', title: 'Code + contract',
      text: 'The system in a .fis file, one process per protection domain in .fi, and the computation in C or Pancake under contracts. This is dd, the diode in the middle:',
      code: '<span class="k">@bind</span>(microkit.notified)\n<span class="k">proc</span> Notified() {\n    o2d?f -&gt; forward -&gt; d2i!f -&gt; Notified();\n}',
      cap: 'demo/datadiode/dd.fi' },
    { step: 2, lap: 1, kicker: 'Step 2 · derived, not written', title: 'Autoformalisation',
      text: 'fic turns the program itself into a UPPAAL model, one automaton per domain, and each channel into a queue. Nobody writes the model, so it cannot drift from the code. dd becomes:',
      code: '<span class="k">process</span> Dd() {\n  ...\n<span class="k">trans</span>\n    Init -&gt; init_exit { assign ready(); },\n    init_exit -&gt; Notified { },\n    Notified -&gt; L2 { guard awake &amp;&amp; q_o2d.length &gt; 0;\n                     assign f = q_o2d_val[0], ... },\n    L2 -&gt; L3 { assign forward(); },\n    L3 -&gt; Notified { guard q_d2i.length &lt; q_d2i.capacity;\n                     assign q_d2i_val[q_d2i.length] = f, ... },\n    L3 -&gt; Notified { guard q_d2i.length == q_d2i.capacity; },\n    ...\n}',
      cap: 'build/datadiode.xta, generated by fic 2.81.0, abridged' },
    { step: 3, lap: 1, kicker: 'Step 3 · per function', title: 'Code verification',
      text: 'Each foreign function\'s contract is proved on its implementation, with Frama-C for C or Viper for Pancake. The proved contract is what the model assumes the function does.',
      code: '<span class="k">/*@ ensures \\result == 0 || \\result == 1; */</span>\nbool eth_poll(void);\n\n<span class="k">/*@ ensures \\result.origin == origin; */</span>\nstruct Frame eth_frame(uint8_t origin);',
      cap: 'demo/datadiode/include/eth.h' },
    { step: 4, lap: 1, kicker: 'Step 4 · whole system', title: 'System verification: a check fails',
      text: 'fic checks information flow and the channel graph, and UPPAAL checks the queries on the model. Suppose someone added a channel back from eth_inner to eth_outer:',
      code: '<span class="a">+ Chan i2o = eth_inner --&gt; eth_outer via inner_output&lt;Frame&gt;;</span>\n\n<span class="w">warning</span>: WF2 violation: channel dependency graph\n         contains a cycle',
      cap: 'fic . --check' },
    { step: 5, lap: 1, kicker: 'Step 5 · the evidence', title: 'Counterexample',
      text: 'A failed check comes with what breaks it. From fic, it is the cycle itself; from UPPAAL, it is the trace of a run that violates the query.',
      code: 'eth_outer → eth_inner → dd → eth_outer\n(via channels: i2o, d2i, o2d)',
      cap: 'fic . --check, the WF2 cycle' },
    { step: 6, lap: 1, kicker: 'Step 6 · by you or an agent', title: 'Repair & synthesis',
      text: 'The counterexample says what to change: here, drop the channel back. A repair can also synthesise a missing piece, such as a guard or a contract.',
      code: '<span class="d">- Chan i2o = eth_inner --&gt; eth_outer via inner_output&lt;Frame&gt;;</span>',
      cap: 'demo/datadiode/datadiode.fis' },
    { step: 1, lap: 2, kicker: 'Step 1 · round again', title: 'Code + contract, repaired',
      text: 'The repaired program goes round the loop again. Nothing is re-modelled by hand: every lap starts from the code.',
      code: '<span class="k">Chan</span> o2d = eth_outer --&gt; dd <span class="k">via</span> eth_outer_output&lt;Frame&gt;;\n<span class="k">Chan</span> d2i = dd --&gt; eth_inner <span class="k">via</span> eth_inner_input&lt;Frame&gt;;',
      cap: 'demo/datadiode/datadiode.fis', dwell: 2600 },
    { step: 2, lap: 2, kicker: 'Step 2', title: 'Model re-derived', same: 1, dwell: 1300 },
    { step: 3, lap: 2, kicker: 'Step 3', title: 'Contracts re-proved', same: 2, dwell: 1300 },
    { step: 4, lap: 2, kicker: 'Step 4 · whole system', title: 'System verification: every check holds',
      text: 'fic\'s checks pass, and fire verify checks the queries on the model: deadlock freedom, progress across each hop, and secrecy of High frames.',
      code: '<span class="o">✓ Type-checked information flow</span>\n<span class="o">✓ Checked channel dependency acyclicity (WF2)</span>\n\n<span class="k">A[]</span> not deadlock\n<span class="k">E&lt;&gt;</span> dd.L2',
      cap: 'fic . --check · spec/datadiode.q' },
    { step: 7, lap: 2, kicker: 'Step 7 · what holds ships', title: 'Executable image',
      text: 'Only then is the system compiled to a bootable seL4 Microkit image, for QEMU or a real board. Each domain gets exactly the capabilities the program declares.',
      code: '- IRQ: \'irq_79_eth_outer\'\n    * Number: 79\n- TCB: \'tcb_dd\'\n    * Priority: 150',
      cap: 'build/report.txt from a datadiode image build', dwell: 4200 }
  ];
  var CENTRE = { 1: [124, 72], 2: [412, 72], 3: [700, 72], 4: [700, 248], 5: [412, 248], 6: [124, 248], 7: [700, 424] };
  document.querySelectorAll('[data-loop]').forEach(function (root) {
    var wrap = root.querySelector('[data-loop-wrap]'), stage = root.querySelector('[data-loop-stage]');
    var dot = root.querySelector('[data-loop-dot]');
    var cards = root.querySelectorAll('.loop-card'), detail = root.querySelector('[data-loop-detail]');
    var lap = root.querySelector('[data-loop-lap]'), toggle = root.querySelector('[data-loop-toggle]');
    var q = function (sel) { return root.querySelector(sel); };
    var idx = 0, timer = null, playing = true, anim = null;
    root.classList.add('is-live');

    function fit() {
      var s = Math.min(1, wrap.clientWidth / 824);
      stage.style.transform = 'scale(' + s + ')';
      wrap.style.height = Math.ceil(496 * s) + 'px';
    }
    fit();
    window.addEventListener('resize', fit);

    function placeDot(x, y) { dot.style.left = x + 'px'; dot.style.top = y + 'px'; }
    function moveDot(from, to, rgb) {
      if (anim) cancelAnimationFrame(anim);
      dot.style.setProperty('--dot', rgb);
      if (reduceMotion || !from) { placeDot(to[0], to[1]); dot.style.opacity = reduceMotion ? 0 : 1; return; }
      dot.style.opacity = 1;
      var t0 = null, dur = 750;
      (function frame(t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        placeDot(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e);
        if (k < 1) anim = requestAnimationFrame(frame);
      })(performance.now());
    }

    function show(i, prev) {
      idx = i;
      var it = LOOP[i], src = it.same !== undefined ? LOOP[it.same] : it;
      cards.forEach(function (c) { c.classList.toggle('is-active', +c.dataset.step === it.step); });
      var failing = it.lap === 1 && (it.step >= 5 || (prev !== undefined && LOOP[prev].step >= 5 && it.step === 1));
      var rgb = it.step === 7 ? '96,165,250' : (it.lap === 1 && it.step >= 5) || (it.lap === 2 && it.step === 1 && prev === 5) ? '251,113,133' : '34,211,238';
      var from = prev === undefined ? null : (LOOP[prev].step === 7 ? null : CENTRE[LOOP[prev].step]);
      moveDot(from, CENTRE[it.step], rgb);
      lap.textContent = it.lap === 1 ? 'Lap 1 · a check fails' : 'Lap 2 · every check holds';
      lap.className = 'loop-lap ' + (it.lap === 1 ? 'fail' : 'hold');
      q('[data-loop-kicker]').textContent = it.kicker;
      q('[data-loop-title]').textContent = it.title;
      q('[data-loop-text]').textContent = it.same !== undefined ? src.text : it.text;
      q('[data-loop-code]').innerHTML = src.code;
      q('[data-loop-cap]').textContent = src.cap;
      detail.classList.remove('swap'); void detail.offsetWidth; detail.classList.add('swap');
    }

    function schedule() {
      clearTimeout(timer);
      if (!playing) return;
      timer = setTimeout(function () { var p = idx; show((idx + 1) % LOOP.length, p); schedule(); }, LOOP[idx].dwell || 3600);
    }
    function setPlaying(on) { playing = on; toggle.textContent = on ? 'Pause' : 'Play'; schedule(); }

    toggle.addEventListener('click', function () { setPlaying(!playing); });
    cards.forEach(function (c) {
      c.addEventListener('click', function () {
        var step = +c.dataset.step, cur = LOOP[idx].lap, pick = -1;
        LOOP.forEach(function (it, i) { if (pick < 0 && it.step === step && it.lap === cur) pick = i; });
        if (pick < 0) LOOP.forEach(function (it, i) { if (pick < 0 && it.step === step) pick = i; });
        var p = idx; show(pick, p); setPlaying(true);
      });
    });

    show(0);
    setPlaying(true);
  });

  // Break the data diode: edit the shown files and print what fic says.
  // The diagnostics are real output from fic on these exact edits.
  var BREAKS = {
    leak: {
      edits: [['p-outer', 'dma(outer_dma', 'after', '<span class="lo">Low</span> <span class="k">Mapping</span> peek(inner_dma, <span class="n">0x2_800_000</span>, <span class="s">"r"</span>, <span class="k">false</span>);']],
      tab: 't-outer', kind: 'err', head: 'fic . --check  ·  exit 1',
      out: 'Error: <span class="e">error</span>: information flow violation: High memory region \'inner_dma\' is accessed through Low mapping \'peek\'\n<span class="g"> --&gt;</span> ./eth_outer.fi:8:1\n<span class="g">  |</span>\n<span class="g">8 |</span> Low Mapping peek(inner_dma, 0x2_800_000, "r", false);\n<span class="g">  |</span> <span class="e">^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^</span>',
      note: '<code>inner_dma</code> is labelled <code>High</code> in <code>datadiode.fis</code>, and <code>eth_outer</code> is the Low side. fic rejects the mapping, so nothing is built.'
    },
    reverse: {
      edits: [
        ['p-fis', 'eth_inner_input(', 'after', '<span class="hi">High</span> <span class="k">MemoryRegion</span> inner_output(<span class="n">0x200000</span>, <span class="n">0x200000</span>);'],
        ['p-fis', 'Chan d2i', 'after', '<span class="k">Chan</span> i2o = eth_inner --&gt; eth_outer <span class="k">via</span> inner_output&lt;Frame&gt;;'],
        ['p-outer', 'irq?79', 'replace', '       irq?<span class="n">79</span> -&gt; HandleRx()\n    [] i2o?ack -&gt; Skip;']
      ],
      tab: 't-fis', kind: 'warn', head: 'fic . --check  ·  warning',
      out: '<span class="w">warning</span>: WF2 violation: channel dependency graph contains a cycle: eth_outer → eth_inner → dd → eth_outer (via channels: i2o, d2i, o2d)\n<span class="g">  --&gt;</span> ./datadiode.fis:39:1\n<span class="g">   |</span>\n<span class="g">39 |</span> <span class="w">/</span> Chan i2o = eth_inner --&gt; eth_outer via inner_output&lt;Frame&gt;;\n<span class="g">40 |</span> <span class="w">|</span>\n<span class="g">41 |</span> <span class="w">|</span> System = eth_outer ||| dd ||| eth_inner;\n<span class="g">   |</span> <span class="w">|_^</span>',
      note: 'With <code>eth_outer</code> receiving on <code>i2o</code>, the three domains wait on each other in a cycle. Deadlock freedom no longer follows from the structure: fic flags it, and it would now have to be proved with <code>fire verify</code>. The diode is no longer one-way.'
    }
  };
  document.querySelectorAll('[data-break-controls]').forEach(function (bar) {
    var diag = document.querySelector('[data-diag]');
    var originals = {};
    var reset = bar.querySelector('[data-break="reset"]');
    function restore() {
      Object.keys(originals).forEach(function (id) { document.getElementById(id).querySelector('pre').innerHTML = originals[id]; });
      originals = {};
    }
    function apply(edit) {
      var pre = document.getElementById(edit[0]).querySelector('pre');
      if (!(edit[0] in originals)) originals[edit[0]] = pre.innerHTML;
      var lines = pre.innerHTML.split('\n'), probe = document.createElement('div');
      for (var i = 0; i < lines.length; i++) {
        probe.innerHTML = lines[i];
        if (probe.textContent.indexOf(edit[1]) < 0) continue;
        var marked = edit[3].split('\n').map(function (l) { return '<span class="ins">' + l + '</span>'; });
        if (edit[2] === 'after') lines.splice.apply(lines, [i + 1, 0].concat(marked));
        else lines.splice.apply(lines, [i, 1].concat(marked));
        break;
      }
      pre.innerHTML = lines.join('\n');
    }
    bar.querySelectorAll('[data-break]').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.dataset.break;
        restore();
        bar.querySelectorAll('[data-break]').forEach(function (o) { o.setAttribute('aria-pressed', o === b && key !== 'reset' ? 'true' : 'false'); });
        if (key === 'reset') { diag.hidden = true; reset.hidden = true; return; }
        var br = BREAKS[key];
        br.edits.forEach(apply);
        document.getElementById(br.tab).click();
        diag.className = 'diag ' + br.kind;
        diag.querySelector('[data-diag-head]').textContent = br.head;
        diag.querySelector('[data-diag-out]').innerHTML = br.out;
        diag.querySelector('[data-diag-note]').innerHTML = br.note;
        diag.hidden = false;
        reset.hidden = false;
        var ins = document.getElementById(br.edits[0][0]).querySelector('.ins');
        if (ins) ins.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });
  });

})();
