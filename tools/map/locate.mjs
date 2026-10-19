// Reads [[lon, lat], ...] on stdin; writes [[stateFips, stateName, countyFips, countyName], ...] to stdout.
// Used only by aggregate.py at build time. Nothing is written to disk.
import fs from 'fs';
import { feature } from 'topojson-client';
import { geoContains } from 'd3-geo';
const topo = JSON.parse(fs.readFileSync(new URL('./node_modules/us-atlas/counties-10m.json', import.meta.url)));
const states = feature(topo, topo.objects.states).features;
const counties = feature(topo, topo.objects.counties).features;
const pts = JSON.parse(fs.readFileSync(0, 'utf8'));
const out = pts.map(p => {
  const s = states.find(f => geoContains(f, p));
  if (!s) return [null, null, null, null];
  const c = counties.find(f => f.id.slice(0, 2) === s.id && geoContains(f, p));
  return [s.id, s.properties.name, c ? c.id : null, c ? c.properties.name : null];
});
process.stdout.write(JSON.stringify(out));
