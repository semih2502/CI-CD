const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// ============ OBSERVABILITÉ ============

// Métriques globales
const metrics = {
  startedAt: new Date(),
  totalRequests: 0,
  totalErrors: 0,
  totalSuccess: 0,
  healthChecks: 0,
  productsFetched: 0,
  productsCreated: 0,
  lastError: null
};

// Logger structuré - enregistre chaque requête
app.use((req, res, next) => {
  const startTime = Date.now();
  metrics.totalRequests++;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
      remote_addr: req.ip || 'unknown'
    };

    // Log en JSON pour parsing facile
    console.log(JSON.stringify(logEntry));

    // Compter les succès/erreurs
    if (res.statusCode >= 400) {
      metrics.totalErrors++;
      metrics.lastError = {
        timestamp: logEntry.timestamp,
        path: req.path,
        status: res.statusCode,
        method: req.method
      };
    } else {
      metrics.totalSuccess++;
    }
  });

  next();
});

// Handler d'erreurs global
app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message: err.message,
    path: req.path,
    method: req.method,
    stack: err.stack
  }));

  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ============ ROUTES ============

app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenue sur TrainShop Starter',
    endpoints: ['/health', '/products', '/metrics']
  });
});

app.get('/health', async (req, res) => {
  metrics.healthChecks++;

  try {
    const dbCheck = await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      service: 'trainshop-api',
      database: 'connected',
      checks: {
        database: 'ok',
        memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        uptime_seconds: Math.floor(process.uptime())
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

app.get('/metrics', (req, res) => {
  const uptimeSeconds = Math.floor(process.uptime());
  const successRate = metrics.totalRequests > 0
    ? (metrics.totalSuccess / metrics.totalRequests * 100).toFixed(2)
    : 0;

  res.json({
    timestamp: new Date().toISOString(),
    uptime_seconds: uptimeSeconds,
    started_at: metrics.startedAt.toISOString(),
    requests: {
      total: metrics.totalRequests,
      success: metrics.totalSuccess,
      errors: metrics.totalErrors,
      success_rate_percent: parseFloat(successRate)
    },
    operations: {
      health_checks: metrics.healthChecks,
      products_fetched: metrics.productsFetched,
      products_created: metrics.productsCreated
    },
    system: {
      memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      memory_limit_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    last_error: metrics.lastError
  });
});

app.get('/products', async (req, res) => {
  metrics.productsFetched++;

  try {
    const result = await pool.query(
      'SELECT id, name, description, price_cents, stock FROM products ORDER BY id ASC'
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: 'Impossible de récupérer les produits',
      message: error.message
    });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, price_cents, stock FROM products WHERE id = $1',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Produit introuvable'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: 'Impossible de récupérer le produit',
      message: error.message
    });
  }
});

app.post('/products', async (req, res) => {
  metrics.productsCreated++;

  try {
    const { name, description, price_cents, stock } = req.body;

    if (!name || !description || !price_cents) {
      return res.status(400).json({
        error: 'name, description et price_cents sont obligatoires'
      });
    }

    const result = await pool.query(
      `INSERT INTO products (name, description, price_cents, stock)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, price_cents, stock`,
      [name, description, price_cents, stock || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: 'Impossible de créer le produit',
      message: error.message
    });
  }
});

module.exports = app;
