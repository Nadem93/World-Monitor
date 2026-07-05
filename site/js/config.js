// ═══════════════════════════════════════════════════════════
// ORBIS — Configuration centrale
// ═══════════════════════════════════════════════════════════

export const REFRESH = {
  ticker:   45_000,      // marchés (ticker + tableau)
  quakes:   120_000,     // USGS
  eonet:    600_000,     // NASA EONET
  news:     300_000,     // GDELT (par catégorie affichée)
  weather:  900_000,     // Open-Meteo
  tech:     600_000,     // Hacker News
  fx:       1_800_000,   // Frankfurter (BCE, mise à jour quotidienne)
  iss:      10_000,      // position ISS
  night:    60_000,      // terminateur jour/nuit
};

export const API = {
  quakes:  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
  eonet:   'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100',
  gdelt:   'https://api.gdeltproject.org/api/v2/doc/doc',
  binance: 'https://data-api.binance.vision/api/v3',
  fx:      'https://api.frankfurter.dev/v1/latest',
  fng:     'https://api.alternative.me/fng/?limit=1',
  meteo:   'https://api.open-meteo.com/v1/forecast',
  hnTop:   'https://hacker-news.firebaseio.com/v0/topstories.json',
  hnItem:  (id) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
  iss:     'https://api.wheretheiss.at/v1/satellites/25544',
};

// Cryptomonnaies suivies (symboles Binance)
export const CRYPTO = [
  { sym: 'BTCUSDT',  code: 'BTC',  name: 'Bitcoin' },
  { sym: 'ETHUSDT',  code: 'ETH',  name: 'Ethereum' },
  { sym: 'SOLUSDT',  code: 'SOL',  name: 'Solana' },
  { sym: 'BNBUSDT',  code: 'BNB',  name: 'BNB' },
  { sym: 'XRPUSDT',  code: 'XRP',  name: 'XRP' },
  { sym: 'DOGEUSDT', code: 'DOGE', name: 'Dogecoin' },
  { sym: 'PAXGUSDT', code: 'OR',   name: 'Or (once, jeton PAXG)' },
];

// Devises affichées (base EUR)
export const FX_SYMBOLS = ['USD', 'GBP', 'JPY', 'CHF', 'CNY', 'CAD'];

// Villes météo (nom FR, lat, lon)
export const WEATHER_CITIES = [
  { name: 'Paris',       lat: 48.85,  lon: 2.35 },
  { name: 'New York',    lat: 40.71,  lon: -74.01 },
  { name: 'Tokyo',       lat: 35.68,  lon: 139.69 },
  { name: 'Londres',     lat: 51.51,  lon: -0.13 },
  { name: 'Moscou',      lat: 55.76,  lon: 37.62 },
  { name: 'Pékin',       lat: 39.90,  lon: 116.41 },
  { name: 'Dubaï',       lat: 25.20,  lon: 55.27 },
  { name: 'Bombay',      lat: 19.08,  lon: 72.88 },
  { name: 'Sydney',      lat: -33.87, lon: 151.21 },
  { name: 'São Paulo',   lat: -23.55, lon: -46.63 },
  { name: 'Le Caire',    lat: 30.04,  lon: 31.24 },
  { name: 'Los Angeles', lat: 34.05,  lon: -118.24 },
];

// Horloges mondiales
export const CLOCK_CITIES = [
  { name: 'Los Angeles', tz: 'America/Los_Angeles' },
  { name: 'New York',    tz: 'America/New_York' },
  { name: 'Paris',       tz: 'Europe/Paris' },
  { name: 'Moscou',      tz: 'Europe/Moscow' },
  { name: 'Dubaï',       tz: 'Asia/Dubai' },
  { name: 'Pékin',       tz: 'Asia/Shanghai' },
  { name: 'Tokyo',       tz: 'Asia/Tokyo' },
  { name: 'Sydney',      tz: 'Australia/Sydney' },
];

// Catégories d'actualités : requêtes GDELT par langue
export const NEWS_CATEGORIES = [
  {
    id: 'monde', label: 'À la une',
    fr: '(monde OR international OR sommet OR crise)',
    en: '("breaking news" OR world OR summit OR crisis)',
  },
  {
    id: 'geo', label: 'Géopolitique',
    fr: '(diplomatie OR géopolitique OR "conseil de sécurité" OR sanctions OR élections)',
    en: '(diplomacy OR geopolitics OR sanctions OR "united nations" OR election)',
  },
  {
    id: 'conflits', label: 'Conflits',
    fr: '(guerre OR conflit OR militaire OR frappes OR offensive)',
    en: '(war OR conflict OR military OR airstrike OR offensive)',
  },
  {
    id: 'eco', label: 'Économie',
    fr: '(économie OR inflation OR "banque centrale" OR récession OR croissance)',
    en: '(economy OR inflation OR "central bank" OR recession OR markets)',
  },
  {
    id: 'climat', label: 'Climat',
    fr: '(climat OR canicule OR sécheresse OR inondations OR "réchauffement climatique")',
    en: '(climate OR wildfire OR drought OR flooding OR "extreme weather")',
  },
  {
    id: 'tech', label: 'Technologie',
    fr: '("intelligence artificielle" OR cyberattaque OR spatial OR technologie)',
    en: '("artificial intelligence" OR cyberattack OR spacex OR semiconductor)',
  },
  {
    id: 'sante', label: 'Santé',
    fr: '(épidémie OR santé OR virus OR OMS OR hôpital)',
    en: '(epidemic OR outbreak OR "world health organization" OR virus)',
  },
];

