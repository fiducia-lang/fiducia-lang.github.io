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
})();
