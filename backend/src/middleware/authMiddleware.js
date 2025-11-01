const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_mude_isso_em_producao';

// 🔐 Middleware de autenticação
const autenticar = async (req, res, next) => {
  try {
    // Pegar token do header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido'
      });
    }

    // Extrair token
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Buscar usuário
    const usuario = await User.findById(decoded.id);

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    if (!usuario.ativo) {
      return res.status(401).json({
        success: false,
        message: 'Usuário desativado'
      });
    }

    // Adicionar usuário ao request
    req.user = {
      id: usuario._id,
      nome: usuario.nome,
      email: usuario.email,
      cargo: usuario.cargo
    };

    next();

  } catch (error) {
    console.error('❌ Erro na autenticação:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erro na autenticação',
      error: error.message
    });
  }
};

// 🛡️ Middleware para verificar cargo
const autorizarCargo = (...cargosPermitidos) => {
  return (req, res, next) => {
    if (!cargosPermitidos.includes(req.user.cargo)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Permissões insuficientes.'
      });
    }
    next();
  };
};

module.exports = {
  autenticar,
  autorizarCargo
};