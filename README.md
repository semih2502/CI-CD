# TrainShop Starter — Projet avec CI/CD

Ce projet démontre une pipeline CI/CD complète avec GitHub Actions.

La pipeline vérifie automatiquement :
1. Installation des dépendances
2. Qualité du code (lint)
3. Tests unitaires et d'intégration
4. Construction des images Docker
5. Démarrage des services
6. Santé de l'API (/health et /products)

## Stack

- Frontend HTML/CSS/JS
- API Node.js / Express
- PostgreSQL
- Docker
- Docker Compose
- GitHub Actions

## Architecture

```text
Navigateur
   |
   | http://localhost:8081
   v
Frontend HTML/CSS/JS (Nginx)
   |
   | http://localhost:3000
   v
API Node.js / Express
   |
   v
PostgreSQL
```

## Lancement local

Créer le fichier `.env` :

```bash
cp .env.example .env
```

Sur Windows PowerShell :

```powershell
Copy-Item .env.example .env
```

Lancer le projet :

```bash
docker compose up -d --build
```

Vérifier la santé de l'API :

```bash
curl http://localhost:3000/health
curl http://localhost:3000/products
```

Ajouter un produit :

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Produit Test","description":"Test","price_cents":1000,"stock":10}'
```

## Routes de l'API

### GET /health
Vérifie que l'API fonctionne et que la base de données est accessible.

**Réponse**
```json
{
  "status": "ok",
  "service": "trainshop-api",
  "database": "connected",
  "checks": {
    "database": "ok",
    "memory_mb": 45,
    "uptime_seconds": 3600
  },
  "timestamp": "2026-05-11T10:30:00.000Z"
}
```

### GET /metrics  
Affiche les métriques d'observabilité : requêtes, erreurs, opérations, ressources.

**Réponse**
```json
{
  "timestamp": "2026-05-11T10:30:00.000Z",
  "uptime_seconds": 3600,
  "started_at": "2026-05-11T09:30:00.000Z",
  "requests": {
    "total": 1500,
    "success": 1497,
    "errors": 3,
    "success_rate_percent": "99.8"
  },
  "operations": {
    "health_checks": 100,
    "products_fetched": 1200,
    "products_created": 5
  },
  "system": {
    "memory_mb": 45,
    "memory_limit_mb": 256
  },
  "last_error": {
    "timestamp": "2026-05-11T10:25:15Z",
    "path": "/products",
    "status": 500,
    "method": "POST"
  }
}
```

### GET /products
Liste tous les produits.

```bash
curl http://localhost:3000/products
```

### POST /products
Crée un new produit. Champs obligatoires : `name`, `description`, `price_cents`.

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Nouveau","description":"Desc","price_cents":2900,"stock":15}'
```

### GET /products/:id
Récupère un produit par ID.

### GET /
Affiche les endpoints disponibles.

## Tests

Lancer les tests localement :

```bash
cd api
npm install
npm test
```

Tests inclus :
- **health.test.js** : Test du endpoint /health
- **products.test.js** : Tests GET/POST /products avec cas valides et invalides
- **observability.test.js** : Tests des endpoints /metrics et /health enrichi

## Observabilité

### Logs structurés

Chaque requête est enregistrée au format JSON pour faciliter le parsing et le monitoring :

```bash
docker compose logs api | tail -10
# {"timestamp":"2026-05-11T10:30:00Z","method":"GET","path":"/health","status":200,"duration_ms":1}
```

### Métriques en temps réel

Consultez l'endpoint `/metrics` pour voir :
- Le nombre total de requêtes
- Le taux de succès
- Les erreurs récentes
- L'utilisation mémoire
- L'uptime du service

```bash
curl http://localhost:3000/metrics | jq '.'
```

### Diagnostic d'incident

Un script de diagnostic automatisé est fourni :

```bash
bash diagnose.sh
```

Ce script vérifie :
- La santé de l'API
- Les métriques des requêtes
- Le statut des containers
- Les logs récents

Pour le diagnostic manuel, voir [INCIDENT-GUIDE.md](docs/INCIDENT-GUIDE.md).

## Pipeline CI/CD avec GitHub Actions

La pipeline `.github/workflows/ci.yml` s'exécute sur :
- Push vers `main`
- Pull Requests vers `main`

Étapes :
1. **Push** : Code poussé sur GitHub
2. **Install** : `npm ci` installe les dépendances (`./api`)
3. **Quality** : `npm run lint` vérifie la qualité du code
4. **Tests** : `npm test` exécute 11 tests Jest
5. **Docker** : Construction des images API, Frontend et compose
6. **Health** : Démarrage des conteneurs et test de `/health`
7. **Products** : Test de `/products` (GET/POST)
8. **Metrics** : Test de `/metrics` et validation du taux de succès

