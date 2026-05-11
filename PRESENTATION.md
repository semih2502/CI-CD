# Guide de Présentation - TrainShop CI/CD

## Comment présenter le projet au professeur

### Option 1 : Présentation interactive avec le script de démo (⏱️ ~10 min)

#### Sur Windows PowerShell :
```powershell
PowerShell -ExecutionPolicy Bypass -File demo.ps1
```

#### Sur Mac/Linux (ou WSL) :
```bash
bash demo.sh
```

**Le script affiche :**
- ✅ Résultats de tous les tests (11/11 passants)
- ✅ Vérification des images Docker
- ✅ Test du health check (/health 200)
- ✅ Logs structurés en JSON
- ✅ Métriques en temps réel (/metrics)
- ✅ Diagnostic automatisé

---

### Option 2 : Présentation visuelle dans le navigateur (⏱️ ~2 min)

Ouvrez simplement le fichier **`demo.html`** dans un navigateur web :

```bash
# Windows
start demo.html

# Mac
open demo.html

# Linux
firefox demo.html
```

**Affiche :**
- Un timeline graphique des 6 phases
- Un tableau récapitulatif
- Des snippets de code/réponses API
- Un design moderne et professionnel

---

### Option 3 : Démonstration manuelle étape par étape

Si vous préférez montrer le code directement :

#### **Étape 1 : Tests** (CI)
```bash
cd api
npm test
```
Montre : 11 tests passants (health, products, observability)

#### **Étape 2 : Container** (Docker + Health)
```bash
docker compose ps
curl http://localhost:3000/health | jq '.'
```
Montre : Container running, status OK, mémoire utilisée

#### **Étape 3 : Logs** (Production)
```bash
docker compose logs -f api --tail=10
```
Montre : Logs au format JSON structuré avec timestamp, method, path, status

#### **Étape 4 : Métriques** (Observabilité)
```bash
curl http://localhost:3000/metrics | jq '.'
```
Montre : Statistiques complètes (requêtes, succès, erreurs, mémoire)

#### **Étape 5 : Diagnostic** (Incident)
```bash
bash diagnose.sh
```
Montre : Script automatisé qui détecte tout problème

---

## 📊 Résumé à présenter au professeur

**"Voici comment j'ai implémenté les 6 phases du DevOps CI/CD :"**

| Phase | Technologie | Statut |
|-------|-------------|--------|
| **1. CI - Tests** | Jest + 11 tests | ✅ Tous passants |
| **2. CI - Docker** | Docker + Docker Compose | ✅ Images construites |
| **3. CI - Health** | GET /health | ✅ 200 OK + enrichi |
| **4. Prod - Logs** | Middleware Express + JSON | ✅ Structurés |
| **5. Prod - Métriques** | GET /metrics endpoint | ✅ Temps réel |
| **6. Prod - Diagnostic** | diagnose.sh + guide | ✅ Automatisé |

---

## 📁 Fichiers clés à montrer

```
.github/
├── workflows/
│   └── ci.yml              ← Pipeline GitHub Actions (8 étapes)
│
api/
├── src/
│   ├── app.js              ← Logs + Métriques middleware
│   ├── server.js           ← Point d'entrée
│   └── db.js               ← Connexion PostgreSQL
├── tests/
│   ├── health.test.js      ← Test /health
│   ├── products.test.js    ← Test CRUD + validations
│   └── observability.test.js ← Test logs + métriques
└── Dockerfile             ← Image Docker

docs/
├── OBSERVABILITY.md       ← Stratégie complète (logs, métriques, alertes)
├── INCIDENT-GUIDE.md      ← Guide diagnostic pas à pas
└── CORRECTION-CI-CD.md    ← Solution du TP

demo.html                 ← Page de présentation interactive
demo.sh                   ← Script de démo (Linux/Mac/WSL)
demo.ps1                  ← Script de démo (Windows PowerShell)
diagnose.sh               ← Diagnostic automatisé
docker-compose.yml        ← Configuration des services
README.md                 ← Documentation complète
```

---

## 🎯 Points clés à souligner

### 1. **La CI valide automatiquement** ✅
- Code non conforme → bloqué
- Tests qui échouent → bloqué
- Docker qui ne build pas → bloqué
- API qui ne démarre pas → bloqué

