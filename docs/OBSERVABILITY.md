# Observabilité & Diagnostic après déploiement

## Objectif

Transformer une CI verte en confiance de production :

```
Code validé par GitHub Actions
  ↓
Image Docker construite
  ↓
Container lancé
  ↓
/health testé
  ↓
Application observée après déploiement ← VOUS ÊTES ICI
  ↓
Incident diagnostiqué rapidement
```

## 1. Qu'est-ce que la CI valide ?

### ✅ Ce que GitHub Actions vérifie

| Étape | Vérification | Signal |
|-------|-------------|--------|
| **Install** | `npm ci` réussit | Dépendances disponibles |
| **Quality** | `npm run lint` passe | Code conforme aux règles |
| **Tests** | 5 tests Jest passent | Endpoints fonctionnent en local |
| **Docker** | `docker build` réussit | Image constructible |
| **Health** | `curl /health` répond | Container démarre |

### ❌ Ce que la CI ne peut pas garantir

| Risque | Scenario |
|--------|----------|
| **Crash après démarrage** | Service tombe 5 minutes après le déploiement |
| **Fuite mémoire** | Utilisation mémoire augmente progressivement |
| **DB inaccessible en prod** | Variables d'env incorrectes en production |
| **Requête SQL lente** | Performance dégradée sous charge réelle |
| **Endpoint non testé** | Route omise dans la CI (ex: `/stats`) |
| **Donnée corrompue** | Erreur lors du traitement d'une vraie requête |

**CONCLUSION** : La CI valide le "happy path" local. L'observabilité en production valide le comportement réel.

---

## 2. Architecture d'observabilité proposée

### Couches d'observation

```
┌─────────────────────────────────┐
│      Dashboard / Alertes        │  Vue opérationnelle
├─────────────────────────────────┤
│   Métriques + Logs              │  Données brutes
├─────────────────────────────────┤
│   Application (Express.js)      │  Source
└─────────────────────────────────┘
```

---

## 3. Implémentation pour TrainShop

### A. Logs structurés

**Objectif** : Chaque requête et erreur doit être enregistrée.

#### Implémenter un middleware de logs

Ajouter à `api/src/app.js` (après `app.use(cors())`) :

```javascript
// Logger middleware - log chaque requête
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
      remote_addr: req.ip
    }));
  });
  
  next();
});

// Error handler
app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  }));
  
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});
```

#### Accéder aux logs

```bash
# En local
docker compose logs -f api

# En production (exemple)
docker logs trainshop_api -f
```

### B. Métriques simples

**Objectif** : Mesurer la disponibilité, les erreurs et la performance.

#### Ajouter un endpoint `/metrics`

Ajouter à `api/src/app.js` (avant `module.exports = app`) :

```javascript
let metrics = {
  total_requests: 0,
  total_errors: 0,
  total_success: 0,
  products_created: 0,
  products_fetched: 0,
  health_checks: 0,
  last_error: null
};

// Middleware pour compter les requêtes
app.use((req, res, next) => {
  metrics.total_requests++;
  
  // Écouter la réponse
  const originalStatus = res.statusCode;
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      metrics.total_errors++;
      metrics.last_error = {
        timestamp: new Date().toISOString(),
        path: req.path,
        status: res.statusCode
      };
    } else {
      metrics.total_success++;
    }
  });
  
  next();
});

// Incrémenter les compteurs spécifiques dans les handlers
app.get('/health', async (req, res) => {
  metrics.health_checks++;
  // ... reste du code
});

app.get('/products', async (req, res) => {
  metrics.products_fetched++;
  // ... reste du code
});

app.post('/products', async (req, res) => {
  metrics.products_created++;
  // ... reste du code
});

// Endpoint de métriques
app.get('/metrics', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    ...metrics
  });
});
```

#### Consulter les métriques

```bash
curl http://localhost:3000/metrics
```

Réponse :
```json
{
  "timestamp": "2026-05-11T10:30:00Z",
  "uptime_seconds": 3600,
  "total_requests": 150,
  "total_errors": 3,
  "total_success": 147,
  "products_created": 5,
  "products_fetched": 142,
  "health_checks": 100,
  "last_error": {
    "timestamp": "2026-05-11T10:25:15Z",
    "path": "/products",
    "status": 500
  }
}
```

### C. Health check enrichi

**Objectif** : Détecter immédiatement s'il y a un problème.

Le `/health` existant vérifie déjà la DB. Pour améliorer :

```javascript
app.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT 1');
    
    res.json({
      status: 'ok',
      service: 'trainshop-api',
      database: 'connected',
      checks: {
        database: 'ok',
        memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'trainshop-api',
      database: 'unavailable',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

---

## 4. Détection d'incidents après déploiement

### A. Scénario 1 : L'API démarre mais crash après quelques secondes

**Signal** :
```bash
curl http://localhost:3000/health
# Connection refused
```

**Diagnostic** :
```bash
# 1. Vérifier si les conteneurs tournent
docker compose ps
# STATUS: Exited (127) ou similar

