const request = require('supertest');
const app = require('../src/app');

describe('GET /cursos', () => {
  // Requirement 1.1 – devuelve todos los cursos con los campos correctos
  test('1.1 responde 200 con los 87 cursos y los campos id, name, credits, cycle, type', async () => {
    const res = await request(app).get('/cursos');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(87);

    for (const curso of res.body) {
      expect(typeof curso.id).toBe('string');
      expect(typeof curso.name).toBe('string');
      expect(typeof curso.credits).toBe('number');
      // cycle is a number for obligatory courses and null for free-choice electives
      expect(curso.cycle === null || typeof curso.cycle === 'number').toBe(true);
      expect(typeof curso.type).toBe('string');
      // prerequisites must NOT be exposed
      expect(curso.prerequisites).toBeUndefined();
    }
  });

  // Requirement 1.2 – filtra por ciclo válido
  test('1.2 ?ciclo=10 responde 200 con los 3 cursos del ciclo 10', async () => {
    const res = await request(app).get('/cursos?ciclo=10');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body.every((c) => c.cycle === 10)).toBe(true);
  });

  // Requirement 1.3a – ciclo fuera de rango
  test('1.3 ?ciclo=4 responde 400 con mensaje de error', async () => {
    const res = await request(app).get('/cursos?ciclo=4');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });

  // Requirement 1.3b – ciclo no numérico
  test('1.3 ?ciclo=abc responde 400 con mensaje de error', async () => {
    const res = await request(app).get('/cursos?ciclo=abc');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });
});
