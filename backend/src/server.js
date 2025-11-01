const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ============================================================
// 🔧 CONFIGURAÇÕES DE MIDDLEWARE
// ============================================================

// CORS - Permitir requisições do frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Parser de JSON (para req.body)
app.use(express.json());

// Parser de URL encoded (para forms)
app.use(express.urlencoded({ extended: true }));

// 📸 NOVO: Servir arquivos estáticos (imagens de upload)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Log de requisições (desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ============================================================
// 🗄️ CONEXÃO COM MONGODB
// ============================================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/passagem-turno';

mongoose.connect(MONGODB_URI, {
  // Opções recomendadas (já são padrão no Mongoose 6+, mas explícitas para clareza)
  // useNewUrlParser e useUnifiedTopology não são mais necessários no Mongoose 6+
})
  .then(() => {
    console.log('✅ MongoDB conectado com sucesso!');
    console.log(`📊 Database: ${mongoose.connection.name}`);
  })
  .catch(err => {
    console.error('❌ Erro ao conectar MongoDB:', err.message);
    process.exit(1); // Encerrar processo se não conseguir conectar ao DB
  });

// Listener de eventos do MongoDB
mongoose.connection.on('error', (err) => {
  console.error('❌ Erro na conexão MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB desconectado');
});

// ============================================================
// 🛣️ ROTAS DA API
// ============================================================

// Rota de health check
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API Passagem de Turno - Rodando!',
    version: '2.0',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Rotas principais
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/passagens', require('./routes/passagemTurnoRoutes'));
app.use('/api/sheets', require('./routes/googleSheetsRoutes'));

// ============================================================
// 🚫 TRATAMENTO DE ERROS
// ============================================================

// Rota não encontrada (404)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.path}`
  });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('❌ Erro capturado:', err);
  
  // Erro de validação do Mongoose
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Erro de validação',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // Erro de cast do Mongoose (ID inválido)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID inválido fornecido'
    });
  }
  
  // Erro de duplicação (chave única)
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Registro duplicado encontrado'
    });
  }
  
  // Erro de autenticação
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado'
    });
  }
  
  // Erro genérico
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ============================================================
// 🚀 INICIAR SERVIDOR
// ============================================================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   🚀 Servidor Passagem de Turno Iniciado     ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📸 Uploads: http://localhost:${PORT}/uploads`);
  console.log('');
});

// ============================================================
// 🛑 GRACEFUL SHUTDOWN
// ============================================================

// Encerrar servidor gracefully ao receber sinais de término
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️ ${signal} recebido. Encerrando servidor...`);
  
  server.close(() => {
    console.log('✅ Servidor HTTP encerrado');
    
    mongoose.connection.close(false, () => {
      console.log('✅ Conexão MongoDB encerrada');
      process.exit(0);
    });
  });
  
  // Forçar encerramento após 10 segundos se não conseguir encerrar gracefully
  setTimeout(() => {
    console.error('❌ Não foi possível encerrar gracefully, forçando encerramento');
    process.exit(1);
  }, 10000);
};

// Listeners de sinais de término
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Tratamento de exceções não capturadas
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION! Encerrando...');
  console.error(err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED REJECTION! Encerrando...');
  console.error(err);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;