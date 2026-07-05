// ═══════════════════════════════════════════════════════════
// ORBIS — Panneaux de données
// Chaque chargeur interroge sa source, met à jour son panneau
// et renvoie les agrégats utilisés par le pouls planétaire.
// ═══════════════════════════════════════════════════════════

import {
  API, CRYPTO, FX_SYMBOLS, WEATHER_CITIES, NEWS_CATEGORIES,
  EONET_CATEGORIES, WMO_CODES, REFRESH,
} from './config.js';
import {
  getJSON, getCached, gdeltSearch, timeAgo, parseGdeltDate,
  fmtPrice, escapeHtml,
} from './api.js';
import { frPlace, frEonetTitle } from './fr.js';

const $ = (id) => document.getElementById(id);

function setStatus(panelId, updatedId, state) {
  const panel = $(panelId);
  panel.classList.toggle('error', state === 'error');
  panel.classList.toggle('stale', state === 'stale');
  const u = $(updatedId);
  if (u) {
    u.textContent = state === 'error' ? 'échec — nouvel essai auto'
      : state === 'stale' ? 'données en cache'
      : `maj ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
}

// ═══════════════ SÉISMES (USGS) ═══════════════

export async function loadQuakes(map, state) {
  try {
    const { data, stale } = await getCached('quakes', API.quakes, REFRESH.quakes);
    const minMag = state.quakeMin;
    const all = data.features || [];
    // Lieux traduits en français (carte, liste et bandeau d'alerte)
    for (const q of all) q.properties.place = frPlace(q.properties.place);
    const shown = all
      .filter(q => (q.properties.mag || 0) >= minMag)
      .sort((a, b) => b.properties.time - a.properties.time);

    map.setQuakes(shown);
    $('quake-count').textContent = `${shown.length} / 24 h`;

    const rows = shown.slice(0, 40).map(q => {
      const m = q.properties.mag || 0;
      const cls = m >= 6 ? 'm6' : m >= 5 ? 'm5' : m >= 4 ? 'm4' : '';
      const [lon, lat] = q.geometry.coordinates;
      return `<button class="row-item" data-lat="${lat}" data-lon="${lon}" title="Voir sur la carte">
        <span class="mag-badge ${cls}">${m.toFixed(1)}</span>
        <span class="row-main">
          <span class="row-title">${escapeHtml(q.properties.place || 'Zone non nommée')}</span>
          <span class="row-sub">${timeAgo(q.properties.time)} · profondeur ${Math.round(q.geometry.coordinates[2])} km</span>
        </span></button>`;
    }).join('');
    $('quakes-list').innerHTML = rows ||
      `<div class="placeholder">Aucun séisme M ≥ ${minMag} sur les dernières 24 h.</div>`;

    $('quakes-list').querySelectorAll('.row-item').forEach(b =>
      b.addEventListener('click', () => map.focus(+b.dataset.lat, +b.dataset.lon)));

    setStatus('panel-quakes', 'quakes-updated', stale ? 'stale' : 'ok');

    // Agrégats pour le pouls + alerte séisme majeur
    const strong = all.filter(q => (q.properties.mag || 0) >= 4.5);
    const maxQ = all.reduce((m, q) => (q.properties.mag > (m?.properties.mag || 0) ? q : m), null);
    state.pulse.quakes = Math.min(30, strong.length * 1.5 + (maxQ?.properties.mag || 0) * 1.5);
    const recentBig = all.find(q => q.properties.mag >= 6.5 && Date.now() - q.properties.time < 2 * 3600_000);
    state.majorQuake = recentBig || null;
  } catch {
    setStatus('panel-quakes', 'quakes-updated', 'error');
  }
}

// ═══════════════ CATASTROPHES (NASA EONET) ═══════════════

export async function loadEonet(map, state) {
  try {
    const { data, stale } = await getCached('eonet', API.eonet, REFRESH.eonet, { timeout: 25_000 });
    const events = (data.events || []).map(ev => {
      const geo = ev.geometry?.[ev.geometry.length - 1];
      const point = geo?.type === 'Point' ? [geo.coordinates[1], geo.coordinates[0]] : null;
      return {
        id: ev.id, title: frEonetTitle(ev.title),
        catId: ev.categories?.[0]?.id || 'manmade',
        date: geo?.date ? Date.parse(geo.date) : null,
        point,
      };
    });

    map.setEonet(events);
    $('eonet-count').textContent = `${events.length} en cours`;

    const byCat = {};
    for (const ev of events) (byCat[ev.catId] ??= []).push(ev);

    let html = '';
    for (const [catId, list] of Object.entries(byCat).sort((a, b) => b[1].length - a[1].length)) {
      const cat = EONET_CATEGORIES[catId] || { icon: '⚠️', label: catId };
      for (const ev of list.slice(0, 8)) {
        html += `<button class="row-item" ${ev.point ? `data-lat="${ev.point[0]}" data-lon="${ev.point[1]}"` : ''}>
          <span class="evt-icon">${cat.icon}</span>
          <span class="row-main">
            <span class="row-title">${escapeHtml(ev.title)}</span>
            <span class="row-sub">${cat.label}${ev.date ? ' · ' + timeAgo(ev.date) : ''}</span>
          </span></button>`;
      }
    }
    $('eonet-list').innerHTML = html || '<div class="placeholder">Aucun événement naturel majeur en cours.</div>';
    $('eonet-list').querySelectorAll('.row-item[data-lat]').forEach(b =>
      b.addEventListener('click', () => map.focus(+b.dataset.lat, +b.dataset.lon)));

    setStatus('panel-disasters', 'eonet-updated', stale ? 'stale' : 'ok');
    state.pulse.eonet = Math.min(25, events.length * 0.8);
  } catch {
    setStatus('panel-disasters', 'eonet-updated', 'error');
  }
}

// ═══════════════ ACTUALITÉS (GDELT) ═══════════════

export function initNewsTabs(state, onSelect) {
  const nav = $('news-tabs');
  nav.innerHTML = NEWS_CATEGORIES.map((c, i) =>
    `<button class="news-tab${i === 0 ? ' active' : ''}" role="tab" data-id="${c.id}">${c.label}</button>`
  ).join('');
  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.news-tab');
    if (!btn) return;
    nav.querySelectorAll('.news-tab').forEach(b => b.classList.toggle('active', b === btn));
    state.newsCat = btn.dataset.id;
    onSelect();
  });
}

let newsRetryTimer = null;

export async function loadNews(state) {
  const cat = NEWS_CATEGORIES.find(c => c.id === state.newsCat) || NEWS_CATEGORIES[0];
  const lang = state.newsLang; // 'fr' | 'en'
  const query = `${cat[lang]} ${lang === 'fr' ? 'sourcelang:fra' : 'sourcelang:eng'}`;
  const listEl = $('news-list');
  try {
    const data = await gdeltSearch(query, { maxrecords: 40 });
    const seen = new Set();
    const arts = (data.articles || []).filter(a => {
      const key = (a.title || '').toLowerCase().replace(/[^a-zà-ÿ0-9]+/g, ' ').trim().slice(0, 70);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 18);

    if (cat.id === 'conflits') {
      state.pulse.news = Math.min(20, (data.articles || []).length / 2.5);
    }

    if (!arts.length) {
      await wikiFallbackNews(listEl);
      scheduleNewsRetry(state);
      setStatus('panel-news', 'news-updated', 'stale');
      return;
    }

    listEl.innerHTML = arts.map(a => {
      const img = a.socialimage && a.socialimage.startsWith('https://')
        ? `<img class="news-thumb" src="${escapeHtml(a.socialimage)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`
        : '';
      return `<a class="row-item news-item" href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">
        ${img}
        <span class="row-main">
          <span class="row-title">${escapeHtml(a.title)}</span>
          <span class="row-sub">${escapeHtml(a.domain || '')} · ${timeAgo(parseGdeltDate(a.seendate))}</span>
        </span></a>`;
    }).join('');

    setStatus('panel-news', 'news-updated', data.__stale ? 'stale' : 'ok');
  } catch {
    if (!listEl.querySelector('.row-item')) {
      await wikiFallbackNews(listEl);
    }
    scheduleNewsRetry(state);
    setStatus('panel-news', 'news-updated', 'error');
  }
}

