// Activity map: national view of the six states, drilling down into each state's counties.
//
// - Hover (or keyboard focus on a list item) shows a temporary preview; leaving restores the selection.
// - Click or tap selects. In the national view, selecting a state opens its county view.
// - "All six states" returns to the national view; "Clear selection" removes the selection.
// - Escape clears the selection first, then steps back from a state to the national view.
// The SVG shapes are for pointer users. Every area is also a real button in the list beside the map.
(function () {
  document.querySelectorAll('[data-map]').forEach(function (map) {
    var data = JSON.parse(map.querySelector('[data-map-data]').textContent);
    var states = {}; data.states.forEach(function (s) { states[s.id] = s; });
    var counties = {}; data.counties.forEach(function (c) { counties[c.id] = c; });

    var panes = map.querySelectorAll('[data-pane]');
    var list = map.querySelector('[data-list]');
    var listTitle = map.querySelector('[data-list-title]');
    var crumbNational = map.querySelector('[data-action="national"]');
    var crumbSep = map.querySelector('[data-crumb-sep]');
    var crumbState = map.querySelector('[data-crumb-state]');
    var clearBtn = map.querySelector('[data-action="clear"]');
    var kicker = map.querySelector('[data-readout-kicker]');
    var rName = map.querySelector('[data-readout-name]');
    var rValue = map.querySelector('[data-readout-value]');

    var view = 'national';   // 'national' or a state id
    var selected = null;     // county id selected inside a state view

    function info(kind, id) { return kind === 'state' ? states[id] : counties[id]; }
    function title(kind, id) { var i = info(kind, id); return kind === 'state' ? i.name : i.name + ', ' + i.state; }

    function setReadout(k, n, v, preview) {
      kicker.textContent = k; rName.textContent = n; rValue.textContent = v;
      map.classList.toggle('is-previewing', !!preview);
    }

    function restoreReadout() {
      if (view === 'national') {
        setReadout('Overview', 'Six states with verified removals', 'Choose a state to see its counties.');
      } else if (selected) {
        setReadout('Selected county', title('county', selected), counties[selected].label);
      } else {
        var s = states[view];
        var n = data.counties.filter(function (c) { return c.stateId === view; }).length;
        setReadout('State', s.name, s.label + ' · ' + n + (n === 1 ? ' county' : ' counties') + ' with activity');
      }
    }

    function markShapes() {
      map.querySelectorAll('[data-kind]').forEach(function (el) {
        var on = el.getAttribute('data-kind') === 'county' && el.getAttribute('data-id') === selected;
        el.classList.toggle('is-selected', on);
        if (on && el.tagName.toLowerCase() === 'path') el.parentNode.appendChild(el);  // draw the selected outline above neighbouring borders
      });
      list.querySelectorAll('button[data-id]').forEach(function (b) {
        var on = b.getAttribute('data-kind') === 'county' && b.getAttribute('data-id') === selected;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    function renderList() {
      list.innerHTML = '';
      var items = view === 'national'
        ? data.states.map(function (s) { return { kind: 'state', id: s.id, name: s.name, label: s.label, tier: s.tier }; })
        : data.counties.filter(function (c) { return c.stateId === view; })
            .map(function (c) { return { kind: 'county', id: c.id, name: c.name, label: c.label, tier: c.tier }; });
      listTitle.textContent = view === 'national' ? 'States' : 'Counties with activity in ' + states[view].name;
      items.forEach(function (it) {
        var li = document.createElement('li');
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'map-item';
        b.setAttribute('data-kind', it.kind); b.setAttribute('data-id', it.id);
        if (it.kind === 'county') b.setAttribute('aria-pressed', 'false');
        b.innerHTML = '<i class="t-' + it.tier + '" aria-hidden="true"></i><span class="map-item__name"></span><span class="map-item__value"></span>';
        b.querySelector('.map-item__name').textContent = it.name;
        b.querySelector('.map-item__value').textContent = it.label.replace(' verified kills', '');
        b.setAttribute('aria-label', it.name + ': ' + it.label + (it.kind === 'state' ? '. Show counties.' : ''));
        li.appendChild(b); list.appendChild(li);
      });
    }

    function showView(v, focusTarget) {
      view = v; selected = null;
      panes.forEach(function (p) { p.toggleAttribute('hidden', p.getAttribute('data-pane') !== v); });
      var national = v === 'national';
      crumbSep.hidden = national; crumbState.hidden = national;
      crumbState.textContent = national ? '' : states[v].name;
      if (national) crumbNational.setAttribute('aria-current', 'true'); else crumbNational.removeAttribute('aria-current');
      crumbNational.classList.toggle('is-link', !national);
      map.classList.toggle('is-state-view', !national);
      renderList(); markShapes(); updateClear(); restoreReadout();
      if (focusTarget) focusTarget.focus();
    }

    function updateClear() { clearBtn.hidden = view === 'national' && !selected; clearBtn.textContent = selected ? 'Clear selection' : 'Back to all states'; }

    function select(kind, id) {
      if (kind === 'state') { showView(id, listTitle); return; }
      selected = (selected === id) ? null : id;  // selecting the same county again clears it
      markShapes(); updateClear(); restoreReadout();
    }

    function clear() {
      if (selected) { selected = null; markShapes(); updateClear(); restoreReadout(); }
      else if (view !== 'national') { showView('national', crumbNational); }
    }

    function preview(kind, id) { var i = info(kind, id); setReadout(kind === 'state' ? 'State' : 'County', title(kind, id), i.label, true); }

    // Pointer on shapes
    map.querySelectorAll('[data-kind]').forEach(function (el) {
      var kind = el.getAttribute('data-kind'), id = el.getAttribute('data-id');
      el.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') { el.classList.add('is-hover'); preview(kind, id); } });
      el.addEventListener('pointerleave', function () { el.classList.remove('is-hover'); restoreReadout(); });
      el.addEventListener('click', function () { select(kind, id); });
    });

    // List buttons (keyboard, screen readers, and large touch targets)
    list.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-id]'); if (!b) return;
      select(b.getAttribute('data-kind'), b.getAttribute('data-id'));
    });
    list.addEventListener('pointerover', function (e) {
      var b = e.target.closest('button[data-id]'); if (!b || e.pointerType === 'touch') return;
      var shape = map.querySelector('[data-kind="' + b.getAttribute('data-kind') + '"][data-id="' + b.getAttribute('data-id') + '"]');
      if (shape) shape.classList.add('is-hover');
    });
    list.addEventListener('pointerout', function (e) {
      var b = e.target.closest('button[data-id]'); if (!b) return;
      map.querySelectorAll('.is-hover').forEach(function (s) { s.classList.remove('is-hover'); });
    });

    crumbNational.addEventListener('click', function () { if (view !== 'national') showView('national', crumbNational); });
    clearBtn.addEventListener('click', function () {
      var wasSelected = !!selected; clear();
      if (wasSelected) clearBtn.hidden ? listTitle.focus() : clearBtn.focus();
    });
    map.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (selected || view !== 'national') { e.preventDefault(); clear(); }
    });

    showView('national');
  });
})();
