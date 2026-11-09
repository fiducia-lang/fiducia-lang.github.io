// Fiducia site behaviour: the keyword cloud, the example file browser and the blog filter.
(function () {
  // Keyword cloud: the keywords, repeated, fill a cloud silhouette row by
  // row in a condensed face, in shades of the site's blue-grey. The <ul>
  // stays for screen readers; the drawn cloud is aria-hidden. Deterministic.
  document.querySelectorAll('[data-cloud]').forEach(function (list) {
    var words = Array.prototype.map.call(list.children, function (li) { return li.textContent; });
    var art = document.createElement('div');
    art.className = 'cloud-art';
    art.setAttribute('aria-hidden', 'true');
    list.parentNode.insertBefore(art, list.nextSibling);
    var shades = ['#e2e8f0', '#93c5fd', '#94a3b8', '#60a5fa', '#cbd5e1', '#64748b', '#bfdbfe'];
    var ctx = document.createElement('canvas').getContext('2d');

    // Cloud outline, in units of the width: a big middle bump, two
    // shoulders, two small end bumps, and a flat base.
    var lobes = [[0.50, 0.22, 0.16], [0.25, 0.36, 0.14], [0.75, 0.34, 0.15], [0.11, 0.47, 0.08], [0.89, 0.46, 0.08]];
    function inside(x, y) {
      for (var i = 0; i < lobes.length; i++) {
        var dx = x - lobes[i][0], dy = y - lobes[i][1];
        if (dx * dx + dy * dy <= lobes[i][2] * lobes[i][2]) return true;
      }
      return (y >= 0.40 && y <= 0.55 && x >= 0.11 && x <= 0.89) || (y >= 0.30 && y <= 0.55 && x >= 0.25 && x <= 0.75);
    }

    function layout() {
      list.classList.add('is-drawn');
      art.textContent = '';
      var W = art.clientWidth, H = Math.round(W * 0.58);
      var rh = Math.max(11, Math.round(W / 46)), fs = rh * 0.95, gap = fs * 0.26;
      var font = '600 ' + fs + 'px Oswald, "IBM Plex Sans", sans-serif';
      ctx.font = font;
      // A queue of keywords: each row takes the first that still fits and
      // sends it to the back, so every keyword keeps recurring.
      var queue = words.map(function (w) { return { w: w, width: ctx.measureText(w).width }; });
      var first = -1, last = 0, k = 0;
      for (var top = 0; top + rh <= H; top += rh) {
        // The runs inside the cloud along both the row's top and bottom edge;
        // a row can have several where bumps meet.
        var y1 = (top + rh * 0.15) / W, y2 = (top + rh * 0.85) / W, runs = [], start = -1;
        for (var px = 0; px <= W + 2; px += 2) {
          var ok = px <= W && inside(px / W, y1) && inside(px / W, y2);
          if (ok && start < 0) start = px;
          if (!ok && start >= 0) { runs.push([start, px - 2]); start = -1; }
        }
        runs.forEach(function (run) {
          var x0 = run[0], span = run[1] - run[0], row = [], used = 0;
          for (;;) {
            var hit = -1;
            for (var q = 0; q < queue.length; q++) {
              if (used + queue[q].width + (row.length ? gap : 0) <= span) { hit = q; break; }
            }
            if (hit < 0) break;
            var item = queue.splice(hit, 1)[0];
            queue.push(item);
            used += item.width + (row.length ? gap : 0);
            row.push(item);
          }
          if (!row.length) return;
          if (first < 0) first = top;
          last = top + rh;
          var extra = row.length > 1 ? Math.min(gap * 4, (span - used) / (row.length - 1)) : 0;
          var x = x0 + (span - used - extra * (row.length - 1)) / 2;
          row.forEach(function (item) {
            var el = document.createElement('span');
            el.textContent = item.w;
            el.dataset.top = top;
            el.style.cssText = 'left:' + x + 'px;font:' + font + ';line-height:' + rh + 'px;color:' + shades[(k * 5 + 3) % shades.length];
            art.appendChild(el);
            x += item.width + gap + extra;
            k++;
          });
        });
      }
      Array.prototype.forEach.call(art.children, function (el) { el.style.top = (el.dataset.top - first) + 'px'; });
      art.style.height = (last - first) + 'px';
    }

    var ready = document.fonts && document.fonts.load ? document.fonts.load('600 20px Oswald') : Promise.resolve();
    ready.then(layout, layout);
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
})();
