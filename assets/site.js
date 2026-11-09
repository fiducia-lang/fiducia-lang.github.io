// Fiducia site behaviour: the example file browser and the blog filter.
(function () {
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
