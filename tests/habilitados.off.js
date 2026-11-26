const request = require('supertest');
const app = require('../src/app');
const { courses } = require('../data/cursos.json');

const EJEMPLO = ['1INF25', '1INF27', '1INF49'];

// Genera n códigos de 6 letras con formato válido (AAAAAA, AAAAAB, ...)
function generarCodigos(n) {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const codigos = [];
  for (let i = 0; i < n; i++) {
    let codigo = '';
    let resto = i;
    for (let j = 0; j < 6; j++) {
      codigo = letras[resto % 26] + codigo;
      resto = Math.floor(resto / 26);
    }
    codigos.push(codigo);
  }
  return codigos;
}

function postJson(cuerpo) {
  return request(app)
    .post('/habilitados')
    .set('Content-Type', 'application/json')
    .send(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo));
}

describe('POST /habilitados - cálculo (requisito 1)', () => {
  test('1.1 responde 200 con id, name, credits, cycle y type, sin prerequisites', async () => {
    const res = await postJson({ aprobados: EJEMPLO });

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const curso of res.body) {
      expect(Object.keys(curso).sort()).toEqual(['credits', 'cycle', 'id', 'name', 'type']);
    }
  });

  test('1.2 el ejemplo del enunciado devuelve 27 cursos con 1INF29, 1INF30, 1INF31 y 1INF32', async () => {
    const res = await postJson({ aprobados: EJEMPLO });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(27);
    const ids = res.body.map((curso) => curso.id);
    expect(ids).toEqual(expect.arrayContaining(['1INF29', '1INF30', '1INF31', '1INF32']));
  });

  test('1.3 arreglo vacío devuelve los 26 cursos sin requisitos', async () => {
    const res = await postJson({ aprobados: [] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(26);
  });

  test('1.4 los 87 códigos de la malla devuelven un arreglo vacío', async () => {
    const res = await postJson({ aprobados: courses.map((curso) => curso.id) });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /habilitados - límite de tamaño (requisito 2, hallazgo 1)', () => {
  test('2.1 cuerpo mayor a 10 KB devuelve 413', async () => {
    const cuerpo = JSON.stringify({ aprobados: generarCodigos(2000) });
    expect(Buffer.byteLength(cuerpo)).toBeGreaterThan(10 * 1024);

    const res = await postJson(cuerpo);

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: 'solicitud demasiado grande' });
  });

  test('2.2 501 códigos válidos devuelven 400', async () => {
    const cuerpo = JSON.stringify({ aprobados: generarCodigos(501) });
    expect(Buffer.byteLength(cuerpo)).toBeLessThan(10 * 1024);

    const res = await postJson(cuerpo);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados admite como máximo 500 códigos' });
  });

  test('2.3 5000 códigos devuelven 413 en menos de 1000 ms', async () => {
    const inicio = Date.now();
    const res = await postJson({ aprobados: generarCodigos(5000) });
    const duracion = Date.now() - inicio;

    expect(res.status).toBe(413);
    expect(duracion).toBeLessThan(1000);
  });

  test('2.4 500 códigos válidos devuelven 200 en menos de 500 ms', async () => {
    const inicio = Date.now();
    const res = await postJson({ aprobados: generarCodigos(500) });
    const duracion = Date.now() - inicio;

    expect(res.status).toBe(200);
    expect(duracion).toBeLessThan(500);
  });
});

describe('POST /habilitados - formato y errores (requisito 3, hallazgo 2)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('3.1 "1INF30<script>" devuelve 400 codigo invalido', async () => {
    const res = await postJson({ aprobados: ['1INF30<script>'] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'codigo invalido' });
  });

  test('3.2 un error no controlado devuelve 500 con cuerpo exactamente { error: "error interno" }', async () => {
    const servicio = require('../src/services/habilitados');
    jest.spyOn(servicio, 'calcularHabilitados').mockImplementation(() => {
      throw new Error('fallo simulado en C:\\apps\\malla\\src');
    });

    const res = await postJson({ aprobados: EJEMPLO });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'error interno' });
    expect(res.text).not.toMatch(/fallo simulado|at |\\src/);
  });

  test('3.3 JSON malformado devuelve 400 JSON invalido', async () => {
    const res = await postJson('{"aprobados": [');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'JSON invalido' });
  });
});

describe('POST /habilitados - tipo de aprobados (requisito 4, hallazgo 3)', () => {
  const MENSAJE = { error: 'aprobados debe ser un arreglo de codigos' };

  test('4.1 sin la clave aprobados devuelve 400', async () => {
    const res = await postJson({ otro: 'valor' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(MENSAJE);
  });

  test('4.1 aprobados como texto ("1INF25") devuelve 400', async () => {
    const res = await postJson({ aprobados: '1INF25' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(MENSAJE);
  });

  test.each([
    ['número', 42],
    ['booleano', true],
    ['null', null],
    ['objeto', { id: '1INF25' }],
  ])('4.2 elemento %s devuelve 400', async (_tipo, valor) => {
    const res = await postJson({ aprobados: ['1INF25', valor] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(MENSAJE);
  });
});

describe('POST /habilitados - decisiones de design.md', () => {
  test('códigos repetidos cuentan una sola vez', async () => {
    const res = await postJson({ aprobados: [...EJEMPLO, ...EJEMPLO] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(27);
  });

  test('un código válido que no existe en la malla se ignora', async () => {
    const res = await postJson({ aprobados: [...EJEMPLO, '1MAT01'] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(27);
  });

  test('un código en minúsculas devuelve 400 codigo invalido', async () => {
    const res = await postJson({ aprobados: ['1inf25'] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'codigo invalido' });
  });

  test('la respuesta mantiene el orden de data/cursos.json', async () => {
    const res = await postJson({ aprobados: EJEMPLO });
    const orden = courses.map((curso) => curso.id);
    const indices = res.body.map((curso) => orden.indexOf(curso.id));

    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });
});
