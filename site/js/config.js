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
  coingecko: 'https://api.coingecko.com/api/v3',
  fx:      'https://api.frankfurter.dev/v1/latest',
  fxBase:  'https://api.frankfurter.dev/v1',
  treasury: 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od',
  pyth:      'https://hermes.pyth.network/v2/updates/price/latest',
  pythHist:  'https://benchmarks.pyth.network/v1/shims/tradingview/history',
  fng:     'https://api.alternative.me/fng/?limit=1',
  meteo:   'https://api.open-meteo.com/v1/forecast',
  hnTop:   'https://hacker-news.firebaseio.com/v0/topstories.json',
  hnItem:  (id) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
  iss:     'https://api.wheretheiss.at/v1/satellites/25544',
};

// Cryptomonnaies suivies (symbole Binance, code affiché, nom, identifiant CoinGecko)
export const CRYPTO = [
  { sym: 'BTCUSDT',  code: 'BTC',  name: 'Bitcoin',   cg: 'bitcoin' },
  { sym: 'ETHUSDT',  code: 'ETH',  name: 'Ethereum',  cg: 'ethereum' },
  { sym: 'SOLUSDT',  code: 'SOL',  name: 'Solana',    cg: 'solana' },
  { sym: 'BNBUSDT',  code: 'BNB',  name: 'BNB',       cg: 'binancecoin' },
  { sym: 'XRPUSDT',  code: 'XRP',  name: 'XRP',       cg: 'ripple' },
  { sym: 'ADAUSDT',  code: 'ADA',  name: 'Cardano',   cg: 'cardano' },
  { sym: 'DOGEUSDT', code: 'DOGE', name: 'Dogecoin',  cg: 'dogecoin' },
  { sym: 'AVAXUSDT', code: 'AVAX', name: 'Avalanche', cg: 'avalanche-2' },
  { sym: 'LINKUSDT', code: 'LINK', name: 'Chainlink', cg: 'chainlink' },
  { sym: 'PAXGUSDT', code: 'OR',   name: 'Or (once, jeton PAXG)', cg: 'pax-gold' },
];

// Devises affichées dans la grille (base EUR)
export const FX_SYMBOLS = ['USD', 'GBP', 'JPY', 'CHF', 'CNY', 'CAD'];

// Bourse & matières premières — flux du réseau Pyth (données publiques temps réel)
// Chaque actif : identifiant de flux, symbole TradingView, libellé FR, unité.
export const PYTH_GROUPS = [
  {
    id: 'indices', label: 'Indices mondiaux (ETF)',
    assets: [
      { id: '19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5', sym: 'Equity.US.SPY/USD',  code: 'SPY', name: 'S&P 500' },
      { id: '9695e2b96ea7b3859da9ed25b7a46a920a776e2fdae19a7bcfdf2b219230452d', sym: 'Equity.US.QQQ/USD',  code: 'QQQ', name: 'Nasdaq 100' },
      { id: '57cff3a9a4d4c87b595a2d1bd1bac0240400a84677366d632ab838bbbe56f763', sym: 'Equity.US.DIA/USD',  code: 'DIA', name: 'Dow Jones' },
      { id: 'd407e68cec58205be82a6140a668dc42f8d9079bcf3be4aa4b41f41f7b983035', sym: 'Equity.US.EEM/USD',  code: 'EEM', name: 'Marchés émergents' },
    ],
  },
  {
    id: 'actions', label: 'Grandes valeurs américaines',
    assets: [
      { id: '49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688', sym: 'Equity.US.AAPL/USD',  code: 'AAPL',  name: 'Apple' },
      { id: 'd0ca23c1cc005e004ccf1db5bf76aeb6a49218f43dac3d4b275e92de12ded4d1', sym: 'Equity.US.MSFT/USD',  code: 'MSFT',  name: 'Microsoft' },
      { id: 'b1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593', sym: 'Equity.US.NVDA/USD',  code: 'NVDA',  name: 'Nvidia' },
      { id: '5a48c03e9b9cb337801073ed9d166817473697efff0d138874e0f6a33d6d5aa6', sym: 'Equity.US.GOOGL/USD', code: 'GOOGL', name: 'Alphabet (Google)' },
      { id: 'b5d0e0fa58a1f8b81498ae670ce93c872d14434b72c364885d4fa1b257cbb07a', sym: 'Equity.US.AMZN/USD',  code: 'AMZN',  name: 'Amazon' },
      { id: '78a3e3b8e676a8f73c439f5d749737034b139bbbe899ba5775216fba596607fe', sym: 'Equity.US.META/USD',  code: 'META',  name: 'Meta (Facebook)' },
      { id: '16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1', sym: 'Equity.US.TSLA/USD',  code: 'TSLA',  name: 'Tesla' },
    ],
  },
  {
    id: 'matieres', label: 'Matières premières',
    assets: [
      { id: '765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2', sym: 'Metal.XAU/USD',         code: 'OR',      name: 'Or (once)' },
      { id: 'f2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e', sym: 'Metal.XAG/USD',         code: 'ARGENT',  name: 'Argent (once)' },
      { id: '398e4bbc7cbf89d6648c21e08019d878967677753b3096799595c78f805a34e5', sym: 'Metal.XPT/USD',         code: 'PLATINE', name: 'Platine (once)' },
      { id: '80367e9664197f37d89a07a804dffd2101c479c7c4e8490501bc9d9e1e7f9021', sym: 'Metal.XPD/USD',         code: 'PALLAD.', name: 'Palladium (once)' },
      { id: '925ca92ff005ae943c158e3563f59698ce7e75c5a8c8dd43303a0a154887b3e6', sym: 'Commodities.USOILSPOT', code: 'WTI',     name: 'Pétrole WTI (baril)' },
      { id: '27f0d5e09a830083e5491795cac9ca521399c8f7fd56240d09484b14e614d57a', sym: 'Commodities.UKOILSPOT', code: 'BRENT',   name: 'Pétrole Brent (baril)' },
    ],
  },
];

// Devises proposées dans le convertisseur (code → libellé FR)
export const CONVERT_CURRENCIES = {
  EUR: 'Euro', USD: 'Dollar américain', GBP: 'Livre sterling', JPY: 'Yen japonais',
  CHF: 'Franc suisse', CNY: 'Yuan chinois', CAD: 'Dollar canadien',
  AUD: 'Dollar australien', BRL: 'Réal brésilien', INR: 'Roupie indienne',
  TRY: 'Livre turque', ZAR: 'Rand sud-africain', SGD: 'Dollar de Singapour',
};

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
