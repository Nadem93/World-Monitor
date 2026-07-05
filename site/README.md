# ORBIS — Centre de veille mondiale

Tableau de bord de veille mondiale en temps réel, en français, **100 % statique**
(aucun serveur, aucune clé API, aucune dépendance à installer).
Réécriture sur mesure inspirée du projet open-source
[World Monitor](https://github.com/koala73/worldmonitor).

## Fonctionnalités

- **Carte mondiale interactive** (SVG maison, zoom molette, déplacement à la souris,
  double-clic pour revenir à la vue globale)
  - **Terminateur jour/nuit calculé en temps réel** + position du point subsolaire
  - Séismes des dernières 24 h (USGS), avec animation radar sur les récents
  - Catastrophes naturelles en cours (NASA EONET) : incendies, tempêtes, volcans…
  - **Position de l'ISS** actualisée toutes les 10 secondes
  - Couches activables/désactivables, infobulles, clic sur un pays → fiche détaillée
- **Fiche pays** : drapeau, capitale, population, monnaie, région (250 pays,
  données embarquées en local), météo de la capitale et articles de presse récents
- **Pouls planétaire** : indice synthétique expérimental (0–100) combinant
  sismicité, catastrophes ouvertes, volatilité des marchés et volume d'actualités de crise
- **Flux mondial** : presse en direct via GDELT, 7 catégories, bascule
  français / international, avec **source de secours Wikipédia** si GDELT sature
- **Marchés** : ticker défilant, 6 cryptos + or (PAXG) avec tendance 24 h en
  mini-graphiques, devises BCE base EUR, indice Peur & Avidité
- **Météo mondiale** : 12 grandes villes (Open-Meteo)
- **Radar technologique** : top Hacker News
- **Horloges mondiales** : 8 fuseaux avec indicateur jour/nuit
- **Bandeau d'alerte** automatique en cas de séisme majeur (M ≥ 6,5 < 2 h)
- Résilience : cache local par source, données périmées servies en cas de panne,
  nouvel essai automatique, indicateur d'état par panneau

## Sources de données (toutes publiques, sans clé)

| Donnée | Source | Rafraîchissement |
|---|---|---|
| Séismes | USGS | 2 min |
| Catastrophes | NASA EONET | 10 min |
| Presse | GDELT (secours : Wikimedia) | 5 min |
| Crypto | Binance (data-api.binance.vision) | 45 s |
| Devises | Frankfurter / BCE | 30 min |
| Peur & Avidité | alternative.me | 1 h |
| Météo | Open-Meteo | 15 min |
| Tech | Hacker News | 10 min |
| ISS | wheretheiss.at | 10 s |

## Lancer en local

```bash
cd worldmonitor-pro
python3 -m http.server 8765
# puis ouvrir http://127.0.0.1:8765
```

⚠️ Toujours servir en `http://` — ouvrir `index.html` en `file://` bloque les modules JS.

## Déployer sur Netlify

Glisser-déposer le dossier `worldmonitor-pro` entier dans l'onglet **Deploys**
du site Netlify. Aucune étape de build, aucune variable d'environnement.

## Structure

```
worldmonitor-pro/
├── index.html          Structure de la page
├── css/style.css       Design complet (thème « salle de contrôle »)
├── js/
│   ├── config.js       Sources, villes, catégories, libellés FR
│   ├── api.js          fetch + cache + file d'attente GDELT
│   ├── map.js          Carte SVG, projection, terminateur, couches
│   ├── panels.js       Panneaux de données
│   ├── country.js      Fiche pays
│   └── main.js         Orchestration et rafraîchissements
├── data/
│   ├── world.geo.json  Fond de carte (179 pays)
│   └── countries.json  250 pays : noms FR/EN, capitale, population…
└── assets/favicon.svg
```

## Notes

- GDELT limite à 1 requête / 5 s **par adresse IP** : l'application espace ses
  requêtes (7,5 s) et bascule sur Wikipédia si la limite est atteinte.
- Le « pouls planétaire » n'a aucune valeur prédictive.
- Préférences (langue presse, filtre magnitude) conservées dans le navigateur.
