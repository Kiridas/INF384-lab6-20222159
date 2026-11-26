# Diseño: Cursos habilitados

## Overview

Se agrega el endpoint `POST /habilitados` a la API Express existente. El endpoint recibe la lista de cursos aprobados por un alumno y devuelve los cursos que puede matricular: aquellos que el alumno aún no aprobó y cuyos requisitos están todos aprobados.

La lógica de cálculo vive en una nueva función pura `calcularHabilitados(aprobados)` dentro de un módulo de servicio. La validación de la solicitud HTTP se separa completamente de esa lógica, siguiendo el mismo patrón que ya usa `src/routes/cursos.js`.

La seguridad se implementa en capas Express antes de llegar al handler principal: límite de tamaño (body-size limit), validación de forma del JSON y validación de formato de cada código.

```mermaid
flowchart TD
    Cliente -->|POST /habilitados\njson body| ExpressApp
    ExpressApp -->|bodyParser 10 KB limit| BodySizeGuard
    BodySizeGuard -->|413 si supera| Cliente
    BodySizeGuard -->|ok| ValidacionHandler
    ValidacionHandler -->|400 si falla forma/formato| Cliente
    ValidacionHandler -->|aprobados[]| ServicioHabilitados
    ServicioHabilitados -->|lee mapa de cursos| Repositorio
    ServicioHabilitados -->|200 cursos habilitados| Cliente
```

## Architecture

El proyecto sigue una estructura en capas ya establecida:

```
src/
  app.js            ← Express app: middlewares globales, montaje de routers
  server.js         ← punto de entrada (no se toca)
  data/
    repositorio.js  ← acceso a datos (Map en memoria)
  routes/
    cursos.js       ← rutas /cursos  (ya existente)
    habilitados.js  ← rutas /habilitados  (nuevo)
  services/
    habilitados.js  ← lógica pura: calcularHabilitados()  (nuevo)
```

La función de cálculo es independiente de Express: recibe un arreglo de códigos aprobados y devuelve un arreglo de objetos de curso. Esto facilita su prueba unitaria sin HTTP.

## Components and Interfaces

### `src/services/habilitados.js` (nuevo)

```js
/**
 * Devuelve los cursos que el alumno puede matricular.
 * @param {string[]} aprobados  - Códigos de cursos ya aprobados (formato validado).
 * @returns {{ id, name, credits, cycle, type }[]}
 */
function calcularHabilitados(aprobados) { ... }

module.exports = { calcularHabilitados };
```

Algoritmo:
1. Construir un `Set` de aprobados para lookups O(1).
2. Iterar sobre todos los cursos del repositorio.
3. Incluir un curso si: (a) su `id` no está en el set y (b) todos sus `prerequisites` están en el set.
4. Mapear al DTO `{ id, name, credits, cycle, type }` (sin `prerequisites`).

Complejidad: O(C × R) donde C = cantidad de cursos (87) y R = máximo de requisitos por curso (≤ 3). En la práctica O(1) por el tamaño fijo del dataset.

### `src/routes/habilitados.js` (nuevo)

Monta `POST /` y aplica las validaciones en este orden:

| Paso | Verificación | Respuesta al fallar |
|------|-------------|---------------------|
| 1 | `req.body` es objeto con clave `aprobados` que es arreglo | `400 { "error": "aprobados debe ser un arreglo de codigos" }` |
| 2 | Cada elemento del arreglo es `string` | `400 { "error": "aprobados debe ser un arreglo de codigos" }` |
| 3 | `aprobados.length <= 500` | `400 { "error": "aprobados admite como máximo 500 códigos" }` |
| 4 | Cada código cumple `^[A-Z0-9]{6}$` | `400 { "error": "codigo invalido" }` |
| 5 | Llamar a `calcularHabilitados(aprobados)` y responder 200 | — |

### `src/app.js` (modificación)

Se ajustan dos cosas:

1. **Límite de tamaño del body**: reemplazar `express.json()` sin opciones por `express.json({ limit: '10kb' })`. Cuando el cuerpo supera el límite, Express lanza un error con `status 413`; el middleware de errores existente lo captura.

2. **Middleware de errores global** ampliado para distinguir los tipos de error de Express:

```js
app.use((err, req, res, next) => {
  if (err.status === 413 || err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'solicitud demasiado grande' });
  }
  if (err.status === 400 && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON invalido' });
  }
  res.status(500).json({ error: 'error interno' });
});
```

