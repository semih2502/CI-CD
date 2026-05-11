# TrainShop Starter — Projet sans CI

Ce projet est volontairement simple et ne contient pas encore de GitHub Actions.

L'objectif est que les apprenants créent eux-mêmes la CI/CD pendant le TP.

## Stack

- Frontend HTML/CSS/JS
- API Node.js / Express
- PostgreSQL
- Docker
- Docker Compose

## Architecture

```text
Navigateur
   |
   | http://localhost:8081
   v
Frontend HTML/CSS/JS
   |
   | http://localhost:3000
   v
API Node.js / Express
   |
   v
PostgreSQL
```

## Lancement

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
