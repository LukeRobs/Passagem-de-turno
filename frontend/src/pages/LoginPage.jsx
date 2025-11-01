import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, Lock, Mail, User, AlertCircle, CheckCircle, Briefcase } from 'lucide-react';

export default function LoginPage() {
  const { login, registrar } = useAuth();
  const navigate = useNavigate();
  
  const [modo, setModo] = useState('login'); // 'login' ou 'registro'
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    cargo: 'LOG II' // Valor padrão atualizado
  });
  
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setErro(''); // Limpar erro ao digitar
    setSucesso(''); // Limpar sucesso ao digitar
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setLoading(true);

    try {
      let resultado;
      
      if (modo === 'login') {
        // Login
        if (!formData.email || !formData.senha) {
          setErro('Preencha email e senha');
          setLoading(false);
          return;
        }
        
        resultado = await login(formData.email, formData.senha);
        
        if (resultado.success) {
          setSucesso('✅ Login realizado! Redirecionando...');
          setFormData({ nome: '', email: '', senha: '', cargo: 'LOG II' });
          // Redirecionar após 1 segundo
          setTimeout(() => {
            navigate('/dashboard');
          }, 1000);
        }
      } else {
        // Registro
        if (!formData.nome || !formData.email || !formData.senha) {
          setErro('Preencha todos os campos');
          setLoading(false);
          return;
        }
        
        if (formData.senha.length < 8) { // ✅ Corrigido de 6 para 8
          setErro('Senha deve ter no mínimo 8 caracteres');
          setLoading(false);
          return;
        }
        
        resultado = await registrar(formData.nome, formData.email, formData.senha, formData.cargo);
        
        if (resultado.success) {
          setSucesso('✅ Conta criada com sucesso! Redirecionando...');
          setFormData({ nome: '', email: '', senha: '', cargo: 'LOG II' });
          // Redirecionar após 1 segundo
          setTimeout(() => {
            navigate('/dashboard');
          }, 1000);
        }
      }
      
      if (!resultado.success) {
        setErro(resultado.message);
      }
    } catch (error) {
      setErro('Erro ao processar requisição');
    } finally {
      setLoading(false);
    }
  };

  const alternarModo = () => {
    setModo(modo === 'login' ? 'registro' : 'login');
    setErro('');
    setSucesso('');
    setFormData({ nome: '', email: '', senha: '', cargo: 'LOG II' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo/Título */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Passagem de Turno
          </h1>
          <p className="text-gray-600">
            {modo === 'login' ? 'Faça login para continuar' : 'Crie sua conta'}
          </p>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <span className="text-red-700 text-sm">{erro}</span>
          </div>
        )}

        {/* Mensagem de Sucesso */}
        {sucesso && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3 animate-pulse">
            <CheckCircle className="text-green-600" size={20} />
            <span className="text-green-700 text-sm font-semibold">{sucesso}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {modo === 'registro' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    placeholder="Digite seu nome"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  />
                </div>
              </div>

              {/* Novos cargos */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cargo
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <select
                    name="cargo"
                    value={formData.cargo}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition appearance-none bg-white"
                  >
                    <option value="LOG II">📦 LOG II</option>
                    <option value="lider">👤 Líder</option>
                    <option value="analista">👤 Analista</option>
                    <option value="supervisor">👔 Supervisor</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="seu@email.com"
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                name="senha"
                value={formData.senha}
                onChange={handleInputChange}
                placeholder={modo === 'registro' ? 'Mínimo 8 caracteres' : 'Digite sua senha'}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Processando...
              </>
            ) : (
              <>
                {modo === 'login' ? (
                  <>
                    <LogIn size={20} />
                    Entrar
                  </>
                ) : (
                  <>
                    <UserPlus size={20} />
                    Criar Conta
                  </>
                )}
              </>
            )}
          </button>
        </form>

        {/* Alternar entre Login/Registro */}
        <div className="mt-6 text-center">
          <button
            onClick={alternarModo}
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm transition"
          >
            {modo === 'login' 
              ? '✨ Não tem conta? Criar agora' 
              : '👋 Já tem conta? Fazer login'}
          </button>
        </div>
      </div>
    </div>
  );
}