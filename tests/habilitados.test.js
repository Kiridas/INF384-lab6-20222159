/**
 * Tests for POST /habilitados
 * Written before production code (TDD) — all tests are expected to fail
 * until src/services/habilitados.js and src/routes/habilitados.js are implemented.
 *
 * The service module is mocked at the top level so Jest can parse and register
 * all tests even when the file doesn't exist yet. Test 3.2 replaces the mock
 * with a spy that throws, to simulate an uncontrolled error.
 */

// Mock the service module so the test suite can be loaded before the file exists.
// { virtual: true } tells Jest to create this mock even when the real file is absent.
// Once the real module is created this mock is overridden by jest.spyOn in test 3.2.
jest.mock('../src/services/habilitados', () => ({
  calcularHabilitados: jest.fn(() => []),
}), { virtual: true });

const request = require('supertest');
const app = require('../src/app');

// ---------------------------------------------------------------------------
// Helper: generate N unique 6-char uppercase codes (AAAAAA, AAAAAB, …)
// ---------------------------------------------------------------------------
function generarCodigos(n) {
  const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const codes = [];
  let counter = 0;
  while (codes.length < n) {
    let code = '';
    let tmp = counter;
    for (let i = 0; i < 6; i++) {
      code = CHARSET[tmp % CHARSET.length] + code;
      tmp = Math.floor(tmp / CHARSET.length);
    }
    codes.push(code);
    counter++;
  }
  return codes;
}

