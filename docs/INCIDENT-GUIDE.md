# Guide d'Incident - Diagnostic pas à pas

## Scénario : L'API a passé la CI verte mais elle crashe après 5 minutes en production

Vous recevez une alerte : **"API /health indisponible"**

### Étape 1 : Vérifier le Health Check

```bash
curl http://localhost:3000/health
# Espéré: {"status": "ok", "service": "trainshop-api", ...}
# Obtenu: Connection refused
```

**Diagnostic** : L'API ne répond pas du tout. Cause possible :
- Container crashé
- Service pas lancé
- Port occupé
- Application erreur au démarrage

### Étape 2 : Vérifier le statut du Container

```bash
docker compose ps
```

**Possible 1 : Container Exited**
```
NAME                STATUS
trainshop_api       Exited (1)
trainshop_db        Up (healthy)
trainshop_frontend  Up (running)
```

→ Le container a crashé. Aller à **Étape 3**.

**Possible 2 : Container Running mais Health Timeout**
```
NAME                STATUS
trainshop_api       Up (healthy)  ← La CI a "réussi"
```

→ L'API répond peut-être lentement. Aller à **Étape 4**.

### Étape 3 : Consulter les Logs du Container

```bash
docker compose logs api
```

**Exemple 1 - Erreur de démarrage**
```
Error: Cannot find module 'express'
```

→ Les dépendances ne sont pas installées. Solution :
```bash
docker compose restart api  # Si c'est une erreur transitoire
# OU redéployer avec npm install --omit=dev
```

**Exemple 2 - Erreur de connexion DB**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

→ La DB n'est pas prête. Vérifier :
```bash
docker compose logs db
# Vérifier que PostgreSQL démarre correctement
```

Solution :
```bash
docker compose up -d --wait
# Attend que tous les services soient healthy
```

**Exemple 3 - Erreur au runtime (après quelques heures)**
```
Error: JavaScript heap out of memory
```

→ Fuite mémoire. Vérifier :
```bash
curl http://localhost:3000/metrics | jq '.system.memory_mb'
# Si > 500, c'est anormal pour Node.js
```

Solution : Analyser le code pour les fuites, ou redémarrer temporairement :
```bash
docker compose restart api
```

### Étape 4 : Vérifier les Métriques pour diagnostiquer les erreurs

```bash
curl http://localhost:3000/metrics | jq '.'
```

**Réponse saine**
```json
{
  "requests": {
    "total": 1500,
    "success": 1497,
    "errors": 3,
    "success_rate_percent": "99.8"
  },
  "last_error": null
}
```

→ API saine. Aller à **Étape 5**.

**Réponse inquiétante**
```json
{
  "requests": {
    "total": 100,
    "success": 50,
    "errors": 50,
    "success_rate_percent": "50"
  },
  "last_error": {
    "timestamp": "2026-05-11T12:30:45Z",
    "status": 500,
    "path": "/products"
  }
}
```

→ Taux d'erreur élevé. Aller à **Étape 6**.

### Étape 5 : Tester les Endpoints manuellement

```bash
# Tester /health
curl http://localhost:3000/health -v

# Tester /products (GET)
curl http://localhost:3000/products

# Tester /products (POST)
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","description":"Test","price_cents":1000}'
```

Regarder les réponses et les logs :
```bash
docker compose logs -f api | grep ERROR
```

### Étape 6 : Identifier la cause de l'erreur

**Si erreur 500 sur /products**

```bash
# Option 1 : Vérifier les logs de l'erreur exacte
docker compose logs api --tail=50 | grep -A 5 "ERROR"

# Option 2 : Vérifier la santé de la DB
docker exec trainshop_db psql -U trainshop -d trainshop -c "SELECT COUNT(*) FROM products;"

# Option 3 : Vérifier les requêtes lentes
docker exec trainshop_db psql -U trainshop -d trainshop << EOF
SELECT * FROM pg_stat_activity;
EXPLAIN ANALYZE SELECT * FROM products;
EOF
```

**Si erreur 400 (validation)**

