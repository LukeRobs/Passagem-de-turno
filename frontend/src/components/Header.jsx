import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';

export default function Header() {
  const { usuario, logout } = useAuth();

  return (
    <div className="bg-white shadow-md px-6 py-3 flex items-center justify-between mb-6 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 w-10 h-10 rounded-full flex items-center justify-center">
          <User className="text-white" size={20} />
        </div>
        <div>
          <p className="font-bold text-gray-800">{usuario?.nome}</p>
          <p className="text-xs text-gray-600">
            {usuario?.cargo === 'admin' ? '🔑 Administrador' : 
             usuario?.cargo === 'supervisor' ? '👔 Supervisor' : 
             '👤 Analista'}
          </p>
        </div>
      </div>
      <button
        onClick={logout}
        className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold transition"
      >
        <LogOut size={18} />
        Sair
      </button>
    </div>
  );
}