// ---------------------------------------------------------------------------
// Criterio 1.1 – Respuesta 200 con los campos correctos, sin prerequisites
// ---------------------------------------------------------------------------
describe('POST /habilitados', () => {
  beforeEach(() => {
    // Reset the service mock before each test so test 3.2 doesn't bleed over.
    const servicio = require('../src/services/habilitados');
    servicio.calcularHabilitados.mockReset();
    servicio.calcularHabilitados.mockImplementation(() => []);
  });

  test('1.1 responde 200 con arreglo de objetos con id, name, credits, cycle y type, sin prerequisites', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: [] });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    for (const curso of res.body) {
      expect(typeof curso.id).toBe('string');
      expect(typeof curso.name).toBe('string');
      expect(typeof curso.credits).toBe('number');
      expect(curso.cycle === null || typeof curso.cycle === 'number').toBe(true);
      expect(typeof curso.type).toBe('string');
      expect(curso.prerequisites).toBeUndefined();
    }
  });

  // ---------------------------------------------------------------------------
  // Criterio 1.2 – Tres cursos aprobados devuelven exactamente 27 habilitados
  // ---------------------------------------------------------------------------
  test('1.2 ["1INF25","1INF27","1INF49"] devuelve 27 cursos e incluye 1INF29, 1INF30, 1INF31 y 1INF32', async () => {
    // For this test we need the real implementation, so unmock temporarily.
    // Restore the actual module just for this test.
    jest.unmock('../src/services/habilitados');
    jest.resetModules();

    // Re-require app and supertest with the real module in scope.
    const realApp = require('../src/app');
    const realRequest = require('supertest');

    const res = await realRequest(realApp)
      .post('/habilitados')
      .send({ aprobados: ['1INF25', '1INF27', '1INF49'] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(27);

    const ids = res.body.map((c) => c.id);
    expect(ids).toContain('1INF29');
    expect(ids).toContain('1INF30');
    expect(ids).toContain('1INF31');
    expect(ids).toContain('1INF32');

    // Re-apply virtual mock for subsequent tests.
    jest.mock('../src/services/habilitados', () => ({
      calcularHabilitados: jest.fn(() => []),
    }), { virtual: true });
    jest.resetModules();
  });

  // ---------------------------------------------------------------------------
  // Criterio 1.3 – Arreglo vacío devuelve los 26 cursos sin requisitos
  // ---------------------------------------------------------------------------
  test('1.3 arreglo vacío devuelve 26 cursos (cursos sin requisitos)', async () => {
    jest.unmock('../src/services/habilitados');
    jest.resetModules();

    const realApp = require('../src/app');
    const realRequest = require('supertest');

    const res = await realRequest(realApp)
      .post('/habilitados')
      .send({ aprobados: [] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(26);

    jest.mock('../src/services/habilitados', () => ({
      calcularHabilitados: jest.fn(() => []),
    }), { virtual: true });
    jest.resetModules();
  });

  // ---------------------------------------------------------------------------
  // Criterio 1.4 – Los 87 códigos devuelven []
  // ---------------------------------------------------------------------------
  test('1.4 los 87 códigos de la malla devuelven []', async () => {
    jest.unmock('../src/services/habilitados');
    jest.resetModules();

    const realApp = require('../src/app');
    const realRequest = require('supertest');

    const path = require('path');
    const fs = require('fs');
    const { courses } = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '..', 'data', 'cursos.json'),
        'utf8'
      )
    );
    const todosCodigos = courses.map((c) => c.id);

    const res = await realRequest(realApp)
      .post('/habilitados')
      .send({ aprobados: todosCodigos });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);

    jest.mock('../src/services/habilitados', () => ({
      calcularHabilitados: jest.fn(() => []),
    }), { virtual: true });
    jest.resetModules();
  });

  // ---------------------------------------------------------------------------
  // Criterio 2.1 – Cuerpo mayor a 10 KB devuelve 413
  // ---------------------------------------------------------------------------
  test('2.1 cuerpo mayor a 10 KB devuelve 413 con mensaje solicitud demasiado grande', async () => {
    // Build a body that exceeds 10 KB.
    // Each code is 6 chars. We need enough to surpass 10240 bytes.
    // 2000 codes × ~9 bytes each ≈ 18 KB.
    const codigos = generarCodigos(2000);
    const body = JSON.stringify({ aprobados: codigos });
    expect(Buffer.byteLength(body)).toBeGreaterThan(10240);

    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: 'solicitud demasiado grande' });
  });

  // ---------------------------------------------------------------------------
  // Criterio 2.2 – 501 códigos válidos (cuerpo < 10 KB) devuelven 400
  // ---------------------------------------------------------------------------
  test('2.2 501 códigos válidos devuelven 400 con mensaje aprobados admite como máximo 500 códigos', async () => {
    const codigos = generarCodigos(501);
    const body = JSON.stringify({ aprobados: codigos });
    // Confirm body is under 10 KB so it reaches the route validator.
    expect(Buffer.byteLength(body)).toBeLessThan(10240);

    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados admite como máximo 500 códigos' });
  });

  // ---------------------------------------------------------------------------
  // Criterio 2.3 – 5000 códigos devuelven 413 en menos de 1000 ms
  // ---------------------------------------------------------------------------
  test('2.3 5000 códigos devuelven 413 en menos de 1000 ms', async () => {
    const codigos = generarCodigos(5000);
    const body = JSON.stringify({ aprobados: codigos });
    expect(Buffer.byteLength(body)).toBeGreaterThan(10240);

    const inicio = Date.now();
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send(body);
    const duracion = Date.now() - inicio;

    expect(res.status).toBe(413);
    expect(duracion).toBeLessThan(1000);
  });

  // ---------------------------------------------------------------------------
  // Criterio 2.4 – 500 códigos válidos devuelven 200 en menos de 500 ms
  // ---------------------------------------------------------------------------
  test('2.4 500 códigos válidos devuelven 200 en menos de 500 ms', async () => {
    jest.unmock('../src/services/habilitados');
    jest.resetModules();

    const realApp = require('../src/app');
    const realRequest = require('supertest');

    const codigos = generarCodigos(500);

    const inicio = Date.now();
    const res = await realRequest(realApp)
      .post('/habilitados')
      .send({ aprobados: codigos });
    const duracion = Date.now() - inicio;

    expect(res.status).toBe(200);
    expect(duracion).toBeLessThan(500);

    jest.mock('../src/services/habilitados', () => ({
      calcularHabilitados: jest.fn(() => []),
    }));
    jest.resetModules();
  });

  // ---------------------------------------------------------------------------
  // Criterio 3.1 – Código con formato inválido devuelve 400 "codigo invalido"
  // ---------------------------------------------------------------------------
  test('3.1 "1INF30<script>" devuelve 400 con mensaje codigo invalido', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['1INF30<script>'] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'codigo invalido' });
  });

  // ---------------------------------------------------------------------------
  // Criterio 3.2 – Error no controlado devuelve 500 "error interno"
  // ---------------------------------------------------------------------------
  test('3.2 error forzado en el servicio devuelve 500 con cuerpo exactamente { "error": "error interno" }', async () => {
    jest.unmock('../src/services/habilitados');
    jest.resetModules();

    const realApp = require('../src/app');
    const realRequest = require('supertest');
    const servicio = require('../src/services/habilitados');

    jest.spyOn(servicio, 'calcularHabilitados').mockImplementation(() => {
      throw new Error('fallo simulado');
    });

    const res = await realRequest(realApp)
      .post('/habilitados')
      .send({ aprobados: [] });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'error interno' });

    jest.restoreAllMocks();

    jest.mock('../src/services/habilitados', () => ({
      calcularHabilitados: jest.fn(() => []),
    }));
    jest.resetModules();
  });

  // ---------------------------------------------------------------------------
  // Criterio 3.3 – JSON inválido devuelve 400 "JSON invalido"
  // ---------------------------------------------------------------------------
  test('3.3 cuerpo {"aprobados": [ devuelve 400 con mensaje JSON invalido', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send('{"aprobados": [');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'JSON invalido' });
  });

  // ---------------------------------------------------------------------------
  // Criterio 4.1 – Sin clave aprobados o aprobados no es arreglo devuelven 400
  // ---------------------------------------------------------------------------
  test('4.1a sin clave aprobados devuelve 400 con mensaje aprobados debe ser un arreglo de codigos', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ otro: 'valor' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe ser un arreglo de codigos' });
  });

  test('4.1b "aprobados": "1INF25" (string, no arreglo) devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: '1INF25' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe ser un arreglo de codigos' });
  });

  // ---------------------------------------------------------------------------
  // Criterio 4.2 – Elementos no-string devuelven 400
  // ---------------------------------------------------------------------------
  test('4.2a elemento número devuelve 400 con mensaje aprobados debe ser un arreglo de codigos', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: [42] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe ser un arreglo de codigos' });
  });

  test('4.2b elemento booleano devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: [true] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe ser un arreglo de codigos' });
  });

  test('4.2c elemento null devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: [null] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe ser un arreglo de codigos' });
  });

  test('4.2d elemento objeto devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: [{ id: '1INF25' }] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe ser un arreglo de codigos' });
  });
});
