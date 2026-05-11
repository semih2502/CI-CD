const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

jest.mock('../src/db', () => ({
  query: jest.fn()
}));

describe('GET /products', () => {
  it('should return products list', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Guide Docker',
          description: 'Support pédagogique',
          price_cents: 1900,
          stock: 20
        }
      ]
    });

    const response = await request(app).get('/products');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Guide Docker');
  });
});

describe('POST /products', () => {
  it('should create a new product with valid data', async () => {
    const newProduct = {
      name: 'Nouveau Produit',
      description: 'Description du produit',
      price_cents: 2500,
      stock: 10
    };

    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 2,
          ...newProduct
        }
      ]
    });

    const response = await request(app)
      .post('/products')
      .send(newProduct);

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Nouveau Produit');
    expect(response.body.price_cents).toBe(2500);
  });

  it('should return 400 for missing required fields', async () => {
    const invalidProduct = {
      name: 'Produit Invalide'
      // missing description and price_cents
    };

    const response = await request(app)
      .post('/products')
      .send(invalidProduct);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('obligatoires');
  });

  it('should return 400 for empty name', async () => {
    const invalidProduct = {
      name: '',
      description: 'Description',
      price_cents: 1000
    };

    const response = await request(app)
      .post('/products')
      .send(invalidProduct);

    expect(response.status).toBe(400);
  });
});
