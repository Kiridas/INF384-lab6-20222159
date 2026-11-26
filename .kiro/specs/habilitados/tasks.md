# Plan de implementación: Cursos habilitados

- [x] 1. Escribir las pruebas de `POST /habilitados` antes de implementar
  - Crear `tests/habilitados.test.js` con supertest sobre `src/app.js`, un test por cada fila de la tabla de Testing Strategy de design.md (criterios 1.1 a 4.2)
  - Para 3.2, forzar el error con `jest.spyOn` sobre `calcularHabilitados` de `src/services/habilitados.js` y verificar que el cuerpo sea exactamente `{ "error": "error interno" }`
  - No implementar código de producción en esta tarea: los tests deben fallar
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2_

- [x] 2. Crear el servicio `src/services/habilitados.js`
  - Implementar `calcularHabilitados(aprobados)` con un Set de aprobados sobre `repositorio.listar()`
  - Incluir un curso si su id no está en aprobados y todos sus prerequisites sí están
  - Mantener el orden de `data/cursos.json` y devolver solo id, name, credits, cycle y type
  - _Requisitos: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Límite de tamaño y manejo de errores en `src/app.js`
  - Cambiar a `express.json({ limit: '10kb' })`
  - En el middleware de errores: `entity.too.large` responde 413 `{ "error": "solicitud demasiado grande" }`; `entity.parse.failed` responde 400 `{ "error": "JSON invalido" }`; cualquier otro error responde 500 `{ "error": "error interno" }` sin stack trace
  - _Requisitos: 2.1, 2.3, 3.2, 3.3_

- [ ] 4. Crear el router `src/routes/habilitados.js` y montarlo en `/habilitados`
  - Validar en el orden de design.md: arreglo, elementos string, máximo 500, formato `^[A-Z0-9]{6}$`
  - Llamar a `calcularHabilitados` y responder 200
  - Al terminar, `npm test -- --coverage` debe quedar en verde con cobertura de líneas de al menos 80 %
  - _Requisitos: 1.1, 2.2, 2.4, 3.1, 4.1, 4.2_

- [ ] 5. Gate de SCA en `.github/workflows/ci.yml`
  - Agregar un job `sca` que corra en pull_request y push a main con `npm ci` y `npm audit --audit-level=high`
  - No corregir dependencias en esta tarea
  - _Requisitos: 5.1_

- [ ] 6. Gate de detección de secretos en `.github/workflows/ci.yml`
  - Agregar un job `secretos` con `actions/checkout@v4` y `fetch-depth: 0`
  - Descargar el binario de gitleaks v8.21.2 desde GitHub Releases (no usar gitleaks-action) y ejecutar `./gitleaks git --redact -v .`
  - No corregir hallazgos en esta tarea
  - _Requisitos: 5.2_

- [x] 7. Gate de cobertura de líneas al 80 %
  - Implementado en la tarea 4 de consulta-cursos (`coverageThreshold` en jest.config.js y `npm test -- --coverage` en ci.yml)
  - _Requisitos: 5.3_
  