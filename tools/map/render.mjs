// Renders the public activity map from data/map-activity.json into HTML partials:
//   src/partials/map-full.html     Impact page: national view that drills down into each active state's counties
//   src/partials/map-preview.html  Home page: national view, links to the full map
// Run from the repo root:  node tools/map/render.mjs
//
// Only aggregates from data/map-activity.json are used. No coordinates are read or written here.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { feature, mesh } from 'topojson-client';
import { geoAlbersUsa, geoConicConformal, geoPath, geoCentroid } from 'd3-geo';
import { presimplify, simplify, quantile } from 'topojson-simplify';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const load = () => JSON.parse(fs.readFileSync(path.join(here, 'node_modules/us-atlas/counties-10m.json')));
const simp = q => { const p = presimplify(load()); return simplify(p, quantile(p, q)); };
const topoNational = simp(0.12);   // coarse: whole-country view
const topoState = simp(0.30);      // finer: single-state county views
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/map-activity.json')));

const stateById = Object.fromEntries(data.states.map(s => [s.id, s]));
const countyById = Object.fromEntries(data.counties.map(c => [c.id, c]));
const TIERS = ['1-9', '10-49', '50-999', '1000+'];
const TIER_LABEL = { '1-9': '1–9', '10-49': '10–49', '50-999': '50–999', '1000+': '1,000+' };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const short = l => l.replace(' verified kills', '');

// ---------- National view ----------
function national(width, height, interactive) {
  const t = topoNational;
  const states = feature(t, t.objects.states).features;
  const p = geoPath(geoAlbersUsa().fitExtent([[8, 8], [width - 8, height - 8]], { type: 'FeatureCollection', features: states })).digits(1);
  const land = `<path d="${p(mesh(t, t.objects.nation))}" class="m-land"/>`;
  const borders = `<path d="${p(mesh(t, t.objects.states, (a, b) => a !== b))}" class="m-borders"/>`;
  const active = states.filter(s => stateById[s.id]).map(s => {
    const info = stateById[s.id];
    return interactive
      ? `<path d="${p(s)}" class="m-state t-${info.tier}" data-kind="state" data-id="${s.id}"/>`
      : `<path d="${p(s)}" class="m-state t-${info.tier}"/>`;
  }).join('');
  // Leader labels so small states stay findable
  const labels = interactive ? states.filter(s => stateById[s.id]).map(s => {
    const [cx, cy] = p.centroid(s);
    const off = { '09': [34, 26], '25': [44, -14], '24': [40, 22], '36': [-8, -30] }[s.id];
    if (!off) return '';
    return `<g class="m-callout" aria-hidden="true"><line x1="${cx.toFixed(0)}" y1="${cy.toFixed(0)}" x2="${(cx + off[0]).toFixed(0)}" y2="${(cy + off[1]).toFixed(0)}"/><text x="${(cx + off[0] + (off[0] > 0 ? 4 : -4)).toFixed(0)}" y="${(cy + off[1] + 4).toFixed(0)}" text-anchor="${off[0] > 0 ? 'start' : 'end'}">${{ '09': 'CT', '25': 'MA', '24': 'MD', '36': 'NY' }[s.id]}</text></g>`;
  }).join('') : '';
  return `<svg viewBox="0 0 ${width} ${height}" class="map-svg"${interactive ? ' data-pane="national"' : ''} aria-hidden="true" focusable="false">${land}${active}${borders}${labels}</svg>`;
}

