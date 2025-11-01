const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  senha: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [8, 'Senha deve ter no mínimo 8 caracteres'],
    select: false // Não retorna senha por padrão nas queries
  },
  cargo: {
    type: String,
    enum: ['LOG II', 'lider', 'analista', 'supervisor', 'admin'],
    default: 'LOG II'
  },
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash da senha antes de salvar
userSchema.pre('save', async function(next) {
  // Só faz hash se a senha foi modificada
  if (!this.isModified('senha')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.senha = await bcrypt.hash(this.senha, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senha
userSchema.methods.compararSenha = async function(senhaInformada) {
  return await bcrypt.compare(senhaInformada, this.senha);
};

// Método para retornar dados públicos do usuário
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.senha;
  return user;
};

module.exports = mongoose.model('User', userSchema);