// Catégories NASA EONET → icône + libellé français
export const EONET_CATEGORIES = {
  wildfires:    { icon: '🔥', label: 'Incendie' },
  severeStorms: { icon: '🌀', label: 'Tempête' },
  volcanoes:    { icon: '🌋', label: 'Volcan' },
  floods:       { icon: '💧', label: 'Inondation' },
  drought:      { icon: '🌵', label: 'Sécheresse' },
  dustHaze:     { icon: '🌫️', label: 'Poussières' },
  earthquakes:  { icon: '⚡', label: 'Séisme' },
  landslides:   { icon: '⛰️', label: 'Glissement' },
  seaLakeIce:   { icon: '🧊', label: 'Glaces' },
  snow:         { icon: '❄️', label: 'Neige' },
  tempExtremes: { icon: '🌡️', label: 'T° extrême' },
  manmade:      { icon: '🏭', label: 'Origine humaine' },
  waterColor:   { icon: '🌊', label: 'Couleur eaux' },
};

// Codes météo WMO → icône + description française
export const WMO_CODES = {
  0:  ['☀️', 'Ciel dégagé'],   1:  ['🌤️', 'Peu nuageux'],  2:  ['⛅', 'Partiellement nuageux'],
  3:  ['☁️', 'Couvert'],       45: ['🌫️', 'Brouillard'],   48: ['🌫️', 'Brouillard givrant'],
  51: ['🌦️', 'Bruine légère'], 53: ['🌦️', 'Bruine'],       55: ['🌧️', 'Bruine dense'],
  61: ['🌧️', 'Pluie faible'],  63: ['🌧️', 'Pluie'],        65: ['🌧️', 'Pluie forte'],
  66: ['🌧️', 'Pluie verglaçante'], 67: ['🌧️', 'Pluie verglaçante'],
  71: ['🌨️', 'Neige faible'],  73: ['🌨️', 'Neige'],        75: ['❄️', 'Neige forte'],
  77: ['❄️', 'Grésil'],        80: ['🌦️', 'Averses'],      81: ['🌧️', 'Averses'],
  82: ['⛈️', 'Averses violentes'], 85: ['🌨️', 'Averses de neige'], 86: ['🌨️', 'Averses de neige'],
  95: ['⛈️', 'Orage'],         96: ['⛈️', 'Orage grêle'],   99: ['⛈️', 'Orage violent'],
};

// Sous-régions anglaises → français (fiche pays)
export const REGIONS_FR = {
  'Western Europe': 'Europe de l’Ouest', 'Eastern Europe': 'Europe de l’Est',
  'Northern Europe': 'Europe du Nord', 'Southern Europe': 'Europe du Sud',
  'Central Europe': 'Europe centrale', 'Southeast Europe': 'Europe du Sud-Est',
  'North America': 'Amérique du Nord', 'South America': 'Amérique du Sud',
  'Central America': 'Amérique centrale', 'Caribbean': 'Caraïbes',
  'Western Africa': 'Afrique de l’Ouest', 'Eastern Africa': 'Afrique de l’Est',
  'Northern Africa': 'Afrique du Nord', 'Southern Africa': 'Afrique australe',
  'Middle Africa': 'Afrique centrale',
  'Western Asia': 'Asie de l’Ouest', 'Eastern Asia': 'Asie de l’Est',
  'Southern Asia': 'Asie du Sud', 'South-Eastern Asia': 'Asie du Sud-Est',
  'Central Asia': 'Asie centrale',
  'Australia and New Zealand': 'Australie et Nouvelle-Zélande',
  'Melanesia': 'Mélanésie', 'Micronesia': 'Micronésie', 'Polynesia': 'Polynésie',
  'Antarctica': 'Antarctique',
};

// Alias d'identifiants entre le fond de carte (GeoJSON) et countries.json
export const GEO_ID_ALIASES = { KOS: 'UNK', CS_KM: 'UNK', '-99': null };
