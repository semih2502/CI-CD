const request = require('supertest');
const app = require('../src/app');

jest.mock('../src/db', () => ({
    query: jest.fn().mockResolvedValue({ rows: [{ ok: 1 }] })
}));

describe('GET /metrics', () => {
    it('should return metrics object with correct structure', async () => {
        const response = await request(app).get('/metrics');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime_seconds');
        expect(response.body).toHaveProperty('requests');
        expect(response.body).toHaveProperty('operations');
        expect(response.body).toHaveProperty('system');
    });

    it('should track request counts', async () => {
        // First request
        await request(app).get('/metrics');

        // Second request to increment counter
        const response = await request(app).get('/metrics');

        expect(response.body.requests.total).toBeGreaterThanOrEqual(2);
        expect(response.body.requests.success).toBeGreaterThanOrEqual(2);
    });

    it('should have memory information', async () => {
        const response = await request(app).get('/metrics');

        expect(response.body.system).toHaveProperty('memory_mb');
        expect(response.body.system).toHaveProperty('memory_limit_mb');
        expect(response.body.system.memory_mb).toBeGreaterThan(0);
        expect(response.body.system.memory_limit_mb).toBeGreaterThan(0);
    });

    it('should calculate success rate percentage', async () => {
        const response = await request(app).get('/metrics');

        expect(response.body.requests).toHaveProperty('success_rate_percent');
        expect(response.body.requests.success_rate_percent).toBeGreaterThanOrEqual(0);
        expect(response.body.requests.success_rate_percent).toBeLessThanOrEqual(100);
    });
});

describe('Enriched GET /health', () => {
    it('should return enhanced health info with memory', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
        expect(response.body.checks).toHaveProperty('database', 'ok');
        expect(response.body.checks).toHaveProperty('memory_mb');
        expect(response.body.checks).toHaveProperty('uptime_seconds');
    });

    it('should increment health check counter', async () => {
        const before = await request(app).get('/metrics');
        await request(app).get('/health');
        const after = await request(app).get('/metrics');

        expect(after.body.operations.health_checks).toBeGreaterThan(
            before.body.operations.health_checks
        );
    });
});