→ Vérifier les paramètres envoyés :
```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"","description":"Test","price_cents":1000}' | jq .
# Réponse: {"error":"name, description et price_cents sont obligatoires"}
```

Solution : Envoyer les bons paramètres.

### Étape 7 : Redémarrer et Vérifier

```bash
# Redémarrer le service spécifique
docker compose restart api

# Attendre que c'est prêt
sleep 5

# Tester immédiatement
curl http://localhost:3000/health

# Vérifier les métriques
curl http://localhost:3000/metrics | jq '.requests.errors'
```

### Étape 8 : Documenter et Corriger

Si l'erreur persiste :

1. **Log le contexte**
   - Heure exacte du problème
   - Erreur exacte
   - Nombre de requêtes affectées

2. **Analyser le code**
   - Quelle route a échoué ?
   - Y a-t-il eu un changement récent ?
   - La CI avait testé cela ?

3. **Appliquer un correctif**
   ```bash
   # Branch hotfix
   git checkout -b hotfix/issue-name
   # Fix le bug
   # Push + test en CI
   git push origin hotfix/issue-name
   ```

4. **Redéployer**
   ```bash
   docker compose up -d --build
   ```

5. **Post-mortem**
   - Pourquoi la CI n'a-t-elle pas détecté ?
   - Ajouter un test ?
   - Améliorer les logs ?

---

## Checklist pour diagnostiquer un incident

- [ ] Vérifier `/health` → Status ?
- [ ] Vérifier `docker compose ps` → Container running ?
- [ ] Vérifier `docker compose logs` → Erreur au démarrage ?
- [ ] Vérifier `/metrics` → Taux d'erreur ?
- [ ] Vérifier `last_error` → Quel endpoint échoue ?
- [ ] Tester l'endpoint manuellement
- [ ] Vérifier la santé de la DB
- [ ] Redémarrer le service
- [ ] Tester à nouveau
- [ ] Documenter la cause

---

## Outils pratiques

```bash
# Voir tous les logs en temps réel
docker compose logs -f api

# Voir les 100 dernières lignes de logs
docker compose logs --tail=100 api

# Voir les logs d'erreur seulement
docker compose logs api | grep ERROR

# Redémarrer et voir les logs
docker compose restart api && docker compose logs -f api

# Test de charge (voir comment ça crash)
while true; do curl -X POST http://localhost:3000/products -H "Content-Type: application/json" -d '{"name":"X","description":"X","price_cents":1}'; done

# Monitoring en temps réel
watch -n 1 'curl -s http://localhost:3000/metrics | jq ".requests"'
```

---

## Niveau d'alerte vs Action

| Success Rate | Alerte | Action |
|---|---|---|
| > 99% | ✓ Vert | Monitoring normal |
| 95-99% | 🟡 Jaune | Observer, pas d'action immédiate |
| 90-95% | 🟠 Orange | Débuter diagnostic |
| < 90% | 🔴 Rouge | Page-on-call, restart immédiate |

---

## Résumé : De la CI verte au diagnostic d'incident

```
┌────────────────────────────────┐
│ GitHub Actions (CI) - VERTE    │
│ ✓ npm test                     │
│ ✓ docker build                 │
│ ✓ /health répond               │
└────────────────────────────────┘
              ↓
┌────────────────────────────────┐
│ Production - 5 min après       │
│ ⚠ /health timeout              │
│ 🔴 Alerte SMS                  │
└────────────────────────────────┘
              ↓
┌────────────────────────────────┐
│ Diagnostic                     │
│ 1. docker compose ps           │
│ 2. docker compose logs         │
│ 3. curl /metrics               │
│ 4. Identification: fuite MEM   │
│ 5. Redémarrer (hotfix)         │
│ 6. Ajouter test pour la CI     │
└────────────────────────────────┘
              ↓
┌────────────────────────────────┐
│ Résolu en < 5 min              │
│ ✓ /health répond               │
│ ✓ Metrics normales             │
│ 📊 RCA (root cause analysis)   │
└────────────────────────────────┘
```

**La CI + l'observabilité = DevOps au quotidien** 🚀
