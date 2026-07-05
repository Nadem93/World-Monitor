// ═══════════════════════════════════════════════════════════
// ORBIS — Francisation des données anglophones
// Les flux USGS / EONET / pays arrivent en anglais : ce module
// traduit lieux, titres d'événements et monnaies en français.
// ═══════════════════════════════════════════════════════════

let COUNTRY_EN_FR = [];

/** À appeler une fois avec data/countries.json chargé. */
export function initFr(countries) {
  COUNTRY_EN_FR = Object.values(countries)
    .filter(c => c.en && c.fr && c.en !== c.fr)
    .map(c => [c.en, c.fr])
    // Les noms longs d'abord pour éviter les remplacements partiels
    .sort((a, b) => b[0].length - a[0].length);
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function frCountries(text) {
  let out = text;
  for (const [en, fr] of COUNTRY_EN_FR) {
    if (out.includes(en)) out = out.replace(new RegExp(`\\b${escRe(en)}\\b`, 'g'), fr);
  }
  return out;
}

// Points cardinaux : W → O, mots complets pour les directions simples
const DIR_WORD = { N: 'nord', S: 'sud', E: 'est', W: 'ouest' };
const dirFr = (d) => d.replace(/W/g, 'O');
const dirPhrase = (d) => {
  const t = d.length === 1 ? DIR_WORD[d] : dirFr(d);
  return /^[EOe]/.test(t) ? `à l'${t}` : `au ${t}`;
};

/**
 * Traduit un lieu USGS : « 51 km SSW of Atico, Peru » →
 * « à 51 km au SSO de Atico, Pérou ». Idempotent (réappliquer ne casse rien).
 */
const CARDINAL_FR = {
  north: 'au nord', south: 'au sud', east: 'à l\'est', west: 'à l\'ouest',
  northeast: 'au nord-est', northwest: 'au nord-ouest',
  southeast: 'au sud-est', southwest: 'au sud-ouest',
};

export function frPlace(place) {
  if (!place) return place;
  let p = frCountries(place);
  p = p.replace(/^(\d+)\s*km\s+([NSEW]{1,3})\s+of\s+/i,
    (_, km, dir) => `à ${km} km ${dirPhrase(dir.toUpperCase())} de `);
  p = p.replace(/^(north|south|east|west|northeast|northwest|southeast|southwest)(?:ern)?\s+of\s+(?:the\s+)?/i,
    (_, dir) => `${CARDINAL_FR[dir.toLowerCase()]} de `);
  p = p.replace(/^off the coast of\s+/i, 'au large de ');
  p = p.replace(/^near the coast of\s+/i, 'près des côtes de ');
  p = p.replace(/^near\s+/i, 'près de ');
  p = p.replace(/\s+region\b/gi, ' (région)');
  p = p.replace(/((?:[A-Z][\w'’.-]*\s)+)Islands\b/g, (_, names) => `îles ${names.trim()}`);
  p = p.replace(/((?:[A-Z][\w'’.-]*\s)+)Island\b/g, (_, names) => `île ${names.trim()}`);
  p = p.replace(/\bRidge\b/g, '(dorsale)');
  p = p.replace(/\bPeninsula\b/g, '(péninsule)');
  p = p.replace(/\bde îles/g, 'des îles');       // « au sud de îles Fidji » → « des îles Fidji »
  p = p.replace(/\bde île/g, 'de l\'île');
  p = p.replace(/\bde ([AEIOUYÉÈÎÔ])/g, 'd\'$1'); // élision : « de Atico » → « d'Atico »
  return p;
}

// Motifs de titres EONET → tournures françaises
const EONET_PATTERNS = [
  [/^Tropical Cyclone\s+(.+)$/i, 'Cyclone tropical $1'],
  [/^Tropical Storm\s+(.+)$/i, 'Tempête tropicale $1'],
  [/^Tropical Depression\s+(.+)$/i, 'Dépression tropicale $1'],
  [/^Hurricane\s+(.+)$/i, 'Ouragan $1'],
  [/^Typhoon\s+(.+)$/i, 'Typhon $1'],
  [/^Super Typhoon\s+(.+)$/i, 'Super typhon $1'],
  [/^Cyclone\s+(.+)$/i, 'Cyclone $1'],
  [/^(.*?)\s*Wildfires?\b(.*)$/i, (_, a, b) => `Incendie${a ? ' ' + a : ''}${b}`],
  [/^(.*?)\s*Volcano\b(.*)$/i, (_, a, b) => `Volcan${a ? ' ' + a : ''}${b}`],
  [/^Flooding\s+(?:in|of)\s+(.+)$/i, 'Inondations : $1'],
  [/^Floods?\b(.*)$/i, 'Inondations$1'],
  [/^Drought\b(.*)$/i, 'Sécheresse$1'],
  [/^Landslide\b(.*)$/i, 'Glissement de terrain$1'],
  [/^Severe Storms?\b(.*)$/i, 'Fortes tempêtes$1'],
  [/^Dust Storm\b(.*)$/i, 'Tempête de poussière$1'],
  [/^Earthquake\b(.*)$/i, 'Séisme$1'],
];

/** Traduit un titre NASA EONET (« Median Wildfire, Gooding, Idaho » → « Incendie Median, … »). */
export function frEonetTitle(title) {
  if (!title) return title;
  let t = frCountries(title);
  for (const [re, rep] of EONET_PATTERNS) {
    if (re.test(t)) { t = t.replace(re, rep); break; }
  }
  return t;
}

const currencyNames = new Intl.DisplayNames('fr', { type: 'currency' });

/**
 * « Brazilian real (BRL), … » → « réal brésilien (BRL), … »
 * via Intl ; retombe sur le libellé anglais si le code est inconnu.
 */
export function frCurrency(curField) {
  if (!curField) return curField;
  return curField.split(', ').map(part => {
    const m = part.match(/\(([A-Z]{3})\)/);
    if (!m) return part;
    try {
      const name = currencyNames.of(m[1]);
      return name && name !== m[1] ? `${name} (${m[1]})` : part;
    } catch { return part; }
  }).join(', ');
}
