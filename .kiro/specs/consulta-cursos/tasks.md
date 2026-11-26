# Plan de implementación: Consulta de cursos

- [x] 1. Implementar `GET /cursos` con filtro por ciclo
  - Crear la ruta en `src/routes/cursos.js` usando `src/data/repositorio.js`
  - Montar el router en `src/app.js`
  - Tests con supertest para 1.1, 1.2 y 1.3
  - _Requisitos: 1.1, 1.2, 1.3_

- [x] 2. Implementar `GET /cursos/:codigo`
  - Resolver el nombre de cada requisito con el repositorio
  - Tests para 2.1 y 2.2
  - _Requisitos: 2.1, 2.2_

- [ ] 3. Middleware de manejo de errores
  - Registrar un middleware de errores al final de `src/app.js`
  - Responder 500 con `{ "error": "error interno" }` sin stack trace
  - Test que fuerce un error y verifique el cuerpo de la respuesta
  - _Requisitos: 3.1_

- [ ] 4. Gate de cobertura
  - Agregar `coverageThreshold` de 80 % de líneas en `jest.config.js`
  - Cambiar el paso de pruebas en `ci.yml` a `npm test -- --coverage`
  - _Requisitos: 3.2_