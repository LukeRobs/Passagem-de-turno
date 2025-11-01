import React, { useState, useEffect } from 'react';
import { Save, Send, Clock, Package, AlertTriangle, CheckCircle, TrendingUp, MessageSquare, FileText, Trash2, RefreshCw, Camera, X, User, Users } from 'lucide-react'; // ✅ ADICIONADO: User, Users

import { useAuth } from '../contexts/AuthContext';

const API_URL = 'http://localhost:5000/api/passagens';

export default function PassagemTurnoApp() {
  const { token, usuario } = useAuth();
  
  const [turnoData, setTurnoData] = useState({
    data: new Date().toISOString().split('T')[0],
    turno: '',
    analista: usuario?.nome || '',
    alertasCriticos: '',
    pendencias: '',
    tarefasConcluidas: '',
    problemas: '',
    pedidosProcessados: '',
    percentualMeta: '',
    veiculosLiberados: '',
    percentualSLAVeiculos: '',
    veiculosRecebidos: '',
    percentualSLARecebidos: '',
    absenteismo: '',
    slaPedidos: 'atendido',
    slaVeiculosLiberados: 'atendido',
    slaVeiculosRecebidos: 'atendido',
    prioridades: '',
    observacoes: '',
    duvidas: ''
  });

  // 📸 Estados para fotos
  const [fotos, setFotos] = useState([]);
  const [fotoPreviews, setFotoPreviews] = useState([]);
  
  const [historico, setHistorico] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('formulario');
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [enviandoSeaTalk, setEnviandoSeaTalk] = useState(false);
  const [buscandoDados, setBuscandoDados] = useState(false);
  
  // ✅ NOVO: Estado para filtro
  const [mostrarApenas, setMostrarApenas] = useState('minhas'); // 'minhas' ou 'todas'

  // ✅ ATUALIZADO: useEffect reagindo ao filtro
  useEffect(() => {
    carregarHistorico();
  }, [mostrarApenas]); // Recarrega quando muda o filtro

  useEffect(() => {
    if (usuario?.nome && !editandoId) {
      setTurnoData(prev => ({
        ...prev,
        analista: usuario.nome
      }));
    }
  }, [usuario, editandoId]);

  const getHeaders = () => ({
    'Authorization': `Bearer ${token}`
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTurnoData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 📸 Handler para seleção de fotos
  const handleFotoChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (fotos.length + files.length > 10) {
      mostrarErro('⚠️ Máximo de 10 fotos permitidas');
      return;
    }
    
    const maxSize = 10 * 1024 * 1024;
    for (const file of files) {
      if (file.size > maxSize) {
        mostrarErro(`⚠️ Arquivo "${file.name}" excede 10MB`);
        return;
      }
    }
    
    setFotos(prev => [...prev, ...files]);
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setFotoPreviews(prev => [...prev, ...newPreviews]);
    
    e.target.value = '';
  };

  // 📸 Remover foto
  const removerFoto = (index) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(fotoPreviews[index]);
    setFotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // ✅ ATUALIZADO: Carregar histórico com filtro
  const carregarHistorico = async () => {
    setLoading(true);
    try {
      // Montar URL com filtro
      let url = `${API_URL}?limit=50&page=1`;
      
      // ✅ Verificar se usuário pode ver todas as passagens
      const podeVerTodas = ['admin', 'supervisor', 'coordenador', 'gerente'].includes(usuario?.cargo);
      
      // Filtrar se for "minhas" OU se não tiver permissão
      if (mostrarApenas === 'minhas' || !podeVerTodas) {
        url += `&analista=${encodeURIComponent(usuario?.nome || '')}`;
        console.log('🔍 Filtrando passagens de:', usuario?.nome);
      } else {
        console.log('👥 Carregando todas as passagens');
      }
      
      const response = await fetch(url, {
        headers: getHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setHistorico(data.data);
        console.log(`✅ ${data.data.length} passagens carregadas`);
      } else {
        mostrarErro('Erro ao carregar histórico');
      }
    } catch (error) {
      mostrarErro('Erro de conexão com servidor');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const salvarPassagem = async () => {
    if (!turnoData.data || !turnoData.turno || !turnoData.analista) {
      mostrarErro('Preencha Data, Turno e Analista');
      return;
    }

    setLoading(true);
    try {
      const url = editandoId ? `${API_URL}/${editandoId}` : API_URL;
      const method = editandoId ? 'PUT' : 'POST';

      const formData = new FormData();
      
      Object.keys(turnoData).forEach(key => {
        formData.append(key, turnoData[key]);
      });

      fotos.forEach((foto) => {
        formData.append('fotos', foto);
      });

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        mostrarSucesso(data.message || '✅ Passagem salva com sucesso!');
        await carregarHistorico();
        limparFormulario();
        setEditandoId(null);
      } else {
        mostrarErro(data.message || 'Erro ao salvar');
      }
    } catch (error) {
      mostrarErro('Erro de conexão com servidor');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const excluirPassagem = async (id) => {
    if (!window.confirm('Deseja excluir esta passagem?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      const data = await response.json();

      if (data.success) {
        mostrarSucesso('✅ Passagem excluída com sucesso!');
        await carregarHistorico();
      } else {
        mostrarErro('Erro ao excluir');
      }
    } catch (error) {
      mostrarErro('Erro de conexão');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarPassagem = (passagem) => {
    setTurnoData({
      data: passagem.data.split('T')[0],
      turno: passagem.turno,
      analista: passagem.analista,
      alertasCriticos: passagem.alertasCriticos || '',
      pendencias: passagem.pendencias || '',
      tarefasConcluidas: passagem.tarefasConcluidas || '',
      problemas: passagem.problemas || '',
      pedidosProcessados: passagem.pedidosProcessados || '',
      percentualMeta: passagem.percentualMeta || '',
      veiculosLiberados: passagem.veiculosLiberados || '',
      percentualSLAVeiculos: passagem.percentualSLAVeiculos || '',
      veiculosRecebidos: passagem.veiculosRecebidos || '',
      percentualSLARecebidos: passagem.percentualSLARecebidos || '',
      absenteismo: passagem.absenteismo || '',
      slaPedidos: passagem.slaPedidos || 'atendido',
      slaVeiculosLiberados: passagem.slaVeiculosLiberados || 'atendido',
      slaVeiculosRecebidos: passagem.slaVeiculosRecebidos || 'atendido',
      prioridades: passagem.prioridades || '',
      observacoes: passagem.observacoes || '',
      duvidas: passagem.duvidas || ''
    });
    setEditandoId(passagem._id);
    setActiveTab('formulario');
  };

  const gerarRelatorio = async (passagemId = null) => {
    if (passagemId) {
      try {
        const response = await fetch(`${API_URL}/${passagemId}/relatorio`, {
          headers: getHeaders()
        });
        const data = await response.json();
        
        if (data.success) {
          return data.data.relatorio;
        }
      } catch (error) {
        console.error('Erro ao gerar relatório:', error);
      }
    }

    const turnoNome = turnoData.turno === 'manha' ? 'Manhã' : 
                      turnoData.turno === 'tarde' ? 'Tarde' : 
                      'Noite';
    
    return `
═════════════════════════════════════════════════
📋 PASSAGEM DE TURNO - LOGÍSTICA
═════════════════════════════════════════════════
📅 DATA: ${turnoData.data.split('-').reverse().join('/')}
⏰ TURNO: ${turnoNome}
👤 ANALISTA: ${turnoData.analista}
${turnoData.alertasCriticos ? `
🔴 ALERTAS CRÍTICOS
═════════════════════════════════════════════════
${turnoData.alertasCriticos}
` : ''}
${turnoData.pendencias ? `
⏳ PENDÊNCIAS
═════════════════════════════════════════════════
${turnoData.pendencias}
` : ''}
${turnoData.tarefasConcluidas ? `
✅ TAREFAS CONCLUÍDAS
═════════════════════════════════════════════════
${turnoData.tarefasConcluidas}
` : ''}
${turnoData.problemas ? `
⚠️ PROBLEMAS E OBSERVAÇÕES
═════════════════════════════════════════════════
${turnoData.problemas}
` : ''}
📊 INDICADORES
═════════════════════════════════════════════════
- Pedidos processados: ${turnoData.pedidosProcessados || 'N/A'} | SLA: ${turnoData.slaPedidos === 'atendido' ? '✓ Meta Batida' : '✗ Meta Não Batida'}${turnoData.percentualMeta ? ` (${turnoData.percentualMeta})` : ''}
- Veículos liberados: ${turnoData.veiculosLiberados || 'N/A'} | SLA: ${turnoData.slaVeiculosLiberados === 'atendido' ? '✓ Atendido' : '✗ Não Atendido'}${turnoData.percentualSLAVeiculos ? ` (${turnoData.percentualSLAVeiculos})` : ''}
- Veículos recebidos: ${turnoData.veiculosRecebidos || 'N/A'} | SLA: ${turnoData.slaVeiculosRecebidos === 'atendido' ? '✓ Atendido' : '✗ Não Atendido'}${turnoData.percentualSLARecebidos ? ` (${turnoData.percentualSLARecebidos})` : ''}
- Absenteísmo: ${turnoData.absenteismo || 'N/A'}
${turnoData.prioridades ? `
🎯 PRIORIDADES PARA PRÓXIMO TURNO
═════════════════════════════════════════════════
${turnoData.prioridades}
` : ''}
${turnoData.observacoes ? `
💡 OBSERVAÇÕES GERAIS
═════════════════════════════════════════════════
${turnoData.observacoes}
` : ''}
${turnoData.duvidas ? `
❓ DÚVIDAS PARA PRÓXIMO ANALISTA
═════════════════════════════════════════════════
${turnoData.duvidas}
` : ''}
═════════════════════════════════════════════════
✓ Relatório gerado em ${new Date().toLocaleString('pt-BR')}
═════════════════════════════════════════════════
    `.trim();
  };

  const copiarRelatorio = async (passagemId = null) => {
    const relatorio = await gerarRelatorio(passagemId);
    navigator.clipboard.writeText(relatorio);
    mostrarSucesso('📋 Relatório copiado!');
  };

  const simularEnvioSeaTalk = async () => {
    if (!turnoData.turno || !turnoData.analista) {
      mostrarErro('⚠️ Preencha pelo menos o Turno e Analista antes de enviar!');
      return;
    }

    setEnviandoSeaTalk(true);
    try {
      if (fotos.length > 0 && !editandoId) {
        console.log('📸 Detectadas fotos não salvas. Salvando primeiro...');
        
        const formData = new FormData();
        
        Object.keys(turnoData).forEach(key => {
          formData.append(key, turnoData[key]);
        });
        
        fotos.forEach((foto) => {
          formData.append('fotos', foto);
        });
        
        const responseSalvar = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        });
        
        const dataSalvar = await responseSalvar.json();
        
        if (!dataSalvar.success) {
          mostrarErro('❌ Erro ao salvar passagem com fotos');
          return;
        }
        
        console.log('✅ Passagem salva com ID:', dataSalvar.data._id);
        
        const responseSeaTalk = await fetch(`${API_URL}/enviar-seatalk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            passagemId: dataSalvar.data._id
          })
        });
        
        const dataSeaTalk = await responseSeaTalk.json();
        
        if (dataSeaTalk.success) {
          const fotosMsg = dataSeaTalk.data?.fotosEnviadas > 0 
            ? ` com ${dataSeaTalk.data.fotosEnviadas} foto(s)` 
            : '';
          mostrarSucesso(`✅ Relatório enviado para o SeaTalk${fotosMsg}!`);
          
          await carregarHistorico();
          limparFormulario();
        } else {
          mostrarErro(dataSeaTalk.message || '❌ Erro ao enviar para SeaTalk');
        }
        
      } else {
        const response = await fetch(`${API_URL}/enviar-seatalk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            passagemId: editandoId,
            dadosFormulario: editandoId ? null : turnoData
          })
        });

        const data = await response.json();

        if (data.success) {
          const fotosMsg = data.data?.fotosEnviadas > 0 
            ? ` com ${data.data.fotosEnviadas} foto(s)` 
            : '';
          mostrarSucesso(`✅ Relatório enviado para o SeaTalk${fotosMsg}!`);
        } else {
          mostrarErro(data.message || '❌ Erro ao enviar para SeaTalk');
        }
      }
      
    } catch (error) {
      console.error('Erro ao enviar para SeaTalk:', error);
      mostrarErro('❌ Erro de conexão ao enviar para SeaTalk');
    } finally {
      setEnviandoSeaTalk(false);
    }
  };

  const buscarDadosAutomaticos = async () => {
    if (!turnoData.turno || !turnoData.data) {
      mostrarErro('⚠️ Selecione o turno e a data primeiro!');
      return;
    }

    setBuscandoDados(true);
    try {
      console.log('🔄 Buscando dados automáticos...');
      
      const response = await fetch(
        `${API_URL}/dados-automaticos?data=${turnoData.data}&turno=${turnoData.turno}`, 
        { headers: getHeaders() }
      );
      
      const data = await response.json();

      if (data.success) {
        const pedidosProcessados = parseInt(data.data.pedidosProcessados) || 0;
        const statusMeta = data.data.slaPedidos || 'nao-atendido';
        const percentual = data.data.percentualMeta ? `${data.data.percentualMeta}%` : '0%';

        const veiculosLiberados = parseInt(data.data.veiculosLiberados) || 0;
        const veiculosPercentualSLA = data.data.percentualSLALiberados || 0;
        const veiculosStatusSLA = data.data.slaVeiculosLiberados || 'atendido';
        const veiculosPercentualFormatado = `${veiculosPercentualSLA}%`;

        const veiculosRecebidos = parseInt(data.data.veiculosRecebidos) || 0;
        const recebidosPercentualSLA = data.data.percentualSLARecebidos || 0;
        const recebidosStatusSLA = data.data.slaVeiculosRecebidos || 'atendido';
        const recebidosPercentualFormatado = `${recebidosPercentualSLA}%`;

        const absenteismo = data.data.absenteismo || '0%';

        setTurnoData(prev => ({
          ...prev,
          pedidosProcessados: pedidosProcessados.toString(),
          percentualMeta: percentual,
          slaPedidos: statusMeta,
          veiculosLiberados: veiculosLiberados.toString(),
          percentualSLAVeiculos: veiculosPercentualFormatado,
          slaVeiculosLiberados: veiculosStatusSLA,
          veiculosRecebidos: veiculosRecebidos.toString(),
          percentualSLARecebidos: recebidosPercentualFormatado,
          slaVeiculosRecebidos: recebidosStatusSLA,
          absenteismo: absenteismo
        }));

        const metaBateu = statusMeta === 'atendido';
        const veiculosSLAOk = veiculosStatusSLA === 'atendido';
        const recebidosSLAOk = recebidosStatusSLA === 'atendido';
        
        mostrarSucesso(
          `✅ Dados atualizados!\n${metaBateu ? '✅' : '❌'} Meta: ${percentual}${metaBateu ? ' - Meta Batida!' : ' - Meta Não Batida'}\n🚚 Veículos Liberados: ${veiculosLiberados} | SLA: ${veiculosPercentualFormatado} ${veiculosSLAOk ? '✅' : '❌'}\n📦 Veículos Recebidos: ${veiculosRecebidos} | SLA: ${recebidosPercentualFormatado} ${recebidosSLAOk ? '✅' : '❌'}\n👥 Absenteísmo: ${absenteismo}`
        );
      } else {
        throw new Error(data.message || 'Erro ao buscar dados');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar dados:', error);
      mostrarErro(`❌ Erro: ${error.message}`);
    } finally {
      setBuscandoDados(false);
    }
  };

  const limparFormulario = () => {
    setTurnoData({
      data: new Date().toISOString().split('T')[0],
      turno: '',
      analista: usuario?.nome || '',
      alertasCriticos: '',
      pendencias: '',
      tarefasConcluidas: '',
      problemas: '',
      pedidosProcessados: '',
      percentualMeta: '',
      veiculosLiberados: '',
      percentualSLAVeiculos: '',
      veiculosRecebidos: '',
      percentualSLARecebidos: '',
      absenteismo: '',
      slaPedidos: 'atendido',
      slaVeiculosLiberados: 'atendido',
      slaVeiculosRecebidos: 'atendido',
      prioridades: '',
      observacoes: '',
      duvidas: ''
    });
    setEditandoId(null);
    
    fotoPreviews.forEach(url => URL.revokeObjectURL(url));
    setFotos([]);
    setFotoPreviews([]);
  };

  const mostrarSucesso = (mensagem = '✅ Operação realizada com sucesso!') => {
    setErrorMessage(mensagem);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const mostrarErro = (mensagem) => {
    setErrorMessage(mensagem);
    setShowError(true);
    setTimeout(() => setShowError(false), 3000);
  };

    const obterLabelCargo = () => {
    const cargoLabels = {
      'LOG II': 'LOG II',
      'lider': 'Líder',
      'analista': 'Analista',
      'supervisor': 'Supervisor',
    };
    
    return cargoLabels[usuario?.cargo] || 'Responsável';
  };
  // ✅ NOVO: Verificar permissões
  const podeVerTodas = ['admin', 'supervisor', 'coordenador', 'gerente'].includes(usuario?.cargo);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-2xl p-8 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2 flex items-center gap-3">
              <Clock size={40} className="animate-pulse" />
              Passagem de Turno
            </h1>
            <p className="text-blue-100 text-lg">Sistema de Gestão Logística</p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-sm text-blue-100">Bem-vindo(a),</p>
            <p className="text-xl font-bold">{usuario?.nome || 'Usuário'}</p>
          </div>
        </div>
      </div>

      {/* Notificações */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl z-50 animate-bounce">
          <p className="font-bold flex items-center gap-2">
            <CheckCircle size={24} />
            {errorMessage}
          </p>
        </div>
      )}

      {showError && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-2xl z-50 animate-bounce">
          <p className="font-bold flex items-center gap-2">
            <AlertTriangle size={24} />
            {errorMessage}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('formulario')}
          className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'formulario'
              ? 'bg-blue-600 text-white shadow-xl scale-105'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileText size={24} />
          Novo Registro
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'historico'
              ? 'bg-blue-600 text-white shadow-xl scale-105'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Package size={24} />
          Histórico ({historico.length})
        </button>
      </div>

      {/* Formulário - TODO O SEU CÓDIGO PERMANECE IGUAL */}
      {activeTab === 'formulario' && (
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FileText size={28} className="text-blue-600" />
            {editandoId ? '✏️ Editando Passagem' : '📝 Nova Passagem de Turno'}
          </h2>
          <div className="space-y-6">
            {/* Data e Turno */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Clock size={20} className="text-blue-600" />
                  📅 Data *
                </label>
                <input
                  type="date"
                  name="data"
                  value={turnoData.data}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Clock size={20} className="text-indigo-600" />
                  ⏰ Turno *
                </label>
                <select
                  name="turno"
                  value={turnoData.turno}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o turno</option>
                  <option value="manha">☀️ Manhã</option>
                  <option value="tarde">🌤️ Tarde</option>
                  <option value="noite">🌙 Noite</option>
                </select>
              </div>
            </div>

           {/* Analista com Label Dinâmico */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <CheckCircle size={20} className="text-green-600" />
                👤 {obterLabelCargo()} Responsável *
              </label>
              <input
                type="text"
                name="analista"
                value={turnoData.analista}
                onChange={handleInputChange}
                placeholder={`Nome do ${obterLabelCargo().toLowerCase()}`}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Buscar Dados Automáticos */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-blue-800 mb-1">🔄 Buscar Dados Automáticos</h3>
                  <p className="text-sm text-blue-600">Preenche automaticamente os dados da planilha (Pedidos, Veículos e Absenteísmo)</p>
                </div>
                <button
                  onClick={buscarDadosAutomaticos}
                  disabled={buscandoDados || !turnoData.turno || !turnoData.data}
                  className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
                    buscandoDados || !turnoData.turno || !turnoData.data
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                  }`}
                >
                  {buscandoDados ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <TrendingUp size={20} />
                      Buscar Dados
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Indicadores */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-4">
                <TrendingUp size={24} className="text-blue-600" />
                📊 Indicadores do Turno
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pedidos */}
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <label className="block text-xs font-bold text-gray-600 mb-2">
                    📦 Pedidos Processados
                  </label>
                  <input
                    type="number"
                    name="pedidosProcessados"
                    value={turnoData.pedidosProcessados}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-center font-semibold"
                  />
                  <select
                    name="slaPedidos"
                    value={turnoData.slaPedidos}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg mt-2 text-sm font-semibold ${
                      turnoData.slaPedidos === 'atendido' 
                        ? 'border-green-400 bg-green-50 text-green-700' 
                        : 'border-red-400 bg-red-50 text-red-700'
                    }`}
                  >
                    <option value="atendido">✓ Meta Batida</option>
                    <option value="nao-atendido">✗ Meta Não Batida</option>
                  </select>
                  {turnoData.percentualMeta && (
                    <div className={`mt-2 text-center py-2 rounded-lg font-bold text-lg ${
                      turnoData.slaPedidos === 'atendido'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      📊 {turnoData.percentualMeta}
                    </div>
                  )}
                </div>

                {/* Veículos Liberados */}
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <label className="block text-xs font-bold text-gray-600 mb-2">
                    🚚 Veículos Liberados
                  </label>
                  <input
                    type="number"
                    name="veiculosLiberados"
                    value={turnoData.veiculosLiberados}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-center font-semibold"
                  />
                  <select
                    name="slaVeiculosLiberados"
                    value={turnoData.slaVeiculosLiberados}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg mt-2 text-sm font-semibold ${
                      turnoData.slaVeiculosLiberados === 'atendido' 
                        ? 'border-green-400 bg-green-50 text-green-700' 
                        : 'border-red-400 bg-red-50 text-red-700'
                    }`}
                  >
                    <option value="atendido">✓ SLA Atendido</option>
                    <option value="nao-atendido">✗ SLA Não Atendido</option>
                  </select>
                  {turnoData.percentualSLAVeiculos && (
                    <div className={`mt-2 text-center py-2 rounded-lg font-bold text-lg ${
                      turnoData.slaVeiculosLiberados === 'atendido'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      📊 {turnoData.percentualSLAVeiculos}
                    </div>
                  )}
                </div>

                {/* Veículos Recebidos */}
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <label className="block text-xs font-bold text-gray-600 mb-2">
                    🚛 Veículos Recebidos
                  </label>
                  <input
                    type="number"
                    name="veiculosRecebidos"
                    value={turnoData.veiculosRecebidos}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-center font-semibold"
                  />
                  <select
                    name="slaVeiculosRecebidos"
                    value={turnoData.slaVeiculosRecebidos}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg mt-2 text-sm font-semibold ${
                      turnoData.slaVeiculosRecebidos === 'atendido' 
                        ? 'border-green-400 bg-green-50 text-green-700' 
                        : 'border-red-400 bg-red-50 text-red-700'
                    }`}
                  >
                    <option value="atendido">✓ SLA Atendido</option>
                    <option value="nao-atendido">✗ SLA Não Atendido</option>
                  </select>
                  {turnoData.percentualSLARecebidos && (
                    <div className={`mt-2 text-center py-2 rounded-lg font-bold text-lg ${
                      turnoData.slaVeiculosRecebidos === 'atendido'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      📊 {turnoData.percentualSLARecebidos}
                    </div>
                  )}
                </div>

                {/* Absenteísmo */}
                <div className="bg-white rounded-lg p-4 border border-orange-200">
                  <label className="block text-xs font-bold text-gray-600 mb-2">
                    👥 Absenteísmo
                  </label>
                  <input
                    type="text"
                    name="absenteismo"
                    value={turnoData.absenteismo}
                    onChange={handleInputChange}
                    placeholder="0%"
                    disabled
                    className="w-full px-3 py-2 border border-orange-300 rounded-lg text-center font-semibold bg-gray-50 text-gray-600 cursor-not-allowed"
                    title="Campo preenchido automaticamente pela planilha"
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    ℹ️ Preenchido automaticamente (Operation Overview - AI36)
                  </p>
                </div>
              </div>
            </div>

            {/* Campos de Texto */}
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-2">
                <AlertTriangle size={20} className="text-red-600" />
                🔴 Alertas Críticos
              </label>
              <textarea
                name="alertasCriticos"
                value={turnoData.alertasCriticos}
                onChange={handleInputChange}
                rows="3"
                placeholder="Situações urgentes que requerem atenção imediata..."
                className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-orange-700 mb-2">
                <Clock size={20} className="text-orange-600" />
                ⏳ Pendências
              </label>
              <textarea
                name="pendencias"
                value={turnoData.pendencias}
                onChange={handleInputChange}
                rows="3"
                placeholder="Tarefas pendentes que precisam ser finalizadas..."
                className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-green-700 mb-2">
                <CheckCircle size={20} className="text-green-600" />
                ✅ Tarefas Concluídas
              </label>
              <textarea
                name="tarefasConcluidas"
                value={turnoData.tarefasConcluidas}
                onChange={handleInputChange}
                rows="3"
                placeholder="Atividades finalizadas durante o turno..."
                className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <AlertTriangle size={20} className="text-yellow-600" />
                ⚠️ Problemas e Observações
              </label>
              <textarea
                name="problemas"
                value={turnoData.problemas}
                onChange={handleInputChange}
                rows="3"
                placeholder="Descreva problemas encontrados e observações relevantes..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 📸 Seção de Upload de Fotos */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-purple-700 mb-2">
                <Camera size={20} className="text-purple-600" />
                📸 Fotos do Turno (opcional - máx. 10)
              </label>
              
              <div className="mb-4">
                <input
                  type="file"
                  id="fotos-input"
                  accept="image/*"
                  multiple
                  onChange={handleFotoChange}
                  className="hidden"
                />
                <label
                  htmlFor="fotos-input"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg cursor-pointer transition-all"
                >
                  <Camera size={20} />
                  Adicionar Fotos ({fotos.length}/10)
                </label>
                <p className="text-xs text-gray-600 mt-2">
                  ℹ️ As imagens serão automaticamente otimizadas (máx. 1920px, ~200-500KB cada)
                </p>
              </div>

              {/* Preview das Fotos */}
              {fotoPreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {fotoPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-purple-200"
                      />
                      <button
                        type="button"
                        onClick={() => removerFoto(index)}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remover foto"
                      >
                        <X size={16} />
                      </button>
                      <div className="mt-1 text-xs text-gray-600 truncate">
                        {fotos[index].name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(fotos[index].size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <TrendingUp size={20} className="text-purple-600" />
                🎯 Prioridades para Próximo Turno
              </label>
              <textarea
                name="prioridades"
                value={turnoData.prioridades}
                onChange={handleInputChange}
                rows="3"
                placeholder="Liste as prioridades em ordem de urgência..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <MessageSquare size={20} className="text-gray-600" />
                💡 Observações Gerais
              </label>
              <textarea
                name="observacoes"
                value={turnoData.observacoes}
                onChange={handleInputChange}
                rows="2"
                placeholder="Informações adicionais relevantes..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <MessageSquare size={20} className="text-indigo-600" />
                ❓ Dúvidas para Próximo Analista
              </label>
              <textarea
                name="duvidas"
                value={turnoData.duvidas}
                onChange={handleInputChange}
                rows="2"
                placeholder="Perguntas que precisam ser respondidas..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <button
                onClick={salvarPassagem}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Save size={20} />
                {editandoId ? 'Atualizar' : 'Salvar'} Passagem
              </button>
              <button
                onClick={copiarRelatorio}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <FileText size={20} />
                Copiar Relatório
              </button>
              <button
                onClick={simularEnvioSeaTalk}
                disabled={enviandoSeaTalk}
                className={`flex-1 font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition ${
                  enviandoSeaTalk 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {enviandoSeaTalk ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Enviar p/ SeaTalk
                  </>
                )}
              </button>
              {editandoId && (
                <button
                  onClick={limparFormulario}
                  className="bg-gray-400 hover:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <Trash2 size={20} />
                  Cancelar Edição
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ ATUALIZADO: Histórico com Filtro */}
      {activeTab === 'historico' && (
        <div className="space-y-4">
          {/* ✅ NOVO: Header com Toggle */}
          <div className="bg-white rounded-xl shadow-lg p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Package size={24} className="text-blue-600" />
              Histórico de Passagens
            </h2>
            
            <div className="flex gap-2">
              <button
                onClick={() => setMostrarApenas('minhas')}
                className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition ${
                  mostrarApenas === 'minhas'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <User size={18} />
                Minhas Passagens
              </button>
              
              {/* ✅ Botão "Todas" apenas se tiver permissão */}
              {podeVerTodas && (
                <button
                  onClick={() => setMostrarApenas('todas')}
                  className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition ${
                    mostrarApenas === 'todas'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <Users size={18} />
                  Todas as Passagens
                </button>
              )}
            </div>
          </div>

          {/* Lista de Passagens */}
          {historico.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <Package size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {mostrarApenas === 'minhas' 
                  ? 'Você ainda não tem passagens registradas'
                  : 'Nenhuma passagem registrada'}
              </h3>
              <p className="text-gray-500">
                {mostrarApenas === 'minhas'
                  ? 'Comece preenchendo o formulário de passagem de turno'
                  : 'Não há passagens no sistema'}
              </p>
            </div>
          ) : (
            historico.map((passagem) => {
              const turnoNome = passagem.turno === 'manha' ? '☀️ Manhã' : 
                               passagem.turno === 'tarde' ? '🌤️ Tarde' : '🌙 Noite';
              
              return (
                <div key={passagem._id} className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">
                        {turnoNome} - {new Date(passagem.data).toLocaleDateString('pt-BR')}
                      </h3>
                      <p className="text-sm text-gray-600">Analista: {passagem.analista}</p>
                      <p className="text-xs text-gray-500">
                        Registrado em {new Date(passagem.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copiarRelatorio(passagem._id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                      >
                        Copiar
                      </button>
                      <button
                        onClick={() => carregarPassagem(passagem)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => excluirPassagem(passagem._id)}
                        disabled={loading}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Indicadores */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center bg-blue-50 rounded-lg p-4">
                    <div>
                      <p className="text-xs text-gray-600">Pedidos Processados</p>
                      <p className="text-lg font-bold text-blue-600">{passagem.pedidosProcessados || 0}</p>
                      <p className={`text-xs font-semibold mt-1 ${passagem.slaPedidos === 'atendido' ? 'text-green-600' : 'text-red-600'}`}>
                        {passagem.slaPedidos === 'atendido' ? '✓ Meta Batida' : '✗ Meta Não Batida'}
                      </p>
                      {passagem.percentualMeta && (
                        <p className={`text-xs font-bold mt-1 ${passagem.slaPedidos === 'atendido' ? 'text-green-600' : 'text-red-600'}`}>
                          {passagem.percentualMeta}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Veículos Liberados</p>
                      <p className="text-lg font-bold text-blue-600">{passagem.veiculosLiberados || 0}</p>
                      <p className={`text-xs font-semibold mt-1 ${passagem.slaVeiculosLiberados === 'atendido' ? 'text-green-600' : 'text-red-600'}`}>
                        {passagem.slaVeiculosLiberados === 'atendido' ? '✓ SLA OK' : '✗ SLA Não OK'}
                      </p>
                      {passagem.percentualSLAVeiculos && (
                        <p className={`text-xs font-bold mt-1 ${passagem.slaVeiculosLiberados === 'atendido' ? 'text-green-600' : 'text-red-600'}`}>
                          {passagem.percentualSLAVeiculos}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Veículos Recebidos</p>
                      <p className="text-lg font-bold text-blue-600">{passagem.veiculosRecebidos || 0}</p>
                      <p className={`text-xs font-semibold mt-1 ${passagem.slaVeiculosRecebidos === 'atendido' ? 'text-green-600' : 'text-red-600'}`}>
                        {passagem.slaVeiculosRecebidos === 'atendido' ? '✓ SLA OK' : '✗ SLA Não OK'}
                      </p>
                      {passagem.percentualSLARecebidos && (
                        <p className={`text-xs font-bold mt-1 ${passagem.slaVeiculosRecebidos === 'atendido' ? 'text-green-600' : 'text-red-600'}`}>
                          {passagem.percentualSLARecebidos}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Absenteísmo</p>
                      <p className="text-lg font-bold text-orange-600">{passagem.absenteismo || '0%'}</p>
                    </div>
                  </div>

                  {/* Fotos no Histórico */}
                  {passagem.fotos && passagem.fotos.length > 0 && (
                    <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
                        <Camera size={16} />
                        📸 Fotos Anexadas ({passagem.fotos.length})
                      </p>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {passagem.fotos.map((foto, index) => (
                          <a
                            key={index}
                            href={`http://localhost:5000${foto.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block relative group"
                          >
                            <img
                              src={`http://localhost:5000${foto.url}`}
                              alt={foto.originalName}
                              className="w-full h-20 object-cover rounded border border-purple-200 hover:border-purple-400 transition"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded transition">
                              <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alertas, Pendências, etc. */}
                  {passagem.alertasCriticos && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-red-700 mb-1">🔴 Alertas Críticos:</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{passagem.alertasCriticos}</p>
                    </div>
                  )},
                  {passagem.pendencias && (
                    <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-orange-700 mb-1">⏳ Pendências:</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{passagem.pendencias}</p>
                    </div>
                  )},
                  {passagem.tarefasConcluidas && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-green-700 mb-1">✅ Tarefas Concluídas:</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{passagem.tarefasConcluidas}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}