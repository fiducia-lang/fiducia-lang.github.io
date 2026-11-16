// Fiducia site behaviour: the keyword cloud, the example file browser and the blog filter.
(function () {
  // Keyword cloud: place words, largest first, on an elliptical spiral out
  // from the centre; every few smaller words stand vertical. Deterministic,
  // so the cloud looks the same on every load.
  document.querySelectorAll('[data-cloud]').forEach(function (root) {
    var items = Array.prototype.slice.call(root.children).sort(function (a, b) {
      return b.dataset.w - a.dataset.w;
    });

    function layout() {
      root.classList.add('is-cloud');
      root.style.height = '';
      var W = root.clientWidth;
      var scale = Math.min(1, Math.max(0.6, W / 820));
      var cx = W / 2, cy = 0, placed = [], pad = 6 * scale;
      var minY = 0, maxY = 0;

      items.forEach(function (li, i) {
        li.style.fontSize = '';
        var fs = Math.max(10, parseFloat(getComputedStyle(li).fontSize) * scale);
        li.style.fontSize = fs + 'px';
        var w = li.offsetWidth, h = li.offsetHeight;
        var vertical = li.dataset.w <= 2 && i % 3 === 0 && W > 480;
        var bw = vertical ? h : w, bh = vertical ? w : h;
        for (var t = 0; t < 4000; t += 1) {
          var a = t * 0.18, r = 2.2 * a;
          var x = cx + r * Math.cos(a) * 1.9 - bw / 2;
          var y = cy + r * Math.sin(a) - bh / 2;
          if (x < 0 || x + bw > W) continue;
          var box = { x: x - pad, y: y - pad / 2, w: bw + 2 * pad, h: bh + pad };
          var hit = placed.some(function (p) {
            return box.x < p.x + p.w && p.x < box.x + box.w && box.y < p.y + p.h && p.y < box.y + box.h;
          });
          if (hit) continue;
          placed.push(box);
          li.dataset.x = x; li.dataset.y = y; li.dataset.v = vertical ? 1 : 0; li.dataset.bh = bh;
          minY = Math.min(minY, y); maxY = Math.max(maxY, y + bh);
          return;
        }
        li.dataset.x = -9999; // no room: hide
      });

      items.forEach(function (li) {
        var x = +li.dataset.x, y = +li.dataset.y - minY;
        li.hidden = x === -9999;
        li.style.transform = li.dataset.v === '1'
          ? 'translate(' + x + 'px,' + (y + +li.dataset.bh) + 'px) rotate(-90deg)'
          : 'translate(' + x + 'px,' + y + 'px)';
      });
      root.style.height = Math.ceil(maxY - minY) + 'px';
    }

    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(layout);
    var timer;
    window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(layout, 120); });
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

  // Agent terminal: plays a short session. The fic and fire lines are real
  // output from fic 2.62.5 on demo/datadiode (abridged, paths shortened).
  var SESSION = [
    ['agent', 'Add a debug tap: let eth_outer read the inner DMA buffer.'],
    ['file', 'eth_outer.fi'],
    ['add', 'Low Mapping peek(inner_dma, 0x2_800_000, "r", false);'],
    ['cmd', 'fic . --check'],
    ['err', 'Error: error: information flow violation: High memory region \'inner_dma\' is accessed through Low mapping \'peek\''],
    ['dim', '  --> ./eth_outer.fi:10:1'],
    ['dim', '   |'],
    ['out', '10 | Low Mapping peek(inner_dma, 0x2_800_000, "r", false);'],
    ['err', '   | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^'],
    ['agent', 'inner_dma is High; eth_outer is the Low side. Removing the tap.'],
    ['file', 'eth_outer.fi'],
    ['del', 'Low Mapping peek(inner_dma, 0x2_800_000, "r", false);'],
    ['cmd', 'fic . --check'],
    ['ok', '  ✓ Parsed 1 system + 3 program files + 3 foreign module(s)'],
    ['dim', '  ⋮'],
    ['ok', '  ✓ Type-checked information flow'],
    ['ok', '  ✓ Checked channel dependency acyclicity (WF2)'],
    ['cmd', 'fire build --target=xta .'],
    ['ok', '  ✓ UPPAAL model written to build/datadiode.xta'],
    ['agent', 'Checks hold. The model is ready for fire verify.']
  ];
  document.querySelectorAll('[data-term]').forEach(function (out) {
    var replay = out.parentNode.querySelector('[data-term-replay]');
    var run = 0, started = false;
    function line(kind, text) {
      var el = document.createElement('span');
      el.className = 'ln ' + kind;
      el.textContent = text;
      out.appendChild(el);
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
        var s = SESSION[i++], typed = s[0] === 'cmd' || s[0] === 'agent';
        if (!typed) { line(s[0], s[1]); setTimeout(step, s[0] === 'err' || s[0] === 'ok' ? 260 : 140); return; }
        var el = line(s[0], ''), k = 0;
        el.appendChild(caret);
        (function type() {
          if (me !== run) return;
          if (k < s[1].length) { caret.before(s[1][k++]); setTimeout(type, s[0] === 'cmd' ? 45 : 22); return; }
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
      text: 'fic turns the program itself into a UPPAAL model, one automaton per domain. Nobody writes the model, so it cannot drift from the code. dd becomes:',
      code: '<span class="k">process</span> Dd() {\n  ...\n<span class="k">trans</span>\n    Init -&gt; init_exit { assign ready(); },\n    init_exit -&gt; Notified { },\n    Notified -&gt; L2 { sync c_o2d?; },\n    L2 -&gt; L3 { assign forward(); },\n    L3 -&gt; Exit { sync d2i_c!; },\n    Exit -&gt; Notified { };\n}',
      cap: 'build/datadiode.xta, generated by fic 2.62.5' },
    { step: 3, lap: 1, kicker: 'Step 3 · per function', title: 'Code verification',
      text: 'Each foreign function\'s contract is proved on its implementation, with Frama-C for C or Viper for Pancake. The proved contract is what the model assumes the function does.',
      code: '<span class="k">/*@ ensures \\result == 0 || \\result == 1; */</span>\nint64_t eth_poll(void);\n\n<span class="k">/*@ ensures \\result.origin == origin; */</span>\nstruct Frame eth_frame(uint8_t origin);',
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
