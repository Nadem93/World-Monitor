// ═══════════════════════════════════════════════════════════
// ORBIS — Orchestrateur principal
// Initialise la carte, planifie les rafraîchissements,
// anime horloges, pouls planétaire et bandeau d'alerte.
// ═══════════════════════════════════════════════════════════

import { REFRESH, CLOCK_CITIES } from './config.js';
import { WorldMap } from './map.js';
import {
  loadQuakes, loadEonet, loadNews, initNewsTabs, probeConflictNews,
  loadMarkets, loadFx, loadFng, loadWeather, loadTech, loadISS,
} from './panels.js';
import { initCountryDrawer, openCountry } from './country.js';
import { initFr } from './fr.js';
import {
  loadGlobalBarometer, loadMarketCaps, loadTopMovers,
  initCoinDrawer, initConverter,
  loadTrending, loadSectors, loadMacro, loadFxChart,
} from './finance.js';

const $ = (id) => document.getElementById(id);

// ─────────── État global ───────────

const state = {
  newsCat: 'monde',
  newsLang: localStorage.getItem('orbis:lang') || 'fr',
  quakeMin: +(localStorage.getItem('orbis:quakeMin') || 4),
  fxTicker: '',
  majorQuake: null,
  pulse: { quakes: 0, eonet: 0, markets: 0, fng: 0, news: 0 },
};

// ─────────── Horloge UTC + date ───────────

