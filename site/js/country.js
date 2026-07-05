// ═══════════════════════════════════════════════════════════
// ORBIS — Fiche pays (volet latéral)
// Données figées en local + météo capitale et presse à la demande.
// ═══════════════════════════════════════════════════════════

import { API, WMO_CODES, REGIONS_FR } from './config.js';
import {
  getJSON, gdeltSearch, timeAgo, parseGdeltDate,
  escapeHtml, flagEmoji, fmtNum,
} from './api.js';
import { frCurrency } from './fr.js';

const drawer = document.getElementById('country-drawer');
const veil = document.getElementById('drawer-veil');
const inner = document.getElementById('drawer-inner');

let COUNTRIES = null;
let currentToken = 0;

export function initCountryDrawer(countries) {
  COUNTRIES = countries;
  veil.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
  });
}

export function closeDrawer() {
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  veil.hidden = true;
}

export function openCountry(iso3, fallbackName, state) {
  const c = COUNTRIES?.[iso3];
  const token = ++currentToken;

  const name = c?.fr || fallbackName || 'Territoire';
  const region = c ? (REGIONS_FR[c.reg] || c.reg) : '';

  inner.innerHTML = `
    <button class="drawer-close" aria-label="Fermer la fiche">✕</button>
    <div class="cd-flag">${c ? flagEmoji(c.a2) : '🏳️'}</div>
    <div class="cd-name">${escapeHtml(name)}</div>
    <div class="cd-region">${escapeHtml(region)}</div>
    ${c ? `<div class="cd-facts">
      <div class="cd-fact"><div class="cd-fact-label">Capitale</div><div class="cd-fact-value">${escapeHtml(c.cap || '—')}</div></div>
      <div class="cd-fact"><div class="cd-fact-label">Population</div><div class="cd-fact-value">${c.pop ? fmtNum.format(c.pop) : '—'}</div></div>
      <div class="cd-fact"><div class="cd-fact-label">Monnaie</div><div class="cd-fact-value">${escapeHtml(frCurrency(c.cur) || '—')}</div></div>
      <div class="cd-fact"><div class="cd-fact-label">Coordonnées</div><div class="cd-fact-value">${c.ll[0]}°, ${c.ll[1]}°</div></div>
    </div>` : '<p class="placeholder">Données de référence indisponibles pour ce territoire.</p>'}
    <div id="cd-weather-block"></div>
    <h3 class="cd-section">Dans la presse</h3>
    <div class="cd-news" id="cd-news"><div class="placeholder">Recherche d'articles récents…</div></div>
  `;
  inner.querySelector('.drawer-close').addEventListener('click', closeDrawer);

  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  veil.hidden = false;
  drawer.scrollTop = 0;

  if (c) loadCapitalWeather(c, token);
  loadCountryNews(c, name, token, state);
}

async function loadCapitalWeather(c, token) {
  try {
    const url = `${API.meteo}?latitude=${c.ll[0]}&longitude=${c.ll[1]}&current=temperature_2m,weather_code,wind_speed_10m`;
    const d = await getJSON(url);
    if (token !== currentToken) return;
    const cur = d.current;
    const [icon, desc] = WMO_CODES[cur.weather_code] || ['🌡️', '—'];
    document.getElementById('cd-weather-block').innerHTML = `
      <h3 class="cd-section">Météo locale</h3>
      <div class="cd-weather">
        <span class="wx-icon">${icon}</span>
        <span><b>${Math.round(cur.temperature_2m)} °C</b> — ${desc}, vent ${Math.round(cur.wind_speed_10m)} km/h</span>
      </div>`;
  } catch { /* section météo simplement absente */ }
}

async function loadCountryNews(c, name, token, state) {
  const target = document.getElementById('cd-news');
  try {
    const en = c?.en || name;
    const lang = state.newsLang === 'fr' ? 'sourcelang:fra' : 'sourcelang:eng';
    const data = await gdeltSearch(`"${en}" ${lang}`, { maxrecords: 15, timespan: '48h' });
    if (token !== currentToken) return;
    const seen = new Set();
    const arts = (data.articles || []).filter(a => {
      const k = (a.title || '').toLowerCase().slice(0, 60);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 8);
    target.innerHTML = arts.map(a =>
      `<a class="row-item" href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">
        <span class="row-main">
          <span class="row-title" style="white-space:normal">${escapeHtml(a.title)}</span>
          <span class="row-sub">${escapeHtml(a.domain || '')} · ${timeAgo(parseGdeltDate(a.seendate))}</span>
        </span></a>`
    ).join('') || '<div class="placeholder">Aucun article récent trouvé.</div>';
  } catch {
    if (token === currentToken) {
      target.innerHTML = '<div class="placeholder err">Flux presse momentanément saturé — réessayez dans quelques secondes.</div>';
    }
  }
}