3. **Montaje del router**:

```js
app.use('/habilitados', require('./routes/habilitados'));
```

## Data Models

### Request

```json
POST /habilitados
Content-Type: application/json

{ "aprobados": ["1INF25", "1INF27", "1INF49"] }
```

Restricciones:
- Cuerpo total ≤ 10 KB.
- `aprobados` es arreglo de strings.
- Longitud ≤ 500 elementos.
- Cada código cumple `/^[A-Z0-9]{6}$/`.

### Response 200

```json
[
  { "id": "1INF29", "name": "Sistemas Operativos", "credits": 2.5, "cycle": 6, "type": "obligatorio" },
  { "id": "1INF30", "name": "Programación 3",       "credits": 5.0, "cycle": 6, "type": "obligatorio" }
]
```

El arreglo puede ser vacío `[]`. El campo `prerequisites` del modelo interno **nunca** se expone en esta respuesta.

### Curso interno (ya existente en `repositorio.js`)

```
Curso {
  id:            string           // ^[A-Z0-9]{6}$
  name:          string
  credits:       number
  cycle:         number | null    // null para electivos sin ciclo fijo
  type:          'obligatorio' | 'electivo'
  prerequisites: string[]
}
```

## Correctness Properties

*Una propiedad es una característica o comportamiento que debe ser verdadero en todas las ejecuciones válidas de un sistema; en esencia, una afirmación formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre las especificaciones legibles por humanos y las garantías de corrección verificables por máquina.*

### Property 1: Todo curso devuelto está habilitado

*Para cualquier* arreglo de códigos válidos `aprobados`, cada curso en la respuesta de `calcularHabilitados(aprobados)` debe satisfacer: (a) su `id` no está en `aprobados` y (b) todos sus `prerequisites` están en `aprobados`.

**Validates: Requirements 1.1**

### Property 2: Ningún curso habilitado se omite

*Para cualquier* arreglo de códigos válidos `aprobados`, ningún curso que satisfaga las condiciones (a) y (b) de la Propiedad 1 debe estar ausente de la respuesta.

**Validates: Requirements 1.1**

### Property 3: Formato de respuesta — campos requeridos presentes y prerequisites ausente

*Para cualquier* arreglo de códigos válidos `aprobados`, cada objeto devuelto por `calcularHabilitados(aprobados)` debe tener exactamente los campos `id`, `name`, `credits`, `cycle` y `type`, y el campo `prerequisites` **no** debe estar presente.

**Validates: Requirements 1.1**

### Property 4: Código de formato inválido siempre produce 400

*Para cualquier* arreglo `aprobados` donde al menos un elemento no cumple `/^[A-Z0-9]{6}$/`, `POST /habilitados` debe responder 400 con `{ "error": "codigo invalido" }`.

**Validates: Requirements 3.1**

### Property 5: aprobados no-arreglo o con elementos no-string siempre produce 400

*Para cualquier* cuerpo JSON donde `aprobados` no es un arreglo, está ausente, o contiene al menos un elemento que no es string, `POST /habilitados` debe responder 400 con `{ "error": "aprobados debe ser un arreglo de codigos" }`.

**Validates: Requirements 4.1, 4.2**

## Error Handling

| Condición | Status | Cuerpo |
|-----------|--------|--------|
| Cuerpo > 10 KB | 413 | `{ "error": "solicitud demasiado grande" }` |
| JSON inválido | 400 | `{ "error": "JSON invalido" }` |
| `aprobados` ausente o no es arreglo | 400 | `{ "error": "aprobados debe ser un arreglo de codigos" }` |
| Elemento de `aprobados` no es string | 400 | `{ "error": "aprobados debe ser un arreglo de codigos" }` |
| `aprobados.length > 500` | 400 | `{ "error": "aprobados admite como máximo 500 códigos" }` |
| Código con formato inválido | 400 | `{ "error": "codigo invalido" }` |
| Error no controlado | 500 | `{ "error": "error interno" }` |

Todos los mensajes de error se devuelven con `Content-Type: application/json`. Ninguna respuesta de error incluye stack traces ni rutas de archivo.

## Testing Strategy

Pruebas con Jest y supertest en `tests/habilitados.test.js`, al menos una por criterio de aceptación. Las funciones de `src/services/habilitados.js` también se prueban directamente, sin HTTP. No se agregan dependencias nuevas: las propiedades 1 a 5 se verifican con casos de ejemplo y, para la 1 y la 2, comparando el resultado con un filtro independiente sobre varios subconjuntos fijos de la malla.

