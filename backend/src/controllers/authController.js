const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Chave secreta JWT (deve estar no .env em produção)
const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_mude_isso_em_producao';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// 🔐 Gerar token JWT
const gerarToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

// REGISTRAR NOVO USUÁRIO
const registrar = async (req, res) => {
  try {
    console.log('📝 Registrando novo usuário...');
    const { nome, email, senha, cargo } = req.body;

    // Validações
    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e senha são obrigatórios'
      });
    }
    // Impedir criação de admin via API
    if (cargo === 'admin') {
      console.log('❌ Tentativa de criar admin via API bloqueada');
      return res.status(403).json({
        success: false,
        message: 'Não é possível criar conta de administrador. Contate o suporte.'
      });
    }
    // Verificar se usuário já existe
    const usuarioExiste = await User.findOne({ email });
    if (usuarioExiste) {
      return res.status(400).json({
        success: false,
        message: 'Email já cadastrado'
      });
    }

    // Criar usuário
    const usuario = await User.create({
      nome,
      email,
      senha,
      cargo: cargo || 'lider'
    });

    // Gerar token
    const token = gerarToken(usuario._id);

    console.log('✅ Usuário registrado com sucesso:', email);

    res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso!',
      data: {
        usuario: {
          id: usuario._id,
          nome: usuario.nome,
          email: usuario.email,
          cargo: usuario.cargo
        },
        token
      }
    });

  } catch (error) {
    console.error('❌ Erro ao registrar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar usuário',
      error: error.message
    });
  }
};

// 🔑 LOGIN
const login = async (req, res) => {
  try {
    console.log('🔑 Tentativa de login...');
    const { email, senha } = req.body;

    // Validações
    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }

    // Buscar usuário com senha (select: false por padrão)
    const usuario = await User.findOne({ email }).select('+senha');

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha inválidos'
      });
    }

    // Verificar se usuário está ativo
    if (!usuario.ativo) {
      return res.status(401).json({
        success: false,
        message: 'Usuário desativado. Contate o administrador.'
      });
    }

    // Comparar senha
    const senhaCorreta = await usuario.compararSenha(senha);

    if (!senhaCorreta) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha inválidos'
      });
    }

    // Gerar token
    const token = gerarToken(usuario._id);

    console.log('✅ Login realizado com sucesso:', email);

    res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      data: {
        usuario: {
          id: usuario._id,
          nome: usuario.nome,
          email: usuario.email,
          cargo: usuario.cargo
        },
        token
      }
    });

  } catch (error) {
    console.error('❌ Erro ao fazer login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login',
      error: error.message
    });
  }
};

// VERIFICAR TOKEN / OBTER USUÁRIO ATUAL
const verificarToken = async (req, res) => {
  try {
    // req.user foi preenchido pelo middleware de autenticação
    const usuario = await User.findById(req.user.id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        usuario: {
          id: usuario._id,
          nome: usuario.nome,
          email: usuario.email,
          cargo: usuario.cargo
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao verificar token:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar token',
      error: error.message
    });
  }
};

// ATUALIZAR PERFIL
const atualizarPerfil = async (req, res) => {
  try {
    const { nome, email } = req.body;
    const userId = req.user.id;

    const usuario = await User.findById(userId);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Atualizar campos
    if (nome) usuario.nome = nome;
    if (email) {
      // Verificar se email já existe em outro usuário
      const emailExiste = await User.findOne({ email, _id: { $ne: userId } });
      if (emailExiste) {
        return res.status(400).json({
          success: false,
          message: 'Email já está em uso'
        });
      }
      usuario.email = email;
    }

    await usuario.save();

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso!',
      data: {
        usuario: {
          id: usuario._id,
          nome: usuario.nome,
          email: usuario.email,
          cargo: usuario.cargo
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil',
      error: error.message
    });
  }
};

// ALTERAR SENHA
const alterarSenha = async (req, res) => {
  try {
    const { senhaAtual, senhaNova } = req.body;
    const userId = req.user.id;

    if (!senhaAtual || !senhaNova) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual e nova senha são obrigatórias'
      });
    }

    if (senhaNova.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Nova senha deve ter no mínimo 8 caracteres'
      });
    }

    const usuario = await User.findById(userId).select('+senha');

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar senha atual
    const senhaCorreta = await usuario.compararSenha(senhaAtual);

    if (!senhaCorreta) {
      return res.status(401).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }

    // Atualizar senha
    usuario.senha = senhaNova;
    await usuario.save();

    res.json({
      success: true,
      message: 'Senha alterada com sucesso!'
    });

  } catch (error) {
    console.error('❌ Erro ao alterar senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao alterar senha',
      error: error.message
    });
  }
};

module.exports = {
  registrar,
  login,
  verificarToken,
  atualizarPerfil,
  alterarSenha
};