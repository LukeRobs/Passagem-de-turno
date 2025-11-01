const express = require('express');
const router = express.Router();
const { buscarDadosAutomaticos } = require('../controllers/googleSheetsController');
const { autenticar } = require('../middleware/authMiddleware');

// Todas as rotas requerem autenticação
router.use(autenticar);

// 🔄 Buscar dados automáticos do Google Sheets
router.post('/buscar-dados', buscarDadosAutomaticos);

module.exports = router;