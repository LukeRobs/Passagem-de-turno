import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carregar usuário do localStorage ao iniciar
  useEffect(() => {
    const tokenSalvo = localStorage.getItem('token');
    const usuarioSalvo = localStorage.getItem('usuario');

    if (tokenSalvo && usuarioSalvo) {
      setToken(tokenSalvo);
      setUsuario(JSON.parse(usuarioSalvo));
      verificarToken(tokenSalvo);
    } else {
      setLoading(false);
    }
  }, []);

  // Verificar se token ainda é válido
  const verificarToken = async (tokenParaVerificar) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${tokenParaVerificar}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsuario(data.data.usuario);
      } else {
        // Token inválido, fazer logout
        logout();
      }
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (email, senha) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, senha })
      });

      const data = await response.json();

      if (data.success) {
        setToken(data.data.token);
        setUsuario(data.data.usuario);
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('usuario', JSON.stringify(data.data.usuario));
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, message: 'Erro ao conectar com servidor' };
    }
  };

  // Registro
  const registrar = async (nome, email, senha, cargo = 'analista') => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/registrar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nome, email, senha, cargo })
      });

      const data = await response.json();

      if (data.success) {
        setToken(data.data.token);
        setUsuario(data.data.usuario);
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('usuario', JSON.stringify(data.data.usuario));
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Erro no registro:', error);
      return { success: false, message: 'Erro ao conectar com servidor' };
    }
  };

  // Logout
  const logout = () => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  };

  const value = {
    usuario,
    token,
    loading,
    login,
    registrar,
    logout,
    isAuthenticated: !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};