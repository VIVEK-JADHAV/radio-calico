const request = require('supertest');
const express = require('express');

// Create a minimal test server
function createTestServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });

  return app;
}

describe('Health API', () => {
  let app;

  beforeEach(() => {
    app = createTestServer();
  });

  describe('GET /api/health', () => {
    test('should return 200 status code', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
    });

    test('should return JSON content type', async () => {
      const response = await request(app).get('/api/health');
      expect(response.headers['content-type']).toMatch(/json/);
    });

    test('should return status ok', async () => {
      const response = await request(app).get('/api/health');
      expect(response.body.status).toBe('ok');
    });

    test('should return message', async () => {
      const response = await request(app).get('/api/health');
      expect(response.body.message).toBe('Server is running');
    });

    test('should have correct response structure', async () => {
      const response = await request(app).get('/api/health');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('message');
    });
  });
});
