import React from 'react';
import Header from '../components/Header';
import PassagemTurnoApp from '../components/PassagemTurnoApp';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        <Header />
        <PassagemTurnoApp />
      </div>
    </div>
  );
}