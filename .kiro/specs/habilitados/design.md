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