// ---------- Single-state county view ----------
function stateView(stateId, width, height) {
  const t = topoState;
  const st = feature(t, t.objects.states).features.find(s => s.id === stateId);
  const cs = feature(t, t.objects.counties).features.filter(c => c.id.slice(0, 2) === stateId);
  const [lon, lat] = geoCentroid(st);
  const proj = geoConicConformal().parallels([lat - 1.5, lat + 1.5]).rotate([-lon, 0]).fitExtent([[12, 12], [width - 12, height - 12]], st);
  const p = geoPath(proj).digits(1);
  const base = cs.filter(c => !countyById[c.id]).map(c => `<path d="${p(c)}" class="m-county-base"/>`).join('');
  const active = cs.filter(c => countyById[c.id]).map(c => `<path d="${p(c)}" class="m-county t-${countyById[c.id].tier}" data-kind="county" data-id="${c.id}"/>`).join('');
  const lines = `<path d="${p(mesh(t, t.objects.counties, (a, b) => a !== b && a.id.slice(0, 2) === stateId && b.id.slice(0, 2) === stateId))}" class="m-county-lines"/>`;
  const outline = `<path d="${p(st)}" class="m-state-outline"/>`;
  return `<svg viewBox="0 0 ${width} ${height}" class="map-svg" data-pane="${stateId}" hidden aria-hidden="true" focusable="false">${base}${active}${lines}${outline}</svg>`;
}

function legend() {
  return `<div class="map-legend" aria-hidden="true"><span class="label">Verified kills</span>${TIERS.map(t => `<span class="map-legend__item"><i class="t-${t}"></i>${TIER_LABEL[t]}</span>`).join('')}</div>`;
}

function table() {
  const rows = data.states.map(s => {
    const cs = data.counties.filter(c => c.state === s.name);
    return `<tr><th scope="row">${s.name}</th><td>${short(s.label)}</td><td>${cs.map(c => `${c.name} (${short(c.label).replace('Fewer than 10', 'under 10')})`).join(', ')}</td></tr>`;
  }).join('');
  return `<details class="map-table"><summary>View the data as a table</summary><div class="table-wrap"><table class="credits"><thead><tr><th scope="col">State</th><th scope="col">Verified kills</th><th scope="col">Counties with activity</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
}

// Aggregates the browser script needs (names, tiers, labels). Nothing more.
const clientData = {
  states: data.states.map(s => ({ id: s.id, name: s.name, tier: s.tier, label: s.label })),
  counties: data.counties.map(c => ({ id: c.id, name: `${c.name} County`, state: c.state, stateId: c.id.slice(0, 2), tier: c.tier, label: c.label })),
};

const full = `<div class="map" data-map>
  <div class="map-toolbar">
    <nav class="map-crumbs" aria-label="Map level">
      <button type="button" class="map-crumb" data-action="national" aria-current="true">All six states</button>
      <span class="map-crumb-sep" data-crumb-sep hidden aria-hidden="true">/</span>
      <span class="map-crumb map-crumb--here" data-crumb-state hidden></span>
    </nav>
    <button type="button" class="map-clear" data-action="clear" hidden>Clear selection</button>
  </div>
  <div class="map-body">
    <div class="map-stage">
      ${national(960, 600, true)}
      ${data.states.map(s => stateView(s.id, 720, 560)).join('\n      ')}
    </div>
    <div class="map-side">
      <div class="map-readout" aria-live="polite">
        <span class="map-readout__kicker label" data-readout-kicker>Overview</span>
        <span class="map-readout__name" data-readout-name>Six states with verified removals</span>
        <span class="map-readout__value" data-readout-value>Choose a state to see its counties.</span>
      </div>
      <h3 class="map-list-title label" data-list-title tabindex="-1">States</h3>
      <ul class="map-list" data-list></ul>
    </div>
  </div>
  ${legend()}
  ${table()}
  <script type="application/json" data-map-data>${JSON.stringify(clientData)}</script>
</div>`;

const preview = `<a class="map-preview" href="impact.html#map" aria-label="See the full activity map on the Impact page">
  ${national(960, 600, false)}
  ${legend()}
</a>`;

fs.mkdirSync(path.join(root, 'src/partials'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/partials/map-full.html'), full);
fs.writeFileSync(path.join(root, 'src/partials/map-preview.html'), preview);
console.log('map-full', (full.length / 1024).toFixed(1) + 'KB', 'map-preview', (preview.length / 1024).toFixed(1) + 'KB');
