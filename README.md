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

```bash
curl http://localhost:3000/health
```

Réponse :
```json
{
  "status": "ok",
  "service": "trainshop-api",
  "database": "connected"
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

## Pipeline CI/CD avec GitHub Actions

La pipeline `.github/workflows/ci.yml` s'exécute sur :
- Push vers `main`
- Pull Requests vers `main`

Étapes :
1. **Push** : Code poussé sur GitHub
2. **Install** : `npm ci` installe les dépendances (`./api`)
3. **Quality** : `npm run lint` vérifie la qualité du code
4. **Tests** : `npm test` exécute les tests Jest
5. **Docker** : Construction des images API, Frontend et compose
6. **Health** : Démarrage des conteneurs et test de `/health` et `/products`

### Logs de la CI

La CI affiche :
- Version de Node.js utilisée
- Résultats des tests (nombre de suites et de tests)
- Erreurs de construction Docker
- Résultats des tests d'intégration

### Comportement en cas d'erreur

La CI s'arrête à la première erreur et :
- Affiche l'étape qui a échoué
- Récupère les logs des conteneurs (`docker compose logs`)
- Bloque la fusion du code sur `main`

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
├── .github/workflows/ci.yml        # Pipeline GitHub Actions
├── .env.example                    # Exemple de configuration
├── docker-compose.yml              # Services API, Frontend, DB
├── api/
│   ├── Dockerfile                  # Image API
│   ├── package.json                # Dépendances Node.js
│   ├── src/
│   │   ├── server.js              # Point d'entrée
│   │   ├── app.js                 # Définition des routes
│   │   └── db.js                  # Connexion PostgreSQL
│   └── tests/
│       ├── health.test.js         # Test /health
│       └── products.test.js       # Tests /products
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