# 2. Consulter les logs
docker compose logs api
# Voir l'erreur, ex: "Cannot find module"

# 3. Vérifier la base de données
docker compose logs db
# Voir si Postgres démarre

# 4. Checker l'utilisation mémoire
docker stats trainshop_api
```

### B. Scénario 2 : L'API répond mais génère des erreurs

**Signal** :
```bash
curl http://localhost:3000/metrics | jq .total_errors
# Réponse: 15 (au lieu de 0)
```

**Diagnostic** :
```bash
# 1. Voir le dernier erreur
curl http://localhost:3000/metrics | jq .last_error
# Réponse: { "timestamp": "...", "path": "/products", "status": 500 }

# 2. Consulter les logs en détail
docker compose logs api | grep ERROR

# 3. Vérifier la DB directement
docker exec trainshop_db psql -U trainshop -d trainshop -c "SELECT COUNT(*) FROM products;"

# 4. Tester une requête manuellement
curl -X GET http://localhost:3000/products -v
```

### C. Scénario 3 : L'API est lente

**Signal** :
```bash
# Dans les logs, duration_ms augmente
docker compose logs api | grep "duration_ms"
# "duration_ms": 5000 (au lieu de <100)
```

**Diagnostic** :
```bash
# 1. Vérifier les ressources
docker stats trainshop_api
# CPU: 95%, Memory: 512MB (anormal)

# 2. Vérifier les connexions DB
docker exec trainshop_db psql -U trainshop -d trainshop -c "SELECT * FROM pg_stat_activity;"

# 3. Scanner les requêtes lentes
docker exec trainshop_db psql -U trainshop -d trainshop -c "EXPLAIN ANALYZE SELECT * FROM products;"

# 4. Redémarrer le service
docker compose restart api
```

---

## 5. Alertes recommandées

Pour une vraie observabilité en production, mettre en place des alertes sur :

| Condition | Action |
|-----------|--------|
| `/health` retourne 503 | **Page sur appel** |
| `total_errors` > 5% de `total_requests` | **Alerte** |
| `memory_mb` > 300 | **Alerte mémoire** |
| Container redémarre > 3 fois/jour | **Alerte instabilité** |
| Pas de requête depuis 5 min | **Alerte disponibilité** |

Outils :
- **Simple** : Healthchecks.io, PagerDuty, Alertmanager
- **Production** : Datadog, New Relic, Prometheus + Grafana

---

## 6. Dashboard minimal

Exemple de dashboard simple à mettre dans `/status` :

```html
<!-- api/src/status.html -->
<html>
<head><title>TrainShop Status</title></head>
<body>
  <h1>TrainShop API Status</h1>
  <div id="status"></div>
  <script>
    async function updateStatus() {
      const health = await fetch('/health').then(r => r.json()).catch(() => ({ status: 'error' }));
      const metrics = await fetch('/metrics').then(r => r.json()).catch(() => ({}));
      
      document.getElementById('status').innerHTML = `
        <p>Health: <strong>${health.status}</strong></p>
        <p>Requests: ${metrics.total_requests}</p>
        <p>Errors: ${metrics.total_errors}</p>
        <p>Success rate: ${(metrics.total_success / metrics.total_requests * 100).toFixed(1)}%</p>
        <p>Memory: ${metrics.checks?.memory_mb} MB</p>
      `;
    }
    updateStatus();
    setInterval(updateStatus, 5000);
  </script>
</body>
</html>
```

---

## 7. Workflow de diagnostic complet

```
┌─── Alerte (erreur détectée)
│
├─── 1. Vérifier /health
│     ├─ OK ? → Problème localisé
│     └─ ERROR ? → DB ou crash
│
├─── 2. Consulter les logs récents
│     ├── docker compose logs -n 100 api
│     └── Chercher patterns d'erreur
│
├─── 3. Vérifier le contexte
│     ├── docker stats
│     ├── docker compose ps
│     └── Ressources disponibles ?
│
├─── 4. Recrédibiliser
│     ├── docker compose restart api
│     └── Vérifier /health à nouveau
│
└─── 5. Si persiste
      ├── Analyser les logs complets
      ├── Vérifier la base de données
      ├── Appliquer un hotfix
      └── Redéployer
```

---

## 8. Conclusion : De la CI à la confiance opérationnelle

| Étape | Responsable | Signal de santé |
|-------|-------------|-----------------|
| **Push** | Développeur | Commit sur GitHub |
| **Install** | CI | `npm ci` OK |
| **Quality** | CI | Lint OK |
| **Tests** | CI | Tests passent |
| **Docker** | CI | Image construite |
| **Health (CI)** | CI | `/health` 200 |
| **Déploiement** | DevOps | Container lance |
| **Health (Prod)** | Automatisé | `/health` monitorer |
| **Métriques** | Dashboard | Consultable 24/7 |
| **Diagnostic** | On-call | Incident geré < 5 min |

La CI garantit que le code est correct. L'observabilité garantit que la production fonctionne.

**ENSEMBLE** = Développement + Opérations = **DevOps** ✅
