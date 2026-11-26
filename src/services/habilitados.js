const repositorio = require('../data/repositorio');

/**
 * Devuelve los cursos que el alumno puede matricular.
 * @param {string[]} aprobados  - Códigos de cursos ya aprobados (formato validado).
 * @returns {{ id: string, name: string, credits: number, cycle: number|null, type: string }[]}
 */
function calcularHabilitados(aprobados) {
  const aprobadosSet = new Set(aprobados);

  return repositorio.listar()
    .filter((curso) => {
      // (a) el curso no está ya aprobado
      if (aprobadosSet.has(curso.id)) return false;
      // (b) todos sus requisitos están aprobados
      return curso.prerequisites.every((req) => aprobadosSet.has(req));
    })
    .map(({ id, name, credits, cycle, type }) => ({ id, name, credits, cycle, type }));
}

module.exports = { calcularHabilitados };
