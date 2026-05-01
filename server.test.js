const request = require('supertest');
const app = require('./server');

describe('Election Assistant API Validation Tests', () => {

    // 1. Config endpoint validation
    it('GET /api/config should return the maps api key configuration', async () => {
        const res = await request(app).get('/api/config');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('mapsApiKey');
    });

    // 2. Civic API input validation
    it('POST /api/civic should fail gracefully if address is missing', async () => {
        const res = await request(app).post('/api/civic').send({});
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'Address is required');
    });

    // 3. Chat API input validation
    it('POST /api/chat should fail gracefully if message is missing', async () => {
        const res = await request(app).post('/api/chat').send({});
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'Message is required');
    });

    // 4. Rate limiter header check
    it('API routes should include rate limiting security headers', async () => {
        const res = await request(app).get('/api/config');
        expect(res.headers).toHaveProperty('x-ratelimit-limit');
        expect(res.headers).toHaveProperty('x-ratelimit-remaining');
    });

    // 5. Security header check (Helmet)
    it('API routes should include helmet security headers like x-content-type-options', async () => {
        const res = await request(app).get('/api/config');
        expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
    });

});
