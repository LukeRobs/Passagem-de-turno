const express = require('express');
const router = express.Router();
const {
  criarPassagem,
  listarPassagens,
  buscarPassagemPorId,
  atualizarPassagem,
  excluirPassagem,
  gerarRelatorio,
  enviarParaSeaTalk,
  buscarDadosAutomaticos
} = require('../controllers/passagemTurnoController');
const { autenticar } = require('../middleware/authMiddleware');
const { upload, processarImagens } = require('../config/multer'); // 📸 NOVO: Importar multer

//  Todas as rotas requerem autenticação
router.use(autenticar);

// Buscar dados automáticos (Google Sheets)
router.get('/dados-automaticos', buscarDadosAutomaticos);

// Enviar para SeaTalk
router.post('/enviar-seatalk', enviarParaSeaTalk);

// Criar passagem (COM UPLOAD DE FOTOS)
router.post('/', 
  upload.array('fotos', 10),  // Aceita até 10 fotos com nome 'fotos'
  processarImagens,           // Processa e comprime as imagens
  criarPassagem               // Salva no banco
);

// Listar todas as passagens
router.get('/', listarPassagens);

// Gerar relatório formatado de uma passagem
router.get('/:id/relatorio', gerarRelatorio);

// Buscar passagem por ID
router.get('/:id', buscarPassagemPorId);

// Atualizar passagem
router.put('/:id', atualizarPassagem);

// Excluir passagem
router.delete('/:id', excluirPassagem);

module.exports = router;