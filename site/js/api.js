// ═══════════════════════════════════════════════════════════
// ORBIS — Accès aux données (fetch, cache, file d'attente GDELT)
// ═══════════════════════════════════════════════════════════

import { API } from './config.js';

const TIMEOUT = 12_000;

/** fetch JSON avec délai maximal et gestion d'erreur homogène. */
export async function getJSON(url, { timeout = TIMEOUT } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * fetch JSON avec cache localStorage (TTL en ms).
 * En cas d'échec réseau, sert la dernière version connue même périmée
 * (marquée stale) plutôt que de casser l'affichage.
 */
export async function getCached(key, url, ttl, { timeout = TIMEOUT } = {}) {
  const storeKey = `orbis:${key}`;
  let entry = null;
  try { entry = JSON.parse(localStorage.getItem(storeKey) || 'null'); } catch { /* cache illisible */ }

  if (entry && Date.now() - entry.t < ttl) {
    return { data: entry.d, stale: false, fromCache: true };
  }
  try {
    const data = await getJSON(url, { timeout });
    try { localStorage.setItem(storeKey, JSON.stringify({ t: Date.now(), d: data })); } catch { /* quota plein */ }
    return { data, stale: false, fromCache: false };
  } catch (err) {
    if (entry) return { data: entry.d, stale: true, fromCache: true };
    throw err;
  }
}

// ─────────────── GDELT : 1 requête toutes les 6 s maximum ───────────────

let gdeltChain = Promise.resolve();
let gdeltLast = 0;

/**
 * Interroge GDELT en respectant sa limite (1 req / 5 s) grâce à une file
 * d'attente globale, avec cache de 5 minutes par requête.
 * En cas d'échec (429, réseau), sert la dernière réponse connue même
 * périmée — marquée `__stale` — plutôt que d'échouer.
 */
export function gdeltSearch(query, { maxrecords = 25, timespan = '36h' } = {}) {
  const params = new URLSearchParams({
    query, mode: 'ArtList', format: 'json',
    maxrecords: String(maxrecords), timespan, sort: 'DateDesc',
  });
  const url = `${API.gdelt}?${params}`;
  const storeKey = `orbis:gdelt:${query}:${timespan}`;

  let entry = null;
  try { entry = JSON.parse(localStorage.getItem(storeKey) || 'null'); } catch { /* ignore */ }
  if (entry && Date.now() - entry.t < 300_000) return Promise.resolve(entry.d);

  gdeltChain = gdeltChain.then(async () => {
    const wait = Math.max(0, gdeltLast + 7_500 - Date.now());
    if (wait) await new Promise(r => setTimeout(r, wait));
    gdeltLast = Date.now();
    const data = await getJSON(url, { timeout: 20_000 });
    if (typeof data !== 'object' || !data) throw new Error('Réponse GDELT invalide');
    try { localStorage.setItem(storeKey, JSON.stringify({ t: Date.now(), d: data })); } catch { /* quota */ }
    return data;
  }).catch(err => {
    gdeltLast = Date.now();
    if (entry) return { ...entry.d, __stale: true };
    throw err;
  });

  const result = gdeltChain;
  // Réarme la chaîne : l'échec d'une requête n'empoisonne pas la suivante
  gdeltChain = gdeltChain.catch(() => {});
  return result;
}

// ─────────────── Utilitaires temps / formats ───────────────

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

export function timeAgo(ts) {
  const s = Math.round((ts - Date.now()) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return rtf.format(s, 'second');
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  return rtf.format(Math.round(s / 86400), 'day');
}

/** "20260705T081500Z" (format GDELT) → timestamp ms */
export function parseGdeltDate(str) {
  if (!str || str.length < 15) return Date.now();
  return Date.UTC(+str.slice(0, 4), +str.slice(4, 6) - 1, +str.slice(6, 8),
    +str.slice(9, 11), +str.slice(11, 13), +str.slice(13, 15));
}

export const fmtNum = new Intl.NumberFormat('fr-FR');

export function fmtPrice(v) {
  const n = +v;
  if (n >= 1000) return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
  if (n >= 10) return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 4 });
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Code ISO alpha-2 → drapeau emoji */
export function flagEmoji(a2) {
  if (!a2 || a2.length !== 2) return '🏳️';
  return String.fromCodePoint(...[...a2.toUpperCase()].map(c => 0x1F1A5 + c.charCodeAt(0)));
}