| Criterio | Caso de prueba |
| --- | --- |
| 1.1 | Respuesta 200 con arreglo de objetos con id, name, credits, cycle y type, sin prerequisites |
| 1.2 | `["1INF25","1INF27","1INF49"]` devuelve 27 cursos e incluye 1INF29, 1INF30, 1INF31 y 1INF32 |
| 1.3 | Arreglo vacío devuelve 26 cursos |
| 1.4 | Los 87 códigos devuelven `[]` |
| 2.1 | Cuerpo mayor a 10 KB devuelve 413 con su mensaje |
| 2.2 | 501 códigos válidos (cuerpo menor a 10 KB) devuelven 400 con su mensaje |
| 2.3 | 5000 códigos devuelven 413 en menos de 1000 ms |
| 2.4 | 500 códigos válidos devuelven 200 en menos de 500 ms |
| 3.1 | `"1INF30<script>"` devuelve 400 `codigo invalido` |
| 3.2 | Error forzado con `jest.spyOn` sobre el servicio devuelve 500 con cuerpo exactamente `{ "error": "error interno" }` |
| 3.3 | Cuerpo `{"aprobados": [` devuelve 400 `JSON invalido` |
| 4.1 | Sin clave `aprobados` y con `"aprobados": "1INF25"` devuelven 400 |
| 4.2 | Elementos número, booleano, null y objeto devuelven 400 |

## Decisiones del endpoint

| Caso no definido en el pedido | Decisión | Razón |
| --- | --- | --- |
| Códigos repetidos en aprobados | Se aceptan y cuentan una sola vez (Set) | No cambian el resultado; rechazarlos agrega fricción sin beneficio |
| Código con formato válido que no existe en la malla (por ejemplo un curso de Estudios Generales) | Se acepta y se ignora; responde 200 | El alumno puede tener aprobados cursos de ciclos 1 a 4, que están fuera del alcance de la malla; rechazarlos le impediría enviar su historial real |
| Códigos en minúsculas (`1inf25`) | Se rechazan con 400 `codigo invalido`, sin normalizar | La malla usa solo mayúsculas; una única regex estricta es más simple de auditar y no oculta errores del cliente |
| Orden de la respuesta | El mismo orden de `data/cursos.json` | Respuesta determinista y tests estables |
| Cursos electivos (cycle null) | Se incluyen si cumplen sus requisitos | El pedido pide los cursos que el alumno puede llevar, y los electivos también se matriculan |
| Campo prerequisites en la respuesta | Se omite | El alumno ya cumple todos los requisitos de un curso habilitado; mismo formato que `GET /cursos` |
| Límites de 10 KB y 500 códigos | 413 y 400 respectivamente | La malla tiene 87 cursos y un historial completo no pasa de unos 100 códigos; 500 da holgura. Con 10 KB, una lista de 5000 códigos (unos 45 KB) se corta antes de parsearse, que es lo que dejó al servicio sin responder en el hallazgo 1 |

## Decisiones de los gates

Todos los gates corren en `.github/workflows/ci.yml` con `on: pull_request` y `on: push` a main.

| Gate | Herramienta y umbral | Bloquea o avisa | Etapa | Razón |
| --- | --- | --- | --- | --- |
| SCA | `npm audit --audit-level=high` sobre todas las dependencias, incluidas las de desarrollo | Bloquea | Pull request y push a main | La política de TI prohíbe cualquier dependencia con severidad alta o crítica. Correr en el PR evita que el problema llegue a main; correr en main detecta vulnerabilidades publicadas después del merge. Las de severidad media o baja no bloquean para no frenar entregas por riesgos que la política acepta |
| Secretos | gitleaks CLI (`gitleaks git`) sobre el historial completo (`fetch-depth: 0`); umbral: 0 hallazgos | Bloquea | Pull request y push a main | Un secreto en cualquier commit sigue expuesto aunque se borre del archivo; por eso se escanea todo el historial y no solo los commits nuevos. Un falso positivo o una clave ya rotada se registra en `.gitleaksignore` con su razón |
| Cobertura | Jest con `coverageThreshold` de 80 % de líneas | Bloquea | Pull request y push a main | Política de TI. 80 % es el mínimo exigido; un umbral mayor frenaría cambios sin pedido de la política |