### 2. **Les logs sont structurés** ✅
```json
{"timestamp":"2026-05-11T12:08:32.981Z","method":"GET","path":"/health","status":200,"duration_ms":1}
```
- Format JSON → facilement parsable (ELK, Splunk, etc.)
- Contient tous les éléments (time, method, path, status, duration)

### 3. **Les métriques sont exposées** ✅
```bash
curl http://localhost:3000/metrics
```
- Total requêtes : 1500
- Taux de succès : 99.8%
- Mémoire utilisée : 45 MB
- Dernière erreur : trackée

### 4. **Le diagnostic est automatisé** ✅
```bash
bash diagnose.sh
```
- Vérifie /health
- Récupère les métriques
- Affiche les logs
- Diagnostic complet < 5 secondes

---

## 💡 Questions du professeur - Réponses

### Q: "Comment ça passe du test local à la production ?"
**R:** La CI (GitHub Actions) teste en local, puis l'image Docker déployée utilise exactement les mêmes logs/métriques. La prod exposé les mêmes endpoints (/health, /metrics) que la CI teste.

### Q: "Que se passe-t-il si un test échoue ?"
**R:** Le workflow GitHub Actions s'arrête tout de suite et refuse la fusion sur `main`. L'équipe peut pas merger du code cassé.

### Q: "Où sont les logs / métriques stockées ?"
**R:** Pour la démo, ils sont visibles en stdout (via `docker logs`). En production réelle, on utiliserait Elasticsearch, Grafana, Datadog, etc. Les logs JSON structurés sont faciles à envoyer vers n'importe quel système.

### Q: "Peut-on monitorer ça en continu ?"
**R:** Absolument. L'endpoint `/metrics` permet de monitorer en permanence. On peut ajouter des alertes si le taux d'erreur dépasse 5%, ou si la mémoire dépasse 300MB, etc.

### Q: "Comment on diagnostique un problème ?"
**R:** On run `bash diagnose.sh` qui affiche :
1. Health de l'API (ok vs error)
2. Taux d'erreur actual
3. Logs récents
4. Statut des containers
5. Commandes pour redémarrer

---

## 📋 Slides de présentation (si demandé)

### Slide 1: Objectif
```
🎯 TrainShop CI/CD
De la validation à la production

Problème : L'équipe testait manuellement
Solution : Pipeline CI/CD automatisée + Observabilité
```

### Slide 2: Les 6 phases
```
1. CI: Code validé (11 tests) ✅
2. CI: Docker OK (images construites) ✅
3. CI: Health OK (/health 200) ✅
4. Prod: Logs visibles (JSON) ✅
5. Prod: Métriques (/metrics) ✅
6. Prod: Incident diagnostiqué rapidement ✅
```

### Slide 3: Architecture
```
GitHub
  ↓ Push
GitHub Actions (CI)
  ↓ 11 tests
Docker Image
  ↓
Container
  ↓
/health ✓
/metrics ✓
/logs ✓
```

### Slide 4: Résultat
```
✓ Zéro code cassé en production
✓ Diagnostic < 5 minutes
✓ Logs et métriques en temps réel
✓ Pipeline 100% automatisée
```

---

## 🚀 Commandes rapides à avoir sous la main

```bash
# Lancer les tests
cd api && npm test

# Vérifier la santé de l'API
curl http://localhost:3000/health | jq '.'

# Voir les métriques
curl http://localhost:3000/metrics | jq '.requests'

# Voir les logs récents
docker compose logs --tail=20 api

# Diagnostic complet
bash diagnose.sh

# Vérifier l'état des containers
docker compose ps
```

---

## 📞 En cas de questions imprévues

**"Qu'est-ce que c'est que Docker Compose ?"**
→ Orchestration de plusieurs containers (API, DB, Frontend) avec un seul fichier `docker-compose.yml`

**"Pourquoi 11 tests et pas plus ?"**
→ Minimal viable : health check (1), products CRUD (3), validations (2), observabilité/métriques (5)

**"Comment on ajoute une alerte ?"**
→ L'endpoint `/metrics` expose tout. C'est facile d'envoyer une requête HTTP dessus depuis Grafana/Prometheus/PagerDuty

**"Combien de temps ça prend ?"**
→ CI : ~2 minutes. Déploiement : ~30 secondes. Diagnostic en cas de souci : <5 minutes

---

## Bonne chance pour la présentation ! 🎓

Astuce finale : montrez le script de démo EN PREMIER pour faire bonne impression, puis explorez le code si le prof demande des détails.
