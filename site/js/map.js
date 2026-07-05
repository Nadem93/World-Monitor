// ═══════════════════════════════════════════════════════════
// ORBIS — Carte mondiale SVG
// Projection équirectangulaire, terminateur jour/nuit calculé,
// couches séismes / catastrophes / ISS, zoom-panoramique, infobulle.
// ═══════════════════════════════════════════════════════════

import { EONET_CATEGORIES, GEO_ID_ALIASES } from './config.js';
import { timeAgo, escapeHtml } from './api.js';

const NS = 'http://www.w3.org/2000/svg';

// Cadre de la carte : longitudes complètes, latitudes 85°N → 60°S
const LAT_TOP = 85, LAT_BOT = -60, SCALE = 4;
const W = 360 * SCALE;                       // 1440
const H = (LAT_TOP - LAT_BOT) * SCALE;       // 580

export const project = (lat, lon) => [
  (lon + 180) * SCALE,
  (LAT_TOP - Math.max(LAT_BOT, Math.min(LAT_TOP, lat))) * SCALE,
];

const el = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

export class WorldMap {
  constructor(stage, { onCountryClick } = {}) {
    this.stage = stage;
    this.onCountryClick = onCountryClick;
    this.tooltip = document.getElementById('map-tooltip');
    this.vb = { x: 0, y: 0, w: W, h: H };
    this.layers = {};
    this.markers = { quakes: [], eonet: [] };
    this.countries = null;

    this.svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'worldmap', role: 'img', 'aria-label': 'Carte du monde' });
    stage.prepend(this.svg);

    this.gGrat = el('g', { class: 'graticule' });
    this.gLand = el('g');
    this.gNight = el('g');
    this.gEonet = el('g');
    this.gQuakes = el('g');
    this.gIss = el('g');
    this.svg.append(this.gGrat, this.gLand, this.gNight, this.gEonet, this.gQuakes, this.gIss);

    this.#drawGraticule();
    this.#bindPanZoom();
    this.#bindTooltip();
  }

  // ─────────── Fond de carte ───────────

  async loadCountries(url, countryData) {
    const geo = await (await fetch(url)).json();
    this.countries = countryData;
    for (const f of geo.features) {
      let id = f.id ?? f.properties?.iso_a3 ?? '';
      id = GEO_ID_ALIASES[id] !== undefined ? GEO_ID_ALIASES[id] : id;
      if (id === 'ATA') continue; // Antarctique hors cadre
      const d = this.#geoPath(f.geometry);
      if (!d) continue;
      const p = el('path', { d, class: 'country' });
      p.dataset.iso = id || '';
      p.dataset.name = f.properties?.name || '';
      this.gLand.appendChild(p);
    }
    this.gLand.addEventListener('click', (e) => {
      const t = e.target.closest('.country');
      if (!t || !this.onCountryClick) return;
      this.gLand.querySelectorAll('.selected').forEach(n => n.classList.remove('selected'));
      t.classList.add('selected');
      this.onCountryClick(t.dataset.iso, t.dataset.name);
    });
  }

  #geoPath(geom) {
    const rings = geom.type === 'Polygon' ? [geom.coordinates]
      : geom.type === 'MultiPolygon' ? geom.coordinates : [];
    let d = '';
    for (const poly of rings) {
      for (const ring of poly) {
        // Sous-échantillonnage léger des très longs anneaux pour la fluidité
        const step = ring.length > 400 ? 2 : 1;
        for (let i = 0; i < ring.length; i += step) {
          const [x, y] = project(ring[i][1], ring[i][0]);
          d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
        }
        d += 'Z';
      }
    }
    return d;
  }

  #drawGraticule() {
    for (let lon = -150; lon <= 150; lon += 30) {
      const [x] = project(0, lon);
      this.gGrat.appendChild(el('line', { x1: x, y1: 0, x2: x, y2: H }));
    }
    for (let lat = -30; lat <= 60; lat += 30) {
      const [, y] = project(lat, 0);
      this.gGrat.appendChild(el('line', { x1: 0, y1: y, x2: W, y2: y }));
    }
  }

  // ─────────── Terminateur jour / nuit ───────────

  updateNight() {
    this.gNight.replaceChildren();
    const now = new Date();
    const doy = (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(now.getUTCFullYear(), 0, 0)) / 86_400_000;
    const rad = Math.PI / 180;

    // Déclinaison solaire (approximation ±0,5°)
    const decl = -23.44 * Math.cos(rad * 360 / 365.24 * (doy + 10));
    // Équation du temps (minutes)
    const B = rad * 360 / 364 * (doy - 81);
    const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    // Longitude subsolaire
    const utcH = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    let sunLon = -15 * (utcH - 12 + eot / 60);
    sunLon = ((sunLon + 540) % 360) - 180;

    // Polygone de nuit : latitude du terminateur pour chaque longitude
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 2) {
      const ha = rad * (lon - sunLon);              // angle horaire
      let lat = Math.atan(-Math.cos(ha) / Math.tan(rad * decl)) / rad;
      pts.push([lat, lon]);
    }
    // Fermeture du polygone par le pôle plongé dans la nuit
    const poleLat = decl > 0 ? -90 : 90;
    const path = [
      ...pts.map(([la, lo]) => project(la, lo)),
      project(poleLat, 180), project(poleLat, -180),
    ].map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join('') + 'Z';
    this.gNight.appendChild(el('path', { d: path, class: 'night-shade' }));

    // Marqueur du point subsolaire
    const [sx, sy] = project(decl, sunLon);
    const sun = el('g', { class: 'sun-marker', transform: `translate(${sx} ${sy})` });
    sun.appendChild(el('circle', { r: 6, fill: 'rgba(255,205,90,.25)' }));
    sun.appendChild(el('circle', { r: 2.6, fill: '#FFD469' }));
    this.gNight.appendChild(sun);
  }

  // ─────────── Couches d'événements ───────────

  setQuakes(features) {
    this.markers.quakes = features;
    this.#renderQuakes();
  }

  #renderQuakes() {
    this.gQuakes.replaceChildren();
    const f = this.zoomFactor();
    for (const q of this.markers.quakes) {
      const [lon, lat] = q.geometry.coordinates;
      const [x, y] = project(lat, lon);
      const mag = q.properties.mag || 0;
      const big = mag >= 6;
      const r = Math.max(1.8, (mag - 1.5) * 1.35) * f;
      if (Date.now() - q.properties.time < 3 * 3600_000) {
        this.gQuakes.appendChild(el('circle', { cx: x, cy: y, r: r * 1.1, class: `quake-ping${big ? ' big' : ''}` }));
      }
      const dot = el('circle', { cx: x, cy: y, r, class: `quake-dot${big ? ' big' : ''}` });
      dot.dataset.tt = JSON.stringify({
        title: `Séisme M ${mag.toFixed(1)}`,
        sub: `${q.properties.place || ''} · ${timeAgo(q.properties.time)} · prof. ${Math.round(q.geometry.coordinates[2])} km`,
      });
      this.gQuakes.appendChild(dot);
    }
  }

  setEonet(events) {
    this.markers.eonet = events;
    this.#renderEonet();
  }

  #renderEonet() {
    this.gEonet.replaceChildren();
    const f = this.zoomFactor();
    for (const ev of this.markers.eonet) {
      if (!ev.point) continue;
      if (ev.point[0] < LAT_BOT || ev.point[0] > LAT_TOP) continue; // hors cadre (zones polaires)
      const [x, y] = project(ev.point[0], ev.point[1]);
      const cat = EONET_CATEGORIES[ev.catId] || { icon: '⚠️', label: 'Événement' };
      const t = el('text', {
        x, y, class: 'eonet-glyph', 'font-size': 13 * f,
        'text-anchor': 'middle', 'dominant-baseline': 'central',
      });
      t.textContent = cat.icon;
      t.dataset.tt = JSON.stringify({ title: ev.title, sub: `${cat.label} · NASA EONET` });
      this.gEonet.appendChild(t);
    }
  }

  setISS(lat, lon) {
    this.gIss.replaceChildren();
    const [x, y] = project(lat, lon);
    const f = this.zoomFactor();
    const g = el('g', { class: 'iss-marker', transform: `translate(${x} ${y})` });
    g.appendChild(el('circle', { r: 2.4 * f, opacity: '.95' }));
    g.appendChild(el('circle', { r: 5.5 * f, fill: 'none', stroke: '#CFE6FF', 'stroke-width': .6 * f, opacity: '.6' }));
    const label = el('text', { x: 8 * f, y: 3 * f, 'font-size': 9 * f });
    label.textContent = 'ISS';
    g.appendChild(label);
    g.dataset.tt = JSON.stringify({
      title: 'Station spatiale internationale',
      sub: `${lat.toFixed(1)}°, ${lon.toFixed(1)}° · ~27 600 km/h`,
    });
    this.gIss.appendChild(g);
  }

  setLayerVisible(name, visible) {
    const g = { quakes: this.gQuakes, eonet: this.gEonet, night: this.gNight, iss: this.gIss }[name];
    if (g) g.style.display = visible ? '' : 'none';
  }

  // ─────────── Zoom / panoramique ───────────

  zoomFactor() { return this.vb.w / W; }

  #applyVB() {
    const { x, y, w, h } = this.vb;
    this.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  }

  #clampVB() {
    this.vb.w = Math.min(W, Math.max(W / 14, this.vb.w));
    this.vb.h = this.vb.w * H / W;
    this.vb.x = Math.max(0, Math.min(W - this.vb.w, this.vb.x));
    this.vb.y = Math.max(0, Math.min(H - this.vb.h, this.vb.y));
  }

  zoom(factor, cx = null, cy = null) {
    const rect = this.svg.getBoundingClientRect();
    const px = cx === null ? .5 : (cx - rect.left) / rect.width;
    const py = cy === null ? .5 : (cy - rect.top) / rect.height;
    const newW = this.vb.w * factor;
    this.vb.x += (this.vb.w - newW) * px;
    this.vb.y += (this.vb.w - newW) * (H / W) * py;
    this.vb.w = newW;
    this.#clampVB();
    this.#applyVB();
    this.#rescaleMarkers();
  }

  reset() {
    this.vb = { x: 0, y: 0, w: W, h: H };
    this.#applyVB();
    this.#rescaleMarkers();
  }

  focus(lat, lon, zoomW = W / 5) {
    const [x, y] = project(lat, lon);
    this.vb.w = zoomW;
    this.vb.h = zoomW * H / W;
    this.vb.x = x - this.vb.w / 2;
    this.vb.y = y - this.vb.h / 2;
    this.#clampVB();
    this.#applyVB();
    this.#rescaleMarkers();
  }

  #rescaleMarkers() {
    clearTimeout(this._rescaleT);
    this._rescaleT = setTimeout(() => { this.#renderQuakes(); this.#renderEonet(); }, 60);
  }

  #bindPanZoom() {
    this.svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom(e.deltaY > 0 ? 1.18 : 1 / 1.18, e.clientX, e.clientY);
    }, { passive: false });

    let drag = null;
    this.svg.addEventListener('pointerdown', (e) => {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, vx: this.vb.x, vy: this.vb.y, moved: false };
    });
    this.svg.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const rect = this.svg.getBoundingClientRect();
      const dx = (e.clientX - drag.x) * this.vb.w / rect.width;
      const dy = (e.clientY - drag.y) * this.vb.h / rect.height;
      if (!drag.moved && Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) {
        drag.moved = true;
        this.svg.classList.add('panning');
        // Capture seulement une fois le déplacement engagé : capturer dès le
        // pointerdown redirigerait aussi le « click » et casserait le clic-pays.
        try { this.svg.setPointerCapture(drag.id); } catch { /* pointeur déjà levé */ }
      }
      if (!drag.moved) return;
      this.vb.x = drag.vx - dx;
      this.vb.y = drag.vy - dy;
      this.#clampVB();
      this.#applyVB();
    });
    const end = (e) => {
      if (drag?.moved) {
        // Empêche le clic-pays après un déplacement
        this.svg.addEventListener('click', (ev) => ev.stopPropagation(), { capture: true, once: true });
      }
      drag = null;
      this.svg.classList.remove('panning');
    };
    this.svg.addEventListener('pointerup', end);
    this.svg.addEventListener('pointercancel', end);
    this.svg.addEventListener('dblclick', () => this.reset());
  }

  // ─────────── Infobulle ───────────

  #bindTooltip() {
    const show = (e) => {
      const t = e.target.closest('[data-tt], .country');
      if (!t) { this.tooltip.hidden = true; return; }
      let title, sub;
      if (t.dataset.tt) {
        ({ title, sub } = JSON.parse(t.dataset.tt));
      } else {
        const c = this.countries?.[t.dataset.iso];
        title = c?.fr || t.dataset.name || 'Territoire';
        sub = c ? `Capitale : ${c.cap || '—'} · Cliquer pour la fiche` : 'Cliquer pour la fiche';
      }
      this.tooltip.innerHTML =
        `<div class="tt-title">${escapeHtml(title)}</div><div class="tt-sub">${escapeHtml(sub)}</div>`;
      this.tooltip.hidden = false;
      const stageRect = this.stage.getBoundingClientRect();
      let tx = e.clientX - stageRect.left + 14;
      let ty = e.clientY - stageRect.top + 12;
      const { offsetWidth: tw, offsetHeight: th } = this.tooltip;
      if (tx + tw > stageRect.width - 8) tx = e.clientX - stageRect.left - tw - 10;
      if (ty + th > stageRect.height - 8) ty = e.clientY - stageRect.top - th - 10;
      this.tooltip.style.transform = `translate(${tx}px, ${ty}px)`;
    };
    this.svg.addEventListener('pointermove', show);
    this.svg.addEventListener('pointerleave', () => { this.tooltip.hidden = true; });
  }
}
