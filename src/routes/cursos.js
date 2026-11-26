const express = require('express');
const repositorio = require('../data/repositorio');

const router = express.Router();

function mapearCurso({ id, name, credits, cycle, type }) {
  return { id, name, credits, cycle, type };
}

router.get('/', (req, res) => {
  const { ciclo } = req.query;

  if (ciclo === undefined) {
    return res.json(repositorio.listar().map(mapearCurso));
  }

  const num = Number(ciclo);
  if (!Number.isInteger(num) || num < 5 || num > 10) {
    return res.status(400).json({ error: 'ciclo debe ser un entero entre 5 y 10' });
  }

  return res.json(repositorio.listarPorCiclo(num).map(mapearCurso));
});

module.exports = router;
