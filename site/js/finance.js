// ═══════════════════════════════════════════════════════════
// ORBIS — Module finance
// Baromètre crypto mondial, palmarès des variations, fiche
// détaillée d'un actif (graphique multi-échelles) et
// convertisseur de devises. Sources : CoinGecko, Binance, BCE.
// ═══════════════════════════════════════════════════════════

import { API, CRYPTO, CONVERT_CURRENCIES } from './config.js';
import { getJSON, getCached, fmtPrice, escapeHtml } from './api.js';

const $ = (id) => document.getElementById(id);

// Table de correspondance code → nom, alimentée par la config
const CODE_NAME = Object.fromEntries(CRYPTO.map(c => [c.code, c.name]));
// Capitalisations récupérées via CoinGecko, partagées entre panneaux
let marketCaps = {};

// ─────────── Formatage ───────────

/** 1_234_567_890 → « 1,23 Md » ; grandes valeurs en français. */
export function fmtCompact(n) {
  n = +n || 0;
  if (n >= 1e12) return (n / 1e12).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' T';
  if (n >= 1e9) return (n / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' Md';
  if (n >= 1e6) return (n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' M';
  if (n >= 1e3) return (n / 1e3).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' k';
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}

const pct = (v) => `${v >= 0 ? '+' : ''}${(+v).toFixed(2)} %`;
const cls = (v) => (v >= 0 ? 'up' : 'down');

// ═══════════════ Baromètre crypto mondial (CoinGecko /global) ═══════════════

export async function loadGlobalBarometer() {
  try {
    const { data } = await getCached('cg-global', `${API.coingecko}/global`, 300_000);
    const g = data.data;
    const cap = g.total_market_cap.usd;
    const chg = g.market_cap_change_percentage_24h_usd;
    const vol = g.total_volume.usd;
    const btcDom = g.market_cap_percentage.btc;
    const ethDom = g.market_cap_percentage.eth;

    $('baro-cap').textContent = fmtCompact(cap) + ' $';
    const chgEl = $('baro-cap-chg');
    chgEl.textContent = pct(chg);
    chgEl.className = 'baro-chg ' + cls(chg);
    $('baro-vol').textContent = fmtCompact(vol) + ' $';
    $('baro-btc').textContent = btcDom.toFixed(1) + ' %';
    $('baro-eth').textContent = ethDom.toFixed(1) + ' %';
    $('baro-btc-bar').style.width = Math.min(100, btcDom) + '%';
    return true;
  } catch {
    $('baro-cap').textContent = 'indisponible';
    return false;
  }
}

// Capitalisations par symbole, pour enrichir le tableau crypto
export async function loadMarketCaps() {
  try {
    const ids = CRYPTO.map(c => c.cg).join(',');
    const url = `${API.coingecko}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false`;
    const { data } = await getCached('cg-markets', url, 300_000);
    marketCaps = {};
    for (const c of CRYPTO) {
      const row = data.find(d => d.id === c.cg);
      if (row) marketCaps[c.code] = { cap: row.market_cap, ath: row.ath, athChg: row.ath_change_percentage, rank: row.market_cap_rank };
    }
    return marketCaps;
  } catch {
    return marketCaps;
  }
}

export function getMarketCaps() { return marketCaps; }

// ═══════════════ Palmarès des variations 24 h (Binance) ═══════════════

export async function loadTopMovers() {
  const body = $('movers-body');
  if (!body) return;
  try {
    const all = await getJSON(`${API.binance}/ticker/24hr`);
    // Paires en USDT, volume significatif, hors stablecoins et jetons à effet de levier
    const stable = /^(USDC|FDUSD|TUSD|BUSD|DAI|USDP|EUR|AEUR)USDT$/;
    const lev = /(UP|DOWN|BULL|BEAR)USDT$/;
    const usdt = all.filter(t =>
      t.symbol.endsWith('USDT') && !stable.test(t.symbol) && !lev.test(t.symbol) &&
      +t.quoteVolume > 5_000_000 && +t.lastPrice > 0
    ).map(t => ({
      code: t.symbol.replace('USDT', ''),
      price: +t.lastPrice,
      chg: +t.priceChangePercent,
      vol: +t.quoteVolume,
    }));

    const gainers = [...usdt].sort((a, b) => b.chg - a.chg).slice(0, 6);
    const losers = [...usdt].sort((a, b) => a.chg - b.chg).slice(0, 6);

    const rows = (list) => list.map(m => `
      <div class="mover-row" role="button" tabindex="0" data-sym="${m.code}USDT" data-code="${m.code}">
        <span class="mover-code">${escapeHtml(m.code)}</span>
        <span class="mover-price px">${fmtPrice(m.price)} $</span>
        <span class="mover-chg chg ${cls(m.chg)}">${pct(m.chg)}</span>
      </div>`).join('');

    body.innerHTML = `
      <div class="movers-col">
        <div class="movers-head up">▲ Plus fortes hausses</div>
        ${rows(gainers)}
      </div>
      <div class="movers-col">
        <div class="movers-head down">▼ Plus fortes baisses</div>
        ${rows(losers)}
      </div>`;

    body.querySelectorAll('.mover-row').forEach(r => {
      const open = () => openCoinDetail(r.dataset.sym, r.dataset.code);
      r.addEventListener('click', open);
      r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  } catch {
    body.innerHTML = '<div class="placeholder err">Palmarès momentanément indisponible.</div>';
  }
}

// ═══════════════ Fiche détaillée d'un actif (volet) ═══════════════

const drawer = () => $('coin-drawer');
let coinToken = 0;

export function initCoinDrawer() {
  const veil = $('coin-veil');
  veil?.addEventListener('click', closeCoinDetail);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer()?.classList.contains('open')) closeCoinDetail();
  });
}

export function closeCoinDetail() {
  drawer()?.classList.remove('open');
  drawer()?.setAttribute('aria-hidden', 'true');
  $('coin-veil').hidden = true;
}

const TF = [
  { id: '24h', label: '24 h', interval: '1h', limit: 24 },
  { id: '7j',  label: '7 j',  interval: '4h', limit: 42 },
  { id: '30j', label: '30 j', interval: '1d', limit: 30 },
  { id: '1an', label: '1 an', interval: '1w', limit: 52 },
];

export async function openCoinDetail(sym, code) {
  const token = ++coinToken;
  const name = CODE_NAME[code] || code;
  const inner = $('coin-inner');
  inner.innerHTML = `
    <button class="drawer-close" aria-label="Fermer">✕</button>
    <div class="coin-head">
      <div>
        <div class="coin-name">${escapeHtml(name)}</div>
        <div class="coin-code">${escapeHtml(code)} / USDT · Binance</div>
      </div>
      <div class="coin-price-block">
        <div class="coin-price" id="coin-price">—</div>
        <div class="coin-chg" id="coin-chg">—</div>
      </div>
    </div>
    <div class="coin-tf" id="coin-tf" role="tablist">
      ${TF.map((t, i) => `<button class="coin-tf-btn${i === 1 ? ' active' : ''}" data-tf="${t.id}">${t.label}</button>`).join('')}
    </div>
    <div class="coin-chart" id="coin-chart"><div class="placeholder">Chargement du graphique…</div></div>
    <div class="coin-stats" id="coin-stats"></div>
  `;
  inner.querySelector('.drawer-close').addEventListener('click', closeCoinDetail);
  inner.querySelectorAll('.coin-tf-btn').forEach(b => b.addEventListener('click', () => {
    inner.querySelectorAll('.coin-tf-btn').forEach(x => x.classList.toggle('active', x === b));
    drawChart(sym, TF.find(t => t.id === b.dataset.tf), token);
  }));

  drawer().classList.add('open');
  drawer().setAttribute('aria-hidden', 'false');
  $('coin-veil').hidden = false;
  drawer().scrollTop = 0;

  loadCoinHeader(sym, code, token);
  drawChart(sym, TF[1], token); // 7 jours par défaut
}

async function loadCoinHeader(sym, code, token) {
  try {
    const t = await getJSON(`${API.binance}/ticker/24hr?symbol=${sym}`);
    if (token !== coinToken) return;
    const chg = +t.priceChangePercent;
    $('coin-price').textContent = fmtPrice(t.lastPrice) + ' $';
    const chgEl = $('coin-chg');
    chgEl.textContent = pct(chg) + ' (24 h)';
    chgEl.className = 'coin-chg ' + cls(chg);

    const caps = getMarketCaps()[code];
    const stats = [
      ['Plus haut 24 h', fmtPrice(t.highPrice) + ' $'],
      ['Plus bas 24 h', fmtPrice(t.lowPrice) + ' $'],
      ['Volume 24 h', fmtCompact(t.quoteVolume) + ' $'],
      caps?.cap ? ['Capitalisation', fmtCompact(caps.cap) + ' $'] : null,
      caps?.rank ? ['Rang marché', '#' + caps.rank] : null,
      caps?.athChg != null ? ['Depuis le sommet', pct(caps.athChg)] : null,
    ].filter(Boolean);
    $('coin-stats').innerHTML = stats.map(([k, v]) =>
      `<div class="coin-stat"><span class="coin-stat-k">${k}</span><span class="coin-stat-v">${v}</span></div>`
    ).join('');
  } catch { /* en-tête laissé en l'état */ }
}

async function drawChart(sym, tf, token) {
  const box = $('coin-chart');
  try {
    const kl = await getJSON(`${API.binance}/klines?symbol=${sym}&interval=${tf.interval}&limit=${tf.limit}`);
    if (token !== coinToken) return;
    const pts = kl.map(k => ({ t: k[0], c: +k[4] }));
    box.innerHTML = areaChart(pts, tf);
  } catch {
    if (token === coinToken) box.innerHTML = '<div class="placeholder err">Graphique indisponible.</div>';
  }
}

/** Graphique en aire avec axe de dates et repères de prix. */
function areaChart(pts, tf) {
  const W = 372, H = 150, padL = 4, padR = 4, padT = 8, padB = 18;
  const vals = pts.map(p => p.c);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i) => padL + i * (W - padL - padR) / (pts.length - 1);
  const y = (v) => padT + (1 - (v - min) / span) * (H - padT - padB);
  const dir = vals[vals.length - 1] >= vals[0] ? 'up' : 'down';
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join(' ');
  const area = `${padL},${(H - padB).toFixed(1)} ${line} ${(W - padR).toFixed(1)},${(H - padB).toFixed(1)}`;

  // Repères de dates (début, milieu, fin)
  const dfmt = tf.id === '24h'
    ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' });
  const ticks = [0, Math.floor(pts.length / 2), pts.length - 1].map(i =>
    `<text x="${x(i).toFixed(0)}" y="${H - 5}" class="cc-axis" text-anchor="${i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}">${dfmt.format(pts[i].t)}</text>`
  ).join('');

  return `<svg viewBox="0 0 ${W} ${H}" class="cc-svg" preserveAspectRatio="none" aria-label="Graphique de cours">
    <polygon class="cc-area ${dir}" points="${area}"/>
    <polyline class="cc-line ${dir}" points="${line}"/>
    <text x="${W - padR}" y="12" class="cc-price" text-anchor="end">${fmtPrice(max)} $</text>
    <text x="${W - padR}" y="${H - padB}" class="cc-price" text-anchor="end">${fmtPrice(min)} $</text>
    ${ticks}
  </svg>`;
}