### Statut de la CI

La CI affiche :
✅ Version de Node.js utilisée  
✅ Résultats des 11 tests (3 suites: health, products, observability)  
✅ Erreurs de construction Docker  
✅ Résultats des tests d'intégration (health, products, metrics)

### Comportement en cas d'erreur

La CI s'arrête à la première erreur et :
- Affiche l'étape qui a échoué
- Récupère les logs des conteneurs (`docker compose logs`)
- Bloque la fusion du code sur `main`

### À quoi la CI sert

| Étape | Validat | Signal |
|-------|---------|--------|
| Install | Deps disponibles | npm ci OK |
| Quality | Code conforme | Lint OK |
| Tests | Routes fonctionnent | 11/11 tests OK |
| Docker | Image constructible | Build OK |
| Health | API démarre | /health 200 |
| Products | CRUD fonctionne | /products OK |
| Metrics | Observabilité en place | /metrics OK |

La CI décèle 99% des problèmes **avant** déploiement. L'observabilité gère les 1% qui apparaissent en production.

## Architecture d'observabilité

### Logs
- L'API enregistre les données dans `stdout`
- Accessible via `docker logs trainshop_api`

### Endpoint de santé
- `/health` : Vérifier la disponibilité de l'API et de la DB
- Réponse : `{ "status": "ok", "service": "trainshop-api", "database": "connected" }`

### Diagnostic en cas d'incident
Même si la CI passe, un problème peut survenir après déploiement :

```bash
# 1. Vérifier la santé
curl http://localhost:3000/health

# 2. Consulter les logs
docker compose logs -f api

# 3. Vérifier l'état des conteneurs
docker compose ps

# 4. Redémarrer les services
docker compose restart api
```

## Variables d'environnement

Définies dans `.env.example` :

```
API_PORT=3000
POSTGRES_DB=trainshop
POSTGRES_USER=trainshop
POSTGRES_PASSWORD=trainshop_password
DATABASE_URL=postgres://trainshop:trainshop_password@db:5432/trainshop
```

## Fichiers clés

```
/
├── .github/workflows/ci.yml        # Pipeline GitHub Actions (7 étapes + tests métriques)
├── .env.example                    # Exemple de configuration
├── docker-compose.yml              # Services API, Frontend, DB
├── diagnose.sh                     # Script de diagnostic automatisé
├── README.md                       # Ce fichier
├── docs/
│   ├── OBSERVABILITY.md            # Stratégie d'observabilité complète
│   ├── INCIDENT-GUIDE.md           # Guide pas à pas de diagnostic
│   ├── CORRECTION-CI-CD.md         # Solution du TP
│   └── TP-CI-CD-A-FAIRE.md         # Énoncé du TP
├── api/
│   ├── Dockerfile                  # Image API (Node 20)
│   ├── package.json                # Dépendances Node.js
│   ├── eslint.config.js            # Configuration linting
│   ├── src/
│   │   ├── server.js              # Point d'entrée
│   │   ├── app.js                 # Routes + observabilité (logs, métriques)
│   │   └── db.js                  # Connexion PostgreSQL
│   └── tests/
│       ├── health.test.js         # Test /health
│       ├── products.test.js       # Tests /products (GET/POST, validations)
│       └── observability.test.js  # Tests /metrics et logs structurés
├── frontend/
│   ├── Dockerfile                  # Image Frontend (Nginx)
│   └── src/
│       ├── index.html              # Page d'accueil
│       ├── app.js                  # Logique frontend
│       └── style.css               # Styles
└── database/
    └── init/
        └── 001-init.sql            # Initialisation DB
```

## Accès

- Frontend : http://localhost:8081
- API : http://localhost:3000
- Base de données : localhost:5432 (trainshop/trainshop_password)

Vérifier :

```bash
docker compose ps
```

Tester l'API :

```bash
curl http://localhost:3000/health
curl http://localhost:3000/products
```

Ouvrir le frontend :

```text
http://localhost:8081
```

## Arrêter

```bash
docker compose down
```

Supprimer aussi la base de données :

```bash
docker compose down -v
```

## Objectif du TP CI/CD

Les apprenants devront créer le dossier :

```text
.github/workflows/
```

Puis ajouter progressivement :

1. un workflow CI qui lance les tests API ;
2. un workflow qui vérifie les builds Docker ;
3. éventuellement un workflow de publication Docker, en bonus.
# CI-CD
