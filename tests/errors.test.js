const request = require('supertest');
const app = require('../src/app');

describe('Middleware de manejo de errores', () => {
  // Requirement 3.1 – error no controlado devuelve 500 con cuerpo fijo, sin stack trace
  test('3.1 un error no controlado responde 500 con { error: "error interno" }', async () => {
    const res = await request(app).get('/__test__/error');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'error interno' });
  });

  test('3.1 la respuesta de error no incluye stack trace ni rutas de archivo', async () => {
    const res = await request(app).get('/__test__/error');

    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/Error:/);
    expect(body).not.toMatch(/at\s+\w/);   // sin líneas de stack trace
    expect(body).not.toMatch(/\.js:\d+/);   // sin rutas de archivo
  });
});
