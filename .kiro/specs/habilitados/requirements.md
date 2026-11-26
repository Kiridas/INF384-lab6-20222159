# Requisitos: Cursos habilitados

## Introducción

Funcionalidad para que un alumno envíe los cursos que ya aprobó y reciba los cursos que puede llevar. Incluye los requisitos de seguridad derivados de la revisión del prototipo anterior y la política de TI para todo cambio que llega a main.

## Glosario

- aprobados: arreglo de códigos de curso enviado en el cuerpo de la solicitud.
- curso habilitado: curso cuyo código no está en aprobados y cuyos requisitos están todos en aprobados. Un curso sin requisitos está habilitado.
- código válido: texto de exactamente 6 caracteres en mayúsculas o dígitos (`^[A-Z0-9]{6}$`).

## Requisitos

### Requisito 1: Calcular cursos habilitados

**Historia de usuario:** Como alumno, quiero enviar los cursos que aprobé y recibir los que puedo llevar, para planificar mi matrícula 2027-1.

#### Criterios de aceptación

1.1 CUANDO se solicite `POST /habilitados` con un `aprobados` válido, EL sistema DEBE responder 200 con un arreglo de los cursos habilitados, cada uno con código, nombre, créditos, ciclo y tipo.

1.2 CUANDO se solicite `POST /habilitados` con `{ "aprobados": ["1INF25", "1INF27", "1INF49"] }`, EL sistema DEBE devolver exactamente 27 cursos, entre ellos 1INF29, 1INF30, 1INF31 y 1INF32.

1.3 CUANDO `aprobados` sea un arreglo vacío, EL sistema DEBE devolver los 26 cursos sin requisitos.

1.4 CUANDO `aprobados` contenga los 87 códigos de la malla, EL sistema DEBE devolver un arreglo vacío.

### Requisito 2: Límite de tamaño de la solicitud (hallazgo 1)

**Historia de usuario:** Como responsable del servicio, quiero rechazar solicitudes demasiado grandes, para que una sola solicitud no deje el servicio sin responder.

#### Criterios de aceptación

2.1 SI el cuerpo de la solicitud supera 10 KB, EL sistema DEBE responder 413 con `{ "error": "solicitud demasiado grande" }`.

2.2 SI `aprobados` tiene más de 500 elementos, EL sistema DEBE responder 400 con `{ "error": "aprobados admite como máximo 500 códigos" }`.

2.3 SI se envía una lista de 5000 códigos, EL sistema DEBE responder 413 en menos de 1000 ms.

2.4 CUANDO `aprobados` tenga 500 códigos válidos, EL sistema DEBE responder 200 en menos de 500 ms.

### Requisito 3: Validación del formato de los códigos (hallazgo 2)

**Historia de usuario:** Como responsable de seguridad, quiero que los códigos con formato inválido se rechacen sin revelar detalles internos, para no exponer rutas ni stack traces.

#### Criterios de aceptación

3.1 SI algún elemento de `aprobados` no cumple el formato `^[A-Z0-9]{6}$` (por ejemplo `"1INF30<script>"`), EL sistema DEBE responder 400 con `{ "error": "codigo invalido" }`.

3.2 SI ocurre un error no controlado al procesar `POST /habilitados`, EL sistema DEBE responder 500 con un cuerpo exactamente igual a `{ "error": "error interno" }`.

3.3 SI el cuerpo de la solicitud no es JSON válido, EL sistema DEBE responder 400 con `{ "error": "JSON invalido" }`.

### Requisito 4: Validación del tipo de aprobados (hallazgo 3)

**Historia de usuario:** Como alumno, quiero que una solicitud mal formada se rechace, para no recibir resultados incorrectos.

#### Criterios de aceptación

4.1 SI el cuerpo no contiene `aprobados` o `aprobados` no es un arreglo (por ejemplo `{ "aprobados": "1INF25" }`), EL sistema DEBE responder 400 con `{ "error": "aprobados debe ser un arreglo de codigos" }`.

4.2 SI algún elemento de `aprobados` no es un texto (número, booleano, null u objeto), EL sistema DEBE responder 400 con `{ "error": "aprobados debe ser un arreglo de codigos" }`.

### Requisito 5: Política de TI para cambios que llegan a main

**Historia de usuario:** Como área de TI, quiero que el pipeline bloquee los cambios que incumplen la política, para que main no reciba dependencias vulnerables, secretos ni código sin probar.

#### Criterios de aceptación

5.1 SI `npm audit` reporta al menos una vulnerabilidad de severidad alta o crítica, EL pipeline DEBE fallar en pull request y en push a main.

5.2 SI gitleaks detecta al menos un secreto en el repositorio, EL pipeline DEBE fallar en pull request y en push a main.

5.3 SI la cobertura de líneas es menor a 80 %, EL pipeline DEBE fallar en pull request y en push a main.

