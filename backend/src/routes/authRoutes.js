const express = require('express');
const router = express.Router();
const {
  registrar,
  login,
  verificarToken,
  atualizarPerfil,
  alterarSenha
} = require('../controllers/authController');
const { autenticar } = require('../middleware/authMiddleware');

// Rotas públicas
router.post('/registrar', registrar);
router.post('/login', login);

// Rotas protegidas (requerem autenticação)
router.get('/me', autenticar, verificarToken);
router.put('/perfil', autenticar, atualizarPerfil);
router.put('/senha', autenticar, alterarSenha);

module.exports = router;