function tickUTC() {
  const now = new Date();
  $('utc-clock').textContent = now.toISOString().slice(11, 19);
  $('utc-date').textContent = now.toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ─────────── Horloges mondiales ───────────

const clockFmts = CLOCK_CITIES.map(c => ({
  ...c,
  fmt: new Intl.DateTimeFormat('fr-FR', { timeZone: c.tz, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  hourFmt: new Intl.DateTimeFormat('fr-FR', { timeZone: c.tz, hour: 'numeric', hour12: false }),
}));

function renderClocks() {
  const strip = $('clocks-strip');
  if (!strip.childElementCount) {
    strip.innerHTML = clockFmts.map((c, i) =>
      `<div class="clock-cell" id="clk-${i}">
        <span class="clock-daynight"></span>
        <span class="clock-city">${c.name}</span>
        <span class="clock-time">--:--</span>
      </div>`).join('');
  }
  const now = new Date();
  clockFmts.forEach((c, i) => {
    const cell = $(`clk-${i}`);
    const h = parseInt(c.hourFmt.format(now), 10);
    const day = h >= 7 && h < 20;
    cell.classList.toggle('day', day);
    cell.classList.toggle('night', !day);
    cell.querySelector('.clock-daynight').textContent = day ? '☀️' : '🌙';
    cell.querySelector('.clock-time').textContent = c.fmt.format(now);
  });
}

// ─────────── Pouls planétaire ───────────

const PULSE_LEVELS = [
  [25, 'Calme', 'var(--teal)'],
  [45, 'Modéré', 'var(--teal)'],
  [62, 'Agité', 'var(--amber)'],
  [80, 'Tendu', 'var(--amber)'],
  [101, 'Critique', 'var(--red)'],
];

function renderPulse() {
  const p = state.pulse;
  const score = Math.min(100, Math.round(p.quakes + p.eonet + p.markets + p.fng + p.news));
  const [, label, color] = PULSE_LEVELS.find(([max]) => score < max);
  $('pulse-value').textContent = score;
  $('pulse-label').textContent = `Pouls · ${label}`;
  const arc = $('pulse-arc');
  arc.style.strokeDashoffset = String(82 * (1 - score / 100));
  arc.style.stroke = color;
}

// ─────────── Bandeau d'alerte ───────────

function renderAlert() {
  const banner = $('alert-banner');
  if (state.majorQuake) {
    const q = state.majorQuake.properties;
    banner.innerHTML = `⚠️ <b>Séisme majeur M ${q.mag.toFixed(1)}</b> — ${q.place || 'localisation en cours'} · ` +
      `<a href="${q.url}" target="_blank" rel="noopener noreferrer" style="color:inherit">détails USGS ↗</a>`;
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
}

// ─────────── Initialisation ───────────

async function init() {
  tickUTC();
  renderClocks();
  setInterval(() => { tickUTC(); renderClocks(); }, 1000);

  // Données pays embarquées
  const countries = await (await fetch('data/countries.json')).json();
  initFr(countries);
  initCountryDrawer(countries);

  // Carte
  const map = new WorldMap($('map-stage'), {
    onCountryClick: (iso, name) => openCountry(iso, name, state),
  });
  try {
    await map.loadCountries('data/world.geo.json', countries);
    $('map-loading').remove();
    $('map-updated').textContent = 'temps réel';
  } catch {
    $('map-loading').textContent = 'Impossible de charger le fond de carte.';
  }
  map.updateNight();

  // Contrôles carte
  $('map-zoom-in').addEventListener('click', () => map.zoom(1 / 1.35));
  $('map-zoom-out').addEventListener('click', () => map.zoom(1.35));
  $('map-reset').addEventListener('click', () => map.reset());
  document.querySelectorAll('.layer-chip input').forEach(cb =>
    cb.addEventListener('change', () => map.setLayerVisible(cb.dataset.layer, cb.checked)));

  // Filtre magnitude
  const qSel = $('quake-min');
  qSel.value = String(state.quakeMin);
  qSel.addEventListener('change', () => {
    state.quakeMin = +qSel.value;
    localStorage.setItem('orbis:quakeMin', qSel.value);
    loadQuakes(map, state).then(() => { renderPulse(); renderAlert(); });
  });

  // Langue des actualités
  const langBtn = $('btn-news-lang');
  const syncLangBtn = () => {
    langBtn.textContent = state.newsLang === 'fr' ? 'FR' : 'INTL';
    langBtn.classList.toggle('active', state.newsLang !== 'fr');
    langBtn.title = state.newsLang === 'fr'
      ? 'Actualités en français — cliquer pour passer en international'
      : 'Actualités internationales — cliquer pour repasser en français';
  };
  syncLangBtn();
  langBtn.addEventListener('click', () => {
    state.newsLang = state.newsLang === 'fr' ? 'en' : 'fr';
    localStorage.setItem('orbis:lang', state.newsLang);
    syncLangBtn();
    loadNews(state);
  });

  // Onglets actualités
  initNewsTabs(state, () => loadNews(state));

  // Finance : fiche crypto, convertisseur, onglets internes
  initCoinDrawer();
  initConverter();
  const finTabs = $('fin-tabs');
  const finLoaded = {};
  finTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.fin-tab');
    if (!btn) return;
    finTabs.querySelectorAll('.fin-tab').forEach(b => b.classList.toggle('active', b === btn));
    const tab = btn.dataset.tab;
    document.querySelectorAll('.fin-pane').forEach(p => { p.hidden = p.dataset.pane !== tab; });
    // Chargements à la demande (une fois par onglet, puis rafraîchis en arrière-plan)
    if (tab === 'movers') { loadTopMovers(); if (!finLoaded.movers) { loadSectors(); finLoaded.movers = 1; } }
    if (tab === 'devises' && !finLoaded.devises) { loadFxChart(); finLoaded.devises = 1; }
    if (tab === 'macro' && !finLoaded.macro) { loadMacro(); finLoaded.macro = 1; }
  });

  // Bouton tout actualiser
  $('btn-refresh').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.classList.add('spin');
    // Invalide les caches de premier niveau
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('orbis:') && !k.startsWith('orbis:lang') && !k.startsWith('orbis:quakeMin')) {
        localStorage.removeItem(k);
      }
    }
    await Promise.allSettled([
      loadQuakes(map, state), loadEonet(map, state), loadMarkets(state),
      loadFx(state), loadFng(state), loadWeather(), loadTech(), loadNews(state),
      loadGlobalBarometer(), loadMarketCaps(),
    ]);
    renderPulse(); renderAlert();
    btn.classList.remove('spin');
  });

  // ─────────── Chargements initiaux (échelonnés) ───────────

  loadQuakes(map, state).then(() => { renderPulse(); renderAlert(); });
  loadEonet(map, state).then(renderPulse);
  // Capitalisations d'abord, puis tableau crypto (pour la colonne Cap.)
  loadMarketCaps().then(() => loadMarkets(state).then(renderPulse));
  loadGlobalBarometer();
  loadTrending();
  loadFx(state).then(() => loadMarkets(state));
  loadFng(state).then(renderPulse);
  loadWeather();
  loadTech();
  loadISS(map);
  loadNews(state);
  setTimeout(() => probeConflictNews(state).then(renderPulse), 15_000);

  // ─────────── Rafraîchissements périodiques ───────────

  setInterval(() => loadQuakes(map, state).then(() => { renderPulse(); renderAlert(); }), REFRESH.quakes);
  setInterval(() => loadEonet(map, state).then(renderPulse), REFRESH.eonet);
  setInterval(() => loadMarkets(state).then(renderPulse), REFRESH.ticker);
  setInterval(() => loadGlobalBarometer(), 300_000);
  setInterval(() => loadMarketCaps(), 300_000);
  setInterval(() => loadTrending(), 600_000);
  setInterval(() => loadFx(state), REFRESH.fx);
  setInterval(() => loadFng(state).then(renderPulse), 3_600_000);
  setInterval(() => loadWeather(), REFRESH.weather);
  setInterval(() => loadTech(), REFRESH.tech);
  setInterval(() => loadISS(map), REFRESH.iss);
  setInterval(() => loadNews(state), REFRESH.news);
  setInterval(() => probeConflictNews(state).then(renderPulse), 900_000);
  setInterval(() => map.updateNight(), REFRESH.night);

  // Rafraîchit la sismicité quand l'onglet redevient visible
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      loadQuakes(map, state).then(() => { renderPulse(); renderAlert(); });
      loadISS(map);
      map.updateNight();
    }
  });
}

init();
