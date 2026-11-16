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
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es, ob) {
        if (es[0].isIntersecting && !started) { started = true; play(); ob.disconnect(); }
      }, { threshold: 0.3 }).observe(out);
    } else { play(); }
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