function scheduleNewsRetry(state) {
  if (newsRetryTimer) return;
  newsRetryTimer = setTimeout(() => {
    newsRetryTimer = null;
    loadNews(state);
  }, 45_000);
}

/**
 * Source de secours : « Dans l'actualité » de Wikipédia (flux Wikimedia,
 * CORS ouvert), utilisée quand GDELT est saturé ou vide.
 * Essaie d'abord Wikipédia en français, puis en anglais.
 */
async function wikiFallbackNews(listEl) {
  const d = new Date();
  const datePath = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`;
  for (const lang of ['fr', 'en']) {
    try {
      const url = `https://api.wikimedia.org/feed/v1/wikipedia/${lang}/featured/${datePath}`;
      const { data } = await getCached(`wikinews:${lang}`, url, 3_600_000);
      const stories = (data.news || []).slice(0, 10);
      if (!stories.length) continue;
      const srcLabel = lang === 'fr' ? 'Wikipédia · Dans l\'actualité' : 'Wikipédia · Dans l\'actualité (en anglais)';
      listEl.innerHTML =
        '<div class="placeholder">Flux presse GDELT momentanément saturé — grands titres du jour via Wikipédia :</div>' +
        stories.map(n => {
          const txt = (n.story || '').replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
            .replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
          const link = n.links?.[0]?.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/`;
          return `<a class="row-item news-item" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">
            <span class="row-main">
              <span class="row-title">${escapeHtml(txt)}</span>
              <span class="row-sub">${srcLabel}</span>
            </span></a>`;
        }).join('');
      return;
    } catch { /* on tente la langue suivante */ }
  }
  listEl.innerHTML = '<div class="placeholder err">Flux presse momentanément indisponible — nouvel essai automatique sous 45 secondes.</div>';
}

/** Volume d'actualités « conflits » pour le pouls, sans toucher à l'affichage. */
export async function probeConflictNews(state) {
  try {
    const cat = NEWS_CATEGORIES.find(c => c.id === 'conflits');
    const data = await gdeltSearch(`${cat.en} sourcelang:eng`, { maxrecords: 50, timespan: '24h' });
    state.pulse.news = Math.min(20, (data.articles || []).length / 2.5);
  } catch { /* le pouls garde sa dernière valeur */ }
}

// ═══════════════ MARCHÉS (Binance + BCE + Fear & Greed) ═══════════════

export async function loadMarkets(state) {
  try {
    const symbols = encodeURIComponent(JSON.stringify(CRYPTO.map(c => c.sym)));
    const tickers = await getJSON(`${API.binance}/ticker/24hr?symbols=${symbols}`);
    const bySym = Object.fromEntries(tickers.map(t => [t.symbol, t]));

    // Ticker défilant (contenu doublé pour une boucle sans couture)
    const items = CRYPTO.map(c => {
      const t = bySym[c.sym];
      if (!t) return '';
      const chg = +t.priceChangePercent;
      return `<span class="ticker-item"><b>${c.code}</b> ${fmtPrice(t.lastPrice)} $
        <span class="${chg >= 0 ? 'up' : 'down'}">${chg >= 0 ? '▲' : '▼'} ${Math.abs(chg).toFixed(2)} %</span></span>`;
    }).join('');
    const fxPart = state.fxTicker || '';
    $('ticker-track').innerHTML = items + fxPart + items + fxPart;

    // Tableau crypto
    $('crypto-body').innerHTML = CRYPTO.map(c => {
      const t = bySym[c.sym];
      if (!t) return '';
      const chg = +t.priceChangePercent;
      return `<tr>
        <td><span class="asset-cell"><span class="asset-sym">${c.code}</span><span class="asset-name">${escapeHtml(c.name)}</span></span></td>
        <td class="px">${fmtPrice(t.lastPrice)} $</td>
        <td class="chg ${chg >= 0 ? 'up' : 'down'}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)} %</td>
        <td class="spark-cell" id="spark-${c.code}"></td>
      </tr>`;
    }).join('');

    state.pulse.markets = Math.min(15,
      CRYPTO.slice(0, 5).reduce((s, c) => s + Math.abs(+(bySym[c.sym]?.priceChangePercent || 0)), 0) / 5 * 2.5);

    setStatus('panel-markets', 'markets-updated', 'ok');
    loadSparklines(); // arrière-plan, non bloquant
  } catch {
    setStatus('panel-markets', 'markets-updated', 'error');
  }
}

let sparkLast = 0;
async function loadSparklines() {
  if (Date.now() - sparkLast < 240_000) return;
  sparkLast = Date.now();
  for (const c of CRYPTO) {
    try {
      const kl = await getJSON(`${API.binance}/klines?symbol=${c.sym}&interval=1h&limit=24`);
      const closes = kl.map(k => +k[4]);
      const cell = document.getElementById(`spark-${c.code}`);
      if (cell) cell.innerHTML = sparkline(closes);
    } catch { /* cellule laissée vide */ }
  }
}

function sparkline(values) {
  if (!values?.length) return '';
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const W2 = 88, H2 = 24, pad = 2;
  const pts = values.map((v, i) => [
    pad + i * (W2 - 2 * pad) / (values.length - 1),
    H2 - pad - (v - min) / span * (H2 - 2 * pad),
  ]);
  const dir = values[values.length - 1] >= values[0] ? 'up' : 'down';
  const line = pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
  const area = `${pad},${H2 - pad} ${line} ${(W2 - pad).toFixed(1)},${H2 - pad}`;
  return `<svg class="spark" viewBox="0 0 ${W2} ${H2}" aria-hidden="true">
    <polygon class="${dir}" points="${area}"/><polyline class="${dir}" points="${line}"/></svg>`;
}

export async function loadFx(state) {
  try {
    const { data, stale } = await getCached('fx', `${API.fx}?base=EUR&symbols=${FX_SYMBOLS.join(',')}`, REFRESH.fx);
    $('fx-grid').innerHTML = FX_SYMBOLS.map(s => {
      const r = data.rates?.[s];
      return r ? `<div class="fx-cell"><div class="fx-pair">EUR / ${s}</div>
        <div class="fx-rate">${(+r).toLocaleString('fr-FR', { maximumFractionDigits: s === 'JPY' ? 2 : 4 })}</div></div>` : '';
    }).join('');
    state.fxTicker = FX_SYMBOLS.slice(0, 4).map(s =>
      `<span class="ticker-item"><b>EUR/${s}</b> ${(+data.rates[s]).toLocaleString('fr-FR', { maximumFractionDigits: 4 })}</span>`
    ).join('');
    if (stale) setStatus('panel-markets', 'markets-updated', 'stale');
  } catch { /* la grille garde son état précédent */ }
}

const FNG_FR = {
  'Extreme Fear': 'Peur extrême', Fear: 'Peur', Neutral: 'Neutre',
  Greed: 'Avidité', 'Extreme Greed': 'Avidité extrême',
};

export async function loadFng(state) {
  try {
    const { data } = await getCached('fng', API.fng, 3_600_000);
    const v = +data.data[0].value;
    const label = FNG_FR[data.data[0].value_classification] || data.data[0].value_classification;
    $('fng-cursor').style.left = `calc(${v}% - 1px)`;
    $('fng-value').textContent = `${v} · ${label}`;
    state.pulse.fng = Math.min(10, Math.abs(v - 50) / 5);
  } catch { /* jauge laissée en l'état */ }
}

// ═══════════════ MÉTÉO (Open-Meteo) ═══════════════

export async function loadWeather() {
  try {
    const lats = WEATHER_CITIES.map(c => c.lat).join(',');
    const lons = WEATHER_CITIES.map(c => c.lon).join(',');
    const url = `${API.meteo}?latitude=${lats}&longitude=${lons}&current=temperature_2m,weather_code,wind_speed_10m`;
    const { data, stale } = await getCached('weather', url, REFRESH.weather);
    const arr = Array.isArray(data) ? data : [data];
    $('weather-grid').innerHTML = WEATHER_CITIES.map((c, i) => {
      const cur = arr[i]?.current;
      if (!cur) return '';
      const [icon, desc] = WMO_CODES[cur.weather_code] || ['🌡️', '—'];
      return `<div class="wx-cell" title="${escapeHtml(desc)} · vent ${Math.round(cur.wind_speed_10m)} km/h">
        <span class="wx-icon">${icon}</span>
        <span class="wx-info"><span class="wx-city">${c.name}</span><br><span class="wx-desc">${desc}</span></span>
        <span class="wx-temp">${Math.round(cur.temperature_2m)}°</span></div>`;
    }).join('');
    setStatus('panel-weather', 'weather-updated', stale ? 'stale' : 'ok');
  } catch {
    setStatus('panel-weather', 'weather-updated', 'error');
  }
}

// ═══════════════ TECH (Hacker News) ═══════════════

export async function loadTech() {
  try {
    const ids = (await getJSON(API.hnTop)).slice(0, 10);
    const items = (await Promise.all(ids.map(id => getJSON(API.hnItem(id)).catch(() => null)))).filter(Boolean);
    $('tech-list').innerHTML = items.map((it, i) => {
      let host = '';
      try { host = it.url ? new URL(it.url).hostname.replace(/^www\./, '') : 'news.ycombinator.com'; } catch { /* url invalide */ }
      const link = it.url || `https://news.ycombinator.com/item?id=${it.id}`;
      return `<a class="row-item" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">
        <span class="hn-rank">${i + 1}</span>
        <span class="row-main">
          <span class="row-title">${escapeHtml(it.title)}</span>
          <span class="hn-meta"><span class="pts">▲ ${it.score || 0}</span> · ${escapeHtml(host)} · ${timeAgo((it.time || 0) * 1000)}</span>
        </span></a>`;
    }).join('');
    setStatus('panel-tech', 'tech-updated', 'ok');
  } catch {
    setStatus('panel-tech', 'tech-updated', 'error');
  }
}

// ═══════════════ ISS ═══════════════

export async function loadISS(map) {
  try {
    const d = await getJSON(API.iss, { timeout: 8000 });
    map.setISS(d.latitude, d.longitude);
  } catch { /* le marqueur garde sa dernière position */ }
}
