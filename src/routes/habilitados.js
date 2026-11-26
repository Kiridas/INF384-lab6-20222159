const express = require('express');
const servicio = require('../services/habilitados');

const router = express.Router();

const CODIGO_RE = /^[A-Z0-9]{6}$/;

router.post('/', (req, res) => {
  const { aprobados } = req.body || {};

  // Paso 1: aprobados debe ser un arreglo
  if (!Array.isArray(aprobados)) {
    return res.status(400).json({ error: 'aprobados debe ser un arreglo de codigos' });
  }

  // Paso 2: cada elemento debe ser string
  if (aprobados.some((el) => typeof el !== 'string')) {
    return res.status(400).json({ error: 'aprobados debe ser un arreglo de codigos' });
  }

  // Paso 3: máximo 500 códigos
  if (aprobados.length > 500) {
    return res.status(400).json({ error: 'aprobados admite como máximo 500 códigos' });
  }

  // Paso 4: formato de cada código
  if (aprobados.some((codigo) => !CODIGO_RE.test(codigo))) {
    return res.status(400).json({ error: 'codigo invalido' });
  }

  // Paso 5: calcular y responder
  return res.json(servicio.calcularHabilitados(aprobados));
});

module.exports = router;