// ═══════════════ Convertisseur de devises (BCE / Frankfurter) ═══════════════

let convertRates = null; // taux base EUR, mis en cache

export function initConverter() {
  const from = $('cv-from'), to = $('cv-to'), amount = $('cv-amount'), swap = $('cv-swap');
  if (!from) return;

  const opts = Object.entries(CONVERT_CURRENCIES)
    .map(([code, name]) => `<option value="${code}">${code} — ${name}</option>`).join('');
  from.innerHTML = opts; to.innerHTML = opts;
  from.value = 'EUR'; to.value = 'USD';
  amount.value = '100';

  const run = () => convert();
  [from, to, amount].forEach(el => el.addEventListener('input', run));
  swap.addEventListener('click', () => {
    [from.value, to.value] = [to.value, from.value];
    convert();
  });
  loadConvertRates().then(convert);
}

async function loadConvertRates() {
  try {
    const syms = Object.keys(CONVERT_CURRENCIES).filter(c => c !== 'EUR').join(',');
    const { data } = await getCached('cv-rates', `${API.fx}?base=EUR&symbols=${syms}`, 1_800_000);
    convertRates = { EUR: 1, ...data.rates };
  } catch { /* conversion indisponible tant que les taux manquent */ }
}

function convert() {
  const out = $('cv-result');
  if (!convertRates) { out.textContent = 'Taux en cours de chargement…'; return; }
  const amount = parseFloat($('cv-amount').value.replace(',', '.'));
  const from = $('cv-from').value, to = $('cv-to').value;
  if (!isFinite(amount)) { out.textContent = '—'; return; }
  const rf = convertRates[from], rt = convertRates[to];
  if (!rf || !rt) { out.textContent = 'Devise indisponible'; return; }
  const result = amount * rt / rf;
  out.innerHTML = `<span class="cv-big">${result.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</span> ${to}
    <span class="cv-rate">1 ${from} = ${(rt / rf).toLocaleString('fr-FR', { maximumFractionDigits: 4 })} ${to}</span>`;
}
