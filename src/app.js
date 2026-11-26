const path = require('path');
const express = require('express');
const repositorio = require('./data/repositorio');

const app = express();

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', cursos: repositorio.listar().length });
});

app.use('/cursos', require('./routes/cursos'));
app.use('/habilitados', require('./routes/habilitados'));

// Ruta auxiliar para verificar el middleware de errores en pruebas
if (process.env.NODE_ENV !== 'production') {
  app.get('/__test__/error', (req, res, next) => {
    next(new Error('error forzado'));
  });
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.status === 413 || err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'solicitud demasiado grande' });
  }
  if (err.status === 400 && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON invalido' });
  }
  res.status(500).json({ error: 'error interno' });
});

module.exports = app;
